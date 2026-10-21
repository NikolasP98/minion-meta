---
id: 2026-10-21-gateway-macos-ci-pause
title: Resume the gateway macOS CI lane when Mac releases restart
status: draft
created: 2026-10-21
updated: 2026-10-21
repos: [minion-ai]
---

# Resume the gateway macOS CI lane

**AS-IS**: minion-ai `ci.yml` `macos` job is gated by the repository variable `CI_MACOS` (default off; `if: vars.CI_MACOS == 'on' && …`). The owner paused it on 2026-10-21 because Mac releases are on hold (minion-ai #349, spec `specs/029-gateway-ci-cost-cuts`). Nothing in CI builds, lints, or tests `apps/macos`, `apps/ios`, or `apps/shared` Swift code, or runs the TS suite on macOS.

**TO-BE**: when Mac releases resume, run `gh variable set CI_MACOS -R NikolasP98/minion-ai --body on`. The scoped condition takes over: the job runs on native-path changes and in the weekly full-platform dispatch. No commit is needed.

**Risk while paused**: Swift and macOS-only regressions accumulate silently. The first resumed run may be red.

## Follow-up: Windows lane flag (not built)

The flag system (minion-ai #349) covers `CI_MACOS`, `CI_ANDROID`, `CI_PLATFORM_AUDIT`, and `CI_UPSTREAM_MONITOR`. Windows (~17% of October spend) is not flaggable. `windows-full-required` re-verifies the full Windows shards on DEV, and `linux-required` re-verifies the `windows-process-helper-contract` receipt. Skipping either Windows job turns those gates red. A `CI_WINDOWS` flag needs both aggregators to accept `skipped` when the flag is off. That is a TQ-016 qualification-policy change, so it gets an owner decision first.
