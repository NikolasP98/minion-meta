---
id: 2026-11-12-agent-current-attempt-output-spec
title: Qualify current-attempt output suppression through an exact runtime source
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

# Qualify current-attempt output suppression through an exact runtime source

## 0. Product

This contract extends the qualification of the [approved application guardrails](2026-11-10-agent-chat-contracts-followups-spec.md) and [approved portable-source contract](2026-11-11-agent-fixture-audit-portability-spec.md). The existing owner instruction authorizes the scoped repair of aborted/rejected output suppression. A new user decision is not required for that core fix. The owner separately authorized normal existing DEV/main automatic publication. Neither instruction permits a generic scanner exception, broad DEV promotion or global trust change.

Independent local behavioral reproduction confirms the finding, and fixed PR373, its branch/base and the eleven-path upper fence are reviewed. Only a normally signed approved contract permits the bounded native runtime authoring and external proof implementation described below. Final exact-content/source CI qualification, pipeline disposition, merge and deployment remain separate requirements. Preserve all existing frozen contracts, including SHA256 `50bfca977144d4c0083a62337ee39b703bab632a673159bd039cd4f54d34b5d2`.

## AS-IS

Production adoption candidate `ee6ffb5f8557e6f9d9a8448ac94ffddace8c9246` (EE6), tree `c8f5a7d268a6260cbec7aa5b5ca7b526b032243e`, contains the original application history plus the exact independently landed PR372 technical source. Actual PR372 merge `cc90bffde6033d8b6540464006b914905784500e` has ordered parents `70414b7dddbe8967d2a7b8afa0097e8acbbd683a`, `91fdf1b75a9eaff11ec3d393b3911e611c6a8447`, tree `510f0987a86720cb9f70db184c330de7c3cf83ed` and frozen content set `cee84e3c7834d2d07dd6c4bf28b452dfc3da6898c7e3658801bcd7b5d61f59a9`.

Fresh main No Mistakes run `01M76R5K6BHS4CTM4E5DWKX3VK` reported source-review R8 ERROR and is parked awaiting root disposition. EE6 remains unchanged. The review traces `src/agents/pi-embedded-runner/run/attempt.ts` selecting the last assistant from the whole history snapshot. The independent clean user-cancel probe confirms that an abort before a new SDK `message_end` selects an earlier successful assistant. Actual outer-run and channel payload composition then returns that old text and reasoning as the new result, although the real SDK terminal event is aborted.

**Confirmed local evidence:** the probe uses real SDK `AgentSession`, actual attempt-result construction, actual outer run and the actual channel payload builder, without fabricating an attempt result. The clean native user-cancel invocation reports one failing regression and one skipped timeout case; its saved result records SDK terminal `aborted` and old synthetic success/reasoning in deliverable payloads. Private evidence: `.local/agent-chat-fixes-2026-11-10/stale-attempt-probe/evidence/{user-cancel-clean-red.log,user-result.json}`. The old success is a synthetic fixture, not an actual booking receipt. No live incident, production-user replay, completed repair or current-main CI pass is claimed. An outer timeout/retry variant is not established by that skipped case. Independent controls now pass seven cases across two files: real current normal text, current tool text followed by later abort, tool-only followed by later abort, plus existing compaction controls. The local read tool executes once; no external business action or remote model call is required. Evidence: `stale-attempt-probe/evidence/current-controls.log`.

The existing PR372 adoption proves exactly five technical files after fixed main anchor `eb1de47f2384cec2785d729980170142097b8d2b` (EB). A new runtime byte cannot pass that fence. Editing runtime only on main, loosening that allowed set, resetting the anchor to an unqualified current head, or altering the old seal would violate the existing contract. The confirmed repair therefore needs a bounded externally reviewed and landed DEV runtime source before final production adoption can qualify.

## TO-BE

### Current-attempt output invariant

Only an accepted assistant belonging to the current attempt may supply that attempt's fallback text or reasoning. Retained prior-turn success stays historical and cannot become the aborted attempt's new answer. An abort before any accepted current assistant must not return an earlier success or its thinking. Acceptance must bind both current-attempt provenance and the required terminal state at attempt-result construction, then remain effective through payload assembly and outer-run fallback.

Expose a dedicated current-subscription/current-attempt COMPLETED `message_end` receipt through the subscriber getter and consume it at attempt-result construction instead of scanning whole history. The receipt is the latest CURRENT COMPLETED terminal message, including error or aborted metadata. Here “handler-accepted” means a routed nonduplicate `message_end` event from the still-subscribed current generation; it does not mean successful stopReason. Do not success-filter the receipt and retain an older successful current completion when a later completed error/abort arrives. Existing payload terminal/protocol/error predicates decide delivery from the latest receipt. `state.lastAssistant` also changes on `message_update`; directly exposing it would admit in-progress/default-stop content and is forbidden. The dedicated slot is not replaced by a later partial `message_start`/`message_update`; retain a completed current result across those later partial starts. Clear it only when the compaction/retry lifecycle actually starts a new `willRetry` generation, and initialize it empty for a new attempt.

Keep existing terminal/protocol acceptance in payload assembly as defense in depth. Preserve accepted current tool-only/text completions, existing streamed text/media/controls, malformed-protocol rejection, supported-secret redaction, cancellation, no-retry compaction failure/timeout behavior and honest error/uncertainty reporting. Preserve history for recovery; do not delete old successful messages or discard every current output to hide the symptom. The bounded runtime scope below permits the two named handler files if needed; payload and outer-run source stay unchanged. Current-attempt assistant usage, terminal/error metadata, completion-hook text and current-output logging must use current-attempt ownership too. Retain the historical snapshot for history/context, without reinterpreting its previous assistant as the current output.

### One fixed externally landed combined source

Use one next ordinary DEV follow-up from exact actual PR372 merge `cc90bffde6033d8b6540464006b914905784500e`, branch `fix/current-attempt-output-qualification`. Its fixed source is **[PR373](https://github.com/NikolasP98/minion-ai/pull/373)**, reserved at normal signed docs-only head `4d2b7c3ce29ac33104d18792a35c8c428bcccef8`. The reservation is not the final runtime/proof content freeze. No caller-selected source, arbitrary path pattern or default PR is admitted. Before implementation, independently review that fixed identity, old inputs and closed file set in two passes. After implementation, independently freeze exact new blobs and the latest combined patch manifest before CI qualification, merge or final adoption. Future new blobs are not a prerequisite for approving the bounded implementation contract.

The implementation upper fence is the six named runtime/regression paths plus the original five technical paths below. No twelfth file or additional fixture is admitted. Native implementation need not touch all six runtime paths; freeze the exact touched subset and exact new blobs after implementation and before external qualification. An unchanged attested file need not appear as a new actual diff. The worker's temporary reservation document must be removed from the final net source diff.

| Path | Allowed purpose |
|---|---|
| `src/agents/pi-embedded/pi-embedded-subscribe.ts` | Dedicated handler-routed current-generation completed terminal receipt (including errors) and reset/getter |
| `src/agents/pi-embedded/pi-embedded-subscribe.handlers.messages.ts` | If needed, record only handler-accepted completed-message events |
| `src/agents/pi-embedded/pi-embedded-subscribe.handlers.types.ts` | If needed, type the dedicated accepted-completion receipt |
| `src/agents/pi-embedded-runner/run/attempt.ts` | Consume that receipt rather than whole-history last-assistant selection |
| `src/agents/pi-embedded-runner/run/attempt.current-output.test.ts` | New actual SDK/attempt/outer/channel cancellation regression and valid-current controls |
| `src/agents/pi-embedded/pi-embedded-subscribe.message-validation.test.ts` | Completed/in-progress/duplicate/rejected/unsubscribed/retry-generation lifecycle controls |
| `.github/scripts/agent-fixture-audit.mjs` | Exact new landed combined-source adoption proof |
| `.github/scripts/agent-fixture-audit-patch-manifest.mjs` | Exact runtime plus technical old/new transitions and fixed source identity |
| `test/ci/agent-fixture-audit.test.ts` | Real Git/API positive/negative proof for the new exact runtime scope |
| `test/ci/fixtures/pr371-ci.yml` | Preserve immutable historical workflow bytes |
| `docs/security/2026-11-10-agent-fixture-findings-audit.md` | Truthful historical/current combined-source qualification record |

Root owns disposition of the parked native No Mistakes run. After the approved contract is normally signed, that native process may author **only the six named runtime/regression paths** on its pipeline-owned application candidate. Do not manually edit that checkout or its technical proof files. On the NATIVE/PRODUCTION candidate only, the original five-file CI proof remains byte-exact until the new external combined source is qualified; it cannot validate the temporarily new runtime delta, and no passing CI claim is allowed from that stage. After this approved contract is signed and exact native runtime bytes are available, external DEV PR373 may implement its bounded five technical proof files to qualify that combined source; it need not already have qualified those new bytes. The external DEV follow-up carries the exact touched subset of native-authored runtime/test bytes plus the bounded technical proof changes. After independent review, actual DEV CI and normal landed-source proof, root may adopt only the qualified combined proof/bytes while preserving all native commits.

The new combined manifest binds the fixed new repository/PR/branch/base, original9ce classification, immutable PR372/CC90 history, fixed EB, and every adopted file's exact DEV-old/main-old/new blob or explicit absence. Its own content hash is verified externally against the actually landed source, not self-referenced. Preserve the historical PR372 manifest bytes in actual CC90; a later separately authorized manifest revision must identify its own exact authority. Verify every unpatched original file remains byte-identical to its appropriate immutable source.

Require authenticated fixed-GitHub-origin proof of the new actual merged source: exact same repository/branch/DEV base, reviewed head, ordered merge parents, actual merge-tree bytes equal reviewed source for every adopted path, new source base-to-head ancestry, source ancestry of authenticated canonicalDEV and original9ce/CC90 ancestry. Reject missing, unavailable, corrupt, redirected, oversized or timed-out proof, incorrect parents/tree and extra/renamed/uncommitted paths. Bind the production event to fixed repository/PR369/hotfix branch/main50 and actual event/merge evidence. Do not embed the forthcoming adoption commit's own identity in its source; eventual actual SHAs belong in the external release ledger.

### Fixed old inputs

The preimplementation table binds mainEB and new DEV baseCC90. Runtime existing-file old blobs are identical on those two inputs; the new unit-discovered native regression path is explicitly absent. Root/independent review must verify every cell before final approval. Local EB lookup confirms the runtime values below; the DEV technical blobs are the frozen landed CEE source.

| Path | DEVCC90 old blob | MainEB old blob |
|---|---|---|
| `src/agents/pi-embedded/pi-embedded-subscribe.ts` | `25691be20a788ae6add39af6fa1e191cd1da6772` | `25691be20a788ae6add39af6fa1e191cd1da6772` |
| `src/agents/pi-embedded/pi-embedded-subscribe.handlers.messages.ts` | `ea122223e7829db77274f525c825b1e2d0924374` | `ea122223e7829db77274f525c825b1e2d0924374` |
| `src/agents/pi-embedded/pi-embedded-subscribe.handlers.types.ts` | `1e80ef61880038c7a35a9c6936c070900b2ca37d` | `1e80ef61880038c7a35a9c6936c070900b2ca37d` |
| `src/agents/pi-embedded-runner/run/attempt.ts` | `9614d68e3745ce6ab0a0bd7138c9bd9eaad369f1` | `9614d68e3745ce6ab0a0bd7138c9bd9eaad369f1` |
| `src/agents/pi-embedded-runner/run/attempt.current-output.test.ts` | absent | absent |
| `src/agents/pi-embedded/pi-embedded-subscribe.message-validation.test.ts` | `77f3704d6338f58bbc40f92324840602b66c9384` | `77f3704d6338f58bbc40f92324840602b66c9384` |
| `.github/scripts/agent-fixture-audit.mjs` | `5caa38e19a39ec7a440ff1cac0577ec9ff4ea949` | `4b7d03d503746469375b288c5a8b60f4f18bc366` |
| `.github/scripts/agent-fixture-audit-patch-manifest.mjs` | `1f3f05eebd73cd4f7b321aed04a460acb2fe3cc4` | absent |
| `test/ci/agent-fixture-audit.test.ts` | `4f5105b2fc7d97489e1d0c74c69884d4811c1bae` | `71070006aa0760bbb56784f26cd1b627466cfcaf` |
| `test/ci/fixtures/pr371-ci.yml` | `874168d42f5eca37e7d1abfe73ec58d4217c1db1` | `874168d42f5eca37e7d1abfe73ec58d4217c1db1` |
| `docs/security/2026-11-10-agent-fixture-findings-audit.md` | `b3cbac9427a245754ce5befbe7e2d3ff55180bdf` | `2e3dc3af1e51f10f605837a34656d87c93f5df11` |

`run/payloads.ts`, outer `run.ts`, shared files and every handler/type path outside the two named files remain unchanged. Historical synthetic inputs contain the actual old bytes with exact blob assertions. Public COMMIT aliases may model temporary Git graphs; FILE-BLOB remapping is forbidden. Latest synthetic source fixtures use the actual current candidate bytes as their own bytes.

### Immutable classification and production boundaries

Keep original audit merge `9ce4a18b4dd3d264c73a714f0d5b80c2eb995da1`, original content seal `a0c053d4f289687ff140b383be60b42f9c4abc14`, baseline `ed4a93bd4345f72ea1eeb43a744600e8121f54d9`, detector settings and PR334 byte-pair proofs unchanged. No new finding classification, scanner status suppression, global flag or approval channel is introduced. All historical changed-file snapshots, including transient secrets and merged ancestry, remain scanned.

Keep original main base `50a3036ad7fac23710943e7eeadfe66b38d96fcd`, fixed EB and all application/adoption history reachable. Main `.github/workflows/ci.yml` stays blob `13a82c460007d0c7e0c83880ba9c2c7c3bd9feff`, SHA256 `0d5cb187dd6fcccda8590714da3a6c179cf2018e56e4ace653618e13014196e4`. The allowed post-EB tree may extend only to the exact externally reviewed/landed runtime/test paths and technical proof files. No broad DEV merge, JWT/backups, rewritten history, generic baseline admission, workflow trigger or permission change is permitted.

Independent review does not replace applicable human security/data approval or merge gates. Existing owner scope covers the bounded aborted/rejected-output repair and normal existing automatic publication. A concrete broader consequential change remains outside that authorization. Root owns the parked main run and subsequent qualification; this contract does not itself advance the parked pipeline.

## DELTA and verification

1. Preserve the confirmed clean native user-cancel RED evidence against unchanged EE6. Preserve the seven passing independent current-text/tool/compaction controls and keep the skipped outer-timeout variant distinct. Use the actual SDK, attempt, outer run and channel payload path; no fabricated attempt result.
2. Bind actual fixed PR373 on the named CC90 branch, independently verify the explicit six-runtime/five-technical upper fence and old-input table, then complete independent pass1 and root pass2 and normal contract signature before native runtime authoring or technical proof changes. Keep the approved50bf contract unchanged. Independently freeze exact new content after implementation and before source qualification/adoption.
3. Name the new native race regression `src/agents/pi-embedded-runner/run/attempt.current-output.test.ts` so it executes in mandatory default Node CI. `.e2e.test.ts` belongs to a separate suite and would not qualify mandatory coverage here. Add the failing-before/passing-after behavior regression for a retained prior success followed by a current abort before new `message_end`. Exercise fallback text and reasoning, actual attempt/outer-run composition, and existing abort/error/malformed-protocol boundaries. Cover current-output usage/log/hook provenance, mandatory CI test discovery, completed-current receipt retention across later partial starts, rejected/duplicate/unsubscribed events, `willRetry` generation reset, accepted text/tool-only completion and no-retry compaction failure/timeout. Preserve retained history. Tests that merely mock the correct lastAssistant into payload assembly cannot prove this boundary.
4. Execute the real shell/Git/API adoption consumer on actual DEV and actual main projections with distinct historical371, landed372 and new combined technical/runtime source graphs. Valid positives must reach scans. Reject incorrect fixed source identity/base/head/parents/merge tree/ancestry, changed runtime old/new blobs, altered manifest, extra/renamed/uncommitted paths and unavailable proof. Preserve distinct scanner86/5 and status3 assertions; an earlier unrelated rejection does not prove the intended boundary.
5. Run actual detect-secrets1.5 over every retained changed-file snapshot in final DEV/main BASE..HEAD histories, including merged ancestry and all new runtime/test/inline fixture bytes at first introduction. Preserve unchanged baselineed4 and the original unlisted/transient-canary controls. Execute focused actual SDK/runtime tests, both branch consumer suites, check/build and configured current test lanes. Record local environment and actual GitHub CI separately.
6. After independent exact-content review and actual canonicalDEV CI/merge, complete adoption of only the exact qualified runtime/proof bytes from fixed EB while preserving current application and native-fix history. Root determines the supported handling of the parked No Mistakes run; do not edit pipeline-owned source outside that handling. Require fresh exact-head production PR369 full/security CI, tested virtual/actual merge ordered-parent/tree equality, actual Docker Release/automatic publication, immutable deployment and bounded runtime receipts. Retain the independently preexisting WhatsApp QR-authentication availability limit. No software-live claim precedes those receipts.

## Out of scope

No implementation before fixed-identity two-pass review and normal signature, new feature, arbitrary fallback deletion, whole-history rewrite, LIVE/REMOTE model/provider call, business write/message, credential change, baseline expansion, generic approval/flag, workflow/permission change, manual version bump or unrelated DEV promotion. Normal existing automatic publication remains owner-authorized; no flag is changed to bypass it. This contract itself changes no product source, prior signed contract or sealed manifest.

## Open items

The clean user-cancel failure is locally confirmed and the eleven-path upper fence/CC90 branch are fixed. PR373 fixes the actual source identity. Independent pass1 and root pass2 verify the fixed identity and all22 old-input cells. Normal signature, implementation/new-blob freeze, actual source/main qualification and runtime release remain pending. The [existing proposal ledger](../proposals/2026-11-06-agent-transcript-evals-and-runtime-improvements.md#r8-current-attempt-output-qualification) owns these items. The exact-site source handoff, if work remains deferred after implementation, must point there; this contract adds no comment to pipeline-owned product source.
