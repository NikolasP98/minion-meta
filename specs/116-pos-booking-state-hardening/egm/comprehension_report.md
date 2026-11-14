# Comprehension review: spec 116, POS and appointments state hardening

Mode: REVIEW. I read the persona, the feature-spec standard, `spec.md` and `plan.md` in full, and nothing else; no anchor was checked against code.

**Result:** no Blockers; every section can be paraphrased. There are 14 Major findings where an implementer would have to guess or where the two files disagree, plus Nits. Against the standard, problem statement, non-goals, alternatives and risks are all present; the gaps are in self-containment and spec-to-plan traceability.

## Paraphrase

### What this proposes

Five independently shipped fixes in the `minion_hub` app for places where a record changes status without checking its current status. Server fixes lock the row, re-check the status under the lock, and write conditionally. Client fixes disable buttons until the data on screen matches what the action will hit, and undo optimistic UI on failure. One fix adds a nullable `operation_id` column to tickets so a retried charge returns the first ticket. One product rule is introduced: cancelled, rejected, no-show and completed bookings are final.

### How the existing system works, per this document

- **Void:** `voidTicket` decides "already void" and reads the payments to refund before its money transaction, so two concurrent voids can both refund. A void also leaves a settled payment plan settled, which then can be neither paid nor cancelled.
- **Shift:** `closeShift` and the code that attaches sales, refunds and corrections to a shift read the open shift without locks. The close dialog can show stale totals and accepts a double confirm.
- **Bookings:** status can move from any status to any status. `patchBooking` writes status through its own copy of the logic. Only `unscheduleVisit` unlinks a paid ticket line from a booking.
- **Appointments UI:** the drawer keeps showing booking A while B loads and its buttons still act. The complete dialog can be confirmed before its rows load. Calendar drags leave an optimistic block when the request throws.
- **Sell screen:** it cannot tell a lost reply from a refusal, and tickets have no idempotency key.

## The five slices, in my own words

| Slice | What I think it changes | Where I am unsure |
|---|---|---|
| 1. Void and plan (server) | The money transaction starts by locking the ticket row and throws `already_void` unless it is `submitted`. Payments to refund are re-read inside that transaction. The final update only matches a `submitted` ticket. After the void, each settled plan on the ticket's lines is reopened if no longer fully paid. `cancelPlan` locks its row and only cancels an `open` plan. | Whether the pre-transaction `already_void` check stays; what `cancelPlan` returns on an already-cancelled plan. |
| 2. Shift close (server and dialog) | `closeShift` locks the shift row and only closes an `open` one; the loser gets `no_open_shift`. Sale submit, void refund and payment-method correction read the open shift `FOR SHARE`, so they finish before the close or fail after it. The dialog clears old totals, tracks loading/ready/error, enables confirm only when ready, offers retry, and ignores a second confirm. | Whether the close computes expected totals after taking its lock; whether the void's shift read moves into the money transaction. |
| 3. Booking transitions (server) | A transition table: `pending` and `accepted` may go anywhere, the four final statuses nowhere, same status is a no-op. `setBookingStatusInTx` enforces it and throws `invalid_transition`. When the target is cancelled, rejected or no-show it clears `pos_ticket_lines.booking_id`. `patchBooking` delegates to it. Routes return 409; the reminder code logs and continues. | Which statuses are "settable"; whether a refused status in a multi-field edit rejects the whole edit; how the 409 message gets translated. |
| 4. Client guards (three components) | Drawer buttons are disabled unless the loaded detail matches the selected booking and nothing is loading; a late reload is dropped. The complete dialog's confirm is also disabled while loading. Both calendar drop paths clear the optimistic block in `finally` and set an error on throw. | The visit-member exception; what happens when the complete dialog's load fails. |
| 5. Ticket operation id (schema, server, sell screen) | Nullable `operation_id uuid` on `pos_tickets` with a partial unique index per organisation. `submitTicket` takes an optional id; under an advisory lock it returns the existing ticket to the same creator or throws a conflict for another user. The sell screen reuses a UUID across retries of an unchanged cart and drops it on edit or success. | Whether the migration is its own PR; whether the id survives a page reload; what a replay returns and re-triggers. |

## Findings

### A. Terms used without definition

**A1 (Major): "owner" has two meanings.** In Tags, Assumptions and the Constitution check it is a person who approves and merges. In FR-010, FR-012 and D9 ("the one transaction-level owner", "the owner MUST clear the booking link") it is a function, apparently `setBookingStatusInTx`. FR-012 reads at first as an instruction to a human. Name the function in the FRs.

**A2 (Major): "ledger" has two meanings.** In plan slice 1 ("against the ledger", "ledger adjustment") it is the client-credit ledger. In "separate ledger item" and "update the ledger entry in `proposals/...`" it is some issue tracker. Neither is defined.

**A3 (Major): `SETTABLE` and `RELEASING`.** Both are load-bearing for slice 3 and their contents are never listed. FR-012 implies `RELEASING` is cancelled, rejected and no-show, but the plan never confirms it. "Any settable status" cannot be evaluated without the list.

**A4 (Major): POS domain words an implementer needs for tests.**
- Money: "till", "client credit", "wallets", "identity" (in the lock order ticket → identity → wallets), "refund forms", "guard order of a void", "preflight", "money transaction", `reversal.payments`, `original`/`refunded`, `metadata.voidOf`.
- Shift: "expected totals", "count", "payment-method correction", `pos: manage`, "emission" / "tax emission" / "SUNAT".
- Scheduling: "to schedule tray" / "tray query" (is it `listPendingSchedulingLines`?), "visit", "group endpoint", "package session", "stock reservation", "consumption rows", "reversal" in `patchBooking`, "reminder reply", "gateway action", "saved automation", "move anyway" path, "scope change" (A7).

**A5 (Nit): project and process labels.**
- Organisation: "hub", "gw", "gateway", "(meta)" on the feature branch, "prd", "spec-kit", "egm", "owner gate", spec 117.
- Trackers: `HS-011`, `HS-021`, `TODO(handoff)`.
- Process: "Constitution" principles I–V, "FigCraft proposal", `lint:design`, `lint:tokens`, "route-contract", "hub migration pipeline", "stale local checkout", "heavy gate" / "gate lock", "CI's Postgres lane", `HUB_TEST_DB_URL`.
- Code: Paraglide, `withOrgCore` and `ctx`, `planDetail`, `paidLinesInTx`, `assertPlansPayable`, `settlePlanIfPaid`, `reverseRedemptionInTx`, `lockPlanOperation`, `anchorId`, `gen`, `busy`, `temporalError`, `clearOptimistic`, "attempt runner", `runPaymentPolicyTicketAttempt` "and its recovery object".
- Unnamed things: "the existing operation-conflict error" and "the submit route" have no name or path. `setBookingStatus` (slice 3 test 3) versus `setBookingStatusInTx` is unexplained.

**A6 (Nit): "slice" is used before it is introduced.** The spec refers to "slice 5" in Tags and to slices 1–5 in DELTA but never lists them. Only the plan does.

### B. Statements I could read two ways

**B1 (Major): FR-009 "may move to any status".** The spec says "any status", the plan says "any settable status", and the test is a "full 6×6 table". Is `accepted → pending` allowed? Is `pending` settable at all? The expected content of the 36 cells is not written down.

**B2 (Major): a refused status inside a general edit.** FR-010 routes `patchBooking` through the guard. If a PATCH carries a status change plus other fields on a final booking, is the whole edit refused or only the status part? Scenario 4.1 says "nothing is written", which suggests the whole edit. Whether non-status fields of a final booking stay editable is not said.

**B3 (Major): same-status no-op and existing stranded lines.** FR-009 keeps same-status writes a no-op, and FR-012 clears the link "when a booking becomes" releasing. So re-cancelling an already-cancelled booking that still holds a paid line clears nothing. Invariant I5 is stated as always true, but bookings cancelled before this ships break it and there is no backfill task. Either scope I5 to new transitions or add a backfill.

**B4 (Major): "logged" in the reminder edge case.** The edge case says "refused, logged" while FR-011 says a refusal "MUST NOT write a log row". I assume the first is an application log and the second is `sched_booking_status_log`; say so. It is also unclear whether a reminder reply is an inbound message or part of a batch (the plan says "continues the batch"), and what the customer is told.

**B5 (Major): the visit-member exception in `detailIsCurrent`.** The plan treats detail as current if "the visit's member ids include `bookingId`". Spec A7 says `anchorId` derives from `detail`. If A and B are in one visit and B is selected while detail holds A, the buttons are enabled and may act on A. That is the defect User Story 3 describes. Either this is intended (visit detail is shared) or it is a hole; the document does not say.

**B6 (Major): Story 1 scenario 2 and plan test 1 on credit.** "A ticket paid from client credit ... two credit-refund voids" mixes payment by credit with refund to credit. Plan test 1 says "Repeat for `refund: 'credit'` against the ledger" without saying whether the fixture is a cash-paid or credit-paid ticket.

**B7 (Major): `cancelPlan` zero-row handling.** "Zero rows re-reads and maps to `plan_settled` or returns the cancelled row." With `FOR UPDATE` on the read, I cannot see how the update reaches zero rows unless the status check on the read is removed. It also implies cancelling an already-cancelled plan now succeeds; whether that is today's behaviour is not stated.

**B8 (Major): "the void refund shift at `:1846` inside the money transaction".** Spec A1 places the money transaction at `:1990-2040`, and `:1846` sits in the pre-transaction region. So this either means "move this read into the money transaction" or wrongly describes where it is. Which shift receives the refund (the voider's or the ticket's original) and what happens when there is none are also unstated.

**B9 (Nit): "first" in Story 2 scenario 1.** SC-002 says "first committed" and the plan says "the winner's". Use one phrase.

**B10 (Nit): "MUST show an error" in FR-014.** The Assumptions call it "an error toast"; the plan sets `temporalError`, which looks like inline state. Also, `catch` replaces any server message with the generic `cal_move_failed`; is that intended?

**B11 (Nit): "charge attempt series" in FR-016.** Not defined. What counts as a cart or payment change (customer, discount, note)? Does a definitive refusal keep the id?

### C. Spec and plan disagree, or an item has no counterpart

**C1 (Major): slice 5 PR count.** The Summary says "five slices, one draft PR each" and slice 5's file list and step 1 include the migration. The Risks table says the migration is "merged first" and the client change "ships in the same PR as the server change, after the migration is applied". Is the migration a sixth PR or not?

**C2 (Major): slice 5 deploy-order claim.** The Risks table says the new code path "only runs when the client sends an id". The Drizzle schema gains the column in the same change. If Drizzle selects all mapped columns, every ticket read would fail before the migration is applied, not only replays. I cannot verify this from the document; the author should confirm.

**C3 (Major): slices 1 and 2 overlap.** The plan's last line says slices 1, 2 and 5 "touch different regions of `pos.service.ts`". But slice 2 changes the void's shift read, and slice 1 restructures the same function. No order between 1 and 2 is given.

**C4 (Major): Story 2's headline has no requirement.** "The expected totals on screen are the ones the close used" has no FR, D row or test. FR-007 only makes the totals fresh at dialog open. A sale between dialog open and confirm changes what the server uses. The plan also never says `closeShift` computes expected totals after taking its lock, which scenario 2.2 needs.

**C5 (Major): two product decisions, not one.** The Assumptions say final bookings are "the one product decision in the spec". The Risks table adds a second, "stated for the owner": a paid no-show becomes reschedulable for free. That one appears only in the plan.

**C6 (Major): FR-006 is only partly tested.** FR-006 names three writers. D5 and slice 2 test 2 cover only the sale racing a close. The void refund and the payment-method correction have no test.

**C7 (Major): FR-012 "by any path" is tested on one path.** Slice 3 test 3 only goes through `setBookingStatus`. The `patchBooking`, gateway `booking-cancel` and group paths are not listed.

**C8 (Major): FR-015 omits the different-actor case.** Scenario 6.2 and the plan refuse it; the FR is silent. No error code or HTTP status is named. It is also unspecified what happens on a replay with a different payload, or when the first ticket has since been voided.

**C9 (Major): FR-017 has no D row or test.** Slice 3 needs "a translated message" for the 409, but its file list has no `messages/*.json`. Where the translation happens (server or client) is not stated. No slice 3 client change shows `invalid_transition` to the user either.

**C10 (Major): the complete routes.** Spec A8 anchors one complete route. The plan says "both complete routes" and then lists four handlers, including `api/pos/appointments/[id]/complete`, which has no AS-IS row. The code and status the extended pre-check returns are not given (today's refusal versus `invalid_transition` 409). Nor is it clear whether gateway actions return HTTP 409 or an action-result payload.

**C11 (Nit): edge cases without a plan step or test.** Closing someone else's shift; a void of an instalment ticket whose plan was cancelled; a double complete staying idempotent; the group endpoint skip rule; old clients with no operation id; the loser's stock cancel.

**C12 (Nit): SC-001 and SC-002 "50 times".** The plan's tests run the race once. SC-007 has no task or person assigned. SC-004 says "without staff support", but staff are the users.

**C13 (Nit): D3's test differs between files.** The spec says "concurrent cancel and instalment → consistent outcome", with "consistent" undefined. The plan tests "a cancel racing `settlePlanIfPaid`". These are different races.

**C14 (Nit): "Unchanged: guard order of a void".** Slice 1 adds a new first check and moves the payments read. Since "guard order" is undefined, I cannot tell whether this breaks the claim.

**C15 (Nit): Known unknowns versus Assumptions.** Known unknowns still lists "whether any saved automation relies on reviving a closed booking". The Assumptions cite production log data that largely answers it. That data is dated 2026-11-14 in a document dated 2026-11-12. "1,043 rows" versus "448 status changes" leaves 595 rows unexplained.

**C16 (Nit): plan Summary over-generalises.** "Every client fix is a disabled state or a `try/finally`" does not cover the operation id or the retry UI. "Every server fix is the same shape" does not cover the advisory lock in slice 5. "Five entities with two to six states" counts the ticket line, which has no states.

**C17 (Nit): repo of the proposals file.** Slice 5 edits `proposals/2026-10-02-hub-gateway-production-readiness-recon.md`. The spec says "Repos: `minion_hub` only". Which repo holds that file?

Every other FR and D row has a counterpart. FR-001 to FR-005, FR-007 to FR-011, FR-013, FR-014 and FR-016 each map to a D row and a slice task. No D row lacks an FR.

### D. Steps where I would have to guess

**D1 (Major): lock order once slices combine.**
- Slice 1 gives ticket → identity → wallets.
- Slice 2 adds a shift `FOR SHARE` inside the same transaction, position unstated.
- Slice 1 step 4 adds plan row locks at the end, with no order among several plans.
- Slice 5 adds an advisory lock "at the start" of `submitTicket`, before or after the shift lock unstated.
- Whether instalment payment locks the plan row is not said; without that, `cancelPlan`'s lock serialises nothing against it.
- Whether any shift-share holder later updates the shift row (a deadlock risk) is also not said.

**D2 (Major): operation id lifetime.** The plan holds the UUID in the attempt runner's memory. A page reload after a lost reply would lose it and allow a duplicate. Story 6 reads as if retry is always safe. It is also unclear whether a replay re-runs post-commit effects such as emission or printing, and whether the replay response has the same shape as a fresh submit.

**D3 (Major): complete dialog load failure.** The plan's `disabled={busy || loading}` enables confirm when the load fails and `loading` goes false with no rows. FR-007 specifies an error path for the close dialog; FR-013 has none.

**D4 (Major): close dialog stale fetch.** Open, close, reopen quickly: the first fetch can resolve after the reset. No generation token is planned here, unlike the drawer.

**D5 (Major): `patchBooking` delegation equivalence.** Spec A8 says it has "its own copy of the log and reversal". Scenario 4.3 demands "exactly as today". Whether the two copies write identical log fields and reversals is left to the implementer to discover.

**D6 (Nit): drawer `gen`.** Does it advance on selection change only, or also on each reload? What happens to a mutation's own follow-up (toast, close) if the selection moved while it ran?

**D7 (Nit): slice mechanics.**
- Hub branch names and the clone source are not given.
- Line anchors for slices 2 and 5 will drift once slice 1 merges.
- The pattern "idempotent create by operation id" points at a test file on the client side, not an implementation file.
- "Extend or create" for the slice 1 test file is left open.
- Slice order versus priority is unstated: the P1 drawer fix is slice 4 and the P2 transitions are slice 3.

Not checked: no code anchor, line number or claimed pattern was verified, by instruction. C2 and D1 are the two findings where a wrong guess costs production behaviour rather than review time.

Files reviewed:
- `/home/nikolas/.cache/claude-tmp/meta-113/specs/116-pos-booking-state-hardening/spec.md`
- `/home/nikolas/.cache/claude-tmp/meta-113/specs/116-pos-booking-state-hardening/plan.md`
- `/home/nikolas/.claude/plugins/cache/egm/egm/0.1.0/agents/comprehension.md`
- `/home/nikolas/.claude/plugins/cache/egm/egm/0.1.0/resources/document_standards/feature-spec-standard.md`