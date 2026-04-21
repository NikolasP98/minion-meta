---
phase: 04-fold-minion-shared
plan: 02
subsystem: infra
tags: [typescript, npm, publish, deprecation, shared-packages, gateway-protocol]

# Dependency graph
requires:
  - phase: 04-fold-minion-shared
    plan: 01
    provides: "@minion-stack/shared workspace package with clean tsc build"
provides:
  - "@minion-stack/shared@0.1.0 live on npm (public, importable)"
  - "minion-shared@0.2.0 deprecation shim on npm re-exporting from @minion-stack/shared"
  - "npm deprecate notice on minion-shared pointing to @minion-stack/shared"
affects: [04-03-consumer-updates, minion_hub, minion_site, minion-shared consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deprecation shim pattern: bump version, replace src with re-exports + console.warn, add peerDep, install as devDep for build"
    - "npm deprecate command for registry-level deprecation notice separate from package.json description"

key-files:
  created: []
  modified:
    - minion-shared/package.json
    - minion-shared/src/index.ts
    - minion-shared/src/gateway/index.ts
    - minion-shared/src/utils/index.ts
    - minion-shared/dist/index.js

key-decisions:
  - "SHARE-02: @minion-stack/shared@0.1.0 published to npm — canonical package name going forward"
  - "SHARE-03: minion-shared@0.2.0 shim published with npm deprecate; old consumers get runtime warning + registry-level notice on install"
  - "peerDependency + devDependency dual pattern: peerDep for consumers to supply @minion-stack/shared; devDep pointing to workspace file:../packages/shared for tsc build without npm install"

patterns-established:
  - "Workspace-local devDep for build: use file:../packages/shared in devDependencies to resolve types during tsc, declare @minion-stack/shared as peerDependency for consumers"

requirements-completed: [SHARE-02, SHARE-03]

# Metrics
duration: ~20min (2 human-action checkpoints for 2FA npm publish)
completed: 2026-04-21
---

# Phase 4 Plan 02: Publish @minion-stack/shared + minion-shared Deprecation Shim Summary

**`@minion-stack/shared@0.1.0` published to npm and `minion-shared@0.2.0` deployed as a deprecation shim with console.warn + npm registry deprecation notice, enabling zero-breakage consumer migration**

## Performance

- **Duration:** ~20 min (includes two human 2FA checkpoints)
- **Started:** 2026-04-21T07:17:00Z
- **Completed:** 2026-04-21T07:37:00Z
- **Tasks:** 4 (2 auto + 2 human-action checkpoints)
- **Files modified:** 5

## Accomplishments

- `@minion-stack/shared@0.1.0` published to npm under the `@minion-stack` org scope (public)
- `minion-shared@0.2.0` shim built with re-exports pointing at the new package, including runtime `console.warn` deprecation message
- `npm deprecate minion-shared` run — registry now shows deprecation notice on any `npm install minion-shared` invocation
- Three-path exports maintained in shim (`.`, `./gateway`, `./utils`) matching original package structure for drop-in compatibility

## Task Commits

1. **Task 1: Verify @minion-stack/shared build** — prior commit (d1b93a1, b7aa4fd from plan 01)
2. **Task 2: Publish @minion-stack/shared@0.1.0** — user ran (2FA, no code commit required)
3. **Task 3: Build minion-shared@0.2.0 deprecation shim** — `848c3c4` (feat)
4. **Task 4: Publish minion-shared@0.2.0 + npm deprecate** — user ran (2FA, no code commit required)

## Files Created/Modified

- `minion-shared/package.json` — Bumped to 0.2.0, description updated to deprecation notice, peerDependency on `@minion-stack/shared@^0.1.0` added, devDependency pointing to `file:../packages/shared` for build
- `minion-shared/src/index.ts` — Replaced with shim: `console.warn` deprecation message + `export * from '@minion-stack/shared'`
- `minion-shared/src/gateway/index.ts` — Replaced with `export * from '@minion-stack/shared/gateway'`
- `minion-shared/src/utils/index.ts` — Replaced with `export * from '@minion-stack/shared/utils'`
- `minion-shared/dist/` — Rebuilt via `tsc` after shim source changes

## Decisions Made

- **Dual dep strategy for shim build:** `@minion-stack/shared` listed as both `peerDependencies` (for downstream consumers) and `devDependencies` pointing to `file:../packages/shared` (for local tsc resolution). This avoids needing an npm install of the package that was just published, and lets the shim build entirely from workspace-local sources.
- **console.warn at module load time:** The deprecation warning fires when `minion-shared` is first imported, giving consuming code immediate visibility even without checking npm outdated.
- **npm deprecate as belt-and-suspenders:** The registry-level deprecation notice appears on `npm install` output regardless of whether consumers pin the exact version, catching future installs in CI pipelines.

## Deviations from Plan

None — plan executed exactly as written. The tsc peerDep workaround described in the plan (use devDep pointing to workspace file:) was anticipated and applied as specified.

## Issues Encountered

None — tsc resolved `@minion-stack/shared` types via the `file:../packages/shared` devDependency without needing a fresh `npm install` from the registry.

## User Setup Required

None — 2FA npm publish steps were performed by the user directly at the two `checkpoint:human-action` gates. No ongoing configuration required.

## Next Phase Readiness

- Both packages are live on npm and verifiable via `npm view @minion-stack/shared version` → `0.1.0` and `npm view minion-shared version` → `0.2.0`
- Phase 04-03 (consumer updates: minion_hub, minion_site import from `@minion-stack/shared`) is unblocked
- Any existing `minion-shared` users will receive runtime + registry deprecation nudges to migrate

## Known Stubs

None — shim re-exports are fully wired to the live `@minion-stack/shared` package.

## Threat Flags

No new threat surface introduced. npm 2FA enforced publish (T-04-04 mitigated). Deprecation message contains no credentials or internal paths (T-04-07 accepted).

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| minion-shared/package.json version 0.2.0 | FOUND |
| minion-shared/src/index.ts re-exports @minion-stack/shared | FOUND |
| minion-shared/src/gateway/index.ts shim | FOUND |
| minion-shared/src/utils/index.ts shim | FOUND |
| minion-shared/dist/index.js built | FOUND |
| commit 848c3c4 (shim build) | FOUND |

---
*Phase: 04-fold-minion-shared*
*Completed: 2026-04-21*
