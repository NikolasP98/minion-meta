---
id: 2026-10-10-hub-catalog-service-unification-spec
title: Catalog is the only list of services — stored kind, one composition, auto-scheduled services, products on events
stage: dev
status: implementing
pass: 1
created: 2026-10-10
updated: 2026-10-10
repos: [minion_hub]
tags: [data, ui, billing]
proposal: 2026-10-10-hub-catalog-service-unification
type: feature
owner_ask: "its time to UNIFY the catalog items with the SERVICES to avoid this mismatch. Every item in the catalog with type SERVICE should automatically appear on the SERVICE list. Also, allow products to be added to events as well (events need at least 1 service item, however). Catalog item type (Service vs. Product) should be a manual SELECT-type picker. Service-types should get their own schedule-able event and can be composed of products and/or other services. The Product-types can only be composed by one or more products. The catalog is just a recipe book."
---

# Catalog is the only list of services

## 0. Product

In the owner's words: the catalog is a recipe book. Every entry is a **service** or a
**product**, chosen by the operator. A service is schedulable the moment it exists and can be
composed of products and/or other services; a product can only be composed of products. The
appointment drawer's "Agregar servicio" lists exactly the active catalog services, by their
catalog name, and an appointment can also carry products (never products alone).

Trigger: FACES could not find "Lip Sculpt (Saypha Volume)" in the picker because its
scheduling row was still titled "Labios Sculpt - Saypha Volume". Full diagnosis in the
proposal.

## AS-IS (2026-10-10, hub `origin/master` `30c6e07d`; prod org FACES `21e0601b…`)

**Kind is derived, not stored.** `sellableMergeSql` in `src/server/services/pos.service.ts`
left-joins `stk_items` on `fin_product_id` and `fin_product_components`; `SellableRow.kind` is
`bundle` when components exist, `product` when a stock item is linked, else `service`.
`updateSellable` refuses a `kind` patch with `kind_derived` (anchor: the comment "kind is
derived by design"). The wizard (`SellableWizard.svelte`, `source` SegmentedControl:
`service | new-item | existing-item`) chooses kind indirectly through stock linkage. The table
cell for `kind` is a read-only Badge (`pos/catalog/+page.svelte`, `col.key === 'kind'`).

**Composition is two editors on two tables.** The expanded row (`expandedContent` snippet)
mounts `PackageEditor` (service children in `fin_product_components` + validity days in
`fin_products.metadata.packageValidityDays`, REST `GET|PUT /api/pos/sellables/[id]/components`)
and, only when a stock item is linked, `RecipeEditor` (stock BOM, `/api/stock/items/[id]/components`).
A service's insumo consumption (`stk_consumption`, "AH Insumo" tag, `has_mapping`) is a third
relation, written by the wizard's `consumption[]` and `setConsumption` in `stock.service.ts`,
and realised on booking completion.

**Services and scheduling rows are independent.** `sched_event_types` (`pg-scheduling-schema.ts`)
has its own `title`, `active`, `slug`, `length`, buffers, `useCustomSchedule`, `color`,
`kindId`, `productId` (soft link, nullable, no uniqueness), and an M:N assignee table
`sched_event_type_resources`. `upsertEventType` / `listEventTypes` in `scheduling.service.ts`.
The Services page (`/scheduling/event-types`, `service-rows.ts`) shows the union: catalog
services (by catalog name) flagged by whether a row exists, plus orphan rows. `createSellable`
and `updateSellable` never touch scheduling. Prod FACES: 49 active services, 4 without a
scheduling row, 25 active rows on retired services, 9 title mismatches, all 70 rows 15 min and
all assigned to one resource (Milagros); 10 active resources; only one org has rows.

**Appointment = visit of service bookings.** `sched_bookings.event_type_id` NOT NULL, FK
restrict; a visit is bookings sharing `metadata.groupId` (`booking-groups.ts`). The drawer
(`BookingDetailDrawer.svelte`) lists members as "Servicios"; `openAdd()` fetches
`/api/scheduling/event-types`, filters `active !== false`, searches `title`. Add/remove go to
`POST /api/{scheduling/bookings|pos/appointments}/[id]/group` with `{addEventTypeId}` /
`{removeService:true}` (`_handlers.ts` `groupBodySchema`; `addServiceToVisit` in
`scheduling-bookings.service.ts`; `removeService` is a hard delete refused with 409
`referenced` when a ticket/order/accrual points at it; the last member is NOT protected).
Charging: `dispatchSellChargeHandoff` (`sell-charge-handoff.ts`, `SellChargeLine
{bookingId, productId, title}`, v2 blob in localStorage) → `/pos/sell` pre-fills service
lines; `pos_ticket_lines.booking_id` links them; the pending tray and account ledgers filter
`kind = 'service'`.

## TO-BE

**Invariants**
- I1 `fin_products.kind ∈ {service, product}` is stored and operator-chosen. `bundle` is not a
  kind: a service whose components include a service is captioned "Paquete" and keeps the
  package machinery (grants/redemptions) unchanged.
- I2 Composition rule: a service may contain products and services; a product may contain
  products only. Self-containment and cycles are refused.
- I3 For every active catalog service there is exactly one scheduling row with
  `product_id = fin_products.id`, `active = true`, `title = fin_products.name`. A retired
  service's row is inactive. No new row is created without a product (orphan rows are
  legacy, read-only).
- I4 A visit has ≥ 1 service member at all times. Product lines belong to the visit's anchor
  booking and are deleted with it.
- I5 Stock moves only when a ticket is submitted (unchanged); product lines on an event are a
  plan, not a movement.

**Unchanged**: ticket posting, package grants, consumption realisation, calendar layout,
public booking links, reminders, RBAC gates (`pos:edit` on the POS twin, `scheduling:edit`
on the scheduling twin).

## DELTA

| # | Transition | Slice | Proof |
|---|---|---|---|
| D1 | `kind` column added + backfilled from the derivation; `SellableRow.kind` reads it | S1 | migration assert + `pos.sellables.test.ts` |
| D2 | Wizard + table edit `kind` via Select; kind change validated (I2, stock link) | S1 | component test + API 400 cases |
| D3 | Expanded row = one Composición list + one picker filtered by parent kind | S2 | `composition.svelte.test.ts` |
| D4 | createSellable(service) ⇒ scheduling row from org template | S3 | service test |
| D5 | updateSellable name/active/kind ⇒ write-through to the row | S3 | service test |
| D6 | Backfill migration syncs titles/active and creates missing rows, idempotent | S3 | migration run twice + invariant query |
| D7 | Services page "Agregar servicio" ⇒ catalog wizard; editor loses title/active | S3 | route test |
| D8 | `sched_booking_products` + drawer "Productos" section | S4 | API + component tests |
| D9 | Last service cannot be removed (409 `last_service`) | S4 | handler test |
| D10 | Handoff v3 carries product lines; cart pre-fills; paid state shown | S4 | handoff unit test + sell page test |

## Slices

### Slice 1 — Stored kind with a Select (hub, migration `20261010120000_fin_products_kind.sql`)

**Topics:** `data`, `migrations`, `ui`

1. Migration: `alter table fin_products add column kind text not null default 'service'
   check (kind in ('service','product'))`; backfill `kind = 'product'` where a `stk_items`
   row links the product. A product with service components after backfill cannot exist
   (bundles have no stock item), assert that in the migration. Drizzle schema + seed updated
   (`seed-unaffected` is NOT acceptable here: the QA seed creates products).
2. `sellableMergeSql` selects `p.kind`; `SellableRow.kind` = `p.kind`; a new boolean
   `isPackage` = has service components (replaces the `bundle` kind at the type level; the
   catalog badge shows the kind, with a "Paquete" caption when `isPackage`). Every consumer
   of `kind === 'bundle'` migrates to `isPackage` (grep the hub; PackageEditor, sell cart,
   catalog board, pickers).
3. `createSellable` writes `kind` from the input. `updateSellable` accepts a `kind` patch:
   product → service allowed only when no stock item is linked (else 400 `kind_has_stock`:
   "unlink or retire the stock item first"); service → product allowed only when it has no
   service components (400 `kind_has_services`). Existing bookings on a service flipped to
   product are history and stay valid; its scheduling row is simply deactivated (Slice 3).
4. Wizard: the `source` SegmentedControl becomes a `kind` Select (Servicio / Producto); for
   Producto the existing stock options (new item / existing item / no tracking) appear
   beneath. Table: the `kind` cell becomes an inline Select (`DataTable` `select` editing)
   with the two options; failures surface the typed 400 message.
5. Out of scope: changing `trackStock`/`uom` (existing TODO(handoff) stays).

**DoD:** migration applied on the QA stack and `bun run qa:reset` green; `bun run check` 0/0;
`vitest src/server/services/pos.sellables.test.ts` covers D1/D2; a kind change on a product
with a linked stock item returns 400 `kind_has_stock`.

### Slice 2 — One Composición dropdown (hub)

**Topics:** `ui`, `ux`

1. Replace `PackageEditor` + `RecipeEditor` in the catalog `expandedContent` with one
   `CompositionEditor.svelte`: a list of components — each row shows kind badge, name, qty
   (inline editable), remove — and ONE "Agregar componente" button opening a `Picker` whose
   rows are the catalog's active sellables filtered by I2 (parent service → all except self
   and ancestors; parent product → products only) plus, for the product half, unlinked stock
   items (insumos) labelled with their stock name (they are what consumption uses today).
2. Storage stays as it is: a service child → `fin_product_components` (`PUT …/components`);
   a product/insumo child under a service parent → `stk_consumption` via a new
   `PUT /api/pos/sellables/[id]/consumption` (array replace, same shape as components); a
   product child under a product parent → stock BOM `/api/stock/items/[id]/components`.
   The editor reads all three and renders one list; the write path is chosen by parent kind
   and child kind. Validity days (packages) shows only when the list has a service child.
3. Empty state: one line per kind ("Un servicio se compone de productos y/o servicios" /
   "Un producto se compone de productos"), one button.
4. The `pos_recipe_needs_item` caption and the "Todavía no es un paquete" copy go away.

**DoD:** `composition.svelte.test.ts` proves the picker filter for both parent kinds and the
write-path selection; `bun run lint:design && bun run lint:tokens` debt not increased;
i18n keys in `messages/en.json` + `es.json` and `bun run i18n:compile`.

### Slice 3 — Catalog service ⇒ scheduling row (hub, migration `20261010130000_event_types_follow_catalog.sql`)

**Topics:** `data`, `migrations`, `logic`

1. New module `src/server/services/scheduling-catalog-sync.ts` (keep ALL new logic here so
   Slice 1's edits to `pos.service.ts` do not collide; `createSellable`/`updateSellable`
   gain one call each):
   - `ensureEventTypeForService(ctx, product)` — if no row with `product_id`, insert one:
     `title = name`, `slug = slugify(name)` (suffix `-2`, `-3` on the org-unique clash),
     `length` + `kindId` + assignee set copied from the **org template** = the configuration
     shared by the most active rows in the org (FACES: 15 min, Milagros); an org with no rows
     gets 30 min and every active resource. `active = product.active`.
   - `syncEventTypeFromProduct(ctx, product)` — `title`, `active` write-through; a kind flip
     service → product deactivates the row; product → service calls `ensure…`.
   - Both are no-ops when the scheduling module is off for the org.
2. Migration (SQL, idempotent, every org): (a) `update sched_event_types e set title = p.name
   from fin_products p where e.product_id = p.id and e.title <> p.name`; (b) `active =
   p.active` likewise; (c) insert rows for active services (`kind = 'service'`) without one,
   using the per-org template computed in SQL (mode of `length`, the resource set of the
   modal row; fallback 30 / all active resources). Assert afterwards: zero active services
   without an active row, zero active rows on inactive products. Pair with the seed.
3. `upsertEventType` ignores `title`/`active` for rows with a `product_id` (they are owned
   by the catalog); the API schema keeps accepting them for the legacy orphan rows only.
   `EventTypeEditor.svelte` hides the title and active fields when `productId` is set and
   shows the catalog name read-only with a link to the catalog row.
4. Services page: "Agregar servicio" opens `SellableWizard` in service mode (the catalog's
   own create); on success the new row appears configured via `ensure…`. The standalone
   "new event type" path is removed. `service-rows.ts` no longer needs the dormant group
   (keep it for orphan legacy rows).
5. The drawer picker, the create forms, the calendar hover card and the charge handoff need
   no change: they already read `title`, which is now the catalog name.

**DoD:** `scheduling-catalog-sync.test.ts` covers D4/D5 (create, rename, deactivate, both
kind flips, template selection incl. the empty-org fallback); migration run twice on the QA
stack with the two invariant queries returning 0; on FACES prod data (read-only dry run via
the same SQL under `begin … rollback`) the result is 49 active rows named exactly like the
catalog and the 25 retired ones inactive.

### Slice 4 — Products on an event (hub, migration `20261010140000_sched_booking_products.sql`)

**Topics:** `data`, `migrations`, `billing`, `ui`

1. Table `sched_booking_products (id uuid pk, org_id text, booking_id uuid → sched_bookings
   on delete cascade, product_id uuid → fin_products on delete restrict, qty numeric not null
   default 1 check (qty > 0), note text, created_at, updated_at)`, unique `(booking_id,
   product_id)`, index `(org_id, booking_id)`. `booking_id` is the visit's ANCHOR member
   (the lead, `groupSeq 0`, or the lone booking). When members are reordered/detached the
   lines stay on the row they were attached to; `detach` of the anchor moves them to the new
   lead (handler change).
2. `groupBodySchema` gains `{ addProductId, qty? }`, `{ removeProductId }`,
   `{ setProductQty: { productId, qty } }`; `{ removeService: true }` on the LAST live member
   of a visit is refused 409 `last_service` (I4). The detail response gains `visit.products:
   [{ productId, name, unitPrice, qty, paid }]` where `paid` = a non-voided ticket line with
   `booking_id = anchor` and that `product_id`.
3. Drawer: a "Productos" section under "Servicios" with "+ Agregar producto" (Picker over
   active catalog `kind = 'product'` sellables, searching the name), qty stepper, remove,
   and a paid chip. Same gates as services (`canEdit`).
4. Charge handoff v3: `SellChargeLine` gains `kind: 'service' | 'product'` and `qty`;
   product lines carry the anchor `bookingId` so `pos_ticket_lines.booking_id` links them;
   the cart pre-fills them as ordinary product lines (stock issues at submit as today). The
   pending-scheduling tray and account ledgers already filter `kind = 'service'`, so product
   lines never appear as unscheduled services — add a test that proves it.
5. Completing/cancelling the visit does nothing to product lines (I5).

**DoD:** handler tests for add/remove/qty/last-service; `sell-charge-handoff.test.ts` v3
round-trip incl. a v2 blob still parsing; detail `paid` proven with a ticket fixture;
`bun run check` 0/0.

## Out of scope

- Changing `trackStock` / `uom` on an existing sellable (existing handoff).
- Merging `fin_product_components`, `stk_consumption` and the stock BOM into one table.
- Per-service pricing of product lines (they use the catalog unit price).
- Bundles/packages as product lines on an event.
- Multi-org template management UI for the auto-created scheduling defaults.

## Verification (end to end)

1. `bun run qa:reset` on a fresh stack; log in as the QA org.
2. Catalog: create "Servicio X" (kind Servicio) → `/scheduling/event-types` shows it
   configured (template length), the appointment drawer picker lists "Servicio X".
3. Rename it to "Servicio Y" in the table → the picker shows "Servicio Y"; search "Y" finds it.
4. Flip its kind to Producto → it leaves the picker; flip back → it returns, same row id.
5. Expand a service row: add a product and a service component from one picker; expand a
   product row: the picker offers products only.
6. Open an appointment, add "Servicio Y", add product "Lip Defender" ×2; try to remove the
   only service → refused with the named message; "Cobrar" lands on `/pos/sell` with both
   lines; submit; reopen the drawer → the product shows paid.
7. Run the Slice 3 migration a second time → no changes, invariants 0.
