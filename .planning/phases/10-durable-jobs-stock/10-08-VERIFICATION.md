---
phase: 10-durable-jobs-stock
plan: "08"
verified: 2026-09-09
status: gaps_found
slice_status: passed
score: 3/3 scoped must-haves verified
requirements_completed: []
gaps:
  - truth: All phase-10 handlers preserve one canonical terminal outcome and deterministic effect identity.
    status: partial
    reason: Test-lane isolation qualifies the admitted stock/groupchat fixture but does not implement other handler adoption or operational reconciliation; the existing 10-03 phase gates remain open.
    artifacts:
      - path: .planning/phases/10-durable-jobs-stock/10-03-VERIFICATION.md
        issue: Remaining handler, reconciliation and rollout gates are explicitly recorded.
    missing:
      - Complete and independently qualify the remaining phase-10 foundation/adoption plans and recovery gates.
---

# 10-08 independent test-lane verification

The bounded test-lane slice passes all three must-haves. Independent execution passed **8 discovery tests** and **22 actual native PostgreSQL tests** through the dedicated config. An additional unreachable-runtime invocation failed qualification with exit 1. These results do not close the broader phase-10 goal or the full JOB-02/AGT-02 requirements.

Phase goal: retried, concurrent and interrupted jobs preserve one authorized business effect and recover without reposting stock history. Plan identity: `da8f3268ceef8efba7ed17947d619d596da8b93070fb9369d4a672fb87a4947b`. Hub branch: `feat/level-2026-07-30`. This review changed only this verification report.

## Observable truths

| Truth | Result | Independent evidence |
|---|---|---|
| Default unit discovery excludes SQL integration files despite normal credentials. | Verified | Default config appends `**/*.sql.integration.test.ts` to Vitest's default exclusions. The actual discovery subprocess supplies a synthetic `SUPABASE_DB_URL` and selects no SQL integration file while retaining ordinary unit families. |
| Disposable qualification discovers only the reviewed fixture and fails missing identity or empty selection. | Verified | Exact one-file allowlist, startup opt-in/URL validation, existing-file check and `passWithNoTests: false`; four negative config cases and two actual empty/legacy runs fail. Native marker and unreachable-runtime behavior independently exercised. |
| Existing aliases, setup and dependency-security discovery remain intact. | Verified | Base config diff retains the Svelte plugin, setup file and six aliases. Dedicated config spreads that actual base and replaces include/exclude arrays. Discovery retains the dependency-security fixture; native execution exercises actual `$server`/`$lib` imports and setup. |

## Artifacts and wiring

| Artifact | Verification |
|---|---|
| `vitest.config.ts` | Default include families remain `src`, `scripts`, and admitted `tests/dependencies`; standard exclusions remain present. |
| `vitest.disposable.config.ts` | Imports the base config and shared URL validator. Explicitly replaces broad include rules with the single existing job-stock fixture; retains standard excludes, forces one worker and denies an empty run. No future or legacy fixture is automatically admitted. |
| `scripts/qc/test-lanes.test.ts` | Executes installed Vitest in environment-whitelisted subprocesses; verifies selected file names and nonzero invalid/empty runs. No legacy SQL module is imported to test rejection. |
| `scripts/qc/README.md` | Commands select the correct lanes; marker, runtime owner, future admission process and absence of a general network-free certificate are accurate. |
| `job-stock-concurrency.sql.integration.test.ts` | Child invocation now explicitly selects the disposable config. Its schema/URL/opt-in environment and process/crash assertions remain intact. |

The child amendment was checked mechanically: removing its single added `--config`, `vitest.disposable.config.ts` pair reconstructs SHA-256 `add47b19dad21f860c4c870d41d1b35bd0e8313c20ac3d74782496239fef96e1`, exactly the independently accepted pre-amendment fixture. No other test logic changed.

Installed Vitest's `cac` files-only branch calls `getRelevantTestSpecifications` and `outputFileList`; it does not enter `ctx.collect`/test-module collection. This confirms why default discovery can inspect file selection safely. An empty listing is allowed to exit 0, so the two rejection tests correctly use actual `run` with an unmatched/legacy filter. This is stronger than asserting an empty listing fails.

The dedicated config validates only URL shape and opt-in. The actual fixture's unconditional `beforeAll` calls `openDisposablePostgres`, which establishes database owner/name/marker and loopback identity before schema creation. Its crash child separately checks the exact schema marker. There is no missing-runtime `runIf` or successful skip path. Dynamic UI data-flow checks are not applicable to this configuration/test slice.

## Independent executions

All commands ran from `minion_hub/` with installed dependencies. The PostgreSQL work used only the already-authorized marked loopback fixture; no service was started or stopped, and no production/provider call or full Hub check ran.

| Command/check | Result |
|---|---|
| `node node_modules/vitest/vitest.mjs run scripts/qc/test-lanes.test.ts` | **8/8**, exit 0, 10.46 s; `/tmp/minion-10-08-independent-discovery.log`. |
| `MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55439/minion_qc_jobs_stock node node_modules/vitest/vitest.mjs run --config vitest.disposable.config.ts` | **22/22**, exit 0, 17.60 s, no skips or unhandled parent errors; `/tmp/minion-10-08-independent-native.log`. Normal Supabase URL variables were explicitly unset for this invocation. |
| Same dedicated config with explicit loopback port `1` and a real test-name filter | Expected exit **1**, failed suite with `Disposable PostgreSQL identity could not be established`; `/tmp/minion-10-08-independent-missing-runtime.log`. Vitest reports 22 unexecuted/skipped cases after the failing setup hook; this is a red qualification, not a skipped-green pass. |
| Final read-only runtime/catalog check | PostgreSQL **17.10**, database `minion_qc_jobs_stock`, owner `minion_qc`, marker `minion-360-disposable:v1`; **0 fixture schemas, 0 public tables**. |

The native run retains the deliberately failing isolated postgres-js crash child and proves its expected exit plus parent recovery. This does not certify the installed driver's health; 12-04 owns that correction. The child is not mistaken for an unhandled error in the successful parent run.

## Requirements and remaining phase gates

JOB-02 benefits from an explicit reproducible native lane, but test discovery does not implement effect ownership for the remaining handler families. AGT-02 also requires paid-provider exclusion and deadline contracts beyond SQL fixture selection. Neither requirement is closed here. Phase-10 roadmap criteria for fenced ownership, canonical effects, stock convergence and interrupted recovery retain their existing implementation/verification records; this slice reruns their current native fixture without expanding those guarantees to all handlers or deployments.

No blocking anti-pattern or missing link was found within the three scoped truths. Future fixture admission is intentionally manual and has a source TODO/proposal pointer. Legacy SQL tests remain preserved and excluded from both default and initial disposable lanes; this report does not qualify them. No additional human test is needed for this bounded configuration contract. Operational rollout, production schema/grants and broader phase recovery remain separate gates.

## Verified source SHA-256

| File | SHA-256 |
|---|---|
| `vitest.config.ts` | `dd2700880329d8a250ad8d1978e175fdeaf0000142efbcef7399642a5ec94b10` |
| `vitest.disposable.config.ts` | `54a4214a94e4852b5890b00a6309a7a5e3b91feab29e01f3af99167211ff62e9` |
| `scripts/qc/test-lanes.test.ts` | `ab57266812c90b812187df1359814ed1c6e945f532ca12c06b96fab137611fcc` |
| `scripts/qc/README.md` | `8b7d38f99ad7e56306be95af06612978abc3996985fa2f68ba56b6b94bcfd8a9` |
| `src/server/services/job-stock-concurrency.sql.integration.test.ts` | `346e9479dd808d3a9408a49007baadedf362a83fe17cad6fa976d082c83a7d6c` |

## Reviewed foundation admission

The dependency lane independently admitted the exact job-effects fixture after root source/marker review and native qualification. Root added only that path beside job-stock, asserted the sorted two-file discovery list and corrected the README to distinguish a marked database from a random isolated schema. The amended discovery suite passed 8/8 in 8.97 seconds, exit 0 (`/tmp/minion-10-08-foundation-discovery.log`). The selected foundation fixture then passed 14/14 through the canonical config in 3.39 seconds, exit 0 (`/tmp/minion-10-07-canonical-native.log`). The existing 22-case stock fixture was unchanged and was not rerun in this amendment. No driver fixture is admitted.

Current continuation identities:

| File | SHA-256 |
|---|---|
| minion_hub/vitest.disposable.config.ts | 42e5ea4cb44a1ce0a60a4f16fa7b6c1dc066d115c20e435c06b7fdde9d8593e2 |
| minion_hub/scripts/qc/test-lanes.test.ts | a33e138948f7173bb1eef213363e8402e9eddb28ff013ee8444fa2e3f4a26b94 |
| minion_hub/scripts/qc/README.md | ed67cc0d1359f5f86b078abca28d94dfc74e98aa165a624295e395beeab5f1cc |
| .planning/phases/10-durable-jobs-stock/10-08-PLAN.md | d18108e3ca50afe4d11d8420fbc10b91a87ab07698b5e8f8bfa528c762f724f1 |


## Normal-environment test quarantine follow-up

Root expanded the default exclusions to the exact `brain-business-persistence.service.test.ts` and `crm-funnel.concurrent.integration.test.ts` paths. Both eagerly load normal database credentials; the latter selects an existing organization and writes. Neither is admitted to the disposable lane. Four offline business regressions remain preserved but quarantined with the mixed file, pending an explicit fixture split. Exact-site TODOs and the platform QC proposal record this coverage gap.

The discovery assertion failed before the business exclusion, then passed. Final root discovery execution passed 8/8 in 12.45 seconds (`/tmp/minion-360-lanes-final-green.log`). Independent reviewer reran the same eight cases: 8/8 in 18.10 seconds. Neither legacy module nor the full test suite was executed. Bounded credential-loader search found these two files plus explicitly mocked pool/client tests; this is not a certificate for every transitive test side effect.

A root files-only command placed an optional `--json` output argument incorrectly and overwrote the CRM test. It was restored byte-for-byte from the verified snapshot before the TODO-only edit; restored SHA-256 `7a510b7f9ce75d87fa34b64319a0ff023ad95e254274feebacd68e0897927f95`. No test import or SQL execution occurred. The discovery helper now puts `--json` last.

Current PLAN: `823093fde5e781213a63b2150b34e2d6512b21a15758a102eb76fd4ee2d9b003`. Current source hashes supersede the earlier rows only for these files:

- `vitest.config.ts`: `abf9d3601afeca8dd7599780e004580e051bfa789dc6ee435ece4fd74db46241`
- `scripts/qc/test-lanes.test.ts`: `c1d2e6d2bed7bf4642c0cfb9ede17697f073f23ca2d73b94e93f1430848b8c5f`
- `scripts/qc/README.md`: `282924eb722f83dafc6001f7ac414ac61009707e6fa86e236ada11b4b3351bcf`

Finance and brain native fixtures still have separate explicit temporary qualification configs; no implicit admission or driver fault-injection rerun is authorized.
