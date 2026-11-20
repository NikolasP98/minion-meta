# Data model: spec 135

Two hub migrations. Tables follow the stock conventions (`src/server/db/pg-schema/stock.ts`): `org_id text`, forced RLS on `app.current_org_id`, grants to `app_ledger`, a Drizzle mirror in `pg-schema/stock.ts`. Spec 124's `20261116193000_stock_corrections.sql` is the template for checks, same-org foreign keys and grants.

## Migration 1 — `20261120120000_stock_checkpoints.sql` (135-S1)

### `stk_entries.physical_at` (new column)

```sql
alter table public.stk_entries add column if not exists physical_at timestamptz;
```

- **Meaning**: when the movement happened on the shelf, if that differs from when it was posted.
- **Written once** by `submitEntryInTx` when the caller passes `physicalAt`:

  | Caller | Value |
  |---|---|
  | appointment completion | booking `start_time` |
  | till sale | ticket `submitted_at` |
  | count adjustment | the count's `counted_at` |
  | backfill | STE-2026-00694 gets `2026-11-18 16:00 America/Lima` |

- **Null** for all history and for "now" postings. Readers use `coalesce(physical_at, posted_at)`.
- No index. It is read by primary-key join from the ledger.

### `stk_counts` (count header)

| Column | Type | Rule |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `org_id` | text not null | RLS |
| `human_id` | text not null | naming series `CNT-.YYYY.-` (`nextSerialId`), stamped at creation, e.g. `CNT-2026-00001` |
| `warehouse_id` | uuid not null | same-org FK → `stk_warehouses` |
| `counted_at` | timestamptz not null | when the shelf was counted; not in the future |
| `status` | text not null default `'draft'` | check `in ('draft','locked')` |
| `note` | text | optional |
| `created_by` | uuid not null | profile id (plain uuid, like `stk_corrections.actor_id`) |
| `locked_by` | uuid | set at lock |
| `locked_at` | timestamptz | set at lock |
| `adjustment_entry_id` | uuid | same-org FK → `stk_entries (org_id, id)`; null when no line had a difference |
| `metadata` | jsonb not null default `'{}'` | provenance, e.g. `{ "backfillOf": "<entry id>" }` |
| `created_at`, `updated_at` | timestamptz not null default now() | |

Checks:
- `status = 'locked'` ⇒ `locked_by` and `locked_at` are not null.
- `status = 'draft'` ⇒ both are null.

Indexes:
- `unique (org_id, id)`, for composite FKs.
- `(org_id, warehouse_id, status, counted_at desc)`.
- `unique (org_id, adjustment_entry_id) where adjustment_entry_id is not null`: one entry backs at most one count.

### `stk_count_lines` (count line; a line of a locked count is a checkpoint)

| Column | Type | Rule |
|---|---|---|
| `id` | uuid pk | |
| `org_id` | text not null | |
| `count_id` | uuid not null | FK `(org_id, count_id)` → `stk_counts (org_id, id)` `on delete cascade` (only drafts can be deleted, see trigger) |
| `item_id` | uuid not null | FK → `stk_items` |
| `counted_qty` | numeric | null while the draft is being typed; required to lock; ≥ 0 |
| `system_qty` | numeric | null in a draft; at lock, `systemQtyAt(counted_at)` (research R3) |
| `note` | text | optional ("aprox") |
| `prev_line_id` | uuid | FK → `stk_count_lines (id)`; the previous checkpoint of the same item and warehouse, set at lock |
| `created_at`, `updated_at` | timestamptz | |

Indexes:
- `unique (count_id, item_id)`.
- `(org_id, item_id)`: the checkpoint lookup joins to `stk_counts` by `count_id`.

Derived (not stored):
- `difference = counted_qty − system_qty`.
- The quantity the adjustment actually posted for the item = the sum of its ledger rows for `adjustment_entry_id`.
- For a normal lock, the two are equal. For the backfill they are equal unless the script was run with `--accept-mismatch` (research R8).

### `stk_checkpoint_skips` (append-only)

| Column | Type | Rule |
|---|---|---|
| `id` | bigserial pk | append order |
| `org_id` | text not null | |
| `count_line_id` | uuid not null | FK → `stk_count_lines`; the checkpoint that absorbed the movement |
| `entry_id` | uuid not null | same-org FK → `stk_entries`; the movement that skipped |
| `entry_line_id` | uuid | the entry line, for submit skips; null for cancel skips (cancel replays ledger rows, not lines) |
| `item_id`, `warehouse_id` | uuid not null | |
| `qty_delta` | numeric not null | signed quantity that did **not** move (issue −6 ⇒ −6; cancel of it ⇒ +6) |
| `phase` | text not null | check `in ('submit','cancel')` |
| `physical_at` | timestamptz not null | the movement's physical time |
| `created_at` | timestamptz not null default now() | when the skip was posted |

Indexes:
- `(org_id, entry_id)` for movement views.
- `(org_id, item_id, created_at)` for the item page.

Grants: `select, insert` only to `app_ledger`, as for `stk_corrections`.

### Immutability trigger

`stk_counts_guard()`, `before update or delete` on `stk_counts`:
- When `OLD.status = 'locked'`, raise `count_locked`.
- `draft → locked` is an update of a draft row, so it is allowed.

`stk_count_lines_guard()`, `before insert or update or delete` on `stk_count_lines`:
- When the parent count is locked, raise `count_locked`.
- Order of operations in the lock transaction: fill the lines first, then flip the header. So the line updates happen while the parent is still a draft.

RLS: `select, insert, update, delete` policies on `org_id = current_setting('app.current_org_id', true)` for `stk_counts` and `stk_count_lines`; `select, insert` for `stk_checkpoint_skips`.

## Migration 2 — `20261120130000_stock_settings.sql` (135-S4)

### `stk_settings`

| Column | Type | Rule |
|---|---|---|
| `org_id` | text pk | |
| `count_interval_days` | integer | null = reminders off; check `between 1 and 365` |
| `updated_at` | timestamptz not null default now() | |

- No row means a 30-day interval. The row is written only when someone changes the setting.
- This is a new table because no stock settings exist today: `app_modules` holds only `enabled` (`pg-modules-schema.ts:4-13`).

## Status sets

| Object | Values | Final |
|---|---|---|
| Count | `draft`, `locked` | `locked` (immutable) |
| Count line | (follows its count) | a line of a locked count = checkpoint |
| Skip | (no status) | append-only |
| Entry | unchanged: `draft`, `submitted`, `cancelled` | an entry whose legs were all skipped is `submitted` with zero ledger rows |

Transitions:

| From | Event | To | Effects |
|---|---|---|---|
| — | "Nuevo conteo" (`stock:create`) | `draft` | `human_id` stamped; lines for the chosen items, `counted_qty` null |
| `draft` | edit (`stock:create`) | `draft` | counted time, lines, notes |
| `draft` | "Descartar borrador" (`stock:create`) | deleted | lines cascade |
| `draft` | "Validar y bloquear" (owner/admin) | `locked` | one adjustment for non-zero lines; `system_qty`, `prev_line_id` on every line; `locked_by/at`, `adjustment_entry_id` |
| `locked` | any edit or delete | refused | trigger + service (`count_locked`) |
| entry = a locked count's adjustment | cancel | refused | `count_adjustment` |

## The lock rule in data terms

For a leg of `(item, warehouse)` with physical time `p`:

```text
cp = latest stk_count_lines l join stk_counts c
     where c.status = 'locked' and l.item_id = item and c.warehouse_id = warehouse
     order by c.counted_at desc limit 1
skip ⇔ cp exists and cp.counted_at >= p
```

On skip:
- no `stk_ledger` row;
- no bin change;
- one `stk_checkpoint_skips` row.

On no skip: today's behavior, unchanged.

## What later drift analysis can use (not built now)

- Per item and warehouse, the checkpoint chain (`prev_line_id`), with `counted_qty` and `system_qty` at each link.
- Every movement between two links, with its physical time (`coalesce(physical_at, posted_at)`) and its source (`stk_entries.metadata.source`: `booking`, `pos`, receipt, …).
- Every skipped quantity, with the checkpoint that absorbed it.

So `counted(n) − counted(n−1)` breaks down into movements by source plus unexplained loss or gain, which is what the owner's ML note needs.
