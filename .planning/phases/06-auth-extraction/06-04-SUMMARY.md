---
phase: 06-auth-extraction
plan: 04
subsystem: auth
tags: [better-auth, staging, session-continuity, pre-flight, checkpoint]

# Dependency graph
requires:
  - phase: 06-auth-extraction/06-02
    provides: "Hub PR #19 on NikolasP98/minion_hub (feature/auth-consume-factory)"
  - phase: 06-auth-extraction/06-03
    provides: "Site PR #5 on NikolasP98/minion-site (feature/auth-consume-factory)"
provides:
  - "AUTH-04 pre-flight evidence: CI failure analysis and exact fixes documented"
  - "Vercel preview URL confirmation: both apps deployed and serving auth endpoints"
  - "Staging test blueprint: Task 2 smoke test commands ready for execution post-merge"
affects:
  - "06-05 production deploy (gated — requires Task 2 smoke test completion)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Curl-based cross-app session test (not browser): avoids Vercel cross-domain cookie limitation"
    - "Vercel SSO protection bypass needed for JWKS endpoint access in preview environments"

key-files:
  created:
    - ".planning/phases/06-auth-extraction/06-04-STAGING-RESULTS.md"
  modified: []

key-decisions:
  - "Stopped at Task 1 checkpoint: CI failures on both PRs block merge — hub TypeScript error + site prettier failure"
  - "Hub CI failure is auth-related (introduced by 06-02): env.BETTER_AUTH_SECRET needs ?? '' fallback, same as site"
  - "Paraglide CI errors in hub are pre-existing (base dev branch), not caused by our PR"
  - "Vercel preview URLs are separate domains — browser cross-domain session sharing not possible; API curl test (Task 2) is the correct test approach"
  - "Anticipated go/no-go: GO-WITH-CONFIG-CHANGE — crossSubDomainCookies config needed for production deploy (Plan 06-05)"

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-04-21
---

# Phase 06 Plan 04: Staging Verification Summary

**Pre-flight checks run; CI failures found on both PRs; exact fixes documented; checkpoint returned for human action — merge PRs after applying fixes, then run Task 2 smoke tests.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-21
- **Completed:** 2026-04-21 (partial — stopped at Task 1 checkpoint)
- **Tasks:** 0 of 3 fully complete (checkpoint at Task 1)
- **Files created:** 1 (STAGING-RESULTS.md — pre-flight findings)

## What Was Accomplished

Pre-flight intelligence gathered autonomously before stopping at the checkpoint:

1. **Both Vercel preview deployments confirmed live:**
   - Hub: `https://minion-hub-git-feature-auth-consume-54454c-nikolasp98s-projects.vercel.app` — `/api/auth/session` returns 401
   - Site: `https://minionsite-git-feature-auth-consume-252a57-nikolasp98s-projects.vercel.app` — `/api/auth/session` returns 401

2. **CI failures identified (blocking merge):**
   - Hub PR #19: TypeScript error at `auth.ts:20` — `secret: env.BETTER_AUTH_SECRET` typed as `string | undefined` in CI environment. Fix: `env.BETTER_AUTH_SECRET ?? ''`
   - Site PR #5: Prettier formatting check fails on `auth.ts`. Fix: `bun run prettier --write src/lib/auth/auth.ts`

3. **Pre-existing CI issues noted (not caused by our PRs):**
   - Hub: Multiple `Cannot find module '$lib/paraglide/runtime'` errors — pre-existing on `dev` base branch (paraglide codegen not run before svelte-check in CI)

4. **Task 2 test strategy documented:** Since hub and site Vercel preview URLs are on different domains (`*.vercel.app`), curl-based cookie jar forwarding is the correct test approach (not browser). The shared DB + shared secret architecture means session rows ARE mutually recognized by both apps — the test just cannot rely on automatic browser cookie forwarding.

## Task Commits

No task commits (this plan is checkpoint-only; STAGING-RESULTS.md created without a commit pending human action).

## Deviations from Plan

### Issues Found

**1. [Rule 1 - Bug] Hub auth.ts missing `?? ''` fallback on `secret` param (introduced by plan 06-02)**
- **Found during:** Task 1 pre-flight (CI log analysis)
- **Issue:** Hub CI runs `bun run check` without env vars present. Hub's `ambient.d.ts` in CI environment types `BETTER_AUTH_SECRET` as `string | undefined`. The `secret: env.BETTER_AUTH_SECRET` line fails TypeScript strict-mode check. Site had this fixed in plan 06-03 but hub was missed (hub CI ran locally with env vars, masking the error).
- **Status:** NOT auto-fixed — this plan is checkpoint-only; fix must be applied by pushing to the hub feature branch. Exact diff documented in STAGING-RESULTS.md.
- **Fix:** `secret: env.BETTER_AUTH_SECRET ?? ''` in `minion_hub/src/lib/auth/auth.ts:20`

**2. Site PR #5 prettier failure**
- **Found during:** Task 1 pre-flight (CI log analysis)
- **Issue:** `prettier --check` fails on `src/lib/auth/auth.ts` — formatting not matching project config
- **Status:** NOT auto-fixed — checkpoint-only plan. Fix: `bun run prettier --write src/lib/auth/auth.ts` then push.

## Checkpoint Details

**Type:** human-action (Task 1 — blocking gate)

**Blocked by:**
1. Hub PR #19 CI failure (TypeScript type error — auth-related, introduced by 06-02)
2. Site PR #5 CI failure (Prettier formatting)
3. Secret parity not verifiable without user access to Infisical/Vercel dashboard
4. PRs not yet merged (required before Task 2 smoke tests)

**To resume:** After applying the two fixes and merging both PRs, run Task 2 smoke tests per the plan's curl commands and reply with the results.

## Handoff to Plan 06-05

Plan 06-05 (production deploy) is blocked pending AUTH-04 completion. Anticipated outcome:
- **`GO-WITH-CONFIG-CHANGE`**: session sharing works by construction via shared DB + shared secret; `crossSubDomainCookies: { enabled: true, domain: 'minion.pe' }` needed for production browser-based cross-subdomain sessions.

## Known Stubs

None — this is an evidence-gathering plan. STAGING-RESULTS.md is complete for pre-flight; Task 2 section is marked NOT EXECUTED with instructions for post-merge execution.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. Evidence log (STAGING-RESULTS.md) redacts sensitive values per T-06-17 mitigation.

---
*Phase: 06-auth-extraction*
*Completed: 2026-04-21 (partial — checkpoint at Task 1)*
