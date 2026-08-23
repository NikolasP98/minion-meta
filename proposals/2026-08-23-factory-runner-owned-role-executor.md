---
id: 2026-08-23-factory-runner-owned-role-executor
title: Add a runner-owned typed executor for Factory orchestrator roles
status: proposed
created: 2026-08-23
updated: 2026-08-23
repos: [minion-factory]
tags: [factory, orchestration, security]
---

# Add a runner-owned typed executor for Factory orchestrator roles

Factory Slice 4 installs and validates six image-owned Codex role definitions,
but deliberately keeps native Codex fanout disabled. SDK collaboration events
do not expose enough structural role and result identity for the broker to prove
which role ran, which bounded result it returned, or whether every child closed.

The remaining implementation is a runner-owned executor that claims one typed
`phase_requests` row, maps its allowlisted `executor_role` to an immutable role
definition, starts a bounded worker, records the attempt before launch, validates
the exact role-result schema, and seals status/evidence/output candidate in the
runner attempt ledger before recording the handoff. Restart, cancellation,
claim-generation fencing, and terminal child closure must remain controller-owned.

Source marker:

- `minion-factory/broker/src/policy.ts` — native `multi_agent` remains disabled
  until the runner-owned executor proves role identity, bounded output, claim
  generation, and child closure.

## Definition of done

- Every claimed phase request maps to exactly one allowlisted role and phase
  policy.
- The runner records the exact attempt binding before worker launch.
- Worker output validates against `role-result-v1.schema.json`; prose is never
  treated as release authority.
- Completion is accepted only for the current lease and claim generation.
- Every launched worker reaches a durable terminal state across success,
  failure, cancellation, timeout, and runner restart.
- Only runner-derived attempt status and controller evidence can create a
  validated phase handoff.
- Native broker fanout remains disabled unless a future SDK exposes equivalent
  structural guarantees.
