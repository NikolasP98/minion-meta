---
id: 2026-08-17-hub-updatesellable-silent-drop
title: updateSellable silently drops kind/trackStock/uom edits (200 OK no-op)
status: in-spec
spawned_spec: 2026-08-17-hub-updatesellable-silent-drop-spec
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub]
tags: [logic, edge-case]
value: 8
effort: S
source: debt-sweep-2026-08-17
---

# updateSellable silently drops kind/trackStock/uom edits (200 OK no-op)

## Problem

src/server/services/pos.service.ts:1262-1338 — PATCH accepts the fields (SellableWizard sends them) but .set() never reads them; operator edits appear to succeed and don't apply.

## Definition of done

Either the fields apply (mirroring createSellable's item-table sync) or a changed value returns 400; test asserts a kind/uom patch is reflected in getSellableRow().

## Out of scope

Wizard UX changes.
