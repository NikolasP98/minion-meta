---
id: 2026-08-17-factory-deterministic-unstick
title: Deterministic unstick handlers for known failure classes
status: done
created: 2026-08-17
updated: 2026-08-28
repos: [minion-factory]
tags: [logic, infra]
source: audit-2026-08-17
value: medium
spawned_spec: 2026-08-18-factory-deterministic-unstick-spec
---

# Known failures should not need an LLM

Audit 2026-08-17 P1. The hourly unstick cron hands every stall class to a
facilitator agent. Timeouts, provider outages, clone failures and orphans have
known deterministic remedies (requeue, wait-and-retry, adopt); the LLM should
only classify UNKNOWN failures, advisory-only, without the full runner secret.

**Definition of done:** unstick-cron resolves known classes with direct API
calls (requeue endpoint already idempotent); facilitator agent only invoked
for unmatched signatures, with a read-only/scoped credential; each
deterministic action logged as a monitor event.

**Out of scope:** changing detection thresholds.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
ADDRESSED: unstick-cron.sh deterministic signature table (timeout/queue-wedged/orphan/state-conflict/transient/outage/deferred), facilitator only for unmatched, LINEAGE_CAP enforced at both call sites + API lineageAdmission backstop (#110).
