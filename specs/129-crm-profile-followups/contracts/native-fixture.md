# Native fixture for the qa-native Instagram suite

This is the fixture for `src/server/services/crm-instagram-fields.sql.integration.test.ts` (nine registered behaviors, listed in [quickstart.md](../quickstart.md)). The [existing crm-concurrent lane](client-compatibility.md#existing-crm-concurrent-lane-remains-separate) keeps its own fixture and target; neither substitutes for the other. Source baseline is Hub c6c2d5739572356239c4048c0f564f40b0768adc; no native run is claimed.

## Connections

Three connections, each with one job:

| Name | Database | Opened as | Used for |
|---|---|---|---|
| controller client | `minion_qc_vectors` | container-initial superuser `minion_qc`, admitted by `openDisposablePostgres` | cluster role checks and creation; `CREATE DATABASE` and `DROP DATABASE` of the recorded child only |
| child owner client | the owned child `minion_qc_faces_crm_<32hex>` | the same `minion_qc` superuser, admitted by `openDisposablePostgres` on the child URL | F7 auth helper (`owner` argument), F8 public DDL, seed, catalog and policy-fingerprint assertions, authority derivation |
| business clients | the same child | `minion_qc`, then `SET ROLE app_ledger` with org/profile GUC | the service calls under test, one independent client per competing writer |

A PostgreSQL connection cannot run DDL in another database, so nothing child-local runs on the controller client. This matches the existing pattern in `tests/fixtures/notification-migrations/reconciliation-harness.ts:372-380`, which opens its admin connection on the child URL.

## Controller and child database

Use the qa-native CI controller from `.github/workflows/ci.yml:652-686`: image `pgvector/pgvector:0.8.6-pg18-trixie@sha256:78bf48b801e792f99e3ac62b5036fd3876e9be48afda16c1e331af1c75ceb2ff`, `POSTGRES_USER=minion_qc`, `POSTGRES_DB=minion_qc_vectors`, listening only on `127.0.0.1` port `55462` (or a separately recorded free loopback port). It must stay `minion_qc_vectors` with extension `vector` 0.8.6 in schema `extensions`, because `brains.effect-ownership.sql.integration.test.ts:131-132` requires both. Do not substitute vanilla PostgreSQL 15. The CRM test never drops or renames the controller.

Admit the controller with `openDisposablePostgres({MINION_QC_DISPOSABLE:'1', MINION_QC_DATABASE_URL: controllerUrl})`: protocol `postgres`/`postgresql`, literal `127.0.0.1` or `[::1]`, explicit port, user `minion_qc`, path `/minion_qc_vectors`, no query or hash, database comment `minion-360-disposable:v1`. Verify `current_user = 'minion_qc'` and `pg_roles.rolsuper = true` before role or database DDL; no ALTER ROLE. Apply the CI preparation (`CREATE SCHEMA extensions; CREATE EXTENSION vector WITH SCHEMA extensions`) and roles `app_ledger`, `anon` and `authenticated`, each `NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS`; create a role only if absent, otherwise verify its attributes. Never print credentials.

The controller client creates `minion_qc_faces_crm_<32hex>` (validated against `^minion_qc_faces_crm_[a-f0-9]{32}$`), sets its disposable marker, derives the child URL by changing only the database path, and the fixture opens the child owner client through `openDisposablePostgres` on that URL (the helper admits any `/minion_qc_[a-z0-9_]+` path, `scripts/qc/disposable-postgres.ts:26-27`). A missing marker, owner, superuser or role fails before fixture DDL; it never skips.

The full qa-native command also needs `HUB_TEST_DB_URL` pointing at a separately owned full-schema QA target for the lane's other suites.

## Shared F7 native-auth prerequisite

The PG18 vector image is plain PostgreSQL: `auth.uid` and `auth.users` do not exist. F8 reuses the helper F7 plans in [F7 native-auth-prerequisites.md](../../128-faces-receivables-audit/contracts/native-auth-prerequisites.md):

- `src/server/test-utils/operator-native-auth-fixture.ts`, exporting `installOperatorNativeAuthFixture(owner, expectedOwnedChildIdentity)` and `assertOperatorNativeAuthFixture(owner, expectedOwnedChildIdentity)`;
- its SQL source `src/server/test-utils/fixtures/operator-native-auth.sql`.

Status: planned, not implemented. F7 creates and qualifies it in its tasks T003 and T005 (`specs/128-faces-receivables-audit/tasks.md`). F8 task T017 waits until it is in the F8 candidate's Hub base; if absent, F8 native work stops and the block is recorded in validation.md. F8 writes no substitute.

F8 passes `owner` = the child owner client from the table above and `expectedOwnedChildIdentity` = the recorded child database name, in this order:

1. `installOperatorNativeAuthFixture` before any public policy or foreign-key DDL.
2. Apply `crm-instagram-native.sql` (public tables only) and seed synthetic `auth.users` rows before the matching `profiles` rows.
3. `assertOperatorNativeAuthFixture` after public DDL and seed.

What F8 consumes from the helper, as F7 defines it:

- child-local `auth` schema and `auth.users(id uuid PRIMARY KEY, email text)`;
- `auth.uid()`: SECURITY INVOKER, STABLE, body from `reconciliation-harness.ts:374-401`, owned by `supabase_auth_admin`, with PUBLIC and `dashboard_user` EXECUTE;
- ACL-recipient roles `postgres` and `service_role` (sentinels), `supabase_auth_admin` and `dashboard_user`, each `NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS` without membership edges, created by the controller client only if absent;
- empty JWT claims on fresh clients, so `auth.uid()` returns NULL.

Public `profiles` uses the baseline shape (`schema.sql:4034-4049`, NOT NULL email) plus the authority fixture's lifecycle columns, and keeps `profiles_id_fkey -> auth.users(id) ON DELETE CASCADE` (`schema.sql:8118`). Apply the baseline profile, member and organization policies; install no JWT subject during business mutations, and `app.current_profile_id` never acts as one. Grant `app_ledger` nothing beyond baseline. F8 additionally asserts the public policy fingerprint. Child auth objects disappear when the child is dropped; controller roles are not dropped per test.

## Fixture files and tables

`src/server/test-utils/crm-instagram-native-fixture.ts` owns admission, child lifecycle, SQL application, catalog assertions, Drizzle binding and authority setup. `src/server/test-utils/fixtures/crm-instagram-native.sql` is a test fixture, not a migration, with canonical column types, defaults and keys. Business CRM tables keep `app_ledger` org-GUC RLS and grants; authority tables keep their baseline ACL/RLS.

| Tables | Source definition and exercised path |
|---|---|
| `auth.users`, `auth.uid` | From the F7 helper; not in F8's SQL file. |
| `organizations`, `profiles`, `organization_members`, `member_roles`, `org_roles`, `permission_rules` | The `organization-role-admin.sql.integration.test.ts` authority fixture and `resolveFreshCapabilitiesInTransaction` (`rbac.service.ts:1088`), including `field_level` and `if_owner`. |
| `app_modules` | `modules.service.ts` schema and absent-means-enabled behavior; enabled and disabled CRM states. |
| `crm_contacts` | Full `pg-crm-schema.ts` `crmContacts`; `returning()` needs every mapped column. |
| `parties` | Full `pg-party-schema.ts` `parties` with its unique indexes; party facet locks the party before contact creation. |
| `assignment_rules` | Full `pg-assignment-schema.ts`; left empty so unscoped owner-null `createContact` runs the real `autoAssign` SELECT and finds no rule. |
| `crm_contact_identities` | Full definition with contact cascade FK and `unique(org_id, channel, external_id)`; seed distinct identities including the same channel with different IDs, plus a `phone` identity for the restricted-save case. |
| `crm_activities` | Full definition and org-GUC policy; merge reassigns `contact_id`. |
| `crm_tags`, `crm_contact_tags`, `tag_links` | Full definitions; merge reassigns contact tags with ON CONFLICT; event `tag_links` stay unchanged. |
| `doc_audit_log` | Full `pg-activity-schema.ts` `docAuditLog`; `recordAuditInTx` records only filtered input. |

`supabase/ci-fixtures/crm-funnel-concurrent.sql` is not run in this child (it creates `organizations(id)` only); reuse its catalog/RLS/default/grant assertion pattern. Before any service test, compare every mapped column, type, nullability, default, key, RLS flag and grant through `pg_catalog`; a mismatch fails qualification.

## Authority and target binding

Keep the real service functions, SQL expressions, `recordAuditInTx`, `withOrgCore`/`withOrgCoreTransaction` and `getOrgTransactionDb`. The test-local `pg-client` override changes only `getCoreDb` to return the current child Drizzle instance, throws if unbound, and never marks it `MANAGED_CORE_DB`. Install counters on global pool factories and Supabase/admin/network fallbacks and assert zero attempts.

Per persona and request:

1. Seed two orgs, profiles and real role/permission-rule rows: restricted and authorized CRM personas, each unscoped and `if_owner`.
2. The child owner client runs `resolveFreshCapabilitiesInTransaction` in a short committed admission transaction (trusted permission loading).
3. Bind `runWithRequestCapabilities({orgId, profileId, capabilities, platformAdmin: false}, callback)`. `canWriteSensitiveFields` derives from `!(await shouldMaskSensitive(locals, 'crm'))` and merge `ownerId` from `ownerFilter(locals, 'crm')`.
4. Business transactions run as `app_ledger` under the org/profile GUC and source RLS. Effective narrowing uses `runWithEffectiveAuthority`; nothing in the composer, record admission or policy verdict is mocked.

Each persona gets its own ALS scope, restored in `finally`. Record sanitized `current_database`, backend PID, role, org and profile per query to prove every query reached the child. Postcommit cache invalidation uses a test-local recorder; no Redis, model, messaging or provider call runs.

## Behaviors, races and cleanup

The nine requiredBehaviors and `minimumAssertions: 9` are fixed in quickstart.md. Checks that are not themselves a behavior run inside a named one:

- fixture qualification (catalog, policy fingerprint, `postgres`/`service_role` sentinel attributes, F7 assert helper) runs in `beforeAll`; a failure fails every behavior;
- the `autoAssign` no-rule source-drift assertion runs inside `restricted manual contact creation strips manual Instagram keys and authorized creation persists them`;
- the restricted phone/email/phone-identity preservation case runs inside `masked whole namespace preserves stored masked values while unrelated fields change`;
- participant-set admission cases run inside the merge behavior.

Lock races use independent backends and `pg_stat_activity` lock-wait observations for both authorized-update/restricted-update orders and both merge arrival orders. Denied paths compare before/after digests of all affected tables. The restricted merge refusal happens before the first identity, activity, tag or contact mutation.

Cleanup: release blockers, roll back and close child connections, restore factory/ALS/mock state, then the controller client drops only the recorded child, asserts it is gone and closes. Never drop the controller, the full-schema QA target, shared roles or their tables.

Authority composition by the child owner client is recorded separately from `app_ledger` business transactions; it is not an `app_ledger` access proof. Baseline negative probes require organization SELECT and profile/membership UPDATE denial to `app_ledger`, and no profile self-row without a JWT subject. The `postgres` and `service_role` sentinels are ACL targets for baseline grants, not service identities.
