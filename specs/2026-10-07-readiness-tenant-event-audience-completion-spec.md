---
id: 2026-10-07-readiness-tenant-event-audience-completion-spec
title: Scope the remaining nine tenant-content WebSocket events to a server-derived audience (GW-027)
stage: dev
status: implementing
pass: 2
verdict: pending
created: 2026-10-07
updated: 2026-10-07
repos: [minion, minion_hub]
tags: [security, permissions, test]
type: fix
proposal: 2026-10-07-hub-readiness-ui-a11y-followups
findings: [GW-027]
relationship: extends
related: [2026-10-03-readiness-agent-event-audience-spec]
pr: 296
---

# Tenant event audience completion (GW-027)

## 0. Product

A tenant must never receive another tenant's content over the gateway WebSocket. The GW-023 fix
(`2026-10-03-readiness-agent-event-audience-spec`, gateway `eddd741c4`) bound the agent and run
event streams to their session audience; the independent review of that fix enumerated every event
that leaves the gateway and found nine more that still carried tenant data to every connection.
This spec closes that remainder (GW-027) under the same contract: **the server derives the
audience; payload fields never authorize a tenant.**

- `related`: `2026-10-03-readiness-agent-event-audience-spec` — this spec extends it with the
  non-agent event families the review surfaced; it changes nothing that spec proved.

Written by the documentation lane from gateway commit `44d2d0d45` and its message; no separate
batch spec file exists for this finding.

## 1. AS-IS (gateway `eddd741c4`, PR #296 before `44d2d0d45`)

All nine events below went through `createGatewayBroadcaster()` (`src/gateway/server-core/server-broadcast.ts`)
with neither an `EVENT_SCOPE_GUARDS` entry nor an `audience`, so every authenticated connection
received them:

| # | Event | Emitter | What leaked to every tenant |
|---|---|---|---|
| 1 | `channels.status` | `server.impl.ts` `onStatusChange` → `buildChannelStatusPayload` (built without an org claim; the builder documents that it sees every account) | every org's account ids, phone e164/jid, expected identity, disconnect errors |
| 2 | `channels.whatsapp.qr` / `.paired` / `.pairFailed` | `src/plugins/channel-link-runtime.ts` `emit()` via `context.broadcast` (gateway-wide) | one tenant's live pairing QR (scannable by another tenant) and paired phone number |
| 3 | `heartbeat` | `server.impl.ts` `onHeartbeatEvent` → `broadcast("heartbeat", evt)` | first 200 characters of the agent's reply (`preview`) and the recipient; events carried no session key |
| 4 | `cron` | `src/gateway/server-core/server-cron.ts` `params.broadcast("cron", evt)` | run `summary` / `error` (agent output) |
| 5 | `reliability` | broadcaster user filter | filtered by agent id only, never by org |
| 6 | `presence` | `server-broadcast.ts` (events without `agentId` bypassed the user filter — `server-broadcast.test.ts` Test 7 asserted that pass-through) | every client's host, ip, device id and scopes |
| 7 | `auth.impersonate.start` / `.stop`, `auth.data.exported` / `.deleted` | admin RPC handlers | other users' identifiers in audit events, although the RPCs themselves are admin-only |
| 8 | `auth.token.refreshed` | `src/gateway/server-methods/auth-refresh.ts` `context.broadcast(...)` | `userId`, `role`, `orgId`, `connId` of the refreshed user, to all connections |
| 9 | `pi-agent.orchestration-progress` | `orchestrationEvents.setGatewayBridge` in `server.impl.ts` (no emitter wired yet; the bus carries no session key) | would be unscoped the moment an emitter is wired (GW-005) |

Also: `hasUserEventScope()` compared `client.assignedAgentIds.includes(audience.agentId)` raw,
while `agentAssigned()` in `security/session-authorization` normalizes ids — a tenant assigned
`"Main"` did not receive `"main"` audience events.

Evidence: `server-broadcast.tenant-events.test.ts` — 9 failed with `server-broadcast.ts` at
`eddd741c4` (per the commit message); the channel-link runtime test with a real broadcaster
showed tenant B receiving tenant A's QR; `auth-refresh.test.ts` asserted a gateway-wide
`broadcast`; `server-broadcast.test.ts` Test 7 asserted the presence pass-through.

## 2. TO-BE

| Event | Audience mechanism | Tenant-visible replacement |
|---|---|---|
| `channels.status` | `EVENT_SCOPE_GUARDS` → `[ADMIN_SCOPE]` | payload-less `channels.status.changed { changedAt }` broadcast to all; clients re-fetch through the org-scoped `channels.status` RPC |
| `channels.whatsapp.qr` / `.paired` / `.pairFailed` | `context.broadcastToConnIds(event, payload, {client.connId})` — targeted to the requesting connection; **no connection known ⇒ nothing emitted (fail closed)** | — |
| `heartbeat` | `audience: resolveSessionAudience(evt.sessionKey)`; event type gains `agentId?`/`sessionKey?`; listed in `AUDIENCE_REQUIRED_EVENTS` ⇒ withheld when no audience resolves | — |
| `cron` | same: `resolveSessionAudience(evt.sessionKey)`; in `AUDIENCE_REQUIRED_EVENTS`; job-level add/update/remove events have no session key and are withheld from tenants (admins still receive them) | — |
| `reliability`, `presence`, `auth.impersonate.*`, `auth.data.*` | `EVENT_SCOPE_GUARDS` → `[ADMIN_SCOPE]`, matching their already admin-only RPCs | — |
| `auth.token.refreshed` | `broadcastToConnIds(..., {client.connId})` — the refreshed connection only | — |
| `pi-agent.orchestration-progress` | `EVENT_SCOPE_GUARDS` → `[ADMIN_SCOPE]` as a guard until an emitter exists; `TODO(handoff): GW-005` at the bridge | must move to `AUDIENCE_REQUIRED_EVENTS` with `resolveSessionAudience(sessionKey)` before any emitter is wired |

Invariants:

- Every event that carries tenant content either has a server-derived audience, is admin-scoped,
  or is targeted to a single connection; a missing audience withholds the event (never widens it).
- `assignedAgentIds` membership is normalized on both sides (`isAssignedAgent()` uses
  `normalizeAgentId`), identical to `agentAssigned()`.
- The GW-024 legacy bypass is untouched and no new test depends on it.
- Hub consumer compatibility: the hub must subscribe to `channels.status.changed` and re-fetch —
  done in minion_hub #436 (merged `802a62d0f`, "re-fetch channel status on the payload-less
  changed signal").

## 3. DELTA

| # | Transition | File(s) | Proof (fails with the change reverted) |
|---|---|---|---|
| 1 | `channels.status` admin-scoped + `channels.status.changed` signal emitted beside it (two emit sites) | `server-broadcast.ts`, `server.impl.ts`, `server-reload-handlers.ts` | `tenant-events.test.ts` case 1 |
| 2 | WhatsApp pairing events targeted to `client.connId`; `hasBroadcast` → `hasTargetedBroadcast`; no connId ⇒ no emit | `src/plugins/channel-link-runtime.ts`, `extensions/whatsapp/index.ts` | `channel-link-runtime.test.ts` with a real broadcaster: tenant B sees no QR |
| 3 | `heartbeat` carries `sessionKey`/`agentId`, broadcast with `resolveSessionAudience`, added to `AUDIENCE_REQUIRED_EVENTS` | `src/infra/heartbeat-events.ts`, `src/infra/heartbeat-runner.ts`, `src/web/auto-reply/heartbeat-runner.ts`, `server.impl.ts`, `server-broadcast.ts` | case 3 (unscoped heartbeat withheld) |
| 4 | `cron` broadcast with `resolveSessionAudience(evt.sessionKey)`; `broadcast` param typed `GatewayBroadcastFn`; added to `AUDIENCE_REQUIRED_EVENTS` | `server-cron.ts`, `server-broadcast.ts` | case 4 |
| 5 | `reliability`, `presence`, `auth.impersonate.*`, `auth.data.*` admin-scoped | `server-broadcast.ts` | cases 5, 7, 8; `server-broadcast.test.ts` Test 7 flipped (tenant 0, admin 1) |
| 6 | `isAssignedAgent()` normalization in `hasUserEventScope` (both branches) | `server-broadcast.ts` | case 6 (`Main` ⇒ `main`) |
| 7 | `auth.token.refreshed` via `broadcastToConnIds` to the refreshed connection | `server-methods/auth-refresh.ts` | `auth-refresh.test.ts` asserts a targeted send |
| 8 | `pi-agent.orchestration-progress` admin-guarded + `TODO(handoff): GW-005` at the bridge | `server-broadcast.ts`, `server.impl.ts:751` | case 9; ledger entry in the proposal |

## 4. Verification

- Red (per the commit message, not re-run by the documentation lane): 9 failed in
  `src/gateway/server-core/server-broadcast.tenant-events.test.ts` with `server-broadcast.ts`
  at `eddd741c4`; channel-link runtime test showed tenant B receiving the QR; auth-refresh test
  asserted a gateway-wide broadcast.
- Green (re-run by the documentation lane on 2026-10-07 in the `gw023-wt` checkout at
  `44d2d0d45`): `pnpm vitest run src/gateway/server-core/server-broadcast.tenant-events.test.ts
  src/gateway/server-core/server-broadcast.test.ts src/gateway/server-methods/auth-refresh.test.ts
  src/plugins/channel-link-runtime.test.ts` → 4 files, **30 passed / 0 failed** (13.7 s).
- Never run the full gateway suite as a gate (it crashes the box); the four files above are the
  gate for this change.
- Hub side: minion_hub #436 merged `802a62d0f` — the hub re-fetches on `channels.status.changed`;
  without it a tenant hub would stop seeing channel status updates once the gateway ships this.

## 5. Implementation record

- Gateway commit `44d2d0d45` (`fix(gateway): scope the remaining tenant-content broadcast events`)
  on `fix/readiness-gateway`, draft PR
  [minion-ai #296](https://github.com/NikolasP98/minion-ai/pull/296) — **on hold for GW-024**
  (legacy credential bypass), which must land before #296 merges. 14 files, +444 / −51.
- Tests: 9 new cases (red 9/9 → green 9/9) + channel-link runtime, auth-refresh and presence
  cases; 30/30 across the four files.
- Hub consumer: minion_hub #436, merged `802a62d0f`.
- Evidence: the commit message and the re-run above; no evidence directory was produced for
  this finding.

## 6. Out of scope / open ends

Every open end below is ledgered in `proposals/2026-10-07-hub-readiness-ui-a11y-followups.md`.

- `TODO(handoff): GW-005` at `src/gateway/server.impl.ts:751` — `pi-agent.orchestration-progress`
  stays admin-guarded until the orchestration bus carries a session key; wiring an emitter
  without moving it to `AUDIENCE_REQUIRED_EVENTS` would reintroduce the leak.
- GW-024 (legacy bypass) is untouched here and gates the merge of #296.
- The red counts for the pre-fix state come from the implementer's commit message; the
  documentation lane re-ran only the green state.
- Job-level `cron` events (added/updated/removed) are now withheld from tenants by design (admin
  only) — a product decision inherited from cron mutations being admin-only; whether any tenant
  hub surface listened to them was not verified by the documentation lane (ledgered as U6).
