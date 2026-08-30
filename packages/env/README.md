# @minion-stack/env

Environment hierarchy resolver for the Minion meta-repo. Wraps the Infisical CLI; does not implement a new HTTP client.

## Install

```sh
pnpm add @minion-stack/env
# or
npm install @minion-stack/env
```

Requires Node `>= 22` and the `infisical` CLI on `$PATH` for the Infisical-backed layer (layer 2).

## API

```ts
import { resolveEnv, validateEnv } from '@minion-stack/env';

const { env, source, warnings } = await resolveEnv({ subprojectId: 'hub' });
// env: Record<string, string>  — final merged env
// source: { name, layer }[]    — names only; never values
// warnings: string[]           — missing required vars + unavailable Infisical layer
```

### `resolveEnv(opts?)`

| Option             | Type    | Purpose                                                                     |
| ------------------ | ------- | --------------------------------------------------------------------------- |
| `subprojectId`     | string  | Key in `minion.json` (e.g. `"hub"`, `"minion"`). Enables subproject layers. |
| `cwd`              | string  | Where to start searching for `minion.json`. Defaults to `process.cwd()`.    |
| `registryPath`     | string  | Explicit path to `minion.json` (overrides upward search).                   |
| `infisicalDomain`  | string  | Override the Infisical domain from `.env.defaults`.                         |
| `noCache`          | boolean | Bypass the process-lifetime Infisical memo.                                 |

### `validateEnv(env, envExamplePath)`

Returns `string[]` of warnings for variables declared in the given `.env.example` that are missing (or empty) in `env`. Returns `[]` silently if the file does not exist — validation is opt-in per consumer.

## Precedence (lowest → highest)

| #   | Layer                 | Source                                  |
| --- | --------------------- | --------------------------------------- |
| 1   | `root-defaults`       | `<metaRepo>/.env.defaults`              |
| 2   | `infisical-core`      | `MINION_SECRETS_KEY` from `minion-core` |
| 3   | `subproject-defaults` | `<subproject>/.env.defaults`            |
| 5   | `subproject-local`    | `<subproject>/.env.local` (gitignored)  |
| 6   | `process-env`         | `process.env` — wins                    |

Layers 3 and 5 apply only when `subprojectId` is supplied. Layer 4, per-subproject Infisical, is
retired. Store application secrets in the gateway's encrypted vault and access them through
`runtime.secrets.get()` or the `minion secrets` CLI. If `minion-core` still contains keys other than
`MINION_SECRETS_KEY`, `resolveEnv` reports their names in `warnings[]` so operators can migrate them.

## Infisical auth

Supply a complete Universal Auth credential pair in the process environment:

```sh
export INFISICAL_UNIVERSAL_AUTH_CLIENT_ID=...
export INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET=...
```

If the environment does not contain both values, the resolver reads
`${XDG_CONFIG_HOME:-~/.config}/minion/infisical-auth.json`:

```json
{ "clientId": "...", "clientSecret": "..." }
```

On non-Windows systems, the credential file must have mode `0600`. An incomplete environment pair
does not override a valid file. `resolveInfisicalAuth` and `minion doctor` treat a missing, malformed,
incomplete, or overly permissive file as unconfigured auth.

If the Infisical layer is unreachable because of auth, network, or response failure, `resolveEnv`
pushes a warning to `warnings[]` and continues without that layer.

## Cache

Successful Infisical fetches are memoized in the current process for five minutes. Set
`MINION_ENV_CACHE=off` or pass `noCache: true` to bypass both memo reads and writes.

`MINION_ENV_CACHE=disk` currently warns and falls back to memory because encrypted disk caching has
not shipped. On the first fetch in a process, the resolver removes a legacy plaintext
`infisical-cache.json` when it recognizes the old cache shape; this cleanup still runs when caching
is disabled.

## Security

- **Never** logs secret values. The `source[]` array contains variable names only.
- Current cache entries remain in process memory; new plaintext cache files are never written.
- Infisical stdout is captured as a buffer and parsed; it never streams to the parent stdio.

## License

MIT
