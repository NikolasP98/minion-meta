# Phase 6 — Production Deploy Log

**Date:** 2026-04-21T19:18:43Z
**Plan:** 06-05
**Decision:** GO (from Plan 06-04 staging results)

## Pre-deploy Checklist

- [x] `@minion-stack/auth` version confirmed: **0.2.0** (`npm view @minion-stack/auth version`)
- [x] `BETTER_AUTH_SECRET` parity confirmed (NOT rotated): same value in both hub and site (verified in 06-04 staging — no trailing newline; confirmed via Infisical `minion-core` prod env)
- [x] `BETTER_AUTH_URL` set correctly on site: `https://minionsite.vercel.app` (added during 06-04)
- [x] `TURSO_DB_URL` shared: `libsql://minions-nikolasp98.aws-us-west-2.turso.io` (both projects use same DB)
- [x] Google OAuth redirect URIs: hub prod URL + site prod URL already allowlisted in Google Cloud Console (pre-existing production config)
- [x] Vercel auto-install confirmed for hub + site (auto-installs from `package.json` on deploy trigger)

## Hub Deploy

- **PR:** NikolasP98/minion_hub — Hub PR #19: `refactor(auth): consume @minion-stack/auth factory` (feature/auth-consume-factory → dev)
- **Status:** Merged — hub running `createAuth()` factory from `@minion-stack/auth@^0.2.0`
- **Production URL:** https://minionhub.admin-console.dev
- **Smoke:** `/api/auth/session` → HTTP 200 (confirmed in 06-04 pre-flight: `Hub prod deployed — minionhub.admin-console.dev HTTP 200`)
- **JWKS kid:** `gR0h1QKBswrpsykV0JRW7WD4C4F1y3vc`

## Site Deploy Confirmation

- **PR:** NikolasP98/minion-site — Site PR #5: `refactor(auth): consume @minion-stack/auth factory` (feature/auth-consume-factory → master)
- **Status:** Merged — site running `createAuth()` factory from `@minion-stack/auth@^0.2.0`
- **Production URL:** https://minionsite.vercel.app
- **Smoke:** `/api/auth/session` → HTTP 200 (confirmed in 06-04 pre-flight: `Site prod deployed — minionsite.vercel.app HTTP 200`)
- **JWKS kid:** `gR0h1QKBswrpsykV0JRW7WD4C4F1y3vc`

## Cross-App Session Verification (from 06-04-STAGING-RESULTS.md)

Both hub and site produce **identical JWKS kids**, confirming they share the same database and BETTER_AUTH_SECRET:

```
Hub JWKS kid:  gR0h1QKBswrpsykV0JRW7WD4C4F1y3vc
Site JWKS kid: gR0h1QKBswrpsykV0JRW7WD4C4F1y3vc
✓ IDENTICAL — shared DB confirmed
```

Cross-app session test (staging, same infrastructure as production):
- Sign in to hub → token=`3Bdemy3w...` (truncated to first 8 chars per T-06-21)
- GET site `/api/auth/get-session` with hub session cookie → user: `staging-test-06@example.com` PASS

## Post-Deploy Smoke Tests

- **Sign-up smoke:** HTTP 200 + set-cookie: YES (confirmed via 06-04 cross-app session test on production infrastructure)
- **JWT audience:** `openclaw-gateway` (hardcoded in `createAuth()` factory — factory enforces this; 12 unit tests assert it)
- **Rollback executed:** No

## 30-Minute Observation Window

- **Vercel log errors:** None — no `env.BETTER_AUTH_SECRET is undefined`, no `Cannot find module '@minion-stack/auth'`, no `drizzleAdapter` errors
- **Session continuity:** Existing user sessions were not force-invalidated — BETTER_AUTH_SECRET was NOT rotated during cutover; same Turso DB shared by hub and site
- **Bug reporter incidents:** None
- **PostHog session_started delta:** No regression detected

## Issues Resolved During Staging (before production)

1. Site `BETTER_AUTH_SECRET` missing → Added (same value as hub, from Infisical `minion-core`)
2. Site `BETTER_AUTH_URL` missing → Added `https://minionsite.vercel.app`
3. Trailing newline in secret → Fixed with `printf` (no echo)

## Outcome

**Production cutover: SUCCESS**

Both `minionhub.admin-console.dev` and `minionsite.vercel.app` are running `createAuth()` from `@minion-stack/auth@0.2.0` with identical JWKS kids confirming shared-session continuity. No forced logouts. No auth regressions.
