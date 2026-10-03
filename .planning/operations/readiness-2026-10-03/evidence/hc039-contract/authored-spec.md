---
id: 2026-10-03-readiness-mention-directory-spec
title: Scope the mention directory to the current member and organization
stage: spec
status: draft
pass: 1
verdict: pending
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [security, logic, test]
type: fix
proposal: 2026-10-03-readiness-shared-ui-boundaries
---

# Mention directory ownership

## AS-IS

HC-039 was exposed by actual mounted FlowCopilot/ChatMessage tests: a rejected alias fetch escapes a fire-and-forget caller. `src/lib/state/features/aliases.svelte.ts` has one module-wide map, timestamp and inflight promise, no actor/org key, unchecked JSON and no timeout. Invalidation changes only the timestamp, so an older request can repopulate invalidated values. ChatMessage loads only on mount; ChatInput's effect calls the cache while tracking its reactive timestamp and can subscribe to its own completion.

The server defect is part of the same directory boundary. `src/routes/api/users/aliases/+server.ts` requires a tenant context, but `user.service.ts:listAliases(_ctx)` ignores it and selects all non-null aliases through service-role Supabase. It can disclose other organizations' profile IDs/aliases and silently truncate at the PostgREST row limit. Source evidence establishes these risks; no production identities have been retrieved to reproduce them. Alias availability is intentionally a global uniqueness check and is separate from directory listing.

## TO-BE

Only an authenticated current member of an active organization can list that organization's aliases. The response names its actor/org so a response from a cookie/session transition cannot be mistaken for the captured browser owner. No cross-owner map is ever visible, including before effects flush. A rejected, malformed, oversized, timed-out or retired read settles without an unhandled rejection and preserves usable ordinary text entry and plain-text mention rendering. A failed request does not become a successful cache entry.

### Server contract

1. Keep the existing `?check=` availability branch and its global uniqueness semantics. The directory branch requires the canonical browser user `supabaseId` and resolved tenant; gateway credentials alone do not represent a user. Current repository callers of the directory are ChatMessage and ChatInput; inventory all references again before changing the route.
2. Extract the directory query into a small server module. Use the existing PostgreSQL client and one read-only repeatable-read transaction: select the actor's membership joined to an active organization, then select profiles joined to membership in that exact organization. Parameterize all values and use fixed schema/table names. No client-selected actor/org or dynamic relation names; no new migration, role or RLS policy. This is a narrow privileged read, like existing fresh-org-authority, with explicit organization predicates and independently executed SQL tests.
3. Require valid UUIDs, bound the transaction statement timeout to five seconds, and select at most 10,001 rows ordered by profile ID. A directory over 10,000 entries fails explicitly; never return a silently partial success. Null aliases are omitted. Reject invalid aliases, duplicate alias identities or malformed IDs as unavailable instead of letting map inversion silently pick a winner. The existing alias grammar is two through 32 lowercase letters, digits or underscores.
4. Return `{ actorId, organizationId, aliases: { [profileId]: alias } }`, `Cache-Control: private, no-store`. An empty organization directory is a valid empty result. Unauthorized membership is 403, unavailable/malformed/over-limit storage is 503 with a generic error body. Logs/monitoring carry a fixed reason only, never identifiers, aliases, SQL errors or response bodies. No directory or membership data is retained in server module state.

### Browser contract

1. Extract a bounded resource with testable transport/clock and a thin Svelte adapter. One browser-only cache is shared by mounted consumers. Server rendering returns an empty map and starts no requests; no server module-scoped identity data. The browser view is `alias -> profileId`, the inverse of the server DTO. Validate duplicate alias values before inversion. Expose a runtime non-writable `ReadonlyMap<string, string>` facade with `get/has/keys/values/entries/forEach/size` and iteration, never the underlying mutable Map or mutation methods. Update `src/lib/utils/mention.ts` to accept ReadonlyMap; retain its HTML escaping. A type assertion alone is not runtime immutability.
2. The owner comes exactly from `page.data.user.supabaseId` plus top-level `page.data.activeOrgId`, both valid UUIDs; absent/malformed identity fails closed. This HTTP directory does not require or derive identity from a Gateway host/session. Mounting a consumer installs a reactive owner/invalidation observer; teardown releases it. The last consumer retires the cache/request and timer. ChatMessage and ChatInput must both observe owner changes, and TeamTab invalidation must reach active consumers. Replace TeamTab's legacy `void ensureAliases()` with the confirmed-mutation invalidation adapter; that adapter wakes active observers, without starting a cache outside a mounted consumer lifetime. The adapter observes owner and an explicit invalidation revision while reading cache/loading state untracked, preventing completion-driven request loops.
3. Owner transition, missing owner, invalidation and final teardown advance a monotonic generation, abort the old read and clear its visible data. Retired completions cannot publish, clear a newer inflight slot or change retry state. A→B→A must not reuse the first A request. Getters compare the current owner before returning data, so a stale map is hidden even before the effect runs. Same-owner simultaneous consumers deduplicate to one request.
4. Successful data lives at most five minutes. Reads have a ten-second deadline and a one-MiB streamed response bound; reject non-object payloads, unknown owner, invalid IDs/aliases, duplicate alias values or more than 10,000 entries. Validate the exact echoed actor/org against the captured owner before publishing. Do not trust Content-Length as the sole byte bound.
5. Failures return an empty result for that generation and enter a 30-second cooldown. No self-retry loop or permanent polling. A later mount, explicit invalidation, focus or online event may reattempt after the cooldown; focus/online listeners are shared and exist only while consumers are mounted. Invalidation caused by a confirmed alias mutation may bypass the cooldown once. Successful TTL expiry is also refreshed on those lifecycle events; expired aliases are hidden immediately by the getter when next read. A transport ignoring abort still loses observation at the deadline and cannot publish later.
6. Monitoring is rate-limited and categorical for current-generation operational failure; intentional retirement is silent. Monitoring failure cannot reject the read. No raw user text, aliases, URLs, response bodies or actor/org IDs in telemetry.

## DELTA and verification

- Retain actual failing legacy rejection evidence. Add behavioral negative controls for the old cross-org directory query and stale client completion; no source-substring-only passes.
- Execute the production SQL against disposable local PostgreSQL/PGlite fixtures with two organizations, an inactive organization, current/revoked/nonmember/admin actors, overlapping membership and aliases. Prove other-org exclusion, same-org inclusion, empty result, global availability branch compatibility and overflow denial. Native PostgreSQL additionally verifies read-only transaction and timeout semantics. Record fixture cleanup; no production writes.
- Resource tests cover concurrent deduplication, reverse completion, A→B→A, invalidation during read, timeout with noncooperative transport, every decode boundary, cooldown, owner-echo mismatch and harmless observer failures. A failed earlier finalizer must not clear a new request.
- Mount actual ChatMessage and ChatInput (synthetic transport and actor state) to prove reactive mention disappearance/reappearance, usable typing/suggestions after failures, no unhandled rejection, no request loops, bounded lifecycle listeners and teardown. Exercise actual TeamTab invalidation through its public adapter without changing its mutation behavior.
- Check strict types, current Hub focused unit/mounted suites, browser keyboard/mention screenshots, required formatting/design/token gates, and exact source review. The shared Button package and HC036 skill resource are adjacent consumers and must stay intact. Scope any ChatInput edit with its current owner.

## Approval and release boundary

The user explicitly authorized every readiness fix, including newly discovered adjacent defects. This security-tagged amendment records that implementation authorization; independent specification and source review remain required. Merge and production deployment remain separate human gates. The alias availability endpoint's global uniqueness and profile mutation semantics are unchanged.
