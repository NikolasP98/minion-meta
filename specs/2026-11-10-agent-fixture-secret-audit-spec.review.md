---
spec: 2026-11-10-agent-fixture-secret-audit-spec
pass: 2
verdict: approved
reviewer: independent-conversation-review
created: 2026-11-10
---

# Independent two-pass security/process review

Scope: the root-authored secret-audit qualification extension, the approved conversation contract's S1/delivery boundary, and actual `.github/scripts/ci-security-scope.sh` plus `test/ci/security-scope-workflow.test.ts` in the production publication checkout. This review neither edits product source nor classifies actual finding values. The complete finding-union and independent classification are separate required evidence, still pending during Pass 1. No gates, commits, pushes, browser sessions, model calls or production effects were performed.

## Pass 1

**Standards: PASS for the proposed narrow design; clarifications required.**

**Spec: correction required before Pass 2 approval.**

The dedicated canonical-DEV audit followed by a source-bound production adoption is consistent with the approved delivery contract. It avoids broad DEV promotion and final-source annotations that cannot affect earlier scanned snapshots. The proposal preserves signed ancestry, exact workflow identity, ordered merge-parent checks, transient findings, fatal scanner errors, immutable baseline records/detector settings, and the original PR334 byte pair.

The actual script scans `git rev-list --reverse --topo-order BASE_SHA..HEAD` and materializes each commit's first-parent changed-file snapshots. Its sole PR baseline-transition allowance is PR334, with exact repository/ref/branch, baseline blob IDs and actual ordered merge parents. It treats exit 3 as line-number bookkeeping in a throwaway baseline, while exit 1 and other unexpected exits remain fatal. The PR334 fixture currently derives its pair from the current baseline; its original bytes must be frozen independently before the new baseline is introduced.

### Required clarifications

1. **Bind scanner-consumer adoption as well as baseline bytes.** The adoption contract names required scanner-consumer changes but freezes only old/new baseline identities explicitly. Freeze exact adopted script/test/related evidence identities or a narrow reviewed patch manifest. Reject extra scanner/config/path changes and preserve the reviewed production runtime projection; the application branch must not silently add a scanner weakening while carrying the correct baseline.
2. **Retain applicable human security/data approval and merge.** State explicitly that independent classification and technical approval do not replace the existing applicable human approval/merge gates for the audit or production adoption. This review approves a design seam only, not the findings, concrete baseline, PR merge or deployment.
3. **Bound completeness to pinned scanned ranges.** Define the obligation as every changed-file snapshot in each exact application `BASE..HEAD` range, including reachable merged ancestry. The first 46 and subsequent five findings are provisional observations, not a complete unique total. A changed head, detector configuration or relevant source must trigger union refresh/reclassification and final rescanning. Include wrong-path/renamed-path/new finding and missing/corrupt/unlanded audit-proof negative controls.

## Unresolved evidence retained

No exact new baseline blob, complete unique finding count, individual classification verdict, landed audit source, production adoption identity, current security-consumer test pass or actual GitHub CI success is approved by Pass 1. Values that are real or uncertain remain findings. Existing baseline entries are preserved, not retrospectively certified credential-free by this audit.

Pass 2 will inspect the revised spec's stated invariants; executable implementation and concrete finding classification require their own independent review and actual CI receipts.

## Pass 2 — approved design

**Standards: PASS. Spec: PASS. No remaining design blockers.**

The revised full spec closes all three Pass 1 findings:

- It freezes scanner-consumer and regression-test identities alongside the finding manifest and exact baseline transition, or uses an equivalently narrow adoption patch manifest. Production adoption must match independently reviewed files to the landed audit source; extra scanner-consumer edits reject. The exact-main base and exclusion of unrelated DEV runtime work remain intact.
- Its explicit approval/merge section retains applicable human security/data gates. Independent technical classification does not replace those gates. Existing owner authorization remains applicable to necessary scoped qualification; a genuinely new consequential security decision requires a concrete owner decision before dependent merge/release. No blanket new approval flow or scanner-trust expansion is introduced.
- It pins both application ranges, includes every reachable commit's changed-file snapshots and merged ancestry, requires complete union refresh on relevant source/head/configuration change, and requires rejection controls for missing/corrupt/unlanded audit proof, extra adoption edits, renamed paths and new findings. Transient findings, the original PR334 byte pair, actual ordered merge-parent checks and fatal scanner exit handling remain mandatory.

The separately produced private classification manifest's SHA-256 was read and verified as `b92bfcebabf4598e5459b71a38dc19e2342022bffc284060db436ffb09d37ed6`. It reports detect-secrets 1.5.0, no retained raw values, 46 unique path/type/hash identities across 24 historical snapshots and 162 occurrences, and no baseline change written. These are the independent classifier's reported results, not a second classification of values performed by this design reviewer. The first failing job's location count is not substituted for the complete union.

This approval is limited to the qualification design. Final baseline/adoption file blobs, independently reviewed implementation, dedicated audit CI and landed source, PR369/370 current security checks, applicable merge authority and deployed identity still need actual receipts. No source policy edit, baseline adoption, CI pass, merge or live behavior is asserted here.
