# Implementation Plan: the session task board on the shared board (a11y S1)

**Branch**: hub `feat/146-session-board-on-boardview`, PR base `master` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

## Summary

`SessionKanban` keeps its header, state and save logic and renders its columns through `BoardView`. `BoardView` gains two props and one behaviour, all opt-in. `KanbanCol`, `TaskCard` and their stories are deleted.

## Technical Context

**Language/Version**: Svelte 5 (runes), TypeScript strict | **Dependencies**: none new | **Storage**: none | **Testing**: Vitest (happy-dom mounted tests), `assertPattern`, `bun run a11y`, a Chromium render of the built component | **Scale**: 1 component moved, 1 shared component extended, 3 existing callers untouched.

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | Pass: spec approved, reviewed in two passes |
| II. AS-IS / TO-BE / DELTA | Pass |
| III. Slice-scoped delivery | Pass: one hub PR from an isolated worktree; gates in the foreground |
| IV. Required build steps | Pass: semantic tokens only, `lint:design && lint:tokens`; no string, route, API or permission added |
| V. Security/data gates | Not triggered |

## Design

| Change | Where | Default keeps old behaviour? |
|---|---|---|
| `fit`: columns share the width; the host owns the gutter | `BoardView.svelte` (`.board.is-fit`) | yes (`false`) |
| `unclassified`: no "unset" column or move target | `BoardView.svelte` (`showUnclassified`, `moveItems`) | yes (`true`) |
| no `onopen` → card is a `div`, not a Button | `BoardView.svelte` | yes (all three callers pass `onopen`) |
| focus after a move: card button, else move trigger | `BoardView.svelte` `moveTo` | yes |
| inner-layout rule limited to button/link cards | `BoardView.svelte` style | yes |
| board through `BoardView`; `moveTask` returns a boolean | `SessionKanban.svelte` | n/a |

Rejected: a second board component (the gap the program is closing); restyling the shared menu with dots and a check (would change the other boards).

## Source

```text
src/lib/components/data-view/BoardView.svelte            EDIT
src/lib/components/data-view/board-view.mounted.test.ts  EDIT  defaults + opt-in props
src/lib/components/sessions/SessionKanban.svelte         EDIT
src/lib/components/sessions/SessionKanban.mounted.test.ts NEW  keyboard move, failure, drag, menu pattern, empty
src/lib/stories/Sessions/SessionKanban.stories.svelte    NEW
src/lib/components/tasks/{KanbanCol,TaskCard}.svelte     DELETE
src/lib/stories/Cards/{KanbanCol,TaskCard}.stories.svelte DELETE
src/lib/components/ui/Dropdown.svelte                    EDIT  TODO(handoff) comment only
tests/ui-audit/a11y-ledger.json                          EDIT  rows of the deleted stories removed
AGENTS.md                                                EDIT  components table
```
