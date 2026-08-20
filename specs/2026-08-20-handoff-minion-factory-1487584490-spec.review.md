---
spec: 2026-08-20-handoff-minion-factory-1487584490-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-20
---

# Pass 2 correctness review

## Changes made

- Set `status: approved`, `pass: 2`, `updated: 2026-08-20`, and `verdict: approved` because every correctness issue was resolvable from existing code and contracts.
- Clarified that only production behavior is confined to `scripts/unstick-cron.sh`; the fixture and classifier test are also required owner files.
- Corrected the ancestor-proposal lifecycle statement from stale `review` wording to its machine-truth `status: in-spec`.
- Recorded that the prior spec's `/budget` follow-up has since shipped, leaving this cap as the relevant remaining follow-up.
- Added the operator-memory constraints that preserve deterministic detection, immutable `requeue_of`, canceled-run finality, behavioral collision review, and tracked self-update deployment semantics.
- Corrected the baseline test inventory from two fixtures/fourteen assertions to six test cases across three fixtures, including the budget-paused regression fixture.
- Replaced fail-open ancestry undercounting with an explicit fail-closed unknown-ancestry path because treating a failed lookup as the full depth contradicted the spec's “never requeue at cap” invariant.
- Defined `LINEAGE_CAP` as total immutable `requeue_of` hops regardless of caller because the current schema has no automatic-versus-manual provenance.
- Clarified monitor semantics as exactly one request per classified row/tick, deduped by the endpoint into one board artifact across repeated ticks.
- Bounded lineage walking at the first proven cap instead of requiring an unnecessary extra hop, preserving termination for corrupt/cyclic ancestry.
- Added malformed/non-object/missing-parent validation and required clean integer-only helper output so `api()` diagnostics cannot break command-substitution comparisons.
- Required local-map lookup to distinguish an absent id from a present root whose parent is null.
- Added a fixture-only single-run lookup trace so local-first resolution and fallback calls are directly testable rather than inferred.
- Moved creation of the shared lineage fixture into Slice 1 so that slice's helper tests do not depend on a file deferred to Slice 2.
- Made Slice 1 wire and prove known/unknown ancestry handling before Slice 2 adds the numeric cap, so each slice's requirements match its own tests.
- Added explicit unknown-ancestry tests proving one monitor request, no mutation, no facilitator handoff, and no hang.
- Added a capped Class A fixture/test because pass 1 required Class A enforcement but proved only Class C.
- Added exact per-id capped-monitor counts, no-cancel/no-requeue assertions, a named fresh-row requeue assertion, and facilitator-exclusion assertions.
- Added an exact-one baseline marker guard and target-text check so removal of a different/new handoff marker cannot satisfy the proposal.
- Added the existing budget fixture to Slice 0 recon and made preservation of its Class B carve-out explicit in the impact assessment.
- Replaced the invalid `npm test -- unstick-classifier` invocation with a valid focused Node test command for Slice 1 and the repository's full `npm test` gate for Slice 2/acceptance.
- Replaced `grep -c ... # 0`, whose zero-match exit status is failure, with the executable `! grep -q` absence gate.
- Fixed the end-to-end `cd runner` path leak by running runner commands in a subshell before checking the root-level script.
- Corrected the server-side-alternative and impact wording to acknowledge manual/other requeue callers rather than calling them hypothetical or nonexistent.
- Corrected final diff scope from “no other file changed” to “no file outside the three declared owner files changed.”

## Human flags

None. The fixed cap value remains the pass-1 design choice; pass 2 only makes its counting and enforcement semantics consistent and testable.

## Review context

- Memory decisions cited in the spec came from `/memory/MINION/sdlc-board-triage-and-phase-gates.md` and `/memory/MINION/factory/2026-08-19-c92fef82.md`.
- The requested SQLite observation database was absent at `/home/agent/.claude-mem/claude-mem.db`, and no semantic memory-search MCP tool was exposed in this session; neither absence created a human decision gap.
