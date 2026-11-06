# Tasks: Spec Index / Spec Kit Directory Bridge

**Input**: Design documents from `specs/008-spec-index-speckit-bridge/` (spec.md, plan.md,
research.md, data-model.md, quickstart.md)

**Tests**: Included — the feature description and FR-012 explicitly require
`scripts/spec-index.test.mjs` fixture coverage; this is not an optional add-on for this
feature.

**Organization**: Grouped by user story (spec.md's US1-US4), per plan.md's DELTA table
(D1-D8). US1 and US2 share almost all of their code (the widened scan loop and
duplicate-id detection are one change — research.md Decision 1), so their tasks are
interleaved in Phase 3 rather than artificially split; each is still independently testable
via its own fixtures (FR-012a vs FR-012b-d).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared-file dependency on an
  uncommitted earlier task in this list)
- **[Story]**: US1, US2, US3, US4 (spec.md priorities P1, P1, P2, P2 respectively)

## Phase 1: Setup

**Purpose**: No new scaffolding needed — every file this feature touches already exists
(plan.md's "Structure Decision": no new files/directories). This phase is a no-op by design;
listed for template completeness.

- [ ] T001 Confirm `node scripts/spec-index.mjs --check` passes against the unmodified
      corpus (baseline for SC-002's non-regression claim; `plan.md`'s AS-IS evidence already
      ran this once during research — rerun immediately before starting code changes to
      catch any drift).

---

## Phase 2: Foundational (blocking prerequisites for every user story below)

**Purpose**: The combined-source descriptor list (research.md Decision 1) every later task
builds on.

**⚠️ CRITICAL**: T002 must land before any task in Phase 3.

- [ ] T002 In `scripts/spec-index.mjs`, replace the single
      `readdirSync('specs').filter(...)` input (~line 623) with a combined list of
      `{ displayName, idFromPath, read }` descriptors covering (a) existing top-level
      `specs/*.md` files unchanged, and (b) every `specs/<dir>/spec.md` found via a
      `readdirSync('specs', { withFileTypes: true })` pass filtered to directories where
      `existsSync(join('specs', dirent.name, 'spec.md'))` — directories without a
      `spec.md` are dropped here, not flagged as errors (FR-002). Feed the combined list
      into the existing validation `for` loop unchanged, replacing every use of bare `name`
      and `idFromFilename` with `displayName`/`idFromPath` (data-model.md "Spec source
      descriptor"; research.md Decisions 1-2).

**Checkpoint**: Both top-level and directory specs now reach the existing validation loop;
proceed to Phase 3.

---

## Phase 3: User Story 1 + User Story 2 - Directory specs are scanned, validated, and fail the same way a bad top-level spec would (Priority: P1)

**Goal**: A valid directory `spec.md` is picked up and projected; an invalid one (bad id,
missing field, duplicate id) fails `--check` with the same message vocabulary as today's
top-level checks.

**Independent Test**: spec.md's US1/US2 acceptance scenarios — run `node
scripts/spec-index.mjs` against fixture directories with each shape and assert the exact
pass/fail outcome and message.

### Tests for User Story 1 + 2 (write first; must fail before T004-T006 land)

- [ ] T003 [P] [US1/US2] Add fixtures to `scripts/spec-index.test.mjs`'s temp-git-repo
      harness: (a) a valid `specs/<n>-fixture/spec.md` → one new row with the right `id` and
      `path`; (b) `id` not matching its directory name → exit 1 naming the mismatch; (c) a
      directory spec missing a required field (e.g. `pass`) → exit 1 with the existing
      `missing required field` message shape; (d) a top-level spec and a directory spec both
      declaring the same `id` → exit 1 with a duplicate-id error naming both; (e) a directory
      with no `spec.md` (only `plan.md`, or empty) → no error, no row. (FR-012a-e)

### Implementation for User Story 1 + 2

- [ ] T004 [US1/US2] In `scripts/spec-index.mjs`, extend `DERIVED_INDEX_FIELDS` to include
      `path`, and extend `projectSpec()` to set `spec.path = displayName` only when the row's
      source was a directory descriptor (never for top-level rows — preserves byte-identical
      existing rows per SC-002). (data-model.md's `path` field; FR-006)
- [ ] T005 [US1/US2] Confirm (no new code expected, per research Decision 1) that the
      existing `fmById` duplicate-id tracking in the widened loop already produces T003(d)'s
      expected error without modification; if it does not, fix the one place it assumed a
      top-level-only `name` shape.
- [ ] T006 [US1/US2] Run `pnpm run test:scripts` until T003's fixtures pass, then run `node
      scripts/spec-index.mjs --check` against the real repo corpus (no fixtures) and confirm
      it is still byte-identical to T001's baseline (SC-002).

**Checkpoint**: US1 and US2 are independently verifiable — a directory spec can appear on the
board, and a broken one is rejected exactly like a broken top-level spec.

---

## Phase 4: Heading-lint parity (supports US1/US2's "first-class" claim; not its own numbered user story — spec.md FR-008/FR-009, plan.md D5)

**Goal**: Directory `spec.md` bodies get a real, Spec-Kit-shaped lint instead of either being
exempt from heading lint forever or forced into the flat-file heading shape.

**Independent Test**: spec.md FR-008's examples — a directory spec missing `## Requirements`,
`## Assumptions`, or both a `**Verification:**` label and a sibling `tasks.md` fails
`--check` naming the missing signal; one with all three signals passes.

### Tests (write first)

- [ ] T007 [P] [US1/US2] Add fixtures: directory spec passing all three Spec-Kit heading
      signals; one missing `## Requirements`; one missing `## Assumptions`; one with no
      `**Verification:**` label and no sibling `tasks.md`; one with no verification label but
      a sibling `tasks.md` present (should pass via the OR). (FR-012f)

### Implementation

- [ ] T008 [US1/US2] In `scripts/spec-index.mjs`, add `REQUIRED_SPEC_KIT_HEADINGS` (data-
      model.md's table) and a dispatcher (e.g. `findMissingRequiredHeadings(descriptor,
      body)`) that runs the existing `missingRequiredHeadings()` for top-level sources and
      the new check for directory sources, reusing `stripNonDocumentMarkdown()` and the
      existing `headingBaseline`/grandfather lookup (keyed by `id`, source-agnostic) for
      both. Wire the dispatcher into the `--check`-only call site that currently calls
      `missingRequiredHeadings()` directly.
- [ ] T009 [US1/US2] Run T007's fixtures green via `pnpm run test:scripts`.

**Checkpoint**: Directory specs are now lint-parity with top-level specs, using a contract
shaped for their actual body.

---

## Phase 5: User Story 3 - New Spec Kit features are board-ready from birth (Priority: P2)

**Goal**: `.specify/templates/spec-template.md` emits valid frontmatter so a fresh
`/speckit-specify` run needs no manual retrofit.

**Independent Test**: spec.md US3's acceptance scenarios — run `/speckit-specify` (or
simulate its template-copy step) and confirm the produced `spec.md` passes T002-T008's gate
unmodified.

- [ ] T010 [US3] Prepend the TEMPLATE.md frontmatter block to
      `.specify/templates/spec-template.md`: `id`, `title`, `stage: spec`, `status: draft`,
      `pass: 1`, `created`, `updated`, `repos` — with `id`/`created`/`updated` left as the
      same kind of bracketed placeholder the template already uses for `[FEATURE NAME]`/
      `[DATE]` elsewhere, so `/speckit-specify`'s existing placeholder-fill step covers them
      too without a separate instruction change. (FR-005)
- [ ] T011 [US3] [P] Update `.claude/skills/speckit-specify/SKILL.md`'s "Create the spec
      feature directory" step if (and only if) it does not already describe filling
      placeholders generically — confirm during implementation whether this is needed at all,
      since the skill's existing wording ("replacing placeholders with concrete details") may
      already cover the new frontmatter placeholders with zero skill-file change. Record the
      outcome either way rather than leaving it unexamined.
- [ ] T012 [US3] Manually run the `/speckit-specify` flow (or its template-resolution step)
      against a disposable feature description, inspect the produced `spec.md`'s frontmatter,
      and confirm it is accepted by T002-T008's gate; delete the disposable feature directory
      afterward.

**Checkpoint**: A brand-new feature is board-visible with zero manual frontmatter authoring.

---

## Phase 6: User Story 4 - The stub-spec instruction is removed, not just unused (Priority: P2)

**Goal**: No remaining instruction tells an agent to create a top-level stub for a Spec Kit
feature; both documents instead describe directory scanning as the real mechanism.

**Independent Test**: spec.md US4's acceptance scenarios — grep both files for the stub
instruction text post-edit; zero matches.

- [ ] T013 [P] [US4] Rewrite `.specify/memory/constitution.md`'s "Artifact layout and
      registration" section: remove the "also gets a top-level stub spec" sentence; replace
      with a description of directory scanning (T002/T004/T008's behavior) as the mechanism
      that makes a Spec Kit feature board-visible.
- [ ] T014 [P] [US4] Rewrite `AGENTS.md`'s "Spec-driven workflow (Spec Kit)" section (the
      bullet starting "Artifacts live in `specs/<NNN>-<slug>/`…") the same way, and correct
      the now-inaccurate "`scripts/spec-index.mjs` reads only top-level `specs/*.md`" claim
      in that same bullet.
- [ ] T015 [US4] `grep -ril "top-level stub" .specify/memory/constitution.md AGENTS.md`
      (and any phrasing variant actually used) returns no matches; `node
      scripts/check-agent-instructions.mjs` (the AGENTS.md/registry consistency check named
      in this repo's own root `AGENTS.md` "Project Map" note) still passes, confirming the
      rewritten section didn't drift from any `repo-policy:*` generated block it sits near.

**Checkpoint**: Documentation and code are now in agreement — nothing instructs the
workaround this feature makes unnecessary.

---

## Phase 7: Polish & cross-cutting validation

**Purpose**: Final non-regression and self-test confirmation across every slice.

- [ ] T016 Run `pnpm run test:scripts` (full suite, not just this feature's new fixtures) —
      confirm zero existing test in `scripts/spec-index.test.mjs` or any sibling `*.test.mjs`
      regressed.
- [ ] T017 Run `node scripts/spec-index.mjs --check` and `node scripts/proposal-index.mjs
      --check` against the real repo corpus — confirm both pass and the proposal-index run
      is unaffected (FR-014; proposal tooling was never touched).
- [ ] T018 Run `quickstart.md`'s full nine-step sequence end to end as the final acceptance
      pass, including the negative-case steps (5) and the cleanup step (9) — confirm
      `specs/index.json` returns to its exact prior committed state after fixture cleanup.
- [ ] T019 File the open-items ledger entry this feature's own constitution requires for any
      remaining gap found during T010-T018 (e.g. if T011 determines the skill file *does*
      need a wording change, or if the PR-base assumption in plan.md's Constitution Check
      turns out wrong) — a `TODO(handoff)` at the exact site plus a `proposals/` entry, per
      AGENTS.md's "Open-items ledger" convention. Skip this task entirely (not merely mark it
      done) if T010-T018 found nothing to hand off.

## Dependencies & execution order

- Phase 1 (T001) → Phase 2 (T002, blocking) → Phase 3 (T003-T006) → Phase 4 (T007-T009) →
  Phase 5 (T010-T012) and Phase 6 (T013-T015) can run in parallel with each other and with
  Phase 4 once Phase 2 and Phase 3 have landed (neither touches `scripts/spec-index.mjs`) →
  Phase 7 (T016-T019) last, after everything else.
- Within Phase 3: T003 before T004-T006 (tests first, per the Tests convention above); T004
  and T005 touch the same file (`scripts/spec-index.mjs`) and are NOT parallel with each
  other despite both being "[US1/US2]"; T006 depends on both.
- T013 and T014 are genuinely parallel (different files, no shared state).

## Parallel execution examples

- After T002 lands: T003 (test fixtures) can be drafted while T010 (template frontmatter,
  Phase 5, no dependency on the scan-loop internals) is also drafted — different files,
  different people/sessions.
- T013 and T014 (constitution + AGENTS.md) can run as one batch, independent of every code
  task, as soon as the Phase 2-4 behavior they describe is stable enough to document
  accurately (recommended: after T009, so the documentation describes shipped behavior, not
  a plan).

## Implementation strategy

**MVP = Phase 1 + 2 + 3** (T001-T006): this alone delivers US1+US2 — a directory spec becomes
board-visible and malformed ones are rejected. Phases 4-6 are real, spec-mandated
requirements (FR-008/009, FR-005, FR-013) but are independently shippable increments on top
of the MVP, matching Spec Kit's "each user story ships independently" principle even though
this feature's four stories share more implementation surface than a typical multi-story
feature (by design — see plan.md's "additive widening of one loop" Summary).
