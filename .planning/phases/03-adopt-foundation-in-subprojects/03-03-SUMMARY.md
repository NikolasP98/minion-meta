---
phase: 03-adopt-foundation-in-subprojects
plan: 03
subsystem: infra
tags: [tsconfig, prettier, env, bun, sveltekit, minion-stack, npm-adoption, site]

requires:
  - phase: 02-foundation
    provides: "@minion-stack/tsconfig@0.1.0 (svelte variant), @minion-stack/lint-config@0.1.1 (prettier.config.cjs — CJS entrypoint)"
  - phase: 03-adopt-foundation-in-subprojects
    plan: 02
    provides: "proven adoption pattern for SvelteKit+bun subprojects (hub) — extends-array + package.json prettier key + separate format sweep + net-new ci.yml"
provides:
  - "minion_site/tsconfig.json uses TS 5.0 extends array: @minion-stack/tsconfig/svelte.json FIRST + ./.svelte-kit/tsconfig.json LAST"
  - "minion_site/package.json → prettier key points to @minion-stack/lint-config/prettier.config.cjs (direct .cjs consumption, no shim — matches 03-02)"
  - "minion_site/.env.defaults (new, 3 non-secret dev scalars) + refreshed .env.example header (6-layer model doc, all 13 pre-adoption var names preserved)"
  - "minion_site/.github/workflows/ci.yml (net-new) — bun install + check + format:check + build"
  - "minion_site/.prettierignore (new) — excludes paraglide generated output, .planning symlink, lock files, binaries"
  - "Adoption PR #2 open at NikolasP98/minion-site targeting master"
affects: [03-05-pixel-agents, 03-06-minion_plugins, 08-polish]

tech-stack:
  added:
    - "@minion-stack/tsconfig@^0.1.0 (devDep)"
    - "@minion-stack/lint-config@^0.1.1 (devDep)"
    - "prettier@^3.0.0 (devDep)"
  patterns:
    - "TypeScript 5.0 extends array with shared svelte variant FIRST and SvelteKit generated tsconfig LAST (last-wins preserves verbatimModuleSyntax, rootDirs, $components, $effects, $ui, $data, $stores, $paraglide, $server, $lib, $app/types paths)"
    - "Prettier wiring via package.json → prettier string reference to @minion-stack/lint-config/prettier.config.cjs — direct .cjs consumption, no shim (the 03-04 paperclip shim workaround is obsolete for Wave 2+ since 0.1.1 ships .cjs correctly)"
    - "Transitional strict-mode override layer (noUncheckedIndexedAccess, noImplicitOverride = false) — same as 03-01 + 03-02 + 03-04"
    - "Separate formatting-only commit to keep adoption diff reviewable when adopting Prettier on an un-formatted codebase (mirrors 03-02's 218-file sweep pattern, 26 files here)"
    - "Net-new minimal ci.yml for subprojects with no pre-existing CI (mirrors 03-02 hub's net-new ci.yml)"

key-files:
  created:
    - .planning/phases/03-adopt-foundation-in-subprojects/03-03-PR.md
    - .planning/phases/03-adopt-foundation-in-subprojects/03-03-ISSUES.md
    - minion_site/.env.defaults
    - minion_site/.prettierignore
    - minion_site/.github/workflows/ci.yml
  modified:
    - minion_site/tsconfig.json
    - minion_site/package.json
    - minion_site/bun.lock
    - minion_site/.env.example
    - minion_site/.gitignore
    - .planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md
    - (+ 26 files formatted by Prettier sweep, formatting-only)

key-decisions:
  - "Consume @minion-stack/lint-config@0.1.1 directly via package.json prettier key — the 0.1.0 CJS/ESM bug that forced paperclip's local shim (03-04) is already fixed; no shim needed for site. Matches 03-02 hub pattern."
  - "Transitional noUncheckedIndexedAccess=false + noImplicitOverride=false — enabling base defaults surfaces 53 errors concentrated in Channels.svelte, DashboardPreview.svelte, HeroParticles.svelte, members/+page.svelte. Phase 8 follow-up. Site fallout is dramatically smaller than hub (408) or paperclip (428)."
  - "Separate formatting sweep commit (26 files) from adoption commits — keeps the logical 3-commit adoption diff reviewable. Same pattern as 03-02 but ~8x smaller sweep."
  - "Add minimal net-new ci.yml — site had no .github/workflows/ pre-adoption; ADOPT-07 requires each subproject's CI to pass, which is impossible if no CI exists. Same pattern as 03-02 hub."
  - "ESLint deferred to Phase 8 per VALIDATION.md Open Q#2 — Prettier-only in Phase 3."
  - "Unignore .env.defaults in .gitignore alongside existing .env.example exception."
  - "Add .prettierignore excluding paraglide generated output (src/paraglide + src/lib/paraglide), .planning symlink (meta-repo content), lock files, and binaries. Site has no drizzle meta, no pixel-office assets (hub-only) — lighter ignore than hub's."

patterns-established:
  - "Wave 2 (bun + SvelteKit) adoption proven twice — hub (03-02) and site (03-03) are structurally identical: extends array ordering, package.json prettier key (no shim), format sweep as separate commit, net-new ci.yml, .prettierignore for generated paths."
  - "Wave 2 structural-copy pattern succeeds without modification — site adoption completed in ~17 min vs hub's 11 min (similar scope, slightly more sweeping since site was starting from zero CI)."

requirements-completed: [ADOPT-03, ADOPT-07]

duration: 17min
completed: 2026-04-21
---

# Phase 03 Plan 03: Adopt @minion-stack in minion_site — Summary

**minion_site/ now extends `@minion-stack/tsconfig/svelte.json` via the TS 5.0 extends array (with `./.svelte-kit/tsconfig.json` last-wins), wires Prettier directly to `@minion-stack/lint-config@0.1.1/prettier.config.cjs` (no shim), ships `.env.defaults`, adds net-new `.github/workflows/ci.yml`, adds `.prettierignore`, and has adoption PR #2 open on NikolasP98/minion-site@master.**

## Performance

- **Duration:** ~17 min (including 2h continuation gap waiting for 1Password SSH unlock)
- **Started:** 2026-04-21 (Task 1 file changes applied earlier; Task 1 commit + Tasks 2-3 resumed at 02:22Z)
- **Completed:** 2026-04-21T02:24:00Z
- **Tasks:** 3 of 3
- **Files modified:** 5 in minion_site + 26 formatted (formatting-only) + 3 new files (`.env.defaults`, `.prettierignore`, `ci.yml`), 3 new meta-repo artifacts

## Accomplishments

- `@minion-stack/tsconfig@^0.1.0` + `@minion-stack/lint-config@^0.1.1` + `prettier@^3.0.0` installed as devDeps from public npm
- `minion_site/tsconfig.json` now extends the TS 5.0 array `["@minion-stack/tsconfig/svelte.json", "./.svelte-kit/tsconfig.json"]` + transitional strict-mode overrides + preserved site-specific options (allowJs, checkJs, sourceMap)
- `bun run check` resolves the full chain; `verbatimModuleSyntax: true` + `rootDirs` + all `$-aliases` preserved from the SvelteKit-generated tsconfig (last-wins)
- `minion_site/package.json → prettier` points to `@minion-stack/lint-config/prettier.config.cjs` directly — no local shim needed (0.1.1 fixes the 0.1.0 CJS/ESM bug paperclip had to work around)
- `format` + `format:check` scripts added; `bun run format:check` passes on the full codebase after the formatting sweep
- `minion_site/.env.defaults` (net-new) with 3 non-secret defaults (`BETTER_AUTH_URL`, `VITE_BETTER_AUTH_URL`, `VITE_GOOGLE_AUTH_ENABLED`)
- `minion_site/.env.example` header rewritten to document the 6-layer resolution model; all 13 pre-adoption var names preserved
- `minion_site/.github/workflows/ci.yml` (net-new) runs `bun install --frozen-lockfile → bun run check → bun run format:check → bun run build` on PRs + pushes to `master`/`main`
- `minion_site/.prettierignore` (net-new) excludes paraglide generated output + `.planning` symlink + lock files + binaries so the shared preset only touches source code
- Feature branch `feat/adopt-minion-stack` pushed to `git@github.com:NikolasP98/minion-site.git` with 4 atomic commits (2 adoption + 1 formatting-only + 1 CI/prettierignore)
- PR https://github.com/NikolasP98/minion-site/pull/2 open against `master`, CI pending

## Task Commits

minion-site repo (`git@github.com:NikolasP98/minion-site.git`, branch `feat/adopt-minion-stack`):

1. **Task 1: Install + tsconfig adoption** — `61677bf` (feat)
2. **Task 2: Prettier wiring + env files** — `3690356` (feat)
3. **Task 3a: Format sweep** — `ef48bc4` (style — formatting-only, 26 files)
4. **Task 3b: CI workflow + prettierignore** — `fca6091` (feat)

Meta-repo (branch `main`): see Final Metadata Commit below.

## Files Created/Modified

**In minion_site/ (pushed to remote):**

- `minion_site/tsconfig.json` — TS 5.0 extends array + transitional strict-mode overrides + 3 preserved compilerOptions
- `minion_site/package.json` — 3 new devDeps + `format` + `format:check` scripts + `prettier` key
- `minion_site/bun.lock` — regenerated
- `minion_site/.env.defaults` (NEW) — BETTER_AUTH_URL, VITE_BETTER_AUTH_URL, VITE_GOOGLE_AUTH_ENABLED
- `minion_site/.env.example` — 6-layer header + all 13 var names preserved
- `minion_site/.gitignore` — added `!.env.defaults` exception
- `minion_site/.github/workflows/ci.yml` (NEW) — minimal CI gate
- `minion_site/.prettierignore` (NEW) — excludes paraglide/.planning/locks/binaries
- 26 source files formatted via Prettier sweep (separate commit `ef48bc4`)

**In meta-repo:**

- `.planning/phases/03-adopt-foundation-in-subprojects/03-03-PR.md` (NEW) — PR URL, commit map, verification evidence
- `.planning/phases/03-adopt-foundation-in-subprojects/03-03-ISSUES.md` (NEW) — strict-mode triage, pre-existing warning catalog, follow-up plan
- `.planning/phases/03-adopt-foundation-in-subprojects/03-03-SUMMARY.md` (this file)
- `.planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md` — extended with 1 new Phase 8 follow-up (site strict-mode fallout)

## Decisions Made

- **Consume `@minion-stack/lint-config@0.1.1` directly, no shim.** Same decision as 03-02 hub — 0.1.1 ships `prettier.config.cjs` correctly. Site's `package.json → prettier` references it directly; no local shim needed. Wave 2 structural-copy pattern holds.
- **Transitional `noUncheckedIndexedAccess: false` + `noImplicitOverride: false`** in `tsconfig.json`. Without these overrides, enabling the shared base's strict defaults surfaces 53 new `possibly undefined` errors, ~60% concentrated in `Channels.svelte` (channel-row array-iteration lookups). Documented in `03-03-ISSUES.md` and added to `deferred-items.md` for Phase 8. Same pattern as 03-01 + 03-02 + 03-04.
- **Separate formatting sweep commit (`ef48bc4`).** Running `prettier --write .` on an un-formatted codebase produced a 26-file diff (much smaller than hub's 218). Isolating it in `style(03-03)` keeps the logical adoption commits readable in `git log --oneline`.
- **Add `.prettierignore` for generated + symlink + binary paths.** Initial `prettier --check` flagged paraglide output (`src/paraglide/messages.js`, `src/paraglide/runtime.js`, etc.) which is auto-generated, plus `.planning/codebase/*` which lives in the meta-repo (consumed via symlink). Excluding these keeps the sweep to 26 real source files. Lighter than hub's ignore (no drizzle meta, no pixel-office assets).
- **Add net-new `ci.yml`.** Site pre-adoption had zero `.github/workflows/`. ADOPT-07's literal reading "every subproject's own CI passes" is only satisfiable if CI exists. Minimal workflow: checkout → setup-bun → `bun install --frozen-lockfile` → `bun run check` → `bun run format:check` → `bun run build`. Triggers on PRs + pushes to `master`/`main`. Same shape as 03-02's workflow.
- **Unignore `.env.defaults` in `.gitignore`.** Pre-existing `.env.*` ignore pattern caught the new file; added `!.env.defaults` alongside the existing `!.env.example` exception.
- **ESLint deferred to Phase 8** per VALIDATION.md Open Q#2 recommendation. Prettier-only in Phase 3.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Transitional tsconfig overrides required**

- **Found during:** Task 1 step 4 (`bun run check` after extends array swap — performed in prior run session)
- **Issue:** Shared `svelte.json` inherits `base.json`'s `noUncheckedIndexedAccess: true` + `noImplicitOverride: true`. Enabling both produced 53 errors (vs 0 pre-adoption baseline confirmed by `git stash` A/B).
- **Fix:** Per plan Task 1 step 4 threshold (>30 errors), layered both flags as `false` in `tsconfig.json`, created `03-03-ISSUES.md`, and extended `deferred-items.md`.
- **Files modified:** `minion_site/tsconfig.json`, 2 meta-repo artifacts
- **Verification:** `bun run check` now reports 0 errors + 1 pre-existing warning (exact pre-adoption baseline, 0 new)
- **Committed in:** `61677bf`

**2. [Rule 3 - Blocking] `.env.defaults` caught by `.env.*` gitignore pattern**

- **Found during:** Task 2 (`git add .env.defaults` → exit 1)
- **Issue:** `minion_site/.gitignore` has `.env.*` pattern that already blocked `.env.defaults`. The existing `!.env.example` exception pattern shows this is the intended solution.
- **Fix:** Added `!.env.defaults` as a second exception.
- **Files modified:** `minion_site/.gitignore`
- **Committed in:** `3690356`

**3. [Rule 3 - Blocking] Prettier check failed on 37 un-formatted files**

- **Found during:** Task 3 (`bun run format:check` pre-commit smoke test)
- **Issue:** Site has never been formatted with any Prettier preset. Naively applying the shared preset to 37 files (including paraglide generated output + `.planning` meta-repo symlink content) would create an un-reviewable adoption diff.
- **Fix:** Created `.prettierignore` excluding generated/symlinked paths (reducing to 26 source files), then ran `bun run format` and committed the formatting-only diff as its own commit (`ef48bc4`) before the CI workflow commit. Same pattern as 03-02.
- **Files modified:** 26 source files + `.prettierignore` (new)
- **Verification:** `bun run format:check` → "All matched files use Prettier code style!"
- **Committed in:** `ef48bc4` (formatting-only) + `fca6091` (CI workflow + .prettierignore)

---

**Total deviations:** 3 auto-fixed (1 missing-critical, 2 blocking). All three were explicitly anticipated by the plan (Task 1 step 4 threshold, Task 2 env-file precedent from 03-02, Task 3 formatting-sweep note).
**Impact on plan:** None. No scope creep. Adoption is strictly config-only + one formatting sweep (mechanical) + one .prettierignore (plan-anticipated).

## Issues Encountered

- **1 pre-existing `bun run check` warning on `master`**. Verified via `git stash` A/B comparison — identical 1 warning before and after adoption (`LeadFormDialog.svelte:11` a11y `click_events_have_key_events` on a non-interactive visible element). Not adoption-caused. Logged in `03-03-ISSUES.md`.
- **Vercel adapter optional-dep warnings** during `bun run build` (`@neon-rs/load/dist/index.js → /index.node`, `node-fetch → encoding`, `ws → bufferutil`/`utf-8-validate`). Pre-existing, not adoption-caused.
- **`minion doctor`** reports `site` row cleanly: `tsconfig@0.1.0 (ok), lint-config@0.1.1 (ok)` — no symlink-ext drift (bun's install layout doesn't trigger the pnpm content-store misclassification seen on minion + paperclip rows). Same as hub.
- **1Password SSH signing gate** — prior execution attempted Task 1 commit while 1Password was locked; the run paused and the user unlocked to continue. This continuation run committed cleanly. Not a plan deviation — auth gate handled correctly.

## Known Stubs

None. All content is wired:
- `tsconfig.json` extends resolution verified end-to-end via `bun run check`
- `package.json → prettier` resolves to the shared `.cjs` preset (smoke-tested via `bun x prettier --check`)
- `.env.defaults` values are real dev-environment defaults (Better Auth URL + Google auth flag)
- `.env.example` preserves every pre-adoption var name
- `ci.yml` references actual scripts that exist in `package.json`
- `.prettierignore` patterns match real directories

## Threat Flags

None beyond the plan's existing threat register. `.env.defaults` contains only non-secret scalars (grep gate exit 0). `.env.example` contains only variable names with empty `=` (no values). `ci.yml` has no `env:` blocks referencing secrets (threat T-03-03-05 equivalent mitigated). `bun.lock` committed to pin dependency versions (threat T-03-03-04 mitigated).

## User Setup Required

None — `@minion-stack/*` packages came from Phase 2's npm publish step + the `@minion-stack/lint-config@0.1.1` fix landed before 03-02.

**User action for next step:** Review PR #2 at https://github.com/NikolasP98/minion-site/pull/2. Once CI runs the net-new workflow and reports green, merge the PR. Per D-24, executor does NOT merge. Vercel will auto-deploy a preview from the PR as an additional signal.

## Next Phase Readiness

- **Wave 2 complete:** 03-01 + 03-02 + 03-03 done. All SvelteKit + bun subprojects adopted. Wave 3 (03-05 pixel-agents, 03-06 minion_plugins) can proceed independently — both npm-based, smaller surface.
- **Wave 2 structural-copy pattern validated twice:** Hub (03-02) and site (03-03) adoptions are mechanically identical. Future SvelteKit+bun adoptions can follow this template directly.
- **Phase 8 follow-ups from this plan:**
  1. Remove site's transitional `noUncheckedIndexedAccess: false` + `noImplicitOverride: false` and fix the 53 errors (concentrated in `Channels.svelte` — expected <0.5 day effort due to tight concentration).
  2. Fix the 1 pre-existing site a11y warning (`LeadFormDialog.svelte` click-without-keyboard).

---

*Phase: 03-adopt-foundation-in-subprojects*
*Completed: 2026-04-21*

## Self-Check: PASSED

- [x] `minion_site/tsconfig.json` exists — uses TS 5.0 extends array: `["@minion-stack/tsconfig/svelte.json", "./.svelte-kit/tsconfig.json"]`
- [x] `minion_site/package.json` — `prettier: "@minion-stack/lint-config/prettier.config.cjs"`, devDeps include `@minion-stack/tsconfig@^0.1.0`, `@minion-stack/lint-config@^0.1.1`, `prettier@^3`
- [x] `minion_site/.env.defaults` exists (new, 3 non-secret scalars)
- [x] `minion_site/.env.example` exists with refreshed 6-layer header + 13 preserved var names
- [x] `minion_site/.github/workflows/ci.yml` exists (NET-NEW — site had no CI pre-adoption)
- [x] `minion_site/.prettierignore` exists (new)
- [x] Commit `61677bf` exists in minion-site repo on `feat/adopt-minion-stack` (tsconfig adoption)
- [x] Commit `3690356` exists in minion-site repo on `feat/adopt-minion-stack` (Prettier + env)
- [x] Commit `ef48bc4` exists in minion-site repo on `feat/adopt-minion-stack` (formatting sweep — 26 files)
- [x] Commit `fca6091` exists in minion-site repo on `feat/adopt-minion-stack` (ci.yml + .prettierignore)
- [x] Branch `feat/adopt-minion-stack` pushed to `git@github.com:NikolasP98/minion-site.git`
- [x] PR https://github.com/NikolasP98/minion-site/pull/2 OPEN against `master`
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/03-03-PR.md` committed (pending final metadata commit)
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/03-03-ISSUES.md` committed (pending final metadata commit)
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/03-03-SUMMARY.md` committed (pending final metadata commit)
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md` extended with site entry
- [x] `bun run check` exits with 0 errors + 1 pre-existing warning — exact pre-adoption baseline, 0 new errors from adoption (git stash A/B confirmed in prior run)
- [x] `bun run format:check` exits 0 — "All matched files use Prettier code style!"
- [x] `bun run build` exits 0 — built via `@sveltejs/adapter-vercel`
- [x] `minion doctor` site row reports `tsconfig@0.1.0 (ok), lint-config@0.1.1 (ok)` — no symlink-ext drift
- [x] ESLint NOT installed (deferred to Phase 8)
- [x] PR NOT merged (per D-24)
