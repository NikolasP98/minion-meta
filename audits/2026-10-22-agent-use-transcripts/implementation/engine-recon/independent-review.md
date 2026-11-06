# Shared-engine reconnaissance independent review

Verdict: PASS as a bounded, source-qualified reconnaissance report after cancellation and Site-admission wording corrections. This is not product-fix acceptance, a live incident confirmation or security certification. Reviewer performed source reads/hash checks only; no product edits, heavy tests, provider calls, credential reads or live gateway activity.

## Exact candidate and evidence identity

Gateway candidate HEAD `7fac6744ea9f15fb64b0423bd4f3c39592b3e6a7`, isolated checkout `/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion`. Nearest AGENTS and MINION engineering instructions were read. Inspected engine/chat paths have no product-source diff; unrelated tracked node_modules bin-link modifications remain untouched. Independently recomputed all 31 file hashes in source-manifest.json: all match.

Reviewed artifact SHA-256:

- Historical reviewed report, preserved as `report.reviewed-7fac6744ea9.md`: `f29ecc393efd027bf1d25746634888bed803d16d5129d2c98d678a752514c77a`. The later current report adds the separately authorized comment-only continuation; the original 31-file source manifest and this substantive review remain pinned to `7fac6744ea9`.
- `rerun.mjs`: `c1f4b35c76075c68b4ed1b4d4073703dc12bb9850db5f5cd93ed33269f8c1124`.
- `engine-boundaries.test.ts`: `b4373ac34229b94ac0d84501bee179d9e4cdb568f48f78bf03319235d1d467bd`.
- `source-manifest.json`: `c7c8bf5446bf75ce1977be4569dabe35e9034779216e903bd1851e583b7923ab`.
- `hub-site-crosscheck.md`: `c5712af9e3e1207faf5e0f389c734de0c38734b924b389cbfe5cd80747620340`.

## Standards review

PASS for the report/evidence boundary. The report distinguishes source, AST structure, mocked characterization, deployment and actual task/tool execution. It does not treat the presence of unused routing modules as proof of active routing or introduce a replacement runtime. Tests mock model execution and reply delivery; the direct followup-runner invocation is intentionally narrow. The prepared handoff-comments.patch is comment-only and unapplied; it is not a shipped repair. No additional source/spec requirement is silently added to the already-reviewed first wave.

## E1: resolved user/sender context

Confirmed parameter loss, with conditional capability degradation; no escalation demonstrated.

- `get-reply-run.ts:544` puts `ResolvedHubUserId` on prepared immediate/queued run data. Immediate `buildTemplateSenderContext` at `agent-runner-utils.ts:208–215` also passes that identity to `runEmbeddedPiAgent`.
- The common explicit call at `agents/pi-embedded-runner/run.ts:626–684` forwards no resolvedHubUserId or sender ID/name/username/E164/permission tier. There is no spread that restores them. It does forward senderIsOwner, but that value is already absent at some upstream immediate/queued boundaries; absence must not be blamed only on this one call.
- Attempt environment reads the missing values at `run/attempt-env.ts:130–135` for tool construction and `:331–332` for prompt context. `minion-tools.ts:225,241,419,430` consumes the user for GWS/plugin/custom contexts. `extensions/gmail-calendar/src/gws-runner.ts:185–198` explicitly returns an unlinked-account error when userId is missing. Thus a previously resolved mapped sender can lose the identity needed by that path, if the relevant tool is available/selected. No live tool execution was attempted.
- This does not show all backend tools fail: Hub query authorization can derive current assignment from agent/server context independently. It also does not demonstrate privilege escalation. `pi-tools/pi-tools.ts:477–479` treats an absent owner marker as unauthorized and filters owner-only tools. Other security consequences still need tool-specific negative tests; neither blanket safety nor a bypass is established by missing fields alone.

The queued mock test independently characterizes omitted injected attributes. It does not by itself execute the deeper attempt environment, but the explicit production object and consumer reads establish the loss structurally. Report E1 makes this distinction adequately.

## E2: nominal no-tools forwarding

Confirmed mismatch between selected optimization/prompt and runtime switch, without a demonstrated unauthorized action.

`get-reply.ts:294` derives smartRouteDisableTools. `get-reply-run.ts:203–205` uses it for fast-chat prompt/memory preparation; the prepared run, immediate context/base builders and primary `agent-runner-execution.ts:272` invocation do not carry it as disableTools. `attempt-env.ts:114–116` switches tool construction off only when the actual parameter is true. Therefore this router flag does not mechanically guarantee an empty tool array. Independent tool policies can still deny/filter tools; the report must not promise that a particular permitted tool will be called, or claim an RBAC bypass.

The heuristic characterization proves that an opt-in short destructive instruction selects ECO, returns disableTools and retains its pinned route. It proves neither a destructive operation nor task failure/cost advantage. The final report correctly labels selection versus outcome and treats sticky routing suitability as an experiment.

## E3: queued request/execution IDs and cancellation

Confirmed missing accepted-item lifetime association in the traced optional queue path; full WebSocket queue/Stop interleaving remains unexecuted.

A fresh background execution UUID is reasonable. The characterization's createFollowupRunner options belong to the active/draining turn A (`agent-runner.ts:255`), not necessarily the original queued B. Inheriting canceled A's signal into B could itself be incorrect. The revised test name and report no longer use this omission alone as proof that B cancellation failed.

The stronger source chain is: while an active run selects followup behavior, `agent-runner.ts:231–235` enqueues B and returns; queue/types.ts has no accepted B run ID/signal/controller carrier; later followup-runner.ts:117 creates an independent execution UUID. Meanwhile WS handler `chat/handlers.ts:397–468` can emit a synthetic final, cache accepted B as ok and retire B's abort controller after the enqueue-only dispatch has returned. Exact chat.abort at `handlers.ts:157–169` consults that accepted-controller registry, not an explicit queued-item relation. These source transitions support the lifecycle/correlation gap and motivate an actual deferred active-A/queued-B/exact-Stop test. They do not establish a live occurrence, effect execution after a real cancel or a cross-session exploit.

The report correctly distinguishes stop mechanisms after correction: ordinary auto-reply channel `/stop` clears session queues at `auto-reply/reply/abort.ts:239–240`; WS chat.send intercepts `/stop` earlier and uses its chat-controller registry instead, as does exact chat.abort. This review does not generalize one path's queue clearing to every channel.

## Hub/Site crosscheck and security claims

Site sends role member (`member-gateway.svelte.ts:30`). Gateway schema accepts a nonempty role structurally, but `server/ws-connection/message-handler.ts:378–386` rejects anything except operator/node and closes1008 before later method authorization. The updated crosscheck confirms this exact source incompatibility. It does not establish deployed Site behavior and is not grounds to weaken authorization.

Hub manifest classification remains an envelope-selection sidecar; it is not the primary model/agent engine. Browser UI tools/automatic follow-ups are another adapter and Slice3 remains deferred. The report's shared-engine observation preserves this distinction. The unprobed global idempotency/session-binding concern remains explicitly a test/review requirement, not a confirmed exploit.

## Outcome and continuation limits

No remaining report blocker found after the corrections above. E1/E2 are confirmed production-source boundary defects with limited, conditional capability/optimization consequences; E3 is a source-backed lifecycle association gap whose requested end-to-end acceptance test has not run. The report fairly separates these from speculative authorization impact and unmeasured quality/savings claims. P1/P2 are appropriate bounded future work; they are not repairs included in the completed first-wave candidate. Existing mocked/AST evidence is sufficient for this reconnaissance decision, not for a release or full transport-parity claim.

## Proposal and portable rerun follow-up

Read-only crosscheck of proposal section “Shared web and WhatsApp engine follow-up” found no drainer-signal, Site deployment or security overclaim. Its E1/E2 row preserves the fail-closed GWS limitation, E3 explicitly rejects blindly inheriting the draining turn's signal, Site E6 remains a source admission mismatch, and the extension remains proposed rather than part of the reviewed 32-slice implementation. Proposal file SHA-256 at review: `26674a9a4895fbe90c72dec7ffdde32fe47b1572c99592aaae6ec2099b9c295c`.

Read the portable rerun script and updated reproduction section. The script checks recorded HEAD, all source hashes and the tracked lock before creating owned temporary copies; it leaves preserved evidence and product source untouched. Existing portable-validation/static-probe logs pass. The generated import-heavy `--run` path remains prepared and unexecuted, as the report explicitly states; installed dependency bytes are not certified by its lock check. No additional process or heavy test was run for this follow-up review.
