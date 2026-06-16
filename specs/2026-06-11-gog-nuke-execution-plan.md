# gog NUKE — execution plan (finish gws migration, spec A–F)

**Date:** 2026-06-11
**Status:** Phase A DONE (commit `431344359` on DEV). Phases B–F pending.
**Parent spec:** `specs/2026-05-21-gws-cli-replaces-gog.md`
**Goal:** Remove ALL `gog` (bespoke Google OAuth) code in `minion/` (branch DEV) in favor of the `gws` CLI. User directive: "NUKE gog." Full CLI adoption chosen.

## ⚠️ CRITICAL CORRECTION — real `gws` 0.22.5 CLI ≠ spec assumptions

Installed: `/home/nikolas/.npm-global/bin/gws`, v0.22.5. Verified surface:

```
gws auth login    # OAuth2, opens browser (interactive, server-side)
gws auth setup    # configure GCP project + OAuth client (needs gcloud)
gws auth status   # show auth state   ← gwsAuthStatus() already uses this ✓
gws auth export   # print decrypted ADC creds to stdout  (NO --unmasked flag)
gws auth logout   # clear saved creds + token cache  (this is "revoke")
```

- ❌ There is **no** `gws auth list` and **no** `gws auth revoke <email>`. The keyring is single-tenant.
- Per-agent isolation = `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE=<path>` per invocation (already implemented in `src/hooks/gws-credentials.ts`).
- Command exec shape: `gws <service> <resource> [sub] <method> --params '<JSON>' [--json '<body>'] [--format json]`. Always JSON by default.
- So the Phase A spec tasks `gwsAuthList`/per-email `gwsAuthRevoke` are NOT buildable as written. Replacements:
  - `gwsAuthLogin()` → wrap `gws auth login` (interactive; on a headless gateway this can't run for remote users → acquisition stays hub-backed / `minion gws ingest`). The `gws_auth_start` tool body should mostly instruct the user to run `gws auth login` in THEIR terminal + upload ADC (`gws auth export`), matching unified-identities P3.
  - `gwsAuthRevoke()` → wrap `gws auth logout` (+ delete the per-agent cred file).
  - `gwsAuthExport()` → wrap `gws auth export`.
  - List per-agent identities = enumerate the per-agent cred dir files, NOT a gws subcommand.

## Baseline state (verified 2026-06-11)

- `pnpm tsgo` on DEV = **exit 0 (clean)**.
- DEV working tree has OTHER sessions' uncommitted WIP (agent-archetypes: `agent-manifest-schema.ts`, `pi-tools.policy.ts`, `attempt-env.ts`, `agent-scope.ts`, generated templates; alert-watcher). **Do NOT touch those. Scope commits to gog→gws files only.**
- `loadSessionCredentialsViaHub` (hub-backed acquisition) already live for `gws_exec` via `extensions/gmail-calendar/src/gws-runner.ts`.
- `getValidGwsCredentialsFile` in `gws-credentials.ts:245-268` is **DEAD** (zero external callers) — removing it + its 2 gog imports (lines 40,41) makes `gws-credentials.ts` self-contained.

## Tool registry codegen

`pnpm generate:tools` (`scripts/generate-tool-registry.ts`) scans `src/agents/tools/**/*.meta.ts`, regenerates `_gen/_registry.generated.ts` + `_gen/_groups.generated.ts` from each `meta` export (id/factory/groups/display/condition + lazy `load: import("../<tool>.js")`). **VERIFY whether `_gen/_display.generated.ts` is regenerated** — explorer flagged the script may only write registry+groups; if so, edit `_display.generated.ts` manually or fix the script.

## Tool surface today

- `group:gog` = [gog_auth_revoke, gog_auth_start, gog_auth_status, gog_exec, **gws_exec**] (gws_exec wrongly double-tagged)
- `group:gws` = [gws_exec]
- All 5 gated by `condition: "gogOAuthEnabled"` (computed in `openclaw-tools.ts:259-261` from `config.hooks.gogOAuth.enabled !== false && !OPENCLAW_SKIP_GOG_OAUTH`). Need new `gwsEnabled` condition, decouple `gws_exec`.

## Execution phases (commit per phase; `pnpm tsgo` + targeted tests green each time)

### Phase A — `gws-credentials.ts` self-contained + auth wrappers ✅ DONE (commit `431344359`)
- ✅ Removed `getValidCredentials`/`GogCredentials` imports + dead `getValidGwsCredentialsFile` → module self-contained (no gog dep).
- ✅ Added `gwsAuthExport()` (parse `gws auth export` → GwsCredentialFile), `gwsAuthLogout()` (`gws auth logout`), `gwsAuthLogin()` (interactive `gws auth login`, 5min timeout). `gwsAuthStatus` already existed.
- ✅ Tests: extended existing `gws-credentials.test.ts` → 20 green. My files tsgo-clean (the 40 tsgo errors in `src/secrets/`+`src/memory/`+`src/cli/` are OTHER sessions' committed WIP, pre-existing, NOT mine — confirmed via grep + git log `b46712dcc`/`87e6ca577`).

### Phase B — vault storage (partially done)
- `gws_credentials` secret key already declared in `server.impl.ts:354-363`. Vault adapter `src/personal-agent/gws-credentials-vault.ts` exists.
- Confirm/create probe `src/secrets/probes/gws-credentials.ts` (exists per file list) + `src/secrets/manifest.ts` entry. Helper `getGwsCredentialsForUser`.

### Phase C — migrate the 4 auth tools (the user-visible "skill" surface)
- ⏳ IN PROGRESS. `src/agents/tools/auth/gws-auth-start-tool.ts` ALREADY CREATED (uncommitted, additive/inert — NOT in TOOL_ORDER or registry yet, so build is still green at 431344359). Design landed: hub-backed guidance (no in-chat OAuth URL), factory `createGwsAuthStartTool(opts?: {agentId, sessionKey, userId, channel, senderId})`, generateLinkCode helper inlined, points to https://hub.minion-ai.org/settings/account. STILL NEEDED: create `gws-auth-start-tool.meta.ts` (id=`gws_auth_start`, factory=`createGwsAuthStartTool`, display {emoji"✉️",title"Google Auth",detailKeys:[]}, groups `["group:gws","group:minion"]`, condition `gwsEnabled`, contextKeys `["agentId","agentSessionKey"]`). userId/channel/senderId are threaded via buildToolOptions in openclaw-tools.ts (same as gws_exec), NOT via contextKeys.
- Create `gws-auth-status-tool.{ts,meta.ts}`: opts {agentId, sessionKey, userId}; getGoogleAdcClient() from `../../../gateway/hub-credential-client-registry.js`; loadSessionCredentialsViaHub → gwsAuthStatus(path) → cleanupSessionCredentials. id=`gws_auth_status`.
- Create `gws-auth-revoke-tool.{ts,meta.ts}`: cleanupSessionCredentials + guidance to unlink at hub (hub owns the OAuth grant). id=`gws_auth_revoke`.
- Create `gws-auth-status-tool.{ts,meta.ts}` → calls `gwsAuthStatus`. id=`gws_auth_status`.
- Create `gws-auth-revoke-tool.{ts,meta.ts}` → calls `gwsAuthLogout` + delete cred file. id=`gws_auth_revoke`.
- `gog-exec` already superseded by existing `gws-exec-tool.ts` — just delete gog-exec.
- `git rm` the 4 `gog-*-tool.{ts,meta.ts}` files.
- Update `src/agents/openclaw-tools.ts`: TOOL_ORDER (lines 90-93), `buildToolOptions` cases (172-187), ToolContext (68), condition compute (259-261 → `gwsEnabled`), evaluateCondition (230-243).
- `pnpm generate:tools`; fix `_display.generated.ts`.
- Update `scope-resolver.ts:45-49`, `agent-types.ts:24,39,52,67,111` (`gog` scope → `gws`), `tool-summaries.ts:33-36,68-71`, `agent-type.ts:124,129-131` (requiredTools + prose), `prose/agent-type/google-auth.md`, fixtures `sections/__tests__/fixtures.ts:32-34`.
- Migrate extension: `extensions/gmail-calendar/src/gmail-tools.ts` + `calendar-tools.ts` from `gog-runner.js` → `gws-runner.js`; then `git rm gog-runner.ts`.
- Update tests: `agent-types.test.ts`, `scope-resolver.test.ts`, `agent-manifest-schema.test.ts:74`.

### Phase D — providers & gmail
- `src/auth/provider.ts:6,49` — replace `GogCredentials` alias with a gws-native ADC type (fields: email, accessToken, refreshToken, expiresAt, services, filePath) OR transitional shim.
- `src/auth/google/google-auth-provider.ts` — remove gog-credentials/gog-oauth-types imports; rewrite `storeCredentials` to gws ADC; drop `syncToGogKeyring`. Update its 2 test files.
- `src/hooks/gmail-ops.ts:354-375` — spawns the **gog (gogcli) binary** for Gmail WATCH (not OAuth). SEPARATE concern; gws has no `watch serve` equivalent. **RISK** — leave gmail watch on gogcli OR redesign. Decide with user before ripping.

### Phase E — delete dead gog code (only after C+D green)
- `git rm` src/hooks/gog-credentials.ts, gog-oauth-types.ts, gog-oauth-server.ts, gog-oauth-notifications.ts, gog-command-exec.ts, gog-credentials.test.ts.
- Rewire gateway boot/shutdown: `server-startup.ts:163-212` (startGogOAuthServer/gogOAuthTask), `server.impl.ts:1152,1169,1278`, `server-close.ts:20,86-87`.
- Session types `src/config/sessions/types.ts:112-127` — drop gogCredentialsFile/gogAuthEmail/gogAuthPending (backward-compatible to leave).
- `security/harden-auth-paths.ts:135-146` + `auth-profiles/google-credential-bridge.ts:41-42` — switch legacy `gog-credentials/` dir → `auth-credentials/gws/` (update, don't delete — security path).
- `grep -rn '\bgog\b' src/` must be empty (except gmail-ops gogcli if deferred).

### Phase F — config schema cleanup
- Remove `GogOAuthSchema` (`zod-schema.hooks.ts:122-133`), `zod-schema.ts:10,341`, `HooksGogOAuthConfig` + `gogOAuth` field (`types.hooks.ts:118-143,188`).
- `legacy.migrations.part-3.ts:18-56` — archive/remove gogOAuth→authProviders migration.
- Add optional `gwsAuth` config if needed. Update `setup/phases/65-tailscale-funnel.sh:148-149`, `skills/gog/SKILL.md` (delete), `skills/gws/SKILL.md:218`.

## Risk flags
- **gmail-ops.ts Gmail watch runs the gogcli binary** — gws has no equivalent; ripping it breaks Gmail push notifications. Get user decision.
- Removing `gog-oauth-server.ts` removes the dual-write that auto-provisions gws cred files on gog login — `gws_auth_start` must do its own vault write.
- `gws auth login` is server-side interactive — unusable for remote multi-tenant users. Acquisition stays hub-backed / terminal-ingest.
- Per spec risk register: delete gog refresh code only after confirming gws refresh parity; spec suggested a 1-week bake before Phase E deletes.

## Decisions (user, 2026-06-11)

**Risk flag 1 (Gmail watch) → REDESIGN FOR GWS (no gogcli kept).**
- `gog watch start` → `gws gmail users watch --json '{topicName,labelIds,...}'` (native, one call).
- `gog watch serve` daemon → NO gws equivalent. Reimplement in-gateway: Node Pub/Sub subscriber OR push-webhook endpoint that, on Gmail notification, calls `gws gmail users history list --params '{userId,startHistoryId}'` to fetch deltas, then processes. GCP setup (pubsub enable / ensureTopic / IAM / ensureSubscription, gmail-ops.ts:154-189) stays on gcloud. This is the largest net-new piece of the whole nuke — scope it as its own sub-phase under Phase D.
- Token for these gws calls = per-user ADC via `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` (same mechanism as gws_exec).

**Risk flag 2 (acquisition model) → DECIDED 2026-06-11: HUB-BACKED + TERMINAL INGEST.**
- `gws_auth_start` tool body: remote users → "Link Google on your profile page" (hub UI); admin/local → instruct `gws auth login && gws auth export | minion gws ingest <userId>`. No in-chat OAuth URL.
- `gog-oauth-server.ts` → DELETED in Phase E (no gws-native callback receiver replaces it; hub owns OAuth, gateway fetches decrypted ADC on-demand via the already-live `loadSessionCredentialsViaHub`).
- ⚠️ Phase E GATE: verify prod isn't still relying on in-chat `gog_auth_start` (check netcup agents' configs / recent OAuth usage) BEFORE deleting gog-oauth-server.

## Resumable exploration agent
`af11234fcade1d120` (code-explorer) holds the full call-site inventory — SendMessage to continue.
