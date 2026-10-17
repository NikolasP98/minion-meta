# Tasks: Design-system baseline and conformance

Input: spec.md, plan.md. Streams A–D run in parallel in isolated hub worktrees; the coordinator owns setup, integration, gates, review, merge and deployment. A task is checked only when its proof exists.

## Setup

- [x] T001 Create four hub worktrees from `origin/master` with real `bun install`; branches `feat/db-baseline-density`, `feat/db-normalise`, `feat/db-archetypes`, `feat/db-states-content`. — evidence: four worktrees hub-A..D from 48976586 with real bun install
- [x] T002 Write research.md (anchors from 012 evidence and the AS-IS counts) and contracts/ui.md addendum (baseline, density, archetype, action-scope, collection-state, content contracts). — evidence: research.md, contracts/ui.md (amended after analysis)

## Stream A — Baseline and density (US1, US2; FR-001, FR-002)

- [x] T003 [A] Add the un-layered role-based coarse-pointer baseline in `src/app.css` consuming `--active-control-min-height` under `(pointer: coarse), (max-width: 767.98px)` outside `[data-dense]`; mark DataTable body, icon-tool clusters and telemetry dense through their primitives; enumerate remaining `min-height:0`/`min-h-*` escapes. — evidence: PR #547 app.css un-layered baseline; baseline-targets.json (0 unmarked sub-44)
- [x] T004 [A] Drive the existing `AppViewport` density (`compact` = today, default) and the DataTable density mapping (compact→normal, comfortable→comfortable) from the preference; prove compact is byte-identical to today's computed sizes. — evidence: PR #547 AppViewport density from SSR pref; DataTable mapping; compact byte-identical
- [x] T005 [A] Add the density preference (scoped local + `/api/me/preferences/density` section in `VALID_SECTIONS`) and the `/settings/appearance` control; mounted tests for round-trip and computed heights. — evidence: PR #547 density.svelte.ts + section + DensitySettings; 13 tests
- [x] T006 [A] Recipe fixture: expose density and pointer state; measure the controls, collection and board recipes at 390 px coarse and 1440 px both densities; record `evidence/browser/baseline.json`. — evidence: evidence/browser/baseline.json

## Stream B — Normalisation (US3 support; FR-003, FR-008)

- [x] T007 [B] Bring every lint rule under its ceiling first (exact equivalents + reason-coded exceptions), then replace raw control heights with `--control-height-*` tokens (non-equivalents listed), lower the baseline, add the `raw-control-height` key, make `lint:design:ci` strict with a negative test. — evidence: PR #548 heights 302→190, ceilings governed, strict CI gate + negative test
- [x] T008 [B] Replace raw icon literals with `iconSizes` (13→14, 11→12, 15→16, 10→telemetry exception or 12); ceiling ≤ 50. — evidence: PR #548 icon codemod 1051→92
- [x] T009 [B] Replace raw shadows, numeric z-index, raw colours, raw motion and raw type sizes outside third-party surfaces with tokens; lower the global ceilings to the new counts; reason-code the remainder. — evidence: PR #548 shadows/layers/colours/motion/type governed 1/0/0/0/1
- [x] T010 [B] Visual before/after on three toolbars and one dark theme via the recipe fixture; `lint:design` receipts. — evidence: evidence/browser/normalise/visual-diff.json

## Stream C — Archetypes, placement, collapse (US3, US5, US6; FR-004, FR-006, FR-007)

- [x] T011 [C] Add a generic layout-aware `archetype-composition.test.ts` over the existing `route-design-manifest.ts` (reconcile PageShell's enum; `KNOWN_NONCONFORMING` with reasons; seeded-violation negative test); no second registry. — evidence: PR #549 archetype-composition.test.ts over route-design-manifest (137 screens, 91/46)
- [x] T012 [C] PageHeader dominant-action contract (one primary action; secondary into the overflow) and action-scope declarations on the pilot pages `/stock`, `/crm`, `/scheduling/calendar`. — evidence: PR #549 PageHeader one-primary + action-scope markers
- [x] T013 [C] Narrow-width collapse on the collection pilots: index sidebar → parent route, filter bar → Sheet, context panel → step; 390/320 px overflow 0 with every control reachable (fixture or mounted measurement). — evidence: PR #549 CollapsibleFilters + SectionNav collapse (pixel proof pending — follow-up)
- [x] T014 [C] Governance skill addendum: archetype manifest rule, action-scope table, collapse-by-purpose rule. — evidence: governance SKILL.md addendum (meta)

## Stream D — States and content (US4, US7; FR-005, FR-009)

- [x] T015 [D] `CollectionState.svelte` beside the headless DataView (nine states, read-only retry, one EmptyState, no second global spinner); mounted matrix test. — evidence: PR #546 CollectionState 9 states, 11 cases
- [x] T016 [D] Migrate three collection pilots to the wrapper states (`/stock/items`, `/crm`, `/scheduling/event-types` or equivalents). — evidence: PR #546 crm/customers, stock/items, event-types
- [x] T017 [D] Content contract: `verb_*` glossary in both catalogs consumed by pilots; `scripts/qc/content-contract.test.ts` = all-keys divergence check + per-file formatter-bypass ratchet with committed decrease-only baseline. — evidence: PR #546 verbs + content-contract ratchet

## Integration and release (FR-010, FR-011)

- [x] T018 Coordinator: per PR run `check`, `lint:design`, `lint:tokens`, `build`, affected tests; independent review; merge order B → A → C → D with rebases. — evidence: evidence/verification.md, review.md
- [x] T019 Production verification per merge (alias, SHA, EN/ES smoke, served-CSS marker) in evidence/deployment.md; site ceiling-parity PR. — evidence: evidence/deployment.md (B, A, D, C live; site parity no-op)
- [x] T020 evidence/verification.md, review.md, finding ledger addendum; spec/proposal status; converge. — evidence: this file; spec shipped; proposal done

## Dependencies and parallelism

T001 → all streams. A, B, C, D are disjoint by ownership (plan.md table). T018 waits for each stream's PR; B merges first. T019/T020 sequential after merges.

## Phase 1: Convergence (coordinator, 2026-10-17)

- [ ] T021 Measure the collection-pilot collapse at 390/320 px in a real browser (document overflow 0, every control reachable) per FR-006 (partial)
- [ ] T022 Decide and apply the comfortable-density desktop consumers beyond DataTable rows (menus, toolbars, fields) per FR-001 (partial)
- [ ] T023 Close the raw-control-height (190 → ≤ 30) and raw-icon-size (92 → ≤ 50) gaps listed in PR #548 as design decisions (20/22/40 px growth, `ui/**` literals) per SC-004 (partial)
- [ ] T024 Work the 46 `KNOWN_NONCONFORMING` pages down with reasons re-verified by rendering per FR-004 (partial)
