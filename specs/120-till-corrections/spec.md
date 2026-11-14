# Feature Specification: Till corrections — stock follows the appointment, products on the agenda, product swap

**Feature Branch**: `120-till-corrections` (implementation branches are slice-scoped, repo `minion_hub`, PR base `master`)

**Created**: 2026-11-14

**Status**: Draft

**Input**: FACES reception feedback of 2026-11-13 and the owner's decisions of 2026-11-14.
Source proposal: [`2026-11-13-faces-stock-follows-appointment-agenda-products-line-swap`](../../proposals/2026-11-13-faces-stock-follows-appointment-agenda-products-line-swap.md).

## Why this exists

Reception sells treatments and gift products at the till and runs the day from the agenda. Three
things break their trust in the numbers:

- A treatment paid before it is scheduled removes its supplies from stock at the sale, and again
  when the appointment is completed. Stock counts drift below the shelf.
- Gift products rung with a visit do not appear on the agenda, so staff cannot see what a client
  took home.
- A wrong product on a validated sale (a size L instead of an M) can only be fixed by voiding the
  whole sale or by hand-made stock movements.

Owner's goal, verbatim: "open the door for them to be able to execute corrective actions without
making the experience too complex". And for a correction the app cannot do directly: "Instead of
telling the user NO and leaving it there, I want the app to help the user do what they need to do."

Patients are named by ticket id only. This repository is public.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Supplies leave stock when the treatment is done, once (Priority: P1)

Reception sells a treatment. Whether or not it already has an appointment, the sale moves no
supplies. When the treatment is scheduled its supplies are reserved, and when the appointment is
completed they are deducted once. Products sold at the till keep leaving stock at the sale.

**Why this priority**: stock is wrong today and gets worse with every prepaid treatment. Staff
already distrust the counts ("Why were 3 syringes deducted if one is pending?").

**Independent Test**: sell one treatment with no appointment plus one product; check that only
the product's stock moved. Schedule the treatment and complete it; check that its supplies were
deducted exactly once.

**Acceptance Scenarios**:

1. **Given** a treatment with a supply recipe and no appointment, **When** it is sold at the till,
   **Then** no stock count changes for its supplies and the line appears under "Servicios pagados
   sin agendar".
2. **Given** that paid line, **When** it is scheduled and the appointment is completed, **Then**
   the recipe is deducted exactly once.
3. **Given** that paid line scheduled, **When** the appointment ends as no-show or cancelled,
   **Then** nothing is deducted and the reservation is released.
4. **Given** a sale with a treatment and a product, **When** it is submitted, **Then** the product
   is deducted at the sale exactly as today.
5. **Given** a treatment charged from an existing appointment, **When** the sale is submitted,
   **Then** behaviour is unchanged (no deduction at the sale, one at completion).
6. **Given** a sale whose only stock movement would have come from treatments, **When** it is
   voided, **Then** the void succeeds and reverses nothing in stock.

---

### User Story 2 - Past wrong deductions are given back (Priority: P1)

The owner runs a one-time repair for FACES. It first shows, per item, what the affected sales
removed at the sale and what it would give back. When applied, the counts match the shelf.

**Why this priority**: fixing the rule without repairing the nine affected sales leaves the
counts wrong forever.

**Independent Test**: run the repair without applying; its plan equals the table in AS-IS. Apply
it; run it again; the second run plans nothing.

**Acceptance Scenarios**:

1. **Given** the nine affected sales, **When** the repair runs in preview, **Then** it lists each
   sale, item and quantity and changes nothing.
2. **Given** the preview is correct, **When** the owner applies it, **Then** each quantity is
   returned to stock in a movement that names the sale it corrects.
3. **Given** the repair was applied, **When** it runs again, **Then** it plans nothing.
4. **Given** a paid treatment still waiting to be done after the repair, **When** its appointment
   is completed, **Then** its supplies are deducted once.

---

### User Story 3 - The agenda shows what was sold with the visit (Priority: P2)

Reception hovers a charged visit on the agenda and sees the products of the sale: quantity, name,
and "regalo" when the price is zero. A visit with products carries a small marker on its block,
so it is visible without hovering.

**Why this priority**: gifts are part of the visit and staff answer client questions from the
agenda. The information exists today but only inside the detail drawer.

**Independent Test**: charge a visit together with a zero-price product; the visit's block shows
the marker and its hover card lists "1 × product (regalo)".

**Acceptance Scenarios**:

1. **Given** a visit charged on a sale that also has product lines, **When** staff hover the
   visit, **Then** the card lists each product with its quantity, and zero-price lines are marked
   as a gift.
2. **Given** that visit, **When** the agenda is shown, **Then** its block carries a product marker.
3. **Given** a sale with products only, for a client who has a visit that same day, **When** staff
   hover that visit, **Then** the products are listed the same way.
4. **Given** a visit with no products on its sale, **When** staff hover it, **Then** no product
   section and no marker appear.
5. **Given** a voided sale, **When** staff hover the visit, **Then** its products are not listed.

---

### User Story 4 - Swap a product on a validated sale (Priority: P3)

Reception opens a validated sale, picks "Cambiar producto" on a product line and chooses the
product that was actually handed over, at the same unit price. The sale now names the right
product and stock is corrected for both. No money moves.

**Why this priority**: it removes the hand-made stock movements staff asked to avoid. It comes
after the stock rule because it relies on trustworthy counts.

**Independent Test**: on a validated sale with `Faja L` at S/ 0, swap to `Faja M`; `Faja L` stock
rises by one, `Faja M` falls by one, the sale total and payments are unchanged, and the change
shows who made it and when.

**Acceptance Scenarios**:

1. **Given** a validated sale with a product line, **When** staff swap it for a product at the
   same unit price, **Then** the line shows the new product, the old item returns to stock, the
   new item leaves stock, and the sale's total, payments, shift totals and number are unchanged.
2. **Given** a swap was made, **When** anyone opens the sale, **Then** they can see what was
   swapped, by whom and when, and open the stock movement.
3. **Given** the new product has no stock, **When** staff try the swap, **Then** the app says so,
   names the item that is short, and offers to pick another product.
4. **Given** a treatment line, **When** staff open the sale, **Then** "Cambiar producto" is not
   offered on it.
5. **Given** a line already swapped, **When** staff swap it again (back or to a third product),
   **Then** stock is right for all products involved.

---

### User Story 5 - When a swap is not enough, the app does the correction with you (Priority: P3)

Some corrections cannot be a swap: the right product has a different price, or the sale already
has a legally valid electronic document. The app does not stop at "no". It offers "Anular y volver
a cobrar": one guided action that voids the sale and opens the till with the same client and the
same lines, the wrong product already replaced, ready to charge.

**Why this priority**: owner decision of 2026-11-14. It is the escape hatch that makes every
refusal in story 4 actionable.

**Independent Test**: on a validated sale, choose a replacement with a different price; accept the
guided action; the original sale is voided with its refund, and the till opens pre-filled with the
corrected lines for the same client.

**Acceptance Scenarios**:

1. **Given** a replacement product with a different unit price, **When** staff choose it, **Then**
   the app explains that the price differs and offers "Anular y volver a cobrar" in the same
   dialog.
2. **Given** a sale with a legally valid electronic document, **When** staff start a swap, **Then**
   the app explains that the document must be replaced and offers the same guided action.
3. **Given** staff accept the guided action, **When** it completes, **Then** the original sale is
   voided through the normal void rules and the till is open with the same client and the
   corrected lines.
4. **Given** staff cancel the guided action at any step before confirming, **When** they return,
   **Then** the original sale is untouched.
5. **Given** a voided sale, **When** staff open it, **Then** no swap or guided action is offered.

---

### Edge Cases

- A sale containing only treatments now has no stock movement at all. Its void and its detail
  page must not report a missing or failed stock movement.
- A paid treatment with quantity above one (a pack of three sessions) scheduled one session at a
  time: each completed appointment deducts its own session only.
- A treatment line whose recipe changed between the sale and the appointment: the recipe in
  force when the appointment is scheduled applies (existing behaviour).
- The repair meets a sale-time movement that someone already cancelled by hand: it skips it and
  says so.
- The repair would be applied while stock is short for an unrelated reason: giving stock back can
  never fail for lack of stock.
- Two people swap the same line at the same moment: one wins, the other is told the line changed
  and sees the current product.
- A swap on a sale whose shift is closed: allowed, since no money moves.
- A visit charged across two sales: the hover card lists the products of both.
- A client with two visits on the same day and a products-only sale: the products are listed on
  both visits.

## Requirements *(mandatory)*

### Functional Requirements

**Stock follows the appointment**

- **FR-001**: A sale MUST NOT move stock for a treatment line, whether or not the line is linked
  to an appointment.
- **FR-002**: A sale MUST keep moving stock for product lines exactly as today.
- **FR-003**: Scheduling a paid treatment MUST reserve its recipe, and completing the appointment
  MUST deduct it exactly once. Cancelled and no-show appointments MUST release the reservation.
- **FR-004**: The till's availability figures and stock warnings MUST consider product lines only.
- **FR-005**: Voiding a sale MUST reverse exactly the stock that sale moved, and MUST succeed when
  it moved none.

**Repair**

- **FR-006**: A one-time repair MUST return to stock the supplies that past sales removed for
  treatment lines sold without an appointment, per item and per sale, naming the sale in the
  correcting movement.
- **FR-007**: The repair MUST preview by default, MUST change nothing until explicitly applied,
  MUST plan nothing on a second run, and MUST leave product deductions of the same sales intact.
- **FR-008**: The repair MUST be limited to one organisation named by the operator.

**Agenda**

- **FR-009**: The hover card of a charged visit MUST list the product lines of the non-void
  sale(s) that charged it, with quantity, and MUST mark zero-price lines as a gift.
- **FR-010**: A products-only, non-void sale MUST be listed on the visit(s) of the same client on
  the same local day.
- **FR-011**: A visit that has products to list MUST carry a marker on its agenda block.
- **FR-012**: Loading the agenda MUST NOT add a request per visit.

**Swap and guided correction**

- **FR-013**: A product line of a validated, non-void sale MUST offer a swap to another active
  product with the same unit price.
- **FR-014**: A swap MUST update the line's product and description, return the old product's
  stock, deduct the new product's stock, and record who did it and when. It MUST leave totals,
  payments, shift totals and the sale number unchanged. Stock availability is checked before
  anything changes. If the stock step fails after the line changed, the sale MUST show a stock
  warning with a retry, as a sale does today; it MUST never be left silently wrong.
- **FR-015**: A swap MUST be refused when the new product is out of stock, and the message MUST
  name the short item and offer choosing another product.
- **FR-016**: When the replacement has a different unit price, or the sale has a legally valid
  electronic document, the app MUST offer "Anular y volver a cobrar" instead of ending with an
  error.
- **FR-017**: "Anular y volver a cobrar" MUST void the sale through the existing void rules and
  open the till pre-filled with the same client and lines, the chosen replacement applied. Nothing
  changes until staff confirm.
- **FR-018**: A swap MUST require the permission to edit sales. "Anular y volver a cobrar" MUST
  require the permission that voiding requires today; a user without it is told that their role
  cannot void and who can. Test-environment electronic documents do not count as legally valid.
- **FR-019**: All new text MUST exist in Spanish and English.

### Key Entities

- **Sale (ticket)**: a validated till sale with lines, payments and at most one stock movement.
- **Sale line**: a treatment or a product, with quantity and price; a treatment line may be linked
  to an appointment.
- **Appointment (visit)**: one or more treatments for a client at a time; completing it deducts
  its reserved supplies.
- **Reservation**: supplies set aside for a scheduled treatment, later deducted or released.
- **Stock movement**: an entry that adds or removes item quantities, with a source (sale,
  appointment, repair, swap).
- **Electronic document**: the tax document of a sale. Today every FACES document is a
  test-environment one.

## AS-IS (hub `origin/master` `21825676`, prod read-only 2026-11-13/14)

| # | Observable behaviour | Anchor |
|---|---|---|
| A1 | A sale issues the recipe of every line with a product and no appointment link, treatments included | `src/server/services/pos.service.ts:750–772`, line 771 |
| A2 | Scheduling a paid line links it to a new appointment and reserves its recipe; completion issues it | `src/server/services/scheduling-bookings.service.ts`, `scheduleTicketLine`, block ending at 850 |
| A3 | 12 treatment lines on 9 FACES sales were issued at the sale; 5 were issued again at completion, 1 will be, 2 ended as no-show, 1 is unscheduled. No other organisation has such lines | prod query; table in the proposal |
| A4 | Sale-time issues to give back: HA Saypha Volume Plus 4, HA Saypha Volume 1, HA Saypha Filler 1, Dysport 690, Ácido Desoxicólico 18 | actual stock entries STE-2026-00467, 474, 475, 481, 486, 500, 543, 601, 610 |
| A5 | The hover card lists the visit's treatments only; the drawer lists the sale's other lines | `ticketRefsForBookings`, `scheduling-bookings.service.ts:3624`; `BookingDetailDrawer.svelte` |
| A6 | The agenda payload already carries each sale of the week with its lines, without kind or quantity | `CalendarInvoice.lines`, `src/lib/components/scheduling/calendar-window.ts` |
| A7 | 35 sales that charge a visit carry 46 product lines, 45 at zero price; 4 products-only sales, all 4 for a client with a visit that day | prod query |
| A8 | A validated sale has no line-level correction; void reverses the whole sale | `voidTicket`, `pos.service.ts:1827` |
| A9 | All 104 FACES electronic documents are test-environment (61 accepted, 43 error) | `pos_emissions`, prod query |

Not verified: whether `STE-2026-00500`'s 1 Bioestimulador de Colágeno came from a product line or
a treatment recipe. The repair derives quantities from each sale's treatment lines and must
report this line explicitly in its preview.

## TO-BE (invariants)

- A treatment's supplies are deducted once, at completion of its appointment, never at the sale.
- A product is deducted once, at the sale, and a swap keeps that true for the product actually
  handed over.
- Money never moves because of a swap.
- A refusal always carries the next step.
- Unchanged: appointment-first sales, product sales, void and refund rules, shift totals,
  permissions, the non-POS calendars, electronic document emission.

## DELTA

| # | Transition | Story | Proof |
|---|---|---|---|
| D1 | The sale's stock resolution ignores treatment lines (submit and availability) | 1 | unit: mixed sale issues the product only; treatment-only sale issues nothing |
| D2 | Sell unscheduled → schedule → complete deducts once | 1 | integration test on the three steps |
| D3 | Void of a sale with no stock movement succeeds silently | 1 | unit |
| D4 | Repair script, preview by default | 2 | preview equals A4; second run plans nothing |
| D5 | Agenda payload carries product lines (kind, quantity, total) per charged visit and same-day products-only sales | 3 | unit on the window builder |
| D6 | Hover card product section and block marker | 3 | component test; design gates |
| D7 | Swap operation and its entry point on the sale view | 4 | unit per acceptance scenario and per refusal |
| D8 | Guided "Anular y volver a cobrar" with a pre-filled till | 5 | browser check on a QA sale |

Slices: S1 = D1–D3; S2 = D4 (owner-run, data); S3 = D5–D6; S4 = D7; S5 = D8.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After release, no treatment's supplies are deducted more than once: for every
  completed appointment, stock movements for its recipe number exactly one.
- **SC-002**: After the repair, the system counts of the five affected items equal the physical
  count taken by FACES staff.
- **SC-003**: Staff can tell which products went with a visit from the agenda without opening
  anything, for 100% of charged visits with products.
- **SC-004**: Correcting a wrong product at the same price takes one action and under 30 seconds,
  with no hand-made stock movement.
- **SC-005**: No correction attempt ends in a message without a next step.
- **SC-006**: Reception stops reporting unexplained syringe deductions in the two weeks after
  release.

## Assumptions

- Every FACES treatment is put on the agenda and sold through the till (owner, 2026-11-14), so a
  treatment never needs to deduct at the sale.
- The two no-show sales get their supplies back too; the owner confirms the syringes are on the
  shelf before applying the repair.
- Which past sales need a product swap is for staff to decide; no data correction for wrong sizes
  is part of this feature.
- A legally valid electronic document cannot exist for FACES today (A9). Story 5 is the path for
  when it can. Replacing such a document through the tax authority (a credit note) follows
  whatever the void path does at that time; I believe a credit note is the required instrument,
  and that must be verified with the accountant before production emission is enabled.
- Swap needs no approval above reception because no money moves and it is logged.
- Spec `116-pos-booking-state-hardening` (open) touches the same till and appointment code;
  slices here are rebased on it if it lands first.

## Out of scope

- Changing a line's price or quantity after validation.
- Returns and exchanges with a price difference handled as one transaction.
- Issuing credit notes.
- A guard on cancelling a sale's stock movement from the stock screen.
- Recipes that list two toxin brands for one treatment.
- Swapping a treatment line.

## Human gates

Tagged `data`: the repair changes production stock. Owner approval of this spec before code, and
owner merge. The repair is run by the owner.
