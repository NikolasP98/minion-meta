---
id: 134-booking-closure
title: Closing appointments — "Por cerrar" after the day ends, Desagendar on every appointment, Archivar as the main close
stage: spec
status: draft
verdict: approved
pass: 1
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
tags: [ui, data]
related: [135-stock-checkpoints, 120-till-corrections, 133-pos-session-existing-appointment, 116-pos-booking-state-hardening]
---

# Feature Specification: Closing appointments

**Feature Branch**: `feat/134-booking-closure` (hub, base `master`)

**Created**: 2026-11-20

**Status**: Draft

**Input**: Owner, 2026-11-19: "Maybe add logic so that when the current time is past the event's end time, the status changes to a pragmatic/transitional value that expects action be taken for a end-status-value. Marking "no-show" shouldnt really be the option, because it doesnt help with the happy path: paying customers will get their appointment sooner or later, so the no-show button should be something else that simply "unschedules" it so that its a pending event, waiting for re-assignment. The unschedule button should be part of all event context menus, tbh. Another action that can be taken is to archive it."

Owner decisions, 2026-11-20 (verbatim):

1. "yes, the element is reserved, but not consumed, so stock is not officially impacted until the treatment is completed"
2. "No vino simply means it'll be rescheduled. No refund unless explicitly requested."
3. "Split the tray for the different concerns. I was also thinking a unified tray, but a clear status property that distinguished the different items from eachother"
4. "I'd say all unclosed events are marked or status changed after the day ends (12 midnight)"
5. "Archive is the main action. Anular is hidden behind a context submenu"
6. Stock cut-off, 2026-11-20: "We can go a step further and implement CHECKPOINT stock counts, where staff physically validates counts and locks those values in, so if anything impacting stock counts are \"completed\" before the mentioned checkpoint dates, stock won't move." → specified separately as spec 135 (stock checkpoints); FR-012 consumes it.

Approval, 2026-11-20: "I approve the rest, btw."

## AS-IS (observed 2026-11-19, prod read-only + PostHog, hub `origin/master` `63c4313b`)

### States and actions today

- Stored statuses: `pending`, `accepted` (live, `ACTIVE_STATUSES`, `src/server/services/scheduling-bookings.service.ts:105`); `completed`, `no_show`, `cancelled`, `rejected` (final; a final appointment refuses every change, spec 116 FR-009, `setBookingStatusInTx` guard ~1112).
- `no_show`, `cancelled` and `rejected` release the stock reservation and **hand the package session back** (`RELEASING`, ~1056; `reverseBookingRedemptionsInTx`).
- The agenda (`src/routes/(app)/pos/appointments/PageBody.svelte`) offers "Marcar completada", "Marcar inasistencia" (~1286) and cancel (~1309, ~1344 with reason `deleted`) on every appointment.
- **"Desagendar" exists only for paid services** (`unscheduleVisit`, ~1274; menu `pos_appt_ctx_unschedule`): it unlinks the paid sale lines (they reappear in "Servicios pagados sin agendar", `listPendingSchedulingLines`, `src/server/services/pos-accounts.service.ts:496`) and stores the appointment as **`cancelled`** with reason `unscheduled`.
- An appointment always has a time and a staff member: `start_time`, `end_time`, `resource_id` are `NOT NULL`.
- Nothing happens when an appointment's time passes: it stays `accepted`/`pending` forever.

### What the data shows (FACES, the only org with appointments)

| Fact | Value |
|---|---|
| Appointments by status | 313 completed · 113 accepted · 71 pending · 69 no-show · 38 cancelled |
| Live appointments whose time has passed (all more than 7 days ago) | **101** (64 accepted, 37 pending); 27 have a linked sale, 26 have a later appointment for the same treatment (left behind) |
| Cancelled + no-show (107) followed by nothing for the same CRM client — no later appointment, no later sale | **56** (18 cancelled, 38 no-show) |
| Followed by the same treatment later (rescheduled by hand) | 31 (10 cancelled, 21 no-show) |
| No-shows on a paid sale | 4 (POS-2026-00027, -00077, -00132, -00143) |
| `rescheduled_from_id` ever set | 0 — reschedules move the appointment in place ("Mover igual" 198 clicks, "Cambiar fecha, hora o miembro del equipo" 113 in 90 days) |
| "Marcar inasistencia" | 49 clicks, one person; 25 of the 69 no-shows were set **before** the appointment's time |
| "Desagendar" | 2 clicks, 2026-10-11 |
| Past appointments still reserving stock, 3 Oct – 7 Nov | 57 (sent to the clinic as a CSV on 2026-11-19 to close by hand) |

Classification: same `crm_contact_id`, same event type or title, later `start_time`. Query: `~/.cache/claude-tmp/receipt-fix/lost.sql` (session 2026-11-19).

### Vocabulary clash

In Peruvian Spanish *cancelar* means **to pay**. The clinic's own CRM tags are "YA CANCELÓ EL SERVICIO" (paid; on 16 appointments) and "FALTA CANCELAR" (unpaid). The hub's "Cancelar" action and "Cancelada" status say the opposite.

### Stock after the 2026-11-18 count

FACES stock was squared to a physical count taken 2026-11-18 16:00 (adjustment STE-2026-00694, `metadata.reconciliation = true`, `metadata.countedAt`). Completing any of the old open appointments today issues supplies that the count already accounted for.

## TO-BE

### 1. "Por cerrar" (to close)

- A live appointment (`pending` or `accepted`) is **Por cerrar** once the organization's local midnight after its day has passed (FACES: America/Lima).
- It is **derived** from the clock and the organization's time zone, never stored, so no job runs and nothing is migrated.
- The agenda draws it in a distinct style, and the inbox raises "N citas por cerrar" at the same moment.
- A Por cerrar appointment offers exactly three outcomes: **Completada**, **Desagendar**, **Archivar** (plus **Anular** in the submenu, §4).

### 2. Desagendar, on every appointment

- Every appointment's context menu has **Desagendar**, paid or not, past or future.
- Desagendar moves the appointment to a new live status **`unscheduled`**: it leaves the calendar grid, keeps its client, treatment, sale lines and package session, and keeps its stock **reservation** (decision 1: reserved, not consumed).
- The appointment remembers its last time and staff member, shown as "Antes: 18/11 17:15 · <miembro del equipo>".
- **"No vino"** is a Desagendar with reason `no_vino` (decision 2): the client keeps the session and the payment; nothing is refunded.
- Re-assigning = dropping it on the calendar or picking a time, which reuses today's move and returns it to `accepted`.
- An `unscheduled` appointment **does not block a time slot**, gets **no reminders**, and is never counted as a no-show or a cancellation.
- Today's paid-only "Desagendar" switches to this behaviour; it no longer stores `cancelled`.

### 3. One tray, items told apart by status (decision 3)

- One **"Pendientes"** tray replaces "Servicios pagados sin agendar".
- Every item carries a visible status chip, and the tray has a filter per chip:

  | Chip | What it is | Source |
  |---|---|---|
  | **Por cerrar** | appointment past its day, still open | §1 |
  | **No vino** | unscheduled, reason `no_vino` | §2 |
  | **Desagendada** | unscheduled, any other reason | §2 |
  | **Pagado sin agendar** | paid service with no appointment yet | today's tray |

- A paid item shows a "Pagado" mark whatever its chip.
- Each item offers the next step where it sits: Por cerrar → its three outcomes; the others → "Agendar" (drag or pick a time).

### 4. Archivar is the main close; Anular is in a submenu (decision 5)

- **Archivar** closes an appointment that will not happen and needs no follow-up. It requires a reason: *El cliente desistió*, *Duplicada*, *Otro (texto)*. It stores a new final status **`archived`**, releases the stock reservation, and **does not** hand back the package session or money (decision 2: no refund unless asked).
- **Anular** is today's cancel, unchanged in behaviour (releases the reservation, hands back the package session; the existing paid-cancel flow handles money). It moves into a **"Más…" submenu** and is relabelled "Anular cita".
- "Marcar inasistencia" and "Cancelar" leave the appointment menus.
- Stored history is kept: existing `no_show` and `cancelled` appointments keep their status and show as "No vino (anterior)" and "Anulada".
- The word *Cancelar/Cancelada* no longer names an appointment action or status. Generic dialog buttons elsewhere are out of scope.

### Invariants

- A live appointment is never left without a path: it is upcoming, Por cerrar, or in the Pendientes tray.
- A treatment's supplies leave stock exactly once, at completion (spec 120); a reservation is released only by Archivar or Anular.
- A package session or a payment is handed back only by Anular.
- An `unscheduled` appointment never occupies a time slot.

## DELTA

| Transition | Proof (test to add) |
|---|---|
| Live appointment after its local midnight: no marker → Por cerrar (derived, time-zone aware) | unit: `isPorCerrar(booking, now, tz)` at 23:59 / 00:00 Lima, DST-free and UTC-offset cases |
| Inbox: nothing → "N citas por cerrar" at midnight | rule test like `service-paid-unscheduled` |
| Desagendar on an unpaid appointment: not offered → `unscheduled`, reservation kept, session kept | service: status + log row, no `releaseAccruals`, no redemption reversal |
| Desagendar on a paid appointment: `cancelled` + unlinked lines → `unscheduled`, lines stay linked | service: replaces `unscheduleVisit` semantics; existing tests rewritten |
| "No vino": `no_show` (releases, hands session back) → `unscheduled` reason `no_vino` (keeps both) | service test |
| `unscheduled` appointment: blocks its slot, gets reminders → neither | slot-conflict query test; `reminders.ts` test |
| Re-assigning an `unscheduled` appointment: n/a → `accepted` with the new time, reservation unchanged | service: move path accepts `unscheduled` |
| Archivar: n/a → `archived` + reason, reservation released, session and money untouched | service test; transition guard treats `archived` as final |
| Anular: top-level "Cancelar" → submenu "Anular cita", behaviour unchanged | component: menu structure; existing cancel tests unchanged |
| Tray: "Servicios pagados sin agendar" → "Pendientes" with four chips and filters | component + server listing test |
| Every reader of booking status (receivables audit, unbilled, analytics, booking groups, colours, notifications fields) handles `unscheduled` and `archived` | one test per reader, listed in the plan |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Close yesterday's agenda (Priority: P1)

At the start of the day the receptionist opens the agenda. Every appointment from previous days still open shows as Por cerrar, the inbox says how many, and the Pendientes tray lists them. For each one she picks Completada, Desagendar or Archivar.

**Why this priority**: 101 appointments sit open today with no prompt to close them, and leaving them open is how stock and receivables drift.

**Independent Test**: an `accepted` appointment dated yesterday shows as Por cerrar after local midnight and not before; each of the three outcomes leaves it in the right status.

**Acceptance Scenarios**:

1. **Given** an accepted appointment on 18/11, **When** it is 23:59 on 18/11 in Lima, **Then** it is not Por cerrar; **When** it is 00:00 on 19/11, **Then** it is.
2. **Given** a Por cerrar appointment, **When** the receptionist opens its menu, **Then** she sees Completada, Desagendar and Archivar, and "Anular cita" only under "Más…".
3. **Given** a completed or archived appointment, **Then** it is never Por cerrar.

### User Story 2 — The client did not come (Priority: P1)

The client misses her appointment. The receptionist chooses "No vino". The appointment leaves the calendar, appears in Pendientes with the "No vino" chip, and keeps her payment and her package session. When the client calls, the receptionist drags it to a new time.

**Independent Test**: "No vino" on a paid, package-funded appointment: status `unscheduled`, sale lines still linked, session not reversed, reservation still open; dragging it to a time returns it to `accepted`.

**Acceptance Scenarios**:

1. **Given** a paid appointment, **When** "No vino" is chosen, **Then** it shows in Pendientes as "No vino · Pagado" and nothing is refunded.
2. **Given** that item, **When** it is dropped on a free slot, **Then** it is `accepted` at the new time with the same sale and session.
3. **Given** an `unscheduled` appointment, **Then** its old time slot is free for another booking.

### User Story 3 — Desagendar any appointment (Priority: P2)

Two days before, the client asks to postpone without a new date. The receptionist right-clicks the appointment and chooses Desagendar. It waits in Pendientes with the "Desagendada" chip.

**Acceptance Scenarios**:

1. **Given** any live appointment, paid or not, **Then** its context menu offers Desagendar.
2. **Given** an `unscheduled` appointment, **Then** no reminder is sent for its old time.

### User Story 4 — Archive what will not happen (Priority: P2)

A duplicate appointment, or a client who says she no longer wants the treatment. The receptionist chooses Archivar and a reason. The appointment closes, its reserved supplies are freed, and nothing is refunded.

**Acceptance Scenarios**:

1. **Given** a live appointment, **When** Archivar is chosen without a reason, **Then** it is refused with the reason list in view.
2. **Given** Archivar with "Duplicada", **Then** the status is `archived`, the reservation is released, and the package session stays used.
3. **Given** a client who asks for her money back, **When** the receptionist uses "Más… → Anular cita", **Then** today's cancel flow runs unchanged.

### Edge Cases

- An appointment grouped with others in one visit: Desagendar, Archivar and Anular act on the whole visit, as `unscheduleVisit` and `setVisitStatus` do today.
- A Por cerrar appointment linked to a sale that is later voided: the void flow is unchanged; the appointment stays Por cerrar until closed.
- Recurring series: Desagendar acts on one occurrence; the others stay booked.
- An `unscheduled` appointment never re-assigned: it stays in Pendientes indefinitely; it is not auto-archived (no auto-close, owner's happy path).
- Organization without a time zone set: falls back to the hub default zone, as the other date controls do.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST mark a `pending`/`accepted` appointment as Por cerrar once the organization's local midnight after its start date has passed, computed at read time.
- **FR-002**: The inbox MUST show the count of Por cerrar appointments from that same moment, deduplicated per day.
- **FR-003**: Every appointment context menu MUST offer Desagendar for live appointments, paid or not.
- **FR-004**: Desagendar MUST store status `unscheduled` with a reason (`no_vino` or `desagendada`), write a status-log row, keep sale-line links, keep the package session, and keep the stock reservation.
- **FR-005**: An `unscheduled` appointment MUST NOT occupy its time slot, MUST NOT receive reminders, and MUST be re-assignable to `accepted` by moving it.
- **FR-006**: Archivar MUST require a reason and store final status `archived`; it MUST release the stock reservation and MUST NOT reverse the package session or any payment.
- **FR-007**: Anular MUST keep today's cancel behaviour and appear only in a "Más…" submenu labelled "Anular cita".
- **FR-008**: The agenda MUST NOT offer "Marcar inasistencia" or a top-level "Cancelar" for appointments.
- **FR-009**: The Pendientes tray MUST list Por cerrar, No vino, Desagendada and Pagado sin agendar items, each with a visible status chip and a filter, and mark paid items.
- **FR-010**: Every server reader of booking status MUST treat `unscheduled` as live-but-off-calendar and `archived` as final-not-done.
- **FR-011**: Stored `no_show` and `cancelled` history MUST stay unchanged and display as "No vino (anterior)" and "Anulada".
- **FR-012**: Completing an appointment whose time is before the latest stock checkpoint covering one of its supplies (spec 135) MUST close it without issuing that supply; supplies not covered by a checkpoint are issued as today. The completion dialog MUST name the checkpoint ("Contado el 18/11 16:00: no descuenta Ácido Desoxicólico").

### Key Entities

- **Appointment** (`sched_bookings`): gains statuses `unscheduled` (live, off-calendar) and `archived` (final). Last time and staff member stay in `start_time`/`resource_id`.
- **Status log** (`sched_booking_status_log`): reason carries `no_vino`, `desagendada`, or the Archivar reason.
- **Pendientes item**: an appointment (Por cerrar or unscheduled) or a paid sale line without an appointment.

## Success Criteria *(mandatory)*

- **SC-001**: After release, FACES has 0 live appointments more than one day past their date that are not shown as Por cerrar.
- **SC-002**: Within two weeks of release, the 101 open past appointments are closed or unscheduled (from 101 to under 10).
- **SC-003**: Of new missed appointments, the share followed by nothing (56 of 107 today) drops, because each lands in Pendientes instead of a final status.
- **SC-004**: No package session or payment is handed back except through Anular.

## Stock checkpoints (formerly the open question)

Resolved by the owner's checkpoint proposal (decision 6). Spec 135 defines the checkpoint: a locked physical count per item and warehouse, with the time it was taken. Spec 134 only reads it (FR-012). Slice S1 of this spec ships after spec 135's first slice, so the backlog of open appointments can be closed without moving counted stock twice.

## Assumptions

- FACES is the only organization using appointments; rules apply to all organizations.
- Refunds of money keep using the existing paid-cancel flow; this spec adds none.
- UI changes follow the FigCraft demo-first rule; the as-is/to-be demo is linked from the plan.
- Spec 133 (charging an existing appointment) is independent; both touch the agenda menu, and whichever lands second rebases.
