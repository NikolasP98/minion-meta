# @minion-stack/env

## 0.1.0

### Minor Changes

- Initial release — six-layer env hierarchy resolver wrapping the Infisical CLI. Absorbs the logic of `infisical-dev.sh`: root `.env.defaults` → Infisical `minion-core` → subproject `.env.defaults` → Infisical `minion-<name>` → subproject `.env.local` → `process.env`. Ships `resolveEnv()`, `validateEnv()`, `parseDotenv()`, and typed interfaces. Never logs secret values; only variable names appear in `source[]`. Cache at `$XDG_CONFIG_HOME/minion/infisical-cache.json` (mode 0600, 5-min TTL).
