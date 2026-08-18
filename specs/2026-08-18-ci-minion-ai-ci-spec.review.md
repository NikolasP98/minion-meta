---
spec: 2026-08-18-ci-minion-ai-ci-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

- Set `status: approved`, `pass: 2`, and `verdict: approved` because every correctness defect was resolvable from the run logs, current `DEV` source, related specs, and operator memory without a human product decision.
- Replaced the vague missing-Linux-log statement with the exact incomplete job-step evidence: `Run test (node)` had no terminal conclusion or retained log after roughly 56 minutes, so a fresh instrumented run must classify it.
- Bound the baseline to full SHA `02df8953a920217a2ddede63109d036f23057c29` and verified that it remains the current `DEV` tip and latest completed run for workflow `243151553`.
- Clarified that the current Bun and Windows logs share fixture/mock failures while the missing `better-sqlite3` binding is explicitly proven on Bun, avoiding the false implication that all clustered failures are Bun-only.
- Added the duplicate `onlyBuiltDependencies` declaration in `package.json` as an owner surface so the package and workspace allow-lists cannot drift.
- Required conditional Node and Bun native-addon smoke checks in the shared setup action because the Bun lane imports the same `better-sqlite3` package and already fails when its binding is absent.
- Added the verified report-variable mismatch: CI writes `MINION_VITEST_REPORT_DIR`, but `scripts/test-parallel.mjs` reads `OPENCLAW_VITEST_REPORT_DIR`, so the promised Node/Windows JSON evidence is currently never created.
- Added the verified Windows worker-variable mismatch: CI writes `MINION_TEST_WORKERS`, but the runner reads `OPENCLAW_TEST_WORKERS`, making the advertised two-worker cap inert.
- Added `always()` plus absent/partial-report handling for summary and artifact steps because their current success-only conditions skip all diagnostics after the failures this spec is meant to classify.
- Required a deliberate failing focused run to prove artifact upload does not mask the test exit, applying `/memory/MINION/MEMORY.md`'s ★★★ piped-gate/result-integrity constraint.
- Added the three wrapper Vitest configs as impact surfaces because they spread the root `projects` array and cause `pnpm test` to execute e2e/live projects despite `scripts/test-parallel.mjs` declaring only unit, unit-forks, extensions, and gateway groups.
- Defined removal of accidental e2e/live inheritance as restoration of the declared PR-CI contract, not quarantine, while preserving every intended unit/unit-forks/extensions/gateway include set.
- Corrected the coverage invariant from vague “present coverage” to the four declared correctness projects so it no longer contradicts removal of accidental inherited e2e/live execution.
- Replaced raw pre-change total parity with per-owning-project collection parity because removing accidental repeated e2e/live execution must lower inflated totals without reducing intended coverage.
- Made incomplete-lane inventory semantics explicit: returned worker failures retain diagnostics, while a lost runner is classified from GitHub job metadata rather than held to an impossible artifact-upload requirement or forced into unverifiable totals.
- Added `actionlint` and a failure-path artifact check to Slice 1 so the workflow/reporting definition of done is mechanically verifiable.
- Corrected the release-check unknown: run `31999443485` explicitly failed because extension package versions differ from root `2026.8.7-dev` and directs `pnpm plugins:sync`.
- Added the full `extensions/*/package.json` packaging impact and required review of the generated manifest diff rather than weakening `scripts/release-check.ts` or pretending this is a single-package fix.
- Added a negative single-manifest mismatch check so the preserved release-version invariant demonstrably gates the workflow.
- Clarified event semantics in end-to-end verification: `release-check` runs on the implementation branch's `push` event but is intentionally skipped in the parallel `pull_request` event.
- Preserved the no-local-full-suite hard constraint from `/memory/MINION/test-suite-recon-2026-08-10.md` and the native-addon failure class from `/memory/MINION/dev-warnings-tsgo-baseline-fixes.md`.

## Human flags

None.
