# 045 re-audit (goldfish, round 2)

Code: hub `dac2ac03`, gw `45e34c02583`, site `dev`. `D:Lnn` = design.md line.

**Verdict: not ready. 1 new 🔴, one 🔴 at rotation, 3 🟡.**

## Round-1 status

**critic_design**
- 🔴1–🔴4: **RESOLVED**. The dedicated rule is dropped, admin is platform-only, and PTY gets no JWT path (D:L100-106, L163, L230). 🔴2's binding is now per-process `aud` (D:L89-92); see N2 and N3.
- 🟡5 `auth.refresh`: **RESOLVED** (D:L154-158).
- 🟡6 `mintOrgGatewayJwt`: **PARTIAL**. D:L127 says "target row", but `mintOrgGatewayJwt(orgId, profileId)` has no row (`organization-provision.service.ts:184`). See N2.
- 🟡7 rollback re-leak: **PARTIAL**. Flag and endpoint outlive rotation until A4 (D:L173, L199); flipping the flag then serves the *new* token. Ship A4 before step 6.
- 🟡8 device tokens: **PARTIAL**. Only the site sign route is deleted (D:L147). Hub `src/routes/api/device-identity/sign/+server.ts:6-30` signs caller-chosen role/scopes for any member and has no caller, breaking I1 (D:L88).

**readiness_codebase**
- 🔴1–🔴5: **RESOLVED**. 🔴5 carries the N2 caveat.
- 🟡6 plugins: **PARTIAL**. Dropping A4 is right, but the removal breaks plugins (N1).
- 🟡7–🟡12: **RESOLVED**. 🟡11 is resolved as explicit out-of-scope (R4–R6, plus the `/mcp` restart at D:L193).

**readiness_impl**
- 🔴1–🔴4: **RESOLVED**. The flag comes via `$env/dynamic/public` (D:L112), and the per-host prefetch and timer are at D:L135-138.
- 🔴5 tests: **RESOLVED** (§6), but the I1 test misses the hub sign route and the hello test asserts N1's breaking shape.
- 🟡 A1 inert: **PARTIAL**. `jwtOnlyOk` scoping is fixed (D:L159), but where `exp` is stored is still unstated. `JwtUserClaims` has no `exp` (`auth-jwt.ts:15-26`).
- 🟡 A2 optional param, PTY, refresh broadcast: **RESOLVED** (D:L122, L163, L158).
- 🟡 config schema: **PARTIAL**. Listed (D:L153), but launch step 2 (D:L182) never checks the gateway runs A1; without it an array audience fails `.strict()` config load.
- 🟡 I5: **PARTIAL**. No return type tells a 403 from an outage, and nothing halts the reconnect loop when issuance keeps failing.
- 🟡 bridge: **OPEN**, now a 🔴 (N1). The design picked "remove", not "keep `''`".
- 🟡 A0 scope: **RESOLVED**. `ChatTab`, `FilesTab` and `GraphTab` import `member-gateway`, so they must be edited too.
- 🟡 launch: **PARTIAL**. Probe and Turso copy added (D:L178, L195); no re-seal tool named.

## New findings

**N1 🔴 A3 is not inert: the `authToken` removal hangs every plugin UI.**
D:L139 removes `authToken` from `host:hello` outside the flag, and D:L172 calls this "live and harmless". It is not:
- The plugin-side bridge accepts a hello only when `typeof v.authToken === "string"` (gw `packages/plugin-ui-bridge/src/index.ts:141`).
- An invalid hello is dropped silently (`:268-270`).
- `bridgeState.ready` is set only in `onHello` (`extensions/discord/ui/src/lib/bridge.svelte.ts:71-78`), and the app polls `ready` forever (`App.svelte:58-64`). Every `extensions/*/ui` does this, and those bundles ship with the gateway, not the hub.

*Fix:* keep `authToken: ''`, which the hub already does for artifacts (`ArtifactHost.svelte:82`). Drop the field only after a gateway release makes it optional.

**N2 🔴 (at step 6) The audience lives on the row, so it drifts from the process.**
- `jwt_audience` defaults to null (D:L121), so any row created after step 2 issues `'openclaw-gateway'`. Every gateway refuses that after step 6, locking that org's browsers out.
- Provisioning breaks the same way: its `shells.*` calls carry a minted JWT (`organization-provision.service.ts:299-336`).
- `gatewayCallAsUser` picks the URL through `resolveCredentialsForUser`. Nothing ties that URL to the row whose audience is signed.

*Fix (smaller, too):* drop the column and derive `aud` from the normalized row URL at issue time (`gw:<host>`). Rows of one process share a URL by construction, and provisioning signs for the URL it will dial.

**N3 🟡 I2 does not hold during the bake. Cross-gateway replay stays open until step 6.**
- Step 2 keeps `'openclaw-gateway'` on every gateway (D:L182).
- The route still mints that audience whenever `gatewayId` is absent (D:L122).
- #363's JWT-only connect admits it with no token (`message-handler.ts:428-496`).

Any member of any org can open a read+write socket on any gateway (e.g. FACES), where `logs.tail`-class reads have no org filter (R6).

*Fix:* once the flag is `false`, the route rejects a request without `gatewayId`. Old clients still get the default audience while the flag is `true`.

**N4 🟡 Hub admin-by-proxy (carried from critic 🟢12, unaddressed).**
- `api/plugins/[id]/toggle/+server.ts:10,49` requires only `requireAuth`, then calls the admin-only `plugins.org.set` via `gatewayCall`. That call uses the system credentials, not the org's gateway. Any member, viewers included, can toggle plugins for the whole org (not cross-tenant: `orgId` comes from the server ctx).
- The other `config.patch` proxies (brains, WhatsApp) send hub-built patches behind `requireOrgCapability`, and `update.*` sits behind `requireAdmin`. No route forwards a caller-chosen method or config body, so I found no master-key-equivalent.

**Checked, no new 🔴:**
- *Device identity.* A JWT-only connect with a device still needs pairing (`skipPairing` requires `sharedAuthOk`, `message-handler.ts:746`). A device token alone hits Case 3 `jwt_required` (`ws-jwt-auth.ts:147`). Both hold only while `oidcIssuers` is set (launch step 1). Tokens are still minted with caller-chosen scopes (`:869-870`, returned `:1123-1127`).
- *Refresh.* Same `userId`+`orgId` plus issuer-list validation closes the swap.
- *A1 and A2.* Both are inert. The hub fetches a fresh JWT per challenge (`gateway.svelte.ts:423`), and the gateway never reuses a JWT, so TTL 900 is safe.
- *Nit.* D:L97's "15 min" is really about 16 (`exp`+60 s).
