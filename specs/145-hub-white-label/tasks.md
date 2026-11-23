# Tasks: Organization names throughout Hub

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/branding.md, coverage.md.
**State**: Owner approved implementation and scoped release on 2026-11-22. Unchecked items remain planned work; completion requires the evidence named below.

## Phase 1: Setup

- [x] T001 Obtain owner approval for this data/security-tagged spec and record the decision in the top-level spec frontmatter.
- [x] T002 Create an isolated Hub implementation branch against the current registry PR base and reconcile coverage.md/source-evidence.json with the actual base; update plan.md for changed paths and access rules.

## Phase 2: Foundation — slice 1

- [x] T003 Add focused tests in `src/lib/branding.test.ts` using contracts/name-validation.md and name-fixtures.json for precedence, NFC/graphemes/bytes, suffix handling, 1/15/16 bounds, controls, emoji, invalid stored values and automatic long-name fallback (FR-001–004).
- [x] T004 Implement `src/lib/branding.ts` and request-owned `src/lib/branding.svelte.ts` without mutable server globals or browser storage (FR-001–004,008).
- [x] T005 Add `supabase/migrations/20261122000000_organization_hub_name.sql` with nullable column/constraints and pair with `scripts/qa/seed/tenancy.ts` and `scripts/qa/seed/matrix.ts`; verify migration against final QA schema and authenticated SQL roles (FR-007, data-model.md).
- [x] T006 Extend `src/server/services/tenant.service.ts` read projection; keep hub_name out of generic patch fields; route the existing tenant PATCH name/slug writer through the shared owner admission transaction using verified locals; add staff/foreign-owner automatic-brand bypass tests and native tests preventing staff/direct-owner/foreign-org writes to the new column (FR-007).
- [x] T007 Add guarded `src/server/services/organization-branding.service.ts`, new PATCH endpoint `src/routes/api/organizations/branding/+server.ts`, and service/route tests for owner/admin/current membership/capability, both role models, read-only simulation, locked concurrent revocation, revoked owner, foreign org, malformed/oversized JSON, exact existing tenant name/slug schema and 23505 rollback, zero-row update and write failure (FR-003,007; contracts/branding.md).

## Phase 3: US1 — shared identity delivery, slice 2 foundation

**Independent test**: Null-override Faces and second-org sessions have different first authenticated route-data/visible shell identity and settled switch behavior (approved SPA amendment in implementation-evidence.md).

- [x] T008 [US1] Extend `src/routes/(app)/+layout.server.ts` and `src/routes/+layout.server.ts` with request-owned verified branding; update frozen layout tests; cover public fallback, missing row/read failure marked readStatus:unavailable, unavailable fallback cannot clear refresh recovery, the approved JS-disabled SSR exception, one combined app identity/kind read and no root duplicate (FR-001,008,011).
- [x] T009 [US1] Add shared `src/lib/components/layout/HubWordmark.svelte` and wire Sidebar, Topbar, MinionLogo and PublicTaskShell; preserve fixed suffix and accessible names; remove uppercase transform from custom names (FR-002,009,012).
- [x] T010 [US1] Convert all other identity rows in coverage.md, including titles, badges, CRT preview, watermarks and welcome/onboarding text; neutralize personal-assistant wording; preserve explicitly excluded technical and service references (FR-009,010).
- [x] T011 [US1] Test actual org selector/logout/back invalidation and late read/save generation fencing in the mounted shell/editor; prove no A branding or draft reaches B (FR-008; SC-004).

## Phase 4: US2 — organization creation, slice 2

**Independent test**: Admin creates Faces and a long-name org with a short prefix; a retry preserves the created prefix.

- [x] T012 [US2] Extend `src/server/services/organization-provision.service.ts`, `src/server/services/organization-bootstrap.service.ts` and `src/routes/api/organizations/provision/+server.ts` with pre-effect validation and create-only branding persistence; update existing tests for retries and unique-slug races (FR-004,005).
- [x] T013 [US2] Extend `src/routes/(app)/settings/organizations/+page.svelte` with suggestion, edited-state preservation, counter, fixed-suffix preview and invalid-name feedback (FR-003–005,013).
- [x] T014 [US2] Exercise real QA creation/partial provisioning retry with existing mock transports; no external workforce/gateway changes during tests; preserve legal name and existing administrator gate (US2/AC1–5).

## Phase 5: US3 — shared owner editor, slice 2

**Independent test**: Owner saves and another member reloads; staff cannot save; failure preserves draft and committed identity.

- [x] T015 [US3] Add Appearance `+page.server.ts` owner projection and `src/lib/components/settings/OrganizationBranding.svelte`; wire existing Appearance page with shared-setting label, Save/busy/error/Retry/counter/preview and both reset choices (FR-006,007,013).
- [x] T016 [US3] Implement committed refresh through app:branding, per-org editor generation, draft retention and capability denial; test acknowledged refresh recovery reconciles original actionId and uncertain history stays unknown, delayed save/org switch/permission revocation (FR-006–008).
- [x] T017 [US3] Test explicit MINION, null automatic choice with long-name fallback, and full-name changes in automatic/custom modes; verify failed saves and next-reload propagation (US3/AC1–5).

## Phase 6: Cross-cutting qualification — slice 3

- [x] T018 Add EN/ES messages in `messages/en.json` and `messages/es.json`, parameterize existing Hub references and all five named translated call sites (including onboarding prefix and OAuth app interpolation) in coverage.md and run i18n:compile (FR-009,013).
- [x] T019 Register the new API and changed setting surface in rbac.service.test.ts, route-access-authority.test.ts and route-design-contracts.test.ts per implementation-files.md; retain existing route manifests as explicitly no-change; prove shell branding reads are available to members who cannot visit Settings (FR-007,013).
- [x] T020 Qualify actual wordmark layouts at 320/390/401/430/768/1280px, narrow expanded sidebar, 200% zoom, light/dark and EN/ES using browser-harness; use full boundary names and measured bounds; preserve icon-only accessible names (FR-012; SC-003).
- [x] T021 Verify keyboard/accessibility, form save/failure feedback, SSR/hydration and actual marketplace CSS watermark output; attach provenance-labelled screenshots (FR-009,012,013).
- [ ] T022 Run focused/native SQL tests, all tests, check, build under disposable QA env, design/token lints, bun run a11y, bun run a11y --all on QA, and current access-route gates; record exact results in implementation evidence (quickstart.md).
- [ ] T023 Reconcile and close coverage.md against final base and implementation; independently review Standards and Spec; document discovered defects through exact-site TODO(handoff) and matching proposal before stopping (SC-001–005).
- [ ] T024 Deliver slice PRs against registry base; human merge; verify CI, branch deployment, then authorized runtime separately. Keep all release states truthful; do not report live from local tests (plan: release).

## Dependencies and parallel opportunities

T001 → T002 → T003–T007. Then T008 precedes wordmark consumers and owner refresh; T012–T014 and T015–T017 can be developed independently after the shared validator/service. T018 accompanies the corresponding UI work; T019 accompanies the endpoint/editor. T020–T024 follow all consumer/editor/create changes. T008/T009 and their dependency/SSR/refresh tests belong to slice 2 and must precede T015/T016. T010, T011 and remaining consumer qualification complete slice 3. Group PRs by those three slices, not the documentation phase order; full product acceptance waits for all slices.

After foundation, creation form work and owner editor work can run in parallel because their files differ; shared messages must have one editor at a time. Reviewers may read separate artifacts concurrently. Parallelism is an option, not authorization to change another agent's files or shared checkout.

## Implementation strategy

Deliver additive data/guarded-service slice first; request-owned layout delivery and shared shell wordmark before owner/create editor in slice 2; then remaining consumer conversions and qualification in slice 3. Keep legacy UI compatible while the new column is unused. Do not deploy a partial wordmark conversion as feature completion. Follow quickstart.md for explicit test/runtime evidence and rollback.

Qualification checkpoint: T008/T021 use the explicitly documented SPA architecture exception; they do not claim JavaScript-disabled HTML branding. T014 is now backed by3native partial-retry cases with only outbound transports mocked. T022–T024 remain open until final exact-head pipeline/hosted CI, inventory hash closure and deployment/runtime completion.
