---
id: 2026-10-03-readiness-nightly-ci-outcome
title: Propagate the exact nightly DEV CI outcome
stage: proposal
status: approved
created: 2026-10-03
updated: 2026-10-03
repos: [minion]
tags: [test]
type: fix
---

# Nightly DEV CI outcome

The user authorized every readiness finding. GW-018 addresses the nightly wrapper's dispatch-only false success.

## AS-IS

The five-minute nightly job ends after submitting a DEV CI run. Failure, cancellation or non-discovery of that child cannot change the wrapper's green result. The child has both explicit timeouts and jobs without a configured limit.

## TO-BE

A green wrapper identifies and observes its one exact child, expected DEV revision and first attempt, and requires completed success. A bounded observation failure is visibly distinct from a terminal child conclusion.

## DELTA

Use the versioned dispatch response to bind one run ID, bounded read-only observation and truthful summaries. Never retry an ambiguously acknowledged dispatch. Run deterministic negative and actual-workflow tests in the workflow-only CI lane as well as ordinary source CI. The exact implementation contract is the companion spec; CI coverage expansion remains GW-019.

## User-requested pause, 2026-10-03

The v2-reviewed contract is signed in meta `50374ac2c890d300b69f3c13f08a678b643de97f`. Three dependency-free modules were started under `gateway-review/scripts/ci/`: `observe-dev-ci.mjs`, `github-request.mjs`, and `nightly-dev-ci.mjs`. They are uncommitted drafts, untested, independently unreviewed, and not wired into either workflow. Their handoff comments prohibit treating them as accepted implementation. Resume with meaningful transition/HTTP/process tests, exact workflow wiring including ci-contract, the replacement parsed nightly contract test, independent blast-radius review, then required checks. No hosted workflow was dispatched.
