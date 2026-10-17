# Feature Specification: Assistant tool-call hygiene — hub row identity on gateway→hub calls, grouped tool rows

**Feature Branch**: `docs/spec-012-assistant-tool-call-hygiene` | **Repos & PR bases**: minion (gateway) → `DEV` · minion_hub → `master` (lands inside the sandbox POC branch, hub #542) · minion-meta → `dev` (this spec)

**Created**: 2026-10-16 | **Status**: Draft | **Tags**: logic (no new data exposure; the hub's existing header contract is honoured) | **Human gates**: none beyond the normal merge gate

**Input**: Owner, 2026-10-16, on the local sandbox page (verbatim): "I get strange artifacts in the agent turn. See here, too many tool uses (not a problem, but I'd like them grouped instead of per-line. Check why there were so many tool-use errors on this agent turn."

## AS-IS → TO-BE → DELTA *(constitution Principle II)*

**AS-IS** (evidence: local `dev:local --gateway` stack, gateway session `156e589c…`, hub `feat/sandbox-pages-poc` @ `8c1a41bf`, gateway `origin/DEV` @ `39be924dcd6`).

- The hub resolves a gateway bearer token by scanning every `gateway` row and returning the FIRST decrypted match unless the request carries `x-minion-server-id` (`minion_hub/src/server/auth/resolve-identity.ts:114-156`, hint read at `:301`). The assistant principal then requires the agent's `personal_agents.gateway_id` to equal the row the token resolved to (`assistant-principal.ts:95-178`), by design ("an assignment cannot disambiguate a credential").
- The gateway's message-ledger flusher sends the hint (`minion/src/infra/message-ledger-flusher.ts:73-77`, comment: "A physical gateway can serve multiple org-scoped Hub rows with the same runtime token"). The hub tool pack does NOT: `hubGet`/`hubPost` send only `Authorization` (`minion/src/agents/tools/hub/hub-common.ts:57,84`); `HubRest` has no `serverId` (`gateway/hub-rest-registry.ts:9-12`) although the resolved hub-metrics config has one (`gateway/hub-metrics-config.ts:77`).
- Spec 011's bootstrap writes one `gateway` row per seeded org sharing one token. Heap order put `QA Business Org` last (`select ctid … from gateway`: Modules-Off, Personal, Identity-Required, UI Audit, Business). Observed: `GET /api/gateway/query/tool-permissions?agentId=personal-17d8…` → `403 ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED`; with `-H 'x-minion-server-id: qa-local-gateway'` → `200` with the owner's full capability map. Gateway log at every turn: `hub capability fetch returned no snapshot … permission-gated tools will be denied this window` (`agents/tool-search/hub-capabilities.ts:85`), so `finance_query`/`bookings_query`/`crm_*` were stripped even after `load_tools` loaded them.
- Consequence in the owner's turn: the model, denied every data tool and told by `load_tools` that `bookings_query` would exist "next turn", fell back to `find_related {}` (the only remaining "find"-ish tool) 20 times — each `Validation failed … entityId: must have required properties` — until the gateway's loop breaker (`tool-loop-detection.ts` CRITICAL_THRESHOLD = 20) made it stop and apologise. `crm_query` also answered `ASSISTANT_SQL_DISABLED` (known, audit 2026-10-15 C).
- Rendering: the gateway commits one assistant message per tool call. `ChatBlocks.svelte:150-176` already collapses consecutive tool blocks WITHIN a message into one "N tool uses" row, but `FloatingAssistant.svelte:950` renders one `ChatBlocks` + timestamp per message, so a loop shows one wrench + warning + time per call (owner's screenshot).

**TO-BE.**
- Every gateway→hub tool call carries `x-minion-server-id: <hubMetrics.serverId>` when configured, so a token shared by several org rows resolves to the configured row and the agent's assignment check passes. Production is unaffected when rows do not share tokens; where they do (the flusher's stated case), tool calls stop 403ing for the same reason.
- In the floating assistant, a run of meta-only assistant turns (tool calls, reasoning; no reply text) renders as ONE "N tool uses" row above the reply that follows it, with the reply's timestamp; a trailing run with no reply yet renders as one row stamped with the last call's time. Tool-result carrier turns stay hidden and still feed `toolResultsById`.

**DELTA.**
| # | Transition | Proof |
|---|---|---|
| S1 gateway | `HubRest.serverId?`; `setHubRest({…, serverId: hubMetricsResolved.serverId})`; `hubGet`/`hubPost` use `hubHeaders(rest)` = Bearer + hint | `hub-tools.test.ts` "sends x-minion-server-id when the hub rest config carries a serverId"; local proof: gateway log no longer prints "no snapshot", `finance_query` works from `/sandbox` |
| S2 hub | `foldToolTurns(messages)` in `src/lib/chat/blocks.ts`; `FloatingAssistant` iterates `shown = foldToolTurns(messages)` | `blocks.test.ts` (3 cases: fold into next reply, trailing synthetic turn, never across a user message); screenshot of a multi-call turn as one row |

## User Scenarios & Testing

1. **Owner asks for "daily revenue vs bookings" on `/sandbox`** → the agent calls `finance_query`/`bookings_query` (loaded JIT) successfully, previews data through `sandbox.preview`, builds the element; no `find_related` loop. Proof: gateway session transcript + element rendered.
2. **A turn with 3+ tool calls** → the chat shows "3 tool uses" (expandable) above the reply, one timestamp. Proof: screenshot.
3. **Negative control**: a token with NO `serverId` configured behaves exactly as today (no header). Proof: existing `hub_pages` test still asserts only `Authorization`.

## Requirements

- FR-001 `hubGet`/`hubPost` MUST send `x-minion-server-id` iff `HubRest.serverId` is set.
- FR-002 The hub MUST NOT change its token-resolution or assignment rules (SEC-06 stance stays).
- FR-003 Folding MUST be a pure function over the message list; `toolResultsById` MUST keep reading the unfolded list.
- FR-004 Folding MUST never merge across a user message.

## Out of scope / open ends (ledger)

- **Out of scope:** the `find_related` schema (correct), `crm_query`'s `ASSISTANT_SQL_DISABLED` advertising (audit 2026-10-15 C, open), the same per-message rendering on `/home` (`my-agent/ChatTurn.svelte`) — not reported, left as is.
- A local gateway container still serves hub tools for ONE org (one token ⇒ one `serverId` hint); other seeded orgs' personas chat fine but their hub tools 403. Noted in spec 011's follow-ups.
- Until the gateway `:dev` image carries S1, the running local container is hot-patched (two `dist/hub-common-*.js` chunks, header literal `qa-local-gateway`); `dev:local` recreates the container, so the patch is lost on restart — re-apply or wait for the image.
