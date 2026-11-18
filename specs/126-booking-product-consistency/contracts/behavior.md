# Behavior contract: Consistent booking product projections

## Sold and planned projections

Extend `BookingTicketLink.products`/`SoldProduct` and detail ticket products to the sold-line shape `SoldProductBasic` in [wire.md](wire.md): `{ticketId, lineId, productId: null | UUID, bookingId: null | UUID, description, qty, relation, gift}` plus the permitted ticket human ID and source link. The recorded description is the historical label. Line totals and other monetary fields are carried only in the payment facet and are absent when the caller cannot read them; `gift` is `null` in that case (spec decision 3). New server rows always have `ticketId` and `lineId`; deduplicate by that pair, never by description. Planned `products[]` remains a separate anchor-booking projection and never receives copies of sold lines.

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

Independent POS and finance detail admission, `ticketCard.otherLines` exclusion and the bounded `confirm_open` precondition protocol are normative in [admission-recovery.md](admission-recovery.md). DTO placement, the four states, financial-only helper guards, product-only and plan handoff, version compatibility, both till owners and the calendar serializers are normative in [wire.md](wire.md). Legacy `VisitMember`/`VisitRow` requirements are not weakened; basic and financial projections are distinct.
