---
id: 2026-08-28-factory-supervised-release-defense-in-depth
title: Complete defense in depth for supervised Factory releases
status: approved
created: 2026-08-28
updated: 2026-08-31
repos: [minion-factory, minion-meta]
tags: [security, infra]
value: 5
effort: L
source: supervised-autodeploy-audit-2026-08-28
approved_reason: "Ranked-queue supervisor approval: board-goal-v2 score 83/100, recommendation execute, readiness specification 9/10 and implementation 6/10; live admission threshold 80/100 and readiness threshold 6/10."
---

# Complete defense in depth for supervised Factory releases

## Problem

The supervised exact-candidate release controller can make every supported repository path fail
closed, but the production SSH principal still has a general shell and Docker authority. A hostile
or compromised operator session could bypass repository-level marker and ledger checks. The current
controller also needs a documented, executable recovery when the trusted controller itself is too
broken to promote its repair without advancing production `main` ahead of the live marker.

GitHub artifacts retain the agent manifest, receipt, and closed deployment record, but they are not
an external transparency log. Finally, deterministic rollback preflight is covered without a full
production rollback-and-forward drill.

## Proposed work

1. Provision a dedicated forced-command SSH deployment principal. Allow only the exact staged
   release, verification, reconciliation, and rollback operations; deny a general shell, arbitrary
   `scp`, and unrestricted Docker commands.
2. Make `.deploy-marker` and `.promotion-state` root-owned. The forced controller is their only
   writer; the runner and normal deployment user receive only the minimum read access they need.
3. Add a protected controller recovery identity that is separate from the production base identity.
   Prove with a fixture that a controller repair can be reviewed and loaded while the release
   manifest still binds the actual live marker, and that `main` never claims an unverified runtime.
4. Mirror or sign the canonical manifest, agent receipt, and closed deployment record in an
   append-only store outside the mutable production host and normal GitHub artifact retention.
5. Run a controlled rollback-and-forward drill with a disposable database write between releases.
   Prove exact image, source, marker, ledger, environment, and database-reconciliation behavior.
6. Evaluate a GitHub ruleset or deployment-protection integration that enforces the allowed branch
   and environment transition policy server-side.

## Definition of done

- The production key cannot obtain an interactive shell, upload an arbitrary executable, write the
  marker/state directly, or run an arbitrary Docker command.
- A controller-repair test starts with `controller != live marker`, releases one exact descendant,
  and finishes with `main == marker == tree == runningSha` without weakening candidate gates.
- Every successful release has an independently verifiable append-only manifest/receipt/record
  identity whose candidate SHA matches the GitHub Deployment and production ledger.
- The rollback drill proves refusal for a moved image tag or stale ledger, successful rollback to
  the sealed previous release, explicit data reconciliation, and a supervised forward release.
- CI fails if the forced-command allowlist, ownership contract, controller/live-base separation, or
  external receipt binding regresses.

## Out of scope

- Allowing model output to waive a deterministic release gate.
- Automatically restoring a production database without operator-reviewed write reconciliation.
- Replacing the existing exact-candidate manifest, receipt, or deployment-record formats.
