# Plugin mount identity receipt

14-06 Task1 only, 2026-09-09. Exact admitted plan SHA-256 `c7107537a0dcd4135d85efd2e64e0459f19c7e1100ba212b9d37c8e58084788e`. No component, state, gateway, package, browser or test change was made. Source Tasks2/3 remain gated.

## Initial Task1 decision (historical; see continuation below)

**The current component can fail closed while facts are unknown, but complete reconnect recovery cannot be implemented correctly within its present file list.** Recommend retain the narrow PluginIframe ownership, and first admit the separately reviewed authenticated-session publication seam. Root assigned the upstream policy review to `14-RECONNECT-SESSION-DECISION.md`; use that exact reviewed decision before extending source ownership. Do not rebuild the shared client or add a private socket listener inside this component.

The smallest component repair is reactive consumption of a real authenticated-session snapshot, an absent/pending/incompatible distinction for declared constraints, retirement of the previous iframe/bridge on identity changes, and dispatch fenced to that snapshot's actual client. A client pointer check alone is insufficient when the same GatewayClient object reconnects internally.

## Identity and source evidence

Hub HEAD `a25528b603dfe25f7ea9c0900d271060e5394f35`, branch `feat/level-2026-07-30`. Root HEAD `69739a7c7b1a92e442b5a574d88f167a0fe40db3`; reference HEAD `59c4b56c192a730dbd63bb8e51dd8305eb2ad424`. Hashes identify inspected working bytes, including concurrent transport work where present; no branch label certifies deployment.

| Inspected source | SHA-256 |
|---|---|
| `minion_hub/src/lib/plugins/PluginIframe.svelte` | `f3a33500d1f80697f6499164a219d2ec8259b588dfd0ac19389ec52ae11835a3` |
| `minion_hub/src/lib/plugins/PluginIframe.test.ts` | `804666d21b00c066d499372be7c707537e7d0cce2871f7390d32dcfa6f02972f` |
| `minion_hub/src/lib/state/gateway/gateway-data.svelte.ts` | `ee103bf834c8937d405f05b26b19ec1e5ffd15bbe6f9b04988ba3f2c76e7e0cb` |
| `minion_hub/src/lib/state/gateway/connection.svelte.ts` | `5d423d79ae82ceacc50a5b9e782388e5391fad901c01f00e8096576fba18d330` |
| `minion_hub/src/lib/state/features/hosts.svelte.ts` | `f0cc2e181d42df5d1ff2b5de7eb047d3c6b14669b85da07e8a68165a0d1f5635` |
| `minion_hub/src/lib/services/gateway.svelte.ts` | `91e8c69ca2c717744f73bc8fb34cb48cc684c63cc369b6298b8b870de0adbaed` |
| `minion_hub/src/lib/services/gateway-rpc.ts` | `ed610e1e5b8f7857245fdb5f7e3b9184655b661151af738b2ffb4bc83a503b1c` |
| `packages/shared/src/gateway/client.ts` | `9a4a63b8ad9ca3f7ec3c9832c7b597a274e56cebea0e21c47f54e3223aa10532` |
| `minion-meta/packages/shared/src/gateway/client.ts` | `b81c7ff63c371909fccdd7c08525f4b84573f03baca71cfccfbc16d54da32dc3` |

1. `PluginIframe.svelte:149-170` awaits a dynamic module import, reads `gw.hello` once, copies version/methods and sets capsLoaded even when hello is null. The derived verdict permits mounting before this resolves. Reading reactive properties inside an asynchronous `.then` is not a maintained Svelte effect subscription. The existing comment that hello is stable for the whole view is not a lifecycle guarantee.
2. `gateway-rpc.ts:17-31` holds an ordinary module-local client reference with getClient/setClient. It is not reactive and has no hello/session association. `sendRequest` selects whichever client is current at call time; component `forwardRpc` awaits dynamic service import first (`PluginIframe.svelte:71-76`). An old iframe callback can therefore reach the new current client unless fenced after the await.
3. `gateway.svelte.ts:481-564` creates a lifecycle generation, closes/clears the prior client, awaits token retrieval, registers the new client and publishes hello after its initial connect resolves. Its generation/current-client checks are useful, but the component cannot observe a matching authenticated-session record. `conn.connectedAt=Date.now()` is display data, not a collision-proof identity.
4. `gateway.svelte.ts:382-393` marks disconnected on close, but retains `gw.hello`. `onOpen:322-333` wires binary listeners only, before authentication. `packages/shared/src/gateway/client.ts:275-279` resolves hello to the current connect promise; `scheduleReconnect:294-296` calls a new internal connect and consumes only its rejection. Hub's initial `.then` does not observe that later promise. A same-client/same-URL auto-reconnect can therefore retain the old hello and disconnected Hub state despite successful socket authentication. This is a source-derived failure mode; no live reconnect was performed.
5. Explicit cutover (`gateway.svelte.ts:628-701`) fences its backup handshake then swaps client and host, resets old data and publishes the new hello. `wsDisconnect:702-730` clears the client/state. These paths need the same session publication/retirement semantics as ordinary reconnect, without duplicate initial/cutover notifications or stale backup publication.
6. The root shared client and pinned reference error-hook client have no successful-handshake callback/public authenticated-session accessor. Reference onEventError/onReconnectError/onSocketError report failures only. Reconcile that exact reference patch under14-01/02 first; it does not independently solve this missing success signal.

Installed Hub `@minion-stack/shared@0.9.0` manifest SHA `ba3f148e996889bd78ad6c7904f76d2db8c01650d25a1757925fdd78e2b4c95e`, installed `dist/gateway/client.js` SHA `082e7c38fa050ceffbcb6e500b8ed2123a1856526c9cbdbad292d165280227bc`. No assumed new callback may be called against those existing bytes. Candidate resolution and eventual consumer installation remain explicit upstream gates.

## Required upstream semantics, pending independent root selection

Expose a successful authenticated handshake for **every** transport session, including internal reconnect using the same client object, and pair it with a monotonic per-session identity and exact client/selected-host identity. Retire/invalidate that association before reconnect/replacement/close permits new RPC. Publish only after the connect response succeeds, never at onOpen or challenge. Superseded sessions/backup clients must not publish. Notification failure must be contained under the reviewed shared-client error policy; avoid double initialization when the same first hello is also delivered through connect().then.

An observable Hub session view should atomically bind `{client identity, session identity, selected host identity, hello}`; this is a semantic contract, not an admitted new type/file. The component consumes that view and rechecks its currentness at dispatch. Upstream tests must prove real initial connect, same-client reconnect, same-URL replacement, stale async challenge/hello, failed authentication and cutover association. The separate decision must select exact source/test files and installed candidate bytes. Likely existing seams are shared `client.ts/client.test.ts`, Hub gateway orchestration/RPC state and an explicit session publication helper/test; none is admitted through14-06's component list. Gateway manifest loading/projection is unrelated and should remain its own child.

## Component policy after upstream admission

| State / transition | Required behavior |
|---|---|
| No compat constraints, authenticated current session | Legacy plugin may mount; omitted peer version remains v1 under14-04 |
| Declared requiredRpc/minimum with no current authenticated hello | No iframe or privileged host; waiting state, not stale snapshot reuse |
| Declared requiredRpc and known empty methods | Incompatible; missing methods are not an unknown fact to bypass |
| Malformed bridge/minimum constraints | Deny through the actual reviewed compat utility |
| Compatible late hello for current session | Mount exactly once; preserve ready-before-onload/buffered hello |
| Failed late import or unknown association | Stay unprivileged; never fall back to previous gateway facts |
| Disconnect or authentication revoked | Retire bridge, listener, timer and per-mount state; zero future forwarding |
| Reconnect to same URL/client with new session | Old session retired; new hello evaluated before remount; URL/client equality cannot skip the transition |
| Switch while importing dispatch module | Check captured session/client after await; deny rather than use global replacement client |
| Queued old-window ready/RPC or late probe/result | Ignore; must not alter later mount or call either old/new client |
| Theme/locale-only update within current session | Update existing bridge; no repeated remount or initialization loop |
| Save pending during retirement | Clear per-mount UI state and ignore stale result; no implicit mutation retry |

Constrained unknown denial must cover rendering and the forwarding closure. If the actual browser request has already been sent before session retirement, this child cannot undo its remote side effect; cancellation and no-retry semantics must remain honest. Asset CDN origin does not identify the authenticated gateway session.

## Local test and browser configuration receipt

Installed tools are available: `@testing-library/svelte5.4.2`, `happy-dom15.11.7`, `svelte5.56.4`, `@sveltejs/vite-plugin-svelte7.2.0`, `vitest4.1.10`. No install, test run, fixture server or browser was started in Task1. Version declarations do not certify their broader dependency-security posture.

Recommend the already listed `vitest.plugin-compat.config.ts`: isolated selection of `src/lib/plugins/PluginIframe.test.ts`, happy-dom environment and browser Svelte export conditions with installed Vite/Svelte transform. Retain root safe env stubs; explicitly stub external `$app`/gateway dependencies as needed without application bootstrap. Do not mock PluginIframe, compat, mountHostBridge or HostBridge. Use actual reactive Svelte gateway fixture state, not plain mutable mocks, and native MessageEvent source objects where supported. A passing happy-dom fixture is not WindowProxy/sandbox proof.

The later browser fixture owns exactly `Fixture.svelte`, `gateway-fixture.svelte.ts`, `build.mjs`, README under `tests/fixtures/plugin-compat/`, plus the component/config/test and this receipt. Its synthetic state must implement the **actual admitted upstream session contract**, not fabricate a contract that the application lacks. Root selects a unique temporary output, loopback port and exclusive browser-harness session; no full Hub, production env or external requests. Real iframe absence/mount/retirement and per-client zero-call counters must be recorded at both planned viewport sizes. Mandatory UI lint and serialized Hub check remain implementation gates.

## Admission recommendation

Admit the upstream reconnect/session decision first; keep14-06 source tasks gated until actual session publication and candidate consumption exist. A partial component-only unknown gate can be implemented separately if root wants an interim containment, but it must remain explicitly incomplete for same-client reconnect recovery. Do not add gateway manifest/projection files to14-06 to solve this unrelated lifecycle gap. All source/browser/global/proposal edits remain with their owners.


## Task1 continuation: verified 14-09 candidate, 2026-09-09

This continuation supersedes the initial missing-reconnect diagnosis for the **private candidate only**. Root admitted evidence work and this receipt only. Hub CLAUDE, the 14-06 plan and UI governance were reread. No source, fixture, configuration, browser, build or test operation was performed. Active Hub remains on `feat/level-2026-07-30` with the earlier service/state bytes. Root's 14-09-VERIFICATION.md records 44 passing native cases and a complete candidate check with zero errors/warnings; those checks were read, not repeated here.

### Exact comparison

Private candidate root: `/tmp/minion-14-consumers-61p26r_z/minion_hub`.

| File / location | SHA-256 checked in this continuation |
|---|---|
| Active `src/lib/plugins/PluginIframe.svelte` | `f3a33500d1f80697f6499164a219d2ec8259b588dfd0ac19389ec52ae11835a3` |
| Active `src/lib/services/gateway.svelte.ts` | `91e8c69ca2c717744f73bc8fb34cb48cc684c63cc369b6298b8b870de0adbaed` |
| Active `src/lib/state/gateway/gateway-data.svelte.ts` | `ee103bf834c8937d405f05b26b19ec1e5ffd15bbe6f9b04988ba3f2c76e7e0cb` |
| Private `src/lib/services/gateway.svelte.ts` | `af6d5ae7c7083265cede7a78dd295363f3c20808705e4ba85b167fa862da8d5c` |
| Private `src/lib/state/gateway/gateway-data.svelte.ts` | `e833482b62dfad02c26c0ae32e02f9309a68a933ebd0cc117ebf3e759965da03` |
| Private `src/lib/services/gateway.contract.fixture.ts` | `e5a920702fe4e8f08e013271b105d95f10a252e8f154f003b64eb82d573cbbc0` |
| Private `vitest.gateway-contract.config.ts` | `16b5100b6fd8a222a61a628590be014e3fb236e2704eefde73ef1650054a918a` |
| Private shared `dist/gateway/client.js` | `9fd0783baa97b9d64844ce1c3058966a0193f2ef8f4a148c3cc50139b119d474` |

The private package is the complete 14-11 archive `b896e1df2d7da596f6f6dd0f3d2a26f225ffbe11587d95fae1deb233818595e9`, per root's verified receipt. A client-file hash alone is not export/transitive/package identity. It is an unpublished local candidate, predates 11-07 Shells additions, and is not active installation or production release evidence.

### What the candidate now proves, and the remaining seam

1. Private service lines 191–207 hold an actual `AuthenticatedSession` with client, shared generation, captured host, hello and liveness. `isCurrentSession` checks private active-session identity, liveness, actual `getClient()`, connected state and selected host ID. This is the authoritative predicate already implemented; a component must reuse it rather than reproduce part of it.
2. Lines 210–231 invalidate hello/connected immediately and publish a new revision, accepted hello and connected state synchronously. State lines 14–17 retain the revision across data resets. Lines 379–386 accept only a newer actual shared handshake and publish only the registered client. Lines 467–476 invalidate on current close. Lines 567–570 invalidate before a replacement operation awaits. Lines 688–721 withhold backup sessions until a valid cutover, install that client and publish its session before closing the old client. This resolves the prior same-client/same-URL internal reconnect gap.
3. Private fixture lines 297–356 exercise native Svelte client reactivity, no publication at open/challenge, immediate close invalidation and real same-client reconnect. The later cases cover revision progression and staged backup publication. These are useful upstream evidence, not mounted-component acceptance.
4. **The public triple `sessionRevision + hello + getClient()` still cannot establish selected-host authority at a first mount.** The host captured inside the accepted session is private. Active `hosts.svelte.ts:308–328` can change the selected host through `applyOrgAssignedHost`; lines 339–342 change it through `selectHost`, without themselves invalidating the gateway service. During that interval the public hello/client/revision may still refer to A while `activeHostId` names B. The service's private predicate already rejects this interval. A newly mounted component cannot reconstruct the captured host from the public fields. Remembering a prior host only protects a component that observed that prior state.
5. This is a source-derived admission gap, not a newly executed failure. The counterexample is: authenticate A, change only selected host to B, then mount PluginIframe before invoking `wsConnect`. Requiring a future handshake for every initial mount would hide the gap by breaking already-connected first mounts; that is not an acceptable default. URL equality, token equality, a clock value, a fixture epoch, socket-open status, or copied host IDs do not establish authentication association. Two configured hosts can share a URL.
6. Active component lines 147–170 still snapshot capabilities asynchronously and permit before resolution. Lines 262–364 have no returned per-mount cleanup and install a forwarding function which imports the service then reads global dispatch (lines 70–76). Lines 374–383 clean only on component destruction. Settings caller lines 526–545 keys only plugin ID/entrypoint, so a host/session transition need not destroy the component. These remain real component work after the small upstream accessor is admitted.

### Recommended minimum upstream amendment (separate 14-09 ownership)

Reopen exactly two private-candidate files under a root-reviewed amendment:

- `src/lib/services/gateway.svelte.ts`: expose a read-only accepted-session snapshot and currentness check, backed by the existing private `activeSession` and `isCurrentSession`.
- `src/lib/services/gateway.contract.fixture.ts`: add actual-service/actual-emitted-client regression cases for the exported boundary.

No state schema, gateway-rpc primitive, shared client, package, host module or additional protocol change is needed. Suggested API shape is `getCurrentGatewaySession()` returning null or a frozen read-only token containing the exact client, accepted public hello reference, sessionRevision and captured host ID, plus an `isCurrent()` closure bound to that private session. A separate checking export is equally viable if token provenance is protected internally. Root chooses naming/shape before source admission. Do not trust structurally supplied fields as proof; the check must compare the private captured session identity. Return null whenever the private predicate fails. At use time additionally reject revision/hello mismatch or retirement; do not expose credentials or a mutable private session record. Read reactive connected/hello/revision/selected-host state synchronously so the component can subscribe through native runes; do not manufacture a second session sequence.

Required tests: a token obtained after A's real hello is current; changing selected host to B without wsConnect makes both that token and a fresh accessor read invalid; a fresh component cannot acquire A as B; restoring/selecting a different host at the same URL cannot manufacture a new accepted session. Current close and replacement revoke the token immediately; authenticating a replacement or the same client again admits only a fresh token/revision. Backup handshake alone cannot change the public token; successful cutover does; stale backup and duplicate hello do not. In the service fixture, injected host selection is an external input to the real predicate, not a fake session authority. Include a first-mount-equivalent read after selection and a normal already-connected acquisition control, so indefinite waiting cannot make the suite pass.

This is the smallest unavoidable seam for full selected-host proof. Root confirmed that a tiny separate read-only 14-09 amendment is preferable to silently accepting indefinite waiting or broadening 14-06 into transport reconstruction. No source amendment has been executed here.

### Component ownership and lifecycle after that amendment

The next mounted-unit child still needs exactly three existing/proposed paths, in a root-selected private paired snapshot:

1. `src/lib/plugins/PluginIframe.svelte` — consume the real accessor, reactive compatibility, mount retirement and captured dispatch.
2. `src/lib/plugins/PluginIframe.test.ts` — actual component, compatibility utility, host bridge and real Hub service/session consumer cases.
3. `vitest.plugin-compat.config.ts` — exact selection, native client compiler and private environment/cache configuration.

The receipt remains the documentation owner. The existing four browser-fixture paths (`tests/fixtures/plugin-compat/{Fixture.svelte,gateway-fixture.svelte.ts,build.mjs,README.md}`) remain a separately admitted later step; do not add them to the first source change merely to broaden the test harness. No source edits in this continuation, including TODO edits; root owns the matching proposal ledger and next admission.

Implementation rules for that child:

- Load service/state modules once if lazy loading is retained, then read their actual reactive properties synchronously inside an effect/derived evaluation. Copying values inside a promise callback is not a subscription. Module arrival itself must trigger evaluation; disposal before arrival must prevent mounting.
- Acquire one actual session token for a mount. Key iframe lifetime to its revision/client/host and relevant plugin/entrypoint/gateway properties. The token is captured, not reacquired inside an old iframe callback. Check it and current compatibility immediately before every privileged call, again after every await, and before publishing callback/probe/save results. Call the captured client's request with the existing timeout policy. Never defer to global `sendRequest` to select a successor.
- Include synchronous dispatch checks even though reactive cleanup is scheduled: a queued message may run after invalidation and before the DOM/effect flush. Revoke the lifetime flag before disposing, clear all timers/listeners/save/diagnostic state, and abort component-owned fetches where practical. An already transmitted remote mutation cannot be undone or retried implicitly.
- Constrained unknown/incompatible states have no privileged iframe/host. An unconstrained legacy plugin remains compatible under the existing utility and omitted wire version=v1, but still requires a current session before privileged mount/RPC. Failed imports do not fall back to stale facts. Theme/locale updates stay within the same lifetime.
- Gateway asset URL is a separate routing input. Reject a mismatched or unresolvable current gateway-to-prop association rather than using a CDN origin as authentication proof. Existing caller data supplies a base URL, not a signed manifest/session identity; server manifest projection, caller token provenance and cross-host manifest refresh remain separate gates. Do not certify these from component tests or change token delivery policy in this child.
- `plugins.users.list` is also privileged component work: capture/check the same lifetime before both fetches and after their response/JSON awaits. A late response must not reach a retired/new bridge. This fences lifecycle, not a replacement for the HTTP endpoints' independent RBAC.

### Paired native fixture proposal

The fixture must combine the actual PluginIframe/compat/HostBridge with the **verified 14-09 service/state plus the subsequently reviewed accessor amendment**, actual gateway-rpc leaf and the complete 14-11 shared package. Root selects the exact copy/overlay and records all source/package digests before execution. Active old service plus a fake sessionRevision is not an alternative candidate. The 14-09 fixture's plain injected hosts object is adequate for its explicit service checks, but does not by itself prove component host-selection reactivity. Mounted tests should use the actual hosts module with safe page/token boundary inputs, or obtain root admission for an explicit native reactive external-host adapter; never mock the accepted-session predicate or write fabricated hello/revision values.

Use installed native Svelte/Vite compilation. The inspected private `vitest.gateway-contract.config.ts:10–20` uses `configFile:false`, disabled prebundling/reinclusion, HMR false and supported `dynamicCompileOptions` to compile `.svelte.ts` with `generate:'client'`. Its browser resolution conditions and `test.server.deps.inline:['svelte']` keep the actual rune/store runtime together. For the component config select only PluginIframe.test.ts, use installed happy-dom, and compile both `.svelte` components and rune modules in native client mode. Retain `envDir:false`, explicit private cache directory, disabled optimizer discovery/client/SSR optimizers and `rolldownOptions.tsconfig:false` from the proven tool setup; use exact safe aliases for `$lib`, `$app/state`, `$env/dynamic/public`. Record effective compiled mode and a genuine `toStore`/`flushSync` subscription control; SSR direct reads are not reactive-mount proof. Dynamic imports after resetModules must share the mounted component's actual Svelte runtime.

Mock only external browser transport/HTTP and unrelated application effects; the real shared client must process challenge/connect/res frames and create every accepted session. Count and reject native network attempts even if code catches them. Record helper mocks and resolution paths. Do not import/run gateway.contract.fixture.ts as a setup helper because that registers its full suite; adapt its synthetic socket boundary within the owned component test. Reuse the native implementation, not its test assertions or a parallel session model.

Minimum red/green matrix: pre-auth constrained absence; already-authenticated first mount; first mount after selected-host change before reconnect; same-client/same-URL reconnect; known missing method and unknown version; late compatible hello; revision change with unchanged hello content; backup handshake versus committed cutover; RPC queued before effect cleanup; deferred import and deferred HTTP/probe/JSON across retirement; old Window message versus new instance; compatible legacy omitted version; unsupported peer rejection by real bridge; theme/locale/save cleanup and no remount loop. Assert actual serialized request ownership and zero privileged requests on both old/new clients in denial cases. Happy-dom evidence remains distinct from the separately admitted real WindowProxy/browser lane.

After source freeze, run only admitted focused tests and mandatory design/token lint, then ask root to serialize the full paired Hub check. Browser qualification, active package/source adoption and deployed acceptance remain open. No requirement or phase is closed by this receipt.

## 2026-09-09 paired mounted red baseline

Status: fixture preparation and initial red baseline completed; component implementation remains unadmitted. Only the two authorized private fixture/config files changed. The component, real Hub hosts/session state/service, RPC leaf, compatibility utility and HostBridge remained unchanged. This is happy-dom mounted evidence, not real-browser WindowProxy, installed-source adoption or release acceptance.

### Frozen inputs and fixture

All paths below are relative to `/tmp/minion-14-consumers-61p26r_z/minion_hub`.

| File | SHA-256 |
|---|---|
| `src/lib/plugins/PluginIframe.test.ts` | `0255dc6e68f862c832357a16d9bd2b2f517210e34a5df56ab3241e0ddaee1020` |
| `vitest.plugin-compat.config.ts` | `bec776fa5e2b132dc5cbc4d8c72e7250a02a0aea8422d0b8e4e9681d96a6f854` |
| `src/lib/plugins/PluginIframe.svelte` | `f3a33500d1f80697f6499164a219d2ec8259b588dfd0ac19389ec52ae11835a3` |
| `src/lib/services/gateway.svelte.ts` | `50c4ac224ce35a48a9ed09c86bc8c054f60231df162bb22d246bf8fdd31f5110` |
| `src/lib/state/gateway/gateway-data.svelte.ts` | `e833482b62dfad02c26c0ae32e02f9309a68a933ebd0cc117ebf3e759965da03` |
| `src/lib/state/features/hosts.svelte.ts` | `f0cc2e181d42df5d1ff2b5de7eb047d3c6b14669b85da07e8a68165a0d1f5635` |
| `src/lib/plugins/bridge-protocol.ts` | `0c34a52b74ca0d194411dd630d31cf1b80218cec9a3ebfd20629eb4672d04596` |
| `src/lib/plugins/bridge-host.ts` | `61a74edb66bf93e486368c1b176ba59a5244ebaf4be2fdfce0faf0e7f3d2dcb8` |
| `src/lib/plugins/compat.ts` | `935a3ce25df11929c2e04de8a4b4a45fe6a724f5dd9ee841cd0a6788cf44f290` |
| `node_modules/@minion-stack/shared/dist/gateway/client.js` | `9fd0783baa97b9d64844ce1c3058966a0193f2ef8f4a148c3cc50139b119d474` |

Shared package identity remains root's complete 14-11 archive `b896e1df2d7da596f6f6dd0f3d2a26f225ffbe11587d95fae1deb233818595e9`; the single emitted-client hash is an additional check. The service owner froze its routing correction before this run. Every accepted token in this fixture originates in the actual shared client's challenge/connect/hello handling; no fake accepted-session predicate, revision, client identity, HostBridge or gateway-rpc implementation is present.

### Executed command and isolation

From the private Hub directory, using Node `v22.23.2` and Vitest `4.1.10`:

```sh
env -i PATH=/usr/bin:/bin HOME=/tmp/minion-14-consumers-61p26r_z LANG=C.UTF-8 /usr/bin/node node_modules/vitest/vitest.mjs run --config vitest.plugin-compat.config.ts src/lib/plugins/PluginIframe.test.ts --maxWorkers=1
```

Final run started at displayed runner time `16:01:54`, completed in **3.21s**, and exited 1 with **5 controls passed / 8 intended regression failures / 13 total**, no skips or unhandled errors. Tool execution session `70336` and output chunk `b8c96a` retain the run identity; the preceding complete diagnostic run `94135` / `bdaaad` showed the same five/eight outcome before the unmount control was strengthened. No standalone log file was created outside the authorized file list.

The exact config selects one file, disables application env loading (`envDir:false`), uses the installed native Svelte plugin with `configFile:false`, explicit client generation for component/rune modules and browser resolution conditions. Its post-transform assertions observed `svelte/internal/client` in both actual PluginIframe and hosts output. The native `toStore` subscription control observed `host-a` then `host-b` after actual `selectHost` and `flushSync`; it does not infer reactivity from direct reads.

Resolved Vite test cache was `/tmp/minion-14-consumers-61p26r_z/minion_hub/.plugin-compat-cache/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709`. Both that cache parent and `node_modules/.vite-temp` resolve inside the private checkout. Optimizer discovery and client/SSR optimizers are disabled. The provenance assertion accepts only the exact private cache or its descendants. This run did not install or alter dependencies, invoke normal Hub config/tests, start a server/browser or use a database/provider.

Synthetic WebSocket accepts only the two explicit `.invalid` host URLs; actual client requests and response frames cross that boundary. HTTP is an explicit local-path synthetic allowlist for host tokens/updates, server list, flows and activity bins. A `net.Socket.prototype.connect` guard counts attempts before rejecting them, including attempts caught by product code. Every afterEach asserted **zero native socket attempts and zero unadmitted HTTP attempts**, including all eight failing tests.

Happy-dom creates its own iframe window with `disableIframePageLoading:false` and `navigation.disableChildFrameNavigation:true`; its installed navigator returns before HTTP and sets only the target URL. JavaScript/CSS file loading remain disabled. The fixture uses the resulting actual `contentWindow` as message source and observes that window's `postMessage`; it does not install a fabricated window or bridge. Decorative icons, translated labels, page inputs and unrelated application effects are mocks. The actual shared Button is selected instead of the Hub UI barrel. No visual-rendering claim follows from those substitutions.

### Controls and reproduced failures

| Case | Observed result |
|---|---|
| Actual hosts reactive subscription | Pass: selected-host changes notify native Svelte subscriber. |
| Legacy omitted-version handshake, repeated-ready positive control | Pass: exactly one privileged request serialized on the actual authenticated client. Repeated ready is explicitly a control for the baseline remount defect, not the desired protocol behavior. |
| Known missing advertised RPC | Pass: incompatible warning replaces iframe after capability import settles; no privileged request. |
| Unsupported ready protocol 999 | Pass: actual HostBridge denies forwarding. |
| Unmount cleanup | Pass: one request works before unmount; a fresh old-peer request after unmount does not increase the count. |
| One normal ready followed by ordinary RPC | **Fail:** host hello is emitted but zero requests dispatch; one was required. |
| Declared requirements before capability module resolves | **Fail:** privileged iframe renders while compatibility is unknown. |
| Unauthenticated legacy plugin | **Fail:** iframe remains despite actual service returning no accepted session. |
| Late compatible actual hello | **Fail:** previously blocked constrained plugin remains absent after actual authentication. |
| First mount after selecting another host | **Fail:** actual service correctly returns null, but component mounts against former routing. |
| Current socket closes | **Fail:** actual accepted session becomes null, but existing iframe remains. |
| Old peer queues RPC after selected host changes | **Fail:** one privileged request reaches retained old client where zero is required. |
| Component gateway URL disagrees with captured session URL | **Fail:** B iframe mounts while real accepted token is for A. |

The additional first-ready finding is grounded at unchanged `PluginIframe.svelte:283` and `:321`: the ready callback sets reactive `pluginReady`; the bridge mount effect synchronously reads it and reruns, disposing the bridge at `:268` before installing a fresh unready bridge. A second ready permits the exact same real RPC path. The desired regression keeps one ready and expects one serialized request; this finding must not be hidden by the positive control. Existing compatibility and global dispatch seams remain at `:145–169` and `:70–76` respectively.

### Setup failures excluded from acceptance

Earlier attempts exposed fixture issues and are not product regressions: Vitest 4 rejects CLI `--minWorkers`; it appends a hash subdirectory to configured cacheDir; the provenance plugin initially ran before the native rune transform; a Proxy-based translation mock lacked explicit Vitest exports; importing the whole decorative icon barrel caused cold transforms to overrun the 10s hook timeout; actual legacy icon rendering also exposed a fixture runtime incompatibility. These were corrected in the two owned fixture/config files without raising hook limits, changing product code or replacing the real authority modules. `disableIframePageLoading:true` also leaves contentWindow null, so it was replaced with the documented installed child-navigation setting described above. The final run has no such errors.

### Remaining work and root handoff

This initial baseline does not yet cover deferred HTTP/JSON/probe/import completion, same-client reconnect, backup cutover, A→B→A retired mount behavior, theme/locale/save cleanup, actual browser WindowProxy, source typecheck or visual/design lint. These remain required in the admitted implementation/verification sequence rather than being silently certified by thirteen cases. A TODO at the private fixture top points to this receipt. Root owns the proposal ledger and source admission; suggested exact addition: **14-06 paired mounted baseline reproduced eight gaps, including first-ready bridge replacement. Preserve actual service/session/client/hosts authority and add deferred/reconnect/save acceptance before candidate adoption; no active or released behavior has changed.**

The private fixture/config are frozen for root review. No component source or active checkout was changed and no phase/requirement is closed.

## 2026-09-09 Task 2 private implementation freeze

This section supersedes the preceding source-admission and incomplete-coverage status. Root admitted the three private files after independently repeating the thirteen-case baseline (five controls passed, eight regression assertions failed; `root-plugin-compat-red.log`, 4.13s). Task 2 now has an implemented candidate and author-executed mounted evidence. Independent replay, aggregate Hub checking, browser Task 3 and adoption remain separate gates. No active Hub component or installed package was changed.

### Frozen candidate and preserved authority

Paths are relative to `/tmp/minion-14-consumers-61p26r_z/minion_hub`.

| File | Final SHA-256 |
|---|---|
| `src/lib/plugins/PluginIframe.svelte` | `231ad22ab771250d70b0e950859185e4563531d7e37021590708012bba0ce55d` |
| `src/lib/plugins/PluginIframe.test.ts` | `18a59753dd013522c5a7bbedab3787e318ab3c7ad9700a666fce167f7dc19304` |
| `vitest.plugin-compat.config.ts` | `51f4275bda9257ddbf719f7911f07f0a32b6d382a5f3392d4549d88bfe8034d1` |

Fresh hashes matched all seven authority inputs in the baseline table: gateway service, gateway-data, hosts, bridge-protocol, bridge-host, compat and emitted shared client. The service remains `50c4ac…`, with its actual captured gateway URL and accepted-session accessors. The component uses that actual session object and captured client. It does not substitute a local counter for service authentication or dispatch through whichever global client happens to exist later.

All privileged mounts now await an actual accepted session, including unconstrained legacy plugins. The real compatibility utility still decides declared constraints. Missing requirements, invalid routing and a component gateway URL that disagrees with the captured session deny mounting. The CDN asset origin remains separate from gateway authority. Same-client reconnects acquire a fresh accepted session; host selection, committed backup cutover, changed routing/credentials and revoked compatibility retire the old component lifetime.

The keyed iframe owns a separate mount lifetime. Its callbacks check both that lifetime and the service's current accepted session before dispatch and after awaits. Local users/identity HTTP and diagnostic probes carry its abort signal; stale completions cannot publish. Already-dispatched gateway RPCs may continue remotely, but their late response cannot reach a retired or replacement bridge. Generation/edit requests preserve 180 seconds and ordinary requests preserve 15 seconds. The effect initializes the bridge inside `untrack`, preventing the first `plugin:ready` state update from destroying its own handshake. Theme/locale updates use the existing bridge without remounting. Cleanup removes bridge listeners, clears handshake/save timers and resets diagnostic/save/dirty state.

### Final mounted execution

The exact env-cleared one-file command remains the command recorded above. Node was `v22.23.2`, Vitest `4.1.10`, installed Svelte `5.56.4` and happy-dom `15.11.7`. Final execution session `69349`, output chunk `259c95`, started at displayed runner time `16:22:59`: **47/47 passed, exit 0, 5.37s, no skips or unhandled errors**. Every test's cleanup asserted zero native socket attempts and zero unadmitted HTTP attempts. These timings describe this fixture run, not application performance.

| Coverage group | Actual observations |
|---|---|
| Original thirteen cases | All five controls and eight prior regression assertions pass, including a single ready followed by an actual serialized RPC. |
| Compatibility/routing | Supported constraints, missing methods, omitted methods/version, malformed/unsupported bridge and minimum-version strings, invalid/credential-bearing route, CDN asset origin and current compatibility revocation. |
| Session transitions | Actual same-client/same-URL reconnect, A→B→A selection, staged backup before and after committed cutover, old queued peer requests, old response after replacement. |
| Deferred boundaries | Controlled real-module loading success/rejection, disposal and selection while loading; users HTTP response and JSON retirement; delayed diagnostic JSON; current diagnostic followed by late ready. |
| Retained UI behavior | Same-iframe theme/locale updates, external save binding and correlated result, retirement resetting save state, listener/timer cleanup and inert old load events. |
| Request deadlines | Actual client ordinary 15-second timeout; both generation and edit remain pending at 15 seconds and retain their 180-second allowance. |
| Native DOM control | Minimal conditional/key component compiled by the same native Svelte pipeline removes the exact old element, including `isConnected === false` and `parentNode === null`. |

The controlled import factory awaits a test gate and then returns the exact already-loaded real service export object, or rejects. Vitest wraps a module namespace, so success asserts real accessor function identity and returned accepted-token identity rather than assuming namespace-object identity. Service state, hosts, client and HostBridge remain actual. This loading seam was explicitly admitted by root.

### Fixture correction: native comment constructor

An independent minimal conditional/key control initially failed even when run alone before `vi.resetModules` or authority imports: the old element remained connected after branch change and unmount. A direct native element `remove()` worked. This was a fixture failure, not evidence for adding manual DOM removal to the component.

Installed happy-dom `lib/nodes/document/Document.js:821` creates comments using the imported base Comment class, while `lib/window/WindowContextClassExtender.js:85–89` exposes a subclass as `window.Comment`. The resulting document-created comment failed `instanceof globalThis.Comment` and `instanceof window.Comment`, even though those two exposed constructors were identical. Installed Svelte `src/internal/client/dom/operations.js:141–147` uses that check to skip the leading comment sentinel; `template.js:335` constructs the sentinel/anchor range. The mismatch made the effect's DOM range omit its dynamic children. The standalone failure and constructor diagnostics are retained in execution sessions `53612`, `33245` and `55409` (chunks `6facee`, `a21ac5`, `edd8bc`). Temporary diagnostic transformation of loaded Svelte effects code was removed from the owned config; no dependency file was edited.

Root admitted test-only constructor alignment before Svelte imports: `vi.stubGlobal('Comment', Object.getPrototypeOf(document.createComment('')).constructor)`, with an explicit instance assertion and restoration after each test. The standalone native control then passed (session `31034`, chunk `cc3b02`, 2.23s). The final suite retains that control and the alignment. This corrects the mounted fixture's constructor identity; real-browser behavior remains unverified.

Two other fixture corrections preserve native reactivity: mock factories for unrelated UI/i18n surroundings are recreated after module resets, and component prop controls use independent stores rather than invalidating every prop through one coarse store. The latter prevents a theme-only test update from artificially changing routing identity. The service authority modules remain unmocked except for the admitted delayed-import wrapper described above.

A final setup-only attempt changed the control to a dynamic ignored virtual import, which Vitest could not resolve (46/47, session `77202`, chunk `091202`). The final test uses the static Svelte import `../../__conditional_control.svelte`, resolved and loaded exclusively by the owned config; no additional physical component was created. The corrected 47-case run above includes this control. These setup failures are not counted as product failures or passing evidence.

### Formatting and design checks

Installed Prettier with `prettier-plugin-svelte` formatted only the three owned files. Both required commands ran from the private candidate with an empty inherited environment and exited 0: `bun run lint:design` and `bun run lint:tokens`. Token integrity scanned 2,224 files and reported **zero violations**, using the existing installed design-token contract and 114 reason-coded exceptions.

Design lint retained existing global debt and explicitly skipped its git-based per-file comparison because the private checkout has no `origin/master`. That skipped gate is not certified by exit 0. As a bounded supplemental check, the actual `RULES` definitions from `scripts/design-lint.mjs` (SHA `5cd6003a67c50a2d81f9d22b8b656cf8ac44c62a078eb8d325a740585db52b65`) were evaluated against the hash-verified original component `f3a335…` and final `231ad2…`. Every raw rule count was unchanged: five numeric icon sizes, two loading animations, zero for the other eleven rules. No baseline, exception or design token was changed. This proves no additional counted component debt; it does not replace the normal repository CI comparison or visual review.

### Remaining gates and ownership release

The component's exact-site `TODO(handoff)` points here for real WindowProxy/browser qualification and manifest/token provenance before adoption, and states that fences cannot undo a sent RPC. Root proposal text: **14-06 private paired candidate now passes 47 actual mounted cases with unchanged service/HostBridge authority. Before adoption, independently replay the frozen candidate, complete aggregate Hub checking and browser Task 3 at the admitted viewport sizes. Preserve the explicit happy-dom constructor qualification; do not treat it as native browser evidence. Gateway manifest/token authorization, upstream RPC error projection, remote cancellation and package/source/release adoption remain separate work.**

There were no browser/server/database/provider calls, package installs, dependency edits, active-source edits or global planning mutations in this task. The three candidate files and this receipt are frozen for root's independent review. No phase or requirement is marked complete.

## 2026-09-09 independent-review corrections

Root independently repeated the previous 47 cases successfully (7.72s), but its aggregate check reported two fixture type errors and its source review found an additional native URL comparison bug. Therefore that previous freeze was not complete Task 2 acceptance. The aggregate log is the root-owned private `root-plugin-paired-full-check-native.log`.

The fixture now initializes the dynamic props object from the real typed initial props rather than asserting that an object of undefined values is `Props`. The virtual-only conditional control uses a string-typed dynamic import with an explicit `{ default: SvelteComponent<{ visible: boolean }> }` result type. This preserves native compilation without an unresolved literal module type, an `any` cast, suppression directive or extra declaration file. Root must repeat aggregate checking to certify these type repairs.

Two new mounted cases reproduce valid URL serialization mismatches: `http://A.invalid:80/` with `index.html`, and `http://a.invalid` with `index space.html`. Before the repair each iframe existed but produced no host hello, because native `frame.src` differed from the unnormalized derived string. The focused red run selected those two cases and failed both (47 other cases intentionally unselected), session `56724`, output `d4386f`, 4.07s. Derived `src` now uses native `new URL(value).href`, preserving the existing invalid-origin gate. The complete suite then passed **49/49, exit 0, 5.38s**, session `87867`, output `696bf5`; zero native/unadmitted HTTP attempts and no unhandled errors. Prettier subsequently changed test formatting only.

| Repaired file | SHA-256 |
|---|---|
| `PluginIframe.svelte` | `1e63b1be2ac3a76a5487369eec0542cd168e0e7b51e94ab78bff02df5b1b9ba2` |
| `PluginIframe.test.ts` | `63acb032460eb6b074df3f042141b9eb89887c29ffbdb142ab384f6a593a7184` |
| `vitest.plugin-compat.config.ts` | `51f4275bda9257ddbf719f7911f07f0a32b6d382a5f3392d4549d88bfe8034d1` |

Root also identified a remaining presentation contract gap. The component distinguishes no accepted session from incompatible state, but an authenticated hello that omits required method/version facts currently produces the incompatible presentation. Existing mounted cases prove denial, not a typed pending-vs-incompatible distinction. `compat.ts` exposes `methods: string[]` and `{ ok: false; reasons: string[] }`; absent methods are projected to an empty array and unknown/invalid version share one prose reason. Correct classification requires an admitted change to that utility's typed result/capability input and tests, using its existing validation grammar. The component must not duplicate the grammar or parse reason strings. The utility remains unchanged pending root's scope decision; Task 2 remains open at this seam. This explicit correction supersedes any broader reading of the previous coverage table.

## 2026-09-09 typed compatibility consumption freeze

The presentation gap above is now implemented in the private candidate, following independent acceptance of the separate 14-15 utility amendment. Its source SHA is `c589bf1f8cbcf2ec73702f1ae33b406a6d82975a2dc87b374aeaec90710380db`, and utility test SHA is `8c30d861696977b91cd1104c1887934a940c06630264faed54736602b4292f46`. These files were not edited by the component owner.

The component preserves absent method/version advertisements when calling the real utility. It consumes mandatory false-verdict `kind: 'pending' | 'incompatible'` directly; it neither reproduces validation grammar nor parses reason text. Manual route/asset/plugin-status denials are incompatible, unresolved authentication is pending, and failed module loading is incompatible. Both false branches still exclude iframe mounting. Waiting text now covers unavailable required connection details rather than incorrectly implying that every pending state lacks authentication.

Seven actual mounted cases were added: missing methods, known empty methods, missing version, known older version, invalid minimum with missing facts, invalid bridge with missing methods, and known missing required methods combined with unknown version. Before component consumption, the two missing-fact presentation assertions failed while five known-incompatibility controls passed (49 prior cases deliberately unselected; session `99293`, output `509a41`, 3.77s). Each case establishes an actual accepted session and asserts no iframe and zero privileged RPCs. Known incompatibility and malformed evaluated constraints take precedence over pending facts through the utility's typed result.

After consumption and formatting, the complete one-file command passed **56/56, exit 0, 6.03s**, session `99096`, output `9f0e82`, displayed runner start `16:36:17`. No skips, unhandled errors, native network attempts or unadmitted HTTP attempts occurred. This includes all prior lifecycle, URL-canonicalization and standalone native DOM controls.

| Final candidate file | SHA-256 |
|---|---|
| `PluginIframe.svelte` | `c4b6681c139a57a33f3bbc1c966143556e32e09ded9306931568a8c72ab4c503` |
| `PluginIframe.test.ts` | `feb6799afcaba073161da90b7e01bf45fb2d2dbf26383c57ab90a95b8a238957` |
| `vitest.plugin-compat.config.ts` | `51f4275bda9257ddbf719f7911f07f0a32b6d382a5f3392d4549d88bfe8034d1` |

Fresh hashes confirm unchanged real gateway service `50c4ac…`, gateway-data `e83348…`, hosts `f0cc2e…`, HostBridge `61a74e…` and emitted shared client `9fd078…`. The only changed dependency is the separately admitted 14-15 utility above. No package installation or active-source adoption occurred.

Both design/token lint commands were repeated after this final source change and exited 0. Token integrity again reported zero violations; design lint retained its explicitly reported private git-base comparison skip and existing debt. No markup classes, tokens, baseline or exception allowances changed. The source/test/config are frozen and their ownership is released for root's independent replay and aggregate Hub check. Browser Task 3, manifest/token authorization and active/released adoption remain open; the exact-site browser/provenance TODO and paired proposal still apply. The previous pending-classification proposal is addressed at private source level only, pending independent component acceptance.


## Final native browser result

Task3 now passes at the exact V2/V5 fixture identities in14-06-BROWSER-VERIFICATION.md. Both native handshake orders, real source/origin denials, stale queued RPC, narrow mobile/desktop geometry and final combined Hub check pass. Active source/package and deployed qualification remain separate.
