# POS sell toolbar adjustment

Directly requested during the local development review on 2026-11-09. This is a small reversible UI adjustment recorded alongside the current feature, rather than a separate proposal/spec pair. It changes no financial operation or authorization behavior.

## AS-IS

`src/routes/(app)/pos/sell/PageBody.svelte` places an expanding search input and Today's activity in one row, with filter/group/card/view actions on another. The search consumes most of the available catalog width.

## TO-BE

Search uses the existing Accounts/DataTable transparent underline style through a shared CompactSearch primitive, capped at 240px and alone on the left. Activity, filters, grouping, card fields and view controls form a right-aligned group. The activity trigger reads Activity / Actividad with its existing history icon; the popover retains its day-specific title. Active filter chips align with the controls. Small layouts wrap without horizontal overflow, preserving44px touch targets.

## DELTA

Rearrange the existing toolbar markup and scoped styles; extract the existing DataTable search recipe into CompactSearch and reuse it in Sell, retaining all action handlers, search bindings, input references and keyboard shortcuts. Add a short activity-trigger localization key. Actual desktop/mobile geometry, a Bundle search-and-clear check, and opening Activity verify the behavior. No product is added to a cart, shift closed, sale submitted or payment changed during UI qualification.
