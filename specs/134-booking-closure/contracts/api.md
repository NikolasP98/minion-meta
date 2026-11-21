# API contract deltas: spec 134

**No new route.** Every endpoint below exists and keeps its gate:
- `/api/scheduling/*` is centrally gated to `scheduling:edit` for writes;
- `/api/pos/appointments/*` is gated to `pos:edit`, plus the module checks already in each handler.

The route-contract manifest and RBAC wiring are unchanged. Refusals use the existing JSON shapes:
- status routes: `{ error, message }` with 409 (`statusFailureResponse`, `_handlers.ts:402-421`);
- validation: SvelteKit `error(400)`.

## Server functions (hub)

| Function | File | Contract |
|---|---|---|
| `isPorCerrar(b, now, tz)` | `src/lib/components/scheduling/booking-lifecycle.ts` (new) | `true` iff status ∈ {pending, accepted} and the start's local date < now's local date |
| `porCerrarCutoff(now, tz)` | same | `startOfZonedDate(todayIn(tz, now), tz)`; on an invalid zone, falls back to `America/Lima` |
| `listPendingAppointments(ctx, { cutoff, limit? })` | `scheduling-bookings.service.ts` | Visit anchors with (`pending`/`accepted` and `start_time < cutoff`) or `unscheduled`, at most 200, oldest first. Shape: data-model.md "Pendientes item" |
| `unscheduleVisit(ctx, id, { reason, actor })` | same (rewritten) | `reason ∈ {'no_vino','desagendada'}`. Every live, non-completed member → `unscheduled`. Lines stay linked, accruals stay open, sessions stay. One transaction. Returns `{ found, unscheduled: string[], skipped: string[] }` |
| `setBookingStatus(ctx, id, 'archived', { reason })` | same | Refuses an empty reason (`ArchiveReasonRequiredError`). Keeps the session; releases accruals after commit |
| `rescheduleBookingInTx` / `moveGroup` | same | An `unscheduled` row also gets `status = 'accepted'` + log row `reagendada` in the same transaction |
| `checkpointFor(tx, orgId, itemId, warehouseId, physicalTime)` | **spec 135** (module named in 135's plan) | `→ { countId, countedAt } \| null`: the latest **locked** checkpoint for the item and warehouse with `countedAt ≥ physicalTime`. 134 only calls it |

## `GET /pos/appointments` (page load, `+page.server.ts`)

The load gains one key. `pending` (paid lines) is unchanged.

```jsonc
{
  "pending": [ /* PendingSchedulingLine, as today */ ],
  "pendingAppointments": [
    {
      "bookingId": "uuid", "groupId": null, "status": "unscheduled", "chip": "no_vino",
      "start": "2026-11-18T22:15:00.000Z", "end": "2026-11-18T23:00:00.000Z",
      "resourceId": "uuid", "resourceName": "…", "eventTypeId": "uuid", "productId": "uuid",
      "partyId": "uuid", "crmContactId": null, "customerName": "…", "paid": true
    }
  ]
}
```

- Fail-soft like `pending`: a failed read yields `[]` and the calendar still renders.
- The query param `?pendientes=por_cerrar|no_vino|desagendada|pagado_sin_agendar` opens the tray with that chip selected. It is client-only; unknown values are ignored.

## `PATCH /api/{pos/appointments,scheduling/bookings}/:id`

- `status` enum gains `archived` (`_handlers.ts:234`).
- `reason` is required when `status = 'archived'`.
- `unscheduled` is **not** accepted here: it has its own verb, so the reason list is enforced in one place.

| Case | HTTP | `error` | message (es) |
|---|---|---|---|
| `archived` without reason | 400 | `archive_reason_required` | Elige un motivo para archivar la cita. |
| any status write on an `unscheduled` booking other than `archived`/`cancelled` | 409 | `unscheduled_needs_time` | Primero elige una hora para esta cita: arrástrala al calendario o usa «Agendar». |
| status write on a final booking (incl. `archived`) | 409 | `invalid_transition` | (existing `sched_status_final`) Una cita cerrada no se puede reabrir. Crea una nueva. |
| move (`start`+`end`) of an `archived` booking | 400 | — | `cannot reschedule a archived booking` (existing text shape, `:1496`) |
| move of an `unscheduled` booking | 200 | — | booking returns with `status: "accepted"` |
| move conflict | 409 | `conflict` | existing; the "Mover igual" override still applies |

## `POST /api/{pos/appointments,scheduling/bookings}/:id/group`

- `{ status, reason }` (`_handlers.ts:552`): enum gains `archived`, with the same reason rule and refusals as PATCH.
- `eligibleForVisitStatus` (`:563-571`): terminal targets take every **LIVE** member (`unscheduled` included). `accepted`/`pending` targets keep today's rule.
- `{ move }`: moving a visit whose members are `unscheduled` flips them all to `accepted` (R6).

## `POST /api/pos/appointments/:id/unschedule`

Body (new, required):

```jsonc
{ "reason": "no_vino" }   // or "desagendada"
```

Success `200`:

```jsonc
{ "ok": true, "found": true, "unscheduled": ["uuid", "uuid"], "skipped": ["uuid"] }
```

- `skipped` = completed or already-final members, left alone.
- Calling it again on an `unscheduled` visit returns the same ids under `skipped` (idempotent; no second log row).

| Case | HTTP | `error` | message (es) |
|---|---|---|---|
| missing/unknown `reason` | 400 | — | zod message |
| id not in this org | 404 | — | booking not found (existing) |
| every member final | 409 | `invalid_transition` | Esta cita ya está cerrada. Para volver a atenderla, crea una nueva. |

Breaking change, on purpose: no caller exists today (research, Spec corrections 1). The old `{ cancelled, released }` body is gone.

## `GET /api/stock/accruals?source=booking&sourceId=:id`

Each row gains `checkpoint` (data-model.md). The value is `null` for any other filter combination, so other callers see an extra `null` field and nothing else.

```jsonc
{ "accruals": [ { /* …existing AccrualListRow */ "checkpoint": { "countId": "uuid", "countedAt": "2026-11-18T21:00:00.000Z" } } ] }
```

## `POST /api/{scheduling/bookings,pos/appointments}/:id/complete`

Request unchanged. After the status write it now also refuses `unscheduled` with the same 409 `unscheduled_needs_time` before writing anything. Today it would complete it (`complete/+server.ts:48`).

The stock skip on realize is spec 135-S1's (it writes the skip note on the movement). The response passes through whatever 135-S1's `realizeAccruals` result adds; 134 adds no field.

## Inbox

New rule `appointments.por_cerrar` (`src/server/services/inbox/rules/appointments-por-cerrar.ts`). It replaces `appointment-overdue.ts` in `INBOX_RULES` (`rules/index.ts:27`). Payload: data-model.md.

## UI verbs → calls

| UI (es) | Where | Call |
|---|---|---|
| Completada | menu, drawer, tray (Por cerrar) | `ConsumptionConfirmDialog` → `POST …/:id/complete` (unchanged) |
| "No vino" (only once the start has passed) and "Desagendar" | event menu, drawer (POS), tray (Por cerrar) | `POST /api/pos/appointments/:id/unschedule { reason }` via `mover.unschedule` (optimistic overlay) |
| Archivar… (reason dialog) | event menu, drawer, tray (all appointment chips) | `mover.setVisitStatus(anchor, 'archived', reason)` |
| Más… → Anular cita | event menu, drawer | unpaid: `setVisitStatus(anchor,'cancelled','deleted')` (today's "Eliminar"); paid + `pos:manage`: today's void dialog (`cancel-paid`) |
| Agendar | tray (No vino, Desagendada) | drag onto the grid → `mover.moveBooking` (PATCH `start/end/resourceId` or group `move`); click → opens the drawer with "Cambiar fecha, hora o miembro del equipo" open |
