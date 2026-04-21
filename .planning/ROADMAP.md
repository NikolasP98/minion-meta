# Roadmap: Minion Meta-Repo

## Overview

Transform `/home/nikolas/Documents/CODE/AI/` from a loose collection of sibling subprojects into a coherent meta-repo with a root-level git repo, a hierarchical env/secrets system, a unified `minion` CLI, and aggressive extraction of cross-cutting code into shared `@minion/*` npm packages. The journey starts with a clean-slate pass across every subproject, stands up foundational tooling, propagates adoption, then executes the aggressive extraction of `minion-shared`, DB schema, auth, and WS/gateway client — each as its own release-gated milestone with coordinated cross-repo updates. Ends with release automation and steady-state developer onboarding docs.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Clean Slate** — Audit, triage, and bring every subproject to a known-clean state (completed 2026-04-20)
- [x] **Phase 2: Foundation** — Stand up meta-repo, `@minion/cli` + `@minion/env` + shared configs, Infisical rename cascade (completed 2026-04-20)
- [x] **Phase 3: Adopt Foundation in Subprojects** — Propagate shared tsconfig/lint/env into every subproject (completed 2026-04-21)
- [ ] **Phase 4: Fold minion-shared** — Migrate `minion-shared/` source into `packages/shared`, publish `@minion-stack/shared`, update consumers, publish deprecation shim
- [ ] **Phase 5: DB Extraction** — Move Drizzle schema to `@minion/db`, two-step cutover of migration ownership from hub to meta-repo
- [ ] **Phase 6: Auth Extraction** — Extract Better Auth config to `@minion/auth`, hub+site consume factory with shared session continuity
- [ ] **Phase 7: WS Consolidation** — Consolidate duplicated WS client into `@minion/shared`, hub+site+paperclip consume
- [ ] **Phase 8: Polish & Automation** — Meta-repo CI, changesets release automation, `minion doctor` polish, onboarding docs

## Phase Details

### Phase 1: Clean Slate
**Goal**: Every subproject in a known-clean state with documented head commits, zero uncommitted drift, zero stray worktrees, and a fully-triaged open-PR list — before any meta-repo construction begins.
**Depends on**: Nothing (first phase)
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05, CLEAN-06
**Success Criteria** (what must be TRUE):
  1. Running `git status` in every subproject directory returns "working tree clean"
  2. Every subproject's default branch (DEV / dev / master / main / minion-integration) tracks a valid upstream remote with no "[gone]" markers
  3. No stray git worktrees remain (`paperclip-pi-fallback`, `paperclip-meta-repair`, or any others)
  4. Every open PR across the 7 subproject repos is classified in `specs/clean-slate-inventory.md` as merged, closed, rebased, or explicitly held with a reason
  5. The meta-repo root directory contains only meta-repo files, symlinks, and the 7 subproject directories — no stray one-time research artifacts
  6. `specs/clean-slate-inventory.md` captures the pre-mutation state of every subproject (branch, ahead/behind, dirty files, worktrees, open PRs) for audit purposes
**UI hint**: no
**Plans**: 5 plans (Wave 1: inventory audit; Wave 2: uncommitted/worktree resolution, PR triage sweep, root cleanup, tracking fixes — all depend on Wave 1 approval)

Plans:
- [x] 01-01-PLAN.md — Inventory audit: 7 parallel Explore subagents produce `specs/clean-slate-inventory.md` (Wave 1, read-only)
- [x] 01-02-PLAN.md — Resolve uncommitted changes + stray worktrees per inventory dispositions (Wave 2)
- [x] 01-03-PLAN.md — PR triage sweep: 7 parallel general-purpose subagents classify + execute merges/closes (Wave 2)
- [x] 01-04-PLAN.md — Root cleanup: relocate/delete A3/RETENTION/KPI research artifacts (Wave 2)
- [x] 01-05-PLAN.md — Fix broken upstream tracking (e.g., `minion_plugins` main → origin/master [gone]) (Wave 2)

### Phase 2: Foundation
**Goal**: Stand up the meta-repo and foundational shared packages so that `minion dev <any-project>` works end-to-end with hierarchical env resolution.
**Depends on**: Phase 1
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, FOUND-09, FOUND-10, FOUND-11, FOUND-12
**Success Criteria** (what must be TRUE):
  1. Meta-repo is a live git repo at `AI/` pushed to `NikolasP98/minion-meta` on GitHub
  2. `@minion/tsconfig`, `@minion/lint-config`, `@minion/env`, `@minion/cli` all published to npm under the new `@minion` scope
  3. Running `minion dev <any-project>` resolves env from the 6-level hierarchy and successfully launches that subproject's native dev command
  4. `minion doctor` reports env resolution status for every subproject in `minion.json` and flags any missing required vars
  5. Infisical projects all renamed to `minion-<name>` convention; no remaining references to old names in Netcup systemd, docker-compose, CI, or scripts
  6. Changesets is configured and a dry-run release of all four packages succeeds
**UI hint**: no
**Plans**: 8 plans across 6 waves

Plans:
- [x] 02-01-PLAN.md — Meta-repo scaffold: git branch rename, package.json, pnpm-workspace.yaml, new .gitignore, minion.json registry, .env.defaults/.env.example, empty package skeletons, changesets init (Wave 1)
- [x] 02-02-PLAN.md — Register `@minion` npm org + gh repo create NikolasP98/minion-meta + first push + scope-fallback decision (Wave 2, human-action checkpoints)
- [x] 02-03-PLAN.md — Ship @minion/tsconfig@0.1.0 (base/node/svelte/library variants) (Wave 3)
- [x] 02-04-PLAN.md — Ship @minion/lint-config@0.1.0 (oxlint + ESLint + Prettier presets) (Wave 3)
- [x] 02-05-PLAN.md — Ship @minion/env@0.1.0 (6-layer hierarchy, Infisical CLI wrapper, cache, validation) — TDD (Wave 3)
- [x] 02-06-PLAN.md — Ship @minion/cli@0.1.0 (15 subcommands: dev/build/test/check/run/fanout/status/doctor/sync-env/rotate-env/infisical/link/list/branch) (Wave 4)
- [x] 02-07-PLAN.md — Infisical rename cascade: discovery → dashboard/API → Netcup systemd+compose → memory entries → production smoke test (Wave 5, multi-checkpoint)
- [x] 02-08-PLAN.md — Root CLAUDE.md + README.md onboarding + infisical-dev.sh deprecation shim (Wave 6)

### Phase 3: Adopt Foundation in Subprojects
**Goal**: Every TypeScript-using subproject consumes `@minion-stack/tsconfig` and `@minion-stack/lint-config`, ships `.env.defaults` + `.env.example`, and continues to build green against published shared versions without requiring the meta-repo to be checked out.
**Depends on**: Phase 2
**Requirements**: ADOPT-01, ADOPT-02, ADOPT-03, ADOPT-04, ADOPT-05, ADOPT-06, ADOPT-07
**Success Criteria** (what must be TRUE):
  1. Every subproject's `tsconfig.json` extends from `@minion-stack/tsconfig/*.json` (or is explicitly deferred per D-27 for zero-code repos)
  2. Every subproject's lint config references `@minion-stack/lint-config` presets (or is explicitly deferred)
  3. Every subproject has committed `.env.defaults` (non-secret) and `.env.example` (secret var names) files OR deferral is logged
  4. Every subproject's own CI passes against published `@minion-stack/*` npm versions — no meta-repo checkout needed
  5. `minion doctor` reports all 6 adopted subprojects as healthy (or flagged as expected-no-install for markdown-only repos)
**UI hint**: no
**Plans**: 6 plans across 3 waves (Wave 1: minion + paperclip-minion; Wave 2: hub + site; Wave 3: pixel-agents + minion_plugins)

Plans:
- [x] 03-01-PLAN.md — Adopt @minion-stack shared configs + env files in `minion` (pnpm, Wave 1)
- [x] 03-02-PLAN.md — Adopt @minion-stack shared configs + env files in `minion_hub` (bun SvelteKit, Wave 2; adds net-new CI)
- [x] 03-03-PLAN.md — Adopt @minion-stack shared configs + env files in `minion_site` (bun SvelteKit, Wave 2; adds net-new CI)
- [x] 03-04-PLAN.md — Adopt @minion-stack shared configs + env files in `paperclip-minion` (pnpm workspace, Wave 1; targets tsconfig.base.json not root)
- [x] 03-05-PLAN.md — Adopt @minion-stack shared configs + env files in `pixel-agents` (npm, Wave 3; dual tsconfig + local ESLint plugin preserved)
- [x] 03-06-PLAN.md — Resolve ADOPT-06 for `minion_plugins` (npm; markdown+YAML catalog, Wave 3; likely D-27 deferral)

### Phase 4: Fold minion-shared
**Goal**: `minion-shared/` source is migrated into `packages/shared` as `@minion-stack/shared`, all consumers migrate off the old package name, and a deprecation shim is published.
**Depends on**: Phase 3
**Requirements**: SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05
**Success Criteria** (what must be TRUE):
  1. `packages/shared` contains the complete `minion-shared` source (SHARE-01 via directory copy — git subtree N/A, no separate git history existed)
  2. `@minion-stack/shared` is published to npm and importable via standard package install
  3. Old `minion-shared` package on npm is deprecated with a notice pointing to `@minion-stack/shared`
  4. `minion_site` imports from `@minion-stack/shared` — no references to the old package name remain (minion_hub + paperclip confirmed non-consumers)
  5. Old `minion-shared` GitHub repo archived — N/A (no separate GitHub repo existed; npm-only package)
**UI hint**: no
**Plans**: 4 plans across 4 sequential waves (each wave gates the next due to npm publish dependency)

Plans:
- [x] 04-01-PLAN.md — Create `packages/shared/` workspace package: copy source from `minion-shared/src/`, write package.json + tsconfig, build with tsc, add changeset (Wave 1)
- [x] 04-02-PLAN.md — Publish `@minion-stack/shared@0.1.0` to npm + build and publish `minion-shared@0.2.0` deprecation shim (Wave 2, 2x human-action checkpoint for 2FA)
- [x] 04-03-PLAN.md — Migrate `minion_site` off `minion-shared` to `@minion-stack/shared`: update package.json, update 3 import files, bun check, open PR on minion-site repo (Wave 3)
- [ ] 04-04-PLAN.md — Remove `minion-shared/` from .gitignore + delete directory + write phase VERIFICATION.md (Wave 4)

### Phase 5: DB Extraction
**Goal**: A single Drizzle schema source lives in `@minion/db`, both hub and site consume its types, and migration ownership cleanly transitions to the meta-repo via a staged two-step cutover.
**Depends on**: Phase 4
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07
**Success Criteria** (what must be TRUE):
  1. `packages/db/src/schema/` contains all 35+ Drizzle tables from the former `minion_hub/src/server/db/schema/`
  2. `@minion/db` is published and exports schema types plus a migration runner
  3. `minion_hub` and `minion_site` both import schema types from `@minion/db`; neither defines its own copy
  4. Only the meta-repo runs `db:push` / migrations; hub's `db:push` script is removed or points to the meta-repo
  5. Staging DB dry-run of the cutover completes with no data loss or schema drift
  6. Production deploy of both hub and site on the new schema source passes smoke tests
**UI hint**: no
**Plans**: TBD (extraction, publish, site-consume-only, hub-consume-only + dry-run, cutover)

Plans:
- [ ] 05-01: Extract Drizzle schema to `packages/db` and publish `@minion/db`
- [ ] 05-02: `minion_site` migrates to consume-only import of schema types
- [ ] 05-03: `minion_hub` migrates to consume-only while retaining migration ownership (two-step)
- [ ] 05-04: Staging DB dry-run of meta-repo-owned migrations
- [ ] 05-05: Production cutover: meta-repo takes over migrations, hub stops running db:push

### Phase 6: Auth Extraction
**Goal**: Better Auth configuration lives in `@minion/auth` as a `createAuth()` factory; hub and site consume it with identical config and shared session continuity.
**Depends on**: Phase 4
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. `packages/auth` exports a `createAuth()` factory that accepts environment-specific params
  2. `@minion/auth` is published on npm
  3. Both `minion_hub` and `minion_site` call `createAuth()` with identical secret and provider config
  4. A user logging into hub has a valid session on site (shared-session continuity works end-to-end in staging)
  5. Coordinated production deploy of hub + site passes smoke tests with no forced logouts
**UI hint**: no
**Plans**: TBD

Plans:
- [ ] 06-01: Extract Better Auth config from hub + site into `packages/auth` factory
- [ ] 06-02: Publish `@minion/auth` + update hub + site consumers (parallel subagents)
- [ ] 06-03: Staging verification of shared session continuity
- [ ] 06-04: Coordinated production deploy

### Phase 7: WS Consolidation
**Goal**: Exactly one WS/gateway client implementation exists across the platform, living in `@minion/shared`, consumed by hub, site, and paperclip's `openclaw_gateway` adapter.
**Depends on**: Phase 4
**Requirements**: WS-01, WS-02, WS-03, WS-04, WS-05
**Success Criteria** (what must be TRUE):
  1. Audit doc `specs/ws-duplication-audit.md` documents current state across hub, site, paperclip
  2. A single WS client implementation lives in `@minion/shared` and is published
  3. `minion_hub`, `minion_site`, and `paperclip-minion` all import the WS client from `@minion/shared`
  4. Grep of all consumers shows zero duplicate WebSocket class definitions or gateway-frame implementations
  5. End-to-end gateway session (paperclip agent → gateway → hub/site dashboard) works using the consolidated client
**UI hint**: no
**Plans**: TBD

Plans:
- [ ] 07-01: Audit WS/gateway duplication — produce `specs/ws-duplication-audit.md`
- [ ] 07-02: Consolidate WS client implementation into `@minion/shared`
- [ ] 07-03: Update hub + site + paperclip to consume shared client (parallel subagents)
- [ ] 07-04: E2E gateway session verification across all three consumers

### Phase 8: Polish & Automation
**Goal**: Meta-repo CI is green on every PR, changesets publishes releases automatically, `minion doctor` is polished, and a new dev can go from clone to `minion dev` in under 10 minutes.
**Depends on**: Phase 7
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05
**Success Criteria** (what must be TRUE):
  1. Meta-repo PR checks run lint-all, typecheck-all, and changesets-status; all currently green on main
  2. Merges to main automatically publish updated `@minion/*` packages with changelog entries generated from changesets
  3. `minion doctor` reports env validation, link drift, subproject git status, and CI status in a single command
  4. Root `CLAUDE.md` describes the steady-state developer workflow (not the migration narrative) and is accurate
  5. A fresh developer following `README.md` + onboarding docs can clone, check out subprojects, configure Infisical auth, and run `minion dev` in under 10 minutes (verified by timed dry-run)
**UI hint**: no
**Plans**: TBD

Plans:
- [ ] 08-01: Meta-repo CI workflows (lint, typecheck, changesets-status)
- [ ] 08-02: Changesets release automation on merge to main
- [ ] 08-03: `minion doctor` polish based on real-world M2–M7 usage feedback
- [ ] 08-04: Root CLAUDE.md rewrite for steady-state + README.md onboarding
- [ ] 08-05: Timed onboarding dry-run to verify <10-min criterion

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Clean Slate | 5/5 | Complete    | 2026-04-20 |
| 2. Foundation | 6/8 | In Progress|  |
| 3. Adopt Foundation | 6/6 | Complete    | 2026-04-21 |
| 4. Fold minion-shared | 3/4 | In Progress|  |
| 5. DB Extraction | 0/5 | Not started | - |
| 6. Auth Extraction | 0/4 | Not started | - |
| 7. WS Consolidation | 0/4 | Not started | - |
| 8. Polish & Automation | 0/5 | Not started | - |

**Coverage:** 49/49 v1 requirements mapped to phases ✓
