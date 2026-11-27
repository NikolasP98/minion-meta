# Quickstart: proving 042 end to end

Every slice is proven on the local stack first (FR-014). Prod steps are owner-run env edits.

## Prerequisites
- Hub worktree with `bun install`; gateway worktree with `pnpm install && pnpm build`.
- Docker running (hub QA Postgres + gateway container + valkey).
- Never run the full gateway suite; gate = `pnpm vitest run test/ci/`. Hub tests need `HUB_TEST_DB_URL` and `SUPABASE_DB_URL` unset.

## Local stack
1. Hub: `bun run dev:local` → QA DB on 54422, hub on `http://127.0.0.1:5199`. The QA seed (after S1) contains two `gateway` rows (`qa-gw-a` url `http://127.0.0.1:18789`, `qa-gw-b` url `http://127.0.0.1:28789`) and one `channels` row on each.
2. Gateway: `docker compose -f docker-compose.yml -f docker/compose.local-hub.yml up` with `MINION_CONFIG_DIR=~/.minion-qa` whose `gateway.json` has `gateway.hubMetrics = {enabled:true, hubUrl:"http://host.docker.internal:5199", apiKey:<qa token>, serverId:<qa-gw-a id>}` and env `CHANNEL_CONFIG_SOURCE=db ORG_SCOPE_SOURCE=db CHANNEL_RUNTIME_APPLY=1`.
3. Proof runner: `bun scripts/qa/proof-042.ts --slice <n>` (hub) drives the steps below and fails on any missing step.

## Slice proofs
- **S1 (hydrate identity + observable)**: runner calls gateway `health` → `channelConfig.mirrorSize == 1` and the account is `qa-gw-a`'s; `qa-gw-b`'s account is absent. `GET /api/internal/channels/resolved` without the header → 401.
- **S1 (signal targeting)**: runner `PUT`s `group_allow_from: ['*']` on `qa-gw-a`'s row → within 10 s `health.channelConfig.lastSignalAt` advances and the mirror entry shows the new list; the compare log line names the account.
- **S2 (prod flip, owner)**: on netcup, edit the tenant's `gateway.env` to `CHANNEL_CONFIG_SOURCE=db`, `ORG_SCOPE_SOURCE=db`, `CHANNEL_RUNTIME_APPLY=1`, restart the service; hub host card shows `source: db`, `mirrorSize = N`, `jsonFallbacks = 0`; 24 h later zero `accountOrgs` diffs. Rollback = reverse edit + restart.
- **S3 (hub writer cutover)**: runner records `gateway.json` hash, toggles every channel surface through the hub API (enable, allowlist, transport knob, markOnline, history sync, org-config tick), re-reads the hash → unchanged; each change visible in `health` within 10 s.
- **S4 (operator commands + shrink)**: runner sends `/allowlist add +51…` through the gateway test channel → reply "Managed in the hub…", file hash unchanged. `minion config shrink` dry-run lists the rule keys; `--apply` leaves `authDir`/tokens/type defaults; gateway restart boots `N accounts hydrated, 0 json fallbacks`.
- **S5 (settings table + editor)**: `PUT /api/gateways/{qa-gw-a}/settings/hooks` with a valid document → 200 version 2; with `gateway` section → 400; with a schema violation → 400.
- **S6 (gateway settings apply)**: after the PUT, `health.settingsConfig.versions.hooks == 2` within 10 s and the hooks reload log line appears; `PUT …/plugins` → `pendingRestart` contains `plugins`, process uptime unchanged; stop the hub, restart the gateway → `settingsConfig.snapshotAt` set, sections present, traffic served.

## Expected outcomes checklist (maps to SC)
- SC-001/002: rule visible on gateway ≤10 s; PANIK groups readable ≤1 min after the hub save (prod, after S2 on FACES).
- SC-003/004: `jsonFallbacks = 0`, zero `accountOrgs` diffs 24 h; shrunk file has no rule keys.
- SC-005: `grep -rn "await.*hydrate\|fetch(" src/web/inbound src/channels/*/accounts.ts` shows no per-message network call (test asserts `resolveWhatsAppAccount` is sync).
- SC-006/007: hub stopped 30 min → no channel restarts; hot/restart classes behave as in S6.
- SC-008: the runner's output for each slice is attached to its PR.
