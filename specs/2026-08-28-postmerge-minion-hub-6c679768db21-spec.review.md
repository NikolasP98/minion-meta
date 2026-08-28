---
spec: 2026-08-28-postmerge-minion-hub-6c679768db21-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-28
score_slice_size: 10
score_dod_verifiability: 9
score_scope_containment: 10
score_impact_zones: 10
---

# Pass 2 correctness review

- Set `status: approved`, `pass: 2`, and `verdict: approved`; all correctness issues were resolvable without a human product or scope decision.
- Reclassified `specs/index.json` state as advisory coordination metadata and made live source plus passing tests the implementation gate, following the hard no-backward-reconciliation constraint in `/memory/MINION/sdlc-board-triage-and-phase-gates.md`.
- Separated proposal/sibling-marker evidence from current live-code fact because this checkout does not contain `minion_hub`; Slice 0 now verifies the marker, enclosing block, test foundation, and covering test before edits.
- Added an already-satisfied path that records evidence and avoids a no-op PR when the marker has already been removed or intentionally rewritten.
- Made the referenced test-environment foundation a hard execution prerequisite; this spec cannot absorb or reimplement the dependency spec when that foundation is absent.
- Replaced the unverifiable “byte-identical behavior” wording with the exact invariant: no executable script, markup, style, or API change, and only the marker line may be deleted from `DataTable.svelte`.
- Consolidated the former Slice 1 plus contingent Slice 2 into one ordered 4–6h slice, eliminating the contradiction where Slice 1 depended on a later conditional slice.
- Limited the conditional branch to one co-located test for the exact flagged block and prohibited snapshots, config, dependency, lockfile, or test-infrastructure expansion.
- Ordered `bun run check` before Vitest in recon so fresh worktrees receive SvelteKit sync, per `/memory/MINION/factory/2026-08-20-2c5eccbc.md`.
- Replaced exit-1-as-success prose and working-tree-only diff checks with executable marker absence, commit-range numstat, exact allowed-path, targeted-test, component-suite, check, and full-suite gates.
- Corrected DELTA numbering and aligned the ship gate, impact table, and out-of-scope list with the consolidated slice.
- Explicitly excluded manual proposal/spec frontmatter and `index.json` reconciliation from implementation scope; the maintenance sweep/resolver owns artifact closure.

## Verification limits

- The current meta-repo checkout lacks `minion_hub`, including its `CLAUDE.md`, so pass 2 could not independently inspect the live component or tests. The corrected Slice 0 makes that limitation explicit and blocks edits until the live facts are verified.
- Read-only Claude-memory FTS searches returned corroborating DataTable and handoff-sweep observations, but none supplied stronger current-branch evidence than the proposal and sibling marker, so they did not change a normative requirement.
- The configured mempalace CLI and fallback executable were unavailable; no semantic-memory MCP search tool was exposed in this session.

## Human flags

None.
