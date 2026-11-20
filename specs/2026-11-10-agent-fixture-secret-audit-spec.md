---
id: 2026-11-10-agent-fixture-secret-audit-spec
title: Qualify synthetic credential fixtures through a dedicated secret audit
stage: dev
status: implementing
pass: 2
verdict: approved
created: 2026-11-10
updated: 2026-11-10
repos: [minion, minion-meta]
proposal: 2026-11-06-agent-transcript-evals-and-runtime-improvements
type: fix
tags: [security]
---

# Qualify synthetic credential fixtures through a dedicated secret audit

## 0. Product

This extends S1 release qualification in the [approved conversation contract](2026-11-10-agent-chat-contracts-followups-spec.md). The owner requested the fixes live. Security scanning must succeed through its audited process; no scanner skip, broad exclusion or unsigned source is permitted.

## AS-IS

Actual production [PR369](https://github.com/NikolasP98/minion-ai/pull/369) and development [PR370](https://github.com/NikolasP98/minion-ai/pull/370) fail detect-secrets. The first failing production snapshot reports 46 locations; later snapshots introduce additional findings, so this is not the complete audit count. Values must be independently classified before any baseline update.

`.github/scripts/ci-security-scope.sh` scans every historical commit and rejects baseline updates except the exact audited PR334 transition. Final-source annotations cannot classify earlier snapshots. Both canonical baselines are byte-identical. The script preserves transient-secret detection and fatal failures. Existing PR334 consumer fixtures derive their snapshots from the current baseline; changing it without preserving that original pair would invalidate their byte-bound proof.

Application fixes are signed and independently reviewed. The scan ranges are main `50a3036ad7fac23710943e7eeadfe66b38d96fcd..2696ef68f3d73851cb6dac678d0036bc18361952` and DEV `d3e0fbf54fc657521df07c896ea7adce5ba1afcd..ea4e8305e636431f38e261add6a1d2fdb38d1f24`. Main remains the exact approved base; the scoped production exception must not bring unrelated DEV JWT/backups into production. Gate history must remain reachable and in application ancestry.

## TO-BE

A dedicated [audit PR371](https://github.com/NikolasP98/minion-ai/pull/371), based on canonical DEV, classifies only reviewed public checksums and synthetic fixture values. Its baseline adds exact type/path/hash records to the existing baseline, preserving every existing entry and detector configuration. No detected real or uncertain credential may be classified as synthetic or public. Reports contain no raw credential values or raw user conversations.

The transition is bound to the exact repository, PR371, audit branch, old/new baseline blobs and actual event/merge identities. Historical scans and scanner exit semantics remain mandatory. Freeze the independently classified finding manifest and the exact baseline, scanner-consumer and regression-test file identities, or a narrow adoption patch manifest. Production adoption must match those independently reviewed files against their landed audit source; extra or changed scanner-consumer edits reject. Every other baseline mutation still rejects. Original PR334 behavior and its immutable baseline pair remain covered.

After audit CI and independent approval, production PR369 may adopt only the audited baseline and required scanner-consumer changes. Adoption must prove the exact reviewed audit source landed on canonical DEV and bind repository, PR369, its exact hotfix branch, exact approved main base and old/new baseline blobs. It must not authorize runtime branches to classify their own new findings. The main source base stays fixed; do not merge broad DEV into main. DEV application PR370 incorporates the landed audit by normal ancestry, preserving every application fix.

## Approval and merge authority

Independent classification and technical review do not replace applicable human security/data approval and merge gates. Before merging the audit or its production adoption, the executor must record the owner's applicable authorization for that exact reviewed scope. The owner's existing instruction to proceed with these fixes and report when live remains in force for necessary scoped qualification; it does not authorize classifying real or uncertain credentials, broad scanner exclusions, changed detector settings or unrelated production work. If a new consequential security decision falls outside that consent, prepare the concrete reviewable result, explain this rule and obtain the owner's decision before dependent merge or release.

## DELTA and verification

1. Scan every changed-file snapshot in every commit reachable in each pinned BASE..HEAD range, including merged ancestry, using the actual detect-secrets1.5 consumer. Collect the union, not only the first failed commit. Independently classify each unique detector/type/path/hash using its source and purpose; freeze a manifest and exact baseline and adoption-file identities. Rescan the complete union when an application head, detector configuration or scanned file content changes. Initial or partial finding counts are not a frozen union. Uncertain or real credentials block classification.
2. Implement the narrow audit transition and landed-audit adoption. Preserve existing baseline entries, all detector settings, exact-head checks, actual ordered merge-parent validation and transient-secret scans. Do not introduce a flag, label, wildcard, mutable global approval or fixture-directory exclusion.
3. Execute the real scanner harness in synthetic Git repositories. Positive audit/adoption cases must scan changed files. Wrong PR/repository/branch/base, fork, altered baseline, unlanded, missing, corrupted or mismatched audit proof, extra adoption edits, renamed paths, new findings, malformed event, invalid head/parents and unexpected scanner failure must reject. A newly introduced then deleted secret must still fail. Preserve original PR334 positive and negative cases against the original byte pair.
4. Scan every historical application snapshot with the final independently reviewed baseline. Run current check, focused workflow/security consumer tests and actual GitHub CI. No application branch merges with a failing security check. Keep current exact-source qualification separate from superseded receipts.
5. Record the dedicated audit merge and adopted commit identities. Release Hub first, then the scoped Gateway production image; verify exact deployed identities and safe runtime status. This audit changes CI classification only and does not establish live model or memory-write behavior.

## Out of scope

No production credentials, credential rotation, historical transcript rewrite, model call, outbound message, npm/version change, agent-policy mapping or global scanner/trust change. Any finding outside proven synthetic/public values remains blocked. Retiring one-time audit/adoption cases requires a separate tracked follow-up, with an exact-site handoff comment and proposal pointer.
