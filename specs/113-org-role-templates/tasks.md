# Tasks: organization-owned roles

**Input:** [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md).
**State:** Owner approved implementation on 2026-11-12. Remaining implementation tasks are pending.
Paths below are relative to `minion_hub/` unless marked meta.

## Approval and foundations

- [x] T001 Record owner approval in the meta board spec and review sidecar.
- [ ] T002 Verify the target branch against the pinned source/creation inventory
  in `research.md`; reconcile open provisioning/navigation/WhatsApp PRs.
- [ ] T003 Add additive model/default/provenance migration under
  `supabase/migrations/`; update schema types and `scripts/qa/seed/matrix.ts`.
- [ ] T004 Add pre-change legacy and new-model fixtures with native migration
  parity and foreign/missing-role denial tests in `src/server/services/`.
- [ ] T005 Implement role-model selection, active-role catalog and immutable
  versioned templates near `src/server/services/rbac.service.ts`.
- [ ] T006 Adapt every inventory authority consumer, including direct SQL;
  add one contract proving cached/fresh/agent/simulation/notification parity.

## US1 — New organization starts unrestricted

- [ ] T007 Add transactional bootstrap service under `src/server/services/`;
  create org, local Administrator, rules, ownership and creator assignment together.
- [ ] T008 Route `organization-provision.service.ts` through bootstrap, keeping
  external provision steps after commit; adapt readiness and retry semantics.
- [ ] T009 Test DB failure injection, concurrent creation, legacy adoption and
  retry after explicit role downgrade. Keep new-model creation disabled.

## US2 — Local roles from templates

- [ ] T010 Extend `src/routes/api/roles/+server.ts` with discriminated creation
  inputs and legacy adapter; implement template version/blank/duplicate sources.
- [ ] T011 Implement stable-key local rename and default-role selection through
  existing role endpoints with fresh authority, revisions, audit and invalidation.
- [ ] T012 Add new-model post-change last-admin/last-owner protection to role/assignment,
  membership and `section-access.service.ts` writers, including page denials; add legacy permission-edit regression cases.
- [ ] T013 Adapt `role-simulation.service.ts` and `brains.service.ts` with the
  separate predicates. Test Team manager with denied Brains and foreign private brain.
- [ ] T014 Test transactional creation, unchanged template copies, preserved page
  denials on duplicate, reference-safe deletion and concurrent admin downgrade.

## US4 — Admission with intended role

- [ ] T015 Replace new-model built-in invite enums/defaults in join endpoints;
  freeze target role/revision/grantor when minting each new-model invite.
- [ ] T016 Make `join/membership.ts`, `join/links.service.ts` and
  `join/requests.service.ts` admit atomically with request/use resolution.
- [ ] T017 Test default/local/legacy roles, default change after mint, original
  grantor downgrade, role revision change, cross-org/deleted-role, replay and max-use races.

## US2/US3 — Roles, templates and Team interface

- [ ] T018 Read Hub's UI governance skill before markup/style edits. Update
  canonical roles loader and `src/lib/components/users/RbacRolesSection.svelte`
  to separate active roles/templates and support template/duplicate/blank creation.
- [ ] T019 Update Team, invite and approval controls to show active org roles,
  Administrator default consequence, immutable invite role and union semantics.
- [ ] T020 Add EN/ES Paraglide messages, compile i18n, register any new route/API
  surfaces, and run `bun run lint:design && bun run lint:tokens`.
- [ ] T021 Verify keyboard flow, pending/failed saves, stale revisions and
  unchanged legacy organization role management using browser-harness on QA.

## US3 and final qualification

- [ ] T022 Run all fixture/native integration cases and exact-candidate Hub
  check/test/build; verify seed/migration pairing and shared consumer compatibility.
- [ ] T023 Capture source/schema/test/browser manifest and review Standards and
  Spec independently; document all remaining gaps with the required handoff ledger.
- [ ] T024 Obtain owner merge/release decision for the concrete candidate; only
  then enable new-model creation after compatible readers and migrations are live.
- [ ] T025 Verify one deliberately created synthetic new organization and a
  read-only legacy sample after release; record exact results and cleanup plan.

## Dependencies

T001 is the human gate before product code. T002–T006 precede bootstrap and role
administration. T007–T017 can be developed in isolated slices but remain disabled
until the UI and complete qualification pass. T024 is a separate human decision.
No task checked here means no product implementation is claimed.
