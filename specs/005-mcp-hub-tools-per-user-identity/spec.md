# Feature Specification: Hub business tools over MCP, under the caller's own RBAC

**Feature Branch**: `005-mcp-hub-tools-per-user-identity`

**Created**: 2026-10-15

**Status**: Draft — security tagged, owner approval required before any code (Constitution V)

**Input**: User description: "Expose the hub's business tools to external MCP clients (Claude Code, Codex, Cursor) with the user's own RBAC. The gateway already serves Streamable-HTTP `POST|GET /mcp` (`gw/src/gateway/mcp/mcp-http.ts`, hand-rolled, OAuth 2.1 DCR+PKCE opt-in) but exports only ~19 read-only infra tools; 30 hub tools carry `mcpExport: true` and nothing registers them; `McpPanel.svelte` tells the owner they are served. Blocking gap: no per-user identity — shared token and OAuth both resolve to `operator.admin`; only an OIDC JWT carries scopes/org/agent, and hub `/api/gateway/jwt` is cookie-only, so a headless client cannot obtain one. Deliver, in dependency order: (1) a headless per-user credential (proposed: a hub-minted short-lived JWT, 1 h, org-scoped, revocable, obtainable from a hub token page or OIDC) that `/mcp` maps to a real agent/org identity; (2) `seedAgentToolsFromRegistry()` registering `mcpExport` tools from TypeBox schemas via `typeBoxToJsonSchema()`, one `tools.invoke {toolId,args}` gateway method, `fixedParams` on `McpToolEntry`; (3) `tools/list` filtered by the caller's identity using `meta.permission`; (4) OAuth store persistence + refresh-token expiry; rate limiting on tool calls. Hard invariant: write tools are never reachable by shared-token or admin-resolved callers. Security tagged."

**Tags**: security, data

**Upstream artifacts**: `audits/2026-10-15-agent-harness/D-mcp-exposure.md`, `00-synthesis.md` §4 and §6 S5, `E-rbac-parity.md`; proposal `proposals/2026-10-15-agent-harness-restoration.md` slice S5 and open question 3.

---

## AS-IS → TO-BE → DELTA *(Minion Constitution, Principle II — not in the Spec Kit template)*

All anchors read 2026-10-15 from gateway `origin/DEV` (`~/.cache/claude-tmp/gw-ro/`) and hub
`origin/master` (`~/.cache/claude-tmp/hub-ro/`). Every count below was re-measured for this spec;
three of them correct the audit (marked ⚠).

### AS-IS (current observable behavior)

| # | Observed | Anchor |
|---|---|---|
| A1 | `/mcp` serves Streamable HTTP (POST JSON-RPC) + SSE (GET), protocol `2025-06-18`, methods `initialize`, `ping`, `tools/list`, `tools/call`, `notifications/*`. | `gw src/gateway/mcp/mcp-http.ts:89-120`, `mcp/protocol.ts:18,79-135` |
| A2 | `tools/list` returns the whole registry unconditionally — no identity argument. | `mcp/protocol.ts:94-95`, `mcp/registry.ts:177-179` |
| A3 | The registry is seeded with 3 core + 7 artifact tools; plugin typed-RPCs flagged `mcp:true` add 9. All read-only. Nothing seeds agent tools. | `mcp/seed.ts:13-44`, `mcp/artifact-tools-seed.ts`, `server.impl.ts:1637-1638` |
| A4 | ⚠ **31** tools in the generated agent registry carry `mcpExport: true` (audit D said 32), of which **30** are hub tools and 1 (`summarize`) is local. **17 of the 30 write** (audit D said 12): `booking_create/reschedule/cancel`, `contact_update`, `contact_tag`, `stock_entry_create`, `order_update_status`, `ticket_create/update/comment`, `task_create/update`, `notes_create`, `brain_remember`, `notify_user`, `module_action`, `tool_builder_save`. | `gw src/agents/tools/_gen/_registry.generated.ts` (enumerated) |
| A5 | `mcpExport` has no consumer that registers anything. Its only readers are the `tools.status` / `tools.inspect` response payloads and the codegen. | `gw src/gateway/server-methods/tools.ts:148,205`; `grep mcpExport src/gateway/mcp/` → no hits |
| A6 | ⚠ **27 of the 30** hub tools carry `meta.permission {module, action}`. **Three carry none: `module_action`, `notes_create`, `notes_query`** — and `module_action` is a write dispatcher over a 17-endpoint allowlist. Audit D-G5 assumed the metas are a complete filter input. | enumerated from `_registry.generated.ts`; `audits/.../C-tool-feeding.md` C-S3 |
| A7 | `/mcp` identity resolution has exactly three outcomes: shared token / password / trusted proxy → `{role:"operator", scopes:["operator.admin"]}`; embedded-OAuth access token → the same admin identity; OIDC JWT → real `scopes`/`userId`/`orgId`/`assignedAgentIds`. No resolver → a hardcoded admin identity. | `gw src/gateway/server.impl.ts:1678-1712`; `mcp/mcp-http.ts:30-34,52-83` |
| A8 | Hub `/api/gateway/jwt` is cookie-authenticated (`requireAuth(locals)` + active org), so a headless client cannot obtain a JWT. | `hub src/routes/api/gateway/jwt/+server.ts:9-15` |
| A9 | The JWT the hub mints is EdDSA, 1 h, `jti`-bearing, claims `{userId, role, agentIds, orgId}`, audience `openclaw-gateway`. | `hub src/server/services/gateway-jwt.service.ts:26,139-183` |
| A10 | ⚠ **`agentIds` in that JWT is empty for every personal agent.** It is read from `user_agents`, and the only writer (`assignAgentToUser`) is called solely when `provisionPersonalAgent` receives a non-empty `serverId` — "migration-only" per its own comment — while the live provisioning path passes `serverId: ''`. The audit's proposed `assignedAgentIds[0]` therefore resolves to nothing. **Not recorded in any audit report.** | `gateway-jwt.service.ts:158-163`; `personal-agent.service.ts:130-139`; `personal-agent-provisioner.ts:111-115` |
| A11 | The gateway keeps a JWT revocation store fed by the `hub.token.revoked` event, and the **WebSocket** connect path checks it. The **`/mcp` identity resolver does not.** A revoked JWT still authenticates an MCP session until it expires. **Not recorded in any audit report.** | `gw src/gateway/server/ws-connection/message-handler.ts:946`; `src/users/token-revocation.ts:57`; `server.impl.ts:1694-1710` (no `isRevoked` call) |
| A12 | Hub RBAC for an agent call is derived **only** from the agent id: `resolveGatewayPrincipal` rejects outright when a `userId` is supplied (`!serverId \|\| !tokenOrg \|\| !agentId \|\| userId` → 403), then maps `personal_agents.agentId` → `profileId` → that human's capabilities. | `hub src/server/auth/assistant-principal.ts:89-185` |
| A13 | Every hub tool calls `hubGet`/`hubPost('<path>', agentId)` with the gateway↔hub server token; the bridge then runs `resolveAssistantPrincipal` → `requireAssistantCapability` (capability check, 403 with a role-readable message) and `agentActor()` stamps `"<name> (via agent)"`. | `gw src/agents/tools/hub/hub-common.ts:48,55-58,76,81-88`; `hub src/routes/api/gateway/_shared/action-auth.ts:22-51` |
| A14 | Every gateway→hub tool call is a **403 in production today** (`ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED`): 11/11 `personal_agents` rows have `gateway_id NULL`. | `audits/.../00-synthesis.md` L1-L2; proposal slice S0 |
| A15 | `McpPanel.svelte` states `/mcp`'s tool list is "the union of MCP-exported gateway methods + plugin RPCs" and renders its card from `tools.filter(t => t.mcpExport && t.enabled)` — a set disjoint from the real `tools/list`. | `hub src/lib/components/builder/McpPanel.svelte:2-7,21` |
| A16 | Embedded-OAuth state is in-memory Maps, lost on restart. Access TTL 1 h, code TTL 1 min, **refresh tokens have no expiry field** and there is no revocation endpoint. OAuth is opt-in and off by default. | `gw src/gateway/mcp/oauth/store.ts:1-6,26-35`; `src/config/types.gateway.ts:499-513` |
| A17 | Rate limiting on `/mcp` is the **auth** rate limiter, consumed inside `authorizeGatewayConnect`. An authenticated client may issue `tools/call` without limit; each call fans out to a hub HTTP request plus Postgres reads. | `server.impl.ts:1680-1686`; `mcp/mcp-http.ts:39,80` |
| A18 | `orgId` reaches a hub tool as a URL query parameter and is exposed to the model in the TypeBox schema; the hub rejects a mismatch with `ASSISTANT_ORG_NOT_ASSIGNED` rather than trusting it. | `hub-common.ts:76-78`; `assistant-principal.ts:141-147` |
| A19 | There is no MCP-only kill switch: enablement is the per-agent tool policy plus plugin enablement. | `audits/.../D-mcp-exposure.md` R7 |

### TO-BE (desired observable behavior + invariants)

1. A hub user can obtain a headless MCP credential for one organization, see it listed, and revoke it; the credential expires on its own.
2. An external MCP client presenting that credential to `/mcp` is a *named user acting in one org*, bound to that user's own personal agent.
3. `tools/list` for that client contains exactly the hub tools whose permission that user holds in that org, plus the infra tools they are allowed; no tool the user cannot invoke is advertised.
4. `tools/call` performs the action through the existing hub bridge, so the existing capability check, org scoping and `"(via agent)"` audit stamp run unchanged.
5. A client that authenticated with the shared gateway token, the gateway password, a trusted proxy, or an embedded-OAuth token sees and can call **read-only infra tools only**.
6. Tool calls are rate limited per credential, and exhaustion is a clean, retryable error.
7. Embedded-OAuth state survives a gateway restart, refresh tokens expire, and both can be revoked.
8. `/capabilities` shows the owner the tool list `/mcp` actually serves.

**Invariants** (each is a test, see DELTA):

- **INV-1 (hard)** No tool classified as a write is reachable by a caller whose identity was resolved as admin from a shared credential (token, password, trusted proxy, embedded OAuth) or by any caller with no `userId`/`orgId`. Enforced at `tools/list` *and* at `tools/call`.
- **INV-2** For every caller, `tools/list` ⊆ {tools the same caller can successfully `tools/call`} modulo business-state failures. A tool absent from the list is refused if called directly.
- **INV-3** A tool exported over MCP with no declared permission is treated as denied, not as unrestricted.
- **INV-4** The org a call acts in is taken from the credential, never from a tool argument.
- **INV-5** A revoked or expired credential authenticates nothing, on every `/mcp` request, not only at session start.
- **INV-6** No new RBAC, org-scoping, masking or audit logic is written: every hub tool call keeps going through `hubGet`/`hubPost` → `resolveAssistantPrincipal` → `requireAssistantCapability` → `agentActor`.

### DELTA (transitions, each with the proof that it happened)

| # | From (AS-IS) | To (TO-BE) | Proof |
|---|---|---|---|
| D1 | A8, A10 — no headless credential; JWT `agentIds` empty | A user can mint a named, org-scoped, revocable, short-lived MCP credential without a browser cookie, and it carries the user's personal agent id | Unit: minting with no cookie but a valid credential returns a token whose `agentIds` is non-empty for a provisioned user. Negative: cookie-less request with no credential → 401; credential for org X cannot mint for org Y |
| D2 | A10 — `user_agents` row never written for a personal agent | The personal agent id reaches the gateway identity (either by backfilling the assignment or by resolving it in the issuer) | Unit on the issuer: a provisioned personal agent appears in the claim. Integration: `/mcp` `tools/call` on a read tool returns data, not `ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED` |
| D3 | A11 — MCP resolver skips the revocation store | Every `/mcp` request rejects a revoked credential | Unit: revoke, then the next POST → 401 |
| D4 | A3, A4, A5 — `mcpExport` registers nothing | The 27 permission-declaring hub tools are registered as MCP tools with their TypeBox schemas converted to JSON Schema | Test: registry contains one entry per permission-declaring `mcpExport` hub tool; each `inputSchema` is a valid object schema; `tools/list` as a full-capability user returns exactly those 27 |
| D5 | A2, A6 — unfiltered list; 3 tools have no permission | `tools/list` is filtered by the caller's capabilities, and a permissionless tool is excluded (INV-3) | Table test over ≥3 personas (full, view-only, single-module) asserting exact list membership; `module_action`/`notes_*` absent from every persona's list until each is given a permission |
| D6 | A7 — admin identity reaches every tool | INV-1: admin-resolved callers get infra tools only, at both list and call | Negative test per credential kind: shared token `tools/list` has zero hub tools; direct `tools/call` of a write tool → refused |
| D7 | A13 — one gateway method per tool does not exist | One invoke method carries `{toolId, args}`; each MCP entry pins its own `toolId` | Unit: two different MCP tool names dispatch to the same method with different pinned ids; an entry's pinned value cannot be overridden by caller args |
| D8 | A17 — no per-call limit | Tool calls are limited per credential with a retryable error | Test: N+1 calls in the window → the last is refused with a limit error, and the limit is per credential not global |
| D9 | A16 — OAuth state in memory, refresh never expires | OAuth state survives restart; refresh tokens expire and can be revoked | Unit: an expired refresh token is refused; a persisted client/token is found after a store reload |
| D10 | A15 — `/capabilities` misreports | The panel shows the list `/mcp` serves | Component/integration test that the panel's source is the MCP tool list, not the `mcpExport` flag |
| D11 | A19 — no MCP kill switch | An operator can disable a tool for MCP without disabling it for the in-app agent | Config test: tool disabled for MCP is absent from `tools/list` and refused at `tools/call` while the in-app agent still loads it |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mint a headless MCP credential (Priority: P1)

A hub user opens their hub settings, creates a credential for the organization they are working in,
copies it once, and pastes it into their local MCP client configuration. They can see the credential
listed with its creation time and expiry, and revoke it. Nothing about the gateway's shared secret is
involved.

**Why this priority**: Without it there is no per-user identity at all, and exporting the 17 write
tools over the existing admin-resolved paths would mean one leaked gateway token is unscoped write
access to every organization's business data (audit D R1). This story is the whole reason the
feature is ordered the way it is.

**Independent Test**: Fully testable without any MCP tool export: mint a credential, present it to
`/mcp`, and observe that `initialize` succeeds and the session reports the user's own identity and
organization rather than an administrator's.

**Acceptance Scenarios**:

1. **Given** a signed-in user who is an active member of organization O, **When** they create an MCP credential for O, **Then** they receive a secret shown exactly once, and the credential is listed with its organization, creation time and expiry.
2. **Given** that credential, **When** a headless client presents it to `/mcp`, **Then** the session's reported identity is that user in O, with that user's roles — not an administrator.
3. **Given** that credential, **When** the user revokes it, **Then** the very next `/mcp` request with it is rejected as unauthenticated.
4. **Given** a credential that has reached its expiry, **When** it is presented, **Then** it is rejected without the client being able to extend it.
5. **Given** a user who is a member of several organizations, **When** they mint a credential, **Then** the credential names exactly one organization and cannot act in another.
6. **Given** a user whose membership in O is removed, **When** an unexpired credential for O is presented, **Then** it no longer grants access to O's data.

---

### User Story 2 - See only the tools I may use (Priority: P1)

An external MCP client connected with a user's credential lists the available tools and sees the hub
business capabilities that this user's role actually permits — scheduling tools for a receptionist,
stock tools for a stockkeeper — and does not see tools their role forbids.

**Why this priority**: Equal-first with Story 1 because an unfiltered list is how an agent wastes a
turn on a guaranteed 403 (the owner's own agent did exactly this on 2026-10-13, audit L2), and
because the list is itself an information disclosure: it tells an outside client which capabilities
exist in the organization.

**Independent Test**: With one credential per persona, compare the returned tool list against that
persona's capabilities; no tool call is needed.

**Acceptance Scenarios**:

1. **Given** a credential for a user with full capabilities in O, **When** the client lists tools, **Then** all 27 permission-declaring hub business tools appear with usable argument schemas, and the 3 permissionless ones do not.
2. **Given** a credential for a user with view-only capabilities, **When** the client lists tools, **Then** only read tools appear and every write tool is absent.
3. **Given** a credential for a user with capabilities in one module only, **When** the client lists tools, **Then** only that module's tools and the permissionless infra tools appear.
4. **Given** a hub tool that declares no permission, **When** any client lists tools, **Then** that tool is absent (INV-3).
5. **Given** a tool absent from a client's list, **When** that client calls it by name anyway, **Then** the call is refused for lack of permission, not executed (INV-2).
6. **Given** an organization with a module disabled, **When** a client with capabilities in that module lists tools, **Then** that module's tools are absent.

---

### User Story 3 - Do real work under my own permissions (Priority: P1)

From Claude Code, Codex or Cursor, the user asks for a business action — look up tomorrow's bookings,
create a support ticket, record a stock entry — and it happens in the hub as if they had done it in
the web app, attributed to them, within their organization.

**Why this priority**: This is the feature's purpose. It is third only because it is meaningless
without Story 1's identity and dangerous without Story 2's filter.

**Independent Test**: With one credential, call one read tool and one write tool and verify the hub
state and the audit attribution.

**Acceptance Scenarios**:

1. **Given** a credential for a user with read capability in a module, **When** the client calls that module's read tool, **Then** it returns that organization's data only.
2. **Given** a credential for a user with write capability, **When** the client calls a write tool, **Then** the hub records the change attributed to that human "via agent".
3. **Given** a credential for a user without the capability a tool needs, **When** the client calls it, **Then** the client receives a message naming the missing permission, not a bare failure.
4. **Given** any credential, **When** a tool argument names a different organization than the credential, **Then** the call is refused (INV-4).
5. **Given** a tool call that fails on business state (no open till, no such record), **When** it is called, **Then** the client receives the business reason, distinguishable from a permission refusal.

---

### User Story 4 - A shared gateway credential can read but never write (Priority: P1)

An operator who connects an MCP client with the gateway's shared token — the way the endpoint is used
today — still gets the infrastructure tools they get now, and gets no hub business write capability.

**Why this priority**: This is INV-1, the feature's hard invariant and the condition the owner set.
It must ship in the same change as the export, not after it, because the export is what creates the
exposure.

**Independent Test**: Connect with the shared token and assert the list and a direct write call.

**Acceptance Scenarios**:

1. **Given** a shared-token connection, **When** the client lists tools, **Then** no hub business tool appears.
2. **Given** a shared-token connection, **When** the client calls a write tool by name, **Then** it is refused.
3. **Given** an embedded-OAuth connection, **When** the client lists or calls, **Then** it behaves exactly as the shared-token connection (the current consent is the gateway secret, not a user login).
4. **Given** a connection with no resolvable user and organization, **When** any hub tool is called, **Then** it is refused.

---

### User Story 5 - A runaway client cannot take the business down (Priority: P2)

An agent loop or a misconfigured client cannot saturate the hub and its database through `/mcp`.

**Why this priority**: Each tool call is a hub HTTP request plus database reads (A17); the hub has
already had a production incident from unmetered background load. P2 because the blast radius is
availability, not data.

**Independent Test**: Issue calls past the limit on one credential and observe refusal, and that a
second credential is unaffected.

**Acceptance Scenarios**:

1. **Given** a credential at its call limit, **When** another call is made, **Then** it is refused with a retryable limit error naming when to retry.
2. **Given** two credentials, **When** one is limited, **Then** the other is unaffected.
3. **Given** repeated refused cross-organization attempts, **When** they exceed a threshold, **Then** they are visible to an operator as a security signal rather than lost in routine logs.

---

### User Story 6 - The owner is told the truth about what is served (Priority: P3)

The owner opens `/capabilities` and the MCP section lists what an external client would actually
receive.

**Why this priority**: A wrong capability display is how the gap survived; but it is reporting, not
access. P3.

**Independent Test**: Compare the panel's list against `/mcp`'s list for the same identity.

**Acceptance Scenarios**:

1. **Given** the MCP section, **When** it loads, **Then** its tool list equals the list `/mcp` serves.
2. **Given** a tool disabled for MCP only, **When** the section loads, **Then** it is shown as not served while remaining available to the in-app assistant.

---

### Edge Cases

- **Multi-organization user.** 3 of 11 users are members of several organizations with different production gateways; the owner is in 4 organizations across 3 gateways. One credential therefore names one organization, and a user working across organizations holds several credentials. (Proposal "S0 design constraint".)
- **User with no provisioned personal agent** (1 of 11 rows is `pending` with no organization membership): minting must fail with a clear reason, not issue a credential that cannot act.
- **Production bridge is dead today** (A14): until the personal agent assignment is restored, every hub tool call over MCP returns the same 403 the in-app agent gets. This feature's acceptance cannot be demonstrated before that is fixed — it is a hard dependency, not a parallel task.
- **Permissionless tools** `module_action`, `notes_create`, `notes_query` (A6): `module_action` is a write dispatcher over 17 endpoints, so an unfiltered export would hand an outside client a write fan-out with no declared permission.
- **Credential presented after the user's role was narrowed**: capabilities are read per call from the hub, so narrowing takes effect without re-minting; only organization membership removal needs the credential to stop working.
- **Gateway restart mid-session**: an MCP client must be able to reconnect and re-list without the user re-minting anything, which is why in-memory OAuth state and in-memory credential state are a correctness issue, not only a convenience one.
- **Tool argument carrying an organization id** (A18): the hub already refuses a mismatch; exposing the field to an outside model turns those refusals into routine traffic that must stay distinguishable from a real attack.
- **A tool whose list entry says "allowed" but whose call fails on a check the list does not model** (module disabled, owner scope, field masking — audit E-S4/S5/S6): the list must not promise more than the call delivers.
- **Two MCP tool names backed by one invoke method**: the pinned tool id must not be overridable by caller-supplied arguments, or any tool becomes a path to any other.

---

## Requirements *(mandatory)*

### Functional Requirements

**Credential (Story 1)**

- **FR-001**: A signed-in hub user MUST be able to create a headless MCP credential scoped to exactly one organization in which they hold an active membership.
- **FR-002**: The system MUST show the credential secret exactly once at creation and never again.
- **FR-003**: Each credential MUST carry an expiry and MUST stop authenticating at that expiry without any client-side action.
- **FR-004**: A user MUST be able to list their credentials (organization, created, expires, last used) and revoke any of them.
- **FR-005**: Revocation MUST take effect on the next `/mcp` request, not at the next session start (INV-5).
- **FR-006**: The system MUST refuse to issue a credential to a user with no active membership in the requested organization, and MUST refuse to issue one for an organization the requester is not a member of.
- **FR-007**: A credential MUST resolve, on the gateway, to a named user, one organization, and the personal agent of that user, with no administrator scope.
- **FR-008**: The system MUST refuse to issue a credential when the requester has no personal agent able to act in that organization, stating that reason.
- **FR-009**: Credential creation, revocation and rejected-use events MUST be recorded as security events attributable to the user.

**Tool export and filtering (Stories 2, 4)**

- **FR-010**: Every hub business tool flagged for MCP export **and declaring a permission** MUST appear in the MCP tool table with a machine-readable argument schema derived from the tool's own declared schema (no second schema source). The 3 flagged tools that declare no permission are not exported (FR-012, Clarifications Q3).
- **FR-011**: `tools/list` MUST be filtered by the calling identity's capabilities in the credential's organization.
- **FR-012**: A tool with no declared permission MUST be excluded from every caller's list and refused on call (INV-3).
- **FR-013**: A caller whose identity resolved from a shared credential (shared token, gateway password, trusted proxy, embedded OAuth) MUST receive zero hub business tools and MUST be refused on any hub business tool call (INV-1).
- **FR-014**: A caller with no resolvable user and organization MUST be refused on any hub business tool call.
- **FR-015**: `tools/call` MUST apply the same permission test as `tools/list`, so that list membership and call permission cannot disagree (INV-2).
- **FR-016**: Tools MUST be excluded from a caller's list when the credential's organization has that tool's module disabled.
- **FR-017**: The tool table MUST be able to pin per-tool invocation parameters that caller-supplied arguments cannot override.
- **FR-018**: An operator MUST be able to withhold an individual tool from MCP without withholding it from the in-app assistant.

**Execution (Story 3)**

- **FR-019**: A hub business tool invoked over MCP MUST execute through the existing agent→hub bridge so that the existing capability check, organization scoping and audit actor stamp apply unchanged (INV-6). No new authorization, scoping, masking or audit code is introduced by this feature.
- **FR-020**: The organization a call acts in MUST be taken from the credential; a conflicting organization in the arguments MUST cause refusal (INV-4).
- **FR-021**: A permission refusal MUST be returned to the client as a message naming the role limitation, distinguishable from a business-state failure and from a transport error.
- **FR-022**: Tool results MUST be returned to the client in the protocol's normal result shape, with execution failures marked as tool errors rather than protocol errors.

**Limits and durability (Story 5)**

- **FR-023**: Tool calls MUST be rate limited per credential, independently of other credentials, with a refusal that tells the client when to retry.
- **FR-024**: Repeated refused cross-organization or forbidden calls MUST be surfaced to an operator as a security signal.
- **FR-025**: Embedded-OAuth client registrations and tokens MUST survive a gateway restart.
- **FR-026**: Embedded-OAuth refresh tokens MUST have an expiry and MUST be revocable.
- **FR-027**: While its consent step is the gateway secret rather than a user login, the embedded OAuth path MUST remain opt-in and off by default, and MUST never yield hub business capability (an instance of FR-013).

**Reporting (Story 6)**

- **FR-028**: The hub capability view MUST derive its MCP tool list from what `/mcp` serves, not from the export flag.
- **FR-029**: The documentation a user needs to connect a client (endpoint, credential, how to revoke) MUST be reachable from where the credential is created.
- **FR-030**: Every tool withheld from export for lack of a declared permission MUST be recorded in the open-items ledger (`proposals/`) with an in-code `TODO(handoff)` at the tool's meta, per the Minion Constitution's open-items ledger.

### Key Entities

- **MCP credential**: a headless, per-user, single-organization, time-limited, revocable secret. Attributes: owner, organization, created, expires, last used, revoked. Relationships: belongs to one user and one organization; resolves to one personal agent.
- **Resolved MCP identity**: what the gateway derives per request from a credential — user, organization, that user's roles, the personal agent to act as, and how it authenticated. Distinguishes a named user from an administrator resolved from a shared credential.
- **Exported tool entry**: an advertised tool name, its description, its argument schema, the permission it requires, its pinned invocation parameters, and whether it is withheld from MCP.
- **Capability set**: the user's permitted module/action pairs in the credential's organization. Read per call from the hub; it is the authority for both list filtering and call refusal.
- **Call budget**: the per-credential allowance for tool calls in a window.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from "signed in to the hub" to "an external client has listed the tools" in under 5 minutes using only the hub UI and a copy-paste, with no gateway secret and no administrator involvement.
- **SC-002**: All 27 permission-declaring hub business tools are listable by a full-capability user; today the number is 0. The remaining 3 (`module_action`, `notes_create`, `notes_query`) are listable by nobody until they declare a permission (Clarifications Q3) and each is recorded in the open-items ledger.
- **SC-003**: For each of at least 3 role personas, the listed tool set equals the set that persona can successfully call — 0 tools listed-but-forbidden, 0 forbidden-but-callable.
- **SC-004**: A credential holding no capability for a tool, and a shared-credential caller, each achieve 0 successful hub business writes across the full exported write tool set (16 of the 17 writes; `module_action` is not exported per Q3) — the feature's hard invariant, measured as an exhaustive negative test, not a sample.
- **SC-005**: A revoked credential fails on the first request after revocation, 100% of attempts.
- **SC-006**: Every hub write performed over MCP is attributable in the hub to the human who owns the credential; 0 writes recorded as anonymous or as the gateway.
- **SC-007**: A single credential cannot cause more than its configured number of hub requests per window; a loop test stays within budget and the rest are refused.
- **SC-008**: The owner-visible capability list and the list an external client receives agree on every entry, verified automatically rather than by eye.
- **SC-009**: No new authorization, organization-scoping, field-masking or audit code path is introduced: the count of places that decide "may this agent do this" does not increase.
- **SC-010**: An operator can withhold any single tool from MCP and confirm within one restart-free interval that external clients no longer see or can call it, while the in-app assistant still uses it.

---

## Assumptions

- The credential is a hub-minted, short-lived (1 h), organization-scoped, revocable token obtained from a hub token page, as the proposal's open question 3 proposes. *(ASSUMPTION — owner to confirm; see Clarifications Q1.)*
- The export reuses the gateway's existing `/mcp` origin; no second MCP server is built in the hub. (Audit D "Smallest design", explicit.)
- Restoring the production personal-agent/gateway assignment (proposal slice S0) lands before this feature's acceptance can be demonstrated; this spec depends on it and does not re-specify it.
- Capabilities continue to be read from the hub per call (60 s cache) rather than embedded in the credential, so a narrowed role takes effect without re-minting.
- The four hub bridge endpoints with no agent tool (`pos-sale`, `booking-complete`, `stock-issue-from-*`) stay out of scope, as in the proposal's "Out of scope".
- Public reachability of `/mcp` through the production reverse proxy is unverified (audit D R4) and is confirmed by an operator before the write surface is enabled, not assumed.
- Existing audit reports' counts were re-measured for this spec; where they differ (A4, A6, A10) the measurement in this spec is authoritative and the audit is left as-is.

## Clarifications

### Session 2026-10-15

Answered from the cited evidence by the agent executing the workflow, with no owner present. Every
answer that is a judgement call rather than a reading is tagged.

Ambiguity scan coverage (taxonomy from the clarify workflow): Functional scope **Partial** → Q3, Q4.
Domain/data model **Partial** → Q2, Q5. Security & privacy **Partial** → Q1, Q2 (the highest-impact
unresolved area, so it took two of the five). Interaction/UX **Clear** (Stories 1 and 6). Edge cases
& failure handling **Clear** (9 listed). Non-functional: reliability **Partial** → covered by FR-025
without a question (the evidence is unambiguous); performance/scale **Partial** → covered by FR-023
without a question; observability **Partial** → FR-024. Integration & dependencies **Clear**
(protocol revision and bridge are pinned by anchors). Constraints/tradeoffs **Clear** (Assumptions).
Terminology **Clear**. Completion signals **Clear** (SC-001…010). Three categories remained
unresolved with no evidence to answer from and are kept as markers below rather than guessed.

- Q: What should the headless per-user credential be — a hub-minted short-lived token, or a full OIDC provider? → A: A hub-minted, short-lived (1 h), organization-scoped, revocable token presented as a bearer credential to `/mcp`, created from a hub token page. Rationale: the hub already mints exactly this token shape (EdDSA, 1 h, `jti`, `{userId, role, agentIds, orgId}`, audience `openclaw-gateway` — `gateway-jwt.service.ts:26,139-183`) and the gateway already validates it as its only RBAC-carrying path (`server.impl.ts:1694-1710`); the only missing piece is a non-cookie way to ask for one (`jwt/+server.ts:9-15`). Standing up an OIDC provider would add an identity system to own. *(ASSUMPTION — owner to confirm: this is proposal open question 3, which the owner has not answered.)*
- Q: Does one credential act in one organization, or in several? → A: One organization per credential. Rationale: the hub's agent principal resolution binds a personal agent to exactly one gateway and one organization and refuses any requested organization that differs (`assistant-principal.ts:128-147`), and 3 of 11 users are in organizations on different gateways (proposal "S0 design constraint"). A multi-organization credential would need a resolver change that is an owner decision (proposal open question 1).
- Q: Are the three tools that declare no permission (`module_action`, `notes_create`, `notes_query`) exported over MCP? → A: No, not until each declares a permission. Rationale: measured at `_registry.generated.ts` — they carry no `meta.permission`, and `module_action` dispatches writes to a 17-endpoint allowlist (audit C-S3: "the hub enforces, the gateway's L1 is advisory"). With the permission metadata as the filter input (audit D-G5), "no permission" can only mean deny, or the filter has a hole exactly where the widest write tool is. Consequence: the exported set is **27 of 30**, and declaring permissions for the remaining three is follow-up work, recorded in the ledger. *(ASSUMPTION — owner to confirm the reduced set.)*
- Q: Does the first delivery include the write tools, or ship read-only first? → A: Writes are included, gated by INV-1 and the per-user filter, in the same change. Rationale: a read-only first release would still require the whole identity and filtering apparatus (Stories 1, 2, 4) to be safe, so splitting it does not reduce risk; and the owner's framing is capability parity, not a read-only viewer. The ordering risk the audit names (D R1 "G3 before G1") is about identity preceding export, which this spec honors by making Story 1 a P1 blocker for Story 3 — not about reads preceding writes. *(ASSUMPTION — owner to confirm; a read-only first slice is a legitimate alternative the owner may prefer.)*
- Q: What does "the user's own RBAC" resolve to — a forwarded user credential, or the user's own agent? → A: The user's own personal agent. Rationale: measured — `resolveGatewayPrincipal` **rejects any call that carries a `userId`** (`assistant-principal.ts:97`) and derives capabilities from `personal_agents.agentId → profileId` (`:149-184`). So per-user RBAC over MCP is achieved by binding the credential to the caller's personal agent, which also means the credential must carry an agent id — and that claim is empty today (A10). This is a reading of the code, not a judgement.

### Deferred — genuine unknowns

- **[NEEDS CLARIFICATION: Which organization's credential may a multi-organization user mint, given that all personal agents currently live on one gateway? Proposal open question 1 ("which gateway should an org's personal agents bind to", proposed `channel = 'prd'`) is unanswered, and the answer decides whether a credential for a second organization can be issued at all or must be refused until per-(user, organization) agent rows exist.]**
- **[NEEDS CLARIFICATION: Is `/mcp` reachable from the public internet through the production reverse proxy? Audit D R4 states the endpoint is always served and that the Netcup Caddy/Swarm rules were not inspected. If it is public, the credential is the only perimeter and the rate limit and alerting requirements (FR-023, FR-024) are launch-blocking rather than hardening.]**
- **[NEEDS CLARIFICATION: Should a credential be revocable by an organization administrator as well as by its owner? FR-004 gives the owner revocation; no evidence in the audits or the proposal covers administrative revocation of another member's credential, and the answer changes the data model (who may act on a credential row).]**
