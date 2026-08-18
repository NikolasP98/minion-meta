---
spec: 2026-08-18-factory-workitem-handoff-schema-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

- Set `status: approved`, `pass: 2`, and `verdict: approved` because every correctness issue was resolvable from the proposal, live source, related specs, and operator memory without a human product decision.
- Reframed the opening around the proposal's exact four defects and definition of done, removing claims that were not carried through by the implementation plan.
- Added explicit governing-contract citations, including `/memory/MINION/factory/2026-08-18-60a08042.md` for the proven wrong-repository dispatch and `/memory/MINION/factory/2026-08-17-c5f12e0e.md` for unavailable Docker/SSH verification.
- Added `automerge.ts` to the commit-pinning impact zone because its mutable spec-tag fetch could change merge eligibility after review.
- Required `spec_sha` propagation through both automatic and API requeues, closing the two inserts that otherwise lost the pin while copying `spec_id` and `spec.md`.
- Required manual spec runs to verify that the requested repo belongs to the pinned spec, preventing an explicit run from recreating the wrong-repository handoff.
- Made new spec runs fail loudly when their SHA is missing and legacy spec-backed runs ineligible for automerge, eliminating mutable-branch fallback.
- Replaced the proposed review JSON syntax check with a complete schema contract, including enum/range and verdict/findings invariants.
- Added the score/axes/reviewer/reviewed-commit fields required by the approved G4 contract while leaving its board-level `pass|warn|block` mapping to `specs/2026-08-17-sdlc-phase-gates-scoring-spec.md`.
- Moved the script-stamped reviewed commit until after reviewer-applied changes are committed, because stamping immediately after the harness would bind the verdict to the pre-fix head.
- Required review artifacts to be removed on every fix iteration so stale JSON cannot pass a later review.
- Removed the redundant `runs.review_findings_max_severity` column and stats change because the approved phase-gates contract makes the artifact—not a derived DB field—the source of truth.
- Replaced unsafe automatic multi-repo fan-out with the proposal's allowed fail-loud behavior; `/memory/MINION/factory/2026-08-18-60a08042.md` proves slice number is not repo routing metadata.
- Preserved the single-repo duplicate guard and specified alias deduplication, avoiding unnecessary pair-scoped behavior when multi-repo auto-dispatch is deliberately refused.
- Defined the canonical WorkItem as each proposal-index record and supplied concrete types for source trust, risk class, priority, owner, and lifecycle state.
- Reused the established `critical|high|medium|low` priority vocabulary while keeping scheduling out of scope, satisfying the proposal without changing FIFO policy.
- Kept `value` independent from priority, avoiding the previous contradiction that deferred the proposal's required priority field while claiming the WorkItem DoD was met.
- Added `source_trust` and changed auto-approval to require `trusted-automation`; the earlier `source: human` requirement would have made eligible human drafts auto-approve because live `promoteSweep()` tests only for a non-empty source.
- Added `unclassified` risk and risk/tag consistency validation so untagged work remains fail-closed and `[infra]` cannot declare itself low risk.
- Split the former cross-repo WorkItem slice into separate minion-meta schema and minion-factory consumer ship units, following `/memory/MINION/factory/2026-08-17-3e525e00.md`'s one-repo branch constraint.
- Made the historical retrofit deterministic with explicit rules for the current source prefixes and a fail-closed unknown-source case, then required it to land atomically with validation.
- Replaced ambiguous monitor ids with a stable source-plus-fingerprint-hash contract, preventing collisions and unbounded paths.
- Required allowlisted monitor tags and server-derived trust/risk, removing the unsafe “allowlist or pass through—implementer's call” choice.
- Replaced ad hoc quote substitution with JSON/YAML scalar encoding and whitespace-collapsed titles, making the injection definition of done verifiable.
- Preserved in-TTL monitor dedupe as a SQLite-only update; the previous requirement to edit the proposal on every repeat contradicted the existing flood-control mechanism and would create commit spam.
- Corrected the impossible claim that two GitHub Contents API PUTs update proposal and index in one commit; the spec now requires two conditional commits and an idempotent repair path.
- Made a successful monitor response depend on both proposal and index writes, so the board-visible WorkItem requirement cannot silently degrade to a stale index.
- Separated local PR gates from post-deploy operator E2E checks, citing `/memory/MINION/factory/2026-08-17-c5f12e0e.md` so unavailable Docker/SSH checks cannot be silently skipped or faked.
- Made the pinned-content E2E compare the spec body after the injected audit comment and disabled the review fix loop for the deliberately broken fixture, so both checks test the claimed state deterministically.
- Updated cross-repo ordering and end-to-end acceptance to match the corrected six-slice design and fail-loud multi-repo outcome.

## Human flags

None.
