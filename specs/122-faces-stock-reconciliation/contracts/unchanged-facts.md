# Exact mapping-only unchanged-facts fingerprint

This defines `MappingManifestV1.unchangedStockPaymentSha256` and its before/after invariant. It is a bounded affected-source fingerprint plus a writer-boundary assertion, not a claim that every unrelated organization record was inventoried or frozen.

## Fixed key-set derivation in the owning transaction

Start with the exact M/L product IDs and old/new stock item IDs already validated by `MappingState`; each set has 2 distinct same-org UUIDs. Collect every same-org `stk_bins` key for those item IDs and every same-org `stk_ledger` row for those items, including keys that exist only in ledger and negative/reversal rows; a bin/latest-ledger mismatch is an integrity failure, not omitted evidence. Collect every entry ID referenced by that ledger and every line of those entries, not merely lines for the changed pair. Each entry's source is decoded only by `decodeStockEntrySource` in [source-explanation.md](source-explanation.md), section Stock entry source decoder, never from arbitrary metadata text. If any collected entry decodes to `{kind: 'unknown'}`, the key set is incomplete and preview returns blocked `incomplete_evidence` with no executable preview; apply refuses.

Ticket IDs are the union of decoded `pos` source IDs of those entries, exact census POS source IDs and all same-org `pos_ticket_lines` whose `fin_product_id` is either admitted product. Booking IDs are the union of decoded `booking` source IDs, census booking IDs and non-null `booking_id` on those admitted ticket lines. Expand only through `pos_ticket_lines.booking_id` in the admitted booking IDs, joining `pos_ticket_lines.ticket_id = pos_tickets.id` with both `org_id` predicates; no name/date/amount guessing. All involved ticket lines are included. Invoice IDs are the union of decoded `invoice` source IDs, non-null `invoice_id` on those bookings and every same-org `fin_invoices` row matching a nonempty involved `ticket.invoice_provider_ref` by exact `provider_ref` bytes, keeping ambiguous/provider duplicates in the set rather than choosing one. Decoded `service`, `purchase`, `manual_reconciliation` and `none` sources add no family expansion; their entry and line rows are still hashed. A foreign or broken typed reference is integrity/unavailable, never silently empty. No recursive whole-organization graph expansion beyond these explicit families.

Bounds: at most 1,000 distinct entries, tickets, bookings and invoices per family; 1,000 item/warehouse keys; 50,000 ledger rows; 10,000 rows per remaining selected table; and 20,971,520 UTF-8 bytes of source row JSON in aggregate across all selected rows. Scan limit+1; overflow, timeouts, missing schema or inconsistent references fail incomplete before executable preview or any mapping mutation. These are chosen limits, not performance claims. Reuse the F1 snapshot budget in [report.md](report.md) (60 s total, 12 s statement, 1 s lock). The same complete key predicates apply to count, hash, materialization and apply's fresh comparison; no capped list wrapper or post-hash row omission.

## Exact table, row identity and field projection

The closed unchanged set is:

| Table | Exact admitted rows | Canonical key tuple |
|---|---|---|
| fin_products | the two approved M/L product UUIDs | [id] |
| stk_items | the two old/new approved stock item UUIDs | [id] |
| stk_bins | union affected item/warehouse keys, including absent-key witness in scope | [item_id,warehouse_id] |
| stk_ledger | all ledger rows for the two item IDs, not only latest | [id::text] (see [data-model.md](../data-model.md), Ledger identity) |
| stk_entries | every affected ledger entry ID | [id] |
| stk_entry_lines | all lines of those entries | [id] |
| pos_tickets | exact expanded ticket IDs | [id] |
| pos_ticket_lines | all lines on expanded ticket IDs | [id] |
| pos_payments | all rows with ticket_id in expanded ticket IDs | [id] |
| sched_bookings | exact expanded booking IDs | [id] |
| stk_accruals | source='booking'/source_id in booking IDs or realized_entry_id in affected entry IDs | [id] |
| fin_invoices | exact expanded invoice IDs | [id] |
| fin_invoice_items | invoice_id in expanded invoice IDs | [id] |
| fin_payments | invoice_id in expanded invoice IDs | [id] |
| pos_client_ledger | ticket_id in ticket IDs or booking_id in booking IDs | [id] |

Every predicate also has `org_id = ctx.tenantId`, and joins assert the same org on both sides. A row reached by more than one path is included once, by (table, key); contradictory identities or hash values are an integrity failure. All source columns participate in that row's hash, including nullable values, numeric spelling, timestamps, metadata and lifecycle/payment fields; do not select a developer-chosen subset that could omit a payment or stamp change.

`sched_booking_status_log` is deliberately outside this set: every pinned status-log insert (`scheduling-bookings.service.ts:577,1117`) happens in the same transaction as an insert or status/`updated_at` update of the `sched_bookings` row, which is already hashed. The diagnostic still reads the log as source evidence ([source-explanation.md](source-explanation.md)).

Compute `rowSha256` inside PostgreSQL as lowercase hex `SHA256(convert_to(to_jsonb(the_actual_row)::text, 'UTF8'))`, under `SET LOCAL TIME ZONE UTC`, with the qualified builtin `sha256(bytea)`. First count `octet_length` of that same row expression under the same scope and budget. Do not send raw financial/customer JSON to the CLI to compute this hash: query only the canonical key and row digest. The field projection is PostgreSQL's `to_jsonb(row)` over all source columns, not a re-emitted JavaScript object. Source schema and candidate identity are qualified and manifest-bound; a new source column changes the row hash rather than being silently excluded. No arbitrary caller relation or SQL path is accepted.

The mapping-only mutable tables `stk_consumption`, `stk_corrections` and `doc_audit_log` are deliberately outside this unchanged set: their exact admitted mapping diff, operation and audit are separate reviewed effects. The mapping writer performs no ledger, bin, payment or source-record UPDATE/INSERT/DELETE. Assert that the SQL writer trace contains only the one recipe delete plus new insert, one completed correction insert and one audit insert, with no stock event. This guards against a side effect outside the bounded unchanged set without pretending unrelated records were hashed.

## Hash preimage and comparison

`unchangedStockPaymentSha256 = SHA256(canonical UTF-8 {schemaVersion: 1, orgId, scope: {productIds, itemIds, binKeys, entryIds, ticketIds, bookingIds, invoiceIds}, tables: [{table, rows: [{key, rowSha256}]}]})`. Object keys follow F3 sorted-key canonical JSON; the table array, UUID sets and key sets sort lexicographically, and ledger keys sort numerically as `BigInt` ascending, never as `Number` or lexicographic strings. Empty table arrays are explicit; absence witnesses include bin keys with no bin row, so an inserted key changes the set. Identical reached rows are included once. Intermediate row lists are bounded internal evidence, not manifest fields; the manifest stores only the final digest.

Preview computes this in its own repeatable-read, read-only snapshot. Apply recomputes the complete key sets and hash after its stock-v1 gate, policy-coordinator gate, source and authority admission ([report.md](report.md), Gate terms) and requires exact equality to the approved manifest before mutation; it then recomputes after the selected recipe, receipt and audit writes and requires equality before commit. Both correct and compensate enforce this invariant. A difference or a new/missing row aborts the whole mapping operation. Numeric diagnostic tolerances never compare these hashes. The digest proves those admitted source facts, while the no-other-DML test proves this writer did not mutate unrelated facts; it does not assert that all concurrent unrelated organization payments were frozen.

## Tests

Tests in the existing pure, owning-service and eight native behavior files cover: duplicate provenance paths counted once; absent-bin witness; ledger-only/bin-only mismatch; extra same-ticket non-garment line; changed payment `amount`, `method`, `tendered`, `paid_at`, `shift_id` or `metadata`; ticket financial/stamp change; booking date/status; accrual quantity/value; invoice/provider duplicate path; decoded invoice-source entry; source metadata change; an affected entry whose metadata decodes to `unknown` (blocked preview); all limit+1 boundaries; ledger IDs above `Number.MAX_SAFE_INTEGER`; and forbidden DML outside the admitted set. Each relevant change produces a different digest or an explicit incomplete/integrity outcome. Correct plus inverse mapping keeps this digest identical within each operation even though new operation, audit and recipe identities change.

Schema regression uses the pinned `pg-pos-schema.ts` column `fin_product_id` and table `fin_invoices` (plural): an M/L sale with no linked ledger entry is still reached through that product column, and its ticket, all lines and payments enter the digest. Duplicate provider paths include all same-org invoice matches once. `product_id` is not a `pos_ticket_lines` column.
