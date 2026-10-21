# Feature Specification: Gateway CI cost cuts

**Feature Branch**: `spec/029-gateway-ci-cost-cuts` (meta) · `fix/ci-cost-macos-scope` (minion-ai)
**Created**: 2026-10-21
**Status**: Draft
**Input**: Owner: "figure out why the costs went up and what processes are taking up most of the budget. Implement cost saving techniques addressing the root causes." Follow-up: "lets open-source the hub repo. We keep the server private."

## AS-IS (evidence)

The account's Actions budget was at $91.56 of $100 (91%) on 2026-10-21, per the owner's screenshot of the billing page.
Source for everything below: `gh api` job listings for every October run (2026-10-01→21) in the private repos.
List prices: Linux $0.006/min, Windows $0.010/min, macOS $0.062/min, per-job minutes rounded up. These rates are *my belief of current list prices*; owner should verify.
The model estimates ~$110 at list price. That is the right order of magnitude next to the $91.56 billed.

| Bucket | Est. $ | Share |
|---|---|---|
| minion-ai `CI` › `macos` job | 51.96 | 47% |
| minion-ai `CI` Windows (`checks-windows`, `checks-windows-full`, TQ-016) | 19.07 | 17% |
| minion-ai `CI` Linux (all other jobs) | ~30 | 27% |
| minion-ai `Upstream Monitor` (cron every 6h, 84 runs) | 4.07 | 4% |
| minion-ai Docker Release + npm publish | 4.5 | 4% |
| minion-factory + minion-site (all workflows) | <1 | <1% |

Root causes:
1. **macOS runs unconditionally on DEV.** `ci.yml` `macos.if` runs the job on every DEV `push` and every `workflow_dispatch`, ignoring `changed-scope.outputs.run_macos`. 125 jobs ran on push or dispatch, at 6–7 min each and 10× the Linux rate. Few of those pushes touched `apps/macos|ios|shared`.
2. **Nightly full-platform dispatches daily** (`nightly-full-platform.yml`, cron `23 7 * * *`). It re-runs the whole matrix even when DEV did not change: 24 dispatch runs, ~$31.
3. **Upstream Monitor polls every 6h**: 4 runs a day of ~8 min.
4. Spikes on 10-10, 10-12/13, 10-18, and 10-21 track bursts of DEV pushes. Each push pays macOS plus Windows full.

**The hub is already public.** `gh repo list` reports `minion_hub` PUBLIC, and public repos on standard runners are free. Open-sourcing it changes nothing. minion-site (private) cost <$1.

## TO-BE

- macOS runs only when the scope detector says native code changed (`run_macos == 'true'`), for every event. A dispatch has no diff base, so the detector fails safe to `run_macos=true`. The full-platform audit therefore still runs macOS.
- The full-platform audit runs weekly: Monday 07:23 UTC.
- Upstream Monitor runs daily.
- **Amended 2026-10-21 (owner): macOS lane PAUSED entirely (`if: false && …`) — Mac releases on hold; resume ledger `proposals/2026-10-21-gateway-macos-ci-pause.md`.**
- Untouched: Windows / TQ-016 qualification, Linux required lanes, promotion contexts.

## User Scenarios & Testing

### US1 — DEV pushes stop paying for macOS (P1)
**Acceptance**:
1. **Given** a DEV push changing only `src/**`, **When** CI runs, **Then** `macos` is skipped.
2. **Given** a DEV push changing `apps/macos/**`, **When** CI runs, **Then** `macos` runs.
3. **Given** a manual or nightly dispatch on DEV, **When** CI runs, **Then** `macos` runs (fail-safe scope).

### US2 — Fewer scheduled runs (P2)
**Acceptance**: the nightly dispatcher cron is weekly, and the Upstream Monitor cron is daily.

### Edge Cases
- Scope detection fails (`UNKNOWN` diff): every lane runs (existing fail-safe).
- Docs-only push: macOS skipped (unchanged).
- macOS regression introduced by a non-native change: caught by the weekly audit, at most 7 days late. This is an accepted trade-off.

## Amendment 2 (owner, 2026-10-21): lane flags
- **FR-005**: CI lanes toggle via repository variables, without a commit: `CI_MACOS` (default off, replaces the hard-coded pause), `CI_ANDROID`, `CI_PLATFORM_AUDIT`, and `CI_UPSTREAM_MONITOR` (default on, `off` skips). The flag list lives at the top of `ci.yml`. Windows is excluded because its aggregators verify receipts; see the follow-up in `proposals/2026-10-21-gateway-macos-ci-pause.md`.
- Test: `gates lanes on repository-variable flags`.

## Requirements
- **FR-001**: `macos` job condition = not docs-only AND `run_macos == 'true'`, regardless of event.
- **FR-002**: `nightly-full-platform.yml` schedule = weekly.
- **FR-003**: `upstream-monitor.yml` schedule = daily.
- **FR-004**: The existing `test/ci/ci-workflow.test.ts` assertions keep passing. New assertions prove US1.1, US1.2, and US1.3, and pin the new crons.

## Success Criteria
- **SC-001**: Projected monthly Actions spend drops by ≥40%: macOS ~$75/mo → ~$5/mo, dispatch audits ~$45 → ~$10, monitor ~$6 → ~$1.5. Verify on the November billing page.
- **SC-002**: Zero change to required Windows/Linux promotion contexts.

## Assumptions
- A ≤7-day detection lag for macOS-only regressions from non-native changes is acceptable. The macOS app is not the deployed product; the gateway ships as Linux Docker.
- The billing rates above are approximate.

## Bypassed
This is a CI-config hotfix, so the cycle is compressed: plan and tasks are inline in `plan.md` and `tasks.md`, and there is no 2-pass review beyond the PR review.
