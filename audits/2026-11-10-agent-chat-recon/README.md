# Minion agent-chat recon — 10 November 2026

Three additional improvements emerged: currency-safe stock tools, atomic booking rescheduling, and appointment-summary reconciliation. The largest existing gap is adoption: the reviewed Gateway guardrails remain outside canonical DEV/main. Several Hub corrections are already merged and should not be rebuilt.

## Scope and evidence

Reviewed all **74 conversation-like episodes dated October 1 onward** in the November 6 retained export, with targeted UI feedback/continuations. The latest retained message is **November 3**. The source corpus contains 43,377 deduplicated message events across 41 gateway/agent cohorts; that is collection coverage, not 43,377 semantically reviewed messages today. The recent conversation cohort contains four personal-agent cohorts. Labels are heuristic and supply no failure-rate estimate.

Fresh gateway collection failed: Netcup SSH timed out and this machine reports Tailscale `BackendState: Stopped`. Nine authenticated, org/tenant-filtered canonical REST GETs succeeded and returned zero qualifying newer rows. `messages` queries require nonnull `agent_id`; unattributed history is excluded. Zero qualifying rows does not establish zero new conversations. Network settings were not changed.

Canonical source was freshly fetched: Gateway DEV `d3e0fbf54fc657521df07c896ea7adce5ba1afcd`, Gateway main `50a3036ad7fac23710943e7eeadfe66b38d96fcd`; Hub master `206d9ae218efd4bf682d6c4063797c7441f4d52a`. Dirty shared working copies were excluded as implementation evidence. Runtime container identity and live tenant configuration remain unverified.

## Domain matrix

| Domain | Work completed | Evidence limit |
|---|---|---|
| User outcomes | 74 recent retained episodes plus targeted continuations | Historical, heuristic cohort |
| Tool/action contracts | Canonical Gateway and Hub source; stock/reschedule fault probes | Synthetic service effects; no native SQL run |
| Memory, output and access | Current source and sanitizer probes | Live policies/plugins/image unverified |
| Applied-status reconciliation | Fresh remote refs and PR637/643/367/368/954 | Merge/source is not deployment proof |
| Fresh chat coverage | Nine canonical GETs; SSH collection attempted | New gateway sessions inaccessible |

## Prioritized improvements

| ID | Priority | Status | Improvement |
|---|---|---|---|
| N01 | High | Current source gap | Preserve stock currency and rate basis |
| N02 | High | Current source gap | Make booking rescheduling atomic and validated |
| N03 | High | Retained trace; new eval needed | Reconcile summaries against received booking rows |
| R01 | High | Existing candidate; unmerged | Adopt the reviewed Gateway guardrails |
| R02 | High | Partial protection | Make completion depend on durable receipts |
| R03 | High | Current contract gap | Rank the metric the user requested |
| R04 | Medium | Current contract gap | Complete booking prerequisite discovery |
| R05 | Medium | Known applied-fix boundary | Reconcile interruptions after a run is claimed |
| R06 | Medium | Existing backlog | Keep memory provenance and business tool scope explicit |
| R07 | Medium | Guidance fixed; data access incomplete | Read Minion release notes on demand |

## N01 — Preserve stock currency and rate basis

**Current source gap · High**

A retained request explicitly specified USD and a line total; the assistant filled a numeric unit rate without currency. The current assistant form-fill catalog/adapter and Gateway tool schemas still lack currency. The native UI has currency controls, but the Hub agent action strips currency and bypasses the native API conversion path.

Evidence: Actual canonical route probes: USD preview omits currency; confirmed draft passes raw rate 100 with no currency/FX metadata. The existing shared helper produces 375 from the same synthetic USD rate at synthetic FX 3.75. No production valuation was tested.

Change: Thread explicit currency and unit/line-total basis through the form, Gateway tool, preview and action. Reuse native conversion and persist FX provenance; keep draft creation separate from posting.

Acceptance: USD and PEN; unit and line totals; missing FX; UI already in total mode; preserved earlier draft lines; preview/commit parity. Unsupported currency must be explicit.

Deduplication: Additional finding; adjacent to F06/F07 action closure.

Source: [anchor 1](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/lib/assistant/catalog.ts#L11), [anchor 2](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/routes/api/gateway/actions/stock-entry-create/+server.ts#L18), [anchor 3](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/routes/api/stock/entries/+server.ts#L67), [anchor 4](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/tools/hub/stock-entry-create-tool.ts#L34).

## N02 — Make booking rescheduling atomic and validated

**Current source gap · High**

Create-booking preflight is fixed, but reschedule still returns a syntax-only preview, creates a replacement, then independently cancels the original. An existing native transactional reschedule service now exists.

Evidence: Five actual-route synthetic scenarios reproduced a successful create followed by cancellation failure, leaving a simulated replacement. Replay reaches create again. Authority denial and unavailable-slot controls pass. Native slot conflicts can prevent a particular duplicate; this is not a production duplicate claim.

Change: Specify move-versus-replacement semantics, use the appropriate atomic native service, validate original references, and return an idempotent effect receipt. Preview must describe the same effect as commit.

Acceptance: Failure between effects; missing/foreign original; same-resource overlapping move; invalid contact; linked payments/packages/series; retries after uncertain delivery.

Deduplication: Additional source finding adjacent to C03/F07, not a recurrence of the fixed create preview.

Source: [anchor 1](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/routes/api/gateway/actions/booking-reschedule/+server.ts#L40), [anchor 2](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/server/services/scheduling-bookings.service.ts#L1408).

## N03 — Reconcile summaries against received booking rows

**Retained trace; new eval needed · High**

A retained appointment answer reports 10 bookings and 3 no-shows after receiving 11 unique booking IDs and 4 no-shows, all within the requested local day. One already-returned slot disappears from the summary.

Evidence: A deterministic private receipt check deduplicates overlapping tool responses, verifies consistent duplicate IDs and local-day bounds, then compares the terminal aggregate. This proves summarization loss in that trace, not a current model failure or database population completeness.

Change: Compute and reconcile authoritative total/status aggregates, deduplicate by booking ID, keep scope/coverage explicit, and make totals agree with displayed rows. Count people only from stable authorized identity, never attendee display labels.

Acceptance: Overlapping result windows; multiple bookings per contact; equal display names; all statuses; repeated slots; capped data. Preserve current exact-count/truncation contracts.

Deduplication: Additional semantic finding distinct from C04 silent truncation and F01 date selection.

Source: [anchor 1](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/routes/api/gateway/query/bookings/+server.ts#L15).

## R01 — Adopt the reviewed Gateway guardrails

**Existing candidate; unmerged · High**

Fresh Gateway DEV is byte-for-byte the November 6 audit base. Reviewed memory/onboarding/DSML/redaction corrections have not entered DEV or the reviewed release files.

Evidence: Current source still supplies at most two messages to a four-message memory threshold; extraction capacity lacks reservation; bootstrap conflicts with ordinary-task guidance. Five sanitizer probes reproduce DSML and supported-secret gaps plus two passing controls.

Change: Recover and qualify the existing candidate commits and gates. Do not create a parallel implementation or assume the open production promotion PR includes these local corrections.

Acceptance: Exact candidate source, independent review, focused and full checks, actual CI, applicable human gates, immutable deployed identity and runtime checks.

Deduplication: C01/C02/C06/C07/C08; F02/F08/F12.

Source: [anchor 1](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/pi-embedded-runner/run/attempt.ts#L733), [anchor 2](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/memory/extract-memories.ts#L245), [anchor 3](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/channels/outbound-sanitizer.ts#L27).

## R02 — Make completion depend on durable receipts

**Partial protection · High**

Error metadata, semantic isError and unknown-write stopping exist. Durable extracted-memory dispatch still returns void and swallows sink failures, so extraction telemetry does not prove storage.

Evidence: Current memory-service and memory-sink source. Open Gateway PR367 already covers fetch deadlines/in-flight protection but is unmerged and does not supply durable acknowledgment/idempotency.

Change: Separate extracted, queued, persisted and confirmed states; add durable acknowledgment and idempotency. Preserve current honest recovery and explicit-write preview/confirm contracts.

Acceptance: Sink failure; partial delivery; timeout after commit; duplicate retry; explicit remember recovery. No saved claim from a rejected or unknown receipt.

Deduplication: F04/F06; existing candidate ledger.

Source: [anchor 1](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/memory/memory-service.ts#L42), [anchor 2](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/memory/memory-sink.ts#L64).

## R03 — Rank the metric the user requested

**Current contract gap · High**

Finance selects top 15 invoice items by revenue. Returned quantities describe that revenue-selected subset; per-service cost/margin is absent. A volume winner can be excluded.

Evidence: Canonical finance route and service. This supports the contract gap behind the historical price-for-margin failure, not a new production reasoning incident.

Change: Expose explicit quantity/revenue/margin rankings with population, coverage, currency, period, cost provenance and tie/truncation semantics. Return unavailable when costs are insufficient.

Acceptance: Low-price quantity winner outside revenue top15; missing cost; POS-only sales; overlapping sources; ties at cap; sensitive-field masking.

Deduplication: F03; dates/all-time C05 already fixed.

Source: [anchor 1](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/routes/api/gateway/query/finance/+server.ts#L44), [anchor 2](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/server/services/finance.service.ts#L1070).

## R04 — Complete booking prerequisite discovery

**Current contract gap · Medium**

Booking creation needs eventTypeId/resource context, while catalog and POS reads return productId without a guaranteed service/event mapping. No dedicated typed event/resource/slot read was found.

Evidence: Canonical gateway query inventory, booking-create schema, catalog and POS projections. Other custom tool or form paths may exist; not every booking is claimed impossible.

Change: Provide permission-scoped service/event mappings, eligible resources, local timezone and availability reads. Preserve assignment and module authorization.

Acceptance: Named-service booking using only authorized typed tools; ambiguous names; inactive/foreign resources; no slots; explicit access denial.

Deduplication: F07; create preflight C03 already fixed.

Source: [anchor 1](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/routes/api/gateway/actions/booking-create/+server.ts#L14), [anchor 2](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/routes/api/gateway/query/pos/+server.ts#L22).

## R05 — Reconcile interruptions after a run is claimed

**Known applied-fix boundary · Medium**

Lost-ack pending-run recovery is merged, but reconnect still revokes claimed runs; a result arriving after binding invalidation is discarded.

Evidence: PR643 and canonical accepted-runs/runner source. This limit is already documented and is not a reason to undo pending-run recovery.

Change: Expose interrupted/unknown effect state and reconcile persisted receipts without automatically replaying a possibly committed write.

Acceptance: Reconnect during read, after commit before receipt, and across user/org/host identity change; no duplicate replay.

Deduplication: Existing November8 resume proposal and PR643.

Source: [anchor 1](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/lib/assistant/accepted-runs.ts#L74), [anchor 2](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/lib/assistant/runner.ts#L77).

## R06 — Keep memory provenance and business tool scope explicit

**Existing backlog · Medium**

Retained workshop speculation/heartbeat filler appears in injected memory. Extraction receives role/content without effect-receipt provenance. Policy machinery exists, but live business-profile restrictions could not be inspected.

Evidence: Retained traces and canonical extraction/tool-policy contracts. Causal storage path and current tenant configuration remain unproven.

Change: Distinguish user facts, plans, peer claims and confirmed effects; suppress duplicate filler and bound workshop goals. Apply existing business-tool policies and verify enforcement.

Acceptance: Unexecuted promise; peer opinion; duplicate heartbeat; explicit user correction; permitted business read versus unnecessary environment enumeration.

Deduplication: F09/F12. No historical credential rotation or new authority inferred.

Source: [anchor 1](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/memory/extract-memories.ts#L24), [anchor 2](https://github.com/NikolasP98/minion-ai/blob/d3e0fbf54fc657521df07c896ea7adce5ba1afcd/src/agents/tool-governance/tool-policy.ts#L279).

## R07 — Read Minion release notes on demand

**Guidance fixed; data access incomplete · Medium**

An October12 changelog request received upstream OpenClaw notes and an unsupported installed-version claim. Current changelog guidance explicitly forbids that substitution, but its existing TODO says actual release notes are not supplied.

Evidence: Current changelog manifest and its regression assertion; existing open-end3 of the JEV/context-router proposal. No current recurrence was tested.

Change: Complete the existing on-demand Hub release-notes read, retaining product/source identity and separate runtime-version receipts. Do not re-file missing guidance.

Acceptance: Current Minion page with upstream distractors; notes unavailable; installed version unknown; user asks for response rather than an upgrade.

Deduplication: Historical additional trace, partly addressed; existing October12 proposal owns data-read gap.

Source: [anchor 1](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/lib/assistant/turn-router.ts#L125), [anchor 2](https://github.com/NikolasP98/minion_hub/blob/206d9ae218efd4bf682d6c4063797c7441f4d52a/src/lib/state/features/assistant-context.test.ts#L168).

## Already applied or partly addressed

| Area | Present behavior | Qualification |
|---|---|---|
| Booking create preview | Native semantic preflight, strict contacts and commit revalidation. | C03; Hub PR637 |
| Booking count and truncation | Exact filtered total plus returned/truncated/count mode. | C04; Hub PR637 |
| Finance dates and local buckets | Strict dates, intentional all-time and business timezone. | C05/F01; finance scope only |
| Tool error handling | Structured code/status/retryable and semantic isError. | F04; preserve existing behavior |
| Personal-agent loop bounds | 40-call limit, permanent-error block, discovery/error/result limits, one recovery. | F05; not every agent profile |
| Catalog ties and honest scope | Sale price explicitly separated from cost/revenue; tied maxima preserved. | F11; not margin/volume analytics |
| Pending chat recovery | Lost chat.send ack recovery merged. | Hub PR643; claimed runs remain separate |
| Navigation and changelog guidance | Navigation is a proposed link; current release prompt rejects other products. | Historical Team/changelog errors; no current recurrence claim |

The stock continuation contains UI fill receipts. It is not evidence that every UI block went unexecuted, and the assistant did not claim posted stock. Current stock UI appends/merges lines; do not re-file historical single-row replacement as a current UI defect. The canvas conversation also continues into authoring after dataset discovery; an intermediate discovery answer alone is not a failed task.

## Verification and handoff

Executed five Gateway sanitizer cases, five reschedule route scenarios, five stock route/helper scenarios, and one deterministic retained-summary receipt comparison. Passing probes reproduce current defects as well as positive controls; they are not passing product acceptance tests or a quality score. No paid evaluator or new model conversation ran.

Sanitized result files: [Gateway sanitizer](gateway-probe.json), [reschedule](reschedule-probe.json), [stock currency](stock-probe.json), [summary receipts](summary-receipt-probe.json). Executable harnesses, collection receipts and source snapshots remain in `.local/agent-chat-recon-2026-11-10/`. Full suites and native database integrations were not rerun for this read-only audit.

Open work is recorded in the [existing transcript proposal](../../proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md). New exact-site `TODO(handoff)` annotations are retained in private annotated source snapshots and the [unapplied handoff patch](handoff-todos.patch); existing guardrail sites remain in the November 6 audit patch. No comments were injected into dirty shared product files. The proposal retains normal spec, review, security/data and merge gates; this audit does not resume the prior release process.

Recommended sequence: recover and qualify existing Gateway corrections; specify and test currency/reschedule parity; add the summary counterexample to sanitized eval fixtures; then complete metric/reference/receipt contracts. Preserve already-applied protections and their positive controls. Refresh gateway sessions when connectivity returns before making claims about current conversational behavior.
