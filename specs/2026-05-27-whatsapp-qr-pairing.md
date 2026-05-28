# WhatsApp QR Pairing — Hub feature + the 515 relink issue

**Date:** 2026-05-27
**Status:** QR generation + UI shipped & working. The `515` re-auth bug is **root-caused and fixed** (see §2) — a status-extraction shape mismatch in the QR login path, fixed in source with a regression test. Remaining: ship a clean release + live-validate.

## 1. What was built (working, committed)

Goal: make the Hub's "WhatsApp QR pairing" fully functional (it previously showed `QR request failed: 404`).

### Gateway (`minion`, branch `DEV`)
- `extensions/whatsapp/index.ts` — registers gateway RPC **`channels.whatsapp.pair`**. Responds immediately (`{ok:true}`), then runs `runPairing(...)` detached (the QR can take ~30s, exceeding the Hub's 15s WS request timeout if awaited inline).
- `extensions/whatsapp/src/pairing.ts` — `runPairing(deps)`: event-driven orchestrator. Sequence: `prepareForRelink` → `startWebLoginWithQr` → broadcast `channels.whatsapp.qr` `{channelId, qrData, expiresIn}` → `waitForWebLogin` → broadcast `channels.whatsapp.paired` `{channelId, phone}` / `channels.whatsapp.pairFailed` `{channelId, message}` → `onPaired`. `accountIdFromChannelId` maps `gw:whatsapp:<id>`→`<id>`, `pending`→default. Unit-tested (`pairing.test.ts`).
- `prepareForRelink` (existing account only): `context.stopChannel("whatsapp", accountId)` then `logoutWeb(authDir)` if `webAuthExists` — clears creds so WhatsApp issues a fresh QR. Gated on explicit accountId so the wizard "pending"/default flow is never clobbered. `onPaired`: `context.startChannel("whatsapp", accountId)`.
- `src/web/login-qr.ts` — `startWebLoginWithQr` now also returns the raw `qr` string (Hub renders the string via zag-js, not the PNG). 515 reconnect retry raised from 1 → 3 (with 800ms pause).
- Commits: `49a... ` chain on DEV — `ddf67c95c` (runPairing + relink coordination), `350044e7a` (515 retry), plus earlier QR-string/Dockerfile/lockfile commits.

### Hub (`minion_hub`, branch `dev`, commit `c7ce76b`)
- `WhatsAppQrPairing.svelte` — drives pairing over the gateway WS (no REST precondition); `requestWhatsAppPair(channelId, accountId?)` returns `{ok, alreadyLinked, message}`; listens for `qr`/`paired`/`pairFailed`. QR constrained to 192×192.
- `gateway.svelte.ts` — routes the `channels.whatsapp.pairFailed` event to a window CustomEvent.
- `ChannelCard.svelte` — **re-auth renders inline** in the expanded card for WhatsApp (`reauthing` state → `<WhatsAppQrPairing channelId={channel.id} accountId={gwAccountId}>`). Token channels (telegram/discord) still use the wizard.
- `ChannelsTab.svelte` — **new-account setup wizard opens in a modal** (backdrop + Escape/click-outside) instead of inline below the list.

### Deploy reality
netcup runs the gateway from the **user-global npm install** `@nikolasp98/minion@2026.5.14-dev` (`/home/bot-prd/.local/lib/node_modules/...`) launched by **systemd `--user`** (`minion-gateway.service`) → `infisical run … node dist/entry.js gateway`. NOT Docker / not a git checkout. Access: `tailscale ssh bot-prd@netcup` (plain `ssh` hangs — port 22 is Tailscale SSH). The CI Docker pipeline is broken on DEV (lockfile [fixed], dead bun install URL [fixed], `pnpm build` OOM [heap bumped, unverified]) so the feature was **hot-patched** into the installed bundle (`extensions/whatsapp/index.js` + `dist/plugin-sdk/index.js`; backups `*.bak-*`). QR generation confirmed working live.

## 2. The blocker: re-auth fails with `515` — ROOT CAUSE FOUND & FIXED (2026-05-27)

**Symptom:** clicking Re-authenticate on `faces` → QR renders → after scan: `WhatsApp login failed: status=515 Unknown Stream Errored (restart required)`. The number briefly linked then WhatsApp logged it out ~30s later. The login-qr 3× 515 retry **never fired** (no "reconnecting" info log).

**Root cause (single bug — NOT two competing paths):** a status-extraction shape mismatch in the QR login path.
- Baileys' `waitForWaConnection` (`src/web/session.ts:197`) rejects with the **`lastDisconnect` wrapper** `{ error: Boom, date }` — NOT the Boom itself. The 515 lives at `err.error.output.statusCode`.
- `attachLoginWaiter` (`src/web/login-qr.ts:90`) set `errorStatus = getStatusCode(err)`, and `getStatusCode` (`session.ts:205`) only reads `err.output?.statusCode ?? err.status` — both `undefined` on the wrapper. So `errorStatus` was **`undefined`, never `515`**, and the retry guard at `login-qr.ts:292` (`if (login.errorStatus === 515)`) never triggered → login bailed on the *expected* post-scan 515 instead of reconnecting.
- `formatError` (`session.ts:291`) *does* unwrap `.error`, so the user-visible message correctly showed `status=515` — masking that the code never recognized it. The CLI path `login.ts:29-31` already unwrapped `.error.output.statusCode` correctly; only the QR path was broken.

**The "two competing paths" and device-cap theories were both wrong.** The onboarding adapter (`loginWeb`, `whatsapp.ts:333`) only runs in the interactive wizard, not from the gateway `pair` RPC — during a Hub relink there is one socket. The phone has 0 linked devices. Duplicate "login failed" log lines were a misread.

**Fix (committed):** added `getDisconnectStatusCode(err)` to `session.ts` (unwraps `.error.output.statusCode`, falls back to `getStatusCode`); `login-qr.ts` `attachLoginWaiter` + `restartLoginSocket` now use it. Regression test in `login-qr.test.ts` ("restarts on the realistic lastDisconnect wrapper shape for 515") reproduces the bug — the old test used the wrong bare-Boom shape, which is why it was falsely green.

## 3. Remaining

1. **Ship via a clean package release** once the CI Docker build is healthy (fix the `pnpm build` OOM / verify the heap bump), so netcup runs released code instead of the hot-patches.
2. **Validate live** against (a) a fresh/unlinked account and (b) relink of a linked account, on a local gateway before release.

## 4. Pointers
- Memory: `whatsapp-qr-pairing.md` (full session narrative, commit hashes, deploy mechanics).
- Live netcup is hot-patched; backups at `…/extensions/whatsapp/index.js.bak-*` and `…/dist/plugin-sdk/index.js.bak-515-*`.
- Hub fix is live on the local dev server (HMR) and committed.
