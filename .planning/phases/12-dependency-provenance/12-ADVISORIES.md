# 12-01 dependency advisory and compatibility record

Status: 2026-09-11 — the bounded Hub candidate was re-resolved in a private snapshot of Hub `origin/master` 1df0a921 (the 2026-09-09 candidate lock could not be replayed because master moved: @event-calendar/core added, happy-dom 15→20.11.6, svelte/svelte-check bumped, vitest.config.ts gained `resolve.conditions`). Fixtures red on master / green on the candidate in Node and native Chromium; `bun run check` and full default-heap `bun run build` results are in the 2026-09-11 section below. Real checkout admission (commit/PR/merge) is still pending and DEP-01 remains open across the platform. Advisory inventory is a package/version match, not proof that every listed issue is reachable or exploitable.

## Platform inventory

Source: root-owned 13-lock scan at 2026-09-09T05:48:10.187Z. Container image/package SBOMs, bundled plugin runtimes and Shells without a separate supplied lock are not qualified by this scan. Deployed images differ from checkout locks.

| Surface lock | SHA-256 | Initial advisory records | Review disposition |
|---|---|---:|---|
| pnpm-lock.yaml | 1cb7ee1c7feee5b593db8ddda02c0eabc7128d668c660bfcbc8b043a339e1008 | 69 | Inventoried; importer/runtime qualification and exact child plan remain pending |
| minion/pnpm-lock.yaml | f635c2aa60509f3f0bd4e05bd2621391d2f684cec1e37cc8c9defd82b6b6c1e1 | 139 | Inventoried; importer/runtime qualification and exact child plan remain pending |
| minion_hub/bun.lock | 94171a4b10056fe4bfc6243fa78bbac6d4676d9bd17d0083a358b19e9e873df8 | 36 | Bounded candidate below |
| minion_site/bun.lock | 3ab2346b77a3e27b2645f8d60a971666f1f110264c5d995492dc7cbe93f528a7 | 76 | Inventoried; importer/runtime qualification and exact child plan remain pending |
| paperclip-minion/pnpm-lock.yaml | 1ecd6077bf2360befb7dbc559658b1ad58e098ddc6b257435311b1809ca30c4a | 163 | Inventoried; importer/runtime qualification and exact child plan remain pending |
| pixel-agents/package-lock.json | 4bd5279f7863967f75490277bacbf9b4f849dfd3d9d24263e2791cf2cd1f44f3 | 11 | Inventoried; importer/runtime qualification and exact child plan remain pending |
| drone/pnpm-lock.yaml | 7f7eed37ee9d1963d2aae08a288dcf0af9501914682c3daf745ce3592a2737c1 | 7 | Inventoried; importer/runtime qualification and exact child plan remain pending |
| langgraph-server/package-lock.json | 2d649070af3a571e8b61a2fef30d64ca9a9f554ab86c841194ec5194cc59458d | 49 | Inventoried; importer/runtime qualification and exact child plan remain pending |
| minion_base/bun.lock | 7306c620392956e7d44eb4066f3b5f9427ea49bb43541c1b420bfbcc5cfca6af | 1 | Inventoried; importer/runtime qualification and exact child plan remain pending |
| minion_factory/runner/package-lock.json | d7ade2cccd7be266c32310df1ab93fd4f322467540b920a8f2cdfe6a51f407d4 | 2 | Inventoried; importer/runtime qualification and exact child plan remain pending |
| minion_factory/tool-host/package-lock.json | 6e7f989499339d2aaece0606ae2fcdeb0efa62a3929dd80c4531012ae0f62c4f | 5 | Inventoried; importer/runtime qualification and exact child plan remain pending |
| minion_factory/broker/package-lock.json | 74dd8261f93ad2a8f2db2308b9fc2b0b92645360745a06140c2a7a0a2ca9f0e2 | 5 | Inventoried; importer/runtime qualification and exact child plan remain pending |
| minion_factory/orchestrator/package-lock.json | 4ed60e09ece2f60fe5a95fc655822d9c97dbcae38a77e6c8d5cd1265a000806a | 0 | Inventoried; importer/runtime qualification and exact child plan remain pending |

## Bounded Hub family selection

| Family | Baseline → candidate | Reachability and evidence |
|---|---|---|
| SvelteKit | 2.69.2 → 2.70.2 | HTTP content negotiation; malformed Accept fixture runs in a child with a 2.5s cap. [Maintainer advisory](https://github.com/sveltejs/kit/security/advisories/GHSA-29g2-3rmr-qm68) identifies 2.70.2 as patched. |
| Tiptap | 3.27.3 → coherent 3.30.5 family | NoteEditor uses core/starter/image/highlight/Markdown/drag-handle. [Prototype attributes](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-cp6q-959q-f8rh) fixed at 3.30.4; [Markdown CPU](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-j95f-988m-3j2f) fixed at 3.30.5. Public helper exposure tested; app-specific untrusted dynamic attribute flow is not established. |
| Editor peer contracts | collaboration 3.30.5, y-tiptap 3.0.7; model 1.25.11, view 1.41.9 | Drag-handle requires matching collaboration and y-tiptap ^3.0.7; pm requires model ^1.25.11/view ^1.41.9. Preserve exact coherent peer versions via overrides, without new unused direct declarations. |
| DOMPurify | 3.4.11 → 3.4.13 including transitive copies | Active plain sanitizers in Chat/Brains/AgentFiles. [Detached-hook advisory](https://github.com/cure53/DOMPurify/security/advisories/GHSA-55q2-fjhq-7xh7) fixed at 3.4.13; current app callers do not use the vulnerable IN_PLACE hooks. Real Chromium fixture tests both ordinary call and hook regression. |
| xmldom | 0.8.13 → 0.8.15 override | xml-crypto → finance/emission/sign.ts. [Entity serialization advisory](https://github.com/xmldom/xmldom/security/advisories/GHSA-6gmq-8vp8-gcm6) plus nine other supplied advisory matches; current candidate bulk scan excludes this version. Test actual signXml/verify/tamper plus hostile entity serialization. SUNAT algorithm unchanged. |
| Vitest | 4.1.10 → 4.1.11 family | Development/test runtime. [Mock redirect traversal advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9). No exposed Vitest browser server or exploit is asserted. |

Primary pages refreshed 2026-09-09. Registry candidate snapshot comes from hub-candidates.json; the selected releases are compatible patched families, not claims that they are the latest releases.

## Candidate residual advisory records

Registry bulk query at 2026-09-09T06:07:23.308Z. These packages were deliberately not upgraded by this bounded family patch. Parent chains below are immediate lock edges, not full reachability proofs. A child plan must inspect each actual importer and build/runtime exposure before changing it.

| Package/version | Advisory | Immediate parents | Disposition |
|---|---|---|---|
| baseline-browser-mapping 2.10.43 | [moderate: baseline-browser-mapping process termination on invalid input causes denial of service ](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) | browserslist | Unresolved: requires an exact follow-up family plan and reachability review |
| brace-expansion 5.0.7 | [high: brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash ](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | minimatch | Unresolved: requires an exact follow-up family plan and reachability review |
| brace-expansion 5.0.7 | [high: brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation ](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | minimatch | Unresolved: requires an exact follow-up family plan and reachability review |
| browserslist 4.28.6 | [high: Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM ](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) | @babel/helper-compilation-targets, update-browserslist-db | Unresolved: requires an exact follow-up family plan and reachability review |
| browserslist 4.28.6 | [high: Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) ](https://github.com/advisories/GHSA-73wf-gq98-2v4g) | @babel/helper-compilation-targets, update-browserslist-db | Unresolved: requires an exact follow-up family plan and reachability review |
| cookie 0.6.0 | [low: cookie accepts cookie name, path, and domain with out of bounds characters ](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) | @supabase/ssr, @sveltejs/kit | Unresolved: requires an exact follow-up family plan and reachability review |
| deepmerge-ts 5.1.0 | [high: DeepmergeTS has stack exhaustion when merging recursive object graphs ](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | @inlang/sdk, @inlang/recommend-ninja/@inlang/sdk, @inlang/recommend-sherlock/@inlang/sdk | Unresolved: requires an exact follow-up family plan and reachability review |
| fflate 0.4.8 | [moderate: fflate unzipSync can enter an infinite loop when parsing malformed ZIP64 archives ](https://github.com/advisories/GHSA-px8p-9vwx-vf98) | posthog-js | Observed PostHog consumers use gzipSync for requests/replay; no unzipSync call was found in its lib/src. Finance unzipSync resolves the separate direct 0.8.3 copy. The vulnerable nested package remains present; full bundled/runtime qualification and a child plan remain open. |
| happy-dom 15.11.7 | [critical: Happy DOM: VM Context Escape can lead to Remote Code Execution ](https://github.com/advisories/GHSA-37j7-fg3j-429f) | vitest | Dev-only; major upgrade needs its own DOM compatibility slice; security browser fixture uses real Chromium |
| happy-dom 15.11.7 | [high: Happy DOM's fetch credentials include uses page-origin cookies instead of target-origin cookies ](https://github.com/advisories/GHSA-w4gp-fjgq-3q4g) | vitest | Dev-only; major upgrade needs its own DOM compatibility slice; security browser fixture uses real Chromium |
| happy-dom 15.11.7 | [high: Happy DOM ECMAScriptModuleCompiler: unsanitized export names are interpolated as executable code ](https://github.com/advisories/GHSA-6q6h-j7hj-3r64) | vitest | Dev-only; major upgrade needs its own DOM compatibility slice; security browser fixture uses real Chromium |
| js-yaml 4.3.0 | [high: JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported ](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | @inlang/recommend-ninja | Unresolved: requires an exact follow-up family plan and reachability review |
| js-yaml 4.3.0 | [high: js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources ](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | @inlang/recommend-ninja | Unresolved: requires an exact follow-up family plan and reachability review |
| nanoid 3.3.15 | [high: nanoid: non-secure generators can loop indefinitely with negative size ](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) | postcss | Unresolved: requires an exact follow-up family plan and reachability review |
| nanoid 3.3.15 | [high: nanoid: custom generators can loop indefinitely when size is zero ](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | postcss | Unresolved: requires an exact follow-up family plan and reachability review |
| postcss 8.5.16 | [moderate: PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset ](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | vite | Unresolved: requires an exact follow-up family plan and reachability review |
| postcss 8.5.16 | [high: PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure ](https://github.com/advisories/GHSA-r28c-9q8g-f849) | vite | Unresolved: requires an exact follow-up family plan and reachability review |
| solid-js 1.6.12 | [high: Solid Lacks Escaping of HTML in JSX Fragments allows for Cross-Site Scripting (XSS) ](https://github.com/advisories/GHSA-3qxh-p7jc-5xh6) | @inlang/sdk, @inlang/recommend-ninja/@inlang/sdk, @inlang/recommend-sherlock/@inlang/sdk | Unresolved: requires an exact follow-up family plan and reachability review |
| tar 7.5.19 | [high: node-tar: Uncontrolled recursion in mapHas/filesFilter allows uncatchable stack-overflow DoS via crafted long-path tar with member selection ](https://github.com/advisories/GHSA-r292-9mhp-454m) | @mapbox/node-pre-gyp | Unresolved: requires an exact follow-up family plan and reachability review |

## Lock and installation controls

Original Hub manifest SHA-256 80452bed131623a7e92dbdb1638922dfb9814eb96681b0bfaa4ddc99796fd1ea; lock 94171a4b10056fe4bfc6243fa78bbac6d4676d9bd17d0083a358b19e9e873df8. Candidate manifest c219b672919ba9a2551f8f149af419c9d4d96437f7862b662dfd52ac7d7d0925; candidate lock f58b2806a860136fa4158c9158d057ad9afea4cca0207989f355177f627a167d. 44 package records differ semantically, restricted to these admitted families. No unrelated version update.

Bun initially stripped four existing local tarball SHA512 fields during re-resolution. Their bytes were hashed and matched the original records, which were restored; a frozen install accepted the preserved lock. The archives themselves remain unchanged. No registry signature/provenance attestation verification is implied by integrity hash preservation.

The isolated source copy excludes private environment files, git, data, node_modules and build output. Its clean install used --frozen-lockfile --ignore-scripts. Two empty PUBLIC_POSTHOG variables are synthetic build bindings, required for SvelteKit static exports; no real analytics key or private environment is used. Build subprocess environment is allowlisted.

## Scoped verification state

Baseline real-engine fixture: 4/5 grouped tests fail; candidate 5/5 pass with MINION_DEPENDENCY_BROWSER=1, including 4 browser assertions. Accept and Markdown child processes have 2.5s hard timeouts to bound the CPU fixture. Baseline malformed entity serialization failed to reject. Native Chromium reproduced baseline prototype inheritance and detached subtree defects; candidate rejects both. An earlier happy-dom-only fixture was invalid evidence because the sanitizer rejected its DOM root; that approach was replaced, not counted as a library failure.

Runtime fixture path: minion_hub/tests/dependencies/security-compatibility.test.ts. Native execution requires exclusive Browser Harness ownership, MINION_DEPENDENCY_BROWSER=1 and a unique BU_NAME. Without the opt-in, the browser case is skipped and native qualification must remain pending. The reviewed Vitest include amendment makes the durable tests discoverable.

Evidence and clean candidate: /tmp/minion-360-12-01/. Browser screenshots baseline-browser.png and candidate-browser.png contain only synthetic notes. Clean typecheck completed with 0 errors and 0 warnings. Independent source review, successful full packaging, real checkout candidate installation, remaining non-Hub child plans and image/SBOM review are still open. No production package, deployed image or application data changed.

## Full build budget finding

The credential-free clean candidate completed server and client compilation (6,202 and 8,301 modules), then the Vercel adapter exhausted the default Node heap at approximately 4 GB. The build process exited with SIGABRT (-6); this is a failed full-build gate. Compilation is not equivalent to a complete deployment artifact. Log: `/tmp/minion-360-12-01/clean-build.log`. The explicit local `NODE_OPTIONS=--max-old-space-size=8192` retry remained in tracing at the 600-second diagnostic cutoff. SIGTERM was sent at 603 seconds; the owned process required SIGKILL and exited -9 after 621.3 seconds. This is an interrupted diagnostic, not a second OOM or proof that an unbounded build would fail. Observed kernel peak RSS was 6,912,072 KiB. Partial outputs were 52 MiB SvelteKit and 29 MiB Vercel static. A concurrent root-owned typecheck occurred during this retry, so elapsed time is not an isolated performance measurement. Logs, memory samples and result JSON are preserved beside the first build log.

Current source uses plain `vite build` in package.json and `bun run build` in `.github/workflows/ci.yml:155`, without a build heap setting; vercel.json specifies cron jobs only. The typecheck command separately sets a 4 GB heap. A subsequent matched original-lock baseline also exhausted the default heap during packaging. The original dependency set therefore fails on this same source snapshot; identical root causes and full candidate compatibility remain unproven. An 8 GB success would establish compatibility only under that explicit memory setting; it would leave the default build budget unresolved until a bounded build investigation qualifies a fix. The disposable copy contains no .worktrees or nested checkouts.

The final Node fixture adds post-import readiness assertions before hostile parsing. Candidate: 4 passed; baseline: 3 failed, 1 passed, with the native case intentionally skipped in this rerun. Both baseline readiness assertions passed before the 2.5-second parser timeouts, distinguishing them from import/tool failures. A fresh-baseline missing generated Svelte tsconfig caused a separate initial test startup error; explicit `svelte-kit sync` corrected the setup before these results. Native browser logic is unchanged from the inspected 5/5 run. Scoped Prettier check passes.

Root independently reviewed the readiness markers, real signing/tamper fixture and native production-library fixture as coherent. Fixture/config are frozen; source family admission remains held by the build disposition. The default-heap baseline build with the original lock and matching 2,390 source input files completed with exit -6 after 394.4 seconds, with fatal OOM reported around 307.8 seconds and peak child RSS 5,672,356 KiB. No diagnostic cutoff was applied. Partial outputs remained 52 MiB SvelteKit and 29 MiB Vercel static. The next build investigation should first isolate the actual @vercel/nft reachable graph and trace culprit; route splitting or build heap configuration requires its own bounded admission.

Read-only trace review: installed adapter-vercel 6.3.4 calls `nodeFileTrace([entry], { base })` with filesystem-root base. Installed nft defaults processCwd to that base, fileIOConcurrency to 1024, emitGlobs to true, and unbounded trace depth; it caches each analyzed file. Its diagnostic log option reports concrete glob patterns. These source facts identify an instrumentation seam, not the cause of the observed growth or proof of whole-filesystem scanning. A future bounded trace should record actual reachable files, glob patterns and read/resolve categories before selecting a repair. No adapter, nft, build configuration or route split was changed.

Additional importer check: candidate Node resolution from finance/emission/zip.ts selects fflate 0.8.3, while PostHog request.js selects its nested 0.4.8. PostHog lib/src request and replay code uses gzipSync; no unzipSync call was found in that source tree. This narrows the observed sink exposure without treating the package as removed or comprehensively unreachable. Happy-dom is explicitly selected by theme-runtime-contract, sentiment-tooltip and layer test file directives; its remaining advisories concern the test runtime and require the planned compatibility slice.

The heavy-work window was released after the baseline child fully exited. Root now owns manifest/lock coordination for 12-04 reproduction/selection only; no real dependency application was performed. Frozen candidate package-lock patch SHA-256: `8af0d3be77868e3023c2da8d2335ab06eb4f71508bb33288c2736df805b13583`. The independently reviewed fixture/config remain unchanged. Build diagnosis is drafted separately in 12-05-PLAN.md; no configuration or source repair is admitted by that draft.


## 2026-09-11 re-resolution on Hub origin/master 1df0a921

Snapshot: `/home/nikolas/.cache/claude-tmp/12-01-392e01c2/minion_hub` (detached worktree of Hub `origin/master` 1df0a921, private; nothing committed, staged or pushed). Receipts: `/home/nikolas/.cache/claude-tmp/12-01-392e01c2/checks/`.

| Identity | SHA-256 |
|---|---|
| master `package.json` (before) | 12199632c49e0bc9960ec32203357b6bdfe90981f7b4d78ba771c1b9f5e547f6 |
| master `bun.lock` (before) | ebc14272d106ebd486bedc7128fbaa5e775b15f1f675c026c33d5c9507c2963d |
| candidate `package.json` | 9746f3d623c2976793c8f193e47b82f51385728c16ee1b7b103d8e0cb4c21724 |
| candidate `bun.lock` | 363e2ee6b753e9c1d72c8c5417b39b02660c181bdaa5e0e0e668c2e16053a82f |
| candidate `vitest.config.ts` | 113bc156de2ad4375efe006ce57f509a5081bf6447decfc080d63125a4a1f971 |
| `tests/dependencies/security-compatibility.test.ts` (unchanged reviewed fixture) | de630b38a76aa25608e75d4bc5540a50b314cbdc2f973c105fd46cf9db0de6c3 |

Manifest change is identical in intent to the 2026-09-09 candidate: exact `@tiptap/*` 3.30.5 (7 direct), `dompurify` 3.4.13, `@sveltejs/kit` 2.70.2, `vitest` 4.1.11, and `overrides` for `prosemirror-model` 1.25.11, `prosemirror-view` 1.41.9, `@xmldom/xmldom` 0.8.15, `@tiptap/extension-collaboration` 3.30.5, `@tiptap/y-tiptap` 3.0.7, `dompurify` 3.4.13. Sequence: `bun install` (47 packages; Bun kept the locked collaboration 3.27.3 / y-tiptap 3.0.6 despite the new overrides, exactly as on 2026-09-09) → `bun update @tiptap/extension-collaboration @tiptap/y-tiptap` (installs 3.30.5 / 3.0.7) → `bun install --frozen-lockfile` exit 0. The four local `deps/*.tgz` records are byte-unchanged in the lock diff (0 changed lines). Semantic lock diff: **44 package records changed**, all inside the admitted families (SvelteKit 1, Tiptap 32 incl. collaboration/y-tiptap, Vitest 8, DOMPurify 1, xmldom 1, ProseMirror 2); no unrelated version moved. 48 editor/XML peer contracts checked against installed versions, 0 violations (`checks/peer-contracts.txt`). Single installed copy each of dompurify 3.4.13, @xmldom/xmldom 0.8.15, prosemirror-model 1.25.11, prosemirror-view 1.41.9.

Fixture evidence on this master base (unchanged fixture bytes from the 2026-09-09 review; the file was absent on master and is added by this plan; `tests/dependencies/**/*.test.ts` added to the Vitest include so it is discoverable):

| Run | Result | Log |
|---|---|---|
| Baseline Node fixture (master lock) | 3 failed, 1 passed, 1 skipped — Accept and Markdown children ETIMEDOUT at 2.5 s, invalid entity serialization accepted; XML signing passes | `checks/baseline-fixture-node.log` (exit 1) |
| Baseline native Chromium (`MINION_DEPENDENCY_BROWSER=1`, `BU_NAME=minion-12-01-392e01c2`, CDP 127.0.0.1:9223) | 1 failed — browser reports FAIL prototype attributes / FAIL detached sanitizer subtree; paste+Markdown and ordinary sanitizer pass | `checks/baseline-fixture-native.log` (exit 1), `checks/baseline-browser.png` (inspected) |
| Candidate Node fixture | 4 passed, 1 skipped | `checks/candidate-fixture-node.log` (exit 0) |
| Candidate native Chromium (same session) | 5 passed / 5, browser reports 4 PASS | `checks/candidate-fixture-native.log` (exit 0), `checks/candidate-browser.png` (inspected) |
| Prettier on owned files | pass | `checks/prettier.log` (exit 0) |
| `git diff --check` | pass | `checks/git-diff-check.log` (exit 0) |

Native runs used the dedicated headless Chromium on 127.0.0.1:9223 through Browser Harness with a unique `BU_NAME`; exclusive ownership of that shared daemon could not be proven from this session (other agents may attach), so the native result is real but its exclusivity remains an unproven precondition of the plan's gate.

Product gates: `bun run check` (svelte-check, `env -i` + synthetic empty `PUBLIC_POSTHOG_KEY`/`PUBLIC_POSTHOG_HOST`): **0 errors, 0 warnings**, exit 0 (`checks/candidate-check.log`). Full default-heap `bun run build` (same env, no `NODE_OPTIONS`, plain `vite build` + adapter-vercel 6.3.4): **exit 0 in 264 s**, client 8,438 / server 6,368 modules, `✔ done`, `.vercel/output` 99 MiB (config.json, functions, static), sampled peak process-tree RSS 2,807,664 KiB (`checks/candidate-build.log`). Without the two synthetic bindings both gates refuse on `src/hooks.client.ts` importing them from `$env/static/public` (`checks/candidate-check-noenv.log` exit 1 with 2 errors; `checks/candidate-build-noenv.log` exit 1, MISSING_EXPORT) — a harness precondition, not a library incompatibility; no real key or private env was used. The build log also shows `PostHogFetchNetworkError` noise from `@inlang/paraglide-js`'s bundled posthog-node (already silenced in vite.config.ts, not introduced here). This is the first default-heap full-build pass recorded for the candidate: the 2026-09-09 OOM did not reproduce on this master base (12-02 also built master 1df0a921 at default heap), so the earlier packaging-OOM finding remains an unexplained environmental/base difference rather than a candidate defect.

Residual advisory notes relative to this base: the three `happy-dom 15.11.7` rows above came from the 2026-09-09 dirty worktree lock; master resolves happy-dom 20.11.6, so those rows do not describe this candidate. The remaining residual rows were not re-scanned on 2026-09-11 (registry advisory queries are external network calls outside the package-install allowance of this run); their disposition stands as recorded.

Coordination: Hub PR #256 (12-02, open, `feat/dep-provenance-12-02`) edits the same `package.json`/`bun.lock`/`vitest.config.ts`. A merge simulation (`checks/pr256-merge-sim.log`) shows only adjacent-line conflicts: in `package.json` the `d3-scale`/`d3-shape` removals sit next to the `dompurify` bump (resolve: drop the d3 lines, keep `"dompurify": "3.4.13"`); in `vitest.config.ts` both add the identical include entry and #256 adds an `exclude` block (keep both). `bun.lock` must be re-resolved by whichever lands second (`bun install`, then `bun update @tiptap/extension-collaboration @tiptap/y-tiptap` if the override does not take, then `--frozen-lockfile`); root owns that lock sequencing.
