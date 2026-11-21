---
description: "Task list for spec 137 — accessibility gates first (a11y program S0)"
---

# Tasks: Accessibility gates first (a11y program S0)

**Input**: Design documents from `specs/137-hub-a11y-gates/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/a11y-report.md, quickstart.md

**Tests**: Included. The spec requires a self-test for the helper (FR-007) and one seeded failure per gate (SC-001).

**Organization**: By user story. Paths are relative to the `minion_hub` checkout (branch `feat/137-a11y-gates`, off `origin/master`) unless a repo is named.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Create worktree `feat/137-a11y-gates` from fresh `origin/master`; `bun install --frozen-lockfile`, `cp .env.example .env`, `bun run i18n:compile`, `bunx svelte-kit sync`
- [x] T002 Add script `"a11y": "node scripts/a11y.mjs"` and devDependency `"axe-core": "4.14.0"` to `package.json`; `bun install`; refresh both sha256 anchors (`package.json`, `bun.lock`) in `src/server/pulse/dependency-snapshot.json` and `src/server/pulse/digest-policy.example.json`; run `src/server/services/pulse-digest.sources.test.ts`

## Phase 2: Foundational (blocks US1, US2, US6)

- [x] T003 Create `tests/ui-audit/a11y-tags.json` (WCAG 2.0/2.1/2.2 A + AA tags)
- [x] T004 Create `scripts/a11y.mjs` skeleton: `parseArgs`, gate loop, JSON report to stdout and `test-results/a11y/report.json`, child output to stderr, exit codes (contracts/a11y-report.md)
- [x] T005 In `scripts/a11y.mjs` add the pure ledger functions `compareRows`, `mergeRows`, `ledgerGate` (data-model.md rules: sparse, unmeasured, ungated, unstable, partial runs)
- [x] T006 [P] Create `scripts/a11y.test.ts` covering T005 and the row builders (rise fails, new row fails, measured→unmeasured fails, fall passes with `--ci` and asks for a ratchet locally, ungated never fails, merge keeps the ledger sparse)

**Checkpoint**: `bunx vitest run scripts/a11y.test.ts` green.

## Phase 3: User Story 1 — A page regression fails CI (P1)

**Independent Test**: quickstart step 3 "pages".

- [x] T007 [P] [US1] Create `tests/e2e/ui-audit/a11y.ts` `collectA11y(page)`: evaluate axe-core source in the page, run with the tag list, return rule → `{count, impact, offenders}` (research R2)
- [x] T008 [US1] In `tests/e2e/ui-audit/route-audit.spec.ts` call `collectA11y` after `assertCaptureContentReady` when conformance is enabled; add `a11y?` to `CaptureRunResult` in `tests/e2e/ui-audit/run-artifact.ts`
- [x] T009 [US1] In `scripts/a11y.mjs` add `pageRows` (reuse `readArtifacts`, `scenarioKey`, `RATCHET_*` from `scripts/ui-audit-conformance.mjs`) and the `pages` gate: run `scripts/ui-audit-sweep.ts` (pass `--ci`, `--routes`), read this run's `run-sweep--*.json`, compare; `--artifacts <dir>` skips the sweep; a non-zero sweep exit fails the gate
- [x] T010 [US1] In `.github/workflows/ci.yml` job `qa-stack`, change the sweep step to `bun run a11y --only pages --ci` and add `test-results/a11y/report.json` to the retained artifact
- [x] T011 [US1] Push, download the `ui-audit-conformance` artifact of the PR run, run `bun run a11y --only pages --artifacts <dir> --update-baseline`, commit `tests/ui-audit/a11y-ledger.json` (pages + `pageScenarios`); confirm the next run is green and the step is under 15 minutes
- [x] T012 [US1] Seeded-failure trial for pages (raise one count in a copy of the artifact → gate fails naming page, viewport, rule, counts, an element); record in the PR

## Phase 4: User Story 2 — A component regression fails CI (P1)

**Independent Test**: quickstart step 3 "stories".

- [x] T013 [US2] In `scripts/a11y.mjs` add `storyRows` (vitest JSON → story id × rule from `meta.reports`, WCAG tags only; failed story, failed file import and missing report = `unmeasured`) and the `stories` gate (`--stories` filter)
- [x] T014 [US2] Repeatability (research R4): reduced motion for the story browser context in `vitest.config.ts`; rerun once when the run logged "optimized dependencies changed"; `unstable` map honoured by `compareRows`/`mergeRows`
- [x] T015 [US2] Generate the story baseline (`bun run a11y --only stories --update-baseline`), run again from a cold cache and once more warm; list any row that flips under `unstable` with its reason; commit the ledger
- [x] T016 [US2] In `.github/workflows/ci.yml` add job `a11y` (checkout with full history, bun, install, generate, both Chromium installs, cache `node_modules/.cache/storybook`, `bun run a11y --ci`, upload the report)
- [x] T017 [US2] Seeded-failure trial for stories; record in the PR

## Phase 5: User Story 3 — One call proves a widget (P2)

**Independent Test**: `bunx vitest run src/lib/a11y/assert-pattern.mounted.test.ts`.

- [x] T018 [P] [US3] Create `src/lib/a11y/assert-pattern.ts`: `checkPattern`, `assertPattern`, `PATTERN_RULES` for listbox, menu, tabs, dialog, alertdialog, combobox, grid (research R5)
- [x] T019 [US3] Create `src/lib/a11y/assert-pattern.mounted.test.ts`: one conforming fixture per pattern, one failing fixture per rule in `PATTERN_RULES`, plus message format, `skip`, opener requirement and active-descendant cases
- [x] T020 [US3] In `scripts/a11y.mjs` add the `patterns` gate: run every `*.test.ts` that references `assert-pattern`, report failures with their messages

## Phase 6: User Story 4 — The two existing specs protect us (P2)

- [x] T021 [US4] In `scripts/a11y.mjs` add the `specs` gate (research R7): canvas spec via the default config; workshop spec via `playwright.workshop.config.ts --project chromium` against its built fixture served on `127.0.0.1:18907`; `TODO(handoff)` for Firefox/WebKit
- [x] T022 [US4] Seeded-failure trial for specs; record in the PR

## Phase 7: User Story 5 — Suppressed warnings can only go down (P3)

- [x] T023 [P] [US5] In `scripts/design-lint.mjs` add rule `a11y-ignore` and the `--json=<file>` result; `node scripts/design-lint.mjs --update-baseline`
- [x] T024 [US5] In `scripts/a11y.mjs` add the `suppressions` gate reading that JSON
- [x] T025 [US5] Seeded-failure trial for suppressions; record in the PR

## Phase 8: User Story 6 — One command, documented (P1)

- [x] T026 [US6] Compact stdout (changed rows only, `--verbose`), full `report.json`
- [x] T027 [P] [US6] Write `docs/a11y.md`: command, gates, baselines, output, `assertPattern` with one example per pattern
- [x] T028 [P] [US6] Add the accessibility section and the rule to hub `AGENTS.md` and hub `.claude/skills/ui-design-governance/SKILL.md`
- [x] T029 [P] [US6] `minion-meta`: add the same gate to `.claude/skills/ui-design-governance/SKILL.md` (branch `spec/137-hub-a11y-gates`)
- [x] T030 [P] [US6] `minion_plugins`: add the rule to `plugins/minion-engineering/skills/minion-engineering/` (own PR, base `main`); the meta sync (`scripts/sync-minion-engineering-skills.sh`) runs after that PR merges

## Phase 9: Polish

- [x] T031 Foreground gates before the PR, one at a time: `bun run check`, `bun run test`, `bun run lint:design && bun run lint:tokens`, `bun run a11y`, `bun run build`; prettier on changed files
- [x] T032 Open the hub PR (base `master`) with baseline counts, the five trials, both CI durations and the JSON output of a real run; watch every `statusCheckRollup` entry to green
- [x] T033 Open ends: `TODO(handoff)` in code and an entry in `proposals/2026-11-20-hub-accessibility-program.md`; set this spec's `status` and tick the tasks

## Status (2026-11-21)

Hub PR #702 was approved by the owner and squash-merged to `master` as `3d39cbb6` on 2026-11-21. All tasks done in hub PR #702 (every check green on `c8eccd11`), except the merge-dependent half of T030: minion_plugins PR #2 is open; the meta sync runs after it merges. T011/T012 used the PR's CI artifact (`--artifacts`) because no local QA stack was started. Baselines: stories 806, pages 336 (22 pages unmeasured), suppressions 84. Open ends: `proposals/2026-11-20-hub-accessibility-program.md`.

## Dependencies

T001 → T002 → Phase 2 → US1, US2 (need T004–T005). US3, US4, US5 are independent of each other and of US1/US2 except for their gate wiring in `scripts/a11y.mjs` (T020, T021, T024 after T004). US6 needs all gates. T011 needs a CI run of T008–T010. T030's sync depends on a merge the owner controls.

## Parallel opportunities

T006, T007, T018, T023, T027–T030 touch different files.

## Implementation strategy

MVP = US5 + US3 + US4 (no baseline needed, green immediately), then US2 (local baseline), then US1 (baseline from the PR's own CI artifact), then US6 documentation.
