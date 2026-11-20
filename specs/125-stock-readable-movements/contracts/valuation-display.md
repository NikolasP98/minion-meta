# Stock scalars without verified denomination

This movement slice has no admitted historical stock-currency provenance reader. Stored stock rate/value scalars do not carry a currency column. Their exact DTO keys and raw strings stay as selected in wire.md; this contract adds no currency/qualification key, FX conversion, table or writer. The semantic denomination of movement stock scalars is a constant **unverified**, not an optional implementer assumption.

## Source-backed observable change

At the pinned source, `entries/PageBody.svelte:7` imports formatMoney, `:83` formats line rates and `:330` formats computed amounts. Item detail's ledger rate cell calls fmtMoney at `items/[id]/PageBody.svelte:1088`; that local helper at `:315` defaults through formatMoney to PEN. `src/lib/utils/format.ts:75` onward explicitly defaults that formatter to PEN. None of those calls proves a historical stock denomination. A POS USD ticket or a current display-currency preference does not fix the omission.

For the entries expansion rate/amount cells and the item-ledger valuation-rate cell, render the admitted original rate/value string as escaped Svelte text, without a currency symbol or currency code, under a visible localized caption `Valuation currency unverified` / `Moneda de valorización no verificada`. The caption is adjacent to the movement section, remains available to assistive technology, and is present whenever any stock rate/value is displayed. Keep quantity and current/historical UOM captions separate. Do not prefix a stock scalar with ticket, invoice, finance-settings or default PEN currency.

The item ledger keeps its existing columns; `valueDelta` stays payload-only and gets no new column. Preserve the exact raw scalar in displayed cell/accessor/accessible text and in the global entries page-local export defined below. Do not round it through Number, formatMoney, Intl currency, truncation or a hidden formatter in an accessor. A scalar used only as a local sorting key never replaces its display/export bytes or financial evidence. Omitted/unavailable values stay unavailable, never zero or a currency-formatted dash.

The existing entry-line calculated amount may remain as the explicitly labeled **calculated stock scalar**, using an exact decimal multiply of the two decimal strings (`mulDecimal` in `src/lib/components/stock/decimal.ts`, BigInt scaled; 3 x 0.1 = `0.3`, no float noise), not a new valuation formula. Missing rate or a non-plain-decimal operand yields unavailable; remove the existing amount accessor's `??0` fallback. A result is the trimmed plain decimal string as calculated display/export evidence, distinct from a recorded ledger value and never a denominated invoice/COGS amount. Preserve original qty/rate strings in the line DTO. No calculated amount is injected into ledger/source fingerprints or replaces a stored value.

The overview recent card retains its actual existing columns (item/warehouse/quantity/entry context), sorting and limit of 20; do not add rate/value/currency columns to satisfy a shared fixture. If the selected projection carries a raw stock scalar without a visible column, no new money display is implied. Apply the same unverified rule to any selected movement scalar actually rendered, including accessible/export paths; do not invoke a money formatter for it.

These are display semantics only. Existing numeric admission and record/source authority in wire.md/admission-snapshot.md remain mandatory. No new finance field tier is invented for stock, and no previously denied or omitted data becomes available. Source ticket/invoice billing money is a distinct field admitted by its own policy, not rendered as a stock-denomination proof by this slice.

## Global entries CSV export schema

The global entries export keeps the existing DataTable exporter unchanged (`DataTable.svelte:3159–3185`): one CSV row per parent movement in the current page's filtered and sorted view, with the columns ticked in the existing export dialog, comma separators, CRLF row ends, the quoting of `toCsv` (`src/lib/export/table-export.ts:18–24`) and a UTF-8 BOM (`table-export.ts:150`). XLSX export uses the same rows. Existing columns keep their keys, order and export values; for example `posted` and `created` keep their `YYYY-MM-DD` UTC export values and `lines` keeps the line count. No row per line, second file, nested-table export or DataTable/table-export change is selected.

Nested line facts are exported through one new parent column in the entries PageBody:

| Property | Value |
|---|---|
| Key | `lineDetails` (the key `lines` already holds lineCount) |
| Header | `Lines (valuation currency unverified)` / `Líneas (moneda de valorización no verificada)`, from the message catalogs |
| Position | Immediately after the existing `lines` column |
| Visibility | `defaultHidden: true` and `exportDefault: true`: not shown in the table, ticked by default in the export dialog |
| Cell value | `exportValue` returns `JSON.stringify(array)`, with one object per admitted line in `(lineNo, id)` order |
| Object keys, in this order | `lineNo` (number), `itemCode` (string or null), `itemName` (string or null), `qty` (string), `uom` (string or null), `rate` (string or null), `calculatedAmount` (string or null), `fromWarehouse` (string or null), `toWarehouse` (string or null) |

Value rules:

- `qty` and `rate` are the original `LineWire` strings, byte for byte. No locale grouping, rounding, currency symbol or code is applied.
- `calculatedAmount` is the calculated stock scalar defined above: the exact decimal product (`mulDecimal`), otherwise `null`.
- `itemCode` and `itemName` come from `itemsById[itemId]`; a missing key gives `null` for both. `fromWarehouse` and `toWarehouse` come from `warehousesById`; a null or missing ID gives `null`.
- An entry whose admitted line array is empty exports `[]`.
- The column exists only in the full projection. base_values_only and identity_only follow the export rule in [wire.md](wire.md#exact-variants) and never emit it.
- Only permitted labels from the same dictionaries as search and accessible text appear; no source, party or metadata field is added to the array.

Required test, in `src/routes/(app)/stock/entries/page.movements.mounted.test.ts`: mock `$lib/export/table-export` and capture the rows passed to `downloadCsv`. Fixture: entry A with two lines (item Faja M, UOM `caja`, rate `12.3456789`, qty `2`; item Faja L, UOM `und`, rate null, qty `1.500`, transfer warehouses), entry B with zero lines, and a third entry excluded by an active local type filter. Assert the header row has the localized `lineDetails` header right after the `lines` header; A's cell equals the exact JSON string with keys in the order above, `calculatedAmount` `"24.6913578"` and `null`; B's cell is `[]`; the filtered entry is absent; no cell contains `S/`, `PEN`, `USD` or `$`. Also assert that `toCsv` quotes the JSON cell and doubles its inner quotes.

## Scope and known existing limitation

This change is limited to the three movement projections and their existing controls. Item-bin valuation cards (`items/[id]/PageBody.svelte:1032` and the valuation-total section), overview total-valuation KPI and valuation chart (overview `PageBody.svelte:26`, `:69` and `:72`), and other ordinary stock surfaces still use their legacy formatters; this slice does not claim to qualify or repair those values. The parent proposal must retain a separate follow-up for their missing denomination provenance. That existing limitation is not an unreviewed task silently delegated to this implementation. No shared formatMoney helper or unrelated chart/card behavior is changed here.

When implementation is authorized, retain `TODO(handoff): qualify historical stock denomination before currency formatting; see parent FACES follow-up proposal` at any remaining affected source callsite owned by that follow-up. Record the exact existing callsites and the proposed comment in the parent proposal before final handoff.

## Required counterexamples in existing qualification

Extend the already selected loader/mounted/native/browser behaviors rather than register a seventh native test. Use synthetic raw values with many decimal places, positive/negative values, zero and very small finite strings. Set a linked ticket's actual billing currency to USD, change current display currency between requests and include another org's currency: stock cell/accessor/CSV/accessible output remains the same raw scalar with the unverified caption and no S/, $, EUR/PEN/USD label. A billing-only display does not appear through a stock source label. Verify no scoped movement path calls a money formatter, while unchanged unrelated chart/card mocks are outside that assertion's scope.

Test null line rate, nonfinite calculated amount and every full/base_values_only/identity_only omission branch: no fabricated 0 or inferred denomination; hidden values are absent from CSV/search/accessible text. Preserve the recent card's actual columns and no-export behavior. Browser qualification checks the visible localized caption and cell text; native tests prove raw database strings and policies are unchanged, not a browser screenshot. Numeric/recovery writer tests belong to their owning features, not this read-only slice.
