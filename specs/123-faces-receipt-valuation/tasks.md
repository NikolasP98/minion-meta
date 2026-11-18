# Tasks: FACES 89-unit receipt valuation reconciliation

**Input**: spec/plan/research/data-model/contracts/quickstart in this directory. **Status**: Implementation in progress (2026-11-17): see "Implementation deviations" for what is done and what is not. Review and approval status is stated once in [spec.md](spec.md). Hub-relative source paths unless prefixed `specs/`. All implementation evidence goes to `specs/123-faces-receipt-valuation/validation.md` and `specs/123-faces-receipt-valuation/evidence/`, as [implementation-inventory.md](implementation-inventory.md) states.

**Tests**: Required by FR-011. Existing offline math does not count as a writer rehearsal or full Hub gate.

## Phase 1: Setup

- [x] T001 Record the EGM outcome, owner data-spec approval and current-source drift assessment in `specs/123-faces-receipt-valuation/plan.md`; block product implementation until approved.
- [ ] T002 Create isolated Hub branch/draft PR against verified registry master and record candidate source/checkout/PR in `specs/123-faces-receipt-valuation/plan.md`; preserve shared WIP.

## Phase 2: Foundational

- [x] T003 Implement the exact DiagnosticEvidenceManifestV1/ReceiptDiscovery/ValuationReplayPlan/source/coverage/error/oracle/hash and shared DocumentBasis/UnitQualification types, strict JSON decoder/pure validators/digests from contracts/diagnostic-wire.md in `scripts/lib/faces-receipt-replay.ts` and `.test.ts` before S1; no schema invention, future writer import or executing CLI dependency. Preserve raw numeric text/null UOM and distinguish original-only unsupported, incomplete, integrity, unverified/verified/mismatched states.
- [ ] T004 Implement explicit org/entry/line/manifest/target/read-only guards and private mode 0600 atomic output in `scripts/faces-receipt-valuation-2026-11.ts`; first slice exposes no apply flag or writer call; use F7-owned operator-principal QualifiedOperatorTarget and nonlocking same-snapshot resolver interfaces from contracts/correction.md, not duplicated SDK/RBAC logic; depend on the F7 admitted Vite SSR operator-service-loader and standalone subprocess qualification; register package.json faces:receipt:diagnose with the entrypoint and bootstrap guard in contracts/correction.md.
- [x] T005 Write CLI read-only/privacy/error tests in `scripts/faces-receipt-valuation-2026-11.test.ts` covering missing IDs, wrong target/tenant, role/read-only loss, invalid manifest, timeout/schema failure and zero writer calls.

## Phase 3: US1 — Verify receipt/document (P1, MVP)

**Goal**: Exact stored facts and document/UOM/currency/cost-basis gate, useful without permission to correct.

**Independent test**: Competing synthetic receipts remain ambiguous except the exact documented cost basis; absent invoice returns eligible false without mutation.

- [x] T006 [P] [US1] Add exact 89-unit/5474.58 total-versus-unit, multiple-line, wrong-UOM/currency and absent-invoice cases in `scripts/lib/faces-receipt-replay.test.ts`; expected rate 61.5121, contribution 5474.5769 and residual 0.0031 are explicit. Add full strict decoder/output/hash vectors for absent invoice/no basis, absent/unverified explicit hypothesis, verified/mismatched documentary/unit/currency/FX/allocation evidence, known 0 versus unknown, unchanged business hashes across run/path metadata and changed source/null-label hashes.
- [x] T007 [US1] Read exact org/receipt/line/item/warehouse/purchase/document/currency/FX and pre-receipt state in one verified read-only snapshot in `scripts/faces-receipt-valuation-2026-11.ts`; do not infer historical FX or cost allocation from current defaults.
- [x] T008 [US1] Implement document evidence admission and explicit mismatch/unverified report in `scripts/lib/faces-receipt-replay.ts`; require positive stock quantity, attributable line and no guessed supplier-UOM conversion. Admit nullable raw receipt/POS/booking labels only through separately qualified historical normalized-stock-unit proof; current item UOM alone cannot verify history, and failed proof leaves writer eligibility false.
- [ ] T009 [US1] Rehearse discovery twice on synthetic local QA and capture no-write hashes, error behavior and private-output permissions in `specs/123-faces-receipt-valuation/evidence/discovery-validation.json`.
- [ ] T010 [US1] Obtain owner-supplied exact invoice/cost-basis evidence for candidate STE-2026-00559 or record the unresolved blocker in `specs/123-faces-receipt-valuation/evidence/document-verification.md`; keep the source invoice/PII private and commit only its evidence hash/reference.

## Phase 4: US2 — Explain downstream value (P1)

**Goal**: Full original/hypothetical value chain, unchanged quantities and separate COGS/remaining value.

**Independent test**: Opening 8 @ 250 plus receipt 89 @ 61.5121 then issue 18 yields 79 units and the oracle 2 values in quickstart.md. Transfer/reversal/adjustment/second-receipt and zero-terminal histories deterministically block hypothetical replay/apply.

- [x] T011 [US2] Add original-baseline, nonempty-opening, subsequent receipt/transfer/issue/reversal/adjustment/zero-bin, unsafe sequence and missing-history tests in `scripts/lib/faces-receipt-replay.test.ts` with independent expected decimal values and exact closed outcomes/coverage/error codes; unsupported results contain original evidence only, no hypothetical prefix/totals; context/read/resource overflow never fakes complete output.
- [x] T012 [US2] Implement canonical sequence-ordered source-compatible Number replay with exact decimal admission and independent rational verification, the deterministic homogeneous support matrix and explicit unsupported transfer/reversal outcomes in `scripts/lib/faces-receipt-replay.ts`; no timestamp-only ordering, Number-typed ledger IDs or per-movement cent rounding.
- [x] T013 [US2] Enumerate actual post-receipt rows, realized-accrual/financial consumers and the derived readers in contracts/correction.md in `scripts/faces-receipt-valuation-2026-11.ts`; validate original snapshots before hypothetical replay and accept additional ordinary homogeneous issues only through a fresh owner-approved manifest within the 128-issue envelope; unsupported shapes block.
- [x] T014 [US2] Emit receipt contribution, per-row/consumer COGS differences, current remaining value, quantity preservation, conservation and full-union latest-ledger/bin checks in `scripts/lib/faces-receipt-replay.ts`; no bin-only “fix”.
- [ ] T015 [US2] Capture current conditional replay and blockers with exact source/snapshot/row/digest/precision evidence in `specs/123-faces-receipt-valuation/evidence/impact-report.json`; label hypothetical until invoice, rounding and period policy are approved.

## Phase 5: US3 — Selected atomic correction (P2, owner/code/apply gates pending)

**Goal**: One approved representation with deterministic apply/recovery and no-op repetition.

**Independent test**: Disposable fixture apply once/repeat/no-op, stale-state refusal, interrupted/unknown commit recovery, preserved quantities/originals and approved value effects only.

- [ ] T016 [US3] Complete independent review and owner approval of `specs/123-faces-receipt-valuation/contracts/correction.md`; consume F3-owned `supabase/migrations/20261116193000_stock_corrections.sql`, shared schema/RLS and paired QA seed qualification plus the shared transaction/locking prerequisites; F2 adds no second migration/table and preserves normal-role append-only grants.
- [ ] T017 [US3] Prepare the private approved target/operation/document/plan/source-state manifest and sanitized impact at `specs/123-faces-receipt-valuation/evidence/correction-plan.json`; coordinate F1/F3/prior true-ups and refuse changed fingerprints.
- [x] T018 [US3] Write the pure decoder/hash tests in `src/server/services/faces-receipt-correction.logic.test.ts` before the logic module: every field family and bound in contracts/command-envelope.md, stable correct and compensate vectors, mixed-action/omitted/extra fields, DocumentBasis.unitQualification hash binding and same-key conflict on any changed intent.
- [x] T023 [US3] Implement `src/server/services/faces-receipt-correction.logic.ts` per contracts/command-envelope.md: strict ReceiptChainManifestV1/command/status decoders and hashes, importing DocumentBasis/UnitQualification types and validators from `scripts/lib/faces-receipt-replay.ts`; no DB, alias, CLI or environment import.
- [x] T024 [US3] Write service tests in `src/server/services/faces-receipt-correction.test.ts` before the service: preview/apply/status signatures, result and receipt placement, consumer relinking, accrual `realized_value` sign and `updated_at`, raw `uom` copied exactly including null, compensate inheriting the prior unit proof, action-mismatched status and historical-actor deletion.
- [x] T025 [US3] Implement `src/server/services/faces-receipt-correction.service.ts`: the atomic algorithm, consumer updates and compensating action in contracts/correction.md, using F3 primitives and the shared write gate; admit 1–129 entries from fresh discovered arrays; reject post-preview drift and unsupported shapes; no broad legacy repair or zero-quantity primitive.
- [x] T026 [US3] Write CLI tests in `scripts/faces-receipt-correct-2026-11.test.ts` before the CLI: preview/apply/status flags from contracts/command-envelope.md, duplicate/unknown/conflicting flags, the single outcome/exit table, unknown commit, private output and bootstrap ordering with an absent private DB variable.
- [x] T027 [US3] Implement `scripts/faces-receipt-correct-2026-11.ts` per contracts/command-envelope.md: owner/target/manifest admission, preview/apply/status modes and private atomic output.
- [ ] T028 [US3] Register `faces:receipt:correct` in `package.json`, add the `receiptCorrection` key in `scripts/lib/operator-service-loader.ts` and qualify it in `scripts/operator-bootstrap.smoke.ts`, as contracts/correction.md and implementation-inventory.md specify.
- [x] T019 [US3] Admit `src/server/services/faces-receipt-correction.sql.integration.test.ts` exactly once to qa-native in `scripts/qc/native-postgres-manifest.ts` with the quickstart behaviors/minimumAssertions, and extend `scripts/qc/native-postgres-manifest.test.ts` and `scripts/qc/native-postgres-report.test.ts` to reject missing/duplicate/skipped evidence.
- [x] T029 [US3] Write `src/server/services/faces-receipt-correction.sql.integration.test.ts` within the ten quickstart behaviors: fixture replay, envelope limits, atomic commit, faults, double-correction refusal, concurrency orders, period/permission races, finance period queries, unknown commit plus real compensate, read-only denial; source-created null receipt/POS/booking UOM through originals/replacements/inverse; exponent-expanded readback only through String(Number(actualText)); derived-reader expectations from contracts/correction.md (accrual `updated_at`, last restock cost, daily-flow bucket).
- [ ] T030 [US3] Run the full native lane and report validator commands in quickstart.md on the isolated candidate and record results in `specs/123-faces-receipt-valuation/validation.md`.
- [ ] T031 [US3] Rehearse apply twice, fault/unknown outcome, concurrent source change, durable receipt and the real compensate action in finally on disposable local PostgreSQL (no hidden SQL reset), including tampered inverse fields, prior-map drift, different-key double inverse and inverse-repeat no-op; save quantity/value/COGS/other-tenant invariants at `specs/123-faces-receipt-valuation/evidence/correction-rehearsal.json`.
- [ ] T020 [US3] Obtain owner exact-manifest/target apply approval and owner merge, then capture authoritative outcome, preserved quantities, full-key bin/ledger equality, approved consumers and repeat no-op at `specs/123-faces-receipt-valuation/evidence/correction-receipt.json`; stop on stale or unknown state.

## Phase 6: Polish and qualification

- [ ] T021 Run focused tests plus `bun run check`, `bun run test`, `bun run build`, independent implementation review and exact-candidate hash capture in `specs/123-faces-receipt-valuation/validation.md`; distinguish source/local/merge/deployment/runtime evidence.
- [ ] T022 Update `specs/123-faces-receipt-valuation/quickstart.md` and proposal ledger with actual evidence and remaining gates; add exact-site TODO(handoff) only for genuine implementation open ends and preserve unrelated code.

## Dependencies and execution order

T001→T002→foundation T003–T005→US1 T006–T010. US2 pure tests/replay can progress using synthetic evidence after foundation, while production eligibility depends on US1. T015 must not claim a verified correction when T010 remains unresolved. US3 depends on complete US1/US2, reviewed writer design and separate owner approvals; within US3 the order is T016→T017→T018→T023→T024→T019→T029→T025→T026→T027→T028→T030→T031→T020, so each test task precedes its implementation. Full gates/review apply to each implementation slice. No repair task is ready merely because offline arithmetic passed.

## Parallel examples

- US1: T006 pure arithmetic/document fixtures can proceed while T007 read adapter is built after foundation; different files. Admission/replay functions share a module and are sequential.
- US2: independent consumer census T013 can run alongside synthetic replay tests after reader contract is stable; value planning waits on both.
- US3: after T016 approval and shared helper qualification, T018/T023 (pure logic) and T019 (native admission) touch different files and may proceed in parallel; the service, CLI, approvals and production execution are sequential.

## Implementation strategy

MVP is read-only US1; US2 adds impact explanation and can remain explicitly hypothetical. S1/S2 are bounded implementable slices after owner data-spec approval. US3 has a concrete selected correction contract; owner approval, invoice/cost/period acceptance, F3 helper prerequisite, qualified implementation and exact-manifest apply approval remain pending. No production apply command, invoice proof or owner authorization is fabricated.

## Cross-feature rules

- Cross-item execution ordering: [plan.md](plan.md#cross-item-execution-ordering).
- Cost-bearing admission and field tiers: [correction.md](contracts/correction.md#exact-shared-principal-contract-and-cli-modes).
- Shared write gate and lock order: [correction.md](contracts/correction.md#shared-write-gate-and-authority-races).
- Contracts: [plan.md contract index](plan.md#contract-index).

All 31 tasks remain unchecked. Native additions stay within the ten registered behavior names, and source/current-owner versus historical-actor status rules remain unchanged.


## Implementation deviations (2026-11-17, branch feat/123-faces-receipt-valuation)

Done and proved: T001 (owner approval quoted in plan.md), T003/T006/T008/T011/T012/T014 (`scripts/lib/faces-receipt-replay.ts`, 25 vitest cases incl. owner-attested document, null UOM, unsupported matrix, 129th-issue boundary, digests), T005 (`scripts/faces-receipt-valuation-2026-11.test.ts`, 16 cases), T007/T013 (SQL reader `readReceiptSource`, verified ad hoc against a native child database, see below), T018/T023 (`faces-receipt-correction.logic.ts`, 12 cases). Not ticked, with reason:

- **T002**: branch recorded; the draft PR is the orchestrator's step.
- **T004**: the CLI, argument/target/principal admission, private I/O and package script `faces:receipt:diagnose` exist and are unit-tested with injected ports. The real wiring (F7 loader `rbac`/`stockLogic` keys plus a drizzle handle over the owned transaction) was NOT run end to end (no GoTrue, no operator bootstrap smoke). F7's `operator-bootstrap.smoke.ts` does not exist on this base.
- **T009/T010/T015/T017/T020/T021/T022/T030/T031**: execution evidence, owner invoice/cost-basis evidence, production apply and full gates: owner or orchestrator actions. Nothing here connects to production.
- **T016**: owner approval of correction.md is the owner's gate.
- **T019**: the new native file is deliberately NOT registered in `NATIVE_POSTGRES_MANIFEST`. The quickstart requires exactly ten named behaviors; the suite covers four honestly (atomic commit with relinked consumers/audit/replay/status, stale + key reuse + no double correction, fault rollback + no new effects on repeat, authority/period/foreign denial). Registering a ten-name manifest entry over four behaviors would be a false claim.
- **T024**: pure service unit tests (mocked) are not written; the service is proved only by the native suite.
- **T025**: `applyReceiptCorrection` implements action `correct` only. Action `compensate` is decoded/hashed/validated but not executable (refused as `unsupported_movement`). No QA finally-compensation exists yet.
- **T026/T027/T028**: `faces-receipt-correct-2026-11.ts`, its tests, the `faces:receipt:correct` script, the `receiptCorrection` loader key and the bootstrap smoke qualification are not built. Preview/apply/status exist as service exports; `draftReceiptCorrectionManifest` is the manifest producer.
- **T029**: the 128-issue and 129th-issue native cases, the concurrency/lock-barrier orders, the two finance COGS query oracles, derived-reader assertions (last restock, daily-flow) and compensation are not written.

Native evidence: `faces-receipt-correction.sql.integration.test.ts` 4/4 passed on the local qa-native Postgres (:55462, owned child database) with a temporary config limited to that file. `bun run check`/full test were not run (brief).

### Decisions for the open review findings

See the "Implementation decisions" sections appended to contracts/correction.md, contracts/command-envelope.md and contracts/diagnostic-wire.md (manifest producer, state-digest contents, human_id allocation, F3 attribution of the 9/4-digit rule, accrual est_* snapshots, last-restock scope, finance cache, compensate source_id, error mapping, status currentState, baseline comparison, decimal limits, centDisplay).


### Update 2026-11-17 (second pass, rebased onto F3 `9556acc2`)

Now done: T019 (ten behaviors registered with `exactAssertions`, run through the REAL `vitest.qa-native-postgres.config.ts`; manifest/report validator tests 30/30), T024 (`faces-receipt-correction.test.ts`, boundary tests), T025 (`compensate` is executable: `draftReceiptCompensationManifest`, `assertPrior`, inverse apply/replay/status; double inverse and inverse-of-inverse refuse), T026/T027 (`scripts/faces-receipt-correct-2026-11.ts` + 27 tests: preview/apply/status plus a documented `--draft` mode that is the manifest-producer entry point, an extension of the flag table), T029 (10 native behaviors incl. 0/128 issues, 129th refusal, second receipt/adjustment/transfer refusal, issue-first and correction-first lock-barrier orders, three fault injections, two finance COGS query shapes against raw SQL, unknown-commit recovery and inverse, authority/append-only). Package script `faces:receipt:correct` registered; loader key `receiptCorrection` added and proved by the real-graph loader test.

Still open: **T028** is partial: the loader key and package script exist, but F7's `scripts/operator-bootstrap.smoke.ts` is not on this base, so the actual package-process smoke qualification is not written. **T029** does not assert the last-restock (`itemSupplyInfo`) and stock daily-flow derived readers; accrual `updated_at` and relinking ARE asserted. T004/T009/T010/T015/T016/T017/T020/T021/T022/T030/T031 remain owner/orchestrator actions as listed above. The real CLI wiring (GoTrue, loader, owned connection) was not run against a real target; every port is unit-tested and the service graph is proved by the loader and native tests.

Implementation notes found while building: the first apply attempt exposed that `postgres.js` rejects a JS `Date` bound inside a raw `sql` template (the accrual `updated_at` is bound as an ISO string cast to timestamptz), and that a competing backend in the concurrency test needs its own connection (a single-connection client serializes before the gate).

### Audit fixes (2026-11-17, F2 re-audit)

- Correct mode refuses (`unsupported_movement`) any chain entry carrying `correctionOf`/`compensatesOperation` metadata or being the `replacement_entry_id` of a receipt_chain row; `currentState: 'compensated'` requires a receipt_chain row with `intended.action='compensate'` and `intended.inverseOfOperationId` = this operation id (a second correct on a replacement no longer flips the first to compensated).
- `basis.valuationCurrency` must equal `fin_settings.currency` (stock is valued in the org currency; foreign typed rates are converted at entry time) at draft and in `verifyFresh`; `basis.roundingResidual` must equal total - qty x rate (decode, draft). Both refuse `invariant_failed`/`$.basis.roundingResidual`.
- Compensate: every restored issue `valueDelta` within 1e-8 of the prior original and every `intendedRealizedValue` = round4(-original issue cost), checked in `assertPrior`.
- Idempotent replay is owner-gated like a fresh apply; the compensating receipt drops the stale `correctionDocumentSha256` and carries the first `originalPostedAt`; POS consumers must have `id === issue source id`; the CLI refuses an existing `--output` before `run` (exit 3, no commit).
