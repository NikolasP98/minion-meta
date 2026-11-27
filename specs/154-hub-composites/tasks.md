# Tasks: composites (a11y S5)

**Input**: spec.md, review.md, plan.md. Paths are in `minion_hub`.

## PR A — table (`feat/154-table-grid`)

- [x] T001 Active column beside the active row; `aria-activedescendant` names the cell; header row reachable
- [x] T002 Left / Right / Home / End / Ctrl+Home / Ctrl+End; editable tables: the active cell is the selection
- [x] T003 Attachment: in-grid focusables `tabindex=-1`, re-applied when rows mount
- [x] T004 Enter: activate a single control, enter a multi-control cell (Tab cycles, Escape returns)
- [x] T005 All grid keys stand down while a cell's control has focus
- [x] T006 Sort announcement (en + es)
- [x] T007 Tests: `assertPattern(grid)`, Tab count, header reach, Enter cases, virtualised remount; ledger rows of the grid story removed
- [x] T008 Demo; gates; real keys on a Storybook build; PR = hub #748

## PR B — charts (`feat/154-charts`)

- [x] T009 `ariaLabel` required; 24 call sites named (en + es); sparklines: name or `decorative`
- [x] T010 Data tables for pie, sankey, scatter
- [x] T011 Series buttons (focus-revealed, `aria-pressed`) and row buttons for drill-down
- [x] T012 Chart a11y tests extended; demo; gates; real keys; PR = hub #749

## PR C — workshop (`feat/154-workshop-keys`)

- [x] T013 Palette "Add to canvas"
- [x] T014 List: elements; Move / Link to… / Open / Remove, announced
- [x] T015 Toolbar zoom in / out / reset view; canvas region focusable, arrows pan
- [x] T016 Context menu on the shared menu pattern; `assertPattern(menu)`
- [x] T017 Mounted tests; demo; gates; real keys on a local build with the real renderer; PR = hub #751
