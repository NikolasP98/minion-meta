# Quickstart: verifying Calendar on phones

Use a clean hub clone, never the owner's checkout. Local stack: `bun run dev:local --no-seed` (seeded QA database, app on `127.0.0.1:5199`), then a 390 × 844 touch-emulated browser logged in as the QA owner. The automated versions of the layout and touch checks live in `tests/e2e/ui-audit/calendar-mobile.spec.ts`.

## S1 · Layout

1. `/pos/appointments` and `/scheduling/calendar` at 390 × 844 with no `view` in the address: Día, top bar, one toolbar row, week strip. At most 160 px above the calendar area (also at 360 × 640), no horizontal page scroll. Repeat POS in full and module navigation modes.
2. Reload: the phone layout is there on first paint. Clear the `hub_phone` cookie and load again: the page ends on Día with the date kept, without a second page load.
3. Set two filters: the Filters button shows "2" on both pages.
4. "…" on POS: the cash-shift row opens the shift actions; "Ir a" lists the POS sections; the unscheduled row shows the count, opens the cards, and a card opens the new-appointment form.
5. View menu: Día, 3 días, Mes, Lista, then calendar / table / board. Table and board show today's page chrome.
6. 3 días: three columns; swiping moves days. "+" opens the new-appointment form.
7. Rotate to 844 × 390: the week strip hides, the toolbar stays.
8. Resize across 768 px: the day and filters are kept.
9. Desktop screenshots of both pages match the ones taken before the change.

## S2 · Touch

0. A 30-minute appointment is drawn shorter than a 60-minute one (not stretched to 44 px).
1. Swipe up on a block and on empty space: the hours scroll, nothing is created or moved.
2. Press and hold empty space, drag down, release: the form opens with that time. Hold and release without dragging: nothing.
3. Press and hold a block, drag to the bottom edge: the calendar scrolls; release and the block is at the time under the finger.
4. Tap a block: the summary sheet; "Abrir cita" opens the appointment; "Mover a…" opens it on the change-date-time-staff form.
5. With a mouse at 1280 px: click, drag-create and hover card behave as before; dragging to an edge scrolls.
6. Repeat 1 to 4 on one real iPhone and one real Android phone; note device and OS in the PR.

## S3 · Lista and Mes

1. Lista on both pages: the week by day with client and status; empty days say "Sin citas"; the week strip changes the week.
2. Mes: date and count per day; a day tap opens Día.

## S4 · Status and announcements

1. Tall blocks show a status icon and name.
2. A screen reader reads service, client, day, time and status on a block, and the new range after navigating.
3. `bun run a11y` reports no new violations.

## Gates for every slice

`bun run i18n:compile && bun run lint:design && bun run lint:tokens`, then `bun run check`, unit and mounted tests, the ui-audit spec, one gate at a time.
