---
id: 2026-09-08-hub-scheduling-calendar-followups
title: Scheduling calendar follow-ups — infinite scroll, reschedule warnings
status: draft
created: 2026-09-08
updated: 2026-09-08
repos: [minion_hub]
---

# Scheduling calendar follow-ups

Open ends left by spec `2026-09-08-hub-scheduling-calendar-views-tags-spec` (pass 2). Each has a matching
`TODO(handoff)` in code where noted.

## 1. Infinite scroll for week/month (deferred by the owner)

Owner's original ask: "weekly has infinite side-scroll; monthly has infinite vertical scroll". Pass 2 moved the
views onto `@event-calendar/core` for drag/drop + resize; the library pages with prev/next and has no infinite
mode. Owner chose "library now, infinite scroll as a later slice".

Sketch: keep the library instance, wrap it in a scroll window that renders 3 consecutive weeks (or 3 months)
as three instances side by side / stacked, recycling the outer ones as the user scrolls past the middle and
calling `CalendarStore.ensure()` for the new span. Toolbar title follows the centre instance.

Definition of done: scrolling right/left (week) or down/up (month) never reaches an edge; the URL `?date=`
follows the centre; drag/drop still works inside every instance.

## 2. Reschedule warnings payload

`rescheduleBooking` (`src/server/services/scheduling-bookings.service.ts`, `TODO(handoff)`) allows moves outside
working hours / onto holidays / onto approved leave by design (a human decides), but returns no warning. The
confirm dialog should show "outside Leiva's working hours" / "Peru holiday" before Save.

Definition of done: PATCH response carries `warnings: string[]` computed from the slot engine's
`nonWorkingDates()` + availability rules; `MoveConfirmDialog` renders them; unit test per warning kind.

## 3. No visible staff picker in BookingCreateForm

`BookingCreateForm.svelte` (`TODO(handoff)` at the `resourceId` submit line) prefills `resourceId` from the
calendar's `?resource=` drag-select deep link, but there's no visible field to see or change it — it rides
along silently as a "preferred resource" hint on every submit, including a slot the user re-picks by hand at
an unrelated time. Currently harmless (the backend just 409s and refreshes slots if that resource isn't free),
but can surprise a user who ignores the pre-filled date/time.

Definition of done: a small read-only "for <staff name>" chip next to the slot grid when `resourceId` is set,
clearable by the user; needs a `resources: {id,name}[]` prop threaded from `bookings/new/+page.server.ts`
(currently loads only `eventTypes`/`kinds`/`tags`/`contact`).

## 4. EventHoverCard has no scroll/resize tracking

`EventHoverCard.svelte` computes its position once from `anchor.getBoundingClientRect()` on `eventMouseEnter`
and never updates it — correct for the common case (the card closes on `eventMouseLeave`, well before a
scroll could move the anchor under it), but a fast wheel-scroll while hovering can leave the card visually
detached from its chip for a frame or two. No `TODO(handoff)` in code (deliberate, low-risk simplification);
upgrade to a `scroll`/`resize` listener recomputing `pos` if this turns out to be visible in practice.

## Out of scope
- Kind-driven behaviour (a "Block" kind that hides customer fields).
- Tags on stock items / invoices / staff.
