---
id: 2026-10-22-agent-harness-reliability-and-proactivity-spec
title: Agent harness reliability, qualified decisions and bounded Pulse proactivity
stage: dev
status: implementing
pass: 2
created: 2026-10-22
updated: 2026-10-22
repos: [minion_hub, minion, minion-factory, minion-meta]
proposal: 2026-10-22-agent-decision-and-proactivity-experiments
relationship: extends
related: [2026-10-12-hub-assistant-jev-context-router, 2026-10-17-agent-experience-lifecycle, 2026-09-29-factory-jev-decision-layer, 2026-07-17-pulse-slice1-plan]
tags: [logic, data, security, test, infra, ui]
type: feature
verdict: approved
next_slice: 3
---

# Agent harness reliability, qualified decisions and bounded Pulse proactivity

## 0. Product

A Minion user must be able to submit a request, change their mind, and trust that the request stays in the intended conversation. Operators need decision records that show which policy actually ran and what the whole task cost. Proactive work should produce useful review cards without losing progress or silently repeating an uncertain external action.

The owner requested this full SDD/Ponytail specification after the [source revalidation](../audits/2026-10-22-agent-use-transcripts/README.md), then explicitly authorized implementation: “Okay, begin implementation. Use subagents and validate work.” This advances the specification to `stage: dev`, `status: implementing`. Paid experiments, merge and deployment retain their separate gates. The source proposal remains `in-spec`; technical design review and human implementation authorization are recorded separately.

This is one implementation contract with bounded slices, not a new agent framework. Ponytail means reuse the current transport, identifiers, SQLite alert store, Hub job ownership and Pulse cards. The spec is complete about the repairs and conditional experiments; an experiment may legitimately finish with “do not activate.”

## 1. AS-IS and evidence boundary

### 1.1 Verified source

| Repository / branch | Audited commit | Source evidence |
|---|---|---|
| Hub / master | `b677a5d91a2b653211a1655465b2b5fd398efc2a` | [Router report](../audits/2026-10-22-agent-use-transcripts/revalidation/router/report.md), [durability report](../audits/2026-10-22-agent-use-transcripts/revalidation/durability/report.md) |
| Gateway / DEV | `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18` | [Alert report](../audits/2026-10-22-agent-use-transcripts/revalidation/filter/report.md), durability report |
| Factory / dev | `43a174b2e87c4d572ffd2ba030269db22a0b7bd2` | [Factory report](../audits/2026-10-22-agent-use-transcripts/revalidation/factory/report.md) |

[Selected immutable source snapshots](../audits/2026-10-22-agent-use-transcripts/revalidation/source-manifest.json) and probes preserve the evidence. These pins establish source behavior, not deployed identity. Before each implementation slice, inspect the current target branch for fixes/collisions; retain the same observable acceptance contract if code has moved. Record new anchors rather than applying old patches blindly.

### 1.2 Findings and current mitigations

| IDs | Current behavior / anchors | Consequence |
|---|---|---|
| R1/R2 | Hub Home `+page.svelte:675+`, Floating `send:306–331`, `stopReply:435–438` read mutable context after awaits; Stop aborts only gateway work | Wrong-destination submission or send after pre-send cancellation |
| R3/R4 | Router endpoint emits `p_sandbox`; observability allowlist omits it. Route starts before run ID allocation. Failed/unknown cost becomes zero | Incomplete task joins and misleading evaluation inputs |
| R5/R6 hypotheses | Composed envelopes persist in gateway history and reach JIT/memory retrieval. Current UI schemas, page/tool discovery and callback full-context bypass already exist | New continuation state is not yet justified; task cost/retrieval impact needs experiments |
| F1/F2 | Factory proxy logs centrally; shell rank logs locally; report concatenates them and discards model/cost provenance | Duplicate inference/cost counts and unqualified calibration cohorts |
| F3/F4 | Guard asks for 4s under a 6s hook; proxy defaults to 25s. Run budget checks precede await and increments follow | Deadline mismatch and concurrent call-cap overshoot |
| F-01/F-02 | Watcher dedup uses raw ID; received adapter reads wrong fields. Telegram raw chat IDs differ from formatted `To`; debounce combines constituent messages | Unrelated messages dropped, one source processed twice, or a batch aliased to its last message |
| F-03/F-04 | Seen mark precedes classifier; failure cannot retry. Shared host infers model from last key resolution | Lost retry opportunity and wrong model/cost attribution under overlap/fallback |
| DUR-01 | Pulse route reads pending, calls `cron.add`, then marks approved | Concurrent/retried approval can create two jobs |
| DUR-02–06 | Hub `bg-runtime` has lease-generation ownership; `job_effects` rows enforce embedding/vector descriptors. Default jobs tick skips jobs; Pulse has cards, not an integrated digest scheduler | Reuse components, but add domain receipts and qualified worker wiring rather than assume a durable pipeline |

The probes establish controlled interleavings, not production frequency. Existing focused tests passed as recorded in the audit; some gateway integration tests could not collect against installed dependencies. A clean frozen-lockfile install and actual mounted/runtime proof are implementation gates, not waived by those passes.

### 1.3 Collision disposition

| Existing artifact | Relationship and ownership |
|---|---|
| `2026-10-12-hub-assistant-jev-context-router` | Extend its remaining submission/evaluation ledger. Preserve shipped mode fallback and callback behavior. Do not reimplement those fixes. |
| `2026-10-17-agent-experience-lifecycle` and dynamic-tools spec | Reuse discovery and scope validation. This spec adds pending-turn/receipt qualification, not another catalog. |
| `2026-09-29-factory-jev-decision-layer` | Repair the existing integration and reports. That proposal remains owner of unrelated future Jev sites. |
| `2026-07-17-pulse-slice1-plan` | Extend current approval/presentation. Preserve informational kinds; replace the documented async-execution receipt shortcut only at the specified boundary. |
| CRM Jev pilot / WhatsApp delegated-work proposals | No activation, data-source reuse or shipping assumption. Their authority, expiry and operational evidence remain separate. |

No older artifact is marked superseded by this spec. Changes touching the same files serialize as described in §8; later source reconciliation must identify any already-satisfied slice with tests and exact source evidence.

## 2. TO-BE: invariants and exclusions

### 2.1 Invariants

1. **Intent:** one submission has immutable actor/org/agent/session ownership and at most one local send transition. Cancellation or invalidation before that transition produces zero sends. An A→B→A scope change does not revive an old submission.
2. **Authority:** correlation IDs, source provenance, classifier scores and feedback never grant permissions. Server checks use current authority. Background work has an explicit owner and target gateway; missing authority fails closed.
3. **Evidence:** classify-attempt, client-applied decision, transport submission, accepted run and completed task are distinct facts. Unknown cost remains unknown. Model/schema/rubric changes create separate evaluation cohorts.
4. **Identity:** only stable authoritative event identity can suppress another event. Text equality, sender alone or a batch's last ID cannot establish identity.
5. **Effects:** persist admission before external dispatch. An ambiguous accepted call is `indeterminate`, not failed-before-send and not safe to repeat. Known successful recipient effects never replay automatically.
6. **Publication:** a logical digest input produces at most one card; card, consumed cursor and terminal job progress commit together under current ownership.
7. **Human control:** repairs do not enable Jev acting modes, automatic Pulse approval or new global queues. Paid/production experiments require a versioned approved budget and scope.
8. **Compatibility:** existing callsites without optional correlation/provenance still operate with explicitly weaker guarantees. Unsupported input cannot masquerade as a qualified experiment case.

### 2.2 Out-of-scope

No replacement agent runtime, generic workflow DSL, Redis/queue platform, model-training loop, automatic learned weights, new newsfeed UI, arbitrary scraping/research agent, model replacement, continuation-state server, billing judge, automatic CRM labels, blanket activation of jobs, or broad channel rewrite. No promise of exactly-once provider billing or execution-time revocation after a generic gateway job is accepted.

Full delivery recovery is specified for the bounded watcher path in Slices 14–15; other channel delivery pipelines are not rewritten. Legacy inputs without authoritative provenance retain baseline behavior and are excluded from cross-source dedup guarantees and classifier promotion. Each supported transport is explicitly certified before claiming those guarantees.

## 3. DELTA and acceptance mapping

| Delta | Behavior transition | Slices | Proof family |
|---|---|---|---|
| D1 | Mutable pending send → owned, cancelable, single-commit submission | 1–3 | A01–A03 |
| D2 | Disconnected metrics → attempt/applied/task joins with provenance | 4–5 | A04–A05 |
| D3 | Duplicate/unknown Factory accounting → reconciled records and bounded admission | 6–9 | A06–A09 |
| D4 | Raw-ID/batch ambiguity and seen flags → canonical units and durable receipts | 10–15 | A10–A15 |
| D5 | Guessed usage → per-run resolved model or explicit unknown | 16 | A16 |
| D6 | Post-effect status → atomic approval and fenced dispatch | 17–20 | A17–A20 |
| D7 | Unconnected components → bounded informational digest and feedback | 21–25, 32 | A21–A25, A32 |
| D8 | Assumed quality/savings → runnable offline qualification and gated live protocol | 26–31 | A26–A31 |

Each slice below names its exact DoD and test command. Planned test filenames denote files to create, not existing passing evidence. Every defect in the proposal maps above; hypotheses are experiments, not pre-authorized architecture changes.

## 4. Hub submission and decision contracts

### 4.1 Pending submission

Add one small client module under `src/lib/assistant/` used by Home and Floating. It owns preparation lifetime only; gateway chat state continues to own accepted runs. Capture before any attachment/context/router await:

```ts
type PendingSubmission = {
  submissionId: string; // UUID; existing chat.send idempotencyKey when submitted
  actorId: string; orgId: string; agentId: string; sessionKey: string;
  scopeEpoch: number; composerRevision: number; pageContextRevision: number;
  phase: 'preparing' | 'submitted' | 'canceled' | 'invalidated' | 'rejected';
  signal: AbortSignal;
};
```

Keep text and attachment references in the existing composer, captured by revision; do not duplicate long-lived content in a global store. `scopeEpoch` increments on actor/org/agent/thread changes, including return to the same values. Add an opaque registration-owner token, monotonic revision and subscribe/unsubscribe API to `src/lib/assistant/page-context.ts`; an old equal-text disposer must not clear a newer registration. Increment context revision on set, current-owner disposal, route/focus change and tool registration change; reuse `model-context.ts:onToolChange` for the latter. Extend `attachments/draft.ts:fileDraftContext(files,{signal?})` to forward cancellation through `fetchJson`. These small adapters are new work, not assumed existing APIs. Component teardown invalidates its pending generation.

Every await is followed by an ownership/generation check. Commit is one synchronous no-await critical section: verify current scope/generation, invoke the transport helper, then transition to `submitted` only if it returns submitted. Synchronous rejection transitions to `rejected` and retains the draft. An acknowledgement loss leaves submitted/unknown and never automatically creates a new-ID replay. `sendAssistantTurn` accepts an optional caller ID and returns an explicit submitted/rejected result with the ID; old callers still get internally generated IDs. Synchronous submitted means the transport dispatch started, not server acknowledgement or task completion. Keep gateway acknowledgement/failure/unknown outcome separate. Existing wire `idempotencyKey` is reused; no new permission field is added.

Stop first marks the pending generation canceled and aborts fetch/enrichment, then aborts any submitted run using its captured agent/session/run identity. Add optional `runId` to Hub `abortChat`; the existing gateway `chat.abort` already supports it and verifies the session match. Do not use a session-wide abort when an exact captured run is available. Cancellation cannot retract an already accepted remote effect. AbortSignal is an optimization; generation checks are authoritative. A stale completion/finally must not reset a newer pending submission. Preserve the captured draft on cancel/rejection; clear only the matching composer revision after local submission. Never restore an old owner's text into a new owner's composer. Uploaded files remain governed by existing attachment lifecycle; cancellation must not delete a committed upload.

User choice/artifact callbacks retain the full-envelope classifier bypass but pass through the same ownership check. Automatic UI tool follow-ups capture the originating run before chat state is cleared, validate page/owner before tool execution and again before sending results, and preserve the existing five-follow-up cap. A free-form reply is not silently assigned to an earlier task by classifier inference. Keep a client-only accepted-run map (maximum 256 entries, two-hour expiry, clear on actor/org change) containing frozen owner/session/epoch/context, task root, handled-final ID and canceled/terminal status. Duplicate final delivery cannot execute UI calls twice. Unknown/expired lineage after reload renders ordinary history without automatic UI actions; an explicit user click may create a fresh validated submission, never resurrect old automatic authority. Before each awaited UI operation and follow-up, recheck the binding. If a valid action changes page/tool context, end that batch and return its completed results through a newly validated follow-up; do not continue remaining old-page actions implicitly.

### 4.2 Correlation and applied decisions

Use `submissionId` as the existing `x-minion-run-id` header during route calls and as the subsequent chat idempotency key. The header remains untrusted correlation, validated as a bounded UUID and hashed by current telemetry identity handling. Server actor/org context remains authoritative. Old clients may omit it; mark their join coverage incomplete.

Extend existing event contracts/allowlists rather than bypassing sanitization:

| Record | Required fields and semantics |
|---|---|
| Route attempt | submission identity, server request ID, requested/resolved classifier model, schema/question revision, actual elapsed ms, result `ok|timeout|error|invalid|disabled`, tokens if supplied, known/unknown cost |
| Applied/discarded decision | same submission, attempt ID if any, mode `off|shadow|enforce`, actual selected manifest IDs, gate revision, context revision/byte count, `routed|full_fallback|bypass|canceled|invalidated`, bounded reason |
| Run relation | submission/run ID, task root ID, optional parent run ID and explicit origin `user|ui_choice|artifact|ui_followup`, transport acknowledgement/result |
| Task receipt | evaluation case/task root, authorized expected action/artifact, observed tool/domain receipts, terminal `success|incorrect|blocked|canceled|indeterminate`, independent rubric/label revision |

Add authenticated `POST /api/assistant/decision-events` at `src/routes/api/assistant/decision-events/+server.ts` for only the client observation kinds above. Reuse current auth, active-org context, same-origin/CSRF and rate-limit helpers. Accept at most 20 events/16 KiB per batch and 120 events per minute per actor/org; validate UUID event IDs, enums and bounded flat fields. Ignore client actor/org authority claims. Forward sanitized server-derived identity through `captureServerEvent`; arbitrary event names and raw prompt/envelope fields are rejected. Client buffer is at most 20 events, memory-only; drop on owner change and mark coverage gaps rather than relabel under a new owner. Event IDs support deduplication in analysis; do not promise durable exactly-once PostHog ingestion. Off/bypass emits an application observation with no classifier attempt, not a synthetic server call.

Evaluation uses append-only `runs/<run-id>/events.jsonl` and `receipts.jsonl` owned by the runner, not best-effort analytics as complete truth. Required missing receipts make conclusions incomplete. Client claimed submission is not authoritative gateway acceptance. Old clients without IDs remain unjoined.

Add `p_sandbox` to both probability validation and `assistant_route` allowed fields. Retain all current valid probability fields. Use canonical serialization/hashes of question/gate artifacts to generate revisions. Never hash raw customer text into general analytics as a substitute for privacy. Context size and public manifest revision are enough; restricted fixture/trace storage holds input snapshots only when authorized.

Costs use `{status:'known',usd:number}` or `{status:'unknown',usd:null}`; zero is legitimate only when explicitly reported. Measured elapsed failure time is not zeroed. Attempt success can coexist with client discard; only applied records count as used routing. Server and client deadlines are separate fields. Explicit callback/follow-up parent relations may join runs into a task; evaluator-defined multi-turn episodes join natural-language continuations without requiring new production task-state storage.

## 5. Factory decision records and bounds

### 5.1 Record identity and migration

Extend existing Jev request/result/log envelopes additively with version 2 fields: `decisionId`, `attemptId`, origin, site, runId, requested/resolved model, input hash, question/schema revision, timestamps/elapsed, result disposition, tokens, `costStatus` and nullable cost. The caller allocates `decisionId` once for a logical decision and retains it across any explicit retries; the proxy issues its authoritative `attemptId`; shell callers preserve it when adding baseline comparison fields. Direct shell calls create their own UUID through the existing available runtime/utility and retain `origin: direct-container|host`; no fixed tag is used as identity. A retry is another attempt linked to the same logical decision, never a second row pretending to be the same bill.

Central proxy records establish attempt/cost facts. Local rows enrich the baseline, not overwrite proxy facts. Merge by versioned `(runId,attemptId)` plus matching site/model/input/question bindings. Conflicts are quarantined and counted; never last-write-wins. Origin is explicit; absent legacy origin becomes `unknown`, not runner. Legacy rows without stable identity remain raw/unjoined counts, excluded from deduplicated cost and promotion denominators unless an independent provider receipt establishes identity. Do not infer identity from matching timestamps/text.

Report separate raw records, unique attempts, logical decisions, paired baseline comparisons, independent labels, failures, unresolved/conflicting records and known/unknown bills. Group metrics by resolved model/question/schema/gate cohort. Do not average incompatible score scales or confuse baseline agreement with correctness. Rank continues to use the generative model for readiness/recommendation/rationale/evidence. The ten-criterion vs ledger 0–10 mapping must be explicitly verified before absolute score-error comparisons are used; keep raw values meanwhile.

### 5.2 Minimal admission bound

Keep the current single-runner capability model; do not introduce a distributed limiter. Reserve call count synchronously before the first await, including the existing malformed-request accounting semantics. Maintain a run-keyed ledger separate from token lookup, so old and replacement tokens share the same flight, totals and unknown-cost fence. Permit at most one upstream request in flight per run; concurrent calls return a typed `run_busy` denial without consuming an additional inference attempt and preserve existing caller fallback. Malformed request debits retain their current bounded abuse-count behavior, separate from the number of dispatched inferences. Settlement is idempotent by admitted attempt ID, even after its token is revoked; expiry cannot reset a ledger with an unresolved admitted attempt. One in-flight slot conservatively reserves the remaining locally accounted dollar allowance. On known completion settle actual reported spend; on possible dispatch with missing/ambiguous cost fence further calls for that run as `cost_unknown` until reconciled. A definitely unsubmitted request can release the spend reservation, but not erase an already consumed attempt count.

This bounds admitted attempts and outstanding ambiguity. It does not claim to cap a provider invoice below a known final charge: one request can exceed an estimate. Report overshoot and stop further admission. Reminting a capability for the same live run must not reset its local budget; revoking a token invalidates authority but keeps the run ledger until its bounded expiry. A runner restart invalidates all capabilities as today; no replay/remint resume is introduced here. Document the single-runner ceiling with `shortcut:` and upgrade only if multiple active runners share a run.

### 5.3 Deadline

The hook retains its 6s outer budget and immediate deterministic-floor denial. Its semantic path uses a maximum 4s total preparation/request budget with explicit remaining milliseconds propagated through shell proxy and runner fetch; the proxy's general timeout cannot override a shorter caller deadline. Reject expired/invalid budgets before inference; clamp to the runner's existing maximum and account for request processing time. Avoid trusting client wall-clock timestamps: propagate remaining duration at each controlled hop and use monotonic elapsed time locally. Wire the Express boundary `runner/src/index.ts` to a request/response-close AbortController; pass its signal and validated remaining milliseconds through `handleJevDecideRequest` to `jevDecide`. Deadline covers response body consumption as well as initial headers. Bound hook wait independently of server cancellation; remaining-duration propagation does not prove a delayed remote request was canceled. Client disconnect/timeout aborts where supported; it is not proof the provider was never billed. General shadow calls retain their existing upper limit. Legacy three-argument shell call compatibility remains tested.

## 6. Gateway alert classification and delivery

### 6.1 Canonical source and policy identity

Introduce a versioned optional transport provenance value carried from channel intake through `MsgContext` to `message_received` metadata. A source unit contains channel, account, raw conversation ID, provider message ID, optional provider revision, sender/time and the exact source text. Channel adapters—not generic prefix stripping—define raw IDs. Both hook adapters use this same source unit. Telegram debounce carries the ordered constituent units; the matcher evaluates each original source message once, preserving its trigger-only contract. A merged batch cannot reuse its last constituent ID for the whole text.

Internal provenance is produced by the authenticated channel/dispatch path, never accepted as authoritative from user text or a client envelope. Missing identity takes a fresh invocation path marked non-deduplicable; it cannot suppress another message and is excluded from the Jev experiment. Slices 10–11 produce a tested transport support matrix; unqualified transports keep baseline functionality without cross-hook exactly-once claims.

Keep two identities:

- Stable admission: `(authority namespace, stable watcher policy ID, canonical source identity, explicit reevaluation generation)`, serialized as a versioned ordered JSON tuple before hashing. This excludes current rule/model revisions. First admission pins the immutable input/policy hashes; ordinary redelivery looks up this binding first. Changed bytes under the same source identity are `identity_conflict` unless a verified provider edit revision establishes a distinct source. Configuration changes do not increment reevaluation generation. Computation/result identity derives from that bound admission plus its frozen input/policy hashes. Channel and agent subscriptions of the same watcher share this identity. Independent flows remain independent policies.
- Delivery: computation/result revision + delivery policy + normalized authorized recipient. The same classification may have several distinct recipient receipts.

The external `langgraph-server` pluginAction producer is outside this registered/pinned scope and does not provide authenticated source provenance. All flow/manual classify RPC calls retain fresh-invocation baseline behavior for this milestone, even when they include runId/nodeId strings. They are excluded from cross-source dedup certification and the Jev gate. Certified cross-hook scope is raw-hook normalization plus Telegram constituent propagation; other adapters require separate source-backed certification. No external flow repository is silently added to this spec. An optional receipt ID in the v1-compatible envelope is only a reference: every consumer loads it under current owner scope and verifies input/policy/result binding. It is not a bearer capability.

First admission pins the effective rubric/model/schema/input and intended recipients. Redelivery resumes that snapshot. A config change cannot silently redirect old work; explicit reevaluation creates a new linked revision. Before resumption or delivery, recheck enablement, owning authority and recipient permission; revoked work is canceled/fenced.

### 6.2 Existing SQLite store, two narrow receipt tables

Reuse the watcher's `alerts.db`, migrations and startup lifecycle. Add `classification_work` and `alert_delivery_receipts`; do not add Hub jobs or a new queue runtime to this plugin.

`classification_work` stores UUID, authority/policy/source key and hash, immutable bounded input/config snapshot, state, lease owner/generation/expiry, attempt sequence, admitted timestamp, result/schema, usage/cost status, safe error code and timestamps. Unique computation identity is enforced by SQLite. Small bounded attempt history may use an existing log or capped JSON; do not build another general trace store. Claims and generation transitions are atomic transactions; the in-memory dedup cache may cache completed identities only.

Store a capped JSON array of at most three attempts in `classification_work`, each with ID, admitted/received times, disposition and known/unknown usage. States: `queued → admitted → received → completed|failed`; `queued → canceled`; a definitely unsubmitted transient failure may return to queued under the retry cap; expired admitted work becomes `indeterminate`. Validation failure or lost response after provider dispatch is not a fabricated negative. Persist the bounded terminal SDK result and supplied usage before watcher-local validation/materialization. The SDK may already have validated the provider response; this contract does not require raw pre-SDK-validation text. An SDK schema failure terminates `failed` with known usage or explicit unknown cost, never negative or automatic recall. Persist validated negative results too. `received` resumes local classifier-result materialization without recalling the classifier; the optional suggestion step has its own admission below. Implement a single bounded plugin dispatcher in `src/classification-work.ts` started/stopped with plugin lifecycle: poll due work every 5s, lease 30s, renew every 10s, one active classifier per plugin instance, maximum 10 candidates per tick, count three dispatch attempts at most with retry delays 5s then 30s. Persist `attemptCount` and `nextAttemptAt`; cap exhaustion becomes failed. Retry is only for outcomes proven unsubmitted; unknown provider acceptance needs explicit reconciliation/authorized reevaluation. Admission must check current policy authority before claim and immediately before dispatch.

For a positive result with configured suggestions, keep one bounded suggestion subreceipt on `classification_work`: `not_requested|queued|admitted|received|indeterminate`, attempt ID, frozen input/model descriptor, timestamps, bounded terminal SDK result and known/unknown usage. Persist admission before the single suggestion invocation, then result before rendering recipient payloads. Recovery of `received` reuses it. Recovery after ambiguous admitted suggestion work records `indeterminate`, uses `suggestions: []` with an explicit unavailable reason, preserves unknown spend and never automatically recalls suggestions. A known suggestion failure likewise degrades to an empty list; the valid positive alert still proceeds. Recipient payloads bind the final suggestion result or explicit empty fallback immutably. This is one optional substep, not a general workflow engine.

`alert_delivery_receipts` is unique per computation/result/recipient policy and records `queued|admitted|sent|indeterminate|canceled|failed`, ownership/generation, provider/queue receipt and safe failure code. Materialize positive results plus intended recipient rows in one SQLite transaction. Use `deliver.ts` with the persisted recipient receipt UUID as `queueId` and `completionPolicy: caller`. The queue already accepts IDs but rejects existing entries; never blindly enqueue twice. Protocol: SQLite recipient admission/queueId commit → caller-managed queue enqueue/send → SQLite settlement → `acknowledgeCallerManagedDelivery`. On recovery inspect the existing queue entry under its lease and verify channel/account/recipient/payload bindings; matching terminal receipts reconcile, uncertain states remain indeterminate, and missing evidence after admission never permits recreation. Caller-managed completion retains terminal queue evidence until SQLite settlement; acknowledge only afterward. Confirmed recipients never resend when another fails. For certified hook policies, count each canonical admitted source message once toward the existing window; stamp cooldown exactly once when the first recipient has a confirmed sent receipt. Further recipient settlements do not stamp it again. Legacy flow gate counting/cooldown retains its current behavior and is not included in certified hook delivery guarantees. Authorization linearizes at recipient queue admission after current enablement/recipient checks. Later generic queue recovery cannot promise revocation before remote execution; cancellation after admission is best effort and unknown work is never replayed to resolve it.

Retain watcher raw source/response/suggestion/recipient payloads at most 7 days by default, including mirrored caller-managed delivery queue files. Housekeeping retires/redacts expired queue payloads under their queue lease while preserving both queue and SQLite minimal tombstones; admitted uncertain work never recreates an erased payload. Queued work whose required snapshot expires is canceled. Apply the same lifetime to any opted-in usage payload copy; redact them independently from minimal hashed admission/result/recipient tombstones. Tombstones persist until the plugin policy/source replay namespace is retired; deletion must not permit the same old event to trigger inference/delivery again. Provide bounded housekeeping in the same dispatcher and an owner-scoped delete/retire operation, not a new service. Existing alert rows lacking per-recipient history migrate as `legacy_unreconciled`. They remain visible but do not automatically fan out on cutover. Drain/reconcile the old boot retry path before enabling the new dispatcher. Never describe `Promise.all(send...)` plus global boot retry as a durable receipt protocol.

### 6.3 Usage attribution

Do not price completion from a shared “last resolved API key” variable. Use one opt-in gateway adapter for both classifier and reply-suggestion invocations, covering hook and legacy flow paths; give each invocation its own host state and finalize usage from the actual `DroneRunResult.resolvedModel`. Suppress the host's inferred usage event for this explicit finalization path so one call produces one priced event. If the SDK supplies no resolved result (including failure/fallback ambiguity), preserve usage with unknown model/cost rather than guess. Test overlapping different models and fallback within one run. A final resolved model alone does not prove all retry/fallback bills are reported: record cost coverage as incomplete whenever earlier attempted usage is unavailable, and exclude unbounded unknown exposure from cost-superiority claims. Choose the narrow watcher run wrapper using the existing result seam; include `src/classifier.ts` and `src/reply-flow/suggestions-drone.ts` plus both calls in `index.ts`. Ordinary lifecycle events remain. Other host callers retain current signatures. No SDK release is planned; if exact-version qualification disproves the result seam, stop this slice for a contract revision rather than silently switch architectures.

## 7. Pulse admission and one informational digest

### 7.1 Executable approval

Retain existing proposal status semantics and add `revision`/`decidedAt`. PATCH and POST require `expectedRevision` from current clients. Old executable requests without revision receive a refresh-required conflict; old informational requests may retain existing behavior only if their state transition is atomic. Edits are permitted only while pending and increment revision. Preserve the UI's existing design primitives and render decision status separately from dispatch status.

Add `pulse_dispatches`: UUID, orgId, proposalId/revision, actor profile, exact gateway assignment, explicit personal agent ID and canonical session key, immutable typed action payload/hash, state, bg job ID, admission generation/time, remote job ID, safe error and timestamps. Unique `(org_id,proposal_id,proposal_revision)`; checks enforce state-dependent receipt fields. Validation uses the action's real tool contract; never insert arbitrary user-authored instructions into a privileged prompt.

Approval transaction locks the pending proposal, checks revision/current capability, freezes payload/actor/target, inserts one dispatch and its job, and marks the decision approved. Duplicate identical approve returns the existing receipt; conflicting edit/dismiss/revision returns 409. Informational `digest|fyi|draft_reply` never creates remote dispatch. Decision approval is not effect completion.

Worker states:

| State | Transition and recovery |
|---|---|
| queued | Revalidate membership, capability, proposal revision and exact gateway assignment. Under job ownership atomically admit once. Definite pre-dispatch failure may retry within cap. |
| admitted | Exactly one `cron.add` attempt after committed admission. Reclaimed admitted work is indeterminate and is never automatically reissued. |
| scheduled | Persist validated remote job ID. This means scheduled, not executed; no `executedAt` from RPC acceptance. |
| indeterminate | Show explicit unknown outcome with receipt ID and reconciliation guidance. There is no reset/retry API for this state. Verified positive evidence may settle it; cancellation or absence of a remote job never proves no effect and never unlocks automatic replay. |
| rejected/canceled | No automatic further dispatch. Revoke queued work and its job lease generation together. |

Bind executable dispatch to the approving profile's verified personal agent and canonical session on that exact gateway. Send explicit `agentId` and `sessionKey`; turn automatic external announcement off (`delivery.mode: none`) and show scheduling status in Pulse. This spec does not add WhatsApp delivery of these receipts. If personal agent/session ownership cannot be resolved, reject approval rather than choose a default.

Gateway prerequisite: in `src/gateway/server-core/server-cron.ts`, cron admission handlers and job execution, an explicitly supplied nonempty agent ID that is missing/unrecognized must fail; it must never fall back to the default agent. Omitted IDs retain the existing general-cron default behavior. Validate an explicit session belongs to that agent, and repeat the explicit-agent existence check at execution. This intentional behavior change affects invalid explicit-agent cron jobs; inventory them and report failures rather than silently migrate them. Hub execution stays unavailable on a gateway version not qualified for this contract. No new wire field is needed; current agentId/sessionKey fields suffice. Existing job acceptance does not prove current end-user RBAC at future tool execution.

For create_event, validate against the installed calendar_create_event schema and freeze its schema revision and serialized data arguments. For reminder, define typed reminder text, timezone/due-time, target agent/session and any allowed recurrence from the existing cron tool schema; reject unknown keys/invalid dates instead of synthesizing arbitrary instructions. A server-authored fixed template treats JSON arguments as untrusted data and names only the intended existing tool. Include instruction-like title/text tests. This reduces injection opportunity but is not a new sandbox guaranteeing exactly one downstream tool call; existing tool authorization remains enforced.

Use a strict current org/profile/gateway credential path. Existing `gatewayCallAsUser` fallback to system/environment credentials is not acceptable for this worker; add a strict resolution option/helper shared with the route, with no ambient fallback. Recheck immediately before admission. Authorization linearizes there; once a generic gateway job is accepted, cancellation is best effort and this slice does not claim execution-time revocation of downstream tools. Requiring that stronger guarantee would require a separately reviewed typed gateway execution contract. Neither classifier confidence nor this spec bypasses existing tool permissions.

### 7.2 Digest input and policy

Start with one verified personal-org owner (business org activation is rejected) and a repository-managed allowlist of at most five official release feeds/API endpoints for dependencies already present in Minion's package/lockfile snapshot. No search engine, arbitrary URL tool, private transcript source or autonomous source expansion. Owner supplies target org/profile and non-secret source selection at activation; missing configuration means disabled.

Existing `/pulse` reads pending cards only. Add `listRecentPulseDecisions(ctx,{limit<=50,cursor})` and owner-scoped `GET /api/pulse/proposals/[id]/receipt`, returning proposal revision/decision plus dispatch state, safe reason and remote-job reference when known. Integrate a bounded recent-decisions section in the existing page; pending count semantics stay unchanged. Approval returns the stable receipt ID; refresh/reconnect reloads authoritative state from this endpoint. Digest/dispatch receipt and feedback reads verify the bound owner as well as org capability, including another profile in the same org. Existing informational cards with no new domain owner preserve their current access rules. Legacy executedAt values alone are labeled legacy/unverified and are never upgraded into verified execution receipts.

A typed `DigestPolicyV1` contains policy revision, allowed HTTPS origins/endpoints, package identifiers, repository/lockfile commit, locale, maximum source items (20), maximum normalized evidence bytes (48 KiB), one reasoning call, deadline (30s), maximum calls per day (5) and approved maximum spend. These are deliberately small pilot limits, not provider performance claims. Spend defaults to zero; without an approved per-call upper exposure/reservation the model step does not run. Source fetch timeout is 10s, maximum response 1 MiB and maximum redirects zero unless a specifically allowlisted redirect is configured. Reject private/link-local destinations, resolve/revalidate destinations at connection, and use conditional requests. Fetch failure is not “no change”; cursor stays put. Reuse an existing safe fetch utility where available and test SSRF/redirect boundaries if one must be extended.

Store immutable normalized public evidence with source URL/time/content hash and the matching Minion dependency/file anchor. Canonical snapshot identity excludes fetch timestamps so unchanged content remains unchanged. Deterministic package/version/hash checks decide whether anything needs reasoning. Unknown dependency relation is excluded with a reason, not invented by a model. Do not update source cursors before publication/no-signal settlement.

### 7.3 Narrow durable records and worker

Reuse `bg-runtime` and `JobExecution.withOwnership`; do not put arbitrary LLM JSON into embedding-constrained `job_effects` rows. Add domain tables:

| Table | Identity and fields |
|---|---|
| `pulse_digest_admission` | one row per `(org,owner,budget_namespace)`; enabled/current policy, UTC day, attempted calls, reserved/settled micro-USD, unknown-exposure fence, active run/attempt/generation, approved limits and revision; row locked before any reasoning admission |
| `pulse_digest_runs` | UUID, org/owner, policy revision, source snapshot hash, immutable bounded evidence/request hash, model descriptor, job ID, phase/result/cost, admission time/generation, published card ID, safe error/timestamps; unique `(org,owner,policy_revision,source_snapshot_hash)` |
| `pulse_digest_sources` | `(org,owner,policy_revision,source_id)` unique; accepted ETag/version/hash, revision, last committed run and timestamps |
| `pulse_feedback` | ID, org/owner, proposal ID/content revision, digest run/policy/source revision, actor, reason, optional bounded comment, client action ID and timestamps; idempotent `(org,actor,client_action_id)` |

Use a stable approved budget namespace across policy revisions; creating a new policy cannot reset spend. Under an admission-row lock, enforce one active run, daily call count and reserved exposure in the same transaction as reasoning_admitted. UTC day rollover resets the daily count only after carrying forward unresolved reservations and the unknown fence; outstanding exposure never becomes free at midnight. Settlement must match active run/attempt/generation; a stale worker cannot release another run's slot. One unknown bill fences all later snapshots for that namespace until an audited reconciliation. Disable SDK automatic retries/fallbacks for this pilot; every external request needs its own admission, and the one-call run does not permit another after dispatch ambiguity.

Do logical run deduplication in the same transaction before enqueue. Existing `createJobRequest` rotates revisions and enqueues, so it is not the dedup primitive. Add a transaction-taking enqueue/publication helper only where necessary; avoid a generic orchestration abstraction. A run consumes a frozen set of source checkpoint revisions. Commit uses compare-and-swap on those revisions and current policy; a newer run/cursor cannot be regressed by an older worker.

Domain states are `queued`, `reasoning_admitted`, `reasoning_received`, `published`, `no_signal`, `superseded`, `failed`, `canceled`, `indeterminate`. No-change is no_signal with a deterministic reason. Known response/bill is persisted as reasoning_received before validation; invalid schema/citation IDs terminate failed without a second call or cursor advance. A source-revision conflict at commit terminates superseded. Only queued may retry a proven pre-dispatch failure. Store attemptCount and nextAttemptAt for both Pulse dispatch and digest; delays are 5s then 30s, maximum three attempts, then failed/rejected. Add a narrow typed `postponeUntil` result for these registered handlers to bg-runtime, requiring future bounded time and ownership-fenced lease release; add nullable `bg_jobs.next_attempt_at` with default NULL for existing jobs and have candidate SQL check due time before limit. Atomic claim must independently require `next_attempt_at IS NULL OR next_attempt_at <= now` along with current status/lease/generation; a stale candidate or direct advance cannot bypass backoff, and a rejected claim is not counted advanced. `postponeUntil` atomically persists that value and releases the matching lease; existing handlers without it remain immediately eligible as before. Other handlers retain existing retry semantics. Indeterminate is terminal/manual-review-only in this milestone: no retry/reset API. Reconciliation may attach verified positive provider/job receipts through an operator procedure with actor/reason/evidence audit, but absence from cron.list, job deletion or cancellation is never proof no effect occurred and never unlocks automatic replay.

Phases: `queued → reasoning_admitted → reasoning_received → published|no_signal`; deterministic no-change may finish without a call. Safe pre-dispatch failure can retry within the cap. Expired admitted reasoning becomes `indeterminate`; the same unique input cannot trigger another automatic paid call. A received result resumes publication without another provider call. Lease loss aborts cooperatively and blocks all local publication; cancellation does not prove remote inference stopped. Record provider request ID/cost when supplied; unknown outcome/spend freezes further pilot admission until reviewed.

Validate one bounded structured result: `disposition: actionable|no_signal`, source IDs, affected dependency/file anchors from the frozen allowlist, supported claim, relevance/actionability explanations and suggested next step. A textual claim must cite retained evidence; missing/invalid references fail structural validation. Reference existence does not prove entailment: human/sample claim-support review in the pilot qualifies factual accuracy, and a confirmed unsupported claim stops publication promotion. Classification confidence cannot establish factual support. The model has no tools and cannot mutate code, publish externally or approve work.

Publication transaction, under current job ownership and owner authority: validate source revisions; insert/upsert the informational Pulse card using a stable logical key; commit all consumed source cursors, run terminal state and job progress together. Reserve internal dedup namespace `internal:dependency-digest:v1:`; gateway/public ingestion rejects this prefix and internal run-binding fields. Store immutable run ID, owner, policy/input/result hash binding with the card. On conflict, read the existing row in the transaction: same complete binding/content hash returns the same card ID; any mismatch is conflict with no cursor advance. Never overwrite a decided card. Add a transaction-taking internal Pulse helper; the current helper's separate transaction is insufficient. On `no_signal`, commit a bounded reason/result and cursors without creating a card. If content is invalid or provider outcome unknown, do neither. If the cursor CAS fails because newer work won, terminalize as superseded without publishing stale content.

### 7.4 Worker activation, feedback and retention

Add type/org selection inside job candidate SQL **before** limit/claim. A dedicated authenticated tick entrypoint selects only this pilot's configured job families/org and imports handlers explicitly. Pending executable Pulse dispatches use their own selected family. Do not turn on general `?jobs=1`, select first 20 unrelated rows then filter, or count skipped rows as advanced. Define retries for these handlers explicitly; current booking-specific retry behavior is not inherited by name alone. Default one concurrent job per owner/policy, one external call per run, safe retries capped at three with bounded exponential backoff. No overlap for the same logical input.

Wire `GET /api/pulse/tick` into the existing trusted cron authentication/route allowlist, with mandatory configured scope and no caller-selected arbitrary org/type. A deployment-managed per-minute cron invokes it while clients are closed; activation evidence includes the installed schedule and an authenticated cold-start tick, never just the route file. Leave the schedule uninstalled until pilot activation. Each tick first checks at most the one configured personal-owner policy for due collection, then drains only selected Pulse job families within a total 50s handler budget. Source polling is due every 15 minutes (first enabled poll immediately); `pulse_digest_admission` also stores `next_poll_at`, collection owner/generation/lease expiry and last safe collection outcome. Atomically claim due collection for 30s, fetch outside the transaction with a 15s aggregate deadline and at most two concurrent fetches, then generation/current-policy-check snapshot admission/enqueue. Collection itself never calls a model or advances accepted source cursors. Release the matching lease and set next poll to now+15min on success or now+5min on fetch failure; an expired collection lease is safely reclaimable because only bounded public reads occurred. Duplicate ticks cannot collect/enqueue twice under one generation; after restart the persisted due time/lease drives progress. Partial fetch failure does not admit a mixed new snapshot. Disable/revoke fences collection generations as well as jobs. Drain work only with remaining tick time; no reasoning admission when its full bounded deadline cannot fit. Slice32 owns schedule, route, poll wiring and closed-client proof.

Feedback reasons: `useful`, `irrelevant`, `duplicate`, `fact_error`, `already_handled`, `too_late`; approve/dismiss remains the user's card decision, not an inferred reason. Optional comment ≤500 characters. Store the exact content/policy/source revision and actor. Correcting feedback appends/supersedes a revision with the original retained for audit; it does not silently change model weights. Export labeled cases for offline evaluation. Private preferences do not automatically become org-wide policy.

Use existing Pulse feed/accessibility/status primitives; no new dashboard. Show queued/scheduled/unknown/rejected separately from approved and use localized copy. Owner feedback controls are keyboard accessible, error-recoverable and preserve selection on failed save. A committed write with failed refresh is reported without replaying the write.

State checks in migrations: scheduled dispatch requires non-null remote_job_id and admittedAt; indeterminate requires admittedAt and safe reason; published digest requires card ID and immutable result hash; reasoning_received requires stored bounded response/usage; feedback supersession references the same owner/card/content revision and cannot self-reference. Denormalized domain org/owner IDs use scoped checks and restricted deletion, not cascade deletion of admission tombstones. Payloads may be redacted while hashed identity and state survive.

The trusted policy-config reconciliation task records disable/revision changes; membership-deletion handling records owner revocation. Both call one scoped cancellation transaction. Every worker independently rechecks current config/membership before admission/publication even if cleanup has not run. External identity lookup is performed before a short DB transaction and revalidated by rereading the current membership/grant rows in the short transaction; record a snapshot hash for audit, without inventing a global authority-version service; no DB row lock is held across an RPC. Deleting/revoking an owner/policy cancels queued work and bumps job lease generation in the same tenant transaction. Late output cannot publish. Keep bounded raw public evidence and comments for 30 days by default in the pilot; retain only identifiers/hashes and minimal dispatch/admission tombstones as long as an input could otherwise be replayed. To erase a tombstone, first retire the policy/source replay namespace so old triggers cannot recreate it. Do not retain private payloads in general analytics. Export/deletion behavior follows existing org retention obligations; the pilot may shorten payload retention without erasing admission history prematurely.

## 8. Implementation slices and collision control

Each software slice targets 4–8 focused engineering hours plus stated verification. They are not a promise that labeling hundreds of cases or running a qualified live experiment fits that window. The numbered plan is authoritative; no optional extraction is left to an implementer. If newer source invalidates the estimate, revise/split the slice before coding and review the changed dependency contract. Commands below name planned tests/CLI files, not tests already present or run. Hub focused tests use `bunx vitest run`; full repo gates remain separate.

Slices 1–20 repair existing behavior and establish receipts; the independent helper in 19 does not wait for digest development. Slices 21–25 and 32 are the new informational product experiment. Slices 26–31 build qualification tools, including a stub-tested explicit live adapter; human corpus curation and paid/live runs are separate governed operations. Mandatory repair work is not blocked on an optional digest or Factory benchmark.

### Slice 1 — Pending ownership and context adapters

**Topics:** `logic`, `test`

**Dependencies:** none. **Owner/files:** Hub: new pending-submission module; page-context.ts, attachments/draft.ts; reuse model-context:onToolChange.

**DoD A01:** Opaque page-owner disposal cannot clear newer equal text; monotonic context/scope epoch invalidates A→B→A; abort attachment signing without deleting uploads; primitive commits once and stale finally cannot clear newer work.

**Verification:** `bunx vitest run src/lib/assistant/pending-submission.test.ts src/lib/assistant/page-context.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 2 — Home and Floating submission integration

**Topics:** `logic`, `ui`, `test`

**Dependencies:** 1. **Owner/files:** Hub: Home, Floating, chat-rpc.ts optional supplied run ID and explicit return; no gateway wire changes.

**DoD A02:** Deferred routing/upload plus thread/owner/agent/page switch sends zero wrong-scope requests; synchronous busy/disconnect rejection preserves draft; Stop before send sends zero; exact-run abort does not cancel a newer run. Locally submitted with lost acknowledgement remains unknown, not new-ID replay.

**Verification:** `bunx vitest run src/lib/assistant/pending-submission.integration.test.ts; bun run test:critical-journeys`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 3 — Accepted-run callbacks and lineage lifetime

**Topics:** `logic`, `permissions`, `test`

**Dependencies:** 2. **Owner/files:** Hub: bounded accepted-run map, gateway.svelte.ts final handling, dispatch.ts and choice/artifact callers.

**DoD A03:** Duplicate/delayed final, reload, expired record, owner switch and awaited tool cannot execute stale page actions. Full-context callback bypass remains. Context-changing action ends its old batch; a fresh validated follow-up carries completed results and preserves five-follow-up cap.

**Verification:** `bunx vitest run src/lib/assistant/dispatch.ownership.test.ts; bun run test:critical-journeys`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 4 — Router attempt provenance

**Topics:** `logic`, `data`, `test`

**Dependencies:** 1. **Owner/files:** Hub: route endpoint/service, turn-router request helper, observability-context.ts.

**DoD A04:** Early submission UUID is propagated; requested/resolved model, rubric revision, actual elapsed errors and nullable unknown cost pass the real sanitizer. p_sandbox survives. off/bypass has no invented provider attempt; existing off/shadow/enforce vocabulary stays.

**Verification:** `bunx vitest run src/server/services/assistant-router.provenance.test.ts src/lib/server/observability-context.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 5 — Client observation ingestion and task joins

**Topics:** `logic`, `data`, `security`, `test`

**Dependencies:** 3, 4. **Owner/files:** Hub: new api/assistant/decision-events endpoint, bounded client buffer, captureServerEvent allowlist and explicit run relations.

**DoD A05:** Server identity overrides forged actor/org; limits and event enum enforced; buffer abandoned on owner switch; server success/client discard not applied; repeated event IDs dedupe in analysis; missing events lower coverage. Explicit follow-up joins; free text never guesses lineage.

**Verification:** `bunx vitest run src/lib/assistant/decision-lineage.test.ts src/routes/api/assistant/decision-events/decision-events.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 6 — Factory identified decision records

**Topics:** `logic`, `data`, `test`

**Dependencies:** none. **Owner/files:** Factory: runner/src/jev.ts, jev-proxy.ts, agent/lib/jev.sh and agent/rank.sh.

**DoD A06:** Caller logical decision ID survives explicit retries; proxy attempt ID is authoritative and preserved locally; direct calls state origin; old three-argument shell calls work; conflict records cannot override authoritative cost.

**Verification:** `(cd runner && node --import tsx --test src/jev.test.ts src/jev-proxy.test.ts); bash agent/lib/jev.test.sh`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 7 — Factory reconciliation report

**Topics:** `logic`, `data`, `test`

**Dependencies:** 6. **Owner/files:** Factory: scripts/jev-shadow-report.mjs and tests.

**DoD A07:** One $0.01 inference represented twice becomes one attempt/bill/comparison. Conflicts quarantine; legacy rows stay unjoined; unknown costs remain null; model/rubric cohorts and scale compatibility are separate.

**Verification:** `node --test scripts/jev-shadow-report.test.mjs`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 8 — Factory run-keyed admission ledger

**Topics:** `logic`, `security`, `test`

**Dependencies:** 6. **Owner/files:** Factory: runner/src/jev-proxy.ts and capability lifecycle callers; serialize after Slice 6.

**DoD A08:** One inflight per run across token remint; concurrent max_calls=1 admits one; busy consumes no extra inference; malformed debit remains capped; revoked request settles once; unknown spend fences; expiry never frees unresolved exposure.

**Verification:** `(cd runner && node --import tsx --test src/jev-proxy.test.ts)`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 9 — Factory HTTP and hook deadline

**Topics:** `logic`, `security`, `test`

**Dependencies:** 8. **Owner/files:** Factory: runner/src/index.ts Express Jev route, jev-proxy.ts, jev.ts, agent/lib/jev.sh and hook.

**DoD A09:** Signal/remaining budget reaches fetch/body; delayed headers/body and client disconnect are bounded/unknown; hook wait stays within 6s with max4s semantic budget; local floor denies immediately. Actual installed harness version/proxy-delay proof required.

**Verification:** `(cd runner && node --import tsx --test src/jev-deadline.test.ts); bash agent/lib/jev.test.sh; bash agent/hooks/jev-guard.deadline.test.sh`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 10 — Canonical source carrier and Telegram constituents

**Topics:** `logic`, `data`, `test`

**Dependencies:** none. **Owner/files:** Gateway: plugins/types/hooks.ts, auto-reply/templating.ts, dispatch-from-config.ts, channels/fire-message-inbound.ts, Telegram bot-handlers.ts and bot-message-context.ts.

**DoD A10:** Optional typed provenance survives raw/received paths; same raw account/chat/message identity is preserved; debounced batch retains ordered originals, not last-ID alias. Producer fixtures certify Telegram; unsupported adapters remain explicitly uncertified.

**Verification:** `pnpm exec vitest run src/auto-reply/reply/dispatch-provenance.test.ts src/channels/impl/telegram/inbound-provenance.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 11 — Watcher adapters and stable admission identity

**Topics:** `logic`, `data`, `test`

**Dependencies:** 10. **Owner/files:** Gateway: watcher index.ts, dedup.ts, envelope.ts; no external langgraph-server changes.

**DoD A11:** Cross-chat equal IDs stay distinct; dual hooks bind one source; policy revision changes resume old admission; same immutable ID/different bytes conflicts; verified edit/new explicit reevaluation is distinct; legacy flow/manual calls stay fresh and cannot assert trusted origin.

**Verification:** `pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/src/provenance.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 12 — Classification receipt store and state machine

**Topics:** `logic`, `data`, `migrations`, `test`

**Dependencies:** 11. **Owner/files:** Gateway watcher: store.ts, migrate.ts, new classification-work.ts, real temporary alerts.db.

**DoD A12:** Atomic unique claim, lease generation, capped attempt history, nextAttemptAt and all terminal states; known invalid result records usage then fails; negative completed state survives; raw payload retention leaves replay tombstones; concurrent/process-restart claims use real SQLite.

**Verification:** `pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/src/classification-work.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 13 — Classification dispatcher and handler integration

**Topics:** `logic`, `data`, `test`

**Dependencies:** 12. **Owner/files:** Gateway watcher: bounded lifecycle dispatcher plus hook/classifier and legacy RPC adapters.

**DoD A13:** 5s poll/30s lease/10s renew, one active classifier, safe retry5s/30s cap3; admitted crash unknown; received restart no recall; revoked policy cannot dispatch; receipt refs scope/input checked. Hook custom policies remain supported; flow origin remains uncertified.

**Verification:** `pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/classification-recovery.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 14 — Caller-managed delivery bridge

**Topics:** `logic`, `data`, `test`

**Dependencies:** 12. **Owner/files:** Gateway watcher recipient receipt store and bridge to deliver.ts, delivery-queue-store/files/recovery; reuse queueId and caller completion.

**DoD A14:** SQLite admission precedes queue; existing matching queue reconciles under lease; terminal queue survives until SQLite settlement then acknowledgeCallerManagedDelivery; missing/mismatched admitted evidence never re-enqueues; crash at each cross-store boundary is injected.

**Verification:** `pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/src/delivery-bridge.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 15 — Watcher recipient dispatcher and legacy cutover

**Topics:** `logic`, `data`, `migrations`, `test`

**Dependencies:** 13, 14. **Owner/files:** Gateway watcher: destinations.ts, index.ts, positive/suggestion result publication and old pending boot retry.

**DoD A15:** Success recipient never repeats when another fails; first confirmed send stamps hook cooldown once; source count once; current recipient authorization checked before queue admission; old pending rows migrate legacy-unreconciled and cannot fan out. Recovery after admission has documented revocation limit. Kill after suggestion admission/result/recipient materialization: no second suggestion call, unknown uses explicit empty fallback. Expired queue copies are redacted with tombstones preserved; expired queued input cancels.

**Verification:** `pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/src/delivery-recovery.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 16 — Per-invocation resolved-model usage

**Topics:** `logic`, `test`

**Dependencies:** 13. **Owner/files:** Gateway: opt-in DroneHost wrapper, classifier.ts and reply-flow/suggestions-drone.ts, both hook and flow callers.

**DoD A16:** One priced record from returned resolvedModel; overlapping classifier/suggestion A/B and fallback A→B correct; missing result or unreported retry bill preserves unknown/incomplete coverage; inferred host price suppressed only for opted-in runs. SDK signature unchanged and exact installed result seam qualified.

**Verification:** `pnpm exec vitest run src/drones/host.test.ts; pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/src/usage-finalization.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 17 — Pulse revisions and dispatch storage

**Topics:** `data`, `migrations`, `security`, `test`

**Dependencies:** none. **Owner/files:** Hub: Pulse schema/service/migrations/seed and new dispatch store.

**DoD A17:** Real PG concurrent transaction yields one dispatch per proposal revision; payload frozen; org/owner constraints; edit/version conflict; state-dependent fields/FKs; legacy informational data preserved. Deletion cannot cascade away admission tombstones.

**Verification:** `bunx vitest run src/server/services/pulse-dispatch.store.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 18 — Pulse atomic approval and authoritative receipts

**Topics:** `logic`, `permissions`, `ui`, `test`

**Dependencies:** 17. **Owner/files:** Hub: POST/PATCH, receipt GET, recent-decision service/query and existing Pulse cards.

**DoD A18:** Concurrent approve/edit/dismiss has one winner; executable stale/missing revision refreshes; duplicate approve returns receipt; informational kind no dispatch. Approve→refresh/reconnect still shows queued/unknown state under owner-only receipt access; business pilot rejected. Keyboard/save-refresh proof and UI lints.

**Verification:** `bunx vitest run src/routes/api/pulse/proposals/pulse-approval.test.ts; bun run test:critical-journeys`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 19 — Selected due-job worker primitive

**Topics:** `infra`, `logic`, `test`

**Dependencies:** none. **Owner/files:** Hub: bg-runtime candidate query, narrow postponeUntil result, authenticated scoped tick handler and handler registration.

**DoD A19:** Filter type/org/dueAt before LIMIT and repeat due-time predicate in atomic claim; stale snapshot/direct advance after another worker postpones is rejected and not counted; unrelated oldest backlog never claimed; skipped rows not advanced; future bounded postpone releases current lease; only registered Pulse families use new retry contract; default jobs tick unchanged.

**Verification:** `bunx vitest run src/server/services/bg-runtime.test.ts src/server/services/bg-runtime.selection.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 20 — Strict Pulse dispatch execution

**Topics:** `security`, `logic`, `infra`, `test`

**Dependencies:** 18, 19. **Owner/files:** Hub: strict credentials/personal-agent/session resolver and dispatch handler. Gateway: cron explicit-agent/session admission and execution validation in server-cron and cron handlers.

**DoD A20:** Two profiles on one gateway target exact agent/session; omitted general-cron ID still defaults, explicit unknown/deleted ID never does; no ambient credentials/external announcement. Lost RPC/post-RPC failure stays indeterminate with no retry; valid remote ID scheduled only. Qualification gates Hub activation on compatible gateway.

**Verification:** Hub: `bunx vitest run src/server/services/pulse-dispatch.worker.test.ts`. Gateway: `pnpm exec vitest run src/gateway/server-core/server-cron.binding.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 21 — Bounded digest policy and source snapshots

**Topics:** `logic`, `security`, `data`, `test`

**Dependencies:** none. **Owner/files:** Hub: new narrow pulse-digest policy/source modules and official-source/dependency fixtures.

**DoD A21:** Verified personal owner; <=5 sources/20items/48KiB evidence; deterministic unchanged content no reasoning; safe destination/body/time checks; pinned dependency/file anchors; failed fetch no cursor advance; disabled/zero spend default.

**Verification:** `bunx vitest run src/server/services/pulse-digest.sources.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 22 — Digest admission and budget storage

**Topics:** `data`, `migrations`, `infra`, `test`

**Dependencies:** 17, 19, 21. **Owner/files:** Hub: digest run/source/admission tables; transaction-taking enqueue and namespace budget lock.

**DoD A22:** Duplicate input one run/job; distinct snapshots compete for one owner slot and last daily allowance; UTC rollover/policy change cannot reset unknown fence; reservation+reasoning admission atomic; stale settlement cannot release successor; current policy/owner required.

**Verification:** `bunx vitest run src/server/services/pulse-digest.admission.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 23 — One-request reasoning and recovery

**Topics:** `logic`, `data`, `security`, `test`

**Dependencies:** 22. **Owner/files:** Hub: typed no-tool reasoning handler, result/usage settlement and explicit retry/error transitions.

**DoD A23:** SDK retry/fallback disabled; one admitted external request; unknown response/bill fences namespace; known invalid response records bill then fails; received restart no recall; lease/authority loss blocks later commit; no live calls in tests.

**Verification:** `bunx vitest run src/server/services/pulse-digest.reasoning.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 24 — Atomic digest publication

**Topics:** `data`, `logic`, `test`

**Dependencies:** 23. **Owner/files:** Hub: transaction-taking internal Pulse insert/readback helper, reserved-key ingress validation, digest cursor/job finalization.

**DoD A24:** Same owner/run/content conflict returns same card; mismatched binding rolls back; reserved public key rejected; decided card immutable; cursor CAS cannot regress; one card/cursor/job transaction after crash; no-signal no card; claim support separately evaluated.

**Verification:** `bunx vitest run src/server/services/pulse-digest.publication.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 25 — Reasoned Pulse feedback and export

**Topics:** `data`, `ui`, `test`

**Dependencies:** 18, 24. **Owner/files:** Hub: feedback schema/API, existing card controls and scoped export adapter.

**DoD A25:** Reason independent from approve/dismiss; versioned actor/content/policy/source reference; repeated action idempotent; correction supersedes same-owner record; old content/cross-owner denied; committed-refresh-failed never replays. Export separates preference from factual error, no automatic learning.

**Verification:** `bunx vitest run src/server/services/pulse-feedback.test.ts; bun run test:critical-journeys`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 26 — Fixture trajectory runner and receipts

**Topics:** `test`, `logic`, `data`

**Dependencies:** 3, 5. **Owner/files:** Meta: scripts/agent-evals/run.mjs, lib/manifest.mjs and tests; Hub existing critical-journeys synthetic HTTP/WS adapters.

**DoD A26:** Default fixture mode denies network; three arms reset identical data and capture append-only events/receipts; small synthetic episodes cover joins/missing receipts/zero budget. Explicit live approval parser rejects missing permission/cost bound. No Factory/digest prerequisite.

**Verification:** `node --test scripts/agent-evals/run.test.mjs; node scripts/agent-evals/run.mjs --mode fixture --manifest audits/2026-10-22-agent-use-transcripts/spec/fixtures/smoke-manifest.json`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 27 — Corpus schema and labeling workflow

**Topics:** `test`, `data`

**Dependencies:** 26. **Owner/files:** Meta: scripts/agent-evals/corpus.mjs, fixture schema, small validated example set and labeling/holdout protocol.

**DoD A27:** Reject missing truth/permissions/receipt expectations, duplicate episode leakage and exposed holdout in dev mode; bilingual strata/compaction represented by fixtures; import and readiness report count human-adjudicated labels. Creating/adjudicating 300 episodes is a separate governed operation, not claimed inside this 4–8h software slice.

**Verification:** `node --test scripts/agent-evals/corpus.test.mjs; node scripts/agent-evals/corpus.mjs validate --input audits/2026-10-22-agent-use-transcripts/spec/fixtures/corpus`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 28 — Deterministic outcome/economics report

**Topics:** `test`, `logic`, `data`

**Dependencies:** 26, 27. **Owner/files:** Meta: scripts/agent-evals/report.mjs and seeded synthetic outcomes; no provider calls.

**DoD A28:** Cluster-paired bootstrap reproducible; cheaper but less-successful arm can fail cost-per-success gate; critical violation veto; missing/unbounded cost and zero success nonpromotable; drift-separated cohorts; correct expansion/stopping metadata. Small fixtures prove tool, full holdout remains separately operated.

**Verification:** `node --test scripts/agent-evals/report.test.mjs; node scripts/agent-evals/report.mjs --run <fixture-run-directory>`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 29 — Trace screening fixture experiment

**Topics:** `test`, `data`, `logic`

**Dependencies:** 5, 28. **Owner/files:** Meta: scripts/agent-evals/screen.mjs plus seeded trace faults and independently versioned labels.

**DoD A29:** Deterministic receipt faults first; semantic abstain preserved; random apparently-good controls retained with weighting; fixed-review-budget yield/miss estimates; no billing/release authority. Fixture proof independent of digest UI; optional Pulse feedback import uses Slice25 only when enabled.

**Verification:** `node --test scripts/agent-evals/screen.test.mjs`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 30 — Conditional complaint census and shadow seam

**Topics:** `test`, `logic`, `data`

**Dependencies:** 11, 13, 15, 16, 28. **Owner/files:** Gateway watcher eligibility/census/shadow adapter; meta evaluation fixtures/report; no live activation.

**DoD A30:** Default-policy+certified source only; custom/idless/model-drift bypass; census no eligible traffic stops; shadow baseline always runs; timeout never negative; gate+forwarded+retry/unknown costs use logical source denominator. Frozen threshold/severity miss bounds required before paid holdout or active promotion.

**Verification:** `pnpm exec vitest run --config vitest.extensions.config.ts extensions/alert-watcher/src/jev-shadow-eligibility.test.ts`. Apply the affected repository gates in §11; UI slices also require design/token lint and mounted/browser evidence.

### Slice 31 — Explicit live inference adapter with fixture-only tools

**Topics:** `test`, `security`, `logic`, `data`

**Dependencies:** 26, 27, 28. **Owner/files:** Meta: scripts/agent-evals/lib/live-provider.mjs, runner transport selection and stub transport tests; reuse Slice26 disposable tool/HTTP/WS fixtures.

**DoD A31:** A valid approved manifest exercises the complete live-mode path with stub transport; missing/expired approval, unknown exposure, exhausted budget or model/fixture drift dispatches zero requests. Allowlisted provider endpoint only; every actual attempt reserves exposure before dispatch and persists terminal/unknown receipt. Disable automatic SDK retry/fallback; no automatic replay of ambiguous requests. Live mode changes inference transport only: tools still operate marked disposable fixture state, never production business endpoints. Production credentials are neither discovered nor inferred. Actual paid execution remains a separate approved operation.

**Verification:** `node --test scripts/agent-evals/live-provider.test.mjs scripts/agent-evals/run.test.mjs`. Tests use stub providers and deny external network, including valid-manifest and budget-exhaustion cases. Apply the affected repository gates in §11.

### Slice 32 — Scheduled digest source collection and cold-start wiring

**Topics:** `infra`, `logic`, `security`, `test`

**Dependencies:** 19, 21, 22, 24. **Owner/files:** Hub: pulse-digest collection helper, admission-row poll fields, GET api/pulse/tick, hooks auth allowlist; deployment cron template/runbook using existing secret management.

**DoD A32:** Configured personal-owner only, default disabled; authenticated minute tick collects initially then every15min with durable30s generation lease, <=15s aggregate fetch and no cursor advance. Two simultaneous ticks and restart/expired lease enqueue one logical run; failed/partial fetch records failure and waits5min; revoked owner/policy cannot enqueue. With browser/CLI clients closed and initially empty queue, scheduled stub source change produces a visible card through selected worker; unrelated backlog untouched. Missing schedule means unqualified activation. Real cron installation is a separately authorized deployment operation.

**Verification:** `bunx vitest run src/server/services/pulse-digest.collection.test.ts src/routes/api/pulse/tick/tick.test.ts; bun run test:critical-journeys`. Apply the affected repository gates in §11; retain cron installation/cold-start evidence at deployment.

### 8.1 Collision and fleet impact

One owner at a time for Home/Floating/chat-rpc, watcher index/store/destinations, Factory jev-proxy/jev.sh, Hub bg-runtime/pulse.service and gateway cron binding. Slices sharing a file serialize even if their conceptual lanes are independent. Gateway canonical hook metadata is additive/optional; inventory all plugin type consumers. Only certified raw+Telegram paths get cross-hook guarantees; external langgraph flow producers remain outside this spec.

Exact-run abort reuses existing wire fields. The cron change deliberately tightens existing explicit-agent semantics: all supplied invalid/deleted agent IDs fail instead of falling back, while omitted IDs keep defaults. Audit affected scheduled jobs and test existing generic cron consumers. Update shared package declarations/Hub/Site/Paperclip consumers only if an actual public type changes; no extra protocol field is planned. Hub must refuse new executable admission until its gateway is qualified for the binding contract. PostgreSQL migrations belong to Hub; SQLite migrations belong to the gateway watcher. Resolve per-repo branch roles from repo-policy at execution time, not this document's historical source pins.

## 9. Experiment protocols and promotion gates

### 9.1 Common run manifest

Before any non-fixture inference, write an immutable run manifest containing source/dependency lock hashes, model requested/resolved identity, tool/catalog/data fixture revision, classifier questions and threshold revision, random seed, development/holdout split, task/scoring rubric, per-call/run/day spend limits, actor/org/data scope, permitted side effects, retention and stop conditions. Missing approval reference or a zero/unknown budget means no network admission. Use existing provider/accounting adapters; the evaluation must not discover credentials and run automatically during ordinary tests.

The evaluator exposes explicit `fixture` and `live` modes; fixture is default and denies network. A live command requires `--live`, a validated manifest and its approval reference. Slice31 implements this actual transport path and tests acceptance with a stub provider; until it lands, the runner rejects live mode explicitly. The tool environment remains the same marked disposable fixture environment in both modes. No new production QA account/credential resolver is introduced. No publication/send/mutation tools outside disposable test data are available. The model adapter must enforce its configured request/output limits (maximum 1,024 generated tokens for the digest or a verified provider-equivalent bound); pricing/exposure assumptions are versioned in the approved manifest. Unknown price or an unsupported bound blocks admission. This is an accounted exposure control, not a guarantee against a provider billing outside its published contract. The first live smoke is at most one case per arm within the approved cap; continue only after receipts and cost coverage are verified. A failure to prove receipt/budget integrity stops the run.

Report wall time, all attempts/retries/discovery calls, requested/resolved model, token/cache usage where provided, known bill coverage and unresolved exposure. Cost per successful task includes the costs of failed/canceled/indeterminate attempts in the cohort numerator; separately report per-attempt and per-started-task cost. Do not compare a candidate's cheap successes while discarding its failures. If unknown exposure lacks a defensible bound, cost superiority is inconclusive.

### 9.2 Router trajectories

Use twelve task families spanning informational questions, lookup, authorized form fill, multi-intent navigation, off-page tool discovery, UI choices, artifact callback, short continuations, changed pages, compacted/history-limited sessions, tool/provider failure and cancel/scope transitions. Freeze at least 60 development and 240 held-out episodes, with both Spanish and English in each applicable family and at least 40 consequential-action episodes. These are proposed evaluation sizes, not observed evidence. Larger samples may be required to resolve uncertainty; freeze expansion rules before inspecting results.

Each episode specifies initial tenant/role/state, all user turns, allowed/forbidden tools, expected domain receipts/artifacts, source truth, terminal criterion and maximum effort. Run three arms: current full context; current Jev routing; deterministic core plus existing discovery. Pin the same main model/tools/data; reset disposable state per arm and randomize order to reduce provider/time effects. Preserve callback bypasses in every arm. Do not optimize a candidate on holdout results and then reuse that holdout as validation.

Proposed promotion tolerances: zero additional unauthorized/wrong-scope/duplicate/canceled actions in deterministic regression and held-out cases; paired 95% lower confidence bound for task success difference no worse than −2 percentage points; paired 95% upper bound on the cost-per-successful-task ratio below 1; p95 latency ratio no greater than 1.10 under the prespecified bootstrap procedure. For each arm compute `sum(all cohort costs)/count(successful episodes)`; each bootstrap draw resamples matched episode clusters and recomputes the whole candidate/baseline ratio, never means of per-success costs. Use 10,000 seeded paired cluster bootstrap draws with percentile 95% intervals, preserving any repeated runs within an episode cluster; freeze seed/expansion rule before unblinding. Zero successes or unbounded unknown bills are non-promotable; bounded unknown exposure uses the adverse bound. Apply the same paired cluster method to success difference and the p95 latency ratio. Synthetic cheaper-but-less-successful data must fail when its cost per success rises. These are acceptance choices for review, not claims about model quality. Critical failures veto promotion regardless of averages. Insufficient power, incomplete bills or drift means keep the baseline and report inconclusive. No continuation-state or model-routing implementation follows automatically from an unsuccessful arm.

### 9.3 Trace screening

Begin with deterministic fixture receipts: unauthorized tool, missing action receipt, hidden tool failure, duplicate external action, post-cancel send and unsupported cited ID. Semantic checks cover only requirements those receipts cannot settle, such as answering the requested question or support for a prose claim. Rubric returns independent typed outcomes with abstention; no averaged score can erase an authority violation.

Create a separately labeled, frozen trace set with successful, failed and uncertain cases. A stronger reviewer/human labels without seeing the screening result. At a fixed review budget compare random sampling versus screen-prioritized review plus a seeded random control sample from apparently good traces. Pre-register control sample size, severity-specific maximum miss bounds and budget in the manifest; absence blocks promotion. Report confirmed failure yield and weighted missed-failure estimates with uncertainty. Screening failure never changes customer output or billing. This slice can conclude with no value demonstrated.

### 9.4 Complaint census and default-rubric pilot

Census first: enabled plugin, matched subscriptions, authoritative source unit, default-policy hash, logical messages, positive/negative/failed/unknown results and baseline usage. No eligible traffic is a valid “do not pilot” result. Configured custom prompt/rubric/category policies, missing provenance or unqualified model revision bypass Jev. The classification unit remains the single trigger message.

Shadow runs both gate and baseline without changing delivery. Gate result includes abstain/unavailable and policy/model version. Select a threshold only on development data; freeze it and severity criteria before revealing holdout. Required promotion conditions are no confirmed additional urgent/critical miss in tested cases, a pre-registered upper miss bound per severity stratum supported by sample size/confidence intervals, and lower total cost per successfully handled logical event after gate, forwarded work, retries and unknown exposure. Default active status is disabled; unspecified tolerated miss bounds mean no active promotion. Zero misses on a tiny sample is not sufficient.

During any later approved active pilot, uncertain/model-drift/timeout/malformed results retain the original classifier path within its total deadline. If the gate consumed the remaining deadline, record unavailable/retry policy rather than invent a negative. Negatives produce the exact public no-op envelope and a receipt; they must not suppress unrelated policies/flows. Disable the gate instantly on authority/identity error, an additional critical miss, budget ambiguity or model drift. Existing summaries/evidence remain generated for forwarded cases.

### 9.5 Feedback qualification

Export factual-error reasons separately from relevance/preference reasons and preserve actor/content/source/policy revisions. An offline report may propose a bounded policy edit, but this spec does not apply it automatically. Evaluate proposed weights on a held-out set and show which cases change. No new “learning service” or general preference database is needed.

## 10. Migration, rollout and rollback

1. **Preflight:** reconcile source pins/collisions, install exact declared dependencies in isolation, run red regression cases, inventory actual active workers/flags without copying credentials into artifacts. Verify the registry branch roles at execution time.
2. **Expand:** additive nullable metadata and receipt tables, unique constraints and service/RLS checks; new readers tolerate legacy records. Validate migrations/seeds twice on disposable databases. Never backfill invented success, origin, costs or remote receipts.
3. **Ship repairs with feature behavior unchanged:** pending ownership/cancel, telemetry, Factory logs/report/bounds and alert identity. Correlation rollout is client/server backward compatible; unknown legacy coverage stays visible.
4. **Cut over receipt consumers:** pause the affected watcher dispatcher, reconcile old pending delivery rows, enable new claim/receipt path, then resume. Pulse executable path requires schema, API, strict worker and UI receipt handling together; until ready it remains disabled or uses the current path only under an explicitly documented existing operational posture—never dual-dispatch the same proposal.
5. **Pilot targeted informational jobs:** choose one owner/org/source policy and explicit approved spend; prove selected worker isolation and crash/lease behavior with stubs first. No notification blast, external WhatsApp send or automatic action is part of the digest pilot; publication is an in-app informational card.
6. **Observe:** retain exact source/build/deployment identity, owner-approved flags, data migration receipt, run IDs, counts/unknown outcomes, resource load and rollback decision. A useful digest must show evidence-backed affected dependency and an actionable next step; useless/no-signal outcomes remain visible in run records.
7. **Evaluate/promotion:** paid runs and active classifier changes require their own manifest/evidence decision. This spec's approval does not substitute for those receipts.

Rollback is behavior-first and data-preserving. Disable new pilot admission/gate, cancel queued scoped jobs and keep receipt readers/tombstones. Preserve admitted/indeterminate entries; never reset them to pending or drop a unique key to “unstick” work. A canceled/fenced submission fix is not rolled back to wrong-scope sending; revert to full-context routing if classifier integration fails. Unknown Factory bills stop new shadow calls but do not block deterministic floor denial or baseline task execution. Legacy binaries that ignore new receipts must not resume old auto-retry paths; drain or disable the affected worker before rollback. Schema removal is a separate migration after retention/reconciliation.

## 11. Verification and release evidence

### 11.1 Commands and environment

Follow each pinned/current repository's instructions. The following are existing entrypoints; new focused test names in §8 must be created by their slices.

| Area | Required checks |
|---|---|
| Meta artifacts | `node scripts/spec-index.mjs` then `node scripts/spec-index.mjs --check`; corresponding proposal generator/check; link and acceptance-matrix validation |
| Hub | targeted `bunx vitest run <test-files>`; `bun run check`; `bun run test`; `bun run build`; for UI changes `bun run lint:design && bun run lint:tokens` |
| Gateway | targeted `pnpm exec vitest run --config vitest.extensions.config.ts <alert-tests>` or the owning suite's declared config; `pnpm check`; `pnpm tsgo`; affected regression suites |
| Factory | `node --test scripts/jev-shadow-report.test.mjs`; runner's declared TS test command for `jev`/proxy; `bash agent/lib/jev.test.sh`; isolated guard tests; declared runner build/typecheck gates |

Use the existing local Hub test stack (Supabase loopback 54421/Postgres 54422/app 5199 where applicable). Create/reset only disposable fixture tenants/databases. Exact port/environment conflicts are resolved before running; never point migration or chaos tests at production. Do not symlink an old dependency install and call it exact-SDK qualification. Record actual lockfile and package versions.

### 11.2 End-to-end acceptance scenarios

- **E1 submission:** mounted Home and Floating, delayed classifier/enrichment, A→B→A, Stop before dispatch, Stop after acknowledgement, unmount and stale callback; assert actual WS calls and retained drafts. Run `bun run test:critical-journeys` for the mounted fixture and use the project browser-harness skill for inspection/screenshots; browser evidence is required for Stop/receipt UI, not extracted-function probes alone.
- **E2 decision accounting:** one routed user request, a UI-tool follow-up and provider retry produce distinct attempts joined to one explicit episode; client-discarded route is excluded; unknown bills are visible; sanitizer retains every allowlisted contract field.
- **E3 alerts:** two chats with same ID, dual hooks, Telegram batch, custom flow, provider pre-send failure, accepted-response loss and split-recipient success; restart process between each classifier/suggestion/recipient receipt boundary and verify exact invocation/delivery counts, explicit empty-suggestion recovery, SDK validation failure and queue-copy retention.
- **E4 Pulse dispatch:** concurrent approve/edit, RPC success/local failure, worker death after admission, revoked principal, removed gateway assignment; zero automatic replay from unknown, no ambient credential fallback, status never claims execution from scheduling.
- **E5 digest:** close clients with an empty queue; scheduled authenticated source poll finds a changed fixture; submit duplicate tick/trigger; restart before/after inference receipt and during publication; lose lease; advance competing source cursor; revoke owner; reconnect. Exactly one visible card for a qualified logical run, no duplicate paid attempt after unknown admission, authoritative status survives reconnect, unrelated queues stay untouched.
- **E6 migration/rollback:** legacy rows with absent receipts remain explicit; upgrade twice is safe; rollback preserves tombstones and blocks old fan-out; source retention/deletion cannot recreate a paid attempt.

Unit/property tests prove parsing/state-machine rules. Database integration tests prove actual uniqueness/locking/transactions; mocked repositories cannot substitute. Provider stubs prove ordering/ambiguity handling. Installed harness/browser tests prove cancellation/status UX. A separately approved live smoke establishes provider/runtime integration but not accuracy. Held-out experiments establish only their measured task distribution, not universal agent reliability.

### 11.3 Security and privacy review

| Threat | Required mitigation / proving case |
|---|---|
| Stale or forged client identity | Server authority plus local generation fence; forged correlation/provenance cannot cross org or choose a gateway |
| External text as instruction | Immutable untrusted evidence, structured outputs, no model tools in digest; malicious release text cannot expand source list or execute a tool |
| Retry duplicate or budget evasion | Atomic admission/unique effects; unknown outcomes fenced; token remint keeps live run spend; cross-worker tests |
| Credential fallback | Strict org/profile/assignment resolution; absent scoped credential rejects; explicit test with ambient credential configured |
| Unauthorized data retention | Bounded approved fixture/public source storage, scoped feedback access, deletion/retirement protocol and no raw customer analytics |
| SSRF and source growth | Allowlisted destinations, private-address/redirect/byte/time limits, no arbitrary fetch tool |
| Misleading success/cost | Separate approved/scheduled/executed; known/unknown spend and observed/applied/terminal records |

### 11.4 Completion and review gates

Each slice must map to its acceptance ID, checked source SHA, red-before/green-after regression where meaningful, full relevant repo checks, independent code review and required runtime evidence. Preserve the proposal ledger until product fixes are verified; source comments alone do not close defects. No open edge case may disappear into chat: use the repository's `TODO(handoff)` plus proposal rule if implementation leaves one.

Technical pass 1 reviews contracts, traceability and all impacted callers. Technical pass 2 independently challenges correctness, safety, concurrency, slice size, collision handling and unnecessary abstractions. The sidecar records findings/dispositions and hashes of the reviewed spec; later substantive edits require review again. G2 scoring follows the six canonical axes. Human approval/merge remain required for security/data changes. Published indices project state but do not confer approval.

## 12. Ponytail decisions

| Reuse / cut | Why sufficient now | Upgrade trigger |
|---|---|---|
| Existing submission/run idempotency key | Joins routing without new gateway identity protocol | Only if measured callbacks cannot carry explicit lineage |
| One client preparation helper | Both surfaces share the same asynchronous ownership rule | No general state-machine framework planned |
| Factory single inflight per run | Bounds admission with small local bookkeeping; callers already fall back | Proven throughput loss and a reviewed multi-inflight reservation design |
| Existing watcher SQLite + two receipt tables | Plugin owns its work and restart lifecycle | Actual multi-host shared watcher ownership requirement |
| Domain Pulse dispatch/digest rows | Existing effect table is embedding-specific | A second concrete domain proves a shared receipt API would delete duplication |
| One tool-free model call and ≤5 official sources | Produces dependency-impact cards with bounded exposure | Repeated evidence that missing source/research capability blocks useful outcomes |
| Existing Pulse cards and reasoned feedback | Review surface already exists | Validated need that cannot be represented by current card/API |
| No automatic weight learning or new continuation state | Current evidence does not justify them | Held-out failures or utility evidence after simpler changes |

Limits here are deliberate, testable and visible. None permits weaker authority, silent data loss or false claims of completion. The reviewed design is now in implementation under the owner authorization in §0. Slice-level implementation evidence is recorded separately; merge, deployment and live qualification retain their own gates.
