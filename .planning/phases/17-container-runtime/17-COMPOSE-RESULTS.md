# 17 Disposable Compose profile results (OPS-02, plan 17-02)

Snapshot `/home/nikolas/.cache/claude-tmp/17-02-d772640c/` (meta `origin/dev` `96e5ceeb…`, gateway `origin/DEV` `8499d8fd…`). Nothing here was run against a real host, registry or production compose file; the profile lives beside `ops/compose.yml` and does not modify it.

## The one supported profile — `ops/compose.qc.yml`

| Service | Image | Published | Mounts | Readiness | Shutdown |
|---|---|---|---|---|---|
| `valkey` | `valkey/valkey:8-alpine` (override `MINION_QC_VALKEY_IMAGE` with a digest) | none | `tmpfs /data` | `valkey-cli ping` every 5 s | default |
| `gateway` | `minion-360-17-02-gateway:local`, **built from the local gateway snapshot** (`MINION_QC_GATEWAY_CONTEXT`, default `../minion`) with the repo `Dockerfile`, `MINION_DOCKER_APT_PACKAGES=""` | none | named volume `minion-360-17-02-gateway-state:/home/node/.minion` | Dockerfile `HEALTHCHECK curl /health` (start_period 30 s); waits for valkey `service_healthy` | `stop_grace_period: 20s`; `run-loop.ts` SIGTERM → `stop` |
| `caddy` | `caddy:2-alpine` | **`127.0.0.1:18989:80`** — the only published port (`MINION_QC_PORT`) | `ops/caddy/Caddyfile.qc` read-only (the only bind mount) | waits for gateway `service_started` only, so a not-ready gateway is an explicit **502** | default |

Project `minion-360-17-02`; network `minion-360-17-02-net`; every container/volume/network name carries the prefix. No `restart:` policies, `security_opt: no-new-privileges:true` everywhere, no docker/tailscale sockets, no host paths, `MINION_GATEWAY_TOKEN` defaults to the visibly synthetic `minion-360-17-02-throwaway-token` (override `MINION_QC_GATEWAY_TOKEN`). Resource limits are deliberately unset and recorded as unqualified in `x-minion-qc-external.resource-limits` (phase 19 owns measured numbers).

External boundaries, not started (documented in `x-minion-qc-external`): **Hub** is Vercel-hosted and reaches the gateway as an authenticated WebSocket client — the smoke runner plays that client (`connect.challenge` → `connect{auth.token}` with client id `test`); `ops/compose.yml`'s `hub` service builds `./minion_hub` which has **no Dockerfile**, so local Hub startup is not claimed. **paperclip/postgres** are not gateway dependencies and stay unqualified.

## Task 1 evidence — resolve + contract (executed)

| Gate | Result | Log |
|---|---|---|
| `env -i … docker compose -f ops/compose.qc.yml config --quiet` (empty environment) | exit 0 | `checks/compose-config-quiet.log` |
| `node --test scripts/qc/compose-contract.test.mjs` | **8 tests, 8 pass, 0 fail, 0 skipped, exit 0** | `checks/compose-contract.test.log` |
| Plan verify (`node --test … && docker compose … config --quiet`) | exit 0 | `checks/task1-verify.log` |

Contract (`contractViolations` in `scripts/qc/compose-smoke.mjs`, shared with the runner) rejects: any port not on 127.0.0.1, any bind mount other than the read-only Caddyfile, host sockets, `restart`, `privileged`, missing `no-new-privileges`, secret-shaped env keys, a non-synthetic gateway token, valkey without healthcheck, gateway not waiting for valkey health, caddy waiting for gateway *health* (which would hide the readiness-failure fixture), unprefixed project/volume/network names, a second published port, a local `hub`/`paperclip`/`postgres` service, and a missing external-boundary block — 14 negative mutations, each asserted. A profile that needs a secret (`${QC_SECRET:?required}`) fails `config` (exit ≠ 0) — missing context is an explicit failure. One regression found while writing the checker: a bare `KEY` match flagged `VALKEY_URL`; the regex now requires `_KEY$`/`API_KEY`, with `VALKEY_URL` asserted non-secret and `ANTHROPIC_API_KEY`/`GITHUB_PAT`/`BETTER_AUTH_SECRET` asserted secret.

## Task 2 evidence — boot/ready/shutdown fixtures

Fixture logic (`scripts/qc/compose-smoke.mjs`, injectable engine) — `node --test scripts/qc/compose-smoke.test.mjs` → **14 tests, 14 pass, 0 fail, 0 skipped, exit 0** (`checks/compose-smoke.test.log`). Scenarios: `--disposable-only` missing → refused before any docker call; daemon unavailable → `blocked` exit 3 with no `up`; pre-existing prefixed resources → refused, never removed; contract violation → fail before build; missing build context → explicit fail, teardown still runs; build over budget → "exceeded N ms" recorded as the stop point; 200 with the gateway absent → rejected as mocked health; readiness never reached → fail with gateway log tail, teardown passes; wrong token accepted → fail; exit 137 (SIGKILL) → fail; docker.sock seen by `docker inspect` → fail; leftover prefixed resource after `down -v` → fail; happy path → all 13 steps pass, `down -v --remove-orphans` + `image rm` of the built tag, no `pull`/`push`/`login`.

**Live run — BLOCKED at the first step.** `node scripts/qc/compose-smoke.mjs --profile ops/compose.qc.yml --disposable-only --gateway-context <snapshot>/minion` → exit **3**, `checks/task2-verify.log`, `checks/smoke-results.json`:

```
[blocked] engine: docker daemon unavailable: permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
```

Where it stopped and why (this machine, 2026-09-11): `docker.service` is `disabled` / `inactive (dead)`; `/var/run/docker.sock` is a stale `root:docker` socket; the user (uid 1000) is not in the `docker` group; there is no rootless socket at `/run/user/1000/docker.sock`; `podman`/`nerdctl`/`dockerd-rootless.sh` are not installed; `sudo` requires a password. Docker client 29.7.2 and Compose 5.5.1 are present and were used for `config` only. No container, image, volume or network was created; nothing to tear down.

Not executed, therefore not evidenced: gateway image build time and image ID; 502 while the gateway is absent; `/health` 200 recovery time; authenticated `connect` + wrong-token rejection through Caddy; SIGTERM exit code / elapsed with an in-flight socket; `docker inspect` host-access posture; engine acceptance of `no-new-privileges:true` with the entrypoint's `gosu` drop; teardown proof.

## Unblock and rerun (operator)

1. Either `sudo systemctl start docker` and add the user to the `docker` group (re-login), or set up rootless Docker; **or** run on any machine with a working engine. Nothing else in the plan needs privileges.
2. From a meta checkout that contains these files, with a gateway checkout at `origin/DEV`:

```
export TMPDIR=$HOME/.cache/claude-tmp
node --test scripts/qc/compose-contract.test.mjs && docker compose -f ops/compose.qc.yml config --quiet
node --test scripts/qc/compose-smoke.test.mjs && \
  env -i PATH=$PATH HOME=$HOME TMPDIR=$TMPDIR node scripts/qc/compose-smoke.mjs \
    --profile ops/compose.qc.yml --disposable-only --gateway-context /path/to/minion@DEV \
    --results checks/smoke-results.json
```

Expected on success: exit 0 and 13 `[pass]` steps including image ID, 502-then-200, `connect ok`, `wrong token rejected`, `exit 0 in N ms` (N < 20000), host-access clean, teardown clean. Any other exit is the recorded stop point. The build is bounded at 25 min (`--build-timeout-ms`); the runner never pulls the gateway tag and refuses to start if anything prefixed `minion-360-17-02` already exists.

## Limits to keep in view

- The gateway `Dockerfile` downloads installers at build time (apt, bun.sh, GitHub release tarballs, `npm i -g @anthropic-ai/claude-code@latest`, astral uv). "Built from the local snapshot" is true of the *source*; the image is not byte-reproducible (Phase 17 exclusion) and `CLAUDE_CODE_VERSION` should be pinned (`MINION_QC_CLAUDE_CODE_VERSION`) for an identity-linked run.
- `valkey/valkey:8-alpine` and `caddy:2-alpine` are mutable tags by default; pass digests via `MINION_QC_VALKEY_IMAGE` / `MINION_QC_CADDY_IMAGE` when the run must be identity-pinned (17-04 provenance).
- `ops/compose.yml` (umbrella) remains stale: `hub` build has no Dockerfile, `TURSO_DB_URL`/`BETTER_AUTH_SECRET` defaults and `OPENCLAW_GATEWAY_TOKEN` naming are pre-Supabase. This plan does not repair it; retire-or-repair is a separate decision (18-xx / proposal).
- OPS-02 stays **pending**: the profile is qualified statically and its fixtures are unit-proven, but "starts with correct ports, readiness and shutdown behavior" needs the live run above.
