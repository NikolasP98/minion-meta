---
id: 2026-10-10-hub-pos-sell-history-unified
title: Hub evening batch 2026-10-10 — open ends (drop override, per-user shifts, unified sell history, filters across calendar views, DATE property formats)
status: draft
created: 2026-10-10
updated: 2026-10-10
repos: [minion_hub]
tags: [ui, ux, permissions, logic]
effort: S
---

# Hub evening batch 2026-10-10 — ledger

Owner batch (five items, five hub PRs: #469 pending-line drop override,
#470 per-user shifts + colleagues indicator, #471 DATE property formats +
time storage, #472 table filters across calendar/board views, #473 today's
activity popover + `/pos/history`). This file holds what each PR left open.
`TODO(handoff)` comments in #473 point here by this file name.

## AS-IS (hub master before the batch)

- Dropping a paid line onto the calendar always fell back to the tray on FACES:
  the only staff resource has zero `sched_schedules` rows, so `computeSlots`
  answered 409 for every slot. Staff booked exclusively through the tray's
  walk-in override.
- `pos_shifts` enforced ONE open shift per org (`pos_shifts_one_open_per_org`);
  every lookup/attachment used "the org's open shift".
- `/pos/sell` had two header popovers (last 10 tickets; last 10 shifts) and no
  list page for tickets or shifts.
- `/pos/appointments` calendar and board views had only the persisted staff
  dropdown; the DataTable filter system lived only in the table view.
- The `date` custom property existed with the full operator set but stored a
  bare day and had no format settings.

## TO-BE (shipped in #469–#473)

Drop retries once with `forceResourceId` + `overrideConflicts` when the staff is
unambiguous; one open shift per `(org_id, opened_by)` with `getOpenShift(ctx,
userId)`, `listOpenShifts`, `GET /api/pos/shifts/open`, own-close on `pos:edit`
and other's-close on `pos:manage`, banner people-icon + popout; one "today's
activity" popover (org-day scoped) with a link to `/pos/history` (Tickets +
Shifts DataTables); `FilterToolbar.svelte` + shared `filter-columns.ts` /
`custom-properties/columns.ts` / `booking-columns.ts` so calendar and board run
`applyFilters` on the same rows the table does; date rules gain
`includeTime`/`dateFormat`/`timeFormat` with Notion's two format rows.

## Open ends (ledger)

1. **Drop override double-books like the tray does** (#469): a drop onto an
   occupied slot books when the override path is taken; `SlotUnavailableError`
   does not distinguish "no availability" from "conflict". Closing move: a
   reason code on the error so only the availability case overrides.
2. **`closeShift({ shiftId })` + `pos:manage` has no UI caller** (#470): the
   colleagues popout only lists; a manager closes another register via the API
   only. Handover/transfer out of scope.
3. **Migration window** (#470): `drop index` then `create index` leaves a moment
   with no uniqueness guard while migrations run on the production build.
4. **Permission widening** (#470): `staff` with `pos:edit` can now close their
   OWN register (previously any close needed `pos:manage`). Deliberate.
5. **No server pagination on `/pos/history`** (#473): `limit: 500` newest first;
   `TODO(handoff)` at the loader. Revisit with DataTable server mode.
6. **Today's activity scopes shifts by `openedAt`** (#473): a shift opened
   yesterday and closed today does not appear in today's list (the banner still
   shows it).
7. **No RBAC subresource row for `/pos/history`** (#473): inherits `pos:view`.
8. **Filters are page state, not persisted across reload** (#472): parity with
   the table today (DataTable's `storageKey` covers layout only).
9. **Custom-property filter in calendar/board** (#472): values load for the
   window when such a filter turns on; a record counts as unset while in flight
   and can drop out briefly.
10. **Date filters bucket by UTC day** (#471, pre-existing in `dayString`): a
    time-enabled value stored after 19:00 Lima lands in the next day's bucket.
    Fixing it touches every built-in date column; own slice.
11. **Only `Z` instants accepted** for date values (#471); `shortcut:` comment
    names the upgrade.
12. **Not browser-verified**: colleagues popout at 768px, filter toolbar wrap in
    `.cal-tools`, activity popover row anatomy, `/pos/history` tabs (#470, #472,
    #473). CI's browser-journey lane is the only click-through so far.
