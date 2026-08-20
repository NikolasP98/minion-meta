---
id: 2026-08-20-handoff-minion-factory-1487584490-spec
title: "Cross-tick requeue cap for a persistently-failing unstick-cron lineage"
stage: spec
status: draft
pass: 1
created: 2026-08-20
updated: 2026-08-20
proposal: handoff-minion-factory-1487584490
verdict: pending
repos: [minion-factory]
relationship: extends
related: [2026-08-18-factory-deterministic-unstick-spec, 2026-08-17-factory-deterministic-unstick, 2026-08-18-factory-controller-completion-invariants]
type: fix
tags: [infra, logic]
---

# Cross-tick requeue cap for a persistently-failing unstick-cron lineage

**Owner surface:** `minion-factory` (`NikolasP98/minion-factory`, private, default branch `main`) —
`scripts/unstick-cron.sh` only. `test/fixtures/unstick-runs-lineage.json` (new) and
`runner/src/unstick-classifier.test.ts` (extended). No other file in the repo, and no other repo,
has a required change.

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
  that follow-up.
- `2026-08-17-factory-deterministic-unstick` (source proposal for the spec above) — not a duplicate
  target for *this* proposal; it is the ancestor proposal whose shipped spec created the gap this
  proposal's marker describes. The handoff proposal's own reconciliation note already draws this
  link and correctly holds it at `review`, off-limits to edit.
- [`2026-08-18-factory-controller-completion-invariants`](2026-08-18-factory-controller-completion-invariants.md)
  — disjoint, cited only to prevent confusion: it documents *"immutable root-lineage retry limits"*
  for the controller's dev-loop PR-review retries (a different subsystem, different files —
  controller/runner dev-dispatch code, not `scripts/unstick-cron.sh`). No file overlap; that spec's
  `pr` is still open and unmerged, so nothing there can be reused here even by reference — the
  cap this spec adds is scoped entirely to run-level lineages inside the hourly unstick sweep.

## 0. Problem (from the approved proposal, quoting the live `TODO(handoff)` marker)

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
  `runner/src/unstick-classifier.test.ts` (script-invoking, fixture-driven, `--dry-run` only) and its
  two fixtures (`test/fixtures/unstick-runs.json`, `unstick-queue-wedged.json`) contain only
  `requeue_of: null` rows — every scenario is a first-time failure.
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
- The walk is bounded (hard stop at `LINEAGE_CAP + 1` hops) so a corrupted or — impossible under the
  schema's immutability, but defended anyway — cyclic chain can never spin the cron.
- **Invariant:** once a lineage has already been auto-requeued `LINEAGE_CAP` times (a fixed
  constant, `LINEAGE_CAP=5`, chosen to match the existing per-invocation facilitator cap the prior
  spec's design section cites as precedent — *"only a 5-per-invocation cap inside one prompt"*), the
  script **never** issues another `POST /runs/:id/requeue` or `POST /runs/:id/cancel` for that
  lineage. It instead files exactly one `unstick-lineage-capped-<id>` monitor event per stuck row at
  cap (same dedupe-per-fingerprint property as every other class) and takes no run-mutating action —
  mirroring the existing Class B "monitor only, no run-level action" precedent (`:294-301`).
- A capped hit is **not** added to `NEEDS_FACILITATOR` — the failure mode is already fully diagnosed
  (it is a known, matched signature that has now exhausted its automatic remedy budget); spawning an
  LLM turn to re-diagnose "still broken after 5 tries" spends a container for no new information. A
  human reads the monitor event.
- A lineage below the cap keeps behaving exactly as today (§1) — this is strictly additive: the only
  observable change for a shallow (first-through-fourth-generation) failure is one extra `depth=`
  log field and, for the cap check, zero to a few extra `GET /runs/:id` calls that a healthy queue
  never triggers (all recent-batch hits resolve locally with no extra network round trip).
- **Compatibility requirement:** the existing two fixtures and their fourteen assertions in
  `unstick-classifier.test.ts` keep passing unmodified — every row in both fixtures has
  `requeue_of: null`, so `depth=0 < LINEAGE_CAP` for all of them and the new check is a no-op on
  that path.
- **No server-side change.** The `POST /runs/:id/requeue` endpoint, its 409 semantics, `requeue_of`
  immutability, and the `GET /runs` / `GET /runs/:id` contracts are all unchanged — the marker names
  `scripts/unstick-cron.sh` as the owner surface, and the cap is enforceable entirely from data the
  runner already exposes. (A server-side enforcement layer was considered and rejected — see §6.)
- The `TODO(handoff):` comment block (`:110-118`) is deleted once the cap it describes exists.

## 3. DELTA — numbered transitions, each mapped to a slice and its proving test

| # | Transition | Slice | Proving test |
|---|---|---|---|
| D1 | `unstick-cron.sh` gains a `lineage_depth()` helper that walks `requeue_of` backward from a given id, local-batch-first with a `GET /runs/:id` fallback, bounded at `LINEAGE_CAP + 1` hops | S1 | New unit assertions in `unstick-classifier.test.ts` (§4, cases 1-2) exercise both the local-batch path and the fallback path and assert the returned depth |
| D2 | Fixture `curl()` stub gains a `*/runs/*` (single-id) case answering from `.runs[]` union `.ancestors[]` in the active fixture, 404 when absent | S1 | Same new test cases fail without this (fallback lookups return the unhandled-stub `000` and the depth walk cannot proceed past the batch edge) and pass with it |
| D3 | Class A (`:231-238`) and every matched Class C signature branch (`:279-285`) call `lineage_depth()` before `requeue_run()`/`cancel_run()` and skip the remedy — filing `unstick-lineage-capped-<id>` instead — when `depth >= LINEAGE_CAP` | S2 | New fixture `unstick-runs-lineage.json` (§4, case 3): a 5-generation-deep Class C chain is capped (no `would POST .../requeue` line, one `unstick-lineage-capped-` fingerprint), a fresh 0-depth row in the same fixture still requeues normally |
| D4 | A capped hit is excluded from `NEEDS_FACILITATOR` | S2 | Same fixture: `NEEDS_FACILITATOR`/"need the advisory facilitator" line does not name the capped id; `no facilitator spawned` when it is the only hit |
| D5 | Existing two fixtures' behavior is unchanged | S2 (regression) | `unstick-classifier.test.ts`'s existing two tests pass unmodified — run as part of the same `npm test` invocation, not skipped |
| D6 | `TODO(handoff):` block removed | S2 | `grep -c 'TODO(handoff)' scripts/unstick-cron.sh` returns `0` |

## 4. Slice 0 — recon and collision gate (prepend to Slice 1)

```bash
gh api repos/NikolasP98/minion-factory/commits/main --jq '.sha'
for p in scripts/unstick-cron.sh runner/src/index.ts runner/src/db.ts runner/src/unstick-classifier.test.ts \
  test/fixtures/unstick-runs.json test/fixtures/unstick-queue-wedged.json; do
  gh api "repos/NikolasP98/minion-factory/contents/$p?ref=main" --jq '.sha + "  " + .path'
done
```

Confirm `requeue_run()`/`cancel_run()`/the Class A/C branches still read as quoted in §1, the
`TODO(handoff)` block is still at `:110-118`, and `GET /runs` / `GET /runs/:id` still behave as
quoted. If any of these drifted (another factory spec landed first), update this spec's line
references and diffs to match live code — do not implement the stale excerpts.

## 5. Slices

### Slice 1 — lineage-depth helper + fixture-stub support for single-run lookups (2-3h, tag `logic`)

**Files:** `scripts/unstick-cron.sh`, `runner/src/unstick-classifier.test.ts`.

- Add a `LINEAGE_CAP=5` constant near the top of the script (alongside `TIMEOUT_MIN`), with a
  one-line comment citing the 5-per-invocation facilitator-prompt precedent this spec's §2 quotes.
  Not env-configurable — a fixed constant keeps this slice inside the existing `.env`/`deploy.sh`
  house rule (*"no new `.env` variable may be hand-added on the box... must live in deploy.sh's
  heredoc"*, `2026-08-18-factory-deterministic-unstick-spec` design-ancestors note) without adding a
  new heredoc entry for a knob nothing has asked to tune yet; a follow-up may promote it to an env
  var if an operator needs a different value.
- Before the classification `while` loop (`:225`), build a local id→parent map from the already
  fetched `${runs}` JSON: `declare -A LOCAL_PARENT=()`, populated via
  `jq -r '.runs[] | [.id, (.requeue_of // "")] | @tsv' <<<"${runs}"`.
- Add `lineage_depth()`: given a run id, walk backward — check `LOCAL_PARENT` first; if the id is
  absent from that map (batch-edge case, §1/§2), call `api GET "/runs/${id}"` and read
  `.requeue_of` from the response (empty/absent or non-2xx status stops the walk, treating the
  resolved prefix as the depth rather than failing the whole tick). Stop at `LINEAGE_CAP + 1` hops
  regardless of whether a root was reached. Echo the integer depth (root run = `0`).
- Extend the fixture `curl()` stub (`:36-54`, inside `if [ -n "${FIXTURE}" ]`): add a case matching
  `*/runs/*` (ordered **after** the existing `*/runs/*/log*` case so log-tail requests still match
  first, **before** the catch-all) that looks up
  `jq -c --arg id "$id" '(.runs + (.ancestors // [])) | map(select(.id == $id)) | .[0] // empty'`
  against the active `${FIXTURE}` file, printing the row + `200` if found or an error body + `404`
  otherwise. This models the real endpoint's actual reach (no `LIMIT`, resolves any id) using a
  fixture-local `ancestors` array for rows deliberately excluded from the fixture's main `.runs[]`
  list to simulate the top-50 truncation edge case.

**DoD (Tier A — fixture-driven, no runner/box needed):**

```bash
bash -n scripts/unstick-cron.sh
cd runner && npm run typecheck   # no runner source changed, but this slice's test file lives here
npm test -- unstick-classifier   # new depth-helper unit assertions (add as two new `test(...)` blocks):
#   1. a run present in `.runs[]` with a 3-hop requeue_of chain fully inside the same array
#      resolves depth=3 with zero fallback GET /runs/:id calls (assert no "GET /runs/" log line
#      besides the initial batch fetch and any /log calls the existing scenarios already make)
#   2. a run whose immediate parent is NOT in `.runs[]` but IS in the fixture's `.ancestors[]`
#      resolves the correct total depth via the new stub case, and a request for an id in neither
#      array 404s and the walk stops there rather than hanging or erroring the whole script
```

### Slice 2 — cap enforcement in the remedy branches + fixture proving the capped path (2-4h, tag `logic`)

**Files:** `scripts/unstick-cron.sh`, `test/fixtures/unstick-runs-lineage.json` (new),
`runner/src/unstick-classifier.test.ts`.

- In the Class A branch (`:231-238`): compute `depth=$(lineage_depth "${id}")` before calling
  `cancel_run`/`requeue_run`. If `depth -ge LINEAGE_CAP`, log
  `run=${id} class=A lineage depth=${depth} >= cap=${LINEAGE_CAP} — NOT requeuing, needs a human`,
  call `monitor "unstick-lineage-capped-${id}" "Persistently-failing lineage hit the requeue cap" "class=A depth=${depth} cap=${LINEAGE_CAP}; note=${note}"`, and skip straight to the next stuck
  row (no cancel, no requeue).
- In each matched Class C signature branch (`:279-285`, after `signature`/`fingerprint` are set and
  before `requeue_run "${id}"`): same depth check, same skip-and-monitor behavior, with `class=C
  signature=${signature}` in the log line and monitor detail instead of `class=A`.
- Both cap-hit paths must **not** append to `NEEDS_FACILITATOR` (D4) — they `continue` the loop like
  the existing `deferred` signature branch does (`:270-273`), not fall through to the unmatched path.
- Remove the `TODO(handoff):` comment block (`:110-118`); replace it with a short comment describing
  the cap that now exists (what `LINEAGE_CAP` means and where it's enforced), so a future reader
  isn't left with dangling context.
- New fixture `test/fixtures/unstick-runs-lineage.json`: a `runs` array containing (a) one Class C
  `error` row at depth 5 (its `requeue_of` chain, walkable via `.runs[]` plus this fixture's
  `ancestors[]` for the older hops, has exactly 5 prior generations, all matching the same
  `clone failed (3 tries)` signature so the only variable under test is depth) with no descendant of
  its own, and (b) one **fresh** Class C row of a different signature (`requeue_of: null`, depth 0)
  to prove the cap is per-lineage-depth, not global-once-any-lineage-caps.

**DoD (Tier A — fixture-driven):**

```bash
bash -n scripts/unstick-cron.sh
grep -c 'TODO(handoff)' scripts/unstick-cron.sh   # must print 0
FACTORY_UNSTICK_FIXTURE=test/fixtures/unstick-runs-lineage.json \
  scripts/unstick-cron.sh --dry-run > /tmp/unstick-lineage-dry-run.log
cat /tmp/unstick-lineage-dry-run.log
grep -q 'lineage depth=5 >= cap=5' /tmp/unstick-lineage-dry-run.log
grep -q 'fingerprint=unstick-lineage-capped-' /tmp/unstick-lineage-dry-run.log
# the depth-5 id must never reach a requeue attempt:
capped_id=$(jq -r '.runs[] | select(.note == "clone failed (3 tries)" and .requeue_of != null) | .id' \
  test/fixtures/unstick-runs-lineage.json | head -1)
! grep -q "would POST /runs/${capped_id}/requeue" /tmp/unstick-lineage-dry-run.log
# the fresh row must still requeue normally:
grep -q 'would POST /runs/.*requeue' /tmp/unstick-lineage-dry-run.log
# capped id excluded from the facilitator handoff:
! grep -q "need the advisory facilitator: ${capped_id}" /tmp/unstick-lineage-dry-run.log
cd runner && npm test -- unstick-classifier
# regression: the two pre-existing fixtures still pass unmodified (part of the same test file)
```

## 6. Design alternatives considered and rejected

- **Server-side enforcement** (a `generation`/`requeue_count` column on `runs`, checked inside
  `POST /runs/:id/requeue`) would also close the gap and would protect every future caller of that
  endpoint, not just this cron. Rejected for this spec: the proposal's marker and DoD name
  `scripts/unstick-cron.sh` as the sole owner surface; a schema migration, an endpoint contract
  change (a new 409 reason plus, almost certainly, an operator override path so a human who fixed
  the root cause can still force one more requeue), and `runner/src/index.test.ts` coverage would
  roughly double this slice's size for a property the proposal doesn't ask for (protecting hypothetical
  future callers). If a second caller of `/runs/:id/requeue` is ever added, revisit this — flagged
  here rather than silently dropped.
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
| `2026-08-17-factory-token-budget-governance-spec`'s deferred `/budget`-into-Class-B integration (noted as still-unbuilt by the deterministic-unstick spec, §5 alert there) | Unaffected — this spec's cap applies after Class A/C signature matching, not to Class B's budget-pause check; no new coupling introduced. |
| Any future second caller of `POST /runs/:id/requeue` | Would not inherit this cap (§6, rejected server-side alternative) — flagged, not mitigated here, since no such caller exists today. |
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
- Any change to `agent/unstick.sh`, the facilitator's Docker invocation, or its credential scope —
  untouched by this spec.

## 9. End-to-end acceptance

From a clean clone of the merge commit:

```bash
cd runner && npm ci && npm run typecheck && npm test -- unstick-classifier
bash -n scripts/unstick-cron.sh
grep -c 'TODO(handoff)' scripts/unstick-cron.sh   # 0
```

Then, in order:

1. Slice 1's two new depth-helper unit assertions pass (§5 Slice 1 DoD): local-batch resolution
   needs zero fallback calls; the `.ancestors[]`-only case correctly falls back and resolves; an
   unresolvable id stops the walk instead of hanging or aborting the tick.
2. Slice 2's fixture-driven dry run (§5 Slice 2 DoD) correctly caps the depth-5 lineage (no requeue
   attempt, exactly one `unstick-lineage-capped-<id>` monitor event, excluded from the facilitator
   handoff) while a fresh depth-0 row in the same run still requeues normally.
3. Both pre-existing fixtures (`unstick-runs.json`, `unstick-queue-wedged.json`) still pass every one
   of their current assertions unmodified, in the same `npm test` invocation as the new cases (D5).
4. Diff review confirms the `TODO(handoff):` block is gone and no other file in the repo changed.

Only then is the marker's DoD satisfied: the persistently-failing-lineage churn the proposal
describes stops after `LINEAGE_CAP` generations, every capped hit is board-visible via its own
monitor fingerprint exactly like every other class, and no LLM turn is spent re-diagnosing a failure
the classifier already matched and already tried to fix.
