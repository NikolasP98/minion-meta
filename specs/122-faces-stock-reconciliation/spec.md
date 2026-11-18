---
id: 122-faces-stock-reconciliation
title: FACES fulfillment stock reconciliation
status: draft
verdict: pending
created: 2026-11-16
updated: 2026-11-16
repos: [minion_hub]
tags: [logic, data]
proposal: 2026-11-16-faces-stock-cash-crm-meeting-followups
owner_approval: pending
---

# Feature Specification: FACES fulfillment stock reconciliation

**Feature Branch**: Not created; planned Hub branch `feat/faces-stock-reconciliation` against registry PR base `master`.

**Created**: 2026-11-16

**Status**: Draft. Independent EGM review records are under `egm/` and their findings are still being resolved; owner approval of this data-tagged spec and owner merge are pending. This artifact authorizes no production writes. Other files in this package refer to this sentence for review and approval state.

**Input**: Proposal F1: explain prepaid-service and garment discrepancies, prevent any proven repeated or missing fulfillment issue, and prepare separately approved historical corrections.

## AS-IS

Meeting evidence E1–E3 in [the intake proposal](../../proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md) reports apparent early/duplicate deduction, a November 3 garment with no located deduction, and contradictory M/L counts. Names are tentative; the month/year of the day-22 adjustment is unknown. The initial intake had no matched identities. A later read-only snapshot found seven cross-source booking/item matches across five tickets; these are candidates, not seven proven duplicate fulfillments. The specific reported garment is traced to a wrong-variant issue; that is distinct from a missing issue. No display-only case is reproduced yet.

Pinned Hub source `c6c2d5739572356239c4048c0f564f40b0768adc` shows:

- `src/server/services/pos.service.ts:797–843` already issues physical products at sale, skips booking-linked services, and distinguishes ordinary services awaiting scheduling from bundles and counter redemptions.
- `src/server/services/stock-accruals.service.ts:350–466` recovers an issue by supplied source identity and retries a draft; an open expectation is distinct from posted consumption.
- `src/routes/api/scheduling/bookings/[id]/complete/+server.ts:29–79` commits completion before attempting stock and can return `ok: true` with a warning. A completed appointment alone does not prove deduction.
- `scripts/repair-service-sale-stock.ts:1–20,138–224` already previews and repairs a defined older sale-time service issue. Its existence or header does not establish whether the meeting cases need it, whether it ran, or whether the current service mapping equals historical fulfillment.

Source inspection proves these paths exist at this commit. It proves neither deployment identity nor historical cause. The [sanitized database snapshot](../../audits/2026-11-16-faces-followups/evidence/database-read-summary.json), observed 2026-11-16T19:15:08.359Z under read-only `app_ledger` organization scope, found current FAJA-M quantity 19 and FAJA-L quantity 8, zero negative bins and zero existing-bin/latest-ledger mismatches. These are internal stored values, not a physical inventory verification. The overlap query aggregates a POS issue at ticket/item level and can repeat it across bookings; do not sum those rows as independent consumption.

The [focused meeting-case read](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json), observed 2026-11-16T19:20:30.051Z in repeatable-read/read-only `app_ledger` scope, proves a separate variant inconsistency: POS-2026-00098 line `344b74e4-c9bf-46c2-b5f1-8fc063038d28` is physical product Faja M, quantity 1, total 0; linked submitted stock entry STE-2026-00578 (`0e54f2e3-eb62-4a79-80be-95151bdb481a`) issues FAJA-L quantity 1. Current Faja M product `8ebe2b40-2bd5-4543-b380-dc6ba6cc7ca0` maps to L item `f7ea983f-8e32-4688-b3ec-a6baef3bbe2d`, quantity 1, with no direct item bridge. Intended M item `941382a8-fbdb-472d-97cc-77407ac2d8fe` exists. This establishes a current mapping problem and observed wrong-variant effect, not every historical duplicate or the full physical M/L discrepancy. The ticket already identifies M correctly; changing its product or payment is not the appropriate stock-only correction.

## TO-BE

Staff receive a linked, understandable explanation for each reported case: duplicate posting, missing realization, variant mismatch, display-only discrepancy, valid movement, or unresolved identity/evidence. Every actual fulfillment has exactly its intended net stock effect in the correct variant and unit of measure (UOM). Payment remains on its receipt date; an appointment remains on its scheduled date. Valid products handed over at the counter still deduct at sale. Expectations and reservations must remain distinguishable from posted deductions.

## DELTA

| Transition | Proof required |
| --- | --- |
| Tentative name/count → matched source timeline | Explicit same-organization links among payment, sale line, booking, redemption, accrual, entry and ledger; ambiguous candidates remain unresolved. |
| Reported discrepancy → classified evidence | Duplicate requires two independent live issues for the same fulfillment after reversals; missing requires confirmed delivery plus absent issue; display-only requires correct ledger plus reproduced projection mismatch. |
| Wrong current M→L recipe → corrected future mapping | Owner-approved atomic mapping correction points M to M quantity 1 while L→L stays unchanged; synthetic M sale issues M only, including total 0/discounted product. |
| Proven failure → bounded prevention | A synthetic reproduction fails first, then passes through sale, single/group completion, retries and concurrency without changing payment facts. No speculative global stock-timing rewrite. |
| Approved historical correction → reconciled result | Approved before/after quantities and values, original records retained, repeat run proposes no change, affected bins agree with latest ledger state and unrelated records are unchanged. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explain each reported stock discrepancy (Priority: P1)

As the FACES owner, I can review one timeline per reported customer/garment case and see what is known, what moved stock, and what evidence is missing.

**Why this priority**: An incorrect adjustment can hide a missing issue or repeat a prior true-up (a prior inventory adjustment or manual stock issue). Diagnosis is independently useful before any correction.

**Independent Test**: A synthetic evidence set containing one duplicate, one missing realization, one wrong-variant issue, one correct-but-misdisplayed garment, one valid counter sale and one ambiguous name produces six distinct classifications, with no writes.

**Acceptance Scenarios**:

1. **Given** payment on D1 and fulfillment on D2 with linked sale and booking issues, **When** reversals, prior corrections and quantities are reconciled, **Then** only proven excess consumption is classified duplicate; D1 and D2 stay separate.
2. **Given** completed status, a failed stock attempt/draft and independent evidence confirming delivery/consumption was expected and actually occurred, **When** no submitted issue exists after source/reversal/true-up reconciliation, **Then** the case is classified missing realization rather than duplicate or posted. Without that confirmation, or with contradictory/explicitly empty consumption evidence, classification is unresolved; completion alone never proves missing stock.
3. **Given** two customers with similar names or uncertain M/L/date evidence, **When** identity is not unique, **Then** the report lists candidates and refuses a correction recommendation for that case.
4. **Given** a correct net ledger but a garment absent from one view, **When** the display is reproduced in QA, **Then** it is classified display-only and referred to F5 with no inventory adjustment.

### User Story 2 - Keep fulfillment stock effects consistent (Priority: P1)

As a cashier or clinician, I can issue the intended garment variant and take an advance payment followed by fulfillment without deducting the same unit twice or silently losing an issue.

**Why this priority**: Any proven ongoing defect must be prevented before repairing old records.

**Independent Test**: A locally reproduced failure is corrected in a synthetic D1 payment → D2 ordinary-service/package/garment matrix, including sequential and concurrent completion/retry and preserved sale-time counter products.

**Acceptance Scenarios**:

1. **Given** an ordinary prepaid service and a separate physical product handed over on D1, **When** payment is split and fulfillment completes on D2, **Then** the physical product deducts once at sale and each delivered service ingredient deducts once at fulfillment.
2. **Given** a service or package redemption with its intended supply mapping, **When** completion is repeated or concurrent, **Then** the same fulfillment has one net intended issue; reservations and payment history do not create extra consumption.
3. **Given** current M→L mapping and a zero-total discounted Faja M product, **When** the approved mapping is corrected, **Then** future M fulfillment issues one M and no L; future L still issues L, and the historical M ticket product remains M.
4. **Given** a failed stock attempt, cancellation, no-show, reschedule or void, **When** the supported recovery/terminal action runs, **Then** stock truth, recoverable warnings and package rights remain consistent; an unfulfilled appointment contributes no consumption.

### User Story 3 - Correct only approved historical effects (Priority: P2)

As the owner, I can approve a specific correction manifest and receive a durable before/after receipt without erasing original evidence or changing collections.

**Why this priority**: Repair depends on diagnosis, prevention where needed, and owner approval of exact affected records and valuation policy.

**Independent Test**: On a disposable restored fixture, apply an approved manifest twice and simulate interruption; the first run realizes only named changes, the second is a no-op, and recovery has one auditable result.

**Acceptance Scenarios**:

1. **Given** a verified duplicate already offset by a historical true-up, **When** a repair is planned, **Then** that offset is shown and no second credit is silently planned.
2. **Given** approved excess or missing consumption, **When** a repair executes, **Then** the original records remain discoverable, quantity/value differences match approval, and affected bins agree with the ledger.
3. **Given** changed mappings, changed row fingerprints, unknown commit outcome or a cross-organization link, **When** application is attempted, **Then** it stops and reconciles the authoritative state before any retry.

### Edge Cases

- A garment is a product delivered at sale, an item in a service recipe, or a bundled/package component; matching names do not identify ownership.
- A grouped visit has multiple bookings and product lines; aggregate totals must preserve per-fulfillment attribution.
- Explicit confirmation that nothing was consumed differs from omitted confirmation or missing accruals.
- Submitted, cancelled, draft, reversed and partially posted records must all remain visible in the explanation.
- Historical recipe/UOM edits, component expansion, shared recipe leaves and prior manual adjustments can make current mappings unsuitable for automatic repair.
- A warning may be lost, stale, or masked by completed status; ledger evidence controls classification.
- Negative stock, missing warehouse, archived item/warehouse, insufficient permissions, target drift and ambiguous identity fail closed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The reconciliation MUST explicitly identify organization, case scope, snapshot time and source version; candidate records MUST be matched by stable links and dates rather than name alone.
- **FR-002**: The report MUST show source payments, sale lines, bookings/group members, stored booking status transitions, package grants/redemptions, stock expectations, entry states, net ledger effects and relevant adjustments, with missing links marked unknown.
- **FR-003**: Each case MUST receive exactly one primary classification: duplicate, missing realization, variant mismatch, display-only, valid or unresolved, supported by the evidence rules in DELTA; secondary contributing findings MAY be listed without turning hypotheses into facts.
- **FR-004**: Current rules and prior repairs MUST be checked before recommending a change; already corrected consumption or consumption absorbed by an approved true-up MUST NOT be posted again.
- **FR-005**: Fulfilled units MUST have one intended net stock effect in the correct item, variant, warehouse and stock UOM; service expectations MUST remain distinct from posted consumption.
- **FR-013**: The verified Faja M recipe MUST be corrected only after owner-approved before/after mapping evidence; it MUST consume one M item and zero L, preserve Faja L mapping, and correct historical stock separately from the already-correct M sale product.
- **FR-006**: Valid physical products handed over at sale, ordinary services awaiting scheduling, booking-linked services, counter redemptions and bundles MUST retain their separately proven fulfillment semantics.
- **FR-007**: Repeated/concurrent completion and supported recovery MUST neither duplicate consumption nor silently report successful stock posting when only appointment completion succeeded.
- **FR-008**: Payment amounts/dates, appointment dates, billing status and package entitlements MUST NOT be changed by a stock-only historical correction except where separately specified and approved.
- **FR-009**: Discovery MUST be read-only by default. Every mutation MUST require owner approval of this data spec, the exact correction manifest and target, plus owner merge of nontrivial code; approval of investigation is not approval of repair.
- **FR-010**: Corrections MUST preserve originals and reasons, include quantified before/after quantity and valuation effects, refuse stale or cross-organization evidence, provide interruption recovery, and be idempotent on repeat. The proven garment correction MUST replace only its approved variant while preserving the already-correct sale product and unrelated package/service consumption; it MUST NOT regenerate unrelated current recipes.
- **FR-011**: Every approved case MUST reconcile net movement totals and latest ledger/bin quantity and valuation, report affected cost of goods sold (COGS) separately, and demonstrate unchanged unrelated records.
- **FR-012**: Tests MUST cover the story scenarios and edge cases on synthetic/local QA data, including real database concurrency for any new ownership or lock invariant; production data MUST NOT be used for development tests.

### Key Entities *(include if feature involves data)*

- **Case**: A reported discrepancy with candidate identities, evidence completeness, one primary classification and human-readable explanation.
- **Fulfillment**: The actual delivered service/product/package use with stable source links and intended quantity/UOM.
- **Stock expectation**: An open, realized or released anticipated use; it is not itself a ledger movement.
- **Movement**: Original/reversing stock effects and the resulting on-hand quantity and value.
- **Correction manifest/receipt**: Owner-approved, fingerprinted target scope, reasons, predicted effects and observed outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every investigated case has one supported classification or an explicit unresolved reason; zero ambiguous matches are auto-corrected.
- **SC-002**: Every fulfilled unit in the approved regression matrix has exactly one intended net deduction after repeated/concurrent recovery, with zero changes to payment amounts or dates.
- **SC-003**: Every approved historical correction matches its before/after quantity and value report; all affected balances reconcile and a second application changes zero records.
- **SC-004**: The owner can trace each reported deduction to its named source and inspect missing evidence without manually inferring it from opaque movement codes in the reconciliation report.

## Assumptions

- The first deliverable is an evidence report. The wrong current Faja M mapping is proven; a result of no additional ongoing code defect is valid and must not cause an invented prevention code change.
- Exact customer/booking/item identities, day-22 date, deployed version, true-up coverage and historical mapping state are discovery outputs, not assumed inputs.
- F2 owns the 89-unit receipt valuation; F3 owns a general correction interface; F4/F5 own stock-label and event-display changes. This feature may supply evidence to them but does not duplicate those interfaces.
- Production read access, when provided, must be explicitly target-qualified and technically read-only. The coordinator accessed the production database only through the scoped read-only snapshot cited above; this authoring step performed no database calls.
- The known garment correction uses the selected frozen-line (copying original issue lines and changing only the approved variant line) stock-only contract in contracts/repair.md, dependent on F3 atomic correction primitives, with current-open correction-period posting proposed for owner approval. Unproven duplicate/missing cases stay ineligible; no broad backfill is authorized.

## Alternatives Considered

Reject forcing reported physical balances or regenerating a whole ticket from current recipes: neither preserves historical provenance. Select evidence classification plus a frozen, single-ticket L-to-M transformation for the two proven garment cases; keep unproven cases ineligible. This adds explicit manifests and approval steps while preserving unrelated issue lines. Detailed alternatives and source tradeoffs are in [research.md](research.md).

## Later garment population evidence

The [bounded read at 2026-11-16T19:42:24.613Z](../../audits/2026-11-16-faces-followups/evidence/garment-candidates-read-summary.json) found three submitted M sales issuing L. POS-2026-00092 and 00098 are the two reported cases, each quantity 1 with a single original L issue. POS-00059 predates later manual M/L issues, so its true-up coverage is unresolved and it is not approved for correction. The reported cases are covered by the selected single-ticket contract; each still requires fresh fulfillment/coverage fingerprints and exact owner approval. Against the older snapshot M 19/L 8, two isolated one-unit corrections would imply M 17/L 10, but those numbers are a conditional calculation, never overwrite targets or independent physical proof.