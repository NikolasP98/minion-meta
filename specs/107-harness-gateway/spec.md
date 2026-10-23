# Feature Specification: Gateway watcher receipts, usage and target binding

**Feature Branch**: `feature/agent-harness-c-gateway`; meta artifacts on `feature/agent-harness-f-evals`
**Created**: 2026-10-23
**Status**: Review; owner implementation authorization inherited; two independent technical reviews pending.
**Input**: Approved slices 11–16, Gateway portion of 20, and Gateway portion of 30 in one Gateway PR.

The [approved parent](../2026-10-22-agent-harness-reliability-and-proactivity-spec.md) §§6, 7.1, 8–12 remains normative. One group PR is the owner's explicit packaging exception to Constitution III. Gateway owns shared A20/A30 code because Hub/meta PRs cannot change its repository. Group D owns Hub approval/dispatch; group F owns evaluation reports. Full acceptance is joint, with precise seams below. Paid holdout, active classifier changes, merge and deployment retain their human gates. This refines the current watcher and queue; engine P1–P4 and a new workflow framework are excluded.

## User Scenarios & Testing

### User Story 1 - Classify the intended original message once (Priority: P1)

A subscribed user receives a classification of their original message; another chat's equal message ID or a batched neighbor cannot replace it.

**Independent Test**: Drive both actual plugin hooks with certified Telegram constituent fixtures and a temporary SQLite database.

**Acceptance Scenarios**:

1. Given equal provider IDs in different chats, when both arrive, then both are admitted; given two hook representations of one source/policy, only one admission exists.
2. Given a debounced batch, when received hook fires, then each ordered original unit is matched separately using its exact source text.
3. Given a redelivery after policy/model change, then it resumes its pinned input/policy; changed bytes under the same immutable source ID conflict. Verified provider edit revision or explicit authorized reevaluation creates a distinct linked admission.
4. Given missing/unqualified provenance or a manual/flow RPC, then baseline invocation remains available, uses fresh identity and cannot suppress other sources or enter the complaint experiment.

### User Story 2 - Recover classification and delivery without duplicate effects (Priority: P1)

An operator can restart the watcher and inspect a durable completed, failed or indeterminate outcome without silently repeating a possibly accepted classifier or delivery call.

**Independent Test**: Child processes open one real alerts.db and queue directory; kill/restart at every provider/suggestion/recipient boundary and count loopback stub invocations.

**Acceptance Scenarios**:

1. Given one queued source, when two processes claim it, then one lease generation owns dispatch. Expired admitted work becomes indeterminate; received work resumes local processing without another classifier call.
2. Given a valid positive with an uncertain suggestion request, then recovery uses explicit unavailable suggestions and still publishes the positive alert without another suggestion call.
3. Given two recipients and success at one, when the other fails or process restarts, then the confirmed recipient never receives a second send. Cooldown is stamped once at the first confirmed sent receipt.
4. Given SQLite admission but missing/mismatched queue evidence, then the recipient becomes indeterminate rather than recreated. Queue terminal evidence survives until SQLite settlement.
5. Given expired private payloads, then payload copies are erased within the retention policy while minimal replay tombstones remain; old events cannot recreate inference or delivery. Legacy pending alerts stay visible as `legacy_unreconciled` and do not automatically fan out.

### User Story 3 - Attribute each invocation to its actual result (Priority: P1)

An operator sees actual resolved model and supplied usage for each classifier/suggestion call, with unknown or incomplete cost stated explicitly.

**Independent Test**: Overlap classifier/suggestion A/B, force fallback A→B and malformed SDK results; compare emitted usage with installed Drone 0.6.0 terminal results.

**Acceptance Scenarios**:

1. Given opted-in successful runs, each emits one final usage record from its returned resolved model; host-inferred usage is suppressed only for that run.
2. Given SDK failure or fallback without earlier-attempt usage, retain supplied usage and unknown/incomplete coverage; do not price all attempts as the final model.
3. Given an unopted host caller, preserve its existing public signatures and lifecycle/usage behavior.

### User Story 4 - Keep scheduled work bound to its explicit owner (Priority: P1)

A Pulse approval targets the approving profile's personal agent and origin session on the selected gateway, and cannot fall back to another agent after deletion.

**Independent Test**: Actual cron add/update/store/execution path with two configured agents and no provider calls.

**Acceptance Scenarios**:

1. Explicit nonempty unknown/deleted agent rejects at admission and execution; a cross-agent/global explicit origin session rejects rather than rewriting to main.
2. Omitted agent ID retains general-cron default behavior. Valid isolated work retains isolated execution session in the same agent namespace and its validated origin binding.
3. Pulse's `scope:session`, explicit agent/session and `delivery.mode:none` produce no automatic announcement. Hub activation requires exact gateway qualification evidence; scheduling receipt is not execution evidence.

### User Story 5 - Measure eligible complaint traffic before experimentation (Priority: P2)

An evaluator can count qualified logical events and run a disabled-by-default stub shadow adapter without changing baseline classification or delivery.

**Independent Test**: Default-policy/certified and custom/idless/model-drift fixtures, with network denied and synthetic gate outcomes.

**Acceptance Scenarios**:

1. Only certified-source/default-effective-policy/model-revision matches are eligible. No eligible traffic returns a stop decision, not an activation request.
2. Every shadow case still executes baseline; timeout/abstention never become a negative classification.
3. Gate, forwarded baseline, retry and unknown bills use one logical-source denominator and export separate model/policy cohorts. Active promotion remains disabled without the parent experiment protocol and separate paid authorization.

### Edge Cases

Old queue entry, partial provider acceptance, filesystem fsync failure, received result with schema error, expired lease with late result, policy revoke during awaits, same text/different source, media-only source, two subscriptions to one watcher, forged receipt ID, changed recipients after first admission, missing account authority, provider edit without certified revision, queue recovery after payload redaction, missing canonical origin session, cron update changing agent only, and SDK credential fallback differing from terminal execution model.

## Requirements

### AS-IS

Verified Gateway base `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`:

| Anchor | Current behavior |
|---|---|
| `src/plugins/types/hooks.ts:190–216`; Telegram `inbound-provenance.ts`; dispatch `:284` | Optional canonical source carrier and ordered Telegram producers are merged slice 10. |
| Watcher `index.ts:637–651,861–877`; `src/dedup.ts:51–61` | Watcher still marks raw IDs/content before classification and received adapter reads wrong context/event fields. |
| Watcher `index.ts:274–320,781–816`; `src/destinations.ts:41–79` | Boot retries all destinations for old pending rows; direct fan-out has no recipient receipt protocol. |
| Watcher `src/store.ts:4–58` | Existing alerts.db contains complaints and notification attempt count, without classification leases or recipient receipt tables. |
| `src/drones/host.ts:30–39,83–112`; watcher `index.ts:106` | Shared watcher host emits usage from last key lookup, not final model. |
| Installed Drone `dist/types.d.ts:95–113`, `dist/run.js:102–182,211–236` | Success returns resolvedModel; failures do not. Failed fallback usage can be absent. Exact installed package is 0.6.0. |
| `src/infra/outbound/deliver.ts:320–328,565–580,650–660`; queue store `:282–313` | Queue IDs, required durability, caller-managed completion and acknowledgement already exist. Queue is not wired to watcher. |
| `src/gateway/server-core/server-cron.ts:76–120,188–195` | Unknown explicit agent and mismatched session fall back; isolated execution has a separate cron session. |
| `src/web/inbound/monitor.ts:142–189` | Later WhatsApp code emits raw hooks per entry but no canonical carrier, and skips personal-assistant member traffic. Telegram certification does not certify WhatsApp. |

Paths abbreviated as “Watcher” are relative to `extensions/alert-watcher/`. Detailed decisions and installed hashes are in [research](research.md).

### TO-BE functional requirements

- **FR-C01 / A11**: Stable admission MUST use authoritative canonical identity, watcher policy ID and explicit reevaluation generation; bind exact original bytes and effective policy at first admission. No text equality or mutable rule hash may replace stable admission identity.
- **FR-C02 / A12**: SQLite uniqueness, bounded snapshots/attempts and owner/generation predicates MUST survive process restart; negative and failed results, usage and replay tombstones MUST be durable.
- **FR-C03 / A13**: The existing plugin lifecycle MUST own a bounded dispatcher (5s poll, 30s lease, 10s renew, one active classifier, at most 10 candidates/tick). Only proven unsubmitted failures retry after 5s/30s, maximum three attempts. Ambiguous admitted work MUST NOT automatically recall providers.
- **FR-C04 / A14**: Every certified recipient MUST commit SQLite admission before queue dispatch and settle SQLite before queue acknowledgement; missing/mismatched admitted evidence MUST NOT enqueue again.
- **FR-C05 / A15**: Positive/suggestion/recipient materialization MUST be durable, recipient-specific and authority checked; legacy retry must be fenced, source-window count and first-sent cooldown applied once, payload copies expire after seven days by default without clearing replay identity.
- **FR-C06 / A16**: Both hook and flow classifier/suggestion paths MUST use opt-in per-invocation final usage from the installed terminal result, preserving ordinary callers and honest unknown/incomplete cost.
- **FR-C07 / A20gateway**: Explicit cron agent/session binding MUST fail closed at admission and execution, while omitted general-cron agent retains defaults; qualified Pulse execution MUST use its current exact gateway and no automatic announcement.
- **FR-C08 / A30gateway**: Eligibility/census/shadow MUST default disabled, never bypass baseline, exclude uncertified/custom/model-drift inputs, and export complete logical-source accounting or explicit incomplete coverage. No active classifier change or paid holdout occurs here.
- **FR-C09 / shared safety**: Provenance, receipt IDs and scores MUST NOT grant authority. Current enablement/owner/recipient scope MUST be rechecked before dispatch and local completion. Data migrations/rollback MUST preserve uncertain admissions and tombstones.

### Key Entities

Canonical source unit; stable admission and pinned policy/input; classification attempt/lease; bounded suggestion subreceipt; per-recipient delivery receipt; retired replay namespace; invocation usage with coverage; explicit cron origin binding; logical-source census/shadow observation. Their exact fields and transitions are in [receipts](contracts/receipts.md), [usage](contracts/usage-shadow.md) and [cron binding](contracts/cron-binding.md).

### DELTA and acceptance trace

| Acceptance | Transition | Focused proof | Tasks |
|---|---|---|---|
| A11 | ID/content seen flag → pinned canonical admission | `src/provenance.test.ts` | T004–T006 |
| A12 | transient state → actual SQLite receipts/tombstones | `src/classification-work.test.ts` | T007–T009 |
| A13 | hook awaits → lifecycle dispatcher/recovery | `classification-recovery.test.ts` | T010–T012 |
| A14 | direct send → caller-managed queue bridge | `src/delivery-bridge.test.ts` | T013–T015 |
| A15 | all-recipient boot retry → recipient recovery/cutover | `src/delivery-recovery.test.ts` | T016–T019 |
| A16 | last key guess → opt-in terminal result usage | `src/usage-finalization.test.ts`, core host test | T003,T020–T022 |
| A20gateway | fallback target → explicit valid binding | core `server-cron.binding.test.ts` | T023–T025 |
| A30gateway | presumed eligible traffic → frozen census/shadow export | `src/jev-shadow-eligibility.test.ts` | T026–T028 |

## Success Criteria

- **SC-C01**: Two hooks for one qualified source/policy produce one admission; equal IDs in different chats produce two.
- **SC-C02**: Kill/restart tests at every specified effect boundary cause zero automatic repeat of a possibly accepted call or a confirmed recipient delivery.
- **SC-C03**: Every tested terminal invocation records supplied usage with actual resolved model or explicit unknown; no guessed complete bill passes qualification.
- **SC-C04**: Invalid explicit cron binding dispatches zero tools or provider calls; valid isolated jobs preserve agent ownership and origin binding.
- **SC-C05**: Disabled census/shadow dispatches zero extra calls; enabled fixture shadow always retains baseline and logical-source accounting.
- **SC-C06**: All acceptance cases map to real source, installed lock versions, process/SQLite/queue tests, repository gates and independent review. Source proof is distinguished from deployment/live qualification.

## Assumptions

Single watcher ownership is local to its alerts.db/state directory; multiple-host shared ownership requires a new design. The current trusted gateway plugin configuration is the authority source, with current account/org resolution and enablement checks. Manual/flow RPCs remain uncertified. Only raw-hook normalization plus Telegram constituent producer tests establish the supported certification matrix; WhatsApp/other transports require their own later source-backed certification. No production worker, classifier or schedule is activated by this work.
