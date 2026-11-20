# Implementation Plan: FACES 89-unit receipt valuation reconciliation

**Branch**: Not created; planned `feat/faces-receipt-valuation` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Proposal F2, pinned Hub `c6c2d5739572356239c4048c0f564f40b0768adc`, timestamped read-only snapshots and offline source-math checks in research.

## Summary

First ship an operator-only read-only discovery/replay report for candidate STE-2026-00559. Verify invoice/currency/UOM/cost allocation, establish eight-unit opening state, and replay receipt ledger 1919 plus the actual downstream dependency segment. Explain receipt contribution, COGS and remaining stock separately. The observed 17 later issues make a bin-only correction insufficient. The selected full correction is the bounded atomic reverse-and-replay in [contracts/correction.md](contracts/correction.md), preserving original ledger and posting the net COGS correction in the approved current open month. Invoice/cost/period evidence remains an apply gate. No zero-quantity revaluation API or privileged ledger rewrite is selected.

## Technical Context

**Language/Version**: Existing Hub strict TypeScript and Bun; package manager verified via registry. No dependency/runtime upgrade.

**Primary Dependencies**: Existing PostgreSQL/Drizzle conventions; `stock.logic.ts` source formulas; the precision policy in [correction.md § Explicit accounting and precision proposal](contracts/correction.md#explicit-accounting-and-precision-proposal); Vitest and local PostgreSQL.

**Storage**: Existing org-scoped PostgreSQL reads; private report/manifest files. No S1 schema/migration changes; S3 consumes the F3-owned shared `stk_corrections` table (kind `receipt_chain`) as specified in the correction contract.

**Testing**: Synthetic receipt/precision/history tests, read-only CLI contract tests, local QA integration; native transaction/idempotency/fault and finance-period tests for the selected S3 writer, as required by the correction contract.

**Target Platform**: Operator-run Bun diagnostic; no new browser/API endpoint.

**Project Type**: Read-only financial/stock evidence tool first.

**Performance Goals**: Exact item/warehouse/entry scope; the statement, lock and overall bounds in [replay-report.md](contracts/replay-report.md#exact-cli-and-authority); enumerate complete same-key closure within the selected 0–128 ordinary-issue envelope; detect transfers/reversals/second receipts/adjustments as unsupported, never silently truncate at the observed 17 issues.

**Constraints**: Technically read-only snapshot; owner approval before data-tagged code; no elevated ledger edit as implicit fix; quantities/payment facts unchanged; numeric precision/rounding explicit; no credentials/PII committed.

**Scale/Scope**: One verified FACES receipt/line and complete affected value chain. 193 item ledger rows were context in the snapshot; the receipt plus 17 later issues is the observed affected segment, subject to fresh-state drift.

## Constitution Check

| Principle | Pre-design | Post-design evidence |
| --- | --- | --- |
| I Spec before code | Pass for authoring | Spec/plan/tasks generated; no product implementation started. |
| II Evidence/AS-IS/TO-BE/DELTA | Pass | Actual IDs/stored values/snapshot times, source anchors and explicitly conditional arithmetic; no invoice assumption. |
| III Slice-scoped delivery | Planned | Bun/master verified; isolated branch/draft PR required at implementation; existing worktrees untouched. |
| IV Required build steps | Pass for first slice | Operator CLI only. A later API/UI surface needs its own reviewed spec covering RBAC/route manifest, Paraglide and design governance/token/browser gates. |
| V Data owner gates | Blocked for implementation/apply | Owner spec approval, reviewed correction contract, owner merge and exact manifest/target/period/cost apply approval pending. Dry-run default, QA undo in finally and repeat no-op required. |

Principle V blocks implementation until the owner approves; a request to prepare specifications does not waive it. No production command is approved here. Review status is stated once in [spec.md](spec.md).

## Project Structure

### Documentation

`specs/123-faces-receipt-valuation/`: spec, research, plan, data model, the four contracts listed in the [contract index](#contract-index), quickstart, tasks, implementation inventory, requirements checklist and the generated design-review.md.

### Proposed Hub source

- `scripts/faces-receipt-valuation-2026-11.ts`: target guards, bounded reads, document-evidence admission and report serialization.
- `scripts/lib/faces-receipt-replay.ts`: strict diagnostic manifest/discovery/replay unions, shared DocumentBasis/UnitQualification and validators/digests from diagnostic-wire.md, then exact decimal admission, source-compatible Number replay and independent rational verification, dependency closure and value/quantity/conservation oracles.
- `scripts/lib/faces-receipt-replay.test.ts`: independent expected math/history tests, including exact 89-unit and nonempty opening cases.
- `scripts/faces-receipt-valuation-2026-11.test.ts`: read-only/error/target/privacy contract tests.
- S3 writer/service/test files and the F3 shared helper prerequisite are enumerated in [contracts/correction.md](contracts/correction.md).
- Existing `src/server/services/stock.logic.ts`, `stock.service.ts`, `pg-schema/stock.ts`, entry route/UI helpers and old valuation repair are evidence/read targets, not edited.

[implementation-inventory.md](implementation-inventory.md) is the per-file Create/Modify/no-change list, including shared files that F2 does not edit.

**Structure Decision**: Separate pure replay from database/secret handling. Do not invoke a legacy repair to discover values; do not reuse bin snapshot copying as a revaluation algorithm.

## Phase 0: Evidence decisions

[research.md](research.md) resolves architecture: the exact receipt candidate, verified eight-unit opening state, downstream issue segment and conditional source-math replay. Unverified invoice/FX/UOM/period/rounding policy are explicit admission blockers: report hypothetical evidence and refuse application, never substitute assumptions.

## Phase 1: Discovery and replay design

[contracts/replay-report.md](contracts/replay-report.md) defines an operator CLI, private file output, error codes and read-only scope. [contracts/diagnostic-wire.md](contracts/diagnostic-wire.md) selects every exact S1/S2 field/null/outcome/hash; data-model.md indexes those types without an alternate prose schema. T003 creates that pure library before S1, with no future US3 service dependency. Read in one repeatable-read read-only transaction after target/role/org verification. Fetch receipt/line/item/warehouse/purchase and exact same-key pre-state; enumerate all later same-key movements by sequence and exact consumers, retaining unsupported reversal/transfer provenance as blockers rather than propagating their valuations. Keep evidence fields separate from owner-verified documentary basis.

Preserve raw original line.uom:string|null; qualify a separate normalized stockUom from actual historical writer/unit/document evidence. Copies preserve null exactly. Unknown currency/UOM remains unknown source evidence; only explicitly labelled hypothesis arithmetic can continue, never a fake historical denomination. First replay the original history to validate source coherence. A mismatch blocks correction planning rather than silently normalizing it. Then calculate hypothetical rates/values using the precision policy in contracts/correction.md, with no intermediate cent rounding. At zero/negative-value and unsupported-history boundaries report blockers. This slice does not implement hypothetical transfer/reversal propagation: the exact support matrix returns unsupported and ineligible for those shapes.

## Delivery slices

### S1 / US1: read-only receipt verification

After owner approval create isolated branch/draft PR from registry master; assess source drift first. Implement candidate identity/document/FX/UOM/cost allocation checks, report exact stored values and missing gates. Keep supplier documents private, committed evidence synthetic/sanitized. Return useful unresolved report even without invoice. Do not assert user input mistake from the observed rate alone. Existing total/unit UI conversion works at pinned source; investigate original version/path only if prevention scope becomes proven.

### S2 / US2: full value-impact report

Depend on the same safe reader, but synthetic replay can be tested independently of document availability. Reproduce 89-unit arithmetic exactly and opening 8 @ 250. The expected values for the immutable v2 snapshot (receipt value 5474.5769, after-receipt average 77.05749381443299, remaining 79-unit value) are listed once in [quickstart.md oracle 2](quickstart.md#focused-tests-available-only-after-s1s2-files-exist). Invoice cent residual 0.0031 stays explicit. Current live source values and all relevant rows must be read again at planning/apply time.

Enumerate issue COGS, realized-accrual value copies, financial report consumers and the derived readers in [correction.md § Derived readers and copies](contracts/correction.md#derived-readers-and-copies). Verify the exact consumer map against the correction contract and block unsupported consumers. For the observed chain, receipt delta 481763.0431 is partitioned across downstream COGS difference and remaining-value difference; do not claim the full delta is current inventory excess. Include original baseline equality, quantity preservation and full-key ledger/bin agreement.

### S3 / US3: selected atomic correction, rehearsal and execution

Implement [contracts/correction.md](contracts/correction.md) after owner spec approval. Its source files, CLI/manifest/storage fields, shared transaction/lock order, supported 0–128 issue envelope with actual discovered consumer arrays, period policy, decimal admission and source-engine tolerance are authoritative. The observed 18-entry/15-accrual/2-ticket counts define one regression fixture only. The writer depends only on F3 shared transaction primitives/compatible locking, not its UI. Apply refuses any movement/reference after its approved preview and every unsupported shape. A further supported ordinary issue before a new complete preview may be admitted under a fresh owner-approved manifest within the cap; that alone needs no new engineering spec.

Rehearse the one-key reverse-descending/replay-ascending transaction with source quantities frozen, current correction timestamp, atomic durable audit/operation receipt, compare-before reference updates, response-loss status/no-op and inverse compensation in finally. Owner must accept the proposed current-open-period treatment and four-decimal receipt residual. Original invoice, fresh closure, exact plan/target approval, owner merge and qualified implementation evidence remain external execution gates. No production command is installed or executed in this drafting stage.

## Validation and exact commands

[quickstart.md](quickstart.md) gives commands and expected results. Arithmetic source checks executed offline from pinned source and private v2 JSON only; exit 0 with Bun's internal tsconfig diagnostic is recorded in research. They prove conditional math, not invoice identity, writer correctness, clean full Hub gates or deployed state.

At implementation run focused Vitest tests and local QA, then `bun run check` (zero errors/warnings), `bun run test` (zero failures), `bun run build`. F2 adds no migration. Independent implementation review and owner merge/deployment/runtime evidence remain separate.

## Risks, errors and recovery

Baseline replay mismatch, missing history/UOM/FX, wrong invoice, ambiguous same-item line, unexpected transfer/reversal, schema/permission failure or any ledger/reference change after preview makes that exact plan ineligible. Never overwrite bins merely to make a check green. Preserve original snapshots and clarify supported historical correction semantics before writes. On unknown commit read durable operation and authoritative rows before deciding retry. Failure in a best-effort audit after stock commit cannot be interpreted as rollback.

## Complexity Tracking

No constitution exception is claimed. First slice adds only guarded reader and pure replay. The selected S3 writer is bounded to the evidenced single-key shape; its operation storage and financial-period policy are specified in contracts/correction.md and require owner approval before implementation. Unsupported broader histories remain ineligible.

## Cross-item execution ordering

Qualify the F3-owned shared transaction helpers, correction storage migration/RLS/seed and compatible lock protocol before F1/F2 writers. For Saypha receipt-chain keys or source entries appearing in an F1 overlap candidate, perform the approved F2 valuation correction first, then regenerate F1 diagnostic/quantity manifests from fresh authoritative state; never reuse pre-F2 fingerprints or independently repair one source twice. Unproven duplicate/missing cases remain ineligible. The garment M/L mapping and stock-only repost involve different item keys and must not change the Saypha chain. F2 refuses any movement or reference change after its preview; a fresh owner-approved manifest is required, within the 0–128-issue envelope. This ordering is a design contract, not current apply authorization.

## Shared interfaces and native ownership

F7 owns the shared existing-session verifier and nonlocking read-only resolver; F3 owns the shared write gate, stock helpers and the single `stk_corrections` migration/seed qualification. Use their exact typed interfaces in contracts/correction.md and F3 contracts/transaction-protocol.md, not copied authentication/RBAC or another ledger writer/table. F2 owns only receipt_chain orchestration and its pure/CLI/native tests. Its SQL fixture belongs to qa-native with the semantic ratchets/full-lane report in quickstart; full ordinary test/build alone does not execute it. No F2 migration is created in parallel to F3's `20261116193000_stock_corrections.sql`.

Package scripts, the private connection variable and the bootstrap/loader rules are in [correction.md § Concrete Bun entrypoints and qualified connection](contracts/correction.md#concrete-bun-entrypoints-and-qualified-connection). The F7 bootstrap prerequisite is F7 contracts/operator-bootstrap.md. F2 helpers return the F3 `{entry,transitioned}` result; submit helpers emit one existing event per replacement entry (1 + issueCount), while the controller writes one durable operation audit and emits no duplicate or new payload field.

The compensation mechanism is the same writer with required action `correct|compensate` and the manifest.basis.policy discriminator from [correction.md § Explicit compensating action](contracts/correction.md#explicit-compensating-action-and-manifest-discriminator). QA finally calls that bounded action only after authoritative apply proof; no raw SQL reset or automatic production-finally undo is authorized. No inverse-of-inverse framework is added.

The shared write gate and lock order are stated once in [correction.md § Shared write gate and authority races](contracts/correction.md#shared-write-gate-and-authority-races).

## Contract index

- [diagnostic-wire.md](contracts/diagnostic-wire.md): strict S1/S2 diagnostic input/result/document/unit/source/coverage/oracle/hash contracts in the pure replay module, including useful absent-invoice hypotheses and original-only unsupported outcomes.
- [replay-report.md](contracts/replay-report.md): owning CLI, read-only authority, resource/exit/publication contract.
- [command-envelope.md](contracts/command-envelope.md): separate US3 correct/compensate manifest, full approval hashes, service/result/status signatures, CLI flags and the single CLI outcome/exit table.
- [correction.md](contracts/correction.md): source-compatible math, positive realized-cost sign, derived readers, shared transaction/principal/consumer/compensation prerequisites.

The correction logic imports DocumentBasis/UnitQualification and pure validators from the T003 replay library; no S1/S2 import of a future writer. Its full manifest binds the unit proof. Compensation inherits the prior immutable correct proof while separately admitting the current executing owner; status preserves the historical actor. Original numeric/UOM hash bytes stay unchanged; only new generated engine-effect readback compares String(Number(actualText)). No contract grants owner approval.

## Implementation record (2026-11-17)

- **T001 approval**: the owner approved implementation on 2026-11-17: "please complete the revisions and proposals and begin implementation". The EGM review is non-converging, so implementation proceeded on the owner's approval of the data-spec; the document/invoice, period and rounding acceptances remain apply gates, not implementation gates.
- **T002 candidate**: Hub clone `~/.cache/claude-tmp/hub-faces-F2`, branch `feat/123-faces-receipt-valuation`, based on F3 commit `dd70f8d7` (F7 principal/loader, F3 `stk_corrections` migration `20261116193000`, `lockStockWrite`, `createEntryInTx`/`submitEntryInTx`/`cancelEntryInTx`). Not pushed; no PR yet (the orchestrator opens it after review).
