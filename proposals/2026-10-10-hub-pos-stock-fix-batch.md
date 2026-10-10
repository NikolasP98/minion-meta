---
id: 2026-10-10-hub-pos-stock-fix-batch
title: Hub POS + Stock fix batch 2026-10-10 — open ends (zero price, prepaid drop, shift income menu, select cells, entry preview + provider)
status: draft
created: 2026-10-10
updated: 2026-10-10
repos: [minion_hub]
tags: [ui, ux]
effort: S
---

# Hub POS + Stock fix batch 2026-10-10 — ledger

Owner batch (seven items, four hub PRs: #458 stock select cells + record-preview
layout, #459 zero price + shift income menu, #460 stock-entry preview + provider
autofill, #461 prepaid-line drop/click). This file holds what each PR left open.

## AS-IS (hub master before the batch)

- A catalog line priced 0 was blocked at checkout ("Falta precio") by the shared
  money rule `lineMoneyMinor` (`zero_price`), client and server alike.
- The shift banner printed one pill per payment-method *id* with its total and a
  separate stale chip; no drill-down to tickets existed.
- A select / multi-select custom-property cell went blank while its picker was
  open (empty popover trigger) and printed plain text at rest while the picker
  rendered chips.
- The item record preview's STOCK card put a text-label row action in
  DataTable's fixed 76px sticky actions column, overlapping the Valor column.
- `/stock/entries/new` showed no on-hand figure per line, and
  `stk_items.default_supplier_party_id` had no reader.
- Dropping a prepaid service line onto the calendar fell back to an EMPTY
  create tray on a 409: `pickTime` carried only `ticketId`/`lineId`, and
  `AppointmentCreatePanel`/`BookingCreateDrawer` never forwarded
  `AppointmentForm`'s existing `initialPartyId`/`initialCustomerName`/
  `initialEventTypeId`/`lockCustomer` props.

## TO-BE (shipped in #458–#461)

Zero price chargeable (only negative rejected; client-only `missing_price` for
"no price set"); banner = one "Ingresos" trigger → two-level Popover (methods →
tickets, each a `PeekLink` modal to `/pos/tickets/[id]`), stale/open state as one
icon + Tooltip; select cells render the same `TagChip`s in both states;
`DataTable.rowActionsWidth` prop; per-line `before → after <uom>` preview via the
shared `expandLine` (moved to `$lib/stock/entry-legs.ts`) plus `≈ qty
<consumption uom>`; provider autofill exactly once; drop/click share
`scheduleLine()`, the fallback tray is prefilled, "Elegir hora" removed, click
opens the prefilled tray.

## Open ends (ledger)

1. **`zero_price` error code removed** (#459) — `invalid_amount` replaces it.
   Nothing in the repo references it; any external consumer grepping the string
   stops matching.
2. **Shift income level 2 is capped at 500 payments** per shift
   (`listShiftPayments` default limit, no pagination) and `/api/pos/shifts/current`
   has no server test for `?payments=1` (#459).
3. **Stock-entry preview is per line, not cumulative**: two lines on the same
   (item, warehouse) each preview from the same starting balance (#460).
4. **"Smart" unit preview reads stock ↔ consumption unit** (`consumption_uom` ×
   `units_per_stock_uom`); there is no purchase-unit column, so a purchase-pack
   conversion would need schema (#460).
5. **Absent bin = 0, not "?"** — `stk_bins` is a complete cache of the ledger
   (#460). Revisit only if bins ever become partial.
6. **Not browser-verified**: banner menu at 768px, Tooltip on the icon, entry
   preview wrap, autofilled provider name visible in the picker (#459, #460).
7. **BookingCalendar external-drop DOM wiring has no test harness** (#461).
   The direct-book path is reached only on a 1:1 product→service match; the
   fallback fires on a 409 (`SlotUnavailableError`: resource not assigned, outside
   availability, or conflict). A second hypothesis — that the full-area
   `.slot-layer-track` empty-space Button inside `.track` intercepts the native
   drop so `onslot` fires instead of `ondropexternal` — is unconfirmed either
   way: by the DOM spec the drop bubbles to `.track` and nothing calls
   `stopPropagation`, but mounting the 5000-line component in happy-dom to prove
   it hangs (same gap `merge-target.test.ts` records). `TODO(handoff)` sits on the
   `ondragover`/`ondrop` listeners. Closing move: a Playwright case dragging a
   fixture tray card onto a week slot and asserting the POST fires, or a
   vitest-browser decision for this component.
8. **Space on the tray card** while the prefilled tray is already open does not
   `preventDefault` (cosmetic scroll) (#461).

## DELTA

No further code proposed here; each item above is a follow-up slice with its
PR as the anchor.

## Addendum 2026-10-10 (evening) — calendar readiness drafts landed

Hub #439, #441, #442, #440 and #443 (re-opened as #464 after its stacked base
was deleted) were rebased onto the single-event model and merged the same day.
Owner rulings applied: one custom-property lane value per event, stored on the
lead (#440); the four assumed drop rules stand; per-service custom fields are
out of scope (HC-019 closed); status lanes stay view-only on a calendar drag
while the board's status column writes (#443).

New open ends:

9. **Delete the fan-deck code** — now unblocked (#442 and #443 landed):
   `fan-out.ts`, deck markup/drag handlers in `BookingCalendar.svelte`,
   `tests/e2e/ui-audit/pos-calendar-fan-drag.spec.ts`, the `fanOut` feature
   flag and the `cal_visit_expand_hint` keys, plus #439's `HC-016C` test that
   opts into `fanOut: true`.
10. **HC-018 transient "Unclassified" lane** — the append-only lane session
    reads every booking as `null` while the custom-property bundle is still
    loading, so a custom-column axis where every booking is classified still
    keeps an empty Unclassified lane for the session. One guard (do not push
    `null` while the bundle is loading) closes it.
11. **`.head-vo` badge carries a native `title`** for its long hint (#443),
    against the HC-023 convention of the shared Tooltip for truncated labels.
12. **HC-017 projection vs declared primary tag** — still the owner's product
    call; duplicate projection is what shipped.
13. **CI flake**: `notification-worker-disabled-artifact` once failed
    `private-worker-workflow-contract.test.mjs` ("publisher cancellation stops
    and removes only its cidfile-owned container") on a docker cancel race;
    green on rerun.
