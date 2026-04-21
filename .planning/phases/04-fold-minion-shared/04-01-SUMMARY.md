---
phase: 04-fold-minion-shared
plan: 01
subsystem: infra
tags: [typescript, pnpm, workspace, shared-packages, gateway-protocol]

# Dependency graph
requires:
  - phase: 02-foundation
    provides: "@minion-stack/tsconfig workspace:* for library.json extend"
provides:
  - "@minion-stack/shared@0.1.0 workspace package at packages/shared/"
  - "Gateway protocol types: RequestFrame, ResponseFrame, EventFrame, GatewayFrame"
  - "Connection utilities: createConnectionState, connect, disconnect, flushPending"
  - "Utils: uuid, parseAgentSessionKey, extractText, cleanText, parseGatewayMetadata, extractMessageTimestamp"
  - "Changeset file for initial npm publish"
affects: [04-02-publish, 04-03-shim, 04-04-consumer-updates]

# Tech tracking
tech-stack:
  added: ["@minion-stack/shared workspace package"]
  patterns: ["tsc-only build (no bundler) for pure-types library", "Three export paths: root + ./gateway + ./utils"]

key-files:
  created:
    - packages/shared/package.json
    - packages/shared/tsconfig.json
    - packages/shared/src/index.ts
    - packages/shared/src/gateway/index.ts
    - packages/shared/src/gateway/types.ts
    - packages/shared/src/gateway/protocol.ts
    - packages/shared/src/gateway/connection.ts
    - packages/shared/src/utils/index.ts
    - packages/shared/src/utils/uuid.ts
    - packages/shared/src/utils/session-key.ts
    - packages/shared/src/utils/text.ts
    - .changeset/shared-initial-release.md
  modified:
    - pnpm-lock.yaml

key-decisions:
  - "SHARE-01 git subtree N/A: minion-shared/ has no independent git history (plain gitignored directory, not a submodule)"
  - "tsconfig extends @minion-stack/tsconfig/library.json (with .json extension) per package exports map"
  - "Fixed noUncheckedIndexedAccess narrowing in _formatTs: hm[1] -> hm?.[1] for strict-mode compatibility"

patterns-established:
  - "Workspace library build pattern: tsc only, outDir=./dist, rootDir=./src, extends library.json"
  - "Package exports: three paths (., ./gateway, ./utils) matching original minion-shared structure"

requirements-completed: [SHARE-01, SHARE-02]

# Metrics
duration: 12min
completed: 2026-04-21
---

# Phase 4 Plan 01: Create @minion-stack/shared Workspace Package Summary

**`@minion-stack/shared@0.1.0` workspace package scaffolded from minion-shared/src/ with tsc build producing full dist/ including gateway protocol types and WS connection utilities**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-21T07:05:00Z
- **Completed:** 2026-04-21T07:17:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Created `packages/shared/` as a valid pnpm workspace package named `@minion-stack/shared`
- Copied all 9 source files from `minion-shared/src/` with one strict-mode fix
- `pnpm --filter @minion-stack/shared build` exits 0; `dist/` has .js + .d.ts + .map for all 3 export paths
- Changeset file registered for initial 0.1.0 minor release

## Task Commits

1. **Task 1: Create packages/shared workspace package** - `d1b93a1` (feat)
2. **Task 2: Add changeset for @minion-stack/shared@0.1.0** - `b7aa4fd` (chore)

**Plan metadata:** (committed with final docs commit)

## Files Created/Modified

- `packages/shared/package.json` - Package manifest: name, exports (3 paths), publishConfig, devDeps
- `packages/shared/tsconfig.json` - Extends @minion-stack/tsconfig/library.json
- `packages/shared/src/index.ts` - Root barrel re-exporting gateway + utils
- `packages/shared/src/gateway/index.ts` - Gateway sub-barrel
- `packages/shared/src/gateway/types.ts` - All gateway frame + domain types
- `packages/shared/src/gateway/protocol.ts` - sendRequest, handleResponseFrame, flushPending
- `packages/shared/src/gateway/connection.ts` - createConnectionState, connect, disconnect
- `packages/shared/src/utils/index.ts` - Utils barrel
- `packages/shared/src/utils/uuid.ts` - uuid() using crypto.randomUUID
- `packages/shared/src/utils/session-key.ts` - parseAgentSessionKey
- `packages/shared/src/utils/text.ts` - extractText, cleanText, parseGatewayMetadata, extractMessageTimestamp
- `.changeset/shared-initial-release.md` - Changeset for initial minor release
- `pnpm-lock.yaml` - Updated lockfile with new workspace package

## Decisions Made

- **SHARE-01 N/A:** `git subtree add` is not applicable — `minion-shared/` has no independent git history (it is a plain directory gitignored from the meta-repo root, not a git submodule). Source was copied verbatim instead.
- **tsconfig extension:** Used `@minion-stack/tsconfig/library.json` (with `.json` suffix) to match the package's `exports` map entries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed noUncheckedIndexedAccess type error in _formatTs**
- **Found during:** Task 1 (build verification)
- **Issue:** `hm[1]` in `_formatTs` returns `string | undefined` under `noUncheckedIndexedAccess: true` (base.json default), but the return type is `string`. The original `minion-shared` compiled without this flag.
- **Fix:** Changed `if (hm) return hm[1]` to `if (hm?.[1]) return hm[1]` — the truthiness check on the indexed value narrows the type to `string`
- **Files modified:** `packages/shared/src/utils/text.ts`
- **Verification:** `pnpm --filter @minion-stack/shared build` exits 0 after fix
- **Committed in:** `d1b93a1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type narrowing for strict mode)
**Impact on plan:** Single-line fix required for strict tsconfig compatibility. No scope creep. Logic is semantically identical to the original.

## Issues Encountered

- `tsconfig.json` initially used `"extends": "@minion-stack/tsconfig/library"` (no `.json`), but the package's exports map requires the `.json` suffix. Fixed immediately on first build attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `@minion-stack/shared@0.1.0` is workspace-resolved and builds cleanly
- Ready for Phase 04 Plan 02: publish to npm and verify registry availability
- SHARE-01 subtree requirement documented as N/A (no git history existed)

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| packages/shared/package.json | FOUND |
| packages/shared/tsconfig.json | FOUND |
| packages/shared/dist/index.js | FOUND |
| packages/shared/dist/gateway/index.js | FOUND |
| packages/shared/dist/utils/index.js | FOUND |
| packages/shared/dist/index.d.ts | FOUND |
| .changeset/shared-initial-release.md | FOUND |
| commit d1b93a1 | FOUND |
| commit b7aa4fd | FOUND |

---
*Phase: 04-fold-minion-shared*
*Completed: 2026-04-21*
