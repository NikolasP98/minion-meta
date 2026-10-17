---
spec: 2026-08-31-ci-compute-savings-bun-test-roadmap-spec
pass: 2
verdict: changes_requested
reviewer: root-reconciliation
created: 2026-10-17
reviewed_commit: a5dd978c
score_slice_size: 3
score_dod_verifiability: 3
score_scope_containment: 4
score_impact_zones: 4
score_collisions: 4
score_testability: 5
---

# Review: attributable cost requires measured, correctly bound evidence

Reviewed the complete six-delta parent and current Factory source at
`43a174b2e87c4d572ffd2ba030269db22a0b7bd2`. A focused read-only research agent
independently traced the active ledger, transport and closure seams. This is a
changes-requested planning review, not owner approval or a deployment verdict.

## Standards

1. **Expose the migration gate.** S1 proposes a new persistence table in
   `runner/src/db.ts`, while the old top-level/S1 topics were only infra/test.
   Constitution V includes migrations in owner-gated data/security work.
   Correct topics and retain owner approval before code and owner merge.
2. **Keep delivery repository-scoped.** S2 names both Factory and Base, and S4
   names three independent repositories. Rewrite delivery units into separate
   repository PRs with explicit ordering, while preserving all D1-D6 outcomes.
   Multi-repo parent metadata is not permission for one worker to write all repos.
3. **Use current Spec Kit artifacts.** The surviving flat pass-1 draft has no
   current executable plan/tasks for the corrected measurement contract. Complete
   the mandated workflow after the requirements below are resolved; do not emit
   plausible tasks over an unresolved identity model.

## Spec

### R1 — bind observations to the identity actually observed

`runner/src/db.ts:922` provides immutable logical phase attempts.
`db.ts:756` provides reservation tuples `(run_id, phase, attempt)`.
`agent/lib/cost.sh:34-78` includes a paid sequence in admission request IDs but
the reservation table does not retain that complete request identity.
`runner/src/phase-executor.ts:449-474` creates broker attempts under synthetic
`pipeline-<instance_id>` run IDs, with request/claim/instance bindings.

A required phase-attempt-only foreign key omits legacy paid stages, while a
required reservation key omits non-model setup/test and reservation-free broker
roles. A join requiring `runs.id` excludes synthetic broker identities.
Specify discriminated observed subjects and nullable validated links; resolve
broker repository ownership through the instance binding. Preserve the
difference between logical phase attempt, admitted budget slot, role turn and
externally evidenced provider request. Do not synthesize executable phases or
claim exactly-once external billing from a unique local record.

**Proof required:** logical attempts with no paid reservation, legacy reconcile
admissions with no phase attempt, broker synthetic run identity, replayed
admission receipts, multiple/fallback calls and unknown external outcome after
a crash. Preserve every original D1 acceptance subject.

### R2 — separate allocated cost from directly observed cost

`budget-reservations.ts:99-114` settles direct stage data; non-provider values
are floored at conservative estimates. `:117-136` proportionally distributes
reported legacy run totals and labels their shares provider-reported. Those
shares are allocations, not measured per-phase prices. `:35-56` sums evidence
classes for enforcement; `queue.ts:313-328` avoids counting projected run cost
again when reservations already represent it.

Specify separate directly observed API dollars, allocated run-total shares,
conservative commitments, subscription usage and unknowns. Historical rows
without direct attribution cannot be retrospectively certified as exact phase
billing. Preserve existing budget admission/enforcement and avoid double
counting logical aggregates alongside their child observations.

**Proof required:** directly observed, allocated, estimated, subscription-only,
mixed, zero and unknown records; duplicate reconciliation; per-dimension totals;
unchanged enforcement on the same fixtures. Estimated subscription usage must
never become exact dollar spend.

### R3 — include the real producers and strict transport consumers

`phase-role-transport.ts:177-183` validates broker token usage, but `:267-271`
discards it. `phase-executor.ts:261` requires an exact transport response shape.
`queue.ts:690-785` strictly validates containment artifacts. Actual emitters are
`agent/factory-develop.sh`, `factory-review.sh`, `factory-resolve-conflict.sh`
and `factory-phase-command.sh`, not only legacy `run.sh`/`spec.sh`.

Revise the touched-file/contract matrix and evolve both sides together. Usage
belongs in a controller-owned observation contract, not model-authored handoff
evidence. Include rank/reconcile/spec/discovery legacy paths where the existing
aggregate-only result cannot prove phase attribution. A requested model alias
or configured resource limit is not resolved-provider or measured-resource proof.

**Proof required:** actual broker HTTP adapter, strict executor envelope,
containment producer-to-parser round trip, unknown upstream identity, rejected
malformed metrics, and legacy worker observations. Do not weaken strict parsing
globally merely to accept new metadata.

### R4 — cover every closure and define immutable versus late evidence

Normal closure is at `queue.ts:1688`, with cost settlement after its transaction
at `:1736-1743`. Missing/invalid artifact recovery is at `:1783-1800`;
cancellation/crash/bad-evidence closures occur at `:2097-2130` and `:2430-2459`.
Broker terminal and restart paths also occur at `phase-executor.ts:529,701,785`
and `db.ts:1959`. Terminal attempt evidence is immutable.

Specify the central idempotent projection/reconciliation boundary, source
ordering, crash points and whether later observations can enrich a reporting
record. Do not mutate terminal execution evidence, relaunch external effects or
invent a second executable phase lifecycle. An append-only record and an
unspecified upsert/enrichment policy are contradictory.

**Proof required:** closure before/after telemetry persistence, recovery without
artifact, cancellation, broker restart, stale claim fencing, duplicate/restarted
reconciliation and source-unavailable outcomes. Upgrade fixtures must preserve
existing execution and budget histories.

### R5 — measure test, cache and overlapping time correctly

`factory-phase-command.sh:31-48` and legacy `run.sh:563-565` currently provide
command exit status, not full discovered/pass/fail/skip counts, RSS or CPU time.
`queue.ts:2036-2064` already records `cachedTest` and `testContractHash`.
Container CPU/memory limits are not resource observations.

Preserve raw durations but calculate attributed wall time using clipped
interval union, with explicit overlap/unattributed time. Use a declared clock
and skew policy. Specify actual resource collection before container removal,
test reporter adapters and null-with-reason for unavailable dimensions. Cached
test reuse is not a newly executed suite.

**Proof required:** nested/overlapping intervals, wall-clock skew, missing stats,
reused candidate tests, missing/incompatible reporters and genuine fresh tests.
The old `sum(phase wall) + remainder = run wall` equation is not generally valid.

### R6 — refresh later-slice source assumptions without reopening shipped work

At Base `3c4d5bef`, the Factory adapter is `src/lib/server/factory.ts` and the
stats route is `src/routes/stats/+page.svelte`; the old S2 paths
`src/lib/factory-api.ts` and `src/lib/components/StatsView.svelte` are not the
current surfaces. Refresh these paths and split Factory API/Base UI delivery.
The existing aggregate budget widget is present but is not attributable phase
telemetry.

Factory `agent/lib/cost.sh` already accounts for Jev/OpenRouter calls and
`README.md` documents their existing decision/shadow paths. Update the draft's
claim that OpenRouter is wholly absent: S6 must evaluate a new canary against
current evidence, not rebuild or remove existing routing. Likewise refresh Bun
versions, installed runners and workflow paths at each actual repository head
before their later benchmark slices. Do not treat August release claims as
current verified toolchain facts or infer equivalence across repositories.

## Recovery decision and next action

Run `60bca3bb` ended with `index validation failed after pass 2`; its retained
log identifies invalid verdict `degraded` after both providers resolved to Codex.
Current `agent/spec.sh` already uses the valid `changes_requested` verdict for
same-provider degradation; the historical failure is not a request to rewrite
the current index parser or resurrect its old verdict vocabulary.
Do not rescue that result by renaming the verdict to approved or buying another
full pass-1 run. Its source draft stands; this valid review records the actual
remaining work without claiming cross-provider approval.

Revise R1-R6, then produce the grounded Spec Kit plan/tasks and a fresh review.
Keep all six original deltas and the full benchmark/adoption/canary decision
requirements. Current required checks, ranking thresholds, budget authority and
production queue remain unchanged by this review.
