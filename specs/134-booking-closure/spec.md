---
id: 134-booking-closure
title: Appointment lifecycle — two-layer statuses with a hardened state machine, payment as its own track, Por cerrar, Desagendar, Archivar, board view
stage: spec
status: draft
verdict: pending
pass: 2
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
tags: [ui, data]
related: [135-stock-checkpoints, 120-till-corrections, 133-pos-session-existing-appointment, 116-pos-booking-state-hardening]
---

# Feature Specification: Appointment lifecycle (closing appointments)

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

Approval of pass 1, 2026-11-20: "I approve the rest, btw."

**Pass 2 (rescope), owner 2026-11-20, verbatim:**

- "anything interpreted as a negation (jev eval) should initiate a process where the agent confirms the negation, asks the patient how they want to proceed and reports this to the staff. For this, consider event statuses like how notion has nested status types (2 layers …) but relevant to this industry (eg. "to-do": scheduled, awaiting confirmation after a confirmation message is sent, awaiting payment; "complete": canceled, completed, refunded; etc). Obviously, this implies a new state machine, so logic between each state should be enforced." The WhatsApp follow-up itself is spec 138; this spec owns the statuses and the state machine.
- On completing an unscheduled appointment: "for best practice, it should have a time first"
- "Consider adding to the team calendar as its own kanban view. when the staff user switches views from cal to kanban, keep the same date range filter … Switching back from the kanban to cal should also be smart, but I leave that logic up to you."
- On the status tree proposed in chat: "Yes, it looks good. Just please make sure the state machine's logic is hardened."
- On payment: "faces takes payment before appts. But maybe you're right that appts should have separate payment statuses, since the appt status vs payment status can move independently. The only strict rule that FACES follows is that an appt cannot be counted as completed until all payments are settled."

## AS-IS (observed 2026-11-19, prod read-only + PostHog, hub `origin/master` `63c4313b`)

### States and actions today

- Stored statuses: `pending`, `accepted` (live, `ACTIVE_STATUSES`, `src/server/services/scheduling-bookings.service.ts:105`); `completed`, `no_show`, `cancelled`, `rejected` (final; a final appointment refuses every change, spec 116 FR-009, `setBookingStatusInTx` guard ~1112).
- `no_show`, `cancelled` and `rejected` release the stock reservation and **hand the package session back** (`RELEASING`, ~1056; `reverseBookingRedemptionsInTx`).
- The agenda (`src/routes/(app)/pos/appointments/PageBody.svelte`) offers "Marcar completada", "Marcar inasistencia" (~1286) and cancel (~1309, ~1344 with reason `deleted`) on every appointment.
- **"Desagendar" has no button today.** The calendar menu entry was removed on 2026-10-13 (#517, commit `03a7ddc1`), and no drawer button calls it either. The route `/api/pos/appointments/[id]/unschedule` and `unscheduleVisit` (~1274) still exist, unused. When called, it unlinks every sale line of the visit (they reappear in "Servicios pagados sin agendar", `listPendingSchedulingLines`, `src/server/services/pos-accounts.service.ts:496`) and stores the appointment as **`cancelled`** with reason `unscheduled`. (Corrected during planning; see `research.md` § Spec corrections.)
- An appointment always has a time and a staff member: `start_time`, `end_time`, `resource_id` are `NOT NULL`.
- When an appointment's time passes its status never changes. An inbox rule, `appointment.overdue` ("Cita sin cerrar", `src/server/services/inbox/rules/appointment-overdue.ts`), raises one notification per visit 30 minutes after the end time. FACES has received **152** of them since 2026-10-11; **30** were ever opened and **142** are still unresolved. The alert has no action attached, so the appointment stays `accepted`/`pending` indefinitely.

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
| "Desagendar" | 2 clicks, 2026-10-11 (the button was removed two days later) |
| Past appointments still reserving stock, 3 Oct – 7 Nov | 57 (sent to the clinic as a CSV on 2026-11-19 to close by hand) |

Classification: same `crm_contact_id`, same event type or title, later `start_time`. Query: `~/.cache/claude-tmp/receipt-fix/lost.sql` (session 2026-11-19).

### Vocabulary clash

In Peruvian Spanish *cancelar* means **to pay**. The clinic's own CRM tags are "YA CANCELÓ EL SERVICIO" (paid; on 16 appointments) and "FALTA CANCELAR" (unpaid). The hub's "Cancelar" action and "Cancelada" status say the opposite.

### Stock after the 2026-11-18 count

FACES stock was squared to a physical count taken 2026-11-18 16:00 (adjustment STE-2026-00694, `metadata.reconciliation = true`, `metadata.countedAt`). Completing any of the old open appointments today issues supplies that the count already accounted for.

## TO-BE

### 1. Two-layer statuses

Every appointment has exactly one **status**. Each status belongs to one **group**; the group is never stored, it is a fixed property of the status.

| Group | Status (UI) | Key | Meaning |
|---|---|---|---|
| **Por hacer** | Agendada | `pending` (kept) | booked, nothing sent yet |
| | Por confirmar | `awaiting_confirmation` | confirmation message sent, no answer yet |
| | Confirmada | `accepted` (kept) | client said yes, or staff confirmed |
| | Por reconfirmar | `reconfirm` | client said no or something unclear; the agent is following up (spec 138) |
| | Desagendada | `unscheduled` | no time; waits to be re-booked; reason `no_vino` or `sin_fecha` |
| **En curso** | En atención | `checked_in` | client arrived (check-in) |
| | Por cerrar | `to_close` | its day ended (org-local midnight) and it was not closed |
| **Cerrada** | Completada | `completed` (kept) | treatment done; supplies issued (spec 120, 135) |
| | Archivada | `archived` | will not happen, no follow-up; reason required; nothing refunded |
| | Anulada | `cancelled` (kept) | cancelled at the client's request; package session handed back |
| | Reembolsada | `refunded` | cancelled and its payments refunded |
| | Rechazada | `rejected` (kept) | an online booking request the clinic declined |
| | No vino (anterior) | `no_show` (kept, read-only) | history before this spec; no new appointment enters it |

Keys already in use keep their value, so existing rows keep their meaning and only new keys are added.

### 2. The state machine (hardened)

**One table, one gate.** Every status change, from any surface (agenda, drawer, board drag, bookings list, assistant tool, reminder replies, the clock), goes through one server function that checks the table below. Nothing else writes `sched_bookings.status`.

| From | To | Who / what | Guards |
|---|---|---|---|
| Agendada | Por confirmar | system (confirmation message sent) | message actually delivered to the channel |
| Agendada, Por confirmar, Por reconfirmar | Confirmada | client "yes" (reply), staff | — |
| Por confirmar, Confirmada | Por reconfirmar | agent (negation classified, spec 138) | reply after the message; not already closed |
| any Por hacer except Desagendada | Desagendada | staff ("Desagendar"; "No vino") | reason required |
| Desagendada | Agendada / Confirmada | staff (new time via drag or picker) | a new start time is set in the same change |
| Agendada, Por confirmar, Confirmada | En atención | staff (check-in) | appointment day is today |
| Agendada, Por confirmar, Confirmada, Por reconfirmar, En atención | Por cerrar | clock (org-local midnight after its day) | still in that status at midnight |
| En atención, Por cerrar, Confirmada (same day) | Completada | staff | **payments settled (§3)**; supplies confirmed (spec 120/135) |
| any Por hacer, En curso | Archivada | staff | reason required (desistió, duplicada, otro) |
| any Por hacer, En curso | Anulada | staff, via "Más… → Anular cita" | reason required; package session handed back |
| Anulada | Reembolsada | system, when every payment of the appointment's sale is refunded | refunds recorded on the sale |
| Agendada, Por confirmar (online request) | Rechazada | staff | — |
| any Cerrada | anything | — | **refused**: a closed appointment never reopens; offer "Crear cita nueva" |

**Hardening rules:**

- **Compare-and-set:** a change names the status it expects to leave (`from`). The update applies only if the row still has it (row lock in the same transaction). Two receptionists or the clock and a receptionist can never both win. A lost race is refused with "La cita cambió mientras tanto: ahora está {estado}" and the current state.
- **Idempotent:** asking for the status the appointment already has is a success with no new log row.
- **Every change writes one log row** (from, to, actor: staff, client reply, agent, clock or system; reason; time) in the same transaction. Effects run in the same transaction as the change: stock reservation release, package session hand-back, notifications. The only exception is effects that are explicitly post-commit and idempotent today (reservation release).
- **Unknown or illegal pairs are refused** with a reason and the next step, never silently mapped.
- **Grouped visits:** a change on one appointment of a visit applies per member, all or none, with the same table checked per member.
- **The clock is an actor like any other:** the midnight job uses the same gate, so it never overrides a closed or desagendada appointment. If the job is late, reads still show a past-day open appointment as Por cerrar (derived fallback), and the job records the stored change when it runs.
- **Database backstop:** a trigger refuses any write of a status value outside the known keys, and any change out of a Cerrada status. App bugs or scripts cannot create an illegal state.
- **Tested exhaustively:** a test enumerates every (from, to, actor) pair, and asserts that only the table's pairs succeed.

### 3. Payment is its own track

- Each appointment shows a **payment state** next to its status, computed from the sale lines linked to it:

| State | When |
|---|---|
| Sin cobro | no linked sale line |
| Adelanto | some paid, a balance remains |
| Pagado | everything settled (a 0-price line counts as settled) |
| Por cobrar | charged but unpaid |
| Reembolsado | payments refunded |

- Status and payment move independently (decision, owner 2026-11-20), with **one strict rule per organization**: "an appointment cannot be Completada until all payments are settled". It is an org setting, on for FACES.
- Completing an unsettled appointment is refused with "Falta cobrar S/ {saldo}" and a **"Cobrar ahora"** action that opens the till for that appointment.
- Spec 120's "products issue at the sale" is unchanged; payment never moves stock.

### 4. Por cerrar

- At org-local midnight after its day, an appointment still in Agendada, Por confirmar, Confirmada, Por reconfirmar or En atención becomes **Por cerrar** (clock transition, §2).
- The time zone is the one the calendar uses.
- The agenda draws it in a distinct style.
- The inbox raises **one** notification per day: "N citas por cerrar". It links to the Pendientes tray filtered to Por cerrar, and is resolved when none remain. It replaces today's per-appointment "Cita sin cerrar" (`appointment.overdue`).
- From Por cerrar the menu offers: **Completar** (if paid), **Desagendar**, **Archivar**, and "Más… → Anular cita".

### 5. Desagendar, on every appointment

- Every Por hacer appointment's menu has **Desagendar** ("No vino" or "Sin fecha nueva").
- The appointment leaves the calendar grid. It keeps client, treatment, sale lines, package session and stock **reservation** (decision 1: reserved, not consumed). It shows "Antes: 18/11 17:15 · <miembro del equipo>".
- "No vino" refunds nothing (decision 2).
- It does not block a time slot and gets no reminders.
- It **must get a new time before it can be completed** (owner: "it should have a time first").
- Today's orphaned `unscheduleVisit` path is replaced by this transition.

### 6. Archivar and Anular

- **Archivar** is the main close (decision 5): a reason is required, it releases the reservation, and it keeps the package session and payments.
- **Anular cita** sits under "Más…". It hands back the package session, and money refunds go through the existing paid-cancel flow. When every payment is refunded, the system moves it to **Reembolsada**.
- "Marcar inasistencia", "Cancelar" and "Eliminar" leave every appointment surface (hover card, drawer, list, board, context menu).
- *Cancelar/Cancelada* no longer name an appointment action or status, because in Peru "cancelar" means "to pay".

### 7. One Pendientes tray (POS agenda)

- One **"Pendientes"** tray replaces "Servicios pagados sin agendar". Each item carries a status chip and a payment chip; the chip filters are Por cerrar, Por reconfirmar, Desagendada (No vino / Sin fecha) and Pagado sin agendar.
- Each item offers its next step where it sits.

### 8. Board (Kanban) view on the team calendar

- The team calendar (`/scheduling/calendar`) keeps its views: calendar, table and board.
- The **board** shows columns per status, grouped under Por hacer / En curso / Cerrada. Cerrada can be collapsed.
- Dragging a card to another column runs the same gate (§2). Illegal drops are refused with the reason, and Cerrada columns accept only legal closes.
- **Shared date range:**
  - Switching calendar → board keeps the visible range (e.g. Sep 3–10) as the board's filter. The user can edit it on the board.
  - Switching board → calendar opens at the range start, choosing the zoom from the range length: 1 day → day view, 2–7 days → week view, longer → month view.
  - The range is kept in the URL, so reloads and shared links keep it.
- Desagendada appointments have no time, so they always show in their column, whatever the range.

### Invariants

- Every appointment has exactly one status from §1; its group is derived.
- Only the table in §2 changes a status; every change has exactly one log row; a Cerrada appointment never changes again.
- With the org rule on, no appointment is Completada while its payments are unsettled.
- A treatment's supplies leave stock exactly once, at completion (spec 120); spec 135 checkpoints decide whether that moves stock.
- A package session or payment is handed back only by Anular (and Reembolsada follows refunds).
- An `unscheduled` appointment never occupies a time slot and never receives reminders.

## DELTA

| Transition | Proof (test to add) |
|---|---|
| Statuses: 6 flat values → 13 in 3 groups (§1), keys kept where the meaning is unchanged | unit: group of every key; label maps cover every key |
| Status writes from 7 surfaces → one gate with the §2 table, compare-and-set, idempotence, one log row | exhaustive (from, to, actor) matrix test; concurrent-change test (second writer refused with the current state) |
| No DB guard → trigger refusing unknown keys and changes out of Cerrada | SQL integration test |
| Reminder sent: no status change → Agendada → Por confirmar | reminders service test |
| Reply "no": `cancelled` + session handed back → Por reconfirmar, nothing handed back (follow-up in spec 138) | reminders service test |
| Past day, open: stays open forever, one alert per visit → Por cerrar at local midnight (clock via the gate; derived fallback), one daily inbox count | clock job test (idempotent, never touches closed/desagendada); `appointment-overdue` rule rewritten |
| Completar unpaid (FACES rule on): allowed → refused "Falta cobrar S/ …" with "Cobrar ahora" | service + component test; org setting off → allowed |
| Payment chip: none → Sin cobro / Adelanto / Pagado / Por cobrar / Reembolsado from linked lines | unit test of the derivation incl. 0-price lines |
| Desagendar: orphaned, stores `cancelled` → `unscheduled` with reason, keeps lines, session, reservation; time required before completion | service tests |
| Inasistencia / Cancelar / Eliminar on 5 surfaces → Archivar (reason) + "Más… → Anular cita" | component tests per surface |
| Anulada + all payments refunded: stays cancelled → Reembolsada (system) | service test |
| Tray: paid-only → Pendientes with status + payment chips | component + listing test |
| Board view: columns by flat status → grouped columns; drag runs the gate; range shared with calendar, smart return | component tests; URL round-trip test |
| Every status reader (37 sites, plan research R12) handles the new keys | one test per reader |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Close yesterday's agenda (Priority: P1)

At the start of the day, every open appointment from earlier days is Por cerrar. The inbox shows "9 citas por cerrar"; the Pendientes tray lists them with their payment chip. For each, the receptionist picks Completar (paid ones), Desagendar or Archivar.

**Acceptance Scenarios**:

1. **Given** a Confirmada appointment on 18/11, **When** it is 00:00 on 19/11 in the org's time zone, **Then** it is Por cerrar (stored by the clock, or derived if the clock has not run).
2. **Given** a Por cerrar appointment with S/ 300 unpaid and the org rule on, **When** Completar is chosen, **Then** it is refused with "Falta cobrar S/ 300" and a "Cobrar ahora" action.
3. **Given** an Archivada or Completada appointment, **When** any change is attempted, **Then** it is refused and "Crear cita nueva" is offered.

### User Story 2 — The client did not come (Priority: P1)

The receptionist chooses Desagendar → No vino. The appointment leaves the calendar, keeps payment and session, and waits in Pendientes. When the client calls, it is dragged to a new time and is Confirmada again; only then can it be completed.

**Acceptance Scenarios**:

1. **Given** "No vino" on a paid appointment, **Then** status Desagendada, payment chip Pagado, nothing refunded, reservation kept.
2. **Given** a Desagendada appointment, **When** Completar is attempted, **Then** it is refused: "Primero dale una hora".
3. **Given** it is dropped on a free slot, **Then** it is Confirmada at the new time; its old slot is free.

### User Story 3 — Two people act at once (Priority: P1)

The clock marks an appointment Por cerrar at 00:00:01 while a receptionist completes it at 23:59:59 on a slow connection. Exactly one change wins. The other sees the current status and no duplicate log row or double stock issue happens.

**Acceptance Scenarios**:

1. **Given** two concurrent changes from the same status, **Then** one succeeds and the other is refused with the current status.
2. **Given** a repeated identical request (double click), **Then** the second is a no-op success with no new log row.

### User Story 4 — Board view keeps the range (Priority: P2)

A coordinator looks at Sep 3–10 on the team calendar and switches to the board. The board shows Sep 3–10 by status. She widens it to Sep 1–15 and switches back; the calendar opens in month view at Sep 1.

**Acceptance Scenarios**:

1. **Given** the calendar showing Sep 3–10, **When** switching to the board, **Then** the board's range is Sep 3–10 and editable.
2. **Given** the board range is one day, **When** switching to the calendar, **Then** day view at that day; 2–7 days → week view; longer → month view at the range start.
3. **Given** a card dragged from Confirmada to Archivada, **Then** the reason dialog opens; dropping on an illegal column is refused with the reason.

### User Story 5 — Archive or annul (Priority: P2)

A duplicate is archived with reason "Duplicada": closed, nothing refunded. A client asks for her money back: "Más… → Anular cita", the session goes back, and once the refund is recorded the appointment shows Reembolsada.

### Edge Cases

- Grouped visit: Desagendar, Archivar, Anular apply to every member, all or none.
- Recurring series: each occurrence has its own status; a change applies to one occurrence unless the user picks the series option that exists today.
- An appointment whose day ended while in Por reconfirmar (spec 138 still talking to the client) becomes Por cerrar; the agent conversation result is still reported to staff.
- Online request never answered: stays Agendada until midnight, then Por cerrar, where Rechazada is not offered (staff archive it instead).
- 0-price appointments (controls): payment Pagado, so the completion rule never blocks them.
- Legacy `no_show` rows: shown as "No vino (anterior)" in Cerrada; no transition in or out.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store one status per appointment from §1 and derive its group.
- **FR-002**: Every status change MUST go through one server gate implementing the §2 table: compare-and-set on the expected status, idempotence, one log row with actor and reason, effects in the same transaction.
- **FR-003**: Illegal changes MUST be refused with the reason and the next step; changes out of Cerrada MUST be refused.
- **FR-004**: A database trigger MUST refuse unknown status keys and changes out of Cerrada statuses.
- **FR-005**: Sending a confirmation message MUST move Agendada to Por confirmar; a "yes" reply MUST move it to Confirmada; a negation MUST move it to Por reconfirmar and MUST NOT cancel or hand anything back (follow-up: spec 138).
- **FR-006**: At org-local midnight after its day, an open appointment (Agendada, Por confirmar, Confirmada, Por reconfirmar, En atención) MUST become Por cerrar through the gate; reads MUST show it as Por cerrar even if the job has not run.
- **FR-007**: The inbox MUST raise one daily "N citas por cerrar" notification per org linking to the tray, resolved at zero; the per-visit `appointment.overdue` notifications MUST stop and the open ones MUST be resolved on release.
- **FR-008**: Each appointment MUST show a payment state (Sin cobro, Adelanto, Pagado, Por cobrar, Reembolsado) derived from its linked sale lines; 0-price lines count as settled.
- **FR-009**: When the org setting "completar solo con pagos saldados" is on, Completar MUST be refused while payment is not Pagado, offering "Cobrar ahora". FACES MUST have it on.
- **FR-010**: Desagendar MUST be offered on every Por hacer appointment, store `unscheduled` with reason `no_vino` or `sin_fecha`, keep sale lines, session and reservation, free the slot, stop reminders, and require a new time before completion.
- **FR-011**: Archivar MUST require a reason, store `archived`, release the reservation, and not hand back session or payments.
- **FR-012**: Completing an appointment whose time is before the latest stock checkpoint covering one of its supplies (spec 135) MUST close it without issuing that supply, naming the checkpoint in the dialog.
- **FR-013**: Anular MUST keep today's cancel behaviour, appear only under "Más…", and move to Reembolsada when every payment is refunded.
- **FR-014**: "Marcar inasistencia", "Cancelar" and "Eliminar" MUST NOT appear on any appointment surface.
- **FR-015**: The POS agenda MUST show one Pendientes tray with status and payment chips and per-chip filters.
- **FR-016**: The team calendar board MUST group columns by status group, run the gate on drag, share the date range with the calendar via the URL, and choose the calendar zoom from the range when switching back.
- **FR-017**: Every server reader of booking status MUST handle the new keys (inventory in the plan).
- **FR-018**: Legacy `no_show` rows MUST display as "No vino (anterior)" and accept no transition.

### Key Entities

- **Appointment** (`sched_bookings`): `status` from §1 (new keys added, existing kept); last time and staff member stay in `start_time`/`resource_id` while desagendada.
- **Status log** (`sched_booking_status_log`): from, to, actor kind, actor id, reason, time.
- **Org scheduling setting**: "completar solo con pagos saldados" (boolean).
- **Payment state**: derived, not stored.

## Success Criteria *(mandatory)*

- **SC-001**: After release, no live appointment from a previous day exists outside Por cerrar, Desagendada or Cerrada.
- **SC-002**: Within two weeks, FACES' 101 open past appointments drop below 10.
- **SC-003**: The exhaustive transition test passes, and production status-log rows over the first month contain no pair outside the §2 table.
- **SC-004**: No FACES appointment is Completada with an unsettled payment after release.
- **SC-005**: No package session or payment is handed back except through Anular.

## Stock checkpoints

Spec 135 defines checkpoints; this spec only reads them (FR-012). 135-S1 ships first.

## Assumptions

- FACES is the only organization using appointments; rules apply to all organizations.
- Refunds of money keep using the existing paid-cancel flow; this spec adds none.
- UI changes follow the FigCraft demo-first rule; the as-is/to-be demo is linked from the plan.
- Spec 133 (charging an existing appointment) is independent; both touch the agenda menu, and whichever lands second rebases.
- "En atención" needs a check-in action, which the hub does not have today; it is a new button on the appointment (hover card, drawer, board). Using it is optional: an appointment can go from Confirmada to Completada on its day without check-in.
- Spec 138 (WhatsApp negation follow-up) owns the agent conversation and the staff report; it drives the Por confirmar → Por reconfirmar → Confirmada/Desagendada/Archivada transitions through this spec's gate.
- Pass 2 supersedes the pass-1 plan's slice contents; the plan is revised before tasks.
