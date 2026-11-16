# Implementation Plan: Each person's chats are their own

**Spec**: [spec.md](./spec.md) (pass 3) | **Date**: 2026-11-15 | **Repos**: `minion_hub` (PR base `master`), `minion` (PR base `DEV`)

## Summary

Four slices, one draft PR each. The owner approves the spec and merges every PR (`security`). All four must be deployed before spec 045 step T051.

| Slice | Repo | What | Order |
|---|---|---|---|
| S1 | hub | The token's agent list contains the caller's stored personal-assistant id | first; harmless alone |
| S2 | hub | Stored chat-row routes refuse a non-admin for a foreign session; clear message on a gateway `FORBIDDEN` | independent of S1 code, shares its lookup helper, so branch from S1 |
| S3 | gateway | Ownership, request gate, `sessions.list` filter | needs S1 deployed before spec 045 launch |
| S4 | gateway | Delivery filter and event inventory | stacked on S3 |

## Technical context

- **Gateway**: pnpm monorepo, Node 22, vitest. Never run `pnpm test`. Gates: `pnpm vitest run <named files>`, `pnpm vitest run test/ci/`, `pnpm tsgo` (fresh clone: `pnpm baml:generate` first), `pnpm check`. No planned file is hash-pinned by `.github/scripts/agent-fixture-audit.mjs` or line-pinned by `.secrets.baseline`.
- **Hub**: Bun, SvelteKit 2, Svelte 5. Never run the full suite. Gates: prettier on changed files (`--plugin=prettier-plugin-svelte`), named vitest files, `bun run check` (one at a time), `bun run lint:design`, `bun run lint:tokens`, `bun run i18n:compile` when messages change. Route tests follow the mock-db pattern (`resolveSequence` is positional). A new export on a frozen inventory is registered in the same commit.
- Clones: hub `~/.cache/claude-tmp/hub-117` (branch `fix/117-s1-…` from `master` `644aa215`), gateway `~/.cache/claude-tmp/gw-117` (from `DEV` `4d13f613`).

## Constitution check

I spec first: this directory. II anchors and production reads in spec AS-IS. III one slice, one PR. IV the only UI change is one error message (no layout change, no `.figcraft` proposal). V `security`: owner approves and merges.

## Technical Plan

### S1 hub: the token names the assistant

In `issueGatewayJwt` (`src/server/services/gateway-jwt.service.ts:186-192`): after reading `user_agents`, read the caller's stored personal-assistant id and add it to `agentIds` (deduplicated, lower-cased the way the gateway normalises agent ids). Use the existing personal-agent service reader (`src/server/services/personal-agent.service.ts`); do not derive the id from the user id. Only an assistant whose gateway matches the token's tenant/gateway counts.

A missing assistant, or a failing lookup, leaves the list as today and logs; token issuance must not fail because of it.

`hub.assignment.changed`: find the hub sender of the gateway method behind `src/gateway/server-methods/hub-events.ts:58-71`. If the hub sends it, its list gets the same addition through the same helper. If nothing in the hub sends it, say so in the PR and change nothing.

### S2 hub: stored rows per person

One server helper, next to the routes' shared auth code: `assertCanAccessStoredSession(locals, sessionKey | agentId)`. Platform admins pass. A non-admin passes only when the key's agent id (or the given agent id) equals their stored personal-assistant id. Otherwise throw the project's 403 with the permission message (existing forbidden pattern; the message says the role cannot do this).

Apply it to:

- `GET` and `POST` `/api/servers/[id]/sessions/[sessionKey]/messages`
- `GET /api/chat-history?agentId=`
- `GET /api/servers/[id]/sessions`: filter rows to the caller's assistant for a non-admin
- `GET /api/workshop/groupchat/[id]`: read the table first. If rows record their creator, a non-admin may read only their own; if they do not, make it admin-only and record that in the ledger.

Client: where chat RPC errors surface (`src/lib/services/gateway/chat-rpc.ts`), map a gateway `FORBIDDEN` with the session message to one translated string, `en` and `es`, saying this conversation belongs to someone else or the agent is not theirs to chat with. Reuse the existing error surface; no new component.

### S3 gateway: ownership and the request gate

New module `src/gateway/sessions/session-owner.ts`:

```ts
/** JWT-validated role user/org_admin; never admin, service account, shared token or node. */
export function isPersonClient(client): boolean
/** Persons own only sessions of a personal assistant in their token list. Non-persons: true. */
export function canAccessSession(client, rawKey: unknown, cfg): boolean
```

`canAccessSession` returns false for a non-string key, canonicalises with `resolveSessionStoreKey` (`src/gateway/sessions/session-utils.ts:449-481`), parses with `parseAgentSessionKey`, and requires `isPersonalAgentId(agentId)` (`src/agents/personal-agent-id.ts:15-17`) and `normalizeAgentId` membership in `client.assignedAgentIds`.

`isPersonClient`: `client.userRole === "user" || client.userRole === "org_admin"`, with a user id, and not a service account (`userId` starting `svc:`). Check how `ws-jwt-auth.ts` sets `userRole` on each path and make sure a shared-token client can never satisfy it.

Request gate in `authorizeGatewayMethod` (`src/gateway/server-core/server-methods.ts`), placed after the agent-assignment block and before the READ/WRITE early returns and the label-patch return (between `:347` and `:349`), for persons only:

1. `params.sessionKey` present → must pass (any method).
2. Table of other session parameters: `sessions.preview` → every element of `keys`; `sessions.patch` → `key`; any `pi-agent.*` method → `key` when present.
3. Session required: `agent` and `pi-agent.subagents.list` must carry an owned key.
4. Refused outright: `mesh.run`, `mesh.plan.auto`, `pi-agent.spawn`, `pi-agent.orchestrate`.

Failure: `errorShape(ErrorCodes.FORBIDDEN, "access denied to session")`. The key is not echoed.

`sessions.list` (`src/gateway/server-methods/sessions.ts:114`): take `client`; for a person, filter the store to owned keys after it is loaded (`:120`) and before `listSessionsFromStore`, so no foreign transcript is opened.

Inventory test (FR-007): enumerate READ_METHODS and WRITE_METHODS and compare with a checked-in classification (`session-param` / `no-session`); a method missing from the classification fails the test.

### S4 gateway: delivery

In `src/gateway/server-core/server-broadcast.ts`:

- Once per broadcast, before the client loop (`:161`): read the payload's session key (`sessionKey`, or `key` for `pi-agent.*` events) and classify the event name.
- New constant `PERSON_SAFE_EVENTS`: event names that carry no conversation content. Build it from a grep of every `broadcast(`, `broadcastToConnIds(` and dynamic event name (`server.impl.ts:945-949`), reading each payload. `heartbeat` is not on it.
- In `hasUserEventScope`, for a person client, before the `!client.assignedAgentIds` return (`:101`): if the payload has a session key, deliver only when `canAccessSession`; otherwise deliver only when the event is in `PERSON_SAFE_EVENTS`.
- Targeted delivery (`broadcastToConnIds`, `:191-196`) already runs this filter. Events sent to the caller only (`auth.token.refreshed`, `flows.run.event`, `auth.assignment.changed`) go on the safe list after their payloads are read.

Inventory test: collect event names from the source (a static grep in the test, the way the repo's other inventory tests do it) and fail on a name that is neither in `PERSON_SAFE_EVENTS` nor in a checked-in `SESSION_EVENTS` list.

## Alternatives considered

- **`user:<userId>` key shape so staff can chat privately with shared agents.** Dropped from this spec: about 20 hub call sites, a second ownership rule with precedence, and agent memory would still be shared. Production shows one such chat in 30 days. Recorded as a follow-up.
- **Derive the assistant from `personal-<userId>`.** Rejected: two production assistants have legacy ids.
- **Store an owner on the session entry.** Rejected: schema field, cache, and deploy-window rules, for the same guarantee.
- **Pass events without a session key by default.** Rejected after review: `heartbeat` and some `agent` frames carry text with no key.
- **Per-session subscriptions for web clients.** A new protocol method and a hub change on every chat surface; not needed for this guarantee.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| The safe-event list omits an event the hub needs for non-admins | Built from a full inventory with payloads read; SC-003 on a user-token gateway before spec 045 launch; an omission mutes a feature, it does not leak |
| A person's own event carries a non-canonical or missing key and is withheld | Canonicalise as request handling does; `chat.send` runs register the canonical key (`auto-reply/reply/agent-runner-execution.ts:91`); SC-003 |
| An assignment push overwrites the token list without the assistant | S1 covers the hub sender; S3 PR states what it found |
| A method names a session by a parameter the gate does not know | Inventory test over READ and WRITE methods |
| S3/S4 deployed without S1 at spec 045 launch: every person locked out of their own assistant | Launch order in the spec and in each PR body; S1 merges first |
| Hub route change hides rows a non-admin screen depends on | Route tests for admin and non-admin; named in "Consequences" |

## Verification

Per slice: named vitest files and the repo gates. End to end (SC-003, SC-004) needs a gateway with `multiTenant.oidcIssuers`; that is a dev-gateway step recorded as open in the PR bodies and in the tasks. Nothing here is verified on production.

## Detailed Implementation Plan

S1: failing tests D7; lookup + merge in `issueGatewayJwt`; assignment sender check; gates; draft PR `fix(gateway-auth): a member's token names their own assistant`.

S2 (branch from S1): failing route tests D8; helper; four routes; `FORBIDDEN` message in `en` and `es`; gates; draft PR `fix(chat): stored conversations are only readable by their owner`.

S3: failing tests D1–D3, D5 (methods), D6; `session-owner.ts`; gate; `sessions.list`; gates; draft PR `fix(gateway): a person can only open their own conversations`.

S4 (branch from S3): event inventory; failing tests D4, D5 (events), D6; filter; gates; draft PR `fix(gateway): chat is delivered only to its owner`, body naming S3 as its base.
