---
phase: 10-durable-jobs-stock
plan: "04"
status: scoped_pass_broader_gates_pending
reviewer: jobs_fencing_execute_independent
reviewed: 2026-09-09
plan_sha256: bc5202a0371ee1722d953206e6f1d2bee72fa71336ffe2212bc1ae32894567dd
requirements_completed: []
---

# Independent finance statement verification

The frozen 10-04 implementation passes its admitted finance ownership/recovery scope. Independent reruns passed **47 unit/parser tests and 19 native PostgreSQL tests**, with zero skips and no unhandled errors. This does not close JOB-01/JOB-02, the full jobs/stock phase, driver fault recovery, UI recovery or deployment readiness.

## Execution and identity

Both suites ran sequentially from `minion_hub` with `/usr/bin/node`, an allowlisted environment containing only PATH, LANG, NODE_ENV, CI and NO_COLOR, plus explicit disposable opt-in/URL for the native suite. No application environment file was loaded. Native target was the root-owned marked PostgreSQL 17.10 database at loopback port 55439, owner `minion_qc`, database `minion_qc_jobs_stock`. The shared helper validates URL shape and actual server/database identity before fixture DDL. The fixture asserts distinct live backend PIDs and the common database marker.

| Independent command | Result | Runner / wall duration |
|---|---|---|
| `node node_modules/vitest/vitest.mjs run src/server/services/finance-statements.service.test.ts src/server/services/finance-statement-parser.test.ts --maxWorkers=1` | 47 passed, two files, exit 0 | 1.80 / 7.183 seconds |
| `MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55439/minion_qc_jobs_stock node node_modules/vitest/vitest.mjs run --config /tmp/minion-360-10-04/vitest.config.ts` | 19 passed, one file, exit 0 | 3.55 / 5.530 seconds |

No connection, backend or process fault injection ran. The CAS failure is an ordinary transactional trigger returning no updated row; the lost-handler-response case throws after the real handler commits. Neither is described as backend-loss qualification. The fixture drops its random owned schema and closes its helper connections; no broad cleanup was performed.

The temporary Vitest config admits only the finance native filename, requires explicit fixture input, keeps standard exclusions and fails empty selection. It is not canonical release-lane admission. Config hash: `461521f0007a3359356990ebd258d0a0c8b6111884191ba1b55bfedab6804110`.

Logs:

- `/tmp/minion-10-04-independent-unit.log`, SHA-256 `78af6e9965924bae06088cc49768b8abd5c29943a103faf459b85a85304773c0`.
- `/tmp/minion-10-04-independent-native.log`, SHA-256 `0984775a5400846b5227e357184bbd30ad0a2d037cf155ca607bc84bc63c3d51`.

All four source hashes match the executor's frozen map:

| Hub-relative file | SHA-256 |
|---|---|
| `src/server/services/finance-statements.service.ts` | `70ce7429db025a7b2fc534bd072b5dacb939461416b6155368395cae2c737eaf` |
| `src/server/services/finance-statements.service.test.ts` | `d305f5b5545105ee067bb6a12a6966587904f8252def9039649c1071eecce688` |
| `src/server/services/finance-statements.effect-ownership.sql.integration.test.ts` | `fa87e9be2a1590b574b3ffb757ac66508640bdc7827ba708a02406415a1b831e` |
| `src/routes/api/finances/statement-imports/[id]/retry/+server.ts` | `4283d5c6c8703b00c05d10077751665386ccc03206142bfdf1e43f1d746400ea` |

Scoped Prettier and `git diff --check` passed. Parser source/tests have no diff. Retry endpoint's diff is comment-only; authentication, finances-module access and personal-organization guard remain present. No source, config, plan or dependency file was edited by this review.

## Spec findings

| Required behavior | Independent finding |
|---|---|
| Current owner and revision | `persistImportChunk` rejects cancelled, wrong-tenant/ref/type and unversioned/mismatched jobs before file access. Both initial domain read and commit/failure writes use the shared owned request transaction. Native cancellation, takeover, undo, retry and late-failure cases pass. |
| Immutable source | The request identity includes content SHA and parser version. The locked domain row is rechecked, fetched bytes are hashed before parsing/commit, and corrupted content fails through the owned boundary. Storage recovery establishes a fresh request. |
| Rows, counters and progress | Inserts use returned row count, source-row uniqueness and unchanged parser/money mapping. The checked cursor CAS and durable job cursor update share the foundation transaction. A zero-row update rolls back inserted rows, counters and progress. |
| Duplicate/restart safety | Two jobs for one revision produce one accepted row set/count outcome. The partial-duplicate fixture counts only new inserts. After a committed chunk plus lost handler response, a duplicate job reads done state without refetching or reinserting. This is a duplicate/restart simulation, not a killed-process recovery test. |
| No external work under locks | Native `pg_stat_activity` inspection shows both fixture connections idle with no open transaction while file fetches are blocked. Fetch receives the ownership signal; cancellation gates parsing and persistence. An uncooperative already-dispatched file operation is not claimed retractable or bounded. |
| Explicit legacy recovery | Unversioned queued/parsing jobs fail before fetch. Explicit retry establishes a new revision while preserving existing rows, counts and nextChunk. The native partial-progress cases resume correctly, including a 501-row import after the first 500-row chunk. No latest-head rebinding occurs. |
| Retry completion race | Retry locks the head/domain and rechecks status. If completion occurs after its preliminary read, the replacement transaction aborts: done state, head revision and job count remain unchanged. Concurrent retries serialize; only the last revision advances. |
| Undo | Head invalidation, transaction deletion and counters reset share one transaction. A queued first chunk cannot resurrect data after undo/identical retry. Parsing undo remains HTTP 409. |
| Tenant isolation | Actual RLS denies cross-org reads, writes and foreign parent references. Role and organization/profile settings restore afterward. No broader job-table grant is introduced. |

The shared foundation's transaction code was inspected at the finance integration boundary: owned job validation encloses request-head/domain work and durable progress; request creation mutates the head/domain then enqueues in the same transaction after tenant-role restoration. This review does not replace the separate foundation verification.

The former service-test behavior map in 10-04-SUMMARY is consistent with the current source and native tests. Changed semantics are explicit: queued/parsing retries are now recovery operations; the old silent CAS no-op is replaced by rollback. Deterministic parser wrappers were replaced by unchanged parser tests plus actual native persistence assertions. Test-count changes alone are not used as equivalence evidence.

## Standards and retained limits

Standards pass for this slice: scoped edits, actual native constraints/RLS, no file fetch under the owned transaction, preserved parser/chunk-size/accounting policy, explicit legacy authority and no paid-result ledger added. The 500-row chunk size, 200-row best-effort rejection sample, currency/money strings and rejection definitions remain unchanged.

Job terminal status is still a separate bg-runtime transaction. SQL rollback or an unversioned job rejection can leave a failed job beside queued/parsing import state. A committed import can be done while the job is failed after a lost response. These outcomes are visible in the native tests; this slice does not claim atomic convergence of every job/domain terminal status. The authenticated retry API supplies explicit recovery, but no statement recovery UI was implemented or verified.

Source TODOs preserve the blob-orphan and job-recovery/status gaps. The root-owned QC proposal contains the blob reconciliation section. At review time, it did not yet explicitly describe queued/parsing import state after failed/unversioned jobs or the missing recovery UI, despite the exact source TODO and summary doing so. That precise proposal addition was requested from root; this is an outstanding documentation handoff, not an invitation to alter the source scope.

Broader gates remain pending: root's current-source aggregate Hub check after brain freezes; canonical native-lane admission; driver/backend-loss qualification; production migration/grants and old-worker drain; successful full packaging; HTTP/browser and recovery-UI acceptance. The earlier foundation check cannot certify this later candidate. No production or deployment result is implied by this scoped pass.

## Root handoff reconciliation

Root added the requested JOB-02 finance terminal state and recovery UI paragraph to proposals/2026-09-08-platform-qc-remediation.md after this independent review. It records queued/parsing imports beside failed or rejected jobs, done imports beside failed jobs, explicit retry semantics and the missing recovery UI. This closes the documentation handoff only; the behavior and UX gaps remain open. No source changed.
