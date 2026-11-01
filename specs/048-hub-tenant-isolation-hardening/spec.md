# Feature Specification: Tenant isolation hardening before a third org

**Feature Branch**: `048-hub-tenant-isolation-hardening`

**Created**: 2026-11-01

**Status**: Approved by owner 2026-11-01 ("proceed")

**Input**: Proposal `proposals/2026-10-28-hub-tenant-isolation-hardening-before-org-3.md`. Decision context: the hub stays on one shared database with per-org row-level security (proposal `2026-10-28-hub-org-module-packages-tenancy-nav-home` T4); this spec is the condition that makes that safe for a clinic holding health data.

## AS-IS (hub `origin/master` 812a4b0a)

- The hub connects as `postgres` (bypasses RLS); only queries inside `withOrgCore` run as `app_ledger` with the org GUC (`src/server/db/with-org-core.ts`).
- Files using `withOrgCore`: 253. Files using plain `getCoreDb()`/`getDb()`: 119. Files using `supabaseAdmin()`: 32 (counts from `git grep -l`, 2026-10-28). Each of the last two relies on a hand-written `org_id` filter.
- 44 of 122 migrations carry `_org_guc` policies. No test asserts that every table with an `org_id`/`tenant_id` column has a forced-RLS org policy.
- Four core tables (`organizations`, `flows`, `organization_members`, `member_roles`) have no `CREATE` in the repo (memory `hub-supabase-schema-not-reproducible`); a database cannot be rebuilt from migrations alone.

## User Scenarios & Testing

### User Story 1 - A table without an org policy cannot ship (Priority: P1)

A developer adds a migration creating `crm_widgets (org_id uuid, …)` without a policy. CI fails with the table name.

**Independent Test**: `src/server/db/rls-coverage.sql.integration.test.ts` on the QA database: for every `public` table with an `org_id` or `tenant_id` column, assert `relforcerowsecurity` and a policy whose qual references `app.current_org_id`; an allowlist file names deliberate exceptions with a reason.

**Acceptance Scenarios**:
1. **Given** master today, **When** the test runs, **Then** it reports the uncovered tables (expected red on first run; the PR lands with the allowlist naming each one and a ledger entry per table, so the gate is green and the debt is explicit).
2. **Given** a new table with `org_id` and no policy, **When** CI runs, **Then** the test fails naming it.

### User Story 2 - A new bypass query cannot appear unnoticed (Priority: P1)

A developer adds a `getCoreDb()` query in a service. CI fails until the call site is listed in the inventory with a classification.

**Independent Test**: `audits/2026-10-28-hub-rls-bypass/inventory.json` (meta) mirrored as `src/server/db/rls-bypass-inventory.json` (hub) lists every file that calls `getCoreDb(`, `getDb(` or `supabaseAdmin(` with a class: `converted`, `cross-org-by-design`, `user-scoped`, `todo`; `src/server/db/rls-bypass-inventory.test.ts` greps `src/` and diffs.

**Acceptance Scenarios**:
1. **Given** the inventory, **When** a listed file stops using the bypass, **Then** the test fails until the entry is removed (keeps the list honest in both directions).
2. **Given** an unlisted new call site, **When** CI runs, **Then** the test fails naming the file.

### User Story 3 - Write paths run under RLS (Priority: P2)

Services that insert or update org rows outside `withOrgCore` are converted first; reads second. Each conversion is one PR per service with its existing tests passing under `app_ledger`.

### User Story 4 - A database can be rebuilt from the repo (Priority: P2)

The four missing `CREATE` statements are recovered from the live schema into a migration dated before every dependent migration; replay onto an empty database applies 122/122 and serves the QA seed.

### Edge Cases

- Tables keyed by `user_id`/`profile_id` only (auth-scoped) are not in scope of the coverage test; they are listed in the allowlist as `user-scoped` with the column that scopes them.
- Platform tables (`organizations`, `profiles`, `permission_roles`) are cross-org by design and allowlisted.
- The schema dump for US4 is read from production by the owner (`pg_dump --schema-only -t …`), never by an agent.

## Requirements

- **FR-001**: Coverage test as US1, with an allowlist file `src/server/db/rls-coverage.allowlist.json` `{ table, reason, ledger }`.
- **FR-002**: Inventory file + diff test as US2; classes as listed; every `todo` has a proposal ledger line.
- **FR-003**: Conversions (US3) ship one service per PR, writes first, in the order given by the inventory's `todo` entries sorted by "writes org rows".
- **FR-004**: Schema recovery (US4) is a migration file authored from an owner-provided dump, plus a CI job that replays all migrations onto an empty Postgres before the QA seed.
- **FR-005**: No production data changes in this spec.

## Success Criteria

- **SC-001**: Both tests run in hub CI and are green on the PR that adds them (allowlist + inventory complete).
- **SC-002**: The inventory `todo` count only decreases across later PRs (tracked in the proposal).
- **SC-003**: A fresh database from migrations serves the QA seed (US4 done).

## Assumptions

- US1 and US2 ship now (slices H1, H2). US3 is a sequence of small PRs after H2; US4 waits on the owner's dump. The owner decides when org three onboards; the gate is SC-001 + the write-path conversions.
