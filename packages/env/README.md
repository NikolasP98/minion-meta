# @minion-stack/env

Six-layer env hierarchy resolver for the Minion meta-repo. Wraps the Infisical CLI; does not implement a new HTTP client.

## Install

```sh
pnpm add @minion-stack/env
# or
npm install @minion-stack/env
```

Requires Node `>= 22` and the `infisical` CLI on `$PATH` for Infisical-backed layers (layers 2 and 4).

## API

```ts
import { resolveEnv, validateEnv } from '@minion-stack/env';

const { env, source, warnings } = await resolveEnv({ subprojectId: 'hub' });
// env: Record<string, string>  — final merged env
// source: { name, layer }[]    — names only; never values
// warnings: string[]           — missing required vars + unavailable Infisical layers
```

### `resolveEnv(opts?)`

| Option             | Type    | Purpose                                                                     |
| ------------------ | ------- | --------------------------------------------------------------------------- |
| `subprojectId`     | string  | Key in `minion.json` (e.g. `"hub"`, `"minion"`). Enables subproject layers. |
| `cwd`              | string  | Where to start searching for `minion.json`. Defaults to `process.cwd()`.    |
| `registryPath`     | string  | Explicit path to `minion.json` (overrides upward search).                   |
| `infisicalDomain`  | string  | Override the Infisical domain from `.env.defaults`.                         |
| `noCache`          | boolean | Bypass the on-disk Infisical cache.                                         |

### `validateEnv(env, envExamplePath)`

Returns `string[]` of warnings for variables declared in the given `.env.example` that are missing (or empty) in `env`. Returns `[]` silently if the file does not exist — validation is opt-in per consumer.

## Precedence (lowest → highest)

| #   | Layer                   | Source                                |
| --- | ----------------------- | ------------------------------------- |
| 1   | `root-defaults`         | `<metaRepo>/.env.defaults`            |
| 2   | `infisical-core`        | Infisical project `minion-core`       |
| 3   | `subproject-defaults`   | `<subproject>/.env.defaults`          |
| 4   | `infisical-subproject`  | Infisical project `minion-<name>`     |
| 5   | `subproject-local`      | `<subproject>/.env.local` (gitignored) |
| 6   | `process-env`           | `process.env` — wins                  |

Layers 3–5 only apply when `subprojectId` is supplied.

## Infisical auth

The `infisical` CLI reads Universal Auth credentials from the shell:

```sh
export INFISICAL_UNIVERSAL_AUTH_CLIENT_ID=...
export INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET=...
```

If either Infisical layer is unreachable (auth failure, network error, empty response), `resolveEnv` pushes a warning to `warnings[]` and continues — the layer is skipped, not fatal.

## Cache

Successful Infisical fetches are cached at `$XDG_CONFIG_HOME/minion/infisical-cache.json` (falls back to `~/.config/minion/infisical-cache.json`) with mode `0600` and a 5-minute TTL. Pass `noCache: true` to bypass both read and write.

## Security

- **Never** logs secret values. The `source[]` array contains variable names only.
- The cache file is created with mode `0600` (user-only read/write).
- The cache directory is created with mode `0700`.
- Infisical stdout is captured as a buffer and parsed; it never streams to the parent stdio.

## License

MIT
