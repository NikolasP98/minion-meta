---
id: 2026-11-18-hub-stock-entry-item-names-spec
title: Stock entry detail and record preview name each line by item name first
stage: spec
status: review
pass: 1
created: 2026-11-18
updated: 2026-11-18
repos: [minion_hub]
verdict: pending
type: feature
tags: [ui]
related: [2026-11-14-hub-till-corrections-spec]
---

# Item names first on the stock entry detail

## 0. Product

On a stock movement's detail page and its record preview, each line names its supply by name first and code
second ("Toxina Botulinica Dysport · 1258"), so a truncated label loses the code, not the word that tells two
similar supplies apart. FACES staff asked for it on 2026-11-17 while checking a double stock deduction.

The canonical [Spec Kit specification](130-stock-entry-item-names/spec.md) holds the AS-IS evidence, TO-BE,
DELTA and acceptance scenarios. It is a delta to spec 125 (readable stock movements, hub PR #682), which covers
the list, the item ledger and the overview but not this screen.

## FigCraft demo

[stock-entry-item-names.figcraft](130-stock-entry-item-names/stock-entry-item-names.figcraft): the captured
detail page (as-is / to-be) and the FACES case at the preview's item-column width (as-is / to-be).

## Verification

- Unit test `src/lib/components/stock/item-label.test.ts` (name · code, name alone, unresolved fallback).
- After deploy: open STE-2026-00659 in the record preview; both toxin lines start with their full name.

## Out of scope

The entries list, the item ledger and the overview (spec 125); the new-entry form.

## Human gates

Owner approves the demo and merges the hub PR.
