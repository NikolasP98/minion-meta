# Quickstart: validating till corrections

Work in a clean hub clone (never the owner's local checkout). After `bun install`:
`bunx svelte-kit sync && bun run i18n:compile`.

## S1

```bash
bun run test src/server/services/pos.tickets.test.ts
HUB_TEST_DB_URL=... bun run test src/server/services/scheduling-bookings-accrual.test.ts
```

Expected: a mixed sale issues the product only; sell → schedule → complete issues the recipe once.

## S2

```bash
bun scripts/repair-service-sale-stock.ts --org <FACES org id>
```

Expected preview totals: HA Saypha Volume Plus 4, HA Saypha Volume 1, HA Saypha Filler 1,
Dysport 690, Ácido Desoxicólico 18. The owner runs `--apply`, then the preview again: empty plan.

## S3

On a QA sale that charges a visit and has a zero-price product: the visit block shows the marker
and the hover card lists `1 × <product> (regalo)`. Then `bun run lint:design && bun run lint:tokens`.

## S4

On a QA sale: swap a zero-price product for another zero-price product. Old item +1, new item −1,
total and payments unchanged, one audit row. Swap to a product with a different price: the dialog
offers "Anular y volver a cobrar".

## S5

Accept the guided action: the sale is void, the till opens with the same client and the corrected
lines.
