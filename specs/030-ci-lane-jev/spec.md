# Feature Specification: Jev-decided CI lanes

**Feature Branch**: `spec/030-ci-lane-jev` (meta) · `feat/ci-lane-jev` (minion-ai, stacked on #349)
**Created**: 2026-10-21 · **Status**: Draft
**Input**: Owner: "figure out a way to implement jev calls to enable/disable flags depending on the diff it reads along with run conditions for each flag."

## AS-IS
- minion-ai #349 (spec 029) gates lanes with repository variables. `CI_MACOS` and `CI_WINDOWS` default off, and `CI_ANDROID` defaults on. Each value is binary, set by a human.
- Lane relevance is decided by a deterministic path classifier (`changed-scope` in `ci.yml`). It is coarse: any `src/**` change runs Windows, even a typo fix in a Linux-only module.
- Jev is qualified in this stack. OpenRouter `POST /api/alpha/decisions`, model `~typesafe/jev-latest`, returns `noul` answers as a probability in [0,1]; client: minion-factory `runner/src/jev.ts`. Per memory: ~0.4 s and $0.042/M input tokens (*believed, verify with OpenRouter*).
- minion-ai has no `OPENROUTER_API_KEY` secret.

## TO-BE
- The macOS, Windows, and Android flags accept `off | on | auto`.
- Each lane declares a natural-language **run condition** in `.github/ci-lanes.json`.
- One Linux job (`lane-flags`) resolves every lane before any lane starts:
  - `off` → the lane is skipped.
  - `on` → the lane is allowed; the deterministic path scope still applies.
  - `auto` → the lane is allowed only when the path scope says it is relevant **and** Jev, reading the diff plus the lane's run condition, answers "needed" with p ≥ 0.5.
- **Invariants**:
  1. Jev only narrows. It never runs a lane the path scope or the flag rules out.
  2. Fail-safe: when Jev cannot decide, `auto` falls back to the path scope. That covers a missing key, a fork PR, a dispatch with no diff base, a timeout, an HTTP error, or an invalid answer.
  3. Fork-PR diffs are never sent to Jev (secrets are unavailable to forks, and their diffs are untrusted).
  4. Jev never writes repository variables. Decisions are per-run and visible in the job summary.
  5. `off` and `on` resolve without any network call.

## User Scenarios & Testing
### US1 — Auto lane skipped for an irrelevant diff (P1)
**Given** `CI_WINDOWS=auto` and a PR touching only a Linux-only module, **When** Jev answers p < 0.5, **Then** every Windows job and both Windows gates skip, and the summary shows the decision.
### US2 — Auto lane kept for a relevant diff (P1)
**Given** `CI_WINDOWS=auto` and a PR touching path or spawn code, **When** Jev answers p ≥ 0.5, **Then** Windows runs exactly as with `on`.
### US3 — Jev unavailable (P1)
**Given** `auto` and no key, a timeout, or a fork PR, **Then** the lane follows the path scope, and the summary names the fallback reason.
### Edge cases
- Very large diffs are truncated to a byte budget. File names are always sent; patch text is sent only up to the budget.
- Docs-only changes: lanes skip before Jev runs (existing docs-only gates).
- If `lane-flags` itself fails, its outputs are empty and lanes skip. This fails closed on spend; the red job is visible.

## Requirements
- **FR-001**: `.github/ci-lanes.json` lists each lane with its flag, default mode, path-scope output, and run condition.
- **FR-002**: `scripts/ci/lane-flags.mjs` resolves the modes per the TO-BE rules, writes `<lane>=true|false` outputs and a summary table, and exits 0 on every Jev failure.
- **FR-003**: All macOS, Windows, and Android jobs, and both Windows gates, read `needs.lane-flags.outputs.<lane>` instead of `vars.*`.
- **FR-004**: Tests: the resolver is unit-tested with a fake fetch (off, on, auto-skip, auto-keep, scope-false-never-asks, fork, no-key, timeout, invalid answer, byte budget), and the workflow test proves that jobs read the resolver output.

## Success Criteria
- **SC-001**: With `CI_WINDOWS=auto`, Windows runs on ≤50% of PRs that the path scope alone would run. Measure over 2 weeks from the job summaries.
- **SC-002**: Zero lane decisions made without a logged reason.
- **SC-003**: Jev spend is under $0.10 a month at current PR volume (~150 PRs a month).

## Assumptions / owner actions
- The owner adds the secret: `gh secret set OPENROUTER_API_KEY -R NikolasP98/minion-ai`. Until then `auto` behaves exactly like `on`.
- The p ≥ 0.5 threshold is a starting point; calibrate from the summaries.
- Risk accepted by opting into `auto`: a Jev false-negative skips a relevant lane on that run. The weekly full-platform audit (dispatch has no base, so it falls back to scope, which means it runs) is the backstop.
