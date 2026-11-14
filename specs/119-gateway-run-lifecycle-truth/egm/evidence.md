# Audit check: (A) retries surfaced as errors, (B) false "server restarted" apologies

Everything below was read from `/home/nikolas/.cache/claude-tmp/egm-116/gw/src/` and nothing else. Line numbers were checked against the files.

**Verdict.** Defect A is confirmed. Its blast radius is a little larger than the audit said: a per-attempt `end` can also be premature. Defect B is real, but the audit has the mechanism wrong in three places:
- `drainInFlightTurns` runs at **shutdown**, not on boot.
- The boot path **does** have a staleness filter.
- A user abort does **not** leak a row.

---

## A. A retry is shown to the user as an error

### A.1 Where lifecycle `error` is emitted, and whether a retry can follow

| # | Anchor | When it fires | Can a retry follow? |
|---|---|---|---|
| 1 | `agents/pi-embedded/pi-embedded-subscribe.handlers.lifecycle.ts:42-50` (global bus), `:67-73` (`onAgentEvent` callback) | Every SDK `agent_end` whose `lastAssistant.stopReason === "error"`. It is wired per attempt: `pi-embedded-subscribe.handlers.ts:62-63`. | **Yes**, see below. |
| 2 | `auto-reply/reply/agent-runner-execution.ts:228-238` (catch), `:243-254` (finally backstop) | CLI-provider branch, once per call to `runCliAgent` | **Yes.** `runWithModelFallback` calls the `run` closure again with the same `runId` (`agents/models/model-fallback.ts:391-392`, `421-430`). The transient-HTTP loop also restarts the whole chain (`agent-runner-execution.ts:558-570`). |
| 3 | `cli/commands/agent.ts:603-614` | `agent` RPC path, after `runWithModelFallback` throws, only if `!lifecycleEnded` | No. It sits outside every retry loop. |
| 4 | `gateway/openai-http.ts:404-408` | HTTP handler catch | No. |
| 5 | `gateway/openresponses-http.ts:889-893` (then `end` at `:895-902` if `!closed`) | HTTP handler catch | No. |

Decisive code for #1. It has no notion of retry:
```ts
// pi-embedded-subscribe.handlers.lifecycle.ts:35-47
  if (isError && lastAssistant) {
    const friendlyError = formatAssistantErrorText(lastAssistant, { ... });
    emitAgentEvent({
      runId: ctx.params.runId,
      stream: "lifecycle",
      data: {
        phase: "error",
```

**Retries in `agents/pi-embedded-runner/run.ts` that follow an attempt whose `agent_end` had `stopReason === "error"`.** All of these happen after the attempt's lifecycle event was already emitted, and all keep the same `runId`:
- **Context overflow, assistant-error source** (`:758-759`): retried at `:789`, `:838` (after compaction) and `:881` (after tool-result truncation).
- **Thinking-level fallback** on the assistant error: `:1040-1049`.
- **Failover assistant error → auth-profile rotation**: `:1081-1082`, then `:1109-1111`.
- **FailoverError thrown** at `:1029` / `:1159`, after which `runWithModelFallback` runs the next candidate with the same `runId`.
- **Transient HTTP retry of the whole chain**: `agent-runner-execution.ts:558-570`.
- **Prompt-error retries** at `:1000`, `:1013`, `:1024`: whether the SDK fires `agent_end` before `prompt()` throws cannot be verified from `src/`. Likewise, whether the SDK-internal overflow retry (`willRetry`) emits an error `agent_end` *before* `auto_compaction_end` is SDK behaviour I could not check here.

**Same problem with `end`.** A timed-out attempt (`timedOut` → `shouldRotate`, `:1081-1082`) is retried at `:1111` / `:1129`. If its `agent_end` had no error stopReason, `handleAgentEnd` emits `phase: "end"` (`:74-82`), and consumers treat that as terminal too.

### A.2 Consumers of lifecycle `error`

**1. `gateway/server-core/server-chat.ts`: terminal. Confirmed.**
```ts
// :480-493
      } else if (!isAborted && (lifecyclePhase === "end" || lifecyclePhase === "error")) {
        if (chatLink) {
          const finished = chatRunState.registry.shift(evt.runId);
          ...
          emitChatFinal(finished.sessionKey, finished.clientRunId, evt.seq,
            lifecyclePhase === "error" ? "error" : "done", evt.data?.error);
```
```ts
// :514-520
    if (lifecyclePhase === "end" || lifecyclePhase === "error") {
      toolEventRecipients.markFinal(evt.runId);
      clearAgentRunContext(evt.runId);
      agentRunSeq.delete(evt.runId);
      agentRunSeq.delete(clientRunId);
      seenRunIds.delete(evt.runId);
    }
```
What follows from this:
- `emitChatFinal` (`:272-275`) deletes `buffers` and `deltaSentAt`, then broadcasts chat `state: "error"` (`:298-306`).
- `pi-agent.run-end` goes out with `status: "error"` and subagents get `subagent-completed: "failed"` (`:430-455`).
- **Why the retry's output is lost:** `clearAgentRunContext` (`:516`) removes the sessionKey. The next events of the retry go through `resolveSessionKeyForRun` (`server-session-key.ts:6-21`). That only finds a key if some session-store entry has `sessionId === runId`. Otherwise `sessionKey` is undefined, so the `if (sessionKey)` block at `:472` is skipped and no chat deltas or final are sent.
- **Spurious "seq gap":** `agentRunSeq` was deleted, but the producer's counter `seqByRun` (`infra/agent-events.ts:58-59`) is never reset. So the retry's first event broadcasts a `stream: "error"` "seq gap" message (`:356-368`).
- The retry's real final reply is also not broadcast by `chat.send`. See A.4.

**2. `agents/subagents/subagent-registry.ts`: terminal. Confirmed.**
```ts
// :305-318
    if (phase !== "end" && phase !== "error") { return; }
    const endedAt = typeof evt.data?.endedAt === "number" ? evt.data.endedAt : Date.now();
    entry.endedAt = endedAt;
    if (phase === "error") {
      const error = typeof evt.data?.error === "string" ? evt.data.error : undefined;
      entry.outcome = { status: "error", error };
```
- Line `:324` starts the announce flow. `beginSubagentCleanup` (`:406-420`) sets `cleanupHandled = true`, so the later `end` from the successful retry, and the `agent.wait` result (`:618`), both return false.
- The parent is therefore told the child failed. The cross-process `agent.wait` path (`:568-620`) is protected (see #3), but the in-process listener fires first.

**3. `gateway/server-methods/agent-job.ts`: already retry-tolerant (the existing pattern).**
```ts
// :7-11
 * Embedded runs can emit transient lifecycle `error` events while auth/model
 * failover is still in progress. Give errors a short grace window so a
 * subsequent `start` event can cancel premature terminal snapshots.
 */
const AGENT_RUN_ERROR_RETRY_GRACE_MS = 15_000;
```
An `error` is deferred (`:151-153` → `schedulePendingAgentRunError`, `:55-68`). A later `start` cancels it (`:114-120`; waiter side `:233-235`). The repo already documents this exact defect here and fixes it only for `agent.wait`.

**Other consumers:**

| Consumer | Behaviour |
|---|---|
| `gateway/openai-http.ts:321-328` | Terminal: `writeDone(res); res.end()`. A retry after a per-attempt error truncates the HTTP stream. |
| `gateway/openresponses-http.ts:735-741` | Terminal: `requestFinalize("failed", ...)`. Same truncation. |
| `tui/tui-event-handlers.ts:285-294` | Cosmetic: sets status `"error"`; the next `start` (`:286-287`) sets `"running"` again. |
| `cli/commands/agent.ts:577-583` | Sets `lifecycleEnded = true` from per-attempt events. This only suppresses its own backstop, so it is "at most once extra", not wrong. |
| `gateway/ws-log.ts:235-247` | Logging only. |

### A.3 `willRetry`

- **Produced by:** the SDK event `auto_compaction_end` (external package `@earendil-works/pi-agent-core`), dispatched at `pi-embedded-subscribe.handlers.ts:59-60`.
- **Consumed in:** `agents/pi-embedded/pi-embedded-subscribe.handlers.compaction.ts:37-61`:
```ts
  const willRetry = Boolean(evt.willRetry);
  if (willRetry) {
    ctx.noteCompactionRetry();
    ctx.resetForCompactionRetry();
    ...
  emitAgentEvent({ runId: ctx.params.runId, stream: "compaction", data: { phase: "end", willRetry } });
```
- `:61` gates the `after_compaction` hook on `!willRetry`.
- The retry is settled at `agent_end` (`lifecycle.ts:102-106` → `resolveCompactionRetry`, `pi-embedded-subscribe.ts:242-258`).
- **Downstream, nobody reads it:** `agent-runner-execution.ts:336-339` reacts to compaction `phase === "end"` and ignores `willRetry`. No lifecycle event carries a retry flag. In non-test code, `willRetry` appears only in `compaction.ts`.

### A.4 The "terminal exactly once" pattern, and the spinner-forever path

The pattern exists, but only in the CLI branch, and it is "once per attempt", not once per run:
```ts
// auto-reply/reply/agent-runner-execution.ts:240-254
              } finally {
                // Defensive backstop: never let a CLI run complete without a terminal
                // lifecycle event, otherwise downstream consumers can hang.
                if (!lifecycleTerminalEmitted) {
                  emitAgentEvent({ runId, stream: "lifecycle",
                    data: { phase: "error", startedAt, endedAt: Date.now(),
                      error: "CLI run completed without lifecycle terminal event" } });
```
The flag is declared at `:182` and set at `:224` and `:238`. It lives inside the `run` closure, so model fallback re-creates it for each candidate. A second, similar backstop exists at `cli/commands/agent.ts:591-615`, but only for the `agent` RPC path.

**Spinner-forever path: confirmed for webchat `chat.send`.**
1. `onAgentRunStart` fires before any run: `agent-runner-execution.ts:93-94`.
2. The embedded run throws before any attempt subscribes, so no lifecycle event is ever emitted. Throw sites:
   - `run.ts:307` (`Unknown model`)
   - `:340` (context window too small)
   - `:365` (locked auth profile)
   - `:495-506` (`throwAuthProfileFailover`)
   - any throw from `ensureOpenClawModelsJson` at `:214`
3. A generic `Error` is rethrown by `model-fallback.ts:426-427`.
4. The catch at `agent-runner-execution.ts:466` returns `kind: "final"` with "⚠️ Agent failed before reply" (`:584-589`). No lifecycle event is emitted.
5. In `gateway/server-methods/chat/handlers.ts`, that text is only pushed into `finalReplyParts` (`:354-363`), and then:
```ts
// :375-376, :397-398
          onAgentRunStart: (runId) => {
            agentRunStarted = true;
  ...
        .then(() => {
          if (!agentRunStarted) {        // false here → broadcastChatFinal skipped
```
The result: no chat `final` or `error` is ever broadcast for that `clientRunId`, and `server-chat` never gets a terminal event. The client spins forever. Webchat is affected; the `agent` RPC path is not, because of `cli/commands/agent.ts:604-614`.

### A.5 Existing tests

- `gateway/server-core/server-chat.agent-events.test.ts`: covers deltas, NO_REPLY, "cleans up agent run sequence tracking when lifecycle completes", and tool routing. No retry case.
- `gateway/server-methods/server-methods.test.ts` (`describe("waitForAgentJob")`): only "maps lifecycle end events with aborted=true to timeout" and "keeps non-aborted lifecycle end events as ok". **The grace window has no test.**
- `agents/subagents/subagent-registry.{announce-loop-guard,nested,steer-restart}.test.ts`, `subagent-registry.persistence.e2e.test.ts`.
- `agents/pi-embedded/pi-embedded-subscribe.lifecycle-billing-error.e2e.test.ts`, `pi-embedded-subscribe.subscribe-embedded-pi-session.waits-multiple-compaction-retries-before-resolving.e2e.test.ts`.
- `auto-reply/reply/agent-runner.runreplyagent.test.ts`, `agent-runner.misc.runreplyagent.test.ts`.
- `agents/pi-embedded-runner/run.overflow-compaction.test.ts` (+ `.e2e`), `run.transport-retry.test.ts`.
- `agents/models/model-fallback.e2e.test.ts`.
- `gateway/openai-http.e2e.test.ts`, `openresponses-http.e2e.test.ts`, `tui/tui-event-handlers.test.ts`, `gateway/server.chat.gateway-server-chat{,-b}.e2e.test.ts`.

### A.6 Smallest fix that follows existing patterns

**Option 1 (recommended): the run's owner emits the terminal event, once.**
1. In `lifecycle.ts:42-50` and `:67-73` (and `:75-86` for `end`), emit a non-terminal phase such as `"attempt_end"` or `"attempt_error"` with the same data. Every consumer above matches `"end"`/`"error"` exactly, so all of them ignore it automatically. Keep the `agent.run_error` reliability event (`:54-66`).
2. In `agent-runner-execution.ts`, lift the existing `lifecycleTerminalEmitted` try/catch/finally from the CLI branch (`:182-255`) up around the whole `while (true)` (`:108-591`) for both branches:
   - emit `end` at `:465`, where the loop breaks on success;
   - emit `error` on the final-failure returns (`:584`, plus the reset returns at `:446`, `:456`, `:494`, `:504`, `:550`);
   - add a `finally` backstop;
   - delete the per-candidate CLI emissions.

   This also fixes the spinner-forever path in A.4.
3. `cli/commands/agent.ts:575-615` already has the backstop. With per-attempt `end`/`error` gone, it emits exactly once without changes.
4. **Not traced:** the other `runEmbeddedPiAgent` callers, `auto-reply/reply/followup-runner.ts:142`, `platform/cron/isolated-agent/run.ts:502` and `auto-reply/reply/agent-runner-memory.ts:115`, would lose their terminal events. If anyone waits on their `runId`s, they need the same wrapper.

**Option 2 (smaller diff, weaker): copy `agent-job.ts`'s grace window into the two broken consumers.**
- In `subagent-registry.ts:310`, on `error`, defer `startSubagentAnnounceCleanupFlow` by `AGENT_RUN_ERROR_RETRY_GRACE_MS` and cancel it on `start` (`:297`).
- In `server-chat.ts`, defer the `error` branch at `:480-502` together with `:514-520`.

Costs: users wait up to 15 s to see a real error, the premature `end` case is not fixed, and the A.4 spinner is not fixed.

---

## B. False "the server restarted" apologies on every deploy

### B.1 Table, inserts, deletes

**Table:** `agents/in-flight-turns/store.ts:18-34`, in the SQLite file `in-flight-turns.db` (`gateway/server-core/server-startup.ts:138`). It has timestamps:
```ts
    user_content TEXT NOT NULL,
    language TEXT,
    started_at INTEGER NOT NULL,
    status TEXT NOT NULL,
    recovery_attempts INTEGER NOT NULL DEFAULT 0,
    last_recovery_at INTEGER
```

| Operation | Anchor | Callers |
|---|---|---|
| INSERT, `status='running'`, `started_at=Date.now()` | `store.ts:115-149` (`recordStart`) | only `run.ts:164-179` (skipped for `probe-` sessions) |
| DELETE (`markCompleted`) | `store.ts:152-162` | only `run.ts:1302-1303` |
| DELETE (`deleteRow`) | `store.ts:213-223` | `recovery.ts:105`, `:119`, `:149` |
| UPDATE `status='interrupted'` | `store.ts:165-175` | `recovery.ts:145` |
| UPDATE recovery attempt / re-tag instance | `store.ts:191-210` | `recovery.ts:112` |

Decisive code:
```ts
// run.ts:1271
          inFlightTurnSucceeded = true;
// run.ts:1298-1304
      } finally {
        // Mark this turn complete only on successful return. If we never
        // set the success flag (throw, abort, process exit before this
        // point), the row stays at status='running' for recovery.
        if (inFlightTurnSucceeded && inFlightTurnRowId !== null) {
          markCompleted(inFlightTurnRowId);
        }
```
That `try` opens at `run.ts:598`. The row is inserted earlier, at `:164`.

### B.2 Exit paths of `runEmbeddedPiAgent`

| Exit | Anchor | Row deleted? |
|---|---|---|
| throw: unknown model | `:307` | **No.** Before the `try` at `:598`, so no `finally` runs at all. |
| throw: context window too small | `:340` | **No** (pre-try) |
| throw: locked auth profile missing | `:365` | **No** (pre-try) |
| throw: auth failover | `:495-506` | **No** (pre-try) |
| return: **semantic-cache hit (a successful answer)** | `:521-527` | **No** (pre-try, flag never set) |
| return: context-overflow error payload | `:907` | **No** |
| return: role-ordering error payload | `:933` | **No** |
| return: image-size error payload | `:961` | **No** |
| throw: FailoverError / promptError | `:1029`, `:1037`, `:1159` | **No** |
| return: timeout with no payloads | `:1215` | **No** |
| any unexpected exception inside the loop | `:598-1297` | **No** |
| normal return (also covers `aborted=true` that reaches here) | `:1271-1296` | **Yes** |

**Where the audit is wrong about abort:** a user abort normally reaches `:1271`. `promptError` handling is skipped when `aborted` (`:929`), and `shouldRotate` is false unless `timedOut` (`:1081-1082`). So an abort deletes the row. A timeout leaks only through `:1159` (if fallback is configured) or `:1215`.

### B.3 The drain and the boot recovery

**Correction: `drainInFlightTurns` is the shutdown path, not boot.**
- It is registered in `gateway/server-core/server-close.ts:173-179` (phase `"draining"`, `timeoutMs: 1_500`).
- Boot uses a different function, `recoverInterruptedTurns`, called at `server-startup.ts:360`.

**Shutdown drain:** `agents/in-flight-turns/recovery.ts:134-157`. It has **no age filter**:
```ts
  const rows = listForCurrentInstance().filter((r) => r.status === "running");
  ...
  for (const row of rows) {
    markInterrupted(row.id);
    const ok = await sendApology(deps.cfg, row);
    if (ok) {
      summary.apologized++;
      deleteRow(row.id);
    }
```
- **Reads:** every `running` row stamped with this process's `gateway_instance_id` (`store.ts:178-180`). That is every row leaked since this process booted, however old.
- **Sends:** `APOLOGY_COPY` (`recovery.ts:38-41`): "Mi servidor se reinició mientras respondía…" / "My server restarted while answering. Please re-send your message."
  - `run.ts:178` always passes `language: undefined`, so everyone gets the Spanish text (`recovery.ts:43-44`).
  - **Channel:** `loadChannelOutboundAdapter(row.channel).sendText({ cfg, to: row.chatId, text, accountId })` (`recovery.ts:58-68`), with a 3 s timeout per send (`:36`, `:71-74`).
- **Deletes:** only after a successful send. A failed send leaves the row at `interrupted` for the boot path.
- **Budget:** a 1.5 s total budget for sequential 3 s sends means a backlog will not finish. I did not trace what the resource-manager timeout does to the loop that is still running.

**Boot recovery:** `recovery.ts:89-126`. It **does** filter by age (30 min) and by loop count (2 attempts):
```ts
const STALE_AFTER_MS = 30 * 60 * 1000;          // :34
const MAX_RECOVERY_ATTEMPTS = 2;                // :35
...
    const isStale = now - row.startedAt > STALE_AFTER_MS;      // :102
    const looped = row.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS;
    if (isStale || looped) { deleteRow(row.id); ... continue; }
```
Otherwise it apologizes and always deletes the row (`:112-119`). So the claim "on boot … no staleness filter" is **wrong**. Boot still apologizes for rows from other instances that are under 30 minutes old: leaked error turns, or rows the drain failed to clear.

### B.4 Can a row belong to a turn that finished long ago? Yes. Concrete sequence

1. Model fallbacks are configured and the gateway (instance X) has been up for days.
2. A WhatsApp user sends a message. `agent-runner-execution.ts:159` → `runWithModelFallback` → `runEmbeddedPiAgent` inserts row R1 (`run.ts:166`).
3. The primary model is rate-limited. `run.ts:1159` throws FailoverError and the `finally` skips `markCompleted`, so R1 stays `running`.
4. `model-fallback.ts:430` moves to the next candidate. A second `runEmbeddedPiAgent` inserts R2, succeeds, and deletes R2 at `:1303`. The user gets a correct answer within seconds.

   Equivalent single-call leaks: a semantic-cache hit (`:521`), or an error-payload return (`:907`/`:933`/`:961`/`:1215`) where the user already got the error text.
5. Days later, a deploy sends SIGTERM. `server-close.ts:178` → `drainInFlightTurns` lists R1 (same instance, `running`, any age) and sends "My server restarted while answering. Please re-send your message." to a chat whose question was answered days ago.
6. If that send fails or times out, R1 is `interrupted`. On the next boot, `recoverInterruptedTurns` drops it silently because it is older than 30 min. Rows leaked in the last 30 minutes before the deploy get apologized on boot as well.

Other callers write rows too, so a failure in any of them yields an apology for a message the user never sent:
- `agent-runner-memory.ts:115` (memory flush)
- `platform/cron/isolated-agent/run.ts:502` (cron)
- `followup-runner.ts:142` (follow-ups)

For these, `chatId` falls back to `currentChannelId ?? messageTo ?? sessionKey ?? sessionId` (`run.ts:169-173`). I did not trace which ones carry a real channel or recipient.

### B.5 Existing tests

- `agents/in-flight-turns/store.test.ts`: "creates the table on open", "records a row with current instance id", "markCompleted deletes the row", "markInterrupted flips status to interrupted", "listFromOtherInstances excludes rows from the current instance", "markRecoveryAttempt increments counter and re-tags instance", "deleteRow removes the row", "recordStart returns null when store is closed", "getGatewayInstanceId returns a stable UUID per process", "ordering by started_at ASC is stable across instances".
- `agents/in-flight-turns/recovery.test.ts`: "apologizes for rows from a prior instance and cleans up", "backdated stale row (>30 min) is dropped without apology", "drops rows that exceed MAX_RECOVERY_ATTEMPTS without sending apology", "returns zero counts when no rows exist", "drain apologizes for current-instance running rows and deletes on success", "drain leaves rows at status=interrupted when apology send fails".
- `gateway/server-core/server-close.test.ts`, `server-close-fanout.test.ts`: these mock both in-flight modules.
- **No test covers `run.ts` writing or deleting rows.** The store is never opened in the runner tests, so `recordStart` returns null there.

### B.6 Smallest fix

The fix is all in `run.ts`. Recovery exists for process death, and every other exit already gives the user a reply or an error.
1. Move the `recordStart(...)` block (`:164-179`) to just before `try {` at `:598`. The pre-try throws and the semantic-cache return then never insert a row.
2. Drop the `inFlightTurnSucceeded` flag (`:180`, `:1271`) and delete unconditionally in the existing `finally`:
   ```ts
   if (inFlightTurnRowId !== null) { markCompleted(inFlightTurnRowId); }
   ```
   Also fix the comment at `:158-163` and `:1299-1301`.

   Crash or OOM skips the `finally`, so those rows survive as intended. On a graceful SIGTERM the drain still sees turns that are really mid-flight.
3. Optional one-liner, in case of rows left by an older build: make the drain at `recovery.ts:138` reuse `STALE_AFTER_MS` the way the boot path does.
4. Test: open a store on a temp path (as `store.test.ts` does) in `run.overflow-compaction.test.ts`. Assert that the table is empty after the context-overflow error return (`:907`) and after a thrown FailoverError.

---

I did not check the SDK's `agent_end` / `auto_compaction_end` ordering (outside `src/`), how the shutdown resource manager's timeout affects a drain loop that is still running, or which non-reply callers carry a real recipient. I edited nothing.