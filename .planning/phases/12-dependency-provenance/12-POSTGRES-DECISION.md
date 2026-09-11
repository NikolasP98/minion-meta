---
phase: 12-dependency-provenance
plan: "04"
status: qualification_incomplete_documentation_only
candidate_accepted: false
task2_authorized: false
reviewed: 2026-09-09
---

# PostgreSQL driver repair decision

No dependency repair is selected. The baseline reproduced the `postgres@3.4.9` close/rollback crash in four child cases. The isolated upstream-guard candidate was prepared but **never tested**; it is neither accepted nor experimentally rejected. Root stopped further fault injection after an automatic safety-review interruption and restricted this handoff to documentation. Task 2 manifest/lock/patch application and the existing stock fixture remain root-owned and unperformed.

## Fresh primary evidence

Retrieved on 2026-09-09 using the owned headless browser through Browser Harness:

- The npm registry's latest artifact is still **3.4.9**. Its published archive is `https://registry.npmjs.org/postgres/-/postgres-3.4.9.tgz`, integrity `sha512-GD3qdB0x1z9xgFI6cdRD6xu2Sp2WCOEoe3mtnyB5Ee0XrrL5Pe+e4CCnJrRMnL1zYtRDZmQQVbvOttLnKDLnaw==`, shasum `8e9a49cecb1b0e7d67a607f32a53ed54b3055271`. This is registry metadata, not a new archive download or clean-install receipt. [Registry metadata](https://registry.npmjs.org/postgres/latest).
- PR 1168 is **open and unmerged**, head `c3c82a682b8f1fbfad8529a5def0ef14a5f75483`, last updated `2026-07-29T20:12:22Z`. It changes one line in `src/connection.js` to conditionally write when a socket exists and return false otherwise. It adds no pending-query rejection or transaction-queue cleanup. [Pull request](https://github.com/porsager/postgres/pull/1168), [exact proposed diff](https://api.github.com/repos/porsager/postgres/pulls/1168/files).
- Issue 1066 remains open and reports the matching null-socket symptom on an earlier Bun/driver runtime. That report corroborates the symptom, not this fixture's cause or a qualified repair. [Issue 1066](https://github.com/porsager/postgres/issues/1066).

## Isolated candidate identity

Product `node_modules`, manifests and locks are unchanged. Candidate root: `/tmp/minion-360-12-04/guard-candidate`. Preparation script: `/tmp/minion-360-12-04/prepare-candidate.py`; reproducible patch: `/tmp/minion-360-12-04/postgres-3.4.9-guard-candidate.patch`; full file inventory: `/tmp/minion-360-12-04/guard-candidate-receipt.json`.

The candidate applies the exact upstream conditional-write expression to both installed Node entrypoints. CommonJS receives the mechanically equivalent one-line change, which is not itself present in the one-file upstream PR. No upstream build or package-install script is run.

| Artifact | SHA-256 |
|---|---|
| Installed ESM `src/connection.js` | `ee3a218d9aa6a6f2887c1a19da50009335fe84c11a5431d5cab72d6bc528632f` |
| Installed CommonJS `cjs/src/connection.js` | `ce6d375809baad79963ef9b3773e6ac757bcf6da2362d4d85482bb14c2c751be` |
| Guard ESM `src/connection.js` | `984414287cf9075c3a45ac8ab14a6c3da64690c8f804277a6661bf88d73f514a` |
| Guard CommonJS `cjs/src/connection.js` | `97ea65bae558e0806f7a59ce12742a84c56c2cddd78ddca27cccbe4a46e934f6` |
| Candidate patch | `e581ef477edecbe1b0ab99a1690985945be35e36bae6781fc108461c85a1de21` |
| Candidate sorted path/hash inventory | `d22aa9978cf7a8fed3b4d3ff1ae51d66bdf6c351e40f326608189dd44a8ae840` |

Installed Node is `v22.23.2`, Bun is `1.3.4`; the candidate tests select Node ESM and CommonJS explicitly. Bun shares the ESM source but its runtime is not qualified by a Node test. Workerd (`cf/src/index.js`) is unchanged and unqualified. No package-wide support certificate is implied.

## Required runtime outcome

The new SQL integration fixture uses the root-owned marked PostgreSQL 17.10 loopback substrate. Its development config selects only the new fixture and reuses the canonical disposable config's URL/opt-in guard. Each child rechecks database and schema markers. Fault injection targets only its announced backend PID after the parent verifies that PID's exact fixture application name and blocked row-lock state.

Rollback-only and transaction-queued cases run in separate child processes for each Node entrypoint. Acceptance requires active write failure, every transaction-local/sent/rollback caller settling, a queued pool caller succeeding, subsequent healthy reuse on a new backend, normal process exit, no global exception handler, and independent storage proof that a committed row survived while the interrupted write was not replayed. A five-second caller watchdog or parent kill is always failure.

Source inspection identifies a concern to challenge: `begin()` owns a transaction-local queue in `src/index.js`; connection closure rejects active/sent work and resets reservation state without visibly draining that local queue. The conditional write guard does not address that ownership boundary. This remains a source-based concern: the baseline process crash prevented later settlement evidence, and no candidate run established a hang or healthy recovery.

## Existing baseline evidence

The single completed baseline invocation used the temporary development config, the explicit marked loopback fixture and the installed unmodified driver. Log: `/tmp/minion-360-12-04/baseline.log`, SHA-256 `7246d7fedac9bfa3529e529778d92dbf591dd43336939523a2ad197b70744ef2`. Result: **4 failed tests**, one failed file, 1.27 seconds. This is red reproduction evidence, not qualification success.

| Entrypoint | Scenario | Observed child result |
|---|---|---|
| Node ESM | Rollback-only | PID 3240216, exit 1, null-socket `nextWrite` TypeError. Active query and outer transaction reported `CONNECTION_CLOSED` before the crash. |
| Node ESM | Transaction queued | PID 3240242, exit 1, same TypeError. Active, sent and outer transaction reported `CONNECTION_CLOSED`; local queued/rollback/pool-reuse completion was not established. |
| Node CommonJS | Rollback-only | PID 3240261, exit 1, same TypeError in the CommonJS entrypoint. |
| Node CommonJS | Transaction queued | PID 3240273, exit 1, same TypeError in the CommonJS entrypoint. |

The common failure is `TypeError: Cannot read properties of null (reading 'write')` at `Immediate.nextWrite`, `connection.js:255:22`. Every case reached and passed the independent storage assertion before failing the normal-exit assertion: the committed row remained, the guard value stayed zero, and the interrupted transaction's row was absent. This proves that bounded storage observation only; it does not prove all callers settled or the driver pool recovered.

The source verifies the exact child application name and blocked PID before the fault action. The baseline log records all four expected child PIDs and schema-drop notices. A brief overlap with root's separate foundation fixture occurred; these identity assertions passed, and root reported its foundation run passed. Root subsequently reported no remaining fixture process. No additional runtime query, process action, candidate test or dependency change was performed after the documentation-only instruction.

Fixture SHA-256: `ffb3126100c4c426ce8d6c3b43966fca0c21f0776c6a358a38451fdfc846e009`. Development-config SHA-256: `5deb19bf1d92c23d291eae860bb6fcb91c9005e0fa72babadf73c63f8687458b`. The new fixture is not in the canonical disposable allowlist. Formatting and an extracted child-source syntax check passed before the stop; no full Hub typecheck or build was run for this fixture.

## Application/removal gate

Do not apply the isolated patch: its runtime behavior is unqualified. Any future evaluation requires the interrupted action's authorization/safety boundary to be resolved first; this document is not permission to resume fault injection. A passing candidate would still need independent review, tracked Bun patch/clean-install provenance, domain stock/job recovery and packaging qualification under Task 2. Remove any future temporary patch only when a pinned official release passes the same caller-settlement and domain fixtures. If later authorized evidence shows the narrow guard hangs, retain the failing reproduction and request a separately admitted transaction/connection-ownership or driver-adapter plan; do not silently grow this patch into a maintained driver fork.

Automatic safety review interrupted the fault-injection work. No detailed rejection reason was included in the root handoff; the executor did not reroute or repeat the action.
