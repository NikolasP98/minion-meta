# Tasks: composites (a11y S5)

**Input**: spec.md, review.md, plan.md. Paths are in `minion_hub`.

## PR A — table (`feat/154-table-grid`)

- [ ] T001 Active column beside the active row; `aria-activedescendant` names the cell; header row reachable
- [ ] T002 Left / Right / Home / End / Ctrl+Home / Ctrl+End; editable tables: the active cell is the selection
- [ ] T003 Attachment: in-grid focusables `tabindex=-1`, re-applied when rows mount
- [ ] T004 Enter: activate a single control, enter a multi-control cell (Tab cycles, Escape returns)
- [ ] T005 All grid keys stand down while a cell's control has focus
- [ ] T006 Sort announcement (en + es)
- [ ] T007 Tests: `assertPattern(grid)`, Tab count, header reach, Enter cases, virtualised remount; ledger rows of the grid story removed
- [ ] T008 Demo; gates; real keys on a Storybook build; PR

## PR B — charts (`feat/154-charts`)

- [ ] T009 `ariaLabel` required; 24 call sites named (en + es); sparklines: name or `decorative`
- [ ] T010 Data tables for pie, sankey, scatter
- [ ] T011 Series buttons (focus-revealed, `aria-pressed`) and row buttons for drill-down
- [ ] T012 Chart a11y tests extended; demo; gates; real keys; PR

## PR C — workshop (`feat/154-workshop-keys`)

- [ ] T013 Palette "Add to canvas"
- [ ] T014 List: elements; Move / Link to… / Open / Remove, announced
- [ ] T015 Toolbar zoom in / out / fit; canvas region focusable, arrows pan
- [ ] T016 Context menu on the shared menu pattern; `assertPattern(menu)`
- [ ] T017 Mounted tests; demo; gates; real keys on the local QA stack; PR
