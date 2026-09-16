---
phase: 12-dependency-provenance
plan: "04"
status: qualification_incomplete_documentation_only
candidate_accepted: false
task2_completed: false
requirements_completed: []
completed: 2026-09-09
key-files:
  created:
    - minion_hub/tests/dependencies/postgres-close-recovery.sql.integration.test.ts
    - .planning/phases/12-dependency-provenance/12-POSTGRES-DECISION.md
---

# 12-04 driver reproduction handoff

The installed `postgres@3.4.9` failed all four new baseline caller-settlement cases. The upstream conditional-write candidate exists only in an isolated temporary copy and has **not been executed or selected**. Root switched this task to documentation-only after automatic safety review interrupted further fault injection. Task 1 selection and all Task 2 application/qualification remain incomplete.

## Evidence already collected

- Fresh primary-source checks found npm latest still at 3.4.9 and upstream PR 1168 open/unmerged at `c3c82a682b8f1fbfad8529a5def0ef14a5f75483`. The exact registry metadata, upstream links and candidate identities are in `12-POSTGRES-DECISION.md`.
- The new fixture separates Node ESM/CommonJS and rollback-only/queued-transaction scenarios into four child processes. It uses explicit disposable URL/opt-in, database/schema markers and a verified blocked child PID. It installs no global exception handler. Its five-second settlement watchdog is a failure condition.
- One baseline run completed: **4 failed tests**, one failed file, 1.27 seconds. Each child exited 1 with `TypeError: Cannot read properties of null (reading 'write')` at `connection.js:255:22`. Active and outer transaction promises rejected before the crash; queued mode also observed the already-sent caller reject. Remaining queued/rollback/reuse settlement was not proven.
- In each baseline case the independent storage assertion passed before the normal-exit assertion failed: committed data survived and the interrupted transaction's write was absent. The four schema-drop notices are retained in the log. Root reported no remaining fixture process after the run; no new runtime checks were made after the stop instruction.
- The candidate applies the upstream one-line guard to ESM and the equivalent CommonJS source in `/tmp/minion-360-12-04/guard-candidate`. Product driver bytes, manifests, locks and existing stock tests were not modified. Workerd and Bun runtime behavior were not qualified.

Historical baseline command, already completed; **not authorization to rerun**:

```sh
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55439/minion_qc_jobs_stock node node_modules/vitest/vitest.mjs run --config /tmp/minion-360-12-04/vitest.config.ts --reporter=verbose
```

The actual invocation additionally unset normal Supabase URL variables. Log: `/tmp/minion-360-12-04/baseline.log`. The temporary config selects only this new fixture and inherits the explicit disposable guard. Canonical native-lane admission has not occurred.

## Source and artifact identity

| Artifact | SHA-256 |
|---|---|
| New SQL integration fixture | `ffb3126100c4c426ce8d6c3b43966fca0c21f0776c6a358a38451fdfc846e009` |
| Temporary development config | `5deb19bf1d92c23d291eae860bb6fcb91c9005e0fa72babadf73c63f8687458b` |
| Baseline log | `7246d7fedac9bfa3529e529778d92dbf591dd43336939523a2ad197b70744ef2` |
| Isolated two-entrypoint patch | `e581ef477edecbe1b0ab99a1690985945be35e36bae6781fc108461c85a1de21` |
| Candidate sorted path/hash inventory | `d22aa9978cf7a8fed3b4d3ff1ae51d66bdf6c351e40f326608189dd44a8ae840` |

Installed source hashes remain ESM `ee3a218d9aa6a6f2887c1a19da50009335fe84c11a5431d5cab72d6bc528632f` and CommonJS `ce6d375809baad79963ef9b3773e6ac757bcf6da2362d4d85482bb14c2c751be`. Runtime evidence identifies Node `v22.23.2` and PostgreSQL `17.10`. Bun `1.3.4` was identified but not used for qualification. Formatting and child-source syntax checks passed before the stop; no full Hub check/build or clean-install/package qualification ran.

## Open gates

There is no proof that the guard settles every caller, avoids an indefinitely pending rollback, preserves pool ownership or supports healthy reuse. A possible transaction-local queue gap is a source-review concern, not a demonstrated candidate hang. Do not label the untested candidate either accepted or experimentally rejected.

The existing driver TODO/proposal recorded by 10-03 remains open. Root owns canonical status, proposals, future native-lane admission and any resolution of the interrupted action's boundary. No release, dependency application, registry archive download/verification or broader driver rewrite is authorized by this handoff. DEP-01, JOB-02 and CAP-02 remain open.

Automatic safety review interrupted the fault-injection work. No detailed rejection reason was supplied in the root handoff. No further connection termination, candidate testing or dependency change was attempted after the documentation-only instruction.
