# 11-10 private sender correction receipt

Candidate: `/home/nikolas/.cache/minion-qc/sender-11-10-dtpxk5wu/meta`.
Original preserved sender: `/home/nikolas/.cache/claude-tmp/meta-11-03`.
Authority: admitted `11-10-PLAN.md`, D360-19; four source/test files only. This is author qualification awaiting independent root review, not phase/release acceptance.

## Result and exact freeze

Native Node 22.23.2 with SQLite 3.51.3 passed **102/102** focused cases: 66 bridge and 36 journal, zero skips, final traced execution 11.44 seconds. Actual package TypeScript emission and final `--noEmit` passed. The emitted journal test launches raw Node and verifies fresh insertion, replay denial, durable outcome, reopen and delivery ACK using the emitted shared contract.

`freeze/manifest.json` SHA-256: `65c26c42c31a1ed2d20ed06995ffe9a18d0de31857224bd0f69d9ebc453de33c`.

| File under packages/shells-bridge/src | Frozen SHA-256 |
|---|---|
| bridge.ts | 553c574e7899a4e4d71e808c011633dce2606368f7ddbf79758dde65570ebee0 |
| bridge.test.ts | ce6c51034fcba1982c3eccd4363212cb441cfae3347db3519a80cb8972384680 |
| run-journal.ts | 95bab6f884ac79ec2ed36add58ca4a5a878ca90ab07969041d474192bcbfc8e1 |
| run-journal.test.ts | 341cf5786cfb91464bcd449eb702b8bbf997f1ad2535d8036d6fdf2af5993012 |

The immutable four-file copies are under `freeze/files/`. `checks/preservation.json` identifies original hashes, actual shared source/emitted bytes, and emitted journal SHA `d997724ee089092b5b924f8ac1f4f4196e2121859525cce9089904cbd232f42d`.

## Behavior

`RunJournal.admitForDispatch()` performs identity checks and insertion in the existing BEGIN IMMEDIATE transaction. Only the return after its successful COMMIT can carry `fresh: true`. Identical persisted records return `fresh: false`, including completed records and records admitted through the preserved `admit(): JournalRun` API. Schema, constraints, reserved capacity, policy, and disk format are unchanged. No pre-read determines permission.

Bridge creates process-local ownership and calls the existing ACP adapter only for the fresh result. Replay responds with the canonical admission response without prompting. This includes a committed admission before any call and a reopened unresolved run. The latter remains occupied; automatic recovery is deliberately unavailable.

The stable ACP 1.4.0 reason projection accepts only `end_turn`, `max_tokens`, `max_turn_requests`, `refusal`, and `cancelled`. The last becomes aborted; the others become final with their reason retained. A reported end of a turn is not task success or process-exit proof. Null, primitive, array, missing, and unknown reasons remain unresolved, as do arbitrary/timeout-like rejections and synchronous call failure.

Terminal persistence must succeed before the exact local run/session owner is released. Method-level commit failure leaves the journal unresolved and the owner retained. A failed uncertainty write likewise retains ownership and reports a fixed safe message. Retired shutdown callbacks cannot settle the old run. Successful outcome persistence releases the owner before delivery; existing pending delivery, ACK validation, cancellation observations, same-process duplicate, and terminal restart replay controls remain.

## Executed evidence and limits

- `checks/red.log`: 17 intended failing cases, 83 passing controls, plus one separate emitted-test setup failure (18 failed / 83 passed). The old single rejection-means-terminal-error test was replaced with two uncertainty cases. The final suite adds 22 net cases over the original 80; the synchronous throw case was added as a green control after the original red set.
- The emitted child originally supplied only LANG, losing the parent's explicit TMPDIR and falling back to quota-limited `/tmp`; SQLite reported disk I/O error. The owned test now passes `TMPDIR: tmpdir()` to the child. This is a fixture environment repair, not a journal-driver repair.
- `checks/red-runner-rejected.log`: the first runner assertion rejected Vite 5's normalized envDir. Installed Vite 5.4.21 uses `inlineConfig.envFile !== false` as its actual loadEnv gate (installed chunk line 66486). `run-tests.mjs` supplies and verifies `envFile:false`; it also sets `envDir:false`, `configFile:false`, private cache, one worker, exact two-file inclusion, and `passWithNoTests:false`. No `.env*` files were copied.
- `checks/build.log`: an initial invalid `--incremental false` invocation failed because the inherited configuration is composite. Its private tsbuildinfo changed; this artifact is explicitly recorded. The corrected build uses a separately named private `--tsBuildInfoFile`; `build-final-102.log` and `typecheck-final.log` both exited zero. No failure is claimed to have produced a qualified artifact.
- `checks/final-102.log`: final 102-case run. Earlier `green.log` passed source tests before the corrected emitted rebuild; `final-tests.log` passed 101 after emission. Only the final 102-case receipt is the final freeze qualification.
- `checks/native-102.trace` / `network-final.json`: 105 bind/connect calls to owned 127.0.0.1 fixtures and one local AF_NETLINK interface query. No non-loopback IP or remote Unix connection appears. Executables are native test tooling and the explicit emitted Node smoke; fake ACP does not start a harness. This is observed tracing, not a claimed network sandbox.
- `checks/lint.log` and `lint-baseline.log`: zero errors, the same existing unused `handleBackup(params)` warning. No added lint debt. `whitespace-final.json` records four no-index diff whitespace checks with empty diagnostics; exit 1 denotes changed files. No broad formatter rewrite or full-project formatting claim.
- All 29,016 copied file identities and 1,471 symlinks were inventoried. No link escapes the private snapshot. Copied dependencies and shared source/emission are unchanged; only the four owned source files, their private emitted outputs, and the recorded private build-info artifact changed. New Vite cache files remain private. All four original staged source hashes still match the captured before-images. No git mutation command was used; an independent before/after index digest was not captured, so this receipt does not invent one.

## Reproduction

From the candidate `packages/shells-bridge` directory:

```bash
env -i PATH=/usr/bin:/bin \
  HOME=/home/nikolas/.cache/minion-qc/sender-11-10-dtpxk5wu/home \
  TMPDIR=/home/nikolas/.cache/minion-qc/sender-11-10-dtpxk5wu/tmp \
  LANG=C.UTF-8 NODE_OPTIONS=--max-old-space-size=1024 \
  /usr/bin/node /home/nikolas/.cache/minion-qc/sender-11-10-dtpxk5wu/run-tests.mjs
```

Emission uses the same sanitized environment and `/usr/bin/node node_modules/typescript/bin/tsc -p tsconfig.json --tsBuildInfoFile /home/nikolas/.cache/minion-qc/sender-11-10-dtpxk5wu/checks/candidate.tsbuildinfo`. Type-only verification adds `--noEmit` and uses `checks/types.tsbuildinfo` instead. No package install or package-manager lifecycle is necessary.

## Standards and spec review

Standards: no new dependencies, schema fields, broad types, suppression directives, credential inputs, active source mutations, or authority aliases. Only the owned four files changed; existing compact formatting remains. Native tests use real SQLite and the real bridge over synthetic WS/ACP boundaries. Local ownership assertions supplement externally visible no-reprompt and busy behavior.

Spec: all three admitted invariants have executed coverage. Fresh-versus-replay is a transaction result, unknown results never become fabricated terminal outcomes, and failed durable commit cannot release the current local owner. Existing journal/cancellation/delivery controls remain in the suite. The shared schema and legacy `admit()` contract remain compatible.

Remaining limits stay paired with the root proposal `proposals/2026-09-08-platform-qc-remediation.md`: official ACP initialization/new-session/prompt/cancel mapping and true lifecycle evidence (`bridge.ts:453`, cancellation at `:544`, notification correlation at `:607`); explicit unresolved reconciliation and process generation (`run-journal.ts:58`); actual COMMIT/process/power-loss qualification (`run-journal.test.ts:145`); minimum Node 22.13 and unsupported-runtime evidence (`run-journal.test.ts:240`). The prior qualified Node 22.23.1 run belongs to the earlier journal slice, not this correction. No SDK install, current sender image, publication, deployment, or real harness/provider conformance is claimed.

The verified SDK artifact report's raw notification logging concern remains a separate SDK adoption decision. This four-file correction does not modify the SDK or ACP client.
