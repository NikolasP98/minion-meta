# Gateway Turn Recovery

**Status:** Draft → ready for implementation
**Owner:** minion gateway
**Date:** 2026-05-22

## Problem

When the minion gateway restarts (deploy, crash, OOM, systemd reload) while an agent is mid-response, the user is left with no signal. Their chat shows a stale "thinking" indicator forever; the agent's in-flight LLM call is dropped and never resumes. There is no apology, no retry, no recovery.

Observed in production 2026-05-22 12:36:50 PT — PANIK Telegram agent received *"send me the manual de usuario PDG file"* exactly as a deploy-driven restart began. Screenshot shows the agent stuck on thinking-emoji indicator with no follow-up message ever delivered.

## Goals

- A turn interrupted by gateway shutdown is **automatically resumed** on the next boot.
- The user is notified once that interruption happened, in their channel.
- No double-bill: don't re-run if user already re-sent and got served.
- No loop: a recovery that itself crashes won't repeat indefinitely.
- No new dependencies — SQLite (already in gateway state) only.

## Non-goals (v1)

- Recovery of streaming partial responses — always replay from scratch.
- Cross-process LLM billing dedup — if the original turn produced output before crash, the provider still billed; we accept that.
- Per-chat language detection — Spanish default for the apology copy; English fallback when the agent's primary language is `en`.
- User-confirmation prompt ("retry?") — auto-replay; cheaper to over-respond than to stall.
- Recovery of plugin-driven (non-agent) turns — only `runEmbeddedPiAgent` turns are tracked in v1.

## Architecture

### Discovery facts (verified 2026-05-22)

- `createGatewayCloseHandler` at `src/gateway/server-core/server-close.ts:9` already runs on graceful shutdown. It broadcasts `shutdown {reason, restartExpectedMs}` to WS clients (control-UI / hubs) but does NOT message end-user chats.
- No `process.on('SIGTERM'|'SIGINT')` handlers in `src/` (`rg -nE "SIGTERM|SIGINT" src/` is empty). systemd `Restart=on-failure` + process exit drives shutdown. Need to verify whether the close handler is wired to a signal in the entry layer or only via WS-initiated close.
- `runEmbeddedPiAgent` at `src/agents/pi-embedded-runner/run.ts:207` is the canonical agent turn entry. `params.abortSignal` already threads to the LLM at `:687`.
- Turns are serialized per-session via `enqueueCommandInLane(sessionLane, ...)` and per-global via `enqueueCommandInLane(globalLane, ...)` at `run.ts:212-215`. Recovery re-entering the same lane will naturally serialize with concurrent user retries.
- No in-flight-turn registry exists. We build one.

### Components

```
┌─────────────────────────────────────────────────────────────┐
│  src/agents/in-flight-turns/store.ts        (new)           │
│    - SQLite table `in_flight_turns`                         │
│    - recordStart, markCompleted, markInterrupted,           │
│      listFromOtherInstances                                 │
└────────────────┬────────────────────────────────────────────┘
                 │ used by
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  src/agents/pi-embedded-runner/run.ts       (modify)        │
│    runEmbeddedPiAgent:                                      │
│      - recordStart(params) → rowId                          │
│      - try { ...existing... }                               │
│        finally on success → markCompleted(rowId)            │
│      - on throw: row left at status='running'               │
└────────────────┬────────────────────────────────────────────┘
                 │ wired by
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  src/gateway/server-core/server-startup.ts  (modify)        │
│    + recoverInterruptedTurns() after channels are up        │
│                                                             │
│  src/gateway/server-core/server-close.ts    (modify)        │
│    + drainInFlightTurns() BEFORE stopChannel                │
│    + signal abort to running turns                          │
└─────────────────────────────────────────────────────────────┘
```

### SQLite schema

Table lives in the gateway state dir alongside existing per-feature DBs:

```sql
-- {stateDir}/in-flight-turns.db
CREATE TABLE in_flight_turns (
  id INTEGER PRIMARY KEY,
  gateway_instance_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  account_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  session_key TEXT,
  user_message_id TEXT,
  user_content TEXT NOT NULL,
  language TEXT,                    -- 'es' | 'en' | null (best-effort)
  started_at INTEGER NOT NULL,
  status TEXT NOT NULL,             -- 'running' | 'interrupted'
  recovery_attempts INTEGER NOT NULL DEFAULT 0,
  last_recovery_at INTEGER
);
CREATE INDEX in_flight_turns_chat ON in_flight_turns (channel, account_id, chat_id);
CREATE INDEX in_flight_turns_instance ON in_flight_turns (gateway_instance_id);
```

Rows are **deleted** when a turn completes successfully — no `'completed'` status. This keeps the table small.

### Process instance ID

A random UUID generated once per gateway boot, held in module-level state. Persisted nowhere on disk; rows simply outlive their owner-instance and become eligible for recovery from any *other* instance.

### Turn lifecycle

```
            ┌──────────────────────┐
            │  user message in     │
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │ runEmbeddedPiAgent   │
            │ • recordStart →id    │
            │   status='running'   │
            └──────────┬───────────┘
                       ▼
                 ┌─────┴─────┐
       success   │           │   crash / shutdown
                 ▼           ▼
       ┌──────────────┐  (row left at status='running')
       │ markCompleted│
       │  (DELETE id) │
       └──────────────┘
```

### Boot recovery

```
  startGatewaySidecars (existing)
        │
        ▼
  startChannels (existing)
        │
        ▼
  recoverInterruptedTurns (NEW)
        │
        ▼
  for row in listFromOtherInstances():
    if hasNewerInboundSince(row.chat, row.started_at):
      DELETE row                                # user already retried
      continue
    if row.started_at < now - 30min:
      DELETE row                                # stale
      continue
    if row.recovery_attempts >= 2:
      DELETE row                                # loop guard
      continue
    sendApology(row)                            # one user-visible message
    UPDATE row SET recovery_attempts++, last_recovery_at, status='running',
                   gateway_instance_id=current
    runEmbeddedPiAgent(replayParams(row))       # joins session lane
```

### Graceful shutdown drain

```
  createGatewayCloseHandler (existing)
        │
        ▼
  drainInFlightTurns (NEW)
        │
        for each running row of this instance:
          row.abortController.abort()           # LLM billing stops
          markInterrupted(row.id)
          sendApology(row)                       # best-effort, 3s timeout
        │
        ▼
  for plugin in listChannelPlugins:             # existing
    stopChannel(plugin.id)
```

The 3s cap protects against a hung send blocking shutdown indefinitely. WhatsApp `getPendingNotifications` boot-drain (already exists in alert-watcher) will catch sends that didn't make it.

## Recovery message copy

```
es: "Mi servidor se reinició mientras respondía. Estoy reintentando..."
en: "My server restarted while answering. Retrying..."
```

Language pulled from the agent's primary language config; falls back to `es` if unset.

## Idempotency & races

| Scenario | Outcome |
|---|---|
| User re-sent during downtime | `hasNewerInboundSince` skips recovery; row deleted. |
| User sends new message DURING active recovery | New turn enqueues behind recovery in the session lane (`enqueueCommandInLane` already does this). |
| Recovery itself crashes | `recovery_attempts++` on entry; max 2 → row dropped. |
| Multiple gateway processes (HA) | Out of scope; current arch is single-process. |
| Same chat had 2 in-flight turns at restart | Both rows recovered, both join lane in `started_at` order. |

## Test plan

### Unit (`store.test.ts`)
- `recordStart` inserts row with current instance_id.
- `markCompleted` deletes row.
- `listFromOtherInstances` filters out current instance correctly.
- `recovery_attempts` increments via `UPDATE`.

### Integration (`run.recovery.test.ts`)
- Inject a recordStart into the run path; abort mid-call; verify row remains `status='running'`.
- Verify on completion, row is deleted.
- Verify `recoverInterruptedTurns` calls `runEmbeddedPiAgent` again with the persisted params.

### Manual / e2e (post-deploy on netcup)
- Send message → restart gateway during response → verify:
  - apology message lands in chat
  - resumed response follows
  - row is gone after success.
- Stale: backdate `started_at` to 1h ago, restart → recovery skipped, row deleted.

## Rollout

- All 3 phases shippable independently. Behind a config flag `agents.turnRecovery.enabled` (default `true`) for one release; remove flag once stable.
- Single commit per phase. CI passes before next phase.
- Deploy to netcup via the established overlay-built-bundle recipe; expected blast radius = gateway only.

## Phases

### Phase 1 — Persistence layer (~1h)
Files: `src/agents/in-flight-turns/{store.ts,store.test.ts}`, `src/agents/in-flight-turns/index.ts`.
Schema init on first access. Helpers + unit tests.

### Phase 2 — Hook `runEmbeddedPiAgent` (~1h)
Edit `src/agents/pi-embedded-runner/run.ts` to wrap the existing body with recordStart/markCompleted. Wire `abortSignal` linkage to a per-row controller stored in module state so the close handler can find it. Test that a normal run still passes; test that an aborted run leaves a row.

### Phase 3 — Boot recovery + shutdown drain (~1.5h)
Edit `src/gateway/server-core/server-startup.ts` to call `recoverInterruptedTurns(deps)` after channels start.
Edit `src/gateway/server-core/server-close.ts` to drain running turns before `stopChannel`.
Recovery message copy + language detection (best effort).

## Open questions

- Where is the SIGTERM → close-handler wiring? `rg` finds no signal handlers. Likely in the entry layer (`src/cli/` or `entry.ts`) or via an external WS-initiated close. Resolve in Phase 3 — may need to ADD signal handlers if none exist (then systemd-initiated restarts will properly drain).
- The agent's "thinking" UI indicator — what sends it? Telegram chat actions auto-expire after 5s; the lasting visual is likely a Telegram message the agent sent before the LLM call (e.g., a status sticker). Need to identify and either edit-to-completed or delete on shutdown drain. Defer to a P3 polish task if mechanism is non-trivial.

## References

- `src/gateway/server-core/server-close.ts:9` — existing close handler
- `src/agents/pi-embedded-runner/run.ts:207` — turn entry point
- `src/agents/pi-embedded-runner/run.ts:687` — existing abortSignal threading
- 2026-05-22 user report screenshot, PANIK chat 12:36 PM
