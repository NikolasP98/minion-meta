# Handoff pairing checker — Task 1 receipt

The checker passes its bounded native tests. The current selected-source `--check` fails: source/proposal pairing is not complete. This is not DOC-03 acceptance, implementation closure, a historical disposition verdict, or adoption of private candidates. Root owns all proposal, state and index edits.

## Scope and executable contract

`inventoryHandoffs(root, options)` and `sourceComments(source, filename)` are exported from `scripts/qc/handoff-ledger.mjs`. `SUPPORTED_SOURCE_ROOTS` enumerates the supported source roots. Programmatic `options.roots` may select a nonempty subset of that list; arbitrary roots and unknown options fail. The CLI reads this checkout and writes JSON to stdout only. It never writes a proposal, source file, index or planning status.

Existing workspace-declared TypeScript and Svelte compilers parse comments; no scanner-authored JavaScript lexer or new dependency was added. Quoted/template/regex/JSX/Svelte text is not a source comment. TypeScript/JavaScript comments and Svelte script/expression/HTML comments are supported. A handoff marker in another inspected text language, an ambiguous block, or a Svelte style block produces a review issue. Files without a marker do not need syntax parsing.

Only supported text extensions are read. Declared dependency, generated and managed-data directories are excluded before descent. Every observed path component is checked for symlinks, including in-root aliases; leaf reads use O_NOFOLLOW, regular-file/inode checks and bounded reads. Unsupported or missing selected roots, invalid UTF-8, observed symlinks and exceeded limits prevent a complete scan. This does not claim protection against hostile concurrent ancestor replacement or hard-link attacks. Native parser module loading is a separate trusted-tool prerequisite, not source traversal through node_modules.

Defaults are scanner resource limits, not product capacity policy: 2 MiB per file, 256 MiB aggregate input, 50,000 reads and 100,000 directory entries. One oversized file is reported and other roots still inventory; aggregate/entry limits stop traversal. The output lists selected roots, excluded roots/projects, file hashes, parser identities, requirement-file hash, marker line ranges/exact comment hashes, proposal hashes, reverse records, exclusions and issues. Unknown requirement numbers within declared requirement families fail. No topic/fuzzy/basename matching creates links.

## Structured reverse records

Root may add explicit fenced `handoff-ledger` JSON objects or arrays to proposal bodies. Fenced examples inside a longer Markdown fence do not become records. Duplicate JSON keys/record IDs, unsupported fields, unsafe paths and incomplete implementation records fail.

```json
{
  "id": "stable-entry-id",
  "kind": "implementation",
  "state": "unresolved",
  "sources": [{"path": "scripts/example.ts", "markerSha256": "<64 lowercase hex characters>"}],
  "owner": "assigned implementation owner",
  "nextPlan": ".planning/phases/example/01-PLAN.md"
}
```

The source comment must explicitly reference the same `proposals/...md` file. Its exact source path/comment digest must identify one actual parsed marker. Missing, duplicate or ambiguous sites cannot pair. Fragments remain explicit review items; their headings are not silently assumed to exist. Identical comments at two locations need owner disambiguation before registration.

Only `{ "id": "research-id", "kind": "research" }` is an explicit research exemption. Existing prose without this schema remains `unclassified-manual-review`; the checker neither fabricates source TODOs for it nor treats it as covered research.

`state: "completion-proposed"` additionally accepts `completion.sources` entries with current `path`/`sha256`, and `completion.tests` entries with confined `.planning/phases/...md` or `.json` artifact `path`, `sha256`, nonempty `command`, and `result: "passed"`. Artifact bytes must match, but their claims are not executed or trusted as behavior proof. Completion still emits an independent-review issue. A missing registered marker remains missing, never resolved. `semanticClosure` and `historicalDispositionComplete` remain false in every result. Without a retained reverse record, this current-source tool cannot reconstruct a deleted site's history.

## Verification

- `node --test scripts/qc/handoff-ledger.test.mjs`: 25 passed, zero skipped/cancelled. The initial empty-inventory scaffold failed all initial16 cases; nine further boundary cases were added afterward. No pre-existing checker existed.
- `node scripts/qc/handoff-ledger.mjs --check`: exit1, expected for the current incomplete source/ledger inventory. No failures were relabeled as passes.
- Native formatter: existing private Site Prettier3.8.3, with root shared formatting preset, scoped to the two owned scripts. No package install or formatting dependency change.
- No browser, build, external call, inspected-source execution, commit or release ran in this task.

Current inventory: 8168 reads, 51827024 UTF-8 input bytes, 8107 inspected source files, 82 parsed markers, 58 current proposal bodies, 0 structured reverse records and 74 declared exclusions. completeScan=false; checkPassed=false; semanticClosure=false. Source spans across the active checkouts; private UI/receiver snapshots and the separate minion-meta history are excluded.

|Issue|Count|
|---|---:|
|file-size-limit|2|
|missing-forward-proposal|14|
|unreadable-directory|1|
|unregistered-marker|82|
|unsafe-symlink|1|
|unsupported-marker-language|1|

Scan limitations requiring a deliberate next scope:

- `minion/extensions/diagnostics-otel/index.js`: `file-size-limit`.
- `minion/extensions/matrix/resolve-targets-CHkBI2Yl.mjs`: `file-size-limit`.
- `minion/src/gateway/server-methods/CLAUDE.md`: `unsafe-symlink`.
- `minion_hub/src/lib/artifacts/builtin/overview/index.html`: `unsupported-marker-language`.
- `minion_site/tests`: `unreadable-directory`.

Root must review the exact current markers, select implementation owners/next gates and add reverse records without overwriting unrelated proposal content. The missing active Site test root must not be substituted silently with the private UI candidate. Oversized extension outputs need a source/generated classification before any exclusion or higher limit. Unsupported HTML comment parsing requires a bounded native-parser extension if selected. None of these conditions authorizes following the observed symlink.

Task2 proposal reconciliation, independent behavior-based closure and the remaining18-02 historical/body dispositions remain open. The checker has an exact-site TODO(handoff) pointing to the existing platform proposal; this report does not mutate that root-owned ledger.

## Current marker locators

Every row remains unregistered until root reviews its reverse declaration. The full JSON receipt retains comment text, forward references and requirement IDs.

|Source site|Exact comment SHA-256|Forward proposal count|
|---|---|---:|
|`minion/extensions/flows/src/data-nodes.ts:176`|`8cb2fcd63800e95f969ff865ebf85654af7e97b8d0635ad1a7928129bc26580f`|1|
|`minion/extensions/flows/src/data-nodes.ts:395`|`00cad2fea6e98699bdb82caa2265e36d31f1098025a0de7229c900173c2d8976`|1|
|`minion/extensions/flows/src/data-paths.ts:213`|`deec8fb4a2a63bc9b467d718cce591613bd2175923bc507e1c96e1c351d3818a`|1|
|`minion/extensions/nostr/src/inbound-dispatch.test.ts:27`|`9cd04df92b89c28a13df06351a8e0f538a1468cd271237d009a74c22ab242cdd`|0|
|`minion/extensions/nostr/src/inbound-dispatch.ts:4`|`1cd8dc04172d1d6bf1a7d840735a21768cee02caf75576891d3813d094fe24e2`|0|
|`minion/extensions/nostr/src/inbound-dispatch.ts:33`|`2d3a7d41593cf8149a0b044ea25b99d349c061dc8823273d99289f30fe454582`|0|
|`minion/src/agents/minion-tools.ts:355`|`b90bb8852a07bfe3059658203aaab17ec06eb00375624323e2ec5561afb79aa7`|0|
|`minion/src/infra/message-ledger-profile.ts:49`|`aa1ea05e745821fe24ff964ed075d4339488edbbdccf9788711e81426ac1f24c`|1|
|`minion/src/infra/message-ledger.ts:134`|`c1e5852e689fa68752780f09b8e30894f901d95babf99c2d572a2455f8c4c1ba`|1|
|`minion/src/memory/sqlite-pragmas.ts:25`|`7d03ada235872cc3ffb4d6ef77ced86a666a6a3e4ff69da861c58e903097a90a`|1|
|`minion/src/shells/manager.ts:616`|`29d3b7e0ee45c4acb3cfcb577861a82fa715ee5b2cb89bbe5213bdd86adf2e8e`|1|
|`minion/src/shells/manager.ts:653`|`a203a10764b2f9716850f0962ab58644b9255fedf7e43a9a60ed9cad9e2af85a`|1|
|`minion/src/shells/manager.ts:949`|`716f46ef2f6ebafdf95f35fd16bd46eabbc3711a2316c2f996545270b11defb6`|1|
|`minion_hub/src/hooks.client.ts:23`|`cb40a8353b687307035010f84b2f12ef1394e417b16317ab6b2b352601cec50c`|1|
|`minion_hub/src/hooks.server.ts:486`|`0c051d23c17cdea4760f3c87a229c97024629ec99104db6e4eab0b927efa0c67`|1|
|`minion_hub/src/lib/artifacts/artifact-bridge.ts:25`|`e6712f378e5de1d2f0e4c8d97192c8c59cc447991075bd2ae421c4086a064ce8`|1|
|`minion_hub/src/lib/artifacts/artifact-bridge.ts:84`|`3545ce336b54fa481f80fa3e4234acc5966c273ae2b757b499e49f3d48151b9d`|1|
|`minion_hub/src/lib/components/charts/Chart.svelte:105`|`b8450c45e986baee2cd7f7690ec406111c5040ddf372ebb41f7c02b2edb9b77a`|1|
|`minion_hub/src/lib/plugins/bridge-protocol.ts:168`|`87aefcdbddb4978a906314062ad76e1a1ebbb706cfa85f6634d747603152a94a`|0|
|`minion_hub/src/lib/plugins/bridge-protocol.ts:186`|`5c2a9eff9f0fcfc9fa12d4407f0e9bb6bb5a6583413ef3feb2ac964193f924ff`|1|
|`minion_hub/src/lib/plugins/compat.ts:71`|`a2a8fa5d936aa1c3e07c3eb36c789766f49e7ac2e1af4ed5991971eea31523e4`|0|
|`minion_hub/src/lib/server/artifacts/builder-prompt.ts:12`|`4aec9f2d4934a2d1160179f35255c33506da33232c71ac0295408994924d8217`|1|
|`minion_hub/src/lib/server/workforce-fetch.ts:74`|`026a8eda2a77197781c56efe3f6ad10f0c951f46c11ca2505444f75923dc89ff`|1|
|`minion_hub/src/lib/server/workforce-fetch.ts:220`|`00c2c65d54fb2d5ce7dcc8e747ceda0422819c72c8531f8ce4658ef3d08e6f48`|0|
|`minion_hub/src/lib/server/workforce-http-boundary.contract.test.ts:218`|`caeecc697ebf7394d072938c2da148281dcbb15f99dd76419b4594283f3c6602`|1|
|`minion_hub/src/routes/(app)/home/+page.svelte:1173`|`715472af6165bb90d5fc7e45f8f8f20464848291a015d7c7525c599bc19bd58f`|1|
|`minion_hub/src/server/auth/assistant-principal.ts:105`|`0e8341212361279509730dc8374f824fc881110bc7eb8e66561520e0f83bc931`|1|
|`minion_hub/src/server/services/assistant-query.service.ts:36`|`9c4f437f37f48b39e7196f23c224d76a41c9738f2199c8914fa38b191a9e4451`|1|
|`minion_hub/src/server/services/bg-runtime.ts:54`|`73ca2f245f4ba5e7a60028e63569eed588cad5501cf7a6ecf100ff1a30aaf55a`|1|
|`minion_hub/src/server/services/brain-business-corpus-jobs.service.ts:134`|`db0fc6c22516d33a5210d8ed691ca21c0e5126998867d7f59fb122d4ae25f637`|1|
|`minion_hub/src/server/services/brain-business-persistence.service.test.ts:20`|`64a5ca661cc6ff62ac7ef342925a2b7f86075286772b765f4ba1bf5ce59b1108`|1|
|`minion_hub/src/server/services/brain-corpus-jobs.service.ts:339`|`db0fc6c22516d33a5210d8ed691ca21c0e5126998867d7f59fb122d4ae25f637`|1|
|`minion_hub/src/server/services/brains.effect-ownership.sql.integration.test.ts:123`|`3756870d5fbc9ca25f307df7713107ef7a590840a71e6cd197a8a518316e67e3`|1|
|`minion_hub/src/server/services/brains.service.ts:1032`|`0ceb8a13d04146ec099ef77a150501e8a795fbcd75f7a534c63ef9ef7b9feed9`|1|
|`minion_hub/src/server/services/brains.service.ts:1055`|`eb925a482cf529eb5787668b9d5d48968919361b798dbff85f8fe4cf8f441e2f`|1|
|`minion_hub/src/server/services/crm-contacts.service.ts:215`|`63e70e69b1f9d2d60b4eb2f65ab59440481fe8b90b7c19b87769da1b72666a7e`|0|
|`minion_hub/src/server/services/crm-funnel.concurrent.integration.test.ts:9`|`675e73d14a7e83b3603ce6d6198084ed3bd7ba336926053f3ae44f54905d6189`|0|
|`minion_hub/src/server/services/crm-funnel.concurrent.integration.test.ts:32`|`e25aaacbb65a6707e74953aaab71826d0b2282ed4e552985baeba73480c998b8`|1|
|`minion_hub/src/server/services/crm-journey.service.ts:44`|`70ab228b1e66ae2f9562e7ad3479d534da1fb3ee8036333e741b18368b8d5521`|0|
|`minion_hub/src/server/services/crm-similarity.service.ts:55`|`70ab228b1e66ae2f9562e7ad3479d534da1fb3ee8036333e741b18368b8d5521`|0|
|`minion_hub/src/server/services/finance-statements.service.ts:160`|`ac4dfebda944ee6d989b4ce048198f4427cb7851447d2605d464976ef17d89cd`|1|
|`minion_hub/src/server/services/finance-statements.service.ts:440`|`57814e2e2acf8e8bcb3b791c8a1afc46051a108c6c06d3f2e685e8d86aca1aca`|1|
|`minion_hub/src/server/services/groupchat.service.ts:389`|`018f0bf6f67a450c80de14bc4728c03da0b059d8b39f4ab761caec95396a68c1`|1|
|`minion_hub/src/server/services/groupchat.service.ts:538`|`0acecc3a974271cfd712a6f7fce4df835b03238202ee0d3b5de02dfc99f2be9c`|1|
|`minion_hub/src/server/services/job-effect-pages.service.ts:92`|`6710e43635ecdc4f281f6dbe2dd0af8e9ec927b9274942b01e9ae7b6eb990e93`|1|
|`minion_hub/src/server/services/job-effect-pages.service.ts:235`|`719f37b83614529376e632ffa089d827429226fb27e23837fee22ca85eb12460`|1|
|`minion_hub/src/server/services/job-effect-pages.service.ts:274`|`63cc91c1e55bad77f79f1dc744d8dbfdfb7e9230ab197a0b941f5e80f0738b68`|1|
|`minion_hub/src/server/services/job-effect-pages.service.ts:535`|`66fd5fccefe8c527836f29d3dcf58b3ae4ce93b832f64575e4ddaca5170a88ff`|1|
|`minion_hub/src/server/services/job-effect-pages.service.ts:538`|`568e91dfafba3f1eef5042f20d68fb8d2b6f3d32582707aeed06170517daea7f`|1|
|`minion_hub/src/server/services/job-effect-pages.service.ts:602`|`9cb924a76e77eefdf01c4533106eedb91b7179234b15ed4fc1d4b350575a187a`|1|
|`minion_hub/src/server/services/job-effects.service.ts:437`|`d43677d0dada1cc5bf07fbd6e4529898bac77b43db581011facdf5330557b168`|1|
|`minion_hub/src/server/services/job-effects.service.ts:711`|`605df826929680f6ea0e034c98fe5bf4a140181f0771d2c325ae8747cb2e60f1`|1|
|`minion_hub/src/server/services/job-stock-concurrency.sql.integration.test.ts:513`|`f668629e51fe3610e2b15a6c25d433b1fe8f1b602da5e772ea9c01dd4975de3f`|1|
|`minion_hub/src/server/services/pos.service.ts:1393`|`f5d52d7d97e51edf883235455297d5560c0568309e7a968847187f0d2ff4a64d`|0|
|`minion_hub/src/server/services/pos.service.ts:1407`|`34049cea9c51fd875212de255dbbece5abe47443c619d2651b233ffd2208d417`|0|
|`minion_hub/src/server/services/stock.service.ts:1712`|`c58543b4f79542001e7445342d2c6238814ffda42fedcb00f24c1fb174df6748`|1|
|`minion_hub/tests/dependencies/security-compatibility.test.ts:1`|`eb2640afb6f046baf2f43f24c529cdd88da955a2d5a6541a49cccabe22d5f7a1`|1|
|`minion_hub/tests/e2e/ui-audit/certification.ts:174`|`7a2bd6d070fefedfcb38007295ba01844f8bf47a47a5bdcb9f0c88ed783a4849`|1|
|`minion_hub/tests/e2e/ui-audit/route-audit.spec.ts:189`|`fd2e6b2170083af84818ad14ae80cc70fd50efbec87b448ce8bc431819f5cde9`|1|
|`packages/cli/src/index.ts:25`|`253d5f847deded6832ae28f17a80b0fffa78614589b3011a01069445a0dee627`|1|
|`packages/shared/src/gateway/client.ts:36`|`509129b424fcbf168ec2252e5fc103ed08aa5dc87dc5b081feb6785e4d1a827c`|1|
|`packages/shared/src/gateway/client.ts:60`|`10c46dd63bdc537de3c86434190a7cd8f1f6ad18aa3c738b4a480208be176f81`|1|
|`packages/shared/src/gateway/client.ts:194`|`dbbaef1ae1b9e6b6dc924d39ffb515cdc23c247c247aac343afac5a559834204`|1|
|`packages/shared/src/gateway/client.ts:307`|`ca707d971afb47e738854f909a265e646cf1289d9c72c819cd2047b64fa978ec`|1|
|`packages/shared/src/gateway/shells.ts:36`|`8112f8c1a4fc806e5d8cb8cacdf747c09036bb7f92741ca3f72d146781485d70`|1|
|`packages/shared/src/gateway/shells.ts:59`|`97f60582668e758124bace4234ff6a84b589380aee50da098c6a43a1329de0fb`|1|
|`packages/shared/src/gateway/shells.ts:233`|`84ea8f78f9f904be42f2251633bdb747476a447d9dec251b703757e241cbcd57`|1|
|`packages/shared/src/gateway/shells.ts:599`|`69320153897b6d49d2677974497ab8099ed5f964f5ade99b7d437fa2a8ce91a7`|1|
|`packages/shells-bridge/src/acp-client.ts:88`|`0dac8aabe51eda22b7dfb95db722d5cb9c64821e144f9e76e5bc6c5130a57c8d`|1|
|`packages/shells-bridge/src/bridge.ts:145`|`93ed3c23384260b287cf6f72c1cb07a36c99142e29ef869084336aeb2dab9774`|1|
|`packages/shells-bridge/src/bridge.ts:306`|`a32f779251ebf152ef7da0660e5f03c6ba0c5a20159eaa31c0adcaab1d0432f8`|1|
|`packages/shells-bridge/src/bridge.ts:376`|`17319143a69e790ea7dc1cd20cbbbf2461f6fb1aad63e4769c2577c0bdb6ca57`|1|
|`packages/shells-bridge/src/bridge.ts:394`|`54b5c7c84da544fe31703b9891cc356e5f1ae33de58499a5b46615a95eeec4b3`|1|
|`packages/shells-bridge/src/config.ts:63`|`f86ce3e0f9b8142ebbd936b532a10703069b17b7925fb00cd83e643c0394fb50`|1|
|`packages/shells-bridge/src/run-journal.test.ts:120`|`8a6a874878a87a7fb8dc9029e331fade5ec26efaf6734136151f3ceeaeab4a40`|1|
|`packages/shells-bridge/src/run-journal.test.ts:215`|`4270dc4b8fa13625f5b632bcd2b1c32fc843c2998b996c64b231a09ab5813381`|1|
|`packages/shells-bridge/src/run-journal.ts:54`|`8fb4eafccaaea96098606b29728fd892fd95f039d7eb4cc54b2ad0a05b7098cf`|1|
|`packages/shells-bridge/src/run-journal.ts:198`|`8ab06aebc4eca68f2ce4360f793e85bf8157d14c8735e108a5913274c34dc39b`|1|
|`packages/workforce-client/src/client.ts:276`|`2085cd02ac5e2f8ae45789581c65275f82164296724ef459036cf4eb575ae800`|1|
|`packages/workforce-client/src/client.ts:287`|`d2de1cb0398359d1015661c09681779f7abdfdb0216f7c412a119cb82f991144`|0|
|`scripts/qc/handoff-ledger.mjs:271`|`fab388657f78f900bed725b514a62c7ef5a425f1d7cccb175afcba776a610d92`|1|
|`scripts/qc/proposal-requirement-map.mjs:132`|`a345f6222e34d8cbf2bf755ceac89371e127b47f45b092aa6af11224bd8b8860`|1|

## Exact identities and saved receipts

- `scripts/qc/handoff-ledger.mjs`: `d46371b45781cddf51efd7bed55c035101ff3a8106ff1a436424a53aae6d67f5`.
- `scripts/qc/handoff-ledger.test.mjs`: `b0d9ad899600796f68117b80387bcd475c67e7402fc7a9d2f25d6bb5bf54e1f2`.
- `.planning/REQUIREMENTS.md`: `c1f57863ab26309c2e2bdab97c665484b9545cece38b76cca80a612a8db775ca`.
- Full current inventory: `/tmp/minion-18-03-Vyrv112m/current-check-final.json`, SHA-256 `70504b4e7ef9b009fa95451dac1510fd3512ba72ac0d39f55485d64b3270412c`.
- Native tests: `/tmp/minion-18-03-Vyrv112m/tests-final.log`, SHA-256 `b3d43b68582e58503258eb27f9751ebae84e6e6a810d4f77972a39555d6b00ea`.
- Earlier red/setup inventory and native test logs remain under `/tmp/minion-18-03-Vyrv112m`.
- typescript 5.9.3: `/home/nikolas/Documents/CODE/MINION/node_modules/.bun/typescript@5.9.3/node_modules/typescript/lib/typescript.js`, SHA-256 `3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675`.
- svelte 5.56.3: `/home/nikolas/Documents/CODE/MINION/node_modules/.bun/svelte@5.56.3/node_modules/svelte/compiler/index.js`, SHA-256 `304ef60f002d9415ea7c1507c3289f361b8dc70502eb2fce619c3dc5581803e7`.
