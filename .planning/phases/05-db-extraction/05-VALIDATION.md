---
phase: 05-db-extraction
date: 2026-04-21
---

# Phase 5: DB Extraction — Validation Strategy

## Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (hub, existing) |
| Config file | `vitest.config.ts` or `package.json` |
| Quick run command | `bun run test` (in minion_hub) |
| Full suite command | `bun run test` (in minion_hub) |

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | Schema files copy verbatim and build with tsc | Build smoke | `pnpm --filter @minion-stack/db build` | Wave 0 (new package) |
| DB-02 | @minion-stack/db publishes and is importable | Publish smoke | `npm pack --dry-run` in packages/db | Wave 0 |
| DB-03 | Site imports from @minion-stack/db, svelte-check passes | Type check | `bun run check` (in minion_site) | ✅ (existing check script) |
| DB-04 | Hub imports from @minion-stack/db, svelte-check passes | Type check | `bun run check` (in minion_hub) | ✅ (existing check script) |
| DB-05 | Staging dry-run: drizzle-kit push against SQLite clone exits 0 with no DDL changes | Integration | Manual: `TURSO_DB_URL="file:/tmp/staging.db" pnpm run db:push` | Wave 0 |
| DB-06 | Meta-repo db:push script works; hub db:push is removed | Integration smoke | `pnpm db:push` at meta-repo root | Wave 0 |
| DB-07 | Both drizzle.config.ts files reference @minion-stack/db path | Static check | grep verify | ✅ (manual review) |

---

## Sampling Rate

- **Per task commit:** `pnpm --filter @minion-stack/db build` (fast, < 10s)
- **Per wave merge:** `bun run check` in hub + site
- **Phase gate:** Both hub and site `bun run check` green + `pnpm --filter @minion-stack/db build` green before `/gsd-verify-work`

---

## Wave 0 Gaps

Files and infrastructure that must be created before automated verification can run:

| Gap | Created In | Verified By |
|-----|-----------|-------------|
| `packages/db/` directory + `package.json` | plan 05-01 Task 1 | `pnpm --filter @minion-stack/db build` exits 0 |
| `packages/db/tsconfig.json` | plan 05-01 Task 1 | same |
| `packages/db/src/schema/**` (38 files) | plan 05-01 Task 2 | `pnpm --filter @minion-stack/db build` exits 0 |
| Meta-repo root `drizzle.config.ts` | plan 05-04 Task 1 | `pnpm run db:push` exits 0 against SQLite |
| `drizzle-kit` devDep at meta-repo root | plan 05-04 Task 1 | `pnpm exec drizzle-kit --version` exits 0 |

---

## A1 Assumption Verification (drizzle-kit + node_modules)

**What it tests:** Whether drizzle-kit can read `.ts` schema source from `node_modules/@minion-stack/db/src/` when invoked from `minion_hub/`.

**When it runs:** After `@minion-stack/db@0.1.0` is published to npm, as part of plan 05-01 Task 2 (post-publish step).

**Procedure:**
1. `cd minion_hub && bun add @minion-stack/db` — installs freshly-published package into hub's node_modules
2. Write `minion_hub/drizzle.config.test.ts` with `schema: ['./node_modules/@minion-stack/db/src/schema/**/*.ts']` and `url: 'file:/tmp/test-a1.db'`
3. Run `bunx drizzle-kit push --config drizzle.config.test.ts` against fresh SQLite
4. Clean up temp config and DB file
5. Document result in `05-01-SUMMARY.md`: **A1 CONFIRMED** or **A1 FAILED + failure mode**

**Decision gate:**
- A1 CONFIRMED → plan 05-03 uses Option A (hub `drizzle.config.ts` schema glob points at `node_modules/@minion-stack/db/src/**`)
- A1 FAILED → plan 05-03 uses Option B (hub keeps thin local re-export stubs in `src/server/db/schema/` forwarding to `@minion-stack/db`)

---

## A2 Assumption Verification (db:push vs journal)

**What it tests:** Whether `drizzle-kit push` compares schema to the live database state (not to the migration journal), so the journal gap (entries 0008-0011 missing) does not cause erroneous re-application of already-applied changes.

**When it runs:** Plan 05-04 Task 2, staging dry-run against a SQLite clone of `minion_hub/data/minion_hub.db`.

**Procedure:**
1. `cp minion_hub/data/minion_hub.db /tmp/staging-minion-phase5.db`
2. `TURSO_DB_URL="file:/tmp/staging-minion-phase5.db" pnpm run db:push 2>&1 | tee /tmp/drizzle-push-staging.log`
3. Check output: "Everything is already up to date" = A2 CONFIRMED; any DDL = A2 FAILED
4. Record in `05-04-SUMMARY.md`

---

## Phase Gate Checklist

Before running `/gsd-verify-work`, confirm:

- [ ] `pnpm --filter @minion-stack/db build` exits 0 (no TypeScript errors)
- [ ] `npm view @minion-stack/db` shows version 0.1.0 with `src` in files list
- [ ] `bun run check` in `minion_hub` exits 0 (no type errors after import path change)
- [ ] `bun run check` in `minion_site` exits 0 (no type errors after import path change)
- [ ] A1 assumption verdict documented in `05-01-SUMMARY.md`
- [ ] A2 assumption verdict documented in `05-04-SUMMARY.md`
- [ ] Staging dry-run log shows no unexpected DDL
- [ ] Hub `db:push` script removed from `minion_hub/package.json`
- [ ] Meta-repo `pnpm run db:push` exits 0 against production Turso
- [ ] `VERIFICATION.md` written with all DB-01..DB-07 rows satisfied
