---
id: 2026-09-02-gateway-client-tools-webmcp-bridge
title: Gateway-native client tools — route model tool calls to the originating hub session (WebMCP step 2)
status: draft
created: 2026-09-02
updated: 2026-09-02
repos: [minion, minion_hub, minion-meta]
tags: [assistant, webmcp, protocol]
---

# Gateway-native client tools (WebMCP step 2)

## Context

`minion_hub` PR `feat/assistant-navigation` (2026-09-02) gives the in-app assistant
(floating panel + `/home`) the ability to navigate the dashboard, run spotlight
walkthroughs and fill forms. Tools are registered in-page through a WebMCP-shaped
registry (`src/lib/assistant/model-context.ts`, mirrors `document.modelContext`:
`registerTool` / `getTools` / `executeTool` / `toolchange`) and forwarded to the
native API when a browser ships it.

Because `chat.send` carries plain text only, the model invokes those tools through a
**prompt-driven protocol**: the per-turn context envelope lists the registered tool
schemas, the model emits fenced ```` ```minion-ui ```` JSON blocks, and the hub client
parses the final reply, executes the calls, and sends results back as a silent
follow-up turn (`src/lib/assistant/{ui-blocks,runner,dispatch}.ts`). This works, but:

- it is not native `tool_use` — no schema validation by the provider, results arrive
  one turn late, and every turn re-ships ~2–3 KB of tool schemas + page list that the
  gateway persists in the transcript;
- the follow-up chain is capped at 3 silent turns to avoid loops;
- WhatsApp/Telegram turns never see the tools (by design), so the same agent behaves
  differently per channel.

## Proposed implementation

1. **Gateway (`minion/`)**: extend `chat.send` with `clientTools?: ToolDescriptor[]`
   (name, description, inputSchema, annotations). For the run, register transient
   agent tools whose `execute` emits `ui.tool.request {runId, callId, name, input}` to
   the originating WS connection and awaits `ui.tool.result {callId, result}` (RPC,
   timeout ~30s → tool error). Model: `node.invoke.request/result` in
   `src/gateway/node-registry.ts`, without pairing (the hub session is already the
   authenticated operator).
2. **Shared (`@minion-stack/shared`)**: frame types for the two new messages.
3. **Hub**: `sendAssistantTurn` passes `getTools()` as `clientTools`; `onChatEvent`
   gains a `ui.tool.request` handler that calls `executeTool()` and replies. Delete
   the `minion-ui` fence protocol, `runner.ts` follow-ups and the envelope tool
   section; keep `model-context.ts`, `forms.ts`, `catalog.ts`, `guide` and the page
   wiring unchanged (they are transport-agnostic).
4. **Static context**: move the gated page list + form catalog out of the per-turn
   envelope into `GET /api/gateway/pages` (`hub_pages`) so remote channels get the
   same map without per-turn bloat.

## Acceptance

- A `fill_stock_entry` call made by the model round-trips as native tool_use with the
  page's result in the same run (no silent follow-up turn).
- Transcript size per turn drops back to the pre-2026-09-02 envelope.
- Existing `TODO(handoff)` markers in `minion_hub/src/lib/assistant/ui-blocks.ts` and
  `dispatch.ts` are removed by the PR that lands this.

## Known gaps carried by the 2026-09-02 hub PR (fold into whichever spec picks this up)

- `/crm/customers?new=1` opens `PartyCreateForm`; `POST /api/crm/parties` creates a
  `parties` row, not a CRM contact, so the new party is not listed in the customers grid.
  Either link party→contact on create or point `PARTY_FORM` at a surface that lists
  parties (`TODO(handoff)` in `crm/customers/+page.svelte`).
- `STOCK_ENTRY_FORM.warehouse` maps to one side only (to- for receipt/adjustment,
  from- for issue/transfer); transfers need a second field.
- `PurchaseFormDialog` has no RUC autofill (the CRM picker does) — the assistant copy no
  longer promises it.
