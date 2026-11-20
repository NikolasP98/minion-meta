---
id: 2026-11-10-hub-pos-receivables-price-zero-spec
title: POS receivables ignore price-0 follow-ups
stage: dev
status: implementing
pass: 1
created: 2026-11-10
updated: 2026-11-10
repos: [minion_hub]
type: fix
---

# POS receivables ignore price-0 follow-ups

Hotfix-sized fix taken straight from the investigated proposal
`proposals/2026-11-10-faces-weekly-sync-backlog.md` §1 (that file exists only in the main meta
checkout and is uncommitted). Spec exists per the "every fix gets a spec" rule; no separate
proposal or two-pass review is skipped silently: the proposal is the investigation.

## 0. Product

Staff trust the Accounts badge only if it counts money that can actually be collected. Free
follow-ups must not read as owed.

## AS-IS (measured on prod, read-only, 2026-11-10)

- The `/pos/accounts` list ("Cuentas") and its side-menu badge count a scheduled service as
  "por cobrar" when it is not `cancelled`/`rejected`/`no_show`, has no grant, plan, invoice link
  or non-void ticket line. Anchors: `UNBILLED_BOOKING_WHERE`
  (`src/server/services/pos/accounts/unbilled.ts`, used by `countPosPendingWork` and the
  accounts projection `pos/accounts/list.ts`) and its client twin `chargeableRows`
  (`src/lib/components/scheduling/visit.ts`: drawer Charge button, calendar "Cobrar").
- FACES shows 285. 111 of them have catalog price 0: Control (86), Control Botox (18),
  CONTROL FINAL AFINAMIENTO (7). They can never be charged, so they read as owed forever.
- Price resolves as `coalesce(sched_bookings.product_id, sched_event_types.product_id)` ->
  active `fin_products.unit_price` (`visitForBooking`, `scheduling-bookings.service.ts`).

## TO-BE

- A booking whose resolved price is exactly 0 is never owed: not in the badge, the accounts
  list, the Charge button or "Cobrar".
- Invariants: a priced service with no non-void ticket line, grant, plan or invoice link is still
  owed; a **null** price (no product, or inactive product) is still owed and shown as "—";
  nothing else changes. The badge stays one SQL statement.

## DELTA

| Transition | Test |
|---|---|
| `chargeableRows` drops `price === 0` rows | `visit.test.ts` "chargeableRows price" |
| `chargeableRows` keeps priced and null-price rows | same |
| `UNBILLED_BOOKING_WHERE` adds `not exists (active fin_product, unit_price = 0, id = coalesce(b.product_id, event type product))` | `pos-accounts-list.test.ts` "never counts a service whose resolved catalog price is exactly 0" |

Expected FACES effect after deploy: badge 285 -> ~174.

## Completion flow check

`POST /api/scheduling/bookings/[id]/complete` only sets status `completed` and realizes stock
accruals; it needs no ticket line. A price-0 control completes without a 0 charge.

## Out of scope

The ~143 past priced unbilled appointments (proposal §1 steps 2-3), linking unlinked ticket
lines, and any change to price resolution or the Accounts UI.

## Verification

Targeted vitest on `visit.test.ts`, `pos-accounts-list.test.ts`, `pos-service-boundaries.test.ts`;
`bun run check`; prettier. Post-merge: re-run the proposal §1 count on FACES; badge ~174.

## Open ends

- Ungrouped fallback in `visitRows` carries `price: null`, so a price-0 booking with no visit
  group would still show Charge in the drawer while SQL excludes it (handoff TODO in the hub PR).
