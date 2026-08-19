---
spec: 2026-08-18-factory-topic-capability-manifest-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

- Set `status: approved`, `pass: 2`, and `verdict: approved` because all correctness defects were mechanically resolvable without a product decision.
- Refreshed the inspected minion-factory baseline to `dd1cb7e11af0a86bb4621c5d922e561afe69d730` so AS-IS anchors the current reviewed main revision.
- Corrected the tag-vocabulary arithmetic: six extra high-stakes strings are absent from the 15-tag corpus, and six corpus tags—not five—are unknown to the old policy.
- Corrected the WorkItem relationship from “disjoint files” to an explicit overlap/order contract because both specs touch proposal validation, risk, lifecycle, and automerge.
- Corrected the M0 relationship so this spec preserves the landed string/object required-check shape and App-identity gate instead of claiming `Set.has(object)` remains compatible.
- Replaced unverifiable `manifest_prev_hashes` with append-only `run_manifest_revisions` plus a transactional current projection because predecessor hashes alone do not preserve immutable history.
- Defined manifest sources for proposal-backed spec runs, spec-backed dev runs, task-only dev runs, and retries so “every dev/spec run” is implementable and no route silently lacks policy.
- Added `declaredTopics` and `cli/factory --topics` for task-only runs because the existing CLI is a real caller of `/runs` and was a missing impact zone.
- Required retries/requeues to inherit the exact policy snapshot and latest manifest rather than re-resolve under mutable current policy.
- Expanded the taxonomy schema with explicit merge eligibility and required-stage/evidence fields because risk tier alone cannot preserve the existing docs/test/deps-only automerge rule.
- Added reserved canonical `unclassified` and conservative aggregation because unmatched or mixed `docs + logic` changes must never collapse to low risk.
- Required every fleet repo/version to have an explicit deterministic classifier and made unmatched paths first-class output because “no classifier match” was previously a fail-open empty result.
- Added package-manifest/lockfile `deps` classification so the stricter unmatched-path rule does not accidentally eliminate the existing dependency-only low-risk path.
- Added policy/classifier cross-validation so factory path rules cannot emit topic names absent from the canonical registry.
- Replaced advisory per-slice topics with validator enforcement for every non-grandfathered spec, using an exact legacy-id snapshot so a new file cannot evade the rule by backdating `created`.
- Required schema-valid, atomically replaced cache data because a corrupt last-known-good file must not become an accepted policy.
- Added stored execution-policy JSON/hash and version-keyed classifier retention because the original v1→v2 test could not actually reclassify an old run without old rules.
- Removed duplicated factory policy literals from `risk.ts`, lifecycle, automerge, and `agent/run.sh`; review strictness now consumes the runner-resolved manifest, preserving the roadmap’s controller-owns-truth rule.
- Made `requiredStages` and `requiredEvidence` enforced queue/merge predicates because persisted-but-unused arrays are not capabilities or gates.
- Added one idempotent `reclassifyRunFromPr()` called by both `postFinish()` and the sweep because the original prose claimed two touchpoints while Slice 4 implemented only one.
- Required complete `per_page=100` PR-file pagination and stable head-before/head-after binding because a page-1 subset or concurrent push cannot safely drive merge policy.
- Preserved every existing automerge predicate and exact opt-in behavior while adding current-manifest eligibility; this follows the hard constraints in `/memory/MINION/MEMORY.md` and `/memory/MINION/sdlc-board-triage-and-phase-gates.md` (automerge remains disabled through M7, checks and pagination fail closed, reviewed SHA remains binding).
- Reconciled only runner-owned `topic:*`/`risk:*` labels and preserved unrelated labels because replacing the complete label set would delete human/bot state.
- Clarified that commit/PR-body trailers are queue-time projections, labels are current projections, and `Spec-SHA` is the existing content SHA-256 rather than a Git commit id.
- Corrected the runtime-dependency alert: new queueing reads mutable meta policy, while reclassification uses the stored snapshot and does not depend on meta availability.
- Expanded cross-repo impact and end-to-end verification for schema transactions, immutable revision queries, per-slice validation, unmatched/page-2 diffs, label preservation, and required evidence.
- Cited `/memory/MINION/minion-factory-agent-pipeline.md` as supporting context for controller-authored evidence/projections and the established runner/agent trust boundary.

## Human flags

None.
