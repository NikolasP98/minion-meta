---
spec: 2026-08-21-hub-datatable-server-mode-test-gap-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-21
score_slice_size: 10
score_dod_verifiability: 9
score_scope_containment: 10
score_impact_zones: 10
---

# Pass 2 correctness review

- Set `status: approved`, `pass: 2`, and `verdict: approved` because every correctness issue was mechanically resolvable without a product or scope decision.
- Narrowed the owner surface to production subjects read-only plus hub test/config/dependency files so it no longer implies that `DataTable.svelte` or the default environment stub may change.
- Marked the proposal quote as non-normative because its illustrative stub-swap and historical snapshot wording are corrected by the executable slices.
- Replaced the unprovable post-hoc “before/after byte-identical” claim with a reviewed client-mode characterization snapshot plus a zero-production-`.svelte` diff.
- Added this spec's own runtime-source diff gate because the ancestor S4 commit-range check cannot prove that the follow-up remains test-only.
- Consolidated three coupled 2–5h infrastructure slices into one 6–8h slice, leaving two independently executable 4–8h slices; this follows the hard slice-scoping constraint in `/memory/MINION/sdlc-board-triage-and-phase-gates.md`.
- Replaced the invalid suggestion that `environmentMatchGlobs` can swap `$app/environment` stubs with a hoisted, file-local `vi.mock` that overrides only `browser`.
- Added a separate normal-alias test for `browser === false` so the “default unchanged” invariant is directly verified rather than inferred.
- Replaced the throwaway `/tmp` Svelte mount smoke with committed `@testing-library/svelte` `render()` evidence using the public testing-library surface.
- Scoped a jsdom fallback with a file-level Vitest environment pragma and kept any `@minion-stack/ui` source edit behind the existing cross-repo escalation gate.
- Made search/sort/page/filter callback assertions deterministic by defining accessible user interactions, clearing documented mount-time calls, and checking one added call plus the complete payload.
- Required the Slice 0 full-suite baseline to exit zero, preventing unrelated red tests from being silently accepted as a regression floor.
- Removed piped Vitest gates that could hide the test command's exit status, consistent with the hard gate-integrity warning in `/memory/MINION/MEMORY.md`.
- Replaced inverted `grep` chains with explicit zero-diff assertions so a clean diff returns success.
- Updated all slice, impact, and out-of-scope references after consolidation and removed the contradictory claim that another proposal frontmatter would be edited.

## Human flags

None.
