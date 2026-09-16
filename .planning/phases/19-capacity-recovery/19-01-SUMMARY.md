---
phase: 19-capacity-recovery
plan: "01"
requirements: ["CAP-01"]
requirements-completed: []
requirements-partial: ["CAP-01"]
status: partial
snapshot: /home/nikolas/.cache/claude-tmp/19-01-7bbd7de7/minion-meta
snapshot_base: origin/dev 96e5ceeb25a7544e47fb9f3362c4d2b6849fcc5f
checks: /home/nikolas/.cache/claude-tmp/19-01-7bbd7de7/checks
verified_at: 2026-09-11
owned_files:
  - path: scripts/qc/capacity-manifest.mjs
    before: absent
    after: e9779b8dba443ad3aae314e1a571894a2009d63b4fd494983bfb48550643dc45
  - path: scripts/qc/capacity-manifest.test.mjs
    before: absent
    after: 4e00d121cfc98b4ecc11ebb4ffbeb5718a269826fd7e45ab224dc822240eb59e
  - path: .planning/phases/19-capacity-recovery/19-WORKLOAD.md
    before: absent
    after: ce6db9a4945ec50122f9d8a0a9ecfffeae1fca48fde67d7e8697bf3ac323b913
  - path: scripts/qc/capacity-run.mjs
    before: absent
    after: 9a848c02ec703fbf6e96c127a28c13dda24746349cd088ba35193feb87838067
  - path: scripts/qc/capacity-run.test.mjs
    before: absent
    after: 3dcd443d919b7b4c6049debf5d2c823c4502a079f43bd68300f198cd059aa9af
  - path: .planning/phases/19-capacity-recovery/19-BASELINE.md
    before: absent
    after: 0a860a0d5579b5953d44cad7002f14ac8e1ac75425c524e8d9363ba95bbc5c49
---

# 19-01: Synthetic workload identified; bounded baseline measured on a disposable fixture

Status is **partial** by design: the workload is identified and validated, the harness runs bounded ramps with safety stops on a loopback fixture, and effect correctness holds. CAP-01 is not closed because (a) no service SLO exists to qualify against, and (b) the phase-17 disposable Hub profile the plan names as the target (`ops/compose.qc.yml`) does not exist in this checkout, so the measured target is a plain-Node model of the Hub's configured limits, not the Hub. No production or remote host was contacted. No commit, stage, push, install or main-checkout edit occurred.

## What was done

### Task 1 — workload manifest and target decision packet

- `scripts/qc/capacity-manifest.mjs` (Node builtins only) extracts the ```` ```json capacity-manifest ```` block from `19-WORKLOAD.md` and fails closed on: non-loopback host (only `127.0.0.1`; `localhost`/`0.0.0.0` rejected), any production/remote reference anywhere in the packet (`minion-ai.org`, `supabase.co`, `.ts.net`, `vercel.app`, `facesculptors`, `netcup`, `fly.dev`, `SUPABASE_DB_URL`, non-loopback `postgres://`/`http(s)://`), unknown target kind, missing `workloadId`/`seed`/`target.decision`/source heads/hardware, `data.synthetic !== true`, `targets.slo` without `authority`, `targets.proposed` not labeled `proposed`, unlabeled dependency assumptions, pool max above `MAX_POOL_SIZE` (10), non-increasing ramps, missing or over-ten-minute safety stops, ramp top above the connection cap, tenant weights not summing to 1, duplicate mix ids.
- `19-WORKLOAD.md` records four explicit target decisions (T19-01-A..D), the source-attributed request mix (layout gate 5 awaited calls on every page; Home 6, CRM customers 11, Calendar 10 — counted as awaited service calls in `+layout.server.ts`, `home/+page.server.ts`, `crm/customers/+page.server.ts`, `scheduling/calendar/+page.server.ts` at hub `a25528b6`), relative weights from the only attributable telemetry (`.lavish/minion-qc-2026-09-08/telemetry.json` `nav_timing` totals: home 5, calendar 5, crm 2; 244 pageviews in seven days), the effect and job flows modeled on `bg-runtime.ts` (lease 60 s / heartbeat 20 s / budgets 25 s and 50 s) and `minion_factory/runner/src/queue.ts` (`FACTORY_CONCURRENCY` 2), configured limits copied verbatim (`DEFAULT_POOL_SIZE` 5, `MAX_POOL_SIZE` 10, `DEFAULT_OPERATION_TIMEOUT_MS` 10 000), labeled assumptions A1–A4, `targets.slo: null` and `proposed` thresholds that gate nothing.
- SLO/RPO/RTO search: `.planning/DECISIONS.md`, `REQUIREMENTS.md`, `operations/360/PROGRAM.md` and the plan index contain no established capacity target; the index explicitly bars "stating service SLO pass or production capacity promise".

### Task 2 — bounded baseline runner

- `scripts/qc/capacity-run.mjs` refuses to start without `--disposable-only` (exit 2), validates the manifest before anything is spawned, then spawns its own fixture (`--fixture` mode of the same file) on `127.0.0.1:0` with `env` limited to `PATH`, `HOME`, `TMPDIR`. The fixture models: a bounded pool semaphore with checkout-wait measurement, `operation-timeout` after the configured 10 s and `pool-queue-cap` fail-fast at `safetyStops.maxQueueDepth` (fixture memory bound; the Hub has no such cap), `Promise.all` query fan-out per modeled page, seeded log-normal dependency latency, an idempotency-keyed effect store (apply once, flag retries), and a FIFO job queue with the configured worker count and queue-age tracking.
- Closed-loop workers ramp through `ramp.stages` for `stageDurationMs` each; after every stage `decideStop` applies the safety stops (error rate, RSS, CPU, sustained backlog, time cap) and the saturation signal (successful-throughput plateau). Per stage it records requests, error numerator/denominator by reason, successful rps, p50/p95/p99/max latency of successes (error latencies kept separately), pool checkout wait p95/max, max pool queue depth, max job queue age, fixture CPU percent and RSS. It then verifies effect and job correctness and renders `19-BASELINE.md` with identity rows (manifest vs observed heads/hardware/runtime), the stage table, observed limits, correctness table and the raw JSON.

## Gate results (all from the snapshot root; logs under `checks/`)

| Gate | Command | Result | Log |
|---|---|---|---|
| Task 1 verify | `node --test scripts/qc/capacity-manifest.test.mjs` | 6 tests, 6 pass, 0 fail; exit 0 | `gate-task1-manifest-test.log` |
| Manifest CLI | `node scripts/qc/capacity-manifest.mjs` | `PASS … slo=none-established`; exit 0 | `gate-task1-manifest-cli.log` |
| Task 2 verify (exact plan chain) | `node --test scripts/qc/capacity-run.test.mjs && node scripts/qc/capacity-run.mjs --disposable-only --manifest .planning/phases/19-capacity-recovery/19-WORKLOAD.md` (runner under `env -i PATH HOME TMPDIR`) | 9 tests, 9 pass, 0 fail; run `RECORDED: 4 stages, stop=throughput-plateau, effects 295/295, jobs 260/260`; exit 0 | `gate-task2-run.log` |
| Refusal | `node scripts/qc/capacity-run.mjs` (no flag) | `refusing: only --disposable-only runs are supported`; exit 2 | `gate-refusal.log` |
| Whitespace | trailing-whitespace grep per owned file | 0 findings on 6 files; exit 0 (`git diff --check --no-index` reports the same 0 whitespace findings; its exit 1 only means the file differs from `/dev/null`) | `whitespace-check.log`, `diff-check.log` |
| Snapshot scope | `git status --porcelain` in snapshot | only the six owned paths are new; nothing else changed | `snapshot-status.txt` |

Runtime: node v22.23.2, linux 7.1.9-arch1-2 x64, Intel Core Ultra 9 185H, 22 CPUs (`freeze.json`). No dependencies installed or imported; `pnpm install` was not run because every owned script uses Node builtins only.

## Baseline evidence (fixture, not Hub)

Committed run (`19-BASELINE.md`, seed 20260911, 4 000 ms stages, 3 000 ms warmup): concurrency 1/2/4/8 → 135.6 / 203.6 / 237.8 / 171.4 successful rps, 0 errors of 3 008 requests, pool checkout wait p95 4.3 → 8.0 → 18.0 → 95.8 ms, max pool queue depth 6 → 17 → 35 → 76 (cap 256 never reached), fixture RSS ≤ 72 MiB, CPU ≤ 16 % of one core. Stop: `throughput-plateau` at concurrency 8. Effects: 295 unique ids applied once, 113 retries flagged duplicate, 0 disagreements. Jobs: 260 sent, 260 completed, 0 processed twice.

Repeat runs on the same identity (`baseline-rerun.md`, `probe-1..3.md`): knee at concurrency 4–8 with 236–244 successful rps in three of four repeats; one earlier repeat with the original 500 ms warmup and 40-deep queue cap reached concurrency 32 before `error-rate` (`pool-queue-cap` 149 538 rejections in 4 s, RSS 101 MiB, job backlog 1 269 with max queue age 3.3 s — the fixture stayed bounded). The limiting resource in every run is the 5-slot pool under `Promise.all` fan-out: checkout wait grows roughly linearly with concurrency (≈4 → 8 → 18 → 39 → 79 ms p95 at 1/2/4/8/16). Stop stage varies between runs on this laptop; the baseline says so and treats the knee as a range.

Labels that must travel with these numbers: dependency latency is assumed (A1), hardware is a developer laptop, the target is a plain-Node model of configured limits, and there is no SLO — nothing here is a service pass or a production capacity figure.

## Deviations

- The plan's `key_links` name `ops/compose.qc.yml` (phase 17) as the runner's read-first contract. It does not exist and phase 17 has no SUMMARY; cross-phase admission "17 disposable profile qualified" is unmet. Recorded as decision T19-01-B and as the primary gap below; the harness is written so the same manifest can be pointed at a loopback-only qualified profile later without changing the validator.
- Two harness corrections during execution, both visible in `checks/`: effect accounting originally counted 503-rejected first attempts as "sent unique" (fixed: only server-acknowledged ids count, retries draw from acknowledged ids), and `maxQueueDepth` 40 tripped on the modeled 11-query fan-out at concurrency 8 (raised to 256 with the reason recorded in the manifest). Warmup raised 500 → 3 000 ms after the first stage showed JIT/frequency-scaling outliers.
- `--out` accepts a path relative to the meta root; one early rerun used `../../checks/...` and wrote outside the snapshot directory; that file was removed and later runs use absolute paths.

## Gaps and what unblocks them

| Gap | Reason | Unblocked by |
|---|---|---|
| Real disposable target | `ops/compose.qc.yml` / phase-17 profile absent; no local PostgreSQL server image available offline (docker present, no postgres image; PGlite only inside `minion_hub/node_modules` and single-connection) | Phase 17 qualified profile on loopback, or an explicit decision to pull a PostgreSQL image locally; then rerun with the manifest's `target` decision updated |
| Pass/fail qualification | No SLO/RPO/RTO with authority anywhere in `.planning` | Owner records targets in `DECISIONS.md`; set `targets.slo.authority` in the manifest |
| Hub head observation | Snapshot has no `minion_hub`; the baseline reports `unobserved` and keeps the modeled head from the manifest | Root runs the same command from a checkout containing `minion_hub` at `a25528b6` |
| Measured dependency latency | A1 is assumed; no measured Supabase/pooler latency in the checkout | Phase 16 telemetry export with attributable query timings |
| Fairness, repairs, restore | Out of scope (19-02, 19-03) | Those plans |

No `TODO(handoff)` was placed in source: the open items are policy/target gaps recorded here and in `19-WORKLOAD.md`, not unwired code paths. Root owns any proposal entry.

## Next gated plan

19-02 (measure-before-mutation repairs) can consume `19-WORKLOAD.md` and the runner as-is; it should first replace the fixture target with the qualified phase-17 profile so repairs are measured against real pool and queue seams.
