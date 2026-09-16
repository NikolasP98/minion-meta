---
phase: 14-sdk-transport
plan: "08"
verified: 2026-09-09
status: passed
scope: "14-08 shared-client source handshake/observer contract only"
score: "3/3 plan truths verified"
phase_goal_achieved: false
phase_status: pending
requirements_closed: []
human_verification: []
---

# 14-08 independent verification

**Verdict:** The admitted source slice passes independent review and focused replay. No blocker was found in its handshake ownership, authenticated notification, or preserved reference error-hook contract. This is not full Phase 14 acceptance, emitted-package verification, or installed consumer adoption.

**Phase goal:** Supported applications and agents exchange authorized, version-compatible requests and recoverable events without exposing server credentials. This review verifies one necessary source foundation for that goal. The broader authority, compatibility, consumer, and package gates remain pending.

No previous `14-08-VERIFICATION.md` existed. The reviewer read actual source, tests, shared exports, Node wrapper, protocol helper, package/config files, the admitted plan, reference instructions and pinned reference bytes. Summary claims were checked against source and independent execution where stated below. Implementation red runs were not replayed by replacing frozen source.

## Observed identities

| Artifact | SHA-256 |
|---|---|
| Admitted `14-08-PLAN.md` | `2b3975efdc3e35481593415ba4cf69f833e801dec592c08df297868cda26b490` |
| `packages/shared/src/gateway/client.ts` | `c0c492d4e03f0a26ae9afd5b9993bd66c82451f7289670cfed411344ac677666` |
| `packages/shared/src/gateway/client.test.ts` | `de1ddab9590b7e793252b0a61f23d6a165aee1aa1424d753ffd7b6aed77a31ba` |
| `14-08-SUMMARY.md` | `c5475571e620a0442196a6b50499834f264defb2bfad6a9a6baf8e6864a1fdab` |
| Pinned reference client at `59c4b56c192a730dbd63bb8e51dd8305eb2ad424` | `b81c7ff63c371909fccdd7c08525f4b84573f03baca71cfccfbc16d54da32dc3` |
| Pinned reference test at that commit | `d735b70e1045265b8ba1e61e62b4c9b7eea0f8886423a4d7af8b81fd33b8b9ce` |

Read-only extraction independently confirmed reference patch `399fc59c78f4aea2176737f32d654a3c6914498b`: 13,751 bytes, SHA-256 `287f0c0d899a70ed27a9eeb125e2d008f597532a657425f5a22128a08e993d5f`. Patch `a8e6c6d8771025a6549cd079be2ebf0a74c94159`: 21,900 bytes, SHA-256 `4dd2888a918b27a27b13e21a8f2c14d8dcf4453437b9c7332dbf47d24736c575`. The current block containing `reportEventError`, `reportReconnectError`, `reportSocketError`, and `containHook` is byte-identical to the pinned reference block.

## Observable truths

| Truth | Result | Actual evidence |
|---|---|---|
| Every successful current socket handshake emits once, including internal reconnect; open alone emits none. | Verified | `client.ts:389` claims one challenge per attempt before awaiting authentication. Lines 394 and 396 recheck ownership around the connect request. Lines 399–400 settle the owned promise and notify. Actual Node-style/browser-style fixtures assert initial callback ordering, duplicate challenge/response suppression, distinct real generations and changed hello on the same client after reconnect. |
| Obsolete asynchronous challenge, response and error work cannot send through, settle, close or publish a successor handshake. | Verified within the admitted handshake scope | Attempt object, generation, active flag and socket identity are checked at lines 371–376. Replacement at lines 126–140 invalidates and rejects prior work before closing its socket. Explicit close at lines 204–220 invalidates synchronously. Delayed challenge resolve/reject and already-delivered response continuations are denied after supersession; tests verify successor remains usable and no stale notification occurs. |
| All three pinned error hooks retain reporting and containment behavior. | Verified | Reference-identical reporter block at lines 331–369; stale socket-error identity check at line 292; socket errors do not drive reconnect. Preserved tests exercise omitted/custom reporters, sync throws, async rejection, exact error values, stale sockets and close-driven backoff. |

**Score: 3/3 scoped truths verified.**

The new observer runs after the owned resolver clears timer/callback bookkeeping, before caller `.then` microtasks. Its result is not awaited. A synchronous throw or asynchronous rejection produces only `[GatewayClient] onAuthenticated observer failed`; the diagnostic itself is contained. Tests prove close and reentrant connect from the observer do not corrupt either promise or successor, and no other error hook receives observer failures.

## Artifacts and wiring

| Artifact/link | Result | Evidence and boundary |
|---|---|---|
| `client.ts` implementation | Exists, substantive, wired | `wireEvents` routes challenge to `sendConnect`; owned successful response reaches `notifyAuthenticated`. No placeholder callback path. |
| `client.test.ts` | Exists, substantive, wired | Imports and exercises actual `GatewayClient`; only injected socket delivery is synthetic. Two delivery adapters cover the new session cases. No live server import, skipped case, or replacement session-state model was found. |
| Pinned reference → current hooks | Verified | Exact file/patch identities plus byte-equal reporter block; reference behavior retained in actual tests. |
| Shared browser/gateway source exports → options | Verified at source level | `src/index.ts` exports gateway index; gateway index exports client. The optional callback is in the existing exported options interface. |
| Node options/factory → callback | Verified at source/type level only | `src/node/index.ts` extends `GatewayClientOptions` through `Omit` and spreads remaining options into the actual client. No real Node WebSocket test was run. |
| Shared package → installed Hub/Site/Paperclip | Pending, outside this slice | No emission, archive, install, consumer compilation or deployed resolution was performed here. |

Level-4 UI data-flow tracing is not applicable: these are transport utilities, not dynamic-data renderers. The handshake payload does flow through correlated pending-response resolution to the callback, as exercised by the fixtures. Its accepted `unknown` type is intentional and does not certify runtime HelloOk schema or gateway authority.

## Independent execution

From the meta root, with inherited environment restricted to `PATH`, `HOME`, and `LANG`, and a 60-second command watchdog:

```sh
env -i PATH="$PATH" HOME="$HOME" LANG=C.UTF-8 timeout 60s pnpm --filter @minion-stack/shared exec vitest run src/gateway/client.test.ts --maxWorkers=1 --minWorkers=1
env -i PATH="$PATH" HOME="$HOME" LANG=C.UTF-8 timeout 60s pnpm --filter @minion-stack/shared typecheck
```

| Check | Independent result |
|---|---|
| Exact offline client fixture | 65/65 passed; one file; Vitest 2.1.9; duration 1.36 seconds; tests 952 ms; exit 0 |
| Shared source typecheck | `tsc --noEmit`, exit 0 |
| Scoped source/test diff whitespace check | Exit 0 |
| Frozen source/test/summary hashes | Match root's supplied candidate |
| Reference file and patch byte checks | All match admitted identities |

The existing default socket-error test intentionally prints the synthetic `Error: boom`. This is expected default-reporter evidence; the runner reported no unhandled error. The effective test command includes both worker bounds because the installed runner rejects `--maxWorkers=1` alone with its default minimum. Root authorized that command correction; it does not change the test's scope.

The 65 cases include preserved request matching, timeout, pending flush, backoff and traceparent-format assertions, plus challenge/response ownership, close-before-native-delivery, construction/send failure, observer containment/reentrancy and no effect replay. Defaults remain 10,000 ms for connect and 15,000 ms for requests by source inspection. Timeout closes without arguments; handshake rejection/send failure closes with code 4008 and `connect failed`, exercised explicitly. No new default duration or automatic request replay was introduced.

No broad shared suite was selected: its Node test starts a real server at module scope. No build, emitted declaration, archive, install, application env, browser, real network, provider or production operation was performed. These exclusions match the admitted boundary, rather than unreported skipped acceptance checks.

## Requirements and roadmap coverage

| Contract | This slice's evidence | Remaining obligation |
|---|---|---|
| SDK-01 | Current handshake ownership and optional successful-session notification; existing traceparent behavior retained. | Runtime envelope/hello validation, authority, HTTP/ACP/plugin contracts and other transport gates remain outside this slice. |
| SDK-02 | Actual shared-client offline reconnect and stale-attempt behavior pass. | Actual Hub/Site/Paperclip consumer adoption, installed immutable package identities, browser/runtime and broader compatibility cases remain pending. |
| SDK-03 / roadmap success criterion 3 | Not claimed by 14-08. | Server-only privileged CRM exports and exact immutable consumer adoption belong to other Phase 14 plans. |
| Roadmap criteria 1 and 2 | A necessary shared-client source foundation is verified. | Full criteria are not satisfied by this source slice. See 14-01, 14-02, 14-06, 14-09 and 14-10 and the phase's other transport plans. |

No roadmap criterion is removed by the three narrower plan truths. Phase 14 remains open; no global requirement checkbox or status was changed.

## Standards review

The implementation preserves the existing optional-options API, wire version, exported surface and selected reference reporter behavior. The internal attempt record tracks actual production socket generation. Tests use the real client and assert denied side effects; no new `any`, `@ts-nocheck`, fake declaration or broad dependency migration is needed for the added contract. Existing untyped transport injection remains an existing API boundary. Source checks do not manufacture installed-package compatibility.

The observer's error boundary is explicit and nonpayload. Existing default error reporters intentionally retain reference behavior, including raw exception values. This is not a blanket safe-logging certification; explicit consumer reporter selection remains required. New consumer plan review recommends fixed-message callbacks for all three hooks.

## Spec review and accepted open ends

The admitted observer, duplicate-handshake, asynchronous ownership, timer/promise cleanup, reentrant close/connect and reporting contracts are met. No implementation blocker was found in that bounded contract.

| Existing/open site | Limitation | Named follow-up |
|---|---|---|
| `client.ts:194` | Generic request serialization/send failure can leave pending-map cleanup for its timer/close; handshake failure explicitly flushes its path. Do not generalize this repair to every RPC. | Source TODO → remediation proposal / 14-01 |
| `client.ts:307` | JSON parsing alone accepts structurally invalid envelopes; `null` still reaches property access. Hello remains `unknown`, and truthy `ok` handling in the protocol helper is not runtime schema validation. | Source TODO → remediation proposal / 14-01 |
| `client.ts:36` | Exact consumer hooks, declarations and archive adoption remain unqualified. | Source TODO → remediation proposal / 14-09, 14-10, 14-02 |
| `client.ts:60` | New callback is not yet current-session publication or plugin capability enforcement in consumers. | Source TODO → remediation proposal / 14-09, 14-10, 14-06 |

These are explicitly excluded source/adoption obligations, not silently satisfied tests. The executor already placed exact source TODOs and sent the root-owned proposal wording; this reviewer did not modify those sites or the global ledger. No human check is required to accept the bounded offline source contract. Real browser, Node network, package and installed-consumer checks remain later acceptance gates, and their outcomes are not inferred here.

Only this verification document was written by the reviewer. Source ownership stays with root/the executor; the observed two-file candidate can proceed to the separately admitted emission and consumer work.
