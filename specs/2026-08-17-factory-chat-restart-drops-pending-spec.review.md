---
spec: 2026-08-17-factory-chat-restart-drops-pending-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

- Updated frontmatter to `pass: 2`, `status: approved`, and `verdict: approved`; the corrected requirements need no human decision and the status now agrees with the verdict.
- Changed the S1 behavior proof to import the real helper instead of reimplementing its predicate, so the check verifies shipped code.
- Made Docker-probe failure leave all chat rows untouched and disable chat dispatch; without container reality, mutation or dispatch can discard live work or cause a name collision.
- Made boot call `enqueueChat()` only after successful recovery, consistent with the fail-closed probe behavior.
- Replaced the contradictory S2 integration fixture (three pending rows but one expected error) with dispatched, pending, and assistant rows that have an unambiguous expected result.
- Replaced both `git stash` red-state recipes with test-first commands, consistent with the shared-worktree rule while still proving failure before implementation.
- Updated the S2 static assertion to verify that chat enqueueing is recovery-gated rather than merely counting identifiers.
- Corrected the consolidated “not touched” statement to allow the ledger proposals that §5 explicitly requires.
- Required the resume hazard to have an exact-site `TODO(handoff)` as well as its proposal, satisfying AGENTS.md's two-place open-items ledger rule.
- Updated S2, S3, and the ship gate's handoff assertions to distinguish the temporary kill marker from the resume marker that must remain.

Nothing is flagged for human decision.
