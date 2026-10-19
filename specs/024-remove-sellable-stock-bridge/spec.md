# Feature Specification: One stock path per sellable — retire the hidden 1:1 stock bridge

**Feature Branch**: `spec/024-remove-sellable-stock-bridge` | **Repos & PR bases**: minion_hub → `master` (`feat/remove-sellable-stock-bridge`) · minion-meta → `dev`

**Created**: 2026-10-17 | **Status**: Approved (owner: "ok, begin implementation. Lmk when its live") | **Tags**: logic, data (prod data migration, reversible) | **Human gates**: hub master review-merge (applies the migration on the production build)

**Input**: Owner, 2026-10-17, on `/pos/catalog` → BC "Bioestimulador de Colageno", Type Product → Service:
"A product with a linked stock item can't become a service. Unlink or retire the item first." — "What doesnt make sense to me is that services also have linked stock consumptions. This error isn't making sense for me or the users." Then: "the hidden 1:1 link is a troublesome rule that only adds complexity … the service product type adding functionality to the item (makes the row a schedulable event). A product is simply a sellable item."

## AS-IS (evidence: hub `origin/master` 1a102611, prod FACES 2026-10-17)
A sellable reaches stock two ways:
1. **Recipe** — `stk_consumption` rows (visible as "Supply consumption"; any kind).
2. **Bridge** — `stk_items.fin_product_id = fin_products.id` ("the product IS this item"); never shown in the sellable form.

- `updateSellable` (pos.service.ts ~2919) refuses product→service when a bridge exists (`kind_has_stock`) — the error names a link the operator cannot see.
- At issue time the recipe outranks the bridge (`explodeLineForIssue` ~769); the bridge only fires for a product with NO recipe.
- Other bridge readers: catalog row query `sellableMergeSql` (left join + stock badge), `createSellable` (creates/publishes a bridged item; one item ↔ one product via `stk_items_org_fin_product_uniq`), `item-cost.service.ts` `loadProductRoots` (fallback cost), `stock.service.ts` `buildInvoiceIssuePreview` (1:1 invoice fallback), `tag-links.service.ts` `getProductIngredientTags` (bridge item's descendants; own tags excluded), `CompositionEditor`/`composition.ts` (a product composes through its bridge item's BOM; no bridge ⇒ cannot compose).
- Prod: 13 bridges, all on FACES products (= every product). 8 also list the same item in their recipe, 1 has a recipe of other items, 4 are bridge-only (EU Eudaria, FAJG Faja G, JIEU Jabón Íntimo Eudaria, SENS Sensiclean — all `Unidad`, no consumption uom, 0 on hand). 0 bridged items carry BOM components; 0 event types point at products.

## TO-BE
- **Model**: a sellable reaches stock ONLY through its recipe. `kind` is a label: **product** = sellable; **service** = sellable + schedulable (event type, bookings). Kind flips freely; the only remaining kind rule is I2 (a service composed of services cannot become a product).
- Selling 1 unit deducts exactly the same items and quantities as before the change, for every product (invariant **INV-1**).
- Creating a product: "new tracked item" creates a stk_item (no bridge) + recipe row (item × 1 stock unit); "existing item" adds a recipe row (item × 1 stock unit). One item may back many sellables.
- A product's composition (CompositionEditor) is its recipe — same rows and write path as a service; the item-BOM write path from a product parent is gone (item BOM stays editable on the stock item page).
- Recipe qty is in the item's consumption uom: "1 stock unit" = `units_per_stock_uom` (null ⇒ 1).

## DELTA
| # | Change | Proof |
|---|---|---|
| D1 | Migration `supabase/migrations/20261017120000_retire_sellable_stock_bridge.sql`: backup table of the 13 links; insert recipe row (item × coalesce(units_per_stock_uom,1)) for bridge-only products; null `stk_items.fin_product_id`; assert INV-1 (no product loses its only stock path) | Dry-run against prod in a rolled-back tx: 4 inserted, 13 cleared, assertion passes; re-run = no-op |
| D2 | `pos.service.ts`: drop bridge from issue resolution, catalog query (`itemId` removed from `SellableRow`), `deriveSellableFacts`, `createSellable` (recipe row instead), `updateSellable` (no `kind_has_stock`; `trackStock:true`/`uom` on update ⇒ typed 400 `stock_via_consumption`) | `pos.sellables.test.ts`, `pos.tickets.test.ts` |
| D3 | `item-cost.service.ts`, `stock.service.ts` (invoice preview), `tag-links.service.ts`: recipe only | their unit tests |
| D4 | `composition.ts` + `CompositionEditor.svelte`: product parent writes consumption; BOM branch removed | `composition.test.ts`, `CompositionEditor.test.ts` |
| D5 | `SellableWizard.svelte`: no "kind locked" note, existing-item picker lists every item; i18n `pos_catalog_kind_has_stock` copy retired | svelte-check, wizard tests |

## Out of scope / open ends
- Dropping the `stk_items.fin_product_id` column + `stk_items_org_fin_product_uniq` index — follow-up migration once a release has run without readers (TODO(handoff) in migration).
- Changing an item's `units_per_stock_uom` later rescales every recipe that uses it (already true for all recipes; now also for the 4 converted products).
