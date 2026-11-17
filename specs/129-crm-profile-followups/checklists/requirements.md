# Specification Quality Checklist: Discoverable persistent CRM profile classification and Instagram recording

**Purpose**: Author checks of the requirements, not implementation qualification. Each checked item names the evidence a reader can verify.
**Created**: 2026-11-16
**Updated**: 2026-11-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Functional requirements FR-001 to FR-007 name no API, algorithm or framework; those live in the contracts.
- [x] Each user story states its user value under "Why this priority".
- [x] Mandatory sections present: user scenarios, requirements, success criteria, AS-IS, TO-BE, DELTA.

## Requirement Completeness

- [x] No `[NEEDS CLARIFICATION]` marker in spec.md; open runtime facts have stop or no-op rules in quickstart.md and tasks.md.
- [x] Each acceptance scenario has a matching regression: US1 in the quickstart fixture table, US2 in the behavior.md regressions list and the nine native behaviors.
- [x] Success criteria are counts or equalities (zero unauthorized mutations, byte-identical stored values, exactly one storage path, zero identities inserted).
- [x] Edge cases listed in spec.md each map to a contract rule or quickstart case.
- [x] Scope is limited to proposal item F8; pre-existing defects fixed on the same paths are listed under "Decisions made during review (owner to confirm)".
- [x] Dependencies are stated: F7 tasks T003 and T005 for the native auth helper.

## Feature Readiness

- [x] Every functional requirement has a task ID in tasks.md and a file row in implementation-inventory.md.
- [ ] Owner confirmation of the review decisions in spec.md: pending.
- [ ] Owner approval before data/configuration implementation: pending.
- [x] Independent review records are under egm/; their outcomes are separate from owner approval.

## Notes

Unchecked items block implementation claims, not preparation of review material. Server freshness after a merge uses existing uncached GETs rather than loader invalidation; native auth prerequisites, including the `service_role` sentinel, come from F7's planned shared helper. All product qualification remains pending.
