# Closed diagnostic manifest and report schema

Implement these pure version 1 schemas and strict decoders in the selected `scripts/lib/faces-stock-reconciliation.ts` and its test. No new runner, route or business table. [report.md](report.md) owns the CLI surface, exit codes, resource limits and classification table; [source-explanation.md](source-explanation.md) owns source facts, timeline, projection evidence and the stock entry source decoder.

## Input and reference primitives

```ts
type UUID=string; type Digest=string;
type SourceKind='pos_ticket'|'pos_ticket_line'|'payment'|'booking_product'|'booking'|'booking_group'|'booking_status'
  |'grant'|'redemption'|'invoice'|'accrual'|'stock_entry'|'stock_line'|'ledger'|'stock_item'|'warehouse'|'product'|'correction';
type SourceRef={kind:SourceKind,id:string};
type ExpectedComponent={source:{kind:'pos_ticket'|'pos_ticket_line'|'booking',id:UUID},itemId:UUID,warehouseId:UUID,
  intendedStockQty:string,stockUom:string,fulfilled:boolean,
  trueUpCoverage:'not_covered'|'covered'|'unknown'};
type DiagnosticEvidenceRef={referenceId:UUID,kind:'document'|'owner_attestation'|'prior_correction',
  sha256:Digest,privateRef:string,correctionId:UUID|null,
  assertion:null|{kind:'expected_component',component:ExpectedComponent,verifiedByProfileId:UUID,verifiedAt:string}|ProjectionAssertion};
type DiagnosticCase={caseKey:string,bookingIds:UUID[],ticketIds:UUID[],itemIds:UUID[],
  identityUnresolved:boolean,searchHint:null|{description:string},
  dateHints:null|{after:string|null,before:string|null,timezone:string},
  evidenceRefs:DiagnosticEvidenceRef[]};
export type DiagnosticManifestV1={schemaVersion:1,target:QualifiedOperatorTarget,
  actorProfileId:UUID,cases:DiagnosticCase[]};
```

`QualifiedOperatorTarget` is defined in [report.md](report.md), section Standalone entrypoint and qualified target encoding. All keys above are required; absent values are explicit `null` or `[]`. Reject unknown keys recursively. UUIDs are lowercase canonical.

SourceRef identity per kind:

- `ledger`: the positive bigint decimal string defined in [data-model.md](../data-model.md), Ledger identity.
- `booking_group`: `<resourceId>/<groupId>`, where `resourceId` is the anchor booking's lowercase canonical `resource_id` UUID (always 36 characters, so the first `/` after it separates the two parts unambiguously) and `groupId` is the exact bounded opaque `metadata.groupId` string defined in source-explanation.md. The same `groupId` on two resources is two distinct groups.
- `invoice`: the `fin_invoices.id` UUID.
- Every other kind: UUID.

`caseKey` is unique, trimmed NFC, 1–100 characters. At most 100 cases, 100 IDs per case ID array and 1,000 distinct supplied IDs in total. ID arrays are sorted and deduplicated after validation; a duplicate `caseKey` or `referenceId` refuses. Cases keep the supplied `caseKey` order for presentation and sort by `caseKey` for canonical content hashing. Input is at most 1,048,576 UTF-8 bytes. The graph, row, output and timeout limits in report.md also apply.

A case has at least one stable ID, or `identityUnresolved: true` plus a `searchHint.description` of trimmed 1–500 characters. With no IDs, query no customers or records from that hint; report `unmatched`/`unresolved`/`no_stable_ids`. A supplied `identityUnresolved: true` remains a blocking uncertainty, never cleared by a name guess. The raw hint may contain personal information and stays in the protected input only: output includes its SHA-256 and withheld state, never the hint. Stable-ID reads keep the canonical same-org identity checks; `identityUnresolved: false` is not proof of a match.

`dateHints.after`/`before` are `YYYY-MM-DD` local dates, inclusive lower and exclusive upper, at least one non-null, and `after < before` when both are present. `timezone` is a valid IANA zone equal to the qualified organization accounting timezone; a missing, invalid or mismatched zone refuses the hint. No assumed month/year, free-text date parsing or day-22 default. Hints help relate supplied sources but never truncate affected ledger opening/history or authorize additional subjects. Full histories for the admitted keys remain mandatory; if they exceed limits, return incomplete, not a date-filtered complete balance. No `dateHints` means all admitted-key history.

Evidence `privateRef` is a trimmed 1–256 character local reference, never fetched remotely or read as raw document content by this command. A `prior_correction` reference requires a `correctionId` UUID; other kinds carry `correctionId: null`. Verify that receipt is in the same organization under the current admitted field/owner policy; otherwise it is unavailable/unresolved, without leaking a private manifest. `document`/`owner_attestation` may carry the `ExpectedComponent` assertion above; a `prior_correction` assertion must be null (stored evidence supplies its meaning). Assertion quantity is a nonnegative fixed4 string (data-model.md) with at most 9 integer digits; `stockUom` is trimmed NFC, 1–80 characters; source, item and warehouse must be in the case's admitted graph. `verifiedAt` is a canonical UTC instant no later than the run observation, and `verifiedByProfileId` must equal the verified executing real membership owner in the same read-only snapshot, in addition to normal capabilities. A nonowner can run evidence-free, source-only diagnosis but cannot supply an asserted owner intent. A hash, file or reference alone proves no delivery or intent. A document without an assertion is evidence presence only; unknown expected facts remain unknown. Contradictory assertions, source ownership or coverage make the case unresolved; never choose the newest assertion. No diagnostic assertion approves a correction command.

## Exact output primitives

```ts
type Classification='duplicate'|'missing_realization'|'variant_mismatch'|'display_only'|'valid'|'unresolved';
type Reason='duplicate_net_issue'|'missing_net_issue'|'wrong_variant_issue'|'display_multiplicity_only'
  |'stock_matches_intent'|'identity_unresolved'|'identity_ambiguous'|'no_stable_ids'
  |'source_ownership_ambiguous'|'expected_effect_unknown'|'true_up_coverage_unknown'
  |'true_up_already_covered'|'evidence_conflict'|'evidence_unverified'|'incomplete_read'
  |'unsupported_shape'|'numeric_unsupported'|'integrity_failed'|'mixed_discrepancies'
  |'mapping_not_qualified'|'owner_confirmation_missing'|'stock_source_unknown'
  |'projection_unverified'|'projection_conflict'|'projection_source_changed'|'projection_identity_unavailable';
type Coverage={sourceGraphComplete:boolean,ledgerHistoryComplete:boolean,openingKnown:boolean,
  fulfillmentKnown:boolean,trueUpCoverage:'not_covered'|'covered'|'unknown'};
type ErrorCode='scope_unavailable'|'schema_unavailable'|'read_failed'|'timeout'|'capacity'
  |'stock_integrity_failed'|'unsupported_numeric'|'provenance_incomplete';
type DiagnosticError={code:ErrorCode,caseKey:string|null,ref:SourceRef|null};
type ComponentRow={componentKey:string,source:SourceRef,itemId:UUID,warehouseId:UUID,
  intendedQty:string|null,stockUom:string|null,actualIssuedQty:string|null,actualValue:string|null,
  classification:Classification,reasonCodes:Reason[],evidenceReferenceIds:UUID[],ledgerIds:string[]};
type SecondaryFinding={kind:Exclude<Classification,'unresolved'>,componentKey:string,
  intendedQty:string|null,actualQty:string|null,evidenceRefs:UUID[],reason:Reason};
type CaseRow={caseKey:string,candidateIds:{bookingIds:UUID[],ticketIds:UUID[],itemIds:UUID[]},
  sources:SourceRef[],identityState:'matched'|'ambiguous'|'unmatched',classification:Classification,
  reasonCodes:Reason[],coverage:Coverage,components:ComponentRow[],secondaryFindings:SecondaryFinding[],
  evidenceReferenceIds:UUID[],priorCorrectionIds:UUID[],repairEligible:boolean,
  hint:{state:'none'|'withheld_private_input',sha256:Digest|null}};
type MovementEvidence={ledgerId:string,entryId:UUID,
  entryState:'draft'|'submitted'|'cancelled'|'unavailable',entryType:'receipt'|'issue'|'transfer'|'adjustment'|'unavailable',
  itemId:UUID,warehouseId:UUID,qtyDelta:string,valueDelta:string,qtyAfter:string,valuationRate:string,
  postedAt:string,sourceRefs:SourceRef[]};
type GraphNode={ref:SourceRef,state:'available'|'missing_or_unavailable',rowSha256:Digest|null};
type GraphEdge={from:SourceRef,to:SourceRef,relation:'owns'|'links'|'realizes'|'reverses'|'supersedes'|'recipe'|'covers'};
type NumericCheck={caseKey:string|null,itemId:UUID,warehouseId:UUID,family:'quantity'|'value'|'rate',
  actual:string|null,expected:string|null,normalizedActual:string|null,normalizedExpected:string|null,
  difference:string|null,tolerance:string|null,result:'pass'|'fail'|'unknown'};
type KeyTotal={itemId:UUID,warehouseId:UUID,ledgerQtySum:string,ledgerValueSum:string,
  latestLedgerId:string|null,latestQty:string|null,latestRate:string|null,
  binExists:boolean,binQty:string|null,binRate:string|null,integrity:'pass'|'fail'};
type ReportBase={schemaVersion:1,mode:'read-only',orgId:UUID,actorProfileId:UUID,
  target:QualifiedOperatorTarget,source:{gitSha:string,deploymentVerified:false},observedAt:string,
  snapshot:null|{id:string,startedAt:string,role:'app_ledger',orgId:UUID,profileId:UUID,readOnly:true},
  scope:{caseKeys:string[],itemWarehouseKeys:{itemId:UUID,warehouseId:UUID}[],dateHintsApplied:false},
  evidenceCoverage:Coverage,cases:CaseRow[],ledger:MovementEvidence[],
  graph:{nodes:GraphNode[],edges:GraphEdge[]},
  sourceEvidence:SourceEvidenceRow[],timeline:TimelineRow[],sourceEvidenceSha256:Digest|null,
  projectionEvidence:ProjectionEvidenceResult[],
  labels:{items:{itemId:UUID,name:string|null,code:string|null}[],products:{productId:UUID,name:string|null}[],warehouses:{warehouseId:UUID,name:string|null}[]},
  totals:KeyTotal[],numericChecks:NumericCheck[],
  errors:DiagnosticError[]};
export type ReconciliationReport=ReportBase &
  ({outcome:'complete',complete:true}|{outcome:'integrity_failed',complete:true}
   |{outcome:'incomplete',complete:false});
```

All source numeric evidence is the original finite PostgreSQL string; exact aggregate decimal strings follow data-model.md. For quantity `NumericCheck`, `normalizedActual`/`normalizedExpected` are signed Q4 integer strings and `tolerance` is `'0'`; for value/rate they are the exact admitted decimals and the declared diagnostic threshold. Unknown facts have null operands and result `unknown`, not `0`/`pass`. `componentKey` is canonical `${source.kind}:${source.id}:${itemId}:${warehouseId}`; every referenced ledger, source or evidence ID must resolve within the same output or input. Case/graph identity deduplication never changes canonical movement totals. `labels` contains only same-org current stock item name/code, referenced `fin_products.name`, and warehouse name for referenced admitted keys (including archived rows), sorted by ID; missing labels are null and never identify another tenant. They are current stock labels, not proof of historical UOM or intent. No personal/customer names or untyped dictionary is selected.

Report `snapshot.id` is `pg_current_snapshot()::text` captured in the owned transaction; timestamps are PostgreSQL canonical UTC text preserving source microseconds. `source.gitSha` is the qualified checked-out candidate as 40 lowercase hex characters, not proof of production deployment. `observedAt` is the run's canonical UTC observation. Global org, actor and target must match the verified manifest and snapshot; none has a default. Coverage booleans describe completed source reads versus unknown physical truth. Global `evidenceCoverage` is the logical AND of the case completion/known booleans; its `trueUpCoverage` is `covered` if any case is covered, otherwise `unknown` if any case is unknown, else `not_covered`. SourceRef, graph nodes and edges sort by kind, id and relation; ledger sorts by numeric `BigInt` ID; components and totals sort by itemId, warehouseId and source key; reason, error and evidence IDs sort lexicographically. Edges deduplicate exact from/to/relation. No raw contact names, hints, tokens or source JSON enters output.

## Outcome consistency

A complete outcome has complete reads for all admitted keys, `errors: []` and complete queried evidence; numeric checks may remain unknown when intended physical facts are unproved, and cases may legitimately be unresolved because identity, intent or physical coverage is unproved. `integrity_failed` means reads completed but an integrity check failed; every case has `repairEligible: false`. Incomplete has at least one fixed `DiagnosticError`, every case `repairEligible: false`, `totals: []` and `numericChecks: []`; ledger and graph may be a clearly incomplete prefix only, with all coverage completion flags false. Never compute terminal totals from that prefix. On final output-size overflow, emit a compact incomplete report with empty ledger, graph and labels and unresolved CaseRows for the supplied caseKeys; do not truncate an oversized complete JSON file. Incomplete outputs also carry empty `sourceEvidence`, `timeline` and `projectionEvidence` and `sourceEvidenceSha256: null`. `snapshot: null` is allowed only for failure before a snapshot was acquired. Malformed input, auth or target refusal yields a fixed safe console error and leaves any existing output untouched, with no fabricated report. Validation enforces this outcome/coverage/error consistency, not only the TypeScript intersection. Exit codes per outcome are in report.md.

`repairEligible` means only a complete, unique garment variant candidate eligible for a separately approved F3 manifest preparation; it is never apply authority. It is false for every duplicate, missing, unresolved, covered, incomplete or integrity case, for unqualified mapping or owner-confirmation prerequisites, and for unsupported ownership. Source diagnosis and physical proof remain distinct. Other primary classifications remain useful report findings. Classification and reason assignment follow report.md's ordered table; the code-to-reason mapping is literal: duplicate→`duplicate_net_issue`, missing→`missing_net_issue`, variant→`wrong_variant_issue`, display→`display_multiplicity_only`, valid→`stock_matches_intent`. Every unresolved branch uses the applicable fixed uncertainty/integrity reason above (multiple reasons sorted, never raw exceptions). A movement on an affected key whose entry decodes to stock source kind `unknown` makes the owning component unresolved with `stock_source_unknown`.

## Run-stable comparison projection

The repeatability check compares the run-stable projection of two reports: the full report with `observedAt`, `snapshot.id` and `snapshot.startedAt` removed, and with `at` set to null on every timeline row whose `meaning` is `current_state_observation`. Every other field, including `sourceEvidenceSha256`, must be byte-identical in canonical JSON. No other exclusion is permitted.

## Required test vectors

Pure, CLI and native cases decode exact known vectors for every input/report outcome; reject unknown, omitted, nested and invalid date/timezone/reference/variant/consistency keys; distinguish absent/unknown from `0`; verify `BigInt` order and graph references, hint withholding, owner assertion admission, contradiction/coverage classifications, incomplete-prefix with no totals, final-byte overflow, and two `booking_group` refs with the same `groupId` on different resources. No apply flag or correction command is introduced.

Stock `MovementEvidence.valueDelta`/`valuationRate`, `ComponentRow.actualValue`, key value/rate totals and accrual estimates/actuals are raw stock scalars whose denomination is unverified unless the separately admitted private correction qualification ([repair.md](repair.md)) proves it. They are never labeled with a ticket/display currency; source payment/ticket currency remains its own stored billing fact. This read-only diagnostic does not fabricate a stock-currency field or authorize an economic sale-versus-stock cost comparison.
