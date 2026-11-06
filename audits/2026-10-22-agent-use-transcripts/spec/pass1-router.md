# Pass 1 independent review — Hub contracts and evaluation

Reviewed artifact: `specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md`, pass 1, SHA-256 `941c42fd4006a1021e0a63d131d66d1611e47c25d1e2d9f3a745684d9171c621`.

Verdict: **changes_requested**. The draft preserves the substantive user intent and correctly prioritizes existing harness repairs over another runtime or speculative router memory. It is not yet an implementation-complete contract at several client lifecycle and evidence boundaries. These are design corrections; no product implementation was performed by this review.

Read the entire draft, the template and pinned Hub/Gateway source. This review owns Hub submission/telemetry/evaluation depth; other reviewers cover watcher/Factory/Pulse concurrency in greater detail. Existing-source pins remain Hub `b677a5d91a2b653211a1655465b2b5fd398efc2a`, Gateway `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18`.

## Blocking findings

### P1-R1 — Specify the missing page-context revision and cancellation adapters

**Where:** §4.1 lines 119–125, Slices 1–3.

The contract says to reuse existing context/tool registration notifications. `src/lib/assistant/model-context.ts:124-128` actually exports `onToolChange`; `page-context.ts:9-21` only holds a string and exposes set/get. There is no page-context change notification or revision. Its disposer checks string equality, which is not a unique owner token: an old equal-valued setter can clear a newer registration. `fileDraftContext(files)` (`attachments/draft.ts:9-28`) also accepts no AbortSignal. The spec asks the implementation to use these seams without defining the small missing additions.

**Smallest correction:** explicitly add an opaque owner token plus monotonic revision/subscription to page-context, increment on effective set/owner disposal, and ensure an old disposer cannot clear a newer equal-valued context. Reuse `onToolChange` for registry changes. Define how route/focus/org identity changes advance the coordinator epoch and do not use arbitrary text hashes as ownership. Extend `fileDraftContext(files,{signal?})` to forward the signal to `fetchJson`; retain generation checks even if the request cannot abort. Add these files to the slice ownership list.

**Proof:** equal text registered by two owners then old disposer; context set/clear; registry register/unregister; same-path changed focus; scope A→B→A; cancellation while signing multiple attachments. No old owner clear, stale send or committed-upload deletion.

### P1-R2 — Accepted-run UI ownership and replay policy are underspecified

**Where:** §4.1 lines 107, 123–125; §4.2 run relation; Slice 3.

The new helper owns preparation only, but automatic UI execution occurs after an accepted run completes. Current `gateway.svelte.ts:1320-1346` clears `chat.runId`, later invokes `runAssistantUiCalls(agentId,text,sessionKey)`, and `dispatch.ts:19-32` awaits `runUiCalls` then creates a separate silent run. None of those signatures carries the originating page/owner epoch. A run ID alone does not prove current page authority, and the draft does not say where the frozen accepted scope survives or what happens when a final/callback arrives after reload, scope change, cancellation, or duplicate final delivery.

**Smallest correction:** keep a bounded client-only accepted-run record with captured actor/org/agent/session/epoch/context revision, task root and cancellation/terminal status. Populate at actual local dispatch, pass its identity through final handling/dispatch, and validate before each awaited page-tool execution and before each follow-up send. Unknown/expired lineage must render ordinary history without automatic page actions; a new explicit user click may create a fresh scoped submission, but must not resurrect old automatic authority. Give records a lifecycle/size limit; no server task-state service is needed. Preserve intentional sequential tool behavior: actions by the same validated batch may update page content; define whether that ends the batch or allows a revalidated continuation so a successful first action cannot accidentally invalidate all intended subsequent actions.

Also specify exact-run cancellation: existing Hub `abortChat(agentId,sessionKey?)` only sends sessionKey (`chat-rpc.ts:68-74`), while Gateway `chat.abort` already supports optional `runId` and verifies session match (`server-methods/chat/handlers.ts:129-190`). Extend the Hub helper additively to pass the captured run ID; do not abort a newer unrelated run in the same session.

**Proof:** delayed final after scope switch/reload/cancel; duplicate final; first UI read awaits then scope changes; tool wait/mount then scope changes; successful multi-tool batch; stale choice versus deliberate fresh click; exact old-run stop leaves a new run untouched.

### P1-R3 — Choose an actual client telemetry ingestion contract and loss semantics

**Where:** §4.2 lines 131–142, Slices 4–5, A05/E2.

The draft lists applied/discarded and run-relation records without naming their producer-to-storage path. Existing `captureServerEvent` is server-only (`src/lib/server/posthog.ts:35-65`); no generic authenticated client event-ingestion endpoint was found among current API producers. Extending its allowlist alone cannot record a browser's applied/discarded decision. PostHog capture is best effort, so these events also cannot silently become authoritative complete task receipts.

The table uses router mode `active`, whereas current `RouterConfigMode` is `off|shadow|enforce` (`turn-router.ts:201-208`). Preserve that vocabulary or explicitly version/map it. Off mode does not call the route, so no server attempt exists; the `disabled` service test must not invent an inference attempt.

**Smallest correction:** select one narrow authenticated POST endpoint (for example `/api/assistant/decision-events`) for bounded client observed/applied/transport events. Require current authentication and server-derived actor/org; validate event kind, UUIDs, enums, flat allowed fields, batch/size/rate limits; mark caller claims as observations rather than authoritative acceptance. It feeds `captureServerEvent` with no raw prompt text and no arbitrary event names. Drop/abandon queued telemetry on owner changes instead of attributing it to the new owner. Missing telemetry is explicit coverage loss. Keep evaluation task receipts in the run's append-only local artifact, with each network call/provider receipt accounted for; a missing required receipt makes economic conclusions incomplete, not successful zero-cost work. Choose the concrete filename/command for that artifact when defining the evaluator slice.

**Proof:** old clients/no header; off/bypass without classifier attempt; server succeeds but client discards; forged actor/org ignored; stale owner telemetry cannot change attribution; duplicate events idempotently deduplicated by event ID; dropped event lowers coverage; every field survives producer-through-sanitizer tests.

### P1-R4 — Submission commit must define helper rejection and transport failure ordering

**Where:** §4.1 line 121, A02.

The helper is told to transition `preparing→submitted` immediately before calling `sendAssistantTurn`, yet that function may reject synchronously for empty input, disconnected transport or an already sending chat. The explicit submitted/rejected return is useful, but the state transition ordering and draft cleanup are ambiguous. A permitted implementation could leave the coordinator marked submitted and lose the draft on a synchronous rejection.

**Smallest correction:** specify a synchronous commit operation that checks generation/scope and invokes the transport helper in one no-await critical section. Only its accepted result terminalizes as submitted and authorizes matching-revision draft cleanup; synchronous rejection terminalizes as rejected and retains draft. A dispatch whose acknowledgement is lost remains submitted/unknown and is not automatically replayed with a new ID. A retry of a known submitted request must reuse the existing idempotency identity or require explicit reconciliation; the scope helper must not silently create another send.

**Proof:** chat becomes busy/disconnected immediately before commit; synchronous send rejection; RPC rejection known before acceptance; RPC response loss after gateway acceptance. Verify local state, draft, number of sends and identity reuse independently.

### P1-R5 — The economic promotion statistic does not match the stated objective

**Where:** §9.1 line 405 and §9.2 line 413.

The objective is cost per successful task including failed/canceled/unknown effort, but the promotion gate says upper bound on **total cost ratio** below 1. A slightly less successful arm can have lower total cost yet higher cost per successful task. The paired bootstrap procedure is referred to as prespecified but its resampling unit, statistic, missing-cost handling and zero-success cases are absent.

**Smallest correction:** define the statistic explicitly: `sum(all cohort costs)/count(successful episodes)` for each arm, then candidate/baseline ratio. Bootstrap matched episodes (and any prespecified repetition clusters), recomputing that whole ratio for each draw; retain unknown-cost coverage/bounds; zero-success or unbounded unknown exposure is non-promotable/inconclusive. Freeze seed, replication count, interval method and expansion/stopping rules in the approved run manifest before unblinding. Use the same episode-level paired procedure for success difference and state whether p95 latency is descriptive or gated by an interval. No particular numerical tolerance need change merely to address this finding.

**Proof:** a synthetic cheaper-but-less-successful cohort fails the economics criterion; deterministic seeded report output; zero successes; missing bill; critical violation veto; cluster repetitions not incorrectly treated as independent cases.

### P1-R6 — Evaluator slice is not bounded, and unrelated dependencies block useful proof

**Where:** Slices 19–22, §8.1, §9.2.

Slice 20 combines a three-arm executable model/Hub/Gateway harness, all joins and budget protection, a 300-episode bilingual labeled corpus, and a statistical report into a 4–8 hour target. That is not credibly one junior-sized slice. Its dependencies on Factory report/reservations (7/8) have no shown execution edge in a Hub/Gateway router trajectory. Slice 21 also forces trace-screening proof to wait for new digest feedback UI. This adds coupling beyond the intended reuse/Ponytail discipline.

**Smallest correction:** split Slice 20 now into (a) fixture-mode runner and adapters plus bounded admission/receipt manifest, proven with a small synthetic episode set; (b) corpus schema/import/validation and labeling protocol with explicit separate human curation acceptance; (c) deterministic analysis/report CLI with synthetic counterexamples and holdout protections. Each software slice gets exact paths/commands and 4–8h scope. Treat collecting/adjudicating 300 episodes and executing a paid holdout as separate governed operations, not an asserted 4–8h coding deliverable. Remove Factory 7/8 prerequisites unless a concrete reused adapter requires them; reuse a small schema/helper independently if desired. Separate trace-screening fixture proof from the optional Pulse feedback-export adapter, so the former does not wait for a digest UI. Split atomic publication and feedback UI now rather than leaving Slice 19's known oversized boundary to implementation.

**Proof:** dependency DAG has only actual code/data dependencies; each split has a runnable offline command and small fixture acceptance; corpus readiness can be incomplete without misreporting the runner/report as unimplemented or the full evaluation as qualified.

## Nonblocking notes and retained good decisions

- The correction from isolated classification to whole-history/discovery evaluation is sound. Do not add a stateful router merely because a short reply gets mode chat.
- Existing run idempotency, `onToolChange`, current strict permission gates, explicit UI callback bypass and five-follow-up cap are the right reuse points.
- Factory one-inflight admission is a reasonable bounded tradeoff for this spec; its actual throughput effects must remain observable. Nothing in this review establishes deployment incidence.
- Bounded tool-free digest and existing Pulse cards are an appropriately smaller experiment than a generic durable news agent. The full artifact should clearly distinguish mandatory defect repairs from conditional digest/evaluation activation.
- Known/unknown costs and server success versus client application are correctly distinguished. The remaining sink/loss details above are necessary to make that distinction executable.
- `bun run test -- <path>` invokes Hub's combined script (`vitest run && bun run test:architecture-recon`); verify argument forwarding before calling it a focused suite command. Prefer `bunx vitest run <path>` for declared focused tests, then run full repository gates separately. Browser fixture runner paths should name existing Playwright/critical-journeys commands rather than present a new `.test.ts` as browser proof by itself.
- Initial model identity may only be requested, not resolved, before dispatch. A manifest can record the allowed resolved model cohort and settlement must verify actual identity. Do not require knowing a dynamic provider resolution before the first request while continuing to use a latest alias.

## Suggested G2 axes

| Axis | Score | Reason |
|---|---:|---|
| slice_size | 4 | Evaluator/corpus/report and publication/feedback are oversized; related workers may need further split |
| dod_verifiability | 6 | Strong acceptance IDs and failure cases; ingestion, accepted-run lifetime and economic statistic need specificity |
| scope_containment | 7 | Avoids generic runtime/learning; some avoidable lane coupling remains |
| impact_zones | 7 | Good repository/caller map; missing page-context/attachment/abort adapters and telemetry endpoint |
| collisions | 8 | Explicit existing artifacts and file serialization; no unwarranted supersession |
| testability | 6 | Good fixture/database/runtime evidence separation; remaining client lifecycle and reporting contracts block deterministic tests |

These scores are suggested G2 inputs, not human approval and not an automatic gate result. Re-review the revised artifact hash after resolving the six blockers.
