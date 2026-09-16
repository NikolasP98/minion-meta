---
phase: 15-data-pipelines
plan: "05"
status: complete-private-candidate
requirements-completed: []
snapshot: /home/nikolas/.cache/claude-tmp/15-05-6/minion
repo: minion (gateway), base origin/DEV 8499d8fddc4afdd22f6160e3f3e6e448b6befe73
owned_files:
  - path: minion/services/brain-vector/src/worker.ts
    before: c6f609ab1f225cfe39c8aae5b984353c29eb5631bf40bfaac01dce050d22a619
    after: 5698695dc0ce6eaa62ea45693da1be175abd14950d2af1edb1ddb792ddfa4f99
  - path: minion/services/brain-vector/src/outbox.ts
    before: b391d53f0045a996de9d59d5a70ebce4881570989b0e9d0839b0835f5630b0f5
    after: fb146eaac6c337351c8ebfd8cfeda1dbc9304cfcfebf6fea0d466165b3577474
  - path: minion/services/brain-vector/src/types.ts
    before: 7f2c19a323d63710dcf948a85130dde65f64de935a944308a7fed34ee6415df0
    after: d1496b6436a5288dd0b122bc16f96b44e399c3f2b13cfec29a9e539d056379d9
  - path: minion/services/brain-vector/src/database-migration.ts
    before: 3d5448d60dd82a9d68af6496836fa133893e926c910333ff8f02f2b6bf4b7c5b
    after: a097a041a2609140f1d9005946ca3c3742ed77f53b3773500a3b021b184a1750
  - path: minion/services/brain-vector/sql/002_brain_vector_claim_fencing.sql
    before: ABSENT
    after: 949bd83a019fe8d7fb9f10fbdbe4939e2963b8bf4730b8283e42db51dadce48e
  - path: minion/services/brain-vector/test/worker.test.ts
    before: ddfff0f88f8abb8ee4eb41aaf9c652222fea8f99b983aec6bc8f7729c4ec6e5e
    after: 42860884b7663c2c0c2697af1b15eae6a0a924da5945fef42914722763d51a00
  - path: minion/services/brain-vector/test/outbox.test.ts
    before: 5dba9d1a37e70836c3136128e6740a7a65b7e37ff90a534777eccc0e98185bf2
    after: bb13b4dd4af0773425f61e6b9ee0a3844f7bd1bd042c9bf87d3f4c979eceb7ba
  - path: minion/services/brain-vector/test/claim-fencing.postgres.fixture.ts
    before: ABSENT
    after: 30d905ea000d452ece50c9a1f6cdc610f46c37f72b987c34c005321f7986acb7
unchanged_evidence:
  - sql/001_brain_vector.sql 45a4e1143843d3685b8cfa8f6e73b653b0e9a98d1f0d470c429aecca629aefc6
  - src/cli.ts 421542e797b07f6079bdc35419a4260e08945527a62dcb460441fafefc94aa3e
  - src/embedding-client.ts dc68ad643771621571701501f35530ca5f6905e3109fd4cbd625f4a9b07953dc
  - src/qdrant.ts 06dffefc5f9bc9a5e5c022b58480d65245bb20808e4fd59f8598195ceb9f5546
---

# Vector worker claim fencing: source candidate + native evidence

Continuation of the earlier Task 1 pass (eight exact-site handoff comment
blocks, root-verified). Tasks 2 and 3 are now implemented and qualified in a
private snapshot. Nothing was committed, staged, pushed, merged, deployed or
applied to any non-disposable database.

## Repo and snapshot notes

- The dispatch note said "Repo: hub"; the plan's `files_modified` all live in
  `minion/services/brain-vector` (gateway repo). Snapshot is a detached
  worktree of gateway `origin/DEV` (8499d8fddc4). The "before" images above
  include Task 1's comments: those comments exist only as uncommitted edits in
  the main gateway checkout (`fix/ci-cost-remaining-gaps`), so the exact diff
  was saved to `/home/nikolas/.cache/claude-tmp/15-05-task1-comments.patch`
  and re-applied onto the snapshot before work began. `origin/DEV` hashes
  match every identity frozen in `15-VECTOR-WORKER-DECISION.md`.
- `depends_on` is empty; nothing was read from the hub PR #248 worktree. The
  Hub prerequisite migrations were exported read-only from `minion_hub`
  `origin/master` (1df0a9216ad) into `checks/hub-migrations/` with SHA-256s.
- `pnpm install --frozen-lockfile --ignore-scripts --offline` (exit 0). The
  snapshot also shows modified `extensions/*/ui/node_modules/.bin/*` shims;
  these are pnpm install artifacts of tracked shim files, not edits of mine.
  `pnpm rebuild better-sqlite3` / `pnpm baml:generate` were not needed for
  this package and were not run.

## Task 2: bounded claim and cooperative-stop candidate

- `types.ts`: `ClaimedVectorJob` gains required `claimGeneration: bigint`,
  `leaseOwner`, `leaseUntil`; `ReconcileChunk` explicitly omits them.
- `outbox.ts`: parsers reject absent/zero/negative/non-digit/precision-lossy
  `claim_generation` and `revision` (exact decimal text, no `Number`), missing
  or overlong `lease_owner`, invalid `lease_until`. Worker IDs are validated
  (1-200 chars, refuse instead of truncate). The production store calls only
  `claim/ack/retry/dead_letter_brain_vector_job(s)_v2` with the complete
  organization/chunk/generation/revision/owner/claim tuple, plus a new
  `heartbeat(jobs, leaseSeconds)` store method (<=500 descriptors, duplicates
  and mixed owners rejected client-side, deterministic chunk order). No legacy
  fallback.
- `sql/002_brain_vector_claim_fencing.sql` (new, forward-only, single
  transaction after Hub chain + 001): preflight (role, 001 routines,
  `storage_mode`, required `brain_vector.migration_sha256` session setting,
  no existing ledger), `pg_advisory_xact_lock(7413,2)`, ledger table
  `brain_vector_migrations` (RLS forced, no grants), global non-cycling
  sequence, `claim_generation bigint not null default 0` column, shared
  `brain_vector_claim_is_live_v2` predicate (org, revision, running, owner,
  claim generation > 0, `lease_until > clock_timestamp()` after `FOR UPDATE`),
  five v2 routines, EXECUTE revoked on the four legacy mutators from
  `brain_vector_worker`/`public`/`anon`/`authenticated`/`app_ledger` (bodies
  kept; 001 untouched), receipt row inserted in the same transaction. ACK v2
  reproduces 001's receipt and vector-release effects; retry v2 keeps the SQL
  attempt ceiling of 8.
- `database-migration.ts`: `applyDatabaseMigration({..., version?: 1|2})`
  returns `{version, applied, sha256}`. Session advisory lock serializes
  attempts. v1 (default, what the unchanged CLI still calls) refuses to run
  when any v2 object/ledger exists. v2 accepts only basename
  `002_brain_vector_claim_fencing.sql` with pinned SHA-256
  `949bd83a01…ce48e`, verifies 001 prerequisites, refuses partial catalogs and
  receipt-hash conflicts before mutation, passes the hash via `set_config`
  (no SQL stripping, no nested transaction), and verifies the exact v2 ACL
  set (compared as sorted sets), role attributes, no table privileges, no
  PUBLIC execute, no sequence/ledger grants, no legacy mutator grants.
- `worker.ts`: module-private `ClaimLease` keeps one non-overlapping
  heartbeat over all unsettled claims (timer at lease/3, min 1s) and a
  `checkpoint()` before every external boundary (materialization, Qdrant
  provision/upsert, delete) that observes the in-flight renewal or renews now
  and filters to still-owned jobs. Lost claims are logged and never dispatched
  or settled; a thrown heartbeat stops new dispatch for the batch. `run` passes
  its signal into `processBatch(signal?)`: no claim after abort, a claim that
  raced the abort starts no remote work, an in-flight call is observed and its
  ACK/retry still happens under live ownership, later organization groups are
  skipped and left to expire (`brain_vector_batch_stopped`), and no reconcile
  page starts after abort. Settlement is one attempt per job: an ACK exception
  or a thrown retry is logged and never retries peers or nests; timers are
  cleared in `finally`. Normalization, batching, retry caps and reconcile
  behavior are unchanged. TODO(handoff) comments were narrowed (outbox claim
  and ack sites resolved; worker `run`/`#applyBatch` narrowed; materialize,
  retry-uncertainty and reconcile sites retained; runner comment now names the
  CLI adoption gap).

Gate (from `services/brain-vector`, `env -i PATH HOME TMPDIR LANG`):

| Command | Result | Log |
|---|---|---|
| `node node_modules/vitest/vitest.mjs run --config vitest.config.ts test/outbox.test.ts test/worker.test.ts --maxWorkers=1` | 2 files, **31 passed / 0 failed**, exit 0 (baseline before edits: 18 passed) | `checks/vitest-final.log`, `checks/baseline-vitest.log` |
| `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` | clean, exit 0 | `checks/tsc-final.log` |
| Adjacent unit files `worker-status, canary, backfill, server, config` | 5 files, 21 passed, exit 0 | `checks/vitest-adjacent.log` |

New red cases (worker): lost claim not dispatched/settled; ownership loss
during materialization stops before Qdrant; abort before claim admits none,
abort racing a claim starts no remote work; in-flight call observed after
abort and later group suppressed; thrown heartbeat stops dispatch; one
renewal in flight at a time under fake timers with timers cleared; ACK throw
does not retry peers; thrown retry logged once; no reconcile after abort.
The pre-existing "superseded revision" case now asserts that ownership is
rechecked before the write (no Qdrant call, no ACK) instead of writing and
then observing ACK=false. Outbox: exact bigint parsing incl. 2^53+1, 15
malformed-field rejections, reconcile rows unaffected, worker-ID bounds,
heartbeat descriptor validation before any RPC.

## Task 3: native forward migration and ownership qualification

Target: no Docker (daemon inactive, socket root:docker) and no system
PostgreSQL. A disposable cluster was started by this executor from the
already-present `@embedded-postgres/linux-x64` 17.10.0-beta.17 binaries
(copied from `/tmp/minion-360-2026-09-09/native-postgres/package`, no
download): `initdb -U brain_vector_qc -A trust`, `pg_ctl start -o "-h
127.0.0.1 -p 55491 -k <snapshot>/pg -c cluster_name=minion-360-disposable:brain-vector
-c max_connections=30"`, then `pg_ctl stop` and the data directory deleted.
Server log: `checks/pg-server.log`.

Fixture `test/claim-fencing.postgres.fixture.ts` (outside the default
`test/**/*.test.ts` glob) ran via the private lane config
`checks/claim-fencing.vitest.config.ts` (SHA-256
`aeb13c67bdb4a2072d1c4b3d0c8ca7e4e78419c22f83f23b64c022cd7dde8207`, one worker,
exactly that file) with `env -i PATH HOME TMPDIR LANG
BRAIN_VECTOR_QC_DISPOSABLE=1
BRAIN_VECTOR_QC_ADMIN_URL=postgres://brain_vector_qc@127.0.0.1:55491/postgres
BRAIN_VECTOR_QC_HUB_MIGRATIONS_DIR=checks/hub-migrations`. Before any write it
asserts `cluster_name`, `inet_server_addr()=127.0.0.1`, superuser, zero
foreign databases, none of the four migration roles present, the five Hub
files' pinned hashes, and that on-disk 002 matches the runner's pin. It
creates per-run databases `brain_vector_qc_<rand>[_serial|_rollback]`, applies
a synthetic `knowledge_chunks` (see gap 1), the five actual Hub migrations
verbatim, `alter role brain_vector_worker login`, then 001 through the runner.

| Run | Result | Log |
|---|---|---|
| run 2 (17 tests, before the serialization case) | 17 passed, exit 0 | `checks/fixture-run2.log` |
| run 3 | **18 passed / 0 failed**, exit 0 | `checks/fixture-run3.log` |
| run 4 (repeat) | 18 passed, exit 0 | `checks/fixture-run4.log` |

Covered: 001 twice via v1 path; tampered/misnamed artifact refused with
catalog untouched; direct 002 execution without the hash setting raises
P0001; 002 applied once with receipt, column, sequence, v2 routines and
legacy grants revoked; exact repeat is a no-op (`applied_at` and sequence
unchanged); receipt-hash conflict and 001-after-v2 refused; two concurrent
runners serialize (one `applied:true`, one `false`, one receipt); failing 002
variant rolls back with no ledger/column/sequence/routine trace and legacy
grants intact; two stores on distinct live backend PIDs; claim A, expire,
heartbeat A false (no revival), reclaim B at unchanged revision with larger
claim generation, A heartbeat/ACK/retry/dead-letter all false with B's row
byte-identical, B heartbeat extends lease, B ACK deletes and writes the
knowledge_chunks receipt; expiry without takeover denies settlement; each
tuple field mismatch denied, exact tuple accepted; ACK then re-enqueue at
revision 1 gets claim_generation 0 then a strictly larger new claim and the
old tuple is denied; exactly one of two simultaneous claimers wins;
per-claim heartbeat outcomes in chunk order plus mismatched lengths,
duplicates, empty, 501 descriptors and overlong owner/worker IDs raise 22023;
retry ceiling 8 -> dead, retry clears lease, dead-letter; worker role gets
42501 on legacy mutators, outbox table, ledger, sequence and the predicate;
app_ledger/anon/authenticated have no v2 or legacy execute; partial catalog
(dropped routine, missing receipt, dropped ledger) refused. Cleanup asserts
zero `brain_vector_qc_%` databases and zero migration roles remain; confirmed
again from psql after the runs.

## Gaps and blockers (not closed by this candidate)

1. **pgvector absent on the disposable engine.** `knowledge_chunks` is a
   synthetic table with `embedding text` instead of `vector(1536)`, so the
   Hub corpus migration (`20260721210000_unified_brain_corpus.sql`) was not
   applied; the five outbox/ack migrations and 001 were. Compatibility with
   the real corpus schema (and with production catalog state) is not proven.
   Unblock: a disposable engine with pgvector (e.g. `pgvector/pgvector:pg17`
   once Docker is available to the executor).
2. **CLI still hardcodes 001** (`src/cli.ts` untouched, outside scope): the
   deployed `migrate` command cannot apply 002; README/container inclusion
   unverified. Separate adoption child per the decision packet.
3. **Legacy docker fixtures are now incompatible with the v2 store:**
   `test/per-org-cutover.e2e.test.ts` and `test/migration.postgres.test.ts`
   (not run, not owned) build a v1 synthetic base; the worker now requires the
   v2 routines and the migration test's second 001 apply would not exercise
   v2. They need the adoption child (and Docker) before they can pass.
4. **Transport cancellation:** embedding/Qdrant clients still ignore caller
   signals; abort only prevents new dispatch. Handoff retained in `run`.
5. **Paid-effect receipts, Qdrant ordering, reconcile ownership:** untouched;
   handoffs retained at materialize, retry and reconcile sites. An ACK that
   throws after a successful remote write leaves the claim to expire and the
   work is redone (documented at `#applyBatch`).
6. **Worker ID length is validated at claim time, not at config load**
   (`config.ts` outside scope): an overlong `BRAIN_VECTOR_WORKER_ID` now makes
   every batch fail loudly instead of being silently truncated.
7. **Old/new workers are not rolling-compatible** (by design); quiesce/drain,
   migration invocation and restart order need separate root admission.
8. **Per-boundary heartbeat cost:** each organization group issues 2-3
   bounded heartbeat RPCs per batch in addition to the timer; acceptable for
   current batch sizes, not load-tested.

DATA-02 and JOB-02 remain open; this is a private candidate for root
Standards/Spec review, not activation evidence.

## Evidence index (`/home/nikolas/.cache/claude-tmp/15-05-6/checks/`)

`before.txt`, `after.txt`, `unchanged.txt`, `freeze.json`, `install.log`,
`baseline-vitest.log`, `baseline-tsc.log`, `vitest-final.log`,
`tsc-final.log`, `vitest-adjacent.log`, `fixture-run{1..4}.log`,
`pg-initdb.log`, `pg-start.log`, `pg-server.log`, `pg-stop.log`,
`hub-migrations/` (+`SHA256SUMS`), `claim-fencing.vitest.config.ts`,
`pin-002.sh`, `candidate.diff`, `new-files/`.
