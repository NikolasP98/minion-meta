# Gateway Update System — Design Spec

**Date:** 2026-07-10
**Status:** Draft — pending user review
**Repos touched:** `minion/` (gateway), `minion_hub/`, `.github/workflows/npm-publish.yml` (gateway repo), netcup VPS config
**Companion plan:** `specs/2026-07-10-gateway-update-system-plan.md`

## 1. Goal

A full update lifecycle for the production gateway (netcup, `bot-prd`):

1. **Detect** — a webhook fires when a new production build is published from a `prd` branch.
2. **Notify** — fan-out to configurable channels: hub web UI, WhatsApp, Telegram, Discord.
3. **Apply** — an "Updates" section in hub settings shows current/available version and offers one-click **Install & restart**, with health check and automatic rollback.
4. **Zero-downtime evaluation** — decide between blue-green (2 gateways + load balancer) and single-instance restart. **Decision: single instance. Blue-green is rejected** (§3).

## 2. What already exists (recon summary — build on, don't rebuild)

| Piece | Where | State |
|---|---|---|
| Self-update engine | `minion/src/infra/update-runner.ts` (`runGatewayUpdate`), `update-global.ts`, `update-check.ts`, `update-channels.ts` | Complete. Detects npm-package installs and updates via package manager; `minion update --tag <dist-tag\|version>` accepts arbitrary tags. |
| Daily update check | `minion/src/infra/update-startup.ts` (`runGatewayUpdateCheck`, wired at `src/gateway/server.impl.ts:1187`) | Runs every 24h, compares semver vs npm dist-tag for `cfg.update.channel`, **only logs**. This is the natural hook point for notifications. |
| Restart-script pattern | `minion/src/cli/update-cli/restart-helper.ts` | Writes a standalone script to tmpdir, spawns detached+unref, runs `systemctl --user restart $OPENCLAW_SYSTEMD_UNIT`. Survives the gateway's own death — the model for the crash-loop watchdog. |
| `update.run` RPC | `minion/src/gateway/server-methods/update.ts` (registered in `server-methods.ts:319`, listed in `server-methods-list.ts:55`) | **Already a full install+restart flow**: validates params, calls `runGatewayUpdate`, writes a restart sentinel (post-restart outcome message to the requesting session via `deliveryContext`), and schedules a SIGUSR1 restart **only when the update succeeded**. Missing: dist-tag override from config, crash-loop rollback. |
| Detached restart | `minion/src/cli/update-cli/restart-helper.ts` + `src/infra/restart.ts` (`scheduleGatewaySigusr1Restart`) + `src/infra/restart-sentinel.ts` | Restart + post-restart sentinel delivery machinery all exist. |
| Webhook receiver | `/hooks` — `minion/src/gateway/hooks.ts`, `server-core/server-http.ts:207-520` | Bearer token (constant-time) or GitHub HMAC-SHA256; built-in `wake`/`agent` actions; generic `hooks.mappings`; failure throttling. |
| System channel send | `runMessageAction({ cfg, action: "send", params: { channel, to, message } })` — `src/infra/outbound/message-action-runner.ts:689` | High-level entry over `executeSendAction`; used by CLI/tools; right entry point for the update notifier. |
| WS broadcast | `broadcast(event, payload)` — `src/gateway/server-core/server-broadcast.ts:183` | Hub receives via the `handleEvent` switch (`minion_hub/src/lib/services/gateway.svelte.ts:564`) — `shutdown`, `health`, `channels.status` are precedents. |
| Update config section | `minion/src/config/zod-schema.ts:208-214` | `update: { channel?: "stable"\|"beta"\|"dev", checkOnStart?: boolean }` — `.strict()`, so new keys must be added to the schema. |
| Outbound channel send | `minion/src/infra/outbound/outbound-send-service.ts` (`executeSendAction`) | System-initiated send to any channel (WhatsApp/Telegram/Discord/…) — same path cron delivery uses. |
| npm artifact pipeline | `.github/workflows/npm-publish.yml` | Push to `DEV` → timestamped prerelease under dist-tag `dev`; push to `main` → dist-tag `latest`. Registry: `@nikolasp98/minion`. |
| Prod runtime | netcup, systemd `--user` unit `minion-gateway.service`, `Restart=always`, `RestartSec=10`, Linger=yes | Runs `node …/dist/entry.js` from `/home/bot-prd/.local/lib/node_modules/@nikolasp98/minion` — an npm-global-style layout. Node 22 + npm present; **no pnpm** (can't self-build; must consume prebuilt npm artifacts). |
| Manual deploy | `minion/setup/utilities/deploy-bot-prd.sh` | Local build → rsync → backup → `npm install --omit=dev` → restart → health poll (NRestarts crash-loop detection) → auto-rollback. Its health/rollback logic is the model for the self-updater. |
| Hub gateway RPC | `minion_hub/src/lib/server/gateway-rpc.ts` (`gatewayCall`, operator.admin) | One-shot server-side RPC. No update/restart RPC exists yet. |
| Hub restart UX | `minion_hub/src/lib/state/config/config-restart.ts` | Passive state machine that detects the WS drop after `config.patch` and toasts through reconnect. Reusable as-is for update restarts. |
| Hub version data | `gw.hello.server.version` (+ `commit`) in the HelloOk frame, stored at `gateway-data.svelte.ts:13` | Already delivered on every connect; never displayed. |
| Hub notif engine | `notif_rules`/`notif_log` (Postgres) → `gatewayCall('channels.send')` | Outbound-only (WhatsApp/Telegram/email). The bell UI counts join-requests only. |

## 3. Blue-green / load balancer — evaluated and rejected

The question: run two prod gateways behind a load balancer, update one at a time, hub talks to the LB.

**Rejected.** The gateway is architected as one process per account-set, and the parts users care about cannot be load-balanced:

- **Exclusive gateway lock** — `src/infra/gateway-lock.ts` takes an exclusive lock keyed on the config path; a second process throws `GatewayLockError` unless `MINION_ALLOW_MULTI_GATEWAY=1` is set, which exists precisely because concurrent gateways are unsafe.
- **WhatsApp (Baileys)** — one active socket per phone-number auth. Two processes on the same creds fight, invalidate the session, and force the QR re-pair we already suffer from on bad restarts. This alone kills same-account blue-green.
- **Telegram** — one `getUpdates` long-poll consumer per bot token; the second gets HTTP 409.
- **Discord** — one gateway session per token; concurrent connects cause session conflicts.
- **SQLite** (message ledger, lazy-service) — better-sqlite3, single-process writers; shared files risk `SQLITE_BUSY`/corruption.
- **Split-brain** — dedupe caches, in-flight agent jobs, and system-event queues are in-memory; two live instances double-process messages during overlap.

A load balancer would only cover the stateless HTTP/WS surface — which is not where downtime hurts. Channel connections (the real product) are single-owner regardless, so the second gateway can't take them over without a full disconnect/reconnect anyway — i.e., the same interruption a restart causes, plus new failure modes.

**What we do instead:** single instance + fast restart under systemd (`Restart=always` already in place), with the updater doing health-check + automatic rollback. Observed restart cost is seconds of HTTP/WS unavailability; channel sessions resume from persisted creds. **No container orchestrator** — systemd already is the supervisor, and adding k8s/nomad to avoid a ~15-second restart on a single-tenant box fails every cost/benefit test.

Non-goal (documented for the future): if multi-server ever matters, the dormant `deploy-production.yml` Docker/GHCR workflow is the starting point — still with channels pinned to exactly one instance.

## 4. Architecture

```
push/FF to prd branch (minion-ai repo)
   │
   ▼
GitHub Actions: npm-publish.yml (extended)
   ├─ build + npm publish @nikolasp98/minion@<base>.<ts> --tag prd
   └─ final step: POST https://<gateway>/hooks/update   (Bearer hooks token)
         { version, sha, notes? }
   │
   ▼
Gateway: update-notify module
   ├─ persist pending update  (<state-dir>/update-pending.json)
   ├─ broadcast WS event  update.available  → hub clients
   └─ executeSendAction per cfg.update.notify[]  → WhatsApp / Telegram / Discord
   │
   ▼
Hub: /settings/gateways → "Updates" card
   ├─ shows current (gw.hello.server.version) vs available version + notes
   ├─ notification prefs editor (writes cfg.update.notify via config.patch)
   └─ [Install & restart] → POST /api/gateway/update → gatewayCall('update.run')
   │
   ▼
Gateway RPC update.run (EXISTS — extended)
   ├─ runGatewayUpdate with tag from cfg.update.tag   (npm install -g @nikolasp98/minion@prd)
   ├─ on success: spawn DETACHED crash-loop watchdog (§4.6), then SIGUSR1 restart
   │     watchdog: poll is-active + NRestarts 90s → healthy? write update-result.json
   │               crash-loop? npm install -g @…@<previous> + restart + record rollback
   └─ on install failure: no restart (existing behavior), old version keeps running
   │
   ▼
Gateway startup: reads update-result.json → notifies outcome
   (updated / rolled-back) over the same fan-out; hub reuses the
   config-restart state machine for the disconnect/reconnect toast.
```

### 4.1 Release channel: `prd` branch → npm dist-tag `prd`

- New branch `prd` on `NikolasP98/minion-ai`. A production release = fast-forward `DEV` (or `main`) → `prd` and push. Deliberate, auditable, and reversible — no new tooling.
- `npm-publish.yml` gains a `prd` branch trigger: same timestamped-prerelease mechanics as `DEV` (`npm version ${BASE}.${TIMESTAMP}`), published with `--tag prd`. Skip-if-unchanged guard like `main`'s.
- Rollback artifacts are free: every previously published version stays on the registry; `npm dist-tag` history plus `update-result.json` give the previous-version pointer.

### 4.2 Detection: webhook primary, poll fallback

- **Primary:** the publish workflow's final step POSTs to the gateway's public `/hooks/update` with the existing bearer hooks token (new repo secret `GW_HOOKS_TOKEN`, gateway URL as secret/var). Firing from CI *after* publish means the notification never races the artifact (a raw GitHub push webhook would fire minutes before the npm package exists).
- **Fallback:** the existing `runGatewayUpdateCheck` scheduled check gains: (a) comparison against the configured tag (`prd`), (b) on new version, invoke the same update-notify path instead of only logging. Interval stays 24h by default, configurable via `update.checkIntervalHours`. This covers missed webhooks (gateway down during publish).
- Dedupe: update-notify no-ops if the version equals the already-pending or current version — CI retries and webhook+poll overlap stay single-notification.

### 4.3 New hook action: `/hooks/update`

- New `if (subPath === "update")` branch in `server-http.ts` beside `wake`/`agent`, with `normalizeUpdatePayload` in `hooks.ts` (`{ version: string, sha?: string, notes?: string }`, version validated as semver-ish) and `dispatchUpdateHook` in `src/gateway/server/hooks.ts` calling the update-notify module.
- Auth: existing bearer-token path (constant-time compare, failure throttling) — no new auth surface.
- Why not a `hooks.mappings`/agent-turn instead: notification must be deterministic, structured (typed pending-update state consumed by the hub UI), and must not burn an agent turn. A dedicated action is ~40 lines beside two existing examples.

### 4.4 Gateway update-notify module (new, small)

`src/gateway/update-notify.ts` — single owner of "an update exists" state:

- `recordAvailableUpdate({version, sha, notes, source: "webhook"|"check"})` → dedupe → persist `update-pending.json` in the state dir → broadcast `update.available` WS event → channel fan-out.
- Channel fan-out reads `cfg.update.notify` (§4.7) and calls `executeSendAction` per entry. Send failures are logged per-entry and never block the rest (bestEffort).
- `getUpdateStatus()` → `{ current, pending?, lastCheckAt, lastResult? }` for the RPC.
- On gateway startup: if `update-result.json` exists, notify outcome (updated to X / rolled back to Y with reason) over the same fan-out + WS event `update.applied`, then archive the file. Also clear `update-pending.json` if current version ≥ pending.

### 4.5 Gateway RPC methods

`update.run` **already exists** (`server-methods/update.ts`): install via `runGatewayUpdate` → restart sentinel → SIGUSR1 restart only on success. Changes:

- **Extend `update.run`** to pass the resolved dist-tag (`cfg.update.tag`, falling back to channel) into `runGatewayUpdate` — the runner already accepts `opts.tag` (`update-runner.ts:876`: `npm install -g <pkg>@<tag>`). Also spawn the crash-loop watchdog (§4.6) just before the scheduled restart when the install succeeded.
- **New `update.status`** → `getUpdateStatus()` from update-notify (§4.4).
- **New `update.check`** → force an immediate check against the configured tag; returns status.

Both new methods follow the existing pattern: JSON-schema + validator in `src/gateway/protocol/index.ts`, method name in `server-core/server-methods-list.ts`, handler in `server-methods/update.ts`. Operator/admin scope, same as today's `update.run`.

### 4.6 Crash-loop watchdog (detached script)

The existing flow already refuses to restart after a failed install. The remaining uncovered failure is *install ok, new build crash-loops after restart* — today that means systemd restart-looping broken code until a human intervenes. New `src/infra/update-watchdog.ts`, patterned on `restart-helper.ts` (script in `os.tmpdir()`, spawn detached+unref, self-cleanup):

- Spawned by `update.run` after a successful install, before the restart fires. Inputs (validated, template-substituted): previous exact version, new version, systemd unit, state-dir path.
- Waits through the restart, then polls `systemctl --user is-active` + `NRestarts` delta for 90s (same crash-loop signal as `deploy-bot-prd.sh`).
- Healthy → writes `update-result.json` (`{ ok: true, from, to }`) and exits.
- Crash-loop → `npm install -g @nikolasp98/minion@<previous exact version>` (registry is the rollback store), `systemctl --user restart`, writes `update-result.json` (`{ ok: false, rolledBackTo }`). If rollback's own health check fails, the result file records it and systemd keeps trying — loud by design (hub shows disconnected).
- Logs to `<state-dir>/update-apply.log`. Single in-flight update enforced via a sentinel file; concurrent `update.run` returns "update already in progress".
- `minion update` CLI keeps working unchanged as the manual escape hatch, as does `deploy-bot-prd.sh` for push-based hotfixes.

### 4.7 Config schema (extend `update` in `zod-schema.ts` — it's `.strict()`)

```jsonc
"update": {
  "channel": "stable",              // existing
  "checkOnStart": true,             // existing
  "tag": "prd",                     // NEW: explicit dist-tag override (prod sets "prd"); wins over channel
  "checkIntervalHours": 24,         // NEW
  "notify": [                       // NEW: channel fan-out targets
    { "channel": "whatsapp", "to": "+51…" },
    { "channel": "telegram", "to": "…" },
    { "channel": "discord",  "to": "…" }
  ]
  // hub/web notification is not configured here — every hub client
  // always receives the update.available WS event; visibility is a hub concern
}
```

Editable from the hub via the existing `config.patch` RPC — notification preferences need **no new database tables**. Config-reload marks `update.*` as hot-reloadable (no restart to change notify targets).

### 4.8 Hub changes

- **Updates card** on `/settings/gateways` (admin-only page, natural home per SettingsNav structure):
  - Current version from `gw.hello.server.version` (+ commit) — already in the store, just render it.
  - Available version/notes from `update.status` (fetched on page load) + live `update.available` WS event.
  - Notification prefs editor bound to `cfg.update.notify` via `config.patch`.
  - **Install & restart** button → `POST /api/gateway/update` (new, admin-gated via the standard `requireOrgCapability` route guard) → `gatewayCall('update.run')` → on success, arm the existing config-restart state machine so the WS drop renders as "Gateway restarting…" through reconnect; on reconnect, compare new `hello.server.version` and toast the outcome.
- **Web notification**: on `update.available` event, show a toast + persistent badge/row. The bell popup (`NotificationsPopup.svelte`) gains a second section fed from gateway update state (client-side, from the WS event + `update.status`) — no DB writes; it's derived state, always current, disappears once updated.
- i18n via paraglide for all new strings (`bun run i18n:compile`).

### 4.9 CI changes (`minion` repo, `npm-publish.yml`)

- Add `prd` to `on.push.branches`.
- `prd` job steps mirror `DEV`'s timestamped prerelease, but `--tag prd`, plus skip-if-tip-already-published guard.
- Final step (only on `prd`, only after successful publish):
  `curl -fsS -X POST "$GW_URL/hooks/update" -H "Authorization: Bearer $GW_HOOKS_TOKEN" -d "{\"version\":\"$VERSION\",\"sha\":\"$GITHUB_SHA\"}"` — `continue-on-error: true` (the poll fallback covers a down gateway; publish must not fail because notify did).

## 5. Error handling matrix

| Failure | Behavior |
|---|---|
| Webhook lost (gateway down at publish) | Scheduled check notifies within `checkIntervalHours`. |
| Duplicate webhook / retry | Version dedupe in update-notify → single notification. |
| Bad token / HMAC on `/hooks/update` | Existing 401 + failure throttling. |
| Channel send fails (e.g. WA logged out) | Per-entry best-effort; others still deliver; WS event always fires. |
| `npm install` fails mid-update | Existing `update.run` behavior: status ≠ ok → **no restart scheduled**; gateway keeps running the old version; failure returned to the hub + recorded in the sentinel. |
| New version crash-loops | Watchdog NRestarts detection → auto-rollback to previous exact version → restart → outcome notification "rolled back". |
| Rollback also fails | Result file written; systemd keeps retrying; hub shows disconnected — loud by design. Manual escape hatches: `minion update`, `deploy-bot-prd.sh`. |
| WA session needs QR re-pair after restart | Known risk class (same as today's manual restarts; creds persist and normally resume). Post-update outcome notification includes channel health summary so a dead WA session is visible immediately instead of silently. |
| Concurrent `update.run` calls | update-apply writes a lock/sentinel (single in-flight update); second call returns "update already in progress". |

## 6. Security

- `/hooks/update` uses the existing bearer hooks token (constant-time compare + throttling). The token is already secret-managed; it gains one more consumer (GitHub Actions secret `GW_HOOKS_TOKEN`).
- Version strings are validated (semver-ish charset) before ever reaching a shell; the updater script receives the version via a validated template substitution, never raw webhook input interpolated into shell.
- `update.run` is operator/admin-scope RPC + admin-gated hub route (RBAC is a required build step — the new API route gets the standard capability guard).
- The updater installs only `@nikolasp98/minion` from the npm registry — no arbitrary package or URL is accepted anywhere in the flow.
- No secrets in the spec, repo, or updater logs (the systemd unit already holds prod env; unchanged).

## 7. Testing strategy — contained & reversible in prod

Unit/integration (normal, local):
- `update-notify` dedupe + fan-out (vitest, mock `executeSendAction`).
- `normalizeUpdatePayload` validation.
- updater script generation (assert exact shell content for a fixture version; no live npm).
- hub: API route guard test + Updates card render states.

Prod-touching tests — **each step reversible, git history left clean**:
1. **npm dist-tag rehearsal:** `npm dist-tag add @nikolasp98/minion@<existing-dev-version> prd-test` → point a local gateway at `tag: "prd-test"` → verify check/notify → `npm dist-tag rm @nikolasp98/minion prd-test`. No git objects created.
2. **Webhook rehearsal:** `curl` the deployed `/hooks/update` with the bearer token and a fake higher version → verify notification fan-out + hub card → clear `update-pending.json` (or `update.check` resets it to reality). No git objects created.
3. **CI rehearsal:** create branch `prd` pointing at the current released tip; the first real push doubles as the pipeline test (publishes a real prd-tagged version — which is the desired end state, not junk). No throwaway PRs, no test commits. If a scratch branch is ever needed, name it `prd-ci-test`, and delete branch + any tags it created immediately after.
4. **Full loop rehearsal:** run `update.run` with `dryRun: true` first (plan only), then a real run installing the *same* version currently deployed (a no-op content-wise, but exercises install → restart → health → result-notify end to end with zero risk of new-code regressions).

## 8. Prerequisites & rollout order

1. **Flush unpushed prod work first.** Prod currently runs a hand-deployed build from an unpushed working tree (gateway tip `f09bf410f` + scoped dirty adds). The first `prd` publish replaces `dist/` wholesale — everything live today must be committed and pushed to `DEV` (and FF'd into `prd`) before the first webhook-driven update, or it silently reverts prod features.
2. Land gateway changes → publish to `dev` tag → deploy once more via `deploy-bot-prd.sh` (the updater code must be *running* before it can self-update).
3. Set prod `gateway.json`: `update.tag: "prd"`, `update.notify: […]`.
4. Add `GW_HOOKS_TOKEN` + gateway URL secrets to the repo; extend `npm-publish.yml`.
5. Create `prd` branch = current DEV tip → first publish → verify end-to-end.

## 9. Non-goals

- Blue-green / second gateway / load balancer / container orchestrator (§3).
- Auto-install without human approval (the system notifies; a human clicks Install. `update.autoInstall` can be a later one-line config addition once trust is earned).
- Multi-server fan-out (dormant `deploy-production.yml` remains the future path).
- Per-user notification preferences in the hub DB (prefs are gateway config; single-operator reality).
- Hub/site self-update (Vercel already owns that lifecycle).
