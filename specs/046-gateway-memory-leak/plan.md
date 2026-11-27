# Implementation Plan: Gateway memory leak — fix and hardening

**Branch**: `docs/spec-046-gateway-memory-leak` (meta) | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

## Summary

S0 (the leak fix) is a two-file gateway hotfix already open as PR #364: the plugin schema validator caches by schema content and evicts the previous schema from Ajv. The remaining slices make the failure visible before it happens (heartbeats for both gateways under the right org, one owner notification per episode), make a future leak fail at a known ceiling, remove the FACES log flood from the unbuilt memory binary, and stop dashboard RPCs from re-validating config hundreds of times an hour. Every production step is an env or service edit with a one-line rollback, recorded with a timestamp in tasks.md.

## Technical Context

**Language/Version**: TypeScript — gateway Node 22 (pnpm, tsdown), hub Bun / SvelteKit 2
**Primary Dependencies**: gateway `src/plugins/schema-validator.ts`, `src/config/io.ts` (`DEFAULT_CONFIG_CACHE_MS`, `clearConfigCache`), `src/gateway/server.impl.ts:810-825` (heartbeat push, `memoryRssMb`), `src/events/turso-sync.ts`; hub `src/server/db/schema/gateway-heartbeats.ts`, `src/server/services/architecture.service.ts:425-600` (host card), in-app notifications service; netcup swarm `deploy/swarm/` + `/opt/minion-swarm/update-controller.sh`; gateway `Dockerfile` (qmd)
**Storage**: hub Turso `gateway_heartbeats` (existing); a small alert-state table or a `settings` row for S2
**Testing**: gateway `pnpm vitest run test/ci/` + targeted vitest beside touched files (never the full suite); hub `bun run check` + vitest on touched files with `HUB_TEST_DB_URL`; prod proof = heartbeat RSS series and `docker service ps` task history
**Target Platform**: netcup Docker Swarm (two gateway services), hub on Vercel
**Constraints**: single replica per gateway (stop-first updates); each prod change reversible by one command; no new alerting service; owner merges every slice
**Scale/Scope**: 2 gateways, ~1 RPC/s when a dashboard is open, 15 GiB host

## Constitution Check

- **I. Spec before code**: S0 preceded the spec and is declared as a hotfix in spec.md; S1–S5 follow plan → tasks. ✅ (declared exception)
- **II. AS-IS → TO-BE → DELTA with evidence**: profile, heartbeat series, crash logs and code anchors in spec §AS-IS. ✅
- **III. Slice-scoped delivery**: six slices, one PR each from an isolated worktree, gates in the foreground. ✅
- **IV. Required build steps**: hub notification needs Paraglide strings + `i18n:compile`; host-card edits run `lint:design && lint:tokens`; no new hub route (no route-contract count change) unless S2 adds an API, in which case manifest + 6 counts. ✅
- **V. Security/data gates**: not tagged; owner gate at merge and at each prod env edit. ✅
- **Open-items ledger**: hub's one-connection-per-RPC pattern stays; recorded as a proposal if S5 keeps the TTL approach. ✅

## Slices

| Slice | Repo → base | Content | Proof | Prod step (owner or recorded) |
|---|---|---|---|---|
| **S0** hotfix | gateway → `DEV` (PR #364, open) | content-keyed validator cache + `removeSchema`; unit test | 500 synthetic RPCs move RSS < 150 MB on a local gateway; CI green | release DEV→main, controller update; heartbeat RSS flat across a weekday |
| **S1** heartbeat identity | gateway config (prod) + hub → `master` | FACES `hubMetrics` push enabled with its own `serverId`/org; MINION heartbeat org corrected; host card shows both | `gateway_heartbeats` rows for `a64274a8…` within 1 min; tenant ids right | config edits per tenant (reversible) |
| **S2** memory alert | hub → `master` | threshold (3 GB) + slope (predicts ceiling < 24 h) + no-data (10 min) → one in-app notification per episode | unit test with a synthetic series; staging notification | deploy |
| **S3** fail-loud limits | meta `deploy/swarm/` + prod | `NODE_OPTIONS=--max-old-space-size=<N>` and swarm `--limit-memory` chosen against the host budget | allocate past the limit in a scratch container → only it restarts | `docker service update` per service (reversible) |
| **S4** qmd on FACES | gateway `Dockerfile` → `DEV` **or** FACES config | build `@tobilu/qmd` into the image, or disable the memory plugin for the FACES tenant | zero `qmd update failed` lines in 24 h | release or config edit |
| **S5** fewer reloads | gateway → `DEV` | `DEFAULT_CONFIG_CACHE_MS` 200 → 10 000 (hub writes already `clearConfigCache`); remove interim env | config reads ≤ 6/min under polling; hub toggle still applies ≤ hot-reload window | release; `--env-rm OPENCLAW_CONFIG_CACHE_MS` |

Dependencies: S1 before S2 (alert needs both streams). S3 after S0 is verified (so the ceiling is not hit by the known leak). S5 removes the interim env applied 2026-11-01.

## Risks

- S0 verification depends on the release path (DEV→main promotion, controller update), which the owner runs; until then the interim 10 s cache on both services slows the leak ~8–30× but does not stop it.
- S3's heap limit must be below the swarm limit, or Swarm kills the process with SIGKILL and no heap signature.
- S4 image build: `@tobilu/qmd` needs a build step in the Dockerfile; disabling per tenant is the smaller change if the FACES tenant does not use memory search.
