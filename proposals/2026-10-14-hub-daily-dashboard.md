---
id: 2026-10-14-hub-daily-dashboard
title: Daily dashboard — agent-authored layouts and the cards still missing
status: draft
created: 2026-10-14
updated: 2026-10-14
repos: [minion_hub]
tags: [ui, logic]
value: 6
effort: M
source: hub-daily-dashboard-2026-10-14
---

# Daily dashboard follow-ups

## Owner ask (verbatim, 2026-10-14)

> "improve the DAILY summary. its unformatted and I'd like more of a DASHBOARD look and feel
> to it. Each user can configure it manually or via agent builder live, on the spot."

## What shipped

`/notifications/daily` became a card dashboard: a KPI band (yesterday's sales, appointments
today, pending work, open registers) plus one card per section, each on the record-detail card
recipe. The viewer owns which cards show and in what order, through the same `FieldsList`
toggle-and-drag the calendar uses, persisted per user at
`/api/me/preferences/dailyDashboard`. The merge is pure and tested
(`$lib/inbox/daily-cards.ts`): a stored layout is user data, so unknown keys are dropped and a
newly added card appears in its catalog position rather than never rendering.

The feed service also stopped under-reporting: yesterday's sales are grouped by currency (a sum
across currencies is not an amount, so a mixed day shows the count and says so), completed
unpaid visits carry their title and attendee instead of a bare end time, and open shifts carry
the opener's display name.

## 1. Agent-builder live configuration — NOT built

The second half of the ask. It needs three things that do not exist:

- **A writer.** The builder would have to write another user's `dailyDashboard` preference. The
  endpoint is strictly self-scoped (`user.supabaseId`), by design — there is no "set preference
  for profile X" path, and adding one is an authority decision, not a refactor.
- **A live channel.** "On the spot" means the open page adopts the layout without a reload.
  Today the layout is seeded from the `(app)` layout bundle and re-read on navigation only.
- **A vocabulary the agent can address.** The card catalog is a closed union of five keys. An
  agent asked to "put the register card first" needs those names, their semantics and their
  capability gates in a form it can reason over.

The seam is ready: the preference section is the storage, `mergeDailyLayout` is the adopter, and
every card key is already validated server-side, so a layout an agent writes can never render a
card the viewer lacks the capability to see **only if** the writer re-checks capabilities — the
current page does not, because a self-authored layout cannot exceed its own author's access.
That stops being true the moment another principal writes it.

## 2. Cards the dashboard does not have yet

- Revenue trend (yesterday against the prior week) — needs a second aggregate window.
- Per-staff utilization for today — `UtilizationHeatmap` already computes this elsewhere.
- Low-stock items — the stock module has the query; the card is a read.

## 3. Known limits in what shipped

- `completedUnpaidVisits` is a per-booking check, not the groupId-merged visit unit the
  `visit.unpaid` rule uses. Pre-existing; carried forward.
- Both pending queries are capped at 50 rows with no "and N more" affordance.
- The org timezone is still resolved from the first active staff resource
  (`DEFAULT_TIMEZONE` fallback), pre-existing in `daily-feed.service.ts`.
