# Implementation Plan: MCP login (spec 143)

**Spec**: [spec.md](spec.md) · **Repo**: `minion_hub` · **PR base**: `master` · **Branch**: `feat/143-mcp-login`

## Technical Plan

Supabase Auth is the authorization server; the hub is the protected resource and supplies the consent page. The hub issues nothing and stores no token.

```
harness ──POST /api/mcp (no token)──▶ hub: 401 + WWW-Authenticate: Bearer resource_metadata=…
harness ──GET /.well-known/oauth-protected-resource[/api/mcp]──▶ hub: { resource, authorization_servers: [<supabase>/auth/v1] }
harness ──discovery, /oauth/authorize (PKCE)──▶ Supabase ──redirect──▶ hub /oauth/consent?authorization_id=…
person signs in (existing login), picks org, approves ──▶ hub records the connection, calls approveAuthorization ──▶ redirect to harness
harness ──/oauth/token──▶ Supabase: access + refresh
harness ──POST /api/mcp (Bearer <jwt>)──▶ hub: verify → connection → membership → role → tool
```

| Piece | Where | Reuses |
|---|---|---|
| Resource metadata + 401 pointer | `hooks.server.ts` `wellKnownHandle` (two paths: bare and `/api/mcp`-suffixed); `/api/mcp/+server.ts` | existing well-known handler |
| Token → caller | `src/server/mcp/caller.ts`: `resolveMcpCaller(event)` → `{ kind:'key', … } \| { kind:'user', locals, ctx, connectionId }` | `resolveSupabaseUser(event, client, token)`, `resolveSupabaseTenant(id, orgId)` |
| Connections | migration `mcp_connections(id, user_id uuid, client_id text, client_name text, org_id text, approved_at, last_used_at, revoked_at)`, unique live row per `(user_id, client_id)`; forced RLS, no grants to `anon`/`authenticated`; service `src/server/services/mcp-connections.service.ts` | `org_api_keys` migration and service as the pattern |
| Consent page | `src/routes/oauth/consent/+page.server.ts` + `+page.svelte`: load = `auth.oauth.getAuthorizationDetails(id)` + memberships; actions `approve` (validate org ∈ memberships → upsert connection → `approveAuthorization` → redirect to its `redirect_to`), `deny` | `supabaseServer(event)`, existing login redirect with `redirectTo` |
| Role-gated tools | `sandbox-tools.ts`: handlers receive the caller; for `user` callers each sandbox tool first requires `hasOrgCapability(locals,'settings','manage')` (same gate as the page) and passes `ctx.profileId`; new `whoami`, `sandbox_query` (`runQuery(locals, spec)`) listed only for `user` callers | `rbac.service`, `sandbox.service.runQuery` |
| Connected apps UI | `Settings → Developers`: list + end; API `GET/DELETE /api/settings/mcp-connections` | `ApiKeysSection.svelte` |

### Decisions

- **D1 Token check**: `getClaims(token)` (local ES256 verification), then require a `client_id` claim (INV-5) and `sub`.
- **D2 Org binding lives in the hub**, not in the token: the connection row maps `(sub, client_id)` → org. Read on every call (one indexed lookup), which is also what makes revocation immediate (INV-4).
- **D3 One live connection per (person, app)**: approving again replaces the organization. Two harnesses with the same client id on one account share a connection; acceptable for this slice and stated in the UI.
- **D4 Locals for RBAC**: build the same `locals.user` / `locals.tenantCtx` shape the cookie path builds, from the verified token and the connection's org; nothing else on `locals` is set.
- **D5 Closed registration**: `allow_dynamic_registration = false`; the owner registers "Claude Code" (public client, loopback redirect `http://localhost:<port>/callback`), and the harness is added with `--client-id` and `--callback-port`.
- **D6 Tool visibility**: `tools/list` returns the tools the caller may call; `tools/call` re-checks (list is a convenience, call is the gate).
- **D7 Rate limit**: `mcp-conn:<connection id>`, 120/min, same helper as keys.

## Alternatives

| Option | Why not (now) |
|---|---|
| Hub-issued tokens (own authorize/token endpoints, own client registry) | Tokens would work only on the hub (better least privilege, removes A10) and CIMD would be possible, but it means owning an authorization server: codes, PKCE, refresh rotation, storage, revocation. Chosen only if the Supabase feature blocks us (see R1, R4). |
| Gateway embedded OAuth (`/mcp`) | In-memory state, every caller is one admin identity, write tools wait on spec 005. |
| Keep keys only | No person, no role (A2), no rows (A3). |
| Put the org in the token with a custom access-token hook | A database hook that runs on every sign-in for every app; the connection row is needed anyway for revocation. |

## Risks & Mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | The token is a full user token, usable on the data API (A10). | Closed registration (D5) so only the owner's own harness holds one; same exposure as an existing browser session. Tightening grants is tracked separately (house rules H3, hub #695) and gates FR-011's opening. |
| R2 | Supabase OAuth server is beta: behaviour or claims may change. | One module (`caller.ts`) owns token interpretation; the hub-issued alternative is the fallback. |
| R3 | A removed member keeps a valid token until expiry. | Membership and role re-resolved on every call (FR-005). |
| R4 | A harness cannot use a pre-registered client or the spec drops dynamic registration. | Verified for Claude Code (A11); other harnesses wait for FR-011 or the alternative. |
| R5 | Consent page phishing / open redirect. | `redirect_to` comes only from Supabase's `approveAuthorization`; the page never redirects to a caller-supplied address; org is validated server-side against memberships. |
| R6 | Confused deputy across orgs. | No tool takes an organization; the org comes only from the connection (INV-3). |
| R7 | Token audience is not bound to the hub endpoint. | Require `client_id` + a live connection; documented limitation of the provider. |

## Detailed Implementation Plan

1. **Migration** `supabase/migrations/<ts>_mcp_connections.sql` (table, partial unique index on `(user_id, client_id) where revoked_at is null`, index on `org_id`, forced RLS with org policy, revoke from `public, anon, authenticated`); Drizzle schema; seed pairing.
2. **Service** `mcp-connections.service.ts`: `approveConnection`, `findLiveConnection(userId, clientId)`, `touchConnection`, `listConnections(ctx, { mineOnly })`, `revokeConnection`. Add every raw-handle call site to `rls-bypass-inventory.json`.
3. **Caller** `src/server/mcp/caller.ts` + tests: key path unchanged; token path per D1–D4; typed refusals (401 unauthenticated, 403 no connection / not a member).
4. **Route** `/api/mcp/+server.ts`: use the caller; 401 carries `WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource/api/mcp"`; rate limit per D7.
5. **Well-known** in `hooks.server.ts`: both metadata paths; `authorization_servers` from `PUBLIC_SUPABASE_URL + '/auth/v1'`; `resource` = `<origin>/api/mcp`.
6. **Tools**: caller-aware handlers; `whoami`, `sandbox_query`; list filtering (D6); author on writes.
7. **Consent route** + i18n (en/es) + design tokens; unauthenticated → login with `redirectTo` back to the same URL.
8. **Connected apps** section + API.
9. **Gates**: targeted vitest plus the four full-suite-only gates (`scripts/qc/content-contract.test.ts`, `src/lib/assistant/use-cases.test.ts`, `src/server/db/rls-bypass-inventory.test.ts`, route contracts), `lint:design`, `lint:tokens`, prettier, migration pairing; orchestrator runs `check`, `vite build`, local end-to-end.
10. **Rollout**: merge (migration applies in the production build) → owner enables OAuth server (Authentication → OAuth Server: on, Authorization Path `/oauth/consent`, dynamic registration off) and registers the client → `claude mcp add --transport http minion-hub https://hub.minion-ai.org/api/mcp --client-id <id> --callback-port <port>` → live check: `whoami`, a query, a block write, revoke.
