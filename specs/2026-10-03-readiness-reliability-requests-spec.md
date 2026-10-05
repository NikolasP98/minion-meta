---
id: 2026-10-03-readiness-reliability-requests-spec
title: Own reliability requests by view and authenticated gateway session
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [logic, ui, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Reliability request ownership

## 0. Product

Close HC-024 and HC-025: the reliability page must show data belonging to its current actor, organization, authenticated gateway, range and filters; initial mounting must issue one batch after saved defaults have settled. Adjacent live-event handling must not fabricate filtered totals. Local fixtures and mocked gateway transport are sufficient for race qualification; live p99/performance claims require their own measured workload and are not implied.

**Out of scope:** Gateway wire protocol changes, a shared createAsyncResource rewrite, production metrics claims and production release.

## AS-IS

Hub a65b2840 `src/lib/state/reliability/reliability.svelte.ts` exposes eight independent RPC loaders. Each writes singleton state after await without ownership. Summary and events independently toggle one loading boolean; any older completion can clear it. Optional-aggregate catches replace newer successful data with null. Page `src/routes/(app)/reliability/+page.svelte:1082-1199` starts the same loads in onMount and two effects. Its refresh action reloads only the date-only half. `pushReliabilityEvent` increments the filtered summary without checking current filters and grows displayed events without the query's 2000-row cap. It has no snapshot/event watermark to prove an exact incremental merge.

## TO-BE

1. Each of the eight resources owns a monotonically increasing request generation and canonical query key. Publication checks the generation and a captured owner predicate after every asynchronous boundary, including catch and finally. The predicate uses actor=`page.data.user.id`, organization=`page.data.activeOrgId` (never the older userState.orgId projection), host=`activeHostId` plus captured host URL, captured GatewayClient, range and resource-relevant normalized filters. Authentication identity comes from a read-only facade snapshot with a unique session token/epoch and captured current() guard, exposed from AuthenticatedSession ownership. `conn.connectedAt` remains presentation time and is not a collision-free session identifier. Capture the hello method capability set with that same owner. Capture one request transport; never dispatch a later step through a replacement client.
2. Independent endpoints settle independently, but overall loading is derived from the current generation's pending resources. Stale completions cannot clear newer loading or data. A reset, disconnect, identity/host/session switch or unmount invalidates every pending owner; clear prior-owner sensitive data immediately. A new range/filter clears the prior key's data so old values cannot be labeled with a new selection. A same-key refresh may retain its last good snapshot with an explicit current refresh-failed state; failure is not an empty successful result.
3. The page has one owner for initial loading. The coordinator owns saved-default initialization before enabling its reactive fetch coordinator: contain the localStorage accessor itself, reads and parsing; failure selects deterministic defaults and a visible nonfatal persistence state. A persistence failure cannot retrigger data loads. Saved date defaults are applied before enabling requests; remove the explicit duplicate onMount batch. Normalize filter sets so order-only changes cause no RPC. Date-only resources reload for owner/range changes; filtered resources reload for owner/range/filter changes. One initial mount makes exactly eight requests (including two deliberately different summary scopes), not sixteen. A manual refresh reloads both groups exactly once for ordinary metric tabs; performance keeps its existing explicit panel refresh contract.
4. Live events stay reactive without inventing aggregate increments. Carry the captured client/authenticated-session owner from the gateway onEvent boundary through pushReliabilityEvent; recheck that owner before feed append, live timer admission, trailing-batch admission and publication. Owner reset clears both recentEvents and displayed events. Keep the recent feed bounded at200. Match the active range and severity/category filters before appending to the displayed sample and cap it at2000; the mode dropdown retains its documented broad event sample. Do not increment a filtered aggregate from uncorrelated events. Instead notify the page coordinator and coalesce an authoritative refresh: at most one active batch, one trailing request, and at least2seconds between live-triggered batch starts. A user query change is immediate and supersedes this live work. The one-active/one-trailing bound applies to the current live scheduler: an unabortable stale WS promise is logically retired, and must not serialize a new owner behind the abandoned request. A sustained stream therefore cannot create unbounded in-flight RPCs or defeat current-query publication. Clear the timer/listener on dispose. No claim of exact stream/snapshot merge is made without a server watermark.
5. Optional method absence is explicit compatibility state established only by absence from the captured hello.features.methods set for the same authenticated epoch. The shared client currently drops server error codes, so message parsing and transport catches cannot prove unsupported. An advertised method that rejects is a current transport/server failure. An unavailable capability snapshot is a visible unavailable state, never unsupported. A current transport/server failure is visible with a retry action and does not silently claim empty or unsupported. Reuse the existing boundary/alert/button primitives and EN/ES copy. Keep each panel's documented fallback to its current query's sample only when compatibility absence is known; no fallback from another owner or query.
6. Extract request ownership/coordinator logic from the large route into named small modules. Keep public reliability data types/imports compatible with existing consumers. Avoid changing shared createAsyncResource semantics across unrelated domains in this slice. Observe the current gateway session facade as a dependency; do not rewrite its lifecycle.

## DELTA and verification

- Eight actual production loaders: resolve B before A, reject A after B, and finish A while B pending. Assert only B's values/error/loading survive. Test all endpoints, not a proxy helper alone.
- Equal-timestamp same-client reauthentication must still retire prior ownership. Reset and same-client reauthentication while responses are pending; no former actor/org/host/session data or errors reappear. Simulate a host URL change with stable host ID.
- Throwing storage accessor, getItem/JSON/persistence failures produce deterministic default loading and a visible nonfatal state without repeated RPCs. Mounted production coordinator after saved preset and custom range initialization: one request per effective endpoint key. Equivalent filter order gives zero new requests, a real filter change reloads only filtered resources, manual refresh reloads both groups once.
- Same-key refresh failure retains its known snapshot and displays a visible failure; different-key failure cannot show old data. Unsupported optional RPC and network rejection have different visible states.
- Push matching and nonmatching live events during requests; filtered totals are not locally fabricated, events stay bounded and the two-second/one-trailing refresh contract is proven with timers. A burst plus query switch/disconnect/unmount leaves no stale publication or active timer.
- Mounted UI exercises error, retry and recovery with actual primitives; capture desktop/narrow evidence using the real component and explicitly synthetic transport. Run focused reliability/gateway-neighbor tests, full type check, design and token gates. Negative control disabling generation guard must break an actual loader test.

## Review and release

Root authors and implements after independent Standards review and root final Spec review. The user authorized all findings; this slice needs no production data, sends, migration or API/protocol change. Independent implementation review examines live-event handlers, gateway reset, all loader callers and error fallbacks. Local qualification is not production release.
