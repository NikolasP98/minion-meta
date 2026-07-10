# Gateway Update System — Rollout Runbook (Task 10)

**Date:** 2026-07-10 · **Spec:** `specs/2026-07-10-gateway-update-system.md` · **Code:** gw DEV `c3c3a868b`, hub dev `e462761f` (both reviewed & approved, nothing pushed)

**Verified facts this runbook relies on:**
- Prod gateway: `bot-prd@152.53.91.108`, systemd `--user` unit `minion-gateway.service`, listens `127.0.0.1:18789`, deployed version `2026.7.4-dev` (hand-deployed `5eca9aaff` lineage).
- Public URL: Tailscale Funnel `https://netcup.donkey-agama.ts.net` → `127.0.0.1:18789` (also `/voice`, `/paperclip` routes). Unauthenticated `POST /hooks/update` already returns **401** (auth gate works).
- Prod config: `hooks.enabled: true`, `hooks.token` set, `hooks.path` default `/hooks`, `update: {"checkOnStart": true}`.
- Gateway DEV has **25 unpushed commits** (gmail/feed → tool-arch WPs → bug-triage hooks → update system) and 6 dirty/untracked files from other sessions.

---

## Step 0 — Decide the dirty files (blocker for Steps 1 & 3)

`minion/` working tree currently has:

```
M  extensions/meta-graph/minion.plugin.json
M  extensions/whatsapp/minion.plugin.json
M  src/agents/embedded-subagent-templates.generated.ts
M  src/agents/embedded-templates.generated.ts
?? src/config/schema-parity.test.ts
?? src/config/types.budgets.ts
```

These belong to another session's WIP. Two reasons they matter:
1. The **pre-push hook scans the working tree** (memory: config→DB P4) and may complain.
2. `deploy-bot-prd.sh` builds from the working tree — the modified generated files **would be baked into the prod build**.

**Decide:** commit them (if they're finished work), or stash them for Steps 1–3:
```bash
cd ~/Documents/CODE/MINION/minion
git stash push -u -m "pre-rollout WIP hold" -- extensions/meta-graph/minion.plugin.json extensions/whatsapp/minion.plugin.json src/agents/embedded-subagent-templates.generated.ts src/agents/embedded-templates.generated.ts src/config/schema-parity.test.ts src/config/types.budgets.ts
# ... after Step 3: git stash pop
```

## Step 1 — Push gateway DEV (flush unpushed work)

Everything running on prod must be represented on origin before the first prd publish, or the update system will "update" prod onto code that lacks hand-deployed features.

```bash
cd ~/Documents/CODE/MINION/minion
git log --oneline origin/DEV..DEV        # expect the 25 commits, tip c3c3a868b
pnpm tsgo                                 # sanity (ignore known baml_client error)
git push origin DEV
```

Notes:
- ⚠️ Known gotcha: the gw **pre-push hook can version-bump**; if it mutates the tree, `git reset --mixed` after push (memory: valkey session).
- Pushing DEV triggers `npm-publish.yml` → a timestamped `dev` dist-tag publish. That's normal and harmless.
- ⚠️ Some commits may be unsigned (1Password was locked in a prior session). If signing matters, unlock 1Password and re-sign before pushing: `git rebase --exec 'git commit --amend --no-edit -S' origin/DEV` (only if you care).
- Verify: `git log --oneline origin/DEV..DEV` → empty; CI green on GitHub.

## Step 2 — Repo secrets for the CI → gateway webhook

```bash
# Token: read prod hooks.token (don't paste it anywhere else)
ssh niko@152.53.91.108 "sudo -u bot-prd node -e 'console.log(require(\"/home/bot-prd/.minion/gateway.json\").hooks.token)'" | gh secret set GW_HOOKS_TOKEN --repo NikolasP98/minion-ai

gh secret set GW_HOOKS_URL --repo NikolasP98/minion-ai --body "https://netcup.donkey-agama.ts.net/hooks"

gh secret list --repo NikolasP98/minion-ai   # expect both listed
```

The workflow curls `"$GW_HOOKS_URL/update"`, so the value must end at `/hooks` (no trailing slash).

## Step 3 — Deploy the updater code to prod once (old path)

The updater must be *running* before it can self-update. From a **clean** worktree (Step 0 done):

```bash
cd ~/Documents/CODE/MINION/minion
./setup/utilities/deploy-bot-prd.sh
```

What it does: build → verify → rsync dist+package.json → backup → swap → `npm install --omit=dev` → restart → 40s health poll → auto-rollback on failure.

Post-deploy verification:
```bash
# service healthy
ssh niko@152.53.91.108 'U=$(id -u bot-prd); sudo -u bot-prd XDG_RUNTIME_DIR=/run/user/$U systemctl --user is-active minion-gateway.service'
# /hooks/update exists now: bad token → 401, good token + garbage version → 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://netcup.donkey-agama.ts.net/hooks/update -H "Authorization: Bearer WRONG" -d '{}'          # 401
```
- ⚠️ **WhatsApp QR risk:** any prod restart can drop a WA session (history: `gw restart→QR`). After deploy, check the hub channels page; re-pair if a session shows unpaired. Accounts: default/panik `+51902829738`, Faces `+51992376833`, FACES OFICIAL `+51906090526`.
- Hub-side check (after Step 6a or with hub dev running): Settings → Gateways card shows current version; **Check now** returns instead of 500.

## Step 4 — Prod config: tag + notify targets (hot-reloads, no restart)

Edit `/home/bot-prd/.minion/gateway.json` (on-box, or via hub config editor once hub is deployed). Extend the `update` section:

```jsonc
"update": {
  "checkOnStart": true,
  "tag": "prd",
  "checkIntervalHours": 24,
  "notify": [
    { "channel": "whatsapp", "to": "+51XXXXXXXXX" }   // your personal number; add telegram/discord entries as desired
  ]
}
```

On-box one-liner (safer than hand-editing):
```bash
ssh niko@152.53.91.108 "sudo -u bot-prd node -e '
const f=\"/home/bot-prd/.minion/gateway.json\";
const c=require(f);
c.update={...c.update, tag:\"prd\", checkIntervalHours:24, notify:[{channel:\"whatsapp\",to:\"+51XXXXXXXXX\"}]};
require(\"fs\").writeFileSync(f, JSON.stringify(c,null,2));
console.log(\"written\", JSON.stringify(c.update));'"
```
`update.*` is classified hot-reload — no restart needed. Verify in journal: no restart; or hub card Check now still works.

## Step 5 — Webhook rehearsal (zero-state, fully reversible)

Version `0.0.1` is older than the running version → the module rejects it with `reason: "not-newer"` **before any state write, broadcast, or channel send**. Proves auth + plumbing with nothing to clean up:

```bash
TOKEN=$(ssh niko@152.53.91.108 "sudo -u bot-prd node -e 'console.log(require(\"/home/bot-prd/.minion/gateway.json\").hooks.token)'")
curl -s -X POST https://netcup.donkey-agama.ts.net/hooks/update \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"version":"0.0.1"}'
# expect: {"ok":true,"notified":false,"reason":"not-newer"}
```

Optional full-notification rehearsal (creates state, cleanup shown):
```bash
curl -s -X POST https://netcup.donkey-agama.ts.net/hooks/update \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"version":"9999.0.0","notes":"rehearsal — ignore"}'
# expect {"ok":true,"notified":true} + WhatsApp message + hub toast/bell/card show 9999.0.0
# cleanup:
ssh niko@152.53.91.108 'sudo -u bot-prd rm -f /home/bot-prd/.minion/update-pending.json'
# hub card clears on next Check now / page load
```
⚠️ Do NOT click **Install & restart** while 9999.0.0 is pending — `update.run` installs the real `prd` dist-tag (which doesn't exist yet), and would fail cleanly (no restart on failure), but don't poke it.

## Step 6 — First prd publish (this IS the pipeline test)

### 6a. Hub first (so the UI is live to observe)
```bash
cd ~/Documents/CODE/MINION/minion_hub
git log --oneline origin/master..dev | head    # review what promotes
git push origin dev
git push origin dev:master                     # FF promote → Vercel deploys
```

### 6b. Create the prd branch from the pushed DEV tip
```bash
cd ~/Documents/CODE/MINION/minion
git push origin DEV:refs/heads/prd
gh run watch --repo NikolasP98/minion-ai        # or: gh run list --workflow=npm-publish.yml -L3
```

Expected chain: workflow publishes `@nikolasp98/minion@2026.7.4-dev.<timestamp>` under dist-tag **prd** → final step curls `/hooks/update` → gateway records pending, broadcasts, and sends channel notifications.

Verify:
```bash
npm view @nikolasp98/minion dist-tags     # prd: 2026.7.4-dev.<timestamp>
```
- WhatsApp message arrives: "Gateway update available: v… Install from Hub → Settings → Gateways."
- Hub: toast + bell row + Updates card shows the pending version.
- If the webhook step failed (secrets typo): it's `continue-on-error` — publish still succeeded; the daily check (or hub **Check now**) picks the version up. Fix the secret for next time.

Nothing to revert: the prd branch + prd-tagged publish are the desired end state.

## Step 7 — E2E: one-click install from the hub

1. Hub → Settings → Gateways → **Install & restart** → confirm.
2. Expected timeline:
   - `update.run` installs `@nikolasp98/minion@prd` (npm global, same layout prod already uses) — ~30–90s.
   - WS drops → "restarting" toast. If it exceeds 30s the toast switches to "taking longer — can take a few minutes" (normal).
   - Watchdog observes the new process: healthy → writes result; crash-loop → auto npm-rollback to previous version + restart.
   - On reconnect the card shows the new version + success toast; within ~2 min the outcome notification hits WhatsApp ("Gateway updated to v…").
3. Verify on-box:
```bash
ssh niko@152.53.91.108 'sudo grep -m1 version /home/bot-prd/.local/lib/node_modules/@nikolasp98/minion/package.json; sudo -u bot-prd cat /home/bot-prd/.minion/update-result.last.json 2>/dev/null'
```
4. ⚠️ Check WhatsApp sessions again (QR risk on any restart).
5. Failure modes (all designed): install fails → no restart, old version keeps running, hub shows the error; new build crash-loops → watchdog rolls back, "FAILED — rolled back" notification, the bad version is dropped from pending and won't be re-offered.

## Step 8 — Steady state

- **Releasing:** `git push origin DEV:prd` (or merge/FF into `prd`) = publish + notify. Human clicks Install in the hub. Nothing auto-installs by design.
- **Escape hatches unchanged:** `minion update --tag prd` on the box; `deploy-bot-prd.sh` for push-based hotfixes.
- **Follow-ups parked by the final reviews** (tracked, non-blocking): channel-triggered updates double-notify the requesting channel; `update.*` WS events broadcast to all clients (spec-intended); watchdog exits on first healthy sample; `update.check` negative-path test; hub shaped-500s, ES native-speaker pass, seed-fetch race.
