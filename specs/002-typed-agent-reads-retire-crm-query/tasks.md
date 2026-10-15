---
description: "Task list for Typed Agent Reads, Retire crm_query"
---

# Tasks: Typed Agent Reads, Retire crm_query

**Input**: Design documents from `specs/002-typed-agent-reads-retire-crm-query/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/typed-dataset-query.md,
quickstart.md — all present.

**Tests**: Included and REQUIRED, not optional — spec FR-014 explicitly mandates a persona
negative-control test suite, and Constitution Principle IV requires RBAC wiring (module gate, nav
N/A, write-API N/A since this is reads-only, owner scope, field masking) as a spec requirement for
any new API endpoint.

**Organization**: Tasks are grouped by user story (all three are P1 in spec.md; US1 and US2 ship
in the same change per FR-012, US3's test suite is the proof obligation that cuts across both).

**Repos**: Two independent checkouts/PRs — `minion_hub` (bun, PR base `master`) and `minion`
(pnpm, PR base `DEV`). Task descriptions name which repo each path is under.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, or US3

---

## Phase 1: Setup

- [ ] T001 Create an isolated worktree per subproject for this slice, per `AGENTS.md` ("Use
  worktrees for isolation"): one for `minion_hub` off `master`, one for `minion` off `DEV`. No new
  dependency, no new tsconfig/lint config — both repos already have everything this feature needs
  (plan.md Technical Context).

---

## Phase 2: Foundational

**Purpose**: Lock the two design decisions research.md deferred, before any dataset code is written.

**⚠️ CRITICAL**: T002 blocks every US1/US2/US3 task below.

- [ ] T002 Confirm the day-one dataset placement from research.md R3: add a new `mode=categories`
  to the EXISTING `minion_hub/src/routes/api/gateway/query/finance/+server.ts` (extends an
  already owner-scope/field-mask-correct endpoint — R1) rather than a new `query/analytics`
  domain, unless reading `minion_hub/src/server/services/finance.service.ts` during this task
  shows `revenueSeries`/`topProducts` already covers "revenue by product category over a date
  range" (in which case pick the next-closest gap from research.md's alternatives: bookings-per-
  weekday under `query/bookings`). Record the final choice at the top of T010 below before
  starting it.

**Checkpoint**: Dataset placement decided — US1/US2/US3 implementation can begin.

---

## Phase 3: User Story 1 - Agent answers an ad-hoc grouping/date-range question with a working tool (Priority: P1) 🎯 MVP

**Goal**: An agent chat turn asking "revenue by product category last quarter" (or the
research.md-confirmed equivalent) gets a real, data-backed answer instead of a 503.

**Independent Test**: `curl` the new endpoint directly per quickstart.md §2 with a seeded org and
confirm HTTP 200 with non-empty `rows` and correct `truncated` semantics — no agent loop required
to prove this story.

### Tests for User Story 1 ⚠️

- [ ] T003 [P] [US1] Contract test: new dataset mode returns the shape in
  `contracts/typed-dataset-query.md` (200 with `mode`/`rows`/`rowCount`/`truncated`; 400 on
  unknown `mode`) in `minion_hub/src/routes/api/gateway/query/finance/+server.test.ts` (new file
  if one doesn't exist for this route; extend if it does).
- [ ] T004 [P] [US1] Row/byte cap test: seed more rows than the dataset's declared `rowLimit`
  (data-model.md `TypedDataset.rowLimit`) and assert the response's `rowCount` equals `rowLimit`
  exactly, `truncated: true`, and the generated SQL (via query log or an injected spy on the query
  builder) carries the `LIMIT` itself — not a `.slice()` after an unbounded fetch (FR-006) — in
  the same test file as T003.
- [ ] T005 [P] [US1] Deprecation/versioning test: a request for a `mode`/`version` the dataset
  registry marks deprecated returns the structured `{ error: "deprecated", supersededBy }` shape
  from contracts/typed-dataset-query.md, not the old or new data (FR-009) — same test file.

### Implementation for User Story 1

- [ ] T006 [US1] Add the query-building function for the new mode (e.g.
  `revenueByCategory(ctx, period, { limit })`) to
  `minion_hub/src/server/services/finance.service.ts`, as a fixed parameterized query template
  per data-model.md's `TypedDataset.queryTemplate` field — the org/tenant predicate comes from
  `ctx` (resolved from the trusted principal upstream), never from a caller-supplied filter
  (FR-010); the query itself carries a `LIMIT` sized to the dataset's `rowLimit` (FR-006).
- [ ] T007 [US1] Wire the new `mode` branch into
  `minion_hub/src/routes/api/gateway/query/finance/+server.ts`'s existing `GET` handler (same
  `requireAssistantCapability(locals, url, 'finance', 'view')` call already there — do not add a
  second auth call), calling T006's function and shaping the response per
  contracts/typed-dataset-query.md (depends on T006).
- [ ] T008 [US1] Add the new gateway tool mode to `minion/src/agents/tools/hub/finance-query-tool.ts`
  (the existing `finance_query` tool — find its actual path via
  `grep -rn "finance_query" minion/src/agents/tools` if the name differs) so the model can request
  `mode: "categories"`; update its `.meta.ts` description to mention the new mode (depends on T007
  existing so the tool has something real to call).
- [ ] T009 [US1] Run `minion_hub`'s quickstart.md §2 curl against a local dev seed and confirm the
  expected 200/`rows`/`truncated` response by hand once T003-T008 are green (manual verification
  task, not a new automated test).

**Checkpoint**: User Story 1 is independently functional — the new dataset answers its target
question end-to-end via a direct call, even before US2's advertisement work lands.

---

## Phase 4: User Story 2 - The dead tool stops being advertised or recommended (Priority: P1)

**Goal**: `crm_query` is gone from the gateway's tool registry and the hub's envelope prose; the
US1 replacement is named in its place.

**Independent Test**: Inspect `tools/list` output and the envelope text per quickstart.md §1;
confirm `crm_query` is absent from both and the US1 tool is present and named.

**Depends on**: Phase 3 (FR-012 — the retirement and its replacement ship together; T008 must
exist before T012 removes the only general-purpose grouping tool the envelope pointed to).

### Tests for User Story 2 ⚠️

- [ ] T010 [P] [US2] Extend the existing `TOOL_REGISTRY ⊆ TOOL_ORDER` test (added in slice S0c,
  `minion/test/ci/src/agents/tool-search/…`) with a new assertion: `"crm_query"` is NOT a member
  of `TOOL_ORDER` and NOT a member of the tool registry, in the same test file S0c added.
- [ ] T011 [P] [US2] Envelope test: a fixture turn that would have loaded the `data`/`forms`
  envelope block in `minion_hub/src/lib/state/features/assistant-context.ts` asserts the rendered
  string does NOT contain `"crm_query"` and DOES contain the US1 replacement tool's name, in
  `minion_hub/src/lib/state/features/assistant-context.test.ts` (new file if none exists for this
  module).

### Implementation for User Story 2

- [ ] T012 [US2] Delete `minion/src/agents/tools/knowledge/crm-query-tool.ts` and
  `minion/src/agents/tools/knowledge/crm-query-tool.meta.ts`; remove `"crm_query"` from
  `TOOL_ORDER` in `minion/src/agents/minion-tools.ts` (line ~109 per plan.md evidence) and remove
  its `case "crm_query":` branch from the options-building switch (line ~273 per plan.md
  evidence) (FR-001). Depends on T008 (replacement tool must already exist/be in-flight on the
  same branch) per FR-012.
- [ ] T013 [US2] Edit `minion_hub/src/lib/state/features/assistant-context.ts`'s envelope
  paragraph (currently: "crm_insight for top/recent customers, crm_query for any other sorting/
  grouping/date-range/percentage question, crm_search for a specific named person…") to drop
  `crm_query` and name the US1 replacement tool for that same class of question (FR-002).
- [ ] T014 [US2] Grep both repos for any other reference to `crm_query` outside the two sites
  above (tool docs, READMEs, other envelope strings) per quickstart.md §1's two `grep` commands;
  fix or note as out-of-scope (spec Assumptions: scoped to the two named locations) anything found.

**Checkpoint**: User Stories 1 AND 2 both work — the agent can answer the question and is never
told to try the dead tool.

---

## Phase 5: User Story 3 - A low-privilege or wrong-tenant caller cannot see data they are not entitled to (Priority: P1)

**Goal**: Every published typed dataset (today: the one from US1) refuses the four disallowed
personas from data-model.md's `PersonaNegativeControl` fixture, with zero data leakage.

**Independent Test**: Run the persona negative-control suite per quickstart.md §3 against the
US1 dataset; all three disallowed personas refused, the fourth (full-access) allowed.

**Depends on**: Phase 3 (needs a real dataset to test against).

### Tests for User Story 3 ⚠️

- [ ] T015 [P] [US3] Build the reusable `PersonaNegativeControl` fixture (data-model.md: `full-
  access`, `under-capability`, `module-disabled-org`, `cross-org`) as a shared test helper in
  `minion_hub/src/routes/api/gateway/_shared/` (new file, e.g. `assistant-persona-fixtures.test-
  helpers.ts`) so it can be imported by this dataset's test and by any future dataset's test
  without duplication.
- [ ] T016 [US3] Apply the fixture from T015 to the US1 dataset in
  `minion_hub/src/routes/api/gateway/query/finance/+server.test.ts` (same file as T003-T005):
  `under-capability` (no `finance:view`) → 403 before query execution; `module-disabled-org`
  (`finance` module off for that org) → 403 before query execution; `cross-org` (principal not a
  member of the requested `orgId`) → own org's data or 403, never the other org's rows;
  `full-access` → 200 with real data (positive control) (FR-005, FR-008, FR-014).
- [ ] T017 [US3] Field-masking test: a persona whose `capabilities.fieldLevel('finance')` is below
  `SENSITIVE_FIELD_LEVEL` gets the dataset's sensitive fields (data-model.md
  `TypedDataset.sensitiveFields` for this dataset — confirm which fields `finance.service.ts`'s
  existing `maskFinanceSummary` already treats as sensitive and reuse that list) masked/omitted in
  the response; a `full-access` persona gets them unmasked (FR-004) — same test file.
- [ ] T018 [US3] Owner-scope test: if the US1 dataset's underlying table is one the human path
  already owner-scopes for `finance` (check `rbac.service.ts`'s owner-scopable module list), a
  persona whose role is owner-scoped only sees their own records via
  `capabilities.ownerScoped('finance') ? principalId : undefined` (R1); if `finance` is not an
  owner-scopable module, record that explicitly in the test file as "N/A — module not owner-
  scopable" rather than skipping silently (FR-005).

### Implementation for User Story 3

- [ ] T019 [US3] If T016-T018 reveal any gap in T006/T007's implementation (e.g., the module-
  enabled check FR-005 requires isn't actually wired into `requireAssistantCapability` yet — per
  audit finding E-S6, "0 of 48 gateway endpoints call `isModuleEnabled`"), add the missing
  `isModuleEnabled` check inside the new mode's branch in
  `minion_hub/src/routes/api/gateway/query/finance/+server.ts` (scoped to this dataset only — a
  harness-wide fix to `requireAssistantCapability` itself is proposal slice S2, out of scope here;
  leave a `TODO(handoff)` at the call site pointing at S2 if this task only patches the one
  endpoint instead of the shared helper).

**Checkpoint**: All three user stories independently functional; FR-014's qualification
obligation is met for every dataset that exists after this feature ships (today: one).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T020 [P] Run `minion_hub`'s full `query/*` suite
  (`cd minion_hub && bun run test src/routes/api/gateway/query`) and confirm all 13 pre-existing
  endpoints are unchanged/green (FR-013, SC-005).
- [ ] T021 [P] Run `minion`'s CI-safe test path only —
  `cd minion && pnpm vitest run test/ci/` — never the full `pnpm test` suite (memory:
  `gw-no-full-test-suite` — it crashes the box) (SC-002 verification for the gateway half).
- [ ] T022 Run quickstart.md end-to-end once T001-T021 are green; capture the actual curl
  responses in the PR description as evidence per Constitution Principle II (AS-IS/TO-BE/DELTA
  with evidence).
- [ ] T023 Open two PRs: `minion_hub` → `master` (T002-T007, T010-T019 hub-side, T020), `minion`
  → `DEV` (T008, T012 gateway-side, T021) — per Constitution Principle III, each from its own
  isolated worktree (T001), each repo's own gates run in the foreground first. Per Constitution
  Principle V (this feature is security-tagged): **both PRs require owner approval of this spec
  before merge, and owner merge** — do not self-merge.
- [ ] T024 File the open-items ledger entry (`AGENTS.md` "Open-items ledger") for anything T019 or
  T014 left as a scoped-down fix or an explicit out-of-scope note: a `TODO(handoff)` at the exact
  site AND an entry in `proposals/2026-10-15-agent-harness-restoration.md` (append, matching the
  parent proposal this slice belongs to) or a new `proposals/*.md` if the open end doesn't fit
  that file.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories (T002's placement choice
  determines every file path in US1-US3).
- **US1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3.
- **US2 (Phase 4)**: Depends on Foundational AND on US1's T008 (FR-012 — cannot retire the
  advertisement before the replacement tool exists).
- **US3 (Phase 5)**: Depends on Foundational AND on US1 (needs a real dataset to run the negative
  controls against). Independent of US2.
- **Polish (Phase 6)**: Depends on US1 + US2 + US3 all complete.

### Parallel Opportunities

- T003, T004, T005 (US1 tests, same file but independent `describe` blocks — parallelizable in
  authorship, not in the same `it` block).
- T010, T011 (US2 tests, different files/repos — fully parallel).
- T015 (US3 fixture) can start as soon as Foundational is done, in parallel with US1
  implementation, since it doesn't depend on the dataset existing yet (only on data-model.md,
  already written).
- T020, T021 (Polish test runs, different repos — fully parallel).

---

## Parallel Example: User Story 1

```bash
# Author T003, T004, T005 together (same file, independent describe blocks):
Task: "Contract test for new finance mode in minion_hub/src/routes/api/gateway/query/finance/+server.test.ts"
Task: "Row/byte cap test in the same file"
Task: "Deprecation/versioning test in the same file"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational — pins the dataset placement decision).
2. Complete Phase 3 (US1): the new dataset works end-to-end via direct call.
3. **STOP and VALIDATE** per quickstart.md §2 before touching the retirement (US2) or running the
   full negative-control suite (US3) — US1 alone already fixes the user-visible defect (3/3
   production failures) even though FR-012 still requires US2 to land in the same overall change
   before merge.

### Incremental Delivery

1. Setup + Foundational → placement decided.
2. US1 → the typed dataset answers the question (independently testable, independently
   deployable behind the fact that `crm_query` still exists but is broken — no regression either
   way).
3. US2 → retirement + advertisement swap (requires US1's tool to exist first).
4. US3 → negative-control proof (can start in parallel with US2 once US1 is done; must complete
   before either PR is opened, since FR-014 is a merge-blocking qualification, not a follow-up).
5. Polish → full-suite proof + the two PRs + ledger entries.

### Security gate reminder (Constitution Principle V)

This whole feature is security-tagged. No task above authorizes writing code without the owner
having first approved `spec.md` (with its Clarifications). Both PRs in T023 require owner merge.
This `tasks.md` is a plan artifact; per the audit brief this feature was produced under, no
implementation, commit, or PR is created from this document in this run.
