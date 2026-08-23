---
id: 2026-08-23-factory-deployment-recovery-controller
title: Wire the Factory deployment recovery controller
status: proposed
created: 2026-08-23
updated: 2026-08-23
repos: [minion-factory]
tags: [factory, orchestration, deployment, security]
---

# Wire the Factory deployment recovery controller

Late input folding now creates an immutable `deployment_recovery_intents` row
when a verified safety blocker arrives while a lineage is deploying or
verifying. The runner includes a bounded, exact-candidate sidecar protocol with
restart reconciliation and controller-owned confirmation receipts. It does not
yet ship the trusted executable that performs the stop or rollback, and no boot
or pump loop consumes those intents in production.

This is an activation blocker, not a best-effort follow-up. Recording an intent
without an installed consumer cannot be represented as a completed safety
action. Production must keep `FACTORY_LINEAGE_ORCHESTRATOR_V1=0` until the
controller is installed, wired, and exercised against a disposable target.

Source marker:

- `minion-factory/runner/src/deployment-recovery-transport.ts` — sidecar
  transport contract and the open consumer/executable marker.

## Definition of done

- A trusted, root/controller-owned executable implements
  `factory-deployment-recovery-v1` for the closed production target.
- The runner validates configuration at boot, resets crash-surviving claims for
  reconciliation, and drains pending intents independently of model activity.
- Stop and rollback commands bind target, candidate SHA, previous SHA, intent,
  instance, input, and attempt without moving refs or shell interpolation.
- A retry first reconciles the exact prior binding and never assumes an unknown
  remote outcome failed.
- Confirmation records an immutable receipt digest; pending, malformed,
  mismatched, timed-out, or over-limit responses fail closed and remain visible.
- Integration tests prove confirmed stop, confirmed rollback, ambiguous remote
  outcome, restart reconciliation, retry exhaustion, stale binding, and absent
  controller behavior.
- A disposable deployment drill proves that a safety input can stop or roll back
  the exact candidate without exposing production credentials to the broker,
  tool host, orchestrator, or worker containers.
- The lineage activation gate requires this drill and refuses startup when the
  recovery controller is absent.
