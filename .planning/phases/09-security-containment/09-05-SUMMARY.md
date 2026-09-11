---
phase: 09-security-containment
plan: "05"
status: source_verified_review_pending
requirements: [SEC-08, SEC-04]
requirements_completed: []
completed_tasks: [1, 2, 3]
plan_sha256: c45ba94b4cf55d60d02de34e48cd59bfb745d1b419053a6d33643876d6e9c945
verified_at: 2026-09-09T06:10:33Z
key-files:
  created:
    - minion/src/infra/message-ledger-profile.ts
    - minion/src/infra/message-ledger-provenance.test.ts
    - minion/extensions/flows/src/data-ledger-provenance.test.ts
  modified:
    - minion/src/infra/message-ledger.ts
    - minion/extensions/flows/src/data-nodes.ts
    - minion/extensions/flows/src/data-paths.test.ts
    - minion/extensions/flows/minion.plugin.json
---

# Shared ledger writer restoration

Shared flow CRUD and explicit consume marking now work on a file-backed ledger constructed by the current initializer with the canonical `outbox-v1` profile. Unknown inherited handles, changed ownership, changed file identity and unsupported schemas remain denied. Queries retain their fresh read-only SQLite connection. This summary records local source evidence; independent acceptance and deployment gates remain open.

## Implementation and ownership

Root independently admitted the plan and granted the seven source paths above. Gateway branch was `fix/ci-cost-remaining-gaps`, HEAD `db83e075556a28cd15b2bb8feaa602aeea0954e7`. Existing 09-02/04 flow source changes were preserved. Before-images are under `/tmp/minion-09-05-before/`; the existing `data-paths.test.ts` changed only its test description to identify the unsupported extra `messages` schema. Its assertions remain intact. No edits to the generic loader, tuning helper, plugin SDK/runtime API, existing `data-nodes.test.ts`, dependency files or lockfiles. No branch/worktree/stash/commit, provider, production or deployment operation occurred.

`openMessageLedger()` remains the handle owner. It now constructs with explicit `allowExtension:false`, closes newly owned handles on initialization failure and publishes only after initialization. A module-private WeakMap records an immutable path/device/inode/profile view for a freshly owned supported handle. No global receipt, caller trust flag or registration/mint API was introduced. Inspection requires the same global state object, current handle, canonical main-file identity, open connection and supported current profile. Close/reset removes the record before closing. A reloaded module cannot adopt an existing global handle's receipt.

The existing initialization SQL moved unchanged to `message-ledger-profile.ts`. The expected catalog is generated from that SQL in a disposable real SQLite memory database and retained as a string; the reference handle is closed. Exact catalog comparison covers table constraints/defaults and index expression literals without weakening SQL normalization. It accepts the current JSON expression index and an older compatible outbox for which the existing initializer creates that missing index. Unknown additional objects, alternate DDL spellings, same-name incompatible schema, attachments, temp schema and changed tuning are denied for shared writes. Profile failure does not sanitize or migrate an existing ledger; legacy ingestion behavior remains where initialization succeeds.

`resolveDb()` now inspects initializer provenance before borrowing a shared writer, then retains exact-resource/companion validation, file identity matching and connection anomaly checks. It returns the shared handle without adding it to the extension-owned cache or closing it. Consume admission occurs before the fresh reader opens, including zero-match requests, and writer admission is repeated at the marking seam. Existing single-statement `sourceSQL`, bound SQL, reader/CRUD restrictions, identifier checks and RPC envelopes remain intact.

## Executed evidence

Environment: Linux; Node **v22.23.2**, embedded SQLite **3.51.3**, installed Vitest **4.1.10**. All database/filesystem fixtures use disposable synthetic roots and actual Node SQLite. No SQLite constructor/profile/handler-admission mock substitutes for the engine. The failed-initializer descriptor check executed through Linux `/proc/self/fd`; on other platforms that specific descriptor assertion is conditional, while the initialization/publication recovery assertions remain.

| Check | Result |
|---|---|
| Initial new ledger provenance suite | **21 failures**: 20 exercised the missing receipt API; the failed-initializer test independently exposed retained main/WAL/SHM descriptors. |
| New shared-handler suite before wiring restoration | **2 failures / 22 passes**: canonical CRUD and consume returned the old provenance denial. |
| First green ledger run, four files | **43 passed**. |
| Full flows suite, eight files | **154 passed**, 15.42s. |
| Final ledger run after two additional persisted incompatibility tests, four files | **45 passed**, 1.37s. |
| Final shared-handler regression file after formatting/braces | **24 passed**, 755ms. This is part of the flow suite, not 24 additional unique tests. |
| Gateway TypeScript gate | `pnpm exec tsgo --noEmit` passed; no suppression or unrelated baseline waiver. |
| Real gateway/bind/SQLite integration | `flowToSQLite:PASS`, one gateway call, one matching row, two retained rows, zero model calls. |
| Scoped type-aware lint | Six TS files, 134 rules, **zero warnings/errors**. |
| Scoped formatting | Six TS files passed. |
| Scoped source diff check | Passed. |

The final flow implementation was already present during the full 154-test run. Subsequent edits added two core tests, made test braces/formatting corrections and updated the plugin description; the affected suites were rerun. Counts above are separate observations, not cumulative coverage or deployment proof.

Commands from `minion/`:

```text
pnpm exec vitest run --config vitest.unit.config.ts src/infra/message-ledger-provenance.test.ts src/infra/message-ledger.test.ts src/infra/message-ledger-query.test.ts src/infra/message-ledger-flusher.test.ts
pnpm exec vitest run --config vitest.extensions.config.ts extensions/flows
pnpm exec vitest run --config vitest.extensions.config.ts extensions/flows/src/data-ledger-provenance.test.ts
pnpm exec tsgo --noEmit
pnpm exec oxfmt --check src/infra/message-ledger.ts src/infra/message-ledger-profile.ts src/infra/message-ledger-provenance.test.ts extensions/flows/src/data-nodes.ts extensions/flows/src/data-ledger-provenance.test.ts extensions/flows/src/data-paths.test.ts
pnpm exec oxlint --type-aware --config /tmp/minion-09-05-oxlint.json src/infra/message-ledger.ts src/infra/message-ledger-profile.ts src/infra/message-ledger-provenance.test.ts extensions/flows/src/data-nodes.ts extensions/flows/src/data-ledger-provenance.test.ts extensions/flows/src/data-paths.test.ts
```

The temporary lint config preserves the repository configuration, resolves its `extends` entries to absolute paths and clears only its top-level ignore patterns so explicitly selected extension files are actually checked. Canonical lint configuration is unchanged. Recreate from gateway root:

```sh
python3 -c 'import json,pathlib; root=pathlib.Path.cwd(); config=json.loads((root/".oxlintrc.json").read_text()); config["extends"]=[str((root/p).resolve()) for p in config.get("extends",[])]; config["ignorePatterns"]=[]; pathlib.Path("/tmp/minion-09-05-oxlint.json").write_text(json.dumps(config))'
```

Integration command from meta root:

```text
node --import ./langgraph-server/node_modules/tsx/dist/loader.mjs scripts/quality/flow-sql-integration.mts
```

## Standards and spec self-review

**Standards:** Seven-file ownership, strict TypeScript, existing Node APIs and package tooling were preserved. No new dependency or constructor/prototype patching. Receipt records are weakly keyed and invalidated on owner close/reset; the catalog cache is a single immutable string. The core ledger stays below 400 lines. Tests verify returned rows, unchanged sentinels/attachments, retained borrowed-handle usability, rejected caller flags and failed-initializer descriptor release.

**Spec:** Canonical disk CRUD/CTE/consume, nondefault shared path, current expression index, compatible missing-index upgrade and close/reopen persistence have positive actual-engine evidence. HMR/global/current-handle identity, foreign same-path handle, direct close, main-file replacement, incompatible persisted table/index, extra/temp schema, attachment/tuning mutation, SQL management/appended statements, linked companions and main hardlink/sibling denial have negative evidence. A shared SQL function that would create a sentinel is never invoked through either the fresh reader or denied writer. The unchanged 09-04 broader path/read-only regressions passed in the full flows run.

This is worker self-review; independent verification must inspect actual source and wiring. Neither requirement nor Phase09 is marked complete here.

## Open ends and release evidence

The following exact-site handoffs point to `proposals/2026-09-08-platform-qc-remediation.md`; matching proposal text was sent to root, which owns that ledger:

- `src/infra/message-ledger-profile.ts:49`: additional persisted schemas or alternate DDL spellings require inventory and a reviewed profile/migration; no compatibility bypass.
- `src/infra/message-ledger.ts:134`: raw-handle plugins remain trusted process code; initializer history does not attest callback identity, persisted data or engine temp/VFS isolation.
- `extensions/flows/src/data-nodes.ts:176`: the same runtime/writer/persisted-data/temp boundary remains mandatory before release. The earlier deployment handoff at line395 remains intact.

Pending release packet, under root ownership:

1. Exact source/image and deployed Node/SQLite/VFS identity; this local runtime receipt is not deployment evidence.
2. Trusted plugin/raw-handle consumer inventory and same-UID process/filesystem-writer authority. Public raw `getDb`/SDK access is unchanged; a private receipt is not hostile-plugin capability enforcement.
3. Persisted schema/data lineage and inventory of unsupported profiles. A clean restart alone does not clean a poisoned database; no production catalog was inspected here.
4. Controlled engine temporary storage and exact-engine qualification. `temp_store=MEMORY` records one connection setting, not a claim that all SQLite I/O stays in memory or under stateDir.

Unknown conditions retain their release gate or require a separately admitted broker/process-isolation implementation. Explicit consume remains separate read and marking operations; this slice adds no cross-process atomic consume guarantee. Existing A9 caller-to-runner authority and Phase17 runtime containment responsibilities remain outside this source restoration.

## Frozen candidate identity

| Gateway-relative file | SHA-256 |
|---|---|
| `src/infra/message-ledger.ts` | `60c0d9b047ef561fff115319c22d53aa21155867cc19c389920e61499bba8d62` |
| `src/infra/message-ledger-profile.ts` | `9fb95db39652824186d748c193ecc8bc7d1f1dac749dc9fbfb330f1eab008028` |
| `src/infra/message-ledger-provenance.test.ts` | `7e480ffd0dfa4ecc5cfaff2cc30663d2264aa5f3a3a1dcc4c43dce899d28524e` |
| `extensions/flows/src/data-nodes.ts` | `9bbb840f4896cedcb10da37dfccb4d4cffe34522c741474178e0996e7f27bd19` |
| `extensions/flows/src/data-ledger-provenance.test.ts` | `d2241003c85080bf481593d1454e8bdd1e46c7d4414c8267afa0a9a4cb058c65` |
| `extensions/flows/src/data-paths.test.ts` | `dd36a9f1cc36305e7eea5c20f829278ffbc8c48f6f320b1d65833a7de1948f5c` |
| `extensions/flows/minion.plugin.json` | `66e3da813967735924c9b5f2e0b02572af6ce469be73248961d6accefbc038f8` |
