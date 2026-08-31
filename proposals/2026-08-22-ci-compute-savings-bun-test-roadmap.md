---
id: 2026-08-22-ci-compute-savings-bun-test-roadmap
title: CI and Factory compute savings — evidence-first roadmap including Bun 1.4 test evaluation
status: in-spec
created: 2026-08-22
updated: 2026-08-31
spawned_spec: 2026-08-31-ci-compute-savings-bun-test-roadmap-spec
repos: [minion, minion_hub, minion_site, minion-factory, minion-meta, minion-base, paperclip]
tags: [infra, test]
approved_reason: "Ranked-queue supervisor approval: board-goal-v2 score 90/100, recommendation execute, readiness specification 9/10 and implementation 8/10; live admission threshold 80/100 and readiness threshold 6/10."
---

# CI and Factory compute savings — evidence-first roadmap including Bun 1.4 test evaluation

## Problem in the user's words

> Figure out what's causing such a high cost in the CI/CD pipeline, apply the recommended savings,
> add Bun test to the roadmap, and consider OpenRouter if Haiku/Luna remain too expensive.

The goal is lower billed compute and model spend without weakening required tests, independent
review, deployment verification, or the existing fail-closed budget gates.

## AS-IS — verified evidence

1. `minion-meta#120` records a real daily Factory spend of `$536.23` against a `$150` cap. The cap
   correctly held new work; it did not explain or remove the preceding spend.
2. Reconcile run `953fea07` spent `$2.61` and failed after all six merge-scan repositories returned
   fenced JSON that the direct parser rejected. The next sweep would have paid to retry the same
   deterministic format mismatch. `minion-factory#60` is the first applied saving: a bounded parser
   accepts the observed whole-response fence while preserving schema and injection defenses.
3. `minion-meta#124` records a healthy hub run killed at the 50-minute wall cap after two develop
   rounds, one review/fix cycle, green tests, and the start of review 2. Monolithic timeout loses
   useful progress and makes a full retry likely.
4. Factory records Claude cost and coarse Codex call/turn proxies, but subscription-backed Codex has
   no exact per-call dollar ledger. Test runner wall time, peak memory, CPU time, cache hit/miss,
   discovered-test count, and per-lane retry causes are not one reconciled cost record.
5. The gateway CI already has a large, segmented Vitest setup and documented pre-existing failures.
   Hub/site use Bun as package manager/runtime but still depend on Vitest semantics for many Svelte,
   DOM, mocking, integration, and coverage tests. A global search/replace would be a compatibility
   migration, not a cost optimization.
6. Bun 1.4 is current and real as of 2026-08-20. Its official release notes document lower runtime
   memory/idle CPU, `bun test --parallel`, improved `vi`/Vitest compatibility, and Vitest running
   under Bun with coverage, threads, and forks. Bun also states that Node compatibility is not yet
   complete. These are reasons to benchmark, not proof that this codebase will be cheaper or
   behaviorally equivalent. Source: [Bun 1.4 release notes](https://bun.sh/blog/bun-v1.4).

## TO-BE

- Every expensive lane reports where time and retries went before model/test-provider changes are
  approved.
- Deterministic parser, cache, path-selection, stale-run, timeout, and retry defects are removed
  before buying cheaper models to repeat avoidable work.
- Hosted tests run only the required lanes for a change, while scheduled/full gates still cover the
  complete contract at an explicit cadence.
- Bun 1.4 is evaluated in shadow against the same commit and test inventory in three modes:
  current Node+Vitest, Bun-hosted Vitest, and native `bun test` where compatible.
- Migration occurs suite by suite only when pass/fail/skip discovery, snapshots, coverage/gates, and
  failure detection are equivalent and hosted billed minutes improve materially.
- OpenRouter is optional for narrow, non-tool, non-independent workloads after telemetry. Provider
  origin is pinned and recorded; an aggregator label does not prove independence.

## DELTA and implementation order

### R0 — Stop deterministic repeated model work now

- Land `minion-factory#60` and verify one reconcile sweep advances its merge-scan checkpoints.
- Add the fenced-result signature to deterministic unstick classification only after the parser is
  deployed, so old failures point to the fixed contract instead of buying facilitator diagnosis.
- Do not blind-requeue `953fea07` against an unfixed image.

**Proof:** the same private result artifacts parse under the deployed helper; the next sweep either
advances or fails for a different, explicit cause; no second paid parse-format failure is filed.

### R1 — Reconcile model, test, and runner telemetry

- Record per run/phase: harness, resolved model/provider origin, reasoning effort, turn/call counters,
  reported model cost when available, wall time, exit class, retry/fallback reason, test command,
  test count/pass/fail/skip, peak RSS/CPU time when the runner can observe it, and cache outcome.
- Separate subscription Codex usage from dollar-priced API usage. Never fabricate an estimated
  dollar cost and add it to an exact ledger without labeling it separately.
- Attribute timeout kills to the active phase and preserve the last confirmed handoff/candidate.

**Proof:** one reconcile, one low-risk dev, and one hub test-heavy dev reconcile from phase records to
their run total; every retry has one closed reason enum; unknown/unattributed time is visible.

### R2 — Avoid paying twice for work already done

- Complete durable phase execution so a wall timeout after review-fix resumes from the last
  confirmed candidate/test handoff instead of reconstructing develop from scratch.
- Classify wall-clock budget termination separately from task failure. A model-tier escalation must
  never be triggered by a runner timeout, budget cap, auth outage, or killed test process.
- Cancel superseded hosted CI runs through workflow concurrency groups where missing; retain the
  newest branch/PR run and required release run.
- Use content-addressed dependency/build caches with lockfile/toolchain/config keys and no secret or
  writable cross-trust sharing.

**Proof:** crash/timeout fixtures resume one phase, do not duplicate PR/push/review effects, and do
not promote model tier; two rapid pushes cancel only the stale CI run.

### R3 — Select and size CI lanes before changing runners

- Inventory every workflow job by trigger, path ownership, required-check status, p50/p95 wall time,
  setup/install time, test time, cache restore/save time, and failure rate.
- Add path filters only when a dependency/impact map proves the skipped lane cannot consume the
  change. Shared protocol/schema/config/tooling paths fan out to every affected consumer.
- Split quick deterministic checks from integration/browser/database lanes. Run the smallest valid
  gate on PRs and preserve full/scheduled coverage for contracts that cannot be selected safely.
- Right-size worker counts from measured CPU/RSS. More test workers are not a saving if they cause
  OOM, contention, or retry.

**Proof:** a committed workflow matrix maps each path class to required lanes; mutation fixtures in
shared paths trigger all consumers; hosted run metadata shows no required check disappeared.

### R4 — Bun 1.4 shadow benchmark

Benchmark on identical commits and pinned dependencies:

| Mode | Command family | Purpose |
|---|---|---|
| A | Existing Node + Vitest command | Behavioral and cost baseline. |
| B | Bun-hosted Vitest (`bunx --bun vitest` or an equivalent pinned package script) | Tests Bun runtime savings without changing the test framework contract. |
| C | Native `bun test`, including bounded `--parallel` experiments | Measures maximum simplification/speed where API/config compatibility exists. |

Start with pure logic suites and repositories already using native `bun test` successfully. Then
evaluate Svelte/DOM, fake timers, module mocks, worker/fork pools, snapshots, coverage, native
addons, Playwright, and database/testcontainer lanes separately. Never infer compatibility from a
single green happy-path test.

For each candidate suite, compare:

- identical discovered file/test inventory;
- identical pass/fail/skip and snapshot outcomes on green and seeded-failure fixtures;
- a setup assertion that `process.versions.bun` is present in Modes B/C, preventing a nominal Bun
  command from following a package shebang back to Node;
- required coverage/report artifacts;
- p50 wall time and billed minutes across repeated clean/cache-hit runs;
- peak RSS, CPU time, flake/retry rate, and diagnostics quality.

Adopt a lane only when there is zero unexplained behavioral/gate drift and hosted p50 billed minutes
improve by at least 20%. The threshold is a roadmap decision criterion, not a claim about Bun's
measured performance in this repository.

**Proof:** checked-in benchmark manifest/results identify commit, Bun exact patch, Node/Vitest
versions, commands, inventories, environment, repetitions, and acceptance decision. One hosted
canary precedes required-check replacement.

### R5 — Incremental Bun migration, if earned

- Prefer Mode B for suites whose Vitest features are valuable but Node startup/runtime is the
  measured cost.
- Prefer Mode C for pure/unit suites whose imports, mocks, timers, snapshots, and reporters are
  proven compatible.
- Keep Vitest/Node for any lane where Bun changes semantics, loses a required artifact, or provides
  no material hosted saving.
- Pin the exact Bun 1.4 patch in setup actions, images, and lock/toolchain declarations. Upgrade by
  canary, not floating `latest`.

**Proof:** each migrated suite has a reversible workflow flag and side-by-side canary evidence;
rolling back restores the prior command without changing test files or accepted behavior.

### R6 — OpenRouter canary only after avoidable work is removed

Do not add OpenRouter to the first saving wave. Current Codex stages use ChatGPT/subscription auth,
so routing them through an API aggregator can create a new metered cost rather than reduce the
existing cash ledger. It also adds provider-origin, data-handling, tool-compatibility, rate-limit,
and structured-output variables before telemetry is reconciled.

If R1–R5 still show material model API spend in narrow phases, add one opt-in OpenRouter harness for
read-only, single-turn, schema-constrained work such as log classification or merge-scan triage:

- pin exact model and upstream provider; disable automatic provider/model substitution;
- record aggregator plus actual provider/model origin;
- no repository-write tools, credentials, deployment, or independent-review credit;
- compare schema-valid rate, false-negative/false-positive fixtures, latency, retries, and total
  price per accepted result against current Haiku/Luna/Codex route;
- fail closed and fall back once on a different approved provider only for an evidenced outage.

Promote only if quality gates are equal and total accepted-result cost is lower after retries. A
lower token price with more malformed or repeated outputs is not a saving.

## Definition of done

1. The merge-scan parse defect is deployed and one production sweep advances without the old
   uniform parse failure.
2. The board exposes attributable model and compute dimensions without mixing exact and estimated
   dollars.
3. Timeout/budget/infra exits preserve confirmed progress and never cause capability escalation.
4. Every changed workflow has a path/required-check matrix, stale-run cancellation behavior, and
   before/after hosted evidence.
5. Bun 1.4 appears explicitly in the roadmap and has a reproducible A/B/C benchmark before any
   required test lane changes.
6. Any migrated suite preserves discovery, outcomes, artifacts, seeded-failure detection, and
   rollback while meeting the adopted billed-minute threshold.
7. OpenRouter remains absent unless its canary proves lower total accepted-result cost and records
   actual provider origin.

## Out of scope

- Replacing all Vitest tests in one change.
- Disabling full/scheduled integration coverage to make PR numbers look smaller.
- Counting canceled, skipped, or missing required checks as a saving.
- Estimating subscription Codex dollars as though they were API invoice data.
- Letting an OpenRouter model satisfy provider-independent review without verified upstream origin.
- Weakening human approval, deployment verification, security, data, or migration gates.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Re-scope before approval: R0/R2/R3 already shipped (docs/ci-cost-and-bun-roadmap.md, cancel-in-progress, ci-scope.mjs lanes) and R4 started (bun-shadow.yml). Approving as written would re-authorize done work. Remaining: R1 telemetry record, R4 benchmark manifest + 20% decision, R5, R6.
