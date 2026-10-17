# Consumer-first research

Evidence inspected on 2026-10-17: Factory deployment
`43a174b2e87c4d572ffd2ba030269db22a0b7bd2` and meta snapshot
`6ba120cea916d5065f3d53cd6aefb8727fa32843`. Read-only independent research
confirmed the same seams. This records source evidence, not implementation proof.

## Decision: validate every new approval/admission

`runner/src/lifecycle.ts:proposalAutoApproveEligible` trusts nonempty source;
`queueApprovedProposalRuns` trusts approved index rows. `transition` strictly
validates specs but not proposals. `runner/src/index.ts` `/pipeline/spec` uses
permissive proposal frontmatter and only an approved-status check.

Rationale: changing the predicate alone leaves approved-index and explicit-start
bypasses. Re-evaluate freshly fetched canonical bytes before a committing edge.
Alternative rejected: trusting index fields or a caller-supplied actor label.

## Decision: current topic/manifest policy wins

`runner/src/risk.ts` delegates to validated topic policy. `manifest.ts` already
aggregates high, unclassified and low risk; `automerge.ts` requires the pinned
manifest's exact low risk and review evidence. The historical static high-stakes
union in the parent is obsolete. The old helper exposes only high/unknown,
which misses recognized unclassified topics during automatic approval.

Rationale: reuse the present policy and exact-low condition.
Alternative rejected: restoring literal tag lists or mutable merge authority.

## Decision: distinguish provenance from approval

Human and untrusted-external records cannot auto-approve, but valid records with
legitimate explicit approval may proceed to spec. Required fields are checked
for all new approvals/admissions. Source text does not authenticate its writer;
repository write/review controls remain that boundary.

## Decision: consumers precede producer/backfill

Meta `scripts/proposal-index.mjs` currently projects source but not the full
WorkItem fields; Factory CI-watch/reconciler and request-agent producers also
need later updates. The prior review on meta PR #273 rejected producer-first
rollout because `source: human` could be interpreted as automatic provenance.

Rationale: deploy refusal of incomplete legacy intake first, then a reviewed
producer/schema/backfill release. Keep all existing executions intact.
Alternative rejected: hard-coded historical corpus counts or retrofitting
`*.review.md` gate sidecars as proposals.

## Decision: new retries require current admission validation

Existing lifecycle code permits pinned retries while current topic policy is
unavailable. This plan intentionally pauses NEW retries in that condition and
when WorkItem fields are incomplete. Compare new canonical topics/risk/current
policy hash with inherited authority before a new retry. Changed authority is
held for renewed review/fresh lineage. Compatible children inherit unchanged
snapshots; existing rows and manifests are never recomputed.

## Execution-content limit

`agent/spec.sh` reads proposal content from its checkout after admission. This
slice does not add a proposal-byte snapshot/commit handoff; it must not claim
end-to-end immutable proposal execution. Existing spec commit pinning is a
different contract. The parent retains this limitation for follow-up assessment.

## Decision: explicit legacy-parent context delivery

Current `runner/src/index.ts` `/runs` loads `specs/<canonicalSpecId>/plan.md` and
`tasks.md`. This feature directory is 104 while its flat parent retains a legacy
date-based id. Explicit per-repo dispatch must supply the complete plan/tasks in
the task payload from the approved spec's reviewed commit and verify storage.
Body links are not evidence of context delivery. This uses the existing explicit
task interface and makes no new directory-bridge implementation claim.
