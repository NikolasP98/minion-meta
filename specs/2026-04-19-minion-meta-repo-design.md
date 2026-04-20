# Minion Meta-Repo — Design Spec

**Date:** 2026-04-19
**Status:** Approved for planning (awaiting transition to GSD)
**Author:** Nikolas + Claude (brainstorming)

---

## Summary

Transform `/home/nikolas/Documents/CODE/AI/` from a loose collection of sibling subprojects into a **meta-repo** with:

1. A root-level git repo (`NikolasP98/minion-meta`) that owns orchestration tooling, shared configs, shared npm packages, and specs.
2. A hierarchical env & secrets system backed by Infisical, with per-subproject resolution via a `minion` CLI.
3. Aggressive extraction of cross-project code into shared `@minion/*` packages — including DB schema, Better Auth config, and gateway protocol/WS client code.
4. Uniform standardization: every shared package follows the same model (`packages/*` in meta-repo, `@minion/*` scope, changesets versioning). No exceptions.

Subprojects remain independent git repos with their own remotes, branches, package managers, and deploy pipelines. The meta-repo never touches their `.git/`.

---

## Context & motivation

The `AI/` directory today contains 8 sibling subprojects (`minion/`, `minion_hub/`, `minion_site/`, `minion-shared/`, `minion_plugins/`, `paperclip-minion/`, `pixel-agents/`, `ai-studio/` + `docs/` as symlinks) each with its own package manager (pnpm / bun / npm), branch (DEV / dev / master / minion-integration / main), and deployment target. There is no root-level orchestration beyond an ad-hoc `infisical-dev.sh` and a root `.env`.

Pain points driving this work:
- Env/secrets sprawl: multiple Infisical projects with inconsistent naming and overlapping scopes.
- No single command to run/test/check across subprojects.
- Repeated configuration (tsconfig, lint, env handling) across every subproject.
- Shared code (WS client, DB schema, auth config) duplicated between hub, site, and paperclip rather than extracted.
- No clean place to store cross-cutting specs or designs.

The user's verbatim ask: "shared env vars using infisical, hierarchical configs, global and per-project configs/env vars. Think about building monorepo scripts and standardizing the monorepo where possible, such as use of supporting packages like `@minion_plugins/` or `@minion-shared/` (feel free to abstract more logic into these repos)."

---

## Decisions

### D1. Meta-repo, not true monorepo

Chosen: **Option A — meta-repo / umbrella.** Root becomes its own git repo. Subprojects stay independent.

Rejected:
- pnpm workspace hybrid — makes bun-based subprojects (hub, site) second-class citizens and changes the release story for `@nikolasp98/minion`.
- True monorepo — breaks independent versioning, invalidates per-project CLAUDE.md conventions, forces a one-way migration. Rewrites every deploy pipeline.

Why: subprojects have baked-in constraints — published npm packages, independent branches, separate deploy targets, different stacks — that make forced consolidation a net loss.

### D2. Root-level branding is "minion"

All root-level tooling is branded "minion" (not "OpenClaw"). Applies to:
- CLI wrapper name: `minion`
- Root package name: `@minion/root` (private)
- Infisical project names: `minion-core`, `minion-<project>`
- Shared package scope: `@minion/*`

Captured in memory: `feedback_root_branding_minion.md`.

### D3. Aggressive shared-package extraction

Chosen: **Option C — aggressive.** Extract DB schema, Better Auth config, WS/gateway client code, plus table-stakes configs (tsconfig, lint, env).

Rejected: minimal or moderate extraction — leaves existing duplication in place and creates ambiguity about what's "supposed" to be shared.

Why: the user's explicit direction was "all-in on the standardization and abstraction layers." Every piece of cross-cutting code follows the same model.

### D4. Root is a git repo, subprojects stay independent

Chosen: **Option A** from the git-model decision. Meta-repo tracks only its own tooling/configs/specs. Subprojects are listed in root `.gitignore` — they remain their own repos with their own remotes.

Rejected: git submodules (known pain point, fights independent-deploy model) and "tooling in a new subproject directory" (asymmetric and awkward for cross-cutting packages).

### D5. Per-subproject `.env.defaults` + `.env.example`

Each subproject owns its own `.env.defaults` (committed, non-secret) and `.env.example` (documents required secret var names). Meta-repo owns only the resolution layer (`@minion/env`, `minion` CLI) and root-level shared defaults.

Why:
- Subprojects stay self-contained and runnable standalone (matches the independent-repo model).
- Defaults evolve with the code that reads them (same PR).
- Meta-repo still gets its single-view for `minion doctor` by parsing each subproject's `.env.example`.

### D6. `minion-shared` folded into meta-repo

The existing standalone `minion-shared/` repo is merged into `packages/shared/` in the meta-repo, renamed to `@minion/shared`. Old repo archived. Final release of the old npm package name ships as a re-export shim and is deprecated.

Why: keeping one package outside the standardization model creates a permanent exception that erodes consistency over time.

### D7. Publishing via npm under `@minion/*` scope

All shared packages publish to npm under a new `@minion/*` scope. Subprojects consume via normal `npm install`. Dev-time override via `minion link <project>` uses `npm link` to point at local `packages/*`.

Why: matches how subprojects already consume dependencies. No special-case tooling needed.

### D8. Orchestration via `concurrently`, not Turborepo

Subprojects build into their own `dist/` independently and don't share a task graph worth modeling. `concurrently` is sufficient for parallel fan-out (`minion dev --all`).

---

## Architecture

### Root layout

```
AI/                              ← meta-repo (this git repo, ignores subprojects)
├── package.json                 ← pnpm workspace root, private
├── pnpm-workspace.yaml          ← includes only packages/*
├── .env.defaults                ← committed, shared non-secret defaults
├── .env.example                 ← documents root secret var names
├── .gitignore                   ← ignores all subproject directories
├── CLAUDE.md                    ← root orchestrator doc (exists)
├── README.md                    ← meta-repo onboarding
├── minion.json                  ← subproject registry (paths, remotes, branches, pkg manager)
├── .changeset/                  ← changesets release tooling
├── packages/
│   ├── cli/                     → @minion/cli (the `minion` bin)
│   ├── env/                     → @minion/env (Infisical + .env hierarchy loader)
│   ├── tsconfig/                → @minion/tsconfig (base/node/svelte/library variants)
│   ├── lint-config/             → @minion/lint-config (oxlint + eslint + prettier presets)
│   ├── shared/                  → @minion/shared (absorbs minion-shared/, WS client)
│   ├── db/                      → @minion/db (shared Drizzle schema, hub+site)
│   └── auth/                    → @minion/auth (shared Better Auth factory)
├── specs/                       ← design docs (this file lives here)
│
├── minion/                      (gitignored, independent repo, branch: DEV)
├── minion_hub/                  (gitignored, branch: dev)
├── minion_site/                 (gitignored, branch: master)
├── minion_plugins/              (gitignored, branch: main)
├── paperclip-minion/            (gitignored, branch: minion-integration)
├── pixel-agents/                (gitignored, branch: main)
├── docs/  → VAULT/MINION/project       (symlink, gitignored)
└── ai-studio/  → VAULT/MINION/strategy (symlink, gitignored)
```

Note: `minion-shared/` is removed from this list — it gets folded into `packages/shared/` during M3.

### Env & secrets hierarchy

Lookup order (later overrides earlier):

1. `AI/.env.defaults` — committed, non-secret
2. Infisical project `minion-core` — shared secrets (Anthropic, OpenRouter, GitHub PAT, Tailscale, Resend, B2, PostHog)
3. `<subproject>/.env.defaults` — committed, non-secret, per-subproject
4. Infisical project `minion-<name>` — per-subproject secrets
5. `<subproject>/.env.local` — gitignored dev escape hatch
6. Shell environment — wins

`@minion/env` handles resolution. The `minion` CLI calls it before executing any command. Subprojects' native commands (`bun run dev`, `pnpm dev`) continue to work standalone; they just won't see the shared layer and will error loudly if a required secret is missing.

### Infisical project names

| Name | Status | Purpose |
|---|---|---|
| `minion-core` | new | Secrets shared across all subprojects |
| `minion-gateway-prod` | existing, kept | Gateway production secrets |
| `minion-gateway` | new | Gateway dev-side secrets (split from prod) |
| `minion-paperclip` | rename of `paperclip` | Paperclip dev secrets |
| `minion-hub` | new, placeholder | Hub-specific secrets (mostly empty initially) |
| `minion-site` | new, placeholder | Site-specific secrets |
| `minion-plugins` | new, placeholder | Reserved for marketplace plugin secrets |
| `minion-pixel-agents` | new, placeholder | Reserved for pixel-agents secrets |

Rename cascade touches: `infisical-dev.sh`, Netcup systemd units, docker-compose files, CI workflows, memory entries (`reference_infisical_setup.md`, `project_paperclip_netcup_deployment.md`, `project_paperclip_infisical_integration.md`, `project_twilio_voice_call_secrets.md`, `reference_voice_call_deployment.md`, `reference_paperclip_gateway_access.md`). M0 includes a grep inventory; rename happens in a dedicated phase in M1.

### The `minion` CLI

Single entry point at `@minion/cli` (`bin: minion`). Subproject registry (`minion.json` at meta-repo root) declares each subproject's directory, package manager, branch, primary commands, Infisical project, and git remote.

Command surface:

```
minion dev <project>                 # env-wrapped dev command
minion build <project>
minion test <project>
minion check <project>               # lint + typecheck
minion run <project> <cmd...>        # arbitrary passthrough
minion <project> <cmd...>            # alias for run

minion dev --all                     # parallel fan-out via concurrently
minion check --all                   # parallel check (CI entry)

minion status                        # git status + branch + dirty across all subprojects
minion doctor                        # env validation across all subprojects
minion sync-env <project>            # write merged env to <project>/.env.local
minion rotate-env <project>          # wipe+re-pull .env.local
minion infisical <project>           # open Infisical dashboard

minion link <project>                # npm link all @minion/* into subproject (dev override)
minion unlink <project>              # revert

minion list                          # print subproject registry
minion branch <project>              # print current branch
```

### Shared packages

| Package | Source | Consumers | Risk | Notes |
|---|---|---|---|---|
| `@minion/cli` | new | humans | low | The `minion` bin. Driven by `minion.json` registry. |
| `@minion/env` | absorbs `infisical-dev.sh` | `@minion/cli` runtime + optional programmatic | low | Infisical machine-identity auth, `.env.*` parser/merger, validator |
| `@minion/tsconfig` | new | all TS subprojects | low | Variants: `base`, `node`, `svelte`, `library` |
| `@minion/lint-config` | new | all subprojects | low | Per-tool: oxlint preset, flat eslint config, prettier config |
| `@minion/shared` | absorbs `minion-shared/` + hub/site WS duplication | hub, site, paperclip (`openclaw_gateway` adapter) | medium | Full WS client, gateway frame helpers, session utilities |
| `@minion/db` | extracts `minion_hub/src/server/db/schema/` | hub, site | **high** | 35+ Drizzle tables. Meta-repo owns migrations; hub+site consume types only |
| `@minion/auth` | extracts `minion_hub/src/lib/auth/` + `minion_site/src/lib/auth/` | hub, site | medium | Better Auth `createAuth()` factory |

**Publishing:** npm public under `@minion/*` scope (new npm org). Changesets for versioning. Independent semver per package. CI publishes on merge to main.

**Dev override:** `minion link <project>` runs `npm link` / `pnpm link --global` to point at local `packages/*`. `minion doctor` reports link state.

**Ownership rule:** cross-cutting schema/auth is owned by the meta-repo. Subprojects become consumers, not owners. Hub+site stop running their own `db:push` — schema changes require a meta-repo PR.

---

## Phased rollout

Each milestone is independently shippable. GSD will plan phases within each milestone.

### M0 — Clean slate (first priority)

Establish known-clean state across every subproject before building on top.

- **0.1 Audit & inventory.** `minion status`-style prototype script walks each subproject, reports branch / ahead-behind / uncommitted / untracked / worktrees / open PRs / broken upstream. Produces `specs/clean-slate-inventory.md` for user review before mutations.
- **0.2 Resolve uncommitted & worktrees.** Per item, one of: commit, stash (named), discard (explicit approval). Targets: `docs/` restructure, `paperclip-pi-fallback/`, `paperclip-meta-repair/`, any dirty trees.
- **0.3 PR triage sweep.** Every open PR across `minion-ai`, `minion-hub`, `minion-site`, `minion-shared`, `minion-plugins`, paperclip fork, `pixel-agents`. Classify merge / close / rebase / hold. Ship first two classes, note the rest.
- **0.4 Root cleanup.** One-time research artifacts (`A3_*.md`, `RETENTION_*.md`, `KPI_*.md`, `00_START_HERE.md`, etc.) move to `ai-studio/` or delete after review.
- **0.5 Fix broken tracking.** `minion_plugins/` main → origin/master [gone]; any other broken upstreams.

Exit: every subproject `git status` clean, every main/dev/master tracks valid upstream, no stray worktrees, PR list resolved or explicitly held.

### M1 — Foundation

Stand up the meta-repo and foundational shared packages. No subproject touching.

- Root git init, new `NikolasP98/minion-meta` remote, first commit.
- Root `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `minion.json` registry, `.changeset/` config.
- Register new npm org `@minion/*`.
- Ship `@minion/tsconfig`, `@minion/lint-config`.
- Ship `@minion/env` with Infisical hierarchy + `.env.*` parser.
- Ship `@minion/cli` with the core commands (dev/build/test/check/status/doctor/sync-env/link).
- Migrate `infisical-dev.sh` logic into `@minion/env`; old script deprecated.
- **Dedicated phase: Infisical project renames** + cascade updates to scripts, systemd units, docker-compose, memory entries.
- Root `CLAUDE.md` updated; meta-repo onboarding `README.md`.

Exit: `minion dev <any-project>` works end-to-end with merged env resolution.

### M2 — Adopt foundation in subprojects

One phase per subproject (6 phases). Each ships a PR against the subproject's own branch.

For each: add `.env.defaults` + `.env.example`, extend `@minion/tsconfig` base, adopt `@minion/lint-config`, verify `minion dev <name>` continues to work.

Phases: minion, minion_hub, minion_site, paperclip-minion, pixel-agents, minion_plugins, (minion-shared is handled separately in M3).

Exit: every subproject uses shared configs; each subproject's own CI passes.

### M3 — Fold `minion-shared` → `@minion/shared`

- Import `minion-shared/` history into `packages/shared/` via `git subtree add` (preserves commits).
- First `@minion/shared` release on npm.
- Re-export shim published under old package name, deprecated.
- Update imports in hub, site, paperclip (one PR each, parallel subagents).
- Archive old `minion-shared` repo.

Exit: all consumers on `@minion/shared`; old package deprecated.

### M4 — `@minion/db` extraction

Highest-risk milestone.

- Move `minion_hub/src/server/db/schema/` to `packages/db/src/schema/`.
- Publish first `@minion/db` release.
- Hub migration ownership stays temporarily; site shifts to consume-only (imports types from `@minion/db`).
- Staging DB dry-run of cutover.
- Final cutover: meta-repo takes migration ownership; hub stops running `db:push`.
- Drizzle config updated in hub + site.

Exit: single schema source; hub+site both import from `@minion/db`; migrations only run from meta-repo.

### M5 — `@minion/auth` extraction

- Extract Better Auth config into `packages/auth` as `createAuth()` factory.
- Hub + site import factory, config flows via params.
- Secret rotation plan if needed.
- Staging deploy with force-logout plan ready.
- Coordinated hub + site deploy.

Exit: auth changes require only a meta-repo PR; hub+site consume shared factory.

### M6 — WS/gateway consolidation

- Audit WS client duplication across hub, site, paperclip (`openclaw_gateway` adapter).
- Consolidate into `@minion/shared`.
- Update all consumers (parallel subagents).

Exit: one WS client implementation; paperclip adapter imports from `@minion/shared`.

### M7 — Polish & automation

- Meta-repo CI: changesets release automation, `lint-all`, `typecheck-all`, status checks.
- Developer onboarding docs (root README, per-milestone migration notes).
- `minion doctor` polish based on real-world usage.
- Root CLAUDE.md final rewrite reflecting new workflow.
- Close out the program.

Exit: new developer can clone meta-repo + subprojects and be productive in <10 min.

---

## Subagent plan

Locked into GSD phase plans.

- **M0.1 audit** — 7 parallel `Explore` subagents, one per subproject. Each returns a ≤200-word state report. Orchestrator aggregates. Uses `superpowers:dispatching-parallel-agents`.
- **M0.3 PR triage** — 7 parallel `general-purpose` subagents. Each classifies PRs in one repo. Orchestrator reviews with user before actions.
- **M1 foundation** — mostly main-thread work. `feature-dev:code-reviewer` gates each package release.
- **M2 adoption** — one subagent per subproject (6 total), dispatched sequentially to avoid concurrent edits to shared package consumers. Each opens a PR against that subproject's repo.
- **M3 fold-in** — main-thread git history merge; parallel subagents for per-consumer import updates.
- **M4 DB extraction** — subagent for extraction (single-repo); **sequential** rollout hub→verify→site→verify. Not parallelized (migration risk).
- **M5 auth extraction** — subagent for extraction; parallel subagents for hub+site updates once shared package is published.
- **M6 WS consolidation** — parallel subagents per consumer.
- **Per-milestone gates** — `gsd-verifier` + `gsd-integration-checker` confirm exit criteria.
- **Code review** — `feature-dev:code-reviewer` or `superpowers:requesting-code-review` before each milestone close.

---

## Risks & mitigations

1. **Cross-repo merge ordering (M3–M6).** Each cross-cutting milestone includes a release-order runbook. Consumer updates gate on shared package being available on npm.
2. **DB migration ownership transition (M4).** Two-step: hub keeps ownership while site moves to consume-only; then meta-repo takes over with staging dry-run.
3. **Better Auth session continuity (M5).** Adopt shared package in staging first; coordinated deploy; force-logout plan ready.
4. **Infisical rename cascade.** M0 greps for every old project name reference. Rename happens behind transitional aliases where possible.
5. **`@minion/*` npm org.** Register as first task of M1 — potential blocker if delayed.
6. **Flaky existing CI.** `minion-ai` has known flakes. M0 stabilizes where necessary before adoption PRs land.
7. **`npm link` drift.** `minion doctor` + `minion status` surface link state.
8. **Subproject self-containment regression.** Each subproject's own CI must pass against published npm versions — per-milestone exit criterion.
9. **Changeset adoption friction.** CI enforces presence of changeset files on PRs touching shared packages.
10. **Meta-repo as bottleneck.** Fast, automated release via changesets on merge to main.

---

## Out of scope

- Turborepo / Nx adoption (plain `concurrently` suffices).
- Unifying package managers across subprojects (bun stays for SvelteKit, pnpm for pnpm-based).
- Moving subproject source into meta-repo git history (they stay independent).
- `ai-studio/`, `docs/`, VAULT symlink restructuring (separate concern; `project_vault_minion_doc_structure.md`).
- `omnisearch/` and other Netcup-only deployments not dev-facing.
- `pixel-agents` VS Code extension packaging changes (only tsconfig/lint in scope).
- Agent registry (`docs/agents/`) reorganization (already in progress; `project_docs_restructure_pending.md`).
- 3CX, Tailscale, Netcup VPS infrastructure changes.

---

## Open questions / next steps

- Confirm npm org name (`@minion` vs alternative if taken).
- Confirm git remote name (`NikolasP98/minion-meta` vs alternative).
- Decide whether `pixel-agents` and `minion_plugins` adopt shared configs in M2 or stay lightweight (deferred to phase planning).

Next step: transition to `/gsd-new-project` with this spec as the input. GSD will create PROJECT.md, generate the roadmap with M0–M7 as milestones, and plan/execute each milestone's phases.

---

## References

Memory entries consulted or impacted:
- `feedback_root_branding_minion.md`
- `project_minion_meta_repo_design.md`
- `project_minion_plugins_broken_tracking.md`
- `project_docs_restructure_pending.md`
- `project_pr_review_sweep_apr11.md`, `project_pr_review_sweep_apr17.md`
- `project_minion_ai_ci_patterns.md`
- `reference_infisical_setup.md`
- `project_paperclip_infisical_integration.md`
- `project_twilio_voice_call_secrets.md`
- `reference_voice_call_deployment.md`
- `reference_paperclip_gateway_access.md`
- `feedback_env_vars_infisical.md`
- `feedback_infisical_secrets_set_not_silent.md`
- `reference_minion_ai_repo.md`
- `reference_github_repo_names.md`
- `reference_paperclip_fork.md`
- `feedback_always_use_subscription.md`
