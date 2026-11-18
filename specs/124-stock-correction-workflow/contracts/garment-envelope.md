# Private F1 garment command and atomic evidence envelope

This is the concrete F1→F3 service boundary. Public correction endpoints accept variant_swap or receipt_replace only. A stock_only body receives `422` owner_evidence_required, zero effects; a user-supplied evidenceSha256 or approvedItemMapping is never an attestation. The ticket UI can explain the blocker and produce an inert F1 packet, not submit private intent. F1 CLI executes only after target verification, GoTrue principal verification, explicit owner spec/operation approval and deployed foundation qualification.

## Typed complete manifest and digest

Export GarmentManifestV1 and its strict decoder from stock-corrections.logic.ts, so server code does not import an executing CLI module. F1 imports that type/decoder after shared bootstrap. Required exact fields (unknown keys rejected):

```ts
type Digest = string; // exactly 64 lowercase hex
interface GarmentBinFingerprint {
  itemId: string; warehouseId: string; exists: boolean;
  rowSha256: Digest | null; latestLedgerId: string | null;
  latestLedgerRowSha256: Digest | null;
}
interface GarmentEffect {
  itemId: string; warehouseId: string;
  qtyBefore: string; qtyAfter: string;
  valueBefore: string; valueAfter: string; cogsDelta: string;
}
export interface GarmentManifestV1 {
  schemaVersion: 1; kind: 'garment_stock_only';
  valuation: StockValuationQualificationV1;
  action: 'correct' | 'compensate'; inverseOfOperationId: string | null;
  target: QualifiedOperatorTarget; sourceCodeSha: string;
  operationKey: string; orgId: string; actorProfileId: string;
  ticketId: string; lineId: string; originalEntryId: string;
  replacementEntryId: string; originalLedgerIds: string[];
  oldItemId: string; newItemId: string; qty: string; stockUom: string;
  warehouseId: string; mappingCorrectionId: string;
  sourceFingerprint: Digest; mappingFingerprint: Digest;
  binFingerprints: GarmentBinFingerprint[]; periodFingerprint: Digest;
  sourceEvidence: { reference: string; sha256: Digest }[];
  trueUpCoverage: { status: 'not_covered'; reference: string; sha256: Digest };
  postedAt: string; accountingTimezone: string;
  reason: string; ownerApprovalReference: string;
  beforeEffects: GarmentEffect[]; intendedEffects: GarmentEffect[];
}
export interface GarmentCorrectionCommand {
  manifest: GarmentManifestV1;
  approvedPlanSha256: Digest;
  previewHash: Digest;
}
```

UUID fields use canonical lowercase UUID; originalLedgerIds are sorted unique positive bigint decimal strings, never Number. Bin fingerprints/effects sorted itemId/warehouseId, exactly the old/new pair in this one admitted warehouse, no extra keys. The old/new IDs differ; replacementEntryId differs from source and resolves unused or the exact prior applied operation. Fixed qty and finite values follow F1's exact stock quantity/independent value-effect qualification, never diagnostic epsilon in approval hashes. sourceCodeSha is the exact qualified 40-hex candidate; source evidence references/reason/owner reference are trimmed bounded nonempty strings (1–1000 characters each); 1–20 evidence refs, no raw customers/credentials, no arbitrary inline attachments. Maximum manifest serialized UTF-8 size is 262144 bytes. postedAt is canonical UTC ISO with exactly 3 fractional digits and Z, roundtrips through Date unchanged; accountingTimezone is an actual IANA zone matched to fresh finance settings. No original historical posting time, server-now substitution or silent millisecond truncation. Dates not in the currently approved open correction period refuse. Apply also enforces the posting-time order rule for `StockPostingOptions.postedAt` in [transaction-protocol.md](transaction-protocol.md#typed-stock-seams): a postedAt earlier than the latest affected ledger row or later than admission time refuses `posted_at_out_of_order` (CLI exit 4) with zero effects, and needs a new approved manifest. sourceFingerprint/mappingFingerprint/periodFingerprint use the exact row-hash structures in workflow.md/F1 repair contract. A not_covered string is not sufficient evidence: recompute actual receipt/true-up coverage under the stock gate; unknown, incomplete or covered refuses.

Canonical manifestSha256 hashes every normalized field above, including target, actor, source/evidence/coverage refs, posting time, timezone, owner reference, allocated replacement UUID and before/intended effects, using workflow.md sorted UTF-8 JSON. It does NOT include the external approvedPlanSha256 or previewHash, avoiding circular hashing. F1's --approved-plan-sha256 supplies this exact digest; decode and recompute in the server, never trust CLI parsing alone. A changed timestamp/evidence/reference/source/value/target needs a new explicit owner approval. File mode `0600` is a local protection, not service authority.

## Exact owning entrypoints and current-state binding

stock-corrections.service.ts exports:

```ts
export function previewGarmentStockCorrection(ctx: CoreCtx,
  manifest: GarmentManifestV1): Promise<GarmentCorrectionPreview>;
export function applyGarmentStockCorrection(ctx: CoreCtx,
  command: GarmentCorrectionCommand, actor: Actor): Promise<GarmentCorrectionResult>;
```

Both own their one transaction; caller must not nest a CoreTx or perform an outer stamp/audit patch. Preview uses actual active principal/org and the shared nonlocking REPEATABLE READ READ ONLY admission. It may create a reviewable preview without an approvedPlanSha256; it never marks owner approval satisfied. Apply requires actor.id=ctx.profileId=manifest.actorProfileId, same qualified target/org, fresh actual membershipRole==='owner' (not a custom role key or platform-admin bypass), plus F3's stock-changing POS capability/cost/module matrix and effective-authority narrowing. A stock-managing nonowner cannot use this private path. Existing-session verification occurs before import/business reads; current profile.deletion_pending and org.status checks occur again inside the business snapshot/admission, as defined in transaction-protocol.md.

Apply verifies approvedPlanSha256==manifestSha256, then takes stock-v1 and the org authority lock before source rows. Under the same guarded transaction, validate the complete F1 known-garment eligibility for action correct (inverseOfOperationId must be null): exact ticket/line product M, one frozen original L1 source-owned issue, exact original ledger IDs, mappingCorrectionId is an applied same-org product_mapping receipt whose recorded after-state matches current M mapping, source/mapping/bin/latest-boundary/period fingerprints, no true-up coverage, exact current cost/value effects and posting period/timezone. Validate evidence digest references against this evidence-bound operation; missing/external physical intent remains an owner approval prerequisite, never manufactured from source price. Known cases are evidence candidates, not a standing allowlist. Second shared-bin repair requires fresh preview/manifest/approval. No source guard can be waived by an opaque hash that the service never compares.

The private previewHash binds {schemaVersion:1,domain:'garment_stock_only',manifestSha256,sourceSnapshot,stockSnapshot,policySnapshot}. Private payloadHash binds {schemaVersion:1,domain:'garment_stock_only',orgId,actorProfileId,manifestSha256,previewHash}; do not replace it with the generic public payload hash. Recompute and compare all fresh snapshots before effects. Operation key is manifest.operationKey; changing any manifest intent with the same key yields `409` key_reuse even when visible item/qty is unchanged. Source stale yields `409` stale_preview. Current policy/profile/org/owner failure yields `403` with zero effects.

Pass postedAt=new Date(manifest.postedAt) to both cancelEntryInTx and replacement create/submit StockPostingOptions, and entryId=manifest.replacementEntryId to replacement creation. The replacement carries the sale metadata in [workflow.md](workflow.md#replacement-entry-metadata), for both actions. The same timestamp governs reversal/replacement and their current open accounting period. It does not restate original dates. Immutable stk_corrections kind sale_stock_repost records the full bounded normalized manifest, manifestSha256, previewHash, qualified actor/target, approval reference, original/replacement/ledger/map refs, approved posting time/timezone and actual before/intended/after effects; reuse existing before/intended/after JSON fields, no second migration/sidecar mutable row. Insert that receipt and recordAuditInTx in the same transaction as cancellation, new issue, source stamp and audit. The audit records digest/refs rather than raw private evidence. No post-commit CLI receipt augmentation is permitted.

Same key/actor/manifest/previewHash returns the original authoritative receipt with no new event/ledger/audit. Status uses exact same-org operation plus digest and current authorization; missing/conflicting receipt remains unknown/conflict, never proof of rollback. An approved timestamp has changed only when a new approved manifest does, never during retry. F2 uses its own receipt-chain command, not this garment method; generic variant/receipt paths remain independent.

## Required executable counterexamples

Within existing stock-corrections native cases for frozen lines and operation reuse, assert public stock_only cannot write even for owner; missing/wrong digest or nonowner private call refuses; altered true-up/evidence/target/replacement UUID/posting time/owner ref with the same key conflicts; stale mapping/bin/period/profile refuses. Applied receipt must contain the exact approved manifest/time, every reversal/replacement has that timestamp, and lost-response status returns the same durable envelope. F1's own native suite invokes these actual entrypoints, not a mocked generic command. Inject fault at receipt/audit and assert all business effects roll back. No raw financial changes or second posting engine.

beforeEffects has exactly the two frozen bin states: qtyBefore=qtyAfter and valueBefore=valueAfter=current recorded snapshot, cogsDelta='0'. intendedEffects repeats those same before values and carries the independently qualified planned after values/current-period COGS delta. The receipt after records actual post-correction effects and checks equality under the reviewed exact-source posting/numeric oracle; it never silently changes approved effects to fit the current state. The generic previewHash exclusion of wall clock does not exclude this private command's approved postedAt: it is deliberate immutable owner intent, bound via manifestSha256.

getStockCorrection recognizes a garment-domain sale_stock_repost receipt by its validated stored domain discriminator; its full domain receipt/status requires the same current real-owner/finance/capability/profile/org checks as this private method. Nonowner gets `404` without a manifest leak, even if generic stock detail would otherwise allow quantity fields. Ordinary stock entry/history visibility is unchanged. The decoded manifest is stored under intended.domainManifest and its digest under intended.manifestSha256; before keeps the frozen source/bin/policy snapshot, after keeps actual resulting entry/ledger/time/value refs. This exact field placement avoids a new table or mutable sidecar.

## Explicit bounded garment compensation

The same strict GarmentManifestV1/decoder, previewGarmentStockCorrection/applyGarmentStockCorrection owning functions and private F1 CLI support action='correct' with inverseOfOperationId:null, OR action='compensate' with one canonical prior correction UUID. Both action/reference fields are required and bound by manifestSha256, private previewHash and payloadHash. No undo option bag, public stock_only bypass, third engine or rate override is introduced. Unknown keys/mixed action/reference shapes refuse.

Compensate admits only a same-org applied sale_stock_repost whose stored domainManifest.kind='garment_stock_only', action='correct' and source ticket/line match. Require that forward receipt's replacement issue is the current single live submitted source-owned M issue, actual ticket stamp points to it, original M sale product/qty/warehouse is unchanged, mapping still matches the qualified M mapping receipt, current bin/latest-ledger/period/source/payment/fiscal/coverage fingerprints match a FRESH approved inverse manifest, and no intervening affected-key movement, conflicting correction or source reference exists. The original L issue is now cancelled and remains immutable evidence. Neither missing/foreign/unknown receipt, inverse-of-inverse nor previously compensated/no-longer-live forward map can enter. Lock and validate the actual receipt, source, entries and bins under the common pair/order before mutation; action never substitutes authority.

For this inverse oldItemId=M/newItemId=L; originalEntryId is the forward receipt's replacement M issue, not the already cancelled historical L issue. Copy that current issue's frozen single quantity/warehouse and replace only M with the original forward manifest's L item. Check exact forward-before ownership/units against retained original lines/ledger. Use a new manifest.replacementEntryId and current open manifest.postedAt for both cancellation reversal and new L issue. It restores prior source quantity attribution while preserving the correct M sale product and every payment/date. Update the same source stock stamp to the new compensating issue; never reactivate a cancelled entry/ledger or rewrite current recipe. Explicit planRepost uses allowedItemIds={M}, allowIncreaseItemIds={L}. Ordinary moving-average computeLegValue/applyLedgerDelta and negative-stock guards remain authoritative; no historical-rate override.

The inverse preview/manifest must show its actual complete bin/value/current-period COGS impact. With unequal rates, a moving-average inverse can restore quantities without restoring the prior economic values. Do not promise a zero-cost rollback, before-value equality or use diagnostic tolerance to hide that difference. The owner approves this new exact impact; unsupported/missing evidence or unapproved values refuse. QA's equal-rate synthetic fixture verifies quantity/value/COGS restoration within the selected engine oracle; a separate unequal-rate fixture asserts the disclosed actual inverse effect and explicit residual versus the original before-state. This selects a compensation policy, not frozen-rate replay or a production valuation rewrite.

Write a new immutable sale_stock_repost receipt/audit with intended.action='compensate', intended.inverseOfOperationId, full domainManifest/digests/approved time and before/intended/actual after facts, plus actual source/current/new issue map. Existing same-key replay and source-entry uniqueness make repeated inverse zero-effect or conflict; a second key cannot compensate the no-longer-live forward replacement. getStockCorrection keeps the real-owner/finance/current-principal gate and returns both operation references without leaking them to nonowners. Forward and inverse have separate owner approvals; status never manufactures one from the other.

F1 disposable QA finally invokes this actual compensated command only after authoritative forward receipt lookup; a proven rolled-back forward gets no inverse, an unknown forward is reconciled first, and an inverse failure fails the rehearsal. Drop only the owned child after recording failure; never reset rows to disguise incomplete compensation. Production finally never performs undo. Production compensation requires separate current exact approval, like every other write. Add forward/inverse/repeat/lost-response, wrong-kind/foreign/inverse-of-inverse, concurrent/new source/bin state, unequal-rate disclosure and fault rollback cases within existing F3 frozen-line/reuse native behaviors and F1's eight behaviors, keeping their exact names/counts. Both directions use actual private owning functions, not mocks or direct repair SQL.

Exact full private preview/result/status and F1 CLI flags are [recovery-receipts.md](recovery-receipts.md); exact value field normalization/formulas/approval equality/independent oracle are [garment-numerics.md](garment-numerics.md). Effect values are source Number/String outputs, not generic fixed 4-decimal fields; both actions use this contract.

The required valuation object and its exact decoder/hash/admission are [valuation-qualification.md](valuation-qualification.md). Every private effect is denominated by manifest.valuation.currency; available preview/receipt carries that currency and valuationQualificationSha256. This adds no rate conversion. Inverse requires a fresh current-owner qualification with the forward receipt currency; historical status preserves original proof without requiring that historical attester still be active.
