---
phase: 06-auth-extraction
plan: 01
subsystem: auth
tags: [better-auth, jwt, drizzle, factory-pattern, npm-publish, changeset]

# Dependency graph
requires:
  - phase: 05-db-extraction
    provides: "@minion-stack/db package with schema barrel including jwks table; workspace + changeset infra"
  - phase: 02-infisical-rename
    provides: "Infisical minion-hub project for BETTER_AUTH_SECRET + TURSO_DB_URL shared between hub and site"
provides:
  - "@minion-stack/auth@0.2.0 workspace package with createAuth() factory"
  - "12 unit tests covering all factory behaviors (jwt, EdDSA, audience, cookies, plugins, hooks, accountLinking)"
  - "Changeset versioned and CHANGELOG.md generated"
  - "Package ready for npm publish (pending 2FA checkpoint)"
affects: [06-02-hub-consumer, 06-03-site-consumer, 06-04-staging]

# Tech tracking
tech-stack:
  added:
    - "@minion-stack/auth@0.2.0 (workspace package, tsc build)"
    - "vitest@2.1.9 (dev dep for factory unit tests)"
  patterns:
    - "createAuth() factory: callers pass organization/oidcProvider plugins; factory never calls organization() internally (D-02 revised)"
    - "Schema decoupling: factory accepts schema as param, NOT importing @minion-stack/db internally"
    - "useSecureCookies derived from baseURL (not a param) — prevents prod cookie downgrade"
    - "JWT audience hardcoded to 'openclaw-gateway' in factory — callers cannot drift"
    - "TDD workflow: RED (factory.ts missing → test fail) → GREEN (12 tests pass) → BUILD (tsc clean)"

key-files:
  created:
    - packages/auth/package.json
    - packages/auth/tsconfig.json
    - packages/auth/vitest.config.ts
    - packages/auth/README.md
    - packages/auth/src/types.ts
    - packages/auth/src/factory.ts
    - packages/auth/src/index.ts
    - packages/auth/src/factory.test.ts
    - packages/auth/CHANGELOG.md
  modified:
    - pnpm-lock.yaml (workspace registration)

key-decisions:
  - "Version 0.2.0 not 0.1.0: changeset minor bump applied to 0.1.0 scaffold → produced 0.2.0 as initial npm release"
  - "factory.ts excludes organization() (D-02 revised): hub passes organization({sendInvitationEmail})+oidcProvider(), site passes organization() via plugins param"
  - "schema is NOT imported inside factory — passed as param to keep @minion-stack/auth decoupled from @minion-stack/db internals"
  - "tsconfig.json exclude test files from tsc build output (added exclude: [src/**/*.test.ts])"
  - "auth.options introspection works in vitest (runtime duck typing) — test file excluded from tsc build to avoid BetterAuthOptions.accountLinking TS type error"

patterns-established:
  - "Pattern 1: Auth factory pattern — createAuth() returns fresh betterAuth() instance; callers own lazy singleton memoization (D-08)"
  - "Pattern 2: Plugin composition — factory provides jwt(fullConfig) always; callers append organization/oidcProvider via plugins param"
  - "Pattern 3: Secret handling — factory never console.logs params; callers own env reading (no process.env in @minion-stack/auth)"

requirements-completed: [AUTH-01]

# Metrics
duration: ~25min
completed: 2026-04-21
---

# Phase 06 Plan 01: Auth Package Scaffold + Factory Summary

**`@minion-stack/auth@0.2.0` workspace package with `createAuth()` factory: jwt(EdDSA/1h/openclaw-gateway) + accountLinking hardcoded; callers inject organization/oidcProvider via plugins param (D-02 revised)**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-21T17:35:31Z
- **Completed:** 2026-04-21T17:41:45Z (pending 2FA checkpoint for npm publish)
- **Tasks:** 3 tasks (2 fully committed, Task 3 at npm 2FA checkpoint)
- **Files modified/created:** 10 files

## Accomplishments

- Scaffold `packages/auth/` as a pnpm workspace package with complete manifest (package.json, tsconfig.json, vitest.config.ts, README.md)
- Implemented `createAuth()` factory matching CONTEXT.md D-02 revised contract: jwt plugin always included with EdDSA keypair + `audience: 'openclaw-gateway'` + 1h expiry; callers pass organization/oidcProvider via `plugins` param; factory never calls `organization()` internally
- 12 unit tests written TDD (RED→GREEN): cover handler/api surface, jwt audience/alg/expiry, useSecureCookies (http vs https), trustedOrigins defaults + append, google gating, hooks forwarding, accountLinking defaults, plugin append
- Changeset queued (auth-initial.md), `pnpm changeset version` ran, CHANGELOG.md generated with `## 0.2.0` entry
- All commits atomic; `pnpm --filter @minion-stack/auth test` passes (12/12); `pnpm --filter @minion-stack/auth build` emits clean dist/

## Task Commits

1. **Task 1: Scaffold workspace package** - `97a8f73` (chore)
2. **Task 2: Factory TDD — RED→GREEN** - `6d321c3` (feat)
3. **Task 3: Changeset + version** - `cc747fe` (feat)

Note: Task 3 publish step hit npm 2FA checkpoint — publish pending.

## Files Created/Modified

- `packages/auth/package.json` — `@minion-stack/auth@0.2.0`, peerDeps: better-auth@1.4.19 + drizzle-orm>=0.45.0; @minion-stack/db is devDep only
- `packages/auth/tsconfig.json` — extends @minion-stack/tsconfig/library.json; excludes test files from tsc build
- `packages/auth/vitest.config.ts` — vitest run, include src/**/*.test.ts
- `packages/auth/README.md` — hub + site call-site examples, env contract, version-pinning note
- `packages/auth/src/types.ts` — `CreateAuthParams` interface + `AuthInstance` type alias
- `packages/auth/src/factory.ts` — `createAuth()` implementation (72 lines, no organization() call)
- `packages/auth/src/index.ts` — barrel re-export
- `packages/auth/src/factory.test.ts` — 12 TDD tests (excluded from tsc build)
- `packages/auth/CHANGELOG.md` — generated by `pnpm changeset version` (## 0.2.0 entry)
- `pnpm-lock.yaml` — updated to register new workspace package

## Decisions Made

- **Version 0.2.0 not 0.1.0:** The scaffold commit set version to 0.1.0, then `pnpm changeset version` applied the minor bump producing 0.2.0. Publishing 0.2.0 as the initial npm release.
- **organization() NOT in factory (D-02 revised):** Factory only hardcodes `jwt(fullConfig)`. Hub will pass `organization({ sendInvitationEmail })` + `oidcProvider()` via `plugins`; site will pass `organization()`. This avoids duplicate plugin registration.
- **schema passed as param:** Factory accepts `schema: Record<string, unknown>` but does NOT import from `@minion-stack/db/schema` internally. Keeps `@minion-stack/auth` decoupled from `@minion-stack/db` internal structure.
- **tsconfig excludes test files:** The test file uses runtime duck-typing on `auth.options.accountLinking` which passes at runtime but TypeScript's `BetterAuthOptions` type (as exported from `better-auth` main) doesn't directly expose `accountLinking` as a top-level key. Tests use `(auth.options as any)` pattern for socialProviders only; for accountLinking the issue was from the `BetterAuthOptions` type not matching the actual options bag. Fix: exclude test files from tsc build output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tsconfig needed `exclude` for test files to build cleanly**
- **Found during:** Task 2 (factory build)
- **Issue:** tsc included `factory.test.ts` in build; test accessed `auth.options.accountLinking` which caused TS error: "Property 'accountLinking' does not exist on type 'BetterAuthOptions'" (the returned type from `ReturnType<typeof betterAuth>` doesn't include BetterAuthOptions directly)
- **Fix:** Added `"exclude": ["src/**/*.test.ts"]` to `packages/auth/tsconfig.json`
- **Files modified:** packages/auth/tsconfig.json
- **Verification:** `pnpm --filter @minion-stack/auth build` exits 0, dist/ emitted without test files
- **Committed in:** `6d321c3` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking build issue)
**Impact on plan:** Essential fix for tsc build correctness. Test behavior unchanged — vitest uses its own transform pipeline, not tsc. No scope creep.

## Auth Gate: npm 2FA Required

The publish step at Task 3 hit an npm OTP gate:
- npm is configured with 2FA enforcement on `@minion-stack/*` scope
- `npm publish --access public` prompts for OTP via browser auth URL
- This is expected behavior (same as `@minion-stack/db@0.1.0` publish in Phase 5)

**What was attempted:** `npm publish --access public` in `packages/auth/`

**What is ready for publish:**
- `dist/` emitted cleanly (index.js, index.d.ts, factory.js, factory.d.ts, types.js, types.d.ts)
- `CHANGELOG.md` generated with `## 0.2.0` entry
- `package.json` at version `0.2.0`

**User action needed:** Provide npm OTP to publish `@minion-stack/auth@0.2.0`

## Threat Mitigations Applied

Per threat register (T-06-01 through T-06-07):
- T-06-01 (secret logging): factory never logs params — verified by inspection
- T-06-02 (JWT audience drift): `audience: 'openclaw-gateway'` hardcoded in factory — test asserts this
- T-06-03 (cookie downgrade): `useSecureCookies` derived from `baseURL.startsWith('https://')` — tests assert both http/https cases
- T-06-07 (org plugin duplicate): `organization()` NOT called in factory — grep confirms 0 code calls (only JSDoc mentions)

## Known Stubs

None — the factory is fully implemented and all 12 behaviors are tested.

## Next Phase Readiness

- After npm 2FA publish: `npm view @minion-stack/auth version` should return `0.2.0`
- **Handoff to Plans 06-02 + 06-03:** Once `@minion-stack/auth@0.2.0` is live on npm, hub consumer (06-02) and site consumer (06-03) can execute in parallel. Both plans will replace their `betterAuth({...})` body with `createAuth({...})` call, importing from `@minion-stack/auth`.
- AUTH-01 is complete (factory built and tested). AUTH-02 completes after npm publish.

## Self-Check

Verifying claims before finalizing:

- [x] `packages/auth/package.json` — exists, name=@minion-stack/auth, version=0.2.0
- [x] `packages/auth/CHANGELOG.md` — exists, contains `## 0.2.0`
- [x] `packages/auth/dist/index.js` — exists (from build)
- [x] `packages/auth/dist/index.d.ts` — exists (from build)
- [x] All 12 tests pass: `pnpm --filter @minion-stack/auth test` exits 0
- [x] `grep -c "organization" packages/auth/src/factory.ts` → 4 (all in JSDoc comments, 0 code calls)
- [x] `grep -q '"better-auth": "1.4.19"' packages/auth/package.json` → true
- [x] `grep -c '"@minion-stack/db"' packages/auth/package.json` → 1 (devDeps only, not peerDeps)
- [x] Commits 97a8f73, 6d321c3, cc747fe all exist in git log
- [ ] `npm view @minion-stack/auth version` → PENDING (2FA checkpoint)

## Self-Check: PARTIAL (npm publish pending 2FA)

Task 1 and Task 2 self-check: PASSED
Task 3 publish step: BLOCKED at npm 2FA checkpoint

---
*Phase: 06-auth-extraction*
*Completed: 2026-04-21 (Tasks 1+2 complete; Task 3 at npm 2FA checkpoint)*
