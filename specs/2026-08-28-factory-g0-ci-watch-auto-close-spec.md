---
id: 2026-08-28-factory-g0-ci-watch-auto-close-spec
title: G0 reconciler auto-closes CI-watch proposals once the watched workflow goes green
stage: spec
status: draft
pass: 1
created: 2026-08-28
updated: 2026-08-28
proposal: 2026-08-18-factory-g0-ci-watch-auto-close
verdict: pending
repos: [minion-factory]
type: fix
tags: [infra, logic, test]
relationship: extends
related: [2026-08-17-sdlc-phase-gates-scoring-spec]
---

# G0 reconciler auto-closes CI-watch proposals once the watched workflow goes green

## 0. Product

From the approved proposal `2026-08-18-factory-g0-ci-watch-auto-close`, verbatim:

> CI-watch files a proposal (e.g. `proposals/ci-minion-meta-claude-code-review.md`) the first
> time a fleet workflow's latest completed run on its deploy branch fails. Nothing currently
> reconciles these back to `closed`/`rejected` once the underlying workflow is green again —
> they stay open indefinitely even after the human (or an unrelated commit) fixes the red,
> becoming exactly the kind of stale board noise G0 exists to kill.
>
> **Definition of done:** during the reconcile sweep, for every open CI-watch proposal
> (`source` field or filename prefix identifies it), re-check the watched workflow's latest
> completed run on its deploy branch; if green, set `status: closed` with a short reason
> ("workflow green again as of \<date\>, run \<url\>") and regenerate `proposals/index.json`.

The proposal's own board audit (2026-08-28) proves the gap is live, not theoretical: two
green-again CI-watch proposals sat as board noise until a human closed them by hand
(`proposals/ci-minion-ai-npm-publish.md`, `proposals/ci-minion-ai-docker-release.md` — both
carry a hand-written `closed_reason: "Workflow healed: ..."` today).

## 1. Relationship recommendation

**Recommended: `extends`.**

- `2026-08-17-sdlc-phase-gates-scoring-spec` §5 Slice 1 bundles "G0 spec-sweep reconciler
  (+ link hygiene + CI-watch proposal auto-close)" as one line item, and §3 "Source hygiene"
  names the exact behavior this spec implements ("CI-watch proposals auto-close when the
  watched workflow goes green again (reconciler checks)"). This spec carves that one piece out
  and makes it concrete and implementation-ready, without redefining or reimplementing the
  other two pieces of that bundled slice: the spec-sweep (tracked as minion-factory PR #2,
  open on a human-escalated design disagreement) and link hygiene (blocked behind
  `2026-08-18-meta-spec-index-project-possibly-shipped-spec`'s reordered G0 contract plan,
  already `stage: done` / `status: shipped` for its own narrower scope). Neither of those is a
  prerequisite for this patch: the auto-close loop touches only CI-watch proposal files and
  depends on no field, sweep, or contract either of them introduces.

No other spec or open proposal targets `agent/reconcile.sh`'s CI-watch loop specifically —
confirmed by re-reading the live file end to end (below) and by grep across `specs/index.json`
and `proposals/index.json` for `ci-watch`/`reconcile.sh`/`auto-close`, which returns only the
parent scoring spec and this proposal's own prior audit mentions.

## 2. AS-IS → TO-BE → DELTA

### AS-IS — verified against `NikolasP98/minion-factory@main` `9dc06488683fd700e6e2a11d83bc6ccbcc0ad2d0`
(re-verified via `gh api`/`gh repo clone` 2026-08-28; the proposal's cited `6ee39279` is stale by
several commits but the CI-watch loop's structure and line-adjacent code are materially
unchanged — line numbers below are this run's anchors, re-read HEAD before implementing).

1. `agent/reconcile.sh:61-141` is the entire CI-watch mechanism. The `for entry in
   ${FACTORY_CI_WATCH:-}` loop (line 67) fetches `runs_json` once per repo:branch (line 70),
   then a `while IFS= read -r fail; do ... done` (lines 72-140) files or refreshes one draft
   proposal per **failing** most-recent-completed workflow run. There is no code path anywhere
   in the file that ever writes `status: closed` for a CI-watch proposal — confirmed by
   `grep -n "status: closed"` over the whole file returning nothing.
2. The slug a proposal is filed under (line 77) is
   `` ci-$(basename "${repo}")-$(tr '[:upper:] ' '[:lower:]-' <<<"${wf}" | tr -cd 'a-z0-9-') ``.
   This recipe is not shared via a function — any closing logic must reproduce it exactly to
   resolve to the same file the filing loop wrote, or a green workflow's proposal will never be
   found.
3. `scripts/proposal-index.mjs:8-18` (this repo, minion-meta — the file `agent/reconcile.sh`
   operates on after `gh repo clone "${FACTORY_META_SLUG}" work`) already lists `closed` as a
   valid `P_STATUSES` value with no required companion field, unlike `retired` (which the same
   file gates on a `retired_reason >= 20 chars`, lines 44-46). `closed_reason` is not in the
   projected field allowlist (lines 59-73) — it is deliberately an in-file, unprojected note,
   exactly like the existing `retired_reason`. **No minion-meta schema or script change is
   needed**; the target status and the informal reason-field convention already exist and are
   already exercised by hand (the two `ci-minion-ai-*` proposals above).
4. The post-loop tail of `agent/reconcile.sh` (verified unchanged near end of file) already
   does `node scripts/proposal-index.mjs` and commits/pushes whenever
   `git status --porcelain proposals/` is non-empty — it diffs the whole directory, not just the
   filing loop's own writes. **No new index-regeneration or commit wiring is needed.**
5. `agent/lib/handoff.sh:1-16` states the file's own reason for existing separately from
   `agent/reconcile.sh`: *"It lives in its own file (like lib/cost.sh) so
   `agent/lib/handoff.test.sh` can exercise create/refresh/close/reopen against local fixture
   repos without the rest of reconcile.sh, which needs gh, the network and paid model calls."*
   The same pattern is repeated for every other reconcile-sweep behavior:
   `agent/lib/{cost,handoff,mergescan,discovery,resume,projection,workspace-resume}.sh`, each
   baked into the agent image at a fixed `/usr/local/lib/factory-*.sh` path
   (`agent/Dockerfile:54-66`) and each with a same-named `*.test.sh` wired into
   `.github/workflows/ci.yml:74-97` behind `if: steps.scope.outputs.shell == 'true'`.
6. This precedent is load-bearing, not stylistic: prior factory-run observations record that
   `agent/reconcile.sh` (like `run.sh`, `discovery.sh`, `spec.sh`) sources
   `/usr/local/lib/factory-*.sh` by hardcoded absolute path unconditionally — those files exist
   **only** because `agent/Dockerfile` copies them there at image build time — so the top-level
   script "exits 78 before reaching any real logic" in a plain checkout or CI runner. Any new
   behavior inlined directly into `agent/reconcile.sh` (as the proposal's own reference patch
   does) is therefore **not unit-testable** the way every sibling sweep behavior already is; it
   can only be exercised by running the built Docker image end to end.

### TO-BE — target behavior and invariants

- Every CI-watch proposal currently `status: draft` or `status: review` is re-checked, every
  sweep, against the same `runs_json` already fetched for the failure check (line 70) — **no
  new `gh` call, no new network round trip, no new paid model call**.
- If the most recently **completed** run of that proposal's workflow is a **success**, the
  proposal flips to `status: closed`, `updated` bumps to today, and (only if absent) a
  `closed_reason` line is inserted citing today's date and the green run's URL — mirroring the
  two hand-written `ci-minion-ai-*` closures exactly.
- A human disposition — `approved`, `rejected`, `closed`, `merged`, `retired` — is never
  touched by this sweep. This mirrors the filing loop's own `case "${st}" in draft|review) ;;
  *) continue ;; esac` gate (line 82) precisely; the same gate value decides both filing-refresh
  and now closing.
- The sweep is idempotent: re-running it against an already-closed proposal (same day or a
  later day) produces a byte-identical file — no duplicate `closed_reason`, no repeated
  `updated` churn.
- The slug resolution for closing is **identical** to the filing loop's (line 77) so a green
  workflow's proposal is always found regardless of workflow-name casing/spacing/punctuation.
- The new behavior is unit-testable without `gh`, network, or a built Docker image — same bar
  every other sweep behavior in this file already clears.

### DELTA — numbered transitions, each mapped to a slice step and its proving test

1. **No code path closes a green CI-watch proposal → one does, extracted as a standalone
   function.** Mapped to Slice 1a. Proven by `bash agent/lib/ciwatch.test.sh` fixtures A/B
   (draft/review proposal + latest-completed-run success → `status: closed` +
   `closed_reason` citing the run URL and today's date).
2. **The behavior cannot be unit-tested without the built Docker image → it can be, matching
   the handoff/mergescan/discovery/resume/projection/workspace-resume precedent.** Mapped to
   Slice 1a. Proven by running `bash agent/lib/ciwatch.test.sh` directly in a plain checkout —
   no `gh`, no network, no `/usr/local/lib/*` paths required.
3. **No protection exists (because no closing code exists) for human dispositions or for
   repeat sweeps → both are guaranteed once the function exists.** Mapped to Slice 1a. Proven
   by fixtures C/D (status `approved`/`rejected` left byte-identical) and fixture E (re-running
   against an already-`closed` file with an existing `closed_reason` is a no-op diff).
4. **Slug resolution for closing does not exist → it exactly matches the filing loop's
   recipe.** Mapped to Slice 1a. Proven by fixture I: a workflow name with mixed case and
   spaces resolves the closing path to the exact same `proposals/<slug>.md` the filing loop
   would have written for that name.
5. **`agent/reconcile.sh` has no wiring for this behavior at all → it sources the new lib
   (fatal-if-missing, matching the handoff/mergescan guard style at lines 150-154/161-164) and
   calls it inside the existing per-entry loop, immediately after the failure `while`/`done`
   (between current lines 140 and 141), reusing the already-in-scope `${repo}`, `${runs_json}`,
   `${today}`.** Mapped to Slice 1b. Proven by `bash -n agent/reconcile.sh` (existing CI step,
   `ci.yml:50`) plus `git grep -n 'factory-ciwatch' agent/reconcile.sh` showing exactly one
   `source` line and one call line, since the wired top-level script itself cannot be
   subprocess-run standalone in this environment (same constraint as #2).
6. **`agent/Dockerfile` and `.github/workflows/ci.yml` do not know the new lib file exists →
   both are updated the same way every sibling lib file is registered, so the new behavior
   ships live and stays covered by CI instead of being silently dead code.** Mapped to Slice
   1c. Proven by the new `Ci-watch autoclose tests` CI step (named like its siblings, same
   `if: steps.scope.outputs.shell == 'true'` guard) appearing and passing on the implementing
   PR, and by `git grep -n factory-ciwatch agent/Dockerfile` showing exactly one new `COPY`
   line alongside the existing six.

## 3. Approach

One vertical slice — the behavior is small (one new lib function plus wiring) and must ship
atomically: a merged lib file that `agent/reconcile.sh` doesn't yet call, or a call that isn't
baked into the image/CI, would be exactly the "projected but unconsumed" failure mode
`2026-08-18-meta-spec-index-project-possibly-shipped-spec` was written to stop. Splitting this
into "add the function" and "wire it up" as separate mergeable units would recreate that same
half-shipped interval for no benefit — the whole change is well under a day of work.

### Slice 1 — CI-watch proposals auto-close on green, extracted and tested like every sibling sweep

**Topics:** `infra`, `logic`, `test`

**Files to touch (all in `minion-factory`):**
- `agent/lib/ciwatch.sh` (new) — one function, contract below.
- `agent/lib/ciwatch.test.sh` (new) — fixture-based, no network/gh, modeled on
  `agent/lib/handoff.test.sh`'s `sandbox`/`has`/`hasnt`/`eq` helper style.
- `agent/reconcile.sh` — add the source-and-guard block + one call site inside the existing
  `for entry in ${FACTORY_CI_WATCH:-}` loop. No other line in this file changes; the existing
  filing loop, the haiku diagnosis call, and the post-loop commit/push tail are untouched.
- `agent/Dockerfile` — one `COPY --chmod=644 agent/lib/ciwatch.sh
  /usr/local/lib/factory-ciwatch.sh` line in the existing lib-COPY block (lines 54-66).
- `.github/workflows/ci.yml` — one new step (`bash agent/lib/ciwatch.test.sh`, same
  `if: steps.scope.outputs.shell == 'true'` guard) alongside the other `agent/lib/*.test.sh`
  steps (lines 74-97).

**Function contract (`agent/lib/ciwatch.sh`):**

```
# ciwatch_autoclose <repo> <runs_json> <today>
#   <repo>      = "owner/name", same value the caller's FACTORY_CI_WATCH entry loop already has
#   <runs_json> = the SAME `gh run list --json workflowName,conclusion,status,databaseId,url`
#                 output already fetched by the caller for the failure check — no new gh call
#   <today>     = "$(date +%F)", already computed once by the caller
#
# For every workflow whose most recent COMPLETED run (group_by(.workflowName) | map(.[0]),
# identical grouping to the failure query so ordering guarantees match) has conclusion
# "success": resolve proposals/<slug>.md using the exact filing-loop slug recipe; if the file
# exists and its status is draft or review, set status: closed, bump updated to <today>, and
# (only if no closed_reason line exists) insert one citing <today> and the green run's url.
# Any other status, or no file at all, is a no-op — same case/continue gate the filing loop
# already uses for its own refresh-vs-leave-alone decision.
ciwatch_autoclose() { ... }
```

**Definition of done (machine-checkable):**
- `bash agent/lib/ciwatch.test.sh` exits 0 and covers at minimum:
  - draft or review proposal + green latest-completed-run → closes with a `closed_reason`
    naming the run URL and the passed-in date;
  - `approved` / `rejected` proposal → file byte-identical after the call;
  - already `closed` proposal with an existing `closed_reason` → file byte-identical after a
    second call (idempotency);
  - latest completed run still `failure` → no-op (this function only ever closes, never
    files or refreshes a red — that stays the existing loop's job);
  - no `proposals/<slug>.md` for a workflow that has always been green → no-op, no file created;
  - a workflow name with mixed case / spaces / punctuation resolves to the identical slug the
    filing loop's own recipe would produce for that name.
- `bash -n agent/reconcile.sh` passes (existing CI gate, unchanged command).
- `git grep -c factory-ciwatch agent/Dockerfile` = 1, `git grep -c factory-ciwatch
  agent/reconcile.sh` = 2 (one source line, one call line).
- The new CI step passes on the implementing PR and every pre-existing step in `ci.yml`
  remains green (no unrelated line in `agent/reconcile.sh`, `agent/Dockerfile`, or `ci.yml` is
  touched).
- A `git diff` of `agent/reconcile.sh` shows only the new source-guard block and one call line
  inserted between the existing lines 140 and 141 — nothing in lines 61-140 or the post-loop
  tail changes.

## 4. Cross-repo impact assessment

| Repo | Impact | Mitigation |
|---|---|---|
| `minion-factory` | New lib + test file; `agent/reconcile.sh` gains ~4 sourced lines and one call; `agent/Dockerfile` gains one `COPY`; `ci.yml` gains one step. | Purely additive at one insertion point each; DoD above requires a diff showing nothing else moves. |
| `minion-meta` (data only, no code change) | Once deployed, this repo's own `proposals/*.md` CI-watch entries can transition `draft`/`review` → `closed` automatically on the next sweep after their workflow turns green. | Same status value and `closed_reason` convention already used by hand twice in this repo (`ci-minion-ai-npm-publish.md`, `ci-minion-ai-docker-release.md`); `scripts/proposal-index.mjs` already accepts `closed` with no schema change (§2 AS-IS #3). |
| `minion-base` (board) | None. | The board already renders arbitrary `status: closed` proposals — `closed` has been a valid `P_STATUSES` member all along; this slice only makes the sweep reach it automatically instead of by hand. |

No unavoidable cross-repo impact requires an alert beyond the data-mutation note above, which
is the intended, already-human-validated behavior this proposal exists to mechanize.

## 5. Out of scope

- The G0 spec-sweep piece of `2026-08-17-sdlc-phase-gates-scoring-spec` §5 Slice 1
  (minion-factory PR #2, open on a human-escalated design disagreement) — untouched, unrelated
  to this patch.
- Link hygiene (`revises`/`supersedes` enforcement) — tracked separately behind
  `2026-08-18-meta-spec-index-project-possibly-shipped-spec`'s reordered G0 contract plan.
- Upstream-monitor noise thresholds (`2026-08-17-sdlc-phase-gates-scoring-spec` §5 Slice 6,
  `minion` repo) — a different repo and a different mechanism.
- Refactoring the existing red-filing `while`/`done` block (`agent/reconcile.sh:72-140`) into
  `agent/lib/ciwatch.sh` — only the new closing behavior is extracted. The filing loop keeps
  running inline exactly as today, called from the same `for entry` loop, so this slice's diff
  stays minimal and independently reviewable. A future spec may propose unifying both halves
  into one lib file; nothing here blocks that.
- Any change to the `FACTORY_CI_WATCH` entry format, the fields requested from `gh run list`,
  or the haiku diagnosis call's behavior/cost — all untouched.
- Backfilling or re-verifying the two already hand-closed `ci-minion-ai-*` proposals — they are
  already `status: closed` with a `closed_reason` and need no action.
- Any minion-meta code or schema change — none is needed (§2 AS-IS #3-#4).

## 6. End-to-end verification

1. `bash agent/lib/ciwatch.test.sh` — green, covering the fixture matrix in §3's DoD.
2. `bash -n agent/reconcile.sh` — green (existing gate, unchanged invocation).
3. `git grep -n factory-ciwatch agent/Dockerfile agent/reconcile.sh` — shows exactly the three
   expected lines (one `COPY`, one `source`, one call).
4. Open the implementing PR; confirm `ci.yml`'s new `Ci-watch autoclose tests` step (or
   equivalently named, following the existing `<Verb> tests` convention) appears under the
   `shell`-scope path and passes, alongside every pre-existing step remaining green.
5. Post-merge, on the next real or synthesized red→green cycle for a `FACTORY_CI_WATCH`-listed
   workflow: confirm the proposal flips `status: draft`/`review` → `closed` with a
   `closed_reason` citing that day's date and the green run's URL, and that
   `proposals/index.json` regenerates and commits via the reconciler's existing, unmodified
   post-loop tail (no new index-wiring should be needed — confirming §2 AS-IS #4).
6. Re-run the sweep immediately after step 5; confirm `git status --porcelain proposals/` is
   empty for that file (idempotency holds in production, not just in the fixture test).
