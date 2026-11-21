# Research: spec 134

All facts below were read on hub `origin/master` `63c4313b` (clean clone `~/.cache/claude-tmp/hub-till`, 2026-11-20). No production access was used for this plan; every number about FACES data comes from spec.md.

## R1 — Where the statuses live, and whether the database restricts them

- **Decision**: `unscheduled` and `archived` need **no migration**.
- **Evidence**:
  - `sched_bookings.status` is plain `text not null default 'accepted'` (`src/server/db/pg-scheduling-schema.ts:224`).
  - There is no CHECK constraint or enum: none in `supabase/migrations/*.sql`, and none in the prod-shaped dump `supabase/qa/baseline/schema.sql:4234-4263` (the only `sched_*` CHECKs are on `sched_reminders`).
  - The status log `sched_booking_status_log.reason` is free text (`pg-scheduling-schema.ts:292-310`). It already stores `unscheduled` and `deleted` today.
- **Rationale**: the archive reason and the Desagendar reason go on the status-log row that every status change already writes (`setBookingStatusInTx`, `scheduling-bookings.service.ts:1117-1124`). No new column.
- **Alternative rejected**: a `metadata.unscheduledReason` copy on the booking. It duplicates the log. The tray reads the latest `to_status = 'unscheduled'` log row instead (index `sched_booking_status_log_org_booking_idx` covers it).

## R2 — Two status sets, not one

- **Decision**: keep `ACTIVE_STATUSES = ['accepted','pending']` (`scheduling-bookings.service.ts:105`) as **"on the calendar and taking a slot"**. Add a separate **LIVE** set `pending, accepted, unscheduled` for the transition guard.
- **Evidence**: `ACTIVE_STATUSES` and its copies are all **whitelists** that decide who occupies time:
  - `loadBusyInTx` (`:210`), new-booking availability;
  - `scheduling-slots.service.ts:113`, public slots;
  - `CONFLICT_STATUSES` (`:1395`, accepted/pending/completed), move and merge conflicts;
  - `reminders.ts:13`, `reminders.service.ts:107`, reminders.

  Because they are whitelists, `unscheduled` is excluded from slots, conflicts and reminders **without code**. FR-005 only needs tests that pin it.
- **The guard is the only place that must learn the new live status**: `isLiveStatus` (`:1038`) reads `ACTIVE_STATUSES`. Without the change, an `unscheduled` booking would be "final" and could never be archived or moved back.
- **Alternative rejected**: adding `unscheduled` to `ACTIVE_STATUSES`. It would make an off-calendar appointment block its old slot and get reminders, the opposite of FR-005.

## R3 — Split `RELEASING` in two

- **Decision**:
  - `RELEASES_RESERVATION = {cancelled, rejected, no_show, archived}` → `releaseAccruals` after commit.
  - `RETURNS_SESSION = {cancelled, rejected, no_show}` → `reverseBookingRedemptionsInTx`.
  - The ticket-line unlink stays on `cancelled`/`rejected` only.
- **Evidence**: today one set `RELEASING` (`:1056`) drives both the accrual release (`setBookingStatus`, `:1153`; `patchBooking`, `:3177`) and the package reversal (`setBookingStatusInTx`, `:1125`). The unlink is a separate `status === 'cancelled' || 'rejected'` branch (`:1128`).
- **Rationale**: Archivar releases the reservation but keeps the session and the money (FR-006, decision 2). `unscheduled` is in neither set, so Desagendar keeps both (FR-004).

## R4 — Transition rules for the new statuses

- **Decision**: a small table in `setBookingStatusInTx`:

  | From | Allowed targets |
  |---|---|
  | `pending`, `accepted` | everything in `SETTABLE` (today's rule), plus `unscheduled` and `archived` |
  | `unscheduled` | `archived`, `cancelled` (Anular). `accepted` only through a move (R6). |
  | any final status | nothing (spec 116 FR-009, unchanged) |

- **Refusals**:
  - `unscheduled → completed / pending / accepted / rejected / no_show` by a bare status write: 409 `unscheduled_needs_time`.
  - Message: "Primero elige una hora para esta cita: arrástrala al calendario o usa «Agendar»." It gives the next step (owner rule).
- **Rationale**: an `unscheduled` appointment has no real time. Completing it would issue stock dated at its *old* slot, and with spec 135 that date decides whether a checkpoint skips the supply. Asking for the real time first keeps FR-012 correct. This is open question Q2 in plan.md.
- `archived` without a reason: 400 `archive_reason_required` (FR-006).

## R5 — Desagendar replaces `unscheduleVisit`'s semantics

- **Decision**: keep the route `POST /api/pos/appointments/[id]/unschedule` and the visit walk in `unscheduleVisit` (`:1274-1337`), but:
  - drop the ticket-line unlink (`:1312-1316`);
  - write `unscheduled` with reason `no_vino` | `desagendada` instead of `cancelled`;
  - drop the post-commit `releaseAccruals` (`:1327-1333`).
- **Evidence**: the transaction shape (one tx, every non-completed member, completed members skipped) is exactly what the spec's edge case asks for ("acts on the whole visit").
- **Side effect**: lines stay linked, so a paid No-vino keeps `paid = true` on the calendar payload (`bookingTicketLinks`) and the tray shows "Pagado".
  - `listPendingSchedulingLines` (`pos-accounts.service.ts:496-529`) stops receiving lines from Desagendar.
  - Old Desagendar rows (`cancelled` + unlinked lines) stay as they are (FR-011, no backfill).

## R6 — Re-assigning is today's move plus one status flip

- **Decision**:
  - In `rescheduleBookingInTx` (`:1481`) and `moveGroup` (`:2353`): when a moved row is `unscheduled`, also set `status = 'accepted'` and write a log row (`unscheduled → accepted`, reason `reagendada`).
  - Add `archived` to the "cannot reschedule" refusal next to `cancelled`/`rejected` (`:1495`, `:1590`).
- **Evidence**: every human and assistant move funnels into these two writers:
  - drag, resize and the drawer's "Cambiar fecha, hora o miembro del equipo" call `PATCH …/[id]` → `patchBooking`, or `POST …/group {move}` → `moveGroup`;
  - the assistant calls `rescheduleAssistantBooking` → `rescheduleBookingInTx` (`:1736`).
- **Rationale**: the reservation and the funding follow the booking id, not the time. Today's move already "touches no accrual" (comment at `:2348-2351`), so FR-005 "reservation unchanged" holds by construction.
- `addServiceToVisit` (`:2676`) must inherit `unscheduled` too. Otherwise a new member of an off-calendar visit would be born `accepted` and take a slot.

## R7 — "Por cerrar": derived, and which time zone

- **Decision**: `isPorCerrar(b, now, tz) = b.status ∈ {pending, accepted} && localDate(b.start, tz) < localDate(now, tz)`.
  - The time zone is `schedulingTimeZone(resources)` (`src/lib/components/scheduling/calendar-window.ts:34-41`): the first active resource's zone, falling back to `DEFAULT_SCHEDULING_TIME_ZONE = 'America/Lima'` (`:28`).
  - The server cut-off is `startOfZonedDate(todayIn(tz), tz)` (`src/lib/time/zoned.ts:290`, `calendar-window.ts:123`).
- **Evidence**: `/pos/appointments` and `/scheduling/calendar` both resolve their day windows with this zone (`+page.server.ts` comment: "the two calendars must resolve the SAME window").
  - Finance has a second zone, `accountingTimezone` (`stock-corrections.logic.ts:243`, `pos/accounts/audit.types.ts:22`). It governs money periods, not the agenda.
- **Rationale**: if Por cerrar used a different zone than the grid, a box could turn Por cerrar on a day the calendar still shows as today. `instantDateKey` handles DST, so no extra code is needed for zones with daylight saving.
- **Alternative rejected**: a stored `por_cerrar` status flipped by a job (spec TO-BE §1 forbids it: no job, no migration).

## R8 — The inbox rule: one count per day

- **Decision**: replace `appointmentOverdueRule` (`src/server/services/inbox/rules/appointment-overdue.ts`) with `appointmentsPorCerrarRule`, key `appointments.por_cerrar`:
  - Count visit anchors (`coalesce(metadata->>'groupSeq','0') = '0'`, same as today's rule `:54`) that are Por cerrar at `now`.
  - If the count is > 0, upsert ONE role notification for `scheduling:manage`:
    - dedupe key `appt-por-cerrar:<org>:<localDateKey>`;
    - title "Citas por cerrar", body "N citas por cerrar";
    - href `/pos/appointments?pendientes=por_cerrar`.
  - Resolve every unresolved `appointments.por_cerrar` row whose date key is older than today, and today's when the count is 0.
  - Resolve every unresolved `appointment.overdue` row (FR-002: the open ones are resolved on release). Each tick this read is cheap, and it returns nothing after the first tick.
- **Evidence**:
  - The evaluator runs every 30 min (`15-59/30`, `src/lib/automations/system-automations.ts:72-80`). The first tick after local midnight raises the day's row.
  - `upsertNotification` is insert-or-skip on the dedupe key (`inbox.service.ts:262-300`). A daily key therefore keeps that day's body; the next day gets a fresh count.
- **Alternatives rejected**:
  - (a) Keep per-visit rows. That is the 152-notification flood the spec removes.
  - (b) A migration that resolves the old rows. It is a data write in a schema file; the rule does the same thing in normal code.
- The kind label is added to `src/lib/inbox/feed.ts:38-52`. `appointment.overdue` keeps its label so history still reads.

## R9 — Where the Pendientes tray gets its appointments

- **Decision**: a new service read, `listPendingAppointments(ctx, { cutoff })`, in `scheduling-bookings.service.ts`, loaded by `src/routes/(app)/pos/appointments/+page.server.ts:80` next to `listPendingSchedulingLines`.
  - It returns visit anchors that are `pending`/`accepted` with `start_time < cutoff`, or `unscheduled`.
  - Each row carries its last unscheduled reason (R1), start, resource name, client name, product, group id, and `paid` (`bookingTicketLinks`, `pos-accounts.service.ts`).
  - Capped at 200, oldest first.
- **Rationale**: no new route, so no RBAC or route-contract change. The page already fetches the tray fail-soft.
- **Alternative rejected**: deriving Por cerrar items from the calendar window. The window is only the visible weeks, and the backlog is 101 appointments spread back to October.

## R10 — `unscheduled` leaves the grid

- **Decision**: `loadCalendarWindow` (`src/server/services/calendar-window.service.ts:74`) drops `status = 'unscheduled'` rows.
- **Evidence**: the window has no status filter on purpose (TODO at `:66-73`; cancelled boxes still show). `unscheduled` is the one status that must not: its `start_time` is the *old* time (FR-005, "Antes: …").
- **Consequence**: the table and board views on the same page lose them too. That is correct: they live in the Pendientes tray.
  - `/scheduling/calendar` has no tray. Desagendar is therefore offered only where the tray exists: the POS agenda's context menu, and the detail drawer when the host passes `canUnschedule` (POS page only). The invariant "never left without a path" holds. This is open question Q3.

## R11 — Completion dialog note for counted supplies (FR-012)

- **Decision**: `GET /api/stock/accruals?source=booking&sourceId=…` rows gain `checkpoint: { countId, countedAt } | null`.
  - `listAccruals` (`stock-accruals.service.ts:503`) computes it with spec 135's `checkpointFor(tx, orgId, itemId, warehouseId, physicalTime)`.
  - `physicalTime` is the booking's `start_time`; the warehouse is the accrual's own `warehouse_id`.
- `ConsumptionConfirmDialog` (`src/lib/components/scheduling/ConsumptionConfirmDialog.svelte:95-98`, which already calls this endpoint) shows one line per counted item: "Contado el 18/11 16:00: no descuenta Ácido Desoxicólico". It does not offer a quantity field for that item.
- **Evidence**: the dialog has no warehouse picker (no `warehouse` in the dialog or `consumption-lines.ts`). Realize uses the accrual's warehouse, so the note and the actual skip read the same key.
- **Limit**: a default row (product mapped, no open accrual) has no warehouse until realize picks the default one (`defaultWarehouseInTx`, `stock-accruals.service.ts:49`).
  - For those rows the dialog shows nothing beforehand.
  - The skip itself is still applied and noted by 135-S1's realize.
  - Recorded as a `TODO(handoff)` in the slice. FACES' backlog appointments all carry accruals (57 still reserving), so the gap is rare.
- 134 never decides what is skipped; 135's realize does. The dialog only reads.

## R12 — Status readers: full inventory

Every reader of `sched_bookings.status` outside the writer, and the change each needs. **S2** = lands with `archived`; **S3** = lands with `unscheduled`. See R14 for why readers move to S2.

| # | Reader (file:line) | Today | Change |
|---|---|---|---|
| 1 | `scheduling-bookings.service.ts:105` `ACTIVE_STATUSES` | slot owners | none (R2) |
| 2 | `scheduling-bookings.service.ts:1035` `SETTABLE` | 6 statuses | + `archived` (S2), + `unscheduled` (S3, only via `unscheduleVisit`) |
| 3 | `scheduling-bookings.service.ts:1038` `isLiveStatus` | accepted/pending | LIVE set (R2) + R4 table |
| 4 | `scheduling-bookings.service.ts:1056` `RELEASING` | one set | split (R3) |
| 5 | `scheduling-bookings.service.ts:704` `DEAD_BOOKING_STATUSES` | cancelled/rejected | + `archived` (a line on an archived booking is stuck) |
| 6 | `scheduling-bookings.service.ts:1218` `cancelBooking` `following` | ACTIVE | LIVE (an unscheduled later occurrence is cancelled too) |
| 7 | `scheduling-bookings.service.ts:1321` `unscheduleVisit` skip | RELEASING | rewritten (R5) |
| 8 | `scheduling-bookings.service.ts:1395` `CONFLICT_STATUSES` | whitelist | none; test pins `unscheduled` free (S3) |
| 9 | `scheduling-bookings.service.ts:1495`, `:1590` reschedule refusal | cancelled/rejected | + `archived`; flip `unscheduled` (R6) |
| 10 | `scheduling-bookings.service.ts:2676` `addServiceToVisit` | inherits ACTIVE | inherits LIVE |
| 11 | `scheduling-bookings.service.ts:3136`, `:3177` `patchBooking` | SETTABLE / RELEASING | follows 2 and 4 |
| 12 | `scheduling-slots.service.ts:113` | accepted/pending | none; test (S3) |
| 13 | `src/server/scheduling/reminders.ts:13` | accepted/pending | none; test (S3) |
| 14 | `reminders.service.ts:107`, `:342` | accepted/pending | none |
| 15 | `reminders.service.ts:387` reply "no" → `cancelled` | Anular semantics | unchanged (open question Q1) |
| 16 | `inbox/rules/appointment-overdue.ts` | per visit | replaced (R8, S1) |
| 17 | `inbox/daily-feed.service.ts:160` | + completed, no_show | none (`unscheduled`/`archived` are not today's agenda) |
| 18 | `scheduling-analytics.service.ts:76`, `:147-150`, `:194`, `:206` | whitelists | none; test pins both out of upcoming/booked/cancelled/no-show (S2) |
| 19 | `calendar-window.service.ts:74` | all statuses | drop `unscheduled` (R10, S3) |
| 20 | `pos/accounts/unbilled.ts:27` `UNBILLED_BOOKING_WHERE` | excludes cancelled/rejected/no_show | + `archived`. `unscheduled` stays counted: it is live and still owed (S2) |
| 21 | `pos/accounts/audit.logic.ts:89-97` | unknown status → `source_corrupt` | + both to `BOOKING_STATUSES`; `archived` to `INACTIVE_BOOKING` (S2) |
| 22 | `pos/accounts/audit.evidence.ts:20` | unknown → input refused | + both (S2) |
| 23 | `pos/accounts/audit.ts:620` `bookingActive` | excludes 3 | + `archived` (S2) |
| 24 | `src/lib/notifications/fields.ts:17-24` `BOOKING_STATUS_VALUES` | 6 values | + both. There is no producer today (only `catalog.ts:76-77`); `catalog.test.ts` is re-run (S2) |
| 25 | `src/lib/components/scheduling/booking-status.ts:4-20` | 6 + labels | + both, labels; relabel cancelled/no_show (S2) |
| 26 | `src/lib/components/scheduling/booking-groups.ts:42` `INACTIVE_STATUSES` | 3 | + `archived`, + `unscheduled` (S2) |
| 27 | `src/lib/components/scheduling/BookingBoard.svelte:100-127` | drops to any column | drop targets only pending/accepted/completed; other columns read-only with a toast naming the menu (S2) |
| 28 | `src/lib/components/scheduling/BookingCalendar.svelte:82-89`, `:1716-1726`, `:4661`, `:5293` | tones, labels, struck-through CSS | + `archived` tone/strike; label map → `bookingStatusLabel`; `.por-cerrar` style (S1) |
| 29 | `src/lib/components/scheduling/color-source-preview.ts:24-31` | ramp | + `archived` (S2) |
| 30 | `src/lib/components/scheduling/BookingDetailDrawer.svelte:389-400`, `:639`, `:1679-1745`, `:1760` | labels, pay gate, footer with No-show/Cancel | labels → shared; pay gate uses CLOSED set; footer (S2/S3) |
| 31 | `src/lib/components/scheduling/BookingsView.svelte:50-58`, `:240-278` | labels, No-show/Cancel buttons | labels shared; buttons removed (S2) |
| 32 | `src/routes/(app)/pos/appointments/PageBody.svelte:600`, `:1269-1312` | complete filter; hover actions | CLOSED set; hover keeps only "Completar" (S2) |
| 33 | `src/routes/(app)/scheduling/calendar/PageBody.svelte:354`, `:571-606` | same | same (S2) |
| 34 | `src/routes/(app)/crm/[contactId]/PageBody.svelte:640-647` | label map | → `bookingStatusLabel` (S2) |
| 35 | `src/routes/api/scheduling/bookings/_handlers.ts:234`, `:552`, `:563-571`, `:690` | zod enums, visit eligibility | + `archived` in both enums; eligibility uses LIVE for terminal targets (S2) |
| 36 | `src/server/services/crm-journey.service.ts:126-140` | raw status as text | none (already raw for every status) |
| 37 | `doors.service.ts:291`, `inbox/rules/visit-unpaid.ts:106`, `team/+page.server.ts:167` | completed / explicit whitelists | none |

Five copies of the status → label map (`BookingsView`, `BookingDetailDrawer`, `BookingCalendar`, `crm/[contactId]/PageBody`, `booking-status.ts`) collapse onto `bookingStatusLabel`. Deleting them is smaller than updating five maps.

## R13 — Vocabulary

- **Decision** (es):

  | Key | Text |
  |---|---|
  | `sched_status_cancelled` | "Anulada" |
  | `sched_status_no_show` | "No vino (anterior)" |
  | `sched_cal_status_no_show` | "No vino (anterior)" |
  | `sched_cancel_booking` | "Anular cita" |
  | new `sched_status_unscheduled` | "Desagendada" |
  | new `sched_status_archived` | "Archivada" |

- Chips: "Por cerrar", "No vino", "Desagendada", "Pagado sin agendar"; mark "Pagado".
- `sched_kpi_cancelled` / `sched_kpi_noShow` become "Anuladas" / "No vino (anterior)".
- **Out of scope**: generic `common_cancel` dialog buttons (spec §4).

## R14 — Shared-decision deviation: move the reader sweep into 134-S2

- **Finding**: the shared slice order puts "all status readers" in 134-S3. But `archived` rows exist from 134-S2 on, and readers 20–23 would then fail in production between S2 and S3:
  - the receivables audit would classify every archived appointment as `source_corrupt` (`audit.logic.ts:119`);
  - evidence input would be refused (`audit.evidence.ts:185`);
  - the Accounts badge would count unpaid archived appointments as owed (`unbilled.ts:27`).
- **Decision**: the reader sweep for **both** statuses lands in **134-S2**, before any row can hold either. Adding a value no row has yet is harmless. 134-S3 keeps only the `unscheduled` behaviour:
  - the write path;
  - the move flip;
  - leaving the grid;
  - the tray chips;
  - the slot and reminder tests.

## R15 — Interplay with spec 133

Spec 133 (charging an existing appointment, meta #1055) matches appointments with status not in `cancelled/rejected/no_show` (133 research R2) and refuses `booking_dead` for cancelled/rejected (R7). Whichever lands second must:
- add `archived` to both exclusions;
- keep `unscheduled` matchable (a client may pay for a No-vino appointment before it is re-booked).

## Spec corrections

1. **"Desagendar exists only for paid services (menu `pos_appt_ctx_unschedule`)" is out of date.**
   - The entry left the calendar menu on 2026-10-13. Commit `03a7ddc1` (#517) says: "`unschedule` leaves the menu; the drawer still offers it". But no drawer button exists at `63c4313b` either: no `.svelte` file calls `/unschedule`.
   - The route `src/routes/api/pos/appointments/[id]/unschedule/+server.ts` and `unscheduleVisit` are orphaned. The key `pos_appt_ctx_unschedule` is unused (`messages/es.json:6925`).
   - This matches the PostHog figure (2 clicks, both on 2026-10-11).
   - `unscheduleVisit` was never paid-only: it applies to any booking and unlinks every line of the members, product lines included (`:1312-1316`, no `kind` filter).
2. **The calendar's destructive entries today are "Eliminar" (unpaid → `cancelled` reason `deleted`) and "Cancelar y anular" (paid → void + cancel)** (`calendar-context-menu.ts:141-150`, `PageBody.svelte:1344`, `:876`). There is no top-level menu item labelled "Cancelar".
   - The "Cancelar" and "Marcar inasistencia" the spec removes are the **hover-card icon buttons** (`PageBody.svelte:1284-1312`, `scheduling/calendar/PageBody.svelte:571-606`), the **drawer footer** (`BookingDetailDrawer.svelte:1679-1745`), the **bookings list** (`BookingsView.svelte:240-278`) and **board drops** (`BookingBoard.svelte:120-127`).
   - FR-007/FR-008 apply to all of those. "Más… → Anular cita" replaces "Eliminar" and "Cancelar y anular" as the submenu's content.
3. **"Re-assigning … reuses today's move and returns it to `accepted`"**: today's move never changes status (`rescheduleBookingInTx` writes time and resource only, `:1533-1544`). The flip is new code (R6). It is small, but it is not reuse alone.
4. **Readers in the spec's DELTA list are incomplete.** "receivables audit, unbilled, analytics, booking groups, colours, notifications fields" misses:
   - the transition guard;
   - the reschedule refusals;
   - `addServiceToVisit`;
   - `DEAD_BOOKING_STATUSES`;
   - the board drop rule;
   - the five label maps;
   - the calendar window.

   Full list: R12.
5. **The overdue rule body is UTC, not local** (`appointment-overdue.ts:65`, `startTime.toISOString()`). This is moot once the rule is replaced.
