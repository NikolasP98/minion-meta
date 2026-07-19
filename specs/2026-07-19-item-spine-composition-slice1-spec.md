# Item Spine — Composition Graph + Cost Rollup (Slice 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Date:** 2026-07-19 · **Status:** SPEC (not started) · **Author:** orchestrator

**Goal:** Give items the same *moldability + traceability* the party spine gave people. Two things, in cost order: (1a) **cost/margin rollup** — "what does this service actually cost me, and what's my margin?" — with **zero schema change**; (1b) an additive **item-composition graph** so a sellable can be built from other items (bundles, packages, kits) and its cost rolls up recursively.

**Non-goals (Slice 1):** No new `items` spine table. No migration of `stk_consumption`'s existing consumers. No UI beyond a read-only cost/margin surface. Provider-agnostic sellables (things sold but never SUSII-synced) are deferred — see §Convergence.

---

## Findings (recon — read before planning)

The "item spine" the user intuited **already exists in embryo**. The stock schema calls it the *"catalog triangle"*:

```
sched_event_types.product_id ─┐
                              ├──► fin_products ◄── stk_items.fin_product_id
stk_consumption.fin_product_id┘        (soft FKs, exactly like *_id → parties)
```

1. **`stk_consumption` is already a flat, one-level BOM.** `(org_id, fin_product_id, item_id, qty_per_unit)`. "Selling 1 of this product consumes `qty_per_unit` of this material." Read in **three** places — do not break them:
   - `pos.service.ts` (POS ticket → stock **issue** lines; `qty × qtyPerUnit` fan-out).
   - `stock-accruals.service.ts` (booking → expected-consumption **accrual**).
   - `routes/api/gateway/query/stock/+server.ts` (agent tool read).
   Written by `pos.service.ts` `setConsumption` on product create/update.

2. **No cost or margin logic exists anywhere.** (`grep margin|cost-roll|unitCost` → only CSS in email templates.) Material cost lives as `stk_bins.valuation_rate` per `(item, warehouse)`. **`stock-accruals.service.ts` already snapshots it** the right way: pick the org **default warehouse**, read `stk_bins.valuation_rate`, convert consumption→stock qty via `consumptionToStockQty(item, qty)`. Slice 1a copies this exact path — no new valuation math.

3. **The self-graph's node table already exists and is NOT provider-coupled.** `stk_items` has `is_stock_item boolean` — a `false` item is a non-material node (a service/bundle). Its identity is `(org, code)`, hub-native (not the SUSII `code` that keys `fin_products`). So `stk_items` — not `fin_products` — is the correct composition spine. Cycle-guarding is already solved: `stock.logic.ts` exports `wouldCreateCycle()` (used for the warehouse tree) — reuse it verbatim.

4. **The two sub-features have wildly different cost:**
   - **1a Cost rollup (flat):** a pure read over `stk_consumption` + `stk_bins`. ~40 lines, **zero migration**, ships margin-per-service for every already-mapped product immediately.
   - **1b Recursion (bundles):** needs one additive table + a recursive rollup. Earns its keep specifically for packages ("3-session pack") and supplier-swap moldability.

   → Ship 1a first as its own PR. It delivers most of the "traceability" value with none of the schema risk.

---

## Global Constraints (copy verbatim from repo convention)

- **Package manager:** hub = `bun`. TypeScript strict; no `any`, no `@ts-nocheck`.
- **RLS shape:** every org table has `org_id text not null`; policy `using/with check (org_id = current_setting('app.current_org_id', true))`; `grant select,insert,update,delete … to app_ledger`; `enable` + `force row level security`. All org-scoped writes go through `withOrgCore(ctx, tx => …)` (`$server/db/with-org-core`).
- **Migrations:** hand-written `supabase/migrations/<ts>_*.sql` at meta-repo companion + a Drizzle table file. **NEVER `db:push`** the core DB.
- **RBAC:** any new mutating endpoint calls `requireOrgCapability(locals, 'stock', <action>)` (composition edits are a `stock` sub-capability — reuse, don't invent a module) and `/api/…` write prefix is in `API_WRITE_PREFIXES`. Read-only cost surface still gates its route view via the existing stock/finance path guard.
- **Money is `numeric`** (string in JS). Round via `round4()` from `stock.logic.ts`.
- **Tests:** vitest, focused (`bun run vitest run <path>`). Pure rollup math is unit-tested; no fixtures.
- **UI (if any):** invoke `ui-design-governance` skill first; semantic tokens only; `bun run lint:design && lint:tokens` after.

---

## Slice 1a — Cost / margin rollup (NO schema change)

Pure read. A product's cost = Σ over its `stk_consumption` mappings of `qtyPerUnit` converted to stock qty × the material's default-warehouse bin rate. Margin = `fin_products.unit_price − cost`.

### Task 1a.1 — `productCost()` service read
**Files:** Create `src/server/services/item-cost.service.ts`. (Reuse, don't duplicate, the accrual cost snippet.)
- [ ] `costForProducts(ctx, finProductIds: string[]): Promise<Map<string, { cost: number; lines: {itemId; qty; rate; value}[] }>>`.
- [ ] Resolve default warehouse via `defaultWarehouseTx` (already exported/used by accruals). If none → cost `0`, mark `costable: false` (don't fail).
- [ ] Batch: one `stk_consumption` select `inArray(finProductId)`, one `stk_items` select (`unitsPerStockUom`), one `stk_bins` select at the default warehouse. Compute `qty = consumptionToStockQty(item, qtyPerUnit)`, `value = round4(qty × rate)`. Sum per product.
- [ ] Unknown item / no bin → rate `0` + a `partial: true` flag on that product (so the UI can say "cost incomplete", never silently understate margin).

### Task 1a.2 — expose on the products/finance read
**Files:** Modify `src/server/services/finance-products.service.ts` list/detail (or wherever the products table loads).
- [ ] Fold `cost`, `margin = unitPrice − cost`, `marginPct`, `costable`/`partial` into the product row DTO.
- [ ] **Field-level RBAC:** cost & margin are sensitive — mask via `shouldMaskSensitive(locals, 'finances')` (or the module that owns the products view) exactly like other cost/PII fields. Do NOT ship an unmasked margin column.

### Task 1a.3 — read-only margin surface
**Files:** the existing products/catalog table `.svelte`.
- [ ] Add `Cost` + `Margin %` columns (masked per 1a.2). `partial`/`!costable` → a muted "—" with tooltip, never a fake `0`.
- [ ] Unit test the rollup math (`item-cost.service` pure helper): a product mapped to 2 materials returns Σ; unmapped → `{cost:0, costable:true, lines:[]}`; missing bin → `partial:true`.

**Ship 1a as its own PR to `dev`.** Stop here and report margins before touching schema.

---

## Slice 1b — Item-composition graph (recursion / bundles)

Additive. One self-referential edge over `stk_items`; a composite is a `stk_items` row with `is_stock_item=false` and children.

### Task 1b.1 — migration + Drizzle table
**Files:** Create `supabase/migrations/<ts>_stk_item_components.sql` + `src/server/db/pg-schema/stock.ts` addition.
```
stk_item_components(
  id             uuid pk default gen_random_uuid(),
  org_id         text not null,
  parent_item_id uuid not null references stk_items(id) on delete cascade,
  child_item_id  uuid not null references stk_items(id) on delete restrict,
  qty            numeric not null,          -- child qty per 1 parent, in child's consumption uom
  kind           text,                      -- 'material'|'service'|'fee' (display grouping; emergent, nullable)
  note           text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, parent_item_id, child_item_id)
)
-- idx (org_id, parent_item_id); RLS org_guc; grants to app_ledger.
```
- [ ] Full RLS/grants block (copy `stk_consumption.sql` verbatim, rename).
- [ ] `parent_item_id = child_item_id` rejected at the service (not a CHECK — cycle logic lives in `stock.logic.ts`).

### Task 1b.2 — pure recursive rollup + cycle guard (`stock.logic.ts`)
- [ ] `rollupItemCost(rootId, edges: Map<parent, {childId, qty}[]>, leafRate: (id)=>number, seen=Set): number`. Leaf (no children) → `leafRate(id)`. Composite → Σ `edge.qty × rollupItemCost(child, …)`. `seen` guards cycles → throw/skip (mirror `wouldCreateCycle` semantics).
- [ ] `wouldCreateCycle` already exists for the warehouse tree — reuse it on component add (parent/child are the graph nodes).
- [ ] Unit test: 3-level chain sums; a cycle is refused; qty multiplies down the tree.

### Task 1b.3 — component CRUD service + endpoint
**Files:** extend `stock.service.ts`; route under existing `/api/…/stock/…` write prefix.
- [ ] `listComponents(ctx, parentId)`, `setComponent(ctx, {parentId, childId, qty, kind})` (upsert on the unique key, cycle-checked), `removeComponent(ctx, id)`.
- [ ] Extend `item-cost.service` (1a): if a product's bridged `stk_item` (`fin_products.id → stk_items.fin_product_id`) has components, roll up via the graph instead of the flat `stk_consumption` sum. Fall back to flat when no graph node exists.

### Task 1b.4 — minimal compose UI (defer if time-boxed)
- [ ] On the item detail: a components sub-list (add child item + qty). Reuse the existing consumption-map editor component if one exists — check `pos.service` product editor before building new.

---

## Convergence (Slice 2 — NOT now, named so 1b doesn't paint us in)

`stk_consumption` (fin_product→material) and `stk_item_components` (item→item) are the **same relation** once every sellable service has a `stk_items` mirror (`is_stock_item=false`, `fin_product_id` set). Slice 2 = backfill those mirrors, teach POS-issue + accruals to expand the graph, then retire `stk_consumption` to a compatibility view. Do this **only** when a provider-agnostic sellable (a bundle sold but never SUSII-synced) actually exists — until then the soft-FK-to-`fin_products` shape holds, same as facets hanging off `parties`. YAGNI gate, explicit.

## Traceability payoff (mirrors the party merge)

Follow-up (own slice): a catalog **merge service** — the `party.service.ts` analog — collapses a material typed N ways across `fin_invoice_items.description`/`stk_items.code` into one item; every invoice line + ledger row + component edge follows the merge (as "chats follow identity move"). That's the item-side of the party dedup and the other half of "moldable."
