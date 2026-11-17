# Exact implementation inventory — 123-faces-receipt-valuation

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
