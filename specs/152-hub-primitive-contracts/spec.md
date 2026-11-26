---
status: implementing
verdict: approved
created: 2026-11-26
updated: 2026-11-26
repos: [minion_hub]
tags: [ui, test]
source_proposal: 2026-11-20-hub-accessibility-program
source_item: S3 (with the S1 leftovers)
---

# Feature Specification: Primitive contracts — every shared widget keeps the keyboard and tells assistive technology what it is

**Feature Branch**: `152-hub-primitive-contracts`; hub branches `feat/152-*`, one per widget family; hub PR base `master`.

**Created**: 2026-11-26

**Status**: Approved in advance. Owner (2026-11-26, verbatim): "fold the S1 leftovers into S3, then implement all slices directly, your work is fully approved to go live." Where a choice is open, the option closest to today's look and behaviour that passes WCAG 2.2 AA is taken and stated.

**Input**: Slice S3 "Primitive contracts" of the hub accessibility program, plus the S1 leftovers: NavigationGuardModal, CommandPalette, the shared Dropdown's tab order, and keyboard drag in BoardView (owner decision 2026-11-20).

## Delivery: five hub PRs, each green and mergeable on its own

One hub PR would touch about forty components. The slice ships by widget family:

| PR | Family | Gaps |
|---|---|---|
| A | Dialogs | 1 NavigationGuardModal, 2 CommandPalette, 8 DraggableWindow, 14 Dialog / ConfirmDialog |
| B | Menus and lists | Dropdown tab order (ledger 10), 12 ContextMenu, 9 MultiSelectFilter |
| C | Board moves | one shared announcer with translated messages; keyboard drag in BoardView |
| D | Status and labels | 14 chip remove label, 15 Spinner / Skeleton status, icon-only buttons need a label |
| E | Hand-rolled modals | prior ledger HC-028 rows #3–#10, U2, U10 |

## AS-IS (hub master `83d9f28e`, read 2026-11-26)

### A — Dialogs

| Fact | Anchor |
|---|---|
| The "unsaved changes" prompt on Settings is a hand-rolled `div`: no dialog role, no name, focus neither moves in nor returns, nothing outside is inert, and the inner panel's `onkeydown` stops propagation, so **Escape never reaches** the handler that would cancel. One caller. | `src/lib/components/config/NavigationGuardModal.svelte:16-21,23-36`; `src/routes/(app)/settings/+page.svelte:306` |
| The command palette (Ctrl/Cmd+K) is a `div` overlay: not a dialog, the page behind stays reachable, the input is named only by its placeholder, the result list is a `listbox` the input does not point at (no `combobox`, `aria-controls`, `aria-activedescendant`), options have no ids, and focus does not return to where it was on close. | `src/lib/components/layout/CommandPalette.svelte:141-146,151-180,183-221` |
| The shared `Dialog` is a native modal `<dialog>` that returns focus and is named through `aria-labelledby`; a missing name is caught only at run time, when it opens. It has no way to say it is an `alertdialog`. | `src/lib/components/ui/foundations/Dialog.svelte:69-71,216-225,270-285`; `dialog.ts:1-5` |
| `ConfirmDialog` renders through `Dialog` as a plain dialog; its message is not the dialog's description; first focus falls on the close button or the first control, not on the safe action. 20 call sites. | `src/lib/components/ui/foundations/ConfirmDialog.svelte:82-106` |
| `DraggableWindow` is a non-modal `role="dialog"`; it does not move focus in when it opens or back when it closes. | `src/lib/components/ui/foundations/DraggableWindow.svelte:233-241` (no `focus()` call in the file) |

### B — Menus and lists

| Fact | Anchor |
|---|---|
| The shared `Dropdown` renders its items as buttons or links without `tabindex="-1"`: an open menu has one tab stop per item. | `src/lib/components/ui/Dropdown.svelte:108-124` (`TODO(handoff)`); `assertPattern` on the session board menu |
| `ContextMenu` has arrows and Escape but no Home / End / type-ahead, and does not return focus to what opened it. | `src/lib/components/ui/ContextMenu.svelte:101-139,183` |
| `MultiSelectFilter`: options are tab stops with no arrow keys; `aria-haspopup` sits on an inner span; the remove label is hard-coded English ("Remove …"); the remove target is 14 px. | `src/lib/components/ui/MultiSelectFilter.svelte:54-55,80-126,154-158` |

### C — Board moves

| Fact | Anchor |
|---|---|
| `BoardView` moves cards by menu or mouse drag and announces through its own live region; there is no keyboard drag. | `src/lib/components/data-view/BoardView.svelte` (`moveTo`, `aria-live`) |
| Announcements are scattered: each component owns a live region; there is no shared announcer. | proposal AS-IS: 30 `aria-live`, 79 `role=status`, 125 `role=alert` |

### D — Status and labels

| Fact | Anchor |
|---|---|
| A chip's remove button is labelled "Remove" with no chip name. | `src/lib/components/ui/Chip.svelte:47` |
| The hub `Skeleton` adapter cannot take a label, so a loading placeholder is silent; `Spinner` announces only when given `label`. | `src/lib/components/ui/Skeleton.svelte:3-8`; `Spinner.svelte:8` |
| `IconButton` (label required by type) exists; most icon-shaped `Button` uses do not use it. | `packages/ui/src/lib/IconButton.svelte:6`; proposal correction table |

### E — Hand-rolled modals (prior ledger)

Eight components draw their own modal or `aria-modal` layer instead of the shared `Dialog`: `agents/SectionProseEditor`, `agents/AgentSettingsPanel`, `builder/AgentCreateWizard`, `marketplace/AgentCreatorWizard` (no Escape path), `workshop/RelationshipPrompt`, `my-agent/EaselBoard`, `my-agent/ZenMode`, `layout/BugReporter`; `builder/SkillCreateWizard` can be dismissed while it is creating. Anchors: proposal "Prior ledger merged in".

## TO-BE

Every shared widget follows its WAI-ARIA Authoring Practices pattern and `assertPattern` proves it:

- **A.** The unsaved-changes prompt and the command palette are real modal dialogs: named, the page behind inert, Escape closes, focus returns. The palette's input is a `combobox` that controls its list and names the active option. A confirmation is an `alertdialog` described by its message, with first focus on the safe action. A dialog without a name is a type error. `DraggableWindow` moves focus in and back.
- **B.** An open menu or list is one tab stop; arrows, Home, End and type-ahead move inside it; closing returns focus. The multi-select filter is a real listbox with 24 px targets and translated labels.
- **C.** One shared announcer speaks every move in the user's language. A card can be picked up with Space or Enter, moved with the arrows, dropped with Space or Enter, and cancelled with Escape; the "Move to…" menu stays.
- **D.** Remove buttons name what they remove; loading placeholders announce; an icon-only button cannot be written without a label.
- **E.** The eight hand-rolled modals render through the shared `Dialog`.

Invariants: no feature is removed; the Agenda, POS and session boards keep their menu; visual design is unchanged except where stated per PR under "What users see".

### What users see (PR A)

| # | Today | After |
|---|---|---|
| 1 | Unsaved-changes prompt: custom card; Escape does nothing; Tab can leave it | The shared dialog look (title bar, three actions in the footer); Escape and the backdrop cancel; focus starts on Cancel and returns to the page |
| 2 | Command palette | Same look and position. The page behind cannot be reached while it is open; focus returns to where it was |
| 3 | Confirmation dialogs | Same look. First focus is on Cancel instead of the close button |
| 4 | Floating windows | Same look. Focus moves into the window when it opens and back when it closes |

## DELTA (PR A)

| # | Transition | Proof |
|---|---|---|
| A1 | `Dialog` gains `role` (`dialog` / `alertdialog`), a `bare` presentation (the caller draws the surface) and a name required by type. | mounted tests; `bun run check` over all 32 `Dialog` and 20 `ConfirmDialog` call sites |
| A2 | `ConfirmDialog` = `alertdialog`, `aria-describedby` its message, first focus on Cancel. | `assertPattern(alertdialog)` |
| A3 | `NavigationGuardModal` renders through `Dialog` as an `alertdialog` with its three actions. | `assertPattern(alertdialog)`; Escape cancels; one caller unchanged |
| A4 | `CommandPalette` renders through `Dialog` (`bare`) with a `combobox` input. | `assertPattern(dialog)` and `assertPattern(combobox)`; focus returns |
| A5 | `DraggableWindow` moves focus in on open and back on close. | mounted test |

PRs B–E get their own DELTA tables in this spec when they start.

## Requirements

- **FR-001**: Every overlay MUST be a named dialog; a modal one MUST make the rest of the page inert, close on Escape and return focus to its opener.
- **FR-002**: A confirmation MUST be an `alertdialog` described by its message, with first focus on the action that loses nothing.
- **FR-003**: A `Dialog` without `title` or `labelledBy` MUST fail type-checking.
- **FR-004**: A composite (menu, listbox, combobox popup) MUST be one tab stop and support its pattern's keys.
- **FR-005**: A card on any board MUST be movable with the keyboard both from the menu and by pick-up / arrows / drop, each step announced in the user's language.
- **FR-006**: Remove buttons MUST name their target; loading placeholders MUST be announced.
- **FR-007**: No feature removed; no new dependency; semantic tokens only; new strings through Paraglide.
- **FR-008**: `bun run a11y` MUST pass with no baseline rising; baselines are ratcheted to the measured counts.

## Success Criteria

- **SC-001**: `assertPattern` passes for each widget named in the PR's DELTA.
- **SC-002**: Escape closes the unsaved-changes prompt (it does nothing today).
- **SC-003**: Every check on each hub PR is green.
- **SC-004**: No accessibility baseline rises.

## Out of Scope

- Focus rings and contrast (S4); DataTable, charts and the workshop canvas (S5); hard-coded labels app-wide and screen-reader tests (S6).
