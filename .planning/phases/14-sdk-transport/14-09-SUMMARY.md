---
phase: 14-sdk-transport
plan: "09"
status: isolated_candidate_scoped_pass
requirements_completed: []
date: 2026-09-09
---

# Hub authenticated-session adoption: isolated candidate

The amended Task 2 is frozen in the private snapshot: 44 contract tests pass; the 15 existing focused regressions passed before the event amendments. The active Hub source and its old installed package remain unchanged. Root independently reviewed the source, repeated all 44 cases and passed the full candidate app check with zero errors/warnings; see 14-09-VERIFICATION.md. Paired active source/package adoption remains separate. No requirement is closed.

## Task 1 baseline receipt (preserved history)

The unchanged Hub service fails eight session-boundary assertions against the real emitted 14-11 shared client. Three controls pass, including an actual Svelte store subscription observing reactive hello publication. At this checkpoint fixture selection was ready for root review and source changes had not begun. Root subsequently accepted the fixture and admitted Task 2 below.

All fixture/config edits are in `/tmp/minion-14-consumers-61p26r_z/minion_hub`. The active Hub branch was read-only checked as `feat/level-2026-07-30`. No active source, node_modules, manifest, lock, build output or branch was edited. The copied service/state/history helpers remain hash-identical to their original manifest. There was no application server, browser, provider, real gateway or full application check.

Admission began at PLAN SHA 65ad655bfa3165003e0d21cb7cf0dc3dade9f354f4d996039b8100ceacfcaf2e. Root's generated-config amendment is f6ae3652bb7d31033ce4a3cd9b5ffca835766d7f91b71290c3e52b5e37799ba1. Root supplied `.svelte-kit/tsconfig.json` from its successful independent Hub 14-07 check; this agent did not run SvelteKit sync or manufacture generated declarations.

## Actual fixture boundary

The fixture imports the copied `gateway.svelte.ts`, actual gateway-data/connection state, actual RPC holder, lifecycle/eager-reconnect helpers, and the full private extracted `@minion-stack/shared` package. The actual GatewayClient creates the injected global fake WebSocket and performs challenge, connect, response correlation, timeout cleanup and internal reconnect. No fake client algorithm or fixture session epoch is used.

Environmental mocks cover host-token/JWT state, HTTP fetch, storage, user/query/debug/chat-storage/workshop/update/toast/group/config/history surroundings and re-export modules with dangerous or irrelevant initialization. HTTP results are synthetic and delayed where needed. The native TCP `Socket.prototype.connect` guard throws and records every attempted connection; every test asserts zero attempts, including caught attempts. Fake sockets admit only `ws://a.invalid` and `ws://b.invalid`. This is controlled transport evidence, not an actual WebSocket-server interoperability test.

The precise backup race uses a root-approved passthrough observer around the actual `GatewayClient.connect()`: it calls the original method, attaches a fake server close after real authentication, and returns the identical original promise. The observer closes the backup before the Hub's await continuation. It does not replace the handshake, session identity or publication algorithm.

The dedicated config uses the installed native Svelte plugin. Its supported `dynamicCompileOptions` selects client generation for actual `.svelte.ts` modules; browser resolution conditions also apply to the SSR runner's Svelte imports. The public `toStore`/`flushSync` control observes `[null, 'A']` from the real gateway state. Without that browser resolution correction, the diagnostic run observed only `[null]`; that fixture-fidelity failure was corrected before the final receipt.

`envDir:false`, no app setup file, and `server.host:'127.0.0.1'` avoid environment loading and default localhost resolution. The only selected fixture is `src/lib/services/gateway.contract.fixture.ts`; `passWithNoTests:false`. The installed tools are Vitest 4.1.10, Vite 8.1.3, Svelte 5.56.4 and native Svelte plugin 7.2.0. Vitest uses `maxWorkers:1` only. The ordinary config remains unchanged and does not discover this fixture.

## Red evidence and controls

Final command, cwd the private Hub snapshot, with only PATH/HOME/LANG retained:

```sh
node node_modules/vitest/vitest.mjs run --config vitest.gateway-contract.config.ts src/lib/services/gateway.contract.fixture.ts --maxWorkers=1
```

Result: exit 1, **8 expected failures / 3 passing controls / 11 tests**, no skipped tests or reported unhandled errors; 2.26s total. Log: `gateway-contract-native-reactive2-red.log`, SHA 2085860933226131aafe6ac3fbfcc1033ce024e944dd7440e000f8cb7f3a0b13.

| Assertion | Observed unchanged-service behavior |
|---|---|
| Current close invalidates hello | Connected becomes false; old hello remains. |
| Same-client internal reconnect publishes current session | Real shared client authenticates a new socket; Hub connected remains false and initialization is not published. |
| Accepted session has real revision | Actual state has no sessionRevision. |
| Closed authenticated backup cannot commit | Cutover returns true for the already-closed backup and dispatches initialization onto it. The expected handled `agents.list: not connected` diagnostic is retained. |
| Already-resolved old agents response is fenced | Old agents data appears during manual replacement. |
| Old flow fetch cannot dispatch through successor | One old flow is registered on the new client's socket. |
| Old server lookup cannot apply to new selection | It sets selectedServerId to the stale response's match for the newly selected host. |
| Old activity response is fenced | Old bins reach the merge sink once after replacement. |

Passing controls prove: real client-runes publication is reactive; open/challenge alone does not publish and initial hello initializes once with one binary listener; an actually dropped source causes a still-pending backup to be rejected and closed.

Discovery commands both exited 0:

```sh
node node_modules/vitest/vitest.mjs list --config vitest.gateway-contract.config.ts --filesOnly
node node_modules/vitest/vitest.mjs list src/lib/services/gateway.contract.fixture.ts --config vitest.config.ts --filesOnly
```

Dedicated output contains exactly the fixture; ordinary output is empty. Logs: `gateway-contract-dedicated-discovery.log` and `gateway-contract-default-discovery.log`. No default tests were executed.

## Setup history and evidence limits

The initial native-plugin attempts failed before collection: Vite/Rolldown's Svelte dependency optimizer reported a missing tsconfig while resolving node:module. Disabling ordinary optimizer settings, a tsconfig override and native config loading did not supply the missing generated configuration. Logs `gateway-contract-initial.log`, `gateway-contract-setup2.log` through `gateway-contract-setup5.log`, plus the allowlisted configuration diagnostic, are retained as setup failures rather than application red evidence.

An alternate direct call to the installed Svelte compiler reached six failures/two controls (`gateway-contract-setup6.log`) before root rejected replacing the native plugin. That path is **unaccepted diagnostic evidence** and is not the final fixture. Its config is retained in `gateway-contract-direct-compiler-config.log`, SHA e346492aa3bfbe641316a0f48e46c91532478023a108375276371df70a2a7407. It was removed from the operative config. Root then supplied the real generated config, enabling the native-plugin run. No claim depends on the alternate compiler path.

The first native run had eight failures/two controls. Adding a reactivity control exposed the SSR-versus-browser module mismatch; the final supported plugin configuration passes that control. Earlier test counts are not additive to the final 11.

This Task 1 receipt is runtime red evidence, not a typecheck/build/install/browser or completed adoption receipt. Three-hook canaries, further polling/init races, successful cutover reconnect, late source callbacks and source fixes remain Tasks 2/3. Imported downstream history/config/group completion fences remain outside ownership and need the root TODO/proposal ledger.

## Reporting policy selected by root

All three hooks are required in Task 2. Obsolete-client diagnostics are ignored. Reporters neither retry nor change state and never pass errors, payloads, event names, URLs or credentials to the sink.

| Hook | Exact sink/message |
|---|---|
| onEventError | console.error(`[hub] gateway event handler failed`) |
| onReconnectError | console.warn(`[hub] gateway reconnect attempt failed`) |
| onSocketError | console.warn(`[hub] gateway socket error`) |

Secret canaries and throwing-sink behavior still require the Tasks 2/3 fixtures. Existing unrelated raw log paths are not declared sanitized by this selection.

## Resolution, containment and identities

Root's admitted 14-11 archive is b896e1df2d7da596f6f6dd0f3d2a26f225ffbe11587d95fae1deb233818595e9. The private shared package contains its matching runtime and declarations; there is no shared source alias. Raw Node package resolution and the runtime failure stack both point to this private package. Its declaration contains onAuthenticated. The active old installed package lacks that callback and remains a distinct preserved control; it was inspected, not executed in this fixture.

A read-only inventory checked all 2,393 copied files against `before-manifest.json`: zero changes to original files. All 953 dependency links still match `dependency-links.json`. Cache and bundled-config temporary paths resolve inside the snapshot and are not symlinks: `.gateway-contract-cache` and `node_modules/.vite-temp`. Receipt: `gateway-contract-containment.log`. Links are operationally treated read-only; this is not an OS-enforced filesystem sandbox or a recursive attestation of every linked dependency's contents.

| Artifact | SHA-256 |
|---|---|
| Fixture | `fd747025109a586a79d331040f59ecd6445d79d0c42bbfde35c1fa0815abc6bd` |
| Dedicated config | `0c94b9dd37ee979d3941098da4905eef868d7bedf4cc63e7b7f71711eea223f2` |
| Unchanged service | `91e8c69ca2c717744f73bc8fb34cb48cc684c63cc369b6298b8b870de0adbaed` |
| Unchanged gateway-data state | `ee103bf834c8937d405f05b26b19ec1e5ffd15bbe6f9b04988ba3f2c76e7e0cb` |
| Unchanged history helper | `a18c5241dfae80472a3bcb827a72d7f1b418f37b741cfda5f772c78f60eb971c` |
| Private shared root JS | `238e597df8e2c08f06ca0defdbe71f87d5b1062b1fc1f5e657f77dc0e5952d6c` |
| Private shared root declarations | `148058415f09b379c84c0833a1d5a20d92a439b59b7f879fb5bc26545e8ac6c1` |
| Private shared client JS | `9fd0783baa97b9d64844ce1c3058966a0193f2ef8f4a148c3cc50139b119d474` |
| Private shared client declarations | `4904536794ee4d7c009e2061727afad2371ff18fa5485c993d147440007fbaf1` |
| Active old installed client JS | `082e7c38fa050ceffbcb6e500b8ed2123a1856526c9cbdbad292d165280227bc` |
| Active old installed client declarations | `123346b6915c3f85661f29f2a84c4c5b1263fffe4573a352451083098f183b1b` |
| Root-supplied generated tsconfig | `7ee595e6dab99155db70cf9a3c98e7c6ecfb73eb91bc281a2a9a00c036a4f0c2` |
| Copied-file manifest | `c2e7ba86a1b216a6da052d7c7c219ff87db3b621741f7b7d62b603ef828a1395` |
| Read-only dependency-link inventory | `7b0e333a6dc2dc562e5a2582a655a75dc1b8259e0ee8f3a6fd0ca134ac443f6d` |

Standards: two private fixture/config files plus this summary, no product changes, no compiler suppression or production alias. Spec: meaningful red on actual service/client with a working reactivity control; source implementation and independent root acceptance remain pending. SDK-01/SDK-02 and the PluginIframe component/browser gates remain open.


## Task 2 implementation and acceptance boundary

Root admitted PLAN `e89b23917804dd0de8fd44912b37b3e6577002a73daa96ac8db2b742923ce3a8`. All implementation remains in `/tmp/minion-14-consumers-61p26r_z/minion_hub`. Before files are retained as `gateway-task1-service.before` and `gateway-task1-state.before`. The active checkout and dependency links were not edited.

`onAuthenticated` records each actual shared-client socket generation. An authenticated backup is staged privately; only the current client or a successful cutover publishes it. One publication function updates hello, presence, connected flags, display timestamp and trace parent, increments the real reactive `gw.sessionRevision`, and starts initialization once. Close/replacement invalidates hello and stops its polling/flush owner while retaining caches on transient drops. The revision survives data resets. Cutover checks the exact source session before and after token retrieval and before commit, plus the backup's live authenticated record. A committed backup can later reconnect normally. Binary wiring remains attached once per active socket.

Each service-owned initialization result checks the captured session before a state write or subsequent dispatch. RPCs use the captured client rather than the mutable leaf. Server and activity fetches check both fetch and JSON continuations; each flow registration checks its owner after the prior registration settles. Dynamic config initialization checks ownership before calling the imported helper. Agents and presence polling guards live in their own timer closures, so an obsolete finally cannot clear a successor's guard. The delayed startup timer is cancelled on invalidation. The existing 15-second shared request timeout is preserved.

All three selected reporters ignore obsolete clients and call only the fixed console message. Throwing sinks are contained. Tests exercise real event-handler failure, native error delivery and actual internal reconnect rejection. Existing unrelated raw diagnostics retain their existing behavior and remain outside this reporting claim.

### Focused evidence

The final 27-test contract run passed with no skips, unhandled errors or native socket attempts in **2.62s**:

```sh
node node_modules/vitest/vitest.mjs run --config vitest.gateway-contract.config.ts src/lib/services/gateway.contract.fixture.ts --maxWorkers=1
```

The 15 existing tests passed across three files in **1.53s**, without modifying them:

```sh
node node_modules/vitest/vitest.mjs run src/lib/services/gateway/connection-lifecycle.test.ts src/lib/services/gateway/eager-reconnect.test.ts src/lib/services/gateway/chat-rpc.context.test.ts --maxWorkers=1
```

Both used the private snapshot and PATH/HOME/LANG-only shell environment. Existing regression setup adds its declared synthetic defaults/no-op cache. No application server, native connection, provider, browser, aggregate check, build, installation or declaration modification was performed. Final dedicated discovery selects only the contract fixture; ordinary discovery remains empty. Config changes after Task 1 are formatting only.

The expanded suite was also run against the two preserved original source files, restored through a `finally` block afterward. That run produced 22 failures and 5 passes in 7.55s: 21 assertion failures plus one five-second test timeout. The timeout occurred because the original code wrongly created a backup after an obsolete token result and awaited its handshake. The test was corrected to assert socket count before awaiting cutover. Its focused original-source rerun then failed explicitly with **three sockets instead of two**, in 2.03s; the other 26 tests were deselected for that focused diagnostic. The final candidate run executes all 27. Retain the original timeout as a fixture-observation limitation rather than counting it as an assertion result. Historical counts are not additive.

Coverage includes initial publication and reactive observation; duplicate challenge/hello suppression; same-client reconnect with changed methods; immediate invalidation and retained agents; monotonic revision across explicit resets; source re-authentication during token and backup waits; closed backup rejection; manual supersession; committed backup reconnect; obsolete callbacks; every direct initialization response; held fetch/JSON results; per-flow registration continuation; delayed polling startup; both polling finalizers; and all three reporters with synthetic secret canaries and throwing sinks.

Two polling tests dispatch through the actual `GatewayClient.request` and delay delivery of its already-correlated response with a test gate. This models deferred promise continuation delivery, not a naturally pending WebSocket request: ordinary close rejects pending requests immediately, and the normal 15-second request timeout is shorter than either polling interval. The wrapper preserves actual requests, response correlation, authentication and session identities; it neither replaces the reconnect algorithm nor fabricates a session epoch. The tests prove that old completion cannot release a newer guard. The backup-close test retains the approved identical-promise passthrough observer.

### Containment and remaining gates

The final inventory checks all 2,393 original copied files: only `gateway.svelte.ts` and `gateway-data.svelte.ts` differ. All 953 dependency links match their original inventory. Root separately repaired one source-copy omission by adding `src/lib/data/tool-manifest.ts`, hash `c5e49b412b432d3fa6bcb680dcac2ec30ee4a7e28aec82f397de60fe735ea90a`; its supplemental receipt and bytes remain unchanged. This is a root fixture prerequisite correction, not a product edit by this lane. `gateway-contract-task2-containment.json` records the comparison. Scoped diff checks reported no whitespace diagnostics.

Three exact source TODOs identify imported history/config/group hydration completion as unqualified and point to `proposals/2026-09-08-platform-qc-remediation.md` (root owns the ledger). Guarding their invocation does not fence their later internal writes. Chat-history source remains hash-identical. No new history replay or changes to the RPC leaf/lifecycle helpers were introduced. Other asynchronous event continuations and existing raw diagnostics are not covered by the initialization-only claim.

The component prerequisite is `gw.sessionRevision` together with current `gw.hello` and `conn.connected`. Revision increases once per accepted actual client/generation; disconnect clears hello/connected but retains revision. A consumer must track all relevant reactive fields, not just client identity or display time. PluginIframe enforcement, mounted/browser behavior, all downstream hydration, active matching package/source adoption and the aggregate Hub check remain pending. No standalone fixture typecheck is claimed.

**Standards review:** Exact owned files only, real native Svelte compiler and emitted package/declarations, no new dependencies or production aliases, no source suppressions or fabricated epoch, controlled transports, preserved source/dependency identities. The private package selection is candidate evidence only.

**Spec review:** The required publication, cutover, direct initialization, polling and three-hook behaviors pass the focused fixture; existing lifecycle/eager/history-context regressions pass. Independent review and aggregate typecheck are pending. SDK-01/SDK-02 remain open.

### Frozen Task 2 identities

Task 1 identities above remain historical. These are the final candidate/log identities:

| Artifact | SHA-256 |
|---|---|
| `src/lib/services/gateway.svelte.ts` | `46b9a2ffd56cfa78e4790a4eaa8ec571eb7af687f1b63717bfa894f5f724db85` |
| `src/lib/state/gateway/gateway-data.svelte.ts` | `e833482b62dfad02c26c0ae32e02f9309a68a933ebd0cc117ebf3e759965da03` |
| `src/lib/services/gateway.contract.fixture.ts` | `2298e2f549608c3153f54ccfcf1c7c86d44343c7e64a90dd24cf3fe92aa71919` |
| `vitest.gateway-contract.config.ts` | `16b5100b6fd8a222a61a628590be014e3fb236e2704eefde73ef1650054a918a` |
| `gateway-contract-task2-final.log` | `8591d2f3addb27a12616c2d5af301ad4a3ac603a2643580b578dad165d66b971` |
| `gateway-contract-task2-existing-regressions.log` | `708c2ee9805038342f0acae2baad56be475df694012ad6c1cb4089e3235d071d` |
| `gateway-contract-task2-baseline-expanded.log` | `b67b6c0cab75c25d589d56ba611a0dd4f23350d6199beccb2a28319eb1efa25d` |
| `gateway-contract-task2-baseline-token-corrected.log` | `e49032a9b3b3cc7d1d133edb32bd72cea08ea6130b74ce2543992e62097a3d6b` |
| `root-source-copy-correction.json` | `a9e5da0d1345123136cf492d8a7f75e24ef766f751ede3300db34c5b7b945562` |


## Deferred event amendment: final freeze

Root admitted PLAN `46692155d8de177b6337a18038b670555c9494e508e68e6125caf86b7dfb63f3`. This amendment changes only the existing snapshot service, fixture and this summary. The preceding 27-test freeze is preserved byte-for-byte in `gateway-task2-event-before.ts.log` and `gateway-task2-event-fixture-before.ts.log`; preceding results and identities remain historical evidence.

The `update.available` and failed `update.applied` branches capture the accepted session before loading messages. Their deferred toasts require that session to remain current; synchronous event receipt and state updates are unchanged. The awaited `update.migrating` fallback captures accepted session, revision, lifecycle token and host. A failed cutover can trigger fallback only if lifecycle/revision/host still match and the active session is the captured session or null. Null deliberately permits the current source to close before scheduled eager replacement begins. Explicit disconnect/replacement or any newly accepted session denies the old fallback. Synchronous fallback when there is no distinct backup remains unchanged.

The 15 new cases first ran against the preserved Task 2 service: **10 assertion failures / 5 passes**, 2.51s, with the prior 27 cases deselected by the test-name filter. No timeout or unhandled error was reported. After the 18-line addition/3-line replacement, the complete contract fixture passed **42/42**, zero skips/unhandled errors/native attempts, in **3.01s**. Command:

```sh
node node_modules/vitest/vitest.mjs run --config vitest.gateway-contract.config.ts src/lib/services/gateway.contract.fixture.ts --maxWorkers=1
```

The red command used the same invocation plus `-t 'deferred update event continuations'`. Both used the private snapshot and PATH/HOME/LANG-only environment. Existing 15 lifecycle/eager/chat-context results above predate this event-only amendment; they were not rerun. No aggregate check or typecheck was performed by this lane.

New positive cases verify both current-session toasts after the real dynamic import settles, live-source fallback after actual backup failure, source-close fallback before eager replacement starts, and successful backup without false failure narration. Negative cases cover each toast after close/manual replacement/same-client reconnect; migration fallback after ordinary same-host eager replacement, explicit disconnect/manual replacement, and same-object re-authentication. The last case explicitly disarms the real eager scheduler before closing the source to exercise the independent revision fence; the separate ordinary eager replacement case retains default migration scheduling. All cases deliver real events and use actual cutover/handshake code. Delayed Paraglide factories control only the environmental module-load boundary; no cutover result or generation is fabricated.

Source inventory still differs from the original manifest only in the two admitted service/state files. Dependency links remain unchanged. State/config identities are unchanged from the preceding freeze. The service diff has no whitespace diagnostics. Imported chat/history/config/group completion remains outside this amendment, with the previous TODO/proposal handoff intact. Root independent review, aggregate candidate check and matching active source/package adoption remain pending.

| Final artifact | SHA-256 |
|---|---|
| `src/lib/services/gateway.svelte.ts` | `54decdec044615ba49ed511f3b1279de936da596b0318cc7bfb48816551b7427` |
| `src/lib/services/gateway.contract.fixture.ts` | `52d9a8704cf8c5a5bc1661c63e2be67940117789f1e5a7841aad23bb048c9a3d` |
| `src/lib/state/gateway/gateway-data.svelte.ts` | `e833482b62dfad02c26c0ae32e02f9309a68a933ebd0cc117ebf3e759965da03` |
| `vitest.gateway-contract.config.ts` | `16b5100b6fd8a222a61a628590be014e3fb236e2704eefde73ef1650054a918a` |
| `gateway-task2-event-before.ts.log` | `46b9a2ffd56cfa78e4790a4eaa8ec571eb7af687f1b63717bfa894f5f724db85` |
| `gateway-task2-event-fixture-before.ts.log` | `2298e2f549608c3153f54ccfcf1c7c86d44343c7e64a90dd24cf3fe92aa71919` |
| `gateway-contract-events-red.log` | `8eaa166cf9cac8a8043e36dd2b6d2565d81318f6c1d1d3a54f891736dfae180d` |
| `gateway-contract-events-final.log` | `21c3b2688f6e5d1e266bc8f361162401ad886877a4f73253ff14a13ef0341463` |


## Authenticated event admission: final correction

Root independently found that current client identity alone still admitted domain events before the first hello and during internal reconnect. PLAN `26187f18d4d9031d70e4de66b852edd19bab40d15635126030a606eb8bf732be` admits the minimal guard before both sequence tracking and domain dispatch: an active accepted session must belong to that client and pass `isCurrentSession`. Shared challenge handling is unchanged. The previous 42-test source/fixture are preserved in `gateway-events-auth-before.ts.log` and `gateway-events-auth-fixture-before.ts.log`.

Two actual-client tests failed against that preceding source because unaccepted health events mutated state (2.01s; the prior 42 were deselected). After the guard, the full fixture passes **44/44**, no skips/unhandled errors/native attempts, in **3.15s**. Each new test also proves authenticated positive health/sequence behavior after the real hello; the initial-connect case additionally covers presence. The reconnect case uses the same actual client and verifies preserved prior state while authentication is pending. Commands are the same dedicated invocation above; the red run added `-t 'authenticated domain event admission'`.

Root concurrently refreshed 35 snapshot inputs and six external plugin siblings from its accepted full-check snapshot, recorded in `root-full-check-overlay.json`. Those root changes are preserved. The final manifest comparison reports no original-file changes outside the two owned sources and the recorded root overlay; all 953 dependency links remain unchanged. The old claim that only two original files differ applies to the earlier freeze, before this root overlay. State/config remain unchanged from the preceding candidate. No aggregate check, dependency install, active source edit or unrelated history/helper edit was performed by this lane.

| Final artifact | SHA-256 |
|---|---|
| `src/lib/services/gateway.svelte.ts` | `af6d5ae7c7083265cede7a78dd295363f3c20808705e4ba85b167fa862da8d5c` |
| `src/lib/services/gateway.contract.fixture.ts` | `e5a920702fe4e8f08e013271b105d95f10a252e8f154f003b64eb82d573cbbc0` |
| `src/lib/state/gateway/gateway-data.svelte.ts` | `e833482b62dfad02c26c0ae32e02f9309a68a933ebd0cc117ebf3e759965da03` |
| `vitest.gateway-contract.config.ts` | `16b5100b6fd8a222a61a628590be014e3fb236e2704eefde73ef1650054a918a` |
| `gateway-contract-auth-events-red.log` | `a55186e07256d324015635fa220263897271a516aa64ca879b9dd56381d00cbd` |
| `gateway-contract-auth-events-final.log` | `dcb368d0c088b03ff345bb873091260ec4a1b21532b2ccfa60e33b24c5186d4d` |
| `root-full-check-overlay.json` | `3bf9f47c4c58e8f3990db5c3d14212875f34d70683ef57a463009f567aae3fe6` |


## Task 4: accepted-session first-mount association

PLAN `1b9eb0c85120236315a851fb2fdfd7b3330b555e2aca6f7b5b6ab0cb9279c5e8` admits only the existing private candidate service/fixture and this summary. Root's preceding independent receipt (`14-09-VERIFICATION.md`, `bfcb8c2ee288804b304b71de6e640ab8167c6abc9e295d3985b8e1cd768ed26f`) proves the prior 44-case source and complete app check with zero errors/warnings; it does not qualify these new bytes. Before-images are retained as `gateway-task4-service.before` and `gateway-task4-fixture.before`.

The service now exports `AcceptedGatewaySession`, `getAcceptedGatewaySession()` and `isAcceptedGatewaySessionCurrent(snapshot)`. Each actual publication creates one frozen snapshot with client, accepted hello, authenticated host ID and the existing reactive revision. A private WeakMap associates that token with the real private accepted-session record; no generation or lifecycle counter was added. The accessor unconditionally reads revision, hello, connected and selected host before checking the actual private session predicate. The check rejects null, structural copies and retired tokens. Snapshot freezing is shallow and the hello property is readonly at the type boundary; this does not deep-freeze shared gateway payloads. Private session liveness is not exposed. The API is an internal UI lifecycle association, not token or tenant authorization.

Real host selection B denies retained A even when the URLs match. A selection-only A→B→A round trip restores the same still-authenticated A token if no actual connection transition occurred. This is root's selected policy: the component must separately retire its mount/operation identity so previously retired callbacks cannot revive on a selection round trip. Close/reconnect/replacement permanently retire the previous accepted session. Backup authentication remains private until actual cutover publication. Already-connected first mount returns its token immediately without reconnecting.

The fixture now loads the actual hosts module through the native Svelte compiler, preserving its real local rune state and real `selectHost`/`applyOrgAssignedHost`. Only its environmental update/token/channel validation boundaries are mocked. Page data is synthetic; actual local selection remains reactive. The original 44 cases passed after this fixture correction (3.45s). Nine added cases then ran against unchanged source: **8 failures because the new accessor export was absent, 1 passing control**, 44 cases deselected (2.50s). These are structural API-red failures, not eight demonstrated behavioral failures. The passing control independently demonstrates the actual retained-A/client/connected state after real B selection. Prior Task1/event behavioral-red receipts remain separate.

After implementation the full fixture passed 53/53 in 4.01s. The final strengthened run additionally checks null denial and observes the identical real backup `connect()` promise before cutover continuation, recording that the public token is still A after backup authentication. Final result: **53/53, zero skips, no reported unhandled errors or native socket attempts, 3.90s**. Native `toStore`/`flushSync` subscribers observe empty→A→null on B selection→A on return→null on close→new A2 after the same actual client reconnects. A second subscriber begins while B is selected and A retained, then correctly observes A when actual selection returns; this covers the early-denial dependency path.

Command in `/tmp/minion-14-consumers-61p26r_z/minion_hub`, PATH/HOME/LANG-only environment:

```sh
node node_modules/vitest/vitest.mjs run --config vitest.gateway-contract.config.ts src/lib/services/gateway.contract.fixture.ts --maxWorkers=1
```

The red invocation added `-t 'accepted session first-mount accessor'`. The existing native config, private caches and full emitted shared runtime/declarations remain unchanged. No compiler replacement, source alias, live API, browser or network was used. No aggregate check/build/install was run by this lane. Root must independently review and rerun the complete candidate check after this freeze.

Standards review: 39 source lines added, including five comment-only handoffs; no existing behavior changed outside the admitted accessor/publication seam. No `any`, casts manufacturing session authority, dependency changes or exported private mutable liveness. Diff whitespace check is clean. Spec review: actual first mount, org assignment, same-URL hosts, selection round trip, same-client reconnect, staging/commit, forged/null tokens and native reactivity are covered. The 2393-file original inventory has no unexplained changes after excluding the admitted service/state and root's recorded overlay; all 953 dependency links retain their identities. Active branch remains `feat/level-2026-07-30`; active source/state/package files were not edited.

Remaining scope is explicit. Comment-only `TODO(handoff)` entries now mark activity reset, session idle timer, cross-run history completion, chat idle timer and stream completion/nested history sites in `onAgentEvent`/`onChatEvent`, pointing to `proposals/2026-09-08-platform-qc-remediation.md`. Root owns the matching proposal reconciliation. Earlier imported config/history/group fences remain open. Component dispatch, mount retirement and browser evidence belong to 14-06; this accessor alone does not establish them. Matching active source/package adoption and SDK requirements remain open.

| Task 4 artifact | SHA-256 |
|---|---|
| `src/lib/services/gateway.svelte.ts` | `d047a0516d53d2a2c8077205b2b41cfb8a1cbcce9e40952a742595a9d8752f7e` |
| `src/lib/services/gateway.contract.fixture.ts` | `e20561f0439040f2192681f1e6570c65fbd848c41be6028826503378ead64f16` |
| `src/lib/state/gateway/gateway-data.svelte.ts` (unchanged) | `e833482b62dfad02c26c0ae32e02f9309a68a933ebd0cc117ebf3e759965da03` |
| `vitest.gateway-contract.config.ts` (unchanged) | `16b5100b6fd8a222a61a628590be014e3fb236e2704eefde73ef1650054a918a` |
| `gateway-task4-service.before` | `af6d5ae7c7083265cede7a78dd295363f3c20808705e4ba85b167fa862da8d5c` |
| `gateway-task4-fixture.before` | `e5a920702fe4e8f08e013271b105d95f10a252e8f154f003b64eb82d573cbbc0` |
| `gateway-task4-real-hosts-control.log` | `b5c06c927706c73ce9c9bddb016ef9e6312b8baf3de3474573a27bf496748493` |
| `gateway-task4-red.log` | `87bef56e8ea7d4c0090819e8cb1af9ea2d94a9311a3eb303a45ee86abd87d4d8` |
| `gateway-task4-final.log` | `d8da8e9ad361a143e5fc3d2273acc23f24fbfe6b808661d0bd659011783a4d36` |


## Task 4 routing identity correction

Root admitted PLAN `e30296b1031a07ed3604d6e1f8b1518ed4f87b62aa3afc8cef009b365d1e2c7b`. Its new boundary adds the accepted client's construction-time gateway URL. The prior53-case source and root full-check receipt remain historical and are preserved; before-images are `gateway-task4-routing-service.before` and `gateway-task4-routing-fixture.before` in the same private candidate.

`buildGatewayClient` now freezes a shallow copy of the supplied Host before constructing the actual shared client. Both its socket URL and all future authenticated records use that copy. Public `AcceptedGatewaySession` adds only readonly `gatewayUrl`; the private Host object and its optional token field are not exposed. The token's field-list fixture asserts the exact five public fields. Cutover selects the accepted backup's captured host ID when committing, rather than rereading the caller's possibly edited object. The existing selected-host predicate and selection-only A→B→A policy are unchanged. No automatic reconnect or host-edit policy was added.

Five focused cases initially failed against the preceding source (2.75s, prior53 deselected). Four failures were the absent gatewayUrl property; one also reproduced private-identity drift: mutating the former Host object's ID made the existing accepted-session getter return null despite unchanged selected ID/client. That mutable-object test demonstrates the source aliasing boundary, not evidence that the UI supports editing database host IDs. URL edits and host-record replacement during authentication are exercised separately.

After the correction all **58/58 cases pass**, no skips, no reported unhandled errors or native socket attempts, **3.70s**. The new cases prove: captured URL survives edits during handshake; host-record replacement cannot relabel an existing connection; the former mutable Host cannot change private accepted identity; URL edits after authentication leave the old token unchanged and same-client reconnect still uses the original socket URL; a genuinely new client captures the edited URL; backup authentication/commit retains its constructed destination despite editing the target record. All previous53 tests remain present.

Command remains the dedicated native fixture invocation with PATH/HOME/LANG-only environment:

```sh
node node_modules/vitest/vitest.mjs run --config vitest.gateway-contract.config.ts src/lib/services/gateway.contract.fixture.ts --maxWorkers=1
```

The red run added `-t 'construction-time routing identity'`. Config/state/shared package and private dependency links remain unchanged. Original-file inventory has no unexplained changes beyond admitted service/state and root's recorded overlay; all953 dependency links retain identity. The parallel14-06 agent is preparing only its own component fixture/config and was asked to wait for this source freeze before executing the pair. No component, active source/package or aggregate check was changed/run in this lane.

Standards review: a readonly private host copy and one additional readonly public field; no added dependency, authority counter, exposed auth field or unrelated behavior. Source whitespace diff is clean. Spec review: accepted routing comes from actual client construction, including its internal reconnect and backup commit; component HTTP/WS normalization and mount retirement remain14-06 responsibilities. Root's new independent focused/full app checks are required for these bytes before adoption.

| Routing correction artifact | SHA-256 |
|---|---|
| `src/lib/services/gateway.svelte.ts` | `50c4ac224ce35a48a9ed09c86bc8c054f60231df162bb22d246bf8fdd31f5110` |
| `src/lib/services/gateway.contract.fixture.ts` | `c72e008de580eb8e5e59b52c270cc941a890a54cbf5625948f3e06c844177541` |
| `src/lib/state/gateway/gateway-data.svelte.ts` (unchanged) | `e833482b62dfad02c26c0ae32e02f9309a68a933ebd0cc117ebf3e759965da03` |
| `gateway-task4-routing-service.before` | `d047a0516d53d2a2c8077205b2b41cfb8a1cbcce9e40952a742595a9d8752f7e` |
| `gateway-task4-routing-fixture.before` | `e20561f0439040f2192681f1e6570c65fbd848c41be6028826503378ead64f16` |
| `gateway-task4-routing-red.log` | `80c140533040765645a135bfa01a13e67fc1120374ab6c7bc5ea981b76de1bad` |
| `gateway-task4-routing-final.log` | `b1a427f67275f8664e26ffeba8cbdd471ea4c600cc68af42377218d69fc8add6` |


## Final paired component checkpoint

Root passed the full native Hub check with zero errors and warnings against final58-case service, typed compatibility utility and56-case PluginIframe candidate. Exact paired source/log identities are recorded in14-06-VERIFICATION.md. This closes the previously pending aggregate type check for these private bytes; active/deployed adoption and browser qualification remain open.
