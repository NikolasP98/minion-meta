# Receipt-chain manifest, hashes and owning API

This is the exact F2 command boundary supplementing correction.md, not a generic inventory replay API. Implement pure types/strict decoding/hashes in new src/server/services/faces-receipt-correction.logic.ts and .logic.test.ts. It imports only pure shared types/standard hashing/decimal validators, with no application alias runtime graph, DB client, executing CLI or environment reads. The CLI may statically import this pure decoder before bootstrap. The selected new faces-receipt-correction.service.ts owns actual transactions and imports this logic; scripts/lib/faces-receipt-replay.ts remains the pure arithmetic oracle. No second table/migration/HTTP route or new framework is selected.

## Complete exact manifest

```ts
type UUID = string;
type Digest = string; //64 lowercase hex
type EntryEvidence = {
  entryId:UUID,headerRowSha256:Digest,lineId:UUID,lineRowSha256:Digest,
  type:'receipt'|'issue',ledgerId:string,ledgerRowSha256:Digest,
  qty:string,uom:string|null,rate:string|null,qtyDelta:string,valueDelta:string,
  qtyAfter:string,valuationRate:string,
  source:{kind:'receipt',id:UUID}|{kind:'pos_ticket',id:UUID}|{kind:'booking',id:UUID}
};
type ConsumerEvidence =
  | {kind:'pos_ticket',id:UUID,rowSha256:Digest,currentEntryId:UUID,
      financialFiscalSha256:Digest,replacementEntryId:UUID}
  | {kind:'stock_accrual',id:UUID,rowSha256:Digest,currentEntryId:UUID,
      sourceType:'booking',sourceId:UUID,realizedQty:string,realizedValue:string,
      replacementEntryId:UUID,intendedRealizedValue:string};
type EntryReplacement = {sourceEntryId:UUID,replacementEntryId:UUID};
type ReplayEffect = {phase:'reverse_issue'|'reverse_receipt'|'receipt'|'issue',
  entryId:UUID,qtyDelta:string,valueDelta:string,qtyAfter:string,valuationRate:string};
type ReceiptManifestBase = {
  schemaVersion:1,kind:'receipt_chain',target:QualifiedOperatorTarget,
  sourceCodeSha:string,orgId:UUID,actorProfileId:UUID,operationKey:UUID,
  sourceReceiptId:UUID,sourceReceiptLineId:UUID,itemId:UUID,warehouseId:UUID,stockUom:string,
  entries:EntryEvidence[],consumers:ConsumerEvidence[],entryMap:EntryReplacement[],
  opening:{qty:string,value:string,valuationRate:string,ledgerId:string|null,rowSha256:Digest|null},
  before:{binRowSha256:Digest,latestLedgerId:string,latestLedgerRowSha256:Digest,
    itemRowSha256:Digest,ruleStateSha256:Digest,sourceStateSha256:Digest,
    financialFiscalSha256:Digest,policyStateSha256:Digest},
  intended:{receiptQty:string,receiptRate:string,effects:ReplayEffect[],
    terminalQty:string,terminalValue:string,terminalRate:string,netCogsDelta:string},
  postedAt:string,accountingTimezone:string,correctionMonth:string,
  reason:string,ownerApprovalReference:string
};
// Shared existing S1/S2 pure module, created in T003 before this US3 module:
import type { DocumentBasis, UnitQualification } from '../../../scripts/lib/faces-receipt-replay';
// Import decodeDocumentBasis/decodeUnitQualification from that same pure module.
// DocumentBasis retains policy verified_document_total and all prior fields,
// plus the exact unitQualification from contracts/diagnostic-wire.md.
export type ReceiptChainManifestV1 =
  | (ReceiptManifestBase & {action:'correct',basis:DocumentBasis})
  | (ReceiptManifestBase & {action:'compensate',inverseOfOperationId:UUID,
      basis:{policy:'restore_prior_before_snapshot',priorManifestSha256:Digest,
        originalDocumentSha256:Digest}});
export type ReceiptCorrectionCommand = {
  manifest:ReceiptChainManifestV1,approvedPlanSha256:Digest,previewHash:Digest
};
export type ReceiptCorrectionStatusInput = {target:QualifiedOperatorTarget,
  orgId:UUID,actorProfileId:UUID, // current authenticated status reader; not historical manifest actor
  operationKey:UUID,action:'correct'|'compensate',manifestSha256:Digest,
  manifest:ReceiptChainManifestV1};
```

QualifiedOperatorTarget is the exact F7 credential-free databaseIdentity/authProject/authUrl record. Reject unknown keys recursively, omitted required fields, correct-mode inverseOfOperationId, and mixed/wrong action/basis. An absent document means diagnostic hypothetical/ineligible; it cannot be represented as executable correct manifest. Compensation document SHA/prior manifest MUST equal the actual retained applied forward receipt and retained source, never caller-supplied replacement basis.

| Field or family | Accepted representation and bound | Cross-field invariant |
| --- | --- | --- |
| UUIDs and source-code identity | Canonical lowercase UUIDs; code SHA is exactly 40 lowercase hexadecimal characters. | Identifiers bind the approved source and replacement identities. |
| Ledger sequence IDs | Canonical positive PostgreSQL bigint strings, at most 9223372036854775807; never Number. | Sort numerically using BigInt. |
| entries | Exactly one receipt followed by 0–128 single-line issues in increasing original ledger order. | Unique entry/line/ledger IDs; one selected item and warehouse; first source.kind is receipt and its ID equals sourceReceiptId; each issue has its exact source kind and ID. |
| Positive quantities | Existing finite positive decimal admission: at most nine integer and four fractional digits. | Intended receipt quantity equals the original frozen quantity; new stock quantities retain F3 admission/oracle limits. |
| Original stored numeric evidence | Exact PostgreSQL text, including trailing zeros; at most 128 UTF-8 bytes. Signed values may have a minus sign but not plus, exponent, NaN, Infinity or negative zero. | Preserve the raw text in every source hash; do not decimal-normalize a hashed source fact. |
| Intended generated effects | Canonical finite String(Number-result) from selected source math, including exponent spelling when emitted; at most 128 bytes; reject nonfinite and negative zero. | Receipt rate follows manifest.basis.policy and the selected source-engine oracle. |

Generated PostgreSQL numeric text can expand an engine exponent: 1e-8 becomes 0.00000001. For generated-effect equality only, validate the actual numeric text against the same finite/magnitude oracle bounds and compare String(Number(actualText)) to the approved canonical engine string. This does not reserialize, weaken or replace any raw original-row fingerprint. Apply uses exact equality after that declared canonicalization; diagnostic tolerances do not authorize different approved effects.

entryMap has exactly 1 + issueCount distinct source→new UUID pairs in entries order; no ID equals an original or unrelated existing entry. Replay on the exact prior receipt is the only exception to “unused replacement UUID”. effects has exactly 2 × (1 + issueCount) records: reverse issues descending ledger sequence, reverse receipt, new receipt, new issues ascending sequence. A reversal effect entryId is its original source entry; replacement effect entryId is its preallocated new UUID. Quantities/values match the full source-engine replay and independent oracle, never caller authority. consumers has the complete exact actual set, at most 128 POS consumers plus 128 accruals; sort kind/id, no duplicate consumer ID. EntryEvidence.source.kind='pos_ticket' is the normalized projection of actual stock metadata source='pos'; 'booking' maps actual source='booking'. ConsumerEvidence.currentEntryId projects pos_tickets.stock_entry_id or stk_accruals.realized_entry_id respectively; sourceType='booking' projects actual stk_accruals.source, not a new database column. Each POS-owned issue has exactly one POS consumer and no accrual; each booking issue has exactly one same-source/item accrual and no POS pointer. Every replacement pointer belongs to the map; preserve expected reservation quantities. actual source/consumer row hashes use F3's raw PostgreSQL to_jsonb(row)::text under UTC, SHA-256 before driver JSON/date/number conversion; select only approved evidence fields in readable output. No raw customer, supplier, payment/fiscal row, credential or arbitrary metadata enters this manifest. financialFiscalSha256 binds the complete actual source-family digest defined by F3 workflow.md, including payment and applicable invoice/shift/emission evidence, not just a display total.

The complete same-key ledger segment/boundary, item/UOM/recipe, original and consumer row sets and selected policy digest MUST be independently reconstructed in the owning snapshot/guarded apply. Opening absent has qty/value='0', ledgerId/rowSha256=null, preserving actual zero versus unavailable; incomplete opening is ineligible, not fabricated zero. A boundary or count mismatch is stale/incomplete, never truncation. Rule/policy/source digests use the complete actual selected F3 source/stock/policy row-hash structures, and F7 trusted authority projection, in their fixed order; no opaque caller fingerprint substitutes those reads.

| Field | Required format or bound |
| --- | --- |
| postedAt | UTC timestamp with exactly three fractional digits and Z; exact Date round-trip. |
| accountingTimezone and correctionMonth | Verified IANA zone equals fresh finance settings; month is YYYY-MM containing postedAt in that zone and currently unlocked. |
| reason and owner reference | Each 1–1000 characters after trimming and NFC normalization. |
| currency | Actual verified three-uppercase-letter valuation code. |
| stockUom | 1–80 trimmed NFC characters. |
| Complete manifest | At most 1048576 UTF-8 bytes. |

Preallocated IDs, timestamp, actual source-code identity, reason and owner reference all bind approval. Documentary SHA strings reference separately owner-verified facts; they do not prove an invoice was read. Correct-mode DocumentBasis includes the exact UnitQualification from diagnostic-wire.md: actual receipt/item/document/source-row hashes, historical writer/stock-unit/conversion evidence and current owner attestation. Its source IDs/order/qty and raw nullable UOM must match the owning snapshot, and stockUom equals that separately qualified normalized unit; line.uom remains raw string|null, never filled with item.uom. Missing or contradictory historical proof blocks; today's unit alone cannot qualify a null source label. Full manifest/preview/payload hashes bind the new object. Compensation verifies and inherits it from the actual prior retained correct receipt/manifest hash, mapping current copies to prior original source IDs; it does not require the prior historical attestor to remain current owner. Current executing owner and status-reader admission remain separate. Both actions require current real membership ownership and the existing fresh capability, cost, module, period and effective-policy checks.

## Canonical projections and exact service signatures

Export decodeReceiptChainManifestV1(value:unknown), receiptManifestSha256(manifest), decodeReceiptCorrectionCommand(value:unknown) and decodeReceiptCorrectionStatusInput(value:unknown) from the pure logic module. Server calls strict decoders again; passing a TypeScript object from a trusted-looking CLI does not bypass validation. Canonical JSON is the F3 sorted-object-key UTF-8 algorithm with semantic array order above, no undefined/NaN/implicit dates. manifestSha256 hashes every normalized field of ReceiptChainManifestV1, including action/basis/inverse reference, approvals/evidence refs, actor/target, all original/mapped/consumer/effect facts and posting time. planSha256 is an output alias of this same digest. There is no planSha256/signature/previewHash field inside the manifest. approvedPlanSha256 is external and must equal manifestSha256.

previewHash = SHA256(canonical({schemaVersion:1,domain:'receipt_chain',manifestSha256,sourceStateSha256,stockStateSha256,policyStateSha256})). sourceStateSha256 covers actual complete entries/consumers/financial source digests; stockStateSha256 covers original exact ledger segment+latest/bin/opening/rules; policyStateSha256 covers actual qualified authority/module/period/timezone evidence. Observation/run time is output metadata only, not fresh-state comparison; approved postedAt is manifest intent and cannot change on retry. payloadHash = SHA256(canonical({schemaVersion:1,domain:'receipt_chain',orgId,actorProfileId,manifestSha256,previewHash})). Recompute every fresh-state hash before effects, never trust fields called hashes from the input.

```ts
export function previewReceiptCorrection(ctx:CoreCtx,
  manifest:ReceiptChainManifestV1):Promise<ReceiptCorrectionPreview>;
export function applyReceiptCorrection(ctx:CoreCtx,
  command:ReceiptCorrectionCommand,actor:Actor):Promise<ReceiptCorrectionResult>;
export function getReceiptCorrectionStatus(ctx:CoreCtx,
  input:ReceiptCorrectionStatusInput):Promise<ReceiptCorrectionStatus>;
```

These are the exact existing selected service-file exports, used by actual CLI and native tests. Preview/status each owns one nonlocking repeatable-read, read-only snapshot with F7 active-principal/authority first. Apply owns one F3 guarded transaction holding the [shared write gate](correction.md#shared-write-gate-and-authority-races), exact actor==ctx.profileId==manifest.actorProfileId, fresh real owner and all other established checks. The caller performs shared target/GoTrue/bootstrap admission before invoking the service; no outer transaction or service/global pool fallback.

ReceiptCorrectionPreview is `{schemaVersion:1,domain:'receipt_chain',outcome:'preview',eligible:true,manifestSha256,planSha256,previewHash,sourceStateSha256,stockStateSha256,policyStateSha256,intended:ReceiptManifestBase['intended']}`. Valid but unsupported/incomplete/document-unverified diagnostic inputs use the separate diagnostic wire in diagnostic-wire.md; no fabricated executable preview. The owning strict preview throws the fixed errors below when a manifest cannot execute.

ReceiptCorrectionResult is `{schemaVersion:1,domain:'receipt_chain',outcome:'applied',replayed:boolean,receipt:ReceiptChainReceipt}`. ReceiptChainReceipt is `{correctionId:UUID,operationKey:UUID,action:'correct'|'compensate',inverseOfOperationId:UUID|null,manifestSha256:Digest,previewHash:Digest,payloadHash:Digest,sourceReceiptId:UUID,replacementReceiptId:UUID,entryMap:EntryReplacement[],postedAt:string,accountingTimezone:string,netCogsDelta:string,terminalQty:string,terminalValue:string,terminalRate:string}`. The action determines basis and source refs exactly as correction.md; correct outcome cannot masquerade as an inverse.

Immutable storage: stk_corrections.before is `{entries,consumers,opening,stock:manifest.before}`; intended is `{domain:'receipt_chain',action,inverseOfOperationId:null|UUID,domainManifest:ReceiptChainManifestV1,manifestSha256,previewHash,payloadHash}`; after is `{receipt:ReceiptChainReceipt,entryMap,ledgerRows:{id:string,rowSha256:Digest}[],consumers:ConsumerEvidence[],actualEffects:ReplayEffect[]}`. after.consumers are the actual new pointer/value evidence with currentEntryId set to its replacement, recomputed row hashes and preserved source quantities; actualEffects compares the approved effects under the declared oracle. New actual generated ledger IDs are recorded after insert, not preallocated or guessed in approval. All full evidence fits the admitted caps and is inserted once in the same transaction as stock/ref/audit effects, never postcommit receipt augmentation. Audit contains IDs/digests and one correction row reference, not full raw evidence. No correction UPDATE/DELETE or extra schema field is selected.

## Status, CLI and failures

Status binds exact target/org/action/key/manifest digest and its current authenticated reader, then reads the authoritative same-org immutable receipt first after current authority admission. StatusInput.actorProfileId equals ctx.profileId and the verified current owner subject; manifest.actorProfileId remains the immutable historical operation actor and may differ. Only preview/apply require current actor equality with manifest.actorProfileId. Status never rewrites the supplied manifest or substitutes its reader into manifestSha256, previewHash or the original payloadHash. A currently admitted different owner can acknowledge the exact retained receipt after the historical actor is deleted; it cannot apply or compensate under that former actor identity. A matching committed receipt returns applied even if a later supported inverse/current-state change exists; report currentState:'matches'|'changed'|'compensated' separately. It never reruns apply, takes write-gate or FOR SHARE locks, requires an unchanged current source to acknowledge a stored commit or mints approval. Wrong supplied identity/digest/action is conflict, never a receipt from another intent.

ReceiptCorrectionStatus = `{schemaVersion:1,domain:'receipt_chain',outcome:'applied',receipt:ReceiptChainReceipt,currentState:'matches'|'changed'|'compensated'}` or `{schemaVersion:1,domain:'receipt_chain',outcome:'absent_before_unchanged'|'unknown',receipt:null}`. With no receipt, compare the complete approved before-state in that same authorized snapshot only when the exact manifest is separately available to status; otherwise outcome MUST be unknown. Status CLI requires --manifest PATH and StatusInput.manifest is required (strict original manifest matching the digest). This is a read-only comparison, not a guarantee that another in-flight transaction cannot later commit. Any same-intent retry re-enters the guarded same-key/digest path; mixed/unavailable facts remain unknown and block new writes. A wrong source receipt under another operation key never becomes no-op success.

Exact default preview flags: --org UUID --actor-user UUID --manifest PATH --output PATH. Apply adds mutually exclusive --apply --approved-plan-sha256 DIGEST --preview-hash DIGEST. Status instead adds --status --operation-key UUID --action correct|compensate --manifest-sha256 DIGEST and retains the same immutable manifest/org/output/target admission; --actor-user names the current authenticated status reader under the rule above, without rewriting the historical manifest actor. Reject mismatched supplied scope/action/key, duplicate/unknown flags, missing required fields or simultaneous status/apply before loading business graph. action is manifest-bound, never an independent undo switch. Existing package command is unchanged. Private inputs/output use mode 0600; write complete credential-free JSON to owned temporary path then atomic rename, clean temporary output on failure.

Fixed typed errors carry only code/status, never raw SDK/SQL/server messages: invalid_manifest/invalid_command/target_mismatch/actor_unavailable→exit 2; incomplete_evidence/read_unavailable→exit 3; stale_preview/key_reuse/source_conflict/unsupported_movement/period_unavailable/invariant_failed→exit 4; commit_outcome_unknown→exit 5. Outcome exits are in the single CLI table below. Transport loss around commit or postcommit output failure is unknown, not proof of rollback. Same-key authoritative receipt resolves it; no automatic new key, changed timestamp, fresh approval or inverse is generated. A code must be classified from the actual known boundary, never by parsing private error text. Current authority denial remains generic unavailable and reveals no foreign source state.

## Required executable proof

Pure decoder/hash tests cover every field family, nested unknown/omitted/mixed union key, size/numeric/bigint/date/array order/duplicate/reference bounds, exact stable correct and compensate vectors. Same key with changed action, basis, evidence/owner ref, replacement UUID, time, source/consumer/effect/target must conflict. Actual service/CLI tests cover exact owning signatures, replay/result/receipt placement, action-mismatched status, no-lock/no-write status, committed state later compensated, historical actor deletion with retained receipt/current different-owner acknowledgement and denied-reader negative case, no-receipt unknown versus complete before-snapshot comparison and transport/postcommit-output uncertainty. Exercise full decoder/API in existing ten native behaviors, including actual inverse and every source/consumer set/race/fault, actual source-created receipt/POS/booking null UOM preserved through original→replacement→compensation, missing/changed historical-unit proof refusal and retained prior unit attestation after its actor deletion. Keep exact registered names/counts; pure mocked tests do not replace real app_ledger/F3 migration/native evidence. No implementation test was run while authoring.

## Single CLI outcome and exit table

| Mode and outcome | Exit | Meaning |
| --- | --- | --- |
| Valid preview | 0 | Complete reviewable preview; no apply claim. |
| Apply applied or identical replay | 0 | Exact durable acknowledgement returned. |
| Status applied | 0 | Exact authoritative receipt returned; current-state annotation remains separate. |
| Status absent_before_unchanged | 4 | This snapshot matches the approved before-state without a visible receipt; it does not prove another in-flight transaction cannot commit and never authorizes automatic replay. |
| Status unknown or uncertain commit/output | 5 | No outcome guess or automatic write. |

The existing typed invalid/read/policy error codes retain exits 2/3/4 in the error contract above. Other files link to this table instead of restating it.

## Diagnostic versus executable basis

[diagnostic-wire.md](diagnostic-wire.md) is the independent strict S1/S2 input/result/hash boundary. Its shared DocumentBasis and UnitQualification types/validators live in scripts/lib/faces-receipt-replay.ts from T003; this US3 logic imports them by explicit relative pure-module path and reuses strict validation, never forks schemas. All other ReceiptChainManifestV1/action/command/service/result/status signatures and literals above remain authoritative. A diagnostic outcome/digest, absent invoice, assumed unit or reported hypothesis is not an executable correct manifest and cannot become approvedPlanSha256. New unitQualification fields are immutable business/evidence fields in the full writer manifest digest and intended.domainManifest.


## Implementation decisions (2026-11-17)

- **Helper refusal mapping (IR-005 / CODEBASE-DETAILS-10)**: `mapHelperRefusal` in the logic module: SQLSTATE 40001/40P01/55P03/57014 -> `read_unavailable` (exit 3); `posted_at_out_of_order` -> `period_unavailable`; `not_draft`/`not_submitted`/`no_ledger`/`duplicate_source`/`not_found` -> `source_conflict`; `module_disabled` -> `actor_unavailable`; everything else (`negative_stock`, `guard_mismatch`, `ambient_write_not_allowed`, `invalid_entry_id`) -> `invariant_failed` (all exit 4 except as stated). Transport loss codes (CONNECTION_*/ECONNRESET/EPIPE/ETIMEDOUT) around the transaction -> `commit_outcome_unknown` (exit 5). Raw SDK/SQL text is never surfaced.
- **Status `currentState` (IR-003)**: `compensated` iff a later `receipt_chain` row has `source_entry_id` = this operation's replacement receipt; else `matches` iff the latest same-key ledger id equals the highest ledger id of the replacement entries; else `changed`. The "manifest not separately available" branch is unreachable because `manifest` is required: with no receipt, `absent_before_unchanged` when the full before-state verifies in the same snapshot, else `unknown`.
- **Field table fixes (IR-006)**: there is no `currency` field on `ReceiptManifestBase`; the currency is `basis.valuationCurrency` (correct only). `sourceCodeSha` is approval metadata bound into the manifest hash; the CLI does not verify it against the executing checkout (open end).
- **Quantity admission**: nine integer/four fractional digits is the F3 rule (see correction.md decisions); enforced for `entries[*].qty` and `intended.receiptQty`.
- **Unit proof binding**: the decoder verifies `basis.unitQualification` sources/ids/row hashes/kinds/item hash/document hash against the manifest's own entries and that a stored UOM is null or the proved unit.
- **Prerequisite gate (IR-007)**: add to the dependency list: F7 principal/loader/read-only resolver/bridge qualified on the candidate before T004; F3 primitives qualified before T025. Both are present on the candidate base `dd70f8d7`.
