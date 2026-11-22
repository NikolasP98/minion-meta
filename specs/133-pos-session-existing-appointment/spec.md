---
id: 133-pos-session-existing-appointment
title: Charging a service the client already has an appointment for (no second appointment, no stock at the sale)
stage: spec
status: draft
verdict: pending
pass: 1
created: 2026-11-19
updated: 2026-11-19
repos: [minion_hub]
tags: [ui, data]
related: [120-till-corrections]
---

# Feature Specification: Charging a service the client already has an appointment for

**Feature Branch**: `fix/133-pos-session-existing-appointment` (hub, base `master`)

**Created**: 2026-11-19

**Status**: Draft

**Input**: Owner, 2026-11-19: "go on with this item", for the item "Code fix: charging a package session at the till must not create a duplicate appointment, or deduct at the sale, when the client already has one."

## AS-IS (observed 2026-11-18/19, prod read-only, hub `origin/master` `89397baa`)

### The incident: POS-2026-00161 (FACES, 2026-11-18)

1. The client had an "Afinamiento Facial (individual)" appointment at 17:15, booked on 11-02 as an ordinary appointment (no package). It was completed at 18:22, which issued 6 ml of Ácido Desoxicólico (STE-2026-00689).
2. At 18:36 the sale was charged from that appointment, and its product line (Faja M) carries the appointment.
3. The client pays with a package session. "Cobrar sesión" (`billSession`, `src/routes/(app)/pos/sell/PageBody.svelte` ~479) does not reuse the cart's line that already carries the appointment. It **adds a new line** at price 0, with the redemption and with the redemption's appointment. A session drawn at the counter has no appointment, so the new line has none. The ticket kept the new line and not the appointment's service line.
4. At submit, an unlinked redeemed line issues its recipe at the sale (spec 120 rule, `resolveIssueLinesTx`, `src/server/services/pos.service.ts` ~861-878). That was a second 6 ml (STE-2026-00690).
5. The post-sale schedule step (`ScheduleStep.svelte`) lists every service line with no appointment as "pending". The cashier booked it, and `bookAndLinkTicketLine` (`src/server/services/scheduling-bookings.service.ts` ~751) created a **second appointment at the same hour**. It also opened a third 6 ml reservation (`accrueForBooking`), which completing that appointment would have issued.
6. Repaired by hand on 11-19: the line was relinked to the real appointment, the duplicate was cancelled, and the stock was squared by count adjustment STE-2026-00694.

### Scale

- Of the FACES service lines booked from the schedule step after their sale (97), **2** created a second appointment while the client already had one for the same service within ±3 days:
  - POS-2026-00161: above.
  - POS-2026-00116 (11-05): new appointment 12:45, completed; the original 12:15 is still "accepted".
- Query recorded in the 2026-11-19 session log. Only FACES uses the till.

### Two more gaps found on the way

- `submitTicket` stores each line's `bookingId` exactly as the client sent it (`pos.service.ts` ~2318). Nothing checks that the appointment is in the same organization, belongs to the same client, is not cancelled, or is not already charged on another sale.
- The schedule step offers only "book a new appointment". It never shows that the client already has one for that service.

## TO-BE

- **Package session on an appointment's line**: "Cobrar sesión" on a cart that already holds a line for the same service with an appointment turns **that line** into the package session. The line keeps the appointment, its price becomes 0 (priced by the package), and it carries the session. No second line is added.
- **Charge the appointment that exists**: a service line in the cart with no appointment, whose client has a matching appointment, shows one action on that line: **"Cobrar la cita del 18/11 17:15"**. Choosing it links the line to that appointment before the sale is charged.
  - Matching appointment: same service, same client, not cancelled, not rejected, not a no-show, not already charged on another live sale.
  - If several match, the line offers the closest one in time and lists the others.
  - The cashier may ignore the action and charge without an appointment (a real second visit).
- **After the sale**:
  - A line charged with its appointment issues nothing at the sale. Its supplies leave when that appointment is completed (spec 120), or have already left if it was completed before the charge.
  - Such a line never appears in the schedule step.
- **Schedule step**: for a pending line whose client already has a matching appointment, the step shows **"Usar la cita del 18/11 17:15"** as the first action, above "Agendar nueva". Using it links the line to the existing appointment; no appointment is created.
- **Safety net**: booking a new appointment from the schedule step for a line whose supplies already left at the sale (a package session or a bundle charged without an appointment) **does not reserve** those supplies again. Completing that appointment issues nothing for them.
- **Server check**: a sale line's appointment must belong to the same organization and the same client. It must not be cancelled or rejected, and must not be linked to a line of another live sale. Otherwise the sale is refused with a message that names the appointment and says what to do ("Esta cita ya se cobró en POS-…; ábrela desde la agenda").

**Invariants**:

- One treatment, one appointment.
- A treatment's supplies leave stock exactly once: at the sale when no appointment exists, otherwise at the appointment's completion.
- A sale never points at another client's or another organization's appointment.

## DELTA

| Transition | Proof (test to add) |
|---|---|
| "Cobrar sesión" with a booked line for the grant's service: new line → that line converted (keeps appointment, price 0, session) | unit: `sell-cart` "billing a session on a booked line converts it, adds none" |
| Cart service line without appointment, client with a matching appointment: nothing → one "Cobrar la cita del …" action; choosing it sets the line's appointment | unit: matching rules (same service + client, excludes cancelled/rejected/no-show/already charged, closest first); component: action renders and links |
| Sale of a line linked before submit: recipe issued at the sale (redeemed) → nothing issued at the sale | `pos.tickets.test.ts`: redeemed line with `bookingId` → no stock line (existing rule, new case) |
| Schedule step, client already has a matching appointment: only "book new" → "Usar la cita del …" first; using it links, creates none | server: link-existing path stamps `booking_id`, no booking insert, no reservation; component: action order |
| Schedule step books new for a redeemed/bundle line: reservation opened → none opened | `scheduling-bookings-ticket-link.test.ts`: redeemed line → `accrueForBooking` not called |
| Submit with a foreign, cancelled, other-client or already-charged appointment: stored as sent → refused with a next-step message | `pos.tickets.test.ts`: four refusal cases, sale and money unchanged |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Charge a package session on the appointment (Priority: P1)

The client arrives for her appointment and pays with a package session. The cashier opens the sale from the agenda and presses "Cobrar sesión". The appointment's line becomes the session at price 0. The sale has one service line linked to the appointment, nothing is deducted at the sale, and no schedule step appears.

**Why this priority**: this is the exact path of the incident, and it double-counts stock today.

**Independent Test**: charge from an appointment, bill a session, and submit. The ticket has one service line with both the appointment and the session, and no stock movement for that service.

**Acceptance Scenarios**:

1. **Given** a cart opened from an appointment for service S, **When** the cashier bills a session of a package for S, **Then** the cart has one line for S at 0 with the appointment and the session.
2. **Given** that cart, **When** the sale is charged, **Then** no supplies of S are issued at the sale and the schedule step lists nothing for S.
3. **Given** a cart with no line for S, **When** the cashier bills a session, **Then** a new line is added as today.

### User Story 2 — Charge the appointment that already exists (Priority: P1)

The cashier rings the service from the catalog, not from the agenda, for a client who has an appointment for it. The line shows "Cobrar la cita del 18/11 17:15". One click links it.

**Independent Test**: a client with an appointment for S; add S from the catalog; the action appears; choose it; submit. The line is linked and no new appointment exists.

**Acceptance Scenarios**:

1. **Given** a client with an uncharged appointment for S, **When** S is added to the cart, **Then** the line offers "Cobrar la cita del <date time>".
2. **Given** the client's only appointment for S is cancelled, a no-show, or already charged, **When** S is added, **Then** no action appears.
3. **Given** two matching appointments, **When** S is added, **Then** the closest one is offered and the other can be chosen.
4. **Given** the action is ignored, **When** the sale is charged, **Then** it behaves as today (schedule step offered).

### User Story 3 — The schedule step offers the existing appointment (Priority: P2)

After a sale whose service line has no appointment, the schedule step shows "Usar la cita del …" first when one matches. Using it links the line, books nothing, and leaves stock untouched.

**Acceptance Scenarios**:

1. **Given** a pending line and a matching appointment, **When** the step opens, **Then** "Usar la cita del …" is shown above "Agendar nueva".
2. **Given** the cashier uses it, **Then** the line is linked, no appointment is created, and no new reservation is opened.

### User Story 4 — No second reservation for supplies already issued (Priority: P2)

A package session charged without an appointment issues its supplies at the sale. If the cashier then books it from the schedule step, the new appointment reserves nothing for those supplies.

**Acceptance Scenarios**:

1. **Given** a redeemed line charged without an appointment, **When** it is booked from the schedule step, **Then** no reservation is opened for its recipe and completing the appointment issues nothing for it.

### Edge Cases

- The appointment was already completed before the charge (the incident): linking it issues nothing more, because its supplies already left at completion.
- An appointment that is part of a series: only that occurrence is matched.
- A walk-in with no customer chosen: no matching runs until a customer is set.
- The same appointment offered on two lines of one cart: once one line takes it, the other line no longer offers it.
- An appointment drawn from a package at booking time (`package_grant_id` set): its own session is billed through the existing "drawn at booking" path, unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Billing a package session on a cart that holds a line for the same service with an appointment MUST convert that line (keep the appointment, price 0, attach the session) and MUST NOT add another line.
- **FR-002**: A cart service line without an appointment MUST offer the client's matching appointment as a single action on the line, and choosing it MUST link the line before the sale is charged.
- **FR-003**: A matching appointment MUST be the same service and the same client, not cancelled, rejected or no-show, and not linked to a line of another live sale.
- **FR-004**: The schedule step MUST offer a matching appointment first. Using it MUST link the line without creating an appointment or a reservation.
- **FR-005**: Booking a new appointment for a line whose supplies were issued at the sale MUST NOT reserve those supplies again.
- **FR-006**: The server MUST refuse a sale line whose appointment is in another organization, belongs to another client, is cancelled or rejected, or is already linked to another live sale. The refusal message MUST name the appointment and the next step.
- **FR-007**: A sale with no appointment-matching situation MUST behave exactly as today.
- **FR-008**: Every new text MUST be translated (es, en). The new line action and step action MUST follow the design-token contract.

### Key Entities

- **Sale line**: service, price, optional appointment, optional package session.
- **Appointment**: service, client, time, status, and at most one live sale line charging it.
- **Matching appointment**: an appointment of the line's client and service that no live sale line charges and that is not cancelled, rejected or a no-show.

## Success Criteria *(mandatory)*

- **SC-001**: Charging a package session from an appointment produces one appointment and one stock deduction for the treatment, measured on the incident's path end to end.
- **SC-002**: Over the 30 days after release, sales that create a second appointment for a client who already had one for that service (±3 days) drop from 2 in the last 30 days to 0. Measured by the same query as the AS-IS scale.
- **SC-003**: A cashier links an existing appointment in one click, from the line or the schedule step.
- **SC-004**: Sales with no existing appointment keep today's steps and stock behavior; the existing till tests pass unchanged.

## Assumptions

- "Same client" means the same party, or the same CRM contact when the appointment has no party, as the agenda already matches them.
- Matching looks at appointments from 30 days before to 30 days after the sale. Older appointments are almost always stale (see the 57 FACES appointments being closed by hand).
- Out of scope:
  - repairing past sales (done by hand on 11-19);
  - stamping the appointment on a counter-drawn redemption;
  - closing the 57 stale FACES appointments;
  - the duplicate left by POS-2026-00116 (its 12:15 appointment is on the clinic's closing list).

## FigCraft demo

[pos-session-existing-appointment.figcraft](pos-session-existing-appointment.figcraft), page "Spec 133 · demo", 8 frames:

1. "Cobrar sesión" from the appointment (as-is / to-be).
2. A service rung from the catalog (as-is / to-be / to-be after taking the appointment).
3. The "Agenda los servicios" step (as-is / to-be).
4. The server refusal (to-be).

The copied master frames ("Point of Sale / pos/sell", Button, Badge, IconButton) are kept on their pages as context. Mock data is fictitious ("Ana Torres").
