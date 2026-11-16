---
id: 2026-11-11-agent-fixture-audit-portability-spec
title: Qualify portable audit fixtures through an exact technical source
stage: dev
status: implementing
pass: 2
verdict: approved
created: 2026-11-11
updated: 2026-11-11
repos: [minion, minion-meta]
proposal: 2026-11-06-agent-transcript-evals-and-runtime-improvements
type: fix
tags: [security]
---

# Qualify portable audit fixtures through an exact technical source

## 0. Product

This narrow addendum extends [the reviewed fixture-audit contract](2026-11-10-agent-fixture-secret-audit-spec.md) to correct its production test qualification. It preserves the original classification authority, baseline and scanner semantics. The two-pass reviewed contract permits only the bounded five-path implementation after this approved state is normally signed. Independent exact-content qualification and applicable merge authority remain required before adoption/publication.

## AS-IS

Hub PR651 is live at `523ca2e934e93d0fc0d6f7d052c94694b86553b6`. Gateway audit PR371 landed on canonical DEV at `9ce4a18b4dd3d264c73a714f0d5b80c2eb995da1`; application PR370 subsequently landed at `70414b7dddbe8967d2a7b8afa0097e8acbbd683a`. Neither establishes a production Gateway release.

An independent exact-source run of production candidate `722bf4b5b500a6b56af56dec0fbb81f7531ab43d` reproduced five audit-consumer failures: the audit/security subset passed52 of57; the full three-file invocation passed136 of141. The synthetic historical PR371 copied CURRENT main workflow bytes, SHA256 `0d5cb187dd6fcccda8590714da3a6c179cf2018e56e4ace653618e13014196e4`, where historical PR371 requires DEV workflow blob `874168d42f5eca37e7d1abfe73ec58d4217c1db1`. The guard correctly rejects the invalid fixture. Scanner-status86 and5 cases reject earlier with1, so unrelated negative passes do not qualify their intended boundaries. This is a confirmed test portability defect, not a demonstrated runtime authorization bypass.

The terminal production gate ended on a normal document-commit signing failure. Official custody recovery preserved final application/test-cleanup anchor `eb1de47f2384cec2785d729980170142097b8d2b` (EB). Original application head `2696ef68f3d73851cb6dac678d0036bc18361952` is its ancestor. EB archives the old test and DEV workflow and removes six main-only assertions from `test/ci/ci-workflow.test.ts`. It does not by itself qualify new consumer bytes against the unchanged original371 seal. A proposed report correction describing prelanding statements as historical was not committed by the gate; it must be reproduced and attested in the external technical source.

Private evidence: `.local/agent-chat-fixes-2026-11-10/production-audit-test-probe/{report.md,followup-plan.md,evidence/source-pin.json,evidence/results.json}`. The four complete changed blobs at EB were separately scanned with detect-secrets1.5 against unchangeded4: exit3 for line-number bookkeeping, no findings. This is not a final-history or CI receipt.

## TO-BE

The current consumer proves two independently landed sources: fixed historical371 classification data and one exact canonicalDEV technical follow-up. It must not require CURRENT revised test/helper bytes to equal historical371 bytes. No original371 identity is regenerated around a changed test.

### Immutable classification source

Original merge `9ce4a18b4dd3d264c73a714f0d5b80c2eb995da1` retains ordered parents `d3e0fbf54fc657521df07c896ea7adce5ba1afcd`, `3b5379322fb2be56e65d7164d8fd5d5009ee7e8b`. Preserve baseline blob `ed4a93bd4345f72ea1eeb43a744600e8121f54d9` (ed4) and original content-manifest blob `a0c053d4f289687ff140b383be60b42f9c4abc14` byte-exact. The46 independently classified tuples remain the sole classification expansion. Preserve all existing detector settings and original PR334 baseline-pair proofs. Original371 history, approval, finding inventory and sealed manifest remain immutable.

### Exact technical source and explicit adoption paths

Use one ordinary narrow DEV follow-up after PR370. **The fixed technical source is [PR372](https://github.com/NikolasP98/minion-ai/pull/372), branch `chore/portable-agent-audit-consumers`, based on canonical DEV `70414b7dddbe8967d2a7b8afa0097e8acbbd683a`. No other or caller-selected PR is admitted.** Before implementation, fix the PR/branch, closed path set and old input blobs through two-pass contract review. New blobs do not exist yet: independently freeze their exact identities and the separate manifest after implementation and before source qualification/adoption. Missing final identities block qualification/adoption, not implementation already authorized by the approved bounded contract.

The proposed technical path list is closed to these paths:

| Path | Permitted transition |
|---|---|
| `.github/scripts/agent-fixture-audit.mjs` | Historical371 data proof plus exact separately landed technical-source proof |
| `.github/scripts/agent-fixture-audit-patch-manifest.mjs` | New separate technical patch manifest; exact path fixed here |
| `test/ci/agent-fixture-audit.test.ts` | Portable three-source Git/API graph and boundary-specific assertions |
| `test/ci/fixtures/pr371-ci.yml` | Exact archived historical DEV workflow blob `874168d42f5eca37e7d1abfe73ec58d4217c1db1` |
| `docs/security/2026-11-10-agent-fixture-findings-audit.md` | Label original prelanding wording as historical and document this bounded technical qualification |

These five paths are the complete technical patch scope; no additional helper archive or fixture FILE PATH is admitted. Immutable historical input bytes may be embedded as deterministic fixture data inside the existing adopted test, with assertions of each original Git blob before use.

Those bytes must represent the fixed DEV70414/EB inputs and must work without fetched objects in shallow checkouts; copying changed CURRENT files or remapping test-only blob identities cannot manufacture the fixed old inputs. This allowance adds no file path and no authority to change the historical inputs.

The CURRENT-file prohibition applies only to impersonating historical371 or old DEV70414/EB inputs. The latest synthetic technical source uses the actual current five candidate files and expected-new-blob manifest as its own bytes. Bijective public COMMIT-SHA aliases may represent the synthetic real-Git graph; FILE-BLOB aliases or remapping are forbidden. Actual old input bytes must hash to their stated blobs.

Preserve `.github/scripts/ci-security-scope.sh`, `.github/scripts/agent-fixture-audit-manifest.mjs`, `.secrets.baseline`, `test/ci/security-scope-workflow.test.ts` and `test/ci/fixtures/pr334-baseline.mjs` unchanged. EB's archived original-test path `test/ci/fixtures/pr371-agent-fixture-audit.txt` remains byte-exact (`a6d981e59aedab144fee95c5a386564c472436a9`) in the main anchor and is excluded from the DEV technical patch. The current consumer treats original9ce as fixed historical data, so it need not execute an archived helper or present current bytes as original371.

The preimplementation old-input table is fixed below. DEV input is actual PR370 merge `70414b7dddbe8967d2a7b8afa0097e8acbbd683a`; main input is EB. `absent` means the path must not exist. New blobs are independently recorded after implementation, with both transitions preserved.

| Path | DEV old blob | EB old blob |
|---|---|---|
| `.github/scripts/agent-fixture-audit.mjs` | `4b7d03d503746469375b288c5a8b60f4f18bc366` | `4b7d03d503746469375b288c5a8b60f4f18bc366` |
| `.github/scripts/agent-fixture-audit-patch-manifest.mjs` | absent | absent |
| `test/ci/agent-fixture-audit.test.ts` | `a6d981e59aedab144fee95c5a386564c472436a9` | `71070006aa0760bbb56784f26cd1b627466cfcaf` |
| `test/ci/fixtures/pr371-ci.yml` | absent | `874168d42f5eca37e7d1abfe73ec58d4217c1db1` |
| `docs/security/2026-11-10-agent-fixture-findings-audit.md` | `2e3dc3af1e51f10f605837a34656d87c93f5df11` | `2e3dc3af1e51f10f605837a34656d87c93f5df11` |

The separate patch manifest identifies the exact repository, fixed new PR/branch, original9ce/seal/ed4, and every adopted path with its old/new Git blobs (explicit absence for additions/deletions). Compare the manifest itself byte-exact to the actual landed technical source; do not make its own blob a self-referential entry. Compare every enumerated adopted file with its landed source and reject extra/renamed/uncommitted edits or source-PR scope. Unpatched original sealed files remain byte-identical to9ce. The manifest must distinguish original9ce→technical-source transitions from EB→main-adoption transitions where EB already contains archived fixtures or a revised test.

### Production anchor and workflow

Keep main base `50a3036ad7fac23710943e7eeadfe66b38d96fcd`, production PR369 and branch `hotfix/agent-chat-guardrails-20261110` fixed. Preserve the complete2696→722→EB history. EB is the exact immutable application/test-cleanup anchor; the main-only six-assertion cleanup is already in EB and is excluded from the DEV technical patch. Prove2696 ancestry and actual ordered merge parents. From EB, the only adoption delta is the exact externally attested technical path subset and patch manifest.

Keep main `.github/workflows/ci.yml` byte-identical to EB: Git blob `13a82c460007d0c7e0c83880ba9c2c7c3bd9feff`, SHA256 `0d5cb187dd6fcccda8590714da3a6c179cf2018e56e4ace653618e13014196e4`. It already contains the bounded token binding. Do not reapply an unbound-input transformer, copy DEV874 into main, change permissions or alter full-Node-shard admission. No new main gate begins until the technical source is qualified.

### Proof and authority

Prove fixed9ce is an ancestor of the technical source's DEV base and landed merge. Bind that historical commit's known parents, original manifest and baseline directly; a live371 API lookup may add defense in depth but cannot redefine the fixed classification.

For the fixed new technical PR, require authenticated fixed-GitHub-origin proof: exact repository/PR/branch/DEV, merged=true, actual ordered merge parents, adopted merge-tree bytes equal reviewed head, and landed-merge ancestry of authenticated canonicalDEV. Baselineed4 must match the current checkout and both technical-source parents/head/merge. Missing, corrupt, redirected, oversized, timed-out or unavailable proof rejects. No local preloader, label, flag, URL or token-dependent approval bypass is permitted.

The owner previously instructed “proceed with fixes” and requested live delivery, then explicitly authorized another normal signing attempt with “try again” and stated they would approve its prompt. That authorization covers this necessary bounded qualification and normal source signing; it does not approve broader classification, scanner weakening or unrelated work. DraftPR372 was reserved through a normal signed docs-only commit `17b158dcbd08d8fdf0d8945d3e5e81d2c81e8a6d`; that reservation is not the final technical source freeze.

Independent technical review does not replace applicable human security/data approval or merge authority. Record existing owner consent only if this exact bounded qualification is within it; a broader consequential decision requires the concrete owner's decision. No blanket new approval process or global trust change is introduced.

### Actual main release evidence boundary

The actual main workflow admits push only on DEV, and `ci-diff-base.mjs` intentionally rejects main push/dispatch as a security base. The diagnostic direct-helper main-push rejection at722 is not a configured release-entrypoint defect. This addendum does not add a main trigger, base-resolver exception or main-push baseline admission and does not expand the path list for them. Preserve workflow0d5 byte-exact.

Require actual exact-PR369 CI, then prove its tested virtual merge and actual merge share identical ordered parents and tree. Record actual Docker Release, immutable deployment identity and bounded runtime evidence separately. Full automatic post-merge main CI is not configured and must not be claimed. Freeze eventual source/merge SHAs in the external release ledger; do not embed the forthcoming adoption commit's own identity in its consumer. Authority remains fixedEB, exact independently qualified paths/tree and authenticated actual event/merge proof.

## DELTA and verification

1. Freeze the actual new PR/branch, closed five-path scope and old input blobs, review pass1 and pass2, and implement only that technical scope on canonicalDEV. Independently freeze exact new blobs and the patch manifest after implementation and before qualification/adoption. Preserve original371/ed4/a0c and all historical finding evidence. The approved signed contract permits only these five implementation paths; final exact-content qualification and adoption remain separate.
2. Use real temporary Git repositories and mocked fixed API responses to model separate historical371, descendant technical-source merge and main application/adoption graphs. Archived fixtures must assert their original blobs and work in shallow Windows checkouts without fetched historical objects. If historical371 admission itself is exercised, invoke an explicitly archived sealed consumer; a changed consumer cannot claim its historical helper identity.
3. Run the actual shell/Git consumer against both actual DEV and main workflow projections. Make workflow-negative bytes deterministically differ from874 and assert that precondition. Positive cases must reach scans; preserve distinct scanner86/5 and status3 assertions. Original PR334 tests retain their immutable baseline pair.
4. Reject wrong original9ce/ancestry/seal, wrong technical PR/repository/branch/base/parents/merge tree, changed/extra/renamed adoption paths, altered patch manifest, missing/failing API, uncommitted files and changed baseline. Retain introduced-then-deleted-secret and unexpected scanner-failure controls. A generic earlier nonzero is not evidence of the intended boundary.
5. Run actual detect-secrets1.5 over every retained changed-file snapshot in the complete final main and DEV BASE..HEAD histories, including merged ancestry, EB and every later correction. Scan new fixture paths at their first committed snapshot; an unlisted canary must fail. Preserve scanner exit semantics and detector configuration. Local Python3.13 evidence does not replace CI Python3.12.
6. Independently freeze/review exact technical head/merge/path blobs and patch-manifest hashes. Require focused consumers, check/build and actual canonicalDEV GitHub CI before technical merge, then exact-main adoption review and fresh actual PR369 security/full application CI, followed by tested-virtual/actual-merge ordered-parent/tree equality and actual Docker Release/deployment/runtime proof. Record skipped/pending/failed checks separately. Do not claim Gateway deployed or complete until immutable deployment and bounded runtime proof arrive.

## Out of scope

No additional baseline classification, detector change, scanner skip, generic approval, main-push trigger or security-base exception, workflow/permission change, broad DEV promotion, runtime/JWT/backups change, historical rewrite, model call or production business mutation is authorized. No original sealed manifest is rewritten.

## Open items and delivery

PR372 and its branch, canonical base, old-input blobs and five-path scope are fixed. Independent identity-bound pass1 and root pass2 approve this implementation contract. Final technical/adoption new-blob tables, implementation, independent exact-content execution and final CI remain pending. The [proposal ledger](../proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md#portable-fixture-audit-follow-up) owns these items. Source implementation must retain exact-site `TODO(handoff)` pointers for any deferred retirement. This document changes no source or existing sealed manifest.
