# Design critic review: 045 gateway per-org credentials

**Verdict: does not yet satisfy the owner rule.** Findings 1 and 3 still hand an org admin the master key, and finding 2 locks tenants on shared gateways out.

## 🔴 Blockers

**1. "Dedicated" cannot be computed from the data model (design L73, L87).**
A `gateway` row is an *assignment*, not a physical gateway. The migration says so in its comment and enforces it with a unique index on (url, org, channel): "two orgs legitimately share one URL (MINION-prd and PINONITE-prd both point at netcup/default)" (`supabase/migrations/20260719210000_gateway_channel_lease.sql:4-6,23-24`). `gateway.orgId` is a single column (`@minion-stack/db pg/schema/gateway.js:14`), and `gatewayBelongsToOrg` matches one row (`gateway.pg.service.ts:381-394`). Counting `count(distinct org_id)` per row therefore always returns 1, so every org admin on shared netcup gets `admin`.
*Fix:* define dedication over the physical instance (normalized URL or an instance id) and fail closed to `org_admin` for Turso-only or ambiguous rows.

**2. `gatewayId` binding has the same identity mismatch (I2, L62, L109).**
The JWT claim carries a row id, but the gateway has one `hubMetrics.serverId` per process. Once `requireGatewayIdClaim` is on, JWTs for every org whose row is not the one serverId names are refused, so PINONITE on netcup is locked out. Launch step 1 would not catch this.
*Fix:* bind to an instance id stored on every assignment row, or use a per-instance `aud` (see 9).

**3. A dedicated-gateway org admin still gets the master key (I4 L73, §3.2 L98, §3.4 L113).**
An `admin` JWT opens the PTY. The PTY spawns a login shell on the gateway host with the gateway's full `process.env` (`pty-ws.ts:73,95`), which includes the gateway's shared token and every other secret it holds. `admin` also covers `config.patch` of `gateway.auth`, `multiTenant.oidcIssuers` and `requireGatewayIdClaim`, so the holder can switch off the very binding this spec adds. That breaks the owner rule.
*Fix:* keep PTY and auth/multiTenant config writes for platform admins only. Either use a distinct org-owner role (admin scopes minus a deny list), or give org admins `org_admin` everywhere and move WhatsApp pairing to a hub server action.

**4. Giving `approvals`+`pairing` to `org_admin` opens new cross-tenant reach (L74, L110).**
None of the methods behind these scopes checks the org:
- `device.pair.list/approve` and `device.token.rotate` take no org scope. `rotate` mints and *returns* a fresh device token with caller-chosen scopes (including `operator.admin`) for any deviceId (`server-methods/devices.ts:137-170`).
- `exec.approval.resolve` approves another tenant's host exec (`exec-approval.ts:154-171`, no orgId).
- `node.pair.approve` likewise.

*Fix:* keep `org_admin` = `read`+`write` until these handlers are org-scoped.

## 🟡 Major

**5. `auth.refresh` skips the new checks.**
- Refresh is wired to `validateGatewayJwt` against `oidcIssuers[0]` only (`server.impl.ts:1617-1625`), not to `resolveJwtAuth`. The `gatewayId` check placed in `resolveJwtAuth` (L109) never runs on refresh, so a JWT minted for gateway A can be swapped in on gateway B.
- The handler overwrites `userId`/`orgId` with no check that they match the socket (`auth-refresh.ts:57-64`), so the socket can change identity.
- Revocation checks `jti ?? userId` (L51), never the user id when a jti is present.
- `auth.token.refreshed` (userId, orgId) is broadcast to every client (L66), which leaks across tenants.

*Fix:* one validator shared by connect, refresh and PTY. Refresh must pin `userId`+`orgId` and check revocation on both jti and userId. Send the event to the caller only.

**6. "`mintOrgGatewayJwt` is unchanged" (L89) is false in effect.**
It calls `issueGatewayJwt` (`organization-provision.service.ts:184-187`). A JWT without `gatewayId` breaks `shells.*` provisioning at launch step 2. It must pass the gateway id taken from the lease.

**7. Rollback re-leaks the rotated token (R1 vs I7/R3).**
Turning the flag back `on` after step 5 makes the endpoint serve the *new* token. Rollback must only be allowed before rotation, and after rotation the endpoint must return 410 whatever the flag says. A related gap: when `requireGatewayIdClaim` rejects a JWT, the old client falls back to the token for 60 s (`gateway.svelte.ts:207-256`), so a step-2 failure goes unnoticed while the flag is on.

**8. Device tokens are another credential I1 does not cover.**
The hub and site `/api/device-identity/sign` endpoints sign arbitrary `role`/`scopes` for any member, using a per-org identity (hub `routes/api/device-identity/sign/+server.ts:11-25`, site same). The gateway issues a device token with the *requested* scopes (`message-handler.ts:869`) before the JWT scopes override them (L966), and returns it in hello-ok (L1123). It is inert only while every gateway sets `oidcIssuers`.
*Fix:* add device tokens to I1 (none issued to JWT sessions, or capped to the JWT's scopes) and restrict the sign endpoints.

## 🟢 Minor / simpler alternatives

**9. Simpler binding: a per-instance `aud` instead of a new claim and flag.**
The audience is the constant `'openclaw-gateway'` (`gateway-jwt.service.ts`, `setAudience`). jose already enforces `aud`, and gateways already configure an audience per issuer. That is no new code path, and launch becomes "set the audience per gateway". It also fixes JWTs replaying across gateways before step 2.

**10. Plugin iframes get the user's full JWT (§3.2 L99),** which is admin on dedicated gateways. A third-party plugin UI should get a read/write JWT or none.

**11. `jwt.<token>` in `Sec-WebSocket-Protocol`** is echoed back and may be logged by proxies. The spec should say so.

**12. §1.5 assumes the 27 server-side callers are safe.**
Example: `api/plugins/[id]/toggle/+server.ts:10-49` only requires authentication, then calls the admin-only `plugins.org.set` with the shared token, so any member performs an admin write by proxy. Add an authz audit of those callers, even if no fixes ship with this spec.

**13. Platform-admin JWTs** keep PTY on every gateway. Make that an explicit open question for the owner.
