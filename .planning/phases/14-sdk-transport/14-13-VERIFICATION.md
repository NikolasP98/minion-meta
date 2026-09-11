---
phase: 14-sdk-transport
plan: "13"
status: passed_scoped_source_contract
reviewed: 2026-09-09
reviewer: docs_history_review
requirements_completed: []
---

# 14-13 independent verification

**The additive canonical version contract passes independent source review, all 46 focused native tests and the package typecheck.** This verifies source behavior only. No emitted package, installed gateway, receiver readiness, sender delivery or production compatibility is certified. Root owns subsequent artifact qualification and global status.

Only this verification report was edited by the reviewer. Root owns the two implementation files. Tests ran in `/tmp/minion-14-13-cuet0lis/shared`, using its existing reviewed native runner and private dependencies. No source/package/build/network/database/browser change or broad suite was performed. TypeScript's native incremental bookkeeping and Vitest cache remain inside that private snapshot.

## Source and semantic findings

Compared the exact new source with the preserved 11-07 private baseline. The only production change is an optional response field/comment plus one scalar helper/TODO at shells.ts lines 542–556. No existing admission, outcome, receipt, observation, byte-bound or digest implementation changed. The helper validates each unknown operand by strict equality with undefined or numeric1 before deciding the result. Only `(1,1)` returns1; `(undefined,undefined)`, `(1,undefined)` and `(undefined,1)` return undefined. Invalid explicit values reject even beside absence. There is no coercion, default version, fallback, dependency or readiness/authority inference.

The helper reuses ShellOutcomeValidationError and its fixed INVALID_SHELL_OUTCOME message. The optional response field has the selected v1-peer/storage-readiness/current-connection comment. A typed legacy `{shellId, heartbeatMs}` response still compiles without the field; the v1 response is tested separately. The exact-site TODO points to the root Shells lifecycle proposal and explicitly leaves required-mode refusal and receiver/sender wiring open.

Existing gateway barrel index.ts line10 re-exports shells.js; root src/index.ts line1 re-exports the gateway barrel. Thus source public exports include the new helper without another file change. The helper/module introduces no Node builtin, import, crypto, SQLite or library dependency. This is source browser-safety/export evidence; a complete next emitted archive must independently verify runtime/declaration/export/transitive closure.

The fixture's four supported pairs and malformed matrix exercise both operand positions against both undefined and1. Classes include null/booleans,0/-0/negative/unsupported/fractional/nonfinite numbers, strings, ordinary/boxed objects, arrays, functions, bigint and symbols. Assertions use the actual canonical error class and fixed vocabulary. A hostile object supplies coercion hooks containing a synthetic-private-canary; neither hook runs and the caught error has the exact fixed message. Expected outcomes are independent of the helper implementation. Existing 21 contract cases remain present and unchanged.

During review, the initially frozen malformed table lacked explicit -0, function and boxed-number representatives required by the admitted review. Root added those three rows and refroze the test file before the independent run. The helper itself did not change. This acceptance gap is resolved; no source defect was found.

## Executed independent checks

CWD for both successful commands: `/tmp/minion-14-13-cuet0lis/shared`.

```sh
env -i PATH=/usr/bin:/bin HOME=/tmp/minion-14-13-cuet0lis LANG=C.UTF-8 /usr/bin/node run-contract.mjs
env -i PATH=/usr/bin:/bin HOME=/tmp/minion-14-13-cuet0lis LANG=C.UTF-8 /usr/bin/node node_modules/typescript/bin/tsc --noEmit
```

Node22.23.2; Vitest2.1.9; TypeScript5.9.3. Focused native result:46/46 passed, one file,389ms total/29ms cases, exit0. Strict package typecheck: exit0, no diagnostics. Root's scoped lint receipt was read and reports zero warnings/errors for the two files; reviewer did not repeat lint.

The reviewer's first typecheck added `--incremental false`; native TypeScript rejected that option combination with TS6379 because the package extends a composite library configuration. This was a runner-argument error, not a source failure. The corrected native declared `--noEmit` check above passed. No config was edited to bypass it.

The runner uses createVitest, checks `ctx.server.config.cacheDir` before `ctx.start`, sets envDir:false and closes in finally. It printed the selected private cache `/tmp/minion-14-13-cuet0lis/shared/private-cache` before execution. The existing deprecated cache.dir option produces a deprecation warning; its actual Vite cache is explicitly set and verified. Private `.vite`, `.vite-temp` and private-cache are real directories, not links to active caches. Six individually linked installed dependencies are the only dependency links recorded in snapshot.json. No explicit HTTP server listen or application bootstrap occurs in this runner; this review does not claim syscall-level network tracing.

Before and after both runs, active shared cache `node_modules/.vite/vitest/results.json` retained SHA256 `923c6fc2ce25a4a6da23404d8c07555160d9bff616ac61547fe1c5a8fce06730` and mtime_ns `1788985431782574128`. Active source/test hashes were equal to the private candidate before execution and unchanged after it. Comparing all31 source entries against snapshot.json found only the two owned contract files changed; the other29 matched.

## Red evidence and limits

Root retained two earlier43-case red receipts. Initial red.log records22 failed new cases/21 passing controls, then an invalid post-run `ctx.vite.config` accessor throws a TypeError. It is not a clean runner receipt. Corrected red-corrected-runner.log checks the private cache before starting and repeats22 failed/21 passed without that runner exception. Its new cases fail because the helper is not yet a function: this establishes a missing public contract, not a pre-existing implementation choosing the wrong version. The three later invalid representatives were added during review and were not part of either earlier43-case red run; they pass in the final independent46-case run.

No unchanged journal tests were rerun and no shared client/socket suites were needed for this scalar change. Prior11-07 journal/native results retain their original byte identity. Full new package preparation, gateway parity/input adoption, receiver/caller/sender integration, exact runtime/image compatibility and immutable production identity remain separate. The old14-11 archive cannot be represented as containing this helper. SDK-01 and AGT-04 remain open.

## Review axes and frozen identities

**Standards: pass.** Two-file production/test scope, strict native types, real canonical tests, fixed errors, native tool isolation and existing barrel reuse are satisfied. Root-fixed missing representatives and reviewer runner correction are recorded rather than hidden.

**Spec: pass for the canonical prerequisite only.** Bilateral explicit v1, legacy absence, rejection of every unsupported scalar class, typed legacy response compatibility and no authority/readiness grant are implemented. Runtime receipt durability and integration are not part of this acceptance.

| Input | SHA-256 |
|---|---|
| Admitted14-13 PLAN | `4f1bd5725b93f4ade45758ea4f3c81aff9024dbe089c385b89466aee45cf46ff` |
| Active/private shells.ts | `e480c90660f7c5936a32be9c933c857223077a893d3d66d0ad4bcc086ebaa8f7` |
| Final active/private shells-outcome.test.ts | `3e8360cfa43e1b11fd12e8efb5f19176e26528b4afb1a1a6cd36c2d813280b49` |
| Corrected private run-contract.mjs | `aa95a3ade8c018ad98954a7929a074dbf529addfd708eb0422778a079eb0e4e3` |
| Initial red.log (includes runner exception) | `a0f2230b72c0939612dbc1ce3f9aec7c9c93f1fbfa2df8a1dc252cfe4b5df538` |
| Corrected43-case red log | `a7127c0fa4cc750ff065fa4869054d9b1ced604e195e96aa9452c932b40a67d2` |
| Preserved11-07 source baseline | `bc1c4ea5cb4c63bec21c1f1c13058e0e474e0485a1a3331139a25965ed601f80` |
| Preserved11-07 test baseline | `e7eab3917d9277b2fc94932a01a93e6ceeeb7790d79c11c5e482281e65a9fc62` |
