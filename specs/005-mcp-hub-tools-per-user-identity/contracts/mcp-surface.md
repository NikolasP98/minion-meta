# Contract: the `/mcp` surface as an external MCP client sees it

Transport, protocol revision and method set are **unchanged** from today
(`gw src/gateway/mcp/mcp-http.ts:89-120`, `mcp/protocol.ts:18,79-135`). This contract states only
what changes, plus the behavior that must not change.

## Unchanged (regression surface)

- `POST /mcp` — JSON-RPC 2.0 request/response. `GET /mcp` — SSE for server→client notifications.
- Protocol revision `2025-06-18`; capabilities `{tools: {listChanged: true}}`.
- Methods: `initialize`, `ping`, `tools/list`, `tools/call`, `notifications/initialized`,
  `notifications/cancelled`, `notifications/tools/list_changed`.
- Request body limit, SSE heartbeat, and the `WWW-Authenticate` hint on 401 when OAuth is enabled.
- The existing ~19 read-only infrastructure tools remain listed and callable for every authenticated
  caller, including shared-token callers.

## Authentication

| Credential presented | Resolves to | Hub business tools listed | Hub business tools callable |
|---|---|---|---|
| New per-user credential (valid, unexpired, unrevoked) | Named user + org + personal agent | Those the user's capabilities permit | Those listed |
| New per-user credential (revoked) | nothing → **401 on the very next request** | — | — |
| New per-user credential (expired) | nothing → 401 | — | — |
| Shared gateway token / password / trusted proxy | Administrator, no user, no org | **none** | **none** |
| Embedded-OAuth access token | Administrator, no user, no org | **none** | **none** |
| No credential | 401 (with the OAuth hint when enabled) | — | — |

The 401 body and headers are unchanged from today's unauthorized response.

## `tools/list`

Request shape unchanged. Response shape unchanged (`{tools: [{name, description, inputSchema}]}`).

Changed behavior:
- The list is a function of the caller's identity. Two callers at the same instant may get different
  lists, and the SSE `list_changed` notification remains per-connection.
- A hub business tool appears only when **all** hold: it declares a permission; the caller is a named
  user; the caller's capability set contains that `{module, action}`; the credential's organization
  has that module enabled; the tool is not on the MCP withhold list.
- Tool names for agent-registry tools are the registry tool ids (`bookings_query`, `ticket_create`, …)
  so an external client's tool names match what the hub's own documentation and the owner's
  `/capabilities` view call them.
- `inputSchema` is the tool's own declared schema converted to JSON Schema. The organization-id field
  that some schemas expose remains present but is **ignored** in favor of the credential's
  organization (INV-4); the description must say so, or a model will keep filling it in.

## `tools/call`

Request shape unchanged (`{name, arguments}`). Response shape unchanged: success is
`{content: [{type: "text", text}]}`, tool failure is the same with `isError: true`, and only
protocol-level problems use a JSON-RPC `error`.

Changed behavior, in order:

1. Unknown tool name → JSON-RPC `error` with the invalid-params code (unchanged).
2. Caller is not a named user and the tool is a hub business tool → refused (INV-1). A write is
   refused even if the name was guessed rather than listed.
3. Tool declares no permission → refused (INV-3).
4. Caller's capability set lacks the tool's `{module, action}` → refused, with a message naming the
   missing permission (FR-021). This mirrors the hub's own 403 text
   ("Your role does not permit '<action>' on <module>.", `hub .../_shared/action-auth.ts:30`).
5. Call budget exhausted → refused with a retryable limit error naming when to retry (FR-023).
6. Otherwise: dispatched to the single invoke gateway method with the tool's pinned parameters merged
   **over** the caller's arguments, and with the agent id taken from the resolved identity.
   A caller-supplied `agentId` or tool id is dropped, not merged.

Refusals in steps 2–5 are tool errors (`isError: true`), not protocol errors, so a client shows the
reason to the user instead of treating the session as broken. Each refusal reason must be
distinguishable by a client: permission, limit, organization mismatch, and business-state failure are
four different messages.

## The invoke gateway method (internal, gateway)

One method, reached only through the MCP dispatcher and the existing WebSocket request path.

- Input: a tool id and an argument object.
- The tool id comes from the MCP entry's pinned parameters, never from caller arguments.
- The agent id comes from the resolved MCP identity, never from caller arguments.
- Authorization: the gateway's existing method authorization, plus the capability test above.
- Execution: instantiate the registry tool for that agent and invoke it, so the tool's own
  `hubGet`/`hubPost` call carries the agent id and the gateway↔hub server token exactly as it does
  for an in-app turn (`gw src/agents/tools/hub/hub-common.ts:48,76`).
- No change to any `/api/gateway/**` hub handler. This is the whole of INV-6.

## Negative contract (what must stay impossible)

| # | Must remain impossible |
|---|---|
| N1 | A shared-credential caller performing any hub business write |
| N2 | Any caller reaching an organization other than the credential's |
| N3 | Any caller selecting the agent id, the tool id, or the permission used for the check |
| N4 | A revoked credential authenticating one more request |
| N5 | A tool that declares no permission being listed or called |
| N6 | A tool listed for a caller that the same caller cannot call for permission reasons |
