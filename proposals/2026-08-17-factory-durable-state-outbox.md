---
id: 2026-08-17-factory-durable-state-outbox
title: Factory durable state — transition guards, leases, transactional outbox
status: in-spec
created: 2026-08-17
updated: 2026-08-18
repos: [minion-factory]
tags: [logic, infra]
source: audit-2026-08-17
value: high
spawned_spec: 2026-08-18-factory-durable-state-outbox-spec
---

# Durable state machine + outbox for run side effects

Audit 2026-08-17 priority #2. `postFinish()` is fire-and-forget
(`queue.ts:193`): a runner restart can permanently lose auto-fix escalation,
husk cleanup, head-SHA stamping, or spec→dev promotion. Lifecycle transitions
validate target statuses but not legal source→target edges, and md/index/sqlite
updates are not transactional.

**Definition of done:** every post-finish side effect persisted as a retryable
job with an idempotency key, drained by a worker that survives restarts;
lifecycle transitions enforce an explicit source→target table; append-only
run/lifecycle event log; uniqueness/CAS guards on status flips.

**Out of scope:** distributed queues — sqlite tables are sufficient.
