# F7 exact file actions and dependency ownership

Hub-relative unless explicitly specs/. These are future implementation actions after owner spec approval. No Delete, business-table change, UI, route, messages/catalog, design-token or paid/booked/stock mutation is selected. One additive bounded security-function migration is selected in contracts/authority-bridge.md. The audit exposes no apply flag or mutation executor.

| Action | Exact file | Responsibility / explicit no-change predicate |
|---|---|---|
| Create | scripts/faces-receivables-audit.ts | Exact no-env-file CLI, input/target/principal admission, owned READ ONLY connection, streaming private atomic files (`subjects.jsonl`, `residuals.jsonl`, summary, proposals, manifest), labelled-incomplete staging on failure and connection cleanup. |
| Create | scripts/faces-receivables-audit.test.ts | Flag/scope/date/output/no-symlink/authority/redaction/error/deadline/read-only/no-writer contract. |
| Create | src/server/services/pos/accounts/audit.types.ts | Versioned exact subject/control/evidence/FinancialClosure/FinancialSourceRows/AccountControlSource/LinkIntent.effects DTOs, null unknown money and BigInt minor-string arithmetic; define pure QualifiedOperatorTarget before T006 re-export, so no future-module type is required. No mutation fields. |
| Create | src/server/services/pos/accounts/audit.logic.ts | Both exhaustive ordered per-kind classifiers/reason+uncertainty+action tables, two supported financial-shape decisions, pure cloned one-line account counterfactual, control hash and proposal canonicalization; BigInt money without DB/network imports. |
| Create | src/server/services/pos/accounts/audit.logic.test.ts | Independent count/classification/money/date/cohort/evidence/hash/namespace/stability fixtures. |
| Create | src/server/services/pos/accounts/audit.ts | Caller-owned CoreTx complete inventory/control and bounded FinancialSourceRows closure: party/document fin-client uncertainty probes, POS/finance-payment/signed-ledger/funding dedup and actual normalized method policy; no finite-U query widening or allocation engine. Register actual audit loader key/type only after this file exists in T011. |
| Create | src/server/services/pos/accounts/audit.sql.integration.test.ts | One marked qa-native file for actual snapshot/read-only/role parity/owner evidence/limits/cohort/source/count/proposal invariants and foreign denial. |
| Modify | src/server/services/rbac.service.ts | Extract neutral shared pure composer; new operator false/true bridge adapters with unchanged FreshCapabilitySnapshot shape, preserve existing legacy locking signature/default semantics. No role/permission writes. |
| Modify tests | src/server/services/rbac.service.test.ts | Role-model/default/union/effective-authority semantic compatibility; actual READ ONLY/parity proof additionally belongs in the native audit fixture. |
| Create | supabase/migrations/20261116190000_operator_authority_bridge.sql | Exact bounded definer read/lock function, observed trusted owner preflight, fixed search_path/no dynamic business SQL, app_ledger-only EXECUTE and unchanged baseline table ACL/RLS. |
| Create | src/server/test-utils/operator-native-auth-fixture.ts | Qualified owned-child-only canonical auth prerequisite install/assert helpers, exact owner/ACL/JWT/FK/catalog proof, no global pool/DB creation/deletion or runtime auth replacement. |
| Create | src/server/test-utils/fixtures/operator-native-auth.sql | Exact canonical child auth schema/users/uid invoker-owner-ACL recipe before public policies/FKs, source notification `reconciliation-harness.ts:374–401`. Test fixture only. |
| Create | src/server/auth/active-operator-principal.ts | Passed-CoreTx bridge false/true readers, closed result/binding validation and existing read-only active assertion; no direct forbidden table read, F3 dependency/global pool/network. |
| Create | src/server/auth/active-operator-principal.test.ts | Current snapshot/GUC/missing/deleting/inactive/no-pool/error contract; actual native cases in existing audit suite. |
| Create | scripts/lib/operator-principal.ts | Exact existing-session verifier, credential-free qualified target and pure operatorDatabaseIdentity; no app alias imports, JWT-only identity, refresh/session/new login or global fallback. |
| Create | scripts/lib/operator-principal.test.ts | Auth subject/project/target/TLS/refusal/redaction and connection identity stability across credential rotation. |
| Create | scripts/lib/operator-service-loader.ts | Exact closed typed Vite SSR/standalone Svelte loader after admission with empty env/closed virtuals, no HTTP/watch/config/dotenv fallback. Foundation T007 registry excludes audit key/type until real T011 audit.ts; always excludes future F3/F2 files until their implementing slices. No missing-file catch, namespace stub or unconditional future typeof-import. |
| Create | scripts/lib/operator-service-loader.test.ts | Real admitted graph, exact registry types/unknown-key refusal/idempotent close/partial failure cleanup and no global pool. |
| Create | scripts/operator-bootstrap.smoke.ts | T008 foundation-only real helper/existing-root process checks; T014 adds audit phase invoking actual audit package/runner/root/inventory/streaming with real injected connection. Foundation label is not qualified bootstrap; full positive required before consumers. No production/local-app env loading. |
| Create | scripts/operator-bootstrap.smoke.test.ts | Bad-admission no-import/no-connect, valid real graph, no dotenv canary, zero listener attempts during both real loader lifetimes including concurrent children and the owned occupied port 24678, and no new listener/pool handles on cleanup. |
| Modify | package.json | T008 faces:operator:bootstrap:smoke then T014 faces:receivables:audit exact --no-env-file/no-preload commands from operator-bootstrap.md, only after actual audit root/runner exist. No dependency/version change. |
| Create | src/server/utils/uuid-v5.ts | Extract existing pure SHA1 namespace UUID algorithm with REQUIRED namespace; audit fixed namespace is explicit. SHA256 remains approval integrity hash. |
| Create | src/server/utils/uuid-v5.test.ts | RFC/version/variant vectors, existing seed-default compatibility and deterministic audit UUID; no second implementation. |
| Modify | scripts/qa/seed/ids.ts | Preserve its existing public default-namespace wrapper/IDs while delegating to the neutral utility; not a new generator. |
| Modify | scripts/qc/native-postgres-manifest.ts | Optional exactAssertions boolean type and true on the concrete eight-name audit admission; preserve legacy rows and lane count, per contracts/native-exact-count.md. |
| Modify tests | scripts/qc/native-postgres-manifest.test.ts | New owner/exact semantic admission and missing/duplicate rejection. |
| Modify tests | scripts/qc/native-postgres-report.test.ts | Mandatory native-exact-count contract regression cases: the exact set of 8 names, extra passing rejection when true, missing/duplicate/unnamed/failed/skipped rejection and legacy optional=false/omitted additive compatibility. Report implementation change is explicit below, never assumed preexisting. |
| Modify | scripts/qc/native-postgres-report.ts | Mandatory optional exactAssertions per-admission equality from contracts/native-exact-count.md; legacy minimum/additive behavior unchanged, no filtered/skip bypass. |
| Modify only if required fixture missing | scripts/qa/seed/pos.ts | Synthetic >500-client/identityless/legacy-status/cohort/pending examples; otherwise reuse exact existing cases and record them. |
| Modify only if required fixture missing | scripts/qa/seed/crm.ts | Synthetic two-org party/contact identity/owner counterparts, never named production rows. |
| Modify only if required fixture missing | scripts/qa/seed/scheduling.ts | Synthetic free/inactive/funded/cancelled/no-show/member/evidence fixtures; otherwise unchanged. |
| Modify only if matrix/persona missing | scripts/qa/seed/matrix.ts | Exact selected audit cases/personas, no shared QA reset. |
| Create/update | specs/128-faces-receivables-audit/validation.md | Meta-repo command/candidate/snapshot/control/native/bootstrap/no-write/remaining-gate receipts. |
| Create local synthetic evidence | specs/128-faces-receivables-audit/evidence/ | Meta-repo protected test outputs referenced by validation; production audit outputs remain private approved output directory and are not committed fixtures. |

Explicit unchanged dependencies: pos/accounts/unbilled.ts already exports UNBILLED_BOOKING_WHERE, identity-key.ts exports canonical client-key helpers, and list/detail/resolve/pos-accounts.service.ts retain their intentionally different reader predicates. Audit reuses exported pure fragments/identities and implements its separate controls exactly as contracted; never calls their transaction-opening wrappers or changes count predicates to force equality. An unexpected candidate export gap requires adding a narrow export-only Modify row to this inventory first, never copied divergent semantics.

F3 owns stock write helpers/dual-gate protocol/correction schema/migration/module-writer change; F2 owns the receiptCorrection loader root; F3 owns the stockCorrections root, added to the closed loader only when those files exist in their slice. F7 foundation must compile/run without audit root/namespace/runner until T011/T014 and without any future F3/F2 files; shared bootstrap qualification waits for the full real audit command smoke. It performs NO stock/correction write. Existing bare-Bun shim, full SvelteKit/Vite config, native config/CI discovery, generic app pages and locale catalogs remain unchanged. The selected loader uses already installed dependencies; package lock is unchanged unless the owner separately approves a dependency change.

After the declared paths exist and normal `bun run i18n:compile` has generated actual Paraglide modules, ordinary focused qualification is:

```bash
bunx vitest run 'scripts/faces-receivables-audit.test.ts' 'scripts/lib/operator-principal.test.ts' 'scripts/lib/operator-service-loader.test.ts' 'scripts/operator-bootstrap.smoke.test.ts' 'src/server/services/rbac.service.test.ts' 'src/server/auth/active-operator-principal.test.ts' 'src/server/services/pos/accounts/audit.logic.test.ts' 'src/server/utils/uuid-v5.test.ts' 'scripts/qc/native-postgres-manifest.test.ts' 'scripts/qc/native-postgres-report.test.ts'
```

The SQL file runs only through the exact full marked qa-native lane/report from quickstart; ordinary Vitest excludes it. Actual fresh-process bootstrap smoke with qualified synthetic fixtures is separately mandatory, not replaced by mocked imports. Run full check/test/build on the same candidate; no UI/browser/token/i18n work is invented for this CLI-only slice. Preserve read-only before/after hashes and independently reconciled controls. Every future file action requires owner approval before product implementation; source inspection or this inventory is not execution evidence.

## Executable stage and financial boundaries

Task DAG is T002–T009 foundation only → T010–T013 actual audit inventory/controls and audit registry/type → T014 actual CLI/package dispatch plus full positive smoke → T015–T018 both classifiers/financial closure → T019–T022 hashed link/effects → T023 full candidate qualification. No future audit file/import appears in foundation; no full shared-bootstrap claim precedes actual T014 real process proof. Existing native authority proof remains an additional required gate for consumers. All 25 tasks stay unchecked.

No new settlement/allocation file or general allocation engine is selected. loadAuditFinancialClosure stays internal to audit.ts, closed DTOs in audit.types.ts, pure classifier/projectLinkEffects in audit.logic.ts. Finite U never widens for client settlement. Supported positives are only zero stored settlement with complete all-date canonical-party evidence or a fully settled one-service-line ticket without alternate money. Signed wallet/finance paths are evidence, not settlement sums. Hashed effects contain wallet per-currency before/after and exact list control/logical row prediction; capped/sorted UI visibility remains null.

Shared operator-native-auth fixture also creates/verifies the inert service_role grant-recipient sentinel before actual baseline authority ACL DDL, with no memberships/SET ROLE/bypass rights; the pristine-controller and unsafe-role catalog vectors in native-auth-prerequisites.md are mandatory inside existing behaviors.

## Resolved implementation decisions (R6)

| Action | Exact file | Responsibility |
|---|---|---|
| Modify | src/server/services/pos/accounts/list.ts | DONE: exports `clientKeySql(alias)` and `LIST_PENDING_LINE_WHERE`; same SQL text, callers unchanged. Active-grant and identity-status fragments are extracted in T011 when needed. |
| Create | src/server/services/pos/accounts/list.fragments.test.ts | DONE: pins the rendered fragments. |
| Create | src/server/services/rbac.compose.test.ts | DONE: shared composer parity and legacy adapter compatibility. |
| Create | src/server/test-utils/operator-native-auth-fixture.test.ts | DONE: ordinary guard tests for the fixture helper. |
| Modify | src/server/services/rbac.service.ts | DONE: exports `FreshCapabilitySnapshot`. |

The earlier statement "audit reuses exported pure fragments" is corrected: at the pin only `UNBILLED_BOOKING_WHERE` existed; `clientKeySql` and `LIST_PENDING_LINE_WHERE` are now exported by list.ts.
