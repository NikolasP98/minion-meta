# Feature Specification: Bounded Factory Jev admission and deadlines

**Feature Branch**: `feature/agent-harness-b-factory` (Factory code); `feature/agent-harness-f-evals` (meta artifacts)
**Created**: 2026-10-23
**Status**: Approved for development after two independent Astra technical passes; owner implementation authorization inherited.
**Input**: Finish approved parent slices 8–9 as one Factory PR, preserving merged slices 6–7.

The [approved parent](../2026-10-22-agent-harness-reliability-and-proactivity-spec.md) §§5, 8, 10–12 remains normative. This refinement adds concrete caller and test boundaries. The owner explicitly authorized one PR per group, overriding Constitution III's one-slice-per-PR packaging only. Human merge, deployment and paid-operation gates remain. No engine P1–P4 redesign is included.

## User Scenarios & Testing

### User Story 1 - Keep a run within admitted work limits (Priority: P1)

An operator can revoke or replace a run capability without resetting its decision allowance or hiding an uncertain bill.

**Why this priority**: Concurrent requests and token rotation currently defeat the intended run bound.
**Independent Test**: A local provider counts requests while two callers compete for the last allowance, then the token is replaced during a blocked response.

**Acceptance Scenarios**:

1. Given `max_calls=1`, when simultaneous valid requests arrive, then exactly one upstream inference is admitted; a busy denial consumes no additional inference and cannot later become an implicit retry.
2. Given an admitted call, when the token is revoked/reminted or expires, then settlement occurs once by attempt identity against the same run ledger; no reset creates a fresh allowance.
3. Given a possibly dispatched call with unknown cost, when another request arrives, then `cost_unknown` denies admission; known zero cost is distinguished from missing cost.
4. Given repeated malformed bodies, when the run has exhausted its bounded abuse allowance, then later malformed bodies do not grow the counter beyond its cap or dispatch inference.
5. Given failed direct/proxy shell receipts, when run accounting is read, then known failure spend is included once and unknown coverage remains explicit.

### User Story 2 - Finish guard decisions inside the hook deadline (Priority: P1)

An operator gets deterministic guard denial immediately and a bounded semantic decision even when a proxy or provider stalls.

**Independent Test**: Run the installed pinned harness hook against local stalled-header/body proxies with provider credentials absent.

**Acceptance Scenarios**:

1. Given a deterministic floor violation, when the guard runs in enforce mode, then denial is printed before any network activity.
2. Given the six-second hook budget, when semantic preparation, proxy admission, response headers or response body stall, then the semantic path uses at most four seconds total and returns before the six-second outer hook budget.
3. Given a caller disconnect, when upstream work may already exist, then cancellation propagates while the run retains its uncertain cost fence.
4. Given legacy three-argument shell callers or callers with no explicit remaining budget, when a decision is requested, then their existing call shape and general timeout ceiling continue to work.

### Edge Cases

Expired, negative, non-finite or excessive duration; disconnect before body parse versus after request dispatch; normal request-body completion must not abort a healthy response; HTTP error with known usage; malformed successful response with known usage; aborted body stream; duplicate settlement; token rotated during validation; revoked caller with late known response; fractional/invalid cap configuration; run lifetime expiry with unresolved exposure; duplicate authoritative and comparison records; direct host calls without a run identity.

## Requirements

### AS-IS

Verified at Factory `5e28c7ae8c2bc9a7e2fef1da052f0ae2fbe86810`:

| Anchor | Current observable source behavior |
|---|---|
| `runner/src/jev-proxy.ts:49–69,187–243` | Counters live on token entries, mint resets them, budget check precedes await and call increment follows it. Unknown cost is estimated from input tokens. |
| `runner/src/queue.ts:566,3291,3353,4961`; `queue-retirement.ts:90` | Launch mints capability; terminal/retirement paths revoke it. Rotation and expiry must remain authority operations. |
| `runner/src/jev.ts:273–350` | Version 2 identity and failure usage are already present. Fetch has its own timeout; route signal/remaining duration are absent. |
| `runner/src/index.ts:1168–1171` | HTTP route awaits proxy without disconnect lifetime. |
| `agent/lib/jev.sh:138–180,188–202,255–276` | Legacy call normalization is supported; direct default is 20s and proxy default 25s; hook's direct timeout does not bound proxy preparation/request. |
| `agent/hooks/jev-guard.sh:513–552`; `agent/hooks/claude-settings.json:10` | Immediate floor denial exists; hook declares 6s and passes a default 4s direct timeout only. |
| `agent/lib/cost.sh:19–32`; `runner/src/stats.ts:25–39` | Numeric subtotal scans success files; failed/unknown receipts need qualified coverage. Slice 6 handoff explicitly assigns this seam to Slice 8. |

### TO-BE functional requirements

- **FR-B01 / A08**: Run-scoped admission MUST be synchronous before the first asynchronous boundary, with one in-flight upstream call, capped malformed debit and no counter reset on token lifecycle changes.
- **FR-B02 / A08**: Every admitted attempt MUST settle at most once. Possible dispatch without known complete spend MUST fence later run admission. Expiry MUST NOT free unresolved exposure; restart invalidates old capabilities and introduces no replay/resume promise.
- **FR-B03 / A08**: Known billed subtotal, unknown exposure and dispatched inference count MUST remain distinct. Existing v2 authoritative identities and slice 7 reconciliation MUST survive; comparison rows MUST NOT add a second bill.
- **FR-B04 / A09**: The hook MUST retain its six-second outer budget and immediate floor denial; its semantic path MUST use at most four seconds for preparation plus request. Remaining duration and cancellation MUST reach proxy fetch and body consumption.
- **FR-B05 / A09**: Direct shell, proxy shell and direct runner deadline paths MUST be tested. Legacy three-argument calls MUST work, and unbudgeted general calls MUST retain existing configured upper timeout behavior.
- **FR-B06 / A08/A09**: Auth, token privacy, site allowlists and fallback behavior MUST remain; denied/unknown advisory work MUST NOT block baseline execution or disable deterministic denial.

### Key Entities

A capability grants temporary authority to one run. A run ledger owns cumulative debit, known spend, reserved exposure and at most one unsettled attempt. An attempt records dispatch certainty and settlement identity. A duration budget is remaining local time, not trusted client wall clock. A cost coverage record distinguishes complete known cost from an unresolved bill.

### DELTA and acceptance trace

| Acceptance | Transition | Proof | Tasks |
|---|---|---|---|
| A08 | Token-owned counters → retained run ledger and bounded accounting | `jev-proxy.test.ts`, `cost.test.sh`, accounting regression | T003–T008 |
| A09 | Independent long waits → propagated duration/abort and independently bounded hook | `jev-deadline.test.ts`, `jev.test.sh`, `jev-guard.deadline.test.sh`, pinned harness proof | T009–T013 |

## Success Criteria

- **SC-B01**: Concurrent cap-one tests, rotation and expiry cases admit exactly one inference and never convert unknown spend to zero.
- **SC-B02**: All tested stalls return within four seconds of semantic-path start and before six seconds of hook start; deterministic floor cases make zero requests.
- **SC-B03**: Duplicate representations of a failed or successful attempt add one known bill; missing bills visibly make coverage incomplete.
- **SC-B04**: Source, lockfile, installed tool versions, focused tests, repository gates and independent Standards/Spec review are recorded separately from release evidence.

## Assumptions

The current single-runner capability model remains. `shortcut:` run ledgers are process-local; a distributed limiter requires a separate reviewed multi-runner need. No live remint-resume protocol survives a runner restart. Direct host calls with no run capability remain governed by their existing host/rate policy and are not claimed as run-cap qualified. No new acting mode is enabled. Merge into `dev` invokes the existing Factory promotion machinery; only the owner may authorize that consequential release.
