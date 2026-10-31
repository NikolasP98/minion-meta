---
id: 2026-10-29-gateway-per-org-credentials-followups
title: Gateway per-org credentials — open ends deferred from spec 045
status: draft
created: 2026-10-29
updated: 2026-10-29
repos: [minion_hub, minion, minion_site]
spawned_spec: 2026-10-29-gateway-per-org-credentials-spec
tags: [security, permissions]
effort: M
source: specs/045-gateway-per-org-credentials
---

# Gateway per-org credentials: open ends

Spec 045 (`specs/045-gateway-per-org-credentials/design.md` §7 Risks) removes the shared gateway token from every browser. The items below were deferred on purpose. Rn refers to the design's risk table.

**Anchors.** AS-IS is hub `feat/entitlements-s1-model` dac2ac03, gateway `origin/DEV`, and site `dev` 4edd54f. Each item describes the state after spec 045 ships.

## 1. Site members area has no gateway credential (R8)
- **AS-IS:** after site PR #39, the members gateway connect sends no `auth` and no `device` and is refused (`minion_site/src/lib/services/member-gateway.svelte.ts`, `TODO(handoff)` at `onChallenge`). It was already refused before, because role `member` is not a gateway role.
- **TO-BE:** the members area connects with a hub-issued JWT (per user, org and gateway; role `user`), or the area is retired.
- **DELTA:** the site can run `AUTH_PROVIDER=supabase` (the same GoTrue as the hub), so a site route could call the hub's issuance. That needs a decision on whether the members area is kept at all.

## 2. Hub never sends `hub.token.revoked` (R5)
- **AS-IS:** the gateway's revocation store is filled only by that RPC. After spec 045 A1 it also closes live sockets.
- **TO-BE:** removing a member, or demoting a platform admin, revokes that user's JWTs on every gateway the org uses immediately, not just within 15 minutes.
- **DELTA:** hub member-removal and role-change paths call `hub.token.revoked` server-side. Test: a removed member's socket closes in under 5 seconds.

## 3. Tailscale and trusted-proxy connections get admin (R4)
- **AS-IS:** `resolveJwtAuth` gives `admin` to `tailscale` and `trusted-proxy` auth (`minion/src/gateway/server/ws-jwt-auth.ts:117-145`), and `allowTailscale` is on in `docker/default-config.json`.
- **TO-BE:** network-level identity maps to a role the owner chose, not to admin by default.
- **DELTA:** gateway config `auth.tailscaleRole` (default `admin`, today's behaviour), and set it on prod gateways.

## 4. Read methods have no org filter on shared gateways (R6)
- **AS-IS:** `logs.tail`, sessions and the other read methods return every org's data to any `read` scope on a shared process such as netcup.
- **TO-BE:** reads are filtered by the socket's `orgId`.
- **DELTA:** owned by spec 042 (gateway config in the DB). Cross-reference only.

## 5. Org admins have no gateway-admin power (R2)
- **AS-IS:** every gateway method needing `operator.admin` is platform-admin-only: channel setup and settings (`config.*`), `channels.whatsapp.pair`, `channels.logout`, agent create/update/delete, skill install, cron writes, session reset/delete/compact. The list is pinned by 045 T037 (`PLATFORM_ADMIN_ONLY`).
- **TO-BE:** an org owner or admin sets up their own org's channels.
- **DELTA:** each action becomes a hub server route checked with `requireOrgCapability` that calls the gateway with the server-held credential, limited to the org's own rows. Org roles never get gateway `admin`. Spec 042 S3 covers channel config; WhatsApp pairing and logout are added to 042 as T023a. The rest (agents, skills, cron, sessions) has no spec yet. Each route that ships removes its method from `PLATFORM_ADMIN_ONLY`.

## 6. `/mcp` accepts a legacy-audience JWT without the shared token (found in A1)
- **AS-IS:** the `/mcp` Bearer JWT block (`src/gateway/server.impl.ts`) checks `oidcIssuers` but not `multiTenant.jwtOnlyAudiences`. So any hub JWT with the legacy audience is accepted there without the shared token, on every gateway. This predates 045 and is out of A1, which stays inert. `TODO(handoff)` is at that site.
- **TO-BE:** `/mcp` applies the same rule as the WS connect: JWT-only only for `aud ∈ jwtOnlyAudiences`.
- **DELTA:** RESOLVED in A1 (gw #363, `d1f131a84ca`). The A1 audit rated it HIGH: a legacy-`aud` JWT for org X got `sessions.list` on any gateway. `/mcp` now uses the same `jwtOnlyRefusal` rule as connect and refresh, plus the revocation checks.

## 7. Remove `authToken` from the plugin bridge hello (after A4)
- **AS-IS:** `packages/plugin-ui-bridge` keeps an optional `authToken`. The 7 plugin UIs read `msg.authToken ?? ""` and pass it to `connectRpc()`, which does nothing.
- **TO-BE:** the field is gone.
- **DELTA:** after hub A4 stops sending it, delete it from the bridge and the 7 UIs and republish the package (changeset). `TODO(handoff)` is in `packages/plugin-ui-bridge/src/index.ts`.

## 8. A4 cleanup of the A2 transition paths
- **AS-IS:** `gateway-jwt.service.ts` `LEGACY_JWT_EXPIRY_SECONDS` (3600 s, used when no `gatewayId` is sent). `organization-provision.service.ts` `mintOrgGatewayJwt` binds the audience only under the flag. Both have a `TODO(handoff)`.
- **TO-BE:** one TTL (900 s), and the provisioning audience is always bound.
- **DELTA:** A4 (T054) deletes the legacy branch and the flag condition.

## 9. Admin-only gateway methods behind visible member UI (found in A3)
- **AS-IS:** 045 A3's inventory (`minion_hub` `src/lib/services/gateway/platform-admin-methods.ts`, T037) lists 61 browser-called methods that need `operator.admin`. Only the channel setup controls are hidden for non-platform-admins after the switch. These surfaces still render for members and fail with "your role can't":
  - agent files and skills, tools, flows, prompt sections, secrets, cloud shells (`shells.*`, which sit behind an org capability), workshop experiments, dream, drones, debug.
  - `flows.trigger.register` (session bootstrap) and `reliability.plugins` (plugin health) skip the guard and fail silently.
  - `drones.session-title` means chat auto-titles fail for members.
  - Members on a valid JWT already fail all of these today (R2).
- **TO-BE:** each surface is either hidden for non-platform-admins (owner rule: don't render), or served by a hub route behind `requireOrgCapability`, which takes it off the list.
- **DELTA:** pick per surface, most-used first (chat titles, flows, agent skills). Spec 042 covers channels and gateway settings; the rest needs its own spec. `TODO(handoff)` is at `platform-admin-methods.ts`.
