---
id: 144-stock-ledger-integrity
title: Stock value always adds up — engine books residuals, a gap shows on the overview, unit-vs-total cost warning
stage: spec
status: draft
verdict: pending
pass: 1
created: 2026-11-21
updated: 2026-11-21
repos: [minion_hub]
tags: [ui, data]
related: [120-till-corrections, 122-faces-stock-reconciliation, 141-stock-entry-drafts, 142-stock-exchange]
---

# Feature Specification: Stock value always adds up

**Feature Branch**: `fix/144-stock-ledger-integrity` (hub, base `master`)

**Created**: 2026-11-21

**Status**: Draft

**Input**: Owner, 2026-11-21: "apply the fix (make sure you future-proof this kind of mistake if it can be handled by business logic and isn't a manual issue; if its a manual issue, I can comment with staff to address properly) and start the spec".

## AS-IS (observed 2026-11-20/21, hub `origin/master` `3d39cbb6`, FACES prod read-only)

### The gap that was found and repaired by hand

- On 9 FACES items, the sum of the movement amounts (`stk_ledger.value_delta`) did not equal the stock value (`qty × average`). Total S/ 4,399.55:

  | Item | Gap |
  |---|---|
  | HA Opera I | S/ 3,512.68 (its movements summed to −S/ 1,448.84) |
  | Saypha Volume | S/ 1,673.91 |
  | Ácido Desoxicólico | −S/ 1,041.15 |
  | 6 others | S/ 7–171 |

- **Cause: a one-time script.** `scripts/repair-stock-valuation.ts`, step 3 "rebuild reconciliation adjustments", writes the reconciliation row and the bin with `curRate`, the item's pre-repair average, instead of the replayed one. It is still in the repo, and `--force` would rebuild those rows the same way.
- Repaired by hand on 2026-11-21: one correction per item, on its 30/06 "Reconciliación (repair)" row. Averages, quantities and issue costs were unchanged. Afterwards 0 items in any org disagree.

### The engine can still drift on its own (business logic, not manual)

`applyLedgerDelta` (`src/server/services/stock.logic.ts` ~45) computes `rate = value / qty`, with two exceptions:

1. **The rate would be negative.** This happens when value goes negative while qty is positive, for example when a receipt is cancelled after part of it was issued at a lower average. The engine keeps the previous rate, but the movement's value was already booked, so the ledger and the bin disagree from that row on.
2. **qty reaches 0.** The rate becomes 0, and any leftover value (from a cancellation at an old cost, or rounding) stays in the ledger, while the bin is worth 0.

Nothing detects either case: no check compares Σ ledger value with bin value.

### Last purchase cost reads the wrong rows

`itemSupplyInfo` (`stock.service.ts` ~318) takes the latest **positive** ledger movement of any entry. That includes cancel reversals, adjustments and cancelled entries. Examples (2026-11-21):
- Saypha Volume shows "last purchase" S/ 250 from the cancelled canje STE-2026-00699.
- Volume Plus shows S/ 77.06 from the reversal of sale movement STE-2026-00610.

### Typing a total as the unit cost (a manual mistake the app can catch)

| Receipt | Typed unit cost | Item average | Ratio | Real cost |
|---|---|---|---|---|
| STE-2026-00559 (02/11) | 5,474.58 | 250 | ×21.9 | the invoice total: 89 × 61.51 |
| STE-2026-00560 (02/11) | 1,995 | 670 | ×3.0 | the total: 3 × 665 |

Both were typed in "Costo por: Unidad" and were caught by hand. They are the only FACES receipts ever more than ×2.5 (or below ÷2.5) from the item's average at the time (prod query, 2026-11-21, after the corrections).

## TO-BE

1. **The engine never drifts.** When a movement leaves an item with a residual the average cannot carry (a negative average, or 0 units with value left), the same transaction posts a **valuation-residual row** for that item:
   - qty 0, value = −residual;
   - shown in movements as "Ajuste de valor (residuo)".
   - Invariant, after every registration or cancellation: Σ movement value = qty × average for every touched item.
2. **A gap is visible the day it happens.**
   - The stock overview shows one warning line, but only when any item disagrees: "2 productos no cuadran entre movimientos y valor en stock · Ver".
   - "Ver" lists the item, the amount and the first movement where it diverges.
   - The same check runs in the stock reconciliation report (spec 122) and in a test that replays the engine.
3. **The repair script is removed.** It was one-time, and its job is done; the reference in `scripts/sweep-hub-transactions.ts` is updated.
4. **Last purchase cost** = the unit cost of the latest **registered receipt** that is not cancelled. Adjustments, reversals, canjes and drafts are excluded. *(Delivered early in hub #705, commit `90b5e3a`, with tests; this spec only verifies it.)*
5. **Unit-vs-total warning on receipts.** When a line's unit cost is ≥ 2.5× or ≤ 1/2.5 of the item's average, the line shows a warning before saving:
   - "S/ 5,474.58 c/u es 22 veces el costo promedio (S/ 250.00). ¿Es el total de la línea?"
   - Next step: a one-click **"Es el total"** button switches that line to total mode, which gives S/ 61.51 c/u.
   - Registering is still allowed; the warning never blocks.

**Manual issues** (for the owner to raise with staff; not code):
- A stock adjustment entered as a purchase (STE-2026-00561, INIBO).
- A trade entered as an adjustment, without saying so. Spec 142 gives it its own type.

## DELTA

| Transition | Proof (test to add) |
|---|---|
| Negative-rate / zero-qty residual: silently dropped → residual row posted in the same tx | `stock.logic` + submit/cancel service tests: cancel-after-partial-issue and drain-to-zero cases; invariant holds |
| No integrity check → `ledgerValueGaps(ctx)` (Σ value vs bin per item) on the overview + report | service test with a seeded gap; overview mounted test shows/hides the line |
| Repair script present → removed; sweep script reference updated | file absence; `bun run check` |
| Last purchase cost from any positive movement → registered, uncancelled receipts only | `itemSupplyInfo` test with a reversal and a cancelled canje newer than the receipt |
| Receipt cost: no plausibility check → warning ≥2.5× / ≤÷2.5 with "Es el total" | pure test for the ratio rule; mounted test: warning, one-click switch to total mode |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Movements always add up (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a receipt of 3 @ 1,995 after 1 unit @ 670, and 2 units issued, **When** the receipt is cancelled, **Then** the item's movements sum to exactly its stock value, and any residual appears as one "Ajuste de valor (residuo)" row.
2. **Given** an item drained to 0 units after a cancellation valued at an old cost, **When** the last unit leaves, **Then** the stock value and the movement sum are both 0.

### User Story 2 — See a gap the day it appears (Priority: P1)

**Acceptance Scenarios**:

1. **Given** every item agrees, **When** the stock overview opens, **Then** no warning is shown.
2. **Given** an item whose movements and value disagree, **When** the overview opens, **Then** one line names how many items, and "Ver" lists each with the amount and the first diverging movement.

### User Story 3 — Catch a total typed as unit cost (Priority: P2)

**Acceptance Scenarios**:

1. **Given** an item averaging S/ 250, **When** a receipt line is typed at S/ 5,474.58 c/u, **Then** the line warns "22 veces el costo promedio… ¿Es el total de la línea?" with "Es el total".
2. **Given** that warning, **When** "Es el total" is pressed, **Then** the line becomes S/ 61.51 c/u (total S/ 5,474.58) and the warning disappears.
3. **Given** a real price change, **When** the user registers anyway, **Then** the entry registers normally.

### User Story 4 — Last purchase cost is a real purchase (Priority: P3)

**Acceptance Scenarios**:

1. **Given** a receipt at S/ 250 followed by a cancelled canje and a sale reversal, **When** the item is viewed, **Then** the last purchase cost is the S/ 250 receipt.

### Edge Cases

- An item with no average yet (first receipt): no warning, nothing to compare.
- Several warehouses: the check and residual run per item and warehouse, as bins do.
- Residuals below S/ 0.005 (float noise) are not posted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every registration and cancellation MUST leave each touched item with Σ movement value = qty × average (to the cent), posting a value-only residual row when needed.
- **FR-002**: The system MUST detect items whose movements and stock value disagree, and show them on the stock overview and in the reconciliation report.
- **FR-003**: The one-time valuation repair script MUST be removed.
- **FR-004**: Last purchase cost MUST come only from registered, uncancelled receipts.
- **FR-005**: A receipt line whose unit cost is ≥ 2.5× or ≤ 1/2.5 of the item's average MUST show a non-blocking warning with a one-click switch to total mode.
- **FR-006**: Every new text MUST be translated (es, en) and follow the design-token contract.

### Key Entities

- **Valuation-residual row**: a ledger row with qty 0 and value = −residual, linked to the movement that caused it.
- **Ledger value gap**: an item + warehouse where Σ movement value ≠ qty × average.

## Success Criteria *(mandatory)*

- **SC-001**: 0 items in any org with a ledger value gap, checked daily for 30 days after release.
- **SC-002**: A total typed as unit cost is flagged before it is saved, for both historical cases (×21.9 and ×3.0).
- **SC-003**: Last purchase cost equals the latest real purchase for every FACES item.

## Assumptions

- 2.5× is the threshold, from FACES' own history: no legitimate receipt ever crossed it. The owner may tune it.
- The residual is posted, not spread over earlier movements, so history stays untouched.

## FigCraft demo

[stock-ledger-integrity.figcraft](stock-ledger-integrity.figcraft), page "Spec 144 · demo", 6 frames:

1. Stock overview (as-is; to-be with the warning line).
2. The "Ver" list.
3. The receipt line: as-is, the to-be warning with "Es el total", and after the switch.

Interactive preview: https://claude.ai/artifact/U27WfjtRLvHPENSqrW3MCw (tab "Valor del stock").
