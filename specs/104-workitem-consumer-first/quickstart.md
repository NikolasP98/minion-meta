# Validate the consumer-first slice

Prerequisites: owner security approval recorded on the revised spec, an isolated
Factory feature branch, and the repository's declared runner dependencies.
Use temporary DB fixtures; production proposals are not test fixtures.

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
