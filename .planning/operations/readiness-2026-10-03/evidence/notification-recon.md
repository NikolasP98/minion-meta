---
id: notifications-recon-2026-10-03
title: Hub and Gateway notification readiness reconnaissance
stage: research
status: review
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub, minion, minion-meta]
tags: [data, logic, security, test]
type: audit
verdict: action-required
---

# Hub and Gateway notification readiness reconnaissance

## 0. Product and evidence boundary

This is a read-only reconstruction of the notification surfaces in Hub, Gateway, and the meta
history. It covers notification rules, appointment reminders, join-request email, Pulse cards,
Gateway agent sends, release-update fan-out, finance failure alerts, the bell and notification page,
toasts, Workforce assignment inboxes, workshop cards, current query authorization, and artifact
rendering. It also traces the requested future cases: upcoming events, record-status subscriptions,
low stock, new-user lifecycle events, financial daily summaries, released revisions, committed cron
changes, and agent-authored reports or visuals.

The frozen source baselines are:

| Repository | Commit                                     | Working-tree boundary                                                                                                                     |
| ---------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Hub        | `a65b28403c5bc1b8ecaa69ad515beb108579c94d` | Concurrent POS and shared-session work is excluded; notification anchors were checked against the commit.                                 |
| Gateway    | `3e352a68acd396bad09d22309cbab8d82a9cc01d` | Concurrent lifecycle work changes update-notify timer disposal only. Release, audience, receipt, and retry findings use committed source. |
| Meta       | `f45cb024785c3dcc7636f178ef3ebd683a128b71` | Concurrent readiness-report work is excluded; migration and historical design evidence uses committed files.                              |

No production database, provider, channel, cron, Hub route, Gateway RPC, user, or browser was
mutated. No message or notification was sent. Business mutation count is **zero**. This recon does
not prove the current production migration ledger, cron deployment, provider account state, or UI
appearance. Those remain explicit release-time evidence gates.

The machine-readable companion is `scratchnotification-recon.json`. It contains 17 stable finding
IDs, 72 frozen source anchors, one zero-mutation baseline receipt per finding, acceptance criteria,
and proposed implementation slices.

## 1. Outcome

The product has several notification-shaped surfaces, but it does not have one durable notification
system. The generic rule engine and the scheduling reminder engine both claim completion before a
provable delivery and both are currently absent from the production cron registry. Join email,
finance failure alerts, direct agent sends, release notifications, Pulse cards, browser toasts,
Workforce assignments, and workshop cards each use separate authority, retry, audience, and storage
rules.

Three findings require security or data-boundary correction before broader notification features:

1. A server-authenticated Pulse request can use a body-controlled organization rather than its
   canonical credential tenant (`NOTIF-002`).
2. Join-request email selects global profile admins instead of managers in the requested
   organization and exposes applicant identity across tenant boundaries (`NOTIF-014`).
3. Notification rule definitions and recipient/template details are readable under ordinary tenant
   context even though the settings page is admin-only (`NOTIF-007`).

Delivery correctness also needs a shared foundation. The generic engine marks a record `sent`
before the Gateway call, the runtime role may be unable to record failure, and Gateway ignores the
operation identity (`NOTIF-001`). Reminders treat `sending` and `failed` as permanently complete
(`NOTIF-005`). A busy rule can discard every candidate after an unordered first 500 and then move
its watermark past them (`NOTIF-004`). These are independent loss paths, so adding more producers
to either current engine would expand the blast radius.

## 2. AS-IS system inventory

| Surface                     | Producer and storage                                                                                            | Audience and authority                                                              | Delivery and receipt                                                                      | Current product truth                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Generic notification rules  | `notif_rules` scans tables or process-registered sources; `notif_log` is used as both dedupe and delivery claim | Rule rows carry recipient/channel/template fields; API GET uses tenant context only | Row is inserted as `sent` before `channels.send`; failure repair is not reliably writable | Unscheduled; lossy over 500 candidates; no durable inbox                          |
| Scheduling reminders        | Derives booking windows and inserts a unique `sched_reminder_log` row                                           | Booking recipient/channel configuration                                             | Claims `sending`, calls Gateway, then updates; all prior statuses suppress later work     | Unscheduled; failed, crashed, and ambiguous sends are not reclaimed               |
| Join-request email          | Emitted after an org-scoped request insert                                                                      | All profiles with global `admin` role                                               | Best-effort email, no durable recipient effect or applicant outcome                       | Cross-org audience defect; only request creation is represented                   |
| Pulse proposal cards        | Gateway tool posts action cards to Hub                                                                          | Server token exists, but route consumes body `orgId`                                | Hub persists a card; approval does not prove that a proposed action executed              | Tenant substitution is possible; settings do not schedule a briefing              |
| Agent `notify_user`         | Gateway tool calls Hub route                                                                                    | Tool metadata asks for `comms:create`; route admits weaker read capabilities        | Direct `channels.send` with a timestamp key; subject is discarded by Gateway              | Bypasses preferences, durable receipt, quiet hours, and inbox                     |
| Gateway release update      | Gateway checks update metadata and fans out on connected channels                                               | Every eligible connected target                                                     | Per-target failures are swallowed; a version-wide state record suppresses retry           | No released-artifact attestation, sanitized changelog audience, or target receipt |
| Finance daily route         | Scheduled daily finance sync emits only failure text                                                            | Global environment channel and destination                                          | Best-effort Gateway send; separate Factory incident intake                                | Operations alert, not a configurable financial summary                            |
| Bell and notifications page | Derived from join request count, Pulse proposals, and update state                                              | Current UI user/admin context                                                       | Browser state and popups                                                                  | Not a durable user inbox; Workforce and workshop stores are separate domains      |
| Workforce inbox             | Assignment/role workflow                                                                                        | Workforce-specific role and assignment rules                                        | Own persisted workflow                                                                    | Must remain a separate domain, not be silently relabeled as notifications         |
| Workshop inbox              | Canvas-local action cards                                                                                       | Workshop/page context                                                               | Local state                                                                               | Must remain separate unless a typed producer deliberately projects a human event  |
| Browser toasts              | Immediate success/failure feedback                                                                              | Current browser                                                                     | Ephemeral                                                                                 | Useful feedback, but not a receipt or recoverable inbox item                      |

### Scheduling reality

`vercel.json` has no notification or reminder tick. The canonical system-automation manifest records
that both were removed on 2026-07-25 and remain unscheduled. Route comments and settings copy still
describe runnable automation. Enabling a rule or reminder therefore does not establish a worker,
heartbeat, next-run time, or failure state.

### Storage and migration reality

The generic notification and reminder migrations are committed in the meta repository, while Hub's
deployment runner reads Hub's own `supabase/migrations` directory. Hub's QA schema snapshot already
contains the structures, which can make local tests pass even when a clean Hub migration cannot
reproduce them. Historical commits state that the migrations were applied to production, but this
recon did not read the production migration ledger and does not treat those commit messages as
current live proof.

### Current authorization primitives worth preserving

The existing Gateway finance query resolves a fresh assistant principal, checks the finance
capability, and applies field masking. Brain search checks both `brains:view` and source-level access.
Artifact data is kept behind an authenticated same-origin context and rendered in a sandbox. Those
are suitable building blocks for report notifications. A future scheduler must re-run those checks;
it cannot reuse the creator's authority or send generated HTML, raw brain evidence, or stored SQL.

## 3. Requested event coverage

The requested feature set is finite enough to define a typed initial catalog without inventing an
open-ended list:

| Event kind                      | Required source-of-truth transition                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scheduling.booking.upcoming`   | A durable booking revision is in a configured upcoming window and remains eligible after cancellation/status recheck.                                        |
| `domain.status.changed`         | An authorized subject's status changes from a captured prior value to a committed new value. Subscribers are subject-scoped.                                 |
| `stock.low.crossed`             | Quantity crosses below the threshold from an armed state; recovery plus hysteresis re-arms it.                                                               |
| `join.requested`                | An organization-scoped access request commits.                                                                                                               |
| `join.approved`                 | The request decision commits; this is not yet proof of usable membership.                                                                                    |
| `join.denied`                   | A denial commits for the exact request and applicant.                                                                                                        |
| `membership.activated`          | Both membership and effective role authority are durable. Invite and request origins converge here.                                                          |
| `finance.daily_summary.ready`   | An authoritative finance snapshot finishes and is frozen for the exact day/org/currency scope.                                                               |
| `release.gateway.available`     | A released artifact with digest/version provenance exists for an eligible audience. Draft, build, or merely detected source changes do not qualify.          |
| `automation.schedule.committed` | A durable schedule revision commits. An in-progress task or failed reconciliation emits a different operational state and never claims the schedule changed. |
| `automation.run.failed`         | A durable automation run reaches a failed terminal state with bounded, sanitized diagnostics.                                                                |
| `agent.report.ready`            | A catalog query finishes under fresh creator authority and produces an immutable, audience-safe result snapshot.                                             |

Catalog extension must be reviewed code and migration data, not arbitrary table and column input.
The settings UI, worker, schema validator, authorization map, and tests must consume the same catalog
revision.

## 4. Security, privacy, and audience contract needed

A role label alone is not a safe historical audience. A producer should resolve candidate user IDs
inside the organization when it projects an event. Before inbox visibility or external dispatch,
the system must recheck active membership, the event-specific capability, and subject-level access.
A newly promoted user must not automatically inherit old sensitive event bodies, and a revoked user
must not receive a pending external delivery. Exact-user lifecycle events still require current
organization and subject binding.

Sensitive bodies should be projected per recipient with current field masking. External previews
should contain minimal safe text and an authenticated Hub link. Logs and telemetry may carry event
kind, state, latency, bounded error class, and hashed operation/recipient IDs; they must not carry
message bodies, applicant data, finance values, brain excerpts, channel credentials, or raw provider
errors.

Release notification content must come from an actually released revision and must use sanitized
changelog content. Dedupe is per released version, audience, recipient, and target, not one global
version marker. A draft PR, build completion, update detection, or failed publish must not produce a
release event.

## 5. Time, preference, and frequency gaps

No common model currently stores per-user and per-organization event/channel preferences, verified
destination references, IANA timezone, locale, quiet hours, digest cadence, rate limits, or delivery
fallback. Time rules need civil-slot identities and an explicit DST policy. A fall-back fold must not
double-send one daily digest. A nonexistent spring-forward time must either advance under a declared
policy or visibly skip. Overnight quiet hours, bounded catch-up, timezone changes, and daylight
transitions need deterministic tests.

Low stock additionally needs threshold crossing, hysteresis, recovery re-arm, and rate caps. A
permanent `threshold` key cannot represent repeated real shortages. Financial daily summaries need
an org-local day, explicit currency/field scope, and a frozen completed snapshot; sync failures stay
in the operational incident path.

## 6. Agent reports and visual artifacts

An agent-authored rule may select only a reviewed query catalog ID plus validated parameters. It may
not store SQL or a provider/tool prompt as executable authority. At execution the worker resolves the
creator again, applies the query's capability and data-scope rules, and freezes an immutable redacted
result with query revision, input digest, source cutoff, and authorization provenance. It then
resolves each recipient again before publication. Visual notifications link to that authenticated
snapshot; they do not email artifact HTML or copy raw AIBRAINS evidence into a channel.

Approval of a Pulse proposal is also not an execution receipt. A proposed action, an approved action,
a committed business mutation, and a delivered notification are four separate states. Each needs
its own immutable identity and causal link.

## 7. Test and maintainability concerns

Current tests mostly cover pure condition/template functions, import registration, missing Pulse
authentication fields, and email no-op behavior without a provider key. They do not exercise the
database grants, forced RLS, two-worker claim races, response loss, provider duplication, 501-row
pagination, cross-org join audiences, role revocation, migration reconciliation, or DST behavior.

Notification work should not make existing large files larger. At the frozen Hub commit,
`stock.service.ts`, the central RBAC service, and `hooks.server.ts` already span broad concerns.
Implementation should use bounded modules for the typed event catalog, outbox, audience projection,
delivery effects, time policy, preferences, inbox, and producer adapters. Gateway operation receipts
belong in a dedicated delivery method/module rather than expanding legacy `channels.send` semantics
without version negotiation.

Qualification must use fake channel/provider adapters and disposable PostgreSQL. It must never send
to a real person or reuse live credentials. Browser screenshots for current and final UI are a
separate parent-owned Browser Harness gate and are not claimed by this recon.

## 8. Prioritized delivery slices

1. **S0 — security and schema reconciliation:** bind Pulse to its authenticated organization, fix
   join audience selection, protect notification-rule definitions, reconcile Hub-owned migrations,
   and correct ledger grants/state claims.
2. **S1 — durable event foundation:** reviewed typed catalog, transaction outbox, stable cursor,
   scheduler admission and heartbeat receipts, bounded catch-up, and producer contract.
3. **S2 — delivery effects:** leased/fenced attempts, Gateway V2 operation receipts, unknown-result
   reconciliation, reminder migration, and direct-send migration.
4. **S3 — human inbox and preferences:** RLS-scoped inbox, safe navigation, read/dismiss state,
   verified destinations, quiet hours, timezone, digest, rate cap, and rule builder.
5. **S4 — requested business producers:** upcoming bookings, status subscriptions, low-stock
   crossings, join/membership lifecycle, finance snapshots, and automation outcomes.
6. **S5 — agent reports:** catalog queries, fresh creator/recipient authority, immutable result
   snapshots, and authenticated visual links.
7. **S6 — releases:** released-artifact attestation, sanitized changelog projection, audience
   eligibility, per-target receipts, and retry/reconciliation.

S0 findings are independently repairable and should not wait for the full platform. S1 must precede
new producers. S2 must precede moving reminders or direct agent sends. S3 can read durable events
before every external channel is enabled. S5 and S6 remain gated on their source-specific release
and authorization contracts.

## 9. Findings

The JSON companion is the machine truth for dropdown rendering and automated tracking. The table
below is the human index.

| ID          | Priority | Status        | Finding                                                                        | Slice |
| ----------- | -------: | ------------- | ------------------------------------------------------------------------------ | ----- |
| `NOTIF-001` |       P1 | confirmed new | Generic engine records sent before delivery and cannot reliably record failure | S0    |
| `NOTIF-002` |       P1 | confirmed new | Gateway Pulse token can insert cards into an arbitrary organization            | S0    |
| `NOTIF-003` |       P1 | confirmed new | Notification and reminder settings are enabled while ticks are unscheduled     | S1    |
| `NOTIF-004` |       P1 | confirmed new | Busy rules silently discard candidates after the first 500                     | S1    |
| `NOTIF-005` |       P1 | confirmed new | Reminders permanently suppress failed, crashed, and ambiguous sends            | S2    |
| `NOTIF-006` |       P2 | confirmed new | Low-stock alerts are permanent level alarms instead of re-armable crossings    | S4    |
| `NOTIF-007` |       P1 | confirmed new | Rule data is member-readable and weakly validated                              | S0/S3 |
| `NOTIF-008` |       P2 | confirmed gap | Bell, page, and toast state are not a durable inbox                            | S3    |
| `NOTIF-009` |       P1 | confirmed new | Agent direct send bypasses policy and has mismatched authority                 | S0/S2 |
| `NOTIF-010` |       P1 | confirmed new | Release fan-out is best-effort with version-wide loss                          | S6    |
| `NOTIF-011` |       P2 | confirmed gap | Pulse settings do not create briefings and approvals lack execution receipts   | S4    |
| `NOTIF-012` |       P1 | confirmed new | Hub's canonical migration directory omits notification/reminder migrations     | S0    |
| `NOTIF-013` |       P2 | confirmed gap | No configurable financial daily summary exists                                 | S4    |
| `NOTIF-014` |       P1 | confirmed new | Join-request email crosses organization boundaries                             | S0    |
| `NOTIF-015` |       P2 | confirmed gap | Requested, approved, denied, and activated are not durable separate events     | S4    |
| `NOTIF-016` |       P2 | confirmed gap | No status-subscription registry exists                                         | S4    |
| `NOTIF-017` |       P2 | confirmed gap | Agent reports and visuals lack durable authority and audience provenance       | S5    |

Every finding has its full summary, impact, frozen anchors, baseline receipt, remediation, and
falsifiable acceptance checks in `scratchnotification-recon.json`.

## 10. Evidence limits and open verification

- Production migration state, deployed cron state, Gateway version, channel account configuration,
  and provider delivery semantics were not queried.
- No current UI screenshot is included. Parent-owned Browser Harness capture should show the rule
  settings, notifications page/bell, Pulse settings, join workflow, and any final degraded-scheduler
  or delivery-state UI.
- No live notification or reversible real-data mutation was needed for this recon.
- Historical commit messages that say a migration was applied are provenance, not proof of today's
  database catalog.
- Provider acceptance does not necessarily prove end-user delivery. The contract therefore keeps
  `accepted`, `delivered`, and `unknown` distinct.

The corresponding implementation contract is `spec-notifications.md`. It is a pass-1 draft and may
not authorize source edits until an independent standards review and an independent spec/source
trace both approve pass 2.
