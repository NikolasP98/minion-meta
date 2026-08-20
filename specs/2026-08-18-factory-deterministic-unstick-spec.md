---
id: 2026-08-18-factory-deterministic-unstick-spec
title: "Known unstick classes bypass the facilitator LLM; it stays advisory-only on a scoped credential"
stage: spec
status: done
pass: 2
created: 2026-08-18
updated: 2026-08-20
proposal: 2026-08-17-factory-deterministic-unstick
verdict: approved
repos: [minion-factory]
tags: [logic, infra]
type: infra
done_reason: "S1 merged to main via PR #18 (2026-08-19); zero-diff continuation run 04163c9f confirms no remaining unimplemented slices."
---

# Deterministic unstick handlers for known failure classes

**Owner surface:** `minion-factory` (`NikolasP98/minion-factory`, private, default branch `main`) —
`scripts/unstick-cron.sh` (rewritten: host-side deterministic classifier + direct remedies + conditional
facilitator spawn), `agent/unstick.sh` (trimmed to an advisory-only facilitator with no detection loop
and no cancel/requeue capability), `runner/src/index.ts` (new scoped run-read/monitor-report credential in the auth
middleware), `deploy.sh` + `setup.sh` (secret generation/heredoc), `README.md` (short operational note).
New `test/fixtures/unstick-runs.json`, `test/fixtures/unstick-queue-wedged.json`, and their bounded log
fixtures provide the shell dry-run inputs.
No other repo has a file in this spec.

**Live baseline reviewed:** `minion-factory/main` commit `b630f8f2` (2026-08-18T03:08:27Z). Re-read all
touched files before implementation — this is a drift gate, not permission to implement the stale
excerpts quoted below if concurrent factory specs have already landed changes to the same lines.

**Design ancestors and collisions:**

- [`2026-08-12-minion-factory-agent-pipeline-spec`](2026-08-12-minion-factory-agent-pipeline-spec.md)
  established the runner/agent-container split this spec works inside.
- [`2026-08-18-factory-release-rollback-spec`](2026-08-18-factory-release-rollback-spec.md) — same repo,
  same box, disjoint functional files (`scripts/self-update.sh` vs. this spec's
  `scripts/unstick-cron.sh`), with a documentation collision in `README.md`. Its
  house rules apply verbatim here: **no new `.env` variable may be hand-added on the box** — anything
  the runner or a cron script reads from `/opt/factory/.env` must live in `deploy.sh`'s heredoc, because
  `deploy.sh` rewrites the file wholesale. It also established the **Tier A (no Docker/box needed) /
  Tier B (needs the actual Netcup box)** DoD split reused below, and the precedent of a fail-loud
  `command -v <bin>` preflight for a host dependency that may not be installed (there: `sqlite3`; here:
  `jq`).
- [`2026-08-18-factory-orchestration-tests-spec`](2026-08-18-factory-orchestration-tests-spec.md) —
  overlaps `runner/src/index.ts`, `agent/unstick.sh`, and `README.md`: its Slice 4 extracts the manual
  requeue route into `runner/src/requeue.ts`, while its Slice 5 adds shell checks and documentation.
  This spec owns only the auth-middleware edit in `index.ts` and consumes the requeue route's existing
  HTTP behavior; preserve the extracted implementation and keep `agent/unstick.sh` in the shared shell
  gate. It also established the "Slice 0 recon/collision gate" convention reused below.
- [`2026-08-18-factory-workitem-handoff-schema-spec`](2026-08-18-factory-workitem-handoff-schema-spec.md)
  also touches `runner/src/index.ts`: its Slice 1 changes the requeue implementation and its Slice 6
  changes `/hooks/monitor` from GitHub-Issue creation to a typed-proposal upsert. Both are consumed by
  this spec but neither contract changes here: requeue retains its 201/404/409 outcomes, and monitor
  retains `source`/`title`/`fingerprint`/`detail` intake plus dedupe. This spec's only `index.ts` edit is
  the auth middleware block (lines ~37-45 at baseline). If that sibling lands first, rebase around all
  of its changes and do not restore the baseline route bodies.
- [`2026-08-17-factory-compose-tailnet-hardcode-spec`](2026-08-17-factory-compose-tailnet-hardcode-spec.md)
  overlaps `deploy.sh`, `setup.sh`, and `README.md`. Preserve its `FACTORY_TAILNET_IP` detection,
  wildcard refusal, health-check behavior, and documentation while adding the independent unstick
  credential; neither spec may restore the baseline heredocs wholesale.
- [`2026-08-17-factory-token-budget-governance-spec`](2026-08-17-factory-token-budget-governance-spec.md)
  §S2 states *"the unstick cron must treat a budget-paused queue as healthy (check the flag via
  `/budget`)"*. **Verified NOT implemented at this baseline** — `grep -rn 'FACTORY_DAILY_BUDGET_USD\|cost_usd' runner/src`
  returns nothing outside an unrelated wall-clock log string. There is no budget-pause state for
  Class B (queue-wedged) to misclassify today. This spec does **not** add a `/budget` dependency; see
  §5 cross-project alert — when that spec ships, its implementer must revisit this spec's Class B check.

**Operator-memory constraints:** `/memory/MINION/sdlc-board-triage-and-phase-gates.md`, entry
"★★UNSTICK CRON LIVE" (2026-08-17): *"Detection is FREE/deterministic (jq: running>timeout+20m ·
queued-while-nothing-running>15m · error<3h without requeue descendant); LLM spawns ONLY on hits
(claude sonnet → codex fallback)."* This is the exact defect the proposal targets — detection is
already free, but **every hit**, regardless of known cause, is currently handed to the LLM. The same
entry: *"facilitator container gets NO GH_TOKEN (blast radius = 4 API endpoints)"* — this spec extends
that blast-radius reduction to the admin `FACTORY_SECRET` itself, which the live facilitator container
currently receives in full (confirmed below, §1). The mandate quoted in that file is user-verbatim:
*"consider setting up a cron job that runs every 1h or so that unblocks stagnant runs. It should run an
agent with a sole objective of facilitating whatever stopped the runs."* This spec does not undo that
mandate — the facilitator still runs and still has a sole objective — it narrows *when* it runs and
*what it can do* once running, per the audit finding this spec's proposal encodes. The same memory
topic also records **"runner ADOPTS surviving containers on restart"**; therefore the Class C
`runner restarted mid-run` row below means only the residual case where no live container and no
`result.json` survived, not a replacement for `adoptOrphans()`. The read-only SQLite FTS query against
`/home/agent/.claude-mem/claude-mem.db` returned the observations **"Factory runner current architecture
surveyed"** and **"Runner service queue management and Express API implementation completed"**; they
confirm the runner/queue/auth shape but add no newer constraint. No semantic-memory MCP tool was
available in this session. `/memory/MINION/piping-gates-masks-exit-code.md` is also binding for the
verification commands: dry-run and box smoke output is redirected and inspected only after the real
command status succeeds; no `script | tee/tail` pipeline is accepted as gate evidence.

---

## 0. Problem (from the approved proposal)

> Audit 2026-08-17 P1. The hourly unstick cron hands every stall class to a facilitator agent.
> Timeouts, provider outages, clone failures and orphans have known deterministic remedies (requeue,
> wait-and-retry, adopt); the LLM should only classify UNKNOWN failures, advisory-only, without the
> full runner secret.
>
> **Definition of done:** unstick-cron resolves known classes with direct API calls (requeue endpoint
> already idempotent); facilitator agent only invoked for unmatched signatures, with a
> read-only/scoped credential; each deterministic action logged as a monitor event.
>
> **Out of scope:** changing detection thresholds.

## 1. Current behavior (verified against `b630f8f2`, not the proposal's paraphrase)

`scripts/unstick-cron.sh` is a thin host wrapper: it reads `FACTORY_SECRET` straight out of
`/opt/factory/.env` and `docker run`s the agent image with `--entrypoint /usr/local/bin/factory-unstick.sh`
(`agent/unstick.sh`), passing that secret in **full** as a container env var. All detection *and* all
remedy logic live inside that container:

- Detection (the jq filter cited in memory) finds three classes: **A** `running` past
  `FACTORY_RUN_TIMEOUT+20m`, **B** `queued` with nothing `running` for >15m, **C** `error` finished <3h
  ago with no requeue descendant (`requeue_of` column OR the legacy `note` fallback).
- On **any** hit, `unstick.sh` fetches `GET /runs/{id}/log?n=60` for every hit and hands the entire
  batch to `claude -p ... --model sonnet` (codex fallback on failure), with the full
  `Authorization: Bearer $FACTORY_SECRET` — the same credential the runner's admin surfaces
  (`/providers`, `/lifecycle/:kind/:id`, `/runs` POST, `/runs/:id/cancel`, `/runs/:id/requeue`) all
  accept. The prompt *asks* the model to use only 5 named endpoints, but nothing in the credential
  itself enforces that — a successful prompt injection from a log tail (the prompt already fences log
  content as `UNTRUSTED-DATA` because pipeline runs process external repos) would have the same API
  surface as a human operator.
- The prompt's own rules already encode which classes are "obviously mechanical" (rule 2: transient
  infra failure → requeue; rule 3: stuck running → cancel then requeue; rule 5: queue-wedged → file a
  monitor event, take no other action) — i.e. the *policy* for known classes is already written down,
  it is simply executed by an LLM turn instead of by code, on every single hourly tick that has any hit
  at all, and with a credential broader than the task needs.
- `POST /runs/:id/requeue` (`index.ts:443`) is already the exact idempotent primitive the proposal
  wants reused: it 409s if the run isn't `error`/`canceled`, and 409s again if a requeue descendant
  already exists (`requeue_of = ?` OR legacy `note = 'requeue of <id>'`). Nothing about it changes in
  this spec.
- The runner's only scoped (non-admin) credential today is `FACTORY_HOOK_SECRET` (`index.ts:27-45`),
  hardcoded to two POST paths (`/pipeline/reconcile`, `/hooks/monitor`). There is no scoped credential
  for read access to `/runs`.

## 2. Approach

Two independent hardenings, both required by the proposal's one DoD paragraph:

1. **Move classification + known-class remedy out of the LLM path entirely**, into
   `scripts/unstick-cron.sh` running directly on the box as plain bash+curl+jq — the same trust tier
   `self-update.sh` and `train.sh` already occupy (root cron, full `FACTORY_SECRET`, no LLM in the
   loop, so no prompt-injection surface exists for it to reduce). It reuses the exact detection jq
   already proven live, and adds a signature table (below) mapping each `error`-class `note` (and, for
   one ambiguous case, a log-tail grep reusing `agent/run.sh`'s own `provider_outage()` pattern
   byte-for-byte) to "known → call the primitive directly" or "unknown → queue for the facilitator."
2. **Narrow the facilitator to advisory-only on a new run-read/monitor-report credential**,
   `FACTORY_UNSTICK_SECRET`, permitted by the runner's auth middleware for exactly `GET /runs`,
   `GET /runs/:id`, `GET /runs/:id/log`, and `POST /hooks/monitor` — it can create or refresh a
   monitor artifact, but cannot mutate a run. The facilitator is
   spawned only when the cron's classifier has an unmatched run left over (the common-case hourly tick
   becomes zero-LLM-cost when nothing is stuck, and non-zero-but-known hits are now zero-LLM-cost too).

### Known-class signature table (Class A/B, and Class C sub-signatures)

| Class | Match | Deterministic remedy | Monitor fingerprint |
|---|---|---|---|
| A — running past `timeout+20m` | (no note check needed) | `POST /runs/:id/cancel` then `POST /runs/:id/requeue` | `unstick-timeout-<id>` |
| B — queue wedged | (no note check needed) | none — `POST /hooks/monitor` only (matches the current prompt's own rule 5, which already takes no other action) | `unstick-queue-wedged` |
| C — unrecoverable restart residue | `note == 'runner restarted mid-run'` (exact; `adoptOrphans()` in `queue.ts:401-403` sets this literal only when no live container and no `result.json` can be adopted) | `POST /runs/:id/requeue` | `unstick-orphan-<id>` |
| C — clone/resume/push transient | `note` matches `^clone failed \(3 tries\)$` OR `^resume fetch failed \(network\):` OR `^push failed` (all three are literal substrings emitted by `agent/run.sh`, lines 119/133/153/300/478 at baseline) | `POST /runs/:id/requeue` | `unstick-transient-<id>` |
| C — provider outage, evidenced | `note` matches `made no changes \(rc=` **and** `GET /runs/:id/log?n=60` matches `agent/run.sh`'s `provider_outage()` regex (line 70: `rate[ _-]?limit\|usage limit\|quota\|credit balance\|insufficient\|overloaded\|exhausted\|429\|401\|unauthorized\|invalid.?api.?key\|login\|billing`, case-insensitive) | `POST /runs/:id/requeue` | `unstick-outage-<id>` |
| C — everything else, incl. `resume checkout failed` | no match | queue for the facilitator (advisory only) | filed by the facilitator: `unstick-unknown-<id>` |

**`resume checkout failed` is deliberately excluded from auto-remedy.** Unlike the fetch retry above it,
`git checkout -B "${BRANCH}" FETCH_HEAD` (`run.sh:143`) is attempted once, with no retry loop, and
`/runs/:id/requeue` carries the **same** `branch` forward (`index.ts:461-465`, "branch carries over").
A checkout failure that is a genuinely bad/force-pushed/deleted branch — not a network blip — would
requeue into the identical failure forever with no circuit breaker. Routing it to the facilitator
(which can read the log and recognize "branch gone" vs. "network blip") is the correct behavior, not a
gap; do not add it to the known-class table without also deciding what breaks the requeue-to-same-branch
loop.

**No new cap on repeated requeues of a persistently-failing lineage.** The current LLM-driven behavior
had no cross-tick cap either (only a 5-per-invocation cap inside one prompt). This spec's deterministic
path inherits the same absence of a lineage-level circuit breaker — a genuinely dead credential or a
permanently broken clone target would generate one new requeue generation per hourly tick, forever, same
as today. Each generation is a distinct, dedupe-visible monitor event (`unstick-<class>-<newRunId>`), so
a human watching the board sees the churn; adding a hard cross-tick cap is a real improvement but is not
what the proposal's DoD asks for ("changing detection thresholds" is explicitly out of scope, and a
churn cap is adjacent to that boundary) — flagged as a follow-up, not built here.

## 3. Slice 0 — recon and collision gate (prepend to Slice 1)

```bash
gh api repos/NikolasP98/minion-factory/commits/main --jq '.sha'
for p in scripts/unstick-cron.sh agent/unstick.sh agent/run.sh runner/src/index.ts \
  runner/src/queue.ts deploy.sh setup.sh; do
  gh api "repos/NikolasP98/minion-factory/contents/$p?ref=main" --jq '.sha + "  " + .path'
done
```

Confirm the `provider_outage()` regex at `agent/run.sh` still reads as quoted in §2's table, the
`adoptOrphans()` note string in `queue.ts` is still the literal `'runner restarted mid-run'`, and the
auth middleware in `runner/src/index.ts` still matches the `HOOK_SECRET` shape quoted in §1. If any of
these drifted, update this spec's tables to match live code and cite the new commit in the PR — do not
implement the stale excerpts.

## 4. Slices

### Slice 1 — scoped run-read/monitor-report credential for the facilitator (3-5h, tag `infra`)

**Files:** `runner/src/index.ts`, `deploy.sh`, `setup.sh`, `README.md`.

- Add `const UNSTICK_SECRET = process.env.FACTORY_UNSTICK_SECRET?.trim();` alongside `HOOK_SECRET`.
- Extend the auth middleware (`index.ts:37-45`) with a second scoped-credential branch: when the method
  is `GET` and the path is `/runs`, matches `/^\/runs\/[^/]+$/`, or matches `/^\/runs\/[^/]+\/log$/`, OR
  the method is `POST` and the path is `/hooks/monitor`, accept `tokenMatches(got, UNSTICK_SECRET)` in
  addition to `SECRET`. Keep the existing `HOOK_SECRET` branch untouched (still POST-only,
  `/pipeline/reconcile` + `/hooks/monitor`). Do **not** add `/runs/:id/requeue` or `/runs/:id/cancel` or
  any other path to either scoped branch — that omission is the entire security property this spec adds.
- `deploy.sh`: generate/cache a distinct secret the same way `FACTORY_SECRET` is cached
  (`~/.config/minion/factory-unstick-secret`, `openssl rand -hex 24` if absent, mode 600) and add
  `FACTORY_UNSTICK_SECRET=$FACTORY_UNSTICK_SECRET` to the `.env` heredoc (`deploy.sh:28-41`). Do the
  same in `setup.sh`'s first-run `.env` heredoc (`setup.sh:18-26`) with a freshly generated value. Never
  derive it from `FACTORY_SECRET` or `FACTORY_HOOK_SECRET` — it must be an independent value so revoking
  one credential class doesn't require touching another. Enforce mode 600 on every deploy, including
  when the cache file already exists, and fail if `FACTORY_UNSTICK_SECRET` equals
  `FACTORY_SECRET` or any configured `FACTORY_HOOK_SECRET`.
- The same deploy edit must close the pre-existing heredoc hole for `FACTORY_HOOK_SECRET`, because the
  required deploy would otherwise erase the live CI-webhook credential. On first use, migrate the
  existing non-empty value from the target's `/opt/factory/.env` into a local mode-600
  `~/.config/minion/factory-hook-secret` cache without printing it; if neither cache nor remote value
  exists, fail before rewriting the remote `.env` and tell the operator to establish the CI-shared
  value. Thereafter read the cache and write `FACTORY_HOOK_SECRET=$FACTORY_HOOK_SECRET` in the heredoc.
  `setup.sh` generates an independent hook secret on a fresh host and prints only the path/instruction
  for configuring CI consumers, not the value. This is required non-regression wiring, not a new hook
  capability.
- `README.md`: a short note documenting both scoped credentials, their allowed routes, and the
  first-deploy hook-secret preservation requirement (mirror the existing `FACTORY_HOOK_SECRET` doc
  comment style at `index.ts:27-29`).

**DoD (Tier A — no Docker/box needed):**

```bash
cd runner && npm ci
T=$(mktemp -d)
trap 'kill "${pid:-}" 2>/dev/null || true; rm -rf "$T"' EXIT
FACTORY_DATA="$T/data" FACTORY_RUNS_DIR="$T/runs" PORT=3299 \
  FACTORY_SECRET=admin-x FACTORY_HOOK_SECRET=hook-y FACTORY_UNSTICK_SECRET=unstick-z \
  npm start & pid=$!
sleep 1
u() { curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer unstick-z" "$@"; }
[ "$(u http://127.0.0.1:3299/runs)" = 200 ]
[ "$(u http://127.0.0.1:3299/runs/does-not-exist)" = 404 ]
[ "$(u http://127.0.0.1:3299/runs/does-not-exist/log)" = 404 ]
[ "$(u -X POST -H 'content-type: application/json' -d '{"source":"t","title":"t"}' http://127.0.0.1:3299/hooks/monitor)" != 401 ]
[ "$(u -X POST http://127.0.0.1:3299/runs/does-not-exist/requeue)" = 401 ]
[ "$(u -X POST http://127.0.0.1:3299/runs/does-not-exist/cancel)" = 401 ]
[ "$(u http://127.0.0.1:3299/providers)" = 401 ]
[ "$(u -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:3299/runs)" = 401 ]
# regression: admin and hook secrets unchanged
[ "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer admin-x" http://127.0.0.1:3299/providers)" = 200 ]
[ "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer hook-y" -X POST http://127.0.0.1:3299/pipeline/reconcile)" != 401 ]
kill $pid
pid=
grep -n 'FACTORY_UNSTICK_SECRET' deploy.sh setup.sh
grep -n 'FACTORY_HOOK_SECRET' deploy.sh setup.sh
```

### Slice 2 — deterministic classifier + direct remedies on the host cron (6-8h, tag `logic`)

**Files:** `scripts/unstick-cron.sh` (rewritten), `README.md`.

- Rewrite `scripts/unstick-cron.sh` from a `docker run` wrapper into the classifier itself: bash, reads
  `FACTORY_SECRET`/`FACTORY_UNSTICK_SECRET`/`FACTORY_RUN_TIMEOUT` from `/opt/factory/.env` via the
  existing `envval()` pattern, calls the runner over `127.0.0.1:3211` directly with `curl` (no
  container for this part — it is box-trusted code, same tier as `self-update.sh`). A missing admin
  secret is fatal before detection. A missing scoped secret must not fall back to passing the admin
  secret into the container: deterministic remedies may continue, but if unmatched ids remain, POST
  one admin-authenticated monitor event (`unstick-credential-missing`) and skip the facilitator spawn.
  This makes the merge-to-deploy interval fail loud while preserving the no-admin-secret-in-container
  property.
- Preflight: `command -v jq >/dev/null 2>&1 || { echo "[unstick] jq required — apt-get install -y jq"; exit 1; }`
  (mirrors the `sqlite3` preflight precedent in `self-update.sh`'s sibling spec).
- Relocate the exact 3-class jq filter currently embedded in `agent/unstick.sh` (the `stuck=$(jq ...)`
  block) byte-for-byte — do not re-derive the age arithmetic or the requeue-descendant union from
  scratch; a transcription bug in the timeout/wedge/no-descendant boundaries is an availability bug.
- Every `/hooks/monitor` call in this spec must send all fields required by the live endpoint:
  non-empty `source:"unstick"` and `title`, plus the documented `fingerprint` and bounded `detail`.
  Omitting `title` returns 400 and is not a successful event. Treat either 200 (deduped) or 201 (new
  artifact, if the workitem-handoff monitor rewrite has landed) as success; more generally accept any
  2xx so the two compatible endpoint implementations can land in either order.
- For Class A hits: `curl -X POST .../runs/$id/cancel` then `curl -X POST .../runs/$id/requeue`.
  If cancel returns 2xx, POST the `unstick-timeout-<id>` monitor event after the requeue attempt, with
  both response outcomes in `detail` and an explicit completed/partial result; this records the cancel
  action even when requeue fails. A requeue 409 is success-no-op **only** when its response says
  `already requeued as <id>`; the endpoint also uses 409 for an ineligible current status, which is a
  failure and must not be reported as remedied. Any other non-2xx is a failure to log.
- For Class B: skip run-level action entirely; POST one `/hooks/monitor` event
  (`source:"unstick", title:"Factory queue wedged", fingerprint:"unstick-queue-wedged"`) — the
  endpoint's own dedupe means repeat ticks don't spam.
- For each Class C hit, evaluate `.note` against the signature table in §2 in order; the
  provider-outage sub-case additionally fetches `GET /runs/$id/log?n=60` and greps it with the
  regex quoted in §2 (copy the pattern text verbatim from `agent/run.sh`'s `provider_outage()` into a
  comment in both files cross-referencing the other — this is deliberate duplication across the
  host/container trust boundary, not a shared-module refactor).
- Any matched Class C hit: `curl -X POST .../runs/$id/requeue`; apply the same narrow 409 rule as
  Class A. On 201, POST the matching `/hooks/monitor` fingerprint from §2's table with `detail` = the
  matched `note` (or a bounded log excerpt for the outage case). A verified already-requeued 409 is
  logged as a no-op and does not claim a new deterministic action or emit a new action event.
- Unmatched Class C hits accumulate into a JSON array of run ids. If, after processing every hit, that
  array is empty: exit 0 — **no container is spawned**. This is the common-case fast path.
- If non-empty: hand off to Slice 3's facilitator (see there for the exact invocation).
- Every unexpected response from any `curl` call, including a status-mismatch 409 or a failed monitor
  POST, is logged with method, path, status, and a bounded response body (never an Authorization
  header). It does not abort the rest of the loop — one bad run must not block remedying the others.

**DoD (Tier A — fixture-driven, no live runner or box needed):**

Author **two** `/runs`-shaped fixture snapshots because Class B requires zero running rows and therefore
cannot coexist with a Class A `running` row in the same detector input. The primary snapshot contains
six rows: one Class A row, one restart-residue error row, one clone-failed error row, one
`resume checkout failed` error row (unmatched), and two `made no changes (rc=...)` error rows whose
log tails respectively contain `quota` (matched) and an unrelated stack trace (unmatched). The second
snapshot contains one old queued row and zero running rows, proving Class B. Extract the jq
classification and signature-matching logic into a mode the script can run against local fixture files
and a stub `curl` (a shell function shadowing `curl` that reads from the fixture directory instead of
the network) so this table is exercised without Docker or the box:

```bash
bash -n scripts/unstick-cron.sh
FACTORY_UNSTICK_FIXTURE=test/fixtures/unstick-runs.json \
  scripts/unstick-cron.sh --dry-run > /tmp/unstick-dry-run.log
FACTORY_UNSTICK_FIXTURE=test/fixtures/unstick-queue-wedged.json \
  scripts/unstick-cron.sh --dry-run > /tmp/unstick-queue-dry-run.log
cat /tmp/unstick-dry-run.log /tmp/unstick-queue-dry-run.log
grep -q 'class=A' /tmp/unstick-dry-run.log
grep -q 'class=B' /tmp/unstick-queue-dry-run.log
grep -q 'unmatched.*resume checkout failed' /tmp/unstick-dry-run.log
test "$(grep -c 'unmatched' /tmp/unstick-dry-run.log)" -eq 2
# ^ exactly the checkout-failed row and the unrelated-log provider row
```

(The `--dry-run` / `FACTORY_UNSTICK_FIXTURE` flags are new, script-local test hooks — not a new `.env`
variable, so they don't trigger the deploy.sh heredoc rule; they're absent in the real cron invocation.)

### Slice 3 — facilitator narrowed to advisory-only (4-6h, tag `logic`)

**Files:** `agent/unstick.sh`, `scripts/unstick-cron.sh` (spawn tail).

- `agent/unstick.sh` drops its own detection loop entirely (moved to Slice 2) and instead reads a
  pre-filtered run-id list from `FACTORY_UNSTICK_RUN_IDS` (space-separated), set by the cron's spawn
  call. It fetches each of those runs and their log tails via `GET`, using `FACTORY_UNSTICK_SECRET`
  (not `FACTORY_SECRET` — the container never receives the admin secret again).
- Rewrite the prompt's API section to list only `GET /runs/ID`, `GET /runs/ID/log?n=200`, and
  `POST /hooks/monitor` with required `source`, `title`, `fingerprint`, and `detail` — delete the
  `cancel` and `requeue` lines entirely. The rules section becomes:
  diagnose each run from its log tail, then **always** file exactly one `/hooks/monitor` event per run
  (fingerprint `unstick-unknown-<runId>`) describing the diagnosis and a recommendation for a human —
  never claim to have requeued or canceled anything, because the credential physically cannot do either
  (a 401 would prove that, but the prompt should not tempt a wasted turn attempting it). Keep the
  existing `UNTRUSTED-DATA` fencing and injection handling. For a detected injection attempt, file
  exactly one `unstick-injection-<runId>` event **instead of** the normal `unstick-unknown-<runId>`
  event; never file both for one run. This preserves the hardening without contradicting the one-event
  cap.
- `scripts/unstick-cron.sh`'s spawn call (the tail that used to be the whole script) drops
  `FACTORY_SECRET` from the container's env entirely and passes `FACTORY_UNSTICK_SECRET` plus the
  unmatched id list instead. `CLAUDE_CODE_OAUTH_TOKEN` and `--network host` are unchanged (the
  facilitator still needs the LLM credential and still needs to reach `127.0.0.1:3211`).

**DoD (Tier A for the static checks, Tier B for the live smoke):**

```bash
bash -n agent/unstick.sh scripts/unstick-cron.sh
test "$(grep -c '/runs/.*requeue\|/runs/.*cancel' agent/unstick.sh || true)" -eq 0
test "$(grep -c -- '-e.*FACTORY_SECRET=' scripts/unstick-cron.sh || true)" -eq 0
# ^ host-side logic still uses FACTORY_SECRET; only container env arguments are forbidden
grep -n 'FACTORY_UNSTICK_SECRET' agent/unstick.sh scripts/unstick-cron.sh
test "$(grep -c 'unstick-unknown-' agent/unstick.sh)" -ge 1
```

Tier B (needs the box, or any host with the built agent image + a reachable runner): queue one
deliberately-unfixable run (a task with an intentionally broken repo target, or reuse an existing
`error` row whose note doesn't match §2's table), run the cron manually, and confirm exactly one
`unstick-unknown-<id>` monitor event lands and no `/runs/:id/requeue` or `/runs/:id/cancel` call
succeeds from inside the container (attempt one manually inside the running container with the
injected `FACTORY_UNSTICK_SECRET` and confirm `401`). For an injection fixture, the one event is
`unstick-injection-<id>` instead of `unstick-unknown-<id>`.

### Slice 4 — deploy wiring + operator verification (2-4h, tag `infra`)

**Files:** `deploy.sh`, `setup.sh`, `README.md` (folds into Slice 1's edits if landed together; listed
separately because its DoD is box-side and gated on an actual deploy).

**Operator DoD (Tier B — needs the Netcup box):**

```bash
ssh netcup 'command -v jq >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y jq; }'
ssh netcup 'crontab -l | grep "17 \* \* \* \*.*unstick-cron.sh"'   # path unchanged — no crontab edit needed
# after the next self-update tick or a manual deploy.sh run:
test "$(ssh netcup 'grep -c ^FACTORY_UNSTICK_SECRET= /opt/factory/.env')" -eq 1
test "$(ssh netcup 'grep -c ^FACTORY_HOOK_SECRET= /opt/factory/.env')" -eq 1
tier_b_log=$(mktemp)
if ! ssh netcup 'cd /opt/factory && ./scripts/unstick-cron.sh' >"$tier_b_log" 2>&1; then
  tail -40 "$tier_b_log"
  rm -f "$tier_b_log"
  exit 1
fi
tail -40 "$tier_b_log"
rm -f "$tier_b_log"
```

Confirm the manual run's log shows the fast-path (`nothing stagnant`, or a mix of `class=A/B/C` lines)
and, if any Class C hits existed at run time, that each one resolved to either a direct requeue+monitor
event or a facilitator spawn — never a silent drop.

Before that deploy, verify `~/.config/minion/factory-hook-secret` was populated from the existing box
value without rotation, and prove one existing CI caller can still authenticate to
`POST /pipeline/reconcile`. The deploy must abort before rewriting `.env` if it cannot preserve that
shared value.

## 5. Cross-project impact and ordering

No AGENTS.md cross-project impact-zone row matches: no gateway protocol, channel extension, hub/site DB
or auth, agent definition, UI, or Paperclip adapter changes. Blast radius is the standalone factory
runner, its box cron, and the facilitator container image content (not the image build itself — no
`Dockerfile` change).

| Surface | Impact / ordering |
|---|---|
| `runner/src/index.ts` auth middleware | Slice 1 must land and deploy before enabling Slice 3's facilitator spawn with `FACTORY_UNSTICK_SECRET` — a facilitator run against a pre-Slice-1 runner would 401 on every call including `/hooks/monitor`. The script must propagate/log that failure, never call it success. Sequence: 1 → 2 → 3 → 4; the missing-secret guard covers the brief self-update/deploy gap. |
| Workitem-handoff-schema spec | Shares `runner/src/index.ts`; this spec's auth edit is in a disjoint region, but it consumes that sibling's requeue and monitor contracts (see collisions above). Whichever lands first, the other rebases around it without reverting. |
| Token-budget-governance spec (approved, not yet built) | Its Class-B budget-pause carve-out does not exist yet in code (verified, §0 baseline). **Alert:** when that spec's `GET /budget` ships, Class B's "queued, nothing running, >15m" check in this spec's `scripts/unstick-cron.sh` will need a follow-up: skip filing `unstick-queue-wedged` when `/budget` reports a budget pause. Not built here — that spec doesn't exist in code yet, so there is nothing to integrate against. |
| `agent/run.sh`'s `provider_outage()` regex | This spec duplicates that pattern into `scripts/unstick-cron.sh` by value, not by reference (cross-boundary bash duplication, commented both ways). A future change to one must update the other by hand; no shared-module mechanism exists for bash across the host/container split, and inventing one is disproportionate to a 12-token regex. |
| Deploy/self-update | `scripts/unstick-cron.sh`'s content changes ship via the existing self-update tick (git pull + `reset --hard`) exactly like any other tracked file. Run `deploy.sh` promptly to install the scoped secret and preserve `FACTORY_HOOK_SECRET`; until then the new cron fails loud with `unstick-credential-missing` for unmatched rows and never passes the admin secret into a facilitator. Do not hand-edit `.env`. |

## 6. Explicitly out of scope

- Changing the detection thresholds (`timeout+20m`, `>15m` wedge, `<3h` error window) — proposal says so
  explicitly; this spec inherits them unchanged.
- A cross-tick cap on repeated requeues of a persistently-failing lineage (§2 rationale) — a real
  improvement, not requested by this proposal's DoD, and adjacent to the threshold boundary that's
  explicitly out of scope.
- Wiring `/budget` into Class B (token-budget-governance spec's own DoD line) — that spec's `/budget`
  endpoint does not exist in code yet; nothing to wire against (see §5 alert).
- Any change to `agent/Dockerfile`, `docker-compose.yml`, or the crontab entry's schedule/path — none
  are needed; the facilitator entrypoint path and the cron's invocation path are both unchanged.
- Retrying `resume checkout failed` automatically (§2) — deliberately routed to the facilitator instead.
- A shared bash helper library for the duplicated `provider_outage()` pattern — disproportionate for one
  regex; see §5.

## 7. End-to-end acceptance

From a clean clone of the merge commit:

```bash
cd runner && npm ci && npm run typecheck
bash -n scripts/unstick-cron.sh agent/unstick.sh
```

Then, in order:

1. Slice 1's Tier A curl matrix (§4 Slice 1 DoD) passes against a locally-started runner: the new
   `FACTORY_UNSTICK_SECRET` opens exactly `GET /runs`, `GET /runs/:id`, `GET /runs/:id/log`,
   `POST /hooks/monitor`, and nothing else; `FACTORY_SECRET`/`FACTORY_HOOK_SECRET` behavior is
   unchanged (regression-checked).
2. Slice 2's fixture-driven dry runs (§4 Slice 2 DoD) correctly classify all seven scenarios across
   two snapshots, including a queue wedge that has no running row and exactly two unmatched Class C
   cases (`resume checkout failed` and the unrelated-log provider candidate).
3. Slice 3's static checks (§4 Slice 3 DoD) confirm the facilitator's docker-run invocation never
   references `FACTORY_SECRET`, and `agent/unstick.sh` contains no `/requeue` or `/cancel` calls.
4. On the box (Tier B, after a real deploy): a manual `scripts/unstick-cron.sh` run against live data
   resolves every known-class hit without spawning a container, and — if a genuinely unmatched `error`
   row exists — spawns exactly one facilitator container that files one `unstick-unknown-<id>` monitor
   event per unmatched run and cannot successfully call `cancel` or `requeue` (401, verified live).
5. Diff review confirms every remedy action (§2's table) is paired with a `/hooks/monitor` POST using
   the documented fingerprint prefix, satisfying the proposal's "each deterministic action logged as a
   monitor event" DoD line.

Only then does the facilitator's blast radius match the proposal's ask: advisory-only, scoped
credential, known classes handled without an LLM turn at all.
