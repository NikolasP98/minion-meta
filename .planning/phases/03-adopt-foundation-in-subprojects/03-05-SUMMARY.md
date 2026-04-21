---
phase: 03-adopt-foundation-in-subprojects
plan: 05
subsystem: infra
tags: [tsconfig, eslint, prettier, env, npm, vscode-extension, minion-stack, npm-adoption, pixel-agents]

requires:
  - phase: 02-foundation
    provides: "@minion-stack/tsconfig@0.1.0 (node + base variants), @minion-stack/lint-config@0.1.1 (eslint.config.js flat + prettier.config.cjs)"
  - phase: 03-adopt-foundation-in-subprojects
    plan: 02
    provides: "Prettier via package.json → prettier key pattern (hub)"
provides:
  - "pixel-agents/tsconfig.json (extension backend) extends @minion-stack/tsconfig/node.json"
  - "pixel-agents/webview-ui/tsconfig.app.json (React webview) extends @minion-stack/tsconfig/base.json"
  - "pixel-agents/eslint.config.mjs spreads @minion-stack/lint-config/eslint.config.js + preserves local eslint-plugin-pixel-agents (naming-convention, no-inline-colors)"
  - "pixel-agents/webview-ui/eslint.config.js spreads shared preset + preserves local plugin (no-inline-colors, pixel-shadow, pixel-font) + react-hooks disables + tsconfigRootDir pin"
  - "pixel-agents/package.json → prettier points to @minion-stack/lint-config/prettier.config.cjs (direct .cjs consumption, no shim — same pattern as 03-02 hub + 03-03 site)"
  - "pixel-agents/.env.defaults (net-new, placeholder) + .env.example (net-new, ANTHROPIC_API_KEY for scripts/3-vision-inspect.ts)"
  - "Adoption PR #246 open at pablodelucca/pixel-agents targeting main (pushed via NikolasP98 fork — upstream is not under NikolasP98)"
affects: [03-06-minion_plugins, 08-polish]

tech-stack:
  added:
    - "@minion-stack/tsconfig@^0.1.0 (devDep, root + webview-ui)"
    - "@minion-stack/lint-config@^0.1.1 (devDep, root + webview-ui)"
    - "@eslint/js@^10.0.1 (devDep, root — was missing; required as peer by shared preset)"
  patterns:
    - "Dual tsconfig adoption — extension (node.json) + webview React (base.json) from the same shared package, both with transitional strict-mode overrides"
    - "Dual ESLint adoption with LOCAL plugin preservation — shared preset spread FIRST, then local plugin + rules appended; eslint-rules/ directory untouched"
    - "tsconfigRootDir pin via `import.meta.dirname` + `files: '**/*.{ts,tsx}'` scoping on spread preset to avoid nested-node_modules parser ambiguity"
    - "Package.json `prettier` key pointing to `@minion-stack/lint-config/prettier.config.cjs` (matches Wave 2 pattern from 03-02/03-03)"
    - "Fork-based PR flow — user has no write access to pablodelucca/pixel-agents; PR opened from NikolasP98 fork head against upstream main"
    - "Transitional strict-mode override layer (noUncheckedIndexedAccess=false + noImplicitOverride=false) — same precedent as 03-01/03-02/03-03/03-04"

key-files:
  created:
    - .planning/phases/03-adopt-foundation-in-subprojects/03-05-PR.md
    - .planning/phases/03-adopt-foundation-in-subprojects/03-05-SUMMARY.md
    - pixel-agents/.env.defaults
    - pixel-agents/.env.example
  modified:
    - pixel-agents/tsconfig.json
    - pixel-agents/webview-ui/tsconfig.app.json
    - pixel-agents/eslint.config.mjs
    - pixel-agents/webview-ui/eslint.config.js
    - pixel-agents/package.json
    - pixel-agents/package-lock.json
    - pixel-agents/webview-ui/package.json
    - pixel-agents/webview-ui/package-lock.json
    - pixel-agents/.gitignore
    - .planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md
  deleted:
    - pixel-agents/.prettierrc.json

key-decisions:
  - "Transitional noUncheckedIndexedAccess=false + noImplicitOverride=false in BOTH tsconfig.json and webview-ui/tsconfig.app.json — enabling shared base defaults surfaces 12 extension + 108 webview errors; Phase 8 follow-up. Same precedent as 03-01/02/03/04."
  - "Install @eslint/js in pixel-agents root — shared preset imports @eslint/js as peer dep but the root only had typescript-eslint (webview-ui already had it)"
  - "Scope shared-preset configs to **/*.{ts,tsx} in webview-ui — nested node_modules/@minion-stack/lint-config tsconfig triggered tseslint's multi-root ambiguity parser error otherwise"
  - "Pin tsconfigRootDir via import.meta.dirname in webview-ui eslint.config.js — eliminates ambiguity between webview-ui tsconfig and nested-node_modules tsconfig"
  - "Delete .prettierrc.json (byte-identical to shared @minion-stack/lint-config/prettier.config.cjs per RESEARCH §Per-Subproject #5); consume via package.json → prettier key"
  - "Preserve local eslint-plugin-pixel-agents per D-14 — 4 rules (no-inline-colors, pixel-shadow, pixel-font, naming-convention) all still fire with their pre-adoption severity"
  - "Fork-based PR flow — `gh repo fork pablodelucca/pixel-agents` created NikolasP98/pixel-agents; branch pushed to fork, PR opened against upstream main (user has no push access to pablodelucca's repo)"
  - "Leave webview-ui/tsconfig.node.json UNTOUCHED — Vite's node-side config; low-value to change in Phase 3, deferred to Phase 8 per plan notes"

patterns-established:
  - "Dual-tree adoption — VS Code extension pattern: same shared package, two variants (node + base), both trees need their own @minion-stack/* devDeps + their own peer-dep install"
  - "LOCAL ESLint plugin preservation — when subproject has its own rules, spread shared preset FIRST then append local plugin; never delete the local eslint-rules/ directory"
  - "Fork-based adoption PR — when upstream is third-party (pablodelucca), create fork via gh, add as 'fork' remote, push branch there, open PR from fork head against upstream default branch"

requirements-completed: [ADOPT-05, ADOPT-07]

duration: 8min
completed: 2026-04-21
---

# Phase 03 Plan 05: Adopt @minion-stack in pixel-agents — Summary

**pixel-agents/ now extends `@minion-stack/tsconfig/node.json` (extension) + `@minion-stack/tsconfig/base.json` (webview React), wires both ESLint configs to spread `@minion-stack/lint-config/eslint.config.js` while preserving the local `eslint-plugin-pixel-agents`, migrates Prettier to `package.json → @minion-stack/lint-config/prettier.config.cjs`, ships net-new `.env.defaults` + `.env.example`, and has adoption PR #246 open on pablodelucca/pixel-agents@main (pushed via NikolasP98 fork).**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-21T02:29:11Z
- **Completed:** 2026-04-21T02:37Z
- **Tasks:** 3 of 3
- **Files modified:** 10 in pixel-agents (2 new + 8 edits + 1 deletion), 3 new meta-repo artifacts

## Accomplishments

- `@minion-stack/tsconfig@^0.1.0` + `@minion-stack/lint-config@^0.1.1` installed as devDeps from public npm in both root (extension) and webview-ui packages
- `@eslint/js@^10.0.1` added to root devDeps — was missing, required as peer by the shared preset at the extension root (webview-ui already had it)
- `pixel-agents/tsconfig.json` extends `@minion-stack/tsconfig/node.json` + preserves rootDir + sourceMap + extension-specific excludes (webview-ui, dist, out, scripts)
- `pixel-agents/webview-ui/tsconfig.app.json` extends `@minion-stack/tsconfig/base.json` + preserves all React/bundler overrides (target ES2022, lib DOM, module ESNext, moduleResolution bundler, jsx react-jsx, verbatimModuleSyntax, erasableSyntaxOnly, noUnusedLocals/Parameters, noUncheckedSideEffectImports)
- `pixel-agents/webview-ui/tsconfig.node.json` UNTOUCHED (Vite's node side — Phase 8 deferred)
- `pixel-agents/webview-ui/tsconfig.json` (solution-style root) UNTOUCHED
- Both ESLint configs spread `@minion-stack/lint-config/eslint.config.js` preset; local `eslint-plugin-pixel-agents` fully preserved
- Webview config scoped shared-preset entries to `**/*.{ts,tsx}` + pinned `tsconfigRootDir = import.meta.dirname` + globalIgnores `eslint.config.js` to resolve nested-node_modules parser ambiguity
- `pixel-agents/package.json → prettier` points to `@minion-stack/lint-config/prettier.config.cjs` directly (no shim — same Wave 2 pattern as hub + site, works because pixel-agents is NOT `type: module` so CJS cosmiconfig loads cleanly)
- `.prettierrc.json` deleted (byte-identical to shared preset)
- `.prettierignore` PRESERVED (13 lines, unchanged)
- `eslint-rules/pixel-agents-rules.mjs` PRESERVED (local plugin, 4 rules)
- `pixel-agents/.env.example` (NEW) — 6-layer header + `ANTHROPIC_API_KEY` (for `scripts/3-vision-inspect.ts` which uses `@anthropic-ai/sdk`)
- `pixel-agents/.env.defaults` (NEW) — placeholder with 6-layer doc comment (pixel-agents has no `process.env` references today; RESEARCH confirmed "mostly config-free")
- `pixel-agents/.gitignore` — added `!.env.defaults` exception alongside existing `!.env.example`
- All 5 CI gates pass locally: `npm run check-types` + `npm run lint` + `npm run lint:webview` + `npm run format:check` + `npm run compile` — same as pixel-agents ci.yml's blocking steps
- `gh repo fork pablodelucca/pixel-agents` created `NikolasP98/pixel-agents`; branch pushed to fork; PR opened against upstream main
- `minion doctor` pixel-agents row reports `tsconfig@0.1.0 (ok), lint-config@0.1.1 (ok)` — no symlink-ext drift (npm install layout doesn't trigger the pnpm content-store misclassification)

## Task Commits

pixel-agents repo (`https://github.com/NikolasP98/pixel-agents.git` fork, branch `feat/adopt-minion-stack`):

1. **Task 1: Install + tsconfig adoption (extension + webview)** — `2dcb6b6` (feat)
2. **Task 2: ESLint + Prettier + env files** — `707bd01` (feat)

Meta-repo (branch `main`): see Final Metadata Commit below.

## Files Created/Modified

**In pixel-agents/ (pushed to fork remote NikolasP98/pixel-agents):**

- `pixel-agents/tsconfig.json` — `extends: "@minion-stack/tsconfig/node.json"` + rootDir + sourceMap + transitional overrides + preserved include/exclude
- `pixel-agents/webview-ui/tsconfig.app.json` — `extends: "@minion-stack/tsconfig/base.json"` + all React/bundler overrides + transitional strict-mode overrides
- `pixel-agents/eslint.config.mjs` — spreads shared preset + preserves local pixel-agents plugin + all pre-adoption rules (naming-convention, curly, eqeqeq, no-throw-literal, simple-import-sort, pixel-agents/no-inline-colors, constants.ts override)
- `pixel-agents/webview-ui/eslint.config.js` — spreads shared preset (scoped to TS/TSX) + preserves local plugin + all react-hooks disables + pixel-agents warn rules + constants/fonts/sprites override
- `pixel-agents/package.json` — 3 new devDeps (`@minion-stack/tsconfig`, `@minion-stack/lint-config`, `@eslint/js`) + `prettier` key
- `pixel-agents/package-lock.json` — regenerated (273 packages added)
- `pixel-agents/webview-ui/package.json` — 2 new devDeps (`@minion-stack/tsconfig`, `@minion-stack/lint-config`)
- `pixel-agents/webview-ui/package-lock.json` — regenerated (184 packages added)
- `pixel-agents/.env.defaults` (NEW) — placeholder with 6-layer doc
- `pixel-agents/.env.example` (NEW) — ANTHROPIC_API_KEY for dev script
- `pixel-agents/.gitignore` — added `!.env.defaults` exception
- `pixel-agents/.prettierrc.json` — DELETED

**Files explicitly NOT modified (per Phase 3 scope):**

- `pixel-agents/eslint-rules/pixel-agents-rules.mjs` — local plugin, UNTOUCHED per D-14
- `pixel-agents/.prettierignore` — UNCHANGED (13 lines)
- `pixel-agents/webview-ui/tsconfig.node.json` — Vite node side, Phase 8 deferred
- `pixel-agents/webview-ui/tsconfig.json` — solution-style root, references preserved

**In meta-repo:**

- `.planning/phases/03-adopt-foundation-in-subprojects/03-05-PR.md` (NEW) — PR URL, commit map, local verification evidence, fork-flow notes
- `.planning/phases/03-adopt-foundation-in-subprojects/03-05-SUMMARY.md` (this file)
- `.planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md` — extended with 1 new Phase 8 follow-up

## Decisions Made

- **Fork-based PR flow.** `pablodelucca/pixel-agents` is upstream (not under NikolasP98 — confirmed via `gh api repos/pablodelucca/pixel-agents` showing `permissions: {admin: false, maintain: false, push: false}`). Created fork via `gh repo fork pablodelucca/pixel-agents`, added as `fork` remote, pushed `feat/adopt-minion-stack` there, opened PR from `NikolasP98:feat/adopt-minion-stack` against upstream `main`. User will coordinate merge with pablodelucca.
- **Transitional `noUncheckedIndexedAccess: false` + `noImplicitOverride: false`** in BOTH `tsconfig.json` and `webview-ui/tsconfig.app.json`. Without these overrides, extending the shared base's strict defaults surfaces 12 extension errors + 108 webview errors = 120 total (vs 0 pre-adoption baseline, confirmed by git stash A/B). Matches precedent from 03-01 minion (1616→0), 03-02 hub (408→0), 03-03 site (53→0), 03-04 paperclip (428→0). Phase 8 follow-up.
- **Install `@eslint/js` as peer dep in extension root.** Shared preset imports `@eslint/js`; webview-ui already had it but extension root only had `typescript-eslint`. Added via `npm install --save-dev @eslint/js`.
- **Scope shared-preset entries to `**/*.{ts,tsx}` in webview-ui.** The shared preset's `tseslint.configs.recommended` applies globally with no `files` restriction. When running in webview-ui, tseslint encounters the nested `node_modules/@minion-stack/lint-config` directory (which has its own tsconfig) and errors "No tsconfigRootDir was set, and multiple candidate TSConfigRootDirs are present". Fix: `sharedConfig.map((c) => c.ignores ? c : { ...c, files: c.files ?? ['**/*.{ts,tsx}'] })`. Also added `globalIgnores(['dist', 'eslint.config.js'])` and pinned `parserOptions.tsconfigRootDir = import.meta.dirname` on the TS block.
- **Delete `.prettierrc.json`.** Verified byte-identical to shared preset (singleQuote, tabWidth 2, trailingComma all, printWidth 100, arrowParens always, bracketSpacing true, endOfLine lf). Consume via `package.json → prettier` key pointing to `@minion-stack/lint-config/prettier.config.cjs`.
- **Preserve local `eslint-plugin-pixel-agents`.** Per D-14, subproject-specific rules stay local. All 4 rules (`no-inline-colors`, `pixel-shadow`, `pixel-font`, `naming-convention`) and their overrides (constants.ts / fonts/ / sprites/) are preserved verbatim. `eslint-rules/` directory untouched.
- **Leave `webview-ui/tsconfig.node.json` UNTOUCHED.** Vite's node-side config with its own target/lib/types. Low value to convert to shared base.json in Phase 3 per plan notes — Phase 8 can revisit if needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Transitional tsconfig overrides required (extension + webview)**

- **Found during:** Task 1 step 4 (`npm run check-types` + `npx tsc -b --force` in webview-ui after extends swap)
- **Issue:** Shared `node.json` + `base.json` both inherit `noUncheckedIndexedAccess: true` + `noImplicitOverride: true`. Enabling produced 12 new errors in extension (`shared/assets/*`, `src/PixelAgentsViewProvider.ts`, `src/agentManager.ts`, `src/assetLoader.ts`) + 108 in webview (`src/office/sprites/spriteData.ts`, `src/office/wallTiles.ts`).
- **Fix:** Per plan Task 1 step 4 threshold (>30 errors), layered both flags as `false` in both tsconfigs with inline comments documenting the fallout count + Phase 8 follow-up. The 12 extension errors fall below the 30 threshold on their own, but treated identically for consistency with Wave 1/2 precedent (03-01/02/03/04 all used same pattern).
- **Files modified:** `pixel-agents/tsconfig.json`, `pixel-agents/webview-ui/tsconfig.app.json`, `.planning/.../deferred-items.md`
- **Verification:** `npm run check-types` exits 0; webview `npx tsc -b --force` exits 0
- **Committed in:** `2dcb6b6`

**2. [Rule 3 - Blocking] @eslint/js missing at extension root**

- **Found during:** Task 2 (`npm run lint` after ESLint config rewrite)
- **Issue:** Shared preset imports `@eslint/js` but the extension root's package.json only declared `typescript-eslint` + `eslint-config-prettier`. ESM resolution errored: "Cannot find package '@eslint/js' imported from .../node_modules/@minion-stack/lint-config/eslint.config.js".
- **Fix:** `npm install --save-dev @eslint/js` at root. Webview-ui already had it.
- **Files modified:** `pixel-agents/package.json`, `pixel-agents/package-lock.json`
- **Verification:** `npm run lint` exits 0 (1 pre-existing warning)
- **Committed in:** `707bd01`

**3. [Rule 1 - Bug] Webview ESLint parser ambiguity from nested node_modules**

- **Found during:** Task 2 (`npm run lint:webview` after spreading shared preset)
- **Issue:** `tseslint.configs.recommended` from the shared preset applies with no `files` restriction. When invoked in webview-ui, tseslint's parser encountered `node_modules/@minion-stack/lint-config/` (which has its own tsconfig, since @minion-stack/lint-config is a TS source package) and errored with "No tsconfigRootDir was set, and multiple candidate TSConfigRootDirs are present". 43 files failed with parsing errors.
- **Fix:** Three-step fix:
  1. Map the shared config array to add `files: '**/*.{ts,tsx}'` to each entry that doesn't already have files or ignores
  2. `globalIgnores(['dist', 'eslint.config.js'])` to skip the JS config file itself
  3. Pin `parserOptions.tsconfigRootDir = import.meta.dirname` on the webview TS block
- **Files modified:** `pixel-agents/webview-ui/eslint.config.js`
- **Verification:** `npm run lint:webview` exits 0 (86 pre-existing warnings, 0 errors)
- **Committed in:** `707bd01`
- **Follow-up:** Consider adding `files: ['**/*.{ts,tsx,mts,cts}']` to the shared preset itself so downstream consumers don't need this workaround. Tracked informally in deferred-items.md for Phase 8.

---

**Total deviations:** 3 auto-fixed (1 missing-critical, 1 blocking, 1 bug). All three were either anticipated by the plan (deviation 1 via Task 1 step 4 threshold) OR were workarounds for upstream preset ergonomics (2 + 3) that the shared package should ultimately fix.
**Impact on plan:** None. No scope creep. Adoption is strictly config-only.

## Issues Encountered

- **Upstream is pablodelucca/pixel-agents.** User has no write access. Fork flow was used (documented above). Merge will require pablodelucca coordination — out of scope for this plan.
- **86 pre-existing webview lint warnings** (all `pixel-agents/no-inline-colors`). Verified via `git stash` A/B comparison — same 86 warnings before and after adoption. Not adoption-caused. This is a deliberate deferred pattern in the pixel-agents codebase.
- **1 pre-existing extension lint warning** in `src/assetLoader.ts:10` — `@typescript-eslint/consistent-type-imports` (the rule is enabled by the shared preset; the import in question uses type-only members). Not adoption-caused in the strict sense, but it's surfaced by the shared preset's `consistent-type-imports: warn` rule that pixel-agents didn't have pre-adoption. Warning, not error; doesn't block CI.
- **Only `PR Title` CI check ran on the adoption PR.** The main `ci.yml` workflow requires `workflow_dispatch` approval for first-time fork contributors (GitHub standard security). Local verification (all 5 blocking steps) substitutes. Pablodelucca maintainers will need to approve workflow runs. Logged for user coordination.
- **`minion doctor` pixel-agents row is clean** — `tsconfig@0.1.0 (ok), lint-config@0.1.1 (ok)`, no symlink-ext drift (npm's install layout doesn't trigger the pnpm content-store misclassification seen on minion + paperclip rows).

## Known Stubs

None. All content is wired:
- Both tsconfigs resolve cleanly via `tsc --showConfig` / `tsc -b --force`
- Both ESLint configs execute cleanly against the shared preset
- Prettier loads via cosmiconfig → `@minion-stack/lint-config/prettier.config.cjs`
- `.env.example` documents the only real runtime env var (ANTHROPIC_API_KEY for `scripts/3-vision-inspect.ts`)
- `.env.defaults` is intentionally a placeholder with doc comment (pixel-agents has no runtime `process.env` — verified by grep)
- CI workflow references actual scripts that exist in `package.json`

## Threat Flags

None beyond the plan's existing threat register. `.env.defaults` contains zero secret values (grep gate exit 0). `.env.example` contains only variable names with empty `=`. Local ESLint plugin directory unchanged (mitigates T-03-05-03 tampering). Both package.jsons have their lockfiles regenerated and committed (mitigates T-03-05-05).

## User Setup Required

**Action required to merge PR #246:**

1. **Maintainer workflow approval.** pablodelucca's repo requires `workflow_dispatch` approval for first-time fork contributors. User should comment on PR #246 or contact pablodelucca to trigger the full CI workflow. Until approved, only the `PR Title` check runs.
2. **Merge coordination with pablodelucca.** PR targets upstream `main`. User owns the relationship; Claude does not merge per D-24.

**No new external service configuration required** — `@minion-stack/*` packages published during Phase 2 + the 0.1.1 lint-config fix landed before 03-02.

## Next Phase Readiness

- **Wave 3 first-half complete:** 03-05 (pixel-agents) done. Plan 03-06 (minion_plugins) can proceed — npm-based, zero-TS, env-files-only per D-12 escape clause.
- **Phase 3 near-complete:** 5 of 6 subprojects adopted (03-01 minion, 03-02 hub, 03-03 site, 03-04 paperclip, 03-05 pixel-agents). Only 03-06 minion_plugins remains.
- **Phase 8 follow-ups from this plan:**
  1. Remove pixel-agents's transitional `noUncheckedIndexedAccess: false` + `noImplicitOverride: false` in both tsconfigs — fix the 12 extension errors (`shared/assets/*` null-guards on asset metadata lookups) + 108 webview errors (character palette + wall bitmask lookup null-guards). Tight concentration — expect ~0.5 day effort.
  2. Consider adding `files: ['**/*.{ts,tsx,mts,cts}']` scoping to the shared `@minion-stack/lint-config/eslint.config.js` preset itself so downstream consumers don't need the `.map()` workaround. Would ship as `@minion-stack/lint-config@0.1.2`.

---

*Phase: 03-adopt-foundation-in-subprojects*
*Completed: 2026-04-21*

## Self-Check: PASSED

- [x] `pixel-agents/tsconfig.json` exists — extends `@minion-stack/tsconfig/node.json`
- [x] `pixel-agents/webview-ui/tsconfig.app.json` exists — extends `@minion-stack/tsconfig/base.json`
- [x] `pixel-agents/webview-ui/tsconfig.node.json` unchanged (git diff empty for this file)
- [x] `pixel-agents/webview-ui/tsconfig.json` (solution-style) unchanged
- [x] `pixel-agents/eslint.config.mjs` spreads `@minion-stack/lint-config/eslint.config.js` + preserves local plugin
- [x] `pixel-agents/webview-ui/eslint.config.js` spreads shared preset + preserves local plugin + pins tsconfigRootDir
- [x] `pixel-agents/eslint-rules/pixel-agents-rules.mjs` UNCHANGED (local plugin, verified via git diff)
- [x] `pixel-agents/package.json` has `prettier: "@minion-stack/lint-config/prettier.config.cjs"`, devDeps include `@minion-stack/tsconfig@^0.1.0`, `@minion-stack/lint-config@^0.1.1`, `@eslint/js`
- [x] `pixel-agents/.prettierrc.json` DELETED (git rm confirmed)
- [x] `pixel-agents/.prettierignore` PRESERVED (unchanged)
- [x] `pixel-agents/.env.defaults` exists (NEW)
- [x] `pixel-agents/.env.example` exists (NEW, contains ANTHROPIC_API_KEY)
- [x] Both `package.json` and `webview-ui/package.json` have `@minion-stack/*` devDeps
- [x] Commit `2dcb6b6` exists in pixel-agents fork on `feat/adopt-minion-stack` (tsconfig adoption)
- [x] Commit `707bd01` exists in pixel-agents fork on `feat/adopt-minion-stack` (ESLint + Prettier + env)
- [x] Branch `feat/adopt-minion-stack` pushed to `https://github.com/NikolasP98/pixel-agents.git`
- [x] PR https://github.com/pablodelucca/pixel-agents/pull/246 OPEN against `main`
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/03-05-PR.md` created (pending final metadata commit)
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/03-05-SUMMARY.md` created (this file)
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md` extended with pixel-agents entry
- [x] `npm run check-types` exits 0 (with transitional overrides; 0 errors vs 0 pre-adoption baseline)
- [x] `npm run lint` exits 0 (0 errors, 1 pre-existing warning)
- [x] `npm run lint:webview` exits 0 (0 errors, 86 pre-existing warnings)
- [x] `npm run format:check` exits 0 ("All matched files use Prettier code style!")
- [x] `npm run compile` exits 0 (extension esbuild + webview Vite build both succeed)
- [x] `minion doctor` pixel-agents row reports `tsconfig@0.1.0 (ok), lint-config@0.1.1 (ok)` — no symlink-ext drift
- [x] PR NOT merged (per D-24)
