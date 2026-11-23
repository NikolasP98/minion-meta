# Tasks: the session task board on the shared board (a11y S1)

**Input**: spec.md, plan.md, review.md. Paths are in `minion_hub`.

## Phase 1: Setup

- [x] T001 Branch `feat/146-session-board-on-boardview` off fresh `origin/master`; install; `i18n:compile`

## Phase 2: Foundational — BoardView (blocks US1, US2)

- [x] T002 [US3] `BoardView.svelte`: props `fit` and `unclassified`, plain card without `onopen`, focus target after a move, inner-layout rule limited to button/link cards
- [x] T003 [US3] `board-view.mounted.test.ts`: defaults unchanged; opt-in props give shared width, no unset column, plain cards

## Phase 3: US1 + US2 — the session board

- [x] T004 [US1] `SessionKanban.svelte`: render through `BoardView` (`fit`, `unclassified={false}`, no `onopen`), status colours as column dots, `moveTask` returns a boolean
- [x] T005 [US1] `SessionKanban.mounted.test.ts`: keyboard-only move (one PATCH, announcement, focus), refused save (revert, toast, failure announced), `assertPattern(menu, { opener })`, empty session
- [x] T006 [US2] same file: mouse drag still moves with one PATCH
- [x] T007 [US2] Delete `KanbanCol`, `TaskCard` and their stories; add `SessionKanban.stories.svelte`; drop their rows from the accessibility ledger; update `AGENTS.md`

## Phase 4: Proof

- [x] T008 Render the built component in Chromium: equal columns, no page overflow, keyboard move, focus, announcement, Escape; compare with the demo
- [ ] T009 Foreground gates: `bun run check`, unit suite, `lint:design && lint:tokens`, `bun run a11y` (ratchet if counts fall), `bun run build`
- [ ] T010 Hub PR (base `master`) with what changed for users, baseline deltas and what was not verified; every check green; never merge
- [x] T011 Open ends: `TODO(handoff)` in `Dropdown.svelte` + entry in `proposals/2026-11-20-hub-accessibility-program.md`

## Dependencies

T002 → T004 → T005/T006 → T007 → T008 → T009 → T010.
