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
- [ ] T010 Gates in the foreground, signed commit, hub PR, every check green, baselines ratcheted

## PR B — menus and lists (`feat/152-menus`)

- [x] T011 [B1] `src/lib/a11y/roving.ts` + unit tests
- [x] T012 [B2] `ui/Dropdown.svelte`: items `tabindex="-1"`; remove the waiver in `SessionKanban.mounted.test.ts` and the `TODO(handoff)`
- [x] T013 [B3] `ui/ContextMenu.svelte`: helper keys, roving stop, skip disabled rows, focus return
- [x] T014 [B4] `ui/MultiSelectFilter.svelte`: listbox keys and name, translated labels (`common_all`, `common_removeNamed` in en + es), 24 px remove target
- [x] T015 Tests: `menus.a11y.mounted.test.ts`
- [ ] T016 Gates in the foreground, signed commit, hub PR, every check green, baselines ratcheted

## PR C — board moves · PR D — status and labels · PR E — hand-rolled modals

Tasks are added here when each PR starts.
