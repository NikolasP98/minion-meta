# Feature Specification: Reproducible agent evaluation and gated inference

**Feature Branch**: `feature/agent-harness-f-evals` (meta)

**Created**: 2026-10-23

**Status**: Review pending; approved parent requirements, implementation refinement awaiting two independent passes.

**Input**: Owner: “batch their implementations in 1 PR per group … Run autonomously.” F batches parent Slices 26–29, 31 and the evaluation portion of 30 in one meta PR. The [approved parent](../2026-10-22-agent-harness-reliability-and-proactivity-spec.md), especially §§4.2, 8, 9 and 11, is normative. A owns required Hub fixture code; C owns production watcher Slice 30. Six PRs total. No extra repository or patch-only deliverable is added.

## 0. Product

Operators need evidence that an agent finishes authorized tasks at acceptable total cost. The runner must measure complete trajectories, preserve missing/unknown evidence, and support an explicit live-inference path whose tools remain disposable fixtures. It must not approve its own spending or promote a model/policy.

## AS-IS

Meta pin `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`, branch `feature/agent-harness-f-evals`, PR base `dev`.

| Anchor | Verified current state | Delta |
|---|---|---|
| Parent `specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md:534–590,610–644` | Runner/corpus/report/screen/live-provider paths and acceptance are planned. | Create the executable software; historical prose is not existing software. |
| `audits/2026-10-22-agent-use-transcripts/spec/pass2-router.md:22–26,54–62` | Independent review explicitly required valid-manifest live path tested with stubs. | Parser-only or always-reject-live implementation cannot satisfy A31. |
| `scripts/agent-evals/` and `audits/2026-10-22-agent-use-transcripts/spec/fixtures/` | Absent at source pin. | Add real modules, tests, small synthetic corpus/manifests and operator protocol. |
| Hub `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`, `tests/fixtures/critical-journeys/{README.md,gateway-transport.ts,build.mjs}` | Installed components/gateway use synthetic identity/HTTP/WS with denied unknown calls. | Consume A's versioned adapter; do not substitute hand-reimplemented context/routing. |
| Root `package.json:22–37` | `test:scripts` only selects `scripts/*.test.mjs`. | Add an explicit agent-evals test entry/CI inclusion; nested tests must actually run. |

The prior router/filter reports are historical hypotheses, not current runtime frequency or model-quality results. C revalidates and implements watcher eligibility/census/shadow seams; F imports its versioned receipts and never infers source certification from caller strings. Later WhatsApp delegation changes grant no evaluation authority.

## TO-BE

Operators can run reproducible three-arm fixture trajectories, validate corpus readiness and inspect complete-cost outcome/screening reports. The actual live inference transport admits only independently approved bounded requests while all tools stay on disposable fixtures. C-owned complaint receipts are validated offline; reports never activate a gate or authorize spending.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run matched disposable trajectories with complete receipts (Priority: P1)

An operator runs three arms over the same frozen episodes without external network or production effects by default.

**Independent Test**: Spawn the real runner CLI and A fixture adapter, inspect append-only events/receipts and injected missing/duplicate receipt outcomes.

**Acceptance Scenarios**:

1. Default fixture mode denies external network. Full context, current Jev routing and deterministic core plus existing discovery start from identical state and use the same model/tool/data fixture revision; seeded arm order is recorded.
2. A user request plus explicit callback/follow-up/retry carries episode/root/submission/attempt relations. Duplicate event IDs dedupe; missing expected receipts make completion inconclusive instead of success.
3. Zero live budget blocks network but permits synthetic software tests. Each run freezes source/lock/adapter/model/question/gate/rubric hashes and records cancel/unknown outcomes.

### User Story 2 - Govern a bilingual corpus without holdout leakage (Priority: P1)

A reviewer imports source-truth-backed labels and can see whether the full evaluation corpus is ready.

**Independent Test**: Validate small bilingual/compaction examples and adversarial corpus imports without invoking a model.

**Acceptance Scenarios**:

1. Missing truth, permissions, receipt expectations, terminal criterion or maximum effort rejects an episode. Duplicate episode/lineage/content leakage across splits rejects.
2. Development commands cannot read holdout episode bodies or labels; a held-out run requires the frozen split and explicit authorized unblinding mode. Candidate tuning never silently reuses the holdout.
3. Readiness counts independently human-adjudicated labels, families, languages and consequential actions. Small fixture examples demonstrate software but do not claim the governed target of 60 development + 240 held-out episodes, twelve families or at least 40 consequential-action episodes has been produced.

### User Story 3 - Compare complete task outcomes and screening value (Priority: P1)

An operator sees reproducible uncertainty and failure vetoes before considering a later promotion decision.

**Independent Test**: Seeded synthetic joined runs exercise exact ratio arithmetic, paired bootstrap, drift cohorts, receipt faults and independent trace labels.

**Acceptance Scenarios**:

1. Candidate cost includes failed/canceled/indeterminate attempts. A cheaper but less successful candidate can fail cost per success. Zero successes, incomplete/unbounded bills, drift or insufficient power prevent promotion.
2. Ten thousand seeded matched-episode cluster bootstrap draws recompute total-cost/success ratios, success differences and p95 latency ratios. Repeated runs remain in their episode cluster; declared stopping/expansion metadata is present.
3. An authority/scope/duplicate/post-cancel critical violation vetoes averages. Deterministic receipt faults run before semantic screening; semantic abstain remains a separate outcome.
4. At a fixed review budget, prioritized screening retains seeded apparently-good controls with explicit selection probabilities; weighted misses and uncertainty are reported against labels hidden from the screener. No screening result changes output, billing or release state.

### User Story 4 - Validate a complete bounded live adapter with stub transport (Priority: P1)

An operator can prove the software path admits only separately approved bounded inference, while still using the disposable fixture tools.

**Independent Test**: Invoke the live CLI with a valid test-only trusted attestation and stub transport, then inject response loss/crash/budget/model drift and compare durable admission/receipt logs.

**Acceptance Scenarios**:

1. `--live`, an immutable manifest and a valid separate trusted approval are all required. A manifest's own `approved` value/key/reference cannot authorize it. Missing/expired approval, unknown price/exposure, exhausted limits, fixture/source/model drift or ambiguous prior spend dispatches zero provider requests.
2. Each provider attempt reserves worst-case bounded exposure durably before dispatch and writes received/terminal or unknown evidence. Timeout/cancel/lost response after admission never permits automatic replay. SDK retry/fallback is disabled.
3. The same live path used operationally reaches a stub provider and exercises request shaping, endpoint allowlist, reply parsing, receipt persistence and budget settlement. A separate fake-live implementation cannot qualify it.
4. Tools remain marked disposable fixtures in live mode. Production credentials/endpoints are never discovered/inferred; provider credentials are explicitly supplied to the invocation and never persisted. No actual paid request is run in implementation/CI.

### User Story 5 - Report the conditional complaint census without activating it (Priority: P2)

An operator imports C's certified default-policy census/shadow receipts and receives a qualified pilot/no-pilot result.

**Independent Test**: Consume C-produced fixtures against its exact pinned schema with custom/idless/drift, timeout, zero-eligible and cost-coverage cases.

**Acceptance Scenarios**:

1. Only default-policy + certified authoritative source + qualified model cohorts enter the denominator. Custom/idless/drift records remain baseline-only; no eligible traffic yields “do not pilot.”
2. A shadow case must contain a baseline attempt regardless of gate result. Timeout/abstain/unavailable is never a negative. Actual shadow costs include all gate, baseline, suggestion and retry attempts per logical source unit. Counterfactual forwarded-subset costs are reported separately with assumptions.
3. Missing frozen development-selected threshold or severity-specific miss bounds/control sample metadata blocks held-out/promotion conclusions. C alone owns runtime gate behavior; F never activates a gate or suppresses delivery.

### Edge Cases

Crash between durable admission and dispatch is conservatively unknown. Crash after response persistence resumes analysis/materialization without a provider recall. Zero successes means undefined cost per success, not zero. Missing paired arms and conflicting duplicate records lower coverage/quarantine. Upper exposure is not invented from mean token usage. UTC rollover carries outstanding reservations; a new run ID cannot reset a daily approval budget. Split aliases/translated variants retain the same leakage group. Screen abstention, unknown ground truth and unlabeled controls are not negatives. Model aliases drifting to another resolved identity invalidate the cohort. Deletion of raw payload does not erase unresolved paid admission identities.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 / A26**: Default fixture runner, three identical-state arms, randomized recorded order, actual A adapter, append-only `events.jsonl`/`receipts.jsonl`, explicit joins and missing-receipt coverage; fixture network denied.
- **FR-002 / A26,A31**: Validate immutable complete manifests, source/lock/model/tool/data/question/gate/rubric/split revisions, scope/side effects, per-call/run/day caps, retention/stop rules and separate approval; reject missing/zero/unknown live exposure before dispatch.
- **FR-003 / A27**: Strict episode/label/split schema, import/validate/readiness commands, duplicate-leakage and development holdout boundary, bilingual twelve-family/compaction representation in examples; report human-label readiness without fabricating 300 episodes.
- **FR-004 / A28**: Deterministic receipt-based terminal scoring and independent rubric labels; cost of all attempts, unknown exposure/coverage, drift-separated cohorts and 10,000 seeded paired episode-cluster bootstrap draws.
- **FR-005 / A28**: Preserve parent promotion criteria: zero additional critical actions; success-difference 95% lower bound ≥−0.02; cost-per-success ratio 95% upper bound <1; p95 latency ratio ≤1.10 under the prespecified paired procedure. Missing/underpowered/zero-success/unbounded cohorts stay inconclusive, baseline retained.
- **FR-006 / A29**: Deterministic fault screening first, typed independent semantic outcomes/abstention, hidden independent labels, fixed-budget prioritized/random control comparison, weighted misses/uncertainty and severity miss-bound metadata. No billing/release authority.
- **FR-007 / A30-F**: Validate/import C's exact pinned ComplaintEvaluationRecordV1 schema and certified logical-source census/shadow receipts, reconciling monotonic receiptRevision and actual versus counterfactual costs and report eligibility/baseline completeness, costs and frozen severity/threshold gates; no eligible traffic stops the pilot recommendation.
- **FR-008 / A31**: Implement the actual live inference adapter behind explicit selection and independently trusted approval, allowlisted provider transport, durable pre-dispatch reservations and terminal/unknown receipts; disable retries/fallback and automatic ambiguous replay; enforce known input/output exposure bounds.
- **FR-009 / A31**: Reuse A's disposable tools in both modes; explicitly supplied provider credentials only, no production QA/business endpoints or credential discovery. Valid live path is tested with stub transport and zero paid calls.
- **FR-010 / A26–A31**: Keep stable run/approval budget identity, crash/cancel/retention semantics and replay tombstones. New run/policy/day cannot erase unresolved exposure. Register nested tests in executed CI; record all source/lock/test evidence and separate software qualification from corpus, paid, promotion and release operations.

### Key Entities *(include if feature involves data)*

Manifest/approval attestation; episode/split/label; run/arm/attempt; immutable tool/domain receipt; exposure reservation; terminal task outcome; drift cohort; trace-screen selection; certified complaint source record. [Data/CLI/approval contracts](contracts/evaluation.md) specify exact fields and transitions; [A/F adapter](../105-harness-chat/contracts/eval-adapter.md) defines the only Hub bridge.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Fixture smoke completes three arms with identical reset hashes and zero external requests, and injected missing/duplicate/forged evidence cannot become complete success.
- **SC-002**: Corpus validation rejects all specified leakage/label/permission omissions; readiness reports actual counts and clearly distinguishes synthetic examples from human-adjudicated corpus.
- **SC-003**: Same inputs/seed yield byte-stable analysis excluding explicit generation timestamps; all critical veto, cost-per-success, unknown, zero-success and drift counterexamples return the required nonpromotion outcome.
- **SC-004**: A valid live test attestation reaches the actual provider adapter stub; every rejection case makes zero requests and every attempted request has a durable reservation and terminal/unknown receipt.
- **SC-005**: Screening and complaint fixtures preserve abstention, controls, weighted denominators and baseline work; missing pre-registration or zero eligible traffic cannot recommend activation.

## DELTA and verification

| Delta | Acceptance | Scope and proof |
|---|---|---|
| D-F1 | A26 | runner/manifest/adapter contract; actual CLI and A fixture smoke |
| D-F2 | A27 | corpus schema/import/readiness; negative imports/split access tests |
| D-F3 | A28 | exact scoring/economics/bootstrap; seeded independent counterexamples |
| D-F4 | A29 | screening experiment; hidden labels, sampled controls and weighting tests |
| D-F5 | A30-F | versioned C receipt import and report; runtime producer tested in C |
| D-F6 | A31 | live adapter and durable budget; actual live CLI with provider stub |

[Plan](plan.md), [tasks](tasks.md) and [quickstart](contracts/quickstart.md) define commands. The common manifest and actual runtime seam are tested, not only pure helper mirrors. Full held-out quality and live provider integration remain separately governed evidence classes.

## Assumptions

The owner explicitly overrides one-PR-per-slice with one F PR and six PRs total. Node ≥22 and root pnpm are already declared. A delivers the only Hub adapter and event schema; C delivers runtime complaint exports; Factory and digest are not prerequisites for the basic runner. Optional Pulse feedback import may use E's Slice25 export only when enabled and version compatible; absence does not block A26/A29. A detached local approval attestation verified with built-in crypto is a narrow trust boundary, not an approval service: trusted public key/owner reference is explicitly configured outside the manifest/run output; no minting CLI is included. Tests use test-only signing material. Maximum effort, price/input/output bounds and review budgets are operator-approved manifest values; unknown values fail closed rather than silently becoming defaults.

## Out-of-scope

No paid execution in this batch, automatic promotion, production business tools, production credential discovery, 300-episode human labeling operation, new QA authority system, automatic learned weights, new continuation-state engine, external flow certification, WhatsApp activation or engine P1–P4 implementation.
