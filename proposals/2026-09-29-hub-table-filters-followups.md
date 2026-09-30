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

## 3. `GroupByPicker` lives in the catalog page only — CLOSED 2026-09-29 (`groupOptions`/`groupValue`/`onGroupChange` on `DataTable`, slice 4)
`/pos/catalog` hosts the picker in its own view-bar (it serves the board view
too). A `groupOptions`/`groupValue` prop on `DataTable` rendering the same
component in the toolbar is the standard home once a second table groups
along a user-chosen axis.

## 4. Sellable editor: modal presentation not ported to autosave
`SellableWizard` `presentation="modal"` has no consumer today; it still shows
Name + Save/Cancel instead of the inline-title/autosave flow (`TODO(handoff)`
in `SellableWizard.svelte`). Port it the same way if a modal consumer appears.

## 5. Consumption gauge on other consumption surfaces
`/stock/items/[id]` and `/pos/appointments` render a `ConsumptionGauge` per
row for `diagramEnabled` items; the editor's Supply consumption rows do not yet
(`TODO(handoff)` in `SellableWizard.svelte`).

## 6. Record-editor contract adoption
The autosave + `SaveIndicator` + flat-sections contract ships on the catalog
editor only. Candidates: `/crm/[contactId]`, `/stock/items/[id]`,
`/finances/invoices/[id]`, `/pos/tickets/[id]` (every page the peek registry
can open).

## 7. `InlineCategoryCell` still owns its own trigger
The catalog Category cell keeps an always-visible trigger; migrate it to the
select-then-click contract the Tags cell got in hub #414 (`DataCellContext.open`).
