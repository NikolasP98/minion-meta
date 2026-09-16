---
phase: 19-capacity-recovery
plan: "01"
verified: 2026-09-11T10:00:00Z
status: gaps_found
slice_status: partial
score: 2/2 plan truths verified at the fixture boundary; 0/1 requirement closed
requirements_verified_in_scope: [CAP-01]
requirements_completed: []
snapshot: /home/nikolas/.cache/claude-tmp/19-01-7bbd7de7/minion-meta
gaps:
  - truth: "Baseline is measured on the qualified disposable profile"
    status: blocked
    reason: "Plan key_link ops/compose.qc.yml and the phase-17 profile do not exist; the target is a plain-Node model of configured limits."
    missing:
      - "Phase 17 qualified loopback profile"
  - truth: "Service qualification against a target"
    status: blocked
    reason: "No SLO/RPO/RTO with authority exists; manifest declares targets.slo: null and the baseline states sloQualification: blocked-no-established-slo."
    missing:
      - "Owner decision recording capacity targets"
---

# 19-01 verification (goal-backward)

## Must-have truth 1 — "Manifest rejects unidentified targets/production hosts and missing workload identity; target decisions are explicit."

| Check | Evidence | Result |
|---|---|---|
| Non-loopback and production hosts rejected | `capacity-manifest.mjs` `LOOPBACK_HOSTS = ['127.0.0.1']`, `PRODUCTION_PATTERNS` scanned over every string in the packet; test "rejects non-loopback and production-looking targets" covers `0.0.0.0`, `localhost`, `hub.minion-ai.org`, a Supabase `postgres://` URL and a `.ts.net` URL, and keeps a loopback `postgres://127.0.0.1` admissible | Verified (`checks/gate-task1-manifest-test.log`, 6/6) |
| Missing workload identity rejected | Tests remove `workloadId`, set a non-integer `seed`, non-SHA `source.hubHead`, delete `hardware`; each yields a named error | Verified |
| Unsafe/incomplete manifests rejected | Tests cover non-synthetic data, SLO without authority, unlabeled dependency assumptions, pool max 11, non-increasing ramp, >10-minute run, error-rate bound, top stage above connection cap, duplicate mix id, tenant weights not summing to 1, empty object (>5 errors listed), document without a block, `.env` path refusal | Verified |
| Target decisions explicit | `19-WORKLOAD.md` T19-01-A..D table; manifest `target.decision` and `targets.decision` are required non-empty strings; CLI prints `slo=none-established` | Verified |
| Attributable inputs | Request weights cite `telemetry.json` `nav_timing` totals; query counts cite file/line in hub `a25528b6`; limits cite `pg-pool.ts`/`pg-client.ts`/`queue.ts` constants read during this execution | Verified by source read; hub head not re-observed from the snapshot (recorded `unobserved`) |

## Must-have truth 2 — "Identified baseline contains reproducible workload metrics and observed limits; no claimed production capacity without evidence."

| Check | Evidence | Result |
|---|---|---|
| Reproducible identity | `19-BASELINE.md` identity table: workload id, seed, manifest vs observed meta HEAD (match `96e5ceeb`), hardware (match), node v22.23.2; raw JSON embedded | Verified |
| Metrics named in the plan | Per stage: latency p50/p95/p99/max, error numerator/denominator by reason, pool checkout wait p95/max, max pool queue depth, job queue age, fixture CPU and RSS; effect correctness table | Verified (`checks/gate-task2-run.log`, 9/9 tests then `RECORDED … exit 0`) |
| Observed limits and safety stops | `decideStop` covers error-rate, rss-cap, cpu-cap, sustained-backlog, throughput-plateau; time-cap enforced in the loop; unit tests name each; end-to-end run stopped at `throughput-plateau` (concurrency 8) with pool queue ≤ 76 of 256 and RSS ≤ 72 MiB; overload repeat stayed bounded at the 256 cap with RSS 101 MiB | Verified at fixture boundary |
| Effect correctness under retries | Fixture test: same idempotency key applied once, second call `duplicate: true`; run: 295/295 applied once, 113 retries flagged, 0 disagreements; jobs 260/260, 0 processed twice | Verified |
| No production capacity claim | Frontmatter `productionCapacityClaim: none`, `sloQualification: blocked-no-established-slo`; body states the numbers are not Hub/Supabase/image/production; renderer test asserts these strings and the absence of production hostnames | Verified |
| Repeatability | Four repeats in `checks/` (`baseline-rerun.md`, `probe-1..3.md`): knee 4–8 concurrency at 236–244 successful rps in three; stop stage varies; the baseline carries a repeatability caveat | Verified as a range, not a fixed limit |
| Runs short, loopback, clean env | Stages 7 × 4 s max, `maxTotalMs` 180 000 validated ≤ 10 min; fixture listens on `127.0.0.1:0`; child env = `PATH`, `HOME`, `TMPDIR`; the plan gate ran the runner itself under `env -i` | Verified |

## Requirement CAP-01 status

"A synthetic workload records data seed, source/image/hardware, concurrency, SLO and saturation evidence." Seed, source, image (declared `null` with reason), hardware, concurrency and saturation evidence are recorded. SLO evidence is recorded as **absent with authority reason** rather than satisfied, and the saturation target is a fixture rather than the phase-17 profile. CAP-01 remains open until the two frontmatter gaps close; root owns the requirement ledger.

## Scope check

Only the six `files_modified` paths exist as new files in the snapshot (`checks/snapshot-status.txt`). Main checkouts, other worktrees, branches and stashes were not touched; this SUMMARY/VERIFICATION pair is the only write to the main checkout, as the executor brief directs. No commit, stage, push, install, deploy or external network call was made.
