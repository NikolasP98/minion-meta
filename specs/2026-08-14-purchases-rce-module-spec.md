---
id: 2026-08-14-purchases-rce-module-spec
title: Purchases module — SIRE RCE backfill, open/closed locking, minion-side CRUD
stage: done
status: shipped
pass: 1
created: 2026-08-14
updated: 2026-08-17
repos: [minion_hub]
type: feature
---

# Purchases module — SIRE RCE backfill, open/closed locking, minion-side CRUD

## 0. Product

FACES' purchase invoices (supplier facturas) live in SUNAT's **Registro de
Compras (RCE)**, presented monthly by the accountant. Minion has no purchases
capability at all today (`fin_transactions` is empty; nothing reads compras).
This slice gives minion a purchases ledger that:

1. **Backfills from SUNAT** — pulls the RCE per period so minion mirrors what
   SUNAT has (verified live 2026-08-14: August propuesta = 35 docs, 34 facturas,
   S/ 26,185.91).
2. **Knows open vs closed** — periods the accountant already *presented* are
   CLOSED: their entries are locked read-only in minion. The open period's
   entries are editable.
3. **Minion-side CRUD** — users add/edit/remove purchase entries (manual ones,
   or annotations on SUNAT-sourced ones) in the open period.

**Deliberately deferred (do NOT build):** pushing changes TO SUNAT
(aceptar/reemplazar propuesta, registrar preliminar — manual §5.2-5.17). Those
endpoints write to the accountant's live workspace; activating them requires
explicit user+accountant coordination. This slice is SUNAT→minion one-way plus
minion-local CRUD; the spec's data model must not preclude the push leg later
(that's what `sync_state` below is for).

## 1. SUNAT RCE API facts (verified live 2026-08-14 + manual v22; token/auth identical to sunat-sire connector)

- Periods: GET `.../migeigv/libros/rvierce/padron/web/omisos/080000/periodos`
  (080000 = RCE, 140000 = RVIE; same response shape; `desEstado`
  'Presentado' = CLOSED, 'No Presentado' = OPEN). ✅ works
- Resumen (synchronous CSV): GET `.../rvierce/resumen/web/resumencomprobantes/{per}/{tipoResumen}/{tipoArchivo}/exporta?codLibro=080000`
  — tipoResumen 1=propuesta, 4=registro… returns per-doc-type aggregates. ✅ works
- Row-level export (async): GET `.../rce/propuesta/web/propuesta/{per}/exportacioncomprobantepropuesta?codTipoArchivo=0&codOrigenEnvio=2`
  → `{numTicket}` ✅; status: GET `.../rvierce/gestionprocesosmasivos/web/masivo/consultaestadotickets?perIni=&perFin=&page=1&perPage=20&numTicket=`
  → `archivoReporte[].nomArchivoReporte` ✅; download: GET
  `.../gestionprocesosmasivos/web/masivo/archivoreporte?nomArchivoReporte=&codTipoArchivoReporte=`
  — ⚠️ UNRESOLVED QUIRK: with default curl it 500s; with browser UA + HTTP/1.1
  it answers properly but 422 "archivo no existe" for the exact reported name,
  and other name variants give different 500s. Solving this IS part of the
  slice (hypotheses: send BOTH a browser User-Agent and Accept headers; try
  `codTipoArchivoReporte` '01'/null; try adding `numTicket`/`perIni`/`perFin`;
  inspect what the SIRE web app itself sends — it is the same API). If it
  resists >2h, fall back: parse the resumen CSVs per period (aggregate rows per
  doc type) so period status + totals still backfill, and record the blocker in
  the PR; row detail then arrives in a follow-up.
- NO paged-JSON comprobantes endpoint exists for RCE (RVIE-style path 500s
  with any UA) — the file export is the only row-level read.
- Full manual (endpoints §5.x) saved at:
  `/home/nikolas/.claude/projects/-home-nikolas-Documents-CODE-MINION/e34f11ab-6b62-44b6-a367-057b7e076ba7/tool-results/webfetch-1786740239447-x7yop3.pdf`
  — Read pages as needed (46-60 = write ops, for the deferred leg's shape only).
- LIVE CREDS for testing (read-only endpoints ONLY — never call §5.2-5.29
  write endpoints): provided out-of-band to the implementer. The DoD script
  reads env `SUNAT_TEST_RUC/_USER/_PASS/_CLIENT_ID/_CLIENT_SECRET` (add
  placeholders to .env.example; real values live only in the gitignored
  worktree .env, never committed).

## 2. Data model (additive migration, org RLS like other fin_ tables; DROP nothing)

`fin_purchases`:

| column | notes |
|---|---|
| id uuid pk, org_id | |
| source | `'sunat'` \| `'manual'` |
| provider_ref | for sunat rows: codCar or `{rucProveedor}-{tipo}-{serie}-{numero}`; unique `(org_id, provider_ref)` where not null |
| period | YYYYMM (tributario) |
| supplier_ruc, supplier_name | |
| doc_type, serie, numero | tipo 01/03/30… |
| issued_at date | |
| currency, base_gravada, igv, total | numeric |
| period_status | `'open'` \| `'closed'` — denormalised from the periods endpoint at sync time |
| sync_state | `'synced'` (mirrors SUNAT) \| `'local'` (manual, not in SUNAT) \| `'diverged'` (was synced, user edited) — the hook for the future push leg |
| metadata jsonb | raw SIRE row / CSV line |
| created_at, updated_at | |

`fin_purchase_periods` (one row per org+period): period, status open/closed,
totals from resumen (doc count, base, igv, total), last_synced_at. This is the
locking source of truth and renders the period header.

## 3. Service + sync

`src/server/services/purchases.service.ts`:
- `syncPurchases(ctx)` — periods (080000) → upsert `fin_purchase_periods`
  (presented ⇒ closed); for each period in scope (config startPeriod..current):
  resumen CSV for totals; row-level via the export-ticket flow (or CSV fallback
  per §1). Upsert sunat rows (`source='sunat'`, `sync_state='synced'`); NEVER
  overwrite a row whose `sync_state='diverged'` — flag it in the sync result
  instead. Reuse the existing `fin_sync_jobs` runner if it fits naturally
  (provider `'sunat-rce'`); a plain one-shot service called from the UI is
  acceptable for this slice (compras volume is tiny — ~35 docs/month).
- CRUD guards (the locking rule, enforced in the SERVICE, not the UI):
  - create: only `source='manual'`, only into an OPEN period.
  - update/delete: reject if `period_status='closed'` (PosError-style typed
    error `period_closed`); editing a synced row flips `sync_state='diverged'`.
- Auth creds: read the `sunat-sire` `fin_sources` row (same secrets); RCE and
  RVIE share token + client.

## 4. UI — `/finances/purchases`

New page under the finances section (list grouped by period, newest first):
- Period header: month, OPEN/CLOSED chip, totals, "last synced", Sync button.
- Rows: supplier, doc id, date, amounts, source badge (SUNAT/manual),
  diverged badge. Closed periods render read-only (no edit/delete affordances);
  open period rows get edit/delete; "Add purchase" button (manual entry form:
  supplier ruc+name, doc type/serie/numero, date, amounts).
- RBAC (hub CLAUDE.md checklist): `MODULE_SUBRESOURCES` entry for
  `/finances/purchases` (finances module), FinanceNav item (canViewPath-filtered),
  API routes under `/api/finances/purchases` gated by the existing
  `/api/finances` write prefix + explicit capability on mutations.
- i18n `finance_purchases_*` en+es append-only; design tokens only; both
  design lints with `DESIGN_LINT_BASE_REF=origin/master`.

## 5. Verification

1. Unit: locking guards (closed-period create/update/delete rejected), diverged
   flip + sync-skip of diverged rows, period upsert idempotent, CSV/row parse.
2. Live DoD script (bun, reads `SUNAT_TEST_*` env): periods pull shows 202608
   open + earlier presented; resumen 202608 parses to ~35 docs / S/ 26,185.91
   totals (values may drift as the month accrues — assert structure, print
   values); if the file download got cracked, show 3 parsed rows. Paste output
   in PR.
3. `bun run check` 0/0, full `bun run test` green, design lints clean,
   route-contract count bumps as required for the new page/endpoints.

## 6. Out of scope

Any SUNAT write (aceptar/reemplazar/registrar/eliminar — deferred leg), RCE
no-domiciliados, FV0621, tipo-de-cambio masivo, ajustes posteriores, linking
purchases to stock/expenses P&L, scheduling (manual sync button only).
