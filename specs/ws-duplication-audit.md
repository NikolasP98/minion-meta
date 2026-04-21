# WS Client Duplication Audit

**Date:** 2026-04-21
**Phase:** 07-ws-consolidation
**Status:** pre-migration inventory

Three independent WebSocket gateway-client implementations exist across the minion stack: a 920-LOC browser client in `minion_hub`, a 373-LOC browser client in `minion_site`, and a 355-LOC Node.js client in `paperclip-minion/packages/adapters/openclaw-gateway`. All three implement the same custom JSON frame protocol (req/res/event) and the same `connect.challenge` → `connect` handshake, but with divergent reconnect policies, auth wiring, and runtime assumptions. Phase 4 already consolidated the _protocol layer_ (`sendRequest`, `handleResponseFrame`, `flushPending`, frame types) into `@minion-stack/shared`; it also migrated `minion_site` to consume that shared package. Phase 7 finishes the job by extracting the outer _WebSocket lifecycle_ (connection management, challenge handshake, backoff) into a new `GatewayClient` class in `@minion-stack/shared`, and deleting the duplicate implementations and types that remain in `minion_hub` and `paperclip-minion`.

---

## Baseline: @minion-stack/shared (Phase 4)

_Measured 2026-04-21 via `wc -l`._

| File | Exports | LOC |
|------|---------|-----|
| `packages/shared/src/gateway/types.ts` | `RequestFrame`, `ResponseFrame`, `EventFrame`, `GatewayFrame`, `StateVersion`, `PresenceEntry`, `SessionDefaults`, `GatewaySnapshot`, `HelloOk`, `Agent`, `Session`, `ChatEvent`, `ShutdownEvent`, `ChatMessage`, `AgentChatState`, `AgentActivityState` | 158 |
| `packages/shared/src/gateway/protocol.ts` | `PendingRequest`, `sendRequest`, `handleResponseFrame`, `flushPending` | 66 |
| `packages/shared/src/gateway/connection.ts` | `ConnectionOptions`, `ConnectionState`, `createConnectionState`, `connect`, `disconnect` | 96 |
| `packages/shared/src/utils/uuid.ts` | `uuid` | 7 |
| `packages/shared/src/utils/session-key.ts` | `parseAgentSessionKey` | 16 |
| `packages/shared/src/utils/text.ts` | `extractText`, `parseGatewayMetadata`, `extractMessageTimestamp`, `cleanText` | 80 |

**Current npm version:** `@minion-stack/shared@0.1.0` (latest on npm).
**Local workspace version:** `0.2.0` (changeset staged but not yet published — see Pitfall 6 in RESEARCH.md).
**Phase 7 target version:** `0.3.0`, which adds `GatewayClient`, `PROTOCOL_VERSION`, and the `./node` subpath export.

---

## Consumer 1: minion_hub (browser, Bun SvelteKit)

_Measured 2026-04-21. Hub has **no** dependency on `@minion-stack/shared` in `package.json`._

### `minion_hub/src/lib/services/gateway.svelte.ts` — **920 LOC**

The hub's primary gateway client. Responsibilities:

- WebSocket lifecycle: `wsConnect()` / `wsDisconnect()` public API
- Binary-frame routing (Yjs workshop sync): sets `ws.binaryType = 'arraybuffer'`, notifies `binaryListeners` on `ArrayBuffer` messages
- Generation counter (`wsGeneration`) gates stale-socket events
- Exponential reconnect backoff: 800ms base, ×1.7 factor, 15000ms cap
- `connect.challenge` → `connect` handshake: calls `/api/device-identity/sign` to obtain a signed device payload, then calls `connect` RPC with protocol v3 params
- Inline request/response matching: own `pending` map + `sendReq()` / `flushPending()` functions (duplicates `protocol.ts` logic)
- Agent and session event routing: `agent`, `session.update`, `session.evict`, `chat`, `reliability.event`, `config.update`, `shutdown`
- Polling (`setInterval` for `agents.list`, `presence.list`)
- Toast integration: `toastError`, `toastSuccess`, `toastInfo` on connect/disconnect/errors
- Workshop auto-save and reset on disconnect

### `minion_hub/src/lib/types/gateway.ts` — **136 LOC** — DUPLICATE

Frame types imported by hub components. Diff vs `packages/shared/src/gateway/types.ts`:

- **Hub has:** comment "Ported from src/gateway/protocol/schema/frames.ts + snapshot.ts"; comment "// Chat event from gateway"; does NOT have `ChatMessage`, `AgentChatState`, `AgentActivityState`
- **Shared has:** `ChatMessage`, `AgentChatState`, `AgentActivityState` (22 extra lines)
- All other type definitions are **byte-for-byte identical** across the 14 shared interfaces/types (`RequestFrame`, `ResponseFrame`, `EventFrame`, `GatewayFrame`, `StateVersion`, `PresenceEntry`, `SessionDefaults`, `GatewaySnapshot`, `HelloOk`, `Agent`, `Session`, `ChatEvent`, `ShutdownEvent`)

**Disposition:** DELETE in Phase 7. All import sites must be repointed to `@minion-stack/shared`.

### `minion_hub/src/lib/utils/uuid.ts` — **7 LOC** — DUPLICATE (byte-for-byte)

`diff` vs `packages/shared/src/utils/uuid.ts` returns no differences. Identical `uuid()` function with `crypto.randomUUID` + Math.random fallback.

**Disposition:** DELETE in Phase 7.

### `minion_hub/src/lib/utils/session-key.ts` — **16 LOC** — DUPLICATE (byte-for-byte)

`diff` vs `packages/shared/src/utils/session-key.ts` returns no differences. Identical `parseAgentSessionKey()` function.

**Disposition:** DELETE in Phase 7.

### `minion_hub/src/lib/utils/text.ts` — **115 LOC** — DIVERGENT SUPERSET

Hub's version handles additional Claude content block types vs the shared base (80 LOC):

- `tool_use` blocks: emits `[Tool: ${name}]` placeholder string
- `tool_result` blocks: extracts text content from result or returns raw string
- `image` / `image_url` blocks: emits `[Image]` placeholder

These block types appear in Claude API responses and are rendered in hub's chat panel. Shared's `extractText` returns `null` for any non-`text` block type. Removing hub's version would cause the chat UI to silently drop tool-call turns and image messages.

**Disposition:** KEEP hub's copy local per Phase 7 decision D-05. Hub must NOT import `extractText` from `@minion-stack/shared` — it must continue importing from `$lib/utils/text`. (The shared version could be upgraded to be the superset in a future phase.)

### Import-site inventory (hub)

Grep: `grep -rn "\$lib/types/gateway\|\$lib/utils/uuid\|\$lib/utils/session-key\|\$lib/utils/text" minion_hub/src`

| File | Import |
|------|--------|
| `src/lib/services/gateway.svelte.ts` | uuid, extractText, HelloOk/ChatEvent/Session types, parseAgentSessionKey |
| `src/lib/components/agents/AgentSidebar.svelte` | Agent type |
| `src/lib/components/agents/AddAgentModal.svelte` | Agent type |
| `src/lib/components/agents/AgentDetail.svelte` | Agent type |
| `src/lib/components/agents/AgentRow.svelte` | Agent type |
| `src/lib/components/chat/ChatMessage.svelte` | extractText, extractMessageTimestamp |
| `src/lib/components/layout/DetailHeader.svelte` | Agent type |
| `src/lib/components/sessions/SessionDropdown.svelte` | Session type |
| `src/lib/workshop/gateway-bridge.ts` | uuid, extractText |
| `src/lib/state/features/hosts.svelte.ts` | uuid |
| `src/lib/state/gateway/gateway-data.svelte.ts` | Agent, Session, PresenceEntry, HelloOk types |

**Total import sites requiring rewiring in 07-03:** 11 files. All `$lib/types/gateway` → `@minion-stack/shared`. All `$lib/utils/uuid` → `@minion-stack/shared`. All `$lib/utils/session-key` → `@minion-stack/shared`. `$lib/utils/text` import sites remain unchanged (KEEP local).

---

## Consumer 2: minion_site (browser, Bun SvelteKit)

_Status: **partially migrated** in Phase 4._

### `minion_site/src/lib/services/member-gateway.svelte.ts` — **373 LOC**

The site's member gateway client. Already imports from `@minion-stack/shared`:

```
import {
  type PendingRequest, type HelloOk, type ChatEvent, type Session,
  sendRequest as protocolSendRequest, handleResponseFrame, flushPending,
  parseAgentSessionKey, extractText, uuid,
} from '@minion-stack/shared';
```

However, the WebSocket lifecycle is still hand-rolled:

- Own `wsGeneration` counter and `pending` map
- Own `scheduleReconnect()` with exponential backoff (`800 * 1.7^(wsGeneration % 10)`, capped 15000)
- Own `connect.challenge` → `connect` handshake (calls `/api/device-identity/sign`, then `protocolSendRequest`)
- Polling via `setInterval` for `sessions.list` every 30s

**Remaining duplication after Phase 4:** The protocol helpers are shared, but the WebSocket connection management loop is still a local implementation. Phase 7 (plan 07-03) will replace this with `GatewayClient` from `@minion-stack/shared`, reducing this file to a thin reactive wrapper.

### Import-site inventory (site)

Grep: `grep -rn "@minion-stack/shared" minion_site/src`

| File | Imports |
|------|---------|
| `src/lib/services/member-gateway.svelte.ts` | PendingRequest, HelloOk, ChatEvent, Session, sendRequest, handleResponseFrame, flushPending, parseAgentSessionKey, extractText, uuid |
| `src/lib/state/member.svelte.ts` | Agent, Session, ChatMessage, AgentChatState, AgentActivityState (types only) |
| `src/lib/components/members/ChatTab.svelte` | extractText |

**Current dep in `minion_site/package.json`:** `"@minion-stack/shared": "^0.1.0"` — will bump to `^0.3.0` in plan 07-03.

No duplicate local copies of types or utils exist in `minion_site/src`. The site is clean aside from the inline WebSocket lifecycle.

---

## Consumer 3: paperclip-minion (Node, pnpm workspace)

_Adapter: `@paperclipai/adapter-openclaw-gateway`. **No** dependency on `@minion-stack/shared`._

### `paperclip-minion/packages/adapters/openclaw-gateway/src/server/gateway-client.ts` — **355 LOC**

Exports `class GatewayWsClient` — the paperclip Node.js gateway client. Uses `ws` npm package (not browser `WebSocket`).

Full export inventory:

| Export | Disposition in Phase 7 |
|--------|----------------------|
| `GatewayWsClient` (class) | **Migrate** — re-export from `@minion-stack/shared/node` as `GatewayClient`; alias `GatewayWsClient = GatewayClient` in shim |
| `PROTOCOL_VERSION = 3` | **Migrate** — re-export from `@minion-stack/shared` |
| `GatewayRequestFrame` (type) | **Migrate** — use `RequestFrame` from `@minion-stack/shared` |
| `GatewayResponseFrame` (type) | **Migrate** — use `ResponseFrame` from `@minion-stack/shared` |
| `GatewayEventFrame` (type) | **Migrate** — use `EventFrame` from `@minion-stack/shared` |
| `GatewayResponseError` (type) | **Keep local** — paperclip-specific error shape with `gatewayCode` / `gatewayDetails` |
| `GatewayLogFn` (type) | **Keep local** — paperclip-specific `onLog` callback; not moved to shared |
| `GatewayClientOptions` (type) | **Superseded** — by `GatewayClientOptions` from `@minion-stack/shared` (with `onChallenge` callback replacing paperclip's `buildConnectParams` pattern) |
| `GatewayClientRequestOptions` (type) | **Keep local** — paperclip adds `expectFinal?: boolean` field not in shared |
| `asRecord` | **Keep local** — paperclip utility; not needed in shared |
| `nonEmpty` | **Keep local** — paperclip utility |
| `withTimeout` | **Keep local** — paperclip utility |
| `headerMapGetIgnoreCase` | **Keep local** — paperclip auth header parsing |
| `headerMapHasIgnoreCase` | **Keep local** — paperclip auth header parsing |
| `toAuthorizationHeaderValue` | **Keep local** — paperclip auth formatting |
| `resolveAuthToken` | **Keep local** — paperclip auth resolution (reads `x-openclaw-token`, `x-openclaw-auth`, `authorization`) |
| `toStringRecord` | **Keep local** — paperclip utility |

**Key difference from shared `GatewayClient` pattern:** Paperclip's `GatewayWsClient.connect()` takes a `buildConnectParams(nonce)` callback and a `timeoutMs` argument, does NOT auto-reconnect (single-shot: one adapter run = one WS connection), and uses Node.js `ws` events (`.on()`). The shared `GatewayClient` uses `onChallenge` callback and `autoReconnect: boolean` flag; paperclip will call it with `autoReconnect: false`.

### Import-site inventory (paperclip adapter)

Grep: `grep -rn "./gateway-client" paperclip-minion/packages/adapters/openclaw-gateway/src`

| File | LOC | Symbols imported from gateway-client |
|------|-----|--------------------------------------|
| `src/server/execute.ts` | 1107 | GatewayEventFrame, GatewayResponseError, GatewayWsClient, PROTOCOL_VERSION, asRecord, headerMapGetIgnoreCase, headerMapHasIgnoreCase, nonEmpty, resolveAuthToken, toAuthorizationHeaderValue, toStringRecord, withTimeout |
| `src/server/hire-approved.ts` | 128 | GatewayWsClient, PROTOCOL_VERSION, nonEmpty, resolveAuthToken, toAuthorizationHeaderValue, toStringRecord |

Both files are the **only** call sites. After Phase 7 migration, `GatewayWsClient` and `PROTOCOL_VERSION` come from `@minion-stack/shared/node`; the header/auth helper functions stay in a local `gateway-helpers.ts`.

### Out of scope

`paperclip-minion/server/src/realtime/live-events-ws.ts` — uses `WebSocketServer` from `ws` (inbound server, not a gateway client). This is a receive-only WebSocket server endpoint, NOT a gateway consumer. Explicitly OUT OF SCOPE for Phase 7.

---

## Target State: @minion-stack/shared@0.3.0 API Surface

Phase 7 (plans 07-02 through 07-04) adds the following to `packages/shared/`:

### New file: `packages/shared/src/gateway/client.ts`

```typescript
export const PROTOCOL_VERSION = 3;

export interface GatewayClientOptions {
  url: string;
  /** Optional WebSocket constructor (defaults to globalThis.WebSocket). */
  WebSocketImpl?: typeof globalThis.WebSocket;
  /** Second arg to WebSocket constructor (Node ws accepts headers/maxPayload). */
  wsConstructorArgs?: [] | [Record<string, unknown>];
  /** Called when server sends connect.challenge; return the connect request params. */
  onChallenge: (nonce: string) => Promise<Record<string, unknown>>;
  /** Called for every inbound event frame (except connect.challenge). */
  onEvent?: (frame: EventFrame) => void | Promise<void>;
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  /** Called just before a reconnect delay starts (useful for UI toasts). */
  onReconnectScheduled?: (delayMs: number) => void;
  /** true = exponential backoff reconnect (browser default). false = single-shot (Node adapter). Default: false. */
  autoReconnect?: boolean;
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
}

export class GatewayClient {
  constructor(opts: GatewayClientOptions);
  /** Connect and complete the challenge/connect handshake. Resolves with the HelloOk payload. */
  connect(): Promise<unknown>;
  /** Send a gateway request and resolve with the response payload. */
  request<T>(method: string, params?: unknown, opts?: { timeoutMs?: number }): Promise<T>;
  /** Gracefully close the connection and cancel any reconnect timers. */
  close(code?: number, reason?: string): void;
}
```

### New file: `packages/shared/src/node/index.ts`

```typescript
export function createNodeGatewayClient(options: NodeGatewayClientOptions): GatewayClient;
// Re-exports:
export { GatewayClient, PROTOCOL_VERSION } from '../gateway/client.js';
export * from '../gateway/types.js';
export * from '../gateway/protocol.js';
export * from '../utils/index.js';

export interface NodeGatewayClientOptions
  extends Omit<GatewayClientOptions, 'WebSocketImpl' | 'wsConstructorArgs'> {
  headers?: Record<string, string>;
  maxPayload?: number;
}
```

### `packages/shared/package.json` exports-map addition

```jsonc
"./node": {
  "types": "./dist/node/index.d.ts",
  "import": "./dist/node/index.js"
}
```

With peer dependency:

```jsonc
"peerDependencies": { "ws": "^8.0.0" },
"peerDependenciesMeta": { "ws": { "optional": true } }
```

The `./node` subpath is the only entry point that imports `ws`. The browser entry points (`.` and `./gateway`) never reference it. This prevents bundlers from pulling `ws` (and its `net`/`tls` transitive deps) into browser builds.

### `src/index.ts` additions (main barrel)

Re-export `GatewayClient` and `PROTOCOL_VERSION` from the main entry point so browser consumers can `import { GatewayClient } from '@minion-stack/shared'`.

---

## Decisions Locked in This Phase

- **D-01 Package target:** `@minion-stack/shared` — the scope is `@minion-stack/*`, not `@minion/*`. The roadmap line referencing `@minion/shared` is a stale artifact from before the Phase 2 scope rename.
- **D-02 Publish order:** Publish `0.2.0` first (closing the Phase 4 gap), then `0.3.0` with the new GatewayClient additions. This preserves changelog linearity (one Phase 4 bump, one Phase 7 bump). Plan 07-02 executes both publishes.
- **D-03 Yjs binary frames STAY hub-local:** `sendBinary` / `onBinaryMessage` are only consumed by `minion_hub/src/lib/workshop/yjs/yjs-provider.ts`. Site and paperclip have no binary-frame consumers. Keep as hub-local extension on top of the shared client.
- **D-04 `onLog` callback STAYS in paperclip adapter:** Paperclip's `GatewayLogFn` / `onLog(stream, chunk)` is paperclip-specific structured logging. Shared `GatewayClient` has no logging hooks. Paperclip wraps the shared client with a thin logging decorator if needed.
- **D-05 Hub's `utils/text.ts` KEPT local:** Hub's `extractText` handles `tool_use`, `tool_result`, and `image` blocks. Shared's version returns `null` for those types. Hub must NOT switch to the shared import — it would cause silent rendering regressions in the chat panel.
- **D-06 Site verification via manual smoke runbook:** Site has no vitest configuration. Phase 7 verification for `minion_site` is a manual smoke-check (log into staging, connect to gateway, verify chat round-trip). A written runbook will be produced in `.planning/phases/07-ws-consolidation/SITE-SMOKE.md` in plan 07-04.
- **D-07 `minion/` gateway server OUT OF SCOPE:** `minion/` is the server side of the gateway. Phase 7 touches only client-side consumers (hub, site, paperclip). The gateway server's protocol schema files are not modified.
- **D-08 Scope correction:** ROADMAP.md line 19 says `@minion/shared`; the canonical package name is `@minion-stack/shared`. All phase documents use the canonical name.

---

## Requirement Trace

| Requirement | Description | Plan | Status |
|-------------|-------------|------|--------|
| WS-01 | WS client duplication audited; `specs/ws-duplication-audit.md` written | 07-01 (this plan) | Closes on commit |
| WS-02 | Shared WS client consolidated into `@minion-stack/shared`; `@minion-stack/shared@0.2.0` + `0.3.0` published | 07-02 | Pending |
| WS-03 | `minion_hub` migrated: local type/util duplicates deleted, new `@minion-stack/shared@^0.3.0` dep added, `gateway.svelte.ts` rewritten to use `GatewayClient` | 07-03 | Pending |
| WS-04 | `minion_site` dep bumped to `^0.3.0`; `member-gateway.svelte.ts` WebSocket lifecycle replaced by `GatewayClient` | 07-03 | Pending |
| WS-05 | `paperclip-minion` adapter migrated; grep confirms zero duplicate WS classes or frame-type definitions across all three consumers; all three consumers build and pass tests | 07-04 | Pending |

---

## Open Assumptions to Verify During Execution

The following assumptions from the RESEARCH.md Assumptions Log are unvalidated and must be checked by downstream executors:

**A1 — Browser bundler compat with `ws` peerDep:**
Publishing `@minion-stack/shared` with `ws` as an optional peerDependency and isolating Node code under `./node` subpath should prevent Vite/bun from bundling `ws` into browser builds. Must be verified with `bun run build` in `minion_hub` and `minion_site` after the new shared version is linked locally. Fallback: publish a completely separate `@minion-stack/gateway-node` package if the peerDep approach fails.

**A2 — Hub's `text.ts` superset actively used:**
The assumption is that hub's `extractText` (which handles `tool_use`/`tool_result`/`image`) is called in code paths that actually receive those block types from the live gateway. Import sites: `src/lib/services/gateway.svelte.ts` and `src/lib/workshop/gateway-bridge.ts` and `src/lib/components/chat/ChatMessage.svelte`. The chat panel import site confirms UI rendering dependency. Verify by checking if Claude API responses with tool-use content flow through the chat panel in a real session — if yes, keeping hub-local is mandatory; if no, shared's simpler version is safe.

**A3 — Paperclip test suite survives adapter shim:**
After `gateway-client.ts` is replaced by a re-export shim pointing to `@minion-stack/shared/node`, the existing paperclip adapter test file (`server/src/__tests__/openclaw-gateway-adapter.test.ts`) should pass without modification if the re-exported class surface matches. Must be verified by running `pnpm --filter @paperclipai/server test:run` after the adapter migration in plan 07-04.

**A7 — 0.2.0 publish-first vs squash into 0.3.0:**
Local `packages/shared/package.json` is at `0.2.0` with a staged changeset; npm `latest` is `0.1.0`. The safer path is to publish `0.2.0` first (as Phase 4 intended) to preserve changelog linearity, then `0.3.0` for Phase 7 additions. The risk is that squashing both into `0.3.0` would lose the Phase 4 → Phase 7 attribution in the CHANGELOG. Plan 07-02 should publish `0.2.0` first (D-02 above).
