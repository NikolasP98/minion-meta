# 03-04 Execution Issues

Captured during paperclip-minion adoption (2026-04-20).

## Strict-Mode Fallout

### Transitional overrides applied

`paperclip-minion/tsconfig.base.json` layers two transitional overrides on top of `@minion-stack/tsconfig/node.json` (which inherits from `base.json`):

- `"noUncheckedIndexedAccess": false` — the shared base sets this to `true`. Enabling it surfaces **428 new errors** across **13 of 21 workspace packages**.
- `"noImplicitOverride": false` — the shared base sets this to `true`. Paperclip's class hierarchies do not currently annotate overrides.

### Affected packages (13/21)

- `packages/shared`
- `packages/adapters/opencode-local`
- `packages/adapters/pi-local`
- `packages/db`
- `packages/mcp-server`
- `packages/plugins/sdk`
- `packages/plugins/examples/plugin-authoring-smoke-example`
- `packages/plugins/examples/plugin-file-browser-example`
- `packages/plugins/examples/plugin-hello-world-example`
- `packages/plugins/examples/plugin-kitchen-sink-example`
- `packages/plugins/github-agent-trigger`
- `server`
- `cli`

### Rationale

- Phase 3 scope (per 03-04-PLAN.md Task 1 step 3): "if >50 total errors across workspace, layer `noUncheckedIndexedAccess: false` in tsconfig.base.json compilerOptions as transitional override".
- The fallout pattern (primarily `TS18048 possibly undefined` + `TS2345 string | undefined not assignable to string`) is fixable via targeted null-guards, but strictly out-of-scope for Phase 3 (adoption is config-only).
- Applying the overrides preserves the `extends: "@minion-stack/tsconfig/node.json"` contract while keeping all 21 workspace packages buildable.

### Verification (2026-04-20)

```bash
cd /home/nikolas/Documents/CODE/AI/paperclip-minion

# Without override (adopted tsconfig + strict base defaults):
# pnpm -r --no-bail typecheck 2>&1 | grep -cE "error TS"
# → 428 (13 packages fail)

# With override (current adopted state):
# pnpm -r --no-bail typecheck 2>&1 | grep -cE "error TS"
# → 0 (all 21 packages pass)
```

Conclusion: adoption adds ZERO new type errors when the transitional override is applied.

## Other adoption-surfaced issues

### @paperclipai/shared missing `@types/node`

- **Trigger:** `@minion-stack/tsconfig/node.json` declares `types: ["node"]`. Every other package in the workspace already has `@types/node` in devDependencies, except `packages/shared`.
- **Fix:** Added `@types/node@^24.6.0` to `packages/shared/package.json` devDependencies (matching the version used across all other paperclip packages).
- **Committed in:** `89635bb6`
- **Verification:** `pnpm -r typecheck` now includes `packages/shared` passing.

### @minion-stack/lint-config Prettier CJS/ESM mismatch

- **Trigger:** `@minion-stack/lint-config@0.1.0/prettier.config.js` uses CJS (`module.exports = {...}`) but the package is `type: "module"`. When paperclip's `package.json → prettier` key (or any `require()` shim) tries to load it, Node errors: _"module is not defined in ES module scope"_.
- **Fix:** Created local `paperclip-minion/prettier.config.cjs` that inlines the shared config values byte-for-byte.
- **Committed in:** `f11bf290`
- **Upstream bug:** `@minion-stack/lint-config` should ship `prettier.config.cjs` (or dual CJS/ESM) in a future `0.2.0`. Once fixed, replace paperclip's local shim with `"prettier": "@minion-stack/lint-config/prettier.config.cjs"` in package.json.

## Follow-up plan (Phase 8 Polish)

1. Remove both transitional overrides from `paperclip-minion/tsconfig.base.json`.
2. Fix the 428 strict-mode warnings — primarily null-guards on DB query results (drizzle `.returning()` typed as `T[]`, so `[row]` is `T | undefined`) and TUI/plugin class hierarchies.
3. Expect ~2–3 days of targeted fixes, similar pattern to 03-01 minion follow-up.
4. Once `@minion-stack/lint-config@0.2.0` ships with proper CJS Prettier entrypoint, delete `paperclip-minion/prettier.config.cjs` and wire via package.json `prettier` key.
5. When `@minion-stack/tsconfig/react.json` variant ships, update `paperclip-minion/ui/tsconfig.json` to extend it (currently unchanged per Phase 3 scope).

## Pre-existing issues NOT caused by adoption

### Vitest postgres cleanup race

- `server/src/__tests__/heartbeat-comment-wake-batching.test.ts` occasionally emits _"TypeError: Cannot read properties of null (reading 'write')"_ from `postgres@3.4.8/src/connection.js:255` after the test completes successfully. Unhandled.
- Reproducible WITHOUT the adoption changes (verified by running `pnpm test:run` twice — once clean, once with the race).
- Scope boundary: out of Phase 3, not adoption-caused. Logged here for completeness.

### CI pipeline gap for `minion-integration`

- All paperclip `.github/workflows/*.yml` trigger only on `master` (via `on: pull_request: branches: [master]` or `on: push: branches: [master]`).
- Our PR targets `minion-integration`, so no automated CI will run on it.
- **NOT adoption-caused** — this is how the paperclip fork has always been configured. The adoption PR will need either manual verification or a rebase onto master before CI triggers.

Memory cross-reference: `reference_paperclip_fork.md` establishes fork remote usage; `reference_paperclip_agent_roster.md` documents the `minion-integration` branch as the integration target.
