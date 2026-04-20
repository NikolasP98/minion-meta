---
phase: 02-foundation
plan: 06
subsystem: cli
tags: [cli, tooling, orchestration, minion-stack, commander, env-resolution]
status: pending-publish
requirements: [FOUND-07]
completed_at: 2026-04-20
pending_action: "npm publish (user must run in own terminal for 2FA)"
package_name: "@minion-stack/cli"
target_version: "0.1.0"
dependency_graph:
  requires:
    - "@minion-stack/env@0.1.0 (published 2026-04-20)"
    - "@minion-stack/tsconfig@0.1.0 (devDep)"
    - "minion.json at meta-repo root"
    - "packages/cli/minion.schema.json (Ajv validation)"
  provides:
    - "@minion-stack/cli@0.1.0 with `minion` bin"
    - "15 subcommands per FOUND-07 (D9 surface)"
    - "D9 exit code mapping: 0/1/2/3/4"
    - "Link-drift detection across @minion-stack/* in all subprojects"
  affects:
    - "All Wave 5 plans (02-07+) will gate on `minion doctor` green"
    - "02-07 Infisical rename cascade uses this CLI as its validation front-end"
tech-stack:
  added:
    - "commander@^12 — subcommand parser"
    - "execa@^9 — child process spawning with inherit stdio"
    - "concurrently@^9 — --all fanout"
    - "ajv@^8 — minion.json schema validation"
    - "tsdown@^0.21 — ESM bundler (node22 target)"
  patterns:
    - "Runtime CJS→ESM default-unwrap for Ajv (AjvMod.default ?? AjvMod)"
    - "Schema file located via fileURLToPath(import.meta.url) — works from src/ AND dist/"
    - "Fresh Ajv per compile (avoids $id collision across calls)"
    - "Prettier tab-indented multi-line command chains"
key-files:
  created:
    - "packages/cli/src/index.ts"
    - "packages/cli/src/registry.ts"
    - "packages/cli/src/commands/{dev,build,test,check,run,fanout,status,doctor,sync-env,rotate-env,infisical,link,list,branch}.ts"
    - "packages/cli/src/lib/{exec,output,dotenv-write,link-drift}.ts"
    - "packages/cli/test/{registry,dotenv-write}.test.ts"
    - "packages/cli/tsconfig.json"
    - "packages/cli/tsconfig.test.json"
    - "packages/cli/tsdown.config.ts"
    - "packages/cli/README.md"
    - "packages/cli/CHANGELOG.md"
    - ".changeset/cli-initial.md (consumed)"
  modified:
    - "packages/cli/package.json (scripts, deps, version 0.0.0→0.1.0, remove private)"
    - "pnpm-lock.yaml"
decisions:
  - "Fresh Ajv instance per loadRegistry() call — cached singleton caused '$id already exists' on repeat invocation from tests"
  - "Relaxed the `program.command('$cmd')` single-line regex check: Prettier formats multi-line command chains, so verified each subcommand literal with `grep -cE \"\\\"$cmd\\\"|'$cmd'\"` instead (14/14 present)"
  - "main().catch maps D9 exit codes by error-message pattern (not-found→4, config→2, infisical-auth→3, else 1). Internal commands that return a number directly short-circuit the error path"
  - "Kept `symlink-ws` / `@v0.1.0` as ultra-compact drift states in renderDriftLine — fits ≤40-line doctor budget even at 6 subprojects × 4 packages"
  - "infisical command strips trailing `/api` from domain for web UI URL (D10 mentions domain may end in `/api`)"
metrics:
  duration_minutes: 9
  tasks_completed: 4
  commits: 2
  tests_passing: 9
  tests_files: 2
  bundle_size_kb: 21.6
  tarball_size_kb: 7.7
---

# Phase 02 Plan 06 Summary: @minion-stack/cli@0.1.0 — pending publish

**One-liner:** The `minion` bin — commander-based CLI with 15 subcommands that resolve env via `@minion-stack/env`, orchestrate subprojects listed in `minion.json`, and report `@minion-stack/*` link-drift through `doctor`.

## Status

- Code: **complete** — all 9 tests pass, build green, tsc clean, npm pack dry-run clean.
- Version bump: **complete** — 0.0.0 → 0.1.0 via `pnpm exec changeset version`; changeset consumed; CHANGELOG auto-generated.
- Publish: **awaiting user** — 2FA OTP URL is redacted in non-TTY output, so Claude bash cannot complete the auth handshake.

## Integration smoke test output (run from meta-repo root after build)

### `minion list --json` — shape valid, 6 subprojects

```json
{
  "$schema": "./packages/cli/minion.schema.json",
  "subprojects": {
    "minion": { "path": "minion", "packageManager": "pnpm", "branch": "DEV", "infisicalProject": "minion-gateway", ... },
    "hub": { "path": "minion_hub", "packageManager": "bun", "branch": "dev", "infisicalProject": "minion-hub", ... },
    ... (6 total: minion, hub, site, paperclip, pixel-agents, plugins)
  }
}
```

### `minion list` (table)

```
id            path              pm    branch              infisical
------------  ----------------  ----  ------------------  -------------------
minion        minion            pnpm  DEV                 minion-gateway
hub           minion_hub        bun   dev                 minion-hub
site          minion_site       bun   master              minion-site
paperclip     paperclip-minion  pnpm  minion-integration  minion-paperclip
pixel-agents  pixel-agents      npm   main                minion-pixel-agents
plugins       minion_plugins    npm   main                minion-plugins
```

### `minion status`

```
id            branch              dirty  ahead  behind
------------  ------------------  -----  -----  ------
minion        DEV                 0      6      0
hub           dev                 0      3      0
site          master              0      1      0
paperclip     minion-integration  0      -      -
pixel-agents  main                1      0      0
plugins       main                1      0      0
```

(`-` in paperclip ahead/behind: paperclip tracks a fork remote not `origin/<branch>` — working as intended, safeExec returns empty stdout.)

### `minion branch hub`

```
dev
```

### `minion doctor` (includes link-drift per D9 item #7)

```
id            vars              warnings                                          links
------------  ----------------  ------------------------------------------------  ----------------------------
(meta)        infisical-cli-ok  INFISICAL_* auth env vars missing                 -
minion        108               Infisical layer minion-core unavailable: ...      no @minion-stack/* installed
hub           108               Infisical layer minion-core unavailable: ...      no @minion-stack/* installed
...
```

The `links` column shows link-drift status — currently `no @minion-stack/* installed` for every subproject because this phase hasn't wired adoption yet (Phase 3 ADOPT-* does that). Once subprojects run `minion link <id>` or install `@minion-stack/env` as a dependency, the column will report one of: `symlink-ws (ok)`, `symlink-ext (drift)`, `@v0.1.0 (ok)`, or `@vX≠ws@vY (drift)`.

Exit code on this machine was 3 (Infisical auth missing — `INFISICAL_UNIVERSAL_AUTH_CLIENT_*` env vars not set in Claude's shell). This is correct D9 behavior.

### Unknown-id exit code test

```bash
$ minion branch nonexistent
minion: Subproject 'nonexistent' not found in minion.json. Run 'minion list' to see available ids.
$ echo $?
4
```

D9 exit code 4 confirmed.

## Commands shipped (15 per FOUND-07)

| #  | Command                     | Impl                                          |
| -- | --------------------------- | --------------------------------------------- |
| 1  | `minion dev <id>`           | `src/commands/dev.ts` → resolveEnv + runCommand |
| 2  | `minion build <id>`         | `src/commands/build.ts`                       |
| 3  | `minion test <id>`          | `src/commands/test.ts`                        |
| 4  | `minion check <id>`         | `src/commands/check.ts`                       |
| 5  | `minion run <id> <cmd...>`  | `src/commands/run.ts` — passthrough           |
| 6  | `minion <id> <cmd...>`      | shorthand → dispatched via `knownCommands` set in `index.ts` before `parseAsync` |
| 7  | `<any> --all`               | `src/commands/fanout.ts` via `concurrently -n` |
| 8  | `minion status`             | `src/commands/status.ts`                      |
| 9  | `minion doctor`             | `src/commands/doctor.ts` — includes link-drift |
| 10 | `minion sync-env <id>`      | `src/commands/sync-env.ts` — writes `.env.local` at `0600` |
| 11 | `minion rotate-env <id>`    | `src/commands/rotate-env.ts`                  |
| 12 | `minion infisical <id>`     | `src/commands/infisical.ts` — prints + `xdg-open` |
| 13 | `minion link <id>`          | `src/commands/link.ts`                        |
| 14 | `minion unlink <id>`        | same file, flag-controlled                    |
| 15 | `minion list`               | `src/commands/list.ts`                        |
| +  | `minion branch <id>`        | `src/commands/branch.ts`                      |

(The plan's "15" counts `<id>` alias as a command; `branch` is the 16th registered verb. Either way, every FOUND-07 verb is present.)

## Test coverage

| File                          | Tests | Covers                                                             |
| ----------------------------- | ----: | ------------------------------------------------------------------ |
| `test/registry.test.ts`       |     4 | loadRegistry (valid / malformed), getSubproject (known / unknown)  |
| `test/dotenv-write.test.ts`   |     5 | serialiseDotenv: bare, quoted, embedded quotes, newlines, empty    |
| **total**                     | **9** | 100% pass in 500ms                                                 |

## Files shipped in the tarball

```
@minion-stack/cli@0.1.0 (package size 7.7 kB, unpacked 28.3 kB)
├── README.md                  (4.5 kB)
├── dist/index.js              (21.6 kB)  — bundled ESM, shebang preserved
├── minion.schema.json         (1.1 kB)
└── package.json               (1.1 kB)

total files: 4
```

Source + tests + tsconfigs + CHANGELOG are NOT shipped (correct — `files` whitelist restricts publish payload).

## Commits on main

| Commit       | Message                                                                             |
| ------------ | ----------------------------------------------------------------------------------- |
| `d085462`    | `feat(02-06): @minion-stack/cli — all 15 subcommands wired to @minion-stack/env + minion.json` |
| `4246d37`    | `feat(02-06): release prep — @minion-stack/cli@0.1.0 ready for npm publish`         |

## Release command (for user to run)

```sh
cd /home/nikolas/Documents/CODE/AI/packages/cli && npm publish --access public
```

Expected outcome: `+ @minion-stack/cli@0.1.0` and tarball live at
`https://registry.npmjs.org/@minion-stack/cli/-/cli-0.1.0.tgz`.

After publish, run:

```sh
npm view @minion-stack/cli version   # should return 0.1.0
npx @minion-stack/cli list           # smoke test from a fresh shell
```

Orchestrator will then push all commits to `origin main`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ajv ESM interop for `module: nodenext`**
- **Found during:** Task 1 tsc typecheck.
- **Issue:** `import Ajv from 'ajv'` resolves as the module namespace (not the class constructor) under `@minion-stack/tsconfig/base.json`'s `module: nodenext` / `moduleResolution: nodenext`. `new Ajv(...)` failed both type-check and runtime.
- **Fix:** Added a runtime `.default` unwrap pattern (`(AjvMod as unknown as { default?: AjvCtor }).default ?? AjvMod`) with explicit `ValidateFn` + `AjvInstance` + `AjvCtor` interfaces. Tests pass; tsc clean; runtime construction works.
- **Files modified:** `packages/cli/src/registry.ts`
- **Commit:** `d085462`

**2. [Rule 3 - Blocking] Ajv `$id` already exists on repeat compile**
- **Found during:** Task 1 RED→GREEN test run (4th test failed with schema-collision message).
- **Issue:** Plan specified a module-level `const ajv = new Ajv()` singleton; tests call `loadRegistry` multiple times, and the shared schema's `$id` is registered the second time and throws.
- **Fix:** Moved the Ajv instantiation inside `loadRegistry`. Each call gets a fresh Ajv; no cross-call state leak.
- **Files modified:** `packages/cli/src/registry.ts`
- **Commit:** `d085462`

**3. [Rule 3 - Blocking] tsconfig rootDir + test include conflict**
- **Found during:** First tsc typecheck of test files.
- **Issue:** Plan-provided tsconfig had `rootDir: ./src` AND `include: ["src/**/*", "test/**/*"]` → TS6059 because `test/` is outside rootDir.
- **Fix:** Split into two configs (mirrors the pattern from 02-05's env package):
  - `tsconfig.json`: build — `rootDir: ./src`, `include: src/**/*` only
  - `tsconfig.test.json`: typecheck — no `rootDir`, `noEmit: true`, includes both trees
- **Files modified:** `packages/cli/tsconfig.json`, `packages/cli/tsconfig.test.json` (new)

**4. [Rule 2 - Correctness] D9 exit-code mapping in main().catch**
- **Found during:** Task 4 smoke test with unknown subproject id.
- **Issue:** The plan's `main().catch` template wrote `process.exit(1)` unconditionally. D9 specifies exit 4 for "subproject not found". Errors from `getSubproject` flow through `main().catch` (not through the per-command `try/catch`), so the unknown-id case was erroneously returning 1.
- **Fix:** Pattern-matched error messages in `main().catch`:
  - `/not found in minion\.json/` → exit 4
  - `/minion\.json (not found|missing|invalid)/` → exit 2
  - `/infisical.*auth/i` → exit 3
  - else → exit 1
- **Files modified:** `packages/cli/src/index.ts`
- **Commit:** `4246d37`

**5. [Rule 3 - Blocking] tsdown `fixedExtension: false`**
- **Found during:** Task 4 build.
- **Issue:** tsdown 0.21 defaults to emitting `.mjs` but the plan + bin target is `dist/index.js`.
- **Fix:** Added `fixedExtension: false` to `tsdown.config.ts` — emits `.js` matching package.json `type: module`. Same workaround 02-05 already applied for the env package.
- **Files modified:** `packages/cli/tsdown.config.ts`

### Scope substitutions (from prompt's critical adjustments, not deviations)

- `@minion/cli` → `@minion-stack/cli` throughout (scope decision from 02-02).
- `@minion/env` import → `@minion-stack/env` import (workspace:* protocol).
- `npm pack --dry-run` used (not `pnpm pack`).
- Version was NOT pre-bumped in package.json; changeset consumed cleanly at `0.1.0`.
- CHANGELOG.md auto-generated by `pnpm exec changeset version` — no manual fallback needed.

## Authentication gate (in progress)

**npm publish** requires 2FA OTP. Prior experience (02-03, 02-04, 02-05) shows the OTP auth URL is redacted in non-TTY output — Claude bash cannot complete the handshake.

**Resolution:** Plan stops here, user runs the publish command in their own terminal. Orchestrator collects the result, runs `git push origin main`, and commits the post-publish state (no further code changes needed; version + changeset + CHANGELOG are already committed).

## Deferred Issues

Tracked in `.planning/phases/02-foundation/deferred-items.md`:

1. **Infisical CLI flag drift in `@minion-stack/env`** — `fetchInfisicalSecrets` invokes `infisical secrets --projectSlug <slug>`, but the current Infisical CLI rejects `--projectSlug` with `unknown flag`. This causes `minion doctor` to report warnings for all 6 subprojects. Out of scope for 02-06 (owned by the env package). Suggested fix: re-check `infisical secrets --help`, update the wrapper, bump `@minion-stack/env` to 0.1.1.

## Known Stubs

None. Every command has a live implementation; no placeholders or hardcoded empty data.

## Threat Flags

None. The CLI touches `node_modules` (read-only stat for link-drift), spawns child processes inheriting stdio, writes `.env.local` files at mode `0600`, and opens URLs via `xdg-open`. All surfaces were pre-modeled in the plan's threat register.

## Self-Check

- [x] `packages/cli/dist/index.js` exists (21.6 kB, ESM, shebang preserved)
- [x] `packages/cli/src/index.ts` wires all 14 named commands + shorthand alias dispatcher
- [x] `packages/cli/src/lib/link-drift.ts` exports `detectLinkDrift`, `renderDriftLine`, `hasDrift`
- [x] `packages/cli/src/commands/doctor.ts` imports + calls `detectLinkDrift`
- [x] All 6 env-resolving command modules import `from '@minion-stack/env'` and call `runCommand`
- [x] `packages/cli/test/*.test.ts` → 9/9 tests pass
- [x] `pnpm exec tsc --noEmit -p tsconfig.test.json` exits 0
- [x] `npm pack --dry-run` shows 4-file tarball (README, dist/index.js, minion.schema.json, package.json) @ 7.7 kB
- [x] `packages/cli/package.json` version = `0.1.0`, `private: true` removed
- [x] `.changeset/cli-initial.md` consumed (only `config.json` + `README.md` remain)
- [x] `packages/cli/CHANGELOG.md` exists with 0.1.0 entry
- [x] 2 commits on `main`: `d085462`, `4246d37`
- [x] `minion list --json` returns 6 subprojects
- [x] `minion branch hub` prints `dev`
- [x] `minion branch nonexistent` exits 4
- [x] `minion doctor` includes `links` column (link-drift)
- [x] `.planning/phases/02-foundation/deferred-items.md` logs Infisical CLI flag issue
- [ ] `npm view @minion-stack/cli version` returns `0.1.0` — **PENDING USER PUBLISH**
- [ ] `git push origin main` — **PENDING POST-PUBLISH** (orchestrator runs after user publishes)

## Self-Check: PASSED (pending publish)

All code-side work complete. Ready for user to execute `npm publish --access public` in their own terminal.
