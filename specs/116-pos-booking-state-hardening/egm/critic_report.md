# Design critique: spec 116 POS and appointments state hardening (Mode: REVIEW)

Reviewed `/home/nikolas/.cache/claude-tmp/meta-113/specs/116-pos-booking-state-hardening/spec.md` and `plan.md` against the standard and the hub source at `/home/nikolas/.cache/claude-tmp/egm-116/hub/` (commit 21825676). This is a static read; nothing was executed. Hub paths below are relative to that root.

**Verdict:** one Blocker (slice 5), eight Major, eight Minor. Slices 1, 2 and 4 are sound in their core mechanism but each has a gap; slice 3's link-clear rule needs a rewrite.

## Blocker

### B1. Slice 5: the replay lookup sits after every preflight that the first commit invalidates
- **Claim** (plan.md:69): "At the start of its transaction, when present: take the advisory lock, look up a ticket by `(org, operationId)`".
- **Evidence:** the money transaction opens at `src/server/services/pos.service.ts:1534`. Before it, `submitTicket` runs checks that a committed first attempt causes to fail:
  - `pos_settings_changed` at `:1465`.
  - `assertPlansUsable` at `:1492`; the first ticket may have settled the plan, giving `plan_settled`.
  - `assertRedemptionsUsable` at `:1493`; the first ticket stamped the session, giving `redemption_already_billed` (`:1289-1290`).
  - The stock shortfall preflight at `:1509-1530`; the first ticket consumed the stock.
- **Effect:** acceptance scenario 6.1 fails for instalment, package-session, low-stock and policy-changed carts. The planned integration test (plan.md:139, a plain cart) would pass and hide it.
- **Change:**
  1. Do the lookup twice: first as the first statement of `submitTicket`, in its own short read before `getPosSettings` validation, returning the stored ticket on a hit.
  2. Repeat it under the advisory lock at the top of the money transaction, to cover a first attempt still in flight.
  3. Add integration cases: replay of a final-instalment ticket, replay of a redemption line, and replay after the policy revision changed.

## Major

### M1. Slice 5: no request hash, and the actor check can compare null to null
- **Claim** (plan.md:69): "if found and `createdBy` equals the actor return it".
- **Evidence:**
  - The plan pattern it cites also stores and compares an intent hash (`src/server/services/pos/plan-operation.ts:130-135`) and requires a UUID actor (`:20-25`).
  - `pos_tickets.created_by` is nullable (`src/server/db/pg-pos-schema.ts:109`), and the route passes `ctx.profileId ?? null` (`src/routes/api/pos/tickets/+server.ts:79-82`).
  - Cart lines are mutated in place (`src/routes/(app)/pos/sell/PageBody.svelte:776`), so an "on edit" rotation hook is easy to miss.
- **Effect:** if the client fails to rotate the id after an edit, the server returns the old ticket as success for a different cart.
- **Change:**
  - Store an `operation_hash` of the normalised lines, payments and client; a mismatch throws `operation_conflict`.
  - Require a non-null profile when `operationId` is present.
  - On the client, derive the id from a memo `{fingerprint: JSON.stringify(request), id}` so rotation follows from the request itself. Exclude `paymentPolicyRevision` from the fingerprint, so a retry after policy review still replays.

### M2. Slice 2: the in-place payment-method correction is not covered by the lock
- **Claim** (plan.md:49): `changePaymentMethod` is covered by `FOR SHARE` at `:2164`.
- **Evidence:** `:2164` is only the closed-shift path. The open-shift path reads the selling shift's status without a lock (`pos.service.ts:2105-2109`) and then rewrites the payment row in place (`:2155-2159`). `paymentsByMethod` sums by `shift_id` and method (`:162-177`).
- **Effect:** a close can commit between that read and the update. The method on a closed shift then changes after `expected` was stored, which breaks FR-006 and the purpose of I3.
- **Change:** add `.for('share')` to the selling-shift read at `:2105`. If it then reads closed, the existing closed path applies. Add a race test for it.

### M3. Slice 1: `settlePlanIfPaid` can re-settle a plan a concurrent void just un-paid
- **Claim** (plan.md:40, I2): locking the plan in the void keeps `settled` true only while lines cover the total.
- **Evidence:** `settlePlanIfPaid` runs after commit in its own transaction (`pos.service.ts:1733-1739`). It reads the plan without a lock, reads lines, then updates `where status='open'` (`src/server/services/pos-accounts.service.ts:408-432`).
- **Interleaving:** settle reads lines (paid); a void of an earlier instalment commits and sees the plan still `open`, so it does not reopen; settle's update then succeeds.
- **Effect:** the plan is `settled` and unpaid, which is the stuck state D2 exists to remove (`plan_settled` at `pos.service.ts:1258`, `pos-accounts.service.ts:387`).
- **Change:** add `.for('update')` to the plan read in `settlePlanIfPaid`, before `paidLinesInTx`. Add this race to slice 1's tests.

### M4. Slice 1: the stock cancel runs outside the ticket lock, so the winner can store a false warning
- **Claim** (spec.md:120): the loser's stock cancel fails, is swallowed, and the loser ends `already_void`.
- **Evidence:** `cancelEntry` runs before the money transaction (`pos.service.ts:1885-1893`). The second caller gets `StockError('not_submitted')` (`src/server/services/stock.service.ts:959-960`) and sets `stockWarning`. Nothing ties the stock loser to the ticket-lock loser.
- **Effect:** when the stock loser wins the ticket lock, it writes `void_stock_failed` (`:2040`) on a ticket whose stock was reversed correctly. Staff may then restock by hand.
- **Change:** on `not_submitted`, re-read the entry; if it is already `cancelled`, treat it as success with no warning. Correct the edge-case text in the spec.

### M5. Slice 3: `booking_id` on a ticket line also means "this line charged the booking"
- **Claim** (plan.md:55, FR-012, risk row at plan.md:89 "existing `unscheduleVisit` behaviour"): clear the link on every releasing status.
- **Evidence:**
  - The drawer's payment facts read by `booking_id` (`src/server/services/scheduling-bookings.service.ts:3392-3395`, `:3624-3650`).
  - A product's `paid` flag reads lines linked to the visit anchor (`:2799-2812`).
  - The tray only lists `kind = 'service'` lines (`src/server/services/pos-accounts.service.ts:477-478`).
  - `unscheduleVisit` is an explicit whole-visit action (`scheduling-bookings.service.ts:1224-1276`); a per-member no-show or cancel is not.
- **Effect:**
  - Product lines on a cancelled anchor lose their link and are not in the tray, so paid money is orphaned and the event's products read unpaid.
  - A cancelled booking's drawer loses its ticket history.
  - A no-show that was charged becomes reschedulable for free on every path, not only the explicit unschedule.
- **Change:**
  - Restrict the clear to `kind = 'service'` lines on non-void tickets.
  - Decide product lines explicitly: re-point them to the next live member, as `ungroupBooking` does for `sched_booking_products` at `:2438-2455`, or leave them.
  - Give the no-show rule its own owner decision, separate from cancelled and rejected.
  - Keep the audit trail, for example by recording the released booking id on the line's metadata or the status-log row.

### M6. Slice 3 breaks completing a visit that contains a no-show member
- **Claim** (plan.md:57-58): the complete routes extend their pre-check to every final status; the group rule is unchanged.
- **Evidence:** the drawer builds the dialog's members by filtering only `cancelled` and `rejected` (`src/lib/components/scheduling/BookingDetailDrawer.svelte:1736-1745`). The dialog posts `/complete` for each member and throws on the first non-OK (`src/lib/components/scheduling/ConsumptionConfirmDialog.svelte:183-189`).
- **Effect:** after slice 3 a no-show member returns 409. The loop stops after earlier members were already completed and realised, and the user sees "409".
- **Change:** filter `no_show` too, and skip `completed` (idempotent but pointless), in the same PR as slice 3. Add this case to the slice 3 or 4 tests.

### M7. User Story 2 promises something the plan does not deliver
- **Claim** (spec.md:41): "the expected totals on screen are the ones the close used".
- **Evidence:** `closeShift` recomputes `expected` server-side (`pos.service.ts:398-403`) and never compares it to the client's view. The client sends `counted` for auto-recorded methods as its own `expected[mth.id]` (`src/lib/components/pos/ShiftBanner.svelte:239-242`).
- **Effect:** a sale landing between dialog load and confirm stores a false difference on card or wallet methods. The lock work makes this more visible, not less.
- **Change:** compute `counted = expected` for non-`takesTendered` methods on the server. Then either drop the sentence from the spec, or send the on-screen `expected` and refuse with 409 `totals_changed` on mismatch.

### M8. Slice 4: FR-008 guards only the footer and charge, not the other writers on stale detail
- **Claim** (FR-008, plan.md:62): footer and charge get `!detailIsCurrent`.
- **Evidence:** the body is hidden only by `loading` (`BookingDetailDrawer.svelte:991-995`). `loading` is set inside an effect (`:307-323`), so there is a window where the prop is B and the body still renders A.
- **Effect:** in that window every `anchorId` writer is live: edit (`:519`), tags (`:361`), the service and product group calls (`:639`, `:741`, `:769`, `:841`, `:858`, `:876`), and notes (`:1547`).
- **Change:** gate rendering once. Change `{:else if !detail}` to treat `!detailIsCurrent` like loading, and have each mutating function early-return on `!detailIsCurrent`. That is less code than per-button flags.

## Minor

- **`cancelBooking` with scope `following` from a final root.** The root goes through `setBookingStatus` first (`scheduling-bookings.service.ts:1175-1184`). After slice 3 a completed or no-show root throws before any later occurrence is cancelled. Skip a final root when the scope is `following`.
- **`patchBooking` return value.** It returns the status update's `.returning()` row (`:3113-3137`), but `setBookingStatusInTx` returns void. The plan must say to re-select the row after delegating. A same-status PATCH will also stop bumping `updatedAt`.
- **Status toast.** `commitStatus` shows a generic toast for any 409 except consumption (`src/lib/components/scheduling/kit/booking-mover.ts:132-142`), and `statusFailureResponse` maps unknown errors to 400 (`src/routes/api/scheduling/bookings/_handlers.ts:417`). The "translated message" needs wiring in both.
- **Reminder job.** On a refusal, skip the counter increment and the CRM activity insert (`src/server/services/reminders.service.ts:385-402`), not only the throw.
- **`ShiftBanner.startClose`.** It never checks `res.ok`, and it treats a failed parse as "shift closed elsewhere" (`ShiftBanner.svelte:207-217`). The plan's error state must separate an HTTP failure from a null shift. It also needs a generation token for close-and-reopen during the fetch.
- **Complete dialog.** A failed read returns the fallback `[]` (`ConsumptionConfirmDialog.svelte:77-84`), which renders as "no defaults" with confirm enabled. `disabled={busy || loading}` does not cover that, so I6 is still violated. Track a load error and disable confirm on it.
- **Calendar.** In `commitConflict` the `finally` must clear `[...ids, ...props.map(recordId)]`, not `ids` (`src/lib/components/scheduling/BookingCalendar.svelte:2608`). Reuse the existing `sched_move_failed` key (`messages/en.json:6219`) instead of adding `cal_move_failed`.
- **Other gaps.**
  - `applyOrgTxScope` sets no `lock_timeout` (`src/server/db/with-org-core.ts:96-103`) and the RLS pool defaults to one connection per isolate (`src/server/db/pg-pool.ts:173-174`). A blocked sale stalls the isolate's other org transactions; add a `SET LOCAL lock_timeout` on the four locking paths.
  - I5 and SC-004 have no backfill for lines already linked to dead bookings; those still hit `line_already_scheduled` (`scheduling-bookings.service.ts:791-795`).
  - A replay of a since-voided ticket returns success.
  - The spec says `assertPlansPayable`; the function is `assertPlansUsableInTx`.
  - The gateway `pos-sale` action calls `submitTicket` without an operation id.

## Verified and found sound

- **Anchors.** Every AS-IS anchor in spec.md A1–A12 matches the source at the cited lines.
- **Slice 1 lock.** Ticket `FOR UPDATE` first, an in-transaction payment re-read and a conditional update stop the double refund, double ledger adjustment, double redemption reversal and double grant cancel. The loser throws before any write.
- **Slice 1 deadlocks.** None found.
  - `changePaymentMethod` goes ticket → payment → shift (`pos.service.ts:2084-2109`).
  - `bookAndLinkTicketLine` goes ticket update → wallet (`scheduling-bookings.service.ts:816-830`), the same order as the new void. Today's void (wallet → ticket) is the inverted one, so the change removes a cycle.
  - `submitTicket` locks no existing ticket row.
  - The ticket trigger no-ops on a status-only update (`supabase/migrations/20261003130000_pos_wallet_currency.sql:337-349`).
- **Plan reopen.** `paidLinesInTx` excludes void tickets (`pos-accounts.service.ts:356`) and sees the void inside the same transaction, so the reopen logic is correct apart from M3.
- **Slice 2 locks.** `FOR SHARE` against `FOR UPDATE` closes the window wherever the read sits in the transaction, because the lock is held to commit and the close recomputes after acquiring it. No writer updates `pos_shifts` after a share lock, so there is no upgrade deadlock. One open shift per user is enforced by an index (`src/server/db/pg-pos-schema.ts:79-81`).
- **Row locks and the pooler.** Writes own a private transaction; the shared request transaction is GET-only (`src/hooks.server.ts:839`). `FOR UPDATE` under `withOrgCore` is already in production use.
- **Slice 3 writers.** Only two statements write booking status: `scheduling-bookings.service.ts:1085` and `:3114`. All callers are in the plan. No automation, import, series, reschedule or raw-SQL path writes it, so the "saved automation" unknown in the spec can be closed.
- **Live transitions.** Delegating `patchBooking` does not change behaviour for live transitions.
- **Calendar.** `moveBooking` does reject on a network failure (`booking-mover.ts:97`, no try/catch), so the `finally` fix is needed and works.
- **Standard.** Problem, goals and non-goals, architecture, alternatives and risks are all present. Missing from Risks: the residual duplicate when the cashier edits the cart after a lost reply, and M5.

Not checked: nothing was run; the share-lock queueing argument is from Postgres semantics, not a test. `BookingsView.svelte`, the status board and the gateway `pos-sale` route were not read. Anchors were verified at 21825676, not `bb3b78f8`.