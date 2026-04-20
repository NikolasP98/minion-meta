---
plan: 02-05
phase: 02-foundation
status: pending-publish
requirements: [FOUND-06, FOUND-10]
completed_at: 2026-04-20
pending_action: "npm publish (user must run in own terminal for 2FA)"
package_name: "@minion-stack/env"
target_version: "0.1.0"
---

# Plan 02-05 Summary: @minion-stack/env@0.1.0 — pending publish

## Status

- Code: **complete** (all 21 tests pass, build green, pack dry-run clean)
- Version bump: **complete** (0.0.0 → 0.1.0, changeset consumed, CHANGELOG.md generated)
- Publish: **awaiting user** — 2FA OTP URL is redacted in non-TTY output, so Claude bash cannot complete the auth handshake

## Release command (for user to run)

```sh
cd /home/nikolas/Documents/CODE/AI/packages/env && npm publish --access public
```

Expected outcome: `+ @minion-stack/env@0.1.0` and tarball live at
`https://registry.npmjs.org/@minion-stack/env/-/env-0.1.0.tgz`.

## API surface shipped

```ts
// re-exported from @minion-stack/env
export function resolveEnv(opts?: ResolveOptions): Promise<ResolvedEnv>;
export function validateEnv(env: Record<string, string>, envExamplePath: string): string[];
export function parseDotenv(text: string): Record<string, string>;
export function parseDotenvFile(filePath: string): Record<string, string>;
export function fetchInfisicalSecrets(
  projectSlug: string,
  opts?: InfisicalFetchOptions,
): Promise<InfisicalFetchResult>;

export type {
  Layer,                       // union of 6 layer names
  ResolvedVarSource,           // { name, layer }
  ResolvedEnv,                 // { env, source, warnings }
  ResolveOptions,              // { subprojectId?, cwd?, registryPath?, infisicalDomain?, noCache? }
  MinionRegistry,              // minion.json shape
  SubprojectRegistryEntry,
  InfisicalFetchResult,
  InfisicalFetchOptions,
};
```

## 6-layer precedence (as implemented)

| #   | Layer                   | Source                                  | Always applied?      |
| --- | ----------------------- | --------------------------------------- | -------------------- |
| 1   | `root-defaults`         | `<metaRoot>/.env.defaults`              | yes                  |
| 2   | `infisical-core`        | Infisical project `minion-core`         | yes (warn on fail)   |
| 3   | `subproject-defaults`   | `<sub>/.env.defaults`                   | only if `subprojectId` given |
| 4   | `infisical-subproject`  | Infisical project `minion-<name>`       | only if `subprojectId` given |
| 5   | `subproject-local`      | `<sub>/.env.local` (gitignored)         | only if `subprojectId` given |
| 6   | `process-env`           | `process.env` spread                    | yes — wins all       |

## Sample output: `resolveEnv({ subprojectId: 'hub' })` for `minion dev hub`

```js
{
  env: {
    MINION_META_REPO_ROOT: '.',
    MINION_DEFAULT_INFISICAL_DOMAIN: 'http://100.80.222.29:8080/api',
    MINION_DEFAULT_INFISICAL_CORE_PROJECT: 'minion-core',
    // + Infisical minion-core vars (when fetcher online)
    // + <hub>/.env.defaults
    // + Infisical minion-hub vars
    // + <hub>/.env.local (if present)
    // + process.env (shell passthrough)
    PATH: '/usr/bin:/usr/local/bin:...',    // from process.env
    // ...
  },
  source: [
    { name: 'MINION_META_REPO_ROOT', layer: 'root-defaults' },
    { name: 'MINION_DEFAULT_INFISICAL_DOMAIN', layer: 'root-defaults' },
    { name: 'MINION_DEFAULT_INFISICAL_CORE_PROJECT', layer: 'root-defaults' },
    { name: 'PATH', layer: 'process-env' },
    // ... never any values ...
  ],
  warnings: [
    // Empty when all .env.example vars resolved, Infisical layers live.
    // Example warnings when offline or missing secrets:
    // 'Infisical layer minion-core unavailable: exit 1'
    // 'INFISICAL_UNIVERSAL_AUTH_CLIENT_ID is declared in ...env.example but not resolved'
  ],
}
```

## Test coverage

| File                           | Tests | Covers                                                           |
| ------------------------------ | ----: | ---------------------------------------------------------------- |
| `test/dotenv.test.ts`          |     8 | parseDotenv: quoted, comments, export prefix, dupes, whitespace  |
| `test/hierarchy.test.ts`       |     3 | 6-layer precedence, no-secret-values in source[], optional subproject |
| `test/validate.test.ts`        |     3 | warnings for missing vars, silent when file missing              |
| `test/infisical.test.ts`       |     7 | spawnSync mocked: ok/fail, cache 0600, TTL read, noCache bypass, arg wiring |
| **total**                      | **21** | 100% pass                                                       |

All Infisical tests mock `node:child_process`; no test hits the real CLI or network.

## Files shipped in the tarball

```
@minion-stack/env@0.1.0 (package size 4.7 kB, unpacked 13.6 kB)
├── dist/index.js          (6.7 kB)  — bundled ESM
├── dist/index.d.ts        (2.6 kB)  — types
├── README.md              (3.4 kB)
└── package.json           (974 B)
```

Source + tests + configs are NOT shipped (correct — `files` whitelist only includes `dist/` + `README.md`).

## Commits on main

| Commit       | Message                                                               |
| ------------ | --------------------------------------------------------------------- |
| `68a7a53`    | `feat(02-05): @minion-stack/env — parseDotenv, hierarchy, validate (TDD)` |
| `e608609`    | `feat(02-05): @minion-stack/env — Infisical CLI wrapper + cache (TDD)` |
| `9763300`    | `feat(02-05): @minion-stack/env — release prep for 0.1.0`             |

## Deviations from plan

### Rule 3 — blocking build failure

**Found during:** Task 3 build step.
**Issue:** Plan specified `tsdown@^0.6`, but installed `0.6.10` crashed with `SyntaxError: The requested module 'rolldown/experimental' does not provide an export named 'transformPlugin'`. This is a broken release of tsdown 0.6.x vs current rolldown.
**Fix:** Upgraded to `tsdown@^0.21` (current stable). Build now succeeds in ~640ms.
**Side effect:** tsdown 0.21 defaults to emitting `.mjs` / `.d.mts` for `target: 'node22'`. Plan spec expects `dist/index.js` / `dist/index.d.ts`. Added `fixedExtension: false` to `tsdown.config.ts` — emits `.js` as package.json `type: module` dictates.
**Files modified:** `packages/env/package.json` (tsdown dep), `packages/env/tsdown.config.ts` (fixedExtension), `pnpm-lock.yaml`.
**Commit:** `9763300`.

### Rule 3 — tsconfig rootDir + test include conflict

**Found during:** Task 1 typecheck after initial setup.
**Issue:** Plan-provided tsconfig set `rootDir: ./src` AND `include: ["src/**/*", "test/**/*"]`, producing TS6059 errors because `test/` is outside `rootDir`.
**Fix:** Split into two configs:
- `tsconfig.json`: build config — `rootDir: ./src`, `include: src/**/*` only (used by tsdown + publish-time)
- `tsconfig.test.json`: test typecheck — no `rootDir`, `include: ["src/**/*", "test/**/*"]`, `noEmit: true` (used by `pnpm typecheck`)
**Files modified:** `packages/env/tsconfig.json`, added `packages/env/tsconfig.test.json`.
**Commit:** `68a7a53`.

### Rule 3 — ESM nodenext explicit `.js` extensions

**Found during:** Task 1 typecheck.
**Issue:** `@minion-stack/tsconfig/base.json` sets `module: nodenext`, which requires explicit `.js` extensions on relative imports. Plan-provided source snippets used extensionless imports.
**Fix:** All relative imports in `src/` and `test/` use `.js` extensions (modern ESM+TS idiom). tsdown bundles single-entry to `dist/index.js` so there are no runtime extension concerns.
**Files modified:** `src/hierarchy.ts`, `src/validate.ts`, `src/index.ts`, `src/infisical.ts`, all `test/*.ts`.
**Commit:** `68a7a53`.

### No other deviations

Plan logic + task order + TDD discipline all honored. RED phase verified (3 module-not-found errors on first tests run; 7 test failures against the Task 1 stub) before GREEN implementation in each cycle.

## Authentication gate (in progress)

**npm publish** requires 2FA OTP. Prior experience (02-03, 02-04) shows the OTP auth URL is redacted in non-TTY output — Claude bash cannot complete the handshake.

**Resolution:** Plan stops here, user runs the publish command in their own terminal. Orchestrator will collect the result and commit the post-publish state (no further code changes needed; version + changeset + CHANGELOG are already committed).

## Self-Check

- [x] `packages/env/dist/index.js` exists (6.7 kB, ESM, target node22)
- [x] `packages/env/dist/index.d.ts` exists (2.6 kB)
- [x] `packages/env/README.md` exists (3.4 kB)
- [x] `packages/env/CHANGELOG.md` exists with 0.1.0 entry
- [x] `packages/env/package.json` version = `0.1.0`, no `private: true`
- [x] `.changeset/env-initial.md` consumed (only `config.json` + `README.md` remain)
- [x] 21/21 tests pass
- [x] `tsc --noEmit -p tsconfig.test.json` clean
- [x] `npm pack --dry-run` shows 4-file tarball (README, dist/index.js, dist/index.d.ts, package.json)
- [x] 3 commits on origin/main: `68a7a53`, `e608609`, `9763300`
- [x] No code path logs secret values (grep clean)
- [ ] `npm view @minion-stack/env version` returns `0.1.0` — **PENDING USER PUBLISH**

## Self-Check: PASSED (pending publish)

All code-side work complete. Ready for user to execute `npm publish --access public` in their own terminal.
