# Spec 154 review — two passes, 2026-11-26

Reviewer: the implementing agent, against hub master `a845e693`. The AS-IS was read by a read-only agent and the anchors that decide the design were re-read by hand (`DataTable.svelte:846-852`, `:2451-2456`, `:2478-2490`, `:3745-3750`; `assert-pattern.ts:60-78`; `ContextMenu.svelte:60-72`; `WorkshopToolbar.svelte` has no zoom control).

## Pass 1 — is the AS-IS true, and does the mechanism hold?

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| 1 | The program's wording ("inner buttons `tabindex=-1`") suggests roving focus on cells. The table already keeps focus on the wrapper and names the active row with `aria-activedescendant`, and rows are virtualised: a focused row that scrolls out would lose focus. | `DT:3747-3758`, `DT:2478-2490` | Keep the wrapper as the one focus owner; extend the active position from row to cell. Controls get `tabindex=-1` and are entered with Enter. |
| 2 | Cell-level keys already exist, but only after a pointer selects a cell. | `DT:2723`, `DT:2847`, `DT:2883-2927` | On editable tables the keyboard's active cell becomes that same selection, so one set of edit keys serves both. Tables with `onRowActivate` (Picker) keep row activation on Enter in a cell without controls. |
| 3 | `tabindex=-1` set once in markup does not cover caller snippets (`cells`, `rowActions`: 24 and 12 callers). | recon count | One attachment on the grid sets it for whatever is focusable inside and repeats on mount of new rows. No caller changes. |
| 4 | A header cell holds up to three controls (sort, filter, resize). "Enter activates" is ambiguous there. | `DT:3895-3938` | Single control: Enter activates it. Several: Enter moves focus inside, Tab cycles within the cell, Escape returns (the grid pattern's own rule). |
| 5 | The leftover from #743: arrows and J/K do not yield to in-cell controls. | `DT:2451-2454` | Folded into TO-BE 4: all grid keys stand down while focus is inside a cell's control. |
| 6 | A chart is `role="img"`: nothing inside it can take focus. | `Chart.svelte:371-372` | Series and item buttons live outside the image, after it. |
| 7 | A DOM legend replacing the canvas legend would change the look of 28 charts with different legend positions. | recon | The canvas legend stays; the keyboard gets a matching button row that is visible only while focused. Stated as the chosen option. |
| 8 | Scatter is Cartesian but has no table either. | `Chart.svelte:107-177` | Included with pie and sankey. |
| 9 | Workshop nodes have no DOM, and the existing a11y suite does not mount the renderer. | `WC:1559`; fixture README | Equivalent list, not focusable nodes; PR C is proven on the local QA stack with the real renderer, not only on the fixture. |
| 10 | Pan and zoom are not content actions, but a sighted keyboard user cannot bring an agent into view without them. | `WC:898`, `WC:1132` | Zoom buttons and arrow-key pan are in scope. |

## Pass 2 — complete, consistent, testable?

| # | Finding | Outcome |
|---|---|---|
| 11 | 57 table instances change at once. | PR A is the table alone; `assertPattern(grid)` plus a Tab-count test on the stories with the most controls; full unit suite and every caller's test before push. |
| 12 | Requiring `ariaLabel` breaks compilation at 24 call sites. | Intended: the type check is the gate. All 24 named in the same PR, strings in en and es. |
| 13 | Focus-revealed buttons must be visible when focused and must not shift the layout. | They overlay the chart's bottom edge while focused; checked in the demo and with real keys. |
| 14 | "Move" for canvas items needs a step size and bounds. | One grid step per arrow, a larger step with Shift, clamped to the canvas bounds; the new position is announced. |
| 15 | Constitution IV: new strings (yes, paraglide en + es), routes (none), API (none), permissions (none: every new control calls an action the pointer already has, behind the same checks). | Stated in the plan. |
| 16 | The story contrast gate measures on a white page. | S5 changes no colour, so it is neutral here; recorded under Out of Scope. |
| 17 | Found with real keys on the Storybook build: on an editable table the spreadsheet Tab kept the focus in the table at the last cell (no next cell to move to). | Tab moves only while the row has a next cell; at the edge it leaves the table. Test added. |
| 18 | Found with real keys: a header holds a sort button and a resize handle, so "several controls" made Enter a two-step for the most common action. | The resize handle does not count; Enter sorts, F2 enters the cell. |
| 19 | A scatter chart can hold thousands of points; a table of all of them is unusable. | First 200 rows, followed by "Showing the first 200 of N points". |
| 20 | On a category axis a scatter point's number is the category's position, not a value. | The table prints the category. Test added. |
| 21 | Found by the gates: a raw `z-index` and a date printed outside the house formatter. | The button row needs no z-index (it follows the canvas in the DOM); dates go through `formatDate`. |
| 22 | Found with real keys (PR C): the house context menu never moved focus into a submenu in a real browser. `openSubmenu` looked for `[role="menu"] <row>` from the parent row's wrapper; a browser also matches ancestors outside the wrapper, so the parent row itself was the first match. The unit tests pass because the test DOM scopes the selector. It affects every user of the menu (the calendar's right-click menu). | Fixed in the shared component (PR C): the submenu is found as the wrapper's own child, and its first enabled row takes focus. |
| 23 | Found with real keys (PR C): the house context menu closed within the right-click that opened it on the canvas (it closes on a right-click outside itself). | The canvas opens it after that event has finished. |
| 24 | Found with real keys (PR C): replacing a row's menu by the move control lost both, and the closing menu's focus return ended the move at once. | The menu stays mounted (hidden) while its item moves; a move ends on blur only when focus is really elsewhere; focus returns to the row's menu after a drop. |
| 25 | A parent row of the house menu cannot be disabled; offline, "Start conversation" would still have opened its submenu. | Offline it is a plain disabled row. |

