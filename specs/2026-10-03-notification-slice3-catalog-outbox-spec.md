---
id: 2026-10-03-notification-slice3-catalog-outbox-spec
title: Admit typed notification events in the source transaction and claim durable outbox rows
stage: spec
status: approved
pass: 2
verdict: approved
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [data, logic, security, test]
type: feature
proposal: 2026-10-03-notification-recon
findings: [NOTIF-001, NOTIF-003, NOTIF-004, NOTIF-005, NOTIF-007, NOTIF-008, NOTIF-015, NOTIF-016, NOTIF-017]
---

# Notification catalog and transaction outbox

## 0. Product

This implements Slice3/D4 of the approved notification-platform spec. It is a foundation for its
later producers, audience projection, inbox, preferences and delivery effects.

## Out of scope

It sends no message, starts no polling loop, and does not replace a current notification path until
that producer's own integration slice passes. It does not close the whole findings listed in
frontmatter.

## AS-IS

At Hub `eb6867db`, `notif.service.ts` interpolates allowlisted table/date identifiers into a poll over
`(lastRunAt, now]`, limited to500 rows. Its arbitrary condition/recipient JSON is only cast into
interfaces. A row's message log is inserted as `sent` before the Gateway call; the legacy dedupe key
is `(rule, entity, triggerKey)`. Notification source transactions do not write a durable typed event.
`pg-notifications-schema.ts` models only these legacy rule/log tables. The reviewed Slice2 authority
change protects rule/direct-send admission, and its separate reconciliation migration reproduces
legacy structures; neither creates an outbox or trustworthy receipt.

The platform contract requires16 finite initial event kinds,32KiB canonical payloads, claims in
pages of250, database-time leases, immutable tenant/source identity, and no event-time watermark.
The current booking status sources agree on pending/accepted/completed/no_show/cancelled/rejected
(`components/scheduling/booking-status.ts` and `scheduling-bookings.service.ts:SETTABLE`).

## TO-BE: one revisioned registry

Place domain-neutral contracts under `src/lib/notifications/` and database/service implementation
under `src/server/services/notifications/`. Neither layer imports a UI component or a legacy
notification service. A registry entry owns its exact kind/schema version, canonical subject type,
finite payload field descriptors, producer identity, audience-resolver ID, required capability
policy, privacy-projection ID, navigation-resolver ID, template key and retention class. The public
metadata projection omits executable callbacks and privileged source details.

The registry is the only source for parser dispatch, producer types, settings metadata and later
worker/template/navigation consumers. It emits a deterministic manifest and digest. A schema or
semantic metadata change requires an explicit catalog revision change and regenerated manifest;
CI compares the checked manifest and every implemented consumer's coverage. A registered entry is
not evidence its domain producer is wired: a separate explicit integration state remains false
until that later producer slice is qualified. Production dispatch must reject unavailable adapters
rather than treating a missing handler as a successful no-op.

The16 platform kinds remain exact. Their payloads contain immutable references and essential
routing facts, not source bodies, SQL, raw errors, destinations or pre-rendered markup:

| Kind | Subject | Required payload fields |
| --- | --- | --- |
| scheduling.booking.upcoming | booking | bookingId, bookingRevision, windowKey, scheduledFor |
| domain.status.changed | booking | adapter=`scheduling.booking`, bookingId, bookingRevision, fromStatus, toStatus |
| stock.low.crossed | stock_item | itemId, warehouseId, crossingId, policyRevision, snapshotId |
| join.requested | join_request | requestId, applicantProfileId |
| join.approved | join_request | requestId, applicantProfileId, decidedAt |
| join.denied | join_request | requestId, applicantProfileId, decidedAt |
| membership.activated | member | profileId, grantedRoleKeys, membershipRevision |
| finance.daily_summary.ready | finance_snapshot | snapshotId, localDate, currency |
| stock.daily_summary.ready | stock_snapshot | snapshotId, localDate |
| release.product.published | product_release | releaseId, version, releaseClass, artifactDigest, publicationReceiptId, publishedAt |
| release.gateway.available | gateway_release | releaseId, version, artifactDigest, publicationReceiptId, publishedAt, feedRevision |
| automation.schedule.committed | automation_schedule | scheduleId, scheduleRevision, ownerProfileId |
| automation.run.failed | automation_run | runId, ownerProfileId, failureClass |
| automation.effects.committed | automation_run | runId, ownerProfileId, effectReceiptIds |
| agent.user_notice | notice_snapshot | snapshotId, recipientProfileId, authorProfileId |
| agent.report.ready | report_snapshot | snapshotId, planId, planRevision, slotId |

All `*Id` fields are canonical UUIDs except a domain's explicitly reviewed stable revision/key.
Revisions and window keys are nonempty ASCII identifiers of at most128 bytes; role keys are
nonempty canonical role identifiers of at most100 bytes, at most32 unique keys. `effectReceiptIds`
is a nonempty unique UUID array of at most128 elements: a no-op run cannot create this kind.
Status transition permits only the six current booking values and rejects from==to. This initial
adapter does not authorize arbitrary domain/table/column subscriptions; new domains require their
own reviewed adapter and registry revision. Monetary values stay in the authorized snapshot;
currency is a validated uppercase ISO-shaped code and never permits aggregation/conversion by
itself. `localDate` is a real Gregorian YYYY-MM-DD date. Instants are canonical UTC ISO strings.
Release class is minor or major; patch/draft/unpublished releases do not enter the universal board
kind. Versions use a bounded reviewed release identifier; a version string alone is not publication
proof. Digest is lowercase SHA-256. Failure class is one of `dependency_unavailable`, `deadline_exceeded`, `input_invalid`,
`permission_revoked`, `capacity_exceeded`, or `internal_failure`, never free text.

A payload parser rejects unknown/extra keys, invalid types, duplicate array IDs, invalid dates,
non-finite values and stale kind/schema/catalog versions. Input byte admission happens before JSON
parse for encoded input. Producer-object admission rejects non-plain objects, accessors, cycles,
unsupported values and over-limit collections before canonical serialization; no `toJSON` or
getter may execute. Canonical serialization sorts object keys, preserves array order, rejects
unpaired Unicode surrogates and enforces32KiB UTF-8 incrementally. Errors carry fixed codes and
schema field paths only, never received values. The encoder has explicit depth/node/key/array
ceilings derived from this finite schema, not an unbounded generic serializer.

## Immutable envelope and SQL ownership

Add an additive migration after the reserved Slice2 version20261003140000. The exact version is
reserved only when implementation starts. Use two tables, separating immutable event evidence from
mutable projection claims:

- `notification_events`: event UUID, organization UUID FK, kind, schema version, catalog revision,
  producer ID, subject type/UUID/revision, occurred-at, immutable source receipt/revision identity,
  dedupe key, canonical payload text, payload SHA-256 and semantic event SHA-256, creation time and
  database write-transaction identity. A unique `(organization_id, producer_id, dedupe_key)` binds
  the retry identity. Organization/type/subject/revision must agree with the parsed registry entry.
- `notification_outbox`: event UUID PK and composite organization/event FK, state, lease owner UUID,
  generation bigint, claimed-at, hard deadline, lease expiry, renewal count, claim count, completed time and finite quarantine reason. Catalog revision is an immutable routing projection bound by a composite organization/event/catalog FK. State
  is pending/processing/projected/quarantined. All lease fields are null outside processing;
  processing has all of them. Initial generation/count are zero. Invalid partial states fail SQL.

Every textual envelope field is admitted before SQL with the same UTF-8 limits enforced by
CHECK octet_length: kind96, catalog revision64, producer ID96, subject type48, subject revision128,
source receipt/revision identity128, dedupe key256 and quarantine reason32. Identifier fields use
nonempty canonical ASCII patterns; kind/producer/subject/reason additionally match the finite
registry or transition enum. Schema version is an integer1..65535. Digests are exactly64 lowercase
hex bytes. Payload remains at most32768 bytes. UUID/time/integer fields use their native types;
generation and claim count are nonnegative bigint and overflow fails the whole claim. Versions in
payload are ASCII release identifiers at most128 bytes. This bounds the unique dedupe index key
well below PostgreSQL's B-tree entry limit and the returned envelope below2KiB per event. Future
catalog revisions remain syntactically bounded even when their schemas are unavailable locally.

One event INSERT creates exactly one pending outbox row in the same transaction using a narrowly
reviewed SECURITY DEFINER trigger function. Its dedicated owner is NOLOGIN/NOSUPERUSER/NOBYPASSRLS,
not a table/schema owner, with only outbox INSERT and the exact organization-bound RLS INSERT policy.
The function has an empty fixed search_path and fully qualified relations/functions. It checks
TG_RELID against the actual public.notification_events relation OID, TG_TABLE_SCHEMA/TG_TABLE_NAME,
TG_OP=INSERT and TG_WHEN=AFTER before using NEW; attaching it to a forged table cannot insert a row.
No caller-supplied relation, SQL or destination is accepted. PUBLIC, app_ledger, browser, assistant,
service and worker roles have no function EXECUTE grant or owner-role membership. Only migration
ownership can attach the trigger; PostgreSQL executes the already-attached trigger during an
ordinary event INSERT without granting its caller direct function or outbox INSERT authority.

The application cannot commit an event with a missing outbox row, supply an already-processed
initial state, change immutable evidence or delete it. No trigger invokes HTTP, application code,
queue delivery or a provider. Foreign subject authority is checked by the actual producer adapter
in its later integration; the generic append API is server-only, never a public endpoint that
accepts an event envelope from a browser or agent.

Both tables force RLS with exact organization UUID binding to the current organization GUC; absent,
invalid or foreign GUC denies access without leaking another row. Producer paths use the existing
non-bypass app_ledger transaction, with INSERT/SELECT on events and no direct outbox INSERT,
UPDATE or DELETE. SQL checks admit only initial pending outbox rows through the trigger-owner
INSERT policy. There is no producer grant for creating a projection receipt.

A dedicated NOLOGIN/NOSUPERUSER/NOBYPASSRLS notification worker role owns only reads and reviewed
claim transitions for one organization context. It cannot change payload/subject/dedupe/catalog
evidence, create an arbitrary event, delete rows or assume the application/migration/trigger owner.
Browser, assistant, service roles and app_ledger cannot inherit or SET ROLE that worker. The private
server wrapper uses getRlsPgClient().begin(), never the ordinary getPgClient() pool. Inside that
owned transaction it SET LOCALs the worker role, canonical org GUC, statement_timeout=3s,
lock_timeout=250ms and idle_in_transaction_session_timeout=5s before any domain query. Pool state
must return to its original role/GUC/timeouts after success, thrown error and SQL timeout.

Both current pools use the server-only SUPABASE_DB_URL, but only getRlsPgClient is the dedicated
transaction-only pool. Migration inventories the actual connection role and its transitive grants;
the trusted backend login must already be able to SET ROLE via migration ownership or receive an
explicit worker membership only when that exact login is neither a browser/service/assistant/app
role nor reachable by those roles. An unidentified or overlapping login fails deployment admission;
no fallback to a bypass query or broad grant is allowed. Required role creation is application
migration work, unlike Slice2's forbidden production test-probe role. Raw relation/column ACLs,
transitive membership and effective behavior are native acceptance targets. All other transition
functions are invoker functions with fixed search paths and only caller-granted authority.

All transitions have exact ownership checks at SQL: pending -> processing; expired processing ->
processing with incremented generation/new owner; current processing -> projected or quarantined.
A live current row cannot be stolen; stale owner/generation cannot settle, renew or quarantine.
Terminal rows cannot be claimed again or rewritten. Event/outbox retention grants remain absent
until the separately reviewed retention slice.

## Producer API and duplicate semantics

`appendNotificationEvent(tx, sourceContext, typedInput)` requires the caller's actual source
transaction. It validates/canonicalizes before INSERT, derives org from the trusted context/GUC and
never opens an independent transaction. It returns an immutable stored event receipt and whether
this transaction inserted it. A source rollback removes both event and pending row.

The source-context identity, subject revision and occurred-at come from the committed business
mutation/immutable source receipt, not a clock fabricated on each retry. The database additionally
records its write transaction ID as observational provenance. That transaction ID and newly
allocated event UUID are excluded from semantic duplicate comparison because a legitimate retry
can occur in a different transaction. Kind/schema/catalog, producer, exact organization/subject,
source identity, source occurred-at and canonical payload are included.

An exact duplicate returns the original event ID/payload/receipt and creates no new row. Reusing a
dedupe key with any different semantic field returns a typed conflict and rolls back the source
transaction. Concurrent duplicate INSERT conflicts use a fresh READ COMMITTED statement to read the
winner; do not rely on an INSERT CTE snapshot that cannot observe a concurrently committed winner.
No path repairs a malformed old event or changes its dedupe identity to make a retry pass.

## Claim API and transaction inversion

`claimNotificationEventsForOrg` is worker-only, with one short transaction and database time. It
returns at most250 rows. Eligibility is committed pending rows or expired processing rows, with
an explicit supported-catalog list of1..8 unique bounded revisions. IDs/timestamps are not an
eligibility checkpoint: a row committed late remains pending even if its ID sorts earlier.

The outbox has partial B-tree indexes `(organization_id, catalog_revision COLLATE "C", event_id)`
WHERE state='pending', and `(organization_id, catalog_revision COLLATE "C", lease_expires_at,
event_id)` WHERE state='processing'. Claim queries use an exact org/catalog prefix and matching
ORDER BY with LIMIT, not an OR over both states or an unbounded join/filter/sort. Each revision is
queried separately, decrementing the remaining batch budget. Pending and expired rows each receive
an initial125-row budget, followed by a remaining-capacity pass; at most32 candidate statements
and250 selected rows across the whole transaction. Candidates use FOR UPDATE SKIP LOCKED; updates
and immutable-event reads use only those selected primary keys and exact composite FKs. No
unbounded event-body materialization precedes the LIMIT.

A nonblocking pg_try_advisory_xact_lock derived from organization serializes claim transactions for
that org. A busy result is explicit and produces no batch; hash collision can reduce concurrency
but cannot grant cross-org access. Statement/lock timeouts still bound exceptional index bloat or
lock contention; LIMIT alone is not claimed to bound arbitrary physical scans. Native EXPLAIN
ANALYZE/BUFFERS covers100000 mixed-org/mixed-state rows, with near/far IDs, unsupported catalogs and
expired/live leases. Acceptance requires the intended partial index, no sequential scan or sort
of the total eligible population, no more than5000 examined candidate tuples for an uncontended
250-row claim, and at most32 candidate statements. A deliberately disabled eligibility index must
fail this plan gate. Contention proof asserts timeout/busy behavior and zero partially committed
batch, rather than claiming p99 from this local fixture.

Claim sets claimed_at from database time, hard_deadline=claimed_at+60s, lease_expires_at=claimed_at+30s,
renewal_count=0, new owner and incremented generation/claim count. All five lease fields (owner, claimed_at, hard_deadline, expiry and
renewal_count) are null outside processing; processing requires all, renewal_count in(0,1), exact
hard deadline and expiry<=hard deadline. The only renewal transition requires matching owner and
generation, still-live expiry, renewal_count=0, and changes it atomically to1 with expiry equal to
the hard deadline. It cannot change claimed_at/deadline or occur twice. Reclaim of an expired row
resets this entire lease tuple for the new generation. Terminal transitions clear it. SQL transition
triggers reject malformed direct updates, including deadline drift or count rollback.

This projection-only slice does not run a production loop that marks rows projected without an
audience. Tests use a harmless fixture producer and explicit claim/settle calls without external
effects. Claim APIs return at most250 bounded payloads plus at most2KiB envelope per row. Invalid
stored supported-catalog payload/digest enters an explicit typed quarantine path held by the live
claim, never an empty success or repeated infinite retry. Unknown future catalog revisions remain
pending and are not terminally quarantined.

The current org's unsupportedCatalogPending flag uses the pending partial index with lexicographic
COLLATE "C" complement ranges around the sorted1..8 supported revisions. At most9 separate indexed
EXISTS/LIMIT1 probes cover these disjoint ranges; no NOT IN scan over all supported rows. Return
only a boolean, no foreign payload/catalog disclosure. Native EXPLAIN validates both true/false
cases with100000 supported rows and an unsupported row beyond them; removing the catalog index
must fail. A matching future worker can later claim those untouched rows. Query timeouts are typed
unavailability, never false health.

## DELTA and verification

1. One registry defines all16 platform kinds, strict payloads, semantic policy IDs and public
   metadata. Removing a kind or changing a schema/policy without a revision/manifest update fails
   the drift gate. Booking status coverage is compared with actual domain constants, not a copied
   fixture that can drift independently.
2. Encoded and object admission proves the UTF-8 admission boundary at32KiB, multibyte Unicode, invalid surrogate,
   depth/node/collection caps, cycles, getters/toJSON, unknown fields, date correctness and each
   kind's positive/negative vector. No fixture duplicates the parser implementation. Current reference-only kind schemas may impose a
   lower practical maximum; do not fabricate a valid32KiB kind payload. Test the actual bounded
   encoder separately and prove oversize encoded input is rejected before parsing/schema work.
3. Actual disposable PostgreSQL source write+append commits atomically; source rollback and a
   rejected/oversize event commit neither source change nor event/outbox row. Same-key semantic
   conflict leaves no partial source effect.
4. Eight concurrent exact duplicate writers produce one event/outbox and the same receipt. A
   different payload/source/subject/catalog under the same key conflicts. Independently remove
   org binding or digest comparison and require the exact native regression to fail.
5. A begins and inserts an earlier event without committing; B commits, is claimed and settles;
   A commits later and is claimed. No timestamp or ID checkpoint can lose A. Repeat with501
   same-time events over pages250/250/1, crash between pages and concurrent workers; every ID is
   observed once per live generation and no terminal event is claimed again.
6. Lease expiry/reclaim increments generation. Old owner completion/renewal/quarantine affects0;
   current owner settles exactly once. Native time manipulation uses isolated fixtures and database
   time controls, not sleeps that can pass under scheduler jitter. Removing generation/expiry checks
   must fail a named test. Concurrent SQL sessions prove row-lock ownership.
7. Real restricted producer/worker roles prove RLS, ACLs and legal transitions: foreign org,
   missing/invalid GUC, direct initial projected state, event mutation, outbox deletion, stale lease,
   forbidden role inheritance and hidden column grants are denied. Direct app outbox INSERT, direct trigger function invocation and forged-table trigger attachment/use are denied. The trigger owner cannot bypass tenant RLS or gain table ownership. Repeated/concurrent renewal, deadline drift, count reset and reclaim prove the exact lease tuple. Worker transaction pool restoration is proven after success, application error and SQL timeout; the ordinary pool is never used. All fixture schemas/roles are
   dropped and absence asserted. No provider module is imported by this slice.
8. Fresh and Slice2-reconciled native catalogs apply the actual migration runner, report exact
   schema/constraints/grants and rerun as a no-op. Ordinary mocked tests cannot substitute for this.
9. Parser and SQL both reject each over-limit envelope field, including multibyte inputs. Claim/unsupported-probe EXPLAIN gates, statement counts, large mixed-tenant fixtures and index-removal negatives prove bounded query shape as specified above.
10. The required native lane and its semantic manifest name every critical behavior; zero skipped
   cases. Source manifest freezes exact bytes. Full configured check and impacted architecture
   gates pass before source acceptance. Independent review covers legacy notification coexistence,
   writer/worker privilege separation and retention restrictions.

## Completion boundary

This slice is implemented only when the registry is consumed by the actual append/claim paths,
SQL migration and native tests, and all above evidence passes. It intentionally leaves domain
producer integration, worker scheduling, audiences, rendered content, inbox delivery, destinations,
Gateway receipts and user UI to their explicit later slices. Exact-site handoff comments point to
the notification proposal; those findings remain open in the program register. No local result
means merged, deployed or verified against production.
