---
id: 2026-10-03-notification-slice2-migration-reconciliation-spec
title: Reconcile historical notification and reminder storage into the Hub migration ledger
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub, minion-meta]
tags: [data, migrations, security, test]
type: fix
proposal: 2026-10-03-notification-recon
findings: [NOTIF-012]
verdict: approved
---

# Notification Slice 2 migration reconciliation

## 0. Product

Make the current reminder and legacy notification tables reproducible through Hub's owned migration
pipeline without fabricating historical migration provenance, destroying legacy rows, or making an
unreliable delivery claim look trustworthy. A supported fresh Hub database and an exact recognized
legacy catalog must converge on one reviewed schema, tenant boundary, grant manifest, and legal
runtime state machine. A mixed or altered catalog must stop the deployment transaction with a
sanitized conflict instead of being guessed into shape.

This is the migration-only part of notification-platform Slice 2 and D3. It closes the storage
reproducibility finding `NOTIF-012` after native proof. It deliberately leaves `NOTIF-001` and
`NOTIF-005` open: the current generic notification engine writes `sent` before a provider call, and
the reminder engine has no leased delivery effect or response-loss reconciliation. Those paths move
to the reviewed outbox/effect contract in later slices.

The implementation is additive Hub SQL plus disposable PostgreSQL fixtures and migration tests. It
performs no production read, production write, notification delivery, provider call, or release.

## 1. Out of scope

- Rule/direct-send route authority, settings UI, templates, catalogs, recipients, provider adapters,
  cron admission, scheduler workers, outbox rows, inbox rows, preferences, or Gateway receipts.
- Treating `notif_log.status = 'sent'` as provider acceptance, delivery, or human receipt. It remains
  an explicitly untrusted legacy claim until the old engine is retired.
- Retrying or repairing a historical `sched_reminders.status = 'sending'` row. Its external effect is
  ambiguous; migration cannot infer whether a provider accepted it.
- Adding `UPDATE` on `notif_log` so the current failure handler can rewrite a pre-send claim. That
  would still be a lossy transition and would legitimize the wrong state model.
- Copying the four historical files into Hub under their old versions, inserting their four versions
  into `hub_migrations`, or claiming they ran where only a matching catalog is observable.
- Rebuilding, coercing, deleting, or backfilling legacy business rows. Data repair requires a
  separate reviewed plan after a count-only preflight identifies an invalid state.
- Proving the complete fleet migration chain can bootstrap every Hub domain without the committed QA
  baseline. Hub's supported bootstrap remains baseline restore plus its production migration runner.
- Changing the stale Drizzle/service comments that call the reminder booking relationship soft even
  though the historical catalog has `ON DELETE CASCADE`; source cleanup belongs to its owning service
  slice after this catalog is accepted.

## 2. AS-IS

### 2.1 Split migration authority

At Hub `eb6867db52623f408e69458168e1efbb30e4f7e6`, `scripts/db-migrate.ts` reads only
`hub/supabase/migrations/*.sql`, derives the numeric version from each filename, and applies the body
plus one `hub_migrations` insert atomically under advisory lock `826744`. Hub does not contain these
historical files:

| Historical source | Source commit | SHA-256 | Observable transition |
| --- | --- | --- | --- |
| `supabase/migrations/20260618120000_scheduling_reminders.sql` | `5c9aca53bbb70ea851e16d9201c6220f457585c1` | `322507dae7c53e2b20a18380942f92bd26cdc4577a4e6b8449362a29431dadd1` | Creates reminder config/log, booking FK, old three-column unique index, RLS, and grants |
| `supabase/migrations/20260621200000_sched_reminders_multichannel.sql` | `104476e3593a01dc457df47335736a3c0ff51d10` | `9e88e5b2a17aefef527d4b7ff990ef731db373f5d75707886fe7e5a72620b7dd` | Adds `channels` and `recipient_role`; replaces the unique index |
| `supabase/migrations/20260621220000_sched_reminder_infer_confirmation.sql` | `e4de92efafe52e826cb26449e4784c5a254ba9ca` | `7e329877bc7b7a71d7c416e233fc1d0f7f99bb66ae0cd8d7df1ee8f009ea1848` | Adds `infer_confirmation` |
| `supabase/migrations/20260622230000_notifications.sql` | `2b0a88b6dc297d32072e40339aece2086a2070bc` | `823e656662d5e3bc69888dbad39b5f752f6b107bb7dc0ccccb40376d5baed172` | Creates generic rules/log, indexes, RLS, and runtime grants |

The commit messages say these files were applied to the historical production database, but this
program has not read a production migration ledger. A commit message is not live deployment proof.
Hub's QA baseline contains all four final tables even though its restored `hub_migrations` rows do
not establish that these four meta-owned files were run by Hub. The snapshot can therefore make
tests pass while a clean notification catalog remains unreproducible.

### 2.2 Current catalog and runtime behavior

Hub's Drizzle schemas model the final historical columns and indexes. The actual QA catalog also has
the reminder booking foreign key with `ON DELETE CASCADE`, forced RLS, and organization-GUC
policies. Its snapshot ACLs expose all four tables to `anon`, `authenticated`, and `service_role`;
`app_assistant_ro` can also read `notif_log` and `sched_reminders`. Current brain corpus policy
explicitly excludes both logs because they contain recipient and delivery content.

`app_ledger` currently has CRUD on `notif_rules`, `sched_reminder_config`, and `sched_reminders`, but
only `SELECT, INSERT` on `notif_log`. `notif.service.ts` inserts a `sent` row before calling
`channels.send`; on failure it attempts an update that this role cannot perform. `reminders.service.ts`
inserts `sending`, calls the provider, then updates the row to `sent`, `failed`, or `skipped`; every
existing row suppresses a new claim. A crash or response loss can leave `sending` indefinitely.

These defects constrain migration design. The final ACL must not grant the missing generic-log
update, and the migrated schema must not describe either legacy table as a durable provider receipt.

### 2.3 Supported bootstrap boundary

The committed QA bootstrap restores `supabase/qa/baseline/schema.sql` and `ledger.sql`, then runs the
unchanged production migration command and requires zero pending versions. The Hub migration
directory is not a complete genesis schema: early files depend on structures supplied by the
baseline. Fresh notification qualification must therefore use both of these honest proofs:

1. start an isolated disposable database with the exact minimal non-notification prerequisites and
   no notification/reminder tables, then execute the real runner with unrelated Hub versions marked
   as fixture prerequisites; and
2. restore the committed baseline into a separate isolated database, then execute the same runner as
   the supported full Hub bootstrap.

Neither proof may imply that `scripts/db-migrate.ts` alone bootstraps every Hub table from an empty
cluster.

## 3. TO-BE

### 3.1 One honest reconciliation version

After rechecking the migration-directory tail and concurrent ownership, add one uniquely versioned
Hub migration named `<next-version>_notification_legacy_reconciliation.sql`. The production runner
records only that version. The file comments freeze the four historical versions, source commits,
and fixture SHA-256 digests, but it never inserts those versions into `hub_migrations` or another
ledger. The new row means only: "this exact reconciler classified, converged, and verified the
notification/reminder catalog in one transaction."

All classification, DDL, grants, policy replacement, constraints, final assertions, and the
runner's ledger insert commit in the runner's existing transaction. Any exception rolls back the
entire catalog change and creates no adoption row. The migration never catches a catalog conflict
and continues.

### 3.2 Closed state classifier

The reconciler reads `pg_catalog` before DDL and accepts only the five complete states below. Column
position is not authority, but names, PostgreSQL types, nullability, defaults, every
`pg_constraint` row regardless of constraint kind, index definitions, policy
expressions/commands, RLS flags, table and column ACLs, non-internal `pg_trigger` rows, relevant
`pg_rewrite` rules, and role membership must match the named state. The classifier compares a
canonical projection of every object attached to the four target relations; it does not maintain a
short allowlist that could overlook a new constraint or rule kind. Historical prefix states have no
user trigger or rewrite rule on a target table. `legacy_complete` likewise has none. The canonical
final state has exactly the one named reminder transition trigger introduced by this reconciler and
no target-table user rewrite rule. PostgreSQL-owned internal RI triggers implied by the reviewed FK
are compared as consequences of that FK, not mistaken for user triggers. Any other constraint,
exclusion, trigger, or rewrite rule is a conflict, including an otherwise restrictive check.

| State | Exact observable input |
| --- | --- |
| `fresh` | All four target tables are absent; `sched_bookings`, `gen_random_uuid()`, `app_ledger`, and the migration role's ownership/DDL prerequisites are present |
| `reminder_base` | Both reminder tables exactly match the 20260618120000 result, including the old `(org_id, booking_id, stage)` unique index; notification tables are absent |
| `reminder_multichannel` | The two added columns and widened five-column unique index exactly match 20260621200000; `infer_confirmation` and notification tables are absent |
| `reminder_inference` | Reminder tables exactly match 20260621220000; notification tables are absent |
| `legacy_complete` | All four tables exactly match the complete historical result, including booking FK, final indexes, RLS, policies, and recognized historical grants |

A subset outside that chronology, one table without its pair, a missing/extra legacy column, wrong
type/default/nullability, wrong FK action, duplicate or wrong index, an extra check/exclusion/user
trigger/rewrite rule, disabled RLS, altered policy, or privilege broader than the recognized
historical snapshot is
`notification_schema_conflict`. The error exposes only object category and a bounded reason code;
it includes no row values, recipient, content, organization ID, raw catalog dump, or dynamic SQL.
Existing target tables must share one owner, the migration session must have ownership authority over
that role, and the owner cannot be an application/browser/assistant role named in section 3.4; a
different or unmodifiable owner is also a conflict.

The classifier also performs count-only data preflights before it adds constraints. A nonzero count
of invalid status/sent-time combinations or a reminder row whose booking FK cannot be established is
a conflict. It reports only the table, invariant ID, and bounded count. It does not coerce or delete
the rows.

### 3.3 Canonical final catalog

Every accepted state converges to the exact final column/default/index/FK shape already represented
by `pg-reminders-schema.ts` and `pg-notifications-schema.ts`, with these database-owned invariants:

- `sched_reminder_config`: current final columns, default-off `enabled`, current JSON defaults,
  `infer_confirmation = false`, primary key `(org_id)`.
- `sched_reminders`: current final columns, primary key `(id)`, booking FK to
  `sched_bookings(id) ON DELETE CASCADE`, unique
  `(org_id, booking_id, stage, channel, recipient_role)`, booking index, and organization/created
  index. The retired three-column unique index is absent.
- `notif_rules`: current final columns, primary key `(id)`, and organization index.
- `notif_log`: current final columns, primary key `(id)`, unique
  `(rule_id, entity_id, trigger_key)`, and organization/created index. This legacy key remains as-is;
  the later effect contract supplies real provider operation identity.
- All four tables enable and force RLS. Each has exactly one organization-GUC policy scoped `TO
  app_ledger`, with matching `USING` and `WITH CHECK` expressions on `org_id`. No `PUBLIC`, browser,
  assistant, or service-role policy remains.
- Table ownership remains with the existing migration/operator owner and must never be
  `app_ledger`, `app_assistant_ro`, `anon`, `authenticated`, or `service_role`.

The migration adds stable named checks:

- reminder status is one of `sending`, `sent`, `failed`, `skipped`;
- `sending`, `failed`, and `skipped` have `sent_at IS NULL`; `sent` has `sent_at IS NOT NULL`;
- legacy notification-log status is one of `sent`, `failed`, with a table/column comment stating
  that it is an untrusted legacy claim and not a provider delivery receipt.

It adds one reminder transition trigger with a fixed `pg_catalog, public` search path. Runtime insert
admits only `sending`; update admits only `sending -> sent|failed|skipped`, changes only
`status/content/message_id/error/sent_at`, and preserves id, org, booking, stage, channel,
recipient-role, recipient, and created time. Terminal rows cannot reopen or mutate. Delete remains
legal for the current booking cleanup/cascade path. The trigger function is not security definer,
has no direct execute grant requirement, and is not callable as a business API.

Historical rows already in terminal states remain valid without being rewritten. Historical
`sending` rows remain visible as ambiguous legacy work but cannot be blindly retried or settled by
this migration. A later effect migration must reconcile them under an explicit operator policy.

### 3.4 Exact privilege manifest

The required application role `app_ledger` must exist, be `NOLOGIN`, `NOSUPERUSER`, and
`NOBYPASSRLS`, and must not own any target table. Missing or unsafe role attributes abort adoption.
The final direct table privileges are:

| Table | `app_ledger` privileges |
| --- | --- |
| `notif_rules` | `SELECT, INSERT, UPDATE, DELETE` |
| `notif_log` | `SELECT, INSERT` only |
| `sched_reminder_config` | `SELECT, INSERT, UPDATE, DELETE` |
| `sched_reminders` | `SELECT, INSERT, UPDATE, DELETE` |

The migration inventories and removes privileges at both ACL layers: relation `relacl` and every
non-dropped column `attacl`. It revokes all direct table and column privileges on these four tables
from `PUBLIC`, `anon`, `authenticated`, `service_role`, and `app_assistant_ro` when those optional
roles exist, then grants only the table-level manifest above to `app_ledger`. The final assertion
must compare raw table/column ACLs and the effective result of `has_table_privilege` and
`has_column_privilege` for every table, column, real role, and privilege kind. `PUBLIC` is a
pseudo-role, so production reconciliation verifies its raw ACL entries and never creates a role to
probe them. The disposable native fixture alone creates an ephemeral NOLOGIN/no-membership probe
role and proves that role gains no target privilege through `PUBLIC`; fixture cleanup drops it. This
does not add a production `CREATEROLE` prerequisite. A hidden column grant may not survive an
apparently clean table revoke.

Direct ACLs are insufficient if an excluded role can inherit or assume `app_ledger`. Before any DDL,
the classifier computes the transitive `pg_auth_members` closure and checks effective
`pg_has_role(..., 'MEMBER')` and `pg_has_role(..., 'USAGE')` outcomes for `anon`, `authenticated`,
`service_role`, and `app_assistant_ro`. The explicit membership closure covers NOINHERIT edges that
can still authorize `SET ROLE`; where the server exposes membership option columns, their values are
part of the canonical edge projection. None may inherit, become, or `SET ROLE` to `app_ledger`,
directly or through an intermediate role. An unsafe membership is `notification_schema_conflict`; this table-scoped
migration fails closed and does not revoke or rewrite cluster-wide role memberships. It also does not
change cluster-wide default privileges.

Before implementation, a frozen source-consumer inventory must confirm that no supported route uses
PostgREST `anon`/`authenticated`/`service_role` or the assistant role to access these tables; a real
consumer blocks the revoke until its authority is separately reviewed. Root/migration ownership is
not an application grant.

That inventory is frozen at `notification-slice2-consumer-inventory.json` SHA-256
`f91755a4f306e10006f966612df78b26699df62b2f23fa9f5ff2c678fef300c2` with the human-readable
`notification-slice2-consumer-inventory.md` SHA-256
`beae4f71603ef33422865fc68b66b777970a773501924e2b7ad9317fec23ab8b`. It binds repository commits
and critical source-file digests, finds no direct target-table PostgREST consumer, and identifies the
only supported application data role as `app_ledger`. It also records two owner-connection discovery
reads, the migration/snapshot/sweep operator paths, compiled schema metadata, the authorized Brain
`notif_rules` projection, and Gateway's already-disabled stale raw-query advertisement.

### 3.5 No delivery-semantic upgrade

Migration comments and the test manifest use the terms `legacy claim` and `legacy reminder attempt`.
They never call either table an outbox, effect receipt, accepted delivery, or delivered message.
Current generic-log failure updates continue to be denied. Current reminder finalization remains the
only permitted legacy transition, but migration does not make its external effect idempotent.

The new schema defaults to empty tables and `sched_reminder_config.enabled = false`; applying it
cannot schedule work or send a message. No migration trigger invokes application code, HTTP,
Gateway, provider, cron, or queue work.

## 4. DELTA

| Delta | Change | Proof |
| --- | --- | --- |
| D1 | Add one Hub-owned reconciliation version instead of four false historical ledger entries | Runner records only the new version; frozen fixture provenance names all four originals |
| D2 | Classify `fresh` and four exact historical prefix states; reject everything else | Real-catalog matrix plus wrong-column/index/policy/FK/grant negative fixtures |
| D3 | Converge columns, defaults, FK, indexes, RLS, policies, ACLs, checks, and reminder transitions | Exact `pg_catalog`, `information_schema`, privilege, and two-role behavior assertions |
| D4 | Preserve rows and distinguish legacy claims from future effects | Exact preexisting-column values/counts/IDs survive every prefix adoption; newly added columns equal reviewed defaults; complete-state rows remain wholly byte-stable; pre-send log cannot update; no provider adapter exists in fixture |
| D5 | Qualify the actual Hub runner on clean-target and supported-baseline databases | Isolated database runner receipts, ledger/no-op assertions, and transaction rollback tests |

## 5. Verification

### 5.1 Frozen fixtures and harness

Check in the four historical SQL fixtures under
`tests/fixtures/notification-migrations/legacy/`, each with source repository, commit, original path,
and SHA-256 provenance. Tests import the vendored fixtures; they do not depend on a sibling meta
checkout or fabricate a simplified legacy shape.

The mandatory native test uses `openDisposablePostgres` against the explicitly marked loopback
database, creates uniquely named isolated child databases, records every name, and drops them in
`finally`. It never points the migration runner at the shared corpus database itself. The child
database fixture creates only the exact roles/extensions/booking prerequisite and unrelated
`hub_migrations` prerequisite rows needed to isolate this migration. No remote or production URL is
accepted.

The test invokes `scripts/db-migrate.ts` as a subprocess with `FORCE_DB_MIGRATE=1` and the isolated
URL. Populating unrelated Hub versions in the disposable fixture is test setup, not production
provenance; the fixture never inserts the four meta-owned historical versions.

### 5.2 Mandatory native cases

1. Starting from an empty isolated child database, install only the declared prerequisites with all
   four target tables absent, run the real Hub runner, and assert the exact canonical catalog and one
   new ledger row.
2. Build each of `reminder_base`, `reminder_multichannel`, `reminder_inference`, and
   `legacy_complete` from the frozen historical SQL and seed representative non-secret rows. For a
   prefix state, snapshot an ordered, typed serialization of every column that existed in that
   state plus row counts and primary IDs; after migration, require that exact preexisting-column
   intersection to be byte-for-byte equal. Assert each newly added column separately against its
   reviewed default/backfill value for every old row. Only `legacy_complete`, which gains no column,
   is compared as a whole row. This makes unavoidable defaulted columns explicit instead of calling
   a changed tuple byte-stable.
3. Restore the committed QA baseline into a fresh child database, run the production runner, and
   require zero pending versions and the same catalog manifest. This is the supported full-Hub
   bootstrap proof; it remains distinct from case 1's clean notification catalog.
4. For each of wrong type/default/nullability, one-table-only, wrong same-name unique index, wrong FK
   delete action, extra restrictive check, extra exclusion constraint, extra non-internal trigger,
   extra rewrite rule, altered RLS policy, disabled FORCE RLS, broader-than-recognized table ACL,
   hidden column ACL, transitive membership that lets an excluded role inherit or set
   `app_ledger`, and invalid row state: the runner exits nonzero, the error is sanitized, no adoption
   row appears, and a before/after catalog-plus-row digest is identical. The membership case also
   proves the migration did not mutate the cluster role graph.
5. Rerun after success. The runner applies zero files, the catalog and row digest stay unchanged,
   and the one adoption ledger row is unchanged.
6. Use two independent `app_ledger` sessions. Exact organization GUC reads/writes only its rows;
   foreign reads return none and foreign inserts/updates/deletes fail or affect zero. Empty, missing,
   and wrong GUC values reveal no rows. Assert role flags and non-ownership from the live catalog.
7. Assert raw table and per-column ACLs plus effective table/column privileges for `app_ledger` and
   absence for `PUBLIC`, browser roles, service role, and assistant role. Assert the excluded roles'
   transitive membership/usage/set-role checks cannot reach `app_ledger`. `notif_log` update/delete
   is denied. A removal mutation that grants either privilege, adds a column grant, or inserts an
   indirect role-membership edge must fail the test. Only the disposable fixture creates the
   temporary no-membership role used to exercise `PUBLIC` effective privileges; the migration SQL
   itself never creates or drops a cluster role.
8. Insert a reminder as `sending`, then exercise all three terminal transitions. Reject terminal to
   sending, terminal to terminal, direct insert as sent/failed, identity-field changes, invalid
   status, and invalid `sent_at`. Delete remains legal under exact organization authority.
9. Demonstrate the legacy truth boundary: an inserted `notif_log.status = 'sent'` is readable only as
   a legacy claim, cannot be rewritten by `app_ledger`, and creates no provider/Gateway call or new
   effect row.
10. Run catalog qualification through the repository's mandatory native lane with no conditional
    skip and an exact stable behavior name. Mutation controls must fail for at least the state
    classifier, ACL manifest, FORCE RLS, transition trigger, and omitted migration file.

### 5.3 Review and release gates

- Run touched SQL/fixture formatting, migration inventory/status tests, the focused native fixture,
  its semantic report validator, and configured Hub check after concurrent source settles.
- Independent review compares catalog assertions to both Drizzle definitions and the four frozen
  historical files, checks that the ACL revoke has no supported consumer, and verifies that fixture
  ledger setup cannot hide the missing migration.
- Local qualification marks the slice implemented, awaiting integration. A reviewed commit, hosted
  native lane, human migration/merge gate, deployment, and post-deploy read-only catalog/ledger check
  remain required. No local result is production proof.

## 6. Blast radius and residuals

- The reminder booking FK is real historical catalog even though current source comments call it
  soft. The migration preserves the FK and manual cleanup behavior; it does not silently change
  booking deletion semantics.
- Revoking snapshot-default privileges is a deliberate security change. Any actual direct
  PostgREST/service/assistant consumer discovered before implementation blocks that revoke until a
  least-privilege alternative is reviewed; absence is proven by the frozen inventory and tests, not
  assumed from table names.
- Adding state checks can expose historical invalid rows. Deployment must stop with bounded counts;
  no automatic data repair, constraint `NOT VALID` escape, or deletion is allowed.
- The old generic and reminder engines remain lossy after this slice. Exact-site handoff comments in
  their owning later source changes must point to notification-platform D8-D10; this migration does
  not mask those findings or close `NOTIF-001`/`NOTIF-005`.
- The four legacy tables will coexist with the later event/outbox/effect schema during migration.
  Their eventual read-only retirement and retention are owned by the later reviewed slices, not this
  catalog reconciliation.

## 7. Finding verdict

`NOTIF-012` becomes **implemented, awaiting release** only when the approved migration and all native
cases pass the exact prefix-column/default and complete-row preservation contract. It becomes **verified live** only after the deployed runner records
the new version and a read-only production catalog check matches the approved manifest. Until then,
the finding remains open. `NOTIF-001` and `NOTIF-005` remain open throughout this slice.
