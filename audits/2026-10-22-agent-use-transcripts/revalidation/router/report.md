# Router and task-quality revalidation

Source scope: Hub `master` at `b677a5d91a2b653211a1655465b2b5fd398efc2a`; Gateway `DEV` at `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18`. Analysis uses exported snapshots under `/tmp/minion-agent-validation-20261022-blbb_5vg/`. No paid model, production API or product behavior changes. The new evidence materially changes the earlier recommended first step.

## Verdict

Keep task-level evaluation, but repair send cancellation/scope fidelity and its measurement seams first. Defer the proposed server-validated task-continuation record: the previous argument confused the classifier's narrow input with the agent's much richer input. The gateway retains conversation history; Hub sends current UI tool schemas even in core-only context; UI-choice and artifact callbacks already bypass routing; both Hub and gateway support tool discovery. A short reply classified as chat does not by itself prove loss of task context.

Three confirmed implementation gaps supersede speculative router memory work:

1. Pending `/home` classification can send the original request into a different thread or personal agent selected during the await.
2. Floating assistant Stop during classification does not stop the pending send; the handler can also adopt a changed thread and page.
3. `p_sandbox` is emitted by the route but removed by the telemetry sanitizer, despite comments recommending calibration from that field.

All three are demonstrated by executing extracted, unmodified production handler/function source with stubbed boundaries. These are deterministic component-logic probes, not browser, authenticated deployment or LLM-output proof.

## Actual end-to-end call chain

| Stage | Evidence and behavior |
|---|---|
| Submit and classify | Hub `src/lib/components/layout/FloatingAssistant.svelte:284-332` captures text/actor-org owner/agent, awaits attachment context then route. `/home`, `src/routes/(app)/home/+page.svelte:658-694`, awaits route but then reads mutable agent/chat. |
| Classifier transport | Hub `src/lib/assistant/turn-router.ts:244-267` posts only `{text,locale,page}`, with 1500 ms timeout and no run/session correlation or caller cancellation signal. |
| Server classification | Hub `src/server/services/assistant-router.service.ts:57-66,137-201` clips text at 2000 chars, requests mode plus independent manifests, parses probabilities, returns mode/probabilities/manifests/ms/cost. It discards provider resolved-model and usage token fields. |
| Gate | Hub `src/lib/assistant/turn-router.ts:214-235` loads threshold winners and mode-associated manifests; sandbox non-chat override; null/off/shadow returns all. |
| Envelope | Hub `src/lib/state/features/assistant-context.ts:86-160` reads current page/org/focus at assembly time. Core always includes current tools through `uiToolsBriefing(getTools(),...)`; pages and form catalog are gated. |
| Wire send | Hub `src/lib/services/gateway/chat-rpc.ts:274-336` generates runId only now, records clean text in local UI, transmits `${clean}\n\n${context.trim()}` with idempotency key. Comments saying prefix are stale: actual wire order is text first, envelope last. |
| Gateway receive | Gateway `src/gateway/server-methods/chat/handlers.ts:193-245,300-339` sanitizes message, resolves session, acknowledges run, injects timestamp, passes whole message in `BodyForAgent`. |
| Tool eligibility | Gateway `src/agents/pi-embedded-runner/run/attempt-env.ts:155-169` calls `applyJitToolGate` on incoming prompt. `src/agents/tool-search/apply-selection.ts:29-31,94-171` applies permission gate in every mode, defaults relevance selection to shadow, retains search/load and session-loaded tools. |
| Session and provider | Gateway `src/agents/pi-embedded-runner/run/attempt-session.ts:89-95,156-169,194-210` opens persisted SessionManager and binds tool discovery activation. `run/attempt.ts:128-167` sanitizes/limits prior history; `:554-595` hooks receive history and entire effectivePrompt, then `activeSession.prompt` runs it. |
| Completion | Gateway `run/attempt.ts:690-710` emits `agent_end` success meaning no abort/prompt error; `:788-816` emits llm_output with run/session/model/usage. Neither means task correctness. UI tools are a separate browser execution loop that can generate more turns. |

## R1: Route await can redirect an accepted user request

**Confirmed source/logic defect, high priority.** Home's `handleSubmit` captures its `text` parameter, but not agent ID or session key. After awaiting the classifier it reads `agentId` and `chat?.sessionKey` again (`+page.svelte:682-691`). `selectConversation` at `:580-582` invokes `loadChatHistory`, whose first synchronous action sets `chat.sessionKey` (`chat-rpc.ts:12-24`). No UI restriction in the handler prevents that transition during routing. The extracted handler probe switches thread A to B while resolving the classifier promise and records the original A request sent to B. A second case switches agent A to B and records send to agent B.

Floating's owner and personal-agent checks are real and useful (`FloatingAssistant.svelte:293,305,326`); do not describe it as wholly unfenced. They omit session/page. `sessionKeyFor(id)` and `buildAssistantContext(loaded)` execute after the await (`:331`), while `path` used to classify/gate was captured before it (`:306-313`). Probe changes thread and route during that await and gets old request + new thread + new page. Org-switch leakage in Floating is not proven because it does check owner.

Smallest delta: create one pending-send identity before the first await (actor/org/agent/session, page or context revision, generation), and compare before commit; invalidate on thread/scope/page changes or explicitly preserve frozen context only if still valid. Restore/retain the draft on invalidation. Do not silently reroute a financial or customer request into the newly selected conversation. Keep the capture/commit policy consistent across both surfaces, attachment enrichment, callback paths and page teardown.

Required proof: extend existing actual-Home fixture with a deferred `/api/assistant/route`, switch conversation/new-chat/owner/page/unmount before resolving, assert no wrong-scope `chat.send`; verify unchanged scope sends exactly once. Test actual Floating too. `tests/fixtures/critical-journeys/README.md` already documents mounted Home plus synthetic HTTP/WS and the normal verification path; no new browser harness is needed.

## R2: Stop during classifier latency still sends

**Confirmed source/logic defect, high priority.** Floating shows reply running when `routing` is true (`FloatingAssistant.svelte:434`), exposes Stop via `onstop={stopReply}` (`:1184`), but `stopReply` (`:435-438`) only calls `abortChat`. `abortChat` sends `chat.abort` for an existing session (`chat-rpc.ts:68-74`); no gateway run for this request exists yet. When routing resolves, `send()` still invokes `sendAssistantTurn`. The probe calls actual extracted `send`, then actual extracted `stopReply`, resolves route and verifies both abort and subsequent send.

Home has a related UX gap: its ChatInput running expression (`+page.svelte:1206`) excludes `routing`, so pre-send latency has no matching Stop affordance there. Do not claim a Home pre-send Stop exists.

Smallest delta: Stop invalidates pending-send generation and aborts its fetch signal, then aborts any accepted gateway run. Server timeout cancellation is separate: client abort alone may not prevent a provider bill; returning/stale-result guards still required. Include routing in Home's visible pending state once cancellation works.

Required proof: route resolves before Stop, after Stop, concurrently with Stop, after timeout; no send after accepted pre-send cancel; already accepted sends abort their exact run/session. Also test a new send after cancellation so stale finally blocks cannot clear the new pending state.

## R3: Sandbox calibration metric is discarded

**Confirmed production-path logic defect, medium priority.** `src/routes/api/assistant/route/+server.ts:66` emits `p_sandbox`. `src/lib/server/posthog.ts:51` calls `sanitizeEventProperties`. `src/lib/server/observability-context.ts:300-305` has no p_sandbox validator and `:367-380` has no p_sandbox in assistant_route allowed fields. Actual sanitizer probe preserves p_pages=0.5 and removes p_sandbox=0.99. This contradicts `turn-router.ts:158-159` advice to calibrate using p_sandbox events.

Smallest delta: add the bounded probability validator and event field, with a producer-through-sanitizer regression assertion. This is independent of expanding model telemetry and can be repaired immediately.

## Existing mitigation falsifies an overly broad continuation concern

- `buildAssistantContext:144-149` always calls `uiToolsBriefing(getTools(), ...)`; `briefing.ts:32-45` includes current registered tools with full input schemas. On a mounted form, its fill tool survives a forms-manifest omission. The withheld form catalog primarily describes off-page capabilities.
- `global-tools.ts:42-71` registers permission-filtered `hub.pages` discovery. A missing page list is recoverable through a read-only tool and follow-up.
- `/home:658-673` explicitly bypasses classifier for ui.choice/artifact callbacks. Floating `:1080-1085` sends those callbacks with full context. The previous frozen-corpus recommendation should preserve these bypass tests, not propose implementing them.
- Gateway `apply-selection.ts:29-31,136-144` includes search_tools/load_tools and session-loaded tools. `discovery-context.ts:72-96` activates tools only from the current permitted index; `attempt-session.ts:194-210` wires it into actual AgentSession. Session-loaded state is in-memory with a 2h sliding TTL (`session-loaded.ts:1-8,39-54`), not a durable task-state guarantee.
- Prior conversation messages remain provider history until history limiting or compaction. `stripInjectedUserContext` is called for post-turn memory extraction (`attempt.ts:712-735`), not as a history-envelope removal pass.

Therefore retain ambiguous-turn tests, especially new/compacted sessions, off-page forms, page changes and mixed intent. But change the experiment question to **does the existing system actually fail the task, and does a minimal extra context fallback fix it?** Add task-state machinery only if observed failures survive those simpler options.

## Context accumulation, caching, and a second relevance layer

The router trims the newly appended envelope; it does not remove previously appended catalogs. Whole composed prompts enter the gateway session. Client display cleaning does not shrink provider history. This can increase continuing context length and eventually compaction pressure. It can also preserve old task details which mitigate isolated classification. Both must be evaluated over multi-turn trajectories.

A variable new envelope is appended after prior history; this alone does **not** prove the old prompt-cache prefix is invalidated. Dynamic system context, tool activation, provider caching rules, compaction and history pruning can affect cache behavior, but billed impact requires provider usage evidence. Do not claim token-character reduction is measured dollar savings or that router variability necessarily destroys cache hits.

There is another relevance coupling: gateway JIT ranking receives `params.prompt` containing the whole Hub envelope (`attempt-env.ts:162-167`), and semantic memory recall also uses the whole prompt (`attempt.ts:467`), whereas post-turn extraction strips it (`:716`). The page/form boilerplate may influence tool ranking or memory retrieval. This is a **hypothesis**, not a demonstrated wrong result. Add clean-user-text versus composed-envelope ranking/retrieval probes to the evaluation before changing the classifier. Preserve contextual entity/route cues when designing such a probe; stripping all context can also hurt.

A tempting hook is not already a working replacement: `pre_prompt_build` currently receives empty history/eligiblePool and merely logs decisions (`attempt.ts:375-403`). In contrast, `before_prompt_build` receives actual history (`:405-417`). Do not propose switching routing to the former without accounting for its unwired consumer.

## Measurement: reuse existing fields; add the missing joins

Existing useful evidence:

- `assistant_route`: server identity, decision mode, winning mode probability, five surviving manifest probabilities, latency and cost (`+server.ts:43-69`).
- Gateway `llm_input` includes runId/sessionId/provider/model/prompt/history (`attempt.ts:554-575`); `llm_output` includes runId/sessionId/provider/model/usage/text (`:788-815`). These are hook surfaces; their presence does not prove collection enabled.
- Gateway `agent.run.end` includes runId/sessionId/duration/usage accumulator (`run.ts:1301-1315`); session usage types track input/output/cache reads/writes/cost/missing-cost counts (`session-cost-usage.types.ts:35-49`).
- Usage subscription accumulates model calls within an attempt (`pi-embedded-subscribe.ts:258-290`). Some downstream normalized usage fields are shaped for context accounting, and total may be replaced with last-turn total (`run.usage.ts:61-86`, `run.ts:1165-1186`). For economics, retain per-call bills or full accumulator evidence, rather than assuming every field named total means billed work.
- Existing envelope/gating tests assert code behavior; fixture journeys assert client execution. Neither is a labeled bilingual outcome holdout.

Missing or insufficient:

- Router request happens **before runId allocation** (`turn-router.ts:254-259` versus `chat-rpc.ts:287`). No x-minion-run-id is sent. `requestIdentity:151-152` consequently returns null agent_run_id. Actor/org/time cannot unambiguously join concurrent requests to outcomes.
- No task/turn correlation spanning semantic routing, gateway retries, UI-tool follow-up turns and terminal outcome. One human request may cause multiple assistant runs; dividing by one run can misprice a task.
- No classifier resolved-model, rubric/threshold/schema revision, decision/fallback reason, request cancellation, configuration mode, actual selected manifest set, or envelope size/hash captured in route event. Server does not know client gating/abort outcome.
- A timeout/failure is returned as null; event emits `duration_ms=0` and `assistant_cost_usd=0` (`+server.ts:58-59`). Missing provider usage cost is also mapped to 0 (`assistant-router.service.ts:195`). These mean unknown/unavailable, not measured free/instant work. Equal 1500 ms client/server budgets also permit a client full-envelope fallback while server eventually logs a successful decision that was never used.
- No correctness label or rubric reference in assistant_route. Confidence distributions alone cannot derive false negatives or calibrate correctness, regardless of sample count. The comment recommending ~200 probability events is insufficient for calibration without labels.

Smallest measurement delta: allocate an opaque turn ID at initial submit; carry through router response, client applied-decision event and gateway run id mapping; group later UI-tool follow-ups under a task ID; record requested/resolved model and rubric/gate revisions; preserve unknown cost and failed-route elapsed time; label final artifact/receipt outcomes independently of no-exception run completion. Keep raw customer text out of general analytics; use scoped evaluation fixtures or separately governed trace storage.

## Validation performed

`probes.mjs` reads and transpiles production functions directly; it does not manually reimplement their branching. `probe-results.txt` records six assertions covering the two scope migrations, Stop failure, Floating page/thread drift, sandbox metric drop and absent run join. Boundaries are stubbed; all model/network dependencies are avoided.

Existing tests command (snapshot):

```sh
node node_modules/vitest/vitest.mjs run src/lib/assistant/turn-router.test.ts src/server/services/assistant-router.service.test.ts src/lib/state/features/assistant-context.test.ts src/lib/services/gateway/chat-rpc.context.test.ts src/lib/services/gateway/chat-rpc.envelope.test.ts src/lib/server/observability-context.test.ts
```

Result: **6 suites, 92 tests passed**; `existing-tests.txt` contains the output. Preparation used snapshot-only node_modules symlink to existing Hub deps, copied generated `.svelte-kit/tsconfig.json`, and generated Paraglide assets. Initial Bun startup failed on missing generated tsconfig/node:module resolution; first Node test run had 61 passes plus three import failures due missing Paraglide; generation resolved all six selected suites. This does not prove the full frozen dependency installation. Original gateway installed Pi SDK is 0.75.5, while current DEV pins 1.1.0; installed old SDK inspection was excluded from pinned runtime claims.

No browser test, actual model task completion, production flags, live route latency/cost or exact-SDK session persistence execution was performed. A source-derived history chain is stronger than the previous isolated router reading, but is still source evidence.

`handoff-comments.patch` is a comment-only patch for the three confirmed defects, pointing to the root proposal. It is applied only in the disposable source snapshot; original product checkout untouched.

## Revised sequence and blast radius

1. **Repair/fence existing submission semantics** in Home, Floating and the route client, reuse the actual component fixture. This prevents user intent moving or continuing after cancellation; it does not require LLM calibration.
2. **Repair p_sandbox and add outcome joins/unknown accounting**, extending observability allowlists/tests rather than bypassing them. Gateway/client protocol impact should be limited to correlation metadata or an explicit mapping, never an authorization hint.
3. **Run trajectory qualification** across full envelope, current Jev routing and a deterministic minimal-core-plus-discovery baseline. Compare successful task receipts, extra discovery calls, correction turns, total billed calls/cache costs, latency and human interventions. Split development/holdout; include compaction and changed-page cases.
4. **Only then test task-state continuation or model routing** if actual failures justify them. Model selection stability and generation cancellation belong to the accepted run contract, not a classifier confidence threshold.

Old recommendation verdicts: task-level corpus **confirm and strengthen**; server task-continuation record **defer/revise**; generic cheap judge **retain only after deterministic receipt joins**, because run success is not task success; blanket token-savings claim **reject until measured**; already-existing mode fallback/UI-choice bypass/discovery **do not rebuild**.
