---
phase: 05-db-extraction
plan: 01
subsystem: database
tags: [drizzle-orm, libsql, turso, npm-publish, schema-extraction]

requires:
  - phase: 02-foundation
    provides: "@minion-stack/tsconfig workspace package for tsconfig.json extension"
  - phase: 04-fold-minion-shared
    provides: "packages/shared as structural template for packages/db"

provides:
  - "@minion-stack/db@0.1.0 npm package with 38 Drizzle schema files"
  - "packages/db/src/schema/ — single source of truth for Minion shared DB schema"
  - "packages/db/drizzle/ — migration history (0000-0011) with reconciled journal"
  - "A1 verification result: TBD (pending publish + minion_hub install)"

affects: [05-02-minion-site-consumer, 05-03-hub-migration-cutover]

tech-stack:
  added: [drizzle-orm@^0.45.1, @paralleldrive/cuid2@^3.3.0, drizzle-kit@^0.31.9]
  patterns:
    - "packages/db replicates packages/shared structure with additional src/ in files array"
    - "nodenext moduleResolution requires explicit .js extensions + dir/index.js for directory imports"
    - "Migration journal manually reconciled: entries 0008-0011 added with placeholder timestamps"

key-files:
  created:
    - packages/db/package.json
    - packages/db/tsconfig.json
    - packages/db/src/index.ts
    - packages/db/src/schema/index.ts
    - packages/db/src/schema/auth/index.ts
    - packages/db/src/relations.ts
    - packages/db/src/utils.ts
    - packages/db/drizzle/meta/_journal.json
    - .changeset/minion-stack-db-initial.md
  modified: []

key-decisions:
  - "src/ included in npm files array — mandatory for drizzle-kit to read TypeScript source from node_modules"
  - "nodenext import extension fix: all relative imports updated to .js; directory imports become dir/index.js"
  - "Journal entries 0008-0011 added with placeholder timestamps (1700000008000-1700000011000) since hub journal only covered 0-7"
  - "A1 result determines plan 05-03 approach: Option A (node_modules glob) if confirmed, Option B (local re-export stubs) if failed"

patterns-established:
  - "Pattern 1: When copying schema from SvelteKit (bundler resolution) to library package (nodenext), add .js extensions to all relative imports and convert directory imports to explicit /index.js"
  - "Pattern 2: packages/db/src/ in npm files array enables drizzle-kit schema discovery from node_modules"

requirements-completed: [DB-01, DB-02]

duration: ~25min (Tasks 1-2 only; Task 3 awaiting human action)
completed: 2026-04-21
---

# Phase 05 Plan 01: DB Extraction — @minion-stack/db Package Summary

**38 Drizzle schema files extracted from minion_hub into packages/db, tsc-built, ready to publish as @minion-stack/db@0.1.0 pending npm 2FA**

## Performance

- **Duration:** ~25 min (Tasks 1-2 complete; Task 3 is human checkpoint)
- **Started:** 2026-04-21T~15:43:00Z
- **Completed:** 2026-04-21 (partial — stopped at publish checkpoint)
- **Tasks:** 2/3 complete (Task 3 requires npm 2FA + A1 verification)
- **Files modified:** 63

## Accomplishments

- Created `packages/db/` workspace package with `package.json` (name: `@minion-stack/db`, files includes `src`) and `tsconfig.json`
- Copied all 38 schema files verbatim (37 domain `.ts` files + `auth/index.ts`) from `minion_hub/src/server/db/schema/`
- Added `src/index.ts` barrel re-exporting schema, relations, and utils
- Fixed all relative imports for nodenext moduleResolution: 101 imports updated to explicit `.js` extensions
- Copied migration history (SQL 0000-0011 + journal) from hub; reconciled journal by adding missing entries 0008-0011
- `tsc` build succeeds with zero errors; `dist/` fully produced
- `npm pack --dry-run` confirms `src/` appears in packed files (drizzle-kit requirement)
- Security check passed: no `TURSO_DB_AUTH_TOKEN`, `API_KEY`, or hardcoded secrets in schema source (the `clientSecret` column in auth table is a schema column definition, not a secret value)

## Task Commits

1. **Task 1: Scaffold packages/db workspace package** — `a247371` (chore)
2. **Task 2: Copy schema files verbatim and build** — `d6565fc` (feat)
3. **Task 3: Publish @minion-stack/db@0.1.0** — PENDING (human checkpoint)

## Files Created/Modified

- `packages/db/package.json` — @minion-stack/db@0.1.0 config with src in files, peerDep drizzle-orm>=0.45.0
- `packages/db/tsconfig.json` — extends @minion-stack/tsconfig/library.json
- `packages/db/src/index.ts` — main barrel: re-exports schema, relations, utils
- `packages/db/src/schema/index.ts` — schema barrel with 11 auth tables + 37 domain tables
- `packages/db/src/schema/auth/index.ts` — Better Auth 1.4.19 tables (11 tables)
- `packages/db/src/schema/*.ts` — 37 domain schema files (verbatim + .js import extensions)
- `packages/db/src/relations.ts` — Drizzle relational query definitions (verbatim + import fix)
- `packages/db/src/utils.ts` — newId() + nowMs() helpers (verbatim, no imports to fix)
- `packages/db/drizzle/0000-0011.sql` — migration SQL files (verbatim copy from hub)
- `packages/db/drizzle/meta/_journal.json` — reconciled: entries 0-7 from hub + 0008-0011 added
- `.changeset/minion-stack-db-initial.md` — minor changeset for initial release
- `pnpm-lock.yaml` — updated with new workspace package

## Decisions Made

- **src/ in npm files array:** Mandatory for drizzle-kit to discover TypeScript schema source from node_modules. Without this, A1 would fail regardless of drizzle-kit version.
- **nodenext import extensions:** The `@minion-stack/tsconfig/library.json` base uses `moduleResolution: nodenext`. SvelteKit source uses `bundler` resolution (no extensions needed). Migrating to library package required adding `.js` to all 101 relative imports. Directory imports (`./auth`) become `./auth/index.js`.
- **Journal reconciliation:** Hub's `_journal.json` only had entries 0-7 despite SQL files existing up to 0011. Added entries 0008-0011 with placeholder timestamps since actual timestamps were not in hub.
- **A1 verification deferred:** Will run post-publish. A1 result (CONFIRMED or FAILED) determines plan 05-03's approach selection.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added .js extensions to all relative imports for nodenext moduleResolution**
- **Found during:** Task 2 (build step)
- **Issue:** Copied schema files used `from './servers'` syntax (SvelteKit bundler resolution); `@minion-stack/tsconfig/library.json` enforces `moduleResolution: nodenext` which requires explicit `.js` extensions. tsc reported 80+ TS2834/TS2835 errors.
- **Fix:** Used perl to add `.js` to all 101 relative imports across 38+ source files. Then fixed directory imports: `from './auth.js'` → `from './auth/index.js'`; `from './schema.js'` → `from './schema/index.js'`
- **Files modified:** All 38 schema files + relations.ts
- **Verification:** `pnpm --filter @minion-stack/db build` exits 0 with no errors
- **Committed in:** d6565fc (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — build failure from moduleResolution mismatch)
**Impact on plan:** Essential fix for library package correctness. No scope creep.

## A1 Verification Status

**PENDING** — Will run after Task 3 (npm publish) completes:

Steps to run after publish:
```bash
cd /home/nikolas/Documents/CODE/AI/minion_hub
bun add @minion-stack/db

cat > /home/nikolas/Documents/CODE/AI/minion_hub/drizzle.config.test.ts << 'EOF'
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'sqlite',
  schema: ['./node_modules/@minion-stack/db/src/schema/**/*.ts'],
  out: '/tmp/drizzle-a1-test-out',
  dbCredentials: { url: 'file:/tmp/test-a1-minion.db' },
});
EOF

bunx drizzle-kit push --config=drizzle.config.test.ts 2>&1 | tail -30
sqlite3 /tmp/test-a1-minion.db ".tables" 2>/dev/null | head -5

# Clean up
rm -f /home/nikolas/Documents/CODE/AI/minion_hub/drizzle.config.test.ts
rm -f /tmp/test-a1-minion.db
rm -rf /tmp/drizzle-a1-test-out
```

A1 result will determine plan 05-03 approach:
- **A1 CONFIRMED** → Option A: use `node_modules/@minion-stack/db/src/schema/**/*.ts` glob in hub's drizzle.config.ts
- **A1 FAILED** → Option B: hub keeps thin local re-export stubs in `src/server/db/schema/`

## Publish Steps (Task 3 — Human Required)

```bash
cd /home/nikolas/Documents/CODE/AI
pnpm changeset version
cd packages/db && npm publish --access public
# Enter 2FA OTP when prompted
npm view @minion-stack/db
```

Expected `npm view @minion-stack/db` output:
- version: 0.1.0
- files: includes "src"
- exports: `.`, `./schema`, `./auth`, `./relations`, `./utils`

## Issues Encountered

- Hub's drizzle journal only covered migrations 0-7 despite 12 SQL files (0000-0011) existing. Added missing entries 0008-0011 with placeholder timestamps. The actual migration timestamps for 0008-0011 are unknown, so placeholder `1700000008000-1700000011000` values were used.

## Next Phase Readiness

- **Ready:** `packages/db` scaffold + source complete, tsc build confirmed
- **Blocked on:** npm publish (Task 3 human action — 2FA OTP required)
- **After publish:** A1 verification drives 05-03 approach selection
- **Plan 05-02** (minion_site consumer) can proceed after publish is confirmed and A1 result documented

## Self-Check: PASSED

All created files verified present:
- packages/db/package.json — FOUND
- packages/db/tsconfig.json — FOUND
- packages/db/src/index.ts — FOUND
- packages/db/src/schema/index.ts — FOUND
- packages/db/src/schema/auth/index.ts — FOUND
- packages/db/src/relations.ts — FOUND
- packages/db/src/utils.ts — FOUND
- packages/db/dist/index.js — FOUND
- packages/db/dist/schema/auth/index.js — FOUND
- packages/db/drizzle/meta/_journal.json — FOUND
- .changeset/minion-stack-db-initial.md — FOUND

Commits verified: a247371 FOUND, d6565fc FOUND

Schema file count: 38 (37 domain + auth/index.ts)

---
*Phase: 05-db-extraction*
*Completed: 2026-04-21 (partial — Task 3 pending human action)*
