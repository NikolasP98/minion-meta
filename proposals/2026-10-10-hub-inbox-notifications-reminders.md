---
id: 2026-10-10-hub-inbox-notifications-reminders
title: In-app inbox with scope tiers — reminders, daily feed, app changelog, operational extras
status: in-spec
created: 2026-10-10
updated: 2026-10-10
repos: [minion_hub]
tags: [data, ui, logic]
value: 8
effort: L
spawned_spec: 2026-10-10-hub-inbox-notifications-reminders-spec
---

# In-app inbox with scope tiers

## Owner ask (verbatim, 2026-10-10)

> "Lets improve in-app notifications/reminders. For example, overdue appointments that haven't
> been confirmed/maked completed; appointments marked completed but no invoice/payment
> recorded; daily feed notif; app update/changelog (needs a system in the SDLC for producing
> formatted changelogs); shifts left open that need closing out (no activity after-hours;
> users can still have the shift open if they're using it, but cooldown 3hrs only on
> after-hours from the last data change and notify the user in-app; other suggestions you
> have. There will be a notification-scope tier system: ALL USERS/GLOBAL (for
> updates/changelogs); orgs; roles; users."

> "daily feed goes out at the org's earliest available hour on a work day (get the aggregate
> start time for a given work day from all org members and send out at that time). This
> doesn't include BUILDING the daily feed; the feed should always be available via the inbox."

## Problem

The bell today shows only join requests, Pulse proposals and gateway updates (verified on
production 2026-10-10). No business condition reaches a user in-app. The S5 notification
platform is an event spine without an inbox table or a running worker; the legacy rule
engine's tick is unscheduled.

## Definition of done

1. One `app_notifications` table with scope tiers global/org/role/user, resolved at read
   time; per-user read/dismiss; the S5 `inbox.v1` projection can later write into it.
2. Bell badge, popup and `/notifications` feed; `/notifications/daily` always available.
3. Evaluator on the jobs tick with auto-resolve: overdue appointments, completed-unpaid
   visits, after-hours open shifts (3 h cooldown from last data change), daily knock at the
   org's earliest availability start.
4. Release pipeline producing `CHANGELOG.md` + a global "Novedades" notification + `/changelog`.
5. Extras: WhatsApp logged out, low stock, paid-unscheduled, package expiring, overdue
   instalment, finance sync failed, DNI pending, birthdays.

Spec: `specs/2026-10-10-hub-inbox-notifications-reminders-spec.md`.

## Slice 1 open ends (2026-10-10, implementation handoff)

Slice 1 (tables, RLS, service, routes, bell/popup/`/notifications`/`/notifications/daily`
UI) was implemented on `minion_hub` branch `feat/inbox-scope-tiers` (draft PR — see the
branch for the exact PR URL). Each item below also carries an in-code
`TODO(handoff)` comment at its site:

1. **No org timezone/business-hours table exists yet** (confirmed in the spec's AS-IS).
   `daily-feed.service.ts`'s `resolveOrgTimezone` falls back to the first active staff
   resource's timezone, defaulting to `America/Lima`. Slice 2's `daily.feed` evaluator
   rule needs the same resolution — consider promoting this into a shared helper or a
   real org-level timezone column at that point.
2. **`completedUnpaidVisits` in the daily feed view is per-booking, not per-visit**
   (the spec's `groupId`-merged "visit" unit that Slice 2's `visit.unpaid` rule uses).
   Fine for a read-only glance; revisit if the daily page needs to match that rule's
   exact dedupe unit.
3. **The daily-knock client guard (`localStorage` key) uses the browser's local date,
   not the org's timezone** — the server's `dedupe_key` (which IS org-tz-correct) is the
   real idempotency guard; the client key is only a best-effort fetch-avoidance cache.
4. **`listFeed`'s pagination cursor is a plain `created_at` ISO string**, not a
   `(created_at, id)` composite — a same-microsecond tie at a page boundary could in
   theory skip a row. No evidence this has ever mattered at this data volume.
5. **Not verified against a live database in this session** — the local QA stack
   (`bun run qa:status`) was down (0 containers, 110 pending migrations) when this slice
   was implemented, so the migration was never applied to a real Postgres, `qa:seed:verify`
   was never run, and the DB-gated integration test
   (`src/server/db/pg-inbox-schema.sql.integration.test.ts`) has only been type-checked,
   never executed. Bring the QA stack up, apply the migration, run the seed, and run that
   integration test (and the service's scope-union behavior end-to-end) before trusting
   this in production.
6. **Slices 2–4 (evaluator + reminder rules, release pipeline/changelog, operational
   extras) are deliberately NOT implemented** — this proposal/spec still tracks them as
   open work.

## Slice 2 update (evaluator + 3 reminder rules)

Implemented on `minion_hub` branch `feat/inbox-evaluator` (draft PR #477, stacked on
`feat/inbox-scope-tiers` #475 — do not merge #477 before #475). Runner
`src/server/services/inbox/evaluate.ts` + rule registry `src/server/services/inbox/rules/`
(`appointment.overdue`, `visit.unpaid`, `shift.open_after_hours`), wired into the existing
`GET /api/jobs/tick`. Fixed a real Slice 1 bug found while proving this on the QA stack:
`app_notifications_dedupe_key_uniq` is a PARTIAL unique index, so `onConflictDoNothing({
target: dedupeKey })` without a matching `where` 500s — this broke `upsertNotification`,
`requestDailyKnock`, and the QA seed's own insert; fixed in all three call sites.

Open ends (each also carries an in-code `TODO(handoff)`):

1. **Deep-link hrefs are unverified.** `appointment.overdue` and `visit.unpaid` link to
   `/scheduling/calendar?booking=<id>`; `shift.open_after_hours` links to
   `/pos/shifts?shift=<id>`. Neither query param is wired into those pages yet — see the
   open proposal `2026-09-28-hub-booking-deep-link-param.md`. The notification rows are
   correct; the link may no-op until that lands.
2. **`visit.unpaid` and `shift.open_after_hours` were proven only via pure boundary unit
   tests + live QA-stack runs that produced 0 rows** (the current seed fixtures have no
   completed-and-stale-unpaid visit, and no open shift that is both after-hours and idle
   ≥3h). `appointment.overdue` WAS proven live end-to-end (3 rows created from seeded
   bookings already past their end time; flipping one booking to `completed` resolved its
   row on the next evaluator run). Add seed fixtures for the other two rules to close
   this out — candidates: `scripts/qa/seed/scheduling.ts` (a `completed` booking with
   `updated_at` >4h in the past and no ticket line) and `scripts/qa/seed/pos.ts` (an open
   shift with `opened_at`/`updated_at` far enough in the past, outside the resource's
   availability window).
3. **Fixed-locale (Spanish) notification text.** Titles/bodies are literal strings
   ("Cita sin cerrar", "Visita sin cobrar", "Caja abierta fuera de horario"), not resolved
   per-viewer — `@inlang/paraglide-sveltekit` 0.16 has no per-call locale override and a
   cron tick has no request locale to inherit (unlike Slice 1's `requestDailyKnock`, which
   resolves at request time). Upgrade once the inbox UI renders from a stored message key
   + params instead of literal text.
4. **`shift.open_after_hours`'s "last activity"** uses `greatest(shift.updated_at,
   max(ticket.submitted_at), max(payment.paid_at))` — `pos_ticket_lines` carries no
   timestamp of its own, so a line edited after its ticket's submission (if that's ever
   possible) wouldn't bump "last activity". Not believed to be reachable today.
5. **Slices 3–4 (release pipeline/changelog, operational extras) are still open work.**
