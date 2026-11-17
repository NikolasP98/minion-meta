# Explicit stock valuation denomination

This is the common qualification selected for new stock-changing corrections, not a currency migration or a policy change to ordinary sales/receipts/background writers. Stored stock quantities/rates/values lack historical denomination. Receipt intake converts a typed foreign-currency rate into `fin_settings.currency` through `convertEntryRates` (`stock.logic.ts:542`, "Stock is always valued in ONE currency") and records `currency`, `fxRate` and `fxUpdatedAt` only when a conversion happened. That convention fixes the unit at intake time, but rows record no denomination when no conversion ran, and `fin_settings.currency` can change later. A ticket's billing currency, invoice currency by itself or the current `fin_settings.currency` therefore cannot denominate the complete affected historical stock state, and this proof is required.

## Closed value type and pure exports

Implement this exact value and pure exports in the already selected `src/server/services/stock-corrections.logic.ts` and its existing test, not a new resolver/service/parser engine:

```ts
export type StockValuationQualificationV1 = {
  schemaVersion:1;
  kind:'owner_attested_stock_currency';
  orgId:UUID;
  currency:string;
  attestedByProfileId:UUID;
  attestedAt:string;
  evidenceReference:string;
  evidenceSha256:Digest;
  keys:{itemId:UUID;warehouseId:UUID;latestLedgerId:string|null;
    latestLedgerRowSha256:Digest|null}[];
};
export function decodeStockValuationQualificationV1(
  value:unknown
):StockValuationQualificationV1;
export function stockValuationQualificationSha256(
  value:StockValuationQualificationV1
):Digest;
```

All keys are required. Reject unknown/missing/nested keys and wrong types; no coercion/default/extra dictionary. UUID is lowercase canonical RFC4122 textual shape under the existing manifest validator, Digest exactly 64 lowercase hexadecimal. Currency is exactly three ASCII uppercase letters; it must additionally be explicitly admitted by the actual owner as a real shared denomination, not merely pass this shape check. No implicit PEN. AttestedAt is a real canonical UTC date/time with exactly three fractional digits and Z, roundtripping the same string; admission rejects a future value beyond its actual observation time. EvidenceReference is trimmed NFC, 1–1000 Unicode characters and at most 4000 UTF-8 bytes, with no control characters; it is a protected evidence reference, never fetched as a URL/file or interpreted as code. EvidenceSha256 binds the owner's separately reviewed historical/common-denomination evidence; it is not proof that the server fetched a document.

Keys contains 1–256 distinct item+warehouse pairs, sorted lexicographically by itemId then warehouseId; decoder rejects duplicates or unsorted input rather than silently changing approved bytes. For garment there are exactly two pairs, the affected old/new item in the same approved warehouse. For ordinary correction it is the exact complete affected plan set, including original/replacement legs, with no extra, missing or foreign pair. LatestLedgerId is null paired with null row hash only for an actually absent latest ledger in that manifest boundary; otherwise it is a positive canonical decimal PostgreSQL bigint string in 1–9223372036854775807 and its hash is nonnull. Never narrow through Number. A null boundary with nonzero/unaccounted current bin state does not manufacture opening history; existing stock-integrity admission still applies.

Canonical qualification hashing uses the same selected recursive canonical-object serialization as the parent correction manifest/payload hashes, after exact validation, with the fixed schema version/kind and all fields above. Keys retain their required canonical order; preserve evidence strings and canonical stock identity strings exactly. Hash canonical UTF-8 bytes with SHA256; no observation/run metadata, environment, credentials, live policy recomputation or numeric tolerance enters it. A changed currency/attester/reference/evidence hash/time/key/boundary changes this digest and the enclosing approved intent. No self-digest field is added to the object.

## Admission and public envelope placement

The exact public preview/apply envelopes add OPTIONAL top-level `valuation:StockValuationQualificationV1` (same value in both). The domain PreviewRequest union itself remains unchanged. Normalize omission to null in the server's approved ordinary intent; reject explicit malformed/unknown proof before any write. Workflow/recovery declarations own the complete envelope and service signatures; all copies must agree with this placement. A changed or omitted proof after a qualified preview is stale/different intent, never silently reused.

An admitted stock-changing preview/apply requires the independently verified current executing real membership owner to equal attestedByProfileId as well as all ordinary stock/POS/finance/module/record/period capabilities. Private garment additionally requires manifest.actorProfileId equal both. Custom role names, platform-admin status, a forged profile ID or the evidence digest alone cannot replace real owner membership. This owner restriction applies to this new evidence-bearing correction path only. Do not add it to ordinary POS sales or normal stock writers.

Preview is the existing qualified REPEATABLE READ READ ONLY owning snapshot: require proof org/affected keys/latest IDs and actual source-row hashes to equal the same snapshot plan, verify current owner/active principal, and keep evidence explicitly owner-attested rather than DB-proven. Apply rechecks all of it under the held stock-v1 and org authority lock before source/period/bin effects, with the current owner/policy locks and original approved hashes. No external document lookup/auth refresh occurs in that write transaction. Existing numeric/source/boundary/period admission remains mandatory; no attestation repairs corrupt stock or permits a mixed-denomination plan.

For a stock-changing preview with absent/unverified/contradictory denomination, return eligible:false, no executable hashes, fixed blocker owner_evidence_required and cost unavailable with reason valuation_currency_unverified when the reader otherwise has cost authority. It cannot apply, including a preview with a fabricated current-settings currency. Invalid syntax/auth can retain existing typed refusal rather than inventing a partial preview. An apply without an admitted matching proof refuses before business DML. A reader without cost authority receives the existing denied projection, not an unverified amount leak.

The ordinary both-empty stockless POS product swap keeps its existing POS-only authority, cost:not_applicable, no stock effects, and no valuation requirement. Valuation is omitted for that shape; reject a superfluous supplied proof instead of pretending that it proves stock effects that do not exist. Public stock_only stays `422` owner_evidence_required regardless of any supplied public proof; only the selected private garment manifest path can use that mode.

## Immutable evidence and safe read projections

Private GarmentManifestV1 requires valuation with this exact type. The COMPLETE object enters manifestSha256, approved-plan digest, preview/payload hashes and immutable intended.domainManifest/after.receipt, not a postcommit sidecar. Its effects use ordinary moving-average math; owner proof changes no scalar or rate.

For ordinary corrections, normalized intended valuation:null|proof and its digest bind approved preview/payload identity; a stock-moving committed operation retains the complete admitted proof in its immutable intended envelope. The receipt's available cost projection carries required currency plus valuationQualificationSha256 alongside actual CostEffect rows. Private garment's receipt manifest retains the full proof, and its narrowed authorized cost projection carries the same qualified denomination/digest. Receipt decoder checks the cost currency/digest against the immutable proof and the declared domain; mismatches are unavailable/integrity refusal, never reconstructed from current settings.

CorrectionCost available is `{state:'available',currency:string,valuationQualificationSha256:Digest,rows:CostEffect[]}`. Add unavailable `{state:'unavailable',reason:'valuation_currency_unverified'}` with no money rows/currency/digest. Existing denied and not_applicable variants also contain no currency/digest/rows. Current-reader denial removes currency/digest together with amounts, even from raw nested stored evidence; public preview/detail/status uses explicit typed whitelists and never spreads before/intended/after or the owner's protected reference. Private full garment evidence remains under its strict real-owner matrix. No new general/public provenance endpoint is selected.

A known-key historical status read verifies the current authorized reader independently, preserves original proof bytes/hash and acknowledges the committed receipt without requiring the historical attester still exists or is owner. Current source changes can change currentState, not the retained currency. A missing/unavailable status row is still unknown, not proof of rollback.

Compensation is a new approved operation with new current-owner attestation binding fresh complete affected boundaries. Currency must equal its retained forward receipt's immutable currency; it cannot recast or convert history. Retain inverseOfOperationId, original evidence and new proof distinctly. F1 garment inverse uses this rule; F2 receipt-chain owns its separate verified-document/historical-denomination basis and does not silently import a new generic F3 command. Mixed/unknown denomination remains ineligible rather than invoking FX.

## Qualification inside existing tests

Extend existing pure/route/mounted/native/browser scenarios and the selected thirteen native behaviors; no fourteenth native registration. Strict fixtures cover missing/extra keys, wrong primitive/null pairs, foreign org/item/warehouse, unsorted/duplicate/257 keys, oversized/control/NFC-invalid references, noncanonical UUID/digest/bigint/time, future attestation, wrong actual owner and forged custom-role names. Test decoder/hash determinism and every proof field's approval sensitivity without embedding live private evidence.

Use positive same-owner admitted stock-moving examples, optional omission refusal, contrary USD ticket and changed finance display settings, two-bin garment exact set and ordinary extra/missing plan keys. Assert normal sales/stock writers still work under their original matrix, stockless POS-only swap still succeeds without finance/stock/owner proof, superfluous stockless proof refuses with zero effects, and public stock_only cannot bypass with a proof.

Preview/apply source mutation, latest-ledger/hash race, owner deletion/role change and period/bin drift must refuse or retry only under the existing guarded transaction policy, with zero partial ledger/stamp/audit/receipt writes. Successful ordinary/private receipts retain the full exact proof internally and project correct currency/digest; denied readers expose none. Delete the historical attester after a committed fixture and read as a different current owner: original evidence remains immutable and readable under current policy. Inverse requires the same forward currency plus fresh current-owner boundaries; changed currency refuses. Native counterexamples assert raw database receipts and all stock effects, while mounted/browser tests assert the owner-attested label, unavailable/denied states and no billing/default currency inference.


## Owner can prepare a proof without inventing stock boundaries

Ordinary CorrectionPreview additionally has required `valuationScope:StockValuationQualificationV1['keys']|null`. The current admitted real owner with complete source/record and cost authority may receive the exact bounded affected keys/latest-ledger IDs+row hashes even when missing denomination proof makes eligible:false. This is a safe boundary projection, not a cost value, executable approval or evidence that currency is known. Nonowners/denied or incomplete source/stock scope receive null. Stockless uses null. The scope is read in the same existing preview snapshot, never a second unscoped query/endpoint; complete-set and 1–256 bounds apply before projection. No partial scope enables attestation.

In the existing two correction hosts, the owner explicitly enters a verified currency plus protected evidence reference/SHA and attestation time; the client builds the closed proof from that exact server scope and current subject, and sends a new preview with the same reason/domain request plus proof. The server independently verifies all identity/keys/time/evidence shape and refuses wrong/future/mixed facts with a fixed field/refusal state. It never infers proof from display settings or silently changes its timestamp/evidence. Only the complete qualified re-preview produces executable hashes; the owner confirms its actual displayed effects before apply. A source/boundary/policy drift resets the displayed approval and requires a fresh scope, explicit owner attestation and re-preview, not a generated new key or silent reapproval.

The proof/reference/amounts are transient protected form/command data, not additional fields in PendingCorrectionV1 or browser storage. Save only the existing bounded known operation/hash pointer before POST. Reload/unknown outcome still uses the actual authorized known-key GET and persistent block; no proof construction flow bypasses that recovery latch. Close/open/new-selection and denied-reader rules remain those of browser-recovery.md. Extend existing mounted/browser cases with scope absent for nonowner/denied, exact owner scope, missing-proof preview nonexecutable, successful explicit proof/re-preview/confirm, changed boundary requiring new attestation, rejected future time and unknown-pointer blocking. Do not add a public provenance endpoint or loosen financial data access to populate the form.
