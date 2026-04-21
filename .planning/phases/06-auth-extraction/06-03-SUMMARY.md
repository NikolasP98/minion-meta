---
phase: 06-auth-extraction
plan: 03
subsystem: auth
tags: [better-auth, minion-stack, sveltekit, typescript, factory-pattern, drizzle]

# Dependency graph
requires:
  - phase: 06-auth-extraction/06-01
    provides: "@minion-stack/auth@0.2.0 published to npm with createAuth() factory"
  - phase: 05-db-extraction
    provides: "@minion-stack/db@0.2.0 with schema barrel at @minion-stack/db/schema"
provides:
  - "minion_site consumes createAuth() factory from @minion-stack/auth"
  - "JWT audience drift bug eliminated — site no longer calls bare jwt() with no config"
  - "PR #5 open on NikolasP98/minion-site targeting master (held pending Plan 06-04 staging)"
affects:
  - "06-04 staging verification"
  - "06-05 production deploy"

# Tech tracking
tech-stack:
  added:
    - "@minion-stack/auth@^0.2.0 (site dependency)"
  patterns:
    - "Consumer lazy singleton: let _auth = null; getAuth() wraps createAuth() call"
    - "Site-specific plugin (organization()) passed via plugins param; factory handles jwt with full config"
    - "secret fallback to '' for strict TypeScript compatibility (env var typed as string|undefined in site's ambient.d.ts)"

key-files:
  created: []
  modified:
    - "minion_site/src/lib/auth/auth.ts — delegates to createAuth(); jwt drift fixed; schema import preserved"
    - "minion_site/package.json — @minion-stack/auth@^0.2.0 added"
    - "minion_site/bun.lock — lockfile updated"

key-decisions:
  - "Used @minion-stack/auth@^0.2.0 (published version) instead of ^0.1.0 from plan — plan was written before publish; critical context confirms 0.2.0"
  - "secret: env.BETTER_AUTH_SECRET ?? '' to satisfy TypeScript strict mode — site's ambient.d.ts types env vars as string|undefined (not pinned by Infisical at type-gen time); hub's ambient.d.ts has them as string (was generated with env vars present). Fallback '' causes runtime auth failure with a clear message if secret is missing."
  - "PR held at review; NOT merged — gated on Plan 06-04 staging verification"

patterns-established:
  - "Pattern: Consumer wraps createAuth() in lazy singleton (D-08); env vars never evaluated at module load"
  - "Pattern: Site passes only organization() — no OIDC provider, no signup hook; factory handles jwt normalization"

requirements-completed:
  - AUTH-03

# Metrics
duration: 3min
completed: 2026-04-21
---

# Phase 06 Plan 03: Site Consumer Migration Summary

**minion_site/src/lib/auth/auth.ts migrated from inline betterAuth() to createAuth() factory; JWT audience drift bug eliminated; PR #5 open on NikolasP98/minion-site targeting master**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-21T18:43:33Z
- **Completed:** 2026-04-21T18:46:00Z
- **Tasks:** 1 (single task plan)
- **Files modified:** 3 (auth.ts, package.json, bun.lock)

## Accomplishments

- Site auth.ts replaced 36-line inline `betterAuth()` config with compact factory delegation to `createAuth()`
- JWT drift bug closed: site previously called `jwt()` with no arguments (no issuer/audience); factory normalizes to `{ issuer: baseURL, audience: 'openclaw-gateway', expirationTime: '1h', alg: 'EdDSA' }` — matching hub's config exactly
- Schema import from `@minion-stack/db/schema` preserved (was already correct from Phase 5 — not regressed)
- Lazy `getAuth()` singleton pattern preserved — env vars not evaluated at module load (critical for SvelteKit SSR build)
- Site-specific plugins: only `organization()` — no OIDC provider, no signup hook (site scope is minimal)
- `bun run check` passes with 0 errors
- PR #5 open at https://github.com/NikolasP98/minion-site/pull/5 targeting master

## Task Commits

1. **Task 1: Migrate site auth.ts to consume createAuth() factory** — `7391dd9` (refactor) — on feature/auth-consume-factory in NikolasP98/minion-site

## Files Created/Modified

- `minion_site/src/lib/auth/auth.ts` — delegates to createAuth() with organization() plugin only; lazy singleton preserved
- `minion_site/package.json` — @minion-stack/auth@^0.2.0 added to dependencies
- `minion_site/bun.lock` — lockfile updated with new package

## Decisions Made

- **@minion-stack/auth@^0.2.0 instead of ^0.1.0:** Plan references 0.1.0 but was written before publish. The actual published version is 0.2.0 (confirmed via `npm view @minion-stack/auth version`). Critical context in the execution prompt explicitly says "use ^0.2.0".
- **`secret: env.BETTER_AUTH_SECRET ?? ''`:** Site's `.svelte-kit/ambient.d.ts` does not declare `BETTER_AUTH_SECRET` as a typed env var (it's only known at runtime via Infisical). TypeScript therefore types it as `string | undefined`. Using `?? ''` satisfies the `secret: string` param and produces a clear runtime failure (auth rejects empty secret) if the var is missing — appropriate for a required credential.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript strict-mode type error on `secret` param**

- **Found during:** Task 1 — `bun run check` after writing new auth.ts
- **Issue:** `env.BETTER_AUTH_SECRET` is typed as `string | undefined` in site's generated ambient.d.ts (env vars not captured at type-gen time without Infisical running). `CreateAuthParams.secret` requires `string`.
- **Fix:** `secret: env.BETTER_AUTH_SECRET ?? ''` — empty string fallback produces a clear runtime auth failure if the secret is missing; does not suppress errors silently
- **Files modified:** minion_site/src/lib/auth/auth.ts
- **Commit:** 7391dd9

---

**Total deviations:** 1 auto-fixed (Rule 1 — type error in strict mode)
**Impact on plan:** Minimal — one-token change. Runtime behavior identical when env var is set (production).

## JWT Drift Fix Confirmed

```
grep -c "jwt(" minion_site/src/lib/auth/auth.ts  → 0
```

Site auth.ts no longer calls `jwt()` directly. Factory injects full JWT config unconditionally:
- `issuer: baseURL` (env.BETTER_AUTH_URL)
- `audience: 'openclaw-gateway'`
- `expirationTime: '1h'`
- `alg: 'EdDSA'`

Site-minted JWTs now have the correct audience claim for gateway validation. Prior bare `jwt()` call had no audience — gateway would reject site-user JWTs.

## Schema Import Preserved

```
grep -n "@minion-stack/db/schema" minion_site/src/lib/auth/auth.ts
→ 4: import * as schema from '@minion-stack/db/schema';
```

Already correct from Phase 5. Not regressed.

## Acceptance Criteria Verified

- `grep -q "from '@minion-stack/auth'"` → PASS
- `grep -q "from '@minion-stack/db/schema'"` → PASS
- `! grep -q "betterAuth({"` → PASS (count=0)
- `! grep -q "from 'better-auth'"` → PASS (count=0)
- `! grep -q "drizzleAdapter"` → PASS (count=0)
- `! grep -q "jwt("` → PASS (count=0)
- `grep -q '"@minion-stack/auth"' package.json` → PASS
- `bun run check` → PASS (0 errors, 1 pre-existing a11y warning in unrelated file)
- `gh pr list --repo NikolasP98/minion-site --head feature/auth-consume-factory --state open` → PASS (PR #5)

## PR Details

- **URL:** https://github.com/NikolasP98/minion-site/pull/5
- **Title:** refactor(auth): consume @minion-stack/auth factory
- **Base:** master
- **Head:** feature/auth-consume-factory
- **Status:** Open, NOT merged (gated on Plan 06-04 staging verification)

## Next Phase Readiness

Both Wave 2 consumer PRs are now open:
- Hub PR #19 on NikolasP98/minion_hub (plan 06-02)
- Site PR #5 on NikolasP98/minion-site (this plan)

Handoff to Plan 06-04: "Hub PR open on NikolasP98/minion_hub; site PR #5 open on NikolasP98/minion-site; both must pass staging verification (shared-session continuity) before merging."

## Known Stubs

None — auth.ts is a full implementation. All env vars, plugins, and schema are wired correctly.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The auth.ts rewrite is a drop-in substitution preserving all existing behavior. JWT audience normalization is a security improvement (closes T-06-12 from the plan's threat model).

---
*Phase: 06-auth-extraction*
*Completed: 2026-04-21*
