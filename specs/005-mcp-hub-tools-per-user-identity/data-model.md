# Phase 1 data model: Hub business tools over MCP, under the caller's own RBAC

Entities as the spec defines them, with the fields, rules and transitions the requirements imply.
Store placement is named where the code already decides it; otherwise it is left to the
implementer's reading of the surrounding conventions.

---

## 1. MCP credential (new, persistent — hub)

The user-visible, headless, revocable thing. Lives in the hub's canonical core store, beside
`personal_agents` and `gateway` (both Postgres core — `hub src/server/auth/assistant-principal.ts`
uses `getCoreDb()` for all three), because revocation and membership checks must be in the same
store as the membership they depend on.

| Field | Rule |
|---|---|
| id | Surrogate key |
| ownerProfileId | The hub profile that created it. FK to profiles. Required |
| orgId | Exactly one organization. FK. Required (FR-001). Immutable |
| secretHash | Hash of the exchange secret; the secret itself is never stored (FR-002) |
| label | User-supplied name so a user can tell two credentials apart |
| createdAt | Required |
| expiresAt | Required, non-null — a credential with no expiry must not be representable (FR-003) |
| lastUsedAt | Nullable; updated on successful use, for the listing in FR-004 |
| revokedAt | Nullable; set once, never cleared (FR-004, FR-005) |

**Uniqueness**: `secretHash` unique. Not unique per (owner, org) — a user may hold several
credentials for one organization (rotation).

**Validation rules**
- Creation requires an active canonical membership of `orgId` by `ownerProfileId` (FR-006). The hub
  already has the predicate: `hasCanonicalMembership(userId, tenantId)`
  (`gateway-jwt.service.ts:148`).
- Creation requires that the owner has a personal agent able to act in `orgId` (FR-008). The
  predicate is the one the authorizer uses: an `active` `personal_agents` row for the owner's
  profile whose `gatewayId` belongs to `orgId` (`assistant-principal.ts:149-184`).
- `expiresAt > createdAt`.

**Lifecycle**

```
(none) --create--> active --revoke--> revoked (terminal)
                      |
                      +--clock passes expiresAt--> expired (terminal, no write)
```

`expired` is derived, not stored — a state transition with no row change, so that a clock change
cannot resurrect a credential and a missed job cannot keep one alive.

**Authorization on the row itself**: owner-only in the first delivery (OG3 is owner-gated).

---

## 2. Resolved MCP identity (new, in-memory per request — gateway)

What the gateway derives from a presented credential on every `/mcp` request. Extends the existing
`McpClientIdentity` (`gw src/gateway/mcp/registry.ts:33-41`), which today carries
`{role, scopes, userId, userRole, orgId, assignedAgentIds, authMethod}`.

| Field | Source | Rule |
|---|---|---|
| userId | JWT `userId` claim | Present ⟺ the caller is a named user |
| orgId | JWT `orgId` claim | The only org the call may act in (INV-4). Never read from tool args |
| userRole | JWT `role` claim | Coarse; **not** the capability source (R4) |
| agentId | The personal agent named by the credential (R2) | Required for any hub business tool call. Never accepted from tool args (R3) |
| jti | JWT `jti` | The revocation key (R6) and the rate-limit key (R8) |
| authMethod | How it authenticated | Diagnostic only; **not** the discriminator for INV-1 (R5) |
| isNamedUser | derived | `Boolean(userId && orgId)`. The INV-1 discriminator |

**Derived classification** (the one rule INV-1 rests on): a caller with `isNamedUser === false` is a
*shared-credential caller*. Every exported hub business tool is unavailable to it; write tools are
additionally refused at call time.

**Validation rules**
- A credential whose `jti` is in the revocation store resolves to nothing (INV-5).
- A credential past `exp` resolves to nothing.
- `agentId` must be an `active` personal agent of `userId` in `orgId`; otherwise hub business tools
  resolve to nothing even though the identity is otherwise valid (this is what prevents a stale
  claim from being load-bearing).

**Not added**: no forwarded user credential, no new principal type on the hub side. The hub's
`AssistantPrincipal` is unchanged (INV-6).

---

## 3. Exported tool entry (extension of existing — gateway)

Extends `McpToolEntry` (`gw src/gateway/mcp/registry.ts:62-75`), today
`{name, method, description, inputSchema, source?, pluginId?}`.

| Field | Rule |
|---|---|
| name | The MCP tool name. For agent tools, the registry tool id |
| method | The one invoke gateway method, shared by all agent-tool entries (R7) |
| description | From the tool's own meta |
| inputSchema | Converted from the tool's declared TypeBox schema; no second schema source (FR-010) |
| source | New value for agent-registry tools, so reconcile keeps ignoring them (`registry.ts:130-156` only manages `manifest` tools) |
| **pinnedParams** | *New, optional.* Merged **over** caller args at call time, never under (R7, FR-017) |
| **permission** | *New, optional* `{module, action}` from the tool meta. Absent ⇒ the tool is excluded from every list and refused on call (FR-012, INV-3) |
| **access** | *New, derived* `read` when `permission.action === 'view'`, else `write` (R5). Used by INV-1 |

**Validation rules**
- An entry with `source = agent-registry` and no `permission` must not be registered at all (fail at
  seed time rather than filter it 27 times a day), and must appear in the open-items ledger (FR-030).
- `pinnedParams` keys that collide with the tool's own schema properties are a seed-time error, not a
  runtime surprise.

---

## 4. Capability set (existing, reused — gateway cache over hub)

The caller's permitted `{module, action}` pairs in the credential's organization. Already fetched
with a 60 s TTL by `gw src/agents/tool-search/hub-capabilities.ts`.

| Rule |
|---|
| Keyed by (agentId, orgId) — not by user, because the hub derives capabilities from the agent (R3) |
| A fetch failure denies (today: a **404 fails open**, audit C-S1 — HD2, a hard dependency) |
| Never embedded in the credential, so a narrowed role takes effect within the TTL without re-minting (spec Assumptions) |

**No new entity**: this is a read model, listed because both the list filter and the call check must
read the *same* one or INV-2 breaks.

---

## 5. Call budget (new, in-memory per gateway process — gateway)

| Field | Rule |
|---|---|
| key | The credential's `jti` (R8) |
| window | Operator-configurable |
| limit | Operator-configurable |
| consumed | Incremented on `tools/call` only |

Per-credential, not per-IP and not global (FR-023). Process-local is acceptable: the gateway is a
single long-lived process per tenant (audit D "Smallest design"), and a limiter that loses its
counters on restart is still a limiter.

---

## 6. MCP withhold list (new, configuration — gateway)

An operator-settable list of tool names excluded from `/mcp` while remaining available to the in-app
agent (FR-018, SC-010). Configuration, not a table: it sits beside the existing
`gateway.mcp` options (`gw src/config/types.gateway.ts:499-513`).

---

## 7. Embedded-OAuth state (existing, to be made durable — gateway)

`clients`, `codes`, `accessTokens`, `refreshTokens` (`gw src/gateway/mcp/oauth/store.ts:32-35`).

| Change | Rule |
|---|---|
| Persistence | Survives a restart (FR-025) |
| `RefreshToken.expiresAt` | *New, required* (FR-026) — the type has no expiry today (`:27`) |
| Revocation | A refresh token can be invalidated before expiry (FR-026) |

Unchanged: this path never yields hub business capability (FR-027, an instance of INV-1), so its
identity model is deliberately left as it is.

---

## Relationship summary

```
profile ──owns──> MCP credential ──scoped to──> org
   │                     │
   │                     └──presented as──> JWT (jti) ──resolves to──> Resolved MCP identity
   │                                                                          │
   └──has──> personal agent ──assigned to──> gateway ──belongs to──> org      │
                   ▲                                                          │
                   └──────────────────── agentId ─────────────────────────────┘
                                             │
                                             ├──> Capability set (per agentId+orgId, from hub)
                                             └──> Call budget (per jti)

Exported tool entry ──permission──> {module, action} ──tested against──> Capability set
                    ──access──────> read | write ────tested against──> isNamedUser  (INV-1)
```

The loop that closes the feature: the credential names the agent, the agent is what the hub already
authorizes, so no new authorization exists anywhere in the diagram.
