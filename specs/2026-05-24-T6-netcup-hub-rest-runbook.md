# T6 Ops Runbook — Activate the gateway↔hub REST credential path (netcup)

**Goal:** Give the netcup gateway a valid hub REST config so the on-demand Google credential path (P2/P3) works. Today `gateway.hubMetrics` has `hubUrl`/`apiKey` absent → `REST valid:false` → the ADC client is null → Google-backed gws tools report "not connected". This makes them work.

**Verified mechanism:** the gateway authenticates to `GET /api/gateway/google-adc` with `Authorization: Bearer <token>`. The hub (`resolveServerTokenAuth` in `minion_hub/src/hooks.server.ts`) decrypts each `servers.token` and matches the Bearer value. The token is an **operator-chosen shared secret** — you set the *same* string in two places: the hub `servers` row and the gateway's `hubMetrics.apiKey`. The gateway's `serverId` is already `1cf319d2-cad0-42d9-9bb5-151cef48c347`.

**Prereqs:** SSH to netcup works (`ssh bot-prd@152.53.91.108`, BatchMode OK). You know the hub's public HTTPS base URL (the origin serving the hub UI, e.g. the Vercel deployment) — referred to below as `<HUB_URL>`.

---

## Step 1 — Choose a shared token

```bash
openssl rand -hex 32     # copy this value → <TOKEN>
```

## Step 2 — Set the token + gateway URL on the hub server row

The server row whose `id` = the gateway's `serverId` (`1cf319d2-cad0-42d9-9bb5-151cef48c347`) must carry this token.

- **Via the hub UI (preferred):** Settings → Hosts → edit the host whose id matches the gateway `serverId` → set its **token** to `<TOKEN>` and **URL** to the gateway's reachable URL. Save. (`upsertServer` encrypts the token with AES-256-GCM into `servers.token`/`token_iv`.)
- **Verify the id matches.** If no host row shows that id, the gateway was registered out-of-band; create/edit the row so its `id` equals `1cf319d2-cad0-42d9-9bb5-151cef48c347` (the value the gateway already sends), or update the gateway `serverId` to match an existing row — they must be equal.

> Note: `getGoogleCredential` looks up `user_identities` by `userId` only (no tenant column), so any valid server token can fetch any linked user's ADC. Fine for this single-tenant deployment; revisit if multi-tenant.

## Step 3 — Patch the gateway config on netcup

```bash
ssh bot-prd@152.53.91.108
# back up first
cp ~/.minion/gateway.json /tmp/gateway.bak.$(date +%s).json

# patch gateway.hubMetrics with hubUrl + apiKey (serverId already present),
# preserving everything else. Paste <HUB_URL> and <TOKEN>.
python3 - <<'PY'
import json, os
p = os.path.expanduser("~/.minion/gateway.json")
cfg = json.load(open(p))
hm = cfg.setdefault("gateway", {}).setdefault("hubMetrics", {})
hm["enabled"] = True
hm["hubUrl"] = "<HUB_URL>"      # e.g. https://hub.example.com  (NO trailing slash needed)
hm["apiKey"] = "<TOKEN>"
json.dump(cfg, open(p, "w"), indent=2)
print("patched:", {k: ("SET" if hm.get(k) else hm.get(k)) for k in ["enabled","hubUrl","apiKey","serverId"]})
PY
```

## Step 4 — Restart the gateway

```bash
systemctl --user restart minion-gateway
# Caddy may 502 for ~8s during warmup — normal.
```

## Step 5 — Verify `REST valid: True`

```bash
ssh bot-prd@152.53.91.108 'python3 - <<PY
import json, os
hm = json.load(open(os.path.expanduser("~/.minion/gateway.json")))["gateway"]["hubMetrics"]
en = hm.get("enabled") is True
print("REST valid:", en and bool(hm.get("hubUrl")) and bool(hm.get("apiKey")) and bool(hm.get("serverId")))
PY'
```
Expected: `REST valid: True`.

## Step 6 — Smoke-test the endpoint from netcup

```bash
# Replace <USER_ID> with a hub user who has linked Google (Settings → Account).
ssh bot-prd@152.53.91.108 'curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer <TOKEN>" \
  "<HUB_URL>/api/gateway/google-adc?userId=<USER_ID>"'
```
Expected: `200` for a linked user, `404` for one with no Google identity, `401` if the token doesn't match the hub server row.

---

## Rollback

```bash
ssh bot-prd@152.53.91.108 'cp /tmp/gateway.bak.<ts>.json ~/.minion/gateway.json && systemctl --user restart minion-gateway'
```
(The code is safe to leave deployed regardless: with `hubUrl`/`apiKey` absent the client stays null and Google tools simply report "not connected" — no wrong-user credentials, no crash.)

## After T6 passes → T8 live E2E

1. Hub UI → Settings → Account: link a real Google account + a WhatsApp identity (real OTP).
2. WhatsApp the agent: "¿qué tengo en el calendario hoy?" → expect real calendar data.
3. SSH: confirm gateway log shows the whatsapp sender→userId resolve + a `google-adc` fetch; confirm the transient file under `~/.minion/agents/<agentId>/auth-credentials/gws/<session>_<email>.json` appears during the turn (mode `0600`).
4. Negative: a sender with no linked Google → agent says "not connected", no file written.
