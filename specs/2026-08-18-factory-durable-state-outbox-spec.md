---
id: 2026-08-18-factory-durable-state-outbox-spec
title: "Durable state — transactional outbox for postFinish side effects, guarded lifecycle edges, append-only event log"
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-factory-durable-state-outbox
verdict: pending
repos: [minion-factory]
tags: [logic, infra]
type: infra
---

# Durable state machine + outbox for run side effects

**Owner surface:** `minion-factory` (`NikolasP98/minion-factory`, private, default branch `main`) —
`runner/src/db.ts`, `runner/src/queue.ts`, `runner/src/lifecycle.ts`, `runner/src/index.ts`, new
`runner/src/events.ts` (+ `runner/src/events.test.ts`), new `runner/src/queue.test.ts` /
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
    fail-loud multi-repo routing). This spec never edits `queueDevForSpec()`'s body — Slice 3 below
    only wraps the *existing* call in an idempotent outbox job. Whichever lands first, the other
    calls the function as it stands; no revert either way.
  - Its Slice 5 ("WorkItem-aware factory consumers") edits `promoteSweep()`/`specSweep()` in
    `lifecycle.ts` — the risk-tag gating that decides *which* proposals/specs may auto-approve. This
    spec's Slice 4 edits `transition()` — the function those sweeps *call* — adding a source-status
    check that runs **before** the existing target-status check. It does not touch the sweeps'
    calling code or their tag logic; `promoteSweep`/`specSweep` still call
    `transition(kind, id, 'approved', ...)` from `draft`/`review`, which stays legal under this
    spec's edge table (see §2). No conflict either order.
  - Its Slice 6 replaces `/hooks/monitor`'s GitHub-issue creation with a typed-proposal upsert. This
    spec's `auto_fix` and `outbox-dead` handlers (§3) call that route over HTTP with the same
    `{source,title,fingerprint,url,detail}` body the route already documents — a contract, not an
    implementation dependency. Whatever Slice 6 does internally, the call succeeds unchanged.
- [`2026-08-18-factory-deterministic-unstick-spec`](2026-08-18-factory-deterministic-unstick-spec.md)
  (approved, not yet built) edits the `runner/src/index.ts` auth middleware (a block above where
  this spec's boot-sequence edit lands, near `adoptOrphans()`/`startAutoMergeSweep()`). Disjoint
  regions of the same file; land in either order.
- [`2026-08-18-factory-postmerge-discovery-loop-spec`](2026-08-18-factory-postmerge-discovery-loop-spec.md)
  (**draft, pass 1, not yet approved** — written same day) explicitly names this proposal in its own
  collision notes: *"Proposal `2026-08-17-factory-durable-state-outbox` ... is the general fix for
  `postFinish()` being fire-and-forget. This spec does not duplicate that work ... When the general
  outbox lands, its retryable-job drain should absorb the 'enqueue discovery run' step; that is a
  follow-up, not blocking this slice."* This spec reciprocates: `outbox_jobs.job_type` is a free-text
  column (§1), not a closed enum, specifically so a future `enqueue_discovery_run` job type can be
  added without a schema migration. Building that integration now is out of scope (§5) — the sibling
  spec is unapproved and its `runner/src/discovery.ts`/`webhook.ts` do not exist in code yet.

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
crashes the whole test process, not just the assertion. This spec's tests never call `enqueue()`,
`start()`, or `finish()` end-to-end; §1 and §3 extract the CAS/enqueue logic into small synchronous
functions precisely so they're unit-testable without touching `spawn()` (see each slice's DoD).
`/memory/MINION/minion-factory-agent-pipeline.md`, "★★★concurrent meta writers race pushes": the
existing `transition()` already uses the GitHub Contents API's `sha:` field as an application-level
CAS against concurrent meta edits — this spec does not change that mechanism, only adds a
source-status check that runs against the *same* fetched snapshot (§2).

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

1. **Append-only event log + CAS-guarded run-status writes** (§3, Slice 1) — every `runs.status`
   mutation (`start`, `finish`, `cancel`, `adoptOrphans`' error fallback) goes through a small guarded
   helper that (a) only writes if the row is still in an expected prior state and (b) appends one row
   to a new `lifecycle_events` table. `lifecycle_events` is genuinely append-only: no `UPDATE` or
   `DELETE` statement anywhere in the codebase ever touches it (grep-checkable, see DoD).
2. **Transactional outbox for `postFinish()`'s three side effects** (§3, Slices 2-3) — `finish()`
   enqueues one `outbox_jobs` row per applicable side effect, in the *same* `db.transaction()` as the
   status `UPDATE`, so a crash either loses both (row stays non-terminal, `adoptOrphans` or a future
   `finish()` retry re-processes it) or neither (row is terminal AND its jobs are queued — no
   in-between state). A drain worker claims jobs with a CAS `UPDATE ... WHERE status = 'pending'`,
   runs them with per-job-type idempotency (husk-close checks the PR isn't already closed before
   acting; auto-fix checks no run already has `requeue_of = <this run>` before inserting; spec-promote
   reuses `queueDevForSpec()`'s existing dedupe verbatim), retries on failure with backoff, and dies
   to a monitor event after 5 attempts. The worker runs at boot (after `adoptOrphans()`, so it also
   reclaims any job stuck `processing` from a mid-job crash) and on a 5-minute interval, so restart
   survival is structural, not best-effort.
3. **Explicit source→target lifecycle edges** (§3, Slice 4) — `transition()` reads the current status
   from the same file-content fetch it already performs (no extra API call) and refuses the write if
   that status is in a small `TERMINAL` set per kind (`proposal`: `rejected`/`retired`/`closed`;
   `spec`: `retired`/`superseded`/`done`). This is a conservative "terminal states are sinks" model
   rather than hand-authoring every legal edge for every historical status value
   (`shipped`/`implementing`/`parked`/`unknown` all remain non-terminal and behave exactly as today);
   see §5 for why a fuller state machine is not attempted here. Both existing autonomous callers
   (`promoteSweep`/`specSweep`, which only ever transition `draft`/`review` → `approved`) are
   unaffected — neither status is terminal.

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
`runner/src/queue.ts`.

- `db.ts`: add

  ```sql
  CREATE TABLE IF NOT EXISTS lifecycle_events (
  	id INTEGER PRIMARY KEY AUTOINCREMENT,
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
- New `events.ts` exports `recordEvent(entityType, entityId, fromStatus, toStatus, actor, reason?)`
  — one `INSERT`, nothing else. Pure, synchronous, no GitHub/network access. This is the **only**
  place any code writes to `lifecycle_events`; no other file gets an `UPDATE`/`DELETE` against it.
- `queue.ts`: extract two small exported CAS helpers so the guard logic is unit-testable without
  spawning docker (memory constraint, §"Operator-memory constraints" above):

  ```ts
  // Returns true iff this call transitioned the row queued -> running.
  export function claimQueuedRun(id: string): boolean {
  	const res = db
  		.prepare("UPDATE runs SET status = 'running', started_at = ? WHERE id = ? AND status = 'queued'")
  		.run(new Date().toISOString(), id);
  	return res.changes === 1;
  }

  // Returns the PRIOR status iff this call moved the row to a terminal status
  // for the first time; null if the row was already terminal (double-finish
  // guard) or missing.
  export function claimFinishRun(id: string, fields: {
  	status: string; branch: string | null; prUrl: string | null;
  	specId: string | null; headSha: string | null; exitCode: number; note: string | null;
  }): string | null {
  	const before = db.prepare('SELECT status FROM runs WHERE id = ?').get(id) as { status: string } | undefined;
  	if (!before) return null;
  	const res = db
  		.prepare(
  			`UPDATE runs SET status = ?, branch = COALESCE(?, branch), pr_url = ?, spec_id = COALESCE(?, spec_id),
  			 head_sha = ?, exit_code = ?, note = ?, finished_at = ?
  			 WHERE id = ? AND status NOT IN ('passed', 'failed', 'error')`
  		)
  		.run(fields.status, fields.branch, fields.prUrl, fields.specId, fields.headSha, fields.exitCode, fields.note, new Date().toISOString(), id);
  	return res.changes === 1 ? before.status : null;
  }
  ```

  `WHERE status NOT IN ('passed','failed','error')` deliberately accepts a prior status of either
  `running` **or** `canceled` — `finish()` must still be able to write a container's outcome onto a
  row the operator canceled mid-run while the container was still exiting (this is the *existing*
  `current?.status === 'canceled' ? 'canceled' : ...` precedence in `finish()`, preserved unchanged;
  see below). It only refuses a row that has already been scored once.
- `start()` calls `claimQueuedRun(run.id)` first; if `false`, `console.warn` and `return` before
  `mkdirSync`/`spawn` (nothing to clean up — the row was claimed by something else, or canceled,
  before this call). On success, `recordEvent('run', run.id, 'queued', 'running', 'system')`.
- `finish()` keeps its existing pre-read of `current.status` to compute the target `status` value
  (the canceled-precedence ternary is unchanged), then calls `claimFinishRun(id, fields)` instead of
  the raw `UPDATE`. If it returns `null`, log a warning and return — **do not** proceed to Slice 2's
  outbox enqueue or any further processing; this run was already finished by another call path. If it
  returns the prior status string, `recordEvent('run', id, prior, fields.status, 'system')`.
- `cancel()` keeps its existing guarded `UPDATE ... WHERE status IN ('queued','running')`; on
  `res.changes === 1`, read the row's prior status from the same `UPDATE`'s pre-image (a `SELECT`
  immediately before the `UPDATE`, since `better-sqlite3`'s `.run()` doesn't return old values) and
  `recordEvent('run', id, prior, 'canceled', 'system')`.
- `adoptOrphans()`'s "no container, no result.json" fallback (`queue.ts:400-403`) keeps its guarded
  `UPDATE ... WHERE status = 'running'` and adds `recordEvent('run', id, 'running', 'error', 'system',
  'runner restarted mid-run')` on success.

**DoD (Tier A — no docker/box needed):**

```bash
cd runner && npx tsc --noEmit
FACTORY_DATA=$(mktemp -d) node --import tsx --test src/events.test.ts
```

`events.test.ts` must, against a fresh temp `FACTORY_DATA` sqlite file (no docker, no `enqueue()`,
no `start()`/`finish()` call):
- insert a `runs` row with `status='queued'`, call `claimQueuedRun(id)` twice — first call `true` and
  row status becomes `running`; second call `false` (already running);
- call `claimFinishRun(id, {status:'passed', ...})` — returns `'running'` (the prior status), row now
  `passed`; call it again with the same id — returns `null` (already terminal);
- call `recordEvent('run', id, 'queued', 'running', 'system')` then query `lifecycle_events` for that
  `entity_id` — exactly one row, fields match;
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
  	last_error TEXT,
  	created_at TEXT NOT NULL,
  	updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_outbox_jobs_claim ON outbox_jobs(status, next_attempt_at, created_at, seq);
  ```

  `job_type` is deliberately a free-text column, not a SQL `CHECK`-constrained enum — see the
  postmerge-discovery-loop-spec collision note above; a future `enqueue_discovery_run` job type must
  be addable without a migration. `id` is the idempotency key the proposal's DoD asks for: `INSERT OR
  IGNORE` on this primary key means re-running the enqueue step (e.g. a hypothetical future
  double-call) can never create a duplicate job for the same `(job_type, run_id)` pair.
- `queue.ts`: replace the bare `void postFinish(id).catch(...)` at the end of `finish()` with a
  single `db.transaction()` that does the status write (Slice 1's `claimFinishRun`, inlined into the
  transaction body — `better-sqlite3` transactions wrap plain synchronous statement calls, not a
  separate connection) **and** the outbox inserts as one atomic commit:

  ```ts
  const finishAndEnqueue = db.transaction((id: string, fields: FinishFields) => {
  	const prior = claimFinishRunInner(id, fields); // same SQL as Slice 1's claimFinishRun, no re-wrapping in its own transaction
  	if (prior === null) return null;
  	recordEventInner('run', id, prior, fields.status, 'system');
  	const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as Run;
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
  disambiguates ordering when both `husk_close` and `auto_fix` are inserted for the same run in the
  same transaction (identical `created_at` timestamp): the claim query in Slice 3 orders by
  `(created_at, seq)`, so `husk_close` always drains before `auto_fix` for one run — preserving
  today's in-sequence behavior where the husk check runs before the auto-fix PR re-fetch (a PR the
  husk step just closed must be seen as closed by the auto-fix step, not raced).
- `finish()` becomes: compute `fields` as today, call `const row = finishAndEnqueue(id, fields)`; if
  `row` is truthy, call the (still-named) `pumpOutbox()` (Slice 3) to drain immediately — matching
  today's "fire it right after finishing" latency, now with the durability the transaction provides
  even if `pumpOutbox()` itself never gets to run before a crash (§3's boot reconciliation covers
  that case).
- Delete the old inline `postFinish()` function body — its three `if` blocks move to Slice 3's job
  handlers unchanged in logic, decomposed by job type.

**DoD (Tier A):**

```bash
cd runner && npx tsc --noEmit
FACTORY_DATA=$(mktemp -d) node --import tsx --test src/queue.test.ts
```

New assertions in `queue.test.ts` (still no `enqueue()`/`start()`/docker — insert rows directly and
call the exported transaction function):
- a `dev`-kind row transitioned to `failed` with a non-null `pr_url` and `branch` yields exactly two
  `outbox_jobs` rows (`husk_close:<id>` seq 1, `auto_fix:<id>` seq 2), both `status='pending'`;
- a `spec`-kind row transitioned to `passed` with a `spec_id` yields exactly one
  `spec_promote:<id>` row;
- calling the transaction function a second time for the same already-terminal row inserts **zero**
  additional rows (idempotent no-op, both via `claimFinishRun`'s terminal guard returning `null` and
  via `INSERT OR IGNORE` as a second line of defense);
- a `dev`-kind row transitioned to `passed` (no failure) yields zero `outbox_jobs` rows.

### Slice 3 — drain worker + idempotent job handlers + boot reconciliation (6-8h, tag `logic`)

**Files:** `runner/src/queue.ts`, `runner/src/index.ts`.

- `queue.ts`: claim/drain loop, reusing the `monitor_events` atomic-reservation idiom (cited in
  operator memory above) for the claim itself:

  ```ts
  const OUTBOX_BACKOFF_S = [60, 300, 900, 1800, 3600]; // 1m,5m,15m,30m,60m
  const OUTBOX_MAX_ATTEMPTS = 5;
  let outboxDraining = false;

  export function pumpOutbox() {
  	if (outboxDraining) return;
  	outboxDraining = true;
  	void drainOutbox().finally(() => { outboxDraining = false; });
  }

  function claimNextOutboxJob(): OutboxJob | undefined {
  	const now = new Date().toISOString();
  	const row = db
  		.prepare("SELECT * FROM outbox_jobs WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY created_at, seq LIMIT 1")
  		.get(now) as OutboxJob | undefined;
  	if (!row) return undefined;
  	const res = db.prepare("UPDATE outbox_jobs SET status = 'processing', updated_at = ? WHERE id = ? AND status = 'pending'").run(now, row.id);
  	return res.changes === 1 ? row : claimNextOutboxJob(); // lost the claim race; try the next one
  }

  async function drainOutbox() {
  	for (;;) {
  		const job = claimNextOutboxJob();
  		if (!job) return;
  		try {
  			await runOutboxJob(job); // husk_close | auto_fix | spec_promote | unknown-type no-op
  			db.prepare("UPDATE outbox_jobs SET status = 'done', updated_at = ? WHERE id = ?").run(new Date().toISOString(), job.id);
  		} catch (e) {
  			const attempts = job.attempts + 1;
  			const now = new Date().toISOString();
  			if (attempts >= OUTBOX_MAX_ATTEMPTS) {
  				db.prepare("UPDATE outbox_jobs SET status = 'dead', attempts = ?, last_error = ?, updated_at = ? WHERE id = ?")
  					.run(attempts, String(e).slice(0, 500), now, job.id);
  				await fetch(`http://127.0.0.1:${process.env.PORT ?? 3210}/hooks/monitor`, {
  					method: 'POST',
  					headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.FACTORY_SECRET ?? ''}` },
  					body: JSON.stringify({
  						source: 'outbox', title: `outbox job dead: ${job.job_type} for run ${job.run_id}`,
  						fingerprint: `outbox-dead-${job.id}`, detail: String(e).slice(0, 2000)
  					})
  				}).catch(() => undefined);
  			} else {
  				const delay = OUTBOX_BACKOFF_S[attempts - 1] ?? 3600;
  				db.prepare("UPDATE outbox_jobs SET status = 'pending', attempts = ?, last_error = ?, next_attempt_at = ?, updated_at = ? WHERE id = ?")
  					.run(attempts, String(e).slice(0, 500), new Date(Date.now() + delay * 1000).toISOString(), now, job.id);
  			}
  		}
  	}
  }
  ```

- Job handlers, each taking a `run_id`, re-fetching the row fresh (mirrors today's `postFinish()`
  pattern of reading the row inside the handler rather than trusting a stale closure):
  - `runHuskClose(runId)`: fetch the run; if no `pr_url`, return (nothing to do — the row may have
    changed since enqueue, though nothing currently un-sets `pr_url`). `GET` the PR; **if
    `pr.state === 'closed'`, return — already done, idempotent no-op** (this is the retry-safety
    check the current inline code doesn't need but a retried job does). Otherwise `GET` the file
    count; if non-zero, return (not actually a husk — was true at enqueue time, may have gained
    commits since, e.g. a manual push). If zero, POST the comment then PATCH closed — same two calls
    as today.
  - `runAutoFix(runId)`: fetch the run; **if a row with `requeue_of = runId` already exists, return
    — already handled by a previous attempt of this job (or a manual requeue)**, reusing the existing
    `requeue_of` column and its established idempotency meaning rather than inventing a second
    marker. Otherwise: fetch the PR, check it's open+unmerged+no active run on the branch (unchanged
    from today), compute `attempts` from the terminal-run count on the branch (unchanged), and either
    file the `autofix-<branch>` monitor event or `INSERT` the escalated fix run with `requeue_of =
    runId` — identical body to today's inline code.
  - `runSpecPromote(runId)`: fetch the run for its `spec_id`, call the existing `queueDevForSpec()`
    unchanged — it is already idempotent (§1), this handler is a thin durable trigger for it.
- `index.ts`: right after `adoptOrphans()`, add boot-time reclaim of any job a prior process crashed
  mid-execution on (status stuck `processing` forever otherwise):

  ```ts
  db.prepare("UPDATE outbox_jobs SET status = 'pending', updated_at = ? WHERE status = 'processing'").run(new Date().toISOString());
  pumpOutbox();
  setInterval(pumpOutbox, 5 * 60_000).unref(); // catches backoff'd retries; claim query is idempotent so frequent calls are free when the queue is empty
  ```

**DoD (Tier A — fixture-driven, no docker/box, mocked `fetch`):**

```bash
cd runner && npx tsc --noEmit
FACTORY_DATA=$(mktemp -d) node --import tsx --test src/queue.test.ts
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
  `attempts=4` before the 5th drain), ends `status='dead'`, and the stub records exactly one
  `/hooks/monitor` POST with `fingerprint` starting `outbox-dead-`;
- a job left `status='processing'` before the boot-reclaim statement runs, then reclaimed, is
  drainable again (simulates a crash mid-job).

### Slice 4 — explicit lifecycle source→target edges (3-5h, tag `logic`)

**Files:** `runner/src/lifecycle.ts`, `runner/src/lifecycle.test.ts`, `README.md`.

- Add, alongside `TRANSITIONS`:

  ```ts
  // Terminal states are sinks: once a proposal/spec reaches one of these via
  // THIS tool, no further transition() call may move it — reviving a closed/
  // retired/superseded/done item is a deliberate re-authoring act (edit the
  // file directly, or file a fresh proposal), never a silent status flip.
  // Non-terminal legacy values (shipped, implementing, parked, unknown, and
  // this kind's own draft/review/approved/in-spec) are left exactly as
  // permissive as today — a full state machine for every historical status
  // string is not attempted here (see spec §5 out-of-scope).
  const TERMINAL: Record<string, Set<string>> = {
  	proposal: new Set(['rejected', 'retired', 'closed']),
  	spec: new Set(['retired', 'superseded', 'done'])
  };
  ```

- In `transition()`, after fetching `file`/decoding `body` (existing code, ~line 59) and before the
  PUT, extract the current status from the same body via the existing `parseFrontmatter()` helper
  (`github.ts`, already imported project-wide — add the import to `lifecycle.ts`, which currently
  parses `status:`/`updated:` with ad-hoc regexes instead of this shared parser) and refuse if it's
  terminal:

  ```ts
  const currentStatus = parseFrontmatter(body).status;
  if (typeof currentStatus === 'string' && TERMINAL[kind]?.has(currentStatus)) {
  	return { ok: false, status: 409, error: `${kind} ${id} is already terminal (${currentStatus}) — this tool cannot revive it` };
  }
  ```

  This runs against the exact snapshot the PUT's `sha:` guard also covers — no extra GitHub call, no
  new race window.
- On a successful PUT (existing `if (!put?.commit?.sha) return ...` guard already present), call
  Slice 1's `recordEvent('proposal'|'spec', id, currentStatus, status, by, cleanReason ||
  undefined)` — this is the "lifecycle" half of the append-only event log the proposal's DoD asks for,
  independent of the GitHub commit message that was already the only audit trail.
- `README.md`: short paragraph documenting `outbox_jobs`/`lifecycle_events` for operator debugging —
  e.g. `sqlite3 /data/factory.db "SELECT * FROM outbox_jobs WHERE status != 'done'"` to see stuck
  side effects, and `"SELECT * FROM lifecycle_events WHERE entity_id = '<id>' ORDER BY created_at"`
  to see a run's or a proposal/spec's full history — mirroring the existing scoped-credential doc
  comment style already in `index.ts`.

**DoD (Tier A):**

```bash
cd runner && npx tsc --noEmit
FACTORY_DATA=$(mktemp -d) node --import tsx --test src/lifecycle.test.ts
```

Using a stubbed `gh()` (no real GitHub calls — same technique the existing code's testability
requires regardless of this spec):
- a proposal file stubbed with `status: closed` in its frontmatter: `transition('proposal', id,
  'approved', ..., 'test')` returns `{ ok: false, status: 409 }`; the stub records **zero** PUT calls
  (refused before the write, not after);
- a proposal file stubbed with `status: draft`: `transition('proposal', id, 'approved', undefined,
  'auto-triage')` returns `{ ok: true }` — unchanged from today, proves `promoteSweep`'s call shape
  still works;
- a spec file stubbed with `status: done`: `transition('spec', id, 'retired', 'superseded by X...',
  'test')` returns `{ ok: false, status: 409 }` (terminal states refuse **every** target, not just
  `approved`);
- after a successful stubbed transition, `lifecycle_events` has exactly one new row with
  `entity_type='spec'`, matching `from_status`/`to_status`.

## 5. Cross-project impact and ordering

No AGENTS.md cross-project impact-zone row matches: no gateway protocol, channel extension, hub/site
DB or auth, agent definition, UI, or Paperclip adapter changes. Blast radius is entirely internal to
the standalone factory runner process; no `.env`, `deploy.sh`, `setup.sh`, or `docker-compose.yml`
change, so this ships via the box's existing self-update git-pull-and-restart tick with no operator
action required (per `/memory/MINION/minion-factory-agent-pipeline.md`'s "box is now SELF-UPDATING").

| Surface | Impact / ordering |
|---|---|
| Slices 1→2→3 | Strict order: Slice 3's job handlers assume Slice 2's `outbox_jobs` rows exist with the exact `job_type`/`seq` values Slice 2 inserts; Slice 2's transaction assumes Slice 1's `claimFinishRun` semantics. Slice 4 is independent of 1-3 (different function, `transition()` vs. `finish()`) and may land before or after them. |
| `workitem-handoff-schema-spec` (approved, unbuilt) | Shares `queue.ts` (Slice 3's `spec_promote` handler calls `queueDevForSpec()`, which that spec's Slice 3 will change internally) and `lifecycle.ts` (Slice 5 there vs. Slice 4 here — disjoint functions, see collision notes above). Land in either order; neither reverts the other. |
| `deterministic-unstick-spec` (approved, unbuilt) | Shares `index.ts` (its auth-middleware edit vs. this spec's boot-sequence `pumpOutbox()` call) — disjoint regions. Its facilitator container also calls `/hooks/monitor` with the `FACTORY_UNSTICK_SECRET`; this spec's `outbox-dead-*` monitor call always uses the admin `FACTORY_SECRET` (it runs in-process, not in a container), so no credential overlap. |
| `postmerge-discovery-loop-spec` (**draft, unapproved**) | Its own text defers absorbing its "enqueue discovery run" step into this spec's outbox as a documented follow-up once this lands. **Not built here** — that spec's `webhook.ts`/`discovery.ts` don't exist yet; `outbox_jobs.job_type` is left as free text specifically so that follow-up doesn't need a migration when it happens. |
| `orchestration-tests-spec` (approved, unbuilt) | This spec's `*.test.ts` files use the exact `node --import tsx --test` invocation that spec establishes as `npm test`, so they're covered by its CI workflow automatically once both have landed, in either order. |

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
- A full hand-authored state machine covering every historical status value
  (`shipped`/`implementing`/`parked`/`unknown`/etc.) — §2/§4's `TERMINAL`-sink model closes the
  concrete hole the proposal describes (reviving a closed/done item) without claiming to model every
  legal business transition for values this tool doesn't currently touch.
- Absorbing the postmerge-discovery-loop spec's future "enqueue discovery run" step into the outbox
  — that spec is unapproved and its source files don't exist; `job_type` is left extensible for when
  it does (§5).
- Byte-exact transactionality across two separate GitHub API calls within one job (e.g. `husk_close`'s
  comment-POST-then-PATCH-close): GitHub has no multi-call transaction primitive. The idempotency
  check (§ Slice 3: skip entirely if the PR is already closed) bounds the damage of a crash between
  the two calls to "one duplicate comment on the eventual successful retry," not a lost or repeated
  PR-close — a known, stated limitation, not a silent gap.
- Retrofitting `lifecycle_events` history for runs/proposals/specs that transitioned **before** this
  spec ships — the log starts recording from deploy time forward, matching every other append-only
  log in this codebase (e.g. `monitor_events`, GitHub commit history itself).

## 7. End-to-end acceptance

From a clean clone of the merge commit, no docker/box needed for any of this (pure logic + sqlite):

```bash
cd runner && npm ci && npx tsc --noEmit
node --import tsx --test src/events.test.ts src/queue.test.ts src/lifecycle.test.ts
# or, once orchestration-tests-spec's package.json script exists: npm test
grep -rn "DELETE FROM lifecycle_events\|UPDATE lifecycle_events" src   # expect: no matches
```

Then, in order:

1. Slice 1's tests confirm `claimQueuedRun`/`claimFinishRun` are true CAS guards (second call on an
   already-transitioned row is a no-op) and `recordEvent` appends exactly one row per call.
2. Slice 2's tests confirm `finish()`'s status write and its outbox enqueue commit as one atomic
   `db.transaction()` — a terminal run always has exactly the right `outbox_jobs` rows for its
   `(kind, status, pr_url, branch, spec_id)` combination, and re-running the same transaction on an
   already-terminal row inserts nothing new.
3. Slice 3's tests confirm every job type is retry-safe (re-draining a `done`-equivalent state makes
   no duplicate GitHub calls), dies to a monitor event after 5 attempts, and a job artificially stuck
   `processing` is reclaimed by the boot-time statement and drains normally afterward.
4. Slice 4's tests confirm a terminal-status proposal/spec refuses **every** transition target (not
   just re-approval) with `409`, a non-terminal one behaves exactly as before, and a successful
   transition appends one `lifecycle_events` row.
5. Diff review confirms the proposal's four DoD clauses each map to a concrete, tested mechanism:
   retryable idempotent-keyed jobs (Slice 2-3) drained by a restart-surviving worker (Slice 3's boot
   reclaim + interval) · explicit source→target table (Slice 4's `TERMINAL` check) · append-only
   event log (Slice 1/2/4's `lifecycle_events`, grep-verified no mutation) · CAS guards on status
   flips (Slice 1's `WHERE status = ...`/`WHERE status NOT IN (...)` guards plus Slice 2's outbox
   `INSERT OR IGNORE` idempotency keys and Slice 3's `WHERE status = 'pending'` claim).

Only then does a runner restart at any point in a run's lifecycle — mid-container, mid-`postFinish`,
mid-outbox-job — lose zero husk cleanups, zero auto-fix escalations, and zero spec→dev promotions,
closing the exact defect `queue.ts:193`'s fire-and-forget call represented.
