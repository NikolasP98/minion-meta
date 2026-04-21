# Phase 5: DB Extraction — Verification

**Phase:** 05-db-extraction
**Completed:** 2026-04-21
**Status:** COMPLETE

## Requirements Coverage

| Req ID | Description | Satisfied | Evidence |
|--------|-------------|-----------|---------|
| DB-01 | Drizzle schema moved to packages/db/src/schema/ | ✓ | 38 files: 37 domain + auth/index.ts extracted from minion_hub. tsc build exits 0. |
| DB-02 | @minion-stack/db publishes first release | ✓ | `npm view @minion-stack/db` → 0.2.0 (0.1.0 was pre-existing; changeset bumped to 0.2.0 in plan 05-01) |
| DB-03 | minion_site imports schema from @minion-stack/db | ✓ | 6 local schema files deleted; 6 import sites updated; `bun run check` 0 errors; PR #4 open on NikolasP98/minion-site |
| DB-04 | minion_hub imports schema from @minion-stack/db | ✓ | 56 import sites updated; local schema files retained for drizzle-kit only; `bun run check` 18 pre-existing errors (0 schema-related); PR #17 open on NikolasP98/minion_hub |
| DB-05 | Staging dry-run passes with no data loss | ✓ | SQLite clone (/tmp): 56 tables, "No changes detected". A2=CONFIRMED. Local dev DB: 4 additive ADD COLUMN changes (user_id/tenant_id on workshop_saves/flows) — non-destructive, applied cleanly. |
| DB-06 | Meta-repo owns migrations; hub stops db:push | ✓ | Hub scripts (db:push, db:generate, db:migrate, db:studio) removed. drizzle-kit devDep removed. drizzle.config.ts deleted from hub. Production Turso push: "No changes detected", exit 0. PR #18 open on NikolasP98/minion_hub. |
| DB-07 | Drizzle config in hub and site updated | ✓ | Hub drizzle.config.ts removed (plan 05-05). Site had no drizzle-kit (was never a migrator — consume-only). Meta-repo drizzle.config.ts at root points at packages/db/src/schema/**/*.ts (local workspace source). |

## Assumption Verdicts

| Assumption | Result | Notes |
|------------|--------|-------|
| A1: drizzle-kit reads .ts from node_modules | FAILED | Error: "No schema files found for path config ['./node_modules/@minion-stack/db/src/schema/**/*.ts']". drizzle-kit's esbuild-register sets ignoreNodeModules:true. Plan 05-03 adapted to Option B: local schema files retained verbatim for drizzle-kit; app code imports from @minion-stack/db package. |
| A2: db:push compares to live DB not journal | CONFIRMED | `drizzle-kit push` against SQLite clone exits 0 with "No changes detected" despite journal gap at entries 0008-0011 with placeholder timestamps. Production push against Turso: "No changes detected", exit 0. No erroneous re-application risk. |

## PRs Opened

- **minion_hub feat PR #17:** https://github.com/NikolasP98/minion_hub/pull/17 — consume @minion-stack/db schema (Step 1 cutover; 56 import sites updated)
- **minion_hub chore PR #18:** https://github.com/NikolasP98/minion_hub/pull/18 — remove migration scripts (Step 2 cutover; drizzle-kit devDep + scripts removed)
- **minion_site feat PR #4:** https://github.com/NikolasP98/minion-site/pull/4 — consume @minion-stack/db schema (6 local schema files deleted; 6 import sites updated)

## Migration Ownership Transfer

**Before Phase 5:** minion_hub owned db:push; schema defined in `minion_hub/src/server/db/schema/` (38 files)

**After Phase 5:** meta-repo owns db:push via `pnpm run db:push` at root; schema defined in `packages/db/src/schema/`; hub retains local schema copies for drizzle-kit reads only (app code uses @minion-stack/db)

**Run migrations going forward:**
```bash
cd /home/nikolas/Documents/CODE/AI  # meta-repo root
TURSO_DB_URL=<from Infisical> TURSO_DB_AUTH_TOKEN=<from Infisical> pnpm run db:push
# or: minion sync-env hub; source minion_hub/.env.local; pnpm run db:push
```

**Hub retains:**
- `db:seed` — seeds initial data (`src/server/seed.ts`), not a drizzle-kit script; still hub-owned
- Local `src/server/db/schema/` files — used by drizzle-kit for schema discovery (Option B augmented constraint); app code ignores these

## Production Push Result

**Command:** `pnpm run db:push` at meta-repo root against production Turso (2026-04-21)

```
[✓] Pulling schema from database...
[i] No changes detected
```

**Exit code:** 0. Zero schema drift. All 4 additive columns (user_id/tenant_id on workshop_saves/flows) had already been applied to production Turso in a prior session.

## Schema Drift Fixed

minion_site had a stale local schema: missing `personalAgentId` on user table and missing OIDC plugin tables. Fixed automatically by replacing local schema copy with @minion-stack/db import (plan 05-02). The @minion-stack/db package carries the canonical schema including all Better Auth 1.4.19 OIDC tables.

## Architecture Decision Notes

**Option B (augmented):** The original plan anticipated thin re-export stubs (hub local stubs pointing at @minion-stack/db). This was not viable due to three compounding constraints:
1. drizzle-kit esbuild-register ignores node_modules (.ts files not transpiled)
2. @minion-stack/db is ESM-only — CJS require() fails via exports map
3. Node 22 refuses native type stripping for node_modules paths

**Resolution:** Hub retains original 38 local schema files verbatim. drizzle-kit reads local files (which it can find); app code imports from @minion-stack/db (single source of truth for types). The meta-repo drizzle.config.ts points at `./packages/db/src/schema/**/*.ts` (local workspace source — NOT node_modules), which drizzle-kit CAN read.

## Meta-Repo drizzle.config.ts

- `dialect: 'turso'`
- `schema: ['./packages/db/src/schema/**/*.ts']` — local workspace source (critical: not node_modules)
- `out: './packages/db/drizzle'`
- `dbCredentials.url`: reads from `TURSO_DB_URL` env var (file: SQLite fallback for local dev)
- `dbCredentials.authToken`: reads from `TURSO_DB_AUTH_TOKEN` env var — never hardcoded
- Added devDeps: `drizzle-kit@^0.31.10`, `@libsql/client@^0.17.2`

## Next Phase

Phase 6: Auth Extraction — Extract Better Auth config to `@minion-stack/auth` shared factory

Requirements: AUTH-01, AUTH-02, AUTH-03, AUTH-04
