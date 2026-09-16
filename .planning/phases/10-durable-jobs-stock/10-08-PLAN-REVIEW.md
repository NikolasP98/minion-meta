# Independent review of 10-08

Verdict: ADMITTED after bounded amendments. Re-reviewed 2026-09-09 against PLAN SHA-256 `b7024a162e700554eac8831cb55a268d4e0dc349da1657aa23aa49e0d72871e6`. Original reviewed hash was `ce77420b369649a84ba3da64e08b6651b489f2dd78617d7bbd9716147da6dc37`. No config or source was edited. GSD plan-structure validation passes with two tasks and no errors/warnings.

## Resolved amendments

1. Name the initial dedicated allowlist literally: `src/server/services/job-stock-concurrency.sql.integration.test.ts` only. The current phrase “current admitted marked tests” leaves the central boundary implicit. Later fixtures require a reviewed config amendment and actual existing-file verification; the four legacy SQL files are excluded from both default and dedicated discovery.
2. Resolve the cross-plan native-test filename mismatch before 12-04 source execution. Its admitted plan currently owns `tests/dependencies/postgres-close-recovery.test.ts`, which would be collected by the preserved dependency unit glob and would not match the new SQL exclusion. Amend that planned path to `postgres-close-recovery.sql.integration.test.ts`, update the associated ownership/review identity, and gate its explicit disposable allowlist addition. Do not add a nonexistent driver fixture as current qualification evidence.

## Evidence and accepted design

Current default Vitest config includes src/**/*.test.ts, scripts/**/*.test.ts and tests/dependencies/**/*.test.ts without the SQL exclusion. Four existing SQL fixtures read SUPABASE_DB_URL or Vite loadEnv; CRM contacts/funnel create clients from that selected URL at module scope. The newer job-stock native fixture instead uses the marked disposable helper. Excluding files before import is therefore the correct boundary.

Installed Vitest's `list --filesOnly` path calls `getRelevantTestSpecifications` instead of collecting/executing test modules. This supports safe discovery regression evidence. Tests must assert the returned file set and missing-file/empty-run behavior, not merely a successful list command. Default excludes should be retained; the dedicated config must replace the broad include/exclude behavior explicitly rather than accidentally concatenate arrays when merging configs.

The shared `validateDisposableDatabaseUrl` checks opt-in, protocol, loopback host, explicit port, fixture owner/name and query/fragment rejection without opening a connection. Marker verification remains in `openDisposablePostgres` before schema creation. Reusing validation at dedicated config startup is appropriate; no normal environment or legacy SQL module should be imported to test rejection.

The four-file ownership boundary is sufficient. Existing Svelte plugin, aliases/setup and the dependency security fixture include must remain intact. The explicit native run is a separate mandatory qualification; successful offline discovery is not native test success. This review does not claim that all unrelated unit tests are free of network effects.

## Admission evidence and implementation gate

The PLAN now names the sole initial allowlist literally and gates later fixture admission. The revised 12-04 PLAN SHA-256 `968336cd81e35af710812a966ddae88a8e2ef9938e483755c5c5d59a31828a78` consistently uses the SQL integration filename; no driver fixture exists yet. Its eventual verification commands must select the dedicated config when that fixture is admitted, since default discovery will intentionally exclude it.

Actual baseline `vitest list --filesOnly --json` with a synthetic normal-database URL exited 0 and listed all five SQL fixtures plus the dependency security fixture. Installed source confirms this listing path does not collect test modules. Baseline discovery output is retained at `/tmp/minion-360-12-01/10-08-baseline-discovery.stdout`.

Implementation verification must show actual default discovery excludes all five current SQL fixtures, dedicated discovery selects exactly the one admitted fixture, invalid/missing opt-in and wrong file selection fail, and the marked runtime qualification passes.

Root administrative admission update only; tasks/scope unchanged. Final plan SHA-256: `5db247f86aa0e620d7b01a1060bac129fffef3c892d552fc1fd93793505506ed`.

## Admitted fifth-file integration amendment

Root identified an actual child-runner dependency at `job-stock-concurrency.sql.integration.test.ts:463`: its crash reproduction spawns Vitest with the default config. After the SQL exclusion, that child would not collect its intended test. The exact fifth-file change is admitted solely to add `--config`, `vitest.disposable.config.ts` to that child argument list. Existing opt-in/URL/schema environment, test-name filter, process bounds and all fixture assertions remain unchanged. Root must refresh the PLAN/hash and verify the native parent/child scenario through the dedicated config. No other changes in that test file are admitted by this amendment.

Admitted fifth-file amendment applied: only dedicated-config argv added to the existing crash child. Final revised PLAN SHA-256: `da8f3268ceef8efba7ed17947d619d596da8b93070fb9369d4a672fb87a4947b`.

Root admitted the exact legacy business fixture quarantine amendment after source inspection confirmed eager loadEnv and live EXPLAIN registration. Current PLAN SHA-256 `21ac15f4e0e4ec4a14a67a30b3f18165bc58ebdcf63db6556c9872e174cf9414`. Four exact-file/comment/doc boundaries; no execution of the credential-loading module. File-only discovery must reproduce and then exclude the path.

The concurrent CRM extension is independently root-reviewed from actual loadEnv/organization-selection source. Final amended PLAN hash823093fde5e781213a63b2150b34e2d6512b21a15758a102eb76fd4ee2d9b003. One discovery CLI invocation initially treated its trailing test filename as the optional JSON output path; root restored that exact file from the verified source snapshot (SHA7a510b7f9ce75d87fa34b64319a0ff023ad95e254274feebacd68e0897927f95) before adding the admitted comment. Corrected files-only discovery then selected it without altering its hash. No test module or SQL ran. Discovery helper now places --json last.
