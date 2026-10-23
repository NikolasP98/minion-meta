# A Chat SDD independent pass 1

Reviewer: `/root/astra_sdd_pulse_digest`. Date: 2026-10-23. **Standards: approved with one nonblocking precision note. Spec: changes_requested.** This review is independent of A authorship. Only this report and the assigned F review report were written. No runtime/spec/index edits, commits, branch operations, browser actions, provider calls or deployment occurred.

## Evidence identity and scope

Workspace prefix: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst`. SDD paths below are relative to `f-evals`; Hub code paths are relative to `a-chat`. Runtime source is Hub `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`, branch `feature/agent-harness-a-chat`, PR base `master`. `bun.lock` SHA-256: `c5e63e6b708c7abc562da19c95d7c317f2fd329fc558b43267e3853d15e454f0`.

Meta HEAD observed during review was `935eb8e4f9846e1aa4cb114fb71476a331d18b08`; its last two commits add SDD documentation above runtime base `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`. All nine A artifacts match the author freeze in `chat-evals-report.md`:

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

Reviewed spec, plan, tasks, research, all three contracts, checklist and board stub against approved parent A03/A04/A05 and A26's Hub seam. Read the repository/engineering/writing/UI instructions and inspected the actual Home/Floating, pending/page ownership, gateway final/smoother, chat transport, model-context/runner/dispatch, router service/route, sanitizer/capture, auth/current-org/RBAC and critical-journeys builder/transport seams. Installed `@minion-stack/shared` is 0.9.0. Its `dist/gateway/client.js` SHA is `5a422c062105db8f59572685ecfd804dd80127ae1c303936a5b28b3b45bfa8f8`, declaration SHA `6de8f659efb405327f5ab29d13b7a43d0c7609805984f5614f988f0f3c899dd1`.

## Standards

The package has source-backed AS-IS/TO-BE/DELTA, parent acceptance coverage, explicit file ownership, serial task dependencies, bounded local state, and required real caller/browser/CI checks. The one-PR group packaging is the owner's explicit override; it does not waive independent review or human merge. No general continuation engine, new wire authority, distributed limiter or production QA service is introduced. A/F and D/E fixture-builder collisions are explicitly serialized.

Read-only checks executed: all frozen hashes matched; repository `parseFrontmatter`, `missingRequiredHeadings`, scalar/array validators and date/state/verdict checks accepted the A board stub. Shared index freshness was not claimed or modified. Runtime tests remain implementation work, not evidence from this document review.

**A1-N1 — nonblocking precision note, limiter lifecycle.** `contracts/chat-evidence.md:47` says to bound/expire added keys using the existing limiter's lifecycle. Actual `src/server/auth/rate-limit.ts:9–25` retains every Map key and only filters timestamps on access; there is no idle-key eviction lifecycle to reuse. While implementing T015, state and test a finite idle/cardinality policy for the new observation namespace, preserving default weight-one behavior for existing callers. This needs no remote limiter or broad auth refactor. The weighted 120-events/minute rule, whole-batch rejection and actor/org key are otherwise explicit.

## Spec — blocking finding

### A1-01 — high: action-caused context transition has no distinguishable provenance

**SDD anchors:** `specs/105-harness-chat/contracts/chat-evidence.md:16–19`, `:11`; `tasks.md:22–24` (T007–T009); `plan.md:65`. Parent A03 (`specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md:310`) requires both rejection of stale awaited actions and a fresh validated continuation after an action itself changes context.

**Actual source path:** `src/lib/assistant/page-context.ts:8–13` increments the same revision and sends argumentless notifications for tool registry changes; `:16–32` does the same for page ownership and location changes. `src/routes/(app)/home/+page.svelte:689–691` and `src/lib/components/layout/FloatingAssistant.svelte:309–311` route every such notification into `pendingSubmissions.invalidate()`. That helper increments the scope epoch at `src/lib/assistant/pending-submission.ts:88–90`, while its scope ownership check is equality of that same epoch at `:67–69`. `src/lib/assistant/runner.ts:64–69` awaits the actual tool; the existing model-context execution interface passes a signal but no transition provenance. These are current production paths, not hypothetical alternate callers.

**Trigger and consequence:** Hold a tool promise in a live bound run. Either that tool registers/replaces page tools, or the user changes page while the promise is held. Both produce the same revision notification and scope-epoch invalidation. The contract requires the same ownership after the await, but then permits a fresh follow-up when the admitted tool changed context. Keeping the current epoch rule rejects the required legitimate tool-transition follow-up. Relaxing it merely because a tool was running can attribute user navigation (including A→B→A) to the tool and send completed old-page results into the new context. “Do not attribute arbitrary later page changes to an already finished tool” does not settle the overlapping case.

**Smallest correction:** Specify a narrow, trusted local handoff for an explicitly action-caused transition, bound to the admitted invocation, opaque surface, prior revision and resulting revision. Separate invalidation caused by external owner/location/teardown/Stop events from the authorized handoff; no model-returned string or mere “tool is executing” flag may confer that authority. A tool without a proven handoff remains conservatively invalidated on context change. Name the actual page-context/model-context notification integration and the minimal opt-in producer(s) that can create the handoff; do not create a generic async execution context system. The fresh follow-up still needs a new preparation binding, unchanged current principal/session, the completed-results subset and the existing root cap.

**Required proving cases:** Through actual mounted Home/Floating plus the actual runner and registry, hold a tool and prove (1) its explicitly owned transition yields exactly one fresh completed-results follow-up and no remaining old-batch calls; (2) user page change during the same await yields no follow-up or further call; (3) page A→B→A, unrelated tool registration, Stop and surface/owner change cannot acquire a handoff; (4) terminal navigation proposals and five-follow-up bound remain unchanged. Add these explicit cases to T007/T009 and the contract before freezing new hashes.

## Acceptance coverage beyond A1-01

| Parent acceptance | Review result and actual proving seam |
|---|---|
| A03 | Exact final claim before `chat.runId` clearing/smoother scheduling is correctly targeted at `gateway.svelte.ts:1316–1349`. Bounded lifetime, unknown/history behavior, Stop, callback origins and root cap are specified. Context-transition provenance is the blocker above. |
| A04 | Additive evidence wrappers preserve existing nullable callers. Actual service `assistant-router.service.ts:130–180`, route capture, and both sanitizer allowlists are named. Requested/resolved identity, invalid/error elapsed time, unknown cost and `p_sandbox` are covered without invented attempts for off/bypass. |
| A05 | Actual auth/CoreCtx and self-only RBAC path, same-origin JSON guard, streamed 16KiB cap, 20-event maximum, fixed kinds, server principal override and weighted per-process limiter are specified. Tests target capture's final sanitized sink. Analytics loss and independent domain evidence remain distinct. |
| A26 Hub | Versioned stdio handshake, source/lock/adapter hashes, reset isolation, actual mounted contexts/route parser/WS final/tool paths and independently generated fixture mutation receipts are specified. Existing builder `tests/fixtures/critical-journeys/build.mjs` compiles actual authority modules and denies stale outputs; transport has explicit synthetic HTTP/WS allowlists. F must exercise the real subprocess adapter, not a fabricated response helper. |

Installed SDK `beginRequest` (`client.js:99–146`, declaration `:111–120`) explicitly distinguishes synchronous pre-send rejection from asynchronous unknown outcomes. The contract's provisional binding and submitted/accepted distinction are compatible. The adapter's fixture-only core-discovery mode is scoped to actual context gating, and callback full-context bypass remains common to all arms. No further blocking finding was identified.

## Disposition and G2 scoring

**Pass 1: changes_requested**, limited to A1-01. Standards are approved with A1-N1; Spec approval requires the bounded contract/task correction and hash-bound re-review. No runtime readiness, merge or deployment is claimed.

Final canonical G2 scores are deferred until revised artifacts are approved. The six axes will be `slice_size`, `dod_verifiability`, `scope_containment`, `impact_zones`, `collisions`, `testability`, scored on the underlying bounded slices with the authorized group packaging, not on the whole group as a single 4–8-hour slice.
