# Quickstart and validation: FACES stock reconciliation

## Draft evidence already checked

From meta root, read-only source commands:

```bash
git -C .local/faces-followups-2026-11-16/hub-source rev-parse HEAD
node scripts/repo-policy.mjs show hub
rg -n 'resolveIssueLines|postTicketStock|previewTicketRepost|repostTicketStock' .local/faces-followups-2026-11-16/hub-source/src/server/services/pos.service.ts
rg -n 'readOnly|planOrg|read-only|finally' .local/faces-followups-2026-11-16/hub-source/scripts/repair-service-sale-stock.ts
```

Expected pinned source `c6c2d5739572356239c4048c0f564f40b0768adc`; registry Bun/master; existing mechanisms visible. These checks do not reproduce the meeting defect. The sanitized live read snapshot is linked in research; never print raw named customer rows.

## Implementation prerequisites (pending)

Owner approval of the data spec and completed EGM review (state: [spec.md](spec.md) Status), isolated Hub checkout/draft PR, current-source drift review and private synthetic case manifest. Read `AGENTS.md`, `CLAUDE.md`, `docs/qa-stack.md` and inspect `bun run qa:status` before using an existing QA stack. Keep production credentials out of QA; install only the repository's Bun dependency lock. Do not execute seeds/schema-push/old repair scripts against production.

## Focused tests (commands become valid after S1 files exist)

```bash
bunx vitest run scripts/lib/faces-stock-reconciliation.test.ts scripts/faces-stock-reconcile-2026-11.test.ts
# existing suites, run unchanged as regression support:
bunx vitest run src/server/services/stock-accruals.service.test.ts src/server/services/stock.sourced-issue.test.ts src/server/services/scheduling-bookings-accrual.test.ts src/routes/api/scheduling/bookings/_handlers.test.ts 'src/routes/api/scheduling/bookings/[id]/complete/server.test.ts'
bunx vitest run scripts/repair-service-sale-stock.test.ts
```

Synthetic oracles: six distinct classification outcomes; ambiguous match cannot be eligible; repeated joins cannot multiply ledger sums; one ticket with three bookings does not become three sale issues; reversals net correctly; explicit empty consumption differs from lost expectation; ledger-only/bin-only keys produce an integrity finding; warning plus completed status is not posted; every stock entry source decoder vector in contracts/source-explanation.md decodes as specified; two same-`groupId` bookings on different resources form two groups; ledger IDs above `Number.MAX_SAFE_INTEGER` keep exact order. All tests use synthetic fixtures. Existing service tests are regression support, not a full production reconstruction.

After implementation, on qualified loopback QA with disposable data only:

```bash
bun run faces:stock:diagnose --org "$FACES_QA_ORG_ID" --case-manifest "$FACES_PRIVATE_CASE_MANIFEST" --output "$FACES_PRIVATE_REPORT_PATH"
```

This proposed command is not installed yet. QA scope ID is a synthetic tenant, not a hardcoded production org. The script must verify loopback target for this scenario and `transaction_read_only=on`. Run twice with unchanged fixtures and require byte-identical run-stable projections as defined in [contracts/diagnostic-wire.md](contracts/diagnostic-wire.md), section Run-stable comparison projection. Verify no table/state changed through independent before/after hashes. Inject timeout, role loss, invalid tenant and duplicate-provenance fixtures; expected exit/error contracts are in `contracts/report.md`. Output files are private mode 0600.

## Later prevention / repair validation

After the selected contracts and owner gates are satisfied: reproduce the exact failure first, run the D1→D2 matrix in plan and real PostgreSQL concurrency for any new writer invariant. Rehearse approved corrections twice on disposable restored fixtures; perform compensation in `finally`; independently check originals, signed totals, values, COGS, full-key bin/ledger equality and unchanged payments/other tenants. Test interruption between cancel and repost, post-commit audit failure, stale manifest and unknown commit. The bounded garment preview/apply command is specified in contracts/repair.md; no apply is authorized until its listed gates pass. Execute scripts/lib/faces-garment-repost.test.ts and scripts/faces-garment-repost-2026-11.test.ts plus F3 native atomic correction suites after implementation. Unknown service cases have no garment-writer escape hatch.

## Required qualification

```bash
bun run check
bun run test
bun run build
```

Expect zero errors/warnings, zero test failures and clean build subject only to documented optional-peer notices. If later work adds UI/API/nav, amend the spec for design-token governance, `bun run lint:design && bun run lint:tokens`, Paraglide, RBAC/owner/field masking and route manifest; browser checks use browser-harness on local QA. Owner merge, deployed SHA and post-deployment case verification are separate pending gates.

## Reported-case pair oracle

Synthetic counterpart includes exactly two separate M-sale/single-L-issue cases and one older case with later manual movements. Qualify both reported cases independently; keep the older case ineligible while coverage is unresolved. After first correction, a second manifest from the original shared-bin snapshot must fail stale; generate/approve a fresh manifest before its apply. Two quantity 1 transformations change the recorded M 19/L 8 example to M 17/L 10 only as derived net effects, never by balance overwrite.

## Native admission and full-lane proof

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
