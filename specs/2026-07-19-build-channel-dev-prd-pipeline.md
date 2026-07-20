# Build channels (DEV/PRD): protopi dev gateway, dual-channel CI, build picker, version-compat gate

Date: 2026-07-19
Status: SPEC — approved decisions marked ✅, open items marked ⛔
Scope: `minion/` (gateway + CI), `minion_hub/` (DB, server, UI), `packages/shared`

---

## 1. Goal

1. A **live DEV-build gateway on protopi**, fully connected and usable from the hub.
2. **Org → build policy**: MINION and PINONITE may switch between DEV and PRD. FACES is pinned to PRD.
3. **CI builds and deploys both channels** — `:dev` → protopi, `:prd` → netcup — automatically.
4. The hub's **server picker (minion-1 / minion-2) becomes a build picker (DEV / PRD)**.
5. **Version-compat gate**: gateway and frontend of the same channel must stay compatible; CI blocks the unsafe direction.

## 2. Discovered state (measured 2026-07-19, not assumed)

### 2.1 protopi — healthy, capable, gateway never installed
```
Linux protopi 6.12.62+rpt-rpi-2712 aarch64   (Raspberry Pi 5)
Docker 29.3.0        Swarm: inactive
RAM 7.9Gi total / ~5.2Gi available          Disk 917G / 791G free
tailnet 100.88.126.10 (active, direct 192.168.1.50)
user `minion` uid=1002 EXISTS; no /home/minion/.minion — gateway never deployed
already hosting: n8n(+postgres), home-assistant, prometheus, node-exporter,
                 portainer, radarr/sonarr/prowlarr/qbittorrent
```
Consequences: this is the **plain-Docker path, not Swarm** (netcup's `update-controller.sh` does not apply). It is a shared home server — the gateway must be resource-bounded and must not claim ports already in use.

### 2.2 Gateway rows are per-ORG, not per-host
| row | url | org |
|---|---|---|
| `minion-1` `870bd8f1…` | `wss://gateway.minion-ai.org` | MINION `c9e8dc46…` |
| `minion-2` `a64274a8…` | `wss://netcup.donkey-agama.ts.net:10000` | FACES SCULPTORS `21e0601b…` |

- **PINONITE `3e721e98…` has NO gateway row at all.**
- `user_gateway`: **all 7 users linked to BOTH rows** — which is why the picker reads as a host chooser and why selection was non-deterministic (`daf64d23` was a stopgap ordering fix).
- `minion-1`'s URL is the one that **refuses the WS upgrade** (returns HTTP 200) — see `gateway-selection-nondeterministic` memory.
- `gateway.org_id` is single-valued and is an *assignment*, not ownership. Two rows may share a URL.

### 2.2b There is NO redundancy today — corrected premise (measured)
`minion-1`/`minion-2` were believed to be redundant instances. They are not.
```
netcup hostname: v2202603342963439612          ← ONE host, one failure domain
minion_gateway-default | …@sha256:61494235… | 1/1
minion_gateway-faces   | …@sha256:61494235… | 1/1   ← same image digest, 1 replica each
```
They are **two tenanted services on the same box, reached by two different routes**:
`gateway.minion-ai.org` → Cloudflare (`2606:4700:…`) → default (MINION);
`netcup.donkey-agama.ts.net:10000` → direct tailnet `100.80.222.29` → faces (FACES).
Both return `/health` 200. If netcup dies, both die.

`1/1` is deliberate, not an oversight: the gateway is **single-writer per org** (SQLite + Baileys WA sessions on a local volume). Two instances serving one org would corrupt its channel state — which is why a naive round-robin balancer is not an option, and why replicas cannot simply be scaled up.

**Adding protopi introduces the first second failure domain in the fleet.**

### 2.3 CI already builds both channels
`.github/actions/docker-tag`: `refs/heads/DEV→:dev`, `refs/heads/main→:prd`.
`docker-release.yml` builds **amd64 + arm64** and pushes a multi-arch manifest on pushes to DEV and main.
**So the build half of requirement 3 already exists.** What is missing is a *deploy* path for `:dev`.
`deploy-production.yml` deploys only `:prd`, matrix-driven from `.github/servers/production.json`; runners already join the tailnet ("Connect to Tailscale" step), so protopi is reachable from CI in principle. `prd-protopi` is currently `enabled:false` (disabled earlier today because it failed SSH pre-flight on every run).

## 3. Decisions ✅

**D1 — Switch semantics: separate instance, separate state.**
```
netcup  :prd  ──  MINION-prd vol, PINONITE-prd vol, FACES-prd vol
protopi :dev  ──  MINION-dev vol, PINONITE-dev vol
switch = the hub connects to the other gateway; state does NOT follow
```
No volume migration is built or implied. WhatsApp/Baileys must be paired separately on DEV. This preserves the single-writer invariant and keeps PRD risk at zero.

**D2 — The gateway rows ARE the policy.**
Add one column, `gateway.channel ∈ {'dev','prd'}` (default `'prd'`). An org may use whichever gateways are assigned to it. No policy table, no rules engine.
```
FACES     → 1 row  (prd)          → picker hidden
MINION    → 2 rows (prd + dev)    → DEV | PRD toggle
PINONITE  → 2 rows (prd + dev)    → DEV | PRD toggle
```

**D4 — A human picks the CHANNEL; the system picks the INSTANCE.**
Assignment is a health-aware **lease**, not a round-robin. `(org, channel) → one healthy instance`, and every protocol (HTTP, RPC, WS) follows the lease holder — never a per-protocol independent choice, which is how the all-day intermittency happened (browser used an explicit host while the server guessed). The lease flips when the holder fails health checks. Until state replication exists (a separate project), a failover is honest about what it cannot carry: the org's channel state stays on the old host, so failover restores *service*, not *sessions*. `daf64d23`'s deterministic ordering is the stopgap this replaces.

**D3 — Version compatibility is asymmetric.** Frontend ahead of gateway is the safe direction and must be tolerated; gateway ahead of frontend is the breaking direction and is blocked in CI. (§7)

## 4. Target state

### 4.1 Gateway rows after this work
| channel | org | endpoint | notes |
|---|---|---|---|
| prd | FACES | `netcup/faces` | exists (`minion-2`), rename only |
| prd | MINION | `netcup/default` | **repoint** `minion-1` off the Cloudflare route that never carried WS |
| prd | PINONITE | `netcup/default` | **new row** (same instance as MINION-prd; a row is an assignment, not ownership) |
| dev | MINION | `protopi` | **new** |
| dev | PINONITE | `protopi` | **new** |

The `url` column stops being the identity of a gateway: identity is `(host, service, channel)`, and the URL is just the current route to it. Two routes to one service (Cloudflare vs tailnet) must never again present as two instances.

`user_gateway` must stop linking every user to every gateway; visibility is `active org → its rows` (§6.2).

### 4.2 protopi runtime
One gateway container serving the DEV channel (the gateway is org-scoping-capable internally, as netcup's `default` service already serves more than one org).
- image `ghcr.io/nikolasp98/minion-ai:dev` (arm64 leg of the existing manifest)
- state volume `minion_dev_state` → `/home/node/.minion`
- port bound to a free host port (⛔ **verify** — 18789/18790 appeared free in the port scan but the scan was truncated; confirm at execution)
- `--memory` cap and `--restart unless-stopped`, so a dev build can never starve Home Assistant / n8n
- reachable from the hub over the tailnet: `wss://protopi.donkey-agama.ts.net:<port>`

## 5. Workstreams

Dependency order: **A → B**, **C → D**, **E** independent. C/D/E may start immediately.

### WP-A — protopi host provisioning + live dev gateway
A0. Verify free port; verify `minion` user can run docker (add to `docker` group if not — `nikolas` already is).
A1. Install CI's deploy SSH key for the deploy user; record which user CI uses (`user` vs `admin_user` in the registry).
A2. `docker login ghcr.io` on the host (or pull via a token in the deploy step).
A3. Create `/home/minion/.minion`, the state volume, and a `docker-compose.dev.yml` (single service, memory-capped, restart policy, `MINION_STATE_DIR` pinned, port published on the tailnet interface).
A4. First manual pull+run of `:dev`; verify `/health` returns `200 {"ok":true}` and that the WS upgrade actually succeeds — **not** just an HTTP 200, which is precisely how `minion-1` fooled us.
A5. Record the gateway token and register the row (feeds WP-C).

### WP-A RESULT (done 2026-07-19) — live, with five constraints the rest of the work inherits
Live at `wss://protopi.donkey-agama.ts.net` (443, no port suffix) / raw `ws://protopi.donkey-agama.ts.net:18789`. Volume `minion_dev_state`, compose `/home/minion/dev/docker-compose.dev.yml`, arm64 digest `…fc20bba1`. Proven: `HTTP_UPGRADE_STATUS 101` → real `connect.challenge` → `CONNECT_OK {"version":"dev","host":"protopi","protocol":3}`; a wrong token gets `unauthorized: gateway token mismatch`.

1. ★★**`network_mode: host` is REQUIRED on protopi.** Docker bridge networking there is broken for inbound traffic (pre-existing — n8n has the same symptom). A published bridge port was completely unreachable *while `/health` still looked plausible*. WP-B must not use bridge port publishing on this host.
2. ★★**Watchtower on protopi watches every container with no label filter.** Left alone it would silently auto-restart the gateway on any `:dev` push and bypass WP-B's health gate. Neutralised with `com.centurylinklabs.watchtower.enable: 'false'` — keep that label on any new container.
3. **`mem_limit` is inert on this Pi** — no memory cgroup controller (`cgroup.controllers` = `cpuset cpu io pids`; needs `cgroup_enable=memory` in `/boot/firmware/cmdline.txt` + reboot). Docker logs `Limitation discarded`. Mitigated with `oom_score_adj: 800`. RSS ~54 MB.
4. ⚠**Funnel is ON** (pre-existing `tailscale serve` config) — this DEV gateway is reachable from the public internet, token-protected. The same config carries `/oauth-callback` and `/notion-oauth-callback`, so disabling Funnel likely breaks those. OPEN DECISION.
5. **`:dev` arm64 image defects** (gateway still runs): `better-sqlite3` native binding missing for arm64 ⇒ **secrets manager unavailable**; `/db/migrations/004_free_tier_users.sql` ENOENT; Control UI assets absent. The secrets gap will bite when pairing channels on DEV — i.e. the main thing a DEV sandbox is for. Fix belongs in the gateway image, not here.

Unproven: reboot survival (`restart: unless-stopped` set, `docker.service` enabled, but the host was not rebooted). Disclosed: the gateway token is stored plaintext at `/home/minion/dev/.env` (0600, owner `minion`) because compose requires it.

### WP-B — CI deploys `:dev` → protopi
B1. Re-enable `prd-protopi` in `.github/servers/production.json`, renaming it to `dev-protopi`, and give the registry a `channel` field (`dev`|`prd`).
B2. Diagnose the historical SSH pre-flight failure (host key? user? tailnet ACL for the runner?) and fix the root cause — do not paper over it with `continue-on-error`.
B3. Split the deploy matrix by channel: a push to `DEV` deploys `channel=dev` targets; a push to `main` deploys `channel=prd` targets. Today `deploy-production.yml` is `workflow_run` on Docker Release for `branches:[main]` only — add the DEV branch equivalent.
B4. protopi uses the **plain-Docker** deploy path (pull + up), not `update-controller.sh`.
B5. Health-gate the deploy: fail the job if `/health` or the WS upgrade does not come back.

### WP-C — data model + gateway rows
C1. Migration: `alter table gateway add column if not exists channel text not null default 'prd'`.
  ⚠ Ship the migration **with** the schema change and apply it before anything reads the column — see `additive-column-breaks-identity-select`; an unmigrated column 500s every consumer because Drizzle expands `.select()` into an explicit column list.
C2. Backfill/repoint rows per §4.1, including the new PINONITE-prd and the two protopi dev rows.
C3. Fix `minion-1`'s broken URL (root cause of the WS-upgrade failure) or retire the row.
C4. Server-side: `listGatewayHostsForUser` / `loadHostsForUser` scope by **active org**, and expose `channel`. `orgAssignedHostId` becomes "the active org's row for the selected channel".
C5. Fail closed: an org with no row for a channel cannot select it — enforced server-side, not only in the UI.

### WP-D — hub UI: server picker → build picker
D1. `HostPill` / `HostDropdown` / `HostsOverlay` render **channel**, not host name.
D2. Hide the control entirely when the active org has one channel (FACES).
D3. Selection key moves from host id to channel; the existing sessionStorage-only rule stays (a stale pick must never pin an org to a channel it lost).
D4. Reuse `SegmentedControl` for the DEV|PRD toggle — it already exists and is the governed control for this shape.
D5. UI work goes through the `ui-design-governance` skill; `bun run lint:design && bun run lint:tokens` after.

### WP-E — version-compat gate (D3)
E1. Single source of truth in `@minion-stack/shared`: `PROTOCOL_VERSION` (integer, bumped on breaking frame/RPC changes) plus the gateway's semver.
E2. Gateway exposes both on `/health` (extend the existing payload) and in the connect handshake.
E3. Hub declares `MIN_GATEWAY_PROTOCOL` — the oldest gateway it can talk to.
E4. **CI rule, asymmetric:**
  - `frontend_protocol > gateway_protocol` → **WARN** (frontend ahead; it must degrade gracefully). Allowed.
  - `gateway_protocol > frontend_max_supported` → **FAIL** the deploy (gateway ahead breaks the client).
  - equal → pass.
E5. Runtime counterpart: on connect, if the gateway's protocol is newer than the hub supports, surface one clear banner instead of a cascade of broken calls.
E6. The check runs per channel: DEV gateway vs DEV frontend, PRD vs PRD.

### WP-F — assignment lease + health-aware balancer (D4)
F1. **Instances** become first-class, distinct from gateway *rows*: `(host, service, channel)` — today `netcup/default` (prd), `netcup/faces` (prd), `protopi` (dev).
F2. Health probe per instance: `/health` 200 **and** a real WS upgrade (an HTTP 200 alone is exactly how the broken route passed for weeks). Probe on a timer + on connect failure.
F3. Resolver: `(org, channel) → healthy instance`, one authority used by every protocol. Hub server-side resolves once and hands the client a single endpoint; the client never picks.
F4. Failover flips the lease when the holder is unhealthy, and **surfaces plainly that channel state did not move** — no silent partial recovery.
F5. Single-writer safety: never hand two instances the same `(org, channel)` concurrently. The lease is the mutex; write it down, don't infer it.
F6. Replaces `daf64d23`'s ordering stopgap and the client-side `sessionStorage` host pick.
F7. Explicitly OUT of scope: state replication / volume handoff. Failover restores service, not sessions.

## 6. Risks
- **Shared home server.** protopi runs Home Assistant and n8n. Memory-cap the container; never take a port already bound.
- **Live co-agent in `minion_hub`.** Another session is committing there. All hub work must happen in a **git worktree**, not the shared tree.
- **Production DDL.** `.env.local` points at the live Supabase; C1 is production schema. List pending migrations first, apply deliberately.
- **`minion-1` is currently broken**, so MINION's PRD path is already degraded — C3 is a prerequisite for honestly claiming "MINION can switch DEV/PRD".
- **netcup inventory now verified** (§2.2b): two services, one host, same digest, 1/1 each. Reachable as `niko@152.53.91.108`; the tailnet name/IP hung — use the public IP for CI and manual work.
- **Failover cannot carry state.** WP-F restores service, not WhatsApp sessions. Say so in the UI; a silent partial recovery is worse than an honest error.
- **A 200 on `/health` proves nothing about WS.** The Cloudflare route served `{"ok":true}` while never carrying an upgrade. Every health check in WP-B/WP-F must test the upgrade itself.

## 7. Done means
- protopi serves `:dev` and survives a reboot; `/health` 200 **and** a real WS upgrade.
- Pushing to gateway `DEV` redeploys protopi with no human action; pushing to `main` still redeploys netcup.
- MINION and PINONITE show a DEV|PRD toggle that actually switches the live connection; FACES shows none and cannot reach DEV even by hand-crafting a request.
- A gateway newer than the frontend fails CI; a frontend newer than the gateway does not.
- `(org, channel)` resolves server-side to exactly one healthy instance, all protocols follow it, and killing that instance flips the lease without a human touching anything.
