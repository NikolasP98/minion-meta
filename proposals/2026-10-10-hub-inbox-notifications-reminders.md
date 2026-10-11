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
