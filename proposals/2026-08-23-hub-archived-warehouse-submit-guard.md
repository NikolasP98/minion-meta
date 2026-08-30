---
id: 2026-08-23-hub-archived-warehouse-submit-guard
title: submitEntry accepts archived warehouses via direct API
stage: proposal
status: approved
created: 2026-08-23
updated: 2026-08-28
repos: [minion_hub]
tags: [logic, data, edge-case]
approved_reason: "Accepted: current master still validates warehouse existence without excluding archived_at, so direct API clients can reintroduce stock into an archived warehouse. This is a confirmed data-integrity defect with a bounded service guard and regression test; promote independently from the completed Picker program."
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
