# Data model: Till corrections

No table or column is added or changed.

| Entity | Table | Use here |
|---|---|---|
| Sale | `pos_tickets` | `stock_entry_id` points at the live stock movement; restamped by a repost |
| Sale line | `pos_ticket_lines` | `kind` decides stock at the sale; a swap updates `fin_product_id` and `description` |
| Stock movement | `stk_entries` | `metadata.source = 'pos'`, `sourceId = ticket id`; status `submitted` → `cancelled` on repost |
| Reservation | `stk_accruals` | unchanged: `open` → `realized` or `released` |
| Audit | existing audit log | one `pos_ticket_line` change row per swap: old and new product, actor |
| Electronic document | `pos_emissions` | read only: accepted and non-beta = legally valid |

## State: a sale's stock

```text
no movement ──post──▶ submitted ──repost──▶ cancelled + new submitted
                          │
                          └──void──▶ cancelled
```

A sale with treatments only stays at "no movement" for its whole life.

## Validation rules

- Swap: sale `submitted`; line `kind = 'product'`; new product active, different from the current
  one, same unit price; stock available for the new product's recipe.
- Repair: organisation given explicitly; a sale is repaired only when its product quantities are
  unchanged by the repost.
