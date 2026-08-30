---
id: 2026-08-28-base-deploy-status-skipped-run-noise
title: "Reconciled (stale): minion-meta main reported as failing CI while its deploy-tip push runs were green"
status: closed
created: 2026-08-28
updated: 2026-08-28
repos: [minion-meta]
tags: [board, logic, infra]
value: 5
effort: S
source: board-deployment-repair-df522951
source_trust: trusted-automation
risk_class: high
priority: medium
owner: factory
---

# Reconciled (stale): minion-meta main reported as failing CI while its deploy-tip push runs were green

**Disposition — closed, reconciliation only.** The Board's stage-5 "repair deployment"
item for `NikolasP98/minion-meta@5ffdfec` is a **stale report**: the recorded deploy tip
is unchanged and both of its trusted deploy-branch push runs are green. This artifact
records that evidence and closes the item. **It proposes no code change, in any
repository, and opens no follow-up work** — see *What this artifact does not claim*.

All evidence below was collected directly from the GitHub REST API and from an
executable replay of the deployed Board source, **as of `2026-08-28T21:58Z`**. Where a
figure is a live counter that keeps moving, it is marked as such.

## AS-IS — the observable state being reconciled

**The report.** Board stage 5 recorded `NikolasP98/minion-meta` deploy tip
`5ffdfec feat(skills): install released engineering bundle (#232)` as failing CI, which
is what dispatched factory run `df522951`.

**The deploy tip is unchanged and its own CI is green.**

| Fact | Value |
|---|---|
| `heads/main` tip | `5ffdfec5f351c560254663a18ace06a9bc181409` (unchanged) |
| `CI` run `33169577649` — `push`, `main`, `5ffdfec`, 2026-08-28T12:04:03Z | `success` |
| `Release` run `33169577707` — `push`, `main`, `5ffdfec`, 2026-08-28T12:04:03Z | `success` |

Those two are the only workflow runs the tip's own push produced, and both concluded
`success`. There is no failing deploy signal to repair.

**No `failing` classification for this tip was reachable at all.** `deriveBranchCi`
returns `failing` only for a completed run whose conclusion is in its
`FAILING_CONCLUSIONS` set — `{failure, timed_out, startup_failure, action_required}`
(`minion-base/src/lib/server/ci-status.ts:33,57`, read at deployed `minion-base@19531059`).
Querying branch `main` per conclusion:

| `?branch=main&status=…` | `total_count` | Newest occurrence |
|---|---|---|
| `failure` | 18 | 2026-06-19T19:12:09Z (runs `27844049372`, `27844049401`) |
| `timed_out` | 0 | — |
| `startup_failure` | 0 | — |
| `action_required` | 0 | — |

Every failing-class run on `main` predates this tip by more than two months. So for
`5ffdfec` the classifier's reachable outputs were `passing` (a determinate success is
visible in the page) or `unknown` (no determinate run is visible in the page) — never
`failing`.

**What the deployed Board actually computes today.** The most recent successful
Production deployment recorded on `NikolasP98/minion-base` is deployment `6148708678`,
ref `19531059cf42e352e35425dd3b3b71afa9eb540f`, state `success`, 2026-08-28T21:19:32Z
(also the current `minion-base` `main` tip). Fetching `src/lib/server/ci-status.ts` at
**that exact SHA** and running its `deriveBranchCi` over the live
`actions/runs?branch=main&per_page=20` payload for minion-meta yields:

```
status:      passing
latest:      33213894377  Claude Code | issue_comment | success | 2026-08-28T21:44:59Z
lastSuccess: 33213894377  (same run)
window:      20 runs — Claude Code|issue_comment: 18 skipped, 2 success
```

The Board's own classifier reports **`passing`**, not `failing`.

**Why the point-in-time page evidence moves between observations.** `issue_comment`
events run against the default branch, so every comment on a minion-meta PR — including
this run's own factory/review comments — creates a `Claude Code` run stamped
`head_branch: main`. That workflow has minted 566 runs, 541 of them on `main` (live
counters, as of 2026-08-28T21:58:39Z; `5ffdfec` currently carries 56 commit check-runs).
They arrive fast enough to fill the 20-run window, which is why replays of the same
function against the same branch returned `unknown` at 21:28Z and `passing` at 21:58Z.
Neither reading is `failing`, and the whole-history conclusion table above is the
durable form of the evidence — it does not drift with the window.

## TO-BE — the reconciled state

The stage-5 deployment item for `5ffdfec` is closed as reconciled-stale, with the two
green push run IDs, the deployed Board revision, and the executed classifier replay
recorded here. No Board card remains open for it, and no repair work is queued.

## DELTA — exactly what changes

1. This artifact's lifecycle status moves `review → closed`, so it leaves the Board's
   active Kanban instead of replacing one stale card with another: the deployed board
   filters proposals through `P_ACTIVE = ['draft', 'review', 'approved']`
   (`minion-base/src/routes/kanban/+page.svelte:310,313` at deployed `minion-base@19531059`), and
   `closed` is not in it.
2. `proposals/index.json` is regenerated from the frontmatter.
3. Nothing else. The branch ships no code, workflow, or configuration change.

**Invariant preserved:** `.github/workflows/claude.yml` keeps its `issue_comment`,
`issues`, `pull_request_review_comment` and `pull_request_review` triggers exactly as
they were before this run.

## What this artifact does not claim

- **No false-red classifier defect is asserted.** Round 1 of this run named
  `runs[0]` ordering and commit check-run aggregation as the cause; both were
  contradicted by the deployed source and are withdrawn.
- **No fleet-wide `event=push` filter is proposed.** Round 1 suggested one; it would
  suppress `workflow_run` / `workflow_dispatch` / `schedule` deployment signals (e.g.
  `minion-factory`'s promotion runs) and contradicts the approved contract in
  `specs/2026-08-17-base-deploy-status-branch-filter-spec.md`. Withdrawn.
- **`unknown` is not a bug.** That spec's §D2/§D5 define `unknown` as the intended
  result when no success appears within `per_page`, and put pagination past the first
  page explicitly out of scope. A window with no determinate run declining to report
  green is the designed "absence is not health" behavior.
- **The workflow-identity imprecision is neither adopted nor introduced here.** The
  replay's `latest`/`lastSuccess` landing on a `Claude Code` comment run rather than on
  `CI`/`Release` is the pre-existing consequence of `actions/runs` returning every
  workflow — a limitation the same approved spec already names in its own out-of-scope
  section, with its follow-up owed by that spec's S1 PR in `minion-base`. This
  reconciliation neither resolves it nor re-files it, and adds no open end of its own.
  It does not make the two trusted push runs any less green.
- **Limitation, stated rather than papered over:** the authenticated Board page's
  rendered badge was not inspected. `base.minion-ai.org` returns HTTP 401 unauthenticated
  and no `browser-harness` binary exists in this environment. The deployed revision, its
  exact source, the live API input, and the executed derivation are verified
  independently of the rendering layer.

## Round-1 work reverted (recorded for audit)

Acting on the withdrawn diagnosis, round 1 removed the `issue_comment` and `issues`
triggers from `.github/workflows/claude.yml` and added `scripts/workflow-triggers.mjs`
plus its test to assert they stayed removed. All of that is reverted: the workflow file
is byte-identical to its pre-run state and both scripts are deleted. Those triggers are
the supported `@claude` entry point from ordinary issue and PR conversation comments
(installed by PR #8); removing a producer-side trigger was never a valid response to a
consumer-side classification question, and that question does not reproduce.

## Out of scope

- Any change to minion-base's status classifier, its fetch, or its page size.
- Any change to GitHub Actions triggers, workflows, or permissions in minion-meta.
- Deployment/promotion policy (see
  `2026-08-22-factory-dev-staging-daily-production-promotion`).
- Retroactively deleting historical skipped check runs or workflow runs.

## Definition of done

- [x] The recorded deploy tip is confirmed unchanged (`5ffdfec5f351c560254663a18ace06a9bc181409`).
- [x] Both trusted deploy-branch push runs for that tip are recorded green with IDs
      (`33169577649` CI, `33169577707` Release).
- [x] The report is shown to be non-reproducible from the deploy branch: no
      failing-class run has existed on `main` since 2026-06-19, so `failing` was
      unreachable for this tip.
- [x] The deployed Board revision is identified (`minion-base@19531059`, Production
      deployment `6148708678`, 2026-08-28T21:19:32Z) and its own `deriveBranchCi`
      replayed over the live payload → `passing` (as of 2026-08-28T21:58Z).
- [x] Round-1 producer-side changes are fully reverted; the branch ships documentation
      only.
- [x] The item is closed with a terminal lifecycle status and `proposals/index.json`
      regenerated, leaving no open end and no new Board card.
