---
id: 2026-11-18-hub-recipe-substitutes-spec
title: Catalog recipes accept substitute items (one or the other), picked at completion
stage: spec
status: review
pass: 1
created: 2026-11-18
updated: 2026-11-18
repos: [minion_hub]
verdict: pending
type: feature
tags: [ui, data]
related: [2026-11-14-hub-till-corrections-spec, 2026-11-18-hub-stock-entry-item-names-spec]
---

# Substitute items in a catalog recipe

## 0. Product

A recipe can say "Dysport 75 **or** INIBO 42" instead of listing both. Groups nest
(`X + (Y | (W + Z))`). Each group has a default: bookings reserve it, product sales issue it, and costs use it.
When a booking is completed, the operator answers "¿Cuál se usó?" with one tap, and only that option leaves stock.
Today, 9 FACES toxin recipes list two toxins, so every booking reserves both.

The canonical [Spec Kit specification](131-recipe-substitutes/spec.md) holds the AS-IS evidence, TO-BE, DELTA
and acceptance scenarios.

## FigCraft demo

[recipe-substitutes.figcraft](131-recipe-substitutes/recipe-substitutes.figcraft): recipe editor and completion
dialog for "Botox Full Face", as-is and to-be.

## Verification

- Unit tests `src/lib/stock/recipe-choice.test.ts` (defaults, picks, nesting, per-recipe scoping, path
  validation, "O…", make default) and `src/lib/components/scheduling/consumption-lines.test.ts` (only the pick
  is posted).
- After deploy, before data changes: every existing recipe costs and reserves the same (no row has a path).
- After the owner converts "Botox Full Face": a new booking reserves one toxin; completing it with INIBO picked
  issues INIBO only and releases the Dysport reservation.

## Out of scope

Package composition, `stk_item_components.choice_group`, rewriting prod recipes (owner action after deploy).

## Human gates

The migration adds a nullable column on deploy. The owner approves the spec and the demo, merges the hub PR, then
converts the toxin recipes (or approves a script that does).
