---
id: 045-gateway-per-org-credentials
title: Gateway per-org credentials — no shared operator token in any browser
stage: spec
status: review
verdict: pending
created: 2026-10-29
updated: 2026-10-29
repos: [minion_hub, minion, minion_site, minion-meta]
tags: [security, permissions]
---

# Feature Specification: Gateway per-org credentials

**Feature Branch**: `docs/045-gateway-per-org-credentials` (meta). Slices A0–A4 are in site (`dev`), gateway (`DEV`) and hub (`master`); see plan.md.
**Created**: 2026-10-29
**Status**: Spec, awaiting owner approval. **Security tag**: the owner approves this spec before code (A0 is already up as a draft because it closes a live leak) and merges every PR.
**Input**: Owner rule 2026-10-29, verbatim: "no one should really get access to a "master" key. there should be per-org keys, validated against the db, and if valid, the org can use the ai gw".
**Source of truth**: [design.md](./design.md), final after goldfish review. Review files are in [review/](./review/), with decisions 1–20 in `resolution_decisions.md`. This file says WHAT and WHY; design.md has the HOW and the file anchors.

## AS-IS (summary; evidence in design.md §1)
- **The shared operator token reaches browsers.**
  - The hub `POST /api/servers/[id]/token` returns it to any member linked to the org's gateway. The dashboard needs it to connect, and the plugin bridge receives it.
  - The site members layout serializes `servers.token`.
  - Both the hub and the site expose a route that signs device auth with caller-chosen role and scopes.
  - On its own, the token is gateway admin.
- **A per-org JWT already exists, but only as an extra.** It is checked against DB membership at issue time and lasts 1 hour. Every gateway accepts it, because the audience is the same everywhere. When it fails, the browser falls back to the token alone.
- **Expired JWTs never close a socket.** The hub never refreshes or revokes them. `auth.refresh` can swap the socket's identity.
- **Plugin toggling.** Any member can toggle a plugin for the whole org through a hub route that calls an admin-only gateway method.

## TO-BE invariants
- **I1.** No browser receives a gateway shared token, or a device-auth signature with scopes it chose, for any org or role.
- **I2.** Browsers reach a gateway only with a hub JWT whose audience is that gateway's host. A JWT-only connect is admitted only for audiences the gateway lists, so a JWT for one gateway is refused by every other.
- **I3.** Each issue is checked against the DB. The JWT lasts 15 minutes and is renewed over the socket every 10. A socket whose JWT expired without renewal is closed, so a removed member loses access within 15 minutes.
- **I4.** Only platform admins get gateway admin. Everyone else, org owners and admins included, gets read+write, which is what they get today on a valid JWT. Plugin toggling needs an org owner or admin.
- **I5.** There is no fallback. A refusal says "your role can't". An outage shows "gateway unreachable".
- **I6.** One switch (`PUBLIC_GATEWAY_BROWSER_SHARED_TOKEN`) is the rollback until A4 deletes it, before rotation.
- **I7.** After the bake, every gateway's shared token is rotated.

## User scenarios
- **US1 (P1):** A FACES staff member opens the dashboard. It connects, chat and inbox work, and devtools show no gateway token anywhere.
- **US2 (P1):** A member is removed from the org. Their open dashboard loses its gateway connection within 15 minutes and cannot reconnect.
- **US3 (P1):** A member copies their JWT and points it at another org's gateway. The connection is refused.
- **US4 (P2):** A plain member tries to toggle a plugin. They get a 403 that says their role can't.
- **US5 (P2):** The platform admin still has full gateway admin from the browser and the CLI.

## Success criteria
- **SC-001:** A HAR of a full dashboard session contains no token prefix (launch step 4).
- **SC-002:** A member's socket survives 20 minutes. A removed member's socket closes within 15.
- **SC-003:** The probe shows a wrong-audience JWT-only connect refused on every gateway.
- **SC-004:** All gateways' shared tokens are rotated within a week of A4.

## Out of scope
- Hub-sent revocation.
- Tailscale/trusted-proxy roles.
- Org filters on read methods (spec 042).
- Org-admin channel setup (spec 042).
- Site members JWT.

All of these are in `proposals/2026-10-29-gateway-per-org-credentials-followups.md`.

## Open questions (recommendations in design.md §8)
- **OQ1.** Only platform admins get gateway admin; channel setup stays theirs until spec 042.
- **OQ2.** 15-minute TTL with a 10-minute refresh.
