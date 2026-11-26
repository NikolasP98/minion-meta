# Implementation Plan: 149 booking service correction

**Spec**: [spec.md](spec.md) · **Repo**: `minion_hub` (base `master`) · **Status**: waiting for owner approval of the spec.

## Technical context

- SvelteKit 2 / Svelte 5 runes, Drizzle on Supabase Postgres with forced RLS (`app.current_org_id`, `app.current_profile_id`).
- Reuse the spec-124 engine in `src/server/services/stock-corrections.service.ts`: preview/payload hashes, `operationKey`, reason, `recordAuditInTx`, `recordLockFor` / `consumeUnlockInTx` and the `stk_corrections` receipt.
- Stock primitives already exist in `stock.service.ts` (`cancelEntryInTx`, `submitEntryInTx`, `lockBinsInTx`, `lockStockWrite`) and in `stock-accruals.service.ts` (`accrueConsumption`, `realizeAccrualsInTx`, `createServiceIssueInTx`).
- Migrations run in the prod build (hub house rule). Keep them additive.

## Design

### Server: `correctBookingService` (new, in `stock-corrections.service.ts`)

1. `planBookingServiceCorrectionInTx(tx, ctx, req)` is read-only. It loads the booking, the target product/event type (same org, active), the booking's accrual rows and its source entry (`stk_entries.metadata.source='booking'`, `sourceId`), the candidate ticket line and the lock and window state. It returns a `case` (1/2/3), stock deltas from the target recipe (with spec-131 choices), the money facts (read-only) and any blocking refusal.
2. `previewBookingServiceCorrection` hashes the plan (`previewHashOf`).
3. `applyBookingServiceCorrection` opens one `withOrgCoreTransaction`. It runs `lockStockWrite`, re-plans inside the transaction, compares `previewHash`, inserts the `stk_corrections` row first (the unique `operation_key` is what makes a retry safe), then by case:
   - case 1: patch the booking service, then `accrueConsumption` (replace the open set);
   - case 2: `cancelEntryInTx(source)` → set the old realized rows to `released` → `createServiceIssueInTx` + `submitEntryInTx` for the new recipe (source = booking, `metadata.correctionId`) → insert realized accrual rows → patch the booking service;
   - case 3: release the open/draft rows, re-accrue, then `realizeAccrualsInTx`.
   After the case runs, it links the ticket line (spec 133 check), writes the audit entry and stamps `after` + `replacement_entry_id`. A negative-stock refusal throws before any write.

### Migration

`stk_corrections`: extend `stk_corrections_kind_chk`, `stk_corrections_source_type_chk` and `stk_corrections_kind_matrix_chk` with `booking_service` / `sched_booking`, plus a partial unique index `(org_id, source_id) WHERE kind='booking_service' AND replacement_entry_id IS NOT NULL AND …` only if the race test shows one is needed. The row lock on the booking may be enough.

### Booking edit (D2)

`patchBooking`: when `productId` changes on a non-completed booking, call `accrueForBooking` after commit, the same way create does. Completed bookings refuse a service change through the general editor and point to the correction (`409 use_service_correction`). This stops the silent label-only edit.

### Routes

- `src/routes/api/scheduling/bookings/[id]/service-correction/preview/+server.ts`
- `src/routes/api/scheduling/bookings/[id]/service-correction/+server.ts`
- Capability: the route gate is `scheduling:edit`. The service decides whether the window also needs `stock:manage`.

### UI

- `BookingDetailDrawer.svelte`: hint row (from the preview's `link` suggestion, computed in the detail read) and a kebab item, "Corregir servicio…", which opens `Picker` (single, `serviceColumns()`), then the sheet.
- Window setting: `pos_settings.service_correction_window_hours` (additive column, default 24). `pos_settings` has `pos_settings_lock_*` statement triggers, so check that the update trigger admits the new column. Add a field in POS settings (owner/admin) and set FACES to 168 in a one-row data step at deploy (owner-approved 2026-11-26).
- New `BookingServiceCorrectionSheet.svelte` (house `Modal`/drawer, service picker = existing sellables picker filtered to services, reason chips, preview table). It reuses `CorrectionFlow.svelte` patterns for preview → confirm → receipt.
- S2: `SellCart.svelte`, with a booking badge + swap button opening `Picker` on lines that have `bookingId`; trash keeps the appointment pending (toast only); `submitTicket` carries `bookingServiceChanges[]`, applied through case 1 inside the ticket transaction.

### i18n, a11y, design

- Paraglide keys in es and en.
- Every action reachable by keyboard; the sheet is a dialog with focus trap and return focus.
- Semantic tokens only; run `bun run lint:design && bun run lint:tokens`.

## Gates (foreground, one at a time)

`bun run test -- <touched test files>`, the SQL integration tests for corrections, `bun run check` on the touched area, and the design lints. Never run the full gateway suite.

## Risks

- **Spec 126 facets read accruals.** Flipping old rows to `released` must keep its "posted" view right. Test D8 covers it.
- **Draft entries from failed realizes (case 3)** must not leave two active source entries. Re-plan inside the transaction and refuse `manual_review` when two exist.
