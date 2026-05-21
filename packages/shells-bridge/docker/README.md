# Shell harness images

OCI images for the **Shells** subsystem (golden agents on exe.dev VMs).

Each image bakes:

- `@minion-stack/shells-bridge` (the in-VM bridge process)
- A `systemd` unit that auto-starts the bridge on VM boot
- A specific harness binary (HERMES / Claude Code / Codex)
- An `agent` user with passwordless sudo (full admin per spec D1)

The base image is harness-agnostic; the three harness images `FROM` it.

## Catalog

| Image | Harness | Tag |
|---|---|---|
| `minionstack/shells-bridge-base` | (base only — not for direct use) | `v1` |
| `minionstack/hermes-shell` | HERMES (Nous Research) | `v1` |
| `minionstack/claude-code-shell` | Claude Code | `v1` |
| `minionstack/codex-shell` | OpenAI Codex | `v1` |

## Build

```bash
cd packages/shells-bridge/docker

# Local build (loads into local docker, no push)
./build-all.sh

# Build + push (requires `docker login` to your registry first)
./build-all.sh --push --registry=ghcr.io/nikolasp98

# Multi-arch
./build-all.sh --push --platform=linux/amd64,linux/arm64
```

The build script reads `SHELLS_BRIDGE_VERSION` (default `0.1.0`) and passes it
to the base Dockerfile so `npm install -g @minion-stack/shells-bridge@<v>` is
pinned. Bump after each `shells-bridge` release.

## Run on exe.dev

```bash
ssh exe.dev new --name=my-hermes --image=minionstack/hermes-shell:v1 \
  --memory=512MB --disk=4GB --region=lax --json \
  --env=SHELLS_SHELL_ID=shl_... \
  --env=SHELLS_GATEWAY_URL=wss://gateway.example.com/shells-bridge \
  --env=SHELLS_DEVICE_TOKEN=... \
  --env=SHELLS_HARNESS=hermes \
  --env=SHELLS_HARNESS_VERSION=2026.5.0 \
  --env=SHELLS_HARNESS_CMD="hermes acp" \
  --env=SHELLS_BACKUP_TARGET="b2://minion-shells/shl_.../" \
  --env=RCLONE_CONFIG_B2_ACCOUNT_ID=... \
  --env=RCLONE_CONFIG_B2_APPLICATION_KEY=...
```

In production, the gateway's `ShellsManager.provision()` builds this argv
automatically — these flags are documented for manual ops use.

## Customizing a harness command

The bridge spawns whatever `SHELLS_HARNESS_CMD` resolves to. To swap the
underlying harness binary without rebuilding the image, just override that
env var at `exe.dev new` time. The image's recommended values are baked into
the image labels:

```bash
docker inspect minionstack/hermes-shell:v1 \
  --format '{{ index .Config.Labels "minion.harness" }}'
```

## Image lineage

```
ubuntu:24.04
  ↓
minionstack/shells-bridge-base:v1
  ↑ Node 22 + rclone + tar + systemd + @minion-stack/shells-bridge
  ↑ shells-bridge.service systemd unit
  ↑ agent user + passwordless sudo
  ↑ /etc/shells-bridge.env stub
  ↑ rclone config stub (`b2` remote)
  ↓
  ├─ minionstack/hermes-shell:v1        + Python 3 + pipx + hermes-agent
  ├─ minionstack/claude-code-shell:v1   + @anthropic-ai/claude-code
  └─ minionstack/codex-shell:v1         + @openai/codex
```

## Verifying a built image

```bash
# Start the image locally (systemd needs cgroup v2 + privileged)
docker run -d --name shells-test --privileged \
  --tmpfs /run --tmpfs /run/lock \
  -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
  -e SHELLS_HARNESS_CMD="echo hello" \
  minionstack/hermes-shell:v1

# Check the bridge service status
docker exec shells-test systemctl status shells-bridge

# Cleanup
docker rm -f shells-test
```

The bridge will fail to connect (no real `SHELLS_GATEWAY_URL`) but you can
confirm the binary is installed and the unit boots.

## Cross-references

- Spec: `specs/2026-05-20-shells-golden-agents.md`
- Bridge source: `packages/shells-bridge/src/`
- systemd unit: `docker/shells-bridge.service`
