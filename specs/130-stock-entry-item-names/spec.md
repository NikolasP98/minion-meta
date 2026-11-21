---
id: 130-stock-entry-item-names
title: Item names first on the stock entry detail and record preview
stage: spec
status: draft
verdict: pending
pass: 1
created: 2026-11-18
updated: 2026-11-18
repos: [minion_hub]
tags: [ui]
related: [125-stock-readable-movements, 120-till-corrections]
---

# Feature Specification: Item names first on the stock entry detail and record preview

**Feature Branch**: `feat/stock-entry-item-names` (hub, base `master`)

**Created**: 2026-11-18

**Status**: Draft

**Input**: FACES staff, voice note 2026-11-17, while checking a double stock deduction: "Si puedes poner por nombres, como te dije, en vez de esas letras, sería genial." The photographed screen is the record preview of a stock movement (STE-2026-00659), whose lines read "1258 — Toxina Botulinica ..." and "TBI — Toxina Botulinica IN...".

## Relation to spec 125

Spec 125 (readable stock movements, hub PR #682) covers the global entries list, the item ledger and the stock overview. It records that "the exact reported screen remain[s] unverified". This spec is the missing surface: the movement **detail page** and its **record preview** (the same body shown in a dialog). It touches no file that #682 changes.

## AS-IS (observed 2026-11-18)

- Each line of the detail/preview names its item as `<code> — <name>` (for example `1258 — Toxina Botulinica Dysport`).
- The item column is narrow in the preview, so the label truncates after the shared prefix: both toxin lines read "Toxina Botulinica ..." and only the code tells them apart. Staff do not know the codes ("esas letras").
- Evidence: hub `src/routes/(app)/stock/entries/[id]/+page.server.ts` builds `itemLabel` code-first; the staff photo of STE-2026-00659.

## TO-BE

- Each line names its item **name first**, code second: `Toxina Botulinica Dysport · 1258`. When the label truncates, the code is what is cut, not the distinguishing word.
- An item without a code shows its name alone. An item that can no longer be resolved keeps today's fallback (its stable id).
- Nothing else on the screen changes. No stored data changes.

## DELTA

| Transition | Proof |
|---|---|
| `code — name` → `name · code` on the detail page and record preview | loader unit test asserts the label for an item with a code |
| item without code → `name` (no dangling separator) | same test, second case |
| unresolved item → stable id (unchanged) | same test, third case |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Recognise each supply on a movement (Priority: P1)

A front-desk or stock operator opens a stock movement (from the entries list, the item ledger or a sale) and can tell which supply each line moved without knowing item codes.

**Why this priority**: staff check movements to reconcile the shelf; two supplies sharing a long prefix are indistinguishable today.

**Independent Test**: open STE-2026-00659 (or a fixture with two items sharing a name prefix) in the record preview; each line's visible text starts with the full item name.

**Acceptance Scenarios**:

1. **Given** a movement with lines for "Toxina Botulinica Dysport" (code 1258) and "Toxina Botulinica INIBO" (code TBI), **When** the record preview opens, **Then** the lines read "Toxina Botulinica Dysport · 1258" and "Toxina Botulinica INIBO · TBI".
2. **Given** the same movement on the full detail page, **When** it loads, **Then** the item column shows the same labels.

### Edge Cases

- Item with an empty code → name only.
- Archived item → still named (the loader already includes archived items).
- Item missing from the catalogue → stable id, as today.
- Very long name → truncation cuts the trailing code first.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The stock movement detail and its record preview MUST label each line with the item name before the item code.
- **FR-002**: When an item has no code, the label MUST be the name alone.
- **FR-003**: When an item cannot be resolved, the label MUST stay the stable identifier shown today.
- **FR-004**: The change MUST be display-only: no stock, valuation or movement record is modified.

## Success Criteria *(mandatory)*

- **SC-001**: On the reported movement, both toxin lines are distinguishable at the preview's default width without hovering or opening the item.
- **SC-002**: 0 stored records change.

## Assumptions

- Name-first with the code kept (rather than dropping the code) is the reading of "por nombres en vez de esas letras" that keeps codes available to staff who search by them. FACES has 32 items, all with unique names and a code (prod read 2026-11-18).
- The list, ledger and overview are left to spec 125 / PR #682.

## FigCraft demo

`stock-entry-item-names.figcraft` in this directory: frame "as-is" (code-first lines as photographed) and frame "to-be" (name-first lines), same movement, same width.
