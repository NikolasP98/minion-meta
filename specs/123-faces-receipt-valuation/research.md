# Research: FACES 89-unit receipt valuation

## Evidence and limits

Pinned source checkout `.local/faces-followups-2026-11-16/hub-source` verified at `c6c2d5739572356239c4048c0f564f40b0768adc`. Registry command `node scripts/repo-policy.mjs show hub` confirms Bun and PR base `master`. Read Hub `AGENTS.md` and `CLAUDE.md`; no branch/worktree/product changes were made.

[Sanitized read-only database evidence](../../audits/2026-11-16-faces-followups/evidence/database-read-summary.json) records initial snapshot `2026-11-16T19:15:08.359Z`, role `app_ledger`, org-GUC FACES SCULPTORS `21e0601b-f632-43fd-8414-d644af4271f4`, transaction read-only `on`. Private initial evidence SHA-256 `d0ca389a3b0af3b63f8352f7b9930477440f7a4e9b0d4e3bcc2f76d4a2a9263d`. Follow-up private snapshot `.local/faces-followups-2026-11-16/db-evidence-private-v2.json`, observed `2026-11-16T19:16:39.881Z`, SHA-256 `1808216e92b4931288d9e83e1d33f592057900cf3bb5c38390abd8157670130a`, includes the item's 193 ledger rows. Those 193 are context, not 193 affected rows: the candidate receipt is ledger 1919, followed by 17 rows through 2037 in its item/warehouse chain.

No invoice was fetched, no production mutation occurred, and deployed/historical UI source identity is unverified. The candidate stores 5474.58 as a unit rate while the meeting reports that amount as a total; intended basis and cause remain unverified; the specific user interaction or importer causing it is unproven.

## Actual candidate facts

| Field | Observed value |
| --- | --- |
| Receipt / entry | `STE-2026-00559` / `b8190e7d-3d59-47f4-ac79-edb5a8d3c72c`, submitted |
| Posted time | `2026-11-02T19:11:33.577Z` |
| Line | `dddb635d-1184-4350-8b0d-36c7f4ecb85a` |
| Item | `25aba8da-b056-4eea-a004-6b2e3ba6c6e2`, code `1264`, HA Saypha Volume Plus |
| Warehouse | `8b2079fa-904b-44e6-bbe8-79edb7cce867` |
| Stored qty / unit rate / line value | `89` / `5474.58` / `487237.62` |
| Pre-receipt state (same-key previous ledger snapshot) | Qty `8`, rate `250`, value `2000` |
| Receipt ledger 1919 | Qty delta `89`, qty after `97`, value delta `487237.62`, resulting rate `5043.686804123711` |
| Subsequent segment | 17 submitted issue rows, total quantity out `18`, no later receipt/transfer in this snapshot segment |
| Latest ledger 2037 | Qty `79`, rate approximately `5043.686804123718` |

This is a strong match for the meeting's 89-unit report; exact supplier document/cost basis and currency remain the eligibility gate.

## Source anchors

| Source at pinned commit | Established behavior | Consequence |
| --- | --- | --- |
| `src/routes/(app)/stock/entries/new/entry-lines.ts:54–77` | Unit/total mode already exists; total divides by qty, rounds four decimals. | Adding another toggle is not supported as the fix. |
| `src/routes/(app)/stock/entries/new/PageBody.svelte:265–275` | Sends `unitRate(l.rate,l.qty,rateMode)`. | Inspect original mode/path/version; current UI support does not prove historical request. |
| `src/routes/api/stock/entries/+server.ts:20–43,61–80` | Entry schema accepts qty/rate; current route converts currency and verifies purchase link. | Cost basis/FX/purchase must be read; current settings do not reconstruct historical missing evidence. |
| `src/server/services/stock.logic.ts:45–77,549–577` | Incoming cost uses given rate; outgoing cost uses current bin average; FX conversion rounds four decimals and records metadata. | Correcting receipt changes later issues as well as remaining stock; FX is not guessed. |
| `src/server/services/stock.service.ts:679–713,778–934` | Only draft updates; submission appends ledger plus bin updates under entry/bin locks. | Submitted receipt cannot be edited through ordinary draft update. |
| `src/server/services/stock.service.ts:947–1015` | Cancellation appends negated original qty/value; can refuse negative current stock. | Cancel/re-receive 89 units when only 79 remain cannot be assumed safe, nor does it restate historical issue COGS automatically. |
| `src/server/db/pg-schema/stock.ts:172–211`; `stock.logic.ts:377–408` | Ledger bigserial ID is strict total order, append-only; bin rebuild takes latest stored snapshots. | Use sequence, not timestamp sorting; `rebuildBins` cannot repair historical valuation. |
| `scripts/repair-stock-valuation.ts:1–25,65–85,168–245` | Older broad repair injects opening stock, revalues in place, rebuilds reconciliation/bins, has force mode. | Not a reusable safe receipt-specific repair: historical assumptions, elevated writes and broad scope need separate review. Never run it as this correction. |

## Decision 1: receipt verification is the first independent slice

**Decision**: Build explicit read-only discovery of candidate, source purchase/document, UOM, original typed/valuation currency metadata and entry lines. Require same-org invoice agreement before valuation-plan eligibility. Missing document yields a useful unresolved report without application.

**Rationale**: The exact data candidate is known, but the meeting number is not source-document proof; the total could include other lines/taxes/charges or use a supplier packaging UOM.

**Alternatives**: Treat meeting total as authorization (reject); identify “article 89” (reject: transcript ambiguity); infer FX from current settings (reject: historical basis unknown).

## Decision 2: replay value dependency, not only the bin

**Decision**: Load exact pre-receipt state, replay original and hypothetical corrected movement values in `stk_ledger.id` order, and detect any transfer/reversal/adjustment/second-receipt boundary as explicitly unsupported; do not implement transitive hypothetical propagation. The present observed segment has 17 issue rows and no later transfer; re-discovery must check for drift before assuming that remains true. Output receipt delta, downstream issue/COGS deltas and remaining value independently, preserving quantity throughout.

**Rationale**: Current bin agreement can faithfully cache wrong source values. Existing `rebuildBins` copies those snapshots. Current cancel/re-receive does not retroactively correct historical COGS and may hit negative stock.

**Alternatives**: Set bin value to 5474.58 (reject: ignores opening stock/later issues); use 61.5121 as current rate (reject: opening stock 8 @ 250 changes average); replay by `posted_at` alone (reject: stock sequence ID is canonical); rerun legacy opening repair (reject: different scope/invariants).

## Executable offline source-math checks

Private scripts `.local/faces-followups-2026-11-16/speckit-F2/source-math-check.ts` and `receipt-replay-check.ts` import the pinned `unitRate`, `computeLegValue`, `applyLedgerDelta` and `replayBins` functions. Commands (no DB connection, no env file):

```bash
bun --no-env-file --tsconfig-override /home/nikolas/Documents/CODE/MINION/.local/faces-followups-2026-11-16/speckit-F2/tsconfig.source-check.json /home/nikolas/Documents/CODE/MINION/.local/faces-followups-2026-11-16/speckit-F2/source-math-check.ts
bun --no-env-file --tsconfig-override /home/nikolas/Documents/CODE/MINION/.local/faces-followups-2026-11-16/speckit-F2/tsconfig.source-check.json /home/nikolas/Documents/CODE/MINION/.local/faces-followups-2026-11-16/speckit-F2/receipt-replay-check.ts
```

Both exited 0 and all explicit assertions passed. `receipt-replay-check.ts` feeds pinned `replayBins` a Number `seq` (`LedgerReplayRow.seq`); that is offline arithmetic only, and the F2 implementation never carries ledger sequence identity through that type (see [data-model.md](data-model.md#existing-source-entities)). Bun emitted an internal “directory mismatch” diagnostic for the tsconfig override on both invocations. This tooling warning is retained as a limitation; these checks are arithmetic/source evidence, not a clean full Hub test run or an approved repair rehearsal.

### Conditional replay result — not an applied correction

Assuming invoice verification establishes exactly 89 stock units for total 5474.58 in valuation currency, and accepting current four-decimal input rounding without allocating the 0.0031 residual:

| Quantity/value | Original observed chain | Hypothetical corrected chain |
| --- | ---: | ---: |
| Receipt unit rate | 5474.58 | 61.5121 |
| Receipt contribution | 487237.62 | 5474.5769 (cent display 5474.58) |
| Immediately after receipt qty | 97 | 97 |
| Immediately after receipt average | 5043.686804123711 | 77.05749381443299 |
| 17 later issue COGS | 90786.36247422689 | 1387.0348886597938 |
| Latest qty | 79 | 79 |
| Latest remaining value | 398451.2575257737 | 6087.542011340212 |

Receipt-value difference `481763.0431` equals consumed-cost difference plus remaining-value difference within floating-point residual approximately `5.9e-10`. The independent rational value of the remaining 79 units is `5904915751/970000` (6087.54201134020618…); the engine value above differs from it by about `5.8e-12`. These are conditional offline calculations using the v2 snapshot, not authoritative financial corrections or today's value beyond that snapshot. The selected production plan uses exact decimal admission and the existing source movement engine under explicit independent-oracle tolerance, documents the four-decimal versus invoice-cent policy, reruns on a fresh stable snapshot, checks exact related consumers and requires owner approval. Do not round each intermediate movement to cents.

## Decision 3: select bounded atomic cancellation and replacement

The [closure observation](../../audits/2026-11-16-faces-followups/evidence/valuation-closure-read-summary.json) at 2026-11-16T19:27:35.645Z establishes a one-key 18-entry/18-line/18-ledger segment with 15 realized accrual references and 2 ticket pointers, all submitted. Select [contracts/correction.md](contracts/correction.md): reverse issues latest-first, reverse receipt, post corrected receipt then frozen issue quantities in original order within one transaction, update exact consumers and commit durable audit/operation evidence. Preserve original lines/ledger and post new effects in the approved current open correction month. Earlier-period COGS stays original; current-period signed differences correct the cumulative cost. Source `finance.service.ts:926,1036` includes signed issue ledger independent of entry status, by ledger posted_at. Other readers and copies of the corrected values (business brain corpus, stock overview chart, last restock cost) are listed with their selected handling in [correction.md § Derived readers and copies](contracts/correction.md#derived-readers-and-copies).

Shared `src/lib/money/decimal.ts` supports exact division/quantization at four-decimal receipt admission. Keeping the existing Number movement engine avoids a new global valuation engine; the selected tolerances are in [correction.md § Explicit accounting and precision proposal](contracts/correction.md#explicit-accounting-and-precision-proposal).

Reject a zero-quantity revaluation type, quantity fake, bin-only rewrite, privileged historical ledger rewrite and generic transfer replay. The bounded writer rejects post-preview drift and unsupported multiline/transfer/reversal/adjustment/second-receipt shapes at apply. Further supported issues before a fresh approved preview are admitted within the 128-issue cap. Invoice, currency/UOM/cost allocation and period/residual acceptance stay external apply prerequisites, not deferred architectural choices. F3 owns transaction-helper/lock extraction and the single immutable stk_corrections table/migration; F2 owns receipt_chain orchestration and tests. No product implementation or mutation has occurred.

## Remaining gates and bounded unknowns

- Verify supplier invoice/purchase identity, original currency/FX, UOM and whether 5474.58 belongs to exactly this line's inventory cost basis.
- Determine original entry path/mode/importer and source version if prevention is warranted; do not blame a user without evidence.
- Validate full valuation dependency closure, accrual actual-value references and financial consumers; 17 rows is the observed segment, not a permanent scope cap.
- Approve rounding-residual and accounting-period/COGS policy; no cutoff/closed-period rule is invented.
- Fresh snapshot/fingerprint, independent review of the selected correction contract, owner spec approval, owner merge and exact production-manifest/target apply approval remain pending.

## Existing field-tier source boundary

Pinned `src/lib/permissions.ts:128` restricts FIELD_LEVEL_MODULES to crm/finance/scheduling; `src/server/services/rbac.service.ts:217` defaults stock to 0 and its role-override path also keeps stock field tier 0. The resulting admission rule (finance tier, no stock tier) is stated in [correction.md § Exact shared principal contract and CLI modes](contracts/correction.md#exact-shared-principal-contract-and-cli-modes).

## Source-confirmed nullable UOM and diagnostic wire decision

Pinned pg-schema/stock.ts:154–160 has nullable stk_entry_lines.uom. stock.service.ts:640–646 persists omitted labels as null; insertSourcedIssueEntry:1698–1713 supplies only resolved item/qty/fromWarehouse after resolveConsumptionLines:1547–1590 has normalized stock quantity. Ordinary POS/booking issue labels can therefore be null; raw EntryEvidence.uom is string|null. That fact alone does not verify which historical writer/conversion produced an actual row. Owner-attested UnitQualification separately binds historical writer, receipt/item/document/source hashes and normalized stock unit. Current item.uom cannot supply missing history; copies/compensating generations preserve raw null.

The strict diagnostic contract is [diagnostic-wire.md](contracts/diagnostic-wire.md), implemented in the already selected pure faces-receipt-replay module before S1. It selects complete manifest/discovery/replay/outcome/coverage/source/consumer/oracle/hash schemas, useful absent-document hypotheses and original-only unsupported results, separately from the executable writer. Diagnostic currency assumptions remain explicit numeric hypotheses; unknown historical stock denomination is null, not current Finance currency. Shared DocumentBasis/UnitQualification validators flow from this pure module to later US3 logic. Full writer hashes bind the new proof; compensation inherits prior immutable qualified evidence without requiring a deleted attestor to remain current owner. No source document/parser/download, alternative math/policy, extra native name or product change is selected.
