# Design critique: spec 117, gateway chat events respect agent assignment (Mode: REVIEW)

**Verdict: not ready to implement.** The broadcaster change itself is sound, but it does not deliver invariant I1 while the request path stays open, and its regression risk is aimed at the wrong thing.

Reviewed against gateway `533616ce95a`. The snapshot lacks `src/infra`, `src/agents`, `src/auto-reply` and `src/config`, so anything depending on those is marked unverified.

## Blocker

### B1. The broadcast fix does not make the content private: the request path has no session-key agent check
- **Scope:** spec I1, User Story 1, "Fixing the filter is enough" (`spec.md:66`, `:87`); `gateway/server-core/server-methods.ts:331-345`.
- **Evidence:** the assignment check reads only `params.agentId` / `params.agent` (`server-methods.ts:334-339`). `chat.history`, `chat.send`, `chat.abort` and `chat.inject` take only `sessionKey` (`server-methods/chat/handlers.ts:73`, `:138`, `:202`, `:498`). No chat or sessions handler references `assignedAgentIds`; the only hits under `server-methods/` are impersonate, auth-refresh, prompt-sections, whoami and types.
- **Effect:** a user assigned to A can call `chat.history {sessionKey:"agent:b:main"}` and read the full transcript, or `chat.send` to B. `sessions.list` and `sessions.preview` are read methods too (`server-methods.ts:116-117`). After the fix the same text is still one RPC away.
- **Change:** either add a session-key-derived assignment check in `authorizeGatewayMethod` to this spec, or rewrite I1 and the story as "no passive push" and name the pull path as a known open leak with a linked follow-up. The owner is approving a `security` spec and must not read I1 as isolation.

### B2. The silencing risk is assignment coverage, not key parsing, and SC-003 cannot detect it
- **Scope:** `plan.md:38` risk row, T001, SC-003.
- **Evidence:**
  - Every JWT connection gets an assignment list: `agentIds` is a mandatory array (`auth/auth-jwt.ts:119`), copied at `server/ws-jwt-auth.ts:127`.
  - The hub mints it from `user_agents` rows only (`hub/src/server/services/gateway-jwt.service.ts:187-192`) and mints `user` for everyone except platform admins (`:184`).
  - `agents.list` is filtered by org, not by assignment (`server-methods/agents.ts:305`, `sessions/session-utils.ts:421`), so the hub shows agents the user is not assigned to.
  - `chat.send` to those agents succeeds today (B1) and replies arrive only because of the leak.
- **Effect:** after the fix, such a user gets the `started` ack (`handlers.ts:307`) and then nothing. This hits any user with zero `user_agents` rows, and any agent reachable without a row. Whether personal agents (`personal-<userId>`), the floating assistant's agent, or workshop participants have rows is unverified.
- **Change:**
  - Replace T001 with: enumerate every agent a non-admin hub user can chat with, and prove each is in the minted `agentIds`.
  - Change SC-003 to cover the personal agent, the floating assistant and a user with an empty list, not just "an assigned agent".
  - Decide explicitly whether `chat.send` to an unassigned agent should be rejected (pairs with B1) rather than accepted and muted.

## Major

### M1. T001 inspects the wrong key: the payload carries the gateway-emitted key, which has unparseable forms
Keys the hub sends all parse:

| Hub key | Source | `parseAgentSessionKey` |
|---|---|---|
| `agent:<id>:main` | `hub/src/lib/services/gateway/chat-rpc.ts:34`, `:331`, `:448` | agent `<id>` |
| `agent:<id>:chat:<uuid>` | `chat-rpc.ts:87` | agent `<id>` |
| `agent:<id>:workshop:<conv>` | `hub/src/lib/workshop/gateway-bridge.ts:792` | agent `<id>` |
| `agent:<id>:subagent:…`, `agent:<id>:cron:…`, `agent:<id>:acp:…` | gateway-side | agent `<id>` |

Keys the gateway can emit that return `null` (`sessions/session-key-utils.ts:13-19`):

| Emitted key | Source | Result after fix |
|---|---|---|
| `main` or other bare request key | `resolveSessionKeyForRun` fallback strips the prefix via `toAgentRequestSessionKey` (`server-core/server-session-key.ts:17`, `routing/session-key.ts:38`) | dropped for assigned users |
| `global` | `session.scope` global; `server-methods/agent.ts:428-431` registers it as the chat run key | every assigned user loses all replies |
| `unknown` | `sessions/session-utils.ts:455` | dropped |
| bare `cron:<jobId>`, `subagent:…`, `acp:…` | `server-core/server-cron.ts:171`; `session-key-utils.ts:49`, `:70` | dropped |
| whatever the client sent, verbatim | `handlers.ts:438`, `:463`, `:534`; `chat/abort.ts:135`, `:155`; `chat-abort.ts:60` | dropped if the client sent an alias |
| `sessionKey` undefined on `agent` events | `server-chat.ts:337`, `:342`; seq-gap frame at `:357-367` | dropped |

- The hub treats an unprefixed key as the default agent (`hub/src/lib/services/gateway.svelte.ts:1638-1643`), so such frames are consumed today.
- Unverified: which key the embedded runner registers in the run context for `chat.send` runs. The only `registerAgentRunContext` calls in the snapshot are `agent.ts:435` and the fallback.
- **Change:** T001 must enumerate emitted keys at the six `chat` and three `agent` broadcast sites. For unparseable keys, resolve the agent the way the gateway does (`resolveSessionStoreKey` maps aliases to the default agent, `session-utils.ts:474-480`) or document the drop per shape. State whether `session.scope: global` gateways are supported.

### M2. AS-IS row A4 is false, and `agent` events are the same leak, untested
- **Evidence:** the `agent` payload is `{...evt, sessionKey}` (`server-chat.ts:342`, `:469`). The parsed `resolvedAgentId` (`:375`) goes only into `pi-agent.*` payloads. `agent` frames with `stream:"assistant"` carry reply text (`:478`).
- **Effect:** "Why this exists" understates the leak. The fix does cover it via the session-key fallback, but D1 and SC-001 test only `chat`.
- **Change:** correct A4. Add D1 tests for `agent` via `broadcast`, and for tool events via `broadcastToConnIds` (`:466`), including that the requesting connection still gets its own tool events.

### M3. The impersonation edge case is false and the fix does not make it true
- **Evidence:** `spec.md:39` says an impersonating admin is filtered by the impersonated list. `server-methods/admin-impersonate.ts:61` keeps `userRole`, and `server-broadcast.ts:106` bypasses on `userRole === "admin"`.
- **Change:** delete the edge case, or scope the behaviour change and test it. Separately note that `admin.impersonate.stop` restores a legacy admin's `undefined` list as `[]` (`:54`, `:96`); harmless only while the admin bypass holds.

### M4. "Same normalisation request authorisation uses" is not true
- **Evidence:** `server-methods.ts:273-276` (label patch only) normalises. The general check at `:343` is a raw `includes`. Spec row A5 cites only the first.
- **Effect:** after the fix, `Agent-A` receives events for `agent-a` but a request with `agentId:"agent-a"` is denied.
- **Change:** fix `:343` in the same PR, or state the asymmetry in A5 and Risks.

### M5. FR-001 changes filtering for every event with a `sessionKey`, contradicting "Unchanged", with only `tick` tested
- **Affected:**
  - `pi-agent.*` with `agentId: null` plus a session key (`server-chat.ts:380-454`).
  - `cron` events that carry a `sessionKey` (`server-cron.ts:177`, `:187`).
- **Not fixed:** `exec.approval.requested` nests `agentId` and `sessionKey` under `request` (`server-methods/exec-approval.ts:53-62`, `:78-85`), so commands still reach every approvals-scoped user regardless of agent.
- **Unverified:** `heartbeat` (`server.impl.ts:1339`) and `cron` payload contents; the event types are outside the snapshot. If either carries reply previews, it leaks when the key is absent or unparseable.
- **Change:** add an event inventory table (event, has agent id, has session key, carries content, outcome after fix). Decide whether `pi-agent.*`, `cron`, `heartbeat` and `exec.approval.*` join the fail-closed set, and add a test per row.

### M6. Missing limits (standard: Risks & Limits)
- Isolation is per agent, not per user or session: two users assigned to the same agent still receive each other's `chat:<uuid>` conversations. The hub writes deltas into per-agent state with no session check (`gateway.svelte.ts:1451-1463`), so it does display them. This answers the spec's first "known unknown": the hub does not drop foreign-session events.
- `nodeSendToSession` delivers identical payloads to any node that sent `chat.subscribe` with an arbitrary key, with no assignment or ownership check (`server-core/server-node-events.ts:521-530`, `server-node-subscriptions.ts:108-127`). It is listed out of scope with no stated reason (nodes are paired devices, a different trust class). Say that.

## Minor

- **Bypass covers only `admin`.** `org_admin` is a valid JWT role (`auth-jwt.ts:46`) and would be filtered; with `agentIds: []` it goes from seeing everything to nothing. The hub never mints it (`gateway-jwt.service.ts:21`). State the intent.
- **`normalizeAgentId("")` returns `"main"`** (`routing/session-key.ts:78-80`, `:13`). A blank entry in an assignment list would grant the default agent. Filter empty entries before normalising, and test it.
- **Extraction precedence.** Payload `agentId` / `agent` wins over `sessionKey`. Payloads are server-built, so risk is low; add a test fixing the precedence when they disagree.
- **Normalised list per client per event.** The plan hoists only the event-side parse. Assignment lists are small, so a comment is enough.
- **Verification is manual.** Watching WebSocket frames on dev is the only end-to-end check. Add one handler-level test driving `createAgentEventHandler` into a real broadcaster with two clients, so the emitted key shape is exercised (ties to M1).
- **D3 is under-specified.** "Unparseable session key" should enumerate `main`, `global`, a missing key and `agent:x` (two parts).
- **Anchors.** A1 is off by one (function is `server-broadcast.ts:71-83`). The spec is anchored at `3885695f39e` and I reviewed `533616ce95a`.

## Verified as sound

- **The leak is real.** All seven `chat` sites build `{runId, sessionKey, seq, state, …}` with no agent id, at the cited lines. `extractAgentIdFromPayload` returns undefined and `server-broadcast.ts:113-115` passes it to every client. It affects every JWT-authenticated non-admin socket, including after `auth.refresh` (`auth-refresh.ts:85`) and hub assignment push (`server-startup-users.ts:150`). Token, password, tailscale and trusted-proxy sockets get `undefined` and admin (`ws-jwt-auth.ts:178-185`).
- **Broadcaster placement covers `broadcastToConnIds`**; both go through `broadcastInternal` (`server-broadcast.ts:188-196`).
- **Payload and sequence counter are untouched**; the frame is serialised before filtering (`:139`).
- **`normalizeAgentId` is the right comparator and is importable.** It is exported from `routing/session-key.ts:76` and already imported from `server-core/` (`server-methods.ts:3`, `server-cron.ts:18`). `parseAgentSessionKey` is importable the same way (`server-chat.ts:6`). Both sides must be normalised: parse returns the raw segment, and handlers echo the client's raw key.
- **Existing tests stay green.** Tests 1-4 use an explicit `agentId`; Test 5 uses `tick` and `system`; Test 7 uses `presence` (`server-broadcast.test.ts:50-161`).
- **Alternatives are present** with reasons (`plan.md:27-32`). The subscription-registry alternative is the only one that would close M6.

Not checked: nothing was run, and the unverified items above need the missing source directories. Main risk for the owner: merging as written closes the push leak but leaves the transcript readable by RPC, and may mute replies for users chatting with agents missing from `user_agents`.