# Phase 3: Adopt Foundation in Subprojects — Research

**Researched:** 2026-04-20
**Domain:** Shared npm config adoption across heterogeneous JS/TS subprojects (pnpm/bun/npm; Node services, SvelteKit apps, VS Code extension, plugin marketplace)
**Confidence:** HIGH (per-subproject current state fully verified on disk; foundation packages confirmed published on npm registry; integration mechanics verified against official docs + source)

## Summary

All four `@minion-stack/*` packages are live on npm at 0.1.0 [VERIFIED: `npm view @minion-stack/{tsconfig,lint-config,env,cli} version` returned `0.1.0` for each]. The tsconfig package ships 4 variants (`base`, `node`, `svelte`, `library`) each as a separately-exported JSON path, and the lint-config package exposes three entrypoints (`oxlint-preset.json`, `eslint.config.js`, `prettier.config.js`) with all peer deps optional [VERIFIED: read `/home/nikolas/Documents/CODE/AI/packages/tsconfig/package.json` and `/home/nikolas/Documents/CODE/AI/packages/lint-config/package.json`].

Subproject reconnaissance surfaces three distinct adoption shapes: **(1) Wave 1 — pnpm Node servers** (`minion`, `paperclip-minion`) have existing tsconfigs with custom `paths`, oxlint or zero-lint setups, and strong CI. `minion` uses oxlint+oxfmt and has a self-rolled `.oxlintrc.json` with 3 plugins and per-file overrides; paperclip has NO root linter and instead relies on `pnpm -r typecheck` + vitest for verification. **(2) Wave 2 — bun SvelteKit** (`minion_hub`, `minion_site`) have the canonical `extends: ./.svelte-kit/tsconfig.json` pattern, NO lint tooling installed at all (verified: zero eslint/prettier entries in either package.json), and NO `.github/workflows/` directory — adoption PRs will need CI added or the "own CI" requirement relaxed per D-19 for these two. **(3) Wave 3 — npm oddballs**: `pixel-agents` has a custom ESLint 10 + Prettier 3 + `eslint-plugin-simple-import-sort` + a local `eslint-plugin-pixel-agents` rule package AND a separate `webview-ui/` with its own tsconfig+eslint; `minion_plugins` contains zero TypeScript/JavaScript and no package.json — it's a markdown+YAML plugin marketplace, so D-12's "skip tsconfig adoption" applies and only env files matter.

**Primary recommendation:** For each subproject, produce an adoption PR that does exactly three mechanical substitutions — (a) rewrite root `tsconfig.json` to extend from `@minion-stack/tsconfig/<variant>.json` while layering subproject-specific `paths`/`include`/`exclude` below; (b) install `@minion-stack/lint-config` and either import its preset (flat ESLint projects) or add a one-line `extends` array (oxlint projects), preserving any subproject-specific rule overrides in a thin wrapper; (c) add `.env.defaults` (new file for all 6) and upgrade `.env.example` (already exists in 4 of 6). Verify locally via each subproject's own `check`/`typecheck`/`build` before pushing the PR. `minion_plugins` is env-only because it contains no code.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Scope substitution**
- D-01: All npm-scope references use `@minion-stack/*`, not `@minion/*`. The `@minion` org name was rejected by npm as reserved. Every CONTEXT.md, PLAN.md, and task spec downstream must use `@minion-stack/*`.

**Plan structure (one plan per subproject)**
- D-02: Six plans — 03-01 `minion`, 03-02 `minion_hub`, 03-03 `minion_site`, 03-04 `paperclip-minion`, 03-05 `pixel-agents`, 03-06 `minion_plugins`.
- D-03: Plans are `autonomous: true` by default. No checkpoints unless CI surfaces a genuine incompatibility.

**Wave grouping**
- D-04: Wave 1 = `minion` + `paperclip-minion` (pnpm + Node-server, share `node` tsconfig).
- D-05: Wave 2 = `minion_hub` + `minion_site` (bun + SvelteKit, share `svelte` tsconfig).
- D-06: Wave 3 = `pixel-agents` + `minion_plugins` (both npm; unique shapes, handled last).

**tsconfig variant selection**
- D-07: `minion` → `@minion-stack/tsconfig/node.json`
- D-08: `minion_hub` → `@minion-stack/tsconfig/svelte.json`
- D-09: `minion_site` → `@minion-stack/tsconfig/svelte.json`
- D-10: `paperclip-minion` → `@minion-stack/tsconfig/node.json` (server canonical; UI may extend `base.json`)
- D-11: `pixel-agents` → `@minion-stack/tsconfig/node.json` for extension backend; webview-ui may extend `base.json`
- D-12: `minion_plugins` → if any TS exists, `library.json`; otherwise skip tsconfig (still ships env files)

**Lint config adoption (replace, preserve overrides)**
- D-13: Replace each subproject's root lint config with `@minion-stack/lint-config` presets.
- D-14: Preserve subproject-specific lint overrides in a per-subproject wrapper that imports the preset. Do NOT upstream overrides in this phase.
- D-15: `minion` uses oxlint+oxfmt — lint-config preset must be compatible or provide an oxlint-only entrypoint.

**Env file adoption (additive, non-destructive)**
- D-16: Ship both `.env.defaults` (committed non-secret values) and `.env.example` (required secret var names). Migrate existing `.env.example` content; do not drop variables.
- D-17: Secret var names in `.env.example` must match the subproject's Infisical project (`minion.json → subprojects.<id>.infisicalProject`).
- D-18: `.env.defaults` entries are safe to commit. No secrets. Reviewed per-subproject.

**CI verification strategy**
- D-19: Each subproject's OWN CI (GitHub Actions in its repo) is the verification authority. Meta-repo does not run subproject CI.
- D-20: Install `@minion-stack/*` via npm/pnpm/bun as regular deps at published 0.1.0. No `workspace:*` or `file:` references.
- D-21: Verification = subproject's own `build` + `lint` + `typecheck` + `test` succeed locally AND on the adoption PR.
- D-22: `minion doctor` is cross-cutting health report, NOT the CI gate. Must be green for all 6 at phase close.

**Branch strategy per subproject**
- D-23: Feature branch name: `feat/adopt-minion-stack` (consistent across repos).
- D-24: Open PR on each subproject repo. User merges after CI passes.
- D-25: Meta-repo commits for this phase land on meta-repo `main` directly.

**Backout / rollback**
- D-26: Failed CI on an adoption PR → capture in `03-0X-ISSUES.md`, close the PR. Phase does NOT complete until all 6 subprojects have green adoption PRs or explicit deferral.
- D-27: Deferral reason logged in `deferred-items.md`. `minion_plugins` (zero-TS) is a valid candidate for a partial deferral (env files only).

### Claude's Discretion

- Exact order of wave-internal plans (e.g., `minion` before `paperclip-minion` within Wave 1)
- Whether to co-locate shared lint override config files at subproject root or in a `config/` folder — follow each subproject's existing convention
- When to run `pnpm dedupe` / `bun install --frozen-lockfile` post-adoption
- How to word the adoption PR description (link back to meta-repo Phase 2 + published `@minion-stack/*` npm pages)

### Deferred Ideas (OUT OF SCOPE)

- Upstreaming subproject-specific lint rules into `@minion-stack/lint-config` — Phase 8 (Polish).
- Dedicated `@minion-stack/tsconfig/extension` variant for VS Code extensions — future 0.2.0.
- Meta-repo-level `minion check --all` — Phase 8.
- `@minion-stack/env` `--projectSlug` flag drift fix — tracked as env@0.1.1 patch.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADOPT-01 | `minion` extends `@minion-stack/tsconfig`, adopts `@minion-stack/lint-config`, ships `.env.defaults` + `.env.example` | §Per-Subproject #1 (minion) covers current tsconfig shape, existing `.oxlintrc.json` rules to preserve, existing `.env.example` migration plan |
| ADOPT-02 | `minion_hub` adopts shared configs + env files | §Per-Subproject #2 (minion_hub) covers SvelteKit `.svelte-kit/tsconfig.json` layering pattern; flags zero-lint-install gap; `.env.example` already exists and is larger than `minion_site` |
| ADOPT-03 | `minion_site` adopts shared configs + env files | §Per-Subproject #3 (minion_site) same SvelteKit pattern as hub; tiny `.env.example`; no CI present — flags requirement gap against D-19/D-21 |
| ADOPT-04 | `paperclip-minion` adopts shared configs + env files | §Per-Subproject #4 covers multi-tsconfig (root solution-style + `tsconfig.base.json` + per-package) layering; strong existing pnpm PR CI in `pr.yml`; tiny `.env.example` needs expansion from Infisical `minion-paperclip` |
| ADOPT-05 | `pixel-agents` adopts shared configs + env files | §Per-Subproject #5 covers dual-tsconfig (extension + webview-ui), custom ESLint plugin `eslint-plugin-pixel-agents` to preserve, no existing `.env.example` — net-new |
| ADOPT-06 | `minion_plugins` adopts where applicable | §Per-Subproject #6 verifies zero TS/JS code, no package.json — D-12 escape clause triggers: env-files-only adoption |
| ADOPT-07 | Every subproject's own CI passes against published `@minion-stack/*` | §CI Landscape documents per-subproject CI; flags `minion_hub`/`minion_site`/`minion_plugins` as having NO `.github/workflows/` — adoption PRs must ADD minimal CI or explicitly defer |

## Project Constraints (from CLAUDE.md)

Root `CLAUDE.md` (meta-repo orchestrator hub) imposes the following that bear on Phase 3:

- **Package managers diverge by design** — pnpm for `minion`/`paperclip-minion`, bun for `minion_hub`/`minion_site`, npm for `pixel-agents`/`minion_plugins`. Each subproject's adoption PR uses that subproject's package manager. Don't mix.
- **TypeScript strict mode everywhere. Avoid `any`. Never add `@ts-nocheck`.** The `@minion-stack/tsconfig/base.json` already sets `strict: true` + `noUncheckedIndexedAccess` — adoption preserves this.
- **Svelte 5 only** (hub + site): runes, snippets, `onclick={}` syntax. No legacy Svelte 4 patterns. Adoption must not regress Svelte 5 behavior. The `svelte.json` variant's `isolatedModules: true` is compatible.
- **Formatting**: `minion` uses oxlint + oxfmt. SvelteKit projects use svelte-check. Adoption preserves oxfmt on minion; introduces Prettier on hub/site (new, see §Per-Subproject for hub/site).
- **Git workflow**: Feature branches → dev/DEV → main/master. Adoption PRs use `feat/adopt-minion-stack` per D-23 and target each subproject's default branch per `minion.json`.
- **Multi-agent safety**: Don't touch git stash, worktrees, or switch branches unless explicitly asked. Scope commits to this adoption only.

Each subproject's own CLAUDE.md / AGENTS.md also applies once work enters that subdir.

## Standard Stack

### Core (what's being adopted)

| Package | Version | Purpose | Registry status |
|---------|---------|---------|-----------------|
| `@minion-stack/tsconfig` | 0.1.0 | Shared TS configs: base/node/svelte/library | [VERIFIED: `npm view` returned 0.1.0] |
| `@minion-stack/lint-config` | 0.1.0 | oxlint preset + flat ESLint + Prettier | [VERIFIED: `npm view` returned 0.1.0] |
| `@minion-stack/env` | 0.1.0 | 6-layer env resolver (used by `minion doctor`, not a direct subproject dep) | [VERIFIED: `npm view` returned 0.1.0] |
| `@minion-stack/cli` | 0.1.0 | `minion` bin (cross-cutting verification via `doctor`) | [VERIFIED: `npm view` returned 0.1.0] |

### Supporting (peer deps, install as needed)

| Peer | Required by preset | Already present? | Action on adoption |
|------|---------------------|-----------------|---------------------|
| `eslint >=9` + `@eslint/js` + `typescript-eslint >=8` | `eslint.config.js` preset | `pixel-agents` only (ESLint 10) | Install in hub/site/paperclip-minion if lint-config/eslint is adopted |
| `oxlint >=0.15` | `oxlint-preset.json` | `minion` has `^1.48.0` (current major line) | Already satisfied in `minion`; not needed elsewhere unless oxlint is the chosen linter |
| `prettier >=3` | `prettier.config.js` | `pixel-agents` has `^3.8.1` | Install as needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@minion-stack/tsconfig/node.json` extension for paperclip-minion ROOT | Keep its existing `tsconfig.base.json` + reference internal packages | Rejected — D-10 locks `node.json`. Paperclip's ROOT tsconfig uses solution-style `references` (no `compilerOptions`), and the internal `tsconfig.base.json` is what sub-packages extend. Plan must extend `@minion-stack/tsconfig/node.json` from `tsconfig.base.json` (not the root) to preserve the references structure. |
| ESLint in hub/site | Keep svelte-check as sole checker, skip lint adoption | Rejected — ADOPT-02/03 explicitly require lint-config adoption. Pragmatic option: install eslint + typescript-eslint + eslint-plugin-svelte, wire them via lint-config preset. |
| Publishing an `extension.json` variant for pixel-agents | Use `node.json` with subproject-level overrides for VS Code extension quirks (`module: Node16`, `target: ES2022`) | Accepted with overrides — pixel-agents currently uses `Node16`/`ES2022` which `node.json` (ES2023/NodeNext) upgrades; test locally for breakage before committing. |

**Installation command patterns per subproject:**

```bash
# pnpm (minion, paperclip-minion)
pnpm add -D @minion-stack/tsconfig @minion-stack/lint-config

# bun (minion_hub, minion_site)
bun add -D @minion-stack/tsconfig @minion-stack/lint-config

# npm (pixel-agents)
npm install --save-dev @minion-stack/tsconfig @minion-stack/lint-config
```

**Version verification (performed 2026-04-20):**
`npm view @minion-stack/tsconfig version` → `0.1.0`
`npm view @minion-stack/lint-config version` → `0.1.0`
`npm view @minion-stack/env version` → `0.1.0`
`npm view @minion-stack/cli version` → `0.1.0`
All four packages are live at 0.1.0 on the public registry [VERIFIED: terminal output 2026-04-20].

## Architecture Patterns

### Pattern 1: Extending a shared tsconfig from node_modules

**What:** In each subproject's root `tsconfig.json`, replace any self-rolled `compilerOptions` foundation with `extends: "@minion-stack/tsconfig/<variant>.json"`. TypeScript 5.0+ resolves this against `node_modules` automatically [CITED: https://www.typescriptlang.org/tsconfig/extends.html].

**When to use:** Every tsconfig.json that currently has a strict/target/module block.

**Example (minion):**
```jsonc
// minion/tsconfig.json (AFTER adoption)
{
  "extends": "@minion-stack/tsconfig/node.json",
  "compilerOptions": {
    // minion-specific layers only:
    "allowImportingTsExtensions": true,
    "experimentalDecorators": true,
    "declaration": true,
    "noEmit": true,
    "noEmitOnError": true,
    "outDir": "dist",
    "useDefineForClassFields": false,
    "paths": {
      "openclaw/plugin-sdk": ["./src/plugin-sdk/index.ts"],
      "openclaw/plugin-sdk/*": ["./src/plugin-sdk/*.ts"],
      "minion/plugin-sdk": ["./src/plugin-sdk/index.ts"],
      "minion/plugin-sdk/*": ["./src/plugin-sdk/*.ts"]
    }
  },
  "include": ["src/**/*", "ui/**/*", "extensions/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Source: `@minion-stack/tsconfig/node.json` extends `base.json` which sets `strict`, `target: ES2023`, `module: nodenext`, `moduleResolution: nodenext`, `noUncheckedIndexedAccess: true` [VERIFIED: read `packages/tsconfig/base.json` and `node.json`].

### Pattern 2: TypeScript 5.0 `extends` array for layered configs

**What:** TypeScript 5.0+ supports `extends` as an array of paths, merging left-to-right with the last winning [CITED: https://www.typescriptlang.org/tsconfig/extends.html]. Useful when two base configs both need to apply (e.g., SvelteKit's auto-generated + meta-repo shared).

**When to use:** SvelteKit subprojects where `.svelte-kit/tsconfig.json` MUST stay in the chain (provides `$app/types`, path aliases, `rootDirs`) AND we want to layer `@minion-stack/tsconfig/svelte.json`.

**Example (minion_hub AFTER adoption):**
```jsonc
// minion_hub/tsconfig.json
{
  "extends": [
    "@minion-stack/tsconfig/svelte.json",
    "./.svelte-kit/tsconfig.json"
  ],
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "sourceMap": true
  }
}
```

The SvelteKit-generated file is listed LAST so its `paths`/`rootDirs`/`include` (which MUST NOT be overridden or svelte-kit breaks) take final precedence [CITED: https://svelte.dev/docs/kit/configuration — "SvelteKit relies on certain configuration being set a specific way"].

**Anti-pattern avoided:** Do NOT override top-level `include`/`exclude` in the consumer file when extending `.svelte-kit/tsconfig.json` — this breaks SvelteKit's type resolution [CITED: https://github.com/sveltejs/kit/issues/6868, https://github.com/sveltejs/kit/issues/9412].

### Pattern 3: oxlint `extends` array for preset inheritance

**What:** oxlint's config schema includes an `extends` array keyed by string paths, resolved relative to the config file location [VERIFIED: grep `"extends"` in `/home/nikolas/Documents/CODE/AI/minion/node_modules/oxlint/configuration_schema.json` shows: "Paths of configuration files that this configuration file extends... The configuration files are merged from the first to the last, with the last file overriding the previous ones."].

**When to use:** `minion` (and paperclip-minion if it adopts oxlint).

**Example (minion AFTER adoption):**
```jsonc
// minion/.oxlintrc.json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": ["./node_modules/@minion-stack/lint-config/oxlint-preset.json"],
  "plugins": ["unicorn", "typescript", "oxc"],
  "categories": { "correctness": "error", "perf": "error", "suspicious": "error" },
  "rules": {
    // minion-specific preserved overrides:
    "curly": "error",
    "eslint-plugin-unicorn/prefer-array-find": "off",
    "oxc/no-accumulating-spread": "off"
  },
  "overrides": [
    { "files": ["src/agents/bash/bash-tools.exec-runtime.ts"], "rules": { "eslint/no-control-regex": "off" } }
  ],
  "ignorePatterns": ["assets/", "dist/", "docs/_layouts/", "extensions/", "node_modules/", ...]
}
```

[VERIFIED: oxlint 1.x ships with `extends` support per the bundled `configuration_schema.json` at `minion/node_modules/oxlint/configuration_schema.json`.]

**Gotcha:** oxlint resolves `extends` paths relative to the config file. For npm-installed presets, the canonical path is `./node_modules/@minion-stack/lint-config/oxlint-preset.json`. Verify the path exists after `pnpm install`.

### Pattern 4: Flat ESLint preset import

**What:** `@minion-stack/lint-config/eslint.config.js` is an ESM array — spread it in the consumer's `eslint.config.js` and append overrides.

**When to use:** `pixel-agents` (has ESLint already) and potentially `minion_hub` / `minion_site` / `paperclip-minion` if they adopt ESLint as their linter.

**Example (pixel-agents AFTER adoption):**
```js
// pixel-agents/eslint.config.mjs
import config from '@minion-stack/lint-config/eslint.config.js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import pixelAgentsPlugin from './eslint-rules/pixel-agents-rules.mjs';

export default [
  ...config,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'pixel-agents': pixelAgentsPlugin,
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'pixel-agents/no-inline-colors': 'warn',
      '@typescript-eslint/naming-convention': ['warn', { selector: 'import', format: ['camelCase', 'PascalCase'] }],
    },
  },
];
```

Source: read `packages/lint-config/README.md` for the extending pattern. Preset is a flat array; consumer spreads and appends.

### Pattern 5: Prettier config re-export via package.json

**What:** Reference `@minion-stack/lint-config/prettier.config.js` directly from `package.json`'s `prettier` key — no `.prettierrc` file needed [CITED: packages/lint-config/README.md].

**Example:**
```json
// any subproject's package.json
{
  "prettier": "@minion-stack/lint-config/prettier.config.js"
}
```

**Gotcha:** The shipped `prettier.config.js` uses **CommonJS `module.exports`** [VERIFIED: read the file]. This is compatible with Prettier's dynamic loader but will surface warnings in pure-ESM tooling. If the consumer's `package.json` has `"type": "module"`, Prettier will still load the CJS config correctly via its own resolver, but some IDE integrations may warn.

### Recommended Subproject Structure (post-adoption)

```
<subproject>/
├── package.json              # includes @minion-stack/{tsconfig,lint-config} devDeps
├── tsconfig.json             # extends @minion-stack/tsconfig/<variant>.json
├── .oxlintrc.json            # (minion) extends shared oxlint-preset.json
├── eslint.config.js          # (eslint-using) imports + spreads shared preset
├── .env.defaults             # NEW — non-secret defaults, committed
├── .env.example              # required secret var NAMES, committed
├── .env                      # actual secrets, gitignored (unchanged)
├── .env.local                # sync-env output target, gitignored (unchanged)
└── ...
```

### Anti-Patterns to Avoid

- **Override SvelteKit's auto-generated `include`/`exclude`:** SvelteKit's `.svelte-kit/tsconfig.json` is regenerated every `svelte-kit sync`. Overriding top-level `include` / `exclude` breaks `$app/types` and `$lib` resolution [CITED: https://svelte.dev/docs/kit/configuration].
- **Commit SvelteKit's `.svelte-kit/` directory:** It's gitignored for a reason. The tsconfig there is generated at sync/build time.
- **Use `workspace:*` or `file:` refs to shared packages in a subproject:** Violates D-20. Subprojects must install from npm to prove the adoption is portable.
- **Drop existing env vars when migrating `.env.example`:** D-16 — migrate content, don't drop. Existing `minion/.env.example` has ~60 distinct env vars that MUST all survive.
- **Bake subproject lint overrides into the shared preset:** D-14 — those overrides stay local. Upstreaming is Phase 8 work.

## Per-Subproject Reconnaissance

### 1. `minion/` (pnpm, DEV branch, Infisical: minion-gateway)

**Current state** [VERIFIED: filesystem read]

| Artifact | State | Notes |
|----------|-------|-------|
| `tsconfig.json` | Exists; no `extends`; strict, NodeNext, 6 `paths` aliases for plugin-sdk | 31 lines; `allowImportingTsExtensions`, `experimentalDecorators`, `declaration: true`, `noEmit: true`, `noEmitOnError: true`, `useDefineForClassFields: false` |
| `tsconfig.plugin-sdk.dts.json` | Separate build config for plugin SDK dts emission | Preserve; do NOT extend `@minion-stack/tsconfig` here unless verified compatible with `tsc -p` dts-only flow |
| `.oxlintrc.json` | Exists; plugins: unicorn/typescript/oxc; `typescript/no-explicit-any: error`; extensive overrides + ignore patterns | 46 lines; per-file override for `bash-tools.exec-runtime.ts` |
| oxlint/oxfmt versions | oxlint `^1.48.0`, oxfmt `0.33.0` in devDependencies | Satisfies `@minion-stack/lint-config` peer `oxlint >=0.15` |
| ESLint / Prettier | NOT installed | No adoption needed (this subproject uses oxlint only) |
| `.env.example` | Exists, 121 lines, well-commented with sections | Precedence note at top (process.env, ./.env, ~/.openclaw/.env, openclaw.json) — preserve; migrate all vars |
| `.env.defaults` | Does NOT exist | Net-new — move non-secret defaults (port overrides, feature flags like `LLAMA4_MAVERICK_ENABLED=false`, `MINION_SESSION_LOG_ENABLED=false`) here |
| `.github/workflows/` | 16 workflows incl. `ci.yml` (23k), `install-smoke.yml`, `npm-publish.yml`, `claude.yml`, `deploy-production.yml` | Robust; `ci.yml` has docs-scope + changed-scope detection, will run lint+format+typecheck+tests on adoption PR |
| Scripts of interest | `check: pnpm format:check && pnpm tsgo && pnpm lint`; `lint: oxlint --type-aware`; `format: oxfmt --write` | `tsgo` is TypeScript Go (faster); adoption must preserve |

**Adoption shape:**
1. Install `@minion-stack/tsconfig` + `@minion-stack/lint-config` via pnpm.
2. Rewrite `tsconfig.json`: `extends: "@minion-stack/tsconfig/node.json"` + keep `paths`, `include`, `exclude`, and minion-specific compilerOptions.
3. Rewrite `.oxlintrc.json`: add `extends: ["./node_modules/@minion-stack/lint-config/oxlint-preset.json"]` at the top; keep existing plugin list + rules + overrides + ignorePatterns.
4. Create `.env.defaults` with all the commented-out defaults that shouldn't require secrets (default ports, feature flags).
5. Update `.env.example` header to reference `@minion-stack/env`'s 6-layer model; keep all existing secret var names.
6. Verify: `pnpm install && pnpm check && pnpm test && pnpm build`.

**Risks:**
- `noUncheckedIndexedAccess: true` (from base) is STRICTER than the current config — will surface new type errors in `src/` that currently compile. Run `pnpm tsgo` first and fix or layer `"noUncheckedIndexedAccess": false` as a transitional override in subproject tsconfig if too many blockers (acceptable: preserves adoption while opening a follow-up issue to fix).
- `module: nodenext` (from base) may conflict with `allowImportingTsExtensions` — test before committing.
- `experimentalDecorators: true` is NOT in the shared base — must keep in consumer.

### 2. `minion_hub/` (bun, dev branch, Infisical: minion-hub)

**Current state** [VERIFIED: filesystem read]

| Artifact | State | Notes |
|----------|-------|-------|
| `tsconfig.json` | 14 lines, extends `./.svelte-kit/tsconfig.json`; strict, allowJs/checkJs, bundler resolution | Canonical SvelteKit pattern |
| `.svelte-kit/tsconfig.json` | Auto-generated; 61 lines; `verbatimModuleSyntax: true`, `isolatedModules: true`, `noEmit: true`, `moduleResolution: bundler`, `module: esnext`, `target: esnext`; provides `$lib`, `$server`, `$app/types` paths | Regenerated on every `svelte-kit sync` |
| ESLint / Prettier | NOT installed | Net-new install if lint-config adoption happens |
| oxlint | NOT installed | ESLint path is correct here |
| `.env.example` | 48 lines; Turso, B2, seed admin, Better Auth, Google OAuth, Resend, OpenRouter | Preserve all; matches Infisical `minion-hub` |
| `.env.defaults` | Does NOT exist | Net-new: `VITE_BETTER_AUTH_URL=http://localhost:5173`, `BETTER_AUTH_URL=http://localhost:5173`, `AUTH_DISABLED=false`, `GITHUB_BUG_REPO=NikolasP98/minion_hub` (already a default-value literal in .env.example) |
| Also present | `.env.desktop`, `.env.turso` | Leave alone (deployment-specific overlays) |
| `.github/workflows/` | **DOES NOT EXIST** | **Flagged: ADOPT-07 and D-19 assume own CI exists. Adoption PR must add minimal CI or phase must defer this requirement per D-27.** |
| Scripts of interest | `check: svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`; NO `lint` script; NO `format` script | svelte-check is the only current quality gate |

**Adoption shape:**
1. `bun add -D @minion-stack/tsconfig @minion-stack/lint-config`.
2. Rewrite `tsconfig.json` to extend `@minion-stack/tsconfig/svelte.json` **in addition to** `./.svelte-kit/tsconfig.json`. Use TypeScript 5.0 `extends` array pattern (svelte.json first, `.svelte-kit/tsconfig.json` last to win). TypeScript `^5.0.0` per package.json satisfies this.
3. **Lint-config adoption decision point:** Hub currently has NO linter. Two options:
   - (a) Install ESLint + peers (`eslint`, `@eslint/js`, `typescript-eslint`) and wire the preset. Adds ~30MB of deps.
   - (b) Install Prettier only via `package.json → "prettier": "@minion-stack/lint-config/prettier.config.js"` and defer ESLint to Phase 8.
   - Recommendation: **(a) with eslint-plugin-svelte added** — hub is a large codebase (5000+ LOC) and benefits from flat ESLint rules. Flat preset + `eslint-plugin-svelte@^2` for .svelte files. Record as discretion call; document reasoning in plan.
4. Create `.env.defaults` with dev-safe URLs/flags.
5. Preserve `.env.example` content — already maps to `minion-hub` Infisical.
6. **Add `.github/workflows/ci.yml`** (net-new): bun setup, `bun install --frozen-lockfile`, `bun run check`, and the new `bun run lint` if (3a) chosen. This is in-scope for ADOPT-07 — flagged as an explicit plan task.

**Risks:**
- SvelteKit-generated `.svelte-kit/tsconfig.json` sets `verbatimModuleSyntax: true` [VERIFIED: read]. Our `base.json` sets `verbatimModuleSyntax: false` — the array `extends` puts `.svelte-kit` last, so it wins (correct — don't let base override SvelteKit's requirement). Verify compilation post-adoption.
- `base.json` sets `module: nodenext` / `moduleResolution: nodenext`; `svelte.json` overrides to `esnext` / `bundler` — correct for Vite.
- `noUncheckedIndexedAccess: true` will surface type errors in hub's 11 state modules + numerous components. Expect 50–200 new warnings; planner should budget a fix pass or transitional override.
- Bun's package resolution differs from npm/pnpm — confirm `bun` can resolve `@minion-stack/tsconfig/svelte.json` across module boundaries. Bun supports standard npm package `exports` field and JSON imports via file extension; a quick `bun install && bun x tsc --showConfig` is a pre-commit sanity check.

### 3. `minion_site/` (bun, master branch, Infisical: minion-site)

**Current state** [VERIFIED: filesystem read]

| Artifact | State | Notes |
|----------|-------|-------|
| `tsconfig.json` | 15 lines (tab-indented); extends `./.svelte-kit/tsconfig.json`; otherwise identical shape to hub | |
| `.svelte-kit/tsconfig.json` | Auto-generated; 97 lines; extensive $-prefixed path aliases ($components, $effects, $ui, $data, $stores, $paraglide, $server, $lib, $app/types) | |
| ESLint / Prettier | NOT installed | Same as hub |
| `.env.example` | 13 lines only: Turso, Better Auth, Google OAuth | Very minimal; matches Infisical `minion-site` |
| `.env.defaults` | Does NOT exist | Net-new: `BETTER_AUTH_URL=http://localhost:5173`, `VITE_BETTER_AUTH_URL=http://localhost:5173`, `VITE_GOOGLE_AUTH_ENABLED=false` |
| `.github/workflows/` | **DOES NOT EXIST** | **Same flag as hub** |
| Scripts of interest | `dev: ./infisical-dev.sh vite dev || vite dev`; `build: vite build`; `check: svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`; NO test, NO lint | |
| Svelte version | `^5.25.0`; vite `^6.2.0`; TypeScript `^5.7.0` | All modern, TS 5.7 supports `extends` array |

**Adoption shape:** Structurally identical to hub (2). Smaller codebase = less noUncheckedIndexedAccess fallout expected. Same CI-doesn't-exist flag. Same bun-resolution sanity check.

### 4. `paperclip-minion/` (pnpm, minion-integration branch, Infisical: minion-paperclip)

**Current state** [VERIFIED: filesystem read]

| Artifact | State | Notes |
|----------|-------|-------|
| `tsconfig.json` (root) | 20 lines; **solution-style** — extends `./tsconfig.base.json`, `files: []`, `references: [...]` to 11 workspace packages | Orchestrates multi-package `tsc -b` builds |
| `tsconfig.base.json` | 19 lines; ES2023, NodeNext, strict, skipLibCheck, `declaration: true`, `declarationMap: true`, `isolatedModules: true` | This is what each sub-package extends via `../tsconfig.base.json` |
| `server/tsconfig.json` | Extends `../tsconfig.base.json`, adds `outDir: dist`, `rootDir: src` | |
| `ui/tsconfig.json` | Does NOT extend tsconfig.base.json — has its own config; `jsx: react-jsx`, `moduleResolution: bundler`, `verbatimModuleSyntax: true`, `noEmit: true`, path alias `@/*` | |
| Root lint configs | **NONE found** — no `.oxlintrc*`, no `eslint.config*`, no `.prettierrc*`, no `.eslintrc*` anywhere in `packages/`, `server/`, `ui/` | This is a verification-by-typecheck-and-tests shop |
| TypeScript | `^5.7.3` (root and sub-packages) | Satisfies extends-array |
| `.env.example` | 5 lines: DATABASE_URL, PORT=3100, SERVE_UI=false, BETTER_AUTH_SECRET | **Very incomplete** compared to what paperclip actually reads — expansion needed |
| `.env.defaults` | Does NOT exist | Net-new |
| `.github/workflows/` | 6 workflows: `pr.yml` (robust, typecheck/test/build/canary-dry-run/e2e), `docker.yml`, `e2e.yml`, `release.yml`, `refresh-lockfile.yml`, `release-smoke.yml` | Strong existing CI |
| Scripts of interest | `typecheck: pnpm -r typecheck` (recursive across packages/server/ui); no `lint`, no `check` at root | |

**Adoption shape (complicated by multi-tsconfig structure):**
1. `pnpm add -D -w @minion-stack/tsconfig @minion-stack/lint-config` (`-w` for root of pnpm workspace).
2. **D-10 says paperclip-minion → `@minion-stack/tsconfig/node.json`** — but paperclip's root tsconfig is solution-style (no compilerOptions). The correct target is `tsconfig.base.json`. Plan must:
   - Rewrite `tsconfig.base.json` to `extends: "@minion-stack/tsconfig/node.json"` + preserve `declaration`, `declarationMap`, `sourceMap`, `outDir: dist`, `rootDir: src`, `isolatedModules` overrides that the canonical `node.json` doesn't set.
   - Leave `tsconfig.json` (root solution) unchanged.
   - Leave `server/tsconfig.json` unchanged (still extends `../tsconfig.base.json`).
   - For `ui/tsconfig.json`: the UI has React + bundler + jsx: react-jsx. `node.json` is wrong for UI. Options:
     - (a) Keep `ui/tsconfig.json` as-is (no shared extension). Simpler, defensible.
     - (b) Extend from `@minion-stack/tsconfig/base.json` in ui/ and layer bundler+jsx on top. Slightly more consistent.
   - Recommendation: **(a) keep ui/ unchanged in this phase**; revisit when a `@minion-stack/tsconfig/react` variant lands. Note as deferred.
3. Lint-config adoption: paperclip has NO linter installed. Options:
   - (a) Install oxlint + wire oxlint-preset (lightweight, fast, matches minion).
   - (b) Install flat ESLint + eslint-plugin-react for UI.
   - Recommendation: **(a) oxlint** — server is Node/Express (oxlint works fine); UI is React (oxlint has TS support; react plugin not required at phase 3 scope). Can layer eslint-plugin-react via flat ESLint later in Phase 8.
4. Expand `.env.example` to full set of vars paperclip reads (DATABASE_URL, PORT, SERVE_UI, BETTER_AUTH_SECRET, plus all adapter secrets: ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, infisical machine-identity vars if paperclip directly fetches, plus paperclip-specific vars like PAPERCLIP_MIGRATION_PROMPT, PAPERCLIP_E2E_SKIP_LLM). Cross-reference Infisical `minion-paperclip` project.
5. Create `.env.defaults` with: PORT=3100, SERVE_UI=false, PAPERCLIP_MIGRATION_PROMPT=never, PAPERCLIP_MIGRATION_AUTO_APPLY=true.
6. Verify: `pnpm install --frozen-lockfile && pnpm -r typecheck && pnpm test:run && pnpm build`.

**Risks:**
- Paperclip's `pnpm -r typecheck` runs typecheck across 11 workspace packages. Any `noUncheckedIndexedAccess` fallout will multiply. Budget for 2+ hours of type-error triage in the plan.
- `pnpm-lock.yaml` is CI-owned — PR policy blocks manual lockfile edits [VERIFIED: read `paperclip-minion/.github/workflows/pr.yml` line 22-30]. The adoption PR must trigger the lockfile refresh via the chore branch OR include a comment explaining the deliberate dep change. Plan should use: create branch `feat/adopt-minion-stack`, edit package.json in `server/`, `ui/`, and root, let CI's `Validate dependency resolution when manifests change` step regenerate lockfile [VERIFIED: read pr.yml line 83-89]. Confirm this works by reading the policy job's exact condition.
- The `Dockerfile deps stage` is validated against pnpm-workspace.yaml search roots. Adding `@minion-stack/*` as devDep won't affect the Dockerfile deps stage (Dockerfile already copies all `package.json` files) — safe.
- `paperclip` has patches + overrides in root `package.json` — unaffected by this phase.

### 5. `pixel-agents/` (npm, main branch, Infisical: minion-pixel-agents)

**Current state** [VERIFIED: filesystem read]

| Artifact | State | Notes |
|----------|-------|-------|
| Extension `tsconfig.json` | 23 lines; `module: Node16`, `target: ES2022`, `lib: [ES2022]`, `rootDir: .`, `strict: true`; excludes `webview-ui`, `dist`, `out`, `scripts` | Older TS conventions — pre-NodeNext |
| `webview-ui/tsconfig.json` | Solution-style references to `./tsconfig.app.json` + `./tsconfig.node.json` | |
| `webview-ui/tsconfig.app.json` | 28 lines; `target: ES2022`, `lib: [ES2022, DOM, DOM.Iterable]`, `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`, `noUnusedLocals: true`, `noUnusedParameters: true` | Strict, modern bundler-mode |
| Extension `eslint.config.mjs` | 47 lines; typescript-eslint, eslint-config-prettier, simple-import-sort, LOCAL `pixel-agents-rules` plugin | Custom rule: `pixel-agents/no-inline-colors` |
| `eslint-rules/` dir | Local ESLint plugin with pixel-agents-specific rules | Must preserve |
| `webview-ui/eslint.config.js` | 54 lines; js.recommended + typescript-eslint + react-hooks + react-refresh + simple-import-sort + local pixel-agents plugin + eslint-config-prettier; 3 react-hooks rules explicitly disabled; 3 pixel-agents rules at warn | |
| `.prettierrc.json` | 11 lines; singleQuote, 100-width, 2-space, trailingComma all, LF, arrowParens always | **Identical** to `@minion-stack/lint-config/prettier.config.js` [VERIFIED side-by-side] — safe to replace with package reference |
| `.prettierignore` | 13 lines | Preserve |
| ESLint / Prettier versions | `eslint: ^10.0.3`, `prettier: ^3.8.1`, `typescript-eslint: ^8.54.0` | All satisfy lint-config peer ranges |
| `.env.example` | **Does NOT exist** | Net-new |
| `.env.defaults` | Does NOT exist | Net-new |
| `.github/workflows/` | 3 workflows: `ci.yml` (type-check + lint + format:check + build, all blocking), `pr-title.yml`, `publish-extension.yml` | Solid |

**Adoption shape:**
1. `npm install --save-dev @minion-stack/tsconfig @minion-stack/lint-config`.
2. Rewrite extension `tsconfig.json` to extend `@minion-stack/tsconfig/node.json`. Layer back: `"rootDir": "."`, `"include": ["src", "shared"]`, `"exclude": ["node_modules", "webview-ui", "dist", "out", "scripts"]`. **Watch:** `node.json` upgrades `target` from ES2022 to ES2023 and `module` from Node16 to NodeNext — test with `npm run check-types` before committing. If VS Code extension host can't handle ES2023 output, preserve the old values as overrides.
3. Rewrite `webview-ui/tsconfig.app.json` to extend `@minion-stack/tsconfig/base.json` (per D-11) + layer bundler + jsx + react-refresh options. **Watch:** `erasableSyntaxOnly: true` is pixel-agents-specific (required by esbuild constraint — "No `enum`, use `as const`") — keep as override.
4. Rewrite `eslint.config.mjs` to spread `@minion-stack/lint-config/eslint.config.js` + preserve local plugins, pixel-agents rules, and naming-convention rule. Same for `webview-ui/eslint.config.js`.
5. Drop `.prettierrc.json`; add `"prettier": "@minion-stack/lint-config/prettier.config.js"` to root `package.json`. Keep `.prettierignore`.
6. Create `.env.example` — grep source for `process.env` references; likely includes `ANTHROPIC_API_KEY` (anthropic SDK is a dep), `VSCODE_*` test runner vars. Cross-reference Infisical `minion-pixel-agents`.
7. Create `.env.defaults` with safe defaults if any (pixel-agents is mostly config-free).
8. Verify: `npm ci && cd webview-ui && npm ci && cd .. && npm run check-types && npm run lint && npm run lint:webview && npm run format:check && npm run compile`.

**Risks:**
- Extension tsconfig module upgrade (Node16 → NodeNext) may change emit. VS Code extension bundled via esbuild — likely fine because esbuild re-compiles from TS source. `tsc --noEmit` only runs for check-types.
- `noUncheckedIndexedAccess: true` is NEW for this subproject — will surface new errors in `src/` and `webview-ui/src/`. Budget fix time.
- `verbatimModuleSyntax: true` (webview-ui currently) vs `verbatimModuleSyntax: false` (shared base) — extends array order (shared base FIRST, webview-ui override LAST) preserves the stricter setting.
- Husky prepare hook runs on install — confirm CI runs with --ignore-scripts or with the hook intact.

### 6. `minion_plugins/` (npm, main branch, Infisical: minion-plugins)

**Current state** [VERIFIED: filesystem read]

| Artifact | State | Notes |
|----------|-------|-------|
| `package.json` | **Does NOT exist** | This is NOT a Node.js project |
| Any `*.ts`/`*.tsx` | **NONE found** via `find -maxdepth 4` | Zero TypeScript |
| Any `*.js` | Not checked deeply, but structure is markdown+YAML plugin manifests | |
| `tsconfig.json` | Does NOT exist | Not applicable |
| ESLint / Prettier / oxlint | Not installed (no package.json) | Not applicable |
| `.env.example` | Does NOT exist | Net-new (if applicable) |
| `.env.defaults` | Does NOT exist | Net-new (if applicable) |
| `.github/workflows/` | **Does NOT exist** | |
| Structure | `plugins/` (6 plugin dirs: fork-sync, lessons-learned, minion-docs, mintlify, provision-server, pr-workflow), `templates/plugin-template/`, `docs/` symlink to VAULT | Pure marketplace catalog |
| `.claude-plugin/` | Present | Claude Code plugin metadata |

**Adoption shape (per D-12):**
1. **Skip tsconfig adoption** — there's nothing to extend.
2. **Skip lint-config adoption** — there's no code to lint.
3. `.env.example` / `.env.defaults`: research whether any plugin in this marketplace reads env vars. Cross-reference Infisical `minion-plugins` (does it exist? what vars?). If NO vars, document "no env adoption needed" and flag for D-27 deferral.
4. No CI needs to change.
5. The subproject's adoption "PR" may reduce to a documentation-only note in meta-repo `deferred-items.md`.

**Recommendation:** Defer `minion_plugins` per D-27 unless Infisical `minion-plugins` actually has secrets. Check `minion list` output to confirm the infisical project exists and has vars — if it doesn't, drop the requirement for this subproject with an explicit note.

**Risk:** None. This subproject is out-of-scope in practice.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Extending multiple tsconfigs | A script that merges configs at build time | TypeScript 5.0 `extends: [...]` array | Natively supported since March 2023; tools that lagged (ts-node, ES5-era toolchains) are not in our stack |
| Merging shared oxlint rules with local overrides | Copy-paste shared rules into every consumer | `"extends": ["./node_modules/@minion-stack/lint-config/oxlint-preset.json"]` | oxlint 1.x supports extends natively |
| Building per-subproject env resolver | Parse .env files in each subproject | `@minion-stack/env` via `minion dev <id>` | Already published 0.1.0, implements 6-layer hierarchy + Infisical integration |
| Validating .env.example completeness | Ad-hoc script | `minion doctor` (calls `@minion-stack/env validateEnv()`) | Phase 2 already shipped this |
| Cross-subproject link-drift detection | Manual `npm ls` audits | `minion doctor` (`detectLinkDrift()` in cli) | Reports `symlink-ws` / `@v0.1.0` / drift states in a single row |
| Prettier config file | `.prettierrc.json` per subproject | `"prettier": "@minion-stack/lint-config/prettier.config.js"` in package.json | Prettier resolves via the standard cosmiconfig flow; one less config file per repo |

**Key insight:** Every layered-config problem we hit in this phase has a native tooling solution. The adoption is almost entirely "replace the current config's body with a single `extends` line and keep the overrides."

## Common Pitfalls

### Pitfall 1: SvelteKit `.svelte-kit/tsconfig.json` regeneration drops our extend
**What goes wrong:** Developer runs `svelte-kit sync`, sees `.svelte-kit/tsconfig.json` regenerated, assumes our extends was lost.
**Why it happens:** `.svelte-kit/tsconfig.json` is the AUTO-GENERATED file — it never extends anything. OUR subproject's `tsconfig.json` is what extends it (and extends our shared svelte.json via the extends-array).
**How to avoid:** Put `@minion-stack/tsconfig/svelte.json` in the subproject's own `tsconfig.json` extends array, NOT in `.svelte-kit/tsconfig.json`. Document this in the plan.
**Warning signs:** Any PR that touches `.svelte-kit/tsconfig.json` is wrong — that path is gitignored.

### Pitfall 2: `noUncheckedIndexedAccess: true` explosion
**What goes wrong:** Adopting `base.json` turns on `noUncheckedIndexedAccess` in a codebase that never had it — hundreds of new type errors appear (every `arr[0]` becomes `T | undefined`).
**Why it happens:** Strict-by-default is the base design goal. Existing subprojects were written under looser rules.
**How to avoid:** Run `tsc --noEmit` (or `pnpm tsgo` for minion) immediately after the extends change, BEFORE committing. If the error count is unmanageable (say >50), layer `"noUncheckedIndexedAccess": false` in the consumer tsconfig as a transitional override AND open a follow-up issue in `deferred-items.md` to remove the override.
**Warning signs:** `Element implicitly has an 'any' type because expression of type '0' can't be used to index` or `Object is possibly 'undefined'` errors in previously-passing code.

### Pitfall 3: `module: nodenext` + `allowImportingTsExtensions` conflict
**What goes wrong:** `minion/tsconfig.json` currently sets `allowImportingTsExtensions: true` + `noEmit: true`. `base.json` sets `module: nodenext`. Node's ESM import resolution under nodenext requires explicit `.js` extensions (not `.ts`). The two can interact badly depending on whether minion emits.
**Why it happens:** `allowImportingTsExtensions` is a dev-time affordance; nodenext is a runtime resolution rule.
**How to avoid:** `noEmit: true` in minion means no runtime emission from tsc — safe. But if anything changes about the emission path, check module resolution carefully. Add a verify step in the plan: `pnpm tsgo` after adoption.
**Warning signs:** `ESM: Cannot find module ... imported from ...` errors at runtime; `TS1479: The current file is a CommonJS module` errors at compile.

### Pitfall 4: bun's package.json `exports` resolution for JSON files
**What goes wrong:** Bun installs `@minion-stack/tsconfig`; hub's `tsconfig.json` extends from `@minion-stack/tsconfig/svelte.json`; bun resolves the package but TS can't find the JSON file.
**Why it happens:** TypeScript resolves `extends` via its own module resolver (not bun's). Works if `@minion-stack/tsconfig/package.json` has `exports["./svelte.json"]` pointing to the file — which it does [VERIFIED: read `packages/tsconfig/package.json`].
**How to avoid:** Verify after `bun install` that the path `./node_modules/@minion-stack/tsconfig/svelte.json` exists on disk. Run `npx tsc --showConfig -p tsconfig.json` and confirm the resolved base includes the shared options.
**Warning signs:** `TS5083: Cannot read file` or `TS6053: File not found` on tsconfig build.

### Pitfall 5: pnpm workspace `overrides` vs published `@minion-stack/*`
**What goes wrong:** paperclip-minion's root `package.json` has `pnpm.overrides: { "rollup": ">=4.59.0" }`. If `@minion-stack/*` had rollup as an indirect dep (it doesn't), overrides would apply.
**Why it happens:** pnpm workspace-level overrides propagate.
**How to avoid:** `@minion-stack/tsconfig` and `@minion-stack/lint-config` are zero-dep (tsconfig is JSON only; lint-config's runtime needs are peer deps). Confirm by reading each package's `package.json` — no `dependencies` field beyond peers. Safe.
**Warning signs:** n/a for Phase 3; relevant for future `@minion-stack/shared`.

### Pitfall 6: Prettier config import path with `type: module`
**What goes wrong:** A subproject with `"type": "module"` (hub, site, paperclip) tries to load `@minion-stack/lint-config/prettier.config.js` which is CommonJS (`module.exports = {...}`).
**Why it happens:** The shipped file is CJS [VERIFIED: read `packages/lint-config/prettier.config.js` — starts with `/** @type ... */ module.exports = {`].
**How to avoid:** Prettier's config loader (cosmiconfig) handles mixed module formats — should work. But if an IDE extension (VS Code Prettier plugin) chokes, the fallback is: copy `prettier.config.js` content into subproject's own file. Document as a known quirk.
**Warning signs:** `SyntaxError: Unexpected token 'export'` or `ReferenceError: module is not defined` when Prettier runs.

### Pitfall 7: Paperclip PR policy blocks lockfile edits
**What goes wrong:** Adoption PR on `paperclip-minion` adds `@minion-stack/*` to `package.json`, regenerates `pnpm-lock.yaml`, CI rejects the PR.
**Why it happens:** paperclip's `pr.yml` has a policy job that fails if `pnpm-lock.yaml` is in the diff and the branch isn't `chore/refresh-lockfile` [VERIFIED: read paperclip PR workflow lines 22-30].
**How to avoid:** Either (a) branch name exception: use `chore/refresh-lockfile` branch for the lockfile commit, then rebase onto `feat/adopt-minion-stack`; (b) let CI's "Validate dependency resolution when manifests change" step regenerate the lockfile on its own — this job runs `pnpm install --lockfile-only` when manifests change [VERIFIED: read pr.yml line 83-89]. Path (b) is simpler; test it locally first by committing package.json WITHOUT pnpm-lock.yaml and watching CI.
**Warning signs:** CI error: "Do not commit pnpm-lock.yaml in pull requests."

### Pitfall 8: Missing CI in hub/site/minion_plugins
**What goes wrong:** D-19 says each subproject's OWN CI verifies adoption. Hub, site, and minion_plugins have no `.github/workflows/` directory — nothing to verify.
**Why it happens:** Those subprojects were hand-built and never had CI added.
**How to avoid:** The adoption plan for hub and site MUST add a minimal CI workflow (bun install + bun run check + bun run build). The adoption plan for minion_plugins either adds a no-op workflow or formally defers per D-27. Surface this in the CONTEXT decision now, not during execution.
**Warning signs:** `minion doctor` reports "healthy" but CI coverage is zero for those repos.

## Code Examples

Verified patterns from the live foundation packages:

### Adopting `@minion-stack/tsconfig/node.json` (simple case — minion)
```jsonc
// minion/tsconfig.json (post-adoption)
{
  "extends": "@minion-stack/tsconfig/node.json",
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "experimentalDecorators": true,
    "declaration": true,
    "noEmit": true,
    "noEmitOnError": true,
    "outDir": "dist",
    "useDefineForClassFields": false,
    "paths": {
      "minion/plugin-sdk": ["./src/plugin-sdk/index.ts"],
      "minion/plugin-sdk/*": ["./src/plugin-sdk/*.ts"]
    }
  },
  "include": ["src/**/*", "ui/**/*", "extensions/**/*"],
  "exclude": ["node_modules", "dist"]
}
```
Source: synthesized from current `minion/tsconfig.json` + `packages/tsconfig/node.json`.

### Adopting shared svelte tsconfig alongside SvelteKit-generated (extends array)
```jsonc
// minion_hub/tsconfig.json (post-adoption)
{
  "extends": [
    "@minion-stack/tsconfig/svelte.json",
    "./.svelte-kit/tsconfig.json"
  ],
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "sourceMap": true
  }
}
```
Source: TypeScript 5.0 `extends` array [CITED: https://www.typescriptlang.org/tsconfig/extends.html] + SvelteKit convention [CITED: https://svelte.dev/docs/kit/configuration].

### Adopting shared oxlint preset
```jsonc
// minion/.oxlintrc.json (post-adoption)
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": ["./node_modules/@minion-stack/lint-config/oxlint-preset.json"],
  "plugins": ["unicorn", "typescript", "oxc"],
  "rules": {
    "curly": "error",
    "typescript/no-explicit-any": "error",
    "oxc/no-accumulating-spread": "off"
  }
}
```
Source: oxlint configuration_schema.json + `packages/lint-config/oxlint-preset.json`.

### Adopting shared flat ESLint preset
```js
// pixel-agents/eslint.config.mjs (post-adoption)
import config from '@minion-stack/lint-config/eslint.config.js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import pixelAgentsPlugin from './eslint-rules/pixel-agents-rules.mjs';

export default [
  ...config,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'pixel-agents': pixelAgentsPlugin,
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'pixel-agents/no-inline-colors': 'warn',
    },
  },
];
```
Source: `packages/lint-config/README.md` extending pattern.

### Adopting shared Prettier config via package.json
```jsonc
// any subproject's package.json (post-adoption)
{
  "name": "...",
  "prettier": "@minion-stack/lint-config/prettier.config.js"
}
```
Source: `packages/lint-config/README.md`.

### `.env.defaults` format (new file per subproject)
```bash
# minion_hub/.env.defaults — committed non-secret defaults
# Loaded by @minion-stack/env as layer 3 (subproject-defaults)
# Secrets belong in Infisical, never here.

BETTER_AUTH_URL=http://localhost:5173
VITE_BETTER_AUTH_URL=http://localhost:5173
AUTH_DISABLED=false
GITHUB_BUG_REPO=NikolasP98/minion_hub
```
Source: `AI/.env.defaults` shape [VERIFIED: read meta-repo root].

## CI Landscape per Subproject

| Subproject | Has `.github/workflows/`? | Key CI job for adoption PR | Notes |
|------------|---------------------------|----------------------------|-------|
| `minion` | YES (16 workflows) | `ci.yml` with docs-scope + changed-scope detection; runs lint (oxlint), format:check (oxfmt), typecheck (tsgo), tests | `install-smoke.yml` also reads `pnpm-workspace.yaml`. Lockfile changes auto-detected. |
| `minion_hub` | **NO** | n/a — adoption plan must add minimal workflow | Budget: ~30 min to add `ci.yml` with bun setup + `bun run check` + `bun run build` |
| `minion_site` | **NO** | n/a — same as hub | Budget: ~30 min |
| `paperclip-minion` | YES (6 workflows) | `pr.yml` (typecheck + test + build + canary-dry-run); `e2e.yml` runs Playwright | PR policy blocks manual lockfile edits — let CI regenerate |
| `pixel-agents` | YES (3 workflows) | `ci.yml` (check-types + lint + lint:webview + format:check + build, all blocking, with summary + final gate) | Very strict gate; must pass cleanly |
| `minion_plugins` | **NO** | n/a — if deferred per D-27, no CI needed | Markdown-only repo |

**Summary:** 3 of 6 subprojects (hub, site, minion_plugins) have no CI today. ADOPT-07 + D-19 require per-subproject CI verification. Plan must either add minimal CI to hub/site as part of their adoption plan, or formally defer per D-27.

## Runtime State Inventory

Phase 3 is primarily additive (new files) and mechanical (config rewrites). A grep audit catches the rename surface, but adoption has a small number of runtime touch points:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — adoption changes no runtime data. No datastore references `@minion-stack` or `@minion`. | None |
| Live service config | Vercel projects (hub, site) may cache build output. Each PR will trigger a fresh Vercel build; npm resolution of `@minion-stack/*` happens at Vercel's install step. | Verify Vercel's build log shows `@minion-stack/tsconfig@0.1.0` installed; no manual config edits needed. |
| OS-registered state | None for this phase. Netcup systemd units already renamed to `minion-*` in Phase 2. | None |
| Secrets/env vars | `.env.example` expansion in paperclip-minion requires cross-referencing Infisical `minion-paperclip` — the secret values themselves don't change, only the example NAMES. | Run `minion infisical paperclip` to view current vars; ensure all are named in `.env.example`. |
| Build artifacts / installed packages | Existing `node_modules` in each subproject — stale after package.json edit. `.svelte-kit/` caches (hub, site) regenerate via `svelte-kit sync`. | Run subproject's package manager install post-edit (`pnpm install` / `bun install` / `npm ci`). |

**Nothing found in category:** "Stored data" and "OS-registered state" — verified by inspection of each subproject's source; no database references or system-level registrations touch `@minion-stack`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All subprojects | ✓ | v22+ assumed (minion ci.yml pins 22.x) | — |
| pnpm | minion, paperclip-minion | ✓ | 10.x (minion), 9.15.4 (paperclip) | — |
| bun | minion_hub, minion_site | Assumed available locally | — | `npm`/`pnpm` as fallback but Vercel + project convention is bun |
| npm | pixel-agents, minion_plugins | ✓ | bundled with Node | — |
| `@minion-stack/tsconfig@0.1.0` | All TS subprojects | ✓ | 0.1.0 | — |
| `@minion-stack/lint-config@0.1.0` | All lint-config-using subprojects | ✓ | 0.1.0 | — |
| `@minion-stack/env@0.1.0` | `minion doctor` only | ✓ | 0.1.0 | — |
| `@minion-stack/cli@0.1.0` | `minion doctor` health-check | ✓ | 0.1.0 | `npx @minion-stack/cli doctor` |
| Infisical CLI | `minion doctor` Infisical layer | Previously confirmed installed; Infisical auth env vars may be unset in some shells | — | Skip Infisical fetch on warning; report "warnings" in doctor output (current behavior per 02-06 summary) |
| TypeScript | All TS subprojects | ✓ | minion 5.9.3, hub 5.0.0, site 5.7.0, paperclip 5.7.3, pixel-agents 5.9.3 | All >= 5.0 — satisfies `extends` array |
| oxlint | minion | ✓ | ^1.48.0 | — |
| ESLint | pixel-agents | ✓ | ^10.0.3 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Infisical CLI / auth env vars may be unset in Claude's shell — `minion doctor` returns exit code 3 in that case, which is the D9 expected signal. Document this: adoption doesn't require Infisical to succeed, only to have the correct var NAMES declared.

## Validation Architecture

### Test Framework per Subproject

| Subproject | Framework | Config file | Quick run | Full suite |
|------------|-----------|-------------|-----------|-----------|
| `minion` | vitest | `vitest.config.ts` (in repo) | `pnpm vitest run <file>` | `pnpm test` |
| `minion_hub` | vitest | (declared in package.json) | `bun run vitest run <file>` | `bun run test` |
| `minion_site` | NONE (no test script) | — | — | `bun run check` (svelte-check acts as type gate) |
| `paperclip-minion` | vitest + Playwright | `vitest.config.ts`, `tests/e2e/playwright.config.ts` | `pnpm vitest run <file>` | `pnpm test:run` + `pnpm test:e2e` |
| `pixel-agents` | None for backend; `node --test` for webview-ui | `webview-ui/test/*.test.ts` | `npm run check-types` | `npm run compile` |
| `minion_plugins` | None (no code) | — | — | Markdown lint only (not in scope) |

**Cross-cutting validation:** `minion doctor` from meta-repo root reports all 6 subprojects' env resolution + link drift. Exit code 0 = healthy; 3 = Infisical auth issue; other codes = D9 mapping.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File exists? |
|--------|----------|-----------|-------------------|-------------|
| ADOPT-01 | `minion` extends shared tsconfig + adopts lint-config + ships env files | integration | `cd minion && pnpm install && pnpm check && pnpm test` | ✅ (minion has these scripts) |
| ADOPT-02 | `minion_hub` adopts shared configs + env files | integration | `cd minion_hub && bun install && bun run check && bun run build` | ✅ for check; ⚠️ no lint script (Wave 0 gap) |
| ADOPT-03 | `minion_site` adopts shared configs + env files | integration | `cd minion_site && bun install && bun run check && bun run build` | ⚠️ no test; ⚠️ no lint (Wave 0 gap) |
| ADOPT-04 | `paperclip-minion` adopts shared configs + env files | integration | `cd paperclip-minion && pnpm install --frozen-lockfile && pnpm -r typecheck && pnpm test:run && pnpm build` | ✅ |
| ADOPT-05 | `pixel-agents` adopts shared configs + env files | integration | `cd pixel-agents && npm ci && (cd webview-ui && npm ci) && npm run check-types && npm run lint && npm run lint:webview && npm run format:check && npm run compile` | ✅ |
| ADOPT-06 | `minion_plugins` adopts where applicable | manual | (verify `.env.example` + `.env.defaults` exist if applicable; otherwise document deferral) | n/a — no code to test |
| ADOPT-07 | Every subproject's own CI passes against published `@minion-stack/*` | e2e | Push adoption branch to each subproject's remote; watch CI | ⚠️ 3 of 6 have no CI (Wave 0 gap) |

### Sampling Rate

- **Per task commit (per-subproject wave):** `<subproject-package-manager> install && <subproject>/typecheck` — fast feedback that the tsconfig/lint adoption didn't break typecheck.
- **Per wave merge (to feature branch):** Full subproject verification command (see table above) on each subproject in the wave.
- **Phase gate:** `minion doctor` shows all 6 healthy AND each subproject's adoption PR is green (or explicitly deferred per D-27) before `/gsd-verify-work`.

### Wave 0 Gaps

The following are missing and must either be created in Wave 0 or explicitly deferred:

- [ ] `minion_hub/.github/workflows/ci.yml` — covers ADOPT-02 + ADOPT-07 own-CI requirement
- [ ] `minion_site/.github/workflows/ci.yml` — covers ADOPT-03 + ADOPT-07 own-CI requirement
- [ ] `minion_plugins/.github/workflows/` — may be dropped per D-27 (zero-code repo); document deferral reason in plan
- [ ] `minion_hub` lint script + ESLint/Prettier install — prerequisite for meaningful ADOPT-02 verification (option: skip lint, install Prettier only)
- [ ] `minion_site` lint script + ESLint/Prettier install — same as hub
- [ ] `paperclip-minion` lint script — paperclip has no linter today; ADOPT-04 may defer lint adoption (install Prettier only) or add oxlint in the adoption PR
- [ ] `pixel-agents/.env.example` — net-new file (ADOPT-05)
- [ ] Every subproject's `.env.defaults` — net-new across all 6

**If any Wave 0 gap remains at phase close:** Log in `deferred-items.md` with rationale (Phase 8 candidate).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (no auth code touched) | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no (no runtime code changes) | — |
| V6 Cryptography | no | — |
| V7 Error Handling | no | — |
| V8 Data Protection | **yes** (partially) | `.env.example` must NOT contain real secret values; `.env.defaults` must NOT contain secrets. Reviewers check before commit. |
| V9 Communication | no | — |
| V10 Malicious Code | no | — |
| V11 Business Logic | no | — |
| V12 File Resource | no | — |
| V13 API | no | — |
| V14 Config | **yes** | Shared tsconfig/lint-config presets are the standard control for consistent hardened defaults across subprojects. |

### Known Threat Patterns for this phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidentally committing secrets in `.env.defaults` or `.env.example` | Information Disclosure | Review: `.env.defaults` only holds non-secret scalars (booleans, ports, URLs); `.env.example` holds NAMES not values. `minion doctor` flags `.env.example` entries that HAVE values. |
| Supply-chain compromise of `@minion-stack/*` dep | Tampering | npm package is published from NikolasP98's own org; verify published tarball SHA after each install. Post-Phase 8 automation will publish via GitHub Actions on merge to main. |
| Stale lockfile allows dep version drift | Tampering / Integrity | Each subproject uses `--frozen-lockfile` (pnpm) or equivalent in CI. Adoption PR must regenerate lockfile via CI (paperclip) or explicit local command (others). |
| Leaking Infisical auth env vars in CI logs | Information Disclosure | `minion doctor` NEVER prints values (only names + layer source) per 02-05 implementation. Per-subproject CI workflows must not `env:` dump. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `minion_hub` and `minion_site` will accept ESLint+Prettier net-new installs as part of Phase 3 | §Per-Subproject #2-3, §Validation Wave 0 Gaps | Medium: if user vetoes net-new lint install, the lint-config adoption for those two subprojects becomes Prettier-only; plan would need a discretion-call note |
| A2 | `minion_plugins` has no env vars and can be fully deferred per D-27 | §Per-Subproject #6 | Low: if Infisical `minion-plugins` exists with vars, adoption still needs `.env.example`; verify via `minion infisical plugins` before plan execution |
| A3 | Paperclip's PR policy will let the adoption PR regenerate `pnpm-lock.yaml` via the "Validate dependency resolution when manifests change" job (path b in §Pitfall 7) | §Pitfall 7 | Medium: if the policy job doesn't in fact regenerate, the adoption branch needs a prior `chore/refresh-lockfile` PR — one additional hop |
| A4 | `noUncheckedIndexedAccess: true` (inherited from shared base) will surface type errors in most subprojects | §Pitfalls, §Per-Subproject risk subsections | Low: even if wrong in one direction (already enabled somewhere), the transitional-override escape is harmless |
| A5 | Bun correctly resolves `@minion-stack/tsconfig/svelte.json` via the package's `exports` map | §Pitfall 4 | Low: bun supports `exports` field; verify with `bun x tsc --showConfig -p tsconfig.json` |
| A6 | Each adoption PR can be verified by running the subproject's existing `check`/`typecheck`/`build`/`test` scripts locally before pushing | §Validation Architecture, §Per-Subproject adoption shapes | Low: scripts exist (verified); only risk is environment availability of each package manager |
| A7 | TypeScript 5.0 `extends` array is supported by `svelte-check` (which wraps tsc) in the versions shipped with hub and site | §Pattern 2 | Low: svelte-check 4.x is TypeScript 5+ compatible; verified docs but not locally tested |
| A8 | Adopting `module: nodenext` in `minion` (via base.json) won't break `allowImportingTsExtensions: true` | §Pitfall 3 | Medium: tight interaction; plan must budget test time |

**How the planner uses these:** A1, A3, A8 should become explicit plan task risks with fallback paths. A2 should become a pre-plan verification step. A4, A5, A6, A7 are likely-correct and only need validation during the verify phase.

## Open Questions

1. **Does `minion_plugins` read any env vars in its plugin runtime?**
   - What we know: No code files, no package.json, pure markdown/YAML catalog. Plugins themselves may run inside Claude Code and could read env vars but that's out of scope (plugin marketplace repo, not plugin runtime).
   - What's unclear: Whether Infisical `minion-plugins` project was created in Phase 2 and has any vars.
   - Recommendation: Run `minion infisical plugins` as the first step of the 03-06 plan. If empty, fully defer per D-27 with note. If populated, ship `.env.example` only.

2. **Will hub/site users accept ESLint + Prettier being installed net-new during this adoption?**
   - What we know: D-13/D-14 require lint-config adoption. Hub/site have zero lint tooling.
   - What's unclear: Whether the user wants full flat-ESLint install or Prettier-only in Phase 3.
   - Recommendation: Flag as a discretion call in the plan. Default to Prettier-only for minimum disruption; ESLint can land in Phase 8.

3. **Should paperclip-minion's `ui/tsconfig.json` stay untouched or extend `@minion-stack/tsconfig/base.json`?**
   - What we know: D-10 says paperclip → `node.json`. But UI is React+bundler, not Node.
   - What's unclear: Whether the user considers `ui/` in-scope for Phase 3 tsconfig adoption.
   - Recommendation: Leave `ui/tsconfig.json` unchanged in 03-04; document as future work once a `@minion-stack/tsconfig/react` variant ships.

4. **What happens to pixel-agents' `webview-ui/package.json` vs root `package.json`?**
   - What we know: pixel-agents has a NESTED package with its own deps, tsconfig, eslint. Adoption applies to both.
   - What's unclear: Whether `@minion-stack/*` should be added to both package.jsons or only root.
   - Recommendation: Add to both (webview has its own node_modules). Apply shared tsconfig to both `tsconfig.json` (extension) and `webview-ui/tsconfig.app.json`. Apply shared eslint preset to both eslint configs.

## Sources

### Primary (HIGH confidence)
- `packages/tsconfig/{base,node,svelte,library}.json` + `README.md` + `package.json` — [VERIFIED: read entire package]
- `packages/lint-config/{oxlint-preset.json, eslint.config.js, prettier.config.js}` + `README.md` + `package.json` — [VERIFIED: read entire package]
- `minion.json` — subproject registry canonical source [VERIFIED: read]
- `.planning/phases/02-foundation/02-03-SUMMARY.md` — tsconfig publish record
- `.planning/phases/02-foundation/02-04-SUMMARY.md` — lint-config publish record
- `.planning/phases/02-foundation/02-05-SUMMARY.md` — env publish record
- `.planning/phases/02-foundation/02-06-SUMMARY.md` — cli publish record + `minion doctor` link-drift behavior
- `.planning/phases/03-adopt-foundation-in-subprojects/03-CONTEXT.md` — all locked decisions
- npm registry: `@minion-stack/{tsconfig,lint-config,env,cli}@0.1.0` [VERIFIED: `npm view <pkg> version` command 2026-04-20 at runtime]
- Each subproject's `tsconfig.json`, lint configs, `.env.example`, `package.json`, `.github/workflows/` — [VERIFIED: direct filesystem reads]
- oxlint `configuration_schema.json` at `minion/node_modules/oxlint/configuration_schema.json` — [VERIFIED: grep for `extends` field]

### Secondary (MEDIUM confidence)
- TypeScript official docs on `extends` — [CITED: https://www.typescriptlang.org/tsconfig/extends.html]
- SvelteKit docs on configuration — [CITED: https://svelte.dev/docs/kit/configuration and https://svelte.dev/docs/kit/project-structure]
- GitHub issue: sveltejs/kit #6868 "extending a tsconfig in .svelte-kit/tsconfig.json" — [CITED]
- GitHub issue: sveltejs/kit #9412 "Support tsconfig extending multiple tsconfigs, typescript 5.0" — [CITED]
- TypeScript 5.0 extends-array announcement — [CITED: https://github.com/microsoft/TypeScript/issues/29118, https://github.com/microsoft/TypeScript/issues/48437]

### Tertiary (LOW confidence)
- Bun package exports resolution for JSON files — documented but not tested in this session [ASSUMED: works per npm exports spec]
- Prettier cosmiconfig loading of CJS from ESM packages — documented but not tested [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all four packages verified live on npm at 0.1.0 via `npm view`
- Architecture patterns (tsconfig extends, oxlint extends, ESLint flat preset spread, Prettier via package.json): HIGH — documented in official docs + verified against shipped package shapes
- Per-subproject current state: HIGH — every file referenced was read directly from disk
- CI landscape: HIGH — workflow files enumerated by `ls .github/workflows/`
- Pitfalls: HIGH for SvelteKit / TypeScript / lockfile policy (all cited); MEDIUM for bun resolution (inferred)
- Runtime State Inventory: HIGH — this is an additive phase; no runtime state changes

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — stable ecosystem, foundation packages at 0.1.0, major tool versions pinned)
