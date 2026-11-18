# Feature Specification: FACES receivables and pending-work audit

**Feature Branch**: Not created; docs-only planning. Future slices target Hub `master`.
**Created**: 2026-11-16
**Status**: Draft — owner data-spec approval pending; independent review results under egm/
**Input**: Proposal F7: explain old rows and reconcile true debt, paid-but-unlinked, free, cancelled/no-show, unused reservations and stale state without mass marking rows paid.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explain what the count represents (Priority: P1)

A permitted reviewer gets a dated organization-scoped report separating pending scheduling, unbilled bookings, account balances and payment plans, with source IDs for each contributing record.

**Why this priority**: A work count can include already-paid treatments; treating it as debt risks collecting twice.
**Independent Test**: Synthetic paid-unscheduled and unpaid-scheduled records contribute to separate count components; a free follow-up contributes to neither unbilled debt nor charge action.
**Acceptance Scenarios**:

1. **Given** one paid service awaiting scheduling and one unbilled booking, **When** audit runs, **Then** pending work is two with two explicit components; it is never labelled two unpaid debts.
2. **Given** more clients than the account list limit, **When** audit runs, **Then** every authorized scoped row is reconciled without silent truncation and list pagination/limits do not hide a residual.
3. **Given** concurrent booking/payment changes, **When** a report is produced, **Then** its inventory and control totals share one snapshot and the report states that snapshot.

### User Story 2 - Classify old rows without inventing settlement (Priority: P2)

The reviewer sees evidence, uncertainty and the next action for each old record.

**Why this priority**: Age or completion does not prove payment or debt.
**Independent Test**: A matrix of free, null-price, cancelled, no-show, completed-unlinked, voided-payment, package-funded and plan-funded records retains the correct distinctions.
**Acceptance Scenarios**:

1. **Given** an old booking with no trustworthy price or settlement evidence, **When** classified, **Then** it remains unresolved and is not marked paid or assigned an invented collectible amount.
2. **Given** a free booking, cancelled/no-show row or unused reservation, **When** reviewed, **Then** the report explains the classification and retains operational history without collecting or completing it.
3. **Given** a positive priced service and evidence of actual delivery with no settlement, **When** reviewed, **Then** it is a candidate genuine debt with amount/currency and the exact approved typed evidence contract; normal collection remains separately available after human confirmation.

4. **Given** apparent partial or refund/wallet/invoice money without the selected complete settlement proof, **When** reviewed, **Then** the row stays unresolved with an unknown remainder, rather than an invented amount to collect.
5. **Given** a currently free booking with an evidenced historical charge and delivery, **When** complete authorized evidence proves no recorded settlement, **Then** the historical debt candidate remains distinct from its current-free exclusion in the work count.

### User Story 3 - Prepare exact corrections for human approval (Priority: P2)

A reviewer prepares a before/after proposal linking an existing payment record to its proven booking, or explaining why further evidence is required.

**Why this priority**: Proven paid-but-unlinked rows must not be collected again.
**Independent Test**: A synthetic ambiguous pair produces no apply proposal; a uniquely proven pair produces one deterministically identified, hashed proposal whose expected outcome is a link only, zero new payment and zero stock/lifecycle mutations.
**Acceptance Scenarios**:

1. **Given** an unlinked paid line and proven same-customer, same-service booking, **When** selected, **Then** the report contains exact IDs, constraints and projected count deltas for approval; it does not execute the repair.
2. **Given** a voided ticket, conflicting identity, partial payment, split service quantity or multiple plausible bookings, **When** candidate generation runs, **Then** it is unresolved/manual review, never an automatic link.
3. **Given** the pair were the client’s last pending work and no wallet/funding key remains, **When** a link is proposed, **Then** its hashed explanation predicts the logical account row may disappear while wallet amounts stay unchanged; it makes no promise about the limited rendered list.
4. **Given** an approved proposal becomes stale, **When** later execution is attempted by a separately approved repair slice, **Then** it must revalidate the entire pair and refuse changed data.

### Evidence authority acceptance

A capable non-owner may run an approved evidence-free inventory, with missing historical facts unresolved. The same principal with any external evidence is denied before subject reads; an actual owner with required effective authority may admit only their own exact approved assertions. Owner-role revocation, an owner lacking effective authority and a different verifier are denied.

### Edge Cases

- Completed but unbilled; old accepted reservation never attended; price changed since booking; absent or inactive product resolves null rather than zero.
- Package grants, redemptions, instalment plans, refunds, void/legacy voided tickets, split payments, imported invoices and missing links.
- Customer party/contact aliases, deleted contacts, missing identity, multiple currencies, grouped appointments, quantities greater than one.
- Paginated account display versus complete audit; badge/list predicate differences; one record contributing to more than one independent financial facet.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Produce a read-only, bounded-memory, complete organization-scoped audit with snapshot timestamp, source version, parameters, all source IDs and control totals.
- **FR-002**: Explain pending-work count as paid-unscheduled service lines plus eligible unbilled bookings; show client balances and open plans separately, by currency.
- **FR-003**: Reuse canonical eligibility rules, including zero-price exclusion, void/voided handling, invoice links, package grants and plans; expose any existing reader disagreement as a residual instead of silently normalizing it.
- **FR-004**: Assign one primary review classification per audited subject and preserve orthogonal facts such as operational status, funding and payment linkage. Supported classes are genuine-debt candidate, paid-but-unlinked candidate, free, inactive, unused-reservation candidate, stale-lifecycle candidate and unresolved.
- **FR-005**: Require evidence of service/delivery, contractual amount/currency and absence of settlement before recommending collection; current catalog price or age alone is insufficient.
- **FR-006**: Keep missing price, identity, settlement and attendance unknown. Never mark old rows paid/completed, cancel them, create a new payment or post stock through this audit.
- **FR-007**: Prepare exact, immutable repair proposals only for evidence-backed pairs; human approval and revalidation are required in a separate execution step. Matching names, dates or amounts alone is insufficient.
- **FR-008**: Reconcile inventory counts to canonical badge and account projections with explicit component-level residuals; do not sum currencies or mix row count and client count.
- **FR-009**: Require authenticated organization and existing POS/finance review authority; apply customer/cost masking to exported material and deny another tenant's records.
- **FR-010**: Enforce these evidence and artifact obligations:
  - External-evidence runs require the executing authenticated principal to be the fresh organization membership owner, with all effective review/export authority checks retained; every assertion verifier equals that executing owner.
  - Evidence-free runs retain capable-reviewer admission.
  - Admit only the exact owner-approved evidence digest and assertions, within the defined booking-start/ticket-submission cohort bounds.
  - Keep run metadata outside stable proposal identity.
  - Protect reports as sensitive artifacts, retain the manifest/checksums and access/run identity, and export only fields needed for review.
- **FR-011**: Test all classification, limit, concurrency, currency and tenancy boundaries with synthetic data before any approved live read.

### Key Entities

- **Audit run**: Organization, snapshot, version, approved scope, run actor, control totals and checksums.
- **Audit subject**: Booking or paid-unscheduled service line, with evidence, classification, uncertainty and recommended next step.
- **Repair proposal**: Exact original facts, proposed link, proof, predicted deltas, immutable hash and pending human approval.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every synthetic scoped pending-work subject appears once in its count component, and component counts reconcile to the canonical count or an explicitly explained residual.
- **SC-002**: All free, cancelled/rejected/no-show and already-settled test cases avoid a recommendation to collect again.
- **SC-003**: Every debt candidate has delivery, amount/currency and settlement evidence; every missing fact is visible as unresolved.
- **SC-004**: Two identical audits of unchanged synthetic data produce identical sorted subject content/checksums, and zero changes to payment, booking, stock or ledger tables.
- **SC-005**: Every proposed paid-line linkage preserves original payment totals/dates and predicts zero new payment or stock effect.

## Assumptions

- Meeting numbers 280→186 are historical statements, not a target count or current observation. A bounded November 16 live-read summary observes 184 pending-work subjects, split 1 paid-unscheduled + 183 unbilled, not measured debt. Row classification/settlement and current totals after that snapshot remain unknown.
- Positive financial conclusions use deliberately narrow complete evidence cases. Partial payments, refunds, wallet allocations and ambiguous financial paths remain unresolved; a finite approved date interval does not authorize reading all customer history or claiming complete settlement.
- The audit is an operational diagnostic with repair proposals; collection and production repairs remain separate approved work. No settlement rule is inferred from the meeting.
- A cancelled/no-show row is an operational exclusion, not proof no contractual cancellation fee exists; such debt needs independent evidence outside the booking count.

## AS-IS → TO-BE → DELTA

AS-IS at pinned Hub `c6c2d5739572356239c4048c0f564f40b0768adc`: `countPosPendingWork` (`src/server/services/pos-accounts.service.ts:540`) sums paid-unscheduled service lines and unbilled bookings. `pos/accounts/unbilled.ts:24` excludes zero-priced active products, inactive statuses, invoice/grant/plan links and live ticket links; null price stays eligible. No age cutoff or completed exclusion exists. `pos/accounts/list.ts:12` is a client summary capped at 500; its pending-scheduling predicate differs from the badge for legacy `voided`. See [research.md](research.md) for exact anchors.

A bounded [live-read baseline](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json), observed `2026-11-16T19:20:30.051Z` under repeatable-read READ ONLY/app_ledger, reports 1 paid-unscheduled + 183 unbilled = 184 pending-work subjects. It does not establish real debt or current post-snapshot totals.

TO-BE: an evidence-led report that distinguishes pending operations, settlement, uncertainty and real collection work.

DELTA: add read-only row inventory, deterministic classification, control totals and repair proposal generation. Preserve eligibility rules, expose disagreements, make no production mutations. US1 proves totals; US2 proves classification; US3 proves safe proposal boundaries.

## Alternatives Considered

Reject mass marking old records paid, treating age as debt, or matching payments by names/amounts alone: these can erase uncertainty and cause duplicate collection. Select a read-only same-snapshot classification report with inert, evidence-bound linkage proposals. Production repair remains a separately reviewed execution slice, which adds a later gate but keeps this audit free of mutation authority. Detailed alternatives are in [research.md](research.md).

## Approval and release gates

Data-tagged: owner approval of this spec is pending before product implementation, human merge required. Independent review results are recorded under egm/. Live reads require exact approved organization/time scope and protected output location. A later repair requires its own reviewed dry-run, exact row approval and reversible execution design; this spec provides no apply mode. No product implementation, live audit, repair or release has occurred.

The audit and its dependent correction consumers require the authority bridge and snapshot-principal prerequisites listed in [plan.md](plan.md#prerequisites-and-normative-contracts). Excluding a booking from the badge because its current catalog price is zero does not establish whether a historical charge was settled or waived.
