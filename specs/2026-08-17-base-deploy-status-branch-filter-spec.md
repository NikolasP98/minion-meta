---
id: 2026-08-17-base-deploy-status-branch-filter-spec
title: "minion-base board — CI status scoped to each repo's deploy branch, and absence is not health"
stage: spec
status: approved
pass: 2
created: 2026-08-17
updated: 2026-08-17
proposal: 2026-08-17-base-deploy-status-branch-filter
verdict: approved
repos: [minion-base]
tags: [logic, ui, test]
type: fix
---

# minion-base board — CI status scoped to each repo's deploy branch

**Owner surface:** `minion-base` (`NikolasP98/minion-base`, private, `main` → Vercel →
base.minion-ai.org) — `src/lib/server/github.ts` and the two routes that render its workflow-run
output. Nothing outside that checkout is edited (§5).

**Design ancestors:**
[`2026-08-12-minion-base-v2-sdlc-kanban-spec`](2026-08-12-minion-base-v2-sdlc-kanban-spec.md) §1
"Kanban derivation" — the table that defines Testing as "latest workflow runs" and Deployment as
"most recent success run + latest commit on deploy branch". That table is where the bug is
*specified*, not just implemented: it names a deploy branch for the Deployment column and then never
says the query is scoped to it.
[`2026-08-12-minion-base-lifecycle-dashboard`](2026-08-12-minion-base-lifecycle-dashboard.md) — v1,
which introduced the GitHub fan-out (~22 calls) and the basic-auth gate this inherits.
[`2026-08-13-minion-base-kanban-auto-refresh-spec`](2026-08-13-minion-base-kanban-auto-refresh-spec.md)
— shipped; its §5 ⚠️ N1 (minion-base is absent from AGENTS.md's Project Map) and 🚨 A1 (the shared
GitHub PAT rate limit) still hold and are re-checked in §5 here.

**Gate conventions:**
[`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b — the
slices below are tagged `logic` / `ui` / `test`. `logic` ⇒ **red-state TDD is mandatory (G3)**;
`ui` ⇒ a G4 empirical check and a debt ratchet that may only decrease. **One override, stated up
front:** §4b routes a `ui` tag to the `ui-design-governance` skill and to `lint:design && lint:tokens`.
That skill governs `minion_hub`/`minion_site` against `packages/design-tokens/contract.json`.
minion-base has its own separate governance — `DESIGN.md` + `src/lib/design/tokens.css` +
`scripts/lint-design.mjs`. **Do not invoke `ui-design-governance` for this work**; run
`bun run lint:design` only. There is no `lint:tokens` script in this repo. This is the same carve-out
`2026-08-13-minion-base-kanban-auto-refresh-spec` §S3 made, restated because §4b's table now says
otherwise and an implementer following it literally would run hub's rules against the wrong repo.

---

## 0. Product

From the approved proposal `2026-08-17-base-deploy-status-branch-filter`, verbatim:

> ## Problem
>
> src/lib/server/github.ts:168 actions/runs fetch lacks branch= filter; a green run on any PR branch
> paints the deploy branch healthy (and runs[0] vice versa).
>
> ## Definition of done
>
> All three actions/runs fetches filtered by repo.branch; repo with red deploy-branch + green
> PR-branch shows red.
>
> ## Out of scope
>
> New status sources.

### Why this matters more than a missing query param

`GET /repos/{owner}/{repo}/actions/runs` with no `branch` returns runs for **every ref in the
repository**, newest first. On repos that run CI per pull request — which is all of the tracked ones
— the recent-runs page is dominated by PR-branch runs. The board then reads that page as if it were
the deploy branch's history. That breaks in **both directions**, which is the parenthetical in the
proposal and the reason a one-line fix is not the whole fix:

| Direction | What the board does | What is true |
|---|---|---|
| **False green** | finds a `success` run somewhere in the page — from a PR branch — and paints the repo healthy | the deploy branch is red |
| **False red** | `runs[0]` is the newest run overall — a failing PR branch — so the repo shows red | the deploy branch is green |

The false green is the dangerous one. This board is the SDLC system of record; the whole point of the
Deployment column is to answer *"is what we shipped healthy?"*. Answering it from an unrelated
feature branch is not a degraded answer, it is a **confidently wrong** one, and it is wrong in the
direction that suppresses action.

### The second bug hiding behind the first

Adding `?branch=` fixes *which runs* are considered. It does not, on its own, satisfy the proposal's
DoD sentence — *"repo with red deploy-branch + green PR-branch shows red"*. Consider a deploy branch
that was green yesterday and is red today. A branch-filtered page now contains only deploy-branch
runs, but a "most recent **success** run" lookup still finds yesterday's green and still paints the
repo healthy. The branch filter narrowed the lie; it did not remove it.

Completed health must therefore come from the **latest determinate completed run on the branch**,
not from the latest success in the page; a newer active run reports `running`. See D5 — it is the
half of this fix that the proposal implies but does not spell out, and skipping it means shipping a
change that passes review and still fails its own DoD.

### The third thing: after this fix, some repos will legitimately have *no* data

Filtering can return an empty list — a repo with no workflows on that ref, or, far more likely, a
**stale branch name in config**. That case exists today and is proven: AGENTS.md's Project Map lists
`minion_hub` on branch `dev`, but `2026-08-13-crm-customers-server-pagination-spec` records that
hub's `origin/dev` was **deleted** and the live base is `origin/master`. If the board's repo config
carries the same stale value, hub goes from *falsely green* to *zero runs* the moment S1 lands.

"Zero runs" must not render as green, and must not render as the generic "unreachable" error either
— it is a distinct, **actionable** state meaning *nobody is watching this branch, or this branch does
not exist*. D4 makes that a first-class value; S2 makes it visible. This is not scope creep: it is the
failure mode S1 manufactures, and shipping S1 without it trades a silent false green for a silent
false something-else.

## 1. Assumptions — and why Slice 0 is not optional

**This spec was written from the meta-repo, where `minion-base` is not checked out.** The meta-repo
`.gitignore` excludes every subproject, `minion-base` is not in AGENTS.md's Project Map at all (⚠️ N1
below), and `find / -name github.ts -path '*lib/server*'` returns nothing on this machine. **Every
file path, function name, and config field below is a lead reconstructed from the proposal's own
`file:line` citation and from the two ancestor specs — not verified fact.** The only line quoted
from the real source is the proposal's: `src/lib/server/github.ts:168`.

Five carried claims are load-bearing. Slice 0 turns each into a recorded fact. If any comes back
false, stop before implementation and update this spec (and its approval) in the meta-repo; do not
silently reinterpret the work in the minion-base implementation PR:

1. **There are exactly three `actions/runs` fetches**, all in `src/lib/server/github.ts`. The
   proposal counted them. If there are two, or four, or one helper called three times, the shape of
   S1 changes (D1 is written to make the count irrelevant, but the DoD greps are written against
   three).
2. **A `repo.branch` field already exists** on the repo config the fan-out iterates. The proposal's
   DoD says "filtered by `repo.branch`", which reads like it exists. The v2 spec §1 says the
   Deployment column uses "latest commit on deploy branch", which implies *something* already carries
   a branch. If it does not exist, S1 adds it and the case-sensitivity trap in D2 becomes the main
   risk of the slice rather than a footnote.
3. **The repo config's branch values are correct and correctly cased.** Independently doubtful — see
   the hub `dev`/`master` evidence above, and note AGENTS.md lists `minion/` on **`DEV`** (uppercase)
   while `minion_hub/` is **`dev`** (lowercase). GitHub's `branch` filter is case-sensitive. This is
   the assumption most likely to be wrong, which is exactly why S2 exists.
4. **Two routes consume the run data** — the v1 dashboard (`/`) and the v2 kanban (`/kanban`) — and
   both go through `github.ts`. The proposal's "three fetches" is consistent with kanban Testing +
   kanban Deployment + v1 dashboard status.
5. **minion-base has no test runner configured.** Per
   `2026-08-13-minion-base-kanban-auto-refresh-spec` §1 assumption 3, its gates are
   `lint:design` → `svelte-check` → `build`, and that spec introduced **`bun test`** (Bun's built-in
   runner, zero new dependencies) for pure-function DoDs. If it shipped, `src/lib/refresh/*.test.ts`
   exists and this spec reuses the same runner and conventions.

### Slice 0 — recon (≤ 45 min, prepend to S1, not counted as a slice)

```bash
cd minion_base   # wherever NikolasP98/minion-base is checked out
git rev-parse --abbrev-ref HEAD                       # expect main
git log --oneline -3 -- src/lib/server/github.ts      # has :168 moved since the sweep?

# A1 — the three fetches, verbatim, with their line numbers
rg -n 'actions/runs' src/                             # expect 3 hits; record each URL string
rg -n 'per_page|page=' src/lib/server/github.ts       # page size per call — D2 depends on it
rg -n 'conclusion|status|head_branch|\.event\b' src/  # how is a run turned into a colour today?
rg -n 'runs\[0\]|\.find\(|\.filter\(' src/lib/server/github.ts

# A2/A3 — the repo config and its branch values
rg -n 'branch' src/lib/ --glob '!*.test.ts'           # does repo.branch exist? what are the values?
rg -ln 'owner|repo:' src/lib/                          # locate the repo registry module

# A4 — consumers
rg -ln 'workflowRun|runs|testing|deployment' src/routes/
test -f src/routes/kanban/+page.server.ts && test -f src/routes/kanban/+page.svelte

# A5 — toolchain
rg -n '"scripts"' -A 20 package.json                  # lint:design present? test runner?
ls src/lib/refresh/ 2>/dev/null                       # did the auto-refresh spec ship?
bun --version

# Ground truth for every tracked repo's deploy branch, EXACT case (needs GITHUB_TOKEN):
#   for each repo in the config:
gh api repos/<owner>/<name> --jq '.default_branch'
gh api "repos/<owner>/<name>/branches?per_page=100" --jq '.[].name'
```

Paste into the PR: the three URL strings as they exist today, the current per-call `per_page`, the
current colour-derivation expression, and a table of `configured branch` vs `exists on GitHub (exact
case)` for every tracked repo. **That table is the input to S2 and the thing most likely to change
the work.**

## 2. Design decisions this spec settles

### D1 — One fetch helper, `branch` a *required* parameter

Do not add `&branch=…` in three places. Three call sites that each independently remember to filter
is the bug's own shape — it recurs the next time a fourth call is added. Collapse them onto one
exported helper whose signature makes the omission a **compile error**:

```ts
// src/lib/server/github.ts
export interface WorkflowRunQuery {
  owner: string;
  repo: string;
  branch: string;          // REQUIRED — no default, no `?`, no `| undefined`
  perPage?: number;        // default 20 (D2)
}
export async function fetchWorkflowRuns(q: WorkflowRunQuery): Promise<WorkflowRunsResult>;
```

`bunx svelte-check` then enforces the fix for every future call site, which is a stronger guarantee
than any lint rule or review checklist. This is the whole reason S1 is a slice and not a one-line
commit.

If recon finds the three fetches ask genuinely different questions (different `per_page`, different
consumers), they still share the helper and differ only in arguments.

### D2 — URL construction: encode it, case it right, and size the page

- **`encodeURIComponent(branch)`.** Branch names contain `/` (`feature/x`, `release/1.2`) and
  occasionally `#`. `paperclip-minion` is on `minion-integration` today, but the config is a moving
  target and an unencoded slash silently produces a wrong-path request.
- **The filter is case-sensitive.** `branch=dev` does not match `DEV`. AGENTS.md lists `minion/` on
  `DEV` and `minion_hub/` on `dev`; if the board's config normalises case anywhere, that
  normalisation must be removed, not worked around. S2 validates the values against GitHub.
- **`per_page=20`** for the branch-scoped call (recon records today's value; if it is `1`, that is
  enough for D5's health read but not for the deployment marker, and it must go up). 20 is enough
  to find a recent success behind a short red streak without a second page. If no success appears
  within the page, the deployment marker is reported as *unknown*, never as green — see D4.
- **`head_branch` semantics.** GitHub matches `branch` against a run's `head_branch`. For
  `pull_request`-triggered runs that is the PR's **source** branch, not its base. So `branch=main`
  correctly excludes ordinary PR CI — but it would still match a fork PR whose source branch is
  itself named `main`. **Drop runs whose `event` is `pull_request` or `pull_request_target` in the
  derivation** (D5). Do *not* add `&event=push` to the URL instead: that would silently discard
  `workflow_dispatch` and `schedule` runs, which are real deploy-branch signals on some of these
  repos. Filtering out one event family client-side is precise; whitelisting one server-side is not.
- **Rate limit is unchanged.** Adding a query parameter does not change the call count, so
  `2026-08-13-minion-base-kanban-auto-refresh-spec` 🚨 A1's budget is untouched by this spec. If D1's
  consolidation lets two of the three fetches collapse into one request, the count goes *down*;
  record it either way but do not chase it — that is a separate optimisation (§6).

### D3 — "All three" is honoured literally, and here is what that costs

The proposal's DoD says all three fetches get the filter. Two of the three are unambiguous: the
Deployment column and the v1 dashboard status are *about* the deploy branch.

The third is not. The v2 spec's Testing column is *"latest workflow runs (in_progress/queued =
testing; failures surface red)"* — and PR CI is arguably the most meaningful thing in a Testing
column on a board whose whole subject is an agentic PR pipeline. Filtering it to the deploy branch
means **in-flight PR CI stops appearing under Testing**; that column then shows only deploy-branch
runs that happen to be mid-flight, which is a much thinner signal.

**Settled: filter all three, per the DoD as written.** Reasons: (a) it is what the approved proposal
says, and narrowing an approved DoD is the planner's job to flag, not to decide; (b) a Testing column
mixing PR-branch and deploy-branch runs with no visible distinction is the *same* category error as
the Deployment bug, one column over — correct-but-thin beats rich-but-ambiguous; (c) restoring PR CI
to the Testing column properly means fetching per-PR check runs keyed to the PR cards, which is a
**new status source** and explicitly out of scope (§6).

**Pass-2 decision:** retain this literal reading of the approved DoD. All three existing fetches are
branch-scoped. Restoring PR-specific CI to Testing requires a separately approved status source and
is out of scope; implementation must not reopen this decision.

### D4 — Absence is not health (the fail-closed rubric)

Status derivation returns a **closed enum** with no default-to-green anywhere:

```ts
export type BranchCiStatus =
  | 'passing'    // latest completed, non-PR run on the branch concluded success
  | 'failing'    // ...concluded failure | timed_out | startup_failure | action_required
  | 'running'    // newest usable signal is queued | in_progress | waiting | requested | pending
  | 'no-runs'    // the branch-filtered fetch succeeded and returned zero usable runs   ← NEW
  | 'unknown';   // fetch failed, or every usable run in the page is indeterminate
```

Three rules, each of which is a way this goes wrong if left implicit:

1. **`no-runs` is not `passing`.** An empty array is the single most likely outcome of a stale
   branch name (§0), and it must be loud. This is the fail-closed rubric §4b applies to `logic`
   slices.
2. **`no-runs` is not `unknown`.** A failed fetch (rate limit, 404, network) and a successful fetch
   that found nothing are different problems with different fixes — one is "retry", the other is
   "fix the config". Collapsing them wastes the diagnostic S2 depends on.
3. **`conclusion: null` is not success.** In-progress runs carry a null conclusion; any expression
   shaped `conclusion === 'failure' ? red : green` paints them green. Recon (A1) records whether the
   current code does exactly this. `cancelled`, `skipped`, `neutral`, and `stale` are
   *indeterminate*: skip to the next completed run in the page, and if none is determinate, return
   `unknown` — never `passing`. Enumerate every documented conclusion value explicitly; a
   `default:` arm that returns anything green-ish is a slice failure.

### D5 — Current status and "last success" are separate facts

The two facts the board conflates today:

| Fact | Derivation | Renders as |
|---|---|---|
| **Current branch status** | scan the branch-filtered, non-PR-event list newest-first, skipping completed runs with indeterminate conclusions; the first active run yields `running`, and the first determinate completed run yields `passing` or `failing` | the red/green/amber badge |
| **Last successful deploy** | the first run in the same list with `conclusion === 'success'` | the Deployment column's marker (what is live) |

An active run takes precedence over an older completed result, so a branch currently building is
`running`, not yesterday's `passing`. Otherwise the two facts are equal on a healthy branch and
divergent exactly when it matters. `latestDeterminate.failure`
+ `lastSuccess = yesterday` is the state the proposal's DoD sentence describes, and only this split
renders it correctly: **badge red, deployment marker still pointing at yesterday's green run.** That
is both true and useful.

If no success appears within `per_page` (D2), the deployment marker is `unknown` — a long red streak
must never be reported as "deployed: (nothing)" in a way that reads as clean.

### D6 — The board states which branch it judged

A status badge that silently means "on some branch" is what produced this bug. Every card carrying
CI status renders the branch name it was computed from (e.g. `main · passing`, `DEV · no runs`).
Two reasons, both practical: it makes the DoD **visually verifiable** rather than inferable from a
network log, and it is how a stale config gets noticed by a human — `dev · no runs` on the hub card
is a bug report that reads itself.

Low-emphasis, semantic tokens only (`--text-dim`), no layout change, no new component. If review
judges this out of scope, S1 still ships correctly and S2 loses one bullet — but then the ⚠️ A2 alert
in §5 becomes the only thing standing between a stale branch value and a silently empty column.

## 3. Approach — two vertical slices

```
S0 (recon, ≤45 min) ─▶ S1 (branch-scoped query + fail-closed derivation) ─▶ S2 (config truth + legibility)
```

S1 satisfies the proposal's DoD literally and is independently shippable — the board is strictly more
correct with S1 alone. S2 pays off the failure mode S1 creates: it verifies every configured branch
against GitHub, and puts the branch on screen so the next drift is self-reporting. **Land S1 and S2
in the same PR unless the branch-audit table from Slice 0 comes back completely clean**; if any
configured branch is wrong or missing, S2 is not optional and S1 must not merge without it (see 🚨 A2).

---

### S1 — Branch-scoped runs, and a status enum that cannot fail open

**Tags:** `logic`, `test` · **Estimate:** 6–8 h

**Goal:** every `actions/runs` request names a branch, that branch comes from the repo config, and
the run list is turned into status by one pure, exhaustively tested function that has no path to
green it cannot justify.

**Do:**

- Add `fetchWorkflowRuns(q: WorkflowRunQuery)` per D1 — one helper, `branch` required and
  non-optional, `encodeURIComponent` on the branch, `per_page` per D2. Point all three existing call
  sites at it and **delete their inline URL construction**; a leftover raw `actions/runs` string
  anywhere outside this helper fails the slice's grep.
- Add `src/lib/server/ci-status.ts` — pure, no `fetch`, no `Date.now()`, no network types beyond a
  minimal local `WorkflowRunLike` shape:

  ```ts
  export interface WorkflowRunLike {
    status: string | null;        // queued | in_progress | completed | waiting | requested | pending
    conclusion: string | null;    // success | failure | cancelled | skipped | timed_out | ...
    event: string | null;         // push | pull_request | schedule | workflow_dispatch | ...
    head_branch: string | null;
    created_at: string;
    html_url: string;
  }

  export function deriveBranchCi(
    runs: WorkflowRunLike[],
    branch: string,
  ): { status: BranchCiStatus; latest: WorkflowRunLike | null; lastSuccess: WorkflowRunLike | null };
  ```

  Implements D4's enum and D5's split. `latest` is the run that determined `status` after the D5
  scan (or `null` for `no-runs`/`unknown`), not merely array position zero. Fetch failures are mapped
  to `unknown` by the caller because an array-only pure function cannot distinguish a failed fetch
  from a successful empty response. Drops `pull_request` / `pull_request_target` events (D2).
  Defensively re-checks `head_branch === branch` and drops mismatches — the API is trusted, but a
  one-line assertion here is what makes the function testable in isolation and catches a
  mis-encoded query returning the wrong ref's runs.
- **Sort explicitly.** Do not rely on the API's ordering guarantee. Sort the filtered list by
  `created_at` descending inside `deriveBranchCi` before reading position 0. The proposal's own bug
  name is `runs[0]`; taking a fresh positional dependency on an undocumented ordering while fixing a
  positional bug is not a trade worth making.
- Replace every existing colour-derivation expression at the three consumers with a
  `deriveBranchCi()` call. **Zero remaining ad-hoc `conclusion === …` comparisons outside
  `ci-status.ts`** — that grep is in the DoD.
- Route `no-runs` and `unknown` to whatever neutral/warn badge exists today (S2 gives them their own
  treatment). The one hard rule for this slice: **neither may reach the green path.**
- **Red state first (G3, mandatory for `logic`).** Before implementing `deriveBranchCi`, add its
  signature/stub and write the failing test: a fixture list containing a `success` run with
  `head_branch: 'feature/x'` and a `failure` run with `head_branch: 'main'`; assert
  `deriveBranchCi(runs, 'main').status === 'failing'`. Run the targeted test and paste its assertion
  failure (not merely a missing-module or compile error) into the PR. That is the proposal's DoD
  sentence as an executable statement.

**Files:** `src/lib/server/github.ts`, `src/lib/server/ci-status.ts` (new),
`src/lib/server/ci-status.test.ts` (new), the two/three consumer load functions located in Slice 0
(expected: `src/routes/kanban/+page.server.ts`, `src/routes/+page.server.ts`).

**Definition of done (machine-checkable):**

```bash
cd minion_base
bun test src/lib/server/ci-status.test.ts
#   G3 red-state pasted first (green PR branch + red deploy branch → 'failing'), then:
#   - green on 'feature/x' + red on 'main', query 'main'   → failing   ← proposal DoD, verbatim
#   - red on 'feature/x'  + green on 'main', query 'main'  → passing   ← the "vice versa" half
#   - success yesterday + failure today, both on 'main'    → status failing, lastSuccess = yesterday (D5)
#   - only in_progress on 'main'                           → running   (NOT passing — conclusion is null)
#   - in_progress today + success yesterday on 'main'      → running, lastSuccess = yesterday (D5)
#   - empty array                                          → no-runs   (NOT passing, NOT unknown)  (D4)
#   - every run cancelled / skipped / neutral / stale      → unknown   (NOT passing)               (D4)
#   - success run with event 'pull_request' + head_branch 'main' (fork PR) → dropped; result no-runs (D2)
#   - runs supplied out of chronological order             → newest wins (explicit sort, not runs[0])
#   - no success within the page, all failures             → status failing, lastSuccess null (never green)
#   - head_branch mismatching the query arg                → dropped
#   - EVERY documented conclusion string is covered by a named case; no `default` returns 'passing'
rg -n 'actions/runs' src/                       # → exactly ONE hit, inside fetchWorkflowRuns
rg -n 'branch=' src/lib/server/github.ts        # → present, built with encodeURIComponent
rg -n "conclusion\s*===|conclusion\s*!==" src/ --glob '!src/lib/server/ci-status*'   # → 0 matches
rg -n 'runs\[0\]' src/                          # → 0 matches
bunx svelte-check                               # 0 errors / 0 warnings — proves `branch` is required
bun run lint:design                             # debt unchanged (expect 0); NOT ui-design-governance
bun run build

# live proof against the real API (GITHUB_TOKEN from Infisical minion-core):
gh api "repos/NikolasP98/minion-base/actions/runs?branch=main&per_page=5" \
  --jq '.workflow_runs[] | "\(.head_branch)\t\(.event)\t\(.conclusion)"'
#   → every row's head_branch is exactly 'main'
```

---

### S2 — Config truth: the branch is real, and the board says which one it judged

**Tags:** `logic`, `ui`, `test` · **Estimate:** 4–6 h

**Goal:** every configured branch provably exists on GitHub with the right case, and a card that
shows no CI data says *why* instead of showing nothing.

**Do:**

1. **Audit and correct the repo config** using Slice 0's `configured vs actual` table. Expected
   corrections, all to be verified rather than assumed: `minion_hub` (AGENTS.md says `dev`; that ref
   was deleted and the live base is `master`), `minion/` (**`DEV`**, uppercase — do not lowercase
   it), `minion_site` (`master`), `paperclip-minion` (`minion-integration`). Fix the config values;
   do **not** add case-insensitive matching or a "try `main` then `master`" fallback — a fallback is
   a second silent-wrong-branch bug wearing a helpful hat.
2. **Add a config test** (`bun test`) asserting, for every entry in the repo registry, that `branch`
   is a non-empty string, is not whitespace-padded, and is not a known-stale value hardcoded as a
   denylist from the audit. Pure and offline — it guards the shape and the specific regressions found,
   and it runs in CI where a network call could not.
3. **Add an online branch check** as a separate, explicitly-network-tagged test or a
   `bun run check:branches` script: `GET /repos/{owner}/{repo}/branches/{branch}` for each entry,
   asserting 200 and an exact-case name match. Not part of the default gate chain (it needs a token
   and burns rate limit); documented in the PR and runnable on demand. State plainly in the PR
   whether it was run and its full output.
4. **Render the branch and the empty state** (D6). Each card carrying CI status shows the branch it
   was computed from; `no-runs` renders as a distinct low-emphasis label (e.g. `main · no runs`) that
   is visibly **not** the passing treatment; `unknown` keeps the existing "unreachable" treatment
   from v1. Semantic tokens only — `--text-dim`, existing spacing and type scale from
   `src/lib/design/tokens.css`. No raw hex, no raw px, no new token (a token addition is a
   DESIGN.md-governed decision and needs PR justification).
5. **Record the ancestor documentation drift for meta-repo follow-up.** The shipped
   `2026-08-12-minion-base-v2-sdlc-kanban-spec` §1 describes Testing as "latest workflow runs" with
   no branch scope. Pass 2 settles the behavior in D3; the implementation PR does not edit the
   meta-repo. Noted as N2 in §5.

**Files:** the repo registry module (located in Slice 0; expected `src/lib/data/repos.ts` or
`src/lib/server/repos.ts`), `src/lib/server/repos.test.ts` (new), optionally
`scripts/check-branches.mjs` and the corresponding `package.json` script (if step 3 uses a Bun
script rather than the documented `gh` loop), the card/badge component that renders CI status,
`src/routes/kanban/+page.svelte`, `DESIGN.md` (only if a genuinely new idiom needs documenting).

**Definition of done (machine-checkable):**

```bash
cd minion_base
bun test                                        # S1 suite + the new config suite, all green
bun run check:branches                          # if the script form was chosen
#   Otherwise run the documented equivalent gh loop; either form must prove every configured
#   branch resolves 200 with exact case, and its full output is pasted in the PR.
git diff -U0 origin/main...HEAD -- '*.svelte' | rg '^\+.*(#[0-9a-fA-F]{3,8}|[0-9]+px)' # → 0 matches
git diff --stat -- src/lib/design/tokens.css    # → empty (a token add needs PR justification)
rg -in 'toLowerCase\(\)|toUpperCase\(\)' src/lib/server/github.ts src/lib/**/repos*  # → 0 matches
rg -n "'main'\s*\|\||\?\?\s*'main'" src/lib/     # → 0 matches (no default-branch fallback)
bun run lint:design                             # passes; debt is unchanged or decreases
bunx svelte-check                               # 0 errors / 0 warnings
bun run build
```

Plus one browser probe (browser-harness skill, headless Chromium at `BU_CDP_URL`; the board is behind
basic auth — supply `minion:$DASH_PASSWORD`), pasted into the PR:

```
- open /kanban and /  → every CI badge shows a branch name beside it (D6)
- pick a repo whose deploy branch is currently red on GitHub and which has a green open PR
  (confirm both with `gh run list`) → its card is RED            ← the proposal's DoD, on screen
- point one repo's config at a nonexistent branch, reload → that card reads "<branch> · no runs",
  NOT green and NOT "unreachable"; revert the config           ← D4 rules 1 and 2, on screen
- screenshot both themes if minion-base has a light/dark pair → contrast holds at --text-dim
```

---

## 4. Files touched (consolidated)

| File | Slice | Nature |
|---|---|---|
| `src/lib/server/github.ts` | S1 | one `fetchWorkflowRuns()` with a **required** `branch`; `encodeURIComponent`; `per_page=20`; three inline URLs deleted |
| `src/lib/server/ci-status.ts` | S1 | **new** — pure `deriveBranchCi()`; D4 enum; D5 health/last-success split; PR-event drop; explicit sort |
| `src/lib/server/ci-status.test.ts` | S1 | **new** — the G3 red-state case plus the full conclusion matrix |
| kanban + dashboard load functions (Slice 0) | S1 | call the helper with `repo.branch`; ad-hoc `conclusion` comparisons removed |
| repo registry module (Slice 0) | S2 | corrected branch values, exact case; no fallbacks |
| `src/lib/server/repos.test.ts` | S2 | **new** — offline shape + stale-value guard |
| `scripts/check-branches.mjs`, `package.json` | S2 | **optional** — online exact-case branch check and script entry; omit when using the documented `gh` loop |
| CI badge / card component (Slice 0), `src/routes/kanban/+page.svelte` | S2 | branch label + distinct `no-runs` treatment; semantic tokens only |
| `DESIGN.md` | S2 | only if a new idiom genuinely needs documenting |

All paths relative to the `minion-base` checkout. **No DB, no migration, no API surface, no
dependency added.** `bun test` is already this repo's runner per §1 assumption 5.

## 5. Cross-repo impact

Checked against AGENTS.md → "Cross-Project Impact Zones". **No zone applies.** minion-base is a
standalone read-only SvelteKit app over the GitHub REST API: no DB, no gateway WS surface, no
`@minion-stack/*` dependency, no shared auth, no agent-definition format.

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion/` gateway, `@minion-stack/shared`, WS frame types | **None** — no protocol surface touched | — |
| `@minion-stack/db`, `minion_hub` ↔ `minion_site` shared DB | **None** — minion-base has no DB | — |
| `minion_hub`, `minion_site`, `paperclip-minion`, `pixel-agents`, `minion_plugins`, `minion-factory` | **Read-only observation only.** This spec changes how minion-base *reads* their public GitHub state. Not one byte of any of those repos changes | scope guard below |
| `minion-meta` (this repo) | **Read-only, unchanged.** The board reads `specs/index.json` via the contents API; this spec changes neither what it reads nor its shape | — |
| minion-base's other routes (`/practices`, `/research`) | **None** — static JSON data modules, no workflow runs | S1's grep is repo-wide, so a stray hit would surface |
| Shared GitHub PAT rate limit | **Neutral or better.** A query param does not add a request; D1's consolidation may reduce the count | record the cold-load call count before/after in the PR (🚨 A1 of the auto-refresh spec) |
| The maintenance lane's CI-watch monitor (S-D, `2026-08-17-maintenance-lane-monitors-spec`) | **None to the monitor; possible knock-on to its queue** — see ⚠️ A3 | A3 |
| `2026-08-12-minion-base-v2-sdlc-kanban-spec` §1 derivation table | **Documentation drift** — D3 scopes the Testing column that table leaves unscoped | note N2 |

Scope guard for the PR:

```bash
out="$(git diff --name-only origin/main...HEAD | rg -v '^(src/|scripts/|DESIGN\.md$|package\.json$)')"
[ -z "$out" ] || { echo "FAIL: change escaped the minion-base app surface"; echo "$out"; exit 1; }
```

### 🚨 A1 — the board is about to get redder, on purpose

This fix's success condition is that repos which looked green stop looking green. That is not a
regression and must not be treated as one during verification: **a card flipping to red after S1 is
evidence the fix works**, and the correct response is to open the failing run, not to revert.

Before merging, run Slice 0's audit and record, per repo, the badge **before** and **after**. Paste
that table in the PR. If a repo flips, link the failing run URL beside it. A reviewer seeing four
reds appear with no explanation will reasonably assume the change broke something; a reviewer seeing
four reds each linked to a genuinely failing workflow run will approve it.

### 🚨 A2 — a stale branch value turns a false green into an empty column

This is the one way S1 can make a repo *less* informative rather than more. If `repo.branch` names a
ref that no longer exists — and there is documented evidence for at least one, hub's deleted
`origin/dev` — the filtered fetch returns `[]` and that repo carries no CI signal at all.

Three mitigations, all already in the design; do not weaken them:

1. **D4 rule 1** — `no-runs` can never render as `passing`. Even un-noticed, the failure is silent-
   neutral, not silent-green.
2. **S2 step 1** — the config is audited against live GitHub *before* merge, exact case.
3. **D6 / S2 step 4** — the branch name is on screen, so the next drift is visible without a PR.

**If Slice 0's audit finds any wrong branch value, S1 must not merge without S2.** Shipping the
filter against a stale config is how this fix becomes its own follow-up proposal.

### ⚠️ A3 — more red may mean more filed work items

`2026-08-17-maintenance-lane-monitors-spec` §S-D describes a live CI-watch monitor that files draft
proposals for red workflows (e.g. `proposals/ci-minion_hub-ci.md`). I could **not** determine from
this repo whether that monitor reads GitHub directly or consumes minion-base's derived status — the
spec says "already live" without naming its data source. **Verify before merge; do not take this
paragraph as fact.**

If it reads GitHub directly: no impact, and the two mechanisms simply agree more often after this
fix. If it consumes the board's status: the same reds A1 predicts will file proposals, possibly
several at once. That is the system working — those reds are real — but it is worth knowing on the
day rather than discovering it as an unexplained proposal spike. Note the answer in the PR.

### ⚠️ N1 — minion-base is still missing from AGENTS.md's Project Map

Flagged in `2026-08-13-minion-base-kanban-auto-refresh-spec` §5 N1 and still true today, which is why
this spec had to reconstruct every path from prose (§1). **Not fixed here** — this spec edits nothing
outside the minion-base checkout and its own proposal's frontmatter. Worth a one-line follow-up, now
twice-observed.

### ⚠️ N2 — the v2 spec's derivation table needs a one-line documentation follow-up

`2026-08-12-minion-base-v2-sdlc-kanban-spec` §1 (`status: shipped`) describes the Testing column as
"latest workflow runs" with no branch scope, and Deployment as using a deploy branch it never
constrains the query to. D3 changes the first and D5 sharpens the second. Pass 2 has settled the
behavior; update the ancestor in a separately scoped meta-repo documentation change.

## 6. Out of scope (explicit)

Carried from the proposal:

- **New status sources.** No GitHub Checks API, no commit-status API, no per-PR check runs, no
  deployments/environments API, no webhooks. This spec fixes the *filter and the derivation* on the
  one endpoint already in use. Notably this is what makes D3's Testing-column trade unavoidable in
  this pass — restoring PR CI properly needs per-PR check runs, which is a new source and belongs in
  its own proposal.

Added by this spec:

- **Which workflow the run belongs to.** `actions/runs` returns runs of *every* workflow in the repo,
  so after this fix `latest` may still be a docs or release workflow rather than CI. That is a real
  remaining imprecision on a different axis (workflow, not branch), it is pre-existing, and fixing it
  means either a workflow-id filter or a per-repo "which workflow is CI" config field. **File it as a
  follow-up proposal from the S1 PR** — do not absorb it, and do not leave it undocumented (AGENTS.md
  open-items ledger: a `TODO(handoff):` in `ci-status.ts` naming this limitation, plus the proposal).
- **Pagination past `per_page`.** If no success appears in the first page, the deployment marker is
  `unknown` (D2/D5). No second-page walk — it multiplies the rate-limit cost for a rare case.
- **Changing the columns, the derivation table's other rows, or what a card renders** beyond D6's
  branch label and the `no-runs` treatment.
- **The refresh interval, caching, or `s-maxage`.** Owned by
  `2026-08-13-minion-base-kanban-auto-refresh-spec`; untouched here.
- **Reducing the GitHub fan-out** (conditional requests / ETags, per-call caching, concurrency).
  🚨 A1 of the auto-refresh spec quantifies it; it remains its own proposal.
- **Making `minion-base` appear in AGENTS.md's Project Map** (N1) and **correcting the v2 spec's
  derivation table** (N2) — both are edits outside this spec's surface.
- **Retry, backoff, or error UI for a failed runs fetch.** `unknown` keeps v1's existing
  "unreachable" treatment; nothing new.
- **`ui-design-governance`, `lint:tokens`, or `packages/design-tokens/contract.json`.** Wrong repo —
  see the gate-conventions note at the top. minion-base's governance is `DESIGN.md` +
  `src/lib/design/tokens.css` + `bun run lint:design`.

## 7. End-to-end verification

Run with S1 + S2 merged, against the real `minion-base` checkout on `main`.

```bash
cd minion_base

# 1. Gates (v2 spec §4 chain, plus the runner the auto-refresh spec introduced)
bun test                                   # ci-status + repos suites green
bun run lint:design                         # passes; design debt is unchanged or decreases
bunx svelte-check                           # 0 errors / 0 warnings
bun run build

# 2. The bug cannot structurally recur
rg -n 'actions/runs' src/                   # → exactly ONE hit (fetchWorkflowRuns)
rg -n 'runs\[0\]' src/                      # → 0
rg -n "conclusion\s*===" src/ --glob '!src/lib/server/ci-status*'   # → 0
#    then, by hand: add a call to fetchWorkflowRuns() omitting `branch`, run `bunx svelte-check`
#    → MUST fail to type-check; revert. State in the PR that you did this.   ← D1's real proof

# 3. Every request actually names the branch (dev server, basic auth from DASH_PASSWORD)
bun run dev &
#    capture outbound GitHub URLs (temporary console.log in fetchWorkflowRuns, or a proxy):
curl -s -u "minion:$DASH_PASSWORD" http://localhost:5173/kanban > /dev/null
#    → every logged actions/runs URL carries branch=<the repo's configured branch>, URL-encoded
#    → every observed actions/runs fetch has a branch param, 0 unfiltered; record the call count

# 4. Live agreement, per tracked repo — the acceptance table for the PR
for r in <owner/name ...>; do
  b=$(<configured branch for $r>)
  echo "$r@$b:"
  gh run list --repo "$r" --branch "$b" --limit 5 \
    --json headBranch,event,status,conclusion,createdAt,url
done
#    → for every repo, the board's badge equals the latest determinate, non-PR run above.
#      Where they differ, the board is wrong and the slice is not done.

# 5. The proposal's DoD sentence, on a real repo
#    Find (or create in a scratch repo) the state: deploy branch RED, open PR branch GREEN.
#    → board card RED. Screenshot it. This is the single row that closes the proposal.

# 6. Absence is loud (D4)
#    Point one repo's config at 'this-branch-does-not-exist', reload:
#    → that card reads "<branch> · no runs"; it is NOT green and NOT "unreachable". Revert.
```

**Ship gate:** §7 blocks 1–6 green; the S1 G3 assertion failure pasted (green-PR/red-deploy asserted
against the pre-implementation stub); Slice 0's `configured vs actual` branch table pasted with every
correction made in S2; 🚨 A1's before/after badge table pasted with a failing-run URL beside every
flip; ⚠️ A3's question about the CI-watch monitor's data source answered in the PR; and D1's
deliberate type-error proof stated. D3's Testing-column decision is already settled by pass 2.
