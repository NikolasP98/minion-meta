# @minion-stack/cache

## 0.2.1

### Patch Changes

- 7c0b167: Make the cache strictly best-effort so a cache problem can never 500 a request.

  `cached()`/`mget()` now degrade to the source loader (and `invalidateTags`/
  `invalidateKey` become no-ops) in two failure modes that previously threw:
  - **Backend unreachable** — e.g. Valkey down/timing out: reads/writes are wrapped
    so a rejected `backend.get/set/del` falls through to the loader instead of
    propagating.
  - **Cache never configured** — `getConfig()` throwing (because `initCache()`
    failed, e.g. a misconfigured `CACHE_BACKEND`) now falls back to running the
    loader uncached rather than throwing "Cache not configured".

  Regression guard for the 2026-06-15 hub outage where `CACHE_BACKEND="valkey\n"`
  (trailing newline) crashed cache init and every cached read — `/crm`,
  `/api/flows`, … — returned a 500.

## 0.2.0

### Minor Changes

- 94724ea: Add `cache.invalidate` gateway event frame and `CacheBroadcaster` wiring.
  `@minion-stack/shared` exports `CacheInvalidateEvent` + `isCacheInvalidateEvent`
  type guard. `@minion-stack/cache` adds `NoopBroadcaster`, `HttpBroadcaster`,
  and routes `invalidateTags`/`invalidateKey` through the broadcaster when
  configured. Consumers can now propagate invalidations to a gateway HTTP
  endpoint that fans the event onto its WS bus.

  The gateway-side receive endpoint is implemented separately in `minion-ai`.

## 0.1.0

### Minor Changes

- e8a6af4: Initial release: read-aside cache with memory/valkey/noop backends, TTL,
  SWR, single-flight coalescing, tag invalidation, and typed key/tag
  helpers.
