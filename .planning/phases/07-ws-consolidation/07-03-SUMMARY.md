---
phase: "07-ws-consolidation"
plan: "03"
subsystem: "minion_hub, minion_site, paperclip-minion"
tags: ["websocket", "migration", "shared-client", "GatewayClient", "consumer"]
dependency_graph:
  requires: ["07-02"]
  provides: ["hub-migrated-WS-03", "site-migrated-WS-03", "paperclip-migrated-WS-04"]
  affects: ["minion_hub", "minion_site", "paperclip-minion"]
tech_stack:
  added: ["@minion-stack/shared@^0.3.0 (hub)", "@minion-stack/shared@^0.3.0 (site, bumped from 0.1.0)", "@minion-stack/shared@^0.3.0 (paperclip adapter)"]
  patterns: ["onChallenge callback pattern", "autoReconnect: true (browser)", "autoReconnect: false (Node/paperclip)", "(client as any).ws binary shim"]
key_files:
  created:
    - paperclip-minion/packages/adapters/openclaw-gateway/src/server/gateway-helpers.ts
    - .planning/phases/07-ws-consolidation/SITE-SMOKE.md
  modified:
    - minion_hub/package.json
    - minion_hub/src/lib/services/gateway.svelte.ts
    - minion_hub/src/lib/types/index.ts
    - minion_hub/src/lib/utils/index.ts
    - minion_hub/src/lib/utils/uuid.test.ts
    - minion_hub/src/lib/components/agents/AgentSidebar.svelte
    - minion_hub/src/lib/components/agents/AddAgentModal.svelte
    - minion_hub/src/lib/components/agents/AgentDetail.svelte
    - minion_hub/src/lib/components/agents/AgentRow.svelte
    - minion_hub/src/lib/components/layout/DetailHeader.svelte
    - minion_hub/src/lib/components/sessions/SessionDropdown.svelte
    - minion_hub/src/lib/state/gateway/gateway-data.svelte.ts
    - minion_hub/src/lib/state/features/hosts.svelte.ts
    - minion_hub/src/lib/workshop/gateway-bridge.ts
    - minion_site/package.json
    - minion_site/src/lib/services/member-gateway.svelte.ts
    - paperclip-minion/packages/adapters/openclaw-gateway/package.json
    - paperclip-minion/packages/adapters/openclaw-gateway/src/server/gateway-client.ts
    - paperclip-minion/packages/adapters/openclaw-gateway/src/server/execute.ts
    - paperclip-minion/packages/adapters/openclaw-gateway/src/server/hire-approved.ts
decisions:
  - "Hub binary channel (Yjs) uses (client as any).ws shim — GatewayClient exposes no public binary API; TODO(phase-8) upstream proper binary channel accessor"
  - "EventFrame cast to Record<string,unknown> uses double-cast (frame as unknown as Record<string,unknown>) to satisfy TypeScript strict mode"
  - "gateway-client.ts shim is 29 lines (plan said ≤20 but re-exporting helpers added lines — still clearly a shim)"
  - "deviceIdentity declaration moved outside while loop in execute.ts so onChallenge closure can capture it"
  - "site bun run build: ws warnings from Vercel server-side bundler are expected (./node subpath); browser client bundle confirmed ws-free"
metrics:
  duration: "~90 min"
  completed_date: "2026-04-21"
  tasks_completed: 3
  tasks_total: 3
requirements:
  - WS-03
  - WS-04
---

# Phase 07 Plan 03: Consumer Migration — Summary

**One-liner:** All three WS gateway consumers (hub, site, paperclip) migrated from hand-rolled WebSocket lifecycles to `GatewayClient`/`createNodeGatewayClient` from `@minion-stack/shared@^0.3.0`; hub's duplicate type/util files deleted; three PRs open and green.

## PRs Opened

| Consumer | PR | Base Branch | Status |
|----------|-----|------------|--------|
| minion_hub | https://github.com/NikolasP98/minion_hub/pull/20 | dev | Open |
| minion_site | https://github.com/NikolasP98/minion-site/pull/6 | master | Open |
| paperclip-minion | https://github.com/NikolasP98/paperclip/pull/2 | minion-integration | Open |

## Task 1: Hub (fb42dd9)

### Files Deleted (hub duplicates)

| File | Pre-delete LOC |
|------|---------------|
| `minion_hub/src/lib/types/gateway.ts` | 136 |
| `minion_hub/src/lib/utils/uuid.ts` | 7 |
| `minion_hub/src/lib/utils/session-key.ts` | 16 |
| **Total removed** | **159 LOC** |

`minion_hub/src/lib/utils/text.ts` (115 LOC) — **kept local** per D-05 (handles `tool_use`/`tool_result`/`image` blocks that shared's extractText does not).

### Import sites updated (11 files)

- `src/lib/services/gateway.svelte.ts` — rewrote to use `GatewayClient`
- `src/lib/components/agents/AgentSidebar.svelte` — `Agent` type
- `src/lib/components/agents/AddAgentModal.svelte` — `Agent` type
- `src/lib/components/agents/AgentDetail.svelte` — `Agent` type
- `src/lib/components/agents/AgentRow.svelte` — `Agent` type
- `src/lib/components/layout/DetailHeader.svelte` — `Agent` type
- `src/lib/components/sessions/SessionDropdown.svelte` — `Session` type
- `src/lib/state/gateway/gateway-data.svelte.ts` — `Agent`, `Session`, `PresenceEntry`, `HelloOk`
- `src/lib/state/features/hosts.svelte.ts` — `uuid`
- `src/lib/workshop/gateway-bridge.ts` — `uuid`
- `src/lib/utils/uuid.test.ts` — test updated to import from `@minion-stack/shared`

### Barrel files updated

- `src/lib/types/index.ts` — re-exports gateway types from `@minion-stack/shared`
- `src/lib/utils/index.ts` — re-exports `uuid` and `parseAgentSessionKey` from `@minion-stack/shared`

### Binary frame shim

Yjs workshop binary channel preserved via `(client as unknown as { ws: ... }).ws` accessor with `TODO(phase-8)` comment. The challenge/connect handshake is wired via `onChallenge`, binary listener attached after `client.connect()` resolves.

### Test results

- `bun run check`: 0 migration-related errors (17 pre-existing errors unchanged — AgentCreateWizard, ChannelsTab, builder routes)
- `bun run test`: **342/342 tests pass** including uuid.test.ts (now imports from shared)

## Task 2: Site (dc6233e)

Replaced 373-LOC hand-rolled WebSocket lifecycle in `member-gateway.svelte.ts` with `GatewayClient`.

- No local duplicate files existed in site (Phase 4 already cleaned utils)
- `@minion-stack/shared` bumped from `^0.1.0` → `^0.3.0`
- `bun run check`: **0 errors**
- `bun run build`: succeeds; browser bundle confirmed ws-free (grep on client chunks returns 0 matches)
- Server-side Vercel bundler emits expected `ws` peerDep warnings — these are from `./node` subpath and do not affect browser bundle

### SITE-SMOKE.md

Manual verification runbook created at `.planning/phases/07-ws-consolidation/SITE-SMOKE.md` per D-06 (site has no vitest). Covers: connect → challenge handshake → chat round-trip → reconnect after network flap.

## Task 3: Paperclip (f01da4e0)

### gateway-client.ts shim (29 lines)

Re-exports `GatewayClient as GatewayWsClient`, `PROTOCOL_VERSION`, `createNodeGatewayClient`, frame types, and all paperclip-local helpers from `gateway-helpers.ts`. Call sites that imported helpers from `gateway-client.ts` continue to work without changes.

### gateway-helpers.ts (new, 120 lines)

Contains all paperclip-local utilities:
- `asRecord`, `nonEmpty`, `withTimeout`, `toStringRecord`
- `headerMapGetIgnoreCase`, `headerMapHasIgnoreCase`, `toAuthorizationHeaderValue`, `resolveAuthToken`
- `GatewayResponseError`, `GatewayLogFn`, `GatewayClientRequestOptions` types
- `withLogging()` decorator wrapping `client.request` with error-to-onLog forwarding (D-04)

### execute.ts refactoring

Three `GatewayWsClient` instantiation sites updated to `createNodeGatewayClient`:
1. `execute()` main loop — device signing logic moved into `onChallenge` closure; `deviceIdentity` declaration moved outside `while` loop so closure captures it correctly
2. `autoApproveDevicePairing()` — simpler challenge params in `onChallenge`
3. All use `autoReconnect: false` (single-shot adapter runs per Pitfall 4)

### Test results

- `pnpm typecheck`: **all packages green** (0 errors)
- `pnpm --filter @paperclipai/adapter-openclaw-gateway build`: succeeds
- `pnpm test:run`: **1187/1188 tests pass** (1 pre-existing skip)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Barrel files re-exported deleted modules**
- **Found during:** Task 1 Step F (bun run check)
- **Issue:** `src/lib/types/index.ts` exported `./gateway` and `src/lib/utils/index.ts` exported `./session-key` and `./uuid` — all deleted files
- **Fix:** Updated barrels to re-export the symbols from `@minion-stack/shared` instead
- **Files modified:** `src/lib/types/index.ts`, `src/lib/utils/index.ts`, `src/lib/utils/uuid.test.ts`

**2. [Rule 1 - Bug] EventFrame → Record cast failed TypeScript strict check**
- **Found during:** Task 1 Step F
- **Issue:** `frame as Record<string, unknown>` rejected because `EventFrame` doesn't have an index signature
- **Fix:** Changed to `frame as unknown as Record<string, unknown>` (double-cast pattern)
- **Files modified:** `src/lib/services/gateway.svelte.ts`

**3. [Rule 2 - Missing] deviceIdentity hoisted out of while loop**
- **Found during:** Task 3 — `onChallenge` closure needed access to `deviceIdentity` which was set inside the loop body after the client was created
- **Fix:** Moved `let deviceIdentity` declaration outside the `while (true)` loop; assignment remains inside loop (before client construction)
- **Files modified:** `paperclip-minion/packages/adapters/openclaw-gateway/src/server/execute.ts`

### Plan Note: gateway-client.ts shim is 29 lines (plan said ≤20)

The shim re-exports all paperclip-local helpers in addition to the shared types. This is correct — it serves as the single import point for call sites that previously imported helpers from gateway-client. The extra lines are type-only re-exports with no runtime cost.

## Known Stubs

None — all three consumers are fully wired to `GatewayClient`.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. The migration replaces existing WebSocket logic with shared implementation; the trust boundary (consumer → gateway server) is unchanged.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| 07-03-SUMMARY.md exists | FOUND |
| SITE-SMOKE.md exists | FOUND |
| gateway-helpers.ts exists | FOUND |
| types/gateway.ts deleted | CONFIRMED |
| utils/uuid.ts deleted | CONFIRMED |
| utils/session-key.ts deleted | CONFIRMED |
| utils/text.ts kept | CONFIRMED |
| hub commit fb42dd9 | FOUND |
| site commit dc6233e | FOUND |
| paperclip commit f01da4e0 | FOUND |
