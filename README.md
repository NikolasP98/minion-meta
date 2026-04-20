# Minion Meta-Repo

Orchestration tooling, shared packages, and specs for the Minion personal AI assistant platform.

This is a **meta-repo** — a root git repo that owns the `minion` CLI, shared `@minion-stack/*` npm packages, and cross-cutting specs. It wraps 7 independent subprojects (each with its own remote, branch, package manager, and deploy pipeline) via a registry at `minion.json`.

Design spec: [`specs/2026-04-19-minion-meta-repo-design.md`](specs/2026-04-19-minion-meta-repo-design.md).

## Prerequisites

- Node 22+
- pnpm 10+
- Bun (latest) — for SvelteKit subprojects
- `gh` CLI — for GitHub ops
- `infisical` CLI (≥0.33) — for secrets
- Git

## Quickstart

```bash
# 1. Clone the meta-repo
git clone git@github.com:NikolasP98/minion-meta.git AI
cd AI

# 2. Install meta-repo tooling
pnpm install

# 3. Install the `minion` CLI globally
npm install -g @minion-stack/cli

# 4. Configure Infisical Universal Auth (once, per machine)
export INFISICAL_UNIVERSAL_AUTH_CLIENT_ID="..."        # from dashboard
export INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET="..."
# Or persist to ~/.config/minion/infisical-auth.json (mode 0600).

# 5. See registered subprojects
minion list

# 6. Clone any subproject(s) you want to work on
#    (subprojects are independent repos and are NOT checked out by default)
git clone git@github.com:NikolasP98/minion-ai.git minion
git clone git@github.com:NikolasP98/minion_hub.git minion_hub
# ...or any subset

# 7. Health check
minion doctor

# 8. Run a subproject's dev command with resolved env
minion dev hub
```

## Commands

Full surface:

```
minion dev <id>                 # env-wrapped dev command
minion build <id>
minion test <id>
minion check <id>
minion run <id> <cmd...>        # arbitrary passthrough
minion <id> <cmd...>            # alias for run
minion dev --all                # parallel fanout
minion check --all              # parallel check
minion status                   # git status across all subprojects
minion doctor                   # env validation + health
minion sync-env <id>            # write merged env to <sub>/.env.local
minion rotate-env <id>          # wipe + re-pull .env.local
minion infisical <id>           # open Infisical dashboard URL
minion link <id>                # npm link @minion-stack/* into subproject (dev override)
minion unlink <id>               # revert
minion list                     # print registry (also --json)
minion branch <id>               # print current branch
```

Exit codes: 0 success, 1 generic, 2 config, 3 infisical auth, 4 subproject not found.

## Env hierarchy

Six layers, lowest → highest precedence:

1. `AI/.env.defaults` — shared non-secret defaults (committed)
2. Infisical project `minion-core` — shared secrets
3. `<subproject>/.env.defaults` — per-subproject non-secret defaults (committed in each subproject)
4. Infisical project `minion-<name>` — per-subproject secrets
5. `<subproject>/.env.local` — gitignored dev escape hatch
6. Shell env (`process.env`) — wins

Secrets never appear in committed files. `.env.defaults` is non-secret-only.

## Subproject registry (`minion.json`)

Each subproject declares: path, package manager, branch, Infisical project, git remote, primary commands.

Edit `minion.json` to add or reconfigure a subproject. Validation schema: [`packages/cli/minion.schema.json`](packages/cli/minion.schema.json).

## Shared packages

Published to npm under `@minion-stack/*` with Changesets for independent versioning.

| Package | Version | Description |
|---------|---------|-------------|
| [`@minion-stack/cli`](packages/cli/) | 0.1.0 | The `minion` CLI |
| [`@minion-stack/env`](packages/env/) | 0.1.0 | 6-layer env resolver |
| [`@minion-stack/tsconfig`](packages/tsconfig/) | 0.1.0 | TS configs (base/node/svelte/library) |
| [`@minion-stack/lint-config`](packages/lint-config/) | 0.1.0 | oxlint + ESLint + Prettier presets |

Future: `@minion-stack/shared`, `@minion-stack/db`, `@minion-stack/auth` (Phases 4–6).

## Subprojects

Each has its own repository + README. See their own CLAUDE.md / AGENTS.md for project-specific guidance.

| Dir | Repo |
|---|---|
| `minion/` | [NikolasP98/minion-ai](https://github.com/NikolasP98/minion-ai) — Gateway + CLI |
| `minion_hub/` | [NikolasP98/minion_hub](https://github.com/NikolasP98/minion_hub) — Dashboard |
| `minion_site/` | [NikolasP98/minion-site](https://github.com/NikolasP98/minion-site) — Marketing + members |
| `paperclip-minion/` | [NikolasP98/paperclip](https://github.com/NikolasP98/paperclip) — Agent control plane |
| `minion_plugins/` | [NikolasP98/minion_plugins](https://github.com/NikolasP98/minion_plugins) — Marketplace |
| `pixel-agents/` | [pablodelucca/pixel-agents](https://github.com/pablodelucca/pixel-agents) — VS Code pixel office |
| `minion-shared/` | (to be folded into `packages/shared` in Phase 4) |

## Contributing

1. Edit in `packages/*`, commit on a feature branch in this repo
2. Run `pnpm changeset` to add a release note for any `@minion-stack/*` package change
3. Open a PR against `main` — CI runs lint + type-check + `changeset status` (Phase 8 POLISH-01)
4. Merge to main triggers `changeset publish` (Phase 8 POLISH-02)

Until Phase 8 ships, release is manual: `pnpm exec changeset version && pnpm exec changeset publish`.

## Links

- Design spec: [`specs/2026-04-19-minion-meta-repo-design.md`](specs/2026-04-19-minion-meta-repo-design.md)
- Roadmap: [`.planning/ROADMAP.md`](.planning/ROADMAP.md)
- Requirements: [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md)
- Root orchestrator doc: [`CLAUDE.md`](CLAUDE.md)
