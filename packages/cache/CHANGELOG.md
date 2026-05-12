# @minion-stack/cache

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
