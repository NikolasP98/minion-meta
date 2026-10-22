# Plan: 029 Gateway CI cost cuts

One slice, one PR against minion-ai `DEV` (registry PR base).
- `.github/workflows/ci.yml`: replace the `macos.if` expression (FR-001).
- `.github/workflows/nightly-full-platform.yml`: cron `23 7 * * 1` (FR-002).
- `.github/workflows/upstream-monitor.yml`: cron `0 6 * * *` (FR-003).
- `test/ci/ci-workflow.test.ts`: update the nightly cron pin and add a push-scope macOS case (FR-004).
- Gate: `pnpm vitest run test/ci/` (never the full suite; it crashes the box).
