---
spec: 2026-08-18-factory-m0-safety-foundation-spec
pass: 2
verdict: approved
reviewer: orchestrator-review
created: 2026-09-02
score_slice_size: 10
score_dod_verifiability: 9
score_scope_containment: 10
score_impact_zones: 10
---

# Pass 2 correctness and current-state review

No product or security decision remains. The spec is still approved, but its
implementation record was stale after M0 S2 merged.

## Changes made

- Recorded S1 as shipped by minion-factory PR #21 and S2 as shipped by PR #155.
- Replaced the obsolete claims that Factory had no CI and matched checks only
  by name with facts verified on the current `dev` tip.
- Audited the current test suite against every S3 requirement. Lifecycle
  transition and reason normalization, spec re-hashing, the automerge matrix,
  and requeue idempotency already have direct tests and must not be rebuilt.
- Narrowed the remaining atomic slice to four missing regression surfaces:
  startup-secret validation, `normalizeStages` provider independence,
  `maxTurns` validation, and corrupt `result.json` handling.
- Preserved the existing first-party CI workflow as the ship gate instead of
  asking the implementation agent to replace it.

## Verification limits

The negative mutation checks required by S3 are implementation-time evidence;
this pass reviewed current source and test names but did not modify guards to
manufacture those failures on the shared branch.

## Human flags

None.
