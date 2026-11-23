# Tasks: Calendar on phones

**Input**: [spec.md](spec.md), [plan.md](plan.md) (Technical Plan §1–§7 and the Detailed Implementation Plan), [contracts/calendar-compact.md](contracts/calendar-compact.md), [quickstart.md](quickstart.md)

**Tests**: included, because the spec's DELTA table names a proof for every row.

Paths are in the hub repository. "BC" is `src/lib/components/scheduling/BookingCalendar.svelte`, "POS" is `src/routes/(app)/pos/appointments/`, "SCHED" is `src/routes/(app)/scheduling/calendar/`. `[P]` = can run in parallel with the other `[P]` tasks of the same phase (disjoint files). Slice S1 = phases 1–3; S2 = phase 4; S3 = phase 5; S4 = phase 6.

## Phase 1: Setup (S1)

- [x] T001 Clean hub clone on `feat/145-calendar-phones-s1` from `origin/master`; `bun install --frozen-lockfile`, `bunx svelte-kit sync`, `bun run i18n:compile`
- [x] T002 Capture desktop screenshots (1280 × 800) of `/pos/appointments` and `/scheduling/calendar` on the local QA stack before any change, for the D10 comparison

## Phase 2: Foundational (S1) — three bundles on disjoint files

**Bundle A · phone signal and view default**

- [x] T003 [P] Create `src/lib/state/ui/phone.svelte.ts`: `phone` (`MediaQuery` `(max-width: 767.98px), ((pointer: coarse) and (max-height: 500px))`) and `syncPhoneCookie()` writing or clearing `hub_phone=1` (path `/`, one year, `SameSite=Lax`); call it from an effect in `src/routes/+layout.svelte`
- [x] T004 [P] In `src/lib/components/scheduling/calendar-window.ts` add the `fallback` argument to `parseCalendarPageView` and `calendarViewOf` (default `DEFAULT_CALENDAR_VIEW`, so other callers are unchanged); unit tests in `calendar-window.test.ts`: no hint → week, hint → day, explicit view wins, `table`/`board` resolve to the fallback
- [x] T005 [P] In `POS/+page.server.ts` and `SCHED/+page.server.ts` read the `hub_phone` cookie, pass `phoneHint ? 'day' : 'week'` as the fallback, and return `phoneHint` and `viewInUrl`
- [x] T006 [P] Add the `compact?: boolean` prop to `src/lib/components/data-table/CollapsibleFilters.svelte` (when passed it replaces the component's own media check); extend `CollapsibleFilters.mounted.test.ts`

**Bundle B · cash-shift dialogs**

- [x] T007 [P] Move the open and close dialogs and their state out of `src/lib/components/pos/ShiftBanner.svelte` (`:155-206, 490-564`) into new `src/lib/components/pos/ShiftDialogs.svelte`; mount it once in `src/routes/(app)/pos/+layout.svelte` outside the nav and strip; expose `{ openShiftDialog, closeShiftDialog }` through layout context; `ShiftBanner` calls the context. Same markup, handlers and permission checks
- [x] T008 [P] Mounted test `src/lib/components/pos/ShiftDialogs.mounted.test.ts`: both dialogs open from the banner with and without an open shift; without `pos:edit` nothing opens

**Bundle C · component, week strip, floating "+"**

- [x] T009 [P] In BC add the `compact`, `kebabBadge`, `kebabAttention` props and the compact toolbar branch (date label button, view button, `tools` snippet, "…" button); date picker, view options (Día, 3 días, Mes, Lista as radio rows calling `onview`, then the `toolbarStart` snippet) and kebab content (existing body + `kebabItems`, without the days-per-screen stepper and the lanes picker) in bottom `Sheet`s; bottom scroll padding variable; effect that clears `drag`/`createDrag` and closes the sheets when `compact` flips. The desktop branch is untouched
- [x] T010 [P] Create `src/lib/components/scheduling/WeekStrip.svelte` (seven days derived as `team/MemberCalendarStrip.svelte:20-59`, week arrows, today ring + "hoy" in the name, selected day filled + `aria-current="date"`, 44 px targets, hidden by CSS at height ≤ 500 px) and render it in BC under the compact toolbar in day, week and agenda views; day tap = internal `goToDay` in week/agenda, `ondate` in day
- [x] T011 [P] In BC anchor the runway on the date itself when `weekDays < 7` (`:742`, `goToDay` `:1087`)
- [x] T012 [P] Create `src/lib/state/ui/corner-reserve.svelte.ts` (`cornerReserve`, `reserveCorner(px)` returning a release function) and `src/lib/components/scheduling/CalendarAddButton.svelte` (56 px fixed button, bottom-right with safe-area offsets, `--layer-sticky`, holds the reserve `56 + 12` while mounted)
- [x] T013 [P] In `src/lib/components/layout/FloatingAssistant.svelte` raise the default place and the home target by `cornerReserve.bottom`; derive the rendered position of a dragged launcher so it never overlaps the reserved corner (saved fraction untouched); same clamp while dragging; home zone measured from the raised default. With no reserve every value equals today's
- [x] T014 [P] Messages for bundle C, appended to `messages/en.json` and `messages/es.json` in the same commit: view names (Día, 3 días, Mes, Lista), sheet titles (Vista, Más, date), week-strip names ("hoy", previous/next week), "Nueva cita" for the "+"
- [x] T015 [P] Mounted tests: `calendar-compact.mounted.test.ts` (compact toolbar has the four controls and none of the desktop ones; view sheet lists the four views and the layout switcher; kebab badge and dot; week strip marks today and selected by attribute and name; desktop render unchanged) and `floating-assistant-corner.mounted.test.ts` (default raised by the reserve; dragged place raised only when overlapping; saved place untouched; back to today's values when released). `calendar-toolbar.mounted.test.ts` stays untouched and green
- [x] T016 [P] Story `src/lib/stories/Calendar/WeekStrip.stories.svelte` and phone stories for the compact toolbar in `BookingCalendar.stories.svelte`

## Phase 3: User Story 1 + 3 on the two pages (S1) — after phase 2

- [x] T017 [US1] `POS/PageBody.svelte`: `compact` state seeded from `data.phoneHint` + effect; `compactCalendar`; root class `is-compact-calendar`; `view` override when the address names none + shallow `replaceState` keeping all parameters; `weekDays`/`subBy` overrides; `features.agenda` when compact; header and tray behind `!compactCalendar`; `activeFilterCount` (SCHED:318-324 without `staff` and `kindId`) + `CollapsibleFilters compact`; pass `compact`, `kebabBadge`, `kebabAttention`
- [x] T018 [US1] `POS/PageBody.svelte`: hoist the tray card and group markup (`:1017-1095`) to top-level snippets; `kebabItems` rows: cash shift (label and attention from `page.data.openShift` as `ShiftBanner.svelte:38-47`; not a button without `pos:edit`), "Ir a" (`getAreaItems('pos', …).filter(canViewPath)`), unscheduled row opening a bottom `Sheet` with the hoisted cards (not draggable, no right-click menu, tap = `clickPick`, closes the sheet)
- [x] T019 [US1] `SCHED/PageBody.svelte`: same `compact`/`compactCalendar`/view/`weekDays`/`subBy` wiring; header behind `!compactCalendar`; `CollapsibleFilters compact`
- [x] T020 [US3] Both pages render `CalendarAddButton` when `compactCalendar` and the header's "Nueva cita" would be enabled (POS:985), calling the existing create handler
- [x] T021 [US1] `:has(.is-compact-calendar)` rules hiding the nav rows and the module-mode shift strip in `src/routes/(app)/pos/+layout.svelte` and `src/routes/(app)/scheduling/+layout.svelte`
- [x] T022 [US1] Messages for the pages (en + es, appended): the three "…" rows, "Caja cerrada", "Ir a", unscheduled sheet title
- [x] T023 [US1] Mounted tests: POS filter count; shift row for open, closed and no-permission; `src/lib/routes/action-scope.test.ts` extended to POS
- [x] T024 [US1] Browser tests in `tests/e2e/ui-audit/calendar-mobile.spec.ts` per plan S1 step 9 (server HTML with the cookie; ≤ 160 px chrome at 390 × 844 and 360 × 640, both pages, POS full and module mode; no horizontal scroll; controls ≥ 44 px; the three "…" rows incl. the shift dialog; week strip; 3 días starts on the selected day and swipes; landscape; resize across 768 px; no cookie → Día with parameters kept; "+" in the corner, bubble above with no overlap, last row scrolls clear, bubble back after leaving)
- [ ] T025 [US1] Phone layout stories for both pages in `src/lib/stories/Layouts/` (not done in the S1 PR; ledger: `proposals/2026-11-21-hub-calendar-phones-followups.md` #9)
- [x] T026 Gates, one at a time: `bun run i18n:compile`, `lint:design`, `lint:tokens`, `check`, unit + mounted tests, the ui-audit spec, `bun run a11y`; desktop screenshots compared with T002; independent code audit; draft PR to `master` titled as a user-facing sentence

## Phase 4: User Story 2 + 3 — touch (S2)

- [x] T027 [US2] `data-dense` on `.cal-scroll`; one block-minimum constant (BC:1413, 2271), 24 px under coarse pointers; browser assertion that a 30-minute block is not 44 px tall
- [x] T028 [P] [US2] `src/lib/actions/longpress.ts` options form `{ ms, slop, onhold, onend }`, ignore non-primary pointers, reset the click-swallow flag on every pointer down; unit tests
- [x] T029 [US2] BC: `touch-action`, `user-select`, callout, resize edge hidden on coarse pointers; permanent non-passive `touchmove` listener + `touchHeld`; `lastPointerType`; `contextmenu` early return for touch and pen
- [x] T030 [US2] BC: split `beginCreate`/`beginDrag` into wrapper + core; one `use:longpress` on `.cal-scroll` (400 ms, slop 12)
- [x] T031 [US2] BC: scroll-aware drag maths, vertical rAF edge scrolling, one-column edge stepping with the settle fallback and render-window cap; remove the TODO (BC:2194-2199); update `proposals/2026-09-25-hub-pos-calendar-color-followups.md` in meta
- [x] T032 [US2] `features.tapSummary` (+ `calendar-features.test.ts`), summary sheet in BC, the card's `touch` argument, hosts' `actions` snippets in touch mode; `onopen(id, opts?)`, `startInReschedule` in `BookingDetailDrawer.svelte`; messages
- [x] T033 [US2] Mounted and browser tests per plan S2 step 9 (touch through CDP `Input.dispatchTouchEvent`); manual check on one iPhone and one Android phone recorded in the PR; gates; audit; draft PR

## Phase 5: User Story 4 — Lista and Mes (S3)

- [x] T034 [US4] BC agenda rows: client, status badge, merged-visit rule, empty-day rows from `visibleDays`, 44 px rows; no whole-range empty state while compact
- [x] T035 [US4] BC compact month cells (date + active count, cell opens the day), 56 px rows; messages
- [x] T036 [US4] Mounted and browser tests per plan S3 step 4; gates; audit; draft PR

## Phase 6: User Story 5 — status and announcements (S4)

- [x] T037 [P] [US5] `src/lib/components/scheduling/block-label.ts` (`STATUS_ICONS`, `blockName`) + unit tests; messages `sched_block_name`, `sched_range_announce`
- [x] T038 [US5] BC: status line on blocks ≥ 44 px, `aria-label` on blocks, live region for range and view changes
- [x] T039 [US5] Mounted tests per plan S4 step 4; a11y gates with baselines only lowered; desktop screenshot diff limited to the status line; gates; audit; draft PR

## Dependencies

- Phase 2 bundles A, B and C are independent of each other; only bundle C edits the message files in phase 2.
- Phase 3 needs all of phase 2.
- S2 and S3 need S1 merged. S4 is independent of S2 and S3.

## Implementation strategy

S1 alone delivers the owner's rule (the calendar takes the screen) and is the first PR. Each later slice is its own PR, merged by the owner.

## As built (S2 to S4): differences from the plan

Hub PRs: S1 #706, S2 #710, S3 #718, S4 #722.

- **T031:** `proposals/2026-09-25-hub-pos-calendar-color-followups.md` was never committed to this repo, so it was not updated. Edge scrolling during a drag is built; the open ends are in `proposals/2026-11-21-hub-calendar-phones-followups.md`.
- **T033:** hold gestures were checked by hand in a browser through CDP touch events on the mobile fixture. There is no automated browser test and no check on a real iPhone or Android phone (follow-ups #10, #11).
- **T035:** compact month rows are 5.5rem tall, not 56 px, so the date and the count both fit. The count is a number only.
- **T037 / T038:** blocks carry hidden text (`sched_block_detail`: day, full range, status) instead of an `aria-label`, so the spoken name contains the visible words (WCAG 2.5.3). `blockName` became `blockDetail`. The messages are `sched_block_detail`, `sched_range_announce_one` and `sched_range_announce_other`.
- **T038:** the status line shows from 72 px, not 44 px (at 44 px it was cut). It needs 16 px more when the block has a "cancelled" line or is clipped at the bottom.
- **T038:** the announcement waits for the scroll to settle and the data to load, is silent until the user first touches the page, and is not repeated for the same view and range.
