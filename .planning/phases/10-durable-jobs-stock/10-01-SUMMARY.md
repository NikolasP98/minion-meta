---
phase: 10-durable-jobs-stock
plan: "01"
status: source-verified
requirements-completed: []
requirements-partial: ["JOB-01"]
release_status: not-deployed
verified_at: 2026-09-09
---

# 10-01: Generation-fenced background job leases

Local implementation and the scoped runtime fixture pass. JOB-01 remains pending plan 10-03's handler envelope, effect ownership and disposable multi-connection PostgreSQL qualification. No production migration, deployment, dependency update, commit, branch or worktree operation occurred.

## Scope and behavior

Owned files:

- `minion_hub/src/server/db/pg-schema/bg-jobs.ts`
- `minion_hub/supabase/migrations/20260909090100_bg_job_lease_generation.sql`
- `minion_hub/src/server/services/bg-runtime.ts`
- `minion_hub/src/server/services/bg-runtime.test.ts`

The additive integer `lease_generation` starts at zero for existing jobs. PostgreSQL rejects negative, null and integer-overflow values. Claims atomically increment and return the committed generation. Every heartbeat, progress and finish write now includes job ID, tenant, running status, generation and a live lease in its predicate. Expired ownership cannot be renewed by its former owner.

Cancellation increments the generation, clears the lease and preserves the cancelled terminal state against late success or failure. A non-overlapping heartbeat runs every 20 seconds while the admitted step is pending. The existing 60-second lease duration is retained. A missing owner row or heartbeat storage failure stops further admission. Losing ownership also ends the caller's wait; a callback that rejects later retains a rejection handler. Every exit clears the interval in `finally`.

`advance(job)` remains source-compatible. The runtime still treats its budget as a limit on admitting the next step, not a hard deadline or proof that an already admitted provider/domain effect has stopped. Cross-process cancellation is detected on heartbeat or the next read/write; this is not instantaneous cancellation. Domain writes performed by the callback remain outside this queue-row fence until 10-03.

## Verification

Executed from `minion_hub` using installed tools:

```sh
node node_modules/vitest/vitest.mjs run src/server/services/bg-runtime.test.ts
node node_modules/vitest/vitest.mjs run src/server/services/bg-runtime.test.ts src/server/services/finance-sync-jobs.service.test.ts src/server/services/finance-sync.service.test.ts
node node_modules/prettier/bin/prettier.cjs --check src/server/services/bg-runtime.ts src/server/services/bg-runtime.test.ts src/server/db/pg-schema/bg-jobs.ts
git diff --check -- src/server/services/bg-runtime.ts src/server/db/pg-schema/bg-jobs.ts
```

- Red: original runtime failed 9 of the initial 12 behavioral cases. Failures included stale-owner overwrites, cancellation becoming done/failed, no heartbeat renewal and stalled-handler cancellation timeouts.
- Green: 14 new cases pass. The combined run passes all 34 tests in three files, including existing finance synchronization tests.
- Scoped Prettier and tracked diff whitespace checks pass. Root owns the final full Hub typecheck and independent review.
- The new fixture uses actual Drizzle SQL and the installed PGlite PostgreSQL engine, synthetic records and fake clocks. Only the database entrypoint is redirected. It applies the actual additive migration to a pre-existing row.
- Cases cover additive storage constraints, overlapping queued claim attempts, old-owner success/failure/progress after takeover, late completion/failure after cancellation, tenant reassignment, pre-cancelled admission, a healthy call exceeding its original lease, stalled-handler cancellation, failed heartbeat storage, expired lease reclamation, failure and budget cleanup.
- PGlite has one embedded connection: these cases establish actual SQL predicate behavior, not separate-connection MVCC races, process crash recovery, live RLS or deployed concurrency. Those remain explicit 10-03 gates.

Evidence logs and scoped before-images: `/tmp/minion-360-10-01/` (`red.log`, `green.log`, `combined.log`, `final-tests.log`). They contain synthetic test output only.

## Candidate identity

Hub branch at capture: `feat/level-2026-07-30`; HEAD `a25528b603dfe25f7ea9c0900d271060e5394f35`. Existing dirty runtime TODO was preserved in narrowed form. Other agents' files were not reverted.

SHA-256 at this slice's verification:

| File | SHA-256 |
|---|---|
| `src/server/services/bg-runtime.ts` | `03dbb0dca5cb1f57186499924a3a63ecfad3cca19e4b5b13c772908c1d4bb664` |
| `src/server/services/bg-runtime.test.ts` | `d9eababcf64e0a3ca2006f45717564e4513b716d8bbf43fbdb296d03725e2f39` |
| `src/server/db/pg-schema/bg-jobs.ts` | `78eb0ac2507dc1b539cb96af02af3572c82c1bec4b753634e55930e72f5a705a` |
| `supabase/migrations/20260909090100_bg_job_lease_generation.sql` | `441496dba7e84a510fbe53184c5e99fa543cc7513be2fd7efcdaea968cf23e3a` |

## Review and remaining gates

Standards self-review: exclusive file scope, existing Bun repository tooling, strict types, parameterized Drizzle predicates, synthetic evidence and no production changes. No new dependencies.

Spec self-review: queue-row generation and heartbeat behaviors pass their local actual-engine fixtures. The full requirement remains partial. Root must independently verify and update global state.

Rollout requires the additive migration before the new binary and draining old runners before replacement. Old binaries ignore the new generation predicates; this migration alone cannot make mixed-version execution safe. Do not deploy from this summary.

Source `TODO(handoff)` at the lease policy points to the existing platform QC proposal (HDS-05) and names the remaining 10-03 callback cancellation/effect idempotency work. Root owns updating that proposal and the global ledger. D360-01 (preserve WIP), D360-04 (no paid calls), D360-05 (actual schema/engine evidence) and D360-06 (ownership/integration gates) remain in force.
