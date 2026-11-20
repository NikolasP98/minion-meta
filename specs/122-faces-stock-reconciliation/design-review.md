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

## Detailed Implementation Plan

This boundary separates the stakeholder specification from the complete technical companion artifacts. Source is pinned; tests and implementation are proposed unless an explicit evidence receipt says otherwise. Independent EGM records live under egm/. Owner data/security approval and owner merge remain pending.

### Review artifact: plan.md

## Implementation Plan: FACES fulfillment stock reconciliation

**Branch**: Not created; planned `feat/faces-stock-reconciliation` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: `specs/122-faces-stock-reconciliation/spec.md`, proposal F1, pinned Hub `c6c2d5739572356239c4048c0f564f40b0768adc` and sanitized read-only snapshot.

### Summary

Ship a bounded read-only reconciliation report first. Separate overlap candidates, confirmed duplicates, missing realization, verified variant mismatch and display-only cases using stable provenance and signed ledger effects. Preserve valid counter-product timing and payment dates. Existing spec120 service repair is an evaluated tool, not permission or proof of applicability. The verified M mapping correction and bounded garment stock-only historical repair are designed in this packet; the latter depends on F3 atomic correction primitives. Unknown duplicate/missing cases remain diagnostic findings, not invented repair instructions.

### Technical Context

**Language/Version**: Hub TypeScript strict, Bun (registry); no dependency/runtime version change.

**Primary Dependencies**: Existing PostgreSQL client/Drizzle service conventions; `stock.logic.ts`, stock/POS/scheduling schemas; Vitest for synthetic regression and local PostgreSQL for concurrency.

**Storage**: Existing scoped PostgreSQL reads; private mode-0600 diagnostic artifacts. No table/migration required for S1.

**Testing**: Synthetic provenance/classification unit and contract tests; disposable local QA integration; later native concurrent tests for any new writer invariant.

**Target Platform**: Operator-run Bun CLI against explicitly qualified target, then existing Hub fulfillment paths if a defect is proven.

**Project Type**: Read-only operational diagnostic first; subsequent backend changes separately gated.

**Performance Goals**: Bounded case/ID/date scope, per-statement timeout 12s, lock timeout 1s, no unrestricted fleet scan. Capture timings and report incomplete reads; no invented production latency SLA.

**Constraints**: No production writes in S1; one technically read-only connection/transaction; no credentials/PII in committed evidence; no model calls; source SHA and live deployment claims separate; immutable pinned source remains unchanged.

**Scale/Scope**: FACES organization only; reported cases plus deduplicated candidate review. Seven existing overlap rows across five tickets are input candidates, not a complete population or effect total.

### Constitution Check

| Principle | Pre-design | Post-design evidence |
| --- | --- | --- |
| I Spec before code | Pass for drafting | spec/plan/tasks produced; no product implementation started. |
| II AS-IS/TO-BE/DELTA | Pass | Anchored source, timestamped read-only evidence, explicit unknowns and per-transition oracles. |
| III Slice-scoped delivery | Planned | Registry verified Bun/master. Isolated branch/PR creation deferred to implementation; no existing branch/worktree changed. |
| IV Required build steps | Pass for S1 design | No new page/API/nav/UI strings. Any later surface change requires RBAC route manifest, Paraglide, UI skill/token gates in amended design. |
| V Data/security owner gates | BLOCKED for implementation/apply | Owner spec approval pending. Owner merge and exact manifest/target approval pending. Dry-run default, QA undo in finally, repeat invariant and unknown-outcome recovery required. |

Draft planning may finish. The blocked implementation gate does not become a pass because documentation exists. No constitution exception is claimed.

### Project Structure

#### Documentation

`specs/122-faces-stock-reconciliation/`: spec, research, plan, data model, implementation-inventory.md, quickstart, tasks, checklists/requirements.md, the generated combined design-review.md, and contracts: [report.md](contracts/report.md), [diagnostic-wire.md](contracts/diagnostic-wire.md), [source-explanation.md](contracts/source-explanation.md), [mapping-correction.md](contracts/mapping-correction.md), [mapping-envelope.md](contracts/mapping-envelope.md), [unchanged-facts.md](contracts/unchanged-facts.md) and [repair.md](contracts/repair.md).

#### Source code (proposed Hub paths)

- `scripts/faces-stock-reconcile-2026-11.ts`: orchestration, target/read-only guards, report I/O.
- `scripts/lib/faces-stock-reconciliation.ts`: pure canonicalization, provenance and classification; no database/client import.
- `scripts/lib/faces-stock-reconciliation.test.ts`: synthetic join multiplicity, case and quantity oracle tests.
- `scripts/faces-stock-reconcile-2026-11.test.ts`: CLI guard/read-only/output contract tests.
- Existing `src/server/services/pos.service.ts`, `stock-accruals.service.ts`, `stock.service.ts`, `scheduling-bookings.service.ts`, `src/routes/api/scheduling/bookings/_handlers.ts`, completion handlers and tests: read targets in S1; modification only if S2's reviewed reproducer proves a change necessary.
- Existing `scripts/repair-service-sale-stock.ts` and `scripts/repair-service-sale-stock.test.ts`: inspect coverage before proposed reuse; no blind execution.
- `scripts/faces-garment-repost-2026-11.ts`, `scripts/lib/faces-garment-repost.ts` and their `.test.ts` counterparts: bounded single-ticket frozen-line repair, calling the qualified F3 atomic correction engine. No independent stock writer or correction table.

**Structure Decision**: Keep evidence classification separate from connection orchestration. Reuse current schema/domain logic where it is pure; do not call mutating service functions from a diagnostic.

### Phase 0: Evidence and decisions

Research is in [research.md](research.md). Exact reported identities, source-version linkage, true-up coverage and historical intended consumption remain diagnosis outputs. The design resolves their treatment: fail closed and mark unresolved. It does not fabricate values to make a speculative repair executable.

### Phase 1: Design and contracts

[data-model.md](data-model.md) defines canonical ledger rows plus separate provenance; [contracts/report.md](contracts/report.md) defines a read-only script/file surface and errors. Every relation is org-qualified. Canonicalize ledger rows before joins/aggregation; ledger IDs always follow the data-model.md Ledger identity rule (selected as text, ordered as `BigInt`), whatever their current magnitude. Entry provenance is decoded only by the closed stock entry source decoder in contracts/source-explanation.md; booking visit groups are resource-qualified as `visitMembers` defines them. Compare the full union of latest-ledger and bin keys, not only bins present. Historical signed reversals participate in net totals. Preserve warnings, drafts and prior repair markers. Report current mappings explicitly as current, and refuse inferred historical ownership.

### Delivery slices and dependency gates

#### S1 / US1: read-only evidence report

After owner spec approval, create an isolated Hub feature branch and draft PR from the verified registry base. Recheck latest source against this baseline and amend anchors/behavior before coding if drift changes conclusions. Write synthetic tests first. Implement private bounded report; no apply flag. On local QA exercise ambiguous identity, grouped bookings, shared recipe items, partial warnings, cancelled entry reversals, released accruals, UOM conversion and prior true-ups. Rehearse read-only failure/role/scope guards. A new production report may run only after target qualification with a technically read-only transaction; existing snapshot is evidence, not proof a new script is safe.

Output is a reviewed case table with canonical sums, not a remediation count. Cases without complete attribution remain unresolved. The verified mapping is handled by S2a. If no additional ongoing code defect is demonstrated, close that question explicitly without modifying stock timing.

#### S2a / US2: verified Faja M recipe correction (owner approval pending)

Use a separate dry-run-default mapping-only script at `scripts/faces-garment-mapping-2026-11.ts`, with pure plan/tests at `scripts/lib/faces-garment-mapping.ts` and `.test.ts`. Exact before scope is FACES product `8ebe2b40-2bd5-4543-b380-dc6ba6cc7ca0`, current recipe L item `f7ea983f-8e32-4688-b3ec-a6baef3bbe2d` quantity 1, no direct item bridge; desired sole recipe M item `941382a8-fbdb-472d-97cc-77407ac2d8fe` quantity 1. Resolve actual mapping row ID from fresh scoped data; no invented ID. Preserve L product mapping and unrelated recipes. Preview reports mapping, source/target/digest, potentially affected sales/open expectations and cutover policy; never changes a ticket/payment/date.

Apply requires separate exact-manifest/target owner approval, a single scoped transaction with row locks and compare-before conditions, validation that items/product remain same-org and current recipe/bridge/component state matches approval, and an atomic unique-key-safe replacement. If an M row already exists unexpectedly, stop; if the whole desired state exactly matches an already-applied receipt, verify no-op. Do not implement two separately committed `setConsumption`/`deleteConsumption` calls: readers must never observe a committed both-item/no-item recipe. Audit before/after and operation receipt transactionally for this repair; do not claim existing best-effort audit is atomic. Rehearse rollback/compensation in finally and repeat invariants in disposable QA.

Cutover, the write gate pair, the old-M draft/open-accrual census, refusal/commit/recovery and deployment qualification are specified once in [contracts/mapping-correction.md](contracts/mapping-correction.md), with the typed command in [contracts/mapping-envelope.md](contracts/mapping-envelope.md). Historical submitted cases stay separate. Preserve valid current service/product timing; the gate is synchronization, not a global payment-time issue policy.

#### S2b / US2: any additional proven prevention only

Depend on S1 findings. Add a reviewed design amendment naming the failing transition, exact code writer, transaction/lock invariant, compatibility rules and source ownership key; require owner approval before data-tagged code. Reproduce failure in local QA before editing. Evaluate current ordinary-service skip/spec120, grouped and single completion, gateway action path, package grant/redemption, product-vs-service kind, concurrent retries and any partial-post path. Select the smallest demonstrated fix; do not install a generic ownership table or flatten valid sale-time rules speculatively.

Minimum oracle matrix: ordinary prepaid service D1→D2, package with included service/components, standalone garment delivered at sale, booking garment recipe, split payments, three bookings on one ticket, repeated/concurrent completion, warning/draft retry with changed requested lines, explicit no consumption, cancel/no-show/reschedule/void and prior correction. Assert ledger quantities and source ownership, unchanged payment facts and package rights. If a new unique/lock invariant is introduced, run actual PostgreSQL concurrency tests rather than mocked service calls alone.

#### S3 / US3: proven garment historical correction

Implement [contracts/repair.md](contracts/repair.md) after S1 attribution, S2a mapping correction and the F3 atomic correction service are qualified. This is a concrete selected design for the two reported M sale/wrong-L issues, each processed as a separate operation, not a future writer-choice task. Preview a frozen copy of the original single-L issue transformed to M with identical normalized quantity/warehouse; do not add supplies from current co-ticket recipes. Use the existing planRepost decrease/increase guards inside the F3 engine, with the exact frozen-line quantity equality, explicit before/after value/COGS and exact source/mapping/bin/period fingerprints in that contract. Full F3 transaction, durable receipt, authoritative actor/policy, current-open correction-period posting, retry/unknown-outcome and QA inverse rules are specified in that contract. Preserve all sale product, payment, appointment and package facts.

New source files are the narrow single-ticket CLI and pure validator named above; F3 owns the shared server transaction API. No F1 batch framework or independent ledger writer. Cases absorbed by a later true-up, ambiguous historical fulfillment, missing sources or unsupported multi-item ownership are explicit blocked outcomes, never guessed adjustments. The initial mapping and known ticket are verified; applicability of a particular historical apply still requires fresh true-up coverage and owner exact-manifest/target approval. Other duplicate/missing-service cases cannot enter the garment writer and must retain evidence-bound investigation outcomes.


### Validation and commands

Run [quickstart.md](quickstart.md) from the implementation checkout. Required Hub gates: `bun run check` (zero errors/warnings), `bun run test` (zero failures), `bun run build`. Source-only authoring ran registry/SHA checks and Spec Kit script prerequisites, not these product gates. Private source verification checks cannot prove behavior, release or runtime reconciliation.

### Errors, risks and recovery

Connection/schema/timeout failures yield incomplete report and zero repair eligibility. Unexpected tenant links fail closed with redacted error. Missing conversion, ambiguous mapping/history, absorbed true-up, source drift, partial posting or unknown transaction outcome require manual evidence, not guessed quantities. Never rerun a backfill over history already reflected in an adjustment. Any changes to documented stock flow preserve entry→ledger→bin consistency and identify post-commit audit limitations.

### Complexity Tracking

No constitution violation is waived. S1 adds only a pure reporting module and guarded CLI. Known mapping and historical-garment writers are bounded here and reuse F3; additional unproven code defects require evidence before proposing any change.

### Cross-item execution ordering

This is the single statement of F1's ordering against F2 and F3; other files link here. Qualify the F3-owned shared transaction helpers, correction storage migration/RLS/seed and compatible lock protocol before any F1 or F2 writer. For Saypha receipt-chain keys or source entries that appear in an F1 overlap candidate, perform the approved F2 valuation correction first, then regenerate the F1 diagnostic and quantity manifests from fresh authoritative state; never reuse pre-F2 fingerprints or independently repair one source twice. F2 admits only its supported homogeneous envelope (one receipt plus at most 128 ordinary issue entries) under a fresh approved manifest, and any stock movement after a preview invalidates that preview's fingerprints. The garment M/L mapping and stock-only repost involve different item keys and must not change the Saypha chain. Unproven duplicate/missing cases remain ineligible. This ordering is a design contract, not current apply authorization.

### Two-case execution ordering

Use the case table in contracts/repair.md. Produce and approve separate single-ticket manifests; after the first commit, refresh and re-approve the second because shared bins changed. The older POS-00059 candidate stays ineligible until the later manual adjustment coverage is explained. Do not coerce a physical target or start a batch.

### Shared dependencies

F7 owns the single `verifyOperatorPrincipal` + `resolveFreshCapabilitiesReadOnlyInTransaction` API used by every F1 preview and report; signatures, token rule, gate terms and cost authority are in [contracts/report.md](contracts/report.md). F3 owns the write gate, locking resolver, helpers and receipt used by mapping and frozen garment apply ([transaction-protocol.md](../124-stock-correction-workflow/contracts/transaction-protocol.md)). These are prerequisites, not duplicated implementations. The ordered classification table handles mixed discrepancies and partial components; data-model.md fixes exact quantities and diagnostic value/rate tolerances. Native F1 cases are admitted to qa-native as quickstart.md specifies; ordinary test/build does not execute the SQL fixture. Recheck all participant paths and source drift before implementing cutover.

### Selected per-file actions

[implementation-inventory.md](implementation-inventory.md) is the complete selected Create/Modify/no-change boundary, including tests, dependency-created files, conditional S2b test files and the single evidence location. No Delete action is selected.

### Contracts

Each rule is stated once, in its owning contract:

- Diagnostic CLI, admission, gate terms, cost authority, exits and classification: [report.md](contracts/report.md).
- Diagnostic wire, ledger/group identities and run-stable comparison: [diagnostic-wire.md](contracts/diagnostic-wire.md).
- Source facts, timeline, stock entry source decoder, booking groups and projection comparison: [source-explanation.md](contracts/source-explanation.md).
- Mapping cutover and storage: [mapping-correction.md](contracts/mapping-correction.md); typed mapping command, receipt, status, flags and exits: [mapping-envelope.md](contracts/mapping-envelope.md); unchanged-facts digest: [unchanged-facts.md](contracts/unchanged-facts.md).
- Garment correction, its API, manifest, posting time, active-principal checks, atomic receipt and stock-denomination qualification: [repair.md](contracts/repair.md), with F3 [garment-envelope.md](../124-stock-correction-workflow/contracts/garment-envelope.md), [recovery-receipts.md](../124-stock-correction-workflow/contracts/recovery-receipts.md) and [garment-numerics.md](../124-stock-correction-workflow/contracts/garment-numerics.md).

### Review artifact: research.md

## Research: FACES stock reconciliation

### Evidence baseline and method

Source checkout: `.local/faces-followups-2026-11-16/hub-source`, verified HEAD `c6c2d5739572356239c4048c0f564f40b0768adc`. Paths below are relative to that Hub commit. Read `AGENTS.md` and `CLAUDE.md`; registry `node scripts/repo-policy.mjs show hub` confirms Bun and PR base `master`. No product code, branch, worktree, credentials or production state changed in this drafting step.

The coordinator's read-only database snapshot is summarized in `audits/2026-11-16-faces-followups/evidence/database-read-summary.json`, observed `2026-11-16T19:15:08.359Z`, role `app_ledger`, verified organization FACES SCULPTORS (`21e0601b-f632-43fd-8414-d644af4271f4`), transaction read-only `on`. Raw private receipt SHA-256 `d0ca389a3b0af3b63f8352f7b9930477440f7a4e9b0d4e3bcc2f76d4a2a9263d`; named rows remain in mode-0600 `.local/faces-followups-2026-11-16/db-evidence-private.json`. No PII is copied here. Deployed SHA and historical code version remain unverified.

### Current source versus unproven conclusions

| Anchor | Observed at pinned source / snapshot | Not established |
| --- | --- | --- |
| `pos.service.ts:797–843` | `kind=product` issues at sale; booking-linked services skip; ordinary nonbundle service awaiting scheduling skips; counter redemption or bundle may issue. | Whether meeting garment was a counter product, service ingredient, included package product, or an old mapping. |
| `pos.service.ts:1065–1187` | Recovers `pos` source issue; source-stamped drafts are retried; some shortfalls filter lines and produce warning. | That a submitted stock entry covers every expected item, or that current rules produced historical records. |
| `stock-accruals.service.ts:83–219,350–466` | Open accruals are expectations, release on explicit empty confirmation, source identity locates draft/submitted issue; draft retry does not replace prior draft lines. | That a missing accrual means no fulfillment, or that repeated completion with changed lines corrects an old draft. |
| `scheduling/bookings/[id]/complete/+server.ts:29–79` | Status completion commits before fail-soft stock realization. | That completed status proves consumption or a successful stock write. |
| `scheduling/bookings/_handlers.ts:294–390,673–710` | Bare completion may require confirmation; grouped transitions have per-member checks and post-commit realization. | That all entry paths are atomic together, or that only the single completion handler matters. |
| `stock.service.ts:679–713,778–1015` | Only draft entries editable; stock submission locks entry/bins; cancellation appends exact original qty/value reversals, may refuse negative stock. Audit is best effort after stock commit. | That cancelling and reposting old consumption preserves historical COGS, or that audit failure means stock rolled back. |
| `pos.service.ts:1240–1360` | Preview/repost compares live quantities with current recipes, refuses unnamed drift, claims ticket stamp, cancels then reposts in separate calls, interrupted state `repost_pending`. | That current recipes are historical truth, or repair is atomic end-to-end. |
| `scripts/repair-service-sale-stock.ts:128–166,199–226` | Preview pins one read-only session; direct recipe candidate scan; apply uses separate app pool and repeat-plan invariant. | Component recipes are absent in current data, apply has transaction-wide atomicity, or the historical script's stated production assumptions remain current. |
| `pg-schema/stock.ts:172–211,243–289` | Ledger append-only; bigint sequence is ordering key; bins cache latest snapshots; accrual uniqueness is org/source/sourceId/item. | A cross-source uniqueness guarantee, historical ownership, or physical accuracy from internal agreement. |
| `pg-schema/stock.ts:181,348`; `stock.logic.ts:382` | `stkLedger.id` is `bigserial('id', { mode: 'number' })`, so every Drizzle select of that column, `StkLedgerRow` (`getLedger`, `getRecentLedger`) and `LedgerReplayRow.seq` carry a JavaScript `number`. | That ledger IDs stay below `Number.MAX_SAFE_INTEGER`. F1 therefore reads IDs as text (data-model.md, Ledger identity). |
| `stock.service.ts:1319–1322,1740–1752,1783–1800,1915–1925,1990–2011`; `src/lib/components/stock/entry-document.ts` | Entry provenance is untyped `stk_entries.metadata`. POS and booking issues store `{source, sourceId}` (POS issues also carry `ticketId`); invoice issues store `{source: 'invoice', invoiceId, providerRef}` with no `sourceId`; plain service issues store `{source: 'service', finProductId, quantity}` with optional `sourceId`; purchase receipts store `purchaseId`. The garment evidence also shows `repair-opening-balance`, `analyst-reconciliation-2026-08` and `{}`. `entryDocument` is a display-link helper that returns null for service, manual and unknown sources. | A closed, typed source decoder. F1 adds one (source-explanation.md, Stock entry source decoder). |
| `scheduling-bookings.service.ts:1752–1755,2190–2221` | `groupIdOf` reads a nonempty `metadata.groupId`; `visitMembers` selects members by organization, byte-equal `metadata->>'groupId'` and the anchor booking's `resource_id`. | That `groupId` alone identifies a visit: the same `groupId` on two resources is two visits. |
| `pg-scheduling-schema.ts:286–311`; `scheduling-bookings.service.ts:577,1117,3867` | `sched_booking_status_log` records `from_status`, `to_status`, `reason`, `changed_by` and `changed_at` at booking creation and at every status change, in the same transaction as the booking update. The schema comment saying nothing populates it is stale. | That every older booking has log rows, or that a `completed` transition proves physical delivery. |
| Database summary | Seven overlap rows across five tickets; current M=19, L=8; existing bins show zero negative values and zero latest-ledger mismatches. | Seven duplicate issues, exact overstatement, complete ledger-only-bin coverage, or physical correctness. |

### Verified wrong-variant case and bounded prevention design

Focused sanitized evidence `audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json`, observed `2026-11-16T19:20:30.051Z`, private snapshot SHA-256 `9f028bd6c26af39deb6383a2f12cdbe07799bb2b150549b1f987c6bf332277a7`, proves:

- Faja M product `8ebe2b40-2bd5-4543-b380-dc6ba6cc7ca0` has no direct stock bridge and current recipe quantity 1 of FAJA-L item `f7ea983f-8e32-4688-b3ec-a6baef3bbe2d`; Faja L also maps to that L item.
- POS-2026-00098 ticket `6284d37e-a942-4f96-a27f-67ef4381860e`, physical product line `344b74e4-c9bf-46c2-b5f1-8fc063038d28`, correctly records Faja M quantity 1, total 0 (discounted package inclusion). Its live POS issue STE-2026-00578 `0e54f2e3-eb62-4a79-80be-95151bdb481a` records L quantity 1. A zero price does not remove a physical fulfillment's stock obligation.
- Intended M stock item `941382a8-fbdb-472d-97cc-77407ac2d8fe` exists with stored quantity 19 at the snapshot; L quantity 8. This one case's potential stock-only correction is +1 L / −1 M, conditional on delivery/true-up and valuation approval. It does not justify forcing the meeting's M=17 physical claim or another arbitrary L count.

Source `stock.service.ts:1227–1314` shows `setConsumption` upserts a product/item unique key and `deleteConsumption` removes a mapping, each in its own transaction; calling them in succession is not an atomic replacement. A guarded mapping-only script must lock and compare the exact current same-org M recipe and atomically replace the wrong item with the verified M item, refusing an unexpected preexisting M mapping/component/bridge or changed quantity. It must retain before-image/audit/operation identity and no-op when exact desired state is already present; no temporary both-item or no-item committed state. Existing readers see an old or new committed recipe, never an intermediate combination. Concurrent sales crossing the cutover need a documented operational boundary and a post-cutover census for the old mapping; a mapping-row lock alone does not serialize POS readers that do not lock it.

Historical stock-only repost can be evaluated after mapping correction: `previewTicketRepost` must show old L quantity 1 → new M quantity 1 with no other drift; explicit `allowedItemIds={L}` and `allowIncreaseItemIds={M}` may authorize the existing repost invariant. Do not call product swap: the ticket product is already M. Existing repost spans claim/cancel/post, so fault recovery, expected-state rechecks and old-entry cancellation must be rehearsed before approval. F3 owns the general workflow; this exact case remains under F1's manifest gate.

### Decision 1: diagnose before choosing further prevention mechanisms

**Decision**: First PR implements a bounded read-only evidence report with explicit case classification. The verified M→L mapping has a specific gated mapping correction design above. No global ownership schema or timing rewrite is prescribed without a separately isolated defect and local reproduction.

**Rationale**: Both service-timing prevention and a historical repair already exist in this baseline. Blindly repeating them risks reversing valid products or corrections already absorbed into inventory true-ups.

**Alternatives considered**: Blanket suppress stock at payment (reject: counter products and bundles); unconditional source dedup (reject: independent valid fulfillment can share items); forced physical target adjustment (reject: count/date/variant unclear).

### Decision 2: preserve provenance before aggregation

**Decision**: Canonical diagnostic units are org + fulfillment link + item + warehouse; ledger sums occur once per ledger row ID. Join tables and grouped bookings attach provenance but must not multiply ticket-level issue quantities. Query overlap only supplies candidates.

**Rationale**: One sale may link several bookings; the existing snapshot repeats a ticket/item aggregate on multiple booking rows. A shared recipe item is not sufficient proof of duplicate fulfillment.

**Alternatives considered**: Sum cross-source candidate quantities (reject: multiplicative joins); assign a whole ticket issue to each booking (reject: over-attribution). Unattributable allocation is unresolved, not inferred.

### Decision 3: separate issue recovery from historical correction

**Decision**: Missing realization first checks warnings, source-stamped drafts, ledger and confirmed consumption. Duplicate repair first checks prior true-ups, mappings, cancellations and previous spec120 script results. Display-only cases produce a referral to F5 with zero inventory change.

**Rationale**: Retrying with a new line payload does not update an existing draft. A present-day cancel/reissue can affect quantity and valuation differently from a historical revaluation.

**Alternatives considered**: Retry every completed appointment (reject: empty confirmation/old corrections); rerun all invoice backfills (reject: duplicate incorporation); use `rebuildBins` to fix ledger (reject: copies existing snapshots only).

### Decision 4: gated repair plan with authoritative recovery

**Decision**: A later repair design must define exact effect, transaction/lock boundary, before fingerprints, named actor/reason, compensating undo in `finally` on disposable QA, unknown-commit read reconciliation, repeat no-op, and post-apply evidence. Owner approves spec, exact manifest/target and merge. Restoration of business truth is a compensating action; deleting append-only ledger rows is forbidden under the normal application role.

**Rationale**: Current stock calls span transactions and post-commit audit; they cannot be assumed to form an atomic overall correction. Spec Kit constitution V requires explicit data gates, dry-run default, reversibility and repeat invariants.

**Alternatives considered**: Claim current script covers every case (reject: limited candidate scope); unattended apply from names (reject: ambiguity and scope risk).

### Discovery outputs still pending

1. The November 3 garment has a stable sale/stock variant mismatch through the focused read; complete its delivery/group/reschedule/true-up timeline before historical repair. The initial attendee-name match failure is not evidence that no booking existed.
2. Deduplicated ticket-line ownership and exact intended fulfillment for the seven overlap rows; catalog/component/package/redemption history and approved true-ups.
3. Month/year/reason of the day-22 adjustment, validated physical M/L count and observed stock UOM.
4. Deployed and historical source identity; prior repair/true-up/backfill coverage and original recipe state.
5. Whether any additional code-level prevention is needed beyond correcting the proven M→L mapping. If none is proven, report that result; do not manufacture a timing patch.
6. Owner approval and accounting-period/valuation policy for an exact historical repair. No date cutoff is assumed.

These are investigation deliverables with fail-closed behavior, not unspecified requirements. The selected known-garment correction contract is contracts/repair.md. Fresh case-specific evidence and exact owner apply approval remain prerequisites; additional unproven service failures do not authorize a guessed writer.

### Later garment population evidence

The bounded garment population read and its conditional M/L arithmetic are stated once in [spec.md](spec.md), section Later garment population evidence.

### Existing field-tier source boundary

Pinned `src/lib/permissions.ts:128` restricts FIELD_LEVEL_MODULES to crm/finance/scheduling; `src/server/services/rbac.service.ts:217` defaults stock to 0 and its role-override path also keeps stock field tier 0. Cost-bearing operational reports/corrections use the existing finance:view and finance sensitive tier, with enabled finances and the existing stock/POS gates; quantity-only stock evidence does not invent a stock tier. Qualify actual ordinary-owner/custom-role admission and finance denial cases before delivery.

### Review artifact: data-model.md

## Data model: FACES stock reconciliation

### Existing records and qualified authority prerequisite

F1 adds no discovery-owned table schema. Its first admitted diagnostic depends on F7's qualified authority-bridge function migration; correction storage remains F3-owned.

All identities below carry `orgId`; every join requires both stable ID and equal organization. Customer names are private matching hints and are omitted from committed fixtures/reports.

| Entity / source | Relevant fields and relationships | Validation / interpretation |
| --- | --- | --- |
| POS ticket/line (`src/server/db/pg-pos-schema.ts`; `pos.service.ts`) | Ticket ID, status, stockEntryId, warning, submittedAt; line ID, kind, finProductId, bookingId, redemption link, qty. | One ticket can cover multiple bookings; a ticket-level issue cannot be allocated repeatedly. Never change payment values/dates. Verify actual schema before query authoring. |
| Booking/group/package sources | Booking ID, status, resource ID, start time, product/party/group/reschedule links; booking-product qty; grants/redemptions and reversals. | Same-org stable linkage required; date/name alone cannot authorize repair. Terminal/cancelled/no-show differs from fulfilled. A visit group is the pair (resource ID, `metadata.groupId`), matching `visitMembers`; see [source-explanation.md](contracts/source-explanation.md). |
| `sched_booking_status_log` (`pg-scheduling-schema.ts:291–311`) | bookingId, fromStatus, toStatus, changedBy, changedAt. | Stored status-transition history. A `completed` row dates the status change, not physical delivery. Absence of rows (older bookings) is unknown history, not "no transition". |
| `stk_accruals` (`pg-schema/stock.ts:251–289`) | source/sourceId/item/warehouse, qtyConsumption, qty, estimate, status, realizedEntryId/actuals. | `status` is `open`, `realized` or `released`; uniqueness `(org,source,sourceId,item)`. Open qty is commitment, never actual issue. |
| `stk_entries` / `stk_entry_lines` (`stock.ts:114–169`) | Type/status/humanId/metadata; line item/qty/UOM/rate/warehouses/lineNo. | Type receipt/issue/transfer/adjustment; status draft/submitted/cancelled. Positive qty. Entry provenance is decoded from `metadata` only by the closed stock entry source decoder in [source-explanation.md](contracts/source-explanation.md); source metadata and line ownership must be checked together. |
| `stk_ledger` (`stock.ts:172–198`) | Row ID, entryId, itemId, warehouseId, qtyDelta, valueDelta, qtyAfter, valuationRate. | Append-only. Deduplicate by row ID; order by row ID under the Ledger identity rule below. Include original and reversing rows in net effect. |
| `stk_bins` (`stock.ts:200–211`) | Org/item/warehouse natural key, qty, rate. | Rebuildable latest-ledger cache. Compare full union of ledger keys and bin keys; existing-bin-only left join cannot detect a missing bin. |
| Mapping / components / UOM | Product→item recipe, component DAG, stock/consumption UOM and direct conversion factor. | Current mappings are labelled current, not historical truth. Do not invent a missing conversion. |

### Ledger identity

This rule is normative for every F1 read, hash, manifest and report. A ledger ID is a positive PostgreSQL `bigint` carried as its canonical decimal string and compared as `BigInt`. The existing Drizzle column `stkLedger.id` is declared `bigserial('id', { mode: 'number' })` (`pg-schema/stock.ts:181`), so selecting it through Drizzle returns a JavaScript `number`. F1 code therefore selects ledger IDs only as SQL text, `` sql<string>`${stkLedger.id}::text` `` (or `id::text` in raw SQL), and orders rows with SQL `ORDER BY id` plus `BigInt` comparison in TypeScript. F1 never reads ledger IDs through the bare `stkLedger.id` column, `StkLedgerRow`, `getLedger`/`getRecentLedger`, or `LedgerReplayRow.seq` and the `stock.logic.ts` replay helpers, all of which narrow to `number`.

### Proposed diagnostic report (file contract)

The closed versioned [diagnostic-wire.md](contracts/diagnostic-wire.md) owns exact DiagnosticManifestV1, ReconciliationReport, CaseRow, MovementEvidence, graph, coverage, error and numeric-check fields. Source facts, timeline and projection evidence are in [source-explanation.md](contracts/source-explanation.md).

Correction manifests are not diagnostic output. The mapping correction uses `MappingManifestV1` in [mapping-envelope.md](contracts/mapping-envelope.md). The historical garment correction uses F3's `GarmentManifestV1` in [garment-envelope.md](../124-stock-correction-workflow/contracts/garment-envelope.md), as selected by [repair.md](contracts/repair.md). Neither manifest is issued from an unresolved case. Both store their operation in F3's proposed `stk_corrections` receipt; F1 introduces no additional correction table.

### State and transition rules

- Investigation: `unmatched → ambiguous/matched → classified`; a stale snapshot resets eligibility and requires re-reading.
- Existing expectation: `open → realized` only after confirmed submitted issue evidence; `open → released` on supported cancellation/no-show or confirmed no consumption. Do not resurrect a settled expectation automatically.
- Correction workflow: `proposed → owner_approved → rehearsed → apply_requested → applied/unknown/failed → reconciled`; `unknown` requires authoritative read before another application. No blind retry from a client/network error.
- Code/release: spec draft → independent review → owner spec approval → implementation/independent review → owner merge → deployment proof → affected-record verification. Drafting reaches none of the later states.

### Numeric oracles

Use the exact diagnostic numeric policy below; keep raw database numeric strings and exact decimal aggregation. No formatter output becomes an invariant or fingerprint. A healthy affected key satisfies net signed quantity equals terminal ledger quantity (including opening history), latest ledger qty/rate equals bin qty/rate, and no unexpected item/warehouse or unrelated-org effect. Physical inventory remains a separate dated observation.

### Exact diagnostic numeric policy

Parse finite base-10 database numeric strings into signed BigInt coefficient/scale; reject nonnumeric, NaN/Infinity, invalid exponent or absolute scalar magnitude above 1,000,000,000 as unresolved/ineligible with explicit reason. Ledger IDs follow the Ledger identity rule above. Aggregate canonical signed quantities/values using exact decimal alignment; no rounding each joined row or converting sums through binary floating point. Rate/value arithmetic comparison bounds below are diagnostic compatibility tolerances for the pinned Number-based source, not financial approval thresholds or a change to posting math.

Quantity normalization Q4 is `Q(x) = floor(decimal(x) * 10000 + 0.5)` as a scaled integer (the source `round4` tie direction, including negative half ties). Compare Q4 values exactly, with no relative tolerance; report raw residual and raw strings too. A fixed4 string is the canonical decimal spelling of a Q4 value with exactly four fractional digits (for example `1.0000`). Confirmed fulfillment intent uses normalized stock units and the actual existing conversion policy. Exact fingerprints, operation identities and approved effects compare canonical bytes/decimal strings, never a numeric tolerance.

Scalar rate/value equality admits absolute difference ≤ `1e-8 + 1e-12 * max(abs(a), abs(b))`. For aggregate value conservation, compare exact signed sum to the expected value using ≤ `1e-8 + 1e-12 * max(sum(abs(contribution)), abs(expected))`; compute/serialize the threshold as exact decimal, not a running floating-point error estimate. Require every scalar and aggregate absolute-input sum ≤ 1e9; beyond it is explicitly unsupported/unresolved, not a larger tolerance. No cent rounding is used for these checks. Serialize actual/expected/difference/tolerance and pass/fail for each comparison. This catches quantity-key corruption independently of small value residuals, and a passing diagnostic does not certify an invoice total, physical count or permitted correction cost.

Tests include equality at the declared inclusive tolerance, a decimal unit beyond it, positive/negative quantity half ties, a missing bin, a bin-only key, large cancelling contributions near the admission ceiling and just beyond it, nonfinite input, duplicate joins, the observed ~5.8e-10 arithmetic residual, and ledger IDs above `Number.MAX_SAFE_INTEGER` that keep exact order and digest. A report never uses tolerance to permit changed source fingerprints or unapproved repair effects.

### Review artifact: contracts/diagnostic-wire.md

## Closed diagnostic manifest and report schema

Implement these pure version 1 schemas and strict decoders in the selected `scripts/lib/faces-stock-reconciliation.ts` and its test. No new runner, route or business table. [report.md](contracts/report.md) owns the CLI surface, exit codes, resource limits and classification table; [source-explanation.md](contracts/source-explanation.md) owns source facts, timeline, projection evidence and the stock entry source decoder.

### Input and reference primitives

```ts
type UUID=string; type Digest=string;
type SourceKind='pos_ticket'|'pos_ticket_line'|'payment'|'booking_product'|'booking'|'booking_group'|'booking_status'
  |'grant'|'redemption'|'invoice'|'accrual'|'stock_entry'|'stock_line'|'ledger'|'stock_item'|'warehouse'|'product'|'correction';
type SourceRef={kind:SourceKind,id:string};
type ExpectedComponent={source:{kind:'pos_ticket'|'pos_ticket_line'|'booking',id:UUID},itemId:UUID,warehouseId:UUID,
  intendedStockQty:string,stockUom:string,fulfilled:boolean,
  trueUpCoverage:'not_covered'|'covered'|'unknown'};
type DiagnosticEvidenceRef={referenceId:UUID,kind:'document'|'owner_attestation'|'prior_correction',
  sha256:Digest,privateRef:string,correctionId:UUID|null,
  assertion:null|{kind:'expected_component',component:ExpectedComponent,verifiedByProfileId:UUID,verifiedAt:string}|ProjectionAssertion};
type DiagnosticCase={caseKey:string,bookingIds:UUID[],ticketIds:UUID[],itemIds:UUID[],
  identityUnresolved:boolean,searchHint:null|{description:string},
  dateHints:null|{after:string|null,before:string|null,timezone:string},
  evidenceRefs:DiagnosticEvidenceRef[]};
export type DiagnosticManifestV1={schemaVersion:1,target:QualifiedOperatorTarget,
  actorProfileId:UUID,cases:DiagnosticCase[]};
```

`QualifiedOperatorTarget` is defined in [report.md](contracts/report.md), section Standalone entrypoint and qualified target encoding. All keys above are required; absent values are explicit `null` or `[]`. Reject unknown keys recursively. UUIDs are lowercase canonical.

SourceRef identity per kind:

- `ledger`: the positive bigint decimal string defined in [data-model.md](data-model.md), Ledger identity.
- `booking_group`: `<resourceId>/<groupId>`, where `resourceId` is the anchor booking's lowercase canonical `resource_id` UUID (always 36 characters, so the first `/` after it separates the two parts unambiguously) and `groupId` is the exact bounded opaque `metadata.groupId` string defined in source-explanation.md. The same `groupId` on two resources is two distinct groups.
- `invoice`: the `fin_invoices.id` UUID.
- Every other kind: UUID.

`caseKey` is unique, trimmed NFC, 1–100 characters. At most 100 cases, 100 IDs per case ID array and 1,000 distinct supplied IDs in total. ID arrays are sorted and deduplicated after validation; a duplicate `caseKey` or `referenceId` refuses. Cases keep the supplied `caseKey` order for presentation and sort by `caseKey` for canonical content hashing. Input is at most 1,048,576 UTF-8 bytes. The graph, row, output and timeout limits in report.md also apply.

A case has at least one stable ID, or `identityUnresolved: true` plus a `searchHint.description` of trimmed 1–500 characters. With no IDs, query no customers or records from that hint; report `unmatched`/`unresolved`/`no_stable_ids`. A supplied `identityUnresolved: true` remains a blocking uncertainty, never cleared by a name guess. The raw hint may contain personal information and stays in the protected input only: output includes its SHA-256 and withheld state, never the hint. Stable-ID reads keep the canonical same-org identity checks; `identityUnresolved: false` is not proof of a match.

`dateHints.after`/`before` are `YYYY-MM-DD` local dates, inclusive lower and exclusive upper, at least one non-null, and `after < before` when both are present. `timezone` is a valid IANA zone equal to the qualified organization accounting timezone; a missing, invalid or mismatched zone refuses the hint. No assumed month/year, free-text date parsing or day-22 default. Hints help relate supplied sources but never truncate affected ledger opening/history or authorize additional subjects. Full histories for the admitted keys remain mandatory; if they exceed limits, return incomplete, not a date-filtered complete balance. No `dateHints` means all admitted-key history.

Evidence `privateRef` is a trimmed 1–256 character local reference, never fetched remotely or read as raw document content by this command. A `prior_correction` reference requires a `correctionId` UUID; other kinds carry `correctionId: null`. Verify that receipt is in the same organization under the current admitted field/owner policy; otherwise it is unavailable/unresolved, without leaking a private manifest. `document`/`owner_attestation` may carry the `ExpectedComponent` assertion above; a `prior_correction` assertion must be null (stored evidence supplies its meaning). Assertion quantity is a nonnegative fixed4 string (data-model.md) with at most 9 integer digits; `stockUom` is trimmed NFC, 1–80 characters; source, item and warehouse must be in the case's admitted graph. `verifiedAt` is a canonical UTC instant no later than the run observation, and `verifiedByProfileId` must equal the verified executing real membership owner in the same read-only snapshot, in addition to normal capabilities. A nonowner can run evidence-free, source-only diagnosis but cannot supply an asserted owner intent. A hash, file or reference alone proves no delivery or intent. A document without an assertion is evidence presence only; unknown expected facts remain unknown. Contradictory assertions, source ownership or coverage make the case unresolved; never choose the newest assertion. No diagnostic assertion approves a correction command.

### Exact output primitives

```ts
type Classification='duplicate'|'missing_realization'|'variant_mismatch'|'display_only'|'valid'|'unresolved';
type Reason='duplicate_net_issue'|'missing_net_issue'|'wrong_variant_issue'|'display_multiplicity_only'
  |'stock_matches_intent'|'identity_unresolved'|'identity_ambiguous'|'no_stable_ids'
  |'source_ownership_ambiguous'|'expected_effect_unknown'|'true_up_coverage_unknown'
  |'true_up_already_covered'|'evidence_conflict'|'evidence_unverified'|'incomplete_read'
  |'unsupported_shape'|'numeric_unsupported'|'integrity_failed'|'mixed_discrepancies'
  |'mapping_not_qualified'|'owner_confirmation_missing'|'stock_source_unknown'
  |'projection_unverified'|'projection_conflict'|'projection_source_changed'|'projection_identity_unavailable';
type Coverage={sourceGraphComplete:boolean,ledgerHistoryComplete:boolean,openingKnown:boolean,
  fulfillmentKnown:boolean,trueUpCoverage:'not_covered'|'covered'|'unknown'};
type ErrorCode='scope_unavailable'|'schema_unavailable'|'read_failed'|'timeout'|'capacity'
  |'stock_integrity_failed'|'unsupported_numeric'|'provenance_incomplete';
type DiagnosticError={code:ErrorCode,caseKey:string|null,ref:SourceRef|null};
type ComponentRow={componentKey:string,source:SourceRef,itemId:UUID,warehouseId:UUID,
  intendedQty:string|null,stockUom:string|null,actualIssuedQty:string|null,actualValue:string|null,
  classification:Classification,reasonCodes:Reason[],evidenceReferenceIds:UUID[],ledgerIds:string[]};
type SecondaryFinding={kind:Exclude<Classification,'unresolved'>,componentKey:string,
  intendedQty:string|null,actualQty:string|null,evidenceRefs:UUID[],reason:Reason};
type CaseRow={caseKey:string,candidateIds:{bookingIds:UUID[],ticketIds:UUID[],itemIds:UUID[]},
  sources:SourceRef[],identityState:'matched'|'ambiguous'|'unmatched',classification:Classification,
  reasonCodes:Reason[],coverage:Coverage,components:ComponentRow[],secondaryFindings:SecondaryFinding[],
  evidenceReferenceIds:UUID[],priorCorrectionIds:UUID[],repairEligible:boolean,
  hint:{state:'none'|'withheld_private_input',sha256:Digest|null}};
type MovementEvidence={ledgerId:string,entryId:UUID,
  entryState:'draft'|'submitted'|'cancelled'|'unavailable',entryType:'receipt'|'issue'|'transfer'|'adjustment'|'unavailable',
  itemId:UUID,warehouseId:UUID,qtyDelta:string,valueDelta:string,qtyAfter:string,valuationRate:string,
  postedAt:string,sourceRefs:SourceRef[]};
type GraphNode={ref:SourceRef,state:'available'|'missing_or_unavailable',rowSha256:Digest|null};
type GraphEdge={from:SourceRef,to:SourceRef,relation:'owns'|'links'|'realizes'|'reverses'|'supersedes'|'recipe'|'covers'};
type NumericCheck={caseKey:string|null,itemId:UUID,warehouseId:UUID,family:'quantity'|'value'|'rate',
  actual:string|null,expected:string|null,normalizedActual:string|null,normalizedExpected:string|null,
  difference:string|null,tolerance:string|null,result:'pass'|'fail'|'unknown'};
type KeyTotal={itemId:UUID,warehouseId:UUID,ledgerQtySum:string,ledgerValueSum:string,
  latestLedgerId:string|null,latestQty:string|null,latestRate:string|null,
  binExists:boolean,binQty:string|null,binRate:string|null,integrity:'pass'|'fail'};
type ReportBase={schemaVersion:1,mode:'read-only',orgId:UUID,actorProfileId:UUID,
  target:QualifiedOperatorTarget,source:{gitSha:string,deploymentVerified:false},observedAt:string,
  snapshot:null|{id:string,startedAt:string,role:'app_ledger',orgId:UUID,profileId:UUID,readOnly:true},
  scope:{caseKeys:string[],itemWarehouseKeys:{itemId:UUID,warehouseId:UUID}[],dateHintsApplied:false},
  evidenceCoverage:Coverage,cases:CaseRow[],ledger:MovementEvidence[],
  graph:{nodes:GraphNode[],edges:GraphEdge[]},
  sourceEvidence:SourceEvidenceRow[],timeline:TimelineRow[],sourceEvidenceSha256:Digest|null,
  projectionEvidence:ProjectionEvidenceResult[],
  labels:{items:{itemId:UUID,name:string|null,code:string|null}[],products:{productId:UUID,name:string|null}[],warehouses:{warehouseId:UUID,name:string|null}[]},
  totals:KeyTotal[],numericChecks:NumericCheck[],
  errors:DiagnosticError[]};
export type ReconciliationReport=ReportBase &
  ({outcome:'complete',complete:true}|{outcome:'integrity_failed',complete:true}
   |{outcome:'incomplete',complete:false});
```

All source numeric evidence is the original finite PostgreSQL string; exact aggregate decimal strings follow data-model.md. For quantity `NumericCheck`, `normalizedActual`/`normalizedExpected` are signed Q4 integer strings and `tolerance` is `'0'`; for value/rate they are the exact admitted decimals and the declared diagnostic threshold. Unknown facts have null operands and result `unknown`, not `0`/`pass`. `componentKey` is canonical `${source.kind}:${source.id}:${itemId}:${warehouseId}`; every referenced ledger, source or evidence ID must resolve within the same output or input. Case/graph identity deduplication never changes canonical movement totals. `labels` contains only same-org current stock item name/code, referenced `fin_products.name`, and warehouse name for referenced admitted keys (including archived rows), sorted by ID; missing labels are null and never identify another tenant. They are current stock labels, not proof of historical UOM or intent. No personal/customer names or untyped dictionary is selected.

Report `snapshot.id` is `pg_current_snapshot()::text` captured in the owned transaction; timestamps are PostgreSQL canonical UTC text preserving source microseconds. `source.gitSha` is the qualified checked-out candidate as 40 lowercase hex characters, not proof of production deployment. `observedAt` is the run's canonical UTC observation. Global org, actor and target must match the verified manifest and snapshot; none has a default. Coverage booleans describe completed source reads versus unknown physical truth. Global `evidenceCoverage` is the logical AND of the case completion/known booleans; its `trueUpCoverage` is `covered` if any case is covered, otherwise `unknown` if any case is unknown, else `not_covered`. SourceRef, graph nodes and edges sort by kind, id and relation; ledger sorts by numeric `BigInt` ID; components and totals sort by itemId, warehouseId and source key; reason, error and evidence IDs sort lexicographically. Edges deduplicate exact from/to/relation. No raw contact names, hints, tokens or source JSON enters output.

### Outcome consistency

A complete outcome has complete reads for all admitted keys, `errors: []` and complete queried evidence; numeric checks may remain unknown when intended physical facts are unproved, and cases may legitimately be unresolved because identity, intent or physical coverage is unproved. `integrity_failed` means reads completed but an integrity check failed; every case has `repairEligible: false`. Incomplete has at least one fixed `DiagnosticError`, every case `repairEligible: false`, `totals: []` and `numericChecks: []`; ledger and graph may be a clearly incomplete prefix only, with all coverage completion flags false. Never compute terminal totals from that prefix. On final output-size overflow, emit a compact incomplete report with empty ledger, graph and labels and unresolved CaseRows for the supplied caseKeys; do not truncate an oversized complete JSON file. Incomplete outputs also carry empty `sourceEvidence`, `timeline` and `projectionEvidence` and `sourceEvidenceSha256: null`. `snapshot: null` is allowed only for failure before a snapshot was acquired. Malformed input, auth or target refusal yields a fixed safe console error and leaves any existing output untouched, with no fabricated report. Validation enforces this outcome/coverage/error consistency, not only the TypeScript intersection. Exit codes per outcome are in report.md.

`repairEligible` means only a complete, unique garment variant candidate eligible for a separately approved F3 manifest preparation; it is never apply authority. It is false for every duplicate, missing, unresolved, covered, incomplete or integrity case, for unqualified mapping or owner-confirmation prerequisites, and for unsupported ownership. Source diagnosis and physical proof remain distinct. Other primary classifications remain useful report findings. Classification and reason assignment follow report.md's ordered table; the code-to-reason mapping is literal: duplicate→`duplicate_net_issue`, missing→`missing_net_issue`, variant→`wrong_variant_issue`, display→`display_multiplicity_only`, valid→`stock_matches_intent`. Every unresolved branch uses the applicable fixed uncertainty/integrity reason above (multiple reasons sorted, never raw exceptions). A movement on an affected key whose entry decodes to stock source kind `unknown` makes the owning component unresolved with `stock_source_unknown`.

### Run-stable comparison projection

The repeatability check compares the run-stable projection of two reports: the full report with `observedAt`, `snapshot.id` and `snapshot.startedAt` removed, and with `at` set to null on every timeline row whose `meaning` is `current_state_observation`. Every other field, including `sourceEvidenceSha256`, must be byte-identical in canonical JSON. No other exclusion is permitted.

### Required test vectors

Pure, CLI and native cases decode exact known vectors for every input/report outcome; reject unknown, omitted, nested and invalid date/timezone/reference/variant/consistency keys; distinguish absent/unknown from `0`; verify `BigInt` order and graph references, hint withholding, owner assertion admission, contradiction/coverage classifications, incomplete-prefix with no totals, final-byte overflow, and two `booking_group` refs with the same `groupId` on different resources. No apply flag or correction command is introduced.

Stock `MovementEvidence.valueDelta`/`valuationRate`, `ComponentRow.actualValue`, key value/rate totals and accrual estimates/actuals are raw stock scalars whose denomination is unverified unless the separately admitted private correction qualification ([repair.md](contracts/repair.md)) proves it. They are never labeled with a ticket/display currency; source payment/ticket currency remains its own stored billing fact. This read-only diagnostic does not fabricate a stock-currency field or authorize an economic sale-versus-stock cost comparison.

### Review artifact: contracts/mapping-correction.md

## Faja M mapping correction contract — draft, owner gates pending

This contract covers the verified current mapping only. It does not approve production mutation, historical repost or a generic correction UI. The typed manifest, owning functions, hashes, receipt, status command, flags and exit codes are in [mapping-envelope.md](contracts/mapping-envelope.md).

### Scope and desired transition

Verified FACES org `21e0601b-f632-43fd-8414-d644af4271f4`; product M `8ebe2b40-2bd5-4543-b380-dc6ba6cc7ca0`. Before: no direct bridge; sole approved recipe L item `f7ea983f-8e32-4688-b3ec-a6baef3bbe2d`, qtyPerUnit 1. Desired: sole recipe M item `941382a8-fbdb-472d-97cc-77407ac2d8fe`, qtyPerUnit 1, verified stock UOM. L product `cee929e5-720e-49da-8901-b315b7d65f8a` remains unchanged. The mapping row ID is discovered fresh, never guessed. Verify no new bridge, component or other recipe row changes this scope.

### Command and manifest

`scripts/faces-garment-mapping-2026-11.ts` is dry-run by default; mutation requires the explicit apply flags in mapping-envelope.md. The manifest contains the owner approval reference, target, operation key, source/mapping row IDs and before fingerprint, desired product/item/qty, actor/reason, cutover evidence and complete permitted effects. Credentials are never flags or output. Invalid or foreign IDs are unavailable, not tenant disclosures. Manifest and output are mode 0600; committed fixture examples are synthetic.

### Transaction and concurrency

Preview uses one repeatable-read read-only transaction and `app_ledger` org context. Apply runs only after owner spec approval, code review and owner merge, exact manifest/target approval and a rehearsed operational cutover. Lock the exact product/mapping rows, verify source/target/UOM/bridge/components/recipe/operation receipt and the expected before fingerprint, perform a unique-key-safe atomic replacement in one transaction, and write the before/after audit plus durable operation receipt in that same transaction. The existing stock service upsert and delete are separate transactions and cannot compose this atomicity. Any changed or unexpected existing M mapping refuses the operation; exact desired state plus a verified operation receipt is a no-op. An unknown receipt/state combination requires reconciliation, not blind success.

Cutover uses F3's common stock-write protocol in [transaction-protocol.md](../124-stock-correction-workflow/contracts/transaction-protocol.md); there is no operator choice between quiescence and another mechanism. Gate names are defined in [report.md](contracts/report.md), Gate terms. After token verification outside the transaction, call F3's `lockStockWrite` once: it acquires the write gate pair (stock-v1 gate, then policy-coordinator gate) before any source, product, ticket, profile, period, entry or bin row lock, and its opaque guard holds both until commit or rollback. All enumerated current-recipe resolution→post/stamp paths and stock/mapping/period mutators must already participate under the qualified F3 implementation. Wait for existing participating posters to commit or roll back; no network call occurs under the gates. The guard refuses on lock timeout, missing protocol qualification or legacy/in-flight deployment uncertainty rather than falling back to mapping-row locks alone.

While holding the write gate pair, follow the shared operation/source row-lock phase, then the period-policy/fresh authority phase; validate the immutable operation key/digest and the locked product/mapping before-state; then perform a fresh complete census of (a) persisted pending/draft sources carrying the old M→L snapshot, (b) open M-product stock accruals and (c) source stamps and active old-mapping issues committed before acquisition. Any old-mapping pending draft or open accrual blocks cutover with zero writes until separately resolved under an approved operation; never regenerate a persisted draft on retry or silently re-accrue it. Submitted historical cases are captured as evidence and are separately repairable, not a reason to rewrite history during mapping. A census timeout, limit or schema ambiguity blocks apply. With no blocked pending sources, the atomic mapping replacement plus the shared completed `product_mapping` receipt and audit commit before the gates are released. Later participating sale posters acquire the same gates before reading the current mapping and therefore resolve M→M; existing drafts cannot bypass the refusal.

The private cutover receipt records `protocolVersion: 1`, qualified candidate SHA, target identity, deployment/drain evidence reference, gate-acquired snapshot time, exact before/candidate mapping hashes, stable source/entry/accrual IDs and states in the census, counts and complete/blocked flags, and the observed ledger high-water mark before and after. Apply re-runs the gate-held census for final verification before commit. Status reads the recorded census in its own read-only snapshot and never re-runs a gate-held census (mapping-envelope.md). A read-only census is not a drained cutover proof; a newly found old-mapping issue is an invariant failure, never an automatic historical repair. Production apply requires verified rollout/drain of all named writers from F3; local concurrency tests do not prove runtime deployment. Missing rollout evidence refuses. Gate release is transaction commit/rollback; a lost response uses the same durable key/hash status, never an uncoordinated retry. No persistent maintenance flag or separate drain service is introduced.

### Undo

Local QA restores the original mapping in `finally` through a verified compensation that retains audit evidence. Production undo is a separately approved compensating transition and cannot overwrite intervening changes. Quantity, value, ledger, bin and payment facts stay unchanged by mapping-only apply ([unchanged-facts.md](contracts/unchanged-facts.md)). A second run of the same operation makes zero changes. The historical POS-2026-00098 L1→M1 stock-only repost is a separate manifest under S3; its correct sale product M and payment facts remain untouched.

### Shared operation storage

Use F3-owned `stk_corrections`, migration `supabase/migrations/20261116193000_stock_corrections.sql`, kind `product_mapping`, `source_type` `fin_product`, `source_id` the exact M product UUID, `source_entry_id`/`replacement_entry_id` null. The shared schema permits that mapping-only nullability. The before/intended/after column contents are specified in mapping-envelope.md; actor, reason, hash and key are shared immutable columns. Insert the completed operation and audit in the same mapping transaction. Global org/operation-key uniqueness rejects cross-kind reuse; the write gate pair plus the product lock and exact recipe compare-before serialize different keys. The same key/hash with exact desired state returns the original receipt; desired state without a matching receipt is unknown/unattributed, never blind success. F3 owns the shared migration/QA/RLS qualification; F1 owns the mapping validator and operation. No additional correction table is added.

### Executing principal and mapping authority

Mapping preview and apply use the token verification and read-only admission in [report.md](contracts/report.md), Shared principal and snapshot admission; the manifest actor must equal the verified canonical profile. Before sensitive preview reads and again at apply transaction admission, require active exact-org membership, the stock module enabled, fresh `stock:manage`, `pos:view` and the required sensitive-cost access. Owner approval is separate from authenticated execution authority. A missing capability or inactive/revoked membership fails closed before mapping or stock reads or writes. Test every denial and revoke authority between preview and apply. F7 qualification precedes the previews; F3's qualified locking authority and transaction protocol precede apply. There is no alternate nonlocking write authority path.

The policy-coordinator gate is the shared authority boundary: F3 enrolls module-state writes and existing live policy/role/member/account writers, and performs direct uncached required-module reads under the held write gate pair. F1 qualifies F3's absent-deny and absent-enabled-to-disabled module races before mapping apply; it adds no independent authority lock or module writer. An authority change that commits first causes refusal or a stale approval; a valid mapping holding both gates may commit before a later revocation, which waits. This is ordered linearization, not a promise that both race orders fail.

### Review artifact: contracts/mapping-envelope.md

## Typed mapping command, immutable receipt and read-only status

This is the typed command contract for the [mapping correction](contracts/mapping-correction.md). F1 owns the pure types, strict decoders, hashes and plan in `scripts/lib/faces-garment-mapping.ts` and its test. The owning transactions live in the new `src/server/services/faces-garment-mapping.service.ts` and `faces-garment-mapping.test.ts`; the executing CLI imports the pure input module and never becomes a server-service dependency. The service consumes F3 primitives; no new route or correction table is selected. The runtime uses the qualified injected CoreCtx/DB and F3 stock gate, authority, storage and audit primitives through the admitted loader, not separately committing mapping wrappers.

### Exact inputs

```ts
type UUID = string;
type Digest = string; //64 lowercase hex
type RowRef = {table:'fin_products'|'stk_items'|'stk_consumption'|'stk_item_components';
  key:[UUID]; rowSha256:Digest};
type MappingState = {
  productId:UUID; productRowSha256:Digest;
  directBridgeItemId:UUID|null;
  recipe:{rowId:UUID,itemId:UUID,qtyPerUnit:string,note:string|null,rowSha256:Digest}[];
  ruleRows:RowRef[]; preservedLProductId:UUID; preservedLMappingSha256:Digest;
};
type CensusRow = {sourceType:'pos_ticket'|'booking',sourceId:UUID,
  entryId:UUID|null,accrualId:UUID|null,state:'draft'|'open'|'submitted',rowSha256:Digest};
type MappingCensus = {complete:true,pendingDrafts:CensusRow[],openAccruals:CensusRow[],
  submittedIssues:CensusRow[],ledgerHighWater:string|null,stateSha256:Digest};
type MappingIntent = {rowId:UUID,productId:UUID,itemId:UUID,qtyPerUnit:string,
  stockUom:string,note:string|null};
type MappingManifestBase = {
  schemaVersion:1,kind:'product_mapping',target:QualifiedOperatorTarget,
  sourceCodeSha:string,operationKey:UUID,orgId:UUID,actorProfileId:UUID,
  before:MappingState,intended:MappingIntent,census:MappingCensus,
  unchangedStockPaymentSha256:Digest,
  rollout:{protocolVersion:1,candidateSha:string,evidenceReference:string,evidenceSha256:Digest},
  reason:string,ownerApprovalReference:string
};
export type MappingManifestV1 =
  | (MappingManifestBase & {action:'correct'})
  | (MappingManifestBase & {action:'compensate',inverseOfOperationId:UUID});
export type MappingCommand = {manifest:MappingManifestV1,approvedPlanSha256:Digest,previewHash:Digest};
export type MappingStatusInput = {target:QualifiedOperatorTarget,orgId:UUID,
  actorProfileId:UUID,operationKey:UUID,action:'correct'|'compensate',manifestSha256:Digest,expectedPayloadHash:Digest,
  manifest:MappingManifestV1};
```

`QualifiedOperatorTarget` is defined in [report.md](contracts/report.md), section Standalone entrypoint and qualified target encoding. Unknown keys are rejected recursively, including `inverseOfOperationId` in correct mode; all required nullable fields remain explicit. UUIDs are canonical lowercase; `sourceCodeSha` and `candidateSha` are exactly 40 lowercase hex characters matching the qualified deployment. The reason, owner approval reference and evidence reference strings are trimmed NFC, 1–1000 characters, with no credentials or inline evidence. Full input is at most 262,144 UTF-8 bytes. Decimal `qtyPerUnit` is a positive fixed4 string ([data-model.md](data-model.md)) with at most 9 integer digits; this transition requires `'1.0000'` and the exact verified item stock UOM (1–80 trimmed characters). Original before qty strings retain database spelling. Every selected RowRef.key is the single canonical id UUID (all four selected source tables have this primary key); recipes sort itemId,rowId; ruleRows sort table/key; census arrays sort sourceType/sourceId/entryId/accrualId. Arrays are complete and distinct, not display excerpts. Every census array, `recipe` and `ruleRows` hold at most 1,000 rows; scan limit+1, and incomplete/overflow refuses preview/apply, never truncates. `ledgerHighWater` and every ledger identity follow [data-model.md](data-model.md), Ledger identity. A hypothetical blocked census is reported separately, never coerced into the executable complete:true manifest.

Correct requires the verified single old L recipe, no direct bridge/component ambiguity, desired M item and fresh exact current row/UOM/rollout evidence. intended.rowId is a fresh preallocated UUID, distinct from the old row and every existing consumption row (except exact receipt replay). Replace by delete-old/insert-new inside one gated transaction; preserve the approved note, product ID and quantity. Never call existing setConsumption/deleteConsumption wrappers separately. preservedLMappingSha256 verifies L remains untouched. No stock entry is generated by mapping.

For compensate, inverseOfOperationId names one applied same-org product_mapping receipt with intended.action='correct'. Current M product recipe/bridge/component/UOM must equal that receipt's recorded after mapping; no subsequent mapping operation or source meaning change is permitted. The fresh inverse manifest restores that receipt's before item/quantity/note through a new recipe row UUID, not by reviving its deleted old row. Recompute the directional cutover census for the currently mapped item; pending drafts/open expectations block the inverse too. Submitted later stock history is evidence, never rewritten; fresh owner approval must cover the exact inverse census/impact. Original receipt, forward row identities, audit and inverse receipt survive. Reject inverse-of-inverse, another kind, missing/foreign receipt, prior compensation or intervening mapping state. Production undo remains separately approved; it is never automatic finally behavior.

### Exact owning functions and hashes

```ts
export function decodeMappingManifestV1(value:unknown):MappingManifestV1;
export function mappingManifestSha256(manifest:MappingManifestV1):Digest;
export function decodeMappingCommand(value:unknown):MappingCommand;
export function decodeMappingStatusInput(value:unknown):MappingStatusInput;
export function previewMappingCorrection(ctx:CoreCtx,
  manifest:MappingManifestV1):Promise<MappingPreview>;
export function applyMappingCorrection(ctx:CoreCtx,
  command:MappingCommand,actor:Actor):Promise<MappingApplyResult>;
export function getMappingCorrectionStatus(ctx:CoreCtx,
  input:MappingStatusInput):Promise<MappingStatusResult>;
```

The pure library has no runtime application alias/schema/service imports or executing CLI side effects; server code can import its pure validators without invoking a command. The new owning service uses actual passed ctx and normal actual F3/F7/audit/schema imports. Each owning function creates one transaction: preview and status use a repeatable-read read-only transaction, and apply uses the F3 guarded write transaction. No outer CLI transaction, nested service transaction, arbitrary SQL callback or global DB fallback. The required actor is the verified ctx principal; mapping preview, apply and status require the current real `membershipRole === 'owner'` plus the existing fresh stock:manage/POS/finance/module/effective-authority matrix. A custom role named owner and an owner reference string are not authority.

F1 adds the closed loader key `garmentMapping`→`src/server/services/faces-garment-mapping.service.ts`, its exact `typeof import` namespace and a real package smoke in the same implementing slice; the F7-created loader must not import a module that does not exist yet. The CLI statically imports only the pure mapping decoder and target/principal facilities, then loads this service after admission. It passes the qualified injected ctx; the service never discovers a database. Native tests call these same owning exports, not an orchestration mock.

`manifestSha256` hashes every normalized manifest field, including actor/target, action/inverse reference, desired fresh row UUID, all evidence/approval refs, before/census/rollout and unchanged-stock/payment digest, using F3 recursively sorted-key UTF-8 JSON. `planSha256` is an output alias of the same digest, not another projection. The manifest has no `planSha256`, `previewHash` or approval-signature fields, which prevents circular hashing. `approvedPlanSha256` must equal this digest.

previewHash = SHA256(canonical({schemaVersion:1,domain:'product_mapping',manifestSha256,beforeStateSha256,censusStateSha256,policyStateSha256})). These state hashes bind fresh complete row sets and the F7 authority/period/module projection. Source observation times are output metadata only, not censusStateSha256; no newly read current time is compared to a prior time as state. payloadHash = SHA256(canonical({schemaVersion:1,domain:'product_mapping',orgId,actorProfileId,manifestSha256,previewHash})). No manifest field is excluded because it seems incidental. The service recomputes all hashes; CLI parsing cannot attest authority.

MappingPreview exact fields are `{schemaVersion:1,domain:'product_mapping',outcome:'preview',eligible:true,manifestSha256,planSha256,previewHash,payloadHash,beforeStateSha256,censusStateSha256,policyStateSha256,intended:MappingIntent}`. A valid but blocked request instead returns `{schemaVersion:1,domain:'product_mapping',outcome:'blocked',eligible:false,code:'cutover_pending_sources'|'unsupported_scope'|'rollout_unverified'|'incomplete_evidence'}` with no executable previewHash. Decode/auth/target failures remain typed errors, never eligible outputs.

MappingApplyResult is `{schemaVersion:1,domain:'product_mapping',outcome:'applied',replayed:boolean,receipt:MappingReceipt}`. MappingReceipt is `{correctionId:UUID,operationKey:UUID,action:'correct'|'compensate',inverseOfOperationId:UUID|null,manifestSha256:Digest,previewHash:Digest,payloadHash:Digest,originalRecipeRowId:UUID,replacementRecipeRowId:UUID,beforeStateSha256:Digest,afterStateSha256:Digest,censusStateSha256:Digest,unchangedStockPaymentSha256:Digest}`. No credentials or raw financial rows are returned. The shared stk_corrections row has kind product_mapping, source_type fin_product/source_id M product, null stock-entry refs. before stores `{mappingState,census,unchangedStockPaymentSha256,policyStateSha256}`; intended stores `{domain:'product_mapping',action,inverseOfOperationId:null|UUID,domainManifest:MappingManifestV1,manifestSha256,previewHash,payloadHash}`; after stores `{mappingState,receipt:MappingReceipt,unchangedStockPaymentSha256}`. Insert all immutable fields and one audit in the same transaction as recipe replacement, never patch the receipt after commit. Audit exposes hashes/IDs only.

### Status, cutover and CLI

The gate-held fresh census, replacement and final before-commit verification belong only to apply. `getMappingCorrectionStatus` runs in a repeatable-read read-only transaction and never acquires the write gate pair ([report.md](contracts/report.md), Gate terms) or `FOR SHARE`/`FOR UPDATE` row locks. It first verifies actual current principal/org/capabilities, then reads the immutable same-org key and compares action/target/manifest and supplied expectedPayloadHash identity; current reader authority is independent of the historical stored actor. A matching receipt proves that operation committed even if later current state changed; status reports currentState:'matches'|'changed'|'compensated'|'unavailable' separately and never retries a write. Stored census is the recorded gate-held evidence. Any optional new read-only census is only a current snapshot, not a claim that posters were drained or a new cutover was certified.

MappingStatusResult is `{schemaVersion:1,domain:'product_mapping',outcome:'applied',receipt:MappingReceipt,currentState:'matches'|'changed'|'compensated'|'unavailable'}` or `{schemaVersion:1,domain:'product_mapping',outcome:'absent_before_unchanged'|'unknown',receipt:null}`. StatusInput.manifest is the strict original manifest matching supplied target/action/key/digest (the supplied `actorProfileId` is the current verified reader, while the manifest actor is immutable historical intent). With no receipt, complete before/census equality against that manifest in the same snapshot yields absent_before_unchanged, which is not a promise that an in-flight transaction cannot later commit; any retry uses only the same key/hash and actual guarded receipt admission. Mixed/unavailable state is unknown. Wrong key payload/action/target is conflict, not an applied receipt. Denied scope remains generic unavailable.

Exact preview/apply flags are --org UUID --manifest PATH --output PATH, with optional --apply --approved-plan-sha256 DIGEST --preview-hash DIGEST. Manifest supplies the exact actor; no actor lookup/default. Explicit --status is mutually exclusive with --apply and requires --org UUID --manifest PATH --actor-user UUID --operation-key UUID --action correct|compensate --manifest-sha256 DIGEST --payload-sha256 DIGEST --output PATH. `--actor-user` populates `MappingStatusInput.actorProfileId` (the current reader) and must equal the verified principal; `--payload-sha256` populates `expectedPayloadHash`. The strict original manifest supplies the target and before-state, not a new executable intent. No business read precedes shared private-env/transport/principal admission. Reject missing/unknown/duplicate/mixed flags before imports. All private inputs and output are mode 0600, and output is atomically renamed after complete serialization; no partial credential-bearing file.

Exit codes: 0 for an eligible preview, an applied or replayed result, or an applied status; 2 for invalid arguments, authentication or target; 3 for incomplete DB/schema/timeout/read; 4 for blocked, stale, key conflict or `absent_before_unchanged`; 5 for transport/COMMIT uncertainty or `unknown` status. A postcommit output failure is unknown until same-key status, never verified rollback. Returning applied is bound to a durable matching receipt; a desired mapping without a receipt is unknown. No automatic new operation key/reapproval.

### Required proof

Extend F1's existing eight native behaviors and ordinary mapping/CLI tests, without inventing a ninth name. Strictly reject unknown/nested keys, omitted fields, malformed target/action/row IDs/census and every over-limit case. Mutate each hash-bound family independently (including reason/approval/cutover/row UUID/action/inverse reference) under the same key and require conflict, not replay. Assert the owning preview/apply/status functions, byte-identical decoder/hash vectors, same-key replay zero writes, wrong-action status conflict, no-receipt/mixed state unknown and status takes zero advisory/row locks and makes zero writes. Race a status read with a gated apply; no-snapshot receipt must not be reported rollback. Forward plus new-key inverse restores the fixture mapping semantically with a new row ID and two preserved receipts and audits; intervening row or pending draft/accrual blocks compensation. Quantities, ledger, bins and payments remain unchanged for both mapping directions. Garment inverse runs before mapping inverse when the fixture exercises both; each gets fresh independently approved synthetic intent and its own immutable receipt.

[unchanged-facts.md](contracts/unchanged-facts.md) is the exact bounded table/key/all-field PostgreSQL row digest/set/canonical preimage and no-other-DML invariant for unchangedStockPaymentSha256. It applies independently to both mapping directions; it is not a whole-organization freeze claim.

MappingPreview.payloadHash is the computed payload digest available before apply, retained with key/manifest/preview evidence for authoritative status. `MappingStatusInput.expectedPayloadHash` and `--payload-sha256` are required and compared to the immutable row before acknowledgement; a matching manifest digest alone cannot substitute an unverified preview/payload identity. Current-state diagnostic absence/failure is unavailable, distinct from committed outcome, and cleanup follows F3 recovery-receipts.md (no work in aborted transaction).

### Review artifact: contracts/repair.md

## Historical garment stock-only correction

This is the selected correction design for a proven garment variant mismatch. It is
not permission to apply it. Owner spec approval, a qualified implementation, owner
merge and exact target/manifest approval remain required.

### Selected mechanism and dependency

Use the atomic `stock_only` correction engine designed in
[F3's workflow contract](../124-stock-correction-workflow/contracts/workflow.md).
F3 must expose a shared server service for its preview/apply endpoints and the
operator script. The F1 script imports that service; it does not invoke the old
two-transaction `repostTicketStock` sequence, shell out to a service repair script,
or create another ledger writer. F3 owns the transaction-aware submit/cancel
helpers, sorted source/bin locking, authoritative policy checks and durable
`stk_corrections` operation receipt. F1 cannot ship this writer before that
dependency is independently qualified.

Add `scripts/faces-garment-repost-2026-11.ts`, a dry-run-default, single-ticket
operator command; pure validation/canonical plan lives in
`scripts/lib/faces-garment-repost.ts`. No batch mode, new HTTP endpoint, background
worker or additional correction table is introduced by F1.

### Admission and frozen intended issue

The diagnostic must match ticket, physical M product line and single live submitted POS issue by same-org stable IDs; the original issue's metadata must decode to `{kind: 'pos', id}` equal to the ticket ID under the [stock entry source decoder](contracts/source-explanation.md), and any other decoded kind refuses. The later [bounded garment read](../../audits/2026-11-16-faces-followups/evidence/garment-candidates-read-summary.json), observed 2026-11-16T19:42:24.613Z, establishes these two reported cases. Each has one physical M quantity 1 and one submitted single-L issue:

| Case | Ticket | Ticket ID | M product line | Original L issue |
| --- | --- | --- | --- | --- |
| reported_case_A | POS-2026-00092 | `d3147366-60ef-409a-b91b-f799afafd819` | `d15839b7-70fe-4f14-8def-3dc54b412ac7` | `22510eb0-6f4c-4859-b60d-4d1230783d1b` |
| reported_case_B | POS-2026-00098 | `6284d37e-a942-4f96-a27f-67ef4381860e` | `344b74e4-c9bf-46c2-b5f1-8fc063038d28` | `0e54f2e3-eb62-4a79-80be-95151bdb481a` |

These are evidence references, never hardcoded production defaults or a standing allowlist. Each operation has its own fresh manifest, operation key, fingerprints and owner approval. The CLI processes one ticket. Applying the first case changes their shared bin state, so the second case must be freshly previewed and its exact updated manifest approved before apply; an earlier approved stale fingerprint is not reusable. No automatic two-case batch or silent reapproval is implied.

A third candidate, POS-2026-00059, predates the later manual M/L two-unit issues dated 2026-10-29 UTC. Whether those movements absorbed that discrepancy is unresolved: this older case remains ineligible without independent coverage evidence. The bounded read found no later adjustment/unowned manual movement after the two reported cases; that narrows the investigation but does not independently verify physical count or delivery intent.


For this bounded first repair, require:

1. One unambiguous physical M sale quantity, a single original issue line for L,
   identical normalized units, and an exact quantity match. Reject mixed M/L sale
   ownership, multiple stock lines, modifiers or competing source owners. A
   zero-total/fully discounted product remains an actual physical product.
2. Independent confirmed fulfillment and review of later physical true-ups and
   earlier correction receipts. A true-up that already absorbed this discrepancy
   makes this source ineligible; an unknown coverage interval blocks application.
3. The approved current M mapping has been corrected to M, L still maps to L, and
   no bridge, component, conversion or archive-state drift changes either meaning.
   Recipe correction and historical stock correction have separate operation IDs.
4. Both the original issue period and the proposed current correction period pass
   the existing period policy. Missing settings, locked/fiscal constraints,
   ambiguous source or pending repost blocks the command.

Construct the intended issue by copying the original immutable issue lines and
replacing only the approved L item with the approved M item, preserving quantity
and warehouse. Do not regenerate the ticket's entire present-day recipe: a
co-ticket package or service may have changed independently. Record any such
current-recipe difference as separate diagnostic evidence; never add its supplies
to this garment correction.

Evaluate the whole frozen replacement through existing `planRepost`, with
`allowedItemIds={L}` and `allowIncreaseItemIds={M}`. `planRepost`
(`pos.service.ts:1211–1235`) is pure in body but lives in `pos.service.ts`, which
imports `$server` and database modules, so it runs only inside the F3 server
engine; the pure `scripts/lib/faces-garment-repost.ts` validator never imports it.
Its `Number` arithmetic and `REPOST_TOLERANCE = 0.0001` skip differences of at most
0.0001, so the engine and the validator separately require exact Q4 equality
([data-model.md](data-model.md)) between the frozen original L line quantity and
the replacement M line quantity, and exact equality on every other line, before
`planRepost` is consulted. Required issued-quantity change is L `-q`, M `+q`; the
corresponding bin change is L `+q`, M `-q`. Every other quantity/key must be
unchanged. Preview the actual cancellation and
replacement value effects from the original ledger and freshly locked bins.
If rates differ, show the resulting COGS and remaining-value difference explicitly;
do not promise a zero-value correction. Negative stock, unapproved costs or any
extra key/value effect is a blocker. M=19 or a physical-count target such as 17
is never used as an overwrite instruction.

### Manifest, command and exact authority

The private manifest is F3-owned `GarmentManifestV1` in [garment-envelope.md](../124-stock-correction-workflow/contracts/garment-envelope.md), not an implementer-selected subset. F1 uses that strict decoder/type, canonical full manifestSha256, explicit approvedPlanSha256 and private previewHash. It binds every target/actor/source/evidence/coverage/bin/period field, replacementEntryId, postedAt/accountingTimezone, before/intended effects and owner reference. No credentials or customer names; file mode 0600. Apply requires the verified executing `membershipRole === 'owner'` in addition to the stock/POS/finance matrix; custom role names/platform admin are not a bypass. Preview may prepare an unapproved candidate but cannot claim owner approval.

`bun run faces:stock:repair --org <uuid> --manifest <path>
--output <path>` only previews in a verified repeatable-read/read-only org scope.
Adding `--apply --approved-plan-sha256 <digest> --preview-hash <digest>` requests
the one approved operation after target verification; the full flag set, status
command and exit codes 0/2/3/4/5 are F3's
[recovery-receipts.md](../124-stock-correction-workflow/contracts/recovery-receipts.md).
Token verification and read-only admission follow [report.md](contracts/report.md), Shared
principal and snapshot admission; the verified profile must equal the approved
manifest `actorProfileId`. The write transaction checks authority again under the
write gate pair. It never selects the first organization member or treats a
profile flag as identity proof. Invalid approval or authority refuses without
mutation.

### Apply transaction and recovery

The F3 engine owns one transaction: `lockStockWrite` acquires the write gate pair
([report.md](contracts/report.md), Gate terms) before any source, profile, period, entry or
bin row lock, and its guard holds both gates until commit or rollback. Then follow
this row order: operation/source rows → period-policy and fresh authority → entries
→ accruals → bins; re-read all manifest conditions; recompute the frozen plan;
check the operation identity under the stock-v1 gate;
append cancellation reversals; create/submit the replacement POS issue retaining
source and correction provenance; update the ticket stock-entry stamp; save
before/after, actor, reason, approval digest and audit evidence; insert the completed immutable applied operation row and
commit. The ticket product, payment amounts/dates/status and booking/package
entitlements remain unchanged. No outer script may patch a ticket stamp after
the transaction. Replacement and reversal rows post in the approved current open
correction period, while originals retain their original dates. Report the
current-period COGS effect; earlier-day financial history is not restated.

Failure before commit rolls back the entire operation. A lost response is
`unknown`, not a retry with a new key: read the F3 operation receipt using the
same key/digest. Applied receipts replay the original outcome without another
cancellation or issue. Reusing a key with changed intent is a conflict. Another
operation against the same stale source loses its fingerprint race and refuses.
Best-effort notifications/audit transport cannot turn a committed correction into
a second mutation. Missing, mixed or contradictory receipt/source state blocks
manual recovery until authoritative reconciliation.

### Validation and completion

Required synthetic tests: exact M sale/wrong-L issue; zero-total product; stale
or changed mapping; correct source product preserved; package recipe drift not
added to the frozen replacement; mixed/shared ownership refused; true-up-covered
source refused; negative M stock; unequal rates and explicit COGS; locked period;
missing/foreign source; two operation keys racing; same key/different payload;
failure at each write; lost-commit-response recovery; one apply followed by a
zero-write repeat. Native PostgreSQL tests must assert atomicity and all bins,
ledger rows, durable receipt and ticket stamp together.

Rehearse compensation in `finally` only on disposable QA: the explicit action=compensate private command, with a second approved inverse manifest, restores fixture quantity attribution (economic equality only for its qualified equal-rate fixture) and preserves its audit trail.
Production undo is a new reviewed inverse manifest, never deletion of ledger
history. A historical duplicate or missing service issue that is not this proven
garment case is reported separately and cannot enter this writer.


The exact shared write ordering, helper signatures and retry bounds are F3's [transaction protocol](../124-stock-correction-workflow/contracts/transaction-protocol.md). Preview uses the shared F7 principal/nonlocking snapshot admission in report.md; it never calls a `FOR SHARE` resolver inside a read-only transaction. Approved source/mapping/ledger/bin fingerprint admission is exact, irrespective of the diagnostic numeric tolerances.

Every garment manifest carries a required `target: QualifiedOperatorTarget` ([report.md](contracts/report.md)), bound with the exact intent digest. The package, admitted SSR loader, private environment and transport contract in report.md apply unchanged.

Apply consumes F3's common authority/module synchronization and direct required-module admission under the held write gate pair, including actual absent-rule/module insertion race qualification. No F1-specific authority implementation is permitted. The read-only preview/status snapshot remains nonlocking and does not acquire either gate.


### Exact shared invocation and receipt

F1 preview invokes previewGarmentStockCorrection(ctx,manifest). Apply invokes applyGarmentStockCorrection(ctx,{manifest,approvedPlanSha256,previewHash},actor). No naked CorrectionInternalOptions/replacementEntryId or generic public StockOnlyPreview call remains. Both methods own the F3 transaction and compare the full manifest. The public `stock_only` API stays closed (HTTP 422); the CLI is the only selected garment entrypoint. F3 validates original/source/true-up/mapping receipt/period/value effects and the owner/profile/org under the held write gate pair; caller attestation strings alone cannot authorize an arbitrary stock substitution.

Use the exact `manifest.postedAt` for the cancellation reversal and the replacement create/submit, roundtrip canonical UTC milliseconds, fresh approved current open period and actual accountingTimezone. No server-now replacement or historical backdate. The full normalized manifest/digest/time/approval/source evidence and before/intended/actual after effects are inserted in the immutable F3 `sale_stock_repost` receipt in the same transaction as every stock/stamp/audit effect. No post-commit receipt patch. Same operation key with changed evidence/posting time/reference/replacement UUID is key_reuse; status/replay returns original full domain receipt, not merely a generated entry ID. Local native tests invoke the shared private methods and assert complete receipt/time equality and rollback on receipt failure. Repeated lost-response run makes zero new effects.

Active-principal checks are current database profile exists/not deletion_pending and organizations.status='active', independently of valid token/surviving membership. Both read-only preview/status and guarded apply use the exact F3/F7 dependency contract; deletion-first refuses, correction-first may commit before deletion waits. F3 foundation qualification includes the warehouse/default, finance-timezone and bundle eligibility writers, all under the shared gate; deployment/drain admission must cover them before any F1 production apply.

The complete correct/compensate action contract is F3 garment-envelope.md. It admits the forward replacement M issue only through its actual immutable receipt; no generic forward L-issue predicate blocks or bypasses the inverse. All inverse costs are freshly previewed/approved, with no historical-rate override or claim of economic rollback under unequal rates.

F3 [recovery-receipts.md](../124-stock-correction-workflow/contracts/recovery-receipts.md) also owns the known-key/full-original-manifest/payload binding and the result union with current-reader authority; no wrapper invents or discards `--preview-hash`. Status calls `getGarmentCorrectionStatus` in its nonlocking owning snapshot, needs no unknown correction UUID and acknowledges a stored receipt separately from changed current state. All value/COGS normalization and fractional forward/inverse qualification are F3 [garment-numerics.md](../124-stock-correction-workflow/contracts/garment-numerics.md), not diagnostic quantity tolerances.


### Required stock denomination qualification

`GarmentManifestV1` also requires `valuation: StockValuationQualificationV1`. The selected shared F3 definition is in `contracts/valuation-qualification.md` of that feature and is imported by the same strict private decoder; F1 introduces no parallel currency resolver. The selected object is:

```ts
type StockValuationQualificationV1 = {
  schemaVersion:1; kind:'owner_attested_stock_currency'; orgId:UUID;
  currency:string; attestedByProfileId:UUID; attestedAt:string;
  evidenceReference:string; evidenceSha256:Digest;
  keys:{itemId:UUID;warehouseId:UUID;latestLedgerId:string|null;
    latestLedgerRowSha256:Digest|null}[];
};
```

All keys are required; reject unknown keys recursively. `currency` is an owner-verified uppercase three-letter currency code, not a default. UUIDs/digests use the manifest's existing canonical validators. `attestedAt` is canonical UTC with exactly three fractional digits and `Z`, no later than the qualified preview/apply observation. `evidenceReference` is trimmed NFC 1–1000 characters, a protected reference rather than fetched content. `keys` is the exact sorted distinct affected old/new item+warehouse pair, bound to the same latest-ledger IDs and row hashes as the full manifest. Null ID/hash are paired and only represent the manifest's actually absent latest ledger; no fabricated opening history. Org, affected keys, stock boundaries and current source fingerprints must match under the same owning snapshot/held write gates.

At preview and apply, the independently verified executing real owner must equal both manifest actorProfileId and attestedByProfileId. This is expressly an owner's attestation that the admitted historical stock values and current affected bins share this denomination. The database has no historical stock-currency column; ticket.currency, invoice currency and current display settings do not prove that fact. Missing, contradictory, mixed-denomination or unsupported evidence refuses the private operation with no stock writes. No FX engine, conversion, numeric overwrite or normal-sale policy change is introduced.

Bind the complete valuation object into manifestSha256, approved plan, preview/payload hashes, immutable intended.domainManifest and after.receipt. Available value/rate/COGS projections carry the exact qualified currency and qualification digest; denied projections omit both together with all amounts. Status preserves that immutable original evidence and verifies the current reader separately; it never requires the historical attester still exists or retains owner membership. Compensation requires the same currency as its retained forward receipt plus a new current-owner attestation bound to fresh affected stock boundaries. It does not reuse an expired forward authorization or change historical evidence.

The source-only diagnostic remains useful without this proof: raw ledger/accrual values are explicitly denomination-unverified stock scalars, distinct from payment/ticket money with its actual stored currency. It cannot claim denominated COGS, compare them economically to sale money, or prepare an eligible executable garment manifest without the qualification. Neither a formatting currency nor a passing numeric integrity check fills this gap.

Existing pure/CLI/native garment behaviors add missing/wrong-owner/foreign-org/changed-boundary/mixed-currency rejection, immutable valuation roundtrip and digest sensitivity, current-reader versus removed historical attester, inverse same-currency/new-attestation success, and no fallback from ticket/display currency. These are assertions inside the selected eight native behaviors and existing test files, not an extra feature or ninth registration.

### Review artifact: contracts/report.md

## Diagnostic CLI/file contract (proposed, not installed)

### Surface and authority

First slice is an operator-run script, not a new HTTP/API/UI surface. Proposed path: `minion_hub/scripts/faces-stock-reconcile-2026-11.ts`. Required flags: `--org <verified-org-id> --case-manifest <private-json> --output <private-json>`. No `--apply` or implicit mutation mode in this diagnostic. Missing flags, unverified target, invalid manifest or invalid IDs terminate nonzero before data access.

Connection is supplied via the private environment in Standalone entrypoint below; never print it. Use one explicit `REPEATABLE READ READ ONLY` transaction, verify `transaction_read_only=on`, set bounded statement/lock timeouts, verify exact organization identity, then use `app_ledger` plus `app.current_org_id`. No fallback tenant, inferred owner impersonation, DDL, temp persistent tables, writable app pool or repair service calls. Recheck read-only and role/scope before the final report. Close connections in `finally`. Admit the operator through Shared principal and snapshot admission below before sensitive reads; a supplied profile ID is only compared with the verified user, never identity proof. Do not choose the first member as identity. Authentication occurs before the read-only transaction, never by falling back to a service-role credential.

Outputs are mode 0600 and written by atomic write/rename under a private output directory. Committed fixtures are synthetic. Sanitized reports keep source IDs, item names/codes and aggregates; personal contact names/details stay private. A supplied organization requires exact equality on every queried relation. An ID from another organization yields generic unavailable/invalid-case evidence, not the other tenant's existence or fields.

### Input/output semantics

The closed DiagnosticManifestV1/ReconciliationReport/CaseRow/MovementEvidence/graph/coverage/error schemas, date hints, evidence references and consistency variants are in [diagnostic-wire.md](contracts/diagnostic-wire.md). Protected search hints are hashed/withheld in output, never used as query authority. The classification, numeric and resource rules below remain binding.

### Error and completion contract

- Exit 0: a complete, read-only report, including explicitly unresolved cases. Unresolved is a legitimate finding, never repair-ready.
- Exit 2: invalid scope/manifest, authentication or target guard. No data query beyond minimal target verification.
- Exit 3: incomplete read, timeout, schema drift or connection failure; output `complete:false` and no eligible repair entries. Never manufacture zero counts for failed queries.
- Exit 4: integrity failure such as a foreign-org link, duplicate canonical ledger row, missing/extra bin or unbalanced source attribution; preserve private evidence, block repair recommendation.

The diagnostic cannot apply changes. The separately gated known garment writer is defined in [repair.md](contracts/repair.md) and depends on F3 atomic correction primitives; it cannot admit unproven duplicate/missing cases. The diagnostic does not call the old repair script for its reads because that script's candidate assumptions and actor selection differ.

### Enforced resource and coverage limits

Admission limits are chosen safety bounds, not measured latency claims: UTF-8 manifest ≤ 1,048,576 bytes; cases ≤ 100; each ID array ≤ 100; total distinct supplied IDs ≤ 1,000; provenance expansion ≤ 1,000 entries, 1,000 item/warehouse keys and 50,000 canonical ledger rows; final private JSON ≤ 20,971,520 bytes. Overall database transaction deadline 60 s, with statement timeout 12 s and lock timeout 1 s; the timer cancels the current statement and closes transaction/connection in `finally`. Every read is key/ID qualified; no unrestricted population scan is admitted. An item-only case may request its history, but expansion stops at limit+1 and produces `complete:false`, `repairEligible:false` and exit 3, never a silently complete partial report. Date hints do not weaken hard bounds. Full-union ledger/bin integrity means the union of affected admitted keys only; it is not a whole-organization integrity certification. Test every limit, the cumulative deadline across many successful queries, cancellation and output cleanup.

### Deterministic classification decision table

Evaluate canonical signed source evidence after ledger-ID deduplication and same-org linkage. For each fulfilled source component, derive intended item/warehouse/normalized quantity only from an immutable sold/fulfilled snapshot, explicit historical recipe/version evidence or separately owner-confirmed documentary evidence; today's mapping alone is not historical intent. Actual issued quantity is the negated signed sum of attributable issue/reversal ledger deltas, never an accrual estimate. Attribution uses only decoded entry sources ([source-explanation.md](contracts/source-explanation.md), Stock entry source decoder). Record an expected vector and an actual vector per component. Unallocated shared ticket rows, uncertain true-up coverage, incomplete reads, negative/contradictory source attribution, an `unknown` decoded entry source or unknown intent make the component unresolved. Do not allocate one ticket issue to each booking independently.

First pair a variant only when documentary evidence names that exact old→intended item relation and one full component has a unique exact warehouse/UOM/quantity counterpart. Remove that paired component from the separate quantity-shortfall/excess checks; a wrong-key partial component or multiple possible pairings is unresolved. Evaluate remaining components for shortfall/excess independently. Different components may therefore prove duplicate+variant or duplicate+missing; those mixed cases follow order 2 below. Do not infer a variant pairing merely to make aggregate quantities balance.

Evaluate in this exact order:

| Order | Mandatory evidence and predicate | Primary classification / eligibility |
|---|---|---|
| 1 | Ambiguous/unmatched identity, incomplete/contradictory attribution, `unknown` decoded entry source on an affected movement, unknown historical intent/fulfillment/true-up coverage, integrity failure or numeric range failure | `unresolved`; false |
| 2 | Evaluate the three proven discrepancy predicates below. More than one predicate is true across a source's components, or one component mixes incorrect variant and quantity | `unresolved`, reason `mixed_discrepancies`; false; retain every proven discrepancy in secondaryFindings |
| 3 | `duplicate`: same intended key has attributable net issue above confirmed intended quantity and the excess is backed by distinct live source posts, not duplicate joins or a reversal; no wrong-key or missing predicate | `duplicate`; false in this first bounded writer slice |
| 4 | `missing_realization`: confirmed fulfilled positive intended component has smaller net issue on its correct key, on a non-variant component; drafts, warnings/open accruals are evidence of not-yet-posted, not actual issue | `missing_realization`; false in this slice; record each partial shortfall, not just wholly absent entries |
| 5 | `variant_mismatch`: documentary confirmed intended item differs from actual attributable item on the same warehouse/UOM and exact normalized quantity, with a unique one-to-one replacement and no excess/shortfall/other unexplained key | `variant_mismatch`; true only if the complete single-line garment admission/true-up/authority conditions in repair.md also pass |
| 6 | No stock discrepancy: expected and actual vectors match (including an explicit documented zero-consumption decision), but the same authorized product/source is demonstrably omitted or contradictory between the affected UI projections | `display_only`; false; missing browser/projection evidence cannot establish this predicate |
| 7 | All required evidence complete, vectors match and no projection contradiction | `valid`; false |

Wrong-key quantity that cannot be paired exactly, unexplained positive net stock, or aggregate-only ownership remains unresolved rather than being coerced into a variant correction. `secondaryFindings` is a stable sorted array of `{kind, componentKey, intendedQty, actualQty, evidenceRefs, reason}` retaining proven duplicate/missing/variant/display facts even when the primary is unresolved; unknown values are null with reasons, never zero. `componentKey` is stable source ID + item + warehouse, and references canonical evidence IDs. A case spanning multiple components may be `missing_realization` for several known shortfalls, but any unresolved component forces primary unresolved; it can never enter the single-line garment writer. Primary classifications do not sum distinct ledger rows again. Fixtures must cover duplicate+variant, correct component plus partial missing component, unknown component plus valid component, reversed excess, repeated joins, explicit zero versus unknown consumption, and an affected movement with an `unknown` decoded source.

### Gate terms

These names are used across this package:

- **Stock-v1 gate**: F3's exclusive per-organization transaction advisory lock `hashtextextended('minion:stock-write:v1:' || orgId, 0)`, always acquired first.
- **Policy-coordinator gate**: the existing `lockNavigationPolicy` transaction advisory lock `hashtextextended(orgId, 112)`, always acquired second.
- **Write gate pair**: both gates, acquired in that order by F3's `lockStockWrite` before any row lock and held until commit or rollback ([transaction-protocol.md](../124-stock-correction-workflow/contracts/transaction-protocol.md)).
- **Read-only authority bridge**: F7's authority-bridge function called with `p_lock_rows=false`, which requires a repeatable-read read-only transaction and takes no lock. The write path calls it with `p_lock_rows=true` under the write gate pair ([authority-bridge.md](../128-faces-receivables-audit/contracts/authority-bridge.md)).

### Shared principal and snapshot admission

F7 owns `scripts/lib/operator-principal.ts` and the `src/server/services/rbac.service.ts` nonlocking snapshot API; qualify that dependency before F1's diagnostic, mapping and garment previews. All three scripts import `verifyOperatorPrincipal` from `./lib/operator-principal` with `{accessToken, authUrl, anonKey, expectedProfileId, targetFingerprint}` and consume only its `{profileId, authProject, verifiedAt}` receipt. Every F1 manifest (diagnostic, mapping, garment) carries a required `actorProfileId` as the expected verified subject, never an authentication source.

Token verification, the single rule for all three commands: the operator supplies a private `FACES_OPERATOR_ACCESS_TOKEN` from an existing GoTrue session through the environment, never as an argument or in output. Before any business read, the helper validates it with `@supabase/supabase-js` `auth.getUser(token)` against the qualified target auth URL and private `FACES_OPERATOR_ANON_KEY`, with session persistence and automatic refresh disabled; no admin key, service-role key, `AUTH_DISABLED`, gateway token or new login flow. The verified user ID is the canonical profile ID and must equal the manifest `actorProfileId`. Invalid, expired, foreign-subject or unavailable authentication, or a wrong auth target, refuses with exit 2 before business reads. No network request occurs inside a business transaction.

Inside the same repeatable-read read-only business transaction, first call F7-owned `assertActiveOperatorPrincipalReadOnlyInTx(tx, orgId, verified.profileId)` from the admitted closed `activeOperatorPrincipal` loader key, requiring an active organization (`organizations.status='active'`) and an existing profile that is not deletion-pending; then call `resolveFreshCapabilitiesReadOnlyInTransaction(tx, orgId, verified.profileId): Promise<FreshCapabilitySnapshot>` from `rbac.service.ts`. Its result contains capabilities, roles, membershipRole, realCapabilities and realRoles from the existing composition, fed by the read-only authority bridge in the same snapshot, with no cache or `FOR SHARE`. No direct `app_ledger` organization/profile SELECT or JWT claim substitution is assumed. Require exact active membership, enabled stock/POS/finances modules, `stock:view`, `pos:view`, `finance:view`, and `capabilities.fieldLevel('finance') >= SENSITIVE_FIELD_LEVEL` (the existing `$lib/permissions` constant) for these cost-bearing reports; a mapping preview/apply additionally requires `stock:manage`. Reject simulated/delegated authority that does not meet the actual-principal checks of the F3 contract. No sensitive business read precedes this admission. The legacy locking fresh resolver remains unchanged for unrelated callers. F1 writes use F7-owned `resolveFreshOperatorCapabilitiesForWriteInTransaction(tx, orgId, profileId)` after the write gate pair; they do not call the legacy adapter or invent direct profile/organization access. Shared native parity/denial tests belong to F7, while F1's CLI guard test verifies all three preview paths call these helpers in their own snapshot and fail closed. Do not copy a second RBAC composer or call the locking resolver inside a read-only transaction.

F1 diagnostic and mapping preview/status own their admitted snapshots and call both F7 helpers there. The private F3 garment preview/status owns its one snapshot and performs these checks internally; the F1 wrapper must not open an outer transaction around that method. Loader imports and token verification precede the snapshot; no business inventory precedes both principal-state and capability checks.

### Cost authority

Cost authority uses the existing finance field tier: `$lib/permissions.ts` `FIELD_LEVEL_MODULES` excludes stock, and `rbac.service.ts` `defaultFieldLevel` returns 0 for stock. Never require a nonexistent stock-sensitive tier or register a new one. Qualify an ordinary authorized owner/custom-role actor with stock field level 0 and sufficient finance authority, plus finance-view/tier/module denial cases, on each exact snapshot and apply recheck.

### Standalone entrypoint and qualified target encoding

Planned package.json script `faces:stock:diagnose` is `bun --no-env-file scripts/faces-stock-reconcile-2026-11.ts`. Mapping and garment wrappers are `faces:stock:mapping`→`scripts/faces-garment-mapping-2026-11.ts` and `faces:stock:repair`→`scripts/faces-garment-repost-2026-11.ts` with the same no-env prefix and shared admitted Vite SSR loader. Read only private `FACES_STOCK_DATABASE_URL`, `FACES_OPERATOR_ACCESS_TOKEN` and `FACES_OPERATOR_ANON_KEY`; the auth URL comes from the approved `QualifiedOperatorTarget`, never global `PUBLIC_SUPABASE_URL`/`ANON_KEY` or an application DB fallback. Business service dynamic imports occur after target/principal admission and use injected qualified handles.

`QualifiedOperatorTarget`, exported by `scripts/lib/operator-principal.ts`, is `{databaseIdentity: string; authProject: string; authUrl: string}`. It is the credential-free target record carried by every F1 manifest, not an opaque SHA. `verifyOperatorPrincipal` binds the auth project and URL; each owned business transaction verifies the database identity independently.

Shared `operatorDatabaseIdentity(connectionUrl, authProject)` is SHA-256 of UTF-8 recursively key-sorted `{version: 1, protocol: 'postgresql', host: lowercaseURLHostname, port: explicitNumberOr5432, database: percentDecodedPathAfterLeadingSlash, transport: 'tls-verify-full' for remote | 'local-marked-plaintext' only for loopback, authProject: exactApprovedString}`; omit credentials, username and query secrets. Compare the computed digest to `QualifiedOperatorTarget.databaseIdentity` before connecting; after connecting, compare `current_database()` to the parsed database and verify the exact role/org/profile GUC. Remote TLS must verify host and certificate; loopback plaintext requires the owned fixture marker.

F7 owns the shared admitted Vite SSR `operator-service-loader.ts` in its operator-bootstrap.md contract. The existing bare Bun shim is unchanged and is not preloaded by these new commands; it cannot compile the real Svelte icon graph. F1 uses only closed typed loader keys after verified target/principal admission. A new standalone process package-command smoke runs with global app DB/auth/LLM credentials absent: invalid target/principal stops before business imports, and valid owned QA loads the real graph and uses only the injected qualified DB.

Qualification requires F7's [authority bridge](../128-faces-receivables-audit/contracts/authority-bridge.md) migration `20261116190000_operator_authority_bridge.sql` before F3 correction storage migration `20261116193000_stock_corrections.sql` and its helpers. Both principal and capability admission consume its fixed same-transaction bounded projection under the baseline ACL/RLS. A missing or mismatched function, scope, owner or catalog proof refuses; there is no global privileged connection, table-grant expansion or permissive fixture substitute. Read-only status and preview use the read-only authority bridge; apply uses the guarded write adapter after the write gate pair.

### Review artifact: contracts/source-explanation.md

## Closed source facts, timeline and admitted display comparison

This contract defines the source facts, stored-time timeline and display comparison carried by the [diagnostic-wire.md](contracts/diagnostic-wire.md) report. It selects source explanation, not another ledger writer or browser reader. Pure decoders and types live in `scripts/lib/faces-stock-reconciliation.ts`; the diagnostic reader fills them from the same qualified snapshot. All row, graph, 20 MiB output, deadline and privacy limits in [report.md](contracts/report.md) apply cumulatively. Graph node hashes alone never stand in for payment, appointment, draft or accrual facts or for a displayed projection.

### Source evidence placement and exact values

`ReconciliationReport` has required `sourceEvidence: SourceEvidenceRow[]`, `timeline: TimelineRow[]`, `sourceEvidenceSha256: Digest | null` and `projectionEvidence: ProjectionEvidenceResult[]`. SourceRef identities per kind are defined in diagnostic-wire.md.

```ts
type WarningEvidence={state:'none'|'present'|'unavailable',
  code:string|null,
  sourceSha256:Digest|null,draftEntryId:UUID|null,
  items:{itemId:UUID,requested:string,available:string}[]};
type StockEntrySource=
 | {kind:'pos',id:UUID}
 | {kind:'booking',id:UUID}
 | {kind:'invoice',id:UUID}
 | {kind:'service',id:UUID|null,finProductId:UUID|null}
 | {kind:'purchase',id:UUID}
 | {kind:'manual_reconciliation',label:'repair-opening-balance'|'analyst-reconciliation-2026-08'}
 | {kind:'none'}
 | {kind:'unknown',metadataSha256:Digest};
type SourceValue=
 | {kind:'ticket',status:string,submittedAt:string,voidedAt:string|null,currency:string,
    total:string,stockEntryId:UUID|null,warning:WarningEvidence}
 | {kind:'sale_line',ticketId:UUID,lineKind:string,finProductId:UUID|null,bookingId:UUID|null,
    qty:string,unitPrice:string,discount:string,total:string,lineNo:number,
    planId:UUID|null,redemptionId:UUID|null}
 | {kind:'payment',ticketId:UUID,paidAt:string,amount:string,method:string,currency:string}
 | {kind:'booking',status:string,resourceId:UUID,startTime:string,endTime:string,createdAt:string,updatedAt:string,
    productId:UUID|null,eventTypeId:UUID,groupId:string|null,rescheduledFromId:UUID|null,
    invoiceId:UUID|null,packageGrantId:UUID|null,paymentPlanId:UUID|null}
 | {kind:'booking_product',bookingId:UUID,productId:UUID,qty:string,createdAt:string,updatedAt:string}
 | {kind:'booking_group',resourceId:UUID,groupId:string,memberIds:UUID[]}
 | {kind:'booking_status',bookingId:UUID,fromStatus:string|null,toStatus:string,changedBy:UUID|null,changedAt:string}
 | {kind:'invoice',providerRef:string|null}
 | {kind:'accrual',source:string,sourceId:UUID,finProductId:UUID|null,itemId:UUID,warehouseId:UUID,
    status:'open'|'realized'|'released',qtyConsumption:string,qty:string,
    realizedEntryId:UUID|null,realizedQty:string|null,realizedValue:string|null,
    createdAt:string,updatedAt:string,realizedAt:string|null,releasedAt:string|null}
 | {kind:'stock_entry',type:'receipt'|'issue'|'transfer'|'adjustment',status:'draft'|'submitted'|'cancelled',
    createdAt:string,updatedAt:string,postedAt:string|null,source:StockEntrySource}
 | {kind:'stock_line',entryId:UUID,itemId:UUID,qty:string,uom:string|null,rate:string|null,
    fromWarehouseId:UUID|null,toWarehouseId:UUID|null,lineNo:number}
 | {kind:'grant',sourceTicketId:UUID,sourceLineId:UUID,packageProductId:UUID,serviceProductId:UUID,
    sessionsTotal:number,unitValue:string,expiresAt:string|null,status:string,createdAt:string,cancelledAt:string|null}
 | {kind:'redemption',grantId:UUID,bookingId:UUID|null,ticketId:UUID|null,ticketLineId:UUID|null,
    redeemedAt:string,reversedAt:string|null}
 | {kind:'correction',correctionKind:'sale_variant'|'sale_stock_repost'|'receipt_replace'|'product_mapping'|'receipt_chain',
    sourceType:'pos_ticket_line'|'stock_receipt'|'fin_product',sourceId:UUID,
    sourceEntryId:UUID|null,replacementEntryId:UUID|null,appliedAt:string};
type SourceEvidenceRow=
 | {ref:SourceRef,state:'available',rowSha256:Digest,value:SourceValue}
 | {ref:SourceRef,state:'missing_or_unavailable',rowSha256:null,value:null};
type TimelineRow={ref:SourceRef,
  field:'submitted_at'|'voided_at'|'paid_at'|'start_time'|'end_time'|'created_at'|'updated_at'|'changed_at'
    |'posted_at'|'realized_at'|'released_at'|'cancelled_at'|'redeemed_at'|'reversed_at'|'applied_at'|'state_observed',
  at:string|null,meaning:'stored_source_time'|'current_state_observation'|'timestamp_unavailable'};
```

Each kind maps to its same-org source table: ticket→`pos_tickets`, sale_line→`pos_ticket_lines`, payment→`pos_payments` (currency from its admitted parent ticket), booking→`sched_bookings`, booking_product→`sched_booking_products`, booking_status→`sched_booking_status_log`, invoice→`fin_invoices`, accrual→`stk_accruals`, stock_entry/stock_line→`stk_entries`/`stk_entry_lines`, grant/redemption→`pos_package_grants`/`pos_package_redemptions`, correction→`stk_corrections` under its current domain/owner/field policy. No names, descriptions, notes, phone, email, payment metadata or status-log `reason` text is selected. Safe line product identity is `fin_product_id` (DTO `finProductId`); `sched_bookings` and `sched_booking_products` use their `product_id`. Raw source numeric strings and nullable source UOM remain unchanged.

Warning JSON supplies only the persisted code, a validated `draftEntryId` and finite safe item quantities; never the raw message, item names or arbitrary JSON. The pinned ticket path persists `negative_stock`, `no_warehouse`, `repost_pending` and `void_stock_failed`, and passes any `StockError.code` string through unchanged (`pos.service.ts:1100,1120,1146,1184,1336,2444`; `StockWarning.code` is typed `string`). `code` therefore carries the persisted code verbatim when it matches `^[a-z][a-z0-9_]{0,63}$`. A missing or malformed code, or malformed warning JSON, yields `state: 'unavailable'`, `code: null` and the warning's source hash, never parsed private exception text. Classification never depends on a particular warning code; a warning is evidence that posting did not complete as recorded, not a posted issue.

### Booking visit groups

A derived booking group reproduces `visitMembers` (`scheduling-bookings.service.ts:2190–2221`): `metadata.groupId` is a nonempty string per `groupIdOf`, and members are same-org bookings with byte-equal `metadata->>'groupId'` and `resource_id` equal to the anchor booking's `resource_id`. Do not invent `sched_bookings.group_id` or a group table, and never merge bookings that share a `groupId` on different resources. `groupId` is the exact string, at most 256 UTF-8 bytes, with no trimming or case normalization; the ref ID is `<resourceId>/<groupId>` (diagnostic-wire.md). The group hash is SHA-256 of canonical `{resourceId, groupId, memberRows: [{id, rowSha256}]}` sorted by member ID; it is not a physical row hash. Enforce the bounded source count, exact identity/group membership and existing scope. Ticket lines, accruals, classification and projection comparison attach only to the group that contains their booking, so two same-`groupId` groups on different resources never share members, components or captures.

Source rows unavailable through the admission gates are `missing_or_unavailable`, never a zero or empty positive fact. Missing private correction access leaves coverage unknown, not a leaked manifest or guessed clear history.

### Stock entry source decoder

`stk_entries.metadata` is untyped at the pinned source. F1 adds the pure function `decodeStockEntrySource(type: string, metadata: unknown): StockEntrySource` in `scripts/lib/faces-stock-reconciliation.ts`. It is the only way F1 code (diagnostic, mapping unchanged-facts derivation and garment admission) derives an entry's source. Rules, evaluated in order, with every UUID lowercase canonical:

| Metadata shape (pinned writer) | Decoded source |
| --- | --- |
| `type` is `issue`, `source: 'pos'`, `sourceId` UUID; `ticketId`, when present, equals `sourceId` (`createSourcedIssue`, `stock.service.ts:1783–1800`, POS caller `pos.service.ts:1163`) | `{kind: 'pos', id: sourceId}` |
| `type` is `issue`, `source: 'booking'`, `sourceId` UUID (`createSourcedIssue`/`realizeAccruals`) | `{kind: 'booking', id: sourceId}` |
| `type` is `issue`, `source: 'invoice'`, `invoiceId` UUID; `providerRef` is ignored for identity (`stock.service.ts:1915–1925`) | `{kind: 'invoice', id: invoiceId}` |
| `type` is `issue`, `source: 'service'`; optional `sourceId` and `finProductId` UUIDs (`createServiceIssue`, `stock.service.ts:1740–1752`) | `{kind: 'service', id, finProductId}` with absent values null |
| `type` is `receipt`, no `source` key, `purchaseId` UUID (`entry-document.ts`) | `{kind: 'purchase', id: purchaseId}` |
| `type` is `adjustment`, `source` is exactly `repair-opening-balance` or `analyst-reconciliation-2026-08`, `reconciliation: true` (observed in the garment evidence) | `{kind: 'manual_reconciliation', label: source}` |
| `metadata` is `{}` or has no `source`, `sourceId`, `invoiceId` or `purchaseId` key (observed on manual receipts and issues) | `{kind: 'none'}` |
| Anything else, including a known `source` with a missing, non-string or non-UUID ID, a `ticketId` different from `sourceId`, a known `source` on an unexpected `type`, or an unlisted `source` literal | `{kind: 'unknown', metadataSha256}` |

Keys not named in a row (for example `providerRef`, `quantity` or correction provenance keys) are ignored for identity; they still change the entry's row hash. `metadataSha256` is SHA-256 of the entry's `metadata::text` computed in PostgreSQL; raw unknown metadata never enters output. `{kind: 'none'}` is a manual movement with no recorded owner: it participates in totals and true-up review but owns no fulfillment. `unknown` is surfaced in the report: the owning component is unresolved with reason `stock_source_unknown` (diagnostic-wire.md). Every correction path refuses it: mapping preview returns `incomplete_evidence` when any affected entry decodes to `unknown` ([unchanged-facts.md](contracts/unchanged-facts.md)), and garment admission requires the original issue to decode to `{kind: 'pos', id}` equal to the manifest ticket. The existing display helper `entryDocument` is not reused because it maps service, manual and unknown sources alike to null. Adding a newly observed shape is a reviewed contract change, never a decoder fallback.

Graph edges from an entry exist only for `pos` (to `pos_ticket`), `booking` (to `booking`) and `invoice` (to `invoice`); other decoded kinds are values on the `stock_entry` row only.

### Row identity, hashing and ordering

SourceEvidenceRow `ref.kind` maps exactly to `value.kind` and the row ID; graph and ledger references must resolve to the same scoped identities. Physical row hashes use raw PostgreSQL `to_jsonb(row)::text` hashing under UTC, returned as digests only. All rows sort by `ref.kind`/`ref.id` (ledger IDs numerically as `BigInt`); every source row is emitted once. Dates keep PostgreSQL canonical UTC text with 6 fractional digits; grant expiry is `YYYY-MM-DD`, never an invented instant. Count and byte-admit selected text and rows under the source collection limits before materialization. Large or raw warning text is hashed in PostgreSQL, not copied and then redacted.

### Timeline

Timeline emits one row for each timestamp property declared on that source's SourceValue (a null value produces `timestamp_unavailable` with `at: null`). Never query a column absent from that source's schema: ticket has submitted and voided times and no `created_at`; sale_line has no timestamp and gets only `state_observed`; booking_group gets only `state_observed`; booking gets start, end, created and updated; booking_status gets `changed_at`; invoice gets only `state_observed`; accrual gets created, updated, realized and released; stock entry gets created, updated and posted; stock line gets only `state_observed`; grant gets created and cancelled (expiry stays date metadata); redemption gets redeemed and reversed; correction gets applied; payment gets paid. Ledger rows add `posted_at` from MovementEvidence. `state_observed` uses the report observation time and means current state, not a historical transition. Sort known instants chronologically preserving microseconds, then by `ref.kind`/`ref.id`/`field`; null times sort last.

A `booking_status` row with `toStatus: 'completed'` gives the stored time and actor ID of the completion status change; it is the timeline's only completion time. Payment `paid_at` and ticket `submitted_at` never become a booking start or completion, and a booking's `updated_at` never becomes a completion time. A completed status or transition is no proof of physical delivery. Bookings created before status logging started may have no log rows; that is unknown history, not evidence of no transition.

Drafts must be included even with no ledger rows: follow the ticket `stockEntryId`, a safe `stockWarning.draftEntryId`, and the source-owned stock entry lookup through the decoded `pos`, `booking` and `invoice` source identities, with org equality and the original draft lines. A warning's referenced UUID is only a candidate until scoped row admission. Include open, released and realized accruals and original entry states independently; an empty ledger does not drop failed drafts or turn an open expectation into issued stock. Complete typed source facts explain a D1 payment and a D2 scheduled visit without inferring a third event date.

`sourceEvidenceSha256` hashes canonical `{schemaVersion: 1, orgId, sourceEvidence, ledger, graph}`, excluding run, snapshot, observation, path, hint, projection and assertion metadata; the timeline is excluded entirely, so no observation time enters the preimage. The hash binds source facts without circular display assertions, allowing a prior source report and a later private UI capture to refer to unchanged source evidence. Incomplete output sets it to null instead of a false complete digest. Incomplete source evidence and timeline prefixes are labeled incomplete, never terminal totals or positive eligibility.

### Exact projection assertion variant

`DiagnosticEvidenceRef.assertion` is a closed union of `{kind: 'expected_component', component: ExpectedComponent, verifiedByProfileId: UUID, verifiedAt: string}` and:

```ts
type ProjectionAssertion={kind:'projection_comparison',componentKey:string,
  sourceEvidenceSha256:Digest,verifiedByProfileId:UUID,verifiedAt:string,
  observations:{surface:'booking_hover'|'booking_detail'|'pos_ticket_detail'|'stock_movement_list'|'stock_item_ledger',
    source:SourceRef,productId:UUID|null,itemId:UUID|null,warehouseId:UUID|null,
    presence:'shown'|'omitted',qty:string|null,stockUom:string|null,
    observedAt:string,appSourceSha:string|null}[]};
type ProjectionEvidenceResult={referenceId:UUID|null,componentKey:string,
  state:'admitted'|'not_provided'|'unavailable'|'conflicting',
  observations:ProjectionAssertion['observations'],
  reason:'matched_source_capture'|'projection_unverified'|'projection_source_changed'
    |'projection_identity_unavailable'|'projection_conflict'};
```

`projection_comparison` is permitted only on `document`/`owner_attestation` evidence refs, with the same fresh executing real-owner verification and reviewed document digest/`privateRef` rules as diagnostic-wire.md. It has 2–5 observations with distinct `surface` values, each `observedAt` ≤ `verifiedAt` ≤ run observation, and `appSourceSha` null or 40 lowercase hex characters. Captured raw image, HTML or customer text stays private and is not loaded, browsed or fetched by this CLI. Capture/source ownership is an owner attestation, not a hash-generated truth or automatic browser proof. A null source version remains explicitly unverified and cannot establish current deployed code identity.

`componentKey` must resolve to a same-org expected source component; the observation's source, product, item and warehouse must resolve to that component or its admitted ticket/booking/group relationship. Do not fetch foreign or out-of-graph records to make an assertion fit. A shown quantity is a nonnegative plain decimal compared as Q4 (data-model.md) with the actual `stockUom`; omitted has `qty` and `stockUom` null. At least one product or item identity is required, and both when that surface names both; null is not a wildcard. Compare captures only when their resolved canonical component and product/item/warehouse identity agree. An out-of-graph identity yields `unavailable`/`projection_identity_unavailable`; a changed source digest yields `unavailable`/`projection_source_changed`; contradictory admitted owner captures yield `conflicting`/`projection_conflict`. Each forces the case unresolved with the same literal as its Reason. A missing capture yields `not_provided`/`projection_unverified` with `referenceId: null` and `observations: []`. An admitted capture has its reference UUID and `matched_source_capture`; no observed disagreement leaves primary `valid`/`stock_matches_intent`, while the defined discrepancy allows `display_only`/`display_multiplicity_only`.

Admit `display_only` only when canonical stock quantities and keys are otherwise valid, `sourceEvidenceSha256` matches the independently reconstructed current complete source evidence, and at least 2 authorized captured surfaces disagree for the same component: one shows the proven quantity while another omits it or shows a different Q4 quantity. A source already duplicate, missing or wrong-variant cannot be reclassified display-only by an image. Without admitted comparison, stock-matching source remains `valid` with reason `stock_matches_intent` and explicit `projection_unverified`; do not assert a display defect from a `privateRef` alone. Other unresolved facts keep their precedence. Mixed component findings use the literal `mixed_discrepancies`.

### Output ordering and size

Emit projection results by `componentKey`, then nullable `referenceId` (null first); each admitted ref has one result, and a component with no capture has one `not_provided` row. `warning.items` has at most 1,000 distinct admitted item IDs under the shared total-ID/byte budget; no raw warning item or name is copied. The timeline run observation uses canonical UTC with 6 fractional digits (pad a millisecond observation with three zeros; never truncate a stored microsecond). Every SourceValue status, method, code and source string is at most 256 UTF-8 bytes and keeps its stored value; unsupported source semantics make the component unresolved rather than a fabricated status. Any exceeded source collection, text or output limit uses the incomplete/no-total behavior.

### Tests

Tests extend the existing pure, CLI and eight native behaviors, with no ninth name: D1 positive payment and later D2 booking/source update; failed draft with no ledger; open versus released versus realized accrual and nullable actuals; safe warning/draft linkage, including a passed-through `StockError` code and a malformed warning; group metadata, not a group column; same org, two resources, same `groupId`, proving separate membership, distinct refs and hashes, and no cross-visit classification or projection match; completion status-log row with `changed_at` versus a booking with no log rows; grant/redemption reversal; unknown timestamps; forbidden PII, status-log reason and raw warnings absent. Decoder unit vectors cover every table row above, each observed evidence shape (POS with `ticketId`, `repair-opening-balance`, `analyst-reconciliation-2026-08`, `{}`), mismatched `ticketId`, non-UUID `sourceId`, invoice without `invoiceId`, a known source on the wrong type and an unlisted literal. The positive display-only vector supplies two strict source-bound owner captures; missing, unverified, changed-digest, foreign and contradictory captures never prove it. Assert that real output strict-decoder roundtrips all required source, timeline and projection fields, chronological versus state-observed meaning, source hash stability across run metadata changes, and unchanged captures distinct from source mutation. No browser or source mutation is part of the diagnostic.

### Review artifact: contracts/unchanged-facts.md

## Exact mapping-only unchanged-facts fingerprint

This defines `MappingManifestV1.unchangedStockPaymentSha256` and its before/after invariant. It is a bounded affected-source fingerprint plus a writer-boundary assertion, not a claim that every unrelated organization record was inventoried or frozen.

### Fixed key-set derivation in the owning transaction

Start with the exact M/L product IDs and old/new stock item IDs already validated by `MappingState`; each set has 2 distinct same-org UUIDs. Collect every same-org `stk_bins` key for those item IDs and every same-org `stk_ledger` row for those items, including keys that exist only in ledger and negative/reversal rows; a bin/latest-ledger mismatch is an integrity failure, not omitted evidence. Collect every entry ID referenced by that ledger and every line of those entries, not merely lines for the changed pair. Each entry's source is decoded only by `decodeStockEntrySource` in [source-explanation.md](contracts/source-explanation.md), section Stock entry source decoder, never from arbitrary metadata text. If any collected entry decodes to `{kind: 'unknown'}`, the key set is incomplete and preview returns blocked `incomplete_evidence` with no executable preview; apply refuses.

Ticket IDs are the union of decoded `pos` source IDs of those entries, exact census POS source IDs and all same-org `pos_ticket_lines` whose `fin_product_id` is either admitted product. Booking IDs are the union of decoded `booking` source IDs, census booking IDs and non-null `booking_id` on those admitted ticket lines. Expand only through `pos_ticket_lines.booking_id` in the admitted booking IDs, joining `pos_ticket_lines.ticket_id = pos_tickets.id` with both `org_id` predicates; no name/date/amount guessing. All involved ticket lines are included. Invoice IDs are the union of decoded `invoice` source IDs, non-null `invoice_id` on those bookings and every same-org `fin_invoices` row matching a nonempty involved `ticket.invoice_provider_ref` by exact `provider_ref` bytes, keeping ambiguous/provider duplicates in the set rather than choosing one. Decoded `service`, `purchase`, `manual_reconciliation` and `none` sources add no family expansion; their entry and line rows are still hashed. A foreign or broken typed reference is integrity/unavailable, never silently empty. No recursive whole-organization graph expansion beyond these explicit families.

Bounds: at most 1,000 distinct entries, tickets, bookings and invoices per family; 1,000 item/warehouse keys; 50,000 ledger rows; 10,000 rows per remaining selected table; and 20,971,520 UTF-8 bytes of source row JSON in aggregate across all selected rows. Scan limit+1; overflow, timeouts, missing schema or inconsistent references fail incomplete before executable preview or any mapping mutation. These are chosen limits, not performance claims. Reuse the F1 snapshot budget in [report.md](contracts/report.md) (60 s total, 12 s statement, 1 s lock). The same complete key predicates apply to count, hash, materialization and apply's fresh comparison; no capped list wrapper or post-hash row omission.

### Exact table, row identity and field projection

The closed unchanged set is:

| Table | Exact admitted rows | Canonical key tuple |
|---|---|---|
| fin_products | the two approved M/L product UUIDs | [id] |
| stk_items | the two old/new approved stock item UUIDs | [id] |
| stk_bins | union affected item/warehouse keys, including absent-key witness in scope | [item_id,warehouse_id] |
| stk_ledger | all ledger rows for the two item IDs, not only latest | [id::text] (see [data-model.md](data-model.md), Ledger identity) |
| stk_entries | every affected ledger entry ID | [id] |
| stk_entry_lines | all lines of those entries | [id] |
| pos_tickets | exact expanded ticket IDs | [id] |
| pos_ticket_lines | all lines on expanded ticket IDs | [id] |
| pos_payments | all rows with ticket_id in expanded ticket IDs | [id] |
| sched_bookings | exact expanded booking IDs | [id] |
| stk_accruals | source='booking'/source_id in booking IDs or realized_entry_id in affected entry IDs | [id] |
| fin_invoices | exact expanded invoice IDs | [id] |
| fin_invoice_items | invoice_id in expanded invoice IDs | [id] |
| fin_payments | invoice_id in expanded invoice IDs | [id] |
| pos_client_ledger | ticket_id in ticket IDs or booking_id in booking IDs | [id] |

Every predicate also has `org_id = ctx.tenantId`, and joins assert the same org on both sides. A row reached by more than one path is included once, by (table, key); contradictory identities or hash values are an integrity failure. All source columns participate in that row's hash, including nullable values, numeric spelling, timestamps, metadata and lifecycle/payment fields; do not select a developer-chosen subset that could omit a payment or stamp change.

`sched_booking_status_log` is deliberately outside this set: every pinned status-log insert (`scheduling-bookings.service.ts:577,1117`) happens in the same transaction as an insert or status/`updated_at` update of the `sched_bookings` row, which is already hashed. The diagnostic still reads the log as source evidence ([source-explanation.md](contracts/source-explanation.md)).

Compute `rowSha256` inside PostgreSQL as lowercase hex `SHA256(convert_to(to_jsonb(the_actual_row)::text, 'UTF8'))`, under `SET LOCAL TIME ZONE UTC`, with the qualified builtin `sha256(bytea)`. First count `octet_length` of that same row expression under the same scope and budget. Do not send raw financial/customer JSON to the CLI to compute this hash: query only the canonical key and row digest. The field projection is PostgreSQL's `to_jsonb(row)` over all source columns, not a re-emitted JavaScript object. Source schema and candidate identity are qualified and manifest-bound; a new source column changes the row hash rather than being silently excluded. No arbitrary caller relation or SQL path is accepted.

The mapping-only mutable tables `stk_consumption`, `stk_corrections` and `doc_audit_log` are deliberately outside this unchanged set: their exact admitted mapping diff, operation and audit are separate reviewed effects. The mapping writer performs no ledger, bin, payment or source-record UPDATE/INSERT/DELETE. Assert that the SQL writer trace contains only the one recipe delete plus new insert, one completed correction insert and one audit insert, with no stock event. This guards against a side effect outside the bounded unchanged set without pretending unrelated records were hashed.

### Hash preimage and comparison

`unchangedStockPaymentSha256 = SHA256(canonical UTF-8 {schemaVersion: 1, orgId, scope: {productIds, itemIds, binKeys, entryIds, ticketIds, bookingIds, invoiceIds}, tables: [{table, rows: [{key, rowSha256}]}]})`. Object keys follow F3 sorted-key canonical JSON; the table array, UUID sets and key sets sort lexicographically, and ledger keys sort numerically as `BigInt` ascending, never as `Number` or lexicographic strings. Empty table arrays are explicit; absence witnesses include bin keys with no bin row, so an inserted key changes the set. Identical reached rows are included once. Intermediate row lists are bounded internal evidence, not manifest fields; the manifest stores only the final digest.

Preview computes this in its own repeatable-read, read-only snapshot. Apply recomputes the complete key sets and hash after its stock-v1 gate, policy-coordinator gate, source and authority admission ([report.md](contracts/report.md), Gate terms) and requires exact equality to the approved manifest before mutation; it then recomputes after the selected recipe, receipt and audit writes and requires equality before commit. Both correct and compensate enforce this invariant. A difference or a new/missing row aborts the whole mapping operation. Numeric diagnostic tolerances never compare these hashes. The digest proves those admitted source facts, while the no-other-DML test proves this writer did not mutate unrelated facts; it does not assert that all concurrent unrelated organization payments were frozen.

### Tests

Tests in the existing pure, owning-service and eight native behavior files cover: duplicate provenance paths counted once; absent-bin witness; ledger-only/bin-only mismatch; extra same-ticket non-garment line; changed payment `amount`, `method`, `tendered`, `paid_at`, `shift_id` or `metadata`; ticket financial/stamp change; booking date/status; accrual quantity/value; invoice/provider duplicate path; decoded invoice-source entry; source metadata change; an affected entry whose metadata decodes to `unknown` (blocked preview); all limit+1 boundaries; ledger IDs above `Number.MAX_SAFE_INTEGER`; and forbidden DML outside the admitted set. Each relevant change produces a different digest or an explicit incomplete/integrity outcome. Correct plus inverse mapping keeps this digest identical within each operation even though new operation, audit and recipe identities change.

Schema regression uses the pinned `pg-pos-schema.ts` column `fin_product_id` and table `fin_invoices` (plural): an M/L sale with no linked ledger entry is still reached through that product column, and its ticket, all lines and payments enter the digest. Duplicate provider paths include all same-org invoice matches once. `product_id` is not a `pos_ticket_lines` column.

### Review artifact: quickstart.md

## Quickstart and validation: FACES stock reconciliation

### Draft evidence already checked

From meta root, read-only source commands:

```bash
git -C .local/faces-followups-2026-11-16/hub-source rev-parse HEAD
node scripts/repo-policy.mjs show hub
rg -n 'resolveIssueLines|postTicketStock|previewTicketRepost|repostTicketStock' .local/faces-followups-2026-11-16/hub-source/src/server/services/pos.service.ts
rg -n 'readOnly|planOrg|read-only|finally' .local/faces-followups-2026-11-16/hub-source/scripts/repair-service-sale-stock.ts
```

Expected pinned source `c6c2d5739572356239c4048c0f564f40b0768adc`; registry Bun/master; existing mechanisms visible. These checks do not reproduce the meeting defect. The sanitized live read snapshot is linked in research; never print raw named customer rows.

### Implementation prerequisites (pending)

Owner approval of the data spec and completed EGM review (state: [spec.md](spec.md) Status), isolated Hub checkout/draft PR, current-source drift review and private synthetic case manifest. Read `AGENTS.md`, `CLAUDE.md`, `docs/qa-stack.md` and inspect `bun run qa:status` before using an existing QA stack. Keep production credentials out of QA; install only the repository's Bun dependency lock. Do not execute seeds/schema-push/old repair scripts against production.

### Focused tests (commands become valid after S1 files exist)

```bash
bunx vitest run scripts/lib/faces-stock-reconciliation.test.ts scripts/faces-stock-reconcile-2026-11.test.ts
## existing suites, run unchanged as regression support:
bunx vitest run src/server/services/stock-accruals.service.test.ts src/server/services/stock.sourced-issue.test.ts src/server/services/scheduling-bookings-accrual.test.ts src/routes/api/scheduling/bookings/_handlers.test.ts 'src/routes/api/scheduling/bookings/[id]/complete/server.test.ts'
bunx vitest run scripts/repair-service-sale-stock.test.ts
```

Synthetic oracles: six distinct classification outcomes; ambiguous match cannot be eligible; repeated joins cannot multiply ledger sums; one ticket with three bookings does not become three sale issues; reversals net correctly; explicit empty consumption differs from lost expectation; ledger-only/bin-only keys produce an integrity finding; warning plus completed status is not posted; every stock entry source decoder vector in contracts/source-explanation.md decodes as specified; two same-`groupId` bookings on different resources form two groups; ledger IDs above `Number.MAX_SAFE_INTEGER` keep exact order. All tests use synthetic fixtures. Existing service tests are regression support, not a full production reconstruction.

After implementation, on qualified loopback QA with disposable data only:

```bash
bun run faces:stock:diagnose --org "$FACES_QA_ORG_ID" --case-manifest "$FACES_PRIVATE_CASE_MANIFEST" --output "$FACES_PRIVATE_REPORT_PATH"
```

This proposed command is not installed yet. QA scope ID is a synthetic tenant, not a hardcoded production org. The script must verify loopback target for this scenario and `transaction_read_only=on`. Run twice with unchanged fixtures and require byte-identical run-stable projections as defined in [contracts/diagnostic-wire.md](contracts/diagnostic-wire.md), section Run-stable comparison projection. Verify no table/state changed through independent before/after hashes. Inject timeout, role loss, invalid tenant and duplicate-provenance fixtures; expected exit/error contracts are in `contracts/report.md`. Output files are private mode 0600.

### Later prevention / repair validation

After the selected contracts and owner gates are satisfied: reproduce the exact failure first, run the D1→D2 matrix in plan and real PostgreSQL concurrency for any new writer invariant. Rehearse approved corrections twice on disposable restored fixtures; perform compensation in `finally`; independently check originals, signed totals, values, COGS, full-key bin/ledger equality and unchanged payments/other tenants. Test interruption between cancel and repost, post-commit audit failure, stale manifest and unknown commit. The bounded garment preview/apply command is specified in contracts/repair.md; no apply is authorized until its listed gates pass. Execute scripts/lib/faces-garment-repost.test.ts and scripts/faces-garment-repost-2026-11.test.ts plus F3 native atomic correction suites after implementation. Unknown service cases have no garment-writer escape hatch.

### Required qualification

```bash
bun run check
bun run test
bun run build
```

Expect zero errors/warnings, zero test failures and clean build subject only to documented optional-peer notices. If later work adds UI/API/nav, amend the spec for design-token governance, `bun run lint:design && bun run lint:tokens`, Paraglide, RBAC/owner/field masking and route manifest; browser checks use browser-harness on local QA. Owner merge, deployed SHA and post-deployment case verification are separate pending gates.

### Reported-case pair oracle

Synthetic counterpart includes exactly two separate M-sale/single-L-issue cases and one older case with later manual movements. Qualify both reported cases independently; keep the older case ineligible while coverage is unresolved. After first correction, a second manifest from the original shared-bin snapshot must fail stale; generate/approve a fresh manifest before its apply. Two quantity 1 transformations change the recorded M 19/L 8 example to M 17/L 10 only as derived net effects, never by balance overwrite.

### Native admission and full-lane proof

F7's shared operator/principal READ ONLY parity suite and F3's shared transaction/receipt suite must pass before F1 writer qualification. Add `src/server/services/faces-stock-reconciliation.sql.integration.test.ts` exactly once to `NATIVE_POSTGRES_MANIFEST['qa-native']` in `scripts/qc/native-postgres-manifest.ts`, minimumAssertions=8 and these exact requiredBehaviors (describe("FACES stock cutover against PostgreSQL") plus it names):

- `FACES stock cutover against PostgreSQL diagnostic and both previews keep the same read only principal snapshot and never call a writer`
- `FACES stock cutover against PostgreSQL duplicate joins and mixed discrepancies cannot create an eligible garment repair`
- `FACES stock cutover against PostgreSQL mapping waits for the prior poster and the next poster resolves the corrected M item`
- `FACES stock cutover against PostgreSQL persisted old M draft or open accrual refuses mapping and leaves every record unchanged`
- `FACES stock cutover against PostgreSQL mapping receipt audit and recipe commit atomically and repeat without writes`
- `FACES stock cutover against PostgreSQL two garment cases require a fresh approved second manifest after shared bins change`
- `FACES stock cutover against PostgreSQL stale unauthorized foreign and numeric out of range cases produce no repair effect`
- `FACES stock cutover against PostgreSQL lost response recovers the same immutable operation and finally compensation preserves the ledger trail`

Preserve all existing lane entries/lane count; update manifest/report validator tests. Ordinary Vitest excludes this SQL file. Reuse F3's marked disposable fixture/real Drizzle/app_ledger org-GUC/RLS setup and actual gate/helper functions, not reimplemented SQL or mocked locking. Use openDisposablePostgres from scripts/qc/disposable-postgres.ts: MINION_QC_DISPOSABLE=1, loopback explicit port, minion_qc owner/minion_qc_* database and actual minion-360-disposable:v1 marker before DDL. Create only the unique owned child database `minion_qc_faces_stock_<32hex>` using F7's qualified controller recipe, validate its exact generated name, set/requalify its actual marker, and seed isolated synthetic contacts/products/sources/stock/operations/audit. Before public authority policies, apply F7's canonical child-local auth schema/users/uid/owner/ACL/FK seed prerequisites; preserve baseline table ACL/RLS. Apply the real F7 authority bridge migration `20261116190000_operator_authority_bridge.sql`, then F3 correction storage migration `20261116193000_stock_corrections.sql`. All competing backends use this same child and actual source helpers with affirmative lock-wait barriers. A search-path-only schema cannot isolate the public-qualified bridge. Never fall back to an application pool or .env.local. Release barriers, close all child clients and drop only the recorded validated child database through its admitted controller in finally, with no shared stack reset. Full qa-native also needs its separately owned full-schema QA URL and explicit guards.

After qualifying private F1_DISPOSABLE_DATABASE_URL and F1_FULL_SCHEMA_QA_URL from owned local fixtures, run on the future isolated Hub candidate:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$F1_DISPOSABLE_DATABASE_URL" HUB_TEST_DB_URL="$F1_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-stock-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/faces-stock-qa-native.json
```

Do not filter that qualification invocation: the report validator requires every admitted file and exact behavior, zero skips/todos/failures. Record focused development runs separately. Native success proves the candidate fixture only; verified writer rollout/drain and exact manifest approval remain production-apply gates. Numeric tests assert inclusive boundary and one decimal step beyond it under data-model.md; no passing tolerance admits changed fingerprints or unknown intent. These are future commands, not executed product checks.

Fixture ownership is explicit: the full qa-native controller remains its exact CI pgvector 0.8.6/minion_qc_vectors contract and the independently owned full-schema QA target remains admitted for the other suites. This feature creates only its named isolated child. Child fixture/bootstrap code follows F7 authority-bridge/native prerequisites and F3 source fixture definitions; no extra app_ledger org/profile/member grants or fake permission verdicts. Deployment/production writes are not performed by native setup.

The exact [shared native auth prerequisite](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md) is mandatory. Reuse F7-owned `src/server/test-utils/operator-native-auth-fixture.ts`: call installOperatorNativeAuthFixture(owner,expectedOwnedChildIdentity) before public profile/FK/policy DDL, seed synthetic auth.users before profiles with non-null email, then call assertOperatorNativeAuthFixture after source fixture DDL/seed. Preserve its actual controller/child identity, auth.uid owner/invoker/JWT/ACL/catalog and baseline-denial proofs. This test helper neither authenticates GoTrue tokens nor creates a runtime dependency on another feature writer.

Run the new ordinary owning-service suite explicitly after implementation: `bunx vitest run src/server/services/faces-garment-mapping.test.ts scripts/lib/faces-garment-mapping.test.ts scripts/faces-garment-mapping-2026-11.test.ts`. Qualify the new garmentMapping typed closed loader key and actual package smoke before any mapping write.

Native exact-count prerequisite: consume [F7 native-exact-count](../128-faces-receivables-audit/contracts/native-exact-count.md). This feature registers its new native file with exactAssertions:true, minimumAssertions=8 and exactly the 8 required names. The F7-owned qualified report implementation enforces equality for opted-in rows; the pinned pre-change report only enforced a minimum. Preserve all legacy rows and their default `exactAssertions: false` behavior. F7 alone owns the common manifest/report flag implementation and negative tests; this slice registers its own file after that dependency qualifies.

Validate the closed input/output vectors from contracts/diagnostic-wire.md in the existing pure/CLI/native suites: all complete/integrity/incomplete variants, date/reference/owner assertion bounds, withheld hint hash, current stock labels, unknown-versus-zero and incomplete-prefix no totals. No additional executable or test runner.

Validate the source explanation vectors from contracts/source-explanation.md (D1/D2, off-ledger drafts, booking groups, status log, decoder, capture roundtrip) in the same pure/CLI/native suites. A garment preview/apply rehearsal also exercises the stock-denomination qualification cases listed in contracts/repair.md.

### Review artifact: tasks.md

## Tasks: FACES fulfillment stock reconciliation

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/*.md`, `implementation-inventory.md`, `quickstart.md`.

**Status**: Planned; zero tasks completed. Review and approval state is the Status line of [spec.md](spec.md). Paths below are Hub-relative unless prefixed `specs/` or `audits/` (meta-repo-relative). All execution evidence goes under `audits/2026-11-16-faces-followups/F1/`; it is synthetic or sanitized, with no PII or credentials.

**Tests**: Required by FR-012; write a failing synthetic reproduction before any prevention change. Do not count source inspection as product test execution.

### Phase 1: Setup

- [ ] T001 Record owner spec approval, EGM outcome and current-source drift assessment in `specs/122-faces-stock-reconciliation/plan.md`; block product implementation until approved.
- [ ] T002 Create isolated Hub feature branch/draft PR against verified registry `master` and record checkout/source/PR in `specs/122-faces-stock-reconciliation/plan.md`; preserve shared WIP.

### Phase 2: Foundational

- [ ] T003 Implement the strict decoders and types of contracts/diagnostic-wire.md and contracts/source-explanation.md in `scripts/lib/faces-stock-reconciliation.ts`: DiagnosticManifestV1, ReconciliationReport, CaseRow, components, secondaryFindings and numericChecks; SourceEvidenceRow/SourceValue (including `booking.resourceId`, `booking_group` as `<resourceId>/<groupId>`, `booking_status`, `invoice` and the raw bounded warning `code`), TimelineRow (including `changed_at`), `sourceEvidenceSha256`, ProjectionAssertion/ProjectionEvidenceResult, the Reason union with `stock_source_unknown`, and the run-stable comparison projection; apply the ordered decision table in contracts/report.md; no automatic eligibility for incomplete or mixed evidence.
- [ ] T004 Add the three package.json CLI entrypoints and the F7 shared Vite SSR bootstrap dependency from contracts/report.md, then implement CLI scope/manifest/read-only guards and private output handling in `scripts/faces-stock-reconcile-2026-11.ts`: unique nonempty `caseKey` of at most 100 characters, validated UUIDs, mode 0600 files, explicit org, no apply flag, token verification and read-only admission per contracts/report.md Shared principal and snapshot admission, and the finance field-tier cost authority in contracts/report.md Cost authority; never call a `FOR SHARE` resolver inside a read-only transaction.
- [ ] T005 Write and pass guard-contract tests in `scripts/faces-stock-reconcile-2026-11.test.ts` for missing/invalid scope, wrong tenant, invalid/expired/foreign token, role/read-only loss, schema/timeout failure, redacted errors, no calls to writers, ordinary owner/custom-role success with stock field tier 0 and sufficient finance authority, and finance-view/tier/module denial.
- [ ] T024 Implement `decodeStockEntrySource` in `scripts/lib/faces-stock-reconciliation.ts` exactly as the table in contracts/source-explanation.md, section Stock entry source decoder, and add its unit vectors to `scripts/lib/faces-stock-reconciliation.test.ts`: every table row, the observed POS-with-`ticketId`, `repair-opening-balance`, `analyst-reconciliation-2026-08` and `{}` shapes, mismatched `ticketId`, non-UUID `sourceId`, invoice without `invoiceId`, a known source on the wrong entry type and an unlisted literal (decodes to `unknown` with a hash, no raw metadata in output).

### Phase 3: US1 — Explain discrepancies (P1, MVP)

**Goal**: Produce a complete read-only report or explicit incomplete/unresolved result.

**Independent test**: One synthetic set yields duplicate, missing, variant mismatch, display-only, valid and unresolved classifications with canonical ledger sums and zero writes.

- [ ] T006 [P] [US1] Add classification/multiplicity tests in `scripts/lib/faces-stock-reconciliation.test.ts` including one ticket with three bookings, shared recipe item, reversals, prior true-up, unknown historical mapping, explicit empty consumption, mixed duplicate+variant, partial missing component, unknown+valid component, an affected movement whose source decodes to `unknown`, same org/two resources/same `groupId` (separate membership, distinct refs and hashes, no cross-visit classification or projection match), the source-explanation D1/D2, draft, accrual, warning, status-log and capture vectors, and the data-model numeric-boundary and large-ledger-ID fixtures.
- [ ] T007 [US1] Implement canonical ledger-ID deduplication, separate provenance graph, signed totals and fail-closed classification in `scripts/lib/faces-stock-reconciliation.ts`; apply the classification precedence and BigInt decimal/tolerance policy from contracts/report.md and data-model.md; preserve raw numeric evidence and unresolved values rather than substituting zero.
- [ ] T008 [US1] Query bounded same-org POS/payments/bookings/booking groups (resource-qualified, as `visitMembers`)/booking status log/booking products/grants/redemptions/accruals/entries/ledger/mappings/adjustments/invoices within one verified read-only snapshot in `scripts/faces-stock-reconcile-2026-11.ts`, filling the contracts/source-explanation.md source evidence and timeline; select ledger IDs only as text per data-model.md Ledger identity; use `pos_ticket_lines.fin_product_id` and `fin_invoices`; decode entry sources only with `decodeStockEntrySource`; join party identity privately where attendee-name matching fails.
- [ ] T009 [US1] Add full-union latest-ledger/bin-key comparison and evidence-completeness reporting to `scripts/lib/faces-stock-reconciliation.ts`; detect missing bins and orphan bins as well as differing quantities/rates.
- [ ] T010 [US1] Rehearse report twice against synthetic loopback QA and capture no-write hashes, classifications and error scenarios in `audits/2026-11-16-faces-followups/F1/qa-diagnostic.json`; require byte-identical run-stable projections (contracts/diagnostic-wire.md).
- [ ] T011 [US1] After target-qualified read-only admission, reconcile reported private cases and seven overlap candidates into `audits/2026-11-16-faces-followups/F1/reconciliation-summary.md`; avoid PII and never sum repeated ticket aggregates as separate issues.

**Checkpoint**: Diagnostic MVP can ship independently. No writer or historical correction follows automatically.

### Phase 4: US2 S2a — Verified Faja M mapping correction (P1, owner-gated)

**Goal**: Correct the verified M product recipe from the L item to the M item.

**Independent test**: Synthetic Faja M mapping regression, gated cutover and repeat no-op; payment facts and correct counter sale behavior unchanged.

- [ ] T012 [US2] Approve the S2a Faja M mapping correction manifest (L item → M item), atomic replacement/cutover/recovery policy and tests in `specs/122-faces-stock-reconciliation/contracts/mapping-correction.md` and `contracts/mapping-envelope.md`.
- [ ] T013 [US2] Add the synthetic Faja M mapping and total-0 product regression in `scripts/lib/faces-garment-mapping.test.ts`; synthetic fixtures only.
- [ ] T014 [US2] Implement the approved dry-run-default mapping CLI in `scripts/faces-garment-mapping-2026-11.ts`, the pure strict input/hash plan in `scripts/lib/faces-garment-mapping.ts` and the owning correct/compensate preview/apply/status in `src/server/services/faces-garment-mapping.service.ts` per contracts/mapping-envelope.md; add `src/server/services/faces-garment-mapping.test.ts`, the `garmentMapping` typed loader key in the F7-created `scripts/lib/operator-service-loader.ts` and its case in the F7-created `scripts/operator-bootstrap.smoke.ts`; compute `unchangedStockPaymentSha256` per contracts/unchanged-facts.md using `decodeStockEntrySource` (blocked `incomplete_evidence` on an `unknown` source) and text ledger IDs; compare exact old recipe/bridge/component state, preserve the L mapping, require the no-op receipt and approved target/digest, and use the write gate pair and fresh old-M draft/open-accrual census refusal in contracts/mapping-correction.md. Status is read-only and takes no gate; the gate-held census belongs only to apply. Test the finance field-tier admission and denials of contracts/report.md Cost authority. Block apply without the qualified protocol/deployment evidence.
- [ ] T016 [US2] Admit `src/server/services/faces-stock-reconciliation.sql.integration.test.ts` exactly once to qa-native with the eight requiredBehaviors and minimumAssertions in quickstart, then run the full native lane/report validator for PostgreSQL cutover/atomicity tests and capture invocation/results in `audits/2026-11-16-faces-followups/F1/concurrency.json`; no mocked-only concurrency claim and no ninth behavior.

### Phase 5: US2 S2b — Additional proven prevention (conditional, amendment-gated)

**Goal**: Fix an additional code defect only if S1 proves one.

**Independent test**: Local failing reproduction followed by the D1→D2 matrix in plan.md; payment facts and correct counter sale behavior unchanged.

Skip this phase entirely, and record that result in `audits/2026-11-16-faces-followups/F1/reconciliation-summary.md`, unless T011 proves an additional defect and the owner approves a reviewed S2b design amendment naming the failing transition, writer, files and tests (plan.md S2b).

- [ ] T025 [US2] Under the approved S2b amendment only: add the failing advance-payment/package/product/garment/split-payment reproduction in `src/server/services/stock-accruals.service.test.ts`, `src/server/services/scheduling-bookings-accrual.test.ts` and the existing POS stock test files the amendment names; synthetic fixtures only.
- [ ] T015 [US2] Under the approved S2b amendment only: qualify single/group/gateway completion, draft retry with changed payload, explicit empty consumption, cancel/no-show/reschedule/void and package-right preservation in `src/routes/api/scheduling/bookings/_handlers.test.ts` and `src/routes/api/scheduling/bookings/[id]/complete/server.test.ts`, plus the amendment-named integration tests.

### Phase 6: US3 — Approved known-garment correction (P2, F3 dependency and owner gates)

**Goal**: Apply only reviewed and approved changes with recovery and repeat invariants.

**Independent test**: Exact synthetic manifest applies once, repeats as no-op and recovers authoritatively after interruption/unknown result.

- [ ] T017 [US3] Qualify the selected `specs/122-faces-stock-reconciliation/contracts/repair.md` against the current case and the independently approved F3 atomic service contract; confirm true-up coverage, actor/period/target and exact frozen single-ticket manifests for POS-00092/00098 before writer implementation; keep the older POS-00059 ineligible without true-up coverage proof.
- [ ] T018 [US3] Create the private fingerprinted manifest and sanitized before/after report at `audits/2026-11-16-faces-followups/F1/repair-plan.json`; require exact IDs, org/target, approved plan digest, signed qty/value/COGS deltas, the owner-attested `StockValuationQualificationV1` and unchanged payment facts.
- [ ] T019 [US3] Implement `scripts/faces-garment-repost-2026-11.ts`, pure validator `scripts/lib/faces-garment-repost.ts` and their tests using the qualified F3 `stock_only` atomic engine: freeze the original L issue and transform only the approved M quantity, never regenerate unrelated ticket recipes; require the original issue to decode to `{kind: 'pos'}` for the ticket; require exact Q4 equality of frozen L and replacement M quantities independently of `planRepost`'s tolerance; import F3 `StockValuationQualificationV1` with its validation/hash/receipt/inverse/current-reader cases from contracts/repair.md; test the finance field-tier admission and denials of contracts/report.md Cost authority. Do not create a second ledger writer or invoke the old service-repair script.
- [ ] T020 [US3] Rehearse apply twice, stale-state refusal, cancel→repost interruption, post-commit audit failure, unknown-outcome reads and compensation in `finally` on disposable QA, using F3 garment-envelope.md `action=compensate` with a fresh own receipt, manifest and key: the equal-rate fixture restores economic state, and the unequal-rate fixture discloses the actual cost delta without claiming rollback; save the invariant receipt at `audits/2026-11-16-faces-followups/F1/repair-rehearsal.json`.
- [ ] T021 [US3] Obtain explicit owner exact-manifest/target apply approval and owner merge, then record the executed operation, deployed SHA where relevant, latest ledger/bin checks, unchanged unrelated records and second-run no-op in `audits/2026-11-16-faces-followups/F1/repair-receipt.json`; stop on drift or unknown commit. Refresh and re-approve each subsequent shared-bin case rather than reuse pre-first-operation fingerprints.

### Phase 7: Polish and release qualification

- [ ] T022 Run required `bun run check`, `bun run test`, `bun run build` and independent implementation review; save exact candidate hashes/results in `audits/2026-11-16-faces-followups/F1/validation.json` and record owner merge/deployment/runtime status separately.
- [ ] T023 Update `specs/122-faces-stock-reconciliation/quickstart.md` and the existing proposal ledger with evidence and any remaining gaps; add exact-site `TODO(handoff)` only for actual implementation open ends, preserving unrelated code.

### Dependencies and execution order

T001→T002→foundation T003–T005 and T024→US1 T006–T011. T006 can run independently of query implementation once report types are defined.

- S2a (T012–T014, T016) depends on US1 evidence for the mapping, owner approval of this spec and the S2a manifest, F7 qualification and F3 write-protocol qualification.
- S2b (T025, T015) runs only if T011 proves an additional defect and its amendment is approved; otherwise it is recorded as not needed.
- US3 (T017–T021) depends on US1 attribution, the applied S2a mapping correction and its durable receipt (T014 apply), qualified F3 atomic service, the selected garment contract and exact owner approval. It depends on S2b only when the S2b amendment names a defect on the garment issue path.
- T022 applies to every implementation slice, not only after all repairs. T023 closes each delivery handoff.

Cross-item ordering with F2 and F3 is stated once in plan.md, Cross-item execution ordering.

### Parallel examples

- US1: synthetic classifier test authoring T006 may proceed while the read-only query adapter T008 is developed after foundation; these touch distinct files. T024, canonicalization T007 and integrity T009 share a file and are sequential.
- S2a/S2b: after T012, S2a mapping tests and any approved S2b fixture tests touch distinct files. Do not parallel-edit the same stock writer; database concurrency tests follow the chosen mechanism.
- US3: after T017, independent manifest review and synthetic fault-fixture preparation may proceed, but writer execution and target approvals are sequential.

### Implementation strategy

MVP is US1 alone after approval: a bounded explanation without mutation. The verified M mapping and garment repair use selected contracts; implementation remains gated by owner approval, fresh attribution/true-up evidence and F3 qualification. Any additional unproven timing defect remains a separate evidence-bound amendment; no unspecified historical writer is described as ready. Every shipped slice receives focused tests, full Hub gates, independent review, owner merge and its own evidence. No production action or completed task is implied by this list.

### Review artifact: checklists/requirements.md

## Specification Quality Checklist: FACES stock reconciliation

**Purpose**: Validate specification completeness and quality before planning. **Created**: 2026-11-16. **Feature**: [spec.md](spec.md).

### Content Quality

- [x] No implementation details in user requirements; source anchors are evidence required by constitution II.
- [x] Focused on user value and business needs.
- [x] Written for non-technical stakeholders in scenarios/outcomes.
- [x] All mandatory sections completed.

### Requirement Completeness

- [x] No unresolved requirement-placeholder markers remain; case identity and approval are explicit investigation outputs/gates.
- [ ] Requirements are testable and unambiguous. Left for the independent reviewer.
- [x] Success criteria are measurable.
- [x] Success criteria are technology-agnostic.
- [x] All acceptance scenarios are defined.
- [x] Edge cases are identified.
- [x] Scope is clearly bounded.
- [x] Dependencies and assumptions identified.

### Feature Readiness

- [x] All functional requirements have clear acceptance criteria.
- [x] User scenarios cover primary flows.
- [x] Requirements define measurable, verifiable outcomes in Success Criteria; implementation and reconciliation remain pending.
- [ ] No implementation design leaks into the desired-behavior requirements. Left for the independent reviewer.

### Validation notes

Author check, 2026-11-16: every functional requirement and success criterion was compared against the AS-IS evidence and DELTA table; source facts and timestamped observations are kept separate from cause hypotheses. No duplicate fulfillment is claimed proven. A ticket-versus-stock variant mismatch and current incorrect recipe are verified in the sanitized meeting-case snapshot. Seven overlap rows across five tickets are candidate joins, not seven independent deductions. Internal bin agreement is not physical proof.

This checklist evaluates requirements quality, not implementation, EGM, owner approval, merge or runtime evidence. Review and approval state is the Status line of [spec.md](spec.md). The verified mapping and known garment historical repair have selected contracts; F3 atomic primitives and fresh case/true-up evidence are explicit dependencies. Unproven other service defects are not given speculative writer designs.

### Review artifact: implementation-inventory.md

## Exact implementation inventory — 122-faces-stock-reconciliation

Future Hub-relative actions, not product changes made during authoring. Create paths are absent at the pinned baseline; if the same selected file exists on the implementation candidate, extend that file rather than fork a duplicate. Dependency-created files are explicitly labeled. No Delete action or new package dependency is selected.

| Action | Exact file | Selected responsibility / explicit no-change condition |
| --- | --- | --- |
| Create | scripts/faces-stock-reconcile-2026-11.ts | Bounded diagnostic CLI, exact target/principal admission, read-only source queries and private output; no apply mode. |
| Create | scripts/faces-stock-reconcile-2026-11.test.ts | Diagnostic CLI refusal/output, cost-authority denial and actual package-process bootstrap smoke cases. |
| Create | scripts/faces-garment-mapping-2026-11.ts | Exact mapping preview/apply/status wrapper; shared F3 transaction/storage only. |
| Create | scripts/faces-garment-mapping-2026-11.test.ts | Mapping wrapper admission, exact manifest/status and process smoke. |
| Create | scripts/faces-garment-repost-2026-11.ts | Single-ticket frozen historical garment wrapper over qualified F3 engine. |
| Create | scripts/faces-garment-repost-2026-11.test.ts | Garment wrapper stale/replay/unknown-outcome and admitted process smoke. |
| Create | scripts/lib/faces-stock-reconciliation.ts | Pure evidence/classification/decimal comparison, canonical report logic, source evidence/timeline types, and the closed `decodeStockEntrySource` stock entry source decoder (contracts/source-explanation.md), also imported by the mapping service. |
| Create | scripts/lib/faces-stock-reconciliation.test.ts | Classification, multiplicity, partial/mixed evidence, booking-group resource identity, numeric oracle and every stock entry source decoder vector. |
| Create | scripts/lib/faces-garment-mapping.ts | Pure strict MappingManifestV1/command/status decoder, complete canonical hash and plan, no runtime alias/service/CLI imports. |
| Create | scripts/lib/faces-garment-mapping.test.ts | Exact mapping/census/cutover/refusal/no-op plan cases. |
| Create | src/server/services/faces-garment-mapping.service.ts | Exact owning mapping preview/apply/read-only status and correct/compensate transitions, injected ctx, F3 primitives/immutable receipt, unchanged-facts digest using `decodeStockEntrySource`. |
| Create | src/server/services/faces-garment-mapping.test.ts | Service source/census/digest/receipt/status/inverse and denial boundaries. |
| Modify (F7-created prerequisite, absent at the pinned baseline) | scripts/lib/operator-service-loader.ts | Add the closed `garmentMapping` key and exact namespace only when the F1 service exists; starts after F7 qualification. |
| Modify (F7-created prerequisite, absent at the pinned baseline) | scripts/operator-bootstrap.smoke.ts | Qualify the added `garmentMapping` graph after admission, no global-pool fallback; starts after F7 qualification. |
| Create | scripts/lib/faces-garment-repost.ts | Frozen-line eligibility/manifest/recovery orchestration using admitted shared services; exact Q4 frozen-line equality; requires decoded `pos` source. |
| Create | scripts/lib/faces-garment-repost.test.ts | Two separately approved reported cases, ineligible old candidate and shared-bin freshness. |
| Create | src/server/services/faces-stock-reconciliation.sql.integration.test.ts | Exact eight-behavior real PostgreSQL qualification and shared-dependency integration. |
| Modify | package.json | Register the three exact no-env-file commands from contracts/report.md. |
| Modify | scripts/qc/native-postgres-manifest.ts | Admit this one SQL suite in qa-native with `exactAssertions: true` and 8 behaviors. |
| Modify | scripts/qc/native-postgres-manifest.test.ts | Assert unique suite/admission and required behavior declarations. |
| Modify | scripts/qc/native-postgres-report.test.ts | Missing/duplicate/skipped behavior rejection. |
| Conditional Modify (only under an approved S2b amendment that names it) | src/server/services/stock-accruals.service.test.ts | T025 failing reproduction. No change when S2b is not approved. |
| Conditional Modify (only under an approved S2b amendment that names it) | src/server/services/scheduling-bookings-accrual.test.ts | T025 failing reproduction. No change when S2b is not approved. |
| Conditional Modify (only under an approved S2b amendment that names it) | src/routes/api/scheduling/bookings/_handlers.test.ts | T015 single/group/gateway completion qualification. No change when S2b is not approved. |
| Conditional Modify (only under an approved S2b amendment that names it) | src/routes/api/scheduling/bookings/[id]/complete/server.test.ts | T015 completion qualification. No change when S2b is not approved. |
| Create local evidence only | audits/2026-11-16-faces-followups/F1/ (meta-repo) | The single evidence location: `qa-diagnostic.json`, `reconciliation-summary.md`, `concurrency.json`, `repair-plan.json`, `repair-rehearsal.json`, `repair-receipt.json` and `validation.json` (tasks T010, T011, T016, T018, T020, T021, T022). Synthetic or sanitized only; no live PII or credential material. |

F7 owns the operator-principal helper, read-only resolver, loader and bootstrap smoke foundation; F3 owns the shared correction schema/migration, stock/POS/accrual transaction helpers and admission synchronization. F1 consumes qualified exports and does not duplicate those edits. Existing stock/POS/scheduling services, completion handlers and legacy repair scripts are read/reference targets only. Existing test files are run unchanged as regression support except the Conditional Modify rows above. Any S2b product-code change needs its own reviewed amendment, which adds its rows here. No Hub UI/catalog/generated-i18n, DB migration or shared QA seed change is selected; the native suite owns its isolated synthetic fixture. No new package dependency.

All selected new tests use the existing relevant unit/route/mounted or manifest-owned qa-native harness from quickstart.md, including the native exact-count prerequisite there; no new runner or implicit skip. Focused tests do not replace the full guarded native lane/report, full candidate checks, applicable UI/i18n/token/browser gates or owner approval. No execution is claimed.
