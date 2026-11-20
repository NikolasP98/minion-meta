---
status: draft
verdict: pending
created: 2026-11-16
updated: 2026-11-16
repos: [minion_hub]
tags: [ui, data]
source_proposal: 2026-11-16-faces-stock-cash-crm-meeting-followups
source_item: F5
---

# Feature Specification: Consistent booking product projections

**Feature Branch**: Planned `126-booking-product-consistency`; no branch created or switched. Hub PR base: master, verified from repo-policy on November 16.

**Created**: 2026-11-16

**Status**: Draft; source-evidenced planning only. Owner approval before implementation/configuration and owner merge remain pending. Independent review results are recorded under `egm/`.

**Input**: FACES meeting follow-up F5: Show staff the same correctly scoped sold and planned products in appointment hover and detail, while keeping payment and actual stock posting distinguishable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Read the same visit products (Priority: P1)

Staff compare hover and opened appointment without losing a sold garment or confusing a planned product with an actual delivery.

**Why this priority**: Different product views obscure whether an item was sold, planned or actually consumed.

**Independent Test**: Use one visit with a ticket-only Faja M, one with a planned product only, one with both and one without products; compare each surface.

**Acceptance Scenarios**:

1. Given one linked non-void sale containing one Faja M, when staff open the same visit from hover, then both surfaces show the same sold line and quantity once, explicitly labeled as sold with the linked sale; neither claims it was assigned to or fulfilled by that booking.
2. Given a planned product not sold, when both surfaces are read, then it is explicitly planned, never described as sold or stock posted.
3. Given a sale with an unassigned second product, when shown for the visit, then it retains sale-level provenance and is not relabeled as confirmed event consumption.
4. Given a physical product explicitly assigned to another visit outside the current authorized member set, when hover and detail are read, then both omit that line and never expose the other booking; the authorized full-sale link remains available.

### User Story 2 — Understand and recover stock warnings (Priority: P2)

Staff can tell completed appointment, recorded sale, expected consumption and posted stock apart, and reach the existing retry workflow when allowed.

**Why this priority**: Persistent warnings let staff find the existing recovery action after a stock posting fails.

**Independent Test**: Simulate completion with failed realization, reload the drawer, retry after fixture stock recovery and verify one posting.

**Acceptance Scenarios**:

1. Given completed status plus failed stock realization, when the drawer is reopened, then it does not claim stock posted and exposes the recorded pending/unrealized state with an authorized retry action.
2. Given a grouped visit with completed bookings with open accruals or draft stock entries, alongside bookings whose accruals are realized or released, when stock recovery is confirmed, then only evidenced unresolved completed members are retried through their individual existing endpoint; no visit-status transition is repeated.
3. Given repeated or concurrent retry, when stock is realized, then one source-owned stock entry is linked and product display does not duplicate. Partial/unknown outcomes are refreshed before another attempt.

### Edge Cases

Grouped bookings sharing a ticket; booking outside payment calendar window; two same-description sale lines; gifts with zero total; void/voided ticket; archived catalog product; planned quantity differing from sold quantity; multiple visits sharing one sale; module denied; stale refresh; failed facet; stock warning followed by reopen; no accrual because sale fulfilled stock elsewhere.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hover and detail MUST show the same sold product lines for the same visit and data snapshot, including variant-bearing description and quantity; ticket lines MUST be deduplicated by stable sale and line identity. Explicit links outside the current authorized visit-member set MUST be excluded from both facets without fetching or exposing the other visit.
- **FR-002**: Planned visit products and products sold on linked tickets MUST remain separate labeled facets. A plan, paid badge, sale status or appointment completion MUST NOT by itself be presented as a posted stock movement.
- **FR-003**: Products from a linked sale MUST retain sale-level provenance; the UI MUST NOT infer that every line on that sale was consumed by this particular appointment.
- **FR-004**: A booking with no planned or sold products MUST show an explicit empty state. A denied or failed facet MUST be distinguishable from a proven empty facet without exposing restricted details.
- **FR-005**: Completion stock warnings and persisted unrealized consumption MUST remain discoverable after reopen/reload, and authorized users MUST be able to invoke the existing retry workflow through eligible members’ existing individual completion-retry endpoints, without a group-status mutation, second appointment completion or duplicate issue. Saved-source retries MUST preserve saved source semantics; absent-source retries MUST require confirmed open-accrual quantities, with denied/unknown evidence blocked.
- **FR-006**: Product, money and stock facets MUST obey their independent module, owner and field permissions in both initial calendar data and detail reads. Read-only product projection MUST NOT change payment dates, stock ownership rules, product recipes or inventory balances.

### Key Entities

See [data-model.md](data-model.md). Existing records and their authorized display projections remain separate; no historical customer or stock fact is inferred from a label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

All four planned/sold fixture combinations agree between hover and detail; a shared sale appears once per visit projection and each distinct sale line survives. Zero false posted-stock labels are produced in failed, missing or merely paid cases. Repeated and concurrent recovery yield one linked realized entry in the local fixture. Restricted personas receive zero forbidden product, monetary or stock fields.

## AS-IS

The hover/detail mismatch was reported and has not been reproduced at runtime. Source already renders planned catalog products in the detail drawer, including quantity editing and paid badges. The hover products are different data. On the POS calendar, the hover lists every physical-product line of each linked sale whose status is neither `void` nor `voided`, including product lines on the same sale that have no booking link, deduplicated by ticket. Those lines carry description, quantity and total, without stable line or product identity, and the hover labels a line whose total is 0 as a gift. The scheduling calendar does not read sales (`loadCalendarWindow` skips `bookingTicketLinks` when `pos` is false), so its hover shows no sold products. The detail products come from products planned on the visit anchor, so a ticket-only garment can appear in the POS hover while the planned-products section is empty. The detail ticket read has no ticket-status filter: `void` tickets reach the detail ticket list and its other-line previews, and the drawer and context menu treat only `voided` as not paid. Completion can succeed with a stock warning; the existing drawer already displays warnings and an accrual summary, which is read for the requested booking rather than the visit anchor.

For the reported case, the linked [read-only evidence summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json) (observed 2026-11-16T19:20:30.051Z) records a linked sale containing a Faja M product line with no booking link, quantity 1 and total 0.00. It also records that the catalog maps both Faja M and Faja L to the consumed stock item FAJA-L, and that stock movement STE-2026-00578, which issues FAJA-L, is sourced from that POS ticket (`metadata.source = 'pos'`). The FAJA-L issue therefore follows from the product mapping and the POS posting, not from a booking accrual. Whether that mapping is correct belongs to the separate F1 integrity investigation; the display change must not relabel the stock line as Faja M. A root read-only inspection on November 16 also found no planned booking-product rows for the reported visit group, which matches the ticket-backed hover versus anchor-plan detail mechanism. That read, the visit dates and the cause of the zero total are not in the linked summary; they are unlinked private observations that T003 re-reads before any code change. No browser reproduction or deployment identity has been established.

Evidence is pinned to Hub `c6c2d5739572356239c4048c0f564f40b0768adc` and enumerated with exact source anchors in [research.md](research.md). Source is not runtime or deployment proof. Meeting reports and tentative names come from the parent [proposal](../../proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md). Names and personal account IDs are not copied here.

## TO-BE

Show staff the same correctly scoped sold and planned products in appointment hover and detail, while keeping payment and actual stock posting distinguishable. Preserve tenant and personal-account boundaries, existing business records and effective permission scopes. New user-visible language must work in Spanish and English, and keyboard access must cover the same operations as pointer access.

## DELTA

Reuse the drawer planned-products section. Extend the existing sold-product projection with stable sale-line identity and add a sold-products section to detail; use the same projection for hover. Preserve a separate planned facet and existing accrual summary; qualify warning persistence and retry controls before claiming they are missing. F3 owns proven shared retry or atomicity defects and their qualification. F1 remains the separate historical-integrity investigation and case-specific repair slice.

Required regression and browser oracles are in [quickstart.md](quickstart.md) and dependency-ordered in [tasks.md](tasks.md).

## Dependencies, Assumptions and Non-goals

Use current organization/account configuration only after an authorized identity and scope check; no production IDs are guessed or committed. Synthetic fixtures stand in for personal accounts and customer records. The explicit changed behavior is defined in this feature’s contract; other existing semantics remain authoritative. WhatsApp linking, messages, remote model calls, password changes and unrelated redesigns are excluded.

## Alternatives Considered

Reject merging sold products into the appointment-consumption bucket or attributing every co-ticket line to the current visit: both invent delivery/provenance. Keep sale and stock provenance separate, include only authorized current-group links and unassigned co-ticket products, and retain the authorized full-sale link for broader context. Reuse the existing stock confirmation/retry path rather than introduce another posting engine. Detailed alternatives are in [research.md](research.md).

## Design contracts and dependencies

[Facet admission and recovery](contracts/admission-recovery.md) defines independently authorized sold and stock detail, money masking and fresh confirmation. The [wire contract](contracts/wire.md) defines the versioned facets and financial guards, and the [implementation inventory](implementation-inventory.md) assigns every changed file and test. F3 (specs/124-stock-correction-workflow) owns shared source retry and atomic posting; this slice adds confirmation and UI wiring after that foundation is qualified. Technical limits, transaction checks and native tests are in the contracts.

## Decisions made during review (owner to confirm)

These resolve behavior the reviewed design left open. Each takes the conservative option; the contracts implement them as written here.

1. **Void tickets in detail.** Detail sold rows, ticket references, other-line previews, line counts and the full ticket wire exclude tickets whose status is `void` or `voided`, the same predicate the hover read uses. Server-computed paid status uses the same predicate. Regression cases cover both statuses.
2. **Scheduling calendar stays out of scope for sold products.** FR-001 hover/detail parity applies to the POS calendar. The scheduling calendar keeps `pos: false`, reads no sales and shows no sold-product rows in its hover, as today; its bookings carry a sold facet of `unavailable` with reason `not_in_slice`. It still adopts the versioned projection and financial guards. The scheduling-hosted drawer reads detail through its own route and shows the sold facet when POS is admitted.
3. **Gift label.** Each sold row carries a server-computed `gift: boolean | null`: `true` when the recorded line total is 0, `false` otherwise. The line total itself is not shipped in the sold row. Because the flag reveals a money fact, the server sets it only when financial fields are admitted and sends `null` otherwise. Hover and drawer show the gift label only for `true`.
4. **Stock anchor keying.** The new anchor stock facet is read for the server-resolved visit anchor, whichever member was requested, so the drawer's fallback to the clicked member's detail cannot show that member's accruals as the visit's.
5. **Group bound.** The scheduling caller passes the already-bounded member array (at most `MAX_GROUP_MEMBERS = 8` from `scheduling-bookings.service.ts`) to the stock helpers; `stock-accruals.service.ts` does not import that constant, which would create a circular service import.

## Approval and evidence boundary

This is data-tagged work. Owner approval of the concrete spec and any resolved configuration or data diff is required before implementation, and owner merge is required. Planning is authorized; those later gates are pending. Pending runtime observations have verification-first outcomes (no-op or stop) and are not treated as proven defects. Independent review evidence is recorded under `egm/`. No implementation, test run, release or live completion is claimed by any document in this package; companion artifacts do not repeat this statement.

Stock costs remain unavailable when their denomination is unverified; quantity facts and independently authorized billing money remain available under their own gates, as defined in the wire contract.

## Detailed Implementation Plan

This boundary separates the stakeholder specification from the complete technical companion artifacts. Source is pinned; tests and implementation are proposed unless an explicit evidence receipt says otherwise. Independent EGM records live under egm/. Owner data/security approval and owner merge remain pending.

### Review artifact: plan.md

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

### Review artifact: research.md

# Research: Consistent booking product projections

## Evidence baseline and explicit reading list

Read the root AGENTS.md; pinned Hub AGENTS.md and its CLAUDE.md include; `.claude/skills/ui-design-governance/SKILL.md`; `.claude/skills/speckit-specify/SKILL.md`, `speckit-plan/SKILL.md`, `speckit-tasks/SKILL.md`; `.specify/memory/constitution.md`; active spec, plan and tasks templates; and parent proposal item F5.

Hub source is the private pinned checkout `.local/faces-followups-2026-11-16/hub-source`, HEAD `c6c2d5739572356239c4048c0f564f40b0768adc`, verified by `git rev-parse`. Source paths below are relative to Hub; links pin that commit. The meta registry reports Hub master and Bun. R1–R16 label the evidence rows of this table only.

| Evidence | Source anchor | Finding / reading purpose |
| --- | --- | --- |
| R1 | [`src/lib/components/scheduling/calendar-window.ts:192`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/scheduling/calendar-window.ts#L192) | SoldProduct and productsForVisit currently deduplicate whole tickets, returning description/qty/total only. |
| R2 | [`src/lib/components/scheduling/BookingCalendar.svelte:2632`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/scheduling/BookingCalendar.svelte#L2632) | Hover soldProducts reads ticket products; grouped visit uses same helper at 2816. |
| R3 | [`src/server/services/pos-accounts.service.ts:637`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos-accounts.service.ts#L637) | bookingTicketLinks selects non-void ticket product lines, including all product lines of linked sales, independently of calendar payment window. |
| R4 | [`src/server/services/scheduling-bookings.service.ts:2816`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/scheduling-bookings.service.ts#L2816) | visitProductsForAnchor returns planned sched_booking_products joined to catalog; paid is presence of non-void line, not stock state. |
| R5 | [`src/server/services/scheduling-bookings.service.ts:3659`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/scheduling-bookings.service.ts#L3659) | Detail ticketRefsForBookings and visit-level ticket grouping; detail assembly uses visit products at 3943. |
| R6 | [`src/lib/components/scheduling/BookingDetailDrawer.svelte:1238`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/scheduling/BookingDetailDrawer.svelte#L1238) | Existing planned products section; stockWarning handled at 510; accrual summary at 1478. |
| R7 | [`src/routes/(app)/pos/appointments/+page.server.ts:33`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/pos/appointments/+page.server.ts#L33) | Calendar load gets independent pos/scheduling/stock/crm dataset handles. |
| R8 | [`src/server/services/calendar-window.service.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/calendar-window.service.ts#L1) | Shared calendar projection orchestration; inspect exact candidate when implementing. |
| R9 | [`src/routes/api/scheduling/bookings/[id]/complete/+server.ts:29`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/scheduling/bookings/%5Bid%5D/complete/+server.ts#L29) | Business completion commits before realization; re-POST documented as retry of realization alone. |
| R10 | [`src/lib/components/scheduling/booking-detail-drawer.mounted.test.ts:1`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/scheduling/booking-detail-drawer.mounted.test.ts#L1) | Existing mounted detail regression harness, to extend rather than simulate static markup. |
| R11 | [`src/server/services/pos-accounts.service.ts:675`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos-accounts.service.ts#L675) | Hover sale read excludes ticket status `void` and `voided`; `visitProductsForAnchor`'s paid check uses the same pair (`scheduling-bookings.service.ts:2856`). `ticketRefsForBookings` (R5) has no status predicate; the drawer (`BookingDetailDrawer.svelte:613`) and context menu (`calendar-context-menu.ts:78`) treat only `voided` as not paid. |
| R12 | [`src/server/services/calendar-window.service.ts:99`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/calendar-window.service.ts#L99) | `bookingTicketLinks` runs only when `pos` is true, so scheduling-calendar bookings carry no tickets and their hover shows no sold products. |
| R13 | [`src/lib/components/scheduling/BookingCalendar.svelte:2643`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/lib/components/scheduling/BookingCalendar.svelte#L2643) | Hover gift rule: a sold line with `total === 0` renders the `pos_calendar_gift` label. |
| R14 | [`src/server/services/scheduling-bookings.service.ts:3927`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/scheduling-bookings.service.ts#L3927) | Detail accrual summary is read for the requested booking ID. The drawer re-fetches the anchor and falls back to the member detail if that GET fails (`BookingDetailDrawer.svelte:296`). |
| R15 | [`src/server/db/pg-schema/stock.ts:251`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/db/pg-schema/stock.ts#L251) | `stk_accruals`: UUID primary key, `item_id` references `stk_items` with `ON DELETE CASCADE`, unique index on `(org_id, source, source_id, item_id)`; value scalars carry no currency. |
| R16 | [`src/server/services/stock-accruals.service.ts:350`](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/stock-accruals.service.ts#L350) | Pinned `realizeAccruals(ctx, input)` is not transaction-scoped: it runs separate `withOrgCore` calls and helpers that own their transactions. No `realizeAccrualsInTx` or stock-v1 gate exists. The complete route maps every realize error to HTTP 200 `realize_failed` (`complete/+server.ts:70`). |

## Current behavior and uncertainty

The AS-IS section of [spec.md](spec.md) summarizes current behavior and the reported case; R1–R16 are its source anchors. The sanitized summary does not contain the planned-products read, visit dates or discount; those remain unlinked private observations to re-read before coding.

## Decisions, rationale and alternatives

Decision: preserve the semantic distinction between sold and planned products. Rationale: bookingTicketLinks loads physical sale lines, while visitProductsForAnchor loads anchor plans; blindly assigning one to the other would silently create business facts. Alternatives: copying ticket products into sched_booking_products corrupts planning history; removing hover products hides useful evidence; implementing another product section without the sold/planned distinction repeats existing UI.

Decision: enrich the existing `BookingTicketLink`/`SoldProduct` shape with ticket line ID and optional catalog product ID (where present), retain recorded description as the historical name, nullable source bookingId and relation (direct/group/co-ticket-unassigned) under the explicit current authorized visit-member predicate, and reuse this sold facet in detail ticket refs. Resolve group membership server-side from current visitMembers rather than assuming all booking links on a ticket are the same event. Keep new server identifiers stable and additive for older clients; current-client input lacking required provenance is unavailable rather than guessed. Do not merge two same-description lines. A separate UI type carries provenance instead of reusing `VisitProductLine`.

Decision: warning/retry is a verification-first slice. The drawer already reads stockWarning into its error surface and the API documents re-POST recovery. Add explicit member recovery facts and the separate grouped stock-only recovery entry in contracts/behavior.md. The current group-status handler and existing dialog skip completed members; the selected action instead uses their individual /complete retry and bypasses the ordinary lifecycle callback. Do not fabricate an error history when only open accrual state is stored. F3 owns mutation idempotency and shared retry qualification; F1 owns historical-integrity investigation and case-specific repair. F5 escalates a proven engine failure to F3.

## Cross-cutting design decisions

Use existing Svelte 5 components and semantic design tokens; no generated token CSS editing. User-visible labels go through Paraglide message catalogs and `bun run i18n:compile`. Existing routes retain route-design-manifest and RBAC coverage; new route or module creation is excluded. Dataset denial, owner scoping and field masking must be tested both before serialization and in rendered UI; hiding controls alone is insufficient. Keep source-code and production/configuration evidence distinct.

## Review limits and execution preconditions

The source list proves inspectable code paths, not current deployment identity. The [local sanitized summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json), observed at 2026-11-16T19:20:30.051Z, records the bounded case evidence quoted in the spec. No private raw records or customer identities are reproduced.

## Owner-selected relation and recovery decisions

The owner selected omission of non-null product links outside the current authorized visit-member set. This avoids a new relation category and prevents disclosure or false consumption allocation; the null-booking Faja M remains a sold line with relation `co_ticket_unassigned`. Inspecting `ConsumptionConfirmDialog` and `visitStatusResponse` shows that ordinary group completion excludes completed members, whereas the individual handler expressly skips repeated lifecycle completion and retries realization. contracts/behavior.md selects the separate recovery mode and per-member request and result policy. Reject reusing group status for recovery, assuming all completed members require stock, silently treating denied reads as zero consumption, or adding another stock writer.

Complete open-accrual confirmation and its HTTP 409 refusal are in [admission-recovery.md](contracts/admission-recovery.md); F3 owns the retry engine. Pinned `pg-schema/stock.ts:251–287` stores accrual value scalars without currency (R15), so the [wire contract](contracts/wire.md) selects an explicit unavailable cost display rather than a billing or display-currency inference.

### Review artifact: data-model.md

# Data model: Consistent booking product projections

## Terms

This package uses one name per concept:

- **Sold line**: one POS ticket line of kind `product` on a linked sale whose status is neither `void` nor `voided`. Other documents may say "sale" for the POS ticket; "invoice" means only a finance invoice, never a POS ticket.
- **Planned product**: a `sched_booking_products` row on the visit anchor.
- **Ticket overlay**: the POS calendar's whole-ticket timeline rows (historically the `invoices` variable), which are POS tickets, not finance invoices.

## Projections

`PlannedVisitProduct` remains the existing anchor-booking `productId`/name/qty projection, with price and paid fields only under independent financial admission. A sold line is separate: `ticketId`, `lineId`, nullable `productId` and `bookingId`, recorded description and quantity, `relation` and the server-computed `gift` flag (spec decision 3). Its money (`soldTotals`) is carried only in the payment facet.

Relation is `direct` (the current anchor), `group` (another authorized current-visit member) or `co_ticket_unassigned` (null `bookingId`). Non-null outside, deleted or unauthorized other visits are excluded from both sold rows and `ticketCard.otherLines` without reading that booking. Missing stable IDs make the facet unavailable; an unassigned garment is never distributed across every visit sharing the ticket.

Every planned, sold, payment and stock read facet is `available`, `empty`, `denied` or `unavailable`, independently of persisted accrual `open`, `realized` and `released` states. A missing or denied accrual never proves no consumption. Matching product IDs never prove fulfillment; the source entry and `realizedEntryId` are the stock evidence. No new persisted business table is introduced.

## Validation and lifecycle

Existing validation, enum and permission rules remain binding. No source record is manufactured from display text. Read-only projection tests and no-op or stop outcomes run before any write. Forbidden states are in contracts/behavior.md and real-database proof is in quickstart.md. A proposed shape is not a claim of existing persisted schema.

## Recovery projection and attempt state

`stockRecovery` is an independently authorized read facet, not a new persisted business state. For at most 8 server-owned `{bookingId, status}` authorized visit members, passed in by the scheduling caller (spec decision 5), it contains current accrual counts, at most one active source-entry identity and status, and an eligibility of `retry_saved`, `confirm_open`, `not_needed` or `manual_review`. The decision table and denial semantics are in [contracts/behavior.md](contracts/behavior.md).

A dialog attempt snapshots eligible member IDs in stable order and holds per-member `pending`, `warning`, `resolved`, `error` or `unknown` display results. These are transient UI states only. Persisted source, ledger and accrual facts determine the next attempt after refresh. Saved-source retries send an empty body and preserve the current saved movement; absent-source open-accrual confirmation sends explicit actual lines, or deliberately confirmed empty lines. No response warning or unknown outcome is called posted without an authoritative reread.

`confirm_open` carries the bounded confirmation projection and the server's `expectedOpenCount` and fingerprint from [contracts/admission-recovery.md](contracts/admission-recovery.md). The request body adds the optional `recovery` object only for this branch, never for `retry_saved`. The server compares the full current set under the F3 write gate (see the plan glossary) before any release or post. Every foreign detail and hover money, sale or stock field follows the required handle and policy matrix in that contract.

`BookingStockCostFacet` is the closed non-value union in [wire.md](contracts/wire.md); it is independent of available billing money and quantity facts.

### Review artifact: contracts/admission-recovery.md

# Independent detail facets and complete recovery confirmation

## Detail and hover authority

The existing `getBookingDetail(ctx, id, {maskAttendeePii})` reads ticket, payment and invoice facts using the scheduling handle. That is AS-IS, not independent admission. Change its options to require `foreign: {pos: CoreCtx | DatasetDenied, finance: CoreCtx | DatasetDenied, stock: CoreCtx | DatasetDenied}` plus an explicit `canReadFinancialFields: boolean` and `maskAttendeePii`. `bookingDetailResponse` resolves each handle through `datasetCtx(locals, ...)` and actual module availability independently. Monetary permission is `finance:view` plus the existing finance field tier `>= SENSITIVE_FIELD_LEVEL` with effective-authority narrowing, never an invented POS or stock field tier. Both route-family detail wrappers invoke this handler.

- If POS is denied, no ticket, line, payment or emission query runs and the sold and ticket facets are denied.
- If finance is denied or the tier is restricted, omit `total`, `subtotal`, `discount`, `lineTotal`, payment amounts, currency summaries, `unitPrice`, invoice references, funding amounts and the sold-line `gift` flag before JSON serialization. Do not send zero or null as a readable financial value. POS-admitted sold identities, recorded description and quantity remain without money. Finance denial does not hide permitted product descriptions or present the booking as unpaid.
- Invoice lookup and link require an admitted finance handle, the native `/finances/invoices/<uuid>` route and a same-org record. The POS full-sale link requires the native `/pos/tickets/<uuid>` route and a same-org ticket; a denied route produces no `href`.

Use the stock handle for the anchor stock facet (read for the server-resolved anchor, spec decision 4) and the bounded `stockRecovery`, never a scheduling fallback. Planning identity, name and quantity remain the existing host-authorized catalog projection; any finance amounts read for planned `unitPrice`, funding or invoice use `foreign.finance` and the financial policy. POS rows use `foreign.pos`, org equality and the current native record predicate. All foreign contexts derive from the same authenticated `locals` and match `ctx.tenantId` and `profileId`; no client context or broader global handle. Stock recovery gets server-owned authorized visit member IDs and statuses, at most 8. Preserve existing scheduling and POS route edit and view boundaries and attendee masking independently. No CRM or attendee metadata is copied into sold fields.

Each planned, sold, payment and stock facet uses `available` (rows nonempty), `empty` (successful admitted read returned no rows), `denied` (a required dataset, module or field gate failed) or `unavailable` (query, decode, missing required IDs or failed source relation). Unknown availability never drives paid or unpaid badges, retry target selection, search or totals as if empty. Null or omitted monetary fields render as unavailable without a money formatter or an inferred `0`. When POS permits basic rows but finance denies money, sold is available while the payment facet is denied. The drawer and hover consume the same discriminated projections; compatibility adapters are explicit, with no untyped spreading of old ticket objects. Existing ticket, payment and plan rendering checks the discriminator before reading money. Required options are updated at every `getBookingDetail` production and test caller listed in the inventory census; there is no optional fallback to the scheduling context.

`loadCalendarWindow`'s `foreign` option becomes required, with its existing `pos`, `stock` and `crm` handles plus `finance` and an explicit `canReadFinancialFields`; remove the `ctx` default for these projections. Its four page and JSON callers and its test callers are listed in the inventory. Resolve explicit POS, finance and stock admission on both page and JSON entry points before calling the new projections. `opts.pos = true` is not financial permission. Reuse the same serializer and policy options as detail so host, field and denied cases agree. Existing calendar layout and color behavior stays outside this change.

## Every sold-description surface uses the same predicates

At the pinned baseline the status predicates differ: the hover read (`bookingTicketLinks`) and `visitProductsForAnchor`'s paid check exclude `void` and `voided`; `ticketRefsForBookings` (detail) has no status predicate, so `void` tickets reach detail tickets and `otherLines`; the drawer and context menu treat only `voided` as not paid. All detail surfaces now exclude both `void` and `voided` tickets (spec decision 1), and server-computed paid status uses the same predicate.

Apply the current-visit direct, group and null-unassigned inclusion predicate to `BookingTicketLink.products`, detail sold products and `ticketRefsForBookings.otherLines` used by `ticketCard`. Today `otherLines` collects lines outside the visit; that preview changes. `otherLines` holds descriptions of admitted `co_ticket_unassigned` rows only, after the same same-org POS admission, never non-null outside-visit booking lines. Current-visit linked rows belong in their own sold projection and are not duplicated as `otherLines`. In this preview, `lineCount` counts the admitted displayed sale lines only. Ticket monetary totals, when financial permission allows, remain full recorded ticket totals shown with a translated whole-sale label; they are never recomputed from displayed visit products. Keep the separately admitted full-sale `href`. The null-linked zero-total Faja M remains present; a deleted or unauthorized non-null other visit stays excluded without looking up that booking. Hover, drawer, accessible text, export and tooltip previews use the same filtered strings.

## Complete open-row read model

Extend `stockRecoveryForBookings` with confirmation for `confirm_open` members only. In one owned `REPEATABLE READ READ ONLY` transaction on the stock handle, first count same-org rows with `source = 'booking'`, the member's `sourceId` and `status = 'open'`. Only when the count is at most 1,000, select at most 1,001 rows in stable ID order. A count above 1,000 yields eligibility `manual_review` and confirmation unavailable with internal diagnostic `open_rows_overflow` (wire reason `capacity`), with no editable rows or action. Never reuse the `listAccruals` response (`LIMIT 1000`) as complete evidence. Count raw accruals before item joins; require the counted number of distinct accrual IDs and all referenced same-org item, UOM and conversion evidence. A missing item join, invalid numeric or version, or a different count yields `manual_review` or unavailable, not a shorter list. For 1,000 rows all 1,000 must be represented. No rows or counts come from different snapshots. The global legacy accrual API is unchanged.

Add `listRecoveryOpenAccrualsInTx(tx, stockCtx, bookingId)` returning `{openCount, rows, expectedOpenFingerprint}`. The quantity-only rows are `{accrualId, itemId, qty, qtyConsumption, status: 'open'}` plus the admitted item name, UOM and conversion fields that `completionLinesFor` needs; no estimated or realized cost or rate. Use the same row and conversion snapshot to show quantities. The fingerprint is the SHA-256 of the sorted UTF-8 serialization of `{orgId, bookingId, sourceEntryState: 'absent', openCount, accrualRows: [{id, rowSha256}], itemRows: [{id, rowSha256}]}` in ID order, where `rowSha256` hashes PostgreSQL `to_jsonb(row)::text` under UTC without Number or date reserialization. Include every item conversion record used, not names alone. Hashes are server-produced freshness evidence, never an owner approval. The output keeps bounded editable rows plus the hash, no raw row JSON. `stockRecovery` returns the same `openCount` and confirmation projection; a corrupted or oversized count disables confirmation.

The dialog requires, before enabling confirm: a fresh available confirmation, `openCount > 0`, `rows.length === openCount`, unique accrual IDs and agreement with the `stockRecovery` `openCount`. Any mismatch, denial, failure, zero rows or overflow refreshes or shows manual review and sends zero POSTs. Do not call defaults or a second partial accrual GET. Aggregate actual input only with `completionLinesFor` and show expected versus confirmed actual quantities; `[]` is a deliberate confirmed zero, never a failed read. After the fetch, client delay or another client can change the set, so client checks alone are insufficient.

## Guarded server precondition on the existing complete route

**F3-provided prerequisites.** The following do not exist at the pinned baseline and are created by F3 ([transaction-protocol.md](../124-stock-correction-workflow/contracts/transaction-protocol.md), F3 tasks T008–T010):

- `realizeAccrualsInTx(tx: CoreTx, ctx: CoreCtx, guard: StockWriteGuard, input: RealizeInput): Promise<RealizeResult>` in `stock-accruals.service.ts`;
- the F3 write gate (`lockStockWrite` in `stock.service.ts`: the stock-v1 lock, then the existing authority lock `hashtextextended(orgId, 112)`), and the accrue, release and realize writers that take it.

At the pinned baseline `realizeAccruals(ctx, input)` runs separate `withOrgCore` calls plus `findEntryBySource`, `createServiceIssue` and `submitEntry`, which own their transactions, and the complete route maps every realize error to HTTP 200 `realize_failed`. The precondition below therefore cannot be implemented before F3 lands.

Extend only the existing complete body schema with:

```ts
recovery?: {
  mode: 'confirm_open';
  expectedOpenCount: number; // integer, 1 to 1,000
  expectedOpenFingerprint: string; // 64 lowercase hex characters
}
```

When `recovery` is present, require an explicit `lines` array (including a deliberately confirmed `[]`), current booking status `completed`, existing host edit rights plus `stock:view` and `stock:manage`, and independently admitted record and member scope. A noncompleted, foreign, closed or ineligible source is refused before any lifecycle transition. This branch never calls `setBookingStatus`. The ordinary complete body without `recovery` and the `retry_saved` `{}` body keep their current semantics; recovery is never inferred from `lines`. The POS alias and the scheduling route share the same validator and service; no new endpoint or route prefix.

F5 extends `RealizeInput` with this optional precondition plus a required server-derived `recoveryHost: 'pos' | 'scheduling'` whenever `recovery` is present. The body cannot set `recoveryHost`; the shared handler forwards its trusted literal. Inside F3's passed transaction, after the F3 write gate is held and before any draft, release, ledger, bin or stamp change: re-read booking status, membership and source ownership; require no active source entry; recount open rows and recompute the fingerprint through `listRecoveryOpenAccrualsInTx` without opening a new transaction. Compare the current count to both `expectedOpenCount` and the selected distinct count, compare `expectedOpenFingerprint` byte for byte, and require a current count from 1 to 1,000. Any added, removed, status-changed, quantity-changed, UOM-changed or conversion-changed row, a newly appeared draft or submitted entry, or a booking status change produces a typed HTTP 409 `recovery_preview_stale` with zero stock, accrual or lifecycle effects. There is no refresh-and-apply. The fingerprint is not an attestation: authorization and source lookup are repeated on the server.

Only after equality, call F3's same-transaction realization with the confirmed actual lines, including an intentional `[]` that releases the reviewed set. The complete handler catches the typed stale refusal before its generic `stockWarning` catch and returns HTTP 409; no HTTP 200 `realize_failed` wrapper can hide this conflict. The dialog stops remaining sequential requests and refreshes. For `retry_saved` `{}`, the current saved draft remains authoritative and no frozen-lines approval is claimed. Once F3 lands, the normal accrue, release and realize writers take the F3 write gate, so the precondition and posting cannot be interleaved by those writers. No second writer, lifecycle transaction or background job is created.

The recovery body contains no actor, org or authorized-member list. The handler resolves its source booking using current native host admission and passes the server-derived host to the service. Under the F3 write gate, fresh authority requires that host's edit capability plus `stock:view` and `stock:manage` and independently verified same-org record scope, including effective-authority narrowing. Existing source lookup and same-org completed status are re-read through the passed transaction. Any future record-owner predicate must match the existing host reader and writer; no caller-provided set grants access. Paths without `recovery` keep their current admission and lifecycle and stock warnings.

Handler extraction: place exported `completeBookingResponse(ctx, locals, request, id, host: 'pos' | 'scheduling')` in the existing shared `_handlers.ts`, owning the current complete body schema, status and error orchestration plus the new recovery branch. Each `+server.ts` exports only its POST handler and delegates with a literal host: the scheduling wrapper passes `'scheduling'`, the POS wrapper `'pos'`. Do not add a named helper export to a SvelteKit `+server` module. Preserve each central auth and module rule, including the composite module availability, and ordinary complete behavior. The recovery branch skips all status mutation and calls the guarded realization with its precondition; no duplicated realization math or separately committed precheck.

## Mandatory regressions and native qualification

Unit, route and mounted tests cover both hosts with POS denied, finance denied or tier restricted, stock denied, owner and foreign controls, failed versus empty and basic product without money; assert no foreign queries, no forbidden JSON and no false paid or unpaid badge. Cover `void` and `voided` tickets on the same visit in detail sold rows, `otherLines`, `lineCount` and paid status. Two unrelated visits sharing one sale prove that `otherLines`, `ticketCard`, hover and accessible text exclude every outside-visit non-null description while the null Faja M remains, and that the permitted full-sale link and totals carry the translated whole-sale label.

Real guarded SQL cases must respect the `stk_accruals` constraints (research R15): UUID primary key, `item_id` foreign key with `ON DELETE CASCADE`, and one row per `(org_id, source, source_id, item_id)`. Feasible fixtures:

- **Open-count boundaries**: one booking with 999, 1,000 and 1,001 open accruals, which needs a generator of at least 1,001 distinct stock items in the fixture org.
- **Lost item join**: an accrual whose `item_id` references an item in another org, which the same-org item join drops; deleting the item instead cascades the accrual away.
- **Count mismatch**: a row inserted or released between the count and the select on a second backend.
- **Duplicate accrual ID**: not constructible in PostgreSQL; covered as a decoder-level vector in `booking-product-facets.test.ts` (duplicate `accrualId` in a confirmation payload yields unavailable).
- Source absent and present, and a confirmed zero.

After fetching confirmation, commit added, removed, released, open-quantity and item-conversion changes on a second backend before the POST, then require HTTP 409 and zero release, ledger, bin or status effects. Race `confirm_open` against accrue, release and another source retry in both arrival orders under the F3 write gate; one valid request may commit before the other waits, and the stale second request refuses, or uses a saved retry only after a fresh explicit action. Refreshing after an unknown response does not repeat lifecycle or payment. Compare authoritative row digests and the one-source-owned-entry invariant.

Extend the test `stock corrections against PostgreSQL repeated concurrent booking completion reuses frozen draft and submitted source once` (semantic case 9 of the 13 required by [F3 native-qualification.md](../124-stock-correction-workflow/contracts/native-qualification.md)) in the F3-created `stock-corrections.sql.integration.test.ts` with these F5 precondition cases. Do not add a new test name or file or change the 13-assertion minimum. F5 modifies this file only after F3 qualifies it. Use its owned child database fixture, passed source helpers and observed barriers. Run the full qa-native lane and report from F3 native-qualification.md on the F5 candidate, plus the ordinary, route, mounted, full, UI and browser gates. No mocked freshness check or frontend-only cap assertion substitutes for this real test. The source engine remains F3-owned; F5 owns only the additive guarded confirmation option, read projection and UI wiring.

## Legacy compatibility boundary

Count and fingerprint protection applies to the new `confirm_open` recovery workflow and any caller supplying `recovery`. Its UI must always send `recovery`; omission is a UI defect covered by both-host mounted and route tests. Ordinary complete bodies without `recovery`, including older clients sending `lines` on a completed booking, keep legacy behavior and are not claimed protected by this protocol. No owner approval, freshness receipt or blanket completed-booking guarantee is inferred for those calls. Saved draft and submitted-source retry remains source-idempotent under F3. Test this compatibility distinction and label the qualification receipt accordingly; requiring a refresh for all legacy completed calls would be a separate lifecycle and API compatibility decision.

### Review artifact: contracts/behavior.md

# Behavior contract: Consistent booking product projections

## Sold and planned projections

Extend `BookingTicketLink.products`/`SoldProduct` and detail ticket products to the sold-line shape `SoldProductBasic` in [wire.md](contracts/wire.md): `{ticketId, lineId, productId: null | UUID, bookingId: null | UUID, description, qty, relation, gift}` plus the permitted ticket human ID and source link. The recorded description is the historical label. Line totals and other monetary fields are carried only in the payment facet and are absent when the caller cannot read them; `gift` is `null` in that case (spec decision 3). New server rows always have `ticketId` and `lineId`; deduplicate by that pair, never by description. Planned `products[]` remains a separate anchor-booking projection and never receives copies of sold lines.

Hover and detail read only tickets whose status is neither `void` nor `voided` (spec decision 1).

Resolve the current visit, its canonical anchor and its authorized member IDs on the server before serializing sold rows. The anchor is stable for the visit rather than whichever member was clicked, so hover and detail assign the same relation. The serializer receives those IDs, the current anchor ID and permitted ticket-line records; caller payloads cannot supply the authorized set. Hover and detail both use this decision table:

| Source line bookingId | Current-visit sold facet | Relation / provenance |
| --- | --- | --- |
| Equal to the resolved visit anchor ID in the authorized set (the same ID as the singleton booking when ungrouped) | Include once | `direct` |
| Another ID in the current authorized visit-member set | Include once | `group` |
| null | Include once | `co_ticket_unassigned`; label only as associated with the linked sale |
| Non-null ID outside that set, including a deleted, unavailable or unauthorized other visit | Exclude | Do not fetch or serialize the other booking, its identity or its delivery state |

Ticket sharing alone never proves a group or consumption relationship. Retain the existing authorized full-sale link for wider sale context. The reported Faja M has null `bookingId` and remains visible as `co_ticket_unassigned`. Identical descriptions with different line IDs remain distinct. If input lacks the identifiers this table needs, mark the sold facet unavailable and retain only the permitted sale link; do not guess a relation or merge descriptions. The versioned `productFacets` wire and detail version header in wire.md govern old clients; no masked legacy financial object is fabricated. This creates no new relation category.

On the scheduling calendar host the sold facet is `unavailable` with reason `not_in_slice` and its hover shows no sold rows (spec decision 2).

The batched planned-anchor reader uses only the calendar's already authorized visit anchors and the existing catalog and paid semantics. Planned, sold, payment and stock facets each carry `available`, `empty`, `denied` or `unavailable`. A denied or failed read is never normalized into proof of no products or no stock.

## Persistent member recovery read model

At the pinned baseline, `getBookingDetail` reads `accrualSummaryForSources(ctx, 'booking', [id])` for the requested booking, not the anchor, and the drawer gets the anchor's summary only by re-fetching the lead. The new US1 stock anchor facet is read for the server-resolved anchor (spec decision 4); it does not infer each member's recovery state.

Add `stockRecoveryForBookings(stockCtx, authorizedMembers)` in `stock-accruals.service.ts` and a `stockRecovery` facet on booking detail. `authorizedMembers` is the server-owned array `{bookingId, status}` obtained through the scheduling visit read authority, or the authorized singleton; it is never accepted from a client payload. The stock helper uses the supplied IDs and copies those already-authorized statuses rather than querying scheduling tables with a stock handle. The scheduling caller enforces `MAX_GROUP_MEMBERS = 8` (exported by `scheduling-bookings.service.ts`) before the call and passes a corrupted larger set as unavailable rather than calling the helper; `stock-accruals.service.ts` does not import the constant (spec decision 5).

The helper uses bounded source-ID batches, org equality, existing accrual rows and active `stk_entries` with metadata `source = 'booking'` and `sourceId` in that set. It reads open, realized and released counts and source-entry identity and status; it does not resolve current product recipes. Count active source entries per admitted ID first; duplicate sources are manual review, not an arbitrary latest-row choice. Fetch entry identities only for unique counts, so corrupted duplicates do not create an unbounded array. Return one row per admitted member:

`{bookingId, status, openCount, realizedCount, releasedCount, sourceEntry: {id, status: "draft" | "submitted"} | null, eligibility: "retry_saved" | "confirm_open" | "not_needed" | "manual_review"}`.

- Completed, one draft or submitted source entry, and either an open accrual or a draft entry: `retry_saved`. A submitted source with open accruals needs reconciliation, not a new issue.
- Completed, no active source entry and at least one open accrual: `confirm_open`.
- Completed with all accruals realized or released and no draft: `not_needed`.
- No source entry and no open, realized or released evidence: `manual_review`, not inferred missing consumption. Multiple active sources, conflicting state or inaccessible required evidence also means manual review or unavailable.
- Pending and accepted members use the existing completion flow. Cancelled, rejected and no-show members are never recovery targets; this action never reopens or completes them.

`bookingDetailResponse` in `api/scheduling/bookings/_handlers.ts` resolves the stock dataset handle independently and passes it into detail assembly. A denied handle yields a denied stock facet with no source IDs, costs or retry targets; a failed read yields unavailable, not an empty list. Pass the same permitted member set into the helper. Do not call the current unconditional accrual read with scheduling authority when stock is denied. POS and scheduling hosts retain their existing route authority; no client-provided actor or org is introduced.

## Grouped stock-only recovery

Add `mode: "complete" | "recover_stock"` to `ConsumptionConfirmDialog`, defaulting to `complete` for existing callers. Add optional `recoveryMembers` and `onrecovered(results)` props; recovery mode requires the server-projected member and evidence rows, while the existing `members` and `oncompleted` props keep their ordinary-completion meaning. Add a separate drawer recovery action; do not reuse `completeOpen`'s live-member filter or its `patchStatus("completed")` callback. Ordinary completion behavior is unchanged. Recovery is available only with the host's existing edit right, a permitted stock read facet and eligible authorized completed members.

On open, refresh detail and recovery facts and snapshot the distinct eligible member IDs in ascending UUID order. Display each member's evidence and intention before confirmation. No current recipe or default-consumption fallback runs in recovery mode:

- `retry_saved`: show the saved stock entry link and status as authoritative, not a new editable consumption plan. POST `{}` for this branch only. Existing `realizeAccruals` retries a saved draft as-is or reconciles open accruals against its existing submitted ledger. The intent is to retry the current saved movement; the endpoint does not offer preview-version approval of those draft lines. Authorized edits made to that saved draft remain authoritative. Do not send replacement lines or imply that a stale preview freezes them.
- `confirm_open`: use only the bounded recovery confirmation projection in admission-recovery.md; the existing `listAccruals` endpoint (`LIMIT 1000`) is not a completeness proof. Show expected quantities separately and require explicit operator confirmation of actual quantities. Reuse `completionLinesFor` for `{lines: [{itemId, qty, qtyConsumption}]}`. Explicitly confirming zero actual consumption sends `lines: []` with the required recovery precondition and releases expectations under the existing contract. A denied, failed or empty read must not become `[]` or a blind `lines: null` retry; refresh and reclassify instead. Do not call the defaults endpoint in this mode.

For every selected member, POST sequentially to `${apiBase}/${bookingId}/complete`. A POS-hosted drawer keeps `/api/pos/appointments`; the scheduling host keeps `/api/scheduling/bookings`. The POS alias delegates to the same handler and preserves its POS capability boundary. Both endpoints already skip the lifecycle transition when the booking is completed. Recovery never calls the group status endpoint, `patchStatus` or another booking lifecycle mutation.

Keep a result per member. HTTP 200 with `stockWarning` remains unresolved and is not described as stock posted; continue sequentially with the other confirmed members. A non-2xx response or a lost or unknown response stops remaining requests. Preserve committed outcomes and refresh authoritative detail before offering another attempt. A successful response alone is not proof: after refresh, require the expected submitted source and accrual state, or an explicitly confirmed released or no-entry state. Members with unavailable or contradictory refreshed evidence stay unresolved.

After every attempt, call the existing `reloadDetail()`, which refreshes the detail and awaits `onchanged?.()` for the host calendar. Recovery calls only `onrecovered`, never `oncompleted`, and its callback must not call the ordinary completion callback that patches visit status. Closing and reopening recomputes eligibility; retries select only still-unresolved eligible members. Disable a second submission in the same dialog while busy. Independent clients still rely on the source-owned stock retry and idempotency contract; repeated and concurrent real tests must qualify it. If they fail, F3 owns the shared mutation and retry correction and this recovery release is blocked until that prerequisite is qualified. Do not build a second posting engine here.

## Authority, compatibility and proof

Every source read and write retains authenticated org, current capability, owner and field checks. Detail and calendar project only current authorized visit members. UI visibility is not an API gate. Validate both POS and scheduling route families, denied stock, POS and finance facets and foreign or non-owned member IDs. A failed or denied stock read is not evidence of absent consumption. No new route, schema, generalized retry job, payment mutation or product-recipe mutation is selected.

Extend the existing calendar and product, completion and mounted drawer tests, `stock-accruals.service.test.ts` for the bounded read helper, and `consumption-lines.test.ts` and `consumption-confirm-dialog.mounted.test.ts` for the recovery mode. Required fixtures: two unrelated visits sharing one ticket; direct, group, unassigned, deleted and outside IDs; a `void` and a `voided` ticket on the same visit; an admitted zero-total line, plus the same line with finance denied; a completed group with draft/open, submitted/open, realized, released and unknown members; confirmed zero; source-state change; HTTP warnings, errors and response loss; reload and reopen; two independent retries. Assert identical sold facets, no other-visit identity, no void-ticket line or paid status, no group PATCH, no additional status-log transition, no payment or date changes and at most one source-owned submitted issue.

Independent POS and finance detail admission, `ticketCard.otherLines` exclusion and the bounded `confirm_open` precondition protocol are normative in [admission-recovery.md](contracts/admission-recovery.md). DTO placement, the four states, financial-only helper guards, product-only and plan handoff, version compatibility, both till owners and the calendar serializers are normative in [wire.md](contracts/wire.md). Legacy `VisitMember`/`VisitRow` requirements are not weakened; basic and financial projections are distinct.

### Review artifact: contracts/wire.md

# Booking product wire and legacy helper boundary

This contract applies to both detail hosts and to the calendar and hover, in addition to admission-recovery.md. It selects an additive shared projection and types plus bounded legacy helper compatibility; optional monetary fields on the old `VisitMember` are not the selected model.

## Versioned placement and four states

Create `src/lib/components/scheduling/booking-product-facets.ts` and its `.test.ts` for the shared DTO, strict decoder and pure row adapter. Detail returns a required `productFacets: BookingProductFacets` next to the existing authorized booking, eventType, resource, contact, tags, statusHistory and series metadata. Its booking metadata projection omits `invoiceId`, `packageGrantId`, `paymentPlanId` and other foreign financial or stock pointers; admitted equivalents belong only in the corresponding facet. Remove the top-level visit, products, tickets, unitPrice, grant, plan and accrual fields from detail; no duplicate legacy namespace may leak values or provide an unsafe fallback.

Detail JSON endpoints require the header `X-Minion-Booking-Products-Version: 1`. A missing or unsupported version returns HTTP 409 `{error: 'refresh_required'}` with no source payload, not a legacy shape filled with `false` or `0`. `bookingDetailResponse` takes a required `request` argument; both GET wrappers pass it. Both `BookingDetailDrawer` detail GETs (clicked member, then canonical anchor) and the POS `PageBody` `chargeEvent` GET send the header and strict-decode the new shape. No new URL or endpoint and no completion-body change beyond the recovery option. Old tabs must refresh; they cannot obtain a restricted legacy financial object and hand it to an old helper. Route capability and module gates are unchanged; the version header is presentation compatibility, never permission.

New calendar server rows carry `productFacets` with the same version and shape for the authorized resolved visit. Client `CalendarBooking` may keep an optional field only to decode legacy or cached data: missing or malformed facets mean unavailable or refresh, never legacy `paid = false` or an allow flag. Clear cached facets with a mismatched org, anchor or member set through existing scope ownership. Group boxes accept one coherent anchor and member-set projection; contradictory member projections are unavailable. Legacy optional `paid`, `funding` and `tickets` aliases may appear only when derived from fully admitted financial facts, and every scoped renderer and action uses the facet rather than those aliases. No denied read becomes an alias with `false`, `[]` or `cash`.

On the scheduling calendar host, `productFacets.sold` is `{state: 'unavailable', reason: 'not_in_slice'}` and the hover renders no sold rows (spec decision 2).

```ts
type BookingReadFacet<T> =
  | {state:'available'; value:T}
  | {state:'empty'}
  | {state:'denied'}
  | {state:'unavailable'; reason:'read_failed'|'invalid_projection'|'refresh_required'|'capacity'|'not_in_slice'};
type BasicVisitMember = {
  id:string; seq:number; eventTypeId:string; eventTypeTitle:string;
  productId:string|null; minutes:number; status:string;
  canRemoveService:boolean|null;
};
type BasicVisit = {anchorId:string;groupId:string|null;members:BasicVisitMember[]};
type PlannedProductBasic = {productId:string;name:string;qty:number};
type SoldProductBasic = {
  ticketId:string;lineId:string;productId:string|null;bookingId:string|null;
  ticketHumanId:string|null;sourceHref:string|null;
  description:string;qty:number;
  relation:'direct'|'group'|'co_ticket_unassigned';
  gift:boolean|null; // true when the recorded line total is 0; null unless financial fields are admitted
};
type ServiceFinancialRow = {
  bookingId:string;paid:boolean;price:number|null;paidAmount:number;
  currency:string|null;funding:'cash'|'grant'|'plan';ticketIds:string[];
};
type BookingStockCostFacet =
  | {state:'empty'}
  | {state:'denied'}
  | {state:'unavailable';reason:'valuation_currency_unverified'|'read_failed'|'invalid_projection'|'capacity'|'not_in_slice'};
type BookingFinancialProjection = {
  services:ServiceFinancialRow[];
  planned:VisitProductLine[];
  soldTotals:{ticketId:string;lineId:string;total:number}[];
  tickets:FullBookingTicketWire[];
  bookingInvoiceId:string|null;
  grant:BookingGrantWire|null;
  plan:BookingPlanWire|null;
  accrualCost:BookingStockCostFacet;
};
type BookingProductFacets = {
  version:1;
  basic:BookingReadFacet<BasicVisit>;
  planned:BookingReadFacet<{rows:PlannedProductBasic[]}>;
  sold:BookingReadFacet<{rows:SoldProductBasic[]}>;
  payment:BookingReadFacet<BookingFinancialProjection>;
  stock:BookingReadFacet<{
    anchorAccrual:{open:number;realized:number;released:number;realizedEntryId:string|null}|null;
    recovery:BookingReadFacet<StockRecoveryMember[]>;
  }>;
};
```

The gift label (spec decision 3) is rendered from `SoldProductBasic.gift === true` in hover and drawer; neither reads `soldTotals` to decide it. `gift` is `null` whenever the payment facet is denied, so finance-denied viewers see no gift label.

`VisitProductLine` is the existing `visit.ts` permitted shape `{productId, name, unitPrice: number | null, qty, paid: boolean}`. `FullBookingTicketWire` contains the current ticket fields: `ticketId`, `humanId`, `submittedAt`, `status`, `currency`, `lineTotal`, `subtotal`, `discount`, `total`, `note`, `payments[{method, amount}]`, `otherLines: string[]`, `lineCount`, `emission {docType, serie, correlativo, status} | null`, `createdByName` and `invoiceId`. It never carries a ticket whose status is `void` or `voided` (spec decision 1). Decimal money fields keep their existing string representation; no hidden value is emitted as `0`. Its `otherLines` and `lineCount` follow admission-recovery.md's current-visit and null-only predicate and the whole-sale total label.

`BookingGrantWire` keeps the current `{grant: {id, sessionsTotal, unitValue, expiresAt}, sessionsUsed, sessionsRemaining, status, packageName}`; `BookingPlanWire` keeps `{plan: {id, title, totalAmount, currency, status}, paidToDate, remaining, isPaid, nextDue: {dueOn, amount} | null, scheduleIssue: 'invalid_rows' | 'principal_mismatch' | 'too_many_rows' | null}`. These neutral wire definitions are moved and exported from the existing inline detail types, without runtime imports of server modules. IDs, nullable strings, dates and number fields keep their current source types (`unitValue`, `totalAmount` and `nextDue` amounts follow the current detail source) and are validated before projection; no new monetary arithmetic. `StockRecoveryMember` is the member and confirmation shape from behavior.md and admission-recovery.md: `bookingId`, `status`, `openCount`, `realizedCount`, `releasedCount`, `sourceEntry`, `eligibility` and a confirmation facet `{openCount, rows, expectedOpenFingerprint}`. Confirmation rows keep each `accrualId`, `itemId`, source quantity, UOM and conversion facts; basic stock carries no cost.

`available` means a successful complete admitted projection; `empty` means an admitted successful read with 0 rows and carries no value; `denied` means a required dataset, module or field gate failed; `unavailable` means a query, decode, relation, capacity or version failure. Only `available` carries values. Basic visit on a successful booking detail always has 1 to 8 authorized members in `seq`/ID order; missing basic is unavailable, not an empty group. Planned and sold `empty` are genuine permitted empty lists, never a failed read.

A valid payment projection has one `services` row for every basic member, and planned rows match the admitted planned product IDs, with unique stable keys and no outside-visit financial row. Decoding failures, missing IDs or incomplete records make payment unavailable. A known no-payment query may yield factual `paid: false` and `paidAmount: 0` only when POS, finance and funding admission all succeeded; denied, filtered or failed evidence never does. `price: null` means admitted catalog-price absence, distinct from denied fields; it is not `0`. `payment.empty` is not a usable financial projection for a nonempty basic visit. Stock denial exposes no source-entry IDs or recovery rows. `payment.accrualCost` is the closed non-value `BookingStockCostFacet`; it never carries raw stock-cost numbers or a guessed currency.

Basic `canRemoveService` is `null` unless the existing host edit and record authority and the backend parent removal guard can resolve it; `false` or `true` is the parent mutation decision, with no source ID, count or type serialized. Do not synthesize an empty referenced array for a denied source. The server mutation still rechecks integrity; a view-only or failed guard disables that control rather than inventing no references. Structural labels, order and status remain available independently from money.

## Compatibility with visit helpers

Existing `VisitMember`/`VisitRow` monetary fields remain required for old callers; do not make `paid` or `paidAmount` optional or replace unavailable with `0`. Add `FinancialVisitRow = Omit<VisitRow, 'referenced'>` in `visit.ts`. The new pure `financialVisitRows(facets): BookingReadFacet<{rows: FinancialVisitRow[]; products: VisitProductLine[]; plan: BookingPlanWire | null}>` validates that basic and payment are both available with matching member and product identity sets, joins their fields and returns complete rows. It does not call legacy `visitRows` with a masked object or its missing-`lineTotal`-to-`0` fallback. Every non-available input propagates as denied or unavailable (`payment.empty` with a nonempty basic yields `invalid_projection`); it never returns a fabricated empty row list. No `referenced` placeholder is constructed.

Broaden `visitSummary`'s input type to the fields it uses (`paid`, `paidAmount`, `currency`, `funding`, `status`, `price`), and the `chargeableRows`/`payableEventFrom` row input types to their used field subsets, preserving runtime behavior and defaults for existing full `VisitRow` callers. New scoped paths call `visitSummary` and `chargeableRows` only when `financialVisitRows` is `available`. Other states render localized money or payment unavailable and suppress amounts, paid/unpaid totals and badges, with no numeric formatter or helper invoked. Existing `visitRows` remains unchanged for unrelated legacy full inputs, and its tests prove that compatibility; it is not the adapter for this wire.

For the new charge handoff, call `payableEventFrom` only after the same available financial projection and the existing host payment capability checks. Add optional `allowServiceFallback: boolean` to `payableEventFrom`, defaulting to `true` for existing callers. The guarded ordinary handoff passes `false`: no chargeable service means no fabricated first service; unpaid planned products may still be handed off as products only. An admitted, verified instalment-plan action may pass `true` to keep its plan fallback. If no chargeable service, unpaid product or verified plan remains, there is no handoff. A denied, unavailable or empty financial projection never invokes `payableEventFrom`, `onpay` or `chargeBooking`, even when the last cached view allowed payment. No stock or delivery fact follows from a sold row.

Anchor, title and status derive from basic only. Add `visitAnchorIdFromFacets(facets)` to the pure adapter, returning the server anchor only for a validated basic facet; otherwise it returns `null` and source-dependent writes are disabled. Existing `visitHeaderTitle` and `visitHeaderStatus` already accept structural `Pick` fields and can reuse basic members. No financial cast to `BookingVisit` is needed. Service removal uses the explicit `canRemoveService`, not `canRemoveService([])` on unavailable reference evidence. Recovery uses independently available stock and basic facets plus host and stock write rights, never financial availability as proof of delivery or a price default.

## Drawer, calendar menu and till callback owners

`BookingDetailDrawer` replaces its inline `Detail` alias with the decoded wire, renders basic, planned and sold names independently, and computes a financial-row facet instead of unconditional `visitRows`, `visitSummary` and `chargeRows`. All ticket, plan, grant, footer money and `payOfferable` branches require payment `available`; there is no `!tickets.length` unpaid fallback when that facet is denied. Its two detail fetches send the version header and decode before the canonical-anchor redirect.

`calendar-context-menu.ts` `EventMenuDetail` becomes the same decoded detail wire. `eventServiceRows` returns the financial facet, not `VisitRow[]` with absent values. `calendarMenuEntries` requires explicit financial-availability input from the box facets: when blocked, it offers detail and permitted structural split actions only and omits charge, sale, paid-cancel and delete choices that infer settlement. Existing `canPay`, `canEdit` and `canVoid` are still independently required. No undefined `paid` or `funding` becomes unpaid or cash.

The second handoff owner is `src/routes/(app)/pos/appointments/PageBody.svelte`: `chargeEvent` fetches detail with the version header, decodes it, requires available financial rows, and only then calls `chargeBooking`/`payableEventFrom` with the guarded products and plan. The context menu passes the current box facet readiness; a failed detail, version mismatch, denial or mixed projection gives a translated error or refresh and zero till callbacks. Reload or account switch clears previous financial readiness. `BookingCalendar` and the hover render the same basic and sold discriminators; no old optional `paid` alias drives a forbidden badge or action.

## Direct calendar Charge uses the same guarded handoff

The POS `PageBody` `actions(b)` slot is a separate reachable owner. Remove its `!b.paid` condition and the synthetic single-service `chargeOne` implementation. The completed-only status condition remains, as a validated basic fact, alongside the existing POS edit and pay capabilities. Derive current financial rows through `financialVisitRows` and the anchor through `visitAnchorIdFromFacets`; unavailable, missing or denied facets or a missing anchor disable the action before any financial helper runs.

For an admitted projection, compute the offer through the same `payableEventFrom` path, guarded products and verified-plan policy used by the context menu and drawer. Its `allowServiceFallback: false` overload returns `PayableEvent | null`: with no chargeable service or admitted unpaid planned product it returns `null` rather than an empty or fallback event. The omitted or `true` overload keeps the existing `PayableEvent` return and legacy runtime behavior; only the verified admitted plan branch passes `true`. The scoped callers handle `null` without a handoff, which implements the "no target, no handoff" rule without changing unrelated legacy callers.

The direct button appears only with a non-null admitted offer; its callback calls `chargeEvent(anchorId: string)`, never `chargeBooking` or an event built from `b`. `chargeEvent` re-fetches the versioned detail and server-resolved anchor, strict-decodes it and rechecks the same financial, product, plan and capability gates before the handoff. It does not treat a cached offer as authority. Remove every `chargeOne` reference; no context-menu or direct-action bypass remains.

The POS mounted test drives the rendered direct button as well as the context menu: denied, unavailable, missing, stale and malformed facets, account change, real free, paid and no-target states, admitted grouped and singleton, products-only and verified-plan scenarios. Assert zero `chargeBooking`/`dispatchSellChargeHandoff` calls and no fabricated cart line on blocked or no-target input, including a callback retained before a newly denied detail response. Positive direct actions use the current canonical anchor and the same service, product and plan selection as the context menu and drawer.

## Required tests and file actions

Modify `visit.ts` and `visit.test.ts` for the narrowed parameter types and optional fallback compatibility; add `booking-product-facets.ts` and its test for wire keys, omissions, identity mismatch, the four states, legacy version, malformed input, unknown price, the `gift` flag and no fake values. Modify `calendar-context-menu.ts` and its test, the POS appointments `PageBody.svelte` with the new `page.products.mounted.test.ts` (happy-dom), the existing `BookingDetailDrawer` mounted tests and both detail GET wrappers with new per-route `server.test.ts` files. All paths are listed in implementation-inventory.md.

Grouped and singleton cases: POS denied, finance denied or tier restricted, successful empty sold and planned, failed source, missing old wire, mixed or foreign member, malformed money and account change. Assert JSON contains no restricted legacy financial fields; basic names and quantities remain; summary, formatter and handoff spies are never called in blocked states; no displayed zero, unpaid or chargeable interpretation; and zero `onpay`/`chargeBooking` calls, even through a stale context menu. Positive admitted group and singleton tests preserve real amounts, currency and paid status, a true no-payment `0`, a true free price `0` and an unknown price `null`; products-only handoff has no fallback service and the verified-plan fallback remains compatible. Existing unrelated legacy `visitRows`, summary and payable tests still pass.

## Calendar siblings, caches and catalog boundary

The shared `CalendarProjection` has the keys `productProjectionVersion: 1`, `bookings` (each with `productFacets`), `tagOptions` and `ticketOverlay: BookingReadFacet<{rows: CalendarTicketOverlay[]}>`. Both JSON readers return `{calendarScope, ...CalendarProjection}`; both page loaders place those four keys in their existing POS or scheduling namespace alongside the preserved structural resources, date, preferences and eventTypes metadata. Decode the extracted `CalendarProjection` plus a separately validated `calendarScope`; do not reject legitimate surrounding page fields or spread them into this union. Neither wrapper carries a legacy `invoices` or `accrualSummaries` key. `CalendarTicketOverlay` is `{id: string, humanId: string | null, at: string, total: number, currency: string, customerName: string | null, lines: {id: string, description: string, bookingId: string | null}[]}`, the existing `CalendarInvoice` projection from `calendar-window.ts`. `total` is a finite number, `at` is a canonical ISO instant and source money uses existing validation. The variable historically called `invoices` is the POS ticket overlay, not a finance invoice lookup. Admit it only for the POS host with POS dataset, native route and record authorization and the finance dataset and financial tier. `customerName` is the existing POS ticket snapshot name under that POS record authority, not a newly fetched CRM identity; keep that source contract and add no live-contact fallback. No CRM permission or masking behavior is invented for this POS-owned snapshot. The whole-ticket timeline keeps its current authorized service-line descriptions; it never feeds another visit's line into `productFacets.sold` or the current-visit product preview. On the scheduling host (`pos: false`), `ticketOverlay` is `{state: 'denied'}` with no read or value, and the UI shows no POS overlay.

At the pinned baseline only the two POS outputs serialize `invoices` and `accrualSummaries`: the POS page loader (`(app)/pos/appointments/+page.server.ts:127,140`) and the POS JSON GET (spread payload, `api/pos/appointments/+server.ts:75`). The scheduling page loader and scheduling JSON route already return only `bookings` and `tagOptions` from the window. Remove the two keys from the POS outputs, including page-loader manual return objects, and keep them absent from the scheduling outputs. No spread may retain those namespaces, nested ticket totals, `estValue`/`realizedValue` or current source-entry IDs outside their admitted facets. This slice serializes no stock-cost value: `payment.value.accrualCost` carries only its non-value state, independently of available billing money. Independently admitted stock anchor counts and entry identity stay in `productFacets.stock`; cost denial never becomes a cost of `0`. `ticketOverlay` is the only transaction-overlay namespace. Zero queried tickets yields `empty`; denial or error yields `denied` or `unavailable`, not a successful `[]`.

Both JSON collection reads also require `X-Minion-Booking-Products-Version: 1` and otherwise return HTTP 409 `refresh_required` without a source payload, after normal route and module admission. Initial page data carries `productProjectionVersion: 1`; clients strict-decode it before using any dynamic sibling. `booking-product-facets.ts` exports `decodeBookingCalendarProjection` and `availableTicketOverlayRows`; the latter returns a read facet, not an unconditional `[]` from malformed data. A missing or wrong version, extra forbidden legacy financial keys, a malformed ticket or facet, or contradictory source state means `unavailable`/`invalid_projection` (or `refresh_required` for the old protocol), with no legacy fallback. Server builders emit only declared projection fields; rejecting old wire is compatibility, not authorization.

The POS `PageBody` `WindowPayload`, `seedWindow`, `fetchWindow` and week merge carry `productProjectionVersion`, `bookings`, `tagOptions` and `ticketOverlay` and exclude the old namespaces. Send the header on every window fetch, decode before cache insertion and clear old-version entries. For a merged multi-week window: any denied overlay makes the combined overlay denied; otherwise any unavailable week makes it unavailable; available and empty weeks merge admitted rows, deduplicating IDs only when the projected records match (otherwise `unavailable`/`invalid_projection`); all-empty weeks yield `empty`. Preserve existing scope, org, anchor and member ownership, and do not seed or restore a previous financial value after a denied fresh response. This is the existing permission-cache lifetime, not instantaneous cross-device revocation.

The scheduling calendar `PageBody` uses the same strict versioned window decoder but keeps its booking and tag-only view; no POS rows, sold rows or cost aliases appear. Its window request header, initial data decode and cache seeding change too. The existing `BookingCalendar` `invoices` prop may remain for other callers: the POS host supplies rows only when `ticketOverlay` is available (an empty array that draws no bars is allowed only together with a visible unavailable or denied state, and never counts as evidence of no payment). No context menu or paid summary is computed from overlay emptiness; those already require each payment facet. Remove the `accrualBySource` raw-cost lookup and money chips in the POS `PageBody`. Render quantity-only stock counts from the stock facet and replace estimated and realized money chips with the unavailable or denied state from `payment.accrualCost`, with no money formatter call. Link entry detail only through admitted stock identity and route, with no raw summary fallback after denial. Existing pending and warning UI stays independent and cannot fill a financial fact.

Catalog exception: the existing `listEventTypes` under native scheduling authority projects the current active catalog `unit_price` and org currency for appointment-creation quotes. Preserve both page loaders' `eventTypes.price` and `currency`, and any same admitted event-type fields in basic detail, under their existing native event-type policy. They are visible to that authorized scheduling viewer, not to another tenant or an anonymous caller. Label them as current catalog or list price; they do not establish historical charge, paid amount, remainder, stock cost, transaction currency or financial availability. Do not claim all money in this scope is hidden, apply a new finance gate to that creation quote, or use catalog price to fabricate a `ServiceFinancialRow` or paid status when payment is denied. Its `price: null` remains missing catalog pricing, not free. Existing create-form calls and price formatting are preserved; guarded payment, cost and transaction formatters remain blocked as above. `scheduling.service.ts` `listEventTypes` and unrelated APIs are not changed.

Required server, loader and mounted tests: serialize all four window outputs under finance-denied, tier-denied, POS-denied, stock-denied and read-failed combinations and assert that forbidden raw sibling keys and transaction or cost amounts are absent from the JSON, not only the DOM. Test the version header and HTTP 409, a previous full cache followed by a denied fresh payload, week merging, malformed, stale and duplicate-conflict payloads, and no raw-price fallback into payment or till callbacks. The same finance-denied authorized scheduling fixture may still see the current catalog price in the create UI; assert catalog labeling and zero historical-payment or stock-cost facts, money-chip formatters or payment actions. Exercise the POS and scheduling `PageBody` owners as well as the shared `BookingCalendar`. These are mandatory US1 qualification; helper tests alone do not prove closure.

## Independent stock anchor and US2 recovery availability

The stock `available` value is `{anchorAccrual: {open: number; realized: number; released: number; realizedEntryId: string | null} | null, recovery: BookingReadFacet<StockRecoveryMember[]>}`. It does not require a recovery array to show an independently admitted anchor. `BookingReadFacet` `unavailable.reason` includes `not_in_slice` for this story boundary and for the scheduling sold facet. The four states are unchanged; `not_in_slice` is internal wire metadata and the UI renders a translated recovery-unavailable message, not implementation jargon.

US1 adds `stockAnchorForBookings(ctx, bookingIds)` in `stock-accruals.service.ts`: same-org, `source = 'booking'`, at most 1,000 distinct authorized anchor IDs (the server-resolved anchor for each visit, spec decision 4), selecting `sourceId`, `status`, `realizedEntryId` and grouped counts only; no `estValue`, `realizedValue` or cost column and no fallback to the old raw accrual summary. It returns `BookingReadFacet<Map<UUID, AnchorAccrual>>` internally: a complete read with no rows yields `anchorAccrual: null`; a failed, denied or over-limit read yields the corresponding stock facet state. Several distinct realized entry IDs for one anchor never become an arbitrary first link: keep the counts with `realizedEntryId: null` and no detail link. Detail and current-visit matching still use the independent stock and source admission and member bounds. Window overflow affects stock availability; it never truncates the calendar bookings.

A US1-only candidate returns stock `available` when the anchor read succeeds, with `recovery: {state: 'unavailable', reason: 'not_in_slice'}`. It does not call or require `stockRecoveryForBookings`, `listRecoveryOpenAccrualsInTx`, the confirmation writer or their native tests to qualify US1. The DTO and decoder are common foundation and accept all four recovery states from the start. US2 supplies recovery `available`, `empty`, `denied` or `unavailable` from the member projection. The recovery action requires stock available, recovery available and per-member eligibility, host and write authority; unavailable never means no open rows or deliberate zero consumption.

The internal oversized-open-set diagnostic `open_rows_overflow` maps to the wire value `{state: 'unavailable', reason: 'capacity'}` for that member's recovery facet. Never emit `open_rows_overflow` outside the closed `BookingReadFacet` union, and never substitute a partial or empty confirmation. Keep the internal diagnosis in sanitized test evidence only. A saved-source retry follows its own guard; a new `confirm_open` recovery can never bypass an unavailable confirmation facet.

US1 tests show an available anchor with `unavailable`/`not_in_slice` recovery and zero US2 imports, queries or writer calls; a denied or failed anchor remains distinct from true no-accrual. US2 tests show complete available recovery, genuine empty, denied, query failure and 1,001 rows yielding `capacity`, no unknown reason accepted by the strict decoder, zero POSTs when unavailable, and a successful guarded confirmation counterpart. Each shipping slice keeps its own full, owner and runtime gates; US1 does not depend on US2.

## Bounded ticket-overlay reader

Ticket-overlay completeness uses a new bounded private read inside `calendar-window.service.ts`, not `listTicketsForCalendar`'s silently capped result (2,000 rows) or its `catch(() => [])`. It runs in one owned same-org `REPEATABLE READ READ ONLY` transaction, keeps that source's inclusive `submittedAt` from/to range and its exclusion of `void` and `voided` tickets, and applies these limits:

| Limit | Value | Over the limit |
| --- | --- | --- |
| Ticket headers fetched | at most 2,001; 2,001 means over | `unavailable`/`capacity` |
| Qualifying service and non-plan line rows, counted before materialization | 10,000 | `unavailable`/`capacity` |
| Selected label text, counted before materialization | 1,048,576 UTF-8 bytes | `unavailable`/`capacity` |
| Final overlay JSON | 2,097,152 bytes | `unavailable`/`capacity`, no partial rows |

Zero headers means `empty`. Source, money, schema or query failures produce `unavailable`/`read_failed`, never `empty`. The reader opens no nested transaction and does not silently join an outer active one; it reuses passed same-target handles and owns only its client transaction. Resolve source gates before acquiring it. This reader is F5-only; the legacy `listTicketsForCalendar` API and its callers stay unchanged. Tests cover 2,000 and 2,001 headers, the line, text and output limits and a source-predicate mismatch; real guarded QA must prove RLS, role and source count-then-fetch behavior. These limits apply only to the overlay, not to the calendar or the booking facets.

## Unqualified stock-cost scalars

Existing `stk_accruals` estimated and realized values have no recorded valuation currency. Ticket or invoice billing currency and `fin_settings` display currency do not prove their denomination. This slice selects no historical currency-provenance reader: `BookingStockCostFacet` has no `available` branch, and its strict decoder rejects `value`, `estValue`, `realizedValue` and `currency` keys. This is a deliberate limitation of monetary stock-cost display. Billing and payment projections can be available while stock cost is unavailable.

After independent stock and finance field admission, a cost-free anchor with zero accruals yields `empty`; nonempty legacy accruals yield `unavailable`/`valuation_currency_unverified`. Denied stock or finance admission yields `denied`. Failed, incomplete or oversized anchor evidence keeps the matching declared unavailable reason; it never becomes `empty` or a cost of `0`. The four detail and window builders use the cost-free anchor only and do not call numeric accrual-summary readers for this facet. Unrelated legacy callers are unchanged. US1 adds no F3 storage, bridge, runtime import or provenance query.

Display a localized "Stock cost unavailable" for the unqualified state; keep quantity and warning states and independently admitted ticket, invoice and service billing money. Do not format or aggregate stock costs, substitute a billing or display currency, or relabel a zero. A future monetary stock-cost display needs a separately reviewed provenance seam and is outside this slice. Decoder, serialized-JSON and mounted vectors cover billing in USD with raw stock scalars of unproven denomination, display-setting changes, denial and zero and nonzero accrual counts; assert that raw cost numbers and currency fields are absent and that the stock-cost formatter is never called while permitted billing money still works.

### Review artifact: quickstart.md

# Quickstart validation: Consistent booking product projections

## Preconditions

Owner approval is pending. These instructions are for a future isolated Hub candidate. Read Hub AGENTS.md and docs/qa-stack.md; verify the candidate HEAD and registry master and Bun. Use synthetic data and guarded loopback QA only, never a production-backed `bun run dev`. Inspect `bun run qa:status` before using or changing a shared stack. Install only if needed with `bun install --frozen-lockfile`; use `bun run dev:local` for guarded QA. Do not reset another agent's stack.

## Focused test command

This is the single focused command for the feature. It lists every ordinary Vitest file in [implementation-inventory.md](implementation-inventory.md); files marked Create exist only after their task runs. Run it from the Hub checkout:

```bash
bunx vitest run \
  'src/server/services/pos-accounts-booking-links.test.ts' \
  'src/server/services/scheduling-bookings-products.test.ts' \
  'src/server/services/scheduling-bookings-visit.test.ts' \
  'src/server/services/scheduling-bookings-money.test.ts' \
  'src/server/services/calendar-window.service.test.ts' \
  'src/server/services/stock-accruals.service.test.ts' \
  'src/server/auth/scheduling-read.test.ts' \
  'src/lib/components/scheduling/booking-product-facets.test.ts' \
  'src/lib/components/scheduling/visit.test.ts' \
  'src/lib/components/scheduling/calendar-window.test.ts' \
  'src/lib/components/scheduling/calendar-context-menu.test.ts' \
  'src/lib/components/scheduling/booking-detail-drawer.mounted.test.ts' \
  'src/lib/components/scheduling/consumption-lines.test.ts' \
  'src/lib/components/scheduling/consumption-confirm-dialog.mounted.test.ts' \
  'src/routes/(app)/scheduling/bookings/bookings-routes.characterization.test.ts' \
  'src/routes/(app)/pos/appointments/page.products.mounted.test.ts' \
  'src/routes/(app)/scheduling/calendar/page.products.mounted.test.ts' \
  'src/routes/api/scheduling/bookings/_handlers.test.ts' \
  'src/routes/api/scheduling/bookings/[id]/server.test.ts' \
  'src/routes/api/scheduling/bookings/[id]/complete/server.test.ts' \
  'src/routes/api/scheduling/calendar/server.test.ts' \
  'src/routes/api/pos/appointments/server.test.ts' \
  'src/routes/api/pos/appointments/[id]/server.test.ts' \
  'src/routes/api/pos/appointments/[id]/complete/server.test.ts'
```

A US1-only candidate drops the US2-only file `src/routes/api/pos/appointments/[id]/complete/server.test.ts` if it has not been created yet. The native case extended in `stock-corrections.sql.integration.test.ts` does not run here: ordinary Vitest excludes `*.sql.integration.test.ts`, so it runs only through the full qa-native lane and report in [F3 native-qualification.md](../124-stock-correction-workflow/contracts/native-qualification.md).

A passing baseline test is not a reproduced fix: first capture a failing assertion or counterexample for the missing behavior, then run it on the candidate.

## Scenario and oracle

Use synthetic visits for ticket-only Faja M, planned-only Faja L, planned and sold, and neither. Include a grouped visit with the same sale on two members, two identical descriptions with different line IDs, a zero-total product (gift, with finance admitted and denied), a `void` ticket and a `voided` ticket on the same visit, and an unrelated second sale product. Place sale D1 outside the calendar window of appointment D2. Inspect the POS hover and the drawer together; the scheduling calendar hover shows no sold rows (spec decision 2). Simulate failed stock realization, reopen and reload, recover fixture stock, retry twice and concurrently; assert one linked stock entry and no stock-posted claim before evidence. Compare restricted dataset, owner and masked personas and network payloads.

For each allowed journey also run direct API and navigation attempts for denied, owner and foreign controls. Capture status, actual loader outcome and redacted payload assertions. A 200 document shell alone does not prove route authorization or a successful data load. For mutation scenarios compare before and after authoritative records and retry outcomes; do not rely on a success toast.

## Browser acceptance

Read and use browser-harness. Use a unique named isolated browser when work is concurrent; never share tabs or processes with another agent. Test desktop and 390 px, Spanish and English, light and dark, keyboard-only operation and fresh reload. Observe accessible labels and focus, empty, error and denied states, row and link behavior and persisted preference scope. A login, MFA or account ambiguity stops actions until the account is confirmed; keep private session access details outside committed docs.

## Full qualification and result recording

Run Hub `bun run check`, `bun run test` and `bun run build`. For UI edits run `bun run lint:design && bun run lint:tokens`; for message edits run `bun run i18n:compile`. Route and RBAC manifest checks are part of the candidate's current scripts; read package.json rather than inventing a command. Record commands, exit codes, candidate hash, fixture matrix, screenshots and unresolved gates in `validation.md` beside this feature. Do not mark implementation done until its scoped outcomes pass. Production release and affected-account checks are separate owner-gated evidence.

## Recovery and relation acceptance

Run every decision-table row in contracts/behavior.md. One ticket contains direct, same-authorized-group, null-unassigned and outside-visit product lines; hover and detail keep only the first three and never request the outside booking. A deleted or outside link is omitted by ID comparison, not resolved as an unassigned row. The reported-style null Faja M remains visible.

Use a completed group with draft/open, submitted/open, realized, released and no-evidence members. Assert that only the first two plus confirmed no-source/open members are targets. Saved-source requests are `{}`; open-row confirmation uses `completionLinesFor` without current defaults; confirmed zero sends `[]`, while denied, failed or empty reads never do. Record request paths and bodies: one sequential individual `/complete` per admitted member through the POS or scheduling `apiBase`, zero group PATCH and zero repeated status-log entries. Inject a stock warning, a non-2xx response and response loss; preserve committed partial results, stop on error or unknown and re-read before another attempt. Reload and reopen must not target already resolved members. Repeated and concurrent execution must keep one source-owned submitted issue; if the existing engine fails this proof, release waits for F3's shared retry fix.

Confirm that both host UIs always include `recovery` for `confirm_open` and refuse to POST without freshness metadata, and that a stale confirmation receives HTTP 409 before any effect ([admission-recovery.md](contracts/admission-recovery.md)). Keep a separate legacy no-recovery compatibility case: its existing behavior is retained and is not proof of fingerprint protection for old clients.

Run the billing-versus-unqualified-stock-cost JSON and formatter matrices in [wire.md](contracts/wire.md) on detail, the POS hover and both calendar hosts.

### Review artifact: tasks.md

# Tasks: Consistent booking product projections

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/behavior.md, contracts/admission-recovery.md, contracts/wire.md, implementation-inventory.md and quickstart.md in this directory.
**Status**: Specification only; all tasks are unchecked. Tests are required by this spec. Hub paths are relative to minion_hub unless prefixed `specs/`. Task IDs are stable; T017–T025 were split out of T008 or added for inventory files that had no task, so execution order is given under "Dependencies", not by ID.

## Phase 1 — Setup

- [ ] T001 Record owner spec approval, the execution scope and the independent-review result in `specs/126-booking-product-consistency/validation.md` before any implementation or configuration action.
- [ ] T002 Verify the candidate hash, master PR base and Bun from repo-policy and local QA ownership using `docs/qa-stack.md`; obtain an authorized isolated feature checkout without altering shared WIP.

## Phase 2 — Foundational evidence

- [ ] T003 Re-read all anchored sources in `specs/126-booking-product-consistency/research.md`, including the unlinked planned-products read for the reported visit group; classify supported behavior versus reproduced gap, re-run the caller census in `specs/126-booking-product-consistency/implementation-inventory.md`, and record candidate differences in `specs/126-booking-product-consistency/validation.md`.
- [ ] T004 Prepare the synthetic persona and entity matrix in `scripts/qa/seed/matrix.ts` only if existing fixtures do not cover it; record resolved runtime identity and configuration preconditions privately as directed by `specs/126-booking-product-consistency/quickstart.md`.
- [ ] T005 Prove module, route, owner and field-masking admission for the scoped reads and writes in `src/server/services/rbac.service.ts` and `src/hooks.server.ts`; stop for an owner-reviewed amendment if a security gap is discovered.

## Phase 3 — User Story 1 (P1, MVP)

**Goal**: Staff compare hover and opened appointment without losing a sold garment or confusing a planned product with an actual delivery.
**Independent acceptance**: Use one visit with a ticket-only Faja M, one with a planned product only, one with both and one without products; compare each surface.

- [ ] T006 [US1] Capture an executable failing regression or supported-behavior baseline for Story 1 in `src/server/services/pos-accounts-booking-links.test.ts`, following the fixture and denial oracle in `specs/126-booking-product-consistency/quickstart.md`.
- [ ] T007 [US1] Extend `bookingTicketLinks` in `src/server/services/pos-accounts.service.ts` with `ticketId`, `lineId`, nullable `productId` and `bookingId`, the server-computed `gift` flag (spec decision 3) and the direct/group/co-ticket-unassigned relation table; exclude non-null links outside the authorized current members without reading the other booking, keep every distinct admitted line and preserve the recorded variant-bearing description. Extend `src/server/services/pos-accounts-booking-links.test.ts`.
- [ ] T008 [US1] Add the batched planned-anchor projection, the current-member sold-line serializer and the independently authorized detail stock facet: required `foreign` handles and `canReadFinancialFields` on `getBookingDetail`, `void`/`voided` exclusion for detail tickets, `otherLines` and `lineCount` (spec decision 1), and `productFacets` in place of the legacy top-level fields, in `src/server/services/scheduling-bookings.service.ts` and `src/routes/api/scheduling/bookings/_handlers.ts`; add cost-free `stockAnchorForBookings`, read for the server-resolved anchor (spec decision 4), in `src/server/services/stock-accruals.service.ts`. Zero new planning or stock writes. Update `src/server/services/scheduling-bookings-products.test.ts`, `src/server/services/scheduling-bookings-visit.test.ts`, `src/server/services/scheduling-bookings-money.test.ts` and `src/server/services/stock-accruals.service.test.ts` (anchor cases).
- [ ] T017 [US1] Create the shared wire in `src/lib/components/scheduling/booking-product-facets.ts` and `src/lib/components/scheduling/booking-product-facets.test.ts` (DTO, strict decoder, `financialVisitRows`, `visitAnchorIdFromFacets`, `decodeBookingCalendarProjection`, `availableTicketOverlayRows`, duplicate-`accrualId` decoder vector), and modify `src/lib/components/scheduling/visit.ts` and `src/lib/components/scheduling/visit.test.ts` (`FinancialVisitRow`, narrowed inputs, `allowServiceFallback` overload) per `specs/126-booking-product-consistency/contracts/wire.md`.
- [ ] T018 [US1] Make both detail GET wrappers pass the request to the versioned handler in `src/routes/api/scheduling/bookings/[id]/+server.ts` and `src/routes/api/pos/appointments/[id]/+server.ts`, and create `src/routes/api/scheduling/bookings/[id]/server.test.ts` and `src/routes/api/pos/appointments/[id]/server.test.ts` (HTTP 409 without the version header, neutral DTO, denied/foreign/money guards). Update `src/routes/api/scheduling/bookings/_handlers.test.ts`: add `stockAnchorForBookings` to its `stock-accruals.service` mock and cover `bookingDetailResponse`.
- [ ] T019 [US1] In `src/server/services/calendar-window.service.ts` make the `loadCalendarWindow` `foreign` option required with `finance` and `canReadFinancialFields`, return the `CalendarProjection` keys, drop `invoices` and `accrualSummaries`, add the bounded ticket-overlay reader and set the scheduling-host sold facet to `unavailable`/`not_in_slice` (spec decision 2); update types in `src/lib/components/scheduling/calendar-window.ts`; extend `src/server/services/calendar-window.service.test.ts` and `src/lib/components/scheduling/calendar-window.test.ts`.
- [ ] T020 [US1] Pass explicit handles from `src/routes/(app)/pos/appointments/+page.server.ts`, `src/routes/(app)/scheduling/calendar/+page.server.ts`, `src/routes/api/pos/appointments/+server.ts` and `src/routes/api/scheduling/calendar/+server.ts`, with the version header and HTTP 409 on both JSON routes. Modify `src/routes/api/pos/appointments/server.test.ts`, create `src/routes/api/scheduling/calendar/server.test.ts`, and update `src/routes/(app)/scheduling/bookings/bookings-routes.characterization.test.ts` and `src/server/auth/scheduling-read.test.ts` as the inventory describes.
- [ ] T021 [US1] Render separate planned, sold (with the gift label from `gift === true`) and quantity-only stock facets in `src/lib/components/scheduling/BookingDetailDrawer.svelte` and `src/lib/components/scheduling/BookingCalendar.svelte`; send the version header on both drawer detail GETs; switch `src/lib/components/scheduling/calendar-context-menu.ts` to the decoded detail and financial-availability guard. Extend `src/lib/components/scheduling/booking-detail-drawer.mounted.test.ts` and `src/lib/components/scheduling/calendar-context-menu.test.ts`.
- [ ] T022 [US1] In `src/routes/(app)/pos/appointments/PageBody.svelte`: guarded `chargeEvent` with the version header, removal of `chargeOne` and the `!b.paid` condition, direct Charge through the nullable guarded offer and `chargeEvent(anchorId)`, versioned window payload, fetch, cache and week merge, and removal of raw accrual money chips. Create `src/routes/(app)/pos/appointments/page.products.mounted.test.ts` with the direct-action and context-menu matrices.
- [ ] T023 [US1] Apply the versioned window decoder, request header and cache seeding in `src/routes/(app)/scheduling/calendar/PageBody.svelte`, keeping its booking and tag-only view; create `src/routes/(app)/scheduling/calendar/page.products.mounted.test.ts` (catalog exception versus denied payment, stock and overlay; stale cache and version guard).
- [ ] T009 [US1] Verify positive, foreign, masked and denied cases against real local QA plus the focused command in `specs/126-booking-product-consistency/quickstart.md`; record before/after evidence in `specs/126-booking-product-consistency/validation.md`.

## Phase 4 — User Story 2 (P2)

**Goal**: Staff can tell completed appointment, recorded sale, expected consumption and posted stock apart, and reach the existing retry workflow when allowed.
**Independent acceptance**: Simulate completion with failed realization, reload the drawer, retry after fixture stock recovery and verify one posting.

- [ ] T010 [US2] Add the Story 2 persistence, recovery and forbidden-path regression in `src/routes/api/scheduling/bookings/[id]/complete/server.test.ts`; prove the counterexample before claiming a fix.
- [ ] T024 [US2] After F3 provides `realizeAccrualsInTx` and the F3 write gate: add `listRecoveryOpenAccrualsInTx` and the optional `RealizeInput` recovery precondition in `src/server/services/stock-accruals.service.ts`; extract `completeBookingResponse` into `src/routes/api/scheduling/bookings/_handlers.ts`; delegate from `src/routes/api/scheduling/bookings/[id]/complete/+server.ts` and `src/routes/api/pos/appointments/[id]/complete/+server.ts` with a literal host, returning HTTP 409 for a stale preview before the generic warning catch. Create `src/routes/api/pos/appointments/[id]/complete/server.test.ts` and extend `src/routes/api/scheduling/bookings/_handlers.test.ts` (recovery mocks, host literal, HTTP 409 path).
- [ ] T011 [US2] Add `stockRecoveryForBookings` for the caller-bounded member array (spec decision 5) with member-recovery tests in `src/server/services/stock-accruals.service.ts` and `src/server/services/stock-accruals.service.test.ts`, then implement the `recover_stock` mode in `src/lib/components/scheduling/ConsumptionConfirmDialog.svelte` and a separate action in `src/lib/components/scheduling/BookingDetailDrawer.svelte`: eligible completed members only, saved-source `{}` or explicit open-row lines, sequential host `/complete` requests, per-member outcomes and `reloadDetail`/`onchanged`. Extend `src/lib/components/scheduling/consumption-lines.test.ts` and `src/lib/components/scheduling/consumption-confirm-dialog.mounted.test.ts`; edit `src/lib/components/scheduling/consumption-lines.ts` only for a demonstrated missing case. Never call the group status PATCH or the ordinary completion callback; keep default completion and the existing source engine.
- [ ] T025 [US2] After F3 qualifies `src/server/services/stock-corrections.sql.integration.test.ts`, extend its semantic case 9 with the F5 precondition cases from `specs/126-booking-product-consistency/contracts/admission-recovery.md` and run the full qa-native lane and report from F3 native-qualification.md on the F5 candidate.
- [ ] T012 [US2] Exercise unrelated-visit product exclusion, mixed completed-group recovery, denied and unknown reads, saved-draft reuse, confirmed zero, warning, partial, error and unknown outcomes, no status-log increment, reload and reopen, repeated and concurrent retry and account-switch cases from `specs/126-booking-product-consistency/quickstart.md`; compare authoritative records and record the result in `specs/126-booking-product-consistency/validation.md`.

## Phase 5 — Polish and qualification

- [ ] T013 Add or update translated labels in `messages/en.json` and `messages/es.json`, run `bun run i18n:compile` to regenerate `src/lib/paraglide/` (never hand-edited), and use semantic tokens and shared primitives for every changed UI file in `specs/126-booking-product-consistency/implementation-inventory.md`; skip catalogs only if no label changes and record why.
- [ ] T014 Run full Hub check, test and build and the UI design and token gates from `package.json`; save candidate exit codes in `specs/126-booking-product-consistency/validation.md`.
- [ ] T015 Qualify the browser acceptance matrix through Browser Harness and real route-data outcomes; store synthetic screenshots and redaction assertions under `specs/126-booking-product-consistency/evidence/` and summarize scope in `specs/126-booking-product-consistency/validation.md`.
- [ ] T016 Obtain owner merge and configuration approval for the concrete diff, complete separately authorized release and runtime verification, and reconcile remaining work with `proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md`; if implementation leaves an open code issue, add its `TODO(handoff)` at the code site plus a proposal entry before handoff.

## Dependencies and parallel opportunities

T001–T005 block implementation. US1 order: T006 → T007 → T017 → T008 → T018 → T019 → T020 → T021 → T022 → T023 → T009. US2 order: T010 → T024 → T011 → T025 → T012; T024 and T025 wait for the F3 prerequisites named in them. US2 starts after the US1 shared wire (T017, T008) and after US1 if shared source files would conflict. T013–T016 qualify each approved shipping slice. US1 proceeds from T009 to its translation, full, browser and owner gates without waiting for US2; US2 proceeds from T012 to its own gates and cannot reuse a US1 result as recovery qualification. Full-request completion includes both stories. No task is marked [P] because the candidate's shared files, account configuration and fixtures have no independent owners yet.

## Implementation strategy and coverage

US1 can qualify and ship without the US2 recovery model, dialog mode or recovery tests; its independently authorized detail stock facet remains required. The MVP is Story 1 only, subject to all approval and permission gates. Story 2 ships only with its independent acceptance evidence. T005, T009 and T012 cover authority; T013–T015 cover i18n, tokens, browser and persistence. Twenty-five unchecked tasks: setup 2, foundation 3, US1 11, US2 5, polish 4. Every Create and Modify row in implementation-inventory.md is named by at least one task.

### Review artifact: checklists/requirements.md

# Specification Quality Checklist: Consistent booking product projections

**Purpose**: Author validation of requirements, not implementation qualification.
**Created**: 2026-11-16
**Feature**: [spec.md](spec.md)

## Content Quality

- [ ] No implementation algorithms, APIs or framework choices in functional requirements. Not met: FR-005 deliberately names the existing individual completion-retry endpoints, the absence of a group-status mutation and saved-source versus absent-source retry semantics, because the requirement is to reuse that existing mechanism.
- [x] Focused on user value and business needs.
- [ ] Requirements and user scenarios are written for non-technical stakeholders. Not met for FR-005, for the same reason.
- [x] All mandatory sections completed; source evidence and workflow metadata are separate from requirements.

## Requirement Completeness

- [x] No unresolved design clarification markers remain; behavior decided during review is listed in spec.md for owner confirmation, and runtime identity and configuration checks have stop or no-op rules.
- [x] Requirements are testable and unambiguous.
- [x] Success criteria are measurable.
- [x] User-visible success criteria are technology-independent; query-count qualification is a technical constraint in the plan.
- [x] Acceptance scenarios are defined for both user stories.
- [x] Edge cases are identified.
- [x] Scope is bounded to the parent proposal item.
- [x] Dependencies and assumptions are identified.

## Feature Readiness

- [x] Every functional requirement is covered by a scenario, contract or quickstart oracle.
- [x] User scenarios cover primary flows and denied states.
- [x] Requirements define measurable outcomes; running-application proof is a separate pending execution gate.
- [x] Implementation choices other than FR-005's named retry mechanism are confined to the technical companion artifacts.
- [ ] Owner approval before data or configuration implementation: pending.
- [ ] Owner confirmation of the "Decisions made during review" in spec.md: pending.

## Notes

Requirements were checked against pinned source and the parent proposal; source support, reported behavior and unproven runtime observations are distinguished. Unchecked items are deliberate: they block implementation claims, not preparation of review material. Independent review findings and dispositions live under `egm/`.

### Review artifact: implementation-inventory.md

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
