# Implementation Plan: A run reports its real outcome

**Spec**: [spec.md](./spec.md) | **Date**: 2026-11-14, pass 2 | **Repo**: `minion`, PR base `DEV` | Evidence: [egm/evidence.md](./egm/evidence.md), critique: [egm/critic_report.md](./egm/critic_report.md)

## Summary

Two slices, one draft PR each.

| Slice | PR title |
|---|---|
| 1 | `fix(gateway): no restart apology for turns that already ended` |
| 2 | `fix(gateway): a retried run ends once with its real result` (branch stacked on slice 1: both edit `run.ts` and its callers) |

## Technical context

pnpm monorepo, Node 22, vitest. Never run `pnpm test`; run named files with `pnpm vitest run <file>` and the gate `pnpm vitest run test/ci/`, plus `pnpm check` and `pnpm tsgo`. Events travel on a process-wide bus (`emitAgentEvent`, `onAgentEvent` in `src/infra/agent-events.ts`). Patterns to copy: the local-boolean try/catch/finally of `src/auto-reply/reply/agent-runner-execution.ts:182-255`; a bus listener filtered by run id as the sub-agent registry does (`src/agents/subagents/subagent-registry.ts:297-324`).

## Constitution check

I this directory. II rows A1–A10 with anchors; static read stated. III two PRs from a clone `~/.cache/claude-tmp/gw-119`. IV no UI. V not security or data; owner merges as usual.

## Technical Plan

### Slice 1 — in-flight record

1. `runEmbeddedPiAgent` params gain `recordInFlightTurn?: boolean` (default false). `src/auto-reply/reply/agent-runner-execution.ts` passes `true` unless the turn is a heartbeat; `src/auto-reply/reply/followup-runner.ts` passes `true`. No other caller passes it (cron, memory flush, `agent` command, probes).
2. In `src/agents/pi-embedded-runner/run.ts` move the `recordStart(...)` block (`:164-179`) to immediately before the proactive-compaction block (before `:543`), guarded by the new parameter and the existing probe check. The compaction block (`:546-596`) cannot throw, and the `try` at `:598` follows it, so the existing `finally` covers every exit after the insert. Configuration throws (`:307`, `:340`, `:365`, `:495-506`) and the cache-hit return (`:521-527`) now happen before any row exists.
3. Remove the `inFlightTurnSucceeded` flag (`:180`, `:1271`); the `finally` (`:1298-1304`) calls `markCompleted(inFlightTurnRowId)` whenever the id is not null. Correct the comments at `:158-163` and `:1299-1301`.
4. `recovery.ts` is not changed: the drain only lists this process's rows, and after step 3 none outlives its turn.

### Slice 2 — one terminal event per run

1. Deferral is a property of the run id, not a parameter. `src/infra/agent-events.ts` gains `markRunTerminalDeferred(runId)`, `unmarkRunTerminalDeferred(runId)` and `isRunTerminalDeferred(runId)` over a module-level `Set`. In `src/agents/pi-embedded/pi-embedded-subscribe.handlers.lifecycle.ts`, when `isRunTerminalDeferred(ctx.params.runId)` is true, `handleAgentEnd` emits `phase: "attempt_error"` where it emits `"error"` (`:42-50`, `:67-73`) and `phase: "attempt_end"` where it emits `"end"` (`:74-86`), same data. Otherwise nothing changes. The reliability event (`:54-66`) is unchanged. **No parameter is forwarded and `src/agents/pi-embedded-runner/run/attempt.ts` is not edited**: that file is pinned by hash in `.github/scripts/agent-fixture-audit.mjs` and changing it needs a separate, human-gated security update (found during implementation, 2026-11-14).
2. New `src/infra/agent-run-terminal.ts` exporting `withRunTerminal<T>(runId, opts, fn)`:
   - calls `markRunTerminalDeferred(runId)` on entry and `unmarkRunTerminalDeferred(runId)` in `finally` (after emitting);
   - registers an `onAgentEvent` listener for that run id that remembers the last attempt-level phase and its error text; unregisters in `finally`;
   - `fn` receives `report(outcome)` so an owner can state a failure that is returned, not thrown (`{ status: "error", error }`), or an abort (`{ status: "ok", aborted: true }`);
   - after `fn` returns: outcome is the reported one if any, else `error` with the remembered text when the last attempt-level phase was `attempt_error`, else `end`; emits one lifecycle event with `startedAt`, `endedAt`, `error` or `aborted`;
   - on throw: emits `error` with the message, rethrows;
   - a local boolean guarantees at most one emission; a `finally` backstop emits `error` if nothing was emitted. No shared set.
3. Owners (each wraps its outermost retry scope with the helper; nothing is passed to the run function):
   - `src/auto-reply/reply/agent-runner-execution.ts`: wrap the whole `while (true)` (`:108-591`) for both branches; delete the per-candidate CLI emissions (`:224-254`) and emit `attempt_error` there instead when a CLI candidate fails. The failure returns (`:446`, `:456`, `:494`, `:504`, `:550`, `:584`) call `report({ status: "error", error: <the user-facing payload text of that return> })`.
   - `src/cli/commands/agent.ts:541-615`: replace the `lifecycleEnded` bookkeeping and backstop with the helper around `runWithModelFallback`.
   - `src/auto-reply/reply/followup-runner.ts:130-194`, `src/auto-reply/reply/agent-runner-memory.ts:99-133`, `src/platform/cron/isolated-agent/run.ts:477-524`: wrap `runWithModelFallback` with the helper.
   - Not opted in, unchanged: `src/cli/commands/models/list.probe.ts:310`, the public re-export in `src/extensionAPI.ts:7`.
4. Consumers are not edited: `server-chat.ts`, `subagent-registry.ts`, `openai-http.ts`, `openresponses-http.ts`, `agent-job.ts` and the TUI match `end`/`error` exactly. `chat/handlers.ts` needs no change: the run id is the client's run id and its context is registered before any attempt, so the owner's `error` becomes the chat final.
5. Aborted: the owner reads the run result's aborted/timed-out marker and reports `{ status: "ok", aborted: true }`, which `agent-job.ts:93` and `subagent-registry.ts:313` already map to a timeout.

## Alternatives considered

- **An opt-in `deferRunTerminal` parameter forwarded through the run function (pass 2, first draft).** Rejected during implementation: forwarding it means editing the hash-pinned `attempt.ts`.
- **Rename unconditionally and wrap every caller (pass 1).** Rejected: a missed caller (the public extension export cannot be wrapped) would never emit a terminal event, leaving run context and the per-session busy flag set for the life of the process.
- **"Normal return means success" (pass 1).** Wrong: the run function returns normally after a failed last attempt.
- **Copy `agent.wait`'s 15-second grace window into the chat handler and the sub-agent registry.** A real error shows 15 seconds late; a premature `end` and the spinner-forever path stay.
- **A `willRetry` flag on the attempt's `error`.** The retry decision is taken after the attempt's event is emitted.
- **A fresh run id per attempt.** Changes the identity every client keys on.
- **A 30-minute filter in the shutdown drain (pass 1).** It can only match a turn really running that long and would drop its apology.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| An owner opts in but an exit path skips the helper | The helper's `finally` backstop; a test per owner asserting exactly one terminal event |
| A failed run is reported as success | Outcome derives from the last attempt phase; test "single failed attempt, no fallback → `error`" |
| Web chat shows a raw error instead of the friendly reset message | The failure returns report their user-facing text |
| Sub-agent timeouts now read as timeouts | Intended; stated in the spec |
| Internal runs no longer covered by the restart apology | Intended: there is no customer waiting on them |

## Verification

Per slice: failing test first; named vitest files; `test/ci`; `pnpm check`; `pnpm tsgo`. On the dev gateway (owner or a later session): restart after failing and fallback turns sends 0 apologies; a forced first-attempt failure in web chat shows the answer and no error.

## Detailed Implementation Plan

### Slice 1
- M `src/agents/pi-embedded-runner/run.ts` and its params type
- M `src/auto-reply/reply/agent-runner-execution.ts`, `src/auto-reply/reply/followup-runner.ts` (pass the parameter)
- M `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` (open a store on a temp path as `src/agents/in-flight-turns/store.test.ts` does; cases: no row without the parameter; with it, the table is empty after an error-reply return and after a thrown failover; a cache-hit or configuration-throw case where the existing harness allows, otherwise a comment naming the line that proves it)

### Slice 2 (branch from slice 1's branch)
- C `src/infra/agent-run-terminal.ts`, `agent-run-terminal.test.ts` (return → `end`; last phase `attempt_error` → `error` with its text; reported failure → `error`; reported abort → `end` with aborted; throw → `error` and rethrow; never twice; listener removed)
- M `src/infra/agent-events.ts`, `src/agents/pi-embedded/pi-embedded-subscribe.handlers.lifecycle.ts` (no params type change, no `attempt.ts` change); M `src/agents/pi-embedded/pi-embedded-subscribe.lifecycle-billing-error.e2e.test.ts` (flag off: unchanged; flag on: `attempt_error`)
- M `src/auto-reply/reply/agent-runner-execution.ts`, `followup-runner.ts`, `agent-runner-memory.ts`, `src/platform/cron/isolated-agent/run.ts`, `src/cli/commands/agent.ts`
- M tests: `src/auto-reply/reply/agent-runner.runreplyagent.test.ts`, `agent-runner.misc.runreplyagent.test.ts`; `src/gateway/server-core/server-chat.agent-events.test.ts` (an `attempt_error` followed by deltas and `end` delivers the deltas and one `done`); one sub-agent registry test (outcome ok after `attempt_error` then `end`); `src/gateway/server-methods/server-methods.test.ts` stays green
