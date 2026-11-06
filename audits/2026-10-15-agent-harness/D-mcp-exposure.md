# D — MCP exposure for external agents

Audit date 2026-10-15. Read-only. Checkouts: gateway `origin/DEV` @ `f2de5e00534`
(`/home/nikolas/.cache/claude-tmp/gw-audit/`), hub `origin/master` @ `4fe89934`
(`/home/nikolas/.cache/claude-tmp/hub-audit/`), plus working trees of
`minion_plugins/`, `paperclip-minion/`, `specs/`, `proposals/`.

## Headline verdict: PARTIAL — the transport exists, the capabilities do not

An MCP **server** does exist and an external agent can connect to it today: the
gateway serves one aggregated Streamable-HTTP origin at `POST|GET /mcp`
(`src/gateway/mcp/mcp-http.ts:86`, mounted at
`src/gateway/server-core/server-http.ts:769`), protocol revision `2025-06-18`
(`src/gateway/mcp/protocol.ts:19`), with `initialize`, `ping`, `tools/list`,
`tools/call`, SSE `notifications/tools/list_changed`, bearer/JWT auth, and an
opt-in embedded OAuth 2.1 AS (DCR + PKCE) for Claude Desktop/web remote
connectors (`src/gateway/mcp/oauth/handlers.ts:7-10`).

What it exposes is the problem. `tools/list` returns **~19 read-only
infrastructure tools** and **zero** of the hub's business capabilities:

| Source | Count | Tools |
|---|---|---|
| `mcp/seed.ts:15,23,30` | 3 | `gateway.health`, `gateway.whoami`, `gateway.reliability_summary` |
| `mcp/artifact-tools-seed.ts:14-65` | 7 | `gw.catalog`, `gw.mcp_tools`, `gw.artifact_spec`, `gw.reliability`, `gw.sessions`, `gw.agents`, `gw.events` |
| plugin typed-RPCs flagged `mcp: true` | 9 | `{telegram,discord,whatsapp}.{accountsSummary,recentMessages,volumeBuckets}` (`extensions/telegram/index.ts:79,91,105` and siblings) |
| manifest-declared `mcpTools` | 0 | no plugin ships an `mcpTools` block (grep over all `*.json`) |

Nothing in that list writes. Nothing in that list touches scheduling, CRM,
stock, POS, finance, tickets, tasks, notes or brains.

## Inventory

| Component | MCP client? | MCP server? | Transport | Auth | Tools exposed | RBAC per user? | Evidence |
|---|---|---|---|---|---|---|---|
| **minion gateway** | yes — per-agent only | **yes** | Streamable HTTP + SSE at `/mcp` | shared bearer / embedded OAuth 2.1 / OIDC JWT | ~19 read-only (table above) | **only on the JWT path** | `src/gateway/mcp/*`, `src/config/types.gateway.ts:496-514` |
| gateway → pi embedded runner | **yes (client)** | no | stdio/url per `<agentDir>/mcp.json` | operator-owned agent dir | consumes external servers for its own agents | n/a | `src/agents/pi-embedded-runner/codemode.ts:53-60` |
| gateway ACP server | no | no — ACP, not MCP | stdio (ndjson) | gateway token/password | explicitly **drops** client MCP servers | n/a | `src/acp/server.ts:1-40`, `src/acp/translator.ts:126,156` ("ignoring N MCP servers") |
| **minion_hub** | no | **no** | — | — | — | — | no `@modelcontextprotocol/sdk` in `package.json`; no `src/routes/mcp/` |
| hub `model-context.ts` | n/a | **no** — in-page registry | none (same JS realm) | browser session | page tools (navigate, highlight, fill form) | browser session's own RBAC | `src/lib/assistant/model-context.ts:1-14,41` — a `Map` + `document.modelContext` forward, never a network listener |
| hub `/capabilities` → MCPs tab | no | no | — | — | renders a card for the gateway `/mcp` origin | n/a | `src/routes/(app)/capabilities/+page.svelte:20`, `src/lib/components/builder/McpPanel.svelte:1-28` |
| hub `/marketplace/mcp-servers` | no | no | — | — | **empty state, "coming soon"** | n/a | `src/routes/(app)/marketplace/mcp-servers/+page.svelte:10-17` |
| **minion_plugins** | no | no | — | — | nothing — zero hits for `mcp` / `.mcp.json` across the marketplace | n/a | grep over `minion_plugins/` |
| **paperclip-minion** | no | **yes (separate product)** | **stdio** (`paperclip-mcp-server` bin) | `PAPERCLIP_API_KEY` env bearer + `PAPERCLIP_COMPANY_ID` | 23 read + write tools over Paperclip's own REST API | no — one static API key | `packages/mcp-server/package.json`, `README.md`, `src/{tools,client,config,stdio}.ts`; dep `@modelcontextprotocol/sdk ^1.29.0` |

Paperclip's server is the only one in the fleet built on the official SDK, and
it is the right shape (thin wrapper over the existing REST API, no reimplemented
business logic — `packages/mcp-server/README.md:5-7`). It covers Paperclip, not
the hub.

## Gap list

**G1 — the 30 hub business tools are flagged for MCP export and never exported.**
32 agent tools carry `mcpExport: true` (`src/agents/tool-governance/tool-meta.ts:69-70`,
"If true, include in MCP server export"), 30 of them the hub tools:
`bookings_query`, `booking_create/reschedule/cancel`, `contact_update`,
`contact_tag`, `crm_conversation_themes`, `search_crm_conversations`,
`finance_query`, `stock_query`, `stock_entry_create`, `orders_query`,
`order_update_status`, `tickets_query`, `ticket_create/update/comment`,
`task_create/update`, `notes_query`, `notes_create`, `projects_query`,
`brains_list`, `brain_search`, `brain_remember`, `email_recent`, `hub_pages`,
`module_action`, `notify_user`, `tool_builder_save`
(`src/agents/tools/_gen/_registry.generated.ts:94-431`).
The flag has **no consumer that registers anything**: its only readers are
`tools.status` and `tools.inspect` response payloads
(`src/gateway/server-methods/tools.ts:148,205`) and the generator
(`scripts/generate-tool-registry.ts:131`). Nothing in `src/gateway/mcp/`
reads it. The flag is declarative dead weight.

**G2 — the hub UI misreports the MCP surface.** `McpPanel.svelte:2-7` states
"the gateway exposes a single aggregated origin at /mcp whose tool list is the
union of MCP-exported gateway methods + plugin RPCs, so we derive that one
server card from tools.status (mcpExport flag)", and derives its card from
`tools.filter((t) => t.mcpExport && t.enabled)` (line 22). Per G1 that filter
and `/mcp`'s actual `tools/list` are disjoint sets. The owner is being shown 30
tools as MCP-exported that an external client cannot call.

**G3 — no per-user API-token auth path exists for an external agent.**
The gateway `/mcp` identity resolver (`src/gateway/server.impl.ts:1678-1711`)
has exactly three outcomes:
- shared gateway token / password / trusted proxy → `{role: "operator", scopes: ["operator.admin"]}` (line 1690) — **full admin, no RBAC**;
- embedded-OAuth access token → also `operator.admin` (line 1694), and the consent screen is "operator enters the gateway secret" (`mcp/oauth/handlers.ts:8`), so **OAuth identifies the gateway, not a user**;
- OIDC JWT → real `scopes`/`userId`/`orgId`/`assignedAgentIds` (lines 1700-1709) — the **only** RBAC-scoped path, and it requires `gateway.multiTenant.oidcIssuers` to be configured and the client to already hold a hub-issued JWT.

The hub side is stricter and has no door at all for an external agent:
`resolveAssistantPrincipal` accepts only a gateway server token
(`locals.serverId` → `resolveGatewayPrincipal`, requiring an active
`personal_agents` row on that gateway and org, `assistant-principal.ts:229,95-180`)
or a browser cookie session, self/admin-only (`assistant-principal.ts:230-253`).
`/api/gateway/jwt` is cookie-authenticated (`jwt/+server.ts:9-11`), so a
headless MCP client cannot mint one.

**G4 — OAuth state is in-memory and the refresh token never expires.**
`mcp/oauth/store.ts:3` — "Spike-grade storage (Maps; lost on restart)". Access
TTL 1 h (`:30`), code TTL 1 min (`:29`), refresh tokens have **no `expiresAt`**
(`:27`, `:122`) and no revocation endpoint.

**G5 — tools/list is not filtered by identity.** `protocol.ts:94` returns
`listMcpTools()` unconditionally; identity is only applied at `tools/call`
(`protocol.ts:111`). Agent-tool metas already carry `permission: {module, action}`
(e.g. `bookings-query-tool.meta.ts:7`), so the filter has a ready input.

**G6 — the bridge surface is wider than any MCP list.** The hub has 48
`/api/gateway/**/+server.ts` handlers, of which 13 under `query/` and 19 under
`actions/` are the agent-facing bridge — including `pos-sale`,
`booking-complete`, `stock-issue-from-invoice`, `stock-issue-from-service` that
have **no** gateway agent tool at all, so they are unreachable even if G1 is
fixed by mirroring the tool registry.

**G7 — no prior decision record.** The only MCP-shaped planning artifacts are
`specs/2026-07-14-hub-figma-mcp-transfer-plan.md` (consuming Figma's MCP, not
serving one) and `proposals/2026-09-02-gateway-client-tools-webmcp-bridge.md`
(status `draft`, scopes in-page WebMCP tools to native `tool_use` over the WS
chat path — explicitly *not* a network MCP server). No proposal or spec covers
exposing the hub capability surface to external MCP clients.

## Smallest design that closes it

Reuse the gateway's existing `/mcp` origin. Do **not** build a second MCP server
in the hub: that would mean a new `@modelcontextprotocol/sdk` dependency, a new
per-user API-token table, a new auth path, and — on Vercel — the Streamable-HTTP
stateless-POST dance with no SSE `GET` for `list_changed`. The gateway already
has transport, SSE, rate limiting, OAuth, a tool registry with `list_changed`
reconcile, and e2e tests (`mcp/mcp-server.e2e.test.ts`). It is also a long-lived
process, which is what MCP wants.

**Four small diffs:**

1. **`seedAgentToolsFromRegistry()`** beside the two existing seeds at
   `server.impl.ts:1637-1638`. Iterate `TOOL_REGISTRY`, keep
   `meta.mcpExport && isToolAllowed(id, policy)`, instantiate the factory with
   the caller's agent id and read its `parameters` — the hub tools already
   declare **TypeBox** schemas (`bookings-query-tool.ts:7-22`,
   `parameters: BookingsQuerySchema` at `:41`), and the registry already ships
   `typeBoxToJsonSchema()` at `mcp/registry.ts:93`. No new schema source needed.
   This is the one-loop fix for G1 and makes G2's UI claim true.

2. **One new gateway method `tools.invoke {toolId, args}`** in
   `src/gateway/server-methods/tools.ts`, resolving the agent id from the
   dispatch client's `assignedAgentIds[0]` (already populated for JWT callers at
   `server.impl.ts:1707`). Because the hub tools call
   `hubGet`/`hubPost('<path>', agentId)` with the gateway server token
   (`src/agents/tools/hub/hub-common.ts:48,57,76,84`), every call lands on the
   existing bridge and the existing RBAC runs unchanged:
   `resolveAssistantPrincipal` → `requireAssistantCapability(locals, url, module, action)`
   (`_shared/action-auth.ts:22-33`, 403 with a role-readable message) and
   `agentActor(principalId)` stamping `"<name> (via agent)"`
   (`action-auth.ts:40-50`). **Nothing new is written for RBAC or audit.**

3. **One optional field `fixedParams?: Record<string, unknown>`** on
   `McpToolEntry` (`mcp/registry.ts:62`), merged into `args` at
   `protocol.ts:97-101`, so each of the 30 tool names can map to the single
   `tools.invoke` method carrying its own `toolId`. This is the only change to
   existing MCP code.

4. **Filter `tools/list` by identity** — pass `identity` into `listMcpTools()`
   at `protocol.ts:94` and drop entries whose `meta.permission` the caller's
   scopes do not satisfy (closes G5; reuses `authorizeGatewayMethod`'s inputs).

**Deliberately skipped:** a hub-side MCP route; a new tool-definition layer; an
OAuth-per-user identity provider; the four orphan bridge endpoints in G6 (they
need gateway tools first — separate, product-level decision); the plugin
marketplace shipping `.mcp.json` entries.

**Hard dependency for RBAC to mean anything:** the external client must
authenticate with an OIDC JWT, which requires `gateway.multiTenant.oidcIssuers`
configured and a headless way to obtain a JWT. `/api/gateway/jwt` is
cookie-only today, so **G3 is the blocking gap, not G1.** Shipping G1 without
G3 widens an admin-scoped surface — see risks.

## Risks

- **R1 (critical) — exposing writes before G3 is fixed hands admin to anyone with the gateway token.** Shared-token and OAuth callers both resolve to `operator.admin` (`server.impl.ts:1690,1694`). Registering the 30 hub tools (12 of which write: bookings, contacts, stock, orders, tickets, tasks, notes) over that identity means one leaked `MINION_GATEWAY_TOKEN` is unscoped write access to every org's business data. **Order of work: G3 before G1.**
- **R2 — the embedded OAuth consent is the gateway secret, not a user login.** Anyone who can reach `/oauth/authorize` and knows the gateway secret gets a 1 h admin token plus a non-expiring refresh token (G4). It is off by default (`gateway.mcp.oauth.enabled`, `types.gateway.ts:505-506`) — keep it off until consent is a real per-user login.
- **R3 — in-memory OAuth state cannot be revoked and is lost on restart** (G4). A compromised refresh token stays valid until the process restarts, and there is no revocation endpoint.
- **R4 — `/mcp` is always served, OAuth or not** (`types.gateway.ts:496-497`: "The endpoint itself is always served (bearer-gated)"). Whether it is reachable from the public internet depends on the Netcup Caddy/Swarm reverse-proxy rules, which this audit did not inspect. Verify before treating the bearer gate as the only perimeter.
- **R5 — org scoping rides on a URL query parameter.** `orgId` arrives as `url.searchParams.get('orgId')` and the TypeBox schemas expose `ORG_ID_FIELD` to the model (`bookings-query-tool.ts:21`). The resolver rejects a mismatch (`ASSISTANT_ORG_NOT_ASSIGNED`, `assistant-principal.ts:68-74,137-143`) rather than trusting it, which is correct — but it means an MCP-exposed tool lets an external agent *attempt* cross-org reads, so those 403s will now appear in logs as routine. Rate-limit and alert on them.
- **R6 — rate limiting applies to auth, not to tool calls.** `authRateLimiter` is consumed inside `authorizeGatewayConnect` (`server.impl.ts:1684`); an authenticated client can issue `tools/call` at will. Every call fans out to a hub HTTP request plus Supabase/Postgres reads, so an external agent in a loop is an unmetered load path into prod.
- **R7 — no per-tool kill switch for MCP.** Enablement is the agent tool policy (`isToolAllowed`) and plugin enablement, both restart-gated for plugins (`mcp/reconcile.ts:1-12`). There is no "disable this tool over MCP only" control.
