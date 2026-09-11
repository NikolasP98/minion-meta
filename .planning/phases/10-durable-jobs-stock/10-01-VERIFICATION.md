---
phase: 10-durable-jobs-stock
plan: "01"
verified: 2026-09-09T05:53:00Z
status: gaps_found
slice_status: passed
score: 1/4 roadmap truths verified to queue-row fixture boundary
slice_score: 2/2 plan truths verified
requirements_verified_in_scope: [JOB-01]
requirements_completed: []
gaps:
  - truth: "Cancellation, retry and restart preserve deterministic domain effects and canonical outcomes across processes."
    status: partial
    reason: "Generation fencing protects queue rows. Handler effects, cancellation propagation and multi-connection/process recovery remain10-03 scope."
    artifacts:
      - path: minion_hub/src/server/services/bg-runtime.ts
        issue: "advance(job) retains callback compatibility and has no domain-effect cancellation/idempotency envelope."
      - path: .planning/phases/10-durable-jobs-stock/10-03-PLAN.md
        issue: "Requires separate effect and multi-connection qualification."
    missing:
      - "10-03 implementation/evidence and domain-effect ownership."
  - truth: "Stock invoice issue creation/submission converges without duplicate history."
    status: partial
    reason: "Separate10-02 source/verification scope, not established by queue-row tests."
    artifacts:
      - path: .planning/phases/10-durable-jobs-stock/10-02-PLAN.md
        issue: "Concurrent stock identity and interrupted submission need their own acceptance."
    missing:
      - "Independent10-02 acceptance."
---

# Phase 10, slice 01: Independent verification

**Phase goal:** Retried, concurrent and interrupted jobs preserve one authorized business effect and recover without reposting stock history.

**Result:** Both scoped queue-row truths pass. JOB-01 and the full phase remain pending their integration/effect gates. No migration or deployment was performed.

## Observable truths

| Truth | Evidence | Result |
|---|---|---|
| Only the current owner may write after takeover | `claim` atomically increments and returns generation; `ownsLease` includes ID, tenant, running status, generation and leaseUntil greater than current time. Both progress and finish use it; heartbeat shares the same predicate. Real-engine tests reject stale success/failure/progress and tenant reassignment. |Verified |
| Migration preserves rows and rejects invalid generations | Actual additive SQL applies to an existing fixture row; zero default preserved. Negative, null and overflow values reject. Drizzle column/check matches the migration. |Verified |
| Healthy pending calls retain ownership; old expired owners cannot renew | Non-overlapping heartbeat renews every20seconds using the existing60second lease. Test runs beyond the original lease and denies a competing admission. Expired-lease heartbeat fails its live predicate and replacement claims generation2. |Verified |
| Cancellation is not overwritten by old completion | Cancellation increments generation, sets terminal cancelled state and clears lease. Late success/failure cannot satisfy running/generation/live predicates. A stalled callback loses the wait on the next heartbeat; its late rejection remains handled. |Verified |
| Heartbeat timers do not survive completion/cancel/error/budget exit | Interval is cleared through the encompassing `finally`. Tests assert zero remaining timers on each covered exit, including heartbeat storage failure. |Verified |
| Domain effects/process recovery/stock invariants | Not supplied by this slice;10-02/03 retain ownership. |Pending |

The plan's two compound truths are satisfied by these controls at the actual-engine fixture boundary. The whole roadmap includes four broader truths; only the queue-row portion is accepted here.

## Artifacts, links and data flow

`bg-jobs.ts` declares `leaseGeneration` with integer/not-null/default0 and named nonnegative check. The owning migration adds the same column/check and explicitly requires migration-before-code plus old-runner drain. This is an additive storage change; no fixture simulates a safe mixed-old/new deployment because old code has no generation predicate.

`bg-runtime.ts` imports the real Drizzle schema/client and uses SQL updates with returning values. A lease is the committed claim result, not the stale pre-claim row. Each loop rereads current tenant/status/generation/live lease before admitting another callback. Progress writes return whether an owner row was updated, so a stale owner exits. Finish is fenced even when a late result arrives before heartbeat notices cancellation.

The heartbeat permits only one renewal promise in flight. Loss or storage error resolves a loss promise raced against the callback, then interval cleanup runs. In-flight SQL/handler work is not forcibly killed; stopping an interval cannot cancel a query already sent. The live generation/status predicate prevents that renewal from reviving a replaced or terminal row.

Wiring is real: finance statements registers its handler and calls `advanceJob`; `/api/jobs/tick` imports and calls `runTick`. The existing `advance(job)` signature is retained. These consumers feed actual persisted jobs and callbacks, not a new standalone queue that no caller uses. Callback writes remain outside this queue-row transaction.

Level-4 UI tracing is not applicable. The relevant data flow is enqueue→stored row→atomic claim→fresh job→registered handler→fenced progress/terminal write, exercised through actual Drizzle against PGlite. Test redirection is limited to the DB entrypoint.

## Independent behavior checks

`cd minion_hub && timeout 9s node node_modules/vitest/vitest.mjs run src/server/services/bg-runtime.test.ts` passed14 tests in3.68s. The suite applies the actual migration and queries actual PostgreSQL-engine rows; its14 cases cover generation constraints, two overlapping claim attempts, stale outcomes, cancellation, tenant reassignment, healthy long call, heartbeat loss/error, expired reclaim and cleanup. Scoped `git diff --check` passed.

The worker's34-test finance-neighbor run remains separate evidence; it is not added to the independent14-test count. Root owns whole-Hub typecheck, which was not duplicated.

## Boundaries and review axes

**Standards:** No new scoped blocker found. Parameterized Drizzle predicates, additive migration and generation return are substantive. No dependencies, source edits, commits, production SQL or provider requests by the verifier.

**Spec:**2/2 local queue-row truths pass. Full JOB-01 cannot close solely from single-connection PGlite: actual multi-connection MVCC, process crash/restart, live RLS and mixed-binary rollout are not established. The loop budget bounds next-step admission, not an already admitted callback. Cross-process cancellation is observed on heartbeat or later state access, not instantly.

`cancelJobsByRef` retains its existing reference-wide API; caller/domain authorization and globally appropriate reference identity remain part of the10-03 integration review. No new tenant inference is introduced. Lease generation is not an external effect key. The exact-site TODO names callback cancellation/effect idempotency and points to the platform QC proposal.

No human step is needed for this deterministic queue-row slice. Release requires the actual additive migration, draining all old binaries, exact candidate identity and the remaining domain/multi-process evidence. A source test is not authorization to migrate live data.

## Candidate identity

Hub HEAD at baseline: `a25528b603dfe25f7ea9c0900d271060e5394f35`, with other WIP preserved.

| File | SHA-256 |
|---|---|
| `src/server/services/bg-runtime.ts` | `03dbb0dca5cb1f57186499924a3a63ecfad3cca19e4b5b13c772908c1d4bb664` |
| `supabase/migrations/20260909090100_bg_job_lease_generation.sql` | `441496dba7e84a510fbe53184c5e99fa543cc7513be2fd7efcdaea968cf23e3a` |

Independent GSD verifier. Only this verification artifact was authored for10-01; global phase/requirements remain root-owned.
