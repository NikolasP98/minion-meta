---
id: 2026-09-29-hub-table-filters-followups
title: Table toolbar + Notion-style filters — open ends
status: draft
created: 2026-09-29
repos: [minion_hub]
tags: [ui, ux]
spec: specs/2026-09-29-hub-table-toolbar-notion-filters-spec.md
---

# Open ends from the table toolbar / Notion filters slice

Ledger for hub branches `feat/table-filters-core`, `feat/table-toolbar` and the
integration branch `feat/table-toolbar-filters`.

## 1. Server-mode tables expose only the default operator per kind
`server`-mode tables (`crm/customers`) send filters through `filterToParam`,
whose consumers parse the legacy shapes only (comma-joined enum, plain text,
`min~max`). Non-default operators encode as `op:<payload>` with no server
parser, so server tables hide the extra operators and the advanced tree.
Next: a shared `parseFilterParam()` on the server + the customers list
service honouring each op; then lift the gate in `FilterAddMenu`/`FilterChip`.

## 2. Filters are not persisted
`storageKey` persists hidden/order/widths but not `filters`/`advanced`. Notion
keeps filters per view. Next: persist both under `storageKey` (or per-user
preference `tableFilters[tableId]`), with a "Reset" affordance.

## 3. `GroupByPicker` lives in the catalog page only
`/pos/catalog` hosts the picker in its own view-bar (it serves the board view
too). A `groupOptions`/`groupValue` prop on `DataTable` rendering the same
component in the toolbar is the standard home once a second table groups
along a user-chosen axis.
