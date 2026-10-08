---
id: 2026-10-07-hub-calendar-single-event-services
title: Hub calendar — one event, many services (fan-out retired, services managed from the tray) + 2026-10-07 user-bug batch open ends
status: draft
created: 2026-10-07
repos: [minion_hub]
tags: [ui, ux, data]
spec: specs/2026-09-27-hub-calendar-standardization-spec.md
---

# One event, many services — and the 2026-10-07 user-bug batch

Owner request 2026-10-07 (three staff videos from the clinic front desk):

> "a single event can contain one or more treatments or procedures or
> services … events are separate from treatments … users [can] freely add and
> remove services from the events … I would still like for events to be
> mergeable … if a user decides to remove a procedure, then consider checking
> whether a payment has already been made … completely remove the container
> event click to fan out … when you hover over them it renders a details
> element, and when you click on it, it opens the tray menu … all tags are
> merged … Each event block would have its own notes, its own aggregate tags, a
> single client, a single professional … Let's keep it simple for the users."

Plus two bugs from the same batch: the customer picker search found 0 rows for
"leyla rondon" (whole-string ILIKE), and a click outside the floating picker
closed the whole "Nueva cita" tray and lost the form.

## AS-IS (hub master `14b3ec90`)

- A "container" is VIRTUAL: N `sched_bookings` rows sharing `metadata.groupId`
  (`groupSeq`, `groupLength`), one row per service, same window. No table, no
  column, no index on `metadata->>'groupId'`.
- Clicking a multi-member block fans it into a side deck (per-member hover
  card, Separate button, drag-to-reorder, drag-out-to-separate). Services can
  only be added by booking a separate appointment and dragging it onto the
  visit (merge).
- The only payment gate on any booking mutation is `deleteBooking`'s
  `references: ('ticket'|'order'|'accrual')[]`.
- `BookingDetail` has no notion of the visit; the drawer shows one service.

## TO-BE (shipped in `feat/calendar-single-event-services`)

- Storage unchanged (one row per service keeps `pos_ticket_lines.booking_id`,
  package redemptions, accruals and the status log per service intact).
- `fanOut` defaults to **off**: a multi-service block hovers like any other
  block (the visit card lists every service) and a click opens the detail tray.
- The tray gains a **Services** section: every service of the event with
  minutes, status, paid chip; **Add service** (same `Picker` as the create
  form), **Remove** (gated: a service with a ticket line / sales order /
  realized accrual cannot be removed — only cancelled or separated), **Separate
  into its own appointment**, move up/down (reorder).
- Server: `addServiceToVisit` (window grows by the service's length through the
  same `planGroupMerge` math a drag-merge uses; one conflict check),
  `removeServiceFromVisit` (reference gate → delete row → re-lay survivors; one
  survivor ⇒ group destroyed), `BookingDetail.visit`, two new bodies on the
  single `POST …/[id]/group` verb (`{addEventTypeId}`, `{removeService:true}`),
  409 `{error:'referenced', references}` when blocked.
- Merge-on-drop unchanged. Tags were already aggregated (own + contact +
  service) per booking and unioned per box.

## Open ends (ledger)

1. **Delete the fan-deck code** (`fan-out.ts`, deck markup + drag handlers in
   `BookingCalendar.svelte`, `tests/e2e/ui-audit/pos-calendar-fan-drag.spec.ts`,
   `cal_visit_expand_hint` keys) once PRs #442/#443 land — they rewrite the
   same regions, so the deletion is deferred to avoid a four-way conflict.
   `TODO(handoff)` on `CALENDAR_FEATURE_DEFAULTS.fanOut`.
2. **Board/table views still show one row per service** (`BookingBoard.svelte`,
   `BookingTable.svelte` never collapse by `groupId`), while the grid and the
   tray show one event. Decide whether those views collapse too (likely yes:
   "events just become a single type").
3. **Expression index** `(org_id, (metadata->>'groupId'))` on `sched_bookings`
   — every visit read is an org-scoped scan today. Needs a migration + the QA
   seed pairing. `TODO(handoff)` in `scheduling-bookings.service.ts`.
4. **Realized-accrual reference scan** is un-indexed (`stk_accruals` by
   `source, source_id, status`). Same migration as (3).
5. **Fields not copied onto an added service**: `notes`, `clientNote`,
   `packageGrantId`, `paymentPlanId` — a grant is issued for ONE service (same
   reason `createBookingGroup` draws against the lead only). Pair a grant with
   its own member = existing item in
   `2026-09-25-hub-pos-calendar-color-followups.md` §33.
6. **No `booking.deleted` hub event** on removal (matches `deleteBooking`,
   which emits none) — notifications/outbox may want one.
7. **Server-side analytics producer** `booking_visit_mutation` is allowlisted
   (`observability-context.ts`) but not yet emitted from the service; the
   client events `visit_service_*` cover the UI today.
8. **Search ranking**: the tokenised fold is a sequential scan like before;
   if the party spine grows past ~50k rows per org, add `pg_trgm` GIN on the
   folded name expression.
9. **Picker quick-add discard** uses a plain `window.confirm` (not the
   foundation's discard prompt) because the DraggableWindow is not a Dialog.
10. **Dirty guard false positives**: pure search/filter inputs inside dialogs
    must be `type="search"` or carry `data-dirty-ignore`; audit new dialogs.

## Monitoring (PostHog)

Client events (`src/lib/analytics/track.ts`): `customer_search_no_results`,
`form_discard_prompted`, `form_discard_confirmed`, `visit_service_added`,
`visit_service_removed`, `visit_service_remove_blocked`,
`visit_service_separated`, `calendar_url_replace_coalesced`,
`app_chunk_reload`. Alerts are configured on insights over these plus
`$exception` on `/pos/*`. Two prod defects found while checking the users'
sessions are fixed in `fix/calendar-monitoring-hardening`: the runway's
`replaceState` storm (>100 writes / 10 s SecurityError) and the stale-chunk
import failure after a deploy.
