---
id: 2026-11-13-faces-stock-follows-appointment-agenda-products-line-swap
title: FACES till feedback (2026-11-13) — stock is deducted at sale and again at the appointment, gift products missing from the agenda, no way to fix a wrong size
status: merged
created: 2026-11-13
updated: 2026-11-16
repos: [minion_hub]
value: 9
effort: M
source: faces-whatsapp-2026-11-13
spawned_spec: 2026-11-14-hub-till-corrections-spec
---

# FACES till feedback (2026-11-13)

## Request

Four WhatsApp messages from FACES reception, with screenshots of `/pos/appointments` and
`/stock/entries`. Staff words, translated:

1. "Is there a way that when I charge a product it shows in the agenda? Even if they don't pay,
   because I put them at 0, they are gifts."
2. "I entered two *fajas* as the wrong size but already validated it. Is there a way to subtract or
   modify it without having to deduct or add stock?"
3. "A client bought *ojera*, *rino* and *mentón* on 04/11. That day she had *rino* and *mentón*
   done and her *ojera* is still pending. Why were 3 syringes deducted if one is pending?"
4. "Another client bought a *mentón* and an *ojera* on 05/11, with the *ojera* pending for 10/11.
   On the sale day 2 were deducted and the day she came 1 more. I charged it from the till."

Everything below was checked against hub `origin/master` `21825676` and read-only prod queries on
the FACES org (`21e0601b-…`, `default_transaction_read_only=on`). No code or data was changed.
Patients are named by ticket id only; this repository is public.

## Interpretation

| # | What they said | What it is | Verdict |
|---|---|---|---|
| 3, 4 | Syringes deducted for a pending service, then again when it is done | **Bug.** A service sold with no appointment issues its recipe at the sale. Scheduling it later reserves the recipe again, and completing the appointment issues it a second time | Confirmed in prod |
| 1 | Gift products do not show in the agenda | **Gap.** The hover card lists the visit's services only. The detail drawer already lists the other lines of the ticket | Confirmed |
| 2 | Cannot fix a wrong size on a validated sale | **Gap.** The only correct path today is voiding the whole ticket and ringing it again | Confirmed; the two tickets are not identified yet |

## AS-IS

### A. Stock: a service sold without an appointment is deducted at the sale (messages 3, 4)

Two paths deduct stock for a service, and nothing connects them.

- **Sale path.** `resolveIssueLines` (`src/server/services/pos.service.ts:750`) issues the recipe
  of every ticket line that has a product and **no `bookingId`**, whatever its kind. Line 771:
  `if (l.bookingId || !l.finProductId) continue;`. A service line charged from an appointment is
  skipped. A service line sold on its own (the "paid, not scheduled" case) is issued on the spot.
- **Appointment path.** `scheduleTicketLine` (`src/server/services/scheduling-bookings.service.ts`,
  the block ending at line 850) creates the appointment for that paid line, sets the line's
  `bookingId`, then calls `accrueForBooking`. Completing the appointment realizes the accrual as a
  second stock issue.

Evidence, message 3 (ticket `POS-2026-00110`, 04/11): the unscheduled *Ojera* line posted
`STE-2026-00601` (−1 HA Saypha Volume Plus) at 20:29. The two appointments done that day posted
`STE-2026-00602` and `STE-2026-00603` at 20:30. Three syringes left the system; two left the shelf.
Those are the three entries in the staff screenshot.

Evidence, message 4 (ticket `POS-2026-00113`, 05/11): the *Ojera* line posted `STE-2026-00610`
(−1) at the sale. It was scheduled 25 minutes later and completed on 10/11, which posted
`STE-2026-00624` (−1). One syringe, two deductions.

Scale, FACES, all time: 12 service lines across 9 tickets were sold without an appointment and
issued stock at the sale. Sale-time issues read from the actual stock entries:

| Ticket | Sale entry | Issued at the sale for services | Appointment afterwards | Result |
|---|---|---|---|---|
| POS-2026-00027 | STE-2026-00467 | HA Saypha Volume 1 | no-show (accrual released) | deducted, never used |
| POS-2026-00030 | STE-2026-00474 | HA Saypha Volume Plus 1 | completed, realized 1 | double |
| POS-2026-00031 | STE-2026-00475 | Dysport 255, Ácido Desoxicólico 18 | completed, realized 255 and 6 | double |
| POS-2026-00032 | STE-2026-00481 | Dysport 180 | completed, realized 180 | double |
| POS-2026-00038 | STE-2026-00486 | Dysport 255 | accepted, accrual open | will double |
| POS-2026-00049 | STE-2026-00500 | HA Saypha Filler 1 | completed, realized 1 | double |
| POS-2026-00077 | STE-2026-00543 | HA Saypha Volume Plus 1 | no-show (accrual released) | deducted, never used |
| POS-2026-00110 | STE-2026-00601 | HA Saypha Volume Plus 1 | not scheduled | deducted while pending |
| POS-2026-00113 | STE-2026-00610 | HA Saypha Volume Plus 1 | completed, realized 1 | double |

System stock is therefore short against the shelf by about: HA Saypha Volume Plus 4, HA Saypha
Volume 1, HA Saypha Filler 1, Dysport 690, Ácido Desoxicólico 18. `STE-2026-00500` also carries
1 Bioestimulador de Colágeno whose origin (product line or service recipe) was not checked.

No other org has such lines (cross-org count: FACES only).

### B. Agenda: products of the sale are invisible on the calendar (message 1)

- The hover card in `/pos/appointments` lists the services of the visit (the appointment group).
  The screenshot ticket `POS-2026-00096` has a `Faja L` line at S/ 0.00 next to the service; the
  card shows "2 servicios" and nothing about the faja.
- The detail drawer already has the data: `ticketRefsForBookings`
  (`scheduling-bookings.service.ts:3624`) returns `otherLines`, "what else the customer bought",
  and `BookingDetailDrawer.svelte` renders it. Staff read the hover card, not the drawer.
- The calendar window payload already carries every ticket of the week with its lines
  (`CalendarInvoice.lines`, `src/lib/components/scheduling/calendar-window.ts`), without the line
  kind or quantity.
- Size of the habit: 35 tickets that charge an appointment also carry product lines; 45 of those
  46 lines are S/ 0.00 gifts.

### C. Wrong product on a validated sale (message 2)

Ways to correct a submitted ticket line today:

| Path | What it does | Problem |
|---|---|---|
| Void the ticket, ring it again | Reverses stock, refunds money, new ticket | Refunds and re-charges S/ 1,000+ to fix a S/ 0 gift; new ticket number |
| Two manual stock entries (issue the right size, re-enter the wrong one) | Fixes the counts | This is what staff asked to avoid; a positive adjustment also needs a rate; the ticket still names the wrong size |
| "Cancel" on the ticket's stock entry (`/stock/entries/[id]`) | Reverses every line of that entry | No guard for a ticket-sourced entry was found; the ticket would keep pointing at a cancelled entry |

There is no line-level correction. Every faja sold through the till since 13/10 is `FAJA-L`
(8 tickets), so some of them are probably M or S. Which two tickets staff meant is not known.

## TO-BE

### A. Stock follows the appointment

- Selling a service never deducts stock, with or without an appointment. Products keep deducting
  at the sale.
- Scheduling a paid service reserves its recipe (existing accrual). Completing the appointment
  deducts it once (existing realization). A no-show or cancellation releases it (existing).
- A paid service that is never scheduled deducts nothing and stays visible in "Servicios pagados
  sin agendar".
- Invariants: appointment-first sales behave as today; product lines behave as today; voiding a
  ticket still reverses exactly what that ticket issued; the till's availability check for
  products is unchanged.

### B. The agenda shows what was sold with the visit

- The hover card of a charged visit lists the product lines of the ticket(s) that charged it,
  with quantity, and marks S/ 0.00 lines as a gift. Example: "Productos: 1 × Faja L (regalo)".
- A visit with a product gets a small marker on its calendar block, so staff see it without
  hovering.
- Invariants: no extra query per appointment; non-POS calendars are unchanged.

### C. Swap a product on a submitted ticket

- On a submitted ticket, a product line offers "Cambiar producto". Staff pick another product at
  the **same unit price** (S/ 0 gifts qualify). The line's product and description change.
- One stock entry returns the old item and issues the new one. The ticket links to it. The change
  is in the audit log with who and when.
- Money, payments, shift totals and the ticket number do not change.
- Refused when: the ticket is void, the new item is out of stock, or the prices differ. Each
  refusal says what to do instead.
- A ticket that already has an electronic document is not refused: the app guides the user
  through the correction that document requires and finishes it for them (see Decisions).

### Data repair (one time, owner runs it)

A dry-run-first script that posts one adjustment per affected item giving back the sale-time
service issues listed in AS-IS A, with a note naming the source entries, and prints the before
and after counts. It is run twice; the second run must plan nothing.

## DELTA

| # | Transition | Where | Proof |
|---|---|---|---|
| A1 | `resolveIssueLines` skips `kind = 'service'` lines | `pos.service.ts:750–772` (both callers: submit at 1052, availability at 1512) | unit: a ticket with one unscheduled service + one product issues the product only |
| A2 | Schedule then complete that line deducts once | no code change expected | integration: sell unscheduled → schedule → complete ⇒ exactly one issue for the recipe |
| A3 | Repair script | `scripts/`, owner-run with `--apply` | dry-run output equals the AS-IS table; second run plans nothing |
| B1 | Calendar payload carries product lines per charged visit (kind, qty, total) | `CalendarInvoice.lines` or `CalendarBooking.tickets` | unit on the window builder |
| B2 | Hover card section + block marker | `/pos/appointments` hover card, calendar block | component test; design gates `lint:design`, `lint:tokens` |
| C1 | `swapTicketLineProduct` service + API route | `pos.service.ts`, `/api/pos/tickets/[id]/lines/[lineId]/swap` | unit: same price swap moves stock ±qty and leaves money untouched; each refusal has a test |
| C2 | "Cambiar producto" in the ticket view | ticket detail page | browser check on a QA ticket |

Suggested order: A1–A3 first (stock counts are wrong today and get worse with every prepaid
service), then B, then C.

## Decisions (owner, 2026-11-14)

1. A: no FACES service is performed outside the agenda. "The front desk always has to mark all
   events/treatments on the calendar and sell via POS." Service lines never deduct at the sale.
2. C: which tickets need correcting is for staff to decide. The goal is to "open the door for them
   to be able to execute corrective actions without making the experience too complex".
3. C: a ticket with an electronic document is **not refused**. "Instead of telling the user NO and
   leaving it there, I want the app to help the user do what they need to do." The spec must
   carry a user story that completes the correction for an emitted ticket (a guided path, not an
   error).

## Still open for the spec

- A: the repair gives back stock for the two no-shows too (`POS-2026-00027`, `-00077`). Confirm
  the syringes are still on the shelf before `--apply`.
- B: should a ticket with products only (no service line), for a client who has an appointment
  that day, also show on that appointment? Not measured.
- C: does a swap need a role above reception?

## Out of scope

- Changing a line's price or quantity after submit.
- Returns and exchanges with a price difference.
- A guard on cancelling a ticket-sourced stock entry from `/stock/entries` (worth its own item).
- The toxin recipes that list Dysport and INIBO for the same service.

## Definition of done

- Selling an unscheduled service changes no stock count; completing its appointment deducts the
  recipe once. Proven by the A1 and A2 tests and by a prod check on the next prepaid sale.
- FACES counts for the five items match the shelf after the repair run.
- A charged visit with a gift product shows the product on the hover card and a marker on the block.
- Staff can change `Faja L` to `Faja M` on a submitted ticket in one action, with one stock entry
  and no money movement.
