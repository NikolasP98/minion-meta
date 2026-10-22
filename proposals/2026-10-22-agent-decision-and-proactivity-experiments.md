---
id: 2026-10-22-agent-decision-and-proactivity-experiments
title: Qualify existing agent decisions and durable execution boundaries
status: in-spec
created: 2026-10-22
updated: 2026-10-22
repos: [minion, minion_hub, minion-factory]
tags: [logic, test, security, data]
value: 8
effort: L
source: audits/2026-10-22-agent-use-transcripts/README.md
---

# Qualify existing agent decisions and durable execution boundaries

The owner requested practical improvements from the Jev harness and durable news-agent transcripts, then deeper validation against current code. [Revalidated research](../audits/2026-10-22-agent-use-transcripts/README.md) supersedes the first ranking. This proposal is now in specification: source review and offline reproductions establish repair candidates, not deployment incidence or measured model quality.

## AS-IS

Pinned sources: Hub master `b677a5d91a2b653211a1655465b2b5fd398efc2a`; gateway DEV `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18`; Factory dev `43a174b2e87c4d572ffd2ba030269db22a0b7bd2`.

Hub already batches Jev context decisions. Gateway retains prior composed turns and supports progressive tool discovery. UI-choice callbacks already bypass classification with full context. Isolated short-reply classification does not establish task-context loss. Pending turn ownership and cancellation instead fail concrete offline probes; a calibration probability is removed by analytics sanitization; outcome joins and unknown-cost accounting are incomplete.

Factory already shadows Jev decisions. Its report merges central and per-run records without a shared inference identity, loses model/cost provenance, and counts missing cost as zero. Its proxy can exceed a per-run call cap through concurrent requests, and its timeout differs from the hook's remaining budget. Rank requires generated rationale/evidence and readiness/recommendation fields beyond the shadowed score axes.

Alert-watcher is optional, unsubscribed by default and permits custom rules. Event identity/retry defects precede a new gate. Gateway cron persists schedules but does not resume arbitrary workflow steps. Hub has generation-fenced jobs and specialized effect receipts, while Pulse already provides informational digest cards and review actions. They are not yet an integrated dependency-impact workflow. Executable Pulse approval can create duplicate remote jobs before recording approval. The default jobs tick intentionally does not advance background jobs.

[Router evidence](../audits/2026-10-22-agent-use-transcripts/revalidation/router/report.md), [filter evidence](../audits/2026-10-22-agent-use-transcripts/revalidation/filter/report.md), [Factory evidence](../audits/2026-10-22-agent-use-transcripts/revalidation/factory/report.md), [durability evidence](../audits/2026-10-22-agent-use-transcripts/revalidation/durability/report.md) contain exact source anchors and test boundaries.

## TO-BE

A submitted request remains bound to its validated actor/org/agent/thread and context revision while asynchronous preparation runs. Stop cancels unaccepted work and targets an accepted run correctly. Task evaluations join applied routing decisions to all attempts and final receipts, preserving unknown costs and model/policy revisions. Inference budgets reserve before dispatch.

A bounded proactive job persists accepted intent, phase progress and effect receipts; unknown paid/remote outcomes are reconciled or explicitly fenced. A logical task yields one informational review artifact. Feedback refers to that artifact, source and policy revision. Classifier outputs do not grant capabilities or replace approval.

## DELTA and order

| Slice | Minimum change | Acceptance evidence |
|---|---|---|
| 1. Submission integrity | Pending-generation identity spanning both assistant surfaces, routing/context preparation, scope changes and cancellation | Mounted actual components with deferred route response: thread/agent/org/page change, unmount, Stop before/after acceptance, new send after cancellation; no wrong-scope or canceled send |
| 2. Decision evidence | Turn/task correlation, applied-decision event, model/rubric revision, elapsed errors and unknown-cost fields; Factory inference dedup/provenance | Producer-through-sanitizer contract; one inference vs multiple log records; task with retry/follow-up joins correctly; missing bill remains unknown |
| 3. Existing bounds and effect defects | Resolve ledgers below in their owning repositories | Focused adversarial regressions; real boundary tests before rollout |
| 4. Router qualification | Frozen bilingual multi-turn development/holdout corpus: full context vs existing routing vs minimal core+discovery | Correct task receipts, recall, corrective/discovery calls, cache/billed usage, latency and human intervention; compaction/page/scope/callback cases |
| 5. Informational proactivity | Targeted job handler plus typed receipts and Pulse digest/fyi publication with logical dedup/cursor commit | Duplicate triggers, lost lease, crash after provider acceptance/result/publication, worker restart, revocation and reconnect; one artifact, unknown outcomes fenced |
| 6. Conditional expansion | Rule-compatible complaint gate, trace screening and reasoned feedback experiments | Prove eligible volume/rubric first; independent labels and held-out outcomes; total economics include all attempts; random controls for missed failures |

New task-state machinery, automatic feedback weight changes, model routing and a replacement durable-agent runtime are deferred until evidence warrants them. Gateway's uncalled workflow/router utilities are not shipped integration. Do not enable global `?jobs=1` for a pilot: target handler selection, backlog/fairness, concurrency and retry behavior explicitly. The embedding receipt helper needs a typed extension; Pulse publication needs a transaction-taking helper to commit with cursor progress. Informational acceptance must stay distinct from executable approval.

## Open defect ledger

All findings below are source/offline-confirmed. They remain unrepaired in product code. Comment-only `TODO(handoff)` patches are stored beside the evidence and applied solely to disposable source snapshots. Integration of these comments and fixes into repository branches remains part of the implementation slice; this research does not claim shipment. Preserve unrelated WIP.

### Router ownership and measurement

| ID | Current gap and exact owner | Required transition and test |
|---|---|---|
| R1 | Home `src/routes/(app)/home/+page.svelte` and Floating `src/lib/components/layout/FloatingAssistant.svelte`: mutable thread/agent/page read after route await | Freeze validated submission identity; invalidate/revalidate before send; defer route and switch contexts in actual component fixtures |
| R2 | Floating `stopReply` aborts only gateway chat while pending route later sends | Invalidate pending generation/abort route, then exact accepted run; resolve old route after Stop and a new request |
| R3 | Hub `src/lib/server/observability-context.ts` drops route producer `p_sandbox` | Add bounded field to existing allowlist and producer-through-sanitizer regression |
| R4 | Router endpoint/service and chat transport lack an unambiguous applied-decision/task join; null failure costs/durations become zero | Correlation plus applied/fallback/canceled result, model/policy and unknown accounting; test timeout server-result/client-fallback disagreement |

R1–R3 patches: [router handoff](../audits/2026-10-22-agent-use-transcripts/revalidation/router/handoff-comments.patch). R4 is a proposed measurement contract extension, not a claim that an existing cross-run join regressed.

### Alert eligibility and accounting

| ID | Current gap and exact owner | Required transition and test |
|---|---|---|
| F-01 | Gateway `extensions/alert-watcher/src/dedup.ts` and caller key dedup by raw message ID | Namespace transport/account/conversation/message identity; distinct chats with equal IDs each run |
| F-02 | `extensions/alert-watcher/index.ts` received-event adapter reads fields different from `dispatch-from-config.ts` producer | Normalize actual metadata/context fields; one logical inbound+received message classifies and delivers once |
| F-03 | `index.ts` marks seen before classification; failure leaves no retry record | Separate in-flight claim from terminal processing; failed provider redelivery resumes safely without duplicated delivery |
| F-04 | `src/drones/host.ts` shares last resolved model across runs | Per-run immutable usage attribution; concurrent different models retain their own price/model |

[Filter handoff patch](../audits/2026-10-22-agent-use-transcripts/revalidation/filter/handoff-comments.patch). Any complaint gate must bypass unsupported custom rules or use an explicit typed eligibility contract. Cooldown currently occurs after classification; it is not proof of inference savings. Keep summaries/rationales where callers require them.

### Factory evidence and bounds

| ID | Current gap and exact owner | Required transition and test |
|---|---|---|
| F1 | `scripts/jev-shadow-report.mjs`, `runner/src/jev-proxy.ts`, `agent/rank.sh`, `agent/lib/jev.sh`: central/local duplicate inference records and false origin | Stable decision/attempt ID; join local baseline enrichment; count inference once; old unjoinable records remain unresolved |
| F2 | `scripts/jev-shadow-report.mjs` drops model/costSource and substitutes zero | Preserve resolved model, rubric revision and explicit known/unknown cost; mixed-model fixture stays separate |
| F3 | `agent/hooks/jev-guard.sh` sets 4s but `agent/lib/jev.sh` proxy defaults 25s under 6s hook | Propagate remaining deadline through proxy/runner, retain immediate deterministic floor; delayed actual-harness proof |
| F4 | `runner/src/jev-proxy.ts` checks budget before await, consumes afterward | Reserve before dispatch; concurrent max_calls=1 admits at most one; documented spend reservation and settlement semantics |

[Factory handoff patch](../audits/2026-10-22-agent-use-transcripts/revalidation/factory/handoff-comments.patch). Explicitly verify score-scale mapping before interpreting rank absolute errors; this review has not proven a provider-scale bug. Model agreement is not independent ground truth. Guard's semantic view lacks full task authorization context and must not become an authority source.

### Pulse effect admission

DUR-01: Hub `src/routes/api/pulse/proposals/[id]/+server.ts` reads pending, executes remote `cron.add`, then marks approved. Both concurrency and remote-success/local-failure retry reproduce two remote calls. Introduce atomic admission, stable logical effect identity, persisted receipt and reconciliation/indeterminate handling. CAS alone does not close the post-remote-effect crash window. Preserve actor/org authority on recovery. [Source handoff patch](../audits/2026-10-22-agent-use-transcripts/revalidation/durability/pulse-approval-todo.patch); qualify both interleavings plus loss of lease/authority and provider ambiguity. Informational digest/fyi actions do not call this executable path.

## Existing work and lifecycle

Keep router work with `2026-10-12-hub-assistant-jev-context-router` and `2026-10-17-agent-experience-lifecycle`; Factory cutovers with `2026-09-29-factory-jev-decision-layer`; CRM shadow review with `2026-09-21-hub-jev-shadow-week-review`. This proposal coordinates corrected evidence and repair prerequisites, not a parallel implementation architecture.

Research and isolated probes only. No implementation lifecycle stage was bypassed. Specs and their reviews precede product fixes/experiments; security/data slices retain human approval and merge gates. No live model calls, production writes, configuration changes, merges or deployments were made. Passing focused tests is not runtime or full dependency qualification.

## Definition of done

Each selected slice publishes exact source/model/rubric versions, its baseline, test evidence and unresolved operational boundaries. Each experiment has independent development/holdout sets, task-level outcome and full cost denominators, and an explicit promote/stop decision. Confirmed defects require code fixes and appropriate boundary/runtime verification before closure. Rejecting an experiment is valid; confidence distributions, autonomous run counts and vendor speed multipliers cannot substitute for useful completed work.

## Specification handoff

On 2026-10-22 the owner requested the full SDD/Ponytail spec. The design is now in [the implementation contract](../specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md), with bounded slices, acceptance tests and separate technical/human gates. This advances specification only; it does not approve product implementation, live model calls or deployment. The earlier defect ledger remains open until verified fixes land.

## Implementation wave1

The owner authorized implementation with subagents and validation. The [implementation ledger](../audits/2026-10-22-agent-use-transcripts/implementation/README.md) and [slice state](../audits/2026-10-22-agent-use-transcripts/implementation/state.json) track Slices1–2,6–7 and10 in isolated feature clones; remaining slices stay planned. Later receipt/telemetry/digest/evaluation work remains owned by the reviewed specification. Known unimplemented consumer boundaries retain exact `TODO(handoff)` pointers and may not be presented as complete end-to-end capability.

Factory source reconciliation: the original dirty meta checkout registry is stale. Freshly fetched meta dev already has Factory development/PR base dev, matching nearest Factory AGENTS and promoter. No registry change is needed; use the current isolated registry.

Supporting Slice2 integration: installed Hub shared client lacks a synchronous pre-send API. The meta feature adds `GatewayClient.beginRequest` with backward-compatible async request behavior; Hub is qualified against a source-built archive. Hub already uses checked-in file:deps archives, so the tested SDK archive is adopted through that existing repo-relative dependency/Bun-lock pattern and frozen-install qualified; no npm publish is required. Slice3 accepted-run callback authority remains planned; Slice2 must not imply that callback gap is closed.

Factory Slice8 continuation: A06/A07 now preserve known failed bills and nullable unknown costs through runner, proxy, direct shell and report. The legacy `sum_cost_usd()`/run-row persistence still expose a numeric known-subtotal API; unknown exposure and failed error-file aggregation must be handled by the Slice8 admission/accounting continuation before claiming complete run-spend bounds. Exact TODO(handoff) pointers remain in Factory agent/lib/cost.sh, agent/lib/jev.sh and runner/src/spec-grounding.ts. Rank score-scale mapping remains unverified, with a TODO at agent/rank.sh; absolute score error is suppressed until a verified mapping exists.

Existing manual/initial history-loader follow-up: A02 now fences submitted-turn acknowledgement/timer recovery by owner epoch, current chat/client identity and exact run/session before and after history awaits. Other legacy init/manual `loadChatHistory` callers still use the default current callback; they need their own request/owner generation treatment before claiming universal history-read race safety. Keep this distinct from A02 recovery and from Slice3 automatic UI-action authority. The helper's exact TODO(handoff) and implementation ledger retain the seam.

Slice11 continuation: Slice10 only supplies trustworthy Telegram/raw/received source units. The current watcher still needs to consume each original unit and implement stable admission/delivery receipts (Slices11–16); producer/received sites carry exact TODO(handoff) pointers. No cross-hook dedup or crash-safe classifier/delivery guarantee is claimed by the carrier slice.

## Shared web and WhatsApp engine follow-up

The owner also requested the engine that connects web/WhatsApp bridges to chat. [Pinned gateway report](../audits/2026-10-22-agent-use-transcripts/implementation/engine-recon/report.md), [Hub/Site crosscheck](../audits/2026-10-22-agent-use-transcripts/implementation/engine-recon/hub-site-crosscheck.md), source manifests and offline characterization cover that request. This is a proposed extension; it does not silently amend the reviewed 32-slice specification or describe new engine fixes as implemented.

Web `chat.send` and WhatsApp converge through dispatch/get-reply/run-preparation into the existing primary pi/CLI execution adapters. Hub Jev manifest selection is a prompt-context sidecar; opt-in gateway heuristic model routing, later model overrides/pins, permitted tool discovery and final execution are different decisions. Preserve that distinction in evaluation and product claims.

| Priority / findings | AS-IS | TO-BE and bounded delta | Required proof |
|---|---|---|---|
| P1 / E1–E2: execution context and tool policy | The common explicit run→attempt object omits optional resolved user/sender fields; the nominal smart-routing no-tools flag affects prose but not the actual tool array. Missing GWS identity fails closed; no privilege escalation is demonstrated. | Audit and preserve typed server-derived context across immediate/queued/attempt adapters. Give no-tools one explicit runtime meaning. Reuse current engine/tool contracts; classifier output never creates authority. | Actual immediate/queued stub-tool execution; two users and absent identity; fallback, native no-tools, ordinary permitted discovery and CLI compatibility. |
| P2 / E3: accepted/queued execution relation | Queued execution creates a new UUID without a stored accepted-request cancellation relation. The draining turn's signal must not be blindly applied to a different queued turn. | Define accepted/queued/steered/executing/terminal dispositions and explicit relations with current session/controller machinery. Decide persistence from the actual user-visible guarantee. | Real WS handler interleavings: queued second send, exact Stop before drain, newer send, reconnect and actor/session isolation; no premature final, hidden later execution or automatic unknown-effect replay. |
| P3: primary model/tool/context qualification | UI manifests, four-hour heuristic session pin, model override/tool pin, JIT discovery and usage are separately observed. Sticky routing is intentional; unsuitable task outcomes remain a hypothesis. | Join bounded primary-attempt/model/tool/context observations to task receipts using existing hooks and approved fixture vocabulary. Compare the actual baseline before proposing another paid classifier. | Multi-turn greeting→complex task, mixed intents, fallback/override, discovery, compaction, rejected tools and cancellation; resolved models, known/unknown bills and independently checked task receipts. Shadow/fixture first; no automatic policy promotion. |
| P4 / E4–E5: WhatsApp adapter parity | Mapped-user lookup happens after route/no-agent decisions; WhatsApp debounce originals are not certified by Telegram Slice10. Explicit bindings can still route. | Reconcile the October16 personal-assistant design. Resolve verified private transport to the existing personal agent/current authority before dispatch; preserve canonical originals and distinguish backend tools from mounted browser actions. | Same fixture user/agent/org backend capabilities through both bridges; no claim/revoked member/group/shared-number policy; ordered text/media/edit units; equal IDs across account/chat remain distinct; cross-transport confirmations reject. |

Site E6 is a separately confirmed source admission mismatch: its member-role request does not match the inspected gateway operator-only admission contract. Do not weaken gateway authorization to make a test pass. Reconcile that client's intended role and permissions before claiming Site/common-engine parity; no deployed Site failure was established.

The [comment-only handoff patch](../audits/2026-10-22-agent-use-transcripts/implementation/engine-recon/handoff-comments.patch) records exact source sites for this proposed continuation without modifying the current gateway PR. A substantive engine specification extension requires the normal two-pass review before implementation. The queue characterization tests and source-structure probes do not prove complete WS/WhatsApp runtime behavior or live incidence. The prior [WhatsApp proposal](2026-10-16-internal-whatsapp-personal-assistant.md) retains authority/admission ownership.

Wave1 validation also reproduced an existing AiOrb observer callback after its canvas binding was cleared. A bounded repair captures the mounted node, fences queued observer/animation work after disposal/context loss, and retains GPU cleanup. Three lifecycle regressions failed before and passed after the change. The actual-client browser fixture was extended to assert exact-run Stop, no automatic replay and a new explicit send after Stop; this remains synthetic transport proof rather than authenticated engine execution.
