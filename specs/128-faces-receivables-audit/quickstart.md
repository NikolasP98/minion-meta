# Validation guide: F7

All commands below are qualification plans after owner data-spec approval, not tests executed in this document task. Use synthetic data in owned guarded loopback fixtures; never seed or query production. Read pinned Hub AGENTS.md, docs/qa-stack.md, scripts/qc/README.md and the exact candidate's package scripts. Inspect `bun run qa:status` before using an existing stack; never reset another checkout's stack.

## Staged bootstrap checks (dependency order)

After T004–T009 implement actual DTOs/authority/principal/foundation loader and smoke, run only the foundation subset below. Its registry has no audit key/typeof-import, no audit runner or faces:receivables:audit registration. The foundation child uses the real smoke package command, existing service roots and actual passed-client read-only authority bridge positive/negative probes; no audit stub or fake namespace is allowed.

```bash
bun run i18n:compile
bunx vitest run scripts/lib/operator-principal.test.ts scripts/lib/operator-service-loader.test.ts scripts/operator-bootstrap.smoke.test.ts src/server/auth/active-operator-principal.test.ts src/server/services/rbac.service.test.ts
bun --no-env-file run faces:operator:bootstrap:smoke --phase foundation
```

These future results may establish foundation_checks_passed only. T011 then creates the actual audit.ts/root+namespace registry entry; T012/T013 complete actual controls/scenarios; T014 implements real runner/package/streaming and full smoke dispatch. Only then run `bun --no-env-file run faces:operator:bootstrap:smoke --phase audit` through the real faces:receivables:audit command and require an actual evidence-free one-subject report, control totals, read-only-bridge principal and unchanged database digests. A real unpriced/unknown-history subject is unresolved by contract; it is not an audit service stub or a claim of later settlement qualification. F1/F2 remain blocked until full positive process proof plus required native authority qualification. Missing audit before T011 cannot be hidden by skipped import; missing audit after T011 is fatal.

The final whole-candidate checks below occur after T001 approval and implemented T002–T022 product prerequisites, not before US1 exists. The full native8 lane and semantic report are separate from both smoke stages and keep every baseline, ACL, auth and exactAssertions prerequisite.

## Pure and runner checks

After implementing the selected files:

```bash
bun run i18n:compile
bunx vitest run scripts/lib/operator-principal.test.ts scripts/lib/operator-service-loader.test.ts scripts/operator-bootstrap.smoke.test.ts src/server/services/pos/accounts/audit.logic.test.ts scripts/faces-receivables-audit.test.ts scripts/qc/native-postgres-manifest.test.ts scripts/qc/native-postgres-report.test.ts
bun --no-env-file run faces:operator:bootstrap:smoke --phase audit
bun run check
bun run test
bun run build
```

Require zero errors/warnings/failures and clean build subject only to documented optional-peer notices. Ordinary Vitest excludes `*.sql.integration.test.ts`; passing these commands is not native snapshot/RLS qualification.

The final audit-phase standalone smoke follows [operator-bootstrap.md](contracts/operator-bootstrap.md): owned temporary candidate copies and fresh real package-command children, no inherited app DB/auth/LLM credentials, dotenv/config canaries, actual Svelte/import graph, admission-before-import failures and qualified injected-client/pool/connection proof. It needs owned synthetic GoTrue plus marked PostgreSQL fixtures; absent fixtures fail qualification, never silently skip. This command is planned only; no execution is claimed.

## Native admission and exact semantic evidence

Add `src/server/services/pos/accounts/audit.sql.integration.test.ts` exactly once to `NATIVE_POSTGRES_MANIFEST['qa-native']` in `scripts/qc/native-postgres-manifest.ts` with `exactAssertions: true` and `minimumAssertions: 8`, per [native-exact-count.md](contracts/native-exact-count.md). Until that shared flag and report change ship (same slice, T003), the pinned report enforces only minimum count plus required names. Use describe `faces receivables audit against PostgreSQL` and these exact complete requiredBehaviors:

- `faces receivables audit against PostgreSQL uses one read only snapshot and rejects mutations under app_ledger`
- `faces receivables audit against PostgreSQL preserves canonical controls beyond 500 clients and exposes legacy residuals`
- `faces receivables audit against PostgreSQL resolves explicit and provider invoice links without unsupported repair candidates`
- `faces receivables audit against PostgreSQL matches locking authority composition without locks or stale cache`
- `faces receivables audit against PostgreSQL isolates concurrent pages and foreign organization rows`
- `faces receivables audit against PostgreSQL admits only approved matched evidence and preserves uncertainty`
- `faces receivables audit against PostgreSQL applies exact accounting timezone cohort and approved scope boundaries`
- `faces receivables audit against PostgreSQL produces stable proposal hashes and UUIDs across fresh runs`

Each named test may have a table of counterexamples; all eight must be present and pass, with no skips/todos. Update native-postgres-manifest.test.ts and native-postgres-report.test.ts for this admission and missing/duplicate/skipped required behavior rejection. Keep the existing nine lanes; config already derives selected files from the manifest. Do not add an ordinary include glob, optional runtime skip or new CI bypass.

## Isolated native database and actual queries

Canonical UNBILLED_BOOKING_WHERE and account fragments reference `public.*`, so setting a temporary search_path alone would exercise the wrong tables. The selected audit fixture creates one owned disposable DATABASE, not shared QA public data and not a search-path-only substitute.

Use the existing qa-native controller from `.github/workflows/ci.yml:652–684`: the explicitly owned loopback pgvector container initializes `POSTGRES_USER=minion_qc`, database `minion_qc_vectors`, port 55462 and actual database comment `minion-360-disposable:v1`. The initial Postgres user from that recipe is the fixture controller. Local qualification must provision its own equivalent container using the existing recipe and record ownership; never reuse an arbitrary application URL. `MINION_QC_DATABASE_URL` identifies this controller database, and `MINION_QC_DISPOSABLE=1` is mandatory.

First call existing openDisposablePostgres, which checks loopback/name/role/actual marker before any DDL. Then query pg_roles for current_user and require the CI initial controller rolsuper=true for the selected child/auth-role setup (which also permits CREATEDB), and require existing app_ledger to be NOLOGIN/NOINHERIT/NOSUPERUSER/NOBYPASSRLS, with the admitted controller able to SET ROLE app_ledger (superuser or existing membership). Missing identity, marker or privilege fails the test/lane before DDL, never skips, changes roles or falls back to HUB_TEST_DB_URL. No ALTER ROLE/escalation is permitted. Other full-lane tests still require their separately owned full-schema QA URL.

Generate the child name `minion_qc_faces_audit_${randomUUID().replaceAll('-', '')}` and enforce `^minion_qc_faces_audit_[a-f0-9]{32}$` before quoting it as an SQL identifier. Through the admitted controller, create only that database with owner minion_qc and set its exact disposable marker. Derive its private URL by replacing only the validated controller URL's database path; do not log credentials. Open it with openDisposablePostgres and verify the new actual database identity/marker before schema setup. If any step fails, close every handle and drop only the created recorded child DB in finally; never drop the controller, shared QA DB or a name without the generated ownership receipt.

First apply contracts/native-auth-prerequisites.md child-local canonical auth schema/users/uid owner+ACL/JWT recipe before public policy/FK DDL; seed synthetic auth.users before NOT NULL-email profiles with canonical profile FK. Then seed public tables matching the audited production schema/query columns and actual baseline ACL/RLS (NOT permissive org-GUC profile/org substitutes): organizations/profiles/members/roles/permission_rules/app_modules; parties/crm_contacts; financial settings/products/clients/invoices/items/payments; POS settings/shifts/tickets/lines/payments/emissions/client-ledger/plans/grants/redemptions; scheduling resources/event-types/bookings; and stock source/entry/accrual evidence used by proposal admission. Reuse canonical schema/migration definitions and the existing native POS/authority fixture setup patterns; do not mock canonical predicates or capability composition. No application pool is opened: inject actual Drizzle handles on child connections, use actual withOrgCore scoping/role changes, and invoke the transaction-accepting audit/read-only resolver. The database owner seeds; report reads run under actual non-bypass app_ledger and exact org/profile GUC. A write attempt must fail because the transaction is READ ONLY, not merely because a mock returned no permission.

Use independent child connections for report, concurrent writer and test barriers. Synchronize on observed database barrier/lock state, never timing sleeps. Seed two synthetic orgs, more than 500 clients and every scenario below. After each run assert unchanged business-row digests. In finally release barriers, rollback/close all child connections, drop the uniquely owned child DB from the controller, then close controller handles. Verify child DB absence. A local fixture cleanup is not a production business undo.

## Complete lane invocation and validator

After qualifying the owned controller and full-schema QA targets, set private F7_DISPOSABLE_DATABASE_URL and F7_FULL_SCHEMA_QA_URL from those actual fixtures, then run from the isolated Hub candidate:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$F7_DISPOSABLE_DATABASE_URL" HUB_TEST_DB_URL="$F7_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-receivables-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/faces-receivables-qa-native.json
```

The invocation intentionally has NO single-file filter. The report gate requires every admitted qa-native file and exact semantic behavior, zero failures/skips/todos and no missing evidence. A focused development run may filter this suite, but must be labelled focused and cannot be passed to the full-lane guard as complete qualification. Guard failure or unavailable controller/CREATEDB privileges means failed qualification, not permission to use another database.

## Scenario and outcome matrix

1. Two orgs, more than 500 clients, party/contact aliases, deleted/missing identity and identityless paid lines. One paid-unscheduled line plus one unbilled booking yields work count 2, never debt count 2. Badge-exact/list-exact controls retain legacy voided/identity/limit residuals with exact subjects. Many-residual case (inside the existing behavior "preserves canonical controls beyond 500 clients and exposes legacy residuals"): seed 1,500 `list_only_legacy_voided` lines with 1,400 in U-minus-C and 250 identityless lines; run with batch size 250 and a sink that delays each `writeResidual`. Require `residuals.jsonl` to list every ID exactly once with the right `cohort`; summary counts and cohort counts to match the file; `sampleIds` to be its first 100 IDs per control; `idsSha256` to equal a hash recomputed from the file; and the service to await the sink (no record is emitted before the previous write resolves). Runner tests in `scripts/faces-receivables-audit.test.ts` construct the residual writer with a cap of 1,000 and feed 1,001 records, and separately make `writeResidual` reject: each gives exit 3, `incomplete.json` and no `manifest.json`.
2. Free/null/inactive/completed/cancelled/no-show, plan/grant/redemption, invoice, partial payment, refund, grouped member, quantity and currency cases. Primary classes are exhaustive; financial facets remain orthogonal. Current catalog price and old/completed status never replace contract or delivery evidence.
3. Every invoice-linkage counterexample in contracts/invoice-linkage.md, especially invoice-linked booking with NO POS booking line, duplicate provider references, shadowed/unresolved/foreign links. None emits an unsupported repair proposal or duplicate subject.
4. Shared authority read-only/locking parity on static fixtures, active/revoked membership, custom/legacy roles, owner scope, field tier, disabled module and forbidden foreign IDs. Terminal-principal unit/runner tests exercise invalid/expired/mismatched/unavailable GoTrue responses and token redaction without impersonation.
5. Prove a capable non-owner succeeds only with evidence:null and is denied with any non-null evidence before subject inventory; an actual membershipRole owner with custom realRoles keys and required capabilities succeeds, while revoked owner, owner lacking effective authority and different executing verifier fail. No delegated owner attestation is admitted. Valid exact external evidence versus hash mismatch, unapproved assertion, wrong verifier/org/subject, malformed values, missing documents and contradictory assertions. Genuine-debt positives support only complete unbounded-U canonical-party/document identity with admitted historical charge+delivery and NO stored POS tickets/payments/invoices/signed-ledger/funding anywhere in the exact known-identity closure. A positive line/link supports only exactly one submitted ticket with one positive service line, ordinary positive tenders resolving through actual stored normalized method policy, exactly complete total and no alternate client money/invoice/fiscal/wallet/funding. Multiple ordinary tenders of 40.00 and 60.00 for one whole 100.00 line qualify; that is not line allocation. A partial payment of 50.00 on 100.00, refund, zero-net wallet, duplicate invoice paths, absent/ambiguous method definitions and document-only probes are unresolved/null remainder; financial paths dedup by table/id and never sum invoice+POS+wallet. Both tables/overlaps and every exact guard are normative in contracts/evidence-and-proposals.md. Missing facts produce unresolved rows, no mutation or fabricated amount.
6. Exact date contract: booking start differs from creation/status date; ticket submission differs from payment date; both sides of accounting-zone midnight; [D,D+1) same day; invalid/equal/inverted intervals; owner-bound inheritance; widened CLI refusal; narrowed C plus complement equals approved U without out-of-scope queries. Finite U emits settlement_scope_incomplete/null remainder and no positive financial label/proposal; a query trace proves no all-date client closure or out-of-U subject fetch. Unbounded U+narrow C may close same-client money from U-minus-C without exporting another subject, but proposed pair subjects must both be in C. Scope-proof corruption aborts incomplete.
7. Exact pure and existing-native behavior tables must cover both subject kinds: booking inactive/history/current-free/unused/stale/unresolved and paid-line inactive/known-zero/fully-settled/unresolved. validUnused plus validStale with no history and not free chooses unused/review with both reasons; delivery+unused and stale observed/snapshot mismatch are conflicts; stale observed==claimed==actual is no-change, not stale; wrong-kind unused/stale fails input. A historical charge of 100.00 PEN with a current catalog price of `0`, shape A identity and delivery, and no money rows is a genuine-debt candidate with chargeMinor `"10000"`, settledMinor `"0"` and remainderMinor `"10000"`, while the badge free exclusion remains. Missing delivery, partial settlement, unknown identity or finite U is unresolved with null remainder, never free forgiveness or a guessed 50.00. The native8 names and count stay unchanged: add these as table vectors (V1–V16 in [evidence-and-proposals.md](contracts/evidence-and-proposals.md#closed-overlap-and-financial-qualification-vectors)) inside the existing evidence, canonical-control and stable-hash tests.
8. Hashed counterfactual vectors 1–4 in [evidence-and-proposals.md](contracts/evidence-and-proposals.md#hashed-wallet-and-account-display-counterfactual): the only paid line plus unbilled pair takes list pendingScheduling/pendingInvoice from 1/1 (row present) to 0/0 (row absent) with wallet `[]` unchanged; another same-client unbilled booking takes 1/2 to 0/1 with the row still present; a historically paid, current-free pair gives badge deltas −1 and 0; a pure multi-currency or zero-net wallet stays identical but blocks a positive proposal. Actual capped/sorted rendered presence is null/not_predicted_limit_or_sort. Changing another same-client subject or wallet/plan/grant source changes accountControlSha256 and proposalHash; fresh run metadata or unchanged source observed next day does not. Use a pure typed clone changing only one line.bookingId; no SQL write or dummy account-list control.
9. Two fresh runs with new runId/observedAt but identical source/assertion inputs produce byte-equal canonical intent, proposal hashes and UUIDs. Changed source, amount, linkage or approved assertion changes identity. Identical private evidence moved to another path does not change it; UUID collision with different SHA is fatal.
10. A second connection changes payment/link/catalog/status between keyset pages: first report remains at its snapshot, next run sees changes. Inject timeout, resource limit, money corruption, revoked authority, symlink/path failure and output interruption: connections closed, no `manifest.json`, and the staging directory kept with `incomplete.json`. A synthetic write inside READ ONLY fails and all business-table hashes stay unchanged.

Supply private FACES_AUDIT_DATABASE_URL, FACES_OPERATOR_ACCESS_TOKEN, FACES_OPERATOR_ANON_KEY and FACES_OPERATOR_AUTH_URL; the approved scope.target.authUrl must equal FACES_OPERATOR_AUTH_URL. Run the registered `bun --no-env-file run faces:receivables:audit` command twice only against qualified synthetic fixtures with approved scope/evidence files. Capture command exits, candidate/source hashes, snapshots, canonical output hashes and private permissions. Owner spec approval precedes code; implementation review/CI/human merge precede delivery. Any later live read needs its exact owner-approved org/principal/interval/output; no report authorizes repair, collection or lifecycle/stock cleanup.


Use implementation-inventory.md's complete ordinary focused command after its new paths exist, plus this quickstart's exact full native lane/report and actual fresh-process bootstrap smoke. Existing exported unbilled/identity fragments remain unchanged; F7 does not edit F3/F2-owned correction/runtime files. No frontend/browser gate is invented for the CLI-only diff. Evidence-free capable review versus evidence-bearing authenticated-owner admission is unchanged.


Apply the real bounded F7 authority-bridge migration and run every baseline negative, function owner, ACL, body, GUC, READ ONLY, no-expansion and parity case in contracts/authority-bridge.md, within the existing eight registered native behaviors. CLI/report reads use only the read-only authority bridge; guarded source writes later use the new write-admission adapter. Direct SELECT/FOR SHARE under invented fixture grants is not proof. Record migration pairing and function/catalog hashes; no qualification or deployment has run.


The full-lane controller and every child auth/FK/policy prerequisite are exactly those in contracts/native-auth-prerequisites.md, including the pinned `pgvector/pgvector:0.8.6-pg18` image, `minion_qc_vectors` database and extension identity. This native baseline helper is a test-only shared dependency, not a production auth path or substitute for actual GoTrue standalone smoke.

The [native auth prerequisite](contracts/native-auth-prerequisites.md) also creates/validates the canonical restricted postgres ACL sentinel before auth-schema grants on a pristine minion_qc controller.

Both staged package-process smokes also prove the [operator-bootstrap.md](contracts/operator-bootstrap.md) zero-listener contract during loader lifetime, concurrent children and an owned occupied port 24678; cleanup-only handle checks are insufficient.

The shared native-auth helper must admit all baseline ACL recipients, including its explicit restricted postgres and service_role sentinels, before public policy/ACL DDL; no reliance on another suite or shared role alteration.

## Implementation record (T002)

Source revision c6c2d5739572356239c4048c0f564f40b0768adc (Hub master). Branch `feat/128-faces-receivables-audit`, clone `~/.cache/claude-tmp/hub-faces-F7`; setup `bunx svelte-kit sync && bun run i18n:compile`. Ordinary targeted run: `env -u SUPABASE_DB_URL -u DATABASE_URL -u PUBLIC_SUPABASE_URL bunx vitest run <files>`. The native lane has not been run.
