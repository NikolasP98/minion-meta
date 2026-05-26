# @minion-stack/env

## 1.0.0

### Major Changes

- 13ee5a7: breaking: Infisical is now consulted only for `MINION_SECRETS_KEY` from the `minion-core` project. All other secrets — including per-subproject keys — now live in the gateway's encrypted local vault and are accessed via `runtime.secrets.get()` at gateway runtime, or via the `minion secrets` CLI offline. Subproject Infisical projects (`minion-hub`, `minion-paperclip`, etc.) are deprecated.

  Migration: run `minion secrets import-static` on each gateway host to copy env-resident secrets into the vault, then remove them from Infisical. The resolver will emit a warning listing any keys still in `minion-core` outside the narrowed set.

## 0.1.0

### Minor Changes

- Initial release — six-layer env hierarchy resolver wrapping the Infisical CLI. Absorbs the logic of `infisical-dev.sh`: root `.env.defaults` → Infisical `minion-core` → subproject `.env.defaults` → Infisical `minion-<name>` → subproject `.env.local` → `process.env`. Ships `resolveEnv()`, `validateEnv()`, `parseDotenv()`, and typed interfaces. Never logs secret values; only variable names appear in `source[]`. Cache at `$XDG_CONFIG_HOME/minion/infisical-cache.json` (mode 0600, 5-min TTL).
