---
id: 2026-08-28-base-deploy-status-skipped-run-noise
title: Deploy-status probe reads skipped comment-triggered runs as the deploy-branch verdict
status: draft
created: 2026-08-28
updated: 2026-08-28
repos: [minion-base]
tags: [board, logic, infra]
value: 7
effort: S
source: board-deployment-repair-df522951
---

# Deploy-status probe reads skipped comment-triggered runs as the deploy-branch verdict

`2026-08-17-base-deploy-status-branch-filter` (done) added the `branch=` filter
so a green PR-branch run can no longer paint the deploy branch healthy. Filtering
by branch is necessary but not sufficient: GitHub attaches `issue_comment` and
`issues` workflow runs to the **default branch and its tip SHA** no matter which
issue produced them, so those runs pass the branch filter and then outrank the
real deploy verdict.

## AS-IS — verified evidence (NikolasP98/minion-meta, 2026-08-28 21:0x UTC)

Deploy branch `main`, recorded tip `5ffdfec5f351c560254663a18ace06a9bc181409`.
The Board reported this deployment as failing CI. It is green:

| Surface | Result |
|---|---|
| `CI` run `33169577649`, push, `main`, 2026-08-28T12:04:03Z | `success` |
| `Release` run `33169577707`, push, `main`, 2026-08-28T12:04:03Z | `success` |

What the probe's own two read paths return for that same tip:

- `GET /repos/NikolasP98/minion-meta/actions/runs?branch=main&per_page=100` —
  98 of the 100 newest runs are `Claude Code` / `issue_comment` / `skipped`.
  The genuine `CI` run is at index **51** and `Release` at index **52**. A probe
  reading `runs[0]` sees `skipped`.
- `GET /repos/NikolasP98/minion-meta/commits/5ffdfec.../check-runs` —
  `total_count` 53: `claude` ×51 (all `skipped`), `release` ×1 (`success`),
  `verify` ×1 (`success`). A probe requiring every check run to be `success`
  sees 51 non-successes.

Both surfaces are polluted by runs that never executed any step. Across the
whole life of that workflow (id `285225744`) there are 563 runs and **zero**
executions: 542 `skipped` (job-level `if:` filtered the comment out) and 21
`action_required` (never approved). Run-to-branch attribution by event:
`issue_comment` → `main`, `issues` → `main`, `pull_request_review*` → the PR
head branch.

Because minion-meta is the factory's monitor-intake repository, bot comments
arrive faster than pushes, so the deploy branch accrues skipped runs faster than
real ones — the red reading is the steady state, not a transient.

## TO-BE

- The deploy-branch verdict is computed only from runs that can actually carry
  one: the workflows the repository's deployment depends on, triggered by a
  `push` to that branch, evaluated on the recorded tip SHA.
- A `skipped`, `neutral`, or `action_required` run is never read as failure. A
  repository with no qualifying run reports *unknown*, distinct from *red*.
- Invariant preserved from the branch-filter fix: a red deploy-branch run still
  shows red even when PR-branch runs are green.

## DELTA

1. In `src/lib/server/github.ts`, narrow all three `actions/runs` fetches from
   `branch=` alone to `branch=` + `event=push`, and select the newest run whose
   `head_sha` equals the recorded deploy tip rather than `runs[0]`.
2. Classify by conclusion: `success` → green, `failure`/`timed_out`/`cancelled`
   → red, `skipped`/`neutral`/`action_required`/absent → unknown (never red).
3. Regression test: fixture of the real 2026-08-28 `?branch=main` page (skipped
   `Claude Code` runs ahead of a successful `CI` run on the tip) must classify
   green; the same fixture with a failed `CI` run must classify red.

**Proof:** the fixture tests above, plus re-running the probe against
minion-meta `main` at a tip whose `CI` and `Release` runs are `success` and
whose check-run list still contains historical skipped `claude` entries.

## Already shipped on the minion-meta side (not a substitute)

`.github/workflows/claude.yml` no longer subscribes to `issue_comment` or
`issues`; only `pull_request_review_comment` and `pull_request_review` remain,
and those attach to the PR head branch. `scripts/workflow-triggers.mjs` +
`scripts/workflow-triggers.test.mjs` fail CI if the triggers return. That stops
minion-meta emitting new noise, but it does not repair the classifier: the 51
historical skipped check runs on `5ffdfec` stay on that commit forever, and any
other repository in the fleet can reintroduce the same reading.

## Out of scope

- New status sources beyond the Actions API.
- Deployment/promotion policy itself (see
  `2026-08-22-factory-dev-staging-daily-production-promotion`).
- Retroactively deleting the historical skipped check runs.

## Definition of done

- [ ] Deploy-branch verdict derived from `event=push` runs matched to the
      recorded tip SHA.
- [ ] `skipped`/`neutral`/`action_required` classify as unknown, never red.
- [ ] Both fixture regression tests pass, and minion-meta `main` at `5ffdfec`
      reads green on the Board.
