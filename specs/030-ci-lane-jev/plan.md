# Plan: 030
One slice, PR against minion-ai stacked on #349 (base `fix/ci-cost-macos-scope`; retarget to DEV after #349 merges — never delete the base first).
- `.github/ci-lanes.json`: lane table (FR-001).
- `scripts/ci/lane-flags.mjs`: Node 22 resolver with fetch, no dependencies (FR-002).
- `ci.yml`: a `lane-flags` job (`needs: [docs-scope, changed-scope]`, `if: always() && !cancelled()`), with the lane jobs and gates switched to its outputs (FR-003).
- Tests: `scripts/ci/lane-flags.test.mjs` plus `test/ci/ci-workflow.test.ts` updates (FR-004). Gate: `pnpm vitest run test/ci/`.
