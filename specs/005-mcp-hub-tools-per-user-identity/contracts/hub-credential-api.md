# Contract: the hub's MCP credential surface

Three capabilities the hub must offer, plus one change to an existing route. Paths are indicative;
the route contract manifest (Constitution IV) is what fixes them, and adding routes requires the
manifest plus its six counts (`AGENTS.md` route-contract note).

## C1 — Create a credential (user, cookie session)

- Input: the organization to scope it to, and a label.
- Output: the secret **once**, plus the stored metadata (id, org, label, created, expires).
- Preconditions, each a distinct refusal:
  - signed in — else 401;
  - active canonical membership of the requested organization — else 403 (reuse
    `hasCanonicalMembership`, `hub src/server/services/gateway-jwt.service.ts:148`);
  - the requester has an `active` personal agent whose gateway belongs to that organization — else a
    4xx naming *that* reason, not a generic failure (FR-008). This is the condition that makes a
    credential able to act at all (`hub src/server/auth/assistant-principal.ts:149-184`);
  - the requested organization is not one whose production gateway lacks the requester's agent
    (OG1, owner-gated).
- Never cacheable (`Cache-Control: no-store`), matching the existing JWT route
  (`hub src/routes/api/gateway/jwt/+server.ts:10`).
- RBAC: self-service — a user creates credentials for themselves only. No module capability is
  involved, which is why this route must be explicitly covered by the route-contract manifest rather
  than inheriting a module gate.

## C2 — List and revoke credentials (user, cookie session)

- List returns the requester's own credentials only, with org, label, created, expires, last used,
  revoked. The secret is never returned.
- Revoke marks one of the requester's own credentials revoked. Idempotent. Revoking another user's
  credential is a 404, not a 403 — the existence of someone else's credential is not the requester's
  to learn.
- Revocation must also notify the gateway, so the next `/mcp` request fails (FR-005). The mechanism
  already exists: the `hub.token.revoked` gateway event carrying a token id and expiry
  (`gw src/gateway/server-methods/hub-events.ts:77-95`). Revoking a *credential* must revoke every
  unexpired token minted from it, which means the credential's issued token ids are tracked or the
  revocation is expressed in terms the gateway can match.

## C3 — Exchange a credential for a gateway token (headless, no cookie)

The one genuinely new authentication path, and the feature's security centre of gravity.

- Input: the credential secret, presented as a bearer credential.
- Output: the existing gateway JWT payload — `{token, expiresAt}` — unchanged in shape from
  `issueGatewayJwt` (`hub src/server/services/gateway-jwt.service.ts:139-183`).
- The minted token's claims must carry the owner's **personal agent id** (R2 — today `agentIds` is
  empty because it is read from a table the live provisioning path never writes).
- Preconditions, each re-checked at exchange time and not trusted from creation time:
  - the credential exists, is unexpired and unrevoked — else 401;
  - the owner still holds an active membership of the credential's organization — else 403
    (FR-006/Story 1 scenario 6: membership removal must invalidate an unexpired credential);
  - the owner's personal agent is still active for that organization — else a 4xx naming it.
- Rate limited, because it is an unauthenticated-by-cookie endpoint accepting a secret: a brute-force
  limiter on failures, independent of the per-credential call budget.
- Never cacheable. Failures must not distinguish "no such credential" from "wrong secret".
- Records a security event on success and on failure (FR-009).

## C4 — Change to the existing `/api/gateway/jwt`

No behavior change. It stays cookie-only. C3 is a separate path rather than a second mode on this
route, so that a browser session and a headless credential never share a handler and a cookie bug
cannot become a headless bypass.

## C5 — The capability view

The MCP section of `/capabilities` must source its tool list from what `/mcp` serves for the viewing
user, replacing today's `tools.filter(t => t.mcpExport && t.enabled)`
(`hub src/lib/components/builder/McpPanel.svelte:21`), and must correct the panel's comment and
copy, which currently assert the union that does not exist (`:2-7`).

User-facing strings go through Paraglide `m.*()` plus `i18n:compile` (Constitution IV); the panel
already imports the message module (`:15`).

## Error-shape rule across C1–C3

A refusal for lack of permission says so in words a user can act on, and a 403 is never reported as a
generic failure — the hub's existing rule
(`memory: forbidden-must-say-permission-not-generic-failure`, and the bridge's own
"Your role does not permit '<action>' on <module>." at `_shared/action-auth.ts:30`).
