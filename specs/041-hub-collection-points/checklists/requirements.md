# Specification Quality Checklist: Collection points ("doors")

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-24
**Feature**: [spec.md](../spec.md)

## Content Quality
- [x] Focused on user value and business needs (product framing ties doors to the ERP→CRM→RPA method)
- [x] Written for non-technical stakeholders: user stories and success criteria read without code
- [x] All mandatory sections completed
- [ ] No implementation details. **Deliberate deviation**: the Minion constitution (Principle II) requires AS-IS anchors and invariants, so the spec names tables and files. Requirements stay behavioural where possible.

## Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (open decisions are recorded as Assumptions plus the follow-ups proposal)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] All acceptance scenarios are defined (US1–US7)
- [x] Edge cases are identified
- [x] Scope is clearly bounded (payments, opt-out UI, staff notifications, retention are out of scope and listed)
- [x] Dependencies and assumptions identified

## Feature Readiness
- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Every slice has a live dev:local acceptance check (plan.md §Slices)

## Notes
- Security + data tag: owner approval required before S0 starts (tasks T001).
