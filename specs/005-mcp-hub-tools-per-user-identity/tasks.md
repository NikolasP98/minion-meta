---

description: "Task list for feature 005 — hub business tools over MCP under the caller's own RBAC"
---

# Tasks: Hub business tools over MCP, under the caller's own RBAC

**Input**: Design documents from `specs/005-mcp-hub-tools-per-user-identity/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED. The spec's DELTA table names a proof for every transition and its six invariants
are stated as tests; Constitution Principle II makes those proofs part of the spec, not an option.

**Organization**: by user story. Two repositories — every task names its repo and its path.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1…US6 from spec.md
- Paths are repo-relative within `minion/` (gateway) or `minion_hub/` (hub)

## Path conventions

- Gateway: `minion/src/gateway/**`, `minion/src/agents/**`
- Hub: `minion_hub/src/routes/**`, `minion_hub/src/server/**`, `minion_hub/src/lib/**`
- Each repo's own gates run in the foreground from its own worktree. Never the full gateway
  `pnpm test` (crashes the box; gate is `pnpm vitest run test/ci/`). Never the full hub
  `bun run test` with a `.env` present (has reached production).

---

## Phase 1: Setup

**Purpose**: the human gates and the worktrees, before any code.

- [ ] T001 Obtain owner approval of `specs/005-mcp-hub-tools-per-user-identity/spec.md` and record it in the spec frontmatter (`status`) — Constitution V requires owner approval of a security-tagged spec BEFORE code. No task below may start first.
- [ ] T002 Get owner answers for the five owner-gated items OG1–OG5 in `specs/005-mcp-hub-tools-per-user-identity/research.md` and replace the three `[NEEDS CLARIFICATION]` markers in `spec.md` with the decisions.
- [ ] T003 Create the top-level board stub `specs/2026-10-15-mcp-hub-tools-per-user-identity-spec.md` with `TEMPLATE.md` frontmatter pointing to this feature directory, then verify it with the spec index script — the Constitution's "Artifact layout and registration" item this run left unmet.
- [ ] T004 [P] Append OG1–OG5, HD1–HD3 and the three permissionless-tool withholdings to `proposals/2026-10-15-agent-harness-restoration.md` (the matching open proposal) — open-items ledger.
- [ ] T005 [P] Create an isolated worktree for `minion_hub` off its registered PR base (`node scripts/repo-policy.mjs show hub`) and run `bunx svelte-kit sync` plus `i18n:compile` in it (a fresh hub worktree needs both before any check passes).
- [ ] T006 [P] Create an isolated worktree for `minion` off its registered PR base (`node scripts/repo-policy.mjs show minion`) and build it once.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: without these the feature's acceptance is unobservable or its filter is decorative.

**⚠️ CRITICAL**: T007–T009 are other slices' work (HD1–HD3 in `research.md`). Do not start Phase 3
before T007, and do not open the US2/US4 PR before T008 and T009.

- [ ] T007 Confirm the production personal-agent↔gateway assignment is restored (proposal slice S0a/S0b) by calling one gateway→hub read tool and getting data rather than `ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED`; if not, stop and escalate — every tool call over MCP returns the same 403.
- [ ] T008 Confirm `minion/src/agents/tool-search/hub-capabilities.ts` fails closed on a 404 from `query/tool-permissions` (today line 44 treats it as `legacyHub` and skips all gating); if not, that fix lands first or the whole identity filter is decorative.
- [ ] T009 Confirm `isModuleEnabled` runs inside `requireAssistantCapability` (`minion_hub/src/routes/api/gateway/_shared/action-auth.ts`); FR-016 depends on it and 0 of 48 gateway endpoints check it today.
- [ ] T010 Write the persona fixtures the acceptance matrix needs — full-capability, view-only, single-module — in the hub's test fixtures, and note that a `qa-login` persona's first org can be empty (use the tenancy owner).

**Checkpoint**: the bridge answers, the capability source denies on failure, and three personas exist.

---

## Phase 3: User Story 1 — Mint a headless MCP credential (Priority: P1) 🎯 MVP

**Goal**: a user creates, uses and revokes a per-user, single-organization, expiring credential, and
`/mcp` resolves it to that user, that organization and that user's personal agent.

**Independent Test**: mint, exchange, `initialize`, ask who the session is, revoke, retry — no tool
export involved.

### Tests for User Story 1

- [ ] T011 [P] [US1] Test in `minion_hub/src/server/services/gateway-jwt.service.test.ts` that a provisioned personal agent appears in the minted token's agent claim — this is the regression that does not exist today (`research.md` R2: the claim is read from `user_agents`, which the live provisioning path never writes).
- [ ] T012 [P] [US1] Tests in `minion_hub/src/server/services/mcp-credential.service.test.ts`: creation refused without active canonical membership; refused when the owner has no active personal agent for that org; `expiresAt` non-null and in the future; secret never retrievable after creation.
- [ ] T013 [P] [US1] Tests for the headless exchange in `minion_hub/src/routes/api/mcp-credentials/` : valid secret → token; revoked → 401; expired → 401; membership removed after creation → 403; unknown secret and wrong secret indistinguishable; failures rate limited.
- [ ] T014 [P] [US1] Test in the gateway MCP suite (`minion/src/gateway/mcp/`) that a revoked `jti` is rejected on the **next** `/mcp` request, not at the next session start — the resolver has no `isRevoked` call today while the WS path does (`research.md` R6).
- [ ] T015 [P] [US1] Test that the resolved MCP identity carries `userId`, `orgId` and the agent id, and that a caller-supplied `agentId` argument never reaches the identity.

### Implementation for User Story 1

- [ ] T016 [US1] Source the gateway JWT's agent claim from `personal_agents` instead of `user_agents` in `minion_hub/src/server/services/gateway-jwt.service.ts` (lines ~158-163), keeping the claim name and token shape unchanged.
- [ ] T017 [P] [US1] Add the MCP credential record to the hub's Postgres core schema per `data-model.md` §1 (owner, org, secret hash, label, created, expires, last used, revoked), with the migration placed where hub migrations live and applied the way hub migrations are applied (production Vercel builds — never `drizzle-kit push`).
- [ ] T018 [US1] Implement `minion_hub/src/server/services/mcp-credential.service.ts`: create (hash the secret, check membership via `hasCanonicalMembership`, check the active personal agent the way `assistant-principal.ts:149-184` does), list own, revoke, verify-for-exchange with all preconditions re-checked at exchange time (contract C1–C3).
- [ ] T019 [US1] Implement the cookie-session routes under `minion_hub/src/routes/api/mcp-credentials/` for create, list and revoke, all `Cache-Control: no-store`, revoking another user's credential returning 404 not 403.
- [ ] T020 [US1] Implement the headless exchange route accepting the credential secret as a bearer credential and returning the existing `{token, expiresAt}` shape — a separate handler from `/api/gateway/jwt`, which stays cookie-only (contract C4).
- [ ] T021 [US1] Emit the gateway's existing `hub.token.revoked` event on revocation, covering every unexpired token minted from that credential, so the next `/mcp` request fails (FR-005).
- [ ] T022 [US1] Record security events for credential creation, revocation and rejected use (FR-009).
- [ ] T023 [US1] Register the new hub routes in the route-contract manifest and update all six counts — two of the six live outside `src/lib/routes/`, so a green targeted vitest is not proof.
- [ ] T024 [US1] Add the token page under `minion_hub/src/routes/(app)/settings/`: create with a label and an org, show the secret once, list with revoke, and the connection instructions FR-029 requires. Invoke the `ui-design-governance` skill first; semantic tokens only; every string through Paraglide `m.*()`; then `bun run lint:design && bun run lint:tokens && bun run i18n:compile`.
- [ ] T025 [US1] Add the revocation check to the gateway's `/mcp` identity resolver in `minion/src/gateway/server.impl.ts` (~1694-1710), using the `jti` `resolveJwtAuth` already returns, and populate the resolved identity's agent id from the claim.
- [ ] T026 [US1] Add the named-user classification to `McpClientIdentity` in `minion/src/gateway/mcp/registry.ts` per `data-model.md` §2 — derived from the presence of both `userId` and `orgId`, not from `authMethod` (`research.md` R5).

**Checkpoint**: a headless client authenticates as a named user, and revocation bites immediately.

---

## Phase 4: User Story 4 — A shared gateway credential can read but never write (Priority: P1)

**Goal**: INV-1. Ordered before US2/US3 deliberately: it is the gate that makes exporting safe, and
it must be in the same change as the export.

**Independent Test**: connect with the shared token; assert the list and a direct write call.

### Tests for User Story 4

- [ ] T027 [P] [US4] Negative test per credential kind (shared token, gateway password, trusted proxy, embedded OAuth) in the gateway MCP suite: `tools/list` contains zero hub business tools.
- [ ] T028 [US4] Exhaustive negative test: a shared-credential caller calling each of the 16 exported write tools **by name** is refused — all 16, not a sample (SC-004).
- [ ] T029 [P] [US4] Test that a caller with no resolvable user and organization is refused on any hub business tool.
- [ ] T030 [P] [US4] Test that a hub **admin** user's credential is NOT treated as a shared-credential caller, even though its scopes map to admin (`research.md` R5) — the regression that a naive scope check would introduce.

### Implementation for User Story 4

- [ ] T031 [US4] Enforce the named-user requirement for every agent-registry-sourced tool at both `tools/list` and `tools/call` in `minion/src/gateway/mcp/protocol.ts`, with the write classification derived from the tool's declared action per `data-model.md` §3.

**Checkpoint**: the hard invariant holds before a single hub tool is exported.

---

## Phase 5: User Story 2 — See only the tools I may use (Priority: P1)

**Goal**: identity-filtered `tools/list` over the 27 permission-declaring hub tools.

**Independent Test**: one credential per persona; compare the list against that persona's
capabilities. No tool call needed.

### Tests for User Story 2

- [ ] T032 [P] [US2] Seeding test: the registry holds one entry per permission-declaring `mcpExport` hub tool (27), each with a valid object `inputSchema`, and seeding **fails loudly** for an `mcpExport` tool with no declared permission rather than silently filtering it.
- [ ] T033 [P] [US2] Persona table test over the three personas asserting exact list membership — not a subset check, equality, or the test will not catch an over-wide list.
- [ ] T034 [P] [US2] Test that `module_action`, `notes_create` and `notes_query` are absent from every persona's list (INV-3).
- [ ] T035 [P] [US2] Symmetry test (INV-2): for each persona, a listed tool does not fail for permission reasons and an unlisted tool does.
- [ ] T036 [P] [US2] Test that a tool whose module is disabled for the credential's organization is absent from the list (FR-016, depends on T009).
- [ ] T037 [P] [US2] Test that the ~19 existing infrastructure tools remain listed for every authenticated caller — the regression surface in `contracts/mcp-surface.md`.

### Implementation for User Story 2

- [ ] T038 [US2] Add `pinnedParams`, `permission` and the derived read/write access to `McpToolEntry` in `minion/src/gateway/mcp/registry.ts`, and a new `source` value for agent-registry tools so `reconcileMcpPluginTools` keeps ignoring them.
- [ ] T039 [US2] Add `minion/src/gateway/mcp/agent-tools-seed.ts`: iterate the generated tool registry, keep entries with `mcpExport` **and** a declared permission **and** allowed by the agent tool policy, and convert each tool's declared TypeBox schema with the registry's existing `typeBoxToJsonSchema()` — no second schema source (FR-010).
- [ ] T040 [US2] Call the new seed beside `seedCoreMcpTools()` and `seedArtifactBuilderTools()` in `minion/src/gateway/server.impl.ts` (~1637).
- [ ] T041 [US2] Give `listMcpTools()` an identity parameter in `minion/src/gateway/mcp/registry.ts` and apply the capability filter in `minion/src/gateway/mcp/protocol.ts` (~94), sourcing capabilities from the existing 60 s hub capability cache keyed by (agent id, org) per `data-model.md` §4.
- [ ] T042 [US2] Add the MCP withhold list to the gateway's `gateway.mcp` config options and consult it in the filter (FR-018).
- [ ] T043 [US2] Add a `TODO(handoff)` at each of the three permissionless tool metas naming the missing permission and pointing at the proposal entry from T004 (FR-030).

**Checkpoint**: each persona sees exactly their own tools; nobody sees a permissionless one.

---

## Phase 6: User Story 3 — Do real work under my own permissions (Priority: P1)

**Goal**: a tool call executes through the existing bridge, attributed to the human, in their org.

**Independent Test**: one credential; one read call and one write call; check hub state and audit.

### Tests for User Story 3

- [ ] T044 [P] [US3] Test that two different MCP tool names dispatch to the same invoke method with different pinned tool ids, and that caller arguments **cannot** override a pinned value (`research.md` R7 — the merge order is a security property).
- [ ] T045 [P] [US3] Test that a tool argument naming a different organization than the credential causes refusal (INV-4).
- [ ] T046 [P] [US3] Test that a permission refusal, a rate-limit refusal, an organization mismatch and a business-state failure are four distinguishable messages (FR-021, `contracts/mcp-surface.md`).
- [ ] T047 [US3] Integration test that a write performed over MCP lands in the hub attributed to the human with the via-agent marker, and that **no** `/api/gateway/**` handler changed (INV-6 / SC-009) — assert the handler set, because this is the invariant that a well-meaning later patch will break.
- [ ] T048 [P] [US3] Test that the invoke method refuses an agent id that is not the one the credential names.

### Implementation for User Story 3

- [ ] T049 [US3] Add the invoke gateway method taking a tool id and an argument object to `minion/src/gateway/server-methods/tools.ts`, resolving the agent id from the resolved MCP identity only, instantiating the registry tool for that agent and invoking it.
- [ ] T050 [US3] Merge each entry's `pinnedParams` **over** the caller's arguments at `tools/call` in `minion/src/gateway/mcp/protocol.ts` (~97-101), and drop any caller-supplied agent id or tool id rather than merging it.
- [ ] T051 [US3] Register the new method name wherever the gateway pins its method list, and apply the same capability test as the list filter so membership and permission cannot disagree (FR-015).
- [ ] T052 [US3] Make each refusal reason distinct and client-readable, mirroring the hub's own 403 wording, and return refusals as tool errors rather than protocol errors.
- [ ] T053 [US3] Add the three permissionless tools' declared permissions **or** leave them withheld — whichever T002's owner answer chose — and update T032/T034 if the answer changed the set.

**Checkpoint**: the feature does real work under the caller's own RBAC, with no new RBAC code.

---

## Phase 7: User Story 5 — A runaway client cannot take the business down (Priority: P2)

**Goal**: per-credential metering and a security signal for refused cross-organization attempts.

**Independent Test**: exceed the budget on one credential; confirm the other is unaffected.

### Tests for User Story 5

- [ ] T054 [P] [US5] Test that N+1 calls in the window refuse the last one with a retryable error naming when to retry, and that the budget is per credential (`jti`), not global.
- [ ] T055 [P] [US5] Test that `initialize`, `ping` and `tools/list` do not consume the call budget.

### Implementation for User Story 5

- [ ] T056 [US5] Add the per-credential call budget keyed on `jti` in the gateway MCP layer per `data-model.md` §5, reusing the existing rate-limiter abstraction, applied to `tools/call` only, with the window and limit operator-configurable.
- [ ] T057 [US5] Surface repeated refused cross-organization and forbidden calls as an operator-visible security signal rather than routine log noise (FR-024) — the audit's R5 warning that those 403s become routine traffic.

**Checkpoint**: one credential cannot exceed its budget, and hostile probing is visible.

---

## Phase 8: User Story 6 — The owner is told the truth about what is served (Priority: P3)

**Goal**: `/capabilities` shows the list `/mcp` actually serves.

**Independent Test**: compare the panel's list against `/mcp`'s list for the same identity.

### Tests for User Story 6

- [ ] T058 [P] [US6] Test that the panel's source is the MCP tool list, not the `mcpExport` flag, and that the two lists agree entry by entry (SC-008) — automatic, not by eye.
- [ ] T059 [P] [US6] Test that a tool on the MCP withhold list shows as not served while remaining available to the in-app assistant (SC-010).

### Implementation for User Story 6

- [ ] T060 [US6] Change `minion_hub/src/lib/components/builder/McpPanel.svelte` to source its list from what `/mcp` serves, replacing `tools.filter(t => t.mcpExport && t.enabled)` at line 21, and correct the component's comment and user-facing copy at lines 2-7, which assert a union that does not exist. Paraglide strings; `lint:design`, `lint:tokens`, `i18n:compile`.
- [ ] T061 [US6] Expose whatever the panel needs to read that list for the viewing identity, without adding a second tool-table source of truth.

**Checkpoint**: the display that hid this gap for five weeks cannot hide it again.

---

## Phase 9: Polish & cross-cutting

- [ ] T062 Give the embedded-OAuth store a durable backing so client registrations and tokens survive a restart (FR-025), keeping the store's existing interface (`minion/src/gateway/mcp/oauth/store.ts`).
- [ ] T063 Add `expiresAt` to the refresh-token record and a way to revoke one before expiry (FR-026) — the type has no expiry field today.
- [ ] T064 [P] Confirm the embedded-OAuth path still yields no hub business capability after T062/T063 (FR-027) and that it remains off by default.
- [ ] T065 [P] Document connecting Claude Code, Codex and Cursor from the token page (FR-029), and record per-client quirks found while testing.
- [ ] T066 Run `specs/005-mcp-hub-tools-per-user-identity/quickstart.md` end to end against a real external client, including the exhaustive shared-token negative sweep.
- [ ] T067 Confirm `/mcp`'s public reachability through the production reverse proxy with an operator (OG2) before the write surface is enabled; if public, FR-023/FR-024 are launch-blocking.
- [ ] T068 Record every open end in `proposals/2026-10-15-agent-harness-restoration.md` with a matching in-code `TODO(handoff)` — the open-items ledger, done twice as the constitution requires.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 Setup**: T001 (owner approval) blocks everything. T002 blocks T053 and the three markers.
- **Phase 2 Foundational**: T007 blocks Phase 3. T008 and T009 block the US2 PR (T036, T041).
- **Phase 3 (US1)** → **Phase 4 (US4)** → **Phase 5 (US2)** → **Phase 6 (US3)**: strictly sequential,
  and this is a **deviation from the template's "user stories can proceed in parallel"**. US2/US3
  filter on a claim US1 mints, and US4 is the gate that makes exporting safe at all.
- **Phase 7 (US5)**, **Phase 8 (US6)**: after Phase 6. Independent of each other.
- **Phase 9**: last; T062/T063 are the lowest-value items in the feature.

### Cross-repository order (the thing a single-repo task list cannot express)

```
hub T016-T024 (slice S5-1 + S5-2, 2 PRs)
        │  the agent claim must be non-empty and the credential must exist
        ▼
gw  T025-T026, T031 (slice S5-3, 1 PR — security-only, worth shipping alone)
        │
        ▼
gw  T038-T043, T049-T052 (slice S5-4, 1 PR — the export; must not land before S5-3)
        │
        ▼
gw+hub T056-T057, T060-T063 (slice S5-5)
```

A gateway that filters on a claim the hub does not yet mint denies every tool to everyone. Landing
S5-4 before S5-3 is the opposite and worse: it exports 16 writes to an admin-resolved caller.

### Within each story

- Tests first, failing, before the implementation in the same story.
- The record before the service before the route before the page.
- Each story complete and its PR merged (owner gate) before the next starts.

### Parallel opportunities

- T004, T005, T006 in Phase 1.
- All of T011–T015 (US1 tests), T027/T029/T030 (US4 tests), T032–T037 (US2 tests), T044–T046/T048
  (US3 tests): different files, no shared state.
- T017 (hub record) in parallel with T025/T026 (gateway identity) once T016 lands.
- Phase 7 and Phase 8 in parallel.

### Parallel example: User Story 1 tests

```
T011 hub gateway-jwt.service.test.ts   — the agent claim
T012 hub mcp-credential.service.test.ts — creation preconditions
T013 hub route tests                    — the headless exchange
T014 gw  mcp suite                      — revocation on the next request
T015 gw  mcp suite                      — identity fields, no caller-supplied agent id
```

## Implementation strategy

**MVP = User Story 1 plus User Story 4.** Story 1 alone delivers a per-user identity on `/mcp` with
nothing exported, which is already worth shipping: it is the credential the rest of the agent harness
will need, and it closes the newly-found gaps (empty agent claim, revocation not checked) on its own.
Story 4 is bundled into the MVP because exporting without it is the exposure the audit named
critical — and because Story 4 costs one enforcement point once Story 1's classification exists.

Then Story 2 (the list) and Story 3 (the call) in that order, because a filter you can see is
cheaper to verify than a call you have to trigger. Story 5, Story 6 and Phase 9 are hardening and
honesty, in that order of value.

## Task counts

| Phase | Story | Tasks |
|---|---|---|
| 1 Setup | — | 6 |
| 2 Foundational | — | 4 |
| 3 | US1 (P1) | 16 (5 tests, 11 impl) |
| 4 | US4 (P1) | 5 (4 tests, 1 impl) |
| 5 | US2 (P1) | 12 (6 tests, 6 impl) |
| 6 | US3 (P1) | 10 (5 tests, 5 impl) |
| 7 | US5 (P2) | 4 (2 tests, 2 impl) |
| 8 | US6 (P3) | 4 (2 tests, 2 impl) |
| 9 Polish | — | 7 |
| **Total** | | **68** (24 test tasks) |
