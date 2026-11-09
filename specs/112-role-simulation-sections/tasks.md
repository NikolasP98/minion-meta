# Tasks: organization role simulation and contextual section access

Branch: `feat/112-role-simulation-section-access`. Implementation tree: `/home/nikolas/.cache/codex-work/hub-role-simulation-20261108`. All Hub paths below are relative to that tree. Dependencies: T001 before production edits; authority before UI integration; persistence before editor acceptance. Parallel work owns disjoint files and preserves others' changes.

## Planning admission

- [x] T000 Verify registry/base, preserve shared WIP, install locked Bun dependencies in isolated feature checkout.
- [x] T001 Complete EGM feature/technical review, resolve findings, record scope and SpecKit checklist prerequisites in meta `specs/112-role-simulation-sections/`.

## Effective authority and session state

- [x] T002 Add red tests for single-role replacement, containment including scope/field/page rules, exact actor/org matching and stale generation in `src/server/auth/effective-authority.test.ts` and `src/server/services/role-simulation.service.test.ts`.
- [x] T003 Create shared `src/lib/role-simulation.ts`, effective authority ALS and durable server session service; modify verified claims identity/locals and `src/hooks.server.ts` before guards.
- [x] T004 Add session/audit migration in `supabase/migrations/`, Drizzle audit fields and transaction GUC metadata; pair with `scripts/qa/seed` contract coverage.
- [x] T005 Modify canonical RBAC fresh/cached resolvers, rank and actor-specific fresh consumers/workflow; block unsupported gateway/assistant/Workforce delegation and credentials.
- [x] T006 Create strict `/api/me/role-simulation` and bounded `simulation-navigation.ts`, native/alias/no-pages regression coverage, role-state layout projection/cache isolation.

## Simulation UI

- [x] T007 [P] Create single-screen `RoleSimulationDialog.svelte`, four-edge `SimulationFrame.svelte`; modify `ProfileMenu.svelte` and app layout with avatar-only Finish, actual-actor semantics, a11y/i18n.
- [x] T008 [P] Add browser generation admission, safe transition/pending-action integration, cross-tab reload and query/gateway retirement. Update layout fixtures and mounted interaction tests.

## Contextual section access

- [x] T009 [P] Create stable target contract `src/lib/nav/section-access.ts` and transactional `section-access.service.ts`, immutable owner, revision conflicts, live target checks and atomic audit; tests first.
- [x] T010 [P] Create `/api/nav/access`; route legacy `/api/roles/overrides` writes through shared validation/conflict/audit path and update Settings caller revisions. Test legacy forged owner and cross-editor conflicts.
- [x] T011 [P] Create shared `SectionAccessDialog.svelte`/`SectionAccessButton.svelte`; independent effective users:manage, inherited/explicit/deny semantics, reviewed Apply, retain draft on failure.
- [x] T012 [P] Wire `NavContextMenu.svelte`, visible More, personal sidebar/home/card and `PageHeader.svelte` section/page access context; keyboard/touch equivalents and focus.

## Qualification and delivery

- [x] T013 Compile en/es localization; run focused security, route, mounted UI and migration/seed tests against exact candidate.
- [x] T014 Run `bun run check`, `bun run test`, `bun run build`, `bun run lint:design`, `bun run lint:tokens`, route contracts and `qa:check-pairing`; record failures accurately.
- [x] T015 Exercise real authenticated loopback QA with browser-harness, direct API/document/route-data tests across two orgs, restricted role, users:manage without settings:manage, zero pages, all four frame edges and contextual access; preserve screenshots/evidence.
- [x] T016 Independent Standards and Spec review; resolve defects and rerun affected checks.
- [x] T017 Scope commits, open draft Hub PR to master with reviewable evidence; update meta spec/proposal status and open-items ledger for any material limitation. Human merge/deploy remain pending.

Qualification checkpoint: final signed Hub commit `91baf240` (production implementation `2f1fa81b`; later delta is a native test fixture). [Receipts](evidence/implementation/qualification.json) record local type checking with 0 errors/warnings, 9,273 tests plus 3 architecture checks, full production build/boundary/canary, native/seed/browser acceptance, and the 8-case principal fixture follow-up. [Final CI](evidence/implementation/ci-final.json) confirms all 17 check runs and Vercel commit status succeeded on the exact final Hub SHA. Source and evidence are published in [Hub #646](https://github.com/NikolasP98/minion_hub/pull/646) and [meta #974](https://github.com/NikolasP98/minion-meta/pull/974). Implementation delivery is complete; human merge and production release remain pending.

UI follow-up (2026-11-09): [QA switching separation](evidence/implementation/qa-controls-followup/README.md) moves actual QA sign-ins to DEV and preserves the avatar as the single simulation entry/exit. Signed Hub `8cf5dc35` has local component/type/style and actual Owner → Staff frame/Finish proof. Fresh CI is pending; earlier final CI receipts remain historical.
