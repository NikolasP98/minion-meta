# Tasks: Gateway memory leak — fix and hardening

**Input**: spec.md, plan.md in `specs/046-gateway-memory-leak/`
**Gates**: gateway = `pnpm vitest run test/ci/` + targeted vitest + `oxfmt`/`oxlint` on touched files (never the full suite); hub = `bun run check`, vitest on touched files (`HUB_TEST_DB_URL`), `lint:design && lint:tokens` when `.svelte` touched, `i18n:compile` when strings added.
**Owner-run / prod steps are marked ⚑ and carry an applied-at timestamp once done.**

## Phase 0 — Evidence and interim mitigation (done 2026-11-01)

- [x] T001 Sampling heap profile on the FACES gateway under synthetic hub load (`NODE_OPTIONS=--inspect=127.0.0.1:0`, 23:22–23:51Z, removed) — evidence in spec §AS-IS C
- [x] T002 ⚑ `docker service update --env-add OPENCLAW_CONFIG_CACHE_MS=10000 minion_gateway-faces` — applied 2026-11-01 23:51Z; rollback `docker service update --env-rm OPENCLAW_CONFIG_CACHE_MS minion_gateway-faces`
- [x] T003 ⚑ Same env on `minion_gateway-default` — applied 2026-11-02 00:05Z (RSS 2.55 GiB → fresh boot); rollback `docker service update --env-rm OPENCLAW_CONFIG_CACHE_MS minion_gateway-default`

## Phase 1 — S0 hotfix (gateway PR #364, open)

- [x] T004 [S0] Content-keyed cache + `ajv.removeSchema` in `minion/src/plugins/schema-validator.ts`
- [x] T005 [S0] Unit test `minion/src/plugins/schema-validator.test.ts` (one compile for equal content; recompile + evict on change)
- [ ] T006 [S0] CI green on PR #364 (the worktree's `test/ci/` run had 2 env-caused failures: pi-ai export resolution, better-sqlite3 staging)
- [ ] T007 [S0] Local proof: fresh gateway, 500 synthetic RPCs in 10 min → RSS delta < 150 MB (script from this session: connect + `channels.status`, `agents.list`, `sessions.list`, `health`)
- [ ] T008 ⚑ [S0] Owner merges #364 → DEV; release DEV→main; `sudo /opt/minion-swarm/update-controller.sh update`
- [ ] T009 [S0] Prod proof: `gateway_heartbeats.memory_rss_mb` rises < 300 MB over the next weekday on both gateways; record in this file

## Phase 2 — S1 heartbeat identity

- [ ] T010 [S1] Find why FACES ships no heartbeats (`hubMetrics` push config vs Turso creds) and why MINION's rows carry `tenant_id 21e0601b…` (`minion/src/gateway/server.impl.ts:810-825`, `minion/src/events/turso-sync.ts`)
- [ ] T011 ⚑ [S1] Config edit per tenant so each gateway reports under its own `serverId` and org; applied-at + rollback here
- [ ] T012 [S1] Hub host card shows both gateways' memory under the right org (`minion_hub/src/server/services/architecture.service.ts:425-600`); `lint:design && lint:tokens`
- [ ] T013 [S1] Proof: rows for `a64274a8…` within 1 min; PR → `master`

## Phase 3 — S2 memory alert (hub)

- [ ] T014 [S2] Alert rule service: threshold 3 GB, slope over 6 h predicting the ceiling < 24 h, no-data 10 min; one notification per episode with acknowledgement state (table or settings row; migration via the hub ledger `scripts/db-migrate.ts`)
- [ ] T015 [S2] Wire into the existing heartbeat ingest or the jobs tick; in-app notification via the existing notifications service; Paraglide strings + `i18n:compile`
- [ ] T016 [S2] Unit test with synthetic series (flat → 0 notifications; rising → 1; drop + rise → 2; gap → no-data)
- [ ] T017 [S2] PR → `master`; staging proof screenshot in the PR

## Phase 4 — S3 fail-loud limits

- [ ] T018 [S3] Choose `--max-old-space-size` and swarm `--limit-memory` against the 15 GiB host (two gateways + hub cron workers + swap); heap limit strictly below the container limit; write the numbers in `deploy/swarm/` with the reasoning
- [ ] T019 ⚑ [S3] `docker service update --env-add NODE_OPTIONS=… --limit-memory … <service>` per service, after T009 is green; applied-at + rollback here
- [ ] T020 [S3] Proof: scratch container allocating past the heap limit exits with the OOM signature and only it restarts

## Phase 5 — S4 qmd on FACES

- [ ] T021 [S4] Decide: build `@tobilu/qmd` in `minion/Dockerfile` (release) or disable the memory plugin for the FACES tenant (config); smaller change wins unless FACES uses memory search
- [ ] T022 ⚑ [S4] Apply; proof = zero `qmd update failed` lines in 24 h of `docker logs`

## Phase 6 — S5 fewer config reloads

- [ ] T023 [S5] `DEFAULT_CONFIG_CACHE_MS` 200 → 10 000 in `minion/src/config/io.ts:1212`; confirm every write path calls `clearConfigCache()` (`io.ts:929`, `server-methods/plugins.ts:527`, `server-methods/tools.ts:387`) and that the file watcher (`config-reload.ts`) applies external edits independently of the cache; test beside `io.ts`
- [ ] T024 [S5] PR → `DEV`; after release, ⚑ `docker service update --env-rm OPENCLAW_CONFIG_CACHE_MS` on both services (undo T002/T003)
- [ ] T025 Proposal entry: hub opens one WebSocket per RPC (`minion_hub/src/lib/server/gateway-rpc.ts:162-169`) — connection reuse deferred; `proposals/` + no code TODO needed (not a code gap, a design choice)

## Decision log

- 2026-11-01: no scheduled off-hours restart once S0 is verified in prod (default). Revisit only if T009 fails.
