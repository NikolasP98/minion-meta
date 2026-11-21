# Tasks: spec 142 — canje (stock exchange)

One hub PR, branch `feat/142-stock-exchange`, base `master`. Run the gates in the foreground. Never run the full suite with prod env.

## Phase 1 — Engine (FR-002, FR-003, FR-005)

- [ ] T001 `src/lib/stock/entry-legs.ts`: add `'exchange'` to `ENTRY_TYPES`; `expandLine` exchange = adjustment legs. Test in `entry-legs` tests.
- [ ] T002 `stock.logic.ts`: `validateEntryLine('exchange')` (exactly one warehouse, no rate) and `validateExchange(lines, partyId)` (party required, both sides, no item on both sides). Unit tests.
- [ ] T003 `stock.logic.ts`: `splitExchangeValue(outValue, inLines)`. Tests:
  - 20 @ 250 → 250;
  - 3 + 1 split of 1000 → 750/250;
  - uneven split sums exactly (rounding on the last line);
  - outValue 0 → rates 0.
- [ ] T004 `stock.service.ts` `submitEntryInTx`, exchange branch:
  - validate;
  - value the out lines on the locked bins;
  - write the in rates;
  - post out legs then in legs.
  - Negative stock refusal names the item, on-hand and requested qty.
  - Service tests: success (bins, ledger values sum to 0); shortage refusal writes nothing; cancel reverses both sides.

## Phase 2 — Reads and finance (FR-006, FR-007)

- [ ] T005 `entry-type-badge.ts` (`exchange`: info, ArrowRightLeft); `stock-entries-read.service.ts` `MovementKind`; list type labels. Tests.
- [ ] T006 Finance regression test: an exchange contributes 0 to consumption cost (the `type = 'issue'` readers) and to purchases.

## Phase 3 — UI (FR-001, FR-004, FR-009)

- [ ] T007 i18n keys (es, en): type, "Entregas", "Recibes", preview "Sale {out} → Entra {in} · sin pago", hint "Valor estimado a hoy…", the three validation messages. Run `i18n:compile`.
- [ ] T008 `/stock/entries/new`, exchange mode:
  - type option;
  - required supplier;
  - two sections built on the existing line editor;
  - live preview from on-hand averages;
  - save draft and register.
  - Mounted test.
- [ ] T009 `/stock/entries/[id]`: exchange detail grouped into Entregas/Recibes with unit cost and value. Mounted test.

## Phase 4 — Gates and PR

- [ ] T010 Run: scoped vitest (the touched test files), `bun run check`, `bun run lint:design && bun run lint:tokens`.
- [ ] T011 Draft PR to `master` titled `feat(stock): trade products with a supplier (canje)`, body linking meta #1066. The owner merges.

## After deploy (owner-gated)

- [ ] T012 Record the FACES trade (20 HA Saypha Filler → 20 HA Saypha Volume, supplier per the owner) as a canje, only after the owner confirms how it relates to the 18/11 count.
