# HUB_PAPERCLIP_SHARED_SECRET rotation

The shared secret signs hub→paperclip identity JWTs (HS256). Rotation requires
restarting hub and paperclip together to avoid a window where one verifies with
the old key while the other signs with the new one.

## Steps

1. Generate new secret: `openssl rand -base64 32`.
2. Set `HUB_PAPERCLIP_SHARED_SECRET` in the deployment environment consumed by
   `ops/compose.yml`. Follow the current secret-location contract in
   [`packages/env/README.md`](../packages/env/README.md#precedence-lowest--highest).
3. From the meta-repo root, run
   `docker compose -f ops/compose.yml up -d --force-recreate hub paperclip`.
4. Validate: `curl -sS https://<host>/api/pc/health` returns 401 without auth, 200 with a fresh hub session.

## Why no overlap window

Identity JWT TTL is 5 minutes — outstanding tokens fail verification after rotation.
That's acceptable because hub re-mints the JWT on every request. Worst case: in-flight
requests during the restart return 401 and the browser retries.

## Smoke-test checklist (run after first deploy or after rotation)

```bash
# 1. Caddy reachable
curl -sS http://localhost/api/pc/health

# 2. WebSocket gateway reachable
wscat -c ws://localhost/ws   # expect connect.challenge event

# 3. Hub SQLite volume persists across restart
docker compose -f ops/compose.yml restart hub
curl -sS http://localhost/api/health   # should still return 200

# 4. Postgres only has paperclip DB (no hub DB)
docker compose -f ops/compose.yml exec postgres psql -U minion -c '\l'
```

These checks are intentionally left as a manual follow-up step because building
all three service images (hub, paperclip, gateway) takes 10-20 minutes and is
out of scope for the initial compose-file landing.
