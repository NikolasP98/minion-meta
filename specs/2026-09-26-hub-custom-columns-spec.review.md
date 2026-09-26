---
spec: 2026-09-26-hub-custom-columns-spec
pass: 2
verdict: approved
reviewer: sol-guardians-dob-and-verified-backfill
created: 2026-09-26
score_slice_size: 7
score_dod_verifiability: 9
score_scope_containment: 9
score_impact_zones: 9
score_collisions: 9
score_testability: 9
---

# Specification review

## Standards pass — approved

Sol backend reviewer approved pass 2 after clarifying campaign-only row identity, server-owned actor/time audit fields, deterministic archived-option retention, case-insensitive active name uniqueness and restore conflicts, explicit-null versus missing-value wire shape, and compare-and-swap bodies. Property locking serializes definition/value races. Type/default validation and forced org RLS remain required.

## Requirements pass — approved

Independent Sol reviewer approved pass 2 after freezing the Team employee/member permission matrix, campaign child-row unavailability, conservative sensitive-field policy, disabled CRM custom server sort/filter/export, and custom annotation allowance on closed finance documents. The spec supplies traceable verification for all eight adapters and browser coverage of all six property types. Future formula guards and further table admission remain explicit follow-ups with no fake type choices.

## Implementation review — approved

Sol reviewer guardians_dob approved exact Hub commit caee27476b36e16c762bac8efd0de6066c6eccdb after the UI, adapter and formatting corrections. Sol reviewer verified_backfill independently approved backend/adapters and this documentation scope. The final type-only API signature correction introduced no behavior change. All required CI checks and the Vercel preview passed before authorized merge. Runtime evidence and deployment identity are recorded in the specification.
