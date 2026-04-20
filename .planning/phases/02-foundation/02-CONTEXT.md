# Phase 2: Foundation — Context

**Gathered:** 2026-04-19
**Status:** Ready for planning
**Source:** Derived from `specs/2026-04-19-minion-meta-repo-design.md` §M1 + Phase 1 findings

<domain>
## Phase Boundary

Phase 2 stands up the **meta-repo itself and its foundational shared packages** so that `minion dev <any-project>` works end-to-end with hierarchical env resolution. This is the largest phase in the program (12 FOUND-* requirements). It is mostly **construction**, not mutation — new files in the meta-repo, new packages published to npm, a new GitHub remote, a one-time Infisical rename cascade that touches production services.

**In scope:**
- Meta-repo as a proper pnpm workspace (root `package.json` + `pnpm-workspace.yaml` + explicit subproject `.gitignore`)
- New GitHub remote `NikolasP98/minion-meta` + initial push
- `minion.json` registry declaring subprojects, package managers, branches, Infisical projects, commands
- Register `@minion` npm scope (public)
- Changesets config for independent semver releases
- Four new packages: `@minion/tsconfig`, `@minion/lint-config`, `@minion/env`, `@minion/cli`
- `minion` bin wired end-to-end (dev/build/test/check/run/status/doctor/sync-env/rotate-env/infisical/link/unlink/list/branch/--all fan-out)
- Infisical project rename cascade (production-affecting; touches Netcup systemd, docker-compose, CI, memory)
- Root CLAUDE.md update describing the meta-repo workflow; root README.md for onboarding
- Deprecation shim for `infisical-dev.sh` (logic absorbed into `@minion/env`)

**Out of scope (later phases):**
- Any subproject adopting the new configs (Phase 3 ADOPT-*)
- Folding `minion-shared` (Phase 4)
- DB/auth/WS extraction (Phases 5–7)
- Meta-repo CI / changesets release automation (Phase 8 POLISH-01/02)

**Success gate:** running `minion dev <any subproject>` from meta-repo root resolves env from the 6-level hierarchy and successfully launches that subproject's native dev command.

</domain>

<decisions>
## Implementation Decisions (Locked)

### D1 — GitHub remote and branch strategy
- Remote: `git@github.com:NikolasP98/minion-meta.git` (new repo, private or public — **user to confirm before push**; default to public per `@minion/*` scope intent)
- Default branch on remote: `main` (meta-repo's own `main` branch — NOT a subproject branch name)
- First push is the 12 existing commits (project init + Phase 1 artifacts + spec)

### D2 — Meta-repo workspace shape
- Package manager: **pnpm 10+** (matches `minion` and `paperclip-minion`)
- Root `package.json` — `private: true`, name `@minion/root`, version `0.0.0`, `packageManager: "pnpm@10.x"`
- `pnpm-workspace.yaml` — includes ONLY `packages/*`, never subproject directories
- Meta-repo `.gitignore` explicitly ignores all subproject dirs (`minion/`, `minion_hub/`, `minion_site/`, `minion-shared/`, `minion_plugins/`, `paperclip-minion/`, `pixel-agents/`, `omnisearch/`, `paperclip-meta-repair/`, `paperclip-pi-fallback/` — the last two gone post-Phase-1 but defensive entries prevent resurrection) plus `ai-studio/`/`docs/` symlinks and `data/`, `node_modules/`, build artifacts
- Prior `.gitignore` in place had legacy "tracked subprojects" comment — REPLACE with the meta-repo model

### D3 — Subproject registry (`minion.json` at root)
Single source of truth for every `minion` command. Schema:
```jsonc
{
  "$schema": "./packages/cli/minion.schema.json",
  "subprojects": {
    "minion": {
      "path": "minion",
      "packageManager": "pnpm",
      "branch": "DEV",
      "infisicalProject": "minion-gateway",
      "remote": "git@github.com:NikolasP98/minion-ai.git",
      "commands": { "dev": "pnpm dev", "build": "pnpm build", "test": "pnpm test", "check": "pnpm check", "typecheck": "pnpm tsgo" }
    },
    "hub": {
      "path": "minion_hub",
      "packageManager": "bun",
      "branch": "dev",
      "infisicalProject": "minion-hub",
      "remote": "git@github.com:NikolasP98/minion_hub.git",
      "commands": { "dev": "bun run dev", "build": "bun run build", "test": "bun run test", "check": "bun run check" }
    },
    "site": {
      "path": "minion_site",
      "packageManager": "bun",
      "branch": "master",
      "infisicalProject": "minion-site",
      "remote": "git@github.com:NikolasP98/minion-site.git",
      "commands": { "dev": "bun dev", "build": "bun run build", "check": "bun run check" }
    },
    "paperclip": {
      "path": "paperclip-minion",
      "packageManager": "pnpm",
      "branch": "minion-integration",
      "infisicalProject": "minion-paperclip",
      "remote": "git@github.com:NikolasP98/paperclip.git",
      "commands": { "dev": "pnpm dev", "build": "pnpm build", "test": "pnpm test:run", "check": "pnpm typecheck" }
    },
    "pixel-agents": {
      "path": "pixel-agents",
      "packageManager": "npm",
      "branch": "main",
      "infisicalProject": "minion-pixel-agents",
      "remote": "https://github.com/pablodelucca/pixel-agents.git",
      "commands": { "dev": "npm run watch", "build": "npm run compile", "test": "npm test" }
    },
    "plugins": {
      "path": "minion_plugins",
      "packageManager": "npm",
      "branch": "main",
      "infisicalProject": "minion-plugins",
      "remote": "git@github.com:NikolasP98/minion_plugins.git",
      "commands": {}
    }
  }
}
```
- Subproject "id" (the object key) is the short name used on the CLI (`minion dev hub` → looks up `subprojects.hub`).
- `minion-shared` is DELIBERATELY NOT in the registry until M3 — it has no local `.git/` and no GitHub repo; treated as a non-workspace loose folder during Phase 2.
- The schema JSON `packages/cli/minion.schema.json` is a light Ajv schema shipped with `@minion/cli` for editor autocomplete.

### D4 — npm scope registration
- Scope: `@minion` (new npm org with NikolasP98 as owner)
- Package access: **public** (no private packages in scope)
- Two-factor auth: required for publish (user configures manually via `npm profile` — Phase 2 does NOT embed creds)
- First published packages (in Phase 2): `@minion/tsconfig`, `@minion/lint-config`, `@minion/env`, `@minion/cli`
- Publishing mechanism: manual `pnpm changeset publish` for the first release; automation is Phase 8 POLISH-02

### D5 — Changesets configuration
- `.changeset/config.json` per standard Changesets schema
- `baseBranch: "main"`
- `access: "public"` (all `@minion/*` public)
- `updateInternalDependencies: "patch"` (internal package version bumps stay in semver-patch range)
- No `ignore` list (all packages managed by Changesets)
- `.changeset/` directory committed; each PR touching `packages/*` must include a changeset markdown file (enforced in Phase 8 POLISH-01 CI)

### D6 — `@minion/tsconfig` package shape
- Four exported configs, each a separate `tsconfig.*.json` file:
  - `base.json` — strict: true, target: ES2023, module: nodenext, moduleResolution: nodenext, skipLibCheck: true, no `@ts-nocheck`, no `any` tolerance
  - `node.json` — extends base, types: ["node"], lib: ["ES2023"]
  - `svelte.json` — extends base, types: ["svelte"], jsx via Svelte, allowJs: true, isolatedModules: true (matches hub+site needs)
  - `library.json` — extends base, declaration: true, declarationMap: true, composite: true, emitDeclarationOnly: false
- Consumer pattern: `{ "extends": "@minion/tsconfig/base.json" }`
- Package `exports` field maps each variant as a file path (not conditional)

### D7 — `@minion/lint-config` package shape
- Three separate entrypoints:
  - `oxlint-preset.json` — shared oxlint config (used by minion + paperclip-minion)
  - `eslint.config.js` — flat ESLint config for ESM projects (hub, site, plugins — wherever ESLint fits better)
  - `prettier.config.js` — Prettier config exported as CJS for compatibility
- Consumer pattern: references via `extends` (oxlint/eslint) or `"prettier": "@minion/lint-config/prettier.config.js"` in package.json

### D8 — `@minion/env` package shape
- TypeScript library, exports both programmatic API and a class used by `@minion/cli`
- Core function: `resolveEnv({ subprojectId?, cwd? }): Promise<{ env: Record<string,string>, source: ResolvedVarSource[], warnings: string[] }>`
- Env hierarchy (implemented, order = lowest to highest precedence):
  1. `AI/.env.defaults` (loaded from meta-repo root)
  2. Infisical `minion-core` (fetched via machine-identity Universal Auth; token cached in `~/.config/minion/infisical-cache.json` with TTL)
  3. `<subproject>/.env.defaults` (loaded from subproject path per registry)
  4. Infisical `minion-<name>` (fetched if `subprojectId` given)
  5. `<subproject>/.env.local` (gitignored; dev escape hatch)
  6. Process shell env (wins — `process.env` passthrough at the end)
- Validation: reads `<subproject>/.env.example` (and root `.env.example` if present), compares required var names against resolved env, returns missing vars in `warnings`
- Infisical client: **NO new Infisical client code** — wraps the official `infisical` CLI (v0.x+, already used in `infisical-dev.sh`). Requires INFISICAL_UNIVERSAL_AUTH_CLIENT_ID + INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET in shell env OR in `~/.config/minion/infisical-auth.json` (gitignored, documented in onboarding)
- Never log secret values. `ResolvedVarSource[]` reports only variable NAMES and which layer set each value.

### D9 — `@minion/cli` package shape
- Bin: `minion`
- Implementation: TypeScript, bundled via tsdown (consistent with `minion` subproject) OR tsc + esbuild — planner's call
- Command parser: `commander` (latest) — single-word subcommands plus pass-through
- Command surface (as per ROADMAP Phase 2 FOUND-07):
  - `minion dev <id>` `minion build <id>` `minion test <id>` `minion check <id>` — env-wrapped command execution
  - `minion run <id> <cmd...>` — arbitrary passthrough with env resolution
  - `minion <id> <cmd...>` — shorthand alias for `run`
  - `minion dev --all` / `minion check --all` — parallel fan-out via `concurrently`
  - `minion status` — git status/branch/dirty/ahead-behind per subproject in `minion.json`, tabular output
  - `minion doctor` — env validation (all subprojects), Infisical auth check, npm link drift check, per-subproject CLI availability check (is `pnpm` installed? is `bun` installed?)
  - `minion sync-env <id>` — write merged env to `<subproject>/.env.local` as plain `.env` format (value escaping handled per dotenv rules)
  - `minion rotate-env <id>` — remove `.env.local` and re-run `sync-env`
  - `minion infisical <id>` — open Infisical dashboard URL for that subproject's project in default browser
  - `minion link <id>` — `pnpm link --global` (or `npm link`) every `@minion/*` into the subproject's node_modules
  - `minion unlink <id>` — revert link state
  - `minion list` — print `minion.json` summary as a table
  - `minion branch <id>` — print current branch (short form, no decoration — used by shell prompts/status bars)
- Exit codes: 0 success, 1 generic failure, 2 config missing/invalid, 3 Infisical auth failure, 4 subproject not found in registry
- `--json` flag on `status`, `doctor`, `list` for machine-readable output

### D10 — Infisical rename cascade
This is the highest-risk task in Phase 2 because it touches production services. Strict runbook:
- Phase 2 work renames happen in Infisical dashboard (manual UI op OR `infisical projects update` if API supports) — plan must state whether API supports rename. If not, dashboard only, documented as human-action checkpoint.
- Rename mapping:
  - `paperclip` → `minion-paperclip`
  - `minion-gateway-prod` → **kept** (already correctly named)
  - (new) `minion-core` — shared secrets project
  - (new) `minion-gateway` — dev-side secrets
  - (new) `minion-hub`, `minion-site`, `minion-plugins`, `minion-pixel-agents` — placeholders for per-subproject secrets
- References to update in the same phase (grep discovery required):
  - `AI/infisical-dev.sh` (absorbed into `@minion/env` with deprecation shim — separate task from rename)
  - `AI/.env*` — probably no project-name references, but grep to confirm
  - Netcup systemd units on bot-prd (reference `reference_gateway_netcup.md`) — SSH to `niko@netcup`, find units with `infisical run --projectId ... --` or `--project ...`, update
  - Netcup paperclip docker-compose (reference `reference_paperclip_netcup_auth.md`) at `/home/niko/docker/paperclip/` — environment references
  - CI workflows in each subproject's `.github/workflows/` (grep each subproject repo)
  - Memory entries referencing old names: `reference_infisical_setup.md`, `project_paperclip_netcup_deployment.md`, `project_paperclip_infisical_integration.md`, `project_twilio_voice_call_secrets.md`, `reference_voice_call_deployment.md`, `reference_paperclip_gateway_access.md` — update each with new names; add note of rename date
- **No-downtime requirement**: the rename must not break production voice calls or gateway operations. If Infisical supports transitional aliases, use them; otherwise, schedule the rename during a known-quiet window (user approves window).
- Validation after rename: `minion doctor` resolves env successfully for every registered subproject; bot-prd gateway restarts cleanly and voice calls work end-to-end.

### D11 — `infisical-dev.sh` deprecation
- Leave file in place but replace contents with a 5-line shim that prints `⚠ infisical-dev.sh is deprecated. Use 'minion dev <subproject>' or 'minion sync-env <subproject>' instead. See AI/README.md.` and exits 1.
- Keep the file tracked (not deleted) for 1 release cycle so users who have `infisical-dev.sh` baked into their shell aliases get the warning instead of "command not found".

### D12 — Root CLAUDE.md + README.md
- Existing root `CLAUDE.md` (the big "OpenClaw orchestrator hub" doc) — KEEP ITS SUBPROJECT MAP, update the top header to mention the meta-repo, add a new "Meta-repo workflow" section under the Project Map that documents:
  - `minion dev <id>`, `minion --all`, `minion doctor`, `minion status`
  - How `.env.defaults`, `.env.local`, Infisical layers merge
  - Where subprojects' own CLAUDE.md files live (unchanged)
- New `README.md` at meta-repo root — onboarding-focused, short (≤200 lines):
  - What the meta-repo is (one paragraph)
  - Prerequisites: node 22+, pnpm 10+, bun latest, gh, infisical CLI
  - Quickstart: `git clone`, `pnpm install`, configure Infisical universal auth creds, `minion list`, `minion dev minion` (or any id)
  - Link to the design spec at `specs/2026-04-19-minion-meta-repo-design.md`
  - Link to each subproject's own README

### Claude's Discretion (planner decides)
- Exact plan split within Phase 2 (target: 6–8 plans based on ROADMAP skeleton; planner may split or combine)
- Exact task breakdown within each plan
- Whether `@minion/cli` links to `@minion/env` via workspace protocol (`workspace:*`) or via `file:` references — recommend `workspace:*` since both live in the same monorepo
- How to test `@minion/env` without hitting Infisical in unit tests (mock the CLI binary or the HTTP layer)
- Whether to use `execa` vs `child_process.spawn` for invoking subproject commands from `@minion/cli`
- Whether `minion doctor` produces Markdown or plain-text output by default

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design spec (authoritative)
- `specs/2026-04-19-minion-meta-repo-design.md` — §M1 Foundation is authoritative scope for this phase; §Architecture → Root layout, Env & secrets hierarchy, The `minion` CLI, Shared packages all specify Phase 2 deliverables

### Project context
- `.planning/PROJECT.md` — Constraints, Key Decisions (D1–D9), Out of Scope
- `.planning/REQUIREMENTS.md` — FOUND-01 through FOUND-12 definitions
- `.planning/ROADMAP.md` — Phase 2 goal + success criteria + plan skeleton (8 suggested plans: git init+workspace, npm org, tsconfig, lint-config, env, cli, rename cascade, docs)
- `.planning/phases/01-clean-slate/01-VERIFICATION.md` — Phase 1 exit state + deferred mutations (Phase 2 does NOT trigger these — they are user-controlled follow-ups, not Phase 2 scope)
- `CLAUDE.md` — existing root doc; Phase 2 updates this, does not replace it
- `specs/clean-slate-inventory.md` — authoritative for subproject branches/remotes/state

### Memory context (persistent, cross-session)
- `feedback_root_branding_minion.md` — all root tooling branded "minion"
- `feedback_env_vars_infisical.md` — no hardcoded IDs; use env vars + Infisical for secrets
- `feedback_infisical_secrets_set_not_silent.md` — `infisical secrets set --silent` STILL echoes values; redirect stdout to /dev/null when handling sensitive values in scripts
- `reference_infisical_setup.md` — self-hosted Infisical URL, project IDs, config location
- `reference_gateway_netcup.md` — bot-prd systemd + voice-call extension details (Infisical references here need updating in the rename cascade)
- `reference_paperclip_netcup_auth.md` — paperclip docker-compose at `/home/niko/docker/paperclip/`; Infisical references
- `reference_voice_call_deployment.md` — voice-call production touches Infisical for Twilio creds
- `project_paperclip_infisical_integration.md` — paperclip machine identity Universal Auth pattern
- `project_twilio_voice_call_secrets.md` — Twilio creds in paperclip dev + minion-gateway prod Infisical
- `reference_paperclip_gateway_access.md` — paperclip agents reach gateway via Tailscale funnel WSS; gateway URL may appear in Infisical
- `feedback_always_use_subscription.md` — never use prepaid API credits for Anthropic
- `feedback_never_use_root_ssh.md` — SSH as niko, never root (applies when updating Netcup systemd)
- `reference_github_repo_names.md` — local→remote repo name mapping (critical for `minion.json` `remote` fields)
- `reference_minion_ai_repo.md` — `NikolasP98/minion-ai` is canonical gateway repo
- `reference_paperclip_fork.md` — paperclip fork at `NikolasP98/paperclip`; push target is `fork`, not `origin`

### External docs (fetch if needed during planning)
- Changesets: https://github.com/changesets/changesets
- pnpm workspaces: https://pnpm.io/workspaces
- Commander (CLI library): https://github.com/tj/commander.js
- Infisical CLI: https://infisical.com/docs/cli/usage
- npm scope/org registration: https://docs.npmjs.com/creating-and-publishing-an-organization-scoped-package

</canonical_refs>

<specifics>
## Specific Ideas

- The six subproject IDs used in `minion.json` (in command-line form): `minion`, `hub`, `site`, `paperclip`, `pixel-agents`, `plugins`. Short names chosen to minimize typing.
- `minion dev hub` is the canonical smoke-test — it exercises the full env resolution pipeline plus launching a Bun-based Svelte dev server from a pnpm-invoked CLI. If this works end-to-end, FOUND-07 is satisfied.
- Opt-in onboarding for `minion link`: the README explains it's for dev-time override only; recommended only when actively developing an `@minion/*` package.
- `minion doctor` output must fit in a single terminal screen (~40 lines) even for all 6 subprojects + root — use compact tabular format.
- Infisical CLI versions: pin the required version in `@minion/env` package.json as an `engines`-style check; `minion doctor` flags if a too-old CLI is installed.
- Phase 2 does NOT auto-create the `@minion` npm org or push to the new `minion-meta` GitHub repo — both require manual human actions (npm login + npm org create; gh repo create). The plan should mark these as explicit human-action checkpoints, not autonomous tasks.

</specifics>

<deferred>
## Deferred Ideas

- Meta-repo CI (GitHub Actions running lint-all / typecheck-all / changesets-status on every PR) — Phase 8 POLISH-01
- Automated changesets release on merge to main — Phase 8 POLISH-02
- Subprojects adopting `@minion/tsconfig` / `@minion/lint-config` / `.env.defaults` — Phase 3 ADOPT-*
- Folding `minion-shared` into `packages/shared` — Phase 4 (strategy simplified post-Phase-1 finding: direct copy, not subtree)
- `minion init` subproject-scaffolding command that auto-clones missing subprojects from `minion.json` remotes — v2 DX-01
- IDE integration for subproject-aware command palette — v2 DX-02
- `@minion/logger` / `@minion/telemetry` shared packages — v2 OBS-02
- Rollback tooling for shared-package releases that break consumers — v2 REL-01
- Canary npm tag releases — v2 REL-02

</deferred>

---

*Phase: 02-foundation*
*Context gathered: 2026-04-19 via spec-derivation (no discuss-phase needed; spec + Phase 1 findings provide full lock)*
