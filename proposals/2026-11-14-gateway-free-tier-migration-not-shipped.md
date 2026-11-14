---
id: 2026-11-14-gateway-free-tier-migration-not-shipped
title: Built gateway cannot start the free-tier API (migration SQL not shipped)
status: draft
created: 2026-11-14
updated: 2026-11-14
repos: [minion]
---

# Built gateway cannot start the free-tier API (migration SQL not shipped)

## AS-IS

Every built gateway logs at startup:

```
[gateway] free-tier API unavailable: Error: ENOENT: no such file or directory,
open '/db/migrations/004_free_tier_users.sql'
```

Seen 2026-11-14 in a local build of `origin/DEV` `533616ce95a` and in a container of the prod
image `sha256:de25b7b2e2a9…` (the image `minion_gateway-default` runs) during the load test in
`specs/115-gateway-k6-load-suite`.

Cause: `src/gateway/free-tier/db.ts:17` builds the path as
`join(dirname(fileURLToPath(import.meta.url)), "../../db/migrations/004_free_tier_users.sql")`.
From the source tree that is `src/db/migrations/…`; from the bundle in `dist/` it is two levels
above `dist/` (`/db/migrations/…` in the image), and the build copies no `.sql` there.

Not verified: whether anything in production is meant to use the free-tier API today (auth,
users, quota — MIN-1198). If it is, it has been silently off in every built deployment.

## TO-BE

The free-tier API starts in a built gateway, or — if the feature is retired — the handler and
its startup warning are removed.

## Options

1. Inline the SQL as a string in `db.ts` (smallest; no build step).
2. Copy `src/db/migrations/*.sql` into `dist/` in the build and resolve relative to the bundle.
3. Remove the free-tier API if unused.

Found by the load test; not fixed there because it was outside what the owner asked for.
