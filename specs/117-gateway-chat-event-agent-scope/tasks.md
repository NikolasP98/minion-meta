# Tasks: Each person's chats are their own

Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md) (pass 3). One draft PR per slice. `[OWNER]` marks a human gate.

## Slice 1 — hub: the token names the assistant (US4; D7; FR-009)

- [x] T101 Failing tests in `gateway-jwt.service.test.ts`: matching id, legacy id, no assistant, explicit assignment, failing lookup
- [x] T102 Add the stored personal-assistant id to `agentIds` in `issueGatewayJwt`
- [x] T103 Find the hub sender of the assignment update; same addition, or state that none exists
- [x] T104 Gates; draft PR against `master`

## Slice 2 — hub: stored rows per person (US3; D8; FR-010, FR-011) — branch from slice 1

- [x] T201 Failing route tests for the four routes, admin and non-admin
- [x] T202 `assertCanAccessStoredSession`; apply to messages (GET, POST), chat-history, sessions list, workshop group chat (creator-scoped or admin-only, per the table)
- [x] T203 `FORBIDDEN` message on chat requests, `en` and `es`
- [x] T204 Gates incl. `i18n:compile`; draft PR against `master`

## Slice 3 — gateway: ownership and the request gate (US1; D1–D3, D5, D6; FR-001 to FR-005, FR-007, FR-008)

- [x] T301 Failing tests: `session-owner.test.ts`; `server-methods.test.ts` gate cases; `sessions.list` handler; method inventory
- [x] T302 `src/gateway/sessions/session-owner.ts`
- [x] T303 Gate in `authorizeGatewayMethod`
- [x] T304 `sessions.list` filter
- [x] T305 Gates; draft PR against `DEV`

## Slice 4 — gateway: delivery (US2; D4–D6; FR-006, FR-007) — stacked on slice 3

- [x] T401 Inventory every broadcast event name with its payload; `PERSON_SAFE_EVENTS` and `SESSION_EVENTS`
- [x] T402 Failing tests in `server-broadcast.test.ts` and the event inventory test
- [x] T403 Per-broadcast classification and the person rule in `hasUserEventScope`
- [x] T404 Gates; draft PR naming slice 3 as its base

## Close-out

- [ ] T501 [OWNER] Approve the spec, including "Consequences the owner accepts"
- [ ] T502 SC-003 and SC-004 on a gateway configured for user tokens; results in the PR bodies
- [ ] T503 [OWNER] Merge slices 1 to 4; only then run spec 045 steps T050–T051
- [x] T504 Ledger (`proposals/2026-11-15-chat-privacy-followups.md`): per-person chats on shared agents; empty `user_agents` and unused `allowedAgentIds`; node delivery and the shared-token `node` role; shared agent memory and `tools.sessions.visibility`; workshop group chat if made admin-only

## Pull requests

Hub #678 (slice 1), #679 (slice 2, after #678). Gateway `minion-ai` #380 (slice 3), #381 (slice 4, after #380). All draft.
