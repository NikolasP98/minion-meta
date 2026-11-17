# Tasks: Discoverable persistent CRM profile classification and Instagram recording

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/ and quickstart.md in this directory.
**Status**: Specification only; all tasks unchecked. Tests are required by this spec. Hub paths are relative to minion_hub unless prefixed `specs/`. Per-file actions are in implementation-inventory.md, whose Task column matches these IDs.

## Phase 1 — Setup

- [x] T001 Record owner spec approval, execution scope and independent-review result in `specs/129-crm-profile-followups/validation.md` before any implementation or configuration action.
- [ ] T002 Verify candidate hash, master PR base and Bun from repo-policy, and local QA ownership using `docs/qa-stack.md`; obtain an isolated feature checkout without altering shared WIP.

## Phase 2 — Foundational evidence

- [ ] T003 Re-read every anchored source in `specs/129-crm-profile-followups/research.md` on the candidate, including the installed `@minion-stack/cache` `invalidateTags`; classify supported behavior versus reproduced gap and record candidate differences in `specs/129-crm-profile-followups/validation.md`.
- [ ] T004 Prepare the synthetic persona/entity matrix in `scripts/qa/seed/matrix.ts` only if existing fixtures do not cover it; record runtime identity and configuration preconditions privately as directed by `specs/129-crm-profile-followups/quickstart.md`.
- [ ] T005 Prove module, route, owner and field masking admission for the scoped reads and writes in `src/server/services/rbac.service.ts` and `src/hooks.server.ts`; stop for an owner-reviewed amendment on security gaps outside `specs/129-crm-profile-followups/contracts/behavior.md`.

## Phase 3 — User Story 1 (P1, MVP)

**Goal**: Staff using personal accounts find and apply the CRM profile tag modelo, reload and see it without changing event tags or customer lifecycle.
**Independent acceptance**: Apply an existing manual CRM modelo tag to a synthetic contact, reload with the same and another authorized account; compare booking tags and lifecycle.

- [x] T006 [US1] Write the failing regressions and supported-behavior baseline from the US1 fixture table in `specs/129-crm-profile-followups/quickstart.md` into `src/routes/(app)/crm/[contactId]/page.server.test.ts`, `src/server/services/simulated-record-mutations.test.ts` and the new `src/routes/api/crm/contacts/[id]/tags/server.test.ts`.
- [ ] T007 [US1] Run those regressions against `src/routes/api/crm/contacts/[id]/tags/+server.ts` and `src/server/services/crm-contacts.service.ts` at the pin; record which rows fail (foreign-org, missing, deleted and malformed contact IDs are expected to fail) in `specs/129-crm-profile-followups/validation.md`.
- [x] T018 [US1] Implement the tag contact admission in `specs/129-crm-profile-followups/contracts/behavior.md` (`lockContactsInOrg` in `src/server/services/crm-contacts.service.ts`, UUID and error handling in `src/routes/api/crm/contacts/[id]/tags/+server.ts`) until the T006 regressions pass. Checkpoint: `bun run check` and the US1 command in quickstart.md pass.
- [ ] T008 [US1] Add translated profile-tag/layout help in `src/routes/(app)/crm/[contactId]/PageBody.svelte` only if the staff walkthrough reproduces confusion; keep card placement and the per-account EditableGrid version "1" layout; otherwise record a no-code result.
- [ ] T009 [US1] Verify positive, foreign, masked and denied cases against real local QA plus `src/routes/(app)/crm/[contactId]/page.server.test.ts` and `src/lib/components/dashboard/EditableGrid.mounted.test.ts`; record before/after evidence in `specs/129-crm-profile-followups/validation.md`.

## Phase 4 — User Story 2 (P2)

**Goal**: Staff reuse the existing profile custom-property or Additional-field editor to store a manually supplied Instagram handle, and can distinguish it from a synchronized channel identity.
**Independent acceptance**: Inspect existing org fields first; record a synthetic manual handle using exactly one chosen existing storage path, reload and confirm no channel connection or identity row was created.

- [x] T010 [US2] Write failing ordinary-Vitest regressions (no concurrency): key sets and helpers in `src/lib/pii.test.ts`; restricted whole/partial/phone preservation in `src/server/services/crm-contacts.custom-fields.test.ts`; PATCH success/stale masking and identity `handle` masking in `src/routes/api/crm/contacts/contacts.test.ts`; gateway restricted cases in `src/routes/api/gateway/actions/contact-update.server.test.ts`.
- [x] T011 [US2] Part 1, masked-key update policy: `src/lib/pii.ts` registry and helpers; `updateContact`, `customFieldsMergeSql`, `customFieldsPatchSql` options, preservation SQL, phone handling, audit input and `handle` masking in `src/server/services/crm-contacts.service.ts`; option derivation in `src/routes/api/crm/contacts/[id]/+server.ts` and `src/routes/api/gateway/actions/contact-update/+server.ts`; existing `updateContact` and SQL-helper test callers per the table in `specs/129-crm-profile-followups/contracts/client-compatibility.md`. Checkpoint: `bun run check` and the T010 files pass.
- [x] T019 [US2] Part 2, create/party/merge/gateway/loader: `createContact` in `src/server/services/crm-contacts.service.ts`, `ensureContactFacetForParty` in `src/server/services/party.service.ts`, `mergeContacts` admission and refusal in `src/server/services/crm-cleanup.service.ts`; callers `src/routes/api/crm/contacts/+server.ts` (POST), `src/routes/api/crm/parties/+server.ts`, `src/routes/api/crm/cleanup/duplicates/+server.ts`; gateway 403 and sanitization; loader hint in `src/routes/(app)/crm/[contactId]/+page.server.ts`. Tests: `src/server/services/crm-cleanup.service.test.ts`, `src/server/services/party.service.test.ts`, `src/routes/api/crm/parties/server.test.ts`, new `src/routes/api/crm/cleanup/duplicates/server.test.ts`, and the remaining test callers. Checkpoint: `bun run check` and these files pass.
- [ ] T020 [US2] Part 3, client and fresh rows: `src/lib/components/crm/crm-merge.ts`, `src/lib/components/crm/CrmMergeResolver.svelte`, `src/lib/components/crm/CrmHygiene.svelte`, `src/routes/(app)/crm/customers/PageBody.svelte`, `src/routes/(app)/crm/[contactId]/PageBody.svelte`, GET `fresh=1` in `src/routes/api/crm/contacts/+server.ts`, GET no-store in `src/routes/api/crm/cleanup/duplicates/+server.ts`, per `specs/129-crm-profile-followups/contracts/client-compatibility.md` and `specs/129-crm-profile-followups/contracts/fresh-reconciliation.md`. New tests: `src/lib/components/crm/crm-merge.test.ts`, `src/lib/components/crm/CrmHygiene.merge.mounted.test.ts`, `src/routes/(app)/crm/customers/page.merge.mounted.test.ts`, `src/routes/(app)/crm/[contactId]/page.instagram.mounted.test.ts`. Checkpoint: the US2 ordinary command in implementation-inventory.md passes.
- [ ] T017 [US2] Create the qa-native fixture in `src/server/test-utils/crm-instagram-native-fixture.ts` and `src/server/test-utils/fixtures/crm-instagram-native.sql` per `specs/129-crm-profile-followups/contracts/native-fixture.md`, calling F7's `src/server/test-utils/operator-native-auth-fixture.ts` with the child owner client. Blocked until F7 tasks T003 and T005 (`specs/128-faces-receivables-audit/tasks.md`) have created and qualified that helper and it is in the candidate's Hub base; if absent, stop and record the block in `specs/129-crm-profile-followups/validation.md`.
- [ ] T021 [US2] Create `src/server/services/crm-instagram-fields.sql.integration.test.ts` with the nine behaviors in `specs/129-crm-profile-followups/quickstart.md`, including both lock-order races; register it in `scripts/qc/native-postgres-manifest.ts` and update `scripts/qc/native-postgres-manifest.test.ts` and `scripts/qc/native-postgres-report.test.ts`.
- [ ] T012 [US2] Run the whole qa-native lane and report, and the crm-concurrent lane and report, from `specs/129-crm-profile-followups/quickstart.md`; exercise reload, stale, denied, repeated save and account-switch cases; compare records and record results in `specs/129-crm-profile-followups/validation.md`.

## Phase 5 — Polish and qualification

- [x] T013 Add the message keys from `specs/129-crm-profile-followups/contracts/client-compatibility.md` and any reproduced US1 help to `messages/en.json` and `messages/es.json`, run `bun run i18n:compile`, and use semantic tokens and shared primitives in every changed UI; skip catalogs only if no label change is needed and record why.
- [ ] T014 Run full Hub check/test/build and the UI design/token gates from `package.json`; save candidate exit codes in `specs/129-crm-profile-followups/validation.md`.
- [ ] T015 Qualify the browser acceptance matrix through Browser Harness and real route-data outcomes; store synthetic screenshots and redaction assertions under `specs/129-crm-profile-followups/evidence/` and summarize in `specs/129-crm-profile-followups/validation.md`.
- [ ] T016 For the approved shipping slice, obtain owner merge/configuration approval for its diff, complete separately authorized release/runtime verification, and reconcile remaining work with `proposals/2026-11-16-faces-stock-cash-crm-meeting-followups.md`. Record open ends as an in-code `TODO(handoff)` plus a proposal entry, including the pre-existing customers-page `invalidate('crm:contacts')` URL issue and the API/SSR finance-denial difference in `specs/129-crm-profile-followups/contracts/fresh-reconciliation.md`.

## Dependencies

- T001–T005 block implementation.
- US1: T006 → T007 → T018 → T008 → T009.
- US2: T010 → T011 → T019 → T020 → T017 → T021 → T012. T019 also needs T018 (`lockContactsInOrg`). T017 also needs F7 tasks T003 and T005.
- T013–T016 apply to each approved shipping slice. US1 may go from T009 to its gates without US2; US2 goes from T012 to its own gates and cannot reuse a US1 result as its qualification.
- No task is marked [P]: shared files and fixtures have no independent owners yet.

## Implementation strategy

MVP is Story 1, which now includes the tag admission fix (T018). Story 2 remains required for the full request and ships only with its own evidence. T005, T009 and T012 cover authority; T013–T015 cover i18n, tokens, browser and persistence. Twenty-one unchecked tasks: setup 2, foundation 3, US1 5 (T006–T009, T018), US2 7 (T010–T012, T017, T019–T021), polish 4. IDs T017–T021 were appended to keep earlier IDs stable. Neither these tasks nor prerequisite success proves implementation or review.

## Implementation deviations (F8 implementer, 2026-11-17)

- Merge admission/create/party tests live in `src/server/services/simulated-record-mutations.test.ts` (PGlite) instead of crm-cleanup/party service test files.
- T020 partial: crm-merge.ts, resolver props, Hygiene + customers host latches, `fresh=1` GET, duplicates no-store, read-only masked fields in contact editor are implemented. NOT done: customers mounted test (`page.merge.mounted.test.ts`, DataTable virtualization in happy-dom hid the dialog), `page.instagram.mounted.test.ts`. Hygiene mounted test passes.
- T017/T021/T012 not done: blocked on F7 `installOperatorNativeAuthFixture`. T007/T008/T009/T014/T015/T016 not done (walkthrough, QA, full gates, owner actions).
