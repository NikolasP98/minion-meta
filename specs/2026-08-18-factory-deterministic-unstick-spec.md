---
id: 2026-08-18-factory-deterministic-unstick-spec
title: "Known unstick classes bypass the facilitator LLM; it stays advisory-only on a scoped credential"
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-factory-deterministic-unstick
verdict: pending
repos: [minion-factory]
tags: [logic, infra]
type: infra
---

# Deterministic unstick handlers for known failure classes

**Owner surface:** `minion-factory` (`NikolasP98/minion-factory`, private, default branch `main`) —
`scripts/unstick-cron.sh` (rewritten: host-side deterministic classifier + direct remedies + conditional
facilitator spawn), `agent/unstick.sh` (trimmed to an advisory-only facilitator with no detection loop
and no cancel/requeue capability), `runner/src/index.ts` (new scoped read-only credential in the auth
middleware), `deploy.sh` + `setup.sh` (secret generation/heredoc), `README.md` (short operational note).
No other repo has a file in this spec.

**Live baseline reviewed:** `minion-factory/main` commit `b630f8f2` (2026-08-18T03:08:27Z). Re-read all
touched files before implementation — this is a drift gate, not permission to implement the stale
excerpts quoted below if concurrent factory specs have already landed changes to the same lines.

**Design ancestors and collisions:**

- [`2026-08-12-minion-factory-agent-pipeline-spec`](2026-08-12-minion-factory-agent-pipeline-spec.md)
  established the runner/agent-container split this spec works inside.
- [`2026-08-18-factory-release-rollback-spec`](2026-08-18-factory-release-rollback-spec.md) — same repo,
  same box, disjoint files (`scripts/self-update.sh` vs. this spec's `scripts/unstick-cron.sh`). Its
  house rules apply verbatim here: **no new `.env` variable may be hand-added on the box** — anything
  the runner or a cron script reads from `/opt/factory/.env` must live in `deploy.sh`'s heredoc, because
  `deploy.sh` rewrites the file wholesale. It also established the **Tier A (no Docker/box needed) /
  Tier B (needs the actual Netcup box)** DoD split reused below, and the precedent of a fail-loud
  `command -v <bin>` preflight for a host dependency that may not be installed (there: `sqlite3`; here:
  `jq`).
- [`2026-08-18-factory-orchestration-tests-spec`](2026-08-18-factory-orchestration-tests-spec.md) —
  disjoint files (`runner/src/*.test.ts` vs. this spec's shell scripts and `runner/src/index.ts`'s auth
  middleware). Established the "Slice 0 recon/collision gate" convention reused below given how many
  factory specs are landing on `main` concurrently.
- [`2026-08-18-factory-workitem-handoff-schema-spec`](2026-08-18-factory-workitem-handoff-schema-spec.md)
  also touches `runner/src/index.ts`, but a different region (`fetchMetaFile()` dedup, the
  `/runs/:id/requeue` INSERT's `spec_sha`/`spec_tags` columns — already present at this spec's baseline,
  confirmed live, not something this spec touches). This spec's only `index.ts` edit is the auth
  middleware block (lines ~37-45 at baseline). If that sibling's `index.ts` edits land first, rebase
  this spec's middleware diff around them; do not revert its unrelated changes.
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
*what it can do* once running, per the audit finding this spec's proposal encodes. No semantic-memory
MCP tool call was available in this session; the sqlite FTS query
`SELECT title,subtitle,substr(text,1,300) FROM observations_fts WHERE observations_fts MATCH 'unstick facilitator requeue'`
was not run because the read-only db path in this session's tool guidance
(`/home/agent/.claude-mem/claude-mem.db`) does not exist in this sandbox; the markdown-tier memory
above already supplied the load-bearing facts and is cited.

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
2. **Narrow the facilitator to advisory-only on a new scoped credential**, `FACTORY_UNSTICK_SECRET`,
   permitted by the runner's auth middleware for exactly `GET /runs`, `GET /runs/:id`,
   `GET /runs/:id/log`, and `POST /hooks/monitor` — nothing that mutates a run. The facilitator is
   spawned only when the cron's classifier has an unmatched run left over (the common-case hourly tick
   becomes zero-LLM-cost when nothing is stuck, and non-zero-but-known hits are now zero-LLM-cost too).

### Known-class signature table (Class A/B, and Class C sub-signatures)

| Class | Match | Deterministic remedy | Monitor fingerprint |
|---|---|---|---|
| A — running past `timeout+20m` | (no note check needed) | `POST /runs/:id/cancel` then `POST /runs/:id/requeue` | `unstick-timeout-<id>` |
| B — queue wedged | (no note check needed) | none — `POST /hooks/monitor` only (matches the current prompt's own rule 5, which already takes no other action) | `unstick-queue-wedged` |
| C — orphan | `note == 'runner restarted mid-run'` (exact; `adoptOrphans()` in `queue.ts:401-403` sets this literal string) | `POST /runs/:id/requeue` | `unstick-orphan-<id>` |
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

### Slice 1 — scoped read-only credential for the facilitator (3-5h, tag `infra`)

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
  one credential class doesn't require touching another.
- `README.md`: one line documenting the new env var and what it scopes (mirror the existing
  `FACTORY_HOOK_SECRET` doc comment style at `index.ts:27-29`).

**DoD (Tier A — no Docker/box needed):**

```bash
cd runner && npm ci
T=$(mktemp -d)
FACTORY_DATA="$T/data" FACTORY_RUNS_DIR="$T/runs" PORT=3299 \
  FACTORY_SECRET=admin-x FACTORY_HOOK_SECRET=hook-y FACTORY_UNSTICK_SECRET=unstick-z \
  npm start & pid=$!
sleep 1
u() { curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer unstick-z" "$@"; }
[ "$(u http://127.0.0.1:3299/runs)" = 200 ]
[ "$(u -X POST -H 'content-type: application/json' -d '{"source":"t","title":"t"}' http://127.0.0.1:3299/hooks/monitor)" != 401 ]
[ "$(u -X POST http://127.0.0.1:3299/runs/does-not-exist/requeue)" = 401 ]
[ "$(u -X POST http://127.0.0.1:3299/runs/does-not-exist/cancel)" = 401 ]
[ "$(u http://127.0.0.1:3299/providers)" = 401 ]
[ "$(u -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:3299/runs)" = 401 ]
# regression: admin and hook secrets unchanged
[ "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer admin-x" http://127.0.0.1:3299/providers)" = 200 ]
[ "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer hook-y" -X POST http://127.0.0.1:3299/pipeline/reconcile)" != 401 ]
kill $pid
grep -n 'FACTORY_UNSTICK_SECRET' deploy.sh setup.sh
```

### Slice 2 — deterministic classifier + direct remedies on the host cron (6-8h, tag `logic`)

**Files:** `scripts/unstick-cron.sh` (rewritten), `README.md`.

- Rewrite `scripts/unstick-cron.sh` from a `docker run` wrapper into the classifier itself: bash, reads
  `FACTORY_SECRET`/`FACTORY_RUN_TIMEOUT` from `/opt/factory/.env` via the existing `envval()` pattern,
  calls the runner over `127.0.0.1:3211` directly with `curl` (no container for this part — it is
  box-trusted code, same tier as `self-update.sh`).
- Preflight: `command -v jq >/dev/null 2>&1 || { echo "[unstick] jq required — apt-get install -y jq"; exit 1; }`
  (mirrors the `sqlite3` preflight precedent in `self-update.sh`'s sibling spec).
- Relocate the exact 3-class jq filter currently embedded in `agent/unstick.sh` (the `stuck=$(jq ...)`
  block) byte-for-byte — do not re-derive the age arithmetic or the requeue-descendant union from
  scratch; a transcription bug in the timeout/wedge/no-descendant boundaries is an availability bug.
- For Class A hits: `curl -X POST .../runs/$id/cancel` then `curl -X POST .../runs/$id/requeue`;
  treat requeue's `409` as success-no-op (already remedied by a human or a prior tick), any other
  non-2xx as a failure to log.
- For Class B: skip run-level action entirely; POST one `/hooks/monitor` event
  (`source:"unstick", fingerprint:"unstick-queue-wedged"`) — the endpoint's own dedupe means repeat
  ticks don't spam.
- For each Class C hit, evaluate `.note` against the signature table in §2 in order; the
  provider-outage sub-case additionally fetches `GET /runs/$id/log?n=60` and greps it with the
  regex quoted in §2 (copy the pattern text verbatim from `agent/run.sh`'s `provider_outage()` into a
  comment in both files cross-referencing the other — this is deliberate duplication across the
  host/container trust boundary, not a shared-module refactor).
- Any matched Class C hit: `curl -X POST .../runs/$id/requeue` (409 → no-op as above); on success POST
  the matching `/hooks/monitor` fingerprint from §2's table with `detail` = the matched `note` (or log
  excerpt for the outage case).
- Unmatched Class C hits accumulate into a JSON array of run ids. If, after processing every hit, that
  array is empty: exit 0 — **no container is spawned**. This is the common-case fast path.
- If non-empty: hand off to Slice 3's facilitator (see there for the exact invocation).
- Every non-2xx/non-409 response from any `curl` call is logged to stdout (the cron's output is already
  captured by the box's cron mailer/journal per existing convention) and does not abort the rest of the
  loop — one bad run must not block remedying the others.

**DoD (Tier A — fixture-driven, no live runner or box needed):**

Author a fixture `/runs`-shaped JSON array covering: one Class A row, one Class B state (queued row +
zero running rows), one orphan-note error row, one clone-failed-note error row, one
`resume checkout failed`-note error row (must land in the *unmatched* bucket), and one
`made no changes (rc=...)`-note error row paired with two log-tail fixtures — one containing a
`quota` string (must match) and one containing an unrelated stack trace (must NOT match, must land
unmatched). Extract the jq classification and signature-matching logic into a mode the script can run
against a local fixture file and a stub `curl` (a shell function shadowing `curl` that reads from the
fixture directory instead of the network) so this table is exercised without Docker or the box:

```bash
bash -n scripts/unstick-cron.sh
FACTORY_UNSTICK_FIXTURE=test/fixtures/unstick-runs.json scripts/unstick-cron.sh --dry-run \
  | tee /tmp/unstick-dry-run.log
grep -q 'class=A' /tmp/unstick-dry-run.log
grep -q 'class=B' /tmp/unstick-dry-run.log
grep -q 'unmatched.*resume checkout failed' /tmp/unstick-dry-run.log
grep -c 'unmatched' /tmp/unstick-dry-run.log   # == 1 (only the checkout-failed + unrelated-log rows)
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
  `POST /hooks/monitor` — delete the `cancel` and `requeue` lines entirely. The rules section becomes:
  diagnose each run from its log tail, then **always** file exactly one `/hooks/monitor` event per run
  (fingerprint `unstick-unknown-<runId>`) describing the diagnosis and a recommendation for a human —
  never claim to have requeued or canceled anything, because the credential physically cannot do either
  (a 401 would prove that, but the prompt should not tempt a wasted turn attempting it). Keep the
  existing `UNTRUSTED-DATA` fencing and the injection rule (`unstick-injection-<runId>` fingerprint)
  unchanged — that hardening is orthogonal to this spec and still needed.
- `scripts/unstick-cron.sh`'s spawn call (the tail that used to be the whole script) drops
  `FACTORY_SECRET` from the container's env entirely and passes `FACTORY_UNSTICK_SECRET` plus the
  unmatched id list instead. `CLAUDE_CODE_OAUTH_TOKEN` and `--network host` are unchanged (the
  facilitator still needs the LLM credential and still needs to reach `127.0.0.1:3211`).

**DoD (Tier A for the static checks, Tier B for the live smoke):**

```bash
bash -n agent/unstick.sh scripts/unstick-cron.sh
grep -c '/runs/.*requeue\|/runs/.*cancel' agent/unstick.sh   # == 0
grep -n 'FACTORY_SECRET=' scripts/unstick-cron.sh | grep -v FACTORY_UNSTICK_SECRET
# ^ the facilitator docker-run block must reference ONLY FACTORY_UNSTICK_SECRET, never FACTORY_SECRET
grep -n 'FACTORY_UNSTICK_SECRET' agent/unstick.sh scripts/unstick-cron.sh
grep -c 'unstick-unknown-' agent/unstick.sh   # >= 1
```

Tier B (needs the box, or any host with the built agent image + a reachable runner): queue one
deliberately-unfixable run (a task with an intentionally broken repo target, or reuse an existing
`error` row whose note doesn't match §2's table), run the cron manually, and confirm exactly one
`unstick-unknown-<id>` monitor event lands and no `/runs/:id/requeue` or `/runs/:id/cancel` call
succeeds from inside the container (attempt one manually inside the running container with the
mounted `FACTORY_UNSTICK_SECRET` and confirm `401`).

### Slice 4 — deploy wiring + operator verification (2-4h, tag `infra`)

**Files:** `deploy.sh`, `setup.sh`, `README.md` (folds into Slice 1's edits if landed together; listed
separately because its DoD is box-side and gated on an actual deploy).

**Operator DoD (Tier B — needs the Netcup box):**

```bash
ssh netcup 'command -v jq >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y jq; }'
ssh netcup 'crontab -l | grep "17 \* \* \* \*.*unstick-cron.sh"'   # path unchanged — no crontab edit needed
# after the next self-update tick or a manual deploy.sh run:
ssh netcup 'grep -c FACTORY_UNSTICK_SECRET /opt/factory/.env'      # == 1
ssh netcup 'sudo -u agent-owner-or-self /opt/factory/scripts/unstick-cron.sh' 2>&1 | tail -40
```

Confirm the manual run's log shows the fast-path (`nothing stagnant`, or a mix of `class=A/B/C` lines)
and, if any Class C hits existed at run time, that each one resolved to either a direct requeue+monitor
event or a facilitator spawn — never a silent drop.

**Pre-existing gap observed, out of scope:** `FACTORY_HOOK_SECRET` itself is referenced by
`runner/src/index.ts` but is **absent from `deploy.sh`'s heredoc** at this baseline — it must have been
hand-added to the box `.env` in a prior session, which the box's own conventions (§ design ancestors)
say does not survive the next `deploy.sh` run. This spec does not fix that adjacent defect (it isn't
this spec's file, and touching it isn't needed for `FACTORY_UNSTICK_SECRET` to work) — flagged here so
the next `deploy.sh` run doesn't silently break the CI-webhook reconcile trigger; worth its own one-line
follow-up proposal.

## 5. Cross-project impact and ordering

No AGENTS.md cross-project impact-zone row matches: no gateway protocol, channel extension, hub/site DB
or auth, agent definition, UI, or Paperclip adapter changes. Blast radius is the standalone factory
runner, its box cron, and the facilitator container image content (not the image build itself — no
`Dockerfile` change).

| Surface | Impact / ordering |
|---|---|
| `runner/src/index.ts` auth middleware | Slice 1 must land and deploy before Slice 3's facilitator spawn passes `FACTORY_UNSTICK_SECRET` — a facilitator run against a pre-Slice-1 runner would 401 on every call including `/hooks/monitor`, silently producing zero output. Sequence: 1 → 2 → 3 → 4. |
| Workitem-handoff-schema spec | Shares `runner/src/index.ts`; disjoint region (see collisions above). Whichever lands first, the other rebases around it without reverting. |
| Token-budget-governance spec (approved, not yet built) | Its Class-B budget-pause carve-out does not exist yet in code (verified, §0 baseline). **Alert:** when that spec's `GET /budget` ships, Class B's "queued, nothing running, >15m" check in this spec's `scripts/unstick-cron.sh` will need a follow-up: skip filing `unstick-queue-wedged` when `/budget` reports a budget pause. Not built here — that spec doesn't exist in code yet, so there is nothing to integrate against. |
| `agent/run.sh`'s `provider_outage()` regex | This spec duplicates that pattern into `scripts/unstick-cron.sh` by value, not by reference (cross-boundary bash duplication, commented both ways). A future change to one must update the other by hand; no shared-module mechanism exists for bash across the host/container split, and inventing one is disproportionate to a 12-token regex. |
| Deploy/self-update | `scripts/unstick-cron.sh`'s content changes ship via the existing self-update tick (git pull + `reset --hard`) exactly like any other tracked file — no new deploy step. Only the new `.env` var needs a `deploy.sh`-driven (or manual, box-side, before the next real deploy) write. |

## 6. Explicitly out of scope

- Changing the detection thresholds (`timeout+20m`, `>15m` wedge, `<3h` error window) — proposal says so
  explicitly; this spec inherits them unchanged.
- A cross-tick cap on repeated requeues of a persistently-failing lineage (§2 rationale) — a real
  improvement, not requested by this proposal's DoD, and adjacent to the threshold boundary that's
  explicitly out of scope.
- Wiring `/budget` into Class B (token-budget-governance spec's own DoD line) — that spec's `/budget`
  endpoint does not exist in code yet; nothing to wire against (see §5 alert).
- Fixing `FACTORY_HOOK_SECRET`'s absence from `deploy.sh`'s heredoc (§4 Slice 4 note) — pre-existing,
  unrelated file region, not required for this spec's credential to work.
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
2. Slice 2's fixture-driven dry run (§4 Slice 2 DoD) correctly classifies all six fixture rows,
   including routing `resume checkout failed` to the unmatched bucket rather than auto-requeuing it.
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
