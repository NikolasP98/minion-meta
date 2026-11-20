# Feature Specification: PDV marketing funnel and targetable customers

**Feature Directory**: `specs/132-pos-marketing-funnel`
**Created**: 2026-11-19
**Status**: Shipped 2026-11-19 (hub #691; unspecced additions: filter button, channel icons, formula tooltips, org-only nav entry)
**Repos & PR base**: `minion_hub` → `master`; `minion-meta` → `dev`
**Input**: Owner, 2026-11-19: "I want to visualize the funnel and also calculate LTV, CAC and other metrics. This should be its own page in the pdv section in the FACES org." and "I want to visualize customers that can be targeted."
**Proposal**: `proposals/2026-11-19-hub-pos-marketing-funnel-meta-feedback.md` (this is slice S2, read-only)

## AS-IS (FACES, prod, measured 2026-11-19, read-only)

- Ad results live under `/socials`; sales live under PDV and Finances; no screen puts them side by side.
- No screen shows cost per new customer, lifetime spend, or return on ad spend.
- Audiences for Meta are built by hand from exported CSV files (`Audiencia_Valor_*.csv`, 2026-11-10 to 11-12).
- 2,321 customers have at least one sale. Average lifetime spend S/1,710, median S/1,350; 1,364 bought more than once.
- Of those 2,321: 1,842 have a phone, 1,433 a WhatsApp identity, 50 an Instagram identity, 1 an email, 478 nothing Meta can match.
- A customer is one party; invoices, PDV tickets and CRM contacts all point to it.
- Sales before 2026-10-09 are provider invoices; from 2026-10-09 they are PDV tickets. No ticket references an invoice, so the two sets do not overlap.
- 5,299 leads carry an origin (3,486 ad, 980 organic, 833 unknown). The origin is estimated, not exact, and no lead carries an ad id.

## TO-BE

A page in the PDV section that, for a date range, shows the path from ad spend to repeat customer, the money metrics that follow from it, and the list of paying customers with what Meta could match them by.

Invariants:

- The page only reads. Nothing is sent to Meta. Nothing is merged or edited.
- Each sale counts once.
- A ratio with a zero or missing denominator shows "not enough data", never 0 or ∞.
- Figures that rest on estimated lead origin are labelled as estimates.
- Only people allowed to see PDV money figures see this page; other orgs see only their own data.

## DELTA

| From | To | Proof |
|---|---|---|
| No funnel screen | `/pos/funnel` in the PDV menu | Route, menu and access tests |
| No CAC/LTV/ROAS anywhere | Six metrics computed for the range | Service tests against hand-computed values |
| Audiences assembled from CSV exports | Targetable-customer list with reachability and value tier, filterable | Service tests for each filter and for the totals |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See which customers can be targeted (Priority: P1)

The owner opens the page and sees every paying customer with lifetime spend, number of purchases, last purchase date, value tier, and which identifiers Meta can match: phone, email, WhatsApp, Instagram. A summary states how many customers are reachable and how many are not.

**Why this priority**: It is the owner's explicit ask and it works with today's data, before leads and customers are linked.

**Independent Test**: With seeded customers of known reachability, the list and the summary match the seed exactly.

**Acceptance Scenarios**:

1. **Given** a customer with a phone and two sales, **When** the page loads, **Then** the row shows both sales summed, "2 purchases", the later date, and the phone marker.
2. **Given** the filter "reachable by Instagram", **When** applied, **Then** only customers with an Instagram identity remain and the summary updates.
3. **Given** a customer with no phone, email or messaging identity, **When** the page loads, **Then** the row is marked "not reachable" and counts in the not-reachable total.
4. **Given** the filter "top value tier", **When** applied, **Then** only customers in the top third by lifetime spend remain.

### User Story 2 - Read the money metrics (Priority: P2)

For the chosen range the owner sees: cost per new customer (ad spend ÷ first-time customers), lifetime spend per customer, the ratio of the two, return on ad spend (revenue ÷ ad spend), average ticket, and repeat rate.

**Why this priority**: These are the numbers the owner named; they depend only on spend and sales, both of which exist.

**Independent Test**: With seeded spend and sales, each metric equals the hand-computed value.

**Acceptance Scenarios**:

1. **Given** S/1,000 of ad spend and 4 first-time customers in the range, **When** the page loads, **Then** cost per new customer is S/250.
2. **Given** no ad spend in the range, **When** the page loads, **Then** cost per new customer and return on ad spend show "not enough data".
3. **Given** ad data that ends before the range ends, **When** the page loads, **Then** a notice states the last date ad data covers.

### User Story 3 - Follow the funnel (Priority: P3)

The owner sees the stages in order: ad spend, impressions, clicks, conversations started, leads, first-time customers, repeat customers, with the conversion rate between each consecutive pair.

**Why this priority**: The lead and customer stages are not linked person-to-person yet, so this view is counts per stage, not a tracked cohort.

**Independent Test**: With seeded rows per stage, each count and each rate matches.

**Acceptance Scenarios**:

1. **Given** 1,000 clicks and 100 conversations, **When** the page loads, **Then** the rate between them is 10%.
2. **Given** a stage with zero in the previous stage, **When** the page loads, **Then** its rate shows "not enough data".
3. **Given** the lead stage, **When** shown, **Then** it is labelled as an estimate.

### Edge Cases

- A voided ticket never counts as a sale.
- A customer whose first sale is before the range is not a first-time customer in it, but their sales in the range count as revenue.
- A customer with several CRM contacts shows each identifier kind once.
- A sale with no customer counts in revenue and average ticket, not in customer counts.
- An org with no Meta connection sees the customer list and the sales metrics; ad-based metrics show "not enough data".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The PDV menu MUST have a "Funnel" entry that opens the page.
- **FR-002**: The page MUST use the same date-range control and inclusive range rule as the other PDV and ad screens.
- **FR-003**: The page MUST list every customer with at least one non-voided sale, with lifetime spend, purchase count, last purchase date, value tier, and reachability markers for phone, email, WhatsApp and Instagram. The list is all-time, not limited by the range.
- **FR-004**: Value tier MUST be the third of customers a customer falls in by lifetime spend (top, middle, bottom).
- **FR-005**: The list MUST filter by reachability kind (any, each kind, not reachable) and by value tier, and sort by lifetime spend by default.
- **FR-006**: The page MUST show totals: customers, reachable, not reachable, and reachable per kind.
- **FR-007**: The page MUST show cost per new customer, lifetime spend per customer, their ratio, return on ad spend, average ticket and repeat rate, defined as in User Story 2.
- **FR-008**: The page MUST show the seven funnel stages with the rate between consecutive stages.
- **FR-009**: Revenue MUST be provider invoices plus non-voided PDV tickets, each sale once.
- **FR-010**: Any ratio with a zero or missing denominator MUST show "not enough data".
- **FR-011**: The lead stage and anything derived from it MUST be labelled as estimated.
- **FR-012**: The page MUST state the last date ad data covers when it ends before the selected range.
- **FR-013**: The page MUST NOT send, export or modify any data.
- **FR-014**: Access MUST follow the existing PDV permission for money figures; data MUST be limited to the viewer's org.
- **FR-015**: All text MUST exist in English and Spanish.

### Key Entities

- **Customer**: a party with at least one sale; has lifetime spend, purchase count, first and last purchase date, value tier.
- **Sale**: one provider invoice or one non-voided PDV ticket, with amount and date.
- **Reachability**: which of phone, email, WhatsApp identity, Instagram identity exist for the customer across all their CRM contacts.
- **Ad day**: spend, impressions, clicks and conversations started for one day.
- **Lead**: a first contact with an estimated origin and date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On FACES data of 2026-11-19 the page reports 2,321 customers: 1,842 with phone, 1,433 with WhatsApp, 50 with Instagram, 478 not reachable (plus or minus sales made since).
- **SC-002**: The owner can answer "how many top-tier customers can Meta match by phone" in under 30 seconds without leaving the page.
- **SC-003**: Every metric on the page can be reproduced by hand from the seeded test data.
- **SC-004**: The page opens in under 3 seconds on FACES data.
- **SC-005**: No request from the page reaches Meta.

## Assumptions

- Blended cost per new customer is acceptable until exact ad attribution exists (proposal slice S3).
- The funnel is stage counts for the range, not a tracked cohort, until leads and customers are linked (slice S1).
- Tax-ledger imports are not sales; only the provider's invoices and PDV tickets are.
- Sending to Meta, consent, and contact merging are out of scope (slices S1 and S4).
- UI follows the design-token contract; a FigCraft as-is/to-be accompanies the hub PR.
