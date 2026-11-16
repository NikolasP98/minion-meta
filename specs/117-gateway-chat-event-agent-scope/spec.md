# Feature Specification: Each person's chats are their own

**Feature Branch**: `spec/116-pos-booking-state-hardening` (meta, shared with spec 116); hub code on its own branches (PR base `master`), gateway code on its own branches (PR base `DEV`)

**Created**: 2026-11-12 · **Pass 3**: 2026-11-15 (pass 2 redesign with the 2026-11-15 reviews folded in; see "History")

**Status**: Draft, pass 3, ready to implement; owner approval pending

**Input**: Found during the implicit-state-machine audit the owner requested on 2026-11-11. Owner 2026-11-14, on the isolation model: "right, each person has their own chats, not shared." Owner 2026-11-14: "begin implementation using egm + speckit (opus 5.5 for writing code)".

**Repos**: `minion` (gateway), `minion_hub`. **Tags**: `security`, `permissions`, `test`. The owner approves this spec before code is merged and merges every PR.

## Read this first: it changes nothing in production until spec 045 launches

Production gateways (faces and default, config read 2026-11-15) run `auth.mode: token` with no `multiTenant.oidcIssuers`, and the hub still hands every linked member the shared gateway token. Every hub browser therefore connects as a gateway admin. No gateway rule can separate people while that is true.

Spec 045 (per-gateway user tokens) has its code merged; its launch steps T050–T051 are open owner tasks. This spec builds the isolation those user tokens need. **All four slices must be merged and deployed before spec 045 step T051** (hub flag off). Until then the code here is inert for token-holding browsers.

## Why this exists

Once browsers connect with their own token, the gateway still does not know which person a conversation belongs to. A member could:

- receive the text of every assistant conversation as it is written (`chat` and `agent` events go to every client);
- read any conversation on request (`chat.history`, `sessions.preview`, `sessions.list` with last message);
- write into any conversation (`chat.send`, `chat.abort`);
- read stored chat rows from four hub routes that check only organisation membership.

## The rule

**A person owns the sessions of their own personal assistant, and nothing else.**

- A **person** is a gateway client whose validated token role is `user` or `org_admin`. Gateway admins, service accounts, shared-token clients and node clients are not persons and keep today's behaviour.
- A session is **owned** by a person when its canonical key is `agent:<agentId>:…`, `<agentId>` is a personal-assistant id (`isPersonalAgentId`), and `<agentId>` is in the person's token agent list.
- The hub puts the caller's personal-assistant id in that list. It reads the stored id, because 2 of 14 production assistants have an id that is not `personal-<their user id>`.

Ownership is computed from the key and the token. Nothing is stored on the session, so there is no migration.

A person may read, write and receive only sessions they own. This includes their assistant's channel sessions. Everything else is refused or withheld: other people's assistants, agents shared by the organisation, channel conversations with customers, cron and sub-agent sessions of other agents.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nobody else can read or write my chats (Priority: P1)

**Independent Test**: with a person client for user A, call each session-taking method with a key of user B's assistant; every call is refused and nothing is read or written.

**Acceptance Scenarios**:

1. **Given** person A, **When** A calls a method naming a session A does not own, **Then** it is refused with `FORBIDDEN` before the handler runs.
2. **Given** person A, **When** A names a session A owns, **Then** the method behaves as today.
3. **Given** person A, **When** A calls `sessions.list`, **Then** only A's sessions are returned and no other transcript is read.
4. **Given** person A, **When** A calls `agent` without a session key, or a method that acts on an agent's main session without naming it, **Then** it is refused.
5. **Given** a non-person client, **When** it calls any of these, **Then** it behaves as today.

### User Story 2 - Nobody else receives my chats (Priority: P1)

**Independent Test**: broadcast `chat` (delta, final, error, aborted) and `agent` events for a session of B's assistant to person A, person B and an admin. A receives nothing; B and the admin receive every frame.

**Acceptance Scenarios**:

1. **Given** persons A and B, **When** an event carrying B's session key is sent, **Then** A receives no frame and B receives it.
2. **Given** a person, **When** an event that can carry conversation content has no session key, or a key the person does not own, **Then** the person receives no frame.
3. **Given** a person, **When** an event on the no-content list (tick, presence, health and the like) is sent, **Then** delivery is unchanged.
4. **Given** a targeted delivery (tool events to a run's recipients), **When** a recipient is a person who does not own the session, **Then** that recipient receives nothing.
5. **Given** a new event name that nobody has classified, **When** it is broadcast, **Then** persons do not receive it and a test fails until it is classified.

### User Story 3 - The hub's stored chat rows follow the same rule (Priority: P1)

**Independent Test**: as a non-admin member, request the stored messages of a colleague's session from each hub route; each returns 403.

**Acceptance Scenarios**:

1. **Given** a non-admin member, **When** they read or write stored messages for a session that is not their assistant's, **Then** the hub answers 403 with a message that says their role cannot do this.
2. **Given** a non-admin member, **When** they list stored sessions, **Then** only their assistant's sessions are returned.
3. **Given** a platform admin, **When** they use the same routes, **Then** behaviour is unchanged.

### User Story 4 - My token names my assistant (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a member with a personal assistant, **When** the hub issues a gateway token, **Then** its agent list contains the assistant's stored id, plus any explicit assignments.
2. **Given** a member without an assistant, **When** a token is issued, **Then** the list is unchanged from today.

### Edge Cases

- Keys are canonicalised the way request handling does it and compared in lower case.
- A present but non-string `sessionKey`, `key` or `keys[]` element is refused for a person.
- An admin impersonating a user keeps the admin role, so impersonation is not isolated; unchanged.
- `session.scope: global` collapses every main session into one key; a person would be refused their own assistant. Unsupported with this rule; production uses `per-sender`.
- A person who opens an agent that is not their assistant is refused; the hub shows a clear message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The gateway MUST decide ownership from the canonical session key and the client's token agent list, as defined in "The rule".
- **FR-002**: For a person, any request whose parameters carry `sessionKey` MUST be refused unless the person owns that session, whatever the method.
- **FR-003**: For a person, methods that name sessions by another parameter MUST get the same check: `sessions.preview` (`keys[]`), `sessions.patch` (`key`), and every `pi-agent.*` method that takes `key`.
- **FR-004**: For a person, `agent` MUST carry an owned `sessionKey`; `mesh.run`, `mesh.plan.auto`, `pi-agent.spawn`, `pi-agent.orchestrate` MUST be refused, and `pi-agent.subagents.list` MUST be refused unless it names an owned session.
- **FR-005**: For a person, `sessions.list` MUST return only owned sessions, filtered before any transcript text is read.
- **FR-006**: For a person, an event MUST be delivered only if (a) its payload carries a session key the person owns, or (b) its name is on a reviewed list of events that carry no conversation content. The rule MUST live in the broadcaster and cover targeted delivery.
- **FR-007**: A test MUST fail when an event name is broadcast that is on neither list, and when a READ or WRITE method that takes a session parameter is not covered by FR-002 to FR-004.
- **FR-008**: Non-person clients MUST be unaffected by FR-002 to FR-006. The existing scope guards and agent-assignment check keep running.
- **FR-009**: The hub MUST add the caller's stored personal-assistant id to the token agent list, and to any assignment update it pushes to the gateway.
- **FR-010**: Hub routes that return or accept stored chat rows MUST refuse a non-admin for a session that is not their assistant's, with a 403 whose message names the permission.
- **FR-011**: The hub MUST show a clear message when the gateway refuses a chat request with `FORBIDDEN`.

## AS-IS (gateway `origin/DEV` at `4d13f613`, hub `origin/master` at `644aa215`; static read plus production reads on 2026-11-14/15)

| # | Behaviour today | Anchor |
|---|---|---|
| A1 | A session entry has no owner; `chat.send` records the client app id, never `client.userId`. | gateway `src/config/sessions/types.ts:25-148`; `src/gateway/server-methods/chat/handlers.ts:314`, `:333-336` |
| A2 | `chat.history` takes no client; `chat.send` and `chat.abort` never compare the session with the caller. | `chat/handlers.ts:64`, `:129`, `:193` |
| A3 | Request authorisation looks only at a parameter named `agentId` or `agent`. | `src/gateway/server-core/server-methods.ts:331-346` |
| A4 | `sessions.list` and `sessions.preview` receive no client. | `src/gateway/server-methods/sessions.ts:114`, `:129` |
| A5 | `chat` and `agent` payloads carry `sessionKey` and no agent id, so the broadcast filter passes them to everyone; `agent` frames can lack a session key; `heartbeat` carries a message preview with no key. | `src/gateway/server-core/server-chat.ts:247-306`, `:337-342`, `:469`; `server-broadcast.ts:94-118`; `src/infra/heartbeat-events.ts:5-20` |
| A6 | A user token always carries a user id; its agent list comes only from the hub's `user_agents`, which is empty. | gateway `src/gateway/auth/auth-jwt.ts:105-126`; hub `src/server/services/gateway-jwt.service.ts:186-192`; hub Turso `user_agents` = 0 rows |
| A7 | A new personal assistant's id is `personal-<userId>`; an existing row keeps its stored id. Production: 14 assistants, 12 match the owner's profile id, 2 differ. | hub `src/server/services/personal-agent.service.ts:71-72`, `:103`, `:134`; Supabase `personal_agents` |
| A8 | Four hub routes return or accept stored chat rows for any member of the organisation. | hub `src/routes/api/servers/[id]/sessions/[sessionKey]/messages/+server.ts:10-56`; `src/routes/api/servers/[id]/sessions/+server.ts:6-11`; `src/routes/api/chat-history/+server.ts:6-19`; `src/routes/api/workshop/groupchat/[id]/+server.ts:7-13` |
| A9 | Production gateways validate no user tokens and browsers hold the shared token. | faces and default `minion.json`: `auth.mode: token`, no `multiTenant`; hub `src/routes/api/servers/[id]/token/+server.ts:31` |

**Live use (production session stores, keys only, 2026-11-15):** faces has 57 personal-assistant sessions, 55 updated in the last 30 days. Across both gateways, web chats on non-personal agents updated in 30 days: 1 `main` and 5 workshop sessions. Not measured: who opened those six.

## TO-BE (invariants)

- **I1**: a person never receives a frame carrying a session they do not own, nor a content-bearing frame with no session.
- **I2**: a person can never read, list or write a session they do not own, through the gateway or the hub's stored rows.
- **I3**: a new content-bearing event, or a new session-taking method, cannot ship unclassified (FR-007).
- **Unchanged**: payload shapes, the protocol and `@minion-stack/shared`, every non-person client, node delivery, the broadcast sequence counter.

## DELTA

| # | Transition | Proving test |
|---|---|---|
| D1 | Ownership from key and token list | `session-owner.test.ts`: own assistant, another person's assistant, a non-personal agent in the list, case, bare `main`, `cron:`/`subagent:` keys, non-string key, each client kind |
| D2 | Person's request refused before the handler | `server-methods.test.ts`: `sessionKey` on listed and unlisted methods; `keys[]`, `key`; `agent` without a key; the refused methods of FR-004 |
| D3 | `sessions.list` filtered for a person | handler test with own, foreign and ownerless keys |
| D4 | Events reach only the owner among persons | `server-broadcast.test.ts`: `chat` in four states, `agent`, `pi-agent.*` with `key`, missing key, targeted delivery, `heartbeat` |
| D5 | Inventories | tests that list every broadcast event name and every READ/WRITE session-taking method and fail on an unclassified one |
| D6 | Non-person clients unchanged | same files; existing tests stay green |
| D7 | Token carries the assistant id | `gateway-jwt.service.test.ts`: matching id, legacy id, no assistant, with an explicit assignment |
| D8 | Hub routes refuse a non-admin for a foreign session | route tests for the four routes, admin and non-admin |

## Success Criteria *(mandatory)*

- **SC-001**: In tests, a person receives zero frames and zero transcript bytes for a session they do not own.
- **SC-002**: Existing gateway and hub tests for admin and legacy clients pass unchanged.
- **SC-003**: On a gateway configured for user tokens, two non-admin users chat with their assistants at the same time; each sees only their own frames and is refused the other's `chat.history`. Includes "new chat" and chat history.
- **SC-004**: Spec 045's `scripts/qa/gateway-jwt-probe.ts` matrix still passes.

## Consequences the owner accepts by approving

1. **Staff chat only with their own assistant.** A non-admin can no longer chat with an agent shared by the organisation; they get a clear refusal. Production shows one such chat in 30 days. Per-person chats on shared agents are a follow-up (a hub-wide session-key change at about 20 call sites).
2. **Staff lose the gateway's view of everything that is not theirs**: channel conversations with customers, cron runs, other agents' sessions, heartbeats. The hub's Sessions page and pickers show a non-admin only their assistant's sessions.
3. **Workshop conversations on shared agents are admin-only** on the gateway for the same reason.
4. **Gateway admins still see everything**, including while impersonating.
5. **Nothing changes in production until spec 045 launches** (see the top of this spec).

## Out of scope (each recorded in the ledger)

- Launching spec 045 (owner steps T050–T055).
- Per-person chats on shared agents; filling `user_agents`; the hub's unused `allowedAgentIds`.
- Node and device delivery; a shared-token client taking the `node` role.
- Agent memory, which is per agent, and the `tools.sessions.visibility` setting.
- The other gateway audit findings.

## Assumptions

- A person cannot obtain a token carrying another person's user id or agent list; token minting is otherwise unchanged.
- A personal-assistant id is never assigned to a second person through `user_agents`. The hub does not do this today (the table is empty and has no writer UI).

## History

- Pass 1 (2026-11-12): filter `chat` events by agent assignment. Rejected by the 2026-11-14 critique (`egm/critic_report.md`).
- Pass 2 (2026-11-15): owner from the session key, including a `user:<id>` key shape for shared agents and a hub key helper.
- Pass 3 (2026-11-15): reviews in `egm/pass2_reviews.md`. Changes: production has no user-token clients yet; person defined by token role; assistant id comes from the token list (legacy ids); shared-agent chats and the hub key helper dropped; events allowed by a reviewed list instead of passed by default; hub stored-row routes added; `agent.wait` and `exec.approval.request` dropped from the gate.
