# Data model: spec 133

No schema change. Existing tables and the rules this feature adds on top of them.

## Sale line (`pos_ticket_lines`)

| Field | Use here |
|---|---|
| `kind` | `service` lines charge an appointment; `product` lines may sit on one (gift, visit product) |
| `booking_id` | the appointment the line charges or sits on. Set at submit (cart link) or by the schedule step (new or existing) |
| `redemption_id` | package session; with no `booking_id` at submit, its recipe is issued at the sale (spec 120) |
| `fin_product_id` | matched against `sched_bookings.product_id` |

**Rule (new)**: at most one service line of a `submitted` ticket points at a given appointment. This is enforced under a row lock on the appointment; there is no index (research R3).

## Appointment (`sched_bookings`)

| Field | Use here |
|---|---|
| `product_id` | the service it sells |
| `party_id`, `crm_contact_id` | client identity; party first, CRM contact when there is no party |
| `status` | `accepted`, `pending`, `completed` match; `cancelled`, `rejected`, `no_show` never match |
| `start_time` | ±30 days window; the closest to now is offered first |

## Uncharged appointment (derived, `unchargedAppointmentsFor`)

```text
{ bookingId, productId, startTime, status }
```

An appointment of the client that passes the status and window rules and that no service line of a submitted ticket charges. At most 20, ordered by distance from now.

## Cart line (client state, `CartLine`)

Existing: `bookingId`, `redemptionId`, `sellable`, `qty`, `unitPrice`, `discount`.

Transitions (pure helpers in `sell-appointments.ts`):

| From | Event | To |
|---|---|---|
| line for product P with `bookingId` B, no `redemptionId` | bill a session of a grant for P | same line: `unitPrice 0`, `discount 0`, `redemptionId` R, `bookingId` B kept |
| no line for P with a booking | bill a session of a grant for P | new line prepended (today's behaviour) |
| service line for P, no `bookingId`, client has uncharged appointment B for P not used by another cart line | "Cobrar la cita del …" | `bookingId` B |
| line with `bookingId` set by that action | unlink (X) | `bookingId` null |

## Stock effect (unchanged rules, new inputs)

| Line at submit | Issued at the sale | Issued at completion |
|---|---|---|
| service with `booking_id` | nothing | the appointment's recipe (already issued if it was completed before the sale) |
| service, no booking, redeemed or bundle | the recipe | nothing; schedule-step booking no longer reserves it (R6) |
| service, no booking, plain | nothing | the recipe of the appointment booked later |
