---
id: 2026-08-18-factory-durable-state-outbox-spec
title: Durable state — transactional outbox for postFinish side effects, guarded lifecycle edges, append-only event log
stage: spec
status: draft
pass: 2
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-factory-durable-state-outbox
verdict: changes_requested
repos: [minion-factory]
tags: [logic, infra]
type: infra
link_review: "pass 2 but has neither \"revises\" nor \"supersedes\" — no predecessor could be determined automatically; add revises: <pass-1 spec id> if a separate predecessor spec exists, or supersedes if this replaces a different spec"
---

# Durable state machine + outbox for run side effects

**Owner surface:** `minion-factory` (`NikolasP98/minion-factory`, private, default branch `main`) —
`runner/src/db.ts`, `runner/src/github.ts`, `runner/src/queue.ts`, `runner/src/lifecycle.ts`,
`runner/src/index.ts`, new `runner/src/events.ts` (+ `runner/src/events.test.ts`), new
`runner/src/queue.test.ts` /
`runner/src/lifecycle.test.ts` additions, `README.md` (short operator note). No other repo has a file
in this spec — this is entirely internal runner-process durability, no new env var, no deploy.sh/
setup.sh/docker-compose change, no exposed route surface change.

**Live baseline reviewed:** `minion-factory/main` commit `6ee39279b698262c3ec39d41b5416ba4b9e24534`
(2026-08-18T03:37:16Z), read via `gh api repos/NikolasP98/minion-factory/contents/...` (this repo is
meta-gitignored and not checked out locally). Re-read every touched file before implementation — this
is a drift gate, not permission to implement the stale excerpts quoted below if concurrent factory
specs have already landed changes to the same lines.

## Design ancestors and collisions

- [`2026-08-12-minion-factory-agent-pipeline-spec`](2026-08-12-minion-factory-agent-pipeline-spec.md)
  established the runner/agent-container/SQLite architecture (`better-sqlite3`, WAL mode, synchronous
  in-process statements) this spec extends. No new execution model — `outbox_jobs` and
  `lifecycle_events` are two more tables in the same `factory.db`, written with the same synchronous
  calls already used throughout `queue.ts`.
- [`2026-08-18-factory-orchestration-tests-spec`](2026-08-18-factory-orchestration-tests-spec.md)
  (approved, not yet built at this baseline — `runner/package.json` has no `test` script and no
  `.test.ts` file exists yet, verified by tree listing) establishes `npm test` =
  `node --import tsx --test src/*.test.ts`. This spec's new `*.test.ts` files use that exact
  invocation so they are auto-discovered by the glob whether or not that sibling has landed first
  (Slice 0 checks which is true; if `npm test` already exists, use it, otherwise run the equivalent
  `node --import tsx --test` command directly — both resolve to the same files).
- [`2026-08-18-factory-workitem-handoff-schema-spec`](2026-08-18-factory-workitem-handoff-schema-spec.md)
  (approved, not yet built) touches three of this spec's files with **disjoint logic in each**:
  - Its Slice 3 changes `queueDevForSpec()`'s repo-resolution (`REPO_ALIASES` `.find(Boolean)` →
    fail-loud multi-repo routing). This spec adds a strict, discriminated-result path for outbox use;
    it must share the sibling's routing implementation rather than restore `.find(Boolean)` or copy
    a second resolver. Preserve the existing fail-soft wrapper for sweep/route callers.
  - Its Slice 5 ("WorkItem-aware factory consumers") edits `promoteSweep()`/`specSweep()` in
    `lifecycle.ts` — the risk-tag gating that decides *which* proposals/specs may auto-approve. This
    spec's Slice 4 edits `transition()` — the function those sweeps *call* — adding a source-status
    check after the existing request/target validation but before the PUT. It does not touch the
    sweeps' calling code or tag logic. Whether their `draft`/`review → approved` calls remain legal
    is part of the human edge-table decision in §8; do not assume it before approval.
  - Its Slice 6 replaces `/hooks/monitor`'s GitHub-issue creation with a typed-proposal upsert. This
    spec's `auto_fix` and `outbox-dead` handlers (§3) call that route over HTTP with the same
    `{source,title,fingerprint,url,detail}` body the route already documents — a contract, not an
    implementation dependency. Whatever Slice 6 does internally, the call succeeds unchanged.
- [`2026-08-18-factory-deterministic-unstick-spec`](2026-08-18-factory-deterministic-unstick-spec.md)
  (approved, not yet built) edits the `runner/src/index.ts` auth middleware (a block above where
  this spec's boot-sequence edit lands, near `adoptOrphans()`/`startAutoMergeSweep()`). Disjoint
  regions of the same file; land in either order.
- [`2026-08-18-factory-postmerge-discovery-loop-spec`](2026-08-18-factory-postmerge-discovery-loop-spec.md)
  (**approved, pass 2, not yet built at this baseline**) explicitly names this proposal in its own
  collision notes: *"Proposal `2026-08-17-factory-durable-state-outbox` ... is the general fix for
  `postFinish()` being fire-and-forget. This spec does not duplicate that work ... When the general
  outbox lands, its retryable-job drain should absorb the 'enqueue discovery run' step; that is a
  follow-up, not blocking this slice."* This spec reciprocates: `outbox_jobs.job_type` is a free-text
  column (Slice 2), not a closed enum, specifically so a future `enqueue_discovery_run` job type can be
  added without a schema migration. Building that integration now is out of scope (§5) — the sibling
  spec is approved but unbuilt and its `runner/src/discovery.ts`/`webhook.ts` do not exist in code
  yet. If it lands first, preserve its `discovery` run kind, `merge_event_id`, boot enqueue, and
  specialized level-triggered retry while applying this spec.

**Operator-memory constraints:**
[`/memory/MINION/sdlc-board-triage-and-phase-gates.md`](/memory/MINION/sdlc-board-triage-and-phase-gates.md),
"AUDIT ROUND 3 RESPONSE": *"(6) transactional promotion: `queueDevForSpec` dedupes on `(spec_sha,
repo_id)` with check+insert SYNCHRONOUS (better-sqlite3, no await between = atomic in-process)"* —
this spec follows that exact precedent for the outbox: every enqueue is `db.transaction(...)`-wrapped
so the run's terminal status and its outbox rows commit as one atomic unit (§3). The same file's
"AUDIT ADDENDUM RESPONSE" is the literal origin of both the durable-state-outbox proposal and the
`monitor_events` atomic-reservation pattern (`INSERT OR IGNORE` wins the write; CAS on `last_seen_at`
for stale refile) that §3's outbox-job claim reuses. `/memory/MINION/factory/2026-08-18-75dc674e.md`
is a **hard constraint on test design**: any test that inserts a `queued` run and calls `enqueue()`
triggers `pump() → start() → spawn('docker', ...)`, and there is no `docker` binary in the agent
sandbox — the resulting `ENOENT` is an *unhandled async `'error'` event with no listener*, which
crashes the whole test process, not just the assertion. This spec's tests never call `enqueue()` or
a real `spawn('docker', ...)`; Slices 1–3 extract synchronous state helpers and inject/fake the child
process only for the async-error regression test (see each slice's DoD).
`/memory/MINION/minion-factory-agent-pipeline.md`, "★★★concurrent meta writers race pushes": the
existing `transition()` already uses the GitHub Contents API's `sha:` field as an application-level
CAS against concurrent meta edits — this spec does not change that mechanism, only adds a
source-status check that runs against the *same* fetched snapshot (§2). The required read-only
SQLite FTS searches for `durable OR outbox OR postFinish OR lifecycle` and
`factory AND (sqlite OR restart OR queue OR transaction)` returned no factory-specific observation
that supersedes these file-backed constraints; no semantic-memory MCP was available in this session.

---

## 0. Problem (quoted from the approved proposal)

> Audit 2026-08-17 priority #2. `postFinish()` is fire-and-forget
> (`queue.ts:193`): a runner restart can permanently lose auto-fix escalation,
> husk cleanup, head-SHA stamping, or spec→dev promotion. Lifecycle transitions
> validate target statuses but not legal source→target edges, and md/index/sqlite
> updates are not transactional.
>
> **Definition of done:** every post-finish side effect persisted as a retryable
> job with an idempotency key, drained by a worker that survives restarts;
> lifecycle transitions enforce an explicit source→target table; append-only
> run/lifecycle event log; uniqueness/CAS guards on status flips.
>
> **Out of scope:** distributed queues — sqlite tables are sufficient.

## 1. Current behavior (verified against `6ee39279`, not the proposal's paraphrase)

`finish()` (`queue.ts:158-198`) computes the terminal run status, writes it with one
unguarded `UPDATE runs SET status=..., branch=COALESCE(...), pr_url=..., ... WHERE id = ?`
(no `WHERE status = ...` clause at all), then at line 197:

```ts
void postFinish(id).catch((e) => console.warn(`[runner] postFinish ${id}: ${String(e)}`));
```

`postFinish()` (`queue.ts:212-311`) is a single async function that, depending on the freshly-written
row, does up to three GitHub-touching things in sequence, entirely in memory:

The proposal also names head-SHA stamping, but the live baseline has already moved that into
`finish()` itself: `result.headSha` is synchronously written as review attestation in the terminal
`UPDATE` (`queue.ts:188-191`). It is therefore covered by the atomic finish transaction, not by a
fourth outbox job. Reintroducing a PR-head fetch would contradict the audit's reviewed-SHA rule.

1. **Husk-PR-close** (lines 216-232): if `(status === 'error' || status === 'failed') && pr_url`,
   fetch the PR's file count; if zero, POST a close comment then PATCH the PR closed.
2. **Auto-fix escalation ladder** (lines 234-306): if `kind === 'dev' && status === 'failed' &&
   pr_url && branch`, fetch the PR, count prior terminal `dev` runs on that branch, and either file a
   `/hooks/monitor` event (`autofix-<branch>`, already fingerprint-deduped) at the attempt cap, or
   `INSERT` a new `dev` run row (`requeue_of = run.id`) and call `enqueue()`.
3. **Spec→dev promotion** (lines 308-310): if `kind === 'spec' && status === 'passed' && spec_id`,
   call `queueDevForSpec()`, itself already internally idempotent via a `(spec_sha, repo_id)` dedupe
   query (lines 341-346) — this one piece is *already* durable in effect, just not in trigger: nothing
   re-drives it if the triggering `postFinish()` call never ran.

None of this is persisted before it runs. If the runner process exits — `docker compose restart`,
OOM, `self-update.sh`'s pull-and-restart tick — between `finish()`'s `UPDATE` committing and
`postFinish()` completing, every one of these three effects for that run is gone forever. There is no
periodic sweep that re-scans finished runs for undone post-finish work (contrast: `specSweep()` *does*
re-scan approved specs every 30 minutes, so the lifecycle-approval endpoint's own
`void queueDevForSpec(...).catch(...)` fire-and-forget at `index.ts:188` is already self-healing — this
is why the proposal, and this spec, target `postFinish()` specifically and not that call site; see §5
out-of-scope).

`adoptOrphans()` (`queue.ts:376-409`) re-attaches a container that survived a restart and, on
completion, calls `finish()` again for it — so the *run row* reaches a terminal status correctly after
a restart. But `finish()` unconditionally re-invokes the same fire-and-forget `postFinish()`, so the
underlying defect (no persistence, no restart-survival, no retry) is unchanged; it is only reachable
for runs whose *container* survived, not for runs whose `postFinish()` was in flight when the process
died with the container already exited.

`lifecycle.ts`'s `TRANSITIONS` table (lines 16-25) validates only that the **target** status is a
member of the kind's allowed set:

```ts
const TRANSITIONS: Record<string, { allowed: Set<string>; needsReason: Set<string> }> = {
	proposal: { allowed: new Set(['approved', 'rejected', 'retired', 'closed']), ... },
	spec: { allowed: new Set(['approved', 'retired', 'superseded', 'done']), ... }
};
```

`transition()` (lines 35-116) never reads the **current** status of the fetched file before writing
the new one (line 62 blind-replaces the `status:` line via regex). Concretely: a `closed` proposal or
a `done`/`retired`/`superseded` spec can be flipped back to `approved` through this same tool with no
guard at all — the "explicit source→target table" the proposal asks for does not exist; only a
target-membership check does.

`transition()`'s writes ARE already transactional at the GitHub-API layer for the markdown file itself
(the PUT carries `sha: file.sha`, so a concurrent edit 409s/422s and the whole call fails — an
application-level CAS already exists there). The **index.json patch** (lines 89-112) is explicitly
best-effort (`try { ... } catch { /* index stays stale until next regen */ }`) and is not atomic with
the markdown commit — two separate GitHub API calls, no rollback if the second fails. There is no
`runs`-table event log at all: `runs.status` mutates in place with no history, and `lifecycle.ts`'s
only audit trail is the GitHub commit message.

## 2. Approach

Three independent hardenings, matching the proposal's one DoD paragraph line-for-line:

1. **Append-only event log + CAS-guarded run-status writes** (§3, Slice 1) — every runtime
   `runs` creation and status mutation (`queued` insert, `start`, `finish`, `cancel`, spawn failure,
   and `adoptOrphans`' error fallback) commits with exactly one row in a new `lifecycle_events`
   table. Status helpers compare an exact expected state and, for terminalization, require
   `finished_at IS NULL`; this makes `canceled` a real terminal state after `finish()` records the
   container outcome instead of allowing repeated `canceled → canceled` writes. Each status update
   and its event are one synchronous SQLite transaction. `lifecycle_events` is append-only: no
   `UPDATE` or `DELETE` statement anywhere in the codebase touches it (grep-checkable, see DoD).
2. **Transactional outbox for `postFinish()`'s three side effects** (§3, Slices 2-3) — `finish()`
   enqueues one `outbox_jobs` row per applicable side effect, in the *same* `db.transaction()` as the
   status `UPDATE`, so a crash either loses both (row stays non-terminal, `adoptOrphans` or a future
   `finish()` retry re-processes it) or neither (row is terminal AND its jobs are queued — no
   in-between state). A drain worker claims jobs with a CAS `UPDATE ... WHERE status = 'pending'`,
   runs them with per-job-type idempotency (husk-close checks the PR isn't already closed before
   acting; auto-fix checks no run already has `requeue_of = <this run>` before inserting; spec-promote
   uses a strict variant of `queueDevForSpec()` that distinguishes an idempotent no-op from transient
   GitHub failure), retries on failure with backoff, and uses an expiring processing lease so a stuck
   claim is reclaimable without waiting for another process restart. Unknown job types and
   null/failed GitHub responses are failures, never successful no-ops. After 5 failed attempts the
   job becomes `dead`; dead-letter monitor delivery is itself retried until recorded. The worker
   runs at boot and on a 5-minute interval, so restart survival is structural.
3. **Explicit source→target lifecycle edges** (§3, Slice 4) — `transition()` reads the current status
   from the same file-content fetch it already performs (no extra API call), looks up that exact
   source in a `Record<kind, Record<source, Set<target>>>`, and refuses missing source states or
   absent edges. A terminal-state deny-list is not an edge table: it would leave
   `shipped`/`implementing`/`parked`/`unknown` permissive and therefore fail the approved proposal's
   definition of done. The repository does not currently define which transitions from
   `approved`, `in-spec`, `implementing`, `shipped`, `parked`, or `unknown` are legal, so the exact
   table is a human policy decision recorded in §8. Slice 4 is blocked until that table is supplied;
   Slices 1–3 are not.

## 3. Slice 0 — recon and collision gate (prepend to Slice 1)

```bash
gh api repos/NikolasP98/minion-factory/commits/main --jq '.sha'
for p in runner/package.json runner/src/db.ts runner/src/queue.ts runner/src/lifecycle.ts \
  runner/src/index.ts runner/src/github.ts runner/src/risk.ts; do
  gh api "repos/NikolasP98/minion-factory/contents/$p?ref=main" --jq '.sha + "  " + .path'
done
gh api repos/NikolasP98/minion-factory/git/trees/main?recursive=true --jq \
  '.tree[] | select(.path | test("\\.test\\.ts$")) | .path'
```

Confirm: `postFinish()` still has the same three `if` blocks in the same order at roughly the quoted
line numbers; `TRANSITIONS` in `lifecycle.ts` still validates target-only; no `.test.ts` file or
`npm test` script exists yet (if orchestration-tests-spec has landed, use its `npm test` in every DoD
below instead of the raw `node --import tsx --test` invocation — same files, same result). If any of
this drifted, update this spec's line references and code to match live `main` before implementing —
do not implement the stale excerpts quoted above.

## 4. Slices

### Slice 1 — append-only event log + CAS-guarded run-status writes (4-6h, tag `logic`)

**Files:** `runner/src/db.ts`, new `runner/src/events.ts` + `runner/src/events.test.ts`,
`runner/src/queue.ts`, `runner/src/index.ts`, `runner/src/lifecycle.ts`, and `runner/src/requeue.ts`
if the orchestration-tests sibling has landed.

- `db.ts`: add

  ```sql
  CREATE TABLE IF NOT EXISTS lifecycle_events (
  	id INTEGER PRIMARY KEY AUTOINCREMENT,
	event_key TEXT NOT NULL UNIQUE, -- deterministic transition/commit identity
  	entity_type TEXT NOT NULL,   -- 'run' | 'proposal' | 'spec'
  	entity_id TEXT NOT NULL,
  	from_status TEXT,
  	to_status TEXT NOT NULL,
  	actor TEXT NOT NULL,
  	reason TEXT,
  	created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lifecycle_events_entity ON lifecycle_events(entity_type, entity_id, created_at);
  ```

  Export a `LifecycleEvent` type mirroring the columns.
- New `events.ts` exports
  `recordEvent(eventKey, entityType, entityId, fromStatus, toStatus, actor, reason?)` — one
  `INSERT OR IGNORE`; on `changes === 0`, select the existing row and throw unless every immutable
  field matches (idempotent replay, never silent key collision). `event_key` is
  `run:<run-id>:created` for creation,
  `run:<run-id>:<from>:<to>` for run transitions, and `github:<commit-sha>` for proposal/spec
  transitions. It prevents a retry from duplicating the same immutable fact without permitting any
  event mutation. This is the **only** place any code writes to `lifecycle_events`; no other file
  gets an `UPDATE`/`DELETE` against it.
- `queue.ts`: extract small exported CAS transactions so the guard logic is unit-testable without
  spawning docker (memory constraint, §"Operator-memory constraints" above):

  ```ts
  // Returns true iff this transaction moved queued -> running and appended
  // the corresponding event.
  export function claimQueuedRun(id: string): boolean {
	return claimQueuedRunTx(id); // one db.transaction: exact-state UPDATE + recordEvent
  }

  // Slice 1 exports the terminal transaction; Slice 2 extends the same
  // transaction body with outbox inserts. Its inner UPDATE must be:
  // WHERE id = ? AND status = ? AND finished_at IS NULL, where the expected
  // source is the status read inside that same synchronous transaction and is
  // restricted to running|canceled. It classifies the target from that source,
  // exitCode, and result inside the transaction, then appends the event and jobs.
  export function finishRun(id: string, exitCode: number, result: FinishResult): Run | null;
  ```

  The exact-source predicate deliberately accepts `running` **or** `canceled`: `finish()` must still
  record a container outcome on a row canceled while the container was exiting, while preserving
  `canceled` as the target. `finished_at IS NULL` is essential: without it, a second finish call can
  perform another `canceled → canceled` update and append another event because `canceled` is not in
  the pass-1 SQL's `NOT IN ('passed','failed','error')` list.
- `start()` calls `claimQueuedRun(run.id)` first; if `false`, `console.warn` and `return` before
  `mkdirSync`/`spawn` (nothing to clean up — the row was claimed by something else, or canceled,
  before this call). The helper writes the event inside the same transaction; callers must not append
  it afterward.
- `finish()` parses `result.json` as today, then calls `finishRun(id, exitCode, result)`. That
  transaction reads the current state and computes canceled precedence itself; there
  is no stale pre-read outside the transaction. A `null` result logs and returns without pumping the
  outbox.
- `cancel()` becomes one transaction: select an exact `queued|running` source, update with
  `WHERE id = ? AND status = <that source> AND finished_at IS NULL`, and append the event. A separate
  pre-read followed by an `IN (...)` update is not sufficient because the recorded `from_status`
  could differ from the row actually updated.
- `adoptOrphans()`'s "no container, no result.json" fallback (`queue.ts:400-403`) keeps its guarded
  `running → error` condition but performs the update and event append in one transaction.
- Audit **every runtime `INSERT INTO runs` call site** in `queue.ts`, `index.ts`, `lifecycle.ts`, and
  `requeue.ts` if the orchestration-tests sibling has landed. Each insert and its
  `null → queued` event use one transaction. Direct SQL fixture inserts in tests are exempt.
- Attach a one-shot `error` listener to each spawned child. Node reports a missing `docker` binary as
  an asynchronous child-process `error`, not a synchronous throw; route that path through the same
  terminal transaction. The subsequent `close` callback may also fire and must be harmless because
  the finish CAS has already won. This follows
  `/memory/MINION/factory/2026-08-18-75dc674e.md`.

**DoD (Tier A — no docker/box needed):**

```bash
cd runner && npx tsc --noEmit
TEST_ROOT=$(mktemp -d)
FACTORY_DATA="$TEST_ROOT/data" FACTORY_RUNS_DIR="$TEST_ROOT/runs" FACTORY_CONCURRENCY=0 \
  node --import tsx --test src/events.test.ts
```

`events.test.ts` must, against a fresh temp `FACTORY_DATA` sqlite file (no docker, no `enqueue()`,
no `start()`/`finish()` call):
- insert a `runs` row with `status='queued'`, call `claimQueuedRun(id)` twice — first call `true` and
  row status becomes `running`; second call `false` (already running);
- call `finishRun(id, 0, {testExit:0, ...})` — returns the terminal row, now `passed`; call it
  again with the same id — returns `null` and appends no second event;
- repeat from a `canceled`, unfinished row: first finish preserves `canceled` and sets `finished_at`;
  the second returns `null` (proves the pass-1 double-finish hole is closed);
- call `recordEvent('fixture:event', 'run', id, 'queued', 'running', 'system')` twice then query `lifecycle_events` for that
  `entity_id` — exactly one row, fields match;
- exercise each runtime run-creation helper and assert exactly one `null → queued` event;
- simulate the asynchronous spawn-error path and assert exactly one terminal event with no process
  crash;
- `grep -rn "DELETE FROM lifecycle_events\|UPDATE lifecycle_events" runner/src` returns nothing
  (append-only invariant, grep-checkable per §2).

### Slice 2 — outbox table + transactional enqueue at `finish()` time (5-7h, tag `infra`)

**Files:** `runner/src/db.ts`, `runner/src/queue.ts`.

- `db.ts`: add

  ```sql
  CREATE TABLE IF NOT EXISTS outbox_jobs (
  	id TEXT PRIMARY KEY,          -- idempotency key: '<job_type>:<run_id>'
  	job_type TEXT NOT NULL,
  	run_id TEXT NOT NULL,
  	seq INTEGER NOT NULL DEFAULT 0,
  	status TEXT NOT NULL DEFAULT 'pending',   -- pending | processing | done | dead
  	attempts INTEGER NOT NULL DEFAULT 0,
  	next_attempt_at TEXT NOT NULL,
	lease_until TEXT,
  	last_error TEXT,
	dead_reported_at TEXT,
  	created_at TEXT NOT NULL,
  	updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_outbox_jobs_claim ON outbox_jobs(status, next_attempt_at, lease_until, created_at, seq);
  ```

  `job_type` is deliberately a free-text column, not a SQL `CHECK`-constrained enum — see the
  postmerge-discovery-loop-spec collision note above; a future `enqueue_discovery_run` job type must
  be addable without a migration. `id` is the idempotency key the proposal's DoD asks for: `INSERT OR
  IGNORE` on this primary key means re-running the enqueue step (e.g. a hypothetical future
  double-call) can never create a duplicate job for the same `(job_type, run_id)` pair.
- `queue.ts`: replace the bare `void postFinish(id).catch(...)` at the end of `finish()` with a
  single `db.transaction()` that does the status write (Slice 1's `finishRun`, inlined into the
  transaction body — `better-sqlite3` transactions wrap plain synchronous statement calls, not a
  separate connection) **and** the outbox inserts as one atomic commit:

  ```ts
  const finishAndEnqueue = db.transaction((id: string, exitCode: number, result: FinishResult) => {
	const row = finishRunInner(id, exitCode, result); // exact-source + finished_at guard; inserts event
	if (row === null) return null;
  	const now = new Date().toISOString();
  	const insertJob = (jobType: string, seq: number) =>
  		db.prepare(
  			`INSERT OR IGNORE INTO outbox_jobs (id, job_type, run_id, seq, status, attempts, next_attempt_at, created_at, updated_at)
  			 VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)`
  		).run(`${jobType}:${id}`, jobType, id, seq, now, now, now);
  	if ((row.status === 'error' || row.status === 'failed') && row.pr_url) insertJob('husk_close', 1);
  	if (row.kind === 'dev' && row.status === 'failed' && row.pr_url && row.branch) insertJob('auto_fix', 2);
  	if (row.kind === 'spec' && row.status === 'passed' && row.spec_id) insertJob('spec_promote', 1);
  	return row;
  });
  ```

  The gating conditions are copied **verbatim** from the current `postFinish()` `if`s (§1) — this
  slice changes *when* the decision to act is durably recorded, not the decision itself. `seq`
  defines an actual per-run prerequisite when both `husk_close` and `auto_fix` are inserted: Slice
  3's claim query may claim a job only when no lower-`seq` job for that `run_id` remains non-`done`.
  Ordering by `(created_at, seq)` alone is insufficient: after `husk_close` fails into a future
  backoff, it would immediately allow `auto_fix` to run. If a prerequisite becomes `dead`, mark its
  remaining dependents `dead` with `last_error='blocked by <job-id>'` and report each through the
  dead-letter path; never leave them pending forever. This preserves today's in-sequence behavior
  and makes permanent blocking visible.
- `finish()` becomes: parse the result as today, call
  `const row = finishAndEnqueue(id, exitCode, result)`; if
  `row` is truthy, call the (still-named) `pumpOutbox()` (Slice 3) to drain immediately — matching
  today's "fire it right after finishing" latency, now with the durability the transaction provides
  even if `pumpOutbox()` itself never gets to run before a crash (§3's boot reconciliation covers
  that case).
- Delete the old inline `postFinish()` function body — its three `if` blocks move to Slice 3's job
  handlers unchanged in logic, decomposed by job type.

**DoD (Tier A):**

```bash
cd runner && npx tsc --noEmit
TEST_ROOT=$(mktemp -d)
FACTORY_DATA="$TEST_ROOT/data" FACTORY_RUNS_DIR="$TEST_ROOT/runs" FACTORY_CONCURRENCY=0 \
  node --import tsx --test src/queue.test.ts
```

New assertions in `queue.test.ts` (still no `enqueue()`/`start()`/docker — insert rows directly and
call the exported transaction function):
- a `dev`-kind row transitioned to `failed` with a non-null `pr_url` and `branch` yields exactly two
  `outbox_jobs` rows (`husk_close:<id>` seq 1, `auto_fix:<id>` seq 2), both `status='pending'`;
- a `spec`-kind row transitioned to `passed` with a `spec_id` yields exactly one
  `spec_promote:<id>` row;
- calling the transaction function a second time for the same already-terminal row inserts **zero**
  additional rows (idempotent no-op, both via `finishRun`'s terminal guard returning `null` and
  via `INSERT OR IGNORE` as a second line of defense);
- a `dev`-kind row transitioned to `passed` (no failure) yields zero `outbox_jobs` rows.
- install a temporary SQLite trigger that raises before `outbox_jobs` insert, call
  `finishAndEnqueue()`, and assert the exception rolls back the terminal status **and** lifecycle
  event; this directly proves atomicity rather than inferring it from a successful final state.

### Slice 3 — drain worker + idempotent job handlers + boot reconciliation (6-8h, tag `logic`)

**Files:** `runner/src/queue.ts`, `runner/src/index.ts`.

- `queue.ts`: add a claim/drain loop, reusing the `monitor_events` atomic-reservation idiom cited in
  operator memory. `OUTBOX_MAX_ATTEMPTS = 5`, backoff is 1m/5m/15m/30m/60m, and one in-process
  `outboxDraining` flag prevents overlapping local drains.
  - Before each claim, atomically reset `processing` rows whose `lease_until <= now` to `pending`.
    Claims set `status='processing'`, `lease_until=now+2m`, and `updated_at` with
    `WHERE id=? AND status='pending'`; all handler network calls use a timeout shorter than the
    lease. This implements the proposal title's lease requirement and recovers a hung/crashed claim
    on an ordinary interval tick, not boot only.
  - The candidate query requires `next_attempt_at <= now` and no lower-`seq` job for the same
    `run_id` whose status is not `done`. It orders by `(created_at, seq)`. A lost claim race loops;
    do not recurse without a bound.
  - Success updates `processing → done` with `lease_until=NULL`. Failure increments `attempts`,
    clears the lease, stores a bounded error, and either returns to `pending` at the next backoff or
    becomes `dead` at attempt 5. All completion/failure writes guard `status='processing'`.
  - When a job becomes dead, atomically mark later nonterminal jobs for that run dead as
    `blocked by <job-id>`. `reportDeadJobs()` selects `dead_reported_at IS NULL`, POSTs the existing
    `outbox-dead-<job-id>` monitor fingerprint, requires an HTTP 2xx response, and only then sets
    `dead_reported_at`. Failure leaves it null for the next interval. A swallowed monitor failure
    would silently discard the only operator signal and is forbidden.
  - `runOutboxJob()` has an exhaustive `switch`; an unknown free-text `job_type` throws. Free text
    permits schema evolution, not silent success on version skew or a typo.

- Job handlers, each taking a `run_id`, re-fetching the row fresh (mirrors today's `postFinish()`
  pattern of reading the row inside the handler rather than trusting a stale closure):
  - `runHuskClose(runId)`: fetch the run; a missing run or missing `pr_url` is an invariant failure,
    not success, because the enqueue predicate guaranteed both. `GET` the PR; **if
    `pr.state === 'closed'`, return — already done, idempotent no-op** (this is the retry-safety
    check the current inline code doesn't need but a retried job does). Otherwise `GET` the file
    count; if non-zero, return (not actually a husk — it may have gained
    commits since, e.g. a manual push). If zero, POST the comment then PATCH closed — same two calls
    as today.
  - `runAutoFix(runId)`: fetch the run; **if a row with `requeue_of = runId` already exists, return
    — already handled by a previous attempt of this job (or a manual requeue)**, reusing the existing
    `requeue_of` column and its established idempotency meaning rather than inventing a second
    marker. A missing run/branch/PR URL is an invariant failure. Otherwise: fetch the PR, check it's
    open+unmerged+no active run on the branch (unchanged
    from today), compute `attempts` from the terminal-run count on the branch (unchanged), and either
    file the `autofix-<branch>` monitor event or `INSERT` the escalated fix run with `requeue_of =
    runId`. The monitor POST is no longer `.catch(() => undefined)`: require 2xx or throw so the job
    retries. The queued replacement run insert and its `null → queued` lifecycle event are one
    transaction; boot's existing `enqueue()` recovers a crash after that commit.
  - `runSpecPromote(runId)`: require a run and `spec_id`, then call a strict queue-dev path that
    returns a discriminated `queued | already_satisfied` outcome and throws for GitHub/API,
    parse/config, or filesystem failure. Preserve the current fail-soft `queueDevForSpec()` wrapper
    for its existing sweep/route callers; the outbox handler must not interpret today's ambiguous
    `null` (which can mean transient fetch failure) as success.
- `github.ts`: add strict variants used by outbox handlers that throw on network errors and non-2xx
  responses. The existing `gh()`/`fetchMetaFile()` intentionally collapse failure to `null`; using
  those directly would let the drain mark a lost side effect `done`.
- `index.ts`: right after `adoptOrphans()`, start the worker. Lease reconciliation belongs inside
  every pump, so boot does not need an unguarded reset of every `processing` row:

  ```ts
  pumpOutbox();
  setInterval(pumpOutbox, 5 * 60_000).unref();
  ```

**DoD (Tier A — fixture-driven, no docker/box, mocked `fetch`):**

```bash
cd runner && npx tsc --noEmit
TEST_ROOT=$(mktemp -d)
FACTORY_DATA="$TEST_ROOT/data" FACTORY_RUNS_DIR="$TEST_ROOT/runs" FACTORY_CONCURRENCY=0 \
  node --import tsx --test src/queue.test.ts
```

Assertions, using a stub `global.fetch` (no real GitHub calls) that returns canned responses keyed by
URL/method:
- a `pending` `husk_close` job whose stubbed PR response has 0 files and `state: 'open'` drains to
  `status='done'`, and the stub records exactly one comment POST and one closing PATCH;
- the same job re-run (simulate by resetting it to `pending` and draining again) against a stub that
  now returns `state: 'closed'` makes **zero** additional comment/PATCH calls — idempotency proven;
- a `pending` `auto_fix` job where a `requeue_of`-tagged row already exists in `runs` drains to `done`
  making **zero** GitHub calls;
- a job whose handler always throws is claimed, fails 5 times (simulate by directly setting
  `attempts=4` before the 5th drain), ends `status='dead'`; a failed monitor response leaves
  `dead_reported_at` null and a later successful response sets it, using the same fingerprint;
- a job left `processing` with an expired lease is reclaimed and drainable on an ordinary pump;
  one with an unexpired lease is not reclaimed;
- a lower-sequence job in backoff prevents its higher-sequence sibling from being claimed; when the
  lower job becomes dead, the sibling becomes dead/blocked and is reported rather than stranded;
- `gh()`-equivalent nulls, rejected/non-2xx fetches, and an unknown `job_type` all retry/dead-letter;
  none drain to `done`;
- `spec_promote` distinguishes `already_satisfied` (done) from transient source fetch failure
  (retry), and an auto-fix monitor 500 retries instead of being swallowed.

### Slice 4 — explicit lifecycle source→target edges (3-5h, tag `logic`)

**Files:** `runner/src/lifecycle.ts`, `runner/src/lifecycle.test.ts`, `README.md`.

- **Blocked on the human decision in §8.** Replace target-only `TRANSITIONS` with an explicit edge
  table whose values are approved there; do not implement the illustrative keys below until every
  set is decided. This does not expand the target API: proposal targets remain
  `approved|rejected|retired|closed`, and spec targets remain
  `approved|retired|superseded|done`.

  ```ts
  const EDGES: Record<'proposal' | 'spec', Record<string, ReadonlySet<string>>> = {
	proposal: {
		// draft: new Set([...]), review: new Set([...]), approved: ...,
		// in-spec: ..., rejected: new Set(), retired: new Set(), closed: new Set()
	},
	spec: {
		// draft: new Set([...]), review: new Set([...]), approved: ...,
		// implementing: ..., shipped: ..., parked: ..., unknown: ...,
		// rejected: new Set(), retired: new Set(), superseded: new Set(), done: new Set()
	}
  };
  ```

- In `transition()`, after fetching `file`/decoding `body` (existing code, ~line 59) and before the
  PUT, extract the current status from the same body via the existing `parseFrontmatter()` helper
  (`github.ts`, already imported project-wide — add the import to `lifecycle.ts`, which currently
  parses `status:`/`updated:` with ad-hoc regexes instead of this shared parser). Missing/non-string
  source status and a source absent from `EDGES[kind]` fail closed with 409; a target absent from the
  source's set also returns 409. Keep the existing target validation/reason validation first so
  malformed requests still return their current 400/422 without a GitHub call.

  ```ts
  const currentStatus = parseFrontmatter(body).status;
  if (typeof currentStatus !== 'string' || !EDGES[kind][currentStatus]?.has(status)) {
	return { ok: false, status: 409, error: `illegal ${kind} transition: ${String(currentStatus)} -> ${status}` };
  }
  ```

  This runs against the exact snapshot the PUT's `sha:` guard also covers — no extra GitHub call, no
  new race window.
- Immediately after a successful markdown PUT (existing `if (!put?.commit?.sha) return ...` guard
  already present), and before the best-effort index patch, call
  Slice 1's `recordEvent('github:<commit-sha>', 'proposal'|'spec', id, currentStatus, status, by,
  cleanReason || undefined)`. The GitHub commit remains canonical because SQLite cannot transact
  atomically with the Contents API. The deterministic commit key makes retries idempotent, but a
  process crash after the remote PUT and before the local insert can still omit the SQLite
  projection; do not describe this projection as byte-complete history without a separate
  reconciliation mechanism.
- `README.md`: short paragraph documenting `outbox_jobs`/`lifecycle_events` for operator debugging —
  e.g. `sqlite3 /data/factory.db "SELECT * FROM outbox_jobs WHERE status != 'done'"` to see stuck
  side effects, and `"SELECT * FROM lifecycle_events WHERE entity_id = '<id>' ORDER BY created_at"`
  to see locally recorded history — mirroring the existing scoped-credential doc comment style
  already in `index.ts`. State explicitly that GitHub commit history is canonical for proposal/spec
  transitions and pre-deploy events are not backfilled.

**DoD (Tier A):**

```bash
cd runner && npx tsc --noEmit
TEST_ROOT=$(mktemp -d)
FACTORY_DATA="$TEST_ROOT/data" FACTORY_RUNS_DIR="$TEST_ROOT/runs" FACTORY_CONCURRENCY=0 \
  node --import tsx --test src/lifecycle.test.ts
```

Using a stubbed `global.fetch` consumed by the real `gh()` helper (no real GitHub calls):
- table-drive **every approved edge and every source state** from the human-approved table; each
  approved edge succeeds and representative absent edges return 409 with zero PUTs;
- specifically cover both autonomous call shapes, `proposal draft → approved` and
  `spec draft|review → approved`, if and only if the approved table retains them;
- missing, empty, and unrecognized source statuses return 409 with zero PUTs rather than inheriting
  today's permissiveness;
- each sink state in the approved table refuses every target;
- after a successful stubbed transition, `lifecycle_events` has exactly one new row with
  `event_key='github:<commit-sha>'`, `entity_type='spec'`, and matching
  `from_status`/`to_status`; replaying the same commit key does not duplicate it.

## 5. Cross-project impact and ordering

No AGENTS.md cross-project impact-zone row matches: no gateway protocol, channel extension, hub/site
DB or auth, agent definition, UI, or Paperclip adapter changes. Blast radius is entirely internal to
the standalone factory runner process; no `.env`, `deploy.sh`, `setup.sh`, or `docker-compose.yml`
change, so this ships via the box's existing self-update git-pull-and-restart tick with no operator
action required (per `/memory/MINION/minion-factory-agent-pipeline.md`'s "box is now SELF-UPDATING").

| Surface | Impact / ordering |
|---|---|
| Slices 1→2→3 | Strict order: Slice 3's job handlers assume Slice 2's `outbox_jobs` rows exist with the exact `job_type`/`seq` values Slice 2 inserts; Slice 2 extends Slice 1's `finishRun` transaction semantics. Slice 4 is code-independent but policy-blocked by §8. |
| `workitem-handoff-schema-spec` (approved, unbuilt) | Shares `queue.ts` (Slice 3's strict spec-promote path must preserve that spec's fail-loud multi-repo routing) and `lifecycle.ts` (Slice 5 there vs. Slice 4 here — different functions). Its run-insertion changes must also use Slice 1's creation-event transaction if it lands first. |
| `deterministic-unstick-spec` (approved, unbuilt) | Shares `index.ts` (its auth-middleware edit vs. this spec's boot-sequence `pumpOutbox()` call) — disjoint regions. Its facilitator container also calls `/hooks/monitor` with the `FACTORY_UNSTICK_SECRET`; this spec's `outbox-dead-*` monitor call always uses the admin `FACTORY_SECRET` (it runs in-process, not in a container), so no credential overlap. |
| `postmerge-discovery-loop-spec` (**approved, unbuilt**) | It currently owns a specialized durable discovery-run transaction and level-triggered retry. Preserve those mechanisms if it lands first; absorbing them into `outbox_jobs` remains a follow-up. Its new `discovery` run insert must append the creation event once Slice 1 exists. |
| `orchestration-tests-spec` (approved, unbuilt) | This spec's `*.test.ts` files use the exact `node --import tsx --test` invocation that spec establishes as `npm test`. If its `requeue.ts` extraction lands first, include that file in the creation-event audit and preserve its `recordFinish()` characterization by delegating to `finishAndEnqueue()`. |

## 6. Explicitly out of scope

- **Distributed queues** — the proposal says so explicitly; `outbox_jobs` is one more table in the
  same single-process `factory.db`, drained in-process, exactly the "sqlite tables are sufficient"
  the proposal asks for.
- Making the **other two** `queueDevForSpec()` call sites (the `/lifecycle/:kind/:id` approval
  endpoint's `void queueDevForSpec(...).catch(...)`, and `specSweep()`'s awaited call) outbox-durable.
  The approval endpoint's fire-and-forget gap is already self-healing via `specSweep()`'s existing
  30-minute reconciliation sweep (§1) — it is not the audited defect (`queue.ts:193`,
  `postFinish()`), and adding a second durability mechanism for an already-covered gap is
  disproportionate to this proposal's DoD.
- Changing `queueDevForSpec()`'s repo-resolution algorithm — owned by
  `workitem-handoff-schema-spec` Slice 3.
- Changing what `/hooks/monitor` does internally (GitHub issue vs. typed-proposal upsert) — owned by
  `workitem-handoff-schema-spec` Slice 6; this spec only calls the route's existing HTTP contract.
- Absorbing the postmerge-discovery-loop spec's future "enqueue discovery run" step into the outbox
  — that spec is approved but unbuilt; `job_type` is left extensible for a later integration (§5).
- Byte-exact transactionality across two separate GitHub API calls within one job (e.g. `husk_close`'s
  comment-POST-then-PATCH-close): GitHub has no multi-call transaction primitive. The idempotency
  check (§ Slice 3: skip entirely if the PR is already closed) bounds the damage of a crash between
  the two calls to "one duplicate comment on the eventual successful retry," not a lost or repeated
  PR-close — a known, stated limitation, not a silent gap.
- Retrofitting `lifecycle_events` history for runs/proposals/specs that transitioned **before** this
  spec ships — the log starts recording from deploy time forward, matching every other append-only
  log in this codebase (e.g. `monitor_events`, GitHub commit history itself).
- Making the local proposal/spec event projection atomic with the GitHub Contents API. No shared
  transaction exists across SQLite and GitHub; GitHub commit history remains canonical. A separate
  commit-history reconciler would be required to close the post-PUT/pre-insert crash window.

## 7. End-to-end acceptance

Full acceptance is blocked until §8 is resolved and encoded in Slice 4. From a clean clone of the
eventual merge commit, no docker/box is needed (pure logic + SQLite + mocked HTTP):

```bash
cd runner && npm ci && npx tsc --noEmit
node --import tsx --test src/events.test.ts src/queue.test.ts src/lifecycle.test.ts
# or, once orchestration-tests-spec's package.json script exists: npm test
grep -rn "DELETE FROM lifecycle_events\|UPDATE lifecycle_events" src   # expect: no matches
```

Then, in order:

1. Slice 1's tests confirm creation, `claimQueuedRun`, `finishRun`, cancel, spawn failure, and orphan
   fallback use exact-state transactions; second terminalization is a no-op even for canceled runs;
   each successful state change has exactly one append-only event.
2. Slice 2's tests confirm `finish()`'s status write and its outbox enqueue commit as one atomic
   `db.transaction()` — the forced-insert-failure test rolls back status/event/jobs, a terminal run
   has exactly the right `outbox_jobs` rows for its
   `(kind, status, pr_url, branch, spec_id)` combination, and re-running the same transaction on an
   already-terminal row inserts nothing new.
3. Slice 3's tests confirm every known job type is retry-safe, transient/null/non-2xx responses and
   unknown types never become `done`, expired leases reclaim on any pump, lower-sequence
   prerequisites cannot be bypassed during backoff, and dead/dependency-blocked jobs keep retrying
   monitor delivery until `dead_reported_at` is set.
4. Slice 4's table-driven tests confirm every human-approved edge and source state, reject absent
   edges and unknown/missing sources with 409, and append a commit-keyed local projection after a
   successful GitHub transition.
5. Diff review confirms the proposal's four DoD clauses each map to a concrete, tested mechanism:
   retryable idempotent-keyed jobs (Slices 2–3) drained by a lease-based restart-surviving worker ·
   explicit source→target table (Slice 4's `EDGES`) · append-only event log (Slices 1/2/4,
   grep-verified no mutation, with GitHub canonical for cross-system lifecycle history) · CAS
   guards on status flips (exact source plus `finished_at IS NULL`) and job claims.

Only then does a runner restart at any point in a run's lifecycle — mid-container, mid-`postFinish`,
mid-outbox-job — lose zero husk cleanups, zero auto-fix escalations, and zero spec→dev promotions,
closing the exact defect `queue.ts:193`'s fire-and-forget call represented.

## 8. Human decision required

Approve the exact source→target edge sets for both lifecycle kinds. At minimum, decide the legal
targets, from the existing per-kind target allowlists, for every source value currently present in
repository artifacts or accepted by the workflow:

- proposal: `draft`, `review`, `approved`, `in-spec`, `rejected`, `retired`, `closed`, `done`;
- spec: `draft`, `review`, `approved`, `implementing`, `shipped`, `parked`, `unknown`, `rejected`,
  `retired`, `superseded`, `done`.

The known autonomous calls require `proposal draft → approved` and `spec draft|review → approved`
unless policy intentionally retires those automations. Terminal sinks can be represented by empty
sets. The reviewer cannot infer whether approved/in-progress/historical states may be retired,
closed, superseded, completed, or revived without inventing lifecycle policy. Until this table is
approved, the proposal's explicit-edge definition of done is unmet and Slice 4 must not ship.
