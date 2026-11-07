# Validate the consumer-first slice

Prerequisites: owner security approval recorded on the revised spec, an isolated
Factory feature branch, and the repository's declared runner dependencies.
Use temporary DB fixtures; production proposals are not test fixtures.

Interactive implementation may use the manual SDLC path recorded in `plan.md`:
load the full reviewed artifacts into an isolated Factory feature branch after
recording owner approval, without creating a production run or changing pause
authority. The following held-dispatch procedure applies only when automated
Factory execution is chosen; it is not needed for that manual path.

The legacy parent needs explicit Factory-only S5 dispatch. Fetch this feature's
plan/tasks from the same reviewed meta commit as its approved flat spec, include
their full contents in the task payload. Before POST, establish and verify the
existing `FACTORY_DISPATCH_PAUSED=1` operator brake through the supported
deployment procedure, preserving active containers or waiting for them to drain
if safe adoption cannot be proved. Record prior pause state and hold ownership;
this environment setting requires a runner restart, not an API toggle. While
held, verify the returned run remains queued/never-started, its stored complete
task matches, and `spec_commit_sha` equals the approved flat file's reviewed
last-touch commit. On mismatch cancel only that never-started row, retain its
history, and refresh/review the source. Restore only an unchanged hold owned by
this procedure; never clear another operator's pause. Uncertain ownership stays
held for owner direction. Do not submit first and inspect after execution starts.
Current
automatic plan/task collection uses a directory matching the flat spec id and
does not resolve this feature's body link.

From the Factory repository's `runner/` directory:

```bash
node --import tsx --test src/workitem.test.ts src/lifecycle.test.ts src/index.test.ts src/manifest.test.ts src/queue-order-integration.test.ts
npm run typecheck
npm test
```

Expected behavior:

1. Trusted complete low-risk automation can pass automatic eligibility.
2. Human/external provenance cannot auto-approve; valid explicitly approved
   controls can enter the spec stage.
3. Legacy, duplicate-key, id-mismatched, malformed, unknown-topic and risk-
   inconsistent inputs cause no new approval PUT or execution insert.
   Valid unclassified records cannot auto-approve, but may receive explicit
   human approval and enter spec subject to existing manifest requirements.
4. Canonical source changes after index discovery are rechecked at the edge.
5. Invalid siblings do not abort valid later admissions; existing executions,
   manifests and ranking/order are preserved across repeated sweeps/restart.
6. Policy/source failure pauses NEW admission/retries with a bounded diagnostic.
   Changed topics, risk or policy authority also hold a new retry; an unchanged
   compatible retry preserves its parent manifest exactly.

After hosted CI, independent review and owner merge, use the trusted production
promotion. Verify live SHA matches main and inspect a real sweep's status.
Exercise acceptance/refusal scenarios with the actual deployed module and
isolated DB/controlled source fixtures, record events and repeat invariants,
then inspect the untouched production queue. Record the limits of fixture proof;
do not claim an admission test proves immutable proposal content at execution.
S4 producer/backfill release stays blocked until this proof is recorded.
