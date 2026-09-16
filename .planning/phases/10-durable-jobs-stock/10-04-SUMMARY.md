---
phase: 10-durable-jobs-stock
plan: "04"
status: candidate_frozen_pending_independent_checks
requirements_completed: []
completed: 2026-09-09
key-files:
  modified:
    - minion_hub/src/server/services/finance-statements.service.ts
    - minion_hub/src/server/services/finance-statements.service.test.ts
    - minion_hub/src/routes/api/finances/statement-imports/[id]/retry/+server.ts
  created:
    - minion_hub/src/server/services/finance-statements.effect-ownership.sql.integration.test.ts
---

# Finance statement ownership candidate

Statement ingestion now persists chunks, counters and durable job progress under the current job lease and import request revision. Explicit retry replaces queued/parsing/failed/undone requests while preserving committed rows and progress; undo invalidates the previous revision with its deletions. File retrieval, content hashing and deterministic parsing occur outside database transactions. This is the bounded finance adoption candidate, not whole-phase or global JOB-01/JOB-02 closure.

## Admission and boundaries

Initial admitted plan SHA-256: `f7bff696e9f7f72cf208ca38e830e32ddaa32605b42f936d6e80bf9ef6358ffd`. Root explicitly amended the legacy recovery decision and granted the retry endpoint comment-only ownership. Final admitted PLAN SHA-256: `bc5202a0371ee1722d953206e6f1d2bee72fa71336ffe2212bc1ae32894567dd`.

Root independently qualified the frozen 10-07 foundation (24 unit and 14 native cases; full preceding Hub check zero errors/warnings) before this adoption. Foundation, migration, configuration, parser, accounting and stock files were not edited. Current Hub branch is `feat/level-2026-07-30`, HEAD `a25528b603dfe25f7ea9c0900d271060e5394f35`; concurrent dirty work was preserved. No commit, branch/worktree/stash operation, package change, production access, paid call, deployment or backend termination occurred.

The original plan mentioned bounded legacy binding. Root's admitted decision conservatively rejects **all unversioned statement jobs** before domain/file access with `JobEffectError('conflict', 'Unversioned statement job: explicitly retry this import to establish ownership')`. Stored nextChunk cannot prove which reset admitted old work. No call to bindLegacyJobRequest or inferred revision attachment is made. The existing explicit retry endpoint supplies recovery for queued/parsing legacy imports. Its authentication, module and personal-org checks are unchanged; only its outdated comment changed. Endpoint authority was inspected statically; this slice does not claim HTTP/browser UAT or a recovery UI control.

## Implemented behavior

- New import insertion, request head and job enqueue share one transaction. Head family is `finance.statement`; identity binds import ID plus the content SHA/parser-version hash. A kick follows only the committed request.
- Serial content dedup reuses the existing file; concurrent insertion losers return the winning import. The native race found that Drizzle wraps PostgreSQL23505 in Error.cause; the service now recognizes that specific content-unique constraint without swallowing unrelated SQL errors. Concurrent uploads remain a documented reconciliation gap.
- Worker entry snapshots context/job metadata, validates tenant/ref/type and revision, and rejects cancelled ownership before any domain read. The owned transaction locks job → head → import and preserves tenant RLS.
- Fetch receives the execution signal; bytes are checked against the stored SHA before parsing. Cancellation is checked before parsing and commit. A remote fetch already dispatched cannot be undone; no bounded settlement of an uncooperative file implementation is claimed.
- Persistence re-reads the locked domain state, parser/content identity and expected nextChunk. A duplicate that observes later canonical progress does not repeat inserts/counts. Actual INSERT returning rows determine insertedCount. A failed cursor CAS throws and rolls back the entire chunk. Job progress is committed with rows/counts and returned through jobRequestAdvanceResult.
- Failure persistence also requires the current revision and unchanged import progress. A stale failure cannot mark an undone/retried import failed.
- Explicit retry serializes on the head/domain row, preserves rows/counts/nextChunk, clears old parse-error fields and enqueues a fresh revision atomically. A row that completes after the preliminary read aborts the replacement transaction and remains done. Concurrent retries may supersede one another; only the last revision can advance.
- Undo keeps the existing parsing409 behavior. Its head invalidation, transaction deletion and counters reset share one transaction. Content re-submission of an undone import follows explicit retry.

## Tests and observed outcomes

Runtime: Node22.23.2, Bun1.3.4, Vitest4.1.10, postgres3.4.9. Native substrate: root-owned marked PostgreSQL17.10 at the explicit disposable loopback database on port55439. Each test run creates a random validated schema, executes the actual lease/head/finance migration text with only public-schema substitution, and drops its owned schema afterward. Two independent live backend IDs and the common database marker are asserted. The temporary config validates opt-in and URL before collection; the shared helper checks the actual database identity before DDL. No application .env loader is used.

Commands from `minion_hub/`:

```sh
node node_modules/vitest/vitest.mjs run src/server/services/finance-statements.service.test.ts src/server/services/finance-statement-parser.test.ts --maxWorkers=1
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55439/minion_qc_jobs_stock node node_modules/vitest/vitest.mjs run --config /tmp/minion-360-10-04/vitest.config.ts
```

- Unit/parser: **47 passed**, two files (13 service boundaries and unchanged34 parser cases), exit0.
- Native: **19 passed**, one file, exit0; final run3.25seconds, no skips or unhandled errors. Real handler, bg-runtime, request service, RLS and authored finance constraints execute. Only file storage/network responses and database client selection are synthetic. Handler registration is observed while forwarding unchanged; the lost-response case invokes the actual handler and deliberately throws afterward.
- Native cases cover actual create/dedup races; duplicate jobs; no open transaction during two blocked fetches; owner takeover; cancellation; undo/retry ABA; late failed fetch; cursor-CAS rollback followed by explicit recovery; committed chunk plus lost handler response/restart; partially existing accepted rows; legacy queued/parsing rejection and recovery; a501-row import with committed500-row cursor; parsing undo409; cross-org read/write/FK denial and role restoration; concurrent retries and last revision authority; completion after retry pre-read; source corruption and storage recovery.
- The red unit case reproduced cancellation being ignored (old service resolved done=true and read the domain). The initial expanded native run reproduced the wrapped uniqueness exception, then passed after the narrow source fix. It also exposed a fixture polling deadlock caused by querying its own held single connection; the observer was moved to the free independent client. That failing run is not acceptance evidence.
- Scoped Prettier and `git diff --check` passed for all four owned source/test files. Native fixture execution can coexist with bounded dependency tracing; elapsed time is diagnostic, not a comparative performance claim.

Temporary config: `/tmp/minion-360-10-04/vitest.config.ts`, SHA-256 `461521f0007a3359356990ebd258d0a0c8b6111884191ba1b55bfedab6804110`. It imports the current base, replaces include with exactly the finance native filename, preserves configDefaults exclusions, sets maxWorkers1/passWithNoTestsfalse and validates the disposable URL/opt-in. It is a development execution lane, **not canonical release-lane admission**.

## Original service-test coverage disposition

The former14 service tests were reorganized into13 boundary tests plus19 native behavior tests. Counts alone are not equivalence; the mapping is explicit:

| Former behavior | Current evidence/disposition |
|---|---|
| Existing content avoids upload/insertion | Service dedupe + native normalized-content dedupe |
| CRLF text normalizes before dedup | Service creation identity + native same import for CRLF/LF |
| New import enqueues/kicks | Service committed-boundary kick + native actual creation/job |
| Undone content re-enqueues | Native undo/identical resubmission race |
| Accepted rows inserted/rejections skipped | Native parser-output/count/money assertions |
| Repeated parser produces deterministic slice | Unchanged34 parser tests and actual native duplicate/restart rows; redundant parser-equality wrapper removed |
| Already-done import returns without inserts | Native committed-response-loss duplicate restart, one total fetch |
| insertedCount counts returned rows | Native pre-existing accepted-row case |
| Conditional cursor update quietly no-ops | **Superseded:** locked state plus checked CAS; native zero-row trigger proves insert/counter/progress rollback and explicit retry recovery |
| Non-failed retry no-op | **Partially superseded by admission:** queued/parsing explicit retry now replaces revision; done remains unchanged, verified under native concurrent completion |
| Failed retry | Service boundary + native storage-failure recovery |
| Undone retry | Service boundary + native undo/re-submit |
| Undo deletes and leaves undone | Native undo with zero counters/transactions and no automatic enqueue |
| Parsing undo rejects409 | Service + native501-row partial-progress case |

## Standards/spec review and remaining gates

Standards: current job/head/domain lock order and RLS restoration are inherited from the frozen foundation; no external fetch holds these locks. Native tests preserve money strings, source-row uniqueness, same-org foreign key and app_ledger restrictions. No broad bg_jobs grant or paid-result receipt was added.

Spec: current owner/revision gates cover chunks, counters, failure state and progress; explicit reset/retry invalidates stale work even when nextChunk returns to zero. Content/parser identity is checked before domain writes. CHUNK_SIZE500, parser semantics, confidence/currency handling, rejection definition, content dedup policy and stock behavior remain unchanged.

Job terminal status remains a separate bg-runtime transaction. A generic SQL failure can leave a failed job alongside queued/parsing import state; the native rollback case proves explicit retry recovery without destructive reset. A commit followed by lost handler response can leave a done import and failed job; duplicate restart safely reads committed state. This slice does not claim atomic convergence of every job/domain status or automatic UI recovery.

Open ends recorded in source and proposal text sent to root:

1. `finance-statements.service.ts:160`: reconcile blobs after failed/concurrent creation; the losing request has already uploaded a file. Do not remove the winning file or change content dedup as an inferred cleanup.
2. `finance-statements.service.ts:440`: expose job failure and explicit recovery alongside import status. Legacy rejection and SQL rollback may leave queued/parsing state; authenticated retry works but no statement recovery UI was found or implemented.

Existing best-effort rejection sampling,200-sample cap, repeated parser work and unsupported/ambiguous-format policy remain as documented; they are not claimed fixed. Driver/backend-loss qualification remains unaccepted and no termination probe ran. Production migration/grant installation, old-worker drain, canonical test-lane admission, current-candidate full Hub check and successful packaging remain root-coordinated gates. The preceding10-07 aggregate check does not certify this later source. No global requirement or phase closure is recorded.

## Frozen source identity

| File (relative to minion_hub) | Before SHA-256 | Candidate SHA-256 |
|---|---|---|
| src/server/services/finance-statements.service.ts | 75b444bb44f25784148be2ed5043bc988e4afe7e874180013d1444e9ee781147 | 70ce7429db025a7b2fc534bd072b5dacb939461416b6155368395cae2c737eaf |
| src/server/services/finance-statements.service.test.ts | 1ed7b74045696abd13d1820235761e9b4e13f9f4cf2914eecf6a4ce942a6b37f | d305f5b5545105ee067bb6a12a6966587904f8252def9039649c1071eecce688 |
| src/server/services/finance-statements.effect-ownership.sql.integration.test.ts | new | fa87e9be2a1590b574b3ffb757ac66508640bdc7827ba708a02406415a1b831e |
| src/routes/api/finances/statement-imports/[id]/retry/+server.ts | 59d67cb0bdf1761f52e5a932bdff54dc0095ff321e7129692619e7057f08cff8 | 4283d5c6c8703b00c05d10077751665386ccc03206142bfdf1e43f1d746400ea |

Candidate files are frozen for root's independent source/native review and aggregate check. Ownership is released; further edits require reopening the exact scope.
