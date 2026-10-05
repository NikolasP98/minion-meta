---
id: 2026-10-03-notification-recon
title: Durable configurable notifications and agent reports
status: in-spec
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub, minion, minion-meta]
tags: [security, data, logic, ui, test]
effort: L
source: user-requested-notification-platform-2026-10-03
---

# Notifications and agent reports

The user explicitly authorized recon and full implementation alongside every readiness finding.
This supplies the implementation approval for this security/data scope. Merge, production migration,
and real external delivery remain separate from local qualification. No real notification has been
sent by this program.

## AS-IS

The October3 source recon records18 findings with76 frozen anchors and17 read-only receipts in
[the notification evidence](../.planning/operations/readiness-2026-10-03/evidence/notification-recon.json).
Hub, Gateway and legacy notification paths disagree about delivery status, authority, recipients,
scheduler state, durable storage and release provenance. The generic engine claims sent before
delivery, Pulse ingestion trusts a body-owned organization, and join email selects global admins.
Reminders suppress failed/uncertain effects; rule scans lose overflow; no unified configurable
user inbox or authorized scheduled-report contract exists. Source facts do not prove current
production scheduler/database/provider state.

## TO-BE

Users configure event kinds, channels, schedules, quiet hours and digests. Exact-user, current-role
and universal release audiences receive only content they may access. New-user lifecycle, upcoming
appointments, status subscriptions, stock crossings, tangible committed automation outcomes and
daily sales/revenue/expense/stock summaries produce durable events. Minor/major release notices
link to a safe changelog board. Agent-defined reports use authorized database/Gateway/AI Brains
queries, bounded visual artifacts and a clear civil-time schedule. Notifications link to an
allowed application destination or an authenticated report/message board.

Pending, provider-accepted, delivered, failed and unknown effects remain distinct. Receipts,
revocation boundaries, tenant isolation, observed worker health and source provenance are visible.
The UI refreshes without hard reloads, and errors preserve user settings and intent.

## DELTA

The program register now contains NOTIF-001 through NOTIF-018, with priorities, evidence, required
proof and implementation ownership. A bounded tenant-boundary correction has its own specification
and review; the larger feature specification covers catalog/outbox, worker leases, audience,
preferences/destinations, civil time/digests, Gateway receipts, inbox/settings, business producers,
reports and releases. Each slice requires Standards and Spec passes, meaningful failing controls,
focused and native qualification, then parent blast-radius review. Actual UI captures are attached
to each applicable finding; draft screens never count as production evidence.

## Open boundaries

The current join email remains best-effort until the durable outbox slice replaces it. Any interim
source correction must carry TODO(handoff) pointing here. Provider acceptance cannot be undone by
later revocation; the final dispatch check and subsequent receipt disposition must be explicit.
Unknown outcomes never authorize blind resend. Production sends are not test fixtures.

This proposal stays open until every notification finding and requested feature has its own
verified implementation and the remaining release/runtime work is explicitly recorded.

## Current implementation checkpoint

Slice1 tenant/audience, Slice1b truthful pending identity and Slice2 fresh configuration authority passed local source review. Slice2 legacy migration reconciliation passed10 native cases and parent review; combined integration/release gates remain open. Slice3 typed catalog/outbox has36 focused passing cases and a first13-case native pass, but its performance qualification is being strengthened to explain actual emitted queries and test full malformed-page progress. These are separate receipts, not additive coverage or a release claim.

The next worker-health draft covers a persistent adapter-node entrypoint, bounded row-state organization discovery with wrapping fairness cursors, restricted coordinator authority, organization/event lease separation and truthful runnable health. It is under independent Standards review; no scheduler implementation or production heartbeat is claimed. The remaining audience, preferences, civil time, delivery, inbox, reports and release slices stay open.

Slice4 scheduler and health implementation now follows the independently approved [durable worker contract](../specs/2026-10-03-notification-slice4-worker-health-spec.md). Slice3 has independent source PASS and native qualification (14 focused tests, combined 15 files/252 tests, zero skips); source producers and the qualified projection adapter remain unwired until their owning slices.


Slice4 health/scheduler and fresh PostgreSQL17/18 bootstrap are now locally qualified. The outbox plan fix is signed at Hub `f02189dd`: 14 native cases pass and restoring the old policy makes the plan regression fail. Slice5 audience projection follows the renewed v8 two-pass contract, including exact policy-role adoption after a reproduced recursion and PostgreSQL17 creator semantics. Projection, inbox, producer integrations, personal reports and release announcements remain open; no production notification has been sent.
