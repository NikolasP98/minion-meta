# Tasks: Design-system baseline and conformance

Input: spec.md, plan.md. Streams A–D run in parallel in isolated hub worktrees; the coordinator owns setup, integration, gates, review, merge and deployment. A task is checked only when its proof exists.

## Setup

- [ ] T001 Create four hub worktrees from `origin/master` with real `bun install`; branches `feat/db-baseline-density`, `feat/db-normalise`, `feat/db-archetypes`, `feat/db-states-content`.
- [ ] T002 Write research.md (anchors from 012 evidence and the AS-IS counts) and contracts/ui.md addendum (baseline, density, archetype, action-scope, collection-state, content contracts).

## Stream A — Baseline and density (US1, US2; FR-001, FR-002)

- [ ] T003 [A] Add the un-layered role-based coarse-pointer baseline in `src/app.css` consuming `--active-control-min-height` under `(pointer: coarse), (max-width: 767.98px)` outside `[data-dense]`; mark DataTable body, icon-tool clusters and telemetry dense through their primitives; enumerate remaining `min-height:0`/`min-h-*` escapes.
- [ ] T004 [A] Drive the existing `AppViewport` density (`compact` = today, default) and the DataTable density mapping (compact→normal, comfortable→comfortable) from the preference; prove compact is byte-identical to today's computed sizes.
- [ ] T005 [A] Add the density preference (scoped local + `/api/me/preferences/density` section in `VALID_SECTIONS`) and the `/settings/appearance` control; mounted tests for round-trip and computed heights.
- [ ] T006 [A] Recipe fixture: expose density and pointer state; measure the controls, collection and board recipes at 390 px coarse and 1440 px both densities; record `evidence/browser/baseline.json`.

## Stream B — Normalisation (US3 support; FR-003, FR-008)

- [ ] T007 [B] Bring every lint rule under its ceiling first (exact equivalents + reason-coded exceptions), then replace raw control heights with `--control-height-*` tokens (non-equivalents listed), lower the baseline, add the `raw-control-height` key, make `lint:design:ci` strict with a negative test.
- [ ] T008 [B] Replace raw icon literals with `iconSizes` (13→14, 11→12, 15→16, 10→telemetry exception or 12); ceiling ≤ 50.
- [ ] T009 [B] Replace raw shadows, numeric z-index, raw colours, raw motion and raw type sizes outside third-party surfaces with tokens; lower the global ceilings to the new counts; reason-code the remainder.
- [ ] T010 [B] Visual before/after on three toolbars and one dark theme via the recipe fixture; `lint:design` receipts.

## Stream C — Archetypes, placement, collapse (US3, US5, US6; FR-004, FR-006, FR-007)

- [ ] T011 [C] Add a generic layout-aware `archetype-composition.test.ts` over the existing `route-design-manifest.ts` (reconcile PageShell's enum; `KNOWN_NONCONFORMING` with reasons; seeded-violation negative test); no second registry.
- [ ] T012 [C] PageHeader dominant-action contract (one primary action; secondary into the overflow) and action-scope declarations on the pilot pages `/stock`, `/crm`, `/scheduling/calendar`.
- [ ] T013 [C] Narrow-width collapse on the collection pilots: index sidebar → parent route, filter bar → Sheet, context panel → step; 390/320 px overflow 0 with every control reachable (fixture or mounted measurement).
- [ ] T014 [C] Governance skill addendum: archetype manifest rule, action-scope table, collapse-by-purpose rule.

## Stream D — States and content (US4, US7; FR-005, FR-009)

- [ ] T015 [D] `CollectionState.svelte` beside the headless DataView (nine states, read-only retry, one EmptyState, no second global spinner); mounted matrix test.
- [ ] T016 [D] Migrate three collection pilots to the wrapper states (`/stock/items`, `/crm`, `/scheduling/event-types` or equivalents).
- [ ] T017 [D] Content contract: `verb_*` glossary in both catalogs consumed by pilots; `scripts/qc/content-contract.test.ts` = all-keys divergence check + per-file formatter-bypass ratchet with committed decrease-only baseline.

## Integration and release (FR-010, FR-011)

- [ ] T018 Coordinator: per PR run `check`, `lint:design`, `lint:tokens`, `build`, affected tests; independent review; merge order B → A → C → D with rebases.
- [ ] T019 Production verification per merge (alias, SHA, EN/ES smoke, served-CSS marker) in evidence/deployment.md; site ceiling-parity PR.
- [ ] T020 evidence/verification.md, review.md, finding ledger addendum; spec/proposal status; converge.

## Dependencies and parallelism

T001 → all streams. A, B, C, D are disjoint by ownership (plan.md table). T018 waits for each stream's PR; B merges first. T019/T020 sequential after merges.
