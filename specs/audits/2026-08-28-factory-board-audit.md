# Factory board audit — 2026-08-28

Source baseline: `minion-factory@34a3b21`. The operator applied these dispositions after a four-agent evidence sweep. This sidecar preserves the audit without mutating grandfathered spec bodies protected by the heading-lint one-way ratchet.

## `2026-08-07-projects-github-repos-and-factory-gates-spec`

The Hub half shipped (`workforce/projects/[id]/repo` plus API routes). The Factory half predates `minion-factory` and is obsolete under the shipped v3/v4 Factory (`reconcile.sh` gates, spec/proposal board, `humanMergeOnly`). The artifact is retired rather than marked superseded because it has no single successor spec.

## `2026-08-17-factory-token-budget-governance-spec`

Factory S1-S4 shipped: the cost ledger, `GET /budget`, budget pause, run caps, review-fix reserve, and tier ladder. S5 remains: the verified-absent `minion-base` budget widget and `/budget` consumer.

## `2026-08-18-agent-instruction-parity-and-repo-policy-spec`

S0/S1 shipped (`repo-policy.yaml`, schema, generated policy, and CI). S2 `check-agent-instructions.mjs`, the S6 Factory consumer, and S7/S8 remain. At the audit baseline, `runner/src/queue.ts` still carried its own `REPO_ALIASES` map.

## `2026-08-18-factory-controller-completion-invariants`

The `already_satisfied` outcome, merge events/reservations, outbox jobs, reclassification, and requeue behavior are addressed. The Actions-billing blocker also cleared. Production was approximately 135 commits beyond this artifact's baseline at audit time.

## `2026-08-18-factory-durable-state-outbox-spec`

S1-S3 are in production: lifecycle events, outbox jobs, and pump/lease/dead-letter behavior with their tests. Slice 4 remains deliberately blocked on the human lifecycle edge-table decision documented in section 8.

## `2026-08-18-factory-m0-safety-foundation-spec`

D1-D4 and D6 shipped. D5 remained: bind required-check acceptance to the expected GitHub App identity rather than check name alone, or explicitly record why `expectedIdentity` is the settled replacement.

## `2026-08-18-factory-orchestration-round7-spec`

Returned to draft for respec. The graph deliverables were absent, multi-repo remained refused, and the design targeted `runs` after sequencing had moved to `pipeline_instances` plus `phase_requests`. Rebase the graph/profile/resolver design onto the lineage instance layer before re-approval.

## `2026-08-18-factory-orchestration-tests-spec`

Addressed: the section 2/3 exports exist, the unified Node test command runs the Factory suite, CI runs runner/type/shell gates, and board retry `aa502dc0` passed and merged as Factory PR 99.

## `2026-08-18-factory-postmerge-discovery-loop-spec`

S1/S2 shipped. S3 remains deliberately suspended under `proposals/2026-08-20-discovery-synthesis-suspension.md`. S4 finding re-verification remains; `findings.last_verified_at` was unused at the audit baseline.

## `2026-08-18-factory-topic-capability-manifest-spec`

S1-S5 were addressed across the canonical taxonomy, meta validation, manifest resolution/enforcement, reclassification, trailers, and label outbox work. The remaining ledger item was the S6 operator documentation.

## `2026-08-18-factory-workitem-handoff-schema-spec`

S1 shipped as content-hash spec pinning and S3 shipped as fail-loud multi-repo refusal. S2 must be re-scoped to containment review evidence; S4 trust/risk fields, S5 risk classification, and S6 issue-filing replacement remain.
