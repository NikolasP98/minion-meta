---
id: 046-gateway-memory-leak
title: Gateway memory leak — root cause fix (hotfix) and the maintenance hardening around it
status: draft
created: 2026-11-01
updated: 2026-11-01
repos: [minion, minion_hub, minion-meta]
tags: [infra, reliability, gateway]
---

# Feature Specification: Gateway memory leak — fix and hardening

**Feature Branch**: `docs/spec-046-gateway-memory-leak` (meta) · gateway fix → `DEV` (PR #364, hotfix) · hardening slices → gateway `DEV` / hub `master` (see plan.md)
**Created**: 2026-11-01
**Status**: Draft. **Hotfix declaration**: the root-cause fix (gateway PR #364) was written and opened on 2026-11-01 *before* this spec's plan and tasks existed, because both production gateways were crashing every 2–5 days and the next crash was due within a day. This spec records the evidence that justified it; plan.md and tasks.md cover the hardening the owner asked for. Tags are infra/reliability, not security/data, so the owner's gate is at merge, not at spec approval.
**Input**: Owner, 2026-11-01: "Please look into this and harden the maintenance and other possible improvements to the infra."

## Why now

The FACES gateway (the process that runs PANIK's WhatsApp number and the clinic's channels) died on Friday 2026-10-30 at 22:16Z with `FATAL ERROR: Ineffective mark-compacts near heap limit … JavaScript heap out of memory` after 44 hours up. It had done the same on 2026-10-26. The MINION-org gateway on the same host died the same way on 2026-10-29 after five days. Docker Swarm restarts them, so nothing stays down, but every crash falls inside business hours and drops the WhatsApp messages that arrive during the restart window, which the gateway cannot recover later (the same gap that lost the group messages investigated under spec 042). The process restarts at ~1 GB and climbs to the ~4 GB heap ceiling.

## AS-IS (evidence)

Anchors: gateway `minion` `origin/main @ 50a3036ad7f` (prod image `ghcr.io/nikolasp98/minion-ai@sha256:3a86fd16…`); netcup host `152.53.91.108`, swarm services `minion_gateway-faces` and `minion_gateway-default`; hub Turso table `gateway_heartbeats`; measurements 2026-11-01 22:50–23:59Z.

### A. Both gateways leak at a rate that tracks activity, not time
- Crash logs of the exited containers: FACES `minion_gateway-faces.1.pynituk…` heap 3,880 MB at 158,509 s (1.83 d) uptime, exit 1; FACES six days earlier same `FatalProcessOutOfMemory`; MINION `minion_gateway-default` heap 3,854 MB at 430,258 s (4.98 d). Swarm task history shows `task: non-zero exit (1)` for each.
- `gateway_heartbeats.memory_rss_mb` (one row per minute, server `1cf319d2…`): 1,025 MB at 2 h uptime (10-29 02Z) → 1,711 MB at 23 h → 2,446 MB at 47 h (Friday) → **2,538 → 2,660 MB across the whole weekend** (49 h → 94 h uptime, 10-31 01Z to 11-01 23Z). Weekday slope ≈ 30–40 MB/h; weekend slope ≈ 3 MB/h.
- Live `docker stats` 2026-11-01 22:52Z: both containers at ~2.6 GiB after 2–3 days up; host 15 GiB total, 4 GiB available, 2.4 GiB swap in use.
- The FACES log spam `[memory] qmd update failed … qmd is not built` (288 per day) is **not** the cause: the MINION gateway logs zero of them and leaks the same way.

### B. The weekday-only event stream is the hub's per-RPC WebSocket connections
- Hub `src/lib/server/gateway-rpc.ts:162-169`: every server-side RPC opens `new WebSocket(url, …)`, performs the `connect` handshake, calls one method, closes. Gateway logs show the hub's `agents.list`, `sessions.list`, `channels.status` arriving every ~30 s per open dashboard tab.
- Gateway `src/gateway/server/ws-connection/message-handler.ts:144`: `const configSnapshot = loadConfig();` runs on **every connection**, before the handshake completes.
- `src/config/io.ts:1212`: `DEFAULT_CONFIG_CACHE_MS = 200` (`OPENCLAW_CONFIG_CACHE_MS` env overrides). Hub RPCs are further apart than 200 ms, so nearly every one re-reads and re-validates the config file.

### C. The retained bytes are compiled JSON schemas held by a shared Ajv instance
- V8 sampling heap profile on the FACES gateway, 2026-11-01 23:25:28–23:40:28Z, under synthetic hub-like load (one fresh connection + `connect`, `channels.status`, `agents.list`, `sessions.list`, `health` every 1.2 s, 480 rounds, zero errors): heap used 564 MB → 1,010 MB; RSS 822 MB → 1,358 MB. Of 186 MB sampled live bytes, **173 MB** sit under `loadConfig → validateConfigObjectWithPlugins → validateConfigObjectWithPluginsBase → validateJsonSchemaValue → ajv compile` (95 MB in `compileSchema`, 68 MB in `validateConfigObjectWithPluginsBase`, 10 MB in `loadPluginManifest`).
- `src/config/validation.ts:177-230`: each validation calls `loadPluginManifestRegistry(...)`, which re-reads every plugin manifest, so each plugin's `configSchema` is a **new object with identical content** on every load; `:417` passes it with `cacheKey: record.schemaCacheKey ?? record.manifestPath ?? pluginId`.
- `src/plugins/schema-validator.ts:32-37` (pre-fix): `if (!cached || cached.schema !== params.schema) { ajv.compile(params.schema) … }` — identity comparison ⇒ recompile on every load, through the module-level `ajv` instance (`:3-7`).
- Ajv `8.20.0` (`node_modules/ajv/dist/core.js:100,291-313`): `this._cache = new Map()` keyed by the schema object; only `removeSchema()` deletes from it. Every compiled schema, its generated code, and the manifest objects it references stay reachable forever.
- Rate: 540 MB RSS over 480 rounds ≈ 1.1 MB per hub RPC.

### D. Observability and process limits as found
- The FACES gateway ships **no** heartbeats (zero `gateway_heartbeats` rows for server `a64274a8…`); the MINION gateway's rows are tagged `tenant_id = 21e0601b…` (the FACES org id). The hub host card therefore shows memory for one gateway, labelled with the wrong org.
- Swarm services have a 2 GiB memory *reservation*, no limit, no `NODE_OPTIONS`; Node's default heap ceiling (~4 GB here) is what ends the process. Restart policy `any`, delay 10 s, max 3 attempts per 120 s; update order stop-first; healthcheck TCP connect.
- The gateway handles `SIGUSR1` itself ("SIGUSR1 restart ignored"), so Node's inspector cannot be attached to a running process; profiling required a restart with `NODE_OPTIONS=--inspect=127.0.0.1:0` (done 2026-11-01 23:22Z, removed 23:51Z).
- Interim mitigation live since 2026-11-01 23:51Z on `minion_gateway-faces` only: service env `OPENCLAW_CONFIG_CACHE_MS=10000`. Same synthetic load, 269 rounds: RSS 778 → 869 MB, then flat for 30 s idle (vs +540 MB over 480 rounds without it).

## TO-BE

1. A gateway process does not grow with the number of dashboard requests it serves; a week of weekday use leaves RSS within a few hundred MB of its post-boot value.
2. Operators can see each gateway's memory on the hub host card under the right org, and get told when a gateway's memory is heading for its ceiling, before it crashes.
3. A gateway that *does* leak in future fails loudly at a known ceiling instead of by exhausting the host.
4. Gateway logs on the FACES tenant are not flooded by a memory plugin that cannot run.
5. Dashboard RPCs do not force the gateway to re-read and re-validate its config file hundreds of times an hour.

## DELTA (one slice each; see plan.md)

- **S0 (hotfix, already open: gateway PR #364 → `DEV`)**: validator cache keyed by schema content; the previous schema is evicted from Ajv when content really changes; unit test proves one compile for repeated equal content. Prod proof after deploy: heartbeat RSS flat across a weekday.
- **S1 heartbeat identity**: FACES ships heartbeats; each gateway's heartbeat carries its own org; hub host card shows both.
- **S2 memory alert**: hub raises one notification per gateway when RSS crosses a threshold or its 6-hour slope predicts the ceiling within 24 h; silence while the owner has acknowledged it.
- **S3 fail-loud limits**: explicit heap ceiling and swarm memory limit agreed with the host's budget, so a leak kills one process at a known size and the restart is logged as such.
- **S4 qmd on FACES**: either the memory plugin's binary is built into the image or the plugin is disabled for that tenant; zero `qmd update failed` lines per day.
- **S5 fewer config reloads**: default config cache TTL raised (or the hub reuses a connection); hub writes still apply within the existing hot-reload path.
- **Decision recorded, default no**: no scheduled off-hours restart once S0 is deployed and verified; the interim `OPENCLAW_CONFIG_CACHE_MS=10000` env is removed from the service when S5 lands.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - PANIK stays up through a work week (Priority: P1)

Clinic staff use PANIK on WhatsApp and the owner keeps the hub dashboard open all day. The gateway serving them must not crash from that use.

**Why this priority**: every crash loses minutes of inbound WhatsApp messages that cannot be recovered; two crashes a week on each gateway today.

**Independent Test**: deploy the fix, keep a dashboard tab polling for a weekday, read the gateway's memory series; it must not climb the way it did on 10-29/10-30.

**Acceptance Scenarios**:

1. **Given** the fixed gateway freshly started, **When** 500 dashboard-style requests are made in 10 minutes, **Then** process memory after the run is within 150 MB of its value before the run and stops growing when the requests stop.
2. **Given** the fixed gateway in production, **When** a weekday passes with the dashboard in use, **Then** the recorded memory series rises by less than 300 MB over 24 h (was ~1 GB).
3. **Given** a plugin's config schema genuinely changes (plugin upgraded), **When** config is reloaded, **Then** the new schema is enforced and the old one is no longer held.

---

### User Story 2 - The owner is warned before a gateway runs out of memory (Priority: P2)

**Why this priority**: the leak was found from crash logs after the fact; the data to see it coming was already being collected for one gateway and ignored.

**Independent Test**: feed a rising memory series for a test gateway; exactly one notification appears when the threshold or slope rule fires; none while the series is flat.

**Acceptance Scenarios**:

1. **Given** both gateways reporting, **When** the owner opens the hosts page, **Then** each gateway shows its own memory under its own org.
2. **Given** a gateway whose memory crosses the agreed threshold, **When** the next heartbeat lands, **Then** the owner receives one in-app notification naming the gateway and the value, and not another until it has dropped and risen again.
3. **Given** the FACES gateway, **When** it is running, **Then** heartbeats for it exist (today: none).

---

### User Story 3 - A future leak fails loud and alone (Priority: P3)

**Why this priority**: today a leaking process competes with the other gateway and the host's cron workers for 15 GiB and 8 GiB of swap before Node's own ceiling stops it.

**Independent Test**: start a gateway with the agreed limits and allocate past them in a test harness; the process exits with an out-of-memory signature at the agreed size and Swarm restarts it; the host stays responsive.

**Acceptance Scenarios**:

1. **Given** the agreed per-service limit, **When** a gateway exceeds it, **Then** only that container restarts and the other services' latency is unaffected.

---

### User Story 4 - Clean logs and fewer needless reloads (Priority: P4)

**Acceptance Scenarios**:

1. **Given** the FACES gateway after S4, **When** a day passes, **Then** zero `qmd update failed` lines are logged.
2. **Given** the gateway after S5, **When** the dashboard polls for an hour, **Then** the config file is read and validated at most a few times a minute, and a channel toggle saved in the hub still reaches the gateway within the existing hot-reload time.

### Edge Cases

- A plugin schema that changes content between two loads (upgrade in place): must recompile exactly once and drop the previous compiled copy.
- Two plugins sharing a cache key (manifest path reused): content keying must still distinguish them; today they would thrash.
- Heartbeats stop arriving (gateway down or misconfigured): the alert must say "no data", not stay silent.
- Memory drops because of a restart: the alert state resets; a crash-restart is itself an event worth a notification.
- Owner edits `gateway.json` on disk while the longer cache TTL is active: the hot-reload watcher path must still apply it; only the cached snapshot read by RPC handlers may lag by the TTL.
- Interim env `OPENCLAW_CONFIG_CACHE_MS` left in place after S5: harmless duplicate; the task list includes removing it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The gateway MUST NOT retain a new compiled validator when a plugin configuration schema is reloaded with unchanged content.
- **FR-002**: When a plugin configuration schema's content changes, the gateway MUST enforce the new schema on the next validation and MUST release the previous compiled copy.
- **FR-003**: Every production gateway MUST report a memory sample at least once a minute, attributed to its own gateway record and organisation.
- **FR-004**: The hub MUST notify the owner once when a gateway's memory crosses an agreed threshold or its recent slope predicts the process ceiling within 24 hours, and MUST notify when a gateway has reported no sample for 10 minutes.
- **FR-005**: Each gateway service MUST have an explicit memory ceiling such that exceeding it terminates only that process, with the reason visible in the service's task history.
- **FR-006**: The FACES gateway MUST NOT attempt to run a memory indexing binary that is absent from its image; either the binary is present or the plugin is off for that tenant.
- **FR-007**: Dashboard requests MUST NOT cause the gateway to re-read and re-validate its configuration file more often than the agreed cache interval, while hub-initiated configuration writes MUST still take effect within the existing hot-reload window.
- **FR-008**: Every production change in this feature (service env, limits, image) MUST be reversible by a single documented command and MUST be recorded in the task list with the time it was applied.

### Key Entities

- **Gateway heartbeat**: a per-minute sample of a gateway's uptime, memory and channel summary, attributed to a gateway record and an organisation; today present for one gateway, misattributed.
- **Memory alert state**: per gateway, the last threshold crossing and acknowledgement, so the owner receives one notification per episode.
- **Compiled schema cache**: per plugin, the validator compiled from the current schema content; bounded by the number of plugins.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero out-of-memory restarts on either production gateway in the 14 days after the fix is deployed (baseline: FACES 2 in 7 days, MINION 1 in 7 days).
- **SC-002**: Weekday memory growth per gateway under 300 MB per 24 h (baseline ≈ 1,000 MB).
- **SC-003**: 500 dashboard-style requests in 10 minutes move process memory by under 150 MB on a fresh gateway (baseline: 540 MB over 480 requests).
- **SC-004**: Both gateways visible with memory on the hosts page under the correct organisation within one minute of starting.
- **SC-005**: A simulated memory rise produces exactly one owner notification; a flat series produces none.
- **SC-006**: Zero memory-plugin failure lines in the FACES gateway log per day (baseline 288).
- **SC-007**: Every production step in tasks.md carries an applied-at timestamp and a one-line rollback.

## Assumptions

- The ~4 GB heap ceiling observed is Node's default for this host; an explicit ceiling will be chosen in planning against the host's 15 GiB and the two gateways plus hub cron workers it runs.
- Heartbeat storage stays where it is (hub Turso); no new store.
- "Notify the owner" means the hub's existing in-app notification channel, not a new alerting service.
- The hub's one-connection-per-RPC pattern is acceptable to keep; raising the gateway's config cache TTL is the smaller change, provided hub writes clear the cache (they do today).
- The interim `OPENCLAW_CONFIG_CACHE_MS=10000` on FACES is safe because hub-driven writes clear the cache; owner edits on disk may be served stale by RPC handlers for up to 10 s.
