---
spec: 2026-08-17-base-deploy-status-branch-filter-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

- Set `pass: 2` and `verdict: approved` because the remaining correctness issues were resolvable from the approved proposal and related specs without a human product decision.
- Made recon failures stop implementation and require a separately approved spec correction, avoiding the contradiction between editing meta-repo documentation and the minion-base-only implementation scope.
- Settled the Testing-column interpretation in favor of filtering all three existing fetches, matching the approved proposal's literal definition of done and removing an unresolved ship-gate decision.
- Defined precedence between active and completed runs: the newest usable active run reports `running`; otherwise the newest determinate completed run reports health.
- Defined `latest` as the run that determines status and assigned fetch-error-to-`unknown` mapping to the caller, removing ambiguity that the array-only derivation function could not resolve.
- Made the G3 red state an assertion failure against a stubbed function rather than an unverifiable test against nonexistent "current derivation logic."
- Added the active-newer/older-success test case so the corrected status precedence is machine-verifiable.
- Converted the ancestor-spec mismatch from an unresolved human decision into a separately scoped documentation follow-up, since pass 2 now settles the behavior and this task may not edit the ancestor.
- Reconciled the optional online branch-check implementation with its DoD and file list: either the Bun script or the documented `gh` loop is valid, and `package.json` is included only for the script form.
- Added conditional `package.json` coverage to the implementation scope guard so the optional script entry would not fail its own guard.
- Restricted the raw-value UI grep to added diff lines, preventing pre-existing unrelated values from making the DoD unverifiable.
- Changed the design-lint criterion from an assumed exact-zero baseline to the governing unchanged-or-decreasing debt ratchet.
- Removed the fixed three-request E2E expectation because the spec also permits helper consolidation to reduce calls; verification now requires every observed request to be filtered and records the actual count.

## Human flags

None. The ancestor v2 derivation table remains a separately scoped documentation follow-up, not an implementation decision.
