---
status: implementing
verdict: approved
created: 2026-11-27
updated: 2026-11-27
repos: [minion_hub]
tags: [ui, test]
source_proposal: 2026-11-20-hub-accessibility-program
source_item: S6
---

# Feature Specification: Hygiene — translated names, alerts that only interrupt when they must, named tables, real dialogs, and a test that pins what a screen reader is given

**Feature Branch**: `155-hub-a11y-hygiene`; hub branches `feat/155-*`, PR base `master`.

**Created**: 2026-11-27

**Status**: Approved in advance. Owner (2026-11-26, verbatim): "fold the S1 leftovers into S3, then implement all slices directly, your work is fully approved to go live." Where a choice is open, the option closest to today's look that passes WCAG 2.2 AA is taken and stated. No user feature is removed and no dependency is added (see "Screen-reader tests" for the one decision put to the owner).

**Input**: Slice S6 "Hygiene" of the hub accessibility program: "Gap 13 hard-coded `aria-label` → paraglide + lint rule; gap 15 `role=alert` only for errors that need interruption, Toaster mounted eagerly; virtual-screen-reader tests for DataTable, Calendar, BoardView, Picker, CommandPalette." Plus the open items the earlier slices recorded: ledger 20 (tables all named "Table") and 21 (the five workshop element panels are not dialogs).

## AS-IS (hub master `49d4df6c`, read 2026-11-27; counts over the 855 production `.svelte` files)

| Fact | Anchor / evidence |
|---|---|
| 42 `aria-label` attributes are literal English in 28 files; 8 more are expressions with English words; 2 `ariaLabel` props and 1 `alt` are literal. In the Spanish UI a screen reader reads them in English. | `layout/BugReporter.svelte:93` (6 in the file), `layout/OrgPicker.svelte:114` (4), `agents/AgentPromptSimulator.svelte:565` (3), `users/MemberAccessControls.svelte:90` (`Remove ${roleName}`), `users/AccountNav.svelte:36` |
| 47 `title` and 48 `placeholder` attributes are literal too (about half of the placeholders are format examples such as "YYYY-MM-DD"). | `users/RbacRolesSection.svelte:893`, `routes/login/+page.svelte:337` |
| No check stops a new hard-coded name. | `scripts/design-lint.mjs:36` (17 rules, none about strings) |
| `role="alert"` is on 125 elements. An alert interrupts whatever the screen reader is saying. By reading their context: about 80 are errors that follow something the user just did (right use); about 20 are load-error panels; about 10 are field validation; about 9 are already on the page when it loads; 6 are banners. About 39 do not need to interrupt. Five shared pieces carry most of them. | `ui/foundations/AsyncBoundary.svelte:67`, `:85`; `data-table/DataTable.svelte:4031`; `ui/foundations/FormField.svelte:76`; `FormFieldset.svelte:42` |
| Toasts: the toast area is mounted lazily (after first idle), so a toast fired earlier has no live region to be announced in. Every toast is `role="status"`, errors included. The area's own label comes from the toast library in English. | `src/routes/+layout.svelte:198-199`; `layout/Toaster.svelte:17`; `state/ui/toast.svelte.ts:3-9` |
| Five components still own a hidden live region instead of using the shared announcer. | `scheduling/BookingCalendar.svelte:3504`, `data-table/custom-properties/CustomPropertyManager.svelte:1160`, `layout/GlobalActivity.svelte:33`, `:38`, `layout/SimulationFrame.svelte:55` |
| 56 of 57 tables are announced only as "Table": the name is optional and one caller passes it. Seen on production: two tables on Settings → Developers with the same name. | `data-table/DataTable.svelte:516`, `:4010`; `ui/Picker.svelte:735` (the one that names it) |
| The five workshop element panels (pinboard, message board, inbox, rulebook, portal) are hand-built layers: the backdrop is a `role="button"`, there is no dialog role or name, and Tab walks out behind the panel. S5 only moves focus in and back. | `workshop/PinboardOverlay.svelte:86-93`; `WorkshopCanvas.svelte` (`overlayFocus`, `TODO(handoff)`) |
| Nothing pins what a screen reader is given (names, roles, states) for the complex widgets; a rename or a lost role is caught only by hand. | no `toMatchAriaSnapshot` in the repo; `scripts/a11y.mjs:341` (two fixture suites) |

## TO-BE

### 1. Names are translated, and stay so (PR A)

1. Every literal accessible name (`aria-label`, `ariaLabel`, `alt`) goes through paraglide, en + es. English words inside label expressions too.
2. `DataTable` requires `ariaLabel`; the 56 tables get a specific name (the heading already above them where there is one).
3. A design-lint rule `hardcoded-a11y-name` fails on a literal `aria-label`, `ariaLabel` or `alt`: baseline 0. A second rule `hardcoded-hint-text` counts literal `title` and `placeholder` text (format examples exempt by pattern): baseline = today's count, decrease-only. Those 95 strings are visible text, not only accessible names; they are recorded, not all migrated here.

### 2. Alerts interrupt only when they must (PR B)

4. `role="alert"` stays where an error follows the user's own action (a failed save, a rejected form). It becomes `role="status"` (announced politely) on load-error panels and field validation messages, and is removed from text that is already on the page when it loads. The change is made once in the five shared pieces; the remaining call sites are edited one by one from the classification.
5. Field validation: the message is tied to its field (`aria-describedby`, `aria-invalid`), so it is read when the field takes focus; the form's own submit error stays an alert.
6. Every toast is spoken through the shared announcer, which exists from the first paint: a toast fired before the toast area has mounted is no longer lost. Error toasts are announced assertively, the rest politely. The toast area itself stops being a live region (one voice, not two) and its label is translated. The program's wording was "Toaster mounted eagerly"; the area is deferred on purpose to keep it out of the boot-critical bundle (`src/routes/+layout.svelte:52-54`), so the announcement is moved instead of the mount.
7. The five private live regions use the shared announcer.

### 3. The workshop panels are real dialogs (PR C)

8. The five element panels use the shared `Dialog` (named by their title, focus inside, Tab kept inside, Escape and the close button close, focus returns to what opened them). Chosen as closest to today's look: same size, position, dimmed backdrop and card as now. `overlayFocus` and its `TODO(handoff)` are removed.

### 4. A test pins what a screen reader is given (PR D)

9. For DataTable, the calendar, BoardView, Picker and the command palette: an accessibility-tree snapshot per widget state (names, roles, states, in reading order), kept in the repo; the specs gate fails when one changes without the snapshot being updated on purpose.

**Screen-reader tests — the one open decision.** The program names `@guidepup/virtual-screen-reader`, which is not a hub dependency. Put to the owner on 2026-11-27 with three options: (1) Playwright's built-in accessibility snapshots, no new dependency; (2) add the library (it also checks the spoken order); (3) none. This spec takes option 1, as the coordinator confirmed ("proceed with option 1 as you planned and switch if they answer otherwise").

Invariants: no visible change except where stated in "What users see"; no new dependency; every new string in en and es; semantic tokens only; pointer behaviour unchanged.

### What users see

| # | Today | After |
|---|---|---|
| 1 | A screen reader reads some buttons in English inside the Spanish UI | Read in the UI's language |
| 2 | Every table is "Tabla" | Each table has its own name ("Claves de API", "Clientes", …) |
| 3 | A page that fails to load part of its content interrupts the screen reader; so does each invalid field | Announced without interrupting; the failed save still interrupts |
| 4 | An early toast can go unannounced | Announced |
| 5 | Workshop panels: Tab leaves the panel, Escape often does nothing | Real dialogs: focus stays inside, Escape closes |

Sighted mouse users see no change in 1–4. For 5 the panels keep their look; a demo (FigCraft as-is / to-be + preview) is made with PR C and linked here.

## Delivery: four hub PRs, each mergeable alone

| PR | What | Proof |
|---|---|---|
| A | Names (TO-BE 1–3) | lint rule at 0 (fails on a reintroduced literal); type check (a table without a name does not compile); accessibility tree read in a real browser on Storybook for a named table and two translated buttons, in es |
| B | Alerts and toasts (TO-BE 4–7) | mounted tests on the five shared pieces; a toast fired before idle is in the live region; real browser: accessibility tree roles before / after on a form with an invalid field and on a failed load |
| C | Workshop panels (TO-BE 8) | dialog pattern assertion on each panel; real keys on the local real-renderer build: open from the list, Tab stays inside, Escape closes, focus returns |
| D | Snapshot tests (TO-BE 9) | the new suite in the specs gate; shown failing on a deliberately renamed button, then restored |

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | 53 literal names → messages (en + es) | `hardcoded-a11y-name` = 0 |
| D2 | `DataTable.ariaLabel` required; 56 callers named | `bun run check` |
| D3 | Two design-lint rules + baselines | lint self-test: a literal label added to a fixture string is counted |
| D4 | Shared pieces: load errors and field messages → `status`; field messages tied to the field | mounted tests |
| D5 | Call sites: on-load text loses the role; load panels → `status` | grep counts before / after in the PR; the a11y gate |
| D6 | `toaster.create` / `update` announce through `announce()` (errors assertive); the toast group is `aria-live="off"` with a translated label | mounted test with no Toaster mounted; real browser |
| D7 | Five private live regions → `announce()` | grep = 0 hidden announcers; existing tests of those components |
| D8 | Five panels → `Dialog`; `overlayFocus` removed | `assertPattern(dialog)`; real keys |
| D9 | Fixture + snapshots for five widgets; third suite in the specs gate | gate run; deliberate-break run |

## Requirements

- **FR-001**: No accessible name may be hard-coded; a lint rule MUST fail on a new one.
- **FR-002**: Every table MUST have a specific accessible name.
- **FR-003**: `role="alert"` MUST be used only for errors that follow the user's own action; toasts MUST be announced, errors assertively.
- **FR-004**: The workshop element panels MUST be modal dialogs with a name, a focus trap and focus return.
- **FR-005**: The accessibility tree of the five complex widgets MUST be pinned by a test in the a11y gate.
- **FR-006**: No new dependency; no visible change beyond "What users see"; `bun run a11y` passes with no baseline rising.

## Success Criteria

- **SC-001**: Hard-coded accessible names: 0 (today 53). Tables named "Table": 0 (today 56).
- **SC-002**: `role="alert"` on content that does not follow a user action: 0 (today about 39).
- **SC-003**: Hand-built modal layers in the workshop: 0 (today 5).
- **SC-004**: Every check on each hub PR is green; real-browser proof on the final commit.

## Out of Scope

- The 95 literal `title` / `placeholder` strings beyond counting them (visible copy; they shrink under the new baseline).
- Visible headings that are hard-coded English (e.g. in the LLM analytics panel): copy work, not an accessible-name defect.
- Pixel view: moving a character to another seat by keyboard (ledger 19). Board order inside a column (ledger 17). The story-test lane's missing Tailwind and the accent-as-text PR (both waiting for the owner).
- Nine alerts whose one error variable holds both a load failure and an action failure (ledger item 22): left as alerts until the two are split.
- Firefox / WebKit runs of the a11y specs.
