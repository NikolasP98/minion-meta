# Shells — Golden Agents on exe.dev VMs

**Status:** Draft
**Date:** 2026-05-20
**Author:** orchestrator session

## Summary

Introduce **Shells**: long-lived exe.dev VMs that each host exactly one autonomous agent ("golden agent") with full admin rights inside its own VM. Users provision a shell, pick a harness (Claude Code, HERMES, Codex, etc., chosen at VM image), configure it, and the agent operates inside its shell. The gateway brokers invocations; HERMES (or whichever harness) is authoritative for state on the VM. The hub exposes `/shells` as a first-class surface.

Out of scope: multi-tenant VMs, in-VM cluster orchestration, anything that requires modifying HERMES itself.

## Constraints

exe.dev plan ceiling — drives every sizing decision:

- **50 VMs cap**
- **2 vCPU + 8 GB RAM shared** across all VMs
- **25 GB total disk**
- **200 GB monthly egress**
- **$20/mo Shelley allowance**

Real concurrency ceiling is ~5–10 active shells, not 50. Hibernation is therefore a v1 feature, not v2.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | 1 VM = 1 agent, full admin in VM | User mandate; matches "agent has its own world" framing |
| D2 | Long-lived shells with archive-on-idle (24h default) — exe.dev has no native suspend, so "sleep" = backup + `rm`, "wake" = `new` + restore from B2. Always-on for frequently-used shells (opt-out per-shell). | Plan tier can't sustain 50 active; archive frees both VM slot and disk. See Q2 below. |
| D3 | HERMES (or harness) authoritative for in-VM state; gateway pulls on demand | Keeps gateway thin; matches harness models that persist their own memory |
| D4 | Hub surface = `/shells` (own route, not folded into existing agents list) | Conceptually distinct from in-process agents; lifecycle ops are VM-shaped |
| D5 | Harness selection = exe.dev image (image=hermes, image=claude-code, …) | Immutable per shell; no runtime bootstrap surface to maintain |
| D6 | Transport = WS reverse-register (VM dials into gateway) | Reuses `@minion-stack/shared` frame protocol; handles ephemeral exe.dev IPs; supports streaming events agent→user natively |
| D7 | Periodic backups, cadence configurable per-shell in settings | User mandate; budget-aware (egress + Shelley) |

## Architecture

### Lifecycle

```
[Hub UI: "Spin up shell"]
  → POST /api/shells { name, image, region, harnessConfig }
  → gateway.shells.provision RPC
     → quota check (≤50, plus active-RAM heuristic)
     → exe.dev API: new VM with chosen image
     → VM boots → harness starts → opens outbound WS to gateway
     → connect.challenge → connect{ role:"shell", shellId, harness, capabilities }
     → gateway marks shell "online", persists shellId↔vmId binding
  → hub poll/WS event: shell goes from "provisioning" → "online"
```

### Invocation

```
[Hub or channel]
  → gateway.shells.invoke { shellId, sessionId, input }
  → gateway looks up live WS connection by shellId
  → forwards req frame to VM
  → VM's harness streams back event{ delta | tool | final } frames
  → gateway fans out to caller (hub stream, channel, etc.)
```

### Archive (replaces hibernation — exe.dev has no suspend/resume)

```
gateway tracks lastInvokeAt per shell
  → after archiveIdle (default 24h, per-shell configurable, "Always-on" disables)
     - req{ method:"shell.backup", target:"b2://..." } → bridge tars + uploads
     - on backup success: ssh exe.dev rm <vmname>
     - marks shell "archived" — vm slot + disk freed
  → on next invoke (or hub "Wake"):
     - ssh exe.dev new <vmname> --image=<harness>-shell-v1 --disk=<size>
     - bridge boots → connects WS → req{ method:"shell.restore", source:"b2://..." }
     - bridge downloads + extracts archive → spawns harness with restored state
     - gateway holds invoke until "online", then forwards
     - cold-restore budget: ~60–180s (provision + boot + B2 pull + harness ready) — needs spike
```

### Backup

```
per-shell cron in gateway (configurable cadence: hourly | daily | weekly | manual)
  → wakes shell if asleep (cheap if recent)
  → req{ method:"shell.backup", target:"b2://…" }
  → harness packages its state → uploads to configured backup bucket
  → gateway records backupId, size, timestamp
```

## Cross-Project Impact

| Project | Change |
|---|---|
| `@minion-stack/shared` | New role `"shell"` in connect frame; new methods `shells.{invoke,cancel,backup,restore,health,archive,wake,list,quota}`; new events `shell.{online,archived,backup-done,delta,final,error}`. Minor bump. |
| `minion/` (gateway) | New `src/shells/` module: `registry.ts`, `provider.ts`, `lifecycle.ts` (new/restart/rm via SSH), `archive.ts` (was hibernation.ts), `backup.ts`, `quota.ts`. New RPC handlers. |
| `minion/packages/shells-bridge/` | **NEW package** — Node 22, ~300 LOC, bundled into each harness's exe.dev image. Speaks `@minion-stack/shared` upstream + ACP/JSON-RPC downstream. Owns backup/restore tar streams to B2. Published under `@minion-stack/shells-bridge`. |
| `minion/scripts/provision-vm.sh` | Switch from `POST /exec` HTTP to canonical `ssh exe.dev <cmd> --json`. Accept `--image=<harness>-shell-v1`, `--disk=<size>` (default 4G), `--memory=<size>` (default 512MB), emit machine-readable JSON. Read API key + SSH key from vault. |
| `minion_hub/` | New `/shells` route: header quota strip (3 pills), list, provision form (harness picker / disk / memory / region / archive cadence / backup cadence), per-shell detail page (status, logs, last invoke, manual Sleep/Wake/Backup/Restart/Delete, restore-from-archive history). Uses existing PluginIframe/ECharts patterns. |
| `minion_hub/src/server/db/schema/` | New `shells` table: id, vmId, name, image (harness), region, status `provisioning\|online\|archived\|error`, createdAt, lastInvokeAt, archiveIdleMs (null = always-on), diskGB, memoryMB, backupCadence (`hourly\|daily\|weekly\|manual`), backupTarget (b2 url), lastBackupAt, lastBackupId, lastBackupBytes. Plus `shell_backups` table for history (shellId, archiveId, bytes, createdAt, restoredAt). |
| Secrets vault | New scope `exedev`: `api_key` (must have ls/new/rm/restart/resize/ssh/shelley/billing perms), optional `ssh_private_key` (gateway-owned, auto-generated on first probe). |

No paperclip impact in v1 (paperclip consumes the gateway WS API; if it needs shell access later, the `agent.invoke` path already covers it).

## Resolved Questions (2026-05-20 research pass)

### Q1 — Harness contract: thin WS bridge inside the VM image

HERMES exposes four surfaces per [Nous Research docs](https://hermes-agent.nousresearch.com/docs/developer-guide/architecture): CLI, internal gateway, **ACP (Agent Client Protocol, JSON-RPC over stdio)**, and an API server (mentioned, undocumented). It does **not** speak `@minion-stack/shared` frames natively.

**Decision**: each harness ships with a tiny **WS bridge process** in its baked exe.dev image. Bridge speaks our frame protocol upstream to the gateway and ACP/JSON-RPC downstream to the harness. The bridge is the contract — harnesses stay unmodified.

```
[exe.dev VM image: <harness>-shell-v1]
  └─ systemd: shells-bridge.service
       ├─ outbound WSS → gateway (frame protocol, role="shell")
       └─ spawns + pipes JSON-RPC ↔ hermes / claude-code / codex (ACP)
```

`shells-bridge` lives as a new package under `minion/packages/shells-bridge/` (Node 22, ~300 LOC, vendored `@minion-stack/shared` WS client). It maps:

| Frame in | ACP method out |
|---|---|
| `req{ method:"shell.invoke", params:{ sessionId, input } }` | `session/prompt` or harness-specific equivalent |
| `req{ method:"shell.cancel" }` | `session/cancel` |
| `req{ method:"shell.backup", params:{ target } }` | shells out: `tar czf - ~/.hermes/state \| b2 upload -` |
| `req{ method:"shell.health" }` | bridge-local ping (no harness call) |
| ACP `session/update` | `event{ type:"shell.delta", ... }` |
| ACP `session/done` | `event{ type:"shell.final", ... }` |

### Q2 — Cold-start budget: not applicable; hibernation reshaped to archive/restore

**exe.dev has no suspend/resume/snapshot.** Confirmed by scraping the full CLI doc index ([exe.dev/docs/api](https://exe.dev/docs/api), [exe.dev/docs/list](https://exe.dev/docs/list), [exe.dev/docs/cli-new](https://exe.dev/docs/cli-new), `cli-restart`, `cli-rm`, `cli-resize`). Lifecycle commands are: `new`, `ls`, `restart`, `rm`, `resize`, `rename`, `set-region`, `cp`, `share`, `ssh`, `domain`, `integrations`, `comment`, `browser`, `doc`, `shelley`, `ssh-key`, `billing`. There is no off state — VMs are always-on once created. The API is **SSH-based** (`ssh exe.dev <cmd> --json`); the `POST /exec` HTTP path in the current script works but is non-canonical.

**Replaces D2**. New lifecycle:

```
state: provisioning  ← new
       → online        (ws connected)
       → archived      (state backed up to B2, vm rm'd, slot freed)
       → online        (provision fresh vm + restore state from B2)
       → error
```

- "Archive" replaces "hibernate". User-facing language in hub stays "Sleep" / "Wake" but the implementation deletes the VM.
- Cold-restore budget: **30s provision + harness boot + state restore from B2 ≈ 60–180s estimated**. Spike required to confirm before P4 ships.
- For frequent-use shells, archive is too slow — those should stay always-on (user opts out of auto-archive in shell settings).
- Auto-archive default: **after 24h idle** (not 15 min — too aggressive given restore cost).

### Q3 — Disk pressure: cap shells well below 50, archived shells free disk

25 GB total across all VMs. With `--disk=4G` per VM (HERMES + skills DB + working dir realistic baseline) the **hard ceiling is 6 active shells**. With `--disk=2G` it's 12.

**Decision**: provisioning form defaults to `--disk=4G`, hub-side quota guard refuses `new` if `sum(active_disk) + new_disk > 22GB` (3 GB headroom). Archived shells free both VM-slot and disk. User can override per-shell up to 10 GB.

### Q4 — Quota widget: header strip on `/shells`

Three pill widgets in a thin header row on `/shells`, always visible:

```
[ SHELLS  3 / 50 ]   [ DISK  12 GB / 25 GB ]   [ SHELLEY  $4.20 / $20 ]
```

- "Shells" pill turns amber at ≥40, red at 50
- "Disk" pill turns amber at ≥20 GB, red at 22 GB
- "Shelley" pill turns amber at ≥$16, red at $19
- Same strip mirrored on provision form to preview the post-provision numbers

Backed by gateway RPC `shells.quota` which calls `ssh exe.dev ls --json` + `ssh exe.dev shelley --json` (or `billing` if the latter is the right command — needs verification).

### Q5 — Failure modes

| Failure | Behavior |
|---|---|
| VM crash (bridge WS drops, no reconnect in 30s) | Gateway issues `ssh exe.dev restart <vm>`, holds invokes 60s for reconnect; if still failing → mark `error`, surface in hub with one-click "Restart" / "Archive" actions |
| WS drop mid-invoke | Gateway buffers pending `event` frames 10s; on reconnect with matching `sessionId` replays, otherwise fails the invoke with `SHELL_DISCONNECTED` |
| exe.dev API outage | Provisioning disabled, banner in hub `/shells`, existing online shells unaffected; retry quota check every 30s |
| Backup upload failure | Exponential backoff (1m/5m/30m), surface per-shell in detail page; after 3 failures mark `backup-stuck`, do not auto-archive until cleared |
| Bridge process crash inside VM | systemd `Restart=always` (baked into image); if 5 restarts in 60s, bridge calls `shells.fatal` once before dying, gateway marks `error` |
| Cold-restore fails (B2 unreachable / corrupt archive) | Provision VM but skip restore, surface `restore-failed` to user with download-archive-manually option |

### Q6 — Auth gateway → exe.dev: confirmed via secrets vault

Add scope `exedev` to the vault with field `api_key` (must have `ls,new,rm,restart,resize,ssh,shelley,billing` permissions). Probe handler: `ssh exe.dev help --json` returns exit 0 ⇒ Configured. Update `minion/scripts/provision-vm.sh` to read from vault when scope present, fall back to env for ops/recovery. SSH key handling: `ssh-key` command lets us upload a gateway-owned key; gateway holds private key in vault (`exedev.ssh_private_key` field, optional, generated on first probe).

## Implementation Phases (proposed, not committed)

- **P0 — Spec & contracts** (this doc, plus `@minion-stack/shared` protocol additions, no behavior)
- **P1 — `shells-bridge` package + protocol harness** (Node bridge that speaks frames↔ACP, tested with a stub harness; ships to npm but not yet baked into images)
- **P2 — Gateway registry + WS reverse-register** (mock bridge connects from localhost; verify protocol; no exe.dev calls)
- **P3 — Provisioner integration** (gateway calls `ssh exe.dev` via vault-loaded creds; quota guard; new/rm/restart lifecycle; B2 backup wired through bridge)
- **P4 — Hub `/shells` surface** (header quota strip + list + provision form + detail page; manual Sleep/Wake actions)
- **P5 — Archive automation** (idle timer + automatic archive→rm + cold-restore-on-invoke; behind feature flag; spike cold-restore time first)
- **P6 — Harness images** (build + publish `hermes-shell-v1`, `claude-code-shell-v1`, `codex-shell-v1` images to a public registry exe.dev can pull; image catalog in hub provision form)

Each phase is a separate PR. P1–P4 unblock real usage; P5–P6 harden the platform.

## References

- exe.dev CLI commands index: [exe.dev/docs/api](https://exe.dev/docs/api) (SSH-based: `ssh exe.dev <cmd> --json`)
- exe.dev lifecycle commands confirmed: `new`, `ls`, `restart`, `rm`, `resize`, `rename`, `set-region`, `cp`, `share`, `ssh`, `domain`, `integrations`, `comment`, `browser`, `doc`, `shelley`, `ssh-key`, `billing` — **no `stop`/`start`/`suspend`/`resume`/`snapshot`**
- HERMES architecture: [hermes-agent.nousresearch.com/docs/developer-guide/architecture](https://hermes-agent.nousresearch.com/docs/developer-guide/architecture) — CLI / internal-gateway / ACP (JSON-RPC over stdio) / API server
- Existing provisioner: `minion/scripts/provision-vm.sh` (51 LOC, merged in PR #157, commit `991d93bfc`)
- Frame protocol: `@minion-stack/shared` — `req` / `res` / `event` with `connect.challenge` handshake
- Cross-ref: secrets vault doctrine (`specs/2026-05-20-centralized-secrets-vault.md`) — new `exedev` scope
