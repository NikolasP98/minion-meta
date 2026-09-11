# Plugin bridge compatibility packet

Task 1 discovery only, 2026-09-09. Root policy selection is pending. No source, installation, browser, gateway or release change was made. Admitted plan SHA-256: `d19863e129360b30df551e191db88a82b3c1dd9605dedd5e6d5cc1023609746f`.

## Identity and reference selection

Root HEAD `69739a7c7b1a92e442b5a574d88f167a0fe40db3`; gateway HEAD `db83e075556a28cd15b2bb8feaa602aeea0954e7` on `fix/ci-cost-remaining-gaps`; Hub HEAD `a25528b603dfe25f7ea9c0900d271060e5394f35` on `feat/level-2026-07-30`. The scoped gateway package/manifest/projection and Hub plugin/artifact host paths had no working diff. Other concurrent changes remain outside this packet.

Separate reference `minion-meta` HEAD is `59c4b56c192a730dbd63bb8e51dd8305eb2ad424`. Its tracked packages contain no plugin-ui-bridge implementation to transplant. The reference shared gateway WS hooks are a different protocol and remain 14-01/02 selection work. Existing gateway and Hub bridge implementations are the repair baseline; do not reconstruct a June proposal's hypothetical missing bridge. Historical selection evidence is in `.planning/research/360-sdk-container-history.md`.

| Before source | SHA-256 |
|---|---|
| `minion/packages/plugin-ui-bridge/src/index.ts` | `a5510209e40f095f84d352b6107dc22eb11cf6caf49f8c4ab38552070b54b0d5` |
| `minion/packages/plugin-ui-bridge/src/index.test.ts` | `b143da7fdc6d2536ba5aff3ae44266031270459938ecd65287abb578e8632341` |
| `minion_hub/src/lib/plugins/bridge-protocol.ts` | `d135d7fbf4fd6c74e3b060215fc0296ca7fddbe27d0f1ec8ef3397832bfb4c76` |
| `minion_hub/src/lib/plugins/bridge-host.ts` | `61a74edb66bf93e486368c1b176ba59a5244ebaf4be2fdfce0faf0e7f3d2dcb8` |
| `minion_hub/src/lib/plugins/compat.ts` | `3d0dcc2db44a61e9aa84715de9ea5d5d76667cae2115323f8c4616b338cb7d8c` |
| `minion_hub/src/lib/plugins/PluginIframe.svelte` | `f3a33500d1f80697f6499164a219d2ec8259b588dfd0ac19389ec52ae11835a3` |
| `minion_hub/src/lib/components/artifacts/ArtifactHost.svelte` | `e5fc0325f443e2fcc69d73d00f787aed7df1b6fa33fe7e006bd971e31fb9fabe` |

Gateway source package is `@nikolasp98/plugin-ui-bridge@0.4.0`, exporting `dist/index.js` and types. All seven locally installed extension UI links resolve to `minion/packages/plugin-ui-bridge`. Their package source hash is `a5510209e40f095f84d352b6107dc22eb11cf6caf49f8c4ab38552070b54b0d5`; the built entry hash is `d92bb9daff3f6e56205c41d6aa6e645ec1d2a47e82aa074329d5905dde728a5c`. Hub's separate installed 0.4.0 copy has identical source and entry hashes. Gateway package manifest hash is `9cff62650ae812b1a9b934129a8fd9e713e34c5afcda2e40819cc7f7160a8aa0`; Hub installed manifest hash is `8493506e66d30f765616173f5e09cb40a18b0e5115a35b0234f529bfa3d45e8a`. Matching entry bytes do not prove plugin bundle, registry or deployed adoption.

Hub manifest lines 27 and bun.lock lines 30/427 select ^0.4.0 and locked 0.4.0. Gateway pnpm-lock links the seven UI importers at lines 337,435,602,722,765,850,912. Do not edit these installations or locks in this child.

## Consumer inventory

Read-only searches covered gateway extensions, Hub source and Site source for package imports, constructors, host mounting and raw frame strings. No Site bridge consumer was found in that source scope. Published plugins, database-stored generated artifact HTML and remote bundles were not enumerated.

| Actual consumer | Bridge use / compatibility obligation |
|---|---|
| `minion/extensions/alert-watcher/ui/src/lib/bridge.svelte.ts` and `rpc.ts` | Package PluginBridge; hash hint → referrer → wildcard origin fallback; host-forwarded RPC; control entry imports initialization |
| `minion/extensions/discord/ui/src/lib/bridge.svelte.ts` and `rpc.ts` | Same package and origin fallback; host-forwarded RPC |
| `minion/extensions/meta-graph/ui/src/bridge.svelte.ts` | Package PluginBridge; ready/theme/locale/hello; no separate rpc.ts import found |
| `minion/extensions/studio/ui/src/lib/bridge.svelte.ts` and `rpc.ts` | Package PluginBridge; control entry imports initialization; generation/edit calls can run longer |
| `minion/extensions/telegram/ui/src/lib/bridge.svelte.ts` and `rpc.ts` | Package PluginBridge; ready/theme/locale/hello and forwarded config RPC |
| `minion/extensions/voice-call/ui/src/lib/bridge.svelte.ts` | Package PluginBridge; no separate rpc.ts import found |
| `minion/extensions/whatsapp/ui/src/lib/bridge.svelte.ts` and `rpc.ts` | Package PluginBridge; ready/theme/locale/hello and forwarded config RPC |
| `minion_hub/src/lib/plugins/PluginIframe.svelte:268` | Ordinary host mount through `bridge-host.ts`; actual RPC forwarder and save lifecycle live in the component |
| `minion_hub/src/lib/components/artifacts/ArtifactHost.svelte:75` | Opaque iframe `sandbox="allow-scripts"`; host sets sandboxed true, empty gateway URL/token; permits only `hub.artifact.context.get` at line55 |
| `minion_hub/src/lib/artifacts/builtin/overview/index.html:92` | Handwritten peer, no package import; ready version1; origin-only inbound checks; own pending map |
| `minion_hub/src/lib/artifacts/builtin/triage/index.html:116` | Same handwritten protocol obligations |
| `minion_hub/src/lib/artifacts/builtin/artifact-builder/index.html:118` | Same handwritten protocol obligations |
| `minion_hub/src/lib/server/artifacts/builder-prompt.ts:64` | Requires generated artifacts to copy the reference bridge script verbatim; template repairs alone cannot repair previously generated stored artifacts |

The package also exports a backward-compatible HostBridge stub (`src/index.ts:344`), not Hub's actual RPC-forwarding host. Qualify that public surface separately; do not use it as proof of the production host.

## Current behavior and recommended matrix

These are source observations and proposed expectations, not test results. Protocol version1 here is unrelated to gateway WS protocol3.

| Combination / input | Current behavior | Recommended root selection |
|---|---|---|
| Normal peer, exact origin and expected window, valid v1 | Exchanges frames; host buffers hello until ready | Support; preserve both ready-before-hello and hello-before-ready ordering |
| Normal peer, correct origin but unrelated source | Both PluginBridge and ordinary Hub host accept by origin alone | Deny before callbacks or forwarding; require origin AND known window |
| Wrong ordinary origin | Denied unless plugin configured wildcard | Deny |
| Opaque artifact iframe, target source, origin `null` | Host accepts source and sends to `*` | Support only explicit sandbox mode; require target source and opaque origin on host ingress; ordinary mode never inherits wildcard authority |
| Opaque mode, unrelated source | Host denies | Preserve denial |
| Opaque mode, target source but ordinary origin | Host currently accepts | Deny; test navigation/context changes; browser verification remains required |
| Missing version field in ready or hello | Normalized to1 | Retain explicit legacy v1 compatibility; omission is distinct from null/wrong type |
| Numeric1 | Recorded, no negotiation denial | Support |
| Unsupported numeric major, malformed/null/string/nonfinite version | Discriminator-only validation can accept | Reject before privileged RPC/hello state; do not reinterpret gateway package semver as bridge major |
| Manifest bridgeProtocol `"1"` | Pass | Support positive integer major grammar; reject malformed strings/ranges (`^1`, `1junk`, `0`, negative); no new semver library needed for a major integer |
| Missing manifest compat | Pass | Retain supported legacy mounting, subject to peer validation and actual RPC authorization |
| Declared requiredRpc, advertised set contains all | Pass | Support |
| Declared requiredRpc, nonempty advertised set misses method | Fail | Preserve failure |
| Declared requiredRpc with empty/unknown advertisement | Pass | Recommend deny until requirements are known; distinguish unknown advertisement from a known empty set in a separately admitted component seam |
| Declared minGatewayVersion with unknown gateway version | Pass | Recommend deny until known for constrained plugins; legacy unconstrained plugins stay supported |
| CalVer string with numeric segments and optional suffix | Numeric comparison strips suffix | Retain documented CalVer behavior; validate grammar before compare, no invented SemVer range support |
| No host origin hint/referrer; package expectedHostOrigin `*` | Accepts any origin | Recommend fail closed for new supported operation. Explicit legacy opt-in would need a separately reviewed API policy; matching parent alone is not a trustworthy origin policy |
| Duplicate/late response, disposal, synchronous post/clone throw | Pending lookup ignores unknown IDs, dispose rejects current map; no disposed fence; clone failure can leave pending state | Preserve correlation, reject new calls after dispose, clean synchronous failures, suppress late host forwarding replies |

Message-specific validation must reject null/arrays, bad IDs/methods, nonboolean flags, nonfinite/negative resize, bad theme/tokens/locale/error envelopes before state/callbacks. Do not use shape validation as a method authorization check.

## Source evidence and consequential outside-owner seams

- Package `src/index.ts:201` checks origin only; Hub `bridge-protocol.ts:95` checks source only for sandbox, origin only otherwise. Both guards recognize type discriminators without payload validation. Host forwards RPC even before a supported ready handshake; version values are recorded but not enforced.
- Hub buffers hello/theme/locale until ready (`bridge-protocol.ts:157` onward); preserve late hello and latest theme/locale. Async `forwardRpc` completion can post after disposal. Package `call` has no timeout/cancellation and can create pending work after disposal. A timeout chosen here must accommodate actual `PluginIframe.svelte:75` generate/edit budget of **180,000ms**; do not silently impose a 30s universal bridge timeout. Recommend defer the timeout API to a bounded follow-up, while fixing disposal/failed-send cleanup in owned files.
- `PluginIframe.svelte:149-170` reads hello capabilities once, initially returns `{ok:true}`, then mounts before capabilities may be loaded. Tightening `compat.ts` alone cannot prove pre-mount or pre-RPC enforcement. An exact child must own the component, its tests and gateway capability state seam before asserting unknown-capability fail-closed behavior. Gateway manifest `src/plugins/manifest.ts:482` normalizes/drops malformed values; `server-methods/plugins.ts:104` projects compatibility. Loader validation/projection tests remain separate ownership. The manifest search found no checked extension `*plugin.json` declaring compat, so constrained fixtures must not be described as existing manifest adoption.
- `PluginIframe.svelte:23` handles privileged `plugins.users.list` through Hub APIs; other methods use the connected gateway. The component carries hello gatewayUrl/authToken (lines275-276), despite RPC helper comments saying these are unnecessary. Trace actual callers/token authority under a separate policy child; this packet does not establish a leaked live secret. `PUBLIC_PLUGIN_UI_BASE_URL` selects iframe assets; gateway identity stays the configured WS URL (lines237-254).
- Artifact handwritten peers validate origin without source and maintain their own pending maps. Add a child owning exactly the three builtin HTML files and builder prompt/tests before claiming all consumers repaired; no bulk rewrite of stored artifacts. Browser sandbox/origin proof requires separate browser admission.
- Current `PluginIframe.test.ts` checks component existence; existing FakeWindow tests omit realistic source on ordinary events. Neither proves browser interoperability. New paired-window tests must use actual package PluginBridge plus actual Hub HostBridge, queued structured-clone transport, and zero privileged call assertions for denied cases. Add installed-entry regression runs using the recorded entry bytes; source pairing alone is insufficient.

## Root admission receipt requested

Select matrix defaults above, especially wildcard legacy support, explicit major grammar, omitted-version support and constrained unknown capabilities. Admit only owned 14-04 package/host validation, correlation/disposal and compat utility work first. Keep component, manifest/loader, artifact raw peers/generator, RPC allowlist/token delivery, timeout API and installed/release/browser adoption as named child gates. Root must record exact source ownership and candidate test resolution before Tasks2–3. No requirement closure follows from this packet.

## Inventory byte receipt

Hashes below freeze every discovered extension peer import file and raw artifact template, without reading secrets or generated deployment data.

| File | SHA-256 |
|---|---|
| `minion/extensions/alert-watcher/ui/src/lib/bridge.svelte.ts` | `a903ad5cbf2cdba4f9ce69e785ab126a7835c2f476a6f53facd95472ac3fec6d` |
| `minion/extensions/alert-watcher/ui/src/lib/rpc.ts` | `2a212ed64a6401451dce97aa46de2221d4aea55eac99737a8b9fabb8a090a01a` |
| `minion/extensions/discord/ui/src/lib/bridge.svelte.ts` | `cedb3f9f08fbd9f822abb495e64d6e02f6c7bab5c38ca22eb5a42482b192950f` |
| `minion/extensions/discord/ui/src/lib/rpc.ts` | `b39b1001cbd3e4a61a82b1ea36ad36c4fbfe4266861d202af56f441807947d50` |
| `minion/extensions/meta-graph/ui/src/bridge.svelte.ts` | `8249439b4c3106b788806a982b3cbb0456ed0442baeb65a432038db76fa23d7b` |
| `minion/extensions/studio/ui/src/lib/bridge.svelte.ts` | `f879d9a6ec88a9eea672f8ae55e54cad6bc335976989f4024ce9ecbca779cf45` |
| `minion/extensions/studio/ui/src/lib/rpc.ts` | `d400f1163ad5fde9e3a0df3ef7132e14a33db47c193cda189d8166e47ead219b` |
| `minion/extensions/telegram/ui/src/lib/bridge.svelte.ts` | `cedb3f9f08fbd9f822abb495e64d6e02f6c7bab5c38ca22eb5a42482b192950f` |
| `minion/extensions/telegram/ui/src/lib/rpc.ts` | `b39b1001cbd3e4a61a82b1ea36ad36c4fbfe4266861d202af56f441807947d50` |
| `minion/extensions/voice-call/ui/src/lib/bridge.svelte.ts` | `685896740a4b224807a62b98d9e836372484d92a6935d7b3ff7b1d26832048ea` |
| `minion/extensions/whatsapp/ui/src/lib/bridge.svelte.ts` | `cedb3f9f08fbd9f822abb495e64d6e02f6c7bab5c38ca22eb5a42482b192950f` |
| `minion/extensions/whatsapp/ui/src/lib/rpc.ts` | `b39b1001cbd3e4a61a82b1ea36ad36c4fbfe4266861d202af56f441807947d50` |
| `minion_hub/src/lib/artifacts/builtin/overview/index.html` | `9be70d710752d84299a0f6e63bc20b1fa22c2596bd0d3dec0f23a96bb88b4e00` |
| `minion_hub/src/lib/artifacts/builtin/triage/index.html` | `f1b79dffcec387168d31606613a212919fb3bc28310b19f363b3b2297dc4330e` |
| `minion_hub/src/lib/artifacts/builtin/artifact-builder/index.html` | `60582d79edff9d53af8fcff0a181d14959dec74289ee4453b128224146d484de` |
| `minion_hub/src/lib/server/artifacts/builder-prompt.ts` | `080c620c47caa2a4b7f62996c31bb979120465c106b3366e526480c7e54b6925` |

## 14-04 admitted foundation execution, 2026-09-09

This section supersedes the Task1-only execution status above; the initial inventory remains a before-image. Root admitted source plan SHA-256 `01dc016b8c79c95eb15f74680ad12c81ea4ee77b9ae817933f27334dde7400ce` and selected exact origin/source, explicit opaque source/null, omitted-only legacyv1, strict message fields, supported handshake before RPC, constrained unknown compatibility denial and disposal cleanup. No universal timeout was introduced.

Source validation now enforces those boundaries. Hub correlates save replies, suppresses duplicate in-flight RPC IDs and drops replies after disposal; package calls clean pending entries when cloning or posting throws. Legacy package HostBridge now requires the correct source as well as origin and preserves ready-before-hello. No new public frame/export was introduced. Existing mount tests gained actual source identity and listener removal behavior.

The pre-change real-class regression suite had **5 failures and8 passes**: wrong-source/pre-handshake forwarding, opaque-origin mismatch, late replies after disposal, duplicate in-flight forwarding and wrong-source package-host readiness. After changes, the package suite passes **24 tests** and typecheck/build; the Hub suite passes **51 tests across3 files** (21 actual peer/byte cases,6 mount cases,24 compatibility cases). No test was skipped. Root's aggregate Hub check and independent review remain separate receipts.

| Peer pairing | Local result | Evidence boundary |
|---|---|---|
| Candidate source PluginBridge + candidate Hub host | Ordinary/opaque × both ready/hello orderings pass; actual RPC/save/theme/locale exercised | In-process structured-clone fixture, not mounted browser/plugin bundles |
| Locally built candidate PluginBridge + candidate Hub host | Same4 combinations pass | Build export bytes qualified locally; workspace-linked installed entry changed, published version did not |
| Preserved Hub installed0.4.0 PluginBridge + candidate Hub host | Same4 supported combinations pass | Installed source still has its wrong-source ingress flaw; a separate test records baseline acceptance versus candidate denial |
| Package legacy HostBridge | Original4 behavior tests retained plus wrong-source denial | Public legacy stub, not production RPC host |
| Seven actual extension UI mounts | Not executed | Their locally linked entry now points to candidate dist; import inventory alone is not bundled UI or runtime proof |
| Three handwritten artifact peers and generated stored artifacts | Not executed | Dedicated child remains required; no builtin HTML, generator or stored HTML edited |
| Component capabilities, loader/projection, token/method policy | Not repaired by this source slice | Strict compatibility utility cannot prevent current component pre-capability mounting |

The baseline entry remains in untouched `minion_hub/node_modules/@nikolasp98/plugin-ui-bridge/dist/index.js`, SHA-256 `d92bb9daff3f6e56205c41d6aa6e645ec1d2a47e82aa074329d5905dde728a5c`, verified before and after the package build and pinned in the baseline contract test. Candidate `minion/packages/plugin-ui-bridge/dist/index.js` SHA-256 is `4f28fc96e03aefe77d29c21aa25d12b8fc10e43db399526e51796553ffb3a768`. No Hub installation, lock or manifest was changed. The test's baseline hash must be deliberately reselected during a later installed-package adoption; it is not a registry freshness assertion.

Owned-site TODOs point to this matrix and `proposals/2026-09-08-platform-qc-remediation.md`, section “Plugin consumer gates beyond the14-04 foundation”. Remaining timeout/backpressure, raw RPC error projection, token/method authority, component gating, artifact peers/generator, loader projection and browser/release gates keep SDK-01/02 open. In-flight duplicate suppression is not durable request replay protection or mutation idempotency.

| Frozen source/test | SHA-256 |
|---|---|
| `minion/packages/plugin-ui-bridge/src/index.ts` | `020d8c8ede87f547dab7d462ff58b3df2aeb33bf1171d353d72b3c5ffdaa4b3e` |
| `minion/packages/plugin-ui-bridge/src/index.test.ts` | `d66bc599876347d75f0e2e6581a7056e3b2143e3f0b66c9392a3fc3f4ce00c4e` |
| `minion/packages/plugin-ui-bridge/vitest.contract.config.ts` | `c054ced414e3198efec4f2975b95de18d2ce2bec6c6f5eee82305d684641d5d7` |
| `minion_hub/src/lib/plugins/bridge-protocol.ts` | `0c34a52b74ca0d194411dd630d31cf1b80218cec9a3ebfd20629eb4672d04596` |
| `minion_hub/src/lib/plugins/bridge-protocol.contract.test.ts` | `7b4f021da5b2dfa0487682619bac4d8a6968e7ec33bd0b6f0958b73a5b6d3d90` |
| `minion_hub/src/lib/plugins/bridge-host.test.ts` | `a2d50ce01068e092b4a6e5884b7e7e49b67fc7961478a9924f1dfaaf267fc850` |
| `minion_hub/src/lib/plugins/compat.ts` | `935a3ce25df11929c2e04de8a4b4a45fe6a724f5dd9ee841cd0a6788cf44f290` |
| `minion_hub/src/lib/plugins/compat.test.ts` | `e3374a924f834d914f59e95846acde78d182b12426f36d35cca4e72bcc937781` |


## Request identity amendment — successor lifetime matrix, 2026-09-09

Exact admission and execution receipt: appended section in `14-04-SUMMARY.md`; admitted plan SHA `f8dffd9e17761fbe7af177dd26b3e13ae2d6387e1e31e996482697f99677d444`.

| Peer/case | Observed result and boundary |
|---|---|
| Previous source; same opaque child/parent windows, frozen clock, dispose A while host work remains, construct B | RED: A's deferred response resolves B with old payload; actual classes, no replacement correlation logic |
| New source and new emitted candidate; identical successor scenario | Both GREEN: two distinct requests forward; stale A reply leaves B pending; B's reply alone resolves B |
| Native randomness absent or throws | Local fixed error; no pending entry or request post, no native cause or fallback; later successful native generation can retry |
| Supported hello and valid first RPC | Exactly 16 native bytes allocated lazily, correct Crypto receiver; subsequent calls reuse namespace and increment sequence |
| Final safe integer sequence followed by more calls | Final sequence correlates; further calls reject and never wrap or post |
| Dispose during entropy generation | Disposed rejection, no pending entry, no request post, listener removed |
| Hub installed baseline | Bytes unchanged; prior source/origin weakness remains explicit expected vulnerability; not approved deployment |
| Persisted pageshow, actual BFCache, generated builtin bridge | Fresh-lifetime policy selected by root for later 14-07; no implementation/browser claim from these fixtures |

After identities: source `7bfe17c603ff5e461f5cc2dfbe8a6fb4c0d08efc2eca4d838f33116bb6af0676`, package tests `fe9e12d8126e884ef2ffe056ac445ba7289dfe7ad5028931627b1f58fe4bfe3e`, Hub real-peer tests `c0c8e9cb7693631eee14278fbb6abb1cce098af501d53a638a280a6e48a93266`, emitted candidate JS `d0d9a106ee9a9abfa7c77b24603158f9e28a5c1773430f12f08430bbc3585b82`. Existing version remains 0.4.0; candidate identity is its bytes. Old candidate and installed baseline dist/manifest copies survive at `/tmp/minion-plugin-bridge-before-identity-yr2fkb5z/` with `sha256.json`. Installed Hub JS remains `d92bb9daff3f6e56205c41d6aa6e645ec1d2a47e82aa074329d5905dde728a5c`.

Validation: 30 package cases, package typecheck/build and 53 Hub peer/host/compat cases passed. Root independent review and serialized full Hub check are pending. Source freeze covers only the three reopened files; all other preceding frozen source hashes are unchanged. Package publication, installed adoption, native browser compatibility and actual consumer mounting remain independent gates.

## Root correction and independent final identity acceptance

Independent review found a synthetic reentrant entropy hook could consume the last safe sequence before the outer call incremented it. This is a hook-boundary regression, not a demonstrated real-browser exploit. Root added an actual nested-call fixture: before repair its outer result was `resolved` instead of `RPC sequence exhausted` (one focused failure, 30 unselected cases). A second safety check immediately before increment repairs it without changing public API or transport authority.

Final package suite: 31/31, typecheck and build pass. Independent verification repeats 31 package + 53 Hub cases (84 total) and typecheck, and closes finding ID14-04-IDENTITY-1. Logs `/tmp/minion-14-04-root-final/` and `/tmp/minion-14-04-identity-corrected-independent-*.log`. Prior candidate/finding receipts remain retained.

Final source `src/index.ts`: `cd8380839105f35ee996a5d6e893f87a3dd676616b4c2be9c827f55b150e4862`; tests: `f1a52af6d511200f5862bcea634e5a50c8d3fe37587e141d04a3e16bcd332e90`; emitted entry: `4f7bd0418fdf85d8a3206cab1c9f3db767de7dc5745a93fbb73b6ab110a098d6`. Hub contract remains `c0c8e9cb7693631eee14278fbb6abb1cce098af501d53a638a280a6e48a93266`; other foundation sources and installed Hub baseline are unchanged. Root selects this entry for subsequent 14-07 generation. Aggregate Hub validation will be scheduled with that consumer change; prior full-check receipts retain their original snapshots.
