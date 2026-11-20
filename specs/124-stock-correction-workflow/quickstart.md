# Validation guide: Auditable stock corrections

The commands below are future implementation qualification. Independent review results and dispositions are recorded under `egm/`; owner data-spec approval, implementation qualification, owner merge and runtime proof remain pending.

## Preconditions and authoritative contracts

Use an authorized isolated Hub candidate against the registry PR base with Bun. Read Hub AGENTS.md/CLAUDE.md, UI governance and `docs/qa-stack.md`; inspect existing QA ownership before starting or resetting anything. Use synthetic tenants and qualified loopback fixtures, never production credentials or a production-backed development server.

Read these complete contracts before implementing or running proof:

- [API/workflow](contracts/workflow.md): exact discriminated fields/bounds, line-UUID source identity, canonical hashes, capability matrix, precise central exceptions, response loss and legacy-tab behavior.
- [Transaction and authority protocol](contracts/transaction-protocol.md): F7-owned principal/nonlocking snapshot adapter, first per-org gate, exact typed helpers, complete writer inventory, order, timeouts/retry and mapping cutover.
- [Native qualification](contracts/native-qualification.md): exact suite ownership, safe fixture admission and whole-lane completeness guard.
- [Data model](data-model.md): the one `20261116193000_stock_corrections.sql` migration, five-kind CHECK/nullability/foreign-reference contract, immutable RLS/grants and shared F1/F2 storage.

Before F3 preview qualifies, require F7's real READ ONLY capability-parity/denial results. Do not call the existing FOR SHARE resolver from a read-only preview, perform remote token verification while the write gate is held, or duplicate an operator authority implementation. Before dependent F1/F2 writers or F5 recovery qualify, the shared gate/helper and source-retry cases below must pass.

## Pure, route and mounted checks

After implementing the named files, run the ordinary suites from the exact candidate:

```bash
bunx vitest run src/server/services/stock-corrections.logic.test.ts src/server/services/stock.service.test.ts src/server/services/rbac.service.test.ts src/hooks.tenant.test.ts
bunx vitest run src/routes/api/stock/corrections/server.test.ts 'src/routes/api/pos/tickets/[id]/lines/[lineId]/swap/server.test.ts'
bunx vitest run 'src/routes/(app)/pos/tickets/[id]/page.swap.mounted.test.ts' 'src/routes/(app)/stock/entries/[id]/page.correction.mounted.test.ts'
bunx vitest run scripts/qc/native-postgres-manifest.test.ts scripts/qc/native-postgres-report.test.ts
bunx vitest run src/lib/routes/route-design-contracts.test.ts src/lib/routes/route-access-authority.test.ts
```

The correction logic/service/routes and receipt mounted companion are proposed additions; create them under the stated paths before these commands. Existing source/route/mounted harnesses are extended rather than replaced by static markup. Ordinary Vitest excludes every `*.sql.integration.test.ts`; passing such a filename to a plain focused command is not native proof.

API oracles include unknown/forbidden field combinations, line UUID versus ticket path ownership, 1–200 ordered lines and exact numeric/UOM/body bounds, reason/source/replacement/mode/actor key reuse, masked/nonexecutable preview and a POS-only both-empty swap. Prove that the exact preview/apply central exceptions cannot affect another path or method or trust a client claim of stocklessness. Old tabs get refresh_required with zero mutation; stale previews never silently approve new intent.

## The exact thirteen native correction semantics

Register the single stock-corrections.sql.integration.test.ts qa-native owner with `exactAssertions: true`, `minimumAssertions: 13` and the thirteen requiredBehaviors below, as in [contracts/native-qualification.md](contracts/native-qualification.md); use actual describe/it names, update manifest/report tests and reject missing/failed/skipped/todo results. No new lane/discovery bypass.

- `stock corrections against PostgreSQL preserves POS only no stock swap and rejects unauthorized stock effects`
- `stock corrections against PostgreSQL freezes approved stock only lines and preserves financial facts`
- `stock corrections against PostgreSQL rolls back every intermediate write and records one immutable outcome`
- `stock corrections against PostgreSQL reconciles lost response and rejects changed intent operation reuse`
- `stock corrections against PostgreSQL serializes absent bins normal posting correction and rebuild under the first org gate`
- `stock corrections against PostgreSQL serializes period fiscal and void guards before correction`
- `stock corrections against PostgreSQL drains old mapping posters and refuses persisted old mapping pending sources`
- `stock corrections against PostgreSQL enforces tenant scoped five kind schema immutable grants and private source ownership`
- `stock corrections against PostgreSQL repeated concurrent booking completion reuses frozen draft and submitted source once`
- `stock corrections against PostgreSQL absent permission deny insertion serializes with correction in both authority lock orders`
- `stock corrections against PostgreSQL absent enabled module can be disabled only before or after the guarded correction`
- `stock corrections against PostgreSQL serializes warehouse timezone and bundle eligibility writers in both arrival orders`
- `stock corrections against PostgreSQL rejects deleting principals and inactive organizations before correction admission`

The complete fixture/command contract is contracts/native-qualification.md. Expand counterexamples inside these thirteen registered behaviors, not an unadmitted new file.

Case 9 is the common F5 dependency. It calls actual source helpers through independent PostgreSQL backends and proves both a saved draft and already-submitted booking source survive repeated/concurrent individual /complete retry with one source-owned entry. Cached pre-gate open-accrual arrays or current recipe plans cannot supply mutation authority. Preserve separately committed booking lifecycle/payment facts. Negative-stock domain rejection may retain the existing draft/warning outcome only with zero ledger/bin partial effects.

## Qualified fixture and actual lock proof

Provision both target types from `docs/qa-stack.md` and the existing `.github/workflows/ci.yml:652–684` qa-native recipe: the owned full-schema QA database used by existing lane suites, and the owned marked disposable `minion_qc_*` fixture database. Inspect actual ownership, loopback URLs and markers before assigning private `FACES_FULL_SCHEMA_QA_URL` and `FACES_DISPOSABLE_DATABASE_URL`; names alone do not qualify a target.

The new suite uses the concrete owned child database recipe in contracts/native-qualification.md, required by actual public-qualified authority SQL. Qualify minion_qc controller/marker/CREATEDB first, create only minion_qc_faces_correction_<32hex>, requalify child identity, apply real migration/canonical public fixtures and inject actual child source clients. Do not substitute search_path-only schemas or copied SQL. Independent backends and observed lock barriers prove both arrival orders. Finally close handles and drop only the recorded child database, never controller/shared QA. Missing fixture/privilege fails qualification before effects, never optional skip.

The first business-lock SQL for every participating write is exactly:

```sql
select pg_advisory_xact_lock(hashtextextended('minion:stock-write:v1:' || $1::text, 0));
```

After that gate, verify the shared operation/source-ticket-or-product → period-policy/fresh authority → entry → accrual → sorted-bin order. Verify every named participant and direct writer from contracts/transaction-protocol.md; no business row lock precedes the gate. Absent bins remain EMPTY_BIN under the gate until qualified posting, with no rejected placeholder rows. Mapping cutover drains old admitted posters, then rejects persisted old-mapping drafts/open expectations with cutover_pending_sources and no effects; a newly admitted poster reads the new rule only after a successful mapping commit.

Each local write uses lock timeout 1000 ms, statement timeout 12000 ms and overall deadline 60000 ms. Exactly three total attempts are allowed: initial attempt and two confirmed-rollback retries, delayed 40 ms and 80 ms, only for SQLSTATE 40001, 40P01 or 55P03. Keep the approved fingerprints/key and recheck authority. Statement timeout 57014, domain/stale errors and unknown COMMIT are never blindly retried. Response loss reconciles the immutable receipt; it does not repeat a committed lifecycle/payment transition.

## Whole native lane and completeness guard

After implementation and target qualification, run the whole admitted lane:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$FACES_DISPOSABLE_DATABASE_URL" HUB_TEST_DB_URL="$FACES_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-stock-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/faces-stock-qa-native.json
```

No file filter is present. The report guard requires every admitted lane file/name and the exact correction count, with zero failed/skipped/todo/missing cases. A filtered development invocation is labeled focused only and is never passed off as whole-lane qualification. Retain target/marker admission, exact source hash, raw native JSON and guard exit code privately. Neither ordinary mocked tests nor a prior green candidate substitutes for this result.

## Required business/failure matrix

- Sale: same-price variant change and already-correct-M/wrong-L stock_only correction; freeze all original issue lines and change only the approved pair. Compare zero payment/ticket-amount/date/visit-product changes for stock_only. Test both-empty without stock administration, mixed empty/nonempty refusal, modifiers, denied/foreign/archived rows, fiscal/reconciled/void/period guards, stale recipe/source and two keys on one preview.
- Standalone receipt: admitted quantity/value replacement, distinct affected bins, immutable original supplier/date evidence and current approved posting time. Later issue/transfer/adjustment on any original or replacement bin, ambiguous owner or unverified period blocks with zero effects; unsupported history produces only an F1/F2 packet.
- Atomicity/recovery: inject fault before/after cancellation, replacement creation, ledger insertion, bin write, source stamp, transactional audit and immutable receipt. A confirmed rollback leaves no partial correction. Lost committed response reuses one operation outcome and emits no additional entry events. Check five-kind nullability/composite foreign refs/JSON-size/unique-source/immutable grants and other-tenant denial.
- Concurrency: absent-bin first writers, normal posting versus correction, rebuild versus issue, mapping cutover versus old/new posters, persisted pending source refusal, period close/fiscal/void versus correction, F2-like multi-entry versus new issue, and repeated/concurrent booking retry. Assert independent invariants and original financial/lifecycle facts; no statement-count-only proof.

## Full candidate and browser gates

```bash
bun run check
bun run test
bun run build
bun run i18n:compile
bun run lint:design
bun run lint:tokens
bun run qa:check-pairing
```

Require zero check errors/warnings, zero test failures and the clean Hub build outcome subject only to its documented optional-peer notices. The native migration tests and paired synthetic seed cover the shared schema; run the implementation candidate's declared schema/migration contract gates as well, recording the exact current commands rather than inventing a tolerated baseline. Preserve semantic design tokens and current route/RBAC manifests.

Use Browser Harness with synthetic identities for ticket/receipt/no-stock/blocked flows on desktop and narrow viewport, Spanish/English, keyboard focus, reason/preview/conflict and response-loss recovery. Inspect route-data authorization and serialized cost/source fields independently of a 200 document shell or success toast. Owner spec approval precedes code; independent implementation review, CI, owner merge, deployment identity and separately approved F1/F2 exact-record dry-run/apply remain distinct gates. No bulk historical repair is authorized by this workflow spec.

## Authority insert races and file actions

Use implementation-inventory.md for the exact source/test/QA/catalog changes. Native file remains the same qa-native-owned stock-corrections.sql.integration.test.ts with the thirteen required behaviors from native-qualification.md; no new excluded race file. Acquire stock-v1, then the org authority lock, before source locks, use real writeSectionAccess/setModuleEnabled for initially absent deny/disable rows, and observe both lock arrival orders. Deny/disable first means correction zero-effect refusal; correction first means authority writer waits and then commits afterward. FOR SHARE of existing rows or mocked fresh caps cannot prove this. Verify verified both-empty POS swap/period-only behavior when stock disabled and ordinary owner/custom roles with stock field level 0 plus the existing finance cost tier. Preserve the global account-deletion order (org authority lock before the profile write).

The explicit inventory includes new ordinary `stock-corrections.service.test.ts`, stock detail `page.correction.mounted.test.ts` and staged operator loader-root smoke in addition to the existing logic/API/swap fixtures. Run each created path through the existing ordinary/mounted environment plus the existing manifest/report validator tests; all exact outputs are recorded per slice in validation.md. New mounted files declare happy-dom. Existing dependency-owned authority writer files/helper/event payload remain unchanged unless a documented candidate drift requires an owner-reviewed amendment.

Public stock_only preview/apply is `422` owner_evidence_required and presents an inert F1 packet. The known garment native scenario calls only the private entrypoints/full manifest in contracts/garment-envelope.md, requiring verified real owner/exact approved digest and atomic timestamp/evidence receipt. Include all eligibility-writer and deleting-profile/active-org races in behaviors 12 and 13.

before public baseline profiles/member/org policy or FK DDL, apply F7 [complete test-only native auth prerequisite](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md): exact full-lane controller (image `pgvector/pgvector:0.8.6-pg18-trixie`, `minion_qc_vectors`), owned child auth schema/users/uid STABLE SECURITY INVOKER with canonical owner/ACL/JWT semantics, seed auth user before profile/email/FK. No app_ledger extra grants/policies/JWT subject. The shared test helper/SQL fixture is owned by F7; reuse that qualified recipe. This is a test-only dependency; F3's runtime dependency on F7 is the authority bridge named in spec.md. Bare child PostgreSQL plus public policy text alone is not a runnable fixture.

Qualify [valuation-qualification.md](contracts/valuation-qualification.md) and [api-admission.md](contracts/api-admission.md) through all of the selected pure, HTTP, mounted, browser and native tests: owner scope/proof/re-preview, contrary billing currency/display settings, denied metadata, inverse/historical attester deletion, POS-only GET/HEAD recovery and unchanged unrelated stock gates. Keep thirteen native behavior names.
