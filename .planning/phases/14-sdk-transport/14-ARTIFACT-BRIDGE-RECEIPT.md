# Artifact raw-bridge contract receipt

14-07 Task1 only, 2026-09-09. Exact admitted plan SHA-256 `bb1259c322021b973d957a515d74cdbc7b6b2026e33fd81366903fbc6242a7e8`. No HTML, component, prompt, test, generated content, database or browser was changed. Root bridge-region/policy selection is required before Tasks2/3.

## Recommended minimum

Repair the three actual local peer scripts, define a protected inline bridge region with a small render/error adapter outside it, and update the pure prompt construction/tests to preserve that region. Keep `validateBundle`'s existing acceptance API unchanged in this slice and label its shallow checks accurately. Enforcing arbitrary model output requires a separate builder/runtime policy; stored artifacts require a later explicit inventory/migration decision. Neither belongs in a bulk rewrite here.

No new package or external JavaScript dependency is needed for these self-contained HTML files. The region is identical, reviewed local source embedded into each builtin. Equality tests prevent local drift; equality is **not** proof that arbitrary generated HTML lacks additional unsafe scripts.

## Frozen before-images

Hub HEAD `a25528b603dfe25f7ea9c0900d271060e5394f35`, branch `feat/level-2026-07-30`. Each file has exactly one literal inline `<script>...</script>`. Script-byte hashes below use the complete UTF-8 text between those tags, including leading/trailing whitespace, without normalization.

| Builtin | Complete HTML SHA-256 | Inline script bytes / SHA-256 |
|---|---|---|
| `overview/index.html` | `9be70d710752d84299a0f6e63bc20b1fa22c2596bd0d3dec0f23a96bb88b4e00` | 2883 / `3cb65ca6c0921d475d772efd1a3367d0877c05ee2a14f702b5649cf5b5dedac1` |
| `triage/index.html` | `f1b79dffcec387168d31606613a212919fb3bc28310b19f363b3b2297dc4330e` | 3504 / `0baa71535e8311afd544db5bcc305f1029108a92ff3ea101cb75b990eccd008b` |
| `artifact-builder/index.html` | `60582d79edff9d53af8fcff0a181d14959dec74289ee4453b128224146d484de` | 3317 / `47de91a1f0679648d4b0faa748109a5ad51828808e918ac162af1c8226369be1` |

| Other inspected source | SHA-256 |
|---|---|
| `minion_hub/src/lib/components/artifacts/ArtifactHost.svelte` | `e5fc0325f443e2fcc69d73d00f787aed7df1b6fa33fe7e006bd971e31fb9fabe` |
| `minion_hub/src/lib/server/artifacts/builder-prompt.ts` | `080c620c47caa2a4b7f62996c31bb979120465c106b3366e526480c7e54b6925` |
| `minion_hub/src/lib/server/artifacts/builder-prompt.test.ts` | `2a7e8721f7eedcc82508449740e351065a776f426c7b604a688bfa751dbaa701` |
| `minion_hub/src/lib/server/artifacts/builder.ts` | `083ae5bf6cf06ce98004f799cb855e4af4a8798c48543af1cf53842c57f2280b` |
| `minion_hub/src/lib/plugins/bridge-protocol.ts` | `0c34a52b74ca0d194411dd630d31cf1b80218cec9a3ebfd20629eb4672d04596` |

`bridge-protocol.ts` is concurrent14-04 foundation source, not deployed host evidence; its independent review may change those bytes before14-07 execution. Re-freeze the admitted host source before pairing scripts.

## Actual bodies and consumers

- All three read `hostOrigin` from URL hash without validating it as an exact origin. A truthy `*` is passed to parent.postMessage; inbound matching currently still compares to literal `*`. Missing origin renders an error, but malformed nonempty origin can throw at initial post.
- Overview lines53-64, triage61-72 and artifact-builder64-75 each duplicate applyTokens and a pending-object RPC helper. Each posts `plugin:ready` version1. Each inbound handler checks origin only, then branches on type without field/version validation (`overview:92`, `triage:116`, `artifact-builder:118`). All match pending IDs through ordinary-object property lookup; prototype keys are not distinguished from issued IDs.
- Every accepted hello calls `hub.artifact.context.get` again, even when a context request is pending or has completed. Repeated supported hello therefore creates extra fetch/render work. None handles host:theme-change independently or registers explicit pagehide/disposal cleanup.
- Overview render uses agentName/role/description/status/stats/trigger; triage render uses `context.data.counts/recent`, escapes category/summary and derives relative time; artifact-builder render uses vars for builtCount/recent, escapes titles/metadata and derives relative time. These distinct render adapters should remain distinct.
- `ArtifactHost.svelte:55-64` allows only `hub.artifact.context.get` and obtains context from the Hub API; its mount at75 uses sandboxed true and empty gatewayUrl/authToken. Both iframe branches set `sandbox="allow-scripts"`. The parent expects child source=target WindowProxy and origin=null; the child must expect source=parent and the actual ordinary parent origin. These are different ingress directions.
- `builder.ts:8` imports the real overview HTML as raw reference. Both generation and regeneration pass it into the pure prompt helpers. `builder-prompt.ts:64` says copy the script verbatim while allowing render edits inside that same script. `validateBundle:11-19` only checks superficial HTML/script/context-string presence. Existing tests intentionally accept a minimal script containing the context call; none proves host identity validation or model adherence.

No checked-in peer imports `@nikolasp98/plugin-ui-bridge`; fixing that package cannot update these scripts or already stored generated HTML.

## Proposed region and adapter contract

Use one explicit comment-delimited bridge region **inside** the existing inline script, e.g. `MINION_ARTIFACT_BRIDGE_V1_START` / `MINION_ARTIFACT_BRIDGE_V1_END`. Region bytes define a self-contained `createArtifactBridge` function accepting narrowly typed local callbacks for context rendering and failure display. It owns origin parsing, peer validation, ready/hello state, pending correlation, message listener and disposal. The existing render/fail/esc/relTime functions and a single initialization call remain outside the protected region. Callback names and marker spelling are proposed implementation conventions for root selection, not new wire protocol fields.

All three builtins receive exactly the same region bytes; no external script fetch, import map, CDN or package resolver is added. Preserve complete render function bodies and existing markup/style bytes except unavoidable movement to put adapters outside the protected region. Any render bug, XSS/data-shape sanitization change or theme redesign discovered during fixtures requires a separate exact child; do not quietly turn this bridge slice into full HTML security repair.

Prompt construction should say: preserve the delimited bridge region byte-for-byte; customize render helpers/adapter wiring and permitted markup/styles outside it. Tests load the actual updated overview HTML and verify that generation/regeneration/repair prompts contain that exact region and still include the requested render customization. New tests compare all three local region byte strings. No test may replace the actual script under test with a manually copied helper.

## Selected behavior recommended for root

| Input / lifecycle | Recommended behavior |
|---|---|
| Exact nonopaque HTTP(S) host origin hint | Accept only when parsed origin equals the supplied value; pin parent source and exact origin together |
| Missing, malformed, wildcard, opaque/null or URL-with-path hint | Fail closed with local generic loading error; no ready/RPC posted |
| Parent hello omits version | Legacy v1; accept after required hello fields validate |
| Numeric1 versus explicit undefined/null/string/nonfinite/unsupported version | Numeric1 only; reject all explicit invalid/unsupported values |
| Valid hello | Apply validated theme/tokens; start exactly one context request for this bridge lifetime |
| Repeated supported hello | May apply latest valid theme/tokens; do not issue a second context request or replay a mutation |
| Valid host:theme-change | Apply validated theme/tokens without requesting context again |
| Host:rpc-response | Require issued nonempty string ID, boolean ok and typed optional error fields before deleting/settling pending entry |
| Unknown/prototype ID, wrong source/origin, null/array/malformed frame | Ignore without render, pending mutation or new request |
| Context success/error/empty | Preserve actual renderer semantics; bridge failures use a generic failure display rather than copying raw upstream error text into DOM |
| Synchronous post failure | Remove pending entry, settle once and render local failure without an unhandled rejection |
| Teardown/pagehide | Remove listener, reject/clear pending entries and suppress later render/error callbacks through a disposed fence |
| Restored page from browser back-forward cache | Root should either admit explicit pageshow restoration with a fresh bridge lifetime and noncolliding request IDs, or retain a named unsupported-restoration gate. Do not claim full navigation compatibility from pagehide alone |

Recommend explicit fresh-lifetime restoration for persisted pageshow if it can fit the protected region without changing ArtifactHost; otherwise retain it as a bounded native-lifecycle child. This is a real policy decision, since a permanently disposed restored document would otherwise remain inert. No global RPC timeout is selected; pending work without a response remains until teardown and requires the separate timeout/backpressure policy already recorded under14-04.

The wire frames stay unchanged. Outbound only uses plugin:ready1 and plugin:rpc-request for the allowlisted context method. There is no new global browser authority, method capability or credential delivery. Host authorization still belongs to ArtifactHost/API, not to this local helper.

## Meaningful fixture selection

The admitted source test path is `src/lib/artifacts/builtin/bridge.contract.test.ts`. Load each actual HTML file, extract its actual scripts, and execute only these checked-in trusted scripts in a controlled DOM/VM test with synthetic parent/child objects, queued structured-clone messages and the real reviewed Hub HostBridge. No production builder, secrets, database or network function may be imported. The VM is a fixture mechanism, not a claimed hostile-code sandbox.

Use minimal DOM nodes sufficient for the three unchanged render adapters and capture text/HTML/visibility/style operations. Tests must prove real rendering after accepted context and zero context requests/render changes after wrong-source, wrong-origin, invalid-hint or malformed/version frames. Assert repeated hello produces one request, wrong/prototype/duplicate response IDs cannot resolve unrelated work, failure cleanup leaves no pending work, and disposal prevents late rendering. Pair each peer with actual sandboxed HostBridge and verify source=null-origin direction explicitly. An empty/null context may reveal pre-existing renderer assumptions; retain that failing evidence and request a render-specific amendment rather than mocking render away.

Native fixtures later copy the three exact HTML files into a root-selected temporary output and use the actual host mounting helper. Browser admission remains separate: only an isolated loopback fixture and uniquely owned browser-harness session, no full Hub or application credentials. Native test must verify WindowProxy and origin=null, queued messages across removal/navigation, both supported handshake forms, and all three visual outcome states. If back-forward restoration is selected, test persisted pagehide/pageshow using real browser behavior; synthetic dispatch alone does not prove BFCache behavior.

## Outside-owner gates and smallest follow-up

1. **Generated-output enforcement:** existing `validateBundle` remains shallow. Recommended separate child owns `builder.ts`, `builder-prompt.ts` and their exact tests to select runtime-owned bridge injection/wrapping or another enforceable construction boundary. Merely strengthening a marker/substring regex cannot constrain additional scripts. No such source change is admitted here.
2. **Stored HTML:** `store.ts` and current database contents are untouched. Later read-only inventory must identify hashes/protocol variants and a user-authorized migration/regeneration policy. Never silently rewrite stored artifacts during local template repair.
3. **Renderer/domain safety:** overview interpolates stats into innerHTML while triage/builder use escaping for selected text. Local bridge shape checks do not validate the full context schema or certify all rendering sinks. Preserve scope; exact renderer/schema review is a separate child.
4. **ArtifactHost lifecycle:** component mounts inside onMount; descriptor changes, data-fetch cancellation and late context reply effects need independent component/browser evidence. The14-04 host disposal fence is useful but not proof of ArtifactHost descriptor reactivity. This child may inspect but not edit it.
5. **Timeouts, browser/installed/deployed adoption:** remain separately gated. Source/prompt success cannot update built or served artifacts automatically.

## Admission recommendation

Root can admit14-07 source Task2 after selecting the protected-region callback contract, duplicate-hello policy and restoration disposition. No upstream shared-client change is needed for the static local artifact context bridge. Keep browser Task3 separately gated, keep generation enforcement and stored migration outside scope, and re-freeze the reviewed14-04 host before running paired tests. No source or UI edits were made during this discovery receipt.

## Follow-up: generate the inline region from the existing package

Read-only feasibility review requested by root. **Prefer generated package reuse; this supersedes the earlier recommendation to maintain a handwritten createArtifactBridge protocol region.** No bundler, generator, source edit, server or browser action was run. Feasibility is based on current source and installed tool declarations; final output size, deterministic bytes, CSP execution and native behavior remain to be measured by admitted tests.

### Existing package is sufficient for the core bridge

The reviewed14-04 `PluginBridge` already supplies the protocol state and guards required here:

- Constructor accepts actual child window, parent window and exact expectedHostOrigin. An opaque child does not need a wildcard host origin: it receives messages from the ordinary Hub parent. Host's explicit sandbox mode still handles the opposite direction's null origin and wildcard outbound delivery.
- `onHello`, `onThemeChange`, `onLocaleChange`, `notifyReady`, `call` and `dispose` cover initialization/context/theme/lifecycle without another frame parser, ready encoder, pending map or response decoder in the artifact code.
- `call` requires supported hello and uses Map correlation; sender clone/post failures remove pending entries. Dispose removes listeners and rejects pending calls. The adapter should suppress rendering after it retires.
- Hello's required gatewayUrl/authToken can remain empty, as actual ArtifactHost already supplies. The adapter must never read/copy/use credentials, create a WebSocket or call fetch; only `bridge.call('hub.artifact.context.get')` is needed. Including package code that defines hello fields does not itself transmit credentials.

Thin adapter responsibilities are limited to validating the hash hint as the selected exact HTTP(S) origin, constructing the bridge, applying already validated theme/token data, registering render/failure callbacks, issuing one context call per lifetime and owning browser lifecycle. Do not inspect raw MessageEvent frames or generate IDs in that adapter. Domain payload validation/render safety remains the renderer/schema child.

Current inputs inspected:

| Input | Identity |
|---|---|
| Gateway package source | `@nikolasp98/plugin-ui-bridge@0.4.0`; `src/index.ts` SHA `020d8c8ede87f547dab7d462ff58b3df2aeb33bf1171d353d72b3c5ffdaa4b3e` |
| Qualified local candidate entry | `minion/packages/plugin-ui-bridge/dist/index.js` SHA `4f28fc96e03aefe77d29c21aa25d12b8fc10e43db399526e51796553ffb3a768` |
| Old Hub installed entry | `minion_hub/node_modules/@nikolasp98/plugin-ui-bridge/dist/index.js` SHA `d92bb9daff3f6e56205c41d6aa6e645ec1d2a47e82aa074329d5905dde728a5c`; known wrong-source acceptance remains |
| Declared installed Hub builder | `vite8.1.3`, manifest SHA `f0999a86a4f852ef04de700f4dc42e43e40408b14bc8ee8a365c7defd3f90be6`; Hub package.json:120 declares ^8.1.3 |
| Available alternative builder | `esbuild0.28.1`; API JS SHA `8331fe1d8b3a07381f33cc425fcfaa94776e263113653f80ec3ba433e9657e73`; native linux-x64 binary SHA `0c6588b092a2c291a72bab90659f3c9e0e25e0fe59c9ac12b4dae4d945e5548c` |

Both bridge entries say0.4.0, so a version string cannot select the safe bytes. Root must re-freeze the candidate after independent14-04 review and require its exact entry/source digest. Never silently resolve the existing Hub installed baseline just because its semver matches. Publication/install remains a separate14-02 gate; checked-in generated HTML may embed approved candidate bytes, but its provenance must explicitly say unpublished local candidate.

### Minimum generator without a new dependency

Prefer the existing declared Vite public `build` API, not an undeclared direct import of its transitive esbuild dependency. Installed `vite/dist/node/index.d.ts:2277-2305` explicitly supports library entry/name/formats including IIFE; `write:false` is available at2188, and `envFile:false` at3728. Its existing local fixture build pattern already imports Vite. Esbuild's installed API also supports bundle/browser/iife/write:false/metafile/treeShaking, but making it a durable direct dependency would require an extra manifest/lock decision. There is no need to do that for this bounded reuse candidate.

Proposed generator configuration: `configFile:false`, `envFile:false`, no SvelteKit/Tailwind/application plugin, a single adapter entry, library IIFE with a stable narrow global name, `write:false`, sourcemaps disabled and fixed target/minifier settings. Alias only the plugin package entry to the root-selected exact candidate path. All runtime dependencies must be bundled; generated output must be one JavaScript chunk, no external imports, dynamic imports, CSS, source-map URL, eval/new Function or network bootstrap. Build only the adapter/package dependency graph and reject unexpected emitted assets/modules. Preserve required license notices. No full Hub build, application config/env or runtime package resolver is needed.

The build script replaces a delimited generated region in each existing HTML file, preserving every byte outside that region except the explicitly reviewed adapter invocation needed to replace old handwritten script wiring. Render/fail/esc/relTime remain editable outside the generated region. Generated bytes must be identical across all three builtins. A check mode rebuilds in memory and fails on drift; write mode edits only the three admitted HTML targets and the provenance receipt. No timestamp, absolute workstation path or nondeterministic data should enter generated bytes.

The recorded provenance should contain input package name/version, approved source and built-entry digests, adapter digest, installed builder/version digest, fixed build configuration digest, emitted region digest and destination region digests. It must distinguish root candidate source, installed Hub baseline and eventual registry/lock adoption. An independent Hub checkout lacking approved candidate bytes should fail regeneration clearly, not download or fall back; release adoption can later make the installed qualified package the normal input under a new receipt.

### Exact scope comparison

| Choice | Additional owned source/build files beyond current14-07 list | Maintenance and qualification |
|---|---|---|
| Handwritten factory in each HTML | No generator files, but another maintained frame parser/validator/ID/pending/disposal implementation | Duplicates the already qualified package; region equality only prevents drift among the three copies |
| Generated package plus thin adapter — recommended | New `minion_hub/src/lib/artifacts/artifact-bridge.ts`; new `minion_hub/scripts/artifacts/build-inline-bridge.mjs`; new `minion_hub/src/lib/artifacts/builtin/bridge.provenance.json` | One protocol owner; adapter owns only artifact context/render lifecycle; generator/check plus provenance replaces hand-maintained inline protocol copies |

Reuse the already owned `src/lib/artifacts/builtin/bridge.contract.test.ts` for generator/adapter/actual-HTML cases rather than adding another test file. Existing owned three HTML files become generated-region destinations, and builder-prompt/tests identify and preserve that region. Existing browser fixture builder should check/generate the same approved region before copying exact HTML into its temporary output. No package source edit, Hub manifest/lock edit, ArtifactHost or serving-route edit is needed for the **core** reuse proposal. Root must amend the plan's exact file list before these three new files are created.

### Required proof before claiming reuse works

1. Execute the admitted generator twice from the same pinned inputs and compare region/output digests; check mode must reject input drift, manually edited region, missing candidate and accidental installed-baseline resolution.
2. Inspect generated chunk module graph/imports and assert no runtime import, external fetch, eval, map request or unapproved module. Do not judge standalone output by source imports alone. Record real output size rather than guessing that a bundle is small.
3. Load the generated region from each actual HTML and pair its actual package-derived bridge with the actual reviewed Hub HostBridge. Retain the source-origin/version/field/correlation/disposal denial fixtures; do not test only adapter mocks. Tests should confirm that the emitted module graph includes the selected candidate entry.
4. The same three native opaque iframe fixtures must prove source/null direction, successful context rendering, one context call on duplicate hello, theme handling and late-result suppression. DOM-rendering adapters remain actual consumer code.
5. Serving remains unchanged: `routes/artifacts/[artifactId]/ui/[...path]/+server.ts:27-36` emits frame-ancestors self for builtins, and adds sandbox allow-scripts for stored HTML. Actual ArtifactHost always uses sandbox allow-scripts. Existing scripts are already inline; the generated IIFE must preserve that model and require no relaxed CSP, eval, additional host capability, credential or external import. Native execution under the exact serving policy still requires proof.

### Package limits that must not be reinvented in the adapter

The package has no per-call cancellation/timeout API; retain the existing separate timeout policy. Its callbacks can surface render errors, so the thin adapter must contain its own render failure and avoid exposing raw upstream error strings without adding a second protocol decoder.

Fresh persisted-pageshow policy remains **unselected** after this feasibility pass, as root requested. A disposed PluginBridge cannot be revived. A new instance resets rpcSeq, and IDs combine that sequence with Date.now; the current API has no caller-selected lifetime namespace or guaranteed cross-instance uniqueness. If root requires strict fresh-lifetime noncollision for BFCache restoration, admit a small package API/ID amendment and corresponding cross-consumer tests, or select another explicit lifecycle policy. Do not intercept/rewrite bridge frames or build a second ID map in the adapter to conceal the missing guarantee. This limit does not prevent core initial-load/ordinary teardown package reuse.

### Recommendation to root

Amend14-07 to the generated package reuse option and the three additional exact files above; retain current consumer/prompt/browser test boundaries. Admit a bounded generation proof against the independently approved14-04 candidate before deciding lifecycle restoration. Keep arbitrary model-output enforcement, stored-artifact migration and full renderer safety separate. No manual replacement protocol is justified by the inspected package API.

## Task 2 execution: compiler graph admission evidence

Execution began under PLAN `557e79106ad72aab33931ce2438e03a814f86a2afe742e848b1617b68554904c`. The exact three baseline HTML files reproduced nine failures: sibling-source hello admitted, repeated hello requested twice, and a context reply rendered after pagehide, for each builtin. Installed Vitest 4.1.10 requires the planned `--maxWorkers=1` command; an initial obsolete `--minWorkers` option was rejected before tests and is not behavioral evidence. Before-images and logs are under the private `/tmp/minion-14-07-_qt9_c62` directory.

The first real Vite build retained `es2020` and rejected its graph before writing generated output. Vite adds four virtual OXC helpers for that target. The module source SHA-256 values below were captured from actual `generateBundle`/`getModuleInfo(id).code`; `\u0000` denotes the actual leading NUL in each virtual module ID, not a literal backslash sequence.

| Actual virtual module ID | Source SHA-256 |
|---|---|
| `\u0000@oxc-project+runtime@0.139.0/helpers/esm/defineProperty.js` | `2bad7c96ee851cf2cfe1320a54fd88dd5f769a7faf8bd92d60c9f2e6d1e381dd` |
| `\u0000@oxc-project+runtime@0.139.0/helpers/esm/toPrimitive.js` | `9660291e71923cb5ff9aaaa1de354515c26e3220cba56ac5d21b806f23875545` |
| `\u0000@oxc-project+runtime@0.139.0/helpers/esm/toPropertyKey.js` | `7f0000acc9c9cf7594b412095be66cdc59066b25458a16fe1434fd00cff478e7` |
| `\u0000@oxc-project+runtime@0.139.0/helpers/esm/typeof.js` | `928bcbbdf74fe24ed7486e7f982c4389c1859886b3ed904ebd2677f22193b57a` |

Exact installed tool inputs: `minion_hub/node_modules/vite/package.json` SHA `f0999a86a4f852ef04de700f4dc42e43e40408b14bc8ee8a365c7defd3f90be6`; `vite/dist/node/index.js` SHA `4892d68c0d1e7a55dd76c10962370136fb49887d7145942c2220d87ce9c9f24b`; `minion_hub/node_modules/rolldown/package.json` SHA `01de4c2d7ebcc0f36c92f41e4ecab383ae7f5dd2e26f8f4b640fc58ca9c8f8e7`; Hub `bun.lock` SHA `94171a4b10056fe4bfc6243fa78bbac6d4676d9bd17d0083a358b19e9e873df8`. The adapter source is transformed by the compiler, so both original source and graph-source hashes belong in final provenance.

At this checkpoint the generator still rejects these helpers. Root must admit exactly these IDs and source digests before adding them to the closed graph. No target increase, transform semantic change, application dependency or basename-only allowlist is proposed. The retained denial log is `graph-denial.log`; no generated region/provenance was written by that failed build.

## Task 2 source candidate freeze

Root admitted the four exact virtual helper IDs/digests in amended PLAN `6aa41475fc338dd17005f4d4b4f2853c9b91cc2a0b9ad341c81211a11f04d102`. Task 2 now generates one protected IIFE from the selected package plus adapter and those compiler helpers. It replaces the three legacy protocol shells, preserves their render/helper bodies and markup/styles, and propagates the exact region through build/regenerate/repair prompt expectations. Task 3 is still unexecuted; no SUMMARY was created.

### Frozen files

| Product/test artifact | SHA-256 |
|---|---|
| `minion_hub/src/lib/artifacts/artifact-bridge.ts` | `db3cfcf0e953b6d41e8f0c339a05aec8fb93d86404dcf2f6485077b156f98ce7` |
| `minion_hub/scripts/artifacts/build-inline-bridge.mjs` | `29384a7476b33b22a4b0e19fbde23d0f26a19f3dd06003f4eb8c35ce45ad5653` |
| `minion_hub/src/lib/artifacts/builtin/bridge.provenance.json` | `e2a4cd445a4a75213c8e80d272a692eae8abbdb9b34bab8e351d19791e4b1ae4` |
| `minion_hub/src/lib/artifacts/builtin/overview/index.html` | `cb11b62bc4c1c28ccfe7ad2708ad0c5147a05a806dae100d1adf1b22a415bde3` |
| `minion_hub/src/lib/artifacts/builtin/triage/index.html` | `af0616b2ec85ac8ac5b9e4a3452fb5c86baf63b3c1c350b44bf0c851b9d9efbd` |
| `minion_hub/src/lib/artifacts/builtin/artifact-builder/index.html` | `e532980456d187eb29be591b4c44482e7903a6b21d7bbb94c6fa5bddc11167d1` |
| `minion_hub/src/lib/artifacts/builtin/bridge.contract.test.ts` | `52ce332e8fd8a2fc615be8c8e55cb1b74d9483b81b25133a8da7296e9bb00f2c` |
| `minion_hub/src/lib/server/artifacts/builder-prompt.ts` | `0fe39e490f72c079ba47b15b14863869835b8c08dc8ddba8def4b80192939098` |
| `minion_hub/src/lib/server/artifacts/builder-prompt.test.ts` | `85279119065fd513f26e80541c9ea37cc450bdf50c3b42f9125dddd09495dd8b` |

The emitted JavaScript SHA is `2bb1a24483965eca5cf91c859d1b385a6aae28a0f4ed1bec5ea3e4d914af9846`. All three inserted regions have SHA `ed2b4919b7df043eabf412d131c38560a313c96b60734d81fec88bfa7a3342f3`, 15,681 UTF-8 bytes including markers and available notices. Complete HTML sizes are overview 19,649 bytes, triage 21,047 bytes and artifact-builder 19,859 bytes. These measurements describe source output size, not a performance benchmark or served/deployed receipt.

### Actual implementation and preservation

The adapter delegates message/source/origin/version/RPC parsing entirely to the package. It accepts one nonempty hash hint with no fallback, projects own `--` tokens without dropping other custom-property families, retains the host's existing binary dark-class signal, and issues one context request per accepted lifetime. It passes context unchanged into each existing renderer. Pagehide clears ownership before disposal; persisted pageshow creates one new lifetime. Both already-delivered response continuations and late old RPC responses are fenced. Final disposal removes document listeners. Startup, entropy, RPC and renderer failures supply only `artifact unavailable` to the existing failure renderer.

The one-time split puts the public `generatedPluginBridge` IIFE outside the renderer closure and its `mount({ render, fail })` call outside the protected region. Subsequent generator writes touch only marked regions and provenance. Runtime graph checking admits exactly six full module IDs with exact helper-source digests. Input/package/tool pins, original and transformed adapter hashes, module hashes, configuration and emitted/region hashes are recorded in provenance, without timestamps or workstation paths. The package input is rechecked against the actual graph, and input files are rehashed after the build before writing.

Generator checks reject unknown helper/modules, changed helper or selected-input digests, the old installed candidate path, assets/maps/imports, missing/multiple/misplaced markers, region/provenance drift, dynamic execution/network bootstrap and case-insensitive closing-script sequences. Check mode builds in memory and never repins output. No regex is presented as a general hostile-code analyzer; the admitted closed source graph and actual peer tests are the behavioral evidence.

Durable tests compare all existing renderer/helper function-body hashes against before-images, permitting only removal of the exact admitted overview TODO when comparing. Outside-script HTML was also compared byte-for-byte against the before-images. Hashes after replacing script contents with the same fixed sentinel are overview `de0fa55148b6768e781562ccc291cb4681cc208fa54e5b183f99a43f70970778`, triage `6f6489a04fed08ccdca2658d53f64047d2451fc91465d0c1f7bd22fc1bec9b46`, artifact-builder `80dd6ae101f17fca09153b78c9cfec39f686de536065fc50399fe6a99969b8e7`. Markup/style bytes did not change.

### Final executed checks

Root admitted `/tmp/minion-14-07-_qt9_c62/vitest.config.mjs`, SHA `a56f99cc14fb2ec3974275e44f603010dbed357a9323501e9934ff49ab238b8b`. It imports the actual Hub base config, sets `envDir: false`, the exact two test includes, one worker, `passWithNoTests: false`, and a private cache directory. Earlier default-config runs passed behavioral assertions but do not independently establish that application env files were disabled. Final acceptance evidence uses the explicit no-env config below.

Commands from `minion_hub`, each with `env -i PATH="$PATH" HOME="$HOME" LANG=C.UTF-8`:

```sh
node node_modules/vitest/vitest.mjs run --config /tmp/minion-14-07-_qt9_c62/vitest.config.mjs
node scripts/artifacts/build-inline-bridge.mjs --check
node node_modules/typescript/bin/tsc --noEmit --allowJs --checkJs --strict --skipLibCheck --module esnext --moduleResolution bundler --target es2022 scripts/artifacts/build-inline-bridge.mjs src/lib/artifacts/artifact-bridge.ts src/lib/artifacts/builtin/bridge.contract.test.ts
bun run lint:design
bun run lint:tokens
```

| Check | Observed result |
|---|---|
| Actual baseline HTML red run | Nine failed behavioral cases; one file; 430 ms |
| Final no-env tests | 106/106 passed: 90 actual-peer/generator cases and 16 pure prompt cases; two files; 1.03 seconds; zero unhandled failures |
| Two real in-memory builds | Identical region and provenance objects; assertions pass |
| Generator `--check` | Passed against all three actual HTML regions and checked-in provenance |
| Scoped strict JS/TS check | Exit 0; library declarations skipped only in this scoped check, not a full Hub acceptance claim |
| `lint:design` | Exit 0; report still lists existing project debt/increases outside these owned files. Not a zero-debt claim |
| `lint:tokens` | Exit 0; zero violations |
| Scoped diff whitespace check | Exit 0 |

Final logs are in the private directory. `final-no-env-tests.log` SHA `c19d3dd50c35ebe83810bf25fb18677a2cd7325d231baddde8cadea0803cbc0d`; `scoped-types.log` is empty on success, SHA `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; `generate-check.log` SHA `06e57409dad6fa9644d150f94a75719e62d78f2da4b4d258cf27b3670c1b33d4`. Final lint outputs are `lint-design-final.log` and `lint-tokens-final.log`.

The actual-script fixtures use structured-clone queued windows and the real Hub `HostBridge`; the controlled VM executes only checked-in trusted scripts, with code-generation disabled and no fetch/process/service bindings. Tests include wrong parent/source/origin, malformed envelopes and fields, genuinely omitted and current protocol version, unsupported version, full renderer inputs, null/empty/error context, duplicate hello/response, unknown/prototype correlation IDs, token updates, posting/entropy failure, same-tick two-lifetime replies, response-continuation retirement and final disposal. They are not a sandbox guarantee for arbitrary HTML or proof of real browser WindowProxy/BFCache behavior.

### Standards review

Package transport reuse replaces the duplicated parsers/pending maps. No dependency, lock, package source/installed entry, host component, serving route, authorization, database/store, or model pipeline was changed. Pure prompt changes preserve the actual reference's protected region while allowing renderer customization outside it; `validateBundle` behavior remains shallow and unchanged. Three generated regions are identical and checks are reproducible from their pinned inputs. Only nine product/test files and this allowed receipt changed; Task 3 builder/README and SUMMARY were not created.

### Spec review and open gates

Task 2's source behavior passes the executed checks, pending root independent review and serialized full Hub check. No browser, application server, network gateway, provider/model, database or stored-artifact operation was executed. Current CSP remains only `frame-ancestors 'self'` for builtins, plus sandbox for stored HTML; it does not enforce network denial.

Exact open-item sites, all pointing to `proposals/2026-09-08-platform-qc-remediation.md` for root integration:

- `artifact-bridge.ts:25`: actual host theme snapshot/identity remains a separate compatibility issue; adapter preserves only current binary signal and own custom properties.
- `artifact-bridge.ts:84`: native opaque iframe crypto and real persisted restoration remain Task 3; synthetic events cannot prove BFCache.
- `overview/index.html:488`: context schema and stats `innerHTML` safety remain a renderer child. Render behavior is preserved, including overview's error on null and other builtins' empty states.
- `builder-prompt.ts:12`: shallow HTML/context-string validation does not enforce code construction or constrain other scripts in model output. Generation/stored adoption remains separate.
- `build-inline-bridge.mjs:20`: helper-specific license provenance remains pending root review before distribution. Exact available `minion/LICENSE` and installed `rolldown/LICENSE` notices are retained in the generated region and pinned as inputs; this is not a claim that the latter establishes every helper's attribution. Root owns independent upstream license verification. No attribution was invented.

Stored artifacts retain their existing bytes and require the previously named inventory/adoption policy. The source adapter does not add request deadlines or solve ArtifactHost descriptor/fetch lifecycle, and the original related package/host TODO gates remain open. Source/prompt success does not qualify deployed HTML or full SDK-01/02.


## Root independent source, attribution and native verification

The final attribution amendment retained the exact OXC runtime shipped MIT notice and credited Babel notice. Root fetched runtime0.139.0 through the browser, verified registry SHA-512 integrity and matched all four helper bodies byte-for-byte against the compiler graph. The shipped README explicitly credits copied @babel/runtime code. Runtime archive SHA8db2efabe4944e1df57b74421876dd8334c538e81b82729a508b383ec8543bd0; retained notices SHA06f999033b552ad451e700f5badb54988d72964e2c68d7ce49361750627cc989. Generated region SHA d7f3548638b8e9a8070fbbe38b213fceb442b997ae34d3503d00448dd43b6346. This corrects the prior helper-attribution gap; it does not certify platform-wide licensing or authorize publication.

Root independently repeated106/106 peer/generator/prompt cases before and after the notice amendment (final1.05s), and generator --check passed. Full current Hub snapshot check passed0errors/0warnings: /tmp/minion-360-check-14-07/snapshot.json SHA f77649f4811e6696322404555e83e71401927e659fbb04b586c5e8b1373de9af,2,422 Hub files plus6 plugin files. The later browser fixture adds test instrumentation only. Parent control code uses actual mountHostBridge/HostBridge with synthetic context, exact plugin entry and copied unmodified HTML. No application, gateway, DB or model was started.

Native Chromium evidence lives in /tmp/minion-14-07-browser-3rist9cx. Six viewport/artifact combinations at390x844 and1440x900 passed loading/render/error checks, generated18 screenshots and had no child horizontal overflow. Root visually inspected representative mobile overview/triage/error and desktop artifact-builder captures. Each real opaque child reports origin null and usable crypto.getRandomValues; parent receives null-origin messages from the expected WindowProxy. Child observer receives exact parent origin/source. Current and repeated hello/theme behavior has one context request per lifetime. Wrong-sibling frames are observed but not forwarded. Unsupported/malformed hello before initial handshake causes no child context request. An omitted legacy version admits one child context request; the deliberately unarmed actual HostBridge correctly refuses to forward it. That last check proves endpoint legacy acceptance, not a completed legacy-host RPC exchange.

All three peers also entered real BFCache: child pagehide and pageshow both recorded persisted:true, and each restoration admitted exactly one new context request. Responses belonging to the retired lifetime did not render; the new response did. Overview additionally displayed distinct stale/current labels, and triage/builder retained loading until the current response. This is actual native navigation evidence for these local peers, not synthetic event dispatch or full ArtifactHost component lifecycle qualification.

Browser-fetched served-byte hashes equal source for all3 HTML files; sizes22,347/23,745/22,557 bytes. Actual response CSP remains frame-ancestors 'self', matching the builtin route. Browser request-block patterns were enabled for inspected targets; child policies were attached after navigation, so no before-first-script confinement claim follows. Closed generated graph and actual unchanged bytes remain the bounded source evidence. Arbitrary generated/stored HTML and existing CSP network policy are unqualified.

Receipts: native-matrix.json, native-authority-bfcache.json, native-bfcache-other-peers.json, served-bytes.json and root-final-inputs.json. Initial fixture builder attempts failed at virtual entry resolution and single-array output handling; corrected to a real temporary entry and actual Vite output normalization. An initial authority test wrongly expected an unarmed host to forward a manually sent legacy hello; it exposed a fixture expectation error, corrected without source changes. Initial synthetic data used wrong count names; corrected fixture values before the18 accepted screenshots. The product renderers remained byte-preserved.

Remaining gates: actual ArtifactHost descriptor/mount/theme authority; generated-output enforcement and stored inventory/adoption; renderer schema/stats interpolation; archive/package installation and deployed/browser matrix. Existing exact TODOs and root proposal preserve these boundaries. Native Task3 local scope passes; SDK-01/02 and the phase remain open.
