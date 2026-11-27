# Tasks: hygiene (a11y S6)

**Input**: spec.md, review.md, plan.md. Paths are in `minion_hub`.

## PR A — names (`feat/155-names`)

- [x] T001 Literal `aria-label` / `ariaLabel` / `alt` and English words in label expressions → messages (en + es)
- [x] T002 `DataTable.ariaLabel` required; 56 call sites named
- [x] T003 design-lint rules `hardcoded-a11y-name` (baseline 0) and `hardcoded-hint-text` (baseline = today's count)
- [x] T004 Gates; accessibility tree read in a real browser (es); PR — hub #753, merged `8b241b7f`

## PR B — alerts and toasts (`feat/155-alerts`)

- [x] T005 Shared pieces: load errors and field messages → `status`; field messages tied to their field
- [x] T006 Call sites from the classification: on-load text, load panels
- [x] T007 Toasts spoken by the shared announcer (errors assertive); translated label
- [x] T008 Five private live regions → `announce()`
- [x] T009 Tests; gates; real-browser roles before / after; PR — hub #754, merged `75730745`

## PR C — workshop panels (`feat/155-workshop-dialogs`)

- [ ] T010 Five panels on the shared `Dialog`; remove `overlayFocus`
- [ ] T011 Demo; `assertPattern(dialog)`; real keys on the local real-renderer build; PR

## PR D — snapshot tests (`feat/155-aria-snapshots`)

- [ ] T012 Fixture with DataTable, calendar, BoardView, Picker, command palette (fixed data and clock)
- [ ] T013 Snapshots + suite in the specs gate; deliberate-break run; PR
