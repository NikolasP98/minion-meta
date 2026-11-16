---
id: 2026-11-12-gateway-chat-event-agent-scope-spec
title: Each person's chats are their own
stage: spec
status: review
verdict: pending
pass: 3
created: 2026-11-12
updated: 2026-11-15
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

A staff member's conversations with their assistant are theirs alone: no other member can
receive, read or write them, through the gateway or the hub's stored rows. Staff chat only
with their own assistant; organisation-shared agents stay admin-only for chat.

## 0.1 Review outcome

Pass 3 (2026-11-15) folds two EGM reviews of the pass-2 redesign
(`117-gateway-chat-event-agent-scope/egm/pass2_reviews.md`). Production gateways do not yet
validate per-user tokens, so nothing here takes effect until spec 045 launches; all four
slices must be deployed before that launch. Owner approval pending.

## 1. AS-IS, TO-BE, DELTA

In [`spec.md`](117-gateway-chat-event-agent-scope/spec.md): AS-IS rows A1–A9 with anchors and
production reads, invariants I1–I3, DELTA rows D1–D8 with their proving tests.

## 2. Slices

S1 hub token names the assistant · S2 hub stored rows per person · S3 gateway request gate ·
S4 gateway delivery filter. One draft PR each; see [`tasks.md`](117-gateway-chat-event-agent-scope/tasks.md).

**Topics:** `security`, `permissions`, `test`

## 3. Out of scope

Launching spec 045; per-person chats on shared agents; filling `user_agents`; node and device
delivery; shared agent memory; the other gateway audit findings.

## 4. Verification

Named vitest files and repo gates per slice. End to end (two non-admin users on a gateway
configured for user tokens) is an open dev-gateway step, recorded in the PR bodies.
