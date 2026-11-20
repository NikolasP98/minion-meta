---
id: 2026-11-17-hub-booking-product-consistency-handoff
title: FACES booking product consistency (spec 126) - open implementation ends (handoff ledger)
status: draft
created: 2026-11-17
updated: 2026-11-17
repos: [minion_hub]
effort: M
source: spec-126-implementation
---
# Hub booking product consistency (spec 126): open ends after the audit-fix pass

Branch `feat/126-booking-product-consistency` (hub clone `hub-faces-F5`).

AS-IS: `BookingsView.svelte` still shows the stock estValue/realizedValue money chips (read outside the
versioned facets); the detail's `contact` and `tags` are read without the scheduling dataset handle.
TO-BE: the chips show quantity from the stock facet or sit behind finance view; contact/tags are read
through the scheduling handle.
DELTA / open (each has a `TODO(handoff)` at its site): `BookingsView.svelte` money chips;
`booking-product-wire.ts` contact/tags.
Owner decision pending (not changed): finance gating of payment actions (Charge, sale, cancel-paid, delete
need the payment facet, which needs finance view).
