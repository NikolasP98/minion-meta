---
phase: 09-security-containment
plan: "06"
status: implemented_pending_independent_verification
requirements_completed: []
completed: 2026-09-09
key-files:
  created:
    - minion/src/shells/bridge-ws.test.ts
  modified:
    - minion/src/shells/bridge-ws.ts
    - minion/src/shells/manager.ts
    - minion/src/shells/manager.test.ts
---

# 09-06 gateway Shells receiver

Malformed frames are rejected before manager authority, registration is reserved per socket, and pending RPCs and bridge-origin mutations require their exact current connection. The gateway preserves reusable credential reconnects. This implements the admitted four-file source slice; independent verification and deployed adoption are not claimed.

Entry identity: gateway branch `fix/ci-cost-remaining-gaps`, HEAD `db83e075556a28cd15b2bb8feaa602aeea0954e7`. Admitted plan SHA-256 `d8a51dc35d5e88d37df5f8537e57772b7d7ce262820b786c1cc18fbb7a083756`. Concurrent work was preserved. No branch, commit, dependency, shared schema, deployment or provider changes were made.

## Behavior

- The WebSocket receiver checks nonnull object shape, request/response fields, registration capabilities, heartbeat/fatal fields, and required payload fields for `shell.delta`, `shell.final`, and `shell.backup_done`. Other event names, including gateway-owned lifecycle/quota events, are rejected. Error replies and transport/dispatch warnings do not reflect raw exceptions or credentials.
- Registration reserves the socket synchronously before awaiting the manager. Concurrent requests cannot admit a second identity. Failure releases the reservation; closure prevents subsequent registration completion. Registration response send failure detaches only its own candidate connection.
- The manager serializes registration and bridge-origin fatal/status persistence per shell. It rechecks socket liveness after credential and record lookup and current ownership after persistence. Earlier admitted writes finish before queued replacement writes; no queue is held across a forwarded invoke/cancel/backup RPC. Missing records or failed persistence remove only the candidate.
- Pending entries contain their complete `BridgeConn`. A response must match the registered shell, actual socket, and current map entry. Replacement/disconnect promptly rejects that connection's pending work and clears timers. Map invalidation precedes socket close, making reentrant/stale close harmless to a replacement. Send failures and timeouts settle once.
- Event relay derives organization from storage and rechecks current socket ownership after its asynchronous lookup. Heartbeat and fatal handlers reject stale same-shell connections. Administrative archive/restart/destroy continue using intentional owner-independent `dropBridge`.

The store's `consumeDeviceToken` name does not indicate one-shot credentials: its existing validation retains the hashed credential for reconnects. The stale receiver comment was corrected; store behavior was not changed.

## Reproduction and validation

Commands ran from `minion/` using installed dependencies. Tests used fake providers/stores or actual loopback WebSockets on ephemeral ports with synthetic credentials. No real provider or model was called.

| Check | Result | Evidence |
|---|---|---|
| Original receiver red test: `pnpm exec vitest run src/shells/bridge-ws.test.ts --maxWorkers=1` | Exit 1. Second concurrent registration was incorrectly accepted; JSON null caused an unhandled rejection at `handleBridgeMessage`. | `/tmp/minion-09-06-red.log` |
| Final focused batch: `pnpm exec vitest run src/shells/bridge-ws.test.ts src/shells/manager.test.ts src/shells/store.test.ts --maxWorkers=1 --reporter=verbose` | Exit 0; **39/39** in 3 files, 732 ms; no skipped tests or unhandled errors. Receiver 9, manager 29, store 1. | `/tmp/minion-09-06-final-tests.log` |
| `pnpm exec tsgo` | Exit 0, no diagnostics. | `/tmp/minion-09-06-tsgo-final.log` |
| `pnpm exec oxlint --type-aware` on the four owned files | Exit 0; 0 errors, 0 warnings. | `/tmp/minion-09-06-lint-final.log` |
| `pnpm exec oxfmt --check` on the four owned files; scoped `git diff --check` | Both pass. | Final command output |

The full TypeScript check preceded mechanical lint brace fixes and an explicit Buffer assertion in the loopback fixture; final type-aware lint and the final 39-case batch cover those last edits. No runtime source behavior changed after the passing TypeScript check.

Intermediate work also exposed a misplaced helper during patching, then five fixture type errors (port closure narrowing, overloaded send callback mock, and incorrect ACP-shaped mock input in three gateway invokes). They were corrected before the final checks. The first attempted Vitest command used an unsupported `--minWorkers` flag and did not execute tests; the recorded red and green commands omit it. Earlier 25- and 32-test batches are not additive to the final 39.

## Coverage boundaries

Actual loopback cases exercise malformed JSON before and after registration, registration reservation/retry/close, error sanitization, registered response/event validation, rejected dispatch promises, both send-failure paths, and heartbeat/response progress while a fatal write is pending. Separate real manager cases use controlled sockets and deferred store boundaries to challenge known-ID cross-shell responses, replacement, credential/get/update delays, fatal-write ordering, failed/missing persistence, timer ownership, stale event lookup and organization derivation, timeout, send failure and ordinary backup persistence.

The wrong-socket fixture is deliberately given a known synthetic pending ID. It proves missing/current authority binding; it does not demonstrate practical guessing of the random UUID request IDs.

**Standards:** strict TypeScript, no `any` or compiler suppression, instance-local stubs, existing tooling and four-file ownership preserved. **Spec:** the three admitted receiver truths are implemented and covered by focused fixtures. Root must independently assess the final source and tests; this executor does not self-certify the slice or close SEC-02/SDK-01/AGT-03.

## Remaining boundaries and handoff

1. Events remain transient and have no durable outcome acknowledgement or logical run receipt. Reconnect does not establish durable replay, cancellation proof or a fully validated/versioned SDK. The exact relay TODO points to `proposals/2026-09-08-platform-qc-remediation.md` (Shells contract), with 11-03/phase 14 ownership.
2. An already-admitted persistent write may finish after socket closure. The queue prevents a replacement from being overtaken, and later callbacks are fenced; this is not rollback or revocation of accepted I/O. Administrative/provider lifecycle races outside bridge-origin registration/fatal ordering remain outside this slice.
3. Persisted online status is not reconciled by an actual 30-second disconnect sweeper. The misleading former comment was replaced with an exact handoff TODO. Auxiliary timestamp/timer-read rejections are contained, but durable retry/reporting is not implemented; its exact TODO also points to the existing Shells proposal. Root owns proposal disposition.
4. The tests do not certify deployed gateway configuration, real harness/ACP behavior, production credentials, remote delivery or full phase requirements. Shared sender sources and schemas were read-only.

## Frozen source SHA-256

| File | SHA-256 |
|---|---|
| `minion/src/shells/bridge-ws.ts` | `8a0b6fbd2026e7d30a2fa61e21684eaad185be9cc09b6880b20665bce5fde451` |
| `minion/src/shells/bridge-ws.test.ts` | `3fbdf8c819fc3565d3004ef4a04e4ae998a296976f1e64fac66e7db56d260f11` |
| `minion/src/shells/manager.ts` | `a8db03c3683c13a4ef2794b7f3e41186384ec98ad13ce9e6e9304546f426cbe2` |
| `minion/src/shells/manager.test.ts` | `f9cc2dc2bfcf1630d0f73ce8a293c415812e6692722f27ee6b539d8326a90580` |
