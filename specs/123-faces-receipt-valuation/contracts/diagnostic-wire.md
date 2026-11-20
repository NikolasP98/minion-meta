# Strict diagnostic wire — S1/S2, proposed

This is the complete read-only wire owned by **scripts/lib/faces-receipt-replay.ts** and its existing selected .test.ts. T003 implements these definitions before either diagnostic reader. It imports only standard hashing and the existing import-free decimal.ts via an explicit relative path; source stock math is passed as trusted function values after qualified loader admission, never eagerly imported through an application alias; no CLI execution, DB client, environment, correction service, future US3 module or F3 mutation helper. The separate executable ReceiptChainManifestV1 stays in command-envelope.md. Both share the pure DocumentBasis/unit validators defined here; no duplicate documentary schema is selected.

## Primitive and decoder rules

Every object below is exact-key. All displayed properties are required; null is permitted only where written, never replaced by omission/undefined/empty string/0. Reject unknown nested keys, duplicate JSON object keys, invalid unions, array duplicates and size excess before source reads (exit 2). JSON decoding must detect duplicate keys rather than relying on JSON.parse's last-key behavior. UUID is canonical lowercase UUID; Digest is 64 lowercase hex; CodeSha is 40 lowercase hex; Seq is positive decimal PostgreSQL bigint string <=9223372036854775807, sorted with BigInt. UTC is exact ISO UTC with three fractional digits and Z, Date round-trip; labels/references are trimmed NFC, no control characters. UOM labels 1–80 characters; references 1–256; approval/reason 1–1000. No document bytes, supplier/customer contact fields, URLs to download or arbitrary metadata object is admitted.

Raw is original PostgreSQL numeric text <=128 UTF8 bytes: plain signed decimal, no plus/exponent/NaN/Infinity/negative zero. Preserve all raw digits/trailing zeros and raw row hashes. Positive quantity input admits existing maximum nine integer/four fractional digits. Money/currency follows existing exact admission, with source currency uppercase 3 letters; document quantity/conversion/rate are positive plain decimals <=128 bytes and must pass the selected Number+oracle safety boundary before replay. Do not change source formulas or add intermediate cent rounding.

Engine is exactly finite canonical String(Number-result) <=128 bytes, including exponent spelling; negative zero is rejected. Generated PostgreSQL readback may expand an exponent: compare String(Number(actualText)) after finite/magnitude/oracle admission only for generated-effect equality. Never normalize raw original row/hash text. Rational is `{numerator:string,denominator:string}` reduced signed integer numerator/positive integer denominator, base10/no plus/no leading zero except 0; each <=4096 digits. Its BigInt oracle is independent of Number. A numeric/output bound breach is resource_limit/incomplete, never truncation or rounded equality.

## Documentary and normalized-unit types

```ts
type UUID=string; type Digest=string; type CodeSha=string;
type Raw=string; type Engine=string; type Seq=string; type UTC=string;
type Rational={numerator:string;denominator:string};
type UnitSource={entryId:UUID;lineId:UUID;headerRowSha256:Digest;lineRowSha256:Digest;
  sourceKind:'receipt'|'pos_ticket'|'booking';sourceId:UUID;
  writer:'receipt_stock_quantity'|'pos_normalized_stock_quantity'|'booking_normalized_stock_quantity';
  writerCodeSha:CodeSha;writerEvidenceSha256:Digest};
export type UnitQualification={schemaVersion:1;receiptEntryId:UUID;receiptLineId:UUID;
  itemId:UUID;itemRowSha256:Digest;documentSha256:Digest;documentLineReference:string;
  stockUom:string;documentUom:string;documentQuantity:string;stockUnitsPerDocumentUnit:string;
  historicalStockUomEvidenceSha256:Digest;conversionEvidenceSha256:Digest;
  verifiedByProfileId:UUID;verifiedAt:UTC;sources:UnitSource[]};
type AllocationEvidence={policy:'single_line'|'owner_verified_allocation';
  net:string;tax:string;freight:string;discount:string;inventoryCost:string;evidenceSha256:Digest};
type FxEvidence={sourceCurrency:string;valuationCurrency:string;rate:string;
  effectiveAt:UTC;sourceInventoryCost:string;totalValuation:string;
  conversionResidual:string;historicalValuationCurrencyEvidenceSha256:Digest;evidenceSha256:Digest};
type DocumentFacts={reference:string;documentLineReference:string;sha256:Digest;
  purchaseId:UUID|null;providerRef:string|null;quantity:string;uom:string;
  allocation:AllocationEvidence;fx:FxEvidence};
type DocumentInput=
 |{state:'absent'}
 |{state:'unverified';reference:string|null;sha256:Digest|null;facts:DocumentFacts|null}
 |{state:'owner_attested';facts:DocumentFacts;verifiedByProfileId:UUID;verifiedAt:UTC;
    approvalReference:string};
export type DocumentBasis={policy:'verified_document_total';reference:string;sha256:Digest;
  valuationCurrency:string;stockQty:string;totalValuation:string;fxEvidenceSha256:Digest;
  taxFreightAllocationSha256:Digest;roundingResidual:string;residualAccepted:true;
  unitQualification:UnitQualification};
type ReportedHypothesis={stockQty:string;stockUom:string;valuationCurrency:string;totalValuation:string};
export type DiagnosticEvidenceManifestV1={schemaVersion:1;kind:'receipt_diagnostic';
  target:QualifiedOperatorTarget;sourceCodeSha:CodeSha;orgId:UUID;actorProfileId:UUID;
  receiptEntryId:UUID;receiptLineId:UUID;approvalReference:string;
  document:DocumentInput;unitQualification:UnitQualification|null;
  hypothesis:ReportedHypothesis|null;residualAccepted:boolean};
```

QualifiedOperatorTarget is the existing F7 credential-free target shape. This pure module implements its structural decoder locally from the same selected shape (or an already-created pure type-only export), never imports an executing operator/correction CLI. The `--org`, `--entry` and `--line` flags must equal the manifest `orgId`, `receiptEntryId` and `receiptLineId`. Manifest bytes <=1048576; no document parser, download or file-content validation is selected. The owner supplies only attested facts/reference/digests. A digest establishes integrity/reference identity, not invoice access, delivery, conversion history or truth. For unverified document input with facts nonnull, reference and sha256 must equal facts.reference and facts.sha256; if facts=null either pointer may remain null. Documentary identity mismatches never silently rewrite supplied facts. Authenticate the executing owner and verify same-snapshot authority before admitting documentary assertions; every current diagnostic attestor must equal that owner and verifiedAt cannot exceed snapshot observation. An unverified factual claim is not upgraded merely because the caller is owner.

UnitQualification is a separately owner-attested **normalized stock quantity** proof. sources contains exactly the discovered receipt and 0–128 admitted issues in ledger order (receipt first), IDs/hashes/source kinds matching actual source rows and writer kind matching that source; no arbitrary writer/URL. It names the actual historical writer revision/evidence establishing that its stored qty was already in this verified stockUom. Source code shape alone is not proof which revision wrote a historical row. historicalStockUomEvidenceSha256 and conversionEvidenceSha256 reference owner-verified historical item/document conversion evidence; current item.uom alone never proves it was historically frozen. Require the actual current item row/hash and unit fields to match that approved proof; changed/contradictory unit history blocks even when quantities look equal. Document quantity × verified factor must equal frozen receipt stock qty by independent rational arithmetic. A label spelling match is not a conversion. No missing historical factor is guessed.

Raw line.uom is string|null. Preserve it exactly, including null, in reads, entry evidence, hashes, replacements and compensating copies. Null is admissible only with the complete historical normalized-unit proof and the known writer's stock-quantity semantics above. A nonnull stored label must agree with the proved source stock unit; a contradiction blocks. If source qtyConsumption was converted before persistence, this proof concerns the already-resolved stored stock quantity; do not apply today's conversion or recipe again. Missing proof may still support an explicitly assumed-unit hypothetical diagnostic, never verified basis/writer eligibility. Compensation checks/inherits the prior immutable qualified unit proof and actual retained hashes; it does not require that historical attestor to remain a current member. Its current executing owner/reader is independently admitted.

For verified document basis, allocation.inventoryCost=net+tax+freight-discount by exact decimal rational arithmetic. Those are allocations to this one inventory line, not totals automatically assigned from a multi-line invoice. Single_line requires evidence of sole-line attribution; owner_verified_allocation requires its named evidence. fx.sourceInventoryCost equals that inventoryCost. fx.totalValuation=sourceInventoryCost×rate+conversionResidual exactly; residual is signed explicit documentary conversion evidence, not a new FX rounding engine. historicalValuationCurrencyEvidenceSha256 references the owner-verified historical stock denomination; no stk_entries/stk_bins currency column is invented and current finance currency cannot substitute. Same-currency evidence has rate 1 and conversionResidual 0. Foreign FX must match historical metadata where present; absence requires the attested historical evidence, not current Finance defaults. The proposed four-decimal receipt-rate residual is separately calculated below and residualAccepted must be true before exporting DocumentBasis. Neither conversion residual nor rate residual changes stock quantity. Source/header metadata contradictions produce mismatched facts, not a new policy.

## Exact safe source and check DTOs

```ts
type ScalarEvidence={state:'missing'|'null'|'value';value:string|null};
type EntryHeader={id:UUID;humanId:string|null;type:string;status:string;postedAt:UTC|null;
  rowSha256:Digest;purchaseId:ScalarEvidence;providerRef:ScalarEvidence;
  currency:ScalarEvidence;fxRate:ScalarEvidence;fxUpdatedAt:ScalarEvidence};
type EntryLine={id:UUID;entryId:UUID;itemId:UUID;qty:Raw;uom:string|null;rate:Raw|null;
  fromWarehouseId:UUID|null;toWarehouseId:UUID|null;lineNo:number;rowSha256:Digest};
type Movement={id:Seq;entryId:UUID;itemId:UUID;warehouseId:UUID;postedAt:UTC;
  qtyDelta:Raw;valueDelta:Raw;qtyAfter:Raw;valuationRate:Raw;rowSha256:Digest;
  header:EntryHeader;lines:EntryLine[];
  source:{kind:'receipt'|'pos_ticket'|'booking'|'invoice'|'unknown';id:UUID|null};
  reversalOfLedgerId:Seq|null};
type Consumer=
 |{kind:'pos_ticket';id:UUID;rowSha256:Digest;entryId:UUID;financialFiscalSha256:Digest}
 |{kind:'stock_accrual';id:UUID;rowSha256:Digest;entryId:UUID;sourceType:string;
    sourceId:UUID;itemId:UUID;realizedQty:Raw|null;realizedValue:Raw|null;
    realizedAt:UTC|null;status:string};
type Opening=
 |{state:'unknown';priorLedgerId:null;priorRowSha256:null;qty:null;rate:null;valueEngine:null}
 |{state:'empty_verified';priorLedgerId:null;priorRowSha256:null;qty:'0';rate:'0';valueEngine:'0'}
 |{state:'verified';priorLedgerId:Seq;priorRowSha256:Digest;qty:Raw;rate:Raw;valueEngine:Engine};
type SourceEvidence={receipt:EntryHeader|null;line:EntryLine|null;
  item:{id:UUID;rowSha256:Digest;stockUom:string;consumptionUom:string|null;unitsPerStockUom:Raw|null}|null;
  warehouse:{id:UUID;rowSha256:Digest}|null;
  bin:{rowSha256:Digest;qty:Raw;rate:Raw}|null;opening:Opening;
  context:Movement[];affected:Movement[];boundary:Movement|null;consumers:Consumer[]};
type Coverage={readsComplete:boolean;contextComplete:boolean;affectedComplete:boolean;
  consumersComplete:boolean;baselineComplete:boolean;hypotheticalComplete:boolean;
  contextCount:number|null;affectedCount:number|null;consumerCount:number|null;
  contextReadCount:number;affectedReadCount:number;consumerReadCount:number;lastReadLedgerId:Seq|null;
  latestSameKeyLedgerId:Seq|null;maxObservedLedgerId:Seq|null};
type CheckField='document_identity'|'quantity'|'stock_unit'|'currency'|'fx'|'allocation'|
  'opening'|'baseline'|'quantity_preservation'|'conservation'|'latest_bin'|'source_consumers';
type Check={field:CheckField;state:'matched'|'mismatched'|'unknown';
  expected:string|null;actual:string|null;evidenceSha256:Digest[]};
type Code='document_absent'|'document_unverified'|'document_mismatched'|
  'hypothesis_disagrees_with_document'|'cost_basis_missing'|'unit_unverified'|'unit_mismatched'|
  'fx_unverified'|'fx_mismatched'|'allocation_unverified'|'allocation_mismatched'|
  'residual_unaccepted'|'source_unavailable'|'schema_mismatch'|'read_failed'|'timeout'|'resource_limit'|
  'baseline_mismatch'|'quantity_mismatch'|'latest_bin_mismatch'|'conservation_failed'|
  'consumer_unresolved'|'consumer_mismatch'|'unsupported_source'|'unsupported_multiline'|
  'unsupported_multikey'|'unsupported_second_receipt'|'unsupported_transfer'|
  'unsupported_reversal'|'unsupported_adjustment'|'unsupported_zero_quantity'|
  'unsupported_negative_value'|'unsupported_issue_cap'|'outside_numeric_oracle';
type DiagnosticError={code:Code;stage:'input'|'read'|'document'|'baseline'|'support'|'replay'|'output';
  entryId:UUID|null;ledgerId:Seq|null;consumerId:UUID|null;limit:number|null};
type DocumentAssessment={state:'absent'|'unverified'|'verified'|'mismatched';
  documentSha256:Digest|null;unitState:'unknown'|'unverified'|'verified'|'mismatched';
  verifiedBasis:DocumentBasis|null;checks:Check[]};
```

All arrays are required. Only when the corresponding coverage flag is true does an empty array establish completed zero-row discovery. Otherwise it is an explicitly partial/unread prefix, not proof of zero rows; total counts remain null until the collection scan completes, while *ReadCount reports exactly the safe emitted prefix count. Source nulls are absence only after completed lookup; with readsComplete=false they are unavailable, explained by the required errors. Boundary contains only the first observed nonadmitted cap/support row, or null when no such row was observed. Unknown source/owner is explicit kind unknown/id null, not inferred from display text. Source metadata scalar absence and explicit JSON null stay distinct. value is nonnull only for state value; source fx numeric text is selected directly in SQL before driver Number conversion. An object/array/boolean in a scalar key is schema_mismatch exit 3, with no arbitrary metadata copied. Source mappings are stk_entries metadata purchaseId/providerRef/currency/fxRate/fxUpdatedAt, the exact stock entry/line/ledger/bin/item columns, pos_tickets.stock_entry_id and stk_accruals.realized_entry_id/source fields. The database has no receipt valuation-currency column: an absent historical currency/FX fact remains unknown until the supplied historical evidence qualifies it. Never infer it from current settings. Header/line/ledger/consumer hashes use raw PostgreSQL to_jsonb(row)::text under UTC SHA256 before driver conversion; preserve nullable labels and raw numeric bytes. All source joins constrain actual org equality; foreign references produce generic source_unavailable with no foreign record payload.

context is the complete same-key prefix strictly before receipt; affected is receipt through exact latest same-key sequence. Sort both by numeric Seq and reject duplicates; consumers sort by kind,id. Line arrays sort lineNo then UUID, retain all actual lines so multiline is explicit, not first-row selected. Source/history context cap 10000 canonical rows, at most 129 affected entries, at most 128 issues, and at most 128 consumers of each kind. Probe limit+1; never call an omitted overflow row complete. Diagnostic errors sort stage, numeric ledger ID(null last), entryId,consumerId,code; checks sort fixed CheckField order above. References/hash sets sort lexicographically and deduplicate. No invalid source row is deleted merely to fit a supported shape. reversalOfLedgerId is provenance only when uniquely proved from retained same-entry original/inverse signed rows; the schema has no such column. Otherwise keep null and use actual cancelled status/duplicate-entry ledger evidence to classify reversal unsupported, never invent a matching link. The 129th issue is recorded as boundary with unsupported_issue_cap/limit 128, affectedComplete=false and affectedCount=null; it is never admitted (it would be the 130th affected entry).

## Replay/oracle output and closed outcomes

```ts
type OracleCheck={expected:Rational;engine:Engine;absoluteDifference:Rational;
  tolerance:'0.00000001'|'0.000000001';passed:boolean};
type ReplayRow={ledgerId:Seq;entryId:UUID;qtyDelta:Raw;
  original:{valueDelta:Raw;qtyAfter:Raw;valuationRate:Raw};
  intended:{valueDelta:Engine;qtyAfter:Engine;valuationRate:Engine};
  oracle:{valueDelta:OracleCheck;qtyAfter:OracleCheck;valuationRate:OracleCheck}};
type ConsumerEffect={kind:'pos_ticket'|'stock_accrual';id:UUID;entryId:UUID;
  originalCost:Raw|null;intendedCost:Engine;costDelta:Engine;quantity:Raw;
  oracle:OracleCheck};
type ReplayTotals={originalReceiptValue:Raw;intendedReceiptValue:Engine;
  receiptValueDelta:Engine;originalConsumedValue:Engine;intendedConsumedValue:Engine;
  consumedValueDelta:Engine;originalRemainingValue:Engine;intendedRemainingValue:Engine;
  remainingValueDelta:Engine;terminalQty:Raw;intendedTerminalQty:Engine;
  conservationDifference:Engine;quantityDifference:Engine};
type BasisChoice={source:'reported_hypothesis'|'verified_document';stockQty:string;stockUom:string;
  valuationCurrency:string;qualifiedSourceValuationCurrency:string|null;
  comparison:'verified_currency'|'assumed_currency_numeric_only';totalValuation:string;receiptRate:string;
  receiptContribution:Rational;rateRoundingResidual:Rational;centDisplayTotal:string};
type Common={schemaVersion:1;orgId:UUID;receiptEntryId:UUID;receiptLineId:UUID;
  sourceCodeSha:CodeSha;target:QualifiedOperatorTarget;readOnly:true;eligible:false;
  diagnosticManifestSha256:Digest;source:SourceEvidence;coverage:Coverage;
  document:DocumentAssessment;errors:DiagnosticError[];blockers:Code[]};
export type ReceiptDiscovery=
 |(Common&{mode:'discovery';outcome:'complete';complete:true;
     basisChoice:BasisChoice|null;readiness:'unverified'|'mismatched'|'document_qualified'})
 |(Common&{mode:'discovery';outcome:'incomplete'|'integrity'|'unsupported';complete:false;
     basisChoice:null;readiness:'blocked'});
export type ValuationReplayPlan=
 |(Common&{mode:'hypothetical_replay';outcome:'complete';complete:true;hypothetical:true;
     readiness:'unverified'|'mismatched'|'document_qualified';basisChoice:BasisChoice;
     rows:ReplayRow[];consumerEffects:ConsumerEffect[];totals:ReplayTotals;checks:Check[]})
 |(Common&{mode:'hypothetical_replay';outcome:'incomplete'|'integrity'|'unsupported';complete:false;
     hypothetical:true;readiness:'blocked';basisChoice:null;rows:[];consumerEffects:[];totals:null;checks:Check[]});
export type DiagnosticReport={metadata:{runId:UUID;observedAt:UTC;snapshotId:string;
  outputReference:string|null};diagnosticManifestSha256:Digest;reportSha256:Digest;
  result:ReceiptDiscovery|ValuationReplayPlan};
```

S1 uses discovery; S2 uses hypothetical_replay only when a usable explicit hypothesis or verified basis exists. Without either, return complete discovery with basisChoice null, document_absent/unverified+cost_basis_missing and exit 0; do not fabricate a zero expected rate. Complete hypothetical absent/unverified documentary evidence is allowed when the separately named reported hypothesis is internally usable and frozen receipt quantity equals hypothesis stockQty; readiness unverified and eligible remains false. It is numeric explanation under explicit stock-unit/currency assumptions, not verified historical unit truth. No original source labels are filled from that assumption. qualifiedSourceValuationCurrency is null unless historical stock denomination is independently owner-verified and consistent with stored FX facts; reported-hypothesis valuationCurrency is an assumption only. Unknown denomination gives comparison=assumed_currency_numeric_only: totals/deltas are conditional numeric examples under that explicit common-currency assumption, never actual historical-currency COGS/value claims. A contradictory known source denomination blocks that hypothesis as currency mismatch rather than converting with current FX. Verified currency comparison requires the attested historical denomination equal basisChoice.valuationCurrency.

Owner_attested facts become document.state verified only when exact receipt/line/item/document references, historical currency/FX/allocation and UnitQualification cross-checks match; missing proof stays unverified; contradictory evidence is mismatched, never silently corrected. The same verification against frozen facts applies when a documentary basis contains a purchase/provider reference; absence of a purchase module row alone does not invent or disprove a paper invoice. A nonempty supplied reference that conflicts with actual same-org source metadata is a mismatch. Recompute all checks from explicit evidence and actual source. verifiedBasis is nonnull only when verification, residual acceptance and exact units all pass; its rate rounding residual is computed, not a caller override. Hypothesis disagreeing with verified basis adds hypothesis_disagrees_with_document/readiness mismatched; choose the verified_document basis explicitly, retaining the hypothesis in manifest evidence. A mismatched document can support only a separate internally usable reported hypothesis, tagged reported_hypothesis/readiness mismatched; never use its mismatched documentary values as a verified basis.

Readiness is exactly mismatched when document.state is mismatched or hypothesis_disagrees_with_document exists; otherwise document_qualified only when verifiedBasis is nonnull; otherwise unverified. unitState is unknown when qualification=null, unverified when supplied qualification cannot yet be documentary-admitted, mismatched on a contradictory source/unit check, and verified only when all its source/document/historical-unit checks pass.

For both choices use existing divideDecimalToMinor(totalValuation,stockQty,4) then minorToDecimal(...,4), halfway away from zero. ReceiptContribution is the exact rational stockQty×four-decimal rate; rateRoundingResidual=totalValuation-contribution; centDisplayTotal uses existing decimalToMinor(contributionExact,2) then minorToDecimal(...,2), retaining its halfway-away display policy; it does not change persisted movement values. Example 89/5474.58 produces rate 61.5121, rational contribution 5474.5769 and residual 0.0031, cent 5474.58. Thereafter intended movement fields are source-compatible computeLegValue/applyLedgerDelta **Number** outputs serialized with String, not rounded to cents. Oracle checks independently use reduced BigInt rationals and the existing value/rate 1e-8, quantity 1e-9 absolute thresholds. Require every passed flag true for complete replay; abs differences use exact rational comparison. Original baseline first replays stored signed deltas and validates each stored qtyAfter/rate plus complete latest/bin equality; failure gives integrity with no hypothetical prefix. Verified truly absent prior history alone yields empty_verified opening 0; missing/read-denied history yields unknown, never zero.

For each supported issue intended cost is negative ledger value; consumer accrued cost is String(round4(-sum(issue value_delta))) using existing round4 once. Preserve realizedQty and distinguish originalCost=null (unknown) from actual 0. Complete known consumers require exact source ownership and nonnull required original cost; unavailable consumer evidence blocks completion, never 0. POS issue cost uses exact negative original/replacement issue sum; realized accrual uses its stored positive cost and existing four-decimal projection. Totals originalConsumedValue/intendedConsumedValue sum unrounded positive issue-ledger costs, not rounded copied accrual fields. ConsumerEffect reports those accrual projection differences separately, avoiding an invented cent/four-place conservation adjustment. Totals compare original versus intended receipt/positive consumed cost/terminal value, preserve signed delta convention intended-original, and require receiptValueDelta=consumedValueDelta+remainingValueDelta within the existing oracle. No receipt total is labelled current stock value.

Unsupported includes second receipt/transfer/reversal/adjustment/multiline/multikey/unknown owner, zero-or-negative post-receipt quantity (including terminal 0), negative value/fallback and consumer ambiguity. Return original-only source evidence, first exact boundary code and complete:false/eligible:false, hypothetical rows[]/totals null. Even if original reads are complete, coverage.hypotheticalComplete=false; no hypothetical continuation or conservation claim past that boundary. Multiple discovered blockers are retained sorted; unsupported is not a partial successful plan. Baseline mismatch/quantity/bin/conservation/oracle violation is integrity. Failed/partial schema/read/deadline/resource scan is incomplete, never a fake complete prefix. Precedence: incomplete source/resource → integrity baseline → unsupported support matrix → complete documentary/hypothetical result. More than 128 issues is unsupported (exit 4); context 10000/report 20 MiB/manifest 1 MiB or deadline/read failure is incomplete (exit 3, malformed input size is exit 2). incomplete source may contain only safe actually-read original evidence with coverage flags false and lastReadLedgerId; never guessed latest/counts. If safe report cannot fit 20 MiB or output fails, publish no report and no digest/complete claim; credential-free exit 3 only.

## Digest projections, pure exports and vectors

Export parseDiagnosticManifestJson(text:string):DiagnosticEvidenceManifestV1 and strict decodeDiagnosticEvidenceManifestV1, decodeReceiptDiscovery, decodeValuationReplayPlan, decodeDiagnosticReport, decodeUnitQualification, decodeDocumentBasis, diagnosticManifestSha256 and diagnosticReportSha256 from the pure replay module. These export names are fixed for T003; no implementation-time schema invention. parseDiagnosticManifestJson uses a bounded recursive-descent JSON token reader with a decoded-property-key Set per object, rejecting duplicate keys before constructing values; JSON.parse may decode individual primitive/string tokens but never supplies last-key-wins objects. Enforce input byte/depth bounds (maximum 64 nested containers) before recursion; a breach is invalid manifest/exit 2. Functions never perform I/O. CLI re-decodes result before atomic serialization. The corrective pure logic module imports DocumentBasis/UnitQualification as erased relative types plus their pure validators from this existing module; it does not execute the diagnostic CLI or depend on a future reader/writer.

canonical(x) sorts object keys recursively by Unicode code point, retains semantic array ordering above, uses UTF8 JSON with no insignificant whitespace, undefined, dates or numeric coercion. Diagnostic manifest hash is SHA256(canonical(E)). Exact selection: E={schemaVersion,kind,target,sourceCodeSha,orgId,receiptEntryId,receiptLineId,document,unitQualification,hypothesis,residualAccepted}; document owner_attested projects only {state,facts}; UnitQualification projects all fields except verifiedByProfileId/verifiedAt. Those identity/time values are admitted and retained privately but excluded from stable diagnostic identity. Source-writer CodeSha/evidence hashes, historical unit/doc conversion evidence and every source ID remain included. The executing actor/approval reference is report-run admission metadata, not economic evidence. Altered authority still denies the run; this hash grants no approval. Input refs are logical references, never local file paths; diagnostic CLI manifest/output paths/connection credentials are not fields in E.

Report hash is SHA256(canonical({schemaVersion:1,domain:'receipt_diagnostic',diagnosticManifestSha256,result:R})). R is every result field except diagnosticManifestSha256 (already outside); it includes all raw source strings/hashes, coverage/error/blocker/outcome/complete/document checks, hypothetical assumptions/oracle/residual/consumer effects. Within result.document.verifiedBasis.unitQualification apply the same attestation-only projection above; no owner-observation metadata is an economic value. metadata runId/observedAt/snapshotId/outputReference and reportSha256 itself never enter this preimage. Original source posted times, original row hashes, actual source facts and hypothesis/document/unit changes do enter it. Same admitted business/evidence state in another run/path yields identical digests; changed null UOM, source row bytes, document evidence or hypothesis changes them. Writer manifest hash separately covers its entire executable manifest, including actor, approval, posting time and complete unitQualification; do not substitute a diagnostic digest for approvedPlanSha256/previewHash.

Strict decoder/output/hash fixtures: absent document+hypothesis=null → complete discovery/null basis/exit 0; absent/unverified document+89-total hypothesis → complete hypothetical/unverified/eligible false/exit 0 with exact oracle/residual; fully attested matching document/unit evidence → document_qualified/verifiedBasis but diagnostic eligible false; wrong quantity/doc/FX/allocation/unit → mismatched checks, no verifiedBasis, only explicit independent hypothesis may replay; baseline mismatch → integrity/rows[]/exit 4; second receipt/transfer/reversal/adjustment/unknown source/zero-ending → original-only unsupported/exit 4; context/report/deadline/read/schema overflow → incomplete or no published report/exit 3, never fake prefix. Mutate every required/null/nested/union/numeric/order/hash family; raw null-UOM POS/booking/receipt survives serialization and qualified replay, and changed/unknown historical unit proof blocks writer. Add unknown versus actual 0 consumer/opening vectors, exponent readback equality only for generated effects, and stable new-run/new-path hashes with changed-source/null-to-label divergence. All remain inside ordinary existing replay/CLI tests and the existing ten native behavioral tables where applicable; no extra integration file or behavior name is created.

## Pure replay engine binding and error mapping

The pure library exports `StockReplayMath={computeLegValue:(bin:{qty:number;rate:number},qtyDelta:number,rate:number|null)=>{valueDelta:number;rateUsed:number},applyLedgerDelta:(bin:{qty:number;rate:number},qtyDelta:number,valueDelta:number)=>{qty:number;rate:number},round4:(value:number)=>number}` and `buildDiagnosticResult(manifest:DiagnosticEvidenceManifestV1,source:SourceEvidence,coverage:Coverage,mode:'discovery'|'hypothetical_replay',math:StockReplayMath):ReceiptDiscovery|ValuationReplayPlan`. Qualified caller supplies actual existing stockLogic namespace functions after F7 admission; unit tests compare real source functions and independent rational expected vectors. Strict decoders/document hashes run without math or application imports. No new rounding/valuation implementation or global engine change is selected. A request for hypothetical mode with no usable basis returns the complete discovery variant described above, not a runtime exception or fake rate.

Mode comes from the owning staged caller: S1 invokes discovery. The completed S2 CLI always requests hypothetical_replay with the same flags and falls back to complete discovery only when no usable basis exists; no new mode flag, alternate entrypoint or future corrective import is required. Source-reader failure constructs the closed incomplete result with safe observed data; it does not call buildDiagnosticResult on a falsely complete source. No business report is emitted on invalid/auth/target admission (exit 2). Complete discovery/hypothetical (including absent/unverified/mismatched documentary state) is exit 0; incomplete read/schema/context/resource/deadline is exit 3; integrity or unsupported result is exit 4. Source unavailable after a permitted lookup is an incomplete read (exit 3); another tenant/authority denial remains generic admission-unavailable exit 2 without foreign detail. Existing corrective command exits/statuses are unchanged.


## Implementation decisions (2026-11-17)

- **Decimal limits (CODEBASE-DETAILS-03)**: admitted document/hypothesis/FX decimals are plain decimals of at most 128 bytes in the wire decoder AND must pass `decimal.ts` (80 characters, 40 coefficient digits, exponent <= 18); a `DecimalInputError` raised by `divideDecimalToMinor`/`decimalToMinor` is not mapped to a Code in the pure library today and surfaces as an exception that the CLI reports as exit 3 (incomplete). TODO(handoff): map `decimal_limit`/`invalid_decimal` to an explicit input-stage Code and exit 2, with one vector per limit.
- **Existing four-decimal boundary (CODEBASE-DETAILS-09)**: the UI's `entry-lines.ts unitRate` rounds in binary Number arithmetic; the correction instead uses exact decimal quantization via `decimal.ts`.
- **centDisplayTotal (CODEBASE-DETAILS-12)**: the rational contribution is serialized as an exact terminating decimal string (at most 8 fractional digits) before `decimalToMinor(...,2)`.
- **Baseline comparison (CODEBASE-DETAILS-11)**: tolerance 1e-9 qty / 1e-8 value and rate (see correction.md decisions); conservation tolerance is 1e-8 times the number of affected rows (sum of the per-row oracle bounds).
- **Discovery `basisChoice` (IR-008)**: discovery mode computes `basisChoice` from a usable basis without replay rows (the CLI always requests hypothetical_replay and falls back to complete discovery only when no usable basis exists).
- **Quantity admission outcome (CODEBASE-DETAILS-02)**: a stored quantity outside the F3 nine/four digit rule is `outside_numeric_oracle` under outcome `unsupported` (exit 4).
