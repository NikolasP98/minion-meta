# Exact implementation inventory — 122-faces-stock-reconciliation

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
