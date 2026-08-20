---
id: 2026-08-17-factory-providers-put-harness-check-spec
title: "PUT /providers — reject provider names no harness implements"
stage: spec
status: done
pass: 2
created: 2026-08-17
updated: 2026-08-20
proposal: 2026-08-17-factory-providers-put-harness-check
verdict: approved
repos: [minion-factory]
tags: [logic]
type: fix
done_reason: "Verified complete on main: single validateRegistry for PUT+load with loud fallback, harness-drift test parsing run.sh/spec.sh case arms — subagent verification 2026-08-20."
---

# PUT /providers — reject provider names no harness implements

**Owner surface:** `minion-factory` (`NikolasP98/minion-factory`, private, default branch `main`) —
`runner/src/providers.ts`, `runner/src/index.ts`, `runner/src/queue.ts`, `runner/src/repos.ts`,
`runner/package.json`, `README.md`, plus two new test files. No file in any other repo changes; §4
says why `minion-base` — the one other caller of this endpoint — needs no edit.

**Design ancestors:**
[`2026-08-13-minion-factory-staged-harness-spec`](2026-08-13-minion-factory-staged-harness-spec.md)
established the two-harness contract this spec enforces: *"Harnesses: `claude` … and `codex` …
Model is a passthrough string — the runner never hardcodes model names."* That split (**harness =
implemented executor, closed set** · **model = free string, passthrough**) is correct and unchanged;
the provider registry added later simply never re-applied the first half.
[`2026-08-12-minion-factory-agent-pipeline-spec`](2026-08-12-minion-factory-agent-pipeline-spec.md)
§gates — the draft-PR-first design that makes this bug cost a PR husk, not just a failed run (§1).
[`2026-08-17-factory-token-budget-governance-spec`](2026-08-17-factory-token-budget-governance-spec.md)
— a container that boots, clones, pushes and dies on an unknown harness is exactly the burn class
that spec is calibrated against; this one removes a source of it at config time.

**Gate conventions:**
[`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b — both
slices are tagged `logic`, which means **red-state TDD (G3) is mandatory** (each DoD below carries a
proof that the new test fails before the change) and **no UI-governance checks apply** (zero
`.svelte` files in this repo). Not tagged `security`: the endpoint is already behind the fail-closed
bearer check (`runner/src/index.ts:34-42`) and this spec narrows what an *already authenticated*
admin can save. Not tagged `infra`: no deploy or workflow file changes.

---

## 0. Product

From the approved proposal `2026-08-17-factory-providers-put-harness-check`, verbatim:

> ## Problem
>
> runner/src/index.ts provider-name regex only; a bogus provider fails deep in-container instead of
> 400 at config time.
>
> ## Definition of done
>
> PUT validates names against the harness set; bogus name returns 400.
>
> ## Out of scope
>
> Dynamic harness plugins.

## 1. What the repo actually says today

`minion-factory` is **not checked out in this workspace** (it is a separate private repo; the
meta-repo tracks only orchestration, specs and packages). Every line quoted below was read from
`main` via `gh api repos/NikolasP98/minion-factory/contents/<path>` during spec authoring; the repo's
`pushed_at` at that moment was `2026-08-17T13:42:39Z`. **Re-read each file before editing** — line
numbers are as-of that read, not a guarantee (that is Slice 0).

**The hole, exactly.** `runner/src/index.ts:120-139` is the whole `PUT /providers` handler. Its only
name check is line 126:

```ts
if (!/^[a-z][a-z0-9-]{1,30}$/.test(name)) return void res.status(400).json({ error: `bad provider name: ${name}` });
```

That regex validates the *shape* of a name, never its *existence*. `gemini`, `mistral`, `claude-5`
all match. The handler then calls `saveProviders(cfg)` (`providers.ts:43-45`), which writes the body
verbatim to `${FACTORY_DATA}/providers.json` — **wholesale, replacing `DEFAULTS`**, not merged with
it (`providers.ts:27-41`: if the file exists, its contents *are* the registry).

The set of executors that actually exist is declared three times and never joined up:

| Where | What it says | Applies to |
|---|---|---|
| `runner/src/index.ts:44` | `const HARNESSES = new Set(['claude', 'codex'])` | **only** the legacy `{harness, model}` stage shape (`index.ts:80`) |
| `runner/src/providers.ts:14-25` | `DEFAULTS` keyed `claude`, `codex` | the fallback registry, bypassed the moment a file exists |
| `agent/run.sh:53-81`, `agent/spec.sh:39-55` | `case "${harness}" in claude) … codex) … *) "unknown harness"; rc=1` | the container — the only place that is *truth* |

`resolveTier()` (`providers.ts:53-57`) returns `{ harness: provider, ...tier }` — **the provider name
IS the harness id**, an invariant the code depends on and never states. So the bogus name flows:

```
PUT /providers {gemini:{hi,med,low}}          → 200, written to /data/providers.json
POST /runs {stages:{develop:{provider:"gemini",level:"hi"}}}
  → index.ts:73  providers["gemini"] exists    → passes
  → index.ts:75  resolveTier → {harness:"gemini"} → 201 Created, stages persisted
  → queue.ts:88/108  FACTORY_STAGES=…"harness":"gemini"… into the container
  → run.sh: clone → branch → empty commit → git push → gh pr create --draft   ← side effects land
  → run.sh:79-80  *) echo "unknown harness 'gemini'"; rc=1                    ← only now
```

Three consequences that make this worse than "a run fails":

1. **It costs a PR husk, not just a container.** `run.sh:99-106` opens the draft PR *before* any
   harness call — by design, so humans can watch. An unknown harness therefore leaves a pushed
   branch and an open draft PR on a fleet repo that a human or the janitor must clean up.
2. **One bad PUT poisons the automated lane, not just the run that used it.** `queue.ts:232-235`
   auto-queues every approved spec with `partner = resolveTier(partnerOf('claude', providers), 'med')`,
   and `partnerOf` (`providers.ts:48-51`) returns *the first registry key that is not the executor*.
   Add `gemini` and every auto-queued dev run silently gets `review: {harness: "gemini"}`. The
   reviewer — the quality backstop — dies in-container on every run until someone notices.
3. **The same endpoint can delete a harness, which fails even more quietly.** Because
   `saveProviders` writes wholesale, `PUT {claude:{…}}` (no `codex`) is accepted today. Then
   `queue.ts:235` `if (!dev || !partner) return;` — with `partnerOf('claude')` degenerating to
   `'claude'`, or `resolveTier('claude', …)` returning null if claude was the one dropped —
   **auto-queue stops, with no log line and no error anywhere**. Approved specs simply stop turning
   into dev runs.

**The invariant this spec adopts, stated once:** *the provider registry's key set is always exactly
the implemented harness set; only tiers (model/effort) are configurable.* `PUT /providers` is a tier
editor, not a provider installer — which is precisely what its only UI already is (§4), and what the
proposal's own out-of-scope line ("dynamic harness plugins") reserves.

**Rejected alternative — accept any subset of the harness set.** It reads more permissive but is
incoherent with `saveProviders`' wholesale write: dropping `codex` from the registry is not how a
provider gets disabled (`run.sh:27-36` already handles quota/auth outages by falling back to the
partner *at runtime*), it is just consequence 3 above. A subset rule would also force
`loadProviders` to back-fill the missing harness, at which point the PUT's stated effect silently
does not happen. Exact set equality is the only rule where the write and the read agree.

**Two facts that change the work and would otherwise be found the hard way:**

- **The repo has no test suite and no CI.** `runner/package.json` scripts are `start` and `typecheck`
  only; there is no `.github/` directory. `runner/src/repos.ts:54-57` says so in a comment — *"no
  test suite exists yet"* — and sets this repo's own gate to
  `npx tsc --noEmit … && bash -n agent/*.sh`. A test file that no gate runs is decoration, so S2
  wires `npm test` into that `selfTest` string. `tsx` is already a runtime dependency and Node is 22,
  so **no new dependency is needed** — `node:test` + `tsx` is the whole test stack.
- **`repos.ts` built-ins can be overridden on the box.** `repos.ts:64-81`: if
  `${FACTORY_REPOS_FILE:-/data/repos.json}` exists it **replaces the built-ins entirely**. If that
  file exists on Netcup, editing `repos.ts` changes nothing about how this repo is gated — see ⚠️ A1.

## 1b. Slice 0 — recon (≤ 30 min, prepend to S1, not counted as a slice)

```bash
git clone https://github.com/NikolasP98/minion-factory /tmp/factory && cd /tmp/factory
sed -n '110,140p' runner/src/index.ts        # confirm the PUT handler + the regex line
grep -n 'HARNESSES' runner/src/index.ts      # → expect exactly one definition (line ~44) + one use
sed -n '40,60p' agent/run.sh; sed -n '35,60p' agent/spec.sh   # the case arms the drift guard parses
cd runner && npm install && npx tsx --version && node --version   # → tsx present, node ≥ 22
npx tsx --test 2>&1 | head -3                # confirm which test invocation this tsx supports (S1)

# Live state — what is actually in the registry on the box RIGHT NOW (baseline, changes nothing):
curl -sf -H "Authorization: Bearer $FACTORY_SECRET" http://100.80.222.29:3210/providers | tee /tmp/providers.before | jq -r '.providers | keys | join(",")'
#   → expected "claude,codex". ANYTHING ELSE stops this slice: report it in the PR first,
#     because S2's load-time rule will discard it and the operator must know what they lose.

# Does the box use built-in repo defs, or a mounted file? (⚠️ A1)
ssh netcup 'cd /opt/factory && docker compose logs runner 2>&1 | grep -c "repos loaded from"'
#   → 0 means built-ins are live and the repos.ts edit in S2 takes effect. Non-zero: see ⚠️ A1.
```

Paste `providers.before` (keys only — it holds no secrets, but keep the PR tidy) and the two counts
into the PR. Nothing in Slice 0 changes a file.

## 2. Approach — two slices

```
S0 (recon) ─▶ S1 (the write boundary: one validator, PUT returns 400)
                         └─▶ S2 (the read + dispatch boundaries, drift guard, test gate wiring)
```

**S1 is independently shippable and safe on its own** — it strictly narrows what an authenticated
admin can save, and Slice 0 proves the live registry already satisfies the new rule. This matters
concretely: the auto-queue path tasks a dev run with *"Implement ONLY Slice 0 (if the spec has one)
and Slice 1"* (`queue.ts:230`), so S1 will in practice land alone first. **S2 must not ship before
S1** — its load-time rule assumes writes are already policed; alone it would silently discard a
registry a still-permissive PUT had just accepted. Merging both in one PR is preferred; S1-then-S2 is
acceptable; S2-first is not.

`playbooks/generic.md` tells factory agents not to touch deploy/CI-adjacent config unless the task
says so. **The task says so for exactly one line**: this repo's own `selfTest` string in
`runner/src/repos.ts` (S2). Nothing else outside `runner/src/`, `runner/package.json` and `README.md`
may be edited — in particular **no `agent/*.sh` file is modified by this spec** (they are read by the
drift test, never written).

---

### S1 — One validator, applied where the config is written

**Tags:** `logic` · **Estimate:** 4–6 h

**Goal:** a provider name that no harness implements can no longer be saved, by any route, and the
rejection says what is allowed.

**Do:**

- **`runner/src/providers.ts` — make the harness set the module's stated contract.**
  - `export const HARNESSES = ['claude', 'codex'] as const;` and `export type Harness = (typeof HARNESSES)[number];`
    with a comment naming the two shell `case` blocks that define truth (`agent/run.sh:53`,
    `agent/spec.sh:39`) and pointing at the drift test S2 adds. This is the runner's single
    TypeScript source of truth; the executable shell dispatch tables remain independent
    implementations whose equality is enforced by S2's drift test.
    `index.ts:44`'s duplicate Set is deleted in the same slice.
  - Retype `DEFAULTS` as `Record<Harness, ProviderConfig>` so dropping an arm here is a **type
    error**, and state the invariant `resolveTier` already relies on: *provider name = harness id.*
  - `export function validateRegistry(cfg: unknown): { ok: true } | { ok: false; error: string }` —
    one function, both boundaries, encoding: body is a non-null non-array object; **the key set is
    exactly `HARNESSES`** (unknown name → ``unknown provider '<name>' — no harness implements it;
    allowed: claude, codex``; missing name → ``provider '<name>' is required; the registry must cover
    every harness: claude, codex``). If both unknown and missing keys exist, report the first
    unknown key in `Object.keys(cfg)` order; otherwise tests and UI output depend on an unspecified
    validation order. Every level in `LEVELS` must be present with a non-empty string `model`;
    `effort`, when present, is a string. Preserve the existing message wording for the level/model
    and effort cases (`${name}.${lvl}.model required`, `${name}.${lvl}.effort must be a string`) —
    they are already surfaced verbatim by the base UI.
  - **`effort: ""` must stay valid.** The base settings UI sends an empty string for every level with
    no effort (`minion-base/src/routes/settings/+page.svelte:15`). Rejecting it would break the only
    UI this endpoint has. Assert it in a test so nobody "tightens" it later.
  - `saveProviders` calls `validateRegistry` and **throws** on failure, so a future caller cannot
    bypass the rule by not being the HTTP handler.
- **`runner/src/index.ts` — use it.**
  - Delete `const HARNESSES = new Set([...])` at line 44; import `HARNESSES` from `./providers.js`
    and keep `normalizeStages`' legacy-shape check working off it (`index.ts:80` becomes
    `!(HARNESSES as readonly string[]).includes(harness)`), so the error text at line 81 and the set
    can never drift apart again.
  - `PUT /providers`: replace the per-name regex loop (lines 125-136) with a single
    `const v = validateRegistry(cfg); if (!v.ok) return void res.status(400).json({ error: v.error });`.
    The regex is *subsumed* — set membership is strictly stricter than any shape pattern (it also
    rejects `__proto__`, which the regex happened to catch) — so removing it loses nothing.
  - Response on success is unchanged (`{ ok: true, providers: loadProviders() }`).
- **`runner/package.json`:** add `"test": "tsx --test src/*.test.ts"` (Slice 0 confirms whether this
  `tsx` wants `tsx --test` or `node --import tsx --test`; use whichever runs, and note it in the PR).
  No dependency is added.
- **`runner/src/providers.test.ts` (new):** unit tests on `validateRegistry` — a valid two-provider
  registry passes; `effort: ""` passes; an extra key (`gemini`) fails with a message naming `gemini`
  *and* the allowed set; a missing `codex` fails; a missing level fails; a non-string `effort` fails;
  an array and `null` fail. Plus: `saveProviders` throws on an invalid registry (point `FACTORY_DATA`
  at a temp dir) and does **not** create the file.
- **`README.md`:** one line under the stages documentation (`README.md:42`) — the registry's keys are
  the harness set (`claude`, `codex`); `PUT /providers` edits tiers, it does not add providers;
  adding a harness means adding a `case` arm in `agent/run.sh` **and** `agent/spec.sh` first.

**Files:** `runner/src/providers.ts`, `runner/src/index.ts`, `runner/src/providers.test.ts` (new),
`runner/package.json`, `README.md`.

**Definition of done (machine-checkable):**

Run the following block in Bash (it uses arrays and here-strings).

```bash
cd runner && npm install
npx tsc --noEmit -p tsconfig.json      # → clean (also typechecks the new test file)
npm test                               # → all pass
grep -rn 'new Set(\[.\?claude' src/    # → 0 hits: the duplicate harness set is gone
grep -c 'a-z0-9-]{1,30}' src/index.ts  # → 0: the shape-only regex is gone

# --- Red-state proof (tag `logic` ⇒ G3 mandatory) ---
# Preserve the test-only commit before implementing S1; verify it in a disposable clone.
S1_TEST_COMMIT=<test-only-commit>; T=$(mktemp -d)
git clone -q . "$T/factory" && git -C "$T/factory" checkout -q "$S1_TEST_COMMIT"
(cd "$T/factory/runner" && npm install && npm test); rc=$?
test "$rc" -ne 0                         # failure names the unknown-provider case
rm -rf "$T"
# Paste S1_TEST_COMMIT and the non-zero exit in the PR. `git stash` is not a valid substitute:
# it can hide the new test with the implementation and produce a meaningless green run.

# --- HTTP proof: the proposal's DoD sentence, end to end (no docker needed) ---
D=$(mktemp -d)
FACTORY_DATA="$D" FACTORY_SECRET=t FACTORY_AUTOMERGE=0 PORT=3399 npm start & pid=$!
sleep 2; A=(-H 'authorization: Bearer t' -H 'content-type: application/json')
ok='{"claude":{"hi":{"model":"opus"},"med":{"model":"sonnet"},"low":{"model":"haiku"}},"codex":{"hi":{"model":"sol","effort":"high"},"med":{"model":"terra","effort":""},"low":{"model":"luna","effort":"low"}}}'
curl -s -o /dev/null -w '%{http_code}\n' -X PUT "${A[@]}" -d "{\"providers\":$ok}" localhost:3399/providers          # → 200  (base's exact payload shape, incl. effort:"")
curl -s -X PUT "${A[@]}" -d "{\"providers\":$(jq -c '. + {gemini:.claude}' <<<"$ok")}" localhost:3399/providers      # → 400 ← the DoD; error names gemini + claude,codex
curl -s -X PUT "${A[@]}" -d "{\"providers\":$(jq -c 'del(.codex)' <<<"$ok")}" localhost:3399/providers               # → 400, "codex is required"
jq -r 'keys|join(",")' "$D/providers.json"                                                                           # → claude,codex (rejects wrote nothing)
curl -s -X POST "${A[@]}" -d '{"repoId":"minion-base","task":"probe only, never runs","stages":{"develop":{"harness":"gemini","model":"x"}}}' localhost:3399/runs  # → 400 (legacy shape, unchanged behavior)
kill "$pid"; wait "$pid" 2>/dev/null || true; rm -rf "$D"
```

---

### S2 — The read and dispatch boundaries, and a guard that fails when the shells drift

**Tags:** `logic` · **Estimate:** 4–6 h

**Goal:** no unimplemented harness can reach a container by *any* path — including a
`providers.json` that predates S1 or was hand-edited on the box — and the day someone adds a harness
to the shells without adding it to the registry (or vice versa), a test says so.

**Do:**

- **`runner/src/providers.ts` — validate at load, with the same function.**
  `loadProviders` keeps its current structure (file missing → `DEFAULTS`; unparseable → log +
  `DEFAULTS`) and replaces its hand-rolled per-level check (lines 31-35) with
  `validateRegistry(parsed)`; on failure log
  `[providers] invalid ${FILE}: ${error} — using defaults` and return `DEFAULTS`. One rule, two
  boundaries, no third semantic: a stale file containing `gemini` — or missing `codex` — is
  *invalid*, loudly, and the defaults take over rather than the bogus name propagating. Return type
  becomes `Record<Harness, ProviderConfig>`.
- **`runner/src/index.ts` — assert at the dispatch boundary.** In `normalizeStages`, after
  `resolveTier` (line 75-77), reject a resolved tier whose `harness` is not in `HARNESSES` with
  ``stages.${name}.provider '${provider}' resolves to harness '${tier.harness}' which no harness
  implements``. Belt-and-braces given the load rule, and it is the line that makes *"nothing
  unimplemented reaches `FACTORY_STAGES`"* true by construction rather than by argument.
- **`runner/src/queue.ts` — same assert on the auto-queue path.** At lines 232-235, after resolving
  `dev`/`partner`, bail with an explicit `console.error` naming the spec id when either harness is
  not in `HARNESSES`. Today `if (!dev || !partner) return;` is the *silent* stop described in §1
  consequence 3 — replace the silence with a log line; do not change when it stops.
- **`runner/src/harness-drift.test.ts` (new) — the guard the proposal's out-of-scope line implies.**
  Parse `agent/run.sh` and `agent/spec.sh` (resolved via `new URL('../../agent/run.sh', import.meta.url)`),
  extract the arms of the `case "${harness}" in` block inside `run_harness_once` / `spec_harness_once`,
  drop the `*` fallback, and assert set-equality with `HARNESSES`. **Fail closed:** if the case block
  or any arm cannot be found, `throw` with a message saying the guard could not verify anything —
  a parser that silently finds zero arms is worse than no test. Also assert `HARNESSES.length >= 2`
  (with `partnerOf` returning the executor itself below 2, a one-harness registry means the reviewer
  is the vendor that wrote the code — the exact thing `index.ts:46-49` says must never happen).
- **`runner/src/providers.test.ts` — extend:** a `providers.json` containing `gemini` loads as
  `DEFAULTS` (not as itself), one missing `codex` loads as `DEFAULTS`, a valid file round-trips
  through `saveProviders`/`loadProviders`, and `partnerOf('claude', loadProviders()) === 'codex'`
  after a stale-file load (the auto-queue path's actual dependency).
- **`runner/src/repos.ts` — make the gate real.** `minion-factory.selfTest` becomes
  `cd runner && npm install && npx tsc --noEmit -p tsconfig.json && npm test && cd .. && bash -n agent/run.sh agent/spec.sh agent/reconcile.sh agent/chat.sh`
  and the stale *"no test suite exists yet"* comment (lines 54-55) is replaced with what the tests
  now cover. `setup` already runs `npm install`; keeping it in the test string costs seconds and
  makes the gate runnable standalone. **Read ⚠️ A1 before assuming this takes effect on the box.**

**Files:** `runner/src/providers.ts`, `runner/src/index.ts`, `runner/src/queue.ts`,
`runner/src/harness-drift.test.ts` (new), `runner/src/providers.test.ts`, `runner/src/repos.ts`.

**Definition of done (machine-checkable):**

Run the following block in Bash.

```bash
cd runner && npx tsc --noEmit -p tsconfig.json && npm test        # → clean, all pass
cd .. && bash -n agent/run.sh agent/spec.sh agent/reconcile.sh agent/chat.sh   # → clean (unmodified)
git diff --name-only origin/main | grep -c '^agent/'              # → 0: no shell file was touched

# --- Red-state proof (required) ---
# Preserve the S2 test-only commit before implementation, as required by G3.
S2_TEST_COMMIT=<test-only-commit>; T=$(mktemp -d)
git clone -q . "$T/factory" && git -C "$T/factory" checkout -q "$S2_TEST_COMMIT"
(cd "$T/factory/runner" && npm install && npm test); rc=$?
test "$rc" -ne 0                         # failure names stale-registry or dispatch behavior
rm -rf "$T"
# The committed drift test must exercise its parser against fixtures for all three cases: matching
# arms pass; an added `gemini` arm fails set equality; an unparseable case block throws a `could not
# verify` error. This proves the guard deterministically without temporarily editing tracked files.

# --- Stale-file tolerance: the case S1 alone does not cover ---
D=$(mktemp -d)
jq -n '{claude:{hi:{model:"opus"},med:{model:"sonnet"},low:{model:"haiku"}},gemini:{hi:{model:"x"},med:{model:"x"},low:{model:"x"}}}' > "$D/providers.json"
FACTORY_DATA="$D" FACTORY_SECRET=t FACTORY_AUTOMERGE=0 PORT=3399 npm start > /tmp/boot.log 2>&1 & pid=$!
sleep 2
curl -s -H 'authorization: Bearer t' localhost:3399/providers | jq -r '.providers|keys|join(",")'  # → claude,codex (NOT gemini)
grep -c 'invalid .*providers.json' /tmp/boot.log                                                    # → ≥1, the operator is told
curl -s -H 'authorization: Bearer t' -H 'content-type: application/json' \
  -d '{"repoId":"minion-base","task":"probe only, never runs","stages":{"develop":{"provider":"gemini","level":"hi"}}}' \
  -X POST localhost:3399/runs                                                                       # → 400 ← the core failure chain, severed
kill "$pid"; wait "$pid" 2>/dev/null || true; rm -rf "$D"

grep -n 'npm test' src/repos.ts                                   # → 1 hit, inside minion-factory.selfTest
```

---

## 3. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `runner/src/providers.ts` | S1, S2 | `HARNESSES`/`Harness` + `validateRegistry` (the single source of truth); `saveProviders` throws; `loadProviders` validates with the same function |
| `runner/src/index.ts` | S1, S2 | duplicate harness Set deleted (line 44); PUT delegates to `validateRegistry`; provider→harness assert after `resolveTier` |
| `runner/src/queue.ts` | S2 | auto-queue asserts both resolved harnesses; the silent stop gains a log line |
| `runner/src/repos.ts` | S2 | this repo's `selfTest` runs `npm test`; stale "no test suite" comment replaced |
| `runner/package.json` | S1 | `test` script (no new dependency — `tsx` + `node:test`) |
| `runner/src/providers.test.ts` | S1, S2 | new — validator, save/load, stale-file, `partnerOf` |
| `runner/src/harness-drift.test.ts` | S2 | new — registry vs the shells' `case` arms, fail-closed |
| `README.md` | S1 | the registry is a tier editor; adding a harness starts in `agent/*.sh` |

**No `agent/*.sh` change. No `.svelte` file in any repo. No schema change** (`providers.json` shape
is unchanged; only which contents are accepted). **No new dependency. No secret touched.**

## 4. Cross-repo impact

Checked against AGENTS.md *Cross-Project Impact Zones*. No row matches: no gateway protocol frame, no
DB schema, no agent-definition format, no auth, no UI, no shared `@minion-stack/*` package. The blast
radius is one Express handler, one JSON file on one box, and the harness names the runner will accept.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| **`minion-base` settings UI** (`src/routes/settings/+page.svelte`) — the only UI that PUTs this endpoint | **None, no code change needed.** It GETs the registry, renders one card per *existing* key, and PUTs back the same key set (`normalize()`, lines 9-19; `save()`, lines 29-46). It has no "add provider" control, so it can only ever send `{claude, codex}` — exactly what the new rule requires | Read in full at authoring time. It surfaces `body.error` verbatim (line 39), so the new message is the message the operator sees. S1's DoD PUTs base's exact payload shape (including `effort: ""`) and asserts 200 |
| `minion-base` proxy allowlist (`src/lib/server/factory.ts:6`, `providers$`) | **None** — path unchanged, method unchanged | Allowlist regex untouched |
| **⚠️ If anyone later wants a third provider** | A future `gemini` harness now requires editing `agent/run.sh` + `agent/spec.sh` + `HARNESSES` together — the drift test fails on any subset. That is the point, but it is a real added step | Documented in `README.md` (S1) and named in the drift test's failure message |
| `cli/factory` (workstation CLI) | **None.** It never calls `/providers`; it sends the legacy `{harness, model}` shape, which was already validated against the same set (`index.ts:80`) | Read in full (55 lines) |
| `/data/providers.json` on Netcup (state, not code) | If it holds anything other than `{claude, codex}`, S2 discards it in favour of `DEFAULTS` — operator-visible tier edits could be lost | Slice 0 captures the live keys *before* any change and stops the slice if they are unexpected; S2 logs loudly at boot |
| In-flight runs at deploy time | Deploying restarts the runner container; `adoptOrphans()` (`index.ts:410`) re-adopts running containers by design | Existing deploy behavior, not created here. Deploy when `GET /runs` shows nothing active |
| Runs queued **before** the deploy with a bogus harness already persisted in their `stages` column | Not re-validated — they still fail in-container | Slice 0's registry check makes this near-impossible in practice; requeueing is a human call. Explicitly out of scope (§5) |
| `minion`, `minion_hub`, `minion_site`, `paperclip`, `pixel-agents`, `minion-meta` | **None** — none of them reference the factory provider registry | This spec file is the only meta-repo change |

### ⚠️ A1 — `repos.ts` may not be what the box uses

`repos.ts:64-81` replaces the built-in repo definitions **entirely** when
`${FACTORY_REPOS_FILE:-/data/repos.json}` exists. If it does, S2's `selfTest` edit is inert on Netcup
and the new tests will never gate a factory run on this repo — the change would look done and be
decoration. Slice 0 checks this with the boot log line (`[runner] repos loaded from …`,
`repos.ts:75`). If that line is present, **say so in the PR** and update the mounted file's
`minion-factory.selfTest` on the box in the same deploy; do not silently rely on the built-in.

### ⚠️ A2 — the drift guard reads shell scripts with a narrow parser

`harness-drift.test.ts` parses `case` arms out of bash (regular expressions are acceptable).
Reformatting `run.sh` can break it. That is
an accepted, deliberate cost: it fails **closed** (a parse miss throws, §S2 DoD proves it), so the
worst case is a loud false alarm that a human resolves in a minute — never a silent pass. The
alternative (a generated manifest the shells read) is a bigger change than the bug warrants.

### ⚠️ A3 — this narrows an existing API without a version bump

Any un-inventoried caller PUTting a partial or extended registry starts getting 400s. Inventory taken
at authoring time: `minion-base` settings UI (compatible, above) and manual `curl`. `cli/factory` does
not call it. If the operator has a personal script, its first failure will be an explicit 400 naming
the allowed set — a fail-loud regression, which is the intended trade against today's fail-deep-in-container.

## 5. Out of scope (explicit)

- **Dynamic harness plugins** (the proposal's own exclusion). Adding a harness stays a code change in
  `agent/run.sh` + `agent/spec.sh` + `HARNESSES`; this spec makes that triple *enforced*, not easier.
- **Provider enable/disable.** Removing a provider from the registry is not, and after this spec
  cannot be, the way to disable one. Runtime outages are already handled by the in-container partner
  fallback (`run.sh:27-36`). A real `enabled` flag is a different feature — file it separately.
- **Validating `model` strings.** Deliberate: the ancestor spec's contract is *"model is a passthrough
  string — the runner never hardcodes model names."* Only the harness set is closed. A wrong model
  fails at the CLI with a clear provider-side error, and `provider_outage()` (`run.sh:42-49`) already
  classifies it.
- **Re-validating runs already queued** with a bogus harness in their persisted `stages` (§4 queued-runs row).
- **`saveProviders` merge semantics / partial PUT / PATCH.** Wholesale write stays; exact-set
  validation is what makes it safe.
- **The chat-restart pending-message bug** (`index.ts:412`) — same file, separate approved proposal
  `2026-08-17-factory-chat-restart-drops-pending`. Do not absorb it.
- **Adding CI (`.github/`) to `minion-factory`.** The repo has none; the honest gate is the `selfTest`
  string S2 edits. A real workflow is a good follow-up and a different piece of work.
- **Auth, secrets, exposure, the bearer model, `docker-compose.yml`** — untouched, including the
  tailnet bind currently being changed by `2026-08-17-factory-compose-tailnet-hardcode-spec`. The two
  specs share a repo and no file.
- **Any UI.** Zero `.svelte` files change ⇒ no design-token or governance gates apply (§4b).

## 6. End-to-end verification

Run with S1 + S2 merged to `main` in `minion-factory` and deployed.
Run this block in Bash (it uses arrays, here-strings, and process substitution).

```bash
A=(-H "Authorization: Bearer $FACTORY_SECRET" -H 'content-type: application/json')
U=http://100.80.222.29:3210

# 1. The proposal's DoD, against the real runner
baseline=$(cat /tmp/providers.before)
curl -s -o /dev/null -w '%{http_code}\n' -X PUT "${A[@]}" $U/providers \
  -d "$(jq -c '{providers}' <<<"$baseline")"   # → 200; round-trips the captured live tiers without changing them
curl -s -X PUT "${A[@]}" $U/providers -d '{"providers":{"gemini":{"hi":{"model":"x"},"med":{"model":"x"},"low":{"model":"x"}}}}' | jq -r .error   # → 400, names gemini AND claude,codex
curl -sf -H "Authorization: Bearer $FACTORY_SECRET" $U/providers | jq -r '.providers|keys|join(",")'  # → claude,codex — unchanged by the rejected write
diff <(jq -S . /tmp/providers.before) <(curl -sf -H "Authorization: Bearer $FACTORY_SECRET" $U/providers | jq -S '{providers,levels}')  # → no diff vs the Slice 0 baseline

# 2. The failure chain is severed at config time — no container, no branch, no husk PR
before_runs=$(curl -sf "${A[@]}" "$U/runs" | jq '.runs | length')
before_prs=$(gh pr list --repo NikolasP98/minion-base --search 'head:factory/' --state open --json headRefName | jq length)
curl -s -X POST "${A[@]}" $U/runs -d '{"repoId":"minion-base","task":"this must never reach a container","stages":{"develop":{"provider":"gemini","level":"hi"}}}' | jq -r .error   # → 400
after_runs=$(curl -sf "${A[@]}" "$U/runs" | jq '.runs | length')
after_prs=$(gh pr list --repo NikolasP98/minion-base --search 'head:factory/' --state open --json headRefName | jq length)
test "$before_runs" = "$after_runs" && test "$before_prs" = "$after_prs"   # rejected request queued nothing and opened no PR

# 3. Real runs still work — the narrowing broke nothing
factory run minion-base "no-op smoke: touch nothing, report the repo name" --dev claude:sonnet --no-review   # → 201, run proceeds
curl -sf "${A[@]}" $U/runs | jq -r '.runs[0]|"\(.id) \(.status)"'
# provider/level shape + auto-pair (the path §1 consequence 2 poisons):
curl -s -X POST "${A[@]}" $U/runs -d '{"repoId":"minion-base","task":"no-op smoke via provider/level shape","stages":{"develop":{"provider":"claude","level":"med"}}}' | jq -r .id
curl -sf "${A[@]}" $U/runs/<that-id> | jq -r '.stages|fromjson|.review.harness'   # → codex (partner auto-pair intact)

# 4. The base UI round-trips (browser-harness or by hand at base.minion-ai.org/settings)
#    Load Settings → edit codex/med model → save → "Saved." → reload shows the new value.
#    This is the compatibility claim in §4 being checked by a human, not inferred.

# 5. The gate is live (⚠️ A1)
ssh netcup 'cd /opt/factory && docker compose logs runner 2>&1 | grep "repos loaded from"'   # → empty, OR the mounted file was updated too
#    then: the next factory run on minion-factory shows `npm test` in its self-test log
```

**Ship gate:** §6 steps 1–5 green; the proposal's DoD checked clause by clause (*"PUT validates names
against the harness set"* — step 1 · *"bogus name returns 400"* — steps 1 and 2); **both red-state
commit hashes and exit codes pasted** (S1 and S2), with the drift parser's matching, mismatch, and
fail-closed fixture cases green, per §4b's `logic` rule
that G3 is mandatory; Slice 0's `providers.before` keys pasted and matching step 1's post-state; and
⚠️ A1 answered explicitly in the PR — *"built-ins are live"* or *"the mounted repos.json was updated,
here is the diff"*. A green command list is evidence; the A1 answer is the one thing a human must
read and confirm.
