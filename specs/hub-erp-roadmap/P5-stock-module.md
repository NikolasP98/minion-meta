# P5 — Stock management module (ERPNext-based)

**Repo:** minion_hub (`dev`) + gateway tools. Runs AFTER P1 (tools pattern) + P2 (events). Full design rationale: audit spec §7 (`specs/2026-07-02-hub-erp-agent-native-audit.md`) — read it first.
**Core invariant:** the append-only `stk_ledger` is the source of truth; `stk_bins` is a rebuildable cache; ONLY document submission writes the ledger, in one transaction.

## Migration (orchestrator applies; agent writes file)
`supabase/migrations/<ts>_stock.sql`: `stk_items`, `stk_warehouses`, `stk_entries`, `stk_entry_lines`, `stk_ledger`, `stk_bins` exactly per audit §7 schema, + org_guc RLS on all six, + `unique(org_id, code)` on items, PK `(org_id,item_id,warehouse_id)` on bins, btree (org_id, item_id, posted_at) on ledger. Ledger gets NO update/delete RLS grants beyond insert/select if the existing policy style supports it (check; otherwise enforce append-only in service only).

## W1 — server core
1. Drizzle tables `src/server/db/pg-schema/stock.ts` (bg-jobs.ts conventions; same @minion-stack/db registration check as P4 — STOP and report if package change needed).
2. `stock.service.ts`:
   - Items/warehouses CRUD (warehouse = tree via parent_id; cycle guard).
   - Entries: create/update DRAFT (header + lines), `submitEntry(ctx, id, actor)` — ONE `withOrgCore` tx: validate lines (item exists, warehouse exists, qty>0, transfer needs both warehouses), compute per-line ledger deltas (receipt:+to, issue:−from, transfer:−from/+to, adjustment:signed), **negative-stock guard** (`bins.qty + delta >= 0` per item+warehouse unless org setting `allow_negative_stock`), **moving-average valuation** (receipts: new_rate = (bin.qty*bin.rate + qty*line.rate)/(bin.qty+qty); issues consume at bin rate), insert ledger rows with running `qty_after`, upsert bins, `recordAudit` (op:'workflow', draft→submitted), `emitHubEvent(tx, {type:'stock.entry_submitted', ...})` (extend the P2 HubEvent union).
   - `cancelEntry` — reversing ledger rows in one tx (never delete), status→cancelled.
   - `rebuildBins(ctx, itemId?)` — replay ledger into bins (recovery path); exposed via `POST /api/stock/maintenance/rebuild-bins` (gate: stock,manage).
   - Naming series for entries via existing `naming_series` service (e.g. `STE-.####`).
   - Reuse `workflow_transitions` if the existing workflow service fits draft/submitted/cancelled; otherwise plain status column + audit (don't force it).
3. Concurrency: submit tx must take `select ... for update` on the touched bins rows (or rely on the upsert + guard within the tx — verify isolation; FOR UPDATE on bins is the boring-correct choice).
4. API under `/api/stock/*` (parseBody + RBAC `'stock'` module added to MODULES/BUSINESS_MODULES/apiWriteCapability/layout/nav — required build step): items, warehouses, entries (+submit/+cancel), bins query, ledger query (per item).
5. Reorder alerts: in the notifications tick's existing rule pass, add a `stock_reorder` rule type — `bins.qty <= items.reorder_level` grouped per org → notification (dedupe: don't re-alert while still below level; stamp last_alerted on… no new column — use notification_send_log dedupe if that's how other rules dedupe; match existing).
6. Tests (this module gets the most): valuation math (moving-average receipt/issue sequence), negative-stock guard, cancel-reverses-exactly, rebuildBins reproduces bins from ledger, submit idempotency (double-submit blocked by status check).

## W2 — UI `/stock`
- Overview: bin levels dashboard (low-stock card, total valuation), recent movements.
- Items grid (EditableGrid, readonly per P3), item detail: bins per warehouse + ledger history table.
- Warehouse tree editor (simple nested list; no drag-drop v1).
- Entry stepper (type → lines (item/qty/warehouse autocomplete) → review → submit), status badges draft/submitted/cancelled, cancel with confirm dialog.
- Party link on entries (supplier/customer picker via existing party/contact search); Connections panel: add "Stock" group to `connections.service.ts` (entries count per party).
- i18n en+es, RBAC-aware controls, Svelte 5 runes.

## W3 — gateway tools
`stock_query` (levels/movements/valuation; read) + `stock_entry_create` (DRAFT only — submission stays in the UI v1; confirm contract still applies) via the P1 pattern + `/api/gateway/actions/query/stock` + `actions/stock-entry-create` endpoints. Register + mcpExport.

## Deferred (v2)
Batch/serial numbers, FIFO valuation, multi-UOM, purchase-receipt/delivery-note doctypes, landed cost, reconciliation import, invoice→auto-issue automation (needs P2 event handler; leave hook comment).

## Sequencing
Migration + W1 first (single agent — the ledger/valuation logic must be one mind), then W2 + W3 parallel.
