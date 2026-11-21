# Implementation Plan: MCP login (spec 143, pass 2)

**Spec**: [spec.md](spec.md) · **Repo**: `minion_hub` · **PR base**: `master` · **Branch**: `feat/143-mcp-login`

## Technical Plan

The hub is both the protected resource and a minimal authorization server. Who the person is still comes from the existing Supabase sign-in (a cookie session on the approval screen only). The hub issues opaque random credentials, stores their SHA-256, and checks them only on `/api/mcp`.

```
harness ─POST /api/mcp (none)──────────▶ 401  WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource/api/mcp"
harness ─GET that document─────────────▶ { resource:"<origin>/api/mcp", authorization_servers:["<origin>"], bearer_methods_supported:["header"] }
harness ─GET /.well-known/oauth-authorization-server ▶ { issuer, authorization_endpoint:"<origin>/oauth/authorize", token_endpoint:"<origin>/api/oauth/token",
                                                         registration_endpoint:"<origin>/api/oauth/register", response_types_supported:["code"],
                                                         grant_types_supported:["authorization_code","refresh_token"], code_challenge_methods_supported:["S256"],
                                                         token_endpoint_auth_methods_supported:["none"] }
harness ─POST /api/oauth/register {client_name, redirect_uris}──▶ { client_id, … }            (loopback redirects only)
browser ─GET /oauth/authorize?client_id&redirect_uri&response_type=code&code_challenge&code_challenge_method=S256&state[&scope][&resource]
          (app gate → /login?redirectTo=… when signed out) → approval screen → POST ?/approve {org_id} → 303 redirect_uri?code&state   (deny → ?error=access_denied&state)
harness ─POST /api/oauth/token grant_type=authorization_code code code_verifier client_id redirect_uri ▶ { access_token, token_type:"Bearer", expires_in:3600, refresh_token }
harness ─POST /api/mcp  Authorization: Bearer mcp_at_…──▶ connection → person → membership → role → tool
harness ─POST /api/oauth/token grant_type=refresh_token refresh_token client_id ▶ new pair (old renewal credential marked used)
```

`<origin>` is `event.url.origin` everywhere (the hub is served on one public origin; the netcup worker is loopback-only and never reached by a harness).

### Files

| Path | C/M | Content |
|---|---|---|
| `supabase/migrations/<ts>_mcp_oauth.sql` | C | three tables below; seed pairing satisfied the way `20261120100000` did |
| `src/server/db/pg-org-integrations-schema.ts` | M | Drizzle tables |
| `src/server/mcp/oauth.service.ts` (+test) | C | pure helpers + DB functions: `registerClient`, `getClient`, `createCode`, `exchangeCode`, `refresh`, `findAccess`, `touchConnection`, `listConnections`, `endConnection` |
| `src/server/mcp/oauth-logic.ts` (+test) | C | pure: `isLoopbackRedirect`, `redirectMatches` (loopback: scheme+host+path equal, port ignored), `pkceOk(verifier, challenge)`, `newSecret(prefix)`, `hashSecret`, `metadata(origin)` |
| `src/server/mcp/caller.ts` (+test) | C | `resolveMcpCaller(event)` → `Response \| { kind:'key', ctx, keyId } \| { kind:'user', ctx, locals, connectionId }` (return shape as `doors/caller.ts:35-39`) |
| `src/routes/api/mcp/+server.ts` | M | use the caller; filter the tool array per caller; 401 header |
| `src/server/mcp/sandbox-tools.ts` (+test) | M | caller-aware context, gate, `whoami`, `sandbox_query`, role-filtered `sandbox_datasets` |
| `src/routes/api/oauth/register/+server.ts`, `src/routes/api/oauth/token/+server.ts` (+tests) | C | DCR and token endpoints (form-encoded for token; JSON for register) |
| `src/routes/oauth/authorize/+page.server.ts`, `+page.svelte` (+server test) | C | approval screen |
| `src/hooks.server.ts` | M | three exact well-known paths in `wellKnownHandle`; `/api/oauth/` added next to `/api/mcp` in `API_HANDLER_AUTH_PATHS`; fix the stale "org API key" comment; do NOT add `/oauth` to `UNPROTECTED_PREFIXES` (the gate's login redirect is the behaviour wanted) |
| `src/routes/api/settings/mcp-connections/+server.ts`, `[id]/+server.ts` (+tests) | C | list / end; NOT registered in `API_WRITE_PREFIXES` (that would force `settings:manage` on self-end) |
| `src/lib/components/settings/developers/McpConnectionsSection.svelte` + mount | C/M | "Connected apps" list with End |
| `src/server/db/rls-bypass-inventory.json` | M | entries for every new file that calls `getCoreDb` |
| `messages/en.json`, `messages/es.json` | M | approval screen, connected apps |
| login return path for Google (`login/+page.svelte`, `/auth/callback`) | M only if broken | carry `redirectTo` |

### Data model

```sql
create table public.mcp_clients (
  id text primary key,                         -- 'mcpc_' + 24 url-safe chars
  name text not null check (char_length(btrim(name)) between 1 and 80),
  redirect_uris text[] not null check (cardinality(redirect_uris) between 1 and 5),
  created_at timestamptz not null default now(),
  created_ip text
);
create table public.mcp_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,                       -- profile id (== Supabase user id)
  client_id text not null references public.mcp_clients(id),
  org_id text not null,
  approved_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid
);
create index mcp_connections_org_live_idx on public.mcp_connections (org_id) where revoked_at is null;
create index mcp_connections_user_live_idx on public.mcp_connections (user_id) where revoked_at is null;
create table public.mcp_credentials (
  hash text primary key,                       -- sha256 hex of the secret
  kind text not null check (kind in ('code','access','refresh')),
  connection_id uuid references public.mcp_connections(id) on delete cascade,   -- null for a code
  client_id text not null references public.mcp_clients(id),
  user_id uuid not null,
  org_id text not null,
  redirect_uri text,                           -- code only
  code_challenge text,                         -- code only
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index mcp_credentials_connection_idx on public.mcp_credentials (connection_id);
```

All three: `enable` + `force row level security`, **no policy**, `revoke all … from public, anon, authenticated`, `grant select, insert, update, delete … to app_ledger` is NOT given: these tables are reached only through the privileged `getCoreDb()` handle (as `verifyKey` does), because every lookup happens before an org is known. With forced RLS and no policy, the data API roles see nothing. Each such call site is listed in `rls-bypass-inventory.json` with class `cross-org-by-design` (credential lookup) — the queries themselves always filter by hash, id or `(org_id | user_id)`.

### Decisions

- **D1 Secrets**: `mcp_ac_` (code), `mcp_at_` (access), `mcp_rt_` (renewal) + 32 random bytes base64url. Only `hashSecret(secret)` is stored. Compare by primary-key lookup of the hash.
- **D2 Code exchange is one transaction**: `update mcp_credentials set used_at = now() where hash = $1 and kind='code' and used_at is null and expires_at > now() returning …`; zero rows → `invalid_grant`. Then verify `client_id`, exact `redirect_uri` string equality with the one stored, and PKCE; then insert the connection and the two credentials. Any failure after the update leaves the code spent (fail closed).
- **D3 Renewal rotation**: same conditional update on the `refresh` row. If the row exists but `used_at` is already set → end the connection (`revoked_at`) and answer `invalid_grant`. A new pair is issued with the same `connection_id`; the old access credential is left to expire.
- **D4 Call path order**: per-address rate limit (`mcp-ip:<ip>`, 300/min) → prefix routing (`mk_` key path untouched and returns before anything below; `mcp_at_` connection path; else 401) → hash lookup (kind `access`, not expired) → connection live → per-connection rate limit (`mcp-conn:<id>`, 120/min) → profile via `loadCanonicalProfile` (missing → 401, end connection) → `resolveSupabaseTenant(userId, connection.org_id)` (null → end connection, 403 "no longer a member"; a thrown database error → 500, never 401/403) → build locals → touch (throttled 60 s like keys).
- **D5 Locals** for RBAC, exactly: `{ user: mapProfileToUser(profile, userId) /* id, supabaseId, email, displayName, role */, tenantCtx: { db: getDb(), tenantId: orgId } }`. Nothing else. The route ignores any cookie identity: it never reads `event.locals.user` on this path, and tool code receives only the built object, so role simulation or request overrides from a cookie cannot apply.
- **D6 Platform admins**: membership of the connection's org is required for everyone at approval and on every call; the capability bypass for `role==='admin'` then applies inside that org only.
- **D7 Refusals**:

| Situation | Reply |
|---|---|
| no/unknown/expired/ended credential, missing profile | HTTP 401, `WWW-Authenticate: Bearer resource_metadata="…", error="invalid_token"`, body `{ "error": "<sentence>" }` |
| no longer a member | HTTP 403 `{ error }` (connection ended) |
| role lacks permission | HTTP 200, tool result `isError: true`, "Your role does not permit managing the Sandbox." (thrown as `ToolFailure`; never `requireOrgCapability`, whose HttpError would surface as "Internal error") |
| over limit | HTTP 429 + `retry-after: 60` |
| token endpoint failures | HTTP 400 `{ "error": "invalid_grant" \| "invalid_request" \| "invalid_client" \| "unsupported_grant_type" }` per RFC 6749 |
| key callers | unchanged status codes; the 401 body text becomes neutral ("Send a valid API key or sign in.") and gains the header |

- **D8 Tool gating** (signed-in callers): every `sandbox_*` tool first checks `hasOrgCapability(locals,'settings','manage')`. `sandbox_query` then calls `runQuery(locals, spec)` (dataset `view`, owner scope and PII masking are inside it); input = the existing QuerySpec JSON; rows capped by the compiler's existing limit. `sandbox_datasets` uses `listDatasets(locals)`. `whoami` returns `{ user:{email,displayName}, organization:{id,name}, roles:[…from resolveCapabilities], canManageSandbox:boolean, datasets:[ids from listDatasets] }` and needs no permission. The route passes `handleMcp` an array already filtered for the caller kind; `tools/call` re-checks inside each handler.
- **D9 Authorship**: user callers pass `ctx.profileId = userId` and no `writtenByKey`; on update the service sets `written_by_key = null` when the caller is a person. Consequence stated and accepted: a signed-in caller can change or remove their own library rows by id, as in the app; the library page stays refused for writes by page name.
- **D10 Approval screen**: `load` validates `client_id` (known), `redirect_uri` (`redirectMatches` against the client's list), `response_type=code`, `code_challenge_method=S256`, challenge 43–128 chars. If the client or return address is invalid → error page, never a redirect. Other invalid parameters → redirect back with `error=invalid_request&state`. Memberships via `loadCanonicalMemberships(userId)`. `approve` re-validates everything from the URL (not from the form), accepts only `org_id` from the form, checks it against memberships, creates the code, redirects 303. `deny` redirects with `error=access_denied`. Response header `content-security-policy: frame-ancestors 'none'` and `x-frame-options: DENY` on this route. SvelteKit's origin check covers the form posts.
- **D11 Registration**: `POST /api/oauth/register` JSON `{ client_name, redirect_uris[] }`; every URI must pass `isLoopbackRedirect`; 10 per hour per address; reply 201 `{ client_id, client_name, redirect_uris, token_endpoint_auth_method:"none", grant_types, response_types }`. No client secret exists. Clients unused for 90 days may be pruned later (`TODO(handoff)`).
- **D12 Lifetimes**: code 60 s, access 3600 s, renewal 30 days sliding.
- **D13 Ending**: `endConnection` sets `revoked_at/revoked_by`; the call path and `refresh` both check it, so all its credentials die at once. Self: `user_id = caller`; admin: `hasOrgCapability(settings, manage)` and `org_id = active org`.
- **D14 Scope/resource parameters**: accepted and ignored except that `resource`, when present, must equal `<origin>/api/mcp` (else `invalid_target`). One implicit scope.

## Alternatives

| Option | Why not |
|---|---|
| Supabase Auth's OAuth 2.1 server as authorization server (pass 1 of this plan) | Its token is a full user session (A8): accepted by the hub's cookie path in every org, and by the data API, storage and realtime (A9). Ending a hub-side connection would not end it. Containing that needs changes to the normal sign-in path and a database-API hook, and still leaves storage and realtime. It also needs a dashboard change and is beta. Rejected by EGM round 1 (design critic, blockers 1–2). |
| Gateway embedded OAuth (`/mcp`) | In-memory state, every caller is one admin identity, write tools wait on spec 005. |
| Keys only | No person, no role, no rows. |
| JWT access tokens signed by the hub | Stateless checks are not wanted: every call must hit the connection row for revocation anyway (INV-4). Opaque + hash is less code and nothing to mis-validate. |
| Closed registration (owner registers each app) | Would require a client id on every `claude mcp add`, against the owner's "like other tools" goal; loopback-only return addresses plus named approval give the protection (INV-7). |

## Risks & Mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | We now own authorization-server code. | Smallest standard subset (code + PKCE S256 + rotating renewal, public clients only); pure logic unit-tested; one design review of this pass and a code security audit before merge. |
| R2 | A malicious local process registers an app and lures the person to approve. | The approval screen names the app and return address; only loopback return addresses; the person must be signed in and click approve; the credential is org-scoped and Sandbox-only by role. |
| R3 | Stolen harness credential file. | Access 1 h; renewal rotation with reuse detection ends the connection; "Connected apps" lets the person end it; credential is useless outside `/api/mcp` (INV-5). |
| R4 | Registration or token endpoint abuse. | Per-address limits; bounded field sizes; table growth bounded by limits and later pruning. |
| R5 | Role change lag. | Stated (cache ≤ 2.5 min); membership and ended connections are immediate. |
| R6 | Google sign-in drops the return path. | Verified in the build; fixed in this slice if broken. |
| R7 | Harness expects a feature we do not implement (CIMD, `scope` discovery). | DCR + PKCE is what current Claude Code uses; verified live before calling it done; CIMD is a `TODO(handoff)`. |

## Detailed Implementation Plan

1. Migration + Drizzle + seed pairing. Done when `bun scripts/qa/check-migration-seed-pairing.ts --files …` passes.
2. `oauth-logic.ts` + tests: loopback matcher (accept `http://localhost:1234/cb`, `http://127.0.0.1/cb`, `http://[::1]:9/cb`; reject `https://evil.test`, `http://localhost.evil.test`, `http://127.0.0.1@evil.test`, custom schemes, fragments), `redirectMatches`, PKCE vectors from RFC 7636 appendix B, metadata shape.
3. `oauth.service.ts` + tests (mock-db pattern): each function; code single-use; expired code; wrong verifier; wrong client; wrong redirect; renewal rotation; renewal reuse ends the connection; ended connection cannot renew.
4. `caller.ts` + tests: key path returns before any connection code (existing `server.test.ts` assertions hold with mocks extended); each D7 row; database error → 500.
5. Route + hooks: 401 header; three well-known documents; `/api/oauth/` auth-exempt. Tests for the documents and the header.
6. Tools: D8/D9; tests for US2 scenarios 1–5 and "key callers do not see `whoami`/`sandbox_query`".
7. Register + token endpoints + tests (US1 scenarios 2, 5; edge cases 2–3).
8. Approval route + i18n + tests of `load`/actions (US1 scenarios 3, 6, 7; invalid client → error page; invalid redirect → error page; org not a membership → 400). Check Google return path; fix if needed.
9. Connected apps API + UI + tests (US3).
10. Gates: targeted vitest for all new files plus `scripts/qc/content-contract.test.ts`, `src/lib/assistant/use-cases.test.ts`, `src/server/db/rls-bypass-inventory.test.ts`, `src/lib/routes`, `src/lib/nav`, `scripts/ui-audit-inventory.test.ts`, `src/server/ui-audit`, `src/routes/api/mcp`, `src/server/doors`; `lint:design`; `lint:tokens`; prettier; migration pairing.
11. Orchestrator: `bun run check`; `vite build`; local end-to-end on the QA stack (apply the migration there; dev server; scripted flow with curl: register → sign in → approve → token → `whoami` → query → write → end → 401); design re-review; code security audit; PR; CI; merge.
12. Rollout and live verification (no dashboard step): after deploy, `curl` both metadata documents and the 401 header; `claude mcp add --transport http minion-hub https://hub.minion-ai.org/api/mcp`; approve in the browser for FACES; `whoami` shows the owner and role; one `sandbox_query`; one block write and remove; end the connection in Settings and confirm the next call is 401. Rollback: revert the PR (tables are additive and unused by anything else); key path unaffected.
