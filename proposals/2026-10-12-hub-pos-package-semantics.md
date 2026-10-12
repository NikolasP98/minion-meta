---
id: 2026-10-12-hub-pos-package-semantics
title: POS packages — grant each included item, never duplicate the base service's consumption
status: draft
created: 2026-10-12
updated: 2026-10-12
repos: [minion_hub]
tags: [logic, data, ui]
value: 7
effort: S
source: hub-batch-2026-10-12-assistant-onboarding-notif
---

# POS packages — what a pack is made of, and what its sale deposits

## Owner ask (verbatim, 2026-10-12)

> "FACES has a product called 'Afinamiento de Rostro (completo)' which is basically a package
> of another product 'Afinamiento Facial (individual)'. The idea is that paquetes are
> essentially selling you packs of something. If you include a service that consumes a stock
> item, don't add it to the pack's consumption, it should remain on the added base service.
> The customer should have each individual item deposited into their 'account'. Packs can
> contain services and prodcuts/stock items."

> "this insumos column in pos/catalog makes NO sense to me. Remove it or improve it. Make it
> more descriptive or purposeful."

## AS-IS (verified in `origin/master` @ `f6b33d13`)

- A sellable is a `fin_products` row. `kind` is derived: `bundle` when it has
  `fin_product_components` edges, `product` when a `stk_items` row bridges it, else `service`
  (`pos.service.ts` `mapSellableRow`).
- A pack's **service** lines live in `fin_product_components` (child product + qty = sessions).
  A pack's **product** lines live in the pack's own `stk_consumption`
  (`composition.ts` `writePathFor('service', 'product') === 'consumption'`).
- Selling a pack line already mints **one grant per `fin_product_components` edge**
  (`pos.service.ts` ~L1477 → `pos-packages.service.ts` `createGrantsForTicketLine` →
  `allocateGrants`), with `sessionsTotal = edge.qty × line.qty`. So "each individual item
  deposited into their account" was ALREADY true for service lines.
- Delivery-time consumption already runs through the **base service**: booking a granted
  session books `sched_bookings.product_id = ` the base service, and `accrueForBooking`
  (`scheduling-bookings.service.ts`) accrues that product's own `stk_consumption`.
- `resolveIssueLines` (`pos.service.ts`) explodes a sold line through the sellable's OWN
  `stk_consumption` (recipe) else its 1:1 `stk_items` bridge, then through the stock BOM
  (`loadComponentGraph` → `listAllComponentEdges` = `stk_item_components` ONLY). Package edges
  are NOT in that graph, so **a pack sale never explodes an included service's recipe** — no
  change was needed there.
- **The actual defect**: nothing stopped a pack from ALSO declaring, as its own
  `stk_consumption`, an insumo that one of its included services already consumes. FACES
  SKU-AF1 does exactly that (6 ml Acido Desoxicolico, which SKU-AF2 also consumes), so the
  6 ml is issued at the counter when the pack is sold AND again when a session is delivered.
- `/pos/catalog` had an `Insumos` column rendering a single green dot (`mapping-dot`,
  `s.hasMapping`, key `pos_catalog_col_mapped`) — a boolean with no information.

## TO-BE

Invariants:

1. **A pack's own `stk_consumption` is only what it hands over at the counter.** It may never
   contain an item consumed by one of its included services; that insumo belongs to the base
   service and is issued when a session is delivered.
2. **A pack sale deposits each component separately** — one grant per service edge (existing
   shape, `pos_package_grants.serviceProductId` + `sessionsTotal`). Product lines are *not*
   granted: the grant table has no product shape, and a physical product handed over at the
   counter is issued at sale. This is a deliberate choice, not a gap.
3. **`/pos/catalog` says what a row is MADE OF**, in words.

## DELTA

| Transition | Where | Proof |
|---|---|---|
| New pack consumption line duplicating an included service's insumo → refused (409 `package_service_consumption`) before any write | `pos.service.ts` `updateSellable` + `itemsConsumedByIncludedServices`; pure rule `blockedPackageConsumption` in `src/lib/components/pos/composition.ts` | `composition.test.ts` (4 cases), `pos.sellables.test.ts` (2 cases incl. "refused whole — no product field written") |
| Pre-existing duplicates stay editable (only NEW items are blocked) | same | `pos.sellables.test.ts` keeps the existing replace-set tests green |
| Pack sale mints one grant per component | unchanged code, pinned | `pos.packages.test.ts` "deposits EACH included service separately" (2 edges → 2 allocations) |
| `Insumos` green dot → `Composición` text cell | `(app)/pos/catalog/+page.svelte`, `lib/tables/defs/index.ts`, `compositionSummary()` | `composition.test.ts` (5 cases) |
| Row data for the cell comes from the existing page load | `sellableMergeSql` gains ONE correlated aggregate (`package_sessions`); `consumed_item_names` was already selected for taxonomy and is now exposed as `SellableRow.consumedItemNames` | no per-row fetch; `pos.sellables.test.ts` exact-shape test updated |
| Existing FACES data cleaned | `scripts/clean-package-duplicate-consumption.ts` (dry-run default, `--apply`, re-reads the invariant after deleting) | NOT run — owner runs it |

Column copy: pack → `Paquete · 4 ses. + 1 prod.`; one insumo → that insumo's name; several →
`3 insumos`; stock-bridged with no recipe → `Stock`; nothing → `—`.

## Open ends (`TODO(handoff)` pointers)

1. **Historical grant backfill.** `pos_package_grants` rows also carry `packageProductId`, and
   `/pos/accounts` reads it. Nothing was migrated. If a pack sold before per-component grants
   existed left only a pack-level grant, it still reads as one lump.
   `TODO(handoff)` at `src/server/services/pos-packages.service.ts` `createGrantsForTicketLine`.
   Deliberately out of scope: the accounts page depends on the current read.
2. **Product-line delivery timing.** A pack's product lines are issued at SALE. If a clinic
   ever wants "6 ml deposited to the client's account, drawn down over visits", that needs a
   product-shaped grant (`posPackageGrants.serviceProductId` is service-only today) — a schema
   change, not a tweak. `TODO(handoff)` at `src/lib/components/pos/composition.ts`
   `blockedPackageConsumption`.
3. **`createSellable` is not guarded.** A brand-new sellable cannot yet have package edges
   (components are added after it exists), so the guard lives only in `updateSellable`. If a
   create path ever accepts components + consumption in one call, it needs the same check.
4. **The composition picker still offers blocked items.** `candidatesFor` only knows sellables
   + items, not which insumos the included services consume, so the pack editor lets you pick
   one and the server toasts the refusal. A pre-filtered picker needs the blocked set in the
   page load.
5. **The `Composición` column is still inside the `stockEnabled` branch**, so an org with stock
   disabled sees no pack summary. Left as-is to keep the diff to the column's content.
6. **`scripts/clean-package-duplicate-consumption.ts` has not been run** against production.
   FACES SKU-AF1 keeps double-issuing its 6 ml until the owner runs it with `--apply`.
