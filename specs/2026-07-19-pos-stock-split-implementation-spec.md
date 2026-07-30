# POS ⇄ Stock Split — Implementation Spec (tasks #10–#13)

**Date:** 2026-07-19 · **Status:** SPEC → implementing · **Branch:** hub `dev`

**Goal:** Realize the user's module boundary — **stock owns raw materials (leaf items) + the supply side; POS owns composition, consumer price, and what's publishable to the sell page.** The boundary is *leaf-ness*, not the table. `/stock/items` does **not** move.

> "*the building blocks live in the stock module while the sellables, which might include the raw ingredients themselves, should be built and managed via the POS module*" · "*Items for sale are NOT restricted to predetermined recipes; the POS section can publish raw ingredients, recipes, and composed recipes.*"

**Prerequisite for #5 (the DAG):** this spec deliberately does NOT build nested composition. It closes capability gaps and settles issue-precedence so #5 has a clean base.

---

## Findings that shape the work

1. **`createSellable`/`updateSellable` already accept `consumption` for ANY kind** — no kind check server-side. The service is already correct; only `SellableWizard` gates on `kind === 'service'`, and `resolveIssueLines` only fans out recipes for service lines. ⇒ #11 is a UI + issue-resolution change, **no sellable-service change**.
2. **`kind` is DERIVED** (`pos.service.ts:654`): `product` iff a `stk_items` row links via `fin_product_id`. Publishing an existing item therefore *automatically* makes a sellable product-kind — no `kind` field to set.
3. **`stk_items.fin_product_id` has NO unique constraint.** `resolveIssueLines` builds `itemByFinProductId` from a plain select — two items claiming one product silently yields an arbitrary winner. Today 7 items → 7 distinct products (no violation), but #10 makes collisions user-reachable.
4. **`NewItemInput = Omit<stkItems.$inferInsert, …>`** — adding schema columns extends the service input type automatically. #12 needs no service signature change.
5. Both forms hand-roll `<input class="inp">` with `--color-bg3`, `1.75rem` heights, `--font-size-*` literals. `Input` (`@minion-stack/ui`) + `FormField`/`FormFieldset` (`ui/foundations`) already exist.

---

## ★ Issue-precedence rule (the one real semantics decision)

A sellable can have (a) its own tracked item via the bridge, (b) a `stk_consumption` recipe, or both. Rule, applied in `resolveIssueLines` **and** kept consistent with `item-cost.service`:

| Shape | Resolution |
|---|---|
| Recipe referencing OTHER items | **Real recipe → explode it**; ignore the bridge (ingredients are consumed *instead of* the finished good) |
| Recipe referencing ONLY the product's own item (self-map) | **Not a recipe — a qty multiplier on the bridge.** Issue `qty × qtyPerUnit` of that item |
| No recipe | Bridge 1:1 (`qty × 1`) |
| Neither | Issues nothing (unchanged) |

Rationale: an authored recipe outranks the implicit 1:1 default, and this makes cost and issue agree (cost already lets recipe win).

> ✅ **Hialuronidasa semantics confirmed 2026-07-22.** `fin_products.code='H'` consumes **10 mL per procedure** from item `1262`; one stocked `Unidad` is a **15 mL vial**, so the authoritative stock issue is `10 / 15 = 0.6667` vial per procedure. Keep `qty_per_unit=10`, set `consumption_uom='mL'` and `units_per_stock_uom=15`, and ensure POS sends the mapped quantity as `qtyConsumption` so the shared stock service performs the conversion. Historical ledger/bin quantities remain in stock UOM and are not rewritten.

---

## Constraints (repo law — copy verbatim)

- hub = `bun`. TS strict, no `any`. Svelte 5 runes only.
- **UI governance:** invoke `ui-design-governance` before any `.svelte` edit; semantic tokens only; `Input`/`FormField` over native inputs; after edits run `bun run lint:design && bun run lint:tokens` (changed-file debt may only DECREASE).
- **RLS:** new columns inherit existing `stk_items` policy; migration is `supabase/migrations/<ts>_*.sql` + Drizzle table edit. **NEVER `db:push`.**
- **RBAC:** stock writes stay `stock:edit/create`; POS writes stay `pos:edit`. No capability moves — publishing an item as sellable is a POS act on a fin_product, item *definition* edits stay stock-gated.
- **i18n:** new strings via `m.*()` + `bun run i18n:compile`.
- **Commits:** `git commit -m "…" -- <explicit paths>` ONLY (co-agent shares the index); `-c commit.gpgsign=false` if 1Password stalls.

---

## Task #11 — Recipe on any sellable kind

- [ ] `SellableWizard.svelte`: change `{#if kind === 'service' && stockEnabled}` → `{#if stockEnabled}` (markup) and `if (kind === 'service' && stockEnabled)` → `if (stockEnabled)` (submit). Recipe section becomes available to both kinds.
- [ ] `pos.service.resolveIssueLines`: implement the precedence table above. Product-kind lines gain the recipe branch; self-map detected as `mapping.length === 1 && mapping[0].itemId === bridgeItemId`.
- [ ] Extend `pos.tickets.test.ts`: (a) product with a real recipe explodes to ingredients not itself; (b) self-map issues `qty × qtyPerUnit`; (c) product with no recipe still 1:1; (d) service unchanged.

## Task #10 — Publish an existing raw material as sellable

- [ ] Migration `<ts>_stk_items_fin_product_uniq.sql`: partial unique index `(org_id, fin_product_id) where fin_product_id is not null`. **Pre-flight**: verify 0 violations before applying (currently 7→7 distinct, clean).
- [ ] `SellableInput` gains `itemId?: string` (link an EXISTING item) — mutually exclusive with `trackStock` (which creates a new one). `createSellable`: when `itemId` present, `updateItem(ctx, itemId, { finProductId: product.id })` instead of `createItem`. Reject if that item already links elsewhere (`PosError('item already published', 'item_taken')`).
- [ ] `/api/pos/sellables` POST passes `itemId` through.
- [ ] Wizard: a **Source** `SegmentedControl` — `Service` · `New tracked item` · `Existing item`. "Existing item" reveals a `Combobox` of stock items **not already linked** (needs `stockItems` to carry `finProductId`; extend `listItems` projection or filter client-side against `sellables`).
- [ ] Test `createSellable` with `itemId`: links, and a second attempt on the same item throws `item_taken`.

## Task #12 — Stock supply-side fields

- [ ] Migration `<ts>_stk_items_supply.sql`: `alter table stk_items add column moq numeric, add column default_supplier_party_id uuid;` (+ index on `default_supplier_party_id`). Soft ref → `parties`, no FK (cross-module convention, same as `stk_items.fin_product_id`).
- [ ] Drizzle `pg-schema/stock.ts`: `moq`, `defaultSupplierPartyId`. `NewItemInput` picks them up automatically.
- [ ] **Restock cost is DERIVED, not stored** — last receipt rate from `stk_ledger` (`qty_delta > 0`, latest `posted_at`). Add `lastRestockCost` to the items read; do NOT add a column.
- [ ] `/stock/items` table: MOQ (editable) + Supplier + Last restock cost (read-only, right-aligned, `—` when never received).
- [ ] `/api/stock/items/[id]` PATCH accepts `moq`, `defaultSupplierPartyId`.
- [ ] Supplier picker sources `parties` (the existing spine) — reuse whatever party picker POS/CRM already uses; do not build a new one.

## Task #13 — UI governance cleanup (do LAST — touches the same files)

- [ ] `SellableWizard.svelte` + `stock/items/+page.svelte` create modal: replace every `<input class="inp">` with `Input`; wrap in `FormField` for label+error. Delete `.inp`/`.fld` styles.
- [ ] Replace the hand-rolled `.kind-toggle` Button pair with `SegmentedControl` (governance: active = accent-TINTED pill, never full-fill primary).
- [ ] Purge `--color-bg3`, `--color-destructive`, `--color-muted-foreground`, `1.75rem`, `0.5rem`, `--font-size-*` literals → semantic tokens / `.t-*` roles.
- [ ] Gates: `bun run lint:design && bun run lint:tokens`; changed-file debt must DECREASE.

## Order

**#11 → #10 → #12 → #13**, each its own commit. #13 last so forms are cleaned once, after #10/#11 have reshaped them.

## Out of scope (→ #5)

Nested composition, `stk_item_components`, recursive cost/explosion, order-line modifiers. This spec keeps the flat 1-level model and only fixes *who owns what* + *which path wins*.
