---
id: 2026-08-17-factory-release-rollback
title: Factory release safety — pre-deploy gate, backups, rollback for self-update
status: done
created: 2026-08-17
updated: 2026-08-28
repos: [minion-factory]
tags: [infra]
source: audit-2026-08-17
value: medium
spawned_spec: 2026-08-18-factory-release-rollback-spec
source_trust: trusted-automation
risk_class: high
priority: medium
owner: factory
---

# self-update.sh has no safety net

Audit 2026-08-17 priority #5. The box hard-resets to origin/main, rebuilds and
restarts every 5 minutes with no pre-deploy CI gate, no previous-image
retention, no sqlite backup, no post-deploy verification and no rollback.
A bad push bricks the factory until manually fixed.

**Definition of done:** self-update only deploys commits whose CI is green
(requires the test-suite proposal); keeps the previous image tag; snapshots
/data/factory.db before restart; verifies runner /health after restart and
rolls back to the previous image on failure, filing a monitor event.

**Out of scope:** canary/staging environments (single box).

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Spec shipped; see spec audit note.
