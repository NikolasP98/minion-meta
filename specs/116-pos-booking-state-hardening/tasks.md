# Tasks: POS and appointments state hardening

Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md) (pass 2). One draft PR per slice against hub `master`. `[OWNER]` marks a human gate.

## Slice 1 — client guards (US3, US5; D1, D2, D3; FR-008, FR-012b, FR-013, FR-014)

- [ ] T101 Failing drawer test with a held fetch: loading branch shown, no writer sends, stale reload dropped
- [ ] T102 Failing complete-dialog test: confirm off while loading and after a failed load
- [ ] T103 Failing calendar test: rejecting `onmove` on drop, merge and move-anyway leaves no optimistic entry and shows `sched_move_failed`
- [ ] T104 Drawer: `detailIsCurrent`, render gate, early returns, `gen` check in `reloadDetail`, complete members exclude `no_show` and `completed`
- [ ] T105 Complete dialog: load error state and disabled confirm
- [ ] T106 Calendar: `try/catch/finally` on the three paths
- [ ] T107 Gates (prettier, named vitest files, `action-scope.test.ts`, `lint:design`, `lint:tokens`, `lint:optimistic`, `check` under the gate lock); draft PR

## Slice 2 — a void refunds once (US1; D4, D5; FR-001, FR-002, FR-002a)

- [ ] T201 `waitForRowLockWaiters` helper; failing concurrent-void tests for cash and credit refund
- [ ] T202 Failing unit test: no stock warning when the entry is already cancelled
- [ ] T203 `voidTicket`: lock timeout, ticket `FOR UPDATE` + status re-check, refund shift `FOR SHARE`, in-transaction payments read, conditional status update
- [ ] T204 Stock-cancel branch re-read
- [ ] T205 Repair the mock sequences listed in the plan
- [ ] T206 Gates; draft PR with the lock order in the body

## Slice 3 — plan state (US1 scenario 3; D6, D7; FR-003, FR-004) — stacked on slice 2

- [ ] T301 Failing tests: void of the settling instalment reopens the plan; void racing settle; cancel racing settle
- [ ] T302 `reopenPlansIfUnpaidInTx` + export inventory; call from `voidTicket`; remove the resolved `TODO(handoff)`
- [ ] T303 `settlePlanIfPaid` and `cancelPlan` locks; conditional cancel
- [ ] T304 Repair mock sequences; gates; draft PR naming slice 2 as its base

## Slice 4 — a shift closes once (US2; D8–D11; FR-005 to FR-007)

- [ ] T401 Failing tests: two concurrent closes; close waits for a share-lock holder and includes its payment; correction racing a close
- [ ] T402 `closeShift`: lock, conditional update, server-filled counts for non-counted methods
- [ ] T403 `FOR SHARE` in `submitTicket` and both branches of `changePaymentMethod`
- [ ] T404 Failing `ShiftBanner` mounted test; then totals state, generation, error + retry, in-flight guard; client stops sending non-counted methods; `pos_shift_totals_failed` in `en` and `es`
- [ ] T405 Repair mock sequences; gates incl. `i18n:compile`; draft PR

## Slice 5 — closed appointments stay closed (US4; D12–D15; FR-009 to FR-012a) — merge after slice 1

- [ ] T501 `scheduling-bookings-transitions.test.ts` failing cases (see plan)
- [ ] T502 Guard + `BookingTransitionError` + narrowed link clear in `setBookingStatusInTx`
- [ ] T503 `patchBooking` delegates and re-selects; series cancel skips a final root
- [ ] T504 Reminder job handles the refusal (test first)
- [ ] T505 Route mapping (PATCH, group, complete, gateway complete); delete the complete pre-check
- [ ] T506 Board/grid: final cards not draggable; `sched_status_final` shown by the mover and the drawer; `en` and `es`
- [ ] T507 Repair the mock suites listed in the plan; gates; draft PR

## Slice 6 — a repeated charge returns the first ticket (US6; D16, D17; FR-015, FR-016) — stacked on slice 4

- [ ] T601 Failing unit tests: replay before preflights (plain, final instalment, package session, changed policy revision); other profile refused; unique-violation backstop
- [ ] T602 `submitTicket` `ticketId`, `replayTicket`, post-commit re-run on replay
- [ ] T603 Route schema and status codes, with a new route test
- [ ] T604 Failing unit test, then transport field and request-fingerprint id in the sell page; reword `TODO(handoff): HS-011`
- [ ] T605 Gates; draft PR naming slice 4 as its base

## Close-out

- [ ] T701 [OWNER] Approve the spec's two decisions (closed bookings are final; a no-show keeps its paid line) and merge the PRs in slice order
- [ ] T702 Post-merge check on prod with the QA account (plan.md "Verification")
- [ ] T703 Ledger: paid lines stranded before this ships (count and one-off repair) and the HS-011 remainder recorded in `proposals/`
