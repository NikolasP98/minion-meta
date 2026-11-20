# C01 + C08: scratch memory extraction candidate

Status: illustrative EGM design tested in a private scratch snapshot. This is not a product fix, approved spec, merged change, release, provider qualification, or proof of acknowledged durable writes.

Pinned base: Gateway DEV `d3e0fbf54fc657521df07c896ea7adce5ba1afcd`.

Scratch root: `/tmp/minion-agent-egm-20261106-971jwsz3`.

## Scope and exact files

Changed scratch copies:

- `gateway/src/memory/extract-memories-runner.ts`: bounded input-window state, reservation/serialization, deduplication, generation fences, accounting.
- `gateway/src/agents/pi-embedded-runner/run/attempt.ts`: pass actual `params.runId` and caller abort signal; reuse bounded pre-turn authorized recall; detect explicit memory-write tool attempts.
- `gateway/src/memory/extract-memories-runner.test.ts`: replace its inflated five-count/two-message fixture with four actual messages; below-threshold fixture now contains one actual message.
- `tests/memory-candidate.test.ts`: 29 focused candidate probes.
- `tests/memory-nearby.test.ts`: import 53 nearby original runner, pure extraction, and context-stripping tests under the same synthetic telemetry/logger boundary.
- `tests/memory-retention.test.ts`: six bounded retained-generation cap, expiry, active-work, activity-refresh and late-completion probes.
- `memory-candidate.md`: this design/test note.

No shared product checkout, common Vitest config, other worker's files, KG implementation, parser, pure gate/default config, dependency, branch, commit, deployment, or persistent memory was changed. All input strings, callbacks, provider responses, persistence sinks and telemetry are synthetic/stubbed.

## AS-IS proof and TO-BE result

Before editing, the first two focused probes failed against the pinned source:

1. Two actual settled user/assistant pairs through the real attempt post-turn block produced zero injected model calls; expected one under the unchanged four-message threshold.
2. Ten overlapping four-message windows produced ten injected model calls; expected at most the unchanged budget of five.

`memory-before.log` retains the failing assertions. The original review also identifies captured-cursor overwrites; the candidate probe independently requires a final successful cursor count of five.

Candidate outcome: the same two probes pass; the extended candidate and nearby suite passes **88/88** (29 candidate + 53 nearby + 6 retention). `memory-after.log` retains the earlier 82-test run; `memory-retention-after.log` retains the final 88-test run.

## Mechanism and DELTA

The caller still supplies its actual current user/assistant pair. The runner now accumulates copied windows keyed by the actual run ID. After two settled pairs, it admits one four-message job and remembers the last real window ID in the successful cursor. A duplicate run/window does not append messages or schedule another model call. Without the new optional identity, existing source callers retain an exact-window SHA-256 identity fallback. Different run IDs may contain identical legitimate conversation text.

The runner counts actual buffered messages; the old `newMessageCount` argument remains accepted for source compatibility and cannot inflate eligibility. The default threshold remains **4** and budget remains **5** in the unchanged `extract-memories.ts`.

Capacity is reserved synchronously before `setImmediate`. Each session generation has one detached serial worker. All overlapping callers observe `attempts + reserved`, so concurrent jobs cannot exceed the default five-call admission budget. A successful completion advances the current generation's cursor, rather than a cursor captured before asynchronous work. Queued prompts are built when dispatched so they include bounded locally extracted context from earlier successful callbacks.

The caller reuses the score-filtered results of its existing authorized `recallMemories(agentId, prompt, {limit:5})` call, capped at 16,000 characters, as existing durable-memory context. It performs no additional lookup or filesystem read. This is relevant recalled context, not an exhaustive or transactional snapshot of the corpus. Bootstrap policy, tenant scope, and subagent filtering are not bypassed by opening MEMORY.md independently.

The real caller detects explicit `remember`, `brain_remember`, `forget`, and `update_entity` tool attempts. Because `toolMetas` lacks success status, even failed attempts conservatively suppress that window from durable auto-extraction. Arbitrary file/code edits are not broadly suppressed. The intentional tool-settling gate remains: tool turns accumulate within the cap and extraction starts only on a later settled turn. KG extraction remains a separate branch and is tested independently. `stripInjectedUserContext` remains applied before both memory branches; accumulated durable prompts do not contain tested timestamp, voice-routing, or injected page context.

Session object identity provides the generation fence. `clearSessionCursor` deletes the generation and releases its queued/pending references. The worker checks that generation and every contributing window's abort signal before dispatch, after the provider await, before each sink callback, after callback awaits, and before cursor advancement. Old work cannot re-create or overwrite a fresh generation's cursor or begin later sink calls.

## Accounting contract

| Event | Reservation | Dispatched attempts | Successful cursor | Failure/cancellation |
| --- | --- | --- | --- | --- |
| Gate/duplicate/disabled/manual-write rejection | none | unchanged | unchanged | unchanged |
| Eligible admission | +1 synchronously | unchanged | unchanged | unchanged |
| Dispatch | -1 | +1 | unchanged | unchanged |
| Abort before dispatch | -1 (capacity refundable) | unchanged | unchanged | cancellation +1 |
| Abort after dispatch | already consumed | remains charged | unchanged | cancellation +1 |
| Provider rejection | consumed | remains charged | unchanged | failure +1 |
| Sink callback rejection | consumed | remains charged | unchanged | failure +1; no automatic partial-write retry |
| Parsed round and callbacks complete | consumed | remains charged | +1 using actual last window ID | unchanged |
| Clear generation | queued reservations released; queue/pending dropped | old generation becomes inaccessible | fresh generation starts at zero | old results inert |

The successful cursor is a processed-round counter. Parser behavior is preserved: malformed output parses to an empty result and still completes a processed round. It does not mean a memory was persisted. Sink callbacks return `Promise<void>`; the real `recordExtractedMemories` call remains fire-and-forget and provides no storage acknowledgment. Telemetry failure is isolated from extraction/cursor accounting.

Failed dispatched attempts remain charged, and attempted windows remain deduplicated. Replaying a failed window cannot create an unlimited retry bill. New windows may consume the remaining five-attempt budget. There is no implicit retry loop.

## Bounds and explicit retention policy

- Pending history: at most 64 messages and 64,000 characters including role text; whole oldest windows are evicted with a warning. This prevents a long tool sequence from filling a buffer that can never settle.
- One incoming window: at most the same message/character limits; overlarge windows are rejected with a warning.
- Replay identities: most recent 128 windows; replay older than that horizon may be considered new.
- Window identity: at most 256 characters.
- Queued jobs: at most five. Default budget independently caps total attempts plus reservations at five per retained generation.
- Retained session generations: at most 256, including generations allocated by getters. At capacity, admission for an unknown session warns and returns without calling a model or throwing; getters return untracked ephemeral defaults. Stats expose `tracked`, `retainedSessions`, and `lastActivityAt`.
- Idle retention: 30 minutes, swept lazily on admission. Only states with `!running` and an empty queue expire, through `clearSessionCursor`. Active/queued generations and their paid-attempt capacity are never evicted to make room. Accepted windows and completed/canceled/failed jobs refresh activity; inspecting getters does not refresh activity.
- Locally extracted dedup context: last 16,000 characters.
- Already-authorized recalled context supplied by the caller: first 16,000 characters.

These are character bounds, not byte guarantees. Pending overflow deliberately loses the oldest whole window; this is explicit bounded retention, not a claim that every historic turn reaches extraction. The session map is capped at 256. The budget and replay guarantees are scoped to each retained generation. Expiry, explicit lifecycle clear, or process restart starts a fresh generation and budget; this is not a global lifetime spending limit.

## Tests and commands

From the scratch `gateway/` directory:

```bash
../node_modules/.bin/vitest run --config ../vitest.config.mjs \
  /tmp/minion-agent-egm-20261106-971jwsz3/tests/memory-candidate.test.ts \
  /tmp/minion-agent-egm-20261106-971jwsz3/tests/memory-nearby.test.ts \
  /tmp/minion-agent-egm-20261106-971jwsz3/tests/memory-retention.test.ts
```

Result: **3 files, 88 tests passed**, with all model/network/persistence/telemetry seams stubbed.

The baseline command selected only `memory-candidate.test.ts` while it contained the initial two probes; result **2/2 failed for the intended assertions**. The tests were expanded after the first red-green slice.

A fresh retention boundary pass first ran `memory-retention.test.ts` against the prior candidate: **3 expected failures / 3 positive controls passed**, retained in `memory-retention-before.log`. After the retention change all six pass. These probes cover cap enforcement including getters, lazy idle expiry and new generation/budget, preservation of running/queued attempts, completion/window activity refresh, clear returning capacity, and late-completion fencing.

The attempt seam tests read and transpile the actual scratch source blocks and execute those blocks with injected surroundings. They exercise actual pair construction, run-ID wiring, existing-recall filtering/bounds, explicit memory-write gating, real context stripping, and separate KG invocation. This is a source-bound partial integration seam, not a full `runEmbeddedAttempt` startup/session lifecycle test.

Additional coverage: duplicate before/after completion, identical text under different run IDs, ignored inflated compatibility count, serial execution and latest local dedup context, failure exhaustion, clear before scheduling, clear/re-create during provider flight, queue cancellation refund, charged in-flight cancellation, canceled contributing windows, sink failure, between-callback clear, long tool-sequence rolling bounds, legacy callers, disabled/manual gate, oversized input, mutation after admission, cancellation-plus-provider-rejection classification, and telemetry failures.

The candidate runner and real `extract-memories.ts` were also checked with a narrow TypeScript compiler-host program under `strict`, `noUncheckedIndexedAccess`, `noEmit`, ES2023, ESNext/Bundler, and real Node typings; telemetry/logger imports were replaced by explicit type declarations. Result: **0 diagnostics**. This is a bounded runner type check, not a complete Gateway build or semantic type check of the whole attempt graph.

`oxfmt --write` was run only on the owned scratch source/test files, including the added retention test. No repository formatter config is present in this thin snapshot, so formatter defaults were used.

## Rejected alternatives

- Lower default threshold to two: hides the caller/window defect, increases repeated extraction, and leaves budget races intact.
- Trust synthetic `newMessageCount=5` independently of two actual messages: recreates the original misleading runner fixture.
- Keep captured cursor + check budget only before `setImmediate`: admits overlapping work and loses successful increments.
- Count only successful callbacks toward the cost budget: provider/sink failures would allow repeated paid attempts.
- Content-only identity for the real caller: incorrectly coalesces legitimate identical text from different turns. Content hashing is retained only for source-compatible legacy callers lacking an ID.
- Read unfiltered MEMORY.md afresh: adds a new access path and can bypass the bootstrap/session filtering that already determines authorized context.
- Skip all `write`/`edit`/`apply_patch` turns as manual memory writes: discards unrelated code-task conversations.
- Merge KG and durable extraction: unrelated contracts and source behavior; the candidate preserves separation.

## Adoption limits and handoff

1. Process-local cursor, budget, dedup identities, buffers and generation state are deliberately not persisted. Idle expiry after 30 minutes, explicit clear, and process restart start a new retained generation/budget and forget its replay identities. Session clear/re-create is fenced within the process; this is not a cross-process durable admission ledger or global lifetime spending cap. Root owns separate session-reset/delete RPC lifecycle wiring and its dedicated proof; this worker did not edit those files.
2. The model callback has no cancellation transport/timeout contract. Cancel/clear suppresses late writes and commits but cannot retract an already-dispatched provider call or guarantee the provider will settle. A hung provider stalls that generation's serial worker.
3. Already-started external sink callbacks cannot be canceled or rolled back by the fence. Clear prevents subsequent callbacks and cursor advancement. Real sink delivery remains unacknowledged and partial delivery is not transactionally repaired.
4. Recalled dedup context is relevant, score-filtered, bounded pre-turn data plus bounded local extracted context, not the entire current durable corpus. Global duplicate-free persistence would require an authorized store-level identity/idempotency contract.
5. Explicit known memory tool attempts are covered conservatively. Filesystem or plugin-specific memory writes need an authenticated write-outcome contract for equivalent detection. An exact-site `TODO(handoff)` is present at the caller; the root EGM report/proposal must carry this same adoption item.
6. Replay after the 128-window retention horizon or process restart is outside the candidate's dedup guarantee. Eviction and overlarge-window rejection are deliberate lossy retention decisions to review before product adoption.
7. No complete Gateway build, clean dependency install, real model, real sink acknowledgment, deployed behavior, or user-facing memory result has been qualified.

Standards review: scoped scratch edits, strict source types, existing defaults/parser/KG paths preserved, no unrelated checkout mutations. The thin-snapshot formatter and bounded type-check limitations are explicit.

Spec review: the executable C01/C08 mechanism and requested candidate acceptance probes pass. Whole-stack persistence, durable restart accounting, exhaustive deduplication, and additional memory-write detection remain adoption boundaries and must not be described as completed product guarantees.
