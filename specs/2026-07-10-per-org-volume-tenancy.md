# Per-Org Volume Tenancy — Horizontal Scale Design

**Date:** 2026-07-10
**Status:** Spec (recon-verified against gw/hub/paperclip code; not scheduled)
**Prereq reading:** `specs/2026-07-10-gateway-update-system.md` §3 (blue-green rejection)

> **Superseded target:** this document remains the discovery record for volume
> tenancy and single-writer constraints. Its org-affined gateway instance and
> shared-fallback target is superseded by
> [`2026-07-13-org-agnostic-ha-service-fabric.md`](./2026-07-13-org-agnostic-ha-service-fabric.md),
> which splits stateless gateway routers from lease-bound runtime workers and makes
> missing org mappings fail closed.

## 1. The model

> "Orgs would then not be owners of the gw instances, but owners of the volumes that contain their data. The gw shouldn't hold any org code/data in it."

- **Org = owner of a volume, never of a gateway.** The volume holds everything org-specific: `gateway.json`, SQLite DBs, channel creds (WhatsApp/Baileys, Telegram), agent workspaces, logs. No org data ever lives inside a gateway's own filesystem/image.
- **Gateways = a fungible pool of stateless compute.** Any instance can serve any volume. An instance *leases* exactly one org-volume, becomes the sole owner of that org's channels while it holds the lease, and hands the volume to any other instance (any code version) on release. Assignment is a mutable lease, not ownership — no gateway is "org X's gateway."
- **Volume = tenancy boundary = lease unit.** One live leaseholder per volume, always. Concurrency is arbitrated at the lease layer, so SQLite stays (no Postgres migration needed for this).
- **Purity invariant:** a gateway instance with no lease holds zero org data. Anything an instance writes outside its leased volume (package dir, `/tmp`, home dir) must be org-free — this is a checkable property (§6 M1 audit) and the definition of "stateless" here.

What this buys: horizontal scale **across orgs** (N gateways serving N volumes, zero channel conflict), hard tenant isolation (replaces today's soft filtering), rolling per-org updates. What it does **not** buy: zero-downtime within one org — single-owner channels (Baileys 1 socket/number, Telegram getUpdates 409) make an update a lease handoff with a few seconds of QR-less reconnect per org. That limit is protocol-imposed and permanent.

## 2. Recon findings (what already exists)

### 2.1 Gateway (`minion/`) — nearly volume-ready already

| Primitive | Where | State |
|---|---|---|
| State/code separation | `src/config/paths.ts` `resolveStateDir()` — `MINION_STATE_DIR` env override; code lives in the npm-global pkg dir, all mutable state under the state dir | ✅ exists |
| Everything routes through state dir | SQLite DBs (`node:sqlite` + `better-sqlite3`), channel creds `credentials/whatsapp/<accountId>/creds.json`, agent workspaces `agents/<id>/agent`, `gateway.json`, logs, `update-pending.json` | ✅ verified — no stray state outside it found |
| Exclusive lock | `src/infra/gateway-lock.ts` — `wx`-file at `os.tmpdir()/minion-<uid>/gateway.<sha1(configPath)[:8]>.lock` (host-local, keyed by config path — **not** on the volume; `paths.ts:266`), PID+start-time liveness, 30s stale reap, acquired in `run-loop.ts:26`, released `run-loop.ts:161` | ✅ exists — keyed per config path, so it already acts as a **same-host per-volume lease**: different volumes → different locks, second instance on the same volume rejected. Being host-local it carries no cross-host state; under single-attach volumes that's fine (attach/detach is the cross-host arbiter, and a re-attached volume meets no stale lock on the new host). |
| Drain | `waitForActiveTasks(30s)` in `run-loop.ts:62`, `deferGatewayRestartUntilIdle` (`restart.ts:128`, polls queue+pending-replies+embedded-runs to zero), `drainInFlightTurns` (marks interrupted + apology) | ✅ exists |
| Channel start/stop | `createChannelManager` (`server-core/server-channels.ts:117`): `startChannels()`, `startChannel/stopChannel(channel, accountId)`; health monitor already drives these dynamically | ✅ exists |
| Org awareness | `org-scope.ts` + `channels.accountOrgs` + JWT `orgId` claim — **soft, per-request filtering inside one shared process** | ⚠️ exists but `resolveAccountOrgIds` **fails open** (`plugins/org-enforcement.ts:36`): empty/missing map ⇒ account visible to every org |

Cross-host caveat: the lock's PID-liveness check assumes same-host PIDs. With **single-attach block volumes** that's fine — the cloud's attach/detach is the cross-host arbiter; the lock file only needs to win same-host races, which it does. Network filesystems (NFS) are excluded: SQLite + advisory locks over NFS are unreliable. **Constraint: org volumes are single-attach block devices (or plain directories on one host), never network FS.**

### 2.2 Hub (`minion_hub/`) — schema provisioned, routing not

- `gateway` + `user_gateway` PG tables already exist (`@minion-stack/db/pg/schema/gateway.ts`) with `url`, encrypted token, and an **`orgId` column** (today used only for metrics-ingest auth, not routing).
- Routing is **per-user, single shared gateway**: `resolveCredentialsForUser` (`src/lib/server/gateway-rpc.ts:58`) walks user→system→env; `ensureDefaultGatewayForUser` (`gateway.pg.service.ts:268`) pins every new user to netcup — its own comment says "Replace… once multiple gateways exist."
- Browser holds one WS to one active host (`hosts.svelte.ts`); org filtering is client-side after receipt.
- Only two `/api/gateway/*` routes actually call the gateway (`notify-user`, `update`); the rest hit Postgres directly.

### 2.3 Paperclip (`paperclip-minion/`) — the control-plane primitives already exist

- **`environments`** table: driver abstraction (`local`/`ssh`/`sandbox`/`plugin`) — a `gateway` driver slots in idiomatically.
- **`environment_leases`** table: status/policy/provider/`providerLeaseId`/`expiresAt`/`cleanupStatus` — **an existing lease table**; volume leases are new rows, not a new pattern.
- **`workspace_runtime_services`**: registry of long-running services with `provider`/`providerRef`/`port`/`url`/`healthStatus` — a gateway-instance registry maps onto it directly.
- **`local-service-supervisor.ts`**: PID/PGID process supervision with orphan adoption and group kill — paperclip already supervises long-running OS processes.
- The openclaw-gateway adapter dials a **single** WS URL per agent config (`execute.ts:665`) — per-org URLs are a config-shape change, not an architecture change.
- Deploy topology: paperclip (podman quadlet) and the gateway are separate units on the same netcup VPS; gateway is already treated as a remote WS endpoint.

## 3. Design

### 3.1 Volume layout

```
/vol/orgs/<orgId>/            ← the org volume (block device mount or plain dir)
  gateway.json                ← per-org config (channels, accounts, agents)
  *.sqlite                    ← all DBs (memory, ledger, secrets, files, …)
  credentials/                ← WhatsApp/Telegram/OAuth creds
  agents/                     ← agent workspaces
  logs/
```

(The lease lock itself is host-local — `os.tmpdir()/minion-<uid>/gateway.<sha1(configPath)>.lock`, keyed by the volume's config path — not a file on the volume. See §2.1.)

An instance binds to a volume with two env vars — no gateway code change:

```
MINION_STATE_DIR=/vol/orgs/<orgId>
MINION_CONFIG_PATH=/vol/orgs/<orgId>/gateway.json   # implied by state dir; explicit for clarity
```

### 3.2 Instance = systemd template unit (Phase 1)

`minion-gateway@.service` (template on `%i` = orgId), same shape as today's `minion-gateway.service`:

```
Environment=MINION_STATE_DIR=/vol/orgs/%i
ExecStart=… gateway run
Restart=always
KillMode=control-group
```

- **Code is shared** (one npm-global install), state is per-org. A publish updates code once; **restarts roll per-org** (`systemctl restart minion-gateway@a minion-gateway@b …` sequentially). This *is* the sequential-update scenario, delivered at the fleet level: while org A's instance restarts (~15s), every other org is untouched; progress = orgs restarted / total.
- **Port allocation:** each instance needs its own `gateway.port`. Deterministic: `18789 + index` recorded in the hub `gateway` row (which already stores `url`).
- **Local duplicate defense:** the existing host-local lock keyed by the volume's
  config path rejects a second same-host instance. It is not inside the volume and
  does not provide cross-host fencing.
- **Update system compatibility:** the shipped updater (webhook → pending → `update.run` → watchdog/rollback) runs per instance. The watchdog's npm rollback is fleet-wide (shared code), so Phase 1 policy: **update = npm swap once + rolling restarts; watchdog armed only on the first (canary) org**; remaining orgs restart only after the canary passes.

### 3.3 Handoff sequence (update or rebalance, per org)

1. Quiesce: `deferGatewayRestartUntilIdle` → `waitForActiveTasks(30s)` (existing).
2. Drain ledger: `drainInFlightTurns` marks in-flight turns interrupted (existing).
3. Stop channels + release lock + exit (existing shutdown path).
4. New instance (any node that can attach the volume): attach → acquire lock → `startChannels()` → creds resume, no QR.

Observed cost per handoff: seconds. Same-node restart and cross-node move are the same sequence; cross-node adds volume detach/attach.

### 3.4 Hub routing (Phase 1, the only real new code)

- Populate `gateway.orgId` as an **assignment key, not ownership**: "this instance currently serves org X's volume." Null = shared/default pool (today's netcup behavior). Semantics documented in schema; Phase 2 moves assignment into paperclip leases and the hub column becomes a read-model of the lease.
- `resolveCredentialsForUser`: resolve the user's **active org → currently-assigned gateway row** before the existing user/system/env fallback chain. **No assigned gateway → fall through to current behavior unchanged** (backwards compatible; nothing breaks on today's single shared gateway).
- Replace the netcup pin in `ensureDefaultGatewayForUser` with org-assignment lookup (same fallback).
- Browser host selection: derive active host from active org's assignment instead of localStorage-only; keep manual override.
- WS events need no fan-out work: each browser already connects directly to (now) its org's gateway, so isolation is physical — the client-side `filterAgentsByOrg` name-rule hack and the fail-open `accountOrgs` risk both become moot *within* an instance (each instance simply has only its own org's accounts).

### 3.5 Control plane (Phase 2 — paperclip)

Only needed when instances become dynamic (real orgs signing up, >1 node):

- `environments` gains a `gateway` driver; org volume = environment; instance assignment = `environment_leases` row (`providerLeaseId` = volume/attachment id, `expiresAt` for renewal).
- `workspace_runtime_services` registers running gateway instances (url/port/health).
- Scheduler: provision volume on org creation → assign to a node → start unit → write `gateway` row in hub DB. Rolling update = iterate leases, run §3.3 per org, canary-first.
- Local supervision reuses `local-service-supervisor` patterns (or stays systemd via `systemctl` calls — prefer systemd; don't build a second supervisor).

### 3.6 Explicitly out of scope

- Postgres migration for gateway DBs — the lease provides single-writer; SQLite stays.
- Zero-downtime within one org — impossible under single-owner channel protocols.
- Network-FS shared volumes — SQLite locking unreliable; single-attach block only.
- Live dual-instance per org / LB in front of one org — rejected in update-system spec §3, unchanged.

## 4. Phases

| Phase | Work | Trigger |
|---|---|---|
| **0 — volume down-payment** | Move prod state dir onto a mounted volume (`MINION_STATE_DIR`), add to deploy script + runbook. Snapshot/backup win; zero code. | Now, if desired |
| **1 — multi-instance, one node** | Split tooling (§6) + systemd template unit + hub org→gateway routing (§3.4) + rolling-restart update policy (§3.2). No paperclip involvement. | ≥2 real orgs with their own channel accounts |
| **2 — control plane** | Paperclip `gateway` driver + volume leases + scheduler + provisioning API (§3.5); cloud volumes when >1 node. | Orgs onboard self-serve / >1 node needed |

Phase 1 implementation surface: (a) gateway repo — `org-volume-split` migration tool + purity audit + systemd template + runbook; (b) hub repo — org→assignment routing with safe fallback. Both are buildable and testable **now** without touching prod; the prod cutover (§6) is a separately-gated ops step.

## 5. Security notes

- Per-org volumes convert org isolation from **fail-open soft filtering** (today's `accountOrgs`) to **physical separation** — strictly stronger; this is the biggest non-scale benefit.
- Volume contents include channel creds and secrets DBs → volumes encrypted at rest; per-org gateway tokens (hub `gateway` table already stores ciphertext+IV per row).
- The volume-split migration (§6) is the one step that can regress isolation; treat it as a security change with per-account verification.
- Purity invariant (§1) is auditable: after a lease release, diff the instance's non-volume filesystem — any org-identifying residue is a bug.

## 6. Migration: shared prod → per-org volumes (Phase 1 cutover)

Today's prod: one gateway, one state dir, ~2 orgs (MINION personal + FACES) sharing it. The split is the riskiest step in the whole design; it moves live WhatsApp creds and a fail-open org map. It is executed by a purpose-built, **dry-run-first** tool, never by hand.

### 6.1 Data classification (what splits how)

| Data | Split rule |
|---|---|
| `gateway.json` | Partition by org: each volume gets only its org's channel accounts, agents, and the matching `accountOrgs` entries. Shared/global settings duplicated. |
| Channel creds `credentials/<channel>/<accountId>/` | **Move (not copy)** to the owning org's volume, byte-identical layout — Baileys resumes from identical `creds.json` with no QR. An account present in two volumes = split-brain; the tool must guarantee exactly-one placement. |
| Agent workspaces `agents/<agentId>/` | Move per agent→org mapping (explicit input; no inference). |
| Per-agent SQLite (memory, etc.) | Moves with its agent. |
| Global SQLite (message ledger, events, files, security log) | **Copy to each volume, or fresh-start per org** — operator choice per DB. History is org-mixed; copying leaks cross-org history into both volumes, fresh-start loses it. Default: FACES volume starts fresh; personal volume keeps originals. Decision recorded in the migration manifest. |
| `secrets.sqlite`, `credentials/oauth.json` | Partition by owner where attributable; unattributable entries stay on the default volume and are flagged in the report. |
| Logs | Stay on the old volume; new volumes start clean. |

### 6.2 Cutover sequence

```
M0  Snapshot the current state dir (tar + volume snapshot). Verify restorable.
M1  Audit: run the purity/inventory tool → manifest of accounts, agents, creds
    dirs, DBs, and their org attribution. HUMAN reviews + fills the org map
    (accountOrgs is fail-open — absent tags must be resolved explicitly, never
    defaulted).
M2  Dry-run split → per-volume file plan + verification report. No writes.
M3  Stop shared gateway (drain: deferGatewayRestartUntilIdle → drainInFlightTurns).
M4  Execute split (move creds/agents, write per-org gateway.json, DB strategy
    per manifest).
M5  Verify BEFORE start: per-account exactly-one-volume check; per-volume config
    validates against zod schema; no account in volume A tagged for org B.
M6  Start minion-gateway@<orgA>, verify channels connect WITHOUT QR, then @<orgB>.
M7  Flip hub routing (set gateway.orgId assignments). Verify each org's hub
    session sees only its own agents/channels.
M8  Soak 24h. Old state dir kept read-only for 30 days, then archived.
```

### 6.3 Rollback

Any failure before M7: stop new instances, restore M0 snapshot to the original path, start the old unit — total loss bounded by drain time. After M7: flip `gateway.orgId` back to null (hub falls through to shared behavior) and restart the old unit; new-volume writes since M4 are lost for that org (bounded by soak monitoring). Rollback is rehearsed on the M0 snapshot copy before the real run.

### 6.4 Risk register

| Risk | Mitigation |
|---|---|
| WhatsApp QR re-pair (creds corrupted/moved wrong) | Move whole auth dir byte-identical; M0 snapshot; M6 verifies session resume before proceeding; per-account rollback = restore that dir from snapshot |
| Cross-org bleed during split (fail-open `accountOrgs`) | M1 human-reviewed org map, no defaulting; M5 automated exactly-one + tag-consistency check; M7 per-org visual verification |
| Double ownership (two instances, one volume) | Host-local wx-file lock rejects a same-host duplicate; qualified provider/node fencing is required across hosts |
| Split-brain channel account (creds in two volumes) | Tool moves (never copies) creds; M5 exactly-one check is a hard gate |
| Port collision between instances | Deterministic per-org port (18789+index) recorded in hub `gateway` row; template unit fails fast on bind error |
| Update watchdog rollback is fleet-wide (shared npm code) | Canary policy (§3.2): watchdog armed on first org only; remaining orgs restart after canary passes |
| Hub routing regression for existing users | Assignment lookup falls through to current shared-gateway chain when unset; flip is per-org and reversible (null the column) |
| Global-DB history loss / cross-org leak | Explicit per-DB choice in manifest (copy vs fresh); default keeps originals on personal volume, fresh for new org |
| Backup gap during cutover | M0 snapshot is a gate, not a suggestion; M8 keeps old dir 30 days |
