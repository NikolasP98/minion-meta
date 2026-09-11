# Shared package candidate decision — draft, 2026-09-09

Recommendation: emit with the existing installed pnpm/TypeScript package build into a new temporary dist and tsbuildinfo path, then pack that output in a minimal temporary pnpm workspace. Use its full extracted runtime and declarations together in root-owned isolated consumer snapshots. Do not replace active shared dist or node_modules to unblock tests.

## Observed local evidence

| Evidence | Finding |
|---|---|
| `packages/shared/package.json:2-34` | @minion-stack/shared0.9.0; exports ., /gateway, /utils, /node and /brain-vector, each with runtime and declaration targets |
| `packages/shared/package.json:36-42` | ws^8.0.0 is an optional peer in metadata; the actual /node implementation imports ws and requires it at runtime |
| `packages/shared/package.json:47-65` | files includes dist and README.md; build is tsc, prepublishOnly is tsc; dev tsconfig uses workspace:*; no prepare/prepack/postpack declared |
| `packages/shared/tsconfig.json:1-8`, `packages/tsconfig/library.json:5-12` | Whole src tree emits, including tests; composite, declaration maps and source maps enabled; isolated build must override outDir and tsBuildInfoFile |
| `packages/shared/src/index.ts:1-4` | Root reexports gateway, utils, brain-vector and prompt-sections; one client/index hash cannot establish full package provenance |
| `packages/shared/src/node/index.ts:5-7` | /node is the package's explicit ws import boundary; browser-safe root must not resolve through it |
| Local `pnpm --version`, `pnpm pack --help` | Installed pnpm10.15.0; help supports --pack-destination, --out and --json. Pack was not executed; archive rewriting/lifecycle/file contents remain execution checks |
| Installed compiler resolution | shared/node_modules/typescript/bin/tsc resolves to root/node_modules/.bun/typescript@5.9.3/node_modules/typescript/bin/tsc; native pnpm invocation is not proof of a pnpm-installed dependency tree |
| Local ws/types | Installed shared ws8.21.0 and @types/ws8.18.1; manifest range alone does not identify either |
| README/license | packages/shared/README.md absent. No package/root LICENSE or LICENSE.md found. MIT metadata is insufficient shipped text; do not invent ownership or reuse another package's license |
| Current dist | Exists and lacks onAuthenticated in inspected client runtime/declaration. It must not be confused with accepted14-08 source |
| 12-03 and14-02 | Require complete archive/license/peer and per-consumer installed identity, reject same version/different bytes; their planned generic package-provenance/consumer-matrix scripts are currently absent |

## Exact draft pins

| Input | SHA-256 |
|---|---|
| shared package.json | bb3c6636d1b5d801a1b24743ebd16392308d89448dec918f75723583ecd5183e |
| shared tsconfig.json | 0343eb5e725a9cf170b1b2df5a30b80d41fd01dad21dff1a97aee00af0019810 |
| accepted client source | c0c492d4e03f0a26ae9afd5b9993bd66c82451f7289670cfed411344ac677666 |
| accepted client tests | de1ddab9590b7e793252b0a61f23d6a165aee1aa1424d753ffd7b6aed77a31ba |
| shared src/index.ts | 7d63b3a0f7d6665ba6798134c83cf4c592b238d7d9cdd46a72087a70c8589748 |
| shared src/gateway/index.ts | 3d7c3236a66c405ab5b1e9373e68e73b2034c7ea2245dc43510fce73ec6dd232 |
| tsconfig package.json | 27ee99c0f39d8b32cd57e94de7b97ec2d4ed5d3df9c898122abcf4a2d8489688 |
| tsconfig library.json | 811ca84dcf95bf61685ed4a3589e19496ee32ec8c7ec03f8768084ae6461a0f5 |
| tsconfig base.json | 3c98785d86fe9856939f1300e793e71ae77635fc61905a4374de6af89913ed7a |
| root pnpm-lock.yaml | 1cb7ee1c7feee5b593db8ddda02c0eabc7128d668c660bfcbc8b043a339e1008 |

These are inspected pins, not the required complete source/installed-tool closure manifest. Task1 must capture that whole manifest under root freeze before build. Nothing in this packet establishes an archive digest yet.

## Bounded choices

| Choice | Assessment |
|---|---|
| Native build directly in active package, preserve then restore dist | Rejected default: changes every workspace-linked consumer and restoring can overwrite concurrent output; preserving old bytes alone does not prevent contamination |
| Native package build with temporary outDir + tsBuildInfoFile, then native pack in temporary workspace | Recommended: uses real compiler config, produces complete runtime/types, leaves active artifacts intact; must verify source freeze, pack workspace rewrite, full archive exports and license failures |
| Alias consumer runtime directly to shared/src | Inadequate for this gate: gives source behavior but does not establish emitted types/runtime or archive/export resolution |
| Change package version/install now | Outside admission: requires root's separate immutable version, archive/license/peer and manifest/lock transaction |

Selected candidate directory template: `/tmp/minion-14-11-XXXXXXXX`, uniquely allocated with mkdtemp. Exact children: `before/`, `before/source/`, `build/shared.tsbuildinfo`, `workspace/packages/shared/dist/`, `workspace/packages/shared/package.json`, `workspace/packages/tsconfig/package.json`, `workspace/package.json`, `workspace/pnpm-workspace.yaml`, `archives/`, `extracted/package/`, `checks/`, `logs/`, `tool-home/`. Capture active dist/manifest/cache copies and full hashes before build despite avoiding their mutation. No shared node_modules write or symlink is needed. Native compiler resolves existing dependencies from the original workspace; pack uses only staged workspace manifests and emitted files.

Pack may normalize workspace:* devDependencies into the staged tsconfig package's0.1.0 version. Verify the actual packed manifest rather than hand-rewriting it or asserting unexecuted semantics. No install is needed to inspect this. Retain source manifest and packed manifest as distinct identities. If installed pnpm requires dependency resolution, attempts hooks/network, or cannot pack the staged workspace, report the exact failure; do not silently switch tool/version or widen the task.

## Candidate handoff is narrower than adoption

The archive's unchanged manifest0.9.0 must be labeled `unpublished-candidate` and keyed by archive SHA plus full extracted manifest. It is never an additional accepted production identity for0.9.0. A production comparison must reject same name/version with different bytes. No registry identity was looked up. A distinct immutable version and changeset are later root-owned decisions; do not guess an unused version.

An absent shipped license blocks DEP-03/release. Root can explicitly permit only local testing of this candidate while retaining that failure. Browser export closure can be checked without ws; /node must later be checked with an exact compatible ws peer in an isolated Node consumer, including declaration dependencies. Shipped test outputs/maps and missing README need disposition before release; this plan records them without silently changing files or compiler configuration.

For14-09/10 root owns whole consumer snapshot copies and artifact materialization. Runtime and TypeScript must resolve the same full extracted package, with no candidate-source/client-only alias and no old-installed declarations. Record snapshot source/lock/config/compiler plus candidate archive/extracted digests. Actual real-service tests and full isolated checks remain those plans' work. Passing there is candidate-qualified source evidence; active old installed0.9.0 is still incompatible until a separately admitted adoption transaction.

Workforce-client and gateway plugin-ui-bridge candidates remain distinct. Each needs its own source/export/transitive/archive/license/peer/version and installed consumer receipts. Plugin's new local dist/index.js SHA d0d9a106ee9a9abfa7c77b24603158f9e28a5c1773430f12f08430bbc3585b82 is only an entry-byte observation, not a packed archive or all-consumer adoption proof. No Workforce digest is borrowed to identify shared or plugin artifacts. Paperclip's older shared installation and actual /node usage remain a separate supported-consumer qualification gate.

## Admission requested from root

Admit14-11 Task1 first, then choose its frozen whole-input digest before Tasks2/3. Explicitly select unpublished local use despite known license/README gaps, with production/release blocked. Separately amend14-09/10 for root-owned snapshots consuming the exact runtime/declaration artifact; do not mutate those plans here. Root owns proposal/global state and later source/manifest/lock/version/license ownership. This draft performed only local source/help/hash reads and wrote these two planning files; no build, pack, install, network or consumer mutation occurred.


## Task 1 execution freeze — 2026-09-09

Executed only root-admitted Task1 under plan SHA `9f739d9fccd6f6bd8473959d1599350e092561a0ed24f536e9645ef950ec36d1`. Whole-input receipt: `/tmp/minion-14-11-84XpBnCA/checks/whole-input.json`, SHA `f214dc035ae5007f3643da19aef7e63552b80e1eac1a919cdb2ceb6d495dd0ca`. It binds40 source/config inputs,282 actual compiler program files,29 resolution manifests, native compiler/tool bytes and temporary staging context. `14-11-SUMMARY.md` records all submanifest identities and evidence limits.102 active dist/manifest/cache files were preserved and their original bytes rechecked unchanged; preservation manifest SHA `b6f1c35f18567a6146d0c97191bc24aea69772e935ce7a4de7c6e5d0802e737b`.

Tool discovery resolved a clean-HOME issue before any build: PATH pnpm is an11.22.0 selector wrapper. The already-installed10.15.0 native executable is `/home/nikolas/.local/share/pnpm/.tools/@pnpm+linux-x64/10.15.0_tmp_2225177/node_modules/@pnpm/linux-x64/pnpm`; direct invocation under synthetic HOME reports10.15.0. Recommend this exact executable for emission/packing, avoiding wrapper bootstrapping. tools.json binds its bytes plus /usr/bin/node22.23.2 and actual TypeScript5.9.3 runtime. No new tool was installed. TypeScript ran only `--listFilesOnly`, without emission; compile cache disabled. No build, pack, network or consumer mutation occurred.

Root has selected unpublished local test use while missing shipped license/README and same-version production identity remain failed gates. No license text or release identity was invented. Emission awaits root acceptance of the whole-input digest and direct native executable path. Runtime/type export closure, tarball/extracted digests and consumer evidence remain Task2/3 or separately admitted consumer work.


## Tasks2/3 candidate handoff — 2026-09-09

Local artifact completed under emission PLAN `ece3fe2733fa4d7a787b3e1c208c6cff013e9b26f7145e81a33e6ba81a723ee1`, temporary-link amendment `004c09c5ee9661cc4e49dd7b7e2894056969907728dc2e7a2a7b571d94a2eae5`, and exact native-normalization acceptance `a575e7066726968b60b5d0adbf59b1d98abcf34787e64ba2b5f2ee344ee71a94`. Original Task1 plan/input identities remain preserved above.

Root can select archive `/tmp/minion-14-11-84XpBnCA/archives/minion-stack-shared-0.9.0.tgz`,72,021 bytes, SHA `b896e1df2d7da596f6f6dd0f3d2a26f225ffbe11587d95fae1deb233818595e9`; complete extracted root `/tmp/minion-14-11-84XpBnCA/extracted/package`, manifest SHA `d696388db3357f994ac2f20541f30e5001118fb064baf4e7db906c642b65a9b6` at checks/extracted-manifest.json. Packed package.json SHA `e1610bed949aaa0116465b9ec9a5762d5cd9628177bcb5b73608ae04d68610fb`. Emitted client runtime SHA `9fd0783baa97b9d64844ce1c3058966a0193f2ef8f4a148c3cc50139b119d474` and declarations SHA `4904536794ee4d7c009e2061727afad2371ff18fa5485c993d147440007fbaf1` are entry pointers only; consume the whole artifact.

The initial native pack failed on unresolved workspace:*; root admitted one staged-only tsconfig metadata link, and the identical retry succeeded. Native pack changed only that devDependency to0.1.0 and removed prepublishOnly; root independently accepted those exact transformations without another pack. No source/active manifest rewrite, install or outbound network occurred. All464 input/preservation entries and active/source file membership rechecks stayed unchanged through final handoff.

Safe extraction verified121 ordinary files. Browser import smoke and strict emitted public root/gateway/Node type probes passed; root export closure includes20 runtime and20 declaration files, no external runtime import. /node alone requires ws; missing-peer rejection is preserved as an open Node-consumer gate. Negative copies proved runtime/type tampering, missing transitive member, archive byte mismatch and synthetic same-version identity conflict are rejected. The selected artifact remains unchanged.

Shipping fails remain explicit: no package-owned license/notice text file, absent README,36 test-derived files and60 maps with references to original workspace source paths. No release version or publication occurred. Root-owned Hub/Site snapshots must resolve this complete artifact for runtime and declarations and run their actual service suites/full isolated checks. Current installed packages, Paperclip/ws, Workforce and plugin independent package adoption, browser and deployment remain unqualified. 14-11-SUMMARY.md and checks/handoff.json contain exact commands, manifests, negative results and limits.


## Task4 durable-contract input freeze — awaiting root emission release

New private transaction `/tmp/minion-14-11-FOyKEiLN` was prepared under PLAN `d8f0a282635615fc81c28a7406da73d22a911dfae58a05b4e9b1ad1778b535be`. Selectable full-input manifest `checks/whole-input.json` SHA `ebc9e72980bde83459e87cf59ae69416020183f7a24a9b4c360f7a585777afd1` binds12 manifests and the preparation script. Details and all subordinate identities are appended to14-11-SUMMARY.md. This is an input receipt only, not a new artifact identity.

Full old/new comparison verified exactly changed shells.ts (`e480c90660f7c5936a32be9c933c857223077a893d3d66d0ad4bcc086ebaa8f7`) and added shells-outcome.test.ts (`3e8360cfa43e1b11fd12e8efb5f19176e26528b4afb1a1a6cd36c2d813280b49`). The remaining source/config/root metadata and every earlier frozen tool/resolution record are unchanged. Current inventory:41 source/config inputs,283 compiler program files,29 resolution manifests,5 actual resolved configs,132 installed compiler-package files. Actual shared14-08 client stays pinned. Complete newly added compiler inventories do not imply historical coverage of previously unlisted files.

All102 active artifact originals/copies and active test-cache bytes/mtime were preserved. The1,345-file before/after inventory across the original candidate and both Hub/Site candidate packages shows unchanged bytes/membership. Original archive b896e1df… remains their identity. No other agent's temporary tree was modified. New build/archive directories are empty; staged dist is absent.

Pinned direct native pnpm10.15.0 executable remains c9548da… at the exact path recorded above, Node22.23.2 and installed TypeScript5.9.3 unchanged. Only version queries and read-only compiler listFilesOnly ran under private HOME/allowlisted environment. Root must accept the complete new digest before emission/pack. After release, native output overrides and an ordinary same-private-workspace metadata link receive separate receipts. No new source, manifest, version, active dependency or consumer-package mutation is authorized here.

Missing shipped license/README, same-version production identity and all later archive/exports/consumer/runtime/image gates remain failed/open. Root has authorized unpublished local qualification only. The new candidate will require its own full archive and public durable-contract/type evidence; it cannot borrow the old reconnect entry hash or imply Hub/Site adoption of later bytes.


## Task4 durable artifact handoff — root independent review pending

Under emission PLAN `72dae11de42a8251b8c1b723e2190a0b8a40302beeced38221484cac2f49b7de`, the selected ebc9e729… input produced exactly one native build and pack. New archive `/tmp/minion-14-11-FOyKEiLN/archives/minion-stack-shared-0.9.0.tgz`:80,120 bytes, SHA `61ccc90584addf49dd8509cb71a1103ba5fa6dd632a46936d72f1716b794fef0`. Full extracted root `/tmp/minion-14-11-FOyKEiLN/extracted/package`,125 files; complete extracted manifest SHA `5240824d8f59f61a9ca0c9d9abefa68d96356be8699e131ede7a842a4a35ef37`. Handoff manifest SHA `ff8750a02fa69a68c58cef533d16a0394c4b7cb50d05fb375bdb7f80f5fb12da` binds receipt/probe identities. Detailed commands and all subordinate hashes are appended to14-11-SUMMARY.md.

Durable Shells runtime SHA `0863ea48725b06f47849f4b7236ff423734bfd9b48ba6b0f112572ed242ad712`; matching declarations `5949f59b7bcbec56e24fc6daab726704449544ec766479af0e30336a294091d1`. Root/gateway emitted public-entry normalizers and bilateral legacy/v1/invalid probes pass; strict matching public declaration probes pass. Full runtime/declaration export traversal and tamper/missing-target/archive/version-conflict negatives pass. Node without ws still fails as expected and remains an explicit separate consumer gate.

The ordinary metadata link targets only this private staged tsconfig. Native manifest normalization is exactly workspace version rewrite plus prepublishOnly removal. Active source/config/artifacts/cache and all original candidate/Hub/Site package bytes were repeatedly checked unchanged. The old root-entry hashes happen to equal the new ones while transitive Shells files differ; neither index hash identifies this artifact.

Root may now independently review and select the **whole** new package for the unnumbered gateway parity/input child. Do not overwrite Hub/Site packages or infer production adoption. Missing license/README,40 shipped test-derived files,62 maps and same-version production identity remain failed/open release gates. This is unpublished local qualification only; no registry/source/manifest/lock/install or runtime receiver action occurred.
