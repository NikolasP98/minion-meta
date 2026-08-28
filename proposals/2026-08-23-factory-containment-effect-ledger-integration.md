---
id: 2026-08-23-factory-containment-effect-ledger-integration
title: Put Factory containment writes behind the controller effect ledger
status: draft
created: 2026-08-23
updated: 2026-08-28
repos: [minion-factory]
tags: [infra, security]
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
principals and both model authentication surfaces.

A production-image activation canary is now hard-pinned to the private
`NikolasP98/minion-factory-canary` fixture repository, initialized at
`31bb5854b1d523127d4c652853e2a74123850065`. It exercises the real
`ProductionContainmentGitHubRemote` and `phase_effects` ledger, injects a process
crash after each accepted push, draft-PR, and readiness boundary, then
reconciles and verifies exactly two pushes, one PR creation, and one readiness
write before cleaning up the canary branch and PR. Factory PR #83 merged this
harness to `dev` at `3edcd9de9ee87d27f5145895d5e6ec33a8f67671`; 850 runner tests and both
exact-`dev` push checks passed. This is harness evidence only. The three scoped
production credentials are not provisioned, so the external canary has not run
and remains the release gate.

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
- [x] A production-image canary harness is hard-pinned to a private fixture,
  refuses production repositories, uses the real effect adapter and ledger,
  injects every accepted-write crash boundary, verifies exact remote counts,
  and cleans up its branch and PR.
- [ ] Integration tests exercise every reserve/remote/confirm crash window through
  the production `advanceContainmentRun` path, not a substitute driver.
- [x] Production preflight checks the three scoped GitHub credentials and the
  selected model credential/auth home before the activation variable can be 1.
- [ ] Run the credentialed disposable-repository drill through prepare and
  readiness, inject a restart at each remote boundary, and preserve its
  non-secret exact-effect evidence.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
One shared blocker: code is merged; each waits on the SAME credentialed disposable-repo drill (autonomy flags 0). The in-flight 2026-08-28-factory-containment-base-reconciliation-spec Slices 5-6 build exactly that drill harness + activation wiring — these three ride its outcome rather than needing separate triage.
