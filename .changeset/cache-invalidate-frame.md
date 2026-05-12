---
'@minion-stack/shared': minor
'@minion-stack/cache': minor
---

Add `cache.invalidate` gateway event frame and `CacheBroadcaster` wiring.
`@minion-stack/shared` exports `CacheInvalidateEvent` + `isCacheInvalidateEvent`
type guard. `@minion-stack/cache` adds `NoopBroadcaster`, `HttpBroadcaster`,
and routes `invalidateTags`/`invalidateKey` through the broadcaster when
configured. Consumers can now propagate invalidations to a gateway HTTP
endpoint that fans the event onto its WS bus.

The gateway-side receive endpoint is implemented separately in `minion-ai`.
