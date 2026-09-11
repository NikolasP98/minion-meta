---
phase: 12-dependency-provenance
plan: "04"
reviewed: 2026-09-09
status: admitted
plan_sha256: bfe18a5633474be8220ca60f248d8807d6069cb6d8a669d2530e0d51a69feff5
execution_ready: false
candidate_fix_accepted: false
blockers: []
execution_gates:
  - Freeze and hand off 12-01 manifest/lock and 10-03 source/fixture ownership first.
  - Establish marked disposable runtime identity before fault injection.
  - Select a pinned repair only after actual query settlement and domain recovery pass.
---

# 12-04 independent plan admission

The bounded reproduce/select/qualify plan is admitted. This does not accept the proposed upstream guard or authorize execution before the stated ownership and candidate gates. No plan/source/lock/fixture mutation or database termination was performed by this reviewer.

## Evidence inspected

- The installed `postgres@3.4.9` source calls `socket.write` in `nextWrite` at connection.js:255; `closed` clears timers and nulls the socket. The scheduled write and reused connection boundary is present in the actual dependency.
- The current 10-03 fixture kills only its identified, marked child backend and separately checks committed draft state, rolled-back ledger work and successful retry from another connection. It expects the known driver exception explicitly; this is domain recovery evidence with an open driver defect, not acceptance of a healthy driver.
- `openDisposablePostgres` validates explicit opt-in, loopback/port/database/user, server marker and identity. Its schema factory validates the existing `qc_job_stock_<32 hex>` namespace before allocating a connection. The new driver test can use that namespace without changing the helper.
- Hub Vitest already includes `tests/dependencies/**/*.test.ts`. No discovery/config seam is missing from this plan.
- The specified 12-01 and 10-03 summaries were absent at review time. Their current work must freeze and supply receipts before execution; the plan already states that dependency gate.

## Primary upstream review

PR1168 was still open when inspected. Its pinned commit is `c3c82a682b8f1fbfad8529a5def0ef14a5f75483`; the one-file change substitutes a conditional socket write returning false when no socket exists, then retains chunk/timer cleanup. That guards the dereference. It does not itself add query rejection or repair pool ownership. Whether pending calls settle is therefore an actual-runtime test requirement, not established by this source change. [Pinned upstream change](https://github.com/porsager/postgres/pull/1168/commits/c3c82a682b8f1fbfad8529a5def0ef14a5f75483).

The earlier issue reports the matching null-socket symptom. Similar reports support investigation, not acceptance of a patch in this project's transaction path. [Upstream issue1066](https://github.com/porsager/postgres/issues/1066).

Registry latest-version information in the plan is a root-recorded 2026-09-09 observation; refresh it at candidate selection as the plan requires. This review independently checked the PR/source shape, not a new registry publication query. Prefer a fixed compatible release only after its exact installed artifact passes the same tests.

## Required interpretation during execution

These points make the plan's existing bounded-settlement/artifact requirements concrete; none authorizes extra source files or a driver migration.

1. A watchdog timeout must **fail** the test. The affected active query, rollback and any queued/reuse query must actually resolve/reject before the bound. A Promise.race timeout or forced child kill cannot count as handled query failure. The success case exits normally after closing pools/timers; retain a kill deadline only as failing cleanup protection.
2. Include a query queued/reused immediately after backend loss as well as the interrupted transaction. Require healthy subsequent connection reuse, no uncaught exception, no lost waiter and no automatic replay of an ambiguous write. Inspect committed rows through a surviving independent connection.
3. Preserve 10-03's draft/rollback/retry assertions while replacing its known-crash expectation with handled settlement. Do not delete the failing scenario, swallow process exceptions or count passed assertions alongside an unhandled error as green.
4. Identify the selected entrypoint/runtime in the decision receipt. The installed package exports ESM/Bun through `src/index.js`, CommonJS/default through `cjs/src/index.js` and workerd through `cf/src/index.js`. The proposed upstream diff touches only `src/connection.js`. Patch/test every actually supported package entrypoint or explicitly qualify exclusions; do not claim package-wide coverage from one import path. This remains one tracked Bun patch artifact, not authorization to run upstream build scripts blindly.
5. Run clean-install/build checks in the stated environment-free disposable copy with the existing 12-01 internal archive identities preserved. Record Bun version, lock/patch/archive identity, applied patch contents and the selected deployment bundle's entrypoint. No silent node_modules edit or floating branch is an acceptable deliverable.
6. Native PostgreSQL17.10 on loopback is an identified fixture; it is not the exact deployed PostgreSQL/Supabase runtime. Keep release/runtime qualification separate. Scope termination to the child backend from the marked schema, never an arbitrary application pool.

## Standards and specification

**Standards:** Exact six-file scope, manifest/lock ownership sequencing, no broad driver replacement, tracked patch/removal trigger and preserved source/dependency identity are appropriate. Root retains canonical status, proposals and release authority. An official-version alternative requires the explicit file/version amendment already stated in the plan.

**Spec:** All three must-haves address the observed defect: caller settlement, reproducible artifact plus domain transaction correctness, and explicit rejection of a guard that merely hangs. The two tasks separate reproduction/selection from application/requalification. If no bounded candidate passes, the admitted outcome is a documented rejection plus separately reviewed adapter/driver plan; it is not permission to silently weaken the must-haves.

No admission blocker remains in this plan. Execution readiness and fix acceptance remain false until the recorded gates have evidence. JOB-02, DEP-01 and CAP-02 are not closed by plan admission.

Root admission update: the reviewed source scope and tasks are unchanged. Only draft status/output wording changed to admitted with execution gates; the final plan hash above identifies that administrative update.

Root mechanical test-lane amendment: renamed the same planned native fixture to postgres-close-recovery.sql.integration.test.ts, so default unit exclusion applies.10-08 independently reviews lane admission; no behavior or extra source file is added. Revised plan SHA-256: `968336cd81e35af710812a966ddae88a8e2ef9938e483755c5c5d59a31828a78`. Earlier hashes identify the preceding administrative candidate.
