# API and server contracts: spec 135

Routes live under `/api/stock` (module gate `stock`). Refusals are `StockError(message, code, details?)` mapped by `src/routes/api/stock/_errors.ts`. The body is `{ message, code, details }`. The UI turns `code` + `details` into a Spanish sentence with a next step (`src/lib/components/stock/count-refusals.ts`, pattern `correction-refusals.ts`).

## Server functions

### `checkpointFor` (135-S1, the contract with spec 134)

```ts
// src/server/services/stock-checkpoints.ts
export async function checkpointFor(
  tx: CoreTx,
  orgId: string,
  itemId: string,
  warehouseId: string,
  physicalTime: Date,
): Promise<{ countId: string; countedAt: Date } | null>;
```

- Returns the latest **locked** checkpoint of the item in the warehouse when its `countedAt >= physicalTime`; otherwise `null`.
- Read-only. It takes no lock. Callers that act on the answer must already hold the stock gate (`lockStockWrite`), as the posting path does.
- Spec 134 calls only this. A display that needs the human id or date reads `stk_counts` by `countId`.

### Internal helpers (same module)

```ts
checkpointsForBins(tx, orgId, binKeys: Iterable<string>, physicalTime: Date)
  : Promise<Map<string /* itemId:warehouseId */, { countId: string; countLineId: string; countedAt: Date }>>;

systemQtyAt(tx, orgId, warehouseId, itemIds: string[], at: Date, opts?: { excludeEntryId?: string })
  : Promise<Map<string /* itemId */, number>>;   // Σ qty_delta where coalesce(e.physical_at, e.posted_at) <= at

recordSkips(tx, orgId, rows: SkipRow[]): Promise<void>;
```

### Posting options (135-S1; S3 widens the callers)

```ts
export interface StockPostingOptions {
  readonly entryId?: string;
  readonly postedAt?: Date;          // unchanged; S3: refused with before_checkpoint when a checkpoint covers it
  readonly bins?: LockedBins;
  /** When the movement happened on the shelf. Stamped on the entry; legs covered by a checkpoint are skipped. */
  readonly physicalAt?: Date;
  /** Caller guarantees zero net quantity per counted bin (rate-only receipt fix) or is the count's own adjustment. */
  readonly ignoreCheckpoints?: boolean;
}
```

Behavior:

| Function | Physical time used | Skip |
|---|---|---|
| `submitEntryInTx` | `options.physicalAt` (none = now = never skipped) | per leg, unless `ignoreCheckpoints` |
| `cancelEntryInTx` (S3) | the original entry's `coalesce(physical_at, posted_at)` | per ledger row, unless `ignoreCheckpoints` |
| `cancelEntryInTx` (S1) | — | refuses `count_adjustment` when the entry is a locked count's adjustment |
| `realizeAccrualsInTx` (S1) | for `source = 'booking'`: the booking's `start_time` | via submit |
| `postTicketStockInTx` (S3) | ticket `submitted_at` | via submit |
| `applySaleVariantPlanInTx` (S3) | the live entry's physical time, for the cancel (automatic) and the replacement (passed) | via submit/cancel |
| `applyStockCorrection` `receipt_replace` (S3) | — | qty change on a counted bin → `before_checkpoint`; rate-only → `ignoreCheckpoints` on both legs |

### `lockCount` (135-S2)

```ts
lockCount(ctx: CoreCtx, countId: string, actor: Actor, input: { rates?: Record<string, number> })
  : Promise<{ count: StockCount; adjustmentEntryId: string | null }>;
```

One transaction. Steps: research R5. Authority: research R6.

## Routes

### `GET /api/stock/accruals` (135-S1, extended)

When `source=booking&sourceId=<id>` is given, each row gains:

```jsonc
{ /* …existing accrual row */ "checkpoint": { "countId": "uuid", "humanId": "CNT-2026-00001", "countedAt": "2026-11-18T21:00:00.000Z" } | null }
```

- Computed with the booking's `start_time` and the accrual's warehouse.
- Otherwise `checkpoint` is absent.
- `ConsumptionConfirmDialog` shows the note for non-null rows and leaves them out of the editable lines.
- If a client still sends a counted item in `lines`, the server skips it anyway.

### `POST /api/scheduling/bookings/[id]/complete` and the other completion routes (135-S1)

The request is unchanged. The response is unchanged: `{ ok, entryId, stockWarning }`. `entryId` may be an entry whose counted lines were skipped, or whose lines were all skipped (zero ledger rows).

### `GET /api/stock/counts` (S2)

Query: `status=draft|locked`, `warehouseId`. Response:

```jsonc
{ "counts": [ { "id": "uuid", "humanId": "CNT-2026-00002", "status": "draft", "warehouseId": "uuid", "warehouseName": "Almacén Principal",
                "countedAt": "…", "items": 12, "totalDifference": -20, "createdBy": "uuid", "lockedBy": null, "lockedAt": null } ] }
```

`totalDifference` is live for drafts and stored for locked counts.

### `POST /api/stock/counts` (S2, gate `stock:create`)

```jsonc
{ "warehouseId": "uuid", "countedAt": "2026-12-01T13:00:00.000Z" /* optional, default now */,
  "items": { "kind": "stocked" } | { "kind": "ids", "itemIds": ["uuid"] } | { "kind": "due" } }
```

- `stocked` = active stock items with a non-zero bin in that warehouse.
- `due` = the items that "Conteo pendiente" lists (S4).

Response `201 { count }`. Refusals: `warehouse_archived`, `item_not_stocked`, `counted_at_future`, `count_empty`.

### `GET /api/stock/counts/[id]` (S2)

```jsonc
{ "count": { /* header */ },
  "lines": [ { "id": "uuid", "itemId": "uuid", "itemName": "Acido Desoxicolico", "uom": "ml",
               "systemQty": 302, "countedQty": 300, "difference": -2, "note": null,
               "previous": { "countId": "uuid", "humanId": "CNT-2026-00001", "countedAt": "…", "countedQty": 302 } | null } ],
  "canLock": true }
```

- For a draft, `systemQty` is computed live at `countedAt` (`systemQtyAt`).
- `canLock` is the server's owner/admin answer, used to enable the button.

### `PATCH /api/stock/counts/[id]` (S2, gate `stock:create`)

```jsonc
{ "countedAt": "…", "note": "…",
  "lines": [ { "itemId": "uuid", "countedQty": 300 | null, "note": "aprox" } ],
  "removeItemIds": ["uuid"] }
```

All fields are optional. Refusals: `count_locked`, `counted_at_future`, `item_not_stocked`.

### `DELETE /api/stock/counts/[id]` (S2, gate `stock:create`)

Deletes a draft. Refusal: `count_locked`.

### `POST /api/stock/counts/[id]/lock` (S2, central gate `stock:create`; the service requires owner/admin)

```jsonc
{ "rates": { "<itemId>": 77.06 } /* optional, only for found stock of an item with no cost history */ }
```

Response `200 { count, adjustmentEntryId }`. Locking an already locked count returns `count_locked`. A client should re-read the count; there is no silent replay.

### `GET /api/stock/items/[id]/checkpoints` (S3)

```jsonc
{ "checkpoints": [ { "countId": "uuid", "humanId": "CNT-2026-00001", "warehouseId": "uuid", "countedAt": "…", "countedQty": 302, "systemQty": 302, "lockedBy": "uuid", "lockedByName": "…", "lockedAt": "…" } ],
  "skips": [ { "entryId": "uuid", "entryHumanId": "STE-2026-00731", "warehouseId": "uuid", "qtyDelta": -6, "phase": "submit", "physicalAt": "…", "createdAt": "…", "countId": "uuid", "humanId": "CNT-2026-00001", "countedAt": "…" } ] }
```

The item page merges both into its movement list by time. The ledger cursor (`stock-entries-read.service.ts:663`) is not changed.

### `GET /api/stock/entries/[id]` and the entry page (S3)

Each line gains `skip: { countId, humanId, countedAt, qtyDelta } | null`.

### `GET /api/pos/tickets/[id]` (S3)

The response gains:

```jsonc
"stockCounted": [ { "itemId": "uuid", "itemName": "…", "countId": "uuid", "humanId": "CNT-…", "countedAt": "…" } ]
```

These are the items of the sale's live movement that a void would not return. It is `[]` when there are none.

### `GET /api/stock/settings`, `PATCH /api/stock/settings` (S4, PATCH gate `stock:manage`)

```jsonc
{ "countIntervalDays": 30 | null }
```

## Write gates (`apiWriteCapability`, `rbac.service.ts:1003`)

| Method + path | Gate |
|---|---|
| `POST /api/stock/counts` | `stock:create` (add to `CREATE_COLLECTION_ENDPOINTS`) |
| `PATCH`/`DELETE /api/stock/counts/<uuid>` | `stock:create` (explicit rule: drafts belong to whoever may count, FR-001; the default would be `stock:edit`/`stock:delete`) |
| `POST /api/stock/counts/<uuid>/lock` | `stock:create`; the service then requires owner/admin |
| `PATCH /api/stock/settings` | `stock:manage` (explicit rule) |

## Refusal codes

| code | HTTP | message (es), always with the next step |
|---|---|---|
| `owner_or_admin_required` | 403 | Solo el dueño o un administrador puede bloquear un conteo. El borrador queda guardado para que lo revisen. |
| `count_locked` | 409 | Este conteo ya está bloqueado y no se puede cambiar. Para corregirlo, haz un nuevo conteo. |
| `count_incomplete` | 422 | Faltan cantidades en {n} ítems. Escríbelas o quita esos ítems del conteo. |
| `count_empty` | 422 | Agrega al menos un ítem para contar. |
| `counted_at_future` | 422 | La hora del conteo no puede ser futura. Usa la hora en que contaste. |
| `count_superseded` | 409 | Ya hay un conteo más reciente de {item} ({fecha}, {CNT}). Usa una hora posterior o quita ese ítem. |
| `item_not_stocked` | 422 | {item} no lleva control de stock, así que no se cuenta. Quítalo del conteo. |
| `rate_required` | 422 | {item} no tiene costo registrado. Indica el costo unitario para registrar lo que sobra. |
| `negative_stock` | 409 | Con este conteo, {item} quedaría en negativo por movimientos posteriores. Revisa el conteo o esos movimientos. |
| `count_adjustment` | 409 | Este movimiento es el ajuste del conteo {CNT}. Para corregirlo, haz un nuevo conteo. |
| `before_checkpoint` (backdated posting) | 409 | Esta fecha es anterior al conteo del {fecha} ({CNT}). Registra el movimiento con la fecha de hoy. |
| `before_checkpoint` (receipt correction) | 409 | La cantidad de esta compra ya quedó contada el {fecha} ({CNT}). Corrige solo el costo, o registra la diferencia con un nuevo conteo. |
| `warehouse_archived` | 409 | (existing) |

## User-facing notes (not refusals)

| Where | Text (es) |
|---|---|
| Completion dialog, counted supply | Contado el {fecha hora}: no descuenta {item}. |
| Entry line / item movement, skipped | No mueve stock: contado el {fecha hora} ({CNT}). |
| Void dialog | No vuelve al stock: {items} (contado el {fecha hora}). Si el cliente devolvió el producto, regístralo como una entrada nueva. [Registrar entrada] |
| Item movement, checkpoint row | Contado · {qty} {uom} · {fecha hora} · bloqueado por {nombre} |
| Lock button disabled | Solo el dueño o un administrador puede bloquear un conteo. |

Dates are shown in the org's time zone (`fin_settings.timezone`, default `America/Lima`, `pg-finance-schema.ts:275`).

## Inbox kinds (S4)

| kind | scope | title | href | resolves |
|---|---|---|---|---|
| `stock.count_due` | role, `stock:create` | Conteo pendiente · {almacén} · {n} ítems | `/stock/counts?nuevo=1&almacen={id}&pendientes=1` | n = 0 or interval off |
| `stock.count_unlocked` | user, each owner/admin | Conteo por validar · {CNT} · {almacén} | `/stock/counts/{id}` | locked or deleted |
