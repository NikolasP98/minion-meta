---
phase: 14-sdk-transport
status: proposed_for_root_admission
requirements: ["SDK-01", "SDK-02"]
reviewer: jobs_fencing_execute
scope: source_only_reconnect_preflight
---

# Authenticated reconnect session decision

Recommend one bounded shared-client foundation, followed by separate Hub and Site adoption. Add an optional notification for every successful current-socket handshake, with the existing client connection generation. Consumers must publish a fresh reactive session and invalidate it on disconnect. A notification attached only to the caller's first `connect().then(...)`, the socket `open` event, client object identity or a timestamp cannot provide this contract.

This is a decision proposal, not implementation or admission. No source, configuration, dependency or runtime was changed; no connection, provider, browser, network test or package installation was run. The 14-06 reviewer owns component/artifact receipts and source selection. That reviewer confirmed the component prerequisite; this packet does not repeat its component implementation work.

## Current behavior and defects

| Source seam | Observed behavior / consequence |
|---|---|
| Working `packages/shared/src/gateway/client.ts:80–130,269–298` | Each connect increments a real private generation and returns its own promise. `sendConnect` resolves the current hello promise. The internal reconnect timer invokes a new `connect().catch(...)`; no success event is exposed. |
| Hub `src/lib/services/gateway.svelte.ts:302–469,539–592` | `autoReconnect:true`. `onOpen` rewires binary Yjs handling, not authenticated state. Current-client `onClose` sets connected false. Only the first public connect promise publishes connected/hello/presence and runs `onHelloOk`. Ordinary internal reconnect can therefore leave an open authenticated socket behind disconnected UI state and an old hello. Eager recreate follows another path and can mask this defect. |
| Hub same file `:638–699` | Cutover authenticates a backup before publishing it, fences the source lifecycle, swaps the current client, resets gateway data and then publishes hello. A new callback must not publish an uncommitted backup into the active session. |
| Hub `gateway-rpc.ts:15–35`, `state/gateway/gateway-data.svelte.ts:15` | The client reference is nonreactive and survives internal reconnect. Hello has no authenticated-session revision. PluginIframe's once-only capability read cannot distinguish a new handshake on that same client; component repairs depend on this upstream contract. |
| Site `member-gateway.svelte.ts:33–103,195–244,307+` | Also uses automatic reconnect, publishes connected only in the first connect promise and sets disconnected in onClose. Polling and chat sends require connected; they can remain disabled after internal reconnection. Unlike Hub, event/close/success callbacks also lack current-client fencing when the client is replaced. |
| Shared working `sendConnect:269–288`; pinned reference `:344–361` | Both await `onChallenge`, then call `this.request`, and after another await mutate shared resolver/backoff/socket fields. Neither captures and rechecks the socket/generation across those awaits. The event-handler fence protects only entry. A stale challenge can resume against a replacement socket; a stale failure can reject/close the newer handshake. This is a concrete source defect, not an executed race reproduction. |
| Shared `close()` and connect timeout | Closing can precede asynchronous native close notification. Session invalidation must be synchronous at the handshake ownership boundary, not delayed until an old socket's close event. Preserve legitimate current onClose delivery and existing no-reconnect-after-explicit-close semantics. |

The consequence is source-grounded. This packet does not claim a live outage, successful runtime reproduction or a universal reconnect failure: eager reconnect, manual reconnect and cutover may take working paths.

## Baselines and existing reference work

The reference files were read from pinned Git commit `59c4b56c192a730dbd63bb8e51dd8305eb2ad424`; their bytes equal the reference worktree. It has the three error hooks and containment fixes, but no successful-handshake notification. Select and preserve that existing patch rather than reimplementing it.

| Identity | SHA-256 or exact version |
|---|---|
| Working shared client source | `9a4a63b8ad9ca3f7ec3c9832c7b597a274e56cebea0e21c47f54e3223aa10532` |
| Working shared client tests | `dc363783b7589b5ef477a741c983544e491bbb7af6d52f77cf12789091734fc5` |
| Pinned reference client source | `b81c7ff63c371909fccdd7c08525f4b84573f03baca71cfccfbc16d54da32dc3` |
| Pinned reference client tests | `d735b70e1045265b8ba1e61e62b4c9b7eea0f8886423a4d7af8b81fd33b8b9ce` |
| Hub and Site separate installed clients | Both 0.9.0; each `dist/gateway/client.js` SHA `082e7c38fa050ceffbcb6e500b8ed2123a1856526c9cbdbad292d165280227bc` |
| Paperclip openclaw-gateway and minion-drone resolved client | Both 0.3.0; `dist/gateway/client.js` SHA `624a59c8bfaa2370b27a9af5921da621838be127e935d91d411d1b7495ee794d` |
| Hub gateway service | `91e8c69ca2c717744f73bc8fb34cb48cc684c63cc369b6298b8b870de0adbaed` |
| Hub RPC leaf | `ed610e1e5b8f7857245fdb5f7e3b9184655b661151af738b2ffb4bc83a503b1c` |
| Hub connection state | `5d423d79ae82ceacc50a5b9e782388e5391fad901c01f00e8096576fba18d330` |
| Hub gateway state | `ee103bf834c8937d405f05b26b19ec1e5ffd15bbe6f9b04988ba3f2c76e7e0cb` |
| Hub chat-history helper to preserve | `a18c5241dfae80472a3bcb827a72d7f1b418f37b741cfda5f772c78f60eb971c` |
| Site gateway service | `223a2ee825f8a99e62757945299fbd62ac30cee0f73bd1ed27da6566c0c74dc1` |

Branches/HEADs at inspection: root `feat/curated-engineering-skills` / `69739a7c7b1a92e442b5a574d88f167a0fe40db3`; reference `main` / `59c4b56c192a730dbd63bb8e51dd8305eb2ad424`; Hub `feat/level-2026-07-30` / `a25528b603dfe25f7ea9c0900d271060e5394f35`; Site `dev` / `7f4c3b25679e9aaa622ad695c95069fe97d00c20`; Paperclip `minion-integration` / `2abd5f7d5c63f8850f6aee989675c0b93e2bd865`.

The pinned error-hook history is already recorded in `360-sdk-container-history.md`: event containment commit `399fc59c78f4aea2176737f32d654a3c6914498b`, lifecycle reporting commit `a8e6c6d8771025a6549cd079be2ebf0a74c94159`. Its HSDK-02 also records the older one-hook spec versus amended three-hook adoption proposal. Preserve `onEventError`, `onReconnectError`, `onSocketError`, synchronous/async reporter containment, stale socket error fencing and unchanged close-driven reconnect timing. Do not use an error hook as a successful-session signal or initiate reconnect from socket-error reporting.

## Proposed minimum public contract

Add this optional field to existing `GatewayClientOptions`; no new wire frame, new protocol version or required consumer argument:

```ts
onAuthenticated?: (
  hello: unknown,
  session: { readonly generation: number },
) => void | Promise<void>;
```

The name describes acceptance of the correlated `connect` response by this transport. It does not add cryptographic identity verification or certify arbitrary HelloOk payload fields. Runtime envelope/hello validation remains the independently selected 14-01 authority contract; do not change `unknown` to an unchecked public `HelloOk` assertion. A malformed/unsupported response rejected by that contract must never emit success.

1. Emit exactly once for each successful current connection generation, including initial connect, internal automatic reconnect and a backup's successful connect. Never emit on socket open, challenge arrival, failed connect, duplicate response, stale continuation or close-before-completion.
2. The generation is the real counter already incremented by production `connect()`. Capture both generation and socket before asynchronous challenge work, and verify ownership after each await and before sending, settling, reporting success or closing on error. Old work must not address or settle a newer socket. Synthetic tests must drive this actual implementation; they must not manufacture a standalone fixture-only epoch.
3. Keep `connect(): Promise<unknown>` compatible. Settle and clear that attempt's resolver state before invoking the observer; notification occurs in the same successful continuation before normal caller `.then` microtasks. An observer can initiate close/reconnect without corrupting resolver ownership.
4. Observe success without awaiting downstream application hydration. Contain synchronous observer throws and asynchronous rejection; neither changes successful authentication nor schedules reconnect. Recommended minimum diagnostic: one static callback-failure message, without hello, auth, frame, URL, token or exception payload. Do not misclassify it through any of the three existing error hooks. Root must record this policy explicitly in the foundation plan.
5. A generation is local to one client. Consumers must pair it with client identity and their active lifecycle fence. It is not a server-issued connection ID, persistent identifier or timestamp.
6. Do not add request replay, universal retry, new timeout defaults, capability inference or a replacement event bus. Preserve exponential backoff, explicit close, per-request traceparent and both browser/Node event normalization.

The Node wrapper already extends `GatewayClientOptions` and spreads remaining fields into `new GatewayClient(...)`; no wrapper implementation change or separate callback API is needed.

## Foundation child: exact proposed ownership and tests

Own only these two existing product files, plus its admitted plan/result documents:

- `packages/shared/src/gateway/client.ts`: selectively reconcile all three pinned reference hooks, add the optional notification and fence per-attempt asynchronous challenge/hello/error completion. Preserve unrelated source and public defaults.
- `packages/shared/src/gateway/client.test.ts`: retain working tests plus pinned reference hook regressions and add direct tests against the actual client. Use injected sockets and fake timers; no live server or provider.

Required red/green cases: initial success once; same instance reconnect succeeds twice with distinct real generations and fresh hello; open/challenge alone produce zero notifications; duplicate response produces one; disconnect or replacement while challenge is deferred produces zero old connect sends on the new socket; old rejection cannot close/reject the replacement; stale hello cannot publish; explicit close while challenge waits cannot revive the client; observer sync throw/rejection is contained and does not alter connect resolution/backoff; omitted callback preserves existing promise behavior. Exercise Node-style `.on()` and browser-style `addEventListener` injected sockets. Retain all three reporter success/fallback/throw/reject and stale error tests from the pinned reference.

Run the focused gateway test and package typecheck first. `packages/shared/src/node/index.test.ts` starts a real WebSocketServer at module scope; do not accidentally invoke that network fixture under a source-only/offline gate. Its later qualification requires explicit runtime admission. The proposed addition uses an inline metadata type, so neither gateway index nor Node index needs an export edit.

A successful source test does not update Hub/Site's installed 0.9.0 or Paperclip's 0.3.0. Build/archive provenance and exact consumer installation remain 12-03/14-02 gates; never hand-edit node_modules or add a production alias to hide stale installed bytes.

## Hub adoption child: publish one current authenticated session

Proposed exact four-file scope:

- `minion_hub/src/lib/services/gateway.svelte.ts`
- `minion_hub/src/lib/state/gateway/gateway-data.svelte.ts`
- `minion_hub/src/lib/services/gateway.contract.test.ts` (already planned in 14-02)
- `minion_hub/vitest.gateway-contract.config.ts` (new, isolated fixture configuration)

Add a monotonically increasing reactive `gw.sessionRevision`, incremented only when an accepted active `(client, generation)` is published. Publish fresh `gw.hello`, presence, connection flags and revision synchronously through one shared success path. Do not use `Date.now()` as identity. Current-client close/disconnect/replacement invalidates hello and connected state; stale callbacks must not invalidate a successor. Preserve current chat/history and other cached UI data during an ordinary transient drop instead of calling the whole cross-host reset. Component consumers use connected + non-null hello + sessionRevision; 14-06 owns their actual gate and mount behavior.

For the main client, the callback owns publication on initial and internal reconnect. Remove duplicate success publication from initial `.then`, retaining its error handling and lifecycle fence. For a backup, record the authenticated result locally without publishing; backup close invalidates that staged record. Commit only while the existing source lifecycle/client remains current, the source is connected and the staged backup generation is still live. At cutover, swap/reset as currently required and publish the staged result once; future same-backup reconnects publish through the ordinary callback. Keep old-client close inert. A reusable per-client staging record inside this service is sufficient; do not build a new global event bus.

Retain binary Yjs wiring in onOpen and after backup commit. Preserve eager reconnect and auth-fatal behavior. Invoke existing `onHelloOk` exactly once per accepted session; duplicate callback/promise paths must not double-register flows or duplicate initialization. Fence direct asynchronous follow-up work in this service to its captured session before writing state or initiating later RPCs, particularly the delayed `/api/flows` result and `flows.trigger.register` loop. Binding to the captured client prevents old work from using the successor through the global RPC leaf.

The existing `gateway-rpc.ts` leaf need not change for notification publication; preserve its cycle-breaking architecture and the current channel-status sink. `connection.svelte.ts` already exposes reactive connected state and needs no new timestamp identity. Existing `ConnectionLifecycleFence` remains the async operation fence; a successful socket generation is a different lifetime and must not be conflated with it.

Tests must import the real service and the actual candidate shared client with injected transport; mock token/device/HTTP/storage/telemetry surroundings so there is no network or provider effect. The isolated config selects only the owned contract file and gives the candidate shared source alias an explicit test-only name/identity. Record installed baseline separately; such an alias is not installed adoption. Assert new capabilities after same-client reconnect, invalidation during disconnect, late old callback rejection, one initial initialization, committed backup publication only, backup close-before-commit rejection, source drop during backup authentication, manual reconnect superseding cutover, and exactly one binary listener/polling owner. Existing lifecycle/eager reconnect/history tests remain regression gates.

Preserve `gateway/chat-rpc.ts` and its current selected-session/empty-response behavior. The helper currently has its own asynchronous history write path; do not claim that all downstream hydration is session-fenced merely because hello publication is fixed. Any required new guard in that helper needs exact additional ownership and tests, retaining its current session-key choice, in-place reconciliation and nonempty-history protection. This packet does not grant that expansion.

## Site adoption child: independent consumer

Proposed exact three-file scope:

- `minion_site/src/lib/services/member-gateway.svelte.ts`
- `minion_site/src/lib/services/member-gateway.contract.test.ts` (already planned in 14-02)
- `minion_site/vitest.gateway-contract.config.ts` (new, isolated Svelte-aware fixture configuration)

Publish connected and run hello initialization from the new observer on every accepted current session. Capture the actual new client instead of referring only to the mutable module variable. Fence event, close, promise error and async initialization/history/polling results with that client and accepted generation so a replaced connection cannot alter the new member state. Retain role/scopes/device signing, chat selection and reconnect policy. Keep one polling timer; dispose it on explicit disconnect. No UI markup or auth-policy changes.

Drive initial connect, automatic reconnect, old-close-after-replacement, failed reconnect, disconnect during challenge, late initialization response and duplicate-success cases through the actual service/candidate client with injected sockets. Current Site Vitest config has no Svelte/$lib runtime setup; a narrowly owned config is necessary rather than claiming a pure helper test qualifies the service. No new dependency is assumed. Check installed compiler/plugin availability before admission; if missing, stop at the named fixture prerequisite rather than installing ad hoc.

## Paperclip and remaining adoption obligations

Source registration is `openclaw_gateway` and `minion_drone` (`server/src/adapters/registry.ts:400,412`), not a currently registered `minion_gateway` name. Actual construction sites:

- `packages/adapters/openclaw-gateway/src/server/execute.ts:473,860`: explicit `autoReconnect:false`, connect is awaited before pairing/execution work.
- `packages/adapters/openclaw-gateway/src/server/hire-approved.ts:72`: explicit false, connect awaited before the notification request.
- `packages/adapters/minion-drone/src/server/gateway.ts:5`: explicit false; runtime owns its own connect/request/close lifecycle.

No Paperclip success-callback adoption is necessary to fix this browser reconnect bug. Preserve awaited single-shot semantics and do not enable retries for its effectful calls. Its exact 0.3.0-to-selected-package compatibility, Node entrypoint and all-three-error-hook reporting decisions still require 14-02 evidence; source inspection is not a runtime pass. The existing Node options spread means the new field remains additive.

For every consumer, retain the amended three-hook reporting matrix: select its established sanitized reporting sink or explicitly accept the pinned default for each hook. Do not quietly reduce the historical requirement back to onEventError only. No error-hook adoption or remote telemetry endpoint is selected by this source-only receipt.

## Root handoff and closure limits

Recommended sequence: independently admit the two-file foundation and pinned patch selection; qualify its source; admit separate Hub and Site source adoption; qualify exact package archives and installed consumers; then permit 14-06 component session/capability gating and its mounted/browser evidence. A temporary test-only candidate alias can prove implementation before package adoption, but cannot justify declaring the app repaired on its installed bytes.

Root owns proposal and source-comment admission. Suggested exact TODO sites: shared `sendConnect` for generation-bound async ownership; Hub initial connect success/onClose for missing automatic-reconnect publication; Site initial connect success/onClose for the same gap and missing client fence. Proposal wording: “Successful internal reconnect currently does not republish active hello/connected state in Hub or Site; add a generation-fenced authenticated-session callback, stage cutovers, publish a reactive revision and prove exact installed consumer adoption while preserving all three pinned error hooks and current history behavior.” No source TODO was inserted under this read-only ownership.

This recommendation does not close SDK-01/02, establish wire validation/auth authority, certify all asynchronous hydration, prove browser behavior or adopt any package. All those limits remain explicit prerequisites or bounded child work.
