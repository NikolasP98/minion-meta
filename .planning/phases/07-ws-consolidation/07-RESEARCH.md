# Phase 7: WS Consolidation - Research

**Researched:** 2026-04-21
**Domain:** WebSocket gateway client consolidation — extracting the single canonical implementation into `@minion-stack/shared` for hub (SvelteKit/browser), site (SvelteKit/browser), and paperclip (Node backend) consumers
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

**No CONTEXT.md exists for Phase 7.** This phase was spawned without a prior `/gsd-discuss-phase` pass. The planner should run `/gsd-discuss-phase` first or treat this research as the scoping basis.

Scope assumptions derived from the roadmap + success criteria (planner should confirm with user):

- **Package target:** `@minion-stack/shared` (not `@minion/shared` — the roadmap line 19 still carries the old scope from the pre-Phase-2 rename; all packages now use `@minion-stack/*` per D-19 in phase 02 accumulated context). **Confirmed:** the scope correction note in the prompt explicitly flags this.
- **Phase 4 already did half the work:** `@minion-stack/shared@0.1.0` is published on npm with `./gateway` export already containing `RequestFrame`, `ResponseFrame`, `EventFrame`, `GatewayFrame`, `PendingRequest`, `sendRequest`, `handleResponseFrame`, `flushPending`, `ConnectionState`, `createConnectionState`, `connect`, `disconnect`. **Local workspace is already at 0.2.0 unreleased** (changeset staged but not published — see CHANGELOG.md).
- **Site is already a consumer** (Phase 4 migrated it). Hub and paperclip have NOT been migrated and carry their own copies.
- **Paperclip runs Node** — its `GatewayWsClient` uses `ws` (npm package) and `Buffer`. Hub and site run in the browser using the native `WebSocket` global. A shared client must either be runtime-agnostic or expose Node/browser variants.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WS-01 | WS client duplication audited across hub, site, and paperclip's `openclaw_gateway` adapter; report written to `specs/ws-duplication-audit.md` | Duplication fully inventoried below (3 implementations: hub 920 LOC, site 373 LOC, paperclip 1107+128 LOC); exact file paths identified |
| WS-02 | Shared WS client implementation consolidated into `@minion-stack/shared` | Shared package already contains protocol + connection primitives ([VERIFIED: packages/shared/src/gateway/{types,protocol,connection}.ts]); need to add Node-compatible client + PROTOCOL_VERSION constant |
| WS-03 | `minion_hub` and `minion_site` updated to consume the shared client | Site already consumes [VERIFIED: site package.json has `@minion-stack/shared@^0.1.0`, member-gateway.svelte.ts imports]; hub needs migration — currently has no `@minion-stack/shared` dep and duplicates types/utils |
| WS-04 | `paperclip-minion` `openclaw_gateway` adapter updated to consume the shared client | Adapter has its own `GatewayWsClient` class using Node `ws` — requires runtime-neutral design or a Node-flavored export from shared |
| WS-05 | Exactly one WS client implementation exists — grep confirms no duplicate WebSocket classes | Grep targets identified: `new WebSocket(` outside shared; `class.*WsClient\|class Gateway` pattern; duplicate frame type definitions |
</phase_requirements>

---

## Summary

Phase 4 consolidated the **protocol layer** (frame types + `sendRequest`/`handleResponseFrame`/`flushPending`) into `@minion-stack/shared` and wired up the site. But Phase 4 did **not** touch hub (hub has no dep on `@minion-stack/shared` at all) and did **not** touch paperclip. The "WS client" that remains duplicated is the **outer orchestration layer**: the `WebSocket` lifecycle (connect, reconnect, close handling), the `connect.challenge` → `connect` handshake, and in paperclip's case, the full `GatewayWsClient` class.

Three distinct implementations exist, and they are only superficially similar:

| Impl | Runtime | WebSocket | Reconnect? | Challenge handshake | Device auth |
|------|---------|-----------|-----------|---------------------|-------------|
| `minion_hub/src/lib/services/gateway.svelte.ts` (920 LOC) | Browser | `window.WebSocket` | Yes, exponential backoff 800ms→15s | Yes, via `/api/device-identity/sign` | Yes, server-side signed payload |
| `minion_site/src/lib/services/member-gateway.svelte.ts` (373 LOC) | Browser | `window.WebSocket` | Yes, simpler backoff | Yes, via `/api/device-identity/sign` | Yes, identical to hub |
| `paperclip-minion/.../openclaw-gateway/src/server/gateway-client.ts` (356 LOC, exposed as `GatewayWsClient` class) | Node | `ws` package | **No**, single-shot per adapter call | Yes, with callback-built connect params | Yes, `signDevicePayload` in `shared/device-auth.ts` |

They also carry **independent copies** of the gateway frame type definitions (hub has `$lib/types/gateway.ts`, paperclip has inline types in `gateway-client.ts`, site consumes from `@minion-stack/shared` ← the right answer).

**Primary recommendation:** Extend `@minion-stack/shared` with (a) a runtime-agnostic `GatewayClient` class layered on top of the existing protocol/connection primitives, (b) a Node-flavored entry point `@minion-stack/shared/node` that uses `ws`, (c) the `PROTOCOL_VERSION = 3` constant. Migrate hub to `@minion-stack/shared`, delete hub's local `types/gateway.ts` + `utils/uuid.ts` + `utils/session-key.ts` + (carefully) `utils/text.ts`. Rewrite paperclip's `gateway-client.ts` as a thin wrapper over the shared Node client. Keep reconnect policy, auth-header plumbing, and binary-frame support in consumer-specific code where they diverge meaningfully.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@minion-stack/shared` | workspace:* (local 0.2.0, npm latest 0.1.0) | Shared protocol types + connection primitives + (new) `GatewayClient` | Phase 4 established this as the single home for gateway code [VERIFIED: packages/shared/package.json, npm view] |
| `ws` | 8.20.0 (current paperclip uses ^8.19.0) | Node WebSocket implementation | Standard Node WS client; used by paperclip today [VERIFIED: `npm view ws version` returned 8.20.0] |
| `@types/ws` | ^8.18.1 | TS types for `ws` | Paperclip already depends [VERIFIED: openclaw-gateway/package.json] |
| `vitest` | 4.1.5 | Test runner (paperclip root + hub) | Already wired in all consumers [VERIFIED: `npm view vitest version`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `changesets` | already configured | Version-bump + publish shared | Use the `pnpm changeset` pattern from 04/05/06 |
| `tsc` | 5.7.x | Build packages/shared | Already how shared builds [CITED: packages/shared/package.json scripts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Runtime-agnostic `GatewayClient` class with injected `WebSocket` factory | Node-only + browser-only subpackages with shared protocol | Cleaner per-runtime types but more moving parts; rejected because all three implementations converge on the same event loop and a thin adapter surface is enough |
| Publish `@minion-stack/gateway-client` as a separate package | Keep inside `@minion-stack/shared` | Splitting adds publishing ceremony with no semantic benefit — Phase 4 already scoped shared as "gateway + utils" and Phase 7's payload fits that charter |
| `reconnecting-websocket` npm lib | Custom reconnect logic | Existing code already works; switching libraries mid-consolidation multiplies risk |
| `isomorphic-ws` (single import for Node + browser) | Dual entry points | `isomorphic-ws` re-exports `ws` in Node / WebSocket in browser; tempting but it hides runtime differences (e.g. `ws`-specific `headers` option on construction, Buffer-vs-ArrayBuffer message data). Explicit `@minion-stack/shared/node` is clearer |

**Installation after Phase 7:**

```bash
# hub (new dep)
cd minion_hub && bun add @minion-stack/shared@^0.3.0
# site (already has dep — will bump version)
cd minion_site && bun add @minion-stack/shared@^0.3.0
# paperclip adapter (new dep — already in pnpm workspace)
cd paperclip-minion && pnpm --filter @paperclipai/adapter-openclaw-gateway add @minion-stack/shared@^0.3.0
```

**Version verification:**
```bash
npm view @minion-stack/shared version       # returns 0.1.0 as of 2026-04-21
npm view @minion-stack/shared dist-tags      # returns { latest: '0.1.0' }
npm view ws version                          # returns 8.20.0
npm view vitest version                      # returns 4.1.5
```
[VERIFIED: `npm view` executed 2026-04-21]. Local `packages/shared/package.json` says `0.2.0` with changeset staged — Phase 7 will bump to `0.3.0` on publish.

---

## Architecture Patterns

### Current (duplicated) structure

```
packages/shared/                                          ← owns PROTOCOL already
├── src/gateway/
│   ├── types.ts        ← RequestFrame, ResponseFrame, EventFrame, HelloOk, Agent, Session, ChatEvent...
│   ├── protocol.ts     ← sendRequest, handleResponseFrame, flushPending, PendingRequest
│   └── connection.ts   ← createConnectionState, connect, disconnect, scheduleReconnect
└── src/utils/
    ├── uuid.ts
    ├── session-key.ts  ← parseAgentSessionKey
    └── text.ts         ← extractText, cleanText, parseGatewayMetadata, extractMessageTimestamp

minion_hub/ — NOT a consumer of @minion-stack/shared
├── src/lib/types/gateway.ts                             ← DUPLICATE of types.ts
├── src/lib/utils/uuid.ts                                ← DUPLICATE
├── src/lib/utils/session-key.ts                         ← DUPLICATE (identical)
├── src/lib/utils/text.ts                                ← DIVERGED (handles tool_use/tool_result/image blocks)
├── src/lib/state/gateway/connection.svelte.ts          ← UI reactive state wrapper (keep)
├── src/lib/state/gateway/gateway-data.svelte.ts        ← hub-specific gw.agents/sessions/presence state (keep)
├── src/lib/services/gateway.svelte.ts                  ← INLINE: WebSocket + send/handle + challenge + events
└── src/lib/workshop/yjs/yjs-provider.ts                 ← consumes sendBinary/onBinaryMessage from gateway.svelte.ts

minion_site/ — already a consumer of @minion-stack/shared ✓
└── src/lib/services/member-gateway.svelte.ts           ← uses @minion-stack/shared primitives; keeps WebSocket lifecycle locally

paperclip-minion/packages/adapters/openclaw-gateway/
└── src/server/gateway-client.ts                         ← DUPLICATE class GatewayWsClient + DUPLICATE frame types
    └── used by execute.ts (3 call sites: main run, pairing approval) + hire-approved.ts
```

### Target structure after Phase 7

```
packages/shared/
├── src/gateway/
│   ├── types.ts                ← unchanged
│   ├── protocol.ts             ← unchanged
│   ├── connection.ts           ← unchanged
│   ├── constants.ts            ← NEW: export PROTOCOL_VERSION = 3
│   └── client.ts               ← NEW: runtime-agnostic GatewayClient class (accepts WebSocket factory)
├── src/node/
│   └── index.ts                ← NEW: re-exports Node-flavored createGatewayClient using `ws`
├── src/index.ts                ← unchanged (but re-exports new client + PROTOCOL_VERSION)
└── package.json                ← add `./node` export map entry, add `ws` as peerDep (optional)

minion_hub/src/lib/
├── types/gateway.ts             ← DELETED (import from @minion-stack/shared)
├── utils/uuid.ts                ← DELETED
├── utils/session-key.ts         ← DELETED
├── utils/text.ts                ← KEEP (hub-specific enrichment — handles tool_use/tool_result/image)
├── state/gateway/connection.svelte.ts  ← unchanged (Svelte $state wrapper for UI)
└── services/gateway.svelte.ts   ← REWRITE: thin reactive layer over shared GatewayClient; keeps device-identity fetch + toast plumbing + Yjs binary passthrough

minion_site/src/lib/services/
└── member-gateway.svelte.ts     ← MINOR REWRITE: use shared GatewayClient for lifecycle (currently rolls its own)

paperclip-minion/packages/adapters/openclaw-gateway/src/server/
├── gateway-client.ts            ← RE-EXPORTS from @minion-stack/shared/node (1-line file or deleted)
├── execute.ts                   ← imports from @minion-stack/shared + @minion-stack/shared/node
└── hire-approved.ts             ← imports from @minion-stack/shared + @minion-stack/shared/node
```

### Pattern 1: Runtime-agnostic GatewayClient

```typescript
// packages/shared/src/gateway/client.ts — NEW
import { flushPending, handleResponseFrame, sendRequest as protocolSendRequest } from './protocol.js';
import type { PendingRequest } from './protocol.js';
import type { GatewayFrame, EventFrame } from './types.js';

export interface GatewayClientOptions {
  url: string;
  /** Optional WebSocket constructor injection (defaults to globalThis.WebSocket). */
  WebSocketImpl?: typeof WebSocket;
  /** Node ws accepts a second arg (headers / maxPayload). Browsers ignore it. */
  wsConstructorArgs?: unknown[];
  onEvent?: (frame: EventFrame) => void | Promise<void>;
  onChallenge: (nonce: string) => Promise<Record<string, unknown>>; // build connect params
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  /** true = auto-reconnect with exponential backoff (browser default). false = single-shot (Node adapter default). */
  autoReconnect?: boolean;
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
}

export class GatewayClient {
  // ... encapsulates: socket lifecycle, generation counter, pending map,
  //     challenge/connect handshake, request/response matching, reconnect policy
  async connect(): Promise<unknown /* HelloOk payload */> { /* ... */ }
  async request<T>(method: string, params?: unknown, opts?: { timeoutMs?: number }): Promise<T> { /* ... */ }
  close(code?: number, reason?: string): void { /* ... */ }
  // Browser-only: binary-frame API (optional, no-op in Node client)
  sendBinary(data: Uint8Array): void { /* ... */ }
  onBinaryMessage(handler: (data: Uint8Array) => void): () => void { /* ... */ }
}
```

**When to use:** Everywhere a WebSocket connects to the gateway. Browser callers pass no `WebSocketImpl` (uses global). Node callers import from `@minion-stack/shared/node` which injects `ws`.

### Pattern 2: Node entry point using `ws`

```typescript
// packages/shared/src/node/index.ts — NEW
import { WebSocket } from 'ws';
import { GatewayClient, type GatewayClientOptions } from '../gateway/client.js';

export function createNodeGatewayClient(
  options: Omit<GatewayClientOptions, 'WebSocketImpl'> & {
    headers?: Record<string, string>;
    maxPayload?: number;
  }
): GatewayClient {
  return new GatewayClient({
    ...options,
    WebSocketImpl: WebSocket as unknown as typeof globalThis.WebSocket,
    wsConstructorArgs: [{ headers: options.headers, maxPayload: options.maxPayload ?? 25 * 1024 * 1024 }],
  });
}

export { GatewayClient } from '../gateway/client.js';
export * from '../gateway/index.js';
export * from '../utils/index.js';
```

### Pattern 3: Consumer wrap (hub / site)

SvelteKit apps keep their Svelte 5 `$state` reactive wrappers around the shared client — don't push reactive state into `@minion-stack/shared` (it's framework-neutral).

```typescript
// minion_hub/src/lib/services/gateway.svelte.ts — AFTER
import { GatewayClient } from '@minion-stack/shared';
import { conn } from '$lib/state/gateway/connection.svelte';
// ... (keep device-identity fetch, toast wiring, agent event routing)

let client: GatewayClient | null = null;

export function wsConnect() {
  const host = getActiveHost();
  if (!host?.url) return;
  client = new GatewayClient({
    url: host.url,
    autoReconnect: true,
    onChallenge: async (nonce) => {
      const device = await fetchDeviceIdentity(nonce, host.token);
      return { minProtocol: 3, maxProtocol: 3, /* ... */ device };
    },
    onEvent: handleGatewayEvent,
    onOpen: () => { conn.connected = true; /* ... */ },
    onClose: (code, reason) => { conn.connected = false; /* ... */ },
  });
  client.connect().then(onHelloOk).catch(handleConnectError);
}
```

### Anti-Patterns to Avoid

- **Don't push Svelte `$state` into `@minion-stack/shared`.** The package must stay framework-neutral — paperclip is a Node backend with no reactivity. Keep Svelte state wrappers (`conn.svelte.ts`, `gateway-data.svelte.ts`, `member.svelte.ts`) in each consumer.
- **Don't assume `WebSocket.OPEN` is the same enum value in `ws` and browser.** Both use `0/1/2/3` for CONNECTING/OPEN/CLOSING/CLOSED, but typing says otherwise — use a helper `isOpen(ws)` in shared rather than `ws.readyState === WebSocket.OPEN` (the `WebSocket` reference is ambiguous when `ws` is the Node package).
- **Don't unify reconnect policy across runtimes.** Hub wants aggressive reconnect (user experience: always try). Paperclip adapter is single-shot (a failed run should fail, not retry forever inside the adapter). Expose `autoReconnect: boolean` and let consumers choose.
- **Don't ship `ws` as a hard dep of `@minion-stack/shared`.** Browser bundlers will choke on `require('ws')` pulling `net`. Use `peerDependenciesMeta` with `ws` optional, or isolate to the `./node` subpath so tree-shaking excludes it.
- **Don't merge hub's divergent `text.ts` into shared without verifying every site/paperclip call site.** Hub's version emits `[Tool: name]`, `[Image]` placeholders from `tool_use`/`tool_result`/`image` blocks — site's simpler version returns `null` for those. Either upgrade shared's `text.ts` (all consumers benefit — low risk, additive) or keep hub's as a local enrichment layer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frame serialization (req/res/event JSON) | Hand-written JSON.stringify with literal `type: 'req'` | `@minion-stack/shared` protocol helpers | Already consolidated Phase 4 — hub + paperclip currently re-implement |
| Request/response ID matching | Custom `Map<string, Pending>` in each consumer | `sendRequest` + `handleResponseFrame` from `@minion-stack/shared` | Two sources of bugs (timeout handling, flush on disconnect) |
| UUID generation | Custom `Math.random` fallback | `uuid()` from `@minion-stack/shared/utils` | Same code already exists three times |
| Agent session key parsing (`agent:X:Y:Z`) | Ad-hoc regex | `parseAgentSessionKey()` from `@minion-stack/shared/utils` | Identical in hub + shared today |
| WebSocket reconnect with backoff | Hand-tuned setTimeout chain | `GatewayClient` `autoReconnect: true` (new) | Hub and site have slightly different backoff formulas — unify |
| Node `ws` vs browser `WebSocket` abstraction | Import `ws` conditionally | `@minion-stack/shared/node` subpath export | Bundler trap — pulling `ws` into browser bundle fails on `net` |
| Connect challenge/handshake state machine | Custom `connectSent` / `connectNonce` flags | `GatewayClient.onChallenge` callback contract (new) | Three hand-rolled handshakes that all do the same thing |

**Key insight:** The WebSocket layer looks "simple enough to hand-roll" at 100 LOC each — but three hand-rolls (+ their drift) is now ~1400 lines of near-identical logic. Every frame-protocol tweak (seq handling, challenge payload, error code shape) requires three separate PRs. Phase 4 proved the pattern works; Phase 7 finishes the job.

---

## Runtime State Inventory

Phase 7 is a **refactor** (code migration) — no persisted state, OS registrations, or secrets carry a "WS client" name. But there are import surface and runtime changes worth explicit documentation:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — the gateway itself persists sessions/frames in its own SQLite, not in consumers | None |
| Live service config | **n8n / Tailscale ACLs / systemd:** None reference WS client code paths. Gateway URL env vars (`OPENCLAW_GATEWAY_URL`, `OPENCLAW_GATEWAY_TOKEN`) continue to be read by consumers; no shape change | None |
| OS-registered state | **bot-prd systemd on Netcup:** runs `minion gateway:watch` — gateway server code is in `minion/`, not touched by Phase 7. `@minion-stack/shared` is a library consumed by hub/site/paperclip | None |
| Secrets / env vars | `OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_URL` — code rename only, key/env var names unchanged. Site already uses these via Infisical `minion-site`. Hub uses via `minion-hub`. Paperclip via `minion-paperclip` | None to env vars; consumer code continues reading same keys |
| Build artifacts | **Hub:** `.svelte-kit/` rebuild required after deleting local types/utils. **Paperclip:** `packages/adapters/openclaw-gateway/dist/` rebuild after adapter rewrite. **Site:** `.svelte-kit/` rebuild. **@minion-stack/shared `dist/`:** rebuild + publish to npm | Rebuild on install; publish new shared version |

**Import-surface migration (grep-able):**

- Hub: ~20+ import sites of `$lib/types/gateway` and `$lib/utils/{uuid,session-key,text}` need rewiring to `@minion-stack/shared`. Exact list must be enumerated in 07-01 audit.
- Paperclip: `GatewayWsClient`, `PROTOCOL_VERSION`, `asRecord`, `nonEmpty`, `withTimeout`, `headerMapGetIgnoreCase`, `headerMapHasIgnoreCase`, `toAuthorizationHeaderValue`, `resolveAuthToken`, `toStringRecord`, `isResponseFrame`, `isEventFrame` are all exported from `gateway-client.ts` — the `execute.ts` + `hire-approved.ts` imports must be re-pointed or preserved via local re-export stubs. Some of these are paperclip-specific (auth resolution helpers) and should stay local; only the actual WS client + frame types migrate to shared.

---

## Common Pitfalls

### Pitfall 1: `WebSocket` global ambiguity in Node
**What goes wrong:** You write `ws.readyState === WebSocket.OPEN` in shared code. In Node with `ws` package, `WebSocket` the constant refers to the `ws` class, not DOM — enum values happen to match (0/1/2/3) but TypeScript widens the type.
**Why it happens:** `ws` package and DOM `WebSocket` have different type defs.
**How to avoid:** Define `const READY_OPEN = 1` locally, or export an `isOpen(ws): boolean` helper that works on both.
**Warning signs:** TypeScript complains "WebSocket refers to a value, but is being used as a type"; or `instanceof WebSocket` returns false in Node.

### Pitfall 2: Bundler pulls `ws` into browser build
**What goes wrong:** `@minion-stack/shared` `main` entry imports Node-only code → Vite/bundler tries to polyfill `net`, `http`, `tls`.
**Why it happens:** Exports map not set up properly; or `ws` listed in `dependencies` instead of `peerDependencies` / optional.
**How to avoid:** Isolate Node code in `./node` subpath export. Browser consumers import `@minion-stack/shared` (main). Node consumers import `@minion-stack/shared/node` explicitly. Verify with `bun run build` in hub/site and a production bundle size check.
**Warning signs:** Vite build fails with "Module 'net' has been externalized for browser compatibility"; or bundle size jumps +80kb.

### Pitfall 3: Binary-frame channel is hub-only
**What goes wrong:** You move `sendBinary`/`onBinaryMessage` into shared, but site and paperclip don't need them. Adds surface area for something only hub's Yjs workshop consumes.
**Why it happens:** Completeness bias during consolidation.
**How to avoid:** Binary frames stay as hub-local extension on top of the shared client, OR become an optional method on `GatewayClient` that's no-op if unused. Prefer local-to-hub until a second consumer appears.
**Warning signs:** Paperclip E2E breaks because `client.sendBinary is not a function`; or site pulls in Yjs transitively.

### Pitfall 4: Divergent reconnect causes E2E surprise
**What goes wrong:** Paperclip adapter (single-shot) inherits hub's reconnect loop when switched to shared client. A failed run retries forever, blocking the agent worker.
**Why it happens:** Default `autoReconnect: true`.
**How to avoid:** Make `autoReconnect` default false in shared `GatewayClient`; hub + site opt in explicitly. Paperclip's single-shot stays unchanged.
**Warning signs:** Paperclip tests timeout; adapter runs never return.

### Pitfall 5: Hub `text.ts` divergence lost in migration
**What goes wrong:** You replace hub's `$lib/utils/text.ts` with `@minion-stack/shared`'s simpler version. Hub's chat UI stops rendering `[Tool: bash]` placeholders; tool_result content missing.
**Why it happens:** Hub's copy is a superset — handles tool_use, tool_result, image blocks. Shared version only handles plain text.
**How to avoid:** **Either** upgrade shared's `text.ts` to be the superset (site doesn't care — no regression; paperclip doesn't use it), **or** keep hub's version local and don't import `extractText` from shared in hub.
**Warning signs:** Hub chat panel shows blank assistant messages; `extractText` returns `null` for tool-use turns.

### Pitfall 6: Phase 4 archival metadata drift
**What goes wrong:** You bump `@minion-stack/shared` to 0.3.0, but npm `latest` still shows 0.1.0 because 0.2.0 was never published (the changeset exists locally only).
**Why it happens:** Phase 4 executed the changeset but npm publish didn't happen (or happened and was unpublished).
**How to avoid:** Verify `npm view @minion-stack/shared dist-tags` before bumping. If latest ≠ local, decide whether to publish 0.2.0 first (likely yes, to preserve changelog linearity) or squash into 0.3.0 with combined changeset notes.
**Warning signs:** `npm view @minion-stack/shared version` returns 0.1.0 but `packages/shared/package.json` says 0.2.0. [VERIFIED: this is the state as of 2026-04-21.]

### Pitfall 7: Paperclip is on a feature branch targeting a fork
**What goes wrong:** You try to merge changes to `paperclip-minion-integration` but the PR goes to `paperclipai/paperclip` upstream instead of `NikolasP98/paperclip`.
**Why it happens:** Fork-based workflow. [VERIFIED: memory `reference_paperclip_fork.md`]
**How to avoid:** Push to `NikolasP98/paperclip` remote; open PR with `--repo NikolasP98/paperclip`. Current branch `feat/adopt-minion-stack` tracks `fork/feat/adopt-minion-stack`.
**Warning signs:** `gh pr create` defaults to paperclipai upstream.

---

## Code Examples

### Shared GatewayClient — skeleton (new file)

```typescript
// packages/shared/src/gateway/client.ts
// Source: composed from hub/site/paperclip implementations + protocol.ts/connection.ts primitives
import { flushPending, handleResponseFrame, type PendingRequest } from './protocol.js';
import type { EventFrame, GatewayFrame } from './types.js';
import { uuid } from '../utils/uuid.js';

export const PROTOCOL_VERSION = 3;

export interface GatewayClientOptions {
  url: string;
  WebSocketImpl?: typeof globalThis.WebSocket;
  wsConstructorArgs?: [] | [Record<string, unknown>];
  onChallenge: (nonce: string) => Promise<Record<string, unknown>>;
  onEvent?: (frame: EventFrame) => void | Promise<void>;
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onReconnectScheduled?: (delayMs: number) => void;
  autoReconnect?: boolean;
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
}

export class GatewayClient {
  private ws: WebSocket | null = null;
  private generation = 0;
  private pending = new Map<string, PendingRequest>();
  private connectNonce: string | null = null;
  private connectSent = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 800;
  private closed = false;
  private helloResolve: ((value: unknown) => void) | null = null;
  private helloReject: ((err: Error) => void) | null = null;

  constructor(private readonly opts: GatewayClientOptions) {}

  async connect(): Promise<unknown> {
    this.closed = false;
    const Impl = this.opts.WebSocketImpl ?? globalThis.WebSocket;
    if (!Impl) throw new Error('No WebSocket implementation available');
    const args = this.opts.wsConstructorArgs ?? [];
    const gen = ++this.generation;
    this.connectSent = false;
    this.connectNonce = null;

    return new Promise<unknown>((resolve, reject) => {
      this.helloResolve = resolve;
      this.helloReject = reject;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.ws = new (Impl as any)(this.opts.url, ...args) as WebSocket;
        this.wireEvents(gen);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  async request<T>(method: string, params?: unknown, opts?: { timeoutMs?: number }): Promise<T> {
    const ws = this.ws;
    if (!ws || ws.readyState !== 1 /* OPEN */) throw new Error('not connected');
    const id = uuid();
    const timeoutMs = opts?.timeoutMs ?? this.opts.requestTimeoutMs ?? 15000;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`request '${method}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v as T); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      ws.send(JSON.stringify({ type: 'req', id, method, params }));
    });
  }

  close(code = 1000, reason = 'client close'): void {
    this.closed = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) { this.ws.close(code, reason); this.ws = null; }
    flushPending(this.pending, new Error('disconnected'));
    this.backoffMs = 800;
  }

  private wireEvents(gen: number): void {
    const ws = this.ws!;
    // Node `ws` uses .on(); browser uses addEventListener. Normalize:
    const on = (ev: string, fn: (...a: unknown[]) => void) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (ws as any).on === 'function') (ws as any).on(ev, fn);
      else ws.addEventListener(ev, (e: Event) => fn(e as unknown));
    };
    on('open', () => { if (this.generation === gen) this.opts.onOpen?.(); });
    on('message', (evOrData: unknown) => {
      if (this.generation !== gen) return;
      const raw = typeof evOrData === 'object' && evOrData && 'data' in (evOrData as Record<string, unknown>)
        ? String((evOrData as { data: unknown }).data ?? '')
        : String(evOrData);
      this.handleMessage(raw);
    });
    on('close', (evOrCode: unknown, reasonArg?: unknown) => {
      if (this.generation !== gen) return;
      const code = typeof evOrCode === 'object' && evOrCode && 'code' in (evOrCode as Record<string, unknown>)
        ? Number((evOrCode as { code: number }).code)
        : Number(evOrCode);
      const reason = typeof evOrCode === 'object' && evOrCode && 'reason' in (evOrCode as Record<string, unknown>)
        ? String((evOrCode as { reason: string }).reason)
        : String(reasonArg ?? '');
      this.ws = null;
      flushPending(this.pending, new Error(`closed (${code}): ${reason}`));
      this.opts.onClose?.(code, reason);
      if (this.helloReject) { this.helloReject(new Error(`closed before hello (${code})`)); this.helloResolve = this.helloReject = null; }
      if (this.opts.autoReconnect) this.scheduleReconnect();
    });
  }

  private handleMessage(raw: string): void {
    let frame: Record<string, unknown>;
    try { frame = JSON.parse(raw); } catch { return; }
    if (frame.type === 'event') {
      if (frame.event === 'connect.challenge') {
        const payload = frame.payload as { nonce?: unknown } | undefined;
        this.connectNonce = payload && typeof payload.nonce === 'string' ? payload.nonce : null;
        if (this.connectNonce) void this.sendConnect(this.connectNonce);
        return;
      }
      void Promise.resolve(this.opts.onEvent?.(frame as unknown as EventFrame)).catch(() => {});
      return;
    }
    handleResponseFrame(frame, this.pending);
  }

  private async sendConnect(nonce: string): Promise<void> {
    if (this.connectSent) return;
    this.connectSent = true;
    try {
      const params = await this.opts.onChallenge(nonce);
      const hello = await this.request<unknown>('connect', params);
      this.backoffMs = 800;
      this.helloResolve?.(hello);
      this.helloResolve = this.helloReject = null;
    } catch (err) {
      this.helloReject?.(err instanceof Error ? err : new Error(String(err)));
      this.helloResolve = this.helloReject = null;
      this.ws?.close(4008, 'connect failed');
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 1.7, 15000);
    this.opts.onReconnectScheduled?.(delay);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch(() => {});
    }, delay);
  }
}
```

### Node entry point

```typescript
// packages/shared/src/node/index.ts — NEW
// Source: hub/site do NOT import this; only paperclip adapter does.
import { WebSocket } from 'ws';
import { GatewayClient, type GatewayClientOptions } from '../gateway/client.js';

export interface NodeGatewayClientOptions extends Omit<GatewayClientOptions, 'WebSocketImpl' | 'wsConstructorArgs'> {
  headers?: Record<string, string>;
  maxPayload?: number;
}

export function createNodeGatewayClient(options: NodeGatewayClientOptions): GatewayClient {
  return new GatewayClient({
    ...options,
    WebSocketImpl: WebSocket as unknown as typeof globalThis.WebSocket,
    wsConstructorArgs: [{ headers: options.headers, maxPayload: options.maxPayload ?? 25 * 1024 * 1024 }],
  });
}

export { GatewayClient, PROTOCOL_VERSION } from '../gateway/client.js';
export * from '../gateway/types.js';
export * from '../gateway/protocol.js';
export * from '../utils/index.js';
```

### Package.json exports map update

```jsonc
// packages/shared/package.json — append `./node` entry
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./gateway": { "types": "./dist/gateway/index.d.ts", "import": "./dist/gateway/index.js" },
    "./utils": { "types": "./dist/utils/index.d.ts", "import": "./dist/utils/index.js" },
    "./node": { "types": "./dist/node/index.d.ts", "import": "./dist/node/index.js" }  // NEW
  },
  "peerDependencies": {
    "ws": "^8.0.0"                    // NEW — consumers of ./node must provide
  },
  "peerDependenciesMeta": {
    "ws": { "optional": true }        // browser consumers of '.' don't need ws
  }
}
```

### Paperclip adapter — after migration

```typescript
// paperclip-minion/packages/adapters/openclaw-gateway/src/server/gateway-client.ts — AFTER
// 5-line shim OR delete this file and update imports
export {
  GatewayClient as GatewayWsClient,
  PROTOCOL_VERSION,
} from '@minion-stack/shared/node';
// Paperclip-specific helpers stay local — they're about header/auth parsing, not WS
export { asRecord, nonEmpty, withTimeout, headerMapGetIgnoreCase,
         headerMapHasIgnoreCase, toAuthorizationHeaderValue,
         resolveAuthToken, toStringRecord } from './gateway-helpers.js';
```

`execute.ts` must change `new GatewayWsClient({ onEvent, onLog })` → `createNodeGatewayClient({ onEvent, onChallenge: buildConnectParams, headers, autoReconnect: false })`. The `onLog` parameter was paperclip-specific for structured logging — stays in a paperclip-local wrapper or gets mapped to shared client callbacks.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Each consumer rolls own `WebSocket` + req/res matching | Shared `@minion-stack/shared` with protocol primitives (`sendRequest`, `handleResponseFrame`) | Phase 4 (2026-04-21) | Phase 7 finishes: also extracts the outer `WebSocket` lifecycle class |
| Hub has local copy of frame types | Import from `@minion-stack/shared` | Phase 7 (this) | Single source of truth for `RequestFrame`, `ResponseFrame`, `EventFrame` etc. |
| Paperclip's `ws`-based `GatewayWsClient` class lives in adapter | Re-export from `@minion-stack/shared/node` | Phase 7 | Adapter becomes ~60% smaller; only paperclip-specific auth/header logic stays local |
| `PROTOCOL_VERSION = 3` duplicated as inline `3` in hub/site, constant in paperclip | Exported from `@minion-stack/shared` | Phase 7 | Version bumps happen in one place |

**Deprecated/outdated:**

- `minion-shared` (old npm package, non-scoped) — already deprecated Phase 4 SHARE-03.
- Hub's `src/lib/types/gateway.ts` — to be deleted Phase 7.
- Hub's `src/lib/utils/{uuid,session-key}.ts` — to be deleted Phase 7. `text.ts` kept with justification (superset).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Publishing `@minion-stack/shared` with `ws` as peerDep (optional) won't break browser bundlers when `./` is imported | Common Pitfalls, exports map | [ASSUMED] Must verify with a hub `bun run build` after the new shared version is linked locally. If Vite still tries to resolve `ws`, fall back to a completely separate `@minion-stack/gateway-node` package |
| A2 | Hub's `text.ts` superset behavior is actually being used by UI chat rendering (i.e. removing it would cause visible regression) | Pitfall 5 | [ASSUMED — code review only; no runtime reproduction]. Should confirm by grepping `extractText` consumers in hub; if only chat-panel imports it, a site-style fallback may be fine |
| A3 | Paperclip's `GatewayWsClient` tests in `server/src/__tests__/openclaw-gateway-adapter.test.ts` can be preserved verbatim if the shimmed `gateway-client.ts` re-exports the same class/interface surface | WS-04 migration | [ASSUMED]. Run `pnpm --filter @paperclipai/server test:run` after adapter change; expect green; if fails, adjust re-export names |
| A4 | The `connect.challenge` → `connect` handshake payload shape is identical across all three consumers (minProtocol/maxProtocol/client/role/scopes/auth/device) | Pattern 3 consumer wrap | [CITED: grep of all 3 impls shows same shape]. Minor variance in `client.mode` ('ui' for hub/site, 'backend' for paperclip) — handled by caller passing different params |
| A5 | Gateway server (in `minion/` — not this phase) accepts both `minProtocol: 3` clients and doesn't care about client-side implementation changes | WS-05 E2E verification | [ASSUMED]. Gateway server version running on Netcup is stable; no server-side change in Phase 7. Verify by running 07-04 E2E smoke against live staging gateway |
| A6 | `paperclip-minion/server/src/realtime/live-events-ws.ts` (WebSocketServer) is OUT OF SCOPE — it's an inbound server, not a gateway client | Scope definition | [VERIFIED by code inspection] — it uses `WebSocketServer` from `ws`, not a client |
| A7 | `@minion-stack/shared@0.2.0` local version is safe to overwrite/roll into 0.3.0 without publishing 0.2.0 first | Pitfall 6 | [ASSUMED]. Safer path: publish 0.2.0 first (what Phase 4 intended), then 0.3.0 for Phase 7 additions. Low cost since both are unreleased patches |

**User confirmation needed for:** A1 (bundler compat), A2 (hub text.ts regression), A7 (0.2.0 publish-first policy). Planner should route these through `/gsd-discuss-phase`.

---

## Open Questions

1. **Does the Yjs binary channel stay hub-local or move to shared?**
   - What we know: `hub/src/lib/workshop/yjs/yjs-provider.ts` consumes `sendBinary` + `onBinaryMessage` from hub's gateway service. Site and paperclip never use binary frames.
   - What's unclear: Is workshop Yjs sync on a roadmap for site/paperclip?
   - Recommendation: Keep binary-frame API as optional methods on `GatewayClient` (no-op in Node client by default), but default the wiring to hub-only. Move later if a second consumer emerges.

2. **Publish 0.2.0 first, or jump straight to 0.3.0?**
   - What we know: `packages/shared/CHANGELOG.md` has an unreleased 0.2.0 entry; npm latest is 0.1.0.
   - What's unclear: Was the 0.2.0 publish deliberately skipped or forgotten?
   - Recommendation: Publish 0.2.0 first to preserve changelog linearity (one Phase 4 bump, one Phase 7 bump). Plan 07-02 should include this as a prerequisite.

3. **Does paperclip's `onLog(stream, chunk)` callback map cleanly to shared `GatewayClient` callbacks?**
   - What we know: Paperclip's `GatewayWsClient` takes `onLog: (stream: 'stdout' | 'stderr', chunk: string) => Promise<void>` and calls it from the `error` handler + request send logs.
   - What's unclear: Whether shared client should have a `onError(err)` + `onSend(method, params)` hooks or just let paperclip wrap the shared client.
   - Recommendation: Don't add logging hooks to shared. Paperclip wraps the shared client with a `LoggingGatewayClient` decorator (10 LOC) that adds `onLog` calls.

4. **Should `minion/` gateway server (the actual server side) import types from `@minion-stack/shared`?**
   - What we know: Phase 7 scope says client-only. `minion/` is gateway server + CLI.
   - What's unclear: The gateway server defines the canonical frame schemas (currently `minion/src/gateway/protocol/schema/frames.ts` per comment in `packages/shared/src/gateway/types.ts`).
   - Recommendation: Out of scope for Phase 7. A future phase could make `@minion-stack/shared` the SOURCE and `minion/` the consumer, but that's a bigger refactor with server-version compatibility implications.

5. **What does the site E2E test look like — is there one?**
   - What we know: Site has NO `test` script in package.json. No vitest, no playwright.
   - What's unclear: How to verify site's member-gateway after migration other than `bun run check` (type-check).
   - Recommendation: Phase 7 plan should include either a manual smoke-check (log into staging site, connect to gateway, verify chat round-trip) OR introduce vitest infrastructure as a Wave 0 gap for site.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Paperclip adapter build, shared package build | ✓ | verify via `node --version` | — |
| pnpm | Paperclip monorepo, meta-repo workspace | ✓ | — | — |
| bun | Hub + site build/check | ✓ | — | — |
| `ws` (npm) | Paperclip adapter + new `@minion-stack/shared/node` | ✓ | 8.20.0 latest, 8.19.0 currently pinned in paperclip | — |
| npm 2FA | Publishing new `@minion-stack/shared` versions | requires user action | — | Checkpoint pattern from phases 04/05/06 |
| Live gateway on Netcup (for E2E) | WS-05 end-to-end verification | ✓ | Stable per phase 2 verification | Can spin up local gateway via `pnpm gateway:watch` in `minion/` if Netcup unavailable |
| Running hub instance (staging or local) | E2E: hub dashboard connects via consolidated client | ✓ | — | Local `bun run dev` against local gateway |
| Running site instance (staging or local) | E2E: member dashboard connects via consolidated client | ✓ | — | Local `bun run dev` against local gateway |
| Paperclip control plane on Netcup | E2E: paperclip agent → gateway round-trip | ✓ | `http://100.80.222.29:3200` [CITED: memory `project_paperclip_netcup_deployment.md`] | Use `scripts/smoke/openclaw-gateway-e2e.sh` locally |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — all three E2E environments reachable.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (packages/shared) | None yet — shared has no test script; add vitest for new client | 
| Framework (minion_hub) | vitest 4.1.5 configured with `src/**/*.test.ts` include + Svelte aliases |
| Framework (minion_site) | **None** — no `test` script in package.json, no vitest config |
| Framework (paperclip-minion) | vitest 4.1.5 configured with projects map including `packages/adapters/*` + `server` |
| Config file (hub) | `/home/nikolas/Documents/CODE/AI/minion_hub/vitest.config.ts` |
| Config file (paperclip) | `/home/nikolas/Documents/CODE/AI/paperclip-minion/vitest.config.ts` |
| Quick run command (hub) | `bun run vitest run src/lib/services/gateway.svelte.test.ts` (file to be created) |
| Quick run command (paperclip) | `pnpm --filter @paperclipai/server test:run -- openclaw-gateway-adapter` |
| Full suite command (hub) | `bun run test` |
| Full suite command (paperclip) | `pnpm test:run` |
| E2E command (paperclip) | `pnpm smoke:openclaw-gateway` (via `./scripts/smoke/openclaw-gateway-e2e.sh`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WS-01 | Audit doc produced | manual review + grep | `grep -rn "new WebSocket\|class.*WsClient\|interface.*Frame" minion_hub/src minion_site/src paperclip-minion/packages > specs/ws-duplication-audit.md` | ❌ Wave 0: create `specs/ws-duplication-audit.md` |
| WS-02 | `GatewayClient` class in `@minion-stack/shared` passes unit tests (connect handshake, request/response, timeout, close flush) | unit | `cd packages/shared && pnpm test` | ❌ Wave 0: add `packages/shared/vitest.config.ts` + `src/gateway/client.test.ts` with mocked WebSocket |
| WS-02 | Node entry point wires `ws` correctly | integration | `cd packages/shared && pnpm test src/node/index.test.ts` | ❌ Wave 0: create |
| WS-03 | Hub consumes shared — type-check passes | type-check | `cd minion_hub && bun run check` | ✓ already exists |
| WS-03 | Hub `gateway.svelte.ts` orchestration passes unit tests (event routing, device-identity fetch, reconnect toast) | unit | `cd minion_hub && bun run test src/lib/services/gateway.svelte.test.ts` | ❌ Wave 0: create test file, mock the shared `GatewayClient` |
| WS-03 | Site consumes shared — type-check passes | type-check | `cd minion_site && bun run check` | ✓ already exists |
| WS-03 | Site `member-gateway` passes smoke (manual — no vitest on site) | manual | Human: log into staging site, connect, send chat, verify response | — |
| WS-04 | Paperclip `openclaw-gateway-adapter.test.ts` passes unchanged after adapter rewrite | regression | `pnpm --filter @paperclipai/server test:run openclaw-gateway-adapter` | ✓ already exists (250+ LOC, mocks gateway server) |
| WS-04 | Paperclip adapter `execute.test.ts` passes | unit | `pnpm --filter @paperclipai/adapter-openclaw-gateway test:run` | ✓ already exists (small, tests `resolveSessionKey`) |
| WS-04 | Paperclip E2E smoke passes | e2e | `pnpm smoke:openclaw-gateway-e2e` (requires Docker + local gateway + Paperclip API up) | ✓ script exists (`scripts/smoke/openclaw-gateway-e2e.sh`) |
| WS-05 | Zero duplicate WS classes/frame-types | grep-assertion | `! grep -rn "interface RequestFrame\|interface ResponseFrame\|interface EventFrame\|class GatewayWsClient" minion_hub/src minion_site/src paperclip-minion/packages/adapters --include='*.ts' \| grep -v 'node_modules\|dist/'` | — (run as 07-04 verification step) |
| WS-05 | All three consumers build green against the new shared version | build | `cd minion_hub && bun run build && cd minion_site && bun run build && cd paperclip-minion && pnpm build` | — |

### Sampling Rate
- **Per task commit:** Run the relevant consumer's quick command:
  - Shared edits: `cd packages/shared && pnpm test && pnpm build`
  - Hub edits: `cd minion_hub && bun run check && bun run vitest run src/lib/services/`
  - Site edits: `cd minion_site && bun run check`
  - Paperclip edits: `pnpm --filter @paperclipai/server test:run && pnpm --filter @paperclipai/adapter-openclaw-gateway test:run`
- **Per wave merge:** Full suite in the affected consumer (`bun run test` / `pnpm test:run`)
- **Phase gate:** All three consumer type-checks green + paperclip E2E smoke green + grep for duplicate classes returns empty

### Wave 0 Gaps
- [ ] `packages/shared/vitest.config.ts` — shared currently has no test runner; Phase 7 introduces unit-testable `GatewayClient` logic
- [ ] `packages/shared/src/gateway/client.test.ts` — unit tests: connect challenge, request/response round-trip, timeout behavior, close flush, reconnect scheduling (via injected mock WebSocket)
- [ ] `packages/shared/src/node/index.test.ts` — smoke that Node factory constructs a working client against a local `WebSocketServer`
- [ ] `minion_hub/src/lib/services/gateway.svelte.test.ts` — covers hub-specific orchestration (toast, device-identity fetch mock, event dispatch). Uses vitest + mock `GatewayClient`
- [ ] `specs/ws-duplication-audit.md` — mandatory WS-01 deliverable, written during 07-01
- [ ] Site smoke runbook (`.planning/phases/07-ws-consolidation/SITE-SMOKE.md`) — since site has no automated tests, a written manual-verification procedure
- [ ] Framework install: N/A — vitest already available in paperclip and hub; shared gets it via workspace hoist (`packages/shared` adds `"vitest": "^4.1.5"` to devDependencies)

---

## Security Domain

> `security_enforcement` is absent in `.planning/config.json` — treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **yes** | Gateway token in `auth: { token }` field; optional signed device payload (v2/v3) via `shared/device-auth.ts`. Shared `GatewayClient` does NOT do the signing itself — consumer's `onChallenge` callback builds the payload. Client stays agnostic to which auth mode is used |
| V3 Session Management | yes | Challenge/nonce handshake binds each session to a server-issued nonce. Nonce must be freshly issued per connection. Shared `GatewayClient` must propagate the nonce from `connect.challenge` event into the `onChallenge` callback |
| V4 Access Control | yes (at server) | Gateway server validates `role` + `scopes` server-side. Client trusts its own claim; server-side enforcement is out of Phase 7 scope |
| V5 Input Validation | yes | Incoming frames deserialized via `JSON.parse` inside `handleMessage`. Current code tolerates malformed frames by silent-return. Shared client should keep this defensive behavior. Frame-type narrowing done via `type === 'event'` / `type === 'res'` — never cast without narrowing |
| V6 Cryptography | yes | Device payload signing (`signDevicePayload` in paperclip) uses Ed25519 via `node:crypto`. STAYS in paperclip adapter (`src/shared/device-auth.ts`) — not migrated to `@minion-stack/shared` because browser consumers don't have matching private keys. Browser clients get their signature server-side via `/api/device-identity/sign` |

### Known Threat Patterns for WebSocket gateway clients

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale socket delivers responses to a new generation's pending map | Tampering / Repudiation | Generation counter (`wsGeneration`) gates every handler — already present in hub/site/paperclip; shared `GatewayClient` preserves pattern |
| Request timeout leaks pending Promise | Denial of Service (memory) | `setTimeout(...).then(pending.delete)` + clear on response — already in protocol.ts; shared preserves |
| Malformed frame crashes handler | Denial of Service | Try/catch around `JSON.parse`; silent return — already in protocol.ts |
| Reconnect storm after network flap | Denial of Service | Exponential backoff 800ms→15000ms cap; consumer opt-in via `autoReconnect: true` — shared `GatewayClient` encapsulates |
| Token logged in error messages | Information disclosure | `execute.ts`'s `SENSITIVE_LOG_KEY_PATTERN` in paperclip strips auth/token fields from logs. KEEP this paperclip-local; don't move to shared (shared doesn't log) |
| Device-identity replay across sessions | Spoofing | Nonce-bound signature (client signs over nonce); nonce from `connect.challenge` rotated per connection — architecture unchanged by Phase 7 |
| `ws` package CVEs | Tampering / DoS | Pin `ws ^8.19.0` via paperclip's existing constraint; `@minion-stack/shared` peerDep `^8.0.0` to stay compatible. Monitor via `npm audit` in meta-repo CI (Phase 8 scope) |

---

## Project Constraints (from CLAUDE.md)

Extracted from `/home/nikolas/Documents/CODE/AI/CLAUDE.md` (root meta-repo), `/home/nikolas/Documents/CODE/AI/minion_hub/CLAUDE.md`, and `/home/nikolas/Documents/CODE/AI/minion_site/CLAUDE.md`:

- **Package scope is `@minion-stack/*`, NOT `@minion/*`.** Phase 2 registered `@minion-stack` after the original `@minion` name was unavailable.
- **Hub git flow:** feature branch → `dev` → `master`. Never commit to `master`. Use worktrees from `origin/dev`.
- **Site git flow:** feature branches → `master` (no `dev` branch).
- **Paperclip fork workflow:** push to `NikolasP98/paperclip`, PRs target the fork's `minion-integration` branch. Do NOT PR to `paperclipai/paperclip` upstream.
- **Svelte 5 only** in hub + site: runes (`$state`, `$props`, `$derived`), snippets, `onclick={}`. **No** Svelte 4 patterns.
- **Package managers:** pnpm for `minion/`, `paperclip-minion/`, and the meta-repo (`packages/shared`). Bun for `minion_hub/` and `minion_site/`. Don't mix.
- **TypeScript strict mode everywhere.** Avoid `any`. Never `@ts-nocheck`.
- **Don't touch git stash, worktrees, or branch switching without explicit ask.** Scope commits narrowly.
- **Cross-project impact — Phase 7 touches:** `packages/shared/` (publish) → `minion_hub/` (new consumer) + `minion_site/` (existing consumer, bump dep) + `paperclip-minion/packages/adapters/openclaw-gateway/` (migration) — this is the exact impact-zone row "Gateway protocol (frame types, events)" in the root CLAUDE.md table.
- **Changesets workflow for publishes:** Root meta-repo has changesets configured. Each version bump is a changeset file. `pnpm changeset` → commit → merge → publish.
- **Infisical env hierarchy:** Gateway URL + token come from Infisical projects `minion-hub`, `minion-site`, `minion-paperclip`. Phase 7 does NOT change any secret names.
- **Never use `@ts-nocheck` or `@ts-expect-error` to suppress strict-mode errors introduced by the refactor.** If strictness issues arise, solve at the API boundary (e.g., type assertions on injected `WebSocketImpl`).

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: local code inspection 2026-04-21] `/home/nikolas/Documents/CODE/AI/packages/shared/src/gateway/{types,protocol,connection}.ts`
- [VERIFIED: local code inspection 2026-04-21] `/home/nikolas/Documents/CODE/AI/packages/shared/src/utils/{uuid,session-key,text}.ts`
- [VERIFIED: local code inspection 2026-04-21] `/home/nikolas/Documents/CODE/AI/minion_hub/src/lib/services/gateway.svelte.ts` (920 LOC)
- [VERIFIED: local code inspection 2026-04-21] `/home/nikolas/Documents/CODE/AI/minion_hub/src/lib/types/gateway.ts` (hub's duplicate)
- [VERIFIED: local code inspection 2026-04-21] `/home/nikolas/Documents/CODE/AI/minion_site/src/lib/services/member-gateway.svelte.ts` (373 LOC, already consumes shared)
- [VERIFIED: local code inspection 2026-04-21] `/home/nikolas/Documents/CODE/AI/paperclip-minion/packages/adapters/openclaw-gateway/src/server/{gateway-client,execute,hire-approved,index}.ts`
- [VERIFIED: `npm view @minion-stack/shared` 2026-04-21] Latest on npm: 0.1.0; local workspace: 0.2.0 (unreleased)
- [VERIFIED: `npm view ws version` 2026-04-21] 8.20.0
- [VERIFIED: `npm view vitest version` 2026-04-21] 4.1.5
- [VERIFIED: `/home/nikolas/Documents/CODE/AI/paperclip-minion/server/src/__tests__/openclaw-gateway-adapter.test.ts`] Mock gateway server pattern already exists — can be leveraged for shared client tests

### Secondary (MEDIUM confidence)
- [CITED: `.planning/ROADMAP.md`] Phase 7 goal + success criteria
- [CITED: `.planning/REQUIREMENTS.md`] WS-01..WS-05 definitions
- [CITED: `.planning/STATE.md`] Phase 6 completion + Phase 7 next
- [CITED: meta-repo `CLAUDE.md`] Cross-project impact-zone matrix, package manager rules, git workflow
- [CITED: memory `project_minion_meta_repo_design.md`] Phase 4 complete status
- [CITED: memory `reference_paperclip_fork.md`] Fork-based PR workflow for paperclip-minion

### Tertiary (LOW confidence)
- None. All claims grounded in code or registry lookups.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library versions verified via `npm view`; existing code imports verified by grep
- Architecture: HIGH — three implementations inspected line-by-line; divergence points enumerated with exact diffs
- Pitfalls: MEDIUM-HIGH — patterns 1-5 derived from the code differences themselves; patterns 6-7 from verified project state
- Consolidation API shape: MEDIUM — proposed `GatewayClient` API is a composition of what's already working in each impl; not validated by running code yet (planner's first task is to prototype)

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable refactor domain; consumer code can drift but the shared primitives are frozen by Phase 4 contract)
