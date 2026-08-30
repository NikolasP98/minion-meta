---
id: 2026-08-23-minion-ai-ci-baseline-debt
title: Restore the minion-ai DEV test baseline before daily promotion
status: review
created: 2026-08-23
updated: 2026-08-28
repos: [minion-meta, minion]
tags: [infra, test]
value: 10
effort: L
duplicate_candidate: ci-minion-ai-ci
source: human
source_trust: human
risk_class: high
priority: medium
owner: human
---

# Restore the minion-ai DEV test baseline before daily promotion

## Problem

The minion-ai CI matrix is expensive because it repeatedly runs a known-red monolithic test
suite, not because Vitest alone is intrinsically too costly. A workflow-only pull request exposed
the current baseline before any application source changed:

- PR #239 run `32643929160` ran the full Linux Node, Linux Bun, and Windows matrices.
- The Bun unit artifact reported 9,684 tests, 167 failures, and 100 failed suites. Failures span
  missing documentation, stale mocks, changed return contracts, and channel-routing expectations;
  they are not one runner defect.
- The Node lane failed across overlapping areas.
- The Windows lane was still running after Linux was irrecoverably red and was canceled at about
  24 minutes of test execution. Earlier Windows test jobs `97126221873` and `96631881865` each
  consumed a little over three hours before failing.
- The tested branch was exactly one workflow/test-contract commit ahead of `DEV`; no application
  source was changed by the pull request.

PR #239 reduces duplicate execution and waste, but the once-per-DEV full suite remains fail-closed.
Daily production promotion must not reinterpret a known-red suite as green.

## AS-IS

- Feature branch pushes and pull requests previously duplicated the heavy matrix.
- Linux Node and Bun failures do not stop the concurrent Windows matrix, so an already-red run can
  continue billing for hours.
- Bun is a shadow unit lane running Vitest under the Bun runtime. It is not evidence that a native
  Bun test migration would pass; the current failures are predominantly source/test-contract debt.
- The DEV integration branch cannot provide a trustworthy green promotion signal until the
  baseline is repaired.

## TO-BE

- Pull requests run one event path. Workflow-only pull requests run focused workflow-contract
  tests; application changes run their relevant application gates.
- DEV runs the broad matrix once after integration. Windows starts only after Linux succeeds and
  every expensive lane has a wall-clock cap.
- Full Node tests are green. The Bun shadow lane reports parity on the supported subset and remains
  non-authoritative until that parity is proven.
- Daily promotion consumes an immutable, green DEV candidate. No known-failure allowlist silently
  converts failures into success.
- A Bun 1.4 migration decision is based on measured runtime, compatibility, and failure parity after
  the Node baseline is green—not on runner cost alone.

## DELTA

1. Freeze one exact DEV SHA and capture machine-readable Linux Node and Bun reports. Preserve the
   test name, file, failure signature, runtime, and retry result; never use aggregate counts alone.
2. Cluster failures by root cause and create bounded repair slices. The first observed clusters are:
   missing generated/docs fixtures, stale module mocks, logger-spy expectations, routing contract
   drift, environment/home-directory assumptions, and platform-specific state handling.
3. Repair or delete stale expectations only with source-contract evidence. Each slice must reduce
   the failure inventory and may not add an ignore, retry, or allowlist entry to make CI green.
4. Re-run the exact affected tests under Node, then the complete Node suite. Re-run the supported
   Bun shadow subset and classify runtime incompatibilities separately from real regressions.
5. Restore Windows coverage behind the Linux-success dependency. If the complete Windows suite
   cannot finish inside the approved cap, split it into a fast platform-contract gate plus a
   scheduled extended diagnostic; do not leave an unbounded required job.
6. Once Node is green, benchmark Bun 1.4 against the same deterministic subset. Record install plus
   test wall time, peak memory if available, unsupported APIs, and pass/fail parity before proposing
   any authoritative runner migration.

## Out of scope

- Marking current failures `continue-on-error`, expanding retries, or introducing a permanent
  known-failure budget.
- Assuming Bun 1.4 fixes stale tests or application contract regressions.
- Bypassing the DEV gate to keep the daily production schedule moving.
- Fixing all clusters in one unreviewable pull request.

## Definition of done

- The full Linux Node suite passes at an exact DEV SHA with a machine-readable report.
- The supported Bun shadow suite completes within its cap and every difference from Node is
  classified; no unexplained failure remains.
- Required Windows coverage completes within its cap after Linux succeeds.
- A fresh application pull request runs one heavy PR matrix, while its push event runs no duplicate
  heavy matrix.
- A DEV integration push runs the broad matrix exactly once and produces the immutable evidence
  consumed by daily promotion.
- The Bun 1.4 keep-shadow versus migrate decision is recorded with measured evidence.

## Reconciliation note 2026-08-28

Merely suspicious, not certain: `ci-minion-ai-ci` ("CI red — CI on minion-ai DEV", `in-spec`,
`2026-08-18-ci-minion-ai-ci-spec`) already tracks the same DEV `checks` workflow going red on
this same clustered pre-existing-failure suite (its 2026-08-18 triage note references "~193
clustered pre-existing failures... the spec should decide whether to fix the cluster roots or
quarantine honestly"). This proposal is a much more thoroughly evidenced (PR #239, exact run
IDs, failure counts) treatment of what may be the identical restoration work, filed five days
later — but I cannot be certain it isn't scoped differently from whatever
`2026-08-18-ci-minion-ai-ci-spec` already committed to. Not merged: the canonical is
`in-spec`, off-limits to edit — flagged for a human to reconcile scope against the existing
spec before this proceeds.
