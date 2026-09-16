---
id: 2026-09-16-hub-pos-accounts-drawer-pending-scheduling
title: Hub POS accounts drawer — no pending-scheduling link
status: draft
created: 2026-09-16
updated: 2026-09-16
repos: [minion_hub]
tags: [logic]
effort: S
---

# Hub POS accounts drawer — no pending-scheduling link

**Filed:** 2026-09-16
**Repo:** minion_hub (branch `fix/pos-stock-shortfall-integrity`)
**Context:** part of the `fix(pos): refuse sales on stock shortfall instead of dropping the stock
entry; one account row per person; schedule step clears pending` PR.

## What

`/pos/accounts` (the client list) already links its "To schedule" badge to
`/pos/sell?step=schedule&ticket=<pendingTicketId>` — the resumable inline schedule
step that correctly books through the single `POST /api/pos/tickets/:id/schedule`
endpoint and stamps `pos_ticket_lines.booking_id` (src/routes/(app)/pos/accounts/+page.svelte:124-131).

The per-client **detail drawer** (`src/lib/components/pos/ClientAccountDrawer.svelte`)
has no equivalent: it shows Credit balance, Session packages, Payment plans and
Movements, but no pending-scheduling section and no link back to the schedule
step. A user who opens the drawer instead of clicking the list badge has no
way to book the pending service from there, and (per the 2026-09-16 lifecycle
QA report, `~/.cache/claude-tmp/qa-stack/qa-report/lifecycle-a/REPORT.md`,
finding under "Walk-in service cannot be scheduled") ends up on
`/pos/appointments/new` instead — a generic calendar page that (until this PR)
posted to `/api/scheduling/bookings` and never linked back to the ticket line.

This PR made `/pos/appointments/new` accept `?ticketId=&lineId=` and route
through the correct endpoint when present, so a future link from the drawer
is safe by construction — but nothing constructs that link yet.

## Fix

Add a "Pending scheduling" block to `ClientAccountDrawer.svelte` (mirroring the
list's badge) using the same `pendingScheduling` / `pendingTicketId` fields
already on `ClientAccountSummary`, linking to
`/pos/sell?step=schedule&ticket=<pendingTicketId>`.

## Why not done now

Scope discipline on a 3-fix surgical PR (stock shortfall integrity, one
account row per person, schedule-step pending flag) — this is a UI-only
follow-up, not a defect in the code paths that PR was asked to fix.
