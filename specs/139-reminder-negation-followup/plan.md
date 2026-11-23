# Implementation Plan: Reminder negation follow-up

**Branch**: `feat/139-reminder-negation-followup-s<N>` (hub, base `master`), one branch per slice | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/139-reminder-negation-followup/spec.md` (verdict approved, meta #1063)

## Summary

Today a client who answers "no" to a reminder gets the appointment cancelled, the stock reservation released and the package session handed back, and nobody is told (`reminders.service.ts:387`). After this plan a "no" opens a **reconfirmation case**. Nothing is cancelled. The agent confirms what it understood and asks how to proceed, and staff get one inbox report per case.

The design is **hub only** (research R1). It needs no gateway change:

1. Every reply read by the scan gets a verdict **and a confidence**, stored in a log. The log is also the cursor, so a reply is classified once (today it is re-read on every tick).
2. A confident negation opens a case (`sched_reconfirm_cases`). The appointment keeps its status (`pending` or `accepted`). "Por reconfirmar" is a badge derived from the open case, not a status (spec 134 is not built; handoff note in research R9).
3. The reminders tick advances each open case one bounded step: send the question, read the answer, offer up to three free slots, move the appointment when the client picks one. Each step is one templated message plus at most one classifier call (the JEV typed-decision model the hub already uses).
4. An inbox rule turns each case into a staff notification and resolves it.

Four slices. The first removes the automatic cancel and tells staff; it sends nothing new to clients.

Design detail: [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md). Validation: [quickstart.md](quickstart.md).

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes, SvelteKit 2 (hub)

**Primary Dependencies**: Drizzle ORM over postgres.js (`withOrgCore`), the JEV decisions endpoint already used by `assistant-router.service.ts:30-31` (research R3), zod, Paraglide i18n, hub UI kit (`Badge`, `Button`, `Card`, `Toggle`, `NumberInput` or the kit's equivalent)

**Storage**: Supabase Postgres.
- New tables: `sched_reconfirm_cases`, `sched_reconfirm_events` (S1).
- New column: `sched_reminder_config.negation_wait_hours` (S1 migration, used from S2).
- One hub migration `supabase/migrations/20261123120000_reconfirm_cases.sql`, Drizzle mirror in `src/server/db/pg-reminders-schema.ts`.

**Testing**:
- Vitest (bun), mocked-DB service tests in the style of `reminders-transition.test.ts` and `doors-followup.service.test.ts`.
- Pure-helper unit tests (`src/server/scheduling/reconfirm.test.ts`).
- `*.mounted.test.ts` for the drawer section and the settings notices.
- Only the files named in [quickstart.md](quickstart.md). Never the full suite.

**Target Platform**: Hub on Vercel plus the netcup worker that runs the ticks.

**Project Type**: Web application (SvelteKit services, routes and components in one repo).

**Performance Goals**:
- One model call per **new** client message, not per tick (the verdict log is the cursor).
- The case step loop is capped at 25 cases per org per tick, the same cap as `processOrgReminders` (`reminders.service.ts:83`).

**Constraints**:
- The agent never cancels, releases, refunds or hands back a session. The only booking writes it can make are `pending → accepted` and an in-place move to a slot the client picked.
- A move goes through the existing strict path (`prepareAssistantRescheduleInTx`, `scheduling-bookings.service.ts:1572`) in one transaction with the status change and the case result.
- The agent writes only to the phone and account the reminder used, and only about that appointment.
- Message text and phone numbers are never written to the console (same rule as `doors-followup.service.ts:16`).
- Without the `ai.proactive` entitlement the org still gets the case, the templated question and the staff report; answers are not interpreted and no slot is offered (spec 043, `reminders.service.ts:24-29`).
- Every user-facing string goes through `m.*()` (es, en), except inbox rule titles, which are fixed Spanish like the other rules (`service-paid-unscheduled.ts:17`). Design tokens only.

**Scale/Scope**: FACES is the only target org. Reminders have never run in production. About 8 service/route files, 1 migration, 1 inbox rule, 1 drawer section, 1 settings card, about 35 i18n keys.

## Constitution Check

*GATE: must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Spec before code | ✅ spec.md approved; this plan; tasks.md; no code yet |
| II. AS-IS → TO-BE → DELTA with evidence | ✅ every code claim is anchored to `file:line` on hub `484c6a03`; seven spec corrections in research.md |
| III. Slice-scoped delivery | ✅ four hub PRs, each from a fresh clone of `origin/master`, shippable alone. Foreground gates only |
| IV. Required build steps | ✅ no new page. New API routes sit under `/api/scheduling` (central write gate, `rbac.service.ts:875`). New model calls stay in `reminder-compose.ts`, already in the AI-call inventory (`ai-call-inventory.test.ts`). No new `getCoreDb` call site. i18n es/en. Design-token contract |
| V. Data work keeps human gates | ✅ tagged `data`. One additive, idempotent migration; owner approves this plan and merges every slice |
| FigCraft demo first (AGENTS.md) | ⏳ see "FigCraft demo"; S3 waits for it |

Post-design re-check: ✅. Two tables are the minimum (one for the case, one append-only log for verdicts and messages). No new dependency, no new tick route, no gateway change.

## Project Structure

### Documentation (this feature)

```text
specs/139-reminder-negation-followup/
├── spec.md
├── plan.md                 # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (hub repository, `minion_hub`)

```text
supabase/migrations/20261123120000_reconfirm_cases.sql   # S1: two tables, RLS, grants, config column
src/server/db/pg-reminders-schema.ts                     # S1: Drizzle mirrors + negationWaitHours
scripts/qa/seed/scheduling.ts                            # S1: one seeded reminder + open case (rule: a schema change ships with its seed, `qa:check-pairing`)

src/server/scheduling/
├── reminders.ts                    # S1: parseYesNo returns a confidence (short reply = 1, long sentence = 0.5)
└── reconfirm.ts                    # S1 NEW (pure): CONFIDENCE_MIN, waitUntil, notificationFor(case); S4: pickOfferSlots, partOfDay

src/server/services/
├── reminder-compose.ts             # S1: jevDecide; inferConfirmationReply → { verdict, confidence }
│                                   # S2: reconfirmAskTemplate + closing templates
│                                   # S4: inferReconfirmAnswer (one JEV request, typed answers)
├── reminders.service.ts            # S1: scan widened to accepted bookings and any client stage; cursor; verdict log;
│                                   #     negation → openCase instead of setBookingStatus('cancelled')
├── reconfirm.service.ts            # S1 NEW: openCase, logEvent, getCaseForBooking, closeCase, closeStaleCases
│                                   # S2: advanceCases (send the question, timeouts, staff-takeover guard)
│                                   # S4: answer handling, slot offer, acceptOfferedSlot
├── reminder-config.service.ts      # S2: negationWaitHours in the default shape and the patch
├── stale-sends.service.ts          # S2: third sweep for agent messages left in `sending`
├── scheduling-bookings.service.ts  # S3: getBookingDetail adds `reconfirm`; S4: export the in-transaction move + status helpers
├── scheduling-slots.service.ts     # S4: `excludeBookingId` option on getSlotsForEventType
├── calendar-window.service.ts      # S3: bookings carry `reconfirm: true` while a case is open
├── crm-channels.service.ts         # S3: catalog accounts carry `linked` from the gateway snapshot
└── inbox/rules/
    ├── appointment-reconfirm.ts    # S1 NEW: one notification per case phase; resolves the others
    └── index.ts                    # S1: register

src/routes/api/scheduling/
├── reminders/tick/+server.ts                # S2: call advanceCases after the scan; counters in the response
├── reminders/config/+server.ts              # S2: negationWaitHours (1–168) in the PUT schema
└── reconfirmations/[id]/close/+server.ts    # S3 NEW: POST, staff closes a case

src/routes/(app)/scheduling/
├── reminders/+page.server.ts       # S3: pass `linked` per account and whether the gateway answered
├── reminders/PageBody.svelte       # S3: notices "Recordatorios apagados" / "WhatsApp desconectado"; wait-time field
└── calendar/PageBody.svelte        # S3: `?booking=<id>` opens the drawer (closes the 2026-09-28 deep-link TODO for this page)

src/lib/components/scheduling/
├── BookingDetailDrawer.svelte      # S3: "Por reconfirmar" badge + case section (summary, result, conversation link, actions)
├── ReconfirmSection.svelte         # S3 NEW: the section, so the 2,191-line drawer grows by one import
└── BookingCalendar.svelte          # S3: hover card shows the badge when `b.reconfirm`

messages/es.json, messages/en.json  # S2 (agent templates), S3 (UI), S4 (offer and closing templates)
```

**Structure Decision**: all code in the hub. The conversation lives in a new `reconfirm.service.ts` beside `reminders.service.ts` and runs from the existing reminders tick, so it inherits the per-org AI usage scope and the module check (`reminders/tick/+server.ts:31-34`).

## Implementation slices

Each slice is one hub PR to `master`, from a fresh clone, shippable alone. PR titles are the changelog.

### S1 — A "no" stops cancelling; staff are told (backend)

PR title: `fix(scheduling): a client's "no" to a reminder no longer cancels the appointment — staff get a report`

- Migration: `sched_reconfirm_cases`, `sched_reconfirm_events`, `sched_reminder_config.negation_wait_hours`. The QA seed gains one sent reminder and one open case (`scripts/qa/check-migration-seed-pairing.ts:3-7`).
- `inferConfirmationReply` becomes one JEV `choice` request and returns `{ verdict: 'yes' | 'negation' | 'unclear', confidence }`; the confidence is the option's probability. It sees the reminder text and the replies. The prompt no longer sends "wants to reschedule" to UNCLEAR: that is a negation (spec §1). `parseYesNo` gains a confidence.
- `scanConfirmationReplies`:
  - scope widens from "`pending` with a `confirmation` reminder" to "`pending` or `accepted`, any client reminder sent in the last 7 days" (spec correction C2);
  - replies are filtered by the account the reminder used (C4);
  - only messages newer than the last logged verdict are classified (C5);
  - every verdict is logged; confidence below `CONFIDENCE_MIN` (0.75) counts as unclear;
  - yes on `pending` → `accepted`, as today; negation → `openCase`; a second negation adds an event to the open case;
  - unclear replies older than the wait time open a case with result `unclear` (spec §4).
- `openCase` writes the case and nothing else. No cancel, no release, no message (S2 adds the message). A reply after the appointment start opens the case with result `late_reply`.
- Inbox rule `appointment.reconfirm` (jobs tick): upserts the notification of the case's current phase, resolves the others, and resolves all when the case is closed. The rule also closes cases whose booking is no longer live.
- Tests: `reminder-compose.test.ts`, `src/server/scheduling/reminders.test.ts`, `src/server/scheduling/reconfirm.test.ts`, `reminders-transition.test.ts` (rewritten: "no" never calls `setBookingStatus('cancelled')`), `reconfirm.service.test.ts`, `inbox/rules/appointment-reconfirm.test.ts`.

After S1 alone: SC-001 holds, and staff see "Dijo que no puede asistir" in the inbox. The link lands on the appointment's day.

### S2 — The agent asks; no answer goes to staff (backend)

PR title: `feat(scheduling): the agent asks a client who can't come how to proceed, and staff hear when nobody answers`

- `advanceCases(ctx, now)` runs in the reminders tick after the scan:
  - new case, appointment more than 2 h away → claim an `agent_message` event (`sending`), send the templated question through `channels.send` to the reminder's recipient and account, mirror it in `messages` (same shape as `reminders.service.ts:256-283`), set `wait_until = min(now + wait, start − 2 h)`;
  - a human wrote in that chat after the case opened → result `staff_handling`, the agent stops;
  - send failure → result `send_failed`;
  - `wait_until` passed → `no_answer`, or `unclear` when the client wrote something.
- `negationWaitHours` in the config service and the PUT route (no UI yet; default 24).
- `reapStaleSends` also fails agent messages stuck in `sending`.
- Tests: `reconfirm.service.test.ts` (fake clock), `stale-sends.service.test.ts`, `reminder-compose.test.ts`.

### S3 — Staff see and act on the case; settings explain themselves (UI)

PR title: `feat(scheduling): appointments a client declined show "Por reconfirmar" with the agent's summary and next steps`

Waits for the FigCraft demo.

- Drawer: badge beside the status badge and a section with the one-line summary, the result, a link to the conversation (`/crm/<contactId>`, as `BookingDetailDrawer.svelte:1053`), and the actions Reagendar (existing reschedule mode), Cancelar cita (existing dialog), Llamar (`tel:`), Marcar como atendido (new close endpoint). "Archivar" arrives with spec 134.
- Calendar hover card: the badge.
- `POST /api/scheduling/reconfirmations/[id]/close`.
- `/scheduling/calendar?booking=<id>` opens the drawer.
- Settings page: wait-time field; notices "Recordatorios apagados" and "WhatsApp desconectado", each with its next step.
- Tests: `reconfirm-section.mounted.test.ts`, `booking-detail-drawer.mounted.test.ts`, `reminders-settings.mounted.test.ts`, `calendar-window.service.test.ts`, the route test.
- Gates: `bun run lint:design && bun run lint:tokens` must not regress.

### S4 — The agent understands the answer and can move the appointment (backend, AI orgs)

PR title: `feat(scheduling): a client who asks for another time can pick a free slot and the appointment moves itself`

- `inferReconfirmAnswer`: one JEV request with typed questions: intent (`other_date`, `decline`, `will_come`, `pick`, `unclear`), the picked option, the day and the part of day. The one-line staff summary is a template over these answers.
- Outcomes: `will_come` (→ `accepted` when `pending`), `declined`, `wants_other_date`, `rescheduled`.
- Slot offer: `getSlotsForEventType` for the same event type, pinned to the same resource, inside the window the client named; up to three slots; one offer round.
- `acceptOfferedSlot`: one transaction that locks the case, runs the strict move, sets `accepted` when `pending`, clears the time-based reminder claims so the new date gets its reminders, and writes the result. A slot taken meanwhile ends as `wants_other_date`.
- Grouped visits get the question but no slot offer (research R6).
- Tests: `reminder-compose.test.ts`, `src/server/scheduling/reconfirm.test.ts`, `reconfirm.service.test.ts`, `scheduling-bookings-assistant-reschedule.test.ts` (the existing file must stay green after the helper is exported).

### Order and dependencies

S1 → S2 → S4 on the backend. S3 needs S1 only and can ship before or after S2. Nothing here depends on spec 134 or 135.

## Risks

| Risk | Mitigation |
|---|---|
| The reminders tick is **not scheduled** anywhere (`system-automations.ts:132-137`, `wiring: 'unscheduled'`; not in `vercel.json`). Nothing in this spec runs until it is | Ops step before go-live: add the crontab line on netcup and flip the manifest entry. Owner question 1 |
| A gateway agent may already auto-reply on the org's WhatsApp number; the client would hear two voices | Cannot be seen from the hub code. Owner question 2. The staff-takeover guard only covers humans |
| Widening the scan to `accepted` bookings makes ordinary chat ("no sé a qué hora…") a candidate | Keyword confidence is 1 only for short replies; the model sees the reminder text; below 0.75 is unclear; the worst outcome is a polite question, never a cancel |
| The model moves an appointment the client did not ask for | A move needs an explicit pick of an offered option with confidence ≥ 0.75, the strict availability check, and the booking unchanged since the offer (`expectedUpdatedAt`) |
| Inbox report is up to 30 minutes late (jobs tick cadence, `system-automations.ts:81`) | Meets SC-002 ("within one jobs tick"). The drawer and hover badge are immediate |
| `sched_reminder_config` has a column-list assertion in an old migration (`20261003140000_…:142-154`) | It is a one-time reconciliation that runs before ours; the implementer confirms on the QA stack (quickstart) |
| No production evidence: reminders have never run | S1 and S2 are proven on the local QA stack with a fake inbound message; the first production day is watched by the owner (quickstart "First day") |

## FigCraft demo

Demo built 2026-11-23: [reminder-followup.figcraft](reminder-followup.figcraft), page "Spec 139 · demo" (as-is copied from the master where the screen exists; the rest hand-built). Build script `~/.cache/claude-tmp/fc134/build139.py` (local).

Frames the orchestrator builds, as-is and to-be, linked from the spec before S3 starts:

1. **Booking drawer, overview** — as-is: status badge only. To-be: status badge + "Por reconfirmar" badge.
2. **Booking drawer, case section** — four states: agent asking ("El agente está consultando al cliente"), needs staff (result "No desea continuar" with actions Reagendar, Cancelar cita, Llamar, Marcar como atendido), "Sin respuesta", and closed ("Reprogramada por el agente").
3. **Calendar hover card** — as-is and to-be with the badge.
4. **Inbox** — three notification rows: "Por reconfirmar" (info), "No desea continuar" (warning), "Reprogramada por el agente" (info).
5. **Recordatorios settings** — as-is; to-be with the wait-time field ("Tiempo de espera del agente", hours) and the two notices: "Recordatorios apagados" and "WhatsApp desconectado", each with its next step.
6. **WhatsApp conversation** (illustration, not hub UI) — the question, the slot offer and the confirmation, so the owner approves the wording.
