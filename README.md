# Minion Meta-Repo

Orchestration tooling, shared packages, and specs for the Minion personal AI assistant platform.

This is a **meta-repo** — a root git repo that owns the `minion` CLI, shared `@minion-stack/*` npm packages, and cross-cutting specs. The CLI registers six independent subprojects, each with its own remote, branch, package manager, and deploy pipeline.

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

## CI & Releases

Pushes and pull requests to `dev` and `main` are gated by
[`.github/workflows/ci.yml`](.github/workflows/ci.yml), which owns the exact gate sequence.

Releases are automated via `.github/workflows/release.yml` (changesets/action):

1. Land feature PRs, including staged `.changeset/*.md` files, through `dev`.
2. Promote reviewed `dev` changes to `main`.
3. A push to `main` opens a "Version Packages" PR when changesets are present.
4. Merging that PR publishes `@minion-stack/*` packages to npm.

One-time setup: see [`.planning/phases/08-polish-automation/NPM_TOKEN-SETUP.md`](.planning/phases/08-polish-automation/NPM_TOKEN-SETUP.md) for `NPM_TOKEN` + Actions permissions.

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
minion doctor                   # env validation + Infisical auth + link drift + git status + clone-presence — one table
minion sync-env <id>            # write merged env to <sub>/.env.local
minion rotate-env <id>          # wipe + re-pull .env.local
minion infisical <id>           # open Infisical dashboard URL
minion link <id>                # package-manager link @minion-stack/* into subproject
minion unlink <id>               # revert
minion list                     # print registry (also --json)
minion branch <id>               # print current branch
```

Exit codes: 0 success, 1 generic, 2 config, 3 infisical auth, 4 subproject not found.

## Env hierarchy

[`@minion-stack/env`](packages/env/README.md) owns the current precedence,
secret-location, authentication, and cache contracts.

## Repository policy and CLI registry

[`repo-policy.yaml`](repo-policy.yaml) owns fleet-wide paths, package managers, branch roles, PR bases,
remotes, and commands. `minion.json` is the CLI registry and carries its CLI-only Infisical metadata.
Follow the generated-projection workflow in [`AGENTS.md`](AGENTS.md#project-map); validate the CLI
shape with [`packages/cli/minion.schema.json`](packages/cli/minion.schema.json).

## Shared packages

Published to npm under `@minion-stack/*` with Changesets for independent versioning.

| Package | Description |
|---------|-------------|
| [`@minion-stack/cli`](packages/cli/) | The `minion` CLI |
| [`@minion-stack/env`](packages/env/) | Environment hierarchy resolver |
| [`@minion-stack/tsconfig`](packages/tsconfig/) | TS configs (base/node/svelte/library) |
| [`@minion-stack/lint-config`](packages/lint-config/) | oxlint + ESLint + Prettier presets |
| [`@minion-stack/shared`](packages/shared/) | Gateway protocol types, WS clients, utilities, and the versioned brain-vector contract |
| [`@minion-stack/db`](packages/db/) | Canonical Drizzle schema (38 tables) + migration runner |
| [`@minion-stack/auth`](packages/auth/) | Better Auth `createAuth()` factory |

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
| `packages/shared/` | See [`@minion-stack/shared`](#shared-packages) above |

## Contributing

1. Edit in `packages/*`, commit on a feature branch in this repo
2. Run `pnpm changeset` to add a release note for any `@minion-stack/*` package change
3. Open a PR against `dev`; the repository workflow owns the required CI gates
4. Follow [CI & Releases](#ci--releases) to promote reviewed changes and publish packages

## Links

- Design spec: [`specs/2026-04-19-minion-meta-repo-design.md`](specs/2026-04-19-minion-meta-repo-design.md)
- Roadmap: [`.planning/ROADMAP.md`](.planning/ROADMAP.md)
- Requirements: [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md)
- Root orchestrator doc: [`CLAUDE.md`](CLAUDE.md)
