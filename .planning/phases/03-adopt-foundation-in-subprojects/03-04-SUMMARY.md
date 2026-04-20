---
phase: 03-adopt-foundation-in-subprojects
plan: 04
subsystem: infra
tags: [tsconfig, prettier, env, pnpm, minion-stack, npm-adoption, paperclip]

requires:
  - phase: 02-foundation
    provides: "@minion-stack/tsconfig@0.1.0 (node variant), @minion-stack/lint-config@0.1.0 (prettier.config.js)"
provides:
  - "paperclip-minion/tsconfig.base.json extends @minion-stack/tsconfig/node.json with transitional strict-mode overrides"
  - "paperclip-minion/.env.defaults (new, non-secret) + expanded .env.example from 4 to 85+ vars"
  - "paperclip-minion/prettier.config.cjs shim (works around @minion-stack/lint-config CJS/ESM mismatch)"
  - "Adoption PR #1 open at NikolasP98/paperclip targeting minion-integration"
affects: [03-02-minion_hub, 03-03-minion_site, 03-05-pixel-agents, 03-06-minion_plugins, 08-polish]

tech-stack:
  added:
    - "@minion-stack/tsconfig@^0.1.0 (devDep, workspace root)"
    - "@minion-stack/lint-config@^0.1.0 (devDep, workspace root)"
    - "prettier@^3.0.0 (devDep, workspace root)"
    - "@types/node@^24.6.0 (devDep, packages/shared — was the only workspace package missing it)"
  patterns:
    - "Solution-style tsconfig adoption: extend @minion-stack/tsconfig/node.json from the INHERITANCE ROOT (tsconfig.base.json), NOT the solution root (tsconfig.json)"
    - "Transitional override layer on tsconfig.base.json for pre-existing code that can't meet shared preset strictness in one PR"
    - "Local prettier.config.cjs shim for ESM-typed consumers of a CJS shared config"
    - "Adoption PR targets minion-integration (long-lived fork branch), CI does not auto-run (acknowledged, local verification substitutes)"

key-files:
  created:
    - .planning/phases/03-adopt-foundation-in-subprojects/03-04-PR.md
    - .planning/phases/03-adopt-foundation-in-subprojects/03-04-ISSUES.md
    - paperclip-minion/.env.defaults
    - paperclip-minion/prettier.config.cjs
  modified:
    - paperclip-minion/tsconfig.base.json
    - paperclip-minion/package.json
    - paperclip-minion/packages/shared/package.json
    - paperclip-minion/.env.example
    - .planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md

key-decisions:
  - "Target tsconfig.base.json (not root tsconfig.json) — paperclip's root is solution-style with only references; base.json is the inheritance root for server + 11 sub-packages"
  - "Layer transitional noUncheckedIndexedAccess=false + noImplicitOverride=false — enabling shared base defaults surfaces 428 errors across 13/21 packages; Phase 8 cleanup"
  - "Prettier-only adoption in Phase 3 — paperclip has no linter today; oxlint/ESLint deferred to Phase 8"
  - "Leave ui/tsconfig.json UNCHANGED — React+bundler variant pending in shared tsconfig (Phase 8 backlog per RESEARCH Open Q#3)"
  - "Create local prettier.config.cjs shim — @minion-stack/lint-config@0.1.0 ships CJS Prettier config in an ESM-typed package, breaking direct reference"
  - "Add @types/node to @paperclipai/shared — node.json variant declares types: ['node'], and shared was the only workspace package lacking this devDep"
  - "Do NOT commit pnpm-lock.yaml — paperclip PR policy blocks lockfile edits (though policy only triggers on master-base PRs; followed for operational consistency)"

patterns-established:
  - "Shared config adoption in multi-tsconfig pnpm workspaces: extend from the tsconfig.base.json (inheritance root), not the solution-style root"
  - "Adoption PR per subproject (feat/adopt-minion-stack) targeting its default integration branch via fork remote"
  - "Local inline-value shim when shared config has CJS/ESM packaging bugs — byte-for-byte copy with tracking issue for upstream fix"

requirements-completed: [ADOPT-04, ADOPT-07]

duration: 16min
completed: 2026-04-20
---

# Phase 03 Plan 04: Adopt @minion-stack in paperclip-minion — Summary

**paperclip-minion now extends `@minion-stack/tsconfig/node.json` via `tsconfig.base.json` (inheritance-root pattern), wires Prettier via a local CJS shim, ships `.env.defaults`, expands `.env.example` from 4 to 85+ vars, and has adoption PR #1 open on NikolasP98/paperclip@minion-integration.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-04-20T22:28:06Z
- **Completed:** 2026-04-20T22:45:00Z
- **Tasks:** 3 of 3
- **Files modified:** 6 in paperclip-minion (2 new + 4 edits), 4 meta-repo artifacts (2 new + 2 edits)

## Accomplishments

- `@minion-stack/tsconfig@^0.1.0` + `@minion-stack/lint-config@^0.1.0` + `prettier@^3.0.0` installed as devDeps at workspace root via `pnpm add -D -w`
- `paperclip-minion/tsconfig.base.json` extends the shared node variant while preserving all 6 paperclip-specific overrides (declaration, declarationMap, sourceMap, outDir, rootDir, isolatedModules)
- 21 of 21 workspace packages typecheck clean via transitive `extends` inheritance
- `paperclip-minion/.env.defaults` (net-new) ships 6 non-secret defaults harvested from `process.env.X ?? "..."` patterns
- `paperclip-minion/.env.example` expanded from 4 vars to 85+ covering every `process.env.*` reference in source + Infisical `minion-paperclip` vars (Twilio, GitHub, OpenClaw gateway, LLM adapters, agent JWT, storage, telemetry, secrets provider)
- Feature branch `feat/adopt-minion-stack` pushed to `git@github.com:NikolasP98/paperclip.git` (fork remote) with 2 atomic commits
- PR #1 opened against `minion-integration`

## Task Commits

paperclip-minion repo (`git@github.com:NikolasP98/paperclip.git`, branch `feat/adopt-minion-stack`):

1. **Task 1: Install + tsconfig.base.json adoption** — `89635bb6` (feat)
2. **Task 2: Prettier shim + env files** — `f11bf290` (feat)

Meta-repo (branch `main`): see Final Metadata Commit below.

## Files Created/Modified

**In paperclip-minion/ (pushed to fork remote):**

- `paperclip-minion/tsconfig.base.json` — `extends: "@minion-stack/tsconfig/node.json"` + 6 preserved compilerOptions + 2 transitional overrides
- `paperclip-minion/package.json` — `@minion-stack/tsconfig@^0.1.0` + `@minion-stack/lint-config@^0.1.0` + `prettier@^3` devDeps + `format` + `format:check` scripts
- `paperclip-minion/packages/shared/package.json` — added `@types/node@^24.6.0` devDep (was the only workspace package missing it)
- `paperclip-minion/prettier.config.cjs` (NEW) — inlines @minion-stack/lint-config values (CJS/ESM shim)
- `paperclip-minion/.env.defaults` (NEW) — PORT, SERVE_UI, PAPERCLIP_MIGRATION_PROMPT, PAPERCLIP_MIGRATION_AUTO_APPLY, PAPERCLIP_TELEMETRY_DISABLED, DO_NOT_TRACK
- `paperclip-minion/.env.example` — rewritten header documents 6-layer resolution; expanded from 4 vars to 85+ grouped by domain

**Files explicitly NOT modified (per Phase 3 scope):**

- `paperclip-minion/tsconfig.json` (root solution-style) — references to 14 workspace packages preserved intact
- `paperclip-minion/server/tsconfig.json` — inherits shared config transitively via `../tsconfig.base.json`
- `paperclip-minion/ui/tsconfig.json` — React+bundler, deferred to Phase 8 (React variant pending in shared tsconfig)
- `paperclip-minion/pnpm-lock.yaml` — excluded from commit per paperclip PR policy

**In meta-repo:**

- `.planning/phases/03-adopt-foundation-in-subprojects/03-04-PR.md` — PR URL, local verification evidence, CI gap note
- `.planning/phases/03-adopt-foundation-in-subprojects/03-04-ISSUES.md` — transitional override rationale, 13 affected packages cataloged, @types/node addition, CJS/ESM shim documentation
- `.planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md` — extended with 3 new Phase 8 follow-ups (paperclip strict-mode, lint-config CJS/ESM bug, paperclip CI minion-integration gap)

## Decisions Made

- **Target `tsconfig.base.json` not `tsconfig.json`.** Paperclip's root is solution-style (`files: []`, `references: [14 paths]`, no `compilerOptions`). The inheritance root for server + 11 sub-packages is `tsconfig.base.json`. Per RESEARCH gotcha #1 + D-10, this is the correct adoption target.
- **Transitional `noUncheckedIndexedAccess: false` + `noImplicitOverride: false`** in `tsconfig.base.json`. Without them, enabling the shared base surfaces 428 strict-mode warnings across 13 of 21 workspace packages — mostly `TS18048 possibly undefined` on drizzle `.returning()` results. Scope-creep refactor; documented in 03-04-ISSUES.md for Phase 8.
- **Prettier via local `.cjs` shim.** `@minion-stack/lint-config@0.1.0/prettier.config.js` uses CJS `module.exports` inside a `type: "module"` package. Paperclip is also ESM-typed. Both `package.json → prettier` string reference and a `require()`-shim fail with _"module is not defined in ES module scope"_. Inlined the 14-line config into a local `.cjs`. Upstream fix tracked.
- **Added `@types/node` to `packages/shared`.** The node.json variant declares `types: ["node"]`; shared was the only package in the workspace lacking that devDep. Minimal additive change, matches the pattern of the 14 other paperclip packages.
- **Did NOT commit `pnpm-lock.yaml`.** Paperclip's `pr.yml` policy job blocks manual lockfile commits for PRs to `master`. Our PR targets `minion-integration` (policy doesn't trigger), but followed the convention for operational consistency.
- **Prettier-only in Phase 3.** Paperclip has no linter today. Adding oxlint or ESLint is out-of-scope per D-13/D-14 + RESEARCH RESOLVED Open Q#2. Phase 8 will layer full linting.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] @paperclipai/shared missing @types/node**

- **Found during:** Task 1 (`pnpm -r typecheck` after extends swap)
- **Issue:** `packages/shared/tsconfig.json` extends `../../tsconfig.base.json`, which now inherits `types: ["node"]` from the shared node.json variant. But `packages/shared/package.json` lacked `@types/node` in devDependencies (every other workspace package had it). Error: `TS2688: Cannot find type definition file for 'node'`.
- **Fix:** Added `@types/node@^24.6.0` to `packages/shared/package.json` (matching the version used across all other paperclip packages).
- **Files modified:** `paperclip-minion/packages/shared/package.json`
- **Verification:** After `pnpm install` + re-running `pnpm -r typecheck`, `packages/shared` succeeds.
- **Committed in:** `89635bb6`

**2. [Rule 2 - Missing Critical] Transitional tsconfig overrides required**

- **Found during:** Task 1 step 3 (`pnpm -r typecheck` after adding @types/node fix)
- **Issue:** Shared `base.json` sets `noUncheckedIndexedAccess: true` + `noImplicitOverride: true`. Enabling them in paperclip produced **428 type errors across 13 of 21 workspace packages** (primarily `TS18048 possibly undefined` on drizzle query results).
- **Fix:** Per plan Task 1 step 3 threshold, layered `noUncheckedIndexedAccess: false` + `noImplicitOverride: false` as transitional overrides in `tsconfig.base.json`. Created `03-04-ISSUES.md` and extended `deferred-items.md` with Phase 8 follow-up plan.
- **Files modified:** `paperclip-minion/tsconfig.base.json`, 2 meta-repo artifacts
- **Verification:** `pnpm -r typecheck` now reports 0 errors across all 21 packages.
- **Committed in:** `89635bb6` (tsconfig) + final metadata commit (artifacts)

**3. [Rule 1 - Bug] @minion-stack/lint-config Prettier CJS/ESM mismatch**

- **Found during:** Task 2 (Prettier smoke-test: `pnpm exec prettier --check package.json`)
- **Issue:** Shared `prettier.config.js` uses `module.exports = {...}` (CJS). The hosting package is `type: "module"`. Both direct reference and `require()` shim fail with _"module is not defined in ES module scope"_. This is a pre-existing upstream bug in `@minion-stack/lint-config@0.1.0`, surfaced by paperclip's ESM `type` setting.
- **Fix:** Created `paperclip-minion/prettier.config.cjs` that inlines the 14-line shared config values byte-for-byte. Removed the `prettier` key from `package.json` (cosmiconfig discovers `.cjs` via filename).
- **Files modified:** `paperclip-minion/prettier.config.cjs` (new), `paperclip-minion/package.json`
- **Verification:** `pnpm exec prettier --check package.json` → _"All matched files use Prettier code style!"_
- **Committed in:** `f11bf290`
- **Follow-up:** Bump `@minion-stack/lint-config` to 0.1.1 with proper CJS Prettier entrypoint BEFORE starting 03-02/03-03 (hub + site are also `type: "module"`). Tracked in deferred-items.md.

---

**Total deviations:** 3 auto-fixed (2 missing-critical, 1 bug — all upstream-surfaced or pre-existing)
**Impact on plan:** All deviations were anticipated by the plan itself OR follow the 03-01 precedent pattern. Adoption is strictly config-only at paperclip scope.

## Issues Encountered

- **Pre-existing vitest postgres cleanup race** on `heartbeat-comment-wake-batching.test.ts`. Tests pass (1187/1187), but an unhandled `Cannot read properties of null (reading 'write')` occasionally surfaces post-run. Pre-adoption tests show the same race (intermittent). Out of scope for Phase 3.
- **Paperclip CI does NOT run on `minion-integration` PRs.** All 6 workflows trigger only on `master`. Local verification (`pnpm install && pnpm -r typecheck && pnpm test:run && pnpm build`) substitutes. Not a regression from adoption — pre-existing fork configuration. Logged in deferred-items.md.
- **`minion doctor`** flags `tsconfig→symlink-ext (drift)` and `lint-config→symlink-ext (drift)` for the paperclip row. Same pnpm content-addressable-store misclassification as 03-01 minion row. Pre-existing link-drift reporting artifact (env@0.1.1 patch from Phase 2 deferred-items.md).

## Known Stubs

None. All env vars in `.env.example` are commented with domain grouping; all tsconfig inheritance resolves; Prettier loads config successfully.

## Threat Flags

None beyond the plan's existing threat register. `.env.defaults` contains only non-secret scalars (verified by grep gate). `.env.example` contains only variable names with empty `=` (no values).

## User Setup Required

None — published `@minion-stack/*@0.1.0` packages came from Phase 2's npm publish step.

**User action for next step:** Review PR #1 at https://github.com/NikolasP98/paperclip/pull/1. Since paperclip CI doesn't run on `minion-integration`-base PRs, manual review + local verification (`pnpm install && pnpm -r typecheck && pnpm test:run && pnpm build`) is recommended before merge. Per D-24, executor does NOT merge.

**Blocker for 03-02 (minion_hub) + 03-03 (minion_site):** `@minion-stack/lint-config@0.1.0` has the CJS/ESM Prettier bug. Both hub and site are `type: "module"` SvelteKit projects. They will hit the same error unless:
- (a) `@minion-stack/lint-config@0.1.1` is published with `prettier.config.cjs` proper first, OR
- (b) hub + site each get a local shim (same pattern as paperclip)

Recommend option (a) before Wave 2 starts.

## Next Phase Readiness

- **Wave 1 complete:** 03-01 (minion) ✅ + 03-04 (paperclip-minion) ✅. Pattern proven for pnpm + Node-server subprojects.
- **Wave 2 (03-02 hub + 03-03 site)** can proceed — BUT, blocker noted above: bump `@minion-stack/lint-config` to 0.1.1 first (fix CJS/ESM) or prepare to add the shim in each.
- **Deferred for Phase 8:** (a) 428-error strict-mode refactor in paperclip, (b) lint-config Prettier CJS fix (upstream 0.1.1), (c) paperclip CI gap on minion-integration branch, (d) `@minion-stack/tsconfig/react` variant for `ui/tsconfig.json`.

---

*Phase: 03-adopt-foundation-in-subprojects*
*Completed: 2026-04-20*

## Self-Check: PASSED

- [x] `paperclip-minion/tsconfig.base.json` exists and extends `@minion-stack/tsconfig/node.json`
- [x] `paperclip-minion/tsconfig.json` (root solution-style) unchanged
- [x] `paperclip-minion/server/tsconfig.json` unchanged
- [x] `paperclip-minion/ui/tsconfig.json` unchanged (Phase 8 deferred)
- [x] `paperclip-minion/package.json` has format + format:check scripts
- [x] `paperclip-minion/packages/shared/package.json` has @types/node devDep
- [x] `paperclip-minion/prettier.config.cjs` exists and loads via cosmiconfig
- [x] `paperclip-minion/.env.defaults` exists with 6 non-secret defaults
- [x] `paperclip-minion/.env.example` expanded (85+ vars, 4 pre-adoption)
- [x] Commit `89635bb6` exists on feat/adopt-minion-stack
- [x] Commit `f11bf290` exists on feat/adopt-minion-stack
- [x] PR https://github.com/NikolasP98/paperclip/pull/1 opened
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/03-04-PR.md` written
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/03-04-ISSUES.md` written
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/03-04-SUMMARY.md` written (this file)
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md` extended with 3 new Phase 8 follow-ups
- [x] `pnpm-lock.yaml` NOT in the adoption commits (verified via `git show --stat feat/adopt-minion-stack`)
- [x] `pnpm -r typecheck` + `pnpm test:run` + `pnpm build` all pass locally
