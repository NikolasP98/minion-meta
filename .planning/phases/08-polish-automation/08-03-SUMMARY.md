---
phase: 08-polish-automation
plan: "03"
subsystem: cli
tags: [minion-doctor, link-drift, git-status, tdd, vitest]

# Dependency graph
requires:
  - phase: 08-01
    provides: Phase 8 wave 1 foundation (CLI polish groundwork)
provides:
  - Extended MINION_PKGS covering all seven @minion-stack packages (shared/db/auth added)
  - gitStatusSummary + isCloned helpers in git-status.ts
  - minion doctor git column showing clean/N-dirty/(not cloned) per subproject
  - Clone-presence check that avoids auth-failure masking for missing subprojects
affects: [08-04, 08-05, consumers-of-minion-doctor]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD cycle: write failing test (RED) then implement (GREEN) per tdd=true task"
    - "Clone-presence guard: isCloned() before resolveEnv() prevents false auth errors"
    - "git status --porcelain count-only: only N returned, no filenames leaked (T-08-03-01)"

key-files:
  created:
    - packages/cli/src/lib/git-status.ts
    - packages/cli/test/doctor-link-drift.test.ts
    - packages/cli/test/doctor-integration.test.ts
    - .changeset/doctor-polish.md
  modified:
    - packages/cli/src/lib/link-drift.ts
    - packages/cli/src/commands/doctor.ts

key-decisions:
  - "MINION_PKGS extended to seven packages (tsconfig, lint-config, env, cli, shared, db, auth)"
  - "git column uses count-only output to avoid leaking file names in doctor table (T-08-03-01)"
  - "Clone-presence checked before resolveEnv to prevent missing subprojects from setting authFailure"
  - "Local-only per D-03: no GitHub Actions polling added"

patterns-established:
  - "isCloned guard pattern: check .git dir existence before any git/env operations on a subproject"
  - "git-status summary: (not cloned) | clean | N-dirty | (git error) — four states, all safe for table display"

requirements-completed:
  - POLISH-03

# Metrics
duration: 3min
completed: 2026-04-21
---

# Phase 08 Plan 03: Doctor Polish Summary

**`minion doctor` extended with seven-package link-drift coverage (shared/db/auth) and a new git-status column that shows clean/N-dirty/(not cloned) per subproject, with clone-presence guard preventing auth-failure masking**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-21T20:43:46Z
- **Completed:** 2026-04-21T20:45:50Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 6

## Accomplishments

- Extended `MINION_PKGS` from 4 to 7 packages — `@minion-stack/shared`, `@minion-stack/db`, and `@minion-stack/auth` (Phases 4-6) are now visible in link-drift reports
- Created `git-status.ts` with `gitStatusSummary` and `isCloned` helpers; `doctor.ts` now shows a `git` column with clean/N-dirty/(not cloned) per subproject
- Missing (not-cloned) subprojects emit a clean row without triggering the `authFailure` exit code 3
- 7 new tests added across two test files; full suite 16/16 passes with zero typecheck errors

## Task Commits

1. **Task 1: Extend link-drift MINION_PKGS + test coverage** - `6683570` (feat)
2. **Task 2: git-status helper + clone-presence + doctor integration** - `66b5749` (feat)

**Plan metadata:** (docs commit — see final_commit below)

## Files Created/Modified

- `packages/cli/src/lib/link-drift.ts` — MINION_PKGS extended: 4 → 7 packages
- `packages/cli/src/lib/git-status.ts` — New: `gitStatusSummary` + `isCloned` exports
- `packages/cli/src/commands/doctor.ts` — Imports both helpers; adds git column; clone-presence guard
- `packages/cli/test/doctor-link-drift.test.ts` — New: 3 tests for 7-package coverage, not-installed, installed-drift
- `packages/cli/test/doctor-integration.test.ts` — New: 4 tests for (not cloned), (not cloned missing path), clean repo, N-dirty repo
- `.changeset/doctor-polish.md` — Patch changeset for @minion-stack/cli

## Decisions Made

- MINION_PKGS extended to 7 (tsconfig, lint-config, env, cli, shared, db, auth) matching all published packages
- git column uses only the count from `--porcelain` output — filenames never surface in doctor table (threat T-08-03-01 mitigated)
- `isCloned()` guard inserted before `resolveEnv()` so a missing subproject cannot flip `authFailure = true` (threat T-08-03-02 mitigated)
- Local-only per D-03: no `gh run list` or GitHub Actions polling added

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `minion doctor` is now the one-stop health check POLISH-03 specified
- Ready for 08-04 (next wave plan)
- The `git` column in doctor output renders consistently; if table width is a concern, 08-04/05 can truncate column headers

---
*Phase: 08-polish-automation*
*Completed: 2026-04-21*
