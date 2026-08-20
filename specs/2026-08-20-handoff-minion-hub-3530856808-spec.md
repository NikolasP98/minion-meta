---
id: 2026-08-20-handoff-minion-hub-3530856808-spec
title: "Wire crm-funnel.concurrent.integration.test.ts into a real CI gate (close the funnel atomic-write handoff marker)"
stage: spec
status: draft
pass: 1
created: 2026-08-20
updated: 2026-08-20
proposal: handoff-minion-hub-3530856808
verdict: pending
repos: [minion_hub]
relationship: extends
related: [2026-08-18-hub-funnel-atomic-write-spec, 2026-08-17-hub-funnel-atomic-write]
tags: [infra, test, data]
type: fix
---

# Wire `crm-funnel.concurrent.integration.test.ts` into a real CI gate

**Owner surface:** `minion_hub` — `.github/workflows/ci.yml` (a new Postgres job), a new CI-only
schema fixture file (path decided in Slice 1), `src/server/services/crm-funnel.concurrent.integration.test.ts`
(marker removal + docstring correction only — no test-logic change).

## 1. Relationship recommendation

**Recommended classification: `extends`.**

- [`2026-08-17-hub-funnel-atomic-write`](../proposals/2026-08-17-hub-funnel-atomic-write.md)
  (`status: in-spec`) and its spawned
  [`2026-08-18-hub-funnel-atomic-write-spec`](2026-08-18-hub-funnel-atomic-write-spec.md)
  (`status: approved`, pass 2) are the design ancestors: that spec mandated "test issues two
  concurrent writes to different keys and both survive... against a real DB and a controlled
  concurrency harness... not a mock" (its own §S2). The implementation shipped as hub PR
  [#125](https://github.com/NikolasP98/minion_hub/pull/125) (merged `2026-08-20T04:15:43Z`,
  today, hours before this sweep ran), whose file list confirms
  `crm-contacts.service.ts`, `crm-contacts.service.test.ts`, `crm-journey.service.ts`,
  `crm-journey.atomic-write.test.ts`, and **`crm-funnel.concurrent.integration.test.ts`** all
  landed together. The atomic per-key `setContactCustomField`/`jsonb_set` writer and the
  deterministic real-Postgres concurrency proof both exist in source today — this is not a
  duplicate request to build them.
- This proposal's own reconciliation note (in
  [`handoff-minion-hub-3530856808.md`](../proposals/handoff-minion-hub-3530856808.md)) already
  flags the file-placement question and says a human should confirm the proof "still meets the
  spec's real-DB/real-RLS requirement... rather than assuming the spec's file-placement text is
  merely stale." Verified directly against `crm-funnel.concurrent.integration.test.ts` at hub
  master commit
  [`5e77bbe7a`](https://github.com/NikolasP98/minion_hub/blob/5e77bbe7a15aec126651f6cdac76672020153abd/src/server/services/crm-funnel.concurrent.integration.test.ts#L21):
  the file is **not** a stale duplicate and **not** a weaker mock — it is a deterministic,
  real-`postgres`-driver, real-`withOrgCore` proof (row-lock queuing via `SELECT ... FOR UPDATE`,
  two independent connections, both writer-start orders exercised across three cases) that is
  strictly *stronger* than the sibling spec's own S2 example. The file's own `TODO(handoff):`
  comment (lines 21–31) says exactly what is still open, in its own words: *"the spec's central
  concurrency claim is therefore proven by a suite that executes on no automated gate — CI
  covers the atomic write only via the single-connection pglite tests
  (`crm-journey.atomic-write.test.ts`), which cannot interleave two transactions."* That is a
  real, current, non-stale gap: the proposal's DoD ("test issues two concurrent writes... and
  both survive") is proven by source that no pipeline runs.
- Not `already-satisfied`: the sibling spec's DoD required the proof to *run*, not merely to
  *exist* — `bun run vitest run src/server/services/crm-contacts.service.test.ts -t "concurrent"`
  was its own §6 ship-gate command. `.github/workflows/ci.yml`'s `crm-deposit-rule-postgres` job
  (the only Postgres-backed job in the workflow) explicitly names two files —
  `crm-contacts.sql.integration.test.ts` and `crm-funnel-parity.sql.integration.test.ts` — and
  **not** `crm-funnel.concurrent.integration.test.ts`, confirmed by reading the live workflow
  file at the same commit. So the concurrency claim is unverified by any automated pipeline
  today; the sweep's marker is accurate.
- Not `conflicts-with`: this spec makes zero changes to `crm-contacts.service.ts`,
  `crm-journey.service.ts`, or the atomic-write logic itself — CI wiring only, on top of code the
  ancestor spec already shipped.

## 2. AS-IS → TO-BE → DELTA

### AS-IS (verified against hub master `5e77bbe7a`; `minion_hub` is not checked out in this
meta-repo workspace, so verification used the GitHub API directly against that commit — record
in Slice 0 whether master has moved before implementing)

- `crm-funnel.concurrent.integration.test.ts` exists, is well-formed, gates on
  `describe.runIf(Boolean(databaseUrl))` where `databaseUrl = process.env.SUPABASE_DB_URL`, and
  additionally throws loudly if `REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES` is set without a URL
  (the repo's established "loud-skip" convention, matching
  `crm-contacts.sql.integration.test.ts` and `crm-funnel-parity.sql.integration.test.ts`).
- The file's own docstring (lines 9–19) states it deliberately does **not** self-seed a throwaway
  schema like its two siblings, because its assertions run through the real `withOrgCore` path
  (`with-org-core.ts:38`) and therefore need real, pre-existing `organizations` and
  `crm_activities` rows/tables with real RLS in force — the whole point being to prove the fix
  under the actual RLS/role machinery, not a mocked or bypassed one.
- `.github/workflows/ci.yml`'s only Postgres-backed job (`crm-deposit-rule-postgres`) spins up a
  bare `postgres:15` service container and runs exactly two integration files by name; adding a
  file to the repo does **not** automatically add it to that job (confirmed by reading the job's
  explicit file list and the memory note this proposal itself was informed by,
  `/memory/MINION/factory/2026-08-20-8e4341e7.md`: *"Self-seeding... runs fine against CI's bare
  `postgres:` service container... Full-schema (anything going through `withOrgCore`, needing
  `organizations`/`crm_activities` + the RLS GUC): can NEVER run on the CI service container...
  Do not 'fix' it by wiring it in [blindly]."*).
- Operator memory `/memory/MINION/MEMORY.md` (★★★, DB/schema section) independently confirms
  `organizations`, `flows`, `organization_members`, `member_roles` have **no `CREATE` anywhere in
  the monorepo** — prod-only, replay-from-empty fails at migration
  `20260606215909_agent_groups_org_guc.sql`. This spec's own recon (GitHub code search + a full
  `supabase/migrations/` directory listing, 61 files, at commit `5e77bbe7a`) found the same is
  true of **`crm_contacts` and `crm_activities`**, which the memory note does not name: no
  `create table ... crm_contacts` or `create table ... crm_activities` exists in any checked-in
  migration, and no `crm_contacts_org_guc`-shaped RLS policy is defined anywhere in the repo
  either. `pg-crm-schema.ts`'s own header comment claims "Policies + grants live in the
  hand-written companion migration `supabase/migrations/<ts>_crm.sql`" — that file does not
  exist among the 61 (only `20260717230000_crm_conversation_chunks.sql` and two siblings match
  `*crm*`). This is new, not previously recorded, evidence for the existing
  `hub-supabase-schema-not-reproducible` finding: the CRM contact tables' RLS policy text is
  undocumented in the codebase, not merely absent from a dump.
- `crm_activities`'s exact column shape **is** fully known from
  `src/server/db/pg-crm-schema.ts:117-138` (Drizzle owns the table shape even though it doesn't
  own roles/policies): `id uuid pk default random`, `org_id text not null`,
  `contact_id uuid not null references crm_contacts(id) on delete cascade`, `kind text not null`,
  `body text`, `actor_id uuid`, `data jsonb not null default '{}'`,
  `occurred_at timestamptz not null default now()`, `created_at timestamptz not null default now()`,
  plus two indexes. `organizations` has **no** Drizzle definition anywhere in the repo (a
  `pgTable('organizations', ...)` search returns zero hits) — this suite's only touch on it is
  `select id::text from organizations limit 1`, so its true column set beyond `id` is unknown
  from source and irrelevant to this suite's assertions.
- No CI secret today can reach a full-schema database: `gh secret list` on `NikolasP98/minion_hub`
  shows only `CLAUDE_CODE_OAUTH_TOKEN` and `FACTORY_HOOK_SECRET` — no Supabase project/branch
  credential exists in CI. `hub-local-qa-stack-recipe.md` (operator memory, proven 2026-08-19)
  documents the only known working recipe for a full-schema Postgres outside prod: a
  `pg_dump --schema-only` from the real `SUPABASE_DB_URL`, replayed onto a fresh local Postgres,
  with grants (`app_ledger`, `app_assistant_ro`) re-applied by hand because a schema recreate
  drops them. That recipe needs the real prod-scoped DB URL and is documented as a manual/local
  procedure, not CI automation.
- Consequence for the operator today: the atomic-write fix (PR #125) is live and the concurrency
  proof exists, correctly written, in source — but nothing re-runs it. A future regression in
  `setContactCustomField`/`setFunnelStage`'s `jsonb_set` shape, or in `withOrgCore`'s RLS wiring,
  would not be caught by CI; only `crm-journey.atomic-write.test.ts`'s single-connection pglite
  suite runs automatically, and per the file's own comment and operator memory, pglite cannot
  interleave two transactions, so it cannot detect a lost-update regression.

### TO-BE (target behavior + invariants)

- A new CI job runs `crm-funnel.concurrent.integration.test.ts` against a bare-container Postgres
  seeded with a **CI-only, non-prod** fixture that recreates the exact real shape the suite
  depends on: an `organizations` table with (at minimum) the `id` column the suite reads, a
  `crm_activities` table matching `pg-crm-schema.ts` byte-for-byte, a `crm_contacts` table
  matching `pg-crm-schema.ts`, the `app_ledger` role, and RLS policies on `crm_contacts` and
  `crm_activities` that are **verified equivalent to prod** (not merely inferred from the
  `_org_guc` naming convention) before being trusted as a stand-in for real RLS.
- The fixture is never a `supabase/migrations/*.sql` file and is never applied to a real
  Supabase project — it exists solely as a CI/test-only artifact so a bug in it can never reach
  prod schema.
- `describe.runIf(Boolean(databaseUrl))` continues to loud-skip locally when no database is
  configured (invariant: local `bun run vitest run` behavior is unchanged) — only the new CI job
  sets `SUPABASE_DB_URL` + `REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES=1`.
- The suite's own docstring (lines 9–19) is corrected once it is wired into CI — it currently
  states it "CANNOT run against the bare `postgres:` service container," which becomes false; a
  stale comment making a false claim about the file's own execution environment is exactly the
  class of bug this spec exists to prevent, so it must not survive the fix that disproves it.
- The `TODO(handoff):` marker (lines 21–31) is removed **only** once the new CI job has actually
  executed this file (not merely been defined) and reported the three concurrency cases green in
  a real GitHub Actions run — matching the "a test that is green because it never ran" lesson
  this exact proposal is downstream of.
- **Invariant — no prod schema change.** Zero DDL against the real Supabase project. The CI
  fixture's existence must not be mistaken for a migration; Slice 1's file lives outside
  `supabase/migrations/`.
- **Invariant — the fixture proves real RLS, not a bypassed one.** Unlike
  `crm-contacts.sql.integration.test.ts` (which explicitly mocks `withOrgCore` to bypass RLS for
  its self-seeded schema), this suite's value is specifically that it does **not** mock
  `withOrgCore`. The fixture must not "solve" the CI gap by adding a mock — that would silently
  regress this file to the same weaker guarantee its two self-seeding siblings already provide,
  defeating the reason this file was written as a separate, harder case in the first place.
- **Invariant — a broken fixture must fail loud, not pass empty.** If the RLS policy the fixture
  installs is wrong (e.g. missing `force row level security`, wrong predicate), the suite must
  fail (rows leak or the lock/queue behavior changes), not silently pass — Slice 2's DoD includes
  a negative-control run proving this.

### DELTA — numbered transitions, each mapped to a slice and its proving test

1. The real (Slice-0-verified) DDL and RLS policy text for `crm_contacts`, `crm_activities`, and
   the minimal `organizations` shape this suite needs are established as fact, not inference →
   **Slice 0** → recorded verbatim in the PR description with their source (prod `pg_policies`/
   `information_schema` query results, or an equivalent authoritative source); stop-ship if
   unobtainable (see §4 human dependency).
2. A CI-only schema fixture recreating that verified shape (tables + `app_ledger` role + RLS
   policies + grants) is committed outside `supabase/migrations/` → **Slice 1** → `psql` (or the
   job's Postgres client) applies it cleanly against a fresh `postgres:15` container with zero
   errors; a negative-control query proves RLS is actually enforced (cross-org row is invisible
   under `app_ledger` + a foreign `app.current_org_id`).
3. A new (or extended) CI job applies the fixture and runs
   `crm-funnel.concurrent.integration.test.ts` with `REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES=1` →
   **Slice 2** → the job appears in a real GitHub Actions run against this spec's PR and all
   three `it(...)` cases in the file report passed, not skipped (assert via the job's log or the
   uploaded vitest JSON report, per the "job logs stay BlobNotFound" gotcha in operator memory —
   use the artifact, not the raw log).
4. The suite's docstring no longer claims it cannot run in CI; the `TODO(handoff):` marker is
   removed → **Slice 2** → `rg -n 'TODO\(handoff\)' src/server/services/crm-funnel.concurrent.integration.test.ts`
   returns no match, and `rg -n 'CANNOT run against the bare' src/server/services/crm-funnel.concurrent.integration.test.ts`
   returns no match, in the same commit that made the CI run true.
5. `bun run vitest run` (full local suite, no `SUPABASE_DB_URL`) is unchanged — this file still
   loud-skips locally exactly as before → **Slice 2** → regression assertion in the PR (`bun run
   vitest run` output shows the suite's three cases as skipped, same as pre-spec).

## 3. Approach — two vertical slices, with a human-dependent recon gate before either

```
S0 (recon — may require a human/ops action, not agent-autonomous) ─▶ S1 (fixture) ─▶ S2 (CI job + marker removal)
```

### Slice 0 — Recon: obtain the authoritative schema/RLS shape (≤ 45 min agent time; may block on
a human step, not counted as a slice)

```bash
cd minion_hub
git log --oneline -8 -- src/server/services/crm-funnel.concurrent.integration.test.ts \
  .github/workflows/ci.yml src/server/db/pg-crm-schema.ts
rg -n -B15 -A25 'TODO\(handoff\)' src/server/services/crm-funnel.concurrent.integration.test.ts
rg -n 'crm-funnel.concurrent|crm-funnel-parity|crm-contacts.sql' .github/workflows/ci.yml
find supabase/migrations -iname '*crm*'
rg -n "pgTable\('crm_contacts'|pgTable\('crm_activities'" src/server/db/pg-crm-schema.ts
gh secret list   # confirm no Supabase credential already exists in CI (recorded as absent in
                  # this spec's own recon — reconfirm, it may have been added since)
```

**This is the one slice in this spec that a sandboxed dev agent cannot fully close alone.** The
real RLS policy text for `crm_contacts`/`crm_activities` is not checked into the repo (§2 AS-IS)
— it exists only in the provisioned Supabase project. Obtaining it requires one of:

- A human/ops operator with prod (or a prod-schema-clone, per `hub-local-qa-stack-recipe.md`)
  read access runs and pastes into the PR:
  ```sql
  select tablename, policyname, permissive, roles, cmd, qual, with_check
  from pg_policies where tablename in ('crm_contacts', 'crm_activities', 'organizations');
  select grantee, table_name, privilege_type from information_schema.role_table_grants
  where table_name in ('crm_contacts', 'crm_activities', 'organizations') and grantee = 'app_ledger';
  \d organizations   -- or the equivalent information_schema query for its full column list
  ```
- Or a scoped, explicitly-provisioned read-only credential is handed to the implementing agent
  for this recon step only (never committed, never logged) — a decision for whoever runs the dev
  stage, not this spec.

If neither is available when this spec reaches dev, **stop and do not guess** — a hand-authored
RLS policy that merely follows the `_org_guc` naming convention (§2 AS-IS) without independent
confirmation would silently reintroduce exactly the failure class this proposal exists to close
("a test that is green because it never really proved what it claims" —
`/memory/MINION/factory/2026-08-20-8e4341e7.md`). Escalate back through the proposal pipeline
with what was found instead of shipping an unverified fixture.

### Slice 1 — Commit the CI-only schema fixture

**Tags:** `infra`, `data` · **Estimate:** 4–6 h (after Slice 0's authoritative shape is in hand)

**Goal:** DELTA #1 (recorded), #2.

**Do:**
- Add a new SQL file **outside** `supabase/migrations/` — e.g.
  `supabase/ci-fixtures/crm-funnel-concurrent.sql` — containing, in order: `create role if not
  exists app_ledger;` (the bare container starts as an empty cluster — no role exists yet, unlike
  a real Supabase project), `create table organizations (...)` (Slice-0-verified minimal shape),
  `create table crm_contacts (...)` and `create table crm_activities (...)` (full shape from
  `pg-crm-schema.ts`, FK `crm_activities.contact_id → crm_contacts.id`), then `enable row level
  security` + `force row level security` + the Slice-0-verified policy text (not the
  `_org_guc`-convention guess) on both tables, then the matching `grant select, insert, update,
  delete on ... to app_ledger`.
- Head the file with a comment stating plainly: this is a CI-only synthetic reproduction of a
  subset of prod schema, sourced from a Slice-0 recon dated to this PR; it is not a migration, is
  never applied to a real project, and must be re-verified against prod if this suite starts
  failing for no code reason (schema drift is a known risk — see `hub-supabase-schema-not-reproducible`
  operator memory).
- Add one throwaway test/step (can live in Slice 2's job as a pre-check, or as a `psql` assertion
  script) that proves the RLS policy is actually enforced under the fixture: as `app_ledger` with
  `app.current_org_id` set to org A, a row inserted under org B must not be visible. This is the
  negative control DELTA #2's proof requires — without it, a fixture that silently grants
  `bypassrls`-equivalent access would make the CI job pass for the wrong reason.

**Files:** `supabase/ci-fixtures/crm-funnel-concurrent.sql` (new).

**Definition of done (machine-checkable):**
```bash
docker run --rm -d --name ci-fixture-check -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:15
until pg_isready -h localhost -p 55432; do sleep 1; done
psql "postgresql://postgres:postgres@localhost:55432/postgres" -f supabase/ci-fixtures/crm-funnel-concurrent.sql
#   must exit 0 with no errors
psql "postgresql://postgres:postgres@localhost:55432/postgres" <<'SQL'
  -- negative control: org B must not see org A's row via app_ledger + RLS
  set role app_ledger;
  select set_config('app.current_org_id', 'org-a', true);
  insert into crm_contacts (id, org_id, source, custom_fields) values (gen_random_uuid(), 'org-a', 'manual', '{}');
  select set_config('app.current_org_id', 'org-b', true);
  select count(*) from crm_contacts where org_id = 'org-a';  -- must be 0
SQL
docker rm -f ci-fixture-check
```

---

### Slice 2 — CI job + marker removal

**Tags:** `infra`, `test` · **Estimate:** 3–5 h

**Goal:** DELTA #3, #4, #5.

**Do:**
- Add a new job to `.github/workflows/ci.yml` (or a new step in `crm-deposit-rule-postgres` — a
  **separate** job is safer given the memory warning that `SUPABASE_DB_URL` is also read by other
  `*.sql.integration.test.ts`/`*.service.test.ts` files expecting the full prod schema, which this
  fixture deliberately does not fully provide; an isolated job scopes the blast radius to exactly
  this one file, matching the existing job's own comment rationale for staying narrow).
- The job: spin up a bare `postgres:15` service container (same pattern as
  `crm-deposit-rule-postgres`), apply Slice 1's fixture via `psql` before the test step, then run
  `bunx vitest run --retry=2 src/server/services/crm-funnel.concurrent.integration.test.ts` with
  `SUPABASE_DB_URL` pointed at the container and `REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES: '1'`.
- Correct the file's own docstring (lines 9–19) to describe the new CI job by name instead of
  claiming the suite cannot run in CI.
- Remove the `TODO(handoff):` block (lines 21–31) only after a real GitHub Actions run on this
  spec's own PR shows the new job green with all three cases executed (not skipped) — paste the
  run URL and the vitest summary into the PR description as the DELTA #3 proof.
- Do not touch `crm-contacts.service.ts`, `crm-journey.service.ts`, or any other production
  source file — this slice is CI/test-infra and one file's comments only.

**Files:** `.github/workflows/ci.yml`,
`src/server/services/crm-funnel.concurrent.integration.test.ts` (docstring + marker removal
only).

**Definition of done (machine-checkable):**
```bash
# Locally, simulate the new job:
docker run --rm -d --name funnel-concurrent-ci -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=crm_funnel_concurrent_test -p 55433:5432 postgres:15
until pg_isready -h localhost -p 55433; do sleep 1; done
psql "postgresql://postgres:postgres@localhost:55433/crm_funnel_concurrent_test" -f supabase/ci-fixtures/crm-funnel-concurrent.sql
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:55433/crm_funnel_concurrent_test \
REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES=1 \
  bunx vitest run --retry=2 src/server/services/crm-funnel.concurrent.integration.test.ts
#   3 passed, 0 skipped
docker rm -f funnel-concurrent-ci

bun run check
bun run vitest run                              # full local suite unchanged: this file skips (loud-skip), no new failures
! rg -n 'TODO\(handoff\)' src/server/services/crm-funnel.concurrent.integration.test.ts
! rg -n 'CANNOT run against the bare' src/server/services/crm-funnel.concurrent.integration.test.ts
git diff --name-only <base>...HEAD -- src/server/services/crm-contacts.service.ts src/server/services/crm-journey.service.ts
#   must be empty — this spec touches no atomic-write logic
```

## 4. Files touched (consolidated)

| File | Slices | Nature |
|---|---|---|
| `supabase/ci-fixtures/crm-funnel-concurrent.sql` | S1 | new — CI-only synthetic schema, never a migration |
| `.github/workflows/ci.yml` | S2 | new Postgres-backed job |
| `src/server/services/crm-funnel.concurrent.integration.test.ts` | S2 | docstring correction + marker removal only, no test-logic change |

All paths relative to `minion_hub/`. No `supabase/migrations/*.sql` file is added or edited —
the CI fixture is deliberately outside that directory so it can never be mistaken for, or
accidentally applied as, a real schema change.

## 5. Cross-repo impact

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| Real Supabase project / prod schema | **None.** Zero migration files touched | CI guard: `git diff --name-only <base>...HEAD -- supabase/migrations` must be empty |
| `minion_site` (shared DB) | **None** — same guard | — |
| `@minion-stack/db`, `@minion-stack/shared` | **None** — no package touched | — |
| `paperclip-minion`, `pixel-agents`, `minion_plugins`, `minion/` gateway | **None** — CI-only change, one hub test file's comments | — |
| Hub CI runtime cost/minutes | **Small increase** — one more short-lived Postgres service-container job per PR/push to `dev`/`master` | Scoped to a single fast-failing file; matches the existing `crm-deposit-rule-postgres` job's cost profile |

**⚠️ A1 — Slice 0 may require a human/ops action this spec cannot force.** Unlike a typical
recon slice (grep the checkout, confirm a line number), obtaining the real RLS policy text for
`crm_contacts`/`crm_activities` needs read access to the provisioned Supabase project or a
verified schema clone (`hub-local-qa-stack-recipe.md`). Per this repo's own SDLC contract
("Security/data-tagged work always keeps human gates at approval AND merge"), this spec is
tagged `data` for exactly this reason — flag at dev-stage kickoff rather than discovering the
blocker mid-slice.

**⚠️ A2 — schema drift.** The fixture is a point-in-time snapshot of Slice-0's findings. If prod
RLS policy text or the `crm_contacts`/`crm_activities` column shape changes later, the fixture
silently diverges and the CI job could pass while testing a shape prod no longer has (a milder
version of the exact bug this spec closes). No automated drift-check is built here (see §6
out-of-scope) — note it in the PR as accepted residual risk, not a hidden one.

## 6. Out of scope (explicit)

- **Any change to `setContactCustomField`, `setFunnelStage`, or the atomic-write logic itself.**
  That shipped in PR #125; this spec is CI coverage only.
- **A general schema-drift detector** comparing the new CI fixture against live prod on a
  schedule. Real, valuable, and explicitly flagged as residual risk in §5 A2 — a separate
  proposal, sized on its own, not folded in here.
- **Reproducing the full prod schema in CI.** Only the minimal shape this one suite touches
  (`organizations.id`, `crm_contacts`, `crm_activities`, `app_ledger`) is in scope — not a general
  "make hub's DB reproducible from scratch" effort (tracked separately by the existing
  `hub-supabase-schema-not-reproducible` operator-memory finding).
- **Wiring `crm-funnel.concurrent.integration.test.ts` into the existing
  `crm-deposit-rule-postgres` job.** That job's own comment explicitly warns against exactly this
  (`SUPABASE_DB_URL` leaking a bare-schema assumption into files that expect the full one) — a
  new, isolated job is required, not a shared one.
- **A Supabase branch-database / ephemeral-preview-DB CI strategy.** Considered in Slice 0's
  recon as an alternative to the fixture approach; would need a new CI secret (a Supabase
  management token) and per-PR branch lifecycle management neither of which exists today. If the
  fixture approach in this spec proves unmaintainable (§5 A2 materializes repeatedly), that
  becomes its own follow-up proposal, not a retrofit here.

## 7. End-to-end verification

Run with both slices merged, on the live hub base branch confirmed in Slice 0.

```bash
cd minion_hub

# 1. Gates
bun run check
bun run vitest run                              # local suite unchanged; this file loud-skips

# 2. The new CI job, simulated locally exactly as it runs in Actions
docker run --rm -d --name e2e-funnel-concurrent -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=crm_funnel_concurrent_test -p 55434:5432 postgres:15
until pg_isready -h localhost -p 55434; do sleep 1; done
psql "postgresql://postgres:postgres@localhost:55434/crm_funnel_concurrent_test" -f supabase/ci-fixtures/crm-funnel-concurrent.sql
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:55434/crm_funnel_concurrent_test \
REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES=1 \
  bunx vitest run --retry=2 src/server/services/crm-funnel.concurrent.integration.test.ts
docker rm -f e2e-funnel-concurrent

# 3. Marker + docstring closed
rg -n 'TODO\(handoff\)' src/server/services/crm-funnel.concurrent.integration.test.ts   # expect no match

# 4. No production write-path file touched
git diff --name-only <base>...HEAD -- src/server/services/crm-contacts.service.ts \
  src/server/services/crm-journey.service.ts src/server/services/crm-relationship.service.ts   # expect empty

# 5. Real GitHub Actions confirmation (not just local Docker)
#    Push the branch, open the PR, and paste the Actions run URL + the new job's vitest summary
#    (3 passed, 0 skipped) into the PR description — this is the actual DELTA #3 proof; the local
#    Docker simulation above is a pre-flight, not a substitute for it.
```

**Ship gate:** §7 all green, the new job visibly green on a real GitHub Actions run (URL pasted
in the PR, not asserted from local Docker alone), the marker and stale docstring both removed in
the same commit that made the CI run true, A1's human-dependency resolved and recorded (who
supplied the RLS policy text, from where), and A2's residual drift risk acknowledged in the PR
rather than silently accepted.
