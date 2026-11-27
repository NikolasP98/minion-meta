---
id: 2026-11-20-hub-accessibility-program
title: Hub accessibility program — every component accessible, from atom to full page (WCAG 2.2 AA)
status: approved
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub, minion-meta]
tags: [ui, test]
value: 8
effort: L
source: owner-request-2026-11-20
---

# Hub accessibility program

## Problem (owner, verbatim, 2026-11-20)

> "I want every component to be fully accessible (a11y), from atom to full pages (aria, keyboard, etc). Look at the ui-sdk a11y proposal and compare it with our own."

It started from a kanban question: can a card be moved without a mouse? This proposal answers
that, compares our approach with Vercel Labs UI SDK's (evaluated 2026-11-20 and **not** adopted:
beta since 2026-11-12, and licence question vercel-labs/ui#867 unanswered), and lays out the slices that
get the whole hub to WCAG 2.2 AA with gates that stop regressions.

"Fully accessible" here means: **WCAG 2.2 level AA**, every interactive widget matches its
WAI-ARIA APG pattern (roles, states, keys, one tab stop per composite), every pointer action has
a keyboard path, every page has a title, landmarks and a skip link, and an automated gate fails
CI when any of that regresses.

## AS-IS (hub master `3677e35a`, 2026-11-20)

Evidence from a read-only audit of the clean master checkout; the top findings were re-checked by
hand (file:line below).

### What we already do well

- **BoardView** (`src/lib/components/data-view/BoardView.svelte`): every card has a "Move to…"
  menu (keyboard + tap) besides HTML5 drag, and a polite live region says "<card> moved to
  <column>" or that the move was refused (HC-015). Used by `scheduling/BookingBoard`,
  `/pos/catalog`, `/pos/sell`.
- **Shared Dialog** (`ui/foundations/Dialog.svelte`): native `showModal()`, returns focus,
  `aria-labelledby`. **Tabs**: roving tabindex + arrows/Home/End. **ContextMenu**: menu roles,
  arrows, Esc, submenus, Shift+F10 in 4 hosts. **Toggle**: `role=switch`, label required by type.
- **DataTable**: `aria-rowcount`/`aria-rowindex` survive virtualization, `aria-activedescendant`,
  `aria-sort`, selection count in a live region.
- **Charts**: `role=img` + collapsible data table; 14 vitest cases in CI.
- **Calendar**: drag has a non-drag alternative (edit the time in the drawer) — WCAG 2.5.7 met.
- Global `:focus-visible` ring (`app.css:175`), global reduced-motion reset (`app.css:459`),
  contrast unit tests per theme preset (`src/lib/themes/contrast.test.ts`), 497 of 695
  `aria-label`s translated with paraglide.

### Gaps (ranked)

| # | Severity | WCAG | Where | What |
|---|---|---|---|---|
| 1 | blocker | 2.1.1, 2.4.3, 4.1.2 | `config/NavigationGuardModal.svelte:17-34` | Hand-rolled "unsaved changes" modal: no dialog role, no focus move/return/containment; the inner `onkeydown` `stopPropagation()`s so **Escape never reaches** the outer handler. |
| 2 | serious | 4.1.2, 1.3.1, 2.4.7 | `layout/CommandPalette.svelte:151-225` | Not a dialog; input named only by placeholder; no combobox/`aria-activedescendant`; `outline-none` (`:177`); focus not returned on close. |
| 3 | serious | 2.4.1, 1.3.1 | `routes/(app)/+layout.svelte:248` | No skip link anywhere; `<main>` only through `PageShell` (102 of 162 route files). |
| 4 | serious | 2.4.2 | `src/app.html`, `ui/PageHeader.svelte:38/101` | No fallback `<title>`; ~87 components set one for 162 pages; PageHeader's comment says it feeds `<svelte:head>` but it only renders the `<h1>`. SvelteKit's route announcer reads the title, so navigation is announced badly. |
| 5 | serious | 2.1.1 | `workshop/WorkshopCanvas.svelte:1771` | Pointer-only canvas region. |
| 6 | serious | 2.1.1, 1.1.1 | `charts/Chart.svelte:104,281` | Legend/item click pointer-only (12 call sites); 40 of 44 charts use the generic name; non-Cartesian charts have no data table. |
| 7 | serious | 2.4.7, 1.4.11 | 15 files; primitives | `outline-none` without replacement (168 uses vs 86 `focus-visible`); primitives show focus as `box-shadow` only; **0 `forced-colors` rules** ⇒ focus vanishes in Windows High Contrast. |
| 8 | serious | 2.4.3 | `ui/foundations/DraggableWindow.svelte`, `ui/DraggableDialog.svelte` | No focus move on open, no return on close. |
| 9 | serious | 4.1.2, 2.5.8 | `ui/MultiSelectFilter.svelte:39,54,154,155` | Options are tab stops (no arrows); `aria-haspopup` on an inner span; hard-coded English; 14 px remove target. |
| 10 | serious | 2.4.3 | `data-table/DataTable.svelte:357,4074` | Grid mode is the default, yet sort headers, row checkboxes and row actions stay tab stops inside the grid (APG grid = one tab stop). |
| 11 | serious | 2.1.1, 4.1.3 | `sessions/SessionKanban.svelte` → `tasks/KanbanCol.svelte` → `tasks/TaskCard.svelte` | The **only** board not on BoardView: non-focusable `draggable` list items, HTML5 drop only, no move menu, no announcement (used in `agents/AgentDetail.svelte:161`). |
| 12 | minor | 2.4.3 | `ui/ContextMenu.svelte:151-185` | Focus not returned to the invoker; no Home/End/typeahead. |
| 13 | minor | 3.1.2, 4.1.2 | 58 sites; `ui/SideNav.svelte:165` | Hard-coded English `aria-label`s; `aria-label` on a plain span is ignored. |
| 14 | minor | 4.1.2 | `Dialog.svelte:3-5`, `ConfirmDialog.svelte:82`, `Chip` | Dialog `title` optional ⇒ unnamed dialogs possible; ConfirmDialog not `alertdialog`, no initial focus; chip remove label is just "Remove". |
| 15 | minor | 4.1.3 | app-wide | 125 `role=alert` (many assertive on mount); Toaster mounts on idle (`+layout.svelte:190`); Spinner/Skeleton silent. |

### Governance today

Re-measured on `3677e35a`; commands, the per-primitive table and every number that changed are
in [`audits/2026-11-20-hub-a11y/`](../audits/2026-11-20-hub-a11y/README.md).

- **An a11y engine is installed but gates nothing.** `@storybook/addon-a11y` (axe-core 4.14.0)
  and `@storybook/addon-vitest` are registered (`.storybook/main.ts:11-12`), but
  `a11y.test: 'todo'` only reports (`.storybook/preview.ts:91-95`) and no workflow runs
  `test:storybook` (`package.json:232`). The page sweep (`ci.yml:827-833`) has no a11y rule
  (`tests/e2e/ui-audit/conformance.ts:20-27`). (An earlier version of this bullet said no engine
  existed; that was wrong.)
- 80 `svelte-ignore a11y_*` comments carrying 84 rule tokens (54 ×
  `no_static_element_interactions`), not ratcheted.
- `tests/e2e/ui-audit/canvas-accessibility.spec.ts` and `workshop-accessibility.spec.ts` exist
  but **do not run in CI** (`playwright.critical.config.ts:11-14` only matches critical journeys;
  `playwright.workshop.config.ts:7` is referenced by no workflow or script).
- `design-lint.mjs` has no a11y rule beyond `bare-button`/`native-select` (`:81,86`).
- Contrast tests cover text only; nothing checks non-text contrast (1.4.11), focus rings, borders.
- Prior ledger: `proposals/2026-10-07-hub-readiness-ui-a11y-followups.md`, merged below.

### Corrections after re-measurement (2026-11-20)

The audit appendix changes these statements above; the table and comparison rows keep their
original wording so the history stays readable.

| Statement above | Measured |
|---|---|
| "497 of 695 `aria-label`s translated" | 535 of 695 |
| Gap 13 and the i18n row: "58" hard-coded labels | 56 string literals + 38 untranslated expressions = 94 sites |
| Gap 6: "40 of 44 charts" | 40 of 44 call sites including 16 stories; 24 of 28 in product code |
| Gap 4: "~87 components set one" | 89 files |
| Gap 7: "168 uses" of `outline-none` | 98 `outline-none` classes + 70 CSS `outline: none`/`0` |
| Gap 8: DraggableDialog has no focus move/return | Not verified: Zag owns it (`ui/DraggableDialog.svelte:49-54`); DraggableWindow is confirmed |
| Gap 15: "Spinner/Skeleton silent" | Silent by default: the shared ones announce when given `label`; the hub Skeleton adapter cannot take one (`ui/Skeleton.svelte:3-8`) |
| S3: "icon-only Button requires `label` by type (export `IconButton`)" | `IconButton` already exists with a required `label` (`packages/ui/src/lib/IconButton.svelte:6`); the work is adoption (8 hub files use it, 151 icon-shaped `Button` uses do not) |
| S0: "ratchet the `svelte-ignore a11y_*` count (80 → only down)" | Count rule tokens (84), not comments, or a second rule added to an existing comment slips through |
| "Comparison" rows: "None" for automated engine | Installed, report-only (first bullet above) |

### Prior ledger merged in (2026-10-07 readiness batch)

`proposals/2026-10-07-hub-readiness-ui-a11y-followups.md` stays the row-by-row record. Its a11y
rows were re-checked on `3677e35a`: **every hub marker is still in the code**, so none is closed.
Line numbers below are current. The slice column is a proposed mapping, not an owner decision.

| Ledger row | Site on `3677e35a` | State | Slice |
|---|---|---|---|
| #1 / U3 HC-043 link colour | `src/app.css:156-161` (`a { color: var(--color-accent) }`); no `--color-link` in `packages/design-tokens/contract.json` | open | S4 (already named there) |
| #2 HC-043 surface text gaps | `scripts/qa/hc043/resolve.ts:86-93` | half closed: the solarized-light entry was cleared by token contract 1.1.0 (`:92`); `gruvbox-light\|error\|--color-surface-3` remains (`:93`) | S4 |
| #3 HC-028 SectionProseEditor modal | `agents/SectionProseEditor.svelte:270` | open | S3 |
| #4 HC-028 AgentSettingsPanel drawer | `agents/AgentSettingsPanel.svelte:228` | open | S3 |
| #5 HC-028 AgentCreateWizard | `builder/AgentCreateWizard.svelte:236` | open | S3 |
| #6 HC-028 AgentCreatorWizard (no Escape path at all) | `marketplace/AgentCreatorWizard.svelte:147` | open | S1 (keyboard blocker) |
| #7 HC-028 RelationshipPrompt | `workshop/RelationshipPrompt.svelte:44` | open | S3 |
| #8 HC-028 EaselBoard `aria-modal="true"` | `my-agent/EaselBoard.svelte:323-324` | open | S3 |
| #9 HC-028 ZenMode `aria-modal="true"` | `my-agent/ZenMode.svelte:105-106` | open | S3 |
| #10 HC-028 BugReporter `aria-modal="true"` | `layout/BugReporter.svelte:97,103` | open | S3 |
| U2 SkillCreateWizard dismissible while creating | `builder/SkillCreateWizard.svelte:51` (`<Dialog` with no `dismissible` prop) | open | S3 |
| U8 KpiRow raw `outline-none` | `reliability/KpiRow.svelte:57` | open | S4 |
| U9 CodeEditorPane drag rows without keyboard reorder | not re-read | reviewer decision still pending | S5 or reject |
| U10 backdrops typed `role="button"` | not re-read | rides the HC-028 rows | S3 |

Stays in the old ledger, outside this program: #11, #12, U4, U5 (UI-002 calendar touch height
and its red e2e assertions; both markers still present at
`scheduling/CalendarWindowIssues.svelte:39` and `tests/e2e/ui-audit/calendar-mobile.spec.ts:138`),
U1 (Button icon padding), and the gateway rows #13, U6, U7.

## Comparison with UI SDK's approach

UI SDK (Vercel Labs, `@ui-sdk/core` 0.1.0-beta.13) treats a11y as **tested contracts**, not
guidelines. Side by side:

| Concern | UI SDK | Hub today | Take it? |
|---|---|---|---|
| Pattern assertions | `checkPattern(root, pattern)` (`@ui-sdk/core/testing`, public, `@experimental`): 15 APG patterns; asserts roles, names, owned roles, required states, **exactly one tab stop** per composite (roving or active-descendant), arrow/Home/End/typeahead per orientation and RTL, and that **focus never falls to `body` or into `inert`** after every key. No grid/treegrid/spinbutton check. | One helper test (`role-button-keys.mounted.test.ts`) + per-component ad-hoc tests. | **Yes — port the idea**, our own small `assertPattern` for the patterns we use (listbox, menu, tabs, dialog, combobox, grid). We need grid, which theirs lacks. |
| Automated engine | 41 `*.a11y.spec.ts`: axe on **every component state**, plus `toMatchAriaSnapshot` per state; coverage script fails a component without an a11y spec. | None. | **Yes** — axe on every Storybook story state + every route in the existing page sweep, as a decrease-only ratchet. |
| Screen-reader regression | 81 `*.sr.spec.ts` with `@guidepup/virtual-screen-reader` (spoken-phrase log). | None. | Later (S6), only for the 5 most complex widgets. |
| Dev-time warnings | Unknown role, disallowed `aria-*`, missing required state, focusable role without a focus model, missing accessible name (13 parts) — warnings in dev, **errors under a strict flag in tests**, stripped in prod. | Svelte compiler a11y warnings only; 80 suppressed. | **Yes, cheap version**: ratchet the `svelte-ignore a11y_*` count; make icon-only Button require a label by type. |
| Keyboard move / reorder | `createReorder`/`createTransfer`: Space/Enter pick up, arrows move (Left/Right = next list that accepts), Space/Enter drop, Esc cancel; focus stays on the moved item; assertive announcements "Picked up X, position p of t" with a **typed `message()` callback** (English defaults, app localises). | BoardView: "Move to…" menu + polite announcement (simpler, also valid; APG has no drag pattern). | Keep our menu model (fewer modes to learn, works on touch). Borrow the **typed message callback** so every move announcement is paraglide-translated. |
| Announcer | One lazy polite+assertive region pair per document; clears then re-sets after 100 ms so repeats re-read. | 30 `aria-live` + 79 `role=status` + 125 `role=alert` scattered. | **Yes** — one shared announcer; replace ad-hoc regions. |
| Overlays | `inert` outside (ref-counted for stacks), focus return, focus recovery when the focused part unmounts. | Native `<dialog>` + top-layer popovers (same direction); custom modals skip it (gaps 1, 2, 8). | Route every overlay through `foundations/Dialog`; add focus recovery. |
| Forced colors / contrast | **Not handled** (their own #473: focus ring and edges below 3:1). | Text contrast tested per preset; non-text not. | We go further: forced-colors + non-text contrast in the token contract. |
| i18n | English defaults, app localises via callbacks. | Paraglide; 58 hard-coded labels. | Lint for hard-coded `aria-label`. |

Net: UI SDK's strength is **enforcement** (pattern tests, axe per state, coverage gate, strict
warnings), not its components. We keep our components and copy the enforcement.

## TO-BE (observable)

1. Every interactive primitive in `src/lib/components/ui/` passes `assertPattern` for its APG
   pattern and axe (WCAG 2.2 AA tags) in every Storybook state; a new primitive without an a11y
   story fails CI.
2. Every route in the page sweep passes axe at AA with zero new violations (decrease-only
   baseline), has a unique `<title>`, one `<h1>`, a `<main>`, and a skip link that lands on it.
3. Every pointer action (drag, canvas, chart click) has a keyboard path; every move/selection
   result is announced in the user's language through one shared announcer.
4. Focus is always visible (including Windows High Contrast / `forced-colors`), never lost to
   `body` after a key press, and returned to the invoker when any overlay closes.

**Invariants (must not change):** visual design and tokens except focus/contrast fixes;
DataTable feature set; BoardView's menu-based move model; the native `<dialog>` + top-layer
architecture (`ui/portal-in-layer.ts`).

## DELTA — slices (each becomes a spec via spec-kit)

| Slice | Scope | Proof |
|---|---|---|
| **S0 Gates first** | `@axe-core/playwright` in the page sweep (`conformance.ts`) + over every Storybook story; decrease-only baseline file; run the two orphaned `ui-audit/*accessibility*` specs in CI; ratchet the `svelte-ignore a11y_*` count in `design-lint` (80 → only down); `assertPattern` helper (one tab stop, no focus-to-body, arrows/Home/End/typeahead per pattern, incl. grid). | CI red on a seeded violation; baseline committed. |
| **S1 Blockers** | Gap 1 NavigationGuardModal → `ConfirmDialog`; gap 2 CommandPalette → `Dialog` + combobox pattern; gap 11 SessionKanban → BoardView (deletes KanbanCol's drag code). | `assertPattern` + keyboard e2e for each. |
| **S2 Page shell** | Skip link + `<main id>` in `(app)/+layout.svelte` (no nested `<main>` from PageShell); fallback title in `app.html`; `PageHeader` sets `<svelte:head><title>`; label the mobile `<nav>`. | axe `bypass`, `document-title`, `landmark-*` pass on all swept routes. |
| **S3 Primitive contracts** | Gaps 8, 9, 12, 14: DraggableWindow focus in/out; MultiSelectFilter as real listbox + 24 px targets; ContextMenu focus return + Home/End/typeahead; Dialog `title` required by type; ConfirmDialog = `alertdialog` + initial focus on the safe action; chip remove label carries the chip name; Spinner/Skeleton `role=status`; icon-only Button requires `label` by type (export `IconButton`). One shared announcer with a typed, paraglide-backed message callback; BoardView moves through it. | `assertPattern` per primitive story. |
| **S4 Focus & contrast** | Gap 7: remove the 15 bare `outline-none`; focus ring as `outline` (survives forced-colors) not only `box-shadow`; `@media (forced-colors: active)` rules; non-text contrast ≥ 3:1 for borders/focus in `packages/design-tokens/contract.json` (+ HC-043 `--color-link`). Visible change ⇒ FigCraft as-is/to-be per owner rule. | Token contract test extended to 1.4.11; forced-colors screenshot. |
| **S5 Composites** | Gap 10 DataTable single tab stop (inner buttons `tabindex=-1`, reached by cell navigation, Enter activates) + sort announcement; gap 6 Chart keyboard legend/items, `ariaLabel` required, table for non-Cartesian; gap 5 workshop canvas keyboard path (focusable nodes or an equivalent list view). | `assertPattern(grid)`; chart a11y tests extended. |
| **S6 Hygiene** | Gap 13 hard-coded `aria-label` → paraglide + lint rule; gap 15 `role=alert` only for errors that need interruption, Toaster mounted eagerly; virtual-screen-reader tests for DataTable, Calendar, BoardView, Picker, CommandPalette. | Lint rule red on a hard-coded label. |

Order: S0 → S1 → S2 → S3 → S4 → S5 → S6. S0 first so every later slice is measured and cannot
regress.

## Out of scope

- Adopting UI SDK or any component library (rejected 2026-11-20: beta, licence #867).
- `minion_site` (marketing/members) — same approach later, separate proposal.
- AAA criteria; native apps (`minion/apps/*`).
- Re-designing BookingCalendar or the workshop canvas beyond a keyboard path.

## Owner decisions (2026-11-20)

1. **Test helper:** write our own `assertPattern` (covers grid; no beta dependency). Chosen.
2. **Board keyboard moves:** keep the "Move to…" menu **and add keyboard drag** — Space/Enter
   picks a card up, arrows move it (Up/Down within a column, Left/Right to the next column that
   accepts it), Space/Enter drops, Escape cancels and restores; focus stays on the moved card;
   every step is announced through the shared announcer in the user's language. Lands in
   `BoardView` (S3), so every board gets it; SessionKanban moves onto BoardView in S1.
3. **Approved;** start with S0 (gates first).

## Definition of done

S0–S6 merged; axe baseline at **0** on all swept routes and stories; every primitive has an
a11y story passing `assertPattern`; the 15 gaps above closed or each carried as a
`TODO(handoff)` + ledger entry.

## Open ends from S0 (spec 137, hub PR #702) — `TODO(handoff)` ledger

Left open by the S0 gates slice on 2026-11-20; each is a decision or a follow-up, not a defect in the gates.

1. **Workshop accessibility spec runs in Chromium only.** Its config also lists Firefox and WebKit; adding them costs two browser installs in the `a11y` job. `TODO(handoff)` at hub `scripts/a11y.mjs` (specs gate).
2. **The page sweep's own ledger was never committed** (`tests/ui-audit/conformance-ledger.json`, spec 014): its compare prints "blocked: no ledger yet" and exits 0, so the six conformance rules gate nothing. S0 did not turn it on. Needs an owner decision under spec 014.
3. **The sweep's strict runtime gate fails 135 of 149 pages in CI** (targets under 44 px, unnamed controls, duplicate IDs), so the sweep "captures" almost nothing. The axe pass runs before that gate; the gate itself is unchanged.
4. **22 swept pages are `unmeasured`** in the page baseline (content never became ready in the sweep): `/agents/autonomous`, `/channels/[id]`, `/config`, `/finances/purchases/[id]`, `/killswitches`, `/notifications`, `/onboarding`, `/orgs`, `/orgs/plans`, `/plugins/[id]`, `/pos/catalog/[productId]/edit`, `/pos/tickets/[id]`, `/pulse`, `/scheduling/bookings/[id]/edit`, `/sessions/[sessionKey]/debug`, `/settings/gateways`, `/settings/organizations`, `/settings/pulse`, `/socials/campaigns/[campaignId]`, `/workforce`, `/workforce/issues/[id]`, `/workforce/projects/[id]/pipelines`. Their accessibility is not gated until they can be measured.
5. **Only the CI viewport is gated** (compact-390 coarse). A wide-1440 baseline needs a local sweep (`bun run a11y --all --update-baseline` on a QA stack); the page gate was not run locally in S0.
6. **Two story rows are `unstable`** in `tests/ui-audit/a11y-ledger.json`: the AttachmentTile thumbnail button has no accessible name until its image loads (fix in S1/S2, then remove the entry); the Sidebar wordmark contrast row flips 0 ↔ 2 between full runs, cause not found.
7. **No per-rule waiver mechanism.** Debt is carried by the baseline; the sweep's allow-list type is closed over its six rules.
8. **Engineering bundle sync pending:** minion_plugins PR #2 adds the gate to `minion-engineering`; after it merges, run `scripts/sync-minion-engineering-skills.sh` in minion-meta.
9. **`assertPattern` does not check** Tab trapping in dialogs (needs real Tab keys), right-to-left arrow keys, or screen-reader output (S6).

10. **(S1, spec 146) The shared `Dropdown` leaves its menu items in the Tab order.** Items are buttons without `tabindex="-1"`, so an open menu has one tab stop per item instead of one for the menu (APG menu pattern). Found by `assertPattern` on the session board's "Move to…" menu; it affects every dropdown in the hub. `TODO(handoff)` at hub `src/lib/components/ui/Dropdown.svelte`; fix in the widget slice (S3). **Closed by spec 152 PR B** (items are `tabindex="-1"`; the waiver in the session board test is removed).
11. **(S1) Gaps 1 and 2 of S1 are still open:** NavigationGuardModal → `ConfirmDialog` and CommandPalette → `Dialog` + combobox. Spec 146 covers gap 11 (the session board) only.
12. **(S1, spec 146) The session task panel on a phone-width screen** still shows four very narrow columns, as before the move; a phone layout is not designed.

13. **(S2, spec 151) 87 pages set their browser title by hand, in five formats** ("‹page› — ‹module›", "‹page› · ‹module›", "‹page›" alone, "‹page› · ‹brand› hub", "‹page› — ‹brand›"). They were left as they are; their headers pass `documentTitle={false}`. Unifying them on "‹page› · ‹hub name›" means deleting those `<svelte:head>` blocks and the opt-outs, and changes 87 tab titles: an owner decision.
14. **(S2) Pages without a header** (canvases, flow editor, workshop) get the hub name alone as their title.
15. **(S2) axe's `landmark-*` and `region` rules are not gated** (best-practice tags; the gate runs WCAG A/AA tags). The shell's landmarks are covered by tests; findings inside individual pages are not.
17. **(S3, spec 152 PR C) Boards have no order inside a column.** Keyboard drag moves a card between columns only; the owner's "Up/Down within a column" needs an order field and an `onreorder` write on `BoardView` and its three callers (Agenda board, catalog board, session tasks). `TODO(handoff)` at hub `src/lib/components/data-view/BoardView.svelte` (`cardKeydown`).
16. **(S2) The skip link was not exercised in a browser against the running app**; it is asserted structurally and by the sweep's `bypass` rule.
17. **(S5, found 2026-11-26 on production; fixed early) A button inside a table row ignored Enter and Space.** `DataTable` registers document-scoped `Enter` and `Space` hotkeys for row focus (`gridAttachment`); the hotkey library prevents the key before the callback runs, so with focus on a button, link or other control inside a cell the native activation never happens (the callback itself correctly does nothing). It applies while the table is in grid mode with no cell selection and no `onRowActivate` (the two bindings are `enabled: !sel && !onRowActivate`), e.g. the API keys table in Settings → Developers: "Revocar" works with the mouse only. Pre-existing (bindings from 2026-07-05, hub `04eee80a`; not changed by #704 or #737–#742). **Done early, ahead of S5 (coordinator's call, 2026-11-26): hub #743.** The two bindings stand down while a control inside a cell has focus; proven by a test that fails on the old code and by real keys on a Storybook build (Enter and Space on a button, Enter on a link, Space on a checkbox, Enter on a row unchanged). Left for S5: whether the arrow and J/K bindings should also yield to a control such as a `select` inside a cell.
19. **(S5, spec 154 PR C) Pixel view: a character can be moved to another seat with the pointer only.** `WorkshopCanvas.svelte` `handlePointerDown` (pixel branch: `dragCharacter` / `updateDragPosition`). The list's Move covers the classic and habbo views; the pixel office places characters by tile and seat. Marked `TODO(handoff)` above the canvas markup. **Open:** a keyboard seat picker for the pixel view.
20. **(S6, seen on production 2026-11-26; CLOSED by hub #753, spec 155 PR A) Tables announce themselves only as "Tabla".** `DataTable`'s `ariaLabel` is optional and no caller passes one, so two tables on one page (Settings → Developers) have the same name. **Open:** require a specific name, as spec 154 PR B did for charts.
21. **(S5, spec 154 PR C; fix = hub #755, spec 155 PR C) The five workshop element overlays are not dialogs.** `PinboardOverlay`, `MessageBoardOverlay`, `InboxOverlay`, `RulebookOverlay`, `PortalOverlay` are hand-built fixed layers whose backdrop has `role="button"`: no dialog role or name, no focus trap, Tab walks out behind them. PR C only moves focus in on open and back on close (`overlayFocus` in `WorkshopCanvas.svelte`, marked `TODO(handoff)`). **Open:** move them to the shared `Dialog`, as spec 152 did for the other overlays.
22. **(S6, spec 155 PR B) Nine alerts mix a load failure and an action failure in one variable.** `layout/DevUserSwitcher.svelte:133`, `layout/NotificationsPopup.svelte:247`, `routes/(app)/notifications/+page.svelte:209`, `routes/(app)/pulse/+page.svelte:253`, `settings/BackupsTab.svelte:449`, `routes/(app)/killswitches/+page.svelte:220`, `routes/(app)/pos/tickets/[id]/PageBody.svelte:739`, `routes/(app)/shells/[shellId]/+page.svelte:153`, `routes/book/[slug]/+page.svelte:401`. They stay `role="alert"` (interrupting) because the action half needs it. Also seen: `pos/PlanOpenForm.svelte:259` announces a SUCCESS as an alert. **Open:** split the variable (load error → status, action error → alert) and make the success a status.
23. **(S6, spec 155 PR B) The packaged form field still interrupts.** `FormField` in `@minion-stack/ui` (`packages/ui`, shipped to the hub as a vendored tarball) renders its error as `role="alert"` and sets no `aria-errormessage`. Hub screens using it: `doors/faq/Editor.svelte`, `navigation/SectionAccessDialog.svelte`, `team/TeamSettingsView.svelte`, `ui/Select.svelte`, `users/RbacRolesSection.svelte`. The hub's own `foundations/FormField` (30 screens) is fixed. Found by the real-browser read of the FormField story. **Open:** change the package (error → `status`, tie it with `aria-errormessage`), release it, repack the hub tarball.
24. **(S6, spec 155 PR D) The week calendar has no table structure for a screen reader.** `scheduling/BookingCalendar.svelte` week view exposes no `grid`, `row` or `columnheader` roles: it reads as a flat run of day labels, "New appointment here" buttons and booking buttons (about 50 day columns in the scroll runway). Keyboard movement between slots works (S3); what is missing is the structure that tells a listener which day and hour a button belongs to. Pinned as it is by `tests/e2e/ui-audit/aria-snapshots/calendar-week.aria.yml` (hub #756), with a `TODO(handoff)` at the test. **Open:** decide the pattern (grid with day column headers and hour row headers, or per-day lists with headings), then regenerate the snapshot.
25. **(S6, 2026-11-27) The story runner sometimes hangs in CI.** Twice so far (master `ec24b96b`, hub #756 head `af977d39`): the `stories` gate (Vitest browser run of the Storybook project) starts, prints nothing, and the `a11y` job dies at its 25-minute limit; the same commit passes on a re-run in about 6 minutes. Cause unknown: the JSON reporter printed no progress. Mitigation in hub #756 (`scripts/a11y.mjs`): an 11-minute limit on the run, its process group killed, one more run, a clear failure if it hangs twice, and the plain reporter added so the log names each story file as it finishes. **Open:** on the next hang, read which story file was last in the log and fix that story or the runner; then decide whether the retry can go.

