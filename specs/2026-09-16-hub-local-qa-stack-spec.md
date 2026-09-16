---
id: 2026-09-16-hub-local-qa-stack-spec
title: "Hub local QA stack: containerized, time-boxed, fully seeded environment with the production migration pipeline"
stage: dev
status: implementing
pass: 1
created: 2026-09-16
updated: 2026-09-16
repos: [minion_hub, minion-meta]
tags: [infra, migrations, test, data]
type: infra
---

# Hub local QA stack — containerized, time-boxed, fully seeded

**Owner brief (verbatim, 2026-09-16):**

> For an enhanced testing experience, please plan/spec/dev/deploy a containerized local environment (with a timeout to avoid long-running sessions) and this way we can test the UI features and database interactions. There should be a deployment pipeline in place that makes sure migrations are applied. Currently, testing is lacking because it'd require hitting the prod database. The container should always be fully seeded to have items to work with from the start (seeded data should include all possible permutations to consider edge cases wherever possible); This should be a part of the development process, so when changes are made to the db, it should include updates to the seeded data where necessary. I'll leave you to it, use subagents and best-practices. After that, have a subagent run tests on the UI based on the latest deployed features.

## 0. Product

One command (`bun run qa:up`) gives a developer or a QA agent a private copy of the Hub — real login, real Postgres with the production schema, every module populated with deliberately awkward data — that tears itself down after a fixed time. Nothing in it can reach production. A migration cannot land without the seed still applying on top of it, so the environment never drifts behind the schema. The same pipeline that Vercel runs before a production build (`scripts/db-migrate.ts` against the `hub_migrations` ledger) is what brings the local database from the committed baseline to the current tree, so "migrations are applied" is verified by running the real thing, not a look-alike.

## 1. Why it is built this way (recon facts that shaped the design)

- **The schema is not reproducible from migrations.** `organizations`, `organization_members` and `flows` have no `CREATE TABLE` anywhere in the hub or meta repositories; the meta repo owns the identity-era migrations (`profiles`, `personal_agents`, `member_roles`, `app_modules`) and the hub owns the ERP era. Replaying both onto an empty database stops at the first foreign key to a prod-only table. The baseline therefore has to be a **schema-only snapshot of production**, committed to the repo, refreshed on demand by the owner.
- **The runner already exists and is production's runner.** `scripts/db-migrate.ts` applies `supabase/migrations/*.sql` newer than the `public.hub_migrations` ledger, one file per transaction under `pg_advisory_xact_lock(826744)`, and refuses to run unless `VERCEL_ENV=production` or `FORCE_DB_MIGRATE=1`. `scripts/db-status.ts` reports pending versions. Both are reused unchanged.
- **Real login needs GoTrue.** `AUTH_DISABLED=true` fabricates a user with no profile id and sets `bypassGate`, which skips the app gate and breaks RBAC, onboarding and workspace flows. The Supabase CLI local stack provides GoTrue, PostgREST and Kong with generated keys; its own migration and seed steps are disabled so hub's runner owns the pipeline.
- **Two databases.** Postgres is mandatory (`pg-pool.ts` throws without `SUPABASE_DB_URL`). The libsql database silently defaults to `file:./data/minion_hub.db` and is still read by the app layout and ~26 modules; `drizzle/*.sql` must be applied to it via `src/server/run-migrations.ts` or hosts/servers/gateway pages fail at runtime.
- **The app gate needs seeded rows.** A user reaches `/home` only with `auth.users` → `profiles` → `organization_members` → `member_roles` → `organizations` → `personal_agents.provisioning_status='active'`; otherwise the layout calls a real gateway and redirects to `/onboarding`.
- **Org-scoped reads run as `app_ledger`** behind `*_org_guc` RLS keyed on `app.current_org_id`. Roles `app_ledger`, `app_assistant_ro`, `brain_vector_worker` must exist before the snapshot is restored, and `GRANT`s must survive the restore (dump with `--no-owner`, never `--no-privileges`).
- **CI today never replays migrations.** The four Postgres lanes either let each test create its own throwaway schema or apply a hand-written fixture (`supabase/ci-fixtures/*.sql`). The new `qa-stack` CI job is the first place the real baseline + real runner + real seed are exercised together.
- **Existing assets to reuse, not rewrite:** `scripts/ui-audit-seed.ts` (local-host refusal, 22-table schema preflight, four GoTrue personas, `.env.ui-audit.local` emitter), `scripts/qc/disposable-postgres.ts` (loopback + marker guard), `playwright.config.ts` (`E2E_BASE_URL` skips the self-started server), `tests/e2e/ui-audit/personas.ts`.

## 2. Architecture

```
bun run qa:up [--ttl 2h] [--no-seed]
   │
   ├─ supabase start  (minion_hub/supabase/config.toml, project_id "minion-hub-qa")
   │     db (pgvector, PG major = prod major)   auth (GoTrue)   rest   kong
   │     studio/realtime/storage/inbucket/analytics/edge/vector/pg_meta: disabled
   │     [db.migrations] enabled=false   [db.seed] enabled=false
   │
   ├─ scripts/qa/db-bootstrap.ts
   │     create roles app_ledger, app_assistant_ro, brain_vector_worker (if missing)
   │     restore supabase/qa/baseline/schema.sql   (prod snapshot, public schema, privileges kept)
   │     restore supabase/qa/baseline/ledger.sql   (hub_migrations rows as of the snapshot)
   │     FORCE_DB_MIGRATE=1 bun scripts/db-migrate.ts      ← the production runner
   │     bun scripts/db-status.ts  → must report 0 pending  ← the gate
   │     NOTIFY pgrst, 'reload schema'
   │
   ├─ scripts/qa/seed/index.ts   (idempotent; deterministic ids; matrix-driven)
   │     GoTrue admin API → users; Postgres as postgres → every domain; libsql → gateway tables
   │     emits .env.qa.local (mode 600): persona credentials, keys, URLs
   │
   ├─ docker compose -f docker-compose.qa.yml up -d hub
   │     image oven/bun; bind-mounts the checkout; applies drizzle/*.sql to data/qa/minion_hub.db;
   │     runs `vite dev --host 0.0.0.0 --port 5199`; joins network supabase_network_minion-hub-qa
   │     env: PUBLIC_SUPABASE_URL=http://kong:8000 (in-network) / http://127.0.0.1:54421 (browser),
   │          SUPABASE_DB_URL=postgresql://postgres:postgres@db:5432/postgres, stub PostHog keys,
   │          BRAIN_VECTOR_ENABLED=false, no B2/SUNAT/Meta/Resend credentials
   │
   └─ TTL: systemd-run --user --on-active=<ttl> --unit=hub-qa-ttl  bun run qa:down
         (fallback when systemd-run is unavailable: setsid `sleep <ttl>; qa:down`)
         qa:status prints remaining time; qa:extend --ttl 1h re-arms; qa:down cancels the timer
```

Ports are distinct from the meta repo's local stack (54321–54324) so both can coexist: API **54421**, DB **54422**, app **5199**. The Supabase project id `minion-hub-qa` is local-only; `supabase link`/`config push` are never run against it and the script refuses to start if `SUPABASE_DB_URL` or `PUBLIC_SUPABASE_URL` in the shell point at a non-loopback host.

### Components

| Unit | Does | Depends on |
|---|---|---|
| `supabase/config.toml` (hub) | Declares the QA project: ports, PG major version, services off, migrations/seed off, auth site_url `http://localhost:5199` | Supabase CLI ≥ 2.100 |
| `scripts/qa/snapshot-prod-schema.ts` | Owner-only. Reads `SUPABASE_DB_URL` from `.env.local` (session pooler, port 5432), runs `pg_dump --schema-only --schema=public --no-owner`, strips comments and `SET` noise, writes `supabase/qa/baseline/schema.sql`; dumps `hub_migrations` data to `ledger.sql`; records `SELECT version()` and the max ledger version in `baseline.json`. Runs only with `--confirm-prod-read`, opens a read-only transaction, and never writes to the source. | prod read access |
| `supabase/qa/baseline/{schema.sql,ledger.sql,baseline.json}` | The committed baseline. `baseline.json.maxLedgerVersion` must be ≤ the newest file in `supabase/migrations` (CI asserts). | — |
| `scripts/qa/db-bootstrap.ts` | Roles → baseline → ledger → `db-migrate.ts` → `db-status.ts` (0 pending or exit 1) → PostgREST reload. Idempotent: re-running on a bootstrapped DB is a no-op except for new migrations. | local DB URL only (loopback guard from `disposable-postgres.ts` pattern) |
| `scripts/qa/seed/` | `matrix.ts` (every permutation has an id, a domain, and a one-line reason), one module per domain, `index.ts` orchestrator in dependency order, `env.ts` emitter. Idempotent via UUIDv5 from `(namespace, matrix id)` and `on conflict` upserts. | bootstrapped DB, GoTrue admin API |
| `scripts/qa/seed/seed.contract.test.ts` | For every matrix id: the row exists with the asserted state (status, flags, counts). Runs against `HUB_TEST_DB_URL`; skips when unset. | seeded DB |
| `scripts/qa/{up,down,reset,status,extend}.ts` | Lifecycle. `reset` = drop `public` + re-bootstrap + re-seed without restarting containers. | above |
| `docker-compose.qa.yml` + `scripts/qa/hub-entrypoint.sh` | The app container. | supabase network |
| `.github/workflows/ci.yml` job `qa-stack` | `supabase/setup-cli` → `supabase start -x …` → bootstrap → seed → contract test → `scripts/schema-drift-check.ts` → smoke (`/en/login` 200, `/api/health` 401) against a `bun run build && node build` app | CI |
| `scripts/qa/check-migration-seed-pairing.ts` | If the PR diff touches `supabase/migrations/*.sql` and touches nothing under `scripts/qa/seed/` or `supabase/qa/baseline/`, fail unless the PR carries label `seed-unaffected`. | CI |

## 3. Baseline snapshot and the migration pipeline

1. The owner runs `bun run qa:snapshot --confirm-prod-read` from a checkout with `.env.local`. Output is deterministic (sorted, no timestamps) so the diff shows real schema change only.
2. The snapshot's `hub_migrations` ledger is restored before the runner, so the runner applies exactly the migrations that production has not seen at snapshot time plus whatever the branch adds. `db-status.ts` must then print zero pending; a non-zero result fails `qa:up` and the CI job.
3. **Refresh policy:** the snapshot is refreshed when (a) a migration is applied to production outside the runner (should be never), or (b) `qa:up` reports drift from `scripts/schema-drift-check.ts`, or (c) quarterly. `baseline.json` carries `snapshotAt`, `pgVersion`, `maxLedgerVersion`; CI fails if `maxLedgerVersion` names a file that no longer exists.
4. The local PG major version is pinned to the snapshot's `pgVersion` in `config.toml` (production is on Postgres 15 per the meta config; the snapshot records the truth).
5. Nothing in this pipeline can write to production: the snapshot script opens a read-only transaction; every other script refuses non-loopback database hosts.

## 4. Seed dataset — the permutation matrix

Every row the seed creates is registered in `scripts/qa/seed/matrix.ts` as `{ id, domain, why }`. The contract test walks the matrix. Adding a permutation = adding a matrix entry + the row + (usually) one assertion. The matrix below is the initial contract; ids are stable strings used by UI tests to find fixtures (`human_id`s and names embed the id where the UI shows them).

**Tenancy & identity** — orgs: `org.business` (FACES-like, all modules), `org.personal` (kind=personal; POS/stock/team hidden), `org.business.modules-off` (`app_modules` rows with `pos` and `stock` disabled), `org.business.identity-required` (`pos_settings.requirements.identityDocument='required'`). Users (GoTrue, fixed passwords in `.env.qa.local`): `user.owner`, `user.admin`, `user.manager`, `user.staff`, `user.viewer`, `user.custom-role` (`org_roles` key `custom-reception` sourced from staff with `permission_rules` overrides incl. `if_owner=true`), `user.legacy-member` (only `organization_members.role`, no `member_roles` row — the fallback path), `user.platform-admin` (`profiles.role='admin'`), `user.two-orgs` (member of business + personal), `user.service-account` (`account_type='service'`), `user.pending-agent` (`personal_agents.provisioning_status='pending'` — lands on onboarding), `user.no-org` (lands on `/join`). Plus a pending `join_request`, an expired and a revoked `join_link`. The four `ui-audit-*` personas are kept with their current emails and roles so the existing Playwright suite runs unchanged.

**CRM** — parties/contacts: `crm.contact.dni-verified`, `crm.contact.dni-missing`, `crm.contact.ruc-company`, `crm.contact.phone-only` (no doc, no email), `crm.contact.party-null` (contact without party), `crm.contact.shared-phone9` (two contacts, one phone9), `crm.contact.identities-3` (whatsapp+instagram+email), `crm.contact.soft-deleted`, `crm.contact.lifecycle-override`; funnel: one contact per stage `lead|opportunity|customer|loyal` plus `crm.funnel.legacy-id` (`interest`); relationship: `crm.rel.user-pinned`, `crm.rel.ai-claimed`; tags: `crm.tag.manual`, `crm.tag.auto-with-rule`, `tag_links` for `booking`, `event_type`, `product` and one orphan; `crm.settings.deposit-rule` (custom keywords) vs the personal org with defaults; activity stats present vs missing.

**Catalog** — `catalog.service.plain`, `catalog.product.tracked` (uom≠unit), `catalog.product.raw-material-link`, `catalog.bundle.two-services`, `catalog.package.with-validity` (`packageValidityDays=90`), `catalog.package.no-validity`, `catalog.product.consumption-2-items`, `catalog.sellable.inactive`, `catalog.product.aliases-and-zone`.

**POS** — settings: methods incl. `credit` (`takesTendered:false`), surcharge on card, `emission.mode='shadow'` with a beta series for `03` and `01`; shifts: `pos.shift.open`, `pos.shift.closed-variance` (counted≠expected); tickets: `pos.ticket.split-tender-with-change`, `pos.ticket.credit-tender` (negative ledger row), `pos.ticket.voided` (with reversal rows), `pos.ticket.service-pending-scheduling` (service line, `booking_id` null, non-void), `pos.ticket.bundle-two-grants`, `pos.ticket.identity-required-violation-candidate` (party without doc in the identity-required org); grants: `pos.grant.half-used`, `pos.grant.exhausted` (derived), `pos.grant.expired` (derived), `pos.grant.cancelled`, `pos.redemption.reversed`; plans: `pos.plan.open-2-of-3-paid`, `pos.plan.settled`, `pos.plan.cancelled`; ledger: topup, deposit, redemption, refund, adjustment — one each, balances positive/zero/negative across three parties; emissions: `pos.emission.accepted`, `pos.emission.rejected`, `pos.emission.error`.

**Scheduling** — resources: staff in `America/Lima`, staff in `Europe/Madrid`, a room, an equipment; a default schedule with a date-override day-off; event types: plain, `requires_confirmation`, `round_robin` with two resources, `use_custom_schedule`, one linked to `catalog.service.plain`, one `public=false`; kinds: default + one custom, and `org.personal` with zero kinds (lazy seeding path); bookings: one per status `accepted|pending|cancelled|rejected|completed|no_show`, `sched.booking.series-3`, `sched.booking.fully-linked` (grant+plan+invoice+contact), `sched.booking.rescheduled-from`, `sched.booking.kind-null`, `sched.booking.public-link-source`; `sched.link.expired`; HR: employees active/left, leave requests one per status, a manual holiday.

**Stock** — warehouses: default, child, `stock.warehouse.archived`; items: `stock.item.uom-conversion` (box→unit), `stock.item.recipe-with-optional-child`, low-stock below `reorder_level`; entries chain receipt → issue (with `metadata.invoiceId`, plus a case/space-variant duplicate that must be rejected by the normalizing unique index — asserted as a *failing* insert in the contract test) → transfer → adjustment → cancelled; bins at zero; accruals `open|realized|released`; consumption mappings for the catalog products.

**Finances** — `fin.invoice.susii-paid`, `fin.invoice.partial`, `fin.invoice.pending`, `fin.invoice.void`, `fin.invoice.sunat-sire-shadow` (`shadowed=true` twin), `fin.invoice.linked-from-booking`; `fin.settings.fx-manual`; personal org: statement imports one per status incl. `undone`, transactions with rejected rows; `fin.sync.stuck-running` (stale heartbeat — the stuck-job UI), purchases in a closed period + a `diverged` row.

**Attachments** — `att.file.linked-3-objects` (contact + booking + invoice), `att.link.trashed`, `att.file.deleting-tombstone`, `att.file.near-quota` (size just under `orgQuotaBytes`), `att.link.orphan-object`. B2 is not configured: rows render, download URLs fail by design (documented in the QA notes).

**Jobs / brains** — `bg_jobs` rows in `done` and `failed`, one `cancelled`; no `running` rows (reclaimed every tick otherwise); `fin_sync_jobs` `succeeded`; brains: master + focused, a `failed` document, a `degraded` source, chunks with null embeddings; `BRAIN_VECTOR_ENABLED=false`.

**Gateway (libsql)** — org with zero servers (empty state) is `org.personal`; `org.business` gets one server `auth_mode='none'` never connected, one agent per archetype, one session with tasks and one without, ten chat messages; `personal_agents` rows per user as listed above.

**Locale/i18n** — the seed writes names in Spanish and English, one contact with an emoji and a 120-character name, one product with a 4-character code and one with a 2-character code, and dates spanning a DST change for the Madrid resource.

## 5. Lifecycle and the time box

- `qa:up [--ttl 2h] [--no-seed] [--fresh]` — starts or reuses the stack; `--fresh` drops volumes first. Prints the URL, the persona table, the TTL and the teardown time. Exit 1 if the DB is not at zero pending migrations.
- `qa:down` — stops containers, cancels the TTL timer, keeps volumes (a later `qa:up` is fast). `qa:down --volumes` removes them.
- `qa:reset` — re-bootstrap + re-seed in place; used after checking out a branch with new migrations.
- `qa:status` — containers, DB version, pending migrations, seed matrix version, TTL remaining.
- `qa:extend --ttl 1h` — re-arms the timer.
- Default TTL 2 h, maximum 8 h. The timer is a transient systemd user unit (`hub-qa-ttl.service`) so it survives the shell that started it; `qa:status` reads `systemctl --user list-timers`. On hosts without systemd the fallback is a detached `sleep`; the PID is written to `.qa/ttl.pid`.
- Memory budget: the lean Supabase set is ~1 GB, the app dev server ~1.5 GB with `NODE_OPTIONS=--max-old-space-size=2048`; the host currently has ~6 GB free.

## 6. Development process contract

1. **A schema change ships with its seed.** Any PR touching `supabase/migrations/*.sql` must touch `scripts/qa/seed/**` or `supabase/qa/baseline/**` (or carry the `seed-unaffected` label with a one-line reason in the PR body). Enforced by `check-migration-seed-pairing.ts` in CI.
2. **The `qa-stack` CI job is required.** It boots the stack, bootstraps from the baseline, runs the production migration runner, asserts zero pending, seeds, runs the seed contract test, runs `schema-drift-check.ts` (Drizzle declarations vs the live catalog), builds the app and smoke-tests it. A red job means "your migration broke the environment every other developer uses".
3. **Snapshot ownership.** Only the owner refreshes the baseline; the script requires `--confirm-prod-read` and prints the schema diff before writing.
4. **Where this lives in agent instructions.** `minion_hub/CLAUDE.md` gains a "Testing against the QA stack" section (`qa:up`, personas, the pairing rule, never point the stack at prod); the meta `AGENTS.md` cross-project table gets a row for "DB schema change → hub migration + seed matrix + baseline".
5. **QA agents use the stack, never prod.** The bowser/Playwright runbook takes `E2E_BASE_URL=http://localhost:5199` and the credentials from `.env.qa.local`.

## 7. Slices

| Slice | Delivers | Definition of done |
|---|---|---|
| **S1 Baseline + bootstrap** | `supabase/config.toml`, `snapshot-prod-schema.ts`, the committed baseline (owner-run), `db-bootstrap.ts`, roles, PostgREST reload | Fresh `supabase start` + bootstrap ends with `db-status` = 0 pending; re-run is a no-op; unit test for the dump sanitizer |
| **S2 Lifecycle + app container** | `docker-compose.qa.yml`, entrypoint (libsql migrations, vite dev), `up/down/reset/status/extend`, TTL timer, `.env.qa` generation, `package.json` scripts, `docs/qa-stack.md` | `qa:up` from a clean machine reaches `/en/login` 200 in the browser; timer fires and tears down; `qa:status` shows remaining time |
| **S3 Seed matrix** | `scripts/qa/seed/*`, `matrix.ts`, contract test, `.env.qa.local` emitter, ui-audit persona compatibility | Every matrix id materializes; `seed.contract.test.ts` green; idempotent (second run changes zero rows); `ui-audit-seed` personas still log in |
| **S4 Process + CI** | `qa-stack` CI job, pairing check, drift check wiring, CLAUDE.md/AGENTS.md text, PR template line | CI green on this PR; a synthetic PR that adds a migration without seed changes fails the pairing check |
| **S5 UI QA run** | A bowser-qa-agent pass over the latest shipped features (#278 packages/plans/ledger/module nav/DNI quick-add/scheduling step, ERP attachments, booking edit/delete, tag visuals) against the stack, with screenshots and a defect list filed as a proposal | Report delivered; defects triaged into a proposal |

S1 and S2 run in parallel (disjoint files). S3 starts in parallel from the recon and tests once S1's baseline exists. S4 after S1–S3. S5 after S4 merges.

## 8. Out of scope

- Production data in the local stack (no PII, no prod dumps of rows; the baseline is schema-only).
- B2 object storage, SUNAT beta emission, Meta/Resend/PostHog integrations inside the stack: rows are seeded, network calls are not made. A follow-up may add MinIO for uploads.
- A live gateway: `/agents` and `/sessions` render from seeded libsql rows and an empty WS state.
- Replacing the four existing CI Postgres lanes; they stay as-is.
- Windows/macOS host support for the TTL timer beyond the `sleep` fallback.
- Backfilling the meta-repo's own local stack (`supabase/SUPABASE_LOCAL.md`, stale) — a note points to this spec.

## 9. Verification

- `bun run qa:up` on the owner's machine: stack up, `db-status` 0 pending, seed matrix count printed, `/en/login` 200, log in as `user.owner` and as `user.staff`, module switcher shows the role-appropriate default, `/pos/accounts` lists `pos.plan.open-2-of-3-paid` and `pos.ticket.service-pending-scheduling`, TTL countdown visible in `qa:status`.
- `bun run qa:reset` after adding a throwaway migration file: runner applies it, seed still passes.
- CI `qa-stack` job green on the delivery PR; pairing check demonstrated red on a synthetic branch.
- `seed.contract.test.ts` green locally against `HUB_TEST_DB_URL=<qa db>`; second `qa:seed` run reports 0 changed rows.
- Never-prod guard demonstrated: `SUPABASE_DB_URL=<non-loopback>` makes `qa:up`, `db-bootstrap`, `qa:seed` exit 1 before connecting.
- S5 report lists each user story with pass/fail and screenshots, taken from `http://localhost:5199` only.
