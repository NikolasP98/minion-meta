# Research: Till corrections

All findings are from hub `origin/master` `21825676` and read-only prod queries (2026-11-13/14).

## R1. Where to stop the sale-time deduction

- **Decision**: in `resolveIssueLines` (`pos.service.ts:750`), skip lines with `kind = 'service'`
  in both the product-id collection and the loop. Both callers (submit, line 1052; availability
  preflight, line 1512) inherit it.
- **Rationale**: one place decides what a sale issues. The appointment path already reserves and
  realizes the recipe.
- **Alternatives**: keep the sale issue and skip the reservation when scheduling. Rejected: the
  supplies would still leave stock while the treatment is pending, which is what staff reported.

## R2. How to correct stock for a changed or repaired sale

- **Decision**: `repostTicketStock` = `cancelEntry(ticket.stockEntryId)` → clear the stamp →
  `postTicketStock`. `findEntryBySource` already ignores cancelled entries
  (`stock.service.ts:2002`), so the repost creates a fresh movement.
- **Rationale**: reuses the cancel and post paths, keeps `ticket.stockEntryId` pointing at the
  live movement, so void keeps working with no change.
- **Alternatives**: a dedicated two-line adjustment entry per swap. Rejected: void would have to
  find and cancel swap entries too, and a positive adjustment needs a rate.

## R3. Repair

- **Decision**: a script that, for one organisation, finds submitted sales whose live stock
  movement differs from what the new rule resolves, previews the difference per item, and on
  `--apply` calls `repostTicketStock`. It refuses a sale whose product quantities would change.
- **Rationale**: same function as the swap; the second run finds no difference and plans nothing.
- **Measured target**: 9 sales; HA Saypha Volume Plus 4, HA Saypha Volume 1, HA Saypha Filler 1,
  Dysport 690, Ácido Desoxicólico 18. STE-2026-00500's Bioestimulador line is unverified; the
  preview will show which side it falls on.

## R4. Agenda payload

- **Decision**: the calendar ticket query (`pos-accounts.service.ts`, the block selecting
  `kind = 'service'` lines near line 671) gains a second grouped read of `kind = 'product'` lines
  for the same ticket ids, returned as `products: { description, qty, total }[]`. Products-only
  sales are matched to visits client-side by party and local day.
- **Rationale**: `lines` keeps its meaning for existing consumers. One extra query per window.
- **Alternatives**: put products on `CalendarBooking.tickets`. Rejected: products-only sales have
  no booking to hang on.
- **Check in S3**: whether the calendar ticket payload carries `partyId`; add it if not.

## R5. Guided correction

- **Decision**: client flow: confirm → `POST /void` (existing) → stage the till through
  `sell-charge-handoff` with the sale's lines, replacement applied → navigate to the till.
- **Finding**: handoff lines require a `bookingId` today (`SellChargeLine`). Lines without an
  appointment need the type to accept `null` (handoff version 4, older blobs still parsed).
- **Rationale**: no new server operation; void rules stay in one place.

## R6. Permissions

- Void route gate: `requireOrgCapability(locals, 'pos', 'manage')`. Swap uses `pos` `edit`.
  Whether FACES reception holds `pos:manage` was not checked; FR-018 covers both cases.

## R7. Electronic documents

- All 104 FACES documents are `environment = 'beta'`. "Legally valid" = an accepted document in a
  non-beta environment. No such row can exist until production emission is enabled.

## R8. Changes after review (2026-11-14)

- **R1 revised**: decide by kind. Product → always issue. Service → issue only when it has no
  appointment and is a redeemed session (`redemptionId`) or a bundle; otherwise nothing.
  `bookAndLinkTicketLine` (`scheduling-bookings.service.ts:747`) passes the line `qty` as the
  accrual `quantity` (`AccrueInput.quantity`, default 1).
- **R2 revised**: see plan.md "Rebuild sequence". `postTicketStock` (`pos.service.ts:1019`) must
  load the stamped entry's status and continue when it is `cancelled`.
- **R3 revised**: candidates = submitted sales with a live `pos` movement and at least one
  treatment line whose recipe shares an item with that movement. Comparison in stock units.
- **R4 revised**: extend `bookingTicketLinks` (`pos-accounts.service.ts`, near 598) with the
  product lines of the linked tickets. `listTicketsForCalendar` stays as is.
- **R5 revised**: handoff version 4 adds `unitPrice`, `discount` and `bookingId: string | null`;
  staging uses them instead of the catalogue price. The void action with refund choice
  (`appointments/PageBody.svelte:844–847`) is extracted into a shared component.
- **R6 revised**: swap guards reuse `assertTicketMutable` (`pos/tender-correction.ts:26`) with
  `emitted` computed over non-beta, non-error emissions and `fiscal: true`.
- **Prod facts**: 0 linked product lines; 13 grants, 1 redemption, 0 redemption lines; 0 item
  components; 0 plans; 1 organisation with sales; 0 draft `pos` movements.
