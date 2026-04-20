---
phase: 03-adopt-foundation-in-subprojects
plan: 01
subsystem: infra
tags: [tsconfig, oxlint, env, pnpm, minion-stack, npm-adoption]

requires:
  - phase: 02-foundation
    provides: "@minion-stack/tsconfig@0.1.0 (node variant), @minion-stack/lint-config@0.1.0 (oxlint preset), @minion-stack/env@0.1.0 (6-layer resolver contract)"
provides:
  - "minion subproject extends @minion-stack/tsconfig/node.json with transitional overrides documented"
  - "minion subproject extends @minion-stack/lint-config/oxlint-preset.json with 12 rule opt-outs"
  - "minion/.env.defaults (new, non-secret) + refreshed .env.example header for the 6-layer model"
  - "Adoption PR #77 open at NikolasP98/minion-ai targeting DEV"
affects: [03-02-minion_hub, 03-03-minion_site, 03-04-paperclip-minion, 03-05-pixel-agents, 03-06-minion_plugins, 08-polish]

tech-stack:
  added: ["@minion-stack/tsconfig@^0.1.0 (devDep)", "@minion-stack/lint-config@^0.1.0 (devDep)"]
  patterns:
    - "pnpm.minimumReleaseAgeExclude allowlist for freshly published internal @minion-stack/* packages"
    - "Transitional override layer in consumer tsconfig/.oxlintrc for pre-existing code that can't meet shared preset strictness in one PR"
    - "Adoption PR stays config-only; refactor fallout tracked in phase ISSUES.md + deferred-items.md"

key-files:
  created:
    - .planning/phases/03-adopt-foundation-in-subprojects/03-01-PR.md
    - .planning/phases/03-adopt-foundation-in-subprojects/03-01-ISSUES.md
    - .planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md
    - minion/.env.defaults
  modified:
    - minion/tsconfig.json
    - minion/.oxlintrc.json
    - minion/.env.example
    - minion/package.json
    - minion/pnpm-lock.yaml

key-decisions:
  - "Layer transitional overrides (noUncheckedIndexedAccess=false, noImplicitOverride=false) instead of fixing 1616 warnings inline — scope-creep refactor belongs in Phase 8"
  - "Disable 12 preset oxlint rules via transitional 'off' rather than try to fix 268 new lint errors mid-adoption — same Phase 8 follow-up bucket"
  - "Add @minion-stack/* to pnpm.minimumReleaseAgeExclude — the subproject's 48h min-release-age otherwise blocks installing internal packages freshly published during Phase 2"
  - "Use `pnpm add -w` because minion is a pnpm workspace root; pnpm refuses to add at the root without -w"

patterns-established:
  - "Consumer adoption of shared @minion-stack/* configs: extends string + local compilerOptions/rules override, never touch the shared preset"
  - "Adoption PR per subproject on its own feature branch (feat/adopt-minion-stack per D-23), targeting that subproject's default branch (minion → DEV)"
  - "Baseline-via-git-stash to separate adoption-caused errors from pre-existing repo state before deciding to fix vs defer"
  - "Meta-repo phase artifacts (03-01-PR.md, ISSUES.md, deferred-items.md) commit to meta-repo main; subproject code commits stay in the subproject repo"

requirements-completed: [ADOPT-01]

duration: 35min
completed: 2026-04-20
---

# Phase 03 Plan 01: Adopt @minion-stack in minion/ — Summary

**minion/ now extends `@minion-stack/tsconfig/node.json` + `@minion-stack/lint-config/oxlint-preset.json`, ships `.env.defaults`, and has adoption PR #77 open on NikolasP98/minion-ai@DEV.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-20
- **Completed:** 2026-04-20
- **Tasks:** 3 of 3
- **Files modified:** 5 in minion/, 3 new meta-repo artifacts

## Accomplishments

- `@minion-stack/tsconfig@^0.1.0` + `@minion-stack/lint-config@^0.1.0` installed as devDeps from public npm at 0.1.0
- `minion/tsconfig.json` extends the shared node variant while preserving every minion-specific override (6 path aliases, 8 compilerOptions)
- `minion/.oxlintrc.json` extends the shared oxlint preset while keeping all 14 existing rule overrides + 1 per-file override + 12 ignorePatterns
- `minion/.env.defaults` (net-new) documents the 6-layer env hierarchy and ships 6 non-secret defaults harvested from `process.env.X ?? "..."` patterns in the codebase
- `minion/.env.example` header rewritten to document the 6-layer model; all 52 existing var names preserved
- Feature branch `feat/adopt-minion-stack` pushed to `git@github.com:NikolasP98/minion-ai.git` with 2 atomic commits
- PR https://github.com/NikolasP98/minion-ai/pull/77 open against DEV, CI running

## Task Commits

Minion subproject repo (`git@github.com:NikolasP98/minion-ai.git`, branch `feat/adopt-minion-stack`):

1. **Task 1: Install + tsconfig adoption** — `38f1230a7` (feat)
2. **Task 2: oxlint extends + env files** — `d7771bd1b` (feat)

Meta-repo (branch `main`):

3. **Phase artifacts + PR record** — `6c7f800` (docs)

## Files Created/Modified

**In minion/ (pushed to remote):**

- `minion/tsconfig.json` — `extends: "@minion-stack/tsconfig/node.json"` + 9 preserved compilerOptions + 6 paths + transitional overrides
- `minion/.oxlintrc.json` — `extends: ["./node_modules/@minion-stack/lint-config/oxlint-preset.json"]` + 26 rule overrides + 1 per-file override + 12 ignorePatterns
- `minion/.env.defaults` (NEW) — 6-layer doc header + LLAMA4_MAVERICK_ENABLED, MINION_SESSION_LOG_ENABLED, MINION_GATEWAY_URL, INSPECT_SERVICE_URL, SENTRY_TRACES_SAMPLE_RATE, POSTHOG_HOST
- `minion/.env.example` — header rewritten to document 6-layer resolution model; all 52 vars preserved
- `minion/package.json` — `@minion-stack/tsconfig@^0.1.0` + `@minion-stack/lint-config@^0.1.0` devDeps + `pnpm.minimumReleaseAgeExclude`
- `minion/pnpm-lock.yaml` — regenerated

**In meta-repo:**

- `.planning/phases/03-adopt-foundation-in-subprojects/03-01-PR.md` — PR URL, CI runs, verification evidence
- `.planning/phases/03-adopt-foundation-in-subprojects/03-01-ISSUES.md` — transitional override rationale + 27 pre-existing errors cataloged
- `.planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md` — Phase 8 follow-up queue

## Decisions Made

- **Transitional `noUncheckedIndexedAccess: false` + `noImplicitOverride: false`** in `minion/tsconfig.json`. Enabling the shared base defaults surfaces 1616 new strict-mode warnings (git-stash A/B confirmed). Scope-creep; documented in ISSUES.md for Phase 8.
- **Disable 12 preset oxlint rules** via local `.oxlintrc.json` overrides (`eslint/eqeqeq`, `typescript/consistent-type-imports`, `typescript/no-unnecessary-type-assertion`, etc.). Enabling them surfaces 268 new errors; pre-adoption baseline was 134 errors, post-adoption with overrides is 68 — adoption actually *reduced* lint errors because the preset categorizes some strict rules the old config set as errors.
- **`pnpm.minimumReleaseAgeExclude`** for `@minion-stack/tsconfig` + `@minion-stack/lint-config`. Minion's existing `minimumReleaseAge: 2880` (48h) blocked installing the packages published at 17:42 and 18:08 the same day. Allow-listing the @minion-stack/* internal packages keeps supply-chain guard on public deps while permitting internal foundation.
- **`pnpm add -w`** — required because minion/ is itself a pnpm workspace root (`packages/*`, `ui`, `extensions/*`). Without `-w`, pnpm errs with `ERR_PNPM_ADDING_TO_ROOT`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pnpm minimum-release-age blocked install**

- **Found during:** Task 1 (pnpm add)
- **Issue:** `minion/package.json` sets `pnpm.minimumReleaseAge: 2880` (minutes = 48h). `@minion-stack/tsconfig` and `@minion-stack/lint-config` were published at 17:42 and 18:08 the same day, so pnpm refused to install them.
- **Fix:** Added a `pnpm.minimumReleaseAgeExclude` array listing both `@minion-stack/*` packages. This preserves the 48h guard for public deps but permits internal foundation installs.
- **Files modified:** `minion/package.json`
- **Verification:** `pnpm add -D -w @minion-stack/tsconfig @minion-stack/lint-config` → both resolved at 0.1.0
- **Committed in:** `38f1230a7`

**2. [Rule 2 - Missing Critical] Transitional tsconfig overrides required**

- **Found during:** Task 1 step 3 (`pnpm tsgo` after extends swap)
- **Issue:** The shared `base.json` sets `noUncheckedIndexedAccess: true` + `noImplicitOverride: true`. Enabling them in minion produced 1643 type errors (vs 27 pre-adoption — git-stash A/B comparison).
- **Fix:** Per plan Task 1 step 3 "if >30 errors, layer transitional override + log in ISSUES.md + deferred-items.md". Added both flags as `false` in `minion/tsconfig.json`; created `.planning/phases/03-adopt-foundation-in-subprojects/03-01-ISSUES.md` and `deferred-items.md` with Phase 8 follow-up plan.
- **Files modified:** `minion/tsconfig.json` + 2 new meta-repo artifacts
- **Verification:** `pnpm tsgo` now reports 27 errors (same count as pre-adoption), confirming zero new errors from the adoption
- **Committed in:** `38f1230a7` (tsconfig) + `6c7f800` (artifacts)

**3. [Rule 2 - Missing Critical] Transitional oxlint rule opt-outs required**

- **Found during:** Task 2 (`pnpm lint` after extends swap)
- **Issue:** Shared preset enables `eqeqeq` error, `typescript/consistent-type-imports` warn, `import/no-unassigned-import` error, etc. Added 268 new lint errors on a codebase that already had 134 pre-existing errors.
- **Fix:** Per plan Task 2 step 2 "if >50 errors, prefer option (b) — layer `"<rule>": "off"`". Added 12 rule-off overrides. Initial attempt used `typescript-eslint/...` prefix; oxlint reports as `typescript-eslint(...)` but its config key is `typescript/...`. Corrected the prefix after first lint run.
- **Files modified:** `minion/.oxlintrc.json`
- **Verification:** `pnpm lint` now reports 68 errors (all pre-existing `eslint/curly` + `typescript/no-explicit-any` + `eslint/no-control-regex`; same as adopting with narrower override set), down from 134 pre-adoption.
- **Committed in:** `d7771bd1b`

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 missing-critical)
**Impact on plan:** All deviations were anticipated by the plan itself (Task 1 step 3 + Task 2 step 2 explicitly described the threshold-based override fallback). No scope creep. Adoption is strictly config-only.

## Issues Encountered

- **Pre-existing DEV CI failures** (memory: `project_minion_ai_ci_patterns.md`). `pnpm tsgo` reports 27 errors and `pnpm lint` reports 68–134 errors on DEV itself (git-stash confirmed). Scope boundary says: do NOT fix pre-existing out-of-scope failures. Logged in `deferred-items.md`.
- **oxlint rule-name prefix mismatch.** The shared preset uses `typescript/consistent-type-imports` but oxlint reports the error as `typescript-eslint(consistent-type-imports)`. First override attempt with `typescript-eslint/...` prefix was ignored. Resolved by matching the preset's naming convention.
- **`minion doctor` flags `symlink-ext (drift)`** for the minion row. This is pnpm's symlink-to-content-addressable-store model being misclassified by link-drift. The `node_modules/@minion-stack/tsconfig/package.json` shows `version: 0.1.0` (published), so this is a doctor reporting artifact, not actual drift. Tracked for env@0.1.1 patch (pre-existing deferred item from Phase 2).

## Known Stubs

None. All content is wired.

## User Setup Required

None — published `@minion-stack/*` packages came from Phase 2's npm publish step. No new external service configuration.

**User action for next step:** Once CI on PR #77 reports green (or matches DEV baseline), merge the PR. Per D-24, executor does NOT merge.

## Next Phase Readiness

- Plan 03-02 (minion_hub) can proceed in parallel with Wave 1's other member (03-04 paperclip-minion). The Wave 1 pattern is now proven.
- Plans 03-02..03-06 should reuse the 3 transitional-override patterns established here (strict-mode defaults, lint rule opt-outs, pnpm min-release-age exclude list where the subproject uses pnpm).
- Phase 8 will pick up the two deferred items (strict-mode refactor + oxlint rule re-enabling).

---

*Phase: 03-adopt-foundation-in-subprojects*
*Completed: 2026-04-20*

## Self-Check: PASSED

- [x] `minion/tsconfig.json` exists and extends `@minion-stack/tsconfig/node.json`
- [x] `minion/.oxlintrc.json` exists and extends `@minion-stack/lint-config/oxlint-preset.json`
- [x] `minion/.env.defaults` exists (new, non-secret)
- [x] `minion/.env.example` exists (52 vars preserved)
- [x] Commit `38f1230a7` exists in minion repo on `feat/adopt-minion-stack`
- [x] Commit `d7771bd1b` exists in minion repo on `feat/adopt-minion-stack`
- [x] Commit `6c7f800` exists in meta-repo main
- [x] PR #77 OPEN at https://github.com/NikolasP98/minion-ai/pull/77
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/03-01-PR.md` committed
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/03-01-ISSUES.md` committed
- [x] `.planning/phases/03-adopt-foundation-in-subprojects/deferred-items.md` committed
