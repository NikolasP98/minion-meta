# Zoom-out review: spec 116, POS and appointments state hardening

**Mode:** REVIEW. Target, persona and standard were all read. The spec's anchors match the supplied source: every AS-IS row I spot-checked (A1, A3, A4, A5, A8, A9, A12) is accurate. Context is sufficient and the design fixes root causes with existing repo patterns, but it is not ready to approve as written: one blocker and six majors.

## Blocker

### B1. The premise behind "closed appointments are final" is false for the board view
**Scope:** spec Assumptions ("staff never revive one through the UI today"; "Behavioural UI changes only"), FR-009/FR-011, plan Slice 3.

- **The claim holds only for the drawer.** Its footer is gated on `isLive` (`BookingDetailDrawer.svelte:1615`).
- **The board offers revival.** Dragging a card to another status column writes that status with no check on the source (`BookingBoard.svelte:100-128`). It goes through `mover.setStatus` / `setVisitStatus` in `kit/booking-mover.ts:146-160`, wired on `pos/appointments/PageBody.svelte:1132-1154`. The board header comment says the grid's subcolumns use the same path.
- **After slice 3, a single-service drag fails vaguely.** The card paints optimistically, gets a 409, and shows the generic `sched_status_failed` toast; `commitStatus` only special-cases `consumption_confirmation_required`.
- **A visit card may fail silently.** The group endpoint skips closed members and may answer OK, so the card would snap back with no message. I did not read the group handler to confirm.
- **Misclicks become permanent.** The table's No-show and Cancel buttons are one click with no confirm (`pos/appointments/PageBody.svelte:1285`, `:1300`). Today the board can undo them; after slice 3 nothing can, and D9 has already released the paid line.

The production log (448 changes, none out of a final status) still supports the rule. The issue is that the owner is asked to approve it on a wrong description of the UI.

**Change:**
1. Correct the assumption to name the board and grid subcolumns.
2. Add to slice 3 the smallest UI consequence: cards whose status is final are not draggable on the status axis, or `commitStatus` shows the `invalid_transition` message.
3. State in the spec that a mistaken no-show or cancel is corrected by creating a new booking, so the owner approves that knowingly.

## Major

### M1. Ordering: the drawer guard ships fourth but is P1, and slice 3 raises the cost of the bug it fixes
**Scope:** plan slice numbering; spec US3 (P1) versus US4 (P2).

The plan ships the wrong-booking fix (US3/D7) after the finality rule (US4). In between, a fast click that cancels the previous customer's booking is irreversible and releases their paid line. The drawer fix is client-only, about ten lines, and needs no owner gate.

**Change:** ship the client guards first, or at least before transitions. Suggested order: client guards, void, shift, transitions, operation id. State the order in the plan; today only "slice 5 after 1 and 2" is stated.

### M2. US2 promises something the design does not deliver
**Scope:** spec US2 ("the expected totals on screen are the ones the close used"), FR-007, plan Slice 2.

- **The lock does not cover the dialog.** A sale from another tab between dialog load and confirm changes the server's `expected`; the lock only spans the close transaction.
- **The client's stale figure is stored.** `submitClose` writes its own `expected` into `counted` for recorded methods (`ShiftBanner.svelte:239-242`), producing a false discrepancy.

**Change:** pick one of these.
- Delete that sentence from US2 and keep the narrower FR-007.
- Have the server fill `counted` for non-tendered methods from the `expected` it computes in `closeShift`, and stop sending them from the client. This is the root fix and removes client code.

### M3. Slice 2 misses the one shift read that mutates a closed shift's totals
**Scope:** FR-006, plan Slice 2 bullet 2, invariant I3.

`changePaymentMethod` decides between rewriting in place and writing a correction pair from an unlocked read of the selling shift's status (`pos.service.ts:2105-2109`). A close racing that read lets the in-place rewrite change a payment's method after the close computed `expected`. The plan locks only the `:2164` read. I3 is worded as "no row is created", so it passes while the snapshot is wrong.

**Change:** add `.for('share')` to the `:2105` read and reword I3 to "created or re-attributed".

### M4. Slice 1 bundles three defects; only one is "a void refunds once"
**Scope:** FR-003, FR-004, D2, D3, plan Slice 1 step 4.

- **Plan reopen (D2) is a different kind of fix.** It is a state repair, not a race, and the code's own TODO calls it harmless today. It also adds a plan-row lock to the void's lock order.
- **The lock order is safe, but the plan does not say so.** `submitTicket` takes wallet then plan (`:1553-1554`); the void would take ticket, wallet, then plan. The risk table only discusses the ticket lock.
- **`cancelPlan` (D3) is independent of voids.**

**Change:** make slice 1 D1 only, so the money-path change is reviewed alone. Move D2 and D3 to their own small PR and add the plan-lock order to the risk table. If they stay bundled, say why they cannot ship separately.

### M5. D9's blast radius is listed as one risk row; it is wider
**Scope:** FR-012, plan Slice 3 bullet 2, Risks row 4.

Moving the link clear into the owner makes every releasing path return paid services to the tray, not just the explicit unschedule action. The plan does not name these:
- **Reminder "no" replies**, including LLM-inferred ones (`reminders.service.ts:369-384`).
- **Gateway `booking-cancel`.**
- **Series cancel with `following`**, which releases every later occurrence's paid line (`cancelBooking`, `:1184`).
- **The one-click table buttons and board drags** from B1.

Not assessed either: after the clear, a cancelled booking no longer carries its ticket link. That link appears to feed the drawer's ticket list and the delete guard (`BookingReferencedError` `'ticket'`), so a cancelled paid booking may become hard-deletable with no trace of the payment. I did not trace this fully.

**Change:** list the releasing paths in the spec. Decide whether automated paths (reminder, gateway) should release or only cancel. Confirm what the delete guard and drawer show after the clear, and add one acceptance scenario for it.

### M6. Slice 5 did not consider the option that needs no schema change
**Scope:** plan Slice 5, Alternatives considered.

- **The ticket id could be the idempotency key.** `submitTicket` mints it itself (`pos.service.ts:1579`). The client could send it instead, validated as a UUID, and a repeat is found by `(id, org)` with the same actor check. That removes the column, the index, the migration and the owner gate. The plan should adopt it or record why a separate column is preferred, such as consistency with plans or avoiding client-chosen keys.
- **Rotation is under-specified.** "Dropped on any cart/payment edit" means hooking every mutation in a large component. Keep the last serialized request with its id and reuse the id only when the next serialized request is identical.
- **There is no server check that a repeat matches.** Plans compare a request hash; here a client rotation bug would return an old ticket for a new cart. With serialized-compare rotation this is an acceptable shortcut, but say so.
- **The replay response is undefined.** The first response carries `stockWarning`. The plan does not say what a replay returns or whether post-commit steps (stock issue, plan settle) are re-attempted.

## Nit

- **N1. `BOOKING_TRANSITIONS`, `canTransitionBooking` and the 6×6 test are a table with two kinds of row.** The rule is `ACTIVE_STATUSES.includes(current.status)`, and that constant already exists (`scheduling-bookings.service.ts:105`). One guard line and a four-case test suffice.
- **N2. Complete routes: delete the pre-check instead of extending it.** Once the owner throws, the route check at `[id]/complete/+server.ts:41` is a second mechanism with a different status code (400 versus 409).
- **N3. The slice 3 test matrix is oversized.** There are only two physical status writes (`:1086`, `:3115`). Test the owner per final status, add one test that `patchBooking` delegates, and one error-mapping test per caller.
- **N4. Void can claim first.** Run the conditional update to `void` as the first statement of the money transaction. It locks, rechecks and writes in one statement, replacing plan steps 1 and 3. Under step 1's lock, step 3's zero-row branch is unreachable and untestable.
- **N5. `patchBooking` delegation detail.** It returns the updated row, while `setBookingStatusInTx` returns nothing. Note the re-read or leave it to the implementer.
- **N6. Plan altitude.** The Slice 4 text contains literal `try/catch/finally` and `disabled=` expressions, duplicated in the Detailed Implementation Plan. Keep one.
- **N7. Unresolved choice.** "`lockPlanOperation` generalised or a sibling" — pick one; M6 may make it moot.

## Success criteria

| SC | Verdict | Change |
|---|---|---|
| SC-001 | Checkable. The 50 repetitions are arbitrary; the lock makes it deterministic. | Keep or drop the count. |
| SC-002 | "First committed" is not observable. | "Exactly one close succeeds and the stored count is that call's." |
| SC-003 | Checkable only with an enumerated path list. | List the paths, including `cancelBooking` with `following` and the board. |
| SC-004 | "Without staff support" is not checkable. | "`listPendingSchedulingLines` returns the line." |
| SC-005 | Checkable through the three component tests. | Name them. |
| SC-006 | Checkable. | None. |
| SC-007 | Acceptable as a non-gate. | Note that nothing ties the 79 exceptions to these defects. |

## Answers to the questions

- **Smallest change per slice:** client guards yes; void no (M4); shift nearly (M2, M3); transitions carry extra machinery (N1–N3) and lack the board consequence (B1); operation id may not need its schema change (M6).
- **Cut, defer or missing:** move D2 and D3 out of the void PR; add the board guard, the `:2105` lock and the release-path list.
- **Ordering:** wrong for the drawer guard (M1).
- **Product rule:** stated clearly, but on a false UI premise and with an incomplete blast radius (B1, M5).
- **Simpler overall approach:** the lock-and-conditional-write shape is right and the rejected alternatives are correctly rejected. The misses are local: M6, N1 and N4.

Not checked: the group handler's skip rule, the gateway action routes, `ConsumptionConfirmDialog`, the `BookingCalendar` drop paths, whether `supabase/migrations/` is the hub's pipeline, and the M5 delete-guard effect. Biggest risk if shipped as written: slice 3 lands before the drawer guard and makes a wrong-customer cancel permanent.