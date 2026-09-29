---
id: 2026-09-28-hub-table-open-modes-bulk-bar-stock-detail-spec
title: Tables — configurable open mode (page/modal/tray), floating bulk bar; stock entries provenance + item detail restructure
stage: dev
status: implementing
pass: 2
next_slice: 2
created: 2026-09-28
updated: 2026-09-28
repos: [minion_hub]
tags: [ui, ux]
---

# Tables open modes + bulk bar · Stock entries provenance · Item detail restructure

Owner request 2026-09-28 (verbatim summary): (1) table records open through the
title arrow and always navigate — make the VIEW configurable like Notion: full
page / modal / tray. (2) Selecting rows shows a Notion-style FLOATING menu with
bulk + per-item actions (archive, bulk-change price/other editable properties).
(3) `/stock/entries`: more columns — the customer invoice for issues, the provider
invoice for receipts, clickable; open a MODAL first with an expand button
top-right that navigates fully; modern view transitions. (4) The per-row
dropdown of an entry is a NESTED items table with its own columns. (5) Item
detail: merge Bins + Ledger into one section headed by the current valuation,
with an action button that drops down into entry actions (issue/receipt/
adjustment); Consumed-by rows clickable (modal + expand). (6) Top section =
"Overview", per-USER configurable property visibility, default home for custom
properties, tags (own + inherited) as its last item.

## 0. Product

Notion-grade record handling for every hub table: a record opens the way the org
configured it (page / modal / tray), row selection exposes a floating bulk bar,
and the stock module's entries and item pages show provenance and stock state
where the user acts. Ships as hub PR #406 (slice 1) + a gaps slice (slice 2).

**Out of scope:** a new custom-property type, per-user open-mode overrides in
slice 1, nested peeks (a peek inside a peek), purchases module beyond the
receipt link + one detail route.

**Verification:** slice 1 = Playwright `tests/e2e/ui-audit/record-peek.spec.ts`
(4 cases) on the seeded QA stack + full vitest + svelte-check + lint:design /
lint:tokens; slice 2 adds cases per bundle (below).

## AS-IS (master `0e5eac77` + T3 `1422f76d`)

- `DataTable.titleColumn.href` renders `<a class="dt-title-link">` + hover
  `<a class="dt-open"><ArrowUpRight/>` — both plain navigations
  (`DataTable.svelte` ~L2722). `onRowClick` on consumers calls `goto`.
- `bulkActions` (`BulkAction<T>[]`) render inside the toolbar KEBAB
  (`DataTable.svelte` ~L2199); nothing floats; no built-in bulk edit.
- Org table config = `app_table_config` jsonb (`src/lib/tables/registry.ts`
  `TableEntryConfig { idPrefix?, fields? }`), edited on `/settings/tables`
  (a DataTable with `select`/`boolean` cells, PUT `/api/tables/config`).
- Per-user prefs = `/api/me/preferences/[section]` (allow-listed sections,
  `upsertUserPreference`), loaded in `(app)/+layout.server.ts` as
  `page.data.preferences[section]`; client helper
  `$lib/state/ui/preference-sync.svelte.ts` (`syncPreferenceToServer`).
- Stock entry provenance is only in `stk_entries.metadata`: POS issue =
  `{source:'pos', sourceId:<ticketId>, ticketId}`; sales-invoice issue =
  `{source:'invoice', invoiceId, providerRef}`; booking = `{source:'booking',
  sourceId}`. **Receipts carry NO link to a purchase record** (supplier invoices
  are attachments on the entry; `fin_purchases` is a separate SUNAT sync).
- `/stock/entries` expanded row (T3) already renders lines as a nested
  `variant="plain"` DataTable (item · qty · rate).
- `/stock/items/[id]` view mode = facts `<dl class="meta-grid">` card, Tags
  card (own `TagsField` + inherited `TagChip dashed`), Bins card, Consumed-by
  card, Ledger card, Attachments card. Ledger rows carry `entryId`; consumed-by
  rows carry `finProductId` (product page = `/pos/catalog/[productId]/edit`).
- `stk_items` has NO `archived_at`. Custom properties exist for `stock.items`
  (`CUSTOM_PROPERTY_TABLE_IDS`, `loadCustomPropertyBundle`, `CustomPropertyCell`)
  but only on the LIST, not the detail page.
- No view transitions; root layout keys the shell on the first path segment.

## TO-BE

### Core (DONE, commit `781a53b6` on `feat/table-open-modes-bulk-bar`)
`src/lib/records/`: `peek.svelte.ts` (`OpenMode`, `openModeFor(tableId,
explicit)`, `openRecord(href, mode)`, `peekClick`, `closePeek`, `expandPeek`,
`inPeek()`), `peek-registry.ts` (route → lazy `+page.svelte`: stock item, stock
entry, pos ticket, fin invoice, catalog product edit), `RecordPeek.svelte`
(mounted in `(app)/+layout.svelte`; Dialog for `modal`, right Sheet for `tray`;
Expand = `goto(href,{replaceState:true})`), `PeekLink.svelte`. Mechanism =
SvelteKit shallow routing with `pushState('', {peek})` — URL unchanged so the
keyed layout shells stay mounted. i18n: `record_peek_expand`,
`record_peek_open_in`, `record_open_page|modal|tray`.

### Invariants
- I1 A plain click on a record link honours the mode; modifier/middle click
  always keeps the browser's new-tab behaviour (`isModifiedClick`).
- I2 Peek falls back to full navigation when the route is unregistered or its
  load is not 200 — never an empty panel.
- I3 A page rendered in a peek hides ONLY its back affordance (`inPeek()`);
  everything else is the same component the route renders.
- I4 Bulk edit persists through the SAME `onSaveRow` contract as cell editing —
  no second write path; rows without `onSaveRow` show no bulk edit.
- I5 Overview visibility is per user (`preferences.recordOverview`), never per
  org; the org's `/settings/tables` field config still hides a field for all.
- I6 Every new colour/spacing/z-index is a semantic token; gates
  `lint:design` + `lint:tokens` may only decrease debt.

## DELTA — three file-disjoint bundles (run in parallel)

### Bundle A — open modes in DataTable + settings + floating bulk bar + view transitions
Owns: `data-table/DataTable.svelte` (+ `.test.ts`), `tables/registry.ts`
(+ `registry.test.ts`), `routes/(app)/settings/tables/+page.svelte`,
`routes/api/tables/config/+server.ts` (validation), `src/routes/+layout.svelte`,
`src/app.css`, `messages/*.json` (APPEND ONLY).
1. `TableEntryConfig.openIn?: 'page'|'modal'|'tray'` (+ `applyTablePatch`
   drops the default `'page'`; server PUT validates via `isOpenMode`).
2. `/settings/tables`: new `select` column "Open records in" (options from
   `OPEN_MODES`, labels `record_open_*`) saved through the existing `put`.
3. DataTable: new prop `openIn?: OpenMode` (explicit wins); resolved mode =
   `openModeFor(tableId, openIn)`. Title link + `.dt-open` anchor get
   `onclick={peekClick(href, mode)}`. New prop `rowOpen?: boolean` (default
   TRUE when `titleColumn` is set and no `onRowClick`): a plain row click opens
   the title href in the resolved mode. Quick switch: in the column menu (⋯ /
   `col-menu`) add a small "Open in" `SegmentedControl` (page/modal/tray) that
   PUTs `/api/tables/config` `{[tableId]:{openIn}}` + `invalidate('app:table-config')`
   — only when `tableId` is set and the user has the same capability the
   settings page requires (reuse its gating; if none, show it).
4. Floating bulk bar replaces the kebab: when `selectedIds.size > 0` render a
   fixed-position pill (`--layer-sticky`, centred at the bottom of the table
   pane, `--color-overlay` + `--shadow-overlay`, enter/exit `--duration-fast`)
   with: count · "Edit property ▾" · caller `bulkActions` (danger last, red) ·
   ✕ clear. "Edit property" opens a Popover: pick an editable column (those
   with `editable`+`type`, respecting org `editable:false` and `canEdit`), an
   input matching the column `type` (select → Select, boolean → Toggle,
   date → date input, number/text → Input), Apply → for each selected row
   `onSaveRow(row, {[key]: value})` through the existing row-save controller
   (pending overlay per row, failures keep drafts, one toast summary). Keyboard:
   Escape clears selection when the bar has focus. Remove the old kebab menu
   and its `bulkOpen` state. Keep `BulkAction<T>` type unchanged (B/C rely on it).
5. View transitions: root `+layout.svelte` `onNavigate` → `document.startViewTransition`
   (guard absence; respect `prefers-reduced-motion`), `app.css`
   `::view-transition-old(root)/new(root)` cross-fade at `--duration-normal`.
   `.record-peek .peek-body` already carries `view-transition-name: record-peek`;
   give `PageShell[archetype="record-detail"]` (or the record pages' root) the
   same name so Expand morphs panel → page.
6. Tests: registry (`openIn` round-trip + default drop), DataTable
   (mode resolution, bulk-edit applies per row via `onSaveRow`, clear).

### Bundle B — `/stock/entries` provenance columns + nested lines table
Owns: `routes/(app)/stock/entries/+page.svelte`, `+page.server.ts`,
`server/services/pos.service.ts` (add `listTicketRefs(ctx, ids)` →
`{id, humanId, status}`), `server/services/finance.service.ts` (add
`listInvoiceRefs(ctx, ids)` → `{id, providerRef, status}` if no equivalent),
`tables/defs/index.ts` (stock.entries fields ONLY), `messages/*.json` (APPEND).
1. Server: from `entries[].metadata` derive `document: {kind:'ticket'|'invoice'|'booking'|null, id, label, href}`
   — pos → `/pos/tickets/{sourceId}` label `#humanId`; invoice →
   `/finances/invoices/{invoiceId}` label `providerRef`; booking →
   `/scheduling/bookings?booking={sourceId}` label short id. Batch-resolve
   labels (one query per kind). Also `attachmentCount` for receipts if a cheap
   count exists (`attachments` service); else skip.
2. Columns added (registry `stock.entries` fields too): `document`
   ("Customer invoice" for issues / "Provider invoice" for receipts — one
   column, header "Document", cell shows a kind chip + `PeekLink mode="modal"`
   with the label; receipts without a link show "—" and a tooltip that the
   supplier invoice lives in the entry's attachments), `warehouse` (from/to of
   the first line, transfer shows `A → B`), `lines` (count), `note` (truncated),
   `posted` (postedAt). Keep existing four.
3. Nested lines table: columns `item` (PeekLink to `/stock/items/{itemId}`,
   `ITM-code · name`), `qty` (+uom), `rate` (money), `amount` = qty×rate
   (money, footer sum), `warehouse` (from → to). Header of the nested table
   stays visible; `variant="plain"`.
4. TODO(handoff) + proposal `proposals/2026-09-28-hub-stock-receipt-purchase-link.md`:
   receipts have no purchase record link; propose `metadata.purchaseId` set from
   a purchase picker on `/stock/entries/new?type=receipt` and a
   `/finances/purchases/[id]` route.
5. Tests: a pure `entryDocument(metadata, type)` helper with unit tests.

### Bundle C — `/stock/items/[id]` restructure + archive + overview prefs
Owns: `routes/(app)/stock/items/[id]/+page.svelte`, `+page.server.ts`,
`routes/(app)/stock/items/+page.svelte` (bulk archive + show-archived filter),
`server/services/stock.service.ts`, `server/db/pg-schema/stock.ts`,
`supabase/migrations/20260928*_stk_items_archived_at.sql` (additive: column +
partial index), `routes/api/stock/items/**` (archive endpoint), `routes/api/me/preferences/[section]/+server.ts`
(+ `recordOverview` section, value `{[tableId]: {hidden: string[]}}`),
`routes/(app)/stock/entries/new/+page.svelte` (accept `?item=<id>` to
pre-add that line), `lib/records/peek-registry.ts` NO (owned by core), `messages/*.json` (APPEND).
1. Overview card (title `stock_item_overview_title` "Overview"): the current
   facts + custom properties for `stock.items` (server loads
   `loadCustomPropertyBundle(locals, ctx, 'stock.items', [id])`; render each
   definition as a `dt`/`dd` row via `CustomPropertyCell` in read mode, editable
   when `bundle.canEdit`) + LAST row "Tags" = `TagsField` + inherited chips.
   A card-header link-action "Configure" (per governance: ONE link-style
   action) opens a Popover listing every property (facts + custom) with a
   Toggle; hidden set persists per user via `syncPreferenceToServer('recordOverview', …)`
   and reads `page.data.preferences.recordOverview?.['stock.items']?.hidden`.
   Org-hidden fields (`resolveTable(def, tableConfig()).fields.get(k).hidden`)
   never show. Tags cannot be hidden.
2. Stock card (title `stock_item_stock_title` "Stock"): header row = valuation
   summary from bins (qty on hand · valuation rate · value, per warehouse when
   >1 bin, one line when 1) + ONE link-style action "New entry ▾" (Dropdown:
   Receipt / Issue / Adjustment / Transfer when >1 warehouse) →
   `/stock/entries/new?type=X&item={id}`; body = the ledger DataTable with a
   new `entry` column (`PeekLink` to `/stock/entries/{entryId}`, label
   `ENT-humanId` — server resolves humanIds in one query). Delete the Bins card.
3. Consumed-by: `product` cell = `PeekLink mode="modal"` to
   `/pos/catalog/{finProductId}/edit`.
4. `inPeek()`: when true, hide the PageHeader's Back button and the `[`/`]`
   hotkeys (still render the header title/subtitle).
5. Archive: `stk_items.archived_at timestamptz null`; `archiveItems(ctx, ids, archived)`
   in stock.service; `listItems` excludes archived unless `includeArchived`;
   `POST /api/stock/items/archive {ids, archived}` (RBAC `stock:edit`);
   `/stock/items` list: `bulkActions=[{label: Archive, danger:true}]` (+ Unarchive
   when the show-archived chip is on), `?archived=1` page filter chip, archived
   rows get `t-caption` muted name. Migration is additive and applied by
   `scripts/db-migrate.ts` on deploy.
6. Tests: `stock.service` archive unit test (mock tx) + preferences section
   validation test if the endpoint has one.

## Shared rules for every bundle
- Worktree per bundle (`~/.cache/claude-tmp/tbl-open-{a,b,c}/minion_hub`), never
  the main checkout; do not commit/stage/push; do not touch the other bundles'
  files; `messages/en.json` + `es.json` are APPEND-ONLY at the end of the file
  (both locales, then `bun run i18n:compile`).
- Svelte 5 runes only; `Button`/`Select`/`Toggle`/`Popover`/`Dropdown`/
  `Tooltip`/`SegmentedControl` from `$lib/components/ui`; tokens only
  (`ui-design-governance` skill); `formatMoney` for money.
- Run only targeted `bunx vitest run <file>` + `bunx svelte-check` on touched
  files; the orchestrator runs `check`, `lint:design`, `lint:tokens`, the full
  suite and browser QA once.
- Any open end = `TODO(handoff)` at the site + a line in
  `proposals/2026-09-28-hub-table-open-modes-followups.md` (report it; the
  orchestrator writes the proposal).

### Slice 2 — gaps (ledger `proposals/2026-09-28-hub-table-open-modes-followups.md`, owner 2026-09-28: "address all gaps")

**Topics:** ui, ux

Branch stacked on `feat/table-open-modes-bulk-bar` (hub #406). Three file-disjoint bundles.

#### Bundle D — receipt ↔ purchase link + purchase detail route + attachment count (§1, §2)
Owns: `server/db/pg-schema` NO (link lives in `stk_entries.metadata.purchaseId`);
`server/services/purchases.service.ts` (+`getPurchase(ctx,id)`, `listPurchaseRefs(ctx, ids)`),
`server/services/stock.service.ts` ONLY `createEntry` metadata pass-through if missing,
`routes/(app)/stock/entries/new/+page.svelte` (+ `+page.server.ts`) — receipt form gains a
"Provider invoice" `PickerCombobox` over `listPurchases` (label `serie-numero · supplierName · total`),
stored as `metadata: { purchaseId, providerRef: 'serie-numero' }`; `routes/(app)/finances/purchases/[id]/`
(new record-detail page: header `serie-numero`, kv facts supplier/RUC/doc type/issued/period/base/IGV/total,
linked stock entries via `findEntryBySource`-style lookup on `metadata.purchaseId`) + the SIX route-contract
places (`route-design-manifest.ts`, `route-design-validation.ts` counts, `route-design-contracts.test.ts` wave,
`business-route-shells.test.ts` finances count, `frontend-contract-scanner.test.ts`, `scripts/ui-audit-inventory.test.ts`)
+ `route-access-registry` (`finances:view`); `lib/components/stock/entry-document.ts` (+test): receipts with
`metadata.purchaseId` → `{kind:'purchase', href:'/finances/purchases/{id}'}`; `routes/(app)/stock/entries/+page.server.ts`
(resolve purchase labels; `attachmentCount` via a new `countAttachmentsByObjects(ctx, objectType, ids)` in
`attachments.service.ts`) + `+page.svelte` (Document cell for purchases; `attachments` column with a paperclip
count → `PeekLink` to the entry); `lib/records/peek-registry.ts` (+ `/finances/purchases/:id`);
`routes/(app)/finances/purchases/+page.svelte` (`titleColumn` → the new route); `messages/*.json` APPEND.

#### Bundle E — DataTable: bulk edit of custom properties, bulk tags, per-user open mode, peek label (§4, §6, §7)
Owns: `lib/components/data-table/DataTable.svelte`, `bulk-edit.ts` (+tests), `custom-properties/*` (read
only unless a save helper is missing), `lib/records/RecordPeek.svelte` + `peek.svelte.ts`,
`routes/api/me/preferences/[section]/+server.ts` (+ section `tableOpenIn` = `{[tableId]: OpenMode}`),
`lib/components/tags/*` (a `bulkLinkTags(scope, ids, add[], remove[])` client helper if none),
`routes/api/tags/**` (bulk link endpoint if none exists), `messages/*.json` APPEND.
1. "Edit property" lists custom properties (types text/number/date/boolean/select/multi_select) and saves
   through the same custom-property values API the cell uses (`custom-properties/api.ts`), per selected row.
2. Bulk bar action "Tags ▾": `TagOptionList`-style popover to add/remove tags on all selected rows for
   tables with a tag scope (`stock.items`→stock, `pos.catalog`→pos, `crm.customers`→crm); wired through a
   new `tagScope` DataTable prop set by those three pages.
3. Per-user open mode: `openModeFor` resolves explicit > USER pref (`preferences.tableOpenIn[tableId]`) >
   org config > page; the column-menu quick switch gets a "For me / For everyone" toggle (everyone = existing
   PUT, gated as today; me = `syncPreferenceToServer('tableOpenIn', …)`).
4. `RecordPeek` labels the dialog with the embedded page's heading: after the page mounts, find the first
   `h1[id]` inside the dialog and set `labelledBy` to it (fallback = the caption).

#### Bundle F — Overview prefs on CRM contact / POS ticket / invoice, archived default, QA seed (§3, §8, §9)
Owns: `routes/(app)/crm/[contactId]/+page.svelte` (+server), `routes/(app)/pos/tickets/[id]/+page.svelte`,
`routes/(app)/finances/invoices/[id]/+page.svelte`, `lib/components/stock/overview-prefs.ts` → MOVE to
`lib/records/overview-prefs.ts` (update the stock import), new `lib/records/OverviewCard.svelte` (facts rows +
Configure popover + custom-property rows, used by all four pages incl. `stock/items/[id]`),
`server/services/stock.service.ts` `listItems` default → `includeArchived: true` with pickers opting OUT
(`stock/entries/new`, `pos/catalog` product form, `pos-catalog-form.service`, `brains.service`, `GET /api/stock/items`),
`scripts/qa/seed/formula-columns.ts` / `formula-variables.ts` + `server/services/formula-properties.service.ts`
(guard `formulaDependencies` for legacy rule shapes so `/pos/catalog` never 500s), `messages/*.json` APPEND.
Each record page: first card becomes `OverviewCard` with keys for its facts; org-hidden fields never render;
tags row last where the entity has tags.

**Verification (slice 2):** D = e2e case "receipt with a purchase opens the purchase peek"; E = unit tests for
custom-property bulk jobs + mode precedence, e2e "bulk tag add on two items"; F = e2e "contact Overview
Configure hides a fact and persists". Same gates as slice 1.

