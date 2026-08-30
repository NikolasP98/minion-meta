---
id: 2026-08-23-factory-deployment-recovery-controller
title: Wire the Factory deployment recovery controller
status: draft
created: 2026-08-23
updated: 2026-08-28
repos: [minion-factory]
tags: [infra, security]
source: human
source_trust: human
risk_class: high
priority: medium
owner: human
---

# Wire the Factory deployment recovery controller

Late input folding creates a durable `deployment_recovery_intents` row when a
verified safety blocker arrives while a lineage is deploying or verifying. Its
identity and candidate binding remain immutable; the only authority transition
is an append-only-ledgered `stop` to exact `rollback` rebind when that same
candidate becomes live during the stop-versus-deploy race. The
runner now ships a bounded, exact-candidate sidecar protocol, a trusted one-shot
controller image, a boot/interval consumer, restart reconciliation, promotion
stop fences, and controller-owned confirmation receipts. Rollback authority
includes both the deployed candidate and the exact prior production SHA.

This remains an activation blocker, not a best-effort follow-up. Production must
keep `FACTORY_LINEAGE_ORCHESTRATOR_V1=0` until the controller is exercised
against a disposable target.

Local image evidence on 2026-08-23 covers a built one-shot controller container,
confirmed stop, restart reconciliation, exact rollback to the prior SHA, second
reconciliation, stable receipt digests, and root-owned `0555` executables. The
unchecked drill below is deliberately broader: it must also prove the deployed
runner-to-controller path and credential isolation on a disposable deployment.

Source marker:

- `minion-factory/runner/src/deployment-recovery-runtime.ts` — boot preflight,
  durable consumer, and the remaining external-drill marker.
- `minion-factory/deployment-controller/` — trusted stop/rollback executable.

## Definition of done

- [x] A trusted, root/controller-owned executable implements
  `factory-deployment-recovery-v1` for the closed production target.
- [x] The runner validates configuration at boot, resets crash-surviving claims for
  reconciliation, and drains pending intents independently of model activity.
- [x] Stop and rollback commands bind target, candidate SHA, previous SHA, intent,
  instance, input, and attempt without moving refs or shell interpolation.
- [x] A retry first reconciles the exact prior binding and never assumes an unknown
  remote outcome failed.
- [x] Confirmation records an immutable receipt digest; pending, malformed,
  mismatched, timed-out, or over-limit responses fail closed and remain visible.
- [x] A stop intent that races with deployment can become rollback authority only
  for the same candidate and exact prior SHA, with an append-only rebind row and
  a database trigger rejecting unledgered mutation.
- [x] Integration tests prove confirmed stop, confirmed rollback, ambiguous remote
  outcome, restart reconciliation, retry exhaustion, stale binding, and absent
  controller behavior.
- [ ] A disposable deployment drill proves that a safety input can stop or roll back
  the exact candidate without exposing production credentials to the broker,
  tool host, orchestrator, or worker containers.
- [ ] The lineage activation gate requires this drill and refuses startup when the
  recovery controller is absent.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
One shared blocker: code is merged; each waits on the SAME credentialed disposable-repo drill (autonomy flags 0). The in-flight 2026-08-28-factory-containment-base-reconciliation-spec Slices 5-6 build exactly that drill harness + activation wiring — these three ride its outcome rather than needing separate triage.
