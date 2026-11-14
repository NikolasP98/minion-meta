# Feature Specification: POS and appointments state hardening

**Feature Branch**: `spec/116-pos-booking-state-hardening` (meta); hub slices use their own branches, PR base `master`

**Created**: 2026-11-12

**Status**: Draft, pass 2 (revised after the EGM review of 2026-11-14; reports in `egm/`)

**Input**: Owner request 2026-11-11: "I need you to check the codebase (hub and gw) for all implicit state machines. Find ways they can ruin a workflow, and figure out the best approach to fix them." Then 2026-11-12: "to better prioritize, cross check with current prd site usage by users via posthog" and "Proceed with spec-kit and egm for the high priority items."

**Repos**: `minion_hub` only. The gateway privacy item from the same audit is spec 117.

**Tags**: `logic`, `ux`, `test`. Pass 2 removed the schema change, so no slice carries the `data` gate.

**Words used here**: *the status owner* is the function `setBookingStatusInTx`; *the owner* alone always means the person who approves and merges. *Client ledger* is the customer's stored credit (`pos_client_ledger`); *open-items ledger* is the `TODO(handoff)` plus `proposals/` record. *Releasing status* is `cancelled` or `rejected` (and `no_show` only where stated). *Live* statuses are `pending` and `accepted`; *final* ones are `cancelled`, `rejected`, `no_show`, `completed`. *Tray* is the list of paid services waiting to be scheduled (`listPendingSchedulingLines`). *Visit* is a group of bookings for one customer on one resource.

## Why this exists

The audit found places where a ticket, shift, booking or payment plan changes status without the code checking what the status was a moment earlier. Each one can be triggered by a double click, a slow network, or two people working at once. PostHog (project 129899, last 30 days, read 2026-11-12) shows these are the screens staff live in: `pos/sell` 798 views by 5 people on 29 days, `pos/appointments` 767 views by 6 people on 27 days. `pos/appointments` also carries 87 of 160 rage clicks and 79 of 375 exceptions.

Evidence is static code reading of hub `origin/master` at `bb3b78f8`. Nothing was reproduced against a running system; each slice's first task is a failing test that reproduces the defect.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A void refunds once (Priority: P1)

A cashier voids a ticket. Whether they double-click, retry after a timeout, or a colleague voids the same ticket at the same moment, the customer is refunded exactly once and the second attempt is told the ticket is already void.

**Why this priority**: it is the only finding that pays money out twice.

**Independent Test**: two concurrent void calls on one cash ticket leave exactly one set of refund rows and one request answered `already_void`.

**Acceptance Scenarios**:

1. **Given** a submitted cash ticket and an open shift, **When** two void requests run concurrently, **Then** the till shows one refund per original payment method and the second request fails with `already_void`.
2. **Given** a submitted ticket paid from client credit, **When** two credit-refund voids run concurrently, **Then** the client's balance moves once.
3. **Given** a ticket that paid the last instalment of a settled plan, **When** the ticket is voided, **Then** the plan is open again and can take a payment or be cancelled.

---

### User Story 2 - A shift closes once, with the right numbers (Priority: P1)

A cashier closes their shift. The count they typed is the count stored, methods the till does not count are recorded at the server's own total, and no sale lands on a shift after it closed.

**Why this priority**: the close is the daily cash reconciliation and the trigger for tax emission; a wrong or overwritten count is silent.

**Independent Test**: two concurrent close calls store the first count and refuse the second; a sale racing a close either belongs to the shift before it closes or is refused.

**Acceptance Scenarios**:

1. **Given** an open shift, **When** two close requests with different counts run concurrently, **Then** the first count is stored and the second fails with `no_open_shift`.
2. **Given** a close in progress, **When** a sale is submitted on the same shift, **Then** the sale is either included in the close's expected totals or refused with `no_open_shift`.
3. **Given** a card or wallet sale lands after the dialog loaded, **When** the cashier confirms, **Then** the stored count for methods the till does not physically count equals the server's expected total, so no false difference is recorded.
4. **Given** the close dialog just opened, **When** the expected totals have not loaded yet or failed to load, **Then** the confirm button is disabled and no stale totals from a previous open are shown.
5. **Given** the close request is in flight, **When** the cashier presses confirm again, **Then** nothing is sent.

---

### User Story 3 - The drawer acts on the booking it shows (Priority: P1)

A receptionist clicks from one appointment to another. Until the second appointment's details are on screen, the drawer shows its loading state and nothing in it can write: not the footer buttons, the edit form, tags, notes, or the service and product rows.

**Why this priority**: today a fast click cancels or completes the previous customer's appointment.

**Independent Test**: with booking A loaded, switch to B while B's load is held; every footer action is disabled, and a late reload of A never replaces B's details.

**Acceptance Scenarios**:

1. **Given** the drawer shows A, **When** the selection changes to B and B is still loading, **Then** footer actions are disabled.
2. **Given** a mutation on A is finishing its reload, **When** the selection changed to B meanwhile, **Then** the reload result is discarded.

---

### User Story 4 - A closed appointment stays closed, and its paid service comes back (Priority: P2)

An appointment that was cancelled, rejected, marked no-show or completed cannot be moved to another status. When a paid service's appointment is cancelled or rejected, the paid service returns to the "to schedule" tray so it can be booked again.

**Why this priority**: reviving a closed appointment today silently skips the package session and the stock reservation; cancelling a paid one strands the customer's money on a line nobody can schedule.

**Independent Test**: every write path refuses a transition out of a closed status with one error; cancelling a booking linked to a paid ticket line clears the link.

**Acceptance Scenarios**:

1. **Given** a cancelled booking, **When** any path (drawer, API, reminder reply, gateway action, complete endpoint) asks for another status, **Then** the request is refused with `invalid_transition` and nothing is written.
2. **Given** a booking linked to a paid service line on a non-void ticket, **When** it becomes cancelled or rejected by any path, **Then** the line's link is cleared in the same transaction and the service appears in the tray. Product lines and no-show bookings keep their link.
4. **Given** a cancelled card on the status board, **When** staff drag it to a live column, **Then** it does not move and a message says a closed appointment cannot be reopened.
5. **Given** a visit with one no-show member, **When** staff complete the visit, **Then** the other members complete and the no-show member is left alone.
3. **Given** a pending or accepted booking, **When** it moves to any other status, **Then** it behaves exactly as today.

---

### User Story 5 - Completing and dragging give honest feedback (Priority: P2)

The complete-appointment dialog cannot be confirmed before its consumption rows are loaded. A drag on the calendar that fails because the network dropped snaps back and says so.

**Why this priority**: both are trust problems on the most-used screen, cheap to fix.

**Independent Test**: confirm is disabled while rows load; a rejected move promise leaves no optimistic block on screen.

**Acceptance Scenarios**:

1. **Given** the complete dialog is loading its rows, **When** the user presses confirm, **Then** nothing is sent.
2. **Given** a drag whose request throws, **When** the promise rejects, **Then** the block returns to its original slot and an error is shown.

---

### User Story 6 - A charge that lost its reply is not charged twice (Priority: P2)

A cashier presses Charge, the sale is stored, and the reply is lost. Pressing Charge again on the unchanged cart returns the stored ticket.

**Why this priority**: duplicate tickets mean a customer charged twice in the books; it touches the charge path, so it ships last.

**Independent Test**: two submits carrying the same client ticket id produce one ticket and both return it, including when the first one settled a plan or used a package session.

**Acceptance Scenarios**:

1. **Given** a submit with ticket id X committed, **When** the same cart is submitted again with X, **Then** the existing ticket is returned and no second ticket, payment or stock movement exists.
2. **Given** ticket id X committed by one user, **When** a different user submits X, **Then** the request is refused.
3. **Given** the cart is edited after a failed attempt, **When** the user charges again, **Then** a new ticket id is used.

---

### Edge Cases

- Two voids race and the one whose stock cancel lost wins the ticket lock: it must not store a `void_stock_failed` warning when the stock entry is in fact cancelled.
- A void of an instalment ticket whose plan was cancelled: the plan stays cancelled.
- A void racing the post-sale settle of the same plan: the plan never ends `settled` while unpaid.
- Closing someone else's shift (`pos: manage`) follows the same lock.
- A payment-method correction racing a close: the method on a closed shift never changes after its expected totals were stored.
- A reminder reply "yes" for an appointment that was cancelled meanwhile: refused; written to the application log only; no reminder counter or CRM activity is recorded; the batch continues.
- Cancelling "this and following" from a root that is already final: the root is skipped and the later occurrences are still cancelled.
- The complete endpoint called twice for a completed booking stays idempotent.
- A status change sent together with other fields on a final booking: the whole edit is refused.
- A mistaken cancel or no-show is corrected by creating a new booking. This is new: today the board can drag it back.
- Paid services stranded before this ships stay stranded until a one-off repair (out of scope, recorded in the open-items ledger).
- Old clients that send no ticket id keep working exactly as today.
- The id lives in the page's memory. A page reload after a lost reply loses it, so that case can still duplicate; the `TODO(handoff): HS-011` stays, narrowed to "durable draft across reload".
- An ungrouped booking sent to the group status endpoint is not pre-filtered; from a final status it now answers 409 like every other path.
- A replay of a ticket that was voided meanwhile returns that ticket, showing it void.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Voiding MUST decide "already void" on a ticket row it holds locked inside the money transaction, and MUST read the payments it refunds inside that same transaction. The pre-transaction check stays as a cheap early refusal.
- **FR-002**: The status write of a void MUST apply only to a ticket still `submitted` and MUST fail if it changed nothing.
- **FR-002a**: A void MUST NOT store a stock warning when the linked stock entry is already cancelled.
- **FR-003**: Voiding a ticket that carries plan instalment lines MUST reopen a `settled` plan that is no longer fully paid, in the same transaction.
- **FR-004**: Cancelling a plan and settling a plan MUST each lock the plan row before reading its lines; cancel MUST write only if the plan is still `open`.
- **FR-005**: Closing a shift MUST lock the shift row, MUST compute expected totals after taking the lock, and its status write MUST apply only to a shift still `open`.
- **FR-006**: Every path that attaches a row to a shift or rewrites one on it (sale submit, void refund, both branches of the payment-method correction) MUST read that shift under a lock that conflicts with the close.
- **FR-006a**: On close, the server MUST set the counted amount of every method the till does not physically count to its own expected total, ignoring any client value for those methods.
- **FR-007**: The close dialog MUST clear the previous expected totals on open, MUST keep confirm disabled until fresh totals arrive, MUST tell a failed load apart from "shift already closed" and offer a retry, MUST ignore an answer that belongs to an earlier opening, and MUST ignore a second confirm while one is in flight.
- **FR-008**: While the loaded detail does not belong to the selected booking, the booking drawer MUST render its loading state and every function in it that writes MUST do nothing. A reload that resolves after the selection changed MUST be discarded. Two members of one visit share one detail, so switching between them is "current".
- **FR-009**: `setBookingStatusInTx` MUST refuse any change out of a final status. From a live status every status in today's accepted set (`accepted`, `pending`, `cancelled`, `rejected`, `completed`, `no_show`) stays allowed. Same-status writes stay a no-op.
- **FR-010**: Every path that writes booking status, including the general booking edit, MUST go through `setBookingStatusInTx`.
- **FR-011**: A refused change MUST surface as `invalid_transition` (HTTP 409 on API routes, with a translated message the board, grid and drawer show) and MUST NOT write a status-log row.
- **FR-012**: When a booking becomes `cancelled` or `rejected`, `setBookingStatusInTx` MUST clear the booking link on its service lines of non-void tickets in the same transaction. Product lines and `no_show` bookings keep their link. After the release the cancelled booking no longer lists that ticket and loses its "referenced by a ticket" delete guard, exactly as the existing unschedule action already behaves; the payment stays traceable on the ticket.
- **FR-012a**: Cards and cells of a booking in a final status MUST NOT be draggable to another status.
- **FR-012b**: Completing a visit MUST leave `no_show` and already-completed members alone.
- **FR-013**: The complete dialog MUST keep confirm disabled until its rows are loaded, and MUST keep it disabled with an error when the load failed.
- **FR-014**: The calendar MUST retire its optimistic drop state, for every id it painted, when the move request throws, on both the drop and the "move anyway" path, and MUST show the existing "move failed" message.
- **FR-015**: A sale submit MAY carry a client-chosen ticket id. When present the system MUST require a signed-in profile, MUST return the existing ticket when that id already exists in the organisation and was created by the same profile, and MUST refuse with `operation_conflict` (HTTP 409) otherwise. A replay re-runs the two idempotent post-commit steps (stock issue, plan settle) and answers 200 with the stored ticket. The gateway sale action sends no id and is unchanged. The lookup MUST run before any check the first commit could have invalidated, and again inside the transaction.
- **FR-016**: The sell screen MUST derive the ticket id from the request it is about to send: the same request reuses the id, any difference in lines, payments or customer mints a new one, and a success clears it.
- **FR-017**: Every user-facing string added MUST go through Paraglide in `en` and `es`.

### Key Entities

- **Ticket**: `submitted` or `void`. Its id may now be chosen by the client.
- **Shift**: `open` or `closed`; one open shift per user.
- **Booking**: `pending`, `accepted` (live); `cancelled`, `rejected`, `no_show`, `completed` (final).
- **Ticket line**: may link to the booking that schedules a paid service.
- **Payment plan**: `open`, `settled`, `cancelled`; `settled` returns to `open` only through a void.

## AS-IS (hub `origin/master` `bb3b78f8`, static read)

| # | Behaviour today | Anchor |
|---|---|---|
| A1 | `voidTicket` checks `already_void` on a read made before any transaction; the payments to refund are read in an earlier, separate transaction; the final `UPDATE` matches on id and org only. The in-transaction `voidOf` guard therefore sees no refund rows for two concurrent calls. | `src/server/services/pos.service.ts:1827-1836`, `:1857-1883`, `:1990-2040` |
| A2 | A void leaves a `settled` plan settled; `assertPlansUsableInTx` then refuses payment (`plan_settled`) and `cancelPlan` refuses cancel. The code records this as a `TODO(handoff)`. | `pos.service.ts:2045-2050`, `:1258`; `pos-accounts.service.ts:387` |
| A3 | `cancelPlan` reads without a lock and updates by id. | `src/server/services/pos-accounts.service.ts:378-401` |
| A4 | `closeShift` selects the open shift without a lock and updates by id and org. | `pos.service.ts:366-417` |
| A5 | `submitTicket` reads the open shift without a lock before inserting the ticket. Same for the void refund shift and the payment-method correction. | `pos.service.ts:1581-1586`, `:1846-1851`, `:2164` |
| A6 | `ShiftBanner.startClose` opens the dialog before the fetch, never resets `expected`, has no error path; `submitClose` has no in-flight guard. | `src/lib/components/pos/ShiftBanner.svelte:201-226`, `:232-262` |
| A7 | The drawer keeps booking A in `detail` while B loads (it clears `detail` only on a scope change); `anchorId` derives from `detail`; footer buttons are disabled only by `busy`. `reloadDetail` has no generation check. | `src/lib/components/scheduling/BookingDetailDrawer.svelte:306-335`, `:433`, `:453-459`, `:1614-1712` |
| A8 | `SETTABLE` allows any status from any status. `setBookingStatusInTx` locks the row but checks only "same status". `patchBooking` writes status inline with its own copy of the log and reversal. The complete route refuses only `cancelled`/`rejected`, so `no_show → completed` passes. The reminder job selects `pending` bookings, then waits on an inference call before writing, so a booking cancelled in that window is set back to `accepted` (`reminders.service.ts:340`, `:369`, `:384`). | `src/server/services/scheduling-bookings.service.ts:1024`, `:1067-1096`, `:3086-3142`; `src/routes/api/scheduling/bookings/[id]/complete/+server.ts:41-43`; `src/server/services/reminders.service.ts:384` |
| A9 | Only `unscheduleVisit` clears `pos_ticket_lines.booking_id`. | `scheduling-bookings.service.ts:1224-1284` |
| A10 | The complete dialog's confirm is disabled only by `busy`, not `loading`. The complete endpoint is idempotent per booking, so a retry after a partial failure is safe. | `src/lib/components/scheduling/ConsumptionConfirmDialog.svelte:147-161`, `:174-203`, `:269` |
| A11 | Both calendar drop paths set `optimistic` and call `await onmove(...)` with no `try/finally`. | `src/lib/components/scheduling/BookingCalendar.svelte:2391-2404`, `:2594-2609` |
| A12 | The sell screen cannot tell a lost reply from a refusal; the code records it as `TODO(handoff): HS-011`. Tickets have no operation id. Plans already have one. | `src/routes/(app)/pos/sell/PageBody.svelte:830-834`; `src/server/services/pos/plan-operation.ts` |

Known unknowns: how often these fire in production (no PostHog event for voids or closes). Closed in review: only two statements write booking status (`scheduling-bookings.service.ts:1085`, `:3114`), so no automation, import or series path writes it behind the status owner's back.

## TO-BE (invariants)

- I1: for one ticket, at most one void commits; refund rows exist at most once.
- I2: a plan is `settled` only while its non-void lines cover its total.
- I3: a shift is closed at most once; no ticket or payment row is created on, or re-attributed within, a shift after its close committed.
- I4: a booking in a final status never changes status; every status change has exactly one log row.
- I5: after this ships, a service line on a non-void ticket never stays linked to a booking that became cancelled or rejected (lines stranded earlier are out of scope).
- I6: the drawer, the close dialog and the complete dialog never send a write computed from data that is not on screen.
- I7: one client ticket id yields one ticket.
- Unchanged: guard order of a void, refund forms, emission on close, the group endpoint's skip rule, package and stock reversal rules, all permissions.

## DELTA

Slices are numbered in shipping order.

| # | Transition | Slice | Proving test |
|---|---|---|---|
| D1 | Drawer renders loading and blocks every writer while the detail is not current; stale reload dropped | 1 | component test with a held fetch |
| D2 | Complete dialog confirm waits for rows and stays off on a load error | 1 | component test |
| D3 | Calendar drop paths clear in `finally` and show the move-failed message | 1 | test with a rejecting `onmove` |
| D4 | Void locks the ticket row, re-checks status, re-reads payments in the money transaction; status write is conditional | 2 | SQL integration: two concurrent voids, cash and credit refund → one refund set, one `already_void` |
| D5 | Void stores no stock warning when the entry is already cancelled | 2 | unit/integration on the stock-cancel branch |
| D6 | Void reopens a no-longer-paid settled plan | 3 | integration: settle by instalment, void it, plan is `open`, next instalment accepted |
| D7 | `cancelPlan` and `settlePlanIfPaid` lock the plan row; cancel writes conditionally | 3 | integration: void racing settle never leaves settled-and-unpaid; cancel racing settle is consistent |
| D8 | `closeShift` locks, computes after the lock, writes conditionally | 4 | integration: two concurrent closes → exactly one succeeds and the stored count is that call's |
| D9 | Shift readers that then write take a conflicting lock (sale, void refund, both correction branches) | 4 | integration: sale racing a close; correction racing a close |
| D10 | Server fills counted for non-counted methods | 4 | integration: client value ignored |
| D11 | Close dialog load, error, generation and submit guards | 4 | component test |
| D12 | Final-status guard in `setBookingStatusInTx`; `patchBooking` delegates | 5 | integration: refused from each final status, no log row; live moves unchanged |
| D13 | Link clear for cancelled/rejected, service lines, non-void tickets | 5 | integration: line returns in the tray query; product line and no-show keep the link |
| D14 | Callers map `invalid_transition` (409 + message; reminder job skips counters; series cancel skips a final root) | 5 | route tests; reminders test; series test |
| D15 | Board and grid: final cards not draggable; refusal message shown; visit completion skips no-show members | 5 | component tests |
| D16 | Client ticket id: early and in-transaction replay lookup | 6 | integration: plain cart, final instalment, package session, changed policy revision; other profile refused |
| D17 | Sell screen derives and rotates the id from the request | 6 | unit test on the attempt runner |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a test that fires two voids at the same ticket 50 times, refund rows are never duplicated.
- **SC-002**: In a test that fires two closes at one shift, exactly one succeeds and the stored count is that call's.
- **SC-003**: No write path can move a booking out of a final status (every path covered by a test).
- **SC-004**: After a paid appointment is cancelled, its service is back in the to-schedule tray.
- **SC-005**: Staff cannot trigger a footer action, a shift close or a completion while the data behind it is still loading.
- **SC-006**: A repeated charge of the unchanged cart creates one ticket, including carts that settle a plan or use a package session.
- **SC-007**: Thirty days after the last slice ships, `$rageclick` and `$exception` counts on `pos/appointments` are lower than the 87 and 79 measured on 2026-11-12 (same PostHog query; a direction check, not a pass/fail gate).

## Assumptions and decisions for the owner

- **Closed bookings are final.** Production agrees with the rule: the status log (`sched_booking_status_log`, read 2026-11-14) has 1,043 rows since 2026-09-30, of which 595 record a booking's creation and 448 a status change; all 448 start from `pending` or `accepted`. Pass 1 said the UI never offers revival. That was wrong: the status board and the grid's status sub-columns let staff drag a closed booking to a live status (`BookingBoard.svelte:100-128`, `kit/booking-mover.ts:146-160`), and the table has one-click Cancel and No-show. After this ships a mistaken cancel or no-show can no longer be dragged back; staff create a new booking. The owner approves this knowingly, or asks for revival (which must then re-take the session and stock, out of scope here).
- **A no-show keeps its paid line.** Cancelled and rejected bookings free their paid service; a no-show does not, on any path except the existing explicit "unschedule" action. Whether a no-show customer may rebook for free is a clinic policy the owner sets later.
- **Automated cancels free the paid service too.** A customer's "no" to a reminder and the gateway's cancel action go through the same status owner, so they return the paid service to the tray like a staff cancel does.
- **No schema change.** Pass 1 added a column to tickets. Pass 2 lets the client choose the ticket's own id, which the server already generates as a random UUID, so the primary key is the uniqueness guarantee. The price: the server does not compare the repeated request with the stored ticket; the sell screen derives the id from the request so the two cannot drift.
- Behavioural UI changes only (disabled states, a loading state shown slightly longer, snap-back, one new refusal message, closed cards not draggable). No layout, colour or component change, so no FigCraft proposal is produced; `lint:design` and `lint:tokens` still run.
- No new page, route, API endpoint or nav link, so no RBAC or route-contract change.
- The stock/void ordering race recorded as HS-021 stays as is.

## Out of scope

Repairing paid lines stranded before this ships, backups, the flow editor, the config editor, chat thread mix-ups, the WhatsApp QR card, voice, cancelled-plan refund policy, reminders, tax emission, join, sales-order and leave requests (a separate spec), and every gateway finding.

## Additional AS-IS rows found in review

| # | Behaviour today | Anchor |
|---|---|---|
| A13 | The status board and grid sub-columns write any status from any status, optimistic, with a generic failure toast | `src/lib/components/scheduling/BookingBoard.svelte:100-128`; `kit/booking-mover.ts:132-160`; `src/routes/(app)/pos/appointments/PageBody.svelte:1132-1154`, `:1285`, `:1300` |
| A14 | The open-shift branch of the payment-method correction reads the selling shift without a lock, then rewrites the payment in place | `pos.service.ts:2105-2109`, `:2155-2159` |
| A15 | `settlePlanIfPaid` runs after commit, reads plan and lines without a lock | `pos-accounts.service.ts:408-432`; `pos.service.ts:1733-1739` |
| A16 | The stock cancel of a void runs before the money transaction; the losing caller records `void_stock_failed` | `pos.service.ts:1885-1893`, `:2040`; `stock.service.ts:959-960` |
| A17 | The close dialog sends its own on-screen expected total as the counted amount for methods the till does not count | `ShiftBanner.svelte:239-242` |
| A18 | `submitTicket` runs settings, plan, redemption and stock preflights before its money transaction; the ticket id is minted server-side | `pos.service.ts:1465`, `:1492-1493`, `:1509-1534`, `:1579` |
| A19 | The drawer body is hidden only by `loading`, which is set inside an effect; every writer uses `anchorId` | `BookingDetailDrawer.svelte:307-323`, `:991-995`, `:361`, `:519`, `:639-876`, `:1547` |
| A20 | The complete dialog treats a failed load as an empty list; the drawer passes no-show members to it | `ConsumptionConfirmDialog.svelte:77-84`; `BookingDetailDrawer.svelte:1736-1745` |
| A21 | Ticket lines linked to a booking also feed the drawer's payment facts and a product's paid flag; the tray lists service lines only | `scheduling-bookings.service.ts:3392-3395`, `:3624-3650`, `:2799-2812`; `pos-accounts.service.ts:477-478` |
