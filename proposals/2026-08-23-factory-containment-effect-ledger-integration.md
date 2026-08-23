---
id: 2026-08-23-factory-containment-effect-ledger-integration
title: Put Factory containment writes behind the controller effect ledger
status: proposed
created: 2026-08-23
updated: 2026-08-23
repos: [minion-factory]
tags: [factory, containment, github, reliability, security]
---

# Put Factory containment writes behind the controller effect ledger

Containment v2 now has real launchers for prepare-workspace, setup, develop,
self-test, prepare-review, and review. Phase attempts, artifact validation,
candidate compare-and-swap, review binding, and the final PR readiness effect
are implemented. The production wrappers still create/push the branch, create
the draft PR, and push developed candidates inside the phase containers.

Those scripts are fixed image-owned code, but their GitHub writes are not yet
reserved and reconciled through `phase_effects`. A runner or container crash
after GitHub accepts a write and before `phase-result.json` is sealed leaves no
exact controller receipt. The retry may reconcile a mutable branch name or
repeat model work. Existing effect-state tests use a test driver and do not wire
the live phase-script call sites, so they do not close this production gap.

Production must keep `FACTORY_CONTAINMENT_V2=0` until the live effect path is
controller-owned and a crash-window integration suite passes.

Source marker:

- `minion-factory/runner/src/queue.ts` — live containment dispatch marker before
  the unledgered prepare/develop remote writes.

## Definition of done

- The controller reserves branch creation, draft-PR creation, candidate push,
  review publication if required, and readiness with immutable effect keys
  before the corresponding remote call.
- GitHub credentials remain outside model-visible execution; trusted helpers
  receive only the minimum capability for one exact effect.
- Each effect reconciles target repository, base, branch, run identity, exact
  candidate SHA, and PR identity after timeout, restart, or ambiguous response.
- `pending` is never treated as success; only a confirmed remote observation
  seals the effect and permits the next phase.
- A crash before the remote call performs it once after restart. A crash after
  GitHub accepted it confirms by observation without repeating it.
- The runner can reconstruct or resume the phase without trusting a moving
  branch name or model-authored output.
- Integration tests exercise every reserve/remote/confirm crash window through
  the production `advanceContainmentRun` path, not a substitute driver.
- Production preflight checks the three scoped GitHub credentials and the
  selected model credential/auth home before the activation variable can be 1.
- A disposable repository drill completes prepare through readiness, injects a
  restart at each remote boundary, and proves one exact remote effect per key.
