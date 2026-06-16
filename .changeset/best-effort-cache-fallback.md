---
"@minion-stack/cache": patch
---

Make the cache strictly best-effort so a cache problem can never 500 a request.

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
