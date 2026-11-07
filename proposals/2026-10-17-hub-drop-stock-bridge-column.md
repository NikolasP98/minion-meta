---
id: 2026-10-17-hub-drop-stock-bridge-column
title: Drop the retired sellable stock-bridge column once no release reads it
status: draft
created: 2026-10-17
updated: 2026-10-17
repos: [minion_hub]
tags: [data]
value: 3
effort: S
parent: 024-remove-sellable-stock-bridge
---

# Drop the retired sellable stock-bridge column

## AS-IS
Spec 024 (hub #563) stopped every reader of `stk_items.fin_product_id` and its migration
`20261017120000_retire_sellable_stock_bridge.sql` cleared all values, keeping them in
`stk_items_fin_product_bridge_backup`. The column, its partial unique index
`stk_items_org_fin_product_uniq`, and the backup table still exist. The stock item API
(`/api/stock/items` POST/PATCH) still accepts `finProductId` and would write a value nothing reads.

## TO-BE
- `/api/stock/items` no longer accepts `finProductId`.
- One migration drops `stk_items_org_fin_product_uniq`, `stk_items.fin_product_id` and the
  backup table; Drizzle `stkItems.finProductId` removed.

## DELTA
| # | Change | Proof |
|---|---|---|
| 1 | Remove `finProductId` from the stock item zod schemas + Drizzle schema | svelte-check, stock route tests |
| 2 | Drop migration (after one prod release on #563 with the backup verified unused) | prod: column absent, catalog + POS sale smoke |

Pointer: `TODO(handoff)` at the top of the 20261017120000 migration.
