---
id: 2026-11-13-agent-audit-contents-read-proof-spec
title: Verify the fixed agent audit source with contents-read Git proof
stage: dev
status: implementing
pass: 2
verdict: approved
created: 2026-11-13
updated: 2026-11-13
repos: [minion, minion-meta]
proposal: 2026-11-06-agent-transcript-evals-and-runtime-improvements
type: fix
tags: [security]
relationship: extends
related: [2026-11-11-agent-fixture-audit-portability-spec, 2026-11-12-agent-current-attempt-output-spec, 2026-11-12-agent-release-forward-base-spec]
---

# Verify the fixed agent audit source with contents-read Git proof

## 0. Product

Finish the already authorized agent-chat release without changing workflow permissions or weakening its source proof. Replace the current pull-request metadata request with two canonical Git-reference reads and an exact normal-merge proof. This separate addendum preserves the approved application, runtime, scanner, workflow and historical-source contracts.

This bounded contract passed independent Standards and Spec review and root's second pass on the exact reviewed draft recorded in [the review record](reviews/2026-11-13-agent-audit-contents-read-proof-review.md). Normal signed metadata approval remains a prerequisite for implementation. Actual draft [source PR375](https://github.com/NikolasP98/minion-ai/pull/375) is reserved on `fix/agent-audit-contents-proof`, against fixed388, at normally signed docs-only reservation `394e827bd06ae063dd9afd5aa63d54ca94f129ba`. The reservation document must be removed from the final source diff. The recorded review approval does not replace the normal signed metadata commit required before implementation. Future source head, merge and content identities are frozen after bounded implementation; no commit must embed its own SHA. The existing owner authorization covers scoped live delivery and normal existing automatic publication, while the applicable security approval and merge gates remain required.

## AS-IS

Actual production [CI43513561794](https://github.com/NikolasP98/minion-ai/actions/runs/43513561794), attempt1, tests signed head `82becbb33d38c34fe6ab7191e818add724329eac` against main `d5856c3dac3f804b9f0b178848971cf8255d9171`. The actual checkout is virtual merge `c364531ba56d7b09e1221a69d13ebbc1bb9f78b6`, ordered parents `[D585,82be]`, tree `75a61a33409d4ede65cf07fc96aaaff4401b63e6`. Security job132189626178, step6 Detect secrets, exits1 with `Audited fixture baseline transition rejected` and `Baseline changes require a dedicated audited update`. The helper's top-level catch hides the actual HTTP status; this record does not claim that the CI log observed403.

Root reports that this repository is private and the actual job token has Actions read, Contents read and Metadata read, with no Pull requests read. The current helper at `.github/scripts/agent-fixture-audit.mjs` first requests `GET /repos/NikolasP98/minion-ai/pulls/373` in `validateLandedTechnical`, requiring a capability outside that token's recorded permissions. Its preceding event, local Git, frozen-blob and runner-restoration checks pass in root's real-Git replay of the actual virtual merge. A controlled denial of that first request reproduces the generic rejection. A separate authenticated replay passes both that pull request lookup and the subsequent canonicalDEV lookup. This supports a transport-capability mismatch; the controlled denial is distinct from an observed CI response status.

Evidence is private `.local/agent-chat-fixes-2026-11-10/current-attempt-production-ci-independent.json`, `current-attempt-production-admission-replay-restricted.json` and `current-attempt-production-admission-replay-authenticated.json`. The latter uses actual authenticated API responses and actual Git object/parent/tree checks, remapping only HEAD references to the real tested virtual merge. No raw credential is retained. Local replay is not replacement CI.

The prior Native run `01M76R5K6BHS4CTM4E5DWKX3VK` is terminal, has pushed signed82be, and its offered guarded synchronization has completed. Root reports the local production feature branch clean at82be with user custody returned. There is no active R11 gate to answer in that completed run. A later qualified adoption must follow the custody-aware procedure below; it must not masquerade as a response to the old gate.

The source runtime is already qualified: PR373 signed head `12bdd60d00c4d87a1915949707dabb5ba294a8f7` normally merged into DEV as `3885695f39efa1ceb6bf5f25b5f9a005d8443bfe`, ordered parents `[cc90bffde6033d8b6540464006b914905784500e,12bdd60d00c4d87a1915949707dabb5ba294a8f7]`, with matching tree `39db7e2e948504133440c573d25fb029fd90bc27`. Actual full DEV CI43326853831 passes both Node partitions, all four current-attempt cases and all69 audit cases. Those facts qualify existing bytes, not the future transport fix. No production merge or deployment has occurred under this addendum.

## TO-BE

### Fixed identities and unchanged authority

| Identity | Required value |
|---|---|
| Repository | `NikolasP98/minion-ai` only |
| New technical source PR | Actual375, same repository only |
| New technical source branch | `fix/agent-audit-contents-proof` |
| Fixed new technical base B | `3885695f39efa1ceb6bf5f25b5f9a005d8443bfe` |
| Production PR / branch | Existing369 / `hotfix/agent-chat-guardrails-20261110` |
| Fixed production base | `d5856c3dac3f804b9f0b178848971cf8255d9171` |
| Original application anchor | `eb1de47f2384cec2785d729980170142097b8d2b` |
| Signed native parent to preserve | `82becbb33d38c34fe6ab7191e818add724329eac`, including all its ancestors |
| Original classification merge / seal | `9ce4a18b4dd3d264c73a714f0d5b80c2eb995da1` / `a0c053d4f289687ff140b383be60b42f9c4abc14` |
| Unchanged reviewed baseline | `ed4a93bd4345f72ea1eeb43a744600e8121f54d9` |
| Original PR372 head / merge / seal | `91fdf1b75a9eaff11ec3d393b3911e611c6a8447` / `cc90bffde6033d8b6540464006b914905784500e` / `1f3f05eebd73cd4f7b321aed04a460acb2fe3cc4` |
| Original PR373 head / merge / seal | `12bdd60d00c4d87a1915949707dabb5ba294a8f7` / `3885695f39efa1ceb6bf5f25b5f9a005d8443bfe` / `ccb762ce2d2b99496bd30057d08253143e54dc33` |
| Unchanged DEV workflow and retained fixture | `874168d42f5eca37e7d1abfe73ec58d4217c1db1` |
| Unchanged production workflow | `b17609e045af571f9347583188a80449d3cbd299` |
| Unchanged main-local workflow consumer | `eb164dff4994888da3b0f4b1fd1ffc6d0d5c1927` |

The original signed contracts retain exact SHA25650bf `50bfca977144d4c0083a62337ee39b703bab632a673159bd039cd4f54d34b5d2`, R8cccf `cccf3f844a8c60faa37e1c40e03cbe624b72aed32ff94cb7491dff5039cac462` and forward8e95 `8e95ac0f383f97f49cc795e6d836f3ff7b64dc2b6cf9ac1983d443c7b5a0c368`. Do not edit their frontmatter or bytes. This new addendum changes only the current technical-source identity and its landed-source transport proof. The closed21-row workflow table, exactB176/EB164 pair, fixedD585 event/base admission, same-repository production PR369 identity, original classification, historical scans and original PR334 baseline-pair controls remain required.

### Canonical contents-read transport

Use only the existing job token and the fixed repository's Git API. Fetch exactly `git/ref/pull/375/head` and `git/ref/heads/DEV` from `https://api.github.com/repos/NikolasP98/minion-ai/`. Require the returned full refs to equal `refs/pull/375/head` and `refs/heads/DEV`, respectively. Require `object.type` to be `commit`, each object SHA to be a valid full40-character lowercase Git SHA, and each referenced local Git object to be a commit. The token, repository, PR number, source base and URL are not caller-selected overrides.

Keep bounded response size, timeouts, exact response origin/URL, redirect rejection and fail-closed error handling. Missing token, missing/unavailable object, HTTP denial, non-success response, malformed JSON, wrong ref/type/SHA or unsupported proof must reject the audited transition. Do not fall back to Pull requests API, broad personal credentials, an unsigned/local receipt, a branch-name match, arbitrary commit membership or a successful scanner-only result. Do not add a permission, flag, trigger, baseline entry or new production exception.

Let H be the canonical fixed-PR head response and D the canonicalDEV response. Enumerate actual merge commits in Git history rooted at D after fixed B, using real commit parents, and find **exactly one** normal merge M with exactly two ordered parents `[B,H]`, where B is the fixed388 base. Require B to be an ancestor of H, M to be an ancestor of D, and the entire merge tree of M to equal H's tree. Zero matching merges, multiple matching merges, reordered/missing/extra parents, a different first parent or a source that has not landed reject. An unrelated commit containing similar files or merely descending from H is insufficient. A later source base is inert until separately reviewed; do not select whichever base makes the graph pass.

This deliberately replaces the current `pr.merged` boolean and pull-request branch/base label checks with the canonical fixed PR ref plus a stronger exact normal-merge graph fact. It does not claim that contents-read responses expose labels or merged-state metadata. The fixed source branch remains an external reservation/review constraint; its label is not fabricated from the Git response. If canonical refs move and cease to satisfy the fixed proof, reject rather than broadening the contract. Existing full-history checkout must supply the immutable objects needed to validate that proof; unavailable history is not permission to trust a local receipt.

### Closed source and blob transitions

The new DEV source starts from fixed388 and may change only these four existing proof paths:

| Path | Old blob at DEV388 and native82be |
|---|---|
| `.github/scripts/agent-fixture-audit.mjs` | `70a52733d468d67382693712d06772e15c6d681a` |
| `.github/scripts/agent-fixture-audit-patch-manifest.mjs` | `ccb762ce2d2b99496bd30057d08253143e54dc33` |
| `test/ci/agent-fixture-audit.test.ts` | `61d5e4b6030fbf1a9621c91ac69005f30ee0ca2f` |
| `docs/security/2026-11-10-agent-fixture-findings-audit.md` | `b475d4b5af565db325b3cf1b2cc04010243a49f3` |

The unchanged fifth proof path `test/ci/fixtures/pr371-ci.yml` stays blob874. All six runtime/regression files stay byte-exact to original373 and native82be:

| Runtime path | Immutable blob |
|---|---|
| `src/agents/pi-embedded-runner/run/attempt.current-output.test.ts` | `782e1d7f42fd39636ee2e46d9d06f65964eb4266` |
| `src/agents/pi-embedded-runner/run/attempt.ts` | `35259b34282d21269e00595834777db7dce8dae3` |
| `src/agents/pi-embedded/pi-embedded-subscribe.handlers.messages.ts` | `d81f6021d4baa8bdceb4fab64312401f4ce8df71` |
| `src/agents/pi-embedded/pi-embedded-subscribe.handlers.types.ts` | `174d70d6965659fcaed61d4d1996a9337d422f1f` |
| `src/agents/pi-embedded/pi-embedded-subscribe.message-validation.test.ts` | `e362b8b869694c98e6347c4d0683803f13c87895` |
| `src/agents/pi-embedded/pi-embedded-subscribe.ts` | `57372c82b7fa055ee7a96bb603bf882b354d9069` |

Freeze the four new blob identities and combined eleven-path content set after implementation and before external qualification. Both actual H and M must contain those same eleven sealed source blobs, unchanged ED4/A0c and DEV874; their net changes from B stay within the four-path fence, with no rename, extra path or resolution delta. The new version4 patch manifest must explicitly bind current source375, branch `fix/agent-audit-contents-proof`, fixed contents-proof base388, historical373 head/merge/seal, exact allowed old/new transitions and unchanged runtime/workflow identities. Keep existing `TECHNICAL_BASE=CC90` and historical CC90/mainEB `PATCH_INPUTS` for the original R8/373 transition proof; add a distinct fixed contents-proof base388 and current four-path transport transition. Do not reinterpret the original373 seal or old CC90 transition as new375 history. Preserve the old PR373 seal as historical data in commits12bd and388 rather than treating it as the new mutable manifest. Preserve the original R8 CC90-to12bd transitions and original371/372 graph/blob proofs separately; do not overwrite historical identities with the new source's identities.

On production, require the current checked-out virtual merge and actual hotfix head to match H/M on all eleven source paths and original sealed paths. The custody-authorized owner may adopt only the independently qualified five proof files, including the unchanged fixture, using the procedure in DELTA5. No new runtime authoring is authorized. Preserve82be and all native history, exactB176/EB164 and all21 workflow expectations. The net postEB upper fence remains the same eleven qualified source paths plus CI and its main-local consumer, thirteen maximum; this addendum creates no fourteenth path or arbitrary blob allowance. Do not merge DEV into the production branch.

### Bounded diagnostics

The helper may retain the generic rejection and append only a fixed allowlisted reason code plus an optional numeric HTTP status in100..599 from the actual response. Freeze the implemented code vocabulary with the qualified source; diagnostic codes do not grant admission. Never print arbitrary exception messages, Git stderr, request headers, token values, URLs, response bodies or attacker-supplied fields. Unexpected errors keep a fixed generic/unknown code. If this diagnostic is implemented, executable tests must confirm the fixed code/status and prove that malicious response/token/exception text is absent from stderr. No diagnostic change may turn denial or malformed evidence into scanner admission.

## DELTA and verification

### Slice 1 — qualify and adopt the contents-read source proof

**Topics:** `security`, `test`

1. Independently verify actual reserved PR375/branch/base388 and its normal docs-only reservation. The exact draft has passed independent review and root's second pass; verify normal signed metadata approval of this bounded contract before source implementation. A guessed PR number or an unsigned local file authorizes no source or gate mutation.
2. Change only the four named proof paths in that external DEV source. Retain historical371/372/373 constants and proofs, six runtime blobs, retained fixture and both workflow families. Verify the old-input table using actual Git objects before changing it. Freeze exact new blobs/content set, independently review Standards and Spec, run actual unchangeded4 detect-secrets1.5 over all retained historical and new changed-file snapshots, and retain unlisted/transient canaries and distinct fatal statuses. No new classification or detector change is allowed.
3. Execute the actual helper against real temporary Git repositories and canonical-read API fixtures. Positive cases must reach actual audit scanning with only the two contents-read API calls. Reject wrong/missing PR ref, wrong source head, wrong object type, wrong source base, wrong parent order/count, a nonlanded or multiply merged source, head/merge tree mismatch, any of eleven sealed-source blob changes, changed ED4/A0c/DEV874, wrong/missing canonicalDEV, malformed/oversized/redirected response, denial403 and missing token/history. Reject an otherwise matching arbitrary local commit/receipt that lacks the canonical fixed-PR proof. Preserve the existing original history, production identity, exact workflow, extra-path and adversarial scanner controls. Map the original69 control intents explicitly; the obsolete pull-label/merged-boolean fixtures are replaced by canonical fixed-PR-ref and exact merged-graph controls, rather than preserving an unavailable metadata API or dropping its security intent. Test execution must use the real consumer and Git semantics, not source-string checks or a fabricated successful Git result.
4. Run the new source's actual PR CI and, after normal head-guarded merge into DEV with parents `[B,H]`, actual complete merged-DEV push CI. Inspect downloaded digest-verified reports proving the new transport cases, all four current-attempt runtime cases and the original69 audit control intents under the stated ref/graph replacements. If tests add transport cases, the audit file's total may increase; enumerate the old-to-new control mapping and added cases rather than silently changing their meaning. Record scope/provider skips separately. Existing373 CI is historical coverage and does not qualify the new helper. Require actual canonical Git-ref responses and graph/blob checks for the normally landed new source; local API fixtures alone cannot establish that fact.
5. Root inspects the current structured custody state before adoption. In the actual terminal-and-synchronized state described above, root may normally SIGN a scoped follow-up adoption commit on the clean feature branch directly atop82be, preserving every ancestor, then start a fresh legitimate No Mistakes run with the full original user intent, constraints and this addendum. This is the between-runs path, not aborting or restarting an active run. If custody has instead moved to a new active run, supply the qualified packet through that run's official selected fix protocol and let its Native process perform the adoption; root must not edit pipeline-owned source. Apply only exact qualified proof bytes, do not reset history or merge DEV, and never waive external qualification. Run focused adoption/source/main-workflow consumers, recheck the thirteen-path upper fence and scanner evidence, then require fresh exact-head production PR369 full/security CI. The actual job token's existing Contents-read capability must admit the source without Pull requests metadata permission. Do not accept an empty or skipped forge phase as CI success.
6. Require tested virtual/actual main merge ordered-parent/tree equality, normal automatic publication outcome, immutable Docker release/deployment receipts and bounded post-rollout source/digest/health/native-channel checks on both production services. Keep existing Hub retention evidence separate. No software-live claim follows from a local replay, source merge, scanner pass or candidate tree alone.

## Out of scope

No workflow permission expansion, PAT substitution, API waiver, branch-protection change, flag, trigger, timeout relaxation, scanner/baseline expansion, new main exception, broad DEV promotion, runtime/tool/product mutation, profile-scope change, manual version/publication, credential rotation, historical transcript rewriting, live model/provider call or business write/message. Do not edit any original signed contract or initial audit artifact. This metadata contract changes no source, pipeline, Git branch, PR or deployment state.

## Open items

Normal signed metadata approval, bounded source implementation and new blob freeze, actual source/main CI, normal adoption/merge and production publication/deployment/runtime receipts remain open. The existing [proposal ledger](../proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md#fixed-d585-runner-restoration) remains the release handoff record. The source owner must retain its exact-site retirement `TODO(handoff)` and update the matching proposal for any deferred work; this metadata contract introduces no product-code comment or source change.
