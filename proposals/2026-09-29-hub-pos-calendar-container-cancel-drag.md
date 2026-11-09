---
id: 2026-09-29-hub-pos-calendar-container-cancel-drag
title: POS calendar — container status from active members, optimistic cancel, drag-to-reorder / drag-out-to-separate in the fan deck
status: draft
created: 2026-09-29
repos: [minion_hub]
tags: [ui, ux]
spec: specs/2026-09-27-hub-calendar-standardization-spec.md
---

# POS calendar: cancelled members, optimistic cancel, fan-deck drag

Owner request 2026-09-29 (two screenshots of `/pos/appointments`, a 3-member
container "Botox frente, Botox Full Face, Botox Ojeras" whose lead was
cancelled):

> "when I look into a container event and I cancel one of the events, and
> mainly the topmost one, then the entire container looks blocked or canceled,
> while the others in the container are still active. Please figure out a way
> to display this, either by indicating or by separating the canceled event
> from the container … when I tried to cancel the event, I didn't get too much
> visual feedback … let's try to go optimist on the UI feedback … and
> asynchronously wait for the feedback from the server and then revert if it
> fails or keep it as is if it's successful … dragging the fanned out container
> events to reorder them. As well as dragging them out of their fanned
> component to separate them into their own event block. This will mainly
> serve as the alternative to the separate button."

## AS-IS (hub master after #413)

- A container box (`box.members`, `box.lead` = `groupSeq 0`) takes its tone,
  strike-through and title from the LEAD. Cancel the lead → the whole visit
  reads cancelled although two members are confirmed
  (`BookingCalendar.svelte` box rendering; `calendar-window.service.ts` sends
  every status, including cancelled, into the grid — its own `TODO(handoff)`).
- Cancel = `mover.setStatus(id, 'cancelled')` (`kit/booking-mover.ts:82`): a
  bare PATCH, no pending state, boxes re-render only after the page's reload.
- Fan-deck blocks are "Deliberately NOT draggable" (comment at the deck,
  `TODO(handoff)` in `bookingCard`'s Separate action). Separate = the drawer's
  action → `separate(mb)` → `onmove(id, next, { detach: true })` (3+ members:
  the member leaves at the window END; 2 members: the visit dissolves).
- No API to change `groupSeq` order; stamps are written by group create/merge/
  detach only (`scheduling-bookings.service.ts` ~1351–1400).

## TO-BE

1. **Container status = its ACTIVE members.** A member whose status is
   `cancelled` / `rejected` / `no_show` no longer decides the container: the
   container's tone/strike/title come from the first active member (by
   `groupSeq`); when every member is inactive the container reads cancelled as
   today. The container card and hover card show the active services and a
   `t-caption` "N cancelled" (i18n) so the inactive member is still findable;
   in the fan deck the inactive member renders struck-through and muted (it
   already carries its own status class) with the same caption. Chosen over
   physically separating the cancelled member: a member of a shared window has
   no slot of its own, so a detached cancelled box would either overlap the
   container or move the survivors.
2. **Optimistic status changes.** `createBookingMover` gains a status overlay
   (`createOptimistic<string>()` from `$lib/utils/optimistic`): `setStatus`
   applies the new status immediately (`overlay.run(id, status, fetch)`),
   exposes `statusOf(booking)` / `pending(id)`, and reverts + toasts
   (`toastError(m.sched_status_failed())`) on a non-OK response. Both hosts
   (`/pos/appointments`, `BookingsView`) map their bookings through
   `statusOf` before handing them to the calendar, and the drawer's status
   buttons render `pending`/disabled while the request is in flight.
3. **Fan-deck drag.** Pointer-drag on a fan block: while the pointer stays
   inside the deck the block follows and the other members shift (insertion
   preview); release → `onreorder(groupId, orderedIds)` → new
   `POST {apiBase}/{id}/group { reorder: [ids] }` that restamps `groupSeq`
   (pure stamps, the shared window does not move; service
   `reorderVisit(orgId, groupId, ids)` + tests). Release OUTSIDE the deck →
   the existing `separate(mb)` (detach, same conflict dialog). Keyboard: a
   focused fan block moves with `Alt+ArrowUp/Down`, detaches with
   `Alt+Delete`. The deck's "Separate" drawer action stays.

## Verification

- vitest: container status derivation (lead cancelled, all cancelled, none),
  mover overlay (optimistic set, revert on failure), `reorderVisit` stamps.
- Playwright on the QA stack: cancel the lead of a seeded 3-member visit →
  the container stays active with "1 cancelled"; the box updates before the
  response resolves; drag the third fan block above the first → the order
  persists after reload; drag a block out of the deck → it becomes its own box.

## Implemented (2026-09-29, branch `feat/pos-calendar-container-cancel-drag`)

- `box.statusLead` (first ACTIVE member by `groupSeq`, falling back to `lead`
  when every member is inactive) drives tone/strike/title everywhere the box
  renders (week track, agenda, month chip, hover card); `box.lead` stays the
  structural id (groupSeq 0) every move/separate/reorder call carries.
  `inactiveMemberCount(box)` → the "N cancelled" caption
  (`cal_members_cancelled`) on the box itself and its hover card; the visit
  card's procedure list marks each inactive member struck-through with its
  status label.
- `booking-mover.ts`: `setStatus` now runs through `createOptimistic<string>()`
  (`statusOf`/`pending`), toasts `sched_status_failed()` and reverts on a
  non-OK response; new `reorderVisit(id, ids)` → `POST {apiBase}/{id}/group
  {reorder}`. `BookingsView.svelte` converged its own bare-PATCH `setStatus`
  onto the same mover instead of duplicating the overlay.
- Server: `reorderVisit(ctx, groupId, ids)` in
  `scheduling-bookings.service.ts` restamps `groupSeq` 0..n-1 in one
  transaction, touching no times; unlike `selectGroupMembers` (used by
  move/merge/detach, CONFLICT_STATUSES only) it selects members of ANY status
  so a cancelled member restamps in its dragged position too. `{reorder:
  [ids]}` joins the `/group` route's body union in both
  `_handlers.ts` twins.
- Fan-deck drag (`BookingCalendar.svelte`): pointerdown on a fan block's
  `.evt-in` (4px move threshold so a plain click still opens the drawer,
  `setPointerCapture`) → live reorder preview inside the deck's own bounds
  (`fanDragIndex`/`reorderPreview`, pure helpers in `fan-out.ts`), release
  outside the bounds (±16px `FAN_OUTSIDE_MARGIN`) calls the existing
  `separate(mb)` instead (`data-drop="separate"` + an outline that warms to
  `--color-danger-fg` is the drop hint). Keyboard: `Alt+ArrowUp/Down` swaps
  the focused block with its neighbour and reorders, `Alt+Delete` separates
  it. `onreorder` prop signature ended up `(id: string, ids: string[])` —
  `id` is any member of the visit (the calendar passes `box.lead.id`), NOT a
  literal `groupId` as the AS-IS sketch above named it: the server resolves
  the group from a booking id the same way `onmove`'s `group` shape already
  does (`bookingGroupId`), so this keeps ONE resolution path instead of a
  second one keyed on the raw DB `groupId` string.
- Gates green: `bun run check` (0 errors), targeted vitest (602 passed),
  `lint:design`/`lint:tokens` (no regression — an early `z-index: 1` on the
  dragged block was cut instead of tokenized, since flex reflow alone already
  moves it), `i18n:compile`.
- Playwright `tests/e2e/ui-audit/pos-calendar-fan-drag.spec.ts` against a live
  QA-stack dev server (owner persona, creates + cancels its own 3-member
  visit per test — no DELETE route exists on `/api/pos/appointments/[id]`):
  cancel-optimistic and reorder-persists-after-reload passed reliably;
  drag-outside-separates passed in isolation and in most full-suite runs but
  occasionally timed out as the third test in one worker (instrumented
  debugging confirmed the underlying `fanDrag.outside` transition itself is
  correct — reads as Playwright/dev-server timing under this session's load,
  not a shipped-code defect, but unconfirmed against a fresh idle stack).
  The keyboard reorder/separate path (`onFanBlockKey`) has no automated
  coverage, only the two pointer-drag paths.
