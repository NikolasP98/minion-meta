# Data model: spec 134

**No migration.** `sched_bookings.status` is unconstrained text (research R1). Two new stored values, one derived state, and new rules on existing rows.

## Appointment status (`sched_bookings.status`)

| Status | Kind | On the calendar | Takes a slot / gets reminders | Reservation (`stk_accruals`) | Package session / money | Stored by |
|---|---|---|---|---|---|---|
| `pending` | live | yes | yes | open | kept | today |
| `accepted` | live | yes | yes | open | kept | today; also by moving an `unscheduled` one (R6) |
| `unscheduled` **(new)** | live | **no** (Pendientes tray) | **no** | **open** (kept) | kept; sale lines stay linked | Desagendar / No vino |
| `completed` | final, done | yes | yes (conflicts only) | realized (spec 120; skips per spec 135) | kept | today |
| `archived` **(new)** | final, not done | yes, struck through | no | **released** | **kept** (no refund) | Archivar |
| `cancelled` | final, not done | yes, struck through | no | released | session returned; service lines unlinked | Anular cita (today's cancel); WhatsApp "no" reply |
| `rejected` | final, not done | yes, struck through | no | released | session returned; service lines unlinked | today (pending → rejected) |
| `no_show` | final, legacy | yes | no | released | session returned | no longer offered; history only |

### Status sets (one shared module)

New file `src/lib/components/scheduling/booking-lifecycle.ts` (pure, no i18n), imported by the server and the client:

```ts
export const BOOKING_STATUSES = ['pending','accepted','unscheduled','completed','archived','cancelled','rejected','no_show'] as const;
export const ON_CALENDAR_LIVE = ['pending','accepted'] as const;          // = ACTIVE_STATUSES (slot owners)
export const LIVE = ['pending','accepted','unscheduled'] as const;       // transition guard
export const CLOSED_NOT_DONE = ['cancelled','rejected','no_show','archived'] as const;
export function isPorCerrar(b: { status: string; start: Date | string }, now: Date, tz: string): boolean;
export function porCerrarCutoff(now: Date, tz: string): Date;           // local midnight of today
```

- `scheduling-bookings.service.ts` keeps `ACTIVE_STATUSES` (re-exported from `ON_CALENDAR_LIVE`) so its many callers stay untouched.
- `booking-groups.ts` `INACTIVE_STATUSES` becomes `CLOSED_NOT_DONE + unscheduled`.
- `booking-status.ts` re-exports `BOOKING_STATUSES` and keeps the label map (the only i18n part).

### Transitions (server, `setBookingStatusInTx`)

| From | To | Effects in the same transaction | After commit |
|---|---|---|---|
| live on calendar | `completed` | log row | realize (spec 120 + 135 skip) |
| live on calendar | `unscheduled` | log row, reason `no_vino` / `desagendada` | none |
| live (incl. `unscheduled`) | `archived` | log row, reason **required** | `releaseAccruals` |
| live (incl. `unscheduled`) | `cancelled` | log row, session reversal, service-line unlink | `releaseAccruals` |
| `unscheduled` | `accepted` | **only via a move**: time/resource write + log row (reason `reagendada`) | none |
| `unscheduled` | anything else | refused 409 `unscheduled_needs_time` | — |
| final | anything | refused 409 `invalid_transition` (today) | — |

A visit (shared `metadata.groupId` on one resource) moves together: Desagendar, Archivar and Anular apply to every live member; completed members are skipped (today's `unscheduleVisit` / `visitStatusResponse` rule).

## Derived: Por cerrar

```text
porCerrar(b) = b.status ∈ {pending, accepted}
            ∧ localDate(b.start_time, tz) < localDate(now, tz)
tz = schedulingTimeZone(resources)   // first active resource, else America/Lima
```

- It is never stored. The server form is `start_time < porCerrarCutoff(now, tz)`, which `sched_bookings_org_status_idx (org_id, status)` serves.
- A Por cerrar appointment is still `pending`/`accepted` in every reader. It changes only how the agenda draws it, the tray, and the daily inbox count.

## Status log (`sched_booking_status_log`)

Unchanged columns. New `reason` values:

| `to_status` | `reason` |
|---|---|
| `unscheduled` | `no_vino` · `desagendada` |
| `accepted` (from `unscheduled`) | `reagendada` |
| `archived` | `desistio` · `duplicada` · `otro: <texto>` (text trimmed, 1–500 chars) |
| `cancelled` | as today (`deleted`, free text, null) |

The tray's chip for an `unscheduled` item reads the newest row with `to_status = 'unscheduled'`. A missing row (impossible through the app) shows as Desagendada.

## Pendientes item (derived, page load only)

```ts
type PendientesItem =
  | { kind: 'line'; chip: 'pagado_sin_agendar'; paid: true; ...PendingSchedulingLine }   // today's tray row
  | { kind: 'appointment';
      chip: 'por_cerrar' | 'no_vino' | 'desagendada';
      bookingId: string;            // visit anchor
      groupId: string | null;
      status: 'pending' | 'accepted' | 'unscheduled';
      start: string;                 // "Antes: …" for unscheduled; the appointment time for Por cerrar
      end: string;
      resourceId: string; resourceName: string | null;
      eventTypeId: string; productId: string | null;
      partyId: string | null; crmContactId: string | null; customerName: string | null;
      paid: boolean;                 // a non-void ticket line references the booking
    };
```

- Server: `listPendingAppointments(ctx, { cutoff })` returns the appointment half. Visit anchors only, at most 200, oldest first.
- Client: the pure helper `pendientesItems(lines, appointments)` in `src/lib/components/pos/pending-groups.ts` merges both halves, sorts by chip order (Por cerrar, Pagado sin agendar, No vino, Desagendada) then by date, and keeps today's per-customer grouping.

## Inbox notification

| Field | Value |
|---|---|
| `kind` | `appointments.por_cerrar` |
| scope | role, `scheduling:manage` |
| `dedupeKey` | `appt-por-cerrar:<orgId>:<YYYY-MM-DD local>` |
| title / body | "Citas por cerrar" / "N citas por cerrar" (fixed Spanish, same shortcut as every other rule) |
| `href` | `/pos/appointments?pendientes=por_cerrar` |
| resolved | when an older date key exists, or today's count is 0; every open `appointment.overdue` row is resolved by the same rule |

## Stock reservation read (FR-012, display only)

`AccrualListRow` (`stock-accruals.service.ts:492`) gains `checkpoint: { countId: string; countedAt: string } | null`. It is filled only when the list is filtered by `source = 'booking'` and one `sourceId`:

```text
checkpoint = checkpointFor(tx, orgId, accrual.itemId, accrual.warehouseId, booking.start_time)
```

`checkpointFor` is defined and owned by spec 135 (plan 135-S1). Spec 134 never writes checkpoints and never decides a skip.
