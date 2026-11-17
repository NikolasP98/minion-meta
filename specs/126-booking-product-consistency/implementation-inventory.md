# Implementation inventory — 126-booking-product-consistency

Future Hub-relative actions. Every Create path is absent at the pinned baseline (`c6c2d5739572356239c4048c0f564f40b0768adc`); if the same file exists on the implementation candidate, extend it rather than fork a duplicate. Files created by F3 are labeled as F3-provided. No Delete action or new package dependency is selected. The Task column names the task in [tasks.md](tasks.md) that owns each row.

| Action | File | Responsibility | Task |
| --- | --- | --- | --- |
| Create | src/lib/components/scheduling/booking-product-facets.ts | Neutral versioned wire, strict decoder, basic+finance row adapter and anchor helper; no server runtime import or unsafe legacy fallback. | T017 |
| Create | src/lib/components/scheduling/booking-product-facets.test.ts | Discriminator, shape, omission, membership, version, `gift` flag, finance adapter, duplicate-`accrualId` vector and blocked helper/action cases. | T017 |
| Modify | src/lib/components/scheduling/visit.ts | Add `FinancialVisitRow`; narrow helper inputs to used fields; optional `allowServiceFallback` (default `true`) keeps legacy callers; new guarded paths pass `false` except the verified plan. | T017 |
| Modify | src/lib/components/scheduling/visit.test.ts | Legacy compatibility plus used-field rows, no-fallback, products-only and verified-plan behavior. | T017 |
| Modify | src/lib/components/scheduling/calendar-context-menu.ts | Decoded detail model and financial readiness guard; no unknown-to-unpaid or cash and no destructive payment choice. | T021 |
| Modify | src/lib/components/scheduling/calendar-context-menu.test.ts | Group and singleton in all four states; no charge, sale or paid-destructive choices from missing or denied financial evidence. | T021 |
| Modify | src/routes/(app)/scheduling/calendar/PageBody.svelte | Versioned window fetch, header, cache seed and decoder; booking/tag-only view kept, no sold rows. | T023 |
| Create | src/routes/(app)/scheduling/calendar/page.products.mounted.test.ts | Scheduling host catalog exception versus denied payment, stock and overlay; stale cache and version guard. | T023 |
| Modify | src/routes/api/pos/appointments/server.test.ts | Existing GET suite. Update: the `loadCalendarWindow` mock and its `toHaveBeenCalledWith` expect explicit `foreign` `{pos, finance, stock, crm}` handles and `canReadFinancialFields`, not only `pos: true`; the window mock returns the `CalendarProjection` keys; the exact JSON body becomes `{calendarScope, productProjectionVersion: 1, bookings, tagOptions, ticketOverlay}` without `invoices` and `accrualSummaries`; every request sends `X-Minion-Booking-Products-Version: 1`; add a case where a request without the header returns HTTP 409 `refresh_required` after admission. Date-range 400 cases stay. | T020 |
| Create | src/routes/api/scheduling/calendar/server.test.ts | Same collection version, schema and failure behavior under scheduling scope; sold `not_in_slice`, overlay `denied`. | T020 |
| Modify | src/routes/(app)/scheduling/bookings/bookings-routes.characterization.test.ts | Runs the real `/pos/appointments` and `/scheduling/calendar` loaders and owns their serialization tests (no separate `page.server.test.ts` files). POS pinned key set drops `invoices` and `accrualSummaries` and adds `productProjectionVersion` and `ticketOverlay`; `result.accrualSummaries` assertions move to `bookings[].productFacets.stock`; the "always attempts the accrual read" case becomes the admitted `stockAnchorForBookings` read. Scheduling key set adds `productProjectionVersion` and `ticketOverlay`. Add finance-, tier-, POS- and stock-denied and read-failed serialization cases and the catalog-price exception. `/scheduling/bookings` cases are unchanged. | T020 |
| Modify | src/server/auth/scheduling-read.test.ts | Mocks `getBookingDetail` and `loadCalendarWindow`. "Preserves authorized bookings/[id] and calendar reads" sends the version header; the exact calendar body becomes `{calendarScope, productProjectionVersion: 1, bookings: [], tagOptions: [], ticketOverlay: {state: 'denied'}}`; the mocks accept the required `foreign` options. Add header-missing HTTP 409 cases after admission; the 401/403 denial cases are unchanged. | T020 |
| Modify | src/routes/(app)/pos/appointments/PageBody.svelte | Context menu and `chargeEvent` owner: versioned detail fetch and financial guard before `chargeBooking`/`payableEventFrom`; remove `chargeOne` and `!b.paid`; versioned window cache; remove accrual money chips. | T022 |
| Create | src/routes/(app)/pos/appointments/page.products.mounted.test.ts | Forbidden, unknown and stale projections give zero till callbacks; admitted positive counterpart; direct-action matrix. Existing happy-dom pattern. | T022 |
| Modify | src/routes/api/scheduling/bookings/[id]/+server.ts | Pass the required request to the versioned detail handler; keep current auth and module behavior. | T018 |
| Modify | src/routes/api/pos/appointments/[id]/+server.ts | Same detail version contract and existing POS admission. | T018 |
| Create | src/routes/api/scheduling/bookings/[id]/server.test.ts | Version required (HTTP 409, no payload), neutral DTO, denied, foreign and money guards. | T018 |
| Create | src/routes/api/pos/appointments/[id]/server.test.ts | Same POS-host detail version, projection and failure behavior. | T018 |
| Modify | src/server/services/pos-accounts.service.ts | Stable authorized current-visit sold-line projection, provenance and `gift` flag. | T007 |
| Modify | src/server/services/pos-accounts-booking-links.test.ts | Visit member, foreign, unassigned, provenance multiplicity, `void`/`voided` and gift cases. | T006, T007 |
| Modify | src/server/services/scheduling-bookings.service.ts | Required foreign-handle options, independent source and money facets, `void`/`voided` exclusion and member filter for `otherLines`; no lifecycle replay. | T008 |
| Modify | src/server/services/scheduling-bookings-products.test.ts | Shared detail and hover planned-versus-sold projection. | T008 |
| Modify | src/server/services/scheduling-bookings-visit.test.ts | Every direct `getBookingDetail` call supplies explicit allowed or denied foreign handles; visit grouping expectations kept. | T008 |
| Modify | src/server/services/scheduling-bookings-money.test.ts | Every direct detail call supplies explicit finance and POS admission; money cases kept plus no-money and denied discriminators. | T008 |
| Modify | src/routes/api/scheduling/bookings/_handlers.ts | Required independent POS, finance and stock handles, financial-tier and masking options and safe serialization (T008); request and version header in `bookingDetailResponse` (T018); shared `completeBookingResponse` with literal host and recovery schema (T024). | T008, T018, T024 |
| Modify | src/routes/api/scheduling/bookings/_handlers.test.ts | Its `stock-accruals.service` mock gains `stockAnchorForBookings` (US1) and `stockRecoveryForBookings` and `listRecoveryOpenAccrualsInTx` (US2) so the module still imports; its `getBookingDetail` mock follows the new signature; add `bookingDetailResponse` header and handle cases (T018) and `completeBookingResponse` host and HTTP 409 cases (T024). Existing group, patch and status cases stay. | T018, T024 |
| Modify | src/server/services/calendar-window.service.ts | Required explicit foreign handles and finance-tier option, `CalendarProjection`, bounded ticket-overlay reader, scheduling sold `not_in_slice`. | T019 |
| Modify | src/server/services/calendar-window.service.test.ts | Required explicit options, no fallback, hover/detail parity, overlay limits. | T019 |
| Modify | src/lib/components/scheduling/calendar-window.ts | Typed sold, planned and source availability model. | T019 |
| Modify | src/lib/components/scheduling/calendar-window.test.ts | Typed hover projection and forbidden or unknown handling. | T019 |
| Modify | src/routes/(app)/pos/appointments/+page.server.ts | Resolve finance independently and pass `pos`, `stock`, `crm`, `finance` and the financial-field option to the calendar projection. | T020 |
| Modify | src/routes/(app)/scheduling/calendar/+page.server.ts | Same explicit handle and money options, keeping scheduling-host scope. | T020 |
| Modify | src/routes/api/pos/appointments/+server.ts | Explicit POS, finance, stock and CRM admission, no `ctx` fallback; version header. | T020 |
| Modify | src/routes/api/scheduling/calendar/+server.ts | Same required independent handles and version header; native route authority kept. | T020 |
| Modify | src/lib/components/scheduling/BookingCalendar.svelte | Render the authorized sold facet with stable keys and the gift label from `gift === true`. | T021 |
| Modify | src/lib/components/scheduling/BookingDetailDrawer.svelte | Versioned detail GETs; separate planned, sold and stock sections (T021); independent recover action (T011). | T021, T011 |
| Modify | src/lib/components/scheduling/booking-detail-drawer.mounted.test.ts | Surface parity, state reload and recover flow in the existing mounted environment. | T021, T011 |
| Modify | src/server/services/stock-accruals.service.ts | US1: cost-free `stockAnchorForBookings` (T008). US2: `stockRecoveryForBookings` (T011), `listRecoveryOpenAccrualsInTx` and the additive `RealizeInput` recovery precondition inside the F3-provided `realizeAccrualsInTx` (T024). | T008, T011, T024 |
| Modify | src/server/services/stock-accruals.service.test.ts | Anchor read (T008); bounded member-recovery availability and no invented empty source (T011). | T008, T011 |
| Modify | src/lib/components/scheduling/ConsumptionConfirmDialog.svelte | `recover_stock` mode with per-member retry, payload and outcome rules. | T011 |
| Modify | src/lib/components/scheduling/consumption-confirm-dialog.mounted.test.ts | Recovery mode: eligible members only, sequential requests, stop on error or unknown, no ordinary completion callback. | T011 |
| Modify | src/lib/components/scheduling/consumption-lines.test.ts | Saved-source, open-row, zero and per-member payload cases. | T011 |
| Modify only for a demonstrated missing case | src/lib/components/scheduling/consumption-lines.ts | Unchanged if the existing pure math meets the saved-source and open-row semantics; otherwise a bounded edit plus regression. | T011 |
| Modify | src/routes/api/scheduling/bookings/[id]/complete/+server.ts | Delegate to `completeBookingResponse` with literal `'scheduling'`; optional `confirm_open` recovery body, completed-only, no status mutation, HTTP 409 before the generic warning catch. | T024 |
| Modify | src/routes/api/pos/appointments/[id]/complete/+server.ts | Delegate to `completeBookingResponse` with literal `'pos'` and existing auth and module rules; no duplicated realization or extra `+server` export. | T024 |
| Create | src/routes/api/pos/appointments/[id]/complete/server.test.ts | POS-host guarded recovery, permission and stale forwarding. | T024 |
| Modify | src/routes/api/scheduling/bookings/[id]/complete/server.test.ts | Endpoint recovery contract and denial without lifecycle replay. | T010 |
| Modify after F3 creates and qualifies it (F3-provided) | src/server/services/stock-corrections.sql.integration.test.ts | Extend semantic case 9 (`repeated concurrent booking completion reuses frozen draft and submitted source once`) with the F5 open-set limit, precondition, add/remove and conversion races; keep the 13 F3 test names and lane ownership. | T025 |
| Modify only for missing text | messages/en.json | Reuse existing keys if every scoped label and refusal is translated; otherwise add matching English and Spanish keys. No technical detail enters the user workflow. | T013 |
| Modify only for missing text | messages/es.json | Same as `messages/en.json`. | T013 |
| Generated by `bun run i18n:compile` | src/lib/paraglide/ | Never hand-edited. No generated diff when catalogs are unchanged. | T013 |
| Modify only if a fixture is absent | scripts/qa/seed/matrix.ts | Register only owned synthetic persona and case fixtures this item needs; no shared QA reset or live rows. | T004 |
| Create and update | specs/126-booking-product-consistency/validation.md | Meta-repo-relative candidate commands and results, scope, ownership, native and browser receipts and remaining approval gates. | T001, T003, T009, T012, T014, T015 |
| Create, local evidence only | specs/126-booking-product-consistency/evidence/ | Scenario- and candidate-named synthetic receipts; no live PII or credentials. | T015 |

F3-provided prerequisites, not present at the pinned baseline: `realizeAccrualsInTx(tx, ctx, guard, input)` in `stock-accruals.service.ts`, the F3 write gate (`lockStockWrite` in `stock.service.ts`) and the accrue, release and realize writers that take it, and `stock-corrections.sql.integration.test.ts` with its qa-native manifest entry (F3 tasks T006–T010 in specs/124-stock-correction-workflow/tasks.md). F5 does not create another writer or change that gate. Central hooks, RBAC and route paths stay unchanged; the existing complete body gains only the optional recovery shape from contracts/admission-recovery.md. No schema migration, generic DataTable, layout or token change, package dependency or new endpoint.

All new tests use the existing unit, route, mounted (happy-dom with Svelte Testing Library) or manifest-owned qa-native harness; no new runner or implicit skip. The ordinary focused command is in [quickstart.md](quickstart.md). It does not replace the qa-native lane, full candidate checks, UI, i18n, token and browser gates or owner approval.

## Pinned caller census

At the pinned baseline (re-run by T003 on the candidate before code):

- `getBookingDetail` production caller: `src/routes/api/scheduling/bookings/_handlers.ts`. Tests that call it: `scheduling-bookings-visit.test.ts`, `scheduling-bookings-money.test.ts`. Tests that mock it: `_handlers.test.ts`, `scheduling-read.test.ts`.
- `loadCalendarWindow` production callers: `(app)/pos/appointments/+page.server.ts`, `(app)/scheduling/calendar/+page.server.ts`, `api/pos/appointments/+server.ts`, `api/scheduling/calendar/+server.ts`. Tests that call it: `calendar-window.service.test.ts`. Tests that mock it: `api/pos/appointments/server.test.ts`, `scheduling-read.test.ts`. Test that runs the real POS and scheduling loaders: `bookings-routes.characterization.test.ts`.
- `BookingDetailDrawer.svelte` and `pos-accounts.service.ts` mention `getBookingDetail` only in comments.

Update every listed caller's option construction and fixtures together. No source-handle fallback is allowed; any additional caller found on the candidate must be added to this inventory before implementation. Existing route paths and the legacy accrual API stay unchanged.

## Files added to the inventory during implementation (R6 findings)

| Action | File | Why | Task |
| --- | --- | --- | --- |
| Modify | src/lib/components/scheduling/BookingsView.svelte | Its stock-retry chip (single booking, completed) now opens `recover_stock`; it also mounts the drawer (third drawer host). | T011 |
| Modify | src/routes/(app)/pos/appointments/PageBody.svelte | Its stock-retry chip routes to `recover_stock` (the rest of T022 is open). | T011 |
| Modify | src/lib/stories/Calendar/BookingCalendar.stories.svelte | Fixture built the removed `tickets[].products` with `total`; now a `sold` facet. | T019 |
| Modify | src/server/auth/dataset-ctx.ts | `canReadFinancialFields(locals)` (finance view + tier) for the gift flag. | T008 |
| Modify | src/lib/components/scheduling/calendar-window.ts | `SoldProduct` alias, `productsForVisit` over `sold`, `CalendarBooking.sold`. | T019 |
| Modify | src/server/services/scheduling-bookings-products.test.ts | Its `stock-accruals` mock gained `stockAnchorForBookings` / `stockRecoveryForBookings`. | T008 |
| Modify | src/routes/api/pos/appointments/server.test.ts, src/routes/(app)/scheduling/bookings/bookings-routes.characterization.test.ts, src/server/auth/scheduling-read.test.ts | New `canReadFinancialFields` admission, `sold` key, detail resolving three dataset handles. | T020 |
| No change | src/server/services/pos-service-boundaries.test.ts | No new `pos-accounts.service` export. | T007 |
