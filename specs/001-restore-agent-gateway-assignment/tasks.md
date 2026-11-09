---

description: "Task list for Restore Agent Gateway Assignment"
---

# Tasks: Restore Agent Gateway Assignment

**Input**: Design documents from `specs/001-restore-agent-gateway-assignment/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/assignment-tool.md](./contracts/assignment-tool.md), [quickstart.md](./quickstart.md)

**Tests**: Included, and not optional here. Constitution Principle II requires each DELTA transition to name the test that proves it, and the spec's DELTA table does (D1, D2, D2a, D3, D4). Principle V requires negative controls on security-tagged work.

**Organization**: Grouped by user story. Paths are relative to the `minion_hub` checkout (repo-policy `minion_hub`: `packageManager: bun`, `prBase: master`), except T019/T020 which are in `minion-meta`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: `[US1]` = existing agents regain tools; `[US2]` = new agents are born assigned

## ⚠️ Execution order deviates from priority order — read this first

The template's MVP rule is "User Story 1 first". Here **US2's code ships first** (slice S0a), then US1 (slice S0b). Reason: US1's deliverable is a one-time production write. If it lands before provisioning is fixed, every page load keeps minting fresh unassigned agents, the write has to be repeated, and the proof in SC-003 cannot be produced. The priorities in spec.md are still correct — US1 is what the *user* gets — but the delivery order is US2 → US1. The two remain independently testable, which is what the template's rule is actually protecting.

---

## Phase 1: Setup

**Purpose**: an isolated place to work. No scaffolding is needed — this feature adds no dependency, no directory and no configuration.

- [ ] T001 Create an isolated worktree off `origin/master` for slice S0a (Constitution III: never commit to `master`; never reuse another agent's worktree), run `bun install`, and confirm `bun run check` is clean **before** any edit so a pre-existing failure is not attributed to this work
- [ ] T002 Re-read `specs/001-restore-agent-gateway-assignment/spec.md` §AS-IS A15 and A16 against the current `origin/master`. If `gatewayCall`/`resolveCredentialsForUser` or either gateway pick has changed since `7d917ed0`, **stop and revise the spec** — the whole design rests on those two rows

**Checkpoint**: the AS-IS is still true, or the spec has been corrected.

---

## Phase 2: Foundational (blocking prerequisite for both stories)

**Purpose**: one gateway resolution that both the provisioner and the assignment tool use. This is the single shared piece; building it twice is the failure mode research R1/R2 identify.

- [ ] T003 In `src/server/services/gateway.pg.service.ts`, expose the existing organization gateway pick as a **row-returning** helper (gateway id, url, decrypted token) for `(profileId | null, orgId, channel = 'prd')`, built on the existing `channelExpr` and `channelFirst()` — do not write a new ordering, and read `channel` only through `channelExpr` (adding it as a drizzle column 500s every consumer until the migration lands everywhere; see data-model.md)
- [ ] T004 Pick **one** tiebreak and say which in a one-line comment: the two existing picks disagree (`createdAt` ascending at `:592`, `desc(createdAt)` at `:476`). The helper must use the same one the creation call will go through. Do not unify the other two callers — out of scope
- [ ] T005 [P] Unit-test T003's helper in `src/server/services/gateway.pg.service.test.ts` (or the existing sibling test file): production preferred over development; a legacy row with no `channel` treated as production; an organization with no gateway returns nothing; a gateway whose `org_id` is NULL is never returned for any organization; the pick is stable across repeated calls on identical fixtures

**Checkpoint**: one rule, one place, proven deterministic. Both stories can proceed.

---

## Phase 3: User Story 2 — New agents are born assigned (Priority: P2, shipped first) 🎯

**Goal**: an agent created from now on carries the gateway it was created on, so its owner's first assistant turn can use hub tools.

**Independent Test**: provision an agent for a test user against the mock-database harness and assert the stored assignment equals the gateway the creation call was made through, including for an organization whose gateway is **not** the platform default. No production data.

### Tests for User Story 2 (write first; each must fail before its implementation task)

- [ ] T006 [P] [US2] In `src/server/services/personal-agent.service.test.ts`, add the **INV-5** case: an organization whose production gateway is not the platform default ⇒ the created agent's `gateway_id` equals the gateway the creation call used. This is the one test that distinguishes a working fix from one that still returns 403 invisibly (spec A15, D2a) — write it before T010
- [ ] T007 [P] [US2] In the same file, add: organization with a production gateway ⇒ assigned to it (D1); organization with a development gateway only ⇒ unassigned; organization with no gateway of its own ⇒ assigned to the platform default (FR-002b); empty/missing organization input ⇒ named error, no row with a coerced NULL (FR-004, D2); re-provisioning an already-assigned agent ⇒ unchanged (FR-006)
- [ ] T008 [P] [US2] In `src/server/services/personal-agent-provisioner.ensure.test.ts`, add: no gateway resolvable at all ⇒ the agent row exists, is **not** marked ready, records the reason, the call does not throw, and the next invocation retries (FR-005, FR-005a); retry budget exhausted ⇒ stays not-ready with the reason naming the missing assignment (FR-005b)
- [ ] T009 [P] [US2] In the `assistant-principal` test file, add the missing **positive** case: an active agent assigned to the calling gateway resolves to its owner's principal (D4). Confirm the existing negative cases (unassigned, non-active, non-member, cross-organization) still pass untouched — they are the containment contract

### Implementation for User Story 2

- [ ] T010 [US2] In `src/lib/server/gateway-rpc.ts`, let a caller learn **which gateway row** a call was made through, and let it pass an organization: thread `(profileId, orgId)` into the existing `resolveCredentialsForUser` chain and return the gateway id alongside url/token. Change no step of the existing priority chain (lease → per-user → system → env) — it already encodes the channel lesson
- [ ] T011 [US2] In `src/server/services/personal-agent.service.ts`, change `provisionPersonalAgent`'s parameter from `serverId: string` to the provisioning organization, resolve the gateway via T003, store it, and **refuse an empty/missing organization with a named error** instead of the current `params.serverId ? … : null` coercion at `:110` — that expression is the defect
- [ ] T012 [US2] In `src/server/services/personal-agent-provisioner.ts`, resolve the gateway **once** before `gatewayCall('agents.create', …)` at `:127`, make the creation call through that gateway, store that same id (INV-5), and do not call `markActive` when the assignment is missing (FR-005a). Keep the whole path non-throwing and non-blocking — the `(app)` layout calls it fire-and-forget behind `.catch()`
- [ ] T013 [US2] In `src/routes/(app)/+layout.server.ts:203`, pass the organization from the `coreCtx` it already built. One line; no new lookup
- [ ] T014 [P] [US2] Resolve `ensurePersonalAgentOnLogin` in `src/server/services/personal-agent.service.ts:210`: it has the same coercion and **no non-test callers** (spec A6, FR-006a, Q10). Recommended: delete it and its test. Alternative: give it the same resolution. It may not keep the ability to store an unassigned agent
- [ ] T015 [US2] Add the `TODO(handoff)` comments the open-items ledger requires: at the assignment site, that there is no assignment lifecycle (a gateway deletion clears it via `ON DELETE SET NULL` and only the owner-run tool repairs it — spec Q7); and that the multi-organization rule is deferred to Q1
- [ ] T016 [US2] Gates, foreground, in this order: `bun run check`, then `bun run vitest run src/server/services src/server/auth src/lib/server`. **Never `bun run test`** — the full suite with a populated `.env` has taken the hub down by reaching production through `*.sql.integration.test.ts`. Capture the exit code directly; do not pipe the gate into `tail` or `head` (a pipe returns the *last* command's status and has silently green-lit a type error here before)
- [ ] T017 [US2] Open the S0a PR against `master`, title written as the user-facing changelog sentence it will become (`fix(assistant): …`), body naming spec/plan paths, the AS-IS anchors, and that it is **security + data tagged, owner merge required**. Append the two ledger items to `proposals/2026-10-15-agent-harness-restoration.md`

**Checkpoint**: no new unassigned agent can be created. The existing 11 rows are still broken — that is US1.

---

## Phase 4: User Story 1 — Existing agents regain their hub tools (Priority: P1)

**Goal**: the 10 existing active agents are assigned, so the assistant answers from hub data again.

**Independent Test**: dry-run against production, confirm the plan equals the measured table in spec A12 row for row, apply, re-run (no-op), then one real assistant turn that needs hub data returns data.

### Tests for User Story 1 (write first)

- [ ] T018 [P] [US1] Create `scripts/backfill-personal-agent-gateway.test.ts` against the mock-database harness (it must open **no** connection): the planner produces the assign/skip plan of [contracts/assignment-tool.md](./contracts/assignment-tool.md) for a fixture of agents, organizations and gateways; an agent whose owner has no membership is skipped **with a reason**; an already-assigned agent is never in the plan (G3); the invariant assertions **fail non-zero** on a doctored fixture where an agent is assigned to a gateway of an organization its owner is not in (INV-1) and where a non-`gateway_id` field differs (INV-2)

### Implementation for User Story 1

- [ ] T019 [US1] Create `scripts/backfill-personal-agent-gateway.ts` per the contract: dry run by default, `--apply` to write, unknown flags exit non-zero, **the database host printed as the first line of output**, one transaction, plan computed with T003's helper (not its own rule), update predicate `gateway_id IS NULL AND <owner is a current member of the target gateway's organization>`, `updated_at` touched and nothing else (G2, G4, FR-012). Shape it after `scripts/faces-catalog-cleanup.ts`, not after `scripts/backfill-personal-agent-displaynames.ts` (which writes immediately with no dry run)
- [ ] T020 [US1] In the same script: after applying, **re-read** and assert INV-1 and INV-2 as conditions over the data and abort non-zero on either (FR-011 — a row count is explicitly not proof, because 10 wrong writes also count 10); print `before`/`after` assigned/unassigned/active counts; print the `undo` statement listing exactly the ids written (research R4); wrap so a failure rolls back and says so (FR-009); make a second `--apply` print `nothing to do` and write nothing (FR-010); report `active agents with no assignment: N` in both modes (FR-013a)
- [ ] T021 [US1] Gates as T016 (`bun run check`, then `bun run vitest run scripts/backfill-personal-agent-gateway.test.ts`), foreground, exit code captured directly
- [ ] T022 [US1] Run the tool against a local or scratch database and verify the no-write guarantee by running it twice and diffing the output (G1, G6)
- [ ] T023 [US1] Open the S0b PR against `master`. Body: the contract, the dry-run output from T022, and an explicit statement that **the production run has not happened and is the owner's**

**Checkpoint**: merged, but production is unchanged. Everything below is the owner's.

---

## Phase 5: Owner-only — the production write and the real proof

These are not implementer tasks. Constitution Principle V: production data mutation is owner-run, and the owner merges.

- [ ] T024 **[OWNER]** Approve `spec.md` — including the Q8 behavior change (a user whose organization has no gateway now sees "no personal agent provisioned" instead of a ready-looking agent that silently fails) and the three ASSUMPTION tags in §Clarifications. **Nothing above may be merged before this**
- [ ] T025 **[OWNER]** Answer Q1 (multi-organization binding: A / B / C, recommendation A). If B, this spec must be revised and re-approved before T017 and T023 merge
- [ ] T026 **[OWNER]** Merge S0a, then S0b
- [ ] T027 **[OWNER]** `bun scripts/backfill-personal-agent-gateway.ts` against production. Confirm the plan matches spec A12 row for row — 10 to `a64274a8…` (`netcup-faces-prd`, org `21e0601b…`), 1 skipped for no membership. **If it does not match, stop**: the AS-IS is stale
- [ ] T028 **[OWNER]** `--apply`, then `--apply` again (run twice, as the constitution requires). Paste both outputs into the S0b PR body (FR-018)
- [ ] T029 **[OWNER]** Ask the assistant something that needs hub data — the shape that failed on 2026-10-13 (`crm_insight`, spec A7). Expect data, not `insight fetch failed: 403`. **This single turn is the acceptance of the feature**; steps T006–T023 can all be green while the bridge is still dead (spec A15)
- [ ] T030 **[OWNER]** Confirm the negative still holds: a tool call for the still-unassigned pending agent is refused with the unchanged refusal code

---

## Phase 6: Polish & registration

- [ ] T031 [P] Create the board stub `specs/2026-10-15-restore-agent-gateway-assignment-spec.md` in **minion-meta** with `specs/TEMPLATE.md` frontmatter and a pointer to this directory. The board's `scripts/spec-index.mjs` reads only top-level `specs/*.md`, so without this the feature is invisible to the board (constitution, Artifact layout)
- [ ] T032 [P] In **minion-meta**, mark the proposal's S0a/S0b rows shipped in `proposals/2026-10-15-agent-harness-restoration.md`, record the Q1 answer, and set this spec's frontmatter `status`/`verdict`
- [ ] T033 Update the spec's AS-IS with the post-apply measured state (10 assigned / 1 unassigned) so the next reader does not re-diagnose a fixed defect — the mistake this feature exists to undo

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)** → no dependencies
- **Phase 2 (Foundational)** → blocks both stories. T003 is the shared resolution; T004 depends on T003; T005 is parallel to T004
- **Phase 3 (US2)** → depends on Phase 2. T006–T009 before T010–T015. T010 before T012. T011 before T012. T013 after T011. T016 after all. T017 after T016
- **Phase 4 (US1)** → depends on Phase 2 for T003, and on Phase 3 **by delivery choice, not by code** (see the deviation note at the top). T018 before T019; T020 extends T019; T021–T023 after
- **Phase 5 (Owner)** → T024 gates everything; T026 after T017 and T023; T027→T028→T029→T030 strictly in order
- **Phase 6** → after Phase 5

### Within each story

- Tests first, failing, then implementation (T006 before T010; T018 before T019)
- The shared resolution (T003) before anything that calls it
- Gates once, at the end of each slice, in the foreground, exit code read directly

### Parallel opportunities

- T005 ‖ T004
- T006 ‖ T007 ‖ T008 ‖ T009 — four different test files/cases, no shared state
- T014 ‖ T010–T013 — different function, no overlap
- T031 ‖ T032 — different meta files
- **US1 and US2 can be implemented in parallel by two people** (different files entirely: `scripts/` vs `src/server/services/`), but they must still be *merged* US2-first and the production write run once, after both

### Parallel example

```bash
# The four US2 test tasks, together:
Task: "T006 INV-5 assignment-equals-creation-target case in src/server/services/personal-agent.service.test.ts"
Task: "T007 channel/no-gateway/empty-org/idempotency cases in src/server/services/personal-agent.service.test.ts"
Task: "T008 not-ready-without-assignment cases in src/server/services/personal-agent-provisioner.ensure.test.ts"
Task: "T009 positive resolver case in the assistant-principal test file"
```

(T006 and T007 touch the same file — hand them to one person or sequence them; everything else is genuinely disjoint.)

---

## Implementation Strategy

**MVP** is both slices together, which is a departure from the template's "US1 only" default and is deliberate: US1 alone is a production write that starts decaying the moment the next user signs in, and US2 alone changes nothing for anyone who already exists. The honest MVP of *this* feature is S0a + S0b, which is still two PRs and ~33 tasks, most of them tests and gates.

**Incremental delivery**: S0a merged → no new broken agents (invisible to users, verifiable in tests). S0b merged → the tool exists, production still untouched. T027–T029 → the user-visible change, in one owner-run step with a real turn as its proof.

**Stop conditions**: T002 if the AS-IS has moved; T024 if the owner has not approved; T027 if the production plan does not match the measured table.

---

## Notes

- 33 tasks: 7 test tasks, 12 implementation, 3 gate/PR, 7 owner-only, 3 registration, 1 setup.
- No task adds a dependency, a schema change, a route, an endpoint, a flag or a user-facing string. If one appears to need any of those, the plan is wrong — stop rather than widen.
- The resolver (`src/server/auth/assistant-principal.ts`) is read and tested, **never edited**. There is no task that touches it, deliberately.
