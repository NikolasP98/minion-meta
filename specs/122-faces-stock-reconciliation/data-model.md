# Data model: FACES stock reconciliation

## Existing records and qualified authority prerequisite

F1 adds no discovery-owned table schema. Its first admitted diagnostic depends on F7's qualified authority-bridge function migration; correction storage remains F3-owned.

All identities below carry `orgId`; every join requires both stable ID and equal organization. Customer names are private matching hints and are omitted from committed fixtures/reports.

| Entity / source | Relevant fields and relationships | Validation / interpretation |
| --- | --- | --- |
| POS ticket/line (`src/server/db/pg-pos-schema.ts`; `pos.service.ts`) | Ticket ID, status, stockEntryId, warning, submittedAt; line ID, kind, finProductId, bookingId, redemption link, qty. | One ticket can cover multiple bookings; a ticket-level issue cannot be allocated repeatedly. Never change payment values/dates. Verify actual schema before query authoring. |
| Booking/group/package sources | Booking ID, status, resource ID, start time, product/party/group/reschedule links; booking-product qty; grants/redemptions and reversals. | Same-org stable linkage required; date/name alone cannot authorize repair. Terminal/cancelled/no-show differs from fulfilled. A visit group is the pair (resource ID, `metadata.groupId`), matching `visitMembers`; see [source-explanation.md](contracts/source-explanation.md). |
| `sched_booking_status_log` (`pg-scheduling-schema.ts:291–311`) | bookingId, fromStatus, toStatus, changedBy, changedAt. | Stored status-transition history. A `completed` row dates the status change, not physical delivery. Absence of rows (older bookings) is unknown history, not "no transition". |
| `stk_accruals` (`pg-schema/stock.ts:251–289`) | source/sourceId/item/warehouse, qtyConsumption, qty, estimate, status, realizedEntryId/actuals. | `status` is `open`, `realized` or `released`; uniqueness `(org,source,sourceId,item)`. Open qty is commitment, never actual issue. |
| `stk_entries` / `stk_entry_lines` (`stock.ts:114–169`) | Type/status/humanId/metadata; line item/qty/UOM/rate/warehouses/lineNo. | Type receipt/issue/transfer/adjustment; status draft/submitted/cancelled. Positive qty. Entry provenance is decoded from `metadata` only by the closed stock entry source decoder in [source-explanation.md](contracts/source-explanation.md); source metadata and line ownership must be checked together. |
| `stk_ledger` (`stock.ts:172–198`) | Row ID, entryId, itemId, warehouseId, qtyDelta, valueDelta, qtyAfter, valuationRate. | Append-only. Deduplicate by row ID; order by row ID under the Ledger identity rule below. Include original and reversing rows in net effect. |
| `stk_bins` (`stock.ts:200–211`) | Org/item/warehouse natural key, qty, rate. | Rebuildable latest-ledger cache. Compare full union of ledger keys and bin keys; existing-bin-only left join cannot detect a missing bin. |
| Mapping / components / UOM | Product→item recipe, component DAG, stock/consumption UOM and direct conversion factor. | Current mappings are labelled current, not historical truth. Do not invent a missing conversion. |

## Ledger identity

This rule is normative for every F1 read, hash, manifest and report. A ledger ID is a positive PostgreSQL `bigint` carried as its canonical decimal string and compared as `BigInt`. The existing Drizzle column `stkLedger.id` is declared `bigserial('id', { mode: 'number' })` (`pg-schema/stock.ts:181`), so selecting it through Drizzle returns a JavaScript `number`. F1 code therefore selects ledger IDs only as SQL text, `` sql<string>`${stkLedger.id}::text` `` (or `id::text` in raw SQL), and orders rows with SQL `ORDER BY id` plus `BigInt` comparison in TypeScript. F1 never reads ledger IDs through the bare `stkLedger.id` column, `StkLedgerRow`, `getLedger`/`getRecentLedger`, or `LedgerReplayRow.seq` and the `stock.logic.ts` replay helpers, all of which narrow to `number`.

## Proposed diagnostic report (file contract)

The closed versioned [diagnostic-wire.md](contracts/diagnostic-wire.md) owns exact DiagnosticManifestV1, ReconciliationReport, CaseRow, MovementEvidence, graph, coverage, error and numeric-check fields. Source facts, timeline and projection evidence are in [source-explanation.md](contracts/source-explanation.md).

Correction manifests are not diagnostic output. The mapping correction uses `MappingManifestV1` in [mapping-envelope.md](contracts/mapping-envelope.md). The historical garment correction uses F3's `GarmentManifestV1` in [garment-envelope.md](../124-stock-correction-workflow/contracts/garment-envelope.md), as selected by [repair.md](contracts/repair.md). Neither manifest is issued from an unresolved case. Both store their operation in F3's proposed `stk_corrections` receipt; F1 introduces no additional correction table.

## State and transition rules

- Investigation: `unmatched → ambiguous/matched → classified`; a stale snapshot resets eligibility and requires re-reading.
- Existing expectation: `open → realized` only after confirmed submitted issue evidence; `open → released` on supported cancellation/no-show or confirmed no consumption. Do not resurrect a settled expectation automatically.
- Correction workflow: `proposed → owner_approved → rehearsed → apply_requested → applied/unknown/failed → reconciled`; `unknown` requires authoritative read before another application. No blind retry from a client/network error.
- Code/release: spec draft → independent review → owner spec approval → implementation/independent review → owner merge → deployment proof → affected-record verification. Drafting reaches none of the later states.

## Numeric oracles

Use the exact diagnostic numeric policy below; keep raw database numeric strings and exact decimal aggregation. No formatter output becomes an invariant or fingerprint. A healthy affected key satisfies net signed quantity equals terminal ledger quantity (including opening history), latest ledger qty/rate equals bin qty/rate, and no unexpected item/warehouse or unrelated-org effect. Physical inventory remains a separate dated observation.

## Exact diagnostic numeric policy

Parse finite base-10 database numeric strings into signed BigInt coefficient/scale; reject nonnumeric, NaN/Infinity, invalid exponent or absolute scalar magnitude above 1,000,000,000 as unresolved/ineligible with explicit reason. Ledger IDs follow the Ledger identity rule above. Aggregate canonical signed quantities/values using exact decimal alignment; no rounding each joined row or converting sums through binary floating point. Rate/value arithmetic comparison bounds below are diagnostic compatibility tolerances for the pinned Number-based source, not financial approval thresholds or a change to posting math.

Quantity normalization Q4 is `Q(x) = floor(decimal(x) * 10000 + 0.5)` as a scaled integer (the source `round4` tie direction, including negative half ties). Compare Q4 values exactly, with no relative tolerance; report raw residual and raw strings too. A fixed4 string is the canonical decimal spelling of a Q4 value with exactly four fractional digits (for example `1.0000`). Confirmed fulfillment intent uses normalized stock units and the actual existing conversion policy. Exact fingerprints, operation identities and approved effects compare canonical bytes/decimal strings, never a numeric tolerance.

Scalar rate/value equality admits absolute difference ≤ `1e-8 + 1e-12 * max(abs(a), abs(b))`. For aggregate value conservation, compare exact signed sum to the expected value using ≤ `1e-8 + 1e-12 * max(sum(abs(contribution)), abs(expected))`; compute/serialize the threshold as exact decimal, not a running floating-point error estimate. Require every scalar and aggregate absolute-input sum ≤ 1e9; beyond it is explicitly unsupported/unresolved, not a larger tolerance. No cent rounding is used for these checks. Serialize actual/expected/difference/tolerance and pass/fail for each comparison. This catches quantity-key corruption independently of small value residuals, and a passing diagnostic does not certify an invoice total, physical count or permitted correction cost.

Tests include equality at the declared inclusive tolerance, a decimal unit beyond it, positive/negative quantity half ties, a missing bin, a bin-only key, large cancelling contributions near the admission ceiling and just beyond it, nonfinite input, duplicate joins, the observed ~5.8e-10 arithmetic residual, and ledger IDs above `Number.MAX_SAFE_INTEGER` that keep exact order and digest. A report never uses tolerance to permit changed source fingerprints or unapproved repair effects.
