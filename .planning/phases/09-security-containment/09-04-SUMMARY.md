---
phase: 09-security-containment
plan: 04
status: source_implemented_verification_pending
implemented: 2026-09-09T05:50:00Z
requirements-addressed: [SEC-08, SEC-04]
requirements-completed: []
admitted_plan_sha256: 86d18fa068e7e252214c3ec83f175b6723a4541d02280fc79e9b070213afde4a
key-files:
  created:
    - minion/extensions/flows/src/data-paths.ts
    - minion/extensions/flows/src/data-paths.test.ts
  modified:
    - minion/extensions/flows/src/data-nodes.ts
    - minion/extensions/flows/src/data-nodes.test.ts
    - minion/extensions/flows/minion.plugin.json
deviations:
  - Unknown borrowed shared writers and consume requests fail closed pending an initializer receipt contract, as directed by the orchestrator after inspecting provenance limits.
  - New handler confinement tests live with the new path tests to keep every owned TypeScript file below 500 lines; the prior data-node suite remains intact.
---

# 09-04 implementation evidence

The reproduced symlink and SQL file-management escapes are contained in local source. Existing files and SQLite `-journal`, `-wal` and `-shm` companions now pass a common path policy before use. Writer SQL is limited to one prepared CRUD/CTE statement. **Deployment and phase completion remain pending.**

## Implemented behavior

| Boundary | Result |
|---|---|
| Operator roots and caller descendants | Operator-configured roots resolve to a canonical directory; caller descendant symlinks, dangling links, hardlinked/nonregular files, unsafe writable directories, NUL and lexical escapes are denied. Exact externally configured ledger access does not admit sibling files. |
| Missing targets | Missing reads fail without file/directory creation. Allowed write parents are created one component at a time with mode 0700; output files use mode 0600. Missing writer databases may be initialized empty by SQLite; schema DDL remains unavailable through caller SQL. |
| Output writes | No-follow/nonblocking descriptor open; regular-file, link count and inode/device checks precede truncation. Overwrite/append uses the checked descriptor and closes it in `finally`. This protects the tested final-file substitution, not hostile concurrent ancestor replacement. |
| SQLite companions | Existing rollback journal/WAL/shared-memory companions require the same regular, single-link, owner/mode policy. Suspect companions are not removed or repaired. SQLite engine-managed temporary files remain outside this limited resource-family guarantee. |
| Read SQL | Prior independent `readOnly:true` reader and `sourceSQL` boundary are retained. Fresh readers can use the actual file of a shared ledger opened at a nondefault path; in-memory shared ledgers remain unavailable. |
| Owned writes and consume | Fresh extension-owned handles receive a module-lifetime ownership/inode receipt. Every reuse checks current identity, known sidecars and schema/function/connection anomalies. Valid bound CRUD and owned consume remain supported. |
| Borrowed/unknown handles | Unknown cached writer entries and borrowed shared writers fail closed. Shared consume requests deny before opening the reader. No shared handle is closed, detached or reset. |
| Writer SQL | INSERT, UPDATE, DELETE, REPLACE and WITH candidates require full prepared statement equality. VACUUM, ATTACH, DETACH, PRAGMA, schema DDL and appended commands cannot execute. Existing non-main/non-temp attachments deny the writer rather than being detached. |
| Connection/schema anomaly checks | Writable-schema mode, unexpected functions/modules, triggers, views and virtual-table schema deny before caller SQL. A fresh reference connection describes the current Node build's function/module surface; matching introspection is explicitly **not** callback attestation or proof that old persisted data is clean. |
| Errors | Paths/SQL/internal exception payloads are replaced by fixed bounded error messages. RPC method names and existing reply envelopes remain unchanged. |

`minion.plugin.json` now describes the conditional filesystem policy and the unavailable borrowed writer/consume behavior. No trust flag was added to caller input or operator config.

## Verification performed

Platform: Linux, Node **22.23.2**. Installed gateway Vitest **4.1.10**. No new packages, provider calls, live endpoints or production filesystem/database actions.

| Check | Actual outcome |
|---|---|
| Initial regression suite before implementation | **10 failed / 21 passed**. Actual-handler fixtures reproduced database/file aliases, SQLite companions, unrestricted writer SQL and unqualified schema/function behavior. `/tmp/minion-09-04-red.log`. |
| First handler implementation | **31/31 passed**. `/tmp/minion-09-04-green-initial.log`. |
| Initial helper + handler acceptance | **48/48 passed**. `/tmp/minion-09-04-focused.log`. |
| Full flows suite after broad acceptance | **7 files / 129 tests passed**. `/tmp/minion-09-04-full.log`, then after test organization and standards fixes `/tmp/minion-09-04-full-final.log`. |
| Final targeted path/handler suite | **1 file / 42 tests passed**, after adding a real FIFO fixture and `O_NONBLOCK`. `/tmp/minion-09-04-path-final.log`. This overlaps the full suite; do not sum these counts. |
| Gateway TypeScript | `node_modules/.bin/tsgo --noEmit` passed, including after test reorganization. `/tmp/minion-09-04-typecheck.log`, `/tmp/minion-09-04-typecheck-final.log`. Final descriptor flag/FIFO fixture was covered by the targeted test and type-aware lint. |
| Actual compiled-flow integration | Existing `scripts/quality/flow-sql-integration.mts` passed: gatewayCalls 1, matchedRows 1, retainedRows 2, modelCalls 0. |
| Scoped formatting | All five owned paths pass installed oxfmt; final two files were formatted after the FIFO addition. |
| Scoped lint | Actual **four-file** type-aware lint passed with 134 rules; final two changed files also passed separately. See configuration qualification below. |
| Diff and size | `git diff --check` passed. Owned TypeScript files remain below the repository's 500-line threshold. |

Repeat commands from gateway:

```bash
node node_modules/vitest/vitest.mjs run --config vitest.extensions.config.ts extensions/flows
node node_modules/vitest/vitest.mjs run --config vitest.extensions.config.ts extensions/flows/src/data-paths.test.ts
node_modules/.bin/tsgo --noEmit
node_modules/.bin/oxfmt --check extensions/flows/src/data-paths.ts extensions/flows/src/data-paths.test.ts extensions/flows/src/data-nodes.ts extensions/flows/src/data-nodes.test.ts extensions/flows/minion.plugin.json
```

From meta root:

```bash
node --import ./langgraph-server/node_modules/tsx/dist/loader.mjs scripts/quality/flow-sql-integration.mts
```

The repository oxlint config ignores `extensions/`, even when passed explicit paths with `--no-ignore`; its initial zero-file result was **not counted**. A temporary `/tmp/minion-09-04-oxlint.json` copies the repository config, preserves its installed preset/rules, and removes only the directory ignore. Run:

```bash
node_modules/.bin/oxlint --config /tmp/minion-09-04-oxlint.json --type-aware extensions/flows/src/data-paths.ts extensions/flows/src/data-paths.test.ts extensions/flows/src/data-nodes.ts extensions/flows/src/data-nodes.test.ts
```

One exact-line `typescript/no-base-to-string` exception preserves the pre-existing RPC `String(input)` coercion. Changing structured input serialization is outside this plan; the exception states that reason. No `any` or `@ts-nocheck` was added. The temporary lint configuration is evidence tooling, not a repository policy change.

## Compatibility loss and required follow-up

1. **Borrowed shared writer/consume is intentionally unavailable.** `getMessageLedgerDb()` exposes a mutable global handle without a trusted initializer receipt. `database_list`, ownership or `function_list` cannot prove callback identity. Root explicitly directed denial of unknown provenance. Fresh shared reads are supported through a separate read-only handle. The source has an exact-site TODO linking the QC proposal.
2. **Restoration needs a bounded initializer contract.** Proposed child scope: `minion/src/infra/message-ledger.ts`, its lifecycle tests, and the smallest necessary `minion/src/memory/sqlite.ts` constructor boundary. A private initializer-owned receipt must bind handle lifetime, canonical file identity, known initializer/profile and lifecycle invalidation; it must not be a caller-set flag or an exported mutable registry. Shared writes can be restored only after that contract and its limits pass independent review. Source comparison alone does not attest arbitrary process mutation; do not expand this implementation into that scope without a reviewed child plan.
3. **Trusted runtime/data remains a release prerequisite.** Qualify a clean exact-image process, operator-controlled roots and concurrent writers, persisted schema/data and engine temporary-storage profile. Restarting alone does not cleanse poisoned persisted schema. Feature introspection is an anomaly detector, not process attestation. The source and proposal handoff must preserve these limits.
4. **Existing flows may need migration.** Caller paths through links, unsafe directory modes, hardlinked resources, database triggers/views/virtual tables, writer DDL/file-management commands and shared consume operations are no longer admitted. Inventory/reconfigure only through an approved migration; no runtime bypass was added.
5. **Caller authority A9 is separate.** This patch does not turn a gateway admin credential into an end-user capability envelope. The Phase 11 governance and Phase 17 runtime gates remain open.

## Review axes

**Standards:** Scope stays within the admitted five gateway paths; existing SQL bindings/read-only changes were preserved. No package, auth, schema, journal-mode or production change occurred. Tests use disposable private resources, close their owned handles, and preserve another owner's shared handle. Source TODOs cover initializer restoration and runtime trust qualifications; root owns corresponding proposal and global-state updates.

**Spec:** Static alias escapes and writer SQL file-management escapes pass actual-handler/engine regression tests. Ordinary rollback/WAL, configured external ledger, fresh shared reader, bound CRUD and owned consume positives pass. Shared writer restoration is a declared fail-closed prerequisite under the plan's provenance clause and the root's explicit instruction, not a fulfilled positive control. Independent verification must decide source acceptance; no phase requirement is marked complete here.

## Source hashes at handoff

| Path under gateway | SHA-256 |
|---|---|
| `extensions/flows/src/data-paths.ts` | `c075e09ae32e4636763bb6c7003e23c29f754ff41c4d7f02af2a7d37bb0a2906` |
| `extensions/flows/src/data-paths.test.ts` | `d0181e717f14d53458c38b8fda5fbb99e7e490ddfc6e2710fb1c829abff30777` |
| `extensions/flows/src/data-nodes.ts` | `942716fbef0e0c2d42f3fd9d20420ae88c9baedd294a88f11693cd9ca2954928` |
| `extensions/flows/src/data-nodes.test.ts` | `2293a7f2bc2a557d877a1780b49de5f6d305ad1f2b968db745fcc692e396c680` |
| `extensions/flows/minion.plugin.json` | `e9e28fa4b5fbe691b45f4134acc94dd0362bfcd4f25f172259d8973b9a89926e` |

These are shared-workspace source hashes, not commit or deployment identities. No commit was created.
