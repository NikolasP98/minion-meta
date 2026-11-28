---
id: 147-agenda-closures
title: Close the agenda — block days or hours with a reason, without booking a fake patient
stage: live
status: approved
verdict: approved
pass: 2
created: 2026-11-23
updated: 2026-11-23
repos: [minion_hub]
tags: [ui, scheduling]
related: [145-calendar-phones, 134-booking-closure]
---

# Feature Specification: Close the agenda ("Cerrar agenda")

**Feature Branch**: `feat/147-agenda-closures` (hub, base `master`), one slice

**Created**: 2026-11-23

**Status**: Approved by the owner 2026-11-23 ("Proceed with your recommended approach … write up the cerrar agenda feature. Use EGM + Spec Kit, then go live asap").

**Input**: FACES front desk, three WhatsApp voice notes, 2026-11-23 (transcribed):

> "hay varios días que quiero cerrar de cierta hora hasta cierta hora, como poner de un color rojo e indicar 'solo hasta esa hora por tal motivo' … yo lo estaba haciendo agendando con mi nombre para poder cerrar la agenda ciertos días que el doctor no puede, para que todos vean … pero solo me permite como si fuera un cliente."
>
> "ahora tengo que cerrar la agenda como más de diez días … ni siquiera puedo copiar, pegar. Tengo que estar agendando como si fuera un paciente."
>
> "el doctor me indica: el lunes solo puedo hasta tal hora, no me pongan más pacientes."

## Words used here

- **Closure** (UI: "Agenda cerrada"): a stretch of time on one day in which no one should book. It has a reason. Stored as one row per day.
- **Closure group**: the closures created together by one "Cerrar agenda" action (e.g. 10 days). They share a `group_id` so they can be reopened together.
- **Agenda**: the booking calendar component (`BookingCalendar.svelte`, "BC") as used by `/pos/appointments` ("POS") and `/scheduling/calendar` ("SCHED").

## AS-IS (observed 2026-11-23, hub `origin/master` `b4d2e383`, FACES prod read-only)

- **There is no way to block time on the agenda.** Staff book a fake "Control" appointment on a real patient with a note. Prod has 3 of them: 27-Nov 15:00–20:00, 30-Nov 09:00–14:00, 31-Dec 09:30–14:45, all `pending`, `source = internal`, each attached to a patient with a phone number. They pollute the patients' history and the pending-appointment counts, and would message patients if reminders start firing (FACES reminder config is enabled; `sched_reminders` has no FACES rows today).
- **What exists but does not reach the agenda:**
  - `sched_availability` dated overrides (`pg-scheduling-schema.ts:92-117`) and HR leave/holidays (`hr.service.ts:722-766` `loadDayOffOverrides`) feed ONLY the slot engine (`scheduling-slots.service.ts:229`, `scheduling-bookings.service.ts:366`): the assistant, the public booking page, and the staff form's time list (`AppointmentForm.svelte:346-348`) — none of which draws on the grid.
  - The agenda's off-hours shading reads weekly rules only and skips dated rows (`pos/appointments/+page.server.ts:89-111`, same in SCHED); `AvailabilityEditor.svelte:40` does not edit dated rows ("MVP").
  - These are per **resource**. In FACES every booking (640 in 60 days) sits on the resource "Milagros", which has no schedule; the doctor's resource has none. A per-resource day off would block nothing staff see.
- Rejected alternatives: `hr_holidays` is org-wide but whole-day only, one row per date, and counts as a non-working day in HR leave maths (`hr.service.ts:618,738`) — a doctor's trip would change staff leave balances. The seeded "Block" event kind (`scheduling.service.ts:260`) is still a booking: it needs an event type and a resource and shows up in booking lists, counts and reminders.
- Double-clicking or dragging on empty grid space calls `onslot(day, time, resourceId)` (BC:340, :2094-2099) and the page opens `BookingCreateDrawer` (POS:1588).

## TO-BE

### User stories

1. **Close days or hours (P1).** On the agenda, the front desk clicks "Cerrar agenda", picks **Desde** / **Hasta** dates (one day by default), either **Todo el día** or **De hh:mm a hh:mm**, and types a **Motivo** (required, e.g. "Viaje del doctor"). One action creates the whole range. *Acceptance*: closing 24-Nov → 5-Dec 09:00–20:00 takes one form submit; every day in the range shows a red block reading "Agenda cerrada · Viaje del doctor".
2. **Everyone sees it (P1).** Closures render on the day/week grid as a red, hatched band over the closed time in every column of that day, labelled with the reason. In month and list views the day shows an "Agenda cerrada · motivo" line. Appointments already inside stay visible on top. *Acceptance*: a closure is visible on desktop and on a 390 px phone, in POS and SCHED.
3. **Warned, never refused (P1).** Opening the booking drawer at a time inside a closure shows a non-blocking banner "La agenda está cerrada: <motivo>. Puedes agendar igual." (the doctor sometimes takes one patient anyway). The band lets clicks and drops through to the grid. *Acceptance*: mounted test — drawer opened inside a closure shows the banner; booking still submits.
4. **Reopen (P2).** Clicking a closure shows its reason and time with **Reabrir este día** and, when the group spans more than one day, **Reabrir todos (N días)**. *Acceptance*: reopening removes the band immediately (optimistic) and from the slots API.
5. **Entry points (P2).** "Cerrar agenda" lives where the user already is: as a mode of the drawer that opens when clicking empty grid space (prefilled with that day/time), and in the calendar toolbar's "…" menu.

### Invariants

- A closure is org-wide (the whole agenda), not per resource (no `resource_id` column in this slice).
- `ends_at > starts_at`, both within the same local day (org timezone); a multi-day range = one row per day.
- Reason: 1–120 characters, trimmed, required.
- Creating/reopening requires the same right as creating an appointment on that page: `/api/pos/appointments/closures` → `pos:create` (listed in `CREATE_COLLECTION_ENDPOINTS`), `/api/scheduling/closures` → `scheduling:edit`; reopen is a POST (`…/[id]/reopen`) so it needs the same right. A role that cannot write sees closures but no controls; the client maps a 403 to "Tu rol no puede cerrar la agenda".
- A closure never creates a booking, a reminder, a CRM contact or a stock movement.
- Closures never block anyone in this slice; the slot engine is untouched.

### Out of scope

- Per-person (per-resource) closures and HR-leave → agenda wiring (later; a nullable column is a one-line migration).
- Warnings when dragging/dropping an appointment into a closure.
- Subtracting closures from the slot engine (public page, assistant). Staff and the assistant send identical `source`/`bypassRules`, so it needs an explicit `respectClosures` flag; and FACES has no schedules, so the engine already offers no slots there. Follow-up proposal.
- Recurring weekly closures (use working hours).
- Editing a closure in place (reopen + close again).
- Converting the 3 existing fake bookings: done as a one-off data step after deploy (DELTA D6), not product code.
- FigCraft proposal file: bypassed for speed at the owner's "go live asap"; a live preview artifact stands in (see PR).

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | New table `sched_closures` (id, org_id, starts_at, ends_at, reason, group_id, created_by, created_at), RLS like every `sched_*` table | migration applies on the QA stack; RLS test: org B cannot read org A's rows |
| D2 | Service `scheduling-closures.service.ts`: `listClosures(ctx,{from,to})`, `createClosures(ctx,{fromDate,toDate,startTime?,endTime?,reason})` (expands days in org tz, validates, one transaction), `deleteClosure(ctx,id,{group})` | unit tests: day expansion incl. DST-free Lima + month boundary, all-day = 00:00–24:00, validation errors, group delete |
| D3 | Shared handlers + `/api/pos/appointments/closures` and `/api/scheduling/closures` (GET range, POST), `…/[id]/reopen` POST `{group?}`; permissions as invariants | route tests: 400 validation, happy path; hook-level permission test |
| D4 | Calendar window + both pages (load, seed, merge, refetch GETs) carry closures with server-computed `groupSize`; BC gets `closures` prop and draws them (grid band, month/list line), click → popover with reopen actions | mounted test: band rendered with reason; reopen calls DELETE and removes band |
| D5 | Create drawer gets an "Agendar cita / Cerrar agenda" switch (drawer level, swaps panels); "…" menu item opens it; drawer opened inside a closure shows the warning banner | mounted test: switch submits POST; banner shown |
| D6 | One-off after deploy: create closures for the 3 fake bookings' times with their notes as reasons, then cancel those bookings (no message to the patient) | read-back query: 3 closures exist, 3 bookings cancelled |

## Review

EGM, one round (owner: ASAP): [reports](../../.local/egm/2026-11-23-agenda-closures/) (untracked). Zoom-out F2–F6 and design-critic B1, M1, M2, Minor 2–3 accepted 2026-11-23: permissions mirror booking (POS twin route, reopen as POST), band passes clicks through with only its label as a button, drawer banner instead of client overlap checks, closures carried through both pages' week caches, org tz from `schedulingTimeZone`, `resource_id` dropped. Zoom-out F1 and critic B2 resolved by deferring the slot-engine half (out of scope).

## Risks

- `BookingCalendar.svelte` is ~5k lines, shared by two pages and the phone layout: the change is an additive prop and layer.
- Week cache: closures must merge and refetch like bookings, or a reopened closure reappears.
- Slot engine unchanged: an org WITH schedules could get a public/assistant booking inside a closure until the follow-up lands.

## Definition of done

Hub PR green (check, lint, design/tokens lint, unit + mounted tests, a11y gates), independent code audit fixed, merged and deployed, verified on prod by reading a closure back through the API, D6 applied, and the FACES front desk told how to use it.
