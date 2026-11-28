---
id: 139-reminder-negation-followup
title: When a client says "no" to a reminder — the agent confirms, asks how to proceed, and reports to staff (no automatic cancel)
stage: deploy
status: merged
verdict: approved
pass: 1
created: 2026-11-20
updated: 2026-11-25
repos: [minion_hub, minion]
tags: [data, ui]
related: [134-booking-closure]
---

# Feature Specification: Reminder negation follow-up

> **Merged and deployed 2026-11-25 (S1–S4), hub master `133c4154`.**
> - The slices: S1 #724, S2 #728, S3 #729, S4 #730. Three Opus audit rounds were run; round 3's Major was fixed before merge.
> - **Not running yet.** The reminders tick is wired on netcup but PAUSED: FACES WhatsApp `+51906090526` is unlinked, and a failed send is never retried (`proposals/2026-11-25-reminders-failed-send-retry.md`).
> - Open ends: `proposals/2026-11-25-specs-139-140-open-ends.md`.

**Feature Branch**: `feat/139-reminder-negation-followup` (hub base `master`; gateway base `DEV` if a gateway change is needed)

**Created**: 2026-11-20

**Status**: Draft

**Input**: Owner, 2026-11-20: "anything interpreted as a negation (jev eval) should initiate a process where the agent confirms the negation, asks the patient how they want to proceed and reports this to the staff."

Go-ahead, owner 2026-11-23: "address all items without overlap first. When they're live, list out the items with overlap with their updated status in case another session addressed them and what your recommended approach is." This spec was reported as having no overlap with other work (overlap check of 2026-11-23, spec 134 PR #1056).

UI approval, owner 2026-11-25 (after the FigCraft demo preview https://claude.ai/artifact/MLm5NPbN3mNfXbriMkVxd4): "I love the UI demos. Implement all and lmk when live."

## AS-IS (observed 2026-11-20, prod read-only, hub `origin/master` `63c4313b`)

- **Confirmation scan**: `scanConfirmationReplies` (`src/server/services/reminders.service.ts` ~328) runs on the jobs tick.
  - Scope: appointments still `pending` that got a client confirmation reminder in the last 7 days.
  - It reads the client's inbound WhatsApp messages since the reminder, from the `messages` table, matched on the last 9 digits of the phone.
- **Decision**: either the keyword parser `parseYesNo`, or, with `inferConfirmation` on, a one-word model verdict, `inferConfirmationReply` (`src/server/services/reminder-compose.ts:31`, YES / NO / UNCLEAR).
- **On "no"**: `setBookingStatus(…, 'cancelled')`. The stock reservation is released, the package session is handed back, and a CRM activity `booking_declined` is written. Nobody talks to the client again, and staff get no notice.
- **On "unclear"**: nothing; the scan retries on the next tick.
- **Usage**: the flow has **never run** in production. `sched_reminders` has 0 rows in any org, and `crm_activities` has 0 `booking_confirmed` / `booking_declined`. FACES has not enabled reminders, and its WhatsApp numbers were reported logged out around 2026-11-13.

## TO-BE

Statuses and their transitions belong to spec 134 (§1–§2, one gate). This spec defines what the reminder flow and the agent do inside them.

### 1. Classification (the "JEV eval")

- Each new inbound reply after a confirmation is classified as **yes**, **negation** or **unclear**.
- Negation covers no, cannot come, want to change, cancel, and similar.
- The classifier sees the reminder text and the replies, not just the last message.
- Every verdict and its confidence are logged, so thresholds can be tuned later.
- A low-confidence negation is treated as **unclear**, never as a negation.

### 2. Yes

Por confirmar → **Confirmada** (spec 134 gate), as today.

### 3. Negation: confirm, ask, report

1. The appointment moves Por confirmar/Confirmada → **Por reconfirmar** (spec 134). **Nothing is cancelled, released or refunded.**
2. The agent writes to the client in the same WhatsApp chat, in the org's tone. It confirms what it understood and offers the ways forward:
   > "Entiendo que no podrás venir el jueves 21/11 a las 17:15 para tu Afinamiento Facial. ¿Prefieres que te busquemos otra fecha, o no deseas continuar con la cita?"
3. The agent classifies the client's answer:
   - **Otra fecha**: if the client names a time, the agent can propose free slots of the same treatment and staff member. A slot is booked only after the client accepts a specific one, and then the appointment is Confirmada at the new time. Otherwise it becomes **Desagendada** (reason `sin_fecha`), waiting for staff.
   - **No continuar**: the appointment stays Por reconfirmar with the result "No desea continuar". Archivar or Anular stays a **staff decision**, because money and sessions are involved (owner: "No refund unless explicitly requested").
   - **Changed mind, will come**: Confirmada.
   - **No answer within the org's wait time** (default 24 h, and never later than 2 h before the appointment): stays Por reconfirmar, result "Sin respuesta".
4. **Report to staff**: one inbox notification per case, for staff with scheduling permission. It also shows on the appointment (drawer and Pendientes tray chip "Por reconfirmar"). The report includes:
   - the client;
   - the appointment;
   - the agent's summary in one line;
   - the result (Reprogramada / Desagendada / No desea continuar / Sin respuesta);
   - a link to the conversation;
   - the next actions: Agendar, Archivar, Anular, Llamar.
   It is resolved when staff act or the appointment closes.

### 4. Unclear

The scan keeps waiting, as today. After the wait time with only unclear replies, the case goes to staff as "Respuesta poco clara" with the conversation. No status change other than Por reconfirmar.

### 5. Guards

- The agent never cancels, archives, refunds or hands back a session.
- The agent only writes about the appointment that triggered the case, in the chat where the reminder was sent.
- One open case per appointment; a second negation adds to it.
- If the organization has no connected WhatsApp, or reminders are off, nothing in this spec runs. The scheduling settings show why ("Recordatorios apagados" / "WhatsApp desconectado").
- Every agent message and verdict is stored on the case (audit).

### Invariants

- A client reply never closes an appointment by itself; it only moves it within Por hacer.
- Staff are told about every negation.
- Money and sessions move only by staff action.

## DELTA

| Transition | Proof (test to add) |
|---|---|
| Reply "no": `cancelled` + release + session hand-back, silence → Por reconfirmar, nothing released, agent message sent, staff report | reminders service test (mock gateway send + classifier) |
| Classification: one-word YES/NO/UNCLEAR on demand → logged verdict with confidence; low confidence = unclear | classifier unit test; log row test |
| Client answer "otra fecha" + accepts a proposed slot → Confirmada at the new time; without a slot → Desagendada `sin_fecha` | conversation-outcome service test |
| "No continuar" → stays Por reconfirmar, staff report, no close | test |
| No answer by the wait time → staff report "Sin respuesta" | tick test with fake clock |
| Reminders off or WhatsApp disconnected → nothing runs; settings explain why | settings page test |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — The client can't make it (Priority: P1)

A client answers the confirmation with "no voy a poder". The appointment becomes Por reconfirmar. The agent replies, confirming and asking whether she wants another date. She says "el lunes en la tarde"; the agent offers 16:00 and 17:30 with the same specialist, she picks 17:30, and the appointment is Confirmada on Monday 17:30. Reception sees "Reprogramada por el agente" in the inbox.

**Acceptance Scenarios**:

1. **Given** a negation reply, **Then** status Por reconfirmar, no cancel, one agent message in the same chat, one staff report.
2. **Given** the client accepts a proposed slot, **Then** the appointment moves to that time and is Confirmada; the old slot is free.
3. **Given** the client says she no longer wants it, **Then** it stays Por reconfirmar with "No desea continuar", and staff decide.

### User Story 2 — Nobody answers (Priority: P2)

The agent's question goes unanswered for 24 h. Staff get "Sin respuesta" with a "Llamar" action; the appointment stays Por reconfirmar. If its day passes, it becomes Por cerrar (spec 134).

### Edge Cases

- A reply arrives after the appointment time: no agent message; the case goes straight to staff.
- The client writes about something else: the agent answers only about the appointment and reports the rest.
- Grouped visit (several services): one case and one message for the visit.
- Two phones on one client: matched as today, by the phone the reminder used.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Replies after a confirmation MUST be classified as yes, negation or unclear, with the verdict and confidence logged; low confidence MUST count as unclear.
- **FR-002**: A negation MUST move the appointment to Por reconfirmar through spec 134's gate and MUST NOT cancel, release, refund or hand back anything.
- **FR-003**: The agent MUST send one message confirming the understood negation and offering another date or not continuing, in the chat that received the reminder.
- **FR-004**: The agent MAY book a new time only after the client accepts a specific free slot of the same treatment and staff member; otherwise a reschedule wish MUST end as Desagendada `sin_fecha`.
- **FR-005**: Every case MUST produce one staff report with the summary, result, conversation link and next actions, resolved when staff act or the appointment closes.
- **FR-006**: The org MUST be able to set the agent wait time (default 24 h, capped at 2 h before the appointment).
- **FR-007**: With reminders off or WhatsApp disconnected, nothing MUST run, and the scheduling settings MUST say why.

### Key Entities

- **Reconfirmation case**: appointment, opened at, verdict log, agent messages, client answers, result, staff report, closed at.

## Success Criteria *(mandatory)*

- **SC-001**: No appointment is cancelled by a client reply after release.
- **SC-002**: Every negation produces a staff report within one jobs tick.
- **SC-003**: Once FACES enables reminders, at least half of the "otra fecha" cases end Confirmada at a new time without staff typing anything.

## Assumptions

- Prerequisite (owner configuration, not code): FACES enables reminders and reconnects its WhatsApp number(s).
- The agent conversation runs through the existing gateway WhatsApp channel and the hub's assistant tools. The plan decides whether this lives in the hub jobs tick (bounded, templated plus one model call per step) or in the gateway agent with a scoped task. The behaviour above is the same either way.
- "JEV eval" is the owner's name for intent classification. The hub's `inferConfirmationReply` is today's minimal form, and the plan aligns it with the JEV classifier.
- AI is used here only to classify and phrase. Whether this is a premium feature for other orgs is a pricing decision outside this spec.
