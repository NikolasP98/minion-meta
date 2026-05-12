# @minion-stack/cache

Read-aside cache for the Minion platform. Pluggable backends (`memory`,
`valkey`, `noop`), TTL + stale-while-revalidate + single-flight coalescing,
tag-based invalidation.

Design: `docs/superpowers/specs/2026-05-12-caching-layer-design.md`.

## Quick start

```ts
import {
  configureCache,
  createBackendAsync,
  cached,
  keys,
  tags,
} from '@minion-stack/cache';

configureCache({
  backend: await createBackendAsync({
    backend: 'valkey',
    url: process.env.VALKEY_URL!,
    password: process.env.VALKEY_PASSWORD,
  }),
  namespace: 'hub',
  logger: (evt) => console.log(JSON.stringify(evt)),
});

// In a service:
const groups = await cached(
  keys.hub('agent-groups', { t: tenantId, u: userId }),
  { ttl: '10m', swr: '60s', tags: tags.tenantDomain(tenantId, 'agent-groups') },
  () => db.select()...
);
```

## Backends

| Name | Selection | Use case |
| --- | --- | --- |
| `memory` | `createBackend({ backend: 'memory', maxEntries })` | Dev, tests, in-process fallback |
| `valkey` | `createBackendAsync({ backend: 'valkey', url, password })` | Production |
| `noop` | `createBackend({ backend: 'noop' })` | CI without network |

## API

- `cached(key, opts, loader)` — primary read-aside primitive.
- `remember(key, opts, loader)` — alias.
- `invalidateTags(tags)` — bust by tag.
- `invalidateKey(key)` — bust one key.
- `mget(keys)` — batch read.
- `configureCache({ backend, namespace, logger })` — boot-time config.
- `keys.{hub,gateway,paperclip,site}(domain, scope?, opts?)` — typed key builder.
- `tags.{tenantDomain,tenant,entity,user,global}(...)` — typed tag builder.

## Testing

```bash
pnpm --filter @minion-stack/cache test
```

Valkey backend tests use [testcontainers](https://testcontainers.com/) —
they auto-skip when docker is unavailable.
