# Phase 0 research: Hub business tools over MCP, under the caller's own RBAC

Date 2026-10-15. Sources: gateway `origin/DEV` (`~/.cache/claude-tmp/gw-ro/`), hub `origin/master`
(`~/.cache/claude-tmp/hub-ro/`), `audits/2026-10-15-agent-harness/`, `proposals/2026-10-15-agent-harness-restoration.md`.

Every decision below was reached by reading the code named in its anchor. Where no evidence exists,
the item is marked **OWNER-GATED** and carries a recommended default rather than a decision.

---

## R1 — Credential mechanism

**Decision**: Extend the existing hub gateway-JWT issuance with a non-cookie authentication path,
rather than introducing a new token type or an OIDC provider.

**Rationale**: The hub already mints a token with exactly the required claim set and lifetime
(`hub src/server/services/gateway-jwt.service.ts:26,139-183`: EdDSA, 1 h, `jti`, `{userId, role,
agentIds, orgId}`, issuer `GATEWAY_JWT_ISSUER`, audience `openclaw-gateway`), the hub already serves
JWKS (`getJwksPublicKeys`, `:104-130`), and the gateway already validates it as the only path that
yields `userId`/`orgId`/`assignedAgentIds` (`gw src/gateway/server.impl.ts:1694-1710` via
`resolveJwtAuth` → `validateGatewayJwt`). The single missing piece is that
`/api/gateway/jwt` requires a browser cookie (`hub src/routes/api/gateway/jwt/+server.ts:9-15`).

**Alternatives considered**:
- *A new opaque per-user API token table validated by the gateway over HTTP.* Rejected: adds a
  synchronous gateway→hub validation hop on every MCP request, a new table, and a second credential
  format, while the JWT path already exists and is already validated offline against JWKS.
- *Stand up an OIDC provider.* Rejected: an identity system to own, for a credential that is already
  minted correctly. Keeps the option open — the gateway's `oidcIssuers` config is the same input.
- *Reuse the embedded OAuth AS.* Rejected on evidence: its consent step is "operator enters the
  gateway secret" (`gw src/gateway/mcp/oauth/handlers.ts:7-10`), so it authenticates the gateway, not
  a user. It cannot carry per-user identity without being rebuilt.

**Open sub-question**: what authenticates the *mint* request itself. Two candidates, both
cookie-free: a long-lived, hashed-at-rest "exchange secret" the user creates on a hub page and the
client exchanges for a 1 h JWT; or the user copying the 1 h JWT itself. The second is simpler but
expires hourly, which no MCP client refreshes. **Recommendation**: the exchange secret, because an
MCP client config is written once and read for weeks. This is a design choice inside R1's decision,
not a new credential type — the thing presented to `/mcp` stays the existing JWT.

---

## R2 — How the agent id reaches the gateway identity (blocking, newly measured)

**Finding**: `issueGatewayJwt` reads `agentIds` from `user_agents`
(`gateway-jwt.service.ts:158-163`). The only writer is `assignAgentToUser`
(`user-agents.service.ts:6-16`), called from `provisionPersonalAgent` **only when a non-empty
`serverId` is passed** — its own comment says "only the migration path passes a serverId, so this
cross-store write is migration-only" (`personal-agent.service.ts:130-139`) — and the live path
passes `serverId: ''` (`personal-agent-provisioner.ts:111-115`). **So `agentIds` is empty for every
personal agent provisioned by the live path, and the audit's proposed
`assignedAgentIds[0]` resolves to nothing.** This is not recorded in any audit report.

**Decision**: the claim must be populated from `personal_agents` (the table that actually owns the
personal agent id and its gateway assignment), not from `user_agents`, with
`user_agents` left to its existing multi-agent assignment purpose.

**Rationale**: `personal_agents` is what `resolveGatewayPrincipal` authorizes against
(`hub src/server/auth/assistant-principal.ts:149-184`), and `profiles.personalAgentId` is already
the denormalised pointer (`personal-agent.service.ts:128`). Deriving the claim from the same table
the authorizer uses removes a whole class of "the claim says yes, the authorizer says no".

**Alternatives considered**: *backfill `user_agents` for every personal agent.* Rejected as a second
source of truth for the same fact, across two stores (Postgres core vs Turso), which is how the
current discrepancy arose.

---

## R3 — What "the user's own RBAC" is, mechanically

**Decision**: per-user RBAC is achieved by invoking each hub tool with the *caller's own personal
agent id*; the gateway must verify the requested agent id is the one the credential names, and must
never accept an agent id from tool arguments.

**Rationale**: measured — `resolveGatewayPrincipal` **rejects any call that supplies a `userId`**
(`assistant-principal.ts:97`: `if (!serverId || !tokenOrg || !agentId || userId) reject`), and
derives capabilities from `personal_agents.agentId` → `profileId` → `resolveMemberPrincipal`
(`:149-184`). The hub bridge therefore has exactly one identity input: the agent id on the query
string (`gw src/agents/tools/hub/hub-common.ts:48,76`). There is no forwarded-user-credential path
to use, and inventing one would be new authorization code (forbidden by spec INV-6).

**Consequence for the plan**: the one new gateway invoke method takes its agent id from the resolved
MCP identity only. A tool argument named `agentId` must be stripped, not merged.

**Alternatives considered**: *forward the user's JWT to the hub as `x-minion-user-jwt`, the shape
`api/internal/workshop/saves/[id]/authority` already uses* (audit E "Trust model"). Rejected for
this feature: it is a bridge-wide trust-model change affecting all 48 gateway endpoints, which is
audit E's own recommendation and belongs in slice S2/S3, not here. Noted as the eventual target.

---

## R4 — Where the filter lives, and what a permissionless tool means

**Decision**: filter in the MCP layer, keyed on `meta.permission`, with "no permission declared" =
excluded. Capabilities come from the hub, not from the JWT's role claim.

**Rationale**: `tools/list` currently takes no identity (`gw src/gateway/mcp/protocol.ts:94-95`,
`registry.ts:177-179`) while `tools/call` already passes identity to the dispatcher (`:109`), so the
filter's insertion point is one parameter. Metas carry `{module, action}` for **27 of 30** tools; the
3 that do not (`module_action`, `notes_create`, `notes_query`) include the widest write dispatcher in
the set. Using the role claim instead of hub capabilities would be a second RBAC implementation —
and `mapRoleToScopes` only produces coarse gateway scopes (`gw src/users/types.ts`), not module/action
capabilities.

**Capability source**: the gateway already fetches the caller's hub tool permissions with a 60 s TTL
that fails closed (`gw src/agents/tool-search/hub-capabilities.ts`, audit C "RBAC metadata is
clean"). Reuse it. Note its known defect: a 404 from `query/tool-permissions` is treated as "legacy
hub" and **skips all gating** (audit C-S1). That defect is in slice S2, but this feature cannot ship
on top of it — a fail-open capability source makes the whole filter decorative. **Hard
pre-requisite, recorded in the plan's dependency list.**

**Alternatives considered**: *filter in the hub and have the gateway ask.* Rejected: adds a hub round
trip to every `tools/list`, and the gateway already holds the permission set.

---

## R5 — Enforcing INV-1 (writes never reachable by an admin-resolved caller)

**Decision**: classify each exported tool as read or write from its declared `action`
(`view` ⇒ read; `create`/`edit`/`delete`/`manage` ⇒ write), and refuse every write when the resolved
identity has no `userId` **and** no `orgId` — i.e. the shared-token, password, trusted-proxy and
embedded-OAuth outcomes, all of which return `{role:"operator", scopes:["operator.admin"]}` with no
user fields (`gw src/gateway/server.impl.ts:1688,1692`). Enforce at both `tools/list` and
`tools/call`.

**Rationale**: the four shared-credential outcomes are distinguishable from a JWT identity by the
absence of `userId`/`orgId`, not by `authMethod` alone — relying on `authMethod` would break the
moment a new credential kind is added. The admin scope cannot be used as the discriminator either,
because a hub *admin* user's JWT also maps to `operator.admin` via `mapRoleToScopes`
(`server.impl.ts:1698-1699` comment), and that caller is a real user who should keep their tools.

**Alternatives considered**: *gate on `authMethod !== "token"`.* Rejected: enumerates the bad cases
instead of requiring the good one, and misses `password`/`tailscale`/`trusted-proxy`.

---

## R6 — Revocation on every request (newly measured)

**Finding**: the gateway maintains a JWT revocation store fed by the `hub.token.revoked` gateway
event (`gw src/gateway/server-methods/hub-events.ts:77-95`, `src/users/token-revocation.ts:57`), and
the **WebSocket** connect path checks it (`src/gateway/server/ws-connection/message-handler.ts:946`).
The `/mcp` identity resolver does not (`server.impl.ts:1694-1710` contains no `isRevoked` call).
Not recorded in any audit report.

**Decision**: the MCP identity resolver checks the revocation store on every request, using the
`jti` that `resolveJwtAuth` already returns (`ws-jwt-auth.ts:28-29,86`).

**Rationale**: `/mcp` is stateless per POST, so "on every request" is the only place a check can go;
and it is a one-line reuse of an existing store, not new machinery. Without it, FR-005/INV-5 is
unimplementable and a revoked credential keeps working for up to an hour.

**Alternatives considered**: *rely on the 1 h expiry.* Rejected: the spec requires revocation to take
effect on the next request, and a 1 h window on a credential that can write business data is the
exposure the feature exists to remove.

---

## R7 — Mapping 27 tool names onto one invoke method

**Decision**: add one optional "pinned parameters" field to the MCP tool entry, merged *over*
caller arguments (not under them), and one gateway invoke method that takes the tool id from the
pinned parameters.

**Rationale**: the registry's entry type already maps a tool name to a single gateway method
(`gw src/gateway/mcp/registry.ts:62-75`) and `tools/call` already merges nothing
(`protocol.ts:97-101`). Pinning is the minimum change that lets 27 names share one method. Merge
order matters and is a security property: if caller args won, any tool name could invoke any tool
id. This is the only change to existing MCP code, matching the audit's "smallest design".

**Alternatives considered**: *27 distinct gateway methods.* Rejected: 27 handlers for one behavior.
*Encode the tool id in the MCP tool name and parse it.* Rejected: a parser where a data field will
do.

---

## R8 — Per-call rate limiting

**Decision**: a per-credential call budget in the MCP layer, keyed on the credential's `jti`, applied
to `tools/call` only (not `initialize`/`ping`/`tools/list`), returning a retryable refusal.

**Rationale**: today's limiter is the *auth* rate limiter consumed inside `authorizeGatewayConnect`
(`server.impl.ts:1680-1686`), so an authenticated client is unmetered (audit D R6). Keying on `jti`
rather than IP or client id makes the limit follow the credential, which is what FR-023 requires and
what makes revocation and limiting consistent. The gateway already has a rate-limiter abstraction to
reuse (`src/gateway/auth/auth-rate-limit.ts`).

**Alternatives considered**: *limit in the hub.* Rejected: the hub would absorb the request before
rejecting it, which is the load the limit exists to prevent.

---

## R9 — OAuth store durability and refresh expiry

**Decision**: give the embedded-OAuth store a persistent backing and add an expiry plus a revocation
path for refresh tokens, keeping the store's existing interface.

**Rationale**: `oauth/store.ts:1-6` says "Spike-grade storage (Maps; lost on restart)";
`RefreshToken` has no `expiresAt` (`:27`) and nothing revokes one. The functions already take an
injected `now` (`:37`), so expiry is an additive field and a comparison.

**Open sub-question (OWNER-GATED)**: where the state persists. The gateway's existing durable stores
are the candidates; this spec has no evidence of which one the gateway uses for small operational
state, so the plan leaves the store choice to the implementer's reading of the gateway's existing
persistence conventions and does not prescribe one.

**Note on sequencing**: this is the lowest-value item in the feature. OAuth is off by default
(`gw src/config/types.gateway.ts:499-513`) and, per R5, yields no business capability anyway. It is
last.

---

## R10 — MCP-only kill switch

**Decision**: an operator-settable list of tool names withheld from MCP, consulted by the filter.

**Rationale**: the only current controls are the per-agent tool policy and plugin enablement, both of
which also remove the tool from the in-app assistant (audit D R7). A withhold list in the MCP layer
is the narrowest thing that satisfies FR-018/SC-010 without touching the agent tool policy.

---

## Owner-gated items (the spec's 3 retained markers + 2 raised here)

| # | Question | Recommended default | Why it cannot be decided here |
|---|---|---|---|
| OG1 | Which organization may a multi-organization user mint a credential for? | Refuse any organization whose production gateway does not host the user's personal agent, and say so | Proposal open question 1 is unanswered; 3 of 11 users are affected, the owner is in 4 organizations across 3 gateways |
| OG2 | Is `/mcp` publicly reachable through the production reverse proxy? | Treat as public until an operator confirms otherwise, making FR-023/FR-024 launch-blocking | Audit D R4 states the proxy rules were not inspected; this is an operational fact, not a code reading |
| OG3 | May an organization administrator revoke another member's credential? | Owner-only revocation in the first delivery; administrative revocation as a follow-up | No evidence in any audit or proposal; changes who may act on a credential row |
| OG4 | Does the mint request authenticate with a long-lived exchange secret or is the 1 h token copied directly? (R1) | Exchange secret | Usability vs blast-radius tradeoff the owner should make; both are implementable |
| OG5 | Does the first delivery include the write tools? (spec Q4) | Yes, gated by INV-1 | Tagged as an assumption in the spec; a read-only first slice is a legitimate owner preference |

## Hard dependencies this feature cannot ship without

| # | Dependency | Evidence | Status |
|---|---|---|---|
| HD1 | The production personal-agent↔gateway assignment is restored (proposal slice S0a/S0b) | 11/11 `personal_agents.gateway_id` NULL; every bridge call is a 403 (`00-synthesis.md` L1) | Not started; owner-run backfill |
| HD2 | The capability source fails closed on a 404 (audit C-S1) | `gw src/agents/tool-search/hub-capabilities.ts:44` → `legacyHub` skips all gating | In slice S2 |
| HD3 | `isModuleEnabled` runs inside `requireAssistantCapability` (audit E-S6) | 0 of 48 gateway endpoints check it; FR-016 depends on it | In slice S2 |
