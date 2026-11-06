---
id: 2026-10-03-readiness-reliability-failure-spec
title: Distinguish unavailable reliability sources from valid zero activity
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion, minion_hub]
tags: [logic, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
findings: [GW-026]
verdict: approved
---

# Truthful reliability read outcomes

## 0. Product

Gateway `src/gateway/server-methods/reliability.ts` at 85fe0f6a8 returns `respond(true, zero-or-empty)` after summary, timeline, flow, usage, activity and performance cache/aggregate rejection (lines 111-123,172-176,212-216,230-241,257-272,307-310). Events can synchronously throw. A missing event store is also returned as empty data; usage/activity compute helpers silently produce zero when the store is absent. This makes an unavailable observation source indistinguishable from a valid period with no events. Hub's reviewed HC024/025 resource state can contain an RPC rejection, but cannot recover an error that the server labels success.

## AS-IS

These methods are Gateway-global operational data, already restricted to platform operator-admin by GW005. Hub calls all seven wire names; summary has filtered/unfiltered consumers. Shared client/Site/Paperclip transport treats normal non-OK response envelopes generically. No method names or successful payload field names need change.

## TO-BE

- Capture an emitter snapshot `{store, generation}` before any cache await. A successful emitter initialization gets a fresh random UUID generation (never a counter reused by another process/restart); shutdown invalidates the live snapshot before closing. Include this generation in every reliability cache key, including Redis keys. Strict usage/activity producer variants accept the captured store explicitly; existing callers retain their existing helper contract. Immediately before success, verify the same store and generation remain live. A stale generation returns unavailable, never old cached data or a newly manufactured zero.
- Every actual reliability method returns exactly one result. Missing event store, synchronous producer failure, cache rejection or asynchronous aggregate rejection returns the existing protocol `UNAVAILABLE` error envelope, with a fixed safe message. No raw exception, query, actor, org or response body crosses this error boundary.
- A healthy store with no matching events returns a complete valid zero/empty projection with existing success field names. Timeline with an available empty store uses the store's valid positive bucket width; the old missing-store zero-width response is replaced by unavailable. Usage/activity require source availability before invoking their existing aggregate helpers.
- Cached success remains permitted under existing TTLs. An unavailable store cannot serve a cached success. Optional Redis import/get/set failures retain the existing memory/producer fallback and may return real data. Only a rejection escaping `cachedJson` (local-cache parse, serialization or producer failure) fails the endpoint. No manufactured zero is cached; a recovered invocation may produce real data.
- Error reporting is bounded per fixed method name and uses the existing Gateway subsystem logger: at most one safe warning per method per minute. It names only the method and fixed failure class. No external telemetry/provider call is introduced. Dispatcher request metrics still record the actual non-OK response. A logging failure cannot cause a second response or escape the containment boundary.
- A single small endpoint runner owns sync/async producer containment, unavailable checks and exactly-once response completion. Its producer try/catch ends before either response invocation; a throwing success/error responder is never retried as an error response. Logger failure is isolated independently. Producer functions preserve existing filters, event limits, aggregate and cache semantics. The handler file may split projection producers into a logical module if necessary, without changing other reliability consumers.

## DELTA and verification

1. Add the shared endpoint runner and safe bounded failure reporting; replace catch-to-zero branches in all seven actual handlers. Preserve proper successful empty projections from real producer logic.
2. Invoke actual exported handlers in tests with controlled event store/cache seams: available-empty, unavailable source, synchronous throw, asynchronous cache rejection, successful recovery, rejected telemetry/logger and repeated failures. Assert exactly one response, explicit non-OK error, safe constant public message, and no raw private strings.
3. Exercise each method's actual producer path, including summary store.summary failure, events query failure, timeline bucket query failure, flow breakdown failure, usage/activity helper rejection and performance store.query failure. A test that mocks the runner itself is not acceptance.
4. Pause actual optional-cache hit and miss paths, then shut down or reinitialize the emitter. All four paths must reject stale success; subsequent new-generation reads return actual new-store data. Test real Redis get/set rejection still allows healthy fallback; corrupt in-memory cached JSON and producer failure are unavailable. Success-responder and error-responder throws each produce exactly one response attempt. Emitter tests prove initialization uniqueness and shutdown invalidation, including equal wall timestamps; lifecycle neighbors prove the additive snapshot API does not alter resource ownership.
5. Mutation control restores catch-to-success for one aggregate; its exact regression must fail, then restore bytes and rerun.
6. Hub's actual loader/mounted tests already prove advertised-method rejection enters retry state, preserves only same-query data, and clears new-query/owner data. Add a protocol-shaped rejection case if current fake request tests do not assert the error-envelope bridge.
7. Run Gateway focused handler tests, broadcaster/dispatcher neighbors, touched-file format/lint and full typecheck. Parent review checks preserved global authorization, filters/limits/cache keys, exactly-once semantics, and consumers. No production read/write or release is needed for local qualification.

## Out of scope

This does not change pricing, aggregate definitions, retention, sampling, cache TTLs, historical backfill, production p99, or tenant visibility. Source admission failure is visible unavailable, never an unsupported capability claim. Production deployment and acceptance are separate from implementation qualification.
