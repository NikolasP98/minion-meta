---
id: 2026-08-18-factory-controller-completion-invariants
title: Controller completion identity, bounded retries, reconciliation, and provider fallback
stage: test
status: review
pass: 1
created: 2026-08-18
updated: 2026-08-18
repos: [minion-factory]
type: infra
tags: [infra, test]
pr: https://github.com/NikolasP98/minion-factory/pull/28
---

# Controller completion invariants

Lifecycle record for the controller hardening implemented in Factory PR #28. This artifact is
intentionally `test/review`, not `spec/approved`: it describes code already under review and must
never launch a second development run.

## Implemented at reviewed head

Factory head `ee3e935f79a56bec16082d3e0c4a1b8391cd4f81` adds:

- controller-owned `ALREADY_SATISFIED` detection before an implementation agent launches;
- executable identity that excludes lifecycle/evidence-only metadata;
- immutable root-lineage retry limits, repeated-error fingerprints, and legacy-lineage migration;
- deterministic handling for push, rebase, clone, and related transport failures outside LLM
  recovery;
- exact-SHA, independent, read-only re-review for `[review-degraded]` outcomes;
- sibling cancellation and a durable merge-reconciliation outbox;
- first-party Factory CI, trusted-check binding to the GitHub Actions App, and fail-closed autonomy
  defaults;
- Base's complete test suite in the Factory self-test; and
- preserved Claude-to-Codex and Codex-to-Claude outage fallback in the agent worker.

The no-mistakes gate exercised the real Claude weekly-limit path and continued through Codex. The
same gate found and fixed launch-time merge races, transport-class coverage, non-development retry
accounting, descendant merge evidence, stale-index reconciliation, merge-sweep starvation,
independent-review queue spinning, retry PR inheritance, legacy execution dedupe, and legacy root
lineage migration.

## Validation evidence

- Fresh `npm ci`: zero vulnerabilities.
- `npm run typecheck`: pass.
- `npm test`: 39/39 pass at the reviewed head.
- `bash -n` and ShellCheck across agent/deploy/setup scripts: pass.
- Agent and runner Docker images: build successfully.
- Fresh runner startup/migration, `/health`, and unauthenticated fail-closed access: pass.
- no-mistakes run `01M0BHCAXG3M8XQE1FNCZFE2T6`: completed with fixes applied.

## Current release gate

The PR is open and intentionally not merged or deployed. GitHub Actions rejects the `ci` job before
runner allocation because the account has failed payments or an exhausted Actions spending limit;
the latest job executes zero workflow steps. Local green evidence does not substitute for the
required hosted check.

Production remains on Factory `d70760d2a761846e7debe2447f917ee367429414` with
`FACTORY_AUTOPROMOTE=0`, a healthy runner, and zero queued or running work.

## Exit criteria

1. Restore GitHub Actions billing/quota, or explicitly provision an isolated trusted self-hosted
   runner.
2. Obtain a successful `ci` check on the exact PR head.
3. Merge and deploy PR #28 through the guarded self-update path.
4. Verify the live schema migration, health, zero duplicate descendants, and one merged
   implementation producing exactly one satisfied work item.
5. Reconcile this artifact to `done/shipped` with the merge SHA and runtime evidence.

