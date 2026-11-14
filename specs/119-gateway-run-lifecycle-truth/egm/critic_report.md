# Design critique: spec 119, gateway run lifecycle truth

Mode: REVIEW. I read the three target files, the evidence file, the persona and the standard. I checked the claims against the gateway at `/home/nikolas/.cache/claude-tmp/egm-116/gw/src/` and the hub at `/home/nikolas/.cache/claude-tmp/egm-116/hub/src/lib/`. Gateway paths below are relative to `gw/src/`.

**Verdict: not ready.** One Blocker in Slice 2 and five Majors. Slice 1 is close; it needs two changes.

---

## Blocker

### B1. "Normal return emits `end`" reports a failed run as a success

**Scope:** plan Slice 2 steps 2–3; spec FR-005, US2 acceptance scenario 3, D4.

- **What the plan does:** the wrapper emits `end` on normal return, the success break at `auto-reply/reply/agent-runner-execution.ts:465` reports `end`, and `cli/commands/agent.ts:591-601` "needs no change".
- **Why that is wrong:** `runEmbeddedPiAgent` returns normally when the last attempt failed and nothing retried it.
  - In `agents/pi-embedded-runner/run.ts:1081-1167`, if no profile rotates and `fallbackConfigured` is false, or the assistant error is not a failover error, control falls through to `:1169-1296`.
  - That path builds error payloads and returns with no `meta.error`.
- **What carries the failure today:** only the per-attempt `error` from `agents/pi-embedded/pi-embedded-subscribe.handlers.lifecycle.ts:42-50`, which the plan renames.
- **Result after the plan:**
  - **Web chat:** gets `final`/`done` with an empty buffer (`gateway/server-core/server-chat.ts:272-296`). The error text sits in `finalReplyParts` and is dropped because `agentRunStarted` is true (`gateway/server-methods/chat/handlers.ts:354-398`).
  - **Sub-agent registry:** records `ok` (`agents/subagents/subagent-registry.ts:310-317`), so the parent is told a failed child succeeded.
  - **`agent.wait`:** returns `ok` (`gateway/server-methods/agent-job.ts:93`).
  - **Responses endpoint:** returns `completed` with "No response from Minion." (`gateway/openresponses-http.ts:737-740`).

**Change:**
- The owner derives the outcome from the last attempt-level phase seen for the run. If it was `attempt_error`, emit `error` with that text; otherwise emit `end`.
- The `onAgentEvent` callback already reaches every owner (`cli/commands/agent.ts:575-584`).
- `cli/commands/agent.ts` does need editing: track the last attempt phase instead of `lifecycleEnded`.
- Add a D4 test: a single attempt with `stopReason: "error"` and no fallback produces one `error`.

---

## Major

### M1. The caller list is incomplete, and a missed caller fails badly

**Scope:** plan Slice 2 step 3, Risks row 1, T201.

Callers of `runEmbeddedPiAgent` / `runCliAgent` that I found:

| Caller | Run id | Outer retry scope | In plan? |
|---|---|---|---|
| `auto-reply/reply/agent-runner-execution.ts:184`, `:272` | `opts.runId` or a UUID (`:93`); web chat passes `clientRunId` | `while (true)` `:108-591` around `runWithModelFallback` `:159` | Yes |
| `auto-reply/reply/followup-runner.ts:142` | UUID (`:118`) | `runWithModelFallback` `:130-190`; catch `:194` returns silently | Yes |
| `auto-reply/reply/agent-runner-memory.ts:115` | `flushRunId` | `runWithModelFallback` `:99` | Yes |
| `platform/cron/isolated-agent/run.ts:486`, `:502` | the session id (`:498`, `:519`) | `runWithModelFallback` `:477-524`; also reached from `gateway/server/hooks.ts:86` | Yes |
| `cli/commands/agent.ts:120`, `:144` | `opts.runId` | `runWithModelFallback` `:541-587`; backstop `:591-615` | Yes, "no change" (wrong, see B1) |
| `cli/commands/models/list.probe.ts:310` | `probe-<uuid>` | none | **No** |
| `extensionAPI.ts:7` (public re-export) | caller's | unknown | **No**, and cannot be wrapped at the call site |

- `agentCommand` covers the gateway `agent` method (sub-agent spawns), both streaming HTTP endpoints, `acp-messages-http.ts`, `boot.ts`, `server-node-events.ts` and `mesh.ts`.
- Compaction does not subscribe a session; `subscribeEmbeddedPiSession` is only called at `run/attempt.ts:230`.
- T201's stop condition ("stop and report if one cannot be wrapped") is already met by `extensionAPI.ts`.

What a caller with no terminal event loses:
- `server-chat.ts:514-520` never clears run context, `agentRunSeq` or `seenRunIds`.
- `agent-job.ts:121-143` adds the run to `activeBySessionKey` on each attempt `start` and removes it only on `end`/`error`. That feeds `isSessionKeyBusy`, used at `channels/impl/telegram/bot-message.ts:97`, so a Telegram session stays "busy" for the life of the process.

This resolves the spec's "known unknown" about whether the other callers have a consumer: they do, so wrapping is mandatory.

**Change:** make the rename opt-in.
- `handleAgentEnd` emits `attempt_*` only when the caller passes a flag such as `deferRunTerminal`.
- The five wrapped owners pass it.
- Probe and extension callers keep today's behaviour, so a missed caller cannot regress.

### M2. The idempotency `Set` is incoherent and unnecessary

**Scope:** plan Risks row 3.

- A set "cleared on emit" deduplicates nothing.
- A set that is never cleared leaks, and it suppresses the terminal event of a legitimately reused run id. Cron uses the session id as run id (`platform/cron/isolated-agent/run.ts:519`), so the second cron turn of a session would be silenced.
- No owner in the plan wraps another owner; they are siblings. The nested case the set guards against does not exist.

**Change:** delete the set. Use a local boolean inside the wrapper, as `agent-runner-execution.ts:182` already does.

### M3. Moving the insert to `:598` leaves proactive compaction uncovered

**Scope:** plan Slice 1 step 1; spec FR-002, I1.

- `run.ts:546-596` runs `compactEmbeddedPiSessionDirect`, a model call, before the `try`.
- A stop signal during that call finds no row. The customer gets no apology and the message is lost. Today the row exists at that point.
- The block at `:546-596` cannot throw: its body is entirely inside a `try`/`catch` that only logs.

**Change:** insert the row immediately before `:543`, not `:598`. This still avoids the cache-hit return (`:521-527`) and the configuration throws, and the existing `finally` still covers every exit.

### M4. The drain's 30-minute filter protects against nothing

**Scope:** spec FR-003, US1 acceptance scenario 4, D2; plan Slice 1 step 3.

- The drain lists only this process's rows (`agents/in-flight-turns/store.ts:178-180`, `recovery.ts:138`).
- A row "left by an older build" carries another instance id. Only boot recovery sees it, and boot recovery already filters (`recovery.ts:102`).
- After the `finally` fix, no row in the current process outlives its turn.
- So the filter can only match a turn that is really running for over 30 minutes, and it drops that turn silently.
- The default timeout is 600 seconds (`agents/runtime-utils/timeout.ts:3`), so normal customer turns are unaffected. Configured long timeouts are not.

**Change:** drop FR-003, scenario 4 and D2. If kept as defence in depth, state that honestly and do not describe it as cleaning older-build rows.

### M5. Internal runs still apologise when a stop arrives mid-run

**Scope:** spec Edge Cases bullet 3; plan has no step for it.

- Every non-probe caller still inserts a row (`run.ts:164-179`). The plan only stops rows being left behind.
- Affected runs: heartbeat (through `agent-runner-execution.ts`), cron, hooks, sub-agents, boot and node events.
- Cron rows have no recipient, so `chatId` falls back to the session key (`run.ts:169-173`).
- The drain sends sequentially with a 3-second timeout per send inside a 1.5-second task budget (`recovery.ts:36`, `server-close.ts:176`). One unroutable row sorted ahead of a customer's row uses up the budget.

**Change:** record the row only for customer turns. Add an opt-in parameter passed by `agent-runner-execution.ts` (when not a heartbeat) and `followup-runner.ts`. Otherwise, narrow the edge-case text to what the plan delivers.

---

## Minor

- **Invariant I2 is false as written.** `start` is emitted per attempt (`lifecycle.ts:13-27`) and per CLI candidate (`agent-runner-execution.ts:172-179`). A run that throws before any attempt emits `error` with no `start`. Nothing breaks: `agent-job.ts:114-130`, `subagent-registry.ts:297-303` and `tui/tui-event-handlers.ts:286` all tolerate repeats. Reword I2 to "zero or more `start`".
- **The owner's `end` must carry `aborted`.** `agent-job.ts:93` and `subagent-registry.ts:313` map it to `timeout`. The per-attempt `end` never carried it, so sub-agent timeouts will change from `ok` to `timeout`. State this as an intended change.
- **Error text for the reset returns.** For the returns at `agent-runner-execution.ts:446`, `:456`, `:494`, `:504`, `:550` and `:584`, specify that `error` carries the user-facing payload text. Otherwise web chat shows a raw error and never the "I've reset the conversation" message.
- **Gap between fallback candidates.** The first row is deleted before the second call inserts its own, and the 2.5-second transient retry sleep sits in that gap (`agent-runner-execution.ts:567`). A stop there sends no apology. Acceptable; record it as a known limit.
- **A turn that ends during shutdown.** `markCompleted` in `finally` also deletes a row the drain marked `interrupted` after a failed apology. The window is narrow and success already did this today.

---

## Answers to the numbered questions, where sound

1. **Unconditional delete is safe across re-entrancy.**
   - Each call gets its own row id (`store.ts:115-149`) and deletes by id (`:158`).
   - Model fallback calls the function again, which makes a new row.
   - The retry `while` stays inside the one `try` (`run.ts:598-1298`).
   - Session lanes serialise calls per session (`run.ts:155`).
   - Abort and timeout exits return inside the `try`.
   - Process death skips `finally`, as intended.
2. **The drain still sees in-flight turns.**
   - Tasks in the draining phase run in parallel (`server-owned-resources.ts:644`).
   - The drain lists rows synchronously before any await.
   - Web chat aborts (`server-close.ts:139-157`) settle asynchronously afterwards.
3. **Non-customer rows:** see M5.
4. **No consumer needs the per-attempt `end` to release resources.**
   - Block-reply flush and compaction settlement run in `handleAgentEnd` regardless of what it emits (`lifecycle.ts:89-106`).
   - Typing uses the tool and compaction streams (`agent-runner-execution.ts:324-352`).
   - `server-chat.ts:514-520` cleanup moves to the run's real end.
   - The callbacks in `followup-runner.ts:179-187` and `agent-runner-memory.ts:126-133` read only the compaction stream.
   - `acp/translator.ts:310` reads only the tool stream.
   - **Hub:** `hub/src/lib/services/gateway.svelte.ts` reads chat `state` (`:1422-1553`) and tool phases (`:1362-1401`). It never reads a lifecycle phase, so the rename is invisible to it.
7. **The `chat/handlers.ts` claim holds.**
   - The run id is the client's run id (`handlers.ts:372`, `agent-runner-execution.ts:93`).
   - Run context is registered before any attempt (`:95-101`).
   - With no chat link, `server-chat.ts:337` resolves the session key from that context and `:495-501` sends the chat `error` for the client's run id.
   - This depends on the emission happening inside `runAgentTurnWithFallback`.
9. **The rejected alternatives are rejected for valid reasons.**
   - The grace-window copy is correctly dismissed.
   - `willRetry` cannot be known at emit time (`run.ts:1029-1159`).
   - The simpler design that was not considered is the opt-in flag in M1.

---

## Not verified

- Node and device clients that receive forwarded agent events (`server-chat.ts:476`); they are outside the tree.
- Whether `@minion-stack/shared` types the phase as a closed union.
- SDK ordering of `agent_end` against a thrown prompt error.
- What `buildEmbeddedRunContexts` puts in a memory-flush row.
- How channel adapters treat a session key passed as `to`.
- `run.ts:200-480`: I relied on the evidence file for the throw sites at `:307`, `:340` and `:365`.
- Callers of `runClaudeCliAgent` (`agents/cli-runner/cli-runner.ts:392`).
- No tests were run; this is a static read only.

**Skipped:** the test-file plan and the `ws-log` claim were not checked line by line. **Risk to carry forward:** B1 turns failures into silent successes for sub-agents and web chat; do not start Slice 2 until the outcome rule is written into the plan.