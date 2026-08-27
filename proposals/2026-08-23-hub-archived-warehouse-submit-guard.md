---
id: 2026-08-23-hub-archived-warehouse-submit-guard
title: submitEntry accepts archived warehouses via direct API
stage: proposal
status: draft
created: 2026-08-23
repos: [minion_hub]
---

# submitEntry accepts archived warehouses via direct API

Found while shipping warehouse archiving (spec
`2026-08-23-hub-stock-crm-ux-consolidation` S3, PR "feat(stock): warehouse
management"). `TODO(handoff)` sits in `src/server/services/stock.service.ts`
inside `submitEntry`, before the `warehouseIdSet` build.

## Problem

The UI can no longer pick an archived warehouse (every `listWarehouses()`
caller now defaults to active-only), but `submitEntry`'s warehouse-existence
check does not exclude `archived_at is not null` rows. A scripted/API client
can POST + submit a receipt against an archived warehouse id, silently
reintroducing stock into a warehouse the archive guard required to be empty.

## Fix sketch

In `submitEntry`'s warehouse validation, treat archived warehouses as
not-found (or a dedicated `warehouse_archived` StockError → 409). One test:
submit against an archived warehouse id → rejected.
