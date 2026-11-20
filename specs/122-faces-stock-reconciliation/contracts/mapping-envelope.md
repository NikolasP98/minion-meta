# Typed mapping command, immutable receipt and read-only status

This is the typed command contract for the [mapping correction](mapping-correction.md). F1 owns the pure types, strict decoders, hashes and plan in `scripts/lib/faces-garment-mapping.ts` and its test. The owning transactions live in the new `src/server/services/faces-garment-mapping.service.ts` and `faces-garment-mapping.test.ts`; the executing CLI imports the pure input module and never becomes a server-service dependency. The service consumes F3 primitives; no new route or correction table is selected. The runtime uses the qualified injected CoreCtx/DB and F3 stock gate, authority, storage and audit primitives through the admitted loader, not separately committing mapping wrappers.

## Exact inputs

```ts
type UUID = string;
type Digest = string; //64 lowercase hex
type RowRef = {table:'fin_products'|'stk_items'|'stk_consumption'|'stk_item_components';
  key:[UUID]; rowSha256:Digest};
type MappingState = {
  productId:UUID; productRowSha256:Digest;
  directBridgeItemId:UUID|null;
  recipe:{rowId:UUID,itemId:UUID,qtyPerUnit:string,note:string|null,rowSha256:Digest}[];
  ruleRows:RowRef[]; preservedLProductId:UUID; preservedLMappingSha256:Digest;
};
type CensusRow = {sourceType:'pos_ticket'|'booking',sourceId:UUID,
  entryId:UUID|null,accrualId:UUID|null,state:'draft'|'open'|'submitted',rowSha256:Digest};
type MappingCensus = {complete:true,pendingDrafts:CensusRow[],openAccruals:CensusRow[],
  submittedIssues:CensusRow[],ledgerHighWater:string|null,stateSha256:Digest};
type MappingIntent = {rowId:UUID,productId:UUID,itemId:UUID,qtyPerUnit:string,
  stockUom:string,note:string|null};
type MappingManifestBase = {
  schemaVersion:1,kind:'product_mapping',target:QualifiedOperatorTarget,
  sourceCodeSha:string,operationKey:UUID,orgId:UUID,actorProfileId:UUID,
  before:MappingState,intended:MappingIntent,census:MappingCensus,
  unchangedStockPaymentSha256:Digest,
  rollout:{protocolVersion:1,candidateSha:string,evidenceReference:string,evidenceSha256:Digest},
  reason:string,ownerApprovalReference:string
};
export type MappingManifestV1 =
  | (MappingManifestBase & {action:'correct'})
  | (MappingManifestBase & {action:'compensate',inverseOfOperationId:UUID});
export type MappingCommand = {manifest:MappingManifestV1,approvedPlanSha256:Digest,previewHash:Digest};
export type MappingStatusInput = {target:QualifiedOperatorTarget,orgId:UUID,
  actorProfileId:UUID,operationKey:UUID,action:'correct'|'compensate',manifestSha256:Digest,expectedPayloadHash:Digest,
  manifest:MappingManifestV1};
```

`QualifiedOperatorTarget` is defined in [report.md](report.md), section Standalone entrypoint and qualified target encoding. Unknown keys are rejected recursively, including `inverseOfOperationId` in correct mode; all required nullable fields remain explicit. UUIDs are canonical lowercase; `sourceCodeSha` and `candidateSha` are exactly 40 lowercase hex characters matching the qualified deployment. The reason, owner approval reference and evidence reference strings are trimmed NFC, 1–1000 characters, with no credentials or inline evidence. Full input is at most 262,144 UTF-8 bytes. Decimal `qtyPerUnit` is a positive fixed4 string ([data-model.md](../data-model.md)) with at most 9 integer digits; this transition requires `'1.0000'` and the exact verified item stock UOM (1–80 trimmed characters). Original before qty strings retain database spelling. Every selected RowRef.key is the single canonical id UUID (all four selected source tables have this primary key); recipes sort itemId,rowId; ruleRows sort table/key; census arrays sort sourceType/sourceId/entryId/accrualId. Arrays are complete and distinct, not display excerpts. Every census array, `recipe` and `ruleRows` hold at most 1,000 rows; scan limit+1, and incomplete/overflow refuses preview/apply, never truncates. `ledgerHighWater` and every ledger identity follow [data-model.md](../data-model.md), Ledger identity. A hypothetical blocked census is reported separately, never coerced into the executable complete:true manifest.

Correct requires the verified single old L recipe, no direct bridge/component ambiguity, desired M item and fresh exact current row/UOM/rollout evidence. Also required, else `unsupported_scope`: no `stk_item_components` rows under the from/to items and the target `is_stock_item` (the sale path issues components, not the item). Rollout evidence is attested by the operator, not proven by the hash: the tool blocks `rollout_unverified` unless env `FACES_DEPLOYED_SHA` equals `rollout.candidateSha`. intended.rowId is a fresh preallocated UUID, distinct from the old row and every existing consumption row (except exact receipt replay). Replace by delete-old/insert-new inside one gated transaction; preserve the approved note, product ID and quantity. Never call existing setConsumption/deleteConsumption wrappers separately. preservedLMappingSha256 verifies L remains untouched. No stock entry is generated by mapping.

For compensate, inverseOfOperationId names one applied same-org product_mapping receipt with intended.action='correct'. Current M product recipe/bridge/component/UOM must equal that receipt's recorded after mapping; no subsequent mapping operation or source meaning change is permitted. The fresh inverse manifest restores that receipt's before item/quantity/note through a new recipe row UUID, not by reviving its deleted old row. Recompute the directional cutover census for the currently mapped item; pending drafts/open expectations block the inverse too. Submitted later stock history is evidence, never rewritten; fresh owner approval must cover the exact inverse census/impact. Original receipt, forward row identities, audit and inverse receipt survive. Reject inverse-of-inverse, another kind, missing/foreign receipt, prior compensation or intervening mapping state. Production undo remains separately approved; it is never automatic finally behavior.

## Exact owning functions and hashes

```ts
export function decodeMappingManifestV1(value:unknown):MappingManifestV1;
export function mappingManifestSha256(manifest:MappingManifestV1):Digest;
export function decodeMappingCommand(value:unknown):MappingCommand;
export function decodeMappingStatusInput(value:unknown):MappingStatusInput;
export function previewMappingCorrection(ctx:CoreCtx,
  manifest:MappingManifestV1):Promise<MappingPreview>;
export function applyMappingCorrection(ctx:CoreCtx,
  command:MappingCommand,actor:Actor):Promise<MappingApplyResult>;
export function getMappingCorrectionStatus(ctx:CoreCtx,
  input:MappingStatusInput):Promise<MappingStatusResult>;
```

The pure library has no runtime application alias/schema/service imports or executing CLI side effects; server code can import its pure validators without invoking a command. The new owning service uses actual passed ctx and normal actual F3/F7/audit/schema imports. Each owning function creates one transaction: preview and status use a repeatable-read read-only transaction, and apply uses the F3 guarded write transaction. No outer CLI transaction, nested service transaction, arbitrary SQL callback or global DB fallback. The required actor is the verified ctx principal; mapping preview, apply and status require the current real `membershipRole === 'owner'` plus the existing fresh stock:manage/POS/finance/module/effective-authority matrix. A custom role named owner and an owner reference string are not authority.

F1 adds the closed loader key `garmentMapping`→`src/server/services/faces-garment-mapping.service.ts`, its exact `typeof import` namespace and a real package smoke in the same implementing slice; the F7-created loader must not import a module that does not exist yet. The CLI statically imports only the pure mapping decoder and target/principal facilities, then loads this service after admission. It passes the qualified injected ctx; the service never discovers a database. Native tests call these same owning exports, not an orchestration mock.

`manifestSha256` hashes every normalized manifest field, including actor/target, action/inverse reference, desired fresh row UUID, all evidence/approval refs, before/census/rollout and unchanged-stock/payment digest, using F3 recursively sorted-key UTF-8 JSON. `planSha256` is an output alias of the same digest, not another projection. The manifest has no `planSha256`, `previewHash` or approval-signature fields, which prevents circular hashing. `approvedPlanSha256` must equal this digest.

previewHash = SHA256(canonical({schemaVersion:1,domain:'product_mapping',manifestSha256,beforeStateSha256,censusStateSha256,policyStateSha256})). These state hashes bind fresh complete row sets and the F7 authority/period/module projection. Source observation times are output metadata only, not censusStateSha256; no newly read current time is compared to a prior time as state. payloadHash = SHA256(canonical({schemaVersion:1,domain:'product_mapping',orgId,actorProfileId,manifestSha256,previewHash})). No manifest field is excluded because it seems incidental. The service recomputes all hashes; CLI parsing cannot attest authority.

MappingPreview exact fields are `{schemaVersion:1,domain:'product_mapping',outcome:'preview',eligible:true,manifestSha256,planSha256,previewHash,payloadHash,beforeStateSha256,censusStateSha256,policyStateSha256,intended:MappingIntent}`. A valid but blocked request instead returns `{schemaVersion:1,domain:'product_mapping',outcome:'blocked',eligible:false,code:'cutover_pending_sources'|'unsupported_scope'|'rollout_unverified'|'incomplete_evidence'}` with no executable previewHash. Decode/auth/target failures remain typed errors, never eligible outputs.

MappingApplyResult is `{schemaVersion:1,domain:'product_mapping',outcome:'applied',replayed:boolean,receipt:MappingReceipt}`. MappingReceipt is `{correctionId:UUID,operationKey:UUID,action:'correct'|'compensate',inverseOfOperationId:UUID|null,manifestSha256:Digest,previewHash:Digest,payloadHash:Digest,originalRecipeRowId:UUID,replacementRecipeRowId:UUID,beforeStateSha256:Digest,afterStateSha256:Digest,censusStateSha256:Digest,unchangedStockPaymentSha256:Digest}`. No credentials or raw financial rows are returned. The shared stk_corrections row has kind product_mapping, source_type fin_product/source_id M product, null stock-entry refs. before stores `{mappingState,census,unchangedStockPaymentSha256,policyStateSha256}`; intended stores `{domain:'product_mapping',action,inverseOfOperationId:null|UUID,domainManifest:MappingManifestV1,manifestSha256,previewHash,payloadHash}`; after stores `{mappingState,receipt:MappingReceipt,unchangedStockPaymentSha256}`. Insert all immutable fields and one audit in the same transaction as recipe replacement, never patch the receipt after commit. Audit exposes hashes/IDs only.

## Status, cutover and CLI

The gate-held fresh census, replacement and final before-commit verification belong only to apply. `getMappingCorrectionStatus` runs in a repeatable-read read-only transaction and never acquires the write gate pair ([report.md](report.md), Gate terms) or `FOR SHARE`/`FOR UPDATE` row locks. It first verifies actual current principal/org/capabilities, then reads the immutable same-org key and compares action/target/manifest and supplied expectedPayloadHash identity; current reader authority is independent of the historical stored actor. A matching receipt proves that operation committed even if later current state changed; status reports currentState:'matches'|'changed'|'compensated'|'unavailable' separately and never retries a write. Stored census is the recorded gate-held evidence. Any optional new read-only census is only a current snapshot, not a claim that posters were drained or a new cutover was certified.

MappingStatusResult is `{schemaVersion:1,domain:'product_mapping',outcome:'applied',receipt:MappingReceipt,currentState:'matches'|'changed'|'compensated'|'unavailable'}` or `{schemaVersion:1,domain:'product_mapping',outcome:'absent_before_unchanged'|'unknown',receipt:null}`. StatusInput.manifest is the strict original manifest matching supplied target/action/key/digest (the supplied `actorProfileId` is the current verified reader, while the manifest actor is immutable historical intent). With no receipt, complete before/census equality against that manifest in the same snapshot yields absent_before_unchanged, which is not a promise that an in-flight transaction cannot later commit; any retry uses only the same key/hash and actual guarded receipt admission. Mixed/unavailable state is unknown. Wrong key payload/action/target is conflict, not an applied receipt. Denied scope remains generic unavailable.

Exact preview/apply flags are --org UUID --manifest PATH --output PATH, with optional --apply --approved-plan-sha256 DIGEST --preview-hash DIGEST. Manifest supplies the exact actor; no actor lookup/default. Explicit --status is mutually exclusive with --apply and requires --org UUID --manifest PATH --actor-user UUID --operation-key UUID --action correct|compensate --manifest-sha256 DIGEST --payload-sha256 DIGEST --output PATH. `--actor-user` populates `MappingStatusInput.actorProfileId` (the current reader) and must equal the verified principal; `--payload-sha256` populates `expectedPayloadHash`. The strict original manifest supplies the target and before-state, not a new executable intent. No business read precedes shared private-env/transport/principal admission. Reject missing/unknown/duplicate/mixed flags before imports. All private inputs and output are mode 0600, and output is atomically renamed after complete serialization; no partial credential-bearing file.

Exit codes: 0 for an eligible preview, an applied or replayed result, or an applied status; 2 for invalid arguments, authentication or target; 3 for incomplete DB/schema/timeout/read; 4 for blocked, stale or `absent_before_unchanged`; 5 for transport/COMMIT uncertainty, `unknown` status, or `operation_conflict` (another request holds the key: run `--status`). A postcommit output failure is unknown until same-key status, never verified rollback. Returning applied is bound to a durable matching receipt; a desired mapping without a receipt is unknown. No automatic new operation key/reapproval.

## Required proof

Extend F1's existing eight native behaviors and ordinary mapping/CLI tests, without inventing a ninth name. Strictly reject unknown/nested keys, omitted fields, malformed target/action/row IDs/census and every over-limit case. Mutate each hash-bound family independently (including reason/approval/cutover/row UUID/action/inverse reference) under the same key and require conflict, not replay. Assert the owning preview/apply/status functions, byte-identical decoder/hash vectors, same-key replay zero writes, wrong-action status conflict, no-receipt/mixed state unknown and status takes zero advisory/row locks and makes zero writes. Race a status read with a gated apply; no-snapshot receipt must not be reported rollback. Forward plus new-key inverse restores the fixture mapping semantically with a new row ID and two preserved receipts and audits; intervening row or pending draft/accrual blocks compensation. Quantities, ledger, bins and payments remain unchanged for both mapping directions. Garment inverse runs before mapping inverse when the fixture exercises both; each gets fresh independently approved synthetic intent and its own immutable receipt.

[unchanged-facts.md](unchanged-facts.md) is the exact bounded table/key/all-field PostgreSQL row digest/set/canonical preimage and no-other-DML invariant for unchangedStockPaymentSha256. It applies independently to both mapping directions; it is not a whole-organization freeze claim.

MappingPreview.payloadHash is the computed payload digest available before apply, retained with key/manifest/preview evidence for authoritative status. `MappingStatusInput.expectedPayloadHash` and `--payload-sha256` are required and compared to the immutable row before acknowledgement; a matching manifest digest alone cannot substitute an unverified preview/payload identity. Current-state diagnostic absence/failure is unavailable, distinct from committed outcome, and cleanup follows F3 recovery-receipts.md (no work in aborted transaction).


## Implementation decisions (2026-11-17)

`qtyPerUnit` is in the target item's consumption unit; preview requires `qtyPerUnit / units_per_stock_uom` to be exactly one stock unit (Q4) for the M item and the L baseline with equal stock UOM labels, else blocked `unsupported_scope`. Census predicates, the `--draft` manifest producer and the finance-sync stable-subset hashing are in [tasks.md](../tasks.md) Implementation deviations 3-6.
