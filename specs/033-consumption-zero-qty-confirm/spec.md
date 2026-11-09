# Feature Specification: Zero-quantity consumption is saved, asked for, and never booked

**Feature Branch**: `spec/033-consumption-zero-qty-confirm` (meta) · hub slices `fix/consumption-zero-qty-s1|s2|s3` → `master`
**Created**: 2026-10-22
**Status**: Draft — **security/data tag** (changes stock quantities): owner approves the spec AND merges every slice.
**Input**: Prod FACES report (2026-10-22, Spanish): "hola, valide esto uno es control botox pero no me aparece para ingresar la cantidad". Owner: "I'd expect to get the consumption confirmation, even if ingredient item is equal to zero."

## AS-IS (evidence)

Visit group `f4fecc5e-a0e2-4d99-af40-e45c95e48317` (FACES prod, 2026-10-21): two `sched_bookings` — `Control` (CONT) and `Control Botox` (CB = `fin_products 87711000-c199-435c-8792-da1837114fd7`) — both set `completed` 0.7 s apart by the visit status chip. For CB there are **zero** `stk_consumption`, **zero** `stk_accruals` and **zero** `doc_audit_log` rows. The other botox services map Dysport at 30–180 UN. The 15 UN actually used that day are not in the ledger.

All anchors are `minion_hub` `origin/master` @ `c4ded7f7`.

### Defect 1 — a 0-quantity usage row cannot be saved
- `src/lib/components/pos/SellableWizard.svelte:425` `consumptionPayload()` filters `Number(r.qtyPerUnit) > 0`, so a row typed as `0` is silently dropped from the replace-set and the mapping never exists (that is why CB has no `stk_consumption` row).
- Server agrees: `src/server/services/stock.service.ts:1239` `setConsumption` throws `invalid_qty` unless `qtyPerUnit > 0`; `src/routes/api/stock/consumption/+server.ts:13` and `[id]/+server.ts:11` use zod `.positive()`.
- `src/routes/api/pos/sellables/+server.ts:12` and `[id]/+server.ts:12` accept `qtyPerUnit: z.number().finite()` — a **negative** passes the route and is only refused later by `setConsumption`, after the product row has already been written (`pos.service.ts:2852-2869` runs after the product update).
- `stock.service.test.ts:649-655` pins the current rule: `qtyPerUnit: 0` ⇒ `invalid_qty`.

### Defect 2 — completing from a status chip skips the confirmation dialog
- `BookingTable.svelte:76-82` (status cell) and `BookingBoard.svelte:119-128` (drag to the Completed column) call `onstatus`/`onvisitstatus`.
- Both host pages bind those straight to the mover: `src/routes/(app)/pos/appointments/+page.svelte:1123-1124,1137-1138` and `src/routes/(app)/scheduling/calendar/+page.svelte:431-432,445-446` → `booking-mover.ts:140-154` `setStatus` (PATCH `{status}`) / `setVisitStatus` (POST `…/group {status}`).
- Server: `src/routes/api/scheduling/bookings/_handlers.ts:528-535` routes a `{status}` group body to `visitStatusResponse`, which walks every member (`:661-676`) through `applyBookingStatus`, which on `completed` calls `realizeAccruals` **as-is** (`:337-349`) — the 0.7 s gap in the evidence is that member walk. No dialog, no confirmation.
- Only two surfaces already confirm: the explicit Completar button (`pos/appointments/+page.svelte:1251` → `ConsumptionConfirmDialog`, instance `:1379-1386`) and the drawer's "Marcar completada" (`BookingDetailDrawer.svelte:1675` → `completeOpen` → dialog `:1730-1757`). The scheduling calendar page has **no** `ConsumptionConfirmDialog` at all.
- `BookingsView.svelte:121-175,405-449` (`/scheduling/bookings` list and `/crm/[contactId]`) still carries a **third** modal copy (`cdLines`/`completeBooking`): `openComplete` one-click-completes when the accrual summary shows `open === 0` (`:129-131`) — exactly the 0-mapping case — and its `completeBooking` drops `qtyConsumption <= 0` lines and sends `null` (`:157-168`). The TODO(handoff) at `ConsumptionConfirmDialog.svelte:25-30` already names it.
- `pos/appointments/+page.svelte:594-602` `completeMembers()` does not exclude cancelled/rejected siblings; the drawer does (`:1736-1737`) because `/complete` answers 400 for them (`[id]/complete/+server.ts:41`). Unreachable today ("not from today's UI", `:589-593`); reachable once chips route to the dialog.

### Defect 3 — confirming "0 used" books the full default
- `src/lib/components/scheduling/consumption-lines.ts:50-60` `completionLines` drops `actual <= 0` rows and returns `null` when none remain; `consumption-lines.test.ts:38-50` pins both behaviours.
- `src/routes/api/scheduling/bookings/[id]/complete/+server.ts:46-55` forwards `lines: b.lines ?? null`; `stock-accruals.service.ts:365-371` `realizeAccruals` treats `input.lines?.length` falsy as "issue the open accruals as-is". So a user who drags every gauge to 0 and confirms realizes the **full accrued default**.
- Zod on the complete routes (`[id]/complete/+server.ts:11-23`, `gateway/actions/booking-complete/+server.ts:9-23`) accepts an empty array (`.array(...)` without `.min(1)`), so `lines: []` is already a valid body; the server just cannot tell it apart from `null`.

### Downstream readers that multiply `qty_per_unit` (must tolerate 0 once it can be stored)
| Reader | Anchor | Today with a 0 row |
|---|---|---|
| Booking accrual, defaults path | `stock-accruals.service.ts:104-116` | writes a `stk_accruals` row with `qty=0`, `est_value=0` (the `lines` path at `:101` already filters `> 0`) |
| Service / invoice / accrual preview | `stock.service.ts:1483-1542` `previewLinesForItemQtys` (funnel for `buildServiceIssuePreview:1597`, `buildInvoiceIssuePreview:1361`, `buildAccrualPreview`) | emits a `qty=0` preview line; gateway `stock-issue-from-service/+server.ts:56` and `stock/entries/from-invoice/+server.ts:45` post those lines back ⇒ `createIssueFromInvoice:1886` throws `invalid_line`; `createServiceIssue` inserts the 0 line and `submitEntry:873` (`validateEntryLine:92` "qty must be > 0") refuses the **whole** entry |
| POS sale stock post | `pos.service.ts:742-746` `explodeLineForIssue`, `:776-785` `resolveIssueLines` → `createSourcedIssue:1099` | a 0 line reaches the entry and `submitEntry` rejects the whole ticket's stock post |
| Recipe availability | `pos.service.ts:807` `if (!(needed > 0)) continue` | already tolerant |
| Completion dialog | `ConsumptionConfirmDialog.svelte:96-138` | reads open accruals; falls back to the defaults map **only when a member has no accrual at all** |

## TO-BE

A service may declare that it uses an ingredient in a quantity decided at the chair (default 0). Completing that service — from any surface — asks for the quantity. A confirmed 0 books nothing. A stored 0 never produces a zero-quantity accrual, preview line, POS issue line or ledger line.

### Invariants
- **I1** `stk_consumption.qty_per_unit` ∈ [0, ∞). Negative and non-finite are refused at every entry point (routes and service) **before** any product write.
- **I2** No code path creates an `stk_accruals` row, an `stk_entry_lines` row, or a preview line with `qty <= 0` from a mapping. A product whose mappings are all 0 behaves like an unmapped product everywhere except the completion dialog.
- **I3** Every UI transition of a booking (or visit) to `completed` opens `ConsumptionConfirmDialog` first. Direct API clients (`PATCH {status}`, `POST …/group {status}`, gateway `booking-complete`) keep today's contract.
- **I4** `/complete` body contract: `lines` **absent or `null`** = "no confirmation given: realize the open accruals as-is" (legacy, retry button, API agents); `lines: []` = "the user saw this member's rows and confirmed nothing was used": release that member's open accruals, create no entry, answer `{ ok: true, entryId: null, stockWarning: null }`; non-empty = issue exactly those lines (unchanged).
- **I5** The dialog shows one row per mapped item of every member — the union of that member's open accruals and the service's current defaults map, keyed by item, accrual winning — so a 0-default item is asked for even when a sibling item accrued.
- **I6** Cancelling the dialog leaves the booking status unchanged on the table, board and calendar.

Why `[]` and not a flag: the body already admits an empty array, both complete routes and the gateway share `realizeAccruals`, and `null` must keep meaning "as-is" for the retry-post button and the agent action. One branch in `realizeAccruals` is the whole server change; no new field, no new endpoint. The alternative — storing a 0 accrual row so the dialog "finds" it — was rejected: it violates I2, adds `open` noise to every accrual rollup and list badge, and still needs the `[]` contract.

Why the dialog unions defaults instead of relying on a 0 accrual row: `loadRows` already does both reads; merging them is the smallest change that satisfies I5 and keeps I2.

## User Scenarios & Testing

### US1 — Owner maps "Control Botox" to Dysport at 0 (P1)
1. **Given** the sellable editor with a Dysport usage row typed `0`, **When** the row saves, **Then** `stk_consumption` holds `qty_per_unit = 0` and the editor re-opens showing the row.
2. **Given** the same row typed `-1`, **When** saved, **Then** the API answers 400 and nothing is written.
3. **Given** a blank quantity cell, **When** saved, **Then** the row is skipped as today (blank ≠ 0).

### US2 — Staff complete the visit from the status chip and are asked (P1)
1. **Given** a visit `Control` + `Control Botox` (Dysport default 0) and the bookings table, **When** staff set the visit status to Completada from the status cell, **Then** the confirmation dialog opens with a Dysport row at 0 under "Control Botox"; nothing has been completed yet.
2. **Given** the dialog, **When** staff enter 15 and confirm, **Then** both bookings are `completed`, one issue entry of 15 UN Dysport is posted, the Dysport accrual (if any) is realized, and the table shows the realized badge.
3. **Given** the dialog, **When** staff cancel, **Then** both bookings keep their previous status (I6).
4. Same from the board (drag to Completada), on `/pos/appointments` and `/scheduling/calendar`, and from the Complete button on `/scheduling/bookings` and the CRM contact page.

### US3 — Staff confirm that nothing was used (P1)
1. **Given** a booking whose service accrued 30 UN, **When** staff drag the gauge to 0 and confirm, **Then** the booking is `completed`, the accrual is `released`, no entry exists, and no stock warning shows.
2. **Given** a visit where member A's rows are all 0 and member B had no rows, **When** confirmed, **Then** A's accruals are released and B is completed as-is (null contract).

### US4 — A 0 mapping is invisible to stock writers (P2)
1. **Given** a product mapped only at 0, **When** booked, **Then** no accrual row is written.
2. **Given** the same product sold on a POS ticket, **When** the ticket posts stock, **Then** no issue line is created for it and the rest of the ticket posts normally.
3. **Given** a product mapped X at 30 and Y at 0, **When** previewed (booking gauge, invoice issue, agent action), **Then** only X appears, and posting the preview back succeeds.

### Edge cases
- Stock module off: the dialog's reads 404 → empty state → plain Complete sends `null` per member (today's behaviour, unchanged).
- A draft entry left by an earlier failed attempt: `lines: []` falls through to the existing draft-retry state machine (the draft posts as-is, per `realizeAccruals:401-403`); releasing accruals while a draft stands is not attempted.
- Transient accrual-read failure: the member shows no rows → `null`, never `[]` — a read error must not release accruals.
- `POST …/[id]/accrual { lines }` (re-adjust) keeps `.positive()`: adjusting a line to 0 means removing it from the open set, unchanged.

## Requirements
- **FR-001** Store `qty_per_unit >= 0`: `setConsumption` guard, zod `.nonnegative()` on `api/stock/consumption` POST/PATCH and `api/pos/sellables` POST/PATCH (keep `.finite()` where present). Flip the `stock.service.test.ts:649` case: 0 accepted, −1 ⇒ `invalid_qty`.
- **FR-002** Wizard keeps an explicit `0` row and still drops blank rows (`qtyPerUnit.trim() !== '' && Number(...) >= 0`).
- **FR-003** `accrueConsumption` defaults path skips mappings with `qty_per_unit <= 0`; `previewLinesForItemQtys` drops items whose summed quantity is `<= 0`; `resolveIssueLines` (POS) drops `<= 0` lines. No other reader changes.
- **FR-004** `completionLines(rows)`: `null` when `rows` is empty; otherwise the `actual > 0` rows, which may be `[]`. `completionLinesFor` inherits.
- **FR-005** `realizeAccruals`: when no entry exists for the source and `input.lines` is an empty array, release the source's open accruals and return `{ entry: null, realized: 0, stockWarning: null }` without creating an entry. `null`/absent and non-empty behave as today.
- **FR-006** Dialog rows = union(open accruals, defaults map) per member, keyed by `itemId`, accrual values win. Pure merge lives in `consumption-lines.ts` and is tested there.
- **FR-007** `/pos/appointments` and `/scheduling/calendar`: `onstatus`/`onvisitstatus` route `status === 'completed'` to the dialog (`completeFor`), every other status to the mover. The scheduling calendar page gains the dialog instance, `completeFor`, `completeMembers` (filtering cancelled/rejected), `stockWarnings` and `afterComplete` on the pos page's pattern; the pos page's `completeMembers` gains the cancelled/rejected filter.
- **FR-008** `BookingsView.svelte` replaces its own modal (`cdLines`, `openComplete`, `completeBooking`, the `<Modal>` block, `setLineConsumption`) with `ConsumptionConfirmDialog apiBase="/api/scheduling/bookings"`; the Complete and retry-post buttons set `completeFor`; `stockWarnings` is fed from `oncompleted`. Remove the TODO(handoff) at `ConsumptionConfirmDialog.svelte:25-30` and close the ledger line in `proposals/2026-09-25-hub-pos-calendar-color-followups.md`.
- **FR-009** No new i18n keys (all `sched_complete_*`, `sched_mark_complete` exist in es/en), no new routes (route contract untouched), no new `pos.service` exports (`pos-service-boundaries.test.ts` untouched).

## Success Criteria
- **SC-001** On FACES prod, a Control Botox visit completed from the status cell opens the dialog 100% of the time; the owner reproduces it on the next such visit.
- **SC-002** Zero `stk_accruals`/`stk_entry_lines` rows with `qty <= 0` are created after deploy (SQL check `where qty::numeric <= 0 and created_at > <deploy>` = 0 on both tables).
- **SC-003** A confirmed-0 completion leaves the accrual `released` and no entry (query the booking's `stk_accruals.status` + `stk_entries` by `metadata->>'sourceId'`).

## Out of scope / open ends
- ~~Server-side enforcement~~ — moved in scope by Amendment A (S4) below; the premise that it breaks the gateway agent action was wrong (that action completes through `setBookingStatus` + `realizeAccruals`, never `applyBookingStatus`).
- The recipe-explosion gap in the dialog's defaults fallback (`ConsumptionConfirmDialog.svelte:117-122`) stays as ledgered.
- `BookingDetailDrawer` is already correct and is not touched.

## One-off ops note (owner action, not code)
The 21-Oct visit (`f4fecc5e-a0e2-4d99-af40-e45c95e48317`) used 15 UN of toxina that are not in the ledger. After the fix deploys, post a manual stock **exit** of 15 UN of the Dysport item from Stock → Entries with a note referencing the visit id. No script, no backfill.

## Assumptions
- "Control Botox" has a single ingredient (Dysport). If the owner maps more, I5 covers it.
- FACES uses the status cell/board chip as its normal completion gesture (the evidence shows it did); the explicit Completar button and the drawer were already correct and remain the fast path.

## Amendment A (2026-10-22) — the server refuses an unconfirmed `completed` (S4)

### AS-IS
- `PATCH /api/scheduling/bookings/[id] {status:'completed'}` and `POST …/[id]/group {status:'completed'}` both reach `applyBookingStatus` (`src/routes/api/scheduling/bookings/_handlers.ts:292`), which patches the status and then realizes open accruals as-is (`:337-357`). No confirmation is required.
- After S3 the hub UI no longer sends these for a booking that needs confirmation (status cell/board → dialog; the drawer sends its visit-wide `completed` only after the dialog confirmed every live member, `BookingDetailDrawer.svelte:1746-1753`). Any other client (an old tab, a script, a future surface) still can.
- Confirming paths that stay untouched: `POST …/[id]/complete` and `POST /api/gateway/actions/booking-complete` call `setBookingStatus` directly (`complete/+server.ts:43`, `booking-complete/+server.ts:56`).

### TO-BE
- A booking **needs confirmation** when it is not already `completed` and either (a) its `productId` has at least one `stk_consumption` row, **any quantity including 0**, or (b) it has an `open` `stk_accruals` row (`source='booking'`).
- `applyBookingStatus` with `status:'completed'` on a booking that needs confirmation throws `ConsumptionConfirmationRequiredError`; the per-row PATCH answers **409** `{ error: 'consumption_confirmation_required', bookingIds: [id], message }` and nothing is written.
- The visit-wide walk pre-checks **every** eligible target before applying any; if one or more need confirmation it answers the same 409 with all their ids, `applied: []`, and writes nothing.
- A `completed` write for a booking that does not need confirmation (no product, no mapping, no open accrual, or already completed) behaves exactly as today.
- Client: `booking-mover.ts` `commitStatus` shows `sched_status_needs_consumption` (new es/en key) instead of the generic `sched_status_failed` on that 409.

### Requirements
- **FR-010** `bookingsNeedingConfirmation(ctx, ids)` (in `_handlers.ts`, not exported from a frozen inventory) returns the subset per the rule above.
- **FR-011** `applyBookingStatus` pre-check before any write; `statusFailureResponse` maps the error to the 409 shape; `visitStatusResponse` pre-checks all targets first.
- **FR-012** Tests: per-row 409 for a 0-mapped product; 409 for open-accrual-only; 200 for unmapped product and for already-completed; visit walk 409 with `applied: []` when one member needs confirmation; `/complete` still completes a mapped booking.
- **FR-013** i18n: one new key `sched_status_needs_consumption` (es: "Confirma el consumo con «Completar cita» antes de cerrarla.", en: "Confirm consumption with “Complete appointment” before closing it."). Route contract and `pos.service` exports untouched.

### Success criteria
- **SC-004** `curl -X PATCH …/bookings/<CB booking> -d '{"status":"completed"}'` on prod returns 409 once Control Botox has a mapping; the status cell path still opens the dialog.

### Breaking change, named
External API clients that complete mapped bookings with a plain status PATCH now get 409. They complete through `POST …/[id]/complete` (omit `lines` to keep today's realize-as-is behaviour).

## Amendment B (2026-10-23) — the catalog composition editor (fourth surface)

### AS-IS
`/pos/catalog` → expanded row → `CompositionEditor.svelte` writes `consumption` through `PATCH /api/pos/sellables/[id]`. `add()` saves a new item at `qtyPerUnit: 1`; `setQty` returned early on `n <= 0` while the `min="0"` input kept showing the typed 0. Prod: Control Botox mapped there 2026-10-23 16:20 to Dysport, INIBO and Otesaly, all stored at 1.

### TO-BE
- **FR-014** `acceptsQty(kind, n)` (`composition.ts`): stock-usage rows accept `>= 0`, package sessions `> 0`, negatives/NaN never. `setQty` uses it; a refused value resets the input to the saved quantity.
- New items keep starting at 1.
- Tests in `composition.test.ts`.

### Tasks
- [ ] T032 hub PR #592.
- [ ] T033 Owner sets Control Botox's three toxins to 0 after #592 deploys (or now, via the service wizard, which already accepts 0).

## Amendment C (2026-10-23) — composition editor writes queue instead of blocking

### AS-IS
`CompositionEditor.svelte` `run()` began with `if (busy) return;` and every input/button carried `disabled={busy}`. After one change, the whole list locked until the PATCH returned, and an edit fired in that window was silently dropped. The owner reproduced the lock on Control Botox.

### TO-BE
- **FR-015** Writes run through one in-order promise queue; each reads the rows the previous write left. Nothing is dropped.
- **FR-016** No control is disabled by a pending save; only rows still saving show the trash spinner.
- Test: a mounted test holds the first PATCH open, edits a second row, asserts it is enabled and that the second PATCH carries both edits (fails on the old editor).

### Tasks
- [ ] T034 hub PR #593.
