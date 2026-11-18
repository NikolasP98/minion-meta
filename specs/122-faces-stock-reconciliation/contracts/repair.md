# Historical garment stock-only correction

This is the selected correction design for a proven garment variant mismatch. It is
not permission to apply it. Owner spec approval, a qualified implementation, owner
merge and exact target/manifest approval remain required.

## Selected mechanism and dependency

Use the atomic `stock_only` correction engine designed in
[F3's workflow contract](../../124-stock-correction-workflow/contracts/workflow.md).
F3 must expose a shared server service for its preview/apply endpoints and the
operator script. The F1 script imports that service; it does not invoke the old
two-transaction `repostTicketStock` sequence, shell out to a service repair script,
or create another ledger writer. F3 owns the transaction-aware submit/cancel
helpers, sorted source/bin locking, authoritative policy checks and durable
`stk_corrections` operation receipt. F1 cannot ship this writer before that
dependency is independently qualified.

Add `scripts/faces-garment-repost-2026-11.ts`, a dry-run-default, single-ticket
operator command; pure validation/canonical plan lives in
`scripts/lib/faces-garment-repost.ts`. No batch mode, new HTTP endpoint, background
worker or additional correction table is introduced by F1.

## Admission and frozen intended issue

The diagnostic must match ticket, physical M product line and single live submitted POS issue by same-org stable IDs; the original issue's metadata must decode to `{kind: 'pos', id}` equal to the ticket ID under the [stock entry source decoder](source-explanation.md), and any other decoded kind refuses. The later [bounded garment read](../../../audits/2026-11-16-faces-followups/evidence/garment-candidates-read-summary.json), observed 2026-11-16T19:42:24.613Z, establishes these two reported cases. Each has one physical M quantity 1 and one submitted single-L issue:

| Case | Ticket | Ticket ID | M product line | Original L issue |
| --- | --- | --- | --- | --- |
| reported_case_A | POS-2026-00092 | `d3147366-60ef-409a-b91b-f799afafd819` | `d15839b7-70fe-4f14-8def-3dc54b412ac7` | `22510eb0-6f4c-4859-b60d-4d1230783d1b` |
| reported_case_B | POS-2026-00098 | `6284d37e-a942-4f96-a27f-67ef4381860e` | `344b74e4-c9bf-46c2-b5f1-8fc063038d28` | `0e54f2e3-eb62-4a79-80be-95151bdb481a` |

These are evidence references, never hardcoded production defaults or a standing allowlist. Each operation has its own fresh manifest, operation key, fingerprints and owner approval. The CLI processes one ticket. Applying the first case changes their shared bin state, so the second case must be freshly previewed and its exact updated manifest approved before apply; an earlier approved stale fingerprint is not reusable. No automatic two-case batch or silent reapproval is implied.

A third candidate, POS-2026-00059, predates the later manual M/L two-unit issues dated 2026-10-29 UTC. Whether those movements absorbed that discrepancy is unresolved: this older case remains ineligible without independent coverage evidence. The bounded read found no later adjustment/unowned manual movement after the two reported cases; that narrows the investigation but does not independently verify physical count or delivery intent.


For this bounded first repair, require:

1. One unambiguous physical M sale quantity, a single original issue line for L,
   identical normalized units, and an exact quantity match. Reject mixed M/L sale
   ownership, multiple stock lines, modifiers or competing source owners. A
   zero-total/fully discounted product remains an actual physical product.
2. Independent confirmed fulfillment and review of later physical true-ups and
   earlier correction receipts. A true-up that already absorbed this discrepancy
   makes this source ineligible; an unknown coverage interval blocks application.
3. The approved current M mapping has been corrected to M, L still maps to L, and
   no bridge, component, conversion or archive-state drift changes either meaning.
   Recipe correction and historical stock correction have separate operation IDs.
4. Both the original issue period and the proposed current correction period pass
   the existing period policy. Missing settings, locked/fiscal constraints,
   ambiguous source or pending repost blocks the command.

Construct the intended issue by copying the original immutable issue lines and
replacing only the approved L item with the approved M item, preserving quantity
and warehouse. Do not regenerate the ticket's entire present-day recipe: a
co-ticket package or service may have changed independently. Record any such
current-recipe difference as separate diagnostic evidence; never add its supplies
to this garment correction.

Evaluate the whole frozen replacement through existing `planRepost`, with
`allowedItemIds={L}` and `allowIncreaseItemIds={M}`. `planRepost`
(`pos.service.ts:1211–1235`) is pure in body but lives in `pos.service.ts`, which
imports `$server` and database modules, so it runs only inside the F3 server
engine; the pure `scripts/lib/faces-garment-repost.ts` validator never imports it.
Its `Number` arithmetic and `REPOST_TOLERANCE = 0.0001` skip differences of at most
0.0001, so the engine and the validator separately require exact Q4 equality
([data-model.md](../data-model.md)) between the frozen original L line quantity and
the replacement M line quantity, and exact equality on every other line, before
`planRepost` is consulted. Required issued-quantity change is L `-q`, M `+q`; the
corresponding bin change is L `+q`, M `-q`. Every other quantity/key must be
unchanged. Preview the actual cancellation and
replacement value effects from the original ledger and freshly locked bins.
If rates differ, show the resulting COGS and remaining-value difference explicitly;
do not promise a zero-value correction. Negative stock, unapproved costs or any
extra key/value effect is a blocker. M=19 or a physical-count target such as 17
is never used as an overwrite instruction.

## Manifest, command and exact authority

The private manifest is F3-owned `GarmentManifestV1` in [garment-envelope.md](../../124-stock-correction-workflow/contracts/garment-envelope.md), not an implementer-selected subset. F1 uses that strict decoder/type, canonical full manifestSha256, explicit approvedPlanSha256 and private previewHash. It binds every target/actor/source/evidence/coverage/bin/period field, replacementEntryId, postedAt/accountingTimezone, before/intended effects and owner reference. No credentials or customer names; file mode 0600. Apply requires the verified executing `membershipRole === 'owner'` in addition to the stock/POS/finance matrix; custom role names/platform admin are not a bypass. Preview may prepare an unapproved candidate but cannot claim owner approval.

`bun run faces:stock:repair --org <uuid> --manifest <path>
--output <path>` only previews in a verified repeatable-read/read-only org scope.
Adding `--apply --approved-plan-sha256 <digest> --preview-hash <digest>` requests
the one approved operation after target verification; the full flag set, status
command and exit codes 0/2/3/4/5 are F3's
[recovery-receipts.md](../../124-stock-correction-workflow/contracts/recovery-receipts.md).
Token verification and read-only admission follow [report.md](report.md), Shared
principal and snapshot admission; the verified profile must equal the approved
manifest `actorProfileId`. The write transaction checks authority again under the
write gate pair. It never selects the first organization member or treats a
profile flag as identity proof. Invalid approval or authority refuses without
mutation.

## Apply transaction and recovery

The F3 engine owns one transaction: `lockStockWrite` acquires the write gate pair
([report.md](report.md), Gate terms) before any source, profile, period, entry or
bin row lock, and its guard holds both gates until commit or rollback. Then follow
this row order: operation/source rows → period-policy and fresh authority → entries
→ accruals → bins; re-read all manifest conditions; recompute the frozen plan;
check the operation identity under the stock-v1 gate;
append cancellation reversals; create/submit the replacement POS issue retaining
source and correction provenance; update the ticket stock-entry stamp; save
before/after, actor, reason, approval digest and audit evidence; insert the completed immutable applied operation row and
commit. The ticket product, payment amounts/dates/status and booking/package
entitlements remain unchanged. No outer script may patch a ticket stamp after
the transaction. Replacement and reversal rows post in the approved current open
correction period, while originals retain their original dates. Report the
current-period COGS effect; earlier-day financial history is not restated.

Failure before commit rolls back the entire operation. A lost response is
`unknown`, not a retry with a new key: read the F3 operation receipt using the
same key/digest. Applied receipts replay the original outcome without another
cancellation or issue. Reusing a key with changed intent is a conflict. Another
operation against the same stale source loses its fingerprint race and refuses.
Best-effort notifications/audit transport cannot turn a committed correction into
a second mutation. Missing, mixed or contradictory receipt/source state blocks
manual recovery until authoritative reconciliation.

## Validation and completion

Required synthetic tests: exact M sale/wrong-L issue; zero-total product; stale
or changed mapping; correct source product preserved; package recipe drift not
added to the frozen replacement; mixed/shared ownership refused; true-up-covered
source refused; negative M stock; unequal rates and explicit COGS; locked period;
missing/foreign source; two operation keys racing; same key/different payload;
failure at each write; lost-commit-response recovery; one apply followed by a
zero-write repeat. Native PostgreSQL tests must assert atomicity and all bins,
ledger rows, durable receipt and ticket stamp together.

Rehearse compensation in `finally` only on disposable QA: the explicit action=compensate private command, with a second approved inverse manifest, restores fixture quantity attribution (economic equality only for its qualified equal-rate fixture) and preserves its audit trail.
Production undo is a new reviewed inverse manifest, never deletion of ledger
history. A historical duplicate or missing service issue that is not this proven
garment case is reported separately and cannot enter this writer.


The exact shared write ordering, helper signatures and retry bounds are F3's [transaction protocol](../../124-stock-correction-workflow/contracts/transaction-protocol.md). Preview uses the shared F7 principal/nonlocking snapshot admission in report.md; it never calls a `FOR SHARE` resolver inside a read-only transaction. Approved source/mapping/ledger/bin fingerprint admission is exact, irrespective of the diagnostic numeric tolerances.

Every garment manifest carries a required `target: QualifiedOperatorTarget` ([report.md](report.md)), bound with the exact intent digest. The package, admitted SSR loader, private environment and transport contract in report.md apply unchanged.

Apply consumes F3's common authority/module synchronization and direct required-module admission under the held write gate pair, including actual absent-rule/module insertion race qualification. No F1-specific authority implementation is permitted. The read-only preview/status snapshot remains nonlocking and does not acquire either gate.


## Exact shared invocation and receipt

F1 preview invokes previewGarmentStockCorrection(ctx,manifest). Apply invokes applyGarmentStockCorrection(ctx,{manifest,approvedPlanSha256,previewHash},actor). No naked CorrectionInternalOptions/replacementEntryId or generic public StockOnlyPreview call remains. Both methods own the F3 transaction and compare the full manifest. The public `stock_only` API stays closed (HTTP 422); the CLI is the only selected garment entrypoint. F3 validates original/source/true-up/mapping receipt/period/value effects and the owner/profile/org under the held write gate pair; caller attestation strings alone cannot authorize an arbitrary stock substitution.

Use the exact `manifest.postedAt` for the cancellation reversal and the replacement create/submit, roundtrip canonical UTC milliseconds, fresh approved current open period and actual accountingTimezone. No server-now replacement or historical backdate. The full normalized manifest/digest/time/approval/source evidence and before/intended/actual after effects are inserted in the immutable F3 `sale_stock_repost` receipt in the same transaction as every stock/stamp/audit effect. No post-commit receipt patch. Same operation key with changed evidence/posting time/reference/replacement UUID is key_reuse; status/replay returns original full domain receipt, not merely a generated entry ID. Local native tests invoke the shared private methods and assert complete receipt/time equality and rollback on receipt failure. Repeated lost-response run makes zero new effects.

Active-principal checks are current database profile exists/not deletion_pending and organizations.status='active', independently of valid token/surviving membership. Both read-only preview/status and guarded apply use the exact F3/F7 dependency contract; deletion-first refuses, correction-first may commit before deletion waits. F3 foundation qualification includes the warehouse/default, finance-timezone and bundle eligibility writers, all under the shared gate; deployment/drain admission must cover them before any F1 production apply.

The complete correct/compensate action contract is F3 garment-envelope.md. It admits the forward replacement M issue only through its actual immutable receipt; no generic forward L-issue predicate blocks or bypasses the inverse. All inverse costs are freshly previewed/approved, with no historical-rate override or claim of economic rollback under unequal rates.

F3 [recovery-receipts.md](../../124-stock-correction-workflow/contracts/recovery-receipts.md) also owns the known-key/full-original-manifest/payload binding and the result union with current-reader authority; no wrapper invents or discards `--preview-hash`. Status calls `getGarmentCorrectionStatus` in its nonlocking owning snapshot, needs no unknown correction UUID and acknowledges a stored receipt separately from changed current state. All value/COGS normalization and fractional forward/inverse qualification are F3 [garment-numerics.md](../../124-stock-correction-workflow/contracts/garment-numerics.md), not diagnostic quantity tolerances.


## Required stock denomination qualification

`GarmentManifestV1` also requires `valuation: StockValuationQualificationV1`. The selected shared F3 definition is in `contracts/valuation-qualification.md` of that feature and is imported by the same strict private decoder; F1 introduces no parallel currency resolver. The selected object is:

```ts
type StockValuationQualificationV1 = {
  schemaVersion:1; kind:'owner_attested_stock_currency'; orgId:UUID;
  currency:string; attestedByProfileId:UUID; attestedAt:string;
  evidenceReference:string; evidenceSha256:Digest;
  keys:{itemId:UUID;warehouseId:UUID;latestLedgerId:string|null;
    latestLedgerRowSha256:Digest|null}[];
};
```

All keys are required; reject unknown keys recursively. `currency` is an owner-verified uppercase three-letter currency code, not a default. UUIDs/digests use the manifest's existing canonical validators. `attestedAt` is canonical UTC with exactly three fractional digits and `Z`, no later than the qualified preview/apply observation. `evidenceReference` is trimmed NFC 1–1000 characters, a protected reference rather than fetched content. `keys` is the exact sorted distinct affected old/new item+warehouse pair, bound to the same latest-ledger IDs and row hashes as the full manifest. Null ID/hash are paired and only represent the manifest's actually absent latest ledger; no fabricated opening history. Org, affected keys, stock boundaries and current source fingerprints must match under the same owning snapshot/held write gates.

At preview and apply, the independently verified executing real owner must equal both manifest actorProfileId and attestedByProfileId. This is expressly an owner's attestation that the admitted historical stock values and current affected bins share this denomination. The database has no historical stock-currency column; ticket.currency, invoice currency and current display settings do not prove that fact. Missing, contradictory, mixed-denomination or unsupported evidence refuses the private operation with no stock writes. No FX engine, conversion, numeric overwrite or normal-sale policy change is introduced.

Bind the complete valuation object into manifestSha256, approved plan, preview/payload hashes, immutable intended.domainManifest and after.receipt. Available value/rate/COGS projections carry the exact qualified currency and qualification digest; denied projections omit both together with all amounts. Status preserves that immutable original evidence and verifies the current reader separately; it never requires the historical attester still exists or retains owner membership. Compensation requires the same currency as its retained forward receipt plus a new current-owner attestation bound to fresh affected stock boundaries. It does not reuse an expired forward authorization or change historical evidence.

The source-only diagnostic remains useful without this proof: raw ledger/accrual values are explicitly denomination-unverified stock scalars, distinct from payment/ticket money with its actual stored currency. It cannot claim denominated COGS, compare them economically to sale money, or prepare an eligible executable garment manifest without the qualification. Neither a formatting currency nor a passing numeric integrity check fills this gap.

Existing pure/CLI/native garment behaviors add missing/wrong-owner/foreign-org/changed-boundary/mixed-currency rejection, immutable valuation roundtrip and digest sensitivity, current-reader versus removed historical attester, inverse same-currency/new-attestation success, and no fallback from ticket/display currency. These are assertions inside the selected eight native behaviors and existing test files, not an extra feature or ninth registration.
