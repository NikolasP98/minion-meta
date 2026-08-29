---
id: 2026-08-29-factory-failure-cost-hardening-spec
title: Factory failure and CI cost hardening — evidence-bound retries, durable pause, card reuse, and bounded platform CI
stage: spec
status: implementing
pass: 2
created: 2026-08-29
updated: 2026-08-29
verdict: approved
repos: [minion-factory, minion, minion-meta]
tags: [logic, infra, test]
type: infra
relationship: extends
related: [2026-08-17-factory-token-budget-governance-spec, 2026-08-18-factory-deterministic-unstick-spec, 2026-08-18-factory-durable-state-outbox-spec, 2026-08-22-factory-lineage-orchestrator-instance-spec]
next_slice: 1
---

# Factory failure and CI cost hardening

## 0. Product

This program hardens the Factory execution and MINION CI control planes using the observed failure
and billing evidence from August 2026. Its product outcome is fewer paid runs that repeat known
failure states, an observable operator pause that preserves the queue, one incident card per semantic
failure fingerprint, and bounded cross-platform CI on the exact integration candidate.

### Decision

Adopt one runner-owned retry decision for every failed development source run. The decision uses a
normalized failure class, exact candidate progress, prior lineage outcomes, remaining budget, and
the fleet circuit breaker. It may admit one bounded retry, escalate one model tier for a demonstrated
capability failure, or stop and reuse one monitor card. Agent prose does not authorize a retry.

Keep the Factory API online while work is paused. `FACTORY_DISPATCH_PAUSED=1` prevents queue claims,
auto-fix admission, spec promotion, and advisory facilitator dispatch while preserving health,
budget, queue, and monitor visibility. Deployment in this program keeps the flag at `1`; resuming the
59 queued runs is a later operator decision.

Retain the current `minion-ai/DEV` CI architecture. It already removed feature-branch push CI,
deferred full Windows tests to the exact `DEV` integration SHA, sharded the suite, and added bounded
Windows/Linux jobs. Add only the missing macOS timeout and cancel superseded `DEV` CI runs.

### Provenance and related programs

No proposal precedes this spec. It was authored directly from the 2026-08-29 Factory failure and
billing audit session, whose evidence §1 records; the proposal stage was skipped because the audit
already produced the measured baseline a proposal would have argued for, and this artifact records
that skip. The spec extends four live programs and replaces none of them:

- `2026-08-17-factory-token-budget-governance-spec` — extends its caps and tier ladder with a
  durable, evidence-bound retry decision. Its budget caps, daily budget, and iteration limits are
  unchanged.
- `2026-08-18-factory-deterministic-unstick-spec` — extends its deterministic unstick classes with an
  authoritative operator-pause signal to read. Its advisory-only facilitator contract and scoped
  credential are unchanged.
- `2026-08-18-factory-durable-state-outbox-spec` — extends its `postFinish` outbox with the
  `retry_decisions` record and admission transaction. The outbox mechanism, processing lease, and
  lifecycle edges are unchanged.
- `2026-08-22-factory-lineage-orchestrator-instance-spec` — shares its lineage identity so retry and
  monitor recurrence survive restarts; monitor-card cardinality follows the semantic-fingerprint
  rule in §3. The orchestrator instance itself stays out of scope (§10) and its branches (Factory
  PRs #160–#163) are untouched.

## 1. Evidence and baseline

The audit used the August usage report whose SHA-256 is
`3e36e853693363d79f65f9f8839fa4afe8ed6d190e0404179d246150bbbfe492` and the Factory database/API,
GitHub Actions jobs, workflow sources, PRs, and production host observed on 2026-08-29.

### 1.1 Factory outcomes in the audited 24-hour window

| Outcome | Runs | Model spend |
|---|---:|---:|
| Passed | 26 | $115.89 |
| Failed | 97 | $706.26 |
| Error | 3 | $10.66 |
| Canceled | 10 | $0.00 |

Failure/error spend was `$716.92` of `$832.81` total. The non-canceled pass rate was `20.6%`.
Root and requeue pass rates were effectively identical (`20.3%` and `20.9%`). Third-and-later
attempts on lineages with no pass cost `$193.12`; 28 later attempts repeated the same coarse terminal
note and cost `$206.53` as an upper bound.

The failure buckets were: review failure (`59`, `$410.40`), budget stop (`16`, `$174.21`), red tests
after review-fix (`10`, `$77.83`), review-fix with no change (`5`, `$19.88`), develop with no change
(`4`, `$12.73`), review-fix harness failure (`1`, `$11.21`), state conflict (`2`, `$10.66`), and
other zero-cost failures (`3`).

### 1.2 Actions cost baseline

August net Actions cost was `$301.176`; `minion-ai` contributed `$291.414` (`96.76%`). Its CI
workflow contributed `$283.586`, of which Windows and macOS contributed `$240.428`. August 20, 21,
and 23 contributed `$247.455` (`82.16%`) of monthly Actions net cost.

In the historical spike, 54 commits had both a feature push run and a pull-request run. The redundant
push side alone consumed at least 5,828 Windows test minutes and 1,202 Linux test minutes. A
60-minute Windows/macOS cap would have avoided about `$165.50` gross during the six-day spike, but
that estimate overlaps the duplicate-run estimate and MUST NOT be added to it.

The current `minion-ai/DEV` workflow already prevents the historical feature push duplication and
bounds Linux and Windows jobs. The current macOS job has no `timeout-minutes`, and CI concurrency
cancels only pull-request runs. Those are the remaining code deltas.

### 1.3 Live production and WIP baseline

- Production source, deployment marker, `main`, and `dev` were
  `0315707d8c8ffdfb024d2b97fa2eebf45c3b1914`.
- The runner was intentionally stopped; Caddy remained online. The documented tailnet API was
  therefore unavailable.
- `factory.db` contained 59 queued runs and no running runs. Queue order remains
  `source_stage DESC, source_created_at ASC, id ASC`.
- Production policy was `FACTORY_AUTOMERGE=1`, `FACTORY_CONTAINMENT_V2=0`,
  `FACTORY_LINEAGE_ORCHESTRATOR_V1=0`, `FACTORY_CONCURRENCY=3`,
  `FACTORY_RUN_TIMEOUT=90`, `FACTORY_DAILY_BUDGET_USD=2000`, and
  `FACTORY_RUN_BUDGET_USD=12`.
- Factory PR #164 is an empty timeout/unstick starter branch and is superseded by this program.
- Factory PRs #160–#163 and Base PR #42 contain unique durable-state, containment, lineage, and
  budget-UI work. This program MUST NOT overwrite, close, or imply completion of those branches.

## 2. AS-IS: current behavior and gaps

### 2.1 Controls already shipped

- Run cost is checked after each legacy model stage, and the next develop/review-fix round requires
  a budget reserve.
- The legacy self-test loop stops after two identical test tails.
- Auto-fix is capped at three terminal attempts and holds at most one model-tier escalation.
- A per-spec lineage dollar cap exists.
- A promotion circuit breaker evaluates distinct recent development lineages.
- Auto-fix retries bind the exact classified PR head and immutable spec/memory/manifest snapshots.
- Monitor intake fingerprints events and atomically reserves issue creation.
- Queue identity and order are immutable source facts.

### 2.2 Gaps this spec closes

Anchors below are file-and-symbol level against the audited `minion-factory` source at
`0315707d8c8ffdfb024d2b97fa2eebf45c3b1914` and the `minion-ai/DEV` workflow observed the same day.
Slice 1 resolves each anchor to an exact current line in the checkout it tests, and records the
resolved line in the red test, rather than trusting a line number copied from this spec.

| # | Gap | Anchor |
|---|---|---|
| 1 | Auto-fix admission still uses attempt count plus a four-regex capability allowlist. It does not persist why a retry was admitted, compare candidate progress with the parent attempt, or refuse repeated failure semantics across runs. | `runner/src/queue.ts` — the auto-fix escalation ladder reached from `postFinish()` |
| 2 | The promotion circuit breaker does not guard auto-fix, automatic unstick requeue, or manual requeue admission. | `runner/src/queue.ts` — breaker evaluated on the spec-promotion path only |
| 3 | The auto-fix prompt tells the agent to fetch every PR comment. This repeats large context and exposes unrelated or stale text. The runner can supply a bounded latest failure context. | `agent/run.sh` — review-fix task text |
| 4 | Review says out-of-scope findings are follow-ups, while review-fix says `Fix EVERY finding`. | `agent/review.sh` vs. `agent/run.sh` review-fix task text |
| 5 | Review-fix tells the agent to run the complete self-test and then the wrapper repeats it. | `agent/run.sh` — review-fix task text and the wrapper self-test loop |
| 6 | Monitor recurrence after 24 hours creates a new issue instead of refreshing the existing fingerprint card. | `runner/src/index.ts` — `POST /hooks/monitor` intake and its fingerprint reservation |
| 7 | Stopping the runner is the only reliable operator pause; it removes observability and makes the unstick monitor interpret the queue without an authoritative operator-pause signal. | `runner/src/queue.ts` (`pump()`), `runner/src/unstick-classifier.ts`, `scripts/unstick-cron.sh` |
| 8 | Stage cost is visible in logs/terminal rows, but no stable retry-decision record explains the cost-bearing transition between attempts. | `runner/src/db.ts` — no retry-decision table exists; cost lives on run rows only |
| 9 | The current macOS CI lane can reach GitHub's multi-hour limit, and superseded `DEV` pushes are not canceled structurally. | `minion-ai` `.github/workflows/ci.yml` — `concurrency` block and the macOS job |

## 3. TO-BE: required invariants

1. **Queue preservation:** deployment and verification MUST leave all pre-existing queued run ids
   queued. No canary may use the production queue while `FACTORY_DISPATCH_PAUSED=1`.
2. **One decision per terminal source run:** retry admission is a durable, idempotent record keyed
   by the terminal run being evaluated. A restart cannot create a second child or change that
   source run's recorded decision. A repair child that later terminates is a new source run and may
   receive its own decision, subject to the lineage-wide ceiling below.
3. **Progress-bound retry:** a retry with no candidate advance and the same normalized failure
   fingerprint is stopped. A larger model is not a remedy for state conflict, budget exhaustion,
   provider outage, missing authority, or no-change output.
4. **Two repair descendants maximum:** one lineage may contain a chain of at most two automatic
   repair descendants after the original run. A source run may admit at most one direct child; the
   second lineage repair is admitted from the first repair only after demonstrable candidate
   progress or a changed failure fingerprint.
5. **Circuit breaker coverage:** an open distinct-lineage breaker blocks every automatic child
   admission regardless of origin — new spec promotion, auto-fix retry, and automatic unstick
   requeue. Operator pause independently suppresses the same origins, so either signal alone is
   sufficient to refuse. A manual operator requeue is the only admission permitted while the breaker
   is open. That admission is recorded in a separate append-only override record keyed by the
   manually created child, with reason code `supervised-breaker-override`; it never mutates or
   competes with an immutable automatic retry decision. A supervised passing canary is required to
   close the breaker.
6. **Bounded evidence:** retry prompts receive the latest in-scope failure evidence, normalized and
   fenced as untrusted data, capped at 6 KiB. They do not fetch an unbounded comment history.
7. **One full self-test owner:** agents run focused checks. The trusted wrapper runs the configured
   complete self-test once per candidate checkpoint.
8. **One card per fingerprint:** recurrence updates/reopens/comments on the existing monitor issue.
   A new card is allowed only when the prior issue is unavailable or the semantic fingerprint changes.
9. **Pause before claim:** operator pause is checked before any queued row is claimed and before any
   automatic child is inserted.
10. **CI authority:** feature PRs retain quick platform compatibility checks; complete Windows tests
    run once on the exact `DEV` integration candidate. macOS receives an explicit 60-minute cap.
11. **No additive savings claims:** retry, timeout, and duplicate-trigger counterfactuals overlap.
    Telemetry reports each lever independently.

## 4. Failure and retry contract

### 4.1 Failure classes

`minion-factory` adds one pure classifier with these closed values:

| Class | Examples | Automatic action |
|---|---|---|
| `capability-review` | in-scope `VERDICT: FAIL`, red self-test after a changed candidate | one tier escalation, once |
| `capability-test` | test-loop cap, repeated deterministic test failure after progress | retry at held/escalated tier |
| `provider-outage` | authenticated quota/rate/server outage evidence | same tier, once |
| `infra-transient` | bounded clone/fetch/network failure | same tier, once |
| `budget-stop` | run/daily/lineage cap or insufficient round reserve | stop |
| `state-conflict` | non-fast-forward, stale authority, moved PR head | stop and reconcile |
| `no-progress` | no changes, unchanged candidate plus repeated failure | stop |
| `policy-refusal` | breaker open, missing immutable authority | stop |
| `unknown` | unrecognized terminal note | stop and request supervised triage |

The classifier normalizes volatile SHAs, run ids, attempt numbers, dollar amounts, paths under run
storage, and timestamps before hashing. The original bounded note remains evidence; normalization is
only for equivalence.

### 4.2 Durable decision

Add `retry_decisions`:

| Field | Contract |
|---|---|
| `source_run_id` | Primary key and idempotency boundary. |
| `lineage_key` | Stable spec id, else repository plus branch/PR identity. |
| `failure_class`, `failure_fingerprint` | Runner-derived closed class and SHA-256 identity. |
| `source_candidate_sha`, `parent_candidate_sha` | Exact progress comparison inputs. |
| `attempt_ordinal` | Original is 1; repair children increment through ancestry. |
| `decision` | `retry-same`, `retry-escalated`, or `stop`. Paused work stays pending and has no terminal decision. |
| `reason_code` | Closed machine reason, not free-form agent text. |
| `next_level` | Resolved tier for an admitted retry, otherwise null. |
| `child_run_id` | Exact inserted child, written in the same transaction as admission. |
| `created_at` | Audit timestamp. |

The outbox handler obtains bounded failure context, classifies the source, evaluates the breaker,
pause, attempt ceiling, progress, and budgets, then transactionally records the decision and optional
child. Replaying the outbox returns the existing decision.

An admitted child that fails the runner's exact-head authority check before checkout has not consumed
a model attempt. The runner keeps the original `retry_decisions` row immutable and may admit a
correctly pinned replacement only after proving the prior child is a runner-created auto-fix child in
that pre-execution failure state. Each replacement appends a `retry_rebindings` row keyed by the old
child and naming the source and new child. Replays follow this bounded chain to the effective child;
ordinary failures, ambiguous ownership, and already-started work cannot use the exception.

Manual operator requeue is not another `retry_decisions` row for the stopped source. When the
breaker is open, the runner first preserves or creates the automatic circuit-open `stop`, then the
operator admission transaction writes a separate append-only
`retry_overrides` record keyed by `child_run_id`, containing `source_run_id`, operator identity,
`supervised-breaker-override`, and timestamp. The immutable stop decision remains intact.

### 4.3 Prompt contract

The retry task includes:

- exact source run, PR, classified candidate, failure class, and attempt ordinal;
- latest runner-selected review/self-test evidence only;
- explicit instruction to verify every item against current code;
- explicit instruction that out-of-scope findings become follow-ups and do not expand the slice;
- focused-check ownership; the wrapper owns the full self-test;
- the changed approach required versus the previous attempt.

Raw comments are labelled untrusted evidence. Backticks and control characters cannot escape the
fence. The task MUST NOT tell the agent to execute `gh pr view ... --json comments`.

## 5. Operator pause and observability

Add `FACTORY_DISPATCH_PAUSED` (`0|1`, default `0`). When `1`:

- `pump()` returns before budget checks, claims, or spawns;
- auto-fix and spec-promotion outbox jobs remain pending without a terminal decision, and automatic
  unstick requeues are suppressed;
- `/health`, `/budget`, and `/trigger-health` report `pausedForOperator: true`;
- unstick classification suppresses queue-wedged and automatic facilitator work;
- monitor intake and non-admission API observability remain available;
- running work is not killed. The deployment prerequisite is zero running rows.

The pause flag is environment-owned in this slice so deployment can prove it before the new runner
starts. A later authenticated runtime-control endpoint requires a separate operator/audit design and
is not needed to keep this deployment observable and safe.

## 6. Monitor-card reuse

On a stale fingerprint with a recorded `issue_url`, monitor intake first resolves that exact
`owner/repo/issues/number`. If it exists, the runner reopens it when closed and appends one bounded
recurrence comment, then updates the counter. It does not create another issue. If the issue is
confirmed missing (404), creation is allowed and the stored URL is replaced. Transient access
failure restores the reservation and creates no duplicate. Reservation remains a
compare-and-swap so concurrent recurrence creates at most one effect.

## 7. DELTA: implementation slices

### Slice 1 — plan of record and executable red tests

**Topics:** `logic`, `infra`, `test`

**Repo:** `minion-meta`, `minion-factory`, `minion-ai`.

- Commit this spec to a feature branch targeting `minion-meta/dev`.
- Add pure failure-classification/retry-decision tests.
- Add pause-before-claim and paused-unstick tests.
- Add stale monitor-card reuse tests.
- Add prompt contract checks for bounded evidence, in-scope wording, and one full-test owner.
- Add CI workflow contract tests for global cancellation and macOS timeout.

**Gate:** each new test fails for the intended current behavior before implementation.

### Slice 2 — Factory retry decisions and prompt repair

**Topics:** `logic`, `infra`, `test`

**Repo:** `minion-factory`.

- Add `runner/src/retry-policy.ts` and tests.
- Add the additive `retry_decisions` schema, indexes, upgrade assertions, and immutable-row triggers.
- Replace attempt-count-only auto-fix admission with the durable decision transaction.
- Apply the distinct-lineage breaker to auto-fix admission, recording `policy-refusal` when it refuses.
- Fetch and sanitize bounded latest failure evidence in the runner.
- Update legacy and containment prompts to use in-scope findings and focused checks.

**Gate:** focused retry/outbox/queue/tiers tests pass; a replay creates no second child.

### Slice 3 — observable operator pause and monitor-card reuse

**Topics:** `logic`, `infra`, `test`

**Repo:** `minion-factory`.

- Add strict `FACTORY_DISPATCH_PAUSED` parsing and expose it through health/budget/trigger health.
- Gate queue claims, auto-fix/spec promotion admission, and unstick remedies on operator pause, and
  gate every automatic unstick requeue on the distinct-lineage breaker as well.
- Record a manual operator requeue admitted while the breaker is open in the separate append-only
  override ledger keyed by its child, with reason code `supervised-breaker-override`.
- Refresh/reopen the existing issue for a stale fingerprint.
- Document deployment and resume procedures.

**Gate:** with a fixture containing queued work and pause `1`, repeated pump/unstick/outbox cycles
start no process, insert no child, preserve queue order, and keep health/monitor routes responsive.

### Slice 4 — remaining CI controls

**Topics:** `infra`, `test`

**Repo:** `minion-ai`.

- Set `concurrency.cancel-in-progress: true` for the `DEV`/PR CI workflow.
- Set `jobs.macos.timeout-minutes: 60`.
- Preserve existing changed-scope, CI-only, test-only, Windows smoke, `DEV` full-shard, and release
  authority contracts.

**Gate:** `test/ci/ci-workflow.test.ts` proves trigger, concurrency, timeout, and platform routing.

### Slice 5 — integration, review, and release

**Topics:** `infra`, `test`

- Run Factory focused tests, full `npm test`, typecheck, shell syntax, ShellCheck, Docker builds,
  database upgrade/restart tests, and a credential-free paused-queue integration fixture.
- Run minion-ai CI workflow tests, formatting, and the smallest repository check that covers YAML.
- Review Standards and Spec as separate axes.
- Open scoped PRs. Hosted checks must pass on exact heads.
- Merge the spec first, Factory second, and minion-ai CI independently when green.
- Keep `FACTORY_DISPATCH_PAUSED=1`, deploy the exact reviewed Factory SHA through the supervised
  production path, and verify source, marker, image, DB integrity, API health, flags, zero running,
  and the unchanged set of queued ids.
- Close Factory PR #164 with a supersession comment after the replacement Factory PR merges.

## 8. Verification matrix

| Scenario | Expected result |
|---|---|
| Same failure fingerprint, unchanged candidate | `stop/no-progress`; no child. |
| Changed candidate, first in-scope review failure | one escalated child. |
| Provider outage, first occurrence | one same-tier child. |
| Provider outage repeats | stop; existing card refreshed. |
| Budget stop | `stop/budget-stop`; no child at any tier, escalated or same. |
| State conflict | no retry; reconciliation card. |
| Breaker open, pause `0` | no automatic child from any origin — promotion, auto-fix, or unstick requeue. |
| Breaker open, manual operator requeue | one child; immutable stop decision unchanged; append-only child-keyed override records `supervised-breaker-override`. |
| Outbox replay after restart | same decision/child id. |
| Admitted child loses exact-head authority before checkout | same decision; one append-only rebind to the correctly pinned replacement; no attempt increment. |
| Stale closed monitor issue recurs | same issue reopens and receives one recurrence comment. |
| Pause `1` with queued work | API online, queue unchanged, zero claims/spawns. |
| Pause `1` with a finished failed run | auto-fix outbox remains pending; no child or terminal decision. |
| CI receives superseding DEV push | older run cancels. |
| macOS lane hangs | job ends by 60 minutes. |

## 9. Deployment acceptance

Deployment is complete only when all statements are true:

1. The spec and both implementation PRs are merged through their required branches. Define
   `deployment_sha` as the exact Factory commit merged into `dev`; the latest required hosted CI
   attempts for that SHA, including promotion-safety CI, must complete successfully before release.
2. The supervised promotion must deploy that same `deployment_sha` without a squash/rebuild
   substitution. Production Factory source, marker, running image label, and reported SHA all equal
   `deployment_sha`.
3. Production has `FACTORY_DISPATCH_PAUSED=1`; `/health`, `/budget`, and `/trigger-health` report the
   operator pause.
4. Production has zero running runs, exactly the same 59 pre-deployment queued ids, and valid SQLite
   integrity/foreign-key checks.
5. No retry, spec-promotion, or facilitator child is created during a bounded observation window.
6. The minion-ai CI change is merged into `DEV`; its exact hosted workflow contract check is green.
7. Factory PR #164 is closed as superseded with links to this spec and the merged Factory PR.

Queue resumption is explicitly outside this deployment. When the operator later resumes it, start
with one supervised canary because the historical distinct-lineage breaker is expected to be open.

## 10. Out of scope

- Resuming or draining the preserved production queue.
- Changing the user-approved daily Factory budget.
- Replacing the existing containment or lineage-orchestrator programs in Factory PRs #160–#163.
- Redesigning minion-ai platform coverage beyond the two remaining concurrency/timeout gaps.
- Claiming additive savings across overlapping retry, duplicate-trigger, and timeout counterfactuals.
