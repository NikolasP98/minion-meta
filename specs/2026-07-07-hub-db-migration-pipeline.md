# Hub DB migration pipeline — automate the manual psql workflow

**Date:** 2026-07-07 · **Scope:** `minion_hub` Supabase (Postgres) migrations · **Status:** built + validated against prod

## Problem

Hub's Supabase schema was migrated **manually**: hand-written idempotent `.sql`
files in `minion_hub/supabase/migrations/`, applied by a human running
`psql "$SUPABASE_DB_URL" -f <file>` and probing prod by hand to know what was
applied. Deploy is decoupled — Vercel auto-deploys hub from `master`, migrations
are a separate manual step.

### Risks (ranked)

1. **Code ships before schema.** Vercel goes live on master-merge; the psql step
   is separate and forgettable → prod 500s (happened with `org_roles`).
2. **No applied-state ledger for hub.** Truth = "probe prod by hand." Double-apply
   / skip risk; only guard is per-author idempotency.
3. **Prod credential pasted into a shell** on every apply.
4. **No pre-apply validation** — SQL hits prod with no dry-run / no CI parse.
5. **No captured rollback**; several files `drop constraint`.
6. **Naming drift** — `0001_` vs 14-digit timestamps; a duplicate version.

### Discovery that shaped the design

- The prod DB (`gxvsaskbohavnurfvshr`) is **shared** with the meta-repo root
  Supabase project (`../supabase/`, 83 files) and historically `minion_site`.
- There is exactly **one** `supabase_migrations.schema_migrations` table per DB.
  It already holds **72 rows from the root project** and is itself drifted
  (remote versions with no local file).
- Because `minion_hub/supabase/` had no `config.toml`, the Supabase CLI **walked
  up** and resolved the *root* project.
- Consequently **`supabase migration up` cannot gate hub's migrations**: from
  hub's partial dir it aborts with `LegacyMigrationMissingLocalError` (72 remote
  versions missing locally), and the suggested `migration repair --status
  reverted` would corrupt the *root* project's history in the shared table.

→ Supabase CLI is unusable as hub's gate on a shared DB. Hub needs its **own**
ledger, independent of `schema_migrations`.

## Design

A tiny hub-owned runner using hub's existing `postgres.js` driver (no `psql`
binary — Vercel's build image has none), gated on the Vercel **production build**
so schema and code ship atomically.

```
vercel-build = db:migrate && build
```

- `scripts/db-migrate.ts` — applies pending `supabase/migrations/*.sql` not yet
  in the `public.hub_migrations` ledger. Each file applies **and** records in one
  transaction under `pg_advisory_xact_lock` with a re-check inside the lock →
  race-safe across concurrent builds. Guarded: runs only when
  `VERCEL_ENV=production` or `FORCE_DB_MIGRATE=1`; **fails the build** if
  `SUPABASE_DB_URL` is missing or any migration errors, so the previous deploy
  stays live and code never precedes its schema.
- `scripts/db-status.ts` — read-only applied-vs-pending report.
- `hub_migrations(version text primary key, applied_at timestamptz)` — hub's
  ledger, separate from the shared/drifted `schema_migrations`.

### Risk → mitigation

| Risk | Mitigation |
|---|---|
| #1 ordering | migration is a gate on the prod build; failure aborts deploy |
| #2 no ledger | `hub_migrations` ledger, own to hub |
| #3 credential | `SUPABASE_DB_URL` lives in Vercel's encrypted prod env, off the shell |
| #4 validation | `bun run db:status` (pending diff) + PR review of the `.sql` |
| #5 rollback | still manual, but the ledger gives an exact applied list to reverse against |
| #6 naming | files renamed to unique 14-digit versions |

Connection: uses the existing transaction pooler URL with `prepare:false` (same
as `pg-ledger-client.ts`). `pg_advisory_xact_lock` is transaction-scoped so it
works on the pooler.

## One-time reconciliation performed (2026-07-07)

- Renamed to unique 14-digit versions: `0001/0002/0003_*` → dated versions; split
  the duplicate `20260705120000` (`meta_post_promoted` → `20260705120100`).
- Created `public.hub_migrations` and **backfilled all 16 current versions**
  (already applied to prod) so the runner treats them as done — **zero DDL
  re-run**.
- Removed `minion_hub/supabase/config.toml` so nobody can accidentally drive
  hub's dir through `supabase migration up` (→ the LegacyMigration error).

Validated against prod: guard-skip, no-op run, positive apply of a throwaway
multi-statement/dollar-quoted migration + idempotent re-run, then cleanup →
`0 pending`, ledger back to 16.

## Runbook — adding a migration going forward

1. Write `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`. Keep it **idempotent**
   (`create/drop ... if [not] exists`); a data backfill must guard its own re-run.
2. `bun run db:status` (with `SUPABASE_DB_URL` exported) to confirm it shows PENDING.
3. Merge to `dev` → `master`. The Vercel **production** build runs `db:migrate`
   before `build`; if it fails, the deploy aborts and the old version stays live.
4. Rollback: write and apply a compensating migration (no auto-down).

## Prerequisites / verification

- `SUPABASE_DB_URL` is set in Vercel **Production** env (confirmed present,
  encrypted) — available at build time by default.
- Vercel honors the `vercel-build` script **only if** the project's Build Command
  is not overridden in dashboard settings. **Verify** the first prod deploy runs
  the `db:migrate` step (look for `db:migrate — done (N applied).` in build logs).

## Not done / out of scope

- Auto-`down`/rollback migrations (compensating-migration convention instead).
- Reconciling the root project's own `schema_migrations` drift (separate concern;
  hub no longer depends on it).
