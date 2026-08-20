---
id: 2026-08-20-handoff-minion-factory-1487584490-spec
title: "Cross-tick requeue cap for a persistently-failing unstick-cron lineage"
stage: spec
status: approved
pass: 2
created: 2026-08-20
updated: 2026-08-20
proposal: handoff-minion-factory-1487584490
verdict: approved
repos: [minion-factory]
relationship: extends
related: [2026-08-18-factory-deterministic-unstick-spec, 2026-08-17-factory-deterministic-unstick, 2026-08-18-factory-controller-completion-invariants]
type: fix
tags: [infra, logic]
---

# Cross-tick requeue cap for a persistently-failing unstick-cron lineage

**Owner surface:** `minion-factory` (`NikolasP98/minion-factory`, private, default branch `main`) —
production behavior changes only in `scripts/unstick-cron.sh`; test coverage adds
`test/fixtures/unstick-runs-lineage.json` and extends `runner/src/unstick-classifier.test.ts`. No
other file in the repo, and no other repo, has a required change.

**Live baseline reviewed:** `minion-factory/main`, fetched 2026-08-20 via `gh api
repos/NikolasP98/minion-factory/contents/...`. Quoted line numbers below are from that fetch;
re-verify against current `main` before implementing (Slice 0 recon gate) since this is a live,
self-updating box repo.

## Relationship to existing artifacts

- [`2026-08-18-factory-deterministic-unstick-spec`](2026-08-18-factory-deterministic-unstick-spec.md)
  (`extends`) — `status: done`, merged via PR #18. That spec rewrote `scripts/unstick-cron.sh` into
  the deterministic classifier this spec modifies, and its own §2/§6 explicitly named and deferred
  the exact gap this spec closes: *"No new cap on repeated requeues of a persistently-failing
  lineage... flagged as a follow-up, not built here"* and, in scope, *"A cross-tick cap on repeated
  requeues of a persistently-failing lineage... is not what the proposal's DoD asks for."* That
  spec's own review sidecar (`.review.md`) confirms: *"The spec retains two explicit follow-ups:
  integrate `/budget`... and separately decide whether to add a lineage-level requeue cap."* This is
  the latter follow-up; the `/budget` integration has since shipped and is preserved here (§7).
- `2026-08-17-factory-deterministic-unstick` (source proposal for the spec above) — not a duplicate
  target for *this* proposal; it is the ancestor proposal whose shipped spec created the gap this
  proposal's marker describes. The handoff proposal's reconciliation note already draws this link;
  its current frontmatter is now `status: in-spec`, and it remains off-limits to edit here.
- [`2026-08-18-factory-controller-completion-invariants`](2026-08-18-factory-controller-completion-invariants.md)
  — disjoint, cited only to prevent confusion: it documents *"immutable root-lineage retry limits"*
  for the controller's dev-loop PR-review retries (a different subsystem, different files —
  controller/runner dev-dispatch code, not `scripts/unstick-cron.sh`). No file overlap; that spec's
  `pr` is still open and unmerged, so nothing there can be reused here even by reference — the
  cap this spec adds is scoped entirely to run-level lineages inside the hourly unstick sweep.

**Operator-memory constraints:** `/memory/MINION/sdlc-board-triage-and-phase-gates.md` records that
the hourly unstick cron is deterministic before it invokes the facilitator, that `requeue_of` was
introduced specifically because mutable `note` text could not enforce requeue identity, that canceled
runs are operator decisions and must not be resurrected, and that a bad requeue strategy previously
churned hourly across generations. Those records shape this spec's fail-closed ancestry rule and its
requirement that a capped Class A run is neither canceled nor requeued. The same topic records the
factory as self-updating from tracked `main`, which supports the no-`deploy.sh` impact assessment in
§7. `/memory/MINION/factory/2026-08-19-c92fef82.md` additionally requires collision review by behavior,
not merely by file, when concurrent factory work relocates or changes unstick logic. The requested
SQLite FTS database was absent at `/home/agent/.claude-mem/claude-mem.db`, and no semantic
memory-search MCP tool was exposed in this review session; neither limitation leaves a decision gap.

## 0. Product

> `NikolasP98/minion-factory@main scripts/unstick-cron.sh:110` — there is no CROSS-TICK cap on
> requeuing a persistently-failing lineage.
>
> **Definition of done:** the marker's open end is resolved and the `TODO(handoff):` comment
> removed.

The marker text at the live baseline (`scripts/unstick-cron.sh:110-118`), verbatim:

```
# TODO(handoff): there is no CROSS-TICK cap on requeuing a persistently-failing
# lineage. Each tick's requeue makes a fresh run id, so the next tick sees a new
# un-requeued error row and remedies it again — a permanently broken clone target
# or a dead credential churns one generation per hour, forever. This is inherited
# behavior, not a regression (the LLM path had no cap either), and is deliberately
# deferred: 2026-08-18-factory-deterministic-unstick-spec §2 and §6 rule it out of
# scope as adjacent to the detection thresholds the proposal froze. Every
# generation files its own dedupe-visible monitor event, so the churn is at least
# board-visible. A cap needs its own proposal.
```

## 1. AS-IS — current verified behavior (`scripts/unstick-cron.sh` at the live baseline)

- **Detection** (`unstick-cron.sh:200-213`) classifies every `error` row less than 3h old as
  "stuck" unless its id already appears as some other row's `requeue_of` (or the legacy
  `note = 'requeue of <id>'` string) — i.e. it excludes a row **only if it already has an immediate
  descendant**, not if its lineage is long.
- **Remedy** (`unstick-cron.sh:280-285` for Class C, `:231-238` for Class A) calls
  `requeue_run()` (`:121-135`) unconditionally once a signature matches (or, for Class A, always).
  `requeue_run()` posts to `POST /runs/:id/requeue`.
- **The requeue endpoint** (`runner/src/index.ts:549-600`) enforces exactly one thing about
  repetition: *"idempotent (one requeue per origin, ever)"* (`:546-547`) — it 409s
  (`already requeued as <id>`) if **this specific run id** already has a child, but a **child that
  later also errors is a brand-new id with no descendant of its own**, so it passes the same check
  and gets requeued again. The endpoint has no concept of how many prior generations an id's
  lineage already carries; `requeue_of` (`runner/src/db.ts:17`, `runner/src/queue.ts:855`) points
  only to the immediate parent, one hop, forever mutable-appending but individually immutable.
- **Lineage evidence exists but is unindexed for depth.** `requeue_of` is a plain linked list
  threaded through the `runs` table. Walking it requires either scanning the already-fetched batch
  (`GET /runs`, `runner/src/index.ts:527-530` — `SELECT * FROM runs ORDER BY created_at DESC LIMIT
  50`) or one `GET /runs/:id` call (`:532-536`, no `LIMIT`, always resolves by id) per hop.
- **Consequence (the marker's claim, verified, not paraphrased):** a lineage whose root cause never
  clears (dead credential, permanently broken clone target, a task that always exceeds
  `timeout+20m`) gets exactly one fresh `POST /runs/:id/requeue` **per hourly tick, forever**. Each
  generation is dedupe-visible on the monitor board (`unstick-<class>-<newRunId>`, a distinct
  fingerprint per new id — `monitor.ts`'s dedupe keys on fingerprint, so it cannot collapse across
  ids), but nothing stops the churn itself.
- **`GET /runs`'s `LIMIT 50`** (`index.ts:528`) is a real edge case for any depth check built purely
  from that single fetched batch: if 50-or-more unrelated runs are created while one lineage is
  still short of a cap, its older generations age out of that response and a naive "scan the batch
  for `requeue_of`" walk silently undercounts. `GET /runs/:id` has no such limit and is the
  authoritative fallback (§2).
- **No existing test exercises repeated requeuing of the same lineage.**
  `runner/src/unstick-classifier.test.ts` (script-invoking, fixture-driven, `--dry-run` only) uses
  three fixtures: `test/fixtures/unstick-runs.json`, `unstick-queue-wedged.json`, and
  `unstick-queue-budget-paused.json`. Every row in all three has `requeue_of: null`, so every current
  remedy scenario is a first-time failure. The test file currently contains six test cases; counting
  an older subset of fixtures or assertions is not a stable compatibility contract.
- **`--dry-run` never calls the network for a mutating action.** `requeue_run()`/`cancel_run()`
  (`:121-146`) short-circuit to a logged "would POST..." line under `DRY_RUN=1` without invoking
  `api()`. Only the fixture-stubbed `curl()` (`:36-54`, active only when `FACTORY_UNSTICK_FIXTURE` is
  set) answers `GET` calls — `GET /runs` (list) and `GET /runs/:id/log*` (log tail) are stubbed
  today; a bare `GET /runs/:id` (single-row lookup) is **not** stubbed and falls through to the
  catch-all `{"error":"fixture stub: unhandled ..."}` / status `000` (`:52`).

## 2. TO-BE — target behavior and invariants

- `scripts/unstick-cron.sh` computes, for every run it is about to auto-remedy (Class A cancel+
  requeue, and every matched Class C signature), the number of prior generations in that run's
  `requeue_of` lineage — walking backward from the run's own id, hop by hop, to the root
  (`requeue_of == null`).
- The walk resolves each hop from the already-fetched `GET /runs` batch first (the common case: a
  lineage short enough to matter is, by construction, recent and almost always inside the last-50
  window) and falls back to one `GET /runs/:id` call per hop only when a parent id is absent from
  that batch — correct even when the `LIMIT 50` truncation (§1) would otherwise hide an older
  generation.
- The walk stops as soon as it reaches `LINEAGE_CAP` prior generations; it never needs to fetch an
  older parent once the cap is proven. A cyclic chain is therefore bounded by the same limit and can
  never spin the cron.
- If a parent required to decide whether depth is below the cap cannot be resolved with a 2xx,
  well-formed `GET /runs/:id` response, ancestry is **unknown** and the script fails closed: it issues
  neither cancel nor requeue, files one `unstick-lineage-unknown-<id>` monitor request for that
  classification, and does not add the id to `NEEDS_FACILITATOR`. Treating the resolved prefix as the
  full depth would contradict the cap invariant during a transient API failure or a missing row.
- **Invariant:** once a lineage already has `LINEAGE_CAP` `requeue_of` hops (a fixed
  constant, `LINEAGE_CAP=5`, chosen to match the existing per-invocation facilitator cap the prior
  spec's design section cites as precedent — *"only a 5-per-invocation cap inside one prompt"*), the
  script **never** issues another `POST /runs/:id/requeue` or `POST /runs/:id/cancel` for that
  lineage. Because the current schema does not record which caller created a requeue, the cap counts
  every immutable `requeue_of` hop, whether created by this cron or by a manual/other caller; it must
  not be described or tested as an auto-requeue-only count. At cap, the script makes exactly one
  `unstick-lineage-capped-<id>` monitor request per classification; the endpoint dedupes repeated
  hourly requests with the same fingerprint into one board artifact. It takes no run-mutating action,
  mirroring the existing Class B "monitor only, no run-level action" precedent (`:294-301`).
- A capped or ancestry-unknown hit is **not** added to `NEEDS_FACILITATOR` — the former is already
  fully diagnosed, while the latter is a deterministic API/data-integrity failure rather than an
  unknown run signature. In both cases a human reads the monitor event. A capped hit is a known,
  matched signature that has exhausted its automatic remedy budget, so spawning an LLM turn to
  re-diagnose "still broken after 5 tries" spends a container for no new information.
- A lineage below the cap keeps behaving exactly as today (§1) — this is strictly additive: the only
  observable change for a shallow (depth 0 through 4) failure is one extra `depth=`
  log field and, for the cap check, zero to a few extra `GET /runs/:id` calls that a healthy queue
  never triggers (all recent-batch hits resolve locally with no extra network round trip).
- **Compatibility requirement:** all six existing test cases and all three existing fixtures in
  `unstick-classifier.test.ts` keep passing unmodified — every row in those fixtures has
  `requeue_of: null`, so `depth=0 < LINEAGE_CAP` for every current remedy and the new check is a no-op
  on that path. The existing budget-paused Class B carve-out remains unchanged.
- **No server-side change.** The `POST /runs/:id/requeue` endpoint, its 409 semantics, `requeue_of`
  immutability, and the `GET /runs` / `GET /runs/:id` contracts are all unchanged — the marker names
  `scripts/unstick-cron.sh` as the owner surface, and the cap is enforceable entirely from data the
  runner already exposes. (A server-side enforcement layer was considered and rejected — see §6.)
- The `TODO(handoff):` comment block (`:110-118`) is deleted once the cap it describes exists.

## 3. DELTA — numbered transitions, each mapped to a slice and its proving test

| # | Transition | Slice | Proving test |
|---|---|---|---|
| D1 | `unstick-cron.sh` gains a `lineage_depth()` helper that walks `requeue_of` backward from a given id, local-batch-first with a `GET /runs/:id` fallback, and stops once `LINEAGE_CAP` is proven | S1 | New assertions in `unstick-classifier.test.ts` exercise local-only and fallback chains, assert the logged depth, and inspect the fixture lookup trace to prove which single-run GETs occurred |
| D2 | Fixture `curl()` gains a `*/runs/*` GET case answering from `.runs[]` union `.ancestors[]`, 404 when absent, plus a fixture-mode-only lookup trace | S1 | The fallback test names its expected lookup sequence; the local-only test asserts none of its parent ids were fetched individually |
| D3 | An unresolved/malformed parent before the cap fails closed with `unstick-lineage-unknown-<id>`, no run mutation, and no facilitator handoff | S1 | One fixture row points to an absent id and another resolves to an ancestor with an invalid `requeue_of` type; tests assert one unknown-lineage monitor request and no cancel/requeue/facilitator entry for each |
| D4 | Class A (`:231-238`) and matched Class C (`:279-285`) call `lineage_depth()` before any cancel/requeue and skip the remedy — filing `unstick-lineage-capped-<id>` instead — at depth `LINEAGE_CAP` | S2 | `unstick-runs-lineage.json` contains separate depth-5 Class A and Class C rows; tests assert exactly one capped monitor request per id and no cancel or requeue for either, while a named depth-0 row still requeues |
| D5 | Capped and ancestry-unknown hits are excluded from `NEEDS_FACILITATOR` | S2 | Same fixture: none of the capped or ancestry-unknown ids appears in a facilitator handoff, and the run ends with `no facilitator spawned` because every fixture hit is matched, capped, or ancestry-unknown |
| D6 | All six existing classifier tests across all three existing fixtures remain unchanged and pass | S2 (regression) | Full `npm test` runs the unchanged cases together with the new lineage cases |
| D7 | The one baseline `TODO(handoff):` block is removed | S2 | Slice 0 asserts exactly one matching baseline marker; final verification uses `! grep -q 'TODO(handoff)' scripts/unstick-cron.sh` |

## 4. Slice 0 — recon and collision gate (prepend to Slice 1)

```bash
gh api repos/NikolasP98/minion-factory/commits/main --jq '.sha'
for p in scripts/unstick-cron.sh runner/src/index.ts runner/src/db.ts runner/src/unstick-classifier.test.ts \
  test/fixtures/unstick-runs.json test/fixtures/unstick-queue-wedged.json \
  test/fixtures/unstick-queue-budget-paused.json; do
  gh api "repos/NikolasP98/minion-factory/contents/$p?ref=main" --jq '.sha + "  " + .path'
done
```

Confirm `requeue_run()`/`cancel_run()`/the Class A/C branches still read as quoted in §1, the
`TODO(handoff)` block is still at `:110-118`, and `GET /runs` / `GET /runs/:id` still behave as
quoted. If any of these drifted (another factory spec landed first), update this spec's line
references and diffs to match live code — do not implement the stale excerpts.

Also assert that the target block is the only current handoff marker before deleting it:

```bash
[ "$(grep -c 'TODO(handoff)' scripts/unstick-cron.sh)" -eq 1 ]
grep -q 'there is no CROSS-TICK cap on requeuing' scripts/unstick-cron.sh
```

If either assertion fails, stop and reconcile the marker set; deleting a different/new marker does
not satisfy this proposal.

## 5. Slices

### Slice 1 — lineage-depth helper + fixture-stub support for single-run lookups (2-3h, tag `logic`)

**Files:** `scripts/unstick-cron.sh`, `test/fixtures/unstick-runs-lineage.json` (new),
`runner/src/unstick-classifier.test.ts`.

- Add a `LINEAGE_CAP=5` constant near the top of the script (alongside `TIMEOUT_MIN`), with a
  one-line comment citing the 5-per-invocation facilitator-prompt precedent this spec's §2 quotes.
  Not env-configurable — a fixed constant keeps this slice inside the existing `.env`/`deploy.sh`
  house rule (*"no new `.env` variable may be hand-added on the box... must live in deploy.sh's
  heredoc"*, `2026-08-18-factory-deterministic-unstick-spec` design-ancestors note) without adding a
  new heredoc entry for a knob nothing has asked to tune yet; a follow-up may promote it to an env
  var if an operator needs a different value.
- Before the classification `while` loop (`:225`), build a local id→parent map from the already
  fetched `${runs}` JSON: `declare -A LOCAL_PARENT=()`, populated via
  `jq -r '.runs[] | [.id, (.requeue_of // "")] | @tsv' <<<"${runs}"`. The lookup must distinguish
  an id present with an empty parent (a known root) from an id absent from the map; empty must not
  trigger a network fallback.
- Add `lineage_depth()`: given a run id, walk backward — check `LOCAL_PARENT` first; if the id is
  absent from that map (batch-edge case, §1/§2), call `api GET "/runs/${id}"` and read
  `.requeue_of` from the response. A 2xx object with a string parent or explicit `null` is valid;
  non-2xx, non-object JSON, or a missing/non-string/non-null `requeue_of` before the cap makes the
  ancestry unknown. Echo the resolved integer depth (root run = `0`) and return success for a known
  root or once depth reaches `LINEAGE_CAP`; return nonzero for unknown ancestry. Call sites must use
  `if depth=$(lineage_depth "${id}"); then ... else ... fi` so the nonzero result is handled rather
  than aborting or being mistaken for a shallow lineage. Suppress `api()`'s diagnostic stdout inside
  the helper (the caller emits the ancestry-unknown log) so command substitution contains only the
  integer even on a failed lookup.
- Extend the fixture `curl()` stub (`:36-54`, inside `if [ -n "${FIXTURE}" ]`): add a case matching
  GET `*/runs/*` (ordered **after** the existing `*/runs/*/log*` case so log-tail requests still match
  first, **before** the catch-all) that looks up
  `jq -c --arg id "$id" '(.runs + (.ancestors // [])) | map(select(.id == $id)) | .[0] // empty'`
  against the active `${FIXTURE}` file, printing the row + `200` if found or an error body + `404`
  otherwise. This models the real endpoint's actual reach (no `LIMIT`, resolves any id) using a
  fixture-local `ancestors` array for rows deliberately excluded from the fixture's main `.runs[]`
  list to simulate the top-50 truncation edge case.
- Add a fixture-mode-only `FACTORY_UNSTICK_TRACE_FILE` test hook beside the existing fixture hooks.
  When set, the fixture `curl()` appends each single-run GET path to that file. The real cron never
  sets it; tests use a unique temporary file and remove it in cleanup. This makes the local-first and
  fallback requirements observable instead of inferring them from a depth that either path could
  produce.
- Wire the helper into Class A before `cancel_run()` and into matched Class C after signature
  classification but before `requeue_run()`. Log `lineage depth=<n>` for known ancestry. In this
  slice, a known depth continues to the existing remedy unchanged; an unknown result takes the
  `unstick-lineage-unknown-<id>` monitor-only path defined in D3. Slice 2 adds the numeric cap branch
  between those two outcomes.
- Create `unstick-runs-lineage.json` in this slice with pinned `now`, a `.runs[]` local-only depth-3
  Class C chain, a matched Class C row whose older parents live in `.ancestors[]`, and a matched
  Class C row whose immediate parent is absent from both arrays. Add a second matched row whose
  looked-up ancestor has a non-string/non-null `requeue_of` to prove response-shape validation.
  Slice 2 extends the same fixture with the capped Class A and named fresh-row scenarios; it does not
  introduce a second lineage fixture.

**DoD (Tier A — fixture-driven, no runner/box needed):**

```bash
bash -n scripts/unstick-cron.sh
(cd runner && npm run typecheck)
(cd runner && node --import tsx --test src/unstick-classifier.test.ts)
# New assertions:
#   1. the local-only row logs depth=3 and its three parent ids do not appear in the trace;
#   2. the batch-truncated row resolves through the exact `.ancestors[]` GET sequence and logs its
#      correct depth; and
#   3. the absent parent and malformed parent each produce one ancestry-unknown monitor request,
#      no cancel/requeue for either id, and no hang or script failure.
```

### Slice 2 — cap enforcement in the remedy branches + fixture proving the capped path (2-4h, tag `logic`)

**Files:** `scripts/unstick-cron.sh`, `test/fixtures/unstick-runs-lineage.json` (extended),
`runner/src/unstick-classifier.test.ts`.

- In the Class A branch (`:231-238`), extend Slice 1's pre-remedy depth handling: if
  `depth -ge LINEAGE_CAP`, log
  `run=${id} class=A lineage depth=${depth} >= cap=${LINEAGE_CAP} — NOT requeuing, needs a human`,
  call `monitor "unstick-lineage-capped-${id}" "Persistently-failing lineage hit the requeue cap" "class=A depth=${depth} cap=${LINEAGE_CAP}; note=${note}"`, and skip straight to the next stuck
  row (no cancel, no requeue).
- In each matched Class C signature branch (`:279-285`, after `signature`/`fingerprint` are set and
  before `requeue_run "${id}"`), add the same cap check to Slice 1's ancestry handling, with
  `class=C signature=${signature}` in the log line and monitor detail instead of `class=A`.
- Cap and ancestry-unknown paths must **not** append to `NEEDS_FACILITATOR` (D5) — they `continue` the
  loop like the existing `deferred` signature branch does (`:270-273`), not fall through to the
  unmatched path. Each path makes exactly one monitor call per classified row.
- Remove the `TODO(handoff):` comment block (`:110-118`); replace it with a short comment describing
  the cap that now exists (what `LINEAGE_CAP` means and where it's enforced), so a future reader
  isn't left with dangling context.
- Extend `test/fixtures/unstick-runs-lineage.json` with (a) one Class C `error` row at depth 5 (its
  `requeue_of` chain is walkable through `.ancestors[]`, with the current row matching
  `clone failed (3 tries)`) and no descendant of its own; (b) one Class A `running` row at depth 5;
  and (c) one named **fresh** matched Class C row (`requeue_of: null`, depth 0). The two capped rows
  prove both mutating branches stop before their first mutation; the fresh row proves the cap is
  per-lineage rather than global. Ancestor rows need not share the current row's signature because
  signature classification applies only to the current stuck row; their ids and parent links are the
  only lineage evidence under test.

**DoD (Tier A — fixture-driven):**

```bash
bash -n scripts/unstick-cron.sh
! grep -q 'TODO(handoff)' scripts/unstick-cron.sh
FACTORY_UNSTICK_FIXTURE=test/fixtures/unstick-runs-lineage.json \
  scripts/unstick-cron.sh --dry-run > /tmp/unstick-lineage-dry-run.log
cat /tmp/unstick-lineage-dry-run.log
grep -q 'lineage depth=5 >= cap=5' /tmp/unstick-lineage-dry-run.log
# The test suite, rather than these smoke greps, owns exact per-id counts and absence assertions.
(cd runner && npm test)
# Regression: all six pre-existing tests and all three pre-existing fixtures run unmodified.
```

## 6. Design alternatives considered and rejected

- **Server-side enforcement** (a `generation`/`requeue_count` column on `runs`, checked inside
  `POST /runs/:id/requeue`) would also close the gap and would protect every future caller of that
  endpoint, not just this cron. Rejected for this spec: the proposal's marker and DoD name
  `scripts/unstick-cron.sh` as the sole owner surface; a schema migration, an endpoint contract
  change (a new 409 reason plus, almost certainly, an operator override path so a human who fixed
  the root cause can still force one more requeue), and `runner/src/index.test.ts` coverage would
  roughly double this slice's size for a property the proposal doesn't ask for (enforcing the cap for
  manual or other callers). If caller-independent enforcement becomes required, revisit this —
  flagged here rather than silently dropped.
- **Computing depth purely from the batch `GET /runs` response, with no `GET /runs/:id` fallback**
  is simpler but silently undercounts once the `LIMIT 50` truncation (§1) hides an older generation
  — a real correctness gap for exactly the persistently-failing, many-generations lineages this cap
  exists to catch. Rejected.
- **Routing a capped lineage to the facilitator** instead of a monitor-only event was considered so a
  human gets an LLM's summary, not just a raw fingerprint. Rejected: the facilitator's own advisory
  prompt (`agent/unstick.sh`, per the prior spec) is designed to diagnose *unmatched* signatures: a
  capped hit is, by definition, a signature the classifier already matched and already tried the
  documented remedy for five times — there is nothing new for the model to discover, and spawning a
  container to say so again is a wasted turn under the same cost-discipline this repo's memory
  record (`minion-pricing-model-research.md`) already tracks for this subsystem.

## 7. Cross-project impact assessment

No `AGENTS.md` Cross-Project Impact Zones row matches this change: no gateway protocol, channel
extension, hub/site DB or auth, agent-definition format, UI, or Paperclip adapter surface is touched.
Blast radius is a single host-side cron script inside `minion-factory`, running with the pre-existing
`FACTORY_SECRET` it already holds — no new credential, no new endpoint, no new `.env` variable, no
`deploy.sh`/`setup.sh` edit, no crontab change.

| Surface | Impact / mitigation |
|---|---|
| `2026-08-18-factory-controller-completion-invariants` (PR #28, open/unmerged) | Disjoint files (controller dev-loop retry code vs. this spec's `scripts/unstick-cron.sh`). No ordering dependency either direction. |
| `2026-08-17-factory-token-budget-governance-spec`'s `/budget`-into-Class-B integration | Already present on the reviewed live baseline (`unstick-cron.sh:172-183`) and preserved. This spec's cap applies only before Class A/C mutation; it must not change the budget-paused Class B carve-out or its existing fixture/test. |
| Manual or other callers of `POST /runs/:id/requeue` | Do not inherit cron-side enforcement (§6). Their resulting immutable `requeue_of` hops still count when the cron later evaluates the lineage; this limitation is explicit rather than presented as caller-independent protection. |
| Self-update / deploy | Ships via the existing self-update tick (git pull + `reset --hard`) like any other tracked script file — no new secret or `.env` key means no deploy-gap window exists (contrast with the prior spec's `FACTORY_UNSTICK_SECRET` rollout, which needed a `deploy.sh` run before it worked; this change is live the instant the box pulls the new script). |

## 8. Explicitly out of scope

- Making `LINEAGE_CAP` operator-configurable via `.env`/`deploy.sh` — no operational need demonstrated
  yet; a fixed constant is the smallest correct fix (§5 Slice 1 rationale). A follow-up can promote it.
- Any server-side change to `POST /runs/:id/requeue`, `runs` schema, or `GET /runs`/`GET /runs/:id`
  (§6).
- Changing the existing detection thresholds (`timeout+20m`, `>15m` wedge, `<3h` error window) —
  still frozen by the original `2026-08-17-factory-deterministic-unstick` proposal; this spec adds a
  new, independent cap rather than touching any of those three numbers.
- A human-facing "reset this lineage's cap" affordance (e.g., a runner endpoint or CLI flag an
  operator uses after fixing the root cause) — today, an operator who fixes the underlying problem
  can already unstick a capped lineage by hand (`curl -X POST .../runs/:id/requeue` with the admin
  secret bypasses nothing new this spec adds, since the cap lives only in the cron script, not the
  endpoint — §6). No new UX is required to preserve that escape hatch; it already exists as a side
  effect of keeping enforcement host-side.
- Distinguishing cron-created requeues from manual or other callers' requeues. The current immutable
  lineage records parentage but not caller provenance, so this cap intentionally counts every
  `requeue_of` hop. Adding attribution would require a schema/endpoint contract change outside the
  proposal's owner surface.
- Any change to `agent/unstick.sh`, the facilitator's Docker invocation, or its credential scope —
  untouched by this spec.

## 9. End-to-end verification

From a clean clone of the merge commit:

```bash
(cd runner && npm ci && npm run typecheck && npm test)
bash -n scripts/unstick-cron.sh
! grep -q 'TODO(handoff)' scripts/unstick-cron.sh
```

Then, in order:

1. Slice 1's lineage-helper assertions pass (§5 Slice 1 DoD): the local-batch chain performs no
   single-run fallback calls; the `.ancestors[]`-only chain performs the expected calls and resolves;
   unresolvable and malformed parents each fail closed with exactly one unknown-lineage monitor
   request and no run mutation or facilitator handoff.
2. Slice 2's fixture-driven tests correctly cap both a depth-5 Class A lineage (no cancel or requeue)
   and a depth-5 Class C lineage (no requeue), issue exactly one capped monitor request per current
   stuck id, exclude both from facilitator handoff, and still requeue the named fresh depth-0 row.
3. All six pre-existing test cases across `unstick-runs.json`, `unstick-queue-wedged.json`, and
   `unstick-queue-budget-paused.json` retain their assertions unmodified and pass in the same full
   `npm test` invocation as the new cases (D6).
4. Diff review confirms the `TODO(handoff):` block is gone and no file outside the three declared
   owner files (`scripts/unstick-cron.sh`, the lineage fixture, and the classifier test) changed.

Only then is the marker's DoD satisfied: the persistently-failing-lineage churn the proposal
describes stops after `LINEAGE_CAP` requeue hops, every capped hit is board-visible via its own
monitor fingerprint exactly like every other class, and no LLM turn is spent re-diagnosing a failure
the classifier already matched and already tried to fix.
