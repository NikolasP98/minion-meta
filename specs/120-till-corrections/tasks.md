# Tasks: Till corrections

**Input**: `specs/120-till-corrections/` (spec.md, plan.md, research.md, data-model.md, contracts/api.md, quickstart.md)

**Repo**: `minion_hub`, PR base `master`, one PR per slice. All paths below are in that repo.
Tests are written before the code they prove, in the same slice.

**Gate before any code**: the owner approves `spec.md` (tagged `data`).

## Phase 1: Setup

- [ ] T001 Create a clean hub clone at `~/.cache/claude-tmp/hub-till` from `origin/master` (never the owner's local checkout); copy `user.*`/`gpg.*` config, `commit.gpgsign true`; `bun install --frozen-lockfile`, `bunx svelte-kit sync`, `bun run i18n:compile`
- [ ] T002 Check whether spec 116 (`spec/116-pos-booking-state-hardening`) has merged to hub `master`; if so, re-read `src/server/services/pos.service.ts` lines around `resolveIssueLines`, `postTicketStock`, `voidTicket` before starting

## Phase 2: Foundational

None. Each slice is self-contained; S2 and S4 share one function, created in S2.

## Phase 3: User Story 1 — Supplies leave stock when the treatment is done, once (P1) — slice S1

**Goal**: the sale decides by kind; the reservation covers the line quantity; the retry heals.

**Independent test**: mixed sale issues the product only; sell → schedule → complete issues the recipe once, for the full quantity.

- [ ] T003 [US1] Rewrite the tests in `src/server/services/pos.tickets.test.ts` that encode the old rule ("product and service both via stk_consumption", the 0-qty usage mapping case, the uom preflight cases that use an unlinked `kind: 'service'` line) and add failing ones: (a) unlinked service line with a recipe + product line → product items only; (b) service-only sale → no stock entry, `stockEntryId = null`, `stockWarning = null`; (c) product line WITH a `bookingId` issues; (d) unlinked service line with `redemptionId` issues as today; (e) bundle service line issues as today; (f) the availability preflight ignores lines that do not issue
- [ ] T004 [US1] Add a failing unit test in `src/server/services/scheduling-bookings-ticket-link.test.ts`: `bookAndLinkTicketLine` on a line with `qty = 3` calls `accrueConsumption` with `quantity: 3`
- [ ] T005 [US1] Add a failing integration test (`*.sql.integration.test.ts`, `HUB_TEST_DB_URL` only) beside `src/server/services/scheduling-bookings-accrual.test.ts`: sell an unscheduled service → `bookAndLinkTicketLine` → complete ⇒ exactly one submitted issue for the recipe; no-show ⇒ none and the accrual is `released`
- [ ] T006 [US1] In `resolveIssueLines` (`src/server/services/pos.service.ts:750–772`): product lines issue regardless of `bookingId`; service lines issue only when `!bookingId` and (`redemptionId` set or the product is a bundle); load bundle membership with one query for the lines' product ids (reuse the `is_bundle` expression near `pos.service.ts:2503`); rewrite the doc comment above `IssueResolution`
- [ ] T007 [US1] In `bookAndLinkTicketLine` (`src/server/services/scheduling-bookings.service.ts:747–850`) select the line's `qty` and pass it through `accrueForBooking` as `quantity`; other `accrueForBooking` callers keep the default
- [ ] T008 [US1] In `postTicketStock` (`src/server/services/pos.service.ts:1019–1026`) load the stamped entry's status; when it is `cancelled`, continue as if no entry were stamped; add the unit test first
- [ ] T009 [US1] Add a unit test that voiding a sale with `stockEntryId = null` succeeds with no stock warning (expected to pass without code)
- [ ] T010 [US1] Grep `src/` for UI that prompts to post stock or shows a stock warning on a sale without a movement (`src/routes/(app)/pos/tickets/[id]/PageBody.svelte`, `src/routes/(app)/pos/sell/PageBody.svelte`); a service-only sale must show neither
- [ ] T011 [US1] Run in the foreground: the touched test files, `bun run check`, `bun run lint`; open the draft PR `fix(pos): a treatment's supplies leave stock once, when the appointment is completed`

**Checkpoint**: S1 merged and live before S2 is applied.

## Phase 4: User Story 2 — Past wrong deductions are given back (P1) — slice S2

**Goal**: rebuild operation and owner-run repair, preview by default.

**Independent test**: preview equals spec A4; after `--apply`, a second preview is empty.

- [ ] T012 [US2] Add failing unit tests in `src/server/services/pos.tickets.test.ts` for `repostTicketStock`, one per step of plan.md "Rebuild sequence": void sale → `already_void`; item outside `allowedItems` differs → `stock_drift` and nothing changes; any increase → `stock_drift`; stamp changed since read → `operation_conflict`; cancel fails → stamp restored; post fails → sale keeps a warning and a retry completes; success → new entry stamped, old one cancelled; sale with no live entry → refused `no_stock_entry` (never posts)
- [ ] T013 [US2] Implement and export `repostTicketStock(ctx, ticketId, actor, opts: { allowedItemIds: Set<string>; allowIncreaseItemIds?: Set<string> })` in `src/server/services/pos.service.ts` per the sequence; add a pure `planRepost(oldLines, newLines, opts)` that compares in stock units (use the same conversion `checkStockShortfalls` uses)
- [ ] T014 [US2] In `voidTicket` (`src/server/services/pos.service.ts:1827`), after the void commits, call `findEntryBySource(ctx, 'pos', id)` and cancel a live entry if one exists; unit test: a movement stamped after the void's first read is cancelled; leave `TODO(handoff)` for the residual window named in plan.md Risks and add it to `proposals/` in `minion-meta`
- [ ] T015 [US2] Write `scripts/repair-service-sale-stock.ts` per `contracts/api.md`: `--org <id>` required; candidates = submitted sales with a live `pos` movement and a treatment line whose recipe shares an item with it; print sale, movement, item, quantity now, quantity after, difference (stock units); list refused and skipped sales with the reason; `--apply` calls `repostTicketStock` with `allowedItemIds` = the items of that sale's treatment recipes; exit 0 with an empty plan when nothing differs
- [ ] T016 [P] [US2] Add `scripts/repair-service-sale-stock.test.ts` for the candidate filter and the plan output: treatment items planned for return; already-correct sale plans nothing; a product-item change is refused; a sale with no live movement is skipped
- [ ] T017 [US2] Run the preview against prod read-only (connection string from `minion_hub/.env.local`, port 5432, `default_transaction_read_only=on`) for org `21e0601b-f632-43fd-8414-d644af4271f4`; attach the output to the PR. Pass = totals of HA Saypha Volume Plus 4, HA Saypha Volume 1, HA Saypha Filler 1, Dysport 690, Ácido Desoxicólico 18 and no refused sale; Bioestimulador either absent or listed as a product-line item that stays. Anything else keeps the PR in draft until explained
- [ ] T018 [US2] Open the draft PR `fix(stock): give back supplies that prepaid treatments removed at the sale`; the body lists the owner steps: confirm the two no-show syringes are on the shelf, run `--apply`, run the preview again (empty plan), count the five items on the shelf (SC-002)

## Phase 5: User Story 3 — The agenda shows what was sold with the visit (P2) — slice S3

**Goal**: products on the hover card and a marker on the block.

**Independent test**: a visit charged with a zero-price product shows the marker and `1 × product (regalo)`, also when the sale was made in an earlier week.

- [ ] T019 [US3] Invoke the `ui-design-governance` skill before touching any `.svelte` file in this slice
- [ ] T020 [US3] Add a failing unit test for `bookingTicketLinks` in `src/server/services/pos-accounts.service.ts` (near line 598): each linked non-void ticket returns `products: { description, qty, total }[]` from its `kind='product'` lines, whether those lines are linked to the visit or not; a sale submitted outside the calendar window is included; one query for all tickets
- [ ] T021 [US3] Implement it; add `products` to `CalendarBooking.tickets` in `src/lib/components/scheduling/calendar-window.ts`
- [ ] T022 [US3] Add a pure helper `productsForVisit(members)` in `src/lib/components/scheduling/calendar-window.ts` with a unit test: merges the products of the distinct tickets of all members of a visit, each ticket counted once
- [ ] T023 [US3] Render a "Productos" section in the hover card snippet in `src/routes/(app)/pos/appointments/PageBody.svelte` (after the services list): `qty × description`, plus the gift label when `total === 0`; nothing when empty
- [ ] T024 [US3] Add a product marker to the calendar block component used by `/pos/appointments` (find it from the `BookingCalendar` import in that page) for visits where `productsForVisit` is non-empty: an existing icon from the icon set, semantic tokens only, `aria-label` from messages
- [ ] T025 [P] [US3] Add `pos_calendar_products`, `pos_calendar_gift`, `pos_calendar_products_marker` to `messages/es.json` and `messages/en.json`; `bun run i18n:compile`
- [ ] T026 [US3] Run in the foreground: touched tests, `bun run check`, `bun run lint:design && bun run lint:tokens`; browser check with browser-harness on an isolated browser as the QA user; open the draft PR `feat(pos): the agenda shows the products sold with a visit`

## Phase 6: User Story 4 — Swap a product on a validated sale (P3) — slice S4

**Goal**: swap to a product of the same catalogue price, correct stock, no money movement.

**Independent test**: swap `Faja L` → `Faja M` on a S/ 0 line; L +1, M −1, totals and payments unchanged, one audit row.

- [ ] T027 [US4] Add failing unit tests in `src/server/services/pos.tickets.test.ts` for `swapTicketLineProduct`, one per row of `contracts/api.md` (success, `not_found`, `ticket_void`, `line_not_product`, `line_changed`, `negative_stock`, `price_differs`, `emitted` for a non-beta accepted emission while a beta one passes, `stock_drift`, `period_locked`, `reconciled`, `operation_conflict`), plus: swap back restores the original stock; the line's `unitPrice`, `discount`, `total`, the sale totals, payments and `humanId` are unchanged; a linked line updates the matching `sched_booking_products` row
- [ ] T028 [US4] Implement `swapTicketLineProduct(ctx, ticketId, lineId, { productId, expectedProductId }, actor)` in `src/server/services/pos.service.ts`: guards through `assertTicketMutable` (`src/server/services/pos/tender-correction.ts:26`) with `emitted` = any emission that is not `error` and not `environment = 'beta'`, `fiscal: true`; "new product active, different from the current one"; catalogue unit price of the new product equals that of the old product; stock available for the new product's recipe; conditional line update `where fin_product_id = expectedProductId`; update `sched_booking_products` when the line has a `bookingId`; `recordAudit` (refType `pos_ticket_line`, old → new product); then `repostTicketStock` with `allowedItemIds` = items of both products' recipes and `allowIncreaseItemIds` = the new product's items
- [ ] T029 [US4] Add `src/routes/api/pos/tickets/[id]/lines/[lineId]/swap/+server.ts`: module `pos` enabled, `requireOrgCapability(locals, 'pos', 'edit')`, zod body `{ productId: uuid, expectedProductId: uuid }`, `handlePosError`; add the new codes to `src/routes/api/pos/_errors.ts`; run the route contract build step and register the route if it fails without it
- [ ] T030 [US4] Add a route test beside it: 401 without a session, 403 without `pos:edit`, 409 bodies carry the fields in `contracts/api.md`
- [ ] T031 [US4] Invoke `ui-design-governance`; in `src/routes/(app)/pos/tickets/[id]/PageBody.svelte` add "Cambiar producto" on product lines of a non-void sale (absent on treatment lines), opening a dialog that reuses the till's product picker filtered to active products; each refusal shows its reason and the next step from `contracts/api.md`; on success show the change optimistically (the hub's `createOptimistic()` helper), link the new stock movement, and show "Cambiado de X a Y por <name>, <date>" from the audit row on the line
- [ ] T032 [P] [US4] Add the strings to `messages/es.json` and `messages/en.json`; `bun run i18n:compile`
- [ ] T033 [US4] Run in the foreground: touched tests, `bun run check`, design gates; browser check on a QA sale; open the draft PR `feat(pos): swap a wrong product on a validated sale`. Until S5 ships, the three "guided correction" refusals tell the user to void the sale from the agenda and charge again

## Phase 7: User Story 5 — When a swap is not enough, the app does the correction with you (P3) — slice S5

**Goal**: "Anular y volver a cobrar" from the swap dialog.

**Independent test**: choose a replacement with a different catalogue price, accept; the sale is void and the till opens pre-filled at the charged prices.

- [ ] T034 [US5] Add failing tests for `src/lib/components/pos/sell-charge-handoff.ts` (extend `src/lib/components/pos/sell-session.mounted.test.ts` or a sibling): version 4 lines carry `unitPrice`, `discount` and `bookingId: string | null`; staging uses them instead of the catalogue price; a zero-price gift stays at zero; versions 1–3 still parse and behave as before
- [ ] T035 [US5] Implement handoff version 4 in `src/lib/components/pos/sell-charge-handoff.ts`
- [ ] T036 [US5] Extract the void action with refund choice from `src/routes/(app)/pos/appointments/PageBody.svelte` (around 844–847) into a shared component under `src/lib/components/pos/`; the agenda page uses the extracted component with no behaviour change (existing tests stay green)
- [ ] T037 [US5] In the swap dialog, on `price_differs`, `emitted` or `stock_drift`, show the explanation and "Anular y volver a cobrar"; on confirm run the extracted void, then stage a version 4 handoff with the sale's lines (charged price, discount, appointment id, replacement applied), same party and customer name, and go to `/pos/sell`. Nothing is sent before the confirm. Each void refusal (`no_open_shift`, `period_locked`, `reconciled`, `package_in_use`) shows its reason and next step and leaves the sale untouched
- [ ] T038 [US5] Without `pos:manage`, show that the user's role cannot void and name the roles that can (read from the org's roles holding `pos:manage`); no dead-end error
- [ ] T039 [P] [US5] Add the strings to `messages/es.json` and `messages/en.json`; `bun run i18n:compile`
- [ ] T040 [US5] Browser check on a QA sale: void with refund, till pre-filled at charged prices, charge again, visit shows paid once and its supplies are not deducted twice; one void refusal path; leaving the till keeps the pre-filled sale. Run touched tests, `bun run check`, design gates; open the draft PR `feat(pos): void and re-ring a sale in one guided step`

## Readiness decisions (EGM stage 9, 2026-11-14) — these override the task text above

**S1**
- T003 + T006 are one step. The bundle lookup runs only when the sale has an unlinked service line with no `redemptionId`; it reads `finProductComponents` for those product ids (same table `resolvePackageSpecs` reads, `pos.service.ts:1161–1193`). Sales without such a line add no query, so their mock sequences stay as they are. `src/server/services/pos.packages.test.ts` (137, 195, 276) has the same sequences and is updated in the same step.
- T004: the `accrueConsumption` mock in `scheduling-bookings-ticket-link.test.ts:38` must forward its arguments, and the preamble line row gains `qty`.
- T005 is replaced: no new database harness. The sell → schedule → complete proof is the mocked unit tests of T003/T004 plus the quickstart check on the QA sale after deploy (T041).
- T007: `quantity` applies to the default-recipe path only. When the scheduling dialog sends adjusted `consumption` lines they are taken as given (they are what staff typed). `qty` is a numeric string; convert with `Number`.
- T008: import `getEntry` (`stock.service.ts:621`) and add it to the mocks of both test files; a `null` result is treated like a cancelled entry.

**S2**
- T013 splits: (a) exported read-only `previewTicketRepost(ctx, ticketId)` returning `{ oldByItem, newByItem }` in stock units (sum by item; convert with `consumptionToStockQty`, `stock.logic.ts:424`, loading `unitsPerStockUom` for the items involved) and the pure `planRepost(oldByItem, newByItem, opts)` with a tolerance of 0.0001; (b) claim, cancel, post. The claim is a new conditional update, not `stampTicketStock`. When the cancel fails the stamp is restored with the warning it had before.
- T012: `no_stock_entry` is added as step 1b of the sequence (a sale with no live movement is refused, never posted). T008 comes before T012.
- T014: the void's final lookup is wrapped in try/catch, ignores drafts and an entry already cancelled, skips when the void already recorded `void_stock_failed` for the same entry, and writes its own warning with a separate update. It never turns a committed void into an error response.
- T015/T016 depend on `previewTicketRepost` only. `--apply` runs as actor `{ id: null, name: 'repair-120' }`. Script context follows `scripts/stock-optional-fields-to-custom.ts:268`.

**S3** (EGM stage 9, second pass, 2026-11-14)
- T020: one additional statement, `ticket_id in (linked ticket ids) and kind = 'product'`, skipped when no ticket is linked. Two statements per window at most, whatever the number of appointments. `qty` and `total` are numeric strings; convert with `Number`. New test file `src/server/services/pos-accounts-booking-links.test.ts`.
- T021: `products` is required on the server type and optional on `CalendarBooking.tickets`; readers use `?? []`. No existing fixture changes.
- T022: `productsForVisit(members: ReadonlyArray<Pick<CalendarBooking, 'tickets'>>)`; each ticket counted once; cancelled and no-show members count (their sale is still live). One row per sale line, no merging. A sale that charged two separate visits shows on both.
- T023: there is no hover-card snippet in the POS page. The section goes into both default cards of the shared `src/lib/components/scheduling/BookingCalendar.svelte` (`defaultBookingCard`, `defaultVisitCard`), rendered only when the list is non-empty. It is a fixed section, not a new hover field. The scheduling calendar receives `tickets: []`, so it shows nothing there.
- T024: the block is inline in the same file. The marker goes on the time-grid block only; month chip, agenda row, table and board do not get it.
- T025 runs before T023/T024 (the code calls the compiled messages). Texts: `pos_calendar_products` "Productos" / "Products"; `pos_calendar_gift` "regalo" / "gift"; `pos_calendar_products_marker` "Con productos" / "Has products". Row format `1 × Faja L (regalo)`; a line is a gift when its total is 0.
- The component cannot be mounted in tests (`BookingCalendar.svelte:2086`). Proof = `productsForVisit` unit test plus a browser check.
- Owner rule (FigCraft demo first): T023/T024 wait for the owner to validate the as-is/to-be demo. T020–T022 and T025 do not.

**S4** (EGM stage 9, 2026-11-14)
- Order: every refusal is checked before the line changes. The sale's stock is previewed unchanged first (`planRepost` with no allowed item; any difference is `stock_drift`). If the rebuild still fails after the line changed (a void or another correction won the race), the line and the visit's product row are put back and the error is returned.
- A sale with no stock movement: when neither product resolves to a stock item, the line is swapped and the rebuild is skipped; when either does, the swap is refused `stock_drift`.
- `negative_stock` is a preflight on the replacement's items (`checkStockShortfalls`), skipped when there is no default warehouse. An item both products consume is not netted out.
- `sched_booking_products`: the row moves to the new product; when the visit already carries it, the old row is deleted (unique per visit).
- The replacement must be active and `kind = 'product'`. A line with modifiers is refused `stock_drift`.
- "Document" for the guard: status other than `error` and environment other than `beta`. `assertTicketMutable` is unchanged; the caller computes the flag.
- Audit: `recordAuditInTx`, refType `pos_ticket`, refId the sale, field `line.<lineId>.product`.
- The error body carries code and message only; the contract's extra fields are not sent.
- Statuses: `period_locked` 423; `line_changed`, `line_not_product`, `price_differs`, `stock_drift`, `no_stock_entry`, `negative_stock` 409.
- UI (T031) waits for the owner's decision on the FigCraft demo. It also needs the stock warning and a link to the stock movement on the sale page, which exist only on the sell page today.

## Phase 8: Polish

- [ ] T041 After each merge, verify prod from `origin/master` and the commit status `Vercel: success`, then run the slice's quickstart check as the QA user
- [ ] T042 After S1 is live, once a week for two weeks, query prod read-only: every completed appointment with a recipe has exactly one submitted `booking`-sourced issue, and no `pos`-sourced movement after the release contains an item that only a treatment line of its sale consumes (SC-001)
- [ ] T043 File the follow-up proposals named in spec "Out of scope" in `minion-meta` `proposals/` (products-only sales on the agenda; quantity above 1 charged from an appointment; one live movement per sale constraint)
- [ ] T044 Update the board stub `specs/2026-11-14-hub-till-corrections-spec.md` (`stage`, `status`, PR numbers) and the proposal status in `minion-meta` as slices merge; record any open end as `TODO(handoff)` plus a `proposals/` entry

## Dependencies

- S1 → S2 (the repair relies on the new rule being live).
- S2 (T013) → S4 (T028).
- S4 (T031) → S5 (T037).
- S3 is independent and can run in parallel with S2.

## Parallel opportunities

- T016 with T015; T025, T032, T039 (message files) with their slice's code; S3 alongside S2.

## Implementation strategy

MVP = S1 alone: it stops new wrong deductions. S2 makes the counts right. S3, S4, S5 follow in that order.

## Owner tasks

- Approve `spec.md` before code.
- Merge each PR.
- S2: confirm the two no-show syringes are on the shelf; run `--apply`; run the preview again; count the five items on the shelf.
