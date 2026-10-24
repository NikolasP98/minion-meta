# Specification Quality Checklist: Custom navigation sections with alias pages (Amendment A)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-23 · **Amended**: 2026-10-23 (A: symlink model; B: page/data role axes, ids in URLs)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details beyond what the SDLC contract requires (AS-IS anchors and the DELTA proofs name files on purpose; TO-BE, operations table and requirements stay behavioural)
- [x] Focused on user value and business needs (owner's symlink mental model drives the operation set)
- [x] Written for non-technical stakeholders (Amendment A table, owner decisions D5–D7 with recommendations, invariants in plain words)
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain (D5–D7 answered; D8–D10 carry recommended defaults; D1/D4 recorded as superseded, D2/D3 as standing)
- [x] Requirements are testable and unambiguous (FR-001..FR-010 each map to a DELTA proof T1–T11)
- [x] Success criteria are measurable (SC-001..SC-005)
- [x] Success criteria are technology-agnostic where they describe outcomes (SC-003/SC-005 name gates by project convention)
- [x] All acceptance scenarios are defined (US1–US4, incl. the view/data split matrix in US3)
- [x] Edge cases are identified (prefix nesting, moved-main native nav, settings targets, long-press platforms, concurrency)
- [x] Scope is clearly bounded (Out of scope list; cuts justified in research R10–R13)
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into the TO-BE invariants

## Security review points (for the owner's approval)

- [x] Data-read exposure finding stated as the transition invariant (I1‴ module-view floor keyed on `DATASET_ENFORCED`, flipped per module by spec 039) with anchors (`pos/sell/+page.server.ts:19-27`, `pos/+layout.server.ts:14-22`, no caps in `pos.service.ts`; 62/73 loads unguarded — 039 R1)
- [x] Page roles never gate data (D5 answered); built-in mains keep today's registry decision until an explicit `page:<pattern>` row exists (US3.5)
- [x] Page rules reuse `permission_rules` + the existing `users:manage` overrides API; orphan rows deleted on instance/section removal; RBAC cache invalidated on document writes; cascade is an explicit walk (research R16)
- [x] Instance ids are unguessable enough for URLs but NOT a secret: access is the page rule, never the id (R18)
- [x] Hidden entries ship only to `settings:manage` members (I8); hide is nav-only (I10)

## Notes

- Security + data tagged: owner approval of this spec is required before `/speckit-implement`; owner merges each hub slice.
- Unverified items: quickstart Q20 (`PageHeader` fallback title on instance paths, R8); Q21 (`~` marker through Vercel edge normalisation, R18); whether `GET /api/roles` exists (R17).
- S1 is a delta on the uncommitted worktree `~/.cache/claude-tmp/hub-037-s1`; tasks.md T001–T002 state what to revert and keep.
