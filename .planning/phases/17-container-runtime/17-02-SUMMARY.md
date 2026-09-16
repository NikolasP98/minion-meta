---
phase: 17-container-runtime
plan: "02"
requirements: ["OPS-02"]
requirements-completed: []
status: partial
snapshot: /home/nikolas/.cache/claude-tmp/17-02-d772640c
base: meta origin/dev 96e5ceeb25a7544e47fb9f3362c4d2b6849fcc5f; gateway origin/DEV 8499d8fddc4afdd22f6160e3f3e6e448b6befe73
completed: 2026-09-11
owned_files:
  - path: ops/compose.qc.yml
    before: absent
    after: ca1437ef9e56ae745453c1b260136b1508a9595c0e548977fe98ef50ea52f703
  - path: ops/caddy/Caddyfile.qc
    before: absent
    after: 4d09e2eb1bbb13157428c3ff30d0b77aa208f84a897c746a0346acc580f56340
  - path: scripts/qc/compose-contract.test.mjs
    before: absent
    after: ad120cf1280cbdc4d62ee3da96b06d63b1f4e27f74aa73139f2403e89c81a882
  - path: scripts/qc/compose-smoke.mjs
    before: absent
    after: 60f95bdfa393ab15a3b7073499c5e63682e8ebb645f6d85d7ce5a888b242401e
  - path: scripts/qc/compose-smoke.test.mjs
    before: absent
    after: 26a2de7ae9f2bba0bdebaf65ee94007eccc993e5189e4f40b662c27a666eaac8
  - path: .planning/phases/17-container-runtime/17-COMPOSE-RESULTS.md
    before: absent
    after: 9a8da729a7f1cc7dd10944cedd0044f32d231962ae27f8a8e3749db0c0ae1ea6
decisions: [D360-01, D360-04, D360-06]
---

# 17-02 Disposable Compose profile qualification (OPS-02)

`status: partial`: Task 1 (profile + static contract) is delivered and gated green; Task 2's fixture runner is delivered and unit-gated green, but its **live run is blocked at the first step** — no container engine is usable on this machine (`docker.service` disabled/inactive, user not in `docker` group, no rootless socket, no podman/nerdctl, `sudo` needs a password). OPS-02 ("starts with correct ports, readiness and shutdown behavior") is therefore not evidenced; `requirements-completed` stays empty.

## Where things are

- Five source files exist only in the private meta snapshot `/home/nikolas/.cache/claude-tmp/17-02-d772640c/MINION` (detached worktree of `origin/dev`, `pnpm install --frozen-lockfile --ignore-scripts` exit 0). Untracked; nothing staged, committed or pushed. A gateway snapshot (`origin/DEV`, detached worktree at `…/17-02-d772640c/minion`) exists only as the intended build context; it was never built. The main checkouts were not touched except this plan's three `.planning/phases/17-container-runtime/` documents (the results doc is byte-identical in the snapshot).
- Receipts: `…/17-02-d772640c/checks/` — `before.txt`, `after.txt`, `freeze.json`, `bases.txt`, `install.log`, `resolved.json`, `compose-config-quiet.log`, `compose-contract.test.log`, `compose-smoke.test.log`, `task1-verify.log`, `task2-verify.log`, `smoke-results.json`, `whitespace.log`, `git-status.txt`, `commands.log`.
- Runtime: Node v22.23.2, pnpm 10.15.0, Docker client 29.7.2, Compose 5.5.1 (used for `config` only). Node builtins only; no new dependency.

## Task 1 — resolve and constrain the supported topology

`ops/compose.qc.yml` + `ops/caddy/Caddyfile.qc` + `scripts/qc/compose-contract.test.mjs`.

- One supported path: `valkey` (tmpfs, healthcheck) → `gateway` (built from the local gateway snapshot with the repo `Dockerfile`, no chromium, named volume, `depends_on` valkey `service_healthy`, `stop_grace_period 20s`) → `caddy` (HTTP-only ingress, the **only** published port `127.0.0.1:18989:80`, the **only** bind mount = read-only `Caddyfile.qc`, `depends_on` gateway `service_started` so a not-ready gateway surfaces as an explicit 502). Project/containers/volume/network all named `minion-360-17-02-*`; no `restart`, `no-new-privileges:true` everywhere, no host sockets, no host paths, token defaults to the visibly synthetic `minion-360-17-02-throwaway-token`. Limits left unset and recorded as unqualified (phase 19).
- Hub is represented as an **external authenticated boundary** in `x-minion-qc-external` (Vercel; `ops/compose.yml`'s hub build has no Dockerfile — no local Hub startup is claimed); the smoke runner plays the Hub's role as an authenticated WS client. paperclip/postgres are not started.
- Gates: `env -i … docker compose -f ops/compose.qc.yml config --quiet` → exit 0 (resolves from an **empty** environment). `node --test scripts/qc/compose-contract.test.mjs` → **8 tests, 8 pass, 0 fail, 0 skipped, exit 0**. Plan verify (both chained) → exit 0 (`checks/task1-verify.log`). Negative cases: 14 mutations each rejected by `contractViolations` (0.0.0.0 port, docker.sock mount, restart policy, secret env key, ambient token, valkey without healthcheck, gateway not waiting for valkey, caddy waiting for gateway health, unprefixed volume/project, local hub service, privileged, second port, missing external block) plus a profile needing `${QC_SECRET:?required}` → `config` exit ≠ 0.
- Red found and fixed during the gate: the first secret-key regex matched `VALKEY_URL` (bare `KEY`); the checker now requires `_KEY$`/`API_KEY` and the test asserts both directions.

## Task 2 — readiness failure and graceful shutdown fixtures

`scripts/qc/compose-smoke.mjs` (`--profile … --disposable-only [--gateway-context] [--results] [--build-timeout-ms] [--keep-image]`; exit 0 pass / 1 fail / 2 refused / 3 blocked) + `scripts/qc/compose-smoke.test.mjs` + `17-COMPOSE-RESULTS.md`.

- Steps, in order, each with recorded evidence: engine reachable → resolve + contract → refuse if anything `minion-360-17-02*` pre-exists → build gateway from the local context (`--pull=false`, 25-min bound, image ID captured) → **dependency unavailable**: caddy only, `/health` must NOT be 200 (a 200 is rejected as mocked/foreign) → full `up --no-build --pull never`, `/health` 200 within 90 s → `ps` inventory (image/health/ports) → authenticated `connect` through Caddy with the profile token → wrong token must be rejected → **SIGTERM** with a held session: `compose stop -t 20`, exit code must be 0 (137 fails), elapsed < grace, `/health` must stop answering → `docker inspect` host-access posture (no privileged, no host sockets, only Caddyfile ro bind, all ports 127.0.0.1, restart=no) → teardown `down -v --remove-orphans` + `image rm` and proof nothing prefixed remains. Every docker call runs with a clean env (`PATH`/`HOME`/`TMPDIR` only).
- Unit gate against a scripted engine: `node --test scripts/qc/compose-smoke.test.mjs` → **14 tests, 14 pass, 0 fail, 0 skipped, exit 0** (`checks/compose-smoke.test.log`); scenarios listed in `17-COMPOSE-RESULTS.md`.
- **Live gate**: `node scripts/qc/compose-smoke.mjs --profile ops/compose.qc.yml --disposable-only --gateway-context …/minion` → exit **3**, single step `engine: blocked — permission denied while trying to connect to the docker API at unix:///var/run/docker.sock` (`checks/task2-verify.log`, `checks/smoke-results.json`). No container/image/volume/network was created; nothing to remove. Plan verify (unit test && live) → exit 3.

## Deviations

- Docker unavailable (root gate anticipated this): recorded exactly where the run stopped; no attempt to start the daemon, join the `docker` group or install a rootless engine (system changes outside the snapshot).
- The smoke runner exports the contract checker (`contractViolations`, `resolveProfile`) so `compose-contract.test.mjs` reuses one implementation rather than duplicating YAML parsing; parsing goes through the installed `docker compose config --format json` (works without a daemon) instead of adding a YAML dependency.
- The profile's default build context `../minion` resolves to the meta checkout's gateway subdirectory; the live run must pass `--gateway-context` to an `origin/DEV` snapshot (the main `minion/` checkout is on a feature branch).
- `git diff --check` has nothing to check for untracked files; trailing-whitespace grep over the five files → 0 hits.

## Gaps / blocked

| Item | Blocked on |
|---|---|
| Live boot/ready/auth/SIGTERM/teardown evidence (OPS-02 closure) | a usable engine: `systemctl start docker` + `docker` group (or rootless Docker) on this machine, or run the two commands in `17-COMPOSE-RESULTS.md` on any host with an engine; no credential needed |
| Gateway image ID and build time | same; the build downloads installers (apt, bun.sh, GitHub releases, `@anthropic-ai/claude-code@latest`, uv) — pin `MINION_QC_CLAUDE_CODE_VERSION` for an identity-linked run; image is not byte-reproducible (Phase 17 exclusion) |
| Engine acceptance of `no-new-privileges:true` with the entrypoint's `gosu` drop | live run; if the engine rejects it the runner reports `readiness` fail with the gateway log tail |
| Digest pins for `valkey`/`caddy` | `MINION_QC_VALKEY_IMAGE` / `MINION_QC_CADDY_IMAGE` accept `repo@sha256:`; choosing the digests belongs to 17-04 provenance |
| Stale umbrella `ops/compose.yml` (hub build without Dockerfile, pre-Supabase defaults) | not in this plan's files; retire-or-repair decision for root (phase 18 / proposal) |

Next gated plan: 17-03 (containment drills, consumes 17-01 packet); 17-04 (provenance/rollback) can pin the digests this profile accepts.
