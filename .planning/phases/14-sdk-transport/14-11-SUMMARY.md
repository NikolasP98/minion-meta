---
phase: 14-sdk-transport
plan: "11"
status: candidate_artifact_verified_pending_root_consumer_admission
requirements: ["SDK-01", "SDK-02", "DEP-03"]
---

# 14-11 Task 1 — shared package input freeze

Task 1 executed under admitted plan SHA `9f739d9fccd6f6bd8473959d1599350e092561a0ed24f536e9645ef950ec36d1`. Root accepted unpublished local testing while shipped-license/README and immutable production identity gates remain failed. Tasks 2/3 were not executed.

The whole-input manifest is `/tmp/minion-14-11-84XpBnCA/checks/whole-input.json`, SHA `f214dc035ae5007f3643da19aef7e63552b80e1eac1a919cdb2ceb6d495dd0ca`. It identifies the source, compiler program, package resolution, native tools and temporary packaging context as separate manifests. This is a build-input identity; no candidate archive or emitted identity exists yet.

## Preserved bytes and source freeze

The private temporary directory is `/tmp/minion-14-11-84XpBnCA` (mode0700 from mktemp). `before/active/` contains copies of all current shared dist files, package.json and the existing tsconfig.tsbuildinfo:102 files. Their manifest `checks/active-before.json` has SHA `b6f1c35f18567a6146d0c97191bc24aea69772e935ce7a4de7c6e5d0802e737b`. Every copy was compared to its original immediately after preservation and the originals were compared again after all read-only compiler/tool inspection. No active artifact changed.

`before/source/` preserves40 source/configuration/manifest inputs, including every shared src file and current root lock/workspace/package, shared build configuration, CHANGELOG, test configuration and resolved tsconfig package/configuration. The accepted client/test source hashes remain `c0c492d4e03f0a26ae9afd5b9993bd66c82451f7289670cfed411344ac677666` and `de1ddab9590b7e793252b0a61f23d6a165aee1aa1424d753ffd7b6aed77a31ba`.

The installed TypeScript compiler was invoked only with `--listFilesOnly --pretty false --project /home/nikolas/Documents/CODE/MINION/packages/shared/tsconfig.json`; no emission, build or typecheck was claimed. It listed282 actual program files. Their bytes were copied into `before/compiler-inputs/`, preserving logical paths, resolved paths, sizes and SHA-256 in `checks/compiler-inputs.json`. This includes declaration dependencies pulled in by existing tests, rather than guessing the compile closure from imports in client.ts.29 ancestor/package manifests used for resolution are separately hashed. Native compiler runtime files and executable identities are separate from program files.

| Manifest under checks/ | SHA-256 |
|---|---|
| `compiler-inputs.json` | `eb76c4f54cffbb3f965efd5cc0ed396eaaab3c36651c6da73fcb4f7259f0fa0e` |
| `resolution-metadata.json` | `347dc6885d39edd2183cf08cbb9979c0efa19829c7075c46458588a03913da32` |
| `source-before.json` | `ccc2a8cb9af60b71e2d14d37dac30fb23f7a415b46d7ba33df0cd51b4f6a2232` |
| `staging-context.json` | `f85fc1790db1088626150c706d275a07e6a36e5e7a78c0a4d0753a663a446fea` |
| `tools.json` | `d58f445b46dd8bc817489a469ef430ffc19824f9c8f3354ec0310c4295fbf061` |

## Tool identity and isolated staging

Node is `/usr/bin/node` v22.23.2. TypeScript is5.9.3 at the resolved root `node_modules/.bun/typescript@5.9.3/node_modules/typescript` path. `checks/tools.json` records hashes of Node, the compiler launcher/tsc.js/_tsc.js, compiler package metadata and the direct pnpm executable. The PATH pnpm command is a shell wrapper pointing to pnpm11.22.0; it selects10.15.0 from the root packageManager declaration. A clean temporary HOME must not rely on that wrapper bootstrapping its selected version.

The already-installed native executable was found and directly verified as10.15.0 under synthetic HOME:

`/home/nikolas/.local/share/pnpm/.tools/@pnpm+linux-x64/10.15.0_tmp_2225177/node_modules/@pnpm/linux-x64/pnpm`

Its exact executable digest is in tools.json. Future commands should invoke this pinned executable, preserving the plan's native pnpm10.15.0 semantics without invoking the11.22.0 selector. This is an execution-path clarification for root admission, not a new install or tool-version substitution.

Read-only version/list commands used only `PATH=/usr/bin:/bin`, temporary HOME at `tool-home/`, `LANG=C.UTF-8` and `NODE_DISABLE_COMPILE_CACHE=1`. No original HOME/npmrc/environment contents were logged. Root and shared .npmrc files are absent. Exact argv, cwd, sanitized environment and exit status are in `checks/commands.json`, SHA `b93c748aacd0e6efe874bc62c0ed3b79c1789dda28cb60841309549c094a04d9`; stdout/stderr are under logs/. All four commands exited0. The compiler list is input inventory only.

The temporary workspace has unchanged shared and tsconfig package manifest copies, a minimal private root package manifest pinning pnpm10.15.0, and a workspace YAML listing only those two package directories. It has no dependencies installed/linked and no candidate dist yet. Active manifests and locks were not edited. The source package's workspace:* devDependency remains unchanged; its actual packed normalization will be inspected only after Task2 admission.

## Explicit failures and remaining authority

Package/root README/LICENSE/LICENSE.md/NOTICE presence checks are recorded in staging-context.json. Shared README and inspected license/notice paths are absent; no legal text was invented. Shipping provenance and production identity remain failed gates even though root permits local candidate testing. Source has manifest version0.9.0; it is not a new registry release. Root must select this whole-input digest before emission/packing. Full exported runtime/declaration closure and archive paths/digests are not yet available; the input freeze is not their substitute.

Tasks2/3, negative archive/provenance checks, root-owned Hub/Site snapshots, active source adoption, Paperclip/ws qualification, Workforce/plugin independent candidates, publication and deployment remain unperformed. No consumer/source/dependency files were changed. The only authored repository files are this SUMMARY and a Task1 append to the decision packet. Root owns subsequent admission/global/proposal state.

Standards self-review: preserved concurrent work, confined writes to the exact temporary directory and two receipts, no native build/install/network. Spec self-review: complete actual compiler input inventory and native tool resolution are frozen, with copied current artifacts and before/after equality; candidate emission and shipped-content verification correctly remain pending.


## Tasks 2/3 — selected unpublished artifact, 2026-09-09

The native build, one successful native pack retry, export/declaration inspection and negative checks are complete. This is an unpublished local candidate for root-owned isolated consumer qualification. It is not a registry release, active package adoption, complete shared behavior certification or DEP-03/SDK closure.

Execution authority was stepped and preserved:

| Gate | Selected PLAN SHA-256 |
|---|---|
| Original Task1 freeze | `9f739d9fccd6f6bd8473959d1599350e092561a0ed24f536e9645ef950ec36d1` |
| Initial emission and pack | `ece3fe2733fa4d7a787b3e1c208c6cff013e9b26f7145e81a33e6ba81a723ee1` |
| Temporary metadata link and single retry | `004c09c5ee9661cc4e49dd7b7e2894056969907728dc2e7a2a7b571d94a2eae5` |
| Exact native manifest normalization acceptance | `a575e7066726968b60b5d0adbf59b1d98abcf34787e64ba2b5f2ee344ee71a94` |

The original whole-input receipt remains `f214dc035ae5007f3643da19aef7e63552b80e1eac1a919cdb2ceb6d495dd0ca`; it was not relabeled after the metadata-link amendment. The source, compiler program/config/resolution metadata, native tools, staged ordinary manifests and102 active artifact originals/copies were rehashed before emission, after emission, before/after the successful retry, before/after extraction, after runtime/type probes and at final handoff. Each stage checked464 manifest entries (overlap between manifests is intentional); all stayed unchanged. Source and active output membership were also checked. The original source and installed/shared dist were not replaced.

### Artifact identity

- Archive: `/tmp/minion-14-11-84XpBnCA/archives/minion-stack-shared-0.9.0.tgz`
- Archive bytes:72,021; SHA-256 `b896e1df2d7da596f6f6dd0f3d2a26f225ffbe11587d95fae1deb233818595e9`.
- Extracted package: `/tmp/minion-14-11-84XpBnCA/extracted/package`.
- Complete extracted path/size/digest manifest: `checks/extracted-manifest.json`, SHA `d696388db3357f994ac2f20541f30e5001118fb064baf4e7db906c642b65a9b6`.
- Packed package.json SHA `e1610bed949aaa0116465b9ec9a5762d5cd9628177bcb5b73608ae04d68610fb`.
- Source/staged package.json remains SHA `bb3c6636d1b5d801a1b24743ebd16392308d89448dec918f75723583ecd5183e`.

All121 archive files were inspected before extraction:120 emitted files plus package.json, no links, duplicate normalized paths, absolute/traversal paths or unexpected members. Extracted emitted bytes exactly match the compiler output. One pack is successful; byte-identical repeat packing was not tested. The tarball and full member manifest, rather than any single entry hash, identify this candidate.

| Emitted entry under extracted/package | SHA-256 |
|---|---|
| `dist/index.js` | `238e597df8e2c08f06ca0defdbe71f87d5b1062b1fc1f5e657f77dc0e5952d6c` |
| `dist/index.d.ts` | `148058415f09b379c84c0833a1d5a20d92a439b59b7f879fb5bc26545e8ac6c1` |
| `dist/gateway/index.js` | `2dfe94aa52506d7fa788d8f48f319bd71b294759b22563205cb75af0b4915580` |
| `dist/gateway/index.d.ts` | `06383916f486c4f5fbcdc7e53320279480133ba75f2084c635ccb2d8396e915a` |
| `dist/gateway/client.js` | `9fd0783baa97b9d64844ce1c3058966a0193f2ef8f4a148c3cc50139b119d474` |
| `dist/gateway/client.d.ts` | `4904536794ee4d7c009e2061727afad2371ff18fa5485c993d147440007fbaf1` |
| `dist/node/index.js` | `9e8b0d62af327b974fef694c9d1955ac43ca81e0f08c98c8be23f210037d408d` |
| `dist/node/index.d.ts` | `39cdd90b503b531c8a30a28e7acd454916244316b44be88bea801bf79b22feaf` |

### Native commands and encountered boundaries

Using the pinned native pnpm10.15.0 executable and sanitized environment from Task1, the existing `@minion-stack/shared` build ran `tsc --outDir /tmp/minion-14-11-84XpBnCA/workspace/packages/shared/dist --tsBuildInfoFile /tmp/minion-14-11-84XpBnCA/build/shared.tsbuildinfo --noEmitOnError true`. It exited0. Both output paths were temporary; active tsbuildinfo stayed byte-identical.

The first `pnpm pack --pack-destination /tmp/minion-14-11-84XpBnCA/archives --json` failed with `ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`: the staged tsconfig dependency was not installed. No archive resulted. Root then admitted only the temporary link `workspace/packages/shared/node_modules/@minion-stack/tsconfig` -> `../../../tsconfig`, resolving to the previously staged `workspace/packages/tsconfig` inside the same private directory. Its unchanged0.1.0 package metadata was verified. No link targets an active dependency tree, no runtime dependency was installed and no source manifest was edited. Initial staging/failure receipts remain intact; the separate amended-staging/link receipts record this addition.

The identical native pack retry exited0. The strict manifest comparator then rejected an unselected normalization: pnpm removed `scripts.prepublishOnly`. Root independently inspected the archive and admitted exactly that removal plus the expected `workspace:*` -> `0.1.0` devDependency normalization. Extraction continued against the existing archive; no further pack was run. All other parsed manifest fields match source. These are native package-container transformations, not source metadata edits.

Native build/pack and runtime/type inspection commands were traced with installed strace for network and execve syscalls. Traces show no outbound network syscall and no pack lifecycle execution. The actual build resolved the existing shared tsc launcher and /usr/bin/node. Exact argv/cwd/synthetic environment/exit codes are in execution-commands.json; stdout, stderr and traces are under logs/. Validation-tool identities (including the TypeScript API bundle and strace) are recorded separately from build inputs.

### Public exports, declarations and checks

| Export | Reachable runtime files | Reachable declaration files | External runtime imports |
|---|---:|---:|---|
| `.` | 20 | 20 | None |
| `./brain-vector` | 3 | 3 | None |
| `./gateway` | 12 | 11 | None |
| `./node` | 9 | 8 | ws |
| `./utils` | 4 | 4 | None |

TypeScript's installed parser traced imports/reexports and declaration references through the actual extracted package. All public targets and transitive relative targets are ordinary files inside the extracted root. Root/gateway/Node reach the emitted client runtime and declarations with `onAuthenticated`. Browser exports have no reachable external runtime import; /node's sole external runtime is ws.

Real module import smoke passed for root, /gateway, /utils and /brain-vector with socket construction/fetch blocked. /node import without a ws installation failed with the expected missing-peer error; that proves the requirement remains, not that the Node consumer passes. A strict no-emit TypeScript probe imported the extracted public root/gateway/Node declarations, assigned the real optional callback and numeric readonly generation contract, and completed with zero diagnostics. Its resolution trace identifies the extracted declaration files. It does not typecheck Hub or Site and does not invoke a gateway connection. The65-case source client suite remains14-08's evidence; no broader shared suite was rerun here.

Negative qualification retained an unchanged positive control and correctly rejected changed client runtime bytes, changed client declaration bytes, a missing transitive uuid.js member, altered archive bytes, and a conflicting digest under the same name/version in a synthetic policy inventory. The actual export traversal separately rejected the missing uuid.js. All tampering occurred in disposable copies under checks/; the selected archive/extracted package was rechecked unchanged. The version-conflict inventory is a local fixture, not observed npm state.

### Shipping and adoption limits

The actual archive contains no shipped package-owned LICENSE/NOTICE file and no README despite the declared file list; those release checks fail. It also contains36 test-derived files and60 maps. The maps reference original workspace source paths through relative paths and do not include sourcesContent. shipping-report.json records these references without following them. No emitted test file was executed by import smoke. Root must separately decide release file policy and proper license provenance; this task did not invent legal text or silently strip package output.

Manifest0.9.0 remains explicitly unpublished-candidate metadata. Same-version differing content is rejected as production identity. Root must admit a distinct immutable release/version/changeset and exact consumer manifest/lock transaction before active adoption. No release version availability or registry identity was looked up.

For14-09/10, root may now select this complete archive/extracted identity for isolated whole-package runtime AND declaration resolution. Root owns snapshot source/lock/config/tool preservation and materialization under each snapshot's private node_modules. Source-only/client-only aliases, old installed declarations or writing through an active symlink do not satisfy this handoff. Actual service suites and full isolated Svelte checks remain those plans' execution work; passing package probes cannot substitute for them. Active old installed consumers remain unchanged and unqualified for the new callback.

Paperclip's older shared package and actual Node/ws peer path remain a separate consumer gate. Workforce-client and plugin-ui-bridge each require their own complete candidate/archive/license/peer/installed identity; none inherits this shared artifact's qualification. Native browser behavior, actual gateway receiver policy, publication and deployment remain outside this execution.

### Durable receipt pointers and review

All following files are under `/tmp/minion-14-11-84XpBnCA/checks/`. Their hashes are preserved here for review; temporary paths are local artifacts, not a durable registry or release archive.

| Receipt | SHA-256 |
|---|---|
| `whole-input.json` | `f214dc035ae5007f3643da19aef7e63552b80e1eac1a919cdb2ceb6d495dd0ca` |
| `emitted-manifest.json` | `e72a2876f702ad8f8c5df456038f2f9a8a0d9190553fd985d2dde1b36bed1c38` |
| `archive-members.json` | `266ec4e5485f4063a1762465ed435db23934b63ac2b68846a5659d395ae4e3bd` |
| `extracted-manifest.json` | `d696388db3357f994ac2f20541f30e5001118fb064baf4e7db906c642b65a9b6` |
| `export-closure-result.json` | `d64234b7aed9c62db4f536cb7ac5daad42e15e4a1e1913b132f0088996a74902` |
| `runtime-smoke-result.json` | `c00838f502804c4fa12935f93956684a06310d2dc630439599debd5e52f35516` |
| `public-types-result.json` | `4949673ac85b5d849113c8e8cfa748d4f0804ac6e455109f254493becdc106b6` |
| `negative-results.json` | `a2a8dbe575e39ae0e63aa690e82c74b373d2013d1999e2a6340b039575c6ba68` |
| `shipping-report.json` | `08a560278515e99878c8f926d2a96cf0fec06163223a4ca304a91f5a28cff53d` |
| `input-rechecks.json` | `0211ef115e2b1853533550ed292f60520cf5e13cf6a779e5567834d2b0ea617c` |
| `staged-link-transaction.json` | `12e36a52637b87131fa4ed0dde58c4667f7c18f93570bf9e7d0b6f230ce13b03` |
| `amended-staging-context.json` | `ee6f0428881e0eb92f4d17ad7b7f84f50c65767792cbbce8fdb6824cc4c7bc12` |
| `native-manifest-normalization.json` | `c66d7c11ee2c4b4d4198c977216ec3f6b26a21f04ca9d8f9504c69b39a8b2c85` |
| `execution-commands.json` | `cb32ab45d08bb76ad41b494e6d11f00533ad886e570997f24ee1ce84029de2e5` |
| `validation-tools.json` | `d5691fe4042d8cef0d33393e4c827c1b6b58ff40af41746c954e453953d69694` |

Standards self-review: only admitted receipt files and private temporary artifacts changed; active source, dist, manifests, locks and dependency trees stayed unchanged. Native tools and both packaging amendments were explicitly selected; failure logs were retained. Spec self-review: exact emitted runtime/type export closure and archive/extracted identity are available with meaningful negative checks. License/README/version and real consumer gates remain failed/open. Root independent review and snapshot admission remain necessary before claiming downstream qualification.


## Task4 durable candidate: input freeze only — 2026-09-09

Prepared under exact PLAN SHA `d8f0a282635615fc81c28a7406da73d22a911dfae58a05b4e9b1ad1778b535be`. Root admitted inventory/preservation only after14-13 independent verification. New private directory: `/tmp/minion-14-11-FOyKEiLN`. Whole-input manifest: `checks/whole-input.json`, SHA-256 `ebc9e72980bde83459e87cf59ae69416020183f7a24a9b4c360f7a585777afd1`. Root must select this exact freeze before any emission or packing.

The complete inventory binds41 source/config/root-metadata files (31 actual shared src files),283 TypeScript program files,29 package-resolution manifests,5 resolved tsconfig package/config files,132 files in the installed TypeScript package and exact native tools. Resolved tsconfig is the actual root `packages/tsconfig` package; TypeScript resolves through the existing installed5.9.3 tree. Copies are preserved below before/source, before/compiler-inputs, before/metadata, before/resolved-config and before/compiler-package. The whole-input manifest binds12 subordinate manifests and the exact preparation script hash. The additional complete compiler/config inventories strengthen this transaction's closure; absence of those complete inventories from the earlier receipt is not evidence that every previously unlisted file was unchanged.

### Comparison with the original candidate

Full source/config membership and content comparison against `/tmp/minion-14-11-84XpBnCA/checks/source-before.json` found exactly:

- Changed `packages/shared/src/gateway/shells.ts`: old candidate input `40cad5e97be00713f590092aabfc46c46e522dee747b20e890fd749983c872b1` → new `e480c90660f7c5936a32be9c933c857223077a893d3d66d0ad4bcc086ebaa8f7` (11-07 foundation plus14-13 bilateral negotiation).
- Added `packages/shared/src/gateway/shells-outcome.test.ts`: `3e8360cfa43e1b11fd12e8efb5f19176e26528b4afb1a1a6cd36c2d813280b49`.
- No removed source/config entries or other source/config/root manifest/lock changes. Actual compiler program membership likewise adds only that test and changes only shells.ts. All29 resolution manifests and every earlier frozen tool record remain identical, including actual native versions/resolution paths.

Shared14-08 client source remains `c0c492d4e03f0a26ae9afd5b9993bd66c82451f7289670cfed411344ac677666`; its test remains `de1ddab9590b7e793252b0a61f23d6a165aee1aa1424d753ffd7b6aed77a31ba`. Both were asserted during preparation. This comparison identifies exact inputs; it does not claim broader shared behavior was tested.

All102 active dist/package/tsbuildinfo files were copied to before/active and rehashed, with unchanged membership. Their manifest remains exactly the earlier `b6f1c35f18567a6146d0c97191bc24aea69772e935ce7a4de7c6e5d0802e737b`. The active shared test cache was inventoried separately including mtime and stayed unchanged. No active dependencies, cache, output, source, manifests or locks were written.

All1,345 inventoried files across the original candidate tree and both root-owned Hub/Site shared-package copies were hashed before and after; bytes and file membership stayed unchanged. The original archive remains `b896e1df2d7da596f6f6dd0f3d2a26f225ffbe11587d95fae1deb233818595e9`. Hub/Site still consume that earlier reconnect package; no later durable contract was injected into those snapshots. The new candidate does not overwrite or relabel their prior verification.

### Tools, commands and staging

Pinned direct pnpm path remains `/home/nikolas/.local/share/pnpm/.tools/@pnpm+linux-x64/10.15.0_tmp_2225177/node_modules/@pnpm/linux-x64/pnpm`, executable SHA `c9548da52cba52401a8419e1dbc135e2206f74508c18e50ef1ce68e70e7cbf02`. Node `/usr/bin/node` SHA `45b7e2ad792e6968e3f69c85864d19d29f010b39c55b33e0b0c27e2f22d8ddda`. Both hashes were checked before version invocation. Native versions: Node22.23.2, pnpm10.15.0, TypeScript5.9.3. No selector wrapper was executed and no tool was downloaded.

`checks-freeze.py` records the preparation algorithm. Its command receipt `checks/commands.json` contains only native node/pnpm/TypeScript version queries and `node <actual-typescript>/bin/tsc --project <active-shared>/tsconfig.json --listFilesOnly --pretty false`. This last command discovers the real compiler input program without emission or test execution. Each subprocess used exactly PATH=/usr/bin:/bin, HOME=`/tmp/minion-14-11-FOyKEiLN/tool-home`, LANG=C.UTF-8 and NODE_DISABLE_COMPILE_CACHE=1. Stdout/stderr are retained under logs. No app environment or credential configuration was read into receipts. Root/package npmrc absence was checked without reading user configuration.

Only ordinary temporary staged shared/tsconfig manifests and the minimal private workspace root/package list were created. No dependency link exists in this new staged workspace yet. The later already selected metadata-only link must point inside this new private workspace, not the old candidate or active dependencies, and have its own transaction receipt after emission release. Native expected pack transformations remain tsconfig workspace:*→0.1.0 and removal of prepublishOnly; source metadata is unchanged. No prepare/prepack/postpack script appeared in the compared manifest.

Final checks found no staged dist, an empty build directory and an empty archives directory. **No emission or pack occurred.** There is no new archive or extracted runtime/declaration identity to hand off yet. Missing package-owned license/NOTICE and README remain unchanged failed shipping gates; no legal text or version was invented. An eventual second0.9.0 candidate is keyed by distinct content digest and remains unpublished local-test metadata, never another accepted production identity.

### New freeze receipts

All paths below are relative to `/tmp/minion-14-11-FOyKEiLN/checks/`.

| Receipt | SHA-256 |
|---|---|
| `active-before.json` | `b6f1c35f18567a6146d0c97191bc24aea69772e935ce7a4de7c6e5d0802e737b` |
| `active-caches-before.json` | `fa7c9c02a09e1d720ccc919dba76326590cc9a28c2dce95a40ada6983690afd0` |
| `commands.json` | `80d9cfba8967ce0ffca469c21353c026f192c4a0ceeb4d92a3ca660c090f2694` |
| `compiler-inputs.json` | `cfb84bae11f4fbfb37ca57f5e7e937fbe836753e5aaae73bcdbed58582ad286a` |
| `compiler-package-inputs.json` | `1c5b288adb6bec2ca5858b0740392cb34c475186ff1749a3368648be8b25808d` |
| `prior-candidates-before.json` | `b413423bad478a16e475afd091d4b463cbe5109940a5f66cd13720e7026fda7b` |
| `prior-input-comparison.json` | `367aaed3ccefad93cfb7a91ded8c4742da03d3e04fee47da32688f77a6792288` |
| `resolution-metadata.json` | `347dc6885d39edd2183cf08cbb9979c0efa19829c7075c46458588a03913da32` |
| `resolved-config-inputs.json` | `158805525f8d5f6ffcc898e30d716739c0a7f0e3e1b8ae97d8783764e08ec07b` |
| `source-before.json` | `3e01e14aa6cde1b5477d359048594bb9a02d4c480abb467678509fca41528504` |
| `staging-context.json` | `b10919ebf7a3e5e7355102ffa38421806c846965719cdc6211e98f621668b1de` |
| `tools.json` | `d58f445b46dd8bc817489a469ef430ffc19824f9c8f3354ec0310c4295fbf061` |

Root review must select the new whole-input digest and then separately release native emission/pack/export closure, canonical normalizer/version public-entry probes, matching declaration probes and negative artifact checks. The prior archive is still preserved. Gateway parity/input child, immutable package adoption, Node/ws peer, license/README/file-policy/runtime/image and Workforce/plugin candidates remain separate gates. Source stayed frozen throughout preparation; no drift was observed.


## Task4 durable candidate: emitted artifact handoff — 2026-09-09

Root released the selected input `ebc9e72980bde83459e87cf59ae69416020183f7a24a9b4c360f7a585777afd1` under PLAN SHA `72dae11de42a8251b8c1b723e2190a0b8a40302beeced38221484cac2f49b7de`. The original Task4 input-admission plan identity above remains preserved. Exactly one native emission and one native pack succeeded in `/tmp/minion-14-11-FOyKEiLN`. No prior archive or consumer package was replaced.

### New artifact identity

| Artifact | Exact identity |
|---|---|
| Archive | `/tmp/minion-14-11-FOyKEiLN/archives/minion-stack-shared-0.9.0.tgz` |
| Archive SHA-256 / size | `61ccc90584addf49dd8509cb71a1103ba5fa6dd632a46936d72f1716b794fef0` /80,120 bytes |
| Extracted root | `/tmp/minion-14-11-FOyKEiLN/extracted/package` |
| Complete extracted manifest | `5240824d8f59f61a9ca0c9d9abefa68d96356be8699e131ede7a842a4a35ef37` |
| Actual archive-member manifest | `5335f4e8ba4daa8d3d33dad7f8097295179ceb5242ca6e70fad285a788eda395` |
| Packed package.json | `e1610bed949aaa0116465b9ec9a5762d5cd9628177bcb5b73608ae04d68610fb` |
| Emitted durable `dist/gateway/shells.js` | `0863ea48725b06f47849f4b7236ff423734bfd9b48ba6b0f112572ed242ad712` |
| Matching `dist/gateway/shells.d.ts` | `5949f59b7bcbec56e24fc6daab726704449544ec766479af0e30336a294091d1` |
| Complete handoff.json | `ff8750a02fa69a68c58cef533d16a0394c4b7cb50d05fb375bdb7f80f5fb12da` |

The archive contains125 ordinary files:124 emitted outputs plus package.json. Actual tar inspection rejected links, unsafe/traversal/absolute paths, duplicate normalized members, missing emitted members and unexpected non-dist files before controlled ordinary-file extraction. Every extracted emitted file matches compiler output. Full comparison with the original reconnect artifact found4 added test outputs/maps,4 changed Shells runtime/declaration/maps and117 unchanged files. There are no removed files. The unchanged root index.js and index.d.ts hashes illustrate why a root-entry hash cannot identify this new contract; its transitive Shells files changed.

### Native execution and preservation

Using the unchanged pinned pnpm10.15.0 binary, the existing root package build executed `tsc --outDir /tmp/minion-14-11-FOyKEiLN/workspace/packages/shared/dist --tsBuildInfoFile /tmp/minion-14-11-FOyKEiLN/build/shared.tsbuildinfo --noEmitOnError true`, exit0. The actual .bin/tsc resolves to the already frozen installed compiler launcher. Both output paths are private. Packing ran once from that staged shared directory with `pack --pack-destination /tmp/minion-14-11-FOyKEiLN/archives --json`, exit0.

Before packing, the admitted metadata-only link `workspace/packages/shared/node_modules/@minion-stack/tsconfig` → `../../../tsconfig` was created and verified to resolve to this same private workspace's ordinary staged tsconfig directory. Its manifest matches the frozen root0.1.0 package. No active dependency or old candidate link was created. The only packed-manifest differences are the previously selected workspace:* devDependency→0.1.0 and prepublishOnly removal; all other parsed fields match source. No source metadata was rewritten.

Before/after emission, pack, extraction, runtime/type probes and final negative checks, the verifier rehashed1,949 bound file records (overlap is intentional), checksummed all12 input manifests and checked source/active-output/prior-candidate membership. All remained unchanged. It verified source preservation copies where referenced; the166 additional metadata/config/compiler-package preservation copies were also rehashed separately and match. Active shared test-cache bytes and mtime remain unchanged. Original archive/checks and both root-owned Hub/Site packages remain tied to the prior b896e1df… archive.

Native build/pack and runtime/type inspection were traced with the existing strace network/execve selection. No outbound network syscalls appeared; pack's sole successful execve is the pinned pnpm binary, with no build/install lifecycle hook. Only the allowlisted PATH/private HOME/LANG/NODE_DISABLE_COMPILE_CACHE environment was supplied; pnpm's own script environment additions do not introduce application credentials. Exact argv, cwd, exit codes and traces are retained under checks/execution-commands.json and logs/. No application, database, provider, browser or registry was contacted.

### Actual export and durable-contract qualification

Public export traversal used the installed TypeScript parser against all actual extracted runtime/declaration targets. Root has20 runtime/20 declaration files; gateway12/11; utils4/4; brain-vector3/3; node9/8. Every transitive relative target exists as an ordinary contained file. Root/gateway/utils/brain-vector have no external runtime import. Node alone imports ws, and the expected missing-ws import failure remains explicitly unqualified Node-consumer evidence. No peer was installed.

Actual extracted root and gateway entry probes successfully call canonical admission/outcome/receipt/query/observation normalizers and fixed outcome projection. They reject a mismatched query receipt. Both public entries pass the four legacy/v1 negotiation combinations and reject malformed values in both operand positions opposite undefined/1, including hostile coercion objects without evaluating their hooks. These checks import the emitted artifact, not canonical source or a copied validator. Prior client callback export smoke also passes. No socket constructor or fetch is permitted by the smoke probe.

The strict no-emit public declaration probe resolves the same extracted root/gateway/Node declarations. It checks the existing optional authenticated callback/generation surface, literal `1 | undefined` negotiation results, typed legacy and v1 registration responses, and canonical admission/outcome/receipt types. Zero diagnostics. Its trace identifies the actual extracted declaration closure; no old installed declarations or source alias satisfy the new contract. This does not typecheck or execute a gateway receiver consumer.

Negative qualification accepts the intact125-file archive/extraction and rejects changed client runtime/declarations, changed durable runtime/declarations, missing transitive uuid.js, altered archive bytes and conflicting same-version bytes. The actual export traversal independently rejects the missing uuid target. Both a synthetic production inventory and the two real local old/new archive digests demonstrate same-name/version conflict under production identity policy; neither is claimed to be an observed registry release. All tampering occurred in disposable new-transaction copies. Selected archive/extraction were rechecked unchanged afterward.

### Shipping and remaining gates

The new archive still has no package-owned LICENSE/NOTICE or README despite MIT metadata/declared README. It ships40 test-derived files and62 maps without sourcesContent; referenced original source paths were recorded but not followed. No test output was silently filtered or executed by import smoke. License/README/shipping scope and immutable production version gates remain failed/open. One successful pack does not establish byte-reproducible archives.

This is a second **unpublished local0.9.0 content identity**, not an overwrite of the original candidate or an accepted production release. Root must independently verify the new archive and extracted closure before assigning it to the separate gateway parity/input child. Hub/Site keep their previous qualified package bytes. Gateway/shared shim parity, actual receiver/caller/sender runtime, Node/ws peer, minimum/image, immutable version/lock adoption and independent Workforce/plugin artifacts remain separate. No requirement is closed by this local package result.

### Task4 receipt hashes

Relative to `/tmp/minion-14-11-FOyKEiLN/checks/`:

| Receipt | SHA-256 |
|---|---|
| `export-closure-result.json` | `4b186d778f75b317d368575a2c247edc9f670d34152a813f63725791a1c3bdc2` |
| `runtime-smoke-result.json` | `0ab899fc702d1f5dd8f929e30436ea96b768f3392f4de4bf082a6d03ea5300f1` |
| `public-types-result.json` | `4becf92f7f53cf1827505a10ad2a23e5b7586bf7cc658556d7e757eba6ebedad` |
| `negative-results.json` | `c619b0011d22206acb6303d87f49155e815e7713a8010e729844c0cc6e882b2c` |
| `shipping-report.json` | `2676d09251b20f8864e6be9988eaf58ec5f1cbb13de5288917796576e8135cc4` |
| `previous-artifact-comparison.json` | `6c3d817d243a4399708417106c8250cfdc567d0294f21d24337f5f8f358cb68d` |
| `input-rechecks.json` | `ad72db4d2630140bb8f1abda62319a8f7c978425727561fb524c729ad8931eae` |
| `additional-preservation-check.json` | `8d79cf2bb24944519dac9d0362c02b9df02572a4a2da65bc4daf04631e109a52` |
| `staged-link-transaction.json` | `6b559ed032a188d22cd274f7888144363d8b693d59cae227f87df2b27d79a2f7` |
| `native-manifest-normalization.json` | `34ed3f1fee291c990c6b35754682c207ae093ef970bd7476e1c053bb2b9ef510` |
| `execution-commands.json` | `f544d7cd9483240a7296aaf23e771b537732374a4926b02b0a77e8c616feecca` |
| `validation-tools.json` | `d5691fe4042d8cef0d33393e4c827c1b6b58ff40af41746c954e453953d69694` |

Standards self-review: native tools and exact package-input freeze used; two receipt files plus only the new private directory changed; all preservation checks pass. Spec self-review: actual new durable runtime/declaration public entry and full artifact checks pass, including meaningful negatives. Root independent artifact review remains required. Production/release and downstream receiver qualification remain open.


## Required-invocation/profile artifact continuation after14-16

The full unpublished shared candidate at `/tmp/minion-14-11-1ss7iase` includes independently verified14-16 source. This continuation qualifies emitted package bytes; root independent artifact review and every consumer adoption remain pending. No installed package, active dist, lock or previous consumer candidate was changed.

| Identity | SHA-256 |
|---|---|
| Selected whole input | `cac2fbbf0e71154818dd99ddec9bbbb1554f17c7d1e719e52303b1759917f42e` |
| Execution PLAN | `884c41b8a823a79f395ea766ebbf7c377c70c8bd524d81a3089c198076b413c1` |
| Archive `archives/minion-stack-shared-0.9.0.tgz` | `f6a3c237c0264a2a8ef75906991ae8fa84504bf637d3b6655d07058582b603fa` |
| Complete extracted manifest | `25b57442f3ea8b9fd6b11168b864a145d826bcfa6050cb05b2d49d5aa22b24c8` |
| Actual archive-member manifest | `b31ad24ba1f4295454a7a8cbe4cb75e9f4b9e612f2ad11a155de31df1369f1b9` |
| Emitted `dist/gateway/shells.js` | `2487c9fba31b2a17fde531b6ce986760e1b8662247f817f2700983c697b8b339` |
| Matching `dist/gateway/shells.d.ts` | `007ea18a7cc79c0b2d52459ee12db8e41afc34f61e2d5f786737cefd76de7eb3` |
| Complete `checks/handoff.json` | `b3565b32285ebf624d3826c09969dc2f89394cfb054655133c2598c3ce15466c` |

The archive is85,730 bytes and contains125 ordinary files:124 emitted outputs plus package.json. Compared with the preceding61ccc905… artifact, membership is unchanged; six files changed and119 are byte-identical. Changed members are Shells runtime/declaration and their maps, plus the outcome test runtime/map. Entry-point hashes alone would miss this change. The source/compiler comparison likewise finds only shells.ts (`c6c9397b…`) and shells-outcome.test.ts (`4cc2a917…`) changed; tools, resolved config, metadata and active artifacts are unchanged.

The reviewed native pnpm10.15.0 build and pack commands both exited0. Build used the declared package tsc script with only private outDir/tsBuildInfoFile overrides and noEmitOnError. Pack ran once in the staged workspace after the admitted private tsconfig metadata link. No installation or source metadata rewrite occurred. The only packed manifest transformations remain workspace:* tsconfig to0.1.0 and removal of prepublishOnly. The expected PLAN digest was the sole post-review execution-script change; before/after script hashes and exact argv/environment are in `checks/emission-release-script.json` and `checks/execution-commands.json`.

All12 input manifests and3,620 bound current/preservation records were rechecked through final qualification. Another166 metadata/config/compiler-package preservation copies were checked explicitly. Prior archives/checks and the Hub, Site and14-14 gateway package copies remain unchanged. Active shared caches retain their recorded bytes and mtime. Build, pack, export traversal and runtime/type probes retain strace network/exec logs; none contains outbound network matches. The only environment inputs were the allowlisted PATH, private HOME, LANG and NODE_DISABLE_COMPILE_CACHE. This did not run a live application, database, browser, provider or registry transaction.

Every declared export and transitive relative runtime/declaration target was traversed from the actual extracted archive. Root export closure remains20 runtime/20 declaration files; gateway12/11, utils4/4, brain-vector3/3 and node9/8. Public root and gateway imports exercise the new distinct method, strict required-response validation, malformed/legacy refusal, accessor canary, frozen nested profile and maximum escaped aggregate against the emitted functions. Outcome/receipt/combined sizes remain57,161/6,323/63,540 bytes, with exact aggregate boundary acceptance and one-byte-under rejection. Existing bilateral negotiation/admission/outcome probes remain in the lane.

The native TypeScript public probe resolved21 candidate declarations including the Node declaration surface, with zero diagnostics and no emission. It verifies text-only durable request types, explicit required-response types, exact literal limits and readonly nested profile members while preserving legacy invoke/register types. This is declaration qualification of the complete candidate, not a real Node runtime consumer test or a repeat of14-16's114 source tests.

Negative checks accepted the untouched125-file package and rejected changed client runtime/declarations, changed Shells runtime/declarations, missing transitive uuid.js, wrong archive bytes, and conflicting same-version production identities. Missing-member rejection also ran the actual export traversal. All tampering occurred in separate private copies; the selected archive/extraction was rehashed afterward.

Release limitations remain explicit: package metadata says MIT but the archive contains no owned license/NOTICE or README;40 test-derived files and62 source maps ship; map references outside the archive were recorded without following them. The Node-only runtime export still fails without ws as expected, so optional-peer metadata does not establish positive Node compatibility. Reusing0.9.0 for different bytes is permitted only as these identified unpublished local candidates, never a production release identity. No minimum-runtime, production capacity, byte-reproducible tarball, registry publication, consumer adoption or deployment claim follows. Complete receipts and exact reproduction commands are under the fresh directory's `checks/` and `logs/`; root owns the next independent artifact review and paired consumer selections.


## Root independent required-contract archive verification

Root independently verified all125 archive members against the extracted files,14 bound receipts and3620 current/prior input records. Native public runtime/profile/response smoke, full export closure and strict public declaration probe all passed, including20 root-export declaration files. Artifact `f6a3c237c0264a2a8ef75906991ae8fa84504bf637d3b6655d07058582b603fa` is accepted only for isolated consumer qualification. Evidence: `/tmp/minion-14-11-1ss7iase/root-checks/`. Active consumers still retain earlier packages. License/README, shipped tests/maps, optional ws consumer proof and immutable production version remain open.
