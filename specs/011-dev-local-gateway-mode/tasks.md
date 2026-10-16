# Tasks: `dev:local` gateway mode

**Input**: `specs/011-dev-local-gateway-mode/spec.md`, `plan.md`

**Prerequisites**: plan.md, spec.md

**Tests**: requested — unit tests on the pure helpers, plus a browser proof.

**Organization**: grouped by the spec's user stories. All paths are relative to `minion_hub/` on branch `feat/dev-local-gateway`.

## Format: `[ID] [P?] [Story] Description`

`[P]` = can run in parallel with its siblings.

## Phase 1: Setup

- [ ] **T-01** Worktree `~/.cache/claude-tmp/hub-gw` off `origin/master`, real `bun install --frozen-lockfile`, `bunx svelte-kit sync`, `bun run i18n:compile`. (★ a symlinked `node_modules` hangs Vite.)
- [ ] **T-02** Confirm the published image resolves: `docker manifest inspect ghcr.io/nikolasp98/minion-ai:dev`.

## Phase 2: Foundational (blocking)

**⚠️ No story work can begin until this phase is complete.**

- [ ] **T-03** `scripts/qa/gateway.ts` — pure helpers: `GATEWAY_WS_PORT`, `GATEWAY_URL`, `buildGatewayEnvVars(token)` (the five names, resolved), `collectProviderKeys(env)` (pick only the model-provider names, drop empties), `buildGatewayConfig({ hubUrl, token, serverId })` (image default config + `gateway.hubMetrics`), `localGatewayServerId()` (stable legacy server id for the local row).
- [ ] **T-04** `scripts/qa/gateway.ts` — `loadOrCreateGatewayToken(root)`: `.qa/gateway-token`, load-or-create, mode 600, same shape as `loadOrCreateEncryptionKey` in `scripts/qa/env.ts`.
- [ ] **T-05** `docker-compose.qa.yml` — add service `minion-gateway` under `profiles: ["gateway"]`: image `ghcr.io/nikolasp98/minion-ai:dev` (overridable via `MINION_GATEWAY_IMAGE`), `network_mode: host`, `MINION_GATEWAY_TOKEN` + provider keys from `.env.qa.gateway`, volume `./data/qa/gateway:/home/node/.minion`, the image's own `CMD`, `init: true`, `restart: "no"`, healthcheck on `http://127.0.0.1:18789/health`, `mem_limit`.
- [ ] **T-06** `scripts/qa/gateway.ts` — `ensureGatewayStack(root, composeFile, { token, providerKeys, hubUrl, tag })`: write `.env.qa.gateway` (mode 600), ensure `data/qa/gateway/` and pre-write `minion.json`, `docker compose --profile gateway up -d minion-gateway`, then `waitForGatewayHealth()` with a bounded timeout and a message naming the image on failure.
- [ ] **T-07** `scripts/qa/gateway.test.ts` — unit tests for every pure helper in T-03/T-04 (two loads return the same token; file mode is 600; `collectProviderKeys` drops empty and non-provider names; `buildGatewayEnvVars` resolves all five names to loopback; `buildGatewayConfig` carries `hubMetrics` and keeps `auth.mode = "token"`).

**Checkpoint**: a gateway container can be brought up and probed, and its pure inputs are tested.

## Phase 3: User Story 1 — Talk to an agent on a local dev server (P1) 🎯 MVP

**Goal**: the floating assistant is online locally and answers.

**Independent Test**: start `bun run dev:local --gateway`, log in as the QA admin persona, open the assistant, send a message, get a reply.

- [ ] **T-08** `scripts/qa/env.ts` — `buildEnvQa(status, encryptionKey, devKeys, gatewayVars?)`: when `gatewayVars` is supplied, the five gateway names carry real values instead of blanks (keep every other `OUTBOUND_SERVICE_ENV_KEYS` entry blank). `main()` accepts `--gateway` and mints/reads the token. Extend `scripts/qa/env.test.ts`.
- [ ] **T-09** `scripts/qa/backend.ts` — `writeEnvQa(root, tag, opts?)` forwards `--gateway` to `scripts/qa/env.ts`.
- [ ] **T-10** `scripts/qa/gateway-bootstrap.ts` — upsert the local `gateway` row (`org_id` = QA business org, `channel = 'dev'`, `url = ws://127.0.0.1:18789`, `legacy_server_id` = stable local id, token sealed with `encrypt()` under the stack `ENCRYPTION_KEY`, `auth_mode = 'token'`); upsert `user_gateway` links for every QA persona; set `personal_agents.gateway_id` to that row and `provisioning_status = 'active'`; rename `agent_id` to the `personal-` prefix and keep `profiles.personal_agent_id` in step. Loopback-guarded via `assertLoopback` from `scripts/qa/seed/db.ts`. Idempotent: `on conflict do update`, and a second run reports "already current".
- [ ] **T-11** `scripts/qa/gateway-bootstrap.ts` — connect to the gateway over WS with the token, reply to `connect.challenge`, call `agents.list`, and `agents.create` each missing persona agent with the hub's own payload shape (`{ name: agentId, workspace: "~/.minion/agents/<agentId>/workspace" }`). Report created / already-present counts. A provider key being absent is a warning, not a failure.
- [ ] **T-12** `scripts/qa/dev.ts` — parse `--gateway`; read the provider keys out of `process.env` **before** `ignoreInheritedBackendEnv`; pass the flag to `writeEnvQa`; after the seed, `ensureGatewayStack` then run the bootstrap; `assertResolvedLoopback('MINION_GATEWAY_URL', childEnv)` in gateway mode; add the gateway lines to the banner. Extend `scripts/qa/dev.test.ts` for the flag parsing and the ordering invariant.
- [ ] **T-13** Record the two accepted deviations in `proposals/` (meta): gateway-mode rows are not in the seed matrix / contract test, and the runtime provisioner still writes an empty server id (`src/server/services/personal-agent-provisioner.ts:112`). Add the matching in-code `TODO(handoff):` comments.

**Checkpoint**: Story 1 is independently demonstrable.

## Phase 4: User Story 2 — Default mode stays sealed (P1)

**Goal**: without the flag nothing changes.

**Independent Test**: `bun run dev:local` with real gateway values in a developer `.env.local`; assert the dev server sees none of them.

- [ ] **T-14** `scripts/qa/env.test.ts` — assert the default `buildEnvQa` output still contains `MINION_GATEWAY_URL=`, `OPENCLAW_GATEWAY_TOKEN=` and the rest as empty, and that no gateway section is emitted.
- [ ] **T-15** `scripts/qa/dev.test.ts` — assert that without the flag no provider key is captured and no gateway step runs.
- [ ] **T-16** Verify the loopback refusal still fires: a non-loopback gateway URL must make `dev:local --gateway` refuse to start.

## Phase 5: User Story 3 — A second developer is not disrupted (P2)

**Goal**: the shared backend is never reset by this mode.

**Independent Test**: with another dev server running on the shared QA backend, start gateway mode and confirm the first keeps serving.

- [ ] **T-17** Confirm `ensureGatewayStack` only ever issues `up -d minion-gateway` (never `down`, `reset`, or an unscoped `up`), and that `ensureSupabaseStack` is called with `fresh` unchanged.
- [ ] **T-18** `scripts/qa/status.ts` — add a gateway line: container state (already covered by the existing `docker compose ps`) plus a `GET http://127.0.0.1:18789/health` probe reported like the existing app-health probe.

## Phase N: Polish & cross-cutting

- [ ] **T-19** `docs/qa-stack.md` — "Gateway mode" section: what `--gateway` starts, the single secret boundary and why it is opt-in, the port, the token file, the seeded rows, and the known limits (no channel extensions, no voice, one organization, hub tools need the `personal-` prefix).
- [ ] **T-20** `.gitignore` — ensure `.qa/gateway-token`, `.env.qa.gateway` and `data/qa/gateway/` are ignored.
- [ ] **T-21** Gates, foreground: prettier `--write` on changed files; `bun run vitest run scripts/qa src/server/services/personal-agent* src/server/auth`; `NODE_OPTIONS=--max-old-space-size=6144 timeout 900 bunx svelte-check --threshold error --output machine | grep ERROR` (expect none).
- [ ] **T-22** Browser proof (Playwright, chromium from the worktree): assistant online + reply, screenshot `01-assistant-online.png`.
- [ ] **T-23** Draft PR to `master` with What/Why/How, a bold `**Out of scope:**` line, gates, and the proof results. Do not merge (constitution Principle V).

## Dependencies & execution order

### Phase dependencies

- Phase 1 → Phase 2 → Phase 3 → (Phase 4, Phase 5 in parallel) → Phase N.
- T-03/T-04 before T-06; T-05 before T-06; T-08/T-09 before T-12; T-10 before T-11; T-06 + T-11 before T-12's runtime path.

### User story dependencies

- Story 1 is the MVP and depends only on the foundation.
- Story 2 is a guard on Story 1's change; its tests can be written in parallel with Story 1's implementation.
- Story 3 is a constraint satisfied by the foundation's design (profile-scoped `up`), verified independently.

### Parallel opportunities

- `[P]` T-07, T-14, T-15 (test files, no shared source).
- `[P]` T-19, T-20 (docs + ignore list).

## Parallel example: Phase 2

```
T-03, T-04  → scripts/qa/gateway.ts (same file, sequential)
T-05        → docker-compose.qa.yml            [P]
T-07        → scripts/qa/gateway.test.ts       [P, after T-03/T-04]
```
