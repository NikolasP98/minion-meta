---
phase: 10-durable-jobs-stock
plan: "07"
verified: 2026-09-09
status: gaps_found
slice_status: passed
requirements_completed: []
---

# Independent shared job-effect foundation verification

Root reviewed the frozen nine-file candidate and independently passed 24 unit tests and 14 native PostgreSQL tests. The full Hub type check also passed with zero errors and zero warnings against an environment-free current-source copy. This is a foundation qualification, not finance/brain/corpus adoption, production migration or whole-phase closure.

## Evidence

| Boundary | Independent result |
|---|---|
| Existing owned transaction to tenant-scoped domain SQL | Captures role, org/profile and timeout, applies app_ledger, restores prior state before privileged job bookkeeping. Native read/insert/update isolation and denied bg_jobs writes pass. Original SQL exceptions survive failed restoration in an aborted transaction. |
| Job ownership and semantic request identity | Current job tenant/status/generation plus locked entity revision fence persistence. Authorized resets invalidate prior revisions. Legacy/source binding requires a caller-supplied domain validator inside the locked scope. Adopters must implement that validator against actual source rows. |
| Local admission and remote embedding attempt | Frozen, privately registered prepared request pins endpoint/model/body hash. One job attempt has no implicit retry. Received vectors can replay; admission without durable response rejects automatic repetition. Cancellation cannot undo an already dispatched remote request. |
| Domain publication and progress | Receipt completion, domain mutation and job cursor share one owned transaction. Partial publication rolls back. Completed receipt replay skips publication and preserves the stored cursor. The provided advance-result helper prevents bg-runtime from clearing an omitted cursor. |
| Native fixture identity | Explicit URL/opt-in and actual database marker precede DDL. Two live clients assert distinct backend PIDs and the same marked database. Authored migration text is adapted only by schema substitution; all constraints/grants/RLS remain. Provider calls are synthetic. |

Commands ran from minion_hub with an environment allowlist containing PATH, NODE_ENV=test, CI and NO_COLOR. The native invocation additionally supplied only the explicit disposable URL and opt-in. No application environment files or provider credentials were used.

- `node node_modules/vitest/vitest.mjs run src/server/db/with-org-core.test.ts src/server/services/job-effects.service.test.ts src/server/services/embeddings.test.ts`: 24 tests in 3 files, exit 0, 1.04 seconds. Log: `/tmp/minion-10-07-root-unit.log`.
- `node node_modules/vitest/vitest.mjs run --config /tmp/minion-360-10-07/vitest.config.ts`: 14 actual native tests, exit 0, 3.59 seconds. Log: `/tmp/minion-10-07-root-native.log`.
- GSD structure verification: valid, no errors or warnings, three bounded tasks.

The temporary native config is a reviewed development lane. Canonical release-lane admission remains a separate config/discovery change. A brief overlap with the separately marked driver baseline fixture occurred; each used its own random schema and backend identity. These tests establish correctness under those identities, not comparative performance.

## Source identity and open gates

Nine frozen source hashes are recorded in 10-07-SUMMARY.md. The native fixture hash after the independent review's explicit backend-identity amendment is `4bda4aa698f8c269ba3e16b45f195f3ea0376d813648af56be6adf4350f49424`.

The current-source snapshot for aggregate check is `/tmp/minion-360-current-check/snapshot.json`, 2,411 copied input files, digest `401e09f02c42881d0b04d253f83b73e62bc42fa5e0112f0545540ae5a9ba9176`. Original installed dependencies are linked; no application .env is copied. Empty synthetic public analytics bindings support SvelteKit type generation. This copy does not alter the frozen dependency-build comparison artifacts.

Aggregate result: SvelteKit sync and the installed svelte-check both exited 0; zero errors and zero warnings. Log: `/tmp/minion-360-current-check.log`. The later three-file test-lane admission is checked separately and is not part of that snapshot.

Remaining gates: finance/brain/corpus adoption and their domain-specific validation; actual pgvector fixtures; healthy driver-failure settlement; deployed migration/grant catalog and old-worker drain; explicit receipt retention and indeterminate-provider recovery policy. Existing TODO(handoff) comments and the root proposal preserve those open ends. No automatic purge, paid retry, dependency upgrade, production mutation or release occurred.

## Foundation extension identity

The later independently admitted10-09 extension adds shared full-manifest arbitration and an additive904 migration. Its updated source hashes supersede these historical10-07 hashes where files overlap. Root independently passed27 unit/25 native foundation tests and a fresh whole-Hub0-error/0-warning check. See10-09-VERIFICATION.md; the original10-07 result did not prove whole-document arbitration.
