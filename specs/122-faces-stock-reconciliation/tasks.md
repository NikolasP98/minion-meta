# Tasks: FACES fulfillment stock reconciliation

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/*.md`, `implementation-inventory.md`, `quickstart.md`.

**Status**: Implementation in progress (F1 branch feat/122-faces-stock-reconciliation); see the ticked tasks and Implementation deviations below. Review and approval state is the Status line of [spec.md](spec.md). Paths below are Hub-relative unless prefixed `specs/` or `audits/` (meta-repo-relative). All execution evidence goes under `audits/2026-11-16-faces-followups/F1/`; it is synthetic or sanitized, with no PII or credentials.

**Tests**: Required by FR-012; write a failing synthetic reproduction before any prevention change. Do not count source inspection as product test execution.

## Phase 1: Setup

- [x] T001 Record owner spec approval, EGM outcome and current-source drift assessment in `specs/122-faces-stock-reconciliation/plan.md`; block product implementation until approved. _Done: owner approval 2026-11-17 recorded in plan.md: "please complete the revisions and proposals and begin implementation"._
- [x] T002 Create isolated Hub feature branch/draft PR against verified registry `master` and record checkout/source/PR in `specs/122-faces-stock-reconciliation/plan.md`; preserve shared WIP. _Done: branch feat/122-faces-stock-reconciliation in clone ~/.cache/claude-tmp/hub-faces-F1 (no push, no PR by instruction; orchestrator opens it)._

## Phase 2: Foundational

- [x] T003 Implement the strict decoders and types of contracts/diagnostic-wire.md and contracts/source-explanation.md in `scripts/lib/faces-stock-reconciliation.ts`: DiagnosticManifestV1, ReconciliationReport, CaseRow, components, secondaryFindings and numericChecks; SourceEvidenceRow/SourceValue (including `booking.resourceId`, `booking_group` as `<resourceId>/<groupId>`, `booking_status`, `invoice` and the raw bounded warning `code`), TimelineRow (including `changed_at`), `sourceEvidenceSha256`, ProjectionAssertion/ProjectionEvidenceResult, the Reason union with `stock_source_unknown`, and the run-stable comparison projection; apply the ordered decision table in contracts/report.md; no automatic eligibility for incomplete or mixed evidence. _Done: scripts/lib/faces-stock-reconciliation.ts; 41 pure tests in faces-stock-reconciliation.test.ts pass._
- [x] T004 Add the three package.json CLI entrypoints and the F7 shared Vite SSR bootstrap dependency from contracts/report.md, then implement CLI scope/manifest/read-only guards and private output handling in `scripts/faces-stock-reconcile-2026-11.ts`: unique nonempty `caseKey` of at most 100 characters, validated UUIDs, mode 0600 files, explicit org, no apply flag, token verification and read-only admission per contracts/report.md Shared principal and snapshot admission, and the finance field-tier cost authority in contracts/report.md Cost authority; never call a `FOR SHARE` resolver inside a read-only transaction. _Done: scripts/faces-stock-reconcile-2026-11.ts + faces:stock:diagnose; only the diagnose entrypoint is registered in this slice (mapping/repair registered with their files, review F1-R6-IR-04)._
- [x] T005 Write and pass guard-contract tests in `scripts/faces-stock-reconcile-2026-11.test.ts` for missing/invalid scope, wrong tenant, invalid/expired/foreign token, role/read-only loss, schema/timeout failure, redacted errors, no calls to writers, ordinary owner/custom-role success with stock field tier 0 and sufficient finance authority, and finance-view/tier/module denial. _Done: scripts/faces-stock-reconcile-2026-11.test.ts, 14 tests pass (incl. tampered authUrl refused before any network call)._
- [ ] T024 Implement `decodeStockEntrySource` in `scripts/lib/faces-stock-reconciliation.ts` exactly as the table in contracts/source-explanation.md, section Stock entry source decoder, and add its unit vectors to `scripts/lib/faces-stock-reconciliation.test.ts`: every table row, the observed POS-with-`ticketId`, `repair-opening-balance`, `analyst-reconciliation-2026-08` and `{}` shapes, mismatched `ticketId`, non-UUID `sourceId`, invoice without `invoiceId`, a known source on the wrong entry type and an unlisted literal (decodes to `unknown` with a hash, no raw metadata in output).

## Phase 3: US1 — Explain discrepancies (P1, MVP)

**Goal**: Produce a complete read-only report or explicit incomplete/unresolved result.

**Independent test**: One synthetic set yields duplicate, missing, variant mismatch, display-only, valid and unresolved classifications with canonical ledger sums and zero writes.

- [x] T006 [P] [US1] Add classification/multiplicity tests in `scripts/lib/faces-stock-reconciliation.test.ts` including one ticket with three bookings, shared recipe item, reversals, prior true-up, unknown historical mapping, explicit empty consumption, mixed duplicate+variant, partial missing component, unknown+valid component, an affected movement whose source decodes to `unknown`, same org/two resources/same `groupId` (separate membership, distinct refs and hashes, no cross-visit classification or projection match), the source-explanation D1/D2, draft, accrual, warning, status-log and capture vectors, and the data-model numeric-boundary and large-ledger-ID fixtures. _Done: classifier/multiplicity vectors in faces-stock-reconciliation.test.ts and native behaviors 1-2._
- [x] T007 [US1] Implement canonical ledger-ID deduplication, separate provenance graph, signed totals and fail-closed classification in `scripts/lib/faces-stock-reconciliation.ts`; apply the classification precedence and BigInt decimal/tolerance policy from contracts/report.md and data-model.md; preserve raw numeric evidence and unresolved values rather than substituting zero. _Done: canonical dedupe, BigInt decimal policy and ordered classifier in the pure lib._
- [x] T008 [US1] Query bounded same-org POS/payments/bookings/booking groups (resource-qualified, as `visitMembers`)/booking status log/booking products/grants/redemptions/accruals/entries/ledger/mappings/adjustments/invoices within one verified read-only snapshot in `scripts/faces-stock-reconcile-2026-11.ts`, filling the contracts/source-explanation.md source evidence and timeline; select ledger IDs only as text per data-model.md Ledger identity; use `pos_ticket_lines.fin_product_id` and `fin_invoices`; decode entry sources only with `decodeStockEntrySource`; join party identity privately where attendee-name matching fails. _Done: scripts/lib/faces-stock-reconcile-read.ts; proven read-only on the real child database. Grants/redemptions included; `correction` source rows and the explicit prior-correction lookup are NOT read (TODO(handoff) in the read module comment, coverage stays unknown)._
- [x] T009 [US1] Add full-union latest-ledger/bin-key comparison and evidence-completeness reporting to `scripts/lib/faces-stock-reconciliation.ts`; detect missing bins and orphan bins as well as differing quantities/rates. _Done: computeKeyTotals full-union ledger/bin integrity._
- [ ] T010 [US1] Rehearse report twice against synthetic loopback QA and capture no-write hashes, classifications and error scenarios in `audits/2026-11-16-faces-followups/F1/qa-diagnostic.json`; require byte-identical run-stable projections (contracts/diagnostic-wire.md).
- [ ] T011 [US1] After target-qualified read-only admission, reconcile reported private cases and seven overlap candidates into `audits/2026-11-16-faces-followups/F1/reconciliation-summary.md`; avoid PII and never sum repeated ticket aggregates as separate issues.

**Checkpoint**: Diagnostic MVP can ship independently. No writer or historical correction follows automatically.

## Phase 4: US2 S2a — Verified Faja M mapping correction (P1, owner-gated)

**Goal**: Correct the verified M product recipe from the L item to the M item.

**Independent test**: Synthetic Faja M mapping regression, gated cutover and repeat no-op; payment facts and correct counter sale behavior unchanged.

- [ ] T012 [US2] Approve the S2a Faja M mapping correction manifest (L item → M item), atomic replacement/cutover/recovery policy and tests in `specs/122-faces-stock-reconciliation/contracts/mapping-correction.md` and `contracts/mapping-envelope.md`.
- [x] T013 [US2] Add the synthetic Faja M mapping and total-0 product regression in `scripts/lib/faces-garment-mapping.test.ts`; synthetic fixtures only. _Done: scripts/lib/faces-garment-mapping.test.ts (pure) + native behavior 3 posts a zero-total M line and an L line after the mapping with the real poster (M-only and L-only issues)._
- [x] T014 [US2] Implement the approved dry-run-default mapping CLI in `scripts/faces-garment-mapping-2026-11.ts`, the pure strict input/hash plan in `scripts/lib/faces-garment-mapping.ts` and the owning correct/compensate preview/apply/status in `src/server/services/faces-garment-mapping.service.ts` per contracts/mapping-envelope.md; add `src/server/services/faces-garment-mapping.test.ts`, the `garmentMapping` typed loader key in the F7-created `scripts/lib/operator-service-loader.ts` and its case in the F7-created `scripts/operator-bootstrap.smoke.ts`; compute `unchangedStockPaymentSha256` per contracts/unchanged-facts.md using `decodeStockEntrySource` (blocked `incomplete_evidence` on an `unknown` source) and text ledger IDs; compare exact old recipe/bridge/component state, preserve the L mapping, require the no-op receipt and approved target/digest, and use the write gate pair and fresh old-M draft/open-accrual census refusal in contracts/mapping-correction.md. Status is read-only and takes no gate; the gate-held census belongs only to apply. Test the finance field-tier admission and denials of contracts/report.md Cost authority. Block apply without the qualified protocol/deployment evidence. _Done: mapping service, pure lib, CLI wrapper (faces:stock:mapping) and loader key `garmentMapping`; the loader smoke case is NOT added because scripts/operator-bootstrap.smoke.ts is F7-created and absent at this base._
- [ ] T016 [US2] Admit `src/server/services/faces-stock-reconciliation.sql.integration.test.ts` exactly once to qa-native with the eight requiredBehaviors and minimumAssertions in quickstart, then run the full native lane/report validator for PostgreSQL cutover/atomicity tests and capture invocation/results in `audits/2026-11-16-faces-followups/F1/concurrency.json`; no mocked-only concurrency claim and no ninth behavior.

## Phase 5: US2 S2b — Additional proven prevention (conditional, amendment-gated)

**Goal**: Fix an additional code defect only if S1 proves one.

**Independent test**: Local failing reproduction followed by the D1→D2 matrix in plan.md; payment facts and correct counter sale behavior unchanged.

Skip this phase entirely, and record that result in `audits/2026-11-16-faces-followups/F1/reconciliation-summary.md`, unless T011 proves an additional defect and the owner approves a reviewed S2b design amendment naming the failing transition, writer, files and tests (plan.md S2b).

- [ ] T025 [US2] Under the approved S2b amendment only: add the failing advance-payment/package/product/garment/split-payment reproduction in `src/server/services/stock-accruals.service.test.ts`, `src/server/services/scheduling-bookings-accrual.test.ts` and the existing POS stock test files the amendment names; synthetic fixtures only.
- [ ] T015 [US2] Under the approved S2b amendment only: qualify single/group/gateway completion, draft retry with changed payload, explicit empty consumption, cancel/no-show/reschedule/void and package-right preservation in `src/routes/api/scheduling/bookings/_handlers.test.ts` and `src/routes/api/scheduling/bookings/[id]/complete/server.test.ts`, plus the amendment-named integration tests.

## Phase 6: US3 — Approved known-garment correction (P2, F3 dependency and owner gates)

**Goal**: Apply only reviewed and approved changes with recovery and repeat invariants.

**Independent test**: Exact synthetic manifest applies once, repeats as no-op and recovers authoritatively after interruption/unknown result.

- [ ] T017 [US3] Qualify the selected `specs/122-faces-stock-reconciliation/contracts/repair.md` against the current case and the independently approved F3 atomic service contract; confirm true-up coverage, actor/period/target and exact frozen single-ticket manifests for POS-00092/00098 before writer implementation; keep the older POS-00059 ineligible without true-up coverage proof.
- [ ] T018 [US3] Create the private fingerprinted manifest and sanitized before/after report at `audits/2026-11-16-faces-followups/F1/repair-plan.json`; require exact IDs, org/target, approved plan digest, signed qty/value/COGS deltas, the owner-attested `StockValuationQualificationV1` and unchanged payment facts.
- [x] T019 [US3] Implement `scripts/faces-garment-repost-2026-11.ts`, pure validator `scripts/lib/faces-garment-repost.ts` and their tests using the qualified F3 `stock_only` atomic engine: freeze the original L issue and transform only the approved M quantity, never regenerate unrelated ticket recipes; require the original issue to decode to `{kind: 'pos'}` for the ticket; require exact Q4 equality of frozen L and replacement M quantities independently of `planRepost`'s tolerance; import F3 `StockValuationQualificationV1` with its validation/hash/receipt/inverse/current-reader cases from contracts/repair.md; test the finance field-tier admission and denials of contracts/report.md Cost authority. Do not create a second ledger writer or invoke the old service-repair script. _Done: scripts/faces-garment-repost-2026-11.ts, pure validator, service; runs on F3 cancel/create/submit primitives (see deviations); 20 pure + native two-case proof._
- [ ] T020 [US3] Rehearse apply twice, stale-state refusal, cancel→repost interruption, post-commit audit failure, unknown-outcome reads and compensation in `finally` on disposable QA, using F3 garment-envelope.md `action=compensate` with a fresh own receipt, manifest and key: the equal-rate fixture restores economic state, and the unequal-rate fixture discloses the actual cost delta without claiming rollback; save the invariant receipt at `audits/2026-11-16-faces-followups/F1/repair-rehearsal.json`.
- [ ] T021 [US3] Obtain explicit owner exact-manifest/target apply approval and owner merge, then record the executed operation, deployed SHA where relevant, latest ledger/bin checks, unchanged unrelated records and second-run no-op in `audits/2026-11-16-faces-followups/F1/repair-receipt.json`; stop on drift or unknown commit. Refresh and re-approve each subsequent shared-bin case rather than reuse pre-first-operation fingerprints.

## Phase 7: Polish and release qualification

- [ ] T022 Run required `bun run check`, `bun run test`, `bun run build` and independent implementation review; save exact candidate hashes/results in `audits/2026-11-16-faces-followups/F1/validation.json` and record owner merge/deployment/runtime status separately.
- [ ] T023 Update `specs/122-faces-stock-reconciliation/quickstart.md` and the existing proposal ledger with evidence and any remaining gaps; add exact-site `TODO(handoff)` only for actual implementation open ends, preserving unrelated code.

## Dependencies and execution order

T001→T002→foundation T003–T005 and T024→US1 T006–T011. T006 can run independently of query implementation once report types are defined.

- S2a (T012–T014, T016) depends on US1 evidence for the mapping, owner approval of this spec and the S2a manifest, F7 qualification and F3 write-protocol qualification.
- S2b (T025, T015) runs only if T011 proves an additional defect and its amendment is approved; otherwise it is recorded as not needed.
- US3 (T017–T021) depends on US1 attribution, the applied S2a mapping correction and its durable receipt (T014 apply), qualified F3 atomic service, the selected garment contract and exact owner approval. It depends on S2b only when the S2b amendment names a defect on the garment issue path.
- T022 applies to every implementation slice, not only after all repairs. T023 closes each delivery handoff.

Cross-item ordering with F2 and F3 is stated once in plan.md, Cross-item execution ordering.

## Parallel examples

- US1: synthetic classifier test authoring T006 may proceed while the read-only query adapter T008 is developed after foundation; these touch distinct files. T024, canonicalization T007 and integrity T009 share a file and are sequential.
- S2a/S2b: after T012, S2a mapping tests and any approved S2b fixture tests touch distinct files. Do not parallel-edit the same stock writer; database concurrency tests follow the chosen mechanism.
- US3: after T017, independent manifest review and synthetic fault-fixture preparation may proceed, but writer execution and target approvals are sequential.

## Implementation strategy

MVP is US1 alone after approval: a bounded explanation without mutation. The verified M mapping and garment repair use selected contracts; implementation remains gated by owner approval, fresh attribution/true-up evidence and F3 qualification. Any additional unproven timing defect remains a separate evidence-bound amendment; no unspecified historical writer is described as ready. Every shipped slice receives focused tests, full Hub gates, independent review, owner merge and its own evidence. No production action or completed task is implied by this list.


## Implementation deviations

Recorded 2026-11-17 by the F1 implementer; each is the smallest change faithful to the spec's intent and is binding for the owner approval of the S2a manifest.

1. **Opening-balance receipt and legacy invoice ids** (review F1-R6-IR-01). `decodeStockEntrySource` decodes `type: 'receipt'` with `{source: 'repair-opening-balance'}` (what `scripts/repair-stock-valuation.ts` writes) as `manual_reconciliation`, and decodes invoice sources with the live index rule `lower(btrim(metadata->>'invoiceId'))`, so uppercase or padded ids resolve to the lowercase canonical id instead of `unknown`. Adding both is a reviewed contract change recorded here and in contracts/source-explanation.md. The decoder takes an optional third `metadataSha256` argument (PostgreSQL computes it in the diagnostic).
2. **Pairing precondition** (F1-R6-IR-08). A variant pairing uses the owner-asserted intended item and the unique unexpected attributable item with exact Q4 quantity, same warehouse and equal item stock UOM; the closed `ExpectedComponent` schema is unchanged.
3. **Unit semantics** (F1-R6-codebase-details-01). `MappingIntent.qtyPerUnit` is in the target item's consumption unit. The plan requires `qtyPerUnit / units_per_stock_uom` (identity without a conversion) to equal exactly `1.0000` stock units for the M item and for the L baseline, and equal item stock UOM labels; otherwise preview returns blocked `unsupported_scope`. No new MappingState field: the `stk_items` row hashes in `ruleRows` bind item state.
4. **Cutover census predicates** (F1-R6-IR-03): `pendingDrafts` = DRAFT issue entries holding the old item whose decoded source is a ticket with an M-product line or a booking carrying the M product (an `unknown` source blocks as `incomplete_evidence`); `openAccruals` = OPEN `stk_accruals` with `fin_product_id` = M (by product, not by item); `submittedIssues` = the same predicate on SUBMITTED entries (evidence only); `ledgerHighWater` = max ledger id over the old and new item. Warnings without a persisted draft are not drafts. The approved note must be preserved (`intended.note` equals the old row note).
5. **Manifest producer** (F1-R6-IR-02): `--draft` mode (`draftMappingManifest`, `draftGarmentRepostManifest`) reads fresh database values read-only and emits an unapproved candidate; the executable manifest still needs the owner's approved digest.
6. **Unchanged-facts and the finance sync** (F1-R6-codebase-details-03): `fin_invoices` is hashed without `synced_at`; `fin_invoice_items` and `fin_payments` are hashed as one stable per-invoice aggregate that excludes `id`, `created_at` and `synced_at`, because `upsertInvoicesBatch` delete-replaces those rows with new ids. Apply recomputes the digest inside its gated transaction before and after the recipe write.
7. **Garment engine** : F3's `GarmentManifestV1` and garment engine do not exist at the F3 base commit, so F1 defines the closed `GarmentRepostManifestV1` and runs cancel original, create and submit the M replacement, stamp the ticket, immutable `sale_stock_repost` receipt and one audit in one gated transaction over F3's existing primitives. Period-lock/fiscal admission of `postedAt` is not enforced yet (TODO(handoff)). Replace by F3's engine when it lands.
8. **Native registration** (F1-R6-IR-04): the F1 native file is registered once with the eight exact names; behaviors 6 and 8 are exercised with the F1-defined garment and mapping services.
9. **Token destination**: `FACES_OPERATOR_AUTH_URL` is a required private env; the manifest `target.authUrl` must equal it (F7 helper commit 8ea80210).

## Owner actions and open ends

T010 evidence file, T011 (production read-only diagnosis), T012 (owner approval of the S2a manifest), T016 full-lane/report validation and `concurrency.json`, T017-T018 against the live cases, T020 garment compensation rehearsal, T021 and T022 (central `bun run check`, full gates) remain open. Production apply of the mapping and of each garment case is an OWNER action after F2 (receipt valuation), F3 rollout and drain evidence.

### Audit-fix decisions (2026-11-17)
- Mapping plan now also blocks `unsupported_scope` when the from/to items have `stk_item_components` rows or the target is not `is_stock_item`; `rollout_unverified` unless env `FACES_DEPLOYED_SHA` equals `rollout.candidateSha` (the operator attests the deploy; the evidence hash alone is not verification).
- Mapping CLI: `operation_conflict` exits 5 (uncertain, run `--status`), not 4.
- Garment compensate must exactly swap the forward manifest's items with the same qty, warehouse and ticket line; the mapping receipt's before-state item must equal the issued item.
- Cutover census: service-source drafts for the M product are pending; invoice drafts with no matching line or any unmatched line are `incomplete`. Census `sourceType` gains `invoice` and `service`.
- Repost: receipt `appliedAt` is commit time; ticket lines and payments are re-hashed after the write (`invariant_failed` on difference); replacement estimate uses exact decimals.
