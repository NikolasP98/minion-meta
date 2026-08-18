---
id: 2026-08-18-factory-orchestration-tests-spec
title: "First-party vitest suite for the runner — finish() classification, automerge eligibility, lifecycle transitions, requeue lineage, promoteSweep gating"
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-factory-orchestration-tests
verdict: pending
repos: [minion-factory]
tags: [test]
type: infra
---

# First-party vitest suite for the runner

**Owner surface:** `minion-factory` (`NikolasP98/minion-factory`, private, default branch `main`) —
`runner/src/queue.ts`, `runner/src/automerge.ts`, `runner/src/lifecycle.ts`, `runner/src/index.ts`,
new `runner/src/requeue.ts`, `runner/package.json`, a new `.github/workflows/ci.yml`, and a short
`README.md` note. No other repo has a file in this spec.

**Design ancestors:**
[`2026-08-12-minion-factory-agent-pipeline-spec`](2026-08-12-minion-factory-agent-pipeline-spec.md) —
defines the runner architecture this spec adds tests to (queue, lifecycle, auto-merge sweep) without
changing any of it functionally.
[`2026-08-18-factory-release-rollback-spec`](2026-08-18-factory-release-rollback-spec.md) (draft,
same day) — its S1 CI gate reads `gh run list` for `minion-factory`'s `main` branch and explicitly
notes (⚠️A1) that the gate is **inert** because the repo has zero `.github/workflows`; this spec's
Slice 5 is what removes that inertness — no code in either spec needs to change for the other to work,
but the release-rollback spec should not be treated as "done" for its CI-gate promise until this
spec's Slice 5 has actually shipped a workflow.
[`2026-08-18-factory-workitem-handoff-schema-spec`](2026-08-18-factory-workitem-handoff-schema-spec.md)
(pass 2, **approved**) — its Slice 1 edits the exact same two INSERT statements this spec's Slice 4
extracts (`runner/src/queue.ts`'s auto-fix requeue insert in `postFinish()`, and `POST
/runs/:id/requeue` in `runner/src/index.ts`) to add a `spec_sha` column, and its Slice 5 unifies
`lifecycle.ts`'s and `automerge.ts`'s two different `HIGH_STAKES` sets into one shared
`classifyRisk()` helper — the exact inconsistency this spec's Slice 3 tests document (not fix) as
current behavior. See §2's ordering note and §4's collision table entry.
[`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b — the
`test` tag's own row ("dev loop gains: —, gate additions: mutation spot-check: invert the subject
logic, the new test must fail") is **Slice 9 of that spec, not yet built**. This spec does not add a
mutation-testing gate; it is the ordinary `test`-tagged work that a future Slice 9 would apply its own
gate to, not a vehicle for building that gate itself.

**Gate conventions:** this spec's own slices are tagged `test` (matches the proposal) with one
exception — Slice 5 (CI workflow + `repos.ts` `selfTest` edit) is `infra`, since it touches
`.github/workflows/` and the fleet's launch-allowlist config, not test code itself. No `.svelte`
files anywhere in this repo — no UI-governance checks apply.

---

## 0. Problem

From the approved proposal `2026-08-17-factory-orchestration-tests`, verbatim:

> ## The factory has no test suite
>
> Audit 2026-08-17 priority #4. The runner orchestrates merges and credentials
> with zero first-party CI: queue recovery (adoptOrphans), finish() result
> classification, lifecycle transition guards, auto-merge eligibility (head-SHA
> binding, check requirements, tag policy), stage normalization and provider
> tier resolution are all untested.
>
> **Definition of done:** vitest (or node:test) suite covering: finish() status
> matrix (exit/testExit combinations incl. canceled), automerge eligibility
> table (zero checks, pending checks, bad conclusion, sha mismatch, high-stakes
> tags, contradictory tags), lifecycle TRANSITIONS incl. reason requirements and
> whitespace collapsing, requeue lineage (requeue_of, branch COALESCE), and
> promoteSweep eligibility (untagged fails closed, security/data excluded).
> Wired into a CI workflow on minion-factory main.
>
> **Out of scope:** end-to-end container tests — pure-function and sqlite-level
> coverage only.

The problem statement's own audit language mentions three additional untested areas —
`adoptOrphans` queue recovery, stage normalization (`runner/src/index.ts:normalizeStages`), and
provider tier resolution (`runner/src/providers.ts:resolveTier`/`partnerOf`) — that the proposal's
**Definition of done does not list**. This spec follows the narrower, explicit DoD; §5 calls out the
three omitted areas as deliberate, named out-of-scope so the gap is visible rather than silently
dropped.

## 1. What the repo actually says today

`minion-factory` is **not checked out in this workspace** (meta-repo `.gitignore` excludes
subprojects, and it is not one of the seven subprojects in AGENTS.md's Project Map at all). Every
excerpt below was read via `gh api repos/NikolasP98/minion-factory/contents/<path>` during spec
authoring; `pushed_at` at that moment was `2026-08-18T02:23:11Z` on `main`. `gh api
repos/NikolasP98/minion-factory/contents/.github` returns 404 — **zero workflows exist today**,
confirmed independently by the release-rollback spec's own recon. **Re-read every file before
editing — this is Slice 0 below.**

`runner/package.json` today has no `test` script and no test-framework devDependency:

```json
"scripts": { "start": "tsx src/index.ts", "typecheck": "tsc --noEmit" },
"devDependencies": { "@types/better-sqlite3": "...", "@types/express": "...", "@types/node": "...", "typescript": "^5.8.0" }
```

`runner/tsconfig.json`: `target: ES2022, module: NodeNext, moduleResolution: NodeNext, strict: true,
include: ["src"]` — plain ESM/NodeNext, no build step (`tsx` runs source directly).

`runner/src/queue.ts`'s `finish()` (private, not exported), the target of the "finish() status
matrix" DoD bullet:

```ts
function finish(id: string, exitCode: number, outDir: string) {
	const current = db.prepare('SELECT status FROM runs WHERE id = ?').get(id) as { status: string } | undefined;
	let result: { branch?: string; prUrl?: string; testExit?: number; note?: string; specId?: string } = {};
	try { if (existsSync(`${outDir}/result.json`)) result = JSON.parse(readFileSync(`${outDir}/result.json`, 'utf8')); }
	catch { /* corrupt result file: fall through to exit-code status */ }
	const status =
		current?.status === 'canceled' ? 'canceled'
		: exitCode === 0 && result.testExit === 0 ? 'passed'
		: exitCode === 0 ? 'failed'
		: 'error';
	db.prepare(
		'UPDATE runs SET status = ?, branch = COALESCE(?, branch), pr_url = ?, spec_id = COALESCE(?, spec_id), exit_code = ?, note = ?, finished_at = ? WHERE id = ?'
	).run(status, result.branch ?? null, result.prUrl ?? null, result.specId ?? null, exitCode, result.note ?? null, new Date().toISOString(), id);
	void postFinish(id).catch((e) => console.warn(`[runner] postFinish ${id}: ${String(e)}`));
}
```

`postFinish()`'s auto-fix requeue insert (queue.ts, the "requeue lineage" DoD bullet's other half):

```ts
db.prepare(
	'INSERT INTO runs (id, repo_id, task, title, max_turns, stages, kind, spec_id, branch, requeue_of, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
).run(nid, run.repo_id, /* task */, /* title */, escalated ? 100 : 70, /* stages json */, 'dev', run.spec_id, run.branch, run.id, new Date().toISOString());
```

`runner/src/index.ts`'s `POST /runs/:id/requeue` route (the manual-requeue half of the same lineage):

```ts
app.post('/runs/:id/requeue', (req, res) => {
	const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(req.params.id) as Run | undefined;
	if (!run) return void res.status(404).json({ error: 'not found' });
	if (run.status !== 'error' && run.status !== 'canceled') {
		return void res.status(409).json({ error: `status is ${run.status}, only error/canceled requeue` });
	}
	const existing = db.prepare('SELECT id FROM runs WHERE requeue_of = ? OR note = ?').get(run.id, `requeue of ${run.id}`) as { id: string } | undefined;
	if (existing) return void res.status(409).json({ error: `already requeued as ${existing.id}` });
	const id = randomBytes(4).toString('hex');
	/* ...copy spec.md, copy branch... */
	db.prepare(
		'INSERT INTO runs (id, repo_id, task, title, max_turns, stages, kind, spec_id, proposal_id, branch, requeue_of, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
	).run(id, run.repo_id, run.task, run.title, run.max_turns, run.stages, run.kind, run.spec_id, run.proposal_id, run.branch, run.id, `requeue of ${run.id}`, new Date().toISOString());
	enqueue();
	res.status(201).json({ id });
});
```

Critically, **`index.ts` has no exports and runs side effects at module load**
(`adoptOrphans(); startAutoMergeSweep(); startLifecycleSweep(); ...; app.listen(PORT, ...)` all
execute the instant the file is imported) — it cannot be imported from a test file without starting
the real server, spawning `docker`, and binding a port. Its testable logic must move to a module that
has no load-time side effects (§2).

`runner/src/automerge.ts`'s `sweep()`, the target of the "automerge eligibility table" DoD bullet:

```ts
const ALLOWED_TAGS = new Set(['docs', 'test', 'deps']);
const HIGH_STAKES = new Set(['security', 'data', 'infra', 'auth', 'perms', 'permissions', 'migration', 'migrations', 'billing']);
const BAD = new Set(['failure', 'cancelled', 'timed_out', 'action_required']);
// ...inside the per-run loop:
const lowStakes = tagList.length > 0 && tagList.every((t) => ALLOWED_TAGS.has(t));
const highStakes = tagList.some((t) => HIGH_STAKES.has(t));
let doublePassed = false;
if (!lowStakes && !highStakes && run.branch) { /* last-two-runs-on-branch both 'passed' */ }
if (lowStakes && highStakes) continue; // contradictory tagging: fail closed
if (!lowStakes && !doublePassed) continue;
const pr = await gh(`/repos/${ref.slug}/pulls/${ref.number}`);
if (!pr || pr.state !== 'open' || pr.draft || pr.merged) continue;
if (!run.head_sha || run.head_sha !== pr.head.sha) continue;
const checks = await gh(`/repos/${ref.slug}/commits/${pr.head.sha}/check-runs?per_page=100`);
const checkRuns = (checks?.check_runs ?? []) as Array<{ status: string; conclusion: string | null }>;
if (checkRuns.length === 0) continue;
if (checkRuns.some((c) => c.status !== 'completed')) continue;
if (checkRuns.some((c) => c.conclusion != null && BAD.has(c.conclusion))) continue;
if (!checkRuns.some((c) => c.conclusion === 'success')) continue;
/* ...comment + PUT merge... */
```

Note **`ALLOWED_TAGS` and `HIGH_STAKES` are disjoint sets** — no tag list can make `lowStakes` and
`highStakes` both `true` under today's real tag vocabulary, so the `if (lowStakes && highStakes)
continue;` branch is currently unreachable via real spec tags. It is still real, committed code that
the proposal's DoD explicitly asks to cover ("contradictory tags") — §2 explains how the extracted
pure function is tested directly with a synthetic flag combination that bypasses tag derivation,
proving the guard itself is correct even though the current tag taxonomy can never trigger it.

`runner/src/lifecycle.ts`'s `transition()` prefix (before any network call) and `promoteSweep()`'s
auto-approve filter, the two "lifecycle TRANSITIONS" and "promoteSweep eligibility" DoD bullets:

```ts
const TRANSITIONS: Record<string, { allowed: Set<string>; needsReason: Set<string> }> = {
	proposal: { allowed: new Set(['approved', 'rejected', 'retired', 'closed']), needsReason: new Set(['rejected', 'retired', 'closed']) },
	spec: { allowed: new Set(['approved', 'retired', 'superseded', 'done']), needsReason: new Set(['retired', 'superseded']) }
};
// inside transition(kind, id, status, reason, by):
const rules = TRANSITIONS[kind];
if (!rules) return { ok: false, status: 400, error: 'kind must be proposal|spec' };
if (!rules.allowed.has(status)) return { ok: false, status: 400, error: `status must be one of: ${[...rules.allowed].join(', ')}` };
const cleanReason = (reason ?? '').replace(/\s+/g, ' ').trim();
if (rules.needsReason.has(status) && cleanReason.length < 20) return { ok: false, status: 422, error: `'${status}' requires a justification of at least 20 characters` };
if (!/^[\w.-]{1,120}$/.test(id)) return { ok: false, status: 400, error: 'bad id' };
// ...network calls follow, using cleanReason...
```

```ts
// inside promoteSweep()'s auto-approve loop:
const HIGH_STAKES = new Set(['security', 'data']); // NOTE: narrower than automerge.ts's HIGH_STAKES
for (const p of proposals) {
	if (approved >= 3) break;
	if (p.status !== 'draft' || !p.source || p.duplicate_candidate || p.possibly_reopens) continue;
	if (!p.tags?.length || p.tags.some((t) => HIGH_STAKES.has(t))) continue;
	const res = await transition('proposal', p.id, 'approved', undefined, 'auto-triage');
	/* ... */
}
```

`runner/src/db.ts` opens `${FACTORY_DATA ?? '/data'}/factory.db` (WAL mode) **at module import
time**, running an additive `ALTER TABLE` migration block followed by `CREATE TABLE IF NOT EXISTS`
for a fresh install, both also at import time. `FACTORY_DATA` is the only lever to point the runner
at a throwaway database — there is no dependency-injected `Database` handle anywhere in the runner.

`runner/src/repos.ts`'s `minion-factory` entry, quoted in full because Slice 5 edits it:

```ts
'minion-factory': {
	id: 'minion-factory',
	slug: 'NikolasP98/minion-factory',
	base: 'main',
	setup: 'cd runner && npm install',
	selfTest: 'cd runner && npx tsc --noEmit -p tsconfig.json && cd .. && bash -n agent/run.sh agent/spec.sh agent/reconcile.sh agent/chat.sh',
	playbook: 'minion-factory.md'
}
```

The comment above it in the source (`// build-only+: no test suite exists yet; typecheck + shell
syntax are the honest gates`) becomes false the moment this spec's Slice 1 ships — Slice 5 updates
both the comment and the `selfTest` string.

`agent/Dockerfile` builds `FROM node:22-bookworm-slim` — Node 22 is the container's runtime, and
therefore the version the new CI workflow should also pin.

## 1b. Slice 0 — recon (≤ 20 min, prepend to Slice 1, not counted as a slice)

```bash
gh api repos/NikolasP98/minion-factory/contents/runner/package.json --jq '.content' | base64 -d
gh api repos/NikolasP98/minion-factory/contents/.github 2>&1 | grep -q 'Not Found' && echo "confirmed: still no .github/"
gh api repos/NikolasP98/minion-factory/commits?path=runner/src&per_page=1 --jq '.[0].sha'   # confirm no newer commit touched runner/src since this spec was written
```

If `runner/src` has moved since the spec was authored, re-read the four files above before starting
Slice 1 — line-level quotes in this spec are a snapshot, not a live source of truth.

---

## 2. Design decision — extract pure/DB-only functions, never mock Docker or GitHub

The proposal's own out-of-scope line is the mechanism, not a caveat: *"end-to-end container tests —
pure-function and sqlite-level coverage only."* Every function this spec must cover
(`finish`/`postFinish`, `sweep`, `transition`/`promoteSweep`, the `/runs/:id/requeue` route) mixes
decision logic with `fs`, `docker` spawns, or GitHub network calls in the same function body. The only
way to get pure-function/sqlite-level coverage without a mocking framework (none is a devDependency
today, and adding one is a bigger footprint than this proposal's scope) is to **extract the decision
logic into small, exported, side-effect-free (or DB-only) functions**, and make the existing
functions thin callers of them. This is a behavior-preserving refactor — every extracted function's
body is copied verbatim from its call site, not rewritten, so the DoD for each slice includes a
"same logic, no behavior change" review note rather than asking the implementer to reprove the
original design.

New exported symbols, one row per slice:

| Slice | File | New export | Kind |
|---|---|---|---|
| 1 | `runner/src/queue.ts` | `classifyRunStatus(currentStatus, exitCode, testExit)` | pure |
| 2 | `runner/src/automerge.ts` | `classifyStakes(tagList)` | pure |
| 2 | `runner/src/automerge.ts` | `evaluateAutoMergeGate({lowStakes, highStakes, doublePassed})` | pure |
| 2 | `runner/src/automerge.ts` | `evaluateAutoMergeChecks({headSha, prHeadSha, prState, prDraft, prMerged, checkRuns})` | pure |
| 3 | `runner/src/lifecycle.ts` | `validateTransitionRequest(kind, id, status, reason)` | pure |
| 3 | `runner/src/lifecycle.ts` | `proposalAutoApproveEligible(p)` | pure |
| 4 | `runner/src/queue.ts` | `recordFinish(id, exitCode, result)` | DB read+write, no network/fs |
| 4 | `runner/src/queue.ts` | `insertAutoFixRequeue(origin, newId, task, title, maxTurns, stages)` | DB write only |
| 4 | new `runner/src/requeue.ts` | `requeueRun(id)` | DB read+write, no network/fs, no load-time side effects |

**Ordering:** Slice 4's `recordFinish` calls Slice 1's `classifyRunStatus` — Slice 4 must land after
Slice 1 (or in the same PR if the implementer prefers; they are independently shippable but not
independently orderable the other way). Slices 2 and 3 have no dependency on 1 or 4 and may ship in
any order relative to them.

**Collision with the already-approved workitem-handoff spec:** that spec's Slice 1 adds a `spec_sha`
column and threads it through the exact same auto-fix insert and `/runs/:id/requeue` insert this
spec's Slice 4 extracts into named functions. To avoid a merge fight either way:
- this spec's Slice 4 tests assert on the specific columns named in the DoD (`requeue_of`, `branch`,
  `spec_id`, plus the status/lineage query shape) via targeted `SELECT` statements, **never** `SELECT
  *` compared against a fixed column list — so a `spec_sha` column added later does not break them;
- if the workitem-handoff spec's Slice 1 lands first, Slice 4's extraction here simply carries the
  extra `spec_sha` parameter through unchanged (the function signatures in the table above gain one
  field; the tests do not need to change).

## 3. Slices

### Slice 1 — vitest harness + finish() status classification (4–6h)

**Files:** `runner/package.json`, new `runner/vitest.config.ts`, `runner/src/queue.ts`, new
`runner/src/queue.test.ts`.

- Add `"vitest": "^2.1.9"` to `devDependencies` (matches the version already pinned across every
  `@minion-stack/*` package in this meta-repo — `packages/*/package.json`) and
  `"test": "vitest run"` to `scripts`, alongside the existing `"typecheck": "tsc --noEmit"`.
- `runner/vitest.config.ts`: default Node environment, no plugins needed (plain TS/ESM, same as the
  existing `tsx`-run source) — `{ test: { environment: 'node' } }` via `defineConfig`.
- Extract, verbatim, `export function classifyRunStatus(currentStatus: Run['status'] | undefined,
  exitCode: number, testExit: number | undefined): Run['status']` from `finish()`'s ternary. `finish()`
  keeps its own DB update inline for this slice (`db.prepare(UPDATE...).run(classifyRunStatus(...),
  ...)`) — the DB-touching extraction is Slice 4, not this one, so Slice 1 ships fast and reviewably.

**Local definition of done (machine-checkable):**

```bash
cd runner && npm install
npx tsc --noEmit -p tsconfig.json
npm test                                              # vitest run — new suite green
grep -n "export function classifyRunStatus" src/queue.ts
grep -c "export function classifyRunStatus" src/queue.test.ts   # 0 — test file only imports, never redefines
```

Test matrix (table-driven, one `it.each` block):

| currentStatus | exitCode | testExit | expected |
|---|---|---|---|
| `'canceled'` | `0` | `0` | `canceled` |
| `'canceled'` | `1` | `undefined` | `canceled` (canceled short-circuits regardless of exit/testExit) |
| `undefined` | `0` | `0` | `passed` |
| `'running'` | `0` | `1` | `failed` |
| `undefined` | `0` | `undefined` | `failed` (no `result.json` / no test stage — exit 0 without a recorded test pass is `failed`, not `passed`) |
| `undefined` | `1` | `0` | `error` (nonzero exit always wins over a recorded test pass) |
| `undefined` | `-1` | `undefined` | `error` (killed by `docker kill`, e.g. wall-clock timeout — `code ?? -1` in `queue.ts`'s `proc.on('close', ...)`) |

### Slice 2 — auto-merge eligibility pure extraction + tests (5–7h)

**Files:** `runner/src/automerge.ts`, new `runner/src/automerge.test.ts`.

- Extract `export function classifyStakes(tagList: string[]): { lowStakes: boolean; highStakes:
  boolean }` — the two `tagList.every(...)`/`tagList.some(...)` lines, verbatim.
- Extract `export function evaluateAutoMergeGate(input: { lowStakes: boolean; highStakes: boolean;
  doublePassed: boolean }): { eligible: boolean; reason: string }` — the two `continue`-guarding
  `if` statements before the PR fetch, turned into early returns with a reason string
  (`'contradictory tags'` / `'not low-stakes and not double-passed'` / `'eligible'`). `sweep()` calls
  this **before** fetching the PR, preserving the original code's network-call avoidance for
  obviously-ineligible runs.
- Extract `export function evaluateAutoMergeChecks(input: { headSha: string | null; prHeadSha:
  string; prState: string; prDraft: boolean; prMerged: boolean; checkRuns: Array<{ status: string;
  conclusion: string | null }> }): { eligible: boolean; reason: string }` — everything from the PR
  state check through the check-runs logic, verbatim, each `continue` becoming an early return with a
  matching reason (`'pr not open/ready'` / `'head sha mismatch or missing'` / `'zero check runs'` /
  `'checks still running'` / `'bad conclusion present'` / `'no successful conclusion'` / `'eligible'`).
  `sweep()` calls this after fetching the PR and its check-runs, and branches on `.eligible` exactly
  where the original `continue`s were.
- `sweep()`'s post-eligibility comment text (the two different wordings for `lowStakes` vs.
  double-pass) is unchanged — it reads `lowStakes` from `classifyStakes`'s result, not from the
  eligibility functions' reason strings.

**Local definition of done (machine-checkable):**

```bash
cd runner && npx tsc --noEmit -p tsconfig.json && npm test
grep -n "export function classifyStakes\|export function evaluateAutoMergeGate\|export function evaluateAutoMergeChecks" src/automerge.ts
```

Test matrix for `evaluateAutoMergeGate` (proves the "contradictory tags" and "high-stakes tags"
DoD bullets — note `{lowStakes:true, highStakes:true}` is passed as a **synthetic literal**, not
derived from `classifyStakes`, since no real tag combination can produce it — §1 explains why, and
the test file's comment should say so):

| lowStakes | highStakes | doublePassed | eligible |
|---|---|---|---|
| `true` | `true` | any | `false` — contradictory |
| `false` | `true` | `false` | `false` — high-stakes, no double-pass |
| `false` | `false` | `false` | `false` — not low-stakes, not double-passed |
| `false` | `false` | `true` | `true` — double-pass accepted |
| `true` | `false` | `false` | `true` — low-stakes tags alone are sufficient |

Test matrix for `evaluateAutoMergeChecks` (proves "zero checks, pending checks, bad conclusion, sha
mismatch"):

| headSha | prHeadSha | prState/draft/merged | checkRuns | eligible |
|---|---|---|---|---|
| `null` | `'abc'` | open/false/false | any green | `false` — missing head_sha (legacy row) |
| `'abc'` | `'def'` | open/false/false | any green | `false` — sha mismatch (push after review) |
| `'abc'` | `'abc'` | closed/false/false | any green | `false` — PR not open |
| `'abc'` | `'abc'` | open/true/false | any green | `false` — PR draft |
| `'abc'` | `'abc'` | open/false/true | any green | `false` — PR already merged |
| `'abc'` | `'abc'` | open/false/false | `[]` | `false` — zero check runs (CI never ran, not the same as green) |
| `'abc'` | `'abc'` | open/false/false | one `status:'in_progress'` | `false` — still running |
| `'abc'` | `'abc'` | open/false/false | one each `conclusion: 'failure'/'cancelled'/'timed_out'/'action_required'` | `false` for each — `it.each` over `BAD` |
| `'abc'` | `'abc'` | open/false/false | one `conclusion:'neutral'`, no `'success'` present | `false` — no successful conclusion, even with no bad ones |
| `'abc'` | `'abc'` | open/false/false | one `'success'` + one `'neutral'`, both `completed` | `true` — at least one success, nothing bad, all completed |

### Slice 3 — lifecycle transition guard + promoteSweep eligibility pure extraction + tests (5–7h)

**Files:** `runner/src/lifecycle.ts`, new `runner/src/lifecycle.test.ts`.

- Extract `export function validateTransitionRequest(kind: string, id: string, status: string, reason:
  string | undefined): { ok: true; cleanReason: string } | { ok: false; status: number; error: string
  }` — the four checks in `transition()` before its first network call (`rules` lookup, `allowed`
  membership, `needsReason` + whitespace-collapse + 20-char length, id regex), verbatim, ending in
  `{ ok: true, cleanReason }` when all pass. `transition()` calls it first and returns its error
  tuple directly on `!ok`, otherwise destructures `cleanReason` for the rest of its body (which is
  unchanged: fetch, patch frontmatter, PUT commit, best-effort index patch).
- Extract `export function proposalAutoApproveEligible(p: { status: string; source?: string; tags?:
  string[]; duplicate_candidate?: string; possibly_reopens?: string }): boolean` — the exact filter
  condition inside `promoteSweep()`'s first loop (`p.status !== 'draft' || !p.source || ...` negated,
  plus the untagged/high-stakes tag check), verbatim. `promoteSweep()`'s loop becomes `if
  (!proposalAutoApproveEligible(p)) continue;`. The function keeps `promoteSweep()`'s own local
  `HIGH_STAKES = new Set(['security', 'data'])` — **do not** widen it to match `automerge.ts`'s
  broader set; that unification is the already-approved workitem-handoff spec's Slice 5, and this
  spec's tests exist to pin down *today's* behavior (including the inconsistency) so that a future
  refactor has a regression suite to change against, not to fix the inconsistency itself.

**Local definition of done (machine-checkable):**

```bash
cd runner && npx tsc --noEmit -p tsconfig.json && npm test
grep -n "export function validateTransitionRequest\|export function proposalAutoApproveEligible" src/lifecycle.ts
```

`validateTransitionRequest` matrix:

| kind | id | status | reason | result |
|---|---|---|---|---|
| `'widget'` | `'x'` | `'approved'` | — | `{ok:false, status:400}` — unknown kind |
| `'proposal'` | `'x'` | `'implementing'` | — | `{ok:false, status:400}` — not in `allowed` for proposal |
| `'spec'` | `'x'` | `'approved'` | — | `{ok:false, status:400}` — `approved` is a proposal status, not a spec one |
| `'proposal'` | `'x'` | `'rejected'` | `'too short'` (9 chars) | `{ok:false, status:422}` — under 20 chars |
| `'proposal'` | `'x'` | `'rejected'` | `"line one\nline two\nfield: injected"` where the raw string is ≥20 chars but the **collapsed** single-line form is under 20 real characters once repeated whitespace runs are folded to one space each — construct the fixture so raw `.length >= 20` but `replace(/\s+/g,' ').trim().length < 20` | `{ok:false, status:422}` — proves collapsing happens *before* the length check, not after (the security property the source comment describes: a newline-smuggled YAML field must not survive as "long enough") |
| `'proposal'` | `'x'` | `'rejected'` | `"reason  with\n\nrepeated   whitespace that is genuinely twenty plus characters long"` | `{ok:true, cleanReason: "reason with repeated whitespace that is genuinely twenty plus characters long"}` — single-spaced, trimmed, still passes length after collapsing |
| `'proposal'` | `'x'` | `'approved'` | `undefined` | `{ok:true, cleanReason:''}` — `approved` is not in `needsReason`, empty reason is fine |
| `'spec'` | `'a b'` | `'approved'` | — | `{ok:false, status:400}` — id fails `^[\w.-]{1,120}$` (space) |
| `'spec'` | `'x'.repeat(121)` | `'approved'` | — | `{ok:false, status:400}` — id over 120 chars |

`proposalAutoApproveEligible` matrix:

| status | source | tags | duplicate_candidate | possibly_reopens | eligible |
|---|---|---|---|---|---|
| `'draft'` | `'ci-watch'` | `['test']` | — | — | `true` |
| `'review'` | `'ci-watch'` | `['test']` | — | — | `false` — not draft |
| `'draft'` | `undefined` | `['test']` | — | — | `false` — human-authored (no `source`) |
| `'draft'` | `'ci-watch'` | `[]` | — | — | `false` — untagged is unclassified, fails closed |
| `'draft'` | `'ci-watch'` | `undefined` | — | — | `false` — same, `tags` absent entirely |
| `'draft'` | `'ci-watch'` | `['security']` | — | — | `false` — high-stakes tag |
| `'draft'` | `'ci-watch'` | `['data']` | — | — | `false` — high-stakes tag |
| `'draft'` | `'ci-watch'` | `['infra']` | — | — | `true` — **documents** that `infra` is high-stakes in `automerge.ts` but not here, today; the test's own comment cites this as the known inconsistency, not a bug this spec fixes |
| `'draft'` | `'ci-watch'` | `['test']` | `'2026-08-01-foo'` | — | `false` — duplicate flag |
| `'draft'` | `'ci-watch'` | `['test']` | — | `'2026-07-01-bar'` | `false` — reopens flag |

### Slice 4 — requeue lineage: branch/spec_id COALESCE + requeue_of, sqlite-level (6–8h)

**Files:** `runner/src/queue.ts`, new `runner/src/requeue.ts`, `runner/src/index.ts`, new
`runner/src/queue.test.ts` additions (same file as Slice 1, new `describe` block) and new
`runner/src/requeue.test.ts`.

- In `queue.ts`, extract `export function recordFinish(id: string, exitCode: number, result: {
  branch?: string; prUrl?: string; testExit?: number; note?: string; specId?: string }): Run['status']`
  — the `SELECT status` read, the call to Slice 1's `classifyRunStatus`, and the `UPDATE ...
  COALESCE(...)` write, verbatim, returning the computed status. `finish()` becomes: read
  `result.json` from `outDir` (unchanged fs logic) → `recordFinish(id, exitCode, result)` → `void
  postFinish(id)...` (unchanged).
- Also in `queue.ts`, extract `export function insertAutoFixRequeue(origin: Run, newId: string, task:
  string, title: string, maxTurns: number, stages: string): void` — the `INSERT INTO runs (...)`
  statement from `postFinish()`'s auto-fix branch, verbatim (same column list, same
  `origin.spec_id`/`origin.branch`/`origin.id` argument mapping). `postFinish()` keeps its own network
  call (`gh` for PR state), its own DB queries (active-run check, attempts count), and its own
  escalation-tier resolution (`resolveTier`) — only the final `INSERT` moves.
- New `runner/src/requeue.ts` (no load-time side effects — importable from a test file safely):
  `export function requeueRun(id: string): { ok: true; id: string } | { ok: false; status: number;
  error: string }`, containing exactly the dedupe-check-then-insert body currently inline in
  `index.ts`'s `POST /runs/:id/requeue` handler (same status codes, same error strings, same spec.md
  copy and branch-carry-over behavior). `index.ts`'s route becomes:
  ```ts
  app.post('/runs/:id/requeue', (req, res) => {
  	const result = requeueRun(req.params.id);
  	if (!result.ok) return void res.status(result.status).json({ error: result.error });
  	enqueue();
  	res.status(201).json({ id: result.id });
  });
  ```
  (moving `enqueue()` to stay in `index.ts` keeps `requeue.ts` free of the queue-pump side effect,
  matching its "DB only" classification in §2's table.)

**Test setup pattern (document this in the test files themselves, not just here):** `db.ts` opens its
sqlite file at import time using `FACTORY_DATA`. Each test file must set `process.env.FACTORY_DATA`
to a fresh `mkdtempSync(path.join(os.tmpdir(), 'factory-test-'))` directory **before** its first
(dynamic) import of `db.js`, `queue.js`, or `requeue.js` — vitest's default per-file module isolation
means this is safe across files without cross-test interference, but only if the env var is set
ahead of any static top-level import in that file (use `await import('../db.js')` inside a `beforeAll`
after the `mkdtempSync` call, not a static `import` at the top of the file).

**Local definition of done (machine-checkable):**

```bash
cd runner && npx tsc --noEmit -p tsconfig.json && npm test
grep -n "export function recordFinish\|export function insertAutoFixRequeue" src/queue.ts
grep -n "export function requeueRun" src/requeue.ts
grep -n "requeueRun(req.params.id)" src/index.ts     # route delegates, dedupe/insert logic no longer inline
grep -c "db.prepare('SELECT id FROM runs WHERE requeue_of" src/index.ts   # 0 — moved to requeue.ts
```

Test scenarios (all against a real temp sqlite db seeded via direct `INSERT`, never via HTTP or the
Express app):

1. `recordFinish`: seed a row with `branch='pre-seeded'`, `spec_id='S1'`; call with
   `result={testExit: undefined}` (no `branch`/`specId` — simulates an early clone failure before
   `result.json` carries anything useful) → returned status is `'failed'` (exit 0, no test pass
   recorded); re-`SELECT` the row and assert `branch === 'pre-seeded'` and `spec_id === 'S1'`
   **unchanged** — proves `COALESCE` preserves on `NULL`.
2. `recordFinish`: same seed; call with `result={branch:'new-branch', testExit:0}` → re-`SELECT`
   shows `branch === 'new-branch'` — proves a present value in `result` **overwrites**, `COALESCE`
   only protects the `NULL` case.
3. `recordFinish`: seed `status='canceled'`; call with `exitCode=0, result={testExit:0}` → returned
   status is `'canceled'`, not `'passed'` — the DB-level counterpart of Slice 1's pure-function case,
   proving the wiring (not just the classifier) respects it.
4. `insertAutoFixRequeue`: seed an origin row `id='orig1', branch='b1', spec_id='S2', status='failed'`;
   call `insertAutoFixRequeue(origin, 'new1', ...)` → `SELECT requeue_of, branch, spec_id FROM runs
   WHERE id='new1'` returns `requeue_of='orig1', branch='b1', spec_id='S2'`.
5. Attempts-count query sanity: after scenario 4, run the exact counting query `postFinish()` uses for
   `MAX_ATTEMPTS` (`SELECT COUNT(*) AS c FROM runs WHERE branch = 'b1' AND kind = 'dev' AND status IN
   ('failed','passed','error')`) → returns `1` (only `orig1`, which is `failed`; `new1` defaults to
   `status='queued'` on insert via the table's `DEFAULT 'queued'`, so it is correctly excluded from
   its own attempt count).
6. `requeueRun`: seed `id='orig2', status='error'`; `requeueRun('orig2')` → `{ok:true, id:<new>}`;
   re-`SELECT` the new row shows `requeue_of='orig2'`, `branch` copied from `orig2`, `note='requeue of
   orig2'`.
7. `requeueRun('orig2')` called **again** → `{ok:false, status:409, error:'already requeued as
   <id from scenario 6>'}` — dedupe via the `requeue_of OR note` match.
8. Seed `id='orig3', status='passed'`; `requeueRun('orig3')` → `{ok:false, status:409, error:'status
   is passed, only error/canceled requeue'}`.
9. `requeueRun('does-not-exist')` → `{ok:false, status:404, error:'not found'}`.

### Slice 5 — CI workflow wiring on minion-factory main (3–5h, tag `infra`)

**Files:** new `.github/workflows/ci.yml`, `runner/src/repos.ts`, `README.md`.

- New workflow, triggered on `push: branches: [main]` and `pull_request: branches: [main]`, one job
  on `ubuntu-latest` with `actions/setup-node@v4` pinned to `node-version: 22` (matches
  `agent/Dockerfile`'s `node:22-bookworm-slim`) and npm's own cache (`cache: npm`, `cache-dependency-path:
  runner/package-lock.json`):
  ```yaml
  name: CI
  on:
    push: { branches: [main] }
    pull_request: { branches: [main] }
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 22, cache: npm, cache-dependency-path: runner/package-lock.json }
        - run: cd runner && npm ci
        - run: cd runner && npx tsc --noEmit -p tsconfig.json
        - run: cd runner && npm test
        - run: bash -n agent/run.sh agent/spec.sh agent/reconcile.sh agent/chat.sh agent/unstick.sh
  ```
  (`npm ci` requires a committed `runner/package-lock.json` — Slice 1's `npm install` already
  generates/updates it; confirm it is staged, not gitignored, before this slice's PR.)
- `runner/src/repos.ts`: update the `minion-factory` entry's `selfTest` to
  `'cd runner && npx tsc --noEmit -p tsconfig.json && npm test && cd .. && bash -n agent/run.sh
  agent/spec.sh agent/reconcile.sh agent/chat.sh agent/unstick.sh'` (adds `&& npm test`, adds the
  previously-missing `agent/unstick.sh` to the syntax check for parity with the new workflow) and
  rewrite the comment above it — it no longer says "no test suite exists yet."
- `README.md`: append 2–3 lines to the `## Layout` section noting `.github/workflows/ci.yml` runs
  typecheck + vitest on every push/PR to `main`.

**Local definition of done (machine-checkable, Tier A — no Docker or live repo needed):**

```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"   # valid YAML
grep -n "npm test" .github/workflows/ci.yml
grep -n "npm test" runner/src/repos.ts
grep -n "no test suite exists yet" runner/src/repos.ts   # must be ABSENT (comment updated)
test -f runner/package-lock.json && grep -q vitest runner/package-lock.json
cd runner && npx tsc --noEmit -p tsconfig.json           # repos.ts's string-literal edit still type-checks
```

**Operator E2E (Tier B, needs `main` and Actions enabled — this is what turns the release-rollback
spec's ⚠️A1 "inert gate" into a live one):**

```bash
gh run list -R NikolasP98/minion-factory --branch main --limit 3 --json headSha,conclusion,status
# → after this slice merges to main, one completed run for the merge commit, conclusion "success"
```

## 4. Cross-repo impact

Checked against AGENTS.md's Cross-Project Impact Zones table: no row matches (no gateway protocol, no
channel extension, no hub/site DB schema, no agent-definition format, no auth, no UI, no paperclip
adapter). `minion-factory` is not one of the meta-repo's seven tracked subprojects at all — same
finding the release-rollback spec already made independently. The blast radius is the runner process
on one box plus a new GitHub Actions workflow on one private repo.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| Runtime behavior of `finish`/`sweep`/`transition`/`promoteSweep`/`POST /runs/:id/requeue` | **None intended** — every extraction is verbatim-copy, not a rewrite | Each slice's DoD asks for a behavior-preservation review note; §2 states the constraint explicitly |
| `runner`'s exported surface (`queue.ts`, `automerge.ts`, `lifecycle.ts`) | New exports (§2's table) — none are imported anywhere outside this repo (no `@minion-stack/*` package, no published artifact) | Grep confirms: `minion-factory` is a standalone Express service, never installed as a dependency |
| `minion-factory`'s Netcup deploy cadence (`self-update.sh`, every 5 min) | **None** — no runtime code path changes; the new `.github/workflows/ci.yml` only runs on GitHub's runners, not the box | The release-rollback spec's own S1 is what will eventually *consume* this workflow's results — this spec only produces them |
| `2026-08-18-factory-release-rollback-spec` (draft, unmerged) | Its ⚠️A1 "inert gate" caveat stops being accurate once this spec's Slice 5 merges | No code coupling — purely a documentation/sequencing note, called out in Design ancestors above |
| `2026-08-18-factory-workitem-handoff-schema-spec` (approved, unimplemented) | Its Slice 1 touches the same two INSERT statements this spec's Slice 4 extracts; its Slice 5 touches the same two `HIGH_STAKES` sets this spec's Slice 3 tests | §2's ordering note (column-tolerant assertions) and Slice 3's explicit "documents, does not fix" note |
| `runner/package.json` dependency footprint | +1 devDependency (`vitest@^2.1.9`), no new production dependency | Matches the version already used by every `@minion-stack/*` package in this meta-repo |

## 5. Out of scope (explicit)

- **`adoptOrphans()` queue-recovery testing.** Named in the proposal's problem statement, not in its
  Definition of done. `adoptOrphans()` spawns real `docker wait` processes and reads real container
  exit state — testing it without container mocking would violate the "no end-to-end container
  tests" constraint, and building a Docker-spawn mock is a bigger footprint than this proposal's
  scope. A follow-up proposal can pick this up once/if a mocking approach is chosen.
- **`normalizeStages()` (`runner/src/index.ts`) and provider-tier resolution
  (`resolveTier`/`partnerOf` in `runner/src/providers.ts`) testing.** Same reasoning — named in the
  problem statement's audit language, absent from the Definition of done. Both are already pure or
  near-pure functions and would be cheap to cover in a follow-up; this spec does not silently expand
  scope to include them.
- **Mutation-testing / "invert the subject logic" gate for `test`-tagged work.** That is
  `2026-08-17-sdlc-phase-gates-scoring-spec`'s unbuilt Slice 9 (§4b's `test` row) — a gate that would
  apply *to* this spec's own PRs once it exists, not something this spec builds.
- **Unifying `lifecycle.ts`'s and `automerge.ts`'s different `HIGH_STAKES` sets.** Already scoped into
  the approved workitem-handoff spec's Slice 5; this spec's tests pin down current behavior for that
  future change to diff against, deliberately not fixing the inconsistency itself.
- **`deploy.sh`, `self-update.sh`, `scripts/train.sh`, `scripts/unstick-cron.sh`.** No file in this
  spec touches any script outside `agent/*.sh`'s syntax-check list (unchanged behavior, just added to
  the CI/selfTest invocation list in Slice 5).
- **End-to-end container tests, Docker-spawn mocking, or a GitHub API mocking library** (`nock`,
  `msw`, etc.) — the proposal's own out-of-scope line, honored by the pure/DB-only extraction design
  in §2 rather than worked around with new test infrastructure.
- **Test coverage thresholds / coverage reporting.** Not requested; `vitest run` with no `--coverage`
  flag is sufficient for this proposal's DoD.

## 6. End-to-end verification

Run after all five slices land on `main`.

```bash
# 1. Full suite, from a clean clone:
git clone https://github.com/NikolasP98/minion-factory /tmp/factory-verify && cd /tmp/factory-verify
cd runner && npm ci && npx tsc --noEmit -p tsconfig.json && npm test
# → all suites green: queue.test.ts (classifyRunStatus + recordFinish/insertAutoFixRequeue),
#   automerge.test.ts, lifecycle.test.ts, requeue.test.ts

# 2. Behavior-preservation spot check — before/after diff review (manual, not automatable):
git log --oneline -- runner/src/queue.ts runner/src/automerge.ts runner/src/lifecycle.ts runner/src/index.ts
# confirm each slice's diff is an extraction (function body moved, call site now delegates) —
# no line inside an extracted function's body differs from its original inline form except
# variable renames required by the new function signature

# 3. Shell syntax + selfTest parity:
cd .. && bash -n agent/run.sh agent/spec.sh agent/reconcile.sh agent/chat.sh agent/unstick.sh
grep "selfTest" runner/src/repos.ts | grep -q "npm test"

# 4. CI is actually wired and green on main (Tier B, needs Actions enabled on the repo):
gh run list -R NikolasP98/minion-factory --branch main --limit 3 --json headSha,conclusion,status
# → most recent completed run for HEAD has conclusion "success"

# 5. Downstream consumer proof — the release-rollback spec's gate, once it ships, actually reads
#    a real signal instead of the "no CI configured" branch:
gh run list -R NikolasP98/minion-factory --branch main --limit 1 --json headSha,conclusion
# → non-empty array (contrast with §1's pre-Slice-5 baseline, which was always [])
```

**Ship gate:** step 1 green from a clean clone (not just the implementer's dev container — proves no
hidden local-state dependency); step 2's diff review confirms no behavior drift; step 4 shows a real
completed Actions run on `main`. Step 5 is the proposal's own success criterion in miniature: the
`gh run list` call that was unconditionally empty in §1's recon now returns real data.
