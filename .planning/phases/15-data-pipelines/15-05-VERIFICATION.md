---
phase: 15-data-pipelines
plan: "05"
status: complete-private-candidate
snapshot: /home/nikolas/.cache/claude-tmp/15-05-6/minion
verified_at: 2026-09-11
---

# 15-05 goal-backward verification

Evidence root: `/home/nikolas/.cache/claude-tmp/15-05-6/checks/`. All runs
used `env -i PATH HOME TMPDIR LANG [BRAIN_VECTOR_QC_*]`, one worker, no `.env`,
no network beyond the offline pnpm install. Native evidence is from a
disposable PostgreSQL 17.10 on 127.0.0.1:55491 started and stopped by the
executor (data directory deleted afterwards).

## must_haves.truths

### 1. "A reclaimed claim of the same desired revision cannot be renewed, ACKed, retried or dead-lettered by its former claimant."

- Mechanism: `sql/002_brain_vector_claim_fencing.sql` `brain_vector_claim_is_live_v2`
  requires org, revision, `status='running'`, lease owner, positive matching
  `claim_generation` and `lease_until > clock_timestamp()` after `FOR UPDATE`;
  every claim draws `nextval('brain_vector_claim_generation_seq')`.
- Native evidence (`fixture-run3.log`, 18/18): "denies every settlement by a
  former claimant after reclaim at the same revision" (A claim -> expire -> B
  reclaim at revision 1 with larger claim generation -> A heartbeat/ACK/retry/
  dead-letter all `false`, B row identical before/after; B heartbeat true, B
  ACK true with receipt), "denies settlement after expiry even without a
  takeover", "denies any tuple mismatch and accepts the exact live tuple",
  "never reuses a claim generation after ACK and re-enqueue at the same
  revision", "lets exactly one of two simultaneous claimers win a single row"
  (two live backend PIDs asserted).
- Unit evidence (`vitest-final.log`, 31/31): parser rejects rows without an
  exact positive `claim_generation`/`lease_owner`/`lease_until`; store passes
  the complete tuple to `*_v2` only.
- Not proven: behavior against the real pgvector `knowledge_chunks` schema
  (gap 1 in SUMMARY); remote Qdrant effects of a stale claimant (out of scope).

### 2. "One heartbeat operation covers all unsettled claimed rows; abort or ownership loss prevents new external dispatch."

- Mechanism: `worker.ts` `ClaimLease` (single `#renewal` promise, timer at
  lease/3, `checkpoint()` before materialization, Qdrant write and delete
  boundaries, `stopped` on abort or heartbeat exception); `processBatch(signal?)`
  admits no claim after abort and abandons a claim that raced the abort;
  `run` breaks before reconcile after abort. SQL `heartbeat_brain_vector_jobs_v2`
  renews <=500 descriptors in chunk order and never renews an expired lease.
- Unit evidence (`vitest-final.log`): "keeps one renewal in flight at a time
  while awaiting remote work" (fake timers: two ticks during an in-flight
  renewal produce no second call; timer renewal while the upsert is awaited;
  zero timers after the batch), "does not dispatch or settle a claim the
  heartbeat reports as lost", "stops before the Qdrant boundary when
  ownership is lost during materialization", "admits no claim after abort and
  starts no remote work for a claim that raced the abort", "observes the
  in-flight call after abort, settles it, and suppresses later groups", "stops
  new dispatch for the batch when a heartbeat throws", "does not start a
  reconcile page after the run signal aborts", "does not retry finalized peers
  or nest retries when an ACK throws", "logs a thrown retry transition once".
- Native evidence: "renews a batch per claim, in deterministic order, and
  rejects malformed descriptors" (one true/one false outcome per descriptor;
  22023 for length mismatch, duplicates, empty, 501, overlong owner).
- Not proven: cancellation of an already-sent embedding/Qdrant request
  (transport child); heartbeat behavior under connection loss (no fault
  injection by plan boundary).

### 3. "Forward002 and exact v2 runner verification preserve applied001; legacy mutation cannot bypass the new worker-role contract."

- Mechanism: 001 byte-identical (`unchanged.txt` 45a4e114…29aefc6). 002 is
  forward-only, refuses replay (`brain_vector_migrations` exists) and
  unattributed execution (missing `brain_vector.migration_sha256`), revokes
  EXECUTE on the four legacy mutators from the worker and application roles.
  Runner v1 refuses when any v2 object exists; runner v2 pins basename and
  SHA-256 `949bd83a019fe8d7fb9f10fbdbe4939e2963b8bf4730b8283e42db51dadce48e`,
  preflights prerequisites/partial catalog/receipt hash, serializes with an
  advisory lock, verifies the exact v2 ACL set, no PUBLIC execute, no table,
  sequence or ledger grants, and no legacy grants.
- Native evidence (`fixture-run3.log`): "applies unchanged 001 through the
  legacy path, twice", "refuses an unreviewed or misnamed 002 artifact before
  any mutation", "refuses direct 002 execution without the runner's hash
  setting", "applies 002 once, records the receipt with the DDL and revokes
  legacy mutators", "treats an exact repeat as a read-only no-op", "refuses a
  conflicting receipt hash and legacy 001 replay on a v2 catalog",
  "serializes concurrent runners", "rolls back a failing 002 transaction
  without leaving any catalog trace", "keeps the worker and application roles
  off the legacy mutators, tables, ledger and sequence" (42501 for legacy
  ack/claim/retry/dead-letter, outbox table, ledger, sequence, predicate),
  "refuses to run over a receipt whose catalog is incomplete".
- Not proven: the deployed CLI applying 002 (still hardcodes 001), container
  artifact inclusion, production catalog history (no applied-001 hash exists
  and none was fabricated).

## must_haves.artifacts

| Artifact | Present | SHA-256 |
|---|---|---|
| `sql/002_brain_vector_claim_fencing.sql` | yes | 949bd83a019fe8d7fb9f10fbdbe4939e2963b8bf4730b8283e42db51dadce48e |
| `test/claim-fencing.postgres.fixture.ts` (outside default glob; explicit opt-in + marker + loopback guards) | yes | 30d905ea000d452ece50c9a1f6cdc610f46c37f72b987c34c005321f7986acb7 |

## must_haves.key_links

- outbox.ts -> 002: `grep -n "_v2" src/outbox.ts` shows only v2 routine
  calls with the full tuple; no legacy routine name remains in the store.
- worker.ts -> outbox.ts: `ClaimLease` uses `store.heartbeat`, and
  `#applyBatch`/`#failJobs` gate every `ack/retry/deadLetter` on
  `lease.owned(job)` with one settlement per job.
- database-migration.ts -> 002: explicit `version: 2`, pinned artifact hash,
  `set_config('brain_vector.migration_sha256', …)` consumed by 002's receipt
  insert, `verifyWorkerContract(EXPECTED_WORKER_ROUTINES_V2)` +
  `verifyV2Objects`.

## Gates (exact)

| Gate | Exit | Counts |
|---|---|---|
| vitest `test/outbox.test.ts test/worker.test.ts --maxWorkers=1` | 0 | 2 files, 31 passed, 0 failed |
| tsc `-p tsconfig.json --noEmit` | 0 | no diagnostics |
| vitest adjacent unit files (worker-status, canary, backfill, server, config) | 0 | 5 files, 21 passed |
| native fixture via private lane (run 3) | 0 | 1 file, 18 passed, 0 failed |
| native fixture repeat (run 4) | 0 | 18 passed |
| cluster cleanup check (psql) | 0 | 0 `brain_vector_qc%` databases, 0 migration roles |

## Requirement closure

DATA-02, JOB-02: **not closed**. Timers/mocks close nothing; authored SQL and
disposable-engine evidence establish the fence and forward compatibility only
within the synthetic-corpus catalog described in the SUMMARY gaps. CLI/
container adoption, paid receipts, transport abort and Qdrant ordering remain
open release gates.
