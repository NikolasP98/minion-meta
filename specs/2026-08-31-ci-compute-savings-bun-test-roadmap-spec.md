---
id: 2026-08-31-ci-compute-savings-bun-test-roadmap-spec
title: CI and Factory compute savings — attributable telemetry and Bun test adoption roadmap
stage: spec
status: draft
pass: 1
created: 2026-08-31
updated: 2026-08-31
proposal: 2026-08-22-ci-compute-savings-bun-test-roadmap
verdict: pending
repos: [minion-factory, minion-base, minion, minion_hub, minion_site, paperclip]
relationship: extends
related: [2026-08-17-factory-token-budget-governance-spec, 2026-08-18-ci-minion-ai-ci-spec, 2026-08-22-factory-lineage-orchestrator-instance-spec]
type: infra
tags: [infra, test]
---

# CI and Factory compute savings — attributable telemetry and Bun test adoption roadmap

## 0. Product

The approved proposal states the problem in the user's words:

> Figure out what's causing such a high cost in the CI/CD pipeline, apply the recommended savings,
> add Bun test to the roadmap, and consider OpenRouter if Haiku/Luna remain too expensive.

The product outcome is lower billed compute and model spend without weakening required tests,
independent review, deployment verification, or fail-closed budget gates. The proposal's
2026-08-28 audit is authoritative scope evidence: R0, R2, and R3 are already shipped; R4 has a Bun
shadow workflow but not a reproducible decision record. This spec therefore implements only the
remaining R1 telemetry, R4 benchmark/decision evidence, conditional R5 adoption, and conditional R6
OpenRouter canary. It does not authorize rebuilding shipped cancellation, path selection, cache,
resume, timeout, retry, or merge-scan work.

### Relationship classification

**Recommended relationship: `extends`.** The index search found adjacent shipped or implementing
contracts, but none supplies the remaining end-to-end telemetry plus multi-repository Bun decision
and guarded adoption. This recommendation does not change any related artifact's lifecycle.

- `2026-08-17-factory-token-budget-governance-spec` — extends its run-level `cost_usd`, Codex turn
  proxy, and `/budget` contract with phase-attributable model/test/runner facts; exact and proxy
  measures remain separate.
- `2026-08-18-ci-minion-ai-ci-spec` — extends its shipped gateway Node/Windows/Bun correctness
  matrix and existing Bun shadow lane with repeatable cost/equivalence evidence; it does not reopen
  that spec's completed correctness repairs.
- `2026-08-22-factory-lineage-orchestrator-instance-spec` — consumes its durable phase-attempt and
  provider-origin seams, while keeping test-runner and OpenRouter experimentation outside the
  orchestrator security boundary as that spec requires.

## 1. Problem and decision boundary

Factory recorded a real `$536.23` daily spend against a `$150` cap, but the current ledger cannot
reconcile where every model turn, runner minute, test retry, cache miss, or timeout was spent. Bun
1.4 has promising compatibility and resource claims, but a runtime release note and one green lane
are not repository-specific proof of behavioral equivalence or lower hosted billed minutes.

The public seams introduced here are:

1. a versioned, append-only `PhaseCostRecordV1` emitted once per completed phase attempt;
2. a checked-in `BunBenchmarkManifestV1` plus immutable result files for each candidate suite; and
3. an optional `ModelCanaryResultV1` used only when post-migration telemetry still justifies a
   narrow OpenRouter trial.

All three records bind evidence to repository, commit, command, toolchain, environment, attempt,
and timestamps. Missing data is `null` plus a closed reason enum; it is never converted to zero or
an invented dollar estimate.

## 2. AS-IS → TO-BE → DELTA

### 2.1 AS-IS — verified current behavior and known unknowns

1. `2026-08-17-factory-token-budget-governance-spec` anchors the current Factory seam:
   `agent/run.sh` and `agent/spec.sh` collect Claude `total_cost_usd`; `runner/src/db.ts` persists a
   nullable run-level `cost_usd`; Codex is represented by turn proxies because subscription-backed
   usage has no exact per-call dollar ledger. There is no reconciled phase record for harness,
   resolved upstream provider, reasoning effort, retry cause, test inventory, CPU/RSS, or cache
   result.
2. The durable execution path already has `phase_attempts` and `phase_effects` in
   `runner/src/db.ts`, and `runner/src/queue.ts` closes phase attempts. These are the authoritative
   attempt boundaries; a second telemetry lifecycle would create double counting.
3. `runner/src/index.ts` exposes Factory run/budget APIs consumed by minion-base. The existing
   budget surface reports aggregates, not attributable exact-versus-proxy dimensions or an
   explicit unattributed remainder.
4. The approved proposal's board audit records shipped R0/R2/R3 artifacts:
   `docs/ci-cost-and-bun-roadmap.md`, stale-run cancellation, `ci-scope.mjs` lane selection, and
   durable resume/timeout classification. Their exact live paths must be re-read at each repository
   head before implementation because the subproject checkouts were unavailable to this planning
   workspace.
5. The same audit records `.github/workflows/bun-shadow.yml` as started. The shipped gateway CI
   spec independently records a green DEV matrix containing Node shards, Windows shards, and a Bun
   shadow. No checked-in A/B/C manifest currently proves identical discovery, outcome, seeded
   failure detection, artifacts, p50 billed minutes, CPU/RSS, or runtime identity across repeated
   runs.
6. The gateway's safe local diagnostic is `pnpm vitest run test/ci/`; durable memory
   `/memory/MINION/MEMORY.md` links `gw-no-full-test-suite.md` with the hard constraint that
   `pnpm test` crashes the development box. Full gateway benchmarking therefore runs only on a
   disposable hosted runner, never on the shared development host.
7. Hub, site, and Paperclip are separate repositories with independent package managers and test
   contracts. Their current workflow/package files must be refreshed from their PR-base heads
   before S3; absent or renamed candidate files are a spec-drift stop, not permission to invent a
   command.
8. `/memory/MINION/factory-failed-runs-rootcause-2026-08-28.md` records `$486` over seven days and
   `$340` on failed runs, plus runner/resource and retry causes already repaired. This shapes the
   decision to measure accepted-result cost and retry attribution, not nominal token price or a
   single fast pass.

### 2.2 TO-BE — target behavior and invariants

1. Every completed Factory phase attempt has at most one `PhaseCostRecordV1`, keyed by attempt id.
   Duplicate finish/reconcile execution converges on the same record and cannot increase totals.
2. Run totals reconcile into exact API-dollar cost, subscription/proxy usage, and runner/test
   compute as separate dimensions. `unattributed_wall_ms` and unknown reason fields remain visible;
   exact and estimated dollars are never summed into one authoritative value.
3. Each retry or fallback carries exactly one closed reason enum. Timeout, budget cap, auth outage,
   canceled runner, killed test process, cache failure, and product/test failure cannot trigger a
   model capability escalation unless the existing policy separately classifies the failure as
   capability-shaped.
4. Benchmark Modes A (Node+Vitest), B (Bun-hosted Vitest), and C (native `bun test`) execute on the
   same immutable commit and pinned dependencies. Modes B/C assert `process.versions.bun`; a
   nominal Bun command that follows a shebang back to Node fails the benchmark.
5. A candidate suite is eligible only with identical discovered file/test inventory, pass/fail/skip
   and snapshot outcomes, required coverage/report artifacts, and seeded-failure detection. Any
   unexplained drift is a rejection regardless of speed.
6. Adoption additionally requires at least 20% improvement in hosted p50 billed minutes over at
   least five clean and five cache-hit paired repetitions, with no worse retry/flake rate. The 20%
   value is an approved decision threshold, not a claimed result.
7. Node+Vitest remains the reversible default for rejected or inconclusive suites. Each adopted
   lane has a one-variable rollback that restores the prior command without changing tests.
8. OpenRouter remains absent unless accepted-result telemetry after Bun decisions shows material
   remaining API-priced spend in a read-only, single-turn, schema-constrained phase. It cannot
   receive repository-write tools, credentials, deployment authority, or independent-review
   credit.
9. Shared gateway protocol, DB schema, auth, product runtime behavior, required-check names, and
   scheduled/full coverage remain unchanged.

### 2.3 DELTA — numbered transitions, slices, and proof

| # | Transition | Slice | Proving test/evidence |
|---|---|---|---|
| D1 | Coarse run totals become idempotent phase-attributable exact/proxy/compute records. | 1 | DB duplicate-close/crash tests plus one reconcile, one low-risk dev, and one test-heavy dev whose phase records reconcile to run totals with an explicit remainder. |
| D2 | Hidden cost dimensions become a typed API and board view without fabricated dollars. | 2 | API schema tests, board component tests, and fixtures for exact-only, proxy-only, mixed, and unattributed runs. |
| D3 | An ad hoc Bun shadow becomes a reproducible A/B/C gateway benchmark and decision. | 3 | Pinned manifest, runtime assertion, inventory/outcome/artifact comparator, seeded-failure fixture, and paired hosted result set. |
| D4 | Unmeasured hub/site/Paperclip assumptions become repository-specific benchmark decisions. | 4 | One manifest/result/decision per repository; incompatible modes are explicit rejections with evidence, not skipped rows. |
| D5 | Positive benchmark decisions become reversible canaries; negative/inconclusive decisions preserve Node+Vitest. | 5 | Required-check canary, rollback exercise, and post-canary full/scheduled gate for each adopted suite. |
| D6 | Optional cheaper routing becomes an evidence-gated, origin-pinned canary or remains absent. | 6 | Admission test refuses an ineligible phase; schema/quality/outage fixtures and accepted-result cost comparison prove promotion or a checked-in no-canary decision. |

## 3. Approach — vertical slices

Each slice is approximately 4–8 focused hours. A slice is independently reviewable and produces
behavioral evidence; no slice may claim savings from canceled, skipped, missing, or weakened gates.

### Slice 1 — emit one idempotent Factory phase-cost record

**Topics:** `infra`, `test`

Define `PhaseCostRecordV1` in a new pure module. Populate it from runner-observed phase boundaries,
harness output parsed as `unknown`, test command/result artifacts, container stats where available,
and cache signals. Close reason is a discriminated union. Store the record in an additive table
keyed uniquely by `phase_attempt_id`; insert/update and phase completion occur in one transaction,
or reconciliation fills the same key after a crash. Raw secrets, prompts, test stdout, and
repository content are not stored.

**Files to touch (minion-factory):** `runner/src/db.ts`; `runner/src/queue.ts`;
`agent/run.sh`; `agent/spec.sh`; new `runner/src/cost-telemetry.ts`; new
`runner/src/cost-telemetry.test.ts`; focused additions to `runner/src/db.test.ts` and
`runner/src/queue.test.ts`.

**Machine-checkable DoD:** focused tests prove one record after duplicate finish, crash before and
after the transaction, null-with-reason handling, mutually exclusive exact/proxy fields, closed
retry reasons, and `sum(phase wall) + unattributed = run wall` within a documented monotonic-clock
tolerance. Three fixture runs named in D1 reconcile without an unexplained negative remainder.

### Slice 2 — expose attributable cost without collapsing evidence classes

**Topics:** `infra`, `test`

Add a read-only Factory endpoint returning versioned run and aggregate telemetry. Extend the board's
existing Factory API adapter and stats surface to show model exact dollars, subscription turn/call
proxies, runner wall/CPU/RSS, test counts, cache outcomes, retry causes, and unattributed time as
separate labeled values. This slice does not estimate a Codex subscription dollar amount.

**Files to touch (minion-factory):** `runner/src/index.ts`; `runner/src/db.ts`; new
`runner/src/cost-telemetry-api.test.ts`.

**Files to touch (minion-base):** `src/lib/factory-api.ts`; `src/lib/factory-api.test.ts`;
`src/lib/components/StatsView.svelte`; `src/lib/components/StatsView.test.ts` (if the live head has
renamed either board file, stop for spec drift and amend this file list before coding).

**Machine-checkable DoD:** API and UI fixtures cover exact-only, proxy-only, mixed-provider,
cache-hit/miss, retry, and unknown records; no rendered aggregate adds proxy usage to exact dollars;
the endpoint total equals its returned phase rows; existing `/budget` contract tests remain green.

### Slice 3 — complete the gateway A/B/C benchmark decision

**Topics:** `infra`, `test`

Turn the existing Bun shadow into an evidence producer, not a required-check replacement. Pin the
exact Bun 1.4 patch, Node, pnpm, Vitest, lockfile hash, commit, runner image, CPU/RAM class, commands,
repetition count, and cache state. Start with pure unit suites; run the full gateway matrix only on
disposable hosted runners. Compare discovery and outcome records and inject a one-assertion seeded
failure without committing the mutation. Do not reopen correctness work already completed by
`2026-08-18-ci-minion-ai-ci-spec`.

**Files to touch (minion):** `.github/workflows/bun-shadow.yml`;
`.github/workflows/ci.yml` only to publish/call the shadow artifact without changing required-check
semantics; `package.json`; new `scripts/bun-benchmark.mjs`; new
`scripts/bun-benchmark.test.mjs`; new `test/ci/bun-runtime.test.ts`; new
`benchmarks/bun-test/manifest.json`; new `benchmarks/bun-test/decision.md`; generated immutable
result JSON files under `benchmarks/bun-test/results/`.

**Machine-checkable DoD:** the comparator rejects inventory drift, outcome drift, a missing report,
and a seeded failure that incorrectly passes; Modes B/C prove Bun runtime identity; five clean plus
five cache-hit paired hosted repetitions produce a p50 and flake/retry comparison; `decision.md`
records adopt/reject/inconclusive per suite using the invariant and 20% thresholds.

### Slice 4 — benchmark hub, site, and Paperclip without cross-repo inference

**Topics:** `infra`, `test`

Port the proven benchmark harness contract, not gateway-specific commands. At each PR-base head,
inventory actual package scripts and Vitest configuration before editing. Evaluate pure logic first,
then Svelte/DOM, fake timers, mocks, snapshots, coverage, database/native-addon, Playwright, and
worker/fork lanes separately. A repository with no compatible Mode C records `rejected` for Mode C;
it does not omit the mode or weaken tests.

**Files to touch (each of `minion_hub`, `minion_site`, `paperclip-minion`):** `package.json`; the
existing `vitest.config.*` file; new `.github/workflows/bun-shadow.yml`; new
`scripts/bun-benchmark.mjs`; new `scripts/bun-benchmark.test.mjs`; new
`benchmarks/bun-test/manifest.json`; new `benchmarks/bun-test/decision.md`; immutable result JSON
files under `benchmarks/bun-test/results/`. Lockfiles change only if pinning the approved exact Bun
or harness dependency requires it.

**Machine-checkable DoD:** all three repositories produce schema-valid decisions with identical
inventory/outcome/artifact and seeded-failure checks; each has five clean plus five cache-hit paired
hosted repetitions for every eligible mode; full existing repository tests/checks remain green;
no decision cites another repository's result as its own proof.

### Slice 5 — canary only suites that earned adoption

**Topics:** `infra`, `test`

For each `adopt` decision, add a non-required hosted canary using Mode B or C exactly as recorded,
then promote it behind `BUN_TEST_MODE=node-vitest|bun-vitest|bun-native`. Keep the prior command in
the same workflow and exercise rollback. A suite marked `reject` or `inconclusive` receives no test
command change. Pin the same exact Bun patch in local tool declarations and hosted setup.

**Files to touch:** only the adopting repository's existing `.github/workflows/ci.yml` (or its
current required-test workflow), `package.json`, toolchain declaration, lockfile if required, and
`benchmarks/bun-test/decision.md`. No test source file is authorized in this slice.

**Machine-checkable DoD:** canary and current lane run side-by-side on the same SHA; required-check
names and branch protection inputs do not disappear; switching `BUN_TEST_MODE=node-vitest`
restores the previous command; a scheduled/full gate passes after promotion; hosted metadata
confirms the accepted p50 improvement persists.

### Slice 6 — make an explicit OpenRouter no-go or bounded canary decision

**Topics:** `infra`, `test`

Query S1/S2 evidence after S3–S5. If no material API-priced spend remains in an eligible narrow
phase, check in a no-canary decision and stop. Otherwise add one opt-in, read-only, single-turn,
schema-constrained classifier. Pin exact model and actual upstream provider; disable automatic
provider/model substitution; record aggregator and resolved origin. It gets no checkout write,
GitHub, deployment, production-data, or independent-review capability. One evidenced outage may
fall back once to a separately approved provider; malformed output is a failed accepted result and
counts in cost.

**Files to touch (no-canary path, minion-factory):** new
`docs/openrouter-cost-canary-decision.md` only.

**Files to touch (eligible-canary path, minion-factory):** new
`runner/src/model-cost-canary.ts`; new `runner/src/model-cost-canary.test.ts`;
`runner/src/providers.ts`; `runner/src/queue.ts`; `.env.example`; new
`docs/openrouter-cost-canary-decision.md`. Do not add OpenRouter to develop, review, deploy, or
orchestrator parent profiles.

**Machine-checkable DoD:** the decision cites telemetry query/results; admission rejects tools,
writes, ineligible phases, dynamic provider substitution, and same-origin independence claims;
fixed positive/negative/malformed/outage fixtures compare schema-valid rate, classification error,
latency, retries, and total price per accepted result. Promotion requires equal quality and lower
accepted-result cost; otherwise the flag remains off and existing routing is unchanged.

## 4. Cross-repository impact assessment

| Impact zone | Assessment and mitigation |
|---|---|
| Gateway protocol / shared packages | No frame, event, API-client package, or generated protocol change. If implementation discovers one is required, stop: hub, site, and Paperclip consumers would enter scope and this spec needs revision. |
| Database / migrations | Factory-only additive telemetry persistence. No tenant DB, Turso, hub/site schema, or migration. Duplicate execution converges on the unique phase-attempt key; upgrade tests cover existing DBs. |
| Auth / secrets | Existing auth is unchanged. Optional OpenRouter key is runner-owned, never emitted to telemetry or mounted into test/review/deploy workers. Provider origin is metadata, not authorization. |
| CI required checks | Shadow jobs begin non-required. Promotion preserves check names and full/scheduled coverage; path-selection and cancellation logic already shipped and is not edited except for artifact wiring. |
| Test semantics | Discovery, outcomes, snapshots, coverage/reports, and seeded-failure detection must match. No blanket skip, `continue-on-error`, assertion deletion, or test-source rewrite in the adoption slice. |
| Deployment | Workflow-only changes can alter release gates. Every adoption includes a one-variable rollback and a post-canary scheduled/full run before any required lane changes. |
| Generated artifacts | Benchmark result JSON is generated but committed immutably with manifest hashes; the comparator rejects a result from a different commit/toolchain/environment. |
| Independent review | OpenRouter aggregator identity never grants independence. Resolved upstream origin/group remains governed by the lineage/release specs. |

Unavoidable alert: Slices 3–5 touch independent repositories and therefore require separate
slice-scoped branches/PRs and each repository's own instructions. A single cross-repository commit
or one repository's benchmark used as proof for another is invalid.

## 5. Explicit out-of-scope

- Rebuilding the shipped merge-scan parser, durable resume, timeout classification, path selector,
  caches, concurrency cancellation, worker sizing, or retry fixes.
- Replacing every Vitest test or standardizing all repositories on one runner.
- Changing test assertions or product behavior merely to make Bun pass.
- Running `pnpm test` for the gateway on the shared development box.
- Disabling full/scheduled integration, browser, database, native-addon, or release coverage.
- Counting canceled, skipped, or missing required checks as savings.
- Estimating subscription-backed Codex dollars as API invoice data.
- Routing write-capable development, review, deployment, secrets, or production data through the
  optional OpenRouter canary.
- Granting independent-review credit based on an aggregator label.
- UI redesign, gateway protocol changes, hub/site auth changes, or tenant database changes.

## 6. End-to-end verification

Run this sequence on immutable SHAs after all applicable slices land:

1. Execute duplicate-close and crash-point Factory fixtures. Query the telemetry endpoint and prove
   one phase record per attempt, one closed retry reason, separated exact/proxy measures, and an
   explicit wall-time remainder for one reconcile, one low-risk dev, and one test-heavy dev.
2. Load the same records in minion-base and prove exact-only, proxy-only, cache, retry, and unknown
   values render without dollar conflation or missing-state ambiguity.
3. Validate every `BunBenchmarkManifestV1` and result hash. For gateway, hub, site, and Paperclip,
   run Modes A/B/C where eligible on the same SHA; verify runtime identity, inventories, outcomes,
   snapshots, artifacts, seeded-failure detection, five clean and five cache-hit pairs, p50 billed
   minutes, CPU/RSS, and retry/flake results.
4. For each adopted suite, run current and canary lanes side-by-side, flip to Bun, then flip back to
   Node+Vitest and prove the prior command and required-check name return unchanged. Run the full or
   scheduled contract after the canary.
5. Confirm rejected/inconclusive suites retain their original commands and that no skipped-test or
   required-check count regressed anywhere.
6. Evaluate the OpenRouter admission query. Either verify a checked-in no-canary decision, or run
   the fixed classifier corpus and prove provider pinning, no tools/credentials, schema/quality
   parity, outage behavior, and lower total cost per accepted result after retries. Confirm it has
   no independent-review credit.
7. Compare hosted billing metadata before/after using the same path class and cache state. Report
   savings only where required work and behavior remained equivalent; report all other results as
   rejected or inconclusive.

The roadmap is complete when telemetry reconciles, every target repository has a reproducible Bun
decision, every adoption is reversible and proven in hosted CI, and OpenRouter is either explicitly
rejected by evidence or confined to the accepted canary contract.
