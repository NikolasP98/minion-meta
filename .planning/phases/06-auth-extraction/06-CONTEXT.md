# Phase 6: Auth Extraction - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Source:** Orchestrator analysis of hub + site auth.ts files (interactive mode)

<domain>
## Phase Boundary

Extract the shared Better Auth configuration from `minion_hub` and `minion_site` into `packages/auth` as a `createAuth()` factory exported from `@minion-stack/auth`. Hub and site consume the factory, passing only their app-specific params (db instance, env vars, extra plugins/hooks). Session continuity is verified in staging: a user who logs into hub has a valid session on site because both apps share the same Turso DB and `BETTER_AUTH_SECRET`.

**What this phase does NOT include:**
- Extracting `auth-client.ts` (identical 5-line files, not worth the indirection)
- Changing authentication providers or adding new ones
- Migrating auth sessions or data

</domain>

<decisions>
## Implementation Decisions

### D-01: Package name
`@minion-stack/auth` — NOT `@minion/auth` (scope locked in Phase 02 to `@minion-stack`).

### D-02: Factory API shape

```typescript
// packages/auth/src/index.ts
import type { BetterAuthOptions } from 'better-auth';

export interface CreateAuthParams {
  db: any;                   // drizzle instance — caller owns creation via getDb()
  schema: Record<string, unknown>; // full schema + relations object
  secret: string;
  baseURL: string;
  trustedOrigins?: string[]; // extra origins beyond the built-in localhost list
  google?: { clientId: string; clientSecret: string }; // optional — omit to disable
  extraPlugins?: NonNullable<BetterAuthOptions['plugins']>; // hub passes [oidcProvider()]
  hooks?: BetterAuthOptions['hooks']; // hub passes personal-agent provision hook
}

export function createAuth(params: CreateAuthParams): ReturnType<typeof betterAuth>
```

Factory always includes: `jwt` (EdDSA, 1h, audience=`openclaw-gateway`) + `organization`.
Hub adds: `oidcProvider({ loginPage: '/login' })` via `extraPlugins`.
Hub adds: personal-agent provision + invitation email hook via `hooks`.

### D-03: Built-in trustedOrigins in factory

Factory always includes localhost dev origins:
```
['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173']
```
Plus `baseURL` (if not already localhost). Caller passes additional origins (e.g. `VERCEL_URL`) via `trustedOrigins` param.

### D-04: useSecureCookies logic

Derived from `baseURL` inside factory: `baseURL.startsWith('https://')`. Not a param — always correct.

### D-05: drizzleAdapter provider stays 'sqlite'

Both hub and site use `provider: 'sqlite'` with Turso (LibSQL uses the SQLite wire protocol). No change.

### D-06: Session sharing mechanism

**No extra config needed.** Better Auth stores sessions in the shared Turso DB and validates them using `BETTER_AUTH_SECRET`. As long as both apps use the same DB URL + same secret, sessions are cross-valid. The key operational requirement is that hub and site are deployed with identical `BETTER_AUTH_SECRET` and `TURSO_DB_URL` values (already true — both pull from Infisical `minion-hub` project).

### D-07: auth-client.ts stays per-app

Both hub and site have identical 5-line `auth-client.ts` files. Not extracted — no meaningful duplication reduction at this size, and SvelteKit's `import.meta.env.VITE_BETTER_AUTH_URL` is app-specific anyway.

### D-08: Lazy init pattern stays per-app

Consuming apps keep their own `let _auth | null = null` lazy getter wrapping `createAuth()`. Factory does NOT implement lazy caching internally — it returns a fresh `betterAuth()` instance on each call. Callers decide caching.

### D-09: Hub dependency sequencing

Phase 5 PRs (#17 consume @minion-stack/db, #18 remove migration scripts) must be merged into `minion_hub/dev` before Phase 6 hub consumer work begins. Phase 6 plans should note this dependency but not block research/scaffold/publish on it.

### D-10: Wave structure

| Wave | Plans | Notes |
|------|-------|-------|
| 1 | 06-01 Scaffold + publish | Checkpoint for npm 2FA |
| 2 | 06-02 Hub consumer, 06-03 Site consumer | Autonomous parallel (different repos) |
| 3 | 06-04 Staging session continuity test | Human verification checkpoint |
| 4 | 06-05 Production deploy | Human action checkpoint (prod-touching) |

Note: ROADMAP shows 4 plans but wave analysis suggests 5 (hub + site consumers should be separate plans since they're different repos). Planner should decide final split.

### Claude's Discretion

- TypeScript types for `CreateAuthParams` — use `any` for `db` type or import from `drizzle-orm` (prefer `any` to avoid peer dep complexity)
- Whether to export a `createAuthClient` helper (probably not — auth-client.ts is app-specific)
- Package version: start at 0.1.0 via changeset (same pattern as packages/db)
- Whether `accountLinking` should be in factory or passed via params (recommend: include in factory since both apps should have it)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current Auth Implementations (source of truth)
- `minion_hub/src/lib/auth/auth.ts` — Hub's full auth config (jwt+oidcProvider+organization, hooks, trustedOrigins pattern)
- `minion_site/src/lib/auth/auth.ts` — Site's auth config (simpler — jwt+organization, no hub-specific hooks)
- `minion_hub/src/lib/auth/auth-client.ts` — Client-side auth (stays per-app, reference only)

### Phase 5 Work (dependency)
- `.planning/phases/05-db-extraction/05-03-SUMMARY.md` — Hub migration state; PRs #17/#18 open on minion_hub
- `packages/db/src/index.ts` — @minion-stack/db package structure (follow same scaffold pattern)
- `packages/db/package.json` — Reference for package.json structure (tsdown build, changeset, exports)

### Project Config
- `.planning/REQUIREMENTS.md` — AUTH-01..AUTH-04
- `.planning/ROADMAP.md` — Phase 6 success criteria
- `packages/db/package.json` — Template for @minion-stack/auth package.json

### Better Auth
- Better Auth version: **1.4.19** (both hub and site — do not upgrade in this phase)
- Hub plugins in use: `jwt`, `oidcProvider`, `organization`, `createAuthMiddleware`
- Site plugins in use: `jwt`, `organization`

</canonical_refs>

<specifics>
## Specific Technical Details

### Hub auth.ts current schema import (to fix in Phase 6)
```typescript
import * as schema from '$server/db/schema'; // ← update to @minion-stack/db/schema
```
This was missed in Phase 5 (auth.ts is passed to drizzleAdapter, not drizzle-kit, so Phase 5's 56-site migration missed it). Fix during Phase 6 hub consumer update.

### JWT config (must be identical in factory)
```typescript
jwt({
  jwt: { issuer: hubUrl, audience: 'openclaw-gateway', expirationTime: '1h' },
  jwks: { keyPairConfig: { alg: 'EdDSA' } },
})
```
Site currently calls `jwt()` with no config — factory should normalize this to full config.

### Hub-specific organization sendInvitationEmail
```typescript
organization({
  async sendInvitationEmail(data) {
    const baseUrl = env.BETTER_AUTH_URL ?? 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/invite/accept?id=${data.id}`;
    await sendInvitationEmail({ ... });
  },
})
```
This is hub-internal. After migration, hub passes `organization({ sendInvitationEmail })` as part of `extraPlugins`. The factory's default `organization()` call has no callback.

Wait — `extraPlugins` won't work cleanly here because hub needs to customize the `organization` plugin that the factory already includes. **Adjustment to D-02:** Factory does NOT call `organization()` internally. Instead, factory accepts `organizationPlugin?: Plugin` param. Hub passes `organization({ sendInvitationEmail })`, site passes `organization()`. This avoids duplicate plugin registration.

### Revised factory plugins structure:
- Always included by factory: `jwt(fullConfig)` 
- Hub provides: `organization({ sendInvitationEmail })` + `oidcProvider()` via `plugins` param
- Site provides: `organization()` via `plugins` param
- `plugins` replaces `extraPlugins` name for clarity

### accountLinking
Hub has: `accountLinking: { enabled: true, trustedProviders: ['google'] }`. Site does not. Include in factory unconditionally (safe for site — just enables the feature).

</specifics>

<deferred>
## Deferred Ideas

- `@minion-stack/auth` as a standalone OIDC client for paperclip (separate phase)
- Centralizing auth middleware (hooks.server.ts) across apps — complex, different apps have different session enrichment needs
- Multi-tenant auth (organization isolation) — existing behavior, not changing

</deferred>

---

*Phase: 06-auth-extraction*
*Context gathered: 2026-04-21 via orchestrator interactive analysis*
