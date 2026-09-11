---
phase: 19-capacity-recovery
plan: "02"
requirements: ["CAP-02"]
requirements-completed: []
requirements-partial: ["CAP-02"]
status: partial
snapshot: /home/nikolas/.cache/claude-tmp/19-02-353e2ef4
snapshot_bases:
  minion-factory: origin/dev 02900306a1fcc7b182bae726a24260d08467f81e
  minion_hub: origin/master 1df0a9216ad3f7f85d989eb59cfccb779d9f7285
  minion-meta: origin/dev d3aab3b1852220a0560ba4ab56b6ab6a124cfb65
checks: /home/nikolas/.cache/claude-tmp/19-02-353e2ef4/checks
verified_at: 2026-09-11
owned_files:
  - path: minion_factory/runner/src/queue.capacity.test.ts
    before: absent
    after: 7bf079f0f6412d7558c23ed8b31a5400f25febbaba98f9e113cf45df252011fc
  - path: minion_hub/src/server/db/pg-client.capacity.test.ts
    before: absent
    after: 90732d63950a58f02b60565a804c4d2d9ff5004e79a1ae0cda00c1c4c079c3bf
  - path: .planning/phases/19-capacity-recovery/19-BOTTLENECKS.md
    before: absent
    after: e129648fd62b9a2a43d5fdb8e9e2aa4c6a3c3fbb27f65092e22e05034416ef2d
  - path: .planning/phases/19-capacity-recovery/19-CAPACITY-REPAIR-PLANS.md
    before: absent
    after: 9d974a25593bcc454cd6ff099686fdd7b4b65789840760e6ea25d1814703eab1
  - path: .planning/phases/19-capacity-recovery/19-AFTER.md
    before: absent
    after: 236eb3b27e35c3a0cf203aa162219a8238913b5ffcec9536f00007df9daa1e93
decision_requests: [DR-19-02-1, DR-19-02-2, DR-19-02-3, DR-19-02-4, DR-19-02-5]
---

# 19-02: Bottlenecks measured and pinned; repairs planned, not applied

Status is **partial**. Task 1 is complete at the fixture boundary: two regression files reproduce three growth seams and one burst-amplification defect on synthetic data and pin the current fairness semantics. Task 2 produced bounded child plans with before/after targets and a repeat of the identical 19-01 workload, but no source repair was applied because every file a repair touches (`queue.ts`, `db.ts`, `index.ts`, `pg-pool.ts`, `pg-client.ts`, `bg-runtime.ts`) is outside this plan's `files_modified`. CAP-02 stays open. No commit, stage, push, install into a main checkout, credential, network call beyond `git fetch` and the hub `bun install`, or production/staging contact occurred.

## Identities

The measured Factory source is `origin/dev` `02900306` (the SHA D360-03 records as running), not the local `dev` checkout (`174d0e6`, one commit on `fix/ranking-jq-portability`). This matters: the deployed `selectNextDispatchableRun()` goes through `queueRoutingProjection()`, which loads `SELECT * FROM runs` on every decision — the local checkout still has the pre-ranking `ORDER BY … LIMIT 1` path. The measured Hub source is `origin/master` `1df0a921`, whose `bg-runtime.ts` predates the lease-generation rewrite seen on `feat/level-2026-07-30` (19-01's modeled head `a25528b6`); `pg-client.ts` is byte-identical across both, `pg-pool.ts` differs only in idle/lifetime constants. Runtime: node v22.23.2, better-sqlite3 12.11.1 (factory `node_modules` is a symlink to the main checkout's install; `package-lock.json` byte-identical), vitest 4.1.10, PGlite 0.5.5 (`checks/freeze.json`).

## Task 1 — isolate actual boundedness bottlenecks

`minion_factory/runner/src/queue.capacity.test.ts` (node:test, seeded synthetic history of 2 000 and 20 000 terminal runs with ~1.7 KB manifests, statement-level row counting by wrapping `db.prepare`, `EXPLAIN QUERY PLAN`, `env -i`):

| Seam | Measured on the fixture | Test |
|---|---|---|
| F1 all-history materialization per dispatch decision | rows materialized == `COUNT(*) FROM runs` (2 006 → 20 006); 27–56 ms / 7–10 MiB → 367–715 ms / 84–94 MiB; a full decision at 20k rows with 34 queued: mean 710–756 ms, max 1.7–2.4 s, 33 decisions in 22 s, synchronous on the event loop | 1, 2 |
| F2 candidate query | `SCAN r` + correlated `SCAN s` for the branch mutex (no `runs(status)` / `runs(branch,status)` index) | 1 |
| F3 budget / lineage / breaker scans | `SCAN r` 21 ms, `SCAN runs` 14–17 ms, `SCAN … TEMP B-TREE` 20–29 ms at 20 041 rows; answers correct | 4 |
| F4 admission order (current policy) | stage → score → FIFO; quiet same-score run waits at position 32 behind 30 noisy rows; unranked never admitted; hold/branch-mutex rows skipped without head-of-line blocking | 2, 3 |
| Retry ceilings | `OUTBOX_MAX_ATTEMPTS` 5, `MAX_PHASE_EFFECT_ATTEMPTS` 3, lineage cap refused at ≥ $40 | 4, 5 |

`minion_hub/src/server/db/pg-client.capacity.test.ts` (vitest; real `pg-client.ts` and `pg-pool.ts` over a mocked `postgres` driver, real `bg-runtime.ts` over a PGlite-backed Drizzle):

| Seam | Measured on the fixture | Test |
|---|---|---|
| H1 pool reset cascade | 8 concurrent wedged operations, timeout 20 ms: all fail inside 6× the timeout (125–141 ms) and retry once (16 attempts), but **8 pool teardowns and 9 constructions** instead of 1 and 2 — `resetAllPgPools()` calls `resetPgClient()` without the `expectedClient` generation guard, so each stale timeout destroys the replacement the previous retry opened | "reset cascade" (green, pins the defect) + `it.fails` repair contract (red on purpose) |
| H2 tick global FIFO | 60 older jobs from one tenant, 1 newer from another: quiet tenant admitted at tick 4; a per-tenant round-robin read over the same rows admits it in tick 1 | tick fairness |
| Grace windows / non-recoverable | a query settling at 2.5× timeout is waited out with no reset; a permission error is never retried | 2 tests |

No business priority was changed to make a test pass; F4 and H2 are asserted as they are.

## Task 2 — apply only measured scoped bounds, then repeat the workload

- `19-BOTTLENECKS.md` records the seams above with plans, numbers and what was not reproduced (Hub-on-PostgreSQL pool knee: docker daemon unavailable; production history size: no box access).
- `19-CAPACITY-REPAIR-PLANS.md` generates four bounded child plans, each with exact files, 2–3 tasks, before/after targets, regression and rollback: 19-02-A lineage-scoped dispatch read + two indexes (routing proven identical at 2k/20k in test 1: 6 rows, 1.2–90 ms vs 20 006 rows, 367–715 ms); 19-02-B `resetAllPgPools(expectedClient)` generation guard (flip the `it.fails`); 19-02-C three indexes + sargable `TODAY_COST_WHERE` (plans become `SEARCH`, answers equal on both day edges; `index.ts` consumers named); 19-02-D per-tenant tick fairness, gated on a policy decision.
- `19-AFTER.md` states that no source repair was applied, tabulates the fixture-boundary after evidence per seam, and records the identical 19-01 workload rerun (same manifest, byte-identical scripts by hash, same seed/hardware/runtime, meta head mismatch flagged): knee at concurrency 4 both times, pool checkout wait p95 within 7 % of baseline at every stage, throughput down up to 33 % at concurrency 1 on the shared laptop, 0 errors, effects and jobs correct.

## Gate results (logs under `checks/`; every exit code captured, nothing piped through `tail`)

| Gate | Command | Result | Log |
|---|---|---|---|
| Task 1 factory | `cd minion-factory/runner && env -i … node --import tsx --test src/queue.capacity.test.ts` | 5 tests, 5 pass, 0 fail; exit 0 (28.6 s) | `gate-task1-factory.log` |
| Task 1 hub | `cd minion_hub && env -i … node node_modules/vitest/vitest.mjs run src/server/db/pg-client.capacity.test.ts` | 1 file passed; 4 passed, 1 expected fail (`it.fails`), 0 failed; exit 0 | `gate-task1-hub.log` |
| Task 1 plan chain | both of the above chained with `&&` | exit 0 | `gate-task1-combined.log` |
| Factory repeat | same factory command | 5/5, exit 0; timings within the ranges above | `factory-capacity-repeat.log` |
| Task 2 verify | `node ~/.claude/get-shit-done/bin/gsd-tools.cjs verify plan-structure .planning/phases/19-capacity-recovery/19-02-PLAN.md` (from the main meta root, read-only) | `valid: true`, 0 errors, 0 warnings, 2 tasks; exit 0 | `gate-task2-plan-structure.log` |
| Identical workload rerun | `env -i … node scripts/qc/capacity-run.mjs --disposable-only --manifest 19-WORKLOAD.md --out checks/capacity-rerun-identical-workload.md` | `RECORDED: 4 stages, stop=throughput-plateau, effects 238/238, jobs 205/205`; exit 0 | `gate-task2-identical-workload-rerun.log` |
| Whitespace / diff-check | trailing-whitespace grep on 5 owned files; `git diff --check` in all three snapshots | 0 findings; exit 0 ×3 | `whitespace-check.log`, `diff-check.log` |
| Scope | `git status --porcelain` in each snapshot | only the owned files, the 19-01 inputs copied for the rerun (hashes in `19-01-inputs.sha256` match 19-01's after-hashes), and the factory `node_modules` symlink | `snapshot-status.txt` |
| Hub install | `bun install --frozen-lockfile && bun run i18n:compile && bunx svelte-kit sync` | exit 0 | `hub-install.log` |

First attempts are kept as `factory-capacity-try1.log` (breaker index `(kind,status,finished_at)` still sorted; corrected to `(kind,finished_at,id)`) and `hub-capacity-try1.log` (the cascade assertion that first expected one teardown and observed eight — the H1 discovery).

## Deviations

- The plan's Task 2 action says "execute only after ownership approval and rerun identical workload": ownership was not granted for any repair file, so only the workload rerun and fixture-boundary after evidence exist. The "after" for H1 is deliberately red (`it.fails`).
- The factory repository is not in the executor brief's repo list; its snapshot base is `origin/dev` (fetched), matching the running SHA in D360-03. Its `node_modules` is a symlink to the main checkout's install rather than a fresh install (lockfile identical; no build step required).
- `19-WORKLOAD.md`, `19-BASELINE.md` and the four `capacity-*.mjs` scripts exist only in the 19-01 snapshot; they were copied into this meta snapshot (hash-verified) so the identical workload could be rerun. They are not owned by this plan and were not modified.
- The hub base `origin/master` carries the older `bg-runtime.ts`; the fairness test targets that version's `runTick()` query, which is unchanged in the newer runtime.

## Gaps and what unblocks them

| Gap | Reason | Unblocked by |
|---|---|---|
| Source repairs 19-02-A/B/C not applied | Files outside `files_modified` | DR-19-02-1 ownership grant, then execute the child plans and rerun both capacity tests |
| H1 after evidence | Depends on 19-02-B | Same |
| Tenant/repo fairness (H2, F4) | Policy, not a defect | DR-19-02-2 |
| Pass/fail statement | No SLO with authority | DR-19-02-3 (carried from 19-01) |
| Hub-on-PostgreSQL measurement | Docker daemon unavailable; phase-17 profile absent | DR-19-02-4 |
| Real history size for F1–F3 | No box access without credentials | DR-19-02-5 (read-only count on the Factory box) |

No `TODO(handoff)` was placed in source because no source file was edited; the open items live in the owned planning files and the two test files' comments. Root owns any `proposals/` entry.

## Next gated plan

19-02-A (dispatch lineage read) is the highest-value child: it removes the only synchronous O(history) read on the dispatch path and its regression is already green on the bounded query. 19-02-B is the smallest diff with a red test waiting. 19-03 (failure/fairness/restore) can consume both capacity tests as-is.
