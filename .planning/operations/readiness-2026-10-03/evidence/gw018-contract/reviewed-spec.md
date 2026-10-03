# GW-018: bind nightly validation to its exact child outcome

## 0. Product

The nightly Gateway validation must be green only when the particular DEV CI run it created passed for the DEV revision selected before dispatch. Operators need its revision, run link and either the observed terminal conclusion or an explicitly distinct observation failure. This resolves the wrapper's false success; GW-019 separately governs which deterministic tests CI runs.

## AS-IS

At gateway-review b43c6be12ce6c09b4be96b87cb90fe246f4425eb, `.github/workflows/nightly-full-platform.yml:17-28` has a five-minute job that POSTs a DEV workflow dispatch and exits. It does not identify, observe or propagate the child's result. `.github/workflows/ci.yml` cancels superseded DEV runs and has explicit job limits up to 60 minutes and other jobs without a configured limit; a successful dispatch can therefore precede a failed or cancelled CI run.

GitHub's documented 2022-11-28 API supports `return_run_details: true`: a successful dispatch returns a workflow_run_id and URLs. The current API also returns run details. Use the explicitly versioned older API and require the response body; do not infer a child from a newest-run list or create a retry dispatch after ambiguous failure. Source checked 2026-10-03: https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28#create-a-workflow-dispatch-event .

## TO-BE

1. Resolve and validate the active `ci.yml` workflow ID/path and the exact 40-hex `refs/heads/DEV` commit. Perform exactly one dispatch to DEV with return_run_details true.
2. Accept only a positive safe-integer run ID. Construct subsequent GitHub API and human links from the trusted repository plus validated ID; never fetch a returned URL. Missing, malformed or lost dispatch acknowledgements fail visibly without replaying the POST.
3. Poll that run only. On each successful read verify run ID, workflow ID, repository, workflow_dispatch event, DEV branch, expected SHA and run_attempt 1. A branch race or rerun cannot qualify another revision/attempt. Nonmatching identity is terminal failure even if its conclusion says success.
4. Success requires status completed and conclusion success. Failure, cancellation, timeout, neutral/skipped/action-required, malformed states and incomplete observation fail. The summary identifies the expected revision, known run link, last observed state and fixed outcome category. Never print tokens or provider bodies.
5. Bound all requests (30 seconds each), GET transient retry count (at most 3 attempts), initial visibility wait (2 minutes), total observation (110 minutes) and poll intervals (20 seconds). Parent job timeout is 120 minutes so it can publish the deadline failure before the runner kills it. `observation_deadline` is an intentional wrapper failure, not a child terminal conclusion: retain the last observed nonterminal state and child link; the child can finish later and is not cancelled or relabelled by this wrapper. No claim is made that all child jobs or GitHub queues finish within 110 minutes. Use a monotonic clock for elapsed deadlines. HTTP errors outside 404 visibility, 429 and 5xx are terminal. A request's effective timeout is clipped to the remaining deadline. POST is never retried.
6. Cancellation of the parent remains cancellation, with no subsequent dispatch or success output. It does not cancel or alter another CI run. No polling fallback to branch history, completed runs, or prior green SHA is allowed.

## DELTA

- Add a small dependency-free Node module under `scripts/ci/` for dispatch/observation, plus a Node test file. Production HTTP, timer and output adapters are separate from the state machine so deterministic fixtures exercise the real transitions and bounds. Fetch targets are restricted to api.github.com; repository and identifiers are validated. The CLI uses the existing GH_TOKEN and REPOSITORY environment, never token arguments or a shell pipeline.
- Update the nightly workflow to check out its own workflow revision using the existing pinned checkout action, execute the tested script, and retain the existing schedule, DEV destination, actions:write/contents:read permissions and concurrency group. Call it Nightly DEV CI validation so the wrapper does not claim coverage beyond its child.
- Run the script's test command from both the existing CI `ci-contract` job (which gates workflow-only PRs) and the ordinary `check` job, and before dispatch in the nightly job. Strengthen the existing parsed nightly-workflow assertion in `test/ci/ci-workflow.test.ts:493-531`; do not retain its old dispatch-only acceptance as another authority. This introduces no install or provider dependency. Do not change CI matrix, deployment triggers, default/release branches, or cancellation groups in this slice.
- Keep the code small enough to review as HTTP adapter plus outcome state machine, with comments for the no-replay and exact-attempt invariants.

## Verification

Use deterministic fake HTTP/clock fixtures to prove queued-to-success, each non-success conclusion, mismatched branch/SHA/workflow/repository/event/run ID, superseded attempt, missing/malformed acknowledgement, response loss after dispatch, transient read recovery, bounded permanent read errors, initial 404 disappearance, observation deadline and cancellation. Assert exactly one POST, exact request body/version, fixed request origin, clipped deadlines and no raw token/provider payload in output. Include concurrent unrelated runs in the fixture and prove they are never fetched. Exercise the CLI process against an injected local fake adapter or equivalent controlled import entrypoint without live GitHub dispatch; validate nonzero exit on failed child. Parse both workflow YAML files and assert the actual helper/test invocation and parent timeout; a restored old workflow must fail this configuration check through the actual workflow-only `ci-contract` command as well. Assert the helper test command is present in that real lane. An observation deadline while the exact child is still in_progress must fail with observation_deadline, preserve its link/status, and never fabricate a terminal child conclusion. Run targeted tests plus the required Gateway format/type/lint gates. No production data or hosted workflow dispatch is necessary for local qualification.

## Out of scope

GW-019 test coverage, CI matrix redesign, deployments, production data and hosted API dispatch experiments. Integration into the normal PR is authorized; human merge/release gates remain separate. If return_run_details is unavailable at runtime, fail closed and expose the dispatch-acknowledgement limitation rather than silently accepting an unrelated run.

## Authorization and review

The user authorized every readiness fix. Parent Standards review requires exact run identity, one POST and honest failure with deterministic negative evidence. Independent Sol review is pending; implementation has not started.
