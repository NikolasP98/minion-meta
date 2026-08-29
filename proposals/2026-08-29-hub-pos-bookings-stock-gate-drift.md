---
id: 2026-08-29-hub-pos-bookings-stock-gate-drift
title: Fix module-state stock-gate drift between /pos/appointments and /scheduling/bookings
status: draft
created: 2026-08-29
updated: 2026-08-29
spawned_spec: 2026-07-22-personal-org-differentiation-spec
repos: [minion_hub]
tags: [logic]
value: 3
effort: S
source: review-fix-299e3f17
---

# Fix module-state stock-gate drift between /pos/appointments and /scheduling/bookings

## Problem

`src/server/scheduling/load-bookings-view.ts` (spec `2026-08-17-hub-pos-appointments-fork-spec`,
slice 3) extracted the shared `BookingsView` loader and gave each route a `stockGate` option:
`'effective'` (scheduling) consults `effectiveModuleEnabled`, so a personal-kind org skips the
stock-accrual read; `'module-state'` (POS) reads the raw `stock` module toggle and still attempts
the read fail-soft. That means `/pos/appointments` can report stock enabled for a personal-kind
org where `/scheduling/bookings` reports it disabled for the same org — a shipped drift, not a
regression introduced by the fork (the POS route already read the raw toggle pre-fork). The fork
spec (§7) forbids fixing kind-leaks as part of the collapse, so the drift was preserved verbatim
and marked `TODO(handoff)` at `load-bookings-view.ts:50`.

The correct fix belongs to `2026-07-22-personal-org-differentiation-spec` WP1 (R6: cross-module
`effectiveModuleEnabled` semantics), which already lists "scheduling bookings loading stock
accruals" as a known kind-leak to close but was written before the POS/scheduling loader was
unified — it doesn't yet know `/pos/appointments` shares the same code path via `stockGate:
'module-state'`.

## Definition of done

- `/pos/appointments`'s `stockGate` option in its route loader switches from `'module-state'` to
  `'effective'` (or the option is removed and both routes always use `effectiveModuleEnabled`),
  so a personal-kind org sees the accrual chip gated identically on both routes.
- `BookingsStockGate` type and the `module-state` branch in `load-bookings-view.ts` are removed
  once no caller needs them.
- Existing POS/scheduling characterization tests updated to assert the new (unified) gating
  behavior for a personal-kind org.

## Out of scope

Any other kind-leak listed in WP1 R6 (CRM Connections counts, global search, finance COGS,
settings nav, assistant/cron actions) — those are already tracked under
`2026-07-22-personal-org-differentiation-spec` WP1 and are unrelated to the POS/bookings loader.
