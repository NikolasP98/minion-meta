---
id: 2026-11-15-chat-privacy-followups
title: Chat privacy follow-ups after spec 117
status: open
created: 2026-11-15
updated: 2026-11-15
repos: [minion, minion_hub]
tags: [security, permissions]
effort: M
---

# Chat privacy follow-ups after spec 117

Open ends left by spec 117 (`specs/117-gateway-chat-event-agent-scope/`), which makes each
person's assistant conversations their own. PRs: hub #678, #679; gateway `minion-ai` #380, #381.
All of it is inert in production until spec 045 launches (owner steps T050–T055), because
production browsers still connect with the shared gateway token.

## AS-IS

Found while implementing or reviewing; none is fixed.

**Must be decided before spec 045 step T051 (they break a member's feature once members are "persons"):**

1. **WhatsApp pairing events are withheld from persons.** `channels.whatsapp.qr`, `paired` and
   `pairFailed` are broadcast to every client (`minion` `src/gateway/channel-link-runtime.ts:58`,
   `extensions/whatsapp/src/pairing.ts:274-315`), so spec 117 keeps them off the safe list. A
   member could not pair their own WhatsApp from the hub. Today the QR code reaches every socket.
2. **Live `health`, `channels.status`, `cache.invalidate` and shell events are withheld from
   persons.** `health` carries recent session keys, which embed customer phone numbers
   (`src/gateway/server-core/server-maintenance.ts:46`).

**Leaks to a person that spec 117 does not close:**

3. The snapshot sent on connect carries `health` and `presence` to every socket, outside the
   broadcaster.
4. `last-heartbeat` (a READ method) returns the heartbeat's message preview.
5. `pi-agent.orchestrations.get/list`, `cron.list`, `cron.runs`, `memory.snapshot` and `events.*`
   fall back to the default agent when no `agentId` is given, so the agent-assignment check never runs.
6. `send` with an owned session key can still deliver to any recipient through any channel account.
7. `presence` shows other clients' host and IP to persons.
8. Node and device delivery (`nodeSendToSession`, node `chat.subscribe`) is not filtered, and a
   shared-token client can take the `node` role without a paired device
   (`src/gateway/server/ws-connection/message-handler.ts:564`).
9. Agent memory is per agent, and `tools.sessions.visibility` set to `agent` or `all` lets an
   agent read sibling sessions.

**Hub:**

10. `POST /api/workshop/groupchat/[id]/advance` is not creator-scoped (returns no text).
11. Session task routes (`/api/servers/[id]/sessions/[sessionKey]/tasks`) are not scoped per person.
12. `GET /api/servers/[id]/sessions` filters on the row's `agentId`; opening a row checks the key.
    A row where the two disagree lists and then returns 403.
13. `user_agents` is empty and has no assignment UI; `userState.allowedAgentIds` is never filled,
    so a non-admin sees every agent of the organisation in pickers and is refused when they chat.
14. The hub applies `chat` events from any session of an agent when no run is in flight
    (`src/lib/services/gateway.svelte.ts`, `onChatEvent`).

**Product:**

15. Staff cannot chat with an agent shared by the organisation. Private per-person chats on shared
    agents need a `user:<userId>` session-key shape, about 20 hub call sites, and a second
    ownership rule on the gateway.
16. A non-admin's earlier chats on shared agents under the old keys are admin-only.

## TO-BE

- 1: the QR and pairing result go only to the socket that asked for them.
- 2: each event is either split into a person-safe payload or stays admin-only by decision.
- 3 to 9: each closed or accepted in writing, before spec 045 step T051 for 3 to 6.
- 10 to 14: scoped, or accepted.
- 15, 16: an owner decision.

## DELTA

Each item is a slice of its own; 1 and 3 to 6 belong in the spec 045 launch checklist.
Proving tests follow spec 117's pattern (`server-broadcast.inventory.test.ts`, the method
classification in `server-methods.test.ts`, hub route tests).

## Out of scope

Launching spec 045 itself.

## Verification

Per item, on a gateway configured for user tokens: two non-admin users, each sees only their own
data in the WebSocket frames and in the method results named above.
