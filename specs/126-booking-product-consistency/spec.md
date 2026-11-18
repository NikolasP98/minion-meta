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

## Decisions made during implementation (2026-11-17)

Recorded while building F5 on `feat/126-booking-product-consistency` (Hub clone `hub-faces-F5`, based on F3 `e5913287`). They answer the open R6 findings.

6. **Existing retry paths (R6 codebase-details-01).** Three entry points reach recovery, all through `ConsumptionConfirmDialog mode="recover_stock"`: the drawer action, the POS calendar chip `sched_stock_retry_post` and the `/scheduling/bookings` chip. The two chips no longer reopen the ordinary completion dialog for a completed booking. The dialog loads its own facts (`GET ${apiBase}/${bookingId}` → `stockRecovery`), so no host passes members. `/scheduling/bookings` also mounts the drawer (no `onpay`, `onchanged` = `invalidate`); the drawer's recover action and its mounted tests cover that contract.
7. **`SoldProduct` / `productsForVisit` (R6 codebase-details-02).** `SoldProduct` stays as an alias of `SoldProductBasic`; `productsForVisit` is rewritten onto `CalendarBooking.sold` and de-duplicates by `ticketId:lineId`. The calendar block's product marker and the hover card both call it, so they cannot disagree; its old tests and the `BookingCalendar` story fixture were rewritten.
8. **Read-failure mapping (R6 codebase-details-04).** New facets map a failed read to `unavailable/read_failed` and a denied dataset to `denied`; none to `empty`. The legacy detail facets keep their fail-soft catches and `rethrowFinancialReadFailure` (corrupt stored money still rejects the whole detail; `scheduling-bookings-money.test.ts` pins it). The calendar window's `bookingTicketLinks(...).catch` now also marks `sold` unavailable; the legacy `paid` alias keeps its old fallback until the payment facet exists.
9. **`otherLines` predicate (R6 IR-07).** `otherLines` lists every line with no booking link, of any kind (an unassigned service or plan line stays visible); `lineCount` counts the lines of this visit plus those unassigned lines. A line naming another visit's booking is in neither.
10. **Eligibility rows added (R6 IR-08).** A member that is not completed is `not_needed` (never a recovery target). A completed member with a submitted source and no open accruals, or with everything realized or released and no entry, is `not_needed`. No evidence at all, two active source entries, a missing item join, more than 1,000 open rows, or an open count that disagrees between the two reads is `manual_review`.
11. **Count-mismatch fixture (R6 IR-06).** The open set and its count come from ONE statement, so the "row inserted between count and select" case cannot occur; it is replaced by a unit vector where the accrual-state count and the open-set count disagree (`manual_review`).
12. **Fingerprint and stale error (R6 IR-09, IR-10, IR-11).** The fingerprint is the SHA-256 of the JSON of the selected accrual and item-conversion columns in id order (stored text, no Number reserialization), not `to_jsonb(row)::text`. The typed refusal is `RecoveryPreviewStaleError` in `stock-accruals.service.ts`; the base has no F3 retry wrapper. The reads run on `withOrgCore`'s transaction, not an owned `REPEATABLE READ READ ONLY` one (isolation cannot be set after its first statement); single-statement reads keep each set coherent.
13. **POS complete wrapper (R6 IR-13).** After extraction both wrappers keep today's checks exactly: auth, tenant, scheduling module. `confirm_open` additionally needs `stock:view` and `stock:manage`; no `pos` module check is added.
14. **Test infrastructure (R6 codebase-details-05).** `pos-service-boundaries.test.ts` needs no change (no new `pos-accounts` export; `SoldLineRecord` is imported from the neutral wire module). The `stock-accruals.service` mocks of `scheduling-bookings-money`, `-visit`, `-products` and `calendar-window.service` tests gained `stockAnchorForBookings`, `stockRecoveryForBookings` and `bookingTicketLinks`.

## Approval and evidence boundary

This is data-tagged work. Owner approval of the concrete spec and any resolved configuration or data diff is required before implementation, and owner merge is required. Planning is authorized; those later gates are pending. Pending runtime observations have verification-first outcomes (no-op or stop) and are not treated as proven defects. Independent review evidence is recorded under `egm/`. No implementation, test run, release or live completion is claimed by any document in this package; companion artifacts do not repeat this statement.

Stock costs remain unavailable when their denomination is unverified; quantity facts and independently authorized billing money remain available under their own gates, as defined in the wire contract.
