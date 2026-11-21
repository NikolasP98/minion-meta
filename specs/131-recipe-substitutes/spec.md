---
id: 131-recipe-substitutes
title: Substitute items in a catalog recipe (one or the other, picked at completion)
stage: spec
status: draft
verdict: pending
pass: 1
created: 2026-11-18
updated: 2026-11-18
repos: [minion_hub]
tags: [ui, data]
related: [120-till-corrections]
---

# Feature Specification: Substitute items in a catalog recipe

**Feature Branch**: `feat/131-recipe-substitutes` (hub, base `master`)

**Created**: 2026-11-18

**Status**: Draft

**Input**: Owner, 2026-11-18: "the original proposal was for the procedure to consume either/or the selected products. This was to avoid creating a single catalog item that depends on consuming a given article. I want you to implement a way to add substitute items to a catalog item. For example, a rhino procedure can use either 'article A' or 'article B' (exclusive; not both)." Logic can nest: `A + (B | C)`, `A | (B + C)`, `X + (Y | (W + Z))`. "The interface for when the user is picking which one is applied should be simple and direct."

## AS-IS (observed 2026-11-18, prod read-only)

- A recipe (`stk_consumption`) is a flat list: every row is consumed. There is no way to say "one of these".
- FACES works around it by listing every toxin it might use. 9 recipes do this, for example `B01 Botox Full Face = Dysport 75 + INIBO 75` and `TM Toxina Masetero = Dysport 180 + INIBO 180`. `CB Control Botox` lists three toxins at 0.
- Effect: each booking of these services **reserves both toxins** (3 open bookings reserve 225 Dysport and 225 INIBO each, 2026-11-18). Before spec 120, a till sale **issued both** (the 13 sales repaired on 2026-11-18). Completing a booking only stays right if staff zero out the toxin not used, by hand, every time (17/11: INIBO 42 typed, Dysport cleared).
- Evidence: hub `stock-accruals.service.ts` `accrueConsumption` sums every mapped row; `ConsumptionConfirmDialog.svelte` lists every row with its default.

## TO-BE

- A recipe row may be a **substitute**: "Dysport 75 **or** INIBO 42". Substitutes nest to any depth, and a substitute option may hold several items consumed together.
- Each group of substitutes has a **default** (shown first, marked "Predeterminado"). Wherever nobody is there to pick, the default is what counts:
  - a booking reserves the default;
  - a till sale of a product with a recipe issues the default;
  - recipe cost, invoice previews and service-issue previews use the default.
- **Completing a booking** asks one question per group, "¿Cuál se usó?", as a row of buttons (one per option, default selected). Only the picked option's supplies are shown and posted. Picking a different option needs one click; the supplies under it keep their editable quantities.
- **The catalog recipe editor** keeps each row's actions in one right-aligned column of lucide icon buttons, each with a tooltip:
  - Split: add a substitute to that row ("Agregar sustituto").
  - Trash2: remove the row.
- Each option has a header line: "Opción N", then the "Predeterminado" badge or "☆ Usar como predeterminado", then "+ Agregar" on the right. "+ Agregar" adds an item consumed together with the option's others.
  - Deleting a supply works as today. A group left with one option shows as plain rows.
- Invariants:
  - A recipe with no substitutes behaves exactly as today. Every existing row is unchanged.
  - An item appears once per recipe.
  - Never more than one option of a group is reserved, issued or posted.

## DELTA

| Transition | Proof |
|---|---|
| recipe rows gain an optional substitute position (`choice_path`); null = always consumed | migration `20261118140000_stk_consumption_choice_path.sql` (nullable + format CHECK); schema column |
| booking reserve, product sale issue, invoice/service preview and recipe cost: all rows → default branch only | `recipe-choice.test.ts` "takes every default when nobody picks", "scopes choice groups per recipe"; the five readers call `defaultBranch` |
| completion dialog: one row per item → one "¿Cuál se usó?" choice per group, only the pick posted | `consumption-lines.test.ts` "posts the default when nothing is picked" / "posts only the picked substitute" |
| reservation that held both toxins → the unpicked one is released at completion | existing `realizeAccrualsInTx` branch "accrued but not consumed in the final issue → released" (unchanged) |
| recipe editor: flat list → option headers ("Opción N", default badge / "Usar como predeterminado", "+ Agregar") and right-aligned Split / Trash2 icon actions | `recipe-choice.test.ts` "or… on a lone row adds an option; on a shared row it nests", "make default swaps" |
| incoherent substitute paths are refused at save | `choicePathError` tests; `updateSellable` throws `invalid_choice_path` (400) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Pick the toxin actually used (Priority: P1)

At completion of a Botox appointment, the operator sees "¿Cuál se usó? [Dysport] [INIBO]" with Dysport selected and its 75 units below. They tap INIBO, adjust 75 → 42, and confirm. Only INIBO 42 leaves stock; Dysport's reservation is released.

**Why this priority**: this is the error staff hit today and fix by hand.

**Independent Test**: a recipe `Dysport 75 | INIBO 42`; complete a booking picking INIBO; the stock movement has one line, INIBO 42.

**Acceptance Scenarios**:

1. **Given** a booking of a service whose recipe is `Dysport 75 | INIBO 42`, **When** the operator completes it without touching the choice, **Then** Dysport 75 is issued and nothing of INIBO.
2. **Given** the same booking, **When** the operator picks INIBO, **Then** INIBO 42 is issued and the Dysport reservation is released.
3. **Given** a booking made before the recipe gained substitutes (it reserved both), **When** the operator completes it, **Then** the dialog still shows one choice and only the pick is issued.

### User Story 2 — Define substitutes in the catalog (Priority: P1)

The owner opens "Botox Full Face" in the catalog, clicks the substitute (Split) icon on Dysport and picks INIBO. The recipe now reads "Uno de: Dysport 75 (Predeterminado) | INIBO 1". They set INIBO's quantity and, if INIBO is the usual, click "Usar como predeterminado".

**Independent Test**: build `X + (Y | (W + Z))` from a flat recipe with three clicks (substitute icon on Y → W; "+ Agregar" on W's option → Z) and see it saved after reload.

**Acceptance Scenarios**:

1. **Given** a recipe `A + B`, **When** the substitute icon on B picks C, **Then** the recipe is `A + (B | C)` with B the default.
2. **Given** `A + (B | C)`, **When** "+ Agregar" on C's option picks D, **Then** the recipe is `A + (B | (C + D))`.
3. **Given** `A + (B | (C + D))`, **When** the substitute icon on C picks E, **Then** the recipe is `A + (B | ((C | E) + D))`.
4. **Given** a group, **When** "Usar como predeterminado" on its second option, **Then** that option is reserved by new bookings and listed first.

### User Story 3 — Unattended paths use the default (Priority: P2)

A product sold at the till, a recipe's cost, and a booking's reservation each count one option per group: the default.

**Acceptance Scenarios**:

1. **Given** a recipe `Dysport 75 | INIBO 75`, **When** a booking is created, **Then** 75 Dysport is reserved and no INIBO.
2. **Given** the same recipe, **When** its cost is computed, **Then** it is the cost of 75 Dysport.

### Edge Cases

- All options of a group but one deleted → plain rows; the remaining option is the default.
- A booking reserved an item that is no longer in the recipe → shown as a plain row, as today.
- The same item in two options of one recipe → not possible (one row per item per recipe). An option that needs "the same syringe, different count" keeps the syringe as a plain row outside the group.
- An empty option ("B or nothing") → not modelled; a 0-quantity row (spec 033) covers it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A recipe row MUST be either always consumed or part of a substitute group; groups MAY nest inside options of other groups to any depth.
- **FR-002**: Each group MUST have exactly one default option, and the owner MUST be able to change it.
- **FR-003**: Booking reservations, till issues, recipe cost and stock previews MUST count only each group's default option.
- **FR-004**: Completing a booking MUST ask the operator to pick one option per group (default preselected) and MUST post only the picked option's supplies.
- **FR-005**: The recipe editor MUST let the owner add a substitute to any supply, add a supply to any option, make any option the default, and delete supplies, all without leaving the recipe.
- **FR-006**: A recipe save whose substitute structure is incoherent MUST be refused with a clear error, leaving the stored recipe unchanged.
- **FR-007**: Recipes without substitutes MUST behave exactly as before.

### Key Entities

- **Recipe row**: item + quantity per unit + optional substitute position (which group, which option, nested).
- **Substitute group**: a set of options of which exactly one is consumed; the lowest-numbered option is the default.

## Success Criteria *(mandatory)*

- **SC-001**: After the 9 FACES toxin recipes are converted, a new toxin booking reserves one toxin, not two.
- **SC-002**: An operator records "INIBO was used" in one click plus the quantity, with no field to clear.
- **SC-003**: Every existing recipe reads, reserves and costs the same before and after the change.

## Assumptions

- Converting FACES' 9 toxin recipes (and `CB Control Botox`'s three toxins) into substitute groups is an owner action in the catalog editor after deploy, or a one-off script with owner approval. This spec does not rewrite prod recipes.
- Package composition (`fin_product_components`) and item components (`stk_item_components.choice_group`, which no flow uses today) are out of scope.
- Till sales of SERVICES issue nothing since spec 120; only products with recipes are issued at sale, with the default.

## FigCraft demo

[recipe-substitutes.figcraft](recipe-substitutes.figcraft): the recipe editor and the completion dialog for "Botox Full Face", as-is (two toxins, both consumed) and to-be (one group, default marked; "¿Cuál se usó?" with INIBO picked).
