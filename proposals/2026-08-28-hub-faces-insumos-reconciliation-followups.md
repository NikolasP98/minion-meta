# FACES insumos reconciliation — deferred follow-ups

- **Status**: open
- **Created**: 2026-08-28
- **Repos**: minion_hub
- **Origin**: analyst insumos dataset import (impact report artifact `d5648fa6-399f-4af5-83b6-27dc312b8b55`)

## What was done (2026-08-28, prod)

Phases 1–2 of the approved additive-only plan executed against FACES org
`21e0601b-f632-43fd-8414-d644af4271f4` via
`minion_hub/scripts/faces-insumos-reconcile-2026-08.ts` (dry-run verified, then
`--apply`, single transaction, idempotency-guarded on
`metadata.source='analyst-reconciliation-2026-08'`):

- 25 `stk_consumption` dose corrections + 3 new mappings (AF1/AF2 → 6 ml ácido,
  BC → 1) — measured doses from 1,532 documented sessions.
- `stk_items`: Ácido uom `Caja/400` → `ml`; Hialuronidasa conversion cleared;
  5 supplier parties created and linked (14 items).
- `fin_products.metadata.aliases`: 8 analyst/SUSSI naming variants registered.
- 2 adjustment entries `STE-2026-00303/00304` (17 item legs, posted 2026-08-13)
  landing bins on kardex-verified qty + analyst-verified cost. Inventory value
  S/ 116,168 → S/ 83,652 (verified post-apply, 0 mismatches).
- 14 post-close invoices (14–20 Aug) were backfilled through 14 submitted
  invoice-linked issue entries and 23 ledger rows. The batch realized
  S/ 5,893.67 COGS, left 0 eligible mapped invoices unissued, produced 0
  negative bins, and was verified idempotent on a second `--apply` run.
- Seven HA items were normalized from the legacy `caja / 500 ml` placeholder to
  the workbook-backed smallest stock unit, `Jeringa`. Their previous UOM state
  is retained in `stk_items.metadata.unitNormalization`.
- Rollback assets: `{stk_consumption,stk_items,stk_bins,fin_products}_bak_insumos2608`
  tables in prod + full CSV snapshots at
  `~/.local/share/minion-backups/faces-insumos-2026-08-28/`. Entries are
  cancellable via native `cancelEntry`.

## Open ends

1. **Hub stock is stale by design until ops cutover.** The clinic operates the
   legacy almacén; hub stock froze 2026-07-01 and was trued up to the kardex as
   of 2026-08-13. Without either (a) staff switching to hub stock entries or
   (b) a recurring kardex import tick, drift restarts immediately. Decision
   pending with owner (recommended: recurring import until workflow moves).
2. **Phase 3 not executed (deferred by decision):** missing-window kardex
   backfill (576 movements Oct–Dec 2025, 476 movements Jul 2–Aug 13 2026) and
   per-patient consumption metadata (2,003-row analyst dataset; 810 DNIs all
   resolve against `parties.doc_number`). The 467 dose-estimated rows must NEVER
   post to the ledger (no physical movement) — management report only.
3. **Toxina 2 Zonas dose left at 30 UI** — unmeasured (n<5 documented sessions).
   Logically ~60; confirm with clinic before changing.
4. **`FAJG` item (FAJA-G) untouched** — analyst confirmed the generic size does
   not exist in almacén; SUSSI keeps selling it. Should be retired/aliased to
   S/M/L once POS mapping is confirmed.
5. **Reconcile script is untracked** at
   `minion_hub/scripts/faces-insumos-reconcile-2026-08.ts` — hub checkout was on
   the live `feat/level-2026-07-30` branch (co-agent work; commits must stay
   scoped), so it was not committed. Fold into the next hub PR alongside
   `repair-stock-valuation.ts` for traceability.
6. **Prod backup tables `*_bak_insumos2608`** should be dropped once the
   reconciliation has soaked (suggest ≥30 days).
7. **Mixed purchase UOMs are not represented explicitly.** FACES consumption
   reaches three levels: purchase boxes, vials or syringes, and fractional vial
   use. The purchase form may also receive a vial directly instead of a box,
   with factors that vary by item. Today `stk_items` stores one stock UOM plus
   one `units_per_stock_uom` conversion, so operational scripts must normalize
   every receipt to the smallest auditable unit before posting.

   Add an org-scoped `stk_item_uom_conversions` graph (or an equivalent bounded
   two-hop model) with `item_id`, `from_uom`, `to_uom`, `factor`, effective
   dates, and optional supplier scope. Receipt lines must retain the entered
   purchase UOM and normalized base quantity; `stk_ledger` must continue to
   store only the base quantity. Reject cycles, non-positive factors, and
   ambiguous active paths. Acceptance requires tests for box → vial → fraction,
   direct vial purchases, item-specific factors, exact cancellation, and a
   bin rebuild that reproduces the same normalized balance and value.

   The seven HA item names still carry the legacy `(Caja)` suffix even though
   their stock UOM is now `Jeringa`. Keep the row IDs stable, add the old names
   as aliases, and rename them only after catalog classification, search, and
   invoice-mapping tests prove the label change does not break matching.
