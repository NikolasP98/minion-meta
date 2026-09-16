---
phase: 17-container-runtime
plan: "02"
verified: 2026-09-11
status: partial
requirements_verified_in_scope: [OPS-02]
requirements_completed: []
snapshot: /home/nikolas/.cache/claude-tmp/17-02-d772640c
---

# 17-02 goal-backward verification

Executor self-check; independent verifier still owes the phase verification.

## Must-have truths

| Truth | Result | Evidence |
|---|---|---|
| Profile resolves without secrets/missing contexts | verified | `env -i PATH HOME TMPDIR docker compose -f ops/compose.qc.yml config --quiet` exit 0 (`checks/compose-config-quiet.log`); resolved JSON in `checks/resolved.json` shows every env value populated from defaults; a profile with `${QC_SECRET:?required}` fails `config` (contract test 8). |
| Profile documents actual included/external services and readiness | verified | `x-minion-qc-external` (hub = Vercel authenticated WS boundary, paperclip/postgres unqualified, limits unqualified) asserted by contract test 1; valkey healthcheck + gateway `service_healthy` + caddy `service_started` + `stop_grace_period 20s` asserted by test 4; `17-COMPOSE-RESULTS.md` table. |
| Ports, mounts, names constrained | verified (static) | Exactly one published port `127.0.0.1:18989→80` (test 2); one read-only bind (Caddyfile.qc), prefixed volume/network, no docker/tailscale sockets (test 3); 14 unsafe mutations each rejected (test 7). |
| Supported profile passes actual boot/ready/shutdown flows | **not verified — blocked** | Live run stopped at step 1: `engine: blocked — permission denied … /var/run/docker.sock`, exit 3 (`checks/task2-verify.log`, `checks/smoke-results.json`). No boot happened. |
| Missing images/services fail explicitly, not mocked health acceptance | verified (fixture logic) | `compose-smoke.test.mjs`: daemon unavailable → blocked/3 with no `up`; missing build context → explicit fail; build timeout → recorded stop point; 200 with gateway absent → **fail** (mocked health rejected); readiness timeout → fail with log tail; exit 137 → fail; wrong token accepted → fail; docker.sock in inspect → fail; leftover after down → fail. 14/14 (`checks/compose-smoke.test.log`). The live blocked result itself is the explicit-failure behavior exercised for real. |

## Artifacts

| Artifact | Present | Substantive |
|---|---|---|
| `ops/compose.qc.yml` | snapshot only, sha256 `ca1437ef…` | 3 services, prefixed names, loopback port, contract comments, external-boundary block |
| `ops/caddy/Caddyfile.qc` | snapshot only, `4d09e2eb…` | `auto_https off`, `admin off`, `:80 → gateway:18789` |
| `scripts/qc/compose-contract.test.mjs` | snapshot only, `ad120cf1…` | 8 tests incl. 14 negative mutations + missing-secret resolve failure |
| `scripts/qc/compose-smoke.mjs` | snapshot only, `60f95bdf…` | 13-step runner, injectable engine, clean-env exec, exit codes 0/1/2/3, prefix-scoped teardown |
| `scripts/qc/compose-smoke.test.mjs` | snapshot only, `26a2de7a…` | 14 scenario tests against a scripted engine |
| `.planning/phases/17-container-runtime/17-COMPOSE-RESULTS.md` | main checkout + snapshot, `9a8da729…` | topology, gate results, exact stop point, unblock/rerun commands, limits |

## Key links

- `ops/compose.qc.yml` ↔ `ops/compose.yml`: same gateway image source (`minion/Dockerfile`, port 18789, `/health`), same Caddy-ingress shape, but hub/paperclip/postgres removed and documented as external; token env name follows the gateway's actual `MINION_GATEWAY_TOKEN` (`src/gateway/auth/auth.ts:223`), not the umbrella's `OPENCLAW_GATEWAY_TOKEN`.
- `scripts/qc/compose-smoke.mjs` ↔ `ops/compose.qc.yml`: reads port, token, image, container names and build context from the resolved profile; refuses any profile failing `contractViolations`; handshake matches `ConnectParamsSchema` (`minProtocol/maxProtocol/client{id:test,mode:test}/auth.token`) and the `connect.challenge` event in `src/gateway/server/ws-connection.ts`.

## Not verified / open

- No container was started; boot time, readiness recovery, SIGTERM exit code/elapsed, host-access posture from `docker inspect`, and teardown proof are all pending the operator rerun in `17-COMPOSE-RESULTS.md`.
- Engine acceptance of `no-new-privileges:true` together with the entrypoint's root→`gosu node` drop is untested.
- The gateway image build has not been timed; the 25-minute bound is enforced by the runner but unobserved.
