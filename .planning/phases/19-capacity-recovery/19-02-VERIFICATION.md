---
phase: 19-capacity-recovery
plan: "02"
verified: 2026-09-11T10:40:00Z
status: gaps_found
slice_status: partial
score: 2/2 plan truths verified at the fixture boundary; 0/1 requirement closed
requirements_verified_in_scope: [CAP-02]
requirements_completed: []
snapshot: /home/nikolas/.cache/claude-tmp/19-02-353e2ef4
gaps:
  - truth: "Measured bottlenecks are repaired in source and the identical workload shows the after"
    status: blocked
    reason: "Every repair file (queue.ts, db.ts, index.ts, pg-pool.ts, pg-client.ts, bg-runtime.ts) is outside 19-02 files_modified; child plans 19-02-A..D were generated, not executed. The H1 repair contract is pinned as it.fails and reads red."
    missing:
      - "DR-19-02-1 ownership grant and execution of 19-02-A/B/C"
  - truth: "Bounds are measured on the qualified disposable Hub profile"
    status: blocked
    reason: "Docker daemon unavailable on this machine and the phase-17 profile does not exist; Hub seams were measured on real pg-client/pg-pool/bg-runtime over a mocked driver and PGlite, Factory seams on better-sqlite3 in a temp directory."
    missing:
      - "DR-19-02-4 disposable PostgreSQL target"
  - truth: "Fairness across tenants/repositories is decided"
    status: blocked
    reason: "Current policy (global FIFO tick; stage→score→FIFO admission without per-repo interleaving) is pinned, not changed; changing it is a business-priority decision."
    missing:
      - "DR-19-02-2"
---

# 19-02 verification (goal-backward)

## Must-have truth 1 — "Tests reproduce measured growth/starvation and preserve required scheduling semantics."

| Check | Evidence | Result |
|---|---|---|
| Growth reproduced, not guessed | `queue.capacity.test.ts` test 1 asserts `materializedRows == COUNT(*) FROM runs` at 2 006 and 20 006 rows and that the 20k figure exceeds 9× the 2k figure; evidence lines show 27–56 ms / 7–10 MiB → 367–715 ms / 84–94 MiB (`checks/gate-task1-factory.log`, `factory-capacity-repeat.log`, `gate-task1-combined.log`) | Verified (3 runs) |
| Starvation / noisy-tenant behaviour reproduced | Factory: 30 noisy rows precede the quiet same-score row (position 32), 33 decisions mean 710–756 ms at 20k rows. Hub: quiet tenant admitted at tick 4 behind 60 noisy jobs (`gate-task1-hub.log`) | Verified |
| Slow downstream and retry storm | Hub: progressing query at 2.5× timeout waited out without reset; 8-op wedged burst bounded at 6× timeout, 2 attempts per op, but 8 teardowns / 9 constructions (cascade) — asserted exactly | Verified; the cascade is a new measured defect (H1) |
| Scheduling semantics preserved from current policy | Stage → score → FIFO order asserted over 33 rows; branch mutex and hold skip without head-of-line blocking; unranked row rejected (`missing-ranking`); requeue keyed through its parent; issue run parked by linked open PR; control kinds not exercised (no rank/reconcile rows seeded) | Verified for the exercised paths; control-kind ordering is covered by `queue-rankings.test.ts` upstream, not re-asserted here |
| Negative / failure cases named before implementation | Unranked run rejected; held run skipped; running-branch sibling skipped; non-recoverable DB error not retried; wedged operation rejected with `CoreDbOperationTimeout`; lineage cap refuses at ≥ $40 | Verified |
| Never changed business priorities to pass | No source file edited; F4/H2 asserted as current behaviour; repair candidates run beside the source, never instead of it | Verified (`snapshot-status.txt`: only the two test files are new in factory/hub) |
| Baseline consulted to choose seams | 19-01 named all-history materialization and the pool queue; both confirmed at source (`queueRoutingProjection` `SELECT * FROM runs`; no admission cap beyond the 10 s timeout). Seams the baseline could not show (Hub-on-PostgreSQL knee) are listed as not reproduced with reason | Verified |
| Plan gate | `(cd minion_factory/runner && node --import tsx --test src/queue.capacity.test.ts) && (cd minion_hub && node node_modules/vitest/vitest.mjs run src/server/db/pg-client.capacity.test.ts)` | exit 0 (`gate-task1-combined.log`: 5/5 and 4 passed + 1 expected fail) |

## Must-have truth 2 — "Every measured bottleneck has bounded repair plan and matching regression; after evidence must exist before closure."

| Check | Evidence | Result |
|---|---|---|
| Every measured seam has a plan | F1+F2 → 19-02-A; H1 → 19-02-B; F3 → 19-02-C; H2 (+F4) → 19-02-D gated on policy (`19-CAPACITY-REPAIR-PLANS.md`) | Verified |
| Each plan names exact files, 2–3 tasks, before/after target, rollback | A: `queue.ts`+`db.ts`, 3 tasks, 20 006 rows → 6 rows / 367–715 ms → 1.2–90 ms, revert + DROP INDEX. B: `pg-pool.ts`+`pg-client.ts`, 3 tasks, 8/9 → 1/2, revert. C: `db.ts`+`queue.ts`+`index.ts`, 3 tasks, SCAN → SEARCH with equal answers, revert + DROP INDEX. D: `bg-runtime.ts`, tick 4 → 1, revert | Verified |
| Matching regression exists and is green on the bounded candidate | A: test 1 routes the bounded lineage through the real `routeQueueCandidates` and asserts identical queue/reevaluate output. C: test 4 asserts equal answers and `SEARCH` plans with throwaway indexes. D: tick test runs the round-robin SQL on the same rows. B: `it.fails` contract (red by design) | Verified for A/C/D; B is a red marker awaiting the repair |
| All-history fix keeps dependency ordering | Bounded read includes the full `requeue_of` chain (recursive CTE) and issue→PR link rows; ordering asserted identical at 2k and 20k | Verified at fixture boundary |
| Pool caps use timeout/admission contracts, not a larger max | 19-02-B changes no pool size; it scopes the reset to the generation the timeout belongs to | Verified by plan content |
| Identical workload rerun after | `checks/capacity-rerun-identical-workload.md`: same manifest/scripts (hash-identical to 19-01), same seed/hardware/runtime, knee at 4, pool wait p95 within 7 %, 0 errors, effects/jobs correct; meta head mismatch flagged | Verified as repeatability sample; **not** a before/after because no repair was applied |
| Task 2 gate | `gsd-tools.cjs verify plan-structure 19-02-PLAN.md` | `valid: true`, 0 errors (`gate-task2-plan-structure.log`) |
| After evidence before closure | `19-AFTER.md` frontmatter `sourceRepairsApplied: none`; closure explicitly withheld | Verified — CAP-02 remains open |

## Requirement CAP-02 status

"Pool/worker/lineage processing stays bounded and fair during bursts, retries and downstream failure." Bounded: retry ceilings, lineage cap, recovery latency (6× timeout) and the fixture's pool queue/RSS are shown bounded; dispatch cost (F1–F3) and pool churn under a wedged burst (H1) are shown **unbounded** in history size and burst size respectively, with repairs planned but not applied. Fair: current admission and tick policies are pinned and their cross-tenant starvation measured; whether that is the required fairness is a decision (DR-19-02-2). CAP-02 therefore remains open; root owns the requirement ledger.

## Scope check

Only the five `files_modified` paths are new across the three snapshots, plus the copied 19-01 inputs (unmodified, hash-verified) and the factory `node_modules` symlink (`checks/snapshot-status.txt`, `before.txt`, `after.txt`, `19-01-inputs.sha256`). Main checkouts, other worktrees, branches and stashes were not touched; this SUMMARY/VERIFICATION pair is the only write to the main checkout. No commit, stage, push, deploy, credential or production/staging contact; the only network calls were `git fetch origin <base>` for the three snapshots and `bun install` for the hub snapshot.
