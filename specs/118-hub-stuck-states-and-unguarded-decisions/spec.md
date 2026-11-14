# Feature Specification: Stuck sends and unguarded decisions (hub, second tier)

**Feature Branch**: `spec/116-pos-booking-state-hardening` (meta, shared with specs 116, 117, 119); hub slices on their own branches, PR base `master`

**Created**: 2026-11-14

**Status**: Draft

**Input**: Owner, 2026-11-14, on the audit report's row "Reminders and tax emission stuck in progress; join, sales-order and leave requests unguarded": "address these as well". Follows the 2026-11-11 audit and spec 116.

**Repos**: `minion_hub`. **Tags**: `logic`, `test`, and `data` + `migrations` for slice 3 only (owner approves and applies the migration, and merges).

## Why this exists

The audit's second tier is six places where a record can stay "in progress" forever or where a decision is written without checking what was decided a moment earlier. A second read of the code (`egm/evidence.md`, hub `21825676`) confirmed four as described and corrected two:

- **Join requests:** approve is already fully guarded. Only deny is unguarded.
- **Leave requests:** the race is real but nothing is deducted twice; the balance is computed from request rows.

None of these has fired in production (read 2026-11-14): `sched_reminders` and `crm_door_followups` have 0 rows, `pos_emissions` has 104 rows with none stuck in `pending` and no ticket with two live rows, there are 5 join requests and 1 leave request. This is prevention, sized accordingly: three small pull requests.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A decision is made once (Priority: P1)

An admin who denies a join request that was just approved, two managers deciding the same leave request, and an assistant changing a sales order or support ticket status all get the same rules a person gets in the app.

**Why this priority**: these are wrong outcomes that look like success (a denied request whose member is still in the organisation; an "approved" answer for a request stored as rejected; an order jumping from invoiced back to draft).

**Independent Test**: each path refuses when the record is no longer in the state the decision assumed.

**Acceptance Scenarios**:

1. **Given** an approved join request, **When** deny is called, **Then** nothing changes and the request stays approved.
2. **Given** a pending leave request, **When** approve and reject race, **Then** exactly one succeeds and the other is refused with `bad_transition`.
3. **Given** a sales order in `invoiced` and a workflow that does not allow `invoiced → draft`, **When** the assistant's order-status action asks for `draft`, **Then** it is refused with 409, as the app's own route does.
4. **Given** a support ticket and a workflow with a role-gated transition, **When** the assistant's ticket-update action asks for it, **Then** it is refused; open transitions still work.

---

### User Story 2 - A send that died does not stay "sending" forever (Priority: P2)

When the server is redeployed in the middle of sending a reminder, a door follow-up or a tax document, the record ends in a visible failed state instead of staying in progress and hidden from every list and retry.

**Why this priority**: today a stuck row is invisible in the activity counts and blocks any retry; for tax emission it also blocks correcting the ticket.

**Independent Test**: seed a row in progress older than the limit, run the tick or the retry, and find it failed (reminders, follow-ups) or admitted to the retry (emission).

**Acceptance Scenarios**:

1. **Given** a reminder in `sending` for more than 15 minutes, **When** the reminders tick runs for that organisation, **Then** it becomes `failed` with error `stale_claim` and shows in the activity counts.
2. **Given** a door follow-up in `sending` for more than 15 minutes, **When** the jobs tick runs, **Then** it becomes `failed` with error `stale_claim`.
3. **Given** a tax emission in `pending` for more than 15 minutes, **When** staff press "Reintentar" for the shift, **Then** it becomes `error` with description `stale_pending` and the ticket is emitted again.
4. **Given** a row in progress for less than the limit, **When** the tick runs, **Then** it is untouched.

---

### User Story 3 - A ticket has one live tax document (Priority: P3)

Closing a shift and pressing "Reintentar" or "Emitir ahora" at the same moment produces one tax document per ticket.

**Why this priority**: two document numbers for one sale is an accounting defect once emission leaves shadow mode; it needs a database index, so it carries the owner gate.

**Independent Test**: two concurrent emission triggers for one ticket leave one live row and consume one document number.

**Acceptance Scenarios**:

1. **Given** a ticket with no live emission, **When** two triggers run concurrently, **Then** one row is created and the other trigger does nothing and consumes no number.
2. **Given** a ticket whose only emission is `error`, **When** a retry runs, **Then** a new row is created.

### Edge Cases

- A reaped reminder or follow-up is never re-sent. That keeps the existing rule "a failed send is never retried"; the customer may miss one message.
- A reaped tax emission whose provider call had in fact succeeded is emitted a second time with a new number. Emission runs in shadow mode against the provider's beta today, so this costs nothing yet; the owner decides the rule before leaving shadow mode.
- A deny racing an approve waits for the approve's row lock, then matches no row.
- The assistant acts with no role, so role-gated workflow transitions are closed to it and open ones are available.
- An organisation with no workflow defined for sales orders or tickets behaves as today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Denying a join request MUST only apply to a request still `pending`.
- **FR-002**: Deciding a leave request MUST write only if the request still has the status the decision was checked against, and MUST fail with `bad_transition` otherwise.
- **FR-003**: The assistant's order-status and ticket-update actions MUST pass through the same workflow check as the app's routes, with no role.
- **FR-004**: The reminders tick MUST mark reminders `sending` for more than 15 minutes as `failed` with error `stale_claim`, per organisation, before selecting new work.
- **FR-005**: The door follow-up run MUST do the same for follow-ups, and its final status write MUST apply only to a row still `sending`.
- **FR-006**: The shift emission retry MUST mark emissions `pending` for more than 15 minutes as `error` with description `stale_pending` before selecting tickets. The provider-result write MUST apply only to a row still `pending`.
- **FR-007**: The database MUST allow at most one emission per organisation and ticket whose status is not `error`; a second trigger MUST do nothing and MUST NOT consume a document number.

## AS-IS (hub `21825676`, static read; full quotes in `egm/evidence.md`)

| # | Behaviour today | Anchor |
|---|---|---|
| A1 | Deny updates by id and organisation only; approve locks the row and returns unless `pending`, and its side effects are idempotent | `src/server/services/join/requests.service.ts:104-112`; `join/organization-admission.ts:443-481`, `:265-307` |
| A2 | `decideLeaveRequest` reads without a lock, checks `canTransition`, updates by id; balance is computed from request rows, so nothing doubles | `src/server/services/hr.service.ts:693-711`, `:515-558`; `src/server/hr/leave-rules.ts:94-98` |
| A3 | The assistant's order-status action calls `setOrderStatus` without the workflow actor, so `assertStatusChangeInTx` is skipped; the app's route passes it. Same for ticket-update | `src/routes/api/gateway/actions/order-update-status/+server.ts:28-30`; `src/server/services/sales.service.ts:222-223`; `src/server/services/workflow.service.ts:214-253`; `src/routes/api/sales/orders/[id]/+server.ts:24-27`; `src/routes/api/gateway/actions/ticket-update/+server.ts:47-53`; `support.service.ts:252-253` |
| A4 | A reminder is claimed by inserting a `sending` row, sent, then finalised in a second transaction; any existing row counts as handled; no reaper; activity counts omit `sending`. A database trigger allows only `sending → sent/failed/skipped` and freezes `created_at`, which therefore is the claim time | `src/server/services/reminders.service.ts:115-130`, `:166-209`, `:427-434`; `supabase/migrations/20261003140000_notification_legacy_reconciliation.sql:923-972` |
| A5 | Door follow-ups: same shape, no trigger, final write has no status predicate | `src/server/services/doors-followup.service.ts:145-146`, `:160-185`, `:194-203`, `:314`; `supabase/migrations/20261025100000_crm_doors.sql:47-55` |
| A6 | An emission row is inserted `pending` with its document number in one transaction and the provider call is detached; a crash leaves it `pending`; the retry admits only tickets whose rows are all `error`; a `pending` row also counts as emitted for tender correction | `src/server/services/pos-emission.service.ts:174-216`, `:288-316`; `src/server/services/pos.service.ts:438-456`, `:2110-2119` |
| A7 | Both emission callers read then insert in separate transactions; uniqueness exists only per document number | `pos.service.ts:465-523`; `supabase/migrations/20260814040000_pos_shadow_emission.sql:51-55` |
| A8 | Rescheduling moves reminders that have not fired yet (stages are recomputed from the start time each tick). A stage that already fired is not sent again | `src/server/scheduling/reminders.ts:3-8`; `src/server/services/scheduling-bookings.service.ts:1483-1494` |

## TO-BE (invariants)

- I1: a join request that was approved is never stored as denied.
- I2: a leave request's stored status is the one the successful caller was told.
- I3: the assistant cannot make a status jump on an order or ticket that the app refuses.
- I4: no reminder, follow-up or emission stays in progress longer than the limit plus one tick or one retry.
- I5: at most one live emission per ticket.
- Unchanged: "a failed send is never retried"; approve; the app's own routes; emission in shadow mode; reminder timing.

## DELTA

| # | Transition | Slice | Proving test |
|---|---|---|---|
| D1 | Deny adds the `pending` predicate | 1 | `join/requests.service.test.ts`: deny after approve changes nothing |
| D2 | Leave decision compare-and-set | 1 | new `hr.service.leave-decision.test.ts`: stale status → `bad_transition`, no write |
| D3 | Both assistant actions pass `{ ...actor, role: null }` as the workflow actor | 1 | `direct-status-workflow.test.ts` pattern: disallowed jump refused 409; open transition allowed; `actions.server.test.ts` |
| D4 | Reminders reaper | 2 | new `reminders-reaper.test.ts`: stale → failed/`stale_claim`; fresh untouched |
| D5 | Follow-up reaper and guarded final write | 2 | `doors-followup.service.test.ts` |
| D6 | Emission stale-pending sweep in the retry; guarded result write | 2 | `pos.service.emission.test.ts`, `pos-emission.service.test.ts` |
| D7 | Partial unique index + swallowed duplicate | 3 | `pos-emission.service.test.ts`: unique violation → no row, number rolled back; `pg-pos-schema.test.ts` |

## Success Criteria *(mandatory)*

- **SC-001**: Each of the four decision paths refuses a stale decision (tests D1–D3).
- **SC-002**: A row left in progress by a simulated crash is failed or retried within one tick or one retry after the limit (tests D4–D6).
- **SC-003**: Two concurrent emission triggers for one ticket leave one live row (test D7).
- **SC-004**: The production counts that are 0 today (stuck reminders, stuck follow-ups, stuck emissions, tickets with two live emissions) are still 0 thirty days after the last slice ships.

## Assumptions and decisions for the owner

- **Not re-sending a reminder after a reschedule stays as is.** The audit said rescheduling never re-plans reminders; that was wrong for stages that have not fired. Sending a 24-hour reminder a second time after an appointment is moved is a product choice, left out.
- **The assistant gets no role.** Passing no role means it can only take open workflow transitions. Giving it the member's organisation role is a design choice left for later.
- **A reaped emission can be emitted twice** if the provider had accepted it before the crash. Accepted while emission is in shadow mode; must be revisited before live emission.
- Limits are fixed at 15 minutes: longer than any send (the reminder path includes a model call and a channel send) and short enough to show the same day.
- No UI change, no new route, no new string.

## Out of scope

Creating a leave request while another is being created (balance overdraw race), reminder re-send policy, emission in live mode, backups stuck in `running`, the `channels.status = 'pairing'` and dead `voided` literal the audit listed as minor, and everything in specs 116, 117 and 119.
