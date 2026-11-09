# Tasks: Durable Minion design system

Input: spec.md, plan.md, research.md, data-model.md, contracts/ui.md. Paths prefixed meta/Hub/Site name independent clean clones. No source implementation begins before T003.

## Setup and review

- [x] T001 Fetch and isolate repositories; record base SHAs in spec.md and revalidation evidence/.
- [x] T002 Produce spec.md, plan.md, research.md, data-model.md, contracts/ui.md and quickstart.md with Spec Kit.
- [x] T003 Complete two independent spec/plan/tasks review passes in analysis.md and review sidecar; resolve all blocking findings.

## US1 — Foundations (I01, I02)

- [x] T004 [P] [US1] Extend meta/packages/design-tokens/contract.json and schema/test matrix; repair only failing token pairs; regenerate tokens.css. — evidence: evidence/foundations-implementation.md; contract 1.1.0, 270 pairs; tokens tests 15/15; evidence/design-browser-contrast.json (270/270 ≥4.5)
- [x] T005 [US1] Make coarse-pointer targets intrinsic in meta/packages/ui/src/lib Button/IconButton/Input/Select/Textarea/Toggle/Checkbox/Radio controls and add behavioral coverage. — evidence: evidence/foundations-implementation.md; control-targets.test.ts; evidence/browser/controls-targets.json (radio label 44×44 coarse after pack h3bfd6bda)
- [x] T006 [P] [US1] Remove duplicate typography and broad decorative selectors in Hub/src/app.css; use stable hooks and negative isolation fixture. — evidence: hub src/app.css; tests/fixtures/design-durability (negative native control); evidence/review-components-root.md
- [x] T007 [US1] Update meta token/UI README and canonical governance documentation with generated inventory, one-owner rules and maturity/deprecation policy. — evidence: packages/design-tokens/README.md, inventory.json; .claude/skills/ui-design-governance/SKILL.md durable-qualification section

## US2 — Safe customization (I03, I04)

- [x] T008 [P] [US2] Normalize versioned/unknown layouts in Hub/src/lib/components/dashboard/editable-grid.ts, data-view/card-fields.ts and inbox/daily-cards.ts; add malformed/catalog regression tests. — evidence: evidence/layouts-implementation.md; layouts suites 124/124 + 98/99→fixed; evidence/review-components-root.md
- [x] T009 [US2] Scope/reset preferences in Hub card-fields.svelte.ts, view-pref.svelte.ts, calendar-prefs.svelte.ts and EditableGrid.svelte; test identity rotation and storage denial. — evidence: evidence/layouts-implementation.md (scoped preferences, storage denial tests)
- [x] T010 [US2] Validate Hub/routes/api/dashboard-layouts/[id]/+server.ts and cache; capture save snapshots; expose truthful preference sync/local-only outcomes in daily page. — evidence: evidence/layouts-implementation.md (GET validation, Use saved layout, preference reconciliation 6/6)
- [x] T011 [US2] Add keyboard move/resize/reset/announcement and DOM-aligned flow to Hub EditableGrid.svelte and FieldsList.svelte; test locked/dependent/compact cases. — evidence: evidence/layouts-implementation.md (EditableGrid keyboard + FieldsList ordering); browser matrix dashboard keyboard cell

## US3 — Honest edits and recovery (I05)

- [x] T012 [P] [US3] Extend Hub/src/lib/records save-status/autosave/feedback with existing mutation outcome contract and immutable scope/revision; inventory every caller in evidence/autosave-callers.md and migrate the six named hosts in spec review amendments; test no replay/read-only retry/late results plus actual host scope switch and refresh failure. — evidence: evidence/autosave-callers.md; evidence/review-outcomes.md (dispatch-time token fix + regression); records/config suites
- [x] T013 [US3] Add atomic expected-version admission to Hub stock/items and scheduling/event-types handlers/services; update every direct caller; test conflicts and monotonically advancing version using native local PostgreSQL competing writers/resource-link rollback, including alternate writer token invalidation. — evidence: stock/event-type PATCH server tests; design-durability.sql.integration.test.ts 5/5 (native PostgreSQL)
- [x] T014 [US3] Wire explicit dirty state into inventoried custom-control dialogs; preserve busy/failure/focus; extend Hub dialog-dirty-harness.svelte with a real custom control and baseline/clean/search assertions. — evidence: evidence/dialog-dirty-inventory.md; dialog-dirty-guard.mounted.test.ts; Picker.dom.test.ts 9/9

## US4 — Capabilities and recipes (I06, I07)

- [x] T015 [US4] Add typed logical activation, localized record labels, sort and keyboard resize semantics to Hub DataTable.svelte; remove Picker.svelte DOM activation coupling and extend mounted tests. — evidence: DataTable/Picker changes; evidence/review-components-root.md; sort rank announced via sr-only header text
- [x] T016 [US4] Require nonempty DataView catalogs in Hub data-view.ts/DataView.svelte and verify explicit preset precedence matrix. — evidence: data-view.ts/DataView.svelte nonempty catalog + precedence tests
- [x] T017 [P] [US4] Preserve helper+error IDs in both meta/packages/ui/src/lib/FormField.svelte and Hub/src/lib/components/ui/foundations/FormField.svelte; add canonical Hub foundations ErrorSummary, update actual Hub form consumers and test focus/navigation. — evidence: packages/ui FormField + Hub FormField/ErrorSummary; error-summary.mounted.test.ts; follow-up: describedby order (proposal ledger)
- [x] T018 [US4] Migrate audited native destructive confirms in Hub SecretsSection/DynamicSecretGroup/ChannelsTab to ConfirmDialog; close Sidebar/TimeOffCalendar/newContact name/error residuals with localization. — evidence: audits handover evidence/design-t018-review-final.md PASS; secrets-recovery.mounted.test.ts 6/6; root recovery 3 files/10 tests
- [x] T019 [US4] Add installed-component recipes/fixtures under Hub/tests/fixtures/design-durability for collection/calendar/board/gallery/detail/form/dashboard/workspace; document placement/scroll/state ownership and expand capture state contract. — evidence: hub tests/fixtures/design-durability/README.md + recipes; fixture build log; evidence/browser/matrix.md

## US5 — Qualification and enforcement (I01, I08)

- [x] T020 [P] [US5] Make Hub/scripts/design-lint.mjs fail closed on unavailable base and cover governed changed files; add negative tests. — evidence: hub scripts/design-lint.mjs (fail closed + merge-base fork point) + design-lint.test.ts 3/3
- [x] T021 [P] [US5] Add Site/scripts/design-lint.mjs per-file ratchet and correct CI base; test debt transfer/missing-ref failures while preserving installed-token gates. — evidence: site scripts/design-lint.mjs per-file ratchet (+ merge-base) + design-lint.test.mjs 5/5; CI exact base
- [x] T022 [US5] Build and pack immutable meta design-token/UI archives with source/member hashes, integrate both consumer deps/package.json/bun.lock and generate qualification manifest. — evidence: scripts/pack-design-system.mjs; receipt /tmp/…-targets/design-system-provenance.json (sha f5399651…); hub 23/23, site 17/17+4/4, site-release 17/17+4/4 artifact/token tests
- [x] T023 [US5] Run mandatory repository gates, negative fixtures, full relevant suites/builds and actual-browser recipe matrix; write evidence/verification.md. — evidence: evidence/verification.md; evidence/browser/matrix.md (+appendix), remeasure-after-fixes.json
- [x] T024 [US5] Obtain independent code review, resolve findings and rerun affected gates; write evidence/review.md. — evidence: evidence/review.md (three independent reviews, all findings dispositioned)

## Release and convergence

- [x] T025 Commit scoped changes, open PRs against registry bases, pass CI and merge under owner authorization; record PR/SHA receipts in evidence/deployment.md. — evidence: evidence/deployment.md — hub #545, meta #813, site #34 merged after CI; Version Packages #815 left to the owner
- [x] T026 Promote scoped meta/Site changes to release branches; verify production aliases/source versions and read-only locale/affected UI smoke receipts in evidence/deployment.md. — evidence: evidence/deployment.md — meta #814 → main, site #35 → master; production aliases + EN/ES smoke verified
- [x] T027 Reconcile every audit ID and historical disposition in evidence/finding-ledger.json; update proposal/spec status and Lavish report with actual implementation/deployment evidence. — evidence: evidence/finding-ledger.json (30 IDs + 18 dispositions with deployment fields); proposal/spec status updated; Lavish report updated

## Dependencies and parallelism

T001–T003 gate all source changes. T004/T005/T007 and T008–T011 and T012–T014/T017 can run by separate owners; root T006/T020 and recipe work use disjoint paths. T015/T016 follow layout worker's first sub-slice; T018 coordinated with outcome worker. T022 waits for all shared UI/token edits. T023 waits for code and package integration. T024 follows qualification; T025–T027 sequential. Messages are merged by root from worker patch files. A task is checked only when its proof exists; a blocked/deferred task stays open and receives the required ledger.

## Phase 1: Convergence

- [ ] T028 Align `aria-describedby` order (error before helper) with DOM order in both `packages/ui/src/lib/FormField.svelte` and Hub `foundations/FormField.svelte` in the next design-system pack (the shared copy is inside the qualified immutable UI archive; changing it now re-opens consumer qualification) per FR-007 (partial)
- [ ] T029 Scope the coarse-pointer checkbox/radio label `display` rule to its `data-part` hook so a consumer `.block` utility cannot override it (target size already holds at 44×44) in `packages/design-tokens/utilities.css` in the next pack per FR-002 (partial)
