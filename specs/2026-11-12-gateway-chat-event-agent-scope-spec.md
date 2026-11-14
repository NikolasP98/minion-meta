---
id: 2026-11-12-gateway-chat-event-agent-scope-spec
title: Gateway chat events respect agent assignment
stage: spec
status: review
verdict: changes_requested
pass: 1
created: 2026-11-12
updated: 2026-11-14
repos: [minion, minion_hub]
type: fix
tags: [security, permissions, test]
---

# Gateway chat events respect agent assignment

Board stub. The Spec Kit artifacts are the source of truth:
[`specs/117-gateway-chat-event-agent-scope/`](117-gateway-chat-event-agent-scope/spec.md).
No proposal preceded this spec: the finding came out of the audit the owner requested on
2026-11-11 and the owner asked for specs on 2026-11-12. Tagged `security`: owner approves
before merge and merges.

## 0. Product

A staff member connected to a gateway must only receive assistant reply text for the agents
they are assigned to.

## 0.1 Review outcome

EGM design critique 2026-11-14: not ready. Production `user_agents` has 0 rows, so every
non-admin token has an empty agent list and a fail-closed filter would drop all their replies;
the request path (`chat.history`) is also unchecked. Order of work is in the Spec Kit spec.

## 1. AS-IS, TO-BE, DELTA

See `117-gateway-chat-event-agent-scope/spec.md` (anchors at gateway `3885695f39e`; confirmed
by code reading, not tested live).

## 2. Slices

### Slice 1 — the broadcaster derives the agent from the session key and fails closed for chat
**Topics:** `security`, `permissions`, `test`

## 3. Out of scope

Every other gateway audit finding, `nodeSendToSession`, cross-organisation gateway isolation.

## 4. Verification

`pnpm vitest run src/gateway/server-core/server-broadcast.test.ts` and `test/ci/` (never the
full suite), then on the dev gateway: a non-admin user still receives replies from an assigned
agent, and a user assigned elsewhere receives no `chat` frame for that conversation.
