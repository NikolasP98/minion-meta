---
id: 2026-08-23-hub-stock-crm-ux-consolidation
title: Stock/CRM UX consolidation — retire redundant pages, warehouse management, entries redesign, Picker primitive
status: in-progress
owner: hub
created: 2026-08-23
tags: [hub, stock, pos, crm, ui-primitive, route-retirement]
---

# Stock/CRM UX consolidation

Owner directive (2026-08-23): consolidate redundant surfaces into their canonical homes, complete warehouse management, restructure stock-entry creation by action, and introduce a reusable Picker primitive that encapsulates complex selection flows.

## S1 — Retire `/crm/graph`

"It has no basis since CRM contacts have no relationships between each other." Remove route dir, CRM section nav item, graph-only API endpoints/services (verify exclusivity first), i18n keys, and walk the route-contract build step in reverse (see §Contract).

## S2 — Fold `/finances/products` into `/pos/catalog`, then retire it

Recon facts: the page is 100% read-only analytics over `fin_products`; a POS "sellable" IS a `fin_products` row (`SELLABLE_MERGE_SQL`), so there is no linkage to port — only columns and guards.

Port into `/pos/catalog` BEFORE deleting the page:
1. **`billed` + `revenue` columns** (join `fin_invoice_items` aggregate into the catalog load).
2. **`cost` / `margin` / `margin%` columns** via `costForProducts`, carrying `shouldMaskSensitive(locals,'finance')` server-side masking — deleting the finances page without this leaks nothing (values simply absent) but losing the mask on catalog would leak cost to masked roles.
3. **"Show inactive" filter** — catalog's `listSellables` filters `active=true`; today deactivating a sellable makes it vanish, recoverable only via `/finances/products`. Without this filter, deletion makes deactivation irreversible in the UI. (Also unlocks editing consumption of inactive products, see S4.)
4. **Coverage banner** (`catalogCoverage`: billedNotInCatalog / catalogNeverBilled) moves to the catalog header.
5. Drop with the page: `FinanceNav` item, `finance.products` RBAC subresource + its tests, i18n keys (incl. 4 dead `fin_products_import*` keys), orphaned `/api/finances/products*` endpoints that have zero UI callers (keep PUT only if catalog uses it; catalog PATCHes `/api/pos/sellables/:id`).
6. Accept-loss: the arbitrary-depth read-only composition tree (RecipeEditor shows 1 level + depth badge). Acceptable; revisit if missed.

## S3 — Warehouse management on `/stock/warehouses`

Today: create + set-default + add-sub only. Recon: `PATCH /api/stock/warehouses/[id]` ALREADY accepts `{name?, parentId?, isDefault?}` with cycle guard — rename/move is UI-only work. Add:
- **Rename** (reuse the existing modal with the name field prefilled; PATCH name).
- **Archive** — `stk_warehouses` has NO archive column → migration `archived_at timestamptz null` + schema + `updateWarehouse` support + `listWarehouses(ctx, {includeArchived?})` filter. Archived warehouses: hidden from pickers/entry forms/default-resolution and the transfer-gating count; shown greyed with restore on the warehouses page. Guards: cannot archive the default warehouse; cannot archive with non-zero `stk_bins` qty; children must be archived first. New `StockError` code mapped in `_errors.ts`.
- **Delete**: not built (user asked update/add/archive; the "test" warehouse was deleted directly in prod 2026-08-23 after verifying 0 refs).
- Fix RBAC mismatch noted in recon: UI gates create on `stock:create` but the collection POST resolves to `stock:edit` — align by adding `/api/stock/warehouses` to `CREATE_COLLECTION_ENDPOINTS` (or gate UI on edit; pick one, document).

## S4 — Retire `/stock/consumption` (config lives in the catalog wizard)

`SellableWizard` already edits consumption (replace-set via `payload.consumption`). Port the delta FIRST:
1. **`note` field** — wizard's ConsumptionLike omits `note`; today a wizard save on a product with notes SILENTLY WIPES them (live data-loss bug, fix regardless).
2. **ConsumptionGauge** (subunit SVG qty picker) into the wizard row editor.
3. **Consumption-uom labels** (`consumptionUom ?? uom`) — data already returned by `listConsumption`.
4. Searchable item pick (Combobox or the new Picker, S6) instead of plain Select.
5. Inactive-product mappings are only editable via `/stock/consumption` today → S2's show-inactive filter must land first (wizard reachable for inactive rows).
Then remove route + StockNav item + i18n + contract counts. ⚠️ Nav `isActive` uses startsWith; `/stock/consumption` sits before `/stock/consume` deliberately.

## S5 — Retire `/stock/consume` ("Record service")

VERIFIED redundant: POS `postTicketStock` reads the same `stk_consumption` recipes and funnels into the same `insertSourcedIssueEntry` as `createServiceIssue` — POS covers the path (fail-soft, dup-guarded, default warehouse). Only loss = manual gauge-adjust-before-post; accepted. Remove: route, `StockNav` item (+ obsolete prefix-ordering comment), `PosNav` cross-comment, manifest, `business-route-shells.ts` form-shell branch + test, deguarded-routes row, baseline entry, i18n `stock_consume*`/`stock_nav_consume` keys, server-side comments naming the page. Keep `/api/stock/entries/from-service` only if anything else calls it — recon says no → delete endpoint + service fns become internal (createServiceIssue keeps its POS-shared internals).

## S6 — `/stock/entries` action dropdown + per-action form pages

Replace the single "+" `goto` with a **Dropdown** (existing Zag wrapper): **Entrada / Salida / Transferencia / Ajuste** (internal types `receipt|issue|transfer|adjustment`).
- **Logic-gating**: with ≤1 non-archived warehouse, Transferencia is not rendered (list page already has data to compute this; pass count via load).
- Each action navigates to `/stock/entries/new?type=receipt|issue|transfer|adjustment` — the wizard drops its "Tipo" step entirely (type comes from the URL; invalid/missing type falls back to a type chooser for deep links), leaving a single form page per action:
  - Optional **provider/counterparty field**: accepts RUC (11 digits) / DNI (8 digits) and autopopulates party data. DNI: existing `POST /api/crm/dni-lookup` (perudevs). RUC: NET-NEW lookup — extend the doc-lookup rail (`@minion-stack/crm-sdk` is the natural home; hub endpoint `POST /api/crm/doc-lookup` handling both lengths); on hit, find-or-create via existing `POST /api/crm/parties` (dedups on docNumber).
  - **Comment** (existing note field).
  - **Item picker** — the Picker primitive (S7) in multi-pick mode; each pick appends a movement line (qty/rate/warehouse edited inline on the line as today). Review step shows party NAME, not UUID (fix the raw-UUID rough edge).

## S7 — NEW primitive: Picker (SAP-style selection window)

`$lib/components/ui/Picker` — a selection surface that a field ("selector") invokes. Build on the EXISTING unadopted `foundations/DraggableWindow.svelte` (bindable x/y/w/h, resizable, toolbar snippet, `compactPresentation: 'sheet'` auto-degrades on small screens — the mobile vertical drawer comes free via `Dialog presentation="sheet" placement="bottom"`). Must pass `primitives-conformance.test.ts` + `foundation-components.test.ts`.
- Desktop: **draggable floating window** (drag by title bar; layer tokens; remembers position per storageKey; Escape + explicit close, no fixed-backdrop dismissal, per floating-panel contract).
- Mobile: **vertical drawer** (bottom sheet) via `compactPresentation='sheet'`.
- Content: a table (DataTable where possible) of whatever the invoker needs; search built in.
- **Double-click** (or explicit Add button per row on touch) adds the row to the invoking selector. Multi-pick mode keeps the window open and appends each pick to the destination; single-pick mode closes on pick.
- **"Add new" tab** — the window is tabbed; Add new opens a second tab containing a create form; on create, the new record is picked automatically.
- API sketch: `<Picker bind:open title columns loadRows onPick multi createForm>` with snippet-based cell rendering; invoker renders its own trigger field.

Adoption sites (incremental):
1. Stock entries counterparty field (S6 provider).
2. Stock entries line item picker (S6).
3. Catalog item editor — bundle components + consumption rows.
4. POS sale register — "Buscar cliente" and product add.

Rationale (owner): "This makes UI less packed and encapsulates more complicated actions into their own space."

## Contract (route removals)

Frozen literal `ROUTE_CONTRACT_EXPECTATIONS { endpoints: 152, screens: 142, redirects: 10, fixtures: 27 }` in `route-design-validation.ts` — decrement endpoints+screens per removed page. Also: wave map in `route-design-contracts.test.ts`, per-module counts (name AND body) in `business-route-shells.test.ts`, `frontend-contract-scanner.test.ts` pages, `ui-audit-inventory.test.ts` summary, `tests/ui-audit/current-baseline.json`, manifest `screen(...)` entries, RBAC subresources/tests, nav items, i18n keys (+ `i18n:compile`). Two of the count files live outside `src/lib/routes/` — run those tests explicitly.

## Sequencing

PR-A: S2 ports into catalog (columns, masking, show-inactive, banner) + S4 wizard delta (note fix ships here even standalone).
PR-B: retirements — /crm/graph, /finances/products, /stock/consumption, /stock/consume + contract walk.
PR-C: S3 warehouse management (+ archive migration).
PR-D: S7 Picker primitive + S6 entries redesign (adopts Picker at 2 sites).
PR-E: Picker adoption in catalog editor + POS register.
