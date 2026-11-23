# Implementation Plan: Stock value always adds up

**Branch**: `fix/144-stock-ledger-integrity` (hub; stacked on `feat/142-stock-exchange` / PR #705 until that merges, then rebased onto `master`) | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

Owner, 2026-11-23: "Approve the spec 144 preview … proceed with these items".

## Summary

Five changes, one hub PR:

1. The engine posts a value-only residual row when a movement would leave value the moving average cannot carry.
2. A `ledgerValueGaps` read feeds a warning on the stock overview and a "Ver" list.
3. The one-time repair script is deleted.
4. Last purchase cost reads receipts only. This is already delivered in #705 (`90b5e3a`); here it is only verified.
5. A non-blocking warning appears on a receipt line whose unit cost is ≥2.5× or ≤÷2.5 of the item's average, with a one-click "Es el total".

## Technical Context

- **Engine** (`src/server/services/stock.logic.ts`):
  - `applyLedgerDelta(bin, qtyDelta, valueDelta)` returns `{qty, rate}`. Its rate fallbacks drop value: a negative rate carries the old rate, and qty 0 resets the rate to 0.
  - Callers in `stock.service.ts`: the submit leg loop (~1118) and `cancelEntryInTx` (~1209).
- **Residual design**: `applyLedgerDelta` additionally returns `residual = (oldQty*oldRate + valueDelta) − newQty*newRate`.
  - When |residual| > 0.005, the caller inserts a second ledger row for the same entry, item and warehouse: `qty_delta 0`, `qty_after = newQty`, `valuation_rate = newRate`, `value_delta = −residual`.
  - The row is told apart by `qty_delta = 0`, and the movements readers label it "Ajuste de valor (residuo)".
  - Cancel reverses the residual rows exactly like any other row (it reverses by booked `value_delta`).
  - No schema change.
- **Gaps read**:
  - SQL: `Σ value_delta` per (item, warehouse) vs `qty × valuation_rate` from `stk_bins`, |diff| > 0.01.
  - Plus the first diverging ledger row, found with a window over running sums, bounded to the gap items.
  - Shown on `/stock` (`src/routes/(app)/stock/+page.server.ts`, overview PageBody) only when non-empty.
- **Cost warning**: a pure `costPlausibility(unitRate, avgRate)` in `src/routes/(app)/stock/entries/new/entry-lines.ts`, which returns `{ratio, suggestUnit}`.
  - The new-entry form already loads on-hand info per item (avg). The warning row reuses the existing alert pattern.
  - "Es el total" flips that line's rate mode to total (`convertRates` exists).
- **Script removal**: `scripts/repair-stock-valuation.ts`; update `scripts/sweep-hub-transactions.ts` (it references the script) and any docs that list it.

## Constitution Check

| Principle | Status |
|---|---|
| Spec before code | ✅ spec + FigCraft (meta #1072); owner approved 2026-11-23 |
| Slice-scoped | ✅ one hub PR; gates in the foreground |
| Build steps | ✅ no new route (the overview loader gains a field); i18n es/en; tokens; lint:design/tokens; content-contract ratchet (formatMoney/formatNumber) |
| Data gates | ✅ tagged data: owner merges; no prod data script (the 2026-11-21 repair is done) |

## Project Structure (hub)

```text
src/server/services/stock.logic.ts        # applyLedgerDelta residual
src/server/services/stock.service.ts      # post residual rows (submit + cancel); ledgerValueGaps()
src/server/services/stock-entries-read.service.ts  # label qty_delta=0 rows
src/routes/(app)/stock/+page.server.ts, PageBody.svelte   # gap warning + Ver list
src/routes/(app)/stock/entries/new/entry-lines.ts, PageBody.svelte  # cost plausibility warning
scripts/repair-stock-valuation.ts (delete), scripts/sweep-hub-transactions.ts
messages/es.json, messages/en.json
```
