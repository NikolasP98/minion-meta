# Contracts: Till corrections

## POST /api/pos/tickets/:id/lines/:lineId/swap

Gate: module `pos` enabled; capability `pos` `edit`.

Request: `{ "productId": "<uuid>", "expectedProductId": "<uuid of the product the user saw>" }`

| Result | Status | Body | Next step shown |
|---|---|---|---|
| Swapped | 200 | `{ ok: true, ticket, stockWarning }` | — |
| Sale or line not found | 404 | `not_found` | — |
| Sale is void | 409 | `ticket_void` | none offered |
| Line is not a product | 409 | `line_not_product` | — |
| Line holds another product now | 409 | `line_changed`, `{ currentProductId }` | reload the line |
| Out of stock | 409 | `negative_stock`, `{ items: [{ itemName, requested, available }] }` | choose another product |
| Catalogue price differs | 409 | `price_differs`, `{ oldUnitPrice, newUnitPrice }` | guided correction |
| Legally valid document | 409 | `emitted` | guided correction |
| Other stock would change | 409 | `stock_drift`, `{ items }` | guided correction |
| Month closed by accounting | 409 | `period_locked` | ask accounting to reopen |
| Reconciled to an invoice | 409 | `reconciled` | undo the reconciliation first |
| Another change in progress | 409 | `operation_conflict` | retry |

## Calendar bookings payload (existing load, extended)

Each entry of `CalendarBooking.tickets` gains:

```ts
products: { description: string; qty: number; total: number }[]
```

## scripts/repair-service-sale-stock.ts

```text
bun scripts/repair-service-sale-stock.ts --org <org id>            # preview, changes nothing
bun scripts/repair-service-sale-stock.ts --org <org id> --apply
```

Output: one row per sale and item (sale, movement, item, issued now, issued after, difference),
a list of refused sales with the reason, and totals per item. Exit code 0 when the plan is empty.
