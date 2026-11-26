# Spec 146 review — two passes, 2026-11-23

Reviewer: the implementing agent, against hub master `896da2e0` (the board files are unchanged since `5347ff01`).

## Pass 1 — is the AS-IS true, and does BoardView really fit?

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| 1 | `KanbanCol` and `TaskCard` have no caller besides `SessionKanban` and their own two stories. | `grep -rn "KanbanCol\|TaskCard" src` | They are deleted (FR-009); six stale story rows leave the accessibility ledger. |
| 2 | `BoardView` styles a card's inner layout through `.bcard > span`, a rule written for the Button's inner span. On a non-button card it would stack the task's status dot above its title. | first Chromium render of the built component | The rule is narrowed to button/link cards; the dot sits beside the title as in the demo. |
| 3 | After a move `BoardView` focuses `.bcard`. A plain card cannot take focus. | `BoardView.svelte` `moveTo` | Focus goes to the card's button when it has one, else to its "Move to…" trigger (FR-004). |
| 4 | The move menu is the shared `Dropdown`; its items stay in the Tab order (no `tabindex="-1"`), so an open menu has one tab stop per item. | `assertPattern(menu)` reports `one-tab-stop` | Hub-wide Dropdown debt, out of scope here: waived visibly in the test, `TODO(handoff)` at the site, entry in the program's ledger. |
| 5 | The demo's first menu frame showed coloured dots and a check mark the shared menu does not draw. | Chromium render | Frame corrected; recorded next to the approval. The other boards' menus stay identical. |
| 6 | `moveTask` returned nothing, so `BoardView` would announce "moved" even when the save failed. | `SessionKanban.svelte` | It returns `false` on a refused save; the failure is announced (US1.2). |

## Pass 2 — complete, consistent, testable?

| # | Finding | Outcome |
|---|---|---|
| 7 | "The three existing boards are unchanged" needs a test, not only a claim. | A `BoardView` test pins the defaults (button cards, no fit class, the unset column); the existing BookingBoard keyboard test passes untouched. |
| 8 | The spec did not say how the 190 px column limit survives. | The host wraps the board in a 15 rem cap; the columns scroll inside it. Stated as a small visible change (cap is on the whole board strip, 240 px, not on each column body). |
| 9 | Constitution IV: no new string, route, API or permission. | Confirmed: only existing Paraglide keys are used. |
| 10 | The proposal's S1 has three gaps; this spec covers one. | Stated in the scope note and out of scope. |
