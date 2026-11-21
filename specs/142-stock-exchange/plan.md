# Implementation Plan: Trade products with a supplier (canje)

**Branch**: `feat/142-stock-exchange` (hub, base `master`) | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

## Summary

Add a fifth stock entry type, `exchange`. Its lines reuse the adjustment line shape: an outgoing line has `fromWarehouseId`, an incoming line has `toWarehouseId`.

At registration, inside the existing submit transaction:
- the outgoing legs are valued at the locked bins' averages;
- that total is spread over the incoming lines by quantity, with rounding on the last line;
- the computed unit costs are written to the incoming lines, then all legs post through the normal path.

Owner, 2026-11-21: "Please apply the stock change after implementing the stock abonos feature". The FACES trade (20 Filler → 20 Volume) is recorded with this feature once it is live.

## Technical Context

- **Stack**: TypeScript strict, SvelteKit 2 / Svelte 5, Drizzle over postgres.js. The engine is `stock.service.ts` (`submitEntryInTx`), `stock.logic.ts` and `src/lib/stock/entry-legs.ts`.
- **Storage**:
  - `stk_entries.type` is free text: no CHECK constraint (prod `pg_constraint`, 2026-11-21), so no migration.
  - Incoming unit costs live in `stk_entry_lines.rate`, as for receipts.
- **Finance**:
  - Consumption cost reads `type = 'issue'` only (`finance.service.ts:932, 1042`; `stock.service.ts:2283`).
  - Purchases come from receipts linked to `fin_purchases`.
  - So an exchange is excluded from spending and from consumption cost with no finance change. A regression test pins this.
- **Testing**: Vitest (bun); pure tests for legs/validation/rate split; service tests for submit; mounted tests for the form and detail.
- **Constraints**:
  - No new route: the existing `POST /api/stock/entries`, `PATCH /:id` and `/:id/submit` accept the new type through `ENTRY_TYPES`.
  - Every string goes through `m.*()` (es/en).
  - Design tokens only.

## Constitution Check

| Principle | Status |
|---|---|
| Spec before code | ✅ spec.md + FigCraft demo (meta #1066); owner asked to implement on 2026-11-21 |
| AS-IS/TO-BE/DELTA | ✅ spec.md |
| Slice-scoped delivery | ✅ one hub PR from a fresh `origin/master` clone; gates in the foreground |
| Required build steps | ✅ no new route/page (RBAC + route contract unchanged); i18n keys; tokens; `lint:design` + `lint:tokens` |
| Data gates | ✅ tagged data: owner merges; the FACES trade is posted only after deploy and after the owner confirms the count question |

## Design

1. **`entry-legs.ts`**:
   - `ENTRY_TYPES` gains `'exchange'`.
   - `expandLine('exchange')` = the adjustment legs (from → −qty, to → +qty at `line.rate`).
2. **`stock.logic.ts`**:
   - `validateEntryLine('exchange')`: exactly one warehouse per line; no rate required.
   - New `validateExchange(lines, partyId)` returns codes: `exchange_party_required`, `exchange_needs_both_sides`, `exchange_item_both_sides`.
   - New pure `splitExchangeValue(outValue, inLines)` returns per-line unit rates. Shares are proportional to qty; the rounding remainder (to 4 dp of value) goes on the last line; the values sum exactly to `outValue`.
3. **`submitEntryInTx`**, for `exchange`, after locking the bins:
   - value the out lines sequentially against the locked bins (`computeLegValue`);
   - compute the in rates with `splitExchangeValue` and update `stk_entry_lines.rate` for the in lines;
   - then run the normal leg loop with the out lines first.
   - The negative-stock guard applies to the out side as today, with the message naming the item, the on-hand qty and the requested qty.
4. **Create/update**: the exchange validation runs on submit (drafts may be incomplete), and `POST` also accepts a draft. Currency conversion does not apply, because no rates are typed.
5. **UI**:
   - `/stock/entries/new`:
     - a "Canje" option (icon `ArrowRightLeft`) in the type control;
     - in exchange mode, a required supplier picker plus two line sections, "Entregas" (`fromWarehouseId`) and "Recibes" (`toWarehouseId`);
     - a live value preview from the page's on-hand info (average × qty);
     - "Guardar borrador" and "Registrar" as today.
   - Detail page: for `exchange`, lines are grouped into Entregas and Recibes, with unit cost and value.
   - List and movements: `ENTRY_TYPE_BADGE.exchange` (`info` tone, `ArrowRightLeft`); `MovementKind` gains `exchange`; type labels.
6. **i18n**: `stock_type_exchange` = "Canje"/"Exchange", plus the section titles, preview line, errors and hint.

## Project Structure (hub)

```text
src/lib/stock/entry-legs.ts                 # type + legs
src/server/services/stock.logic.ts          # validateExchange, splitExchangeValue
src/server/services/stock.service.ts        # submitEntryInTx exchange branch
src/server/services/stock-entries-read.service.ts  # MovementKind
src/lib/components/stock/entry-type-badge.ts
src/routes/(app)/stock/entries/new/PageBody.svelte (+ entry-lines.ts helpers)
src/routes/(app)/stock/entries/[id]/PageBody.svelte
src/routes/(app)/stock/entries/PageBody.svelte
messages/es.json, messages/en.json
```

## Complexity Tracking

None.
