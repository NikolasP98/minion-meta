---
id: 2026-10-03-readiness-agent-event-audience-spec
title: Bind every session event stream to its authoritative tenant audience
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion]
tags: [security, permissions, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Session event audience

## 0. Product

A tenant must receive only its own authorized session streams. This closes GW-023 and qualifies the parallel event path missed by GW-001.

**Out of scope:** Wire protocol redesign, new client capabilities, node subscription policy changes and production release.

## AS-IS

Parent blast-radius test `gateway/src/gateway/server-core/server-chat.tenant-events.test.ts` connects the actual agent event handler to the actual broadcaster. Two JWT users in different organizations share an assigned agent ID. A legitimate audience resolver identifies organization A. An assistant event produces a correctly scoped `chat` frame but sends both `agent` assistant text and `pi-agent.run-start` metadata to organization B. Captured failing output: `gw023-agent-event-baseline.log`. The candidate source remains unchanged from committed security slice 98767f4de for these files. `AgentEventPayload` carries run/session fields, with no top-level agent ID. This is GW-023, P0; GW-001's chat-only fix is insufficient to establish content isolation.

## TO-BE

1. The existing server-only `GatewayBroadcastOpts.audience` is mandatory for non-platform JWT delivery of `chat`, `agent`, `pi-agent.run-start`, `pi-agent.run-end`, `pi-agent.tool-call`, `pi-agent.subagent-spawned` and `pi-agent.subagent-completed`. Missing/empty/unresolved audience drops the event for tenant clients. Organization equality and assigned-agent membership are both required. An apparent agent/org field in a payload cannot supply authority.
2. The handler obtains audience from its trusted chat-run registry or run-context session resolver through `resolveSessionAudience`. Resolve once per event for the raw/observability publications, then pass it to every relevant broadcast including sequence-gap diagnostics and targeted tool recipients. A connection-ID target is a further restriction, never an authorization bypass. Unknown session ownership cannot fall back to global publication for tenant clients.
3. Keep the existing explicit platform-admin and authenticated legacy single-tenant compatibility behavior. Do not change wire event names/shapes or shared package protocol types. Public tick/health/presence and template-catalog events retain their existing contracts. Node/channel session fanout remains under its current admin-owned subscription policy; parent review checks that the change cannot expand it.
4. Preserve dropIfSlow and targeted delivery behavior. Diagnostics contain only fixed event identity and sanitized error category, never payload text, user IDs or organization IDs. The missing-audience warning must describe restricted tenant delivery accurately rather than implying all clients were dropped.

## DELTA and verification

- Actual handler→broadcaster tests: assistant text; lifecycle start/end/error; sequence gaps; subagent metadata; tool events with a deliberately foreign connection in the target set. For shared agent IDs across org A/B, A receives the intended publication once and B receives none. Same-org unassigned agents receive none.
- Unknown session/audience yields zero tenant frames; payload-forged org/agent values do not bypass authority. Platform admin/legacy and public system events retain tested compatibility.
- Existing broadcaster and handler tests are updated only where their former assertions encoded missing audience authority. Run neighboring chat/auth tests and full typecheck. A negative control disabling the audience requirement reproduces the failure.
- Trace all producers of the protected names and Hub/Site/Paperclip consumers; no UI or event protocol migration is needed. Paperclip's active OpenClaw gateway adapter consumes raw `agent` events using authenticated shared-token/device credentials. Prove that exact legacy general and targeted event path preserves payload shape and delivery while a tenant JWT client in the same fixture remains audience-gated. Document any unrelated session-bearing event found by this trace separately rather than assuming closure.

## Review

Root authors/implements after independent Standards and root final Spec passes. Existing user authorization covers all security/data findings. This correction uses synthetic tests only, no production mutation. Human merge and release remain separate.

Parent trace note: `pi-agent.orchestration-progress` is emitted by the separate global event-bus bridge in `server.impl.ts`. Its task metadata audience needs separate classification and does not inherit this slice's completion claim.
