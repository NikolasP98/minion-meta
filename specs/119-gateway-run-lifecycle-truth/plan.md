# Implementation Plan: A run reports its real outcome

**Spec**: [spec.md](./spec.md) | **Date**: 2026-11-14 | **Repo**: `minion`, PR base `DEV` | Evidence with code quotes: [egm/evidence.md](./egm/evidence.md)

## Summary

Two slices, one draft PR each. Slice 1 is local to one function and the shutdown drain. Slice 2 moves the run-level terminal event from "every attempt" to "the run's owner, once".

| Slice | PR title |
|---|---|
| 1 | `fix(gateway): no restart apology for turns that already ended` |
| 2 | `fix(gateway): a retried run ends once with its real result` |

## Technical context

pnpm monorepo, Node 22, vitest. Never run `pnpm test`; run named files with `pnpm vitest run <file>` and the gate `pnpm vitest run test/ci/`, plus `pnpm check` and `pnpm tsgo`. Events travel on a process-wide bus (`emitAgentEvent`, `src/infra/agent-events.ts`). Patterns to copy: the `lifecycleTerminalEmitted` try/catch/finally (`src/auto-reply/reply/agent-runner-execution.ts:182-255`); the boot recovery's staleness constant (`src/agents/in-flight-turns/recovery.ts:34`, `:102`).

## Constitution check

I this directory. II rows A1–A10 with anchors; static read stated. III two PRs from a clone `~/.cache/claude-tmp/gw-119`. IV no UI. V not security or data; owner merges as usual.

## Technical Plan

### Slice 1 — in-flight record (`src/agents/pi-embedded-runner/run.ts`, `src/agents/in-flight-turns/recovery.ts`)

1. Move the `recordStart(...)` block (`run.ts:164-179`) to immediately before the `try {` at `:598`. Configuration throws and the cache-hit return then never create a row.
2. Remove the `inFlightTurnSucceeded` flag (`:180`, `:1271`); in the existing `finally` (`:1298-1304`) call `markCompleted(inFlightTurnRowId)` whenever the id is not null. Correct the comments at `:158-163` and `:1299-1301`.
3. `drainInFlightTurns` (`recovery.ts:134-157`): before sending, delete rows with `now - startedAt > STALE_AFTER_MS` and count them as dropped, exactly as `recoverInterruptedTurns` does (`:102-106`).

### Slice 2 — one terminal event per run

1. `src/agents/pi-embedded/pi-embedded-subscribe.handlers.lifecycle.ts`: where `handleAgentEnd` emits `phase: "error"` (`:42-50`, `:67-73`) emit `phase: "attempt_error"`; where it emits `phase: "end"` (`:74-86`) emit `phase: "attempt_end"`. Same data. The reliability event (`:54-66`) is unchanged.
2. New helper `emitRunTerminal(runId, outcome)` next to `emitAgentEvent`'s lifecycle users, and a wrapper `withRunTerminal(runId, startedAt, fn)` implementing the try/catch/finally of `agent-runner-execution.ts:182-255`: on normal return emit `end`; on throw emit `error` with the message and rethrow; a `finally` backstop emits `error` if neither fired. The wrapper lets `fn` report a failure that is returned, not thrown (the "agent failed before reply" return).
3. Wrap the outermost retry scope at each owner of a run id:
   - `src/auto-reply/reply/agent-runner-execution.ts`: around the whole `while (true)` (`:108-591`), for both the embedded and the CLI branch; delete the per-candidate CLI emissions (`:224-254`). The failure returns (`:446`, `:456`, `:494`, `:504`, `:550`, `:584`) report `error`; the success break (`:465`) reports `end`.
   - `src/cli/commands/agent.ts:575-615` already has a once-only backstop and needs no change beyond confirming it now emits exactly once.
   - `src/auto-reply/reply/followup-runner.ts:142`, `src/platform/cron/isolated-agent/run.ts:502`, `src/auto-reply/reply/agent-runner-memory.ts:115`: wrap each call with the same helper so their run ids still get a terminal event.
4. `src/gateway/server-methods/chat/handlers.ts:354-398` needs no change: with step 3 the "throw before start" path now emits `error`, which `server-chat.ts` turns into the chat final.
5. Consumers (`server-chat.ts`, `subagent-registry.ts`, `openai-http.ts`, `openresponses-http.ts`, `agent-job.ts`, the TUI) are not edited: they match `end`/`error` exactly and ignore the new phases. `src/gateway/ws-log.ts:235-247` logs the new phases as it logs any other.
6. If `@minion-stack/shared` types the lifecycle phase as a closed union, add the two names there in a separate meta PR and note the hub/site/paperclip rebuild; otherwise no cross-project change.

## Alternatives considered

- **Copy `agent.wait`'s 15-second grace window into the chat handler and the sub-agent registry.** Smaller diff, but a real error is shown 15 seconds late, a premature `end` is not fixed, and the spinner-forever path stays.
- **Add a `willRetry` flag to the attempt's `error` event.** The retry decision is taken after the attempt's event is emitted (`run.ts:1029-1159`), so the flag cannot be known at emit time.
- **A fresh run id per attempt.** Changes the identity every client keys on.
- **Insert the in-flight row later and keep the success flag.** Leaves every error exit leaking.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A caller of the run function is missed and its runs never emit a terminal event | The review traces every caller of `runEmbeddedPiAgent` and `runCliAgent`; a test asserts one terminal event per caller path; `agent.wait`'s timeout remains the last resort |
| A client relies on per-attempt `error` to show progress | The data is still emitted as `attempt_error`; the hub is grepped for lifecycle phase handling before merge |
| Double terminal events where an owner wraps a callee that also wraps | The helper is idempotent per run id within one process (a `Set` cleared on emit) |
| Shutdown no longer apologises to a customer whose turn had just errored | Intended: they already received the error reply |

## Verification

Per slice: failing test first; named vitest files; `test/ci`; `pnpm check`; `pnpm tsgo`. On the dev gateway: SC-002 (restart after failing turns, 0 apologies) and a forced first-attempt failure in web chat showing the answer and no error.

## Detailed Implementation Plan

### Slice 1
- M `src/agents/pi-embedded-runner/run.ts`
- M `src/agents/in-flight-turns/recovery.ts`, `recovery.test.ts` (stale row dropped at drain)
- M `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` (open a store on a temp path as `in-flight-turns/store.test.ts` does; assert an empty table after an error-reply return and after a thrown failover), plus a cache-hit case where the existing tests allow

### Slice 2
- M `src/agents/pi-embedded/pi-embedded-subscribe.handlers.lifecycle.ts` and its lifecycle test (`pi-embedded-subscribe.lifecycle-billing-error.e2e.test.ts` expectations)
- C the terminal helper beside the lifecycle emitters, with a unit test (return → `end`, throw → `error`, reported failure → `error`, never twice)
- M `src/auto-reply/reply/agent-runner-execution.ts`, `followup-runner.ts`, `agent-runner-memory.ts`, `src/platform/cron/isolated-agent/run.ts`
- M tests: `auto-reply/reply/agent-runner.runreplyagent.test.ts`, `agent-runner.misc.runreplyagent.test.ts`, `gateway/server-core/server-chat.agent-events.test.ts` (fail-then-succeed delivers deltas and one `done`), a sub-agent registry test (outcome ok after an attempt error), `gateway/server-methods/server-methods.test.ts` (`waitForAgentJob` unchanged)
