---
id: 149-booking-service-correction
title: Fix the wrong service on an appointment in one step (stock follows, money does not move)
stage: spec
status: draft
verdict: pending
pass: 1
created: 2026-11-25
updated: 2026-11-26
repos: [minion_hub]
tags: [ui, data]
relationship: extends
related: [124-stock-correction-workflow, 133-pos-session-existing-appointment, 126-booking-product-consistency, 140-record-lock-policy]
---

# Feature Specification: Fix the wrong service on an appointment in one step

**Feature Branch**: `feat/149-booking-service-correction` (hub, base `master`). Not created yet.

**Created**: 2026-11-25

**Status**: Draft. The owner approves the spec before any code is written. This is data-tagged work, so the owner also merges.

**Input**: Owner, 2026-11-25: "there has to be a simpler way to make this change in case of a mistake. … Design the happy path and spec. Backend should be able to handle these short-term fixes."

**Related**:
- 124 owns the correction engine (preview, operation key, reason, receipt). Its US3.2 explicitly **blocks** booking-owned consumption, so this spec adds that missing kind.
- 133 links a cart line to an appointment that already exists. 149 changes **which service** a linked appointment is.
- 126 reads the products and stock of a visit. Its readers must keep agreeing after a correction.
- 140 decides when a record is locked. A correction obeys it.

## The incident: POS-2026-00180 (FACES, 2026-11-25)

Read-only prod reads, 2026-11-25 ~19:30 Lima. Hub `origin/master` `133c4154`.

1. At 19:07 staff booked four appointments for one client visit, all at 18:00. They were Reserva de Consulta, Labios Aileene vol. 3, Mentón Aileene Vol 3 and **Rino Sculpt Aileene Vol 3**. Each Aileene appointment reserved 1 × Aileene Vol 3.
2. The rino should have been Saypha. At 19:16 the cashier fixed it in the cart. The cart can only **delete** a line that belongs to an appointment (`SellCart.svelte` `remove(i)`), so the cashier deleted the rino line and added "RinoSculpt - Saypha Volume Plus" as a new line. The sale charged S/ 3,200 by card, and the Saypha line has no appointment.
3. At 19:17 the whole visit was completed. Completing an appointment issues what it reserved (`applyBookingStatus` → `realizeAccruals`, `src/routes/api/scheduling/bookings/_handlers.ts` ~373). The rino appointment still said Aileene, so it issued Aileene Vol 3 as STE-2026-00741.
4. Result:
   - The money is right.
   - Stock is wrong by one unit each way: one Aileene too few and one Saypha too many.
   - The client's history shows an Aileene rino.
   - The Saypha line has no appointment, so the schedule step may treat it as paid but not yet booked.
   - The staff member could not fix any of this. They sent a voice note asking how.

## AS-IS (source reading at `133c4154`; items 2 and 3 are not reproduced at runtime)

1. **The cart cannot change the service on a booked line.** It can only delete the line. Deleting it leaves the appointment in the visit with its old service. The app gives no warning (`SellCart.svelte`).
2. **Editing the service on an appointment changes only the label.** `patchBooking` (`scheduling-bookings.service.ts` ~3040) writes `eventTypeId`/`productId` but never re-accrues, and no route calls `accrueConsumption` after a patch. Completion then realizes the **old** open reservation (`realizeAccrualsInTx` builds lines from the open accruals, `stock-accruals.service.ts` ~395). So fixing the service **before** completion still issues the wrong supplies.
3. **After completion nothing can be corrected.**
   - Reservations that are settled never re-accrue ("a source with any realized/released row is settled and never resurrected", `stock-accruals.service.ts` ~81).
   - The correction engine supports only `sale_variant`, `sale_stock_repost`, `receipt_replace`, `product_mapping` and `receipt_chain` (prod check constraint `stk_corrections_kind_chk`). Spec 124 US3.2 deliberately refuses booking-owned stock.
   - The ticket "swap" (spec 120 S4) only works on **product** lines at the **same catalogue price** (`src/lib/pos/swap-options.ts`), so it cannot turn a service into another service.
4. **Today's only fix is by hand.** Someone cancels the stock movement, posts a manual issue, and asks a developer to edit the appointment and relink the sale line in SQL. That takes four steps across three screens, plus a developer.

## TO-BE

### Happy path (what staff do)

**After the fact (the incident):**

1. Staff open the appointment "Rino Sculpt Aileene Vol 3" (calendar → drawer). The drawer shows a hint: **"Se cobró como RinoSculpt – Saypha Volume Plus (POS-2026-00180). ¿Corregir la cita?"**
2. One tap on **Corregir** opens a confirmation sheet:
   - Servicio: ~~Rino Sculpt Aileene Vol 3~~ → **RinoSculpt – Saypha Volume Plus**
   - Stock: **devuelve 1 Aileene Vol 3 · saca 1 HA Saypha Volume Plus**
   - Cobro: **sin cambios** (S/ 900 ya cobrado en POS-2026-00180, ahora unido a esta cita)
   - Motivo: chips "Me equivoqué de servicio" (default) / "El paciente cambió" / otro (text)
3. Staff tap **Confirmar**. A toast says "Cita corregida · stock actualizado", with a link to the correction receipt. The appointment, the client's history, the visit's stock view and the sale all agree.

Without the hint, the drawer's kebab item **"Corregir servicio…"** opens the house **Picker** window (`src/lib/components/ui/Picker.svelte`, `selectionMode="single"`, the shared `serviceColumns()`, services only). The current service shows as picked. The sale's unlinked service lines for this client are listed first. Picking a row opens the same confirmation sheet.

**At checkout (prevent the mistake):**

4. A cart line that belongs to an appointment shows a "Cita 18:00" badge and gets a **"Cambiar servicio"** icon button next to the trash icon. The button opens the house **Picker** window, the same primitive and service columns the appointment form uses, filtered to services, with the current service marked as picked. On a phone it opens as a bottom sheet (`compactPresentation="sheet"`). Picking Saypha closes the Picker. The line keeps its appointment and takes Saypha's catalogue price, and a caption says the appointment changes when the sale is charged. When the sale is charged, the appointment becomes Saypha and its reservation changes in the same step. Completion later issues Saypha.
5. Deleting a booked line just removes it from this sale. **The appointment stays pending**, so it can be paid later or on a separate sale. No dialog appears; a toast says "La cita de las 18:00 queda pendiente de cobro". (Owner, 2026-11-26.)

### Rules

- **Money never moves.** A correction changes the appointment, its reservation or issued stock, and its link to a sale line. It never changes prices, totals, payments, payment dates or fiscal documents. If the charged line is a different service at a different price, the sheet says so and points to the sale correction (spec 124/120). It does not re-price anything.
- **One operation, three cases.** These are chosen by the server, not the UI:
  1. *Appointment not completed*: change the service and **re-accrue** the open reservation to the new service's recipe. This also fixes AS-IS item 2 for every edit of the service, not only corrections.
  2. *Completed, stock issued*: in **one transaction**, cancel the issued movement (reversal ledger rows, nothing deleted), issue the new recipe sourced to the same appointment, mark the old reservation rows `released` and add realized rows for the new ones. Then change the service, link the sale line and write the correction receipt.
  3. *Completed, stock not issued* (a warning or a draft): change the service, re-accrue, then retry the existing realize.
- **Short-term fixes need no manager, and "short-term" is an org setting.** A new setting, `pos_settings.service_correction_window_hours`, defaults to **24 hours** for new orgs. **FACES is set to 168 (7 days)** (owner, 2026-11-26). The window is measured from the appointment's start time, which staff can see on the calendar. Within the window, anyone who can edit appointments may correct a completed appointment, unless spec 140 locks it. Outside the window, or when 140 locks it, the correction needs `stock:manage`, plus the owner unlock when 140 requires it. A locked accounting period refuses the correction outright. Owners and admins edit the window in POS settings. Appointments that are not completed (case 1) need no window.
- **Linking a sale line** follows the spec 133 server check:
  - same organization and same client;
  - a service line on a live (not void) sale;
  - the line has no appointment yet;
  - the appointment is not linked to another live line.
  The hint appears only when exactly one such line matches.
- **Recipe choices** (spec 131 substitutes): if the new service's recipe has a choice, the sheet asks for it. It never guesses.
- **Short bin**: if the new supplies are not in stock, the correction is refused before anything changes. The sheet names the item and quantity, using the existing negative-stock refusal. A half-applied correction never commits.
- **Idempotent**: one operation key per sheet. A retry or a double tap returns the same receipt. Two people correcting the same appointment get one win and one "ya se corrigió" refusal.
- **Same backend for people and agents.** The preview and apply endpoints carry every rule above. Support, scripts and agents use the same API with the same permissions and never touch SQL. The UI only displays the preview.

### API (backend owns the whole fix)

- `POST /api/scheduling/bookings/:id/service-correction/preview` `{ toProductId | toEventTypeId, ticketLineId?, choices? }` → `{ case, before, after, stock: [{itemId, name, qtyDelta}], money: {unchanged: true, chargedLine?}, link?, window: { hours, startsAt, state: 'within'|'manager'|'locked' }, blocked?: {code, message}, previewHash }`
- `POST /api/scheduling/bookings/:id/service-correction` `{ ...same, reason, previewHash, operationKey }` → the correction receipt (`stk_corrections` row id, new entry id, booking).
- Typed refusals, each with a Spanish message: `stale_preview`, `already_corrected`, `period_locked`, `record_locked`, `needs_manager`, `negative_stock`, `choice_required`, `line_not_linkable`, `same_service`.

## DELTA

| # | Transition | Proved by |
|---|---|---|
| D1 | `stk_corrections` accepts `kind='booking_service'`, `source_type='sched_booking'` (additive check-constraint migration; matrix: `source_entry_id` and `replacement_entry_id` both null for case 1, both set for case 2) | migration test + SQL integration test |
| D2 | `patchBooking` service/product change on a non-completed appointment re-accrues the open set (case 1); completion then issues the new recipe | service unit test: change Aileene→Saypha, complete, ledger = 1 Saypha |
| D3 | `correctBookingService` preview/apply in `stock-corrections.service.ts`, reusing `cancelEntryInTx`, `createServiceIssueInTx`, `submitEntryInTx`, the preview/payload hashes, record locks and audit | SQL integration: incident fixture → Aileene +1, Saypha −1, booking product = Saypha, ticket line linked, payments/totals byte-identical |
| D4 | `pos_settings.service_correction_window_hours` (int, default 24, check 1–8760) + POS settings field. Within the window: scheduling edit; outside: `stock:manage`; period lock refuses. FACES row set to 168 | migration test; capability matrix test (3 personas × inside/outside/locked); settings form mounted test |
| D5 | Idempotency and race: same key → same receipt; two keys concurrently → one applied, one `already_corrected` | concurrency integration test |
| D6 | Drawer hint + "Corregir servicio…" sheet (Spanish/English, keyboard reachable, design tokens) | mounted test + Storybook story + browser check at phone and desktop width |
| D7 | Cart booked lines show the appointment badge and a "Cambiar servicio" button that opens `Picker` (single, services, current marked picked); the line keeps `bookingId` and takes the new catalogue price; submit changes the booking service in the ticket transaction. Trash removes the line, keeps the appointment pending and shows a toast | mounted test + `submitTicket` integration test |
| D8 | Spec 126 visit stock and sold facets agree after a correction (old rows `released`, new rows realized) | facet regression test on the incident fixture |

## Slices

- **S1, backend + after-the-fact sheet** (D1–D6, D8). This alone fixes the incident and every later one.
- **S2, prevent at checkout** (D7). It depends on S1's service-change path.
- **Data repair of POS-2026-00180.** After S1 ships, staff run it through the new sheet, with owner OK. Running it before S1 ships means the hand repair, which needs owner OK for the prod writes.

## Non-goals

- Changing what was charged. Price, payment and fiscal corrections stay with spec 124/120 and the till corrections.
- Corrections older than the period lock, or any bulk historical repair (spec 122/144).
- Changing the date, time, professional or client. This feature changes only the service.
- A hub MCP tool. The API is agent-ready, and a tool can wrap it later.

## FigCraft demo

Pending. The as-is/to-be frames (drawer hint, correction sheet, cart "Cambiar servicio" opening the Picker, delete toast) come from `design/figcraft/minion-hub.master.figcraft` into `specs/149-booking-service-correction/booking-service-correction.figcraft` before S1 UI work. Interactive happy-path preview for review now: https://claude.ai/artifact/DyL3j9GGmmro3fHwfW2qJ5 (source in the session scratchpad, `svc-fix/index.html`).

## Owner decisions (2026-11-26)

1. Window = configurable per org (`pos_settings.service_correction_window_hours`): FACES 7 days, 24 h default for new orgs.
2. Deleting a booked line at the till keeps the appointment pending ("it can be paid later or separately"). No dialog.
3. Service choice uses the house Picker primitive ("a primitive picker element that should pop out"), not an inline list.
