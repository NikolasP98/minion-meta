# Tasks: FACES personal-account agenda in the operations Space

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/behavior.md, contracts/canonical-access.md, contracts/policy-read-seam.md, quickstart.md and implementation-inventory.md in this directory.
**Status**: Specification only; every task is unchecked. Tests are required by this spec. Hub paths are relative to minion_hub unless prefixed `specs/` or `.local/`.

## Phase 1 — Setup

- [ ] T001 Record owner spec approval, the execution scope and the independent-review result in `specs/127-faces-operations-agenda/validation.md` before any implementation or configuration action.
- [ ] T002 Verify the candidate hash, `master` PR base and Bun from repo-policy, and local QA ownership using `docs/qa-stack.md`; obtain an authorized isolated feature checkout without touching shared WIP.

## Phase 2 — Foundational evidence

- [ ] T003 Re-read every anchored source in `specs/127-faces-operations-agenda/research.md`; classify supported behavior versus reproduced gap and record candidate differences in `specs/127-faces-operations-agenda/validation.md`. Reproduce the cached-read to whole-write data-loss counterexample. Only an already-present agenda link is a no-write verification.
- [ ] T004 Prepare the synthetic persona and entity matrix in `scripts/qa/seed/matrix.ts` only if existing fixtures do not cover it; record resolved runtime identity and configuration preconditions privately as `specs/127-faces-operations-agenda/quickstart.md` directs.
- [ ] T005 Confirm on the candidate that the marked-alias gap in `specs/127-faces-operations-agenda/research.md` (alias allow overriding a canonical deny in `src/server/services/permissions.service.ts` and `src/hooks.server.ts`) still reproduces, and record it in `specs/127-faces-operations-agenda/validation.md`. Stop for an owner-reviewed amendment on any unrelated security gap.

## Phase 3 — User Story 1 (P1, MVP)

**Goal**: The owner receives a current-state report identifying the intended personal accounts, organization, Space and existing agenda target before any write.
**Independent acceptance**: Resolve the approved account identifiers and read current navigation and policy with no mutation; show whether the agenda link is already configured and accessible.

- [ ] T006 [US1] Capture a failing regression, or a supported-behavior baseline, for Story 1 in `src/routes/api/nav/server.test.ts`, following the fixture and denial oracle in `specs/127-faces-operations-agenda/quickstart.md`.
- [ ] T007 [US1] Prepare the read-only intake draft in `.local/faces-followups-2026-11-16/speckit-F6/execution-manifest.json`.

  Action: resolve the org, Space, operations personal account and the `/pos/appointments` target; compare the current `pdv` config with the sanitized read summary. Prepare the proposed before and after diff and policy snapshot, keeping every policy and role grant.

  Evidence: store the observation time and draft policy revision. Record the operations account separately, and Coli as not provisioned (owner-confirmed).

  Stop: this draft is not an approved apply manifest. T017 must obtain a new fresh revision and diff after the qualified release. Do not invite, create an account or change grants.
- [ ] T018 [US1] Add the sticky marker and keep it through copy and paste.

  Action: add `canonicalAccess?: true`, normalization, validation and `retainCanonicalAccess` in `src/lib/nav/custom-sections.ts`, and literal-true admission in `src/lib/nav/nav-config-schema.ts`. Carry the marker in the clipboard type in `src/lib/nav/nav-edit.svelte.ts`, the copy handler in `src/lib/components/layout/NavContextMenu.svelte`, and `addLink` construction in `src/lib/nav/custom-sections.ts`, as in `specs/127-faces-operations-agenda/contracts/canonical-access.md`.

  Tests: `src/lib/nav/custom-sections.test.ts` and `src/lib/components/layout/NavContextMenu.mounted.test.ts`.
- [ ] T020 [US1] Extract the authority-only policy reads.

  Action: in `src/server/services/section-access.service.ts`, add `PolicyAuthorityRows` and `loadPolicyAuthorityRows`, narrow `requireFreshPolicyActor`'s input, and export `assertNavPolicyRevisionInTx` and `assertNavigationAccessRecoverableInTx`, as in `specs/127-faces-operations-agenda/contracts/policy-read-seam.md`. Existing callers of `loadPolicyRows` keep their behavior.

  Tests: `src/server/services/section-access.service.test.ts`.
- [ ] T008 [US1] Implement the conditional and scoped navigation protocol in `src/routes/api/nav/config/+server.ts` and `src/server/services/nav-config.service.ts`.

  Action: add the `fresh=1` read and ETag, the policy selector and revision header, optional `If-Match`, the 412 refusals before any side effect, and the preserve-single-link delta, changed-key collision check and skipped pruning, as in `specs/127-faces-operations-agenda/contracts/behavior.md` and `contracts/canonical-access.md`. Call the T020 helpers through the existing dynamic import. Keep `version: 1`; admit only one marked `kind: 'link'` page with an ID matching `^[a-z0-9]{6}$`, at most 20 sections, 30 pages and 40-character labels; keep every existing page and unrelated field. An already-present link means zero writes.

  Evidence: `src/server/services/nav-config.service.test.ts` and `src/routes/api/nav/server.test.ts` cover the headers, status codes, refusals with zero side effects and legacy no-header compatibility; record results in `specs/127-faces-operations-agenda/validation.md`.

  Stop: unmarked aliases keep their semantics. This task does not authorize the real configuration change in T017.
- [ ] T019 [US1] Enforce the canonical ceiling for marked aliases.

  Action: add `canonicalTargetViewAllowed` to `src/server/services/permissions.service.ts`, use it in the native static-path guard and in `loadPermissionsForUser` for marked pages, and require it for marked hits and deeper routes in `src/hooks.server.ts`, as in `specs/127-faces-operations-agenda/contracts/canonical-access.md`. `src/routes/api/nav/resolve/+server.ts` needs no change.

  Tests: `src/server/services/permissions.service.test.ts`, `src/hooks.tenant.test.ts`, `src/lib/nav/custom-sections-nav.test.ts`, and the marked-alias 404 case in the `GET /api/nav/resolve` suite of `src/routes/api/nav/server.test.ts`.
- [ ] T009 [US1] Verify positive, foreign, masked and denied cases against real local QA plus the focused command in `specs/127-faces-operations-agenda/quickstart.md`; record before and after evidence in `specs/127-faces-operations-agenda/validation.md`.

## Phase 4 — User Story 2 (P1)

**Goal**: Each intended staff member opens the existing agenda from the same operations Space alongside sell, clients and marketing.
**Independent acceptance**: For each named personal account's local counterpart, reload, open the alias and confirm the canonical agenda uses existing records; compare unrelated users.

- [ ] T010 [US2] Add the Story 2 persistence, recovery and forbidden-path regression in `src/lib/nav/personal-navigation.test.ts`; prove the counterexample before claiming a fix.
- [ ] T011 [US2] On the owned synthetic local QA target only, rehearse the one-link PUT through `src/routes/api/nav/config/+server.ts` with the fixture org's fresh revisions and preserve-single-link mode. Prove the stale 412 has zero effects, persistence is confirmed by a fresh read before any retry, authority is unchanged, and synthetic personas get the expected reload, alias and canonical loader results. No real organization write is authorized; record QA evidence in `specs/127-faces-operations-agenda/validation.md`.
- [ ] T012 [US2] Create `src/server/services/nav-config-conditional.sql.integration.test.ts` with the behaviors in the [native lane](quickstart.md#native-postgresql-lane), admit it once under `qa-native` in `scripts/qc/native-postgres-manifest.ts`, and extend `scripts/qc/native-postgres-manifest.test.ts` and `scripts/qc/native-postgres-report.test.ts`. Run the full-lane command and report validator from the quickstart. Requires the F7-qualified shared `exactAssertions` harness, a test-only prerequisite. Record the result in `specs/127-faces-operations-agenda/validation.md`.

## Phase 5 — Polish and qualification

- [ ] T013 Add or update translated labels in `messages/en.json` and `messages/es.json` only where needed, run `bun run i18n:compile`, and use semantic tokens and shared primitives for every UI file in `specs/127-faces-operations-agenda/implementation-inventory.md`; if no label changes, record why.
- [ ] T014 Run the full Hub check, test and build plus the UI design and token gates from `package.json`; save exit codes for the candidate in `specs/127-faces-operations-agenda/validation.md`.
- [ ] T015 Run the browser acceptance matrix through Browser Harness with real route-data outcomes; store synthetic screenshots and redaction assertions under `specs/127-faces-operations-agenda/evidence/` and summarize them in `specs/127-faces-operations-agenda/validation.md`.
- [ ] T016 After T012, T014 and T015 pass, obtain owner merge approval for the code diff, complete its separately authorized release, and verify the deployed source and its fresh-read and conditional-write behavior in `specs/127-faces-operations-agenda/validation.md`. Do not change real organization navigation here.

## Phase 6 — Real organization configuration, after the qualified release

- [ ] T017 Apply and verify the real-org configuration through `src/routes/api/nav/config/+server.ts`, only after T016.

  Action: re-resolve the org, section, target and operator; take a new uncached read and backup and inspect policy. Regenerate the one-link diff, both revisions and the inverse from current state in `.local/faces-followups-2026-11-16/speckit-F6/execution-manifest.json`, with `canonicalAccess: true`. Confirm no organization provisioning run targets the FACES org.

  Approval and stop: obtain owner approval of that fresh diff, target and policy state, then apply at most once under the recovery rules in `contracts/behavior.md`. If the link is already present, make zero writes. Earlier drafts and QA approvals do not count. Coli stays deferred; do not create, invite or grant.

  Evidence: verify the persisted state, the marked-alias canonical ceiling, and the operations account's alias and canonical loader after reload. Record unchanged authority and runtime evidence in `specs/127-faces-operations-agenda/validation.md`, and reconcile results and open gates with `proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md`. Any open end needs a `TODO(handoff)` at its site plus a proposal entry before handoff.

## Dependencies and parallel opportunities

T001 to T005 block implementation. Story 1: T006 → T007 (read-only draft) → T018 → T020 → T008 → T019 → T009. Story 2: T010 → T011 (synthetic QA rehearsal only) → T012 (full native qualification). T013 → T014 → T015 follow both stories. T016 (owner code merge, release and deployed-behavior proof) follows every local, native and browser gate. T017 is the only real configuration change, after T016, a new current-state preview and backup, and owner approval of that diff. No T007 draft or QA fixture approval authorizes T017. Coli's provisioning is outside this chain; it cannot block the operations account's acceptance and cannot be claimed complete.

No task is marked [P]: the tasks share files, account configuration and fixture ownership. Independent source or fixture review can run alongside once ownership is set, without editing the same files or sharing a browser. Real writes, target approvals and runtime proof stay sequential.

## Implementation strategy and completeness

The MVP is Story 1, subject to every approval and permission gate; verify existing behavior before coding. Story 2 local qualification is not real-account delivery; that needs T017 after the release. T005, T009, T012 and T019 cover authority; T013 to T015 cover i18n, tokens, browser and persistence.

There are twenty unchecked tasks: setup 2, foundation 3, Story 1 seven (T006 to T009 and T018 to T020), Story 2 three, polish and release 4, real configuration 1. T018 to T020 were added after T017 and sit in Phase 3, so IDs are stable rather than in file order. Every task names the files it touches; every file in `implementation-inventory.md` belongs to a task. Neither these tasks nor their prerequisites prove implementation or review.
