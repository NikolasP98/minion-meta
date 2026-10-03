# GW-018 nightly child-outcome independent review

- Contract: `spec-gw018-nightly-child-outcome.md`
- Reviewed SHA-256: `05ba9039aca970195fd28929722464c7d0d6608d686e76501abdf3ceb045a7ea`
- Gateway source baseline: `0cdd31d4cc3102a1ec3c24eedb1630e75d0663a0`
- Verdict: **BLOCK**

The exact-child identity, one-POST/no-replay rule, fixed API origin, `run_attempt=1` fence, response
decoder, and fail-closed conclusion matrix are sound. GitHub's official endpoint documents
`return_run_details`, a `200` response with `workflow_run_id`, and the required run fields. Two
deadline/CI integration gaps remain.

## 1. The child-duration premise and product outcome contradict the current workflow

The AS-IS claim at contract line 9 says CI jobs last at most 60 minutes. Several actual jobs have no
`timeout-minutes`, including `build-artifacts` at `.github/workflows/ci.yml:273-296` and `check` at
`:478-497`. GitHub documents a 360-minute default job timeout. Therefore the proposed 110-minute
observer may expire while its exact child is still legitimately running and later succeeds.

That bounded failure can be an intentional operational policy, but the contract currently also says
operators require the child's terminal conclusion. Amend one of these executable choices:

1. bound every child job and queue/observation policy so the exact child must reach a terminal state
   inside the observer budget, with configuration tests for all unbounded jobs; or
2. correct AS-IS and explicitly define `observation_deadline` as an accepted wrapper failure even
   though the child may later succeed, distinguish it from a child terminal conclusion, and prove the
   last observed nonterminal state/link remain visible.

Do not claim the current child has a 60-minute ceiling.

Official source: <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idtimeout-minutes>

## 2. The proposed test lane does not gate workflow-only pull requests

Contract line 26 runs the helper tests from the ordinary `check` job. Actual `check` is skipped when
`changed-scope.outputs.ci_only == 'true'` (`ci.yml:478-497`). Workflow-only pull requests instead run
`ci-contract`, whose current command at `ci.yml:215-231` includes only
`test/ci/*workflow.test.ts`. A restored five-minute dispatch-only nightly workflow can therefore miss
the new helper/configuration test on the pull request and fail only after merge when the nightly job
runs its pre-dispatch test.

Require the real YAML/parser contract test to live in the existing `test/ci/*workflow.test.ts` lane,
or explicitly extend `ci-contract` to run the new test command. Add a configuration negative proving
that the workflow-only path fails when the helper invocation, pre-dispatch test, exact 120-minute
timeout, or observer command is removed. Retain the normal `check` invocation for source changes.

The current test at `test/ci/ci-workflow.test.ts:493-531` only proves the old `gh api` POST arguments
and must be replaced or strengthened rather than left as a parallel false authority.

## Verified contract foundation

- Dispatch endpoint and response:
  <https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28#create-a-workflow-dispatch-event>
- Exact run endpoint/fields:
  <https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28#get-a-workflow-run>
- The current nightly has one five-minute dispatch-only job and the current CI uses branch-scoped
  cancellation, so the no-history-fallback and cancellation-as-failure rules are necessary.

No Gateway source or workflow file was edited.
