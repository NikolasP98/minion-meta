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
| `noCache`          | boolean | Bypass Infisical memo and disk-cache reads and writes for this call.        |

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

Successful Infisical fetches are cached for five minutes by default. `MINION_ENV_CACHE` selects one
of three modes:

- `disk` (the default when the variable is unset or blank) checks the process memo first, then a
  machine-sealed cross-process cache.
- `memory` uses only the process memo.
- `off` bypasses both caches. Passing `noCache: true` does the same for one call.

An unrecognized value warns and uses `memory`; it never enables disk caching implicitly. The
resolver still removes a recognized legacy plaintext `infisical-cache.json` once per process when
caching is disabled. It never migrates plaintext values. If that file may have been backed up or
synced, rotate `MINION_SECRETS_KEY` as described in the
[centralized secrets vault specification](../../specs/2026-05-20-centralized-secrets-vault.md).

In `disk` mode, cache envelopes use version 1, AES-256-GCM, and an HKDF-SHA256 key derived from the
first available source in this key ladder:

1. `MINION_ENV_CACHE_KEY`, when set in the process environment to canonical standard base64 that
   decodes to exactly 32 bytes.
2. A random 32-byte machine-local `cache.key` created in the cache directory.

A malformed `MINION_ENV_CACHE_KEY` raises `InvalidCacheKeyError`; the resolver does not fall back to
`cache.key` or return a memoized value. The resolver does not load this control key from dotenv
files or copy it into the resolved application environment. Cache files live under
`${XDG_CONFIG_HOME:-~/.config}/minion/` as `infisical-cache.json` followed by immutable numbered
generations. The directory is restricted to mode `0700`; the key and cache files are restricted to
`0600`. Cleanup keeps the two newest generation candidates and deletes older candidates only after
authentication. Corrupt, tampered, foreign-machine, or unsupported generations are preserved as
evidence, warned about once per process, and treated as cache misses before Infisical is queried.

Cross-process writes require a filesystem that supports hard links. Lock recovery binds owners to a
kernel-observed process start identity from Linux procfs, POSIX `ps`, or Windows PowerShell. If that
identity cannot be observed, normal locking remains available and recovery fails safe: an ambiguous
live PID is never reaped, so a timed-out write warns once and leaves the fresh result in the process
memo instead of allowing overlapping writers.

## Security

- **Never** logs secret values. The `source[]` array contains variable names only.
- Disk cache envelopes are bound to the current machine and user. This protects a copied cache from
  disclosure through backups, cloud sync, support archives, broad home-directory searches, or a
  different local user.
- This does **not** protect secrets from software running as the same user or as root on the same
  machine; that software can read `cache.key` and the cache together.
- New plaintext cache files are never written. The environment hierarchy persists only the narrowed
  `MINION_SECRETS_KEY`, although direct `fetchInfisicalSecrets()` callers control their own
  `cacheKeys` allowlist.
- Infisical stdout is captured as a buffer and parsed; it never streams to the parent stdio.

## License

MIT
