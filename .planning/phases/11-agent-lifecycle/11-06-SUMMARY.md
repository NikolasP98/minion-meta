---
phase: 11-agent-lifecycle
plan: "06"
status: source_verified_review_pending
requirements: [AGT-01, AGT-02]
requirements-completed: []
completed_tasks: [1, 2]
plan_sha256: 6deb130cc4cd279025f7e305f14057fe258f6935b8162957a111e96010ba5ee2
verified_at: 2026-09-09T05:35:07Z
key_files:
  created:
    - drone/src/async-boundary.ts
  modified:
    - drone/src/streaming-schema.ts
    - drone/src/streaming-schema.test.ts
    - drone/src/stream.ts
    - drone/src/stream.test.ts
    - drone/src/types.ts
    - drone/README.md
decisions: [D360-01, D360-04, D360-06, D360-07]
---

# Streaming definition and cancellation implementation

Both streaming APIs now bound credential, model, iterator, final-response and tool waits where applicable. `defineStreamingDrone` snapshots model/fallback/schema metadata while retaining the original BAML and registry callbacks. No phase or global requirement is marked complete by this implementation summary.

## Admission and ownership

Root dispatched the independently admitted plan `d0c5cf79b98bddfa97624dd3842d3a626bae244083f57340311fab1eab4c6acd`. Before creating a shared helper, the worker requested explicit ownership expansion. Root and the independent plan checker admitted `drone/src/async-boundary.ts`; the plan's file inventory, both task file lists and streaming-to-helper key links were amended. The resulting plan hash is `6deb130cc4cd279025f7e305f14057fe258f6935b8162957a111e96010ba5ee2`, sent to the checker before helper implementation.

The shared helper is the only added source file. `define.ts` and `run.ts` were read but not changed. The six originally owned files were copied to `/tmp/minion-11-06-before/` before edits. Existing TUI, OpenRouter resolver, package and other concurrent work was preserved. No branch/worktree/stash operation, commit, dependency change, paid provider call, release or production mutation occurred.

## Implemented behavior

### Task 1: Streaming-schema admission and execution

- TypeBox `Clone` snapshots nested records and schema symbols. Record/array metadata is frozen; caller objects remain mutable.
- BAML and ClientRegistry callbacks retain identity. Non-JSON internal slots and callback closure state remain host-owned, matching 11-01.
- Credentials, each `iterator.next()` and `getFinalResponse()` are abort-aware. Admission checks prevent BAML invocation after a late credential resolution and prevent final-response invocation after an aborted iterator read.
- The BAML callback accepts a backward-compatible optional third `AbortSignal` argument. Existing two-argument closures remain valid; hosts can forward cancellation to the actual transport.
- Success, schema validation failure, upstream failure, cancellation and timeout pass through one terminal telemetry guard. Timer and iterator cleanup occur before a terminal event is yielded.
- Consumer return during a pending read aborts the read before queuing the underlying async-generator return. Cleanup is requested once and cannot hold the caller open.

### Task 2: Regular streaming execution

- Replaced the manually accumulated parent-signal listeners with native `AbortSignal.any`.
- Applied the shared abort-aware wait to credentials, model resolution, provider iterator reads, provider final results and tool invocation.
- Preserved existing fallback-before-output and locked-provider behavior. No fallback is admitted after cancellation or partial emitted output.
- Checks before and after yielded tool lifecycle events prevent the next tool from starting when cancellation arrives while the consumer is paused.
- Consumer return works both after a yielded value and while `next()` is pending. Iterator cleanup rejection is absorbed, and an uncooperative return promise is not awaited.
- First cancellation cause is retained: an external abort while paused stays `ABORTED` even if the timer later fires before the consumer resumes.
- README/types now describe all execution APIs and distinguish bounded caller wait from terminating existing host effects.

The two root-added streaming TODO handoffs were removed because these source paths are implemented and tested. Independent verification must decide requirement closure and update the corresponding proposal/status.

## Red-green and runtime evidence

All fixtures use synthetic hosts, providers, iterators and BAML callbacks.

| Check | Exact invocation / source | Result |
|---|---|---|
| Schema admission/deadline regressions before implementation | From `drone/`: `node node_modules/vitest/vitest.mjs run src/streaming-schema.test.ts --testNamePattern 'snapshots\|denies\|bounds stalled'` | 5 expected failures: caller mutation, pre-aborted admission, stalled credentials, stalled iterator, stalled final response. |
| Regular-stream before-image replay | Current new tests with unchanged before-image `stream.ts` in `/tmp/minion-11-06-red/`; `node /home/nikolas/Documents/CODE/MINION/drone/node_modules/vitest/vitest.mjs run src/stream.test.ts --testNamePattern 'denies pre-aborted\|bounds stalled'` | 6 expected failures: pre-aborted credential admission and five unbounded waits (credentials/model/next/result/tool). No worktree or dependency installation was used. |
| Schema fixtures after initial implementation | `node node_modules/vitest/vitest.mjs run src/streaming-schema.test.ts` | 12/12 passed before the additional preservation/late-resolution fixtures were added. |
| Focused streaming + nonstream compatibility | `node node_modules/vitest/vitest.mjs run src/stream.test.ts src/streaming-schema.test.ts src/run.test.ts` | 51/51 passed. |
| Full Drone unit suite | `node node_modules/vitest/vitest.mjs run` | **196 tests / 20 files passed**, Vitest 4.1.8, 2.57 seconds. Default live-test exclusion remained in force. |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit` | Passed after correcting fixture result typing. |
| Final cancellation-order assertion | `node node_modules/vitest/vitest.mjs run src/stream.test.ts --testNamePattern 'abort between tool start'` | 1 passed / 14 deliberately skipped. Added only an assertion timing step after the full run; no production source changed afterward. |
| Diff hygiene | `git -C drone diff --check` | Passed. |
| GSD plan structure | `node /home/nikolas/.claude/get-shit-done/bin/gsd-tools.cjs verify plan-structure .planning/phases/11-agent-lifecycle/11-06-PLAN.md` | Valid, 2 tasks, no errors or warnings. |

The regular-stream first test attempt exposed a test harness hoisting error, not the intended product failure: a static resolver import loaded the provider mock before initialization. That import was moved behind mock setup. The before-image replay then established the six genuine behavioral failures. The existing `beforeEach` callback was also changed to return void so Vitest would not mistake the mock function for a cleanup callback.

A TypeBox Transform fixture initially returned decoded number data where this API's `Static<TSchema>` contract expects the encoded string. The fixture now uses a string and independently checks `Value.Decode`; no production schema contract was changed.

Tests additionally cover:
- caller mutation of model, fallback, output schema, BAML callback and registry callback;
- TypeBox transform symbol metadata;
- pre-aborted execution without credential/provider/BAML admission;
- late credential/iterator/final resolution and late rejection;
- active external abort;
- pending-read and yielded-value consumer return;
- stalled or rejected host iterator cleanup;
- no next tool, no late terminal success, one terminal host event;
- removed abort listeners and zero remaining fake timers.

## Standards and spec self-review

**Standards:** The implementation reuses TypeBox and native cancellation primitives and adds one focused shared helper. It adds no framework or dependency, preserves the public iterable event shapes and existing provider lock/fallback tests, and does not change nonstream source. Cleanup is explicit and tested. Source and tests remain strictly typed.

**Spec:** Both task done criteria have synthetic runtime evidence at the recorded candidate. The third optional BAML callback signal is additive and directly supports the host cancellation contract. Definition and async-wait gaps identified by the 11-01 verifier are repaired locally; this worker does not independently accept its own changes.

## Evidence boundaries and remaining gates

- A returned timeout, abort or iterator return is not a kill receipt. Already-started uncooperative host work may continue. Hard termination requires host cooperation or process/container isolation.
- Synchronous blocking callbacks cannot be interrupted by an event-loop timer.
- Credential resolution retains its existing no-signal callback signature; it must independently bound its own work.
- Iterator cleanup is best effort and nonblocking. It cannot certify that a remote transport or generator completed cleanup.
- Streaming consumers must continue consuming or close the iterator. A closed consumer cannot receive a later terminal item; early return instead records an ABORTED terminal event through the host telemetry callback.
- No real BAML/provider transport, packaged release, deployed consumer or process-kill behavior was qualified.
- AGT-03/04/05/06, Shells lifecycle, actual ACP conformance and durable effect/outcome governance remain outside this slice.
- Independent source/behavior verification of 11-06 and reconciliation with 11-01 are the next gates. Root owns global requirements, roadmap, phase verification and proposal status.

No newly discovered source defect is knowingly deferred within this slice. The documented host/process limits are accepted boundaries, not claims that remote effects stopped.

## Source identity

Runtime: Node `v22.23.2`. Drone branch: `feat/tui-shared-agent-sidebar`; HEAD `0cdf5e6c127cc21c006ad33abf65ba8b9a112171`. The checkout contains pre-existing WIP, so HEAD alone is not the candidate identity.

| Owned file | Final SHA-256 |
|---|---|
| `src/async-boundary.ts` | `2028076e3a6b8f7c22a1058306f81fd6664f0cf3dbd905f5e7c13dc6171f873a` |
| `src/stream.ts` | `6e6312334e15f1aab3d733fab7fa3d202be2765969fcb802cea9d7662768ecd3` |
| `src/stream.test.ts` | `631a3e3b77233bc53609c5583741a0c615b1c72dd932820ec7eed00c3ba099d5` |
| `src/streaming-schema.ts` | `be2afcb7b3a1ed8ce0644a5ff9c0466761922fe3fcc713664d9c60881ffde572` |
| `src/streaming-schema.test.ts` | `02f0df3b77e0943a2fe0fc5574807f96e3a000380aa230dbf7f5a761c5dff8f4` |
| `src/types.ts` | `dff1ab650341a2fa1b56a82061d7b8a03adb411d8135f0425f01a305686baedc` |
| `README.md` | `ae50219c39bebf535f198bf4eb3d445065d7f99155b49aad37e1a5e055007ea0` |

Unchanged prior-slice source hashes: `define.ts=565c0e0e0eae131315c73f9b4acb0d8bc408d70043075f63749f302fbb11c9d6`; `run.ts=f0a592bfe0a771fa9936ca1b9379d29a73c9a38c857de83cde7ae910b0b2bdcb`.

