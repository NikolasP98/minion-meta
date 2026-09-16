---
phase: 09-security-containment
plan: "06"
reviewed: 2026-09-09
status: admitted
source_scope: four_files_sufficient
admitted_plan_sha256: d8a51dc35d5e88d37df5f8537e57772b7d7ce262820b786c1cc18fbb7a083756
requirements_completed: []
---

# 09-06 independent plan review

The amended four-file receiver plan is admitted. The exact reviewed plan SHA-256 is `d8a51dc35d5e88d37df5f8537e57772b7d7ce262820b786c1cc18fbb7a083756`. All three admission findings below are addressed in its Task 1 and Task 2 instructions. This is source-based plan admission, not implementation verification. No gateway tests, provider calls, production sockets or source edits were performed during this review.

Reviewed gateway branch `fix/ci-cost-remaining-gaps`, HEAD `db83e075556a28cd15b2bb8feaa602aeea0954e7`. The working tree contains concurrent changes; the source hashes below identify the actual reviewed inputs.

## Closed admission findings

The following original findings retain the implementation and acceptance boundaries. Re-review confirmed explicit reusable-credential semantics and stale-comment correction in Task 1; per-shell asynchronous mutation ordering and deferred credential/get/update tests in Task 2; and the three allowed bridge event names with required payload validation in Task 2. There are no remaining plan-admission blockers. The test matrix below remains the implementation review checklist.

1. **Preserve reusable machine credentials.** `store.ts:107` deliberately validates and retains the hashed credential for reconnects; `JsonShellsStore` preserves that behavior. The receiver's existing single-use comment is stale. Replace “no duplicate token consumption” with “one in-flight credential-validation/registration attempt per socket.” Correct the owned receiver comment. Test reconnect with the same valid credential, failed registration followed by valid registration, and concurrent same-socket requests without duplicate manager admission. Do not change token rotation, revocation or the store in this slice.

2. **Define admission and persistent-write ordering.** `attachBridge` awaits credential validation and record lookup, replaces the connection, then awaits `updateShell`; `recordFatal` awaits an unconditional persistent status write. A current-owner check only after an await cannot undo a stale write. Specify a manager-local ordering mechanism for registration and bridge-origin status mutations, with an explicit admission point, current socket checks and cleanup on failed persistence. A queued operation must recheck authority after acquiring its turn. A previously authenticated mutation may complete before replacement is admitted; it must not overwrite or emit for a replacement already admitted. Concurrent registration completion order must not let an obsolete attempt replace the selected newer owner. Failed or unauthenticated registration must not evict a valid owner. This can fit in `manager.ts` without changing `BridgeConn` or the store interface. Do not hold a queue across invoke/cancel/backup RPC waits. If implementation requires changing administrative persistence ordering, request that precise amendment rather than claiming this bridge-origin guarantee covers all provider lifecycle races.

3. **Constrain event authority explicitly.** Runtime object validation alone is insufficient. `relayBridgeEvent` currently relays any event name with a matching shell ID; the real `server.impl.ts:1054` listener broadcasts that name to organization/admin subscribers. Allow only bridge-origin `shell.delta`, `shell.final`, and `shell.backup_done`, with their required payload fields validated against the existing contract. Deny gateway-owned `shell.online`, `shell.archived`, `shell.error`, `shells.quota_changed`, and unrelated event names. Derive organization from the persisted shell record, overwrite any claimed organization, and recheck exact current connection after lookup. No shared schema/version change is required. This establishes connection/event authority, not durable run correlation or outcome acknowledgement.

## Exact file sufficiency and wiring

| File | Responsibility |
|---|---|
| `minion/src/shells/bridge-ws.ts` | Nonnull-object and frame validation; per-socket registration state/closed flag; safe dispatch/send failure handling; pass actual socket identity into manager calls. |
| `minion/src/shells/bridge-ws.test.ts` | New colocated test file, currently absent. Actual loopback WebSocket parsing/registration/malformed-input recovery, using synthetic credentials and fake provider/store only. |
| `minion/src/shells/manager.ts` | Manager-local ownership and admission ordering; exact pending connection binding; event allowlist/current-owner rechecks; owned cleanup and send/timer failure handling. |
| `minion/src/shells/manager.test.ts` | Deferred-store and controlled-socket race tests alongside existing workstation/timer cases. |

Source search found the bridge-facing manager methods called by `bridge-ws.ts`; no additional production caller needs an identity-signature update. `BridgeConn` already carries `ws`, `connId` and `shellId`. Use socket/object identity as authority, not the timestamp-based `connId`. Keep `types.ts`, `store.ts`, shared types, gateway broadcaster and the bridge sender read-only. Root owns proposal/allowlist changes and requirement disposition.

## Required acceptance cases

| Boundary | Required assertion |
|---|---|
| Parsing | Actual WS receives null, arrays, strings/numbers/booleans, broken JSON, unsupported frame types and malformed req/res/event fields. No authority method is called, no unhandled rejection escapes, and subsequent valid traffic works. |
| Registered parsing | Repeat malformed responses/events after successful registration; a malformed response must not consume a live pending entry. Validate `ok` as boolean and error object/string fields; avoid reflecting attacker-controlled fields or raw thrown errors. |
| Registration reservation | Two shell identities race on one socket while the first validation is deferred: at most one admitted identity and one in-flight validation. Failure releases the reservation; closing makes it terminal. |
| Registration/store races | Close at credential lookup, shell lookup and status persistence boundaries; overlap two sockets registering the same shell. Obsolete completion cannot attach, emit online, reinstall timers or remove the winner. Failed persistence removes only its candidate and leaves a newer owner intact. |
| Exact pending owner | Register shell A and shell B; deliberately supply B with A's known synthetic request ID. B cannot settle A. A can still settle it once. Repeat with replaced same-shell socket, duplicate result, and late timeout/result. This does not assert that real UUIDs can be guessed. |
| Disconnect/replacement | Pending RPCs for the dropped connection reject promptly once; their timers clear. Another shell and the replacement's pending work survive. Stale close cannot cancel replacement archive/backup timers. |
| Heartbeat/fatal | Old same-shell socket cannot update current liveness/run IDs or persist/emit an error. Defer the store write to test replacement ordering, not only a synchronous precheck. |
| Event lookup | Defer `getShell`, replace/close the socket, then resolve: no event. Reject lookup: no unhandled rejection. Spoofed organization is discarded; forbidden event names never reach manager subscribers. |
| Send failure | A closed socket or synchronous/asynchronous `ws.send` failure cannot strand pending work or its timeout. Registration response failure cleans up only its own admitted connection. |
| Compatibility | Healthy invoke, cancel and backup still round-trip. Heartbeats/responses continue during an unrelated pending RPC. Reusable credential reconnect succeeds. Existing archive/restart/destroy paths retain deliberate administrative `dropBridge` behavior. |

Use deferred barriers to prove each race was reached. Real sockets should use ephemeral loopback ports with explicit close/termination and listener cleanup. Fake timers are appropriate for timeout assertions, not a substitute for real message parsing. Preserve Vitest's unhandled-rejection failure behavior; no global suppression or skipped-green fixtures.

## Evidence limits and requirement mapping

The draft's UUID caveat is accurate: `forwardToBridge` generates random UUID IDs; the confirmed defect is missing authority binding in `settleBridgeResponse`, not demonstrated guessing. The actual broadcaster is transient (`dropIfSlow: true`) and emits no delivery acknowledgement. 11-03 and the separately reviewed phase-14 receiver contract must retain durable identity/outcome work.

This slice supports SDK-01 boundary validation and AGT-03 connection correlation. It does not establish their full version/capability/trace, run identity or harness contracts. SEC-02 specifically requires gateway actor/organization assignment and membership; bridge socket ownership is adjacent containment and cannot close that requirement. Phase 9's SQL and diagnostics criteria remain outside this four-file slice. Scope the completion report accordingly.

The current detached timer scheduling promises and `bumpLastInvoke` can also reject without handlers. Registration tests must cover asynchronous failures reached through its scheduling path; if intentionally excluded, narrow the first truth to the dispatch/relay promises and retain an exact source TODO plus root proposal for the remaining path. Do not claim global gateway rejection containment from a parser catch.

## Reviewed SHA-256

| Input | SHA-256 |
|---|---|
| `09-06-PLAN.md` (original draft) | `a6fb0ccb826931b0c5bc86c331c1c1b1036899416c82b04a107a0f714b6b8b43` |
| `09-06-PLAN.md` (admitted amendment) | `d8a51dc35d5e88d37df5f8537e57772b7d7ce262820b786c1cc18fbb7a083756` |
| `bridge-ws.ts` | `b52d7754fdaffecdfb185b99062b1c551c191fe3257b371a579104118fe841f2` |
| `manager.ts` | `faeee8a7ccf29f55abab7e1a993d470e3eb41f7fb32ec157be2fd132e98e19c2` |
| `manager.test.ts` | `6c119f8dfc565373bcf8613ecf7ceffa87c4a8bbdc9bde2b9f25a11579e1212f` |
| `store.ts` (read-only contract) | `6b21ef75697b40339ff8394c23cd981869d9690b016e52c695f15c214e046c97` |

Admission retains the exact four-file allowlist. Root still owns execution dispatch and canonical status; the plan's administrative draft marker may be updated by root. A final source/behavior review is required after implementation; this report grants no deployment or broader phase completion certificate.

Root updated only administrative draft/admission wording after independent review; tasks and scope are unchanged. Final plan SHA-256: `d8a51dc35d5e88d37df5f8537e57772b7d7ce262820b786c1cc18fbb7a083756`.
