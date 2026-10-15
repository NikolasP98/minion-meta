# Tasks: Sellable card view — aligned, populated, configurable

**Input**: Design documents from `specs/102-retro-sellable-card-view/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md
**Tests**: Included — spec does not explicitly request them, but Principle IV/the open-items
ledger rule treats new non-trivial logic (the field merge/move logic, the stock-parity fold)
as needing at least one test; see T006 and T011.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Confirm `minion_hub`'s registered PR base via `node scripts/repo-policy.mjs show hub` and create an isolated worktree off it for `feat/sellable-card-view` (Principle III)
- [ ] T002 [P] Take the AS-IS evidence anchors flagged in plan.md's open-items ledger: file:line for the current gallery card markup (`src/routes/(app)/pos/sell/+page.svelte`) and board card markup (`src/routes/(app)/pos/catalog/+page.svelte`), plus one screenshot of each surface's present misalignment

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared field model and card body every story needs

**⚠️ CRITICAL**: US1/US2/US3 all render through the one component built here

- [ ] T003 [P] Define the field catalog in `src/lib/pos/sellable-card-fields.ts`: keys, Paraglide label thunks, and the single `stockTone` rule (moved out of the till's private helper so both surfaces read stock the same way — data-model.md `CardField`)
- [ ] T004 [P] Implement pure field-layout logic in `src/lib/components/data-view/card-fields.ts`: `mergeFieldLayout`, `moveField`, `visibleFields` per data-model.md's merge rule
- [ ] T005 [US3] Implement the per-viewer reactive wrapper `src/lib/components/data-view/card-fields.svelte.ts` (`createCardFields`) — localStorage read/write wrapped in try/catch, keyed `cards:<surfaceNamespace>` (depends on T004)
- [ ] T006 [P] Unit tests for T004's merge/move logic in `src/lib/components/data-view/card-fields.test.ts`: catalog-order default, stored-order-survives-a-removed-key, new-catalog-key-appends, move-into-slot, move-to-unknown-target-is-noop
- [ ] T007 [US1][US2] Build the shared card body `src/lib/components/pos/SellableCard.svelte`: title row + one row per visible field, each field's empty-check per FR-005 ("—" placeholder), `hideEmpty` prop for the board per Clarify Q3's deferred-not-decided split
- [ ] T008 [US3] Build `src/lib/components/pos/CardFieldsMenu.svelte`: popover wrapping the existing `FieldsList` toggle/drag component, bound to one `CardFields` instance

**Checkpoint**: `SellableCard` + field-preference plumbing exist and are unit-tested; no surface wired yet

---

## Phase 3: User Story 1 — Cards align top-left in a band (Priority: P1) 🎯 MVP

**Goal**: Replace each surface's private card markup with `SellableCard` inside a subgrid so rows line up

**Independent Test**: Load each surface with mixed name lengths and tracked/untracked items; every band's rows line up and content starts at the top (spec Acceptance Scenarios US1-1..3)

- [ ] T009 [US1] Wire `SellableCard` into the gallery card slot in `src/routes/(app)/pos/sell/+page.svelte`; declare `--sc-rows` on the band container from `1 + visibleFields.length`
- [ ] T010 [US1] Add the subgrid CSS to the gallery's `.grid .card` rule: `display: grid; grid-template-rows: subgrid; grid-row: span var(--sc-rows, 1); align-content: start`, and make the Button's inner span `display: contents` so SellableCard's rows become the grid's items — **explicitly verify the Button primitive's own `justify-content`/`align-items` centering does not leak into the new grid axes** (this is the exact defect #538 later fixed; call it out here so it is caught before merge, not after)
- [ ] T011 [US1] Wire `SellableCard` into the board card slot in `src/routes/(app)/pos/catalog/+page.svelte` (`hideEmpty` on), remove the board's now-dead private `.bname/.bmeta/.bbadges` CSS
- [ ] T012 [US1] Manual verification pass on both surfaces at the narrowest single-column breakpoint (Acceptance Scenario US1-3) — record result in the PR body's "Not yet" section if a real device/tenant check is unavailable

**Checkpoint**: Both surfaces render through one component and visually align; US2 (data correctness) not yet proven

---

## Phase 4: User Story 2 — Price/stock/type always match across surfaces (Priority: P1)

**Goal**: Till and catalog show identical price/stock/type for the same item, including bundles

**Independent Test**: Pick a bundle/package sellable; compare its card on the till vs. the catalog (spec Acceptance Scenarios US2-1..3)

- [ ] T013 [US2] Identify the catalog board's existing bundle-stock aggregation function (likely `aggregateBundles` in the catalog route's server/service layer) as the single source of truth
- [ ] T014 [US2] Fold the till's `+page.server.ts` sellables load through that same aggregation function before sending `PageData.sellables` to the page — **this is the exact gap #538 later fixed (till read the raw pre-aggregation value); task exists so it is caught in Slice A's review, not in a same-day follow-up fix**
- [ ] T015 [P] [US2] Add/confirm a visible type badge (kind) on `SellableCard` reusing the catalog table's existing kind→label/tone mapping (FR-004)
- [ ] T016 [US2] Cross-surface parity check: for every sellable kind (product, service, bundle with stock, bundle without), assert till card value === catalog card value for price, stock, type — add as a route-level test or, if no such harness exists for this pair of routes, document as a manual QA script in the PR body

**Checkpoint**: US1 + US2 together are the shippable MVP (Slice A) — matches the actual #537 scope

---

## Phase 5: User Story 3 — Per-viewer configurable fields (Priority: P2)

**Goal**: A viewer can choose which fields render, per surface, and the choice sticks

**Independent Test**: Toggle/reorder in `CardFieldsMenu`, reload, confirm persistence; confirm a second browser profile is unaffected (spec Acceptance Scenarios US3-1..3)

- [ ] T017 [US3] Mount `CardFieldsMenu` in the gallery's view-tools segment, backed by `createCardFields('pos-sell-gallery', ...)` with defaults: price, stock, type visible
- [ ] T018 [US3] Mount `CardFieldsMenu` in the board's view-tools segment, backed by `createCardFields('pos-catalog-board', ...)` with defaults: price, type, stock, code, tags visible
- [ ] T019 [US3] Add the two new strings (`card_fields_configure`, any new empty-state label) to `messages/en.json` + `messages/es.json` and run `i18n:compile` (Principle IV)
- [ ] T020 [US3] Verify FR-009 by hand: simulate a stored preference referencing a retired key and confirm it's dropped without error, and a brand-new catalog key appears for an existing stored preference

**Checkpoint**: All three user stories independently functional — matches the actual #537+#538 combined scope

---

## Phase 6: Polish & Gates

- [ ] T021 [P] Run `bun run check`, `bun run test` (data-view + pos routes + catalog + routes + tables), `lint:design:ci`, `lint:tokens`, prettier — all must be clean/non-regressive before PR (Principle IV)
- [ ] T022 Resolve Clarify Q3 (empty-field placeholder vs. skip) explicitly in the PR body if the two surfaces end up with different behavior (gallery keeps all rows, board skips empty ones) — log the asymmetry in `proposals/` per the open-items ledger if left unresolved rather than intentionally decided
- [ ] T023 Update plan.md's Constitution Check "PARTIAL — FLAGGED" row to PASS once T002's AS-IS anchors exist, or carry the gap into the PR body per Principle I's hotfix carve-out

---

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T008) blocks all stories
- US1 (T009–T012) and US2 (T013–T016) both depend on Foundational and touch the same two
  files (`pos/sell/+page.svelte`, `pos/catalog/+page.svelte`) — **not safely parallel**
  despite being different priorities-of-equal-rank; sequence US1 then US2 per file, or pair
  them into one PR (this is what actually shipped as #537: US1+US2 together, Slice A)
- US3 (T017–T020) depends on Foundational only (T005, T008) and is additive (new menu, new
  storage key) — could ship as a second PR (Slice B) without re-touching US1/US2's CSS, but
  in practice shares the same two route files, so sequencing after US1/US2 avoids merge
  conflicts even though it is not a hard dependency
- Polish (T021–T023) after whichever stories are included in a given PR

### Parallel opportunities

- T003, T004 (different new files, no shared state)
- T006 (tests) parallel with T007/T008 once T004 lands
- T015 parallel with T014 (different files: component vs. server load)

## Implementation Strategy

**Slice A (MVP, matches shipped #537's actual scope)**: Setup → Foundational → US1 → US2 →
Polish. Ship as one PR; this is the point at which T010's explicit Button-centering check
and T014's explicit till-aggregation task are meant to catch what the real #538 fix later
had to patch same-day.

**Slice B**: US3 on top of Slice A's merged state, own PR, own gate run.
