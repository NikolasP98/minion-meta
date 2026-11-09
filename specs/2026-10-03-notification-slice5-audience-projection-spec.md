---
id: 2026-10-03-notification-slice5-audience-projection-spec
title: Project notification events into exact per-recipient candidates under current authority
stage: dev
status: implementing
pass: 2
verdict: approved
created: 2026-10-03
updated: 2026-10-07
repos: [minion_hub]
tags: [security, data, logic, test]
type: feature
proposal: 2026-10-03-notification-recon
findings: [NOTIF-007, NOTIF-014, NOTIF-016, NOTIF-017]
---

# Notification Slice 5 — audience projection

## 0. Product

This is the author contract for Slice5/D6 of the approved notification-platform spec. It converts a
live leased event into exact per-recipient, privacy-safe candidate rows. It depends on the accepted
Slice3 event/outbox contract and Slice4 scheduler/worker contract.

### Revision history

| Revision | Review state                                                                    | Contract change                                                                                                                                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1       | author draft `bd92d457b6a705f9eb08cdd5883cbb42bcc01a6c67442c7d87b7fc5a798a7c91` | Exact tuple routing, first three join adapters, projection receipts/candidates and current-authority revalidation.                                                                                                                                                                                                                 |
| v2       | author response, pending renewed two-pass review                                | Keeps transactions at `READ COMMITTED`; adds one coherent materialized authority bundle plus a separate fresh final fence, exact runtime/organization/event authority, role and evidence caps, exclusive projected settlement, receipt-set integrity, matching pending/processing index order, and bounded CAS-safe revalidation.  |
| v3       | author response, pending renewed two-pass review                                | Makes the final operational fence serializable: one fixed finalizer locks runtime, organization and outbox in canonical order, rechecks all identities/deadlines after acquisition, verifies the receipt set, and holds every lock through immediate transaction commit.                                                           |
| v4       | author response, pending renewed two-pass review                                | Preserves existing browser RLS with exact role-specific restrictive projection fences, adds bounded exact-operation terminal reconciliation after an ambiguous commit, and corrects finalizer races so same-generation renewals can remain valid while release/replacement/reclaim invalidates scope.                              |
| v5       | author response, pending renewed two-pass review                                | Makes terminal operation identity durable: finalizer-attested receipts survive authorized candidate cancellation/erasure, terminal outbox rows retain owner/generation attribution, and historical unattributed terminals never masquerade as this operation.                                                                      |
| v6       | author response, pending renewed two-pass review                                | Makes the deferred commit guard executable under forced RLS: one receipt-scoped trigger-only definer reselects current finalized evidence, no per-candidate trigger runs, and the exact function/policy/budget catalog is falsifiable.                                                                                             |
| v7       | author response, pending renewed two-pass review                                | Replaces the infeasible keep-`PUBLIC` source-policy design after an executable baseline reproduction found recursive RLS. Existing policies are retargeted to exact effective roles, the projection role receives one complete policy per source relation, and browser/service/application parity is mandatory.                    |
| v8       | author response, pending renewed two-pass review                                | Admits only the observed platform-owned PostgreSQL creator edge for the inaccessible finalizer role: no edge on the plain-superuser PostgreSQL 18 fixture, or the exact Supabase `postgres`/`supabase_admin` ADMIN-only edge with no SET/USAGE on PostgreSQL 17; every runtime edge remains forbidden.                             |
| v9       | author response, pending renewed two-pass review                                | Replaces the unsafe direct migration-actor grant after the pinned Supabase PostgreSQL 17.6 backend crashed on that operation. A transaction-local `NOINHERIT` bridge created with initial memberships provides the ownership-transfer SET chain, is dropped before commit, and leaves the v8 finalizer edge modes byte-equivalent. |
| v10      | author response, pending renewed two-pass review                                | Freezes the permanent platform-edge subset from the complete temporary graph, proves exact post-drop owner/schema/authority state before and after a committed transfer on PostgreSQL 17 and 18, and proves rollback after an injected partial-transfer failure.                                                                   |
| v11      | author response, pending renewed two-pass review                                | Extends the initial-membership bridge to the existing `notification_event_trigger` owner so Slice5 can replace `notification_event_enqueue()` without a direct actor grant. It preserves that function's owner, ACL, security-definer/search-path metadata and the exact preexisting owner graph on PostgreSQL 17 and 18.          |

The v6 transaction model deliberately does not use `REPEATABLE READ`. A long-lived repeatable-read
snapshot could hide a runtime or organization lease replacement that commits while projection is in
progress. Coherent source authority comes from one statement snapshot. The finalizer obtains fresh
`READ COMMITTED` visibility and row locks; the locks, rather than snapshot recency alone, serialize
publication against a concurrent runtime, organization or event replacement.

The first production audience adapters cover `join.requested`, `join.approved`, and `join.denied`.
Together they exercise a current role/capability audience and the exact-user pre-membership
exception. The other 13 catalog kinds remain unsupported and pending until their real source,
subject, field, and audience adapters are independently reviewed. A test fixture can qualify the
generic field-mask interface, but it cannot make a production kind supported.

## Out of scope

This slice does not wire a domain producer, send email or another external effect, expose an inbox
route, add browser read/dismiss behavior, apply preferences, schedule civil time, assemble a digest,
execute an aggregate/report query, or change the current join request email. It does not set any
catalog entry's `integrated` flag to true. Join producer integration and replacement of the current
best-effort email path remain in their later producer/effect slices.

No candidate is browser-readable in this slice. Slice11 owns the canonical user/profile GUC inbox
policy, pagination, bell count, read/dismiss state, mounted UI, and `committed-refresh-failed`
behavior. Slice6 owns preferences and verified destinations. Slices8 and9 own external dispatch and
receipts. Slice13 owns source producer integration.

## Reviewed source snapshot

The source inventory is frozen in `notification-slice5-recon.json`. Its Hub HEAD is
`506d53ddaa50f224e9952ef9c32dd0e40174b1c5`; individually reviewed worktree files are identified by
individual SHA-256 because HEAD alone does not name their reviewed bytes.

The v7 source-policy adoption addendum is separately frozen in
`notification-slice5-v7-policy-inventory.json`. It inventories the supported QA baseline at SHA-256
`90422f4b78a0d28a0b9b455b17c5cd1dc95f822e312b589382fd0627d301512c`, including exact relation
owners, table/column ACL consumers and policy commands. Its executable reproduction and cleanup
receipt are `notification-slice5-v7-rls-repro.sh`, `notification-slice5-v7-rls-repro.json`, and
`notification-slice5-v7-rls-recursive.log`.

The v10 finalizer-transfer evidence is frozen in
`notification-slice5-v10-owner-transfer-evidence.json` and
`notification-slice5-v10-owner-transfer-evidence.md`. The receipt binds the pinned PostgreSQL 17
crash excerpt, unsafe reproduction SQL, committed PostgreSQL 17/18 bridge proof, exact post-drop
catalog assertions and injected partial-transfer rollback proof. Those experiments use only
disposable loopback databases and contain no application data or production connection. The v9
receipt remains immutable evidence of the original crash and bridge direction, but it is superseded
for migration acceptance.

The v11 existing-owner evidence is frozen in
`notification-slice5-v11-event-trigger-owner-evidence.json` and
`notification-slice5-v11-event-trigger-owner-evidence.md`. It binds the actual PostgreSQL 17
production-runner failure, the initial-membership bridge SQL, committed replacement and injected
post-replacement rollback on PostgreSQL 17 and 18, exact pre/post owner graphs, and disposable
container cleanup. It changes no runtime authority and does not replace the v10 proof for the three
new finalizer-owned functions.

### AS-IS

1. `src/lib/notifications/catalog.ts` registers 16 kinds under catalog revision
   `2026-10-03.1`. Every entry has `integrated: false`. The three join entries already name their
   audience, capability, privacy, navigation, and template contracts.
2. `src/lib/notifications/policy-contracts.ts` maps `users.manage` to current `users:manage` in the
   exact target organization and maps `subject.or_users_manage` to the exact applicant/subject OR
   current target-org manager rule.
3. `notification_events` stores kind/schema/catalog and immutable canonical evidence.
   `notification_outbox` stores only catalog revision. Its pending/processing indexes and claim API
   therefore cannot distinguish a supported join adapter from another unsupported kind in the same
   catalog revision.
4. `NotificationProjector` advertises only `supportedCatalogRevisions`. Slice4 discovery and the
   outbox claimant treat every event in such a revision as eligible. A partial Slice5 rollout would
   otherwise claim unsupported rows.
5. The production projector is intentionally absent. Admission returns
   `projection_unavailable`; the qualification projector is disposable-only and leaves outbox rows
   untouched.
6. `fresh-org-authority.ts` resolves active exact-org members with current roles and overrides, but
   its email-oriented API caps the raw member set at 1,000 and reads `auth.users`. Slice5 needs up to
   10,000 distinct in-app recipients and no email destination, so silently reusing that API would
   impose the wrong cap and authority surface.
7. Current Hub identity maps `locals.user.id == locals.user.supabaseId == profiles.id`. A current
   join request writes both `join_request.user_id` and `join_request.supabase_id` from that canonical
   UUID. Historical rows can differ, and neither difference nor non-UUID text may be guessed into an
   applicant entitlement.
8. `createRequest` performs a committed join insert, then a bounded best-effort email fan-out.
   Approve/deny use Supabase/PostgREST calls and do not share an owned PostgreSQL transaction with
   `appendNotificationEvent`. Slice5 cannot claim those routes as durable producers.
9. The current manager page is `/users/join-requests` and is server- and navigation-gated by
   `users:manage`. The authenticated applicant pages are `/join` and `/join/sent`. No raw event field
   is needed to choose one of those routes.
10. Worker transactions currently use PostgreSQL's default `READ COMMITTED` isolation, set only
    organization/event-owner scope, and let `notification_worker` settle a live row directly as
    projected without a projection receipt or candidates.
11. Slice4 stores exact runtime and organization owner/generation/expiry identity, but the current
    projector callback receives only `OrganizationLease`; the projection/claim role has no reviewed
    runtime or organization-control fence.
12. `notification_scheduler_fence()` is a volatile `EXISTS` predicate. The coordinator's
    `lockRuntimeFence()` obtains a runtime row lock before organization transitions, but there is no
    corresponding projection finalizer. A fresh `READ COMMITTED` statement can observe the old
    control tuple and still settle after a concurrent release/replacement commits unless final
    publication serializes on those rows.
13. The baseline source tables already carry browser-facing permissive policies. In particular,
    `join_request_admin_all`/`join_request_self_select`,
    `organization_members_admin_all`/`organization_members_self_select`,
    `organizations_admin_all`/`organizations_member_select`, and `profiles_self_select` apply
    through `PUBLIC`; `permission_rules_org_guc` is also a `PUBLIC` policy. `auth.uid()` derives from
    request JWT settings that a database caller can set. A projection policy cannot assume those
    existing permissive policies are absent or that a caller-controlled JWT subject bounds their
    union.
14. After a successful finalizer transaction commits, the outbox is terminal and its live lease
    fields are cleared. The current claim role cannot read projection receipts, while the proposed
    projection-mode scope exposes only a live processing row. A lost commit response therefore
    needs a separate exact-operation terminal observation path; retrying the projection transaction
    is not reconciliation.
15. Applying the v6 keep-`PUBLIC` design to the actual baseline is not executable. Under
    `app_notification_worker`, `organization_members_admin_all` expands through `profiles`, while the
    worker profile predicate expands back through `organization_members`; PostgreSQL rejects the
    query with `42P17 infinite recursion detected in policy for relation organization_members`. A
    restrictive policy does not repair recursive expansion of another applicable policy. The v7
    child-database reproduction proves both that failure and the nonrecursive exact-role adoption.
16. Slice3 owns `notification_event_enqueue()` with the inaccessible
    `notification_event_trigger` role. Slice5 must replace its body to insert the new immutable
    `kind` and `schema_version` routing columns. On the supported Supabase PostgreSQL 17 runner,
    `postgres` retains only the platform `ADMIN=true, INHERIT=false, SET=false` creator edge, so an
    ordinary `CREATE OR REPLACE FUNCTION` fails because the actor is not the owner of
    `notification_event_enqueue`. PostgreSQL 18's superuser fixture masks that production path.

### Required correction before a real adapter can run

Support is an exact projection tuple, not a catalog revision:

```ts
type NotificationProjectionSupport = Readonly<{
  catalogRevision: string;
  kind: NotificationKind;
  schemaVersion: number;
  adapterRevision: string;
}>;
```

The production projector publishes a canonical sorted manifest of 1..32 unique tuples and its
SHA-256. The routing key `(catalogRevision,kind,schemaVersion)` is itself unique: two adapter
revisions cannot claim the same event tuple. Admission rejects a duplicate routing key, duplicate
full tuple, unknown catalog tuple, absent implementation, malformed adapter revision, an
unsorted/noncanonical manifest, or a digest mismatch. The projector artifact hash covers both code
and this manifest. Slice4 runtime generation fencing therefore also fences an adapter-manifest
change.

The Slice5 manifest contains exactly these three current catalog tuples:

| Catalog tuple                       | Adapter revision    | Audience modes                                       |
| ----------------------------------- | ------------------- | ---------------------------------------------------- |
| `2026-10-03.1 / join.requested / 1` | `join-requested.v1` | current `users:manage` members                       |
| `2026-10-03.1 / join.approved / 1`  | `join-outcome.v1`   | exact applicant, then current `users:manage` members |
| `2026-10-03.1 / join.denied / 1`    | `join-outcome.v1`   | exact applicant, then current `users:manage` members |

All other tuples remain eligible for future workers but unsupported by this worker. They stay
pending. A subset-capable worker can be healthy for its manifest while organization health reports
an `unsupportedProjectionPending` flag for other tuples. “Runnable” never means every registered
catalog kind has a producer or adapter.

The existing catalog `integrated` field continues to mean the complete source-to-consumer path is
qualified. Slice5 does not change it. Projection support has its own generated manifest and drift
test rather than overloading `integrated` or editing catalog revision without a semantic reason.

## TO-BE

### 1. Additive schema and exact routing

Reserve `20261003170000_notification_audience_projection.sql` only when implementation begins.
The migration must classify and require the exact Slice3/Slice4 predecessor objects before writing;
it does not use broad `IF NOT EXISTS` to adopt an unknown catalog.

Add immutable `kind` and `schema_version` to `notification_outbox`. Backfill each existing row from
its exact `(organization_id,event_id,catalog_revision)` event, reject an orphan or mismatch, make the
columns not null, and extend the composite event/outbox foreign key to include both fields. The
enqueue trigger writes all five immutable routing fields. The transition trigger rejects any later
change. Existing event, claim, generation, completion, and retention semantics remain unchanged.

Add nullable `terminal_owner_id uuid` and `terminal_generation bigint` to `notification_outbox` as
the minimal durable identity of the lease operation that produced a terminal state. Pending and
processing rows require both null. On every new `processing -> projected/quarantined` transition,
including the retained Slice3 integrity quarantine path, the transition trigger copies the old live
`lease_owner` and `generation` into those columns; a caller cannot supply or update them. A terminal
row requires either both values present with `terminal_generation=generation`, or both null only when
it predates this migration and cannot be attributed. Once present they are immutable. Adoption does
not invent an owner for an existing projected/quarantined row whose lease fields were already
cleared. Such a row is explicitly historical/unattributed and can never prove that a current
operation committed.

Replace the state-specific claim indexes with:

- pending: `(organization_id,catalog_revision COLLATE "C",kind COLLATE "C",schema_version,event_id)`
  where `state='pending'`;
- processing: `(organization_id,catalog_revision COLLATE "C",kind COLLATE "C",schema_version,
lease_expires_at,event_id)` where `state='processing'`.

Claim/discovery SQL joins a bound `VALUES` relation of the exact supported tuples. It never builds
SQL from adapter names, uses `NOT IN` across the outbox, or claims a row by revision alone. Claim
order is exactly the order represented by each partial index: pending rows use canonical tuple then
event ID; expired processing rows use canonical tuple, lease expiry, then event ID. These are two
explicit query classes, not one query whose `ORDER BY` disagrees with an index. The API accepts a
maximum event count; the production Slice5 projector always requests one event. Slice3
qualification can still test the reviewed 250-row general ceiling.

Unsupported detection sorts the at-most-32 support tuples and uses at most 33 disjoint
lexicographic index-range probes. A range excludes every supported tuple, so 100,000 supported rows
cannot be linearly filtered before a far unsupported row. Discovery needs one exact eligible query
per state/candidate, not 33 unsupported probes. The health/read path owns the complement probes.
Candidate-statement and discovery budgets count every support query.

Unknown catalog revisions, unsupported kinds, and unsupported schema versions remain pending. They
are not quarantined, marked projected, or treated as empty. A later compatible worker can claim
them.

### 2. Projection role and least privilege

Create `app_notification_worker` as `NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEDB
NOCREATEROLE NOREPLICATION`. Reject an ambiguous pre-existing role. Grant it only to the reviewed
backend owner after the same transitive role-membership admission used by Slice3/4. `app_ledger`,
`notification_worker`, `notification_coordinator`, `notification_health_reader`, `anon`,
`authenticated`, `service_role`, and `app_assistant_ro` cannot inherit, assume, or grant it. It owns
no table, sequence, trigger, policy, or function.

Create a second role, `notification_projection_finalizer`, with the same non-login, non-superuser,
non-bypass, no-inherit and no-create attributes; any pre-existing role of that name makes adoption
fail closed. No application, backend runtime or ordinary caller receives membership, ADMIN OPTION,
`SET` or `USAGE` on it. Any temporary migration-actor membership needed to transfer function
ownership uses the bounded bridge protocol below; a direct second grant to the migration actor is
forbidden.

PostgreSQL's platform role-creation semantics have one narrow installation exception. The supported
plain-superuser PostgreSQL 18 fixture has no `pg_auth_members` row targeting the finalizer. The
supported Supabase PostgreSQL 17 fixture may retain exactly one platform-created row: member
`postgres`, target `notification_projection_finalizer`, grantor `supabase_admin`,
`admin_option=true`, `inherit_option=false`, and `set_option=false`. In that mode
`pg_has_role('postgres', 'notification_projection_finalizer', 'USAGE')` and `... 'SET'` must both be
false. Creation of the finalizer and its bridge membership is atomic, so there is no fictional
pre-bridge observation point. The migration captures the complete graph immediately after creation,
classifies as persistent only the rows whose target and member are both outside the exact bridge,
and compares the complete post-drop finalizer graph byte for byte with that frozen persistent
subset. Every later migration and worker admission requires the same persistent member/grantor
inventory. It does not revoke the Supabase platform-owned ADMIN-only edge. Any other member,
grantor, ADMIN, inheritance or SET edge fails closed. In particular, neither worker role nor any
browser, service, assistant, ledger, coordinator or health role may hold an ADMIN edge even if SET
and USAGE are false.

The ownership-transfer protocol is exact and transactional. It covers both the existing Slice3
trigger owner and the three new finalizer functions:

1. reject a pre-existing fixed bridge role or finalizer role;
2. create `notification_projection_owner_bridge` as
   `NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION` with the
   existing `notification_event_trigger` named in `IN ROLE` and the migration actor named in `ROLE`
   in the same `CREATE ROLE` statement. No later direct actor-to-owner `GRANT` is allowed;
3. create `notification_projection_finalizer` with the same attributes and the bridge named in the
   same `CREATE ROLE ... ROLE notification_projection_owner_bridge` statement;
4. inventory the complete temporary graph touching the existing trigger owner, bridge or finalizer.
   Freeze the persistent platform subset as exactly those rows whose target and member are both
   outside the bridge. The PostgreSQL 17 graph has exactly six rows: existing platform
   actor-to-event-trigger and new platform actor-to-finalizer edges granted by `supabase_admin`, both
   `ADMIN=true, INHERIT=false, SET=false`; event-trigger-to-bridge and bridge-to-finalizer edges
   granted by `postgres`, both `ADMIN=false, INHERIT=false, SET=true`; actor-to-bridge granted by
   `postgres` with `ADMIN=false, INHERIT=true, SET=true`; and platform actor-to-bridge granted by
   `supabase_admin` with `ADMIN=true, INHERIT=false, SET=false`. Its persistent subset is exactly the
   two platform owner edges. The PostgreSQL 18 graph has exactly three rows: event-trigger-to-bridge,
   actor-to-bridge and bridge-to-finalizer with the same non-admin option tuples, all granted by the
   exact migration actor; its persistent subset is empty. Any extra row, transitive path, changed
   grantor or changed option fails closed;
5. snapshot the exact owner, ACL, `SECURITY DEFINER` flag, empty fixed search path and definition of
   `notification_event_enqueue()`. Grant `notification_event_trigger` schema `CREATE`, use the
   bridge's SET chain to `SET LOCAL ROLE notification_event_trigger`, replace only that function body
   with the five-column routing insert, `RESET ROLE`, revoke schema `CREATE` immediately, and prove
   owner, ACL, security flag and search path are byte-equivalent while the new body is exact;
6. grant the finalizer `CREATE` on `public` only for the three ownership transfers, transfer exactly
   those functions, then revoke schema `CREATE` immediately;
7. drop the bridge role. PostgreSQL removes every edge involving that role; no direct `GRANT` or
   `REVOKE` of either inaccessible owner to or from the migration actor occurs;
8. before commit, prove the bridge is absent, both owners lack schema `CREATE`, every function has its
   exact owner and metadata, a separately restricted runtime role has `SET=false` and `USAGE=false`
   for both owners, and the complete existing-owner plus finalizer graph is byte-equivalent to the
   frozen persistent subset;
9. commit the successful transfer, repeat the owner/schema/runtime-authority/complete-graph checks,
   then clean the disposable proof in a separate committed transaction. Separate proofs inject an
   exception after the existing function replacement and after the three new ownership transfers,
   each before bridge drop; each transaction rolls back function bytes, schema ACL, roles and edges
   exactly.

The initial-membership form is required because the pinned
`public.ecr.aws/supabase/postgres:17.6.1.106` backend terminated with signal 11 when a second direct
grant targeted the same finalizer/member after the automatic platform creator edge. Transaction
rollback removed the probe role, but a process crash is never an acceptable migration mechanism.
Plain PostgreSQL 18 and Supabase PostgreSQL 17 both have executable committed-success and
partial-transfer rollback proofs for the existing owner and the new finalizer.

The finalizer owns exactly the fixed `notification_finalize_audience(text)`,
`notification_observe_audience()`, and `notification_projection_commit_guard()` functions and no
relation, schema, policy, trigger or other function. It receives no source-table or event-payload
access. This role exists only so the finalizer and observer can obtain the narrow row-lock or
terminal receipt-read privileges that must not be granted directly to `app_notification_worker`,
and so the trigger-only commit guard can reselect current terminal evidence after the caller role
resumes.

`notification_worker` retains claim, renewal, integrity quarantine, and the existing general Slice3
tests, but Slice5 revokes its ability to settle `processing -> projected`. The worker role can still
settle only the three Slice3 integrity quarantines. `app_notification_worker` is the only role that
can request projection or a Slice5 quarantine, and only the fixed finalizer can perform that terminal
outbox update. The application role receives the exact columns required to:

- select immutable event identity/body and the live claimed outbox row in its current org;
- insert a projection receipt and candidate rows;
- execute the finalizer with `projected` or one of the six finite Slice5 quarantine reasons, but not
  update the outbox terminal columns directly;
- execute the fixed terminal observer after an ambiguous finalizer/commit response, but not select
  terminal outbox, receipt, or candidate rows directly;
- recheck and irreversibly cancel a candidate;
- read the runtime singleton columns `singleton`, `schema_version`, `owner_id`, `generation`,
  `lease_expires_at`, `build_sha`, `catalog_revision`, `catalog_sha256`, `projector_revision`, and
  `projector_sha256`;
- read the organization-control columns `organization_id`, `state`, `owner_id`, `generation`,
  `lease_expires_at`, and `hard_deadline`;
- read only these source columns:
  - `organizations(id,status)`;
  - `organization_members(organization_id,profile_id,role)`;
  - `profiles(id,role)`;
  - `member_roles(org_id,profile_id,role_key)`;
  - `permission_rules(org_id,role_key,module,can_manage,field_level,if_owner)`;
  - `join_request(id,organization_id,supabase_id,user_id,status,created_at,reviewed_at)`.

It receives no `join_request.email`, `display_name`, `message`, `requested_role`, or `reviewed_by`, no
`auth.users` access, no destination/channel credentials, and no source mutation privilege. Add
explicit exact-org RLS policies for this role to every operational and source table it reads.
`notification_worker_runtime` exposes only the singleton whose exact owner, generation,
build/catalog/projector identity and live expiry equal the transaction scope.
`notification_org_control` exposes only the exact running organization lease whose owner,
generation, live expiry and hard deadline equal that scope. `notification_outbox` and
`notification_events` expose only the exact processing event receipt whose organization, event,
tuple, owner, generation and live expiry equal that scope.

The migration preserves the behavior of every effective existing source consumer while removing
`PUBLIC` from these six relations. `relation_owner` below is not a literal role: the migration reads
the exact owner OID from `pg_class`, rejects either Slice5 worker as owner, and binds that exact role
into the policy. The supported baseline adoption is:

| Relation               | Existing policies                                                                                    | Exact post-v7 roles                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `organizations`        | `organizations_admin_all`, `organizations_member_select`                                             | `anon`, `authenticated`, `service_role`, exact `relation_owner`               |
| `organization_members` | `organization_members_admin_all`, `organization_members_self_select`; `organization_members_org_guc` | first two: browser/service, `app_ledger`, owner; org-GUC remains `app_ledger` |
| `profiles`             | `profiles_self_select`, `profiles_self_update`                                                       | select: browser/service, `app_ledger`, owner; update: browser/service, owner  |
| `member_roles`         | `member_roles_org_guc`                                                                               | unchanged `app_ledger`; add the exact worker SELECT policy                    |
| `permission_rules`     | `permission_rules_org_guc`                                                                           | browser/service, `app_ledger`, exact owner                                    |
| `join_request`         | `join_request_admin_all`, `join_request_self_insert`, `join_request_self_select`                     | `anon`, `authenticated`, `service_role`, exact `relation_owner`               |

Here, browser/service means exactly `anon`, `authenticated`, and `service_role`. `app_ledger` is
listed only where it has the relevant table command in the frozen baseline. `app_assistant_ro` and
`brain_vector_worker` have schema usage but no table or column privilege on these relations, so they
remain unable to read them and are not named by a policy. The migration/current operator is a DDL
authority, not an invented runtime reader; data access is retained only through exact relation
ownership or an inventoried grant. A future grantee does not inherit former `PUBLIC` policy access:
adding it requires a reviewed ACL-and-policy migration.

The migration atomically retargets only the inventoried policies, without changing their command or
`USING`/`WITH CHECK` expression. It leaves the two already role-specific `app_ledger` policies
unchanged. It then adds exactly one named `AS PERMISSIVE FOR SELECT TO app_notification_worker`
policy to each source relation. Each worker policy contains the complete relation-specific predicate:
exact event organization; exact current member/role/rule rows where relevant; exact event-bound
request/applicant evidence; and either the complete live projection fence or exact revalidation
candidate fence. No source policy remains `TO PUBLIC`, no legacy policy applies to the projection
role through membership, and the projection role is not a member of a browser, service,
application, owner or migration role.

Keeping the `PUBLIC` policies and adding a restrictive worker policy is explicitly rejected. The
baseline `organization_members` policy reads `profiles`; the worker `profiles` predicate must read
`organization_members`; PostgreSQL expands both policies for the projection role and raises `42P17`
before a restrictive predicate can bound the result. SQL short-circuiting is not an authority
contract. A source-reading definer would add a fourth broad definer and bypass the reviewed
per-relation RLS surface, while a bypass role or caller-provided recipient list is forbidden.

Migration admission inventories table and column ACLs, relation owners, transitive `MEMBER`/`USAGE`/
`SET` closure, and `pg_policy.polpermissive`, command, roles and canonical expressions before any
mutation. `notification-slice5-v8-command-role-inventory.sql` is the executable enumeration: it
combines table and column privileges for each policy command, adds the exact relation owner, and
compares the result with the frozen role array instead of treating schema usage as data authority.
After migration it proves the exact retargeted role arrays, unchanged expressions, the six worker
policies, and that no policy applicable to `app_notification_worker` is unknown or broader.

The runtime admission fingerprint is the canonical ordered tuple of: source relation owner and RLS
flags; normalized table and column ACLs; exact policy name, command, permissiveness, role array and
canonical `USING`/`WITH CHECK`; both Slice5 role attributes; all direct and transitive membership
edges; the exact finalizer creator-edge mode described above; the three definer owners, signatures,
ACLs and fixed empty search paths; and the commit-guard trigger identity/definition. Worker build
admission recomputes and compares every field before acquiring a runtime lease. There is no
partial-field or digest-only fallback. Later `PUBLIC`, inherited, creator-edge, function, trigger or
ACL drift fails closed. Native parity tests exercise browser self and
admin branches, service-role access, exact app-ledger org-GUC and historical JWT branches,
relation-owner/migration access, and the existing denials for `app_assistant_ro` and
`brain_vector_worker`. Projection-role tests set both request-JWT settings to a real foreign/global
admin and still see only exact worker rows. Projection and revalidation setup also clear those
settings, but correctness does not rely on clearing them.

The finalizer role receives schema `USAGE` and `SELECT` only for the same scoped runtime,
organization and outbox columns already listed plus outbox state/terminal owner/terminal generation,
the receipt identity/claim owner/claim generation/finalized-at/count/byte-total/set-digest columns,
and candidate organization/event/projection-kind/recipient/digest/body-byte-count columns.
It cannot read template parameters, navigation, source evidence or another candidate field.
PostgreSQL also requires an update privilege to take a row lock, so it receives only
`UPDATE(generation)` on `notification_worker_runtime` and
`notification_org_control`; their existing transition triggers still reject every attempted write by
this non-coordinator role. It receives only `UPDATE(finalized_at)` on projection receipts, whose
guard permits exactly one function-owned null-to-database-time transition with every other field
unchanged. It receives only the terminal outbox update columns needed to clear the
lease and write `projected` or `quarantined`: `state`, `completed_at`, `quarantine_reason`,
`lease_owner`, `claimed_at`, `hard_deadline`, `lease_expires_at`, `renewal_count`,
`terminal_owner_id`, and `terminal_generation`. Exact RLS policies for the finalizer role expose the
same single runtime, organization and event tuple from transaction-local projection scope, plus that
event's receipt and candidates. Its outbox and receipt `FOR SELECT` policies have a second, complete
`projection_reconcile` branch that exposes only the exact historical operation fields used by the
fixed observer and a third `projection_commit_guard` branch that exposes only the current finalized
receipt and matching terminal outbox row identified by the deferred receipt trigger. Candidate and
control-table policies have neither reconciliation nor commit-guard branches. Mixing any mode's keys
with another mode returns no row. The commit-guard branch exists only for the definer trigger: an
application-set GUC cannot activate a policy for the ungranted finalizer role. No application role
receives control-row `UPDATE`, control-row `SELECT FOR UPDATE`, or membership in the finalizer role.

Because PostgreSQL applies `UPDATE` policies to `SELECT FOR UPDATE`, each control table has both an
exact `FOR SELECT` policy and an exact `FOR UPDATE` policy for the finalizer role. The control-row
`USING` clauses require the complete scoped live owner/generation/build tuple; their `WITH CHECK`
clauses retain the same immutable singleton/organization, owner and generation. The existing
coordinator-only transition triggers still reject even an in-scope no-op or value change by the
finalizer role. The outbox has an exact `FOR SELECT` policy plus one `FOR UPDATE` policy whose `USING`
clause requires the scoped live processing row and whose `WITH CHECK` permits only the same immutable
event/org/routing identity in the finite terminal state with cleared lease fields and terminal
owner/generation copied from that locked lease. The outbox
transition guard and fixed function validate the receipt/outcome and all unchanged columns. The
receipt has exact finalizer-role `FOR SELECT` and `FOR UPDATE` policies. Their projection branch
requires the exact scoped live processing claim, exact receipt owner/generation and null
`finalized_at`; `WITH CHECK` permits only the same row with `finalized_at` changed to the function's
captured database time. The receipt guard independently rejects every other field change. The
commit-guard `FOR SELECT` branches require `scope_mode='projection_commit_guard'`; the exact
organization/event/routing/projection and claim owner/generation derived internally from the
triggering receipt; a nonnull receipt `finalized_at`; and a terminal outbox whose
`terminal_owner_id`/`terminal_generation` equal that receipt. They expose no candidate or control
row. No other policy applies to the finalizer role through `PUBLIC`, inheritance or membership;
migration catalog admission proves the effective policy union before granting function execution.

The application does not set a subject GUC. The first projection statement binds the exact logically
claimed live outbox lease and joins its immutable event. Every source policy derives the permitted
subject from that same event/outbox identity and repeats the live runtime, organization and event
fence. It does not hold a SQL row lock across audience construction; the final CAS must be able to
observe a generation replacement that commits meanwhile. `organizations`
exposes only the event organization. Membership, role and rule rows require that organization.
`join_request` additionally requires its ID, organization and subject type to match the exact live
event. `profiles` exposes only an exact current-org member or the applicant bound through that exact
request/event. Supplying a different event ID, owner, generation, tuple or organization yields no
source rows. A caller-set `app.notification_subject_id` is neither created nor consulted.

The production projection transaction entrypoint accepts a captured `RuntimeLease`, `OrganizationLease`
and event lease receipt. It sets only their validated finite identity values as transaction-local
scope. It then executes the live scope fence and all source reads through the projection transaction
API; no unrestricted pool handle escapes to an adapter. Existing source tables are not described as
newly forced-RLS when they are not. Their projection policies are still effective because
`app_notification_worker` is neither owner nor bypass role. The new projection tables are enabled
and forced RLS.

The projection scope keys are the existing `app.current_org_id`, `app.notification_runtime_owner`,
`app.notification_runtime_generation`, `app.notification_org_generation`,
`app.notification_owner`, and `app.notification_generation`, plus
`app.notification_event_id`, `app.notification_build_sha`,
`app.notification_catalog_revision`, `app.notification_catalog_sha256`,
`app.notification_projector_revision`, and `app.notification_projector_sha256`. The entrypoint first
sets those keys plus `app.notification_candidate_id`,
`app.notification_recipient_profile_id`, and `app.notification_authority_sha256` to empty values,
sets `request.jwt.claim.sub=''` and `request.jwt.claims='{}'` locally and proves `auth.uid()` is null,
validates the complete runtime/organization/event tuple, and then sets
`app.notification_scope_mode='projection'` and the complete projection tuple in one setup statement.
Missing, extra, malformed, partially initialized or stale values make the fence false.

Revalidation is intentionally independent of an already-finished scheduler lease. Its separate
entrypoint accepts a validated frozen receipt of organization, candidate ID, recipient profile ID and
stored authority digest. It clears every projection key, locally clears both request-JWT settings to
the installed null-identity values, sets those four values with
`app.notification_scope_mode='revalidation'` in one setup statement, and then locks only the exact
matching ready candidate. Source policies derive event/subject identity by joining that candidate to
its immutable projected event and receipt. They do not require the old cleared runtime/event lease
and do not trust a subject GUC. Pool release tests prove every scope key is empty after commit,
rollback, timeout and cancellation.

Every projection-mode operational policy and every source relation's role-specific
`FOR SELECT TO app_notification_worker` policy includes the following exact shape; a fixed helper may
remove repetition only if its source is statically ratcheted and each caller still binds the
row-specific predicate:

| Relation                               | Required projection-mode `USING` predicate                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `notification_worker_runtime`          | singleton/schema 1, exact runtime owner/generation/build/catalog/projector identity, live expiry |
| `notification_org_control`             | exact org, `running`, exact owner/generation, live lease and hard deadline                       |
| `notification_outbox`                  | exact org/event/tuple, `processing`, exact event owner/generation, live lease                    |
| `notification_events`                  | exact org/event/tuple joined to that live outbox receipt                                         |
| `organizations`                        | exact event org and the complete runtime/org/event fence                                         |
| `organization_members`, `member_roles` | exact event org and the complete fence                                                           |
| `permission_rules`                     | exact event org, `module='users'`, and the complete fence                                        |
| `join_request`                         | exact event subject ID/type/org plus the complete fence                                          |
| `profiles`                             | exact-org member, or exact applicant of that event-bound request, plus the complete fence        |

In revalidation mode, candidate-table policy exposes only the exact ready row whose ID,
organization, recipient and authority digest equal scope. Event/receipt policies expose only its
immutable projected event. Source-table policies permit only that event organization and either its
exact current member or event-bound applicant evidence. Runtime and organization-control policies
return no rows in this mode. A source policy must satisfy exactly one complete mode branch; mixing a
candidate key with projection keys returns no rows.

The fence helper validates every UUID, bigint and digest string before casting, reads only the
listed operational columns, and returns false on missing/malformed scope. It is not a generic
`current_setting` equality shortcut. Native catalog checks require the exact operational policies, exact legacy-policy retarget role
arrays and one exact source policy per relation, with no `PUBLIC`, inherited, extra or broader policy
applicable to `app_notification_worker`. The worker's effective source rule is therefore exactly its
one complete row-and-fence policy, while browser/service/application policies retain their frozen
expressions for their exact roles. Operational-table policies inline their finite scope predicates;
only source-table worker policies may call the fence helper. The organization-members worker policy
does not read `profiles`; the profiles worker policy may read organization members, making the
source-policy dependency graph one-way and nonrecursive.

For event claim admission, `notification_worker` receives only the corresponding runtime and
organization fence columns and exact policies; the claim SQL must prove the captured live runtime
and organization lease before changing a pending/expired row to processing. It receives no source
or projection-table read. `NotificationProjector.projectPage` changes from
`(OrganizationLease, AbortSignal)` to `(RuntimeLease, OrganizationLease, AbortSignal)`, and every
claim/finalization path carries those exact generations. A narrow fixed-search-path fence helper may
centralize the repeated predicate, but it is `SECURITY INVOKER`, has no mutation authority, and is
executable only by the two worker roles.

Terminal publication uses a different fixed function,
`public.notification_finalize_audience(outcome text) returns boolean`. It is `VOLATILE SECURITY
DEFINER SET search_path=''`, owned by `notification_projection_finalizer`, contains no dynamic SQL,
table/column argument, caller-provided event ID, or generic mutation primitive, and is one of exactly
three definer functions in this slice. Apart from its inaccessible owner, all default, `PUBLIC`, ordinary
application, assistant, claim, coordinator and health execute grants are revoked; only
`app_notification_worker` receives `EXECUTE`. PostgreSQL's execute check is the caller-role boundary.
The function additionally requires a complete
`scope_mode='projection'` tuple, validates every scoped scalar before any cast, and returns the same
false result for missing, foreign or stale scoped rows. Before locking, it rejects a null,
noncanonical-case or greater-than-32-byte outcome. The `outcome` allowlist is exactly `projected` plus
the six Slice5 quarantine reasons. No error or return value discloses which scoped row was absent.

Inside that function, row locks are always acquired in this order: the singleton
`notification_worker_runtime`, the exact `notification_org_control` row, then the exact
`notification_outbox` row. Each lock binds the transaction-local owner/generation and immutable
build/catalog/projector or event tuple. After all three locks are held, one fresh
`clock_timestamp()` check requires every lease and hard deadline to remain valid beyond that instant
by the complete reserved three-second finalizer window, then the function recomputes
the exact receipt/candidate count, byte total and sorted digest. `projected` requires the one exact
matching receipt; a Slice5 quarantine requires zero receipts and candidates. The terminal update and
lease-field clearing happen inside the function. For `projected`, only after the candidate-set
comparison succeeds, the function sets the exact receipt's `finalized_at` from the same captured
database timestamp and then transitions the outbox with matching terminal owner/generation. For a
quarantine it writes no receipt marker and captures terminal owner/generation only on the outbox.
The locks remain held by the surrounding
transaction through commit. The transaction callback executes no later statement or application
await after a true result; it returns immediately so PostgreSQL commits. On false, the caller throws
the finite retryable failure synchronously before returning from the callback, so the transaction
rolls back. A timeout/error also aborts it. The updated outbox guard accepts the projected/quarantine
transition by `notification_projection_finalizer` only; direct
`app_notification_worker` terminal updates remain forbidden.

The fixed function contains exactly three row-lock `SELECT` commands, one bounded
receipt/candidate aggregate-verification command, one projected-only receipt-finalization `UPDATE`,
and one terminal outbox `UPDATE`; it has no data-driven loop. A projected result uses six internal
commands plus the outer function-call statement. Its deferred guard adds one fixed scope-setup
command and one relational attestation, consuming nine of the 16-operation projector budget. A
quarantine inserts no receipt, skips both the receipt update and deferred guard, and consumes six.
Plan and statement-count receipts report the applicable classes without tenant identifiers or
candidate bytes.

Ambiguous finalizer or transaction completion uses the second fixed function,
`public.notification_observe_audience() returns text`. It is `VOLATILE SECURITY DEFINER SET
search_path=''`, owned by the same inaccessible finalizer role, has no argument, dynamic SQL, lock,
mutation, payload read, generic identifier, or runtime/organization-control dependency. Only
`app_notification_worker` receives `EXECUTE`; every default, `PUBLIC`, ordinary application,
assistant, claim, coordinator and health grant is revoked. A fresh bounded application transaction
clears every scope key and both request-JWT settings, then sets
`scope_mode='projection_reconcile'` plus the validated exact organization, event, routing tuple,
projection kind, event-lease owner and generation. Exact observer-mode policies expose to the
function owner only that outbox row's terminal operation identity and its minimal finalized receipt
fields. Observer mode has no candidate-row visibility, the fixed observer contains no candidate
table reference, and it deliberately does not recompute the current candidate set: authorized
cancellation or profile `ON DELETE CASCADE` may change that set
after finalization without changing what committed. It exposes no event payload, candidate body,
navigation, recipient source evidence, runtime row or organization-control row.

The observer executes one bounded relational statement and returns exactly one of these lower-case
states:

| State                        | Exact database observation                                                                                                                                                                                       | Projector action                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `committed`                  | terminal `projected` with terminal owner/generation equal scope, plus one `finalized_at` receipt whose org/event/routing/projection and stored claim owner/generation equal that terminal identity               | Return the already committed projected result; never insert or finalize again.                      |
| `same_generation_processing` | exact routing row remains `processing` under the same live owner/generation and no finalized receipt exists                                                                                                      | Treat completion as unresolved; do not replay. Only a later scheduler reclaim after expiry may act. |
| `superseded`                 | the row exists but its live or terminal owner/generation no longer identifies this operation, including a newer-generation quarantine                                                                            | Stop this operation; do not touch the newer claim or replay.                                        |
| `quarantined`                | terminal `quarantined` with terminal owner/generation equal scope and no finalized projection receipt                                                                                                            | Return the already committed terminal result; never replay.                                         |
| `terminal_unattributed`      | a historical terminal row has null terminal owner/generation                                                                                                                                                     | Report a conservative historical terminal with no claim that this operation completed.              |
| `pending`                    | the exact immutable routing row is still pending                                                                                                                                                                 | Report the unexpected no-claim observation; do not dispatch or claim from this observer.            |
| `absent`                     | no exact organization/event/routing row is visible                                                                                                                                                               | Report unavailable/invariant state without revealing a different row; never replay.                 |
| `integrity_failed`           | exact-attributed projected row lacks its exact finalized receipt, a nonprojected row has a finalized receipt, terminal identity is partial/inconsistent, generation regresses, or another impossible combination | Report a finite invariant failure and retain evidence; never repair or replay here.                 |

A SQL timeout, pool/transport failure, malformed function result or inability to enter the exact
role/scope is returned by the TypeScript wrapper as `unavailable`; it is not converted to one of the
database states. Observation has a five-second monotonic wall budget, at most three SQL statements
(role/scope setup, function call, transaction completion), a three-second statement timeout and the
same 250-millisecond lock timeout even though the function takes no row lock. It has no automatic
transaction retry and no application await between a returned state and transaction completion.
`committed` and `quarantined` are the only states that let the current projector report a completed
terminal event. Every other state produces a finite failed/unavailable organization result and no
same-invocation event action. The status call remains available after the seven-day dispatch grant
window because it observes stored Hub evidence and creates no provider effect.

An exact-org policy is necessary but not sufficient. Every adapter query still binds event subject,
recipient, status, and source revision. Direct cross-org IDs return the same finite invalid-subject
outcome as a missing subject and never disclose which condition failed.

### 3. Durable projection receipt and candidates

Add `notification_projection_receipts` with one durable insert-then-finalize row per
`(organization_id,event_id,projection_kind)`:

- exact event/catalog/kind/schema and adapter revision;
- `projection_kind='inbox.v1'` for this slice;
- the exact event-lease owner UUID and generation that created the receipt;
- candidate count `0..10000`;
- summed canonical body bytes `0..81920000`;
- canonical projection SHA-256 over sorted candidate digests, including the empty set;
- nullable database `finalized_at`, initially null and set exactly once by the fixed finalizer after
  it verifies the actual candidate set.

The canonical projection input is the UTF-8 encoding of a canonical JSON array of lower-case
candidate SHA-256 strings, ordered by `(recipient_profile_id::text COLLATE "C",candidate_sha256
COLLATE "C")`; the empty set is exactly `[]`. The final database transition recomputes this digest,
the candidate count, and `coalesce(sum(body_byte_count),0)` from the actual candidate rows. It requires exactly
one receipt whose immutable values match those results. A service-supplied count, byte total, or
digest is never authoritative on its own. The finalizer also requires the receipt's claim owner and
generation to equal the still-locked processing outbox row and transaction scope. Those two fields
make a later terminal observation about the exact operation rather than only the event ID. The
receipt guard rejects a nonnull application-supplied `finalized_at`; afterward it permits only
`notification_projection_finalizer` to change null to the finalizer's one captured
`clock_timestamp()`, while every other receipt field remains byte-for-byte immutable. A forged
pre-finalized receipt or second timestamp change fails at the database boundary.

One exact constraint trigger closes the commit path. The migration creates
`notification_projection_receipt_commit_guard` as `AFTER INSERT ON
notification_projection_receipts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW`. There is no candidate
constraint trigger and no receipt-update constraint trigger. Every candidate has the exact
organization/event/projection foreign key to the one inserted receipt, and its insert policy and
guard require that receipt to remain unfinalized under the same live claim. Therefore a candidate
cannot be appended to a historical finalized receipt, while a zero-candidate projection still queues
one guard invocation.

The trigger invokes `public.notification_projection_commit_guard() returns trigger`, the third and
last Slice5 definer function. It is `VOLATILE SECURITY DEFINER SET search_path=''`, owned by
`notification_projection_finalizer`, accepts no function or trigger argument, contains no dynamic
SQL or generic identifier, and rejects any invocation whose `TG_RELID`, `TG_OP`, trigger name or
argument count differs from that exact receipt `INSERT` trigger. All default, `PUBLIC`, application,
assistant, worker, coordinator and health `EXECUTE` grants are revoked. Only the migration owner can
install the trigger; runtime invocation occurs through that installed trigger, never through an
application-callable entrypoint.

At deferred execution, the trigger's caller has reverted to `app_notification_worker`; the function
does not rely on that caller's visibility or GUC authority. Under its inaccessible owner, it clears
the other scope modes and uses one fixed statement to derive `projection_commit_guard` scope from
the immutable identity, routing, projection, claim-owner and claim-generation fields in the
triggering receipt. `NEW.finalized_at` is deliberately ignored because a deferred `INSERT` trigger
retains the original null value. A second bounded relational statement reselects the current receipt
and terminal outbox through the exact commit-guard RLS branches. It requires every immutable current
receipt field to equal the triggering row, current `finalized_at` to be nonnull, terminal state to be
`projected`, exact terminal owner/generation to equal the receipt claim, and the database clock to
remain within the finalizer's reserved three-second window from that database-owned timestamp. It
reads no candidate, source, runtime or organization row. The finalizer already recomputed the full
candidate count, bytes and digest before it alone set `finalized_at`; the commit guard attests that
the resulting receipt and terminal outbox still form the same operation.

A missing finalizer, missing/changed trigger or function, absent final-state policy branch,
unfinalized/forged receipt, mismatched terminal identity, timeout or thrown guard aborts the entire
transaction at `COMMIT`. The runtime, organization and outbox locks acquired by the finalizer remain
held through this check. The trigger does not reject a later authorized candidate cancellation or
profile-cascade deletion after commit; both leave the immutable finalized receipt and terminal
outbox intact.

The event foreign key includes organization and immutable routing identity. The receipt is minimal
audit and idempotency evidence; it stores no body, recipient email, role list, applicant message, or
raw source object. It is immutable and cannot be deleted before the later retention slice.

Add `notification_audience_candidates` with:

- UUID identity plus organization/event/projection-kind foreign identity;
- exact recipient `profiles.id`, with `ON DELETE CASCADE` as the explicit account-erasure path;
- `audience_mode` from `users_manage` or `join_applicant`;
- adapter revision and immutable authority-snapshot SHA-256;
- finite localization template key plus immutable template revision/digest and canonical JSON
  parameters stored as bounded canonical text;
- canonical body SHA-256, body byte count, and candidate SHA-256;
- finite server navigation ID, never a URL from an event;
- `ready` or `cancelled` state, creation time, and nullable cancellation time/reason.

The uniqueness key is `(organization_id,event_id,recipient_profile_id,projection_kind)`. If the
applicant also currently has `users:manage`, `join_applicant` wins and exactly one candidate is
stored. Role order, query order, or retry timing cannot change that choice.

`candidate_sha256` is not an opaque application assertion. A fixed immutable SQL canonicalizer
hashes a versioned JSON array containing organization, event, projection kind, recipient, audience
mode, adapter revision, authority digest, template key/revision/digest, exact canonical parameter
text, navigation ID, body digest and body-byte count. Its trigger rejects a supplied mismatch. The
final projection-set digest is computed from these database-verified candidate digests. The
canonicalizer has a fixed empty search path, no table access, no public/default execute grant, and a
native application/SQL differential corpus covering Unicode and JSON escaping.

A ready candidate has complete template/body/navigation values. A cancellation can only transition
`ready -> cancelled`, sets a finite reason and database time, and atomically erases the template key,
parameters, and navigation ID. It retains event, recipient, mode, authority digest, body digest, and
candidate digest as bounded audit identity. Cancelled rows cannot return to ready; restored authority
requires a new event. Other updates and deletes fail at the database boundary, except the declared
profile `ON DELETE CASCADE`; the body-free projection receipt remains as minimal audit evidence after
account erasure.

Cancellation reasons are exactly `membership_revoked`, `capability_revoked`, `subject_changed`,
`field_scope_changed`, `organization_inactive`, and `authority_changed`. `authority_changed` covers
a canonical role/rule/effective-policy authority digest change when the recipient still has the named
capability and no narrower reason applies. The codes are internal and finite, never evidence
returned to an unauthorized caller. Profile erasure is not a cancellation: the declared foreign-key
`ON DELETE CASCADE` removes the candidate row and leaves the body-free receipt. Request/source
deletion uses `subject_changed` while the recipient profile still exists.

The outbox transition trigger/finalizer has two exclusive terminal authorities after Slice5. A live
`notification_worker` receipt may renew or apply only the three Slice3 integrity quarantines; it
cannot write `projected`, even when every lease field is valid. `app_notification_worker` cannot
directly write either Slice5 terminal state. Its sole terminal path is the fixed finalizer above,
whose role may write `projected` only after the exact receipt/set recomputation succeeds and may
write one of the six Slice5 quarantines only when there are zero projection receipts and zero
candidates for that event. Both authorities verify the live runtime, organization and event
generations at `clock_timestamp()`, and the Slice5 path additionally serializes all three through
final-publication row locks. The transition trigger captures the old lease owner/generation into the
terminal identity for either authority before clearing live lease fields. Direct updates, a forged
receipt, a receipt with wrong
count/bytes/digest, a nonempty quarantined set, and an otherwise valid claim-role projection all fail
at the database boundary.

Per-recipient canonical body bytes are at most 8,192. The version-1 join templates carry no source
text and use empty parameters:

| Kind / recipient          | Template key                 | Navigation ID          |
| ------------------------- | ---------------------------- | ---------------------- |
| `join.requested` manager  | `join.requested.manager.v1`  | `join.review`          |
| `join.approved` applicant | `join.approved.applicant.v1` | `join.status.approved` |
| `join.approved` manager   | `join.approved.manager.v1`   | `join.review`          |
| `join.denied` applicant   | `join.denied.applicant.v1`   | `join.status.denied`   |
| `join.denied` manager     | `join.denied.manager.v1`     | `join.review`          |

The server navigation registry maps `join.review` to `/users/join-requests`,
`join.status.approved` to `/join/sent`, and `join.status.denied` to `/join`. It accepts no raw path,
scheme, host, fragment, traversal segment, or event-supplied query. Future route parameters need a
new reviewed descriptor schema; string interpolation is not implied.

Templates render escaped text only. There is no HTML field, raw title/body, applicant email/name,
request message, reason, role, organization name, or arbitrary parameter in the version-1 join
descriptor. A later UI must not use `{@html}` with this data. The same safe descriptor is inserted
separately for each recipient; there is no shared broad body row whose visibility is inferred later.

The generated projection manifest includes the exact canonical UTF-8 bytes and SHA-256 of every
versioned template definition. A `.v1` template is immutable in every locale. Copy or localization
changes require a new template key, adapter revision, and manifest digest; they cannot silently
change an already-persisted candidate. Body-byte admission and `body_sha256` cover the canonical
template descriptor and parameters that the later inbox renders, not a mutable lookup by key alone.
This descriptor is the approved platform contract's authenticated payload reference. Its byte count
and every supported locale's rendered safe title/summary must each be at most 8,192 UTF-8 bytes; the
stored `body_byte_count` is their maximum. A later inbox may render only when its generated template
entry has the exact stored digest. A missing or changed digest is typed unavailable and exposes no
fallback body.

### 4. Exact join subject contract

The source adapter accepts a row only when all applicable facts agree:

- `event.subject_type='join_request'`;
- event subject ID and payload `requestId` equal `join_request.id`;
- request `organization_id` is the canonical lower-case text form of the event organization;
- payload `applicantProfileId`, `join_request.supabase_id`, and UUID-parsed
  `join_request.user_id` are the same canonical profile UUID;
- that profile exists;
- the organization exists and is active;
- the current request status matches the event kind;
- requested: subject revision equals `pending:` plus `created_at` normalized to canonical UTC
  millisecond ISO;
- approved/denied: payload `decidedAt` equals `reviewed_at` normalized to canonical UTC millisecond
  ISO, and subject revision equals `<status>:` plus that same instant.

A non-UUID or divergent historical `user_id`, mismatched applicant field, null decision time, changed
status/revision, inactive organization, absent row/profile, or cross-org ID is one sanitized invalid
subject. The projector does not guess an old identity, select another request, or grant membership.

`join.requested` snapshots current members with effective `users:manage`; it never creates an
applicant candidate. `join.approved` and `join.denied` first admit the exact applicant through the
narrow source-bound exception, then union current `users:manage` members.

Manager resolution preserves the current RBAC semantics:

1. candidate membership must be in the exact active organization;
2. `profiles.role='admin'` bypass applies only after that exact membership is present;
3. explicit `member_roles` replace the legacy membership fallback;
4. a current `permission_rules` row overrides code defaults for the exact role and `users` module;
5. absent rules use the same `defaultCaps` result; custom/unknown roles default deny;
6. role assignment and override order cannot change the result.

`users` is not an owner-scopable or field-scopable module in the current RBAC evaluator. Candidate
eligibility is therefore exactly `buildCapabilities(...).can('users','manage')`; `if_owner` cannot
turn a nonmanager into an applicant/request owner, and `field_level` cannot authorize source fields.
The exact configured `users` rule values are still bounded digest evidence, so changing an otherwise
still-manager rule is detected as `authority_changed` rather than silently retaining an old policy
snapshot.

Do not copy a second hand-maintained role matrix. A small shared policy projection or generated
allowlist consumes the existing RBAC default evaluator, and a differential test compares every
built-in role, custom role, override, explicit-vs-legacy assignment, and profile-admin case with
`buildCapabilities`. Candidate SQL begins from roles that can grant `users:manage`, then joins exact
members; it does not scan every viewer and filter 100,000 rows in JavaScript. The migration adds or
adopts only exact reviewed indexes for `member_roles(org_id,role_key,profile_id)`,
`permission_rules(org_id,module,role_key)` including the effective policy columns,
`organization_members(organization_id,role,profile_id)`, the profile-admin membership seek, and
`join_request(organization_id,id,status)` including only the subject-validation columns. Every
index has an exact catalog classifier and plan gate; an unknown lookalike is not adopted.

The authority bundle rejects before candidate insertion when any of these limits is exceeded:

- 256 distinct role keys referenced by the organization bundle;
- 256 `users` permission-rule rows;
- 32 explicit role assignments for one recipient;
- 100,000 membership-role assignment rows before recipient deduplication;
- 256 distinct effective authority-equivalence groups;
- 64 KiB canonical evidence in one equivalence group or 16 MiB across the event bundle.

Role keys are at most 128 UTF-8 bytes. Counts use limit-plus-one or aggregate counters inside the
same materialized statement; no unbounded array/JSON aggregate is built first. An overflow is a
finite `audience_authority_overflow` quarantine with zero receipt/candidates. Equivalence-group
reuse is allowed only for byte-identical canonical role/rule/profile-admin evidence; recipient,
membership and applicant evidence remain recipient-specific. This bounds repeated hashing without
assuming two recipients have the same authority.

The resolver returns at most 10,001 distinct recipient UUIDs in canonical order. Exactly 10,000 is
admitted. 10,001 produces `audience_overflow`, inserts no candidate/receipt, and atomically
quarantines the event. The cap is after applicant/manager union and deduplication. No page of a
larger audience may commit.

### 5. Authority snapshot and continuing authorization

Each candidate authority digest canonically binds:

- event organization, ID, kind, schema, subject, subject revision, and adapter revision;
- recipient profile and audience mode;
- active-organization evidence;
- for a manager: exact membership, effective assigned roles, relevant `users` rule rows, profile
  admin state, and effective field mask;
- for an applicant: exact request/profile/organization/status/decision evidence;
- selected immutable template key/revision/digest and navigation ID.

It does not persist raw rule rows or role names. Canonical sorting makes semantically identical input
produce the same digest.

Projection uses PostgreSQL `READ COMMITTED`. Exactly one bounded authority-bundle statement uses
`WITH ... AS MATERIALIZED` relations to read the exact claimed event and obtain the complete immutable
input for organization status, request subject, applicant, member profiles, explicit or legacy
roles, relevant `users` rules, effective policy groups, recipients, template, navigation, all limit
counters, and every authority-digest field. No later source query may supplement that bundle. Each
materialized relation has an explicit column list and bound; it does not use `SELECT *`, a recursive
query, a caller-provided relation/table name, or an unbounded JSON aggregate. Candidate construction
and hashing consume only this returned bundle.

That one SQL statement has one coherent `READ COMMITTED` statement snapshot. A membership, role,
rule, request or organization mutation that commits between what would otherwise have been separate
subqueries therefore cannot produce hybrid authority. The transaction is not automatically
replayed: a timeout, lock failure, database failure, or any other transient failure rolls back and
returns the existing finite retryable worker outcome. The distinct final transition statement gets
a new `READ COMMITTED` snapshot, calls the fixed finalizer, and serializes the fresh operational
checks and persisted candidate/receipt verification under runtime, organization and outbox locks.
Snapshot freshness without those locks is not treated as a fence.

Provide a server-only `revalidateNotificationCandidate` boundary for later inbox/effect slices. In
one bounded exact-org `READ COMMITTED` transaction it first locks the exact ready candidate. It then
runs exactly one bounded materialized authority-bundle statement for that recipient, source,
membership, capability, subject, field mask, template and all digest inputs. It constructs and
compares only that bundle. A separate final CAS statement gets a fresh statement snapshot and
requires the same candidate identity, recipient, `ready` state, old authority digest, immutable body
digest, and immutable event/receipt identity before it returns a descriptor or writes one finite
cancellation. It does not require the historical scheduler lease after projection. A stale
revalidation cannot cancel, return, or rewrite a replaced/erased row.

If all facts still match, it returns the immutable safe descriptor. If current authority or source
is definitively gone, it cancels and erases the candidate payload before returning no descriptor.
If capability remains granted but the canonical evidence digest changed, it cancels with
`authority_changed`. If the profile has been erased, the candidate is absent through its foreign-key
cascade and the receipt remains; no cancellation row or invented `recipient_removed` code is
written. If a read is unavailable, any authority/evidence bound is exceeded, or the budget expires,
it returns `notification_revalidation_unavailable`, leaves an extant row ready, and publishes
nothing.

Revalidation starts a 10-second monotonic wall budget, executes at most eight SQL statements,
reserves the materialized authority query and final CAS before auxiliary reads, sets each statement
timeout to at most the smaller of three seconds and the remaining budget, uses a 250-millisecond
lock timeout and a five-second idle-in-transaction timeout, and starts no HTTP/provider/cache/file
work. Exhaustion is unavailable, never evidence of revocation.

The future user-read caller must additionally supply the authenticated canonical profile and match
the recipient exactly. The internal API does not create an administrator bypass for another user's
private row. That browser/RLS wiring remains Slice11, but the exact-recipient negative is executable
now.

Concurrency has two honest winner orders. If revocation commits before the authority query, the
recipient is excluded. If projection's one-statement authority snapshot wins and revocation commits afterward,
the immutable candidate may exist, but the mandatory revalidation cancels it before any later read
or effect. This slice publishes nothing, so it cannot leak between those points. It does not claim a
PostgreSQL snapshot can undo a later committed revocation.

The later inbox/effect caller must consume the revalidated descriptor inside the same bounded
authority transaction or define its final external-admission boundary explicitly. If that authority
snapshot wins before a concurrent revocation commits, the already-admitted response/effect cannot
be recalled; the revocation suppresses every subsequent admission. No implementation may promise
that a later commit retroactively erases bytes or a provider effect already admitted under the
earlier authoritative snapshot.

A later promotion never adds a recipient to an old receipt. A later membership/capability regain
never reactivates a cancelled candidate. A new qualifying event is required.

### 6. One-event projection transaction

The production projector performs this sequence for one event per organization lease:

1. receive the exact captured runtime lease and organization lease from Slice4, then claim at
   most one exact supported tuple under `notification_worker`; the claim statement changes a row
   only when fresh database reads prove the exact live runtime build/catalog/projector generation
   and exact live organization owner/generation;
2. renew that event once to its 60-second hard deadline; reconcile an ambiguous renewal by exact
   owner/generation read instead of assuming failure or consuming a second renewal, and start no
   projection transaction unless at least 45 seconds remain on both the event and organization hard
   deadlines;
3. start one `READ COMMITTED` `app_notification_worker` transaction scope with the exact runtime,
   organization and event identities/generations; there is no subject GUC;
4. execute the one bounded materialized authority-bundle statement: it binds the exact live outbox lease,
   verifies processing state, tuple, live runtime/organization/event fences, event integrity,
   adapter manifest and remaining hard deadlines, then returns all subject/authority/cap/digest
   inputs in the same statement snapshot without locking runtime or organization rows;
5. derive at most 10,001 exact recipients from that immutable bundle, produce strict per-recipient
   descriptors, and validate every byte/digest before the first insert;
6. insert the one unfinalized projection receipt first with the already computed canonical candidate
   count, byte total and set digest, then bulk-insert all candidate rows. Each candidate therefore
   resolves its foreign key and live-unfinalized receipt guard. Those service-computed receipt values
   remain assertions only; the finalizer recomputes the actual persisted set before publication;
7. with at least the reserved three finalizer seconds still available, set the statement timeout to
   the smaller of three seconds and the remaining wall budget, retain the 250-millisecond lock
   timeout, and call `notification_finalize_audience('projected')`;
8. the finalizer locks runtime, organization, then outbox, performs the fresh post-lock fence and
   database receipt/candidate recomputation, transitions the row, and returns true. The transaction
   callback then returns immediately so the same transaction commits while all three locks remain
   held. False or a definitely rolled-back timeout/error leaves no candidate or receipt.
9. during that immediate commit, the one deferred receipt trigger executes under its fixed definer,
   derives exact guard scope from the inserted receipt, reselects the current finalized receipt and
   attributed terminal outbox, and aborts commit on mismatch or budget expiry. No candidate trigger
   runs, including for the 10,000-recipient boundary.
10. if the finalizer call or transaction completion is ambiguous, enter one fresh bounded
    `projection_reconcile` transaction and call the fixed observer. Only `committed` or `quarantined`
    is accepted as a completed terminal event. Every other finite state or unavailable read returns
    without re-entering the projection transaction, inserting candidates, or calling the finalizer.

Neither the authority-bundle query nor candidate insertion takes `FOR UPDATE`/`FOR SHARE` on the
runtime singleton, organization-control row, or event outbox row. Slice4 heartbeat, organization
renewal and an expired-event reclaim must be able to commit while projection uses up to 40 seconds.
Only the bounded finalizer locks those rows, in the same runtime -> organization -> outbox order used
by coordinator transitions. A runtime retirement/replacement, organization release/replacement, or
event reclaim that acquires the relevant row lock and commits first changes or clears scoped
authority and makes the finalizer return false. A valid same-owner, same-generation runtime
heartbeat or organization/event renewal that commits first preserves scoped identity; the finalizer
observes the refreshed deadline after acquiring the row and may proceed only if every post-lock
deadline still covers the complete reserved finalizer window. If the finalizer obtains the relevant
row lock first, the competing transition waits until projection commits or rolls back. After the
third lock is acquired,
the finalizer evaluates all expiries and hard deadlines against one fresh `clock_timestamp()`, so
time spent waiting for a later lock cannot validate an already expired earlier row. An
expired/replaced runtime, expired/replaced organization lease, replaced event generation, changed
build/catalog/projector identity, or exhausted hard deadline aborts the whole projection transaction.
No code path acquires these three locks in another order.

Projection-row policies and triggers independently require the exact live runtime,
organization-control and event lease identities named by the transaction scope. The outbox
transition guard permits the inaccessible finalizer role only for the function-owned live
`processing -> projected` or finite Slice5 quarantine transition; `app_notification_worker` cannot
perform that update directly, and neither role can claim, renew, reclaim, delete, or mutate routing
identity. `notification_worker` cannot insert/read projection rows and cannot transition a row to
projected. The migration updates every Slice3/Slice4 native fixture and direct-settlement test to
this split; no legacy test role keeps projected authority.

If any insertion, receipt, or final settlement fails, the entire transaction rolls back. No partial
audience exists. A crash before commit leaves no candidate or receipt; a crash after commit leaves
the canonical receipt and terminal outbox. An ambiguous finalizer/commit response enters the fixed
terminal observer exactly once. It accepts an exact receipt-backed `committed` observation for an
empty or nonempty audience, or an exact-attributed `quarantined` terminal observation with no
finalized receipt, and otherwise returns the finite no-replay state described above. It never rereads
mutable candidate rows, reruns a source event or inserts a second audience.

An empty eligible audience inserts a zero-count receipt and projects the event. Promotion afterward
does not expand it. An unsupported tuple is not claimed. A transient SQL/lock/timeout error rolls
back and leaves the event reclaimable. Slice5 adds exactly `audience_overflow`, `subject_invalid`,
`audience_authority_overflow`, `body_invalid`, `body_overflow`, and `navigation_invalid` to the
existing finite quarantine vocabulary. `app_notification_worker` can use only those six; the
existing integrity role retains its three existing reasons. Every Slice5 quarantine is guarded by
an actual zero receipt/candidate count. No quarantine code contains IDs, source values, SQL, or raw
errors.

The projector transaction starts a 40-second monotonic budget before the lease read, executes at
most 16 SQL statements, sets each non-finalizer statement timeout to at most the smaller of 10
seconds and the remaining budget, uses a 250-millisecond lock timeout and a 15-second
idle-in-transaction timeout, and reserves the authority-bundle, receipt insert and finalizer
statements before materializing recipients. Exactly three seconds of the wall budget are reserved
for the finalizer: pre-finalizer work stops at 37 seconds and rolls back if less than three seconds
remain. The finalizer's statement timeout is at most three seconds and never exceeds the remaining
budget. It makes no HTTP, Gateway, provider, cache, or filesystem call. No detached promise survives
return. There is no automatic transaction replay after an ambiguous or transient failure; the exact
terminal observation decides only whether the prior operation committed. A retained exact
`same_generation_processing` row can later be reclaimed through the normal scheduler after lease
expiry, but the current projector invocation never performs that replay.

Slice4 organization completion is `completed` after one projected or quarantined supported event,
which makes the organization immediately eligible for a later fair page. It is `empty` only when no
supported row is eligible and `unsupported` when unsupported pending work is observed. Busy claims
and unavailability are not success.

### 7. Privacy adapters and aggregate boundary

Every production adapter owns these finite functions: subject validation, recipient resolution,
authority snapshot, privacy projection, strict template descriptor, server navigation, and current
revalidation. Registering only an audience query is invalid.

The generic interface receives a transaction-bound exact-org source capability, not an unrestricted
database/pool handle. It returns candidate descriptors, not SQL or mutable source records. A
test-only field-policy adapter proves that a lower field mask cannot appear in canonical body bytes,
that a mask change invalidates the authority digest, and that an unsafe extra field fails strict
descriptor admission. Its tuple is absent from the production manifest and from health support.

No aggregate, scalar, ranking, chart, join across business data, or brain-assisted summary adapter is
admitted in Slice5. Such an adapter must execute under owner-intersection-recipient row, field,
subject, and brain-source authority before aggregation, or under a proven identical
authority-equivalence group. A broad result cannot be masked afterward. This rule is a registration
gate, not a TODO hidden behind the join implementation.

### 8. Query and storage bounds

Hard Slice5 limits are:

| Resource                                                   |                         Limit | Overflow/failure                        |
| ---------------------------------------------------------- | ----------------------------: | --------------------------------------- |
| Production support tuples                                  |                            32 | worker admission fails before a lease   |
| Event claims per organization invocation                   |                             1 | later fair scheduler pass               |
| Candidate recipients per event                             |               10,000 distinct | `audience_overflow`, no partial rows    |
| Distinct role keys / `users` rule rows                     |                     256 / 256 | authority overflow, no partial rows     |
| Explicit roles per recipient / assignment rows             |                  32 / 100,000 | authority overflow, no partial rows     |
| Authority groups / one group / event bundle                |         256 / 64 KiB / 16 MiB | authority overflow, no partial rows     |
| Canonical safe body per recipient                          |             8,192 UTF-8 bytes | `body_overflow`, no partial rows        |
| Template key / adapter revision / navigation ID            |      96 / 64 / 64 UTF-8 bytes | reject manifest or projection           |
| Navigation parameters                                      |   1,024 canonical UTF-8 bytes | reject projection; none used by join v1 |
| Projection logical SQL operations / wall budget            |               16 / 40 seconds | rollback, typed retryable failure       |
| One SQL statement / lock / idle-in-transaction             |             10s / 250ms / 15s | rollback, typed retryable failure       |
| Reserved finalizer through commit guard / statement / lock |       3s total / <=3s / 250ms | rollback, typed retryable failure       |
| Revalidation SQL statements / wall budget                  |                8 / 10 seconds | unavailable, candidate unchanged        |
| Revalidation statement / lock / idle timeout               |               3s / 250ms / 5s | unavailable, candidate unchanged        |
| Unsupported tuple probes                                   | support count + 1, maximum 33 | typed health unavailable on error       |

Body admission counts canonical encoded bytes before insertion. It does not truncate Unicode or a
security-relevant value. The SQL constraints repeat the per-row limit; the receipt's total body
bytes must equal the sum for the exact inserted set and cannot exceed 81,920,000.

A native 100,000-row outbox fixture, including live and expired processing rows, proves supported
pending claim, expired-processing claim, discovery and unsupported complement seeks use the
intended indexes with bounded rows/loops/buffers and no global sort or sequential scan. Removing
each routing/claim index must fail a named plan gate. A separate
10,001-member authority fixture proves indexed role-first recipient resolution; it does not claim a
local p99.

### 9. Concrete source ownership

Implementation should keep these responsibilities separate:

- `src/lib/notifications/projection-manifest.ts`: public exact support tuple/template types,
  canonical manifest, immutable template bytes/digests and drift checks;
- `src/server/services/notifications/projection/contracts.ts`: internal finite descriptor/outcome
  types and limits;
- `projection/authority.ts`: transaction-bound role/applicant authority and digest input;
- `projection/join-adapter.ts`: the three join subject/privacy/template decisions;
- `projection/navigation.ts`: finite ID-to-relative-route resolver;
- `projection/fence.ts`: exact runtime/organization/event scope, fixed claim predicates and the
  scope-only-identity finalizer caller, with no subject GUC;
- `projection/transaction.ts`: `READ COMMITTED` role/scope setup, the one materialized authority
  bundle, atomic receipt/candidate insertion, reserved finalizer budget and immediate commit return;
- `projection/projector.ts`: one-event claim/renew/reconcile and Slice4 callback;
- `projection/reconcile.ts`: bounded exact-operation terminal observer wrapper and finite no-replay
  outcome mapping;
- `projection/revalidate.ts`: current-source/authority recheck and irreversible cancellation;
- one additive migration and cohesive native fixture helpers under
  `tests/fixtures/notification-audience/`.

Modify the existing claim, discovery, admission, health, and projector contracts only for exact
tuple support and the production adapter. Do not duplicate Slice3 canonical parsing, Slice4 lease
state, RBAC default logic, or disposable PostgreSQL safety helpers. No new production or native test
file should become a mixed-responsibility god file; split a file before it exceeds roughly 600 lines.

## DELTA and verification

1. **Migration and adoption.** Fresh and exact Slice3/Slice4 child databases apply the real migration
   runner; routing columns backfill exactly and rerun reports zero pending. Orphan/mismatched rows,
   extra constraints/triggers/policies, unsafe pre-existing roles, grants, membership closure, table
   ownership, or RLS drift fail transactionally. The exact existing policy expressions and commands
   are retained while `PUBLIC` is atomically retargeted to each relation's exact effective role set;
   each source table gains one complete role-specific worker policy. Missing/extra policy roles,
   changed expressions, unexpected ACL/member closure, a new `PUBLIC` policy or any unknown policy
   applicable to the worker fails before mutation or runtime lease acquisition. Existing terminal
   outbox rows retain null/null operation
   attribution; every new projected/quarantined transition captures exact owner/generation and a
   partial, forged or mutable attribution fails. Catalog adoption requires the exact receipt
   constraint-trigger definition, trigger-function owner/body/search path, three-function owner
   inventory and commit-guard policy branches; an extra candidate trigger or missing/changed guard
   fails before role/grant creation. Fixture cleanup proves zero child databases and drops only roles
   it created.
2. **Partial-adapter safety.** Actual admission accepts only the canonical three-tuple production
   manifest. Duplicate routing keys, duplicate full tuples, unknown/mismatched implementation
   entries, and template-byte/digest drift fail. A supported join row is claimed; all 13 other
   current-revision kinds and a future revision stay pending and set honest unsupported health.
   Pending claim order is tuple/event and expired-processing order is tuple/expiry/event, matching
   their partial indexes. Mutating discovery/claim back to revision-only or either mismatched order
   makes the named regression/plan gate fail.
3. **Join requested role snapshot.** A real `join.requested` event projects exactly current active
   target-org `users:manage` profile IDs, no applicant, no foreign/global admin, no unconfirmed-email
   dependency, and no PII/body parameter. Explicit roles, legacy fallback, custom overrides, profile
   admin, inactive org, and cross-org IDs match the differential RBAC oracle.
4. **Applicant exception.** Approved and denied events admit the exact canonical applicant despite no
   membership, plus current managers. Divergent/non-UUID `user_id`, payload/profile mismatch, wrong
   org, status, decision instant, subject revision, missing profile, and missing request all produce
   the same no-leak invalid-subject quarantine with zero candidates.
5. **Atomic limits.** 10,000 distinct recipients commit one receipt and 10,000 candidates; 10,001
   commits none and quarantines `audience_overflow`. Body 8,192 bytes passes in the strict fixture
   adapter; 8,193 and multibyte overflow commit no candidate/receipt. SQL count/byte constraints and
   service admission are both exercised. Exact boundary and plus-one cases cover role keys, rule
   rows, per-recipient roles, assignment rows, equivalence groups, one-group bytes and aggregate
   authority bytes; each overflow commits zero receipt/candidates and the finite authority-overflow
   quarantine. Committing candidates or an unfinalized receipt without the fixed finalizer fails at
   the deferred database guard; an exact finalized receipt/outbox pair commits. The 10,000-candidate
   case invokes one receipt guard, while catalog inspection proves no candidate constraint trigger
   exists.
6. **Concurrency and leases.** Two workers race one event; only the live owner/generation projects.
   Event renewal response loss reconciles exact state. Expiry/reclaim, stale owner, generation,
   organization, tuple, and hard deadline all write zero. Pause after audience resolution and expire
   or replace the event lease: final settlement fails and all candidate inserts roll back. The same
   pause separately replaces/expires the runtime singleton and organization lease; changed
   generation, build, catalog or projector identity also writes zero. Heartbeat and organization
   renewal run concurrently during the first 37 seconds of projection without waiting on a
   transaction-held control-row lock. At final publication, test both winner orders independently for
   runtime replacement, organization release/replacement and event reclaim: a committed replacement
   makes the finalizer return false and roll back, while a finalizer holding the old exact row makes
   the competing transition wait until commit. Separately test both winner orders for a valid
   same-generation runtime heartbeat, organization renewal and event renewal: a renewal that commits
   first is observed with its refreshed deadline and may proceed, while a renewal behind the
   finalizer waits without invalidating the unchanged scope. Hold each required row lock past 250 milliseconds and
   prove finalizer timeout rolls back receipt/candidates/outbox. Pause after the runtime lock while
   later locks wait until the old runtime lease expires; the post-acquisition clock check must reject.
   Pause after a true finalizer result but before commit until the database-owned three-second window
   expires; the deferred guard aborts all receipt/candidate/outbox changes. A
   snapshot-only/no-control-lock mutant must make a named race fail.
7. **Continuing authority.** Both revoke winner orders are tested. Membership deletion, rule change,
   organization disable, request status/revision change, request deletion, subject loss,
   field-mask narrowing and authority-digest-only drift suppress the descriptor and irreversibly
   cancel with the exact reason. Profile deletion instead cascades the candidate and preserves the
   finalized receipt; no cancelled row is synthesized. Post-projection cancellation likewise leaves
   that original finalized receipt unchanged. Later regain does not reactivate. A later promotion
   does not create a candidate for an old event. Read outage, cap overflow or budget exhaustion
   returns unavailable and neither exposes nor falsely cancels. A stale final CAS cannot cancel or
   return a replaced state/digest/recipient.
8. **Coherent authority boundary.** Commit membership, request status and permission-rule changes at
   barriers between the would-be source subqueries. The single materialized bundle returns either
   the complete old or complete new authority, never a hybrid. Commit revocation after the bundle
   but before the fresh final operational fence and prove the documented snapshot winner plus
   mandatory revalidation behavior. A mutant that splits the bundle into independent statements
   fails.
9. **Privacy and navigation.** Candidate rows contain no applicant email/name/message/reason, role
   list, org name, raw href or HTML. External URL, protocol-relative URL, traversal, fragment,
   arbitrary query, unknown template key, extra body field, and executable-markup mutation controls
   fail. The three actual join routes resolve from server constants and existing route authority.
10. **Privilege boundaries.** Real restricted sessions prove direct app/browser/assistant/coordinator/
    health/claim-role candidate reads/writes fail; projection role cannot read excluded source
    columns, claim/renew/reclaim an event, mutate evidence, directly lock/update runtime or
    organization control, directly update a Slice5 terminal state, or cross org. Projection inserts
    without the exact live runtime/organization/event scope fail. With a valid live claim,
    `notification_worker` still cannot project. Every role except `app_notification_worker` is denied
    finalizer or observer execute; every runtime role is denied direct commit-guard execute; no role
    can assume `notification_projection_finalizer`, and that
    role's narrow control-column update grants cannot pass the existing coordinator-only transition
    triggers. A
    forged/missing/mismatched scope, outcome, receipt count, body-byte total or canonical candidate
    digest cannot project, and quarantine fails if any receipt/candidate exists. Static catalog tests
    prove every definer has a fixed empty search path, no dynamic SQL or generic identifier argument,
    exactly one finalizer owner role and exactly three fixed functions, exact grants and paired exact
    SELECT/UPDATE RLS policies. PostgreSQL 17 Supabase adoption proves the exact
    `postgres`/`supabase_admin` ADMIN-only creator edge, `INHERIT=false`, `SET=false`, and
    `pg_has_role` USAGE/SET false after the transaction-local bridge is dropped; PostgreSQL 18 plain
    superuser adoption uses a separate restricted ordinary role to prove the same denial and proves
    zero target membership rows after the bridge is dropped. Both versions first prove their exact
    six-row/three-row combined temporary graphs, then commit and prove the bridge role and both owner
    schema-CREATE privileges are absent, all function owners and metadata are exact, restricted
    runtime SET/USAGE remains false, and the complete combined graph equals the frozen persistent
    subset. Injected failures after existing-owner replacement and after new-owner transfer each roll
    the whole operation back with exact function and graph restoration. Mutants reject an extra
    grantor, member, ADMIN edge, inherited
    edge, SET edge, changed temporary option, or any worker/ordinary-caller edge. The commit
    guard is trigger-only: direct execution is denied, wrong `TG_RELID`/operation/name/arguments
    fail, and an application-set commit-guard GUC exposes no row.
    A real finalizer call fails if either required control UPDATE policy
    is removed; an unknown/broader operational policy, unknown source policy, changed legacy-policy
    role array or missing/changed worker source policy fails migration and runtime admission, while
    the exact inventoried browser/service/application behavior remains accepted. Revalidation succeeds after
    the scheduler lease is terminal only with the exact frozen candidate receipt; wrong
    organization/candidate/recipient/digest or mixed projection scope reads no row. Pool role/GUC
    state restores after success, callback error, SQL timeout, cancellation, finalizer failure and
    terminal observation. A forged `request.jwt.claim.sub`/`request.jwt.claims` for a real
    foreign/global admin cannot widen any source-table read. A real baseline migration first proves
    the old `PUBLIC` plus worker-policy graph raises `42P17`, then proves exact retargeting is
    nonrecursive; browser self/admin, service role, app-ledger org-GUC/JWT, owner/migration and denied
    assistant/brain-role matrices remain equivalent. Removing a worker policy or restoring `PUBLIC`
    makes a named native negative fail. Application-supplied `finalized_at`, a second finalization,
    a changed receipt field, a caller-supplied terminal identity or one-sided terminal attribution
    fails at the trigger/constraint boundary. Removing the receipt trigger, trigger function,
    current-row reselect, or either commit-guard RLS branch makes a named native mutation fail; a
    stale-`NEW.finalized_at` implementation fails the valid commit case.
11. **Plan and mutation gates.** Actual production SQL captured from pending claim, expired claim,
    unsupported probes, role
    resolution, exact subject lookup, candidate insert, and revalidation is EXPLAINed against the
    100,000-row/10,001-member fixtures. Receipts report query class, index, rows×loops, removed rows,
    buffers and statement count without tenant IDs/bodies. Removing org, recipient, kind/schema,
    lease owner, generation, expiry, terminal attribution, finalizer receipt marker, authority
    digest, field mask, 10,000 cap, body cap, navigation allowlist, deferred receipt trigger, or
    commit-guard current-row attestation causes the named native behavior to fail; source bytes are
    restored and hashed.
12. **Ambiguous commit observation.** Lose the response after a real projected commit with zero and
    nonzero audiences and observe `committed` from exact terminal owner/generation plus the immutable
    DB-finalized receipt. Delete a recipient profile through the declared cascade and, separately,
    cancel a candidate after projection; both still observe the exact committed operation without
    rereading the now-changed candidate set. Exercise exact same-generation processing, a newer
    generation/owner quarantine, wrong owner at the same generation, exact-attributed quarantine,
    legacy null attribution, pending, absent, projected-with-missing/mismatched/unfinalized receipt,
    SQL timeout and transport failure. Each returns its exact finite state or `unavailable`, performs
    no insert/finalize/claim/replay and does not expose a mismatched row. A direct
    claim/application/browser/assistant role cannot read terminal rows or execute the observer. A
    state-only function mutant that ignores finalized receipt or terminal operation identity fails.
13. **No effect or browser path.** Static import and runtime spies prove no email/Gateway/provider or
    browser route is called. Current join email behavior remains separately labelled legacy and
    unverified. The production catalog entries remain `integrated:false`.
14. **Qualification.** Focused unit/service/native tests, exact semantic native manifest with zero
    skips, full configured check, compiled adapter-node lifecycle with the real production projector
    admission, and independent Standards/Spec review pass. Local qualification is not deployment or
    production verification.

## Completion boundary

Slice5 is implemented only when exact tuple routing, least-privilege migration, the three join
adapters, atomic receipt/candidates, current revalidation, production worker admission, native plan
and mutation gates all pass against the same frozen source manifest. Until then Slice4 health must
remain `projection_unavailable` in production.

After implementation, the worker may truthfully project only the three declared join tuples. No
event is externally delivered and no browser can read a candidate. NOTIF-007/014/016/017 remain open
for their producer, inbox, preferences, external effect, aggregate/report, retention, release, and
deployment slices. Exact-site `TODO(handoff)` comments and the meta proposal retain those boundaries.

## Implementation record — 2026-10-05

The program was paused on 2026-10-03 with this contract approved and the implementation uncommitted.
It resumed on owner authorization. This section records verified state against the completion
boundary above; it changes no invariant and grants no release authority.

### Source identity

The 48 owned/compatibility files were verified byte-for-byte against the frozen pause manifest
`readiness-notification-s5-source-2026-10-03.sha256` (manifest SHA-256
`62767c39b05d7a535945297c93c121fdea59833b824782064e6e7a1bd935145d`): 48 of 48 matched, so no source
drifted while the program was paused.

Eight shared notification/QC compatibility files were then format-qualified for the first time at
final bytes (`outbox-claim.ts`, `outbox-settlement.ts`, scheduler `admission.ts`, `discovery.ts`,
`loop.ts`, `loop.test.ts`, `projector-contract.ts` and
`tests/fixtures/notification-scheduler/authority-cases.ts`). Prettier changed string-quote style and
array wrapping only; no statement, identifier or SQL text changed.

Prettier inertness was then proven rather than assumed: each file was parsed before and after with
the TypeScript parser and compared as a position-free syntax-tree signature, with string literals
compared by decoded value and template literals by **raw** text, so any change to an embedded SQL
byte would fail. All nine reformatted files are syntax-tree identical. Note that `git diff -w` is
not a valid whitespace-only proof for a Prettier pass, because reflowing moves line boundaries, and
a standalone token scanner is not either, because it mis-handles template-literal continuation
without parser context.

### Final receipts

The authoritative manifest is `readiness-notification-s5-source-2026-10-07-v4.sha256` (v4), self-SHA-256
`94194af3c323ddee...`, **50 paths**, verified 50 of 50 against the worktree. v4 supersedes v3 (same
50 paths, one file's bytes changed) after the hosted lane found a second real defect; v3 superseded
v2, which listed 49 paths and was **short by one**. Both earlier manifests are retained as published
rather than rewritten, because a frozen manifest's bytes are themselves a receipt. See "Manifest
curation shipped an incomplete file set" and "Unbounded work under a bounded budget" below. At these
exact bytes:

- combined CI-shaped lane, re-run against a freshly provisioned cluster: 18 files, 298 tests, 298
  passed, 0 failed, 0 pending, 320s, validated as `{files:18, passed:298, skipped:0}`;
- the **hosted** lane on the same bytes: 18 files, 298 tests, 298 passed, 0 failed, 0 skipped, 3m54s
  — this is the qualification that matters, because neither defect below reproduced locally;
- focused units: 8 files, 33 passed (30 before, plus the three new ordering regressions);
- configured Hub check: 11,698 files, 0 errors, 0 warnings, 0 files with problems;
- Prettier check clean across all 49 TypeScript/JSON paths, and `git diff --check` clean.

One operational note for whoever reruns this lane. PostgreSQL roles are cluster objects and the lane
shares one cluster, so any notification fixture that fails to drop what its migration created poisons
every later notification suite with `Notification role already exists; reviewed role reconciliation
required` — the migration's own non-idempotency assertion working correctly, not a regression. Until
the v3 fix that was reachable in two ways: a run killed before teardown, and the teardown guard
defect below. With the fix, the lane leaves zero `notification*`, `app_notification*` and
`minion_notification*` roles and zero `minion_qc_notification_%` databases behind, which was verified
directly after the re-run. If a cluster is ever left dirty, recreating the disposable parent restores
a pristine one.

### Manifest curation shipped an incomplete file set

The hosted `jobs-stock-finance-postgres` lane failed on PR #435's first push while the identical
local lane was green. The branch was missing a three-line change the qualifying clone already had.

`quoteRoleIdentifier` in `tests/fixtures/notification-migrations/reconciliation-harness.ts` is the
injection guard that every role name in `teardownNotificationMigrationHarness`'s drop loop is routed
through. This slice makes two fixtures collect whatever the migration created into
`fixtureRolesCreated` so teardown can drop it — the reconciliation suite's `laterRoleNames` and the
audience harness's `MIGRATION_ROLES` — and the migration creates three roles the guard did not
admit: `app_notification_worker`, `notification_projection_owner_bridge` and
`notification_projection_finalizer`. The first notification suite to run therefore threw `Invalid
notification fixture role identifier` out of teardown, aborting the drop loop with the roles still
present, and the three later notification suites failed on their own non-idempotency assertions. One
teardown throw, four red suites.

Two properties hid it, and both are the generalizable lesson:

1. **The lane's file order is not stable.** `notification-legacy-reconciliation` ran 4th in the
   qualifying run and 7th in the re-run, so which suite trips a shared-cluster guard first varies
   between runs and between a warm local cache and cold CI. A suite that depends on cluster state
   left by a sibling is order-dependent by construction; green once is not green.
2. **A curated manifest cannot prove its own completeness.** v2 was honest about the 49 files it
   listed, but the file set was derived by hand and omitted a path this slice modified, so a required
   change never reached the branch. The static import audit could not catch it either, because the
   file already exists on `master` and every specifier resolved. v3 is therefore derived mechanically
   from `git diff --name-only $(git merge-base origin/master HEAD) HEAD`; the path set is now a
   projection of the branch rather than an assertion about it.

### Unbounded work under a bounded budget

The hosted lane found a second defect after the first fix landed, in this slice's own fixture
`tests/fixtures/notification-audience/limit-cases.ts`. Only `audience-projection` failed, 7 of its 23
cases, all clustered just past the projection transaction's `statement_timeout` of 10s.

The 10,001-recipient case ran its index-negative control as `explain (analyze,buffers,format json)`
over a deliberately **unindexed** authority query with roughly 20,000 `organization_members` rows,
inside a probe that sets the same 10s budget the real projection uses. That is unbounded work
measured against a bounded budget: about 5s of the case's 9s locally, which is 90% of budget with no
headroom, and past the limit on a hosted runner, where the case took 13.6s and failed.

Its failure then poisoned the suite. The dropped `idx_org_members_org` was restored only inside a
`finally` block, so when that path did not complete the index stayed missing and every later case
that reads the authority bundle exceeded the same 10s budget — six further failures with nothing
wrong in them.

What identified the cause as leaked state rather than slow hardware: cases 20 and 22 kept passing in
under 200ms, and they are the only two that never read the authority bundle. Hardware slows
everything; a missing index slows one path. The hosted runner was also measurably **faster** than the
development machine on the pure-bulk 10,000-recipient case (4.0s against 6.4s), which rules out a
capacity explanation outright.

Two corrections, each removing a cause rather than widening a limit:

- the probe asserts plan **shape** only — source sequential scans and chosen index names — so it now
  runs `explain (format json)` and never executes the unindexed query. The case drops from 9021ms to
  3734ms locally and 5292ms hosted, and the production 10s budget is left untouched everywhere. A
  spec'd production bound is not a knob for making a test pass.
- the index drop and the probe share one transaction that always rolls back, so PostgreSQL restores
  the index itself. PostgreSQL DDL is transactional, so there is no cleanup statement whose own
  failure can leave the index missing, and the case now asserts it is present afterwards.

One method note for anyone validating this lane: running `audience-projection` alone is **not** a
reproduction. In isolation it fails with a third, unrelated error from `setOutboxPlanState`
(`notification_outbox_check`), because the suite depends on state the lane establishes. Validate
through the full 18-file lane only.

### Combined CI-shaped lane

The required PostgreSQL lane now passes with zero skips, closing the pause-time failure of 275
passed / 10 failed / 13 pending out of 298:

- `vitest.jobs-postgres.config.ts`, 18 admitted test files, 18 passed, 298 tests, 298 passed, 0
  failed, 0 pending.
- `scripts/qc/jobs-postgres-contract.ts` returns the required `{files:18, passed:298, skipped:0}`.
- Both pause-time failures were invocation/fixture defects, not contract defects. The brain-corpus
  effect-ownership fixture admits correctly once the supplied disposable parent is `minion_qc_corpus`
  rather than `minion_qc_vectors`, restoring its 13 semantic cases. The Slice4 scheduler fixture's
  routing-column compatibility step holds in the full lane, not only in the isolated 16/16 rerun, so
  discovery reading `notification_outbox.kind` and `schema_version` from migration `20261003170000`
  is satisfied end to end.

The lane ran against the pinned disposable parent rebuilt to the same identity recorded at the pause
(`minion_qc_corpus` / `minion_qc` / `minion-360-disposable:v1`, loopback, PostgreSQL 18.6), with no
source edited while it ran.

### Configured check

The configured Hub `check` passes at final formatted bytes: 11,698 files, 0 errors, 0 warnings, 0
files with problems. A first attempt reported two errors in `src/hooks.client.ts` for
`PUBLIC_POSTHOG_KEY` and `PUBLIC_POSTHOG_HOST`; those were absent `$env/static/public` exports in a
checkout with no `.env`, not source defects, and the run is only the configured gate once the
environment exists the way `vercel-build` creates it. No Slice5 file was implicated in either run.

### Outstanding before this slice may be committed

1. Human merge gate, production migration and post-release verification remain outside this
   contract, unchanged.

### Independent blast-radius review — verdict `concerns`

An independent read-only review confirmed the 49 in-scope hashes, confirmed the migration carries no
`BEGIN`/`COMMIT` of its own (unlike the sibling `20261003110000_marketplace_operations.sql`),
confirmed `PUBLIC` retargeting is safe against the admitted pre-state ACL, confirmed no production
producer writes `notification_events` and both tables hold zero production rows, confirmed the
worker cannot start on Vercel (double-gated on `DESKTOP=1` in `src/hooks.server.ts` and again in
`worker-bootstrap.ts`, with no `vercel.json` cron touching notifications), and confirmed HC039's
seven-case mention-directory manifest entry is preserved with the 34/18/298 totals arithmetically
consistent. It corrected two claims made earlier in this record, both of which are fixed above:

- The scheduler fixture's routing compatibility step was **not** added after the pause.
  `tests/fixtures/notification-scheduler/postgres-harness.ts` hashes identically in the 2026-10-03
  and 2026-10-05 manifests (`b40d12b8…`) with an mtime of 2026-10-03 18:08:35. It is also strictly
  confined: `installProjectionRoutingCompatibility` is module-private, its only importers are two
  test-only modules, and each of its six operations has an exact counterpart in the migration, so it
  is a subset of the real schema rather than compensation for a missing one.
- The reformatted set is the eight files named above. `worker-transaction.ts` and
  `scheduler/qualification-projector.ts` were **not** reformatted; they hash identically across both
  manifests.

Three concerns were raised and all three are now corrected:

1. **Routing order diverged from the SQL it feeds.** `canonicalNotificationProjectionSupport` sorted
   a NUL-joined key with `localeCompare(key, 'en-US')`, while the complement ranges in
   `unsupportedProjectionPending` compare
   `row(catalog_revision collate "C", kind collate "C", schema_version)` with `schema_version` as an
   integer. Two divergence classes: a stringified `schemaVersion` orders `"10"` before `"2"`, and a
   locale collation treats the NUL separator and punctuation as ignorable. With a second schema
   version in the manifest the generated ranges would invert, leaving a gap in which unsupported
   `pending` rows sit undetected while the health signal reports a drained queue. The sort now
   compares the two ASCII-validated text fields by code unit, which equals C collation, and
   `schemaVersion` numerically. Three regression tests were added that call the function directly
   and check it against an independent `Buffer.compare` oracle; restoring the locale sort fails two
   of them, and the pre-existing shipped-manifest assertion passes either way, which is why the
   defect was latent.
2. **The frozen manifest was incomplete.** `src/server/db/notification-legacy-reconciliation.sql.integration.test.ts`
   is Slice5-owned (it imports `projection/catalog-admission` and `projection/catalog-fingerprint`
   and gained 77 lines) and is a jobs-lane member, so the `{files:18, passed:298, skipped:0}` receipt
   rested on bytes no manifest covered. It is now the 49th entry. Having been outside the manifest it
   had also never been format-qualified; it is now formatted, with an identical AST before and after.
3. **The backfill completeness guard could not fail.** The guard is a plain `SELECT` on
   `public.notification_outbox`, which carries `force row level security` and has no owner policy,
   so an actor without row visibility would write zero rows and then read zero nulls and report
   itself complete, surfacing later only as a bare not-null violation. The preflight asserts the
   actor's name, `rolsuper` and `rolcreaterole` but never this attribute. A named precondition now
   runs immediately before the backfill and raises unless the actor bypasses row level security.
   Production `postgres` has `rolbypassrls=t` and the PG18 fixture actor is superuser, so both
   satisfy it; the guard converts a silent class of failure into a named one.

Remaining review items are deliberately not addressed in this slice and are recorded as follow-ups
rather than fixed, because each is inert at current bytes: a `revoke`/`grant` pair on eight outbox
columns whose comment overstates its effect (the real mechanism is the worker-update policy's
`with check`), a Slice3-only `claimNotificationEventsInTransaction` duplicate whose sole export
`claimNotificationEventsForOrg` has no callers, the absence of a bounded-plan assertion for
`unsupportedProjectionPending`'s row-comparison probe.

The review's final nit — that the QC count bumps absorb another owner's missed bump — does not apply
to a branch based on production `master`, and the record is corrected here. The reviewer was right
about `875fb043`, which left the expectations at 32/16/268 after landing HC039's manifest entry, but
`master` already carries that repair at 33/17/275 (it was fixed while shipping #432). Measured
against `master`, this slice's diff is exactly one manifest entry and its behaviors: 33→34 discovered
files, 17→18 jobs-lane files and 275→298 semantic tests. Nothing stale is absorbed and no
pull-request caveat is needed.

### Production preflight dry-run — found and fixed a real blocker

Before offering the merge, the migration's own preflight was executed against production read-only.
Lines 1 to 378 are exclusively `create temporary table`, inserts into those temp tables and
assertions; the first DDL is the `create role` at line 380, and the extract ends in a deliberate
`raise exception`, so nothing could persist. The lone `insert into public.notification_outbox` in
that span is inert: it sits inside a `$body$`-quoted literal being compared as the expected trigger
source.

**It failed**, on `Notification projection source role reachability changed`. Merging without this
check would have failed the production build, because the migration runner executes inside
`vercel-build`.

The drift was narrow and benign, and nothing was missing — no authority had been removed. Six extra
reachability rows existed, all transitive and all `MEMBER`/`SET` only, never `USAGE`: Supabase grants
`supabase_storage_admin` the ability to `SET ROLE` into `authenticator` (grantor `supabase_admin`,
`inherit_option=false`, `set_option=true`), and `authenticator` is already an admitted member of
`anon`, `authenticated` and `service_role`. The existing edge assertion could not catch it, because
`authenticator` is not one of the five targets it freezes; only the reachability assertion did.

This is pre-existing platform capability rather than new exposure: `supabase_storage_admin` cannot
reach `app_notification_worker`, and `service_role` already holds full privileges on these
relations. The expectation was therefore corrected rather than loosened. The PG17 branch now admits
that chain **only** when the exact platform edge is present with exactly those options, so an
inheriting edge, a different grantor, or any `USAGE` reachability still fails. The admission is
derived from the live edge, so fixtures that lack the role are unaffected, and it sits inside the
PG17 branch so the PG18 fixture path is untouched.

After the correction, production reachability matches the contract exactly: 39 actual rows, 39
expected, zero unexpected, zero missing. The remaining preflight assertions, which the first run
never reached, were then dry-run separately and all matched: policy inventory, PUBLIC and app-ledger
policy roles, source ownership, absence of the three Slice-5 roles, enqueue trigger source, the
quarantine function's identity and ACL, and the PG17 event-owner graph. The jobs lane was rerun on
the corrected migration and stayed green at 18 files / 298 passed / 0 skipped.

### Independent mergeability of this slice

The slice was re-verified as standing on its own rather than only inside the shared worktree. Its 49
paths were applied to a branch created from production `master` (`ce1ec6c3`) and all 49 hashes match
the manifest. A static import audit of the 46 TypeScript sources resolves every relative, `$lib` and
`$server` specifier to either one of the 49 paths or a file already tracked in `master`; none
resolves into the other owner's uncommitted work. The only non-resolving specifier is the Vite
`?raw` suffix on `$lib/notifications/catalog.manifest.json`, which `master` already tracks.

NOTIF-007/014/016/017 stay open for their producer, inbox, preferences, external-effect,
aggregate/report, retention, release and deployment slices. Slice4 health remains
`projection_unavailable` in production until this slice is released.
