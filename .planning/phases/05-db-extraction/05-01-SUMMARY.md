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
  - "A1 verification result: FAILED — drizzle-kit cannot read .ts from node_modules; plan 05-03 uses Option B (local re-export stubs)"

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
  - "A1 result determines plan 05-03 approach: A1=failed → Option B (local re-export stubs in hub src/server/db/schema/)"

patterns-established:
  - "Pattern 1: When copying schema from SvelteKit (bundler resolution) to library package (nodenext), add .js extensions to all relative imports and convert directory imports to explicit /index.js"
  - "Pattern 2: packages/db/src/ in npm files array enables drizzle-kit schema discovery from node_modules"

requirements-completed: [DB-01, DB-02]

duration: ~25min (Tasks 1-2 only; Task 3 awaiting human action)
completed: 2026-04-21
---

# Phase 05 Plan 01: DB Extraction — @minion-stack/db Package Summary

**38 Drizzle schema files extracted from minion_hub into packages/db, tsc-built, published as @minion-stack/db@0.2.0. A1 verification FAILED — plan 05-03 uses Option B (local re-export stubs).**

## Performance

- **Duration:** ~25 min (Tasks 1-3 complete)
- **Started:** 2026-04-21T~15:43:00Z
- **Completed:** 2026-04-21
- **Tasks:** 3/3 complete
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
3. **Task 3: Publish @minion-stack/db@0.2.0 + A1 verification** — COMPLETE

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

**A1 = FAILED**

drizzle-kit cannot read `.ts` source files from `node_modules`. The test was run against `@minion-stack/db@0.2.0` installed in `minion_hub`. Error:

```
No schema files found for path config ['./node_modules/@minion-stack/db/src/schema/**/*.ts']
```

drizzle-kit silently finds zero tables — it does not parse TypeScript from inside node_modules regardless of the `src/` being present in the npm `files` array.

**Plan 05-03 approach: Option B** — Hub keeps thin local re-export stubs in `src/server/db/schema/` that re-export from `@minion-stack/db`. drizzle-kit reads hub-local `.ts` stubs (which it can find), and those stubs re-export the Drizzle table definitions from the package. This satisfies both drizzle-kit's schema discovery requirement and the single-source-of-truth goal.

## Publish Outcome (Task 3 — Complete)

`@minion-stack/db@0.2.0` is live on npm. The changeset version bump applied as a minor bump to `0.2.0` because `0.1.0` had already been published in a prior session.

```
npm view @minion-stack/db → 0.2.0
files: includes "src", "dist", "README.md"
exports: ".", "./schema", "./auth", "./relations", "./utils"
```

`packages/db/package.json` now reflects version `0.2.0`. The `CHANGELOG.md` was generated by `pnpm changeset version`.

## Issues Encountered

- Hub's drizzle journal only covered migrations 0-7 despite 12 SQL files (0000-0011) existing. Added missing entries 0008-0011 with placeholder timestamps. The actual migration timestamps for 0008-0011 are unknown, so placeholder `1700000008000-1700000011000` values were used.

## Next Phase Readiness

- **Ready:** `@minion-stack/db@0.2.0` live on npm, tsc build confirmed, A1 result documented
- **Plan 05-02** (minion_site consumer): can proceed immediately — install `@minion-stack/db` and update site imports
- **Plan 05-03** (hub migration cutover): uses **Option B** — hub keeps thin local re-export stubs in `src/server/db/schema/` that re-export from `@minion-stack/db`. drizzle-kit reads hub-local stubs for migration runs; TypeScript consumers import from the package directly.

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
*Completed: 2026-04-21*
*A1 result: FAILED → plan 05-03 uses Option B (local re-export stubs)*
