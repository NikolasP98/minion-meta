# Correction API and observable workflow contract

Proposed Hub paths, not shipped endpoints. Server resolves authenticated org/actor; request bodies never contain them. Shared transaction/authority/normal-writer semantics are exact in [transaction-protocol.md](transaction-protocol.md).

## Discriminated preview requests

`POST /api/stock/corrections/preview` accepts the strict `CorrectionPreviewCommand` envelope `{request, reason, valuation?}` declared in [recovery-receipts.md](recovery-receipts.md): `request` is one shape below, `reason` is required and `valuation` is the optional `StockValuationQualificationV1`. Unknown keys or forbidden combinations are HTTP `400`. `sourceId` for `pos_ticket_line` is always the sale LINE UUID; ticket identity is resolved from that same-org line. There is no separate lineId field or client-selected ticket owner. Existing ticket/line swap route checks both path IDs against that resolved row before delegating.

```ts
type VariantPreview = {
  mode: 'variant_swap'; sourceType: 'pos_ticket_line'; sourceId: string;
  expectedProductId: string; replacement: { productId: string };
};
type FrozenIssueLine = {
  originalLineId: string; itemId: string; qty: string; uom: string;
  fromWarehouseId: string;
};
// PRIVATE F1 intent only, NEVER admitted by an HTTP body parser.
type StockOnlyPreview = {
  mode: 'stock_only'; sourceType: 'pos_ticket_line'; sourceId: string;
  expectedProductId: string;
  replacement: {
    lines: FrozenIssueLine[];
    approvedItemMapping: {
      oldItemId: string; newItemId: string; stockQty: string;
      stockUom: string; evidenceSha256: string;
    };
  };
};
type ReceiptLine = {
  originalLineId: string; itemId: string; qty: string; rate: string;
  uom: string; toWarehouseId: string;
};
type ReceiptPreview = {
  mode: 'receipt_replace'; sourceType: 'stock_receipt'; sourceId: string;
  replacement: { lines: ReceiptLine[] };
};
type PreviewRequest = VariantPreview | ReceiptPreview;
type InternalCorrectionRequest = PreviewRequest | StockOnlyPreview;
```

All IDs are canonical UUIDs; arrays contain 1–200 lines, unique originalLineId, in original lineNo order. Source and every referenced row must resolve same org; missing and foreign rows both return `404`. Decimal inputs use ASCII digits with optional one decimal point, no exponent/plus/NaN/Infinity, positive magnitude, at most 4 fractional places, at most 9 integer digits; normalize to fixed 4 decimals for intent hashing. UOM is trimmed, 1–80 characters, and must exactly equal verified item stock UOM; no implicit conversion is invented. `ReceiptLine.rate` is in the stored valuation unit of `stk_entry_lines.rate`, the same unit as the original line after the intake conversion by `convertEntryRates` (`stock.logic.ts:542`); the correction does not accept a typed foreign currency and runs no conversion. New receipt rates are positive; each resulting absolute line/total stock value must be finite and ≤ 1000000000. Issue lines have no user-selected rate or opposite warehouse. Header/supplier/reason are not smuggled in line fields. Preview body maximum is 262144 UTF-8 bytes. These are chosen admission limits, not measured performance claims.

Variant swap changes only the expected old catalog product to replacement product, under existing same-price/modifier/void/period/invoice/fiscal guards. The resolver determines whether both plans of the swapped line are explicitly empty or stock-moving. The both-empty branch is supported whatever stock entry the ticket's other lines issued: it reads and changes no stock entry, records null entry references and does not consult `pos_tickets.stockEntryId`, matching `swapTicketLineProduct` (`pos.service.ts:1505-1549`). Mixed empty/nonempty is blocked in this slice. An absent, denied or failed read is never an empty plan.

private F1 stock-only leaves the already-correct sale product and visit product unchanged. Freeze all original submitted issue lines; transform only the single approved old→new item pair at the same admitted stock quantity/UOM. Every other line remains byte-identical in relevant stock fields. Compare original/frozen intended plan with `planRepost` using explicit old allowedItemIds and new allowIncreaseItemIds. Current recipe is diagnostic only, never authority to add co-ticket supplies. Mixed/shared target ownership or any unexpected item/value effect blocks. F1's bounded garment wrapper additionally requires its exact one-L-line/one-M-sale-line eligibility and approval manifest.

Receipt replacement is standalone only, submitted original, complete unique original line provenance, no owner/source ambiguity, no later ledger row on any original/replacement bin and a passing [receipt period policy](#receipt-period-policy-v1). Existing supplier and original date remain evidence; new posting is the current transaction time. All sourceType booking/invoice requests, generic historical consumption edits, empty line lists, unsupported conversion and downstream receipt history are blocked with `422`; F1/F2 receive inert review packets, not an alternative writer.

## Capabilities and central admission

Every route uses canonical identity, `getCoreCtx`, active same-org membership, enabled relevant modules, record-owner filtering and current field policy. Apply rechecks through the locking fresh resolver under the common first gate. Exact mode matrix:

| Verified effect | Preview | Apply (generic and existing swap route) | Detail/history |
| --- | --- | --- | --- |
| Both-empty sale variant | pos:view + pos:edit; no stock fields/cost disclosed | pos:view + pos:edit; no stock:manage requirement; zero ledger/bin effects | Authorized sale view; no stock fields |
| Stock-moving sale variant (private F1 stock_only additionally requires real owner) | pos:view + pos:edit + stock:view | Same plus stock:manage and cost authority defined below | pos:view + stock:view; cost fields require the finance authority below |
| Standalone receipt_replace | stock:view | stock:view + stock:manage and cost authority defined below | stock:view; cost fields require the finance authority below |

Cost authority is exactly enabled finances plus `finance:view` and `capabilities.fieldLevel("finance") >= SENSITIVE_FIELD_LEVEL` from `$lib/permissions`, with current effective-authority narrowing and record checks. Stock has no field tier: FIELD_LEVEL_MODULES covers crm/finance/scheduling, and stock defaults to 0. Do not introduce a stock tier or test stock fieldLevel for costs. For cost-bearing preview/detail, disclose rate/value/COGS only with this finance authority; otherwise omit these fields and return the allowed quantity-only nonexecutable preview. Every stock-moving apply requires this authority in addition to its mode-specific stock/POS capabilities. Both-empty stockless swaps remain independent of finance and stock administration. Include ordinary-owner/custom-role success with stock field level 0 and finance-view/tier/module denial fixtures.

Preview may show a masked nonexecutable difference where stock:view permits it; `eligible:false` and blocker cost_visibility_required prevent approving unseen costs. A POS-only caller may have both-empty eligibility checked internally but gets no recipe/cost/foreign-record details; nonempty intent returns stock_scope_required without details. Do not demand stock:manage unconditionally for an existing stockless POS swap.

The read-only POST preview is the ONE exact central exception in `rbac.service.ts` `apiWriteCapability` for `/api/stock/corrections/preview`: return no mutating stock capability for that exact path/method, while canonical auth and the handler's matrix checks remain mandatory. All other stock writes retain existing prefix gates. Generic apply needs the same precise effect-based treatment: the central guard for exact `/api/stock/corrections` POST admits canonical authentication and delegates required stock capability to the verified effect matrix in the handler/service; it cannot infer stocklessness from a client flag. Existing swap path retains pos:edit centrally and delegates stock effects likewise. Implement the exact GET/HEAD read delegation and method/path regression in api-admission.md; API routes add no entries to the page-only route-design manifest. No broad `/api/stock` bypass.

## Preview, apply and hash identity

Result shape is the reason-bearing CorrectionPreview with domain/eligible/previewHash/payloadHash/productChange/quantityEffects/cost in [recovery-receipts.md](recovery-receipts.md).

Canonical JSON is UTF-8 with recursively lexicographically sorted object keys; arrays keep semantic source lineNo or sorted stable identity order. Strings are Unicode NFC only for user reason/UOM, IDs lowercase canonical UUID, new intended decimal strings are fixed 4-decimal; original source numeric evidence retains exact stored spelling. No undefined, nonfinite or negative-zero values. SHA256 is lowercase hex.

`previewHash` hashes exactly `{schemaVersion:1,orgId,actorProfileId,request:normalizedPreviewRequest,valuation:normalizedValuation,sourceSnapshot,stockSnapshot,policySnapshot}`. sourceSnapshot contains original source/entry/line IDs and values, original financial/fiscal digest, direct/visit linkage; stockSnapshot contains complete affected ledger boundary/current bins/mapping/UOM/ownership evidence; policySnapshot contains current applicable membership/role/effective capability/period/field rules. It excludes random replacement UUIDs, wall clock, observation/run IDs and reason. Identical source/policy/valuation qualification produces identical preview; changed authority/source refuses stale apply.

`POST /api/stock/corrections` accepts exact `{request:PreviewRequest,operationKey:UUID,previewHash:SHA256,payloadHash:SHA256,reason:string,valuation?:StockValuationQualificationV1}` CorrectionCommand. Reason is trimmed, NFC, 1–1000 characters. `payloadHash` hashes exactly `{schemaVersion:1,orgId,actorProfileId,request:normalizedPreviewRequest,valuation:normalizedValuation,previewHash,reason}`; operationKey is the separate unique lookup key, not hashed intent. Same key/hash/actor replays the original committed result; changing source, mode, replacement, reason, expected product or actor is `409` key_reuse. Apply regenerates the full preview under locks and compares the supplied hash before any effect. Public API does not accept preallocated replacement IDs or a garment domain manifest. F1 uses the explicit private command/receipt contract in garment-envelope.md, including its approved posting time; F2 uses its separate receipt-chain service and transaction-accepting stock primitives.

Success is the exact `{schemaVersion:1,outcome:"applied",replayed,receipt}` CorrectionResult union in [recovery-receipts.md](recovery-receipts.md). Both-null entry refs occur only in the documented ordinary stockless receipt; private mapping has its own owning service. The immutable outcome and one audit commit together; a lost response uses known-key status.

Errors:

| HTTP status | Codes |
| --- | --- |
| `400` | invalid request |
| `403` | capability or cost denial |
| `404` | missing, foreign or owner-unavailable |
| `409` | `stale_preview`, `operation_conflict`, `key_reuse` |
| `422` | `source_ambiguous`, `dependent_history`, `policy_unverified`, `period_locked`, `negative_stock`, `stock_drift`, `price_differs`, `stock_scope_required` |
| `503` | exhausted known-rollback transient stock admission |

A lost response is unknown until same-key status lookup; never return applied for existing repost_pending. `GET /api/stock/corrections/:id` reads the same-org operation and applies the detail matrix/owner/field checks before serializing it; missing/foreign/unavailable all return `404`. Existing post-stock retry remains the recovery action for preexisting pending writes and blocks starting a fresh correction.

## Visit product association

A stock-moving or both-empty variant swap on a line with a `bookingId` reuses `moveVisitProduct` (`pos.service.ts:1367-1393`) unchanged. If the booking has no `sched_booking_products` row for the replacement product, the old row's `product_id` is updated (`action:'moved'`). If the booking already has a row for the replacement product, the old row is deleted, because the table allows one row per booking and product (`action:'merged'`); the surviving row keeps its own quantity. `sourceSnapshot.rows` therefore covers both the old-product row and any existing replacement-product row of that booking. The ordinary `after` JSON records `visitProduct:{bookingId,action:'moved'|'merged',fromRow:{id,productId,qty},toRow:{id,productId,qty}|null}` with the pre-change values of both rows, so a deleted row's id and quantity stay discoverable (FR-009). A line without a booking records `visitProduct:null`. Stock-only repost never calls `moveVisitProduct`.

## Replacement entry metadata

Every replacement entry is created by `createEntryInTx` after `cancelEntryInTx` has cancelled the original in the same transaction. Its `stk_entries.metadata` is:

- Sale corrections (`sale_variant` stock-moving and both `sale_stock_repost` actions): `{source:'pos', sourceId:<ticketId>, ticketId:<ticketId>, correctionOf:<cancelled entry UUID>, correctionOperationKey:<operationKey>}`. The first three keys equal what `postTicketStock` writes through `createSourcedIssue` (`pos.service.ts:1163-1172`), so `findEntryBySource('pos', ticketId)` and `entryDocument` keep resolving the ticket.
- Receipt corrections (`receipt_replace`): `{correctionOf, correctionOperationKey}` plus the original entry's `purchaseId` and `providerRef` when present, so the purchase link survives. For a quantity-only correction the original `currency`, `fxRate` and `fxUpdatedAt` keys are copied unchanged, because the rate is unchanged. For a correction that changes a rate they are omitted: the new rate is entered in the valuation unit and no conversion produced it. The original entry keeps all its metadata. Receipts carry no `source`/`sourceId` keys.

Replacement creation runs the same non-cancelled duplicate-source check as `insertSourcedIssueEntry` (`stock.service.ts:1675-1690`) for sale corrections. Because the original is cancelled first in the same transaction, the check finds no live entry; a live entry found there refuses with `duplicate_source` and rolls the whole correction back.

## Receipt period policy v1

`receipt_replace` admits a period under one fixed release policy, `RECEIPT_PERIOD_POLICY_ID = 'receipt_period_v1'`, exported from `stock-corrections.logic.ts`. It has no setting, feature flag or per-operation proof. Owner approval of this specification approves the policy; `receipt_replace` ships only after that approval (T001). A later policy needs a new identifier and a new approval.

Preview and apply evaluate it in their own snapshot; apply evaluates it again under the held gate pair:

1. Read the `fin_settings` row for the org. If it is absent, refuse `422 policy_unverified`. Receipt correction does not use the `America/Lima` fallback of `periodLockExists` (`period-locks.ts:31`); sale guards keep that fallback unchanged.
2. `originalMonth` is the original entry's `posted_at` as `YYYY-MM` in `fin_settings.timezone`. `currentMonth` is the transaction's posting time as `YYYY-MM` in the same timezone.
3. If a period lock exists for either month, refuse `422 period_locked`.

The evaluation is stored in `policySnapshot.receiptPeriodPolicy = {policyId:'receipt_period_v1', accountingTimezone, originalMonth, currentMonth, periodLockRows:[{period,rowHash}]}`. It is part of the preview hash and of the immutable `before.policySnapshot`, which is the evidence record; no new column or table is added. A preview computed under a different `policyId`, timezone or lock rows is `409 stale_preview` at apply.

## Existing clients and UI

Existing `POST /api/pos/tickets/:id/lines/:lineId/swap` keeps its target-product intent but now requires reason/key/previewHash/payloadHash and delegates to this service; existing UI and route/mounted tests update in the same release. Old tabs receive a typed refresh_required validation response with no write rather than bypassing evidence. Existing UI refreshes source/preview and asks for reason, never silently generates a new approval after stale conflict.

Existing ticket/entry detail offers preview, explicit reason and disabled confirm on blockers. Keep one operation key until authoritative outcome; response loss queries/retries that key, changed intent needs a new preview/key. Keyboard/translated controls expose original/replacement references and honest pending state. Unsupported history links to F1/F2, never mark-completed or additional charge. Stockless sale view remains usable without stock administration.

## Exact source fingerprint representation

Do not serialize arbitrary contact/customer metadata into snapshots. Each source record is represented by `{table,key,rowHash}`: table from the closed source set below, key is its canonical primary/unique identity tuple as strings, rowHash is SHA256 of UTF-8 PostgreSQL `to_jsonb(row)::text` selected as TEXT (not parsed/re-emitted JSON). Set LOCAL TIME ZONE UTC before fingerprint queries, preserving PostgreSQL timestamp microseconds and exact numeric spellings; do not narrow ledger IDs or convert record dates through JavaScript Date for hashes. Only this digest is persisted for complete financial rows; before/intended/after expose the explicitly named stock/quantity/value/source-ID facts, never names, phones or credentials.

`sourceSnapshot = {sourceType,sourceId,rows,financialDigest}`. rows covers the source sale line and parent ticket/shift/emission rows; expected/replacement product records; the booking's `sched_booking_products` rows for the old and the replacement product; original stock header/lines. Standalone receipt uses its header/lines and empty sale rows. Table set is `pos_ticket_lines,pos_tickets,pos_shifts,pos_emissions,fin_products,sched_booking_products,stk_entries,stk_entry_lines`. Sort by table then key tuple. financialDigest hashes every row of pos_payments and applicable invoice binding for that ticket, sorted by stable key, with no private raw record output.

`stockSnapshot = {entryIds,ledgerRows,bins,ruleRows}`: entryIds sorted UUID; ledgerRows are `{id:string,rowHash}` for every original-entry ledger row plus the complete current latest boundary on every original/intended bin; bins are `{itemId,warehouseId,exists,rowHash:null|string}`; ruleRows are typed table/key/hash records for all visited consumption/component/direct-bridge/item-UOM rows used by the existing rule resolver. Source-resolution warning, missing conversion, cycle/partial graph or unsafe numeric ID makes the preview blocked, not a partial hash. No whole-catalog row dump. `policySnapshot = {authorityRows,periodRows,fieldPolicy,accountingTimezone,receiptPeriodPolicy}` using current membership/assigned-role/org-role/permission-rule rows and applicable period/finance timezone rows, sorted semantic keys, plus normalized effective field policy. `receiptPeriodPolicy` is the [receipt period policy](#receipt-period-policy-v1) evaluation for `receipt_replace` and `null` for sale modes. All raw stock numeric facts remain strings in the readable diff; hashes bind exact stored state, not tolerance comparisons.

The canonical top-level preview/payload JSON then hashes these precise digest structures. Any relevant source/policy row mutation, removal or addition changes the approved preview even if the visible price appears unchanged. Fixture tests mutate each snapshot family independently and require stale_preview; metadata unrelated to source is never silently excluded by implementer choice.

## Exact shared service entrypoints

`src/server/services/stock-corrections.logic.ts` exports the PreviewRequest discriminated union and CorrectionPreview/CorrectionResult wire types above. `src/server/services/stock-corrections.service.ts` exports:

```ts
export interface CorrectionCommand {
  request: PreviewRequest;
  valuation?: StockValuationQualificationV1;
  operationKey: string;
  previewHash: string;
  payloadHash: string;
  reason: string;
}
// Generic public service has NO private options bag.
// Exact private garment command and owning entrypoints are defined in garment-envelope.md.
export function previewStockCorrection(ctx: CoreCtx,
  request: PreviewRequest, reason: string,
  valuation?: StockValuationQualificationV1): Promise<CorrectionPreview>;
export function applyStockCorrection(ctx: CoreCtx, command: CorrectionCommand,
  actor: Actor): Promise<CorrectionResult>;
export function getStockCorrection(ctx: CoreCtx,
  correctionId: string): Promise<CorrectionResult>;
```

Every entrypoint requires nonempty canonical `ctx.profileId` and same-org authenticated context. HTTP getCoreCtx supplies its resolved Supabase subject; operator wrappers supply only F7-verified subject after target admission. Mutation requires actor.id equal ctx.profileId, not a client-provided or legacy alternate identity. Each method performs its own exact capability/owner/field checks, never assumes a route prefix authorized it. preview owns one read-only snapshot through the shared nonlocking resolver; apply owns one guarded write transaction and fresh locking resolver; detail owns one authorized read snapshot. Never nest these owning methods inside an existing CoreTx. F2 uses the explicitly transaction-accepting stock primitives for its different multi-entry operation, not repeated generic API calls.

Existing swap wrapper converts its validated path binding and product intent to VariantPreview with sourceId=lineId. F1 uses only the owning previewGarmentStockCorrection/applyGarmentStockCorrection entrypoints and complete typed garment manifest in [garment-envelope.md](garment-envelope.md). No naked replacementEntryId option or client StockOnlyPreview can enter generic apply. The private method calls the same passed-tx frozen-line engine and receipt writer, never a second posting implementation. Public stock_only preview/apply is HTTP `422` owner_evidence_required before source/stock effects, even if supplied evidenceSha256 looks valid; ordinary parsing rejects other unknown/forbidden keys with `400`. The server emits only an inert F1 review packet for this unsupported public action.

The common write boundary is stock-v1, then the org authority lock, before all source and business row locks; the source, period, authority, entry, accrual and bin row order follows. Role and module deny inserts are covered only through the participating authority writers and fresh direct checks from transaction-protocol.md, not by `FOR SHARE` of existing rows. The file-action plan is [implementation-inventory.md](../implementation-inventory.md); native qualification has thirteen behaviors, including the two absent-row authority cases.

Private garment forward/compensation uses the same strict typed action/reference union and owning service functions in the private garment-envelope.md contract. The inverse requires actual applied forward receipt/current replacement/stamp/no intervening state and a new approved manifest/time/entry/key; it preserves ordinary moving-average pricing and explicitly discloses any unequal-rate cost delta. Native frozen-line/reuse cases cover both directions, no fourteenth behavior. Consume F7-qualified postgres restricted ACL sentinel and exactAssertions:true native registration/report enforcement; do not implement a second helper/validator or claim old report.ts already enforced exact counts.

[recovery-receipts.md](recovery-receipts.md) selects the exact ordinary/private receipt union, preview/result wire types, getStockCorrectionByOperationKey(ctx,input), collection GET known-key protocol, current-reader authority and immutable historical actor. The generic get-by-id remains, while lost-response callers do not need an unknown correction UUID. [garment-numerics.md](garment-numerics.md) fixes source Number/String effects versus fixed 4-decimal input and the independent oracle; no tolerance weakens approval hashes.

The optional public top-level valuation proof, normalized null/hash identity, actual-owner stock-changing admission and typed unavailable/owner-scope flow are [valuation-qualification.md](valuation-qualification.md). The domain PreviewRequest union is unchanged. The swap adapter and both hosts pass the same optional proof to preview/apply, and invalidate approval when it changes; stockless rejects extra proof. All applicable stock-cost rendering passes the qualified currency explicitly to formatMoney(value,cost.currency), never its PEN default or a billing/display currency.
