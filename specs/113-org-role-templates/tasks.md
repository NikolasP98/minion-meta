# Tasks: organization-owned roles

**Input:** [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md).
**State:** Owner approved implementation and the role CRUD amendment on 2026-11-12.
Implementation is ready in [Hub PR 656](https://github.com/NikolasP98/minion_hub/pull/656),
source `99341e7074541360eadcf2dcd32e67494f3c65ad`, tree
`0295df1eb209992cc5c9e3354754c29de93884bf`. Source review passes Standards and
Spec; local check has zero errors/warnings. All 18 exact-head PR checks pass; CI receipt:
[43193428656](https://github.com/NikolasP98/minion_hub/actions/runs/43193428656).
Paths below are relative to `minion_hub/` unless marked meta.

## Approval and foundations

- [x] T001 Record owner approval in the meta board spec and review sidecar.
  Record the later owner-approved role CRUD/grant-ceiling amendment in spec/plan/tasks.
- [x] T002 Verify the target branch against the pinned source/creation inventory
  in `research.md`; reconcile open provisioning/navigation/WhatsApp PRs.
- [x] T003 Add additive model/default/provenance migration under
  `supabase/migrations/`; update schema types and `scripts/qa/seed/matrix.ts`.
- [x] T004 Add pre-change legacy and new-model fixtures with native migration
  parity and foreign/missing-role denial tests in `src/server/services/`.
- [x] T005 Implement role-model selection, active-role catalog and immutable
  versioned templates near `src/server/services/rbac.service.ts`.
- [x] T006 Adapt every inventory authority consumer, including direct SQL;
  add one contract proving cached/fresh/agent/simulation/notification parity.

## US1 — New organization starts unrestricted

- [x] T007 Add transactional bootstrap service under `src/server/services/`;
  create org, local Administrator, rules, ownership and creator assignment together.
- [x] T008 Route `organization-provision.service.ts` through bootstrap, keeping
  external provision steps after commit; adapt readiness and retry semantics.
- [x] T009 Test DB failure injection, concurrent creation, legacy adoption and
  retry after explicit role downgrade. Keep new-model creation disabled.

## US2 — Local roles from templates

- [x] T010 Extend `src/routes/api/roles/+server.ts` with discriminated creation
  inputs and legacy adapter; implement template version/blank/duplicate sources.
  Require explicit `roles:create`; Manager template has view/create/edit/delete,
  Staff/Viewer none, and legacy global Manager defaults to none.
- [x] T011 Implement stable-key local rename and default-role selection through
  existing role endpoints with fresh authority, revisions, audit and invalidation.
  Use `roles:edit` for rename/permission writes, `roles:delete` for deletion;
  default selection additionally requires `users:manage`. Team authority alone
  implies no role CRUD. Prove full actual/effective grant ceilings.
- [x] T012 Add new-model post-change last-admin/last-owner protection to role/assignment,
  membership and `section-access.service.ts` writers, including page denials;
  require recovery `users:manage` plus `roles:view`/`roles:edit` and rendered page
  chains. Add legacy regression cases preserving existing data grants.
- [x] T013 Adapt `role-simulation.service.ts` and `brains.service.ts` with the
  separate predicates. Test Team manager with denied Brains and foreign private
  brain. Serialize Brain ACL/visibility grants with fresh actual/effective module,
  owner-scope and per-object write checks, same-org recipient validation and audit
  in the write transaction. Test stale role/ACL revocation and simulated real-actor
  revocation: no grant, visibility widening or audit side effects.
- [x] T014 Test transactional creation, unchanged template copies, preserved page
  denials on duplicate, reference-safe deletion and concurrent admin downgrade.

## US4 — Admission with intended role

- [x] T015 Replace new-model built-in invite enums/defaults in join endpoints;
  freeze target role/revision/grantor when minting each new-model invite.
- [x] T016 Make `join/membership.ts`, `join/links.service.ts` and
  `join/requests.service.ts` admit atomically with request/use resolution.
- [x] T017 Test default/local/legacy roles, default change after mint, original
  grantor downgrade, role revision change, cross-org/deleted-role, replay and max-use races.

## US2/US3 — Roles, templates and Team interface

- [x] T018 Read Hub's UI governance skill before markup/style edits. Update
  canonical roles loader and `src/lib/components/users/RbacRolesSection.svelte`
  to separate active roles/templates and support template/duplicate/blank creation.
  Loader uses `roles:view`; UI gates each role action independently. Manager
  template users can discover Roles without Team access; Team-only users cannot
  edit role definitions. Settings org links use route capabilities.
- [x] T019 Update Team, invite and approval controls to show active org roles,
  Administrator default consequence, immutable invite role and union semantics.
- [x] T020 Add EN/ES Paraglide messages, compile i18n, register any new route/API
  surfaces, and run `bun run lint:design && bun run lint:tokens`.
- [x] T021 Verify keyboard/mobile role flows and unchanged legacy organization
  role management using browser-harness on QA. Mounted policy-editor cases cover
  pending/failed saves, stale revisions and acknowledgement recovery.

## US3 and final qualification

- [x] T022 Run all fixture/native integration cases and exact-candidate Hub
  check/test/build; verify seed/migration pairing and shared consumer compatibility.
- [x] T023 Capture source/schema/test/browser manifest and review Standards and
  Spec independently; document all remaining gaps with the required handoff ledger.
- [x] T024 Owner approved merge/release of the concrete candidate on 2026-11-12.
  Activation remains sequenced after compatible readers, migrations and runtime checks.
- [ ] T025 Verify one deliberately created synthetic new organization and a
  read-only legacy sample after release; record exact results and cleanup plan.

## Dependencies

T001 is the human gate before product code. T002–T006 precede bootstrap and role
administration. T007–T017 can be developed in isolated slices but remain disabled
until the UI and complete qualification pass. T024 is a separate human decision.
Checked implementation tasks refer to the committed candidate above. Source
implementation has no accepted open defect in the reviewed current permission
model. Shared-consumer native evidence and the full 9,575-case unit suite pass.
T022/T023 are complete: full unit, native, build and browser gates pass. Evidence
is assembled in
[audits](../../audits/2026-11-12-org-role-templates/qualification.md), with the
independent source review and separate CI/release boundaries recorded there.

Current focused evidence: 63 native role/assignment cases, 43 native admission
cases, 22 native policy cases and 10 native principal cases; 32 generic data/rank
helper cases, 24 Brain helper cases, 8 assignment API cases, 23 policy cases and
58 join/API/action cases. Existing RBAC, bootstrap, Brain-grant/lifecycle and
notification projection receipts remain separately identified; exact-head full
CI requalified their interactions. Local check: zero errors/warnings. Native
manifest/report/principal and bypass inventory contracts: 32 passing tests.
The nine changed UI/message files match the browser-qualified capture source.
These results do not replace owner release approval or post-release verification.
