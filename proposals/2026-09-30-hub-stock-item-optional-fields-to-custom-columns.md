---
id: 2026-09-30-hub-stock-item-optional-fields-to-custom-columns
title: Stock items — MOQ, Group and Reorder qty become custom columns (core schema keeps only what logic reads)
status: draft
created: 2026-09-30
repos: [minion_hub]
tags: [ui, data]
spec: specs/2026-09-28-hub-table-standardization-spec.md
---

# MOQ, Group, Reorder qty → custom columns

Owner request 2026-09-30 (`/stock/items`): "turn the MOQ, Category, Reorder Qty
columns into custom columns; they're not core to the stock module. This means
that a freshly provisioned org won't spawn with these columns. … let me know if
I'm mistaken and without them, a logical mechanism would be broken."

## AS-IS — what reads them (hub master `205ae5f5`)

| Column | Schema (`stk_items`) | Logic that reads it | UI that reads it |
|---|---|---|---|
| Group ("Category" in the ask; the column is labelled **Group**) | `item_group` | none | items table/detail, `StockItemPicker` (column + search text), `StockItemCreateForm`, assistant field catalog, brain corpus indexing |
| Reorder qty | `reorder_qty` | `stk_reorder` notification candidate source (`stock.service.ts` ~1117) **selects** it as the suggested quantity in the low-stock alert row; the alert GATE is `reorder_level` only | items table/detail, brain corpus |
| MOQ | `moq` | none | items table/detail, brain corpus |

Reorder **level** stays core (it is the low-stock gate). Nothing breaks
functionally when the three move; the low-stock alert loses its suggested
quantity unless it reads the custom property.

## TO-BE

1. **Custom-property definitions, not core columns.** The three fields leave
   `TableDef` `stock.items` fields, the items table columns, the item detail
   Overview, the create form, the picker column/search and the assistant
   catalog. They become **seeded custom-property definitions** for orgs that
   already USE them (any non-null value in `stk_items.item_group` /
   `reorder_qty` / `moq`): a migration script (dry-run default, snapshot,
   run-twice-safe, INVARIANT assertion: every non-null source value has an
   equal custom-property value afterwards) creates the definitions (`Group`
   select with the org's distinct values, `Reorder qty` number, `MOQ` number)
   and copies the values through the custom-property value store. A fresh org
   gets none of them.
2. **Schema**: keep the three DB columns for one release (read-only, no writer)
   with a `TODO(handoff)` to drop them in a follow-up migration once the
   backfill is verified in prod; the API schemas stop accepting them.
3. **Low-stock alert**: the candidate source stops selecting `reorder_qty`;
   the alert copy drops the suggested quantity (ledger item: read it from the
   custom property when the notification pipeline can resolve custom values).
4. **Brain corpus**: the three keys leave the indexed field list (custom
   properties are indexed through their own path, if any — verify).

## Verification

- Migration dry-run on the QA stack against seeded items with values; run
  twice; invariant holds; the items table shows the three as custom columns
  with the same values; a fresh QA org has none.
- vitest: `TableDef` no longer lists them; API rejects them; picker search
  without `itemGroup`.

## Implemented

Branch `feat/stock-optional-fields-custom` (hub), pushed to `origin`.

- `5cc6ae6d` — Part 1 (prior agent): core removal (`TableDef`, items UI, create
  form, picker, assistant catalog, brain corpus allowlist, API zod schemas).
  DB columns kept read-only with a `TODO(handoff)`.
- `cdbd69e0` — Part 2: `scripts/stock-optional-fields-to-custom.ts` (dry-run
  default, `--apply` to write) + `scripts/stock-optional-fields-to-custom.test.ts`
  for the pure planning function (`planOrgBackfill`). Per org, creates up to
  three custom-property definitions on `stock.items` (Group = select with the
  org's distinct `item_group` values, Reorder qty / MOQ = number) only for
  orgs with at least one non-null source value, and copies values through
  `createCustomProperty`/`putCustomPropertyValue`/`readCustomPropertyValues`
  (never a raw insert). Idempotent via `templateKey` (`backfill:stock.items:group`
  / `:reorder-qty` / `:moq`) and `effectiveValue` matching. Snapshots affected
  rows to `${TMPDIR:-/tmp}/stock-optional-fields-backfill-<timestamp>.json`
  before writing, and asserts a per-item invariant after apply.
- `013f99a8` — Part 4: Playwright spec
  `tests/e2e/ui-audit/stock-optional-custom.spec.ts` — `/stock/items` shows
  Group/Reorder qty/MOQ as columns with the backfilled values; `/settings/tables`
  no longer lists `itemGroup`/`reorderQty`/`moq` in `stock.items`' core field
  list (custom columns don't surface on that page at all — confirmed by
  reading `+page.svelte`, not assumed).

**Verified against the QA stack** (`127.0.0.1:54422`, `SUPABASE_DB_URL` from
`.env.qa`): seeded `QA-LOW` (Retail / 20 / 5) and `QA-TRK` (Retail / 10 / —)
and `QA-RMC` (Wholesale / — / —) via direct `psql` UPDATE (the seed script
itself sets none of these three columns). Dry-run reported the plan and wrote
nothing; `--apply` created 3 definitions + wrote 6 values, invariant PASS;
a second `--apply` was a no-op (0 written, 6 already-correct), invariant PASS.
E2E spec passed against a throwaway `vite dev` server after the apply run.

**Prod command (owner-run only, never CI):**

```
SUPABASE_DB_URL=<prod pooled/direct URL> bun scripts/stock-optional-fields-to-custom.ts            # dry-run first
SUPABASE_DB_URL=<prod pooled/direct URL> bun scripts/stock-optional-fields-to-custom.ts --apply     # then apply
# re-run --apply once more to confirm idempotency (0 written, all already-correct)
```

**Open ledger items** (also as `TODO(handoff)` comments in-repo):

- `src/server/db/pg-schema/stock.ts` — the three DB columns (`item_group`,
  `reorder_qty`, `moq`) are kept read-only for one release; drop them in a
  follow-up migration once this backfill is verified in prod (pre-existing
  TODO from Part 1, still open).
- Low-stock alert (`stk_reorder` candidate source, `stock.service.ts` ~1117)
  still needs to stop selecting `reorder_qty` and, longer-term, read the
  suggested quantity from the custom property once the notification pipeline
  can resolve custom values — **not done in this slice** (proposal's own
  TO-BE item 3; no code change made here, calling it out explicitly since it
  was in scope of the AS-IS/TO-BE but not in the PART 2-5 task instructions
  given to this agent).
- Brain corpus indexed-field verification (TO-BE item 4) — not re-verified in
  this slice; Part 1's commit message says the allowlist was already updated,
  but this agent did not re-check whether custom properties get indexed
  through their own path.
- The backfill script matches an existing definition to reuse by
  `label + rules.type` (since `listCustomProperties` doesn't expose
  `templateKey`) rather than `templateKey` directly — correct here because
  Group/Reorder qty/MOQ are reserved labels for this backfill, but worth
  hardening if `listCustomProperties` ever exposes `templateKey` cheaply.
