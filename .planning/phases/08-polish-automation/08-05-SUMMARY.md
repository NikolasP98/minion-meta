---
phase: 08-polish-automation
plan: 05
subsystem: testing
tags: [onboarding, uat, dry-run, documentation, polish]

# Dependency graph
requires:
  - phase: 08-04
    provides: Updated README.md with step-by-step onboarding instructions
provides:
  - Timed UAT evidence that README.md onboarding completes in under 10 minutes (POLISH-05)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scratch-shell dry-run pattern: env -i HOME=/tmp/... bash --noprofile --norc for honest timing"

key-files:
  created:
    - .planning/phases/08-polish-automation/ONBOARDING-DRY-RUN.md
  modified: []

key-decisions:
  - "D-05 honored: scratch shell on maintainer machine is sufficient (not a fresh VM) — assumptions made transparent via explicit Prerequisites section"
  - "Dry-run completed PASS in under 10 minutes — no README.md patches required, zero undocumented steps"

patterns-established:
  - "UAT pattern: draft artifact template in auto task, human fills timing in checkpoint, continuation agent records verdict and commits"

requirements-completed:
  - POLISH-05

# Metrics
duration: 5min
completed: 2026-04-21
---

# Phase 08 Plan 05: Onboarding Dry-Run Summary

**Timed UAT dry-run confirmed README.md onboarding goes from scratch shell to `minion dev` in under 10 minutes — POLISH-05 PASS**

## Performance

- **Duration:** ~5 min (template creation + human dry-run verification)
- **Started:** 2026-04-21
- **Completed:** 2026-04-21
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 1

## Accomplishments

- Created `ONBOARDING-DRY-RUN.md` UAT template with 8 timed steps, pass/fail criteria, and scratch-shell recipe
- User (maintainer) performed timed dry-run: clone → install CLI → configure Infisical → `minion dev <id>` in under 10 minutes
- POLISH-05 criterion satisfied: total time < 10:00, all steps documented in README.md, no undocumented manual steps required

## Task Commits

Each task was committed atomically:

1. **Task 1: Draft ONBOARDING-DRY-RUN.md template** - `350ec0c` (chore)
2. **Task 2: Timed dry-run PASS verdict recorded** - `eee4ebc` (test)

## Files Created/Modified

- `.planning/phases/08-polish-automation/ONBOARDING-DRY-RUN.md` — UAT evidence artifact: 8-step timed dry-run record, pass/fail criteria, final verdict PASS

## Decisions Made

- D-05 honored: maintainer machine with scratch shell (`env -i HOME=/tmp/minion-dry-run-home PATH=/usr/bin:/bin bash --noprofile --norc`) is the correct UAT environment — fresh VM not required since Prerequisites (Node 22, pnpm 10, infisical CLI, gh CLI, SSH keys) are explicitly documented
- Dry-run completed PASS first iteration — no README.md patches needed, zero undocumented steps encountered

## Deviations from Plan

None — plan executed exactly as written. Template created in Task 1, human-verify checkpoint resolved with PASS verdict, continuation agent recorded result.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 08 (polish-automation) is now complete. All 5 plans executed:

- 08-01: Meta-repo CI workflow (lint-all, typecheck-all, changesets-status)
- 08-02: Changesets release automation (release.yml + NPM_TOKEN setup)
- 08-03: `minion doctor` polish (shared/db/auth link-drift, git-status column, clone-presence)
- 08-04: CLAUDE.md + README.md steady-state docs
- 08-05: POLISH-05 UAT — onboarding dry-run PASS

All POLISH-01..05 requirements satisfied. Project milestone v1.0 complete.

---
*Phase: 08-polish-automation*
*Completed: 2026-04-21*
