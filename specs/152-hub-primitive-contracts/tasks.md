# Tasks: primitive contracts (a11y S3)

**Input**: spec.md, review.md, plan.md. Paths are in `minion_hub`.

## PR A — dialogs (`feat/152-dialogs`)

- [x] T001 Branch off fresh `origin/master`
- [x] T002 [A1] `ui/foundations/Dialog.svelte`: `role`, `bare` presentation, name required by type, `aria-modal`; `Sheet.svelte`, `ui/Modal.svelte` carry the type; registry gains `bare`
- [x] T003 [A2] `ConfirmDialog.svelte`: `alertdialog`, described by its message, first focus on Cancel
- [x] T004 [A3] `config/NavigationGuardModal.svelte` renders through `Dialog`
- [x] T005 [A4] `layout/CommandPalette.svelte` renders through `Dialog` (`bare`), input is a `combobox`
- [x] T006 [A5] `DraggableWindow.svelte`: focus in on open, back on close
- [x] T007 [A6] Followers of the role change: `checkout-money.mounted.test.ts`, `secrets-recovery.mounted.test.ts`, `flow-editor/FlowCanvas.svelte`
- [x] T008 Tests: `dialogs.a11y.mounted.test.ts`, `command-palette.a11y.mounted.test.ts`
- [x] T009 Demo: FigCraft as-is / to-be + preview for the unsaved-changes prompt
- [x] T010 Gates, signed commit, hub #737, merged `b9b263be`
- [x] T010a Hotfix hub #740: `bare` dialog closes without an exit animation; palette no-results is a status; story for the unsaved-changes prompt

## PR B — menus and lists (`feat/152-menus`)

- [x] T011 [B1] `src/lib/a11y/roving.ts` + unit tests
- [x] T012 [B2] `ui/Dropdown.svelte`: items `tabindex="-1"`; remove the waiver in `SessionKanban.mounted.test.ts` and the `TODO(handoff)`
- [x] T013 [B3] `ui/ContextMenu.svelte`: helper keys, roving stop, skip disabled rows, focus return
- [x] T014 [B4] `ui/MultiSelectFilter.svelte`: listbox keys and name, translated labels (`common_all`, `common_removeNamed` in en + es), 24 px remove target
- [x] T015 Tests: `menus.a11y.mounted.test.ts`
- [x] T016 Gates, real-key run (found: Tab did nothing in an open dropdown; fixed), signed commits, hub #738

## PR C — board moves (`feat/152-board-moves`)

- [x] T017 [C1] `src/lib/a11y/announce.ts` + test
- [x] T018 [C2] `BoardView`, `scheduling/FieldsList`, `dashboard/EditableGrid` use it
- [x] T019 [C3] `data-view/BoardView.svelte`: keyboard drag; 4 strings in en + es
- [x] T020 Tests + demo
- [x] T021 Gates, real-key run (found: a cancelled pick-up swallowed the next Enter; fixed), signed commits, hub #739

## PR D — status and labels (`feat/152-status-labels`)

- [x] T022 [D1] Named remove buttons: `ui/Chip`, `tags/TagChip`, `data-table/FilterChip`, `my-agent/ChatInput`
- [x] T023 [D2] `ui/Skeleton.svelte`: `label`
- [x] T024 [D3] `scripts/design-lint.mjs`: `icon-button-unlabelled`, baseline 0
- [x] T025 Tests
- [x] T026 Gates, real-browser run (names read from the accessibility tree), signed commit, hub #741

## PR E — hand-rolled modals

- [x] T027 [E1] `layout/BugReporter`, `builder/SkillCreateWizard`, stories `Overlays/ConfirmDialog` and `Overlays/DraggableWindow`; real-key run; hub #742
- [x] T028a [E2a] relationship prompt → `Dialog` (`bare`, `backdrop="clear"`) + story + real-key run; hub #744
- [x] T028b [E2b] prose editor, two agent wizards → `Dialog` (`bare`, size-neutral, `align`) + stories + real-key run
- [x] T029 [E3] agent settings drawer, easel board, focus mode → `Dialog` (`bare`, clear backdrop) around their own fixed surfaces + stories + real-key run
