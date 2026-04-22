---
phase: 08-polish-automation
plan: "04"
subsystem: docs
tags: [claude-md, readme, minion-stack, changesets, ci, release-automation]

requires:
  - phase: 08-01
    provides: ci.yml + release.yml GitHub Actions workflows
  - phase: 08-02
    provides: NPM_TOKEN-SETUP.md one-time setup doc
  - phase: 04-fold-minion-shared
    provides: packages/shared + packages/db + packages/auth (folded from minion-shared/)

provides:
  - CLAUDE.md with zero stale minion-shared/ references and all 7 @minion-stack packages documented
  - README.md with CI & Releases section and accurate package table

affects:
  - 08-05 (onboarding dry-run reads README.md)
  - any agent working from CLAUDE.md as primary context

tech-stack:
  added: []
  patterns:
    - "Docs-as-truth: CLAUDE.md reflects current repo shape, not migration snapshot"

key-files:
  created: []
  modified:
    - CLAUDE.md
    - README.md

key-decisions:
  - "Keep all 7 subproject sections per D-04 (audience is orchestrator agent dispatching subagents)"
  - "Past-tense historical minion-shared/ mention in README Subprojects table retained with explicit label"
  - "CI & Release Automation subsection added to CLAUDE.md Meta-repo Workflow (not Architecture)"

patterns-established:
  - "Stale-string elimination: grep-verifiable done criteria prevent doc drift"

requirements-completed:
  - POLISH-04

duration: 3min
completed: "2026-04-22"
---

# Phase 08 Plan 04: CLAUDE.md + README.md Steady-State Docs Summary

**Root CLAUDE.md rewritten: zero minion-shared/ directory refs, all 7 @minion-stack packages documented, CI & Release Automation section added; README updated with CI workflow, full package table, and removed stale "future phases" language.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-22T01:47:57Z
- **Completed:** 2026-04-22T01:50:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Eliminated all 5 stale `minion-shared/` references from CLAUDE.md (Project Map row, Commands Quick Reference row, section heading, Gateway Protocol sentence, Cross-Project Data Flow diagram, Orchestration Guide example, Cross-Project Impact Zones row, Package managers convention)
- Extended Shared packages table in CLAUDE.md with `@minion-stack/shared`, `@minion-stack/db`, `@minion-stack/auth` rows and removed "Future phases (M3+)" placeholder
- Added "CI & Release Automation" subsection to CLAUDE.md documenting both GitHub Actions workflows and all root fan-out scripts
- Updated README.md with "CI & Releases" section, full 7-package table, corrected minion-shared Subprojects row (past-tense historical), and cleaned Contributing section of stale phase references

## Task Commits

1. **Task 1: Rewrite root CLAUDE.md** - `18d2063` (chore)
2. **Task 2: Update README.md** - `62dc8f1` (chore)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `/home/nikolas/Documents/CODE/AI/CLAUDE.md` — removed 5 stale `minion-shared/` refs, added 3 package rows + CI section, updated Impact Zones + Package managers + Gateway Protocol
- `/home/nikolas/Documents/CODE/AI/README.md` — added CI & Releases section, updated package table (4→7 packages), updated minion doctor description, cleaned Contributing section

## Decisions Made

- Per D-04 (locked decision): kept all 7 subproject detail sections unchanged — audience is orchestrator agent, not end-user trimming.
- The one remaining `minion-shared` mention in README.md Subprojects table is explicitly labelled as historical ("folded from `minion-shared/` in Phase 4") — acceptable per plan rule.
- CI & Release Automation subsection placed under Meta-repo Workflow (not Architecture Overview) — it describes workflow, not system topology.

## Deviations from Plan

None - plan executed exactly as written. All 9 CLAUDE.md edits and all 5 README.md edits applied as specified.

## Issues Encountered

None.

## User Setup Required

None - docs-only plan.

## Next Phase Readiness

- 08-05 (onboarding dry-run) can now read an accurate README.md with correct prerequisites and CI workflow description
- Any orchestrator agent reading CLAUDE.md sees the actual meta-repo shape: 8 subproject directories, 7 shared packages, CI + release workflows

## Self-Check

- [x] CLAUDE.md exists and modified: `grep -c '@minion-stack/shared' CLAUDE.md` = 4
- [x] README.md exists and modified: `grep -c 'CI & Release' README.md` = 1
- [x] Task 1 commit 18d2063 exists
- [x] Task 2 commit 62dc8f1 exists

---
*Phase: 08-polish-automation*
*Completed: 2026-04-22*
