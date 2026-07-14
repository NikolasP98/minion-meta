# Reproducible Cloud Workstations

**Status:** Implemented and live-validated on exe.dev
**Date:** 2026-07-13

## Outcome

Minion provisions one default workstation per organization and can add more on
demand. The provider-specific control plane remains behind a small adapter; the
portable source of truth is a pinned OCI image plus a versioned workstation
blueprint.

The first provider is exe.dev. The first blueprint is
`minion-workstation-v1`:

The validated amd64 release is
`ghcr.io/nikolasp98/minion-workstation-v1@sha256:d05e816beede7cc8f41b526b00357774c65a7c189fdb934fac5a5eec129d62e6`.
Two provider-level defaults are live in LAX: `mn-1bc8d28279-ws-01` and
`mn-8e60ff7eda-ws-01`. Gateway reconciliation adopts only their exact managed
tag sets when the corresponding organization first calls `shells.list` or
requests its default workstation.

| Setting | Default |
|---|---|
| Provider | exe.dev |
| Base | pinned `ghcr.io/boldsoftware/exeuntu` (Ubuntu 24.04) |
| Desktop | minimal Xfce, TigerVNC, noVNC |
| CPU | 2 vCPU |
| Memory | 8 GB |
| Disk capacity | 100 GB |
| Browser | Chromium |
| Default runtime | HERMES |
| Optional runtimes | Claude Code, OpenCode, Minion-DRONE, Pi |
| Notes CLI | NotesMD CLI (`obsidian-cli` compatibility alias) |
| Archive policy | always on by default |
| Backup cadence | daily |

exe.dev CPU and RAM are pooled at the account level. A VM may request the full
2 vCPU / 8 GB shape, but multiple busy VMs share that pool. Disk billing follows
actual filesystem use rather than the declared 100 GB capacity.

## Why this OS

The provider-supported exeuntu image is favored over Alpine, Arch, or a raw
Debian image because it already carries exe.dev's systemd, SSH, proxy, Docker,
Node, browser, and development-tool integration. Xfce adds a low-idle-cost GUI
without introducing Alpine's musl/native-binary compatibility risk or Arch's
rolling-package reproducibility risk. The OCI image is digest-pinned so this
choice does not couple the higher-level blueprint to exe.dev.

## Provider boundary

The gateway owns the provider adapter and exposes only the existing
`shells.*` RPC surface to clients. Public workstation records contain:

- provider and provider resource id;
- organization id and default/non-default role;
- blueprint id/version and selected runtimes;
- requested CPU, memory, and disk;
- lifecycle status and error details;
- non-secret SSH, terminal, VS Code, Shelley, and GUI URLs returned by the
  provider.

Provider tokens, registry credentials, and VM HTTPS tokens never appear in RPC
responses or browser state.

Private images use `MINION_WORKSTATION_REGISTRY_AUTH=USER:TOKEN` in the gateway
secret environment. The adapter passes it only to exe.dev's `--registry-auth`
flag and redacts it from command errors.

The initial exe.dev adapter uses its canonical SSH API. Current `new` does not
accept `--region`; region is an account-level preference. Billing is read from
`billing plan --json` and `billing usage --json`.

## Idempotent organization policy

`shells.provision({ isDefault: true })` uses a durable store and a provider tag
derived from an opaque organization id. It returns the existing managed default
when present and creates only when neither the store nor provider reconciliation
finds one.

Names and tags never contain customer names or other PII:

```text
name: mn-<opaque-org-prefix>-ws-01
tags: minion, managed, role-workstation, org-<opaque-org-prefix>
```

The canonical create shape is:

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

The image digest, not a mutable tag, is persisted with the workstation record.

## Hub surface

The old `/terminal` and `/shells` concepts are consolidated into `/cloud`:

- Overview: lifecycle, resources, access links, and runtime inventory;
- GUI: embedded noVNC through the organization Gateway's private HTTP and
  WebSocket relay. The Gateway injects a VM-scoped exe.dev token upstream; the
  provider credential never reaches the iframe;
- Terminal: an organization-scoped Gateway WebSocket session backed by SSH to
  the selected VM. The one-time Minion capability travels in
  `Sec-WebSocket-Protocol`, and the provider's xterm/login surface is not used;
- Settings: create additional workstations, select runtimes, restart, archive,
  back up, and destroy.

The section layout owns the organization-scoped workstation picker. It is shown
as a compact identity control for one workstation and as a picker when more
than one exists. Every route and mutation remains admin/RBAC gated.

## Security notes

- Provisioning accepts runtime ids from a fixed allowlist and constructs SSH
  argv arrays without a shell.
- VM selection for terminal access is by persisted workstation id, never an
  arbitrary hostname supplied by a browser.
- noVNC listens behind exe.dev's authenticated HTTPS proxy; raw VNC is bound to
  loopback.
- exe.dev proxies remain private. Five-minute, 256-bit opaque Minion desktop
  capabilities are stored only as hashes in Gateway memory. The Gateway signs
  a short-lived, VM-scoped exe.dev HTTPS token locally and injects it as
  `X-Exedev-Authorization`; neither provider token nor SSH key enters RPC or
  browser state.
- MINION and FACES use distinct ed25519 access keys scoped by exe.dev's opaque
  per-organization VM tags. Gateway SSH uses `IdentitiesOnly=yes`, preventing
  fallback to a broader agent key. It connects to the VM hostname for command
  routing but sets `HostKeyAlias=exe.dev`, matching the shared provider key
  pinned in the image. The provisioning key remains separate.
- Provisioning env contains metadata plus a scoped, one-time bridge device
  credential. exe.dev injects it into container PID 1; a root-only bootstrap
  copies the `SHELLS_*` allowlist into a transient `root:agent:0640` file for
  the unprivileged bridge. It is never returned to Hub clients or embedded in
  access URLs. Longer-lived application credentials still come from the
  gateway/vault after registration or through provider integrations.
- Existing untagged exe.dev VMs are not adopted, renamed, or deleted
  automatically.

## Portability

Adding another provider requires an adapter for create/list/restart/remove and
access metadata. The blueprint, OCI image, runtime manifest, Hub RPC contract,
and per-organization uniqueness policy remain unchanged. Provider-native image
builders (for example, Packer for a cloud image) may consume the same pinned
bootstrap manifest when OCI boot is unavailable.
