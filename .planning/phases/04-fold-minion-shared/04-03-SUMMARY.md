---
phase: 04-fold-minion-shared
plan: 03
subsystem: infra
tags: [typescript, npm, svelte, sveltekit, migration, shared-packages, import-paths]

# Dependency graph
requires:
  - phase: 04-fold-minion-shared
    plan: 02
    provides: "@minion-stack/shared@0.1.0 live on npm (public, importable)"
provides:
  - "minion_site source tree with zero minion-shared import references"
  - "minion_site depending on @minion-stack/shared ^0.1.0 in package.json"
  - "PR #3 open on NikolasP98/minion-site with the 4-file migration"
  - "SHARE-04 fully satisfied"
affects: [minion_hub, paperclip-minion, 04-04-archive]

# Tech tracking
tech-stack:
  added: ["@minion-stack/shared@0.1.0 (minion_site runtime dependency)"]
  patterns:
    - "Package rename migration: swap bare import string only — all exported names identical, zero logic changes"
    - "Verify migration completeness with grep -rn before committing"

key-files:
  created: []
  modified:
    - minion_site/package.json
    - minion_site/bun.lock
    - minion_site/src/lib/components/members/ChatTab.svelte
    - minion_site/src/lib/state/member.svelte.ts
    - minion_site/src/lib/services/member-gateway.svelte.ts

key-decisions:
  - "SHARE-04: All 3 consumer files updated to @minion-stack/shared; minion_hub and paperclip-minion confirmed non-consumers"
  - "Migration branch from master not from feat/adopt-minion-stack — Phase 03 PR was already merged; migration targets master cleanly"

patterns-established:
  - "Import rename migration: read all files, make mechanical string substitution, verify with grep, run type-checker, commit atomically per task"

requirements-completed: [SHARE-04]

# Metrics
duration: ~15min
completed: 2026-04-21
---

# Phase 4 Plan 03: minion_site Migration to @minion-stack/shared Summary

**minion_site migrated off deprecated `minion-shared` onto `@minion-stack/shared` — 3 import sites updated, bun install resolved, bun run check passes with 0 errors, PR #3 open on NikolasP98/minion-site**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-21T07:17:00Z
- **Completed:** 2026-04-21T07:31:08Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `minion_site/package.json` now depends on `@minion-stack/shared@^0.1.0`; `minion-shared` removed from both `package.json` and `bun.lock`
- All 3 import sites updated from `'minion-shared'` to `'@minion-stack/shared'` with no other changes
- `bun run check` passes with 0 type errors; 1 pre-existing a11y warning unrelated to this migration
- PR #3 open: https://github.com/NikolasP98/minion-site/pull/3
- `minion_hub` and `paperclip-minion` confirmed as non-consumers (no `minion-shared` imports found — verified during planning phase)

## Task Commits

Commits are on `feat/migrate-to-minion-stack-shared` branch in `minion_site/` repo:

1. **Task 1: Update package.json and install @minion-stack/shared** — `8390efc` (chore)
2. **Task 2: Update 3 import sites and verify with bun run check** — `d96a31a` (feat)

## Files Created/Modified

Before → After import line for each modified source file:

- `minion_site/package.json` — Removed `"minion-shared": "^0.1.0"`, added `"@minion-stack/shared": "^0.1.0"` in dependencies
- `minion_site/bun.lock` — Lock file updated by `bun install`; `minion-shared` removed, `@minion-stack/shared@0.1.0` added
- `minion_site/src/lib/components/members/ChatTab.svelte`
  - Before: `import { extractText } from 'minion-shared';`
  - After:  `import { extractText } from '@minion-stack/shared';`
- `minion_site/src/lib/state/member.svelte.ts`
  - Before: `import type { Agent, Session, AgentChatState, AgentActivityState, ChatMessage } from 'minion-shared';`
  - After:  `import type { Agent, Session, AgentChatState, AgentActivityState, ChatMessage } from '@minion-stack/shared';`
- `minion_site/src/lib/services/member-gateway.svelte.ts`
  - Before: `} from 'minion-shared';`
  - After:  `} from '@minion-stack/shared';`

## bun run check Output (last 10 lines)

```
$ svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
1776756628159 START "/home/nikolas/Documents/CODE/AI/minion_site"
1776756628171 WARNING "src/lib/components/ui/LeadFormDialog.svelte" 11:5 "Visible, non-interactive elements with a click event must be accompanied by a keyboard event handler. Consider whether an interactive element such as `<button type="button">` or `<a>` might be more appropriate
https://svelte.dev/e/a11y_click_events_have_key_events"
1776756628171 COMPLETED 4808 FILES 0 ERRORS 1 WARNINGS 1 FILES_WITH_PROBLEMS
```

## PR Details

- **URL:** https://github.com/NikolasP98/minion-site/pull/3
- **Title:** feat: migrate from minion-shared to @minion-stack/shared
- **Branch:** `feat/migrate-to-minion-stack-shared` → `master`
- **Repo:** NikolasP98/minion-site

## Non-Consumer Confirmation

- **minion_hub:** Zero `minion-shared` imports found in `minion_hub/src/` — confirmed during planning discovery (04-03-PLAN.md context)
- **paperclip-minion:** Zero `minion-shared` imports found in `paperclip-minion/` — confirmed during planning discovery (04-03-PLAN.md context)

SHARE-04 is fully satisfied by this plan alone.

## Decisions Made

- **Migration branch from master:** `feat/adopt-minion-stack` was the Phase 03 adoption branch, already merged to origin. The migration creates a fresh branch `feat/migrate-to-minion-stack-shared` from `master` to keep concerns separate and produce a clean, reviewable PR.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. PR is open and ready for review/merge.

## Next Phase Readiness

- SHARE-04 complete: minion_site no longer references `minion-shared` anywhere in src/
- Phase 04-04 (archive old `minion-shared` GitHub repo with README redirect) is unblocked
- M3 milestone is 4/5 requirements satisfied (SHARE-01 N/A, SHARE-02, SHARE-03, SHARE-04 done; SHARE-05 is 04-04)

## Known Stubs

None.

## Threat Flags

None — mechanical string rename at a package boundary. No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| minion_site/package.json contains @minion-stack/shared | FOUND |
| minion_site/package.json does not contain minion-shared | VERIFIED (grep returned 0 matches) |
| minion_site/src — zero minion-shared references | VERIFIED |
| minion_site/src — exactly 3 @minion-stack/shared references | VERIFIED |
| bun run check exits 0 | PASSED (0 errors, 1 pre-existing warning) |
| commit 8390efc (package.json + bun.lock) | FOUND |
| commit d96a31a (3 source files) | FOUND |
| PR #3 on NikolasP98/minion-site | OPEN |

---
*Phase: 04-fold-minion-shared*
*Completed: 2026-04-21*
