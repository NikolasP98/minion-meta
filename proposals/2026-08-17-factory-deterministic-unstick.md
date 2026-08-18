---
id: 2026-08-17-factory-deterministic-unstick
title: Deterministic unstick handlers for known failure classes
status: draft
created: 2026-08-17
updated: 2026-08-17
repos: [minion-factory]
tags: [logic, infra]
source: audit-2026-08-17
value: medium
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
