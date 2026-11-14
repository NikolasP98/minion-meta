# Codebase-details review: spec 116 (POS and appointments state hardening)

**Verdict: not implementation-ready.** Most AS-IS anchors hold, but there are four blockers (one each in slices 1, 3 and 5, plus the test-harness claim) and a set of unstated decisions that fail the zero-decision rule.

Paths below are relative to `/home/nikolas/.cache/claude-tmp/egm-116/hub/`. I read the spec, plan, tasks, the persona and the standard in full.

## Cross-cutting

**[Blocker] Test-harness claim is wrong for the file the plan names** (plan.md "Technical context").
- `src/server/services/pos-money.sql.integration.test.ts` does not use `HUB_TEST_DB_URL`. It calls `openDisposablePostgres()` from `scripts/qc/disposable-postgres` (`:5`, `:78`) with the comment "No implicit application URL or optional skip: identity and disposable marker are mandatory" (`:77`). Sibling suites pass `MINION_QC_DISPOSABLE` / `MINION_QC_DATABASE_URL` (`job-stock-concurrency.sql.integration.test.ts:245-249`).
- `HUB_TEST_DB_URL` is the other family, resolved by `src/server/test-utils/test-db-url.ts:13-18`.
- The fixture is hand-written, not migrations. Tables are created by raw DDL in a random schema (`:91-156`), with selected migrations spliced in via `replaceAll('public.', …)` (`:81-90`, `:169-173`, `:185-205`). Forced RLS is applied per table from the `tables` list (`:49-61`, `:178-183`).
- Fixture `pos_tickets` (`:100-109`) has no `operation_id`; `sched_bookings` is a four-column stub (`:92`).
- These tables are absent from the fixture: `naming_series_counters`, the hub-event table, `app_modules`, `pos_emissions`, `sched_booking_status_log`, and a real `fin_settings`.
- `submitTicket` needs several of them: `nextSerialId` (`pos.service.ts:1588`), `emitHubEvent` (`:1705`), `isModuleEnabled` (`:1509`, `:1717`), `getFinSettings` (`:1485`).
- So T202 and T502 cannot run in this harness without a fixture extension the plan never lists.

**How concurrency is tested today** (helpers to reuse, not reinvent):
- `independentCtx()` gives one connection per actor (`:439-445`).
- `deferred()` (`:458-464`) and `waitForAdvisoryWaiters(n)` polling `pg_locks` (`:447-456`) make ordering deterministic.
- `seedContactOnlyTicket()` seeds shift, ticket and ledger (`:466-480`).
- The winner-order runner blocks on the plan-operation advisory key (`:893-923`).
- Existing concurrent `voidTicket` tests are at `:626-675` and `:677-717`.
- `waitForAdvisoryWaiters` filters `locktype='advisory'`. Slices 1 and 2 use row locks, so they need a sibling that polls `locktype in ('tuple','transactionid') and not granted`. The plan's bare `Promise.allSettled` ×50 (SC-001/002) is non-deterministic by comparison.

**[Major] Existing unit tests are positional mock sequences and will go red.**
- `createMockDb().resolveSequence([...])` feeds one value per `await`. `scheduling-bookings-unschedule.test.ts:87-89` literally encodes "the awaits one `setBookingStatusInTx` consumes".
- Slices 1, 2, 3 and 5 each add awaits inside functions under test. Suites affected:
  - Void, cancel-plan and tender-correction calls: `pos.tickets.test.ts` (10), `pos.packages.test.ts` (13), `pos.shifts.test.ts` (2), `routes/api/pos/tickets/[id]/void/server.test.ts` (8).
  - `submitTicket` sequences (slices 2 and 5): `pos.tickets.test.ts`, `pos.packages.test.ts`.
  - `closeShift`: `pos.shifts.test.ts:442-517`.
  - Booking status: `scheduling-bookings-{unschedule,visit,packages,atomic,accrual,properties,update}.test.ts`, `routes/api/scheduling/bookings/_handlers.test.ts`.
- Plan slice 3 step 4 says "verify existing booking tests still pass". They will not; the plan must list them as Modify.

**[Major] Files are not marked Create / Modify / Delete.** Several entries are vague: "tests beside each", "the submit route", "the sell screen attempt runner", "a `ShiftBanner` test beside existing component tests".

**[Nit] `withOrgCore` "does not nest" is incomplete.** On POS GETs it joins a request-wide ambient transaction (`src/server/db/with-org-core.ts:172-199`, `ambient-org-tx.ts:6`). Writes are unaffected.

**Drizzle `.for('share')`: supported.** `drizzle-orm ^0.45.2` (`package.json:87`). Existing uses: `src/server/services/attachment-access.ts:108`, `src/server/services/workflow.service.ts:240`. `{ of }` and `{ noWait }` variants also exist (`pos.service.ts:1340`, `job-effects.service.ts:331`).

## AS-IS anchors (A1–A12)

| # | Result | Notes |
|---|---|---|
| A1 | OK, one drifted range | `:1827-1836` and `:1857-1883` correct. `:1990-2040` should be `:1991-2033` (refund) plus `:2034-2043` (final UPDATE; its WHERE is at `:2042`). |
| A2 | **Wrong function name** | `assertPlansPayable` does not exist. `:1258` is inside `assertPlansUsableInTx` (`pos.service.ts:1228-1262`). The preflight `assertPlansUsable` (`:1200-1220`) refuses only `cancelled`. TODO at `:2045-2049` and `pos-accounts.service.ts:387` correct. |
| A3 | OK | `pos-accounts.service.ts:378-401`. |
| A4 | OK | `pos.service.ts:366-427`; read `:383-395`, update `:405-417`. |
| A5 | OK | `:1581-1586`, `:1846-1851`, `:2161-2166`. `refundShift` is one closure called twice: preflight `:1855` and money transaction `:1898`. |
| A6 | OK | `ShiftBanner.svelte:201-226`, `:232-275` (spec says `-262`). Confirm button at `:521`, no `disabled`. |
| A7 | OK, footer range short | Effect `:306-357`, `anchorId` `:433`, `reloadDetail` `:453-459`. Footer snippet starts `:1614`; last button's `disabled` is `:1712` and the button closes `:1721`. Charge button is elsewhere: `:1430-1434`. |
| A8 | One claim misleading | `:1024`, `:1067-1097`, `:3086-3150`, complete route `:41-43` correct. "The reminder reply sets `accepted` whatever the current status" is not what the code does: candidates are selected with `b.status = 'pending'` (`reminders.service.ts:340`). The defect is a check-then-act window between that query and `:384`, widened by the inference call at `:369`. |
| A9 | OK, omission | `unscheduleVisit` `:1224-1285`; clear at `:1262-1266`. Not mentioned: `bookAndLinkTicketLine` already treats a line linked to a dead booking as stuck (`DEAD_BOOKING_STATUSES`, `:700`, `:784-796`), and that set omits `no_show`. |
| A10 | OK | `:147-161`, `:174-202`, `:269`. `loadRows` cannot reject (`readJson` swallows, `:77-84`), so `loading` cannot hang. |
| A11 | OK | `:2391-2404`, `:2594-2608`. `moveBooking` has no try around `fetch` or `refresh` (`kit/booking-mover.ts:97`, `:119`), so `onmove` does reject on a network drop. |
| A12 | OK | `PageBody.svelte:830-834`; `plan-operation.ts` exists. |

**Unverified baseline:** the spec anchors to `bb3b78f8`; the snapshot I was given is `21825676`. I could not confirm they are the same tree.

## Slice 1 — void and plan

**[Blocker] Step 4 names a non-exported helper and trips a frozen export inventory.**
- `paidLinesInTx` is private (`pos-accounts.service.ts:340`). `planDetail` lives in `pos/accounts/plan-detail.ts:22` (`isPaid` at `:16`).
- `src/server/services/pos-service-boundaries.test.ts` freezes the exact runtime and type exports of both barrels (`:151-201`, `:203-226`, `:228-270`; asserted at `:367-368`, `:376-377`).
- Any new export goes red. The plan must decide where the reopen lives and add that test to the file list.
- Smallest option: a sibling of `settlePlanIfPaid` in `pos-accounts.service.ts` taking `tx`, with `accountRuntimeExports` updated.

**[Major] Lock-order statement is inaccurate.**
- Today the money transaction starts with the shift read (`:1898`), then identity (`:1903`), then wallets (`:1931-1936`).
- After slices 1 and 2 the order is: ticket FOR UPDATE, shift FOR SHARE, identity, wallets, plan FOR UPDATE.
- The delegated grep for `.for('update')` on `posTickets` finds only `pos.service.ts:2089`. It misses implicit row locks from plain UPDATEs on `pos_tickets`: `pos.service.ts:685`, `scheduling-bookings.service.ts:817`.
- It also misses the AFTER UPDATE trigger `pos_ticket_grant_update_guard_v1` (`supabase/migrations/20261003130000_pos_wallet_currency.sql:333-401`), which runs on the void's final UPDATE.
- I did not trace that trigger body or `pos-packages.service.ts` locks. The plan should state the order as fact instead of delegating it.

**[Major] Zero-row behaviour is undefined today.** The final UPDATE returns `.returning()` destructured as `[row]` (`:1897`, `:2034-2043`); zero rows yields `undefined`, not an error. Plan step 3 is right to add the throw; the stale comment at `:1966-1967` must change too.

**[Nit] Plan ids must be read in the transaction.** The preflight reads the lines (`:1872-1876`) but does not return them (`:1882`).

**`cancelPlan` zero-row mapping:** current order is `settled` throws, `cancelled` returns the row (`:387-388`). The plan's "re-reads and maps" matches.

**Reuse:**
- Extend `pos-money.sql.integration.test.ts` rather than creating `pos-void.sql.integration.test.ts`; the fixture and helpers are file-local.
- `paid(planId, amount)` (`:237-241`) already seeds instalment lines.
- `settlePlanIfPaid` (`pos-accounts.service.ts:408-433`) is the conditional-update pattern, as the plan says.
- Route tests: `src/routes/api/pos/tickets/[id]/void/server.test.ts`. `already_void` and `plan_settled` already map to 409 in `src/routes/api/pos/_errors.ts:26`, `:39`.

## Slice 2 — shift close

**Mechanics check out.** Under READ COMMITTED a waiter re-evaluates `status = 'open'` after the lock holder commits, so the loser gets no row and the existing `no_open_shift`. `closeShift` reads `paymentsByMethod` as a later statement (`:398`), so it sees a sale that committed while it waited.

**[Nit] FOR SHARE also lands on the void preflight.** `refundShift` is shared (`:1846-1851`, `:1855`). Harmless, but the plan says "inside the money transaction" only.

**[Major] Dialog details left open.**
- `startClose` has a third outcome the plan does not mention: no shift returned closes the modal and invalidates (`:212-217`). That must survive the `try/catch`.
- `pendingEmit` (`:199`, `:220`) is stale across opens exactly like `expected`; it needs resetting too.
- "Inline retry" UI is not specified.

**i18n reuse (no new keys needed for retry or loading):** `common_retry` (`messages/en.json:1261`), `common_loading` (`:1255`), `common_error` (`:1252`). Only the "totals could not be loaded" sentence is new; there is no `pos_shift_*` error key (`:3823-3831`, `:6807-6859`, `:6983-7002`).

**Tests to extend:**
- `src/server/services/pos.shifts.test.ts:442-517` (`closeShift` unit).
- `src/routes/api/pos/shifts/close/server.test.ts`.
- No `ShiftBanner` test exists. Mounted-test convention to copy: `src/lib/components/pos/payment-policy-recovery.mounted.test.ts` with `__fixtures__/PaymentPolicyRecoveryHarness.svelte`.

## Slice 3 — booking transitions

**Every writer of `schedBookings.status`:**

| Site | What |
|---|---|
| `scheduling-bookings.service.ts:525-533` | Insert, initial status (`:522`); creation log row `:577-581`. |
| `:1085-1087` | `setBookingStatusInTx`. |
| `:3113-3117` | `patchBooking` inline write. |
| `:2623-2627` | `addServiceToVisit` inserts with the lead's status if active. |

Other `update(schedBookings)` sites set no status: `:1129`, `:1303`, `:1484`, `:2070`, `:2390`, `:2503`, `:3047`. The same holds for `pos-accounts.service.ts:279` and the raw SQL at `party.service.ts:339`. I did not open `UpdateBookingInput` to prove `:3047`'s `set` can never carry status.

**Every caller:**

| Caller | Site |
|---|---|
| `setBookingStatusInTx` | `:1106` (`setBookingStatus`), `:1272` (`unscheduleVisit`). |
| `setBookingStatus` | `:1184` (`cancelBooking` loop). |
| | `reminders.service.ts:384`. |
| | `routes/api/scheduling/bookings/[id]/complete/+server.ts:43`. |
| | `routes/api/gateway/actions/booking-complete/+server.ts:56`. |
| | `routes/api/gateway/actions/booking-cancel/+server.ts:29`. |
| `cancelBooking` | `routes/api/scheduling/bookings/_handlers.ts:350`. |
| `patchBooking` | `_handlers.ts:358`. |
| `unscheduleVisit` | `routes/api/pos/appointments/[id]/unschedule/+server.ts:32`. |
| `applyBookingStatus` | `_handlers.ts:438` (PATCH), `:722` (visit walk). |

`routes/api/pos/appointments/[id]/complete/+server.ts` is a re-export of the scheduling handler (`:2`, `:10`). "Both complete routes" is one file.

**[Blocker] "The group endpoint already filters before writing" is false for ungrouped bookings.**
- `visitStatusResponse` builds `targets = groupId ? members.filter(eligible…) : [{ id, status: '' }]` (`_handlers.ts:695-697`).
- An ungrouped booking is never filtered and goes straight to `applyBookingStatus`.
- After slice 3 that path answers 409 where it succeeds today. That contradicts the plan's "unchanged" and the spec edge case.
- The plan must state the new answer for this case.

**[Major] Error convention is not what the plan assumes.**
- Scheduling routes do not return translated messages. `statusFailureResponse` returns `{ error: '<slug>', message, … }` with 409 for two known classes and otherwise `throw error(400, message)` (`_handlers.ts:401-418`).
- `rethrowPosError` maps `PosError` codes to `error(status, code)` (`routes/api/scheduling/_errors.ts:11-24`).
- Unknown service errors are plain `Error` and become 400.
- The server has no Paraglide use. The drawer prints `j.message` raw (`BookingDetailDrawer.svelte:489-490`), and `booking-mover` toasts `sched_status_failed` for any non-OK (`kit/booking-mover.ts:141-142`).
- FR-017 therefore needs a client mapping on `error === 'invalid_transition'`. The plan must fix the body shape and name the client sites.
- Reusable key: `sched_status_failed` (`messages/en.json:6733`).

**[Major] Caller-specific gaps.**
- Complete routes: the pre-check throws 400 today (`complete/+server.ts:41`, `booking-complete/+server.ts:55`). The plan says 409 without saying whether the pre-check or the thrown error is the source.
- `booking-complete`: `setBookingStatus` is outside any try (`:56`), so an unmapped throw is a 500.
- `booking-cancel`: catches everything as 400 (`:28-32`).
- `patchBooking` returns the row from its inline UPDATE (`:3113-3117`, `:3137`). `setBookingStatusInTx` returns `void`, so delegation needs a re-read. A row reader exists just above (`:3060-3067`).
- Today a same-status PATCH still bumps `updatedAt`. After delegation it will not.

**[Major] Transition table and unknown statuses.** `status` is free text. The plan does not say what `canTransitionBooking` returns for a `from` outside the six. I did not read the column DDL for a check constraint.

**[Major] Link clearing has consumers the plan does not mention.**
- `getBookingDetail` joins tickets through `pos_ticket_lines.booking_id` (`:3544`, `:2809`); a cancelled booking's drawer loses its ticket.
- `BookingReferencedError`'s `'ticket'` reference disappears (`:3155-3160`), so a cancelled paid booking becomes hard-deletable.
- `bookAndLinkTicketLine`'s stuck-line branch (`:791-795`) becomes dead for new data.
- Rows already stuck in production are not released; SC-004 holds only for future cancellations. The plan should either add a backfill or state that it is out of scope.

**[Major] "Integration" tests have no harness.** No `scheduling*.sql.integration.test.ts` exists; all scheduling service tests are mock-db. The plan must choose between building a real fixture and using mock-db with `captureUpdates` / `captureInserts` (`scheduling-bookings-unschedule.test.ts:46-85`).

**Reuse:**
- `ACTIVE_STATUSES` is exported (`scheduling-bookings.service.ts:105`). The whole table is `ACTIVE_STATUSES.includes(from)`.
- `eligibleForVisitStatus` (`_handlers.ts:562-569`) is an existing, stricter predicate; the two should not drift.
- `canTransition` (`src/server/hr/leave-rules.ts:94-98`) and its test (`leave-rules.test.ts:95-103`) are the pattern.
- The clear statement is `:1262-1266`.

**Tests to extend:**
- `scheduling-bookings-unschedule.test.ts`, `scheduling-bookings-update.test.ts` (`patchBooking`), `scheduling-bookings-ticket-link.test.ts`.
- `scheduling-bookings-visit.test.ts`, `scheduling-bookings-packages.test.ts`.
- `routes/api/scheduling/bookings/_handlers.test.ts`.
- `routes/api/scheduling/bookings/[id]/group/server.test.ts` and its POS twin.
- `routes/api/gateway/actions/actions.server.test.ts`.
- `routes/api/scheduling/_errors.test.ts`.
- There is no reminders service test and no complete-route test today.

## Slice 4 — client guards

**[Major] `m.cal_move_failed` does not exist and is not needed.**
- `sched_move_failed` ("Could not move the appointment", `messages/en.json:6219`) is already used for this exact failure by both hosts: `routes/(app)/pos/appointments/PageBody.svelte:579` and `routes/(app)/scheduling/calendar/PageBody.svelte:336`.
- `sched_cal_move_error` (`:4454`) also exists.
- T404's "one new message key" should become zero.

**[Major] Calendar details.**
- First drop path: `res` is read after the await (`BookingCalendar.svelte:2405`), so it must be declared outside the `try`.
- A third unguarded `await onmove` exists in `commitMerge` (`:2546-2547`). A throw leaves `mergeAsk` set and the rejection unhandled; the plan lists two paths.
- `clearOptimistic` is at `:2459-2468`.

**[Major] Drawer guard is narrower than invariant I6.** These writes also use `anchorId` / `detail` and stay live while B loads:
- Edit: `:1088`, `:1098`, `applyEdit` `:519-578`.
- Service rows: `:1157-1213`.
- Products: `:1246-1303`.
- Tags: `saveTags` `:359-381`.
- Notes: `:1547`.

Either widen FR-008 or narrow I6.

**[Nit] `detailIsCurrent` shape is right.** `visitAnchorId` returns `detail.visit?.members[0]?.id ?? detail.booking.id` (`src/lib/components/scheduling/visit.ts:226-231`), and `loadDetail` swaps to the lead (`BookingDetailDrawer.svelte:296-304`).

**Tests to extend:**
- No test mounts `BookingDetailDrawer`'s footer or `ConsumptionConfirmDialog`. Nearest: `booking-custom-fields.mounted.test.ts`, `consumption-lines.test.ts`.
- `BookingCalendar` is mounted in `calendar-reclassify.mounted.test.ts` (drop plus optimistic lane; closest to T403), `calendar-s4.mounted.test.ts` and `booking-calendar-lanes.mounted.test.ts`.
- `merge-target.test.ts:45` says the calendar "has no component-test harness"; that comment is stale.
- `kit/booking-mover.test.ts` covers the mover.
- `src/lib/routes/action-scope.test.ts:41` reads `BookingCalendar.svelte` source as text. I did not read its assertions; check before editing the drop paths.

## Slice 5 — ticket operation id

**Migration conventions.** Files are `supabase/migrations/<YYYYMMDDHHMMSS>_<snake>.sql`; latest is `20261112020000_notification_role_model_sources.sql`. The model is `20261003120000_pos_plan_operations.sql`: `ALTER TABLE public.pos_payment_plans ADD COLUMN operation_id uuid` (`:3-4`) and `CREATE UNIQUE INDEX pos_payment_plans_operation_uniq ON … (org_id, operation_id) WHERE operation_id IS NOT NULL` (`:11-12`).

**Schema.** `posTickets` is at `src/server/db/pg-pos-schema.ts:86-121`. The Drizzle model for the index is `:343-345`.

**How plans implement operation ids** (`src/server/services/pos/plan-operation.ts`):

| Piece | Location | Detail |
|---|---|---|
| Id parse | `:14-19` | zod uuid, lower-cased, throws `PosError('invalid_operation')`. |
| Actor | `:20-25` | `ctx.profileId`, not `input.actor.id`; throws `operation_actor_required`. |
| Lock | `:87-96` | `pg_advisory_xact_lock(hashtextextended(JSON.stringify(['pos-plan-operation-v1', orgId, operationId]), 0))`. |
| Admission | `:98-142` | Lock, tombstone check, lookup by `(orgId, operationId)`, then compare `createdBy` and `operationHash`. |
| Conflict | `:144-149` | `PosError('operation_conflict')`. |
| Columns | `pg-pos-schema.ts:331-336` | `operation_id`, `operation_hash`, `operation_version`, `operation_client_key`, plus check `:346-349`. |
| HTTP map | `routes/api/pos/_errors.ts:13-15` | `operation_conflict` 409, `operation_cancelled` 409, `operation_actor_required` 403. |

**[Blocker] Replay lookup placed "at the start of its transaction" is too late.** `submitTicket` runs these before the transaction opens at `:1534`:
- Policy revision check, `:1465`.
- `assertPlansUsable`, `:1492`.
- `assertRedemptionsUsable`, `:1493` — throws `redemption_already_billed` once the first submit stamped the session (`:1289-1290`).
- Stock shortfall preflight, `:1509-1531` — sees stock the first sale already consumed.

A replay of a committed sale with a session line, or of the last unit in stock, is refused before the lookup runs. The lookup must precede `:1465`, or the plan must state that these refusals are accepted.

**[Major] Decisions the plan leaves open.**
- "`lockPlanOperation` generalised or a sibling keyed `ticket:`" is a literal either/or.
- No request hash: plans refuse same-id-different-intent (`:130-135`); the ticket design returns the old ticket for a different cart.
- Actor: `ctx.profileId` versus `createdBy` from `input.actor.id` (`pos.service.ts:1605`). `created_by` is nullable (`pg-pos-schema.ts:109`).
- Replay response: the route returns 201 with `{ ok, ticket, stockWarning }` (`routes/api/pos/tickets/+server.ts:96`). Not stated: status code on replay, and whether `postTicketStock` (`:1714-1727`, idempotent per `:1019-1032`) and `settlePlanIfPaid` (`:1733-1739`) rerun.
- "Normal ticket read": `loadTicketRow` at `pos.service.ts:667`.
- Unique-violation backstop: `isUniqueViolation` is already exported; no mapping to `operation_conflict` is specified.
- Index name is not given.

**[Major] Two submit routes, not one.** `submitTicket` is called from `routes/api/pos/tickets/+server.ts:84` (schema `:34-44`) and `routes/api/gateway/actions/pos-sale/+server.ts:76` (schema `:26-38`). The plan must say whether the gateway action accepts an id.

**[Major] The attempt runner cannot do what the plan asks.**
- `runPaymentPolicyTicketAttempt` (`src/lib/components/pos/payment-policy-recovery.svelte.ts:186-219`) takes `{ recovery, paymentPolicyRevision, submit }`. It never sees the cart.
- The recovery object (`createPaymentPolicyRecovery`, `:49-163`) is an owner/generation fence: `captureAttempt`, `isAttemptCurrent`, `refreshAttempt`, `releaseAttempt`, `completeAttempt`.
- Its contract is the opposite of the plan: "A rejected ticket is never replayed" (`:44-46`), "No branch retries the supplied mutation" (`:183-184`).
- Cart and payments live in `PageBody.svelte` (`lines`, `payments`; request built at `:852-876`).
- The wire type `PosTicketRequest` and `submitPosTicket` are in `src/lib/components/pos/pos-ticket-transport.ts:1-17`, `:77-92`. Neither has an `operationId` field, and this file is missing from the plan's list.
- The plan must name where the id is stored, what "unchanged" compares, and that `charge(true)` ("charge anyway", `:934-936`) reuses or rotates it.

**[Major] Removing the HS-011 TODO overclaims.** The TODO asks for "a durable ticket idempotency key and freeze the submitted draft" (`PageBody.svelte:831-834`). An in-memory UUID is lost on reload, which is what a cashier does after a lost reply. The plan side solved this with persistence, a frozen cart and a lookup endpoint: `plan-open-persistence.ts`, `plan-open-operation.svelte.ts:503-672`, `routes/api/pos/plans/operations/[operationId]/+server.ts`. Keep the TODO, narrowed, or adopt that pattern.

**Tests and fixtures to extend:**
- `src/server/db/pg-pos-schema.test.ts:90-117` (see inventories below).
- `pos-money.sql.integration.test.ts` describe "native plan operation admission" (`:925-1166`) for same-id, other-actor and other-org cases; the fixture needs the new migration spliced in as at `:185-189`.
- `src/server/services/pos/plan-operation.test.ts`, `pos.tickets.test.ts`.
- `routes/api/gateway/actions/pos-sale/server.test.ts`.
- `src/lib/components/pos/pos-ticket-transport.test.ts`, `payment-policy-recovery.mounted.test.ts` with its harness.
- `sell-charge-handoff.test.ts`, `sell-session.mounted.test.ts`.
- There is no route test for `POST /api/pos/tickets`.

## Frozen inventories that go red

| Test | Trigger | Slice |
|---|---|---|
| `src/server/db/pg-pos-schema.test.ts:90-117` | Exact `pos_tickets` column list; add `operation_id`. | 5 |
| `src/server/services/pos-service-boundaries.test.ts:151-270` | Any new runtime or type export from `pos.service.ts` or `pos-accounts.service.ts`. Also asserts an acyclic import graph (`:307-347`). | 1, possibly 5 |
| `src/server/services/schema-catalog.test.ts` | Mentions `pos_tickets`; not read. | 5 |
| `src/server/db/rls-coverage.sql.integration.test.ts` | Column-only change should not trip it; not read. | 5 |
| `src/lib/routes/action-scope.test.ts:41` | Reads `BookingCalendar.svelte` source. | 4 |

- The spec's "no route-contract change" holds. The manifest is `src/lib/routes/route-design-manifest.ts` with `route-design-contracts.test.ts`, and no route is added.
- `src/lib/services/gateway/method-inventory.test.ts` is about gateway methods and is unaffected.
- I found no export inventory for `scheduling-bookings.service.ts`.
- `lint:optimistic` (`package.json:226`, `scripts/optimistic-controls.mjs`) is not in the plan's verification list. Slices 2 and 4 edit disabled and optimistic controls.

## Could not verify

- `scripts/` is not in the snapshot. That covers `scripts/qc/disposable-postgres` (how the disposable database is provisioned and which environment variables it requires), `optimistic-controls.mjs`, `design-lint.mjs` and `token-integrity.mjs`.
- Vitest config and CI workflows are absent, so "CI's Postgres lane" and which suites it runs are unconfirmed.
- `messages/es.json` is absent; only `en.json` keys were checked.
- `CLAUDE.md` is only `@AGENTS.md`; I did not find or read `AGENTS.md`.
- The meta ledger file `proposals/2026-10-02-hub-gateway-production-readiness-recon.md` was not read.
- Commit identity: `bb3b78f8` (spec) versus `21825676` (snapshot).
- Not read in depth: `pos-packages.service.ts` locking, the body of `pos_ticket_grant_update_guard_v1`, `sched_bookings` DDL, `UpdateBookingInput`, `action-scope.test.ts` and `schema-catalog.test.ts` assertions.
- Nothing was executed; all findings are static reads.