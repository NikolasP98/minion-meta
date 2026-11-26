# Tasks: hygiene (a11y S6)

**Input**: spec.md, review.md, plan.md. Paths are in `minion_hub`.

## PR A — names (`feat/155-names`)

- [ ] T001 Literal `aria-label` / `ariaLabel` / `alt` and English words in label expressions → messages (en + es)
- [ ] T002 `DataTable.ariaLabel` required; 56 call sites named
- [ ] T003 design-lint rules `hardcoded-a11y-name` (baseline 0) and `hardcoded-hint-text` (baseline = today's count)
- [ ] T004 Gates; accessibility tree read in a real browser (es); PR

## PR B — alerts and toasts (`feat/155-alerts`)

- [ ] T005 Shared pieces: load errors and field messages → `status`; field messages tied to their field
- [ ] T006 Call sites from the classification: on-load text, load panels
- [ ] T007 Toaster mounted eagerly; error toasts assertive; translated label
- [ ] T008 Five private live regions → `announce()`
- [ ] T009 Tests; gates; real-browser roles before / after; PR

## PR C — workshop panels (`feat/155-workshop-dialogs`)

- [ ] T010 Five panels on the shared `Dialog`; remove `overlayFocus`
- [ ] T011 Demo; `assertPattern(dialog)`; real keys on the local real-renderer build; PR

## PR D — snapshot tests (`feat/155-aria-snapshots`)

- [ ] T012 Fixture with DataTable, calendar, BoardView, Picker, command palette (fixed data and clock)
- [ ] T013 Snapshots + suite in the specs gate; deliberate-break run; PR
