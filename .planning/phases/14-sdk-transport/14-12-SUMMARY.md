---
phase: 14-sdk-transport
plan: "12"
status: private_candidate_frozen_for_independent_review
requirements-completed: []
---

# Injected gateway durable outcome receiver

A dedicated three-table native SQLite store (`MSR1`, `user_version` 1), an injected manager durable invoke/query/commit/quiesce API and a registered machine `shells.commit_outcome` endpoint now exist in the private candidate `/tmp/minion-14-12-receiver-foox9ehr/minion` on the inherited `fix/ci-cost-remaining-gaps` snapshot. Admission is committed before one machine forward; the immutable terminal and its stable receipt are committed before any acknowledgment. Nothing is routed, configured, published or adopted.

Plan `aa288b0b79ca532b84cc3878483549a8e2004f24741fef2812c57716a1862b20` was executed exactly; the decision packet at `3c4b39c5396600e4809617ceab7ea948fa2df6c20dfd9f72c97478a0cac3d999` and D360-15/D360-16 supplied the selected policy. No seventh source file was needed and no seam was missing.

## Frozen owned sources

| File | SHA-256 |
| --- | --- |
| `src/shells/run-store.ts` (new) | `fe5181fba64baf4ee80e8d3c20364f48177cf73e11a491a8f3b485df4b2f6ae5` |
| `src/shells/run-store.test.ts` (new) | `b349b8c71171f59b9f72ecfa0a35de699c672d48e4377b7b3b0eabf55d5fd461` |
| `src/shells/manager.ts` | `5543ffdc6af8b369372c20a588f74d0db5b28f844371625f26cc52a23e4cf1ad` |
| `src/shells/manager.test.ts` | `230eaccebc6fb8f7cc1868f003e7bb49dc9a3df4b5151ac913471abfd22a77b4` |
| `src/shells/bridge-ws.ts` | `e7f30b924e150dbc75b9fc9e76ae95e545a537cbb09f33a355365445bf3cc7f9` |
| `src/shells/bridge-ws.test.ts` | `760bd94a365adeb224cb5ce7bdb880054612a94b7e444d07b70dfb5de4585686` |

Qualified 14-14 facade inputs were verified unchanged before and after execution: `shared-types.ts` `114feca04867ca80958183a10ddce35928154f34c36fceee521d30bccc5e4b28`, `shared-types.test.ts` `3978f4a937602c12fd3df21617be7248250cf754450ed89b3f3d64e8f5ba571b`, `invoke-contract.ts` `b69a8256f935390181f270da26dc633163c54be0d780d21dbf374fd674d2cda1`.

## Package, runtime and setup identity

Runtime and declarations resolve to the same private complete artifact `@minion-stack/shared` 0.9.0 from archive `f6a3c237c0264a2a8ef75906991ae8fa84504bf637d3b6655d07058582b603fa` (`package.json` `e1610bed949aaa0116465b9ec9a5762d5cd9628177bcb5b73608ae04d68610fb`, `dist/gateway/shells.js` `2487c9fba31b2a17fde531b6ce986760e1b8662247f817f2700983c697b8b339`, `dist/gateway/shells.d.ts` `007ea18a7cc79c0b2d52459ee12db8e41afc34f61e2d5f786737cefd76de7eb3`). Node `/usr/bin/node` v22.23.2 (`45b7e2ad792e6968e3f69c85864d19d29f010b39c55b33e0b0c27e2f22d8ddda`), TypeScript 5.9.3, oxlint 1.48.0 with tsgolint 0.14.2, oxfmt 0.51.0.

Root-authored setup was used unchanged: runner `a5477663d0f918e46f576a26e4581e335014e7c07df9c2f670bebd352b54954a`, config `115ec63e2b5f3e1c1c2749984ebfa474401a9dd2bef8810b07c4548a7fb7a5a9`, loopback network guard `196ef2298a8b00e18fc720d6a1d8bf08dea118f835132d02b845c05eb7206ef9`. The executor added only `qc-types.json` (`49ef0c70fa64fc720dc76d46fdc0fee5bbb00a49f9ce983f8074940fb7bcaf88`) because the project-wide `tsc -p tsconfig.json` fails on `test/` helper modules deliberately excluded from the credential-free snapshot; it mirrors the 14-14 profile config and includes the six owned files.

## Effective commands and results

All commands ran with cwd = the candidate and `env -i PATH=/usr/bin:/bin HOME=/tmp/minion-14-12-receiver-foox9ehr LANG=C.UTF-8` (the lint lane additionally puts the pinned `@oxlint-tsgolint/linux-x64` directory on PATH).

| Command | Result |
| --- | --- |
| `node qc-run-receiver.mjs` | exit 0 — **69/69 passed**, 0 skipped, 0 unhandled, 3.52 s. `run-store.test.ts` 16, `manager.test.ts` 40, `bridge-ws.test.ts` 13. Collected set equals the selected set. |
| `node node_modules/typescript/bin/tsc -p qc-types.json --noEmit` | exit 0, empty output |
| `node node_modules/oxlint/bin/oxlint --type-aware --tsconfig=qc-types.json <six files>` | exit 0 — 0 warnings, 0 errors, 134 rules |
| `node node_modules/oxfmt/bin/oxfmt --check <six files>` | exit 0 — all files correctly formatted |

Vite/Vitest cache resolved to the asserted private `qc-cache/vitest/da39a3…`; `TMPDIR` was `qc-db/`. The guard recorded 13 `listen` and 21 `connect` calls, all in `bridge-ws.test.ts`, **0 denied**, and finished with `openServers 0, allowedPorts 0, openClients 0`. `qc-db/` is empty after the run and every fixture directory was removed.

Meaningful red preceded green: expected/actual autoindex membership, a real bridge-journal application id, JSON-escape byte feasibility, a leaked TCP client in the pre-existing bridge fixture, and a JavaScript default-parameter bug that made an "absent" capability advertise v1. Structural failures (missing `run-store.js` before it existed) were separate.

## Authority and transaction boundaries

- **Storage.** `runs` carries organization, shell, run, session, invocation, optional scoped key, input digest, input-policy version, `started_at`, complete admission metadata and `reserved_bytes = 81920`. Unique indexes cover internal run identity, invocation identity, the partial `(org_id, shell_id, invocation_key)` scope, and the composite `(org_id, shell_id, run_id)` primary key that `terminals` references by foreign key; `terminals` adds unique `(org_id, shell_id, event_id)`. There is **no** global or per-shell one-open-run index. STRICT tables, `foreign_keys=ON`, `trusted_schema=OFF`, WAL, `synchronous=FULL` are set and read back on the live connection.
- **Transactions.** Writes use `BEGIN IMMEDIATE`; reads use a deferred read transaction that revalidates schema and persisted policy without reserving a writer. Every native call is synchronous and short; no registry or remote call happens inside one. A competing `BEGIN IMMEDIATE` from an independent connection produces a bounded `BUSY` refusal and converges after release — a named contention sequence, not two idle handles.
- **Admission.** Scoped-key replay is resolved inside the write transaction **before** the global and per-organization retained-count checks, so an exact retry succeeds at full capacity, offline, or after registry deletion. A no-key request is always a new identity. Only `created:true` grants one process-local forward permission.
- **Manager.** Durable invoke validates the authoritative organization and text/session/key through the qualified `normalizeShellTextInvoke`, performs keyed recovery first, then takes registry ownership outside the transaction, then rechecks stopping, storage, the exact current/open connection, its accepted v1 and registered organization inside the per-shell queue immediately before `admit`. The per-shell queue and the drain counter are released before the `shells.invoke_durable` forward is awaited. Responses must normalize strictly **and** match the persisted `runId` and `startedAt`; every failure preserves the admission and grants no retry.
- **Commit.** `commitDurableOutcome` takes the actual `WebSocket`. Organization comes only from the manager-private `BridgeConn`-bound registration record, never from the payload. The awaited registry lookup sits outside the drain obligation; the bounded local operation then rechecks stopping, storage and the exact accepted socket and commits synchronously with no awaited authority gap.
- **Endpoint.** All 09-06 controls are preserved. Registration additionally requires the manager's current/open connection after every awaited step before it marks state registered or advertises `durableOutcomeVersion: 1`; an old socket left open by a failed close cannot become accepted. An explicitly malformed peer version (`2`, `"1"`, `null`, `0`, `1.5`) is refused before manager authority; only absence stays legacy. `shells.commit_outcome` requires prior registration, and acknowledges only after the receipt returns and a second current/open check. A superseded connection is denied; a post-COMMIT delivery failure suppresses the acknowledgment while the receipt stays stored and replayable. Transient `shell.final` still creates no terminal.
- **Legacy.** Disabled mode keeps legacy invoke but rejects any supplied `invocationKey`, including an explicit `undefined`. Required mode refuses legacy invoke outright and cannot be constructed without an open store. A disabled/legacy import never calls `requireNodeSqlite()`; the loader runs only when a store is explicitly opened and an unavailable builtin maps to a fixed feature-unavailable refusal with no fallback and no file creation.

## Integrity and cleanup

All 4,499 unowned snapshot inputs, the complete private shared package, all 101 read-only dependency links, the eight recorded active gateway source files and the active Vite cache entries rehash **unchanged**; `git status --porcelain minion/` in the meta repo is empty. Only the four pre-existing owned files drifted, plus the two new ones. Receipts: `/tmp/minion-14-12-receiver-foox9ehr/checks/freeze.json` and `checks/tests.log`.

## Handoffs and what is not claimed

Exact-site `TODO(handoff)` comments were added in `run-store.ts` (production path/lifecycle opening and close; exact Node 22.13.0 minimum and image/release identity; untested failed-COMMIT/process-loss/power-loss guarantees), on `ShellsDurabilityOptions` (config and startup/shutdown wiring), on `invokeDurable` (caller method publication and authorization), on `getDurableOutcome` (operator.read/write/admin classification and authenticated organization), on `commitDurableOutcome` (sender 11-03 envelope/receipt adoption) and in `bridge-ws.ts` at `shells.commit_outcome` (sender does not call it yet; `shell.final` stays a transient relay with no durable terminal, delivery retry or reconciliation). All point at `proposals/2026-09-08-platform-qc-remediation.md` (Shells lifecycle), which root owns.

Not implemented and not claimed: caller routing or method authorization; production configuration, store opening or shutdown wiring; sender 11-03/ACP/restore integration; package, lock, dist or image adoption; any broadcast observer on the durable commit path (none is emitted, so the tested equivalent is a post-COMMIT acknowledgment delivery failure); failed-COMMIT, process-loss or power-loss recovery; the exact 22.13.0 floor or an actual distribution lacking the builtin; and any protection against same-UID pathname or inode replacement between native opens. The 81,920-byte reservation and the retained-run counts are logical rejection limits, not disk quotas or measured capacity — the fixed v1 profile has enough headroom that `TOO_LARGE` is a defensive guard rather than a reachable rejection for canonically valid records, and the tests measure that feasibility instead of asserting it.

Dependencies remain 11-07/09-06 → 14-16 → 14-11 artifact → 14-14 facade → **14-12** → caller routing/authorization → sender 11-03, with configuration/lifecycle and immutable package/image adoption separate. Root owns independent verification, adoption and global records. **SDK-01, SDK-02 and AGT-04 remain open.**
