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

**Goal**: a sale issues stock for product lines only.

**Independent test**: mixed sale issues the product only; sell → schedule → complete issues the recipe once.

- [ ] T003 [US1] Add failing unit tests in `src/server/services/pos.tickets.test.ts`: (a) a sale with one unlinked `kind='service'` line with a recipe and one `kind='product'` line issues the product's items only; (b) a sale with only service lines creates no stock entry and stamps `stockEntryId = null`, `stockWarning = null`; (c) the availability preflight ignores service lines
- [ ] T004 [US1] Add a failing integration test in `src/server/services/scheduling-bookings-accrual.test.ts` (or its `*.sql.integration.test.ts` sibling, `HUB_TEST_DB_URL` only): sell an unscheduled service → `scheduleTicketLine` → complete ⇒ exactly one submitted issue for the recipe; no-show ⇒ none and the accrual is released
- [ ] T005 [US1] In `resolveIssueLines` (`src/server/services/pos.service.ts:750–772`) skip `kind === 'service'` lines in both the `finIds` filter and the loop; update the doc comment above `IssueResolution` ("Lines carrying a bookingId…") to state that service lines never issue from a sale
- [ ] T006 [US1] Add a unit test in `src/server/services/pos.tickets.test.ts` that voiding a sale with `stockEntryId = null` succeeds and stores no stock warning; fix `voidTicket` only if the test fails
- [ ] T007 [US1] Grep `src/` for readers that treat a missing `stockEntryId` on a service-only sale as an error or show a "post stock" prompt (`src/routes/(app)/pos/tickets/[id]/PageBody.svelte`, `src/routes/(app)/pos/sell/PageBody.svelte`); adjust so a service-only sale shows no stock prompt
- [ ] T008 [US1] Run in the foreground: the touched test files, `bun run check`, `bun run lint`; open the draft PR `fix(pos): a treatment's supplies leave stock once, when the appointment is completed`

**Checkpoint**: S1 merged and live before S2 is applied.

## Phase 4: User Story 2 — Past wrong deductions are given back (P1) — slice S2

**Goal**: owner-run repair, preview by default.

**Independent test**: preview equals research.md R3; after `--apply`, a second preview is empty.

- [ ] T009 [US2] Add failing unit tests in `src/server/services/pos.tickets.test.ts` for `repostTicketStock`: cancels the live entry, creates a new one from the current lines, restamps `stockEntryId`; a sale with no entry just posts; a void sale is refused with `already_void`; a cancel failure leaves the sale unchanged
- [ ] T010 [US2] Implement and export `repostTicketStock(ctx, ticketId, actor)` in `src/server/services/pos.service.ts`: `cancelEntry` the stamped entry → `stampTicketStock(null, null)` → `postTicketStock`; return `{ entryId, stockWarning }`
- [ ] T011 [US2] Write `scripts/repair-service-sale-stock.ts` per `contracts/api.md`: `--org` required; for each submitted sale with a live stock entry, compare the entry's lines with `resolveIssueLines` output; print sale, entry, item, issued now, issued after, difference; refuse (and list) any sale whose product-derived quantities would change; `--apply` calls `repostTicketStock`; exit 0 with an empty plan when nothing differs
- [ ] T012 [P] [US2] Add `scripts/repair-service-sale-stock.test.ts` for the pure planning function: a sale with service-issued items plans their return; an already-correct sale plans nothing; a product-quantity change is refused
- [ ] T013 [US2] Run the preview read-only against prod for the FACES org and attach the output to the PR; it must total HA Saypha Volume Plus 4, HA Saypha Volume 1, HA Saypha Filler 1, Dysport 690, Ácido Desoxicólico 18, and state which side the STE-2026-00500 Bioestimulador line falls on. Any other difference is investigated before the PR leaves draft
- [ ] T014 [US2] Open the draft PR `fix(stock): give back supplies that prepaid treatments removed at the sale`; body names the owner steps: confirm the two no-show syringes are on the shelf, run `--apply`, run the preview again (empty plan)

## Phase 5: User Story 3 — The agenda shows what was sold with the visit (P2) — slice S3

**Goal**: products on the hover card and a marker on the block.

**Independent test**: a visit charged with a zero-price product shows the marker and `1 × product (regalo)`.

- [ ] T015 [US3] Invoke the `ui-design-governance` skill before touching any `.svelte` file in this slice
- [ ] T016 [US3] Add a failing unit test next to the calendar ticket builder in `src/server/services/pos-accounts.service.ts` (the function returning `CalendarTicket`, near line 640–690): tickets return `products: { description, qty, total }[]` from `kind='product'` lines and `partyId`; void sales are excluded; no per-ticket query
- [ ] T017 [US3] Extend that builder with one grouped read of product lines for the window's ticket ids; add `products` (and `partyId` if absent) to `CalendarTicket` and to `CalendarInvoice` in `src/lib/components/scheduling/calendar-window.ts`
- [ ] T018 [US3] Add a pure helper `productsForVisit(memberIds, partyId, localDay, invoices)` in `src/lib/components/scheduling/calendar-window.ts` with a unit test: products of tickets that have a line on any member booking, plus products-only tickets of the same party on the same local day; merged across tickets
- [ ] T019 [US3] Render a "Productos" section in the hover card snippet in `src/routes/(app)/pos/appointments/PageBody.svelte` (near the existing services list): `qty × description`, with the gift label when `total === 0`; nothing when the list is empty
- [ ] T020 [US3] Add a small product marker to the calendar block for visits with products (the block component under `src/lib/components/scheduling/`), semantic tokens only, with an accessible label
- [ ] T021 [P] [US3] Add strings to `messages/es.json` and `messages/en.json` (`pos_calendar_products`, `pos_calendar_gift`, marker label); `bun run i18n:compile`
- [ ] T022 [US3] Run in the foreground: touched tests, `bun run check`, `bun run lint:design && bun run lint:tokens`; browser check on a QA sale with browser-harness on an isolated browser; open the draft PR `feat(pos): the agenda shows the products sold with a visit`

## Phase 6: User Story 4 — Swap a product on a validated sale (P3) — slice S4

**Goal**: same-price product swap with correct stock and no money movement.

**Independent test**: swap `Faja L` → `Faja M` at S/ 0; L +1, M −1, totals and payments unchanged, one audit row.

- [ ] T023 [US4] Add failing unit tests in `src/server/services/pos.tickets.test.ts` for `swapTicketLineProduct`, one per row of `contracts/api.md`: success; `not_found`; `already_void`; `line_not_product`; `price_differs` with both prices; `document_issued` (accepted emission in a non-beta environment; a beta one does not block); `negative_stock` naming the item; swapping back restores the original state; totals, payments and `humanId` unchanged
- [ ] T024 [US4] Implement `swapTicketLineProduct(ctx, ticketId, lineId, productId, actor)` in `src/server/services/pos.service.ts`: validate per data-model.md ("sale `submitted`; line `kind = 'product'`; new product active, different from the current one, same unit price; stock available for the new product's recipe"); update `fin_product_id` and `description` under a row lock on the line; `recordAudit` old → new product; then `repostTicketStock`
- [ ] T025 [US4] Add `src/routes/api/pos/tickets/[id]/lines/[lineId]/swap/+server.ts`: module `pos` enabled, `requireOrgCapability(locals, 'pos', 'edit')`, zod body `{ productId: uuid }`, `handlePosError`; map the new error codes in `src/routes/api/pos/_errors.ts`; register the route in the route contract manifest if the build step requires it
- [ ] T026 [US4] Add a route test beside the new `+server.ts`: 401 without a session, 403 without `pos:edit`, 409 bodies carry the fields the dialog needs
- [ ] T027 [US4] Invoke `ui-design-governance`; in `src/routes/(app)/pos/tickets/[id]/PageBody.svelte` add "Cambiar producto" on product lines of a non-void sale (hidden on service lines), opening a dialog that reuses the till's product picker; on `negative_stock` show the short item and keep the picker open; on success show the result through `createOptimistic()` and link the new stock movement
- [ ] T028 [P] [US4] Add strings to `messages/es.json` and `messages/en.json` for the action, dialog, each refusal and its next step; `bun run i18n:compile`
- [ ] T029 [US4] Run in the foreground: touched tests, `bun run check`, design gates; browser check on a QA sale; open the draft PR `feat(pos): swap a wrong product on a validated sale`

## Phase 7: User Story 5 — When a swap is not enough, the app does the correction with you (P3) — slice S5

**Goal**: "Anular y volver a cobrar" from the swap dialog.

**Independent test**: choose a replacement with a different price, accept; the sale is void and the till opens pre-filled.

- [ ] T030 [US5] Add failing tests in `src/lib/components/pos/sell-session.mounted.test.ts` (or a sibling for `sell-charge-handoff.ts`): a handoff line with `bookingId: null` is accepted (version 4), staged into the cart as an unlinked line, and version 3 blobs still parse
- [ ] T031 [US5] Extend `SellChargeLine`/`SellChargeLineInput` in `src/lib/components/pos/sell-charge-handoff.ts` to allow `bookingId: string | null`, bump `version` to 4, keep parsing 1–3
- [ ] T032 [US5] In the swap dialog (`src/routes/(app)/pos/tickets/[id]/PageBody.svelte`), on `price_differs` or `document_issued` show the explanation and the action "Anular y volver a cobrar"; on confirm: reuse the page's existing void flow (refund choice included), then stage the handoff with the sale's lines, the replacement applied, same party and customer name, and navigate to `/pos/sell`. Nothing is sent before the confirm
- [ ] T033 [US5] When the user lacks `pos:manage`, replace the action with the message that their role cannot void and name the role that can; no dead-end error
- [ ] T034 [P] [US5] Add strings to `messages/es.json` and `messages/en.json`; `bun run i18n:compile`
- [ ] T035 [US5] Browser check on a QA sale (void with refund, till pre-filled, charge again, visit shows paid once); run touched tests, `bun run check`, design gates; open the draft PR `feat(pos): void and re-ring a sale in one guided step`

## Phase 8: Polish

- [ ] T036 After each merge, verify prod from `origin/master` and the commit status `Vercel: success`, then run the slice's quickstart check as the QA user
- [ ] T037 After S1 is live, query prod read-only once a week for two weeks: no submitted sale has a stock entry containing items from a service line's recipe (SC-001)
- [ ] T038 Update the board stub `specs/2026-11-14-hub-till-corrections-spec.md` (`stage`, `status`, PR numbers) and the proposal status in `minion-meta` as slices merge; record any open end as `TODO(handoff)` plus a `proposals/` entry

## Dependencies

- S1 → S2 (the repair relies on the new rule being live).
- S2 (T010) → S4 (T024).
- S4 (T027) → S5 (T032).
- S3 is independent and can run in parallel with S2.

## Parallel opportunities

- T012 with T011's review; T021, T028, T034 (message files) with their slice's code; S3 alongside S2.

## Implementation strategy

MVP = S1 alone: it stops new wrong deductions. S2 makes the counts right. S3, S4, S5 follow in that order.

## Owner tasks

- Approve `spec.md` before code.
- Merge each PR.
- S2: confirm the two no-show syringes are on the shelf; run `--apply`; run the preview again.
