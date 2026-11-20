# Data model: Readable stock movements

Derived MovementLabel: entryId, entryCode, movementKind, itemLabels[{itemId,name,code}], exact stored stock quantities plus separately identified current item unit context for ledger rows; entry lines retain their recorded quantity/UOM, optional source{kind,label,href}, optional counterpartyLabel. Multiple line quantities are never summed across different UOM. Source and counterparty are optional authorized projections, never new canonical columns. Existing stk_entries, stk_entry_lines and stk_ledger remain unchanged. Item summary presents one item plus N additional items; searchable labels include all permitted items. No schema migration or historical rewrite.

## Validation and lifecycle

All existing validation, enum and permission rules remain binding. No source record is manufactured from display text. Apply read-only projection tests and explicit no-op/stop outcomes before any write. Refer to contracts/behavior.md for forbidden states and quickstart.md for real-database proof. A proposed shape is not a claim of existing persisted schema.

Derived movement responses are the exact surface/projection-discriminated union in contracts/wire.md: full, base_values_only, identity_only. Numeric fields are exact strings only where present; identity-only omits them and never substitutes zero. Every ledger variant carries ledgerId as a PostgreSQL bigint decimal string and keys rows by it, not shared entryId. Cursor/key/byte-cap rules remain surface-specific.


The fixed raw server page/cursor and the global entries local PageBody view state are distinct. Local state uses the existing DataTable search/sort/filters/advanced bindings; every local operation is current-page only. Preserve same-scope controls across explicit Older/Newest navigation, reset selection/expansion per raw page and transient controls on org/account/party/item change. Cursors come exclusively from the raw result, never local filtered/sorted rows. Current-page emptiness is not whole-history absence. No new persisted preference schema or server sort/filter field is introduced.


Per-surface controls are defined in [wire.md, Surface-specific controls](contracts/wire.md#surface-specific-controls-and-url-rules). Reload/back retains the URL cursor, while explicit Newest clears it. All row/field/dictionary shapes and disabled-control/export behavior per capacity variant are exhaustive in wire.md; no untyped optional-field spread is admitted.


GlobalBase includes both createdAt and nullable postedAt; full EntryLabels includes the existing nullable permitted note under selected-string/output budgets. Full LedgerLabels includes actual same-org movementKind and availability, not a sign inference. `attachmentCount` is read inside the movement snapshot ([admission-snapshot.md](contracts/admission-snapshot.md#attachment-count-inside-the-snapshot)). Full ledger/recent `warehouseName` comes from a page-qualified warehouse batch that includes archived referenced warehouses ([wire.md](contracts/wire.md#exact-variants)). Wire fallbacks explicitly mark omitted note/kind/value fields unavailable and preserve applicable existing column keys.


All source facts and complete label sets come from the snapshot defined in [admission-snapshot.md](contracts/admission-snapshot.md). A projected label adds neither authority nor historical unit evidence.

Exact placement: entries stock.movements has required full-only itemsById/warehousesById dictionaries; item stock.movements and overview stock.recentMovements have inline full-row labels and LedgerStockUnit. The complete union/field keys, fallback omission and label provenance are contracts/wire.md. Ledger has no frozen unit: current item unit is explicitly current, historical unit is not_recorded, and entry-line UOM never relabels historical ledger stock quantities.

warehouseCount is an independently scoped active-only scalar: org_id=ctx.tenantId AND archived_at IS NULL. It preserves the existing transfer gate and is separate from historical page-qualified warehouse label dictionaries, which may include referenced archived warehouses. Neither projection is the authority for the other.

Raw stock valuationRate/valueDelta and entry rate have unverified denomination in this read-only slice. Follow contracts/valuation-display.md for explicit localized display/export semantics; no currency key/provenance schema, conversion or finance-policy expansion is added.
