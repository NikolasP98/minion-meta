---
id: 2026-11-12-agent-release-forward-base-spec
title: Restore working runners while qualifying the agent release on fixed main D585
stage: dev
status: implementing
pass: 2
verdict: approved
created: 2026-11-12
updated: 2026-11-12
repos: [minion, minion-meta]
proposal: 2026-11-06-agent-transcript-evals-and-runtime-improvements
type: fix
tags: [security]
---

# Restore working runners while qualifying the agent release on fixed main D585

## 0. Product

This separate addendum keeps the scoped agent release in existing [production PR369](https://github.com/NikolasP98/minion-ai/pull/369). It preserves the [portable-source contract](2026-11-11-agent-fixture-audit-portability-spec.md), exact SHA256 `50bfca977144d4c0083a62337ee39b703bab632a673159bd039cd4f54d34b5d2`, and [R8 contract](2026-11-12-agent-current-attempt-output-spec.md), exact SHA256 `cccf3f844a8c60faa37e1c40e03cbe624b72aed32ff94cb7491dff5039cac462`. It changes neither signed historical document.

The existing owner authorization for live scoped fixes covers this necessary bounded upstream compatibility and restoration of previously working GitHub-hosted runners. Normal existing automatic publication remains explicitly authorized. This contract grants no general workflow, infrastructure, scanner or account authority. Independent pass1 and root pass2 review the bounded implementation scope; normal signed contract state and applicable existing approval/merge authority remain prerequisites for implementation. This metadata contract itself performs no product/source/pipeline action.

## AS-IS

Actual upstream [PR374](https://github.com/NikolasP98/minion-ai/pull/374) landed on main as **`d5856c3dac3f804b9f0b178848971cf8255d9171`** (D585). Its ordered parents are `50a3036ad7fac23710943e7eeadfe66b38d96fcd` (main50), `ca2f57d320ce297805b43fd7c851d55574f9fcaa`; its tree is `b0d29dc12759b832c0f1dc4a1cd32d24e4d94080`, matching the migration head. Its first-parent change is exactly the21 workflow paths in the table below. D585 baseline remains old blob `b3d83ed3f2bfc2c01e8fe1f57ce8e3cb8fd9f45a`.

The migration selects Blacksmith runners. The owner reports that Blacksmith does not support this personal account; root observed actual main Docker run43143007588 queued on its Blacksmith first job without an assigned runner. This establishes a current release availability obstacle, not passing qualification of the migration. Existing main50/base and EB0d5 workflow checks cannot validate a PR whose actual current base is D585. A literal merge would also retain five old-main50 hotfix admission pins and leave required PR369 lanes inert.

The scoped application history includes main50, fixed anchor `eb1de47f2384cec2785d729980170142097b8d2b` (EB), adoptionEE6 and normal signed native R8 fix `e76856acb8e811dc821fa5bd2963b1411cc197ce`, plus subsequent native R10/fix commits. Preserve every actual native commit, including corrective/restoration history. Root retains custody of the official native run. Current native head is **`f7c545f571e845f8ecdabf166dfe3bbc8df48016`**, recorded in `.local/agent-chat-fixes-2026-11-10/current-attempt-native-runtime-corrected-freeze.json`. It retains e768 and the subsequent native corrections/restoration history. Corrected-freeze SHA256 is `1740b609b29dc9cd2d0ff51aa670cfdd1ac8816a27d910a5714899443e78e463`. Exact future combined external PR373 source qualification remains pending; the known native freeze does not establish current main CI or deployment completion.

Two earlier approaches are obsolete and provide no implementation authority: preserving Blacksmith in candidate blob3ae070..., and a standalone infrastructure rollback PR. The latter cannot satisfy the existing main admission without another exception. The approved design below uses only PR369's existing bounded route, restores prior runner/action bytes and rebinds that route to one fixed actual base.

## TO-BE

The frozen annotated pair is CIb176 and main-local testeb164. Independent execution of the exact annotated pair passes **84/84** main consumers. Root and independent actual detect-secrets1.5 with unchangeded4 pass status3 with no findings; root's oxfmt and exact known-comment/raw-byte derivation checks pass. These are local qualification receipts, not actual current GitHub CI or release proof. Exact-hash two-pass approval and normal signature remain implementation prerequisites. Historical unannotated5113/d110 passed84/84 consumers but failed the scanner; those earlier bytes provide no implementation authority.

### One fixed base and native history-preserving merge

Use only same-repository PR369, branch `hotfix/agent-chat-guardrails-20261110`, targeting exact main D585. Independently prove actual D585 repository/PR374 identity, ordered parents, reviewed tree and exact21 workflow-only first-parent delta. Require D585 to be an ancestor of the final candidate. A later main base makes this particular exception inert until separately reviewed; no floating base, caller-selected anchor or generic forward-base rule is admitted.

Through its official root-directed fix protocol, the native process normally merges **exact D585** into the current native application head, preserving all main50/EB/EE6/e768/R10/fix history. Record the actual normal merge parents and current source identities externally. Do not rebase, squash, reset, take over custody, manually edit pipeline-owned source, or silently discard later native fixes. Resolve the CI conflict to the exact restored candidate below; do not describe it as a clean literal merge. The twenty other workflows must be restored byte-exact to their prior main50 values.

### Exact restored CI and five admission rebindings

The final production `.github/workflows/ci.yml` must have Git blob **`b17609e045af571f9347583188a80449d3cbd299`**, SHA256 **`ac5a703e8f59ae640d7e9ef9643cb53ac9556fdd517ddf8542f7c3ceb94adbe9`**. Root's candidate is `.local/agent-chat-fixes-2026-11-10/current-attempt-restored-ci-candidate.yml`.

Derive it byte-exact from original EB CI blob `13a82c460007d0c7e0c83880ba9c2c7c3bd9feff`, SHA256 `0d5cb187dd6fcccda8590714da3a6c179cf2018e56e4ace653618e13014196e4`, by replacing exactly five existing main50 admission SHA literals with exact D585 and adding only the five fixed public-pin annotations below. The five checks occur at old EB lines34,474,619,654,1412. These are existing hotfix admission conditions, not new bypass channels. The only added CI comment text is `# pragma: allowlist secret -- reviewed public main commit pin.` at exactly the three existing YAML block headers and two shell-check owner lines. The only added test comment is the correctly indented `// pragma: allowlist nextline secret -- reviewed public main commit pin.` immediately before each of its two fixed constants. Strip ONLY these exact seven added comments to recover raw EB bytes with the five/two SHA rebindings. Do not strip other comments or normalize arbitrary workflow/test content. These annotations identify a proven public commit, not a credential; no wildcard, detector setting or baseline entry changes. Every runner/action, trigger, permission, script, other condition, token binding and full-hotfix lane selection otherwise remains identical to EB. Exact annotated-byte identities and unchanged YAML/script semantics are required before approval. Do not copy D585's Blacksmith CI or retain candidate3ae. Original0d5 remains the immutable derivation input; it is not retroactively rewritten as the final workflow.

### Closed workflow content table

Evidence is `.local/agent-chat-fixes-2026-11-10/current-attempt-restored-annotated-base-proof.json`, SHA256 **`b010819614e63296ec83be2f39c205b82cc633315b7c97478622312d9a537420`**. The table binds main50 old bytes, actual D585 migration bytes and exact final expected bytes. Only CI differs from its main50/EB production input; all twenty other final files equal their old main50 values.

| Path | Main50 old blob | Actual D585 blob | Required final blob |
|---|---|---|---|
| `.github/workflows/auto-response.yml` | `b22b5641d5a4f73dd14bfde7c65555b3549e14a7` | `6bddc2fdc7674381ac25ede9d022691ae980bf4b` | `b22b5641d5a4f73dd14bfde7c65555b3549e14a7` |
| `.github/workflows/ci.yml` | `3e5ff1c199d85d8a02cc38c7fbec96fcdc96ef48` | `c23e7d76eb29c440d9c8074870da9604f344c731` | `b17609e045af571f9347583188a80449d3cbd299` |
| `.github/workflows/claude.yml` | `9471a0591de36ca20ab974144e773510bffe15e5` | `9aa738a5193856fa44bebe28058bec538b921e25` | `9471a0591de36ca20ab974144e773510bffe15e5` |
| `.github/workflows/deploy-brain-vector.yml` | `8120d67785ddbd9996d275d61387146954b1edf2` | `0129cf912123d0802d2ed47e0a295435e0e9573d` | `8120d67785ddbd9996d275d61387146954b1edf2` |
| `.github/workflows/deploy-production.yml` | `b1b67a97bc425ff5a43155384a0601ac6236cbc6` | `1d61bd66cc2b4adc8970ab7f778d83e467b59850` | `b1b67a97bc425ff5a43155384a0601ac6236cbc6` |
| `.github/workflows/deploy-workers.yml` | `afa54b8ccf469aafbc41c1d66acdfc3da52696c9` | `593b292da8ca046d014a1cad1163c6e8c2ee77fc` | `afa54b8ccf469aafbc41c1d66acdfc3da52696c9` |
| `.github/workflows/docker-release.yml` | `2e9f9e90b087e2e05d25a7346572744a0694c31b` | `9811ee06aa5afc7d4e7782b917e74bbb32f89fcc` | `2e9f9e90b087e2e05d25a7346572744a0694c31b` |
| `.github/workflows/factory-notify.yml` | `240cdee7217562aff4867852ccb5c9e419f3001e` | `d78cc3b7915236a7777c339c7d455695a4c2d9a5` | `240cdee7217562aff4867852ccb5c9e419f3001e` |
| `.github/workflows/install-smoke.yml` | `c2113f3741af21b72eaca5c5a57f5a9b203bf2d0` | `e31df32cbe7a13885b10a09c1eb46792dc6ef662` | `c2113f3741af21b72eaca5c5a57f5a9b203bf2d0` |
| `.github/workflows/labeler.yml` | `aad549b000b51512dba4d4f2024eb9bf51ce3b06` | `f59ca651ea412c4fdb7049277552c2213170d3f6` | `aad549b000b51512dba4d4f2024eb9bf51ce3b06` |
| `.github/workflows/migrate-brain-vector-per-org.yml` | `b112925c4805b0d12a6ebec139353c0d180014c0` | `b9d50591f1c154c89ca51207256baa3fc27d5d5e` | `b112925c4805b0d12a6ebec139353c0d180014c0` |
| `.github/workflows/nightly-full-platform.yml` | `42e7fcec47d77bf1e259e96cb930ad48cda7f01f` | `3efe4ab8618bd53a23beafe82b57a0c3c8caa92a` | `42e7fcec47d77bf1e259e96cb930ad48cda7f01f` |
| `.github/workflows/npm-publish.yml` | `f39feaba246ae43b125d0e988191590442bc5cc5` | `b9742acc86b8b1836d6b3c1406a045efa1104078` | `f39feaba246ae43b125d0e988191590442bc5cc5` |
| `.github/workflows/plugin-ui-dist-check.yml` | `a6c0dd6f206250b2b1cd3e46caee28563ea28286` | `efdfda3b091fde3dc1169d73d6a23bafd5dc7f4e` | `a6c0dd6f206250b2b1cd3e46caee28563ea28286` |
| `.github/workflows/sandbox-common-smoke.yml` | `3161ca9e21a232299ce7f3019daf91542fed7d92` | `c7e93752526a05d5d0844bb4d19efc5f3e67bfb7` | `3161ca9e21a232299ce7f3019daf91542fed7d92` |
| `.github/workflows/stale.yml` | `655a4c587833077c72aa690ddde934a23b12a276` | `876ead7c5d84a48913a05b50e0d141cfdb7bb64e` | `655a4c587833077c72aa690ddde934a23b12a276` |
| `.github/workflows/swarm-rollout.yml` | `41fc82b89d9b1f9101ae42aecf88c9caf5ed942b` | `cdfd91d35b31a8d51bf8ca6cf475dcb13e8cb7be` | `41fc82b89d9b1f9101ae42aecf88c9caf5ed942b` |
| `.github/workflows/upstream-cherry-pick.yml` | `68e60e63b1a0174f9202849061f5786efab45129` | `ca385bbadec37b53f87776bf035c3c7b63d3480b` | `68e60e63b1a0174f9202849061f5786efab45129` |
| `.github/workflows/upstream-copilot-resolve.yml` | `eedaf71575d89e7e5c36f30ee9f93720383ce699` | `cb65c85364773a70eb191e5da27119b5ffa296a7` | `eedaf71575d89e7e5c36f30ee9f93720383ce699` |
| `.github/workflows/upstream-monitor.yml` | `caf07448c4d55c9dd72510853e5506b784f3bfa3` | `54653598e4f5bf2980a592104454b3a8c9875f18` | `caf07448c4d55c9dd72510853e5506b784f3bfa3` |
| `.github/workflows/workflow-sanity.yml` | `cf3294a09a41048965a9aa4436016dfa1d81563a` | `4ecd8250ff9c13af6f6049015854798112b87a65` | `cf3294a09a41048965a9aa4436016dfa1d81563a` |

The workflow table grants no general workflow exception: independently verify all21 final expectations, but compare the final tree to fixed EB. Its allowed net postEB delta is **only the11 qualified PR373 runtime/proof paths plus `.github/workflows/ci.yml` and the exact main-local `test/ci/ci-workflow.test.ts` correction below** (thirteen-path upper fence). The restored twenty workflows have zero net delta from EB. Reject any other path, any changed restored file, CI bytes other thanb176, or main-local qualification-test bytes other than the pinned candidate below. Merely belonging to the table is not permission for an arbitrary workflow edit.

### Exact main-local consumer correction

Independent execution of the restored CI against the existing main qualification consumer reproduced **79 passing and5 failing cases of84**. Its two positive-fixture `approvedBase` literals still name main50, causing the exactD585 admissions to reject them or select smoke rather than full-shard lanes. Evidence: `.local/agent-chat-fixes-2026-11-10/current-attempt-combined-independent-probe/evidence/restored-ci-existing-consumers.log`. This is a local compatibility failure, not failing product runtime or actual GitHub CI.

Permit exactly **two** main50→D585 `approvedBase` literal substitutions in **`test/ci/ci-workflow.test.ts`**, from immutable EB blob **`52ff4d9ce1dcff5f80611d4c8f5f78c496a8baae`** to exact candidate blob **`eb164dff4994888da3b0f4b1fd1ffc6d0d5c1927`**, SHA256 **`aab44a9a7ab5c3f4f9ff7902dd37dfcc09e7d3140a2c47a33af5b9646bf2e74c`**. The exact final pair includes only the two root-frozen, correctly indented nextline public-pin annotations on those constants; no other test assertion changes are admitted. Root's final annotated candidate is `.local/agent-chat-fixes-2026-11-10/current-attempt-restored-ci-workflow-test-candidate.ts`; derivation proof is `current-attempt-restored-annotated-pair-proof.json`, SHA256 `5fe5d9c5ec9711fad7f889acc117782e0c1664b6cc4c1b2be850b0047977806d`.

This is a separate main-local qualification artifact attested by this normally signed metadata contract. The official native fix may author only that exact candidate, without additional runtime changes under this addendum. External DEV373 must **not** copy this whole main test or add a twelfth source path. Its existing bounded helper/manifest may encode the exact main-local old/new test identity from this contract and reject all other test bytes; the historical seal remains immutable. The exact annotated CI/test pair independently executes all84 main consumer cases successfully. Preserve the original79/84 RED evidence and the separate unannotated84/84 result as historical controls; only the final annotated84/84 execution and scanner proof qualify these pinned bytes locally.

### External PR373 proof remains bounded

External [PR373](https://github.com/NikolasP98/minion-ai/pull/373), branch `fix/current-attempt-output-qualification` from fixed canonical DEVCC90 `cc90bffde6033d8b6540464006b914905784500e`, retains the11-path ceiling in its signed R8 contract. Its DEV workflow remains original874; do not add the21 production workflow files to that source PR. Its helper/test/patch manifest may encode this closed forward-base contract, fixed D585 parent proof, exact restored workflow table, exactb176 production CI and exact main-local eb164 qualification-test identity. No runtime/proof path outside those existing11 is authorized.

After exact native runtime bytes are available, qualify only their closed touched subset and bounded five proof files through independent exact-content review, actual DEV CI and authenticated normal landed-source proof. Verify actual source head/merge/ordered parents/tree/base-to-head ancestry, canonicalDEV ancestry and original9ce/372 history. On the native/production candidate the previous CI proof remains unchanged until that external qualification is available; external DEV373 may implement its bounded proof before qualifying itself. R11 or its equivalent external-source prerequisite remains ERROR until the real source requirement is met. Do not dismiss, waive or auto-approve it because other review or runtime tests pass.

Then the official native fix may adopt only those exact qualified proof/runtime bytes, perform the fixed D585 merge/restoration and exact main-local test correction above and continue normal qualification. Preserve the complete native history and all eleven exact source-content identities and the two independently pinned main-local artifacts. A forthcoming head/merge SHA is recorded in the release ledger after creation; never require a commit to contain its own SHA or silently reset EB to that future head.

### Classification, publication and approval boundaries

Keep original audit9ce, baseline `ed4a93bd4345f72ea1eeb43a744600e8121f54d9`, original seal `a0c053d4f289687ff140b383be60b42f9c4abc14`, historical PR372 source and original PR334 baseline-pair tests immutable. D585 is a fixed workflow-only base change, not another baseline expansion. Preserve all scanner settings, historical snapshot scans, fatal statuses, transient-secret detection and origin/proof bounds. There is no generic label, token, local preloader, administrator waiver or scanner skip.

No organization migration, Blacksmith installation, credential/service-permission change, repository flag, added main trigger, new PR admission exception, manual version bump or broad DEV promotion is authorized. Existing automatic npm publication follows the owner's explicit authorization; record its actual result independently. Independent review does not replace applicable human security/data approval and merge gates. Any consequential scope outside this exact restoration remains outside the existing consent; prepare that concrete expansion before asking for a new decision.

## DELTA and verification

1. Independently verify fixed D585 actual source/parents/tree and the exact21 old/migrated/restored rows. Recompute final CI and main-local test from raw EB inputs with exactly five/two fixed50→D585 admission substitutions plus only the five/two fixed public-pin annotations; prove exactb176/SHAac5 and eb164/SHAaab identities. Require actual unchangeded4 scanner, format and consumer proof on that final annotated pair. Confirm no Blacksmith migration scalar or other unreviewed change remains. Preserve obsolete pre-restoration proofs as historical evidence only.
2. Complete independent pass1 and root pass2 of this exact contract and normally sign its committed state before code changes under it. Preserve earlier50bf and R8cccf contracts and every unrelated metadata artifact. The source worker remains inside PR373's11-file fence; the native process remains the sole production source author.
3. In real temporary Git/API consumers, exercise actual DEV and restored-main projections. Positive fixedD585 cases must reach scans and full-hotfix lane selection. Wrong/missing D585 ancestry, parent/tree/repository/base, moved base, altered restored workflow, wrong CI including old0d5/unannotated5113/obsolete3ae, wrong main-local eb164 test bytes or extra source/net path, corrupted/unavailable source proof and changed baseline must reject. Verify no unqualified external prerequisite is accepted. Preserve normal DEV/feature behavior and strict same-repository hotfix identity.
4. Require exact forward-base workflow admission and both complete production Node shards, security, build and applicable runtime jobs. Inspect actual executed steps and scope skips separately. Execute the exact main-local84-case consumer and the source/adoption suites. Its two pinned base substitutions plus exactly two frozen public-pin nextline annotations are the only added test authority; every test edit beyond the closed11+CI+eb164 net fence requires an explicit reviewed amendment. Do not silently widen it to make a test pass.
5. Scan every retained application and merged changed-file snapshot using actual detect-secrets1.5 and unchangeded4, including the reviewed50..D585 migration input and final production range/merged history. Preserve scanner status3 bookkeeping semantics, distinct fatal-failure statuses and unlisted/transient canaries. No new finding may be hidden as a runner migration fixture.
6. Verify the actual native normal D585 merge and restoration, exact qualified373 adoption and preservation of every native commit. Require fresh exact-head PR369 full/security CI, tested virtual/actual merge ordered-parent/tree equality, actual Docker Release and automatic publication, immutable deployed image/source and bounded runtime receipts. Queued/unassigned runner jobs are not execution proof. Preserve the separately preexisting WhatsApp QR-authentication limit and distinguish software-live from universal channel health.

## Out of scope

No standalone runner rollback PR or new CI exception; no Blacksmith forward candidate3ae; no arbitrary workflow exception, base/anchor reset, source-history rewrite, original baseline expansion, trigger/permission/credential/flag change, organization/account migration, manual publication/version bump, unrelated application change, LIVE/REMOTE model call or business write/message. This contract itself changes no source or pipeline state and approves no deployment.

## Open items

Normal signed contract state, external PR373 content/new-source freeze/CI/landing, official native fixedD585 merge/restoration, full current main CI and actual publication/deployment/runtime evidence remain open. [The existing proposal ledger](../proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md#fixed-d585-runner-restoration) tracks them. Any deferred source work must retain its exact-site handoff pointer through the authorized source owner; this metadata contract adds no product comment or pipeline action.
