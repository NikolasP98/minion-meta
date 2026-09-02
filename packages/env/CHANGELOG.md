# @minion-stack/env

## 1.2.0

### Minor Changes

- 790c983: Replace the legacy plaintext Infisical cache with a machine-sealed cross-process cache. Disk mode is
  now the default; `memory` keeps values in the process only, and `off` disables caching. The first run
  removes a recognized legacy plaintext cache instead of migrating it. If that file may have been
  backed up or synced, rotate `MINION_SECRETS_KEY`.

## 1.1.1

### Patch Changes

- 3409ffc: Propagate package-manager link failures, include the Infisical binary in doctor health, and support the documented mode-0600 Universal Auth credential file.

## 1.1.0

### Minor Changes

- 3cc0c64: Dedupe `findMetaRoot` into `@minion-stack/env` (it owns `minion.json` resolution) and re-export it from `@minion-stack/cli`. `env` now exports `findMetaRoot`; `cli` drops its byte-for-byte copy. The published `cli` requires this `env` version — keep them released together.

## 1.0.0

### Major Changes

- 13ee5a7: breaking: Infisical is now consulted only for `MINION_SECRETS_KEY` from the `minion-core` project. All other secrets — including per-subproject keys — now live in the gateway's encrypted local vault and are accessed via `runtime.secrets.get()` at gateway runtime, or via the `minion secrets` CLI offline. Subproject Infisical projects (`minion-hub`, `minion-paperclip`, etc.) are deprecated.

  Migration: run `minion secrets import-static` on each gateway host to copy env-resident secrets into the vault, then remove them from Infisical. The resolver will emit a warning listing any keys still in `minion-core` outside the narrowed set.

## 0.1.0

### Minor Changes

- Initial release — six-layer env hierarchy resolver wrapping the Infisical CLI. Absorbs the logic of `infisical-dev.sh`: root `.env.defaults` → Infisical `minion-core` → subproject `.env.defaults` → Infisical `minion-<name>` → subproject `.env.local` → `process.env`. Ships `resolveEnv()`, `validateEnv()`, `parseDotenv()`, and typed interfaces. Never logs secret values; only variable names appear in `source[]`. Cache at `$XDG_CONFIG_HOME/minion/infisical-cache.json` (mode 0600, 5-min TTL).
