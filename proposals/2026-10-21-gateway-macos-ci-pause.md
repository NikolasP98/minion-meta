---
id: 2026-10-21-gateway-macos-ci-pause
title: Resume the gateway macOS and Windows CI lanes
status: draft
created: 2026-10-21
updated: 2026-10-21
repos: [minion-ai]
---

# Resume the gateway macOS CI lane

**AS-IS**: minion-ai `ci.yml` `macos` job is gated by the repository variable `CI_MACOS` (default off; `if: vars.CI_MACOS == 'on' && …`). The owner paused it on 2026-10-21 because Mac releases are on hold (minion-ai #349, spec `specs/029-gateway-ci-cost-cuts`). Nothing in CI builds, lints, or tests `apps/macos`, `apps/ios`, or `apps/shared` Swift code, or runs the TS suite on macOS.

**TO-BE**: when Mac releases resume, run `gh variable set CI_MACOS -R NikolasP98/minion-ai --body on`. The scoped condition takes over: the job runs on native-path changes and in the weekly full-platform dispatch. No commit is needed.

**Risk while paused**: Swift and macOS-only regressions accumulate silently. The first resumed run may be red.

## Windows: also paused (owner, 2026-10-21)

`CI_WINDOWS` defaults off (minion-ai #349). All five Windows jobs skip, including the `windows-full-required` gate. `linux-required` treats the native process-helper contract as not admitted while the flag is off. **Risk while paused**: nothing qualifies Windows compatibility (TQ-016) or the Windows process-helper contract. Resume with `gh variable set CI_WINDOWS -R NikolasP98/minion-ai --body on`. The gates then demand receipts again, so the first run may be red.
