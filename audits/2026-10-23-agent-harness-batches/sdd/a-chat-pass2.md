# A Chat SDD independent pass 2

Reviewer: `/root/astra_sdd_factory_gateway` (Astra), 2026-10-23. **Standards: approved with notes. Spec: changes_requested.** I did not author A. I read pass 1, independently traced its finding through the current production callers, and reviewed additional transport, cancellation, telemetry and fixture seams. This report does not approve runtime implementation.

## Evidence identity

Workspace prefix: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst`. `Meta` means `f-evals`; `Hub` means `a-chat`. Meta observed HEAD is `1d6fa05484a72fb067e6bd4d8494d3a21b174b06`; Hub source HEAD is `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`. The later meta integration does not change these frozen A files: all nine hashes match `chat-evals-report.md`.

```text
f62f3d424deca94276e9d0553100a6c556c50efd1361c64c7a50661d7fc760bd  specs/105-harness-chat/checklists/requirements.md
61ed25c95f4a3aa49cf5930859b7d60963118e83525dea16a952d27f1d73a343  specs/105-harness-chat/contracts/chat-evidence.md
ac48cc28ad341dcb0e4e322930e1c1167f900d26063b0a42e3b1135662c6fbbc  specs/105-harness-chat/contracts/eval-adapter.md
a4d8e55a3ce0dc73d5ec1c72e3f856d47c1463c53b33290a019f4ae4401f72f5  specs/105-harness-chat/contracts/quickstart.md
29a6a769c98c9cb9d60606d2f69618ac135157250aeaf27b5f9e91fb22c57df5  specs/105-harness-chat/plan.md
d61ce09c0b3383341e47162d5ba391438b3cdb3893e90332f74cfd045d261839  specs/105-harness-chat/research.md
199364ab942516cfa27c5d4a03f7c108f6d59c6c10c0abe37d2b510945a765bd  specs/105-harness-chat/spec.md
d34846576ab76f3e7400d3554478cf819ea2d5329762410295e7b7af09dc81f6  specs/105-harness-chat/tasks.md
bc47ee91d0360ff94ab29f3b89ae712f0c96b98d8caf5fda0fc90c77e7494bee  specs/2026-10-23-harness-chat-spec.md
```

Reviewed the complete A package and board stub against parent A03/A04/A05 and the A-owned A26 fixture seam; relevant repository, Constitution and engineering/writing instructions; actual Home/Floating, pending/page/model-context, runner/dispatch, gateway final/smoother/chat RPC, route service/handler, sanitizer/capture, auth/CoreCtx/RBAC and fixture builder/transport. Installed `@minion-stack/shared` is 0.9.0. Verified SHA-256: Hub `bun.lock` = `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0`; installed `dist/gateway/client.js` = `5a422c062105db8f59572685ecfd804dd80127ae1c303936a5b28b3b45bfa8f8`; its declaration = `6de8f659efb405327f5ab29d13b7a43d0c7609805984f5614f988f0f3c899dd1`.

## Standards

Source-backed AS-IS/TO-BE/DELTA, real-caller test obligations, bounded state, source/dependency pins, repository ownership and acceptance mapping are present. The board stub contains Product, verification and out-of-scope sections. The owner's one-PR-per-group direction is the explicit packaging exception; human merge, live operation and deployment gates remain. The adapter stays a test seam using current product components, not a replacement execution framework. No blocking Standards finding.

A1-N1 from pass 1 is confirmed: Hub `src/server/auth/rate-limit.ts:9–25` never evicts Map keys. The statement in `contracts/chat-evidence.md:47` about reusing an existing key-expiry lifecycle needs precision. T015 should choose and test a finite idle/cardinality policy for the new observation namespace while preserving existing weight-one callers. This is a bounded local implementation detail, not a reason to introduce a remote limiter.

## Spec — blocking finding

### A2-01 — high: the required tool-owned context handoff is indistinguishable from external invalidation

This independently confirms A1-01; it is one finding, not a second scope request.

**Contract:** Meta `specs/105-harness-chat/contracts/chat-evidence.md:16–19` requires unchanged actor/org/agent/session/surface/epoch/page ownership after every await, then permits a fresh completed-results follow-up when the admitted tool itself changed context. T007–T009 (`tasks.md:21–23`) do not define how that transition is established. Parent A03 (`specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md:310`) requires both stale-action rejection and the legitimate transition follow-up.

**Actual callers:** Hub `src/lib/assistant/page-context.ts:8–13,16–32` gives page replacement, location changes and tool-registry changes the same monotonic revision and argumentless notification. Home `src/routes/(app)/home/+page.svelte:689–691` and Floating `src/lib/components/layout/FloatingAssistant.svelte:309–311` route every notification to `pendingSubmissions.invalidate()`. `src/lib/assistant/pending-submission.ts:67–69,88–90` checks and advances the same epoch. `src/lib/assistant/runner.ts:64–69` awaits the actual registered tool; `src/lib/assistant/model-context.ts:25,109–125` supplies a signal but no causal transition identity.

**Trigger and consequence:** While a bound tool promise is pending, either the tool updates page/registry state or the user changes page. Both invalidate the same scope. Strict equality rejects the intended tool-caused follow-up; weakening the check merely because a tool is executing can forward old-page results into a user-selected context. A→B→A does not restore the original authority. The existing prose about changes after a finished tool does not resolve changes during its await.

**Smallest correction:** Define a trusted local handoff created only by explicitly identified application transition producers, tied to the admitted invocation, opaque sending surface and prior/resulting revisions. Name the actual page-context/model-context and producer wiring. External owner/location/Stop/teardown changes must invalidate it; neither tool-output text nor a global “tool running” flag may authorize it. Uninstrumented transitions fail closed. Preserve sequential execution, discard remaining old-batch calls and prepare exactly the completed subset under fresh current ownership and the existing root cap. No general async context service is needed.

**Required tests:** Use mounted Home/Floating with the real runner and registry: an explicitly owned held-tool transition gets exactly one fresh follow-up; a simultaneous user transition gets none; unrelated registration, A→B→A, Stop and surface/owner change cannot claim the handoff. In both cases remaining old-batch calls do not run. Preserve terminal navigation-proposal behavior and the five-follow-up limit. Add these cases explicitly to T007/T009 before freezing revised hashes.

## Additional implementation precision

**A2-N1 — nonblocking, preparation versus accepted-run cancellation.** `contracts/chat-evidence.md:17` says to pass the run's signal. The existing preparation signal cannot be retained as that signal without a lifetime change: Hub `src/lib/assistant/pending-submission.ts:92–97` unconditionally aborts it in `finish`, and successful submission reaches `finish` in Home `src/routes/(app)/home/+page.svelte:749–752` and Floating `src/lib/components/layout/FloatingAssistant.svelte:376`. Make the accepted-run controller/ownership handoff explicit in T005/T008. Test submitted→preparation cleanup→matching final: a valid tool receives a non-aborted run signal, then Stop aborts/revokes that exact run, including after `chat.runId` has been cleared for smoother completion. This clarifies the already-required accepted lifetime; it adds no new parent requirement.

## Other acceptance paths reviewed

| Acceptance | Result |
|---|---|
| A03 transport/final | Actual installed `beginRequest` (`client.js:99–146`) can synchronously reject before dispatch and asynchronously report an unknown outcome. Provisional local binding, submitted versus accepted status, no unknown replay, final-before-ack and exact claim before `chat.runId` clearing/smoother scheduling are compatible. Unknown/history-only output remains renderable without automatic authority. |
| A04 | Additive richer-result wrappers preserve nullable callers. Actual router service/route plus both sanitizer allowlists are covered; requested/resolved model, failed/invalid elapsed time, known zero versus unknown cost, early UUID and p_sandbox are explicit. Off/bypass cannot fabricate a provider attempt. |
| A05 | Current auth/CoreCtx, self-only RBAC classification, explicit JSON origin guard, streamed 16KiB body cap, 20-event batch, fixed event/field schemas, server-owned identity and atomic weighted rate charging are specified. Capture tests reach the real sanitizer and final SDK sink. Client analytics is best effort, not a domain receipt. |
| A26 Hub seam | Versioned actual stdio adapter, mounted product context/router/parser/WS-final/tool paths, strict reset/source/lock/build handshake and independently stored mutation receipts are specified. Existing critical-journeys builder and transport support bounded extension. Three arms cannot be qualified by copied decision algorithms or fabricated protocol responses. |

No further blocking finding was identified. Runtime tests were not run because these artifacts precede implementation; source/signature/hash inspection is the evidence here. Only the assigned review reports were written; no spec, runtime, index or git mutation occurred.

## Disposition

**Pass 2: changes_requested**, limited to A2-01/A1-01. Incorporate the two precision notes during the same bounded revision. Final canonical G2 scores are deferred until the revised exact hashes are approved: `slice_size`, `dod_verifiability`, `scope_containment`, `impact_zones`, `collisions`, `testability`. Evaluate the underlying bounded slices under the authorized batch packaging. No merge, deployment or production-readiness approval is implied.


## Revision 1 bounded rereview — 2026-10-23

**Standards: approved. Spec: approved.** This supersedes the initial changes-requested disposition for the exact revision-1 A hashes below; the original findings remain preserved above. The review was limited to A2-01/A1-01, accepted-run cancellation, limiter precision and the changed caller/fixture contracts. Previously cleared acceptance areas remain cleared.

### Exact approval identity

Verified root author report `chat-evals-revision1.md` SHA-256 `e21e07d47f3ba4665552628632cd3e073be783b2bafae0297a816dad17438f81`, its newline-terminated 17-file manifest SHA-256 `b386fe6e6964bd3ac75cb58644ed68cfe01097a922588dfa36f75bbda29bf02b`, and all 17 files against that manifest. This A approval covers these nine files:

```text
515fef5b0b6e61363f329fbc75757d316903f6295bcc1d6013cd1506ac838ed1  specs/105-harness-chat/checklists/requirements.md
a625c2bd9520949944c9c58c0efb0dbbd63d41d4980ef510a042cfe2ff62f6b4  specs/105-harness-chat/contracts/chat-evidence.md
b4729f80a7323eb0ecc45853e31c6432e9bba10263d0980f1f32a25ccbd05b14  specs/105-harness-chat/contracts/eval-adapter.md
3350788b4208e24c3a54830535034c29c0dc722329fcc37d60c94f34f1e67f23  specs/105-harness-chat/contracts/quickstart.md
8a9712c4815a732d0efbffcaef514992d46c2cd6433faa6052484f64da6ace10  specs/105-harness-chat/plan.md
1d984bd6aeb3a2a853109729701cd7871e6ec3d7b49d811bed4ac8a7c5a6ed81  specs/105-harness-chat/research.md
ce8d8b2de23922f390d0f30e079eb0002e1ddfb9d0e93ac341e9fa0cd7927966  specs/105-harness-chat/spec.md
52b66a5dffdb5b4a87f9af3c248dc24dbf855a1180ee894d1115e5d4cc7502d2  specs/105-harness-chat/tasks.md
dd40370cee877a11d9b7b4611e8e328f6d8a22eb966e2a6fd182e0304230f414  specs/2026-10-23-harness-chat-spec.md
```

### Standards disposition

The revision stays inside parent A03/A05/A26. Its additional sandbox files are the concrete producer integration needed to make the original approved context-transition behavior executable; there is no new navigation capability or generic execution framework. Plan/tasks name ownership and retain serialization for Home/Floating, shared fixture builder and D/E overlaps. Compatibility remains additive for `setPageContext`, ordinary tool execution and native WebMCP callers. The existing human gates and UI governance remain. No Standards issue remains.

### Spec disposition and caller viability

- **A2-01 / A1-01 resolved.** `contracts/chat-evidence.md:27–35` binds a private, nonserializable, one-publication/one-consumption capability to the accepted generation, sender surface, invocation, current tool registration, stable page lease and prior/resulting revisions. Only the three named sandbox mutation tools are enrolled. External changes irrevocably invalidate; payloads, window events and timing cannot acquire authority. Publication ends before settlement; the already-recorded acknowledgement is consumed only at the immediately guarded post-execution boundary within the same expiry. Every remaining old-batch call stops.
- The producer path is viable against actual Hub source. `src/lib/sandbox/tools.ts:189–225,270–302` owns the API writes and current `changed` call; `:314–315` owns page-lifetime registration. `src/lib/sandbox/host.svelte.ts:110–123` owns reload/snapshot assignment and `:187–196` owns unqualified window reloads. `src/routes/(app)/sandbox/+page.svelte:65,71–88` currently recreates page context from reactive host state and registers tools. The revised callback→awaited load→synchronous snapshot/lease publication replaces precisely these ambiguous paths and avoids a duplicate unqualified event. Existing `src/lib/assistant/model-context.ts:23–26,109–118` supports an additive optional local execution-context field without changing serialized schemas. Unenrolled/native execution has no capability.
- T007/T009 now require the actual held mutation/reload positive case plus concurrent user navigation, A→B→A, unrelated registration, duplicate/reordered/forged notification, source unregister, failed refresh, expiry, Stop and owner/surface/lease teardown negatives. Valid flow gets exactly one fresh completed-results continuation; invalid flows get none. T017/T019 carry the real path into the A/F fixture. A completed mutation with a failed refresh is preserved and never replayed to acquire a handoff.
- **A2-N1 resolved.** The accepted generation/controller is separate from the preparation epoch/signal. `contracts/chat-evidence.md:11–13` and T005/T008/T009 explicitly preserve accepted authority across successful preparation `finish`, then revoke the exact accepted run on Stop even after smoother clearing of `chat.runId`. This matches the actual cleanup in `pending-submission.ts:92–97`, Home `:749–752` and Floating `:376`.
- **A1-N1 resolved.** Contract line 59 specifies the new observation namespace's 4,096-key bound, 60-second charged-idle pruning and reject-new-at-capacity behavior without evicting active budgets or refreshing denied timestamps. Existing weight-one callers keep their behavior; T014/T015 require controlled-clock and endpoint proof.

No unresolved pass-2 SDD finding remains. Implementation must still prove ordering and cancellation in the actual mounted paths; this approval is not a runtime result.

### Final G2 scores

Scores are out of 10 on the bounded underlying slices, with the owner's one-PR batch exception.

| Axis | Score / 10 | Basis |
|---|---:|---|
| `slice_size` | 7 | Accepted-run and sandbox handoff integration is the largest bounded slice; the exact producer, lifetime and test seams keep it reviewable. |
| `dod_verifiability` | 9 | Positive and adversarial mounted interleavings, signal lifetime, sanitizer and endpoint limits have concrete observable outcomes. |
| `scope_containment` | 9 | Existing preparation, local registry, sandbox host and limiter are extended; no wire protocol, navigation or general execution service is added. |
| `impact_zones` | 9 | Source producer, page lease, both sending surfaces, gateway final, tool executor and fixture consumers are named. |
| `collisions` | 8 | Shared Home/Floating and A/D/E fixture surfaces require serialization, explicitly retained in the task graph and ownership contract. |
| `testability` | 9 | Real mounted product code, held HTTP reloads, gateway events and final capture sink can qualify the failure modes without paid calls. |

All six axes meet the required threshold. Only this audit was appended; no A specifications, runtime, index or git state was changed. Stop for parent-managed implementation and independent code verification.
