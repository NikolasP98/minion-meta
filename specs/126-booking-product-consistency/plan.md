# Implementation Plan: Consistent booking product projections

**Branch**: Planned `126-booking-product-consistency` (not created) | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: `126-booking-product-consistency/spec.md`, item F5.

## Summary

Reuse the drawer planned-products section. Extend the existing sold-product projection with stable sale-line identity and add a sold-products section to detail; use the same projection for the POS calendar hover. Preserve a separate planned facet and the existing accrual summary; verify warning persistence and retry controls before claiming they are missing. F3 owns proven shared retry or atomicity defects and their qualification. F1 remains the separate historical-integrity investigation and case-specific repair slice.

## Glossary

| Term | Meaning in this package |
| --- | --- |
| Sold line | One POS ticket line of kind `product` on a linked sale whose status is neither `void` nor `voided`. Its recorded description is the historical name. |
| Planned product | A `sched_booking_products` row on the visit anchor, shown with its catalog name. |
| Facet | One independently authorized part of a booking read (basic, planned, sold, payment, stock), carried as `available`, `empty`, `denied` or `unavailable` (see [wire.md](contracts/wire.md)). |
| Admission | The server-side check that a dataset handle, module, field tier and record scope permit a read or write, resolved from the authenticated request. |
| Host | The route family serving a read or write: POS (`/pos/appointments`, `/api/pos/appointments`) or scheduling (`/scheduling/calendar`, `/api/scheduling/...`). |
| Anchor | The visit's canonical booking, resolved on the server from its group members. |
| F3 write gate | The two transaction-scoped advisory locks F3 defines in [transaction-protocol.md](../124-stock-correction-workflow/contracts/transaction-protocol.md): the new stock-v1 stock-write lock, then the existing authority lock `pg_advisory_xact_lock(hashtextextended(orgId, 112))` from `src/server/services/nav-policy-lock.ts`. |
| qa-native lane | The real-PostgreSQL test lane registered in `scripts/qc/native-postgres-manifest.ts`; ordinary Vitest excludes `*.sql.integration.test.ts` files. |
| Qualified | Proven by the named tests on the implementation candidate, not merely written. |

## Technical Context

**Language/Version**: TypeScript strict, Svelte 5 runes, SvelteKit 2; Bun per current Hub registry and pinned package manifests.
**Primary Dependencies**: Existing calendar, drawer and dialog components; Drizzle PostgreSQL core and dataset/RBAC helpers. No new framework.
**Storage**: Existing org-scoped PostgreSQL records. No schema migration is planned.
**Testing**: Existing Vitest and mounted Svelte harnesses; real local QA Postgres/auth for tenant and policy checks; Browser Harness for UI acceptance.
**Target Platform / Project Type**: Authenticated Hub web application, desktop and 390 px mobile; installed-app use is an optional separately recorded account check, not proof from web tests.
**Performance Goals**: Preserve existing bounded page and window reads; no per-row fetch waterfall. Record before/after payload and query counts; reject added statement counts proportional to rows. No invented latency target.
**Constraints**: No broader permissions, unrelated WIP, production data writes, guessed identities or unrelated redesign. Owner approval before code or configuration, owner merge.
**Scale/Scope**: One proposal item, existing surfaces only; synthetic fixtures cover both intended personal-account counterparts and denied/foreign controls.

## Constitution Check

| Principle | Pre-research | Post-design |
| --- | --- | --- |
| I Spec before code | Pass: specify stage precedes plan | Pass: tasks follow plan; all implementation tasks unchecked |
| II AS-IS / TO-BE / DELTA | Pass: pinned source plus reported/unproven distinction | Pass: oracles and execution stops are stated |
| III Slice-scoped delivery | Pass: documentation only, no branch mutation | Pass: future isolated Hub feature checkout and PR to registry master; owner merge |
| IV Required gates | Pass: tokens, i18n, route/RBAC and browser requirements included | Pass: local QA and strict Hub checks required |
| V Data/security human gates | Pass for planning only | Pending owner approval before implementation or configuration; gate is not waived |

Implementing tasks is blocked until owner approval and runtime preconditions are met. No constitution exception is claimed.

## Project Structure

Documentation under `specs/126-booking-product-consistency/`: spec.md, plan.md, research.md, data-model.md, contracts/behavior.md, contracts/admission-recovery.md, contracts/wire.md, implementation-inventory.md, quickstart.md, tasks.md, checklists/requirements.md and the generated design-review.md.

Hub source and test files: [implementation-inventory.md](implementation-inventory.md) is the only file list. It covers every Create and Modify action, the tests whose assertions change, F3-provided prerequisites and conditional catalog and fixture changes. No Delete action is selected.

## Phase 0 — Evidence and reproduction

Read the source list in research.md on the implementation candidate and record changes from the pinned baseline. Run the census and synthetic scenario in quickstart.md before editing code. Classify each requested behavior as supported, configuration-only, reproducible gap or unavailable evidence. Supported behavior requires verification, not reimplementation. Any unexpected data or security defect becomes a separately reviewed amendment with owner approval.

## Phase 1 — Data model and contracts

Follow [data-model.md](data-model.md) and the three contracts. The sold-versus-planned decision, its rationale and the rejected alternatives are in [research.md](research.md).

Do not broaden authoritative storage to solve display gaps. Pass the detail stock facet an independently resolved stock dataset handle in `bookingDetailResponse`, then propagate source authority and sanitize outputs before sending them to the browser. A field not permitted for the viewer must be absent from search, export and write responses as well as markup.

## Delivery slices and test oracles

1. Census, reproduction and source contract tests, including forbidden and foreign controls, with no production writes.
2. User Story 1, the smallest complete acceptance slice. It requires the code changes in implementation sequence steps 1–9 below.
3. User Story 2 with its independent recovery and persistence tests (steps 10–14); do not couple it to unrelated business mutations.
4. Full candidate qualification and owner-reviewed release. Record local tests, CI, merge, deployment and post-merge runtime proof separately.

## Required gates and evidence

In the isolated Hub candidate run `bun run check` (zero errors and warnings), `bun run test`, `bun run build`, plus `bun run lint:design && bun run lint:tokens` after UI changes and `bun run i18n:compile` for changed user-facing strings. Check registered route contracts even though no new route is planned. Use the Browser Harness skill and an isolated session if work is concurrent; inspect real route-data outcomes independently of a 200 document shell. Test Spanish and English, light and dark, 390 px and desktop, keyboard focus and reload persistence. Record screenshots and network/redaction assertions with synthetic data only. The focused test command is in [quickstart.md](quickstart.md).

## Complexity and risks

No new framework, schema or generic architecture. The main risk is treating a supported feature or denied facet as a missing business fact. Preserve explicit availability and source provenance. Configuration writes require owner-approved diffs and same-scope rollback evidence. Tests that mock storage do not prove RLS or real policy enforcement; local QA real-database checks are required.

## Implementation sequence

Steps 1–9 are User Story 1; steps 10–14 are User Story 2. The contract named in each step is normative.

1. **Shared wire module** ([wire.md](contracts/wire.md) "Versioned placement"). Create `booking-product-facets.ts` with the DTO, strict decoder, `financialVisitRows`, `visitAnchorIdFromFacets`, `decodeBookingCalendarProjection` and `availableTicketOverlayRows`, plus its test file. In `visit.ts` add `FinancialVisitRow`, narrow `visitSummary`, `chargeableRows` and `payableEventFrom` inputs to the fields they use, and add the optional `allowServiceFallback` overload (default `true`).
2. **Sold-line projection** ([behavior.md](contracts/behavior.md)). Extend `bookingTicketLinks` in `pos-accounts.service.ts` with ticket-line ID, `finProductId`, nullable `bookingId` and the server-computed `gift` flag (spec decision 3). Preserve recorded description and quantity. Apply the relation table: direct, current authorized group member and null-unassigned lines are included; non-null outside IDs are excluded without reading the other booking. Retain the authorized full-sale link and deduplicate by `ticketId` and `lineId`.
3. **Detail read** ([admission-recovery.md](contracts/admission-recovery.md) "Detail and hover authority"). Make `getBookingDetail` require the `foreign` handles and `canReadFinancialFields`. Add a batched sibling of `visitProductsForAnchor` for authorized anchors with current catalog/paid semantics. Apply the `void`/`voided` exclusion and the member predicate to detail sold rows, ticket references, `otherLines` and `lineCount` (spec decision 1). Return `productFacets` and drop the legacy top-level visit, product, ticket and money fields. Never insert planning or stock records from this read.
4. **US1 stock anchor** ([wire.md](contracts/wire.md) "Independent stock anchor"). Add cost-free `stockAnchorForBookings` to `stock-accruals.service.ts`, read for the server-resolved anchor (spec decision 4), with recovery `unavailable`/`not_in_slice`. Emit the non-value `BookingStockCostFacet`.
5. **Detail endpoints**. `bookingDetailResponse` in `api/scheduling/bookings/_handlers.ts` takes the request, resolves POS, finance and stock admission independently and returns HTTP 409 `{error: 'refresh_required'}` without the header `X-Minion-Booking-Products-Version: 1`. Both detail GET wrappers pass the request.
6. **Calendar projection** ([wire.md](contracts/wire.md) "Calendar siblings"). Make the `loadCalendarWindow` `foreign` option required, adding `finance` and `canReadFinancialFields`. Return `productProjectionVersion`, `bookings` with `productFacets`, `tagOptions` and `ticketOverlay`; drop `invoices` and `accrualSummaries`. Add the bounded ticket-overlay reader in `calendar-window.service.ts`. On the scheduling host, sold is `unavailable`/`not_in_slice` and the overlay is `denied` (spec decision 2). Update `calendar-window.ts` types.
7. **Calendar callers**. Update both page loaders and both JSON collection routes to pass explicit handles; the JSON routes require the version header and return HTTP 409 without it.
8. **Drawer, hover and context menu** ([wire.md](contracts/wire.md) "Drawer, calendar menu"). The drawer sends the header on both detail GETs, decodes before the anchor redirect, renders planned, sold and stock facets separately and computes money only from an available financial-row facet. `BookingCalendar.svelte` renders the sold facet with stable keys and the gift label. `calendar-context-menu.ts` uses the decoded detail and offers payment choices only when the financial facet is available.
9. **Host pages** ([wire.md](contracts/wire.md) "Direct calendar Charge"). In the POS `PageBody.svelte`: version header and guard in `chargeEvent`; remove `chargeOne` and the `!b.paid` condition; direct Charge uses the guarded offer and `chargeEvent(anchorId)`; versioned window payload, seed, fetch and week merge; remove raw accrual money chips. In the scheduling `PageBody.svelte`: versioned window decode, header and cache seeding, booking/tag-only view retained.
10. **Recovery read** ([behavior.md](contracts/behavior.md) "Persistent member recovery read model"). Add `stockRecoveryForBookings` for the at most 8 server-owned authorized members passed by the caller (spec decision 5), with the eligibility table. Add `listRecoveryOpenAccrualsInTx` and its complete open-row confirmation projection.
11. **Shared complete handler** ([admission-recovery.md](contracts/admission-recovery.md) "Guarded server precondition"). Extract `completeBookingResponse` into `_handlers.ts`; both complete wrappers delegate with a literal host. Add the optional `recovery` body. This step requires the F3-provided `realizeAccrualsInTx` and write gate; it cannot be built against the pinned `realizeAccruals`, which is not transactional.
12. **Recovery UI**. Add the `recover_stock` mode to `ConsumptionConfirmDialog` and a drawer recovery entry point for eligible completed members. Saved entries send `{}`; absent-source members confirm open-row quantities, with no defaults fallback. Requests run sequentially through the current host `apiBase` and the per-member `/complete` handler, never the group status PATCH or the ordinary completion callback.
13. **Outcomes**. Preserve per-member warning, error and unknown outcomes and committed results. Stop remaining requests on non-2xx or response loss; refresh before retry. After each attempt call `reloadDetail`/`onchanged`. Reopen eligibility comes only from fresh source facts.
14. **Native qualification**. After F3 qualifies its engine, extend F3's native case with the F5 precondition cases and run the qa-native lane. If repeated or concurrent tests fail, this release waits for F3's fix.

Every step updates the tests the inventory assigns to it; the inventory's Task column and tasks.md give the owning task for each file.
