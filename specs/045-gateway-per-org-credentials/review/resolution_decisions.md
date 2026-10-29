# Resolution decisions (Elephant, 2026-10-29)

**Inputs:** `critic_design.md`, `readiness_codebase.md`, `readiness_impl.md`, plus two Elephant checks:
- Config reads redact secrets (`minion/src/gateway/server-methods/config.ts:341,367,460,512`).
- On gateway `origin/DEV`, a valid JWT already replaces the connection's scopes with the JWT role's scopes, even when the shared token is also sent (`src/gateway/server/ws-connection/message-handler.ts:928-933`). In prod, where `PUBLIC_GATEWAY_JWT_AUTH=true` and `oidcIssuers` are set, a non-platform-admin already gets `read`+`write`. Admin comes from the token only when the JWT fails and the browser falls back to it.

**Owner rule, binding:** no person holds a master key. Per-org credentials, validated against the DB.

## Decisions

1. **Drop the "dedicated gateway" rule (all three reviewers 🔴).** It has no data: `gateway.org_id` is one column per row, and a shared process such as netcup has one row per org. It also defeats the rule: an `admin` JWT can open the PTY (full `process.env`, `pty-ws.ts:95`) and `config.patch` `gateway.auth`.
   - New mapping: `admin` only for platform admins (`profiles.role='admin'`); everyone else gets `user` (`read`+`write`).
   - The hub never emits `org_admin`, and `mapRoleToScopes('org_admin')` stays unchanged.
   - This equals today's behaviour on a healthy JWT, so no org loses anything it really has.
   - OQ1 now reads: "org owners/admins keep no gateway-admin power; channel setup stays platform-admin until spec 042".

2. **No `approvals`/`pairing` for org roles (critic 🔴, codebase 🔴).** `device.token.rotate` mints tokens with caller-chosen scopes (`devices.ts:137-170`), and the approval and pairing methods have no org filter. These scopes stay platform-admin-only. The decision 1 mapping already covers this.

3. **Bind the JWT to a gateway with a per-gateway `aud`, not a new claim plus flag (critic 🟢, adopted).**
   - Hub: new nullable column `gateway.jwt_audience`. The issuer uses `row.jwt_audience ?? 'openclaw-gateway'`.
   - Rows for the same process share one audience, so the second org on netcup keeps working.
   - The gateway already checks `aud` (`auth-jwt.ts`). The only gateway change: `oidcIssuers[].audience` accepts `string | string[]`, so a gateway can take both values during cutover.
   - Inert until an owner sets the column and the gateway audience.
   - `mintOrgGatewayJwt` takes the target row's audience, so provisioning keeps working.
   - Removes `requireGatewayIdClaim`, the `gatewayId` claim and the readiness finding about which id format to use.

4. **`auth.refresh` goes through the same validation as connect (all three reviewers 🔴/🟡).** It must:
   - use `resolveJwtAuth` (every issuer, `aud`);
   - require the new JWT's `userId` and `orgId` to equal the socket's, rejecting a mismatch without closing the socket;
   - re-apply scopes from the new role, which may only stay the same or narrow;
   - check revocation by jti AND userId;
   - send `auth.token.refreshed` only to the refreshing socket, not as a broadcast.

5. **Expiry close applies only to sockets whose auth method is `jwt`** (impl 🟡). Today's token+JWT sockets are untouched, so A1 merges inert.

6. **PTY: no JWT path (codebase 🟡).** The hub `/terminal` page is dead: it 307s to `/cloud/terminal`, which uses shell-provider tickets. A3 deletes the dead page and its token fetch. The gateway PTY keeps shared-token auth, which is server-side only. Nothing in the gateway PTY changes.

7. **Plugins: the iframe gets no credential (codebase 🟡).** No plugin UI opens its own socket; every RPC goes through the hub's `forwardRpc`. A3 makes these changes, and A4 is dropped:
   - remove `authToken` from the bridge hello, protocol validator and types;
   - remove the "no host" check that keys on it;
   - remove the `'*'` targetOrigin path that posted it.

8. **Site A0 (codebase 🟡, critic 🟡).**
   - Stop serializing `servers.token`.
   - Delete `/api/device-identity/sign`: it signs caller-chosen role/scopes for any signed-in user, and its only caller is the broken panel.
   - Delete the members live-gateway connection (`member-gateway.svelte.ts`). It already fails (`role:'member'` is rejected).
   - Tabs that relied on it show a link to the hub. OQ2 is no longer a question: the panel is already broken, so nothing is lost.

9. **Flag plumbing (impl 🔴).** Use `PUBLIC_GATEWAY_BROWSER_SHARED_TOKEN` read through `$env/dynamic/public`, as `gateway.svelte.ts` already does. A Vercel env change needs a redeploy with no code change; say that. Default when unset: `true`, the old behaviour. Every `wsConnect` caller is covered, because the switch sits inside `wsConnect`/`onChallenge` and not at the callers.

10. **JWT per host and refresh lifecycle (impl 🔴).**
    - The JWT prefetch is keyed by gateway id; `cutoverToHost` drops a prefetch for another host and fetches its own.
    - `GET /api/gateway/jwt?gatewayId=` is optional: absent means today's audience.
    - One refresh timer per live socket starts on hello-ok and is cleared on close and on cutover.
    - A refresh failure leads to the expiry close and then a normal reconnect.

11. **Rollback after rotation must not leak the new token (critic 🟡).**
    - The flag is a rollback only before rotation.
    - Rotation happens after a 7-day bake with the flag off. The same release that ships rotation's runbook deletes the token endpoint and the flag.
    - After that, rollback is a code revert, reviewed by the owner.

12. **Rotation covers every copy (impl 🟡, codebase 🟡):**
    - the gateway config;
    - the hub PG `gateway` row (sealed);
    - the Turso `servers.token` + `token_iv`;
    - the paperclip env;
    - and a gateway restart, which drops `/mcp` OAuth refresh tokens held in memory.

13. **Out of scope, listed in Risks with `TODO(handoff)` and a proposal item:**
    - tailscale and trusted-proxy connections get admin, with `allowTailscale` on by default;
    - `logs.tail`, and read methods with no org filter on shared gateways (spec 042);
    - the hub never calling `hub.token.revoked`;
    - the site supporting `AUTH_PROVIDER=supabase` (a future site JWT).

14. **Test strategy per slice (impl 🔴).** Add a §Tests table. Each invariant gets a named test:
    - I1: an HTTP response grep test over the token route plus a HAR check at launch;
    - I2: an `aud` mismatch unit test;
    - I3: expiry-close and refresh unit tests in the gateway, plus a fake-timer client test;
    - I4: a role-mapping table test in the hub.

15. **Launch probe (impl 🟡).** Step 1 uses a committed script, `minion_hub/scripts/qa/gateway-jwt-probe.ts`. It mints a JWT for a given user/org/gateway (server-side, owner-run), connects JWT-only, and calls `health` plus one method per scope class, expecting each to be allowed or refused.

## Round 2 (after `reaudit.md`; no further re-audit, per process)

16. **N1, plugins hang without `authToken`.** The gateway's `packages/plugin-ui-bridge` drops a hello without a string `authToken`.
    - A3 sends `authToken: ''`, never the token.
    - A1 makes the field optional in the bridge.
    - A4 removes it from the hub.

17. **N2, audience drift.** Drop the `jwt_audience` column; the spec no longer adds a migration. `aud` is `gw:<host[:port]>` of the gateway row's URL, normalized and lower-cased, computed at issue time.
    - URLs are unique per row (`gateway_uniq_url`), so each gateway process lists every host it is reached by in `oidcIssuers[].audience`.
    - A new row on a host the gateway does not list is refused at once, and the launch probe catches it. It never fails silently later.
    - `mintOrgGatewayJwt` uses the target gateway's URL, which provisioning already has.

18. **N3, cross-gateway replay before rotation.**
    - A1 adds `multiTenant.jwtOnlyAudiences: string[]`, default `[]`. A JWT-only connect (no shared token) is admitted only when the JWT's `aud` is in that list. While the list is empty, JWT-only connect is disabled, so #363 merges inert.
    - The legacy `'openclaw-gateway'` audience is therefore only ever accepted alongside the shared token.
    - The hub route requires `gatewayId` once the flag is `false`.
    - Spec 043's Base-org JWT-only connect also depends on this list. Add it to 043's launch preconditions.

19. **Partials.**
    - A4 (delete the endpoint and the flag) ships before rotation.
    - The probe proves A1 is deployed by expecting a wrong-`aud` JWT-only connect to be refused.
    - `exp` is stored on `GatewayWsClient`.
    - Issuance answers 403 `{code:'gateway_forbidden'}`; an outage is 5xx or a network error, and the client tells them apart by status.
    - The hub `api/device-identity/sign` route (no callers) and `device-identity.service.ts` (no other users) are deleted in A2.

20. **N4: `api/plugins/[id]/toggle` lets any member call the admin-only `plugins.org.set`.** A2 requires org owner/admin or platform admin, and returns 403 otherwise. This is an in-org privilege fix, and it is small.
