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
- **AS-IS:** channel setup (`config.patch`, `channels.logout`, `web.login.*`) is platform-admin-only.
- **TO-BE:** an org owner or admin sets up their own org's channels.
- **DELTA:** spec 042 moves channel config into the DB, and channel setup becomes a hub server action checked against org RBAC.
