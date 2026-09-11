---
phase: 09-security-containment
plan: 02
subsystem: database
requires: []
provides:
  - SQLite-enforced read SQL isolation with statement boundary validation
  - Typed positional database-node input bindings
  - Read-only live infrastructure identity and maintenance gating packet
affects: [flow-editor, saved-flow-migration, runtime-governance]
tags: [sqlite, sql-binding, langgraph, factory, containment]
tech-stack:
  added: []
  patterns: [independent read-only connection, static SQL with positional bindings]
key-files:
  created:
    - proposals/2026-09-09-flow-sql-bindings-migration.md
    - .planning/research/360-infrastructure-verification.md
  modified:
    - minion/extensions/flows/src/data-nodes.ts
    - minion/extensions/flows/src/data-nodes.test.ts
    - langgraph-server/src/flow/compile-flow.ts
    - langgraph-server/src/flow/compile-flow.test.ts
    - langgraph-server/src/flow/types.ts
key-decisions:
  - Use Node22 SQLite readOnly connections rather than a guessed SQL parser or shared connection PRAGMA.
  - Preserve explicit consume marking as a separate write with existing caller authority.
  - Reject legacy interpolation rather than guessing a saved SQL migration.
  - Production gating remains a separate authorized maintenance action with an immutable image and promotion lock.
patterns-established:
  - SQLite supplies the prepared statement boundary through sourceSQL.
  - Only a whole positional value equal to the input marker is substituted.
requirements-completed: []
requirements-source-verified: [SEC-04, SEC-05]
status: source-verified-rollout-pending
verified: 2026-09-09
---

# SQL containment and input binding

Read-node SQL executes on a separate SQLite read-only handle; input messages become bound values without changing SQL text. Changes are local and tested, not deployed.

## Source changes

- `data-nodes.ts`: retain SELECT/WITH API admission but enforce read-only behavior in SQLite. Resolve a shared ledger's actual main database path, fail closed if it has no file, reject appended statements by SQLite's sourceSQL boundary, and close the reader in finally. A missing query database is not created. Explicit consume marking retains its validated-identifier write through the existing writer after a successful read.
- `compile-flow.ts` and `types.ts`: add optional string/finite-number/null params. Replace only an entire binding value equal to `{input}`, forward fixed SQL and params over existing RPC methods, and reject invalid values or legacy SQL interpolation before any gateway request. Read and write nodes both use bindings.
- Keep unresolved caller-capability TODO A9. Add a saved-flow/editor migration TODO and matching proposal. No production definition inventory or migration, UI change, dependencies, commits, staging, branch/worktree changes, or provider calls.

## Verification

| Check | Result |
|---|---|
| Gateway new negative fixtures before fix | 6 failures: three CTE mutations, two appended statements, missing-file creation |
| Compiler new contract fixtures before fix | 9 failures covering bindings, legacy rejection and invalid params |
| `minion`: `node node_modules/vitest/vitest.mjs run --config vitest.extensions.config.ts extensions/flows` | 6 files, 88 tests passed |
| `langgraph-server`: `node node_modules/vitest/vitest.mjs run src/flow/compile-flow.test.ts src/flow/tools.test.ts src/gateway/client.test.ts` | 3 files, 122 tests passed |
| `minion`: `node_modules/.bin/tsgo --noEmit` | Passed |
| `langgraph-server`: `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| Gateway oxfmt check, two changed files | Passed |
| Gateway oxlint, two changed files and 119 rules | 0 warnings/errors after fixing one missing brace |
| Scoped git diff --check | Passed |
| Actual compiled flow to actual gateway handler to disposable SQLite file | Passed; one gateway call, one intended row matched, both fixture rows retained, zero model calls |

The durable integration fixture is `scripts/quality/flow-sql-integration.mts`; run from meta root with `node --import ./langgraph-server/node_modules/tsx/dist/loader.mjs scripts/quality/flow-sql-integration.mts`. It uses actual compiler/gateway source and a disposable SQLite file, with no provider calls. The permanent suites also cover compiler and engine boundaries separately. Gateway's default oxlint config ignores all extensions; the meaningful lint run used a temporary copy of the same config with ignorePatterns cleared and absolute extends, with no repository config edit. An initial relocated config failed to resolve its preset; corrected before claiming lint success.

Negative real-engine tests cover standalone and appended ATTACH/PRAGMA, appended writes, CTE INSERT/UPDATE/DELETE, and missing-file creation. Positive tests cover bound CTE SELECT, semicolons inside literals, null/numeric params, later writes, and existing explicit consume behavior. Appended comments are deliberately rejected with the same single-statement policy. Node v22.23.2 was used; no assumption of the newer SQLite authorizer API.

## Runtime evidence and maintenance boundary

The infrastructure report records a recovered read-only SSH route and exact live identities. Factory is actually running 02900306 with AUTOMERGE/AUTOPROMOTE enabled while containment/memory/lineage flags are zero; its node process is uid0 with a writable Docker socket. Gateway's pinned image records d42a7a8d; that revision's read handler was fetched and matches the original vulnerable source. Local SQL changes have not reached that image.

The maintenance packet sets three flags, preserves exact image identity via an immutable-image Compose override, and holds the promoter's existing flock for serialization. It explicitly does not claim an empty queue snapshot is a drain barrier: deployed process-env pause has no verified runtime control to prevent admission in the check-to-stop interval. A no-interruption maintenance guarantee therefore needs a runtime pause mechanism; alternatively root must obtain explicit acceptance of the bounded interruption risk. No runtime mutation was executed by this agent.

## Remaining rollout work

Before deploying the compiler, inventory saved database nodes, convert SQL placeholders and bindings with review, and expose typed binding controls in the editor. Legacy templates fail closed until converted. This boundary is recorded in source and `proposals/2026-09-09-flow-sql-bindings-migration.md`.

Caller capability propagation and explicit consume authorization remain the existing A9/Phase15 concern; this slice does not introduce a new read-only identity. File-path symlink confinement and unrestricted write-node capability are not newly certified. No restore drill, live tenant drill, paid harness conformance, production SQL test, release, or image deployment was performed.

## Task commits and scope

No commits: parent explicitly required preserving concurrent WIP in the current checkouts. All changes are restricted to assigned SQL sources/tests, approved adjacent types, the migration handoff, and assigned planning/research artifacts. The plan was normalized to the current GSD XML/frontmatter template after implementation; substantive scope stayed the same.
