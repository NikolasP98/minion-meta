---
spec: 2026-08-28-factory-containment-base-reconciliation-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-28
score_slice_size: 8
score_dod_verifiability: 9
score_scope_containment: 9
score_impact_zones: 9
---

# Pass 2 correctness and consistency review

No human decision remains. The corrected spec is internally consistent, keeps all implementation in
`minion-factory`, and leaves containment activation and automerge disabled.

## Changes made

- Advanced the spec to pass 2 with approved status/verdict and the required review date.
- Removed the nonexistent `2026-08-23-factory-containment-effect-ledger-integration` related-spec reference; retained the shipped `phase_effects` ledger as a code dependency without inventing a spec artifact.
- Defined both successful exits from `resolve-conflict`: pre-setup reconciliation returns to `setup`, while post-develop reconciliation proceeds to `self-test`.
- Clarified conflict failure semantics: the remote ref remains at the published head and no candidate is sealed; the dirty local workspace need not be byte-identical to the published checkout.
- Reconciled conflict-path ownership by making the trusted entrypoint derive the path list and pass that derived value to the restricted worker environment.
- Corrected I3 to bind the full `{testedBase, testedCandidate}` pair atomically; binding only the base would permit a later, untested candidate to reach publish.
- Added downstream candidate-equality checks and distinct pre-remote failures for candidate mismatch and non-ancestor tested base.
- Made deploy compatibility explicit for old passed self-test rows: they rerun `self-test` once to acquire the pair instead of reconstructing evidence or failing permanently.
- Required the legacy publisher to combine its append-only ancestry guard with an exact `--force-with-lease` pinned to the observed published head.
- Split the oversized drill-plus-CI-plus-runbook slice into a 6–8h drill slice and a 4–6h activation-wiring slice.
- Defined the crash/restart scenario's three fixed ledger boundaries so “seven scenarios” has a stable, countable meaning.
- Replaced the stale fixed test-count gate with a per-slice recorded baseline and strictly increasing post-change count.
- Updated the impact table for two new self-test evidence fields, old-row rerouting, shipped ledger reuse, and the new slice numbering.
- Preserved the hard controller-authority and reviewer/applier separation constraint from `/memory/MINION/minion-factory-agent-pipeline.md`; the resolution worker never pushes.
- Preserved the wholesale environment-emission constraint from `/memory/MINION/minion-factory-agent-pipeline.md` by keeping every new runtime variable gated through `deploy.sh`.
- Preserved the exact-SHA self-update deployment gate from `/memory/MINION/factory-failed-runs-rootcause-2026-08-28.md` and the direct-exit-code rule from `/memory/MINION/MEMORY.md` (`piping-gates-masks-exit-code`).

## Human flags

None.
