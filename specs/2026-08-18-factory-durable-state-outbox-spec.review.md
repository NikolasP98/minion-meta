---
spec: 2026-08-18-factory-durable-state-outbox-spec
pass: 2
verdict: changes_requested
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

## Changes made

- Set `pass: 2` and `verdict: changes_requested`; the proposal requires an explicit source→target table, but the repository does not define enough lifecycle policy to author that table without a human decision.
- Added `runner/src/github.ts` to the owner surface because durable handlers need strict HTTP helpers instead of the live helpers that collapse failures to `null`.
- Updated the postmerge-discovery collision from draft/pass 1 to approved/pass 2 and required preservation of its discovery schema, boot enqueue, and specialized retry if it lands first.
- Corrected the WorkItem collision note because this spec now needs a strict queue-dev result path and must share, not bypass, the sibling's fail-loud multi-repo routing.
- Corrected the lifecycle collision note so source-edge validation follows existing request validation and no longer assumes `draft|review → approved` is legal before the human approves it.
- Recorded that both required read-only SQLite FTS searches returned no factory-specific superseding observation and that no semantic-memory MCP was available.
- Clarified that head-SHA stamping already occurs synchronously in `finish()` and must not become a fourth outbox job, preserving the reviewed-SHA rule from the live baseline.
- Expanded event coverage from four status updates to every runtime run creation and status mutation, because an event log described as run history cannot omit `null → queued` or spawn-failure transitions.
- Required each run status change and event append to share one SQLite transaction, because separate update/insert calls leave an avoidable crash gap.
- Replaced the broad terminal guard with exact-source CAS plus `finished_at IS NULL`, because pass 1 allowed repeated `canceled → canceled` finishes and duplicate events.
- Moved canceled-precedence classification inside the finish transaction so the target is derived from the same state snapshot guarded by the update.
- Made cancel's pre-read, exact-source update, and event append one transaction so `from_status` cannot disagree with the row that changed.
- Added a child-process `error` listener and regression test shaped by `/memory/MINION/factory/2026-08-18-75dc674e.md`, because missing Docker emits asynchronously and bypasses the live synchronous `try/catch`.
- Added deterministic unique event keys with replay verification, because retries must neither duplicate facts nor silently ignore a key collision with different immutable data.
- Added a forced SQLite-trigger failure test proving terminal status, event, and outbox rows roll back together; successful final-state assertions alone cannot verify atomicity.
- Added outbox `lease_until` and interval-based expired-claim recovery, because the proposal title includes leases and boot-only reclaim leaves a hung claim stuck until restart.
- Added `dead_reported_at` and retryable dead-letter reporting, because pass 1 swallowed monitor failures after marking jobs dead and could lose the only operator signal.
- Changed unknown outbox job types from successful no-ops to failures, because free-text extensibility must not turn typos or version skew into dropped work.
- Replaced `(created_at, seq)` ordering with a real lower-sequence prerequisite, because a backoff on `husk_close` otherwise allows `auto_fix` to overtake it.
- Required later jobs blocked by a dead prerequisite to become visibly dead and reported, because leaving them pending forever makes the queue unverifiable.
- Made missing run fields promised by enqueue predicates invariant failures rather than successful handler no-ops.
- Required strict GitHub/API helpers and HTTP timeouts, because the live `gh()` and `fetchMetaFile()` return `null` for transient failures and would let the drain mark lost side effects done.
- Split spec promotion into a strict discriminated-result path for the outbox and the existing fail-soft wrapper for sweeps/routes, distinguishing `already_satisfied` from transient fetch failure.
- Required auto-fix monitor POSTs to check HTTP success and throw on failure, because the live swallowed fetch would otherwise defeat outbox retry semantics.
- Required auto-fix replacement-run creation and its creation event to commit together, while preserving boot `enqueue()` recovery after that commit.
- Added lease, dependency, null/non-2xx, unknown-type, strict-promotion, and monitor-retry tests so the new durability claims are machine-verifiable.
- Replaced the terminal-state deny-list with a blocked explicit `EDGES[source] -> targets` requirement, because a deny-list leaves every unlisted source permissive and is not the proposal's requested edge table.
- Required missing and unknown lifecycle source statuses to fail closed, because permissive legacy fallthrough would preserve the audited defect.
- Made GitHub commit history canonical for proposal/spec transitions and narrowed SQLite language to a local projection, because SQLite cannot transact atomically with the Contents API.
- Added commit-SHA event keys for lifecycle projections and placed recording immediately after the markdown PUT, minimizing and honestly documenting the remaining cross-system crash window.
- Corrected README requirements from “full history” to locally recorded history plus the canonical GitHub audit source.
- Updated cross-spec ordering for WorkItem, orchestration tests, and postmerge discovery so their run insertions, extracted requeue function, and finish characterization preserve the new event/outbox invariants.
- Removed the former “full state machine” out-of-scope item because it directly contradicted the proposal's explicit source→target definition of done.
- Updated every test command with isolated data/run directories and `FACTORY_CONCURRENCY=0`, preserving the no-Docker test constraint.
- Rewrote end-to-end acceptance around transaction rollback, canceled idempotency, lease recovery, strict failure handling, dependency blocking, durable dead-letter reporting, and the eventual approved edge table.

## Human decision required

- Approve the exact legal target set, limited to the current proposal target allowlist, for every proposal source status: `draft`, `review`, `approved`, `in-spec`, `rejected`, `retired`, `closed`, and `done`.
- Approve the exact legal target set, limited to the current spec target allowlist, for every spec source status: `draft`, `review`, `approved`, `implementing`, `shipped`, `parked`, `unknown`, `rejected`, `retired`, `superseded`, and `done`.
- Confirm whether the existing autonomous `proposal draft → approved` and `spec draft|review → approved` edges remain legal; changing them also changes `promoteSweep()`/`specSweep()` behavior.

Slices 1–3 are mechanically resolvable, but Slice 4 and full approval remain blocked until this policy is supplied.
