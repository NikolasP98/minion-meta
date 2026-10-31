# Spec 045 A2 adversarial audit (hub #622, `feat/045-gateway-jwt-issuance` @ `a1893ad5`)

**Verdict: SHIP.** No Critical or High findings. I found no path to another org's gateway, no path for a non-platform-admin to get `role=admin`, and no change for existing callers while the flag is unset. One Medium launch-readiness item has to be done before the flag flip (M1). The Low items can follow up.

Method: I ran the 4 PR test files (36/36 green) and the 7 route-contract and RBAC suites that glob `+server.ts` (190/190 green). I wrote 4 throwaway probe files that used the real `gatewayAudience`, the real `getGatewayUrlForOrg` SQL and the real `requireOrgCapability`/`apiWriteCapability`, then deleted them. I also ran 4 read-only queries against prod Supabase: profile roles, gateway rows, gateway indexes, and membership role keys. All tests ran with `env -u SUPABASE_DB_URL -u DATABASE_URL`. The worktree ends clean at `a1893ad5`.

## Findings

### M1 (Medium, launch step 1). Nothing derives the `gw:` audiences the gateways must list, and T040's probe did not ship
- `gatewayAudience` normalises with WHATWG URL. Executed outputs:
  - `WSS://Host.Example:443/path` → `gw:host.example`
  - `http://host.example:443` → `gw:host.example:443` (the port is kept because it isn't http's default)
  - `ws://[0:0:0:0:0:0:0:1]:8080` → `gw:[::1]:8080`
  - `ws://host.example.` → `gw:host.example.` (trailing dot kept)
  - `wss://bücher.example` → `gw:xn--bcher-kva.example`
  - `wss://0x7f.0.0.1` → `gw:127.0.0.1`
  - `wss://h:0443` → `gw:h`
  - `ws://a:b@h` → `gw:h`
  - `' wss://h '` → `gw:h`
  - `wss:h` → `gw:h`
  - `ftp://…`, `file:///etc` and `not a url` throw.
- The gateway matches with exact string equality: jose `audience` and `jwtOnlyAudiences.includes(aud)`, in `gw-043-s4 message-handler.ts:495-496`.
- Launch step 1 asks ops to hand-write `gw:<host>` for every row. In prod those are `gw:netcup.donkey-agama.ts.net`, `gw:netcup.donkey-agama.ts.net:10000` and `gw:protopi.donkey-agama.ts.net:8443`. Netcup :443 and :10000 are two audiences for what I believe is one process; both must be listed. A hand-typed `:443` or a different case locks everyone out (R1).
- T040 (`scripts/qa/gateway-jwt-probe.ts`, "ships with A2 or A3") is not in this PR.
- **Fix:** A3 must carry T040. The probe (or a one-line `bun -e`) should print `gatewayAudience(row.url)` for every gateway row, and ops should paste those strings rather than type them.

### L1 (Low). Provisioning resolves the gateway twice
- `organization-provision.service.ts:191-193`: `mintOrgGatewayJwt` calls `resolveCredentialsForUser` to get the audience. `gatewayCallAsUser` then resolves again (`gateway-rpc.ts:314`).
- If the lease flips between the two calls, the JWT names gateway X while the socket reaches Y. Y closes 1008 and the provisioning step fails. It is retryable, because the steps are idempotent.
- `gateway-lease.service.ts:315` already exports `resolveOrgChannelTarget` "to keep provisioning's identity and RPC credentials from one lease selection".
- Inert until the flag is `false`. Found by reading, not executed.
- **Fix:** resolve once and pass the same url/token to the call (`gatewayCallWithCreds`), or accept and note it under the existing `TODO(handoff)`.

### L2 (Low). The flag only matches the exact string `false`
- Executed: `PUBLIC_GATEWAY_BROWSER_SHARED_TOKEN` = `"false"` → 400. `"FALSE"`, `" false"`, `"False"`, `"0"` and `""` → 200 with the legacy audience and 3600 s TTL.
- A Vercel env value with a trailing newline (this has bitten the hub before) silently keeps the legacy path. This matches the design (`=== 'false'`) and A3 will presumably use the same comparison, so it fails consistently toward today's behaviour.
- **Fix (optional):** one shared helper with `.trim().toLowerCase() === 'false'`, used by the route, provisioning and the A3 client.

### L3 (Low, availability). A registry outage returns 500 here, where the token route returns 503
- Executed: `getGatewayUrlForOrg` rejects → 500 `{"error":"Failed to issue JWT"}`, with no leak of the sentinel. An unparsable stored URL also gives 500.
- The token route returns 503 + `retry-after` for registry errors (`api/servers/[id]/token/+server.ts:117-122`), so the client retries.
- This matters only once A3 relies on this route.
- **Fix:** map a registry error to 503 + `retry-after: 2`, or make sure A3 treats 500 as transient.

### L4 (Low, parity). Ids that exist only in Turso get 403 instead of the token route's fallback
- `getGatewayUrlForOrg` returns null for an id missing from PG, so the route returns 403. The token route instead falls back to Turso `servers`.
- Prod has 5 gateway rows, all in PG, and no legacy-id/uuid collisions. I don't expect a live effect.
- `resolveGatewayId` has no `ORDER BY` (pre-existing), which is fine with today's data.

### Info
- **I-a. The design claim "URLs are unique per row (`gateway_uniq_url`)" is false in prod.** The index is `gateway_uniq_url_org_channel (url, org_id, channel)`. Two orgs share `wss://netcup.donkey-agama.ts.net` and two share `wss://protopi…:8443`.
  - This is not a vulnerability: `aud` identifies the gateway process and the `orgId` claim scopes the org. It does mean that once A1 is live, `aud` blocks cross-host replay but not cross-org replay. Cross-org replay is blocked only by the gateway honouring `orgId`.
  - The path is dropped (`wss://h/gw-a` and `wss://h/gw-b` → `gw:h`). Path-routed gateways behind one host would share an audience. There are none in prod.
  - Please correct the design sentence.
- **I-b. "Members can't toggle plugins" was already true on master.** `apiWriteCapability('/api/plugins/…', 'POST')` = settings:manage, and the hooks write guard runs before the route. That mapping exists in master `rbac.service.ts:1129`. The route gate is defence in depth, not a live fix. The design's "live fix" wording overstates it. Executed: `/api/plugins/whatsapp/toggle`, `…/x/toggle/` and `…//toggle` all map to `{settings, manage}`.

## The implementer's five deviations

| # | Deviation | Verdict |
|---|---|---|
| 1 | TTL 3600 without `gatewayId`, 900 with it | **Correct and safe.** A legacy-audience JWT is never in `jwtOnlyAudiences`, so it only works next to the shared token (already a master key) or on the gateway `/mcp` Bearer path. The `/mcp` gap is pre-existing and tracked as a gateway TODO at `server.impl.ts:1697`. Once the flag is `false`, a request without `gatewayId` gets 400, so no new legacy JWTs are issued. Executed: `TODO(handoff)` present. |
| 2 | Provisioning audience only when the flag is `false` | **Correct.** Verified by reading `gw-043-s4 message-handler.ts:957-976`: a token+JWT connect whose JWT fails audience validation is closed 1008. Binding `gw:` at merge would break provisioning. |
| 3 | Plugin toggle via `requireOrgCapability(settings, manage)` | **Correct.** Executed with the real RBAC: member 403, legacy membership `org_admin` 403, non-member 403, no supabaseId 403, anonymous 401; owner, admin, legacy membership `admin`, platform admin and a custom role holding settings:manage all 200. Every 403 happens before the DB write and before `plugins.org.set`. Prod role keys are owner/manager/staff, and manager has settings VIEW only, so managers get the 403 (already true via hooks). The UI checks `res.status === 403` before `res.json()` and shows the role message. en/es keys present. |
| 4 | Legacy Turso `user_servers` fallback in the link check | **Safe.** It only runs after `getGatewayUrlForOrg` has matched both id and org. Executed: a gateway in another org with a Turso link present → 403, and the Turso query is never made. Executed: a Turso-only link inside the org → 200 with `aud=gw:netcup.example` (input `WSS://Netcup.Example:443/x`). Rendered SQL: `("gateway"."id" = $1 and "gateway"."org_id" = $2)` with params `[gw-uuid, org-B]`. The Turso table is not org-scoped, but the org gate comes first, so it adds nothing beyond the token route. `user_servers` no longer exists in Supabase but does in Turso (`ctx.db` is libsql). `issueGatewayJwt` already reads Turso `user_agents`, so Turso is live. |
| 5 | 400 `gateway_id_required` when the flag is `false` and no id | **Correct.** An empty `?gatewayId=` is treated as absent → 400 (executed). |

## The attacks in the brief

- **Another org's gateway:** 403. The org filter is in SQL (rendered above). This applies to platform admins too: executed, admin + `getGatewayUrlForOrg = null` → 403.
- **Platform admin, cross-org:** a platform admin only skips the link check, inside their active org. The active org comes from the `active_org` cookie, and `resolveSupabaseTenant` checks it against canonical memberships on every request. The request body plays no part. A platform admin therefore can't reach an org they are not a member of. This is intended and matches the token route.
- **No active org:** 403 before any lookup (existing test).
- **Role claim:** the route's `authUser.role` comes from `mapProfileToUser` (`profile.role === 'admin'`). `issueGatewayJwt` re-reads the canonical profile. Executed: role string `"Admin"` → unlinked 403 (no bypass). The PR test table covers `org_admin`/`owner`/null → `user`. Prod `profiles.role` has only `admin` (1) and `user` (12), so the mapping change affects no live principal. There is no impersonation path: bearer providers never set `locals.user` on `/api/gateway/jwt`, which is not in the server-token path list.
- **Server-side callers of `issueGatewayJwt`:** only the route and `mintOrgGatewayJwt`. The latter is used only by `/api/organizations/provision` (`requireAdmin`), so the role stays `admin`. The gateway's `shells.ts` `hasScope` treats `userRole === 'admin'`. No flow depended on another role string.
- **Device-identity deletion:** no remaining caller in hub `src/`, `scripts/` or `tests/`, the meta `packages/`, or paperclip. `minion_site` calls its own `/api/device-identity/sign`, which is unaffected. The hub `deviceIdentities` schema export remains as dead code (harmless). The route-contract suites only count page endpoints and stay green. `.planning/codebase/*.md` still mention the route (stale docs only).
- **Inertness:** the only browser caller is `gateway.svelte.ts:232`, which sends no `gatewayId`. Executed: with the flag unset or `true`, `issueGatewayJwt` gets `{}` → legacy audience, 3600 s. The response shape is unchanged.
- **CORS/CSRF:** the hub sets no `Access-Control-Allow-Origin` anywhere. It is a cookie-auth GET, and a cross-origin page cannot read the response.

## Confirmed by execution vs by reading
- **Executed:**
  - the `gatewayAudience` table (M1, I-a);
  - the org-filter SQL;
  - the route: Turso-link pass, other-org 403 without a Turso query, flag variants (L2), empty id, `"Admin"` role, outage and bad-URL 500 (L3);
  - the toggle RBAC matrix and the hooks capability mapping (I-b);
  - the PR and route-contract suites;
  - prod read-only queries: profile roles, gateway URLs and index, membership role keys.
- **Read:**
  - the gateway 1008 behaviour (deviation 2);
  - the provisioning double resolution (L1);
  - the token-route 503 and Turso parity (L3, L4);
  - device-identity caller sweep (by grep);
  - tenant resolution from the cookie.
- **Not done:** `bun run check` (svelte-check/tsc) and lint; I did not re-run the implementer's gates. No end-to-end connect against a real gateway.
