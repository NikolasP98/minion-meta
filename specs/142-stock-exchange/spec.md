---
id: 142-stock-exchange
title: Trade products with a supplier (canje) — one movement, products out and in, value carried over
stage: spec
status: draft
verdict: pending
pass: 1
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
tags: [ui, data]
related: [141-stock-entry-drafts, 124-stock-correction-workflow, 125-stock-readable-movements]
---

# Feature Specification: Trade products with a supplier (canje)

**Feature Branch**: `feat/142-stock-exchange` (hub, base `master`)

**Created**: 2026-11-20

**Status**: Draft

**Input**: Owner, 2026-11-20:
- "Regarding stock, FACES traded in product in exchange for another product: sent away: 20 filler; got back: 20 volume"
- Then: "trade has not taken place yet, but I want to prepare the UI that handles this kind of operation."

## AS-IS (observed 2026-11-20, hub `origin/master` `3677e35a`)

- "Nueva entrada" offers four types (`ENTRY_TYPES`, `src/lib/stock/entry-legs.ts`): **Entrada** (receipt), **Salida** (issue), **Transferencia** (transfer) and **Ajuste** (adjustment).
  - None of them says "I gave products to a supplier and got others back".
- The only way to record a trade today: one Ajuste with an out line and an in line, typing the incoming cost by hand.
  - That is how STE-2026-00699 was posted on 2026-11-20, and then cancelled because the trade has not happened yet.
  - Nothing in it records the supplier as the counterpart, the link between what left and what came in, or the rule that the incoming value equals the outgoing value.
- Recording it as Salida + Entrada would be worse:
  - the Entrada looks like a purchase (it needs a cost and counts as spending);
  - the Salida looks like consumption.

## TO-BE

- **New type "Canje"** in "Nueva entrada", next to the other four.
- **Form, two sections:**
  - **"Entregas"**: products that leave. Quantity per line; the cost is shown, not typed, because it is the average cost.
  - **"Recibes"**: products that come in. Quantity per line.
- **Supplier** (the counterpart) is required. **Note** is optional.
- **Value rule** (shown live under the lines):
  - The value that leaves is carried into what comes in, spread by quantity.
  - Example: "Sale: 20 HA Saypha Filler · S/ 5,000.00 → Entra: 20 HA Saypha Volume a S/ 250.00 c/u".
  - No money moves, so it is never counted as a purchase or a consumption.
- **Draft first**: a canje can be saved as a draft (spec 141) and registered the day it happens.
  - The value is computed **when registered**, from the average costs of that moment.
  - The draft shows "valor estimado a hoy".
- **Registered**:
  - It gets a number (STE-…) and its own type label, "Canje", in lists and in the movements history.
  - Its detail shows both sides and the supplier.
  - Cancelling it reverses both sides together (as today's cancel does).
- **Refusals with a next step**:
  - Not enough of a product to give: "No hay stock suficiente de HA Saypha Filler: hay 13, el canje entrega 20" + "Editar".
  - A product on both sides: "Un producto no puede salir y entrar en el mismo canje".

**Invariants**:
- Value out = value in (to the cent; any rounding difference goes to the last incoming line).
- Quantities move only at registration.
- Both sides post in one transaction or not at all.

## DELTA

| Transition | Proof (test to add) |
|---|---|
| Entry types: 4 → 5 (`exchange`) with legs: out lines `-qty` from the warehouse, in lines `+qty` to the warehouse | `entry-legs.test.ts`: legs for a two-sided exchange |
| Incoming cost: typed → computed at submit from the out legs' value, spread by quantity, remainder on the last line | `stock.logic.test.ts`: 20 out @ 250 → 20 in @ 250; uneven split sums exactly |
| Submit: both sides in one tx; negative-stock guard on the out side | `stock.tickets`/submit service test: one fails → nothing written |
| Validation: supplier required; ≥1 line each side; no item on both sides | `validateEntry` tests + API 422 codes |
| Form: no trade → "Canje" with Entregas / Recibes and live value preview | mounted test of the new-entry page in exchange mode |
| Lists/detail/movements: "Canje" label; detail shows both sides | list + detail mounted tests; spec 125 label map entry |
| Finance: exchange never counted as purchase or consumption | finance summary test: exchange entry contributes 0 to spend and COGS |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Prepare a trade, register it when it happens (Priority: P1)

The clinic agrees to give 20 Filler and receive 20 Volume next week. Today they create a Canje with the supplier, save it as a draft, and register it the day the boxes arrive.

**Independent Test**: create a Canje draft (20 Filler out, 20 Volume in, supplier set); stock unchanged; register it; Filler −20, Volume +20 at Filler's average cost; one movement number.

**Acceptance Scenarios**:

1. **Given** the new-entry form, **When** "Canje" is chosen, **Then** it shows a supplier field and two sections, "Entregas" and "Recibes".
2. **Given** 20 Filler (average S/ 250) out and 20 Volume in, **When** lines are filled, **Then** the preview reads "S/ 5,000.00 → 20 Volume a S/ 250.00 c/u".
3. **Given** the canje saved as a draft, **When** it is registered later, **Then** the value uses the averages of that day.

### User Story 2 — Uneven trade (Priority: P2)

**Acceptance Scenarios**:

1. **Given** 10 A out (average S/ 100) and 3 B + 1 C in, **When** registered, **Then** S/ 1,000 is spread by quantity: B gets 3/4, C 1/4. Values sum to exactly S/ 1,000.

### User Story 3 — Refusals that help (Priority: P2)

**Acceptance Scenarios**:

1. **Given** 13 Filler on hand, **When** a canje giving 20 is registered, **Then** it is refused with the amounts and an "Editar" button, and nothing moves.
2. **Given** the same product on both sides, **When** saving, **Then** the form explains why it can't.

### Edge Cases

- An outgoing product with average cost 0: the incoming value is 0. The preview says so, so the user can stop before registering.
- Several warehouses: each line chooses its warehouse; FACES has one, so the field stays hidden as today.
- Cash paid or received on top of the trade: out of scope. Record it as a payment or purchase separately (assumption).
- Units of measure: lines use each item's stock unit, as other entry types do.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST offer a "Canje" stock entry with a required supplier, at least one outgoing and one incoming line, and an optional note.
- **FR-002**: Registering a canje MUST move both sides in one transaction, outgoing at the average cost and incoming at the carried value.
- **FR-003**: The incoming value MUST equal the outgoing value, spread by quantity, with rounding on the last incoming line.
- **FR-004**: A canje MUST be savable as a draft. Its value MUST be computed at registration, and the draft MUST show the estimate.
- **FR-005**: A canje MUST be refused when an outgoing product lacks stock, or a product appears on both sides. Each refusal MUST name the product and the next step.
- **FR-006**: A canje MUST NOT count as a purchase, spending or consumption in finance views.
- **FR-007**: Lists, detail and movements history MUST label it "Canje" and show both sides with the supplier.
- **FR-008**: Cancelling a registered canje MUST reverse both sides together.
- **FR-009**: Every new text MUST be translated (es, en) and follow the design-token contract.

### Key Entities

- **Canje (exchange entry)**: supplier, note, outgoing lines (item, qty, warehouse) and incoming lines (item, qty, warehouse). The computed unit value per incoming line is set at registration.

## Success Criteria *(mandatory)*

- **SC-001**: The planned FACES trade (20 Filler → 20 Volume) is recorded in one movement, in under a minute, without typing any cost.
- **SC-002**: Stock value is the same before and after any canje (to the cent).
- **SC-003**: A canje never appears as spending or consumption.

## Assumptions

- Value carried by quantity is the default because FACES trades like for like. Carrying by each item's reference price is a possible follow-up.
- Cash differences are recorded separately (out of scope).
- Depends on spec 141 for editing a canje draft; without it, a canje draft can still be registered or cancelled.

## FigCraft demo

[stock-exchange.figcraft](stock-exchange.figcraft), page "Spec 142 · demo", 4 frames:

1. "Nueva entrada": today's Ajuste workaround (as-is) and the "Canje" type with Entregas / Recibes and the value preview (to-be).
2. The registered canje (to-be).
3. The stock-shortage refusal (to-be).

Supplier "Laboratorio Ejemplo SAC" is fictitious.
