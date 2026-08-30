---
id: 2026-08-20-handoff-minion-hub-3530856808-spec
title: "Wire crm-funnel.concurrent.integration.test.ts into a real CI gate (close the funnel atomic-write handoff marker)"
stage: spec
status: approved
pass: 2
created: 2026-08-20
updated: 2026-08-20
proposal: handoff-minion-hub-3530856808
verdict: approved
repos: [minion_hub]
relationship: extends
related: [2026-08-18-hub-funnel-atomic-write-spec, 2026-08-17-hub-funnel-atomic-write]
tags: [infra, test, data]
type: fix
done_reason: "Zero-diff dev run confirms the open end is already resolved on base (sibling merges covered it); husk PR closed."
approved_reason: "Reopening: my zero-diff done-flip was wrong — PR #150 recon proves Slices 1-2 remain (CI gate for the concurrency test needs REAL prod RLS DDL, stop-ship until provided)."
reconcile_ignore: true
reconcile_ignore_reason: "Sweep false-positive: PR #150 is a stop-ship RECON DOC, not the implementation — Slices 1-2 (CI gate with verified prod RLS fixture) are in flight as run 485528fa. Spec correctly stays approved/active."
---

# Wire `crm-funnel.concurrent.integration.test.ts` into a real CI gate

**Owner surface:** `minion_hub` — `.github/workflows/ci.yml` (a new Postgres job), a new CI-only
schema fixture file (path decided in Slice 1), `src/server/services/crm-funnel.concurrent.integration.test.ts`
(marker removal + docstring/guard-message correction only — no test-logic change).

## 0. Product

Quoted verbatim from the source proposal
([`handoff-minion-hub-3530856808`](../proposals/handoff-minion-hub-3530856808.md)):

> Filed automatically by the factory handoff-ledger sweep: this file carries a
> `TODO(handoff):` marker (the open-items ledger clause). Approving sends it
> into the spec pipeline to resolve the open end below.
>
> - `NikolasP98/minion_hub@master src/server/services/crm-funnel.concurrent.integration.test.ts:21` —
>   the spec's central concurrency claim is therefore proven by a
>
> **Definition of done:** the marker's open end is resolved and the
> `TODO(handoff):` comment removed; the sweep closes this proposal
> automatically once the file carries no more markers.

The open end is that the concurrency proof this marker points at never executes in CI: the test
skips without a Postgres URL, so the funnel atomic-write claim rests on a file nothing runs. This
spec resolves it by giving that test a real CI gate, then removing the marker.

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
  (the repo's established required-database guard convention, matching
  `crm-contacts.sql.integration.test.ts` and `crm-funnel-parity.sql.integration.test.ts`).
- The file's own docstring (lines 9–19) states it deliberately does **not** self-seed a throwaway
  schema like its two siblings, because its assertions run through the real `withOrgCore` path
  (`with-org-core.ts:38`) and therefore need a real, pre-existing `organizations` row plus the
  `crm_activities` table, with real RLS in force on the CRM tables — the whole point being to prove
  the fix under the actual RLS/role machinery, not a mocked or bypassed one.
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
  depends on: an `organizations` table with the Slice-0-verified `id` definition and at least one
  deterministic seed row (the suite executes `select id::text from organizations limit 1`),
  `crm_activities` and `crm_contacts` tables structurally matching their `pg-crm-schema.ts`
  definitions, the `app_ledger` role, and RLS policies on both CRM tables that are **verified
  equivalent to prod** (not merely inferred from the `_org_guc` naming convention) before being
  trusted as a stand-in for real RLS.
- The fixture is never a `supabase/migrations/*.sql` file and is never applied to a real
  Supabase project — it exists solely as a CI/test-only artifact so a bug in it can never reach
  prod schema.
- `describe.runIf(Boolean(databaseUrl))` continues to skip locally when no database is configured
  (invariant: local `bun run vitest run` behavior is unchanged), while the existing guard still
  fails loudly when `REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES=1` is set without a URL. Only the new
  CI job sets both `SUPABASE_DB_URL` and the requirement flag.
- The suite's own docstring (lines 9–19) is corrected once it is wired into CI — it currently
  states it "CANNOT run against the bare `postgres:` service container," which becomes false; a
  stale comment making a false claim about the file's own execution environment is exactly the
  class of bug this spec exists to prevent, so it must not survive the fix that disproves it.
- The requirement-guard error text is corrected at the same time: it currently says the suite
  needs a "FULL-SCHEMA database ... not the bare CI service," which also becomes false. The guard
  behavior remains unchanged; only its now-stale diagnostic changes.
- The `TODO(handoff):` marker (lines 21–31) is removed only after an initial GitHub Actions run of
  the new job reports all three concurrency cases executed and green. The marker-removal commit is
  then pushed and the final PR head must itself rerun green, so the merge evidence covers the exact
  revision that no longer carries the marker — matching the "a test that is green because it never
  ran" lesson this exact proposal is downstream of.
- **Invariant — no prod schema change.** Zero DDL against the real Supabase project. The CI
  fixture's existence must not be mistaken for a migration; Slice 1's file lives outside
  `supabase/migrations/`.
- **Invariant — the fixture proves real RLS, not a bypassed one.** Unlike
  `crm-contacts.sql.integration.test.ts` (which explicitly mocks `withOrgCore` to bypass RLS for
  its self-seeded schema), this suite's value is specifically that it does **not** mock
  `withOrgCore`. The fixture must not "solve" the CI gap by adding a mock — that would silently
  regress this file to the same weaker guarantee its two self-seeding siblings already provide,
  defeating the reason this file was written as a separate, harder case in the first place.
- **Invariant — a broken fixture must fail loud, not pass empty.** The fixture pre-check must
  assert both catalog configuration (`relrowsecurity`, `relforcerowsecurity`, expected policy
  roles/commands/predicates) and cross-org behavior under `app_ledger`. A behavioral query alone
  cannot detect missing `FORCE ROW LEVEL SECURITY`, because `app_ledger` is not the table owner.

### DELTA — numbered transitions, each mapped to a slice and its proving test

1. The real (Slice-0-verified) DDL and RLS policy text for `crm_contacts` and `crm_activities`,
   plus the `organizations.id` definition this suite needs, are established as fact, not inference →
   **Slice 0** → recorded verbatim in the PR description with their source (prod `pg_policies`/
   `information_schema` query results, or an equivalent authoritative source); stop-ship if
   unobtainable (see §5 A1).
2. A CI-only schema fixture recreating that verified shape (tables + deterministic organization
   seed row + `app_ledger` role + RLS policies + grants) is committed outside
   `supabase/migrations/` → **Slice 1** → `psql -v ON_ERROR_STOP=1` applies it cleanly against a
   fresh `postgres:15` container; catalog assertions prove RLS is enabled and forced with the
   expected policies, and a transaction-scoped negative control proves cross-org CRM rows are
   invisible under `app_ledger` + a foreign `app.current_org_id`.
3. A new, separate CI job applies the fixture and runs
   `crm-funnel.concurrent.integration.test.ts` with `REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES=1` →
   **Slice 2** → the job appears in a real GitHub Actions run against this spec's PR and all
   three `it(...)` cases in the file report passed, not skipped in an uploaded vitest JSON report
   (per the "job logs stay BlobNotFound" gotcha in operator memory, the durable artifact is the
   evidence rather than a raw-log-only assertion).
4. After the first successful CI execution, the suite's docstring and guard diagnostic no longer
   claim it cannot run on a bare CI Postgres, and the `TODO(handoff):` marker is removed →
   **Slice 2** → all stale-text `rg` checks below return no match, and the final PR-head Actions
   run is green with its own uploaded report.
5. `bun run vitest run` (full local suite, explicitly empty `SUPABASE_DB_URL`) is unchanged — this
   file still skips locally exactly as before → **Slice 2** → regression assertion in the PR
   (`SUPABASE_DB_URL= REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES= bun run vitest run` shows the suite's
   three cases skipped, same as pre-spec).

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
  from pg_policies where tablename in ('crm_contacts', 'crm_activities');
  select relname, relrowsecurity, relforcerowsecurity
  from pg_class where relname in ('crm_contacts', 'crm_activities');
  select grantee, table_name, privilege_type from information_schema.role_table_grants
  where table_name in ('crm_contacts', 'crm_activities') and grantee = 'app_ledger';
  select column_name, data_type, udt_name, is_nullable, column_default
  from information_schema.columns
  where table_name = 'organizations' and column_name = 'id';
  ```
  If any verified policy expression references a helper function, table, or role beyond the four
  fixture objects already named, inventory that dependency before S1. Include it only when it is a
  test-only prerequisite with no production impact; otherwise stop for a spec revision rather than
  silently broadening the fixture.
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
  `supabase/ci-fixtures/crm-funnel-concurrent.sql` — containing, in order: an idempotent `DO` block
  that creates `app_ledger` only when absent (`CREATE ROLE IF NOT EXISTS` is not valid PostgreSQL
  syntax); `create table organizations (...)` with the Slice-0-verified `id` definition and one
  deterministic seed row; `create table crm_contacts (...)` and `create table crm_activities (...)`
  structurally matching `pg-crm-schema.ts` (including defaults, nullability, indexes, and the FK
  `crm_activities.contact_id → crm_contacts.id`); then `enable row level security` + `force row
  level security` + the Slice-0-verified policy text (not the `_org_guc`-convention guess) on both
  CRM tables; and finally the matching grants to `app_ledger`.
- End the fixture with catalog assertions whose literal expected rows come from Slice 0. Applying
  the fixture must raise if either CRM table lacks enabled/forced RLS or if the actual `pg_policies`
  roles, commands, predicates, or `with_check` expressions differ from those expected rows. This
  makes the catalog requirement executable rather than a review comment.
- Head the file with a comment stating plainly: this is a CI-only synthetic reproduction of a
  subset of prod schema, sourced from a Slice-0 recon dated to this PR; it is not a migration, is
  never applied to a real project, and must be re-verified against prod if this suite starts
  failing for no code reason (schema drift is a known risk — see `hub-supabase-schema-not-reproducible`
  operator memory).
- Add a pre-check in Slice 2's job that first asserts the two CRM tables' catalog flags and policy
  assertions by applying the fixture, then proves behavior: inside one explicit transaction, act as `app_ledger`, set
  `app.current_org_id` to org A, insert an org-A contact and activity, switch the GUC to org B, and
  raise an error if either row remains visible. The explicit transaction is required because
  `set_config(..., true)` is transaction-local; separate autocommit statements would reset the GUC
  immediately and make the check invalid. This is DELTA #2's negative control.

**Files:** `supabase/ci-fixtures/crm-funnel-concurrent.sql` (new).

**Definition of done (machine-checkable):**
```bash
docker run --rm -d --name ci-fixture-check -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:15
until pg_isready -h localhost -p 55432; do sleep 1; done
psql -v ON_ERROR_STOP=1 "postgresql://postgres:postgres@localhost:55432/postgres" \
  -f supabase/ci-fixtures/crm-funnel-concurrent.sql
#   must exit 0 with no errors
psql -v ON_ERROR_STOP=1 "postgresql://postgres:postgres@localhost:55432/postgres" <<'SQL'
  -- The fixture application above already asserted the RLS catalog snapshot.
  begin;
  set local role app_ledger;
  select set_config('app.current_org_id', '00000000-0000-0000-0000-000000000001', true);
  insert into crm_contacts (id, org_id, source, custom_fields)
  values ('00000000-0000-0000-0000-000000000010',
          '00000000-0000-0000-0000-000000000001', 'manual', '{}');
  insert into crm_activities (id, org_id, contact_id, kind)
  values ('00000000-0000-0000-0000-000000000011',
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000010', 'manual');
  select set_config('app.current_org_id', '00000000-0000-0000-0000-000000000002', true);
  do $$
  begin
    if exists (select 1 from crm_contacts where id = '00000000-0000-0000-0000-000000000010')
       or exists (select 1 from crm_activities where id = '00000000-0000-0000-0000-000000000011') then
      raise exception 'cross-org CRM rows are visible under app_ledger';
    end if;
  end $$;
  rollback;
SQL
docker rm -f ci-fixture-check
```

---

### Slice 2 — CI job + marker removal

**Tags:** `infra`, `test` · **Estimate:** 3–5 h

**Goal:** DELTA #3, #4, #5.

**Do:**
- Add a new, separate job to `.github/workflows/ci.yml`. Isolation is required given the memory
  warning that `SUPABASE_DB_URL` is also read by other
  `*.sql.integration.test.ts`/`*.service.test.ts` files expecting the full prod schema, which this
  fixture deliberately does not fully provide; the separate job scopes the blast radius to exactly
  this one file, matching the existing job's own comment rationale for staying narrow
  (`/memory/MINION/factory/2026-08-20-8e4341e7.md`).
- The job: spin up a bare `postgres:15` service container (same pattern as
  `crm-deposit-rule-postgres`), apply Slice 1's fixture via `psql -v ON_ERROR_STOP=1`, run the
  catalog/behavior pre-check from Slice 1, then run this single test file with `SUPABASE_DB_URL`
  pointed at the container and `REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES: '1'`. Emit a vitest JSON
  report, assert `3` passed and `0` skipped from that report, and upload it with
  `actions/upload-artifact` under `if: always()` so pass/fail evidence survives raw-log expiry.
- Correct the file's own docstring (lines 9–19) and the requirement-guard error message to describe
  the new CI fixture/job instead of claiming the suite needs a full-schema database and cannot run
  on the bare CI service. Do not change the guard condition or any test logic.
- Keep the `TODO(handoff):` block for the first pushed run. After that run's uploaded JSON report
  shows three passed and zero skipped, remove the block, push the marker-removal commit, and require
  the final PR-head run to produce the same green report. Paste the final run URL and artifact name
  into the PR description as DELTA #3/#4 proof.
- Do not touch `crm-contacts.service.ts`, `crm-journey.service.ts`, or any other production
  source file — this slice is CI/test-infra and one file's comments only.

**Files:** `.github/workflows/ci.yml`,
`src/server/services/crm-funnel.concurrent.integration.test.ts` (docstring/guard-message
correction + marker removal only).

**Definition of done (machine-checkable):**
```bash
# Locally, simulate the new job:
docker run --rm -d --name funnel-concurrent-ci -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=crm_funnel_concurrent_test -p 55433:5432 postgres:15
until pg_isready -h localhost -p 55433; do sleep 1; done
psql -v ON_ERROR_STOP=1 "postgresql://postgres:postgres@localhost:55433/crm_funnel_concurrent_test" \
  -f supabase/ci-fixtures/crm-funnel-concurrent.sql
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:55433/crm_funnel_concurrent_test \
REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES=1 \
  bunx vitest run --retry=2 src/server/services/crm-funnel.concurrent.integration.test.ts
#   3 passed, 0 skipped

# In Actions, produce and validate the durable evidence before uploading it.
mkdir -p test-results
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:55433/crm_funnel_concurrent_test \
REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES=1 \
  bunx vitest run --retry=2 --reporter=json --outputFile=test-results/crm-funnel-concurrent.json \
    src/server/services/crm-funnel.concurrent.integration.test.ts
jq -e '.numPassedTests == 3 and .numFailedTests == 0 and .numPendingTests == 0' \
  test-results/crm-funnel-concurrent.json
docker rm -f funnel-concurrent-ci

bun run check
SUPABASE_DB_URL= REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES= bun run vitest run
# full local suite unchanged: this file skips, no new failures
! rg -n 'TODO\(handoff\)' src/server/services/crm-funnel.concurrent.integration.test.ts
! rg -n 'CANNOT run against the bare' src/server/services/crm-funnel.concurrent.integration.test.ts
! rg -n 'needs a FULL-SCHEMA database' src/server/services/crm-funnel.concurrent.integration.test.ts
git diff --name-only <base>...HEAD -- src/server/services/crm-contacts.service.ts src/server/services/crm-journey.service.ts
#   must be empty — this spec touches no atomic-write logic
```

## 4. Files touched (consolidated)

| File | Slices | Nature |
|---|---|---|
| `supabase/ci-fixtures/crm-funnel-concurrent.sql` | S1 | new — CI-only synthetic schema, never a migration |
| `.github/workflows/ci.yml` | S2 | new Postgres-backed job |
| `src/server/services/crm-funnel.concurrent.integration.test.ts` | S2 | docstring/guard-message correction + marker removal only, no test-logic change |

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
SUPABASE_DB_URL= REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES= bun run vitest run
# local suite unchanged; this file skips

# 2. The new CI job, simulated locally exactly as it runs in Actions
docker run --rm -d --name e2e-funnel-concurrent -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=crm_funnel_concurrent_test -p 55434:5432 postgres:15
until pg_isready -h localhost -p 55434; do sleep 1; done
psql -v ON_ERROR_STOP=1 "postgresql://postgres:postgres@localhost:55434/crm_funnel_concurrent_test" \
  -f supabase/ci-fixtures/crm-funnel-concurrent.sql
mkdir -p test-results
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:55434/crm_funnel_concurrent_test \
REQUIRE_CRM_FUNNEL_CONCURRENT_POSTGRES=1 \
  bunx vitest run --retry=2 --reporter=json --outputFile=test-results/crm-funnel-concurrent.json \
    src/server/services/crm-funnel.concurrent.integration.test.ts
jq -e '.numPassedTests == 3 and .numFailedTests == 0 and .numPendingTests == 0' \
  test-results/crm-funnel-concurrent.json
docker rm -f e2e-funnel-concurrent

# 3. Marker + stale execution claims closed
! rg -n 'TODO\(handoff\)' src/server/services/crm-funnel.concurrent.integration.test.ts
! rg -n 'CANNOT run against the bare|needs a FULL-SCHEMA database' \
  src/server/services/crm-funnel.concurrent.integration.test.ts

# 4. No production write-path file touched
git diff --name-only <base>...HEAD -- src/server/services/crm-contacts.service.ts \
  src/server/services/crm-journey.service.ts src/server/services/crm-relationship.service.ts   # expect empty

# 5. Real GitHub Actions confirmation (not just local Docker)
#    First push the job while the marker remains. After its artifact proves 3 passed / 0 skipped,
#    remove the marker and stale text, push again, and paste the FINAL PR-head Actions run URL plus
#    artifact name into the PR description. Local Docker is a pre-flight, not a substitute.
```

**Ship gate:** §7 all green; the final marker-free PR head is green in a real GitHub Actions run
whose URL and uploaded JSON artifact name are pasted in the PR; the artifact says three passed,
zero failed, zero skipped; A1's human dependency is resolved and recorded (who supplied the RLS
policy text, from where); and A2's residual drift risk is acknowledged in the PR rather than
silently accepted.
