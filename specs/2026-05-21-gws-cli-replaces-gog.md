# Replace bespoke gog OAuth with gws CLI as auth source of truth

**Date:** 2026-05-21
**Status:** Draft — execution multi-session
**Author:** Claude (Opus 4.7) + Nikolas P.

## Goal

Stop maintaining a bespoke Google OAuth stack inside the minion gateway. Adopt [`@googleworkspace/cli`](https://github.com/google/gws-cli) (the `gws` CLI) as the single source of truth for Google credential acquisition, storage, and refresh. Minion shells out to `gws` for everything credential-related; the gateway keeps only a thin per-agent credential routing layer.

## Motivation

Today the gateway carries ~1.5k LOC of OAuth glue:
- `src/hooks/gog-credentials.ts` (565 LOC) — token refresh, per-session keying, ADC serialisation
- `src/hooks/gog-oauth-server.ts` — local HTTP callback receiver for the OAuth code-flow
- `src/hooks/gog-oauth-notifications.ts` — UX notifications during OAuth dances
- `src/hooks/gog-command-exec.ts` — env injection wrapper for `gcloud`-style children
- `src/hooks/gog-oauth-types.ts` — type defs
- `src/agents/tools/auth/gog-auth-{start,revoke,status}-tool.ts` — 6 tool files (each + `.meta.ts`) agents call to manage credentials
- `src/auth/google/google-auth-provider.ts` — provider wrapper

The `gws` CLI already implements all of this (login flow, refresh, revoke, list, ADC export) at the same level of fidelity Google supports for `gcloud`. Maintaining a parallel stack means: keeping up with Google's OAuth UX changes, our own refresh-token expiry handling, our own keyring/file-store semantics, our own scope/consent UI. The migration eliminates all of that.

Partial migration is already in flight (per `src/hooks/gws-credentials.ts:32`, which currently *imports from* `gog-credentials.ts`). This spec finishes the job.

## What the gws CLI provides

| Subcommand | Replaces |
|---|---|
| `gws auth login` | gog-oauth-server's full code-flow dance |
| `gws auth export --unmasked` | manual ADC JSON construction in gog-credentials.ts |
| `gws auth list` | listCredentials() in gog-credentials.ts |
| `gws auth revoke <email>` | revokeCredentials() in gog-credentials.ts |
| `gws --credentials <path> <subcommand>` | the `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` per-session env trick |
| automatic refresh on access-token expiry | refreshAccessToken() + isTokenExpired() in gog-credentials.ts |

## What stays on minion's side

The gws CLI does not natively support per-agent / per-session credential isolation — its keyring stores one user globally. Minion still needs:

- **Per-agent credential file routing** — each agent invocation runs `gws --credentials /path/to/agent/cred.json …` against an isolated file. The file itself is the ADC shape gws produces.
- **Vault storage** — per-user encrypted ADC blobs in the existing secrets vault (under a new scoped key, e.g. `gws_credentials:<userId>:<email>`).
- **Tool surfaces for agents** — `gws-auth-start`, `gws-auth-status`, `gws-auth-revoke` keep existing (renamed from `gog-*`) but their bodies become thin shells around `gws auth …` subprocess calls.

## Architecture

```
┌─────────────────────────────┐
│ minion agent runs           │
│  ┌──────────────────────┐   │
│  │ gws-exec-tool        │───┼──spawn──→ gws --credentials /per-agent/file
│  │   (renamed,          │   │            (gws CLI handles refresh, scope, etc.)
│  │    body simplified)  │   │
│  └──────────────────────┘   │
└─────────────────────────────┘

per-agent file = ADC JSON, sourced from:
  vault.getScoped("gws_credentials", "<userId>:<email>")
  → write to {stateDir}/credentials/gws/{agentId}/{sessionKey}_{email}.json
  → gws CLI auto-refreshes the access token using refresh_token inside

User-side credential acquisition:
  user runs `gws auth login` in their terminal once
  → resulting ADC blob ingested via `gws auth export --unmasked`
  → admin uploads via `minion gws ingest <userId>` CLI command
    (or hub Settings → Connections runs the same path)
```

## Migration phases

Ordered for incremental safety. Each phase is independently shippable and reversible.

### Phase A — gws-credentials API parity (~2-3h, ships first)

Goal: `gws-credentials.ts` becomes a self-contained module that owns ALL credential operations, backed by gws CLI shell-outs. No longer imports from `gog-credentials.ts`.

| Task | Files |
|---|---|
| Add `gwsAuthLogin(opts) → Promise<{email, scopes}>` — wraps `gws auth login` interactively or via the system browser | `src/hooks/gws-credentials.ts` |
| Add `gwsAuthExport(email) → Promise<GwsCredentialFile>` — wraps `gws auth export --unmasked` | same |
| Add `gwsAuthList() → Promise<Array<{email, scopes, validUntil}>>` — wraps `gws auth list --json` | same |
| Add `gwsAuthRevoke(email) → Promise<void>` — wraps `gws auth revoke` | same |
| `loadSessionCredentials(agentId, sessionKey, email) → string` — returns path to a per-agent ADC file, materialising it from vault on demand | same |
| Drop the import of `gog-credentials.ts` line 32 | same |
| Tests: `src/hooks/gws-credentials.test.ts` using mocked `runCommandWithTimeout` | NEW |

### Phase B — vault storage for per-user gws creds (~1h)

| Task | Files |
|---|---|
| Define scoped secret key shape `gws_credentials:<userId>:<email>` storing the full ADC JSON | `src/secrets/manifest.ts` |
| Add probe handler `gws_credentials` — fetches `gws auth list` against the ingested file to verify validity | `src/secrets/probes/gws-credentials.ts` (NEW) |
| Helper `getGwsCredentialsForUser(userId) → Promise<GwsCredentialFile[]>` — reads all the user's stored Google identities from vault | `src/personal-agent/gws-credentials.ts` (NEW) |

### Phase C — migrate auth tools (~2h)

| Task | Files |
|---|---|
| `git mv gog-auth-start-tool.{ts,meta.ts} → gws-auth-start-tool.{ts,meta.ts}` | tools/auth/ |
| Rewrite body to delegate to `gwsAuthLogin` + vault store | same |
| Same for `gog-auth-revoke` and `gog-auth-status` | same |
| Rename `gog-exec-tool` → `gws-exec-tool` (note: `gws-exec-tool.ts` already exists; merge logic, keep the gws version) | same |
| Update `src/agents/tools/_gen/_registry.generated.ts` references | regenerated |

### Phase D — migrate other callers (~1h)

| Task | Files |
|---|---|
| `src/auth/provider.ts`, `src/auth/google/google-auth-provider.ts` — switch from `gog-credentials` imports to `gws-credentials` | both |
| `src/hooks/gmail-ops.ts` — replace `gog`-named internals with `gws` equivalents; the `gcloud`-style command exec path stays but env injection uses `gws auth export` for the token | gmail-ops.ts |

### Phase E — delete dead gog code (~30m)

| Task | Files |
|---|---|
| `git rm src/hooks/gog-credentials.ts`, `gog-oauth-server.ts`, `gog-oauth-notifications.ts`, `gog-oauth-types.ts`, `gog-command-exec.ts` | hooks/ |
| `git rm src/hooks/gog-credentials.test.ts` | tests/ |
| Verify zero remaining `gog` references via `grep -r '\bgog\b' src/` | — |

### Phase F — config schema cleanup (~30m)

| Task | Files |
|---|---|
| Remove `gogOAuth: GogOAuthSchema` from `src/config/zod-schema.ts:341` | zod-schema.ts |
| Add (optional, ergonomic) `gwsAuth: { credentialsRoot?: string }` if any per-deployment config needed | same |
| Strip matching type from `src/config/types.gateway.ts` | same |
| Update template `setup/templates/gateway.json.template` if it carries gogOAuth | template |

### Phase G — hub Settings → Connections UI (~3h, future)

Out of scope for this spec. Tracked separately as part of Phase 2C of the my-agent roadmap.

## What needs to be true for the demo to keep working through migration

Per [[reference_minion_gateway_observation_pipeline]], the personal-agent Calendar puller (Phase 2C of my-agent roadmap) depends on this migration. Concretely the Phase B helper `getGwsCredentialsForUser(userId)` IS the API the Calendar puller calls. So Phase A → B unblocks the Calendar work; C → F is cleanup that can land after Calendar ships.

## Risk register

| Risk | Mitigation |
|---|---|
| gws CLI version drift (Google ships breaking changes) | Pin via `minion doctor` check; document required minimum version |
| Refresh token rotation behaviour differs from current bespoke code | Compare gws CLI's refresh logic to current implementation BEFORE deleting gog refresh code |
| Agent tools fail mid-conversation if creds expired and gws can't refresh non-interactively | Surface clear error: "Run `gws auth login` to re-authorize" |
| Existing per-session credential files in `auth-credentials/google/` orphan after migration | Phase A keeps both stores in sync briefly; Phase E deletes only after one stable week |
| Tests that mock `gog-credentials.ts` break | Phase A's parity rewrite + new gws tests cover the same surface |

## Open questions

1. **Single user keyring vs per-user**: gws CLI's native keyring is single-tenant. Do we run `gws` with `--credentials <path>` every invocation (current proposal) or switch the keyring per call (dangerous)? Proposal: never touch the keyring, always pass `--credentials`.
2. **Hub OAuth UI**: do we surface a "Connect Google" flow in the hub that opens a shell-pipe to `gws auth login`, or do users always do it from their terminal? Proposal: defer to Phase G — for now, `minion gws ingest` CLI command.
3. **OS package or bundled binary**: ship `gws` CLI via the minion installer or expect users to have it on PATH? Per `minion doctor`, prompt + install instructions if missing.

## Cross-references

- [[reference_minion_gateway_observation_pipeline]] — Phase 2C Calendar puller depends on Phase B of this spec
- `src/hooks/gws-credentials.ts:32` — the import line that is the headline evidence of mid-migration state
- `gws-exec-tool.ts` + `gws-credentials.ts` already exist as half-migration; this spec finishes that work
