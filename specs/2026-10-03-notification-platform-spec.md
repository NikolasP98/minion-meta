---
id: 2026-10-03-notification-platform-spec
title: Durable configurable notification platform
stage: spec
status: review
pass: 1
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub, minion, minion-meta]
tags: [data, logic, migrations, security, test]
type: feature
proposal: 2026-10-03-notification-recon
verdict: pending
---

# Durable configurable notification platform

## 0. Product

Minion needs one trustworthy notification platform for upcoming events, watched status changes,
low-stock crossings, organization membership, financial summaries, released revisions, automation
outcomes, and agent-defined reports. A user must be able to choose the events and channels that are
appropriate for them, understand when the worker is unavailable, and see a durable in-app history.
An admin must be able to configure organization defaults without exposing rule bodies or recipient
data to ordinary members.

The platform must never call an admitted request “sent” before a channel accepts it, infer a
business event from an in-progress task, replay an ambiguous external write, deliver a sensitive
event after authority is revoked, or let one organization's Gateway credential select another
organization. It must keep in-app navigation separate from domain boards such as Workforce and
Workshop. It must reuse current finance, AIBRAINS, assistant-principal, and artifact authorization
rather than creating a stored-SQL or generated-HTML bypass.

This pass-1 contract is based on `scratchnotification-recon.md` and
`scratchnotification-recon.json`: 17 findings, 72 frozen anchors, and 17 zero-mutation baseline
receipts at Hub `a65b28403c5bc1b8ecaa69ad515beb108579c94d`, Gateway
`3e352a68acd396bad09d22309cbab8d82a9cc01d`, and meta
`f45cb024785c3dcc7636f178ef3ebd683a128b71`. It authorizes no source work until two-pass review is
approved.

## 1. Out of scope

- Sending a real email, SMS, chat message, push message, channel notification, or notification to a
  real person during development or qualification.
- Reading or modifying production database state, production cron configuration, channel tokens,
  provider credentials, or live Gateway journals as part of implementation qualification.
- Replacing Workforce assignments, Workshop action cards, browser action feedback, provider
  incident monitoring, or Factory operations incidents with the human notification inbox.
- Treating provider acceptance as proof that a human read a message. A channel that exposes no
  delivery receipt remains `accepted` or `unknown`, never fabricated `delivered`.
- A generic table/column watcher, stored SQL, arbitrary report code, arbitrary HTML email, or a
  prompt whose output is accepted as authority.
- Mobile/native push delivery in this milestone. A later channel may consume the same event and
  effect contracts after separate capability and receipt review.
- Silently enabling every conceivable business event. The initial catalog is the finite set in
  section 3; new kinds require reviewed catalog, schema, audience, privacy, and tests.
- Using the current Vercel route comments as deployment proof. Scheduler deployment and live receipt
  validation are separate release gates.

## 2. AS-IS

### 2.1 Fragmented producers and stores

The generic Hub rule service scans tables and process-registered sources, writes `notif_log` as
`sent`, and only then calls legacy Gateway `channels.send`. The `app_ledger` role has only `SELECT`
and `INSERT` on that log in the QA schema, so its failure update may not repair the false claim.
Legacy Gateway `channels.send` consumes channel, destination, text, and account ID but ignores Hub's
subject and idempotency fields (`NOTIF-001`).

The appointment reminder service inserts `sending` before the external call and considers every
existing status complete, including `sending` and `failed`. A crash, provider rejection, or response
loss therefore suppresses later recovery. Gateway again ignores the stable idempotency value
(`NOTIF-005`).

Join email, direct agent send, finance failure alert, Gateway update fan-out, Pulse cards, toasts,
the bell, Workforce, and Workshop use independent code paths and do not share an outbox, audience
projection, preference model, delivery state machine, or receipt (`NOTIF-008`, `NOTIF-009`,
`NOTIF-010`, `NOTIF-011`, `NOTIF-013`).

### 2.2 Scheduler and cursor state

Hub's deployed-cron declaration contains neither notification nor reminder tick. The system
automation manifest marks both unscheduled since 2026-07-25 even though route comments and product
settings imply runnable automation (`NOTIF-003`). The generic scan is unordered, limits a window to
500, and advances its watermark to current wall time. A burst beyond 500 is skipped forever. Source
registration is process-local, so the runtime and settings UI can expose different rule catalogs
(`NOTIF-004`).

### 2.3 Tenant, audience, and rule authority

Server-token authentication resolves a canonical tenant, but the Pulse proposal route constructs
its database context from a body-controlled `orgId`; the Gateway tool also accepts `orgId` as an
agent argument (`NOTIF-002`). Join requests are org-scoped, while the email recipient query selects
every profile with global role `admin` and sends the applicant's name/email (`NOTIF-014`). The rules
settings page is admin-only, but the rules GET route uses tenant context without the matching rule
management capability and returns recipient/template data. Rule JSON is weakly validated
(`NOTIF-007`). Direct agent sending also admits read capabilities weaker than the tool's declared
`comms:create` authority (`NOTIF-009`).

### 2.4 Requested producer gaps

Low stock is a current level scan with a permanent `threshold` key. It does not re-arm after
recovery and has no hysteresis or rate cap (`NOTIF-006`). Request, approval, denial, and actual
membership activation are not distinct durable events (`NOTIF-015`). No subject-status subscription
registry exists; `identity_subscriptions` is an unrelated provider-identity feature
(`NOTIF-016`). Finance has a scheduled global failure alert rather than a configurable, authorized
daily summary (`NOTIF-013`).

Agent query routes and artifacts have useful current authorization primitives, but no stored report
rule binds a reviewed query, current owner authority, immutable result snapshot, audience, and
delivery receipt. Storing SQL or sending artifact HTML would bypass those boundaries
(`NOTIF-017`). Gateway release update fan-out does not prove an artifact was released, swallows
target failures, and uses a version-wide marker that prevents target-specific retry
(`NOTIF-010`).

### 2.5 Migration reproducibility

The notification and reminder migrations exist in meta history, while Hub's canonical migration
runner applies Hub's own migration directory. The QA snapshot already has the tables and can hide
the gap. Historical commits say the migrations reached production, but this spec has no current
production ledger evidence (`NOTIF-012`).

## 3. TO-BE

### 3.1 Reviewed event catalog

The initial catalog is code-generated or otherwise single-source and revisioned. Hub schema
validation, producer APIs, worker dispatch, settings copy, authorization, template keys, and tests
consume the same registry. Arbitrary table names, column names, conditions, recipient queries, SQL,
and event kind strings are rejected.

The required initial kinds are:

| Kind                            | Commit condition                                                                        | Default audience rule                                         | Sensitive-data rule                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `scheduling.booking.upcoming`   | A specific booking revision remains eligible at a configured window                     | Exact booking participant or explicitly authorized assignee   | External preview contains time and safe label only; detail is an authenticated route |
| `domain.status.changed`         | A canonical subject commits a status transition                                         | Users with an active exact-subject subscription               | Per-domain read capability and row scope are rechecked                               |
| `stock.low.crossed`             | An armed item/warehouse crosses below the configured threshold                          | Configured stock recipients with current stock-view authority | Quantity/cost fields follow current field policy                                     |
| `join.requested`                | An org-scoped request commits                                                           | Candidate user IDs with current `users:manage` in that org    | Applicant PII is excluded from broad external previews                               |
| `join.approved`                 | Approval decision commits                                                               | Exact applicant and configured target-org managers            | Decision is separate from effective role activation                                  |
| `join.denied`                   | Denial decision commits                                                                 | Exact applicant and authorized managers                       | Reason is bounded and policy-filtered                                                |
| `membership.activated`          | Membership and effective roles are durable                                              | Exact user and authorized managers                            | Captures granted role IDs, not tokens or credentials                                 |
| `finance.daily_summary.ready`   | A completed authoritative snapshot is frozen for org/day/currency                       | Configured finance recipients with current finance authority  | Per-recipient field masking; no raw provider failure text                            |
| `stock.daily_summary.ready`     | A stock cutoff snapshot commits movement, crossing, and low-stock sections              | Configured stock recipients with current stock authority      | No monetary valuation unless a separately approved valuation policy owns it          |
| `release.product.published`     | A minor or major product release has an artifact digest and publication receipt         | Every active user, projected per organization                 | Sanitized release-board content and per-user channel preferences                     |
| `release.gateway.available`     | A released artifact has version, digest, publication time, and verified feed provenance | Eligible operators/owners according to release policy         | Sanitized changelog; no build logs or unreleased content                             |
| `automation.schedule.committed` | A schedule revision commits to its source of truth                                      | Exact owner/admin audience for that automation                | In-progress reconciliation never qualifies                                           |
| `automation.run.failed`         | A run reaches a durable failed terminal state                                           | Exact owner/operator audience                                 | Bounded sanitized error class, authenticated diagnostics link                        |
| `automation.effects.committed`  | A run commits declared domain effects and records their immutable event/receipt IDs     | Configured users authorized for every included effect         | A success with no committed effects does not qualify                                 |
| `agent.user_notice`             | An authorized agent admits bounded content for one exact user                           | Exact user                                                    | Current `comms:create`, subject scope, preference, and receipt policy                |
| `agent.report.ready`            | A reviewed catalog query completes and freezes a safe snapshot                          | Explicit exact users or reviewed role audience                | No stored SQL, raw brain evidence, or executable HTML                                |

An extension PR must declare the producer's transaction boundary, subject identity, payload schema,
audience resolver, required capabilities, privacy projection, dedupe identity, navigation resolver,
retention, templates, and test vectors. Registry drift is a CI failure.
`domain.status.changed` additionally declares a finite reviewed subject adapter. Each adapter owns
its allowed states, source transaction, read capability, row-scope resolver, and safe navigation;
the generic kind is not permission to observe arbitrary status columns.

### 3.2 Durable event envelope and outbox

Every Hub event has an immutable `event_id`, `organization_id`, kind, schema version, canonical
subject type/ID/revision, `occurred_at`, source commit/transaction identity, producer ID, stable
dedupe key, bounded payload or payload-reference digest, and catalog revision. Payload size is capped
before materialization; secrets, provider tokens, raw exception objects, message bodies from source
systems, and unnecessary PII are forbidden.

For PostgreSQL-owned business state, the source mutation and outbox insert commit in the same
transaction. A rollback creates no event. A producer that cannot share the transaction must expose
an immutable source receipt that can be reconciled without inventing success. Gateway release events
originate only from its durable released-artifact record. `automation.schedule.committed` originates
only from the durable schedule revision. An admitted job, proposed action, approved action,
in-progress sync, failed publish, or draft build cannot masquerade as the business event.

A product release is global source evidence, not a cross-tenant inbox row. Its reconciler creates a
separate organization-scoped `release.product.published` event for each currently eligible
organization, then uses the normal per-user projection and preferences. The source release receipt
and digest are shared provenance; bodies, reads, dismissals, destinations, and delivery effects stay
organization-scoped.

Outbox consumption is authoritative by row state, never by an event-time high-water mark. A worker
atomically claims currently committed `pending` rows in bounded primary-key pages with
`FOR UPDATE SKIP LOCKED`, lease owner/generation/expiry, and database time. A stale claim is
reclaimable; only its live generation can mark projection complete. Audience projection is
idempotent under `(event_id, recipient_id, projection_kind)`. `occurred_at` and `(occurred_at,
event_id)` remain display/order fields only.

This rule covers the commit-inversion case: transaction A may allocate an earlier timestamp or ID,
transaction B may commit and be fully consumed, and transaction A may commit later. A's row remains
`pending` and is claimed on a later poll. No checkpoint over B can make A ineligible. More than 500
same-timestamp events, that A/B inversion, a crash between pages, and worker replacement all
converge without loss or duplicate projection.

### 3.3 Audience projection and continuing authority

The projector converts an event's audience policy into immutable per-recipient candidate rows. A
role audience snapshots exact user IDs at projection time; a later promotion does not grant access
to old sensitive bodies. Candidate resolution is org-scoped and bounded. Cross-org subject IDs,
users, roles, channels, destinations, or Gateway instances fail closed without existence leaks.

Before inbox read and before each external dispatch, Hub rechecks active membership, event-required
capability, subject-level access, recipient field masking, and destination ownership. Revocation
cancels future publication. An exact-user event still rechecks that the user is bound to the event's
organization and subject. A pending effect binds a verified destination ID and revision; destination
removal or ownership change cancels it rather than sending to a former endpoint. A cancelled
projection never reactivates if authority later returns; a new qualifying event is required.

`join.approved` and `join.denied` use one narrow pre-membership exception. An authenticated applicant
may read the sanitized outcome only when `join_request.user_id` equals the canonical user, the
request organization/ID match the event, and the event exposes only decision state, safe organization
display name, decision time, and a next step. This entitlement confers no organization membership,
role, list, record, or navigation access. Managers still use current target-org `users:manage`.

The projector stores either a bounded per-recipient safe body or an authenticated payload reference.
It never stores one broad role-rendered body and assumes every member may read it. Server-owned
navigation is selected from an allowlisted event resolver; event payloads cannot inject external or
cross-tenant hrefs.

### 3.4 Preferences, channels, time, and digests

Preferences are keyed by user, organization, catalog event kind, and channel. Organization defaults
and user overrides are separate revisions with deterministic precedence. A preference references a
verified destination record; users cannot type an arbitrary phone/address/channel target into a
rule. Preferences include enabled state, locale, IANA timezone, quiet-hours interval, digest cadence,
and bounded rate policy. Events designated mandatory by a separately reviewed security/transaction
policy show that status and cannot be silently disabled.

Time evaluation uses a durable civil-slot identity containing policy revision, timezone, local date,
local time, and fold decision. A daily event runs once across the fall-back fold. A nonexistent
spring-forward time follows the catalog's explicit move-forward or skip policy. Overnight quiet
hours work across date boundaries. Timezone changes invalidate future slots without replaying
settled ones. Catch-up has an exact maximum count and age; an old backlog becomes a visible
degraded state instead of an unbounded loop.

A digest has its own immutable identity and membership table. An event can join at most one digest
for one policy window. Digest assembly rechecks every item and recipient, removes revoked items,
records omissions, and uses an authenticated detail link. Immediate and digest effects cannot both
publish the same event/channel unless the policy explicitly asks for both.

### 3.5 Rule contract

Rule management requires an explicit notification-management capability in addition to canonical
tenant context. Reads, creates, edits, deletes, previews, and test evaluations use the same policy.
Rule records contain a catalog event kind, versioned allowlisted conditions over that kind's typed
fields, explicit audience policy, template key, preference-default policy, and rate policy. Unknown
keys/operators/types, invalid merged patches, forbidden audiences, and stale catalog revisions are
rejected before storage.

A preview uses sanitized fixtures or an exact already-authorized event and produces no outbox,
recipient, inbox, or external delivery row. “Send test” is a separate explicit operation with its
own exact recipient, authorization, durable effect, and non-production provider in automated tests.

### 3.6 Leased delivery effect and Gateway V2 receipt

Each recipient/channel publication has a stable `operation_id` and a state from `pending`,
`claimed`, `accepted`, `delivered`, `failed`, `unknown`, or `cancelled`. The row carries attempt,
bounded next-attempt time, lease owner/generation/expiry, destination revision, payload digest,
Gateway binding, provider receipt class, sanitized error class, and timestamps. Only a live owner and
generation can change an attempt. Database time governs expiry. No database transaction is held over
a Gateway or provider request.

The worker rechecks audience, destination, quiet-hours/digest policy, current canonical
organization-to-Gateway binding, channel account, and lease before dispatch. A Gateway selection
comes from server authority, never a browser, event body, environment fallback, or agent-provided
organization. Loss of authority cancels rather than reroutes.

The last preventable-send boundary is one short database transaction immediately before the RPC. It
locks the effect, rechecks the live lease/generation plus audience, destination, Gateway binding, and
policy revisions, records `dispatch_started_at` and the exact digest, then commits. The provider call
happens after that commit. Revocation after this boundary cannot recall a provider-accepted message.
If it occurs in flight, Hub continues read-only receipt reconciliation, records
`accepted_after_revocation`, `delivered_after_revocation`, or `unknown_after_revocation` for audit,
hides/cancels later Hub publication, and never issues another provider request. An unknown revoked
effect requires operator disposition and is never an automatic resend. UI and acceptance text must
not claim that post-dispatch revocation prevented external delivery.

Gateway exposes a versioned notification-delivery method that requires operation ID, canonical
organization binding, channel/account/recipient reference, bounded text, optional supported subject,
and payload digest. It persists a bounded durable operation receipt before provider work and returns
the same canonical result for a duplicate operation. If the provider supports idempotency or a
message receipt, Gateway binds it to the operation. Response loss is reconciled by reading the exact
Gateway receipt; Hub never blindly resends. Unsupported V2 capability is a visible upgrade state,
with no unsafe fallback to legacy `channels.send` for durable effects.

Provider `accepted` is distinct from human `delivered`. A permanent validated recipient/content
error becomes `failed`; transient transport/availability errors use bounded backoff; ambiguous
provider or connection loss becomes `unknown` until exact receipt reconciliation or operator
disposition. Logging excludes bodies, destinations, credentials, and raw provider objects.

### 3.7 Durable in-app inbox

The inbox is a per-recipient RLS-protected projection with event identity, safe title/summary,
server-resolved navigation, created/read/dismissed timestamps, and status. The bell count is derived
from unread inbox rows. Pagination has a stable cursor. Read/dismiss mutations require exact user,
org, row, and current visibility. If a user loses access, the body and navigation disappear even if
an audit tombstone remains.

Browser toasts remain immediate action feedback. Workforce assignments and Workshop cards retain
their domain stores and controls. A domain may deliberately emit a catalog event, but the inbox does
not query, merge, or mutate those stores implicitly. A failed inbox refresh after a committed read or
dismiss reports `committed-refresh-failed` and does not replay the mutation.

### 3.8 Producer-specific invariants

1. **Upcoming booking:** event identity includes booking revision and reminder window. Cancellation,
   reschedule, participant change, and terminal status invalidate pending effects before dispatch.
2. **Status subscription:** subscription creation and every projection require current subject read
   authority. It stores a reviewed subject-adapter ID, canonical subject ID, and selected
   transitions; guessed IDs reveal nothing.
3. **Low stock:** crossing state is per org/item/warehouse/rule. `low -> recovered above threshold +
hysteresis -> low` creates two events. Oscillation inside the band creates none. A rate cap may
   defer/digest but cannot lose the durable crossing.
4. **Join and membership:** target-manager candidates are org-scoped and require `users:manage`.
   Applicant outcome uses the narrow request-owner entitlement in section 3.3. `join.approved` is distinct from
   `membership.activated`; activation occurs only after membership and effective role authority are
   durable. Invite and request paths use the same activation contract.
5. **Daily finance and stock:** the scheduler freezes an inclusive-start/exclusive-end UTC window
   derived from the organization IANA timezone and local accounting date. Financial rows are grouped
   by stored currency; currencies are never summed or converted by an implicit current rate. The
   finance snapshot declares separate signed fields for non-void invoice/POS sales, discounts,
   taxes, recognized revenue under the versioned finance metric, posted expenses/cost, refunds or
   negative documents, and void/reversal totals. It preserves losses and negative values. The stock
   snapshot declares committed movement counts/quantities, low-stock crossings, and current low-item
   count at the same cutoff; it reports monetary stock value only if an approved valuation policy and
   currency own that field. A source unavailable at cutoff is `unavailable`, never zero. Late
   corrections create a new snapshot revision with explicit reversal/correction fields; they do not
   rewrite a delivered snapshot. Provider/sync failures remain operational incidents.
6. **Automation:** schedule commit, run start, no-op success, committed effects, and run failure are
   distinct. `automation.effects.committed` requires immutable IDs for the exact domain events or
   receipts committed by the run and a bounded safe summary. A run that merely completed, is still
   reconciling, or failed after a partial uncommitted attempt does not emit that event. A
   proposed/approved Pulse action records its own causal chain and emits a business event only after
   the domain commit receipt exists.
7. **Release:** `release.product.published` is projected for every active user, including minor and
   major releases. The sanitized release-board entry remains available to active users; per-user
   preferences control inbox unread alerts, digest, and external channels rather than erasing the
   board provenance. `release.gateway.available` is the operator action for an eligible Gateway.
   Both require actual released version, artifact digest, publication time, feed revision, and
   sanitized bounded notes. Dedupe is product/version + audience + recipient + target, so one failed
   target can reconcile/retry without repeating successful targets.

### 3.9 Agent-defined reports and visuals

A report rule stores a reviewed query-plan revision, schema-validated parameters, owner user/agent
identity, owner authority revision, schedule, audience policy, output template, and retention. A
plan is a DAG of at most eight nodes drawn from a finite query catalog. Allowed transforms are
typed filter, group, aggregate, sort, limit, and arithmetic over declared fields; a join is allowed
only when the catalog declares both canonical keys and output policy. It cannot contain SQL, a tool
prompt treated as policy, an arbitrary route, or executable artifact content.

The first implementation includes `finance.invoice-status-summary.v1`,
`finance.revenue-summary.v1`, `pos.sales-summary.v1`, `stock.daily-summary.v1`, and
`brains.authorized-search.v1`. “Invoice 10 AM” is a real qualification rule: the user selects
`finance.invoice-status-summary.v1`, a daily 10:00 civil time in an IANA timezone, an allowed invoice
window/status filter, exact recipients, and table or chart output. “Report X” is only a user label;
its revision must still compose those approved nodes. The editor displays timezone, next three civil
occurrences, fold/gap policy, estimated maximum cost, recipients, and fields before save. Edit creates
a new immutable revision and cancels unclaimed old slots. Pause prevents new claims immediately. An
already-running query may finish, but a pause recheck before snapshot publication suppresses the
result; an external dispatch already past section 3.6's final boundary follows the after-revocation
receipt rule.

At execution Hub resolves the owner/assistant principal fresh, applies the catalog query's module,
field, row, per-brain, and source permissions, then materializes an immutable result snapshot with
query revision, parameter digest, source cutoff, masking revision, and provenance. Owner revocation
prevents execution. Every recipient is resolved and masked separately before inbox publication or
external dispatch. Recipient revocation before the final boundary prevents publication. A visual
links to an authenticated, org-scoped snapshot rendered under the existing artifact sandbox/context
boundary. `brains.authorized-search.v1` binds explicit brain IDs and reruns `brains:view` plus
per-brain source access; an LLM may summarize frozen authorized rows but may not expand the query,
audience, or source set. External channels receive safe summary text and an authenticated link,
never artifact HTML or raw evidence.

### 3.10 Migrations, RLS, retention, and telemetry

Hub adopts additive migrations for the historical notification/reminder structures and all new
tables. A reconciliation migration distinguishes a clean database from a legacy database whose
tables were applied outside `hub_migrations`; it verifies exact columns, constraints, indexes, RLS,
grants, and versions before recording adoption. It does not blindly replay `IF NOT EXISTS` or infer
that a QA snapshot represents deploy provenance.

All event, audience, preference, subscription, inbox, digest, effect, and report rows have explicit
organization binding, foreign keys, forced RLS where supported, and least-privilege grants. The
runtime role can make only legal state transitions through reviewed functions or constrained SQL.
Partial null states and impossible transitions fail at the database boundary. Payload, attempt,
recipient, schedule, and retention caps are enforced atomically before admission.

Retention separates minimal immutable audit identity from message bodies and report snapshots.
Expired sensitive content is erased or cryptographically retired under policy while dedupe and
receipt evidence remain bounded. Metrics expose counts and lag by kind/state, scheduler heartbeat,
oldest pending age, claims/steals, unknown effects, permanent failures, digest backlog, and sanitized
error class. They never include bodies, destinations, PII, finance values, brain excerpts, tokens, or
raw exceptions.

### 3.11 Executable limits

These are hard version-1 ceilings. Organization settings may lower them. Raising one requires a
catalog/config revision, capacity evidence, and review; a deployment environment variable cannot
silently bypass them.

| Resource                                                         |                                                                                            Version-1 limit | Overflow behavior                                                                                                                          |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical event payload                                          |                                                                 32 KiB UTF-8 after canonical serialization | Reject producer transaction with a typed error before outbox insert                                                                        |
| Per-recipient safe inbox body                                    |                                                                                                8 KiB UTF-8 | Reject projection; use a bounded authenticated payload reference instead                                                                   |
| External rendered body/subject                                   |                                                             8 KiB / 256 bytes before a lower adapter limit | Reject; never silently truncate a digest or security-relevant value                                                                        |
| Candidate recipients per organization event                      |                                                                                                     10,000 | Quarantine event as `audience_overflow`; create no partial audience                                                                        |
| Audience/outbox claim page                                       |                                                                                                   250 rows | Continue by row claims; no event-time cursor                                                                                               |
| Rules per organization / subject subscriptions per user          |                                                                                                  200 / 500 | Typed 409/429 before insertion                                                                                                             |
| Delivery attempts                                                |                              6 new dispatches at 0, 30 seconds, 2 minutes, 10 minutes, 1 hour, and 6 hours | Permanent failure after the sixth proven non-acceptance; an ambiguous attempt becomes `unknown` and is not counted as permission to resend |
| Unknown receipt reconciliation                                   |                                                                   Poll for at most 7 days; no new dispatch | Retain `unknown` for operator disposition                                                                                                  |
| Scheduler catch-up                                               |                                                     100 civil slots and 7 days, whichever is reached first | Visible degraded backlog; no unbounded loop                                                                                                |
| Immediate external rate                                          |     20 per recipient/channel rolling hour, 100 per recipient/channel day, and 10,000 per organization/hour | Defer to the next window or an enabled digest; never drop the durable event                                                                |
| Low-stock immediate rate                                         |                                                                    50 crossings per organization/rule/hour | Remaining crossings join the next digest or remain pending                                                                                 |
| Inbox sensitive body / report snapshot / minimal audit retention |                                                                              180 days / 30 days / 400 days | Erase body/snapshot, keep bounded digest/identity audit; legal hold requires separate policy                                               |
| Report plan                                                      | 8 nodes, 4 source datasets, 10,000 fetched logical rows total, 2,000 output rows, 8 MiB intermediate bytes | Fail before snapshot publication                                                                                                           |
| Report execution                                                 |                                                       30 seconds per data node, 60 seconds total wall time | Cancel query/model work and record sanitized failure                                                                                       |
| Report snapshot / visual artifact                                |                                                             1 MiB canonical data / 5 MiB rendered artifact | Fail; no partial publication                                                                                                               |
| AI report budget                                                 |                          64,000 source tokens, 4,000 output tokens, and USD 1.00 estimated maximum per run | Refuse model call when the configured lower org budget or hard cap would be exceeded                                                       |
| Gateway V2 journal                                               |                                       100,000 receipts and 256 MiB per Gateway; 4 KiB metadata per receipt | Advertise capability unavailable before provider work; never overwrite/recreate evidence                                                   |

Count and byte admissions that can race use one database transaction and the appropriate row/advisory
lock. A universal release is split into organization events, so it never bypasses the per-event
recipient cap. Rate limiting changes dispatch time only; it does not advance the outbox or delete an
inbox item.

## 4. DELTA

| Delta | Transition                                                                                | Findings                      | Proof                                                                                             |
| ----- | ----------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| D1    | Bind Pulse writes to authenticated canonical tenant; remove agent org selection           | NOTIF-002                     | Cross-org server-token HTTP test writes zero rows; valid canonical request persists once          |
| D2    | Scope join audiences and direct-send/rule authority to exact capability and org           | NOTIF-007, 009, 014           | Real hook/route plus disposable-DB negative tests for ordinary member and foreign org             |
| D3    | Reconcile historical migrations and legal runtime grants/state constraints                | NOTIF-001, 005, 012           | Clean and legacy disposable PostgreSQL catalogs both converge and pass exact catalog assertions   |
| D4    | Introduce the reviewed typed catalog and transaction outbox                               | NOTIF-004, 006, 015, 016      | Rollback emits none; commit emits one; catalog/settings/worker hashes match                       |
| D5    | Replace time-only scan with leased row claims and durable scheduler receipts              | NOTIF-003, 004                | A/B commit inversion, 501-row same-time burst, crash/reclaim, catch-up cap, stale schedule UI     |
| D6    | Add per-recipient audience projection with current authority and privacy projection       | NOTIF-007, 014, 016, 017      | Role snapshot, promotion/revocation, row/field/brain/cross-org tests                              |
| D7    | Add preferences, civil-time slots, quiet hours, digests, rates, and exact caps            | NOTIF-006, 008, 013           | DST fold/gap, overnight quiet, timezone change, digest uniqueness and boundary-cap tests          |
| D8    | Add Gateway V2 operation receipts and Hub leased delivery effects                         | NOTIF-001, 005, 009, 010      | Duplicate, response loss, lease steal, late settle/revocation, wrong target, old-server handling  |
| D9    | Project a durable RLS inbox and derive bell/navigation from it                            | NOTIF-008                     | Cross-user/org denial, cursor, read/dismiss, stale refresh, safe href mounted tests               |
| D10   | Migrate reminders and direct agent sends to the effect contract                           | NOTIF-005, 009                | Crash points, ambiguous result, revocation, booking revision/cancel, no legacy fallback           |
| D11   | Implement producers for stock, membership, daily snapshots, effects, and status           | NOTIF-006, 011, 013, 015, 016 | Currency/cutoff/reversal, crossing, applicant, subscription, and committed-effect native tests    |
| D12   | Implement scheduled composable reports, fresh authority, snapshot, and safe artifact link | NOTIF-017                     | Invoice 10:00/Report X, pause/edit, cost caps, masking, brain source, SQL/HTML rejection          |
| D13   | Emit universal and operator events only from releases; reconcile every target             | NOTIF-010                     | Minor/major all-user projection, draft/build negatives, digest positive, partial fan-out recovery |
| D14   | Expose scheduler/delivery health and configurable UX without exposing sensitive details   | NOTIF-003, 008, 011           | Minimum-role mounted tests and Browser Harness release evidence                                   |

## 5. Implementation slices

No slice starts until pass 2 approves this contract. Each source slice uses a separate scoped commit
and review and targets 4–8 focused implementation hours. If discovery makes a slice exceed that
bound, revise and re-review the slice before source work instead of hiding another subsystem inside
it. A security/data slice retains human approval and merge gates.

### Slice 1 — Pulse tenant binding and join audience hotfix

**Topics:** `security`, `permissions`, `test`

Implements D1 and the join portion of D2 only. It is independently releasable: derive the Pulse org
from authenticated server context, reject supplied mismatch, remove org from the agent tool schema,
resolve join recipients inside the target org with current `users:manage`, and add bounded sanitized
logging. Definition of done is the exact cross-org and no-recipient-write matrix, with no real sends.

### Slice 2 — Rule/direct-send authority and migration reconciliation

**Topics:** `security`, `migrations`, `test`

Implements the remaining D2 and D3. Freeze the resolved rules/read/write/preview authority, make tool
and route policy agree, adopt additive Hub migrations, and correct legal runtime transitions/grants.
Both a fresh and a legacy disposable database must pass the exact schema/RLS/grant manifest.

### Slice 3 — Typed catalog and transaction outbox

**Topics:** `data`, `logic`, `test`

Implements D4 without external delivery. Add the registry, immutable envelope, domain-producer API,
outbox row-state claims, caps, and catalog drift guard. Use one harmless internal fixture producer to
prove commit/rollback, A/B commit inversion, 501-row pagination, crash reclaim, and duplicate event
admission.

### Slice 4 — Durable worker scheduling and health

**Topics:** `infra`, `logic`, `test`

Implements D5 scheduler admission, lease/heartbeat, bounded discovery and catch-up, and health
receipts. Enabling a rule with no current runnable worker must be visibly degraded. HTTP routes may
admit durable work but cannot hold a serverless request open as the worker. Deployment remains a
separate release gate.

### Slice 5 — Audience projection

**Topics:** `security`, `data`, `test`

Implements D6 for exact-user and role audiences, current authority rechecks, per-recipient safe
payloads, and server navigation. It does not yet send externally. Native tests prove cross-org,
promotion, revocation, membership loss, subject loss, field masking, and atomic audience caps.

### Slice 6 — Preferences and verified destinations

**Topics:** `data`, `permissions`, `test`

Implements the preference portion of D7: org defaults, user overrides, event/channel selection,
verified destination revisions, locale/timezone storage, mandatory-policy display, count/byte caps,
and authority rechecks. It does not schedule or send. Native and service tests cover precedence,
destination transfer/removal, cross-org references, and atomic boundaries.

### Slice 7 — Civil time, quiet hours, rates, and digests

**Topics:** `logic`, `edge-case`, `test`

Completes D7 with civil-slot identity, gap/fold policy, overnight quiet hours, bounded catch-up,
immediate/digest exclusivity, digest membership, and exact rate limits. Deterministic property and
table tests cover DST transitions, timezone edits, pause/resume, old backlog, and cap boundaries.

### Slice 8 — Gateway V2 receipt protocol

**Topics:** `security`, `logic`, `test`

Implements the Gateway half of D8 with version negotiation, canonical org/Gateway binding, durable
bounded operation journal, provider receipt classification, exact duplicate response, sanitized
telemetry, and corruption/capacity failure behavior. Hub compatibility tests prove that an old or
degraded Gateway becomes an honest unavailable/upgrade state without legacy fallback. The additive
shared protocol runtime/declarations are packaged and tested against Hub plus the unchanged Site and
Paperclip consumers before adoption; source-only types do not count as runtime compatibility proof.

### Slice 9 — Hub delivery effects

**Topics:** `data`, `logic`, `test`

Implements the Hub half of D8: lease/generation, final admission transaction, current
audience/destination recheck, quiet/digest decision, six-attempt policy, exact receipt reconciliation,
after-revocation dispositions, and legal settlement. Fake-Gateway tests cover every crash boundary
before any producer migrates.

### Slice 10 — Reminder and direct-send migration

**Topics:** `logic`, `permissions`, `test`

Implements D10 by moving one scheduling reminder path and `agent.user_notice`/`notify_user` behind
the effect contract. It preserves booking revision/cancellation checks and requires current
`comms:create` plus exact recipient scope. Legacy dispatch is disabled for migrated operations; no
dual-send or fallback is permitted.

### Slice 11 — In-app inbox and settings UI

**Topics:** `ui`, `permissions`, `test`

Implements D9 and the user-facing part of D14. Add stable inbox pagination, unread bell, read/dismiss,
safe links, per-event/channel settings, stale scheduler/delivery states, and accessible empty/error
states. Preserve Workforce, Workshop, and action-feedback ownership. Run design-token governance,
mounted minimum-role tests, and parent-owned Browser Harness evidence.

### Slice 12 — Upcoming booking and stock producers

**Topics:** `logic`, `data`, `test`

Implements the booking and stock parts of D11. Booking windows bind revision, participant, status,
reschedule, and cancellation. Stock uses crossing/recovery/hysteresis, immediate-rate/digest policy,
and the stock daily snapshot. Both share their source transaction or a reviewed immutable receipt.

### Slice 13 — Membership and subject-status producers

**Topics:** `security`, `logic`, `test`

Implements the join/request/decision/activation and reviewed subject-adapter parts of D11. It includes
the narrow applicant entitlement, target-manager scope, invite convergence, subscription admission,
status transition selection, access-loss behavior, and safe navigation.

### Slice 14 — Finance and automation summaries

**Topics:** `data`, `logic`, `test`

Completes D11 with per-currency finance snapshots, stock/finance daily digest composition,
cutoff/timezone/reversal semantics, schedule-commit events, run-failure events, and
`automation.effects.committed` receipt linkage. No-op and in-progress runs are mandatory negatives.

### Slice 15 — Agent reports and visuals

**Topics:** `security`, `data`, `test`

Implements D12 with the five initial query nodes, the eight-node composable plan, “Invoice 10 AM” and
“Report X” fixtures, timezone confirmation, revision/edit/pause behavior, fresh assistant/owner
authority, per-recipient masking, exact cost/time/row caps, immutable snapshots, AIBRAINS source
checks, and authenticated artifact links. Stored SQL, prompt authority, raw evidence, and external
HTML are mandatory negatives.

### Slice 16 — Universal and Gateway release notifications

**Topics:** `security`, `logic`, `test`

Implements D13 from an actual released-artifact record with version/digest/publication provenance.
It projects sanitized minor/major product release events to every active user under per-user
preferences and separate actionable Gateway events to eligible operators. Per-target receipts allow
exact retry/reconciliation. Draft, build, detected update, failed release, inactive user, wrong
operator audience, and already-successful target are mandatory negatives.

## 6. Verification

### 6.1 Source and contract gates

- Freeze a machine-readable event catalog and generate or validate Hub schema, settings, worker,
  audience, navigation, and template consumers from it. Delete/rename/type drift must fail CI.
- Maintain an exact route/tool/capability inventory for rule management, inbox mutations, direct
  notification, Pulse, report management, and Gateway V2. Test the real hook/handler path, not source
  strings alone.
- Validate every migration in a clean disposable PostgreSQL database and a legacy fixture containing
  the historical notification/reminder shapes without matching `hub_migrations` rows.
- Assert exact constraints, RLS enable/force state, policies, grants, indexes, FKs, partial
  constraints, legal state transitions, and caps from the live catalog.

### 6.2 Native PostgreSQL matrix

Use two independent connections and fake provider/Gateway adapters. Mandatory cases:

1. Source transaction rollback creates no outbox event; commit creates exactly one.
2. Two producers racing one dedupe identity admit one event and preserve the winning source revision.
3. Transaction A inserts an outbox row and waits; transaction B inserts, commits, and is consumed;
   then A commits. A is claimed on the next poll despite its earlier event time/ID. A separate 501-row
   same-time burst is fully projected across 250-row claims; crash/lease expiry reclaims only
   unfinished rows.
4. Two workers race claim, expiry, steal, renewal, and settlement. The stale generation cannot
   project, advance, accept, fail, cancel, or settle after replacement.
5. A current role audience projects only org members. Promotion after projection does not reveal the
   old item; revocation before inbox read or dispatch hides/cancels it.
6. Cross-org subject, user, role, preference, destination, Gateway, inbox, subscription, and report
   IDs fail under forced RLS and write zero rows.
7. Runtime-role legal transitions succeed, while direct forbidden `sent`/`delivered` fabrication and
   illegal partial lease states fail.
8. Low-stock concurrent writes create one crossing; recovery plus hysteresis re-arms; band
   oscillation creates none; rate cap defers without losing the event.
9. Join request selects only current target-org `users:manage` recipients. The exact applicant can
   read only their sanitized approved/denied result through request ownership while still lacking
   membership, and cannot enumerate or navigate the org. Approval without effective role emits no
   activation. Retry or invite convergence emits one activation.
10. Status subscribe and projection both require current exact-subject access; revocation between
    them prevents inbox and delivery.
11. Daily snapshots freeze one local-day UTC window and keep PEN/USD/other currencies separate.
    Non-void sales/revenue, signed negatives, discounts, tax, expense/cost, refunds, void/reversal,
    low-stock crossings, late corrections, and unavailable sources match the declared metric
    revision. In-progress/failed sync and foreign currency/org scope emit no summary.
12. Every numerical boundary in section 3.11 is tested at limit and limit + 1. Two connections racing
    recipient/count/byte admission cannot both exceed an org or global cap; rejection occurs before
    partial rows.

No native case may skip when its lane is selected. The lane must require an identified disposable
database marker and refuse production-shaped or unmarked URLs.

### 6.3 Gateway and ambiguity matrix

- Duplicate V2 operation before provider call, during call, after provider acceptance, after journal
  commit, and after response loss returns/reconciles one canonical receipt.
- A provider that supports an idempotency key receives the exact stable operation ID. A provider that
  does not support it records that limitation and never upgrades `accepted` to `delivered`.
- Permanent recipient/content rejection, transient transport failure, timeout, shutdown, journal
  full/corrupt/unreadable, wrong org, wrong Gateway, wrong account, changed destination, and missing
  V2 capability each return distinct bounded classes and do not expose secrets or bodies.
- Hub loses its response, polls the exact operation, and does not send again. A mismatched payload
  digest under an existing operation is a conflict, not a replay.
- Revoke the recipient after Hub's final admission commit while the fake provider is blocked, then
  release a provider-accepted result. Hub records `accepted_after_revocation`, hides/cancels later
  Hub publication, and performs no second dispatch. Repeat with response loss and require
  `unknown_after_revocation`, read-only reconciliation, and no resend.
- Gateway release fan-out proves successful targets are not repeated while failed/unknown targets
  retain independent recoverable effects.

### 6.4 Time-policy matrix

- Test spring-forward missing time, fall-back duplicate time, both explicit fold choices, overnight
  quiet hours, locale date boundary, timezone change with pending items, bounded old backlog,
  immediate-versus-digest exclusivity, and digest recipient revocation.
- Use deterministic clocks and multiple IANA zones. Randomized civil-date vectors must compare
  against a small independent reference, not the production helper itself.
- A mutation canary that removes fold identity or changes the stable slot key must fail.

### 6.5 HTTP, service, and UI matrix

- Pulse server token for org A plus body org B returns 403 before card parsing and writes zero rows.
- Rule GET/write/preview, direct agent send, inbox read/dismiss, subscription, report rule, and
  settings routes test admin/member/minimum-role, foreign org, stale tab, membership loss, and
  capability refresh using the real handler/hook chain.
- Mounted UI proves restricted users cannot see or operate gated controls, while a stale client still
  receives server denial. Preference and inbox state refresh after capability/org changes.
- Inbox tests cover stable pagination, unread count, safe navigation, missing target, body expiry,
  committed read/dismiss plus failed refresh, empty/degraded/offline states, and keyboard/screenreader
  behavior.
- Settings show current worker heartbeat, next run, stale/blocked state, quiet-time interpretation,
  verified destination, and delivery state without raw provider detail.

### 6.6 Producer and report matrix

- Booking reschedule/cancel/status/participant revisions cancel or supersede pending upcoming
  effects; a late worker cannot publish the old revision.
- A proposed or approved Pulse action without a domain commit creates no business event. A committed
  action links proposal, approval, execution receipt, and event without treating them as one state.
- Automation emits schedule commit only after durable commit; admitted/in-progress/failed attempts
  use their own state and cannot claim the new schedule is active. A committed-effects event names
  exact domain receipts; no-op success and rolled-back/partial effects emit none.
- “Invoice 10 AM” confirms timezone and next three occurrences, edits to a new revision without
  replay, pauses before claim, and suppresses a finished query paused before publication. “Report X”
  composes allowed finance/POS/stock/brain nodes within eight-node, row, byte, wall-time, and USD
  limits. Creator revocation before query prevents execution. Recipient revocation after snapshot but
  before final publication admission prevents inbox/dispatch. Finance masking and AIBRAINS
  per-source denial apply independently per recipient.
- Stored SQL, unknown query ID, invalid params, excessive result, raw brain excerpt, arbitrary href,
  artifact HTML attachment, and expired snapshot all fail closed.
- Release tests reject draft commits, successful builds without publish, failed publish, missing
  digest, unsanitized markup/link schemes, ineligible version/audience, and global-version-only
  dedupe. A genuine minor and major release each project one organization event, then one preference-
  controlled item per active user. The operator-only Gateway action reaches only eligible operators,
  and successful targets are not repeated during partial fan-out recovery.

### 6.7 End-to-end qualification and release evidence

Run credentials-free fixtures through: source commit -> outbox -> audience projection -> inbox ->
preference/time decision -> delivery claim -> fake Gateway V2 -> canonical receipt -> Hub settlement.
Then inject response loss and revoke recipient authority before reconciliation. The final state must
contain the durable event and audit identities, no visible/retryable publication for the revoked
recipient, and no second provider call. The receipt remains honestly
`accepted_after_revocation`/`delivered_after_revocation` when the fake provider proves acceptance, or
`unknown_after_revocation` when it cannot; the test never claims the external side effect was undone.

Before merge, the independent reviewer traces every D1-D14 invariant to final source and tests. Before
release, parent-owned Browser Harness evidence captures the real settings, inbox/bell, degraded
scheduler, unknown/failed delivery, and safe navigation states. Deployment evidence must record the
released Hub/Gateway revisions, applied migration ledger, worker schedule identity, heartbeat, and
Gateway V2 capability. A fake-adapter local pass is implementation proof; it is not live delivery
proof. No production channel is exercised without a separately approved concrete test plan and exact
test recipient.

## 7. Finding closure map

| Finding   | Required deltas | Earliest closure evidence                                         |
| --------- | --------------- | ----------------------------------------------------------------- |
| NOTIF-001 | D3, D8          | Legal grant/state catalog plus response-loss receipt test         |
| NOTIF-002 | D1              | Cross-org token/body denial with zero writes                      |
| NOTIF-003 | D5, D14         | Deployed durable worker receipt and degraded-state UI             |
| NOTIF-004 | D4, D5          | Commit-inversion plus 501-row row-claim native fixtures           |
| NOTIF-005 | D8, D10         | Stale claim/unknown result reconciliation without resend          |
| NOTIF-006 | D4, D7, D11     | Crossing/recovery/hysteresis/rate tests                           |
| NOTIF-007 | D2, D6          | Exact capability registry and rule-body denial                    |
| NOTIF-008 | D9              | RLS inbox, bell/read/dismiss, safe navigation proof               |
| NOTIF-009 | D2, D8, D10     | Matching create authority and effect receipt                      |
| NOTIF-010 | D8, D13         | Attested universal/operator release plus per-target recovery      |
| NOTIF-011 | D5, D11         | Settings-to-job reconciliation and committed-action receipt chain |
| NOTIF-012 | D3              | Fresh/legacy canonical migration qualification                    |
| NOTIF-013 | D7, D11         | Completed snapshot, timezone, audience/masking tests              |
| NOTIF-014 | D2, D6          | Target-org manager-only native/service proof                      |
| NOTIF-015 | D4, D11         | Separate decision/activation events and retry convergence         |
| NOTIF-016 | D6, D11         | Subject subscription plus access-loss proof                       |
| NOTIF-017 | D6, D12         | Fresh creator/recipient authority and immutable safe snapshot     |

No finding is closed by source existence, a settings checkbox, an admitted job, a mocked always-green
test, a skipped native lane, or an external request with no canonical receipt.
