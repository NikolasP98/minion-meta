---
id: 2026-10-03-readiness-server-telemetry-lifecycle-spec
title: Bounded request-owned server analytics delivery
stage: spec
status: review
pass: 1
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [logic, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: pending
---

# Bounded request-owned server analytics delivery

## 0. Product

Server analytics outlives the response that accepted it while remaining bounded
and unable to interfere with business operations.

## Out of scope

Live analytics configuration, Sentry source maps/alerts and production ingestion
qualification are OB-002. This slice changes local lifecycle behavior only.

## AS-IS

`src/lib/server/posthog.ts` sanitizes fixed events, asynchronously imports the SDK,
and discards the promise. Normal captures wait for the SDK's 10-second timer;
error captures each append a flush promise. A serverless response can finish
before import/enqueue/flush is registered with its lifetime. Errors are swallowed
without delivery/drop evidence. Node shutdown drains routes/jobs but not telemetry.

Installed `posthog-node@5.40.0` flush serializes network calls but appends a promise
per flush. It keeps queued events after a network failure and drops the oldest
queue entry at capacity. Its timer and retry behavior must not become a second
unbounded scheduler underneath the application boundary. Existing privacy and
no-throw behavior is correct and must remain.

## TO-BE

Every accepted event has a synchronously registered lifecycle promise that settles
when its batch is acknowledged or explicitly recorded as unconfirmed/dropped.
Business responses never await analytics. One bounded worker batches and flushes;
error storms cannot create parallel flushes or an unbounded promise/SDK queue.
Node graceful shutdown stops admission after routes/jobs drain and waits for the
same bounded outstanding analytics work. Missing configuration/builds stay no-op.
No event content, identity, key, URL or raw error appears in operational diagnostics.

## DELTA

1. Extract a dependency-injected bounded delivery coordinator from `posthog.ts`.
   Keep the current descriptor-safe sanitizer and event/attribution allowlist.
   After validation, synchronously admit at most 200 outstanding events (including
   the batch in flight), each with <=16 KiB serialized sanitized payload, at most
   512 KiB outstanding aggregate. Reject excess with an explicit safe drop reason.
   Build/missing key does not initialize SDK or count an outage.
2. Admission creates a completion promise and immediately calls Vercel `waitUntil`
   with it in the caller's request context, before lazy import or another await.
   Register that promise with a separate bounded Node telemetry tracker as well.
   `waitUntil` throwing never fails the request; the tracker still owns completion.
   Existing void callers remain compatible. The `flush` hint is retained for
   compatibility but never creates an additional flush worker.
3. A microtask starts the sole worker. It snapshots up to 20 oldest queued events,
   creates/reuses the qualified SDK client, calls capture for those events, then
   awaits exactly one flush. No new events are fed into that SDK batch in flight.
   Configure `flushAt: 201`, `maxQueueSize: 201`, `flushInterval: 0`, request timeout
   3000, retries 0; do not enable the SDK's own waitUntil/debounce scheduler. Thus
   no auto-flush threshold/timer competes with the coordinator. SDK pending capture
   preparation must settle inside its real flush contract, verified with the
   installed package, not assumed from mocks.
4. A successful flush marks precisely that batch acknowledged. On any capture,
   initialization or flush failure, settle that batch with a content-free reason.
   Before-provider construction failure is dropped; network/flush ambiguity is
   unconfirmed (never assert provider nonacceptance). Discard that failed SDK
   instance without calling shutdown/retry; timers and automatic exception
   capture must be disabled, and a real-SDK test must prove a later event cannot
   replay its old queue. Subsequent batches use a fresh client. No application
   retry of analytics events is introduced.
5. Each admission has a six-second deadline. Drop queued events whose deadlines
   expire before dispatch. The active batch uses the SDK's real abortable timeout plus a batch
   AbortController deadline propagated through the supported custom fetch option
   to every underlying fetch (including any SDK 413 split). The custom fetch
   combines the SDK signal and batch signal; a later request cannot escape an
   already-aborted batch. A request deadline is not reset after a split;
   a wrapper timeout cannot release capacity and start a second network call while
   the first is unresolved. If an injected/failed transport never settles, mark
   the active worker stuck after its deadline, settle lifecycle promises as
   unconfirmed, stop admission, and never spawn a replacement worker until the
   underlying promise actually settles. Late completion is observed but cannot
   change already settled counters. The pending transport is at most one; no
   uncancelled-work proliferation is allowed.
6. Track process-local monotonic counts: accepted, acknowledged, dropped by bounded
   reason, unconfirmed, rejected-invalid, current outstanding count/bytes and
   active transports (0/1). Counter snapshots contain no event values. Emit one
   structured safe diagnostic when a batch fails, plus rate-limited aggregate
   saturation/stuck diagnostics (at most once per minute). Expose a read-only
   snapshot for existing operational diagnostics/tests, without inventing a public
   unauthenticated endpoint or recursively sending these errors through PostHog.
   Counter invariant after drain: accepted = acknowledged + dropped_after_admit +
   unconfirmed. Rejected-before-admit counts are separate.
7. Node worker lifecycle: after route and job promises drain, quiesce telemetry,
   await its tracked completion promises, then close cache/pools. This order lets
   already-admitted business operations emit their terminal events. No SDK
   shutdown retry occurs. Failures are contained and do not prevent database
   cleanup. Hooks comments describe the actual lifecycle behavior.

## Verification and blast radius

- Existing hostile accessor/proxy, privacy allowlist, build/no-key, initialization
  failure and no-throw tests remain meaningful and assert sanitized captures.
- A delayed loopback HTTP ingest fixture uses the actual installed PostHog SDK:
  response completes first; synchronously captured waitUntil promises remain
  pending; releasing ingest acknowledges exact event UUIDs once. No external keys
  or ingest URLs are used. Use a separate HTTP server and owned ephemeral port.
- A 1000-event burst proves <=200 admitted outstanding, <=512 KiB, one active
  transport, bounded flush count and exact drop accounting. Events arriving during
  an active batch belong to a later batch whose own lifecycle is registered.
- Connection reset/HTTP failure cannot replay prior batch on later captures;
  ambiguous counts remain unconfirmed. Failure after successful provider receipt
  never changes the business result or claims definite non-delivery.
- Never-settling transport proves admission closes, lifecycle settles boundedly,
  and later captures never start a second transport. Late resolve/reject is
  observed once with no negative counters or false acknowledgement.
- Actual worker-lifecycle tests prove route/job terminal capture drains before
  resource closure; duplicate signals close once. No observer failure masks
  business errors or hangs resource cleanup.
- This closes local OB-001 behavior only. Live ingestion, Sentry symbolication and
  alert receipts remain separately tracked OB-002 release qualification.

## Review

Standards pass 1 and Spec pass 2 pending. No source change has been implemented.
