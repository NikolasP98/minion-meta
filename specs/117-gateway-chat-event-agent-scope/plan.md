# Implementation Plan: Gateway chat events respect agent assignment

**Spec**: [spec.md](./spec.md) | **Date**: 2026-11-12 | **Repo**: `minion`, PR base `DEV`

## Summary

One change in the broadcaster's filter and its test file. One draft PR. Owner merges (`security`).

## Technical context

pnpm monorepo, Node 22, vitest. Never run the full suite (`pnpm test` crashes the box); run only `pnpm vitest run src/gateway/server-core/server-broadcast.test.ts` and the gate `pnpm vitest run test/ci/`, plus `pnpm check` and `pnpm tsgo`.

## Constitution check

I spec first: this directory. II anchors at `3885695f39e`, static read stated. III one slice, one PR, own clone under `~/.cache/claude-tmp/gw-117`. IV no UI. V `security`: owner approves the spec and merges.

## Technical Plan

In `src/gateway/server-core/server-broadcast.ts`:

1. `extractAgentIdFromPayload` keeps its two checks, then falls back to `parseAgentSessionKey(payload.sessionKey)?.agentId` (`src/sessions/session-key-utils.ts`) when `sessionKey` is a string.
2. A constant `AGENT_BOUND_EVENTS = new Set(["chat", "agent"])`.
3. `hasUserEventScope`: when no agent id is found, return `!AGENT_BOUND_EVENTS.has(event)`; when one is found, compare `normalizeAgentId(eventAgentId)` against the normalised assignment list, the way `server-methods.ts:273-276` does.

Nothing else changes: the frame is serialised once before filtering, so the payload is not modified.

## Alternatives considered

- **Add `agentId` at the seven call sites.** Rejected: the eighth emitter reopens the leak; it also changes the wire payload.
- **Do both.** Rejected: no reader needs the field.
- **Send `chat` only to connections subscribed to the session.** Better isolation, but it changes delivery for admin dashboards and needs a subscription registry; a separate proposal if wanted.
- **Fail closed for every event.** Rejected: system events have no agent.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A session key a non-admin user chats on does not parse to an agent, so their own replies stop arriving | First task: list the session key shapes the hub sends for non-admin users (`chat.send` handlers, hub `chat-rpc`), add a test per shape; check SC-003 on the dev gateway before leaving draft |
| Normalisation differs from request authorisation | Reuse the same `normalizeAgentId` import |
| Performance: a parse per client per event | Derive the agent id once per broadcast, outside the client loop |

## Verification

Targeted vitest file, `test/ci`, `pnpm check`, `pnpm tsgo`. On the dev gateway: a non-admin user chats with an assigned agent and sees the reply; a second non-admin user assigned elsewhere, watching the WebSocket frames, receives no `chat` frame for it.

## Detailed Implementation Plan

1. Read `parseAgentSessionKey` and `normalizeAgentId`; list session key shapes used for non-admin chat. If a shape does not parse, stop and report instead of shipping.
2. Add failing tests to `src/gateway/server-core/server-broadcast.test.ts` for D1–D4 (all four chat states for D1).
3. Implement the three steps above, computing the event's agent id once in `broadcastInternal` and passing it to the filter.
4. Gates, then a draft PR titled `fix(gateway): chat events respect agent assignment`, body naming this spec and the `security` gate.
