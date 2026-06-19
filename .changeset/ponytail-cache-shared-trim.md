---
"@minion-stack/cache": minor
"@minion-stack/shared": patch
---

Trim dead surface: remove unused public exports `remember()`, `invalidateKey()`, and `mget()` from `@minion-stack/cache` (no importers; `cached`/`invalidateTags` remain). `@minion-stack/shared`'s `uuid()` now uses native `crypto.randomUUID()` and drops the legacy `Math.random` fallback.
