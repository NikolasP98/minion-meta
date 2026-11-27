---
status: shipped
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

| A6 | Everything that found a confirmation by `role="dialog"` follows it: two mounted tests, the flow canvas' "is focus inside a dialog" guard, the component registry (`bare`). `Dialog` also states `aria-modal="true"` (it is always opened with `showModal()`). | the same tests; `route-design-contracts.test.ts` |

**Demo (PR A, the one visible change)**: FigCraft `dialogs.figcraft` (page "Spec 152 · dialogs"), exports in `demo/`, preview https://claude.ai/artifact/LovomP1YjHjtuKhpQtNMBy. Approved in advance by the owner 2026-11-26: "fold the S1 leftovers into S3, then implement all slices directly, your work is fully approved to go live."

## DELTA (PR B — menus and lists)

Nothing changes to the eye: the remove button keeps its 14 px look and gains a 24 px pointer target through an invisible hit area, so no demo is needed.

| # | Transition | Proof |
|---|---|---|
| B1 | One shared helper, `$lib/a11y/roving` (`rovingTarget`, `setRovingStop`): arrows wrap, Home / End, type-ahead, one tab stop. | unit tests |
| B2 | `Dropdown` items leave the Tab order (`tabindex="-1"`); the menu is one tab stop. Closes proposal ledger item 10. | `assertPattern(menu)` on the session board menu, waiver removed |
| B3 | `ContextMenu`: Home / End / type-ahead through the helper, one tab stop across submenus, a disabled row is skipped, focus returns to what had it before the menu opened. | `assertPattern(menu, { opener, typeahead })` |
| B4 | `MultiSelectFilter`: the list is a named `listbox` with one tab stop, arrows, Home / End and type-ahead; "Remove …" and the default "All" are translated; the remove target is 24 px. | `assertPattern(listbox, { typeahead })`; label test |

## DELTA (PR C — board moves)

Open choice taken (closest to today that passes): **Space** picks a card up; **Enter** keeps opening the record on boards whose cards open one (Agenda, catalog), and picks up only where a card has nothing to open (session tasks). Cards have no order inside a column (the write is "row → column"), so Up / Down do nothing; the owner's "Up/Down within a column" needs an order field first and is logged in the proposal ledger.

| # | Transition | Proof |
|---|---|---|
| C1 | One shared announcer, `$lib/a11y/announce` (`announce(text, politeness)`): one polite and one assertive live region for the page, moved inside the open modal dialog while one is open (the rest of the page is inert there). | `announce.mounted.test.ts` |
| C2 | `BoardView`, `FieldsList` and `EditableGrid` speak through it; their private live regions are removed. All text was already translated. | their mounted tests |
| C3 | `BoardView` keyboard drag: Space picks up, Left / Right choose the column (same highlight as a mouse drag), Space or Enter drops with the same single write as the menu, Escape or leaving the card cancels; each step is announced. A card with nothing to open becomes the pick-up control (`role="button"`, `aria-pressed`). | `board-view.mounted.test.ts` (4 tests) |

**Demo (PR C)**: FigCraft `board-moves.figcraft` (page "Spec 152 · board moves"), exports in `demo/`, preview https://claude.ai/artifact/TvT1eRxdweFKmd1cZ7TtiK. Approved in advance by the owner 2026-11-26 (same quote as PR A).

## Correction after PR A went live (2026-11-26)

PR A (hub #737, master `b9b263be`) shipped a defect: the command palette opened but never finished closing (Escape, a click outside, or picking a command). The shared `Dialog` closes on the exit animation's `animationend`; the new `bare` presentation has no exit animation. The mounted test dispatched `animationend` by hand, so it passed, and master CI was green. Found on production with real key presses; fixed by hub #740 (a `bare` dialog closes immediately; the palette's "no results" state is a status message, not an empty listbox, which the stuck palette had hidden from the story gate).

**Proof rule from here on (coordinator, 2026-11-26):** every PR of this slice is exercised with real key presses in a real browser before it is reported ready — a Storybook built from the PR's commit, driven through the browser's input layer — and the report says what was pressed and seen. A test that fires the event a component is supposed to produce itself is not proof. The app on a Vercel preview is not reachable for this (Vercel login, then an app sign-in on another origin).

What the real-key runs found that unit tests had passed:

| PR | Found | Fix |
|---|---|---|
| A | palette never closed | hub #740 |
| B | with items out of the Tab order, Tab did nothing in an open dropdown (the menu is portalled to the end of the page) | Tab closes the menu and returns to its trigger |
| C | a cancelled Space pick-up swallowed the next Enter on the card (Chrome fires no click for a prevented Space) | the suppression ends when the key is released |

## DELTA (PR D — status and labels)

Nothing changes to the eye.

| # | Transition | Proof |
|---|---|---|
| D1 | A chip's × is named "Remove <chip text>" (its own label plus the chip's label, by id): `Chip`, `TagChip` ("Remove tag <name>"), `FilterChip` ("Remove filter <field>"), and the chat composer's context and mention chips. No caller changes. | mounted test; real-key run |
| D2 | The hub `Skeleton` adapter takes `label`: announced as a status with it, hidden from assistive technology without it. `CollectionState` already labels its loading region. `Spinner` already works this way. | mounted test |
| D3 | New design-lint rule `icon-button-unlabelled`, baseline 0: an icon-only `<Button>` without `aria-label`, `aria-labelledby` or `title` fails the lint. Measured today: 250 icon-only buttons, all labelled. | `scripts/design-lint.test.ts` |

## DELTA (PR E — hand-rolled modals, in three parts)

None of the eight components had a story, so none could be exercised in a real browser; several change their look when they move onto the shared dialog. The family ships in three hub PRs.

| # | Transition | Proof |
|---|---|---|
| E1.1 | `BugReporter` is a named non-modal dialog (`aria-modal="false"`): the page stays usable by design. | one attribute; existing tests |
| E1.2 | `SkillCreateWizard` cannot be dismissed (Escape, backdrop, ×) while it is creating. | two props on the shared `Dialog` |
| E1.3 | Stories for `ConfirmDialog` and `DraggableWindow`, the two widgets PR A changed without real-key proof. | real-key run: alert dialog opens with focus on Cancel, Escape returns focus; the window takes focus and gives it back |
| E2a | `workshop/RelationshipPrompt` renders through `Dialog` (`bare`) with a new `backdrop="clear"` option on the shared dialog (no dim, no blur, still modal). **Look unchanged** (same card at the same anchor, canvas visible), so no demo. A submit is not also reported as a cancel, and Enter is consumed on submit. Hub #744. | real-key run on the new story: named modal, transparent backdrop, card centred on its anchor, focus in the field, Enter submits once and stays closed, Escape and a click outside cancel |
| E2b | `agents/SectionProseEditor`, `builder/AgentCreateWizard`, `marketplace/AgentCreatorWizard` render through `Dialog` (`bare`) and keep their own surface. The `bare` presentation becomes size-neutral (it follows `size`) with an explicit `align="top"` that only the command palette uses; in `bare`, only the caller's surface takes the pointer, so a click beside it is a click outside. **Look unchanged.** Behaviour that changes: with unsaved edits, dismissing the prose editor asks before discarding (it used to drop them on a stray click); the marketplace wizard gains an Escape path; the builder wizard cannot be dismissed while it is creating. | real-key run on three new stories: named modals centred at 800 / 480 / 512 px, Tab stays inside, Escape and a click outside close with focus back; palette still 137 px from the top at 512 px wide |
| E3 | `agents/AgentSettingsPanel` (680 px drawer), `my-agent/EaselBoard` and `my-agent/ZenMode` (full screen) are real modals: each keeps its own fixed surface inside `Dialog` (`bare`, clear backdrop), so no new dialog API and **the look is unchanged**. The easel board and focus mode keep their own Escape logic (deselect first / close the polish menu first). The drawer's panel becomes a sibling of its backdrop, on the same layer. | real-key run on three new stories: full-screen surfaces 1440×913, drawer at the right edge 680 px wide, 40 Tab presses never reach the page behind, Escape closes with focus back; a click inside the drawer keeps it open, a click on the backdrop closes it |

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
