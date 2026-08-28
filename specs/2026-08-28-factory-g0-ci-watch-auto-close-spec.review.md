---
spec: 2026-08-28-factory-g0-ci-watch-auto-close-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-28
score_slice_size: 10
score_dod_verifiability: 9
score_scope_containment: 10
score_impact_zones: 10
---

# Pass 2 correctness and consistency review

No correctness issue requires a human product decision. After correction, the spec is one
4–6-hour atomic slice, changes implementation only in `minion-factory`, names the intended
`minion-meta` data mutation, and leaves the existing board contract unchanged.

## Changes made

1. Advanced the spec to pass 2 with approved status/verdict and the required review date because all identified defects were resolvable from approved scope and verified contracts.
2. Corrected the helper-precedent inventory to six tested behavior helpers plus the separately sourced cost helper because the prior text falsely claimed every copied helper had a same-named CI test.
3. Defined the evaluation boundary as configured watch entries and workflows present in the existing 30-run snapshot because absent run evidence must not be treated as green.
4. Made every status other than `draft`/`review` an explicit no-op because the prior human-disposition list omitted valid `in-spec` and `done` states.
5. Converted the dangling Slice 1a/1b/1c references into named implementation steps inside Slice 1 because DELTA entries must map to units that actually exist.
6. Required the helper to be sourced and guarded once before the watch loop because sourcing it once per configured entry would be redundant and inconsistent with sibling helpers.
7. Replaced the impossible shared `factory-ciwatch` grep claim with four exact static assertions because the `ciwatch_autoclose` call does not contain the image-path substring.
8. Corrected the Docker baseline from six to seven existing sourced library copies because `cost`, `handoff`, `mergescan`, `discovery`, `resume`, `projection`, and `workspace-resume` are all present at the verified revision.
9. Added a 4–6-hour estimate because G2 requires each mergeable slice to fit the 4–8 focused-hour convention.
10. Added newest-success/older-failure, newest-failure/older-success, and in-progress-over-completed fixtures because single-run fixtures could not prove the latest-completed-run invariant.
11. Expanded immutable-status fixtures to every non-`draft`/`review` proposal status because representative checks alone would leave lifecycle protection under-specified.
12. Reconciled the file-touch and diff contracts with the corrected source-before-loop placement because the former text required mutually incompatible insertion points.
13. Added the explicit root `AGENTS.md` impact-zone audit because the existing repo table did not name the gateway, channel, DB, agent-format, auth, workshop, pixel-office, and Paperclip zones.
14. Preserved the existing proposal-index, commit, and rebase-retry tail because no new projection or Git-authority surface is required for this data-only lifecycle transition.

## Memory constraints applied

- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` shaped the one-run, independently testable 4–8-hour slice and the pass-2 oversized-slice rule.
- `/memory/MINION/MEMORY.md` (`minion-factory agent pipeline`) preserved controller-owned, rebase-retried meta pushes rather than adding a second commit path.
- `/memory/MINION/factory-failed-runs-rootcause-2026-08-28.md` reinforced evidence-driven, non-perma-pass behavior; missing or non-success run evidence remains a no-op.
- The read-only observation **“Git push race condition fixed: push_meta() helper with 3-attempt rebase-retry added to all meta-writing agent scripts”** corroborated retaining the existing `push_meta()` tail unchanged.

## Human flags

None. The existing 30-run snapshot horizon and removed-watch-entry cleanup remain explicitly out
of scope; the helper fails safe by leaving those proposals unchanged rather than inferring green.
