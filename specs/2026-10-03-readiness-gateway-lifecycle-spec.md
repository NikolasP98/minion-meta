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

The gateway must retain undelivered work, bound background resource use and make shutdown observable. This batch covers GW-008 through GW-017 in independently reviewed slices.

## Out of scope

UI changes, production deployment and security RPC policy are separate batches. Provider exactly-once delivery is claimed only where the provider offers an actual idempotency receipt.

Status: Slice A/A2 approved after two-pass review corrections; later slices directionally accepted and require a slice-specific limits/deadlines revision before mutation (revision 2)  
Baseline: `minion/minion` `origin/DEV` at `b841c36750e4bf10dd3f81a4896b19c699fe3132`, with reviewed gateway security checkpoints `98767f4de` and `758757b00` applied  
Findings: GW-008 through GW-017  
Immediate implementation slice after approval: GW-008 and the durable per-payload checkpoint portion of GW-015  
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
    stage: "onPayload" | "onError" | "mirror";
    error: string;
  }>;
  observerErrorCount: number;
};
```

Failure lists, uncertain IDs, observer errors, provider receipt IDs, and error strings are bounded. The stable payload ID comes from the versioned queue when queued, or from an in-memory delivery plan when `skipQueue` is intentional. Provider delivery and queue durability are separate axes: accepted results plus a failed checkpoint produce `delivery.status === "succeeded"` and `durability.status === "degraded"`, never an overall success claim.

The existing `deliverOutboundPayloads` remains a source-compatible adapter returning `outcome.delivery.results`. Its internal behavior still changes safely: it always installs the failure tracker and never acknowledges failed, partial, uncertain, or durability-degraded work. Call sites that must surface completeness use the outcome API. In this slice those include restart sentinel, node receipt ACK, queue recovery, and production paths with dynamic `bestEffort` policy. A single-payload operational ACK treats `failed` or `uncertain` as failure and reaches its existing error path. Recovery acknowledges only provider `succeeded` plus durable accepted/suppressed checkpoints.

Caller observers are outside the provider boundary. `onPayload`, `onError`, and transcript mirroring run in isolated `try/catch` blocks after the corresponding delivery/checkpoint fact is recorded. Their exceptions are appended to bounded `observerErrors`; they cannot turn an accepted provider send into pending/retryable work or stop later best-effort payloads. The compatibility adapter may surface an observer error after queue finalization to preserve failure visibility, but it must not cause provider replay. Mirroring is inventoried as a separate post-delivery side effect and is never repaired by resending the provider message.

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

Shutdown awaits cleanup sequentially. A thrown `tailscaleCleanup`, channel stop, Gmail watcher stop, or HTTP close prevents later cron, heartbeat, event, socket, timer, database, and server finalizers. A hung channel account task can prevent shutdown indefinitely. Existing tests assert order in a success-only fixture.

### TO-BE

Shutdown is an idempotent state machine: `open -> stopping-admission -> finalizing -> closed`. The first caller owns one shared close promise; later callers receive that promise. Admission and new scheduled work stop first. Independent finalizers run with `Promise.allSettled`, per-component deadlines, and one overall deadline. Ordered dependencies are expressed as phases, not one fragile chain:

1. stop admission and scheduling;
2. abort/drain active work within its component budget;
3. close channel/accounts and sidecars independently;
4. flush durable stores;
5. close sockets, HTTP servers, databases, and remaining timers.

A thrown or timed-out task is recorded once in a bounded summary and never prevents later phases from starting. A timeout releases the coordinator but does not claim that an uncooperative task stopped; its component is reported as timed out. Shutdown emits no message content or secrets.

### DELTA

1. Add an owned shutdown coordinator with named phases, per-task deadlines, and an overall deadline.
2. Wrap each channel account stop/task so one account cannot block siblings.
3. Return/reuse one close promise and run every registered finalizer at most once.
4. Preserve required ordering only where a resource dependency exists; use settled aggregation inside each phase.
5. Emit a bounded `{failed, timedOut}` component summary and return it to tests.

## GW-010: one owner for startup resources

### AS-IS

Event-system initialization is detached. Close only shuts it down if assignment completed, so init can finish after teardown. The heartbeat interval is not cleared. Startup returns a refresh scheduler and user subsystem that production does not retain or stop. Workshop SQLite exposes a close function but the gateway close path does not call it.

### TO-BE

`startGateway` owns one `GatewayOwnedResources` registry created before resource initialization. Registration is synchronous: every resource either registers an idempotent finalizer before it becomes externally visible or initialization fails. Async initializers receive the lifecycle `AbortSignal`; close waits for their settlement and immediately finalizes any resource that resolves after stop began.

The registry includes event readiness/store, heartbeat interval, refresh scheduler, user subsystem, workshop Yjs database, channel health monitor, mirror refresh, cron, browser/config services, HTTP/WS servers, and every existing sidecar. The server does not advertise readiness until required resources have either initialized or produced an explicit degraded-readiness state permitted by current product policy.

### DELTA

1. Add `server-owned-resources.ts` with synchronous registration, lifecycle abort, idempotent phase-aware close, and test-visible summaries.
2. Return/retain refresh scheduler and user subsystem finalizers from startup.
3. Own event initialization as an awaited/abortable promise and close the late-resolve race.
4. Register heartbeat and every periodic timer at creation; wire workshop DB close into the final phase.
5. Route GW-009 shutdown through this registry and remove detached cleanup ownership.

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

Queue writes use a shared serialized read-modify-write path plus temp write, file sync, rename, and directory sync. Process-local serialization is insufficient: recovery takes an exclusive path-level recovery lease using an atomic filesystem owner record, and every existing-entry mutation uses an exclusive entry lease/fencing generation. A second live recovery owner fails closed; stale-owner takeover preserves the old owner record for diagnosis and requires proof that the recorded local PID is no longer live. Unique new-entry creation remains multi-process safe, but a process that cannot obtain the entry fence reports degraded durability rather than racing a live sender/recovery worker.

Queue create failure is returned as `durability.status === "degraded"` by the outcome API, independently of provider status. A new `durability: "required" | "best-effort"` option defaults to current compatibility behavior; `required` fails before provider send when the initial write cannot be made. A checkpoint write failure after any provider send stops all later sends immediately. The prior durable `in-flight` bytes remain untouched, the outcome is provider `uncertain` plus durability `degraded`, and restart withholds replay. `failDelivery` cannot overwrite a last-known-good entry after a failed load/write.

Acknowledgement always follows a durable accepted/suppressed checkpoint. If unlink or directory sync fails, the outcome is durability `degraded`; the fully terminal queue file remains or may reappear after crash, and recovery performs cleanup without resending its terminal payloads. Missing-file idempotency is accepted only when the caller supplies the already durable terminal generation it expected to remove.

Parsing is bounded before `JSON.parse`: at most 32 MiB per file, 256 logical payloads, 1,024 characters per stored error, 32 sampled provider receipt IDs per payload with an exact total/truncated flag, and 10,000 active entries per recovery scan. Values beyond a bound are explicit unhealthy/quarantine results, not truncation of authority fields. Outcome failure/observer/uncertain arrays are bounded to the payload count and expose exact overflow counts.

### DELTA

1. Add strict V1/V2 parsers, deterministic V1 read migration, and explicit corrupt/unknown-version handling.
2. Add path-level recovery ownership and per-entry cross-process fences; serialize entry mutation and make writes crash-durable.
3. Assign stable logical payload IDs and checkpoint each accepted or suppressed payload before advancing; classify mixed-child completion as uncertain until child-safe replay exists.
4. Recover only unfinished work; hold ambiguous `in-flight` work as uncertain unless verified idempotent replay is available.
5. Stop further sends on checkpoint failure, preserve last-known-good bytes, and keep ACK unlink/sync failure visible and replay-safe.
6. Expose queue-create/checkpoint/ACK failure through `OutboundDeliveryOutcome`; add required-durability admission.
7. Inventory channel/provider idempotency and receipt semantics, then thread keys only through adapters with verified support and add the explicit uncertain-item inspect/resolve workflow before claiming full closure.

No Hub, Site, Paperclip, or shared WebSocket protocol change is needed for queue V2. Adapter type additions are internal gateway/plugin contracts and require all in-repository extension adapters to typecheck.

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

| Slice | Findings | Scope and completion rule | Dependencies |
|---|---|---|---|
| A | GW-008 | Outcome API, unconditional tracking, partial queue retention, outcome-aware recovery and operational callers. Complete when mixed success cannot be acknowledged or hidden. | Approved spec. |
| A2 | GW-015 | Queue V2, durable serialized checkpoints, V1 compatibility, uncertainty handling, required-durability outcome. This slice is partial until adapter idempotency inventory/support is qualified. | Slice A outcome model; provider capability inventory for full closure. |
| B | GW-009, GW-010 | Owned-resource registry and phased bounded shutdown. Both close together because shutdown cannot be reliable while resources remain unowned. | No cross-project dependency. |
| C | GW-013, GW-014 | Shared socket-send policy, node caps, workshop work/room/document limits and owned persistence. | Product workshop limits; Slice B for timers/flush. |
| D | GW-011 | Generation-owned cron cancellation and durable uncertain state. | Slice B lifecycle; downstream AbortSignal audit. |
| E | GW-012 | Forward-only DB fencing and external-effect receipts. | Independent DB/human migration review; provider/Qdrant semantics; meta QC proposal. |
| F | GW-016 | Checked requests, policy-classified memory outbox, owned drain. | Slice B; Hub idempotency; product classification. |
| G | GW-017 | Exact durable storage and sampled live path. | GW-005 ownership; Hub consumer update; approved volume/retention budget. |

Slices A and A2 may share a scoped commit only if their queue contract and tests are reviewed together. The other slices receive separate commits and review receipts. No item is marked fixed merely because its seam or TODO exists.

## Verification — test matrix

| Finding | Red signal | Green acceptance |
|---|---|---|
| GW-008 | `bestEffort`, no callback, one provider failure resolves and ACKs/deletes. | Aggregate is `partial`; success and failure IDs are explicit; entry is retained; recovery and operational callers surface partial; successful payload is not resent once GW-015 checkpointing is active. |
| GW-009 | Early cleanup throws/hangs and later finalizers never run; second close repeats work. | Every later phase runs once; hung task times out; both close callers share completion; bounded summary names the failed/timed-out component. |
| GW-010 | Close races paused event init or repeated starts leave timers/stores. | Late init is aborted/finalized; refresh/user/workshop/event handles stop once; repeated start/close leaves zero fake-timer handles. |
| GW-011 | Timeout clears marker while old run later delivers; replacement overlaps. | Old generation observes abort and cannot deliver/apply result; replacement is blocked while uncertain; stop aborts and drains active jobs. |
| GW-012 | Worker A's expired token mutates worker B's claim; ACK failure recomputes provider work. | All stale mutations return false; durable receipt avoids repeated paid/Qdrant effects; abort reaches stable uncertain; migration refuses unexpected catalog where feasible. |
| GW-013 | Oversized/rate-heavy update is applied; slow client buffers indefinitely; empty rooms grow. | Limits reject before live apply; slow socket closes with no later send; room/document quotas and coalesced persistence remain bounded. |
| GW-014 | N+1 invoke allocates timer/send; huge timeout persists; slow socket buffers. | N+1 rejects before timer; timeout clamps/refuses; send failure releases reservation once. |
| GW-015 | Crash after payload 1 causes full replay; queue write fault is silent. | Recovery sends only unfinished payloads; ambiguous in-flight becomes uncertain or safe same-key replay; V1 migrates read-compatibly; required durability refuses before send; fs fault leaves prior valid state recoverable. |
| GW-016 | 401/429/500/stall is success; delete vanishes on restart. | Typed visible failure/retry; stable-key delete survives restart; shutdown persists/drains admitted work within deadline. |
| GW-017 | Same event name from two orgs stores one record. | Both durable rows exist; sampled live path exposes exact drops; load test stays inside the approved storage/broadcast budget. |

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

| Caller | Current policy | Slice A/A2 behavior |
|---|---|---|
| `server-restart-sentinel.ts` | One payload, hard-coded `bestEffort`, no callback; relies on `catch`. | Consume outcome; failed/uncertain/degraded reaches the existing session error event. |
| `server-node-events.ts` receipt ACK | One payload, hard-coded `bestEffort`, no callback. | Consume outcome; do not report a receipt ACK as sent unless provider and durability are both successful. |
| `delivery-queue.ts` recovery | Treats any resolved delivery as success. | Consume outcome under the existing entry/fence; ACK only durable terminal success, retain failure, withhold uncertainty. |
| CLI agent delivery | Dynamic `bestEffort`, `onError` and `onPayload` observers. | Consume outcome, print bounded partial/failed/uncertain/degraded summary, preserve intended continuation; observer errors never change provider state. |
| Cron isolated structured delivery | Dynamic `bestEffort`; sets `delivered` from non-empty result array. | Consume outcome and record partial/uncertain/degraded telemetry; accepted results may set delivered, but job summary cannot call the batch complete. |
| Outbound message service/tool path | Dynamic `bestEffort`; returns the last result. | Consume outcome internally and add bounded status metadata without changing existing result fields. |
| Route reply, flow reply, gateway `send`, heartbeat sends, maintenance warning | Strict delivery. | Array compatibility API remains; provider failures still throw. Queue state is finalized before any observer/mirror error is surfaced. |
| Transcript mirroring on route/send/message paths | Post-provider side effect currently inside the provider wrapper. | Isolated observer stage. Failure is visible but never makes accepted provider work replayable. |

No other production `deliverOutboundPayloads` caller was found under `src/` or in-repository extensions at revision 2. Tests and mocks must cover both APIs so an added caller cannot accidentally infer completeness from a non-empty results array.

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
- Later slices B through G require a revision with concrete default deadlines, quotas, byte/rate limits, retention budgets, and error contracts, followed by slice-specific pass 1/pass 2 acceptance. Directional acceptance is not authorization to mutate those production seams.

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
