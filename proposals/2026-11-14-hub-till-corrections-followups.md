---
id: 2026-11-14-hub-till-corrections-followups
title: Till corrections (spec 120) — open ends and follow-ups
status: draft
created: 2026-11-14
updated: 2026-11-14
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

## Out of scope

- Changing a line's price or quantity after submit.
- Returns and exchanges with a price difference.

## Definition of done

Each item has an owner decision or a spec of its own, and the `TODO(handoff)` in `voidTicket` is
removed by item 1.
