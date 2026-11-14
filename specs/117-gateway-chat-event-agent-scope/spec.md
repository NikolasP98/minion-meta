# Feature Specification: Gateway chat events respect agent assignment

**Feature Branch**: `spec/116-pos-booking-state-hardening` (meta, shared with spec 116); gateway code on its own branch, PR base `DEV`

**Created**: 2026-11-12

**Status**: Draft, changes requested by review (blocked on the hub token's agent list)

**Input**: Found during the implicit-state-machine audit the owner requested on 2026-11-11; a reviewer note asked for it to be verified "since it is a privacy issue, not a workflow bug". Owner 2026-11-12: "Proceed with spec-kit and egm for the high priority items."

**Repos**: `minion` (gateway). **Tags**: `security`, `permissions`, `test` — owner approves this spec before code is merged and merges the PR.

## Review outcome (EGM design critique, 2026-11-14): NOT ready to implement

The critique (`egm/critic_report.md`) and a production check changed the picture. The fix below must not ship alone.

1. **It would silence the assistant for every non-admin user.** The hub mints the token's agent list from `user_agents` only (`minion_hub` `src/server/services/gateway-jwt.service.ts:186-192`). In production that table has 0 rows (read 2026-11-14; 16 profiles, 14 personal agents). Every non-admin token therefore carries an empty list. Replies reach those users today only because of the leak; a fail-closed filter would drop all of them.
2. **The text stays readable on request.** `chat.history`, `chat.send`, `chat.abort` and `chat.inject` take a session key and are not checked against the assignment list (`src/gateway/server-core/server-methods.ts:331-345` reads only `params.agentId`/`params.agent`). Closing the push leaves the same transcript one request away.
3. **`agent` events leak the same text.** AS-IS row A4 below is wrong: the `agent` payload is `{...evt, sessionKey}` with no agent id (`server-chat.ts:342`, `:469`); only `pi-agent.*` payloads carry the parsed id.
4. **Isolation would be per agent, not per person.** Two users assigned to one agent still receive each other's conversations, and the hub does display them (`minion_hub` `src/lib/services/gateway.svelte.ts:1451-1463`).
5. **Some emitted session keys do not parse to an agent** (`main`, `global`, `unknown`, bare `cron:`/`subagent:` keys), so they would be dropped.

**Required order of work (each its own spec slice, owner-gated):**

- **Step 1, hub:** the token lists the agents the user may really use (their personal agent plus explicit assignments). This is the open item of specs 001/005 (agent-gateway assignment, per-user identity).
- **Step 2, gateway:** request methods that take a session key check it against the list.
- **Step 3, gateway:** the broadcaster change described below, extended to `agent` events and to unparseable keys, with the event inventory the critique asks for.
- **Open product question for the owner:** is per-agent isolation enough, or must a user only see their own conversations with a shared agent? The second needs delivery by session subscription, not by agent.

The sections below are the pass-1 text, kept for the record; rows marked wrong above are superseded.

## Why this exists

A gateway user who is assigned to some agents should only receive events for those agents. Assistant reply text is sent in `chat` events, and those events carry no agent id, so the filter lets them through to every connected client of that gateway. Confirmed by reading gateway `origin/DEV` at `3885695f39e`; not tested against a live gateway.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A user only receives chat for their own agents (Priority: P1)

A staff member connected to the gateway with access to agent A never receives the text of a conversation with agent B, whether streaming, final, error or aborted.

**Why this priority**: it is the whole feature; reply text can contain customer data.

**Independent Test**: broadcast a `chat` event for a session of agent B to two connected clients, one assigned to A and one to B; only the second socket receives a frame.

**Acceptance Scenarios**:

1. **Given** a client assigned to agent A, **When** a `chat` event for a session of agent B is broadcast, **Then** nothing is sent to that client.
2. **Given** the same client, **When** a `chat` event for a session of agent A is broadcast, **Then** it is delivered as today.
3. **Given** an admin or a legacy client with no assignment list, **When** any `chat` event is broadcast, **Then** it is delivered as today.
4. **Given** a client with an assignment list, **When** a `chat` or `agent` event arrives whose agent cannot be determined, **Then** it is not delivered to that client.

### Edge Cases

- A client whose assignment list is empty receives no `chat` or `agent` events.
- Agent ids that differ only by case or formatting match the same way request authorisation matches them.
- Events that are not about an agent (tick, presence, health) still reach everyone.
- A user impersonated by an admin is filtered by the impersonated assignment list.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: For every broadcast event, the gateway MUST determine the agent from the payload's agent id or, when absent, from the payload's session key.
- **FR-002**: A client with an assignment list MUST receive an agent-bound event only if its agent is in the list, compared with the same normalisation request authorisation uses.
- **FR-003**: For `chat` and `agent` events, a client with an assignment list MUST NOT receive the event when no agent can be determined.
- **FR-004**: Admin clients and clients without an assignment list MUST be unaffected.
- **FR-005**: Events with no agent and not named in FR-003 MUST keep reaching every client that passes the existing scope guards.
- **FR-006**: The rule MUST live in the broadcaster so every current and future emitter is covered without changes at the call sites.

## AS-IS (gateway `origin/DEV` `3885695f39e`, static read)

| # | Behaviour today | Anchor |
|---|---|---|
| A1 | `extractAgentIdFromPayload` reads only `payload.agentId` or `payload.agent`. | `src/gateway/server-core/server-broadcast.ts:70-82` |
| A2 | `hasUserEventScope` returns true for any event with no agent id, and compares with a raw `includes`. | `server-broadcast.ts:94-118` |
| A3 | `chat` payloads carry `runId`, `sessionKey`, `seq`, `state`, `message` and no agent id, at seven call sites. | `src/gateway/server-core/server-chat.ts:260`, `:293`, `:305`; `src/gateway/chat-abort.ts:73`; `src/gateway/server-methods/chat/abort.ts:140`, `:159`; `src/gateway/server-methods/chat/handlers.ts:539` |
| A4 | `agent` events do carry an agent id parsed from the session key. | `server-chat.ts:375-469` |
| A5 | Request authorisation compares assignments through `normalizeAgentId`. | `src/gateway/server-core/server-methods.ts:273-276` |

Known unknowns: whether the hub shows foreign `chat` events on screen (it is written to drop events for other sessions); whether one gateway ever serves more than one organisation; whether every session key a non-admin hub user chats on parses to an agent (the first task checks this, because FR-003 would silence a key that does not parse).

## TO-BE (invariants)

- I1: a client with an assignment list never receives a `chat` or `agent` frame for an agent outside the list.
- I2: adding a new `chat` emitter cannot reopen the leak.
- Unchanged: payload shapes, the hub and other clients, `nodeSendToSession`, scope guards, admin and legacy behaviour, the broadcast sequence counter.

## DELTA

| # | Transition | Proving test |
|---|---|---|
| D1 | Agent derived from `sessionKey` when the payload has no agent id | `server-broadcast.test.ts`: chat event for agent B not sent to a client assigned to A; sent to a client assigned to B |
| D2 | Normalised comparison | test: assignment `Agent-A` matches session key agent `agent-a` (per `normalizeAgentId`) |
| D3 | `chat`/`agent` without a determinable agent dropped for assigned clients | test: payload with no agent id and an unparseable session key is not sent to an assigned client, is sent to admin and legacy clients |
| D4 | Non-agent events unchanged | existing tests stay green; one new test for `tick` |

## Success Criteria *(mandatory)*

- **SC-001**: In tests covering all four chat states (delta, final, error, aborted), a client assigned to another agent receives zero frames.
- **SC-002**: Admin and legacy clients receive exactly the frames they receive today (existing tests unchanged).
- **SC-003**: A non-admin hub user can still chat with an assigned agent after the change (checked on the dev gateway before the PR leaves draft).

## Assumptions

- Fixing the filter is enough; the seven call sites are not changed.
- The fix is fail-closed for `chat` and `agent` only; widening it to every event would hide system events from assigned users.
- No protocol or `@minion-stack/shared` change, so the hub, site and paperclip adapter are untouched.

## Out of scope

Every other gateway audit finding (lifecycle `error` treated as terminal, in-flight turn rows, WATI restart loop, Telegram offset, config-reload counter), `nodeSendToSession`, and cross-organisation isolation of gateways.
