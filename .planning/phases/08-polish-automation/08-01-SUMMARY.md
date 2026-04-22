---
phase: 08-polish-automation
plan: 01
subsystem: infra
tags: [github-actions, pnpm, oxlint, changesets, ci, typescript]

requires:
  - phase: 07-ws-consolidation
    provides: published @minion-stack/shared 0.3.0 — the first package to appear in changeset:status output

provides:
  - GitHub Actions CI pipeline gating every PR against main
  - Root workspace fanout scripts: lint-all, typecheck-all, build-all, test-all, ci, release:version
  - Per-package lint scripts (oxlint) for cli, env, shared, db, auth
  - Per-package typecheck scripts for shared, db, auth (previously missing)

affects: [08-02-release, all future PRs to main]

tech-stack:
  added: [oxlint devDependency in cli/env/shared/db/auth packages]
  patterns:
    - pnpm -r --parallel --if-present run <script> for workspace fanout
    - build-all runs sequentially (upstream dist needed by downstream typecheck)
    - fetch-depth: 0 required for changeset status --since=origin/main

key-files:
  created:
    - .github/workflows/ci.yml
  modified:
    - package.json
    - packages/cli/package.json
    - packages/env/package.json
    - packages/shared/package.json
    - packages/db/package.json
    - packages/auth/package.json
    - pnpm-lock.yaml

key-decisions:
  - "build-all runs sequentially (not --parallel) because downstream packages depend on upstream dists for typecheck"
  - "lint-all uses --if-present so tsconfig/lint-config packages (JSON-only) are silently skipped"
  - "changeset:status in ci.yml only runs on pull_request events (not push to main — no changesets remain after merge)"
  - "pnpm/action-setup@v4.4.0 pinned to minor, not floating @v4, for reproducible CI"
  - "oxlint devDependency added to each TS package rather than relying on peer resolution from lint-config"

patterns-established:
  - "CI pattern: checkout(fetch-depth:0) → pnpm-setup → node-setup(cache:pnpm) → install --frozen-lockfile → build → typecheck → lint → test → changeset:status"
  - "Workspace script pattern: pnpm -r --parallel --if-present run <script> for lint/typecheck/test; pnpm -r run build (sequential)"

requirements-completed: [POLISH-01]

duration: 12min
completed: 2026-04-21
---

# Phase 08 Plan 01: CI Pipeline + Workspace Scripts Summary

**GitHub Actions CI pipeline with pnpm workspace fanout scripts (lint-all, typecheck-all, build-all, test-all) gating every PR against main via oxlint + tsc + vitest + changesets**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-21T20:25:00Z
- **Completed:** 2026-04-21T20:38:25Z
- **Tasks:** 2
- **Files modified:** 8 (7 package.json/lockfile + 1 workflow)

## Accomplishments

- Created `.github/workflows/ci.yml` — runs build-all, typecheck-all, lint-all, test-all, and changeset:status on every PR + push to main with concurrency cancellation
- Added 6 new root scripts to `package.json`: `lint-all`, `typecheck-all`, `build-all`, `test-all`, `ci` (aggregate), `release:version`
- Added `lint` script to all 5 TS packages (cli, env, shared, db, auth); added `typecheck` to shared/db/auth which were missing it
- Verified `pnpm run ci` exits 0 locally: 54 tests pass, 0 lint errors, all typechecks clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Add root-level fanout scripts and per-package lint scripts** - `8234f4b` (feat)
2. **Task 2: Write .github/workflows/ci.yml** - `0c6b615` (feat)

**Plan metadata:** (this commit — docs)

## Files Created/Modified

- `.github/workflows/ci.yml` — CI pipeline: PR gates with lint/typecheck/build/test/changeset-status
- `package.json` — added lint-all, typecheck-all, build-all, test-all, ci, release:version scripts
- `packages/cli/package.json` — added lint script + oxlint devDependency
- `packages/env/package.json` — added lint script + oxlint devDependency
- `packages/shared/package.json` — added lint + typecheck scripts + oxlint devDependency
- `packages/db/package.json` — added lint + typecheck scripts + oxlint devDependency
- `packages/auth/package.json` — added lint + typecheck scripts + oxlint devDependency
- `pnpm-lock.yaml` — refreshed after oxlint devDependency additions

## Decisions Made

- `build-all` runs sequentially (`pnpm -r run build`, no `--parallel`) because `@minion-stack/auth` depends on `@minion-stack/db` workspace — downstream packages need upstream dists before typecheck can succeed.
- `changeset:status` in ci.yml is conditional on `github.event_name == 'pull_request'` — running it on push-to-main would fail because the changeset files are consumed on merge.
- `pnpm/action-setup@v4.4.0` pinned to minor version for reproducibility; `version: 10` matches `engines.pnpm: ">=10.0.0"` in root package.json.
- oxlint added as explicit devDependency in each TS package (not relying on peer resolution from `@minion-stack/lint-config`) to ensure `pnpm run lint` resolves the binary correctly within each package's node_modules.

## Deviations from Plan

None — plan executed exactly as written.

The plan specified adding `oxlint` if not found; it was a peer of `@minion-stack/lint-config` but not in each package's devDependencies, so adding it as a devDependency was the planned path (not a deviation).

## Issues Encountered

Lint produced warnings (not errors) in packages/shared and packages/db:
- `shared`: unused import `ResponseFrame` in `src/gateway/protocol.ts`, useless escape in `src/utils/text.ts`
- `db`: unused import `uniqueIndex` in `src/schema/auth/index.ts`

These are `warn` severity per the `suspicious: warn` category in `oxlint-preset.json`. They do not fail CI (exits 0). They are pre-existing code quality notes, not introduced by this plan. Deferred to a future polish pass.

## Known Stubs

None — this plan adds CI infrastructure, no data-rendering UI components.

## Threat Flags

None — workflow contains no user-controlled input interpolation. All `run:` steps use literal `pnpm run <script>` commands. No secrets wired (NPM_TOKEN deferred to 08-02 release workflow).

## Next Phase Readiness

- CI pipeline is live — next PR to main will trigger the workflow
- `release:version` script in place for `changesets/action` integration in 08-02
- 08-02 (release workflow) needs `NPM_TOKEN` GitHub secret configured — that's a human action documented in the 08-02 plan

---
*Phase: 08-polish-automation*
*Completed: 2026-04-21*
