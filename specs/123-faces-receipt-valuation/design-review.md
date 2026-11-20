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

## Detailed Implementation Plan

This boundary separates the stakeholder specification from the complete technical companion artifacts. Source is pinned; tests and implementation are proposed unless an explicit evidence receipt says otherwise. Independent EGM records live under egm/. Owner data/security approval and owner merge remain pending.

### Review artifact: plan.md

## Implementation Plan: FACES 89-unit receipt valuation reconciliation

**Branch**: Not created; planned `feat/faces-receipt-valuation` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Proposal F2, pinned Hub `c6c2d5739572356239c4048c0f564f40b0768adc`, timestamped read-only snapshots and offline source-math checks in research.

### Summary

First ship an operator-only read-only discovery/replay report for candidate STE-2026-00559. Verify invoice/currency/UOM/cost allocation, establish eight-unit opening state, and replay receipt ledger 1919 plus the actual downstream dependency segment. Explain receipt contribution, COGS and remaining stock separately. The observed 17 later issues make a bin-only correction insufficient. The selected full correction is the bounded atomic reverse-and-replay in [contracts/correction.md](contracts/correction.md), preserving original ledger and posting the net COGS correction in the approved current open month. Invoice/cost/period evidence remains an apply gate. No zero-quantity revaluation API or privileged ledger rewrite is selected.

### Technical Context

**Language/Version**: Existing Hub strict TypeScript and Bun; package manager verified via registry. No dependency/runtime upgrade.

**Primary Dependencies**: Existing PostgreSQL/Drizzle conventions; `stock.logic.ts` source formulas; the precision policy in [correction.md § Explicit accounting and precision proposal](contracts/correction.md#explicit-accounting-and-precision-proposal); Vitest and local PostgreSQL.

**Storage**: Existing org-scoped PostgreSQL reads; private report/manifest files. No S1 schema/migration changes; S3 consumes the F3-owned shared `stk_corrections` table (kind `receipt_chain`) as specified in the correction contract.

**Testing**: Synthetic receipt/precision/history tests, read-only CLI contract tests, local QA integration; native transaction/idempotency/fault and finance-period tests for the selected S3 writer, as required by the correction contract.

**Target Platform**: Operator-run Bun diagnostic; no new browser/API endpoint.

**Project Type**: Read-only financial/stock evidence tool first.

**Performance Goals**: Exact item/warehouse/entry scope; the statement, lock and overall bounds in [replay-report.md](contracts/replay-report.md#exact-cli-and-authority); enumerate complete same-key closure within the selected 0–128 ordinary-issue envelope; detect transfers/reversals/second receipts/adjustments as unsupported, never silently truncate at the observed 17 issues.

**Constraints**: Technically read-only snapshot; owner approval before data-tagged code; no elevated ledger edit as implicit fix; quantities/payment facts unchanged; numeric precision/rounding explicit; no credentials/PII committed.

**Scale/Scope**: One verified FACES receipt/line and complete affected value chain. 193 item ledger rows were context in the snapshot; the receipt plus 17 later issues is the observed affected segment, subject to fresh-state drift.

### Constitution Check

| Principle | Pre-design | Post-design evidence |
| --- | --- | --- |
| I Spec before code | Pass for authoring | Spec/plan/tasks generated; no product implementation started. |
| II Evidence/AS-IS/TO-BE/DELTA | Pass | Actual IDs/stored values/snapshot times, source anchors and explicitly conditional arithmetic; no invoice assumption. |
| III Slice-scoped delivery | Planned | Bun/master verified; isolated branch/draft PR required at implementation; existing worktrees untouched. |
| IV Required build steps | Pass for first slice | Operator CLI only. A later API/UI surface needs its own reviewed spec covering RBAC/route manifest, Paraglide and design governance/token/browser gates. |
| V Data owner gates | Blocked for implementation/apply | Owner spec approval, reviewed correction contract, owner merge and exact manifest/target/period/cost apply approval pending. Dry-run default, QA undo in finally and repeat no-op required. |

Principle V blocks implementation until the owner approves; a request to prepare specifications does not waive it. No production command is approved here. Review status is stated once in [spec.md](spec.md).

### Project Structure

#### Documentation

`specs/123-faces-receipt-valuation/`: spec, research, plan, data model, the four contracts listed in the [contract index](#contract-index), quickstart, tasks, implementation inventory, requirements checklist and the generated design-review.md.

#### Proposed Hub source

- `scripts/faces-receipt-valuation-2026-11.ts`: target guards, bounded reads, document-evidence admission and report serialization.
- `scripts/lib/faces-receipt-replay.ts`: strict diagnostic manifest/discovery/replay unions, shared DocumentBasis/UnitQualification and validators/digests from diagnostic-wire.md, then exact decimal admission, source-compatible Number replay and independent rational verification, dependency closure and value/quantity/conservation oracles.
- `scripts/lib/faces-receipt-replay.test.ts`: independent expected math/history tests, including exact 89-unit and nonempty opening cases.
- `scripts/faces-receipt-valuation-2026-11.test.ts`: read-only/error/target/privacy contract tests.
- S3 writer/service/test files and the F3 shared helper prerequisite are enumerated in [contracts/correction.md](contracts/correction.md).
- Existing `src/server/services/stock.logic.ts`, `stock.service.ts`, `pg-schema/stock.ts`, entry route/UI helpers and old valuation repair are evidence/read targets, not edited.

[implementation-inventory.md](implementation-inventory.md) is the per-file Create/Modify/no-change list, including shared files that F2 does not edit.

**Structure Decision**: Separate pure replay from database/secret handling. Do not invoke a legacy repair to discover values; do not reuse bin snapshot copying as a revaluation algorithm.

### Phase 0: Evidence decisions

[research.md](research.md) resolves architecture: the exact receipt candidate, verified eight-unit opening state, downstream issue segment and conditional source-math replay. Unverified invoice/FX/UOM/period/rounding policy are explicit admission blockers: report hypothetical evidence and refuse application, never substitute assumptions.

### Phase 1: Discovery and replay design

[contracts/replay-report.md](contracts/replay-report.md) defines an operator CLI, private file output, error codes and read-only scope. [contracts/diagnostic-wire.md](contracts/diagnostic-wire.md) selects every exact S1/S2 field/null/outcome/hash; data-model.md indexes those types without an alternate prose schema. T003 creates that pure library before S1, with no future US3 service dependency. Read in one repeatable-read read-only transaction after target/role/org verification. Fetch receipt/line/item/warehouse/purchase and exact same-key pre-state; enumerate all later same-key movements by sequence and exact consumers, retaining unsupported reversal/transfer provenance as blockers rather than propagating their valuations. Keep evidence fields separate from owner-verified documentary basis.

Preserve raw original line.uom:string|null; qualify a separate normalized stockUom from actual historical writer/unit/document evidence. Copies preserve null exactly. Unknown currency/UOM remains unknown source evidence; only explicitly labelled hypothesis arithmetic can continue, never a fake historical denomination. First replay the original history to validate source coherence. A mismatch blocks correction planning rather than silently normalizing it. Then calculate hypothetical rates/values using the precision policy in contracts/correction.md, with no intermediate cent rounding. At zero/negative-value and unsupported-history boundaries report blockers. This slice does not implement hypothetical transfer/reversal propagation: the exact support matrix returns unsupported and ineligible for those shapes.

### Delivery slices

#### S1 / US1: read-only receipt verification

After owner approval create isolated branch/draft PR from registry master; assess source drift first. Implement candidate identity/document/FX/UOM/cost allocation checks, report exact stored values and missing gates. Keep supplier documents private, committed evidence synthetic/sanitized. Return useful unresolved report even without invoice. Do not assert user input mistake from the observed rate alone. Existing total/unit UI conversion works at pinned source; investigate original version/path only if prevention scope becomes proven.

#### S2 / US2: full value-impact report

Depend on the same safe reader, but synthetic replay can be tested independently of document availability. Reproduce 89-unit arithmetic exactly and opening 8 @ 250. The expected values for the immutable v2 snapshot (receipt value 5474.5769, after-receipt average 77.05749381443299, remaining 79-unit value) are listed once in [quickstart.md oracle 2](quickstart.md#focused-tests-available-only-after-s1s2-files-exist). Invoice cent residual 0.0031 stays explicit. Current live source values and all relevant rows must be read again at planning/apply time.

Enumerate issue COGS, realized-accrual value copies, financial report consumers and the derived readers in [correction.md § Derived readers and copies](contracts/correction.md#derived-readers-and-copies). Verify the exact consumer map against the correction contract and block unsupported consumers. For the observed chain, receipt delta 481763.0431 is partitioned across downstream COGS difference and remaining-value difference; do not claim the full delta is current inventory excess. Include original baseline equality, quantity preservation and full-key ledger/bin agreement.

#### S3 / US3: selected atomic correction, rehearsal and execution

Implement [contracts/correction.md](contracts/correction.md) after owner spec approval. Its source files, CLI/manifest/storage fields, shared transaction/lock order, supported 0–128 issue envelope with actual discovered consumer arrays, period policy, decimal admission and source-engine tolerance are authoritative. The observed 18-entry/15-accrual/2-ticket counts define one regression fixture only. The writer depends only on F3 shared transaction primitives/compatible locking, not its UI. Apply refuses any movement/reference after its approved preview and every unsupported shape. A further supported ordinary issue before a new complete preview may be admitted under a fresh owner-approved manifest within the cap; that alone needs no new engineering spec.

Rehearse the one-key reverse-descending/replay-ascending transaction with source quantities frozen, current correction timestamp, atomic durable audit/operation receipt, compare-before reference updates, response-loss status/no-op and inverse compensation in finally. Owner must accept the proposed current-open-period treatment and four-decimal receipt residual. Original invoice, fresh closure, exact plan/target approval, owner merge and qualified implementation evidence remain external execution gates. No production command is installed or executed in this drafting stage.

### Validation and exact commands

[quickstart.md](quickstart.md) gives commands and expected results. Arithmetic source checks executed offline from pinned source and private v2 JSON only; exit 0 with Bun's internal tsconfig diagnostic is recorded in research. They prove conditional math, not invoice identity, writer correctness, clean full Hub gates or deployed state.

At implementation run focused Vitest tests and local QA, then `bun run check` (zero errors/warnings), `bun run test` (zero failures), `bun run build`. F2 adds no migration. Independent implementation review and owner merge/deployment/runtime evidence remain separate.

### Risks, errors and recovery

Baseline replay mismatch, missing history/UOM/FX, wrong invoice, ambiguous same-item line, unexpected transfer/reversal, schema/permission failure or any ledger/reference change after preview makes that exact plan ineligible. Never overwrite bins merely to make a check green. Preserve original snapshots and clarify supported historical correction semantics before writes. On unknown commit read durable operation and authoritative rows before deciding retry. Failure in a best-effort audit after stock commit cannot be interpreted as rollback.

### Complexity Tracking

No constitution exception is claimed. First slice adds only guarded reader and pure replay. The selected S3 writer is bounded to the evidenced single-key shape; its operation storage and financial-period policy are specified in contracts/correction.md and require owner approval before implementation. Unsupported broader histories remain ineligible.

### Cross-item execution ordering

Qualify the F3-owned shared transaction helpers, correction storage migration/RLS/seed and compatible lock protocol before F1/F2 writers. For Saypha receipt-chain keys or source entries appearing in an F1 overlap candidate, perform the approved F2 valuation correction first, then regenerate F1 diagnostic/quantity manifests from fresh authoritative state; never reuse pre-F2 fingerprints or independently repair one source twice. Unproven duplicate/missing cases remain ineligible. The garment M/L mapping and stock-only repost involve different item keys and must not change the Saypha chain. F2 refuses any movement or reference change after its preview; a fresh owner-approved manifest is required, within the 0–128-issue envelope. This ordering is a design contract, not current apply authorization.

### Shared interfaces and native ownership

F7 owns the shared existing-session verifier and nonlocking read-only resolver; F3 owns the shared write gate, stock helpers and the single `stk_corrections` migration/seed qualification. Use their exact typed interfaces in contracts/correction.md and F3 contracts/transaction-protocol.md, not copied authentication/RBAC or another ledger writer/table. F2 owns only receipt_chain orchestration and its pure/CLI/native tests. Its SQL fixture belongs to qa-native with the semantic ratchets/full-lane report in quickstart; full ordinary test/build alone does not execute it. No F2 migration is created in parallel to F3's `20261116193000_stock_corrections.sql`.

Package scripts, the private connection variable and the bootstrap/loader rules are in [correction.md § Concrete Bun entrypoints and qualified connection](contracts/correction.md#concrete-bun-entrypoints-and-qualified-connection). The F7 bootstrap prerequisite is F7 contracts/operator-bootstrap.md. F2 helpers return the F3 `{entry,transitioned}` result; submit helpers emit one existing event per replacement entry (1 + issueCount), while the controller writes one durable operation audit and emits no duplicate or new payload field.

The compensation mechanism is the same writer with required action `correct|compensate` and the manifest.basis.policy discriminator from [correction.md § Explicit compensating action](contracts/correction.md#explicit-compensating-action-and-manifest-discriminator). QA finally calls that bounded action only after authoritative apply proof; no raw SQL reset or automatic production-finally undo is authorized. No inverse-of-inverse framework is added.

The shared write gate and lock order are stated once in [correction.md § Shared write gate and authority races](contracts/correction.md#shared-write-gate-and-authority-races).

### Contract index

- [diagnostic-wire.md](contracts/diagnostic-wire.md): strict S1/S2 diagnostic input/result/document/unit/source/coverage/oracle/hash contracts in the pure replay module, including useful absent-invoice hypotheses and original-only unsupported outcomes.
- [replay-report.md](contracts/replay-report.md): owning CLI, read-only authority, resource/exit/publication contract.
- [command-envelope.md](contracts/command-envelope.md): separate US3 correct/compensate manifest, full approval hashes, service/result/status signatures, CLI flags and the single CLI outcome/exit table.
- [correction.md](contracts/correction.md): source-compatible math, positive realized-cost sign, derived readers, shared transaction/principal/consumer/compensation prerequisites.

The correction logic imports DocumentBasis/UnitQualification and pure validators from the T003 replay library; no S1/S2 import of a future writer. Its full manifest binds the unit proof. Compensation inherits the prior immutable correct proof while separately admitting the current executing owner; status preserves the historical actor. Original numeric/UOM hash bytes stay unchanged; only new generated engine-effect readback compares String(Number(actualText)). No contract grants owner approval.

### Review artifact: research.md

## Research: FACES 89-unit receipt valuation

### Evidence and limits

Pinned source checkout `.local/faces-followups-2026-11-16/hub-source` verified at `c6c2d5739572356239c4048c0f564f40b0768adc`. Registry command `node scripts/repo-policy.mjs show hub` confirms Bun and PR base `master`. Read Hub `AGENTS.md` and `CLAUDE.md`; no branch/worktree/product changes were made.

[Sanitized read-only database evidence](../../audits/2026-11-16-faces-followups/evidence/database-read-summary.json) records initial snapshot `2026-11-16T19:15:08.359Z`, role `app_ledger`, org-GUC FACES SCULPTORS `21e0601b-f632-43fd-8414-d644af4271f4`, transaction read-only `on`. Private initial evidence SHA-256 `d0ca389a3b0af3b63f8352f7b9930477440f7a4e9b0d4e3bcc2f76d4a2a9263d`. Follow-up private snapshot `.local/faces-followups-2026-11-16/db-evidence-private-v2.json`, observed `2026-11-16T19:16:39.881Z`, SHA-256 `1808216e92b4931288d9e83e1d33f592057900cf3bb5c38390abd8157670130a`, includes the item's 193 ledger rows. Those 193 are context, not 193 affected rows: the candidate receipt is ledger 1919, followed by 17 rows through 2037 in its item/warehouse chain.

No invoice was fetched, no production mutation occurred, and deployed/historical UI source identity is unverified. The candidate stores 5474.58 as a unit rate while the meeting reports that amount as a total; intended basis and cause remain unverified; the specific user interaction or importer causing it is unproven.

### Actual candidate facts

| Field | Observed value |
| --- | --- |
| Receipt / entry | `STE-2026-00559` / `b8190e7d-3d59-47f4-ac79-edb5a8d3c72c`, submitted |
| Posted time | `2026-11-02T19:11:33.577Z` |
| Line | `dddb635d-1184-4350-8b0d-36c7f4ecb85a` |
| Item | `25aba8da-b056-4eea-a004-6b2e3ba6c6e2`, code `1264`, HA Saypha Volume Plus |
| Warehouse | `8b2079fa-904b-44e6-bbe8-79edb7cce867` |
| Stored qty / unit rate / line value | `89` / `5474.58` / `487237.62` |
| Pre-receipt state (same-key previous ledger snapshot) | Qty `8`, rate `250`, value `2000` |
| Receipt ledger 1919 | Qty delta `89`, qty after `97`, value delta `487237.62`, resulting rate `5043.686804123711` |
| Subsequent segment | 17 submitted issue rows, total quantity out `18`, no later receipt/transfer in this snapshot segment |
| Latest ledger 2037 | Qty `79`, rate approximately `5043.686804123718` |

This is a strong match for the meeting's 89-unit report; exact supplier document/cost basis and currency remain the eligibility gate.

### Source anchors

| Source at pinned commit | Established behavior | Consequence |
| --- | --- | --- |
| `src/routes/(app)/stock/entries/new/entry-lines.ts:54–77` | Unit/total mode already exists; total divides by qty, rounds four decimals. | Adding another toggle is not supported as the fix. |
| `src/routes/(app)/stock/entries/new/PageBody.svelte:265–275` | Sends `unitRate(l.rate,l.qty,rateMode)`. | Inspect original mode/path/version; current UI support does not prove historical request. |
| `src/routes/api/stock/entries/+server.ts:20–43,61–80` | Entry schema accepts qty/rate; current route converts currency and verifies purchase link. | Cost basis/FX/purchase must be read; current settings do not reconstruct historical missing evidence. |
| `src/server/services/stock.logic.ts:45–77,549–577` | Incoming cost uses given rate; outgoing cost uses current bin average; FX conversion rounds four decimals and records metadata. | Correcting receipt changes later issues as well as remaining stock; FX is not guessed. |
| `src/server/services/stock.service.ts:679–713,778–934` | Only draft updates; submission appends ledger plus bin updates under entry/bin locks. | Submitted receipt cannot be edited through ordinary draft update. |
| `src/server/services/stock.service.ts:947–1015` | Cancellation appends negated original qty/value; can refuse negative current stock. | Cancel/re-receive 89 units when only 79 remain cannot be assumed safe, nor does it restate historical issue COGS automatically. |
| `src/server/db/pg-schema/stock.ts:172–211`; `stock.logic.ts:377–408` | Ledger bigserial ID is strict total order, append-only; bin rebuild takes latest stored snapshots. | Use sequence, not timestamp sorting; `rebuildBins` cannot repair historical valuation. |
| `scripts/repair-stock-valuation.ts:1–25,65–85,168–245` | Older broad repair injects opening stock, revalues in place, rebuilds reconciliation/bins, has force mode. | Not a reusable safe receipt-specific repair: historical assumptions, elevated writes and broad scope need separate review. Never run it as this correction. |

### Decision 1: receipt verification is the first independent slice

**Decision**: Build explicit read-only discovery of candidate, source purchase/document, UOM, original typed/valuation currency metadata and entry lines. Require same-org invoice agreement before valuation-plan eligibility. Missing document yields a useful unresolved report without application.

**Rationale**: The exact data candidate is known, but the meeting number is not source-document proof; the total could include other lines/taxes/charges or use a supplier packaging UOM.

**Alternatives**: Treat meeting total as authorization (reject); identify “article 89” (reject: transcript ambiguity); infer FX from current settings (reject: historical basis unknown).

### Decision 2: replay value dependency, not only the bin

**Decision**: Load exact pre-receipt state, replay original and hypothetical corrected movement values in `stk_ledger.id` order, and detect any transfer/reversal/adjustment/second-receipt boundary as explicitly unsupported; do not implement transitive hypothetical propagation. The present observed segment has 17 issue rows and no later transfer; re-discovery must check for drift before assuming that remains true. Output receipt delta, downstream issue/COGS deltas and remaining value independently, preserving quantity throughout.

**Rationale**: Current bin agreement can faithfully cache wrong source values. Existing `rebuildBins` copies those snapshots. Current cancel/re-receive does not retroactively correct historical COGS and may hit negative stock.

**Alternatives**: Set bin value to 5474.58 (reject: ignores opening stock/later issues); use 61.5121 as current rate (reject: opening stock 8 @ 250 changes average); replay by `posted_at` alone (reject: stock sequence ID is canonical); rerun legacy opening repair (reject: different scope/invariants).

### Executable offline source-math checks

Private scripts `.local/faces-followups-2026-11-16/speckit-F2/source-math-check.ts` and `receipt-replay-check.ts` import the pinned `unitRate`, `computeLegValue`, `applyLedgerDelta` and `replayBins` functions. Commands (no DB connection, no env file):

```bash
bun --no-env-file --tsconfig-override /home/nikolas/Documents/CODE/MINION/.local/faces-followups-2026-11-16/speckit-F2/tsconfig.source-check.json /home/nikolas/Documents/CODE/MINION/.local/faces-followups-2026-11-16/speckit-F2/source-math-check.ts
bun --no-env-file --tsconfig-override /home/nikolas/Documents/CODE/MINION/.local/faces-followups-2026-11-16/speckit-F2/tsconfig.source-check.json /home/nikolas/Documents/CODE/MINION/.local/faces-followups-2026-11-16/speckit-F2/receipt-replay-check.ts
```

Both exited 0 and all explicit assertions passed. `receipt-replay-check.ts` feeds pinned `replayBins` a Number `seq` (`LedgerReplayRow.seq`); that is offline arithmetic only, and the F2 implementation never carries ledger sequence identity through that type (see [data-model.md](data-model.md#existing-source-entities)). Bun emitted an internal “directory mismatch” diagnostic for the tsconfig override on both invocations. This tooling warning is retained as a limitation; these checks are arithmetic/source evidence, not a clean full Hub test run or an approved repair rehearsal.

#### Conditional replay result — not an applied correction

Assuming invoice verification establishes exactly 89 stock units for total 5474.58 in valuation currency, and accepting current four-decimal input rounding without allocating the 0.0031 residual:

| Quantity/value | Original observed chain | Hypothetical corrected chain |
| --- | ---: | ---: |
| Receipt unit rate | 5474.58 | 61.5121 |
| Receipt contribution | 487237.62 | 5474.5769 (cent display 5474.58) |
| Immediately after receipt qty | 97 | 97 |
| Immediately after receipt average | 5043.686804123711 | 77.05749381443299 |
| 17 later issue COGS | 90786.36247422689 | 1387.0348886597938 |
| Latest qty | 79 | 79 |
| Latest remaining value | 398451.2575257737 | 6087.542011340212 |

Receipt-value difference `481763.0431` equals consumed-cost difference plus remaining-value difference within floating-point residual approximately `5.9e-10`. The independent rational value of the remaining 79 units is `5904915751/970000` (6087.54201134020618…); the engine value above differs from it by about `5.8e-12`. These are conditional offline calculations using the v2 snapshot, not authoritative financial corrections or today's value beyond that snapshot. The selected production plan uses exact decimal admission and the existing source movement engine under explicit independent-oracle tolerance, documents the four-decimal versus invoice-cent policy, reruns on a fresh stable snapshot, checks exact related consumers and requires owner approval. Do not round each intermediate movement to cents.

### Decision 3: select bounded atomic cancellation and replacement

The [closure observation](../../audits/2026-11-16-faces-followups/evidence/valuation-closure-read-summary.json) at 2026-11-16T19:27:35.645Z establishes a one-key 18-entry/18-line/18-ledger segment with 15 realized accrual references and 2 ticket pointers, all submitted. Select [contracts/correction.md](contracts/correction.md): reverse issues latest-first, reverse receipt, post corrected receipt then frozen issue quantities in original order within one transaction, update exact consumers and commit durable audit/operation evidence. Preserve original lines/ledger and post new effects in the approved current open correction month. Earlier-period COGS stays original; current-period signed differences correct the cumulative cost. Source `finance.service.ts:926,1036` includes signed issue ledger independent of entry status, by ledger posted_at. Other readers and copies of the corrected values (business brain corpus, stock overview chart, last restock cost) are listed with their selected handling in [correction.md § Derived readers and copies](contracts/correction.md#derived-readers-and-copies).

Shared `src/lib/money/decimal.ts` supports exact division/quantization at four-decimal receipt admission. Keeping the existing Number movement engine avoids a new global valuation engine; the selected tolerances are in [correction.md § Explicit accounting and precision proposal](contracts/correction.md#explicit-accounting-and-precision-proposal).

Reject a zero-quantity revaluation type, quantity fake, bin-only rewrite, privileged historical ledger rewrite and generic transfer replay. The bounded writer rejects post-preview drift and unsupported multiline/transfer/reversal/adjustment/second-receipt shapes at apply. Further supported issues before a fresh approved preview are admitted within the 128-issue cap. Invoice, currency/UOM/cost allocation and period/residual acceptance stay external apply prerequisites, not deferred architectural choices. F3 owns transaction-helper/lock extraction and the single immutable stk_corrections table/migration; F2 owns receipt_chain orchestration and tests. No product implementation or mutation has occurred.

### Remaining gates and bounded unknowns

- Verify supplier invoice/purchase identity, original currency/FX, UOM and whether 5474.58 belongs to exactly this line's inventory cost basis.
- Determine original entry path/mode/importer and source version if prevention is warranted; do not blame a user without evidence.
- Validate full valuation dependency closure, accrual actual-value references and financial consumers; 17 rows is the observed segment, not a permanent scope cap.
- Approve rounding-residual and accounting-period/COGS policy; no cutoff/closed-period rule is invented.
- Fresh snapshot/fingerprint, independent review of the selected correction contract, owner spec approval, owner merge and exact production-manifest/target apply approval remain pending.

### Existing field-tier source boundary

Pinned `src/lib/permissions.ts:128` restricts FIELD_LEVEL_MODULES to crm/finance/scheduling; `src/server/services/rbac.service.ts:217` defaults stock to 0 and its role-override path also keeps stock field tier 0. The resulting admission rule (finance tier, no stock tier) is stated in [correction.md § Exact shared principal contract and CLI modes](contracts/correction.md#exact-shared-principal-contract-and-cli-modes).

### Source-confirmed nullable UOM and diagnostic wire decision

Pinned pg-schema/stock.ts:154–160 has nullable stk_entry_lines.uom. stock.service.ts:640–646 persists omitted labels as null; insertSourcedIssueEntry:1698–1713 supplies only resolved item/qty/fromWarehouse after resolveConsumptionLines:1547–1590 has normalized stock quantity. Ordinary POS/booking issue labels can therefore be null; raw EntryEvidence.uom is string|null. That fact alone does not verify which historical writer/conversion produced an actual row. Owner-attested UnitQualification separately binds historical writer, receipt/item/document/source hashes and normalized stock unit. Current item.uom cannot supply missing history; copies/compensating generations preserve raw null.

The strict diagnostic contract is [diagnostic-wire.md](contracts/diagnostic-wire.md), implemented in the already selected pure faces-receipt-replay module before S1. It selects complete manifest/discovery/replay/outcome/coverage/source/consumer/oracle/hash schemas, useful absent-document hypotheses and original-only unsupported results, separately from the executable writer. Diagnostic currency assumptions remain explicit numeric hypotheses; unknown historical stock denomination is null, not current Finance currency. Shared DocumentBasis/UnitQualification validators flow from this pure module to later US3 logic. Full writer hashes bind the new proof; compensation inherits prior immutable qualified evidence without requiring a deleted attestor to remain current owner. No source document/parser/download, alternative math/policy, extra native name or product change is selected.

### Review artifact: data-model.md

## Data model: receipt valuation reconciliation

### Existing source entities

Discovery/replay add no F2-owned tables; both require F7's qualified authority-bridge function migration. The selected S3 writer consumes F3-owned immutable org-scoped shared stk_corrections (kind receipt_chain) with exact fields/RLS/indexes in [contracts/correction.md](contracts/correction.md). Every read and join uses exact organization equality.

| Entity | Required evidence fields | Constraints |
| --- | --- | --- |
| Receipt header (`stk_entries`) | ID/humanId/type/status/postedAt/metadata including source purchase/currency/FX where present. | Candidate must be same-org submitted receipt; record absence/ambiguity explicitly. Original metadata is preserved. |
| Receipt line (`stk_entry_lines`) | ID/entry/item/qty/UOM(string|null)/rate/toWarehouse/lineNo. | Exact ID, positive stock quantity; verify document cost allocation and UOM. Discovery may explain multiple lines, but this correction envelope requires exactly one line/ledger row per entry; multiple lines are unsupported, never choose the first. |
| Item / warehouse / purchase document | Stable org-qualified identity, stock UOM/conversion, supplier-document reference, currency/cost allocation and file hash. | Supplier packaging ≠ stock UOM unless verified direct conversion. Invoice access private; hash/reference sufficient for sanitized approval artifacts. |
| Ledger (`pg-schema/stock.ts:172–198`) | Bigserial ID, org/item/warehouse/entry, signed qty/value, qtyAfter/rate, postedAt. | Exact decimal strings; sequence ID determines order. Include reversal provenance. F2 carries ledger IDs only as bigint strings (`Seq` in diagnostic-wire.md), never as a JS Number. The existing Number-typed surfaces `stkLedger.id` (`bigserial` mode `number`, `pg-schema/stock.ts:181`), `StkLedgerRow` (`stock.ts:348`) and `LedgerReplayRow.seq` (`stock.logic.ts:382`) must not carry F2 sequence identity; F2 reads ledger IDs as raw SQL text. |
| Bin (`stock.ts:200–211`) | Org/item/warehouse key, qty/rate. | Cache of latest ledger snapshot, not independent valuation source. Full union of ledger/bin keys must reconcile. |
| Accrual/COGS consumers | Realized entry/qty/value and financial report source references. | Discover and enumerate actual readers; do not assume a ledger change updates copied actuals/materialized reports automatically. Derived readers and copies are listed in [correction.md § Derived readers and copies](contracts/correction.md#derived-readers-and-copies). |

### Proposed artifact entities

The exact S1/S2 entities are [DiagnosticEvidenceManifestV1, ReceiptDiscovery and ValuationReplayPlan](contracts/diagnostic-wire.md), implemented/decoded/hashed by scripts/lib/faces-receipt-replay.ts from T003. Required/null fields, document absent/unverified/verified/mismatched states, original source/movement/consumer rows, coverage/read counts, checks/errors, basis hypotheses, numeric oracle and digest preimages are selected there; this model adds no alternate field names. Diagnostic complete/hypothetical results always have eligible:false and remain read-only. A complete absent-invoice numeric hypothesis is not an executable correction manifest.

Opening is the exact unknown/empty_verified/verified union. Zero exists only after complete no-prior-history proof; otherwise opening unknown. Source numeric text/row hashes retain original bytes. Stored line.uom is string|null; it is not the normalized stockUom in a separately owner-attested UnitQualification. That proof binds actual receipt/item/document/source row hashes, historical writer and conversion evidence; current item.uom cannot fill absent history. All copied/replacement/compensating line labels retain original null exactly.

US3 uses the separate strict ReceiptChainManifestV1 from [command-envelope.md](contracts/command-envelope.md), not the diagnostic manifest/report. Its correct basis imports DocumentBasis+UnitQualification and validators from the existing pure replay library; full writer manifest/payload/preview hashes bind the complete new unit proof. Its compensation basis/action literals remain restore_prior_before_snapshot/compensate, inheriting the prior actual immutable correct proof through priorManifestSha256/document hash and original→replacement map, not a new attestation by a deleted historical actor. Current executing owner and status reader are independently admitted under the existing contract.

### State transitions

Diagnostic read: source discovery → original-baseline verification → supported hypothetical or original-only unsupported/integrity/incomplete result. Document absent/unverified does not prevent complete explicit-hypothesis output; it prevents verified basis/executable eligibility. Mismatched documentary facts remain distinct and are never silently replaced. No prefix past a source/resource/support failure claims complete replay or conservation.

Separate execution: document/unit-qualified supported plan → exact owner-approved writer manifest → rehearsed → apply_requested → applied/unknown/refused → reconciled. Unsupported/inconsistent history blocks execution; any changed source fingerprint makes the approved writer plan stale. Unknown outcome resolves only through authoritative read, and repeat of an applied operation returns its immutable receipt without new effects.

### Arithmetic and validation

Use the four-decimal receipt admission and the Number movement policy and tolerances in [correction.md § Explicit accounting and precision proposal](contracts/correction.md#explicit-accounting-and-precision-proposal); retain original strings at artifact boundaries. Do not claim the Number engine is exact decimal arithmetic. Incoming receipt contribution is quantity×verified valuation-currency unit rate. Outgoing issue contribution is signed quantity×current moving-average rate. Running value evolves by adding signed value and quantity; rate is resulting value/quantity with existing zero/negative safeguards explicitly tested. Transfers/reversals/adjustments/second receipts are deterministically unsupported in this slice; record original facts but do not continue hypothetical replay or choose an unstated historical policy.

Oracle for verified total-mode basis: `5474.58 / 89 = 61.51213483146067…`, four-decimal rate `61.5121`, contribution `5474.5769`, cent display `5474.58`, residual `0.0031`. Do not silently change quantity to absorb residual. Quantity before/after for every ledger leg and terminal bin must remain identical; any permitted residual policy appears separately in approval.

Conservation: corrected receipt contribution plus pre-state and later unaffected incoming values equals corrected downstream outflow costs plus terminal remaining value, for the complete admitted receipt/ordinary-issue envelope only; any transfer/reversal/adjustment/second receipt stops hypothetical replay and invalidates conservation/apply claims beyond that boundary. Receipt-value delta equals downstream consumed-value delta plus closing-value delta only after full dependency closure and sign handling.

Every executable plan has 1–129 entries/lines/canonical ledger rows: one receipt plus 0–128 homogeneous issues, on exactly one item/warehouse key. Actual arrays and replacement IDs are discovered, approval-hashed and compared exactly; the ticket-consumer and accrual-consumer arrays each hold at most 128 references, each with exclusive source ownership. Observed 18/15/2 counts are fixture evidence only. Additional same-shape issues before a fresh approved preview are supported; any post-preview change is stale. Zero/negative post-receipt running quantity is explicitly unsupported in this slice, including a fully consumed terminal bin; record original facts but no hypothetical continuation/apply. F3 owns all shared operation schema/RLS/seed changes; F2 owns no independent correction table/migration.

ReceiptChainManifestV1.action is required: correct uses manifest.basis.policy verified_document_total and forbids inverseOfOperationId; compensate uses manifest.basis.policy restore_prior_before_snapshot and requires same-org applied correct receipt_chain operation UUID inverseOfOperationId. Its source_entry_id is that operation's currently live replacement receipt, not the original source; F3's partial unique index on `stk_corrections(org_id, source_entry_id)` where `kind='receipt_chain'` prevents a double inverse. Action/policy/inverse link are immutable JSON fields in the F3-owned receipt and approval hash. Only the explicit inverse may admit the verified prior-correction map; it restores prior frozen economic state through new compensating entries, never original statuses/IDs. Inverse-of-inverse is unsupported. Admission, algorithm and QA-finally behavior are in [correction.md](contracts/correction.md#explicit-compensating-action-and-manifest-discriminator).

Receipt actor is an immutable historical UUID in F3 storage. Read-only status uses a separately authenticated current owner-reader; it preserves the historical manifest and hashes after that actor is deleted. Exact field binding and negative tests are defined in contracts/command-envelope.md.

### Review artifact: contracts/command-envelope.md

## Receipt-chain manifest, hashes and owning API

This is the exact F2 command boundary supplementing correction.md, not a generic inventory replay API. Implement pure types/strict decoding/hashes in new src/server/services/faces-receipt-correction.logic.ts and .logic.test.ts. It imports only pure shared types/standard hashing/decimal validators, with no application alias runtime graph, DB client, executing CLI or environment reads. The CLI may statically import this pure decoder before bootstrap. The selected new faces-receipt-correction.service.ts owns actual transactions and imports this logic; scripts/lib/faces-receipt-replay.ts remains the pure arithmetic oracle. No second table/migration/HTTP route or new framework is selected.

### Complete exact manifest

```ts
type UUID = string;
type Digest = string; //64 lowercase hex
type EntryEvidence = {
  entryId:UUID,headerRowSha256:Digest,lineId:UUID,lineRowSha256:Digest,
  type:'receipt'|'issue',ledgerId:string,ledgerRowSha256:Digest,
  qty:string,uom:string|null,rate:string|null,qtyDelta:string,valueDelta:string,
  qtyAfter:string,valuationRate:string,
  source:{kind:'receipt',id:UUID}|{kind:'pos_ticket',id:UUID}|{kind:'booking',id:UUID}
};
type ConsumerEvidence =
  | {kind:'pos_ticket',id:UUID,rowSha256:Digest,currentEntryId:UUID,
      financialFiscalSha256:Digest,replacementEntryId:UUID}
  | {kind:'stock_accrual',id:UUID,rowSha256:Digest,currentEntryId:UUID,
      sourceType:'booking',sourceId:UUID,realizedQty:string,realizedValue:string,
      replacementEntryId:UUID,intendedRealizedValue:string};
type EntryReplacement = {sourceEntryId:UUID,replacementEntryId:UUID};
type ReplayEffect = {phase:'reverse_issue'|'reverse_receipt'|'receipt'|'issue',
  entryId:UUID,qtyDelta:string,valueDelta:string,qtyAfter:string,valuationRate:string};
type ReceiptManifestBase = {
  schemaVersion:1,kind:'receipt_chain',target:QualifiedOperatorTarget,
  sourceCodeSha:string,orgId:UUID,actorProfileId:UUID,operationKey:UUID,
  sourceReceiptId:UUID,sourceReceiptLineId:UUID,itemId:UUID,warehouseId:UUID,stockUom:string,
  entries:EntryEvidence[],consumers:ConsumerEvidence[],entryMap:EntryReplacement[],
  opening:{qty:string,value:string,valuationRate:string,ledgerId:string|null,rowSha256:Digest|null},
  before:{binRowSha256:Digest,latestLedgerId:string,latestLedgerRowSha256:Digest,
    itemRowSha256:Digest,ruleStateSha256:Digest,sourceStateSha256:Digest,
    financialFiscalSha256:Digest,policyStateSha256:Digest},
  intended:{receiptQty:string,receiptRate:string,effects:ReplayEffect[],
    terminalQty:string,terminalValue:string,terminalRate:string,netCogsDelta:string},
  postedAt:string,accountingTimezone:string,correctionMonth:string,
  reason:string,ownerApprovalReference:string
};
// Shared existing S1/S2 pure module, created in T003 before this US3 module:
import type { DocumentBasis, UnitQualification } from '../../../scripts/lib/faces-receipt-replay';
// Import decodeDocumentBasis/decodeUnitQualification from that same pure module.
// DocumentBasis retains policy verified_document_total and all prior fields,
// plus the exact unitQualification from contracts/diagnostic-wire.md.
export type ReceiptChainManifestV1 =
  | (ReceiptManifestBase & {action:'correct',basis:DocumentBasis})
  | (ReceiptManifestBase & {action:'compensate',inverseOfOperationId:UUID,
      basis:{policy:'restore_prior_before_snapshot',priorManifestSha256:Digest,
        originalDocumentSha256:Digest}});
export type ReceiptCorrectionCommand = {
  manifest:ReceiptChainManifestV1,approvedPlanSha256:Digest,previewHash:Digest
};
export type ReceiptCorrectionStatusInput = {target:QualifiedOperatorTarget,
  orgId:UUID,actorProfileId:UUID, // current authenticated status reader; not historical manifest actor
  operationKey:UUID,action:'correct'|'compensate',manifestSha256:Digest,
  manifest:ReceiptChainManifestV1};
```

QualifiedOperatorTarget is the exact F7 credential-free databaseIdentity/authProject/authUrl record. Reject unknown keys recursively, omitted required fields, correct-mode inverseOfOperationId, and mixed/wrong action/basis. An absent document means diagnostic hypothetical/ineligible; it cannot be represented as executable correct manifest. Compensation document SHA/prior manifest MUST equal the actual retained applied forward receipt and retained source, never caller-supplied replacement basis.

| Field or family | Accepted representation and bound | Cross-field invariant |
| --- | --- | --- |
| UUIDs and source-code identity | Canonical lowercase UUIDs; code SHA is exactly 40 lowercase hexadecimal characters. | Identifiers bind the approved source and replacement identities. |
| Ledger sequence IDs | Canonical positive PostgreSQL bigint strings, at most 9223372036854775807; never Number. | Sort numerically using BigInt. |
| entries | Exactly one receipt followed by 0–128 single-line issues in increasing original ledger order. | Unique entry/line/ledger IDs; one selected item and warehouse; first source.kind is receipt and its ID equals sourceReceiptId; each issue has its exact source kind and ID. |
| Positive quantities | Existing finite positive decimal admission: at most nine integer and four fractional digits. | Intended receipt quantity equals the original frozen quantity; new stock quantities retain F3 admission/oracle limits. |
| Original stored numeric evidence | Exact PostgreSQL text, including trailing zeros; at most 128 UTF-8 bytes. Signed values may have a minus sign but not plus, exponent, NaN, Infinity or negative zero. | Preserve the raw text in every source hash; do not decimal-normalize a hashed source fact. |
| Intended generated effects | Canonical finite String(Number-result) from selected source math, including exponent spelling when emitted; at most 128 bytes; reject nonfinite and negative zero. | Receipt rate follows manifest.basis.policy and the selected source-engine oracle. |

Generated PostgreSQL numeric text can expand an engine exponent: 1e-8 becomes 0.00000001. For generated-effect equality only, validate the actual numeric text against the same finite/magnitude oracle bounds and compare String(Number(actualText)) to the approved canonical engine string. This does not reserialize, weaken or replace any raw original-row fingerprint. Apply uses exact equality after that declared canonicalization; diagnostic tolerances do not authorize different approved effects.

entryMap has exactly 1 + issueCount distinct source→new UUID pairs in entries order; no ID equals an original or unrelated existing entry. Replay on the exact prior receipt is the only exception to “unused replacement UUID”. effects has exactly 2 × (1 + issueCount) records: reverse issues descending ledger sequence, reverse receipt, new receipt, new issues ascending sequence. A reversal effect entryId is its original source entry; replacement effect entryId is its preallocated new UUID. Quantities/values match the full source-engine replay and independent oracle, never caller authority. consumers has the complete exact actual set, at most 128 POS consumers plus 128 accruals; sort kind/id, no duplicate consumer ID. EntryEvidence.source.kind='pos_ticket' is the normalized projection of actual stock metadata source='pos'; 'booking' maps actual source='booking'. ConsumerEvidence.currentEntryId projects pos_tickets.stock_entry_id or stk_accruals.realized_entry_id respectively; sourceType='booking' projects actual stk_accruals.source, not a new database column. Each POS-owned issue has exactly one POS consumer and no accrual; each booking issue has exactly one same-source/item accrual and no POS pointer. Every replacement pointer belongs to the map; preserve expected reservation quantities. actual source/consumer row hashes use F3's raw PostgreSQL to_jsonb(row)::text under UTC, SHA-256 before driver JSON/date/number conversion; select only approved evidence fields in readable output. No raw customer, supplier, payment/fiscal row, credential or arbitrary metadata enters this manifest. financialFiscalSha256 binds the complete actual source-family digest defined by F3 workflow.md, including payment and applicable invoice/shift/emission evidence, not just a display total.

The complete same-key ledger segment/boundary, item/UOM/recipe, original and consumer row sets and selected policy digest MUST be independently reconstructed in the owning snapshot/guarded apply. Opening absent has qty/value='0', ledgerId/rowSha256=null, preserving actual zero versus unavailable; incomplete opening is ineligible, not fabricated zero. A boundary or count mismatch is stale/incomplete, never truncation. Rule/policy/source digests use the complete actual selected F3 source/stock/policy row-hash structures, and F7 trusted authority projection, in their fixed order; no opaque caller fingerprint substitutes those reads.

| Field | Required format or bound |
| --- | --- |
| postedAt | UTC timestamp with exactly three fractional digits and Z; exact Date round-trip. |
| accountingTimezone and correctionMonth | Verified IANA zone equals fresh finance settings; month is YYYY-MM containing postedAt in that zone and currently unlocked. |
| reason and owner reference | Each 1–1000 characters after trimming and NFC normalization. |
| currency | Actual verified three-uppercase-letter valuation code. |
| stockUom | 1–80 trimmed NFC characters. |
| Complete manifest | At most 1048576 UTF-8 bytes. |

Preallocated IDs, timestamp, actual source-code identity, reason and owner reference all bind approval. Documentary SHA strings reference separately owner-verified facts; they do not prove an invoice was read. Correct-mode DocumentBasis includes the exact UnitQualification from diagnostic-wire.md: actual receipt/item/document/source-row hashes, historical writer/stock-unit/conversion evidence and current owner attestation. Its source IDs/order/qty and raw nullable UOM must match the owning snapshot, and stockUom equals that separately qualified normalized unit; line.uom remains raw string|null, never filled with item.uom. Missing or contradictory historical proof blocks; today's unit alone cannot qualify a null source label. Full manifest/preview/payload hashes bind the new object. Compensation verifies and inherits it from the actual prior retained correct receipt/manifest hash, mapping current copies to prior original source IDs; it does not require the prior historical attestor to remain current owner. Current executing owner and status-reader admission remain separate. Both actions require current real membership ownership and the existing fresh capability, cost, module, period and effective-policy checks.

### Canonical projections and exact service signatures

Export decodeReceiptChainManifestV1(value:unknown), receiptManifestSha256(manifest), decodeReceiptCorrectionCommand(value:unknown) and decodeReceiptCorrectionStatusInput(value:unknown) from the pure logic module. Server calls strict decoders again; passing a TypeScript object from a trusted-looking CLI does not bypass validation. Canonical JSON is the F3 sorted-object-key UTF-8 algorithm with semantic array order above, no undefined/NaN/implicit dates. manifestSha256 hashes every normalized field of ReceiptChainManifestV1, including action/basis/inverse reference, approvals/evidence refs, actor/target, all original/mapped/consumer/effect facts and posting time. planSha256 is an output alias of this same digest. There is no planSha256/signature/previewHash field inside the manifest. approvedPlanSha256 is external and must equal manifestSha256.

previewHash = SHA256(canonical({schemaVersion:1,domain:'receipt_chain',manifestSha256,sourceStateSha256,stockStateSha256,policyStateSha256})). sourceStateSha256 covers actual complete entries/consumers/financial source digests; stockStateSha256 covers original exact ledger segment+latest/bin/opening/rules; policyStateSha256 covers actual qualified authority/module/period/timezone evidence. Observation/run time is output metadata only, not fresh-state comparison; approved postedAt is manifest intent and cannot change on retry. payloadHash = SHA256(canonical({schemaVersion:1,domain:'receipt_chain',orgId,actorProfileId,manifestSha256,previewHash})). Recompute every fresh-state hash before effects, never trust fields called hashes from the input.

```ts
export function previewReceiptCorrection(ctx:CoreCtx,
  manifest:ReceiptChainManifestV1):Promise<ReceiptCorrectionPreview>;
export function applyReceiptCorrection(ctx:CoreCtx,
  command:ReceiptCorrectionCommand,actor:Actor):Promise<ReceiptCorrectionResult>;
export function getReceiptCorrectionStatus(ctx:CoreCtx,
  input:ReceiptCorrectionStatusInput):Promise<ReceiptCorrectionStatus>;
```

These are the exact existing selected service-file exports, used by actual CLI and native tests. Preview/status each owns one nonlocking repeatable-read, read-only snapshot with F7 active-principal/authority first. Apply owns one F3 guarded transaction holding the [shared write gate](contracts/correction.md#shared-write-gate-and-authority-races), exact actor==ctx.profileId==manifest.actorProfileId, fresh real owner and all other established checks. The caller performs shared target/GoTrue/bootstrap admission before invoking the service; no outer transaction or service/global pool fallback.

ReceiptCorrectionPreview is `{schemaVersion:1,domain:'receipt_chain',outcome:'preview',eligible:true,manifestSha256,planSha256,previewHash,sourceStateSha256,stockStateSha256,policyStateSha256,intended:ReceiptManifestBase['intended']}`. Valid but unsupported/incomplete/document-unverified diagnostic inputs use the separate diagnostic wire in diagnostic-wire.md; no fabricated executable preview. The owning strict preview throws the fixed errors below when a manifest cannot execute.

ReceiptCorrectionResult is `{schemaVersion:1,domain:'receipt_chain',outcome:'applied',replayed:boolean,receipt:ReceiptChainReceipt}`. ReceiptChainReceipt is `{correctionId:UUID,operationKey:UUID,action:'correct'|'compensate',inverseOfOperationId:UUID|null,manifestSha256:Digest,previewHash:Digest,payloadHash:Digest,sourceReceiptId:UUID,replacementReceiptId:UUID,entryMap:EntryReplacement[],postedAt:string,accountingTimezone:string,netCogsDelta:string,terminalQty:string,terminalValue:string,terminalRate:string}`. The action determines basis and source refs exactly as correction.md; correct outcome cannot masquerade as an inverse.

Immutable storage: stk_corrections.before is `{entries,consumers,opening,stock:manifest.before}`; intended is `{domain:'receipt_chain',action,inverseOfOperationId:null|UUID,domainManifest:ReceiptChainManifestV1,manifestSha256,previewHash,payloadHash}`; after is `{receipt:ReceiptChainReceipt,entryMap,ledgerRows:{id:string,rowSha256:Digest}[],consumers:ConsumerEvidence[],actualEffects:ReplayEffect[]}`. after.consumers are the actual new pointer/value evidence with currentEntryId set to its replacement, recomputed row hashes and preserved source quantities; actualEffects compares the approved effects under the declared oracle. New actual generated ledger IDs are recorded after insert, not preallocated or guessed in approval. All full evidence fits the admitted caps and is inserted once in the same transaction as stock/ref/audit effects, never postcommit receipt augmentation. Audit contains IDs/digests and one correction row reference, not full raw evidence. No correction UPDATE/DELETE or extra schema field is selected.

### Status, CLI and failures

Status binds exact target/org/action/key/manifest digest and its current authenticated reader, then reads the authoritative same-org immutable receipt first after current authority admission. StatusInput.actorProfileId equals ctx.profileId and the verified current owner subject; manifest.actorProfileId remains the immutable historical operation actor and may differ. Only preview/apply require current actor equality with manifest.actorProfileId. Status never rewrites the supplied manifest or substitutes its reader into manifestSha256, previewHash or the original payloadHash. A currently admitted different owner can acknowledge the exact retained receipt after the historical actor is deleted; it cannot apply or compensate under that former actor identity. A matching committed receipt returns applied even if a later supported inverse/current-state change exists; report currentState:'matches'|'changed'|'compensated' separately. It never reruns apply, takes write-gate or FOR SHARE locks, requires an unchanged current source to acknowledge a stored commit or mints approval. Wrong supplied identity/digest/action is conflict, never a receipt from another intent.

ReceiptCorrectionStatus = `{schemaVersion:1,domain:'receipt_chain',outcome:'applied',receipt:ReceiptChainReceipt,currentState:'matches'|'changed'|'compensated'}` or `{schemaVersion:1,domain:'receipt_chain',outcome:'absent_before_unchanged'|'unknown',receipt:null}`. With no receipt, compare the complete approved before-state in that same authorized snapshot only when the exact manifest is separately available to status; otherwise outcome MUST be unknown. Status CLI requires --manifest PATH and StatusInput.manifest is required (strict original manifest matching the digest). This is a read-only comparison, not a guarantee that another in-flight transaction cannot later commit. Any same-intent retry re-enters the guarded same-key/digest path; mixed/unavailable facts remain unknown and block new writes. A wrong source receipt under another operation key never becomes no-op success.

Exact default preview flags: --org UUID --actor-user UUID --manifest PATH --output PATH. Apply adds mutually exclusive --apply --approved-plan-sha256 DIGEST --preview-hash DIGEST. Status instead adds --status --operation-key UUID --action correct|compensate --manifest-sha256 DIGEST and retains the same immutable manifest/org/output/target admission; --actor-user names the current authenticated status reader under the rule above, without rewriting the historical manifest actor. Reject mismatched supplied scope/action/key, duplicate/unknown flags, missing required fields or simultaneous status/apply before loading business graph. action is manifest-bound, never an independent undo switch. Existing package command is unchanged. Private inputs/output use mode 0600; write complete credential-free JSON to owned temporary path then atomic rename, clean temporary output on failure.

Fixed typed errors carry only code/status, never raw SDK/SQL/server messages: invalid_manifest/invalid_command/target_mismatch/actor_unavailable→exit 2; incomplete_evidence/read_unavailable→exit 3; stale_preview/key_reuse/source_conflict/unsupported_movement/period_unavailable/invariant_failed→exit 4; commit_outcome_unknown→exit 5. Outcome exits are in the single CLI table below. Transport loss around commit or postcommit output failure is unknown, not proof of rollback. Same-key authoritative receipt resolves it; no automatic new key, changed timestamp, fresh approval or inverse is generated. A code must be classified from the actual known boundary, never by parsing private error text. Current authority denial remains generic unavailable and reveals no foreign source state.

### Required executable proof

Pure decoder/hash tests cover every field family, nested unknown/omitted/mixed union key, size/numeric/bigint/date/array order/duplicate/reference bounds, exact stable correct and compensate vectors. Same key with changed action, basis, evidence/owner ref, replacement UUID, time, source/consumer/effect/target must conflict. Actual service/CLI tests cover exact owning signatures, replay/result/receipt placement, action-mismatched status, no-lock/no-write status, committed state later compensated, historical actor deletion with retained receipt/current different-owner acknowledgement and denied-reader negative case, no-receipt unknown versus complete before-snapshot comparison and transport/postcommit-output uncertainty. Exercise full decoder/API in existing ten native behaviors, including actual inverse and every source/consumer set/race/fault, actual source-created receipt/POS/booking null UOM preserved through original→replacement→compensation, missing/changed historical-unit proof refusal and retained prior unit attestation after its actor deletion. Keep exact registered names/counts; pure mocked tests do not replace real app_ledger/F3 migration/native evidence. No implementation test was run while authoring.

### Single CLI outcome and exit table

| Mode and outcome | Exit | Meaning |
| --- | --- | --- |
| Valid preview | 0 | Complete reviewable preview; no apply claim. |
| Apply applied or identical replay | 0 | Exact durable acknowledgement returned. |
| Status applied | 0 | Exact authoritative receipt returned; current-state annotation remains separate. |
| Status absent_before_unchanged | 4 | This snapshot matches the approved before-state without a visible receipt; it does not prove another in-flight transaction cannot commit and never authorizes automatic replay. |
| Status unknown or uncertain commit/output | 5 | No outcome guess or automatic write. |

The existing typed invalid/read/policy error codes retain exits 2/3/4 in the error contract above. Other files link to this table instead of restating it.

### Diagnostic versus executable basis

[diagnostic-wire.md](contracts/diagnostic-wire.md) is the independent strict S1/S2 input/result/hash boundary. Its shared DocumentBasis and UnitQualification types/validators live in scripts/lib/faces-receipt-replay.ts from T003; this US3 logic imports them by explicit relative pure-module path and reuses strict validation, never forks schemas. All other ReceiptChainManifestV1/action/command/service/result/status signatures and literals above remain authoritative. A diagnostic outcome/digest, absent invoice, assumed unit or reported hypothesis is not an executable correct manifest and cannot become approvedPlanSha256. New unitQualification fields are immutable business/evidence fields in the full writer manifest digest and intended.domainManifest.

### Review artifact: contracts/correction.md

## Selected receipt correction contract — owner approval pending

### Selection, evidence and alternatives

Use a bounded, atomic reverse-and-replay of the verified single-item/single-warehouse segment. Original entry lines and ledger rows remain immutable; append signed cancellation rows and create linked replacement entries. Reuse the transaction-accepting stock primitives designed in F3 rather than call separately committing public wrappers. F2 owns the valuation-case orchestration; F3 owns the shared primitive extraction and compatible bin locking. No zero-quantity revaluation type, new generic replay framework, ledger UPDATE/DELETE grant, broad legacy repair or direct bin rewrite is selected.

The [closure read](../../audits/2026-11-16-faces-followups/evidence/valuation-closure-read-summary.json), observed 2026-11-16T19:27:35.645Z, found 18 submitted entries, exactly 18 lines/ledger rows, one item/warehouse key, 15 realized accrual consumers and two POS ticket stock-entry pointers. This is the observed fixture, not a reusable hardcoded cardinality. Receipt STE-2026-00559 and its then-17 later issues account for 18 issued units. The supported homogeneous envelope below allows further ordinary issues through a fresh exact owner-approved manifest; any movement after preview invalidates that manifest. A multi-line/multi-item entry, transfer, reversal, second receipt or unsupported source requires separate design. The diagnostic uses the explicit support matrix below, not an unspecified broader replay engine.

Rejected alternatives: cancelling only the receipt fails negative-stock and downstream-cost consistency; rewriting bins is destroyed by rebuild and leaves COGS wrong; rewriting historical ledger breaks append-only evidence; value-only rows require new report/valuation semantics; generic transitive replay adds unnecessary implementation scope to this verified one-key case.

### Explicit accounting and precision proposal

Proposed policy for owner approval: post every reversal and replacement at one approved current correction timestamp, in the organization's accounting timezone and an unlocked current calendar month. Preserve original posted_at and payment/appointment dates. Earlier-period COGS remains as booked; the correction month carries the net COGS adjustment. `finance.service.ts:926,1036` aggregates signed issue ledger by ledger posted_at without filtering entry status, so original issues plus current reversals/replacements have this effect. Do not backdate rows or silently restate a locked prior period. Missing timezone, unsupported fiscal constraints, locked correction period or absent owner acceptance blocks apply. Ticket stock pointers may change under this narrowly approved stock-maintenance operation; ticket financial/fiscal fields never change and ordinary POS mutation gates remain intact.

For action correct, proposed cost basis is document-verified 89 stock units for valuation-currency total 5474.58, with the existing four-decimal unit-rate boundary: `divideDecimalToMinor(total,qty,4)` then `minorToDecimal(...,4)` from `src/lib/money/decimal.ts`. This rounds halfway away from zero and yields 61.5121, contribution 5474.5769 and separately disclosed residual 0.0031. Owner approval must accept that residual/cost allocation explicitly; the source invoice can instead disprove eligibility. No quantity adjustment absorbs a rounding residual.

For replacement stock movements preserve the existing `computeLegValue`/`applyLedgerDelta` Number arithmetic and canonical String persistence. This is a deliberate compatibility policy, not an exact-decimal claim. Do not add per-movement cent rounding or change the ordinary valuation engine in this item. Validate each finite numeric result and compare to an independent BigInt rational oracle with absolute currency-value/rate tolerance 0.00000001, quantity tolerance 0.000000001; discrepancies beyond either bound block. The observed fixture quantities are integral; later admitted quantities must satisfy existing four-decimal admission and the same finite/independent-oracle bounds, never an assumption that all future quantities are integral. Existing decimal helpers support output scales 0–6 and cover admission/report currency boundaries; they are not used to quantize moving-average replay to six decimals. Existing realized accrual values retain the established four-decimal rounding. Reports retain original numeric strings and disclose Number-based engine tolerance separately from the 0.0031 document residual.

### Implementation files and shared prerequisite

- `scripts/faces-receipt-correct-2026-11.ts`: owner/target/manifest admission, dry-run/apply/status CLI, private atomic output and failure handling.
- `src/server/services/faces-receipt-correction.service.ts`: `previewReceiptCorrection(ctx,manifest)`, `applyReceiptCorrection(ctx,command,actor)` and `getReceiptCorrectionStatus(ctx,statusInput)`; one transaction and narrow verified shape.
- `scripts/lib/faces-receipt-replay.ts`: pure original/corrected replay, complete fingerprints and numeric oracles, shared with discovery.
- `src/server/services/stock.service.ts`: F3 prerequisite exports the exact opaque guard/create/submit/cancel/bin and source-retry signatures in [shared transaction protocol](../124-stock-correction-workflow/contracts/transaction-protocol.md), preserving current public wrappers. `lockStockWrite` takes the [shared write gate](#shared-write-gate-and-authority-races); there is no alternate authority protocol. Posting accepts the server-approved timestamp; cancellation uses original signed effects.
- `src/server/services/activity.service.ts`: reuse existing `recordAuditInTx` at line 131 unchanged; no extraction or best-effort-only correction receipt.
- `src/server/db/pg-schema/stock.ts` and `supabase/migrations/20261116193000_stock_corrections.sql`: consume F3-owned shared correction operation storage described below, scoped RLS/indexes/grants. No backfill of live snapshots. The paired QA seed edit in `scripts/qa/seed/stock.ts` belongs to F3; ownership of every shared file is stated in [implementation-inventory.md](implementation-inventory.md).
- `src/server/services/pos.service.ts`: no F2 change. F3 makes `setPeriodLock` a participant in the shared write gate ([F3 participant table](../124-stock-correction-workflow/contracts/transaction-protocol.md)), so a period lock and a correction serialize; F2 adds no second lock protocol.
- `src/server/services/faces-receipt-correction.test.ts`, `.sql.integration.test.ts`, and `scripts/faces-receipt-correct-2026-11.test.ts`: pure, real-PostgreSQL transactional/concurrent and CLI gates.

No browser/API route, permission, message key or dependency is introduced. F3 shared primitives and migration qualification are required before this writer slice, but F2 does not require F3's UI or standalone receipt feature.

### Operation record and manifest

Reuse the F3-owned `stk_corrections` schema and single `supabase/migrations/20261116193000_stock_corrections.sql`, rather than add a second correction table. The exact shared fields/RLS/grants/nullability are in [F3 data model](../124-stock-correction-workflow/data-model.md). F2 kind is `receipt_chain`, source_type=`stock_receipt`. For action correct, source_id/source_entry_id are the original receipt UUID; for action compensate they are the prior operation's current replacement receipt UUID under the exact inverse contract below. replacement_entry_id is the newly submitted replacement/compensating receipt UUID. The immutable before/intended/after JSON snapshots contain the complete finite entry map, source/document/approval evidence, actor/reason, approved correction timestamp, consumer map and all numeric invariants. Global unique `(org_id,operation_key)` rejects cross-kind key reuse; partial unique `(org_id,source_entry_id) WHERE kind='receipt_chain'` prevents a second valuation correction of the same receipt. Completed status is applied; insert the completed row at transaction end, no operation UPDATE/DELETE or durable pending state. Composite non-null entry references resolve same org. All evidence is bounded to the admitted homogeneous envelope; no customer/supplier PII. F3 owns shared migration/seed/RLS qualification; F2 owns receipt_chain orchestration and tests. All F1/F2/F3 writers follow the exact shared transaction-protocol.md, including its maximum-three-attempt SQLSTATE policy; no policy-before-ticket variant is permitted.

The exact strict ReceiptChainManifestV1, action/basis union, decoders, complete canonical hash projections, owning preview/apply/status functions, immutable JSON placement and CLI flags/results are [command-envelope.md](contracts/command-envelope.md). approvedPlanSha256 stays external, with no circular intent hash.

CLI flags for preview, apply and status are defined only in [command-envelope.md § Status, CLI and failures](contracts/command-envelope.md#status-cli-and-failures). Shared operator-principal.ts authenticates the explicitly named actor; fresh authority verifies that actor is active owner of this exact organization with required stock and financial-cost access, never the first member or a payload-created identity. Database credentials are private connection inputs, never flags/output. Role remains app_ledger with org context; no elevated append-only bypass. Owner spec approval before code, owner merge and exact target/manifest/cost/period apply approval are separate gates.

### Atomic algorithm and locking

1. Preview owns one repeatable-read read-only snapshot, validates target/actor/org and entire expected shape, verifies the original baseline/pre-state and complete latest-key/bin equality, and computes corrected states plus every reference/value change. Absent invoice leaves hypothetical/ineligible output.
2. Apply starts one `withOrgCore` transaction, verifies target binding and calls `lockStockWrite` for the [shared write gate](#shared-write-gate-and-authority-races). Read existing immutable operation outcome; then lock all manifest source ticket/receipt rows in canonical UUID order, period/locking fresh authority rows, all manifest entry rows, all manifest accrual rows and sorted existing bin rows. Use exact helper signatures, participant inventory, lock key/mode, timeout/retry policy from that shared protocol. Authenticate remotely before this transaction; no network under locks.
3. Re-read all fingerprinted rows and the complete same-key ledger range/max sequence after locks. Require exact equality to the approved manifest arrays/counts inside the supported envelope: one receipt then 0–128 issues, all currently submitted and single-line/single-key, and every actual consumer uniquely linked as approved. Correct mode refuses cancelled/reversed/prior-correction effects; compensate mode admits only the prior immutable replacement map under the explicit inverse contract below. Observed 18/15/2 are fixture assertions only, not production constants. Compare source, document, period, quantities, values, metadata and unrelated financial digests. Any delta rolls back before writes; do not silently grow the manifest.
4. Reverse issues in descending original ledger sequence using original signed quantities/values; then reverse the receipt. Require recovered manifest pre-receipt opening state within declared tolerance (observed fixture 8 units  @ 250), no negative quantity or value and no guard fallback. Original entries become cancelled; original lines/ledger are retained. Cancellation rows use the approved correction timestamp.
5. Create corrected receipt copy with original supplier/note/UOM and metadata extended with `correctionOperation`, `correctionOf`, original posted date and approved document hash; replace only its admitted unit rate. Preserve the actual raw nullable UOM explicitly (`uom:originalLine.uom`), including null; never fill with item.uom or reapply a conversion. Submit it, then create/submit issue copies in ascending original sequence using original frozen quantities/item/warehouse/source metadata, never current recipes. Every new row uses the same approved timestamp. All source ownership fields survive; original cancelled records remain discoverable. There is no database source-uniqueness constraint on these entries: the only stk_entries unique index covers active invoice issues (`pg-schema/stock.ts:135–141`), and receipts have no source uniqueness. POS/booking duplicate prevention is the code-level non-cancelled source lookup (`insertSourcedIssueEntry` duplicate_source check, `stock.service.ts:1676–1688`; `findEntryBySource`, `stock.service.ts:1990–2011`). Because step 4 cancels every original before step 5 creates any copy inside the same gated transaction, that lookup sees only cancelled originals and admits exactly one submitted replacement per source.
6. Update exactly the manifest-enumerated `pos_tickets.stock_entry_id` references (observed two) by compare-before to their replacement issues; preserve warning, financial columns and dates. Update exactly the manifest-enumerated `stk_accruals.realized_entry_id` references (observed 15) and realized_value = String(round4(-sum(replacement issue value_delta))) from the exact admitted replacement issue/item ledger rows, using the existing round4 export from src/server/services/stock.logic.ts, as stock-accruals.service.ts imports it (not a new decimal policy); set `updated_at` to the approved correction timestamp, as `realizeAccruals` does (`stock-accruals.service.ts:446–452`); preserve status, realized_qty, realized_at, source and booking/payment facts. `pos_tickets` has no `updated_at` column, so ticket rows get no timestamp change. Reject additional consumer rows, mismatched quantities or ambiguous ownership. The observed qty 2 issue retains realized_qty 2 even if original expected accrual quantity 1; this is valuation-only and does not fix quantity-policy differences.
7. Assert every original header/line/ledger invariant, net correction quantity 0, unchanged manifest terminal quantity (observed fixture 79), final value/rate within approved oracle tolerance, complete sum/latest-ledger/bin equality, exact accrual/ticket updates, unchanged payments/fiscal facts/other items and tenants. Write one durable transactional operation audit and completed receipt. `submitEntryInTx` alone emits the existing `stock.entry_submitted` event once per newly submitted replacement entry: exactly 1+issueCount events (18 in the observed fixture), delivered on the same commit. Controllers emit no duplicate; cancellation emits none. Do not expand HubEvent payload or add correctionId: existing event entryIds join the durable after.entryMap. The shared helper returns `{entry,transitioned}` so normal wrappers retain their once-per-transition best-effort audit and public entry return contract. Commit all effects together. No intermediate cancellation state is durable or externally visible.

### Failure, retry and compensation

Error codes and exits are in [command-envelope.md](contracts/command-envelope.md#status-cli-and-failures). A lost connection around COMMIT is `unknown`, not failure evidence. Status verifies the immutable operation and replacement map plus authoritative state; retry same key/hash only after that read, returning prior receipt without new rows if committed. No receipt plus unchanged exact before-state permits a same-intent retry; mixed state requires manual investigation and zero further writes. Audit failure before commit rolls back everything; best-effort notification failure after commit cannot trigger replay.

Disposable QA undo always runs in `finally`. It exercises a separately fingerprinted inverse operation: reverse replacement issues latest-first then replacement receipt, recreate the original receipt unit rate and issue quantities in original order, restore all source pointers/accrual values to those compensating entries, preserve originals and both receipts, and verify original quantity/value/COGS net effects. Production undo is a new owner-approved manifest/operation in an open correction period; it refuses any intervening movement/reference change. Never delete ledger or operation evidence and never restore an old database snapshot over concurrent production state.

### Required proof

Synthetic fixture reproduces opening 8 @ 250, receipt 89 @ 5474.58 stored per unit, 17 issues totaling 18 units, 15 accruals and two ticket pointers. Independent expected rate 61.5121, receipt value 5474.5769 and remaining qty 79/value 6087.542011340212 under the selected source arithmetic are checked at declared tolerance. Test current-period signed COGS adjustment and unchanged prior-period COGS using both finance query paths; original cancellation/replacement discoverability; rebuildBins idempotence; no payment/date changes; manifest-enumerated rounded accrual costs (observed 15) and unchanged quantities; same/different-key concurrency; new issue racing the bin lock; simultaneous period lock; faults after each reversal/replacement/reference/audit step; response loss and authoritative status; repeated apply 0 effects; finally compensation; other-org denial and append-only grants. Assert the derived-reader expectations in [Derived readers and copies](#derived-readers-and-copies). Full Hub check/test/build and F3's migration/QA seed gates qualify the exact candidate. No such implementation proof has run in this document stage.

### Derived readers and copies

Besides the ticket pointers, accruals and the two finance COGS queries above, the pinned source has three more readers or copies of the corrected values. Their selected handling:

| Reader or copy | Source behavior at pinned commit | Selected F2 handling |
| --- | --- | --- |
| Business brain corpus | `brain-business-corpus.service.ts` copies `stk_accruals` (including `realized_entry_id`, `realized_value`, lines 113–131), `stk_entries` status, `stk_bins.valuation_rate` and `pos_tickets.stock_entry_id` (lines 453–470) into knowledge documents. Reindexing pages every row by ID (`cursorPredicate`, lines 1608–1611; `loadBusinessPage`, 1850–1868) and detects change by content hash (line 2006); `updated_at` only fills the `source_updated_at` metadata. The reconcile route is unscheduled (`src/lib/automations/system-automations.ts:118–130`). | No re-enqueue and no new trigger. The next reconcile run detects the changed ticket pointers, accrual values, entry statuses and bin rate by content hash; until then the corpus copy is stale, as it is after every ordinary stock write. Step 6 sets accrual `updated_at` so the copied `source_updated_at` is truthful. The corpus is not an authority for stock or finance values. |
| Stock overview chart | `getStockDailyFlow` (`stock.service.ts:2019–2036`) sums `value_delta` and issue `used_value` per UTC day of `posted_at`, not per accounting-timezone day. Reversal rows keep the original issue entry ID, so they count as issue rows. | F2 does not change the chart. All correction rows share one `postedAt`, so the chart shows one UTC-day bucket containing the net correction: `value_delta` equal to corrected minus original terminal value, and `used_value` equal to new issue cost minus reversed original issue cost. For the observed fixture these are about −392363.7155 and −89399.3276 (a negative "used" value). That UTC day can differ from the accounting-timezone day near midnight; the chart is a rolling window, not a period report, so the period policy is unaffected. |
| Last restock cost | `itemSupplyInfo` (`stock.service.ts:309–333`) takes the latest positive-quantity ledger row per item by `posted_at desc, id desc`. Issue-reversal rows are positive and share the correction `postedAt`. | Insert the replacement receipt ledger row after every reversal row (step 4 before step 5), so its higher ID wins the tie. Expected last restock cost: 61.5121 after `correct` and 5474.58 after `compensate`, with the supplier of the copied receipt. |

### Concrete terminal principal verification

Authenticate the terminal principal before opening the business snapshot: read the existing owner GoTrue access token only from private `FACES_OPERATOR_ACCESS_TOKEN` environment, never a CLI flag/scope field; construct the installed @supabase/supabase-js client against only the approved structured target.authUrl and private FACES_OPERATOR_ANON_KEY, FACES_OPERATOR_AUTH_URL (the only URL the token is sent to; target.authUrl must equal it) (no PUBLIC_SUPABASE_URL/anon-key fallback) with persistSession:false and autoRefreshToken:false, then call auth.getUser(token). Require a successful nonexpired authenticated user from that exact target; result user.id is the canonical profile ID (supabase-bridge.runtime.ts:95). For discovery/preview/apply it must equal the approved scope/manifest actor. Status authenticates its current owner-reader subject, which may differ from the immutable historical manifest actor, exactly as command-envelope.md defines; it never rewrites that historical actor or permits apply under another identity. No admin/service-role key, AUTH_DISABLED, gateway server token, email/name guessing or first-member fallback authenticates this operation. Missing/expired/invalid token, mismatched target or subject, or unavailable auth verification returns exit 2 before business-data reads. Never log or serialize token/SDK authorization headers; no automatic refresh/login is performed. Then verify active same-org membership and required fresh capabilities inside the owned read-only/apply transaction; the token alone grants no organization scope. Local QA uses only its loopback GoTrue counterpart and synthetic principal. Add expired/foreign/mismatched/unavailable-auth and token-redaction tests. This is a proposed implementation contract, not an auth call performed during drafting.

### Supported homogeneous envelope and deterministic replay matrix

The executable envelope is one named receipt, followed in ledger ID order by 0–128 ordinary submitted issues, with at most 129 entry headers/lines/ledger rows total. Every entry has exactly one line on the same item/warehouse/separately qualified normalized stock UOM, while its actual stored line.uom remains string|null; quantities are finite positive stock quantities admitted by current four-decimal rules. Each POS issue has exactly one matching current ticket stamp and no realized accrual; each booking issue has exactly one realized same-source/item accrual and no POS stock stamp. Maximum 128 ticket references and 128 accrual references; actual arrays/counts are discovered and approval-hashed, never inferred from the observed 2/15. Additional or ambiguous ownership/copies, mismatched realized quantities, unknown metadata source and new consumer schema are unsupported. The observed qty 2/expected qty 1 accrual is accepted only because realized_qty 2 equals that issue; expected reservation qty remains untouched.

Further ordinary same-shape issues before a new preview do not require a new engineering spec. Generate a new complete manifest, recompute terminal qty/value/consumer effects and obtain owner approval of that exact current impact. Any new row/reference after preview yields stale refusal and requires a new preview/approval, never automatic expansion/apply. More than 128 issues or a nonhomogeneous shape is unsupported and requires a new reviewed spec; do not silently truncate. This is a chosen resource boundary, not the literal 18-entry snapshot hardcoded as policy.

| Diagnostic movement shape | Selected handling |
| --- | --- |
| Verified same-key opening state, one affected receipt | Admit exact original source quantities/rate and the documented source-compatible receipt formula; hypothetical rate uses shared exact four-decimal admission. |
| Ordinary same-key issue, source pos or booking, single line | Admit in ledger sequence, preserve quantity, compute negative qty×current moving average; update running snapshot using existing source math. Track its exact actual consumer. |
| A second later receipt/positive or negative adjustment | Return unsupported_movement with original facts, complete:false,eligible:false; no hypothetical continuation. |
| Transfer to/from any warehouse, cancellation/reversal or unknown source | Return unsupported_movement with exact reason/provenance, complete:false,eligible:false; no original-or-corrected reversal policy is chosen implicitly. |
| Missing history, zero/negative post-receipt running quantity or unsupported value boundary, multi-line/multi-item, duplicate/ambiguous consumers | Return integrity/unsupported blocker; never substitute zero or partial correction. |

A useful factual discovery report can still record unsupported rows, but it MUST NOT claim a complete hypothetical replay, conservation or apply eligibility past the first unsupported boundary. Tests have exact unsupported outcomes for transfer/reversal/adjustment/second-receipt cases, not an implementer-selected either/or oracle. Original baseline and corrected homogeneous replay, raw differences/tolerances, complete latest-key/bin equality and exact source fingerprints remain mandatory.

Both discovery CLI and correction preview/status authenticate through F7-owned scripts/lib/operator-principal.ts (QualifiedOperatorTarget object and lean verified subject), then call F7-owned resolveFreshCapabilitiesReadOnlyInTransaction on their own read-only snapshot. Apply calls F7-owned resolveFreshOperatorCapabilitiesForWriteInTransaction and the direct required-module helper after both write-admission gates, within the shared row-lock order. These F7 interfaces/role parity/native read-only tests are prerequisites in the shared F3 transaction protocol; GoTrue verification alone is not database authorization.


### Exact shared principal contract and CLI modes

Import `verifyOperatorPrincipal` and `QualifiedOperatorTarget` from `scripts/lib/operator-principal.ts` (F7-owned). Its exact input is `Readonly<{accessToken:string;authUrl:string;anonKey:string;expectedProfileId:string;targetFingerprint:QualifiedOperatorTarget}>`, returning `Promise<Readonly<{profileId:string;authProject:string;verifiedAt:string}>>`; `QualifiedOperatorTarget = Readonly<{databaseIdentity:string;authProject:string;authUrl:string}>` is a qualified structured target, never an opaque SHA substituted for identity. The helper verifies the authURL/project binding; the caller verifies databaseIdentity in its owned DB snapshot before business reads. No repeated custom SDK/auth composer is implemented by F2. The concrete token requirements above describe this helper's behavior, not a second authentication implementation.

Every discovery/preview/status snapshot calls F7-owned `resolveFreshCapabilitiesReadOnlyInTransaction(tx,orgId,verified.profileId)` with no FOR SHARE/cache, using the exact FreshCapabilitySnapshot in F3 transaction-protocol.md. For this financial correction require active actual owner membership (fresh `membershipRole === 'owner'`; a custom organization role key is not substituted for membership ownership), enabled stock/POS/finances modules, stock:manage, pos:view, finance:view and `capabilities.fieldLevel('finance') >= SENSITIVE_FIELD_LEVEL` from `$lib/permissions`; preserve effective-authority narrowing and fail closed on unavailable policy. Apply rechecks through F7-owned `resolveFreshOperatorCapabilitiesForWriteInTransaction(tx,orgId,verified.profileId)` under F3's exact gate/order; the legacy locking adapter remains unchanged and is not used by these new operator writes. No business read relies solely on successful token verification or owner approval. F7 shared native read-only/parity qualification is a prerequisite.

Flags, the outcome/exit table and status semantics are defined only in [command-envelope.md](contracts/command-envelope.md#single-cli-outcome-and-exit-table). No status infers apply from absence alone. An expired token during recovery blocks status until an existing authorized current owner session is supplied; a different current owner may read an exact historical receipt without impersonating its actor, as command-envelope.md defines; it never permits blind reapplication.

A zero/negative post-receipt running quantity is deterministically unsupported for this bounded writer/replay, even a fully consumed terminal bin. No new zero-bin revaluation policy is implicit. Tests include that exact ineligible outcome; existing ordinary stock behavior is unchanged. The original receipt can start from a verified truly empty PRE-receipt state, because its admitted positive receipt then creates positive stock.


The existing field-tier modules are crm/finance/scheduling, not stock. Do not require or introduce a stock sensitive tier: ordinary authorized owners have stock field level 0. Native admission covers a real membership owner with custom role keys, stock:manage, pos:view and sufficient finance authority succeeding, while finance:view/tier/module loss fails before reading costs or applying; apply repeats the same effective checks under locks.

### Concrete Bun entrypoints and qualified connection

Add these exact package.json scripts:

- `faces:receipt:diagnose`: `bun --no-env-file scripts/faces-receipt-valuation-2026-11.ts`
- `faces:receipt:correct`: `bun --no-env-file scripts/faces-receipt-correct-2026-11.ts`

Use the F7 shared admitted Vite SSR operator-service-loader.ts (existing Bun shim unchanged and not preloaded); import business services dynamically only after argument, qualified-target and operator-principal admission. Both scripts read only the explicit private FACES_RECEIPT_DATABASE_URL for their owned connection, FACES_OPERATOR_ACCESS_TOKEN and FACES_OPERATOR_ANON_KEY for the existing-session verifier, and authUrl from the approved target in the manifest. No global SUPABASE_DB_URL/application-pool/.env.local/auth-URL fallback. Use F7's pure operatorDatabaseIdentity(connectionUrl,authProject) and the exact credential-free sorted-JSON encoding from F3 transaction-protocol.md; compare approved target.databaseIdentity before opening the connection. After connecting, compare actual current_database() to the parsed database and verify admitted app_ledger role, org/profile GUC and read_only in the owned snapshot. Remote connections verify TLS hostname/certificate; local plaintext additionally requires the actual owned disposable database marker. Inject that qualified database into ctx; do not let a dynamic import select a different pool. Reject invalid target before business reads and redact credentials/SDK headers in every error.

The target identity digest is not a credential or proof of server transport by itself. The shared helper's transport/host/port/database/authProject checks, actual database/role/GUC checks and authenticated subject are all mandatory. CLI/bootstrap tests include admitted loader/dynamic import ordering, absent private DB env with otherwise present global application env, changed identity/server database, credential rotation identity stability, invalid remote certificate and missing local marker. No global environment credential may make a failed private admission pass.


F7 owns the exact [operator bootstrap](../128-faces-receivables-audit/contracts/operator-bootstrap.md): installed Vite SSR with standalone Svelte compiler, no project/full Kit plugin/dotenv/HTTP listener, fixed aliases/three closed empty framework modules and actual Svelte/Paraglide graph. New commands do not preload the old Bun shim. F2 adds closed typed loader key receiptCorrection→src/server/services/faces-receipt-correction.service.ts in the same implementing slice where the file exists, and qualifies its actual package-process smoke. F3 similarly owns stockCorrections; initial F7 types do not import either missing future module. No generic path loader or component stubs. Smoke uses actual exact commands with invalid early-admission sentinels and valid owned QA, global app DB/auth/LLM credentials absent, dotenv/project-config canaries, and proof only injected qualified clients are used. Passing Vitest alias mapping alone is not CLI/runtime proof.


### Explicit compensating action and manifest discriminator

The same `faces-receipt-correct-2026-11.ts` CLI and service support `manifest.action: "correct" | "compensate"`. The discriminator is required in preview/apply/status and part of the immutable approval hash; there is no implicit undo flag, QA bypass or new endpoint. `correct` MUST omit `inverseOfOperationId` and retains the normal no-prior-correction admission above. `compensate` MUST contain `inverseOfOperationId: UUID`, naming one applied same-org `stk_corrections.id` of kind receipt_chain whose stored `intended.action` is `correct`. Inverse-of-inverse, missing/foreign/unknown operation or other kind is unsupported. Source evidence is the prior immutable operation plus its retained originals, not a client-provided historical rate.

For compensate, source/source_entry_id is the prior operation's currently live submitted replacement receipt from after.entryMap. Require its complete submitted replacement issue chain, quantities/source ownership/consumer pointers and latest-key sequence to match a fresh approved inverse manifest. No subsequent unrelated same-key ledger row, new consumer, changed mapping/UOM/period/payment/fiscal fact or already cancelled/replaced current entry may intervene. The prior correction's reversal/original rows before that replacement receipt remain immutable context; their existence is allowed only through this exact inverse discriminator and matching immutable map. Do not relax the ordinary correct-mode prohibition on prior corrected provenance.

Under the same first gate/authority/order/cap/precision/timeout contract, reverse the current replacement issues latest-first, then their receipt. Recover the prior approved opening state within the declared source-engine oracle bounds. Create a new receipt from the prior immutable before receipt's exact frozen quantity/rate/UOM/warehouse (the original 5474.58 stored unit rate in the observed fixture), then new issues with the original before quantities/source provenance in original ledger order, preserving each original nullable UOM exactly. This restores the prior before economic quantities/value/COGS, not its cancelled entry statuses/IDs. Every ticket pointer and realized-accrual entry/value is compare-before updated to these new compensating entries; expected reservation quantities/payment dates/amounts remain unchanged. No original entry/ledger is reactivated, overwritten or deleted.

Inverse cost admission uses `manifest.basis.policy='restore_prior_before_snapshot'` and frozen numeric strings from the immutable prior operation/retained originals, verified against one another; it does not run the corrected document-total→unit-rate formula or call the restored wrong historical rate a valid invoice basis. A normal correction uses `manifest.basis.policy='verified_document_total'`. Both policy/action choices are exact hash-bound manifest fields. Inverse preview must show the complete compensating impact and explicitly identify restoration of the known before-state; owner acceptance of that undo impact/current open period is independently required, not inherited from the first correction approval. Reject tampered restored-rate/quantity fields rather than honoring client edits. Inherited UnitQualification is read from the actual prior immutable correct domainManifest/receipt and checked against its retained originals/current copy map, document hash and priorManifestSha256. Its historical attestor need not remain a current member; new compensate authority belongs to the current independently authenticated owner. The inverse does not replace that attestor, relabel raw null UOM or mint new unit history. Normal document/currency/UOM checks still identify the original evidence; compensation does not manufacture a new supplier invoice.

Write a new immutable receipt_chain row/audit with its own operation key, actor, reason, inverse approval digest, `intended.action:"compensate"`, `intended.inverseOfOperationId`, prior-operation and original source references, and complete current→new entry map. These discriminator/reference fields live in existing immutable before/intended/after JSON, not another F2 schema column/table. `source_id/source_entry_id` is the prior replacement receipt UUID; `replacement_entry_id` is the new compensating receipt UUID. Thus the existing unique receipt_chain(org_id,source_entry_id) prevents a second inverse for that current receipt, while it does not collide with the initial correction whose source was the original receipt. Exact key/hash repeat replays the inverse receipt with zero effects; another key or an inverse against a no-longer-live map refuses. Status/recovery uses the same action/key/digest contract and outcome exit codes above.

New inverse rows use one approved current open timestamp, preserving old posted_at and earlier-period reporting. submitEntryInTx emits exactly 1+issueCount existing entry events at inverse commit; the controller emits none and writes one durable inverse audit. Prior originals, correction rows, both operation receipts and all maps remain discoverable. At no point does undo delete history, restore an old database snapshot or reset a bin directly.

QA finally runs this real compensate action with a pre-reviewed synthetic inverse manifest after a verified applied receipt, never private DELETE/UPDATE/reset SQL. If the initial apply demonstrably rolled back, finally verifies exact unchanged before-state and performs no inverse. If initial outcome is unknown, resolve the durable receipt first. An inverse failure fails the rehearsal and is recorded; cleanup may drop only its owned disposable schema after capturing failure, never masquerade as a successful compensation. Verify two applied operation receipts, preserved original/replacement/inverse evidence, before-equivalent net quantity/value/COGS, authoritative new pointers and inverse-repeat no-op. Production compensation additionally needs a fresh exact owner-approved inverse preview and qualified current state; it is not automatically run by a production finally block.

### Shared write gate and authority races

The shared write gate is F3's ordered pair of transaction-scoped advisory locks: first the per-org stock write lock (`stock-v1`), then the existing per-org policy lock `lockNavigationPolicy` (`hashtextextended(orgId, 112)`), both taken before any source/profile/period/entry/accrual/bin row lock. The guard returned by `lockStockWrite` holds both until commit or rollback. After the gate, row locks follow F3's order: source → period/fresh authority → entries → accruals → bins. Live authority/module writers and direct required-module reads participate in the same contract. Read-only reports, previews and status keep their own nonlocking consistent snapshots and never take the gate. The exact definition and participant inventory are in [F3 transaction-protocol.md](../124-stock-correction-workflow/contracts/transaction-protocol.md).

F3 owns the common ordered pair and its complete live authority/module writer inventory. F2 consumes its qualified lockStockWrite guard and assertStockModulesEnabledInTx; never reimplement the policy lock or accept cached module state. Recheck required stock/POS/finances directly in the same transaction after both gates, with absent-row=enabled and no placeholder insert, plus actual owner/effective finance authority. Both correct and compensate use this boundary. F2's existing native period/fiscal/permission behavior includes a newly inserted deny and absent-enabled-to-disabled module row using actual participating writer functions. If authority mutation commits first, apply refuses stale/denied with zero effects. If an admitted valid correction owns the pair first, the mutation waits for correction commit/rollback; success then later revocation is the allowed linearization. Do not require both orders to fail. F3’s exact two native insertion-race behaviors are prerequisite proof; no separate F2 policy framework.


### Exact realized cost sign and compensation oracle

Issue ledger value_delta remains negative; stk_accruals.realized_value is the positive consumed-cost projection used by existing stock-accruals.service.ts:437–450. For each exact admitted replacement issue/item, sum its signed issue rows, negate that sum, then apply existing round4 once and String serialization: realized_value=String(round4(-sum(value_delta))). Never store the raw negative issue sum, negate a receipt/reversal, take abs of arbitrary unexpected positives or change realized_qty/status/realized_at. Positive issue value_delta or inconsistent row membership is an invariant refusal, not an abs workaround.

Compensation uses the same convention on its new compensating replacement issue rows, restoring the prior positive source cost projection while historical original/reversal ledger signs remain intact. It never copies a negative ledger delta into the accrual. Independent fixed fixture expectations: corrected quantity 1 accrual '77.0575'; corrected quantity 2 accrual '154.115' (String(round4(...)) drops trailing zero, numerically 154.1150). Prior economic-state compensation quantity 1 '5043.6868'; quantity 2 '10087.3736'. Assert exact source serialization plus independent numeric expectations, negative ledger sums and positive accrual values distinctly; total finance COGS retains its source signed-ledger convention. These cases run within the existing admitted native consumer/compensation behaviors, no new unregistered suite.

The independent consumer fixtures use the following positive realized costs; issue ledger value deltas retain their negative sign.

| Frozen issue quantity | Corrected realized value | Compensation to prior realized value |
| --- | --- | --- |
| 1 | `77.0575` | `5043.6868` |
| 2 | `154.115` | `10087.3736` |

All F2 discovery/preview/status reads first call F7-owned assertActiveOperatorPrincipalReadOnlyInTx, loaded through the admitted closed activeOperatorPrincipal registry key, in the same owned snapshot, requiring an existing not-deletion-pending profile and active exact org before sensitive inventory. Mutation uses F3's guarded active-principal/org assertion plus fresh capabilities while holding the shared write gate. No F7→F3 import cycle is introduced.

Qualification requires F7's exact [authority bridge](../128-faces-receivables-audit/contracts/authority-bridge.md) migration `20261116190000_operator_authority_bridge.sql` before F3 correction storage/helpers. Both principal and capability admission consume its fixed same-transaction bounded projection under actual baseline ACL/RLS. Missing or mismatched function, scope, owner or catalog proof refuses; there is no global privileged connection, table-grant expansion or permissive fixture substitute. Read-only status/preview call the bridge function in read-only mode (F7 `readOperatorAuthorityReadOnlyInTx`, bridge argument `false`); apply calls `readOperatorAuthorityForWriteInTx` (argument `true`) after both write-gate locks.

The typed command-envelope.md is authoritative for exact flags (including external previewHash), result/status unions and immutable domainManifest/hash field placement; previews/status are nonlocking owned snapshots, and applied receipt acknowledgement is separate from later currentState. All future direct callers use these exact signatures.

### Nullable stored labels and normalized unit qualification

Pinned pg-schema/stock.ts:154–160 declares line.uom nullable; stock.service.ts:640–646 persists omitted UOM as null. insertSourcedIssueEntry at 1698–1713 omits the label after resolveConsumptionLines has produced stock quantity. Therefore a stored null is an ordinary source shape, not by itself an unsupported movement. EntryEvidence and every copied line preserve null and raw row hashes. A separate DocumentBasis.unitQualification, exactly diagnostic-wire.md, proves historical normalized stockUom and already-resolved quantities using known receipt/POS/booking writer contracts, actual source/item/doc hashes and owner-verified historical conversion evidence. Current item.uom cannot supply missing history. Missing/contradictory proof blocks application; no recipe/current conversion is replayed. Raw nonnull label contradiction also blocks.

The pure diagnostic DTO/decoder library exists from T003 before S1/S2; the US3 correction logic imports its shared DocumentBasis/UnitQualification definitions/validators. Keep all existing basis/action/status/result literals and transaction primitives unchanged. Within the existing homogeneous/consumer/inverse native behaviors, prove source-created null receipt/POS/booking labels stay null on all generations, while separately qualified stock units drive quantities/costs; changed-item/history evidence refuses without effects. No new native name or helper framework is introduced.

### Review artifact: contracts/diagnostic-wire.md

## Strict diagnostic wire — S1/S2, proposed

This is the complete read-only wire owned by **scripts/lib/faces-receipt-replay.ts** and its existing selected .test.ts. T003 implements these definitions before either diagnostic reader. It imports only standard hashing and the existing import-free decimal.ts via an explicit relative path; source stock math is passed as trusted function values after qualified loader admission, never eagerly imported through an application alias; no CLI execution, DB client, environment, correction service, future US3 module or F3 mutation helper. The separate executable ReceiptChainManifestV1 stays in command-envelope.md. Both share the pure DocumentBasis/unit validators defined here; no duplicate documentary schema is selected.

### Primitive and decoder rules

Every object below is exact-key. All displayed properties are required; null is permitted only where written, never replaced by omission/undefined/empty string/0. Reject unknown nested keys, duplicate JSON object keys, invalid unions, array duplicates and size excess before source reads (exit 2). JSON decoding must detect duplicate keys rather than relying on JSON.parse's last-key behavior. UUID is canonical lowercase UUID; Digest is 64 lowercase hex; CodeSha is 40 lowercase hex; Seq is positive decimal PostgreSQL bigint string <=9223372036854775807, sorted with BigInt. UTC is exact ISO UTC with three fractional digits and Z, Date round-trip; labels/references are trimmed NFC, no control characters. UOM labels 1–80 characters; references 1–256; approval/reason 1–1000. No document bytes, supplier/customer contact fields, URLs to download or arbitrary metadata object is admitted.

Raw is original PostgreSQL numeric text <=128 UTF8 bytes: plain signed decimal, no plus/exponent/NaN/Infinity/negative zero. Preserve all raw digits/trailing zeros and raw row hashes. Positive quantity input admits existing maximum nine integer/four fractional digits. Money/currency follows existing exact admission, with source currency uppercase 3 letters; document quantity/conversion/rate are positive plain decimals <=128 bytes and must pass the selected Number+oracle safety boundary before replay. Do not change source formulas or add intermediate cent rounding.

Engine is exactly finite canonical String(Number-result) <=128 bytes, including exponent spelling; negative zero is rejected. Generated PostgreSQL readback may expand an exponent: compare String(Number(actualText)) after finite/magnitude/oracle admission only for generated-effect equality. Never normalize raw original row/hash text. Rational is `{numerator:string,denominator:string}` reduced signed integer numerator/positive integer denominator, base10/no plus/no leading zero except 0; each <=4096 digits. Its BigInt oracle is independent of Number. A numeric/output bound breach is resource_limit/incomplete, never truncation or rounded equality.

### Documentary and normalized-unit types

```ts
type UUID=string; type Digest=string; type CodeSha=string;
type Raw=string; type Engine=string; type Seq=string; type UTC=string;
type Rational={numerator:string;denominator:string};
type UnitSource={entryId:UUID;lineId:UUID;headerRowSha256:Digest;lineRowSha256:Digest;
  sourceKind:'receipt'|'pos_ticket'|'booking';sourceId:UUID;
  writer:'receipt_stock_quantity'|'pos_normalized_stock_quantity'|'booking_normalized_stock_quantity';
  writerCodeSha:CodeSha;writerEvidenceSha256:Digest};
export type UnitQualification={schemaVersion:1;receiptEntryId:UUID;receiptLineId:UUID;
  itemId:UUID;itemRowSha256:Digest;documentSha256:Digest;documentLineReference:string;
  stockUom:string;documentUom:string;documentQuantity:string;stockUnitsPerDocumentUnit:string;
  historicalStockUomEvidenceSha256:Digest;conversionEvidenceSha256:Digest;
  verifiedByProfileId:UUID;verifiedAt:UTC;sources:UnitSource[]};
type AllocationEvidence={policy:'single_line'|'owner_verified_allocation';
  net:string;tax:string;freight:string;discount:string;inventoryCost:string;evidenceSha256:Digest};
type FxEvidence={sourceCurrency:string;valuationCurrency:string;rate:string;
  effectiveAt:UTC;sourceInventoryCost:string;totalValuation:string;
  conversionResidual:string;historicalValuationCurrencyEvidenceSha256:Digest;evidenceSha256:Digest};
type DocumentFacts={reference:string;documentLineReference:string;sha256:Digest;
  purchaseId:UUID|null;providerRef:string|null;quantity:string;uom:string;
  allocation:AllocationEvidence;fx:FxEvidence};
type DocumentInput=
 |{state:'absent'}
 |{state:'unverified';reference:string|null;sha256:Digest|null;facts:DocumentFacts|null}
 |{state:'owner_attested';facts:DocumentFacts;verifiedByProfileId:UUID;verifiedAt:UTC;
    approvalReference:string};
export type DocumentBasis={policy:'verified_document_total';reference:string;sha256:Digest;
  valuationCurrency:string;stockQty:string;totalValuation:string;fxEvidenceSha256:Digest;
  taxFreightAllocationSha256:Digest;roundingResidual:string;residualAccepted:true;
  unitQualification:UnitQualification};
type ReportedHypothesis={stockQty:string;stockUom:string;valuationCurrency:string;totalValuation:string};
export type DiagnosticEvidenceManifestV1={schemaVersion:1;kind:'receipt_diagnostic';
  target:QualifiedOperatorTarget;sourceCodeSha:CodeSha;orgId:UUID;actorProfileId:UUID;
  receiptEntryId:UUID;receiptLineId:UUID;approvalReference:string;
  document:DocumentInput;unitQualification:UnitQualification|null;
  hypothesis:ReportedHypothesis|null;residualAccepted:boolean};
```

QualifiedOperatorTarget is the existing F7 credential-free target shape. This pure module implements its structural decoder locally from the same selected shape (or an already-created pure type-only export), never imports an executing operator/correction CLI. The `--org`, `--entry` and `--line` flags must equal the manifest `orgId`, `receiptEntryId` and `receiptLineId`. Manifest bytes <=1048576; no document parser, download or file-content validation is selected. The owner supplies only attested facts/reference/digests. A digest establishes integrity/reference identity, not invoice access, delivery, conversion history or truth. For unverified document input with facts nonnull, reference and sha256 must equal facts.reference and facts.sha256; if facts=null either pointer may remain null. Documentary identity mismatches never silently rewrite supplied facts. Authenticate the executing owner and verify same-snapshot authority before admitting documentary assertions; every current diagnostic attestor must equal that owner and verifiedAt cannot exceed snapshot observation. An unverified factual claim is not upgraded merely because the caller is owner.

UnitQualification is a separately owner-attested **normalized stock quantity** proof. sources contains exactly the discovered receipt and 0–128 admitted issues in ledger order (receipt first), IDs/hashes/source kinds matching actual source rows and writer kind matching that source; no arbitrary writer/URL. It names the actual historical writer revision/evidence establishing that its stored qty was already in this verified stockUom. Source code shape alone is not proof which revision wrote a historical row. historicalStockUomEvidenceSha256 and conversionEvidenceSha256 reference owner-verified historical item/document conversion evidence; current item.uom alone never proves it was historically frozen. Require the actual current item row/hash and unit fields to match that approved proof; changed/contradictory unit history blocks even when quantities look equal. Document quantity × verified factor must equal frozen receipt stock qty by independent rational arithmetic. A label spelling match is not a conversion. No missing historical factor is guessed.

Raw line.uom is string|null. Preserve it exactly, including null, in reads, entry evidence, hashes, replacements and compensating copies. Null is admissible only with the complete historical normalized-unit proof and the known writer's stock-quantity semantics above. A nonnull stored label must agree with the proved source stock unit; a contradiction blocks. If source qtyConsumption was converted before persistence, this proof concerns the already-resolved stored stock quantity; do not apply today's conversion or recipe again. Missing proof may still support an explicitly assumed-unit hypothetical diagnostic, never verified basis/writer eligibility. Compensation checks/inherits the prior immutable qualified unit proof and actual retained hashes; it does not require that historical attestor to remain a current member. Its current executing owner/reader is independently admitted.

For verified document basis, allocation.inventoryCost=net+tax+freight-discount by exact decimal rational arithmetic. Those are allocations to this one inventory line, not totals automatically assigned from a multi-line invoice. Single_line requires evidence of sole-line attribution; owner_verified_allocation requires its named evidence. fx.sourceInventoryCost equals that inventoryCost. fx.totalValuation=sourceInventoryCost×rate+conversionResidual exactly; residual is signed explicit documentary conversion evidence, not a new FX rounding engine. historicalValuationCurrencyEvidenceSha256 references the owner-verified historical stock denomination; no stk_entries/stk_bins currency column is invented and current finance currency cannot substitute. Same-currency evidence has rate 1 and conversionResidual 0. Foreign FX must match historical metadata where present; absence requires the attested historical evidence, not current Finance defaults. The proposed four-decimal receipt-rate residual is separately calculated below and residualAccepted must be true before exporting DocumentBasis. Neither conversion residual nor rate residual changes stock quantity. Source/header metadata contradictions produce mismatched facts, not a new policy.

### Exact safe source and check DTOs

```ts
type ScalarEvidence={state:'missing'|'null'|'value';value:string|null};
type EntryHeader={id:UUID;humanId:string|null;type:string;status:string;postedAt:UTC|null;
  rowSha256:Digest;purchaseId:ScalarEvidence;providerRef:ScalarEvidence;
  currency:ScalarEvidence;fxRate:ScalarEvidence;fxUpdatedAt:ScalarEvidence};
type EntryLine={id:UUID;entryId:UUID;itemId:UUID;qty:Raw;uom:string|null;rate:Raw|null;
  fromWarehouseId:UUID|null;toWarehouseId:UUID|null;lineNo:number;rowSha256:Digest};
type Movement={id:Seq;entryId:UUID;itemId:UUID;warehouseId:UUID;postedAt:UTC;
  qtyDelta:Raw;valueDelta:Raw;qtyAfter:Raw;valuationRate:Raw;rowSha256:Digest;
  header:EntryHeader;lines:EntryLine[];
  source:{kind:'receipt'|'pos_ticket'|'booking'|'invoice'|'unknown';id:UUID|null};
  reversalOfLedgerId:Seq|null};
type Consumer=
 |{kind:'pos_ticket';id:UUID;rowSha256:Digest;entryId:UUID;financialFiscalSha256:Digest}
 |{kind:'stock_accrual';id:UUID;rowSha256:Digest;entryId:UUID;sourceType:string;
    sourceId:UUID;itemId:UUID;realizedQty:Raw|null;realizedValue:Raw|null;
    realizedAt:UTC|null;status:string};
type Opening=
 |{state:'unknown';priorLedgerId:null;priorRowSha256:null;qty:null;rate:null;valueEngine:null}
 |{state:'empty_verified';priorLedgerId:null;priorRowSha256:null;qty:'0';rate:'0';valueEngine:'0'}
 |{state:'verified';priorLedgerId:Seq;priorRowSha256:Digest;qty:Raw;rate:Raw;valueEngine:Engine};
type SourceEvidence={receipt:EntryHeader|null;line:EntryLine|null;
  item:{id:UUID;rowSha256:Digest;stockUom:string;consumptionUom:string|null;unitsPerStockUom:Raw|null}|null;
  warehouse:{id:UUID;rowSha256:Digest}|null;
  bin:{rowSha256:Digest;qty:Raw;rate:Raw}|null;opening:Opening;
  context:Movement[];affected:Movement[];boundary:Movement|null;consumers:Consumer[]};
type Coverage={readsComplete:boolean;contextComplete:boolean;affectedComplete:boolean;
  consumersComplete:boolean;baselineComplete:boolean;hypotheticalComplete:boolean;
  contextCount:number|null;affectedCount:number|null;consumerCount:number|null;
  contextReadCount:number;affectedReadCount:number;consumerReadCount:number;lastReadLedgerId:Seq|null;
  latestSameKeyLedgerId:Seq|null;maxObservedLedgerId:Seq|null};
type CheckField='document_identity'|'quantity'|'stock_unit'|'currency'|'fx'|'allocation'|
  'opening'|'baseline'|'quantity_preservation'|'conservation'|'latest_bin'|'source_consumers';
type Check={field:CheckField;state:'matched'|'mismatched'|'unknown';
  expected:string|null;actual:string|null;evidenceSha256:Digest[]};
type Code='document_absent'|'document_unverified'|'document_mismatched'|
  'hypothesis_disagrees_with_document'|'cost_basis_missing'|'unit_unverified'|'unit_mismatched'|
  'fx_unverified'|'fx_mismatched'|'allocation_unverified'|'allocation_mismatched'|
  'residual_unaccepted'|'source_unavailable'|'schema_mismatch'|'read_failed'|'timeout'|'resource_limit'|
  'baseline_mismatch'|'quantity_mismatch'|'latest_bin_mismatch'|'conservation_failed'|
  'consumer_unresolved'|'consumer_mismatch'|'unsupported_source'|'unsupported_multiline'|
  'unsupported_multikey'|'unsupported_second_receipt'|'unsupported_transfer'|
  'unsupported_reversal'|'unsupported_adjustment'|'unsupported_zero_quantity'|
  'unsupported_negative_value'|'unsupported_issue_cap'|'outside_numeric_oracle';
type DiagnosticError={code:Code;stage:'input'|'read'|'document'|'baseline'|'support'|'replay'|'output';
  entryId:UUID|null;ledgerId:Seq|null;consumerId:UUID|null;limit:number|null};
type DocumentAssessment={state:'absent'|'unverified'|'verified'|'mismatched';
  documentSha256:Digest|null;unitState:'unknown'|'unverified'|'verified'|'mismatched';
  verifiedBasis:DocumentBasis|null;checks:Check[]};
```

All arrays are required. Only when the corresponding coverage flag is true does an empty array establish completed zero-row discovery. Otherwise it is an explicitly partial/unread prefix, not proof of zero rows; total counts remain null until the collection scan completes, while *ReadCount reports exactly the safe emitted prefix count. Source nulls are absence only after completed lookup; with readsComplete=false they are unavailable, explained by the required errors. Boundary contains only the first observed nonadmitted cap/support row, or null when no such row was observed. Unknown source/owner is explicit kind unknown/id null, not inferred from display text. Source metadata scalar absence and explicit JSON null stay distinct. value is nonnull only for state value; source fx numeric text is selected directly in SQL before driver Number conversion. An object/array/boolean in a scalar key is schema_mismatch exit 3, with no arbitrary metadata copied. Source mappings are stk_entries metadata purchaseId/providerRef/currency/fxRate/fxUpdatedAt, the exact stock entry/line/ledger/bin/item columns, pos_tickets.stock_entry_id and stk_accruals.realized_entry_id/source fields. The database has no receipt valuation-currency column: an absent historical currency/FX fact remains unknown until the supplied historical evidence qualifies it. Never infer it from current settings. Header/line/ledger/consumer hashes use raw PostgreSQL to_jsonb(row)::text under UTC SHA256 before driver conversion; preserve nullable labels and raw numeric bytes. All source joins constrain actual org equality; foreign references produce generic source_unavailable with no foreign record payload.

context is the complete same-key prefix strictly before receipt; affected is receipt through exact latest same-key sequence. Sort both by numeric Seq and reject duplicates; consumers sort by kind,id. Line arrays sort lineNo then UUID, retain all actual lines so multiline is explicit, not first-row selected. Source/history context cap 10000 canonical rows, at most 129 affected entries, at most 128 issues, and at most 128 consumers of each kind. Probe limit+1; never call an omitted overflow row complete. Diagnostic errors sort stage, numeric ledger ID(null last), entryId,consumerId,code; checks sort fixed CheckField order above. References/hash sets sort lexicographically and deduplicate. No invalid source row is deleted merely to fit a supported shape. reversalOfLedgerId is provenance only when uniquely proved from retained same-entry original/inverse signed rows; the schema has no such column. Otherwise keep null and use actual cancelled status/duplicate-entry ledger evidence to classify reversal unsupported, never invent a matching link. The 129th issue is recorded as boundary with unsupported_issue_cap/limit 128, affectedComplete=false and affectedCount=null; it is never admitted (it would be the 130th affected entry).

### Replay/oracle output and closed outcomes

```ts
type OracleCheck={expected:Rational;engine:Engine;absoluteDifference:Rational;
  tolerance:'0.00000001'|'0.000000001';passed:boolean};
type ReplayRow={ledgerId:Seq;entryId:UUID;qtyDelta:Raw;
  original:{valueDelta:Raw;qtyAfter:Raw;valuationRate:Raw};
  intended:{valueDelta:Engine;qtyAfter:Engine;valuationRate:Engine};
  oracle:{valueDelta:OracleCheck;qtyAfter:OracleCheck;valuationRate:OracleCheck}};
type ConsumerEffect={kind:'pos_ticket'|'stock_accrual';id:UUID;entryId:UUID;
  originalCost:Raw|null;intendedCost:Engine;costDelta:Engine;quantity:Raw;
  oracle:OracleCheck};
type ReplayTotals={originalReceiptValue:Raw;intendedReceiptValue:Engine;
  receiptValueDelta:Engine;originalConsumedValue:Engine;intendedConsumedValue:Engine;
  consumedValueDelta:Engine;originalRemainingValue:Engine;intendedRemainingValue:Engine;
  remainingValueDelta:Engine;terminalQty:Raw;intendedTerminalQty:Engine;
  conservationDifference:Engine;quantityDifference:Engine};
type BasisChoice={source:'reported_hypothesis'|'verified_document';stockQty:string;stockUom:string;
  valuationCurrency:string;qualifiedSourceValuationCurrency:string|null;
  comparison:'verified_currency'|'assumed_currency_numeric_only';totalValuation:string;receiptRate:string;
  receiptContribution:Rational;rateRoundingResidual:Rational;centDisplayTotal:string};
type Common={schemaVersion:1;orgId:UUID;receiptEntryId:UUID;receiptLineId:UUID;
  sourceCodeSha:CodeSha;target:QualifiedOperatorTarget;readOnly:true;eligible:false;
  diagnosticManifestSha256:Digest;source:SourceEvidence;coverage:Coverage;
  document:DocumentAssessment;errors:DiagnosticError[];blockers:Code[]};
export type ReceiptDiscovery=
 |(Common&{mode:'discovery';outcome:'complete';complete:true;
     basisChoice:BasisChoice|null;readiness:'unverified'|'mismatched'|'document_qualified'})
 |(Common&{mode:'discovery';outcome:'incomplete'|'integrity'|'unsupported';complete:false;
     basisChoice:null;readiness:'blocked'});
export type ValuationReplayPlan=
 |(Common&{mode:'hypothetical_replay';outcome:'complete';complete:true;hypothetical:true;
     readiness:'unverified'|'mismatched'|'document_qualified';basisChoice:BasisChoice;
     rows:ReplayRow[];consumerEffects:ConsumerEffect[];totals:ReplayTotals;checks:Check[]})
 |(Common&{mode:'hypothetical_replay';outcome:'incomplete'|'integrity'|'unsupported';complete:false;
     hypothetical:true;readiness:'blocked';basisChoice:null;rows:[];consumerEffects:[];totals:null;checks:Check[]});
export type DiagnosticReport={metadata:{runId:UUID;observedAt:UTC;snapshotId:string;
  outputReference:string|null};diagnosticManifestSha256:Digest;reportSha256:Digest;
  result:ReceiptDiscovery|ValuationReplayPlan};
```

S1 uses discovery; S2 uses hypothetical_replay only when a usable explicit hypothesis or verified basis exists. Without either, return complete discovery with basisChoice null, document_absent/unverified+cost_basis_missing and exit 0; do not fabricate a zero expected rate. Complete hypothetical absent/unverified documentary evidence is allowed when the separately named reported hypothesis is internally usable and frozen receipt quantity equals hypothesis stockQty; readiness unverified and eligible remains false. It is numeric explanation under explicit stock-unit/currency assumptions, not verified historical unit truth. No original source labels are filled from that assumption. qualifiedSourceValuationCurrency is null unless historical stock denomination is independently owner-verified and consistent with stored FX facts; reported-hypothesis valuationCurrency is an assumption only. Unknown denomination gives comparison=assumed_currency_numeric_only: totals/deltas are conditional numeric examples under that explicit common-currency assumption, never actual historical-currency COGS/value claims. A contradictory known source denomination blocks that hypothesis as currency mismatch rather than converting with current FX. Verified currency comparison requires the attested historical denomination equal basisChoice.valuationCurrency.

Owner_attested facts become document.state verified only when exact receipt/line/item/document references, historical currency/FX/allocation and UnitQualification cross-checks match; missing proof stays unverified; contradictory evidence is mismatched, never silently corrected. The same verification against frozen facts applies when a documentary basis contains a purchase/provider reference; absence of a purchase module row alone does not invent or disprove a paper invoice. A nonempty supplied reference that conflicts with actual same-org source metadata is a mismatch. Recompute all checks from explicit evidence and actual source. verifiedBasis is nonnull only when verification, residual acceptance and exact units all pass; its rate rounding residual is computed, not a caller override. Hypothesis disagreeing with verified basis adds hypothesis_disagrees_with_document/readiness mismatched; choose the verified_document basis explicitly, retaining the hypothesis in manifest evidence. A mismatched document can support only a separate internally usable reported hypothesis, tagged reported_hypothesis/readiness mismatched; never use its mismatched documentary values as a verified basis.

Readiness is exactly mismatched when document.state is mismatched or hypothesis_disagrees_with_document exists; otherwise document_qualified only when verifiedBasis is nonnull; otherwise unverified. unitState is unknown when qualification=null, unverified when supplied qualification cannot yet be documentary-admitted, mismatched on a contradictory source/unit check, and verified only when all its source/document/historical-unit checks pass.

For both choices use existing divideDecimalToMinor(totalValuation,stockQty,4) then minorToDecimal(...,4), halfway away from zero. ReceiptContribution is the exact rational stockQty×four-decimal rate; rateRoundingResidual=totalValuation-contribution; centDisplayTotal uses existing decimalToMinor(contributionExact,2) then minorToDecimal(...,2), retaining its halfway-away display policy; it does not change persisted movement values. Example 89/5474.58 produces rate 61.5121, rational contribution 5474.5769 and residual 0.0031, cent 5474.58. Thereafter intended movement fields are source-compatible computeLegValue/applyLedgerDelta **Number** outputs serialized with String, not rounded to cents. Oracle checks independently use reduced BigInt rationals and the existing value/rate 1e-8, quantity 1e-9 absolute thresholds. Require every passed flag true for complete replay; abs differences use exact rational comparison. Original baseline first replays stored signed deltas and validates each stored qtyAfter/rate plus complete latest/bin equality; failure gives integrity with no hypothetical prefix. Verified truly absent prior history alone yields empty_verified opening 0; missing/read-denied history yields unknown, never zero.

For each supported issue intended cost is negative ledger value; consumer accrued cost is String(round4(-sum(issue value_delta))) using existing round4 once. Preserve realizedQty and distinguish originalCost=null (unknown) from actual 0. Complete known consumers require exact source ownership and nonnull required original cost; unavailable consumer evidence blocks completion, never 0. POS issue cost uses exact negative original/replacement issue sum; realized accrual uses its stored positive cost and existing four-decimal projection. Totals originalConsumedValue/intendedConsumedValue sum unrounded positive issue-ledger costs, not rounded copied accrual fields. ConsumerEffect reports those accrual projection differences separately, avoiding an invented cent/four-place conservation adjustment. Totals compare original versus intended receipt/positive consumed cost/terminal value, preserve signed delta convention intended-original, and require receiptValueDelta=consumedValueDelta+remainingValueDelta within the existing oracle. No receipt total is labelled current stock value.

Unsupported includes second receipt/transfer/reversal/adjustment/multiline/multikey/unknown owner, zero-or-negative post-receipt quantity (including terminal 0), negative value/fallback and consumer ambiguity. Return original-only source evidence, first exact boundary code and complete:false/eligible:false, hypothetical rows[]/totals null. Even if original reads are complete, coverage.hypotheticalComplete=false; no hypothetical continuation or conservation claim past that boundary. Multiple discovered blockers are retained sorted; unsupported is not a partial successful plan. Baseline mismatch/quantity/bin/conservation/oracle violation is integrity. Failed/partial schema/read/deadline/resource scan is incomplete, never a fake complete prefix. Precedence: incomplete source/resource → integrity baseline → unsupported support matrix → complete documentary/hypothetical result. More than 128 issues is unsupported (exit 4); context 10000/report 20 MiB/manifest 1 MiB or deadline/read failure is incomplete (exit 3, malformed input size is exit 2). incomplete source may contain only safe actually-read original evidence with coverage flags false and lastReadLedgerId; never guessed latest/counts. If safe report cannot fit 20 MiB or output fails, publish no report and no digest/complete claim; credential-free exit 3 only.

### Digest projections, pure exports and vectors

Export parseDiagnosticManifestJson(text:string):DiagnosticEvidenceManifestV1 and strict decodeDiagnosticEvidenceManifestV1, decodeReceiptDiscovery, decodeValuationReplayPlan, decodeDiagnosticReport, decodeUnitQualification, decodeDocumentBasis, diagnosticManifestSha256 and diagnosticReportSha256 from the pure replay module. These export names are fixed for T003; no implementation-time schema invention. parseDiagnosticManifestJson uses a bounded recursive-descent JSON token reader with a decoded-property-key Set per object, rejecting duplicate keys before constructing values; JSON.parse may decode individual primitive/string tokens but never supplies last-key-wins objects. Enforce input byte/depth bounds (maximum 64 nested containers) before recursion; a breach is invalid manifest/exit 2. Functions never perform I/O. CLI re-decodes result before atomic serialization. The corrective pure logic module imports DocumentBasis/UnitQualification as erased relative types plus their pure validators from this existing module; it does not execute the diagnostic CLI or depend on a future reader/writer.

canonical(x) sorts object keys recursively by Unicode code point, retains semantic array ordering above, uses UTF8 JSON with no insignificant whitespace, undefined, dates or numeric coercion. Diagnostic manifest hash is SHA256(canonical(E)). Exact selection: E={schemaVersion,kind,target,sourceCodeSha,orgId,receiptEntryId,receiptLineId,document,unitQualification,hypothesis,residualAccepted}; document owner_attested projects only {state,facts}; UnitQualification projects all fields except verifiedByProfileId/verifiedAt. Those identity/time values are admitted and retained privately but excluded from stable diagnostic identity. Source-writer CodeSha/evidence hashes, historical unit/doc conversion evidence and every source ID remain included. The executing actor/approval reference is report-run admission metadata, not economic evidence. Altered authority still denies the run; this hash grants no approval. Input refs are logical references, never local file paths; diagnostic CLI manifest/output paths/connection credentials are not fields in E.

Report hash is SHA256(canonical({schemaVersion:1,domain:'receipt_diagnostic',diagnosticManifestSha256,result:R})). R is every result field except diagnosticManifestSha256 (already outside); it includes all raw source strings/hashes, coverage/error/blocker/outcome/complete/document checks, hypothetical assumptions/oracle/residual/consumer effects. Within result.document.verifiedBasis.unitQualification apply the same attestation-only projection above; no owner-observation metadata is an economic value. metadata runId/observedAt/snapshotId/outputReference and reportSha256 itself never enter this preimage. Original source posted times, original row hashes, actual source facts and hypothesis/document/unit changes do enter it. Same admitted business/evidence state in another run/path yields identical digests; changed null UOM, source row bytes, document evidence or hypothesis changes them. Writer manifest hash separately covers its entire executable manifest, including actor, approval, posting time and complete unitQualification; do not substitute a diagnostic digest for approvedPlanSha256/previewHash.

Strict decoder/output/hash fixtures: absent document+hypothesis=null → complete discovery/null basis/exit 0; absent/unverified document+89-total hypothesis → complete hypothetical/unverified/eligible false/exit 0 with exact oracle/residual; fully attested matching document/unit evidence → document_qualified/verifiedBasis but diagnostic eligible false; wrong quantity/doc/FX/allocation/unit → mismatched checks, no verifiedBasis, only explicit independent hypothesis may replay; baseline mismatch → integrity/rows[]/exit 4; second receipt/transfer/reversal/adjustment/unknown source/zero-ending → original-only unsupported/exit 4; context/report/deadline/read/schema overflow → incomplete or no published report/exit 3, never fake prefix. Mutate every required/null/nested/union/numeric/order/hash family; raw null-UOM POS/booking/receipt survives serialization and qualified replay, and changed/unknown historical unit proof blocks writer. Add unknown versus actual 0 consumer/opening vectors, exponent readback equality only for generated effects, and stable new-run/new-path hashes with changed-source/null-to-label divergence. All remain inside ordinary existing replay/CLI tests and the existing ten native behavioral tables where applicable; no extra integration file or behavior name is created.

### Pure replay engine binding and error mapping

The pure library exports `StockReplayMath={computeLegValue:(bin:{qty:number;rate:number},qtyDelta:number,rate:number|null)=>{valueDelta:number;rateUsed:number},applyLedgerDelta:(bin:{qty:number;rate:number},qtyDelta:number,valueDelta:number)=>{qty:number;rate:number},round4:(value:number)=>number}` and `buildDiagnosticResult(manifest:DiagnosticEvidenceManifestV1,source:SourceEvidence,coverage:Coverage,mode:'discovery'|'hypothetical_replay',math:StockReplayMath):ReceiptDiscovery|ValuationReplayPlan`. Qualified caller supplies actual existing stockLogic namespace functions after F7 admission; unit tests compare real source functions and independent rational expected vectors. Strict decoders/document hashes run without math or application imports. No new rounding/valuation implementation or global engine change is selected. A request for hypothetical mode with no usable basis returns the complete discovery variant described above, not a runtime exception or fake rate.

Mode comes from the owning staged caller: S1 invokes discovery. The completed S2 CLI always requests hypothetical_replay with the same flags and falls back to complete discovery only when no usable basis exists; no new mode flag, alternate entrypoint or future corrective import is required. Source-reader failure constructs the closed incomplete result with safe observed data; it does not call buildDiagnosticResult on a falsely complete source. No business report is emitted on invalid/auth/target admission (exit 2). Complete discovery/hypothetical (including absent/unverified/mismatched documentary state) is exit 0; incomplete read/schema/context/resource/deadline is exit 3; integrity or unsupported result is exit 4. Source unavailable after a permitted lookup is an incomplete read (exit 3); another tenant/authority denial remains generic admission-unavailable exit 2 without foreign detail. Existing corrective command exits/statuses are unchanged.

### Review artifact: contracts/replay-report.md

## Receipt diagnostic CLI and report contract — proposed

### Contract index and ownership

[diagnostic-wire.md](contracts/diagnostic-wire.md) defines the complete strict DiagnosticEvidenceManifestV1, ReceiptDiscovery/ValuationReplayPlan/result/error/coverage unions, source/document/FX/allocation/UOM evidence, oracle/rounding outputs and exact stable digest projections. T003 implements those selected types/decoders in **scripts/lib/faces-receipt-replay.ts** and its .test.ts before either S1/S2 reader. That existing pure module also owns shared DocumentBasis/UnitQualification; later US3 corrective logic imports its pure types/validators, never the reverse. No future corrective service/native file, executing CLI or raw private snapshot is a prerequisite for S1/S2.

[command-envelope.md](contracts/command-envelope.md) separately defines the executable ReceiptChainManifestV1 correct/compensate command, entire-manifest approval hash, service/results/status and exit table. A diagnostic hypothesis, report digest or unverified documentary basis cannot be passed as that manifest. [correction.md](contracts/correction.md) owns accounting/precision, homogeneous support, consumer sign, mutation/compensation and shared prerequisite contracts. Diagnostic math uses exactly that Number/String policy plus independent rational oracle; no alternative replay engine or rounding policy is selected.

### Exact CLI and authority

Proposed `minion_hub/scripts/faces-receipt-valuation-2026-11.ts` accepts only `--org <uuid> --entry <uuid> --line <uuid> --evidence-manifest <private-json> --output <private-json>`. Every flag is required and unique; identity flags equal the decoded manifest IDs. The output path is independently owner-approved and validated as a private owned path; no fallback org, mode/apply flag, document parser/download or writer call. S1 requests the discovery result; S2 upgrades the same reader to hypothetical replay when its explicit basis is usable. Candidate IDs seed discovery, never approval. Register `faces:receipt:diagnose` as exact `bun --no-env-file scripts/faces-receipt-valuation-2026-11.ts`.

Use only private FACES_RECEIPT_DATABASE_URL, FACES_OPERATOR_ACCESS_TOKEN/FACES_OPERATOR_ANON_KEY and approved target.authUrl. Apply the same F7 qualified-target/principal/bootstrap and exact active-owner/capability/module/finance-tier contracts as correction.md, with dynamic stockLogic/authority imports after admission and an injected owned DB connection. No global application pool, .env file, FOR SHARE in read-only, new auth helper or privileged fallback. Unknown flags, malformed/oversized input, target/auth/tenant admission refusal exit 2 before replay or foreign detail.

Use one bounded REPEATABLE READ READ ONLY transaction; verify actual database/target, app_ledger and exact app.current_org_id/profile plus read_only before sensitive reads and completion. Bounds: statement 12000 ms, lock 1000 ms, overall 60000 ms; finally rollback/release. Every join has actual org equality. Use raw SQL text/hashes before numeric/JSON/date driver conversion. Source null UOM stays null; separately attested historical normalized stock units are never substituted into that raw field.

### Completion, shape and resource exits

- Exit 0: closed complete discovery or hypothetical result; document absent/unverified/mismatched may still give useful complete explanatory output. A missing basis yields discovery/basisChoice null, not a zero expected rate. Diagnostics always have eligible:false; document_qualified is evidence readiness, not execution approval.
- Exit 2: invalid input/target/auth/authority/foreign-source admission; no sensitive report/replay.
- Exit 3: incomplete read, schema, context/resource/deadline or output failure. Never publish a complete truncated prefix, fake zero, digest of an unread source or successful atomic output if publication failed.
- Exit 4: original baseline, quantity/conservation/bin/oracle integrity or unsupported affected history. Include safe original-only evidence, complete:false and no hypothetical continuation or totals.

Supported affected envelope is one receipt plus 0–128 ordinary homogeneous issues (<=129 entries/lines/canonical ledger rows, <=128 references of each consumer kind), after a fully verified same-key opening/context. Probe limit+1. A second receipt, transfer/reversal/adjustment, unknown/ambiguous source, multiline/multikey, negative unsupported value or zero/negative post-receipt quantity deterministically gives the closed unsupported/integrity branch, not an optional partial plan. First issue beyond 128 is an unsupported boundary/exit 4. Full source context cap 10000 canonical rows; manifest 1048576 UTF8 bytes; report 20971520 bytes. Input oversize is exit 2; context/output/deadline resource breach is incomplete exit 3. These are selected guardrails, not latency claims. No test/new issue cap is hardcoded to the observed 17.

Original baseline must match authoritative stored sequence/snapshots/bin before any hypothetical replay. Preserve raw numeric strings/row hashes, known 0 versus null unknown, partial-coverage flags and exact boundary/error codes. Any source change after an eventual executable preview invalidates that writer manifest; a fresh complete diagnostic does not itself authorize a correction.

### Private output and qualification

Read owner-provided JSON manifests only as regular mode 0600 private files without symlink following. Never load source-document bytes. Write the strict decoded DiagnosticReport to an owned same-filesystem private temporary mode 0600 file, then atomically rename to the approved output; cleanup temporary output on failure. No tokens/SDK headers/connection strings, customer/supplier contact PII or arbitrary metadata enters it. `metadata` observation/run/snapshot/output references are excluded from stable diagnostic hashes exactly as diagnostic-wire.md specifies. Equal admitted business/evidence facts produce equal manifest/report digests across fresh runs and relocated output; writer approval hashes remain a separate contract.

Ordinary pure decoder/hash/replay and diagnostic CLI tests cover every specified wire vector, including absent invoice, useful hypothetical, verified/mismatched documentary basis, raw null UOM, unknown versus 0, original-baseline failure, original-only unsupported shapes and resource/output failure. Existing ten native behaviors additionally qualify homogeneous null-UOM source/copy/compensation and source readback semantics; no extra registered name or integration file is introduced. All implementation and execution gates remain pending; this documentation does not install or run the CLI.

### Review artifact: quickstart.md

## Quickstart and validation: FACES receipt valuation

### Draft checks already executed

Read-only/offline source: pinned SHA and registry verified. The two private source-math commands in [research.md](research.md) import existing stock helpers and read the immutable v2 JSON locally. They have no database connection. Explicit assertions passed, exit 0, with Bun internal tsconfig-directory diagnostic retained as a limitation. Outputs are arithmetic evidence, not an invoice match or correction test.

Expected conditional arithmetic: `5474.58/89 → 61.5121` at four decimals; `89×61.5121=5474.5769`, cent display 5474.58. Synthetic zero-opening receipt→issue 10 gives remaining 79 units at 61.5121 and value 4859.4559. This is synthetic and differs from actual snapshot opening 8 @ 250; the actual-snapshot remaining value is oracle 2 below. Keep the scenarios labelled so a synthetic expected value never becomes a production balance.

### Pending implementation setup

Owner data-spec approval and completed independent design review (status in [spec.md](spec.md)) precede code. Create isolated Hub feature branch/draft PR against registry master. Read Hub `AGENTS.md`, `CLAUDE.md`, `docs/qa-stack.md`, inspect `bun run qa:status`, and use only the guarded loopback QA setup. Do not copy production credentials into QA or import named production rows into tests.

### Focused tests (available only after S1/S2 files exist)

```bash
bunx vitest run scripts/lib/faces-receipt-replay.test.ts scripts/faces-receipt-valuation-2026-11.test.ts
bunx vitest run src/server/services/stock.logic.test.ts 'src/routes/(app)/stock/entries/new/entry-lines.test.ts' src/server/services/stock.service.test.ts
```

Required strict-wire and independent-oracle vectors (selected exact outputs in [diagnostic-wire.md](contracts/diagnostic-wire.md)):

1. Total-mode 89/5474.58 including explicit 0.0031 residual; unit-mode 5474.58 yields 487237.62 and is labelled stored error candidate, not source-document truth.
2. Opening 8 @ 250 + receipt 89 @ 61.5121 gives 97 units and value 7474.5769; issuing 18 units yields 79 units. Precision rule ([correction.md](contracts/correction.md#explicit-accounting-and-precision-proposal)): the remaining value is the pinned Number engine output, checked against an independent rational oracle with absolute tolerance 0.00000001. Expected engine string `6087.542011340212`; expected rational oracle `5904915751/970000` (79 × 7474.5769 / 97 = 6087.54201134020618…); their difference, about 5.8e-12, must be at most 0.00000001. Do not round any intermediate row to cents.
3. Include a subsequent receipt, transfer to another warehouse and its later issue, cancellation reversing original value, positive/negative adjustment and zero-ending bin. Each second-receipt/transfer/reversal/adjustment/zero-terminal case MUST return its exact unsupported reason, complete:false/eligible:false and exit 4, with original-only evidence/rows[]/totals:null and no hypothetical continuation; never choose between implementation alternatives. Context 10000/report 20 MiB/60000 ms read/deadline breach returns incomplete/exit 3 or no published report if serialization cannot fit, never a fake complete prefix. A 129th issue is the named unsupported_issue_cap/exit 4 boundary.
4. Strict decoder/hash vectors cover all nested keys/required-null/duplicate JSON keys, exactly bounded arrays/size/numeric/unions, owner-attestation versus integrity-reference truth, absent/unverified/verified/mismatched document/FX/allocation/unit facts and every source/output field family. Fresh runId/snapshot/observedAt/output path preserve diagnostic business digests; changed source raw numeric/null label/document/hypothesis changes them. Writer approval manifest hashes remain distinct.
5. Real source-created null UOM receipt/POS/booking rows serialize as null, preserve raw hashes and copy null into replacement and compensating rows. Known historical writer/normalized-unit/document proof may qualify them; missing proof, changed item/history or contradictory conversion blocks. Compensation inherits prior immutable unit evidence without requiring its historical attestor still be owner; current executing owner/status-reader admission stays independent. Add these within the existing homogeneous/consumer/inverse native behaviors; the ten registered behavior names and their count do not change.
6. Baseline/source mismatch, duplicate line attribution, foreign tenant, ledger-only or bin-only key, missing document/UOM/FX, changed fingerprint, timeout and truncated read produce documented blockers/nonzero incomplete status, no writer calls.

After implementation, set only private FACES_RECEIPT_DATABASE_URL, FACES_OPERATOR_ACCESS_TOKEN and FACES_OPERATOR_ANON_KEY from the owned loopback fixture and synthetic existing session; bind its approved target.authUrl/database identity/marker in the evidence manifest. Then on qualified local QA:

```bash
bun --no-env-file scripts/faces-receipt-valuation-2026-11.ts --org "$FACES_QA_ORG_ID" --entry "$FACES_QA_RECEIPT_ID" --line "$FACES_QA_RECEIPT_LINE_ID" --evidence-manifest "$FACES_PRIVATE_EVIDENCE_MANIFEST" --output "$FACES_PRIVATE_REPORT_PATH"
```

Proposed command is not installed yet. Use synthetic org/entry/line IDs. Run twice; canonical unchanged output matches after excluding observation timestamps, before/after database hashes are unchanged, output mode 0600. An unverified/absent invoice plus an explicit usable hypothesis returns a complete hypothetical report with eligible:false; absent invoice and no hypothesis returns complete discovery with basisChoice:null, never an invented rate/currency. Unknown source currency remains null; assumption-only comparisons are tagged assumed_currency_numeric_only, never a verified stock denomination. Verified/mismatched document and normalized-unit evidence use distinct strict states/checks; it does not block useful diagnosis or enable apply.

### Selected writer rehearsal (implementation and approvals pending)

The proposed writer CLI and exact selected algorithm are specified in [contracts/correction.md](contracts/correction.md); no writer is installed or production execution authorized. After spec approval implement the defined files and run the exact 18-entry/15-accrual/2-ticket synthetic fixture twice on disposable local QA, undo/compensate in `finally`, inject failure before/after commit and audit, simulate stale manifest and concurrent writes, and demonstrate authoritative recovery rather than blind retry. Assert immutable source evidence, unchanged item/warehouse quantities and collections/dates, approved receipt/COGS/remaining-value differences, full-key latest-ledger/bin consistency, unrelated-org stability and second-run no-op. Capture exact source/snapshot/plan/approval hashes. Run the focused ordinary writer command below; the SQL companion must run in the registered native lane below, not ordinary Vitest; require F3's migration/QA seed and both finance period-query oracles described in the correction contract. Also assert the derived-reader expectations in [correction.md § Derived readers and copies](contracts/correction.md#derived-readers-and-copies): relinked accrual `updated_at` equals the approved `postedAt`, last restock cost is 61.5121 after correct and 5474.58 after compensate, and the stock overview daily-flow bucket for the correction's UTC day holds the documented net value and used value.

The exact ordinary writer decoder/service/CLI command is:

```bash
bunx vitest run src/server/services/faces-receipt-correction.logic.test.ts src/server/services/faces-receipt-correction.test.ts scripts/faces-receipt-correct-2026-11.test.ts
```

It checks the action/basis/status signatures in [command-envelope.md](contracts/command-envelope.md), including every row of the [outcome/exit table](contracts/command-envelope.md#single-cli-outcome-and-exit-table), current owner-reader versus retained historical actor, full unitQualification hash binding and exponent-expanded new PG numeric readback via String(Number(actualText)); original raw source hashes remain byte-preserved.

### Full gates and release evidence

```bash
bun run check
bun run test
bun run build
```

Require zero errors/warnings/failures and clean build subject only to documented optional-peer notices. F2 adds no migration. A later UI/API surface needs its own reviewed spec for RBAC/route contract/Paraglide/design-token/browser gates. Owner merge, deployed SHA, exact manifest/target apply approval and post-apply record verification remain pending and must be reported separately from local test success.

### Native PostgreSQL admission and exact full-lane command

F7's shared principal/read-only capability proof and F3's stock gate/migration/RLS/seed/primitive proof precede F2 writer qualification. Admit `src/server/services/faces-receipt-correction.sql.integration.test.ts` exactly once to `NATIVE_POSTGRES_MANIFEST['qa-native']` in `scripts/qc/native-postgres-manifest.ts`, minimumAssertions=10, with describe("FACES receipt correction against PostgreSQL") and these exact full requiredBehaviors:

- `FACES receipt correction against PostgreSQL original 89 unit fixture replays opening value and all consumer costs within the declared oracle bounds`
- `FACES receipt correction against PostgreSQL fresh supported chains of up to 128 issues are admitted but a 129th issue and every unsupported shape refuse`
- `FACES receipt correction against PostgreSQL reverse and replay commit receipt entries ledger bins consumer links and audit atomically`
- `FACES receipt correction against PostgreSQL each intermediate fault rolls back and a repeated operation creates no new effects`
- `FACES receipt correction against PostgreSQL same key changed intent and competing source operation cannot correct twice`
- `FACES receipt correction against PostgreSQL issue first rejects stale correction and correction first makes a waiting issue use corrected stock`
- `FACES receipt correction against PostgreSQL period fiscal and permission changes serialize and refuse without financial mutation`
- `FACES receipt correction against PostgreSQL current correction month carries signed COGS while both finance queries preserve prior month totals`
- `FACES receipt correction against PostgreSQL unknown commit recovers the immutable receipt and approved inverse compensation preserves history`
- `FACES receipt correction against PostgreSQL read only preview status and foreign denied principals cannot bypass shared authority or append only grants`

The competing issue case proves two actual commit orders with independent backends and an observed lock barrier. If the ordinary issue commits first, the old correction manifest is stale and correction refuses with zero effects. If correction acquires the gate first while its snapshot remains valid, it commits atomically; the waiting issue then reads and posts against the corrected state. A rolled-back competitor is not a committed source change and does not require stale refusal. Keep these assertions inside the one named behavior and preserve the ten-behavior count.

Preserve all existing lane entries and lane count, update manifest/report validator tests to reject missing/skipped/duplicate cases, and use the actual future F3/F2 services and migration runner. Ordinary Vitest excludes SQL integration. Reuse F3's fixture/data definitions, actual Drizzle transaction handles, app_ledger/org-GUC/RLS and same gate/helpers; no mocked concurrency, invented stock ledger arithmetic or bare privileged writer. openDisposablePostgres from scripts/qc/disposable-postgres.ts must validate explicit MINION_QC_DISPOSABLE=1, loopback port, minion_qc owner/minion_qc_* database and actual minion-360-disposable:v1 marker before any DDL. Create only unique owned child database `minion_qc_faces_receipt_<32hex>` using F7's exact admitted controller recipe; validate the generated name, set/requalify its actual marker and seed canonical public-schema fixtures. Apply F7's child-local auth schema/users/uid/owner/ACL/FK seed prerequisites before public baseline authority policy DDL, then the real F7 `20261116190000_operator_authority_bridge.sql` and F3 `20261116193000_stock_corrections.sql` migrations. Preserve actual baseline table ACL/RLS. All competing backends use this child and actual helpers with affirmative lock-wait barriers; no search-path-only schema substitute for public-qualified functions. Close/release every child client and blocker, then drop only the validated recorded child database through its admitted controller in finally. Inject owned real handles so no application pool or .env.local/production fallback opens. Full qa-native also requires its separately owned full-schema QA URL and guard flags; do not reset another stack.

Qualify private F2_DISPOSABLE_DATABASE_URL and F2_FULL_SCHEMA_QA_URL from owned guarded local fixtures, then run on the future isolated candidate:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$F2_DISPOSABLE_DATABASE_URL" HUB_TEST_DB_URL="$F2_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-receipt-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/faces-receipt-qa-native.json
```

No single-file filter on this qualification command: every admitted native file/behavior must pass with zero missing/skips/todos/failures. Record focused development runs separately. Extend existing manifest/report tests for new admission. The observed 18-entry/15-accrual/2-ticket fixture remains required, alongside the zero-issue minimum and the 128-issue maximum supported envelopes, extra issue before fresh preview, extra issue after preview stale refusal, and unsupported zero-terminal/transfer/reversal/adjustment/second receipt cases. Status modes and exit codes are in [command-envelope.md](contracts/command-envelope.md#single-cli-outcome-and-exit-table). No product command or native fixture has executed in this spec-authoring phase.

Check the package.json faces:receipt:diagnose/correct commands from [correction.md](contracts/correction.md#concrete-bun-entrypoints-and-qualified-connection); alias resolution alone is not target admission. Bootstrap regression must prove no business import/pool/data query precedes argument/target/principal checks, and a missing private DB variable refuses even if unrelated global application credentials exist. The normal tests use only injected owned fixtures. Raw target URLs/tokens never appear in validation output.

For each successful correction assert one durable operation audit plus exactly 1 + issueCount existing stock.entry_submitted events at commit, each entryId resolving through the replacement map (18 for the observed fixture); rollback and repeat emit none. No correctionId payload expansion or per-operation suppression is selected. Reuse the shared helper `{entry,transitioned}` contract. F7's exact admitted Vite SSR loader and actual standalone package-process smoke are required dependencies; Vitest resolving aliases does not prove the CLI launches.

### Real inverse rehearsal, not fixture reset

Use the same base correction CLI flags/modes with an inverse manifest action:"compensate", manifest.basis.policy='restore_prior_before_snapshot' and inverseOfOperationId naming the applied correct operation. Freeze the fresh current replacement map/consumer/max-sequence fingerprints and restored before-rate/quantity facts from its immutable receipt. Run inverse preview and approved apply through the real service/gate. Assert restored net before quantities/value/COGS and new compensating consumer pointers, preserve cancelled originals/all three entry generations/two operation receipts, then run that inverse again as a zero-write replay. Tampered inverse rate/quantity, wrong/foreign/prior-inverse operation, stale consumer/movement, alternate operation key and locked period must fail without effects.

In QA finally, first resolve the initial operation authoritatively; compensate only a verified applied operation, verify unchanged state if demonstrably not applied, and fail on unresolved/failed inverse rather than falling back to SQL resets. Owned-schema teardown after failure is cleanup only and never compensation evidence. This real inverse is required by the existing native unknown-commit/compensation behavior name; it adds no unregistered native file. Production undo is separately previewed/owner-approved and is never executed automatically from finally.

Lock order and the shared write gate are defined in [correction.md § Shared write gate and authority races](contracts/correction.md#shared-write-gate-and-authority-races); the native period/fiscal/permission behavior qualifies its absent-deny and absent-enabled-module insertion races in both arrival orders.

Fixture ownership is explicit: the full qa-native controller remains its exact CI pgvector 0.8.6/minion_qc_vectors contract and the independently owned full-schema QA target remains admitted for the other suites. This feature creates only its named isolated child. Child fixture/bootstrap code follows F7 authority-bridge/native prerequisites and F3 source fixture definitions; no extra app_ledger org/profile/member grants or fake permission verdicts. Deployment/production writes are not performed by native setup.

The exact [shared native auth prerequisite](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md) is mandatory. Reuse F7-owned `src/server/test-utils/operator-native-auth-fixture.ts`: call installOperatorNativeAuthFixture(owner,expectedOwnedChildIdentity) before public profile/FK/policy DDL, seed synthetic auth.users before profiles with non-null email, then call assertOperatorNativeAuthFixture after source fixture DDL/seed. Preserve its actual controller/child identity, auth.uid owner/invoker/JWT/ACL/catalog and baseline-denial proofs. This test helper neither authenticates GoTrue tokens nor creates a runtime dependency on another feature writer.

Native exact-count prerequisite: consume [F7 native-exact-count](../128-faces-receivables-audit/contracts/native-exact-count.md). This feature registers its new native file with exactAssertions:true, minimumAssertions=10 and exactly the 10 required names. The F7-owned qualified report implementation enforces equality for opted-in rows; the pinned pre-change report only enforced a minimum. Preserve all legacy rows/default false behavior. F7 alone owns the common manifest/report flag implementation and negative tests; this slice registers its own file after that dependency qualifies.

The [contract index](plan.md#contract-index) separates strict S1/S2 diagnostic wires from the US3 verified-document command. Only the offline checks under "Draft checks already executed" have run; every other command here is future qualification.

### Review artifact: tasks.md

## Tasks: FACES 89-unit receipt valuation reconciliation

**Input**: spec/plan/research/data-model/contracts/quickstart in this directory. **Status**: Planned; zero implementation tasks completed. Review and approval status is stated once in [spec.md](spec.md). Hub-relative source paths unless prefixed `specs/`. All implementation evidence goes to `specs/123-faces-receipt-valuation/validation.md` and `specs/123-faces-receipt-valuation/evidence/`, as [implementation-inventory.md](implementation-inventory.md) states.

**Tests**: Required by FR-011. Existing offline math does not count as a writer rehearsal or full Hub gate.

### Phase 1: Setup

- [ ] T001 Record the EGM outcome, owner data-spec approval and current-source drift assessment in `specs/123-faces-receipt-valuation/plan.md`; block product implementation until approved.
- [ ] T002 Create isolated Hub branch/draft PR against verified registry master and record candidate source/checkout/PR in `specs/123-faces-receipt-valuation/plan.md`; preserve shared WIP.

### Phase 2: Foundational

- [ ] T003 Implement the exact DiagnosticEvidenceManifestV1/ReceiptDiscovery/ValuationReplayPlan/source/coverage/error/oracle/hash and shared DocumentBasis/UnitQualification types, strict JSON decoder/pure validators/digests from contracts/diagnostic-wire.md in `scripts/lib/faces-receipt-replay.ts` and `.test.ts` before S1; no schema invention, future writer import or executing CLI dependency. Preserve raw numeric text/null UOM and distinguish original-only unsupported, incomplete, integrity, unverified/verified/mismatched states.
- [ ] T004 Implement explicit org/entry/line/manifest/target/read-only guards and private mode 0600 atomic output in `scripts/faces-receipt-valuation-2026-11.ts`; first slice exposes no apply flag or writer call; use F7-owned operator-principal QualifiedOperatorTarget and nonlocking same-snapshot resolver interfaces from contracts/correction.md, not duplicated SDK/RBAC logic; depend on the F7 admitted Vite SSR operator-service-loader and standalone subprocess qualification; register package.json faces:receipt:diagnose with the entrypoint and bootstrap guard in contracts/correction.md.
- [ ] T005 Write CLI read-only/privacy/error tests in `scripts/faces-receipt-valuation-2026-11.test.ts` covering missing IDs, wrong target/tenant, role/read-only loss, invalid manifest, timeout/schema failure and zero writer calls.

### Phase 3: US1 — Verify receipt/document (P1, MVP)

**Goal**: Exact stored facts and document/UOM/currency/cost-basis gate, useful without permission to correct.

**Independent test**: Competing synthetic receipts remain ambiguous except the exact documented cost basis; absent invoice returns eligible false without mutation.

- [ ] T006 [P] [US1] Add exact 89-unit/5474.58 total-versus-unit, multiple-line, wrong-UOM/currency and absent-invoice cases in `scripts/lib/faces-receipt-replay.test.ts`; expected rate 61.5121, contribution 5474.5769 and residual 0.0031 are explicit. Add full strict decoder/output/hash vectors for absent invoice/no basis, absent/unverified explicit hypothesis, verified/mismatched documentary/unit/currency/FX/allocation evidence, known 0 versus unknown, unchanged business hashes across run/path metadata and changed source/null-label hashes.
- [ ] T007 [US1] Read exact org/receipt/line/item/warehouse/purchase/document/currency/FX and pre-receipt state in one verified read-only snapshot in `scripts/faces-receipt-valuation-2026-11.ts`; do not infer historical FX or cost allocation from current defaults.
- [ ] T008 [US1] Implement document evidence admission and explicit mismatch/unverified report in `scripts/lib/faces-receipt-replay.ts`; require positive stock quantity, attributable line and no guessed supplier-UOM conversion. Admit nullable raw receipt/POS/booking labels only through separately qualified historical normalized-stock-unit proof; current item UOM alone cannot verify history, and failed proof leaves writer eligibility false.
- [ ] T009 [US1] Rehearse discovery twice on synthetic local QA and capture no-write hashes, error behavior and private-output permissions in `specs/123-faces-receipt-valuation/evidence/discovery-validation.json`.
- [ ] T010 [US1] Obtain owner-supplied exact invoice/cost-basis evidence for candidate STE-2026-00559 or record the unresolved blocker in `specs/123-faces-receipt-valuation/evidence/document-verification.md`; keep the source invoice/PII private and commit only its evidence hash/reference.

### Phase 4: US2 — Explain downstream value (P1)

**Goal**: Full original/hypothetical value chain, unchanged quantities and separate COGS/remaining value.

**Independent test**: Opening 8 @ 250 plus receipt 89 @ 61.5121 then issue 18 yields 79 units and the oracle 2 values in quickstart.md. Transfer/reversal/adjustment/second-receipt and zero-terminal histories deterministically block hypothetical replay/apply.

- [ ] T011 [US2] Add original-baseline, nonempty-opening, subsequent receipt/transfer/issue/reversal/adjustment/zero-bin, unsafe sequence and missing-history tests in `scripts/lib/faces-receipt-replay.test.ts` with independent expected decimal values and exact closed outcomes/coverage/error codes; unsupported results contain original evidence only, no hypothetical prefix/totals; context/read/resource overflow never fakes complete output.
- [ ] T012 [US2] Implement canonical sequence-ordered source-compatible Number replay with exact decimal admission and independent rational verification, the deterministic homogeneous support matrix and explicit unsupported transfer/reversal outcomes in `scripts/lib/faces-receipt-replay.ts`; no timestamp-only ordering, Number-typed ledger IDs or per-movement cent rounding.
- [ ] T013 [US2] Enumerate actual post-receipt rows, realized-accrual/financial consumers and the derived readers in contracts/correction.md in `scripts/faces-receipt-valuation-2026-11.ts`; validate original snapshots before hypothetical replay and accept additional ordinary homogeneous issues only through a fresh owner-approved manifest within the 128-issue envelope; unsupported shapes block.
- [ ] T014 [US2] Emit receipt contribution, per-row/consumer COGS differences, current remaining value, quantity preservation, conservation and full-union latest-ledger/bin checks in `scripts/lib/faces-receipt-replay.ts`; no bin-only “fix”.
- [ ] T015 [US2] Capture current conditional replay and blockers with exact source/snapshot/row/digest/precision evidence in `specs/123-faces-receipt-valuation/evidence/impact-report.json`; label hypothetical until invoice, rounding and period policy are approved.

### Phase 5: US3 — Selected atomic correction (P2, owner/code/apply gates pending)

**Goal**: One approved representation with deterministic apply/recovery and no-op repetition.

**Independent test**: Disposable fixture apply once/repeat/no-op, stale-state refusal, interrupted/unknown commit recovery, preserved quantities/originals and approved value effects only.

- [ ] T016 [US3] Complete independent review and owner approval of `specs/123-faces-receipt-valuation/contracts/correction.md`; consume F3-owned `supabase/migrations/20261116193000_stock_corrections.sql`, shared schema/RLS and paired QA seed qualification plus the shared transaction/locking prerequisites; F2 adds no second migration/table and preserves normal-role append-only grants.
- [ ] T017 [US3] Prepare the private approved target/operation/document/plan/source-state manifest and sanitized impact at `specs/123-faces-receipt-valuation/evidence/correction-plan.json`; coordinate F1/F3/prior true-ups and refuse changed fingerprints.
- [ ] T018 [US3] Write the pure decoder/hash tests in `src/server/services/faces-receipt-correction.logic.test.ts` before the logic module: every field family and bound in contracts/command-envelope.md, stable correct and compensate vectors, mixed-action/omitted/extra fields, DocumentBasis.unitQualification hash binding and same-key conflict on any changed intent.
- [ ] T023 [US3] Implement `src/server/services/faces-receipt-correction.logic.ts` per contracts/command-envelope.md: strict ReceiptChainManifestV1/command/status decoders and hashes, importing DocumentBasis/UnitQualification types and validators from `scripts/lib/faces-receipt-replay.ts`; no DB, alias, CLI or environment import.
- [ ] T024 [US3] Write service tests in `src/server/services/faces-receipt-correction.test.ts` before the service: preview/apply/status signatures, result and receipt placement, consumer relinking, accrual `realized_value` sign and `updated_at`, raw `uom` copied exactly including null, compensate inheriting the prior unit proof, action-mismatched status and historical-actor deletion.
- [ ] T025 [US3] Implement `src/server/services/faces-receipt-correction.service.ts`: the atomic algorithm, consumer updates and compensating action in contracts/correction.md, using F3 primitives and the shared write gate; admit 1–129 entries from fresh discovered arrays; reject post-preview drift and unsupported shapes; no broad legacy repair or zero-quantity primitive.
- [ ] T026 [US3] Write CLI tests in `scripts/faces-receipt-correct-2026-11.test.ts` before the CLI: preview/apply/status flags from contracts/command-envelope.md, duplicate/unknown/conflicting flags, the single outcome/exit table, unknown commit, private output and bootstrap ordering with an absent private DB variable.
- [ ] T027 [US3] Implement `scripts/faces-receipt-correct-2026-11.ts` per contracts/command-envelope.md: owner/target/manifest admission, preview/apply/status modes and private atomic output.
- [ ] T028 [US3] Register `faces:receipt:correct` in `package.json`, add the `receiptCorrection` key in `scripts/lib/operator-service-loader.ts` and qualify it in `scripts/operator-bootstrap.smoke.ts`, as contracts/correction.md and implementation-inventory.md specify.
- [ ] T019 [US3] Admit `src/server/services/faces-receipt-correction.sql.integration.test.ts` exactly once to qa-native in `scripts/qc/native-postgres-manifest.ts` with the quickstart behaviors/minimumAssertions, and extend `scripts/qc/native-postgres-manifest.test.ts` and `scripts/qc/native-postgres-report.test.ts` to reject missing/duplicate/skipped evidence.
- [ ] T029 [US3] Write `src/server/services/faces-receipt-correction.sql.integration.test.ts` within the ten quickstart behaviors: fixture replay, envelope limits, atomic commit, faults, double-correction refusal, concurrency orders, period/permission races, finance period queries, unknown commit plus real compensate, read-only denial; source-created null receipt/POS/booking UOM through originals/replacements/inverse; exponent-expanded readback only through String(Number(actualText)); derived-reader expectations from contracts/correction.md (accrual `updated_at`, last restock cost, daily-flow bucket).
- [ ] T030 [US3] Run the full native lane and report validator commands in quickstart.md on the isolated candidate and record results in `specs/123-faces-receipt-valuation/validation.md`.
- [ ] T031 [US3] Rehearse apply twice, fault/unknown outcome, concurrent source change, durable receipt and the real compensate action in finally on disposable local PostgreSQL (no hidden SQL reset), including tampered inverse fields, prior-map drift, different-key double inverse and inverse-repeat no-op; save quantity/value/COGS/other-tenant invariants at `specs/123-faces-receipt-valuation/evidence/correction-rehearsal.json`.
- [ ] T020 [US3] Obtain owner exact-manifest/target apply approval and owner merge, then capture authoritative outcome, preserved quantities, full-key bin/ledger equality, approved consumers and repeat no-op at `specs/123-faces-receipt-valuation/evidence/correction-receipt.json`; stop on stale or unknown state.

### Phase 6: Polish and qualification

- [ ] T021 Run focused tests plus `bun run check`, `bun run test`, `bun run build`, independent implementation review and exact-candidate hash capture in `specs/123-faces-receipt-valuation/validation.md`; distinguish source/local/merge/deployment/runtime evidence.
- [ ] T022 Update `specs/123-faces-receipt-valuation/quickstart.md` and proposal ledger with actual evidence and remaining gates; add exact-site TODO(handoff) only for genuine implementation open ends and preserve unrelated code.

### Dependencies and execution order

T001→T002→foundation T003–T005→US1 T006–T010. US2 pure tests/replay can progress using synthetic evidence after foundation, while production eligibility depends on US1. T015 must not claim a verified correction when T010 remains unresolved. US3 depends on complete US1/US2, reviewed writer design and separate owner approvals; within US3 the order is T016→T017→T018→T023→T024→T019→T029→T025→T026→T027→T028→T030→T031→T020, so each test task precedes its implementation. Full gates/review apply to each implementation slice. No repair task is ready merely because offline arithmetic passed.

### Parallel examples

- US1: T006 pure arithmetic/document fixtures can proceed while T007 read adapter is built after foundation; different files. Admission/replay functions share a module and are sequential.
- US2: independent consumer census T013 can run alongside synthetic replay tests after reader contract is stable; value planning waits on both.
- US3: after T016 approval and shared helper qualification, T018/T023 (pure logic) and T019 (native admission) touch different files and may proceed in parallel; the service, CLI, approvals and production execution are sequential.

### Implementation strategy

MVP is read-only US1; US2 adds impact explanation and can remain explicitly hypothetical. S1/S2 are bounded implementable slices after owner data-spec approval. US3 has a concrete selected correction contract; owner approval, invoice/cost/period acceptance, F3 helper prerequisite, qualified implementation and exact-manifest apply approval remain pending. No production apply command, invoice proof or owner authorization is fabricated.

### Cross-feature rules

- Cross-item execution ordering: [plan.md](plan.md#cross-item-execution-ordering).
- Cost-bearing admission and field tiers: [correction.md](contracts/correction.md#exact-shared-principal-contract-and-cli-modes).
- Shared write gate and lock order: [correction.md](contracts/correction.md#shared-write-gate-and-authority-races).
- Contracts: [plan.md contract index](plan.md#contract-index).

All 31 tasks remain unchecked. Native additions stay within the ten registered behavior names, and source/current-owner versus historical-actor status rules remain unchanged.

### Review artifact: checklists/requirements.md

## Specification Quality Checklist: FACES receipt valuation

**Purpose**: Record author checks of specification completeness before planning. **Created**: 2026-11-16. **Feature**: [spec.md](spec.md).

Each item states what the author checked on 2026-11-16. Independent review status is stated in [spec.md](spec.md).

### Content Quality

- [x] User stories and FR-001–FR-011 describe required behavior; source anchors appear only as AS-IS evidence under constitution principle II.
- [x] Each user story names the owner as actor and states the business reason in its priority line.
- [x] Acceptance scenarios use Given/When/Then without code identifiers.
- [x] Every mandatory spec-template section is present.

### Requirement Completeness

- [x] No requirement-placeholder markers remain; invoice, policy and approval appear as explicit admission gates.
- [x] Each of FR-001–FR-011 maps to at least one acceptance scenario or test task in [tasks.md](tasks.md).
- [x] SC-001–SC-004 each state a countable outcome (zero matches, equal totals, zero mismatches, zero changes).
- [x] SC-001–SC-004 name no framework, language or storage technology.
- [x] Each user story has acceptance scenarios.
- [x] The Edge Cases section lists UOM, currency, multiline, opening stock, unsupported movements, numeric and bin-only cases.
- [x] Scope is bounded to the exact receipt and its dependency closure.
- [x] The Assumptions section lists dependencies on F1, F3 and prior true-up work.

### Feature Readiness

- [x] Each functional requirement maps to an acceptance scenario or success criterion.
- [x] User stories cover verification, impact explanation and correction.
- [x] Success Criteria define measurable outcomes; execution proof is tracked in tasks.
- [x] FR text names behaviors and gates, not files, functions or schemas; those appear in plan and contracts.

### Validation notes

Author self-check, iteration 1: the discovered candidate's stored rate is kept distinct from invoice-verified intent. The four-decimal rate 61.5121 and cent total 5474.58 are independently calculable; original and conditional downstream values are labelled. Offline source checks exited 0, but Bun emitted an internal tsconfig diagnostic; no clean full Hub gate is claimed. Quantity preservation, downstream COGS, the pre-existing 8 @ 250 opening and full dependency closure are explicit.

This checklist covers requirement quality only; no implementation task or runtime outcome is claimed complete. Owner approval, invoice/cost basis, period/rounding acceptance, exact-manifest apply approval, owner merge and runtime proof remain pending. Contract reference: [plan index](plan.md#contract-index).

### Review artifact: implementation-inventory.md

## Exact implementation inventory — 123-faces-receipt-valuation

Future Hub-relative actions, not product changes made during authoring. Create paths are absent at the pinned baseline; if the same selected file exists on the implementation candidate, extend that file rather than fork a duplicate. Dependency-created files are explicitly labeled. No Delete action or new package dependency is selected.

| Action | Exact file | Selected responsibility / explicit no-change condition |
| --- | --- | --- |
| Create | scripts/faces-receipt-valuation-2026-11.ts | Read-only receipt diagnostic CLI and protected replay report. |
| Create | scripts/faces-receipt-valuation-2026-11.test.ts | Scope/admission/output/process smoke. |
| Create | scripts/faces-receipt-correct-2026-11.ts | Exact correct/compensate preview/apply/status wrapper. |
| Create | scripts/faces-receipt-correct-2026-11.test.ts | Manifest/action/status/unknown outcome and real package smoke. |
| Create | scripts/lib/faces-receipt-replay.ts | T003-owned strict diagnostic DTOs/JSON decoding/document+UnitQualification validators/digests and bounded replay/oracle/effects, before S1. Standard hashing/relative import-free decimal helpers only; actual source math injected after bootstrap. No future US3/CLI import. |
| Create | scripts/lib/faces-receipt-replay.test.ts | Exact absent/unverified/verified/mismatched diagnostic wire/hash/null-UOM/output/resource/baseline/unsupported vectors, opening stock and fixed numeric oracle; later shared compensation unit-basis checks. |
| Create | src/server/services/faces-receipt-correction.logic.ts | Pure complete strict ReceiptChainManifestV1/command/status decoders, hashes and exact result types; zero runtime DB/alias/CLI/env imports; import shared DocumentBasis/UnitQualification types/validators from the already-created pure replay module, no duplicate schema. |
| Create | src/server/services/faces-receipt-correction.logic.test.ts | Exact correct/compensate vectors, all nested bounds/omitted/extra/mixed-action fields and digest-family mutation regressions. |
| Create | src/server/services/faces-receipt-correction.service.ts | Single transaction homogeneous-chain writer and consumer relinking using F3 primitives. |
| Create | src/server/services/faces-receipt-correction.test.ts | Pure/domain manifest/consumer/compensation/status validation. |
| Create | src/server/services/faces-receipt-correction.sql.integration.test.ts | Exact ten-behavior guarded native qualification including actual consumer/inverse/null-UOM preservation and historical proof refusal; no new native name/count. |
| Modify | package.json | Register the exact diagnose/correct no-env-file commands. |
| Modify | scripts/lib/operator-service-loader.ts | F7-created prerequisite: add receiptCorrection key/type only with real F2 service file. |
| Modify | scripts/operator-bootstrap.smoke.ts | F7-created prerequisite: qualify the actual added receiptCorrection graph/root. |
| Modify | scripts/qc/native-postgres-manifest.ts | Admit F2 suite once with exactly the ten required behaviors. |
| Modify | scripts/qc/native-postgres-manifest.test.ts | Unique suite and exact behavior admission. |
| Modify | scripts/qc/native-postgres-report.test.ts | Reject missing/duplicate/skipped required evidence. |
| Create/update execution evidence | specs/123-faces-receipt-valuation/validation.md | Meta-repo-relative exact candidate commands/results, scope/ownership/native receipts and remaining approval gates. |
| Create local evidence only | specs/123-faces-receipt-valuation/evidence/ | Scenario/candidate-named synthetic receipts; no live PII or credential material. Meta-repo paths. |
| No change (F3-owned Modify) | scripts/qa/seed/stock.ts | F3 adds the paired synthetic `stk_corrections` QA seed. F2 makes no edit; its native fixture is created inside its own disposable child database. |
| No change (F3-owned gate participant) | src/server/services/pos.service.ts | F3 makes `setPeriodLock` and the other listed POS writers participate in the shared write gate. F2 relies on that and makes no edit. |

All implementation evidence for this feature (tasks T009–T031) goes to `specs/123-faces-receipt-valuation/validation.md` and `specs/123-faces-receipt-valuation/evidence/`. The read-only snapshots taken while authoring stay where the spec links them, under `audits/2026-11-16-faces-followups/evidence/`.

F3 alone creates supabase/migrations/20261116193000_stock_corrections.sql and modifies the shared stock schema/helpers; consume it, do not create a second migration/table or schema export. F7 owns initial principal/readonly-resolver/loader APIs. Existing decimal.ts, stock.logic.ts, stock.service.ts (including `getStockDailyFlow` and `itemSupplyInfo`), stock-accruals.service.ts, brain-business-corpus.service.ts, POS/finance readers, activity audit, entry-total UI and legacy repair script are reused unchanged; their correction-time behavior is fixed in [correction.md § Derived readers and copies](contracts/correction.md#derived-readers-and-copies). Existing unit tests are reference/oracle evidence; F2-specific new suites carry the selected regression. No product UI/catalog/token/dependency change.

All selected new tests use the existing relevant unit/route/mounted or manifest-owned qa-native harness from quickstart.md; no new runner or implicit skip. Focused tests do not replace the full guarded native lane/report, full candidate checks or owner approval. No execution is claimed. The native exact-count prerequisite is stated in [quickstart.md](quickstart.md#native-postgresql-admission-and-exact-full-lane-command).
