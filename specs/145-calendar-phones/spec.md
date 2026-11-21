---
id: 145-calendar-phones
title: Calendar on phones — the calendar takes the screen, one toolbar row, touch that scrolls, and a list view
stage: spec
status: draft
verdict: pending
pass: 3
created: 2026-11-21
updated: 2026-11-21
repos: [minion_hub]
tags: [ui]
related: [137-hub-a11y-gates, 134-booking-closure]
---

# Feature Specification: Calendar on phones

**Feature Branch**: `feat/145-calendar-phones-s<N>` (hub, base `master`), one branch per slice

**Created**: 2026-11-21

**Status**: Draft

**Input**: Owner, 2026-11-21: "I need you to improve the mobile experience for calendar views. […] consider: The component itself (usability on mobile devices, visibility, a11y, etc), the pages where its embedded, toolbars that affect its behaviors. On mobile, the calendar should be the main element and should occupy the grand majority of the screen's real-estate."

After seeing three variations ([preview](https://claude.ai/artifact/EMs9Zhvx4f6AwNuYmQugLm)): "I'll go for B option. I do want a list view as well (C), but the default is the calendar."

## Words used here

- **Phone**: a screen up to 767.98 px wide, or a touch screen up to 500 px tall (a phone held sideways). Tablet and desktop are everything else.
- **Calendar area**: everything below the week strip: the day header and the time grid (or the month or the list).
- **Block**: one appointment drawn on the time grid.
- **Layout**: calendar, table or board (the switcher both pages already have). **View**: Día, 3 días, Mes or Lista inside the calendar layout.
- **Lanes**: the optional sub-columns inside a day (for example one per status) that the "…" menu can turn on.

## AS-IS (observed 2026-11-21, hub `origin/master` `3d39cbb6`, local QA stack, 390 × 844)

Screenshots: [appointments day](asis/appt-day.jpg) · [week](asis/appt-week.jpg) · [month](asis/appt-month.jpg) · [tap](asis/appt-event.jpg) · [team calendar week](asis/sched-week.jpg) · [month](asis/sched-month.jpg) · [tap](asis/sched-event.jpg).

"BC" is `src/lib/components/scheduling/BookingCalendar.svelte`; "POS" is `src/routes/(app)/pos/appointments/PageBody.svelte`; "SCHED" is `src/routes/(app)/scheduling/calendar/PageBody.svelte`.

### Where the screen goes

| Page | Above the time grid | Grid starts at | Grid share of 844 px |
|---|---|---|---|
| `/pos/appointments` | top bar 56 · POS section nav with its cash-shift row, page title, unscheduled tray 354 · calendar toolbar (3 wrapped rows) + day header 215 | 625 px | **26%** |
| `/scheduling/calendar` | top bar 56 · scheduling section row + page title 116 · calendar toolbar + day header 268 | 440 px | **48%** |

Measured from the running pages (`.cal-root` top = 410 and 172; grid tops read off the screenshots). The POS figure is for the full navigation mode; in module mode the section nav is replaced by the cash-shift strip alone (`pos/+layout.svelte:16,25`).

### The component

- **One phone rule in the whole component**: `(max-width: 767.98px), (pointer: coarse)` gives toolbar controls a 44 px floor and makes the date navigation a full-width row (BC:4048-4096). The toolbar then wraps to three rows.
- **Week view shows 7 columns by default** (`weekDays`, 2 to 14, BC:24-25, 466): about 48 px each at 390 px. Labels cut to "10:0" and "Q…".
- **A finger does not scroll the grid.** Empty track space, draggable blocks, the resize edge and the hour gutter set `touch-action: none` (BC:4578, 4675, 4780, 4234). A drag draws a new appointment after 4 px (BC:2037-2080) or moves one (BC:2200-2244). There is no press-and-hold, and no auto-scroll at the edges (TODO at BC:2194-2199).
- **The summary card is hover-only.** Block tooltips do not set `tapToOpen` (BC:3584-3601); a tap opens the full-screen drawer through `onopen` (BC:2479-2483).
- **Status is mostly colour.** The block tint carries it (BC:4631-4642); only cancelled, rejected and no-show also get a strike-through (BC:4661-4666). The status name is in the hover card.
- **Blocks ignore their length on phones.** An app-wide rule gives every button a 44 px minimum height on phones (`app.css:680-697`), and a block is a button, so a 30-minute appointment is drawn 44 px tall (about 47 minutes at the default scale) and can cover the next one (see the 10:00 block, a 30-minute appointment, in [team calendar week](asis/sched-week.jpg)).
- **Small targets**: block minimum 18 px on desktop (BC:1413), resize edge 6 px (BC:4778), month chips, day numbers and "+N más" opt out of the 44 px floor (BC:5234, 5252, 5314, 5333).
- **Month view**: 7 columns of about 55 px with up to 3 clipped chips per cell (BC:58, 1620-1626, 5179).
- **Screen readers and keyboard**: a block's name does not say its day or status; date navigation is not announced; week view has about 49 tab stops (BC:3539, 31); Enter on a day always books 09:00 (BC:3547-3548). Moving without a mouse is possible only from the drawer's "Cambiar fecha, hora o miembro del equipo" form (`BookingDetailDrawer.svelte:269, 526-583`).
- **A list view exists** (`agenda`, BC:570, 1576-1590) but is off by default (`calendar-features.ts:13-38`); only `/scheduling/calendar` turns it on. Its rows show time, service and staff, not status, and days without appointments are left out (BC:1587).
- **The view lives in the address and is loaded by the server**: every navigation writes `?view=` (POS:295-301), the page load reads it (`+page.server.ts:45`) and the calendar renders `data.view`. With no `view` the server uses `week` on every device (`calendar-window.ts:27, 88-91`). The layout (table, board) uses the same parameter (`calendar-window.ts:61-63`).

### The pages and toolbars

- POS: filters render inline in the calendar toolbar with no count (POS:1210-1223). The unscheduled tray is a toggle row plus a horizontal strip; a card can be dragged onto the calendar (mouse only) or tapped, which opens the new-appointment form for that service (`clickPick`, POS:1026-1037, 561-574).
- SCHED: filters collapse into one button and a bottom sheet on phones (`CollapsibleFilters.svelte:28-50`). The list view is on. There is no right-click menu.
- "Nueva cita" is the page-header button on both pages.
- The assistant bubble floats over the bottom-right corner and covers the drawer's last action ([screenshot](asis/appt-event.jpg)).

## TO-BE

### Page layout on phones (both pages, calendar layout)

1. **App top bar** (56 px), unchanged.
2. **One calendar toolbar row** (48 px): date label (opens the date picker, which has Today and month navigation) · view menu · Filters button with the count of active filters · "+" (new appointment) · "…" menu.
3. **Week strip** (56 px): previous-week arrow, seven day buttons (weekday letter and date), next-week arrow. The selected day is filled; today has a ring and the word "hoy" in its name. Not shown in Mes, and not shown on a phone held sideways.
4. **The calendar area** fills the rest. Nothing else sits above it: at most 160 px of chrome, so it gets 81% of an 844 px screen and 75% of a 640 px screen.

Where today's chrome goes on phones while the calendar layout is showing:

| Element | Goes to |
|---|---|
| POS section nav | a "Ir a" list in the "…" sheet (and the app menu, where it already is in module mode) |
| Cash-shift row | a row in the "…" sheet ("Caja abierta · S/ 805.00") that opens the same shift actions; the "…" button shows a dot when the shift needs attention |
| Page title | not shown; the date label is the heading |
| "Nueva cita" button | the "+" in the toolbar |
| Unscheduled tray | a row in the "…" sheet ("131 servicios pagados sin agendar") that opens a bottom sheet with the same cards; the "…" button shows the count. Tapping a card opens the new-appointment form for that service, as today. |
| Layout switcher (calendar / table / board) | the view menu |
| Colours, fields, split, lanes | the "…" sheet |

The table and board layouts keep today's page chrome.

### Views on phones

The view menu offers **Día**, **3 días**, **Mes** and **Lista** on both pages, then the layouts.

- **Día** (default): today's day view. Staff columns keep their readable minimum width and scroll sideways, as today.
- **3 días**: three day columns; swiping sideways moves through the days. Lanes are off on phones so three days always fit.
- **Mes**: each day shows its date and the number of active appointments. Tapping a day opens that day in Día.
- **Lista**: the selected week grouped by day, each row with time, service, client, staff and status name. A day without appointments says "Sin citas".

A phone opens on **Día** when the address names no view. A link that names a view is honoured; a link to the seven-day week shows 3 días.

### Touch (any touch screen, including tablets)

- One finger **always scrolls** the calendar, wherever it lands.
- **Press and hold** (about 0.4 s; the block or slot lifts) on empty space starts a new appointment; on a block picks it up to move. Dragging near the top or bottom edge scrolls; holding at the left or right edge in 3 días steps one day at a time. Lifting the finger without dragging cancels.
- **Tap a block**: a bottom sheet with the same summary the hover card shows on desktop (service, status, when, client, staff, payment), the page's existing quick actions for that appointment, "Mover a…" and "Abrir cita".
- **"Mover a…"** opens the appointment with its existing change-date-time-staff form already open.
- Toolbar controls, week-strip days, list rows, month days and sheet actions are at least 44 px. A block is at least 24 px tall and its height shows its real duration (today every block is stretched to 44 px on phones).
- Changing an appointment's length by touch is done from the appointment, not by dragging its edge.
- In Día a dragged block can be dropped on the staff columns that are on screen; to move it to another person, use "Mover a…".
- Cancel and no-show are not in the summary sheet; they stay in the appointment, behind their confirmations.

### Status and screen readers (all devices)

- A block tall enough shows a **status icon and name**. Every block's accessible name states service, client, day, time and status.
- Changing the date or the view is announced ("lunes 16 de noviembre, 5 citas").
- The list view is the linear way to read a week with a screen reader.

### Invariants

- On desktop and tablet the layout, the seven-day week, hover cards, the toolbar and mouse drag behave as today. The only visible differences there are the status icon and name on blocks, and the calendar scrolling when a mouse drag reaches an edge.
- Filters, colours and the selected day survive switching views and layouts. The same filter state drives calendar, table, board and list.
- No booking rule changes: the same validations, permissions and server calls as today.
- No horizontal page scroll at 360 px; nothing required is hidden to make it fit.
- Crossing between phone and desktop size cancels a drag in progress and keeps the day, filters and any open appointment.

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | Chrome above the calendar area 440–625 px → at most 160 px on both pages (81% of 844, 75% of 640) | Browser test (`tests/e2e/ui-audit/calendar-mobile.spec.ts`) measures the calendar area at 390 × 844 and 360 × 640, in both POS navigation modes |
| D2 | Three toolbar rows → one 48 px row; POS filters inline → one button with count | Same browser test (row count, control sizes); `action-scope` test extended to POS |
| D3 | Phone opens on the seven-day week → Día by default; 3 días, Mes, Lista in the menu | Unit test of the server view default (phone hint, explicit view wins); browser test of the menu |
| D4 | Finger draws/moves → finger scrolls; press-and-hold creates/moves; edges scroll; blocks 44 px regardless of length → true length, 24 px minimum | Browser test with touch input: swipe changes scroll position and creates nothing; hold-then-drag creates; hold-then-drag moves across an edge and lands on the right time |
| D5 | Tap opens the full drawer → tap opens the summary sheet; "Abrir cita" opens the drawer; "Mover a…" opens it on the move form | Mounted test (touch tap vs mouse click) |
| D6 | Status by colour → icon + name + accessible name; date changes announced | Mounted test of the name and the live region; a11y gates (spec 137) stay green |
| D7 | Month chips → date + count; day tap opens the day | Browser test at phone width |
| D8 | List rows without status, empty days missing, POS has no list → list on both pages with status and "Sin citas" | Mounted test |
| D9 | Unscheduled tray in the page flow → "…" sheet row with count; card tap still books | Browser test with touch input opens the form for an unscheduled service |
| D10 | Desktop: layout, toolbar order and mouse behaviour unchanged | Existing desktop tests pass; `calendar-toolbar.mounted.test.ts` control-order assertions untouched; desktop screenshots match except block status lines |

## Delivery slices

Each slice is one hub PR. S1 delivers the owner's rule on its own. S2 and S3 need S1. S4 can ship at any point.

1. **S1 · The calendar takes the screen**: page chrome out of the way, one toolbar row, week strip, "…" and view sheets, Día default, 3 días (D1, D2, D3, D9).
2. **S2 · Touch that works**: scrolling, press-and-hold, edge scrolling, tap summary sheet, "Mover a…" (D4, D5).
3. **S3 · Lista and Mes on phones** (D7, D8).
4. **S4 · Status and announcements** (D6).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — See the day on a phone (Priority: P1)

A receptionist opens appointments on a phone and sees today's schedule filling the screen, and picks another day from the week strip.

**Why this priority**: it is the owner's rule; today the grid gets a quarter of the screen.

**Independent Test**: open `/pos/appointments` at 390 × 844; at most 160 px sit above the calendar area; tap Wednesday in the week strip and the day changes.

**Acceptance Scenarios**:

1. **Given** a phone, **When** the appointments page opens with no view in the address, **Then** it shows Día for today with the week strip and one toolbar row.
2. **Given** the 3 días view, **When** the person swipes left, **Then** the following days show and the week strip follows.
3. **Given** two active filters, **When** the page loads, **Then** the Filters button shows "2" and opens a bottom sheet with the same filters as desktop.
4. **Given** the "…" sheet, **When** the cash-shift row is tapped, **Then** the same shift actions open as from today's strip.
5. **Given** the "…" sheet, **When** the unscheduled row is tapped and a card is chosen, **Then** the new-appointment form opens for that service.

### User Story 2 — Scroll and act on an appointment by touch (Priority: P1)

Staff scroll the day with one finger, tap an appointment, read its summary, and charge, complete, move or open it.

**Independent Test**: swipe up on a block and the hours scroll; tap it and a bottom sheet shows its summary and actions.

**Acceptance Scenarios**:

1. **Given** the day view, **When** a finger swipes vertically on a block or on empty space, **Then** the calendar scrolls and nothing is created or moved.
2. **Given** a block, **When** it is tapped, **Then** a bottom sheet shows service, status name, when, client, staff, payment and the page's quick actions.
3. **Given** the sheet, **When** "Abrir cita" is chosen, **Then** the full appointment opens; **When** "Mover a…" is chosen, **Then** it opens on the change-date-time-staff form.
4. **Given** a block, **When** it is pressed and held and dragged, **Then** it moves, the calendar scrolls when the finger nears an edge, and it lands on the time under the finger.
5. **Given** a move the server refuses, **Then** the block returns to its place and the reason is shown.
6. **Given** a mouse on desktop, **When** a block is clicked, **Then** the appointment opens as today.

### User Story 3 — Book from a phone (Priority: P2)

Staff create an appointment with "+", by press-and-hold on a free slot, or from an unscheduled paid service.

**Acceptance Scenarios**:

1. **Given** the calendar, **When** "+" is tapped, **Then** the new-appointment form opens for the selected day.
2. **Given** empty space, **When** it is pressed and held and dragged, **Then** a snapped block is drawn and the form opens with that time.
3. **Given** a press-and-hold on empty space, **When** the finger lifts without dragging, **Then** nothing happens.

### User Story 4 — Read the week as a list and scan the month (Priority: P2)

A manager reads a week as a list and checks how busy the month is.

**Acceptance Scenarios**:

1. **Given** Lista on either page, **Then** the selected week is grouped by day with time, service, client, staff and status name, and empty days say "Sin citas".
2. **Given** Lista, **When** the week strip moves to another week, **Then** the list shows that week.
3. **Given** Mes on a phone, **When** a day is tapped, **Then** that day opens in Día.

### User Story 5 — Know the status without seeing colour (Priority: P3)

**Acceptance Scenarios**:

1. **Given** a block at least 44 px tall, **Then** it shows a status icon and name.
2. **Given** a screen reader on a block, **Then** it reads service, client, day, time and status.
3. **Given** the date changes, **Then** the new range and the number of appointments are announced.

### Edge Cases

- A day with no appointments: the grid shows working hours; the list says "Sin citas".
- The phone is rotated or the window crosses 768 px: the layout switches, a drag in progress is cancelled, and the day, filters and open appointment are kept.
- A phone held sideways: the week strip is hidden; prev/next are in the date picker.
- A link to the seven-day week opened on a phone: shows 3 días.
- A tablet with touch: keeps the desktop layout and gets the touch behaviour.
- A merged visit (several services in one block): the sheet shows the visit summary, as the hover card does.
- The first visit from a new phone: the page may open once in the desktop arrangement before switching; later visits open directly in the phone layout.
- Cancelled appointments stay struck through and reachable.
- The cash shift is closed: the "…" row says so and offers the same actions. A person who cannot manage the shift sees its state only.
- A person who cannot create appointments sees no "+".
- Reduced-motion setting: no lift or slide animations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On phones, with the calendar layout showing, at most 160 px (top bar, one toolbar row, week strip) MUST sit above the calendar area on both pages, in both POS navigation modes.
- **FR-002**: The toolbar row MUST hold the date label, the view menu, one Filters button with the active count, "+" and "…", each at least 44 px.
- **FR-003**: The view menu MUST offer Día, 3 días, Mes and Lista on both pages, plus the table and board layouts. A phone MUST open on Día when the address names no view, and MUST honour a view named in the address.
- **FR-004**: The week strip MUST select a day, move by week, and mark today and the selected day without relying on colour alone.
- **FR-005**: The POS section links, the cash-shift actions and the unscheduled services MUST each be reachable in two taps from the calendar ("…", then the row).
- **FR-006**: A one-finger drag MUST scroll the calendar and MUST NOT create or move an appointment.
- **FR-007**: Press-and-hold MUST start create (empty space) or move (block), scroll at the edges, land on the time under the finger, and cancel when released without dragging.
- **FR-008**: A touch tap on a block MUST open a summary sheet with the page's quick actions, "Mover a…" and "Abrir cita". A mouse click MUST open the appointment as today.
- **FR-009**: On touch screens, controls, week-strip days, list rows, month days and sheet actions MUST be at least 44 × 44 px, and a block MUST be at least 24 px tall.
- **FR-010**: Status MUST be shown by icon and name as well as colour on blocks tall enough, in the sheet and in list rows, and be part of the block's accessible name.
- **FR-011**: Month view on phones MUST show the date and the count of active appointments per day; a day tap MUST open that day.
- **FR-012**: List view MUST be available on both pages on phones, grouped by day, with time, service, client, staff and status, and MUST show days without appointments.
- **FR-013**: Date and view changes MUST be announced to screen readers.
- **FR-014**: On desktop and tablet, the layout, toolbar and mouse behaviour MUST NOT change, apart from the block status line and edge scrolling during a drag.
- **FR-015**: Every new text MUST be translated (es, en) and every style MUST follow the design-token contract.

### Key Entities

- **View**: `day`, `week` (shown as 3 días on phones), `month`, `agenda` (Lista), or a layout (`table`, `board`). One value, in the address, as today.
- **Phone hint**: a per-device marker that lets the server choose Día and the phone layout before the page is drawn.

## Success Criteria *(mandatory)*

- **SC-001**: On a 390 × 844 phone the calendar area covers at least 80% of the screen on both pages (today the grid gets 26% and 48%); on 360 × 640 at least 74%.
- **SC-002**: A person can scroll a full day with one finger without creating or moving anything, in 20 out of 20 tries.
- **SC-003**: Charging, completing or opening an appointment takes at most two taps from the calendar; moving it takes at most two taps to reach the move form.
- **SC-004**: Everything the removed page chrome offered (POS sections, cash shift, unscheduled services, new appointment, layouts, filters) is reachable in at most two taps.
- **SC-005**: A screen-reader user hears service, client, day, time and status for any appointment, and the new range after navigating.
- **SC-006**: The accessibility gates report no new violations on the two pages.
- **SC-007**: Desktop screenshots of both pages differ only by the status line on blocks.

## Assumptions

- **Cash shift**: its row moves into the "…" sheet on phones. Keeping a 44 px strip visible instead would raise the chrome to 204 px (76% of 844). The owner has not confirmed this.
- **"+" in the toolbar**: the owner saw a floating "+" in the mock-up. The review found the assistant bubble is draggable and always paints on top, so a floating button cannot be kept clear of it. The "+" moved into the toolbar row and the unscheduled count onto "…". The owner has not seen this change.
- **A phone always opens on Día** unless the link names a view; the last view used is not remembered.
- **Free gaps in the list** ("Libre 11:00 – 11:30 · + Agendar"), shown in the option C mock-up, are not in this spec: the calendar only knows each day's opening and closing time, so breaks would show as free. They need the server's slot calculation and are proposed as a follow-up.
- **Drag-to-resize by touch** is not offered (today's 6 px edge is not usable by finger either).
- **Hour-height drag on the left gutter** stays mouse-only; on touch the gutter scrolls.
- Press-and-hold is 400 ms.
- Phone usage of these pages was not measured in PostHog for this spec.
- Real-device behaviour (iOS Safari, Android Chrome) is verified during S2 on at least one of each before merge.

## Out of scope

- A single tab stop with arrow-key navigation across the grid, and Enter booking the focused time. It changes the keyboard model on desktop and belongs to the accessibility program (meta proposal #1060).
- Free gaps in the list (see Assumptions).
- The assistant bubble covering the drawer's last action (seen in the screenshots; an existing issue on every page).
- `/pos/history` month calendar and the team time-off calendar (they use `@event-calendar`, not this component).
- The public booking page.
- New booking rules, statuses or permissions.

## FigCraft demo

[calendar-phones.figcraft](calendar-phones.figcraft), page "Spec 145 · demo", 11 phone frames (390 × 844):

1. As-is (screenshots of the running pages): appointments day view, team calendar week view, tapping an appointment.
2. To-be: Día, 3 días, Mes, Lista.
3. To-be sheets: appointment summary, the "…" menu on appointments (cash shift, unscheduled services, POS sections, calendar options), the view menu, filters.

The master frames "Scheduling / scheduling/calendar" and "Sell / staff/appointments" are kept on their pages as desktop context. Mock data is fictitious. The [interactive preview](https://claude.ai/artifact/EMs9Zhvx4f6AwNuYmQugLm) shows the same screens next to the two options that were not chosen.
