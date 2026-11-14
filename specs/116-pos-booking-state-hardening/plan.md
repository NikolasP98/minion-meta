# Implementation Plan: POS and appointments state hardening

**Spec**: [spec.md](./spec.md) | **Date**: 2026-11-12, pass 2 on 2026-11-14 | **Repo**: `minion_hub`, PR base `master`

Pass 2 folds in four EGM reviews (`egm/zoom_out_report.md`, `egm/comprehension_report.md`, `egm/critic_report.md`, `egm/codebase_details_report.md`). Anchors are hub `21825676`; the touched files are identical to `bb3b78f8`.

## Summary

Six slices in shipping order, one draft PR each. Server fixes lock the row, re-check on the locked row, and write with the expected status in the `WHERE`. Client fixes are a loading gate, a disabled state, or a `try/finally`. No schema change.

| Slice | Title (PR title) | Depends on |
|---|---|---|
| 1 | `fix(appointments): actions wait for the data they act on` | none |
| 2 | `fix(pos): a void refunds once` | none |
| 3 | `fix(pos): a voided instalment reopens its plan` | branch stacked on slice 2 |
| 4 | `fix(pos): a shift closes once` | none |
| 5 | `fix(scheduling): closed appointments stay closed and free their paid service` | merge after slice 1 |
| 6 | `fix(pos): a repeated charge returns the first ticket` | branch stacked on slice 4 |

Slice 1 ships before slice 5 on purpose: slice 5 makes a wrong-customer cancel permanent, so the drawer guard must be live first.

## Technical context

- Bun, SvelteKit 2, Svelte 5 runes, Drizzle 0.45 over Postgres (Supabase), vitest 4. `.for('share')` is already used (`src/server/services/attachment-access.ts:108`).
- Server transactions go through `withOrgCore(ctx, tx => …)`. Writes own a private transaction; row locks under it are already in production.
- **Two test families.**
  - *Mock-db unit tests*: `createMockDb().resolveSequence([...])` feeds one value per `await`, in order. Adding an `await` to a function under test shifts every sequence that calls it. Each slice lists the suites it must update.
  - *SQL integration tests*: `src/server/services/pos-money.sql.integration.test.ts` runs against a disposable Postgres (`openDisposablePostgres()` from `scripts/qc/disposable-postgres`, env `MINION_QC_DISPOSABLE` / `MINION_QC_DATABASE_URL`), with a hand-written fixture schema (`:91-156`). Reuse its helpers: `independentCtx()` (`:439-445`), `deferred()` (`:458-464`), `seedContactOnlyTicket()` (`:466-480`), `paid(planId, amount)` (`:237-241`). It already has concurrent `voidTicket` tests (`:626-717`). `waitForAdvisoryWaiters` (`:447-456`) only sees advisory locks; add a sibling `waitForRowLockWaiters(n)` polling `pg_locks` for `locktype in ('tuple','transactionid') and not granted`, so races are ordered, not repeated 50 times.
  - `submitTicket` cannot run in that fixture (it needs serial counters, hub events, module flags, fin settings). Its changes are proven with mock-db tests plus a row-lock test that does not call it. There is no SQL harness for scheduling; slice 5 uses mock-db with `captureUpdates` / `captureInserts` (`scheduling-bookings-unschedule.test.ts:46-85`).
- Never run the whole suite locally; run the named files. The implementation clones have no `.env`.
- Frozen inventories: `src/server/services/pos-service-boundaries.test.ts:151-270` lists every export of `pos.service.ts` and `pos-accounts.service.ts`; a new export must be added there in the same PR. `src/lib/routes/action-scope.test.ts:41` reads `BookingCalendar.svelte` as text; run it after editing the calendar.

## Constitution check

| Principle | Status |
|---|---|
| I Spec before code | this directory |
| II AS-IS/TO-BE/DELTA with evidence | spec.md rows A1–A21; static read stated |
| III Slice-scoped delivery | six PRs from clones `~/.cache/claude-tmp/hub-116-{a,b,c,d}` copied from `hub-116-base` |
| IV Required build steps | no new surface; Paraglide for new strings; `lint:design`, `lint:tokens`, `lint:optimistic` on UI slices |
| V Security and data gates | none: no schema change, no auth change. Merging stays with the owner |

## Lock order (stated, not delegated)

After slices 2–4 a void's money transaction takes: ticket row `FOR UPDATE` → refund shift `FOR SHARE` → identity (shared) → wallets (sorted) → plan rows `FOR UPDATE` (sorted by id). Other paths, verified in review:

- `changePaymentMethod`: ticket → payment → shift (`pos.service.ts:2084-2109`). Compatible.
- `bookAndLinkTicketLine`: ticket update → wallet (`scheduling-bookings.service.ts:816-830`). Compatible; today's void (wallet before ticket) is the inverted one, so the change removes a cycle.
- `submitTicket`: locks no existing ticket; takes wallets then plans (`:1553-1554`), then the shift `FOR SHARE`. Wallet → plan matches the void.
- No path updates `pos_shifts` while holding a share lock on it, so there is no lock upgrade. `closeShift` takes only the shift row.
- The trigger `pos_ticket_grant_update_guard_v1` no-ops on a status-only update.

Every transaction that takes one of the new locks starts with `SET LOCAL lock_timeout = '5s'`, so a stuck holder fails the waiter instead of stalling the isolate's single pooled connection (`src/server/db/pg-pool.ts:173-174`). A lock timeout surfaces as the route's existing generic 500/409 handling; no new error code.

## Technical Plan

### Slice 1 — client guards (`BookingDetailDrawer`, `ConsumptionConfirmDialog`, `BookingCalendar`)

- **Drawer.** Add `const detailIsCurrent = $derived(!!detail && !loading && (detail.booking.id === bookingId || (detail.visit?.members ?? []).some((mb) => mb.id === bookingId)))`. Members of one visit share one detail (`loadDetail` swaps to the lead, `:296-304`), so switching between them is current by design.
  - Render gate: where the body shows its loading branch (`:991-995`), treat `!detailIsCurrent` like `loading` whenever `bookingId` is set.
  - Every function that writes returns early on `!detailIsCurrent`: `patchStatus`, `applyEdit`, `saveTags`, `reorderService`, `separateService`, `confirmRemoveService`, `addService`, `confirmAddOverride`, `addProduct`, `removeProduct`, `setProductQty`, the notes save (`:1541-1547`) and the charge action (`:1430-1434`).
  - `reloadDetail` captures `gen` before its fetch and drops the result if `gen` changed. `gen` advances only in the selection effect.
  - The complete dialog's member list (`:1736-1745`) also filters out `no_show` and `completed` members (FR-012b).
- **Complete dialog.** `readJson` swallows failures into a fallback (`:77-84`); make `loadRows` report failure, keep a `loadError` state, show it with the existing `common_retry` action, and set confirm to `disabled={busy || loading || loadError}`.
- **Calendar.** Three unguarded `await onmove` sites: the drop (`:2397`), `commitMerge` (`:2546-2547`) and "move anyway" (`:2606`). Wrap each from the await through the clear in `try/catch/finally`. `catch` sets `temporalError = m.sched_move_failed()` (existing key, `messages/en.json:6219`); `finally` clears every id that was painted (`[...ids, ...props.map((p) => p.recordId)]` on the move-anyway path; `mergeAsk = null` on the merge path). In the drop path declare `res` before the `try`. No new message key.

### Slice 2 — a void refunds once (`pos.service.ts` `voidTicket`)

1. The pre-transaction checks stay as early refusals.
2. Stock cancel (`:1885-1893`): on `StockError` with code `not_submitted`, re-read the entry; if it is `cancelled`, treat it as success and store no warning.
3. Money transaction, in order: `SET LOCAL lock_timeout`; `select id, status from pos_tickets where id and org … for update`; if status is not `submitted` throw `PosError('ticket already void', 'already_void')`; refund shift read with `.for('share')` (the `refundShift` closure, used by the preflight too, which is harmless); then today's identity and wallet locks.
4. Re-read `pos_payments` for the ticket inside the transaction; compute `original` and `refunded` from that read, not from `reversal.payments`.
5. Final update adds `eq(posTickets.status, 'submitted')`; a missing returned row throws `already_void`. Update the stale comment at `:1966-1967`.

### Slice 3 — plan state (`pos-accounts.service.ts`, `pos.service.ts`)

- New exported `reopenPlansIfUnpaidInTx(tx, orgId, planIds)` in `pos-accounts.service.ts` beside `settlePlanIfPaid`: for each id in sorted order, lock the plan row; if `status = 'settled'` and `planDetail(plan, await paidLinesInTx(tx, orgId, id)).isPaid` is false, update `status = 'open', settledAt = null` with `eq(status, 'settled')`. Add it to `accountRuntimeExports` in `pos-service-boundaries.test.ts`.
- `voidTicket`: read the ticket lines' distinct `planId`s inside the money transaction and call the helper after the status update. Remove the `TODO(handoff)` at `:2045-2049`.
- `settlePlanIfPaid`: add `.for('update')` to its plan read, before `paidLinesInTx`.
- `cancelPlan`: add `.for('update')` to its read; add `eq(posPaymentPlans.status, 'open')` to its update. With the lock held the existing checks decide (`settled` throws `plan_settled`, `cancelled` returns the row); the predicate is the backstop.

### Slice 4 — shift close (`pos.service.ts`, `ShiftBanner.svelte`)

- `closeShift`: `SET LOCAL lock_timeout`; `.for('update')` on the shift read; `paymentsByMethod` already runs after it; add `eq(posShifts.status, 'open')` to the update; a missing row throws `no_open_shift`.
- Before the update, overwrite `counted[m.id] = expected[m.id] ?? 0` for every method in `settings.methods` with `takesTendered` false. The client stops sending those entries.
- `.for('share')` on the open-shift read of `submitTicket` (`:1581-1586`) and on both shift reads of `changePaymentMethod` (`:2105-2109` selling shift, `:2161-2166` actor's shift). If the selling shift now reads closed, the existing closed-shift branch applies.
- `ShiftBanner.svelte`: a `totals` state of `'loading' | 'ready' | 'error'` and a `closeGen` counter. `startClose` increments `closeGen`, resets `expected = {}` and `pendingEmit = 0`, sets `'loading'`; the fetch checks `res.ok`; an answer whose captured generation is stale is ignored; `res.ok` with no shift keeps today's "closed elsewhere" path (close the modal, invalidate); a thrown or non-OK fetch sets `'error'` and shows `m.pos_shift_totals_failed()` (new key, `en` and `es`) with a `common_retry` button that calls `startClose` again. Confirm is `disabled` unless `'ready'` and not `closing`. `submitClose` returns early when `closing`, sets it, clears it in `finally`.

### Slice 5 — booking status (`scheduling-bookings.service.ts` and callers)

- `setBookingStatusInTx`, after the locked read and the same-status no-op: `if (!ACTIVE_STATUSES.includes(current.status)) throw new BookingTransitionError(current.status, status)`. `ACTIVE_STATUSES` already exists (`:105`). `BookingTransitionError extends Error` with `code = 'invalid_transition'`, exported from the same file. A stored status outside the six is treated as final.
- Same function, when the new status is `cancelled` or `rejected`: `update pos_ticket_lines set booking_id = null where org and booking_id = id and kind = 'service' and ticket is not void` (the `unscheduleVisit` statement at `:1262-1266`, narrowed; `unscheduleVisit` keeps its own bulk clear and its own rules).
- `patchBooking` (`:3112-3135`): replace the inline status write, log insert and reversal with `await setBookingStatusInTx(tx, ctx, id, patch.status, patch)`, then re-select the row with the reader at `:3060-3067` for the return value. A same-status patch no longer bumps `updatedAt`; accepted.
- `cancelBooking` with scope `following` (`:1175-1184`): skip a root that is already final and continue with the later occurrences.
- `reminders.service.ts:384`: wrap in `try/catch`; on `BookingTransitionError` write `console.warn` and `continue` before the counter increment and the CRM activity insert (`:385-402`).
- Route mapping: `statusFailureResponse` (`_handlers.ts:401-418`) returns `json({ error: 'invalid_transition', message }, { status: 409 })` for `BookingTransitionError`. Complete route (`api/scheduling/bookings/[id]/complete/+server.ts:41`; the POS path re-exports it): delete the pre-check and map the thrown error the same way. `api/gateway/actions/booking-complete/+server.ts:55-56`: same, inside a `try`. `booking-cancel` keeps its catch-all 400.
- Client: `kit/booking-mover.ts` `commitStatus` (`:132-142`) and the drawer's `patchStatus` (`:486-491`) show `m.sched_status_final()` (new key: "A closed appointment cannot be reopened. Create a new one.") when the body's `error` is `invalid_transition`. `BookingBoard.svelte` and the grid sub-columns: a card or cell whose status is final is not draggable on the status axis.
- The group endpoint is unchanged for visits (it filters eligible members). An ungrouped booking is not pre-filtered (`_handlers.ts:695-697`) and now answers 409 from a final status.

### Slice 6 — client ticket id (`pos.service.ts`, ticket route, transport, sell page)

- `submitTicket` input gains `ticketId?: string` (validated UUID, lower-cased). When present, `ctx.profileId` must be non-null, else `PosError('operation_actor_required')` (already mapped to 403).
- New private `replayTicket(ctx, ticketId)`: `loadTicketRow` by `(id, org)`; no row → `null`; row with `createdBy === ctx.profileId` → the ticket; otherwise `PosError('operation_conflict')` (already mapped to 409).
- Call it as the first statement of `submitTicket`, before `getPosSettings` validation (`:1465`). On a hit: re-run `postTicketStock` and `settlePlanIfPaid` for the ticket's plans (both idempotent, both fail-soft as today) and return the stored ticket with `replayed: true`.
- Inside the money transaction use `input.ticketId ?? randomUUID()` at `:1579`. Wrap the ticket insert: on `isUniqueViolation`, call `replayTicket` after the transaction rolls back and return its result, or throw `operation_conflict` if it finds nothing in this organisation.
- Route `src/routes/api/pos/tickets/+server.ts`: schema adds `ticketId: z.string().uuid().optional()`; a replay answers 200, a fresh sale 201. `api/gateway/actions/pos-sale` is unchanged.
- Client: `PosTicketRequest` in `src/lib/components/pos/pos-ticket-transport.ts` gains `ticketId`. In `PageBody.svelte`, where the request is built (`:852-876`), keep `let attempt: { fingerprint: string; id: string } | null`; `fingerprint = JSON.stringify(request without paymentPolicyRevision and without ticketId)`; reuse `attempt.id` when the fingerprint matches, otherwise mint `crypto.randomUUID()`; clear `attempt` on success. `charge(true)` ("charge anyway") builds a request that differs only by the override flag; exclude that flag from the fingerprint so it replays. The recovery object's contract ("a rejected ticket is never replayed", `payment-policy-recovery.svelte.ts:44-46`) is unchanged: the id is not held there.
- `TODO(handoff): HS-011` stays, reworded to the remaining gap (a reload loses the id; durable draft as for plans in `plan-open-persistence.ts`), and the ledger entry in meta `proposals/2026-10-02-hub-gateway-production-readiness-recon.md` is updated to match.

## Alternatives considered

- **A state-machine library per entity.** Rejected: a guard line and a conditional `WHERE` are what the repo already uses.
- **Serializable isolation.** Rejected: `withOrgCore` callers do not retry serialization failures.
- **`FOR UPDATE` on the shift for every sale.** Rejected: it queues all sales of one shift; `FOR SHARE` excludes the close just the same.
- **Conditional update as the first statement of the void ("claim first").** Rejected for now: the status would be written before the reversals in the same transaction, which is equivalent under the lock but reorders a long function; the explicit lock keeps the diff small.
- **A full transition table.** Rejected: the rule has two kinds of row, live and final; `ACTIVE_STATUSES` already encodes it.
- **Reviving closed bookings with re-redemption.** Rejected for this batch; production shows no revival in six weeks.
- **`operation_id` column with a request hash (pass 1, and the plan pattern).** Rejected: it needs a migration and an owner data gate for the same guarantee the ticket's primary key gives. The price is no server-side comparison of the repeated request; the client derives the id from the request to cover it.
- **Durable draft across reload (the plan pattern).** Deferred: it is the larger half of HS-011 and stays in the ledger.
- **Clearing the paid line on no-show.** Rejected as a default: it would make a charged no-show free to rebook on every path.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A mistaken cancel or no-show can no longer be dragged back | Stated for the owner in the spec; the refusal message says what to do; slice 1 ships first so wrong-customer cancels stop |
| A waiting sale stalls behind a slow close | `lock_timeout` 5 s; the close transaction is short (emission is post-commit) |
| Automated cancels (reminder "no", gateway cancel, series cancel) now free paid services | Intended and listed in the spec's decisions |
| A cancelled paid booking loses its ticket link and delete guard | Same as today's unschedule; stated in FR-012 |
| Reopened plans surprise a report reading `settled_at` | `settledAt` is nulled with the status; progress is derived on read |
| Client id drifts from the request (rotation bug) returns an old ticket for a new cart | The id is derived from the request fingerprint at build time; unit test covers edit, payment change, customer change, override retry |
| Positional mock tests go red in unrelated-looking suites | Each slice lists them; run them before pushing |
| Local memory is tight | One heavy gate at a time under `flock ~/.cache/claude-tmp/hub-gate.lock`; if `bun run check` is killed, say so in the PR and rely on CI |

## Verification

Per slice: the failing test first, then green. Then `bunx prettier --check <changed files>`; `bunx vitest run <named test files>`; UI slices also `bun run i18n:compile`, `bun run lint:design`, `bun run lint:tokens`, `bun run lint:optimistic`; `bun run check` under the gate lock. SQL integration tests run locally only if a disposable Postgres is available; otherwise CI's lane runs them and the PR says so. After deploy, with the QA account: void a cash ticket twice quickly; close a shift from two tabs; cancel a paid appointment and find its service in the tray; click between two appointments and press cancel at once; drag a cancelled card on the board.

## Detailed Implementation Plan

Files are marked C (create) or M (modify).

### Slice 1

- M `src/lib/components/scheduling/BookingDetailDrawer.svelte`
- M `src/lib/components/scheduling/ConsumptionConfirmDialog.svelte`
- M `src/lib/components/scheduling/BookingCalendar.svelte`
- C `src/lib/components/scheduling/booking-detail-drawer.mounted.test.ts` (+ a harness under `__fixtures__/`, following `src/lib/components/pos/payment-policy-recovery.mounted.test.ts`)
- C `src/lib/components/scheduling/consumption-confirm-dialog.mounted.test.ts`
- M `src/lib/components/scheduling/calendar-reclassify.mounted.test.ts` (rejecting `onmove` case for drop, merge and move-anyway)
- Run also: `src/lib/routes/action-scope.test.ts`, `kit/booking-mover.test.ts`

Steps: (1) drawer test: load A, hold B's fetch, assert the loading branch renders and `patchStatus`/notes/tags send nothing; resolve a late A reload and assert B's detail stays. (2) dialog test: confirm disabled while loading and after a failed load. (3) calendar test: rejecting `onmove` leaves `optimistic` empty and shows the message on all three paths. (4) implement. (5) gates, draft PR.

### Slice 2

- M `src/server/services/pos.service.ts`
- M `src/server/services/pos-money.sql.integration.test.ts` (add `waitForRowLockWaiters`; two concurrent voids for cash and for credit refund)
- M `src/server/services/pos.tickets.test.ts`, `pos.packages.test.ts`, `pos.shifts.test.ts`, `src/routes/api/pos/tickets/[id]/void/server.test.ts` (mock sequences gain the ticket lock read, the in-transaction payments read and the stock re-read)

Steps: (1) failing concurrent tests; (2) failing unit test for the stock-warning branch; (3) implement steps 2–5 of the technical plan; (4) repair sequences; (5) PR body states the lock order.

### Slice 3 (branch from slice 2's branch)

- M `src/server/services/pos-accounts.service.ts`, `src/server/services/pos.service.ts`
- M `src/server/services/pos-service-boundaries.test.ts`
- M `src/server/services/pos-money.sql.integration.test.ts` (void of the settling instalment reopens; void racing `settlePlanIfPaid`; cancel racing settle)
- M the same mock suites as slice 2 where `voidTicket`, `settlePlanIfPaid` or `cancelPlan` sequences shift

### Slice 4

- M `src/server/services/pos.service.ts`
- M `src/lib/components/pos/ShiftBanner.svelte`
- M `messages/en.json`, `messages/es.json` (`pos_shift_totals_failed`)
- M `src/server/services/pos-money.sql.integration.test.ts` (two concurrent closes; a raw transaction holding `FOR SHARE` on the shift makes the close wait and the close then includes a payment that transaction inserted; correction racing a close)
- M `src/server/services/pos.shifts.test.ts` (`:442-517`), `pos.tickets.test.ts`, `pos.packages.test.ts`, `src/routes/api/pos/shifts/close/server.test.ts`
- C `src/lib/components/pos/shift-banner.mounted.test.ts`

### Slice 5

- M `src/server/services/scheduling-bookings.service.ts`, `src/server/services/reminders.service.ts`
- M `src/routes/api/scheduling/bookings/_handlers.ts`, `src/routes/api/scheduling/bookings/[id]/complete/+server.ts`, `src/routes/api/gateway/actions/booking-complete/+server.ts`
- M `src/lib/components/scheduling/kit/booking-mover.ts`, `BookingBoard.svelte`, the grid's status sub-column drag source, `BookingDetailDrawer.svelte` (`patchStatus` message only)
- M `messages/en.json`, `messages/es.json` (`sched_status_final`)
- M tests: `scheduling-bookings-unschedule.test.ts`, `-update.test.ts`, `-ticket-link.test.ts`, `-visit.test.ts`, `-packages.test.ts`, `-atomic.test.ts`, `-accrual.test.ts`, `-properties.test.ts`; `routes/api/scheduling/bookings/_handlers.test.ts`; `routes/api/scheduling/bookings/[id]/group/server.test.ts`; `routes/api/gateway/actions/actions.server.test.ts`; `kit/booking-mover.test.ts`
- C `src/server/services/scheduling-bookings-transitions.test.ts` (guard per final status, no log row; live moves unchanged; link clear for cancelled/rejected on service lines of non-void tickets; product line and no-show keep the link; `patchBooking` delegates; series cancel skips a final root)
- C `src/server/services/reminders-transition.test.ts` (refusal skips counters and the batch continues)

### Slice 6 (branch from slice 4's branch)

- M `src/server/services/pos.service.ts`, `src/routes/api/pos/tickets/+server.ts`
- M `src/lib/components/pos/pos-ticket-transport.ts`, `src/routes/(app)/pos/sell/PageBody.svelte`
- M tests: `pos.tickets.test.ts`, `pos.packages.test.ts` (replay returns before the plan, redemption, stock and policy preflights; other profile refused; unique-violation backstop), `pos-ticket-transport.test.ts`, `sell-charge-handoff.test.ts` or `sell-session.mounted.test.ts` (id reuse and rotation)
- C `src/routes/api/pos/tickets/server.test.ts` (201 fresh, 200 replay, 409 conflict, 403 without a profile)
- M meta `proposals/2026-10-02-hub-gateway-production-readiness-recon.md` (HS-011 narrowed) — done by the spec author, not the hub PR
