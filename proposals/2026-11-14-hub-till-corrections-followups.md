---
id: 2026-11-14-hub-till-corrections-followups
title: Till corrections (spec 120) — open ends and follow-ups
status: draft
created: 2026-11-14
updated: 2026-11-16
repos: [minion_hub]
value: 5
effort: M
source: spec-120-till-corrections
---

# Till corrections (spec 120) — open ends and follow-ups

## Request

Spec `specs/120-till-corrections` left these items out of scope or open. Each one is recorded here
so the maintenance pipeline picks it up. Evidence is from hub `origin/master` `21825676` and
read-only queries on the FACES org on 2026-11-13/14.

## Items

### 1. One live stock movement per sale (open end, `TODO(handoff)` in `voidTicket`)

- AS-IS: a sale's stock movement is found through `stk_entries.metadata.source = 'pos'` and
  `sourceId`. Nothing in the database stops two live movements for one sale. Spec 120 adds a
  rebuild (`repostTicketStock`) that cancels and re-posts the movement. `voidTicket` now ends with a
  lookup that cancels a live movement posted by a racing rebuild. A rebuild that read the sale
  before the void committed and posts after that lookup still leaves a live movement on a void sale.
- TO-BE: a partial unique index on live `pos`-sourced movements per sale, so the second post fails
  instead of deducting stock for a void sale.
- DELTA: migration with the index; `postTicketStock` treats the unique violation as "already
  posted"; test: two concurrent posts leave one live movement.

### 2. Products-only sales on the agenda

- AS-IS: the agenda shows products of the sale that charged the visit (spec 120, slice S3). A sale
  with products only is not tied to a visit and does not show. FACES has 4 such sales, each for a
  client with a visit the same day.
- TO-BE: decide whether such a sale shows on the client's visit of that day.
- DELTA: owner decision first; matching by client and day is a guess and can attach a sale to the
  wrong visit.

### 3. Treatment with quantity above 1 charged from an appointment

- AS-IS: 4 FACES treatment lines have quantity above 1 and are linked to one appointment.
  Completing the appointment issues the recipe once, so stock is under-deducted.
- TO-BE: completion issues the recipe times the quantity charged, or the till refuses a quantity
  above 1 on an appointment line.
- DELTA: owner decision; then the accrual for an appointment-first sale takes the line quantity.

### 4. Bundle recipes and counter-redeemed package sessions still deduct at the sale

- AS-IS: spec 120 keeps the sale as the only deduction for a bundle line and for a package session
  redeemed at the counter with no appointment.
- TO-BE: these follow the appointment like any other treatment, once every session is scheduled.
- DELTA: depends on every redemption having an appointment; FACES has 1 redemption and 0
  redemption lines today.

### 5. Credit notes for real electronic documents

- AS-IS: all 104 FACES documents are in SUNAT's test environment. No credit-note code was found in
  the till's document-issuing service (only that service was searched). Spec 120 guides the user
  to void and charge again when a sale has a real document.
- TO-BE: before an org issues real documents, a correction on a sale with an accepted document
  issues the credit note that SUNAT requires.
- DELTA: confirm what `voidTicket` does to an accepted document; design the credit-note flow.

### 6. Read-only prod sessions are not enforced through the pooler

- AS-IS: the Supabase pooler drops startup options. `PGOPTIONS='-c
  default_transaction_read_only=on'` and the same setting as a URL parameter both leave
  `default_transaction_read_only = off` (checked on port 5432, 2026-11-14). Agent rules that rely
  on that flag are not enforced.
- TO-BE: read-only prod access is enforced by the database, not by the caller.
- DELTA: a read-only database role for inspection, or `set default_transaction_read_only = on` as
  the first statement of a session-port connection (what `scripts/repair-service-sale-stock.ts`
  does in preview mode).

### 7. The stock repair books its correction on the day it runs

- AS-IS: `repostTicketStock` cancels a sale's movement and posts a new one. Both land on the run
  day (`stk_entries.posted_at` and the ledger rows are written with the current time). Cost of
  goods is summed by `posted_at`, so the supplies given back lower the cost of the run month, not
  of the sale month. Product lines net to zero unless the item's average cost changed.
- TO-BE: a correction can be booked on the sale's own date, or the cost report shows corrections
  apart from the month's sales.
- DELTA: owner decision; a backdated post changes the shared stock-posting code.

### 8. "Your role cannot void" does not name who can

- AS-IS: the guided void (slice S5) tells a user without `pos:manage` which permission is needed.
  Spec task T038 asked for the names of the roles that hold it.
- TO-BE: the message lists the org's roles holding `pos:manage`.
- DELTA: load those role names with the sale page; one string with a list.

### 9. Void and charge again has not run against a database

- AS-IS: slices S4 and S5 are proved by unit tests and a mounted test of the sale page. No QA sale
  was voided and charged again end to end. The document-issuing flow does not take the sale's row
  lock that the swap takes.
- TO-BE: one recorded QA run: swap, refused swap, void with each refund choice, till pre-filled,
  charge again, appointment shows paid once, supplies deducted once.
- DELTA: a QA stack with a seeded sale; the emit flow takes the same lock.

### 10. A product swap is not shown on the sale (`TODO(handoff)` on the sale page)

- AS-IS: `swapTicketLineProduct` writes an audit row (`pos_ticket`, `line.<id>.product`). The sale
  page does not read the audit log, so "Cambiado de X a Y por <name>, <date>" (spec 120, US4
  scenario 2) is not visible. No shared history component exists in the hub.
- TO-BE: the sale page lists its corrections.
- DELTA: load the sale's audit rows in the page loader; render them under the lines.

### 11. Smaller review notes left open (EGM stage 9, 2026-11-14)

- The out-of-stock refusal does not name the short item, though the server sends it.
- The agenda marker renders even when a host passes its own `block` snippet (no caller does today).
- With a custom hover-field order that does not end in `actions`, the products section sits
  mid-card.
- The till hand-off drops a ticket-level discount (the till never writes one).
- Whether a FACES re-charge needs the client's document re-picked was not checked: the hand-off
  carries name and party, not the document number (same as the agenda hand-off).

## Out of scope

- Changing a line's price or quantity after submit.
- Returns and exchanges with a price difference.

## Definition of done

Each item has an owner decision or a spec of its own, and the `TODO(handoff)` in `voidTicket` is
removed by item 1.
