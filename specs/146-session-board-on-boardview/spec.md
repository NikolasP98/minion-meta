---
status: implementing
verdict: approved
created: 2026-11-21
updated: 2026-11-21
repos: [minion_hub]
tags: [ui, test]
source_proposal: 2026-11-20-hub-accessibility-program
source_item: S1 (gap 11)
---

# Feature Specification: The session task board works without a mouse (it moves onto the shared board)

**Feature Branch**: `146-session-board-on-boardview` (hub branch `feat/146-session-board-on-boardview`); hub PR base `master`.

**Created**: 2026-11-21

**Status**: Approved. Owner approved starting S1 on 2026-11-21 ("Yes, start S1") and approved the demo's to-be on 2026-11-23 (see below). Reviewed in two passes ([`review.md`](review.md)).

**Input**: "Slice S1 of the hub accessibility program: move `sessions/SessionKanban.svelte` (→ `tasks/KanbanCol.svelte` → `tasks/TaskCard.svelte`, the only mouse-only board) onto the shared `data-view/BoardView.svelte`, so it gets the existing per-card 'Move to…' menu and live region. Keyboard drag is S3, inside BoardView; do not build it here."

Scope note: the proposal's S1 also lists NavigationGuardModal and CommandPalette (gaps 1 and 2). They are separate specs; this one covers gap 11 only.

## FigCraft demo

- File: [`session-board.figcraft`](session-board.figcraft), page "Spec 146 · session board".
- Frames: [as-is](demo/as-is.png), [to-be](demo/to-be.png), [to-be with the "Move to…" menu open](demo/to-be-move-menu.png).
- Interactive preview: https://claude.ai/artifact/TfSasuc2DeyzMHWpxpwPMU (private to the owner).
- **Approved by the owner on 2026-11-23**, verbatim: "Approve the to-be". Relayed instruction: implement exactly as shown (shared board look, "Move to…" button, blank empty column, drop-target highlight), with the three BoardView additions as opt-in props so the Agenda and POS boards stay identical. This approves the design, not the merge.
- As built (real component, Chromium): [board](demo/built-board.png), [move menu](demo/built-move-menu.png).
- One correction after approval: the first version of the menu frame drew a coloured dot per column and a check mark on the current one. The board uses the shared menu unchanged, so the frame now shows what ships: plain labels, the current column dimmed and not selectable, exactly as on the Agenda and POS boards.

## AS-IS (hub master `5347ff01`, read 2026-11-21)

| Fact | Anchor |
|---|---|
| The session task board is a collapsible panel on an agent's Monitor tab. It is the only caller of `KanbanCol` and `TaskCard` besides their two stories. | `src/lib/components/agents/AgentDetail.svelte:161`; `grep -rn "KanbanCol\|TaskCard" src` |
| Four fixed columns (Backlog, Todo, In Progress, Done) share the panel width equally; each header is a tinted strip with an uppercase coloured label and a count; an empty column shows "—"; a column is at most 190 px tall and scrolls. | `SessionKanban.svelte:12-17,118-128`; `KanbanCol.svelte:28-35,38-63` |
| A card shows a status dot (pulsing while In Progress), a one-line title and an optional one-line description. It is a `draggable` list item: not focusable, no button, no menu. | `TaskCard.svelte:17-22,25-44` |
| The only way to change a task's column is an HTML5 mouse drag onto a column. Nothing announces the move. | `TaskCard.svelte:11-14`; `KanbanCol.svelte:17-26` |
| A move is optimistic: the card changes column at once, a `PATCH` saves it, and on failure the card goes back and a toast says "Failed to move task" (hard-coded English). | `SessionKanban.svelte:46-73` |
| The panel header (expand/collapse, progress bar, per-column counts, "no tasks" text) and the remembered collapsed state are separate from the columns. | `SessionKanban.svelte:19-21,77-112,130-133` |
| `BoardView` already gives every other board (Agenda, POS catalog, POS sell) a per-card "Move to…" menu, a right-click menu, mouse drag, focus that follows the moved card and a polite live region. | `src/lib/components/data-view/BoardView.svelte:8-11,98-128,186-231`; callers `scheduling/BookingBoard.svelte:152`, `routes/(app)/pos/catalog/PageBody.svelte`, `routes/(app)/pos/sell/PageBody.svelte:541` |
| `BoardView` cannot host this board as it is: columns are 16 rem wide in a horizontally scrolling row; every card is a button that calls `onopen` (tasks have nothing to open); the move menu always offers an "unset" target (a task always has a status). | `BoardView.svelte:268-269,243-250,216-219,100-105` |

## TO-BE

The session task board is rendered by `BoardView`. A person using a keyboard, a touch screen or a screen reader can move a task to another column from a "Move to…" button on its card, hears the result, and keeps focus on the card. Dragging with a mouse still works.

`BoardView` gains three opt-in abilities; with their defaults the three existing boards render and behave exactly as before:

1. columns that share the available width (no horizontal scroll);
2. cards that are not buttons when the board has nothing to open;
3. no "unset" column or move target when every row always has a column.

### What changes for users of the session task board

| # | Today | After |
|---|---|---|
| 1 | Move a task only by mouse drag | Also from a "Move to…" button on each card (and the right-click menu); mouse drag unchanged |
| 2 | No feedback for assistive technology | "‹task› moved to ‹column›" is announced; focus stays on the moved card's button |
| 3 | Full-bleed columns divided by lines, tinted uppercase headers | Four rounded column cards with a small gap; header = coloured dot + label + count (the shared board look) |
| 4 | Empty column shows "—" | Empty column is an empty drop area |
| 5 | Compact card | Same content (status dot, title, description), on the shared card surface; each card is narrower by the width of its move button |
| 6 | No highlight while dragging | The column under the dragged card is highlighted |

Unchanged: the four columns and their order, the collapsible header with progress and counts, the remembered collapsed state, the empty-session text, the 190 px column height limit, the optimistic save with revert and error toast, and who may move tasks (the server decides, as today).

Invariants: one write per move, whatever started it; no task ever has an empty status; the three existing boards are pixel- and behaviour-identical.

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | `BoardView` gets the three opt-in props (TO-BE 1–3). | `board-view.mounted.test.ts`: defaults unchanged for existing callers; with the props set, no "unset" item, cards are not buttons, focus goes to the move trigger after a move |
| D2 | `SessionKanban` renders its columns through `BoardView`, keeping its header, state and `moveTask`. | new mounted test: four columns, menu move calls one `PATCH`, failure reverts and announces failure |
| D3 | The move menu follows the WAI-ARIA menu pattern. | `assertPattern(document.body, 'menu', { opener })` in that test |
| D4 | `KanbanCol`, `TaskCard` and their two stories are deleted (no other caller); a `SessionKanban` story replaces them. | `grep` shows no reference; `bun run check` |
| D5 | Accessibility baselines only decrease. | `bun run a11y` (stories, patterns, suppressions) and the page gate in CI |

## User Scenarios & Testing

### User Story 1 — Move a task with the keyboard (P1)

A person tabs to a task's "Move to…" button, opens it, chooses a column with the arrow keys and Enter. The task moves, the move is announced, and focus stays with the task.

**Independent Test**: mounted test drives the menu with keys only and asserts one `PATCH`, the new column, the announcement and the focused element.

**Acceptance Scenarios**:

1. **Given** a task in Todo, **When** "Move to… → In Progress" is chosen, **Then** the card is in In Progress, one save request was sent, and the live region says the task moved to In Progress.
2. **Given** the save fails, **When** the move is chosen, **Then** the card returns to its column, the error toast shows, and the live region says the move failed.
3. **Given** a task in Done, **When** its menu opens, **Then** Done is marked as current and cannot be chosen, and there is no "unset" entry.

### User Story 2 — Nothing is lost for mouse users (P1)

Dragging a card onto another column still moves it with the same single save.

**Acceptance Scenarios**:

1. **Given** a task, **When** it is dragged onto another column, **Then** it moves and one save request is sent.
2. **Given** the panel is collapsed, **When** the page is reopened, **Then** it is still collapsed, and the header shows the same progress and counts as today.

### User Story 3 — The other boards do not change (P1)

Agenda, POS catalog and POS sell boards look and behave as before.

**Acceptance Scenarios**:

1. **Given** the existing `BoardView` tests and stories, **When** the suite runs, **Then** all pass unchanged and the story accessibility counts do not rise.

### Edge Cases

- A session with no tasks: the panel shows the existing "No tasks for this session." text, not the board's empty state.
- A long title or description stays on one line and is cut with an ellipsis, as today.
- Many tasks in one column: the column scrolls inside the 190 px limit.
- Narrow panel (phone width): four equal columns get very narrow, as today; improving that is not in this slice.

## Requirements

- **FR-001**: The session task board MUST be rendered by `BoardView`; no second board implementation may remain.
- **FR-002**: Every task card MUST offer a keyboard- and touch-operable way to move it to any other column.
- **FR-003**: A move MUST be announced politely with the task and the column, and a refused move MUST be announced as failed.
- **FR-004**: After a move, focus MUST stay on a control of the moved card.
- **FR-005**: The move menu MUST NOT offer a target the data cannot hold (no "unset").
- **FR-006**: A card with nothing to open MUST NOT be a button.
- **FR-007**: Mouse drag, the optimistic save with revert, the header, the collapsed preference and the empty-session text MUST keep working as today.
- **FR-008**: The three existing `BoardView` callers MUST be unchanged in appearance and behaviour.
- **FR-009**: `KanbanCol` and `TaskCard` MUST be deleted if nothing else uses them.
- **FR-010**: No new user-facing string without Paraglide; no route, API or permission change.

## Success Criteria

- **SC-001**: A task can be moved between any two columns using only the keyboard, proven by a test.
- **SC-002**: `assertPattern` passes for the move menu.
- **SC-003**: `bun run a11y` is green and no baseline rises; any drop is ratcheted.
- **SC-004**: All existing `BoardView` tests pass without edits to their expectations.
- **SC-005**: Every check on the hub PR is green.

## Assumptions

- Keyboard drag (pick up with Space/Enter, move with arrows) is S3 and lands in `BoardView` for every board.
- The hard-coded English error toast is existing debt and is not translated here.
- Not tagged security or data.

## Out of Scope

- Keyboard drag (S3); NavigationGuardModal and CommandPalette (other S1 specs); a phone layout for the panel; translating the error toast.
