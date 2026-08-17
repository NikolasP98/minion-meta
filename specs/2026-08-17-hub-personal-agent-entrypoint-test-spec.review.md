---
spec: 2026-08-17-hub-personal-agent-entrypoint-test-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

- Set pass 2, updated date, and approved verdict because the remaining implementation decisions are resolvable by mandatory recon without expanding scope.
- Replaced asserted hub paths and symbols with recon requirements because `minion_hub/` is absent from this checkout and those claims cannot be verified here.
- Required reading `minion_hub/CLAUDE.md` before implementation to satisfy root `AGENTS.md`.
- Reduced execution to the proposal's 401 and happy-delegation paths; removed the unrequested second slice covering every other branch.
- Removed caller-test annotations because they were redundant for coverage and contradicted the stated test-only blast radius.
- Made the existing suite and a sibling suite mutually exclusive alternatives so the final file set is deterministic.
- Changed an unexported subject from an allowed source edit to a human-decision stop because exporting runtime code contradicts the proposal's test-only/out-of-scope contract.
- Required exact delegate-argument assertions based on recon while removing speculative argument names and shapes that the checkout cannot verify.
- Made the fetch assertion conditional on an existing harness; the delegate seam is the required external-effect boundary and no new global infrastructure is in scope.
- Replaced ambiguous dynamic-import prescriptions with an observable requirement: mock the exact specifier and prove the delegate call.
- Replaced `git checkout` mutation restoration with manual reversion plus `git diff --exit-code`, consistent with repository git-safety instructions.
- Removed browser/manual page QA because the proposal is unit-test-only and no runtime code may change.
- Corrected the final-diff rule to allow exactly one test file, eliminating contradictions that previously also allowed caller comments and a source export.
- Added explicit full-suite, focused-suite, check, mutation, source-cleanliness, and file-scope completion criteria.
- Clarified that the proposal's focused test command must be validated during recon because the package script cannot be inspected in this checkout.
- Preserved the collision warning with the quality-gates spec while prohibiting absorption of its separate test rewrite.
- Clarified that an open-items-ledger artifact would expand scope and block this spec's stated final-diff Definition of Done until separately resolved.

## Human flags

None. If Slice 0 finds the function is unexported or direct import requires a runtime seam, that is a new scope decision and implementation must pause.
