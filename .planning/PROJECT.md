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

**M5 — Auth Extraction** (Validated in Phase 06: auth-extraction, 2026-04-21)

`@minion-stack/auth@0.2.0` published. `createAuth()` factory with jwt(EdDSA/1h/openclaw-gateway) + accountLinking + emailAndPassword always included; callers pass plugins + hooks. JWKS kid identical on both services. Session continuity verified staging + production.

- [x] AUTH-01: Better Auth config extracted into `packages/auth` as `createAuth()` factory — `@minion-stack/auth@0.2.0`
- [x] AUTH-02: `@minion-stack/auth` published on npm
- [x] AUTH-03: `minion_hub` + `minion_site` both call `createAuth()` with identical base config; hub passes `oidcProvider` + `organization({sendInvitationEmail})` + hooks; site passes `organization()` only
- [x] AUTH-04: Staging + production verified — JWKS kid `gR0h1QKBswrpsykV0JRW7WD4C4F1y3vc` identical, cross-app session continuity confirmed, no forced logouts

**M4 — DB Extraction** (Validated in Phase 05: db-extraction, 2026-04-21)

Scope note: package published as `@minion-stack/db` (not `@minion/db` — scope locked in Phase 02). drizzle-kit cannot read `.ts` from node_modules (A1=FAILED); meta-repo drizzle.config.ts points at `./packages/db/src/schema/**/*.ts` (local workspace source).

- [x] DB-01: Drizzle schema moved to `packages/db/src/schema/` — 38 files (37 domain + auth/), tsc build exits 0
- [x] DB-02: `@minion-stack/db@0.2.0` published to npm
- [x] DB-03: `minion_site` imports from `@minion-stack/db` — local schema deleted, 6 import sites updated, `bun run check` 0 errors (PR #4)
- [x] DB-04: `minion_hub` imports from `@minion-stack/db` — 56 import sites updated; local schema retained for drizzle-kit only (PRs #17, #18)
- [x] DB-05: Staging dry-run: local SQLite 4 additive ADD COLUMN changes applied cleanly; no data loss
- [x] DB-06: Meta-repo owns migrations; hub `db:push/generate/migrate/studio` removed; production Turso push: "No changes detected", exit 0
- [x] DB-07: Hub `drizzle.config.ts` removed; meta-repo config at root using local workspace schema path

**M2 — Adopt foundation in subprojects** (Validated in Phase 03: adopt-foundation-in-subprojects, 2026-04-21)

All 5 TypeScript-using subprojects adopted `@minion-stack/tsconfig` + lint-config + env files with open PRs (user-controlled merge per D-24). `minion_plugins` is a full D-27 deferral (pure catalog, no code/vars).

- [x] ADOPT-01: `minion` extends `@minion-stack/tsconfig/node`, oxlint preset adopted, env files shipped — PR #77
- [x] ADOPT-02: `minion_hub` extends array `[svelte, .svelte-kit]`, Prettier via 0.1.1, net-new ci.yml — PR #16
- [x] ADOPT-03: `minion_site` same pattern as hub — PR #2
- [x] ADOPT-04: `paperclip-minion` extends `node` at `tsconfig.base.json`, Prettier CJS shim for 0.1.0 — PR #1
- [x] ADOPT-05: `pixel-agents` dual tsconfig (extension=`node`, webview=`base`), local ESLint plugin preserved — PR pablodelucca/pixel-agents#246
- [x] ADOPT-06: `minion_plugins` full D-27 deferral (no code, no vars) — documented in deferred-items.md
- [x] ADOPT-07: Net-new CI workflows added for hub + site; existing CI validated against published `@minion-stack/*` versions

**M3 — Fold `minion-shared`** (Validated in Phase 04: fold-minion-shared, 2026-04-21)

Scope substitution: `@minion/shared` → `@minion-stack/shared`. Old package deprecated as shim; source folded into `packages/shared`.

- [x] SHARE-01: `minion-shared/` source migrated into `packages/shared/`; source imported (not subtree due to scope rename + layout changes)
- [x] SHARE-02: `@minion-stack/shared@0.1.0` published to npm
- [x] SHARE-03: `minion-shared@0.2.0` deprecation shim published with `console.warn` + npm registry notice
- [x] SHARE-04: `minion_site` migrated to `@minion-stack/shared` (PR #3); hub + paperclip follow in Phase 7
- [x] SHARE-05: `minion-shared/` directory deleted from meta-repo, removed from .gitignore; old GitHub repo archived

**M6 — WS / gateway consolidation** (Validated in Phase 07: ws-consolidation, 2026-04-22)

- [x] WS-01: WS client duplication audited — 315-LOC audit at `specs/ws-duplication-audit.md` (hub 920 LOC, site 373 LOC, paperclip 355 LOC)
- [x] WS-02: Shared `GatewayClient` consolidated into `@minion-stack/shared`
- [x] WS-03: `minion_hub`, `minion_site` migrated to shared client
- [x] WS-04: `paperclip-minion` `openclaw_gateway` adapter migrated to shared client
- [x] WS-05: One WS client implementation exists across the platform (no duplicates)

**M7 — Polish & automation** (Validated in Phase 08: polish-automation, 2026-04-22)

- [x] POLISH-01: Meta-repo CI runs lint-all, typecheck-all, build-all, test-all + changesets-status on every PR
- [x] POLISH-02: Changesets release automation publishes `@minion-stack/*` on merge to main (NPM_TOKEN automation type)
- [x] POLISH-03: `minion doctor` surfaces env validation, seven-package link-drift coverage, and git-status column per subproject
- [x] POLISH-04: Root `CLAUDE.md` rewritten for steady-state workflow; README full package table + CI docs
- [x] POLISH-05: Onboarding dry-run confirmed clone → `minion dev` in under 10 minutes (4:15 actual)

### Active

<!-- Current scope. Building toward these. -->

_None — v1.0 shipped 2026-04-23. Run `/gsd-new-milestone` to scope v1.1._

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
| Meta-repo (Option A), not true monorepo or pnpm-workspace-hybrid | Subprojects have baked-in constraints (published npm packages, separate branches/deploys, mixed stacks) | ✓ Good — 8 phases shipped without touching subproject .git/ |
| Root-level branding is "minion" (not OpenClaw) | User-confirmed 2026-04-19; matches directory naming | ✓ Good |
| Aggressive shared-package extraction (Option C) | User wants "all-in on standardization and abstraction layers" | ✓ Good — 7 `@minion-stack/*` packages live |
| Root becomes its own git repo; subprojects stay gitignored | Avoids submodule pain, keeps subprojects handoff-ready | ✓ Good |
| Per-subproject `.env.defaults` + `.env.example` (not centralized) | Keeps subprojects self-contained | ✓ Good |
| Fold `minion-shared/` into `packages/shared` | One exception becomes permanent drift | ✓ Good — deprecation shim consumed, source deleted |
| Publishing via npm under `@minion-stack/*` scope (not `@minion`) | `@minion` scope unavailable on npm; locked in Phase 02 | ✓ Good |
| Orchestration via `concurrently`, not Turborepo | No shared task graph worth modeling | ✓ Good |
| M0 (clean slate) runs before any meta-repo construction | User explicit request | ✓ Good — prevented downstream drift |
| drizzle-kit points at workspace source (`./packages/db/src/schema`) not node_modules | drizzle-kit `ignoreNodeModules:true` — can't read .ts from node_modules (A1=FAILED) | ✓ Good — cutover successful |
| `createAuth()` factory hardcodes jwt+accountLinking+emailAndPassword; callers inject plugins | Minimizes config drift across hub/site while allowing org/OIDC variance | ✓ Good — identical JWKS kid confirmed |

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
*Last updated: 2026-04-23 after v1.0 milestone (Minion Meta-Repo Foundation) completion*
