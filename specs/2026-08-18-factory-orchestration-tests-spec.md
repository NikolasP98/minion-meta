---
id: 2026-08-18-factory-orchestration-tests-spec
title: "First-party Node 22 test suite for runner orchestration policy and SQLite lineage"
stage: spec
status: approved
pass: 2
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-factory-orchestration-tests
verdict: approved
repos: [minion-factory]
tags: [test]
type: infra
---

# First-party tests for runner orchestration

**Owner surface:** `minion-factory` (`NikolasP98/minion-factory`, private, default branch `main`) —
`runner/src/queue.ts`, `runner/src/automerge.ts`, `runner/src/lifecycle.ts`, `runner/src/index.ts`,
new `runner/src/requeue.ts`, focused `runner/src/*.test.ts` files, `runner/package.json`,
`runner/src/repos.ts`, new `.github/workflows/ci.yml`, and a short `README.md` note. No other repo has
a file in this spec.

**Live baseline reviewed:** `minion-factory/main` commit `fc9c8ffa71` (2026-08-18T02:51:12Z).
Re-read all touched files before implementation; Slice 0 below is a drift gate, not permission to
implement the stale excerpts from pass 1.

**Design ancestors and collisions:**

- [`2026-08-12-minion-factory-agent-pipeline-spec`](2026-08-12-minion-factory-agent-pipeline-spec.md)
  defines the runner/SQLite/Node 22 architecture.
- [`2026-08-18-factory-release-rollback-spec`](2026-08-18-factory-release-rollback-spec.md) requires
  this spec's exact workflow identity, `.github/workflows/ci.yml`, before its deploy gate activates.
- [`2026-08-18-factory-workitem-handoff-schema-spec`](2026-08-18-factory-workitem-handoff-schema-spec.md)
  overlaps `queue.ts`, `lifecycle.ts`, `automerge.ts`, and both requeue inserts. Current `main` already
  carries `spec_sha`/`spec_tags` through both requeue paths. This spec preserves and tests those
  fields. If that sibling's shared `classifyRisk()` lands first, Slice 3 tests the shared policy
  through `proposalAutoApproveEligible()` rather than restoring a local high-stakes set.
- [`2026-08-17-factory-chat-restart-drops-pending-spec`](2026-08-17-factory-chat-restart-drops-pending-spec.md)
  and [`2026-08-17-factory-providers-put-harness-check-spec`](2026-08-17-factory-providers-put-harness-check-spec.md)
  are approved and independently introduce Node 22 `node:test` files plus `npm test`. The proposal
  permits "vitest (or node:test)", so this spec uses the same built-in runner instead of creating a
  redundant second framework. All sibling `*.test.ts` files must remain discoverable by the one
  `npm test` command.
- [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b
  requires a mutation spot-check for `test` work and workflow lint for `infra` work. Slice 5 is the
  only `infra` slice; its DoD includes `actionlint`.

**Operator-memory constraints:** `/memory/MINION/sdlc-board-triage-and-phase-gates.md` records that
double-PASS automerge was retired and unattended merges are restricted to explicit low-stakes tags;
the live `automerge.ts` confirms that contract. `/memory/MINION/test-suite-recon-2026-08-10.md`
records that an unexecuted CI suite is not an enforcement signal; Slice 5 therefore requires an
exact-workflow, exact-HEAD successful run rather than merely committing YAML. No semantic-memory MCP
was available in this review session; the required read-only SQLite FTS searches returned no
factory-specific observation that supersedes these two files.

---

## 0. Problem and scope

From the approved proposal `2026-08-17-factory-orchestration-tests`:

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

The proposal's problem paragraph also names `adoptOrphans`, `normalizeStages`, and provider-tier
resolution, but its explicit DoD does not. They remain named follow-ups in §5; this spec does not
silently expand to them.

Current `main` has no `test` script and no `.github/` directory. It does have a committed
`runner/package-lock.json`, Node 22 in `agent/Dockerfile`, and newer orchestration behavior that pass
1 did not account for:

- automerge has **no double-PASS path**; only non-empty tag lists made entirely of
  `docs|test|deps` are eligible;
- `security`, `data`, `infra`, `auth`, permission, migration, and billing tags keep the human gate;
- degraded review evidence (`run.note` containing `[review-degraded`) is ineligible;
- every check run must be `completed` with conclusion `success`; `neutral`, `skipped`, `stale`,
  `null`, or a mixture of success and any non-success conclusion fails closed;
- `finish()` records `head_sha`, and both requeue paths preserve `spec_sha` and `spec_tags`.

The suite must encode that live contract, not the superseded 02:23 snapshot.

## 1. Slice 0 — recon and collision gate (prepend to Slice 1)

```bash
gh api repos/NikolasP98/minion-factory/commits/main --jq '.sha'
for p in runner/package.json runner/src/queue.ts runner/src/automerge.ts \
  runner/src/lifecycle.ts runner/src/index.ts runner/src/db.ts runner/src/repos.ts; do
  gh api "repos/NikolasP98/minion-factory/contents/$p" --jq '.sha + "  " + .path'
done
gh api repos/NikolasP98/minion-factory/contents/.github 2>&1 | grep -q 'Not Found'
```

Also inspect whether either approved sibling test spec has landed. Preserve its test files and keep
one `npm test` script that runs every `runner/src/*.test.ts` file. If orchestration semantics moved
after `fc9c8ffa71`, update the characterization expectations to the new code and cite the commit in
the PR; do not reintroduce double-PASS or discard SHA/tag fields to match this document.

## 2. Test architecture

Use Node 22's built-in test runner through the already-installed `tsx` runtime dependency:

```json
"test": "node --import tsx --test src/*.test.ts"
```

No new test dependency or `vitest.config.ts` is added. Verify the exact command after `npm ci`; shell
glob expansion must discover every test file and a deliberately failing assertion must make
`npm test` exit non-zero.

Pure policy functions may remain in their current modules, but those modules import `db.ts`, which
opens SQLite at module load. Therefore **every test file importing `queue.ts`, `automerge.ts`,
`lifecycle.ts`, or `requeue.ts` must**:

1. create its own `mkdtempSync(path.join(os.tmpdir(), 'factory-test-'))` directory;
2. set `FACTORY_DATA`, `FACTORY_RUNS_DIR`, and `FACTORY_REPOS_FILE` to paths inside it;
3. only then use dynamic `await import('./module.js')`; no static import of a DB-bound subject;
4. remove the directory in an `after()` hook after closing the exported SQLite handle if needed.

Node's test runner executes test files in isolated child processes by default; do not disable that
isolation. Within one file, reuse one database and unique row ids or clear tables explicitly.

Required exports:

| Slice | File | Export | Kind |
|---|---|---|---|
| 1 | `runner/src/queue.ts` | `classifyRunStatus(currentStatus, exitCode, testExit)` | pure |
| 2 | `runner/src/automerge.ts` | `evaluateAutoMergeRun({tagList, note})` | pure |
| 2 | `runner/src/automerge.ts` | `evaluateAutoMergeChecks({...})` | pure |
| 3 | `runner/src/lifecycle.ts` | `validateTransitionRequest(kind, id, status, reason)` | pure |
| 3 | `runner/src/lifecycle.ts` | `proposalAutoApproveEligible(p)` | pure |
| 4 | `runner/src/queue.ts` | `recordFinish(id, exitCode, result)` | SQLite write |
| 4 | `runner/src/queue.ts` | `insertAutoFixRequeue(origin, ...)` | SQLite write |
| 4 | new `runner/src/requeue.ts` | `requeueRun(id)` | SQLite + temp-filesystem copy; no network/server |

The existing runtime functions must call these exports. Extraction is behavior-preserving except for
reason strings returned by pure evaluators, which are test diagnostics only.

## 3. Slices

### Slice 1 — harness + `finish()` status classification (3–5h, tag `test`)

**Files:** `runner/package.json`, `runner/src/queue.ts`, new `runner/src/queue.test.ts`.

- Add the `node --import tsx --test src/*.test.ts` script. Do not add Vitest.
- Extract `classifyRunStatus()` from the current ternary and have `finish()` call it.
- Use a table loop under `node:test`; the test imports the real exported function after the temp-env
  setup in §2 and never copies/redefines the classifier.

Required matrix:

| current status | exit | testExit | expected |
|---|---:|---:|---|
| `canceled` | 0 | 0 | `canceled` |
| `canceled` | 1 | absent | `canceled` |
| absent | 0 | 0 | `passed` |
| `running` | 0 | 1 | `failed` |
| absent | 0 | absent | `failed` |
| absent | 1 | 0 | `error` |
| absent | -1 | absent | `error` |

**DoD:**

```bash
cd runner && npm ci
npm run typecheck
npm test
grep -n 'export function classifyRunStatus' src/queue.ts
```

Mutation spot-check: in a throwaway copy, invert the `exitCode === 0 && testExit === 0` predicate;
the table must fail. Revert the temporary mutation and prove the tracked tree is unchanged.

### Slice 2 — current automerge policy extraction + tests (4–6h, tag `test`)

**Files:** `runner/src/automerge.ts`, new `runner/src/automerge.test.ts`.

- Extract `evaluateAutoMergeRun({tagList, note})` from the pre-network gates. It returns
  `{eligible, reason}` and is eligible only when tags are non-empty, every tag is in
  `docs|test|deps`, no high-stakes tag is present, and the note is not review-degraded.
- Extract `evaluateAutoMergeChecks()` from the PR/head/check gates. It preserves the live ordering
  and requires: open, non-draft, unmerged PR; non-empty matching attested head SHA; at least one
  check; and **every** check completed successfully.
- `sweep()` calls the run evaluator before any GitHub request and the checks evaluator after fetching
  the PR/check runs. Merge response handling and SHA-guarded PUT remain untouched.

Run-policy matrix:

| tags / note | expected |
|---|---|
| `[]` | false — unclassified |
| `['docs']`, `['test']`, `['deps']`, `['docs','test']` | true |
| `['logic']` | false — not in low-stakes allowlist |
| each of `security`, `data`, `infra`, `auth`, `perms`, `permissions`, `migration`, `migrations`, `billing` | false |
| `['test','security']` | false — contradictory/mixed policy fails closed |
| `['test']`, note containing `[review-degraded` | false |

Check-policy matrix:

| case | expected |
|---|---|
| missing `headSha`; mismatched `headSha`/PR head | false |
| closed, draft, or already-merged PR | false |
| zero check runs | false |
| any non-completed check | false |
| each conclusion `failure`, `cancelled`, `timed_out`, `action_required`, `neutral`, `skipped`, `stale`, or `null` | false |
| one success plus one neutral, both completed | false |
| one or several completed successes and nothing else | true |

This deliberately replaces pass 1's obsolete `doublePassed` and “one success plus neutral is green”
expectations. It is shaped by the live code and the double-PASS-retirement constraint in
`/memory/MINION/sdlc-board-triage-and-phase-gates.md`.

**DoD:** `npm run typecheck && npm test`; grep the two exports; mutation spot-check changing
`every(...)` to `some(...)` must make the neutral+success case fail.

### Slice 3 — lifecycle request guard + proposal auto-approval (4–6h, tag `test`)

**Files:** `runner/src/lifecycle.ts`, new `runner/src/lifecycle.test.ts`.

- Extract `validateTransitionRequest()` from the four pre-network checks. On success return the
  collapsed `cleanReason`; `transition()` uses it for the unchanged GitHub writes.
- Extract `proposalAutoApproveEligible()` from the proposal loop and delegate to it. Preserve the
  current source/status/duplicate/reopen/untagged/security/data behavior. If the WorkItem sibling has
  landed, preserve its stricter `source_trust === trusted-automation && risk_class === low` contract
  and test that instead; do not recreate the old local set.

Transition tests cover unknown kind, invalid status for each kind, required reason under 20
characters, valid collapsed reason, optional reason, invalid id characters, and 121-character id.
The whitespace-before-length fixture must be genuinely valid:

```ts
const raw = `x:\n${' '.repeat(25)}`; // raw length >= 20; collapsed+trimmed value is "x:" (length 2)
```

Expect 422. A second fixture with repeated spaces/newlines and at least 20 non-whitespace characters
expects `{ok:true}` and the exact single-spaced `cleanReason`.

Proposal eligibility covers draft machine-source+`['test']` true; non-draft, missing source, empty or
missing tags, `security`, `data`, duplicate, and reopen false. Do **not** pin `infra` as eligible:
that undocumented inconsistency is already owned by the approved WorkItem risk-unification slice.

**DoD:** `npm run typecheck && npm test`; grep both exports; a temporary mutation that skips
whitespace collapse must make the raw-length fixture fail.

### Slice 4 — SQLite requeue lineage and finish wiring (6–8h, tag `test`)

**Files:** `runner/src/queue.ts`, new `runner/src/requeue.ts`, `runner/src/index.ts`, additions to
`runner/src/queue.test.ts`, new `runner/src/requeue.test.ts`.

- Extract `recordFinish(id, exitCode, result)` including the current `headSha` field and update:
  status, branch `COALESCE`, PR URL, spec-id `COALESCE`, head SHA, exit code, note, and finished time.
  `finish()` retains result-file parsing and `postFinish()` dispatch.
- Extract the current auto-fix insert. It must preserve `spec_id`, `spec_sha`, `spec_tags`, branch,
  and `requeue_of`; omitting the newer snapshot fields is a regression.
- Move the manual route's validation, dedupe, `spec.md` copy, and insert to `requeueRun()`. The module
  may use SQLite and the local runs directory but has no network calls, queue pump, Express app, or
  load-time server side effect. The route calls it, calls `enqueue()` only on success, and maps the
  returned status/error unchanged.

Required SQLite/temp-filesystem cases:

1. `recordFinish` with no new branch/spec id preserves seeded values and returns `failed` for exit 0
   without a recorded test pass.
2. Present branch overwrites the seeded branch.
3. Seeded canceled status remains canceled.
4. `headSha:'abc'` writes `head_sha='abc'`; missing head SHA writes null, preserving current review
   attestation semantics rather than inventing a PR-head fallback.
5. Auto-fix requeue carries `requeue_of`, branch, `spec_id`, `spec_sha`, and `spec_tags` exactly.
6. The live attempts-count query excludes the newly queued retry.
7. Manual requeue of an error row returns success, copies lineage/branch/spec SHA/tags/note, and
   copies an existing origin `spec.md` byte-for-byte into the new run directory.
8. Repeating that requeue returns the existing-id 409; passed origin returns the current status 409;
   unknown origin returns 404.

Assertions select named columns, never compare `SELECT *` to a fixed schema.

**DoD:**

```bash
cd runner && npm run typecheck && npm test
grep -n 'export function recordFinish\|export function insertAutoFixRequeue' src/queue.ts
grep -n 'export function requeueRun' src/requeue.ts
grep -n 'requeueRun(req.params.id)' src/index.ts
test "$(grep -c "SELECT id FROM runs WHERE requeue_of" src/index.ts)" -eq 0
```

### Slice 5 — CI and self-test enforcement (3–5h, tag `infra`)

**Files:** new `.github/workflows/ci.yml`, `runner/src/repos.ts`, `README.md`.

Create workflow `CI`, triggered on pushes and PRs targeting `main`, with `ubuntu-latest`,
`actions/checkout@v4`, `actions/setup-node@v4` pinned to Node 22 and npm cache keyed by
`runner/package-lock.json`, then:

```yaml
- run: cd runner && npm ci
- run: cd runner && npm run typecheck
- run: cd runner && npm test
- run: bash -n agent/run.sh agent/spec.sh agent/reconcile.sh agent/chat.sh agent/unstick.sh
```

Update the built-in `minion-factory.selfTest` to run typecheck, `npm test`, and the same five shell
syntax checks; replace the stale “no test suite” comment. Add a short `README.md` layout/CI note.

`runner/src/repos.ts` is not always the effective production registry: `FACTORY_REPOS_FILE` (default
`/data/repos.json`) replaces built-ins wholesale. The operator DoD must check the deployed runner's
configuration. If the file is absent, record that the built-in is effective. If present, its
`minion-factory.selfTest` must also contain `npm test` and the five shell checks before claiming the
fleet self-test is wired. This is an environment-parity step, not another tracked repo file.

**Local DoD:**

```bash
actionlint .github/workflows/ci.yml
cd runner && npm ci && npm run typecheck && npm test
cd .. && bash -n agent/run.sh agent/spec.sh agent/reconcile.sh agent/chat.sh agent/unstick.sh
grep -n 'npm test' .github/workflows/ci.yml runner/src/repos.ts
! grep -q 'no test suite exists yet' runner/src/repos.ts
test -f runner/package-lock.json
```

**Operator DoD:** after merge, bind the result to the exact `main` HEAD and required workflow:

```bash
sha=$(gh api repos/NikolasP98/minion-factory/commits/main --jq '.sha')
gh run list -R NikolasP98/minion-factory --workflow ci.yml --commit "$sha" \
  --limit 20 --json attempt,headSha,status,conclusion --jq 'sort_by(.attempt) | last'
# non-null row for $sha; status=completed and conclusion=success
```

On the box, inspect `${FACTORY_REPOS_FILE:-/data/repos.json}` and prove the effective
`minion-factory.selfTest` includes `npm test`. These exact-workflow/exact-SHA checks are the handoff
contract consumed by the release-rollback spec.

## 4. Cross-project impact and ordering

No AGENTS.md cross-project impact-zone row matches: no gateway protocol, channel extension, hub/site
DB or auth, agent definition, UI, or Paperclip adapter changes. The blast radius is the standalone
factory runner and its GitHub Actions signal.

| Surface | Impact / ordering |
|---|---|
| Existing approved Node test specs | One shared `npm test`; preserve and discover all sibling tests. Whichever lands first owns the initial script, later specs append tests without replacing it. |
| WorkItem handoff | Current SHA/tag columns are already live and mandatory in both requeue tests. Risk-helper landing changes the proposal-eligibility fixture, not the DoD. |
| Release rollback | Slice 5 must be merged and green before its CI gate activates; workflow name/path is `ci.yml`. |
| Runtime extraction | Slices 1–4 must show call-site delegation and unchanged non-policy side effects. No Docker or GitHub mock library is added. |
| Mounted repo registry | A present `/data/repos.json` overrides `repos.ts`; fleet self-test enforcement is unverifiable until effective config parity is checked. |

Slice 4 depends on Slice 1's classifier. Slices 2 and 3 are otherwise independent. Slice 5 lands
after the test command exists and all tests pass.

## 5. Explicitly out of scope

- `adoptOrphans()` Docker recovery tests;
- `normalizeStages()` and provider-tier tests (owned by separate approved provider work where
  applicable);
- mutation-test infrastructure beyond the required temporary spot-checks;
- end-to-end containers, Docker spawn mocks, live GitHub API mocks, coverage thresholds;
- changing automerge, promotion, transition, or requeue policy beyond faithfully extracting the
  live `main` behavior;
- hand-editing either `index.json` file.

## 6. End-to-end acceptance

From a clean clone of the merge commit:

```bash
cd runner && npm ci && npm run typecheck && npm test
cd .. && actionlint .github/workflows/ci.yml
bash -n agent/run.sh agent/spec.sh agent/reconcile.sh agent/chat.sh agent/unstick.sh
```

Acceptance requires:

1. all orchestration and any sibling test files are discovered and green;
2. the three mutation spot-checks fail for the intended assertion, are reverted, and leave no diff;
3. diff review confirms runtime call sites delegate to the tested exports and retain `head_sha`,
   `spec_sha`, and `spec_tags` behavior;
4. the effective production repo registry runs `npm test`;
5. the latest attempt of `ci.yml` for the exact `main` HEAD is completed successfully.

Only then is the release-rollback spec's previously inert CI dependency a real deployment signal.
