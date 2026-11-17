# Closed source facts, timeline and admitted display comparison

This contract defines the source facts, stored-time timeline and display comparison carried by the [diagnostic-wire.md](diagnostic-wire.md) report. It selects source explanation, not another ledger writer or browser reader. Pure decoders and types live in `scripts/lib/faces-stock-reconciliation.ts`; the diagnostic reader fills them from the same qualified snapshot. All row, graph, 20 MiB output, deadline and privacy limits in [report.md](report.md) apply cumulatively. Graph node hashes alone never stand in for payment, appointment, draft or accrual facts or for a displayed projection.

## Source evidence placement and exact values

`ReconciliationReport` has required `sourceEvidence: SourceEvidenceRow[]`, `timeline: TimelineRow[]`, `sourceEvidenceSha256: Digest | null` and `projectionEvidence: ProjectionEvidenceResult[]`. SourceRef identities per kind are defined in diagnostic-wire.md.

```ts
type WarningEvidence={state:'none'|'present'|'unavailable',
  code:string|null,
  sourceSha256:Digest|null,draftEntryId:UUID|null,
  items:{itemId:UUID,requested:string,available:string}[]};
type StockEntrySource=
 | {kind:'pos',id:UUID}
 | {kind:'booking',id:UUID}
 | {kind:'invoice',id:UUID}
 | {kind:'service',id:UUID|null,finProductId:UUID|null}
 | {kind:'purchase',id:UUID}
 | {kind:'manual_reconciliation',label:'repair-opening-balance'|'analyst-reconciliation-2026-08'}
 | {kind:'none'}
 | {kind:'unknown',metadataSha256:Digest};
type SourceValue=
 | {kind:'ticket',status:string,submittedAt:string,voidedAt:string|null,currency:string,
    total:string,stockEntryId:UUID|null,warning:WarningEvidence}
 | {kind:'sale_line',ticketId:UUID,lineKind:string,finProductId:UUID|null,bookingId:UUID|null,
    qty:string,unitPrice:string,discount:string,total:string,lineNo:number,
    planId:UUID|null,redemptionId:UUID|null}
 | {kind:'payment',ticketId:UUID,paidAt:string,amount:string,method:string,currency:string}
 | {kind:'booking',status:string,resourceId:UUID,startTime:string,endTime:string,createdAt:string,updatedAt:string,
    productId:UUID|null,eventTypeId:UUID,groupId:string|null,rescheduledFromId:UUID|null,
    invoiceId:UUID|null,packageGrantId:UUID|null,paymentPlanId:UUID|null}
 | {kind:'booking_product',bookingId:UUID,productId:UUID,qty:string,createdAt:string,updatedAt:string}
 | {kind:'booking_group',resourceId:UUID,groupId:string,memberIds:UUID[]}
 | {kind:'booking_status',bookingId:UUID,fromStatus:string|null,toStatus:string,changedBy:UUID|null,changedAt:string}
 | {kind:'invoice',providerRef:string|null}
 | {kind:'accrual',source:string,sourceId:UUID,finProductId:UUID|null,itemId:UUID,warehouseId:UUID,
    status:'open'|'realized'|'released',qtyConsumption:string,qty:string,
    realizedEntryId:UUID|null,realizedQty:string|null,realizedValue:string|null,
    createdAt:string,updatedAt:string,realizedAt:string|null,releasedAt:string|null}
 | {kind:'stock_entry',type:'receipt'|'issue'|'transfer'|'adjustment',status:'draft'|'submitted'|'cancelled',
    createdAt:string,updatedAt:string,postedAt:string|null,source:StockEntrySource}
 | {kind:'stock_line',entryId:UUID,itemId:UUID,qty:string,uom:string|null,rate:string|null,
    fromWarehouseId:UUID|null,toWarehouseId:UUID|null,lineNo:number}
 | {kind:'grant',sourceTicketId:UUID,sourceLineId:UUID,packageProductId:UUID,serviceProductId:UUID,
    sessionsTotal:number,unitValue:string,expiresAt:string|null,status:string,createdAt:string,cancelledAt:string|null}
 | {kind:'redemption',grantId:UUID,bookingId:UUID|null,ticketId:UUID|null,ticketLineId:UUID|null,
    redeemedAt:string,reversedAt:string|null}
 | {kind:'correction',correctionKind:'sale_variant'|'sale_stock_repost'|'receipt_replace'|'product_mapping'|'receipt_chain',
    sourceType:'pos_ticket_line'|'stock_receipt'|'fin_product',sourceId:UUID,
    sourceEntryId:UUID|null,replacementEntryId:UUID|null,appliedAt:string};
type SourceEvidenceRow=
 | {ref:SourceRef,state:'available',rowSha256:Digest,value:SourceValue}
 | {ref:SourceRef,state:'missing_or_unavailable',rowSha256:null,value:null};
type TimelineRow={ref:SourceRef,
  field:'submitted_at'|'voided_at'|'paid_at'|'start_time'|'end_time'|'created_at'|'updated_at'|'changed_at'
    |'posted_at'|'realized_at'|'released_at'|'cancelled_at'|'redeemed_at'|'reversed_at'|'applied_at'|'state_observed',
  at:string|null,meaning:'stored_source_time'|'current_state_observation'|'timestamp_unavailable'};
```

Each kind maps to its same-org source table: ticket→`pos_tickets`, sale_line→`pos_ticket_lines`, payment→`pos_payments` (currency from its admitted parent ticket), booking→`sched_bookings`, booking_product→`sched_booking_products`, booking_status→`sched_booking_status_log`, invoice→`fin_invoices`, accrual→`stk_accruals`, stock_entry/stock_line→`stk_entries`/`stk_entry_lines`, grant/redemption→`pos_package_grants`/`pos_package_redemptions`, correction→`stk_corrections` under its current domain/owner/field policy. No names, descriptions, notes, phone, email, payment metadata or status-log `reason` text is selected. Safe line product identity is `fin_product_id` (DTO `finProductId`); `sched_bookings` and `sched_booking_products` use their `product_id`. Raw source numeric strings and nullable source UOM remain unchanged.

Warning JSON supplies only the persisted code, a validated `draftEntryId` and finite safe item quantities; never the raw message, item names or arbitrary JSON. The pinned ticket path persists `negative_stock`, `no_warehouse`, `repost_pending` and `void_stock_failed`, and passes any `StockError.code` string through unchanged (`pos.service.ts:1100,1120,1146,1184,1336,2444`; `StockWarning.code` is typed `string`). `code` therefore carries the persisted code verbatim when it matches `^[a-z][a-z0-9_]{0,63}$`. A missing or malformed code, or malformed warning JSON, yields `state: 'unavailable'`, `code: null` and the warning's source hash, never parsed private exception text. Classification never depends on a particular warning code; a warning is evidence that posting did not complete as recorded, not a posted issue.

## Booking visit groups

A derived booking group reproduces `visitMembers` (`scheduling-bookings.service.ts:2190–2221`): `metadata.groupId` is a nonempty string per `groupIdOf`, and members are same-org bookings with byte-equal `metadata->>'groupId'` and `resource_id` equal to the anchor booking's `resource_id`. Do not invent `sched_bookings.group_id` or a group table, and never merge bookings that share a `groupId` on different resources. `groupId` is the exact string, at most 256 UTF-8 bytes, with no trimming or case normalization; the ref ID is `<resourceId>/<groupId>` (diagnostic-wire.md). The group hash is SHA-256 of canonical `{resourceId, groupId, memberRows: [{id, rowSha256}]}` sorted by member ID; it is not a physical row hash. Enforce the bounded source count, exact identity/group membership and existing scope. Ticket lines, accruals, classification and projection comparison attach only to the group that contains their booking, so two same-`groupId` groups on different resources never share members, components or captures.

Source rows unavailable through the admission gates are `missing_or_unavailable`, never a zero or empty positive fact. Missing private correction access leaves coverage unknown, not a leaked manifest or guessed clear history.

## Stock entry source decoder

`stk_entries.metadata` is untyped at the pinned source. F1 adds the pure function `decodeStockEntrySource(type: string, metadata: unknown): StockEntrySource` in `scripts/lib/faces-stock-reconciliation.ts`. It is the only way F1 code (diagnostic, mapping unchanged-facts derivation and garment admission) derives an entry's source. Rules, evaluated in order, with every UUID lowercase canonical:

| Metadata shape (pinned writer) | Decoded source |
| --- | --- |
| `type` is `issue`, `source: 'pos'`, `sourceId` UUID; `ticketId`, when present, equals `sourceId` (`createSourcedIssue`, `stock.service.ts:1783–1800`, POS caller `pos.service.ts:1163`) | `{kind: 'pos', id: sourceId}` |
| `type` is `issue`, `source: 'booking'`, `sourceId` UUID (`createSourcedIssue`/`realizeAccruals`) | `{kind: 'booking', id: sourceId}` |
| `type` is `issue`, `source: 'invoice'`, `invoiceId` matched as `lower(btrim(metadata->>'invoiceId'))` like the live unique index (uppercase or padded legacy ids decode to the lowercase canonical id; implementation decision 2026-11-17); `providerRef` is ignored for identity (`stock.service.ts:1915–1925`) | `{kind: 'invoice', id: invoiceId}` |
| `type` is `issue`, `source: 'service'`; optional `sourceId` and `finProductId` UUIDs (`createServiceIssue`, `stock.service.ts:1740–1752`) | `{kind: 'service', id, finProductId}` with absent values null |
| `type` is `receipt`, no `source` key, `purchaseId` UUID (`entry-document.ts`) | `{kind: 'purchase', id: purchaseId}` |
| `type` is `adjustment`, `source` is exactly `repair-opening-balance` or `analyst-reconciliation-2026-08`, `reconciliation: true` (observed in the garment evidence) | `{kind: 'manual_reconciliation', label: source}` |
| `type` is `receipt`, `source: 'repair-opening-balance'` (the opening-balance receipt `scripts/repair-stock-valuation.ts` writes, no `reconciliation` flag; implementation decision 2026-11-17) | `{kind: 'manual_reconciliation', label: 'repair-opening-balance'}` |
| `metadata` is `{}` or has no `source`, `sourceId`, `invoiceId` or `purchaseId` key (observed on manual receipts and issues) | `{kind: 'none'}` |
| Anything else, including a known `source` with a missing, non-string or non-UUID ID, a `ticketId` different from `sourceId`, a known `source` on an unexpected `type`, or an unlisted `source` literal | `{kind: 'unknown', metadataSha256}` |

Keys not named in a row (for example `providerRef`, `quantity` or correction provenance keys) are ignored for identity; they still change the entry's row hash. `metadataSha256` is SHA-256 of the entry's `metadata::text` computed in PostgreSQL; raw unknown metadata never enters output. `{kind: 'none'}` is a manual movement with no recorded owner: it participates in totals and true-up review but owns no fulfillment. `unknown` is surfaced in the report: the owning component is unresolved with reason `stock_source_unknown` (diagnostic-wire.md). Every correction path refuses it: mapping preview returns `incomplete_evidence` when any affected entry decodes to `unknown` ([unchanged-facts.md](unchanged-facts.md)), and garment admission requires the original issue to decode to `{kind: 'pos', id}` equal to the manifest ticket. The existing display helper `entryDocument` is not reused because it maps service, manual and unknown sources alike to null. Adding a newly observed shape is a reviewed contract change, never a decoder fallback.

Graph edges from an entry exist only for `pos` (to `pos_ticket`), `booking` (to `booking`) and `invoice` (to `invoice`); other decoded kinds are values on the `stock_entry` row only.

## Row identity, hashing and ordering

SourceEvidenceRow `ref.kind` maps exactly to `value.kind` and the row ID; graph and ledger references must resolve to the same scoped identities. Physical row hashes use raw PostgreSQL `to_jsonb(row)::text` hashing under UTC, returned as digests only. All rows sort by `ref.kind`/`ref.id` (ledger IDs numerically as `BigInt`); every source row is emitted once. Dates keep PostgreSQL canonical UTC text with 6 fractional digits; grant expiry is `YYYY-MM-DD`, never an invented instant. Count and byte-admit selected text and rows under the source collection limits before materialization. Large or raw warning text is hashed in PostgreSQL, not copied and then redacted.

## Timeline

Timeline emits one row for each timestamp property declared on that source's SourceValue (a null value produces `timestamp_unavailable` with `at: null`). Never query a column absent from that source's schema: ticket has submitted and voided times and no `created_at`; sale_line has no timestamp and gets only `state_observed`; booking_group gets only `state_observed`; booking gets start, end, created and updated; booking_status gets `changed_at`; invoice gets only `state_observed`; accrual gets created, updated, realized and released; stock entry gets created, updated and posted; stock line gets only `state_observed`; grant gets created and cancelled (expiry stays date metadata); redemption gets redeemed and reversed; correction gets applied; payment gets paid. Ledger rows add `posted_at` from MovementEvidence. `state_observed` uses the report observation time and means current state, not a historical transition. Sort known instants chronologically preserving microseconds, then by `ref.kind`/`ref.id`/`field`; null times sort last.

A `booking_status` row with `toStatus: 'completed'` gives the stored time and actor ID of the completion status change; it is the timeline's only completion time. Payment `paid_at` and ticket `submitted_at` never become a booking start or completion, and a booking's `updated_at` never becomes a completion time. A completed status or transition is no proof of physical delivery. Bookings created before status logging started may have no log rows; that is unknown history, not evidence of no transition.

Drafts must be included even with no ledger rows: follow the ticket `stockEntryId`, a safe `stockWarning.draftEntryId`, and the source-owned stock entry lookup through the decoded `pos`, `booking` and `invoice` source identities, with org equality and the original draft lines. A warning's referenced UUID is only a candidate until scoped row admission. Include open, released and realized accruals and original entry states independently; an empty ledger does not drop failed drafts or turn an open expectation into issued stock. Complete typed source facts explain a D1 payment and a D2 scheduled visit without inferring a third event date.

`sourceEvidenceSha256` hashes canonical `{schemaVersion: 1, orgId, sourceEvidence, ledger, graph}`, excluding run, snapshot, observation, path, hint, projection and assertion metadata; the timeline is excluded entirely, so no observation time enters the preimage. The hash binds source facts without circular display assertions, allowing a prior source report and a later private UI capture to refer to unchanged source evidence. Incomplete output sets it to null instead of a false complete digest. Incomplete source evidence and timeline prefixes are labeled incomplete, never terminal totals or positive eligibility.

## Exact projection assertion variant

`DiagnosticEvidenceRef.assertion` is a closed union of `{kind: 'expected_component', component: ExpectedComponent, verifiedByProfileId: UUID, verifiedAt: string}` and:

```ts
type ProjectionAssertion={kind:'projection_comparison',componentKey:string,
  sourceEvidenceSha256:Digest,verifiedByProfileId:UUID,verifiedAt:string,
  observations:{surface:'booking_hover'|'booking_detail'|'pos_ticket_detail'|'stock_movement_list'|'stock_item_ledger',
    source:SourceRef,productId:UUID|null,itemId:UUID|null,warehouseId:UUID|null,
    presence:'shown'|'omitted',qty:string|null,stockUom:string|null,
    observedAt:string,appSourceSha:string|null}[]};
type ProjectionEvidenceResult={referenceId:UUID|null,componentKey:string,
  state:'admitted'|'not_provided'|'unavailable'|'conflicting',
  observations:ProjectionAssertion['observations'],
  reason:'matched_source_capture'|'projection_unverified'|'projection_source_changed'
    |'projection_identity_unavailable'|'projection_conflict'};
```

`projection_comparison` is permitted only on `document`/`owner_attestation` evidence refs, with the same fresh executing real-owner verification and reviewed document digest/`privateRef` rules as diagnostic-wire.md. It has 2–5 observations with distinct `surface` values, each `observedAt` ≤ `verifiedAt` ≤ run observation, and `appSourceSha` null or 40 lowercase hex characters. Captured raw image, HTML or customer text stays private and is not loaded, browsed or fetched by this CLI. Capture/source ownership is an owner attestation, not a hash-generated truth or automatic browser proof. A null source version remains explicitly unverified and cannot establish current deployed code identity.

`componentKey` must resolve to a same-org expected source component; the observation's source, product, item and warehouse must resolve to that component or its admitted ticket/booking/group relationship. Do not fetch foreign or out-of-graph records to make an assertion fit. A shown quantity is a nonnegative plain decimal compared as Q4 (data-model.md) with the actual `stockUom`; omitted has `qty` and `stockUom` null. At least one product or item identity is required, and both when that surface names both; null is not a wildcard. Compare captures only when their resolved canonical component and product/item/warehouse identity agree. An out-of-graph identity yields `unavailable`/`projection_identity_unavailable`; a changed source digest yields `unavailable`/`projection_source_changed`; contradictory admitted owner captures yield `conflicting`/`projection_conflict`. Each forces the case unresolved with the same literal as its Reason. A missing capture yields `not_provided`/`projection_unverified` with `referenceId: null` and `observations: []`. An admitted capture has its reference UUID and `matched_source_capture`; no observed disagreement leaves primary `valid`/`stock_matches_intent`, while the defined discrepancy allows `display_only`/`display_multiplicity_only`.

Admit `display_only` only when canonical stock quantities and keys are otherwise valid, `sourceEvidenceSha256` matches the independently reconstructed current complete source evidence, and at least 2 authorized captured surfaces disagree for the same component: one shows the proven quantity while another omits it or shows a different Q4 quantity. A source already duplicate, missing or wrong-variant cannot be reclassified display-only by an image. Without admitted comparison, stock-matching source remains `valid` with reason `stock_matches_intent` and explicit `projection_unverified`; do not assert a display defect from a `privateRef` alone. Other unresolved facts keep their precedence. Mixed component findings use the literal `mixed_discrepancies`.

## Output ordering and size

Emit projection results by `componentKey`, then nullable `referenceId` (null first); each admitted ref has one result, and a component with no capture has one `not_provided` row. `warning.items` has at most 1,000 distinct admitted item IDs under the shared total-ID/byte budget; no raw warning item or name is copied. The timeline run observation uses canonical UTC with 6 fractional digits (pad a millisecond observation with three zeros; never truncate a stored microsecond). Every SourceValue status, method, code and source string is at most 256 UTF-8 bytes and keeps its stored value; unsupported source semantics make the component unresolved rather than a fabricated status. Any exceeded source collection, text or output limit uses the incomplete/no-total behavior.

## Tests

Tests extend the existing pure, CLI and eight native behaviors, with no ninth name: D1 positive payment and later D2 booking/source update; failed draft with no ledger; open versus released versus realized accrual and nullable actuals; safe warning/draft linkage, including a passed-through `StockError` code and a malformed warning; group metadata, not a group column; same org, two resources, same `groupId`, proving separate membership, distinct refs and hashes, and no cross-visit classification or projection match; completion status-log row with `changed_at` versus a booking with no log rows; grant/redemption reversal; unknown timestamps; forbidden PII, status-log reason and raw warnings absent. Decoder unit vectors cover every table row above, each observed evidence shape (POS with `ticketId`, `repair-opening-balance`, `analyst-reconciliation-2026-08`, `{}`), mismatched `ticketId`, non-UUID `sourceId`, invoice without `invoiceId`, a known source on the wrong type and an unlisted literal. The positive display-only vector supplies two strict source-bound owner captures; missing, unverified, changed-digest, foreign and contradictory captures never prove it. Assert that real output strict-decoder roundtrips all required source, timeline and projection fields, chronological versus state-observed meaning, source hash stability across run metadata changes, and unchanged captures distinct from source mutation. No browser or source mutation is part of the diagnostic.
