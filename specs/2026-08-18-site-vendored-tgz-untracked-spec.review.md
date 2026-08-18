---
spec: 2026-08-18-site-vendored-tgz-untracked-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

- Set `pass: 2`, `updated: 2026-08-18`, and `verdict: approved` as required for this review pass.
- Reduced `repos` to `[minion_site]` because the approved proposal targets only that repo and its definition of done is already satisfied there.
- Changed the disposition to verification and closure by the existing commit, resolving the contradiction between “shipped by another commit” and a proposed 8–14 hours of new development.
- Removed the proposed dependency linter, ledger rewrite, meta-repo snapshot registry, parity test, and revendoring documentation because none is required by or authorized by the proposal's definition of done.
- Removed conditional CI/pre-push wiring because it contradicted the draft's own out-of-scope statement and overlapped `2026-08-13-ci-minion-site-ci-spec` ownership.
- Replaced implementation slices with a read-only re-verification step so closure remains valid if `dev` advances after the evidence snapshot.
- Replaced mutation-based negative controls (`git rm --cached`, temporary contract rewrites, and cleanup) with four read-only GitHub API checks appropriate to a no-change closure spec.
- Made the pass condition explicit and machine-verifiable: the tarball must be a non-empty committed Contents API blob and both `package.json` and `bun.lock` must name the same path.
- Clarified that the recorded commit SHA is historical evidence while the current `dev` tree is the closure authority, avoiding a stale-SHA requirement.
- Retained the source-revert and reusable tarball-gate ideas only as follow-up candidates, because operator memory identifies real failure classes but does not authorize expanding this proposal.
- Cited `/memory/MINION/MEMORY.md` and `/memory/MINION/minion-site-impeccable-redesign.md` where their hard constraints shaped the closure checks and follow-up notes.
- Made the files-touched and out-of-scope sections consistent with the no-development disposition.

## Human flags

None. The proposal's stated definition of done is objectively verifiable and already satisfied; the preventive gates can be proposed separately if desired.
