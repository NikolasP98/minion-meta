# API contract deltas: spec 133

Only existing endpoints change. Their gates are unchanged.

## `GET /api/pos/accounts/:clientKey`

The response gains one field; everything else is unchanged.

```jsonc
{
  // …existing fields (balance, grants, plans, …)
  "appointments": [
    { "bookingId": "uuid", "productId": "uuid", "startTime": "2026-11-18T22:15:00.000Z", "status": "completed" }
  ]
}
```

- Items are uncharged appointments (data-model.md), at most 20, closest to now first.
- `[]` when the key is not a party or the client has none.

## `GET /api/pos/tickets/:id`

Each line gains `candidates`. The list is filled only for a pending service line (`kind = 'service'`, no `booking_id`, no `plan_id`) of a non-void ticket that has a client; otherwise it is `[]`.

```jsonc
{ "lines": [ { /* …existing */ "candidates": [ { "bookingId": "uuid", "startTime": "…", "status": "accepted" } ] } ] }
```

## `POST /api/pos/tickets/:id/schedule`

Body gains an optional `bookingId` (uuid). When present, the call links the line to that existing appointment instead of booking one.

- `eventTypeId` and `start` become optional in this mode and are ignored.
- Success: `200 { booking, created: false, linked: true }`. No appointment is created and no reservation is opened.
- Replaying the same `bookingId` on an already-linked line returns the same body (idempotent).

Refusals (existing `PosError` → `handlePosError` mapping):

| code | HTTP | message (es) |
|---|---|---|
| `booking_not_found` | 404 | La cita ya no existe. Agenda una nueva. |
| `booking_other_client` | 409 | Esta cita es de otro cliente. Elige otra o agenda una nueva. |
| `booking_dead` | 409 | Esta cita está cancelada. Agenda una nueva. |
| `booking_already_charged` | 409 | Esta cita ya se cobró en {ticket}. Ábrela desde la agenda para revisar ese cobro. |
| `line_already_scheduled` | 409 | (existing) |

Without `bookingId`, the endpoint keeps today's behaviour, except one change: no reservation is opened for a redeemed or bundle line (research R6).

## `POST /api/pos/tickets` (submit)

Request unchanged. Each line with `bookingId` is now validated under a row lock on the appointment.

- The refusals in the table above apply, except "already charged", which applies to `service` lines only.
- A refused sale writes nothing: no ticket, no payment, no stock.
