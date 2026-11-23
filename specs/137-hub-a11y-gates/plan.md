# Implementation Plan: Accessibility gates first (a11y program S0)

**Branch**: `137-hub-a11y-gates` (hub branch `feat/137-a11y-gates`, PR base `master`) | **Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/137-hub-a11y-gates/spec.md`

## Summary

Add one command, `bun run a11y`, that runs five accessibility gates and prints one JSON
document; CI runs the same command. Each gate extends a mechanism the hub already has:
the page sweep gains an axe pass, the existing per-story axe reports are compared with a
ledger, the design lint gains one rule, the two existing specs get a runner. One new
helper, `assertPattern`, is written in-house (owner decision). No rendered UI changes.

## Technical Context

**Language/Version**: TypeScript 5 (strict) for app and test code; Node 22 ESM scripts (`.mjs`), matching `scripts/design-lint.mjs` and `scripts/ui-audit-conformance.mjs`

**Primary Dependencies**: axe-core 4.14.0 (already in `bun.lock` through `@storybook/addon-a11y`; becomes an explicit devDependency); `@playwright/test` 1.61.1 (page sweep, specs); Vitest 4.1.11 browser mode + `@storybook/addon-vitest` 10.6.6 (stories); happy-dom (mounted tests). No new package.

**Storage**: Two committed JSON baselines: `tests/ui-audit/a11y-ledger.json` (new) and `scripts/.design-lint-baseline.json` (one new key)

**Testing**: Vitest unit tests for the helper self-test and the ledger compare; the gates themselves, with one seeded failure each

**Target Platform**: Developer machines and GitHub Actions (`ubuntu-latest`, `ubuntu-24.04`)

**Project Type**: Web application (SvelteKit); this slice touches only test tooling, scripts, CI and documentation

**Performance Goals**: Page sweep step ≤ 15 min (7 min 10 s today); new `a11y` job shorter than `critical-journeys-browser` (26 min)

**Constraints**: No visible UI change (FR-010); baselines decrease only; a `package.json` edit needs the pulse-digest anchors refreshed (`src/server/pulse/dependency-snapshot.json`, `digest-policy.example.json`)

**Scale/Scope**: ~140 swept pages × 1 viewport; 1,205 stories in 194 files; 84 suppressed warnings; 7 patterns

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | Pass: spec reviewed in two passes (`review.md`) before this plan |
| II. AS-IS → TO-BE → DELTA with evidence | Pass: all three sections present; every AS-IS number has its command or run named |
| III. Slice-scoped delivery | Pass: one hub PR from an isolated worktree against `master`; gates run in the foreground first. Documentation in two other repos ships as its own small PRs |
| IV. Required build steps | Pass: no UI, route, API, nav link or user-facing string is added, so no token, RBAC, Paraglide or route-contract work. `lint:design` gains a rule; `lint:design && lint:tokens` still run |
| V. Security and data human gates | Not triggered (no auth, tenant, credential or production-data change). Hub master merges still need the owner's approval |

Re-checked after design: no change.

## Project Structure

### Documentation (this feature)

```text
specs/137-hub-a11y-gates/
├── spec.md
├── review.md            # 2-pass review record
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/a11y-report.md
└── tasks.md
```

### Source Code (minion_hub)

```text
scripts/a11y.mjs                       # NEW  the one command: gates, ledger compare, JSON report
scripts/a11y.test.ts                   # NEW  unit tests of the pure compare/merge functions
scripts/design-lint.mjs                # EDIT rule `a11y-ignore`; `--json=<file>` result
scripts/.design-lint-baseline.json     # EDIT ceiling for `a11y-ignore`
src/lib/a11y/assert-pattern.ts         # NEW  the pattern-assertion helper
src/lib/a11y/assert-pattern.mounted.test.ts  # NEW self-test (pass per pattern, fail per rule)
tests/e2e/ui-audit/a11y.ts             # NEW  axe pass for a settled page
tests/e2e/ui-audit/route-audit.spec.ts # EDIT call it; record `a11y` in the run artifact
tests/e2e/ui-audit/run-artifact.ts     # EDIT artifact type
tests/ui-audit/a11y-tags.json          # NEW  the WCAG tag list (single source for pages and stories)
tests/ui-audit/a11y-ledger.json        # NEW  committed baseline
vitest.config.ts                       # EDIT story browser context: reduced motion
package.json, bun.lock                 # EDIT script `a11y`, devDependency `axe-core`
src/server/pulse/*.json                # EDIT refreshed digest anchors
.github/workflows/ci.yml               # EDIT new job `a11y`; `qa-stack` sweep step runs the command
docs/a11y.md, AGENTS.md, .claude/skills/ui-design-governance/SKILL.md  # EDIT documentation
```

Other repositories (documentation only): `minion-meta` `.claude/skills/ui-design-governance/SKILL.md`;
`minion_plugins` `plugins/minion-engineering/skills/minion-engineering/`.

**Structure Decision**: Everything lives beside the mechanism it extends. `scripts/a11y.mjs`
imports the sweep's artifact reader from `scripts/ui-audit-conformance.mjs` instead of
re-implementing it.

## Complexity Tracking

No constitution violation. One deliberate deviation from the spec's first draft, justified
in `research.md` R1: the accessibility counts get their own ledger file instead of a
seventh rule in the sweep's (uncommitted) conformance ledger.
