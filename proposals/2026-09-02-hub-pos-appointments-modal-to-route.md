---
id: 2026-09-02-hub-pos-appointments-modal-to-route
title: POS appointments "+New" is still a modal — reuse the in-page BookingCreateForm route
status: draft
created: 2026-09-02
updated: 2026-09-02
repos: [minion_hub]
tags: [ux, scheduling, pos, assistant]
value: 4
effort: S
source: hub PR feat/booking-route-picker (assistant navigation round 3)
---

# POS appointments "+New" is still a modal

## Problem

`/scheduling/bookings` no longer books inside a `Modal`: the form lives on
`/scheduling/bookings/new` (`src/lib/components/scheduling/BookingCreateForm.svelte`),
uses the shared POS `CustomerPicker` (party spine + quick-add) instead of a hand-rolled
contact search, and is what the assistant guides / fills (`BOOKING_FORM` in
`src/lib/assistant/catalog.ts`). The booking POST accepts `partyId` and resolves the
CRM contact server-side.

`/pos/appointments` (`src/routes/(app)/pos/appointments/+page.svelte`) still carries
its own copy of the old modal (the fork tracked by `2026-08-17-hub-pos-appointments-fork`),
with two POS-only extras the shared form lacks: a forced staff/resource `Select` and the
`overrideConflicts` checkbox. The `Picker` windows it opens now render above the native
dialog (DraggableWindow is a `popover="manual"` re-parented into `dialog[open]`), so the
modal is usable, but the two surfaces have diverged again and the assistant cannot fill
the POS one.

## Proposal

1. Add optional `resources` + `allowOverride` props to `BookingCreateForm` that render the
   staff `Select` and the override checkbox (POST already accepts `forceResourceId` /
   `overrideConflicts`).
2. Point the POS "+New appointment" button at `/scheduling/bookings/new?return=/pos/appointments`
   (form already takes `returnTo`) or mount `BookingCreateForm` on a `/pos/appointments/new`
   route registered in the route-design manifest (six counts).
3. Delete the modal copy and its `nb*` state from the POS page.

## Pointers

- `TODO(handoff)` at `src/routes/(app)/pos/appointments/+page.svelte` (`let showNew`).
- Assistant catalog: the `client` field is required; `newClientName` (+`phone`) registers a
  walk-in through `CustomerPicker.add()`.
