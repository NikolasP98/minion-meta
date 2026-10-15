# Tasks: Assistant Launcher Stays in Its Corner

**Input**: Design documents from `/specs/103-retro-assistant-launcher-position/`

**Prerequisites**: plan.md, research.md, data-model.md, spec.md

**Tests**: Not "explicitly requested" in spec.md (per the Spec Kit template's own test-
inclusion rule), but Constitution Principle II ("the test that proves each transition") and
this retrospective's scorecard both require at least the fraction-math test — included below
as `[TEST]` tasks. The shipped PR #539 wrote none of these; see `retro-scorecard.md` §1/§3.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Confirm the slice is confined to one file — grep the `minion_hub` repo for
      `assistant-launcher-pos` and confirm the only hits are inside
      `src/lib/components/layout/FloatingAssistant.svelte` (validates plan.md's "Scale/Scope"
      claim before editing).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The module-scope state and its resize-safe derivation, shared by all three
user stories.

**⚠️ CRITICAL**: No user-story task below can be verified until this phase lands.

- [ ] T002 In `src/lib/components/layout/FloatingAssistant.svelte`, add a
      `<script module lang="ts">` block declaring
      `let savedFrac: { fx: number; fy: number } | null = null;` (data-model.md).
- [ ] T003 Remove the `onMount` block's `localStorage.getItem('assistant-launcher-pos')`
      read and the `pos = {...}` assignment derived from it (plan.md AS-IS evidence, item 1).
- [ ] T004 Add `let frac = $state(savedFrac);` and replace the existing in-viewport-clamp
      `$effect` with one that derives `pos` from `frac`, `launcherSize`, `vw`/`vh`, and
      `LAUNCH_MARGIN` (data-model.md "Dragged" lifecycle state; research.md Decision 2).

**Checkpoint**: Foundation ready — `pos` is now always a pure function of `frac` (or `null`),
never of a stored absolute pixel value.

---

## Phase 3: User Story 1 - Launcher always starts in its home corner (Priority: P1) 🎯 MVP

**Goal**: FR-001/FR-004 — every fresh load (including hard refresh) shows the default corner.

**Independent Test**: Drag the launcher away, hard-refresh, confirm it is back in the corner.

- [ ] T005 [US1] Confirm (manual check) that with `frac`/`savedFrac` both `null` at module
      evaluation, `pos` stays `null` and the default `bottom-5 right-5` corner classes apply.
- [ ] T006 [US1] [TEST] Add a unit test asserting that a fresh module evaluation (simulating
      a reload) always starts with `savedFrac === null`, independent of what a previous test
      in the same file set it to. Note: Svelte `<script module>` state is per-module-instance,
      not per-import — see Dependencies note below on testability.

**Checkpoint**: User Story 1 is independently verifiable.

---

## Phase 4: User Story 2 - Dragging still works for the rest of the session (Priority: P2)

**Goal**: FR-002/FR-003 — drag-to-edge still works; the dragged spot survives in-app
navigation (not a reload).

**Independent Test**: Drag to an edge, navigate to another in-app page (no reload), confirm
the launcher is still at the dragged edge.

- [ ] T007 [US2] In `snapToEdge()`, replace the pixel `pos = {...}` write and
      `localStorage.setItem(...)` call with computing and writing
      `frac = savedFrac = { fx, fy }` from the clamped `left`/`top` (data-model.md).
- [ ] T008 [US2] In `snapHome()`, replace `localStorage.removeItem('assistant-launcher-pos')`
      with `frac = savedFrac = null`.
- [ ] T009 [US2] [TEST] Add a test that: sets `frac`/`savedFrac` via a simulated
      `snapToEdge()` call, remounts the component (simulating a client-side navigation
      remount), and asserts the position is retained because `savedFrac` (module scope) is
      untouched by the remount.

**Checkpoint**: User Stories 1 and 2 both independently verifiable.

---

## Phase 5: User Story 3 - A window resize never displaces the launcher (Priority: P1)

**Goal**: FR-005/FR-006 — resize keeps the launcher on the same edge, always fully on-screen.

**Independent Test**: Drag to an edge, resize the window larger and smaller, confirm the
launcher stays on that edge and fully visible at every size.

- [ ] T010 [US3] Remove the resize handler's `if (pos) snapToEdge();` call — this is the
      nearest-of-four-edges re-snap that can flip the launcher to a different edge on resize
      (plan.md AS-IS evidence, item 2).
- [ ] T011 [US3] Confirm the Foundational `$effect` (T004) re-runs whenever `vw`/`vh`/
      `launcherSize` change (already wired through the existing `onResize` listener), so
      `pos` is recomputed from the *unchanged* `frac` on every resize instead of being
      re-decided.
- [ ] T012 [US3] [TEST] Add a unit test: set `frac` anchored to one edge (e.g. `fx: 1`),
      simulate a viewport resize (`vw`/`vh` change), and assert the recomputed `pos` (a)
      stays on the same edge and (b) stays within `[LAUNCH_MARGIN, vw - w - LAUNCH_MARGIN]` /
      the vertical equivalent — i.e., never off-screen. This is the test #539 shipped without
      (retro-scorecard.md §1, §3).

**Checkpoint**: All three user stories independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T013 [P] Run `bun run check` (svelte-check) and `lint:design && lint:tokens` on the
      changed file (Constitution Principle IV); confirm zero new design-token debt.
- [ ] T014 Open the PR against `minion_hub`'s registered PR base (`master`, per
      `node scripts/repo-policy.mjs show minion_hub`) from an isolated worktree, citing this
      spec and the AS-IS evidence anchors in plan.md (Constitution Principle III).
- [ ] T015 Record the open-items ledger entries for anything still unverified at merge time
      (e.g., "not browser-verified on a live preview," which is what #539's own PR body said
      in prose) as an in-code `TODO(handoff)` comment plus a `proposals/` entry — not just PR
      body prose (Constitution's open-items ledger; see retro-scorecard.md §2).

---

## Dependencies & Execution Order

- **Setup (T001)**: No dependencies.
- **Foundational (T002-T004)**: Depends on T001 — BLOCKS every user story task.
- **User Story 1 (T005-T006)**: Depends only on Foundational.
- **User Story 2 (T007-T009)**: Depends only on Foundational; independent of US1.
- **User Story 3 (T010-T012)**: Depends only on Foundational; independent of US1/US2.
- **Polish (T013-T015)**: Depends on all of T005-T012.

### Testability note (affects T006, T009, T012)

Svelte `<script module>` state is awkward to unit-test in true isolation (it lives for the
lifetime of the imported module, not per test-case), so T006/T009/T012 may need either (a) a
fresh dynamic `import()` per test case, or (b) testing the pure derivation math
(`frac × free-area → pixels`) as an extracted, directly-callable function rather than through
the component's reactive `$effect`. Either approach is acceptable; flagging the friction here
rather than silently in `tasks.md` is itself a task of this plan (Constitution's open-items
ledger spirit).
