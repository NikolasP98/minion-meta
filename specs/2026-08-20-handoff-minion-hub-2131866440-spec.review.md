---
spec: 2026-08-20-handoff-minion-hub-2131866440-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-20
---

# Pass 2 review — CRM journey deposit-rule handoff

## Changes made

1. Set frontmatter to pass 2, `status: approved`, `updated: 2026-08-20`, and
   `verdict: approved` because all correctness gaps were resolvable from the approved contract and
   verified source without a new human decision.
2. Changed the title and `relationship` from `already-satisfied` to `extends` because the marker is
   not implemented and the canonical S2 needs journey-specific correction before it can satisfy
   its own default-parity invariant.
3. Limited `related` to the canonical spec because the scalar `extends` relationship does not
   describe the independently owned finance and similarity proposals; retained them only as
   coordination notes.
4. Replaced inference from marker wording with read-only evidence from public
   `minion_hub/master` commit `5e77bbe7a15aec126651f6cdac76672020153abd`, proving S1 landed and
   identifying the live query and mapper behavior.
5. Corrected the AS-IS label from the draft's assumed `Reserva` to the verified
   `Reserved a consult`; `DEFAULT_DEPOSIT_RULE.label` is currently unused by journey mapping.
6. Made `Reserved a consult` the normalized absent/malformed/omitted-label default because using
   canonical S2's carried `Reserva` default would visibly regress every org with no deposit config.
7. Corrected the journey classification description: `has_proc`, not the selected
   `only_reserva_flag`, controls `purchase` versus `reserve`, and representative-item ordering is
   independently rule-dependent.
8. Required deletion of the unused `only_reserva_flag` projection because its vocabulary-bearing
   alias is dead code and would fail the canonical zero-hardcode verification after marker removal.
9. Required one call-scoped resolution at the shared deterministic boundary so both
   `contactJourney` and `analyzeJourney` use one consistent rule without module-initialized state or
   repeated settings reads.
10. Defined configured-label behavior narrowly: explicit labels affect only `reserve` milestones,
    while purchase labels remain derived from the selected non-deposit item.
11. Added explicit absent, malformed, custom, mixed-invoice, empty-keyword, label, and resolver-call
    proofs because the existing mock tests inject `has_proc` and cannot prove SQL classification.
12. Added a mandatory executed SQL query-path test with `text` `org_id` and no skips, following
    `/memory/MINION/factory/2026-08-20-2f403efa.md`, which records production/fixture type drift and
    DB-backed suites silently skipping without PostgreSQL/PGlite.
13. Replaced ambiguous zero-hit commands with fail-on-match guards bounded to the exact journey
    marker and journey source, avoiding accidental ownership of sibling markers.
14. Added branch reconciliation because `minion_hub/CLAUDE.md` names `dev`, while the public `dev`
    ref was unavailable during review and the watched proposal/source are on `master`.
15. Expanded impact analysis to both public journey entry points, route/page consumers, stored AI
    milestones, and possible external caching while preserving the canonical no-DDL,
    no-shared-package, and no-protocol conclusions.
16. Made sweep-owned closure observable and explicitly prohibited manual proposal/index edits, so
    the source Definition of Done is checked without widening implementation scope.

## Memory and evidence notes

- `/memory/MINION/factory/2026-08-20-2f403efa.md` shaped the fixture-schema and non-skipped
  integration-test gates.
- `/memory/MINION/MEMORY.md` and
  `/memory/MINION/sdlc-board-triage-and-phase-gates.md` confirm that handoff markers are paired with
  proposal lifecycle tracking and that the sweep, rather than implementation code, owns closure.
- The requested SQLite observation database was unavailable at
  `/home/agent/.claude-mem/claude-mem.db`, and no semantic memory-search MCP tool was exposed in
  this session; neither limitation blocks the source-anchored corrections.
- The Hub checkout is absent from this workspace. `minion_hub/CLAUDE.md` and the cited source files
  were read through public GitHub raw/API endpoints without modifying Git state.

## Flagged for the human

None. The canonical zero-regression requirement and verified current output determine the default
label correction; no new product, data, or security decision is required.
