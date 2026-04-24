# @minion-stack/cli

## 0.1.1

### Patch Changes

- 6683570: `minion doctor`: extend link-drift scanning to include `@minion-stack/shared`, `@minion-stack/db`, `@minion-stack/auth` (previously only covered `tsconfig`, `lint-config`, `env`, `cli`). Add per-subproject git status column. Handle missing (not-cloned) subprojects gracefully instead of surfacing auth-style errors.

## 0.1.0

### Minor Changes

- Initial release — the `minion` bin.
  - 15 subcommands per FOUND-07: dev / build / test / check / run / status / doctor / sync-env / rotate-env / infisical / link / unlink / list / branch, plus `--all` fanout and the `minion <id> <cmd...>` shorthand alias.
  - Env resolution delegated to `@minion-stack/env` (6-layer hierarchy).
  - `doctor` detects `@minion-stack/*` link-drift across every subproject in `minion.json`.
  - Exit codes per D9: 0 success, 1 generic, 2 config, 3 infisical-auth, 4 subproject-not-found.
