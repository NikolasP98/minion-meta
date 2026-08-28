---
spec: 2026-08-03-crm-icp-score-spec
pass: 2
verdict: approved
reviewer: supervised-codex-takeover
created: 2026-08-28
score_slice_size: 8
score_dod_verifiability: 9
score_scope_containment: 9
score_impact_zones: 9
---

# Pass 2 correctness and collision review

The spec is approved after reconciliation against `minion_hub@1b47e8ced0751eeb301c9a24d16082f36fe48f78`.
No unresolved product choice remains, and the high-impact `data` and `ui` topics keep
the resulting PR behind human review.

## Evidence and corrections

- Confirmed the pagination dependency shipped and already owns ICP server projection,
  inclusive `minIcp`/`maxIcp`, `sort: 'icp'`, `NULLS LAST`, API parsing, CSV plumbing,
  and unit/PGlite coverage. Those parts are prerequisites now, not new work.
- Confirmed the generic atomic `setContactCustomField` writer and the relationship
  inference lease kernel exist. The corrected spec requires reuse and rejects a second
  read-modify-write implementation.
- Preserved zero-DDL storage, per-org off-by-default behavior, bounded LLM input and
  spend, presence-only sensitive attributes, masked free text, claim stripping, and
  the unscheduled automation truthfulness rule.
- Split the prior roster-plus-settings UI unit into independently verifiable 4–8 hour
  units. U1 was narrowed to contract/settings/masking because the atomic setter already
  exists; U6 is evidence-only and may not widen scope.
- Recast every unit as a numbered `Slice` heading with canonical topics and a bounded,
  observable completion condition; `next_slice: 1` now binds the first Factory run to
  the contract/settings boundary instead of relying on an ambiguous U1 convention.
- Added the current frontmatter topic manifest. `logic`, `data`, `ui`, and `test`
  accurately describe the remaining work and prevent low-risk automerge treatment.
- Kept the tests and acceptance criteria machine-checkable. Each inference boundary
  has a pure or mocked test, while the final gate explicitly preserves the shipped
  pagination contract.

## Human flags

None.
