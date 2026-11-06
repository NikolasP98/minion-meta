---
id: 2026-09-30-hub-appointment-services-table-price
title: New-appointment services table — Price column has no data source
status: done
created: 2026-09-30
repos: [minion_hub]
tags: [ui, ux, data]
---

# Open end from the new-appointment services-table slice

Branch `feat/pos-new-appointment-services-table` (hub) replaced the pill list
on the tray "New appointment" form (`src/lib/components/scheduling/AppointmentForm.svelte`)
with a compact `DataTable variant="plain"` (Service · Duration · Price · remove),
per owner feedback on 2026-09-30, and moved the CRM customer picker to the top
of the form.

## The gap

The **Price** column always renders "—" (`formatMoney(undefined)`). Scheduling
event types (`schedEventTypes`) carry no price field anywhere server-side:

- `listEventTypes` in `src/server/services/scheduling.service.ts` never joins
  a product/price table.
- Neither `/pos/appointments/+page.server.ts` nor
  `/pos/appointments/new/+page.server.ts` select a price for the event types
  they load.

`TODO(handoff)` left in code directly above `svcPrice()` in
`AppointmentForm.svelte` naming this same gap and the fix direction (join on
`productId` in `listEventTypes`).

## Proposed fix

Join `schedEventTypes` → its linked sellable/product (however that link
already exists elsewhere in the codebase, e.g. wherever POS catalog resolves
a service's sellable price) inside `listEventTypes`, and select that price in
both `+page.server.ts` loaders above. Then `AppointmentForm.svelte`'s
`svcPrice()` needs no change — it already reads whatever price field is on
the picked service object; it just needs that field to stop being `undefined`.

## Scope check before starting

Confirm whether event types are always backed by a sellable/product (1:1),
or whether some event types have no linked product (service-only, no price)
— in that case the Price column should keep showing "—" for those rows by
design, not as a bug once the join lands.


## Resolved 2026-10-08

Hub `feat/visit-event-payment`: `listEventTypes` LEFT JOINs `fin_products` on `product_id` (active only) and returns `price` + `currency` (org POS currency, `fin_products` has no currency column); both appointment loaders and the calendar loader select them; `svcPrice()` returns `et.price`. `null` when the event type has no product — rendered "—", never 0.
