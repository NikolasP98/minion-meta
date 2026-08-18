---
id: 2026-08-18-hub-updateserver-tenant-scope-spec
title: Add DB-level tenant scope to hub updateServer after Turso re-key
stage: spec
status: parked
pass: 2
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-hub-updateserver-tenant-scope
verdict: approved
repos: [minion_hub]
relationship: extends
related: [2026-05-25-auth-supabase-pg-migration-design]
---

# Add DB-level tenant scope to hub `updateServer` after Turso re-key

## 0. Product

From the approved proposal, verbatim:

> server.service.ts:30 TODO — update relies entirely on the call-site IDOR check; no tenantId in the WHERE clause. Defense-in-depth gap until the Turso re-keying migration lands (blocker).

The goal is to make the database mutation itself reject a server owned by another tenant, even if a
future caller omits or weakens its route-level ownership check. The change remains parked until the
re-key compatibility gate in Slice 1 passes; this spec does not authorize the re-key migration.

### Relationship recommendation

- `2026-05-25-auth-supabase-pg-migration-design` — **extends**: that artifact records the broader
  Supabase/PG migration direction, while this spec hardens the still-live Turso `updateServer`
  mutation during the transition. Its `status: shipped` frontmatter is not evidence that the
  `servers` re-key prerequisite completed: the body remains a design with a future Turso-retirement
  phase and does not define this mutation or its compatibility proof. Execution therefore remains
  parked on the concrete re-key completion record and the audits defined below, not merely on that
  related spec's lifecycle status.

Searches of `specs/index.json` and `proposals/index.json` found no other artifact with the same
`updateServer` surface or cross-tenant-update DoD. This recommendation does not merge, retire, or edit
the related artifact.

## 1. AS-IS → TO-BE → DELTA

### AS-IS — current behavior and constraints

- The approved proposal anchors the defect at `minion_hub/src/server/services/server.service.ts:30`:
  `updateServer` selects its update target by server id without including `servers.tenantId` in the SQL
  predicate. A call-site IDOR check is therefore the only tenant boundary on this mutation.
- The canonical SQLite/Turso schema is the installed `@minion-stack/db` schema consumed by
  `src/server/db/client.ts`; the hub's local schema directory is not authoritative. The `servers` table
  is live, not a disposable mirror. Source: `/memory/MINION/hub-two-database-split.md`.
- The proposal records a known compatibility blocker: legacy server rows may still use pre-re-key
  tenant keys. Applying `eq(servers.tenantId, ctx.tenantId)` before those rows are re-keyed would deny
  legitimate same-tenant updates.
- Historical migration evidence shows `servers.tenant_id` was coupled through Turso foreign keys and
  that premature auth-table changes cascade-deleted live gateway rows. This makes data compatibility a
  hard prerequisite, not an assumed deployment detail. Source: `/memory/MINION/hub-org-scoping-rls.md`
  ("DROP CAUSED PROD OUTAGE" and subsequent full-drop-abandoned observations).
- The `minion_hub` checkout is not present in this meta-repo workspace, so the proposal's line number,
  current return contract, callers, and exact test filename must be re-verified in the implementation
  worktree before edits. The paths below are the approved anchors; materially different code blocks
  implementation and sends the spec back for revision.

### TO-BE — target behavior and invariants

1. `updateServer(ctx, serverId, patch)` updates a row only when both `servers.id = serverId` and
   `servers.tenantId = ctx.tenantId` are true in the same database statement.
2. A cross-tenant id has the same externally observable result as an unknown id under the service's
   existing return/error contract (same return value, or same error type/message); it performs zero
   writes and reveals no owner or tenant metadata. If a route reaches and maps that service result,
   its status and response body also remain identical to the route's existing unknown-id response;
   a route that denies the request in its independent ownership check retains its characterized
   pre-change denial contract.
3. A same-tenant update retains its current patch semantics, returned value, timestamps, and caller
   behavior. The existing route-level IDOR check remains as an independent layer.
4. No schema, migration, re-key, token, gateway protocol, UI, or authorization-policy change is part
   of this implementation.
5. The change may ship only after a read-only audit proves that every current Turso
   `servers.tenant_id` is non-null and exactly equals one current canonical Supabase
   `organizations.id`, which is the identifier supplied as `TenantContext.tenantId`. Because the
   databases are physically separate, the audit must read each source separately and compare exact
   values in application memory; it must not claim a cross-database SQL join. Rehearse the audit in
   non-production, then attach the production result and concrete re-key completion record to the PR
   before merge. Source: `/memory/MINION/hub-two-database-split.md` (the databases cannot be joined;
   matching canonical ids may be correlated in application code).

### DELTA — transitions, slices, and proof

1. **Establish re-key readiness and freeze the service contract** → Slice 1 → a focused baseline test
   records same-tenant/unknown-id behavior, and the two-source compatibility audit returns zero null
   or unmatched Turso server tenant ids in non-production and production; the production result and
   re-key completion record are a human merge gate.
2. **Add tenant identity to the atomic update predicate** → Slice 2 → the focused service test proves
   same-tenant success, cross-tenant denial with zero mutation, and unknown-id parity while inspecting
   or exercising the generated `WHERE id AND tenant_id` behavior.
3. **Verify the public caller contract, when an existing route test owns it, and the full hub remain
   compatible** → Slice 2 → the applicable route test plus hub check, focused test, full test, and
   build commands exit zero.

## 2. Approach — vertical slices

### Slice 1 — re-key readiness and executable baseline

**Size:** ~4–6 focused hours · **Tags:** `security`, `data`, `test`

Work from a `minion_hub` feature worktree based on the current `master` branch (the old `dev` branch
was deleted). First read that checkout's `CLAUDE.md` or `AGENTS.md`. Source:
`/memory/MINION/hub-deploy-workflow.md` (2026-07-30 update).

#### Exact files to touch

- Modify the existing server-service test, expected at
  `src/server/services/server.service.test.ts`; if tests are colocated under a different existing
  convention, use the discovered file and record the path in the PR.
- No production file and no migration file changes in this slice.

#### Work

1. Re-open `src/server/services/server.service.ts`, its schema import, `TenantContext`, every
   `updateServer(` caller, and the existing server-service tests. Confirm the proposal still describes
   the active implementation and document the current not-found/return contract in the test name.
2. Add/retain baseline tests for same-tenant success and unknown id. The test fixture must contain two
   tenants and one server per tenant with distinct ids.
3. Rehearse the compatibility audit against the selected non-production environment using read-only
   access: fetch `id` and `tenant_id` for every Turso `servers` row; separately fetch canonical
   Supabase `organizations.id` values; compare the exact string values in application memory. Report
   `turso_server_rows`, `null_tenant_ids`, and `unmatched_tenant_ids`; both error counts must be zero.
   Multiple servers with the same tenant id are valid and must not be reported as duplicates. Record
   the exact executable command and output in the PR. Do not mutate either database to make the audit
   pass. Source: `/memory/MINION/hub-two-database-split.md`.
4. Run the same read-only audit against production and attach its output, the concrete re-key
   migration/deployment identifier and apply evidence, and its rollback/recovery note to the PR. If
   the re-key was not represented by a database migration, attach the deployment or change record
   that performed it; a planning-spec status alone is insufficient. Because this is
   security/data-tagged work, human approval and merge gates remain mandatory.

#### Definition of done

```bash
rg -n "function updateServer|const updateServer|updateServer\(" src/server src/routes
server_service_test=${SERVER_SERVICE_TEST:-src/server/services/server.service.test.ts}
test -f "$server_service_test" && bun run test -- "$server_service_test"
# exact two-source, read-only audit command recorded in the PR: exits 0 and prints
# turso_server_rows=<n> null_tenant_ids=0 unmatched_tenant_ids=0
migration_status=$(git status --porcelain -- ':(glob)**/*.sql' ':(glob)**/migrations/**' ':(glob)**/drizzle/**' ':(glob)**/supabase/**') && test -z "$migration_status"
```

If the service moved, the predicate is already tenant-scoped, the current tenant keys differ, or the
audit cannot prove zero mismatches, stop. Do not implement Slice 2 and do not repair data under this
spec.

### Slice 2 — tenant-scoped mutation and regression coverage

**Size:** ~4–6 focused hours · **Tags:** `security`, `logic`, `test`

#### Exact files to touch

- `src/server/services/server.service.ts`
- The existing server-service test confirmed in Slice 1 (expected
  `src/server/services/server.service.test.ts`)
- Only if discovery shows an existing route-level test owns the public contract: that existing
  `src/routes/api/servers/[id]/...` test file. No route production file is expected to change.

#### Work

1. Change the Drizzle update predicate to combine the current id predicate with
   `eq(servers.tenantId, ctx.tenantId)` using `and(...)`. Preserve the existing update payload,
   timestamp handling, returning clause, and not-found behavior.
2. Add a cross-tenant regression test: call `updateServer` with tenant A's context and tenant B's
   server id; assert the service returns/throws exactly like an unknown id and tenant B's full
   persisted row is deep-equal before and after the call. Also assert tenant A can update its own row.
3. Keep the caller-level ownership check. Add a query-shape assertion only if the existing test harness
   mocks Drizzle rather than running SQLite; it must prove both `id` and `tenant_id` participate in the
   mutation predicate, not merely that a helper was called.

#### Definition of done

```bash
rg -n "and\(|servers\.tenantId|servers\.id" src/server/services/server.service.ts
server_service_test=${SERVER_SERVICE_TEST:-src/server/services/server.service.test.ts}
test -f "$server_service_test" && bun run test -- "$server_service_test"
bun run check
bun run test
bun run build
migration_status=$(git status --porcelain -- ':(glob)**/*.sql' ':(glob)**/migrations/**' ':(glob)**/drizzle/**' ':(glob)**/supabase/**') && test -z "$migration_status"
```

The focused test must explicitly report green cases for same-tenant update, cross-tenant denial with
zero mutation, and unknown-id parity. These checks are the machine-readable acceptance contract.

## 3. Cross-repo impact assessment

| Surface | Impact | Mitigation / alert |
|---|---|---|
| `minion_hub` | Only target repo; service predicate and focused tests change | Preserve call-site check and public contract; run full hub gates |
| `minion-meta` / `@minion-stack/db` | Installed Turso schema is a read-only verification input; no package or migration change | Any schema/re-key need blocks this spec and returns to a prerequisite migration/change artifact |
| `minion_site` | Shares hub data surfaces, but no schema or auth contract changes | No files to change; absence of SQL/migration diff is mandatory |
| `minion` gateway | Reads/authenticates server tokens, but no token, row shape, or protocol changes | Existing valid rows must continue to update; re-key audit prevents legacy-key denial |
| `paperclip-minion` | No adapter or gateway-protocol change | No action |

Unavoidable alert: the fix changes behavior for any caller that previously relied on updating a server
outside `ctx.tenantId`. That behavior is an IDOR defect, not compatibility to preserve; the regression
test deliberately makes it impossible.

## 4. Out of scope

- Performing, repairing, or rolling back the Turso re-key migration.
- Changing `servers` schema, foreign keys, ids, tenant ids, gateway tokens, or `user_servers` links.
- Removing the existing call-site ownership/IDOR check.
- Migrating the service from Turso to Supabase/Postgres or dropping legacy Turso tables.
- Altering server create, delete, list, token, assignment, or gateway-routing behavior.
- Gateway protocol/shared-package, site, Paperclip, UI, design-token, or deployment work.
- Production writes during verification; the readiness audit is read-only.

## 5. End-to-end verification

Run the functional checks in an isolated non-production environment seeded with tenant A/server A
and tenant B/server B; the separate production step below is read-only:

1. Authenticate as tenant A through the normal server-update route and update server A; assert the API
   response retains its current success shape and the row changed.
2. Invoke the normal route for server B while tenant A is active; assert the existing route-level
   denial status/body characterized before the change, no tenant metadata disclosure, and an
   unchanged server B row. This preserves the independent caller check but does not by itself prove
   the service predicate executed.
3. In the service integration test, call `updateServer` directly with tenant A's context and server
   B's id, then with an unknown id; prove identical service outcomes and zero mutation of server B.
4. Re-read both rows directly and confirm only server A changed.
5. Run the exact two-source read-only audit command recorded by Slice 1 against non-production, then
   production; both runs must print `null_tenant_ids=0 unmatched_tenant_ids=0`.
6. Run:

```bash
bun run check
server_service_test=${SERVER_SERVICE_TEST:-src/server/services/server.service.test.ts}
test -f "$server_service_test" && bun run test -- "$server_service_test"
bun run test
bun run build
```

Attach the command output, both read-only compatibility audits, the concrete re-key change record,
and human security/data review to the PR. Deployment proceeds through the hub's normal
branch-triggered pipeline only after the re-key evidence and human merge gate are satisfied.
