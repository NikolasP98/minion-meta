# Tasks: Gateway per-org credentials (045)

Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md) · Design: [design.md](./design.md). Tests come first in each slice. `[P]` means the task can run in parallel.

## Phase 0: Site leak (A0) · site `dev`
- [x] T001 Stop selecting `servers.token` in `members/+layout.server.ts`. Drop `serverToken` from the scope, the state and the page types.
- [x] T002 Delete `api/device-identity/sign` and `device-identity.service.ts`. The members connect sends no `auth` and no `device`; add `TODO(handoff)`.
- [x] T003 Tests: no credential sent and no signer called; existing member-gateway tests updated. Gates green. Draft **PR #39**.

## Phase 1: Gateway (A1) · `DEV` · security
- [ ] T010 Tests first: audience list accepted; JWT-only with `aud` outside `jwtOnlyAudiences` → 1008; empty list ⇒ JWT-only refused; legacy `aud` with the shared token still admitted.
- [ ] T011 `oidcIssuers[].audience: string | string[]` and `multiTenant.jwtOnlyAudiences` (types, `.strict()` zod, help/labels); admission check in `message-handler.ts`. Coordinate with #363: rebase onto it, or fold in before it merges.
- [ ] T012 Tests first (fake timers): a JWT-only socket closes 4401 `jwt_expired` at `exp` + 60 s; refresh resets the timer; a token+JWT socket is never expiry-closed.
- [ ] T013 `GatewayWsClient.jwtExp`, the expiry timer, and clearing it on close.
- [ ] T014 Tests first: a refresh with another userId/orgId is refused and the socket stays; a refresh validates every issuer and audience; revocation is checked by jti and userId; `auth.token.refreshed` goes only to the caller.
- [ ] T015 `auth-refresh.ts`/`server.impl.ts` go through `resolveJwtAuth`, with the equality check, scope re-apply, timer reset, and no broadcast.
- [ ] T016 Test first, then the change: `hub.token.revoked` closes live sockets matching the jti or userId.
- [ ] T017 `plugin-ui-bridge`: `authToken` optional in the hello (test: a hello without it is accepted).
- [ ] T018 Gates (`test/ci/` + targeted, `pnpm check`, `pnpm tsgo`). Draft PR `feat(gateway): bind browser JWTs to one gateway and expire them on the socket` (security).

## Phase 2: Hub issuance (A2) · `master` · security
- [ ] T020 Tests first: role table (platform admin → `admin`, else `user`); `gatewayAudience` normalization; 403 `gateway_forbidden` for a gateway outside the org or without a link; TTL 900; `gatewayId` absent ⇒ legacy `aud`.
- [ ] T021 `gateway-jwt.service.ts` + `api/gateway/jwt`: optional `gatewayId`, audience, role mapping, TTL. `mintOrgGatewayJwt` passes the provisioning gateway's audience.
- [ ] T022 Test first, then the change: `api/plugins/[id]/toggle` gives a member 403 and lets an org owner/admin or platform admin through.
- [ ] T023 Delete hub `api/device-identity/sign` and `device-identity.service.ts`; update the route-contract counts (all 6 sites).
- [ ] T024 Gates. Draft PR `fix(gateway): per-gateway JWTs from org membership; members can't toggle plugins` (security).

## Phase 3: Hub client (A3) · `master` · security
- [ ] T030 Tests first: with the flag unset the connect frame is byte-identical (snapshot). With the flag `false`: no `auth.token`, no `fetchHostToken`, `gatewayId` sent, no `jwtAuthDisabled` fallback, issuance 403 → permission toast.
- [ ] T031 `gateway.svelte.ts`: the flag via `$env/dynamic/public`, JWT-only connect, prefetch keyed by gateway id, cutover fetching its own JWT.
- [ ] T032 Tests first (fake timers): refresh every 600 s; timer cleared on close and on cutover; a 4401 close reconnects with a fresh JWT.
- [ ] T033 Refresh timer + `auth.refresh`.
- [ ] T034 Plugins: hello `authToken: ''`; stop fetching the token; remove the "no host" check (test: the plugin page loads with no token).
- [ ] T035 Delete `(app)/terminal/` (route-contract counts); the token endpoint answers 410 when the flag is `false` (test).
- [ ] T037 Test first: an inventory test scans hub `src/` for every `sendRequest('<method>'` and classifies it with the gateway's scope rules (copied from `server-core/server-methods.ts`, with a comment pointing there). It fails when a method needing `operator.admin` is neither in `PLATFORM_ADMIN_ONLY` nor served by a hub server route. For non-platform-admins, every UI control behind a `PLATFORM_ADMIN_ONLY` method is not rendered, and a 403 says "your role can't".
- [ ] T036 Gates. Draft PR `feat(gateway): the dashboard connects with its own per-gateway JWT (inert until switched)` (security).

## Phase 4: Launch tool
- [ ] T040 `scripts/qa/gateway-jwt-probe.ts`: mints server-side for `<gatewayId> <userId>`, connects JWT-only, checks the read/write/admin allow-and-refuse matrix, and checks a JWT for another gateway is refused. Ships with A2 or A3.

## Phase 5: Launch (owner) — design §5
- [ ] T050 **OWNER** steps 1–2, per gateway: config plus probe.
- [ ] T049 **OWNER** step 2a: accept the `PLATFORM_ADMIN_ONLY` list from T037 before the flag flip.
- [ ] T051 **OWNER** step 3: flag `false` and redeploy.
- [ ] T052 **OWNER** step 4: acceptance (HAR, 20-minute socket, removal, FACES walk).
- [ ] T053 Step 5: 7-day bake.
- [ ] T054 A4: delete the token endpoint, the flag, `fetchHostToken` and the hello `authToken`; route-contract counts. Owner merges.
- [ ] T055 **OWNER** step 7: rotate every copy, restart the gateways, and drop the legacy audience.

## Dependencies
- A0 is independent.
- A1 must deploy before 043's Base-org JWT-only path is used, and before launch step 1.
- A2 comes before A3, and A3 before launch. A4 comes after the bake and before rotation.
