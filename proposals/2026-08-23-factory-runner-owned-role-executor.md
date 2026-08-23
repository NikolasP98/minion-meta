---
id: 2026-08-23-factory-runner-owned-role-executor
title: Add a runner-owned typed executor for Factory orchestrator roles
status: implementing
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

The runner-owned executor now claims typed `phase_requests`, maps the six agent
roles to immutable image-owned definitions, records attempts before launch,
calls a start-only `/role-turn` endpoint, validates terminal role-result JSON,
and seals status plus controller-owned evidence under the current lease and
claim generation. Restart, cancellation, timeout, and stale-claim paths all
terminate durably. Native fanout remains disabled; the fixed runner-owned route
is the trusted delegation path.

The data and effect planes are now integrated. Fixed read roles receive only
commit-pinned, bounded source and content-addressed artifact bodies. Artifact
bytes deduplicate globally while append-only bindings preserve independent
instance/request authority. Typed worker
requests execute through containment v2, while controller requests alone own
hosted CI, exact `dev` staging, scheduled deployment observation, and production
verification. The remaining activation gate is the external spec-to-production
canary, including restart, cancellation, late input, and rollback.

Source marker:

- `minion-factory/broker/src/policy.ts` — native `multi_agent` remains disabled;
  the fixed `/role-turn` path is the only structurally bound role executor.
- `minion-factory/runner/src/phase-role-inputs.ts` — immutable input resolver.
- `minion-factory/runner/src/lineage-phase-transports.ts` — worker and release
  controller adapters.

## Definition of done

- [x] Every claimed agent phase request maps to exactly one allowlisted role and
  phase policy.
- [x] The runner records the exact attempt binding before role launch.
- [x] Role output validates against a closed schema; model prose is never
  release authority.
- [x] Completion is accepted only for the current lease and claim generation.
- [x] Every launched fixed role reaches a durable terminal state across success,
  failure, cancellation, timeout, and runner restart.
- [x] Only runner-derived attempt status and controller evidence can create a
  validated phase handoff.
- [x] Read roles receive only controller-verified immutable checkout/artifact
  bodies, with path, byte, count, and digest bounds.
- [x] Worker phases use the containment-v2 phase runner through a typed adapter
  that returns exact candidate and artifact evidence.
- [x] Controller phases use a trusted CI/deploy/verify adapter; no model or
  worker receives deployment authority.
- [ ] Production activation proves a complete spec-to-production lineage on an
  exact candidate while late input, restart, cancellation, and rollback remain
  fail-closed.
- [x] Native broker fanout remains disabled unless a future SDK exposes
  equivalent structural guarantees.
