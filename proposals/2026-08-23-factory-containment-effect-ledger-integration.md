---
id: 2026-08-23-factory-containment-effect-ledger-integration
title: Put Factory containment writes behind the controller effect ledger
status: implementing
created: 2026-08-23
updated: 2026-08-23
repos: [minion-factory]
tags: [factory, containment, github, reliability, security]
---

# Put Factory containment writes behind the controller effect ledger

Containment v2 has real launchers for prepare-workspace, setup, develop,
self-test, prepare-review, and review. The prepare and develop scripts now seal
local candidates only. The runner reserves and reconciles exact branch pushes
and draft-PR creation through `phase_effects` before closing their durable phase
attempts; model-bearing develop receives no GitHub credential.

Unit and boot-path integration tests cover reservation, ambiguous accepted
writes, restart reconciliation, exact candidate leases, and one confirmed
effect per key. Activation preflight requires three distinct scoped GitHub
principals and both model authentication surfaces. The remaining release gate
is the disposable-repository drill through every real GitHub boundary.

Production must keep `FACTORY_CONTAINMENT_V2=0` until the live effect path is
controller-owned and a crash-window integration suite passes.

Source marker:

- `minion-factory/runner/src/queue.ts` — live containment dispatch and the
  remaining disposable-repository activation marker.
- `minion-factory/runner/src/containment-effects.ts` — exact GitHub effect
  adapter and reconciliation contract.

## Definition of done

- [x] The controller reserves branch creation, draft-PR creation, candidate push,
  review publication if required, and readiness with immutable effect keys
  before the corresponding remote call.
- [x] GitHub credentials remain outside model-visible execution; trusted helpers
  receive only the minimum capability for one exact effect.
- [x] Each effect reconciles target repository, base, branch, run identity, exact
  candidate SHA, and PR identity after timeout, restart, or ambiguous response.
- [x] `pending` is never treated as success; only a confirmed remote observation
  seals the effect and permits the next phase.
- [x] A crash before the remote call performs it once after restart. A crash after
  GitHub accepted it confirms by observation without repeating it.
- [x] The runner can reconstruct or resume the phase without trusting a moving
  branch name or model-authored output.
- [ ] Integration tests exercise every reserve/remote/confirm crash window through
  the production `advanceContainmentRun` path, not a substitute driver.
- [x] Production preflight checks the three scoped GitHub credentials and the
  selected model credential/auth home before the activation variable can be 1.
- [ ] A disposable repository drill completes prepare through readiness, injects a
  restart at each remote boundary, and proves one exact remote effect per key.
