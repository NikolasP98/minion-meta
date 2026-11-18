# Known-key recovery and exact F3 receipt union

This contract selects authoritative commit acknowledgement without repeating an uncertain write. It supplements workflow.md/garment-envelope.md. F1 product_mapping and F2 receipt_chain retain their own typed owning status services; F3 does not import those future modules or add a generic domain dispatcher.

## Exact neutral public/private result types

Export these from stock-corrections.logic.ts with strict response decoders shared by the scoped server/UI. UUID/Digest use the established formats; source decimal strings remain strings, never coerced through a missing-value zero.

```ts
type QuantityEffect = {itemId:UUID,warehouseId:UUID,qtyBefore:string,qtyAfter:string};
type CostEffect = {itemId:UUID,warehouseId:UUID,valueBefore:string,valueAfter:string,
  valuationRateBefore:string,valuationRateAfter:string,cogsDelta:string};
type CorrectionCost = {state:'available',currency:string,
    valuationQualificationSha256:Digest,rows:CostEffect[]}
  | {state:'unavailable',reason:'valuation_currency_unverified'}
  | {state:'denied'} | {state:'not_applicable'};
type OrdinaryCorrectionReceipt = {
  domain:'ordinary',schemaVersion:1,correctionId:UUID,operationKey:UUID,
  kind:'sale_variant'|'receipt_replace',sourceType:'pos_ticket_line'|'stock_receipt',sourceId:UUID,
  sourceEntryId:UUID|null,replacementEntryId:UUID|null,
  actorId:UUID,appliedAt:string,reason:string,previewHash:Digest,payloadHash:Digest,
  productChange:{fromProductId:UUID,toProductId:UUID}|null,
  quantityEffects:QuantityEffect[],cost:CorrectionCost
};
type GarmentCorrectionReceipt = {
  domain:'garment_stock_only',schemaVersion:1,correctionId:UUID,operationKey:UUID,
  kind:'sale_stock_repost',action:'correct'|'compensate',inverseOfOperationId:UUID|null,
  sourceType:'pos_ticket_line',sourceId:UUID,sourceEntryId:UUID,replacementEntryId:UUID,
  actorId:UUID,appliedAt:string,manifest:GarmentManifestV1,
  currency:string,valuationQualificationSha256:Digest,
  manifestSha256:Digest,previewHash:Digest,payloadHash:Digest,
  reversalLedgerIds:string[],replacementLedgerIds:string[],
  beforeEffects:GarmentEffect[],intendedEffects:GarmentEffect[],afterEffects:GarmentEffect[]
};
export type CorrectionReceipt = OrdinaryCorrectionReceipt | GarmentCorrectionReceipt;
export type CorrectionResult = {schemaVersion:1,outcome:'applied',replayed:boolean,
  receipt:CorrectionReceipt};
export type CorrectionPreviewCommand = {request:PreviewRequest,reason:string,
  valuation?:StockValuationQualificationV1};
export type GarmentCorrectionResult = Omit<CorrectionResult,'receipt'> & {receipt:GarmentCorrectionReceipt};
export type GarmentCorrectionStatus =
  | {schemaVersion:1,outcome:'applied',receipt:GarmentCorrectionReceipt,currentState:'matches'|'changed'|'compensated'|'unavailable'}
  | {schemaVersion:1,outcome:'unknown',receipt:null};
export type CorrectionStatusInput = {operationKey:UUID,expectedPayloadHash:Digest};
export type CorrectionStatus =
  | {schemaVersion:1,outcome:'applied',receipt:CorrectionReceipt,
      currentState:'matches'|'changed'|'compensated'|'unavailable'}
  | {schemaVersion:1,outcome:'unknown',receipt:null};
```

Ordinary both-empty sale has sourceEntryId/replacementEntryId null, quantityEffects:[], cost:not_applicable and actual productChange. Stock-moving ordinary receipts have complete admitted quantity effects; cost is available only with current finance authority, otherwise denied and no monetary keys/rows. No normalized request containing hidden receipt rates or raw stored before/intended JSON is spread into a denied response. Receipt replacement productChange is null. kind/source/entry nullability follows the exact storage matrix. All availability is decided by current source/record/module authority, never by payloadHash possession.

Garment receipt is the full bounded immutable approved manifest plus actual authoritative generated ledger/entry/effect evidence, available only to a current real membership owner with the private finance/stock/POS/effective/source matrix. No quantity-only garment-manifest variant is selected; nonowner or denied current private scope gets `404` and no existence/details. Historical actorId remains an immutable UUID; it need not still have a live profile. The current authorized reader may differ from the historical actor. Current reader authority is not inferred from stored actor/name/reference. getStockCorrection(ctx,id) returns CorrectionResult with replayed:true using this exact union; the HTTP by-id handler projects the same authority-bound receipt. A later compensated/changed state does not erase the original receipt or turn a committed operation into unknown.

Ordinary CorrectionPreview is exactly `{schemaVersion:1,domain:'ordinary',mode:'variant_swap'|'receipt_replace',sourceType:'pos_ticket_line'|'stock_receipt',sourceId:UUID,eligible:boolean,previewHash:Digest|null,payloadHash:Digest|null,blockers:string[],productChange:{fromProductId:UUID,toProductId:UUID}|null,quantityEffects:QuantityEffect[],cost:CorrectionCost,valuationScope:StockValuationQualificationV1['keys']|null}`. blockers use only the documented fixed workflow error/blocker codes (no server text); nonexecutable previewHash:null and eligible:false cannot reach apply. Same valid stockless preview is eligible with cost:not_applicable. Complete admitted cost preview has the same effect definitions/normalization as the private numeric contract where applicable, preserving the ordinary source posting formulas. No raw source JSON or hidden monetary field is exposed by a preview.

Private previewGarmentStockCorrection instead returns GarmentCorrectionPreview exact `{schemaVersion:1,domain:'garment_stock_only',eligible:true,manifestSha256:Digest,previewHash:Digest,payloadHash:Digest,currency:string,valuationQualificationSha256:Digest,beforeEffects:GarmentEffect[],intendedEffects:GarmentEffect[]}`; ineligible input throws documented typed refusal with zero effects, not a partially executable private object. applyGarmentStockCorrection returns CorrectionResult with a narrowed GarmentCorrectionReceipt; its direct owning status API is below. No public body can supply this private preview discriminator/manifest to generic apply.

## Lookup by known operation key

Add getStockCorrectionByOperationKey(ctx:CoreCtx,input:CorrectionStatusInput):Promise<CorrectionStatus> to the same owning stock-corrections.service.ts. It owns a technically REPEATABLE READ READ ONLY transaction with current principal/org/capability/source checks first; it never acquires stock-v1, the org authority lock or `FOR SHARE`, and never calls preview/apply. Query exact `(ctx.tenantId,operation_key)`, not an unscoped operation ID search. Matching row payload_hash acknowledges that immutable committed result, even if current source later changed; decode its stored typed owned-domain envelope and return currentState separately. A matching hash is identity binding, not permission. Wrong known-key payload yields `409` key_reuse with no receipt. A missing/foreign/unavailable row is unknown with receipt:null, not proof of rollback or permission for a new key. No already-applied fingerprint must equal current bins just to acknowledge a historical commit. Actual state diagnostics may say changed/compensated; failure to qualify the current diagnostic does not negate a decoded matching committed receipt (use unavailable rather than inventing a changed fact).

The F3 lookup handles only ordinary sale_variant/receipt_replace and its private garment-domain sale_stock_repost. Other stored domains/kinds, invalid discriminators or malformed stored envelopes yield generic unavailable/unsupported with no raw JSON. Product mapping and receipt-chain callers use their owning services, not this handler. Do not import missing future F1/F2 code into F3.

Expose GET `/api/stock/corrections?operationKey=<uuid>&payloadHash=<64hex>` in the already selected collection +server.ts (same path as POST apply). Require exactly those two query keys and no actor/org/source body; reject malformed, duplicate or unknown query keys with `400`. Use the same effect-sensitive current read admission as by-id detail, including POS-only stockless receipts; the handler derives ctx/reader from locals and service resolves kind before disclosure. Central registry/RBAC adds only this exact GET method/path alongside existing correction contracts, preserving unrelated stock-prefix rules. Return `200` CorrectionStatus for authorized applied or unknown outcomes; `403`, `404`, `409` and `400` follow the documented current-authority and conflict semantics. No special cache of private receipts: private,no-store successful response and client fetch cache:no-store. The existing by-id route remains for a known correction UUID.

Public POST apply and existing swap wrapper responses are `200` CorrectionResult. Update the selected POS ticket/stock-entry UI and mounted route tests to strict-decode this union. A public UI never treats a private manifest as an ordinary diff; unknown discriminator is unavailable. Before POST persist the stable operationKey+expectedPayloadHash (the payloadHash returned by the successful preview) for the same intent in its existing owned request state. On transport/output uncertainty, perform an explicit known-key GET; applied receipt→success without POST; unknown→show unconfirmed, no automatic new-key write. A manual retry may repeat only the exact same key/payload through actual guarded server admission, never a regenerated preview/time/reason. Lost response therefore does not require a correction UUID the client never received. Same-intent manual retry remains subject to current actual authority; known-rollback transients follow the existing maximum-three-attempt policy, not unknown-commit retries.

## Exact private garment CLI status

Add getGarmentCorrectionStatus(ctx:CoreCtx,input:{operationKey:UUID,expectedPayloadHash:Digest,manifest:GarmentManifestV1,previewHash:Digest}):Promise<GarmentCorrectionStatus> to the same F3 service. Require the private current-reader real-owner matrix, decode the original manifest, verify key/target/org and recompute its historical manifest/payload digest using the original manifest actor/previewHash. This status never requires the original actor still exists or the current reader equals that historical actor. The current reader is verified independently before business reads. Return only a narrowed garment receipt, or unknown; another owned domain under the key conflicts/refuses. No fresh stock write/census/reapproval occurs.

F1 `faces:stock:repair` default preview takes --org UUID --actor-user UUID --manifest PATH --output PATH. Preview/apply actor must equal manifest.actorProfileId; apply additionally requires --apply --approved-plan-sha256 DIGEST --preview-hash DIGEST. Status is mutually exclusive --status with --operation-key UUID --payload-sha256 DIGEST --preview-hash DIGEST, retains --org/--actor-user/--manifest/--output. For status only, actor-user is the current authorized reader and may differ from manifest actor; the original manifest, key, previewHash and payload digest must all still match. Any missing required flag, or a wrong scope, action or target, is rejected before the loader or business graph runs. No token/DB credential flags, automatic key change or ad-hoc hidden option.

CLI output is the exact GarmentCorrectionPreview, CorrectionResult or narrowed CorrectionStatus union, written atomically with mode `0600`. Exit codes:

| Exit code | Meaning |
| --- | --- |
| `0` | valid preview, applied or replayed |
| `2` | malformed input, authentication, target or current-reader denial |
| `3` | read, schema or timeout failure |
| `4` | stale, blocked (including `posted_at_out_of_order`) or key conflict |
| `5` | unknown status, COMMIT or post-commit output uncertainty |
 A known stored applied receipt is never lost because a later source changed. An unknown result carries operationKey+expectedPayloadHash only, no leaked internal error or invented success. F1 wrapper invokes these actual F3 owning functions after shared admission; local tests/native fixtures never fake status with a CLI-only query.

## Proof and immutable historical actor

Within existing thirteen native behaviors, extend operation reuse/lost response and account-deletion cases: known-key lookup after deliberately lost response with no correction UUID; exact full ordinary/cost-denied/private receipt serialization; unknown key zero writes; wrong hash/cross-kind/foreign/current-reader denial; private current owner different from deleted historical actor; compensation retains both receipts. Route/mounted tests drive actual GET collection/header/cache/decoder/unknown-no-auto-POST behavior. Native status statement receipts prove REPEATABLE READ READ ONLY and zero advisory/row writer locks.

actor_id is a nonnull historical UUID soft reference, with no FK to profiles or auth.users and no ON DELETE CASCADE/SET NULL behavior. Insert admission requires actor_id equals the verified current principal/GUC and F7 actual active membership/profile/org under the existing pair; an INSERT RLS check also binds actor_id to app.current_profile_id. After commit retain UUID without joining/exporting profile PII. This preserves correction/audit evidence when canonical auth.users→profiles deletion later cascades. Native catalog must assert actor_id NOTNULL and absence of an actor FK. Create a real secondary synthetic auth user/profile with admitted roles (a different surviving owner owns the organization, avoiding unrelated organization-owner FK blockers), execute the actual admitted correction, then perform actual owned-fixture auth.users deletion after blockers release; assert profile removed and correction UUID/actor/evidence unchanged, and a different currently authorized owner can read its protected receipt. Also retain deletion-first admission refusal/correction-first ordering tests. Existing doc_audit_log.actor_id is already a soft UUID in pg-activity-schema.ts; do not add an audit FK that recreates this blocker.


To make that expected digest available before a potentially lost apply response, the public POST /api/stock/corrections/preview accepts exactly `{request:PreviewRequest,reason:string,valuation?:StockValuationQualificationV1}` (CorrectionPreviewCommand). previewStockCorrection(ctx,request,reason,valuation?) has required reason and the optional top-level qualification and returns payloadHash computed from the actual qualified org/actor, normalized request, normalized valuation:null|proof, freshly computed previewHash and normalized reason using workflow.md's exact payload preimage. Ineligible outputs have both hashes null. Apply CorrectionCommand/HTTP body additionally requires payloadHash; recompute server-side and reject a mismatch with `409` before effects. No payload identity relies on a client computing hidden authority facts. The UI obtains reason before preview, retains operation key+both returned hashes for that same intent, and invalidates the executable preview if reason/request changes. Existing selected swap wrapper also requires this payloadHash with reason/key/previewHash; old missing-field tabs refresh_required/no effects. Private garment preview likewise returns its fully computed payloadHash for known-key recovery; F1 CLI carries that exact hash, with no invented proof from file names or after-the-fact response IDs. This is a new correction protocol, not a change to legacy stock submit bodies.

Optional current-state diagnostics do not weaken receipt acknowledgement: after actual current reader/source admission and exact immutable receipt decoding, a failed optional diagnostic returns currentState unavailable. A SQL error must rollback/release the owned read transaction before returning that already-authorized decoded historical receipt; no query continues in an aborted transaction, no global fallback or cached pre-admission receipt is used. Auth/hash/schema failure cannot use this fallback. Test rollback/cleanup and currentState unavailable separately from applied versus unknown commit outcome.


## Exact ordinary/private immutable JSON placement

For ordinary domains, before is `{domain:'ordinary',sourceSnapshot,stockSnapshot,policySnapshot}` using workflow.md's complete safe hash structures. intended is `{domain:'ordinary',request:PreviewRequest,valuation:StockValuationQualificationV1|null,reason,previewHash,payloadHash,productChange,quantityEffects,costEffects:CostEffect[]}`; no stock costs for both-empty, which has costEffects:[]. after is `{domain:'ordinary',receipt:OrdinaryCorrectionReceipt,actualLedgerRows:{id:string,rowSha256:Digest}[],financialInvariantSha256:Digest,visitProduct}`, where `visitProduct` is the record defined in [workflow.md](workflow.md#visit-product-association) (`null` for receipts and for lines without a booking). The stored receipt's cost is available with all actual approved rows for a stock-moving apply or not_applicable for both-empty; current-reader cost denial is a READ projection, never a mutation of stored evidence. Assert actual quantity/cost effects equal the admitted plan under the selected numeric oracle before inserting this single completed row.

For private garment, before is `{domain:'garment_stock_only',sourceSnapshot,stockSnapshot,policySnapshot,beforeEffects}`. intended retains `{domain:'garment_stock_only',action,inverseOfOperationId,domainManifest:GarmentManifestV1,manifestSha256,previewHash,payloadHash}`. after is `{domain:'garment_stock_only',receipt:GarmentCorrectionReceipt}` with the actual generated reversal/replacement ledger IDs and actual afterEffects. The manifest in that full receipt is an exact immutable copy of intended.domainManifest, not a postcommit sidecar or re-created from current mappings. Status decoder verifies matching discriminator/action/IDs/digests between all three JSON fields before exposing the typed receipt. All JSON together remains ≤ 4194304 bytes; overflow fails before commit, no truncated receipt. One operation INSERT plus one audit participates in the same stock/stamp transaction; no receipt UPDATE, later augmentation or mutable pending row. Native fault injection at envelope validation/size/insert/audit proves complete rollback and read-only projections preserve stored bytes.

The public operation identity is durably saved before POST via [browser-recovery.md](browser-recovery.md), not merely component state. Reload/crash restores only that scoped pointer and authorized GET outcome. The typed not_applied preflight marker is the sole current-original-attempt no-DML clearing exception; unknown pointers remain blocked. Private CLI retains its protected manifest-file recovery.

Qualified currency, owner-only valuationScope/re-preview input, immutable proof binding and denial stripping are exact in [valuation-qualification.md](valuation-qualification.md). All CostEffect monetary fields inherit the enclosing available cost.currency; no row is formatted in isolation or with a default/ticket currency. Private receipt/preview currency and valuationQualificationSha256 must match manifest.valuation exactly. Public cost denial omits qualification/reference/currency as well as amounts. API GET/HEAD delegation and masked collection lookup are exact in [api-admission.md](api-admission.md).
