---
phase: 14-sdk-transport
plan: "10"
status: isolated_task2_green_frozen_pending_independent_review_and_adoption
requirements: ["SDK-01", "SDK-02"]
---

# 14-10 — isolated Site session adoption

Task2 source is frozen inside `/tmp/minion-14-consumers-61p26r_z/minion_site`: **22 focused cases pass**, including native client Svelte subscription changes across same-object reconnect, and a strict focused service/fixture declaration check passes. Active Site source and installed dependencies remain unchanged. Full application check, root independent review and matching source/package adoption remain open. The appended Task2 receipt supersedes the earlier source-admission gate; the original Task1 results below remain historical RED evidence.

## Preserved Task1 receipt

The actual unchanged Site member gateway service and reactive state now execute against the selected emitted shared package in the root-owned snapshot. The final dedicated run reached nine cases: **seven expected acceptance failures and two passing controls**. This is the requested RED evidence before service implementation; no service source fix or installed-app qualification is claimed.

## Admission and ownership

Selected plan SHA `7e4547b7dcc40ce34d96252e1809dd19d5affd3aaebff58fd64561584c0ddbdb`; its final isolated-consumer amendment overrides draft source restrictions only for Task1. Snapshot `/tmp/minion-14-consumers-61p26r_z/minion_site`. Active Site branch was read as `dev`; no branch/worktree/stash/commit operation occurred.

Authored only snapshot `src/lib/services/member-gateway.contract.fixture.ts`, snapshot `vitest.gateway-contract.config.ts`, private `.qc-checks/` logs/receipts and this canonical summary. Optimizer/cache paths stay under snapshot `.qc-cache/`; dependency links are not write targets. All93 root-copied before-manifest files retain their recorded bytes, all121 candidate package files match the selected extracted manifest, and all345 dependency links retain their destinations. Active and snapshot service SHA remains `223a2ee825f8a99e62757945299fbd62ac30cee0f73bd1ed27da6566c0c74dc1`; state SHA remains `06d7141501f00d31a864aa8330321e526d30a84bfec4030e3bb1df60253cb0ca`.

Read active Site instructions and UI governance. No component/markup/style or state/service source was changed. No full app check, SvelteKit sync, build, install, browser or gateway server was run. Task2/3 implementation and active adoption remain root-owned gates.

## Runtime, declaration and runner identity

Selected shared archive SHA `b896e1df2d7da596f6f6dd0f3d2a26f225ffbe11587d95fae1deb233818595e9`; full extracted manifest SHA `d696388db3357f994ac2f20541f30e5001118fb064baf4e7db906c642b65a9b6`. Root materialized the entire artifact at the private snapshot `node_modules/@minion-stack/shared`. Native ESM resolution selects that copy's `dist/index.js`; installed TypeScript's Bundler resolution for the actual service selects the same copy's `dist/index.d.ts`. The artifact identity test verifies the imported real GatewayClient class equals the class imported by the exact candidate client path, and checks runtime/declaration/manifest digests. The reconnect test spies on the unmodified class's connect method and proves both socket attempts use the same client instance.

Candidate client runtime SHA `9fd0783baa97b9d64844ce1c3058966a0193f2ef8f4a148c3cc50139b119d474`; declaration SHA `4904536794ee4d7c009e2061727afad2371ff18fa5485c993d147440007fbaf1`; packed manifest SHA `e1610bed949aaa0116465b9ec9a5762d5cd9628177bcb5b73608ae04d68610fb`. Type resolution records optional peer metadata ws8.20.0 from Site's dependencies; no Node/ws runtime behavior was exercised.

Runner is Vitest2.1.9 with its nested Vite5.4.21, while Site's top-level Vite is6.4.2. Svelte is5.55.9 and vite-plugin-svelte5.1.1. The actual nested runtime is recorded instead of inferring it from top-level Vite. TypeScript used for declaration resolution is5.9.3. The dedicated config sets maxWorkers and minWorkers to1, passWithNoTests:false, envDir:false, a private cacheDir and disabled optimizer. It compiles real Svelte rune modules with the installed Svelte plugin, configFile:false/hot:false. The only alias is $lib to snapshot/src/lib; no shared source/client alias is introduced.

The snapshot deliberately lacks generated `.svelte-kit/tsconfig.json`. First fixture runs collected zero tests because Vite tried that missing extends file; those were fixture failures, not behavioral RED results. In the owned config, fixture-only esbuild tsconfigRaw is explicitly a JSON string with target ES2022, useDefineForClassFields and verbatimModuleSyntax. Installed Vite5 still loads the app extends when this option is an object; the string bypass follows its actual transformWithEsbuild implementation. This does not synthesize app declarations or make an app typecheck pass. Vite's config-bundle step still prints the missing generated-config warning, but actual service/state compilation and all nine test bodies run. A CJS require.resolve control initially rejected the package's import-only exports; it was corrected to the actual ESM/class identity check, without changing the package or weakening resolution.

## Real behavior and red results

The fixture supplies only synthetic WebSocket delivery, signing fetch/navigator values and console sinks. It imports the real service, real Svelte reactive state and emitted real GatewayClient. No alternate connection/session state model exists. Requests are produced and correlated by GatewayClient; the socket fixture delivers JSON responses to their actual IDs. Late native-close delivery is controlled independently of close requests to exercise the real browser close race. Fake timers drive the service's own polling/activity timers and the client's reconnect timer.

| Acceptance case | Final observation |
|---|---|
| Whole candidate runtime/declaration identity | Passed |
| Initial authentication, member role/scopes, signing, initialization and one polling timer | Passed |
| Same-object automatic reconnect authenticates a new socket | Failed: connected remains false; the real client reconnects but service never republishes success |
| Retired client's close arrives after successor authentication | Failed: old callback clears successor connected state |
| Retired chat.send rejects during replacement | Failed: its catch invokes chat.history on the successor client once. This is a real request-method attempt; the not-yet-open transport does not send it over a socket |
| Older same-session history response settles while newer history is pending | Failed: old finally clears current loading state |
| Old activity timeout fires during successor activity | Failed: it clears successor working state |
| Explicit disconnect owns timer cleanup | Failed: one old activity timer remains after polling is cleared |
| Current socket-error reporting | Failed: selected fixed console.warn is absent; source retains inherited default reporter |

The final command used the installed runner from the snapshot:

`node node_modules/vitest/vitest.mjs run --config vitest.gateway-contract.config.ts src/lib/services/member-gateway.contract.fixture.ts --maxWorkers=1 --minWorkers=1`

It ran under a60-second subprocess watchdog and strace, exited1 with7 failed/2 passed, zero skips,1.62 seconds reported duration. `.qc-checks/task1-isolated-red.log` retains the complete actual assertions. No source implementation followed. Initial missing-config/identity-fixture failures and earlier red traces remain separate logs.

## Isolation and discovery proof

Every test replaces global WebSocket before constructing a real client; the synthetic constructor accepts only `wss://synthetic.invalid`. Every fetch is intercepted, with only the synthetic signing endpoint accepted; unexpected calls are asserted empty during teardown. No application secrets/environment are loaded. Commands inherit only PATH=/usr/bin:/bin, temporary HOME, LANG and compile-cache disablement.

The first working runner used Vite's default localhost host resolution. strace recorded system-resolver Unix calls and loopback port0 address-selection probes; those were runner infrastructure, not gateway requests, and are not called zero-native-socket evidence. The final config pins server.host to127.0.0.1. Final trace then records **zero IPv4/IPv6 sockets, zero connect calls and zero listen calls**. Local NETLINK interface inquiry remains present. Raw traces stay temporary; no interface addresses are copied into this canonical receipt.

Installed Vitest's createVitest/globTestSpecs API performed actual file discovery with envDir:false, private cache and the same explicit host. No test module was executed in the ordinary lane. Normal vitest.config.ts selected only `src/lib/server/identity-sync.test.ts`; dedicated config selected exactly `src/lib/services/member-gateway.contract.fixture.ts`. Both assertions passed and the discovery context was closed. This proves the new fixture does not enter normal tests; filename convention alone was not counted.

The active old shared baseline remains untouched: client SHA `082e7c38fa050ceffbcb6e500b8ed2123a1856526c9cbdbad292d165280227bc`, declarations SHA `123346b6915c3f85661f29f2a84c4c5b1263fffe4573a352451083098f183b1b`. Both lack onAuthenticated. That is a preserved separate missing-contract control, not a passing candidate behavior lane or installed adoption. All runtime/declaration behavior claims above concern the selected snapshot candidate.

## Selected reporting and next source gate

Root selected all three existing console hooks: event failure uses only `[member] gateway event handler failed` with console.error; reconnect uses only `[member] gateway reconnect attempt failed` with console.warn; socket uses only `[member] gateway socket error` with console.warn. Obsolete-client diagnostics must be ignored; hooks must not retry/change state or include supplied error/frame/URL/event-name data. This selection is recorded, not implemented here. The socket canary test establishes a first failing acceptance point; all-hook canaries and throwing sinks remain required during Tasks2/3.

Root must review this fixture before admitting service source changes in the same snapshot. Later qualification must add the remaining plan cases: stale send fulfillment/rejection during same-object reconnect, old hydration after replacement, operation-owned invalidation cleanup, duplicate authenticated notifications, failed/disconnected challenge, all three reporters and throwing sinks, and no effect replay. The nine Task1 cases do not claim exhaustive Task3 coverage. Full isolated Site check requires its proper generated types and remains separately scheduled; active package/source/lock adoption must be an explicit matching transaction.

Standards self-review: owned fixture/config only; actual service/state/client retained, no dependency or active edits, discovery and network boundaries checked. Spec self-review: genuine consumer RED evidence exists for reconnect and selected stale callback/send/timer races, with source/artifact/installed identities separated. Root independent review remains pending. Existing challenge/connect/agents raw diagnostics, package shipping gates, browser, Node peers and broader protocol/authority work remain outside this Task1 receipt.

## Frozen identities

All paths below are relative to the private Site snapshot. The final identity check is `.qc-checks/task1-identity.json`; source/candidate/link comparisons are described above.

| File | SHA-256 |
|---|---|
| `.qc-checks/discovery-resolution-command.json` | `74875bbf19d5b563289cb5b7d26d0343d3f15959bf0cae558de01e8c146accee` |
| `.qc-checks/discovery-resolution.log` | `bc7cb54bf10bdde5a34eb41a2eea73bd8c495888e5ad08a116670b58ce3e3e15` |
| `.qc-checks/task1-isolated-red-command.json` | `c16a9b5ed36edf4ef642185d0cb40599ab93777d02f7a64390fe11d370df6356` |
| `.qc-checks/task1-isolated-red.log` | `33f2a899e079e26083687d70cb9f1023dffd7697d19ab62e720c47eb17eb7787` |
| `.qc-checks/task1-network-summary.json` | `68c64462fa1285194045389e5d6c80dbff557d3ab73614b770f011d497fefb8b` |
| `before-manifest.json` | `d5800fc71e6ec7c123fedeba129cb48e348b1f44d5dc98c5891ae3f575b8e4d6` |
| `dependency-links.json` | `a1d9644040e1f5d1808f73c715792b3bf27681fe8ee0bf6e5d23c1505f1d86ce` |
| `node_modules/@sveltejs/vite-plugin-svelte/package.json` | `c057bedc7adfbb7b49ef128096a1b7e78d35915d559538681257d95b14eaf919` |
| `node_modules/svelte/package.json` | `a1bdc0347f025868e18cbcbdc6d48b6594dfc915bf50ab48a6d923ddde30d650` |
| `node_modules/vite/package.json` | `5fc282b9be55507e1f487bbf0bc6d7621728c41ab1325c8111b353e4fe043a62` |
| `node_modules/vitest/node_modules/vite/package.json` | `e9802045cdc313b6da55ec2e2dd79312074645816089d64f6021f567c10c0a03` |
| `node_modules/vitest/package.json` | `6ea35e567829660d9832744086c18526b9ddebd5358c4a0cadfb0a355925f917` |
| `src/lib/services/member-gateway.contract.fixture.ts` | `2406b5a7d9d096735fb88992312126a34f020f321a2214c0b0b7feba097391ab` |
| `src/lib/services/member-gateway.svelte.ts` | `223a2ee825f8a99e62757945299fbd62ac30cee0f73bd1ed27da6566c0c74dc1` |
| `src/lib/state/member.svelte.ts` | `06d7141501f00d31a864aa8330321e526d30a84bfec4030e3bb1df60253cb0ca` |
| `vitest.gateway-contract.config.ts` | `2b4192e6e00c455526a6a26a4149df5142a07f7f61ee01c6904c4cdd35c7db8c` |


## Task2 implementation and client reactivity receipt

Executed the final Task2 amendment in PLAN SHA `f7d7d12ca5a0ec1b31e1251801bf215f93653e011443bb443cd75dbc439f9318`. Preserved the original service first as snapshot `.qc-checks/before-member-gateway.svelte.ts`, SHA `223a2ee825f8a99e62757945299fbd62ac30cee0f73bd1ed27da6566c0c74dc1`. Only the three admitted snapshot source/fixture/config files and this summary were authored, with private evidence/check configuration under `.qc-checks/`.

The service now accepts authenticated publication through the actual shared callback, capturing the client and its production generation. It invalidates the previous session before close/replacement, deduplicates identical accepted tuples and removes initial promise-success publication. Obsolete-client events, close and diagnostics are ignored. Agents/session hydration, history, send settlement and polling use captured client/session references; they check ownership before state writes or follow-up RPC. History and send operations carry their own identity, so an older completion cannot clear a successor's loading/sending state. Invalidation clears flags owned by retired pending operations without reporting success. One polling interval and one activity timeout are owned and cleared across transitions. Existing optimistic message insertion, member scopes, signing, explicit send idempotency and agent/session selection remain in place.

All three selected reporters now emit only their fixed messages. Tests drive actual malformed event handling, socket errors and failed reconnect handshake, each with ordinary and throwing sinks. Error/frame canaries do not enter arguments. Shared reporter containment prevents throwing sinks from altering transport flow. The surviving raw signing/connect/agents diagnostics are explicitly outside this redaction claim, with an owned-site TODO pointing to `proposals/2026-09-08-platform-qc-remediation.md`; the callback has a separate TODO for the 14-01 payload-authority gate. Root owns their proposal disposition.

### Corrected native compilation evidence

The earlier Task1 direct-state assertions used the installed plugin's SSR module transform. They remain real behavioral observations, but were not evidence of reactive browser publication. Site's installed plugin5.1.1 `src/index.js:225` passes `generate: ssr ? 'server' : 'client'` directly to native `compileModule`; its ordinary-component dynamicCompileOptions path does not override this rune-module transform.

The owned config now uses Vitest2's native `testTransformMode.web: ['**/member-gateway.contract.fixture.ts']`, `resolve.conditions: ['browser']`, and `test.server.deps.inline: ['svelte']`. Installed vite-node's web path calls Vite transformRequest without the SSR flag, then its normal SSR evaluator transform. Thus the existing Svelte plugin compiles actual rune modules for the client, while Node executes the synthetic fixture. No replacement compiler, fake rune implementation, DOM emulator or application server was added. The fixture dynamically imports native `svelte/store` and `svelte` after each resetModules so its subscriber, flushSync and actual dynamic member state share the same runtime. A static store import initially stayed attached to the prior module instance; that failed subscriber control is preserved in `task2-client-green.log`, separately from service acceptance.

The native toStore subscription observes exactly `[false, true, false, true, false]` through initial authenticated connection, close, same-client internal reconnect and explicit disconnect. This proves reactive state publication in this compiled fixture; it does not certify browser rendering or deployed UI behavior. The first invalid testTransformMode RegExp produced zero tests and is retained in `task2-first-green.log` as a configuration failure, not a behavioral result.

### Final focused validation

The final dedicated run executes22 cases with zero failures/skips in3.24 seconds, exit0. It includes initial scopes/signing and candidate identity, native reactive reconnect publication, duplicate wire challenge/hello idempotence, asynchronous signing cancellation, queued old authenticated success, obsolete close/event/error, queued initialization/history/poll results, both queued send outcomes during same-object reconnect, exact idempotency/no replay, same-session history ownership, activity/disconnect cleanup, and all three reporter paths with canaries/throwing sinks. Duplicate callback production is checked through duplicate real wire input and exact one initialization/interval; no private callback is manually invoked or fake generation manufactured.

Strict focused TypeScript validation of the actual service and fixture against the selected complete candidate declarations exited0. The private `.qc-checks/tsconfig.gateway.json` extends the installed shared Svelte config, includes native Svelte/Node types, sets the snapshot $lib mapping and noEmit. skipLibCheck avoids treating linked third-party declarations as application ownership. This is a focused source/fixture check, not `bun run check`; config-bundle missing `.svelte-kit/tsconfig.json` warning remains documented. No SvelteKit sync or app type generation ran. Task1 native ESM/type resolution and normal-versus-dedicated discovery remain applicable: shared resolution and file names did not change, only the dedicated mode options changed.

Final execution used the same installed Vitest2 runner, strict environment allowlist, private HOME/cache and synthetic WebSocket/fetch. Final strace records zero IPv4/IPv6 socket calls, zero connect calls and zero listen calls; local NETLINK discovery remains. The fixture asserts no unexpected fetches on every teardown. No network, provider, browser, installation or active package transaction occurred.

Preservation recheck: only `src/lib/services/member-gateway.svelte.ts` differs among93 original snapshot files; the other92 match. All345 read-only dependency links and all121 copied shared package members match their prior identities. Active Site service remains SHA `223a2ee825f8a99e62757945299fbd62ac30cee0f73bd1ed27da6566c0c74dc1`. The full archive identity remains the 14-11 candidate recorded above; unchanged package version0.9.0 is not treated as production release identity.

### Task2 frozen files

Paths relative to `/tmp/minion-14-consumers-61p26r_z/minion_site`:

| File | SHA-256 |
|---|---|
| `src/lib/services/member-gateway.svelte.ts` | `fb7a2a48c0ad68870b50e25db961f9932c73f0bbc0878212cd53015dbe54b823` |
| `src/lib/services/member-gateway.contract.fixture.ts` | `fa0f2127427509e3e2ea574a0d3b81f97786ff4029e6136b533ce863a4244dff` |
| `vitest.gateway-contract.config.ts` | `6beefe2ea15ac6981c2f523d2a9b451fb158006992c4931f1043b55c233a363d` |
| `.qc-checks/before-member-gateway.svelte.ts` | `223a2ee825f8a99e62757945299fbd62ac30cee0f73bd1ed27da6566c0c74dc1` |
| `.qc-checks/task2-final-green.log` | `55784fd98e80aad6e9149694c7912df89bb0efcba33ad65b7c7faba4204a9c3c` |
| `.qc-checks/task2-final-green-command.json` | `d2341dd4a6432526a0b8cbbb2606c264ebd6725fda23b352e3e1b295abdd18c1` |
| `.qc-checks/task2-typecheck.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `.qc-checks/task2-typecheck-command.json` | `1c8b17eef2b26f47d522efae883c514e98e279bbd52477af325a03d127637f5a` |
| `.qc-checks/tsconfig.gateway.json` | `570dd14e9f3800309aaad1d21e71c36b4a7379154a2eb6081bc4cebd45c369df` |

Standards self-review: native Svelte/client and real shared runtime retained; source boundaries respected; full candidate declarations resolved; no dependency, active-checkout or unrelated-file edit. Spec self-review: required reconnect ownership and stale operation cases have focused evidence; this is ready for independent root review. Full Site app check and exact matching source/package adoption remain unexecuted. Browser, gateway authority, Node/ws/Paperclip, package shipping license/README/test-artifact cleanup and immutable release identity remain their separately owned gates. SDK-01/02 are not closed by this consumer fixture.
