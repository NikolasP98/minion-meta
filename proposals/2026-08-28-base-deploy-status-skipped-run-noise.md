---
id: 2026-08-28-base-deploy-status-skipped-run-noise
title: Board read minion-meta main as failing while CI was green — root cause not yet located
status: review
created: 2026-08-28
updated: 2026-08-28
repos: [minion-base]
tags: [board, logic, infra]
value: 5
effort: S
source: board-deployment-repair-df522951
---

# Board read minion-meta main as failing while CI was green — root cause not yet located

## Correction (2026-08-28, round 2)

The first draft of this proposal diagnosed the false-red reading as `deriveBranchCi`
reading `runs[0]` off a 100-run, all-workflows page, or requiring every commit
check-run on the tip to succeed. Both mechanisms are **contradicted by the live
source** (`NikolasP98/minion-base@19531059`):

- `fetchWorkflowRuns` (`src/lib/server/github.ts:113-124`) requests
  `actions/runs?branch=...&per_page=20` — 20 runs, not 100.
- The deploy path never queries commit check-runs at all; that endpoint is used
  elsewhere, for PR detail (`src/lib/server/github.ts:906-918` calls
  `deriveBranchCi`, not the check-runs endpoint, for the deploy card).
- `deriveBranchCi` (`src/lib/server/ci-status.ts:38-62`) sorts explicitly
  (newest first, not API-order `runs[0]`), drops `pull_request`/
  `pull_request_target` events, and **continues scanning past** `cancelled` /
  `skipped` / `neutral` / `stale` conclusions looking for the first determinate
  one. It does not treat indeterminate runs as failure.

Replaying `deriveBranchCi` over the actual 20-run `?branch=main&per_page=20`
page for minion-meta at `5ffdfec` returns `{status: "unknown", latest: null,
lastSuccess: null}` — not `failing`. So the mechanism this proposal originally
named does not explain the Board's reported red/failing state for that tip, and
no deployed-revision trace was captured that does. **The original task's premise
(a reproducible false-red classifier bug) is unconfirmed.**

Acting on the unconfirmed diagnosis, round 1 of this run also removed the
`issue_comment` and `issues` triggers from `.github/workflows/claude.yml` in
minion-meta, plus a guard script asserting they stay removed. That change has
been **reverted** in this repo: those triggers are how `@claude` is invoked from
an ordinary issue or PR conversation comment (installed by PR #8), and removing
a producer-side trigger is not a fix for a consumer-side classification
question that, per the replay above, does not reproduce the way this proposal
claimed. See `Reverted work` below.

## AS-IS — verified evidence (NikolasP98/minion-meta, 2026-08-28)

Deploy branch `main`, recorded tip `5ffdfec5f351c560254663a18ace06a9bc181409`.

| Surface | Result |
|---|---|
| `CI` run `33169577649`, push, `main`, 2026-08-28T12:04:03Z | `success` |
| `Release` run `33169577707`, push, `main`, 2026-08-28T12:04:03Z | `success` |

Both are genuine deploy-branch push runs and both are green. The Board is
recorded (task source) as having reported this deployment as failing CI at
some point on 2026-08-28; that report was not reproduced from the live
`minion-base` classifier against the corresponding 20-run page (see
Correction above), so the discrepancy between "Board said failing" and
"classifier says unknown/passing" is itself the open question, not something
this proposal has explained.

Separately, and still true, but **not on the deploy card's call path**: the
commit check-runs on `5ffdfec` are heavily polluted —
`GET /repos/NikolasP98/minion-meta/commits/5ffdfec.../check-runs` returns
`total_count` 53: `claude` ×51 (all `skipped`), `release` ×1 (`success`),
`verify` ×1 (`success`). Across the whole life of that workflow (id
`285225744`) there are 563 runs and zero executions: 542 `skipped` (job-level
`if:` filtered the comment out) and 21 `action_required` (never approved).
This pollution is real and affects any consumer that *does* read check-runs or
a wider run page (e.g. a PR status view, or a future deploy-card change that
regresses the `per_page=20` / no-check-runs design) — it just isn't what
produced the Board reading investigated here.

## What still needs doing (handoff, not resolved by this run)

This run does not have write access to `minion-base` (not a checked-out
subproject of this workspace — see `AGENTS.md`'s Project Map). The open end is
recorded here per the AGENTS.md open-items ledger, in place of an in-repo
`TODO(handoff):` this workspace cannot place:

- **Target site:** `NikolasP98/minion-base@main`
  `src/lib/server/ci-status.ts` (`deriveBranchCi`) and
  `src/lib/server/github.ts:113-124,906-918` (`fetchWorkflowRuns`, deploy-card
  call site).
- **What:** reproduce the exact deployed-revision input and rendered output for
  the reported failing card (not a re-derivation from `main`'s current state,
  which has since moved), and trace which adapter or cache actually rendered
  red. If the Board is presently reading `unknown` or `passing` for this
  branch, that is a stale-report reconciliation, not a classifier defect.
- **Separately, already anticipated by the approved spec** (see below): a
  workflow-identity axis is still open — `actions/runs` returns runs from every
  workflow in the repo, so `latest` can be a non-CI workflow. That is a real,
  pre-existing gap on a different axis than this proposal investigated.

## Rejected approach: global `event=push` filter

Round 1 proposed narrowing every `actions/runs` fetch to `branch=` + `event=push`
fleet-wide. This regresses the approved contract in
`specs/2026-08-17-base-deploy-status-branch-filter-spec.md` (§"Added by this
spec" / §D5), which deliberately keeps non-`push` events and names **workflow
identity**, not event type, as the remaining axis to resolve via a per-repo
"which workflow is CI" config — filed as its own follow-up, not absorbed here.

Independently verified evidence this run that a global `event=push` filter
would produce false `unknown` results on real deploys: `NikolasP98/minion-factory`
main's most recent deploy-relevant runs are `Promote Factory dev to production`
triggered by `workflow_run` and `workflow_dispatch` (e.g. run `33201167861`,
`event: workflow_run`, `conclusion: success`, 2026-08-28T18:50:54Z) — no `push`
event appears in its recent branch history at all. A global `event=push` filter
would hide this repository's real deployment signal permanently, not just for
comment noise.

(Round 1 additionally cited `pixel-agents`' `Update Badge Stats` workflow as a
`schedule`-triggered example; this run could not independently reproduce that —
the workflow exists but currently shows zero runs — so it is dropped from the
evidence base rather than restated as fact.)

## TO-BE (revised)

Two separable, correctly-scoped follow-ups remain, neither of which this
proposal resolves:

1. **Locate the actual cause of the reported false-red reading** (see Handoff
   above) before writing a fix for it. If it doesn't reproduce against the
   current deployed code, close this as reconciled rather than shipping a
   change for an unconfirmed defect.
2. **Workflow-identity classification**, if pursued, must be per-repository
   (which workflow(s) count as CI/deploy for that repo) and must not discard
   `workflow_dispatch`, `schedule`, or `workflow_run` events — those are real
   deployment signals for at least `minion-factory`. This matches the axis the
   approved branch-filter spec already earmarked as a follow-up, not a new
   scope.

## Reverted work (this run)

`.github/workflows/claude.yml` is restored to subscribing to `issue_comment`
and `issues` (in addition to `pull_request_review_comment` and
`pull_request_review`), matching the state before this run. `scripts/
workflow-triggers.mjs` and `scripts/workflow-triggers.test.mjs`, which asserted
those triggers stay removed, are deleted. No minion-meta producer-side change
ships from this run.

## Out of scope

- New status sources beyond the Actions API.
- Deployment/promotion policy itself (see
  `2026-08-22-factory-dev-staging-daily-production-promotion`).
- Retroactively deleting the historical skipped check runs.
- Removing or altering any GitHub Actions trigger in minion-meta — no evidence
  supports that as a fix for a `minion-base`-side classification question.

## Definition of done

- [ ] The reported false-red reading is reproduced against the actual deployed
      `minion-base` revision and input, or the report is reconciled as stale
      with that evidence recorded here.
- [ ] If a classifier change is still warranted, it is scoped to workflow
      identity per repository, preserves `workflow_dispatch`/`schedule`/
      `workflow_run` as valid deploy signals, and ships with fixture
      regression tests (including a minion-factory-shaped `workflow_run`
      fixture and a comment-noise-shaped fixture).
