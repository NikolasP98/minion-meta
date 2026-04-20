# @minion-stack/cli

The `minion` command — orchestrates subprojects via `minion.json`, wraps each invocation with 6-layer env resolution via [`@minion-stack/env`](../env/README.md).

## Install

```bash
npm install -g @minion-stack/cli
# or via pnpm:
pnpm add -g @minion-stack/cli
```

## Commands

| Command                     | Description                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `minion dev <id>`           | Run subproject's `dev` command with resolved env                                          |
| `minion build <id>`         | Run subproject's `build` command                                                          |
| `minion test <id>`          | Run subproject's `test` command                                                           |
| `minion check <id>`         | Run subproject's `check` command                                                          |
| `minion run <id> <cmd...>`  | Arbitrary passthrough with env resolved                                                   |
| `minion <id> <cmd...>`      | Shorthand alias for `run`                                                                 |
| `minion dev --all`          | Parallel fanout via `concurrently` across every subproject that declares `dev`            |
| `minion build/test/check --all` | Same fanout for other commands                                                        |
| `minion status`             | Git status across all subprojects (tabular: branch, dirty, ahead, behind)                 |
| `minion doctor`             | Env validation + Infisical auth + binary availability + `@minion-stack/*` link-drift      |
| `minion sync-env <id>`      | Write merged env to `<subproject>/.env.local` (mode `0600`)                               |
| `minion rotate-env <id>`    | Delete `.env.local` and re-sync                                                           |
| `minion infisical <id>`     | Print (and try to open) the Infisical dashboard URL for that subproject's project         |
| `minion link <id>`          | `pm link --global` every `@minion-stack/*` into subproject (dev override)                 |
| `minion unlink <id>`        | Revert link state                                                                         |
| `minion list`               | Print registry as a table                                                                 |
| `minion branch <id>`        | Print current short branch (for shell prompts)                                            |

`--json` flag available on `status`, `doctor`, `list`.

## Exit codes

Per [Phase 2 context decision D9](../../.planning/phases/02-foundation/02-CONTEXT.md):

| Code | Meaning                                     |
| ---- | ------------------------------------------- |
| 0    | Success                                     |
| 1    | Generic failure (including link-drift)      |
| 2    | Config missing or invalid                   |
| 3    | Infisical auth failure                      |
| 4    | Subproject not found in registry            |

## Prerequisites

- Node 22+
- `infisical` CLI (v0.x+) installed and in `PATH`
- `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID` + `INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET` set in the shell env (or `~/.config/minion/infisical-auth.json`)
- Subproject package managers on `PATH` as declared in `minion.json` (pnpm, bun, npm — whichever the target subproject uses)

## Link-drift detection (`doctor`)

`minion doctor` scans each subproject's `node_modules/@minion-stack/*` and classifies each installation:

| State             | Meaning                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| `not-installed`   | Package not present in subproject's node_modules                               |
| `symlink-ws`      | Symlinked to this meta-repo's `packages/<pkg>` (ok — active dev workflow)      |
| `symlink-ext`     | Symlinked elsewhere (**drift** — likely stale `pnpm link --global`)            |
| `@vX.Y.Z`         | Regular install, version matches workspace (ok)                                |
| `@vX≠ws@vY`       | Regular install, version does NOT match workspace (**drift** — stale install)  |

If any subproject is in a drift state, `doctor` exits with code 1.

## License

MIT
