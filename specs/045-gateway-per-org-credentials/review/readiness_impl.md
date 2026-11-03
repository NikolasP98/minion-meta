# 045 design: implementation-readiness review (goldfish)

Mode: REVIEW. Anchors read: hub `dac2ac03`, gateway `45e34c02583`, site `dev` working tree. Verdict: **not ready**. A0 is close. A1 to A3 each leave at least one decision to the implementer.

## 🔴 Blockers

1. **I4 "dedicated vs shared" has no data source (A2).** `gateway.org_id` is a single nullable column (`@minion-stack/db` `pg/schema/gateway.js` `orgId: uuid('org_id')`), and `gatewayBelongsToOrg` is an equality on it (`gateway.pg.service.ts:381-394`). No org-assignments table exists, so `count(distinct org_id)` is always 1. Every org owner/admin would get `admin`, and the `org_admin` row would be dead code. The doc must name the table or rule that makes a gateway "shared". It must also say which role source counts as "owner/admin": `organization_members.role` or `member_roles`/`permission_roles`. §1.3 cites both.
2. **`auth.refresh` bypasses the planned gatewayId check (A1, security).** §3.4 puts the check in `resolveJwtAuth`. Refresh calls `validateGatewayJwt` directly, against the first issuer only (`server.impl.ts:1620-1626`). It also overwrites `userId`/`orgId`/role with no same-identity check (`auth-refresh.ts:56-64`). The doc must say where the check lives (inside `validateGatewayJwt`, or in both paths) and must require the refresh JWT's `userId`, `orgId` and `gatewayId` to equal the socket's.
3. **The gateway client cannot see layout data (A3).** `gateway.svelte.ts` is a module. `wsConnect()` has 8 callers, and none passes page data (`+layout.svelte:126`, `login/+page.svelte:179`, `HostsOverlay`, `OrgPicker`, `ProfileMenu`, `ConnectionStatusIndicator`, `AgentSidebar`, `settings/gateways`). The terminal page and plugin hosts need the mode too. The stated reason ("not a `PUBLIC_` env, so it flips without a rebuild") is wrong: the module already reads `$env/dynamic/public` (`gateway.svelte.ts:126,226`), which is resolved at runtime and is also readable server-side, so the 410 endpoint can use it. The doc should either pick `PUBLIC_GATEWAY_BROWSER_SHARED_TOKEN` via `$env/dynamic/public` (no plumbing needed), or specify a module setter and every call site that must invoke it. On Vercel an env change still needs a redeploy (verify), so R1's "one env change" rollback is overstated.
4. **Refresh timer and JWT across `cutoverToHost` are unspecified (A3).** `fetchGatewayJwt()` and the one-shot prefetch are host-agnostic (`gateway.svelte.ts:230-251`). A prefetch started by `wsConnect` can be consumed by a cutover backup to a different host (`:743-806`), which would produce a `gatewayId` mismatch once enforcement is on. The doc must state:
   - `fetchGatewayJwt(gatewayId)` and a prefetch keyed by host;
   - the timer is owned per client: started on hello or `activate()`, cleared in `onClose`, `wsDisconnect` (`:810-836`) and the old client at the cutover swap (`:795-805`);
   - the refresh always targets that client's own `host.id`.
5. **No test strategy for any slice.** The SDLC contract requires tests that prove each delta. None are listed: no refresh/identity-swap test, no expiry-timer fake-clock test, no cutover-timer test, no `effectiveGatewayRole` matrix, no 410 contract test, and no route-contract count update when the endpoint is later deleted.

## 🟡 Major

- **A1 is not provably inert.** §3.4 closes "a JWT-authenticated socket". The slice table says "JWT-only". Prod hub sockets carry token plus JWT today (L35, TTL 3600 s, no refresh). If mixed sockets count, every dashboard socket drops hourly when A1 merges. The fix is to say "only `authMethod === 'jwt'`", the variable set at `message-handler.ts:493`. The doc must also say where `exp` is stored: `JwtUserClaims` has no `exp` today (`auth-jwt.ts:15-26`).
- **A2 is inert only if `gatewayId` is optional.** §3.1 says "any failure is 403". The current client calls `/api/gateway/jwt` with no param (`gateway.svelte.ts:232`). Launch step 2 also needs the A3 client to send the param while the flag is still `on`. The doc should state both.
- **The `gatewayId` claim's value space is undefined.** `host.id` may be a legacy Turso id or a uuid (`resolveGatewayId`, `gateway.pg.service.ts:386`). The gateway compares the claim with `hubMetrics.serverId` ("Hub-assigned server ID", `hub-metrics-config.ts`). The doc must say which value is signed, and launch step 1 must check it on each gateway.
- **The new config key needs schema work.** `gateway.multiTenant` is `.strict()` (`zod-schema.ts:775-797`). The key must be added there and in `types.gateway.ts:546`, `schema.help.ts` and `schema.labels.ts`. Setting it on a gateway without A1 fails config load, so launch step 2 needs a "gateway runs A1" check.
- **I5 fail-closed behaviour is unspecified.**
  - `fetchGatewayJwt` returns `null` on any failure (`:230-239`), so a 403 cannot be told apart from other failures. The new return type must be specified.
  - In JWT-only mode, a 1008 `jwt_*` close or a null JWT feeds the shared client's unconditional auto-reconnect (`@minion-stack/shared/dist/gateway/client.js:233`). That is an endless loop. The doc must say what halts it.
- **PTY details are incomplete (A1/A3).** `jwt.<token>` is a legal subprotocol token. `server-http.ts:978` takes the first value, and `pty-ws.ts:110` echoes it back. Still open:
  - keep or drop the `?token=` fallback (`server-http.ts:981`);
  - where `oidcIssuers` comes from in the upgrade path;
  - whether a PTY outlives JWT expiry;
  - the terminal page swapping `fetchHostToken` for a JWT (`terminal/+page.svelte:37,57`).
- **Plugin bridge (A3/A4).**
  - The hello validator requires `authToken` to be a string (`bridge-protocol.ts:239`). The doc should keep `''` and add `jwt`/`jwtExpiresAt`, add `jwt.refreshed` to the `HostToPlugin` union, and say whether the bridge version is bumped.
  - §3.2 says "in place of" while A4 says "sends both". Pick one.
  - `minion_plugins` has no file that reads `authToken`, `gatewayUrl` or `host:hello` (grep empty), so A4 may be empty. Enumerate it or drop it.
- **A0 scope is understated.**
  - "Panel" is the whole members area: `member-gateway.svelte.ts` backs ChatTab, FilesTab and GraphTab, plus `members/+page.svelte:5,34`.
  - `/api/device-identity/sign` (`site sign/+server.ts:22-41`) signs a caller-chosen `role`/`scopes` with the tenant device identity. The doc is silent on it. I did not verify whether that signature alone admits a connect, but A0 should delete or gate it. The hub has the same route.
- **Launch verifiability.**
  - Step 1 names no probe tool or script for a JWT-only connect while the flag is still `on`.
  - Step 5 omits Turso `servers.token`. The token endpoint and the site still read it.
  - Step 5 also names no re-seal mechanism.
- **Refresh broadcast.** `auth.refresh` broadcasts `auth.token.refreshed` with `userId`/`orgId` (`auth-refresh.ts:68`). It is not in `EVENT_SCOPE_GUARDS`. At 10-minute refreshes per socket, check whether it reaches other orgs' sockets. I did not trace the fallback at `server-broadcast.ts:51`.

## 🟢 Confirmed

- **4401 is free.** The gateway uses only 1008 and `4000 "tick timeout"` (`client.ts:402`); the hub uses none. `isJwtAuthClose` matches only 1008 (`gateway.svelte.ts:254`). The shared client reconnects on any code, and `onChallenge` refetches the JWT (`:423`), so 4401 needs no special client handling beyond A3's mode check.
- **`auth.refresh` is callable by read/write roles** (`server-methods.ts:180,216`).
- **`org_admin` is already a valid role** (`auth-jwt.ts:41`). The scope change is inert because the hub never issues it today.
- **The `requireGatewayIdClaim` default of false keeps A1's binding inert.**
