---
phase: 06-auth-extraction
verified: 2026-04-21T19:18:43Z
status: complete
must_haves_verified: 5
must_haves_total: 5
---

# Phase 6 — Auth Extraction — VERIFICATION

**Phase:** 06-auth-extraction
**Closed:** 2026-04-21
**Outcome:** Complete

---

## Requirements Coverage

| ID | Status | Evidence |
|----|--------|----------|
| AUTH-01 | Complete | `packages/auth/src/factory.ts` — `createAuth()` export with 12 unit tests covering jwt audience/alg/expiry, useSecureCookies, trustedOrigins, google gating, hooks, accountLinking, plugin composition; 06-01-SUMMARY.md (commit `6d321c3`) |
| AUTH-02 | Complete | `npm view @minion-stack/auth version` → `0.2.0`; registry HTTP 200 on `https://registry.npmjs.org/@minion-stack/auth/0.2.0`; 06-01-SUMMARY.md (publish confirmed with npm OTP, E403 re-attempt confirms live) |
| AUTH-03 | Complete | `minion_hub/src/lib/auth/auth.ts` imports `createAuth` from `@minion-stack/auth`; `minion_site/src/lib/auth/auth.ts` imports `createAuth` from `@minion-stack/auth`; both consumers pass identical `secret` + `baseURL` + `db` config; hub PR #19 (NikolasP98/minion_hub) + site PR #5 (NikolasP98/minion-site) merged and live; 06-02-SUMMARY.md + 06-03-SUMMARY.md |
| AUTH-04 | Complete | Staging: 06-04-STAGING-RESULTS.md — JWKS kid `gR0h1QKBswrpsykV0JRW7WD4C4F1y3vc` identical on hub + site; cross-app session confirmed (`staging-test-06@example.com` resolved from hub cookie on site). Production: 06-05-PROD-DEPLOY-LOG.md — both deploys live with HTTP 200, no forced logouts, no auth-failure spike in 30-min observation window |

---

## Success Criteria (from ROADMAP Phase 6)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `packages/auth` exports a `createAuth()` factory that accepts environment-specific params | PASS | `packages/auth/src/factory.ts` (72 lines); `packages/auth/src/index.ts` barrel re-export; `packages/auth/dist/` emitted by tsc (AUTH-01) |
| 2 | `@minion-stack/auth` is published on npm | PASS | `npm view @minion-stack/auth version` → `0.2.0`; public registry, importable (AUTH-02) |
| 3 | Both `minion_hub` and `minion_site` call `createAuth()` with identical secret and provider config | PASS | Both consumers pass same `secret` (BETTER_AUTH_SECRET from Infisical `minion-core`), same `baseURL`, same shared `db` (Turso); hub adds `organization+oidcProvider` plugins; site adds `organization` plugin — factory jwt config is identical (AUTH-03) |
| 4 | A user logging into hub has a valid session on site (shared-session continuity in staging) | PASS | 06-04-STAGING-RESULTS.md: JWKS kid identical on both services; hub cookie accepted by site `/api/auth/get-session`; decision: GO (AUTH-04 staging half) |
| 5 | Coordinated production deploy of hub + site passes smoke tests with no forced logouts | PASS | 06-05-PROD-DEPLOY-LOG.md: both services live at `@minion-stack/auth@0.2.0`; BETTER_AUTH_SECRET not rotated; 30-min observation clean (AUTH-04 production half) |

**All 5 success criteria: PASS**

---

## Key Artifacts

| Artifact | Purpose | Commit/Evidence |
|----------|---------|-----------------|
| `packages/auth/src/factory.ts` | `createAuth()` factory implementation | `6d321c3` (06-01 Task 2) |
| `packages/auth/src/factory.test.ts` | 12 TDD unit tests | `6d321c3` (06-01 Task 2) |
| `packages/auth/CHANGELOG.md` | Changeset version 0.2.0 | `cc747fe` (06-01 Task 3) |
| `minion_hub/src/lib/auth/auth.ts` | Hub consumer migration | `6e1eb4b` (06-02 Task 1) |
| `minion_site/src/lib/auth/auth.ts` | Site consumer migration + JWT drift fix | `7391dd9` (06-03 Task 1) |
| `06-04-STAGING-RESULTS.md` | GO decision + JWKS kid match + cross-app session | 06-04 staging |
| `06-05-PROD-DEPLOY-LOG.md` | Production deploy log + smoke test outcomes | This plan |

---

## Deviations from Plan

**1. [Rule 3 - Blocking] tsconfig needed `exclude` for test files to build cleanly (06-01)**
- tsc included `factory.test.ts` in build; accessing `auth.options.accountLinking` caused TS error
- Fix: added `"exclude": ["src/**/*.test.ts"]` to `packages/auth/tsconfig.json`
- Impact: zero — vitest uses own transform pipeline; test behavior unchanged

**2. [Rule 2 - Missing Critical] Added `@minion-stack/db` as explicit direct dep in hub (06-02)**
- `auth.ts` imports `* as schema from '@minion-stack/db/schema'` directly; was only transitive
- Fix: `bun add @minion-stack/db@^0.2.0` in `minion_hub/package.json`
- Impact: minimal — no behavioral change

**3. [Rule 1 - Bug] Fixed TypeScript strict-mode type error on `secret` param in site (06-03)**
- Site's generated `ambient.d.ts` types `BETTER_AUTH_SECRET` as `string | undefined`
- Fix: `secret: env.BETTER_AUTH_SECRET ?? ''` — fallback produces clear runtime failure if missing
- Impact: minimal — production env var is always set via Infisical; one-token change

**4. [Prerequisite fixes added during 06-04 staging]**
- Site `BETTER_AUTH_SECRET` missing from prod env → Added to Infisical `minion-core`
- Site `BETTER_AUTH_URL` missing → Added `https://minionsite.vercel.app` to Infisical
- Echo trailing newline in secret → Fixed with `printf`
- Impact: all three were required for staging/production to pass AUTH-04

---

## Open Follow-ups

- **Better Auth upgrade** (1.4.19 → 1.6.x) — deferred to its own phase per RESEARCH State of the Art; no breaking changes expected but requires independent testing
- **Hub's `gateway-jwt.service.ts` custom JWT signer** stays in hub per RESEARCH Assumption A6 — factory covers the Better Auth session JWT path; gateway-specific JWT is a separate concern
- **Desktop-mode session persistence** stays in hub per Assumption A5 — hub-specific UX, not part of the shared factory
- **`crossSubDomainCookies` config** — N/A for current deployment topology (hub and site are on separate root domains: `admin-console.dev` vs `vercel.app`); each domain's cookie is scoped to its own domain; cross-app session works via shared DB + BETTER_AUTH_SECRET, not cookie sharing

---

_Verified: 2026-04-21_
_Phase: 06-auth-extraction — CLOSED_
