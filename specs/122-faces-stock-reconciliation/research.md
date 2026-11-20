# Research: FACES stock reconciliation

## Evidence baseline and method

Source checkout: `.local/faces-followups-2026-11-16/hub-source`, verified HEAD `c6c2d5739572356239c4048c0f564f40b0768adc`. Paths below are relative to that Hub commit. Read `AGENTS.md` and `CLAUDE.md`; registry `node scripts/repo-policy.mjs show hub` confirms Bun and PR base `master`. No product code, branch, worktree, credentials or production state changed in this drafting step.

The coordinator's read-only database snapshot is summarized in `audits/2026-11-16-faces-followups/evidence/database-read-summary.json`, observed `2026-11-16T19:15:08.359Z`, role `app_ledger`, verified organization FACES SCULPTORS (`21e0601b-f632-43fd-8414-d644af4271f4`), transaction read-only `on`. Raw private receipt SHA-256 `d0ca389a3b0af3b63f8352f7b9930477440f7a4e9b0d4e3bcc2f76d4a2a9263d`; named rows remain in mode-0600 `.local/faces-followups-2026-11-16/db-evidence-private.json`. No PII is copied here. Deployed SHA and historical code version remain unverified.

## Current source versus unproven conclusions

| Anchor | Observed at pinned source / snapshot | Not established |
| --- | --- | --- |
| `pos.service.ts:797–843` | `kind=product` issues at sale; booking-linked services skip; ordinary nonbundle service awaiting scheduling skips; counter redemption or bundle may issue. | Whether meeting garment was a counter product, service ingredient, included package product, or an old mapping. |
| `pos.service.ts:1065–1187` | Recovers `pos` source issue; source-stamped drafts are retried; some shortfalls filter lines and produce warning. | That a submitted stock entry covers every expected item, or that current rules produced historical records. |
| `stock-accruals.service.ts:83–219,350–466` | Open accruals are expectations, release on explicit empty confirmation, source identity locates draft/submitted issue; draft retry does not replace prior draft lines. | That a missing accrual means no fulfillment, or that repeated completion with changed lines corrects an old draft. |
| `scheduling/bookings/[id]/complete/+server.ts:29–79` | Status completion commits before fail-soft stock realization. | That completed status proves consumption or a successful stock write. |
| `scheduling/bookings/_handlers.ts:294–390,673–710` | Bare completion may require confirmation; grouped transitions have per-member checks and post-commit realization. | That all entry paths are atomic together, or that only the single completion handler matters. |
| `stock.service.ts:679–713,778–1015` | Only draft entries editable; stock submission locks entry/bins; cancellation appends exact original qty/value reversals, may refuse negative stock. Audit is best effort after stock commit. | That cancelling and reposting old consumption preserves historical COGS, or that audit failure means stock rolled back. |
| `pos.service.ts:1240–1360` | Preview/repost compares live quantities with current recipes, refuses unnamed drift, claims ticket stamp, cancels then reposts in separate calls, interrupted state `repost_pending`. | That current recipes are historical truth, or repair is atomic end-to-end. |
| `scripts/repair-service-sale-stock.ts:128–166,199–226` | Preview pins one read-only session; direct recipe candidate scan; apply uses separate app pool and repeat-plan invariant. | Component recipes are absent in current data, apply has transaction-wide atomicity, or the historical script's stated production assumptions remain current. |
| `pg-schema/stock.ts:172–211,243–289` | Ledger append-only; bigint sequence is ordering key; bins cache latest snapshots; accrual uniqueness is org/source/sourceId/item. | A cross-source uniqueness guarantee, historical ownership, or physical accuracy from internal agreement. |
| `pg-schema/stock.ts:181,348`; `stock.logic.ts:382` | `stkLedger.id` is `bigserial('id', { mode: 'number' })`, so every Drizzle select of that column, `StkLedgerRow` (`getLedger`, `getRecentLedger`) and `LedgerReplayRow.seq` carry a JavaScript `number`. | That ledger IDs stay below `Number.MAX_SAFE_INTEGER`. F1 therefore reads IDs as text (data-model.md, Ledger identity). |
| `stock.service.ts:1319–1322,1740–1752,1783–1800,1915–1925,1990–2011`; `src/lib/components/stock/entry-document.ts` | Entry provenance is untyped `stk_entries.metadata`. POS and booking issues store `{source, sourceId}` (POS issues also carry `ticketId`); invoice issues store `{source: 'invoice', invoiceId, providerRef}` with no `sourceId`; plain service issues store `{source: 'service', finProductId, quantity}` with optional `sourceId`; purchase receipts store `purchaseId`. The garment evidence also shows `repair-opening-balance`, `analyst-reconciliation-2026-08` and `{}`. `entryDocument` is a display-link helper that returns null for service, manual and unknown sources. | A closed, typed source decoder. F1 adds one (source-explanation.md, Stock entry source decoder). |
| `scheduling-bookings.service.ts:1752–1755,2190–2221` | `groupIdOf` reads a nonempty `metadata.groupId`; `visitMembers` selects members by organization, byte-equal `metadata->>'groupId'` and the anchor booking's `resource_id`. | That `groupId` alone identifies a visit: the same `groupId` on two resources is two visits. |
| `pg-scheduling-schema.ts:286–311`; `scheduling-bookings.service.ts:577,1117,3867` | `sched_booking_status_log` records `from_status`, `to_status`, `reason`, `changed_by` and `changed_at` at booking creation and at every status change, in the same transaction as the booking update. The schema comment saying nothing populates it is stale. | That every older booking has log rows, or that a `completed` transition proves physical delivery. |
| Database summary | Seven overlap rows across five tickets; current M=19, L=8; existing bins show zero negative values and zero latest-ledger mismatches. | Seven duplicate issues, exact overstatement, complete ledger-only-bin coverage, or physical correctness. |

## Verified wrong-variant case and bounded prevention design

Focused sanitized evidence `audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json`, observed `2026-11-16T19:20:30.051Z`, private snapshot SHA-256 `9f028bd6c26af39deb6383a2f12cdbe07799bb2b150549b1f987c6bf332277a7`, proves:

- Faja M product `8ebe2b40-2bd5-4543-b380-dc6ba6cc7ca0` has no direct stock bridge and current recipe quantity 1 of FAJA-L item `f7ea983f-8e32-4688-b3ec-a6baef3bbe2d`; Faja L also maps to that L item.
- POS-2026-00098 ticket `6284d37e-a942-4f96-a27f-67ef4381860e`, physical product line `344b74e4-c9bf-46c2-b5f1-8fc063038d28`, correctly records Faja M quantity 1, total 0 (discounted package inclusion). Its live POS issue STE-2026-00578 `0e54f2e3-eb62-4a79-80be-95151bdb481a` records L quantity 1. A zero price does not remove a physical fulfillment's stock obligation.
- Intended M stock item `941382a8-fbdb-472d-97cc-77407ac2d8fe` exists with stored quantity 19 at the snapshot; L quantity 8. This one case's potential stock-only correction is +1 L / −1 M, conditional on delivery/true-up and valuation approval. It does not justify forcing the meeting's M=17 physical claim or another arbitrary L count.

Source `stock.service.ts:1227–1314` shows `setConsumption` upserts a product/item unique key and `deleteConsumption` removes a mapping, each in its own transaction; calling them in succession is not an atomic replacement. A guarded mapping-only script must lock and compare the exact current same-org M recipe and atomically replace the wrong item with the verified M item, refusing an unexpected preexisting M mapping/component/bridge or changed quantity. It must retain before-image/audit/operation identity and no-op when exact desired state is already present; no temporary both-item or no-item committed state. Existing readers see an old or new committed recipe, never an intermediate combination. Concurrent sales crossing the cutover need a documented operational boundary and a post-cutover census for the old mapping; a mapping-row lock alone does not serialize POS readers that do not lock it.

Historical stock-only repost can be evaluated after mapping correction: `previewTicketRepost` must show old L quantity 1 → new M quantity 1 with no other drift; explicit `allowedItemIds={L}` and `allowIncreaseItemIds={M}` may authorize the existing repost invariant. Do not call product swap: the ticket product is already M. Existing repost spans claim/cancel/post, so fault recovery, expected-state rechecks and old-entry cancellation must be rehearsed before approval. F3 owns the general workflow; this exact case remains under F1's manifest gate.

## Decision 1: diagnose before choosing further prevention mechanisms

**Decision**: First PR implements a bounded read-only evidence report with explicit case classification. The verified M→L mapping has a specific gated mapping correction design above. No global ownership schema or timing rewrite is prescribed without a separately isolated defect and local reproduction.

**Rationale**: Both service-timing prevention and a historical repair already exist in this baseline. Blindly repeating them risks reversing valid products or corrections already absorbed into inventory true-ups.

**Alternatives considered**: Blanket suppress stock at payment (reject: counter products and bundles); unconditional source dedup (reject: independent valid fulfillment can share items); forced physical target adjustment (reject: count/date/variant unclear).

## Decision 2: preserve provenance before aggregation

**Decision**: Canonical diagnostic units are org + fulfillment link + item + warehouse; ledger sums occur once per ledger row ID. Join tables and grouped bookings attach provenance but must not multiply ticket-level issue quantities. Query overlap only supplies candidates.

**Rationale**: One sale may link several bookings; the existing snapshot repeats a ticket/item aggregate on multiple booking rows. A shared recipe item is not sufficient proof of duplicate fulfillment.

**Alternatives considered**: Sum cross-source candidate quantities (reject: multiplicative joins); assign a whole ticket issue to each booking (reject: over-attribution). Unattributable allocation is unresolved, not inferred.

## Decision 3: separate issue recovery from historical correction

**Decision**: Missing realization first checks warnings, source-stamped drafts, ledger and confirmed consumption. Duplicate repair first checks prior true-ups, mappings, cancellations and previous spec120 script results. Display-only cases produce a referral to F5 with zero inventory change.

**Rationale**: Retrying with a new line payload does not update an existing draft. A present-day cancel/reissue can affect quantity and valuation differently from a historical revaluation.

**Alternatives considered**: Retry every completed appointment (reject: empty confirmation/old corrections); rerun all invoice backfills (reject: duplicate incorporation); use `rebuildBins` to fix ledger (reject: copies existing snapshots only).

## Decision 4: gated repair plan with authoritative recovery

**Decision**: A later repair design must define exact effect, transaction/lock boundary, before fingerprints, named actor/reason, compensating undo in `finally` on disposable QA, unknown-commit read reconciliation, repeat no-op, and post-apply evidence. Owner approves spec, exact manifest/target and merge. Restoration of business truth is a compensating action; deleting append-only ledger rows is forbidden under the normal application role.

**Rationale**: Current stock calls span transactions and post-commit audit; they cannot be assumed to form an atomic overall correction. Spec Kit constitution V requires explicit data gates, dry-run default, reversibility and repeat invariants.

**Alternatives considered**: Claim current script covers every case (reject: limited candidate scope); unattended apply from names (reject: ambiguity and scope risk).

## Discovery outputs still pending

1. The November 3 garment has a stable sale/stock variant mismatch through the focused read; complete its delivery/group/reschedule/true-up timeline before historical repair. The initial attendee-name match failure is not evidence that no booking existed.
2. Deduplicated ticket-line ownership and exact intended fulfillment for the seven overlap rows; catalog/component/package/redemption history and approved true-ups.
3. Month/year/reason of the day-22 adjustment, validated physical M/L count and observed stock UOM.
4. Deployed and historical source identity; prior repair/true-up/backfill coverage and original recipe state.
5. Whether any additional code-level prevention is needed beyond correcting the proven M→L mapping. If none is proven, report that result; do not manufacture a timing patch.
6. Owner approval and accounting-period/valuation policy for an exact historical repair. No date cutoff is assumed.

These are investigation deliverables with fail-closed behavior, not unspecified requirements. The selected known-garment correction contract is contracts/repair.md. Fresh case-specific evidence and exact owner apply approval remain prerequisites; additional unproven service failures do not authorize a guessed writer.

## Later garment population evidence

The bounded garment population read and its conditional M/L arithmetic are stated once in [spec.md](spec.md), section Later garment population evidence.

## Existing field-tier source boundary

Pinned `src/lib/permissions.ts:128` restricts FIELD_LEVEL_MODULES to crm/finance/scheduling; `src/server/services/rbac.service.ts:217` defaults stock to 0 and its role-override path also keeps stock field tier 0. Cost-bearing operational reports/corrections use the existing finance:view and finance sensitive tier, with enabled finances and the existing stock/POS gates; quantity-only stock evidence does not invent a stock tier. Qualify actual ordinary-owner/custom-role admission and finance denial cases before delivery.
