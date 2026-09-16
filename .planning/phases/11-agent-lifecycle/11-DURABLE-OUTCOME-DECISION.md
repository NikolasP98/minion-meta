---
phase: 11-agent-lifecycle
scope: 11-03 execution preflight
status: source_preflight_complete_amendment_required
requirements_completed: []
date: 2026-09-09
---

# Durable Shells outcomes and restore decision

The five-file 11-03 plan cannot deliver its two stated truths as written. Proceed with a narrowly amended sender-outcome slice after a matching receiver receipt contract is admitted. Move restore behind an explicit local-process lifecycle foundation and archive-integrity contract. Preserve the verified 11-02 admission fences and 09-06 authenticated receiver ownership throughout.

This is a source-only recommendation for root admission. No source, package, configuration, build, model, network, browser or database execution occurred. No requirement is closed. Existing verification receipts were read; their tests were not repeated here.

## Current APIs and concrete gaps

| Source seam | Observed behavior | Required boundary |
|---|---|---|
| `packages/shells-bridge/src/bridge.ts:307`, `ActiveRun`, `handleInvoke` | Bridge generates `run_UUID`; retains active invocation only. Replay requires the same outer request ID and original socket. Current `activeRuns` is keyed by **runId**, despite the older PLAN interface note saying sessionId. | A durable logical invocation identity must survive socket and process replacement. Preserve current active duplicate/conflict behavior. |
| `minion/src/shells/manager.ts:315,1033`, `invoke`, `forwardToBridge` | Authorizes organization, then creates a fresh `gw_UUID` per forwarded RPC. Pending state records connection/method, not durable invocation identity. | A transport frame ID is not a caller retry key. Persist admission before forwarding; retain the same logical run across transport retries. |
| `bridge.ts:406`, `emitFinal` | Sends a transient event and releases the run even when the socket is absent. Prompt result is not included in `ShellFinalPayload`; only status/error/duration are emitted. | Commit the observed outcome before attempting delivery or releasing its durable obligation. Do not silently enlarge storage to full prompts/results. |
| `minion/src/shells/bridge-ws.ts:234`, `manager.ts:596` | Bridge RPC allowlist supports register/heartbeat/fatal. Final events are validated, checked against the current socket before/after lookup, enriched with stored orgId and emitted in memory. No terminal commit ACK or query exists. | Add a validated receipt RPC with commit-before-ACK and a durable query. WebSocket send success, heartbeat, fatal ACK, and EventEmitter emission are insufficient. |
| `packages/shared/src/gateway/shells.ts`, `minion/src/shells/shared-types.ts` | Canonical types have no invocation idempotency key, terminal receipt method or outcome query. Gateway still imports a local shim. | Admit both actual source surfaces and runtime guards; do not assume editing canonical types changes the running gateway. |
| `packages/shells-bridge/src/acp-client.ts:61,89,115,129` | `start()` spawns once. `call()` has only numeric local IDs; timeout deletes the pending request and rejects its promise. `stop()` ends stdin and returns after exit **or five seconds**. `kill()` signals only its child handle. `proc` is never cleared for reuse and `exited` is never reset. | A timed-out call is unresolved execution. A fulfilled `stop()` is not an exit receipt. Restart needs a fresh owned client/process instance and generation-fenced callbacks. |
| `bridge.ts:347,375` | Cancel returns `cancelled:true` after an ACP call response; restore immediately extracts over the running workDir. | Separate cancellation request/acknowledgment/uncertainty from confirmed terminal observation. Restore must acquire exclusive lifecycle ownership and prove local writers stopped first. |
| `backup.ts:26,75` | Native tar/rclone streams; no pinned archive digest, bounded extraction policy or staging/swap. `waitExit` listens for exit, not spawn failure; stderr chunks are accumulated unbounded before output truncation. | Stage one immutable download; verify trusted digest and archive entries; supervise both children and all failure cleanup. Preserve previous directory until replacement is usable. |
| `config.ts`, `index.ts` | No journal directory option. Entrypoint calls synchronous `start()` and exits after `shutdown()`. Config injection is partial: several readers still use `process.env` rather than the supplied env. | Explicit state directory outside workDir, validated before admission; startup must await journal recovery and shutdown must await durable flush/confirmed stop or report failure. Config tests must exercise the injected environment. |
| `minion/src/gateway/server-methods/shells.ts:382` | Public wake returns unavailable. `manager.invoke` also throws when archived/offline. | Fixing bridge-local restore does not establish public wake or archive-to-new-VM recovery. |

The actual Shells ACP adapter has no initialize/session-new/session-load/session-recovery API. It treats JSON-RPC responses as numeric-ID replies and forwards other messages as notifications. Do not infer a resumable session from the existing caller-supplied sessionId. Existing Pi `SessionManager.appendMessage(...)` is a transcript API for a different runtime; it must not become an outcome journal, and raw transcript JSONL writes would violate the gateway instructions.

## Selected contract recommendation

### Logical admission and terminal receipt

Use the existing req/res protocol with an additive, explicitly negotiated durable-outcome version. Keep transport request IDs connection-local. Introduce an optional caller invocation key, scoped by the gateway's authenticated organization plus shell; when absent, each caller request remains a new invocation. A missing key cannot acquire exactly-once retry semantics. The caller cannot choose the authoritative orgId or internal execution identity.

The gateway persists a logical run ID and a validated input identity before forwarding an invocation. It sends that same identity on every transport retry. The bridge records admission before starting ACP. An exact existing invocation returns its recorded run/result; conflicting input under the same key is denied before effects. Never use a hash of raw arbitrarily ordered JSON as an unexplained equivalence rule: the contract must define validated semantic input normalization, bind its version, and test reordered object keys and conflicting multimodal payloads. Persist the minimum necessary identity rather than an unbounded transcript.

For terminal delivery, propose `shells.commit_outcome` over the authenticated bridge socket. Its versioned record binds shellId, logical runId, sessionId, stable eventId, immutable normalized outcome and content digest. The manager derives tenant ownership from storage and requires a matching admitted run. The receiver transaction inserts once or returns the previously committed identical receipt; same identity with different content fails. A stable receipt response includes the same identity/digest and a durable receipt identifier. Socket replacement during a pending commit may suppress the response, but must not undo a committed receipt. Retry on the new authenticated connection retrieves the same receipt.

The sender marks its outbox item acknowledged only after validating that receipt on its current connection. Bind `pendingBridgeRpc` to the actual socket/generation and promptly reject its promises on disconnect; current receive fences alone do not give pending entries that ownership. Replay begins only after registration and durable-version acceptance. Preserve unacknowledged rows on timeout, bad ACK, send failure, unsupported receiver, malformed response, restart or local storage failure.

Provide `shells.get_outcome` for one logical run through the normal caller endpoint with the existing operator/org checks. It returns the committed receipt or an explicit unresolved/not-found result. A broadcast after commit is a notification, not the durable record. A gateway crash between commit and broadcast therefore remains queryable. Duplicate event delivery is allowed and must carry the stable eventId; do not promise one-time delivery to every UI subscriber. Broad UI history adoption is a later consumer boundary.

For old peers, registration advertises absence of the durable feature. Legacy behavior can remain available, but must never be reported as durable. Durable-mode invokes should fail explicitly when a required peer lacks the version; no silent downgrade. Publish/build/archive/installed-image combinations need their own compatibility gate.

### Persistence engine and retention

Select **SQLite transactions using the existing native `node:sqlite` engine**, with small dedicated Shells run/receipt/outbox tables, rather than a new JSONL format, custom WAL parser, message-ledger payload adaptation or Pi transcript mutation. The gateway already uses `requireNodeSqlite` and transaction-backed message-ledger/outbox code. Reuse the engine and proven transaction patterns; keep Shells data out of the unrelated message-ledger schema and its global handle.

The gateway's existing `JsonShellsStore` can continue owning the shell registry. It is not a safe receipt backend unchanged: `mutate()` changes in-memory maps before `persist()` and swallows the queue rejection for subsequent operations; `persist()` writes/renames without file/directory synchronization. A failed write can leave a later read observing uncommitted state. Its generic JSON helper also treats all read failures as missing and does not provide a transaction. Do not copy these semantics for commit-before-ACK.

Engine selection has a concrete runtime gate: bridge package engines currently says Node >=22.0.0; the workstation image source pins Node22.23.1 and bridge0.1.4. No image was run here. Before native SQLite admission, qualify the exact packaged Node runtime and explicitly amend bridge runtime metadata/capability failure behavior. Gateway's helper already acknowledges distributions without this builtin. Missing SQLite must fail before invoke, never fall back to memory. Do not opportunistically add better-sqlite3, a database server, or an ACP SDK under the persistence task.

Installed `packages/shells-bridge/node_modules/@types/node/sqlite.d.ts:41` documents the module as introduced in22.5.0; its `allowExtension` option is documented since22.13.0 and constructor `timeout` since22.16.0. These installed declarations are API clues, not executable compatibility proof. Initially the no-flag minimum was unverified in this offline inspection. Root subsequently supplied primary-source evidence through its exclusively owned browser session: the [official Node22 SQLite documentation](https://nodejs.org/docs/latest-v22.x/api/sqlite.html), page title Node.jsv22.23.2, has a History entry stating that22.13.0 removed the `--experimental-sqlite` requirement while SQLite remained experimental;22.5.0 added the module. This agent did not independently browse that page. The current declared >=22.0.0 therefore includes releases that do not satisfy the selected native, no-flag contract.

Recommend a separately reviewed **Node >=22.13.0 support floor**, not a silent source-only engine change. A bounded gate must enumerate actual APIs, run the exact22.13.0 runtime without hidden `NODE_OPTIONS`/experimental flags, then qualify the pinned image runtime and unsupported-runtime refusal. Avoid constructor `timeout` and other post-floor APIs; use supported SQL PRAGMAs when needed. The current local22.23.2 executable does not prove minimum-version or packaged-image behavior. Root may admit package engine metadata with this foundation, but release acceptance waits for the runtime/artifact checks. Gateway already declares better-sqlite3, but the bridge has only shared/ws runtime dependencies: it is not an already-shipped fallback there. Choosing that fallback would require a separate direct-dependency, native-binding, archive and lock gate, not a dynamic undeclared import. No manifest was changed by this decision.

Use a single owning bridge process and a private configured directory outside the restored tree. Refuse a foreign/corrupt database identity, unsupported schema or concurrent ownership; never silently create an empty replacement over uncertain state. A transaction reserves invocation identity and its single admission slot; another transaction commits the terminal record and delivery obligation. SQLite durability settings must be selected explicitly: the existing generic gateway PRAGMA helper uses WAL/NORMAL and itself disclaims power-loss durability. This decision proposes FULL for committed receipts; real filesystem/power-loss/RPO certification remains separate.

Retention is not yet authorized numerically. Never age out unacknowledged or unresolved work. At capacity, deny new admission visibly instead of dropping records. Compact acknowledged payloads only under an admitted policy that retains deduplication tombstones for every still-valid invocation key. Purging a tombstone and then accepting the same key as new would silently reopen duplicate effects. No automatic time-based pruning in the first implementation without that policy.

### Restart, cancellation and restored processes

Persist observations separately from execution certainty: admitted/running; cancel requested/acknowledged/unconfirmed; execution unresolved; observed terminal. A prompt timeout, transport disconnect, request rejection or bridge restart must not manufacture an aborted/error terminal. On restart, recorded in-flight work becomes unresolved until the actual harness can reconcile it; do not automatically rerun its prompt. Do not clear the admission barrier merely because an in-memory promise rejected. A late real completion can resolve uncertainty; a terminal record cannot later be overwritten by cancellation or another terminal value.

Fence all ACP notification and completion callbacks by the actual client/process generation. The present session-only notifications cannot safely distinguish timed-out old work from a newer run using the same session. Quarantine that session/slot until reconciliation or confirmed old-process termination; replacing map entries alone cannot solve this.

For local restore, serialize admission/cancel/backup/restore ownership. Prepare and validate a bounded immutable archive in a sibling staging directory; before any workDir replacement, stop the old harness and await actual exit/stdio cleanup. A deadline gives a failure result and leaves workDir untouched; it does not authorize extraction. Any signal escalation must be explicit and verified against the owned process, with process-group/descendant limitations recorded. Neither supplied systemd unit explicitly sets KillMode; source unit presence is not proof of the running cgroup or descendant cleanup. Child exit does not prove previously dispatched remote effects stopped.

Start a fresh ACP client after verified directory replacement. Use a durable restore intent and recoverable same-filesystem rename sequence; two renames are not an atomic exchange. On validation/rename/start failure retain or restore the prior usable directory. Test process interruption between both rename steps and recovery before admitting new work. Do not overwrite the journal by restoring an old workspace snapshot.

Archive metadata currently has no trusted digest: hashing bytes after download only identifies those bytes. Backup creation must record a digest tied to the authenticated gateway's selected backup record, and restore must reject a missing/mismatched trusted digest in verified mode. Use an established archive implementation after a separately reviewed dependency decision; gateway has `tar`7.5.9 but bridge does not declare it. Its presence elsewhere is not permission for an undeclared import. Validate traversal, absolute names, symlink/hardlink escapes, special files, duplicate entries and size/count/decompression limits. Existing workDir contains a legitimate CLAUDE.md symlink, so define allowed internal links rather than silently deleting them.

Bridge-local state survives an ordinary same-disk process restart, not VM deletion. The gateway archive path can remove the VM while the bridge outbox remains local. Archive/remove must eventually require committed outcome reconciliation or an explicit unresolved record; unacknowledged local data must not be claimed to survive that operation. Keep this provider-lifecycle gate separate from local restore acceptance.

## Bounded admission changes

These are exact implementation seams for root to turn into small child plans. They are recommendations, not newly granted source ownership. Shared files must execute sequentially with a hash freeze between owners.

| Slice | Exact files needing ownership | Deliverable and exclusion |
|---|---|---|
| Shells durable protocol contract | `packages/shared/src/gateway/shells.ts`; new `packages/shared/src/gateway/shells-outcome.test.ts`; `minion/src/shells/shared-types.ts` | Additive invoke identity, negotiated receipt/query types and state vocabulary. Do not broadly redesign protocol3 or assume canonical types replace runtime validation. |
| Gateway receipt storage foundation | new `minion/src/shells/run-store.ts`, `run-store.test.ts`; `minion/src/shells/manager.ts`, `manager.test.ts`; `minion/src/gateway/server.impl.ts` | Inject a dedicated SQLite run store with explicit path/lifecycle next to the configured registry; persist admission/receipts. Do not migrate the existing registry or alter other message-ledger users. Default in-memory test doubles must not activate durable capability in production. |
| Receiver and caller integration | `minion/src/shells/bridge-ws.ts`, `bridge-ws.test.ts`; `minion/src/shells/manager.ts`, `manager.test.ts`; `minion/src/gateway/server-methods/shells.ts`, `shells.test.ts` | Commit ACK, org-authorized query, forwarded logical identity, runtime guards, same/current-socket fences, commit/disconnect/replay negatives. No provider wake, image deployment or UI work. Receiver acceptance precedes sender end-to-end acceptance per D360-06. |
| Amend 11-03 to sender persistence only | existing planned new `packages/shells-bridge/src/run-journal.ts`, `run-journal.test.ts`; `bridge.ts`, `bridge.test.ts`; add `config.ts`, new `config.test.ts`, `index.ts`, `package.json` | Small SQLite adapter, startup recovery, durable invoke/outcome, ACK reconciliation and exact runtime/config contract. Remove `backup.ts` and restore acceptance from this slice. New tests use marked temporary paths and installed runtime; no real model/provider. No lock change is assumed for builtin SQLite. |
| Local lifecycle foundation, extracted ahead of restore from 11-04 | `packages/shells-bridge/src/acp-client.ts`; new `acp-client.test.ts`; `bridge.ts`, `bridge.test.ts` | Confirmed child exit, fresh-client restart, typed timeout uncertainty and generation fences. Test with controlled child/stdio fixtures only after admission. Preserve 11-04 official SDK/initialize/session/permission research and actual-harness acceptance as separate work. |
| Restore follow-on | `packages/shells-bridge/src/backup.ts`; new `backup.test.ts`; `bridge.ts`, `bridge.test.ts` for local control; separately admit `minion/src/shells/types.ts`, `manager.ts`, `store.test.ts` and canonical backup types for trusted digest provenance | Initial four-file implementation remains gated until the exact archive library/runtime and backup-digest producer/receiver fields are admitted. Package/lock changes require separate ownership. No live B2, VM lifecycle, image rebuild or public wake acceptance under local fixture results. |

The current 11-04 depends on completion of 11-03, while 11-03 restore needs lifecycle behavior absent from current ACP. Resolve this by extracting the local lifecycle foundation; official-protocol research can proceed independently once admitted. Do not make receiver receipts wait for all phase14, and do not declare restore ready solely to unblock 11-04.

## Minimum meaningful verification before acceptance

1. Real temporary SQLite files: committed receipt survives close/reopen; failed transaction exposes no committed receipt; two duplicate callers converge to one admission; conflicting payload cannot overwrite; corrupt/foreign/missing-runtime/over-capacity cases fail closed. Failure injection must be local and bounded, separately admitted, with no live databases.
2. Controlled sender/receiver: terminal recorded while disconnected, process restart and exact replay; commit-before-lost-ACK replay; replacement socket cannot ACK another owner's pending call; unknown run/cross-org/conflicting receipt rejected; unsupported-version behavior explicit. Observer/broadcast failure cannot erase a committed outcome or imply UI delivery.
3. Cancellation races: repeated cancel, cancel timeout, prompt timeout with late completion, final before cancel response, harness exit, shutdown and restart; unresolved work never automatically repeats or releases to a reused session. Tests must challenge actual process ownership, not a fabricated generation available only in fixtures.
4. Restore fixtures: refused stop and failed download produce no workDir mutation; corrupt/traversal/link/special-file/oversize archive denied; journal excluded from restored data; interruption at rename boundaries recovers prior or complete replacement; fresh process starts only afterward. Actual pinned ACP readiness and descendant/remote-effect cessation remain explicit evidence boundaries.
5. Preserve the verified 18-case sender and 39-case receiver contracts; run only the newly admitted focused tests/typechecks first. Build/declarations/archive/image adoption is a subsequent exact-identity gate, including the old installed peer combination.

## Handoff ledger for root

Existing source TODOs at bridge send/invoke/restore/notification and manager relay already point to the QC proposal. This read-only task does not own new source comments. When admitting implementation, add exact-site TODOs plus proposal entries for: ACP stop deadline returning without exit (`acp-client.ts:115`); uncommitted JsonShellsStore memory after failed persistence (`store.ts:205`); missing trusted backup digest (`types.ts:60` / `backup.ts:75`); VM archive deletion with unresolved bridge obligations (`manager.ts:375`); and Node runtime/journal directory adoption (`config.ts`, package engines). Root owns that paired ledger.

Source discovery also corrects historical documentation: the May Shells spec promises a ten-second event replay buffer absent from the inspected implementation; the August lifecycle spec explicitly assumes restore sufficiency but its A2 already names the now-confirmed running-harness risk. Neither historical proposal is execution evidence. Current bridge/image edits need a release and digest-repin gate regardless of local test success.

## Evidence identity

| Input | SHA-256 |
|---|---|
| 11-03 PLAN | `261df1e27c3b17d907d8504420595d0005f3ea362c45b817a490d6779d4f5b1d` |
| 11-02 independent verification | `f49b05c39c4c7df952135fda55abbffab1d574ecabd6a09f826d86380facf0e0` |
| 09-06 independent verification | `8988c0b616642cff5cc274c17dc6e3565eedfab62170969fea5d5a9082f490e6` |
| sender bridge.ts | `70f7ba8c08d16db505ecc74d9afa2bc25955db6b81bca0bfbc6ea5318c14fe3c` |
| acp-client.ts | `93787e790834054cdac87d48a95c347a5d37a1d9c157a1093b5934e5d1a303b0` |
| backup.ts | `6e033c470b4b7435800d6b048680a99e34ffe8f3775f7961b9184712cce477c7` |
| config.ts | `259fd6c263bc7c78c80b41227439f7a4dd204d863fda7ad8d66ac33af38e569a` |
| index.ts | `73c6ad3d2c4be445f09c53fcfa42b459bcbb558402084c7b500a1d87ad6650f9` |
| canonical gateway/shells.ts | `40cad5e97be00713f590092aabfc46c46e522dee747b20e890fd749983c872b1` |
| receiver bridge-ws.ts | `8a0b6fbd2026e7d30a2fa61e21684eaad185be9cc09b6880b20665bce5fde451` |
| receiver manager.ts | `a8db03c3683c13a4ef2794b7f3e41186384ec98ad13ce9e6e9304546f426cbe2` |
| receiver store.ts | `6b21ef75697b40339ff8394c23cd981869d9690b016e52c695f15c214e046c97` |
| gateway shared-types.ts shim | `9e0652b8b398f13f16eede58e3e3e4a2b088099308b7d713e2671481e197002c` |
| caller server-methods/shells.ts | `8ab33a7e37c3b45aee1cbda097525905ede475d3c11ae836777922ed38d14b84` |

Read commands used scoped `rg`, `sed`, `cat` and `sha256sum`. Two exploratory searches named nonexistent glob paths and were corrected with actual paths; these were read failures, not runtime tests. Standards review: read-only ownership preserved. Spec review: exact missing dependencies and acceptance boundaries identified; implementation remains pending root amendment/admission.
