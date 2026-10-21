---
id: 2026-10-21-gateway-macos-ci-pause
title: Resume the gateway macOS CI lane when Mac releases restart
status: draft
created: 2026-10-21
updated: 2026-10-21
repos: [minion-ai]
---

# Resume the gateway macOS CI lane

**AS-IS**: minion-ai `ci.yml` `macos` job reads `if: false && …`. The owner paused it on 2026-10-21 because Mac releases are on hold (minion-ai #349, spec `specs/029-gateway-ci-cost-cuts`). Nothing in CI builds, lints, or tests `apps/macos`, `apps/ios`, or `apps/shared` Swift code, or runs the TS suite on macOS.

**TO-BE**: when Mac releases resume, delete the leading `false && `. The scoped condition takes over: the job runs on native-path changes and in the weekly full-platform dispatch. Then flip the three `// paused` assertions in `test/ci/ci-workflow.test.ts` back to `true`.

**Risk while paused**: Swift and macOS-only regressions accumulate silently. The first resumed run may be red.
