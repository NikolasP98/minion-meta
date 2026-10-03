---
id: 2026-10-03-readiness-server-telemetry-lifecycle-spec
title: Bounded request-owned server analytics delivery
stage: dev
status: implementing
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [logic, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Bounded request-owned server analytics delivery

## 0. Product

OB-001 makes Hub server analytics lifecycle-owned and bounded without delaying a
business response. Every event admitted by the application gets one completion
promise immediately owned by the current Vercel request when that context exists
and by the Node worker tracker in every runtime. One coordinator controls batching,
SDK construction, transport, deadlines, shutdown, and content-free operational
counters. It never replays a batch whose provider outcome is uncertain.

The source baseline is Hub commit `07463ec1`. Local proof uses the installed
`posthog-node@5.40.0` against an owned loopback ingest fixture. It does not use a
production PostHog key or host, send customer data, deploy, or establish live
ingestion and alert receipts.

## Out of scope

- Changing the event allowlist, attribution model, sampling policy, or analytics
  provider.
- Awaiting analytics in a route or changing a business response because telemetry
  was rejected, dropped, unconfirmed, or unavailable.
- Retrying an event or an uncertain batch at the application layer.
- Adding a public diagnostics endpoint, logging event properties, or recursively
  reporting coordinator errors through PostHog.
- OB-002 production ingestion, release-symbol and alert-receipt qualification.
- Qualifying deferred streaming response-body lifetime beyond the existing Node
  request tracker contract.

## AS-IS

`src/lib/server/posthog.ts` sanitizes fixed events, asynchronously imports the SDK,
and discards the promise. Normal captures wait for the SDK's ten-second timer;
error captures each append a flush promise. A serverless response can finish
before import, enqueue, or flush is registered with its lifetime. Errors are
swallowed without delivery or drop evidence. Node shutdown drains routes and jobs
but does not quiesce or drain telemetry.

Installed `posthog-node@5.40.0` serializes flushes but appends a promise per flush.
It retains its queue after a network failure and drops the oldest queue entry at
capacity. Its timer, queue, split-request and retry behavior therefore cannot be a
second scheduler beneath the application boundary. Existing descriptor-safe
validation, privacy sanitization, fixed event allowlist, no-throw behavior, and
void caller contract are correct and remain.

## Source and caller inventory

| Source | Current call | Required lifecycle after this slice |
|---|---|---|
| `src/hooks.server.ts:586` | sampled server timing | Synchronously admit while the request context is active; register the completion with Vercel `waitUntil` and the Node tracker. |
| `src/hooks.server.ts:643` | `handleError` server error | Preserve the synchronous, total, no-throw error hook. `flush: true` is only a worker wake hint and never creates another flush. |
| `src/routes/(app)/+layout.server.ts:214` | slow app layout | Preserve the void call and the business load result; request `waitUntil` owns the accepted completion. |
| `src/routes/api/marketplace/install/+server.ts:87` | completed marketplace install | Preserve post-commit ordering and never retry the install because analytics failed. |
| `src/routes/api/servers/[id]/provision/run/+server.ts:35` | provision run start before SSE | Register before returning the streaming response; this slice does not claim ownership of later response-body work. |
| `src/routes/api/servers/+server.ts:47` | completed server creation | Preserve the void call and committed business result. |
| `src/server/worker-lifecycle.ts` | desktop Node shutdown | Keep telemetry admission open while tracked routes and jobs drain, then quiesce and drain telemetry before cache and pool closure. |

All six current producers execute in a request context and remain non-awaiting.
The coordinator invokes `@vercel/functions` `waitUntil` synchronously while that
context exists. A desktop process, test, future job, or other out-of-request caller
may have no usable Vercel request context; absence or a throw from `waitUntil` is
contained and the already-registered Node tracker remains authoritative. No caller
receives a promise that it must await.

## TO-BE

Every accepted event has one synchronously registered lifecycle promise. It
settles exactly once as acknowledged, dropped after admission, or unconfirmed.
Business responses never await analytics. One bounded worker admits, batches and
flushes; an error storm cannot create parallel flushes, SDK queues, timers, or an
unbounded promise set. Node graceful shutdown lets tracked business work finish,
stops later telemetry admission, drains the same completions, and then closes
resources. Missing configuration and build mode remain no-op. Diagnostics expose
counts and safe reason codes only: never event content, identity, key, URL, raw
error, or sanitized properties.

## DELTA

### 1. Synchronous bounded admission and ownership

Extract a dependency-injected delivery coordinator from `posthog.ts`; retain the
current descriptor-safe top-level reads, `isServerEvent` validation,
`sanitizeEventProperties`, identity pattern, and catch-all containment.

Before admission, serialize the sanitized envelope and measure exact UTF-8 bytes
with `TextEncoder` or `Buffer.byteLength`, never JavaScript string length. Reject
and classify independently:

- invalid event or identity as `rejected_invalid`;
- one serialized envelope over 16 KiB as `rejected_event_oversize`;
- the 201st outstanding event as `rejected_capacity`;
- an admission that would exceed 512 KiB outstanding as `rejected_bytes`.
- a capture after shutdown quiescence or permanent stuck closure as
  `rejected_closed`.

The 200-event count includes queued and active-batch events. Build mode or missing
configuration remains a disabled no-op and does not initialize the SDK or count an
outage.

For a bounded admission, reserve event count and exact bytes, create its completion
promise, register it in the bounded Node telemetry tracker, and synchronously pass
the same promise to Vercel `waitUntil` before lazy import or any other await. Only
then increment `accepted`. A throwing or unavailable `waitUntil` is contained; the
Node tracker already owns the completion. Each promise settles exactly once and
releases its reserved count and bytes exactly once. Existing `captureServerEvent`
callers remain void. `flush: true` only schedules the same worker promptly.

### 2. One application-owned SDK worker

A microtask starts the sole worker. It snapshots at most 20 oldest queued events,
creates or reuses the qualified SDK client, calls capture for that snapshot, and
awaits exactly one flush. Events admitted during a flush belong to a later batch
and never enter the active SDK queue.

Configure the SDK with `flushAt: 201`, `maxQueueSize: 201`, `flushInterval: 0`,
`requestTimeout: 3000`, `fetchRetryCount: 0`, and automatic exception capture
disabled. Do not enable the SDK's own waitUntil, debounce, poll, or retry scheduler.
The installed-package test must prove capture preparation is included in the real
flush promise and that a later event cannot replay an earlier failed SDK queue.

After any batch failure, discard that SDK instance without `shutdown`, retry, or
reuse. A subsequent ordinary batch may create a fresh client only when the worker
is not permanently closed as stuck. A full successful flush acknowledges exactly
the captured batch. A split 413 sequence remains one batch with one deadline; only
full success acknowledges it.

### 3. One admission-to-settlement deadline

Every accepted event receives an absolute six-second deadline at admission. That
same remaining budget covers, in order, lazy module import, provider factory,
capture/preparation, SDK serialization and gzip, flush, split handling, and network
transport. No stage resets the deadline. Queued events that expire before the
worker owns them settle as dropped after admission without provider dispatch. An
active batch uses the earliest absolute deadline among its members, so batching
cannot extend an older event's lifetime.

The active batch owns one `AbortController`. The supported custom-fetch hook
combines its sticky batch signal with every SDK-supplied signal before delegating
each underlying fetch, including every 413 split. The wrapper records
`transportDispatched = true` immediately before invoking the underlying fetch.
This is the authority for outcome classification; calling `capture` or `flush`
alone is not dispatch evidence.

A logical deadline settles lifecycle promises even if an import, factory,
serialization, gzip, injected transport, or SDK promise ignores abort. Because the
abandoned operation may still own memory or transport, that condition permanently
closes coordinator admission until process restart. The coordinator never starts a
replacement worker, even if the abandoned promise later resolves or rejects. Its
late settlement is observed once only to prevent an unhandled rejection; it cannot
reopen admission, run queued work, reverse counters, acknowledge an event, or emit
a second diagnostic. On permanent closure, settle the active batch according to
its dispatch marker and settle every still-queued admission as
`dropped_after_admit: coordinator_closed_before_dispatch`; release all of their
reserved event counts and bytes. There is at most one retained abandoned active
operation and at most one active transport.

### 4. Definite failure versus provider ambiguity

Outcome classification is conservative and based on the captured dispatch marker:

- Lazy import, factory, capture/preparation, serialization, gzip, or logical
  deadline failure before the first underlying fetch dispatches is
  `dropped_after_admit` with a content-free reason.
- A definite HTTP rejection is `dropped_after_admit`; the provider answered and
  the batch is not retried. If a split could have accepted an earlier part, classify
  the whole batch `unconfirmed` instead of asserting no effect.
- Network rejection, timeout, abort, connection reset, or a stuck deadline after
  any underlying fetch was invoked is `unconfirmed` because provider effect is
  unknowable.
- A complete successful flush is `acknowledged`.

No final status claims that a provider had no effect when dispatch occurred but
the response was not authoritative. Neither `dropped_after_admit` nor
`unconfirmed` triggers application replay. Telemetry failure never changes the
business mutation, route response, or error returned to the caller.

### 5. Counters and safe diagnostics

Expose a read-only process-local snapshot for tests and existing operational
diagnostics, with monotonic counts for:

- `accepted`, `acknowledged`, `dropped_after_admit`, and `unconfirmed`;
- `rejected_invalid`, `rejected_event_oversize`, `rejected_capacity`, and
  `rejected_bytes`, plus `rejected_closed` after shutdown or permanent closure;
- current `outstanding_count`, exact `outstanding_bytes`, queued count, and active
  transports (zero or one);
- safe drop/failure reason subtotals and the permanent admission-closed state.

At every snapshot:

`accepted = acknowledged + dropped_after_admit + unconfirmed + outstanding_count`.

After a completed drain, `outstanding_count` and `outstanding_bytes` are zero, so
the same equality reconciles without an outstanding term. Rejected-before-admit
counts are mutually exclusive and never enter `accepted`. All reservations,
settlements, late completions, and shutdown paths preserve nonnegative exact
counts.

Emit one structured content-free diagnostic for a failed batch and a rate-limited
aggregate saturation or stuck diagnostic at most once per minute. Diagnostics may
contain reason, counts and duration bucket only. They never contain event values,
distinct IDs, properties, keys, URLs, raw exceptions, stack strings, or payload
sizes attributable to one identity.

### 6. Node shutdown order

Extend `src/server/worker-lifecycle.ts` with injected telemetry quiesce and drain
operations. Initial SIGTERM/SIGINT continues to stop job admission, while telemetry
remains open so already-tracked routes and jobs can record terminal events. The
single shutdown sequence is:

1. drain tracked request promises;
2. drain background jobs;
3. quiesce telemetry admission;
4. await all accepted telemetry completion promises;
5. close cache and PostgreSQL pools.

Duplicate signals or shutdown events reuse the same promise. A telemetry failure is
already reflected by its bounded lifecycle result and cannot prevent cache/pool
cleanup. No SDK shutdown or replay is added. Hooks and lifecycle comments describe
this exact ordering.

## Verification: behavioral proof matrix

| Boundary | Required proof |
|---|---|
| sanitizer/callers | Existing hostile accessor/proxy, allowlist, build/no-key, initialization and no-throw tests remain; all six production callers compile unchanged and remain void. |
| immediate ownership | A delayed loopback ingest with the actual installed SDK proves the business response completes first while the exact synchronously registered `waitUntil`/tracker completion stays pending, then acknowledges each event UUID once when released. |
| bounded burst | A 1000-event burst proves at most 200 admitted, at most 512 KiB exact UTF-8 outstanding bytes, one worker/transport, bounded flush count, and exact independent invalid/oversize/capacity/bytes counters. Events arriving during a batch enter a later batch. |
| whole deadline | Never-settling lazy import, factory, pre-transport preparation, and post-dispatch fetch cases each settle by six seconds with the correct dropped/unconfirmed class. No stage or 413 split resets its admission deadline. |
| permanent stuck closure | After a stuck logical settlement, later captures are rejected and start no work. A later resolve and a later reject of the abandoned operation are each observed once, do not reopen admission, change counters, acknowledge, replay, or create an unhandled rejection. |
| transport ambiguity | Connection reset, timeout and abort after the dispatch marker are unconfirmed. Definite unsplit HTTP rejection is dropped after admission. A partial/ambiguous split is unconfirmed. No failed instance can replay old SDK queue entries on a later capture. |
| counters | A deterministic mixed burst asserts the invariant after every transition and after drain; exact bytes and counts return to zero once, with no negative values or double settlement. |
| shutdown | Actual worker-lifecycle tests prove terminal captures from tracked requests/jobs are admitted before telemetry quiescence, then drained before resource closure; duplicate signals close once and a contained telemetry failure cannot block cleanup. |
| privacy | Operational snapshots and diagnostics contain only enumerated safe fields under failure, saturation and stuck cases; no event content, identity, key, URL, property, raw error or stack leaks. |

## Review and release

Standards pass 1: Sol `hub_client_fixes` required complete caller and shutdown
inventory, one deadline across every pre-transport and transport phase, exact
before/after-admission accounting, dispatch-aware ambiguity, and permanent closure
after an abandoned stuck operation. This amended contract resolves those blockers.
Spec pass 2: Sol `gateway_fixes` independently approved the installed-SDK,
request-lifecycle, counter, deadline, ambiguity, permanent-closure and shutdown
contracts with no source-based blocker. No source change has been implemented or
production action authorized.
