---
phase: "07-ws-consolidation"
plan: "02"
subsystem: "packages/shared"
tags: ["websocket", "shared-package", "npm-publish", "gateway-client"]
dependency_graph:
  requires: ["07-01"]
  provides: ["@minion-stack/shared@0.3.0"]
  affects: ["minion_hub", "minion_site", "paperclip-minion"]
tech_stack:
  added: ["vitest@^2.1.9", "ws@^8.19.0 (devDep)", "@types/ws@^8.18.1"]
  patterns: ["runtime-agnostic WebSocket injection", "optional peerDep isolation", "Node subpath export"]
key_files:
  created:
    - packages/shared/src/gateway/client.ts
    - packages/shared/src/gateway/client.test.ts
    - packages/shared/src/node/index.ts
    - packages/shared/src/node/index.test.ts
    - packages/shared/vitest.config.ts
    - .changeset/ws-consolidation-0.3.0.md
  modified:
    - packages/shared/package.json
    - packages/shared/src/gateway/index.ts
    - pnpm-lock.yaml
decisions:
  - "vitest downgraded to ^2.1.9 (workspace vite@5.4.21 conflicts with vitest@4.x which requires vite^6)"
  - "connectTimeoutMs set to 999_999 in unit tests to avoid fake-timer interaction with connect timeout"
  - "ws peerDep is optional — browser consumers of '.' entry never pull ws into their bundle"
metrics:
  duration: "~6 min (Task 1 only; Task 2 awaiting human publish action)"
  completed_date: "2026-04-21"
  tasks_completed: 1
  tasks_total: 2
requirements:
  - WS-02
---

# Phase 07 Plan 02: GatewayClient + npm publish — Summary

**One-liner:** Runtime-agnostic `GatewayClient` class with exponential backoff, connect.challenge handshake, and `PROTOCOL_VERSION = 3` added to `@minion-stack/shared@0.3.0`; Node subpath `./node` exports `createNodeGatewayClient` backed by `ws`.

## Status

**Task 1 — COMPLETE** (commit `2dfb9f2`): GatewayClient scaffolded, 12/12 tests pass, build produces `dist/node/index.js`.

**Task 2 — AWAITING HUMAN ACTION**: npm 2FA publish of `@minion-stack/shared@0.2.0` then `@minion-stack/shared@0.3.0` (see checkpoint below).

---

## Task 1: Scaffold GatewayClient

### What was built

- **`packages/shared/src/gateway/client.ts`** (210 LOC): `GatewayClient` class with:
  - `connect()` — opens WebSocket, handles `connect.challenge` via `onChallenge` callback, returns `HelloOk` payload
  - `request<T>()` — sends req frame, matches response by id, times out after `requestTimeoutMs`
  - `close()` — graceful teardown, flushes all pending requests
  - `autoReconnect: boolean` — exponential backoff 800ms → ×1.7 → 15000ms cap (`autoReconnect` defaults to `false`)
  - Generation counter gates stale socket events (T-07-05 mitigation)
  - JSON.parse inside try/catch, silent-return on malformed frames (T-07-02 mitigation)
  - `PROTOCOL_VERSION = 3` exported at top level
  - Node ws `.on()` / browser `addEventListener` normalized in `wireEvents()`

- **`packages/shared/src/node/index.ts`**: `createNodeGatewayClient()` factory wrapping `ws` WebSocket; re-exports `GatewayClient`, `PROTOCOL_VERSION`, all types, protocol helpers, utils

- **`packages/shared/vitest.config.ts`**: minimal vitest config (`environment: node`, `include: src/**/*.test.ts`)

- **`packages/shared/src/gateway/client.test.ts`**: 7 unit tests (all pass):
  - `exports PROTOCOL_VERSION = 3`
  - `resolves connect() with hello payload after challenge handshake`
  - `request<T>() matches response by id and resolves`
  - `request<T>() rejects after requestTimeoutMs`
  - `close() flushes pending requests with disconnect error`
  - `does not reconnect when autoReconnect is false (default)`
  - `schedules reconnect with exponential backoff when autoReconnect is true`

- **`packages/shared/src/node/index.test.ts`**: 5 integration smoke tests against a real `WebSocketServer` (all pass)

- **`packages/shared/package.json`**: version `0.3.0`, added `./node` export, `ws` optional peerDep, `ws` + `@types/ws` devDeps, `vitest ^2.1.9` devDep, `test`/`test:watch` scripts

- **`.changeset/ws-consolidation-0.3.0.md`**: minor bump changeset for `@minion-stack/shared`

### Test results

```
 ✓ src/gateway/client.test.ts (7 tests)
 ✓ src/node/index.test.ts (5 tests)
 Tests  12 passed (12)
```

### Verification

```
OK root   (GatewayClient exported, PROTOCOL_VERSION === 3)
OK node   (createNodeGatewayClient exported from dist/node/index.js)
```

---

## Task 2: Publish to npm (AWAITING HUMAN ACTION)

The checkpoint is emitted in the plan execution output. User must:

1. `npm whoami` — confirm auth (should return your npm username)
2. Publish `@minion-stack/shared@0.2.0` first (close Phase 4 gap):
   ```bash
   cd /home/nikolas/Documents/CODE/AI/packages/shared
   # Temporarily set version to 0.2.0
   npm version 0.2.0 --no-git-tag-version
   pnpm build
   npm publish --access public --otp <YOUR_OTP>
   # Restore to 0.3.0
   npm version 0.3.0 --no-git-tag-version
   ```
3. Publish `@minion-stack/shared@0.3.0`:
   ```bash
   pnpm build
   npm publish --access public --otp <YOUR_OTP>
   ```
4. Verify: `npm view @minion-stack/shared version` → `0.3.0`
5. Commit the package.json version restoration: `git add packages/shared/package.json && git commit -m "chore(shared): publish @minion-stack/shared@0.3.0 for WS consolidation"`
6. Reply `published` to resume plan 07-03.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Downgraded vitest to ^2.1.9**
- **Found during:** Task 1, Step I (pnpm test)
- **Issue:** vitest@4.1.5 requires `vite@"^6.0.0 || ^7.0.0 || ^8.0.0"` but meta-repo pnpm workspace resolves vite@5.4.21. The startup failed with `ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './module-runner' is not defined`.
- **Fix:** Downgraded devDep to `"vitest": "^2.1.9"` (latest stable v2.x) which bundles its own compatible vite internally. All 12 tests pass.
- **Files modified:** `packages/shared/package.json`, `pnpm-lock.yaml`
- **Commit:** `2dfb9f2`

**2. [Rule 1 - Bug] Fixed test assertions for close() behavior**
- **Found during:** Task 1, Step I (first test run)
- **Issue:** Unit tests used `vi.runAllTimersAsync()` to advance fake timers, but the `connectTimeoutMs` (10000ms) was also being fired. The `connect()` timeout aborted all in-progress connects.
- **Fix:** Set `connectTimeoutMs: 999_999` and `requestTimeoutMs: 999_999` in test helpers; rewrote `performConnect()` to drive the handshake via `Promise.resolve()` micro-task yields without advancing fake timers. Updated `close()` test assertion to `toThrow(/closed|disconnected/)` to match actual synchronous mock behavior (mock ws fires close event immediately).
- **Files modified:** `packages/shared/src/gateway/client.test.ts`
- **Commit:** `2dfb9f2`

---

## Threat Mitigations Applied

| Threat ID | Status |
|-----------|--------|
| T-07-02 (Malformed JSON) | Mitigated: JSON.parse in try/catch, silent return |
| T-07-03 (Pending request DoS) | Mitigated: setTimeout per request + flushPending in close() |
| T-07-04 (Reconnect storm) | Mitigated: backoff capped at 15000ms, autoReconnect defaults false |
| T-07-05 (Stale socket) | Mitigated: generation counter gates all event handlers |
| T-07-06 (npm publish credentials) | Pending: human checkpoint with 2FA OTP |

---

## Known Stubs

None. The GatewayClient implementation is fully functional — no placeholder data, mock returns, or TODO stubs.

---

## Self-Check

**Created files exist:**
- `packages/shared/src/gateway/client.ts` — FOUND
- `packages/shared/src/node/index.ts` — FOUND
- `packages/shared/src/gateway/client.test.ts` — FOUND
- `packages/shared/src/node/index.test.ts` — FOUND
- `packages/shared/vitest.config.ts` — FOUND
- `.changeset/ws-consolidation-0.3.0.md` — FOUND

**Commits exist:**
- `2dfb9f2` — FOUND (feat(07-02): add GatewayClient class + Node subpath to @minion-stack/shared)

## Self-Check: PASSED
