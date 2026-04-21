# Requirements: Minion Meta-Repo

**Defined:** 2026-04-19
**Core Value:** One command resolves the right env and runs the right build for any subproject, and every piece of cross-cutting code lives in exactly one place under uniform standardization — no exceptions.

## v1 Requirements

Requirements for the initial meta-repo buildout (M0–M7). Each maps to a roadmap phase.

### Clean Slate (M0)

- [x] **CLEAN-01**: Every subproject has a clean `git status` with no uncommitted or untracked changes
- [x] **CLEAN-02**: Every subproject's default branch tracks a valid upstream remote
- [x] **CLEAN-03**: All stray git worktrees (`paperclip-pi-fallback`, `paperclip-meta-repair`, etc.) are merged back or removed
- [x] **CLEAN-04**: All open PRs across subproject repos are classified (merged / closed / rebased / explicitly held with reason)
- [x] **CLEAN-05**: Root-level one-time research artifacts are relocated or deleted so the root contains only meta-repo files, symlinks, and subproject directories
- [x] **CLEAN-06**: `specs/clean-slate-inventory.md` documents the pre-mutation state for auditability

### Foundation (M1)

- [x] **FOUND-01**: Meta-repo is initialized as a git repo at `AI/` with remote `NikolasP98/minion-meta`
- [x] **FOUND-02**: Root `package.json` and `pnpm-workspace.yaml` are configured with `packages/*`; subproject directories are gitignored by the meta-repo
- [x] **FOUND-03**: `@minion/*` npm scope is registered (public) and the meta-repo can publish to it
- [x] **FOUND-04**: `@minion/tsconfig` package exports `base`, `node`, `svelte`, and `library` variants
- [x] **FOUND-05**: `@minion/lint-config` package exports oxlint, flat-eslint, and prettier presets
- [x] **FOUND-06**: `@minion/env` package resolves env per the 6-level hierarchy and validates required vars from `.env.example`
- [x] **FOUND-07**: `@minion/cli` exposes the `minion` binary with commands: `dev`, `build`, `test`, `check`, `run`, `<project>` alias, `--all` fan-out, `status`, `doctor`, `sync-env`, `rotate-env`, `infisical`, `link`, `unlink`, `list`, `branch`
- [x] **FOUND-08**: `minion.json` registry at meta-repo root declares each subproject's path, package manager, branch, Infisical project, and primary commands
- [x] **FOUND-09**: Changesets is configured at the meta-repo root for independent semver releases of each `@minion/*` package
- [x] **FOUND-10**: Existing `infisical-dev.sh` logic is absorbed into `@minion/env`; the old script is deprecated with a shim
- [x] **FOUND-11**: Infisical projects renamed to the `minion-<name>` convention (`paperclip` → `minion-paperclip`, new `minion-core`, etc.) with all references updated in Netcup systemd units, docker-compose, CI workflows, scripts, and memory entries
- [x] **FOUND-12**: Root `CLAUDE.md` updated to document the new meta-repo workflow; meta-repo `README.md` describes onboarding

### Adoption (M2)

- [x] **ADOPT-01**: `minion` subproject extends `@minion/tsconfig`, adopts `@minion/lint-config`, and ships `.env.defaults` + `.env.example`
- [x] **ADOPT-02**: `minion_hub` subproject adopts shared configs and ships env files
- [x] **ADOPT-03**: `minion_site` subproject adopts shared configs and ships env files
- [x] **ADOPT-04**: `paperclip-minion` subproject adopts shared configs and ships env files
- [x] **ADOPT-05**: `pixel-agents` subproject adopts shared configs and ships env files
- [x] **ADOPT-06**: `minion_plugins` subproject adopts shared configs where applicable (tsconfig/lint for any TS portions)
- [x] **ADOPT-07**: Every subproject's own CI passes against published `@minion/*` versions (no meta-repo dependency)

### Shared Fold-in (M3)

- [x] **SHARE-01**: `minion-shared/` history is imported into `packages/shared/` via `git subtree add`, preserving commits
- [x] **SHARE-02**: `@minion/shared` publishes first release to npm under the new scope
- [x] **SHARE-03**: Re-export shim published under the old package name and deprecated with notice
- [x] **SHARE-04**: `minion_hub`, `minion_site`, and `paperclip-minion` import paths updated to `@minion/shared`
- [x] **SHARE-05**: Old `minion-shared` GitHub repo archived with README redirect

### Database Extraction (M4)

- [x] **DB-01**: Drizzle schema from `minion_hub/src/server/db/schema/` is moved to `packages/db/src/schema/`
- [x] **DB-02**: `@minion-stack/db` publishes first release exposing schema types and migration runner
- [x] **DB-03**: `minion_site` imports schema types from `@minion-stack/db` (consume-only; PR #4 open on NikolasP98/minion-site)
- [x] **DB-04**: `minion_hub` imports schema types from `@minion-stack/db` while retaining migration ownership (two-step cutover; PR #17 open on NikolasP98/minion_hub)
- [x] **DB-05**: Staging DB dry-run of migration-ownership cutover passes with no data loss or schema drift
- [x] **DB-06**: Meta-repo takes over migration ownership; hub stops running `db:push` (PR #18; production push exit 0)
- [x] **DB-07**: Drizzle config in hub and site updated — hub drizzle.config.ts removed; meta-repo drizzle.config.ts at root is canonical

### Auth Extraction (M5)

- [x] **AUTH-01**: Better Auth config extracted from hub and site into `packages/auth` as `createAuth()` factory
- [x] **AUTH-02**: `@minion/auth` publishes first release
- [x] **AUTH-03**: `minion_hub` and `minion_site` consume the factory with identical secret/provider config
- [x] **AUTH-04**: Staging deploy of both services verified with shared session continuity (user logs into hub, session works on site)

### WS Consolidation (M6)

- [ ] **WS-01**: WS client duplication audited across hub, site, and paperclip's `openclaw_gateway` adapter; report written to specs
- [ ] **WS-02**: Shared WS client implementation consolidated into `@minion/shared`
- [ ] **WS-03**: `minion_hub` and `minion_site` updated to consume the shared client
- [ ] **WS-04**: `paperclip-minion` `openclaw_gateway` adapter updated to consume the shared client
- [ ] **WS-05**: Exactly one WS client implementation exists across the platform (grep confirms no duplicate WebSocket classes)

### Polish & Automation (M7)

- [ ] **POLISH-01**: Meta-repo CI runs lint-all, typecheck-all, and changesets-status on every PR
- [ ] **POLISH-02**: Changesets release automation publishes `@minion/*` packages on merge to main
- [ ] **POLISH-03**: `minion doctor` surfaces env validation, link drift, and subproject health in a single report
- [ ] **POLISH-04**: Root `CLAUDE.md` final rewrite reflects the steady-state workflow (not the migration narrative)
- [ ] **POLISH-05**: Developer onboarding doc: clone → subproject checkout → `minion dev` in under 10 minutes for a new dev

## v2 Requirements

Deferred to future milestones. Tracked but not in v1 roadmap.

### Observability

- **OBS-01**: `minion doctor` integrates with Netcup/Tailscale health checks
- **OBS-02**: Cross-subproject telemetry pipeline (logs, traces) consolidated into a shared `@minion/telemetry` package

### Release Engineering

- **REL-01**: Automated rollback tooling for shared-package releases that break consumers
- **REL-02**: Canary releases of shared packages to a staging npm tag before promoting to latest

### Developer Experience

- **DX-01**: `minion init` scaffolds missing subproject clones from `minion.json` registry
- **DX-02**: IDE integration (VS Code extension) for subproject-aware command palette entries

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Turborepo / Nx adoption | `concurrently` is sufficient for independent dist/ builds; shared task graph isn't worth modeling |
| Unifying package managers across subprojects | bun for SvelteKit, pnpm for pnpm-based, npm for the rest — diversity is acceptable |
| Moving subproject source into meta-repo git history | Subprojects stay as independent repos with their own remotes, period |
| `ai-studio/`, `docs/`, VAULT symlink restructuring | Separate concern, tracked in `project_vault_minion_doc_structure.md` |
| `omnisearch/` and other Netcup-only deployments | Infrastructure layer, not meta-repo scope |
| `pixel-agents` VS Code extension packaging changes | Only shared tsconfig/lint apply; extension packaging stays extension-owned |
| Agent registry (`docs/agents/`) reorganization | Already in progress separately, per `project_docs_restructure_pending.md` |
| 3CX, Tailscale, Netcup VPS infrastructure changes | Out of software scope |

## Traceability

Populated during roadmap creation — each requirement maps to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLEAN-01 | Phase 1 | Complete |
| CLEAN-02 | Phase 1 | Complete |
| CLEAN-03 | Phase 1 | Complete |
| CLEAN-04 | Phase 1 | Complete |
| CLEAN-05 | Phase 1 | Complete |
| CLEAN-06 | Phase 1 | Complete |
| FOUND-01 | Phase 2 | Complete |
| FOUND-02 | Phase 2 | Complete |
| FOUND-03 | Phase 2 | Complete |
| FOUND-04 | Phase 2 | Complete |
| FOUND-05 | Phase 2 | Complete |
| FOUND-06 | Phase 2 | Complete |
| FOUND-07 | Phase 2 | Complete |
| FOUND-08 | Phase 2 | Complete |
| FOUND-09 | Phase 2 | Complete |
| FOUND-10 | Phase 2 | Complete |
| FOUND-11 | Phase 2 | Complete |
| FOUND-12 | Phase 2 | Complete |
| ADOPT-01 | Phase 3 | Complete |
| ADOPT-02 | Phase 3 | Complete |
| ADOPT-03 | Phase 3 | Complete |
| ADOPT-04 | Phase 3 | Complete |
| ADOPT-05 | Phase 3 | Complete |
| ADOPT-06 | Phase 3 | Complete |
| ADOPT-07 | Phase 3 | Complete |
| SHARE-01 | Phase 4 | Complete |
| SHARE-02 | Phase 4 | Complete |
| SHARE-03 | Phase 4 | Complete |
| SHARE-04 | Phase 4 | Complete |
| SHARE-05 | Phase 4 | Complete |
| DB-01 | Phase 5 | Complete |
| DB-02 | Phase 5 | Complete |
| DB-03 | Phase 5 | Complete |
| DB-04 | Phase 5 | Complete |
| DB-05 | Phase 5 | Complete |
| DB-06 | Phase 5 | Complete |
| DB-07 | Phase 5 | Complete |
| AUTH-01 | Phase 6 | Complete |
| AUTH-02 | Phase 6 | Complete |
| AUTH-03 | Phase 6 | Complete |
| AUTH-04 | Phase 6 | Complete |
| WS-01 | Phase 7 | Pending |
| WS-02 | Phase 7 | Pending |
| WS-03 | Phase 7 | Pending |
| WS-04 | Phase 7 | Pending |
| WS-05 | Phase 7 | Pending |
| POLISH-01 | Phase 8 | Pending |
| POLISH-02 | Phase 8 | Pending |
| POLISH-03 | Phase 8 | Pending |
| POLISH-04 | Phase 8 | Pending |
| POLISH-05 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-19*
*Last updated: 2026-04-19 after initial definition*
