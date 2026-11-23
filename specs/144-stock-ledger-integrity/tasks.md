# Tasks: spec 144 — stock value always adds up

Hub branch `fix/144-stock-ledger-integrity`, created from `feat/142-stock-exchange` (PR #705). Draft PR base `master`, body says "stacked on #705". Run the gates in the foreground; never run the full suite with prod env.

## Engine (FR-001)
- [ ] T001 `applyLedgerDelta` returns `residual` (negative-rate carry + zero-qty drop). Pure tests: healthy posting → 0; drain to 0 with leftover → residual; negative-rate case → residual.
- [ ] T002 Submit and cancel post a value-only residual row when |residual| > 0.005. PGlite service tests (extend `stock.exchange.test.ts` style):
  - cancel a receipt after partial issue at a different average;
  - drain to zero after a cancel reversal.
  - Assert Σ value_delta = qty × rate for the item after each.

## Detection (FR-002)
- [ ] T003 `ledgerValueGaps(ctx)`: per item+warehouse gap > 0.01 and the first diverging row. PGlite test with a seeded gap.
- [ ] T004 `/stock` overview:
  - the warning line appears only when there are gaps;
  - "Ver" lists item, amount (formatMoney) and the first diverging movement (link to the item's movements).
  - i18n. Mounted test: hidden at 0, shown at 2.

## Cleanup (FR-003, FR-004)
- [ ] T005 Delete `scripts/repair-stock-valuation.ts`; update `scripts/sweep-hub-transactions.ts` and any doc that lists it.
- [ ] T006 Verify last purchase cost = receipts only (already in #705); no change needed beyond the existing tests.

## Receipt cost warning (FR-005)
- [ ] T007 Pure `costPlausibility(unit, avg)` (≥2.5 or ≤1/2.5; no avg → none). Tests, including STE-00559 (×21.9) and STE-00560 (×3.0).
- [ ] T008 New-entry form: a warning under the line with "Es el total", which flips that line to total mode. It never blocks. Mounted test.

## Gates and PR
- [ ] T009 Scoped vitest, `bun run check`, `lint:design`, `lint:tokens`, content-contract ratchet.
- [ ] T010 Draft PR `fix(stock): stock value always adds up — residuals booked, gaps shown, unit-vs-total warning`, linking meta #1072. The owner merges.
