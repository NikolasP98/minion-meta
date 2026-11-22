# Research: spec 133

All facts below were read on hub `origin/master` `89397baa` (2026-11-19) or queried read-only on prod.

## R1 — Why the duplicate happened

- **Decision**: fix it at the cart, before submit, and add the schedule-step and server guards as safety nets.
- **Evidence**: `billSession` (`src/routes/(app)/pos/sell/PageBody.svelte:479-521`) always prepends a new line:
  `{ unitPrice: 0, bookingId: next.bookingId, redemptionId: next.id }`. A session drawn at the counter has
  `bookingId: null`. The appointment's own line stays in the cart.
  - Tickets 00161: the paid booked line was removed by hand, and the new line reached submit unlinked.
- **Rationale**: once a line has its `bookingId` at submit, existing rules already do the right thing:
  - `resolveIssueLinesTx` returns `false` for any line with `bookingId` (pos.service.ts:876);
  - `isPendingScheduling` hides it from the schedule step.

  So the smallest complete fix is getting the link onto the line early.
- **Alternatives rejected**:
  - (a) Never issue a redeemed line at the sale. This would break a walk-in session performed on the spot, which spec 120 deliberately issues at the sale.
  - (b) Repost the sale after linking. That tool (`repostTicketStock`) was removed by spec 124.

## R2 — "Matching appointment" and "already charged"

- **Decision**: an appointment matches a cart or ticket line when all of these hold:
  - same org;
  - `sched_bookings.product_id = line.fin_product_id`;
  - same client: `party_id` = the sale's party, or the booking has no party and `crm_contact_id` = the sale's CRM contact;
  - status not in `cancelled`, `rejected`, `no_show` (the same set as `RELEASING`, scheduling-bookings.service.ts:1056);
  - `start_time` within ±30 days of now;
  - no **service** line of a `submitted` ticket points at it.
- **Evidence**:
  - Product lines legitimately share a booking: in POS-2026-00161 the gift "Faja M" sits on the appointment. So "already charged" must look at `kind = 'service'` lines only.
  - Void tickets have `status = 'void'`.
  - Completed appointments must stay matchable: the incident's appointment was completed at 18:22, before the 18:36 charge.
  - All 610 FACES appointments carry `product_id` (prod, 2026-11-19), so matching by service never misses for lack of it.
- **Alternatives rejected**:
  - Matching by event type: an event type can sell several products.
  - No time window: 57 stale FACES appointments (3 Oct to 7 Nov) would be offered.

## R3 — Concurrency: two cashiers, one appointment

- **Decision**: in `submitTicket` and in the link-existing path, take `select … from sched_bookings where id = $1 for update` before checking "already charged", then write the line. No new index or constraint.
- **Evidence**: `pos_ticket_lines` has no index on `booking_id` (prod `pg_indexes`, 2026-11-19).
  - A unique partial index would also need to exempt product lines and void tickets. Void lives on the ticket, not the line, so an index can't express it.
- **Rationale**: the row lock serializes the two claims. The second claim sees the first line and is refused with "Esta cita ya se cobró en POS-…".
- **Alternatives rejected**: a unique index `(booking_id) where kind = 'service'`. It would wrongly block re-charging after a void, and it needs a migration.

## R4 — Where the cart gets the appointments

- **Decision**: add `appointments: { bookingId, productId, startTime, status }[]` to the client account detail.
  - The sell page already fetches it whenever a customer is set (`sell-session.svelte.ts:379`, `GET /api/pos/accounts/party:<id>` → `getClientAccountDetail`).
  - Capped at 20 rows, soonest first.
- **Rationale**: no new route, so no RBAC or route-contract change, and no extra round trip. `/pos/accounts` ignores the new field.
- **Alternative rejected**: a new `GET /api/pos/appointments?partyId=`. It needs a new route manifest and gate for the same data.

## R5 — Where the schedule step gets candidates, and how it links

- **Decision**:
  - `getTicket` adds `candidates` (the matching appointments) to each pending service line.
  - `POST /api/pos/tickets/:id/schedule` accepts an optional `bookingId`. When present, `bookAndLinkTicketLine` validates it (R2), locks it (R3), claims `booking_id is null` on the line, and returns `{ booking, created: false, linked: true }`. It creates no booking and opens no accrual.
- **Rationale**: the step already reads the ticket and already posts to `/schedule`, so this is the same call with one more field.

## R6 — No re-reservation for supplies already issued at the sale

- **Decision**: in `bookAndLinkTicketLine`, read the line's `redemption_id` and product. Skip `accrueForBooking` when `redemption_id` is set or the product is a bundle (`bundleProductIds`, pos.service.ts:825; to export).
- **Evidence**: the condition mirrors `issuesAtSale` (pos.service.ts:873-878): unlinked service lines issue at the sale only when redeemed or a bundle.

## R7 — Server validation at submit

- **Decision**: for each line with `bookingId`:
  1. lock the booking (R3);
  2. refuse when it is missing or in another org, belongs to another client (`booking_other_client`), is cancelled or rejected (`booking_dead`), or a **service** line already charges it (`booking_already_charged`, message names the ticket).
- **Evidence**: today the client's `bookingId` is inserted unvalidated (pos.service.ts:2318).
  - The agenda handoff sends the booking's own id, so legitimate sales pass.
  - Product lines on a booking skip the "already charged" check; they only need org and client.
