# Implementation Plan: Calendar on phones

**Branch**: `spec/145-calendar-phones` (meta) · hub slices `feat/145-calendar-phones-s1` … `-s4` (base `master`) | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/145-calendar-phones/spec.md`. Review round 1 (five reviewers) is folded in; see [research.md](research.md) for what changed and why.

Anchors: "BC" is `src/lib/components/scheduling/BookingCalendar.svelte`, "POS" is `src/routes/(app)/pos/appointments/PageBody.svelte`, "SCHED" is `src/routes/(app)/scheduling/calendar/PageBody.svelte`, all at hub `origin/master` `3d39cbb6`.

## Summary

On phones the calendar becomes the page: top bar, one toolbar row, a week strip, then the calendar area. Page chrome is hidden with CSS and its functions move into the "…" sheet. Touch is fixed at the pointer-event level so a finger scrolls and press-and-hold creates or moves. A tap opens a summary sheet. The existing list view is turned on for both pages on phones, and the month view gets phone cells. Blocks get a status icon and name.

The plan adds no view vocabulary and no new move form. The one floating button is the owner's "+" in the bottom-right corner, with the assistant bubble moved above it. "3 días" is the existing week view with three columns. "Lista" is the existing `agenda` view. Press-and-hold extends the existing `longpress` action. "Mover a…" opens the drawer's existing reschedule form.

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes, SvelteKit 2

**Primary Dependencies**: existing only: `BookingCalendar`, `scheduling/kit/*`, `Sheet` (`placement="bottom"`), `CollapsibleFilters`, `lib/actions/longpress.ts`, `svelte/reactivity` `MediaQuery`, `lucide-svelte`. No new dependency.

**Storage**: one cookie, `hub_phone=1`, written in the browser. No schema or API change.

**Testing**: vitest unit and `*.mounted.test.ts` (happy-dom: no layout, so no geometry assertions there); geometry and touch in Playwright under `tests/e2e/ui-audit/` (the existing `calendar-mobile.spec.ts` and its `mobile-fixture`); the accessibility gates from spec 137; Storybook phone stories.

**Target Platform**: iOS Safari 17+, Android Chrome (current); desktop browsers unchanged.

**Project Type**: web application (hub only).

**Performance Goals**: scrolling stays native; the only script on the touch path is one `touchmove` listener that returns immediately unless a hold is active.

**Constraints**: design-token contract (`lint:design`, `lint:tokens` debt may only decrease); en/es messages in the same commit, append-only; one hub gate at a time on this workstation; desktop toolbar order and mouse behaviour pinned by existing tests must stay green.

**Scale/Scope**: one 5.4k-line component, two host pages, two layouts, the assistant launcher, 4 PRs, 6 new small files.

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | Pass. |
| II. AS-IS → TO-BE → DELTA with evidence | Pass: measured AS-IS with screenshots and anchors; DELTA names a proof per row. |
| III. Slice-scoped delivery | Pass: four PRs; S1 ships alone. |
| IV. Required build steps | Pass: per slice `bun run i18n:compile`, `lint:design`, `lint:tokens`, `check`, unit + mounted tests, the ui-audit browser spec, the a11y gates. |
| V. Security and data gates | Not applicable (no data, auth or permission change). The owner merges each PR. |
| Open-items ledger | S2 closes the edge auto-scroll TODO (BC:2194-2199) and updates `proposals/2026-09-25-hub-pos-calendar-color-followups.md`. The tray drop TODO (BC:2084) is untouched. Deferred items (keyboard grid, free gaps, assistant bubble over the drawer) are listed in the spec's Out of scope and get a line in the PR body. |

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/145-calendar-phones/
├── spec.md
├── plan.md              # this file (also the EGM design document)
├── research.md
├── data-model.md
├── contracts/calendar-compact.md
├── quickstart.md
├── asis/
└── checklists/requirements.md
```

### Source Code (hub repository)

```text
src/lib/state/ui/phone.svelte.ts                        # NEW: phone media query + cookie
src/lib/actions/longpress.ts                            # extended: ms option, pointer details, hold lifecycle
src/lib/components/scheduling/
├── BookingCalendar.svelte                              # compact toolbar + strip, touch, summary sheet, status line
├── WeekStrip.svelte                                    # NEW
├── calendar-features.ts                                # + tapSummary (default off)
├── calendar-window.ts                                  # view default takes a phone hint
└── block-label.ts                                      # NEW: accessible name + status icon lookup (pure)
src/lib/components/scheduling/BookingDetailDrawer.svelte # + startInReschedule prop
src/lib/components/pos/ShiftDialogs.svelte              # NEW: the shift open/close dialogs, moved out of ShiftBanner
src/lib/components/pos/ShiftBanner.svelte               # opens them through layout context
src/lib/components/data-table/CollapsibleFilters.svelte # + compact prop
src/routes/(app)/pos/appointments/{+page.server.ts,PageBody.svelte}
src/routes/(app)/scheduling/calendar/{+page.server.ts,PageBody.svelte}
src/routes/(app)/pos/+layout.svelte                     # mounts ShiftDialogs; :has() rule hides nav and strip
src/routes/(app)/scheduling/+layout.svelte              # :has() rule hides the section nav
src/routes/+layout.svelte                               # sets the cookie once
src/lib/state/ui/corner-reserve.svelte.ts                # NEW: space a page reserves in the bottom-right corner
src/lib/components/scheduling/CalendarAddButton.svelte  # NEW: the floating "+"
src/lib/components/layout/FloatingAssistant.svelte      # sits above a reserved corner
messages/en.json, messages/es.json
tests/e2e/ui-audit/calendar-mobile.spec.ts              # geometry + touch
```

**Structure Decision**: changes stay in the component, its two hosts and the POS layout. The only new modules are the phone signal, the week strip and one pure helper file.

## Technical Plan

Two review rounds are folded in. Round 2's remaining findings are settled here as decisions, so the implementer does not have to make them; per the project's review stop rule there is no third document round.

### 1. Knowing it is a phone, before the page is drawn

`phone.svelte.ts` exports `phone = new MediaQuery('(max-width: 767.98px), ((pointer: coarse) and (max-height: 500px))')` and `syncPhoneCookie()`, which the root layout calls from an effect to set or clear `hub_phone=1` (path `/`, one year, `SameSite=Lax`). CSS cannot read a JS constant, so the same query text is written in each style block that needs it, with a comment pointing at this file.

The two page loads read the cookie and return `phoneHint: boolean` (both loads can read cookies; nothing is prerendered, `src/routes/+layout.ts:18`). Each page keeps one state:

```ts
let compact = $state(data.phoneHint);
$effect(() => { compact = phone.current; });
```

Hydration therefore matches the server render, and a wrong or missing cookie corrects itself in the first effect. The spec lists the one-time redraw on a first visit as an edge case.

`compactCalendar = compact && layout is calendar && the page is not in its denied state` is the single source of truth for everything in this plan. The page root carries the class `is-compact-calendar` when it is true.

`CollapsibleFilters` gets a `compact` prop (default: its current `matchMedia`, so its other users are unchanged); the two calendar pages pass `compact`, which also makes it render collapsed on the server.

### 2. The view stays one value in the address

Nothing new is stored.

- `parseCalendarPageView(value, fallback)` and `calendarViewOf(view, fallback)` take the default as an argument (today both fall back to `DEFAULT_CALENDAR_VIEW`, `calendar-window.ts:61-67, 88-91`). The loads pass `phoneHint ? 'day' : 'week'` and also return `viewInUrl: boolean`.
- The pages render `view = compact && !data.viewInUrl ? 'day' : data.view`. With a correct cookie the server already loaded the day. On a first visit the server loaded the week window, which contains the day, so no second load is needed; the page then writes `view=day` into the address with a shallow `replaceState` that keeps every other parameter.
- Returning from table or board uses the same fallback, so a phone lands on Día.
- **3 días** is `view=week`: the hosts pass `weekDays={compact ? 3 : prefs.weekDays}` and `subBy={compact ? 'none' : prefs.subBy}` (lanes would reduce the column count, `fitCount` BC:661-664). The stepper and the lanes picker are not rendered in the compact "…" sheet, so the saved desktop values are never overwritten from a phone (`weekDays` is persisted only through the stepper, BC:690-693).
- **Anchoring**: the runway anchors on the Monday of the date (BC:742) and `goToDay` forces Monday (BC:1087). When `weekDays < 7` both use the date itself, so 3 días starts on the selected day.
- **Lista** is `view=agenda`: POS passes `features={{ agenda: compact }}`; SCHED already has it on.

### 3. Compact chrome in the component

`compact` (boolean prop, default false) switches the toolbar markup only:

- One row: date label button · view button · the host's `tools` snippet · "…" button with `kebabBadge` (number) and `kebabAttention` (dot).
- The date picker, the view options and the kebab content render inside bottom `Sheet`s. The view sheet lists Día, 3 días, Mes, Lista as radio rows calling the existing `onview`, then renders the host's existing `toolbarStart` snippet (the layout switcher) unchanged. The "…" sheet renders the existing kebab body and the existing `kebabItems` snippet.
- `WeekStrip.svelte` renders under the toolbar in day, week and agenda views; CSS hides it when the screen is at most 500 px tall. It derives its seven days as `team/MemberCalendarStrip.svelte:20-59` does and shows no counts. In week and agenda views a day tap calls the component's internal `goToDay` (a scroll, no load); in day view it calls `ondate` (a navigation and load, as prev/next do today). Today is marked with a ring and "hoy" in the accessible name; the selected day with a filled background and `aria-current="date"`.
- The desktop toolbar branch is untouched, so `calendar-toolbar.mounted.test.ts:103-121` keeps passing; the existing media rule (BC:4048-4096) keeps applying to it on coarse-pointer tablets.
- When `compact` flips, an effect clears `drag` and `createDrag` and closes the sheets.

### 4. Page chrome out of the way

- Both pages render `PageHeader` (and POS its tray) only when `!compactCalendar`. Because `compact` starts from the server hint, this needs no CSS.
- `pos/+layout.svelte` and `scheduling/+layout.svelte` (which renders the scheduling section nav above the page, `:17`) hide their nav rows with CSS: `.shell:has(.is-compact-calendar) .section-nav-row { display: none }`, and the same for the module-mode `.shift-strip`, which is a sibling of the shell (`pos/+layout.svelte:25-33`) and so needs the rule on their common parent. No layout script changes.
- **Cash shift**: the open and close dialogs and their state move out of `ShiftBanner` (`ShiftBanner.svelte:155-206, 490-564`) into `pos/ShiftDialogs.svelte`, mounted once in `pos/+layout.svelte` outside the nodes that get hidden (a native `<dialog>` under a `display: none` ancestor paints nothing but still blocks the page). `ShiftBanner` and the POS page both open it through a small context set by the layout (`{ openShiftDialog(), closeShiftDialog() }`); no module-level state is written during server rendering. The "…" row derives its label and attention from `page.data.openShift` exactly as `ShiftBanner.svelte:38-47` does: "Caja abierta · <ingresos>" or "Caja cerrada"; attention when the banner's own stale/none condition holds. Without `canAct('pos','edit')` the row shows the state and is not a button (the banner's actions are gated the same way, `:442, :470`).
- **"Ir a"**: the POS page builds the list with `getAreaItems('pos', …).filter(canViewPath)` as `PosNav.svelte:13-19` does; labels only, no badges.
- **Unscheduled**: the tray's `trayItem` snippet and its group markup (POS:1017-1095) are hoisted to top-level snippets and rendered both in the tray (desktop) and in a bottom `Sheet` (phone). In the sheet the cards are not `draggable` and have no right-click menu; a tap runs the existing `clickPick` (POS:561-574) and closes the sheet. The count goes to `kebabBadge`.
- **POS filter count**: `activeFilterCount` = the same sum SCHED computes (SCHED:318-324) without `staff` and `kindId`, passed to `CollapsibleFilters` around `FilterToolbar` and `TagFilter`.

### 4a. The floating "+" and the assistant bubble

- `CalendarAddButton.svelte`: a `Button` (icon `Plus`, accessible name "Nueva cita"), 56 px, `position: fixed`, right and bottom `max(16px, env(safe-area-inset-*))`, `--layer-sticky`. The two pages render it when `compactCalendar` is true and the header's "Nueva cita" would be enabled (POS:985); it calls the same create handler. It is an ordinary element, so an open `Sheet`, drawer or dialog (all native top-layer dialogs) covers it and makes it inert without extra code.
- `corner-reserve.svelte.ts`: `cornerReserve = $state({ bottom: 0 })` with `reserveCorner(px)` returning a release function. `CalendarAddButton` calls it from an effect (browser only, so nothing is written during server rendering) with `56 + 12` and releases on destroy.
- `FloatingAssistant.svelte` (launcher placement, `:672-760, 921-942`):
  - **Default place** (`pos` is null): the launcher's fixed `bottom` offset (`:942`) and the home target in `snapHome` (`:747`) add `cornerReserve.bottom`.
  - **Dragged place**: the saved fraction (`frac`) is not changed. The position used for rendering is derived: if the launcher's box would overlap the reserved box (the bottom-right square of `reserve + margin`), its `top` is reduced to `vh - h - LAUNCH_MARGIN - cornerReserve.bottom`; otherwise it is `pos` as today. Dragging uses the same clamp, so the bubble cannot be dropped on the "+".
  - The home zone (`HOME_ZONE`, `:683-685, 739-745`) is measured from the raised default place while a reserve is held.
  - With `cornerReserve.bottom === 0` every expression returns today's value.
  - The move uses the launcher's existing position transition (`:926-927`), so the bubble slides up when the calendar opens and back when it closes; reduced motion follows the existing token.
- The assistant's open panel is anchored from the launcher (`:849-862`) and so follows it.
- The calendar scroller gets `padding-bottom: calc(56px + 48px + 3 * 12px + env(safe-area-inset-bottom))` while compact and a "+" is shown, so the last block or list row can be scrolled above both buttons.

### 5. Touch

- **Block height**: on phones every `button` gets `min-height: 44px` from `app.css:680-697`, and a block is a `Button` (BC:3603), so short appointments are drawn 44 px tall today whatever their length. `.cal-scroll` gets the sanctioned `data-dense` attribute, which exempts its descendants, and the block minimum (the literal `18` at BC:1413 and BC:2271, hoisted to one constant) becomes 24 under `(pointer: coarse)`.
- **`touch-action`**: `.slot-layer-track`, draggable `.evt` and the gutter change from `none` to `pan-x pan-y` (BC:4578, 4675, 4234). `.evt-resize` (BC:4780) is `display: none` under `(pointer: coarse)`. Track and `.evt` get `user-select: none` and `-webkit-touch-callout: none`.
- **`longpress`** (`lib/actions/longpress.ts`): gains an options form `{ ms = 500, slop = 8, onhold, onend }`; the two-argument form used by `NavContextMenu.svelte:302` keeps working. Fixes that apply to both forms: ignore non-primary pointers (`!e.isPrimary`), and clear `fired` on every `pointerdown` so a hold that ends without a click cannot swallow a later mouse or keyboard click. `onhold` receives `{ x, y, pointerId, target }`; `onend` is called on pointer up or cancel after a hold.
- The calendar uses **one** `use:longpress={{ ms: 400, slop: 12, … }}` on `.cal-scroll` (the slot layer is a `Button` component and cannot take `use:`). `onhold` resolves `target.closest('.evt')` or `.closest('.slot-layer-track')` and starts a move or a create; anything else is ignored.
- **Scroll blocking**: one permanent `touchmove` listener, `{ passive: false }`, on `.cal-scroll` calls `preventDefault()` only while `touchHeld` is true (set in `onhold`, cleared in `onend`). The listener exists before any gesture, which is what browsers require.
- **Begin handlers**: `beginCreate` and `beginDrag` are split into an event wrapper and a core taking `(el, pointerId, clientX, clientY, …)`. Mouse keeps calling the wrappers on `pointerdown`; the wrappers return early for non-mouse pointers; `onhold` calls the cores and then `el.setPointerCapture(pointerId)`. The cores refuse to start while `drag` or `createDrag` is set.
- **Pointer type**: the component records `lastPointerType` on `pointerup` at the root (as `Tooltip.svelte:98` does). The `contextmenu` handler (BC:2487-2491) returns after `preventDefault()` when it is `touch` or `pen`, so neither the native nor the host menu opens over a drag.
- **Edge scrolling**: `drag` and `createDrag` store the scroller's `scrollTop` at start and the last pointer position; time is computed from `(clientY - y0) + (scrollTop - scrollTop0)`. A `requestAnimationFrame` loop runs while a drag is active: within 48 px of the top or bottom it scrolls by a step and recomputes the ghost. In the week runway, holding within 32 px of the left or right edge for 600 ms scrolls one column, waits for the scroll to settle (the existing `HAS_SCROLLEND` check and its debounce fallback, BC:63-64, 961), and rebuilds `colRects`. Stepping stops at the edge of the rendered window (`RENDER_PAD`, BC:31) so the source column never unmounts mid-drag. Day view has no sideways edge scroll: a drag can only reach the staff columns on screen (stated in the spec). This applies to mouse and touch.
- **Tap**: with `features.tapSummary` on and `lastPointerType` touch or pen, a click on a grid block or a month/list row that would call `onopen` opens the component's bottom `Sheet` instead. The sheet renders the existing card once (`hoverCard` if the host passes it, else `defaultBookingCard` BC:2653, or `visitCard`/`defaultVisitCard` BC:2740 for a merged visit) with a new `touch: true` argument. In touch mode the card always shows the status badge even if the viewer hid that field (BC:2660), does not render its own title-button opener (BC:2676-2681), and passes `{ touch: true }` to the host's `actions` snippet. The hosts' snippets (POS:1260-1315, SCHED:570-612) render labelled 44 px buttons in touch mode and leave out cancel and no-show, which stay in the appointment drawer behind their confirmations. Below the card the sheet has two built-in buttons: "Mover a…" calling `onopen(id, { reschedule: true })` and "Abrir cita" calling `onopen(id)`.
- **Drawer**: `onopen` keeps its `(bookingId: string)` signature (BC:321) and gains an optional second argument. Hosts store it next to `detailId` and pass `startInReschedule` to `BookingDetailDrawer`, which calls its existing `openEdit()` (`:526-534`) once, after the detail for that id has loaded (its load effect resets `editOpen` on every id change, `:327`), and ignores the flag on later reloads.

### 6. Lista and Mes on phones

- Agenda rows (inline at BC:3153-3196) gain the client name and a status badge (`statusLabel`, BC:1716, with `statusTones`). A merged visit shows the lead's client and `box.statusLead`'s status. Rows are at least 44 px under `(pointer: coarse)` (they sit outside `data-dense`).
- When `compact`, `agendaGroups` iterates `visibleDays` (BC:1583) instead of only the days that have bookings (BC:1584-1590) and renders a "Sin citas" row for an empty day; the whole-range `EmptyState` (BC:3141-3142) is not used while compact.
- Month cells, when `compact`: chips, the invoiced chip and "+N más" are not rendered; the cell shows the day number and the count of active bookings from `bookingsByDay` (BC:1509), excluding cancelled, rejected and no-show. The whole cell is the button that opens the day (today's day-number behaviour, BC:1635). The month row height is 56 px while compact.

### 7. Status and announcements

- `block-label.ts` exports `STATUS_ICONS` for the six status ids (BC:82-89): `accepted` → `Check`, `pending` → `Clock`, `completed` → `CheckCheck`, `rejected` → `X`, `no_show` → `UserX`, `cancelled` → `Ban`, anything else → `Circle`; and `blockName(parts)`, which fills one message, `sched_block_name` ("{service}, {client}, {day}, {start} a {end}, {status}"), with the status label passed in (it is a component-local closure, BC:1716-1726), the day formatted long in the page locale, and for a merged visit the lead's service plus "y N más".
- A block at least 44 px tall renders one extra line: icon + status label. Every block's `aria-label` is `blockName(…)`.
- One `aria-live="polite"` element gets `sched_range_announce` ("{view}, {range}, {count} citas") 300 ms after the last change of view or visible range.

## Detailed Implementation Plan

### S1 · The calendar takes the screen (hub PR 1)

1. `phone.svelte.ts`, cookie sync in the root layout; `phoneHint` and `viewInUrl` in both page loads; `parseCalendarPageView` / `calendarViewOf` fallback argument + unit tests; `compact` state and `compactCalendar` in both pages; shallow `replaceState` for the first visit.
2. `CollapsibleFilters` `compact` prop.
3. `ShiftDialogs.svelte` + layout context; `ShiftBanner` uses it. Mounted test: both dialogs still open from the banner on desktop.
4. `compact` prop in the component: compact toolbar branch, three sheets, `kebabBadge`, `kebabAttention`, bottom scroll padding; flip effect.
4a. `corner-reserve.svelte.ts`, `CalendarAddButton.svelte`, the `FloatingAssistant` position rule; both hosts render the button when they can create.
5. `WeekStrip.svelte` + story; runway anchoring on the date when `weekDays < 7`.
6. Hosts: `weekDays`/`subBy` overrides; POS `features.agenda`; header and tray behind `!compactCalendar`; POS `activeFilterCount` + `CollapsibleFilters`; POS `kebabItems` rows (shift, "Ir a", unscheduled) and the hoisted tray snippets + sheet.
7. `pos/+layout.svelte` and `scheduling/+layout.svelte` `:has()` rules.
8. Messages (en + es): view names, "+" accessible name ("Nueva cita"), week-strip names, sheet titles, the three "…" rows, "Caja cerrada".
9. Tests:
   - unit: view fallback with and without the hint, explicit view wins, table/board return;
   - mounted: compact toolbar has the four controls and none of the desktop ones; the "+" button calls the create handler and is absent when the person cannot create; the assistant position rule (default place raised by the reserve; a dragged place moved up only when it would overlap; saved place untouched; back to normal when the reserve is released); view sheet lists Día, 3 días, Mes, Lista and the layout switcher; week strip marks today and the selected day by attribute and name, not only class; POS filter count; shift row label for open, closed and no-permission; `action-scope.test.ts` extended to POS; `calendar-toolbar.mounted.test.ts` untouched;
   - browser (`tests/e2e/ui-audit/calendar-mobile.spec.ts`, using its `mobile-fixture`): with the cookie set, the server HTML already has the compact toolbar; chrome above the calendar area ≤ 160 px at 390 × 844 and 360 × 640 on both pages, POS in full and module mode (module mode set through the same localStorage key `navMode` reads); no horizontal page scroll; toolbar controls ≥ 44 px; "+" is 56 px in the bottom-right corner, the assistant bubble is above it with no overlap, the last list row scrolls clear of both, and after navigating to another page the bubble is back in its corner; the three "…" rows open their targets, including the shift dialog; week strip changes the day; 3 días starts on the selected day and swipes; 844 × 390 hides the strip; resizing across 768 px keeps day and filters; without the cookie the page ends on Día with `date` and other parameters kept;
   - desktop screenshots of both pages at 1280 × 800 from the same spec, compared before and after.
10. Phone layout stories for both pages (`src/lib/stories/Layouts/`).

### S2 · Touch that works (hub PR 2)

1. `data-dense` on `.cal-scroll`, one block-minimum constant, 24 px under coarse pointers. Browser assertion: a 30-minute block is not 44 px tall on a phone.
2. `longpress` options form and the two fixes + unit tests (ms, slop, cancel, non-primary pointer, `fired` reset, old call form).
3. `touch-action`, `user-select`, callout, resize edge hidden; permanent `touchmove` listener and `touchHeld`; `lastPointerType`; `contextmenu` early return.
4. Split `beginCreate`/`beginDrag`; one `use:longpress` on `.cal-scroll`.
5. Scroll-aware drag maths, vertical rAF scrolling, one-column edge stepping with the settle fallback and the render-window cap; remove the TODO (BC:2194-2199) and update `proposals/2026-09-25-hub-pos-calendar-color-followups.md`.
6. `features.tapSummary` (update `calendar-features.test.ts:11-32`), the summary sheet, the card's `touch` argument, hosts' `actions` snippets in touch mode; both hosts turn the flag on.
7. `onopen(id, opts?)`, host state, `startInReschedule` in the drawer.
8. Messages: "Mover a…", "Abrir cita", sheet title, action labels.
9. Tests:
   - mounted: touch tap opens the sheet and mouse click calls `onopen`; the sheet shows the status even with the field hidden, no duplicate opener, no cancel or no-show; "Mover a…" passes `{ reschedule: true }`; merged visit shows the visit card; drawer with `startInReschedule` shows the seeded form after load and not after a reload;
   - browser, Chromium, touch driven through CDP `Input.dispatchTouchEvent` in a small helper added to the spec: swipe on a block and on empty space scrolls and creates nothing; hold + drag creates at the dragged time; hold + drag to the bottom edge scrolls and the block lands on the time under the finger; hold + release does nothing; a second finger during a hold starts nothing; a refused move (the move request stubbed to fail) returns the block and shows the server's message; the same scroll/hold/tap run at 1024 × 768 touch; mouse at 1280 px: drag-create, hover card, and a drag across the bottom edge; reduced motion disables the lift transition;
   - manual check on one iPhone and one Android phone, with device and OS noted in the PR.

### S3 · Lista and Mes on phones (hub PR 3)

1. Agenda rows: client, status badge, merged-visit rule, empty-day rows from `visibleDays`, 44 px rows.
2. Compact month cells and row height; cell opens the day.
3. Messages: "Sin citas", count label for screen readers.
4. Tests: mounted (rows, empty days, no whole-range empty state while compact, month counts exclude cancelled); browser (month day tap opens Día; list follows the week strip; rows and month cells ≥ 44 px).

### S4 · Status and announcements (hub PR 4)

1. `block-label.ts` + unit tests (each status id, fallback, merged visit, both locales).
2. Status line on blocks ≥ 44 px (and absent below); `aria-label` on blocks.
3. Live region for range and view changes.
4. Tests: mounted (name contains day, time, status; status line present at 44 px and absent at 43; live region text after a date change and after a view change); a11y gates run locally, baselines only lowered; desktop screenshot diff limited to the status line.

## Alternatives

| Alternative | Why not |
|---|---|
| A separate phone calendar component, or `@event-calendar` on phones | Two calendars to keep in step (drag rules, merge, colours, filters, optimistic moves). |
| A new `phoneView` value and saved choice | The view is server-loaded from the address (POS:295-301, `+page.server.ts:45`); a second value would disagree with it. Three days and the list already exist under `week` and `agenda`. |
| Decide "phone" only in the browser | The server would draw the desktop chrome and seven columns first on every visit. |
| A new hold recogniser file | `lib/actions/longpress.ts` already has the timer, slop, cancel and click swallow, and says to promote it when a second host appears. |
| Install the `touchmove` blocker when the hold fires; fall back to `touch-action: none` | Browsers decide scroll handling at touch start; both come too late in the gesture. |
| "+" in the toolbar row | The owner asked for the floating "+" in the bottom-right corner with the assistant above it (2026-11-21). |
| Floating pill for unscheduled services | One floating button is the owner's choice; the count on "…" keeps the corner to two controls. |
| Full-width paged staff columns in Día | The day scroller has no snap or scroll padding and no scroll tracking (BC:4144-4191, 3127), and an existing phone test pins readable staff columns with sideways scroll. |
| A list of the tapped day under the month | Month is an endless vertically snapping scroller (BC:4178-4187); there is no "under". Opening the day is one tap and already exists. |
| A new "Mover a…" form | `BookingDetailDrawer` already has it (`:269, 526-583`). |
| Grid roles and one tab stop in this spec | Does not fit the virtualised runway (the focused element unmounts) and changes desktop keyboard behaviour pinned by `calendar-s4.mounted.test.ts:193, 209`. Deferred to the accessibility program. |
| Free gaps computed in the browser | `hours` is one open/close pair per weekday (BC:337-344), so breaks would show as free. The server's `computeSlots` (`server/scheduling/slots.ts:243`) is the right source; proposed as a follow-up. |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Real iOS and Android differ from emulation for hold, scroll cancel and the long-press menu. | S2 is its own PR and is not merged before a manual check on one device of each; the layout slice (S1) does not depend on it. |
| The 5.4k-line component is edited by other sessions. | Four small PRs, rebased before review; compact markup is a separate branch of the toolbar; new logic in new files. |
| Hiding the cash-shift row hides a till warning. | The "…" button shows a dot when the shift needs attention. The owner has not confirmed hiding it; keeping a 44 px strip is removing one CSS rule. |
| First visit from a new phone draws the desktop arrangement once. | Stated in the spec; the cookie is set on that visit and the page switches in its first effect without a second load. |
| Moving the shift dialogs out of `ShiftBanner` touches the till. | It is a move, not a rewrite: same markup and handlers, one mounted test that both dialogs still open from the banner, and the browser test opens them from the "…" row. |
| The cookie says phone but the window is now wide (or the reverse). | `compact` follows the media query once hydrated, and the cookie is rewritten on every change. |
| The scroll-aware drag maths change mouse drags too. | Existing drag tests run unchanged; a browser test drags with a mouse across an edge. |
| The assistant position rule changes a component every page uses. | The rule only acts while a page holds the reserve; with no reserve the code path returns the same values as today, and a mounted test pins that. |
| The assistant bubble can sit over a sheet's last row. | The sheets' content ends with bottom padding of the safe-area inset plus 72 px, which clears the bubble's default position. A bubble the user dragged elsewhere is their choice. |
| Tablets (coarse pointer, wide) get touch behaviour with the desktop toolbar. | Intended; the browser test includes a 1024 × 768 touch run for scroll, hold and tap. |

## Complexity Tracking

No constitution violations.
