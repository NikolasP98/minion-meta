---
phase: 11-agent-lifecycle
plan: "03"
status: candidate_frozen_for_independent_review
plan_sha256: 139cd21a89e64f4953510edebb14d52516a7c00227d1a58698479d298e4158f2
requirements-completed: []
---

# Durable sender integration for the Shells bridge

The in-VM bridge now accepts `shells.invoke_durable`, executes under the gateway-issued
admission identity, persists every terminal in the 11-07 journal **before** it is sent,
and clears it only against a receipt that validates against the stored event, run and
digest. Unacknowledged terminals replay after reconnect and after a bridge restart
without repeating the ACP effect. Nothing is routed, configured, published or adopted.

## Branch and base

| Item | Value |
| --- | --- |
| Base | `origin/dev` `e511b2f0d3eebcd1c15b9683c8f39d176f5f7904` |
| Branch | `feat/shells-bridge-durable-sender-11-03` |
| Worktree | `~/.cache/claude-tmp/meta-11-03` (private, detached snapshot of the meta repo) |

## Owned files — before and after

| File | Before SHA-256 | After SHA-256 |
| --- | --- | --- |
| `packages/shells-bridge/src/bridge.ts` | `70f7ba8c08d16db505ecc74d9afa2bc25955db6b81bca0bfbc6ea5318c14fe3c` | `544deeaa6c69b5584a3faa6a9fc552b3f0bd671fd7c052d2f1995d62368a7468` |
| `packages/shells-bridge/src/bridge.test.ts` | `fee02b7c9740827a6e95197963e788f346b7a126e17cd1d5772f9d15d3029f0b` | `fed8ce22fb1cb6380e07ea63f9038f85dad40fdefe0023da4077a7c57e230e7f` |
| `packages/shells-bridge/src/config.ts` | `6bdcac21d19481f6a3ad5e67eaf4e2b72fba86339ea9e87d339c3aced2b52609` | `17197d097d68be5c9064b3fc98ee7ee56e739b8966606ce7c2ebccad9d9823a5` |
| `packages/shells-bridge/src/config.test.ts` | `bf5f7e251b64ce78c386dfe33d7e6198a8bbb214043be38495b2ddd0f41e525f` | `ec2918fdb3b0404b7b77090e80c4069a2cc54f790ce48f4c7f957a7a3b113fac` |

Read-only inputs, unchanged before and after:

| File | SHA-256 |
| --- | --- |
| `packages/shells-bridge/src/run-journal.ts` | `f8b7a8f02fe0e96d27bdaa693b4eb23e90b610ea5637afcf542f31455ae4f6c8` (matches the 11-07 frozen hash) |
| `packages/shells-bridge/src/acp-client.ts` | `50bd2e115feb19029b8de58e0b7a9e19de8700d3aa056792c5396eff75330bea` |

`git status --porcelain` at the worktree lists exactly the four owned files.
`git diff --check` is clean. **No seam in `acp-client.ts` was required.**

## Readiness gates as found

1. **11-07 adoption — met.** `origin/dev` carries `run-journal.ts` and `run-journal.test.ts`
   at the verified hashes; `run-journal.ts` hashes to `f8b7a8f0…` exactly.
2. **Shared contract — met by workspace source.** `@minion-stack/shared` resolves
   `workspace:*` to `packages/shared` at version 0.9.0; the durable contract is present in
   `src/gateway/shells.ts` and was built to `dist/` before the run. No registry version and
   no 0.12.0 artifact was used; the claim rests on the workspace source, not a published package.
3. **Receiver adoption — not met, as expected.** The peer is a synthetic v1 receiver over an
   owned loopback socket. See "What is not claimed".
4. **File ownership — met.** Only the four files were opened. All 10 existing 11-08 loader
   cases pass; the sole edit to an existing case is the added `durable: { mode: 'disabled' }`
   member in the exhaustive `toEqual` shape, which the new field makes unavoidable.
5. **Working tree — a fresh detached worktree at `origin/dev` was used; no branch, stash or
   worktree owned by other work was touched.**

## Implementation

**Configuration (`config.ts`).** `BridgeConfig.durable` is a discriminated union:
`{ mode: 'disabled' }` or `{ mode: 'required', journalPath, maxRuns, maxOutcomeBytes }`.
`SHELLS_DURABLE_MODE` absent or `disabled` yields disabled; any other value is a
`ConfigError`, never a silent default. `SHELLS_DURABLE_JOURNAL_PATH` is required when
enabled and must be absolute, free of `..` segments, and outside `SHELLS_HARNESS_WORKDIR`.
`SHELLS_DURABLE_MAX_RUNS` / `SHELLS_DURABLE_MAX_OUTCOME_BYTES` accept only decimal digits
(so `1.5`, `-1`, `1e3` and trailing junk are rejected, unlike the pre-existing `optionalInt`)
and must be positive safe integers, with `maxOutcomeBytes` capped at the canonical record
limit of 65,536. Defaults 1024 / 57,344 mirror `SHELL_DURABLE_V1_PROFILE` as literals;
`config.ts` imports neither the journal nor the durable contract.

**Admission (`bridge.ts`).** `SHELLS_METHODS.invokeDurable` is dispatched to
`handleInvokeDurable`. A local `durableEnvelope()` checks only the wrapper — plain object,
null/Object prototype, exactly the three keys, `version === 1`, `input` present — and every
identity, byte and Unicode rule is delegated to `normalizeShellRunAdmission(…,
SHELL_DURABLE_V1_OUTCOME_LIMITS)`. No validator is copied. Order is validate → `admit` →
ACP prompt → reply. The reply is round-tripped through
`normalizeShellsInvokeDurableResponse` before it leaves. `runId`, `startedAt`, `sessionId`,
`invocationId` and `inputDigest` come verbatim from the admission; `randomUUID` is used on
this path only for a fresh `eventId`. Duplicate admission, conflicting admission and the
single unresolved run are all decided by `journal.admit`, not by a bridge-local counter.

**Terminals.** On `final` / `aborted` / `error` the bridge builds the canonical outcome,
computes `outcomeDigest` as SHA-256 over `shellRunOutcomeText(...)` (with a placeholder
digest, which that projection excludes), calls `journal.commitOutcome`, releases the local
reservation, then sends `shells.commit_outcome` on the socket whose own registration
accepted v1, validates the reply with `normalizeShellOutcomeReceipt` and calls
`journal.acknowledge`. Any failure — no accepted socket, send failure, gateway rejection,
socket close mid-send, or a receipt whose event, run, digest or shell does not bind —
leaves the entry pending. `emitFinal` now returns early for durable runs, so `shell.final`
is never a fallback.

**Socket binding and replay.** `register()` advertises `durableOutcomeVersion: 1` only when
a journal is open, and passes the response through
`negotiateShellDurableOutcomeVersion`. An omitted field keeps the socket legacy; an
explicitly malformed value throws and fails the registration, so the bridge retries instead
of downgrading. `durableSocket` is bound to the exact `WebSocket` object and cleared on its
close; it is never inherited across a reconnect. After every accepted registration the
bridge replays `journal.pending()` in `event_id` order through the same commit-then-
acknowledge path, re-sending only stored terminals. A restart therefore replays through the
first accepted registration, which is the same code path.

**Cancellation.** `handleCancel` writes `cancel_requested` before the ACP call and
`cancel_unconfirmed` when that call rejects or times out. `cancel_acknowledged` is never
written, because the present adapter cannot supply protocol evidence for it. Observations
never release the slot and never create a terminal; a terminal arriving after a
cancellation request still commits; an observation after a terminal is ignored by the
journal's own guard.

**Error text.** `errorMessage` on the durable path is the fixed constant
`'harness prompt failed'`. A raw ACP rejection is never forwarded.

Three exact-site `TODO(handoff)` comments were added — operational sizing plus the untested
process/power-loss class (`config.ts`), ACP stop-reason truth on the prompt settlement, and
the `session/cancel` boolean that conflates transmission with confirmation — each naming
11-04 where applicable and pointing at the root-owned
`proposals/2026-09-08-platform-qc-remediation.md` (Shells lifecycle).

## Commands and results

Run from `~/.cache/claude-tmp/meta-11-03/packages/shells-bridge` with the repo's own
package manager. Node `/usr/bin/node` v22.23.2, TypeScript 5.9.3, oxlint 1.66.0, vitest 2.1.9.

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm run typecheck` | 0 | empty output |
| `pnpm run test` | 0 | **113 passed / 113 selected, 0 skipped, 0 failed**, 3 files, 3.26 s |
| `pnpm run lint` | 0 | 1 warning, pre-existing and unrelated (`handleBackup` unused `params`, present at the same count on the unmodified base) |
| `pnpm run build` | 0 | `tsc` emit succeeded |

Per-file counts, before → after: `bridge.test.ts` 18 → 47, `config.test.ts` 10 → 33,
`run-journal.test.ts` 33 → 33 (unchanged, run only as a read-only compatibility check).
Baseline on the untouched base was 61 passed / 61.

**Red-green.** With the central invariant deliberately inverted in `settleDurable` (send and
acknowledge before `commitOutcome`), 9 of the 47 bridge cases fail: journal-before-send, all
five receipt-mismatch cases, both replay cases and the legacy-socket case. Restoring the
committed order returns 47/47. The three transient failures during authoring were fixture
defects, not source red, and are recorded here as such: an object-literal `__proto__`
never becomes an own JSON key; a 25 ms settle window swallowed a real reconnect; and a
malformed-advertisement assertion originally waited on a response the bridge correctly
never sends.

## Test lane

`bridge.test.ts` keeps the 11-02 in-memory socket fake for every non-loopback URL and hands
loopback URLs the real `ws` client through a construct-trap Proxy, so both lanes live in the
one owned file. The legacy suite keeps its fake timers inside its own describe block; the
durable suite runs on real timers.

The synthetic receiver is a `WebSocketServer` bound to literal `127.0.0.1` port `0`. It
answers `shells.register` with a configurable `durableOutcomeVersion` (1, omitted, or the
malformed `2`), forwards canonical `shells.invoke_durable` envelopes, records every
`shells.commit_outcome` and returns a stable per-`eventId` receipt — optionally mutated into
a wrong event, wrong run, wrong digest, foreign shell or malformed shape, refused outright,
or dropped by closing the connection mid-send. Each test gets a fresh `mkdtemp` 0700
directory holding a real SQLite journal plus a separate `work/` tree so the path rules are
exercised honestly, and every assertion about durability is read through a **second**
`RunJournal` handle on the same store, not through bridge-internal state. All sockets,
servers and database handles are closed and the fixture directory removed in `afterEach`.

One source change was needed to make disconnection observable rather than a 30-second hang:
the WebSocket close handler now rejects outstanding bridge-initiated RPCs with
`BRIDGE_DISCONNECTED`. The terminal stays pending in the journal and is replayed.

## What is not claimed

- **The synthetic receiver is not the gateway.** It speaks the canonical frames and issues
  canonical admissions and receipts; it establishes sender conformance to the contract and
  nothing about gateway authority, caller routing, or whether any real gateway ever calls
  `shells.invoke_durable`. 14-12's receiver is still a private candidate and 14-17 has not
  executed, so **no end-to-end durability claim is available**.
- The fake ACP transport is not a harness. No real harness, model, provider, device token,
  exe.dev VM, container or production endpoint was used. All traffic was loopback.
- Statement rollback is not failed-COMMIT, process loss or power loss; none was injected.
- The journal's `maxRuns` / `maxOutcomeBytes` are logical rejection limits, not disk quota
  or measured capacity. The defaults are selected, not sized from observation.
- A passing typecheck and build are not runtime proof; no artifact was published and no
  changeset was authored (root owns releases).
- `@minion-stack/shared` was consumed as workspace source at 0.9.0. A published 0.12.0
  package carrying the durable contract does not exist and is not relied on here.

## Open items

- **Real end-to-end acceptance** against the adopted 14-12 receiver plus 14-17 caller
  routing, configuration and lifecycle — a separate bounded step root must admit.
- **11-04** owns ACP lifecycle truth: cancellation acknowledgment, the 60-second pending
  deletion at `acp-client.ts:96–99` that reports a timeout while the child may still run,
  and honest `aborted`-versus-`final` classification. Until then `cancel_acknowledged` is
  never written and the durable `state` rests on the harness's `stopReason` string.
- **11-09 (to be drafted)** owns backup and restore. **Backup and restore remain
  unstarted**; `backup.ts` was not touched.
- Operational sizing of retained runs and outcome bytes, and the untested
  process/power-loss class, are recorded as `TODO(handoff)` against the root-owned
  `proposals/2026-09-08-platform-qc-remediation.md`.
- No prompt-level timeout observation (`unresolved`) is written, because the bridge has no
  prompt deadline of its own; the ACP client's 60-second deadline is 11-04's seam.

`AGT-04` does not close here. ROADMAP, STATE and REQUIREMENTS were not modified; root owns
those updates and the independent Standards/Spec review.
