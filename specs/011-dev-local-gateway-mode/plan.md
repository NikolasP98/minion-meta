# Implementation Plan: `dev:local` gateway mode

**Branch**: `docs/spec-011-dev-local-gateway` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-dev-local-gateway-mode/spec.md`

## Summary

Add an opt-in `--gateway` flag to `minion_hub`'s `bun run dev:local` (and `qa:up`) that starts the published Minion gateway image as an extra service in the existing `hub-qa` compose project, mints and persists a per-stack gateway token, writes a token-bearing `gateway` row (channel `dev`) plus `user_gateway` links and `personal_agents.gateway_id` into the QA Postgres, creates the matching agents on the gateway over its own WebSocket RPC, and stops `.env.qa` from blanking the five gateway environment names so the dashboard's floating assistant connects. Default behavior is untouched.

## Technical Context

**Language/Version**: TypeScript on Bun 1.x (hub scripts), Node 22 inside the gateway image.

**Primary Dependencies**: already in the hub — `postgres` (seed/bootstrap pg client), `@minion-stack/db/crypto` (`encrypt` — same AES-256-GCM path a production gateway row uses), `ws`/`WebSocket` (Bun global) for the gateway RPC, `docker compose`. No new dependency.

**Storage**: QA Supabase Postgres (`gateway`, `user_gateway`, `personal_agents`, `profiles`); gateway container state in `data/qa/gateway/` (gitignored); secrets in `.qa/gateway-token` and `.env.qa` (both mode 600, both already gitignored paths).

**Testing**: `vitest` unit tests on the pure helpers (`scripts/qa/gateway.test.ts`), plus the existing `scripts/qa/dev.test.ts` / `env.test.ts` suites; `svelte-check --threshold error`; browser proof with Playwright.

**Target Platform**: Linux host with Docker, matching the existing local stack's documented host-networking constraint.

**Project Type**: web application (SvelteKit hub) + local developer tooling.

**Performance Goals**: not a performance feature. Gateway readiness probe budget 120 s from a warm image.

**Constraints**: loopback-only; opt-in; idempotent; must not recreate the shared Supabase containers (a second dev server is running against them).

**Scale/Scope**: one gateway, one organization, ~13 seeded personas.

## Constitution Check

| Principle | Status | Note |
|---|---|---|
| I — Spec before code | PASS | This feature directory precedes the hub branch. |
| II — AS-IS/TO-BE/DELTA with evidence | PASS | `spec.md` carries the section with `file:line` anchors and one measured query (`select count(*) from gateway` = 0). |
| III — Slice-scoped delivery | PASS (one slice) | The change is one coherent opt-in mode in one repository; splitting it would ship a flag that does nothing. Hub worktree `feat/dev-local-gateway` → PR base `master` per `node scripts/repo-policy.mjs show hub`. |
| IV — Required build steps | N/A for UI gates | No new route, page, nav link, API endpoint or user-facing string: the change is developer tooling plus seed data. Therefore no design-token lint, no RBAC wiring, no Paraglide keys, no route-contract manifest entry. Gates that DO apply: prettier on changed files, the `scripts/qa` + personal-agent + auth vitest suites, `svelte-check`. |
| V — Security/data human gates | **APPLIES** | The feature opens a new (opt-in) secret boundary and writes a credential-bearing row. The hub PR therefore opens as a **draft** for owner review and owner merge; it is not self-merged. |

**Decision**: no violations. Principle V is satisfied by shipping the hub change as a draft PR for owner merge.

## Project Structure

### Documentation (this feature)

```
specs/011-dev-local-gateway-mode/
├── spec.md
├── plan.md
└── tasks.md
```

### Source code (minion_hub, branch `feat/dev-local-gateway`)

```
minion_hub/
├── docker-compose.qa.yml              # + minion-gateway service behind compose profile "gateway"
├── scripts/qa/
│   ├── gateway.ts                     # NEW — pure helpers + container control
│   ├── gateway.test.ts                # NEW — unit tests for the pure helpers
│   ├── gateway-bootstrap.ts           # NEW — pg rows + agents.create over WS
│   ├── env.ts                         # buildEnvQa() gains an optional gateway-vars argument
│   ├── backend.ts                     # writeEnvQa() forwards the flag
│   ├── dev.ts                         # --gateway: capture provider keys, start gateway, bootstrap, assert loopback
│   ├── up.ts                          # --gateway passthrough (only if trivial)
│   └── status.ts                      # + a gateway health line
├── docs/qa-stack.md                   # + "Gateway mode" section
└── .gitignore                         # + .qa/gateway-token, data/qa/gateway/ if not already covered
```

**Structure Decision**: all of it lands in the existing `scripts/qa/` tooling module and the existing compose file. No new top-level directory, no new package.

## Key design decisions

1. **One compose file, one compose profile.** The gateway is a service inside `docker-compose.qa.yml` under `profiles: ["gateway"]`, so `docker compose ... ps` (which `qa:status` already runs) picks it up for free and the default `qa:up`/`dev:local` path cannot start it. Rejected: a second overlay compose file — it would need `-f` threading through every existing call site.

2. **Host networking, like the `hub` service.** `network_mode: host` makes the gateway reachable at `ws://127.0.0.1:18789` for the browser and lets the gateway reach the host dev server at `http://127.0.0.1:5199` for its hub callbacks, with no `host.docker.internal` and no bridge-IP discovery. The compose file already documents itself as Linux-only for exactly this reason.

3. **Port 18789, not 18790.** The gateway's HTTP/WS server binds the port passed at boot and emits the `connect.challenge` frame there; the image's own `CMD` and healthcheck both use 18789 (`minion/Dockerfile`, `minion/src/gateway/server/http-listen.ts`, `minion/src/gateway/server/ws-connection.ts`). `DEFAULT_BRIDGE_PORT = 18790` is referenced only in `minion/src/config/port-defaults.ts` and tests — nothing binds it. The existing libsql QA fixture's `http://127.0.0.1:18790` is therefore wrong as well as unused by the hub; it is left alone (it is a legacy-mirror row the hub does not read).

4. **Token: generated, persisted, sealed.** `.qa/gateway-token` mirrors the existing `.qa/encryption-key` pattern exactly (load-or-create, mode 600). The same value is handed to the container as `MINION_GATEWAY_TOKEN`, written into `.env.qa` as `OPENCLAW_GATEWAY_TOKEN`, and sealed into `gateway.token_ciphertext`/`token_iv` with `encrypt()` from `@minion-stack/db/crypto` under the stack's `ENCRYPTION_KEY` — the same function and the same key derivation a production row uses, so `POST /api/servers/[id]/token` and `resolveServerTokenAuth` both work unmodified.

5. **Provider keys are captured before the env scrub, not after.** `dev:local` deliberately deletes `ANTHROPIC_API_KEY`/`OPENROUTER_API_KEY` from its own process (`ignoreInheritedBackendEnv`). Under `--gateway` the values are read out of `process.env` *before* that call and handed only to the container's environment; `.env.qa` still writes them empty, so the hub itself remains keyless. This keeps the secret boundary to one declared place.

6. **Gateway config pre-seeded.** The image's entrypoint copies `docker/default-config.json` to `~/.minion/minion.json` only when that file is absent, so the bootstrap writes `data/qa/gateway/minion.json` first: the image's default config plus `gateway.hubMetrics = { hubUrl, apiKey, serverId }`, which is the only way the gateway learns to call the hub back (it is config-only; the gateway reads no hub env var). `apiKey` is the same gateway token — `resolveServerTokenAuth` matches an inbound bearer token against `gateway.token_ciphertext` and takes the org from that row.

7. **Bootstrap is its own script, not a seed-matrix module.** `scripts/qa/gateway-bootstrap.ts` runs after the seed, only in gateway mode. Rejected: threading a flag through `scripts/qa/seed/index.ts` + `matrix.ts` + `seed.contract.test.ts` — the matrix is an inventory of rows the seed *always* writes, and registering conditional rows there would make the contract test's coverage assertion mode-dependent. Consequence recorded in `tasks.md` T-13 and in the open-items ledger: gateway-mode rows are covered by the bootstrap's own assertions rather than by the seed contract test.

8. **Agent ids get a `personal-` prefix in gateway mode.** The gateway gates its hub-module tools on `agentId.startsWith("personal-")` (`minion/src/agents/tools/hub/hub-common.ts:13`), while the QA seed mints `qa_<hex>` ids. The bootstrap renames each persona's `personal_agents.agent_id` (and the matching `profiles.personal_agent_id`) to `personal-<hex>` so the local assistant can actually use hub tools. Default-mode fixtures are untouched. Risk accepted and documented: a test that hardcodes a `qa_`-prefixed agent id would fail *against a gateway-mode stack*; none is known to.

## Complexity tracking

| Added complexity | Why it is not avoidable |
|---|---|
| A new compose service | The gateway is a separate process; there is no in-hub way to serve the frame protocol. |
| A second secret file (`.qa/gateway-token`) | The token must survive re-runs (I5) and must not be in git (I4). Reusing `ENCRYPTION_KEY` as the gateway token would conflate two trust domains. |
| A WS RPC call from a script | `agents.create` is the only way to make an agent exist on the gateway; the hub's own provisioner issues the same call from the browser. The script reuses the hub's `getProvisioningPayload` shape. |

## Phase 0 — research outcome

No open unknowns remain. Verified before planning:

- Both `:dev` and `:prd` tags of `ghcr.io/nikolasp98/minion-ai` resolve from this workstation with the credentials already present in the local registry configuration.
- The gateway starts with only `MINION_GATEWAY_TOKEN` set; no wizard, no pre-existing config required.
- `agents.create` requires `{ name, workspace }`; `agents.list` exists and is org-scoped.
- `ANTHROPIC_API_KEY` backs the default model alias; `OPENROUTER_API_KEY` alone does not substitute for it unless an agent's model string targets an OpenRouter id.
- The gateway reads no hub URL/token from its environment; the hub link is `gateway.hubMetrics` in `minion.json` only.
