---
id: 123-faces-receipt-valuation
title: FACES 89-unit receipt valuation reconciliation
status: draft
verdict: pending
created: 2026-11-16
updated: 2026-11-16
repos: [minion_hub]
tags: [data, logic]
proposal: 2026-11-16-faces-stock-cash-crm-meeting-followups
owner_approval: pending
---

# Feature Specification: FACES 89-unit receipt valuation reconciliation

**Feature Branch**: Not created; planned Hub `feat/faces-receipt-valuation` against registry PR base `master`.

**Created**: 2026-11-16

**Status**: Draft. Independent EGM review is in progress; its records are in `egm/`. Owner approval is pending. This document does not authorize any data correction.

**Input**: Proposal F2: verify the reported 89-unit receipt and total S/5,474.58, explain inflated value, and prepare an approved, idempotent correction with downstream valuation effects.

## AS-IS

Meeting E4 in [the proposal](../../proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md) states a total of 5474.58 for 89 units. The summary's “article 89” is unreliable. The source invoice, currency, taxes/freight/discount inclusion, stock unit of measure (UOM) and purchase/receipt link have not yet been verified.

A [sanitized read-only snapshot](../../audits/2026-11-16-faces-followups/evidence/database-read-summary.json), observed 2026-11-16T19:15:08.359Z under `app_ledger` and verified FACES organization scope, found one candidate matching the quantity/rate search:

- Submitted receipt `STE-2026-00559`, entry `b8190e7d-3d59-47f4-ac79-edb5a8d3c72c`, posted 2026-11-02T19:11:33.577Z.
- Line `dddb635d-1184-4350-8b0d-36c7f4ecb85a`, item `25aba8da-b056-4eea-a004-6b2e3ba6c6e2`, code `1264`, HA Saypha Volume Plus, quantity 89, stored unit rate 5474.58, computed line total 487237.62.
- Follow-up read-only snapshot 2026-11-16T19:16:39.881Z found receipt ledger row 1919, quantity after receipt 97, receipt value contribution 487237.62, and 17 later issue rows through ledger 2037, ending quantity 79 and rate approximately 5043.686804123718. These observations identify a strong candidate; invoice identity and intended cost remain unverified.

Pinned source `c6c2d5739572356239c4048c0f564f40b0768adc`: `src/routes/(app)/stock/entries/new/entry-lines.ts:54–77` already supports total/unit input and total÷quantity conversion; `src/server/services/stock.service.ts:679–713` edits drafts only. `stock.logic.ts:45–77` values issues at the running moving average. `stock.service.ts:1088–1125` rebuilds bins from latest stored ledger snapshots; it does not repair underlying historical value. Source and current record evidence do not prove which UI path or deployed version produced the receipt.

The [bounded closure observation](../../audits/2026-11-16-faces-followups/evidence/valuation-closure-read-summary.json), at 2026-11-16T19:27:35.645Z, found exactly 18 submitted entries/lines/ledger rows on one item/warehouse key, 15 realized accrual references and 2 POS stock-entry pointers. This supports a specific correction plan but does not verify invoice intent or authorize mutation.

## TO-BE

The owner sees the verified supplier-document total, receipt quantity/UOM and unit cost, plus a separate explanation of later consumption cost and today's remaining stock value. A dry-run shows all affected valuation effects before any correction. The selected correction preserves original entries and ledger, reverses the complete approved segment and posts linked replacement entries atomically. The current open correction period carries the net cost adjustment; earlier reported periods remain as booked. Fresh closure or document differences refuse apply rather than broaden the operation. Any approved correction preserves quantities, payment facts and original evidence (including absent unit labels), works once, and reports a no-op on repetition.

## DELTA

| Transition | Proof required |
| --- | --- |
| Strong candidate → verified receipt | Same-org purchase/supplier document, item/UOM, quantity, date, currency/foreign exchange (FX) and cost-basis agreement; owner resolves conflicting evidence. |
| Reported total → expected rate/value | If 89 stock units and total 5474.58 in valuation currency are verified, unit rate rounded to four decimals is 61.5121; 89×61.5121=5474.5769, displayed to cents as 5474.58. |
| Inflated receipt → full impact report | Enumerate every later same-key movement and consumer. Replay only the explicitly supported one-receipt plus 0–128 homogeneous ordinary issues; transfers/reversals/adjustments/second receipts deterministically stop hypothetical replay as unsupported. Show downstream consumed value and current remaining value only for complete admitted closure; preserve signed quantities. |
| Reviewed plan → approved correction | Exact manifest, accounting-period policy, target and owner approval; local rehearsal, durable audit, undo/recovery and repeated no-op; full bin/ledger agreement. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verify the exact receipt and cost basis (Priority: P1)

As the owner, I can match the reported receipt to a supplier document and understand what was entered, what the document states, and why any rate differs.

**Why this priority**: A wrong match or assumed currency can produce a harmful correction.

**Independent Test**: On synthetic receipts with quantity 89, competing invoice references, different UOM/currency and a total-versus-unit entry error, only the fully matched document becomes valuation-plan eligible.

**Acceptance Scenarios**:

1. **Given** candidate STE-2026-00559 and no invoice, **When** discovery runs, **Then** it reports exact stored facts and the missing document gate; an explicit total hypothesis may give a complete conditional explanation, while a missing hypothesis stays unknown. Neither enables correction.
2. **Given** verified 89 stock units and total S/5,474.58 on the same receipt cost basis, **When** expected unit cost is calculated, **Then** it is approximately 61.5121 and the cent total is 5474.58; rounding residual remains explicit.
3. **Given** a mismatch in invoice, currency, UOM, quantity or tax/freight basis, **When** a plan is requested, **Then** the mismatch is reported and application stays blocked.

### User Story 2 - Explain downstream value and consumption cost (Priority: P1)

As the owner, I can see what correcting the receipt would change in later costs and today's stock, while quantity remains the same.

**Why this priority**: The receipt's corrected total is not today's remaining inventory value; later issues used its inflated moving average.

**Independent Test**: A synthetic history with opening stock, the 89-unit receipt and ordinary same-key issues is replayed; the report independently reconciles receipt value, consumed-value differences and closing value with unchanged quantities. Transfers/reversals/adjustments/second receipts have exact unsupported outcomes, not optional replay.

**Acceptance Scenarios**:

1. **Given** an existing pre-receipt balance and later issues, **When** the receipt is hypothetically revalued, **Then** the new running average includes opening stock and each downstream issue uses that average; the original and corrected values are shown separately.
2. **Given** a transfer, cancellation/reversal, adjustment or previously repaired opening balance, **When** it belongs to the affected value chain, **Then** its original facts and source attribution are recorded, and hypothetical replay stops as unsupported with eligibility false; no transitive replay is implemented and no movement is silently skipped.
3. **Given** source rows change while a snapshot is being checked, **When** a plan is validated for application, **Then** the stale plan is refused and a new report requires fresh review.

### User Story 3 - Apply only an approved, auditable valuation correction (Priority: P2)

As the owner, I approve an exact before/after plan and receive proof that values reconcile, quantities are preserved and running it again cannot correct twice.

**Why this priority**: Historical stock and financial corrections require explicit approval after the full impact is known.

**Independent Test**: On a disposable restored fixture, an approved manifest applies once, repeats as no-op, recovers from interruption/unknown commit and leaves unrelated items/tenants unchanged.

**Acceptance Scenarios**:

1. **Given** a reviewed and approved exact manifest, **When** correction succeeds, **Then** the original receipt is discoverable, all approved value/cost of goods sold (COGS) effects are audited, every item/warehouse quantity remains unchanged and bins agree with ledger.
2. **Given** a stale manifest, wrong target, unapproved period policy or unknown prior commit outcome, **When** apply is requested, **Then** application stops and reads authoritative state before any retry.
3. **Given** the same already-applied manifest, **When** it is run again, **Then** it changes zero records and returns the prior receipt or an explicit verified no-op.

### Edge Cases

- The 89 units may be stock units or supplier packaging units; a name is not a conversion factor. Original movement unit labels may legitimately be absent; preserve that absence and require separate historical stock-unit/conversion evidence before correction, never label it from today’s item definition.
- Foreign-currency receipt metadata and historical FX differ from current Finance settings; do not use today's FX for a historical repair without approval.
- The receipt has multiple item lines or tax/freight/discount allocation; 5474.58 might be a document total rather than one line's cost basis.
- Opening stock/value is nonzero (observed quantity before candidate receipt is eight); treating it as an empty bin distorts moving-average replay.
- Later transfers, cancellations/reversals, adjustments and second receipts are outside the selected executable envelope; discovery records them and deterministically blocks hypothetical replay/apply.
- Zero quantity/negative running value, ledger gaps, unsafe numeric narrowing, missing conversion or nonunique line attribution block application.
- Current bin quantities may agree internally while receipt/issue values are incorrect; a bin-only rewrite is insufficient.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Discovery MUST be read-only and identify exact organization, receipt/line/item/warehouse IDs, source document, date, quantity/UOM, stored unit rate, line value and currency/FX cost basis.
- **FR-002**: Candidate matching MUST preserve ambiguity and missing evidence; a strong candidate MUST NOT be treated as an approved correction without source-document verification.
- **FR-003**: If the reported basis is verified as 89 stock units for total 5474.58, the plan MUST calculate the expected unit rate at the established four-decimal boundary and show the residual between unrounded and cent-displayed total.
- **FR-004**: The impact report MUST enumerate actual ordered affected history from the verified pre-receipt state. Hypothetical replay admits only the homogeneous one-receipt/0–128 ordinary same-key issue matrix in contracts/correction.md, preserving quantities; second receipts, transfers, adjustments and reversals MUST produce an explicit unsupported/ineligible result, never partial or implicitly chosen replay.
- **FR-005**: The report MUST distinguish original receipt contribution, corrected receipt contribution, downstream consumption/COGS differences and current remaining inventory value; it MUST NOT label the receipt total as today's inventory balance.
- **FR-006**: Missing history, unclear source attribution, unsupported movement, inconsistent UOM/currency, stale evidence or cross-organization links MUST block apply eligibility and explain the reason.
- **FR-007**: Correction MUST require owner approval of this data spec before implementation, a reviewed exact manifest/target/cost and accounting-period policy before apply, and owner merge for nontrivial code. The proposed policy posts the reversal/replacement in an approved current open correction month, preserves earlier historical-period COGS and original dates, and requires explicit owner acceptance before apply; it does not infer a cutoff from the meeting.
- **FR-008**: Correction MUST preserve original evidence and every affected item/warehouse quantity, retain append-only ledger invariants under the normal application role, change only approved value effects and leave collections/dates and unrelated records unchanged.
- **FR-009**: Correction MUST be dry-run by default, fingerprinted against approved source state, reversible through a rehearsed procedure, auditable with actor/reason/operation identity, safe on unknown commit outcome, and idempotent on repeat.
- **FR-010**: Post-correction verification MUST independently reconcile all affected quantity/value effects and latest-ledger/bin state, including missing/extra keys; the second application MUST make zero changes.
- **FR-011**: Tests MUST use synthetic/local QA history, exercise exact 89-unit arithmetic, nonempty opening stock, downstream valuation/COGS, transfer/reversal and stale/concurrent/interrupted/repeated application behavior for any implemented writer.

### Key Entities *(include if feature involves data)*

- **Receipt candidate/document**: Stable receipt/item/line identity, supplier document evidence and verified cost basis.
- **Valuation history**: Ordered signed same-key movements, opening snapshot and original/corrected cost contributions; cross-warehouse or reversal dependencies are reported as unsupported original facts.
- **Impact report**: Separate receipt, consumed-cost and remaining-value differences with quantity-preservation checks.
- **Correction manifest/receipt**: Fingerprinted approval scope, owner/actor/reason, exact permitted effects and observed outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: One exact receipt/document is verified or every candidate remains explicitly unverified; zero ambiguous or undocumented matches are applied.
- **SC-002**: For the verified 89-unit/5474.58 basis, the cent-displayed receipt total equals 5474.58 and rounding residual is disclosed.
- **SC-003**: Every movement in the affected history is replayed or explicitly blocks application; each approved quantity remains unchanged and receipt-value difference reconciles with consumed-cost plus remaining-value differences.
- **SC-004**: Every approved correction retains original evidence, matches its approved effects, produces zero affected balance mismatches and makes zero changes on repetition.

## Alternatives Considered

Reject a bin-only overwrite or in-place ledger edits because they sever the receipt, issue and realized-cost history. Reject generic transitive replay for unsupported transfers or mixed-item histories. Select bounded append-only reverse-and-replay for one homogeneous receipt chain, with exact consumer relinking, a finite cap and current-open-period accounting; this retains original rows but requires fresh manifests and explicit cost/period approval. Detailed alternatives are in [research.md](research.md).

## Assumptions

- STE-2026-00559 is a strong discovered candidate, not yet a document-verified match. The meeting amount and currency cannot replace an invoice.
- The selected correction is atomic reversal and replacement of the verified one-key receipt plus 17 later issue entries, with original rows retained and current-period COGS adjustment. The exact transaction, consumer updates, precision proposal and eligibility limits are in [contracts/correction.md](contracts/correction.md). Missing invoice, approved period/cost policy or changed closure blocks apply; it does not leave the writer representation to the implementer.
- Existing total/unit entry behavior is evaluated first; adding another toggle is not an established fix. General correction UI belongs to F3.
- F1 and prior true-up/backfill work must be coordinated before either changes overlapping history; no broad historical script is rerun implicitly.
- Data access uses existing organization-scoped authority and private artifacts; no UI/API surface or new permission is introduced by the read-only-first design.
