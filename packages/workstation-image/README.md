# Minion workstation image

`minion-workstation-v1` is the portable OCI source of truth for Minion cloud
workstations. It is based on digest-pinned exeuntu (Ubuntu 24.04) and keeps the
provider-specific VM shape (2 vCPU, 8 GB RAM, 100 GB disk) outside the image.

## Contents

- Minimal Xfce desktop on TigerVNC display `:1`.
- Raw VNC bound only to `127.0.0.1:5901`.
- noVNC/websockify on `0.0.0.0:8000`, intended to sit behind exe.dev's
  authenticated HTTPS proxy.
- Hermes `v2026.7.7.2` at commit
  `9de9c25f620ff7f1ce0fd5457d596052d5159596` (the default agent runtime).
- OpenCode `1.17.18`, `@nikolasp98/minion` `2026.7.11-dev`, an explicit
  `@minion-stack/drone` `0.3.0` runtime, and the Claude Code, Codex, and Pi
  binaries inherited from exeuntu.
- Shells Bridge `0.1.4` as the enabled VM-side registration, harness, and
  backup control-plane client, with `rclone` for B2 archive transport.
- NotesMD CLI `0.3.6`, available as both `notesmd-cli` and `obsidian-cli`.
- `minion-preview`, a zero-dependency preview supervisor with bounded TTLs and
  private exe.dev URLs for static sites or framework dev servers.
- An interactive browser. The current exe.dev amd64 image uses integrity-pinned
  Google Chrome through the `chromium` and `browser` commands. The arm64 image
  uses snapshot-pinned GNOME Web through `browser`, because Google does not
  publish Chrome for Linux arm64.

All Ubuntu packages resolve against the immutable
`20260712T000000Z` Ubuntu snapshot. Downloaded Node, OpenCode, NotesMD, Chrome,
and Minion artifacts are checksum-verified. Exact build inputs are recorded in
[`manifest/versions.json`](manifest/versions.json).

## Build and test

exeuntu supports amd64 and arm64. exe.dev currently provisions amd64, which is
the release target:

```sh
docker build --platform linux/amd64 -t minion-workstation:local .
./scripts/smoke.sh minion-workstation:local
```

The normal smoke test validates versions, image metadata, systemd enablement,
the raw-VNC loopback boundary, and noVNC configuration without booting systemd.
An optional privileged boot test starts the complete desktop stack and fetches
the noVNC page:

```sh
BOOT_TEST=1 ./scripts/smoke.sh minion-workstation:local
```

## Runtime behavior

The inherited exeuntu command remains `/usr/local/bin/init`, so systemd is PID
1 on exe.dev. These units are enabled for `multi-user.target`:

- `minion-vnc.service` runs Xfce as the provider's unprivileged `exedev` user.
- `minion-novnc.service` serves noVNC on port 8000 and relays only to the
  loopback VNC listener.
- `minion-workstation-env.service` copies only exe.dev's injected `SHELLS_*`
  values from container PID 1 into `/run/minion-workstation/bridge.env` as
  `root:agent:0640`.
- `shells-bridge.service` runs as the isolated `agent` user and receives the
  allowlisted provisioning values through that transient environment file.

The bridge starts only when the transient environment file is non-empty. A
manually booted image therefore leaves it inactive instead of entering a
restart loop; gateway-provisioned VMs start it after exe.dev injects the
registration and harness variables.

VNC intentionally uses `SecurityTypes=None`: its socket cannot leave loopback,
and browser access must be protected by exe.dev's authenticated port proxy. Do
not publish port 5901 or expose port 8000 through an unauthenticated load
balancer.

No model-provider or application credentials are baked into the image. Supply
credentials after provisioning through the gateway/vault integration.

## Agent-hosted previews

exe.dev privately proxies ports 3000–9999, independently of the noVNC port.
Agents can serve a static draft for two hours and return the printed URL:

```sh
minion-preview start ./site --port 4173 --ttl 2h --name draft
```

Framework dev servers can be supervised the same way. `HOST` and `PORT` are
provided to the child process, and the full process group is terminated when
the TTL expires:

```sh
minion-preview run --port 4173 --ttl 2h --name app -- npm run dev
```

Use `minion-preview status`, `url`, and `stop` to manage active previews. TTLs
are limited to 30 seconds through 24 hours so forgotten draft servers do not
consume CPU indefinitely. Port 8000 remains reserved for the GUI.

## exe.dev provisioning

Once a registry digest has been built and pushed, provision by digest rather
than by tag:

```sh
ssh exe.dev new \
  --name=mn-<opaque-org-prefix>-ws-01 \
  --image=ghcr.io/nikolasp98/minion-workstation-v1@sha256:<digest> \
  --cpu=2 --memory=8GB --disk=100GB \
  --tag=minion --tag=managed --tag=role-workstation \
  --tag=org-<opaque-org-prefix> \
  --comment=Minion-managed-workstation \
  --json
```

This package does not push an image or create VMs. Those are explicit release
and provider-control-plane operations.
