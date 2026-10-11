---
id: 2026-10-10-hub-inbox-notifications-reminders-spec
title: In-app inbox with scope tiers — reminders (overdue, unpaid, after-hours shifts, daily feed), app changelog, operational extras
stage: dev
status: implementing
pass: 1
created: 2026-10-10
updated: 2026-10-10
repos: [minion_hub]
tags: [data, ui, logic]
proposal: 2026-10-10-hub-inbox-notifications-reminders
type: feature
owner_ask: "Lets improve in-app notifications/reminders. For example, overdue appointments that haven't been confirmed/marked completed; appointments marked completed but no invoice/payment recorded; daily feed notif; app update/changelog (needs a system in the SDLC for producing formatted changelogs); shifts left open that need closing out (no activity after-hours; cooldown 3hrs only on after-hours from the last data change and notify the user in-app); other suggestions. There will be a notification-scope tier system: ALL USERS/GLOBAL (for updates/changelogs); orgs; roles; users. Daily feed goes out at the org's earliest available hour on a work day (aggregate start time from all org members); the feed should always be available via the inbox."
---

# In-app inbox with scope tiers

## 0. Product

In the owner's words: the bell should tell each person what needs them. A reminder is a
condition that is true right now (an appointment nobody closed, a completed visit nobody
charged, a register left open after hours, a release they have not seen) and it disappears
when the condition clears. Every notification has ONE scope tier: **global** (every user,
for releases), **org**, **role** (everyone holding a capability in an org), or **user**.
The daily feed is always readable in the inbox; its notification is only the morning knock.

## AS-IS (2026-10-10, hub `origin/master`, verified live)

- The bell (`src/lib/state/features/notifications.svelte.ts`, `NotificationsPopup.svelte`)
  and `/notifications` show only pending join requests, Pulse proposals (hidden for business
  orgs) and a pending gateway update. Polled every 60 s via `/api/join-requests/count`.
- The S5 notification platform (`notification_events`, `notification_outbox`,
  `notification_audience_candidates` with `projection_kind = 'inbox.v1'`, scheduler, health)
  is an event spine whose worker runs only on an adapter node (`DESKTOP=1
  NOTIFICATION_WORKER=1`). It is not running on netcup; it has no inbox table to project into;
  it has no production producer (`src/server/services/notifications/README.md`).
- The legacy rule engine (`notif.service.ts`, `notif_rules`, `notif_log`) delivers through the
  gateway `channels.send`; its tick is `wiring: 'unscheduled'` (`system-automations.ts`).
- Netcup runs hub ticks through `~/.config/minion/health-gated-tick` (crontab, 8 lines);
  `/api/jobs/tick` is the generic ten-minute jobs entrypoint; `CRON_SECRET` bearer auth
  (`cron-auth-path.ts`).
- Data anchors: `sched_bookings` (status pending|accepted active; completed; cancelled;
  rejected; no_show; visit = `metadata.groupId`; paid = non-voided `pos_ticket_lines.booking_id`,
  funding via `pos_package_redemptions` / `pos_payment_plans`), `pos_shifts`
  (status, opened_by, opened_at, closed_at, updated_at), `pos_tickets` / `pos_ticket_lines` /
  `pos_payments` (updated_at), staff availability = `sched_availability` rules per resource
  (`sched_resources.profile_id` links a resource to a user; org timezone on the resource),
  RBAC = `canAct(module, action)` client / `requireOrgCapability(locals, module, action)`
  server (`rbac.service.ts`). There is no org business-hours table.
- Release tooling: none in the hub (no changelog, no tags). PR titles follow a conventional
  prefix (`feat(pos): …`, `fix(scheduling): …`).
- Email transport is live since 2026-10-10 (Resend, `minion-ai.org`); WhatsApp/Telegram on
  the FACES gateway are down. Out of scope here: this spec is in-app only.

## TO-BE

**Invariants**
- I1 One row per notification, one scope tier per row; the reader's feed is resolved at
  read time from memberships and capabilities (no per-recipient fan-out).
- I2 A condition-based notification is created at most once per subject while the
  condition holds (`dedupe_key` unique) and is `resolved_at` when the condition clears.
  Resolved rows leave the default feed and the badge.
- I3 Read/dismiss state is per user and never deletes the notification.
- I4 Evaluators are idempotent, bounded per org, and never raise for one org's failure.
- I5 The S5 platform's `inbox.v1` projection, when enabled, writes into the same
  `app_notifications` table (kind-prefixed `event.*`); this spec creates the table it was
  waiting for and does not touch the event spine.

**Scope tiers** (`scope` + ids): `global` (org_id null); `org` (org_id); `role` (org_id +
`capability` like `scheduling:manage`); `user` (org_id + profile_id). Feed SQL: global ∪
org ∈ my orgs ∪ role where I hold the capability in that org ∪ user = me.

## DELTA

| # | Transition | Slice | Proof |
|---|---|---|---|
| D1 | `app_notifications` + `app_notification_reads` tables, RLS, indexes | S1 | migration + seed |
| D2 | Feed API (list, unread count, read, dismiss, read-all) resolving scope tiers | S1 | route tests |
| D3 | Bell badge = unread inbox + existing sources; popup latest 5; `/notifications` feed with kind filter, deep links; `/notifications/daily` feed view always available | S1 | component tests + browser pass |
| D4 | Evaluator runner on the jobs tick with per-org isolation + auto-resolve | S2 | runner test |
| D5 | Rules: overdue appointments, completed-without-payment, after-hours open shift (3 h), daily feed knock at the org's earliest start | S2 | one test per rule incl. boundaries |
| D6 | Release pipeline: GitHub Action → CHANGELOG.md + tag → `/api/releases` → global `app.update` → `/changelog` page | S3 | workflow dry-run + route test |
| D7 | Extras: WhatsApp logged out, low stock, paid-unscheduled, package expiring, overdue instalment, finance sync failed, DNI pending, birthdays | S4 | one test per rule |

## Slices

### Slice 1 — Inbox, scope tiers, feed UI (migration `20261011100000_app_notifications.sql`)

**Topics:** `data`, `migrations`, `ui`

1. Tables. `app_notifications (id uuid pk, scope text check in (global,org,role,user),
   org_id uuid null, capability text null, profile_id uuid null, kind text, severity text
   check in (info,warning,critical), title text, body text null, href text null,
   subject_type text null, subject_id text null, dedupe_key text unique, data jsonb default
   '{}', created_at, expires_at null, resolved_at null)` with check constraints per scope
   (global ⇒ org_id null; org ⇒ org_id; role ⇒ org_id + capability; user ⇒ org_id + profile_id);
   indexes on (scope, org_id, created_at desc), (profile_id), (resolved_at) partial.
   `app_notification_reads (profile_id, notification_id, read_at, dismissed_at, pk both)`.
   RLS like sibling org tables (app_ledger + org GUC); global rows readable by any member.
   QA seed: one of each scope + one resolved + one read.
2. Service `src/server/services/inbox/inbox.service.ts`: `listFeed(ctx, {kinds?, includeResolved?,
   limit, cursor})`, `unreadCount(ctx)`, `markRead`, `dismiss`, `readAll`, and for producers
   `upsertNotification(draft)` (insert on conflict dedupe_key do nothing, returns id) and
   `resolveByKeys(keys)`. Capability resolution reuses the server RBAC helper that lists a
   profile's capabilities in an org (implementer: find it in `rbac.service.ts`; if only a
   per-check function exists, add a list function there).
3. Routes `GET /api/inbox`, `GET /api/inbox/count`, `POST /api/inbox/[id]/read`,
   `POST /api/inbox/[id]/dismiss`, `POST /api/inbox/read-all` (route contract manifest +
   counts per hub CLAUDE.md "route contract").
4. UI. `notifications.svelte.ts` badge adds the inbox unread count (same 60 s poll, one
   coalesced request). `NotificationsPopup.svelte` shows the latest five inbox rows above
   the existing join-request block, each with severity dot, title, relative time, deep link,
   mark-read on click. `/notifications` page: feed list with kind filter chips, read-all,
   dismiss, "show resolved" toggle, keeps the existing join-request and pulse sections at
   the top. `/notifications/daily` : the daily feed VIEW computed on demand for a date (org
   tz): today's appointments by staff, yesterday's sales total and count, pending items
   (unscheduled paid services, completed-unpaid visits, open shifts) — this page is the
   always-available feed the knock links to. All strings via Paraglide (en + es); design
   tokens per `ui-design-governance`.

**DoD:** migration + seed on the QA stack; route tests for the scope union (a role row is
visible only to a holder of that capability in THAT org; a user row only to that user;
global to everyone; resolved hidden by default); component test for badge arithmetic;
`bun run check` 0/0; lint:design/tokens clean.

### Slice 2 — Evaluator and the four reminder rules

**Topics:** `logic`, `test`

1. Runner `src/server/services/inbox/evaluate.ts` registered in `/api/jobs/tick` (cadence
   ten minutes, already on netcup): for each org with POS or scheduling enabled, run every
   rule inside try/catch, each rule returns `{ upserts: Draft[], resolve: string[] }`; apply
   via the Slice 1 service; log counts; never throw across orgs. Also add the automation to
   `system-automations.ts` under the jobs tick note.
2. Rule `appointment.overdue`: ACTIVE booking with `end_time < now − 30 min`. One
   notification per visit anchor: scope `user` → the assigned resource's `profile_id` (when
   linked) AND scope `role` → `scheduling:manage` (implementer verifies the capability key;
   fall back to `scheduling:edit`). Title "Cita sin cerrar", body with client + time, href
   to the POS calendar day with the booking. Resolve when status leaves ACTIVE.
3. Rule `visit.unpaid`: status completed, `updated_at < now − 4 h`, no non-voided ticket
   line on any member of the visit, no package redemption / payment plan funding. Scope
   `role` → `pos:manage`. Resolve when a line appears or the visit is cancelled.
4. Rule `shift.open_after_hours`: for each open shift, owner = `opened_by`; owner's window
   today = that profile's resource availability for the weekday (org tz); fallback = the org
   aggregate window (min start, max end over active resources); after-hours = now outside
   the window; last activity = greatest(updated_at) over the shift row, its tickets, lines,
   payments; fire when after-hours AND `now − last_activity ≥ 3 h`; scope `user` → owner AND
   `role` → `pos:manage`; dedupe per shift; resolve when the shift closes. Inside hours or
   with recent activity: nothing.
5. Rule `daily.feed`: per org and local workday, compute `earliest_start` = min(start) over
   every active resource's availability rules for that weekday (org tz). When
   `now ≥ earliest_start` and no row for `daily:{org}:{date}` exists, create scope `org`
   "Tu día en FACES" with href `/notifications/daily?date=…`. Days with no availability: no
   knock. The feed content itself is NOT built by the rule (Slice 1's page computes it on
   demand).
6. Each rule gets a unit test with its boundaries (29 vs 31 minutes; paid vs plan-funded;
   inside vs outside hours; 2 h 59 vs 3 h; a day without availability).

**DoD:** `evaluate.test.ts` proves per-org isolation (one throwing org does not stop the
next) and resolve-on-clear; `bun run check` 0/0.

### Slice 3 — App changelog as an SDLC artifact

**Topics:** `infra`, `docs`, `ui`

1. `.github/workflows/release-notes.yml` on push to `master`: find the last tag matching
   `hub-v*`; list merged PRs since it (`gh api` search by merge commit range, fall back to
   `git log --merges`); group by conventional prefix (feat → "Nuevo", fix → "Arreglado",
   refactor/chore/docs → "Interno") and by scope in parentheses; prepend a dated section to
   `CHANGELOG.md`; commit with `[skip ci]`; create tag `hub-vYYYY.MM.DD[-n]`; POST
   `/api/releases` with `Authorization: Bearer $CRON_SECRET` and `{ version, releasedAt,
   sections, prs:[{number,title,url}] }`.
2. Table `app_releases (id, version unique, released_at, sections jsonb, prs jsonb,
   created_at)`; route `POST /api/releases` (cron-auth path) upserts and creates ONE
   `scope: global`, `kind: app.update`, `severity: info` notification "Novedades
   {version}" with href `/changelog#{version}`, dedupe `release:{version}`; `GET /changelog`
   page lists releases newest first (every signed-in user).
3. Meta-repo: note in `AGENTS.md` "Release notes" that hub changelogs are generated by this
   workflow from PR titles, so PR titles are the changelog (prefix + scope + plain sentence).

**DoD:** workflow runs green on a branch with `workflow_dispatch` dry-run (no tag, no POST);
route test for the upsert + single global notification; browser pass of `/changelog`.

### Slice 4 — Operational extras (same evaluator)

**Topics:** `logic`, `test`

Rules, each with one test and resolve-on-clear:
`channel.whatsapp_logged_out` (gateway `channels.status` via the hub's gateway health read;
org scope role `comms:manage`), `stock.low` (reuse the registered `stk_reorder` candidate
source; role `stock:manage`), `service.paid_unscheduled` (pending scheduling lines older
than 3 days; role `scheduling:manage`), `package.expiring` (grants expiring ≤ 7 days with
sessions left; role `pos:manage`), `plan.overdue` (instalment past due; role `pos:manage`),
`finance.sync_failed` (last daily sync failed; role `finance:manage`), `crm.dni_pending`
(contacts awaiting validation > 2 days; role `crm:manage`), `crm.birthday` (contacts with a
birthday today; org scope, info). Capability keys verified against `rbac.service.ts`.

## Out of scope

- Email/WhatsApp delivery of inbox rows (the S5 platform's destination slices).
- Per-user notification preferences and muting.
- Editing rules from the UI (thresholds are constants in the rule files).
- Building the daily feed as stored content (it is computed on demand).

## Verification (end to end)

1. QA stack: seed, open the bell as the QA owner → badge counts the seeded unread rows; a
   staff persona does not see the `pos:manage` role row; everyone sees the global row.
2. Create a booking ending 40 minutes ago, run the jobs tick → "Cita sin cerrar" appears for
   the assigned staff and managers; mark it completed, tick → row resolved and gone.
3. Open a shift as staff, set the clock after hours with no activity for 3 h, tick → the
   owner sees "Caja abierta"; close the shift, tick → resolved.
4. Tick at the org's earliest start → one "Tu día" row; `/notifications/daily` renders the
   day; tick again → no duplicate.
5. Run the release workflow dry-run on a branch; POST a release to the QA app → one global
   "Novedades" row for every persona, `/changelog` lists it.
