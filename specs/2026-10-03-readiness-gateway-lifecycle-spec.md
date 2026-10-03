---
id: 2026-10-03-readiness-gateway-lifecycle-spec
title: Gateway delivery durability and owned lifecycle
stage: dev
status: implementing
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion]
tags: [data, logic, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Gateway readiness batch 2: delivery durability and owned lifecycle

## 0. Product

The gateway must retain undelivered work, bound background resource use and make startup and shutdown observable. This batch covers GW-008 through GW-017 in independently reviewed slices.

## Out of scope

Production release and merges are separate gates. Slice B includes shared-client and Hub/Site session adoption only as its explicit dependency; other UI and security RPC work retains separate ownership. Provider exactly-once delivery is claimed only with a verified provider idempotency receipt.


Status: Slice A/A2 and the GW-015 operator/provider closure slice are implemented and reviewed; Slice B (GW-009/GW-010) is approved for implementation after Standards and Spec review (revision 6)
Baseline: `minion/minion` `origin/DEV` at `b841c36750e4bf10dd3f81a4896b19c699fe3132`, with reviewed gateway checkpoints through `3e352a68acd396bad09d22309cbab8d82a9cc01d` applied
Findings: GW-008 through GW-017
Immediate implementation slice after approval: Slice B, GW-009 and GW-010 together
Primary scope: outbound delivery, gateway-owned background resources and shutdown, cron cancellation, brain-vector fencing, workshop/node work limits, memory sink durability, and event-store sampling. Cross-project Hub or protocol changes remain separately owned and must land before their dependent gateway slice is called complete.

## Observable outcome

Outbound delivery reports mixed success explicitly and never deletes a durable queue entry because a `bestEffort` caller omitted an error callback. Queue entries have a versioned, crash-safe per-payload state, so recovery retries only unfinished work. A crash between provider acceptance and the local checkpoint is represented as uncertain unless that channel supports replay with the same provider idempotency key.

Gateway startup returns one owner for every background resource. Shutdown stops admission, aborts owned work, runs independent finalizers despite errors, and completes within defined component and overall deadlines with a bounded summary. Cron runs remain owned until cooperative cancellation settles or the run is durably classified as uncertain. Workshop sync and node invocation use bounded work and socket-send policies. Memory HTTP failures become visible and durable where product policy requires. Durable event history remains exact; sampling may reduce only live broadcast or logs and must expose what it drops.

## Common lifecycle and durability rules

- **Accepted** means the provider returned a success receipt for one whole logical payload. It does not mean the queue checkpoint is durable. A payload with one accepted chunk followed by a failed chunk is not accepted.
- **Provider succeeded** means every logical payload was accepted or intentionally suppressed.
- **Provider failed** means no logical payload was accepted/suppressed and every attempted effect is a definite failure.
- **Provider partial** means at least one logical payload was accepted/suppressed and at least one is a definite failure, with no ambiguous effect. `partial` is never used as a synonym for all-failed.
- **Provider uncertain** means any external effect may have succeeded but lacks a durable receipt or a multi-operation logical payload stopped after at least one child was accepted. Uncertainty takes precedence in the delivery summary and is never automatically replayed without verified provider idempotency.
- **Checkpointed** means the current payload states were written, file-synced, atomically renamed, and the containing directory was synced where the platform supports it. A checkpoint can truthfully contain pending or uncertain work; it does not make provider delivery complete.
- **Acknowledged** means every logical payload is durably `accepted` or `suppressed`, the active queue file was unlinked, and the queue directory sync succeeded. Only this state is removable success.
- **Durability degraded** means queue creation, checkpoint, unlink, or directory sync failed. A caller that requests required durability fails before a new provider send when queue creation fails; compatibility callers receive an explicit durability result from the outcome API.
- **Owned resource** means startup returns an idempotent stop/finalize handle, registers it before advertising readiness, and transfers no timer, socket, database, or detached promise outside the gateway lifecycle.

Errors and receipts must not include message bodies, raw credentials, JWTs, or workshop document contents. Stable IDs and bounded error classes are sufficient for observability.

## GW-008: explicit best-effort delivery outcome

### AS-IS

`deliverOutboundPayloads` tracks a partial failure only when the caller supplied `onError`. With `bestEffort: true` and no callback, `deliverOutboundPayloadsCore` catches a provider error, the wrapper leaves `hadPartialFailure` false, acknowledges the write-ahead entry, deletes it, and resolves with only the successful provider results. Restart-sentinel and node-receipt callers use that shape and rely on `catch`, which never runs for the partial result. Startup recovery also treats any resolved delivery as complete and acknowledges the whole entry.

### TO-BE

The core always records each logical payload outcome independently of caller hooks. Add a sibling API, `deliverOutboundPayloadsWithOutcome`, whose result is a discriminated aggregate:

```ts
type OutboundDeliveryOutcome = {
  delivery: {
    status: "succeeded" | "partial" | "failed" | "uncertain";
    results: OutboundDeliveryResult[];
    failures: Array<{ payloadId: string; error: string }>;
    failureCount: number;
    uncertainPayloadIds: string[];
    uncertainPayloadCount: number;
  };
  durability: {
    status: "not-requested" | "checkpointed" | "acknowledged" | "degraded";
    queueId?: string;
  };
  observerErrors: Array<{
    stage: "onPayload" | "onError" | "messageSending" | "messageSent" | "mirror";
    error: string;
  }>;
  observerErrorCount: number;
  retryDisposition: "not-needed" | "retryable" | "withheld";
};
```

Failure lists, uncertain IDs, observer errors, provider receipt IDs, and error strings are bounded. The stable payload ID comes from the versioned queue when queued, or from an in-memory delivery plan when `skipQueue` is intentional. Provider delivery and queue durability are separate axes: accepted results plus a failed checkpoint produce `delivery.status === "succeeded"` and `durability.status === "degraded"`, never an overall success claim.

The existing `deliverOutboundPayloads` remains a source-compatible adapter returning `outcome.delivery.results`. Its internal behavior still changes safely: it always installs the failure tracker and never acknowledges failed, partial, uncertain, or durability-degraded work. Call sites that must surface completeness use the outcome API. In this slice those include restart sentinel, node receipt ACK, queue recovery, and production paths with dynamic `bestEffort` policy. A single-payload operational ACK treats `failed` or `uncertain` as failure and reaches its existing error path. Recovery acknowledges only provider `succeeded` plus durable accepted/suppressed checkpoints.

Caller observers are outside the provider boundary. `onPayload`, `onError`, message hooks, and transcript mirroring run in isolated `try/catch` blocks around the corresponding delivery/checkpoint fact. Their exceptions are appended to bounded `observerErrors`; they cannot turn an accepted provider send into pending/retryable work or stop later best-effort payloads. The compatibility adapter logs the bounded observer class after queue finalization and returns accepted provider receipts; it never throws an observer failure that could invite provider replay. Mirroring is inventoried as a separate post-delivery side effect and is never repaired by resending the provider message.

`bestEffort` continues sending later payloads after a definite failure. It does not mean partial or all-failed delivery succeeded. An abort remains a deliberate cancellation rather than a provider rejection, but a queued entry is removed on abort only when durable state proves every payload accepted/suppressed; GW-015 makes that decision from durable payload state.

### DELTA

1. Introduce the outcome type/API while retaining the array-returning compatibility export.
2. Install the internal failure recorder for every call, then optional-call the caller hook.
3. Make queue acknowledgement depend on provider `succeeded`, durable accepted/suppressed checkpoints, successful unlink, and successful directory sync; never callback presence or promise resolution alone.
4. Change recovery to consume the explicit outcome and retain failed/partial entries while withholding uncertain entries.
5. Convert restart-sentinel and node-receipt ACK callers to the outcome API and surface bounded failed/partial/uncertain/degraded outcomes through their existing failure paths.
6. Isolate observer callback and mirror exceptions, finalize queue state first, and test that an observer exception never changes accepted provider state.
7. Inventory every production `bestEffort` and mirroring caller. Intentional best-effort callers may continue later payloads, but they must consume or surface the final aggregate; no durable entry is deleted based on a callback contract.

No WebSocket or shared-package protocol change is required for this slice.

## GW-009: failure-contained, deadline-bounded shutdown

### AS-IS

`createGatewayCloseHandler` in `src/gateway/server-core/server-close.ts` awaits cleanup in one sequential function. `tailscaleCleanup`, `stopChannel`, `stopGmailWatcher`, `WebSocketServer.close`, and each HTTP `close` can throw or wait without a local deadline; a failure or hang prevents later cron, heartbeat, event, socket, timer, database, and listener finalizers. Channel plugin types are stopped serially. Account stops within one plugin use a shared `Promise.all`, so one rejected or hung account prevents that plugin's finalizer and blocks the outer loop.

The wrapper returned from `src/gateway/server.impl.ts` runs `gateway_stop` hooks and several global cleanup functions before the core close handler. It does not memoize a close promise, so a second close can repeat hooks and cleanup. Several catches intentionally suppress errors and therefore cannot tell the process coordinator whether an in-process restart is safe.

The CLI and macOS runners duplicate `DRAIN_TIMEOUT_MS = 30_000` and `SHUTDOWN_TIMEOUT_MS = 5_000`. The generated systemd unit uses `TimeoutStopSec=15`. A cleanup path can therefore be killed after five seconds even though no component or overall shutdown budget exists, while changing one runner can silently diverge from the other.

Both runners assign `server` only after `await startGatewayServer(...)`. A SIGTERM/SIGINT during a paused required initializer therefore sees `server === null`, exits through the outer shutdown path, and cannot ask the partially constructed gateway to roll back. Conversely, SIGTERM during the 30-second restart drain is ignored because `shuttingDown` is already true, so a systemd stop can retain the restart action and its 42-second force timer beyond `TimeoutStopSec=15`.

### TO-BE

Shutdown is an idempotent state machine:

```text
starting -> ready | degraded -> stopping-admission -> draining -> finalizing
         -> closed-clean | closed-dirty
```

The first `close()` or `shutdown()` call synchronously enters `stopping-admission`, aborts the lifecycle signal, and owns one shared coordinator promise. Later callers join that coordinator. Each registered finalizer runs at most once. A startup failure enters the same rollback coordinator; it does not use a second cleanup path.

Before invoking `startGatewayServer`, each runner creates a startup `AbortController` and passes its signal into the registry at construction. A stop/restart signal while `start()` is pending aborts that exact generation. The start promise settles only after the same bounded rollback coordinator settles and returns or carries its bounded shutdown summary; the runner never needs a published `GatewayServer` object to clean partial startup. A startup abort whose rollback is dirty cannot enter an in-process retry.

Phases run in order because later phases depend on earlier admission and producer shutdown. Tasks within one phase are independent and execute through settled aggregation. Each task has a local deadline, each phase has a budget, and every wait is capped by one monotonic overall deadline. A throw or timeout is recorded and the next phase still starts. A timeout releases the coordinator but does not claim that an uncooperative task stopped.

| Phase                   | Default phase budget | Required work                                                                                                                                                                                                                  | Default task caps                                                                                                  |
| ----------------------- | -------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| P0 `stopping-admission` |               250 ms | Close the admission gate; synchronously stop cron/heartbeat/channel replacement scheduling, reconnect/reload admission, and new deferred work; emit the bounded shutdown event while authenticated sockets are still writable. | Synchronous tasks; an asynchronous stop hook is capped by the remaining phase budget.                              |
| P1 `draining`           |             2,000 ms | Abort active chat turns, node invokes, approvals, wizards, debug sessions, startup initializers, and owned background tasks; wait only for cooperative settlement.                                                             | 2,000 ms per task, capped by the phase/overall remainder.                                                          |
| P2 `producers`          |             3,000 ms | Stop channel accounts, Gmail, plugins, browser/canvas/Tailscale/Bonjour, config reload, refresh/user services, and other effect producers.                                                                                     | 1,500 ms per channel account with concurrency 8; 1,000 ms per plugin/hook; no task may exceed the phase remainder. |
| P3 `durability`         |             2,500 ms | Flush/close independent stores after the producer phase. A store whose producer timed out closes only after old-generation access is fenced; otherwise its unsafe close is withheld and reported for process-exit containment. | 2,000 ms per flush/close pair, capped by the phase/overall remainder.                                              |
| P4 `transports`         |             1,500 ms | Close main, PTY, shell-bridge and canvas WebSockets; close every HTTP alias; dispose remaining timers/listeners and generation-owned global callbacks.                                                                         | 1,250 ms graceful socket/listener close, then destroy only sockets owned by this generation.                       |

The coordinator overall deadline is **10,000 ms**. The listed phase budgets total 9,250 ms and leave 750 ms for transition and summary work. Unused time in one phase does not extend the overall deadline. CLI and macOS runners import one shared constant and arm their outer forced-exit deadline at **12,000 ms** for ordinary shutdown and `30,000 + 12,000 ms` for a restart drain plus shutdown when no stop signal intervenes. The generated systemd unit remains at 15 seconds, leaving three seconds after the ordinary process-level deadline. A constants regression enforces `coordinator < process outer < systemd` and prevents duplicate runner literals.

`SIGTERM` or `SIGINT` has priority over a pending restart, including its 30-second task drain. The stop signal aborts that drain, changes the requested action permanently to stop, cancels respawn/in-process restart, and replaces the old force timer with a deadline no later than 12 seconds from the stop signal. A second restart signal cannot lower the priority back to restart. This keeps systemd stop inside 15 seconds rather than retaining a 42-second restart timer.

Channel ownership is normalized to a two-step handle: synchronous, idempotent `requestStop()` for every account, then asynchronous `finalize(signal)` with concurrency eight. This avoids both an unbounded simultaneous cleanup burst and a queued account that never receives its stop signal. One rejected or hung account cannot suppress sibling account attempts or the plugin-level stop hook. If the phase deadline is exhausted before a queued finalizer begins, it is recorded as `deadline-exhausted`, shutdown becomes dirty, and no clean completion is claimed.

Every asynchronous task receives the already-aborted lifecycle signal plus its phase signal. On timeout, the generation is permanently revoked before later phases continue, so a late task cannot publish state, enqueue a new effect through a generation-checked boundary, or clear a successor's resource. In-repo effect and store entry points reject the revoked generation before access. P3 tracks producer dependencies for each store: if the timed-out producer is fenced at every access boundary, the store may flush/close; if any path is not fenced, that store's destructive close is withheld, the summary records `producer-unsettled`, and process exit remains the containment boundary. Other independent P3/P4 finalizers still run. Code that ignores abort may therefore remain alive until process exit; shutdown reports possible external/store effect uncertainty, forbids an in-process restart, and never describes the producer as stopped or cancelled.

The public `GatewayServer.close(opts): Promise<void>` signature remains source-compatible for the many tests, embedders and callers that only await cleanup. A sibling `GatewayServer.shutdown(opts): Promise<GatewayShutdownSummary>` exposes the result to the CLI, macOS runner and lifecycle tests. Both methods cache their public promise and share the same underlying coordinator; calling either first cannot start a second shutdown. The summary is bounded:

```ts
type GatewayShutdownSummary = {
  state: "closed-clean" | "closed-dirty";
  reason: string;
  startedAt: number;
  durationMs: number;
  phases: Array<{
    name: "stopping-admission" | "draining" | "producers" | "durability" | "transports";
    durationMs: number;
    failed: number;
    timedOut: number;
    uncertain: number;
  }>;
  failed: Array<{ component: string; phase: string; errorClass: string }>;
  timedOut: Array<{ component: string; phase: string; timeoutMs: number }>;
  uncertain: Array<{ component: string; phase: string; reasonClass: string }>;
  truncated: { failed: number; timedOut: number; uncertain: number };
  safeForInProcessRestart: boolean;
};
```

The three detail arrays contain at most 64 total entries. Static component names are at most 96 characters. `errorClass` and `reasonClass` come from a fixed allowlist rather than `Error.message`; the shutdown reason is sanitized and capped at 256 characters. Exact aggregate counts remain available through `truncated`. No stack, path, payload, message body, token, JWT, workshop update, or provider response enters the summary.

Any rejected/timed-out task or pending late initializer produces `closed-dirty` and `safeForInProcessRestart: false`. Ordinary process shutdown may still exit after reporting the dirty summary because process death is the final containment boundary. A restart may respawn or hand control to a supervisor, but the CLI and macOS runners must refuse an in-process restart when the summary is dirty. They exit for supervisor recovery or return a visible restart failure when no full-process path exists; they never start a second generation over unresolved work.

GW-011 remains a named dependency. Until its active cron-run cancellation/receipt contract lands, any cron run still active when P1 expires makes shutdown dirty and blocks an in-process restart. Slice B does not claim that an abandoned cron effect was cancelled.

### DELTA

1. Add `server-owned-resources.ts` with the five named phases, monotonic budgets, settled task containment, exact-once ownership, and a shared close promise.
2. Move the wrapper cleanup in `server.impl.ts` into named registry tasks so `gateway_stop`, diagnostics, skills, auth-rate-limit, channel-health, orchestration, template, request-metrics, and core finalizers share one failure boundary.
3. Change channel ownership to synchronous `requestStop()` plus asynchronous `finalize(signal)`: signal all owned accounts first, then await finalizers with concurrency 8 and the stated deadlines; run the plugin stop hook independently.
4. Preserve `GatewayServer.close(): Promise<void>` as a shared compatibility wrapper, add shared `shutdown(): Promise<GatewayShutdownSummary>`, and make the CLI/macOS restart coordinators inspect `safeForInProcessRestart`.
5. Pass a runner-owned startup `AbortSignal` into `startGatewayServer`; make start rejection/abort await the shared rollback and expose its bounded summary even before a server handle is returned.
6. Centralize the coordinator, drain, process-outer, and systemd relationship constants; add stop-over-restart action precedence and retain the existing 15-second systemd contract.
7. Preserve restart wire behavior: authenticated non-node clients receive close code 1012 only for a deliberate restart; ordinary stop remains 1001. A timed-out close does not emit a false clean/restart-complete signal.

## GW-010: one owner for startup resources

### AS-IS

`startGatewayServer` creates resources before and after the main listeners are published, and ownership is split across locals, module globals, closures, and detached promises. `createGatewayRuntimeState` opens the Files store/cleanup interval, binds every HTTP alias, installs the main WebSocket server, and creates an optional PTY WebSocket server before most later startup work. A failure after that point has no common rollback path.

The event system is initialized through a detached promise. Close shuts it down only when assignment already completed; a paused initializer can resolve after teardown and start its heartbeat interval. `startGatewaySidecars` returns a refresh scheduler and user subsystem, but production retains neither finalizer. Workshop exposes `closeWorkshopYjsDb`, but close does not call it and the current function does not clear room persistence/empty-room timers, memberships, documents, or awareness. Template loading, plugin `gateway_start`, memory startup, model checks, interrupted-turn recovery, delivery recovery, update checks, and several initial refreshes are detached without a lifecycle generation fence.

The current concrete ownership gaps are:

| Resource family                | Current source/behavior                                                                                                                                                                                            | Missing ownership boundary                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Process/global timers          | diagnostic heartbeat, auth limiter, request metrics, reliability cleanup/broadcast, subagent registry sweep/listeners/retry timers                                                                                 | Some individual stop calls exist; reliability and subagent production teardown are absent, and all are outside one generation registry.  |
| Restart/global callbacks       | SIGUSR1 policy, pre-restart deferral, health broadcaster, update notifier                                                                                                                                          | Module-global callbacks can retain the old gateway; setters need nullable or owner-token disposal.                                       |
| Secrets/free-tier/files        | `secrets.sqlite`, `openFreeTierDb`, `createFilesHttpHandler` store plus ten-minute cleanup                                                                                                                         | Raw database/interval handles are hidden behind managers/handlers and cannot all be closed by the server.                                |
| Event/workshop                 | detached `initEventSystem`, event heartbeat, Turso/retention/rate-limit timers, workshop Yjs DB and room timers                                                                                                    | Late resolution can publish after close; workshop close is incomplete and unwired.                                                       |
| Ledger/observations/trajectory | gateway hook-owned message ledger and personal observations; trajectory lifecycle writers                                                                                                                          | Start hooks can race stop; trajectory hooks/writers lack a production generation teardown.                                               |
| Memory                         | detached memory backend; cached builtin/QMD managers and typed DB registry                                                                                                                                         | Managers expose close operations but the gateway owns no close-all handle and can publish after stop.                                    |
| Main transports                | all HTTP aliases, main WSS, auth-pending and authenticated clients                                                                                                                                                 | Main handles are retained, but close is unbounded and startup failure does not roll them back.                                           |
| Auxiliary transports           | PTY WSS, shell bridge WSS/access relay, canvas host/server                                                                                                                                                         | PTY and bridge WSS ownership is not returned consistently; relay close is coupled only to the first HTTP server.                         |
| Network sidecars               | Bonjour, Tailscale, Gmail watcher/pubsub, channels/accounts, plugin services, browser control, config reloader                                                                                                     | Mixed local ownership and sequential teardown; no shared init/close generation.                                                          |
| Scheduled/background work      | refresh scheduler, user subsystem, cron, channel health, channel mirror refresh, maintenance timers, heartbeat runner/wake timer, delivery recovery, model checks, interrupted-turn recovery, update outcome timer | Several handles are returned but discarded; several promises/timers are detached; heartbeat wake and mirror globals can cross a restart. |
| Channel state                  | channel restart handler, mirror account source, mirror tick, status-debounce timer                                                                                                                                 | Module globals/timer can target the old channel manager after in-process restart.                                                        |
| Request-scoped registries      | `NodeRegistry` pending invoke timers, node subscriptions, `ExecApprovalManager`, exec-approval forwarder, wizard sessions, debug stepped-build sessions, chat abort controllers                                    | Pending callers/timers lack a gateway-wide cancel/dispose pass.                                                                          |
| Hook/dispatcher globals        | MCP dispatcher/identity resolver, Google ADC client, Hub REST client, skills remote registry, internal/global hook runners                                                                                         | Existing nullable/reset APIs are not applied as generation-owned disposers; a stale close could clear a newer generation.                |
| Observability globals          | reliability broadcaster, debug broadcaster, health broadcaster, orchestration bridge                                                                                                                               | Closures retain old client sets and can deliver into a closed generation.                                                                |
| Shell/durable stores           | Shell run durability, in-flight-turn DB                                                                                                                                                                            | Current close covers part of this family; it must move into the common ordered durability phase without regressing quiesce-before-close. |

### TO-BE

`startGatewayServer` creates one generation-numbered `GatewayOwnedResources` registry before the first resource allocation. A resource slot is registered synchronously before its initializer starts. The initializer receives the lifecycle `AbortSignal`, immutable generation, and a child registrar. Any socket, timer, database, listener, or global callback allocated before the initializer resolves is registered immediately; otherwise the initializer must roll it back before rejecting.

An initializer may publish its result only while its generation is current, non-revoked and in `starting`, `ready` or `degraded`; publication is forbidden from `stopping-admission` onward. Required initializers additionally must publish before the separate `requiredAdmissionReady` predicate can open the main listener. Optional initializers may publish while the live generation is already `ready` or `degraded` and update only their named component state. If close begins first, the registry aborts them. A result that resolves after abort is finalized immediately and is never assigned to a server field, installed in a module global, used to start a timer, or exposed to a handler. The registry waits only through the P1 initializer budget; an initializer that neither settles nor proves rollback makes the close dirty. Registration after `stopping-admission` immediately finalizes the submitted child and reports a late-registration failure.

All global setters use an owner-token disposer or compare-and-clear operation. A generation may clear only the exact callback/client/runner it installed. A late cleanup from generation N cannot null generation N+1. Existing nullable APIs such as MCP dispatcher/identity, Google ADC, Hub REST, skills registry, health broadcaster, channel mirror source/restart handler, debug broadcaster, internal hooks, global hook runner, and trajectory registration are wired through that rule; missing production reset APIs are added for reliability, subagent state, update notification, heartbeat wake, approvals, wizard/debug sessions, and memory manager registries.

Startup listener publication moves to the end of required initialization. HTTP servers and WebSocket servers may be constructed earlier and registered for rollback, but no TCP listener is published until the registry, auth/admission gate, request handlers, durable stores required by enabled features, and generation cleanup are ready. The final primary-listen callback opens admission synchronously before yielding; a racing client either receives connection refusal before the bind or reaches an open core, never a new pre-handshake close contract. Bonjour and Tailscale publication happen only after that transition.

Optional initializers that can produce external effects do not run before core readiness merely to hold the main port closed. After core publication they have explicit `initializing -> ready | degraded` component state, remain generation-owned, and obey the same late-resolution rule. Their handlers fail with their existing explicit unavailable result while `initializing` or `degraded`; they do not appear as mysteriously empty data. Required initialization stays fail-closed. This gives existing consumers a connection refusal during required startup without making a hung Gmail/channel/browser/plugin initializer block the core indefinitely.

This choice is based on the actual consumers:

- Hub uses installed `@minion-stack/shared@0.9.0` `GatewayClient` with `autoReconnect: true`, handles deliberate 1012 restarts with a flat eager retry window, and otherwise uses the shared exponential backoff. Its authenticated-state/hello path runs only from the original `connect().then`.
- Site also resolves installed `@minion-stack/shared@0.9.0` and uses `autoReconnect: true`, but likewise publishes member connected state and `onHelloOk` only from the original `connect().then`.
- Paperclip uses a one-shot client and retries `ECONNREFUSED`, `ECONNRESET`, socket hang-up, and connect timeout twice. It does not classify a 1013 pre-handshake close as transient, and an active request must not be blindly replayed after an ambiguous disconnect.

The transport reconnect in Hub and Site is insufficient by itself: after an initial connection refusal, the later socket can authenticate while the application remains visibly disconnected and skips its hello initialization. Their installed 0.9.0 runtime and declarations do not expose `GatewayClientOptions.onAuthenticated`; the reconnect timer discards the successful `connect()` result. Meta source at commit `900a988f` contains an unreleased callback implementation, but the package version remains 0.9.0 and the release changeset is pending. Slice B therefore depends on publishing or otherwise producing one reviewed immutable `@minion-stack/shared` artifact that contains the callback in both runtime and declarations, then pinning Hub and Site to that exact artifact.

The released callback contract fires once for every successful current handshake, including automatic reconnect, with immutable session/generation identity. It settles the corresponding connect promise before notification; stale/superseded attempts never notify; a synchronous throw or rejected callback is contained and reported without changing socket state or creating an unhandled rejection. Shared tests cover initial success, automatic reconnect, stale close/reentrant connect, callback throw/rejection, and exactly-once delivery.

Hub and Site then move successful-session publication to that callback, fenced by current client plus session generation. The initial `connect().then` does not publish the same session twice. A successful reconnect clears the prior startup error and runs the same hello/state load exactly once. Hub backup/cutover clients suppress publication while they are not current; promotion explicitly applies their already-authenticated hello once, and their callback cannot mutate primary state before or after promotion. This changes a shared client API but not the WebSocket schema.

With the shared artifact and consumer adoption, keeping the listener unpublished through required initialization preserves all three behaviors without changing Paperclip or the wire protocol. Release order is shared package/artifact first, Hub/Site pins and callback adoption second, and Gateway late listener publication last or in a coordinated release that proves those exact installed artifacts before enabling it. Once listeners are published, health/readiness reports core `ready` plus bounded per-component `initializing`, `ready`, or `degraded` state; it never reports core ready while required initialization is pending. A tenant-JWT configuration requires the user subsystem and durable revocation store to be healthy before publication. Optional browser, Gmail, Tailscale, channel, plugin, memory, Turso mirror, update-check, and similar failures retain their current product degradation policy but are explicit in readiness. Enabled durable Shells/store prerequisites remain startup-fatal as today.

The registry owns this implementation inventory before Slice B is complete:

| Registry owner     | Required lifecycle work                                                                                                                                                      | Shutdown phase                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `startup/global`   | diagnostic/auth/metrics/reliability/subagent timers and all global callback/token disposers                                                                                  | P0/P4                                                |
| `stores/core`      | secrets, free-tier, Files store/cleanup, event/Turso, workshop rooms/DB, ledger, observations, trajectory, memory managers/typed DBs, Shells, in-flight turns                | P3                                                   |
| `transport/http`   | every bound HTTP alias and all accepted sockets, including first-listener shell relay coupling                                                                               | P4                                                   |
| `transport/ws`     | main WSS, PTY WSS, shell bridge WSS, canvas sockets, authenticated/auth-pending clients                                                                                      | P0/P4                                                |
| `sidecars/network` | Bonjour, Tailscale, Gmail, channels/accounts, plugin services, browser, canvas, config reloader                                                                              | P2                                                   |
| `schedulers`       | refresh scheduler, user subsystem, cron admission, channel health/mirror/status debounce, maintenance, heartbeat runner/wake, delivery recovery, model checks, update timers | P0/P1/P2                                             |
| `requests`         | node invokes/subscriptions, approvals/forwarder, wizards, debug sessions, chat controllers                                                                                   | P0/P1                                                |
| `initializers`     | event, template, gateway-start hooks, memory, interrupted-turn recovery, model checks, update checks, delivery recovery and any future detached startup                      | P1, followed by the resolved resource's normal phase |

Readiness publication and startup rollback use the same registry. Failure after opening Files/free-tier/secrets/workshop databases or after constructing any server closes them and leaves every port re-bindable. A dirty startup cannot retry in process.

### DELTA

1. Split runtime construction from `listen`: register constructed HTTP/WSS/PTY/Files resources first, finish required initialization, then publish every configured bind host as one readiness transition. Open admission synchronously in the primary-listen completion path before yielding; start Bonjour/Tailscale advertisement afterward. If a secondary alias fails, preserve the current explicit degraded warning; if the primary fails, roll back the whole generation.
2. Change resource factories that hide ownership (`createFilesHttpHandler`, free-tier/secrets construction, PTY/bridge setup, workshop, memory, reliability/subagent globals) to return explicit idempotent handles or register children as they allocate.
3. Replace detached event/template/hook/memory/recovery/model/update/delivery startup with registry initializer slots and generation-checked publication.
4. Retain and register refresh scheduler and user subsystem finalizers; require healthy revocation state before publishing a tenant-JWT listener.
5. Extend workshop shutdown to flush/clear persistence and empty-room timers, memberships, documents, awareness, and the DB once; register it in P3.
6. Add dispose/cancel ownership for node invokes/subscriptions, approvals/forwarder, wizards, debug sessions, active chat controllers, heartbeat wake, channel debounce/mirror, and the enumerated globals.
7. Route startup rollback and GW-009 close through the same registry. Remove direct duplicated teardown only after each resource has an inventory test proving its new owner.
8. Release/pin the reviewed shared-client callback runtime plus declarations, then adopt it in Hub and Site as the single generation-fenced successful-session path before late listener publication ships. Keep Paperclip one-shot semantics and its existing pre-admission connection-refusal retries; do not replay an admitted request after disconnect.

### Slice B acceptance matrix

**Topics:** infra, auth, test

| Case                    | Required proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Idempotence             | Two concurrent `close()` calls receive the same cached void promise; concurrent or mixed `close()` and `shutdown()` calls share one coordinator and summary; every hook and finalizer runs once.                                                                                                                                                                                                                                                                                                                                                                                     |
| Failure containment     | Each P0-P4 task is injected once with a throw and once with a never-settling promise; every later phase starts, and the bounded summary records the exact failed/timed-out component.                                                                                                                                                                                                                                                                                                                                                                                                |
| Channel fan-out         | More than eight accounts, including healthy, rejecting and hanging cases, all receive synchronous stop; at most eight finalizers run at once, healthy siblings settle, queued deadline exhaustion is named, and the plugin hook runs.                                                                                                                                                                                                                                                                                                                                                |
| Late initialization     | Pause event, template, plugin-hook, memory, user, and delivery-recovery initializers; close, then resolve. Each returned resource finalizes once and no field/global/timer is published.                                                                                                                                                                                                                                                                                                                                                                                             |
| Partial allocation      | An initializer opens a real loopback listener or SQLite handle and then rejects/aborts; the port rebinds and the database reopens immediately after rollback.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Transport ownership     | Real main, PTY, bridge, canvas, authenticated, and auth-pending sockets close; every HTTP alias closes; remaining owned sockets are destroyed only after the grace cap.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Durable ownership       | Files, free-tier, secrets, workshop, event, ledger, observation, memory, Shells, and in-flight-turn stores each flush/close once after settled/fenced producers; independent stores still finalize when one dependency is unsafe.                                                                                                                                                                                                                                                                                                                                                    |
| Producer timeout        | A fake P2 producer ignores abort and attempts a store/effect after its deadline. Old-generation guarded access is rejected; an unfenced-store fixture withholds only that unsafe close, records uncertainty/dirty state, and cannot start N+1 before process exit.                                                                                                                                                                                                                                                                                                                   |
| Deferred registries     | Pending node invoke, approval, wizard, debug pause, chat, heartbeat wake, channel debounce, and subscription operations settle as cancelled/unavailable and leave no timer.                                                                                                                                                                                                                                                                                                                                                                                                          |
| Global fencing          | Start N, close N, start N+1, then settle a late N initializer/cleanup. N cannot clear N+1 globals or deliver an event to either generation.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Admission compatibility | Installed artifact tests prove Hub/Site runtime and declarations contain the reviewed callback. Before required readiness, the real port is not accepting. Hub and Site retry, then publish the later successful session exactly once and clear the startup error; a callback throw/rejection is contained. Backup/cutover stays inert until promotion. Paperclip follows its existing bounded pre-admission refusal retry, all three complete the existing handshake after publication, and an admitted Paperclip request is never replayed merely because shutdown disconnects it. |
| Degraded readiness      | Every optional initializer family can fail independently; readiness names that family as degraded while required auth/revocation and enabled durable prerequisites still fail startup closed.                                                                                                                                                                                                                                                                                                                                                                                        |
| Repetition              | Twenty real start/close cycles on loopback with fake timers where appropriate leave zero registry-owned handles, ports, databases, module callbacks, and pending promises.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Outer deadlines         | Never-settling tasks consume the configured per-phase caps and the coordinator still summarizes by 10 seconds before the 12-second process deadline; constants remain below systemd's 15 seconds in CLI and macOS paths.                                                                                                                                                                                                                                                                                                                                                             |
| Signal during startup   | Pause a required initializer before `start()` returns, send SIGTERM in the real CLI and macOS runner harnesses, and prove the runner aborts that registry, waits for bounded rollback, leaves the port/store reusable, and never starts another generation.                                                                                                                                                                                                                                                                                                                          |
| Stop supersedes restart | Begin the 30-second restart drain, then send SIGTERM. The drain aborts, restart/respawn is permanently cancelled, a new outer deadline is at most 12 seconds from SIGTERM, shutdown uses ordinary-stop semantics, and no 42-second/systemd overrun remains.                                                                                                                                                                                                                                                                                                                          |
| Dirty restart           | A timed-out resource or active pre-GW-011 cron run returns `safeForInProcessRestart: false`; CLI and macOS do not execute the next in-process `start()`.                                                                                                                                                                                                                                                                                                                                                                                                                             |

## GW-011: cancellable, generation-owned cron runs

### AS-IS

Cron timeout rejects a `Promise.race`, applies a terminal timeout result, and clears its running marker while `executeJobCore` can continue model, tool, and delivery effects. `stopTimer` clears only the next schedule. A manual or later run can overlap the still-running generation.

### TO-BE

Every execution gets an immutable run generation and `AbortController`, registered before work starts. Timeout or service stop aborts that generation and awaits cooperative settlement within a bounded drain deadline. Agent execution, tool calls, heartbeat work, and outbound delivery receive the same signal and check it before each external effect.

Ownership is not cleared merely because the timeout won the race. A run becomes one of `settled`, `cancelled`, or `uncertain`. `uncertain` is durable and blocks a same-job replacement until operator policy resolves it or a verified idempotent continuation exists. Late results from an old generation cannot update the current run.

### DELTA

1. Add an active-run registry keyed by job plus generation.
2. Thread `AbortSignal` through isolated agent, tool, heartbeat, and delivery paths; verify it at external-effect boundaries.
3. Abort and await active runs on timeout/stop; persist `uncertain` when the drain deadline expires.
4. Fence result application and replacement/manual execution by generation.
5. Integrate the registry with GW-009/GW-010 ownership.

This finding remains open until downstream agent/tool interfaces honor cancellation and the uncertain state is durable; a timer-only abort is insufficient.

## GW-012: fenced vector effects and receipts

### AS-IS

Brain-vector claims identify a revision but not a changing lease owner/token. After a lease expires and another worker reclaims it, the stale worker can ACK, retry, or dead-letter the successor's claim. Embedding and Qdrant effects precede a per-job durable receipt, so a database failure can repeat paid work. Reconcile bypasses claimed ownership. Migration SQL can execute before the runner confirms the expected restricted catalog.

### TO-BE

A forward-only `002` migration adds a monotonically changing claim token/epoch. Claim returns it; ACK, retry, dead-letter, lease extension, and reconcile require the exact live token and return false for stale ownership. Existing applied `001` is never edited.

Each job durably transitions through intent, provider receipt, Qdrant receipt, and settled states. Provider/Qdrant calls reuse a stable operation key where supported. When success cannot be distinguished from timeout, the job becomes `uncertain` instead of blindly recomputing or deleting. Settlement occurs per job, so one ACK failure does not replay already settled batch members. Migration preflight verifies the expected catalog/version before irreversible execution where the database permits, and exact post-state is verified afterward.

### DELTA

1. Add reviewed SQL `002_brain_vector_fencing.sql`; preserve `001` byte-for-byte.
2. Carry claim token through every outbox mutation and reconcile path.
3. Persist per-job external-effect intent/receipt/uncertain state and settle jobs independently.
4. Observe abort around provider/Qdrant calls and reach a stable receipt state before worker close.
5. Preflight and post-verify migration identity/catalog.

This is a separately reviewed database release slice with rollback/forward-repair instructions. It does not share a commit with the initial outbound queue slice.

## GW-013: bounded workshop binary work

### AS-IS

Authorized binary updates can reach Yjs decode/apply and fan-out without workshop-specific update, document, rate, room, or client limits. Broadcast does not apply the JSON slow-consumer `bufferedAmount` policy. Persistence repeatedly encodes/writes the full document, and empty-room churn can retain state.

### TO-BE

Workshop admission applies configured hard limits before decode/apply: binary update bytes, updates per connection/time window, clients per room, active rooms, document encoded bytes, and retained empty rooms. Limits are below the global WebSocket payload cap and have product-approved defaults. A document-size check is performed on an isolated transaction/clone before committing a mutation so rejection does not leave the live doc oversized.

Binary fan-out uses the shared socket-send policy. Slow consumers are closed at the same bounded buffer threshold as JSON clients, and no later frame is queued. Persistence is coalesced off the message hot path with one owned flush timer per dirty room and a bounded close flush; incremental update storage or periodic compact snapshots is selected only after migration/retention review.

### DELTA

1. Add one workshop limits policy and per-connection/room meters.
2. Reject byte/rate/client/room quota violations before expensive work; enforce document quota transactionally.
3. Route binary fan-out through the shared socket-send primitive from GW-014.
4. Bound empty-room retention and own/coalesce persistence timers through GW-010.
5. Prove existing scoped-room authorization from GW-003 remains the first prerequisite.

## GW-014: bounded node invocation

### AS-IS

`node.invoke` can allocate unbounded pending entries and timers, accepts very large timeouts, and sends without a socket backpressure check. GW-004 now restricts the surface to platform administrators, but one authorized or compromised operator can still exhaust the gateway.

### TO-BE

Node invocation clamps timeout to configured minimum/maximum values and rejects invalid/non-finite inputs. It reserves a pending slot before allocating a timer or sending. Caps apply globally and per node; per-caller caps are added only when the dispatcher carries a stable caller identity. Overload returns a stable retryable error with no node-existence detail beyond what the authorized caller already requested.

JSON and workshop sockets use one send policy that checks open state and `bufferedAmount`, closes slow consumers, and reports whether a frame was accepted. Send failure releases pending state immediately. Timeout, result, disconnect, and close each settle a reservation exactly once.

### DELTA

1. Add shared socket-send/backpressure policy and migrate node sends plus workshop fan-out.
2. Clamp timeout before reservation; reserve against global/per-node caps before timer allocation.
3. Release exactly once on every terminal path.
4. Add caller quota only after identity propagation is authoritative; global/per-node caps close this finding without inventing caller identity.

## GW-015: versioned per-payload queue and idempotent replay

### AS-IS

Queue version 1 stores one array of original payloads and one retry counter. Queue creation is swallowed on error. Success deletes the whole entry. A partial batch or crash after provider acceptance replays every payload. Atomic rename is used, but file/directory durability is not forced. Malformed/inaccessible files are silently skipped. Provider operations receive no stable replay key.

### TO-BE

Queue version 2 stores stable logical payload IDs and durable state:

```ts
type QueuedDeliveryV2 = {
  version: 2;
  id: string;
  // existing channel/target/options fields
  payloads: Array<{
    id: string;
    payload: ReplyPayload;
    state: "pending" | "in-flight" | "accepted" | "suppressed" | "uncertain";
    attempt: number;
    acceptedAt?: number;
    receipt?: {
      providerMessageIdCount: number;
      providerMessageIds: string[]; // bounded sample
      truncated: boolean;
    };
  }>;
  retryCount: number;
  lastError?: string;
};
```

IDs are assigned before the initial durable write. Version-1 entries remain readable; their payload IDs are derived deterministically from queue ID plus array index and they are treated as visible legacy at-least-once pending work. The next successful mutation writes version 2 and preserves a `legacyAtLeastOnce` marker until each old payload is resolved. Migration cannot reconstruct whether a pre-versioned payload was already accepted, so operators and logs must see that limitation. Unknown versions, malformed entries, and inaccessible files are quarantined or reported as unhealthy; they are never silently treated as absent.

Before a logical payload send, the queue durably records `in-flight` with an incremented attempt and stable operation key. After the complete logical payload is accepted, it durably records `accepted` plus a bounded receipt summary before moving to the next payload. A hook-cancelled/non-renderable payload becomes `suppressed`. Recovery sends only `pending` payloads. An `in-flight` payload found after restart is:

- retried with the same deterministic per-operation idempotency key when the channel adapter declares verified provider support; or
- changed to `uncertain` and withheld from automatic replay when provider acceptance cannot be established safely.

During a live attempt, a definite provider rejection before any child operation is accepted returns the payload to `pending` with bounded failure metadata. A transport timeout or disconnect after send begins is ambiguous and becomes `uncertain` unless the adapter can safely retry the stable key. A logical payload that expands to multiple chunks/media operations also becomes `uncertain` when a later child fails after an earlier child was accepted; the initial checkpoint slice does not replay the whole logical payload on a non-idempotent or unknown adapter. A deterministic mixed-chunk regression pins this boundary. Conservative uncertainty after a crash that occurred before the provider call is acceptable; the gateway must not trade possible loss for an unverified duplicate.

For one logical payload that expands to chunks/media operations, future child idempotency keys derive from `{queueId, payloadId, operationIndex}`. A top-level accepted checkpoint occurs only after every child operation is accepted. Channel adapters declare `supported`, `unsupported`, or `unknown`; absent declaration means `unknown`, and unknown/unsupported is never treated as safe deduplication. The initial GW-015 implementation lands logical-payload checkpoints and safe uncertainty handling. Full closure requires an explicit channel capability inventory, per-child checkpoints for adapters where useful, and an operator workflow that can inspect an uncertain item and deliberately mark it delivered or retry it. That workflow must show the queue/payload ID, channel, target descriptor, receipt summary, attempt, legacy marker, and warning without printing message bodies or credentials. Retry requires an explicit local operator action; the gateway never invents provider support.

Queue writes use a shared serialized read-modify-write path plus temp write, file sync, rename, and directory sync. Process-local serialization is insufficient: recovery takes an exclusive path-level recovery lease using an atomic filesystem owner record, and every existing-entry mutation uses an exclusive entry lease/fencing generation. Every lease acquisition first creates a no-clobber per-lock acquisition gate, then inspects or reclaims the primary owner while holding that gate. A stale primary is preserved with a no-clobber hard link before removal. A second contender cannot cross the gate and move a newly created live lease into the stale slot. A crash or ambiguous filesystem error during acquisition leaves the gate in place and fails all later acquisition closed until the bounded operator repair workflow below verifies the gate owner is dead. A second live recovery owner fails closed; stale-owner takeover preserves the old owner record for diagnosis and requires proof that the recorded local PID is no longer live. Unique new-entry creation remains multi-process safe, but a process that cannot obtain the entry fence reports degraded durability rather than racing a live sender/recovery worker.

Queue create failure is returned as `durability.status === "degraded"` by the outcome API, independently of provider status. A new `durability: "required" | "best-effort"` option lets outcome callers state their policy; strict compatibility calls establish required durability before the provider boundary. Required admission fails before a provider send when the initial write cannot be made. A checkpoint write failure after any provider send stops all later sends immediately. The prior durable `in-flight` bytes remain untouched, the outcome is provider `uncertain` plus durability `degraded`, and restart withholds replay. `failDelivery` cannot overwrite a last-known-good entry after a failed load/write.

Acknowledgement always follows a durable accepted/suppressed checkpoint. If unlink or directory sync fails, the outcome is durability `degraded`; the fully terminal queue file remains or may reappear after crash, and recovery performs cleanup without resending its terminal payloads. Missing-file idempotency is accepted only when the caller supplies the already durable terminal generation it expected to remove.

Parsing is bounded before `JSON.parse`: at most 32 MiB per file, 64 MiB of active queue bodies per scan, 256 logical payloads per entry, 1,024 characters per stored error, 32 sampled provider receipt IDs per payload with an exact total/truncated flag, and 10,000 active entries per recovery scan. The recovery wall-clock deadline starts before directory/body scanning and is checked throughout the scan, before any provider call. A growing file is read through a byte-capped reader rather than an unbounded `readFile`. Values beyond a bound are explicit unhealthy/quarantine results, not truncation of authority fields. Outcome failure/observer/uncertain arrays are bounded to the payload count and expose exact overflow counts.

### DELTA

1. Add strict V1/V2 parsers, deterministic V1 read migration, and explicit corrupt/unknown-version handling.
2. Add path-level recovery ownership and per-entry cross-process fences; serialize entry mutation and make writes crash-durable.
3. Assign stable logical payload IDs and checkpoint each accepted or suppressed payload before advancing; classify mixed-child completion as uncertain until child-safe replay exists.
4. Recover only unfinished work; hold ambiguous `in-flight` work as uncertain unless verified idempotent replay is available.
5. Stop further sends on checkpoint failure, preserve last-known-good bytes, and keep ACK unlink/sync failure visible and replay-safe.
6. Expose queue-create/checkpoint/ACK failure through `OutboundDeliveryOutcome`; add required-durability admission.
7. Inventory channel/provider idempotency and receipt semantics, then thread keys only through adapters with verified support and add the explicit uncertain-item inspect/resolve workflow before claiming full closure.

No Hub, Site, Paperclip, or shared WebSocket protocol change is needed for queue V2. Adapter type additions are internal gateway/plugin contracts and require all in-repository extension adapters to typecheck.

### GW-015 closure slice: capability inventory and operator resolution

The current `ChannelOutboundContext` has no delivery identity or operation index. Therefore none of
the 26 bundled outbound adapters can receive the stable
`{queueId,payloadId,operationIndex}` key, regardless of whether a downstream provider may have an
unwired idempotency feature. The source-supported classification for this revision is:

| Classification                                | Channel adapters                                                                                                                                                                                                                                                                                 | Automatic uncertain replay |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| `unsupported` in the current gateway contract | `bluebubbles`, `discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `linq`, `matrix`, `mattermost`, `whatsapp-cloud`, `messenger`, `instagram`, `msteams`, `nextcloud-talk`, `nostr`, `signal`, `slack`, `telegram`, `tlon`, `twitch`, `wati`, `weixin`, `whatsapp`, `zalo`, `zalouser` | Withheld                   |
| `unknown`                                     | Every externally installed channel plugin whose source and provider contract were not reviewed in this checkout                                                                                                                                                                                  | Withheld                   |
| `supported`                                   | None verified                                                                                                                                                                                                                                                                                    | Not applicable             |

`unsupported` here is a statement about the present adapter boundary, not a claim that the remote
provider can never support idempotency. A future `supported` declaration requires primary provider
documentation or an executable provider fixture, stable-key propagation through every child send,
response-loss and duplicate-key tests, and an independently reviewed capability change. Missing
declarations remain `unknown`; the gateway never upgrades them by inference. The adapter capability
type is internal to the gateway/plugin SDK and defaults to `unknown` for external source
compatibility.

The closure slice adds a local-owner CLI with three bounded operations. It is not exposed through
the gateway WebSocket, HTTP, Hub, Site, Paperclip, or shared protocol:

1. `delivery queue inspect --id <queue-id>` acquires the entry lease and prints version,
   generation, enqueue time, channel, a one-way target fingerprint, payload IDs/states/attempts,
   receipt counts, truncation flags, and legacy status. It never prints message text, media URLs,
   raw recipient/account IDs, provider error messages, credentials, or raw provider receipt IDs.
2. `delivery queue resolve-delivered --id <queue-id> --payload <payload-id>
--generation <n> --evidence-code <bounded-code>` may change only `uncertain` to an
   operator-confirmed terminal state. The checkpoint stores the resolution kind, timestamp,
   invoking local uid, and a digest of the bounded evidence code before terminal cleanup. It cannot
   alter `pending`, `in-flight`, `accepted`, or `suppressed` payloads.
3. `delivery queue resolve-retry ... --acknowledge-duplicate-risk` may change only `uncertain` to
   `pending`, under the exact entry generation and lease. It records the local uid and durable audit
   intent before the state transition. Unknown/unsupported capability remains prominently visible;
   the explicit command is the authorization for the possible duplicate. It never resets an active
   `in-flight` operation, accepted payload, or a whole entry.

The CLI resolves the configured gateway state directory, rejects symlinks/non-regular files and
wrong-owner or group/world-accessible queue directories, and requires the same OS uid that owns the
gateway state. An exact entry generation prevents a decision based on stale inspection. The entry
lease prevents a running sender or recovery process from being reset. Each resolution has an
append-only, file-and-directory-synced audit record containing only opaque IDs, action, generation,
uid, timestamp, and evidence digest. A failed audit intent or checkpoint leaves the entry
unresolved. A terminal-cleanup failure remains visible and is safe for recovery to clean without a
provider send.

A separate `delivery queue repair-acquire-gate` command is the only maintenance path for a dead
`.acquire` marker. It requires the exact scope and token read during inspection, proves the recorded
PID is not live, preserves the marker under a no-clobber evidence name, syncs the directory, then
removes the gate. PID uncertainty, token drift, a live owner, filesystem ambiguity, or an active
primary lease fails closed. Normal startup and recovery never auto-reap this gate.

Heartbeat delivery has a second durable owner record in the session store. Before queue admission,
the runner allocates the queue ID and persists a content-free correlation-v1 marker containing the
attempt ID, random owner token, owner PID, and queue ID. The outbound queue retains a successful
terminal caller-managed entry until the runner has first changed that marker to `withheld` and
persisted `lastHeartbeatText`; only then does it unlink the queue and clear the marker. A crash at
each boundary therefore has an inspectable state:

Admission and every settlement use the exact bounded strict store updater: the lock owner is
revalidated before publication, the temporary file is synced, and the containing directory is
synced after rename. A failure to durably admit stops before the provider boundary. A failure to
durably mark completion stops before caller-managed queue acknowledgement, leaving the terminal
queue and the correlated marker available for recovery. The final marker cleanup is also strict;
its failure remains a visible completed marker rather than permitting an automatic replay.
Queue and session-store persistence share one low-level directory-sync policy. `EINVAL`, `ENOTSUP`,
and `EBADF` mean the platform does not support syncing a directory handle and are the only tolerated
codes; real I/O failures such as `EIO` remain fatal and visible. Ordinary entry and last-route
writers re-read with the cache bypassed after taking the shared lock, so a cross-process strict
marker cannot be overwritten when a replacement file happens to retain the cached coarse mtime.

- dead `in-flight` owner plus an exact terminal caller-managed queue is resolved as confirmed
  delivery, with the marker checkpoint preceding queue cleanup;
- dead `in-flight` owner plus no active or failed queue artifact is resolved only by the separate
  explicit no-provider-effect command;
- a live owner, legacy marker without correlation-v1, pending/uncertain/failed queue, mismatched
  queue ID, or held entry lease is never reset by either command.

Both commands require the exact session key, attempt ID, queue ID, bounded evidence digest, local
state ownership, entry fence, and a durable audit intent. They redact the session key, owner token,
PID, recipient, message body, and provider receipt IDs from inspection output. The 32-entry
heartbeat bound never evicts unresolved evidence; after a process crash, the two explicit recovery
paths free exactly one provable entry without treating an unknown provider effect as delivered or
absent.

The strict operator writer and every normal gateway session writer share the same tokenized
cross-process lock. A live PID is never reclaimed because its timestamp is old, and the watchdog is
diagnostic only. Dead-owner reclaim opens the source inode, reads its PID/token through that handle,
and takes a no-clobber hard-link claim only while the path still names that inode. An existing claim
fails closed for explicit operator repair; a second process never resumes it or unlinks the primary
path. Publication and release re-check the open handle inode plus PID/token owner. The strict reader
also bounds bytes, rejects symlinks/non-files, validates UTF-8/JSON, and checks that the open inode and
size still match the path after the read. This is a cooperative local-writer boundary: a
same-UID process that deliberately edits the same inode in place without taking the gateway lock
can evade an inode/size-only race check, and is already inside the local state-owner trust boundary.
No remote authorization decision relies on granting that process additional authority.

Version-1 entries remain visibly `legacyAtLeastOnce`. They are never automatically upgraded to
safe replay. An operator may resolve a specific migrated payload only through the same exact-ID,
generation, lease, audit, and duplicate-risk flow. Listing and parsing remain bounded by the
existing count, byte, deadline, and metadata limits.

### Queue module maintenance slice

Correctness review precedes a mechanical split of the current queue module. Public imports remain
source-compatible through `delivery-queue.ts`, which becomes a re-export facade. The bounded file
ownership is:

| Module                                     | Responsibility                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `delivery-queue-types.ts`                  | Public constants/types plus pure V1/V2 validation and migration                                         |
| `delivery-queue-files.ts`                  | Safe paths, bounded reads, atomic persistence, directory sync, acquisition gates, entry/recovery leases |
| `delivery-queue-store.ts`                  | Enqueue, checkpoint, failure, acknowledgement, terminal cleanup, and failed-entry moves                 |
| `delivery-queue-recovery.ts`               | Bounded scan, V1 visibility, uncertainty suppression, backoff, and recovery orchestration               |
| `delivery-queue.ts`                        | Stable re-exports only                                                                                  |
| `heartbeat-delivery-operator-state.ts`     | Bounded/redacted session-marker parsing, authority checks, inspection, and correlation helpers          |
| `heartbeat-delivery-operator.ts`           | Confirmed-delivery resolution and caller-managed terminal cleanup                                       |
| `heartbeat-delivery-abandoned-operator.ts` | Explicit dead-owner/no-provider-effect resolution                                                       |

The split changes no queue bytes, transition, error class, path, bound, retry timing, or exported
symbol. The facade stays below 100 source lines and no extracted production module exceeds 600.
Existing filesystem-fault, two-subprocess lease race, recovery-deadline/aggregate-byte, V1/V2, and
caller suites must pass unchanged before operator commands are added. The operator CLI lives in its
own command module and does not grow the queue facade or recovery orchestrator.

## GW-016: checked memory HTTP effects and durable policy

### AS-IS

Memory ingest/delete awaits `fetch` but does not check `Response.ok`, has no bounded request timeout, and has no durable retry/drain. Authorization, throttling, server errors, and stalls can be reported as success or outlive gateway shutdown.

### TO-BE

Every request has an owned timeout/abort signal and treats non-2xx responses as typed failures. Metrics distinguish auth, throttle, server, network, timeout, and abort without logging memory contents or bearer tokens. Product policy classifies operations:

- deletes and approved high-value captures enter a durable, versioned, idempotent outbox before HTTP;
- explicitly re-derivable/low-salience captures may remain best effort, but failures are counted and visible.

Hub must accept a stable operation ID and make ingest/delete idempotent before automatic replay is enabled. Shutdown stops admission and drains or persists admitted operations within the GW-009 budget. Ambiguous HTTP completion is uncertain unless Hub idempotency makes replay safe.

### DELTA

1. Check `Response.ok`, parse bounded error metadata, and add timeout/abort.
2. Emit content-free outcome metrics.
3. Land Hub idempotency contract and product durability classification.
4. Add a local outbox for durable classes; integrate recovery and GW-010 shutdown.

The first HTTP-status/timeout patch improves visibility but does not close GW-016 without the durability policy and Hub idempotency dependency.

## GW-017: exact durable events, sampled live fan-out

### AS-IS

The emitter applies one five-second global key before storage. Unrelated organizations, agents, sessions, and channels emitting the same message/tool event suppress each other. Dropped events leave neither records nor exact counters, so history and rates appear complete when they are sampled.

### TO-BE

Durable store insertion occurs before any sampling and records every accepted event with the GW-005 ownership fields. Sampling may apply only to live broadcast/log noise. When live sampling is enabled, its key includes event type plus organization, agent, session, and channel where present, and an exact dropped counter is emitted/queried separately. Consumers label sampled live views and never use them as durable totals.

Storage/retention load is measured before release. If exact durable volume exceeds the approved budget, the alternative is a specified aggregation/retention design that preserves per-tenant totals and incident evidence; silently restoring pre-storage sampling is not permitted.

### DELTA

1. Move sampling after durable insert and apply it only to broadcast/log paths.
2. Include authoritative ownership dimensions in the live key and expose exact dropped counts.
3. Update Hub reliability calculations/labels to use durable totals and identify sampled live data.
4. Run defined volume/retention qualification before rollout.

## Dependency-aware delivery slices

| Slice | Findings       | Scope and completion rule                                                                                                                                                                      | Dependencies                                                                                                                                            |
| ----- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A     | GW-008         | Outcome API, unconditional tracking, partial queue retention, outcome-aware recovery and operational callers. Complete when mixed success cannot be acknowledged or hidden.                    | Approved spec.                                                                                                                                          |
| A2    | GW-015         | Queue V2, durable serialized checkpoints, V1 compatibility, uncertainty handling, required-durability outcome. This slice is partial until adapter idempotency inventory/support is qualified. | Slice A outcome model; provider capability inventory for full closure.                                                                                  |
| B     | GW-009, GW-010 | Owned-resource registry and phased bounded shutdown. Both close together because shutdown cannot be reliable while resources remain unowned.                                                   | Publish/pin reviewed shared callback runtime+declarations, then Hub/Site adoption before late listener publication; no wire-schema or Paperclip change. |
| C     | GW-013, GW-014 | Shared socket-send policy, node caps, workshop work/room/document limits and owned persistence.                                                                                                | Product workshop limits; Slice B for timers/flush.                                                                                                      |
| D     | GW-011         | Generation-owned cron cancellation and durable uncertain state.                                                                                                                                | Slice B lifecycle; downstream AbortSignal audit.                                                                                                        |
| E     | GW-012         | Forward-only DB fencing and external-effect receipts.                                                                                                                                          | Independent DB/human migration review; provider/Qdrant semantics; meta QC proposal.                                                                     |
| F     | GW-016         | Checked requests, policy-classified memory outbox, owned drain.                                                                                                                                | Slice B; Hub idempotency; product classification.                                                                                                       |
| G     | GW-017         | Exact durable storage and sampled live path.                                                                                                                                                   | GW-005 ownership; Hub consumer update; approved volume/retention budget.                                                                                |

Slices A and A2 may share a scoped commit only if their queue contract and tests are reviewed together. The other slices receive separate commits and review receipts. No item is marked fixed merely because its seam or TODO exists.

## Verification

The following matrix defines regression and operational proof for each slice. A prepared case is not a passing receipt.

### Test matrix

| Finding | Red signal                                                                                  | Green acceptance                                                                                                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GW-008  | `bestEffort`, no callback, one provider failure resolves and ACKs/deletes.                  | Aggregate is `partial`; success and failure IDs are explicit; entry is retained; recovery and operational callers surface partial; successful payload is not resent once GW-015 checkpointing is active.                     |
| GW-009  | Early cleanup throws/hangs and later finalizers never run; second close repeats work.       | Every later phase runs once; hung task times out; both close callers share completion; bounded summary names the failed/timed-out component.                                                                                 |
| GW-010  | Close races paused event init or repeated starts leave timers/stores.                       | Late init is aborted/finalized; refresh/user/workshop/event handles stop once; repeated start/close leaves zero fake-timer handles.                                                                                          |
| GW-011  | Timeout clears marker while old run later delivers; replacement overlaps.                   | Old generation observes abort and cannot deliver/apply result; replacement is blocked while uncertain; stop aborts and drains active jobs.                                                                                   |
| GW-012  | Worker A's expired token mutates worker B's claim; ACK failure recomputes provider work.    | All stale mutations return false; durable receipt avoids repeated paid/Qdrant effects; abort reaches stable uncertain; migration refuses unexpected catalog where feasible.                                                  |
| GW-013  | Oversized/rate-heavy update is applied; slow client buffers indefinitely; empty rooms grow. | Limits reject before live apply; slow socket closes with no later send; room/document quotas and coalesced persistence remain bounded.                                                                                       |
| GW-014  | N+1 invoke allocates timer/send; huge timeout persists; slow socket buffers.                | N+1 rejects before timer; timeout clamps/refuses; send failure releases reservation once.                                                                                                                                    |
| GW-015  | Crash after payload 1 causes full replay; queue write fault is silent.                      | Recovery sends only unfinished payloads; ambiguous in-flight becomes uncertain or safe same-key replay; V1 migrates read-compatibly; required durability refuses before send; fs fault leaves prior valid state recoverable. |
| GW-016  | 401/429/500/stall is success; delete vanishes on restart.                                   | Typed visible failure/retry; stable-key delete survives restart; shutdown persists/drains admitted work within deadline.                                                                                                     |
| GW-017  | Same event name from two orgs stores one record.                                            | Both durable rows exist; sampled live path exposes exact drops; load test stays inside the approved storage/broadcast budget.                                                                                                |

## Immediate Slice A/A2 blast-radius checks

- Production callers expecting `OutboundDeliveryResult[]` keep source compatibility through `deliverOutboundPayloads`.
- Startup recovery consumes the outcome API directly and must never infer completion from a resolved promise.
- `bestEffort` CLI/cron semantics still continue later payloads; the aggregate adds observability without turning every tolerated payload error into a thrown exception.
- Restart sentinel and node receipt each send one logical payload. They treat failed, uncertain, or durability-degraded outcomes as failure, so their current `catch`/error reporting becomes reachable.
- Message hooks run at most once per attempt. A hook cancellation is durably `suppressed`; it is not retried indefinitely.
- Transcript mirroring occurs only after all payload sends currently complete. The implementation must prevent a partial attempt from mirroring an undelivered aggregate or duplicating the mirror on recovery; this behavior gets an explicit regression.
- Version-1 files remain readable and are never bulk rewritten at startup. Mutation upgrades one entry atomically.
- Corrupt/unknown queue files remain on disk or are moved atomically to a quarantine with an observable health signal; no overwrite destroys forensic bytes.
- `failed/` retention and existing max-retry behavior remain, but `uncertain` is not counted as an ordinary retry failure.
- Adapter idempotency keys contain opaque queue/payload IDs only and never message text or recipient credentials.

### Production caller inventory

| Caller                                                                        | Current policy                                                                                                     | Slice A/A2 behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `server-restart-sentinel.ts`                                                  | One payload, hard-coded `bestEffort`, no callback; relies on `catch`.                                              | Consume outcome; failed/uncertain/degraded reaches the existing session error event.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `server-node-events.ts` receipt ACK                                           | One payload, hard-coded `bestEffort`, no callback.                                                                 | Consume outcome; do not report a receipt ACK as sent unless provider and durability are both successful.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `delivery-queue.ts` recovery                                                  | Treats any resolved delivery as success.                                                                           | Consume outcome under the existing entry/fence; ACK only durable terminal success, retain failure, withhold uncertainty.                                                                                                                                                                                                                                                                                                                                                                                                 |
| CLI agent delivery                                                            | Dynamic `bestEffort`, `onError` and `onPayload` observers.                                                         | Consume outcome, print bounded partial/failed/uncertain/degraded summary, preserve intended continuation; observer errors never change provider state.                                                                                                                                                                                                                                                                                                                                                                   |
| Cron isolated structured delivery                                             | Dynamic `bestEffort`; sets `delivered` from non-empty result array.                                                | Consume outcome and record partial/uncertain/degraded telemetry; accepted results may set delivered, but job summary cannot call the batch complete.                                                                                                                                                                                                                                                                                                                                                                     |
| Outbound message service/tool path                                            | Dynamic `bestEffort`; formerly returned only the last provider result.                                             | Return an optional typed provider receipt plus bounded delivery/durability/retry metadata in direct and gateway modes. The CLI renders nonterminal states as incomplete, and the agent tool returns the same withheld metadata rather than a plain sent result.                                                                                                                                                                                                                                                          |
| Plugin-dispatched message action with transcript mirror                       | Provider/plugin effect completes before the mirror callback; a mirror throw previously rejected the accepted send. | Preserve the accepted plugin result, return a bounded `observerErrors` entry, and never expose the mirror exception message.                                                                                                                                                                                                                                                                                                                                                                                             |
| Route reply, flow reply, gateway `send`, heartbeat sends, maintenance warning | Strict delivery.                                                                                                   | Consume the outcome API with required durability. Zero-effect outcomes remain retryable; possible provider effects return or persist `withheld`, suppress automatic fallback, and stay visible for queue recovery/operator resolution. Heartbeat persists up to 32 keyed content-free unresolved attempts, each with an attempt ID, owner token, and queue correlation. A different heartbeat cannot overwrite an older unresolved effect; full capacity emits an explicit blocked reason and performs no provider call. |
| Transcript mirroring on route/send/message paths                              | Post-provider side effect currently inside the provider wrapper.                                                   | Isolated observer stage. Failure is visible but never makes accepted provider work replayable.                                                                                                                                                                                                                                                                                                                                                                                                                           |

No production caller of the compatibility `deliverOutboundPayloads` wrapper remains under `src/` or in-repository extensions at revision 3. The wrapper remains exported for source compatibility. Tests and mocks cover both APIs so an external or newly added caller cannot infer completeness from a non-empty results array.

## Review and release gates

### Standards review

- Follow repository and nearest path instructions, strict TypeScript, existing package manager, and colocated tests.
- No dependency changes, suppressions, blanket staging, or edits to the parent-owned Docker/firewall/logging/generated protocol files.
- Use focused red/green tests first, then touched-file format/lint, `pnpm tsgo`, and the relevant gateway suites.
- Commit through `scripts/committer` with only scoped files after both review axes pass.

### Spec review

- Pass 1 checks current evidence, API compatibility, queue state transitions, crash boundaries, shutdown phase order, and cross-project dependencies.
- Pass 2 checks blast radius: all production callers, V1 files, provider capability claims, transcript mirroring, abort behavior, restart recovery, repeated close/start, Hub consumers, and migration forward safety.
- Any slice with a remaining edge is reported partial. It receives an exact-site `TODO(handoff)` only when code genuinely must name the seam and matching proposed meta-ledger text; a TODO never counts as the fix.
- Slice B now has the concrete lifecycle defaults above but remains unauthorized until its two-pass review and shared/consumer dependency are approved. Later slices C through G still require concrete quotas, byte/rate limits, retention budgets, and error contracts followed by slice-specific pass 1/pass 2 acceptance.

### Release qualification

- Slice A/A2: filesystem fault tests, crash/restart simulation, mixed provider outcomes, V1 fixtures, and caller inventory.
- Slice B: fake-timer leak check, injected throw/hang matrix, repeat-close/start, and bounded wall-clock shutdown.
- Slice C: deterministic socket buffer and quota tests plus workshop compatibility.
- Slice D: deferred tool/provider cancellation tests and late-generation fencing.
- Slice E: transactional SQL tests with two workers and a reviewed forward migration rehearsal.
- Slice F: Hub idempotency integration and restart/drain tests.
- Slice G: cross-org exactness plus measured retention/broadcast load.

No production write, deployment, or network qualification is performed from this checkout.

## Review receipt

Pass 1 and pass 2 approved Slice A/A2 after revision-2 corrections. The accepted corrections separate provider completeness from queue durability, preserve honest all-failed/partial/uncertain states, isolate observer and mirror exceptions, withhold mixed-child and unknown-provider replay, add cross-process recovery/entry fencing, stop after checkpoint failure, make ACK cleanup faults recoverable, bound queue parsing/outcome metadata, and inventory operational/mirroring callers.

One red regression was added before production mutation: `deliver.test.ts` proves that `bestEffort: true` without `onError` currently calls `ackDelivery` after one of two payloads fails. On baseline plus the security checkpoints it fails exactly at `expect(ackDelivery).not.toHaveBeenCalled()`, confirming GW-008. Slice A/A2 implementation may now proceed. Full GW-015 remains open until provider capability inventory plus the safe uncertain-item inspect/resolve workflow pass their own tests; the initial checkpoint/uncertainty slice must report that status explicitly.

## Slice A/A2 implementation receipt

GW-008 is implemented in the gateway checkout. Provider status and queue durability are separate outcome axes; all-failed, partial and uncertain results remain distinct; caller, hook and mirror failures cannot convert an accepted provider effect into retryable work. Restart sentinel, node receipt, CLI, cron, recovery and the outbound message/tool path consume or surface the aggregate. Strict direct-message delivery requires durable admission before the provider. If durability degrades after a possible provider effect, it returns a typed `withheld` outcome instead of throwing a generic retryable error. Direct and gateway message modes preserve an optional typed receipt plus the same delivery summary; CLI and agent-tool consumers expose incomplete/withheld state rather than reporting sent. The compatibility array API keeps its existing provider-result shape and emits a safe durability warning.

The approved initial GW-015 portion is implemented. Queue V2 has stable payload IDs, strict bounded V1/V2 parsing, per-payload pending/in-flight/accepted/suppressed/uncertain checkpoints, atomic file and directory sync, entry generation fences, exclusive recovery ownership, crash-time uncertainty, terminal cleanup without resend, V1 read compatibility and an explicit legacy at-least-once marker. A post-rename admission sync fault retains its fence and must be repaired by a durable pre-provider checkpoint. Dead-owner acquisition uses a no-clobber single-winner gate; an interrupted reclaimer leaves an explicit operator-repair state rather than admitting a second sender. Recovery admission is bounded by count, cumulative bytes and wall time before large payload bodies are materialized. Filesystem paths and lease owner records fail closed on non-regular files, malformed safe IDs or mismatched scope. Provider, observer and durability output stores only bounded error class/code metadata rather than provider messages or credentials. Heartbeat persists a bounded keyed ledger of `in-flight`/`withheld` content-free fingerprints around provider calls. Each entry has a stable attempt ID, random settlement owner token, and bounded queue ID; only the matching owner can clear or complete it. `A -> B -> A` therefore suppresses the final A even after reloading the store, and 32 unresolved entries block further heartbeat effects without evicting evidence. Only the exported typed no-provider-effect error clears a thrown attempt; an untyped throw remains conservatively in-flight. GW-015 operator resolution must reconcile and audit the exact attempt/queue pair and must never clear an active owner token.

Focused local evidence after self-review:

- Core outcome, queue, message-service, action-runner, and CLI formatter matrix: 6 files, 149 tests passed (`../gw-lifecycle-core-final.log`).
- Route/follow-up, heartbeat, and cron caller matrix: 5 files, 84 tests passed (`../gw-lifecycle-callers-final.log`).
- Gateway send, node-receipt, and restart-sentinel matrix: 3 files, 27 tests passed (`../gw-lifecycle-gateway-final.log`).
- Message CLI, agent CLI, agent message tool, and cron E2E matrix: 4 files, 37 tests passed (`../gw-lifecycle-e2e-final.log`). The CLI never renders an uncertain gateway reply as sent, and the agent tool retains `retryDisposition: withheld` in both text and details.
- `pnpm tsgo --noEmit` passed (`../gw-lifecycle-tsgo-final.log`); scoped formatting checked 35 files, scoped oxlint reported zero warnings/errors, and `git diff --check` passed. No production or network qualification was performed.
- Final heartbeat/delivery boundary matrix: 2 files, 83 tests passed (`../gw-lifecycle-heartbeat-ledger-final.log`), including A-withheld/B-complete/A-suppressed after store reserialization, conservative untyped-throw suppression, typed no-effect retry, owner-token fencing, and the 32-entry capacity block.

The prior partial status is superseded by the GW-015 closure candidate in this revision. The source
inventory classifies all 26 bundled adapters as unsupported by the current delivery-identity
contract and all external adapters as unknown; no adapter is claimed idempotent and automatic
uncertain replay stays withheld. The local-owner queue CLI now lists and inspects redacted entries,
resolves one exact uncertain payload as delivered or explicit duplicate-risk retry, and repairs one
proved-dead acquisition gate. V1 remains visibly at-least-once. Heartbeat recovery separately
handles dead correlated owners with either an exact caller-managed terminal queue or proved queue
absence. Live owners, legacy/unprovable markers, nonterminal/failed queues, and active entry leases
remain untouched. There is no GW-015 `TODO(handoff)` left in production source; this finding is
source-complete subject to independent parent review and release qualification, with no claim of
production deployment.

Final focused evidence for the closure candidate:

- Operator, audit, redaction, CLI, exact-generation, active/in-flight refusal, and dead-heartbeat
  recovery matrix: 3 files, 33 tests passed (`../gw-lifecycle-operator-final.log`).
- Provider outcome/checkpoint matrix: 1 file, 39 tests passed
  (`../gw-lifecycle-deliver-final.log`).
- Queue V1/V2, aggregate bound, filesystem fault, caller-managed recovery, and real two-process
  lease-race matrix: 1 file, 72 tests passed (`../gw-lifecycle-outbound-final.log`).
- Heartbeat A/B/A reload, terminal caller checkpoint, typed no-effect, generic-throw withholding,
  stale-owner token, 32-entry capacity, admission-sync zero-provider effect, and completion-sync
  pre-ACK retention matrix: 1 file, 47 tests passed
  (`../gw-lifecycle-heartbeat-durability-review.log`).
- Heartbeat durability, operator correlation, queue resolution, and session-lock matrix: 4 files,
  92 tests passed (`../gw-lifecycle-heartbeat-durable-boundary-matrix.log`).
- Shared platform directory-sync policy and same-mtime external-marker preservation: 2 files, 36
  tests passed (`../gw-lifecycle-fs-policy-cache-review.log`).
- Platform policy, normal-writer cache safety, heartbeat strict boundaries, and queue persistence:
  4 files, 155 tests passed (`../gw-lifecycle-fs-policy-cache-full.log`).
- Session lock watchdog, bound-inode single-winner dead reclaim, unresolved-claim fail-closed,
  inode/token release fence, real two-reclaimer race, and real-process live-old strict writer versus
  normal-writer matrix: 1 file, 16 tests passed (`../gw-lifecycle-lock-reclaim-review.log`). The exact
  two-reclaimer regression also passed three additional isolated runs
  (`../gw-lifecycle-lock-reclaim-race-repeat.log`).
- `pnpm tsgo --noEmit` passed (`../gw-lifecycle-tsgo-heartbeat-durability-review.log`); scoped
  oxlint checked the five durability/lock files with zero warnings/errors
  (`../gw-lifecycle-lint-heartbeat-durability-review.log`); scoped formatting and
  `git diff --check` passed. Queue implementation is split behind the stable facade; the standalone
  facade subprocess regression also passes. No production, network, or deployment action was run.
