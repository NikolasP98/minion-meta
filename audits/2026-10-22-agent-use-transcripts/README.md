# Revalidated agent improvements for Minion

**The deeper review changes the priority: repair and qualify the existing harness before adding more classifier calls.** The transcripts' useful principle survives—cheap decisions before expensive work, durable execution behind thin clients, and feedback tied to outcomes—but Minion already implements more of it than the first review identified.

Research updated 2026-10-22. The [initial assessment](revalidation/initial-assessment.md) and [initial proposal](revalidation/initial-proposal.md) are preserved; this report supersedes their ranking. The [revised proposal and defect ledger](../../proposals/2026-10-22-agent-decision-and-proactivity-experiments.md) have advanced to `in-spec`; the [full SDD/Ponytail specification](../../specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md) defines implementation and qualification contracts. The research/specification phases made no runtime changes. Authorized implementation now runs in isolated feature clones, with its own evidence and release boundary in the [implementation ledger](implementation/README.md).

## What changed after tracing the code

| Initial recommendation | Deeper evidence | Revised decision |
|---|---|---|
| Add compact continuation state to the context router | Gateway retains composed user turns in history. UI-choice callbacks already use full context; current UI tools, page discovery and gateway tool discovery mitigate omissions. Actual handler probes expose thread/agent drift and ineffective pre-send Stop. | Fix pending-turn ownership/cancellation first. Evaluate multi-turn outcomes before adding state. |
| Complaint filtering is the best new pilot | Alert-watcher is disabled by default, has no subscriptions by default, and supports custom alert rubrics. Handler probes show identity collisions, duplicate processing and lost retries. Current traffic/economics are unverified. | Downgrade to a conditional, rubric-specific experiment after identity/retry fixes and proof of eligible traffic. |
| Reuse Factory shadow results | A proxy inference appears in central and run-local logs; report merges both. Unknown cost becomes zero and model identity is discarded. | Repair evidence integrity before calibrating or promoting existing decision policies. |
| Reuse gateway cron for durable proactive work | Cron persists schedules, but interrupted jobs do not resume their steps; a main-session enqueue is memory-only. Hub already has leased background jobs and effect receipts. | Use cron as a trigger. Compose and qualify Hub's existing job/receipt components for a bounded workflow. |
| Build a digest artifact and feedback loop | Pulse already has deduplicated informational cards, review actions and a gateway tool. Settings do not establish an active scheduler or learning loop. Executable approval has a reproduced duplicate-job window. | Reuse Pulse digest/fyi cards. Add reasoned, revision-bound feedback; separately repair executable approval. |
| Cheap judges can review traces | Router decisions lack an end-to-end turn/task join; scheduled/run success is not task completion. | Build deterministic receipt/outcome joins first; then test semantic screening with independent labels and a random control sample. |

## Defects reproduced offline

These controlled source/handler probes establish behavior, not production incidence. They justify concrete fixes without assuming model accuracy.

| Boundary | Reproduction | Consequence |
|---|---|---|
| Hub submission | Start routing, change selected thread/agent, resolve route: Home sends the old request to the changed destination. Floating also reads changed thread/page. | Request ownership is not preserved across asynchronous preparation. |
| Floating Stop | Stop during pending routing, then resolve route: abort is invoked, then the request is still sent. | Pre-send cancellation does not prevent execution. |
| Router telemetry | Producer's `p_sandbox` disappears through the real sanitizer. | A documented calibration input is absent downstream. |
| Alert identity | Same raw message ID in two chats: second skipped. One message through channel and agent hooks: two classifications/sends. | Missed and duplicate work distort reliability and the proposed savings baseline. |
| Alert failure | Classifier fails; redelivery is rejected as already seen. | No retryable classification record exists for that path. |
| Drone accounting | Differently configured concurrent models share host attribution state. | Earlier completion can be priced/tagged as the later model. This requires overlapping different models. |
| Factory report | One synthetic $0.01 inference in central/local formats yields n=2, $0.02 and a false runner-origin row. | Records are not independent inferences or labels. |
| Factory bounds | Guard's 4s setting becomes proxy `curl -m 25` under a 6s hook; max_calls=1 admits two concurrent requests. | Intended deadline and admission bounds are not consistently enforced. Deterministic floor denial remains independent. |
| Pulse approval | Concurrent approves each call `cron.add`; retry after remote success/local failure also calls it again. | Status update after an effect does not prevent duplicates or reconcile unknown outcomes. Informational cards avoid this remote path. |

Exact source anchors, runnable probes and limitations: [router](revalidation/router/report.md), [alert filtering](revalidation/filter/report.md), [Factory](revalidation/factory/report.md), [durability/Pulse](revalidation/durability/report.md). Independent cross-review supported the findings with the stated conditions.

## Recommended sequence

1. **Preserve user intent.** Carry one pending submission identity/generation through routing and context preparation. Cancel or revalidate on thread/scope changes; Stop invalidates pending work and any accepted run. Extend existing mounted-component fixtures.
2. **Make evaluations trustworthy.** Join decision → applied context → run(s) → task receipt. Preserve resolved model, rubric/gate revision, elapsed failures and unknown cost. Deduplicate Factory inference records. Repair accounting and bounds before trusting savings estimates.
3. **Qualify the existing router.** Compare full context, current routing, and minimal core plus discovery on bilingual multi-turn tasks. Include compaction, mixed intents, page changes, callbacks, cancellation and failures. Measure correct task receipts, correction turns, total billed attempts/cache usage, latency and human intervention on a holdout.
4. **Build one informational proactive slice.** Produce dependency-impact Pulse cards citing an official change and the Minion package/file it affects. Reuse `bg-runtime`, add typed step receipts, and publish under a stable dedup key with cursor/receipt commit. The default jobs tick skips background jobs: qualify a targeted worker rather than activating all dormant queues.
5. **Expand only where evidence supports it.** Complaint filtering requires compatible rule contracts and real negative volume; semantic screening requires independent labels; adaptation requires reasoned feedback and versioned rollback. Model routing remains a later task-family experiment. Uncalled gateway complexity/router utilities are not evidence of an active routing path.

The proactive slice requires integration. Embedding receipts are specialized; generic enqueue does not deduplicate logical requests; Pulse publication opens its own transaction. Retry semantics and handler selection need a feature-specific contract. These are reusable components, not an existing durable digest pipeline. Gateway outbound delivery already has stronger receipt/recovery controls; do not confuse delivery durability with cron workflow recovery.

## Hypotheses retained for experiments

- **Continuation state:** test whether failures survive history, existing discovery and simpler fallbacks. A short reply's classifier score alone does not demonstrate task failure.
- **Context savings:** less new envelope text does not prove lower total task cost. Old envelopes remain in history; discovery/retries add calls. Appending context does not itself prove prompt-cache invalidation.
- **Retrieval relevance:** the composed Hub envelope reaches gateway JIT ranking and memory recall. Boilerplate may affect relevance, but no wrong result was demonstrated. Compare clean intent plus selected cues against full envelope before changing it.
- **Quality:** probabilities, agreement with another model and vendor speed claims are not independently labeled correctness. No live model benchmark was run.
- **Learning:** a stored score or dismissed card is not a validated policy update.

## Evidence scope

[Selected pinned source snapshots and hashes](revalidation/source-manifest.json) preserve the main boundaries independently of temporary test directories. Remote tips were verified and full tracked source archived into isolated scratch directories. Existing dirty subprojects were not switched, reset or edited. [Pins](revalidation/source-pins.json): Hub master `b677a5d91a2b653211a1655465b2b5fd398efc2a`; gateway DEV `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18`; Factory dev `43a174b2e87c4d572ffd2ba030269db22a0b7bd2`. Hub advanced since the first snapshot; earlier evidence retains its original SHA.

Focused existing tests passed against isolated source with available local dependencies: router/context/telemetry **92**, Hub durability/Pulse **37**, gateway pure alert suites **32**, Factory runner/proxy **28** and report **10**, plus the shell contract suite. New adversarial probes are separate from those regression counts. Gateway integration/cron collection hit installed Pi SDK export/version mismatches; those are limitations, not passes. Generated Hub assets were created only in the scratch snapshot. A clean frozen-lockfile installation and deployed identity were not established.

Confirmed defects have comment-only `TODO(handoff)` patches beside probes and entries in the revised proposal. Comments are applied only in disposable snapshots; original product repositories remain untouched. Production incidence, enabled features, traffic/cost, provider calibration, restart end-to-end behavior and real browser interactions remain unverified.

Transcript themes and primary-source links are retained in the initial assessment. The deeper conclusions here come from pinned Minion source and offline experiments; no vendor multiplier or autonomy percentage is adopted as a Minion result.

## Full specification

The [SDD/Ponytail specification](../../specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md) now has 32 bounded implementation slices and two completed technical review passes. [Review record](../../specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.review.md), [interactive plan](spec-overview.html), and [acceptance matrix](spec/slice-plan.json) preserve the implementation contract. The proposal remains `in-spec`; the owner has authorized implementation and the spec is `stage: dev`, `status: implementing`. The [implementation ledger](implementation/README.md) separates completed local work from planned slices, merge/deployment and live experiments.

Scoped canonical metadata/index validation passes. Whole-workspace gates still report unrelated pre-existing failures; [specification evidence](spec/README.md) distinguishes these results and records preserved index rows.

## Shared web and WhatsApp engine

The owner expanded the review to the engine behind user bridges. The [engine reconnaissance](implementation/engine-recon/report.md) and [Hub/Site crosscheck](implementation/engine-recon/hub-site-crosscheck.md) trace common execution separately from transport admission, browser actions and manifest context selection. These source-backed findings are additional planning input; they do not silently extend the approved 32-slice design or claim deployed channel parity.
