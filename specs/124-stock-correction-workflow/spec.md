# Feature Specification: Auditable stock correction workflow

**Feature Branch**: Not created; docs-only planning. Future slice branches target Hub `master`.
**Created**: 2026-11-16
**Status**: Draft — owner data-spec approval pending; independent review results under egm/
**Input**: Proposal F3: support corrections to submitted receipts and past consumption without hiding originals, duplicating stock, or changing payment facts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct a wrong variant safely (Priority: P1)

An authorized operator uses the operator-facing workflow to correct a same-price garment variant on a submitted sale, give a reason, inspect stock effects and recover interruption. When the recorded product is already right, stock-only repair instead uses the owner-approved private command defined in the garment contract.

**Why this priority**: An M/L mistake needs a traceable correction, not a second sale or another delivery.
**Independent Test**: A synthetic sale for one M is corrected to one L; original payment/date remain identical and the ledger nets to one L issue.
**Acceptance Scenarios**:

1. **Given** a mutable sale with a linked M issue, **When** the operator previews and confirms L with a reason, **Then** M is returned, L is issued once, booking product display follows the corrected sale and original history remains available.
2. **Given** an identical retry or two concurrent confirmations, **When** they execute, **Then** one correction wins and its result is returned or the stale request is rejected; no second reversal/replacement occurs.
3. **Given** a sale already records intended M but its linked issue contains L, **When** the actual owner applies the approved private garment manifest through the qualified command, **Then** sale/booking product, original payments and ticket totals remain unchanged, while the approved stock quantity, value and cost effects are recorded.
4. **Given** a period lock, fiscal document, reconciled sale, recipe drift or insufficient L, **When** correction is requested, **Then** it is refused with a specific reason before misleading success is shown.

### User Story 2 - Correct a submitted receipt without erasing history (Priority: P2)

An authorized stock manager previews a quantity-only or value-only receipt mistake and sees whether safe cancellation/replacement is possible or historical valuation review is required.

**Why this priority**: Receipts determine both stock and later costs.
**Independent Test**: An unconsumed receipt is corrected by one linked cancellation/replacement; a consumed or historically dependent receipt is blocked and routed to the separately approved valuation repair.
**Acceptance Scenarios**:

1. **Given** a submitted receipt with no later dependent movements, **When** quantity or unit cost is corrected, **Then** original and replacement remain linked with reason, author, timestamps and net quantity/value difference.
2. **Given** later consumption or a locked accounting period, **When** a receipt correction is previewed, **Then** the impact and blocking policy are explicit; a current adjustment cannot be presented as repaired historical costs.
3. **Given** replacement posting fails after cancellation ran inside the new correction transaction, **When** the failure is injected, **Then** the entire transaction rolls back and the original submitted receipt remains unchanged; retry uses the same immutable operation intent without duplicate cancellation or draft effects. Preexisting legacy pending POS reposts use their separate recovery path.

### User Story 3 - Resolve a past consumption correction with evidence (Priority: P2)

A manager identifies the owning sale, booking or invoice before choosing a supported correction path.

**Why this priority**: Displayed products, reservations and posted stock are different facts.
**Independent Test**: A completed booking with only an expected product and one with a posted issue produce different eligibility results; neither is reopened or charged again.
**Acceptance Scenarios**:

1. **Given** a posted consumption owned by a correctable sale, **When** a supported variant change is made, **Then** the existing sale correction is used.
2. **Given** booking/invoice-owned historical consumption or ambiguous ownership, **When** correction is requested, **Then** no generic issue or booking status rewrite occurs; the evidence packet links to F1/F2 repair review with an explicit blocked reason.

### Edge Cases

- Receipt already cancelled; draft edited after preview; archived/foreign variant or warehouse; missing UOM conversion; source points at a cancelled entry.
- Two corrections to one source; correction racing sale void, completion, receipt issue or period close; crash after every durable transition.
- Recipe or UOM changed since original posting; same target repeated with a different reason; amount differs from current catalog price.
- Existing negative-stock refusal remains visible; backdated valuation cannot silently become a current-stock adjustment.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Classify every request as draft edit, existing sale variant correction or stock-only repost, safe receipt replacement, or blocked historical repair; show the original record and linked movements.
- **FR-002**: Reuse existing draft editing, reversal and sale reposting capabilities, including stock-only repost when the source product is already correct; never delete or edit submitted ledger history.
- **FR-003**: Require an authenticated same-organization actor, relevant stock and sale authority, nonblank reason and an unchanged preview before a correction is applied.
- **FR-004**: Preserve payment amounts, methods, dates, ticket totals and appointment dates; differing-price changes require a separate financial process.
- **FR-005**: Persist one durable correction identity and immutable proposed payload so retry/resume cannot repeat a reversal or create a different replacement.
- **FR-006**: Show before/after item, variant, quantity, UOM and value impacts, immutable source links, outcome, failure and recovery state.
- **FR-007**: Support quantity-only and value-only receipt corrections only when downstream dependency and accounting policy permit; otherwise produce a blocked impact report for F2.
- **FR-008**: Treat a warning or pending repost as incomplete; the UI cannot announce a fully applied correction before stock is verified.
- **FR-009**: Keep historical booking status and original stock references discoverable. Generic product edits cannot stand in for posted-stock correction.
- **FR-010**: Use existing accounting period locks for sale eligibility. For standalone receipt corrections, any affected locked period or unverified period policy blocks apply; no date cutoff is invented.
- **FR-011**: Added UI must respect existing capabilities, sensitive cost masking, translations, keyboard operation and design-token standards.
- **FR-012**: Tests must prove retry, concurrency, organization isolation, capability denial, unchanged sale-payment facts and exact approved inventory-value/cost effects, with synthetic data only before approval.

### Key Entities

- **Correction request**: Original source, immutable intended change, reason, actor, preview evidence, status and linked result.
- **Stock movement**: Original submitted entry, reversing ledger and replacement entry; the historical source of stock quantity/value.
- **Source owner**: Sale, booking, invoice or independent receipt that determines the eligible correction path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All synthetic M→L retries and concurrent requests produce exactly one net L issue and zero remaining M issue for the corrected unit.
- **SC-002**: All correction scenarios preserve the original payment facts and expose original/replacement links with author and reason.
- **SC-003**: Every blocked historical receipt in the validation matrix leaves both stock and financial facts unchanged and names the unresolved dependency.
- **SC-004**: Every injected interruption can be inspected and either resumed to one verified outcome or left explicitly blocked without an unreported partial effect.

## Assumptions

- This is a supported workflow specification, not authorization to alter FACES records. Unknown production IDs, physical M/L counts, period state and deployed version remain unknown.
- F1 establishes fulfillment ownership; F2 handles downstream valuation/COGS repairs. The first release deliberately blocks those repairs rather than implementing a generic replay engine.
- The sanitized [live-read summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json) observed on November 16 also shows a sale already recording M with a linked L issue; F1 owns exact mapping correction and historical candidate approval. F3 therefore includes stock-only repost without changing the sale product. Physical intended mapping and balances still require approval/evidence.
- Existing same-price sale swap is a capability to qualify, not proof the reported case is already solved.

## AS-IS → TO-BE → DELTA

AS-IS, pinned Hub `c6c2d5739572356239c4048c0f564f40b0768adc`: draft-only `updateEntry` at `src/server/services/stock.service.ts:679`; append-only cancellation at `:950`; sale preview/repost at `src/server/services/pos.service.ts:1235,1314`; submitted sale same-price product swap at `:1407` with booking synchronization and fiscal guards. Generic visit product edits at `scheduling-bookings.service.ts:2882` edit planned associations; they do not call stock reversal. Final booking statuses are not reopened (`:1041`). Detailed evidence is in [research.md](research.md).

TO-BE: one discoverable correction workflow chooses these existing paths and records durable reason, eligibility, recovery and linkage.

DELTA: qualify existing swap before extending it; add correction orchestration and safe receipt eligibility; block ambiguous/downstream historical cases with evidence. US1/SC-001 prove variant correction; US2/SC-003 prove receipt boundaries; US3 proves source ownership handling. No broad cleanup, forced balance, new payment or calendar reopening.

## Alternatives Considered

Reject inventing a second ledger correction kind or independently committing cancellation and replacement: these either expand valuation semantics or expose partial correction. Reuse existing append-only cancellation/submission inside one shared transaction and durable correction receipt. The per-org stock gate deliberately trades concurrent stock-write throughput for an auditable lock order across existing writers. Detailed alternatives are in [research.md](research.md) and [contracts/transaction-protocol.md](contracts/transaction-protocol.md).

## Approval and release gates

Data-tagged: owner spec approval is pending before product implementation; human merge required. Review results are recorded under egm/; owner approval remains pending. No product implementation, migration, production execution, deployment or runtime verification has occurred in this planning task.


Authority changes are part of correction admission: a previously absent deny or module-disable row cannot appear between the fresh check and correction commit through the participating application writers. If authority changes first, correction refuses without effects; if correction is admitted first, that authority change waits and applies afterward. Existing POS-only empty swaps and period-only bookkeeping retain their own access/module requirements; stock cost access uses the existing finance tier, with no new stock permission tier.

The proposed public preview and apply endpoints will reject stock_only with HTTP 422 owner_evidence_required; private garment authority/evidence are defined in [garment-envelope.md](contracts/garment-envelope.md). Active actor and mutable-input synchronization follow [transaction-protocol.md](contracts/transaction-protocol.md). Require every named behavior in [native-qualification.md](contracts/native-qualification.md), without treating these proposed changes as current production proof.

Authority prerequisite: [F7 bridge](../128-faces-receivables-audit/contracts/authority-bridge.md), qualified before this slice. The transaction protocol selects its operator adapter; legacy callers retain their existing adapter.
Public interruption recovery persists a minimal scoped operation identity before submission and restores the recorded server outcome after reload/crash; unavailable site persistence blocks confirmation. Unknown results never trigger an automatic new write. The exact public/private boundary is [browser recovery](contracts/browser-recovery.md).

## Stock-cost denomination and owner qualification

Stock-changing corrections require an explicit current real-owner attestation of the common stock valuation currency, bound to the complete affected inventory boundaries and approval. The generic preview can expose safe boundary identifiers to an admitted owner for that explicit input, then must re-preview before confirmation. Missing/unverified denomination yields unavailable costs and no executable correction; billing currency and current display settings cannot qualify it. Qualified effects and historical receipts retain their attested currency after display settings or the original actor change. Both-empty POS-only swaps retain their existing authority, and normal sales/stock/background writers gain no owner requirement. The exact types, limits and disclosure rules are [valuation-qualification.md](contracts/valuation-qualification.md).

## Decisions made during review (owner to confirm)

- Standalone receipt corrections use one fixed period rule, `receipt_period_v1`: the original and the current posting month must both be open. Approving this specification approves that rule; there is no setting to switch it on. A locked month is refused with `period_locked`.
- A receipt correction is refused with `policy_unverified` when the organization has no finance settings row. Sale corrections keep the existing `America/Lima` timezone fallback in that case.
- An owner-approved posting time (private garment command, F2 receipt chain) is refused if it is earlier than the latest posted movement on the affected stock or later than the moment of apply. The owner then needs a new approved manifest.
- A receipt replacement keeps its purchase link. When the correction changes a rate, the replacement does not copy the original foreign-currency conversion details; the original entry keeps them.
