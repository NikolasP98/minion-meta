---
phase: 11-agent-lifecycle
plan: "02"
status: source_verified_review_pending
requirements: [AGT-03]
requirements_completed: []
completed_tasks: [1, 2]
plan_sha256: d949fcc93a9b749c4b8113bcce4c17fc58b3cb455879d42169d0cc79d227c601
verified_at: 2026-09-09T06:01:00Z
key-files:
  created:
    - packages/shells-bridge/src/bridge.test.ts
  modified:
    - packages/shells-bridge/src/bridge.ts
    - packages/shells-bridge/package.json
decisions: [D360-01, D360-04, D360-06, D360-07]
---

# Shells active admission and correlation

Shells now enforces its advertised instance-wide `maxConcurrentRuns=1`. Same-session and different-session overlaps receive `BRIDGE_BUSY`, carried in the existing `BRIDGE_ERROR` response shape. An identical active invoke frame on the same WebSocket replays the original `{runId, startedAt}`; conflicting reuse returns `BRIDGE_DUPLICATE_REQUEST` without another ACP call.

This is local active-request protection. Completed-request/restart-safe deduplication and late-effect reconciliation remain in 11-03/04. The summary does not mark AGT-03 or the phase independently accepted.

## Admission clarification and ownership

The independently admitted original plan hash was `4599cd27f828d9a47ab02724c402e7a73e8cf1d8b026a9a64d83608a58639139`. Investigation confirmed:

- `ShellsInvokeParams` has no caller idempotency field; request identity is the outer `RequestFrame.id`.
- Gateway `forwardToBridge` currently issues `gw_` plus random UUID identifiers, not a monotonic sequence.
- ACP update notifications identify a session, not a run.

Root explicitly directed bounded active-request replay only and retained durable deduplication for 11-03. The plan boundary paragraph records that decision; amended hash `9a7daa4a2724e67a06c5838ae1bfe0d1702bc70af04c0887d40b4d98220ed27e` was sent to root. Direct messaging to the prior checker returned a tool-level agent-thread-limit error; root received the amendment for orchestration records.

Owned source files: `bridge.ts`, `bridge.test.ts`, and the package's test script only. No dependency/version/lock changes. Before-images of existing files are retained at `/tmp/minion-11-02-before/`. The pre-existing ACP client handoff and unrelated WIP remain unchanged. No branches, worktrees, stashes, commits, production calls or real harness/provider processes were used.

## Task 1: Executable regression suite

Added controlled fake WebSocket and ACP implementations. Tests exercise the real Bridge registration, frame dispatch, invoke, cancellation, notification and completion paths. Only the deliberately stale-final fixture calls the private completion seam to simulate an already-settled callback racing a newer owner.

Before repair, the discovered suite produced **7 failures / 1 pass**:
- concurrent same-session invocation accepted;
- concurrent different-session invocation accepted;
- duplicate active frame dispatched another prompt and returned a different run ID;
- stale final emitted again and removed current session correlation;
- reconnect/old-socket behavior admitted or erased the wrong owner/connection;
- a harness exit did not prevent later admission;
- a late shutdown frame invoked the harness.

Unknown cancellation already returned `cancelled:false` and remained passing.

Removed `--passWithNoTests` only after this suite was discovered. Explicit empty selection changed from exit0 to exit1; a missing suite can no longer be reported as a passing package test.

## Task 2: Admission and ownership implementation

- Reserves an active run synchronously before ACP invocation, carrying its request ID, original connection and request parameters.
- Replays only identical active requests on that connection. Uses Node's existing `isDeepStrictEqual` instead of introducing a canonicalization library or retaining an unbounded completed-request cache.
- Enforces the advertised one-run instance limit across sessions.
- Validates the target shell and nonempty request/session identity before reservation; wrong-shell cancellation cannot touch the owner.
- Tracks harness availability; exit/shutdown prevents new invocation. Synchronous ACP failure releases the reservation.
- Final and cleanup paths check the active run identity; stale final callbacks cannot emit duplicate terminal events or remove a newer session owner. Cleanup also runs if local final delivery throws.
- Ignores messages/open/close events from obsolete WebSockets. Replies belong to their originating connection rather than being redirected to a replacement socket. Registration completion/failure likewise cannot alter a newer connection.
- Delta events require an existing active run matching the ACP session mapping; missing owners no longer produce sequence-zero orphan deltas.
- Cancellation acknowledgment leaves admission occupied until the prompt settles. It does not establish that the remote effect stopped.

Existing success/error/cancel response structures were preserved. No new shared protocol fields or error-code enum were introduced; stable messages remain under `BRIDGE_ERROR`.

## Verification

Commands ran from the meta root with the installed package tooling.

| Command | Result |
|---|---|
| `pnpm --filter @minion-stack/shells-bridge test` before source repair | 8 tests discovered; 7 expected failures / 1 pass. |
| `pnpm --filter @minion-stack/shells-bridge test no-suite-fixture` before script repair | No tests found, exit0; demonstrated masking. |
| `pnpm --filter @minion-stack/shells-bridge test` final after review correction | **18/18 passed**, 1 file, Vitest2.1.9, 632ms. |
| `pnpm --filter @minion-stack/shells-bridge test no-suite-fixture` after script repair | No tests found, exit1 as required. This deliberate failure is a successful negative control. |
| `pnpm --filter @minion-stack/shells-bridge typecheck` | Passed. |
| `pnpm --filter @minion-stack/shells-bridge lint` | Exit0; one pre-existing unused `handleBackup(params)` warning remains. No new lint error. |
| `git diff --check -- packages/shells-bridge .planning/phases/11-agent-lifecycle/11-02-PLAN.md` | Passed. |
| Package manifest diff | Only `scripts.test` changed; dependencies and version unchanged. |

The final suite adds cancellation-acknowledgment ownership, synchronous ACP failure release and wrong-shell identity controls to the original eight fixtures. The reconnect fixture exercises a socket close synchronously during admission, then ensures the reservation remains and stale socket events cannot replace the current connection.

### Independent review correction: malformed frame recovery

Root reproduced an uncaught `TypeError` from the JSON frame `null` at `onFrame`, before request handling. Root authorized a narrow amendment to the same source/test ownership. Seven malformed-frame fixtures first produced **1 failure / 17 passes**, reproducing the null crash. Parsing now retains `unknown` until a non-null, non-array object with a `type` property is established. The final **18/18** suite proves malformed JSON, null, arrays, strings, numbers and booleans cause no dispatch; each case then successfully admits a valid request, rejects an overlapping request and correlates the owner's next delta. Typecheck passes; lint retains only the existing unused backup parameter warning. Full schema/size/authentication validation remains in 14-01. Final admitted-by-root amendment hash is recorded in frontmatter; independent verification remains pending.

## Standards and spec self-review

**Standards:** Scoped changes preserve the existing protocol, package manager, strict TypeScript and concurrent work. Admission has one synchronous reservation point. Maps remain bounded by the one active run rather than retaining completed requests. Existing libraries supply equality and fake transport infrastructure.

**Spec:** Instance/session admission, active duplicate replay/conflict rejection, unknown cancellation and identity-checked release have passing behavioral evidence. Close/exit/shutdown cases are covered. The clarified durable-dedup and remote-lifecycle exclusions remain explicit. Independent verification must accept the implementation; this summary does not perform that gate.

## Required follow-up ledger

Source comments at `handleInvoke` and `onAcpNotification` retain these exact boundaries and point to the existing QC remediation proposal. The following proposal text was sent to root, which owns that ledger:

> 11-02 repairs instance max1, active request replay and identity-checked cleanup. 11-03 must persist completed request/effect outcomes and define retries across reconnect/restart. 11-03/04 must qualify late session/update after timeout/cancel before session reuse. Current ACP frames expose no run ID; active mapping is not proof of remote effect termination.

Consequences:
- Once an active run finishes, its request identity is not retained by this slice. Reusing a completed request ID may invoke again until 11-03 establishes durable deduplication.
- A new gateway forward currently gets a new random frame ID; active replay does not establish end-user retry idempotency.
- The ACP client's existing timeout only rejects a promise. Late output after an uncertain timeout/cancel cannot be attributed to a specific historical run using session identity alone.
- Existing disconnected terminal-frame loss and restore-while-running handoffs remain. They are not repaired or certified here.
- Fake ACP verifies Bridge behavior, not actual ACP initialization/permissions/cancellation conformance or a real process kill.
- The existing nonrecursive disk estimate/backup warning was not changed by this admission slice.

Next gates: independent 11-02 verification, then the admitted durable lifecycle and actual ACP slices11-03/04. Root owns proposal/status reconciliation and phase closure.

## Candidate identity

Meta branch `feat/curated-engineering-skills`; HEAD `69739a7c7b1a92e442b5a574d88f167a0fe40db3`. The shared checkout is dirty; final source hashes identify this candidate.

| File | SHA-256 |
|---|---|
| `packages/shells-bridge/src/bridge.ts` | `70f7ba8c08d16db505ecc74d9afa2bc25955db6b81bca0bfbc6ea5318c14fe3c` |
| `packages/shells-bridge/src/bridge.test.ts` | `fee02b7c9740827a6e95197963e788f346b7a126e17cd1d5772f9d15d3029f0b` |
| `packages/shells-bridge/package.json` | `63cf520c4051fe62881fc2cd1b36089b2b53691d2918850b0dc40a3d2b9b0ad9` |
