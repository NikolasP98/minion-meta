# Tasks: 149 booking service correction

Owner approval of [spec.md](spec.md) comes before T010.

## S1, backend + after-the-fact sheet

- [ ] T001 Incident fixture (synthetic): a visit with 3 Aileene appointments and a ticket with the rino line as Saypha and no appointment; completed; ledger 3 × Aileene. Store it in `src/server/services/__fixtures__/booking-service-correction.ts`.
- [ ] T002 Failing SQL integration test: apply the correction on the fixture, then Aileene +1, Saypha −1, booking product = Saypha, ticket line linked, payments and totals unchanged.
- [ ] T010 Migration: `stk_corrections` kind `booking_service` / source type `sched_booking` (D1). Migration test.
- [ ] T011 `patchBooking` re-accrues on a service change before completion; refuses `use_service_correction` after completion (D2). Unit tests.
- [ ] T012 `planBookingServiceCorrectionInTx` (cases 1/2/3, stock deltas, recipe choices, link candidate, window, refusals).
- [ ] T013 `previewBookingServiceCorrection` / `applyBookingServiceCorrection` (D3). T002 passes.
- [ ] T014 `pos_settings.service_correction_window_hours` migration (default 24) + POS settings field + FACES = 168; window and capability matrix test (D4).
- [ ] T015 Idempotency and concurrency test (D5).
- [ ] T016 Routes `…/service-correction/preview` and `…/service-correction` with typed refusals and Spanish messages.
- [ ] T017 Detail read adds a `serviceCorrectionHint` (exactly one linkable line for the same client and visit).
- [ ] T018 FigCraft proposal file (as-is/to-be) linked from spec.md; owner sees it before T019.
- [ ] T019 `BookingServiceCorrectionSheet.svelte` + drawer hint + kebab item (D6). Mounted test, Storybook story, i18n es/en.
- [ ] T020 Spec 126 facet regression on the fixture (D8).
- [ ] T021 Browser check on the local QA stack at 390 px and 1280 px: hint → sheet → confirm → toast; the history and stock views agree.

## S2, prevent at checkout

- [ ] T030 `SellCart.svelte`: appointment badge + "Cambiar servicio" button on booked lines opening `Picker` (single, `serviceColumns()`, services only, current picked); line keeps `bookingId`, takes the new catalogue price.
- [ ] T031 `submitTicket` applies `bookingServiceChanges[]` through case 1 in the ticket transaction. Integration test.
- [ ] T032 Trash on a booked line removes it from the sale, keeps the appointment pending, and shows the toast. Mounted test.

## After S1 ships

- [ ] T040 With owner OK, correct POS-2026-00180's rino appointment through the sheet. Record the receipt id in this spec.
