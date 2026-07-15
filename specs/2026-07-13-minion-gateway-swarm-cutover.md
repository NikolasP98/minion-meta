# Minion Gateway Docker Swarm Cutover

Date: 2026-07-13  
Status: single-node production cutover complete; multi-node HA pending

> **Architecture direction:** this document is the historical record and rollback
> contract for the first container cutover. The target org-agnostic, multi-service,
> multi-node design is specified in
> [`2026-07-13-org-agnostic-ha-service-fabric.md`](./2026-07-13-org-agnostic-ha-service-fabric.md).
> Its router/runtime split supersedes the org-named service topology as the desired
> end state; the current topology remains the safe production baseline until the
> newer design's phase gates pass.

## Cutover outcome

- Swarm stack `minion` is live with `gateway-default` and `gateway-faces` at
  one healthy replica each.
- Deployed source revision: `7e8e46c1f2b9d8e1a65cf74e682c7b246252256d`.
- Published image: `ghcr.io/nikolasp98/minion-ai:swarm-7e8e46c1-r5`, digest
  `sha256:728c654c2bb8e2099de9ceb2fad45ee94413e215d686baa77b9b4470357ccdeb`.
- The old default and Faces user-systemd units are disabled and inactive;
  Caddy and Tailscale remain the edge/load-balancer layer.
- A forced Faces task replacement preserved two sessions, the `MEMORY.md`
  checksum, five memory notes, and all 83 knowledge-graph objects.
- The default public URL resolves to the 25-agent default volume. The Faces URL
  resolves to the four-agent Faces volume and exposes the personal agent's
  existing memory file to prompt-section loading.
- This is a functional one-node Swarm. It is not yet host-failure-tolerant;
  portable RWO storage and two additional managers are still required for HA.

## Verified starting point

- One Netcup Docker host: 8 vCPU, 15 GiB RAM, 512 GB ext4 root disk.
- `/vol` is a directory on the root filesystem, not a separately mounted block
  volume.
- Two user-systemd gateways currently own ports 18789 (default) and 18790
  (Faces).
- Caddy/Cloudflare routes the public gateway to 18789. Tailscale Serve/Funnel
  routes the default gateway to 18789 and the Faces gateway to 18790.
- The Faces personal agent's authoritative state is present: `MEMORY.md`, five
  memory notes, 83 knowledge-graph objects, sessions, and no bootstrap marker.
- The Docker registry tags in the historical `minion` repository are stale and
  cannot be used for this cutover. The image is built from the current
  `NikolasP98/minion-ai` main commit and pinned by digest.

## Workload model

The safe scaling unit is an organization gateway, not another replica of the
same organization gateway. Each organization service has exactly one active
writer because it owns:

- SQLite databases and WAL files;
- channel polling/stream sockets and WhatsApp credentials;
- cron, hooks, event relays, and message-ledger consumers;
- mutable agent workspaces, sessions, browser profiles, and memory indexes.

Running two tasks for one organization creates split-brain behavior even if the
filesystem is shared. Telegram 409 polling conflicts on the current host already
demonstrate the channel-owner failure mode. Swarm updates therefore use
`stop-first`; `start-first` is prohibited for gateway services.

## Production topology

```text
Cloudflare -> host Caddy :8443 -> Swarm host port 18789 -> gateway-default (1)
Tailscale Serve/Funnel    -> Swarm host port 18789 -> gateway-default (1)
Tailscale :10000          -> Swarm host port 18790 -> gateway-faces   (1)

gateway-default -> minion_default_state -> /home/node/.minion
gateway-faces   -> minion_faces_state   -> /home/node/.minion
both gateways   -> encrypted overlay -> existing Valkey
```

Only the edge proxies use ports 18789/18790. A persistent IPv4/IPv6 firewall
rule drops direct traffic to both ports on `eth0` while preserving loopback and
Tailscale access.

Swarm control and data addresses use the host's Tailscale address. Additional
nodes must reach 2377/tcp, 7946/tcp+udp, and 4789/udp over the private network.
The application overlay is encrypted and uses a dedicated 10.240.0.0/16 pool.

## Storage contract

Phase 1 uses pre-created, labelled Docker volumes with the local driver. They
grow until the host filesystem is full; there is no static per-volume size.
State is mounted directly at `MINION_STATE_DIR=/home/node/.minion`. A second
mount of the same volume at the former absolute path preserves old database and
agent paths without an OS symlink or duplicate state tree.

Local volumes do not move between nodes. Placement is constrained to the node
label `minion.storage=netcup-local`; if that node fails, the task remains
unavailable rather than starting with an empty volume elsewhere.

For genuine dynamic provisioning and failover, use an RWO block-volume driver
that can create, attach, expand, detach, and reattach a volume. It must pass:

1. SQLite WAL, locking, fsync, and crash-recovery tests;
2. single-attach fencing under network partition;
3. task reschedule and node-loss attach/detach tests;
4. online provider expansion plus filesystem growth;
5. snapshot restore and whole-volume backup drills.

NFS/shared-write storage is not approved for live gateway SQLite state. Object
storage is appropriate for backups and immutable media, not the active state
directory.

## Reliability controls

- one replica per organization, placement-constrained to the volume node;
- TCP health probe independent of optional Control UI assets;
- restart attempts bounded inside a two-minute window;
- stop-first image updates with automatic rollback monitoring;
- two-minute graceful stop for WAL flush and channel shutdown;
- immutable image revision/digest recorded in the service;
- runtime credentials held as versioned Swarm secrets;
- gateway-managed Tailscale disabled so tasks cannot rewrite host-wide routes;
- state volumes and Swarm Raft state backed up separately;
- disk, inode, memory, restart-count, health, and backup-age alerts required.

A single manager is a functional Swarm but not HA. Production host-failure
tolerance requires three managers (odd-number quorum) distributed across
failure domains, plus at least two storage-capable workers. The stateful org
service still requires portable RWO storage before it can fail over.

## Agent-runtime compatibility

The image includes Node 22, Bun, Chromium, Claude Code, qmd, mcporter, gh, gog,
ffmpeg, SQLite, poppler, uv, and PDF tooling. The host Tailscale socket and
static CLI binary are mounted for existing skills. Provider credentials and
the gateway token are injected at runtime; they are not baked into the image.

Intentional isolation changes:

- no host Docker socket;
- no host SSH-agent socket;
- no host root filesystem or systemd control;
- shell tools see the container filesystem plus the assigned org volume.

Workflows that relied on host Docker, host systemd, arbitrary `/home/bot-prd`
files, or the host SSH agent must move to explicit remote tools or dedicated
worker services. This is a security gain but a compatibility loss.

## Cutover and rollback

1. Build and smoke-test the current image.
2. Initialize Swarm, overlay, node labels, secrets, volumes, and firewall.
3. Pre-seed volumes while the OS services remain live.
4. Checkpoint SQLite, stop both OS gateways, and confirm ports are closed.
5. Final `rsync --delete` into each volume and normalize ownership to UID 1000.
6. Deploy the stack and wait for both tasks to become healthy.
7. Verify WebSocket RPC, agent rosters, Faces sessions/memory, channel ownership,
   browser/runtime binaries, restart persistence, proxy URLs, and disk usage.
8. Disable (do not delete) OS gateway units after the soak check.

Rollback removes the Swarm stack, restores the original systemd services, and
leaves the original OS state directories untouched. Any writes made after the
cutover must be reverse-synced from Docker volumes before rollback if they need
to be preserved.

## Gains and losses

Gains:

- immutable/reproducible runtime and dependency set;
- desired-state restart, health, rollback, and placement controls;
- explicit org-volume ownership and fewer path-routing ambiguities;
- versioned secret distribution and smaller host privilege surface;
- repeatable addition of org gateways and future worker nodes.

Losses/trade-offs:

- local Docker volumes alone do not create HA or portable storage;
- container images and copied volumes consume additional disk;
- host-integrated agent commands require explicit replacement;
- stop-first upgrades create a short per-org interruption;
- Swarm, overlay, image, volume, and Raft backups add operational complexity;
- a one-node Swarm still has one host, disk, manager, and network failure domain.
