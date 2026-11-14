# Contracts: Till corrections

## POST /api/pos/tickets/:id/lines/:lineId/swap

Gate: module `pos` enabled; capability `pos` `edit`.

Request: `{ "productId": "<uuid>" }`

| Result | Status | Body |
|---|---|---|
| Swapped | 200 | `{ ok: true, ticket, stockWarning }` |
| Sale or line not found | 404 | `not_found` |
| Sale is void | 409 | `already_void` |
| Line is not a product | 409 | `line_not_product` |
| Unit price differs | 409 | `price_differs`, `{ oldUnitPrice, newUnitPrice }` |
| Legally valid document exists | 409 | `document_issued` |
| New product out of stock | 409 | `negative_stock`, `{ items: [{ itemName, requested, available }] }` |

`price_differs` and `document_issued` are the two answers the UI turns into "Anular y volver a
cobrar". `negative_stock` offers another product.

## Calendar window payload (existing load, extended)

Each ticket gains:

```ts
products: { description: string; qty: number; total: number }[]
partyId: string | null   // only if not already present
```

## scripts/repair-service-sale-stock.ts

```text
bun scripts/repair-service-sale-stock.ts --org <org id>            # preview, changes nothing
bun scripts/repair-service-sale-stock.ts --org <org id> --apply
```

Output: one row per sale and item (sale, movement, item, issued now, issued after, difference),
a list of refused sales with the reason, and totals per item. Exit code 0 when the plan is empty.
