# Tasks: Safe default-on JIT tool selection for hub personal agents

**Input**: Design documents from `specs/006-jit-tool-selection-on/` (spec.md, plan.md,
research.md, data-model.md, contracts/, quickstart.md)

**Tests**: Included. Not explicitly requested in spec.md's prose, but `AGENTS.md`'s "lazy… new
non-trivial logic… leaves one small test" rule and the audit's own §6 ("no test asserts
`TOOL_REGISTRY ⊆ TOOL_ORDER`… none exercises `load_tools` with a custom-tool id… none runs two
agents through `ensureToolIndex` concurrently") make omitting them indefensible here — every task
below is exactly the kind of branch/loop/security-adjacent logic the rule targets.

**Repo**: all file paths are `minion`-repo-relative (gateway), per plan.md's Repo note — this spec
lives in `minion-meta`, the code does not.

## Phase 1: Setup

- [ ] T001 Confirm a `minion` worktree exists on a fresh branch off `DEV` (repo-policy PR base for
      `minion`); run `pnpm install` if `node_modules` is stale. No code changes in this task.

**Checkpoint**: ready to branch per-slice work from this worktree (or sibling worktrees per slice,
per plan.md's "parallel worktrees" note).

---

## Phase 2: Foundational

**Purpose**: nothing in this feature requires shared new infrastructure — every slice extends
existing modules in place. This phase is intentionally empty; proceed directly to User Story 1.

**Checkpoint**: N/A — no blocking prerequisite tasks.

---

## Phase 3: User Story 1 - Ranking reflects what the user actually asked (Priority: P1) 🎯 MVP

**Goal**: FR-001/FR-002 — the JIT ranking query is the user's text with the envelope stripped, and
an all-zero score vector serves the full L1 set instead of a `TOOL_ORDER` tie-break.

**Independent Test**: per spec.md US1 — feed a concrete hub-ask wrapped in the real envelope format
and confirm the matching tool outranks always-available tools; feed an envelope-only (post-strip
empty) turn and confirm the full L1 set stays active.

### Tests for User Story 1

- [ ] T002 [P] [US1] Write `stripContextEnvelope` tests in
      `src/agents/tool-search/strip-envelope.test.ts`: strips the anchored
      `[In-app assistant context … Don't restate this context.]` block (whitespace-tolerant, per
      research.md Decision 1); leaves plain text with no envelope untouched; strips the block when
      it appears mid-string, not only as a prefix (spec.md Edge Cases).
- [ ] T003 [P] [US1] Write all-zero-fallback tests in `src/agents/tool-search/select-tools.test.ts`
      (extend existing file): a candidate set where every `lexicalScore` is exactly `0` is
      detected as "no signal" (new exported helper, e.g. `isAllZero(candidates: ScoredTool[]):
      boolean`, per research.md Decision 2) — add this as a case alongside existing tie-break tests,
      don't replace them.
- [ ] T004 [US1] Write `applyJitToolGate` tests in new `src/agents/tool-search/apply-selection.test.ts`
      (none exists today — audit C §6 gap): `mode: "on"`, stripped-prompt-matches-a-tool → that
      tool's id is in the returned set; `mode: "on"`, all-zero scores → returned set equals
      `l1Tools` (every permission-filtered tool), not a 20-item `TOOL_ORDER` prefix; `mode:
      "shadow"` still always returns the full `l1Tools` regardless of scores (regression guard,
      unchanged behavior). Depends on T002, T003 existing as reference behavior.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Create `src/agents/tool-search/strip-envelope.ts` exporting
      `stripContextEnvelope(text: string): string`, regex
      `/^\s*\[In-app assistant context[\s\S]*?Don't restate this context\.\]\s*/` applied
      globally (not just anchored at string start) so a mid-message occurrence is also removed —
      per research.md Decision 1 and spec.md Edge Cases ("envelope appears mid-message").
- [ ] T006 [US1] In `src/agents/tool-search/select-tools.ts`, add an exported `isAllZero(candidates:
      ScoredTool[]): boolean` helper returning true iff `candidates.length > 0` and every `score
      === 0`. No change to `selectTools` itself (depends on T003 passing against this helper).
- [ ] T007 [US1] In `src/agents/tool-search/apply-selection.ts`'s `applyJitToolGate`, build the
      ranking query as `stripContextEnvelope(prompt)` instead of raw `prompt` before calling
      `rankTools` (import T005's export). The raw `prompt` continues unchanged for every other use
      (logging, model attempt) — do not touch call sites outside this function (FR-001; plan.md
      Constraints).
- [ ] T008 [US1] In the same function, after `rankTools` resolves, call T006's `isAllZero(scored)`;
      if true, set `activeIds` to every id in `l1Tools` directly (skip `selectTools`'s top-k/
      tie-break call) before the existing `log.info` line, so the shadow-log `activeIds` field
      also reflects this fallback for SC-006's later log comparison (FR-002). Depends on T006, T007.

**Checkpoint**: User Story 1 fully functional and testable independently — run
`pnpm vitest run src/agents/tool-search/strip-envelope.test.ts src/agents/tool-search/select-tools.test.ts src/agents/tool-search/apply-selection.test.ts`
(quickstart.md Slice 1).

---

## Phase 4: User Story 2 - One agent's tool search never reflects another agent's catalog (Priority: P2)

**Goal**: FR-003/FR-004 — the relevance index is keyed per caller (`agentId`), so concurrent builds
for different catalogs never contend or cross-serve.

**Independent Test**: per spec.md US2 — two concurrent `ensureToolIndex` calls for different
catalogs; each agent's later `search_tools`/`rankTools` only ever reflects its own catalog.

### Tests for User Story 2

- [ ] T009 [P] [US2] Write `src/agents/tool-search/tool-index.test.ts` (none exists today — audit C
      §6 gap): build index for agent A (catalog `[toolX]`) and agent B (catalog `[toolY]`)
      concurrently via `Promise.all([ensureToolIndex({catalog: [toolX], agentId: "A"}),
      ensureToolIndex({catalog: [toolY], agentId: "B"})])`; assert `listIndexedIds("A")` contains
      `toolX` and NOT `toolY`, and vice versa for B; assert `rankTools("A", "...", [toolX.id,
      toolY.id])` only scores `toolX.id` (never silently drops it for being absent from B's
      catalog — FR-004's "every tool in agent A's own catalog receives a score").

### Implementation for User Story 2

- [ ] T010 [US2] In `src/agents/tool-search/tool-index.ts`, replace the module-level `STATE`/
      `BUILDING` pair with `const SLOTS = new Map<string, { state: IndexState | null; building:
      Promise<IndexState> | null }>()` keyed by `agentId` (data-model.md `IndexSlot`). Preserve the
      existing catalog-signature fast-path *within* each slot (research.md Decision 3).
- [ ] T011 [US2] Update `ensureToolIndex`, `rankTools`, `getIndexedEntry`, `listIndexedIds` in the
      same file to take/use `agentId` as the slot key (all four already receive or can receive it
      from their existing callers in `apply-selection.ts`, `search-tools-tool.ts`,
      `load-tools-tool.ts`) instead of reading the removed module-level `STATE`. Depends on T010.
- [ ] T012 [US2] Update call sites in `src/agents/tools/meta/search-tools-tool.ts` (`listIndexedIds`,
      `rankTools`, `getIndexedEntry`) and `src/agents/tools/meta/load-tools-tool.ts`
      (`getIndexedEntry`) to pass the `agentId` each tool's `execute` closure already has access to
      (same way `apply-selection.ts` does) — both files currently call these without an agentId
      argument; signatures change under T011, so these are forced updates, not optional. Depends on
      T011.

**Checkpoint**: User Stories 1 AND 2 both work independently — run
`pnpm vitest run src/agents/tool-search/tool-index.test.ts` plus Phase 3's command (quickstart.md
Slice 2).

---

## Phase 5: User Story 3 - A custom tool dropped from the shortlist can be brought back (Priority: P2)

**Goal**: FR-005 — `load_tools` accepts any id present in the caller's current tool index, not
only `TOOL_REGISTRY` ids.

**Independent Test**: per spec.md US3 — `search_tools` finds a custom tool outside top-k;
`load_tools` with its id succeeds instead of reporting it `unknown`.

### Tests for User Story 3

- [ ] T013 [P] [US3] Write `src/agents/tools/meta/load-tools-tool.test.ts` (none exists today):
      a custom tool id present in the per-agent index (seed via T011's `getIndexedEntry`/index
      build, or a test double) but absent from `TOOL_REGISTRY` → `loaded` contains it, `unknown`
      does not (contracts/load-tools-tool.md, Acceptance Scenario 1). A genuinely unknown id (in
      neither) → still reported in `unknown` (Acceptance Scenario 2, regression guard). A plain
      registry id → unchanged behavior (regression guard).

### Implementation for User Story 3

- [ ] T014 [US3] In `src/agents/tools/meta/load-tools-tool.ts`, change the `known`/`unknown` split
      from `id in TOOL_REGISTRY` to `id in TOOL_REGISTRY || getIndexedEntry(agentId, id) !==
      undefined` (depends on T011's `agentId`-keyed `getIndexedEntry` signature from User Story 2 —
      see plan.md's slice-overlap note; if US3 ships before US2 lands, implement against the
      pre-US2 single-arg `getIndexedEntry` and rebase onto US2's signature when it merges). Pass
      `known` to `markToolsLoaded` unchanged (FR-005; contracts/load-tools-tool.md).

**Checkpoint**: run `pnpm vitest run src/agents/tools/meta/load-tools-tool.test.ts` (quickstart.md
Slice 4 — numbered 4 in plan.md's slice table, executed here in Phase 5 since tasks are ordered by
spec.md's user-story priority, not plan.md's slice numbering).

---

## Phase 6: User Story 4 - Turning selection off says so instead of going silent (Priority: P3)

**Goal**: FR-006 — `search_tools` returns an explicit "selection disabled" result when `mode` is
`"off"`, distinguishable from a genuine zero-match result.

**Independent Test**: per spec.md US4 — `mode: "off"` + `search_tools` → explicit disabled result;
`mode: "on"`/`"shadow"` + a non-matching query → still a plain empty `results` list (unchanged).

### Tests for User Story 4

- [ ] T015 [P] [US4] Write `src/agents/tools/meta/search-tools-tool.test.ts` (none exists today):
      `mode: "off"` → `{ results: [], disabled: true, message: <non-empty string> }`
      (contracts/search-tools-tool.md). `mode: "on"` with a query matching no tool → `{ results:
      [], hint: <string> }` with no `disabled` field (Acceptance Scenario 2, regression guard —
      this feature must not change the genuine-zero-match case).

### Implementation for User Story 4

- [ ] T016 [US4] In `src/agents/tools/meta/search-tools-tool.ts`, add a `mode` parameter to
      `createSearchToolsTool(options: { sessionKey?: string; mode?: ... })` (mirroring how
      `createLoadToolsTool` already takes `options.sessionKey`) and short-circuit `execute` to
      return `{ results: [], disabled: true, message: "Tool selection is off for this agent; the
      full permitted tool set is already active." }` when `mode === "off"`, before calling
      `listIndexedIds`/`rankTools` (research.md Decision 5).
- [ ] T017 [US4] Update the call site that constructs `createSearchToolsTool()` (wherever the tool
      array is assembled for a turn — same place `createLoadToolsTool({ sessionKey })` is called)
      to pass the resolved `selection.mode` through, so T016 has it. Depends on T016.

**Checkpoint**: run `pnpm vitest run src/agents/tools/meta/search-tools-tool.test.ts` (quickstart.md
Slice 3).

---

## Phase 7: User Story 5 - The default becomes `on`, backed by evidence it is now safe (Priority: P1)

**Goal**: FR-009 — flip `tools.selection.mode`'s default from `"shadow"` to `"on"`, gated on
Phases 3–6 being merged and on the test/log evidence in SC-001–SC-006.

**Independent Test**: per spec.md US5 — with Phases 3–6 merged, `resolveSelectionConfig` with no
explicit `mode` anywhere resolves `"on"`; the scoped vitest suite and a shadow-log replay both pass.

**⚠️ Gate**: do not start this phase until Phases 3, 4, 5, and 6 are merged to `DEV` (plan.md Slice
table; Constitution Check Principle V names this phase as requiring owner approval before code and
owner merge).

### Tests for User Story 5

- [ ] T018 [P] [US5] Add to `src/agents/tool-search/apply-selection.test.ts`:
      `resolveSelectionConfig(undefined, agentId).mode === "on"` (new default, contracts/
      tool-selection-config.md); `resolveSelectionConfig({ tools: { selection: { mode: "shadow" }
      } }, agentId).mode === "shadow"` (explicit override still wins — regression guard for the
      flip, contracts/tool-selection-config.md Verification).

### Implementation for User Story 5

- [ ] T019 [US5] In `src/agents/tool-search/apply-selection.ts`, change `const DEFAULT_MODE:
      NonNullable<ToolSelectionConfig["mode"]> = "shadow"` to `"on"`. Depends on T018 and on
      Phases 3–6 being merged (gate above).
- [ ] T020 [US5] Update any config documentation / default-value comments elsewhere that state the
      default is `"shadow"` (grep `DEFAULT_MODE\|mode.*shadow` across `src/config/types.tools.ts`
      and any README/CHANGELOG entries for `tools.selection`) so they match the new default.
- [ ] T021 [US5] Run the full scoped gate `pnpm vitest run src/agents/tool-search
      src/agents/tools/hub` (quickstart.md Slice 5) and record the result in the PR description.
- [ ] T022 [US5] Perform the manual SC-006 shadow-log replay (quickstart.md "manually (not
      automated)" step): sample production `[jit-select]` log lines from before the flip, re-run
      the fixed ranking offline against each, confirm the tool actually called in that turn is
      still in `activeIds`, and record sample size + pass rate in the PR description. Depends on
      T019.

**Checkpoint**: all user stories now independently functional AND the default reflects the fixed
behavior — the feature's goal (spec.md US5) is reached.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T023 [P] Run `quickstart.md`'s full sequence (Slices 1–5 plus the optional end-to-end manual
      check) once all phases are merged, as a final sanity pass distinct from the per-phase gates
      already run in T004/T009/T013/T015/T021.
- [ ] T024 Open-items ledger per `AGENTS.md`: if SC-006's shadow-log replay (T022) or the
      cross-agent concurrency test (T009) surfaces any residual gap (e.g. the lexical-vs-embedding
      epsilon question research.md Decision 2 deferred), add a `TODO(handoff)` at the exact site
      AND a `proposals/` entry before closing this feature, per the constitution's open-items rule.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: empty — does not block anything.
- **User Story 1 (Phase 3)**: depends on Setup only. No dependency on other stories.
- **User Story 2 (Phase 4)**: depends on Setup only. Independent of Phase 3, but **shares
  `tool-index.ts`** with... nothing in Phase 3 — the overlap is with Phase 6 (search-tools-tool
  reads the index) and Phase 5 (load-tools-tool reads the index); see "Within-feature file overlap"
  below.
- **User Story 3 (Phase 5)**: depends on Setup; its implementation task (T014) depends on Phase 4's
  `getIndexedEntry` signature change (T011) per plan.md's slice-overlap note.
- **User Story 4 (Phase 6)**: depends on Setup only. Independent of all other stories.
- **User Story 5 (Phase 7)**: depends on Phases 3, 4, 5, AND 6 being merged (hard gate — this is
  the feature's whole point: flipping the default is only safe once the other four are live).
- **Polish (Phase 8)**: depends on Phase 7.

### Within-feature file overlap (see plan.md Complexity/Slice notes)

- `tool-index.ts`: Phase 4 (T010/T011) changes its public function signatures; Phase 5 (T014) and
  Phase 6 (T016/T017) call those functions. **Land Phase 4 before Phase 5 and Phase 6's
  implementation tasks**, or implement Phase 5/6 against today's signatures and rebase.
- `apply-selection.ts`: Phase 3 (T007/T008) and Phase 7 (T019) both touch this file but different
  lines (query-build vs. `DEFAULT_MODE`) — low collision risk, ordinary rebase suffices.

### Parallel Opportunities

- Phase 3 tasks T002/T003 in parallel (different files); T005 in parallel with T002/T003 (test-
  first tasks can be written while T005 is also being written, since T004's test depends on T005+
  T006+T007 existing, not vice versa — adjust ordering if following strict TDD red-before-green).
- Phases 3, 4, and 6 (User Stories 1, 2, 4) can be staffed and branched in parallel from Setup —
  zero file overlap between those three specifically.
- Phase 5 (User Story 3) should start after Phase 4 lands (see file-overlap note) to avoid rework.
- Phase 7 (User Story 5) cannot start until Phases 3–6 are all merged — not a staffing choice, a
  correctness gate.

## Implementation Strategy

### MVP First

Phase 1 → Phase 3 (User Story 1) only. This alone fixes the single defect the audit calls "the
root defect that makes `mode: 'on'` unsafe to default to" — shippable and valuable even if Phases
4–7 slip.

### Incremental Delivery

Phase 1 → Phase 3 (MVP) → Phase 4 → Phase 6 → Phase 5 (ordered last among 4/5/6 per the file-overlap
note) → Phase 7 (the gated default flip) → Phase 8. Each of Phases 3–6 ships and is demoable as its
own PR before the next starts; Phase 7 is deliberately the only phase that cannot ship early.
