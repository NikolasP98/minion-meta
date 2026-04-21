# Minion Meta-Repo

## What This Is

A root-level orchestration layer and shared-package ecosystem that transforms `/home/nikolas/Documents/CODE/AI/` from a loose collection of sibling subprojects into a coherent **meta-repo**. It owns the `minion` CLI, a hierarchical env/secrets system backed by Infisical, shared configs (tsconfig, lint), and shared npm packages (`@minion/*`) for cross-cutting concerns like DB schema, auth, and gateway WS protocol. Subprojects (`minion`, `minion_hub`, `minion_site`, `paperclip-minion`, `pixel-agents`, `minion_plugins`) remain independent git repos with their own remotes, branches, and deploy targets — the meta-repo never touches their `.git/`. Target consumers: the solo developer (Nikolas) working across all subprojects daily, and future collaborators onboarding to the platform.

## Core Value

**One command resolves the right env and runs the right build for any subproject, and every piece of cross-cutting code lives in exactly one place under uniform standardization — no exceptions.**

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

**M1 — Foundation** (Validated in Phase 02: foundation, 2026-04-20)

Scope substitution: `@minion/*` → `@minion-stack/*` (locked in Phase 02 plan 02-02 after npm scope availability check).

- [x] FOUND-01: Meta-repo live at `NikolasP98/minion-meta` — default branch `main`, synced with origin
- [x] FOUND-02: Root `package.json` + `pnpm-workspace.yaml` configured with `packages/*`; subproject dirs gitignored
- [x] FOUND-03: `@minion-stack/*` npm scope registered (public); all 4 packages published at 0.1.0
- [x] FOUND-04: `@minion-stack/tsconfig` exports `base`, `node`, `svelte`, `library` variants
- [x] FOUND-05: `@minion-stack/lint-config` exports oxlint, flat-eslint, and prettier presets
- [x] FOUND-06: `@minion-stack/env` resolves env per 6-level hierarchy + validates against `.env.example`
- [x] FOUND-07: `@minion-stack/cli` ships `minion` binary with full command surface (`dev|build|test|check|run|<project>`, `--all`, `status`, `doctor`, `sync-env`, `rotate-env`, `infisical`, `link|unlink`, `list`, `branch`)
- [x] FOUND-08: `minion.json` registry declares each subproject's path, package manager, branch, Infisical project, and primary commands
- [x] FOUND-09: Changesets configured for independent semver releases; zero pending changesets post-phase
- [x] FOUND-10: `infisical-dev.sh` absorbed into `@minion-stack/env`; shim prints deprecation notice and exits 1
- [x] FOUND-11: 7 Infisical projects renamed to `minion-<name>` convention; Netcup services unchanged (UUID-based refs preserved); 6 memory files synced
- [x] FOUND-12: Root `CLAUDE.md` documents meta-repo workflow; root `README.md` provides ≤200-line onboarding

**M0 — Clean slate** (Validated in Phase 01: clean-slate)

- [x] CLEAN-01..06 (see `.planning/phases/01-clean-slate/01-VERIFICATION.md`)

**M2 — Adopt foundation in subprojects** (Validated in Phase 03: adopt-foundation-in-subprojects, 2026-04-21)

All 5 TypeScript-using subprojects adopted `@minion-stack/tsconfig` + lint-config + env files with open PRs (user-controlled merge per D-24). `minion_plugins` is a full D-27 deferral (pure catalog, no code/vars).

- [x] ADOPT-01: `minion` extends `@minion-stack/tsconfig/node`, oxlint preset adopted, env files shipped — PR #77
- [x] ADOPT-02: `minion_hub` extends array `[svelte, .svelte-kit]`, Prettier via 0.1.1, net-new ci.yml — PR #16
- [x] ADOPT-03: `minion_site` same pattern as hub — PR #2
- [x] ADOPT-04: `paperclip-minion` extends `node` at `tsconfig.base.json`, Prettier CJS shim for 0.1.0 — PR #1
- [x] ADOPT-05: `pixel-agents` dual tsconfig (extension=`node`, webview=`base`), local ESLint plugin preserved — PR pablodelucca/pixel-agents#246
- [x] ADOPT-06: `minion_plugins` full D-27 deferral (no code, no vars) — documented in deferred-items.md
- [x] ADOPT-07: Net-new CI workflows added for hub + site; existing CI validated against published `@minion-stack/*` versions

### Active

<!-- Current scope. Building toward these. -->


**M3 — Fold `minion-shared` → `@minion/shared`**
- [ ] SHARE-01: `minion-shared/` history is imported into `packages/shared/` via `git subtree add`, preserving commits
- [ ] SHARE-02: `@minion/shared` publishes first release to npm under new scope
- [ ] SHARE-03: Re-export shim published under old package name and deprecated
- [ ] SHARE-04: `minion_hub`, `minion_site`, and `paperclip-minion` import paths updated to `@minion/shared`
- [ ] SHARE-05: Old `minion-shared` GitHub repo archived with README redirect

**M4 — `@minion/db` extraction**
- [ ] DB-01: Drizzle schema from `minion_hub/src/server/db/schema/` is moved to `packages/db/src/schema/`
- [ ] DB-02: `@minion/db` publishes first release exposing schema types + migration runner
- [ ] DB-03: `minion_site` imports schema types from `@minion/db` (consume-only first)
- [ ] DB-04: `minion_hub` imports schema types from `@minion/db` while retaining migration ownership (two-step cutover)
- [ ] DB-05: Staging DB dry-run of migration-ownership cutover passes
- [ ] DB-06: Meta-repo takes over migration ownership; hub stops running `db:push`
- [ ] DB-07: Drizzle config in hub + site updated to reference `@minion/db` location

**M5 — `@minion/auth` extraction**
- [ ] AUTH-01: Better Auth config extracted from hub + site into `packages/auth` as `createAuth()` factory
- [ ] AUTH-02: `@minion/auth` publishes first release
- [ ] AUTH-03: `minion_hub` + `minion_site` consume the factory with identical secret/provider config
- [ ] AUTH-04: Staging deploy of both services verified with shared session continuity

**M6 — WS / gateway consolidation**
- [ ] WS-01: WS client duplication audited across hub, site, and paperclip's `openclaw_gateway` adapter
- [ ] WS-02: Shared WS client implementation consolidated into `@minion/shared`
- [ ] WS-03: `minion_hub`, `minion_site` updated to consume shared client
- [ ] WS-04: `paperclip-minion` adapter updated to consume shared client
- [ ] WS-05: One WS client implementation exists across the platform (no duplicates)

**M7 — Polish & automation**
- [ ] POLISH-01: Meta-repo CI runs lint-all, typecheck-all, and changesets-status on every PR
- [ ] POLISH-02: Changesets release automation publishes `@minion/*` on merge to main
- [ ] POLISH-03: `minion doctor` surfaces env validation, link drift, and subproject health in a single report
- [ ] POLISH-04: Root `CLAUDE.md` final rewrite reflects the steady-state workflow
- [ ] POLISH-05: Developer onboarding doc: clone → subproject checkout → `minion dev` in under 10 minutes for a new dev

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Turborepo / Nx adoption — `concurrently` is sufficient for independent dist/ builds; shared task graph isn't worth modeling
- Unifying package managers across subprojects — bun stays for SvelteKit projects, pnpm for pnpm-based; npm for the rest. Diversity is acceptable; consistency within subprojects matters more
- Moving subproject source into the meta-repo git history — subprojects stay as independent repos with their own remotes, period
- `ai-studio/`, `docs/` (symlinks to VAULT), or VAULT structure changes — separate concern, tracked in `project_vault_minion_doc_structure.md`
- `omnisearch/` and other Netcup-only deployments not dev-facing — infra layer, not meta-repo scope
- `pixel-agents` VS Code extension packaging / build system — only shared tsconfig + lint apply; extension packaging stays extension-owned
- Agent registry (`docs/agents/`) reorganization — already in progress separately, per `project_docs_restructure_pending.md`
- 3CX, Tailscale, Netcup VPS infrastructure layer — out of software scope

## Context

**Existing directory layout** (`/home/nikolas/Documents/CODE/AI/`):
- 7 active subproject directories each with their own `.git/`, remote, and branch: `minion/` (DEV), `minion_hub/` (dev), `minion_site/` (master), `minion-shared/` (to be folded in M3), `minion_plugins/` (main), `paperclip-minion/` (minion-integration), `pixel-agents/` (main)
- 2 symlinks into `VAULT/MINION/`: `docs/` (project docs), `ai-studio/` (research/strategy)
- Root-level one-time research artifacts (`A3_*.md`, `RETENTION_*.md`, etc.) — cleanup target for M0
- Stray worktrees from paperclip work (`paperclip-pi-fallback/`, `paperclip-meta-repair/`)
- Ad-hoc root-level tooling: `.env`, `infisical-dev.sh`

**Multi-stack reality:** Subprojects use different package managers (pnpm, bun, npm), different test runners (vitest, Playwright), and different deploy targets (Vercel, Fly, Docker, self-hosted Netcup VPS). The meta-repo embraces this diversity rather than unifying it.

**Prior state:** Infisical self-hosted on Netcup with multiple overlapping projects (current `paperclip`, `minion-gateway-prod`, plus a shared `ai-providers` secret). Meta-repo rationalizes these into a `minion-<name>` naming convention and a clean `minion-core` shared project. Systemd units on Netcup and docker-compose configs reference old project names — all must be updated in the rename cascade.

**Shared database:** `minion_hub` and `minion_site` literally share a Turso (LibSQL) database in production; both currently maintain schema code independently. M4 extracts this to a single source.

**Cross-project integration:** Paperclip's `openclaw_gateway` adapter connects to the minion gateway via Tailscale funnel WSS. This creates a triangle: hub, site, paperclip all speak the same gateway protocol currently duplicated in separate codebases. M6 consolidates.

**Deployment reality:**
- `minion` (gateway) deployed to Netcup VPS as user-level systemd (`bot-prd`), plus Docker / Fly.io options
- `minion_hub` + `minion_site` deployed to Vercel
- `paperclip-minion` deployed to Netcup as Docker Compose at `/home/niko/docker/paperclip/`
- `pixel-agents` is a VS Code extension (not deployed as a service)

**Prior cleanup work:** Two PR-sweep passes already happened (April 11 and April 17 per memory). M0.3 builds on that foundation rather than starting from zero.

## Constraints

- **Tech stack**: Root meta-repo uses pnpm 10+, Node 22+, TypeScript strict. Subprojects keep their existing stacks untouched
- **Git model**: Meta-repo is a separate git repo; never touches subproject `.git/`. Cross-repo coordination via per-subproject PRs opened by subagents during cross-cutting milestones (M3–M6)
- **Secrets**: All secrets flow through Infisical machine-identity Universal Auth. No hardcoded secrets. `.env.local` is gitignored dev-only escape hatch
- **Published package scope**: `@minion/*` on npm (public). `minion-shared` (old) stays published but deprecated after M3
- **CI independence**: Each subproject's own CI must continue to pass against published `@minion/*` versions — no meta-repo checkout required for subproject builds
- **Cross-repo merge ordering**: M3–M6 each require a release-order runbook (publish shared package → verify npm availability → update consumers → verify deploy). Wrong order breaks builds
- **Infisical rename cascade**: Renames touch Netcup systemd units, docker-compose, CI workflows, memory entries. Must be atomic within the rename phase

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Meta-repo (Option A), not true monorepo or pnpm-workspace-hybrid | Subprojects have baked-in constraints (published npm packages, separate branches/deploys, mixed stacks) that make forced consolidation a net loss | — Pending |
| Root-level branding is "minion" (not OpenClaw) | User-confirmed 2026-04-19; matches directory naming and existing npm package scope | — Pending |
| Aggressive shared-package extraction (Option C) | User wants "all-in on standardization and abstraction layers" — one model, no exceptions | — Pending |
| Root becomes its own git repo; subprojects stay gitignored | Avoids submodule pain, keeps subprojects handoff-ready, natural home for cross-cutting tooling | — Pending |
| Per-subproject `.env.defaults` + `.env.example` (not centralized) | Keeps subprojects self-contained and runnable standalone; defaults evolve with the code that reads them | — Pending |
| Fold `minion-shared/` into `packages/shared` | One exception becomes permanent drift — all shared code follows one model | — Pending |
| Publishing via npm under `@minion/*` scope | Matches how subprojects already consume dependencies; no special tooling | — Pending |
| Orchestration via `concurrently`, not Turborepo | Subprojects build into their own `dist/` independently; no shared task graph worth modeling | — Pending |
| M0 (clean slate) runs before any meta-repo construction | User explicit request — "start with a clean slate, first priority" | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-21 after Phase 03 (adopt-foundation-in-subprojects) completion*
