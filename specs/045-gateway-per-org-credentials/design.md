---
id: 045-gateway-per-org-credentials
title: Gateway per-org credentials — no shared operator token in any browser
stage: design
status: approved
verdict: approved
created: 2026-10-29
updated: 2026-10-30
repos: [minion_hub, minion, minion_site, minion-meta]
tags: [security, permissions]
---

# 045 — Gateway per-org credentials

**Status:** final, revised after goldfish review 2026-10-29: three reports, a re-audit, and `resolution_decisions.md` decisions 1–20. Pending owner approval.
**Security tag:** human gates at approval AND merge. No schema change.

**Owner rule (2026-10-29, verbatim):** "no one should really get access to a "master" key. there should be per-org keys, validated against the db, and if valid, the org can use the ai gw".

**Relation to spec 043:** this supersedes 043 decision 4 and task T037, which refused the shared-token endpoint for Base orgs only. Here, no browser of any org gets the shared token. 043's `plan`/`features` claims ride on the JWT this spec makes the only browser credential.

## 1. AS-IS (evidence)

**Anchors:**
- hub `feat/entitlements-s1-model` dac2ac03 (= master 812a4b0a + 043 S1);
- gateway `origin/DEV` and `feat/entitlements-s4-gateway` 45e34c02583 (draft #363);
- site `dev`.

### 1.1 The shared token reaches browsers

- **Hub `POST /api/servers/[id]/token`** (`minion_hub/src/routes/api/servers/[id]/token/+server.ts:25-139`) returns the decrypted gateway token.
  - It is scoped to the active org (L65-70). Non-platform-admins also need a `user_gateway`/`user_servers` link (L77-91).
  - A connection authenticated only by that token gets role `admin`, which carries all five operator scopes (`minion/src/gateway/server/ws-jwt-auth.ts:117-145`). `operator.admin` bypasses every method check (`server-core/server-methods.ts:278`).
- **Hub browser callers:**
  - `gateway.svelte.ts:679` (`wsConnect`) and `:751` (`cutoverToHost`). The token is mandatory: connect aborts without it (`:687-698`), and the frame sends `auth:{token}` (`:450`).
  - The plugins page and `PluginControlCenter`, which put it in the bridge hello `authToken`.
    - The iframe never uses it. Every plugin RPC goes through the hub's `forwardRpc`.
    - For sandboxed iframes it is posted with targetOrigin `'*'`.
  - The dead `/terminal` page. It 307s to `/cloud/terminal`, which uses shell-provider tickets.
- **Site.**
  - `minion_site/src/routes/(app)/members/+layout.server.ts:20` serializes `servers.token` without `token_iv`: ciphertext, or plaintext for legacy rows.
  - `member-gateway.svelte.ts` connects with `role:'member'`, which the gateway rejects, so the panel is already broken.
  - The same file posts to `/api/device-identity/sign`. That endpoint signs a device payload with the org's device identity for any role and scopes the caller asks for, and that panel is its only caller.

### 1.2 The per-org credential exists, but only as an extra

- `GET /api/gateway/jwt` → `issueGatewayJwt` (`gateway-jwt.service.ts:139-185`).
  - It checks canonical org membership in Postgres (L148) and signs with EdDSA.
  - Each issue gets its own `jti`. TTL is 3600 s (L26). `aud` is `'openclaw-gateway'` for every gateway.
- When the JWT is valid, the gateway replaces the connection's scopes with the JWT role's scopes, even if the token was also sent (`origin/DEV message-handler.ts:928-933`).
  - So in prod today a non-platform-admin already gets `read`+`write`.
  - Admin from the token appears only when the JWT is rejected and the browser falls back to the token alone for 60 s (`gateway.svelte.ts:207-256,510-539`).
- Gateway S4 (#363) adds a JWT-only connect (`message-handler.ts:430-496`). A valid JWT needs no device identity when `controlUi.allowInsecureAuth` is set (`docker/default-config.json:7-8`).

### 1.3 Roles

- The JWT `role` is the platform profile role, `admin|user` (`gateway-jwt.service.ts:151-155`).
- `mapRoleToScopes`: `admin` gets all five scopes; `user` and `org_admin` get `read`+`write` (`minion/src/users/types.ts:38-53`).
- Everything outside READ/WRITE needs admin, including `config.*` writes, `channels.logout`, `web.login.*`, `plugins.*`, `update.*`, and the device, approval and pairing methods (`server-methods.ts:325-350`).
- Channel setup in `/settings?s=comms` uses `config.patch` and `channels.logout`, both admin-only.

### 1.4 Expiry, refresh and revocation

- The hub never calls `auth.refresh`. The gateway never closes a socket when its JWT expires.
- Revocation is an in-memory map, filled only by `hub.token.revoked`, which the hub never sends.
- `auth.refresh` (`server.impl.ts:1617-1627`, `server-methods/auth-refresh.ts:51-66`):
  - validates against `oidcIssuers[0]` only;
  - lets the socket switch to the new JWT's userId, orgId and scopes with no equality check;
  - checks revocation by jti only;
  - broadcasts `auth.token.refreshed` (userId, orgId) to every socket.

### 1.5 Gateway binding

- `gateway.org_id` is one column per row, and a shared process such as netcup has one row per org (migration `20260719210000`).
- Every gateway accepts `aud='openclaw-gateway'`, so a JWT issued for one gateway works on any other gateway that trusts the hub issuer.

### 1.6 Legitimate server-side holders (unchanged)

None of these is a person:
- hub server: the `lib/server/gateway-rpc.ts` credential chain, about 27 server callers, the cache broadcaster, and inbound gateway→hub Bearer checks;
- paperclip adapters;
- gateway CLI `--token`;
- gateway `/mcp` Bearer;
- the gateway PTY.

## 2. TO-BE (invariants)

- **I1, no master key in a browser.** No HTTP response, SSR payload, `postMessage` or WS frame sent to a browser contains a gateway shared token or a device-auth signature the browser chose the scopes for, for any org or role.
- **I2, one credential per user, org and gateway.**
  - Browsers reach a gateway only with a hub-issued JWT.
  - Its `aud` is `gw:<host[:port]>` of the gateway row's URL.
  - A JWT-only connect is admitted only when `aud` is in that gateway's `multiTenant.jwtOnlyAudiences`, which lists the hosts it serves.
  - So a JWT minted for one gateway is refused by every other gateway, from the first JWT-only connect on.
  - The legacy `'openclaw-gateway'` audience is accepted only alongside the shared token, until rotation.
- **I3, validated against the DB continuously.**
  - Every issue checks canonical membership and the platform role.
  - TTL is 900 s, and the open socket renews every 600 s via `auth.refresh`.
  - The gateway closes a JWT-authenticated socket at `exp` + 60 s unless it was refreshed (4401 `jwt_expired`), and the client reconnects with a fresh JWT.
  - A removed member loses gateway access within 15 minutes.
- **I4, roles.**

  | Who | `role` | Scopes |
  |---|---|---|
  | Platform admin | `admin` | all five |
  | Everyone else, including org owners and admins | `user` | `read`+`write` |

  - This equals today's behaviour on a valid JWT.
  - Gateway-wide writes (channel setup, pairing, approvals, plugins, updates) stay platform-admin-only until spec 042 makes channel setup a hub-side action checked against org RBAC.
- **I5, fail closed, readably.**
  - Issuance 403 → "your role can't connect to this gateway", per the 403 rule.
  - Rejection or outage → the existing "gateway unreachable" state.
  - No fallback.
- **I6, one rollout switch until rotation.**
  - `PUBLIC_GATEWAY_BROWSER_SHARED_TOKEN`, read via `$env/dynamic/public`: unset or `true` keeps today's client; `false` is the launch.
  - Changing it on Vercel needs a redeploy with no code change.
  - It is a rollback only until rotation (§5 step 6). After that the flag and the endpoint are deleted.
- **I7, rotation.** Every gateway's shared token has been in browsers, so each one is rotated after the bake.

## 3. Design

### 3.1 Hub issuance (A2)

- **Audience:** `gatewayAudience(url)` returns `gw:` plus the lower-cased `host[:port]` of the row's URL. No schema change. URLs are NOT unique per row: `gateway_uniq_url` is `(url, org_id, channel)`, and in prod two orgs share each netcup and protopi URL. That is safe, because `aud` binds the JWT to the gateway process and the `orgId` claim isolates orgs on it (A2 audit). Ops paste the values from `gateway-jwt-probe.ts --list-audiences`; the gateway compares them as exact strings.
- **Route:** `GET /api/gateway/jwt?gatewayId=<id>`. `gatewayId` is optional while the flag is unset or `true` (absent = today's token), and required when it is `false`.
  - When present, the gateway must belong to the active org (`gatewayBelongsToOrg`).
  - A non-platform-admin also needs a `user_gateway`/`user_servers` link, the same check as the token endpoint (`userHasGatewayAccess`).
  - Failure → 403 `{code:'gateway_forbidden'}`. An outage is 5xx.
- **Claims:** `aud = gatewayAudience(row.url)` when `gatewayId` is given, else `'openclaw-gateway'`; `role = profile.role === 'admin' ? 'admin' : 'user'`; TTL 900 s. 043 S2 T038 adds `plan`/`features`.
- **Provisioning:** `mintOrgGatewayJwt` (`organization-provision.service.ts`) passes `gatewayAudience` of the gateway URL it provisions against.
- **Delete** `src/routes/api/device-identity/sign/` and `src/server/services/device-identity.service.ts`: no callers, and the route signs caller-chosen role and scopes.
- **`api/plugins/[id]/toggle`:** require org owner/admin or platform admin, else 403. It calls the admin-only `plugins.org.set` with the system token.

### 3.2 Hub client (A3, all behind `PUBLIC_GATEWAY_BROWSER_SHARED_TOKEN === 'false'`)

- **Connect.**
  - `onChallenge` sends `jwt` only. No `auth.token`, and `fetchHostToken` is never called.
  - `wsConnect` no longer aborts when the token is missing.
  - The `jwtAuthDisabled`/`JWT_RETRY_COOLDOWN_MS` fallback is skipped.
  - The JWT prefetch is keyed by gateway id. `cutoverToHost` throws away a prefetch for another host and fetches its own.
- **Refresh.**
  - One timer per live socket starts on hello-ok and is cleared on close and on cutover. Every 600 s it fetches `/api/gateway/jwt?gatewayId=` and sends `auth.refresh`.
  - A failed refresh is ignored. The 4401 close at expiry then drives a normal reconnect, which already refetches the JWT.
- **Plugins.** The bridge hello sends `authToken: ''`: the gateway's `plugin-ui-bridge` drops a hello without a string field (`packages/plugin-ui-bridge/src/index.ts:141,268-270`), and plugin UIs would hang. Stop fetching the token for the plugins page and `PluginControlCenter`, and remove the "no host" check that keys on `authToken`. Not behind the flag: the iframe never used the token. A4 removes the field.
- **Dead page.** Delete `src/routes/(app)/terminal/` and update the route-contract counts (6 sites).
- **Token endpoint.** With the flag `false` it returns 410 `gone`.
- **Issuance 403.** Shows the permission toast, not the generic failure.

### 3.3 Site (A0, ships now and independently)

- `members/+layout.server.ts`: stop selecting `servers.token`.
- Delete `src/routes/api/device-identity/sign/` and `lib/services/member-gateway.svelte.ts`. Remove their uses in `members/+page.svelte`; tabs that relied on the live connection show a link to the hub.
- If nothing else uses `device-identity.service.ts`, delete it too.
- `TODO(handoff)` plus a proposal item: "site members area gets a hub-issued JWT" (the site can run `AUTH_PROVIDER=supabase`).

### 3.4 Gateway (A1, base `DEV`)

- **Audience list.** `multiTenant.oidcIssuers[].audience: string | string[]` (types, `.strict()` zod schema, help/labels). `validateGatewayJwt` passes the list to jose.
- **`multiTenant.jwtOnlyAudiences: string[]`**, default `[]`. The S4 (#363) JWT-only connect is admitted only when the JWT's `aud` is in this list; with an empty list it is disabled. This makes #363 inert and blocks cross-gateway replay. Spec 043's Base-org connect depends on it.
- **`plugin-ui-bridge`:** `authToken` becomes optional in the hello.
- **`GatewayWsClient.jwtExp`** stores the JWT expiry for the close timer.
- **`auth.refresh`** calls `resolveJwtAuth` (every issuer, audience list) and refuses unless the new JWT's `userId` and `orgId` equal the socket's. It then:
  - re-applies the role's scopes;
  - checks revocation by jti and userId;
  - resets the expiry timer;
  - answers only the caller (no `auth.token.refreshed` broadcast; any listener gets the event on its own socket only).
- **Expiry close.** For sockets whose auth method is JWT-only (S4's `jwtOnlyOk`), record `exp` and close with 4401 `jwt_expired` at `exp` + 60 s unless refreshed. Token+JWT sockets are untouched, which keeps A1 inert.
- **Revocation sweep.** `hub.token.revoked` also closes live sockets matching the jti or userId. The hub sending it is out of scope (R5).

### 3.5 Unchanged
- §1.6 holders. The gateway PTY (shared-token only, unreachable from browsers once `/terminal` is gone). `/mcp`. `config.get` (redacted).

## 4. Slices

| Slice | Repo / base | Content | Tag | Inert when merged |
|---|---|---|---|---|
| A0 | site / `dev` | §3.3 | security | No: closes a leak; the panel is already broken |
| A1 | gateway / `DEV` (with or right after #363) | §3.4 | security | Yes: audience list is additive; `jwtOnlyAudiences=[]` disables JWT-only connect, so the expiry timer never arms |
| A2 | hub / `master` (after 043 S1) | §3.1 | security | Yes: no `gatewayId` ⇒ same `aud`; `role` mapping equals today's effective scopes; the deletions remove dead routes; the plugin toggle 403 is a live fix |
| A3 | hub / `master` (after A2) | §3.2 | security | Yes: flag unset = today's client; plugins get `authToken: ''`, which the bridge accepts |
| A4 | hub / `master` (after the bake, BEFORE rotation) | delete the token endpoint, the flag, `fetchHostToken` and the hello `authToken` (needs A1 deployed); route-contract counts | security | n/a |

## 5. Launch (owner-run, in order)
1. **Deploy A1 on each gateway (DEV, FACES, netcup), and per process:**
   - confirm `multiTenant.oidcIssuers` and `controlUi.allowInsecureAuth`;
   - set `oidcIssuers[].audience` to `['openclaw-gateway', 'gw:<host>' for every hub row URL that points at it]`;
   - set `jwtOnlyAudiences` to the same `gw:` entries.
2. **Probe each gateway** with `minion_hub/scripts/qa/gateway-jwt-probe.ts <gatewayId> <userId>`, which mints server-side and connects JWT-only. Expect:
   - `health`, a `read` method and a `write` method allowed;
   - the admin method allowed for a platform admin and refused for a member;
   - a JWT minted for another gateway refused, which also proves A1 is live.
2a. **Admin-method gate (owner sign-off).** The inventory test (T037) is green, and the owner accepts its `PLATFORM_ADMIN_ONLY` list: the admin methods that stay platform-admin-only until 042 moves them to hub server routes. Until then, the platform admin does those actions for clinics.
3. Set `PUBLIC_GATEWAY_BROWSER_SHARED_TOKEN=false` and redeploy the hub.
4. **Acceptance:**
   - a HAR of a full dashboard session, including plugins and settings, contains no token prefix;
   - a member's socket survives 20 minutes, which proves refresh works;
   - a member removed from the org is disconnected within 15 minutes;
   - FACES staff use inbox, channels status and chat normally.
5. **Bake 7 days.** Rollback is the flag back to `true`, with a redeploy.
6. Ship A4, which deletes the endpoint and the flag. From here on, rollback is a reviewed code revert.
7. **Rotate every gateway's shared token:**
   - the gateway config, then restart, which drops `/mcp` OAuth refresh tokens held in memory;
   - the hub PG `gateway` row (sealed);
   - the Turso `servers.token` + `token_iv`;
   - the paperclip env.

   Then remove `'openclaw-gateway'` from each audience list.

## 6. Tests

| Invariant | Test |
|---|---|
| I1 | Hub: token route returns 410 when the flag is `false`; `gateway.svelte.ts` connect frame has no `auth.token` (unit, mocked fetch); bridge hello has no `authToken`. Site: layout data has no `token` key. Launch: HAR grep. |
| I2 | Gateway: JWT-only connect with `aud` outside `jwtOnlyAudiences` → 1008; empty list ⇒ JWT-only refused; legacy `aud` + shared token still admitted; audience list accepts either value. Hub: `gatewayAudience` normalization table; `gatewayId` required when the flag is `false`. |
| I3 | Gateway (fake timers): JWT-only socket closes 4401 after `exp` + 60 s; a refresh before that resets the timer; a refresh with another userId/orgId is refused and the socket stays; a revoked userId closes live sockets; a token+JWT socket is never expiry-closed. Hub client (fake timers): refresh every 600 s, timer cleared on close and on cutover; cutover fetches a JWT for the new host. |
| I4 | Hub: role table (platform admin → `admin`; org owner/admin/member → `user`); 403 for a gateway outside the org or without a link; plugin toggle 403 for a member. |
| I5 | Hub client: issuance 403 → permission toast; no reconnect with a token when the flag is `false`. |
| I6 | Hub client: with the flag unset, the connect frame is byte-identical to today's (snapshot). |

## 7. Risks

| # | Risk | Severity | Mitigation / status |
|---|---|---|---|
| R1 | No fallback: a JWT problem locks the dashboard out. | High | Launch steps 1–2 prove each gateway. The flag rolls back until rotation. |
| R2 | Org owners and admins have no gateway-admin power until 042. That covers more than channels: `config.*` (channel setup, settings), `channels.whatsapp.pair`, `channels.logout`, `agents.create/update/delete`, `skills.install/update`, `cron.add/update/remove/run`, `sessions.patch/reset/delete/compact` (`server-core/server-methods.ts:228-300` on `DEV`). | Medium | Same as today on a valid JWT. Never fixed by giving org roles gateway `admin`, which is a master key. Each action becomes a hub server route checked with `requireOrgCapability` (042, and the plugin toggle in A2). Launch step 3 is gated on the inventory in step 2a. |
| R3 | Before rotation, anyone who once fetched the token can still use it. | High | Rotation is launch step 6, not a follow-up. |
| R4 | tailscale and trusted-proxy connections get admin (`allowTailscale` is on in the default config). | Medium | Out of scope: network-level operator trust, not a browser credential. `TODO(handoff)` plus a proposal item. |
| R5 | The hub never sends `hub.token.revoked`. | Low | I3's 15-minute bound does not depend on it. Proposal item. |
| R6 | Read methods (`logs.tail`, sessions) have no org filter on shared gateways. | Medium | Pre-existing, owned by spec 042. Proposal item. |
| R7 | Changing the flag on Vercel needs a redeploy. | Low | Accepted. No code change is needed. |
| R8 | The site members area loses its (already broken) live gateway tabs. | Low | Accepted. Proposal item for a site JWT. |
| R9 | **Blocker found 2026-10-30.** "New chat" calls `sessions.patch` (`chat-rpc.ts:60`), and chat auto-title calls it too (`ChatHistoryPopover.svelte:104`). `sessions.patch` needs `operator.admin` (`server-core/server-methods.ts:298`), so read+write sockets fail it today, and after the flag flip that means every non-platform-admin. Browser personal-agent provisioning calls `agents.create` (`personal-agent.svelte.ts:91`), which a server route already does (`api/personal-agent/create`). | High | Owner decision OQ3. Recommended: in A1, `sessions.patch` passes with `operator.write` when only `label` is set and the session belongs to an agent the socket may use. In A3, browser provisioning moves to the server route. |

## 8. Owner decisions (2026-10-30: "proceed" on the recommendations)

OQ1 to OQ3 are accepted as recommended. The flag flip does not wait for spec 042 (the platform admin does channel setup for clinics in the meantime). Specs 043 and 045 are approved.

- **OQ1.** Only platform admins get gateway admin through the browser. Org owners and admins get read+write, which is what they already get today whenever the JWT works. Channel setup and WhatsApp pairing stay with the platform admin until spec 042. Accept? *Recommended: yes.*
- **OQ2.** JWT TTL 15 minutes with in-socket refresh every 10, so removing a member cuts their access within 15 minutes. Accept? *Recommended: yes.*

- **OQ3.** Chat needs `sessions.patch`, which is admin-only (R9). Open it to `operator.write` for label-only patches on the caller's own agents' sessions? *Recommended: yes, in A1.*

## 9. Rejected alternatives
- **A "dedicated gateway ⇒ org admin gets admin" rule.** There is no data for it, since `gateway.org_id` is per row. An admin JWT is a master key anyway: PTY `process.env`, and `config.patch` of `gateway.auth`.
- **A stored per-row `jwt_audience` column.** New rows default to the legacy audience and silently fail after rotation. Deriving `aud` from the URL cannot drift.
- **A new `gatewayId` claim plus a `requireGatewayIdClaim` flag.** `aud` already exists and is already verified. A claim adds a flag and a config key, and breaks provisioning.
- **Per-org static API keys stored hashed in the DB.** A long-lived secret in a browser is the same problem at org scope, and the gateway would need DB access or a hub call on every connect.
- **The gateway introspects with the hub on every connect.** That makes the hub a hard dependency of every connect. TTL plus refresh gets the same bound.
- **Proxy all browser gateway traffic through the hub server.** That means rewriting the realtime client and adds latency.

## 10. As-built notes (A2, hub PR #622)
- **TTL:** 900 s only when the request names a `gatewayId`; the legacy path (no `gatewayId`) keeps 3600 s until A4. Reason: today's prefetch can hold a JWT past 15 minutes, and an expired JWT makes the pre-A3 client fall back to token-only for 60 s.
- **Provisioning audience:** `mintOrgGatewayJwt` binds `gw:<host>` only when `PUBLIC_GATEWAY_BROWSER_SHARED_TOKEN === 'false'`. Gateway `DEV` closes 1008 on an unconfigured `aud` even with the token, so binding it at merge would break provisioning before launch step 1. A4 makes it unconditional.
- **Errors:** 403 sends `{error:'gateway_forbidden', code:'gateway_forbidden'}`. With the flag `false`, a missing `gatewayId` gets 400 `gateway_id_required`.
- **Plugin toggle:** gated by `requireOrgCapability(locals, 'settings', 'manage')`. A custom role holding that capability also passes.
- **Link check:** the JWT route copies the token route's legacy Turso `user_servers` fallback, for parity.
