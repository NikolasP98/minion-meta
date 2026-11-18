# Quickstart and validation: FACES receipt valuation

## Draft checks already executed

Read-only/offline source: pinned SHA and registry verified. The two private source-math commands in [research.md](research.md) import existing stock helpers and read the immutable v2 JSON locally. They have no database connection. Explicit assertions passed, exit 0, with Bun internal tsconfig-directory diagnostic retained as a limitation. Outputs are arithmetic evidence, not an invoice match or correction test.

Expected conditional arithmetic: `5474.58/89 → 61.5121` at four decimals; `89×61.5121=5474.5769`, cent display 5474.58. Synthetic zero-opening receipt→issue 10 gives remaining 79 units at 61.5121 and value 4859.4559. This is synthetic and differs from actual snapshot opening 8 @ 250; the actual-snapshot remaining value is oracle 2 below. Keep the scenarios labelled so a synthetic expected value never becomes a production balance.

## Pending implementation setup

Owner data-spec approval and completed independent design review (status in [spec.md](spec.md)) precede code. Create isolated Hub feature branch/draft PR against registry master. Read Hub `AGENTS.md`, `CLAUDE.md`, `docs/qa-stack.md`, inspect `bun run qa:status`, and use only the guarded loopback QA setup. Do not copy production credentials into QA or import named production rows into tests.

## Focused tests (available only after S1/S2 files exist)

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

After implementation, set only private FACES_RECEIPT_DATABASE_URL, FACES_OPERATOR_ACCESS_TOKEN and FACES_OPERATOR_ANON_KEY, FACES_OPERATOR_AUTH_URL (the only URL the token is sent to; target.authUrl must equal it) from the owned loopback fixture and synthetic existing session; bind its approved target.authUrl/database identity/marker in the evidence manifest. Then on qualified local QA:

```bash
bun --no-env-file scripts/faces-receipt-valuation-2026-11.ts --org "$FACES_QA_ORG_ID" --entry "$FACES_QA_RECEIPT_ID" --line "$FACES_QA_RECEIPT_LINE_ID" --evidence-manifest "$FACES_PRIVATE_EVIDENCE_MANIFEST" --output "$FACES_PRIVATE_REPORT_PATH"
```

Proposed command is not installed yet. Use synthetic org/entry/line IDs. Run twice; canonical unchanged output matches after excluding observation timestamps, before/after database hashes are unchanged, output mode 0600. An unverified/absent invoice plus an explicit usable hypothesis returns a complete hypothetical report with eligible:false; absent invoice and no hypothesis returns complete discovery with basisChoice:null, never an invented rate/currency. Unknown source currency remains null; assumption-only comparisons are tagged assumed_currency_numeric_only, never a verified stock denomination. Verified/mismatched document and normalized-unit evidence use distinct strict states/checks; it does not block useful diagnosis or enable apply.

## Selected writer rehearsal (implementation and approvals pending)

The proposed writer CLI and exact selected algorithm are specified in [contracts/correction.md](contracts/correction.md); no writer is installed or production execution authorized. After spec approval implement the defined files and run the exact 18-entry/15-accrual/2-ticket synthetic fixture twice on disposable local QA, undo/compensate in `finally`, inject failure before/after commit and audit, simulate stale manifest and concurrent writes, and demonstrate authoritative recovery rather than blind retry. Assert immutable source evidence, unchanged item/warehouse quantities and collections/dates, approved receipt/COGS/remaining-value differences, full-key latest-ledger/bin consistency, unrelated-org stability and second-run no-op. Capture exact source/snapshot/plan/approval hashes. Run the focused ordinary writer command below; the SQL companion must run in the registered native lane below, not ordinary Vitest; require F3's migration/QA seed and both finance period-query oracles described in the correction contract. Also assert the derived-reader expectations in [correction.md § Derived readers and copies](contracts/correction.md#derived-readers-and-copies): relinked accrual `updated_at` equals the approved `postedAt`, last restock cost is 61.5121 after correct and 5474.58 after compensate, and the stock overview daily-flow bucket for the correction's UTC day holds the documented net value and used value.

The exact ordinary writer decoder/service/CLI command is:

```bash
bunx vitest run src/server/services/faces-receipt-correction.logic.test.ts src/server/services/faces-receipt-correction.test.ts scripts/faces-receipt-correct-2026-11.test.ts
```

It checks the action/basis/status signatures in [command-envelope.md](contracts/command-envelope.md), including every row of the [outcome/exit table](contracts/command-envelope.md#single-cli-outcome-and-exit-table), current owner-reader versus retained historical actor, full unitQualification hash binding and exponent-expanded new PG numeric readback via String(Number(actualText)); original raw source hashes remain byte-preserved.

## Full gates and release evidence

```bash
bun run check
bun run test
bun run build
```

Require zero errors/warnings/failures and clean build subject only to documented optional-peer notices. F2 adds no migration. A later UI/API surface needs its own reviewed spec for RBAC/route contract/Paraglide/design-token/browser gates. Owner merge, deployed SHA, exact manifest/target apply approval and post-apply record verification remain pending and must be reported separately from local test success.

## Native PostgreSQL admission and exact full-lane command

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

## Real inverse rehearsal, not fixture reset

Use the same base correction CLI flags/modes with an inverse manifest action:"compensate", manifest.basis.policy='restore_prior_before_snapshot' and inverseOfOperationId naming the applied correct operation. Freeze the fresh current replacement map/consumer/max-sequence fingerprints and restored before-rate/quantity facts from its immutable receipt. Run inverse preview and approved apply through the real service/gate. Assert restored net before quantities/value/COGS and new compensating consumer pointers, preserve cancelled originals/all three entry generations/two operation receipts, then run that inverse again as a zero-write replay. Tampered inverse rate/quantity, wrong/foreign/prior-inverse operation, stale consumer/movement, alternate operation key and locked period must fail without effects.

In QA finally, first resolve the initial operation authoritatively; compensate only a verified applied operation, verify unchanged state if demonstrably not applied, and fail on unresolved/failed inverse rather than falling back to SQL resets. Owned-schema teardown after failure is cleanup only and never compensation evidence. This real inverse is required by the existing native unknown-commit/compensation behavior name; it adds no unregistered native file. Production undo is separately previewed/owner-approved and is never executed automatically from finally.

Lock order and the shared write gate are defined in [correction.md § Shared write gate and authority races](contracts/correction.md#shared-write-gate-and-authority-races); the native period/fiscal/permission behavior qualifies its absent-deny and absent-enabled-module insertion races in both arrival orders.

Fixture ownership is explicit: the full qa-native controller remains its exact CI pgvector 0.8.6/minion_qc_vectors contract and the independently owned full-schema QA target remains admitted for the other suites. This feature creates only its named isolated child. Child fixture/bootstrap code follows F7 authority-bridge/native prerequisites and F3 source fixture definitions; no extra app_ledger org/profile/member grants or fake permission verdicts. Deployment/production writes are not performed by native setup.

The exact [shared native auth prerequisite](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md) is mandatory. Reuse F7-owned `src/server/test-utils/operator-native-auth-fixture.ts`: call installOperatorNativeAuthFixture(owner,expectedOwnedChildIdentity) before public profile/FK/policy DDL, seed synthetic auth.users before profiles with non-null email, then call assertOperatorNativeAuthFixture after source fixture DDL/seed. Preserve its actual controller/child identity, auth.uid owner/invoker/JWT/ACL/catalog and baseline-denial proofs. This test helper neither authenticates GoTrue tokens nor creates a runtime dependency on another feature writer.

Native exact-count prerequisite: consume [F7 native-exact-count](../128-faces-receivables-audit/contracts/native-exact-count.md). This feature registers its new native file with exactAssertions:true, minimumAssertions=10 and exactly the 10 required names. The F7-owned qualified report implementation enforces equality for opted-in rows; the pinned pre-change report only enforced a minimum. Preserve all legacy rows/default false behavior. F7 alone owns the common manifest/report flag implementation and negative tests; this slice registers its own file after that dependency qualifies.

The [contract index](plan.md#contract-index) separates strict S1/S2 diagnostic wires from the US3 verified-document command. Only the offline checks under "Draft checks already executed" have run; every other command here is future qualification.
