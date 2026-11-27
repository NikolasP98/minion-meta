---
status: shipped
verdict: approved
created: 2026-11-26
updated: 2026-11-26
repos: [minion_hub]
tags: [ui, test]
source_proposal: 2026-11-20-hub-accessibility-program
source_item: S5
---

# Feature Specification: Composites — tables, charts and the workshop canvas work from the keyboard

**Feature Branch**: `154-hub-composites`; hub branches `feat/154-*`, PR base `master`.

**Created**: 2026-11-26

**Status**: Approved in advance. Owner (2026-11-26, verbatim): "fold the S1 leftovers into S3, then implement all slices directly, your work is fully approved to go live." Where a choice is open, the option closest to today's look that passes WCAG 2.2 AA is taken and stated. No user feature is removed and no dependency is added.

**Input**: Slice S5 "Composites" of the hub accessibility program: "Gap 10 DataTable single tab stop (inner buttons `tabindex=-1`, reached by cell navigation, Enter activates) + sort announcement; gap 6 Chart keyboard legend/items, `ariaLabel` required, table for non-Cartesian; gap 5 workshop canvas keyboard path (focusable nodes or an equivalent list view)." Plus the leftover of item 17: whether the table's arrow and J/K keys yield to a control inside a cell.

## AS-IS (hub master `a845e693`, read 2026-11-26)

`DT` = `src/lib/components/data-table/DataTable.svelte`, `WC` = `src/lib/components/workshop/WorkshopCanvas.svelte`.

### Table (57 instances in 44 files, all in grid mode)

| Fact | Anchor |
|---|---|
| The table is a grid: the scroll wrapper has `role="grid"`, is the one element that takes focus (`tabindex=0`) and points at the active row with `aria-activedescendant`. This model already survives row virtualisation. | `DT:3747-3758`, `DT:2478-2490` |
| It is not one Tab stop. Every control inside is in the Tab order as well: select-all, each sort button, each column filter, each resize handle (`tabindex="0"`), add-column, and per row the checkbox, the expand button, links and row actions. With 50 rows on screen, a checkbox and one action per row, that is over 100 Tab stops before the next thing on the page. | `DT:3837`, `DT:3907`, `DT:3936-3938`, `DT:3968`, `DT:4087`, `DT:4107`, `DT:4192-4204`, `DT:4232` |
| The keyboard moves by row only (Up, Down, J, K). Left and Right, Tab between cells and Enter-to-edit work only after a cell is selected, and only a pointer can select one. Home, End, Ctrl+Home and Ctrl+End are not bound. | `DT:2451-2454`, `DT:2723`, `DT:2847`, `DT:2883-2927` |
| The header row is not reachable by the grid's keys; sorting is reached by tabbing to the header buttons. `aria-sort` is set on the sorted column. Nothing is announced when the order changes. | `DT:3863-3867`, `DT:3907-3911`; `git grep "announce(" DT` → 0 |
| Enter and Space stand down while a control inside a cell has focus (hub #743). The arrow and J/K keys do not; the hotkey engine already ignores bare keys in `input`, `select`, `textarea` and editable text, so the open case is button-based controls. | `DT:848-852`, `DT:2455-2470`; `src/lib/hotkeys/index.ts:16-18` |
| `assertPattern` has a `grid` pattern (one Tab stop, arrows, Home/End, Ctrl+Home/End). No table test uses it. The story `components-data-datatable--filters-and-footer` carries 8 ARIA-structure violations in the ledger. | `src/lib/a11y/assert-pattern.ts:64-76`, `:422-479`; `tests/ui-audit/a11y-ledger.json` |

### Charts (28 instances in 14 files; 7 sparklines)

| Fact | Anchor |
|---|---|
| A chart is one image (`role="img"`). Its name is optional and falls back to the word "Chart"; 24 of 28 callers pass none. | `src/lib/components/charts/Chart.svelte:40`, `:70`, `:371-372` |
| A data table behind a disclosure exists only for line and bar charts on one category axis. Pie (4 uses), sankey (1) and scatter (2) have none. | `Chart.svelte:104-177`, `:374-409` |
| Legend toggling and item clicks (9 callers drill down on a click, 1 reacts to the legend) arrive only as canvas pointer events. No keyboard path. | `Chart.svelte:281-282` (`TODO(handoff)`), `:308-309` |
| Sparklines have no role, name or `aria-hidden`. | `EChartsSparkline.svelte:112`, `Sparkline.svelte:86-87` |

### Workshop canvas

| Fact | Anchor |
|---|---|
| Agents and elements are drawn by PixiJS; they have no DOM. The canvas region has a name and no keyboard focus. | `WC:1559`, `WC:1605`, `WC:1771-1797` |
| By keyboard today: choose an agent and give it a task from the agent list, the selected agent's action bar (chat, task, behaviour, delete), conversations, undo, Escape, view mode. | `_workshop-canvas/WorkshopAgentControls.svelte:21-36`, `AgentActionBar.svelte:40-80`, `WC:1673-1678`, `WorkshopToolbar.svelte:85-116` |
| Pointer only: put an agent or element on the canvas (drag from the palette), move one, link two agents (Shift-drag), open or remove an element, pan and zoom. | `WC:878-898`, `WC:1080`, `WC:1132`, `WC:1269-1310`; `WC:1724` (`TODO(handoff)`) |
| The right-click menu's items take Tab focus one by one and answer Enter only: no arrow keys, no Space, no Escape handling of its own. | `ContextMenu.svelte:65-187` |
| The workshop a11y suite runs on a fixture that does not mount the real renderer. | `tests/fixtures/workshop-accessibility/README.md` |

## TO-BE

### 1. Table: one Tab stop, every cell and control reachable

1. Tab enters the table once and leaves it with the next Tab. Controls inside the grid (header and body) leave the Tab order (`tabindex=-1`), kept so when rows remount. The toolbar above the table (search, pagination, export, columns) is outside the grid and stays as it is.
2. The active position is a cell, not only a row: Left and Right move by column, Up and Down (and J, K) by row, Home and End to the row's ends, Ctrl+Home and Ctrl+End to the table's corners. Up from the first row reaches the header row. The active cell shows the focus ring.
3. Enter on a cell acts on what is in it: one control → it is activated (a sort button sorts, a link opens, a checkbox toggles); several controls → focus moves into the cell, Tab moves between its controls and then returns to the grid, Escape returns at once. A header's resize handle does not count as a second control: Enter on a header sorts, F2 goes into the cell and Tab reaches the handle. An empty cell keeps today's row action. On editable tables the cell under the keyboard is the selected cell, so today's edit keys apply; there Tab moves to the next cell and leaves the table at the end of the row (on other tables Tab always leaves).
4. While focus is inside a cell's control, all of the grid's own keys stand down, not only Enter and Space.
5. A change of order is announced through the shared announcer ("Sorted by Name, ascending" / "Sorting removed").

### 2. Charts: a name, the data, and the actions

6. `ariaLabel` is required by type on `Chart`; the 24 unnamed charts get a translated name. Sparklines take either a name or `decorative` (hidden from assistive technology); the type requires one of the two.
7. The data table behind the disclosure also exists for pie (name, value, share), sankey (from, to, value; node names as the chart labels them) and scatter (series or point name and its two values; positions on a category axis read as the category; the first 200 points, with a line saying so when there are more).
8. Legend toggles and item actions become real buttons. Chosen as closest to today's look: the canvas legend stays; a matching row of toggle buttons (`aria-pressed`) lies over the chart's bottom edge and is visible only while it holds keyboard focus; pressing one sends the engine the same action a legend click does. Where a chart reacts to a click, the marks in its data table (bar values, pie slices, sankey nodes, scatter points) are buttons that call the same handler with the same fields.

### 3. Workshop: everything the pointer can do, from the list

Chosen: the equivalent list, not focusable canvas nodes (the nodes have no DOM, and a list is what a screen reader can read).

9. The palette's agents and elements get an "Add to canvas" action (Enter); the item lands at the next free place in view and is announced.
10. The list shows elements as well as agents. Each row offers: Move (arrow keys move it, Enter drops, Escape puts it back; announced, as on the boards), Link to… (agents; choose the other agent, then today's relationship prompt), Open and Remove (elements).
11. The toolbar gains zoom in, zoom out and reset view; the canvas takes focus (one Tab stop) and pans with the arrow keys, zooms with + and −, resets with 0. "Reset view" replaces the "fit" of the first draft: the canvas has no fit-to-content today, and a reset is the same in all three view modes.
12. Both right-click menus (agent, element) become the house context menu (arrows, Home/End, Enter and Space, Right into a submenu, Escape returns focus); the two bespoke menus are deleted. The same actions are in each list row's "More actions" menu, so a keyboard user does not need the right-click at all.

Invariants: pointer behaviour, the look of tables, charts and the canvas at rest, and all 57 table callers' props are unchanged; no new dependency; every new string through paraglide (en + es); semantic tokens only.

### What users see

| # | Today | After |
|---|---|---|
| 1 | Tab walks through every button of a table | Tab enters the table once; arrows move cell by cell, with the focus ring on the active cell |
| 2 | Sorting gives no spoken feedback | "Sorted by …" is announced |
| 3 | Charts read as "Chart"; pie charts have no data | Each chart has a name and a data table |
| 4 | Chart legend and drill-down need a mouse | A row of series buttons appears on keyboard focus; table rows carry the drill-down button |
| 5 | Workshop: adding, moving and linking need a mouse | The same from the list, plus zoom buttons in the toolbar |

**Demo (PR A)**: FigCraft `table-grid.figcraft` (page "Spec 154 · table"), exports in `demo/`, preview https://claude.ai/artifact/19cyCSxqNDd2415C8SSF5a. Approved in advance (quote above).

**Demo (PR B)**: FigCraft `charts.figcraft` (page "Spec 154 · charts"), exports in `demo/`, preview https://claude.ai/artifact/DFswovcVdtkHhioQNUeujq. Approved in advance (quote above).

**Demo (PR C)**: FigCraft `workshop.figcraft` (page "Spec 154 · workshop"), exports in `demo/`, preview https://claude.ai/artifact/WZjzQDRQX2zpXMoy34GhKh. Approved in advance (quote above).

## Delivery: three hub PRs, each mergeable alone

| PR | What | Proof |
|---|---|---|
| A | Table (TO-BE 1–5) | `assertPattern(grid)` on the mounted table; tests that fail on today's code for Tab count, header reach, Enter in single- and multi-control cells, virtualised remount; real keys on a Storybook build; the grid story's 8 ledger rows removed |
| B | Charts (TO-BE 6–8) | type check (a caller without a name does not compile); chart a11y tests extended for the three new tables, the series buttons and the row buttons; real keys on a Storybook build |
| C | Workshop (TO-BE 9–12) | the house context menu is already covered by `assertPattern(menu)`; mounted tests for the list (move, link, open, remove); real keys on a local build that mounts the real toolbar, palette and canvas (Pixi renderer, physics) with two synthetic agents — the workshop needs gateway agents, which the local QA stack does not have |

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | Grid controls leave the Tab order; one attachment owns `tabindex=-1` for focusables inside the grid and re-applies it when rows mount. | test: Tab from the wrapper lands outside the table; holds after scrolling a virtualised table |
| D2 | Active column beside the active row; `aria-activedescendant` names the cell; header row is row 0; Home/End/Ctrl+Home/Ctrl+End bound. | `assertPattern(grid)` |
| D3 | Enter on the active cell: activate the single control, or enter a multi-control cell (Tab cycles inside, Escape returns). | tests per case; real keys: sort from the header, "Revoke" in the API keys story |
| D4 | The `cellControlFocused` guard covers every grid key. | test: Down in an open in-cell menu does not move the row |
| D5 | `toggleSort` announces the new order. | test reads the shared announcer |
| D6 | `ariaLabel` required; 24 callers and 7 sparklines updated. | `bun run check` |
| D7 | Table builders for pie, sankey, scatter. | chart a11y tests |
| D8 | Series buttons (focus-revealed) and row buttons call the same handlers as the canvas events. | tests + real keys |
| D9 | Palette "Add to canvas"; list rows for elements; Move / Link / Open / Remove. | mounted tests; real keys on the QA stack |
| D10 | Zoom buttons; canvas region focusable, arrows pan. | mounted tests; real keys |
| D11 | Context menu on the shared menu pattern. | `assertPattern(menu)` |

## Requirements

- **FR-001**: A table MUST be one Tab stop, and every cell and every control inside it MUST be reachable and operable with the keyboard alone.
- **FR-002**: A change of sort order MUST be announced.
- **FR-003**: Every chart MUST have a specific accessible name and a data alternative; every chart action MUST be operable by keyboard.
- **FR-004**: Every workshop action available to the pointer MUST be available from the keyboard.
- **FR-005**: No pointer behaviour and no caller's props may change; no new dependency; new strings in en and es.
- **FR-006**: `bun run a11y` MUST pass with no baseline rising; the grid story's 8 rows MUST reach 0.

## Success Criteria

- **SC-001**: Tab stops inside a table's grid: 1 (today: one per control).
- **SC-002**: Charts without a specific name: 0 (today 24 of 28); chart kinds without a data table: 0 (today 3).
- **SC-003**: Workshop pointer-only actions: 0 (today 6).
- **SC-004**: Every check on each hub PR is green; real-key proof on the final commit.

## Out of Scope

- Pixel view: dragging a character to another seat stays pointer-only (ledger item 19). Add, zoom, pan, select and assign work there from the keyboard.
- The floating bulk-action bar that appears while rows are selected sits inside the table's scroll area and keeps its own Tab stops (it is a toolbar, not a cell).
- Header drag-to-reorder by keyboard (the column menu already reorders); table mode (`interactionMode="table"`, no production caller).
- Screen-reader spoken-output tests, hard-coded labels, toast roles (S6).
- The story-test lane's missing Tailwind (proposal `2026-11-23-storybook-vitest-css-producer-parity`); S5 changes no colour.
- The 15 text fields without a focus ring (lint baseline from S4): unchanged here; they stay recorded.
