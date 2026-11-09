---

description: "Task list for agent bridge RBAC parity"
---

# Tasks: Agent bridge RBAC parity

**Input**: Design documents from `specs/003-agent-bridge-rbac-parity/`

**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED — the specification explicitly requires a capability-parity test (FR-012/FR-013) and negative-control tests per module (FR-024), so test tasks are first-class here, not optional.

**Organization**: by user story, in priority order. Each story is one PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US6 from spec.md

## Path conventions

Two repositories, existing layout. Paths prefixed `hub:` are relative to the `minion_hub` checkout, `gw:` to the `minion` (gateway) checkout, and bare paths to `minion-meta` (this repo). Branch bases: hub → `master`, gateway → `DEV` — re-read `repo-policy.yaml` before branching.

**Gate commands (the registered `test` command is unsafe in both repos — see plan.md Constitution Check III):**
`hub: bunx vitest run src/routes/api/gateway src/server/services/rbac src/server/auth` + `bun run check` · `gw: pnpm vitest run test/ci/` + `pnpm check`. Capture the exit code directly; never pipe a gate.

---

## Phase 1: Setup (shared, no code)

**Purpose**: owner gate, board registration, and the one thing that must be true before any branch exists.

- [ ] T001 Obtain owner approval of `specs/003-agent-bridge-rbac-parity/spec.md` and record it in the spec's frontmatter `status`/`verdict` (Constitution V: security-tagged work is approved before code). Blocks every later phase.
- [ ] T002 Resolve the two `[NEEDS CLARIFICATION]` items in `specs/003-agent-bridge-rbac-parity/spec.md` with the owner: (a) does any production tenant have a `create ≠ edit` split or an if-owner CRM role, (b) does any fleet hub predate `query/tool-permissions`. (a) sets the blast radius wording for US4; (b) decides whether T054 deletes the legacy branch or gates it behind a flag.
- [ ] T003 [P] Create the board stub `specs/2026-10-15-agent-bridge-rbac-parity-spec.md` with `specs/TEMPLATE.md` frontmatter and a pointer to this directory, then run `node scripts/spec-index.mjs` — the board reads only top-level `specs/*.md` (Constitution "Artifact layout").
- [ ] T004 [P] Append this feature to `proposals/2026-10-15-agent-harness-restoration.md` slice S2 as the spec that covers it, and correct that proposal's `notify-user` claim per spec AS-IS A17.
- [ ] T005 [P] Confirm the state of hub PR #541 (`fix/gateway-credential-endpoints-org-scope`); if still open, the hub slices branch from a base that includes it or rebase onto it on merge. It touches sibling files under `hub: src/routes/api/gateway/` — do not race it, and do not re-fix its three endpoints (FR-026).

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the map and the measurement baseline every story leans on. No behaviour change.

- [ ] T006 Re-read each of the 17 `hub: src/routes/api/gateway/actions/*/+server.ts` handlers and each human counterpart, and correct any row in `specs/003-agent-bridge-rbac-parity/contracts/actions-human-path-map.md` that does not match the file. The map is a contract, not a memory (research.md R8).
- [ ] T007 Capture the before-baseline: run the hub gate command above and record the file/test counts (audit baseline was 35 files / 409 tests passing) in the first slice's PR body, so a later red is attributable.
- [ ] T008 Enumerate, in a comment block beside the guard in `hub: src/routes/api/gateway/_shared/action-auth.ts`, the bridge endpoints that legitimately need no module or no capability (the capability read, personal notes, `update`/`fleet-update`) with the reason for each — the contract requires silence to be impossible (contracts/shared-guard.md "Obligations").

---

## Phase 3: User Story 1 — a disabled module stops the agent (P1) 🎯 MVP

**Goal**: one shared guard refuses every bridge endpoint for a module disabled in the org, exactly as the human API does.

**Independent test**: disable a module, call one read and one write of it with a fully-capable principal, get the human path's 404; re-enable, get 200.

- [ ] T009 [US1] Add the module-enabled check to `requireAssistantCapability` in `hub: src/routes/api/gateway/_shared/action-auth.ts`: `isModuleEnabled(ctx, module)` from `$server/services/modules.service`, refusing with `error(404, 'module_disabled')` — the human API's status and code (research.md R2). It runs after the capability check so a capability failure keeps its 403 message.
- [ ] T010 [US1] In the same guard, refuse when the module state cannot be determined: let the `isModuleEnabled` failure propagate rather than defaulting to enabled. **An absent toggle row must still mean enabled** (`modules.service.ts:28`, FR-004 vs FR-027).
- [ ] T011 [US1] Emit one structured refusal record per guard refusal in the same file — `{endpoint, module, action, reason}` with reason ∈ `missing_capability | module_disabled | state_indeterminate`, carrying no withheld data (FR-028).
- [ ] T012 [P] [US1] Unit tests in `hub: src/routes/api/gateway/actions/actions.server.test.ts`: module disabled ⇒ 404 `module_disabled` with a capable principal; module enabled ⇒ unchanged; absent toggle row ⇒ served; module lookup throws ⇒ refused.
- [ ] T013 [US1] Negative-control pair for each of the 11 module families the bridge exposes (crm, finance, sales, scheduling, support, projects, stock, pos, comms, brains, tools) — missing capability and module disabled, 22 cases (FR-024, SC-011). Put them in one table-driven test, not 22 copies.
- [ ] T014 [US1] For every endpoint that calls `resolveAssistantPrincipal` directly instead of the guard (`query/custom-tools`, `insight`, `search-crm-conversations`, `crm-conversation-themes`, `notify-user` and any other the grep finds), either route it through the guard or add the T008 justification comment. Grep `hub: src/routes/api/gateway` for `resolveAssistantPrincipal(` to get the full list — this is what makes SC-001 true rather than approximately true.
- [ ] T015 [US1] Run the hub gate commands; open the PR to `master` naming the slice, the registry-gate deviation and the 404 status choice. Owner merges.

**Checkpoint**: a module toggle now governs the agent for all 48 endpoints.

---

## Phase 4: User Story 2 — no un-gated side doors (P1)

**Goal**: five endpoints stop authorizing on "there is a tenant context" or on nothing.

**Independent test**: a zero-capability member's browser session is refused by all five; the server token with the right capability is served.

- [ ] T016 [P] [US2] Move the `tools:view` check above the draft/published branch in `hub: src/routes/api/gateway/query/custom-tools/+server.ts:43-44` so it applies to the default path, and omit `scriptCode`/`envVars` without it (FR-008; human parity: `api/builder/tools/+server.ts:10`).
- [ ] T017 [P] [US2] Require `locals.serverId` in `hub: src/routes/api/agent-memories/recall/+server.ts:16`, refusing a browser session with 401 (FR-009).
- [ ] T018 [P] [US2] Same in `hub: src/routes/api/agent-memories/delete/+server.ts:13`, and bind the `agentId` to the caller's principal so one member cannot delete another's agent memories (FR-010).
- [ ] T019 [P] [US2] Same in `hub: src/routes/api/messages/ingest/+server.ts:14-16`. Note `rbac.service.ts:1095` already exempts this path from the central write guard *because* it is the server-token ingest path — this task is what makes that comment true.
- [ ] T020 [US2] In `hub: src/routes/api/gateway/insight/+server.ts:33`, require `crm:view` **and** `finance:view` for the joined read, and apply `capabilities.fieldLevel('finance')` to the revenue fields the way `query/finance/+server.ts:22` does (FR-011).
- [ ] T021 [P] [US2] Tests: zero-capability principal gets no tool source or env vars; browser session 401s on all three memory/ingest endpoints; server token succeeds; cross-agent `agentId` refused; `crm:view`-only gets no revenue; both-capability role with lowered field level gets revenue masked.
- [ ] T022 [US2] Run gates; PR to `master`; owner merges.

---

## Phase 5: User Story 3 — owner scope and field masking on CRM (P2)

**Goal**: the agent sees and edits only the records, and only the fields, the person does.

**Independent test**: an owner-scoped, low-field-level CRM role reads/edits only its own contacts through the agent and gets masked conversation text.

- [ ] T023 [US3] Return the owner id and the mask decision from the guard in `hub: src/routes/api/gateway/_shared/action-auth.ts` — `capabilities.ownerScoped(module) ? principalId : undefined` and `capabilities.fieldLevel(module) < SENSITIVE_FIELD_LEVEL` — so a handler receives them without asking (research.md R1; the hand-rolled precedents are `query/orders:20` and `query/tickets:30`). Expect the two tests that import `action-auth` to need updating in the same commit.
- [ ] T024 [P] [US3] Apply the owner id in `hub: src/routes/api/gateway/crm-conversation-themes/+server.ts:18-29` by passing it to `conversationThemes()`, which **already accepts an `ownerId` param** and is simply not given one.
- [ ] T025 [P] [US3] Apply the owner id to the CRM search in `hub: src/routes/api/gateway/search-crm-conversations/+server.ts:19-32`.
- [ ] T026 [P] [US3] Apply the owner id in `hub: src/routes/api/gateway/insight/+server.ts` — `rankCustomers` has no owner parameter today, so this adds one (additive, defaulting to no filter so existing callers are unchanged).
- [ ] T027 [US3] Owner pre-check on the two CRM writes: in `hub: src/routes/api/gateway/actions/contact-update/+server.ts:50` and `actions/contact-tag/+server.ts:25`, read the target with the owner filter first and refuse 404 if invisible — the human handler's exact behaviour (`api/crm/contacts/[id]/+server.ts:56-60`, research.md R3). Not a filtered UPDATE: a zero-row update would be reported to the user as success.
- [ ] T028 [US3] Mask PII in the returned `content` of `hub: src/routes/api/gateway/search-crm-conversations/+server.ts:32` when the mask decision is set, by adding an **optional 4th parameter** to `similarConversations` in `hub: src/server/services/crm-conversation-vectors.service.ts:496-534`. The service comment says "signature is load-bearing, do not change" — additive only (FR-007, FR-029).
- [ ] T029 [P] [US3] Tests per endpoint: owner-scoped role sees only own records on all four reads; un-scoped role's results byte-identical to before; edit/tag of a non-owned contact refused with nothing written (assert the row, not just the status); conversation text masked below the sensitive tier and unmasked at or above it.
- [ ] T030 [US3] Run gates; PR to `master`; owner merges.

---

## Phase 6: User Story 4 — the agent can do exactly what the person can (P2)

**Goal**: every `actions/*` capability equals its human counterpart's, pinned by a test over the family.

**Independent test**: the parity test is green, fails when a row is removed and fails when a new `actions/*` directory has no row; the `pos:create`-only cashier rings a sale through the agent.

- [ ] T031 [US4] Write the capability-parity test in `hub: src/routes/api/gateway/actions/actions.server.test.ts`: mirror `contracts/actions-human-path-map.md` as a typed constant, assert each endpoint's required capability equals `apiWriteCapability(humanPath, method)` from `$server/services/rbac.service`, and **fail on an `actions/*` directory with no row** (discover them from the filesystem, FR-013). Write it first — it is red until T032–T037 land, which is the point.
- [ ] T032 [P] [US4] `hub: actions/pos-sale/+server.ts:53` → `pos:create` (the till's capability; `/api/pos/tickets` is in `CREATE_COLLECTION_ENDPOINTS`, `rbac.service.ts:1188-1192`). Fixes the create-only cashier's 403 (FR-014, SC-006).
- [ ] T033 [P] [US4] `hub: actions/booking-create/+server.ts:30` → `scheduling:edit`.
- [ ] T034 [P] [US4] `hub: actions/stock-entry-create/+server.ts:35` and `actions/stock-issue-from-invoice/+server.ts:32` → `stock:edit`; `actions/stock-issue-from-service/+server.ts:36` → `stock:edit` for consistency with its siblings (declared agent-only in the map).
- [ ] T035 [P] [US4] `hub: actions/task-create/+server.ts:23` → `projects:edit`.
- [ ] T036 [P] [US4] `hub: actions/ticket-create/+server.ts:22` → `support:edit`.
- [ ] T037 [US4] `hub: actions/tool-save/+server.ts:51` → require the human's `tools:create`/`tools:edit` **in addition to** `tools:manage`; and reject a caller-supplied `permission` naming a capability the caller does not hold (`:22,58,72-73`), so an agent cannot publish a tool gated on a capability it lacks (FR-015).
- [ ] T038 [P] [US4] Split `hub: actions/contact-tag/+server.ts:25` so tag **removal** requires `crm:delete`, matching the human `DELETE …/tags`.
- [ ] T039 [US4] End-to-end check with a `pos:create`-only role through the agent, and a `create`-only role confirming each of the newly-stricter writes now refuses. Write the narrowing list into the PR body and the release note (FR-025, SC-010).
- [ ] T040 [US4] Run gates; PR to `master`; owner merges. This is the slice that reduces agent ability — the PR body must say so in its first line.

---

## Phase 7: User Story 5 — fail closed, and no credential in user scripts (P3)

**Goal**: the gateway denies when it cannot know, and a user-authored script never holds a hub credential.

**Independent test**: a 404 from the permission endpoint drops permission-carrying tools; a custom-tool run's child environment has no hub credential and its hub calls still work.

- [ ] T041 [US5] Remove the 404 ⇒ `legacyHub` branch in `gw: src/agents/tool-search/hub-capabilities.ts:43-46` so a 404 yields a `null` snapshot like every other failure (FR-016, research.md R5). If T002(b) says a legacy hub exists, instead gate `legacyHub` behind an explicit operator config flag, defaulting off (FR-017) — never infer it from a missing route.
- [ ] T042 [P] [US5] Drop the now-unused `legacyHub` field and its `permissionAllowed` branch (`gw: hub-capabilities.ts:108-112`) if T041 took the deletion path; keep the header comment's "FAILS CLOSED" claim true.
- [ ] T043 [P] [US5] Tests in the gateway's tool-search suite: 404, network error, non-JSON body and 500 each drop every permission-carrying tool and leave native tools untouched — 4 of 4 (SC-007); one log line per TTL window.
- [ ] T044 [US5] Stop injecting `MINION_HUB_TOKEN` in `gw: src/agents/tool-search/custom-tools.ts:226-230` (FR-018).
- [ ] T045 [US5] Give a script a run-scoped way to reach hub endpoints through the gateway's existing authenticated client (`gw: src/agents/tools/hub/hub-common.ts:44-84`), so the credential stays in the gateway process (FR-019, research.md R4). Leave `shortcut: the credential is removed, the sandbox is not; upgrade when run-script.ts gains a container` at the site.
- [ ] T046 [P] [US5] Test that a custom-tool run's child environment contains no hub credential (SC-008) and that a script's hub call still succeeds through the mediated path.
- [ ] T047 [US5] Deprecation note for tool authors: `MINION_HUB_TOKEN` is gone. Update the `tool_builder_save` tool description at `gw: src/agents/tools/hub/tool-builder-save-tool.ts:60`, which currently tells the model scripts can use it.
- [ ] T048 [US5] Run the gateway gates (`pnpm vitest run test/ci/`, `pnpm check` — never the full suite, it crashes the box); PR to `DEV`; owner merges.

---

## Phase 8: User Story 6 — actor stamp and approval workflow (P3)

**Goal**: every agent write is attributable and respects the org's configured workflow.

**Independent test**: each of the six writes records "<person> (via agent)"; a configured blocking workflow stops the agent's status change.

- [ ] T049 [P] [US6] Add the `agentActor(principalId)` stamp (already exported from `hub: src/routes/api/gateway/_shared/action-auth.ts:40-50`) to the six unstamped writes: `actions/booking-cancel:30`, `actions/booking-reschedule:248`, `actions/booking-create`, `actions/booking-complete:93`, `actions/contact-tag:313,319`, `actions/contact-update:419` (FR-020).
- [ ] T050 [P] [US6] Call `statusChangeBlocked(...)` in `hub: actions/order-update-status/+server.ts` and `actions/ticket-update/+server.ts`, mirroring `api/sales/orders/[id]/+server.ts:19` and `api/support/issues/[id]/+server.ts:36` (FR-021).
- [ ] T051 [P] [US6] Tests: each of the six writes records the via-agent actor; a configured blocking workflow refuses the agent's order and ticket status change the way the human handler does.
- [ ] T052 [US6] Run gates; PR to `master`; owner merges.

---

## Phase 9: Polish and cross-cutting

- [ ] T053 [P] Assert in the gateway suite that every endpoint on `module_action`'s 17-entry allowlist (`gw: src/agents/tools/hub/module-action-tool.ts:9-27`) has a hub-side capability gate (FR-022).
- [ ] T054 [P] Correct the "L1 is a security boundary" wording in `specs/2026-07-09-agent-tool-scaling-architecture.md` §2.1 to name the hub as the boundary and the gateway filter as prompt economy (FR-023, research.md R6).
- [ ] T055 [P] Add a `TOOL_REGISTRY ⊆ TOOL_ORDER`-style note to this spec's follow-ups if it has not shipped in slice S0 — two implemented CRM tools are still unreachable, and US3's work on them is pointless until they are instantiated (`gw: src/agents/minion-tools.ts:79`, audit C-D1). Out of scope here; record the dependency so US3's value is not overstated.
- [ ] T056 Write the open-items ledger entries: a `TODO(handoff): <what, why, pointer>` at each site left open (notably anything deferred from T002) **and** an append to `proposals/2026-10-15-agent-harness-restoration.md`. Both, not either (Constitution "Open-items ledger").
- [ ] T057 Re-measure the success criteria against the merged result: endpoints without a module check (SC-001, target 0 or the justified count), capability mismatches (SC-005, target 0), capability-fetch failure modes denying (SC-007, 4/4), credential-free script environment (SC-008), actor stamps (SC-009, 6/6), negative controls (SC-011, ≥22). Record the numbers in the spec's frontmatter or a closing note — Principle II applies to the finish, not only the start.
- [ ] T058 Flip `specs/003-agent-bridge-rbac-parity/spec.md` status to `shipped` and update the board stub from T003.

---

## Dependencies and story order

- **T001 blocks everything** (owner approval, Constitution V). T002 blocks T041's branch choice and US4's wording.
- **Phase 2 (T006–T008) blocks US1 and US4.** T006 in particular: US4's test is meaningless against a wrong map.
- **T009 (the guard) blocks T023**, and therefore US1 → US3 is the only hard story order. T023 is in US3 rather than US1 so US1 stays a one-line change with a wide reach.
- US2, US5, US6 are independent of each other and of US3/US4. US5 is entirely gateway-side and can run concurrently with any hub slice.
- US4's T031 is written before T032–T038 and is expected red until they land.
- All hub slices rebase onto hub #541 when it merges (T005).

Suggested order: **US1 → US2 → US3 → US4 → US5 → US6**, with US5 overlapping whenever a second pair of hands is free.

## Parallel execution examples

- Phase 1: T003, T004, T005 together.
- US2: T016, T017, T018, T019 are four separate files — all four at once, then T020, then T021.
- US3: T024, T025, T026 touch three different endpoints — parallel after T023.
- US4: T032–T038 are seven separate handlers — parallel after T031 exists.
- Cross-repo: all of US5 (gateway) alongside any hub phase.

## Implementation strategy

**MVP = US1 alone.** One check inside one function closes the kill-switch bypass for all 48 endpoints and is the highest coverage-per-line in the feature; it is independently valuable and independently shippable.

Then US2 (five small, unrelated gates), then US3 (the only slice that needs a new shared decision and a service signature change), then US4 (the one that narrows agent ability and therefore needs the clearest release note), then US5 (gateway, parallelisable), then US6 (accountability).

Six PRs, one per story, each from its own worktree against its repo's registered PR base, each merged by the owner.

## Counts

58 tasks — Setup 5, Foundational 3, US1 7, US2 7, US3 8, US4 10, US5 8, US6 4, Polish 6. 25 are marked `[P]`.
