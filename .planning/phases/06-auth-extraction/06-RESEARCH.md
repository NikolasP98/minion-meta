# Phase 6: Auth Extraction - Research

**Researched:** 2026-04-21
**Domain:** Better Auth factory extraction, Drizzle adapter wiring, shared session continuity across two SvelteKit apps with a shared DB
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 Package name:** `@minion-stack/auth` — NOT `@minion/auth`. Scope locked in Phase 02 to `@minion-stack`.
- **D-02 Factory API shape:**
  ```typescript
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
  Factory always includes: `jwt` (EdDSA, 1h, audience=`openclaw-gateway`) + `organization`. Hub adds: `oidcProvider({ loginPage: '/login' })` via `extraPlugins`. Hub adds: personal-agent provision + invitation email hook via `hooks`.
- **D-02 revised (from CONTEXT.md specifics section):** Factory does NOT call `organization()` internally. Factory accepts a `plugins` param. Hub passes `organization({ sendInvitationEmail })` + `oidcProvider()`. Site passes `organization()`. `plugins` replaces `extraPlugins` name.
- **D-03 Built-in trustedOrigins in factory:** Always includes `['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173']` plus `baseURL` (if not already localhost). Caller passes additional origins via `trustedOrigins` param.
- **D-04 useSecureCookies logic:** Derived from `baseURL` inside factory: `baseURL.startsWith('https://')`. Not a param.
- **D-05 drizzleAdapter provider stays 'sqlite':** Both hub and site use `provider: 'sqlite'` with Turso (LibSQL uses SQLite wire protocol). No change.
- **D-06 Session sharing mechanism:** No extra config needed. Better Auth stores sessions in shared Turso DB and validates them using `BETTER_AUTH_SECRET`. Both apps use same DB URL + same secret. Already true in production (both pull from Infisical `minion-hub` project).
- **D-07 auth-client.ts stays per-app:** Both hub and site have identical 5-line files. Not extracted.
- **D-08 Lazy init pattern stays per-app:** Consuming apps keep their own `let _auth | null = null` lazy getter wrapping `createAuth()`. Factory does NOT implement lazy caching internally — returns a fresh `betterAuth()` instance on each call.
- **D-09 Hub dependency sequencing:** Phase 5 PRs (#17 consume @minion-stack/db, #18 remove migration scripts) must merge into `minion_hub/dev` before Phase 6 hub consumer work begins.
- **D-10 Wave structure:**
  | Wave | Plans | Notes |
  |------|-------|-------|
  | 1 | 06-01 Scaffold + publish | Checkpoint for npm 2FA |
  | 2 | 06-02 Hub consumer, 06-03 Site consumer | Autonomous parallel (different repos) |
  | 3 | 06-04 Staging session continuity test | Human verification checkpoint |
  | 4 | 06-05 Production deploy | Human action checkpoint (prod-touching) |
- **accountLinking:** Include in factory unconditionally (`accountLinking: { enabled: true, trustedProviders: ['google'] }`). Safe for site.
- **Hub schema import fix:** `auth.ts` currently imports from `$server/db/schema` — must update to `@minion-stack/db/schema` during Phase 6 hub consumer update (was missed in Phase 5).

### Claude's Discretion

- TypeScript types for `CreateAuthParams` — use `any` for `db` type or import from `drizzle-orm` (prefer `any` to avoid peer dep complexity)
- Whether to export a `createAuthClient` helper (probably not — auth-client.ts is app-specific)
- Package version: start at 0.1.0 via changeset (same pattern as packages/db)
- Whether `accountLinking` should be in factory or passed via params (recommend: include in factory since both apps should have it)

### Deferred Ideas (OUT OF SCOPE)

- `@minion-stack/auth` as a standalone OIDC client for paperclip (separate phase)
- Centralizing auth middleware (hooks.server.ts) across apps — complex, different apps have different session enrichment needs
- Multi-tenant auth (organization isolation) — existing behavior, not changing
- Upgrading Better Auth to 1.5.x or 1.6.x — bundling an upgrade with a refactor increases rollback risk
- Consolidating the gateway-jwt.service.ts custom JWT signer — hub-local
- Desktop-mode cookie persistence (`src/server/auth/desktop-session.ts`) — hub-only Electrobun workaround
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Better Auth config extracted from hub and site into `packages/auth` as `createAuth()` factory | Hub auth.ts (102 lines, 8 config keys, 3 plugins) + site auth.ts (36 lines, 5 config keys, 2 plugins) fully inventoried; factory contract documented; D-02 revised API shape verified against actual source |
| AUTH-02 | `@minion-stack/auth` publishes first release | Mirrors `@minion-stack/db@0.1.0` release pattern; Changesets at meta-repo root; peerDep structure and exports map documented |
| AUTH-03 | `minion_hub` and `minion_site` consume the factory with identical secret/provider config | Consumer call sites inventoried (hub: 9 files, site: 5 files); D-09 sequencing dependency (Phase 5 PRs #17/#18) documented; hub schema import fix identified |
| AUTH-04 | Staging deploy of both services verified with shared session continuity (login to hub → session works on site) | Cross-domain cookie mechanism researched; JWT issuer/audience parity requirements verified; JWKS DB storage confirmed; session-sharing mechanism clarified |
</phase_requirements>

---

## Summary

Both `minion_hub` and `minion_site` already ship Better Auth 1.4.19 against the same shared Turso database. The auth schema lives in `@minion-stack/db` at the `./auth` export path (published in Phase 5). Hub runs a superset config (jwt + oidcProvider + organization plugins + email+Google providers + a `createAuthMiddleware` hook that provisions a personal agent on signup). Site runs a subset (jwt + organization, email+Google, no OIDC, no signup hook).

The extraction creates `@minion-stack/auth` exporting `createAuth(params)`. Per the locked D-02 revised design, the factory always includes `jwt(fullConfig)`. Callers pass `organization()` (with or without `sendInvitationEmail`) and hub also passes `oidcProvider()` via the `plugins` param. This avoids duplicate plugin registration and keeps hub-specific callbacks out of the package.

Session continuity (AUTH-04) works by construction: Better Auth signs session cookies with `BETTER_AUTH_SECRET` and stores session rows in the shared DB. Both apps already point to the same Turso instance. The critical operational requirement is identical `BETTER_AUTH_SECRET` in production — confirmed to be sourced from Infisical `minion-hub` project for both apps. Cross-subdomain cookie sharing is a staging/production deploy concern; the factory's `useSecureCookies` is already derived from `baseURL` (D-04).

**Primary recommendation:** Ship `@minion-stack/auth@0.1.0` with a single `createAuth(params)` factory following D-02 revised. Build with plain `tsc` (same as packages/db). Declare `better-auth` and `drizzle-orm` as peerDependencies pinned to project versions. Scaffold with 5 plans across 4 waves per D-10.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | `1.4.19` | Auth server (sessions, providers, plugins, OIDC) | Already installed in both hub and site; pinned — do NOT bump during extraction [VERIFIED: hub + site package.json] |
| `better-auth/adapters/drizzle` | (bundled) | Drizzle adapter wiring to SQLite/LibSQL | Same adapter both apps already use [VERIFIED: hub + site auth.ts] |
| `better-auth/plugins` | (bundled) | `jwt`, `oidcProvider`, `organization` | Existing plugin selection in hub + site [VERIFIED: hub auth.ts L4-6] |
| `better-auth/api` | (bundled) | `createAuthMiddleware` for signup hook export | Used by hub for `provisionPersonalAgent` hook; exported from `better-auth/api` path [VERIFIED: hub auth.ts L6, better-auth/dist/api/index.d.mts] |
| `@minion-stack/db` | `^0.2.0` | Schema import in factory | JWKS table, auth tables, schema barrel [VERIFIED: packages/db/src/schema/auth/index.ts] |
| `@minion-stack/tsconfig` | `workspace:*` | Shared TS build config | Extended by every existing package [VERIFIED: packages/db/tsconfig.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-orm` | `>=0.45.0` | Peer dep for type definitions | Always — `drizzleAdapter` accepts the Drizzle client type |
| `vitest` | `^2.x` | Package-level tests | Wave 0: minimal smoke test suite for factory behaviour |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tsc` build | `tsdown` / `tsup` | db package uses plain `tsc` — consistency beats marginal bundling gains; auth package has no CJS consumers |
| Single `createAuth()` with `plugins` param | Two separate factories (`createHubAuth`, `createSiteAuth`) | Two factories duplicate the jwt config; harder to keep in sync |
| `BetterAuthPlugin[]` for `plugins` param | `extraPlugins?: ...` name | D-02 revised: `plugins` is clearer; `extraPlugins` name was rejected |
| Better Auth `1.6.x` (latest) | Stay on `1.4.19` | `1.6.0` has a `freshAge` session breaking change; bundling upgrade with refactor adds rollback complexity; defer |

**Installation:**
```bash
# In packages/auth/
pnpm add better-auth@1.4.19
pnpm add -D @minion-stack/tsconfig @minion-stack/db drizzle-orm typescript
```

**Version verification (2026-04-21):**
```bash
npm view better-auth version           # => 1.6.6 (latest — NOT what we want)
npm view better-auth@1.4.19 version   # => 1.4.19 [VERIFIED]
npm view @minion-stack/db version      # => 0.2.0 [VERIFIED]
npm view better-auth dist-tags         # => { 'release-1.4': '1.4.22', latest: '1.6.6' }
```

Note: npm `latest` is 1.6.6. The project is pinned to `1.4.19`. The `peerDependency` should be `"better-auth": "1.4.19"` (exact pin, not range) to prevent silent breakage if a consumer accidentally upgrades. [VERIFIED: npm registry]

---

## Current State Inventory

### Hub auth config (`minion_hub/src/lib/auth/auth.ts` — 102 lines) [VERIFIED]

**Imports:**
- `betterAuth`, `drizzleAdapter`, `jwt`, `oidcProvider`, `organization`, `createAuthMiddleware`
- `getDb()` from `$server/db/client`
- `schema` from `$server/db/schema` — **STILL LOCAL** (missed in Phase 5; fix in Phase 6 consumer update)
- `env` from `$env/dynamic/private`
- `sendInvitationEmail` from `$server/services/email.service` — hub-specific
- `provisionPersonalAgent` from `$server/services/personal-agent.service` — hub-specific

**Config keys:** database (drizzleAdapter), secret, baseURL (hubUrl), advanced.useSecureCookies, trustedOrigins (localhost 5173/5174/4173 + BETTER_AUTH_URL + VERCEL_URL), emailAndPassword.enabled=true, accountLinking.{enabled,trustedProviders}, socialProviders.google (conditional), plugins [jwt+oidcProvider+organization], hooks.after (provisionPersonalAgent on sign-up)

**Singleton pattern:** `let _auth: ReturnType<typeof betterAuth> | null = null; export function getAuth() {...}` — lazy eval avoids reading `env` at module load (critical for SvelteKit SSR/build).

### Site auth config (`minion_site/src/lib/auth/auth.ts` — 36 lines) [VERIFIED]

**Imports:** `betterAuth`, `drizzleAdapter`, `jwt`, `organization`; `getDb()`; `schema` from `@minion-stack/db/schema` (already migrated); `env`. No hub-specific service imports.

**Config keys:** database, secret, baseURL, trustedOrigins (same list), emailAndPassword.enabled=true, socialProviders.google (conditional), plugins [jwt(), organization()]

**Drift vs hub:** Site calls `jwt()` with NO custom issuer/audience/expirationTime. Hub calls with `{ issuer: hubUrl, audience: 'openclaw-gateway', expirationTime: '1h' }`. **This is a latent bug** — JWTs minted from site sessions use Better Auth's defaults and may not validate for gateway calls. The factory normalizes this.

### Auth-client configs (both apps identical, 8 lines) [VERIFIED]
```typescript
import { createAuthClient } from 'better-auth/svelte';
import { jwtClient, organizationClient } from 'better-auth/client/plugins';
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
  plugins: [jwtClient(), organizationClient()],
});
```
These stay per-app (D-07).

### Consumer files requiring update

**Hub (files that import auth, will need `@minion-stack/auth`):**
1. `src/lib/auth/auth.ts` — replace `betterAuth({...})` body with `createAuth({...})` call
2. `src/hooks.server.ts` — no change (imports `getAuth()` from `auth.ts`; proxy logic stays as-is)
3. `src/lib/auth/auth-client.ts` — no change (D-07)
4. Auth-consuming routes — no change (import `authClient` or `getAuth()`, not from better-auth directly)

**Site (files that import auth):**
1. `src/lib/auth/auth.ts` — replace `betterAuth({...})` with `createAuth({...})`
2. `src/hooks.server.ts` — no change
3. `src/lib/auth/auth-client.ts` — no change (D-07)

---

## Architecture Patterns

### Recommended Project Structure

```
packages/auth/
├── package.json            # @minion-stack/auth, version 0.1.0, tsc build
├── tsconfig.json           # extends @minion-stack/tsconfig/library.json
├── README.md               # factory usage, env contract, session-continuity gates
├── src/
│   └── index.ts            # createAuth() factory + types export
└── dist/                   # tsc output (gitignored)
```

Single file `src/index.ts` is sufficient — no need for sub-files unless the factory grows large. This matches the simplicity of packages/shared which is also a thin barrel.

### Pattern 1: D-02 revised factory API

**What:** `createAuth(params)` always emits `jwt(fullConfig)` and accepts an optional `plugins` array for callers to append their own (organization, oidcProvider). Factory never calls `organization()` internally to avoid duplicate registration.

**When to use:** Hub passes `organization({ sendInvitationEmail })` + `oidcProvider()`. Site passes `organization()` only.

```typescript
// Source: adapted from hub/site auth.ts + D-02 revised locked decision + BetterAuthOptions type [VERIFIED]
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
import { jwt } from 'better-auth/plugins';
import * as schema from '@minion-stack/db/schema';

export interface CreateAuthParams {
  db: any;                              // drizzle instance (DrizzleClient)
  schema?: Record<string, unknown>;    // defaults to @minion-stack/db/schema full barrel
  secret: string;
  baseURL: string;
  trustedOrigins?: string[];           // extra origins; factory always adds localhost dev set
  google?: { clientId: string; clientSecret: string };
  plugins?: BetterAuthPlugin[];        // hub: [organization({...}), oidcProvider()]; site: [organization()]
  hooks?: BetterAuthOptions['hooks']; // hub: createAuthMiddleware for provisionPersonalAgent
}

export function createAuth(params: CreateAuthParams) {
  const useSchema = params.schema ?? schema;
  const builtInOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
  ];
  // Add baseURL if it isn't already localhost
  if (!params.baseURL.startsWith('http://localhost')) {
    builtInOrigins.push(params.baseURL);
  }

  return betterAuth({
    database: drizzleAdapter(params.db, { provider: 'sqlite', schema: useSchema }),
    secret: params.secret,
    baseURL: params.baseURL,
    advanced: {
      useSecureCookies: params.baseURL.startsWith('https://'),  // D-04
    },
    trustedOrigins: [...builtInOrigins, ...(params.trustedOrigins ?? [])],
    emailAndPassword: { enabled: true },
    accountLinking: { enabled: true, trustedProviders: ['google'] }, // always on (D-02/discretion)
    socialProviders: params.google ? { google: params.google } : {},
    plugins: [
      jwt({
        jwt: {
          issuer: params.baseURL,
          audience: 'openclaw-gateway',
          expirationTime: '1h',
        },
        jwks: { keyPairConfig: { alg: 'EdDSA' } },
      }),
      ...(params.plugins ?? []),
    ],
    hooks: params.hooks,
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
```

### Pattern 2: Consumer lazy singleton

**What:** Per D-08, each consumer keeps its own `let _auth: AuthInstance | null = null` wrapper. The factory returns a fresh instance; callers memoize.

**Why:** `$env/dynamic/private` in SvelteKit throws if evaluated at module load time during `vite build`. The singleton must be created inside a function called at request time.

```typescript
// minion_hub/src/lib/auth/auth.ts — after extraction
import { createAuth, type AuthInstance } from '@minion-stack/auth';
import { organization, oidcProvider } from 'better-auth/plugins';
import { createAuthMiddleware } from 'better-auth/api';
import { getDb } from '$server/db/client';
import * as schema from '@minion-stack/db/schema';      // fix from Phase 5 miss
import { env } from '$env/dynamic/private';
import { sendInvitationEmail } from '$server/services/email.service';
import { provisionPersonalAgent } from '$server/services/personal-agent.service';

let _auth: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (!_auth) {
    const hubUrl = env.BETTER_AUTH_URL ?? 'http://localhost:5173';
    _auth = createAuth({
      db: getDb(),
      schema,
      secret: env.BETTER_AUTH_SECRET,
      baseURL: hubUrl,
      trustedOrigins: [
        ...(env.VERCEL_URL ? [`https://${env.VERCEL_URL}`] : []),
      ],
      google: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
        : undefined,
      plugins: [
        organization({
          async sendInvitationEmail(data) {
            const baseUrl = env.BETTER_AUTH_URL ?? 'http://localhost:5173';
            await sendInvitationEmail({
              to: data.email,
              inviterName: data.inviter.user.name ?? data.inviter.user.email,
              organizationName: data.organization.name,
              role: data.role ?? 'member',
              inviteUrl: `${baseUrl}/invite/accept?id=${data.id}`,
            });
          },
        }),
        oidcProvider({ loginPage: '/login' }),
      ],
      hooks: {
        after: createAuthMiddleware(async (ctx) => {
          if (ctx.path.startsWith('/sign-up')) {
            const newSession = ctx.context.newSession;
            if (newSession) {
              try {
                const db = getDb();
                await provisionPersonalAgent(
                  { db, tenantId: 'default' },
                  { userId: newSession.user.id, email: newSession.user.email, serverId: '' }
                );
              } catch (err) {
                console.error('[personal-agent] Failed to provision on signup:', err);
              }
            }
          }
        }),
      },
    });
  }
  return _auth;
}
```

```typescript
// minion_site/src/lib/auth/auth.ts — after extraction
import { createAuth, type AuthInstance } from '@minion-stack/auth';
import { organization } from 'better-auth/plugins';
import { getDb } from '$server/db/client';
import * as schema from '@minion-stack/db/schema';
import { env } from '$env/dynamic/private';

let _auth: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (!_auth) {
    _auth = createAuth({
      db: getDb(),
      schema,
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL ?? 'http://localhost:5173',
      trustedOrigins: [
        ...(env.VERCEL_URL ? [`https://${env.VERCEL_URL}`] : []),
      ],
      google: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
        : undefined,
      plugins: [organization()],
    });
  }
  return _auth;
}
```

### Anti-Patterns to Avoid

- **Shipping hub service imports from `@minion-stack/auth`:** If the package imports `$server/services/personal-agent.service`, circular dependency + impossible-to-install-in-site. Always accept as callback via `hooks` param.
- **Calling `organization()` inside factory:** Hub needs `organization({ sendInvitationEmail })` and site needs `organization()`. If factory calls `organization()` unconditionally, hub would duplicate the plugin and overwrite the callback.
- **Evaluating `env` at module load inside `@minion-stack/auth`:** The package must never touch `process.env`. All env reading stays in consumers.
- **Drifting JWT issuer/audience between hub and site:** Factory hardcodes `audience: 'openclaw-gateway'` for both — this is the normalization that closes the existing site drift bug.
- **Bundling browser `createAuthClient` into the factory package:** Mixing server+client exports complicates tree-shaking and is not needed (auth-client.ts is 8 lines, app-specific per D-07).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie signing + verification | Custom HMAC/AES wrapper | Better Auth's built-in | Timing attacks, cookie-same-site misconfigs, session replay |
| JWKS key rotation | Custom `jose` helpers | Better Auth `jwt` plugin's JWKS storage in DB | Key rotation + multi-key serving is already solved; JWKS rows in `jwks` table are shared via shared DB |
| OIDC discovery endpoints | Hand-rolled `/.well-known/openid-configuration` | `oidcProvider` plugin | Full spec compliance (claims, PKCE, RP-initiated logout) |
| Cross-subdomain cookie logic | Manual `Set-Cookie` header munging | `advanced.crossSubDomainCookies.{enabled,domain}` in BetterAuthOptions | Domain-attribute rules are subtle |
| Organization / invitation schema | Custom multi-tenant tables | `organization` plugin + existing `@minion-stack/db/schema` tables | Already in shared DB: `organization`, `member`, `invitation` tables |

**Key insight:** Better Auth's value is the plugin ecosystem + DB-first session model. The factory only composes — it does not replace.

---

## Research Question Answers

These answer the 7 specific questions from the phase brief.

### Q1: Better Auth 1.4.19 TypeScript type export patterns for clean factory typing

**Answer:** [VERIFIED: inspected better-auth/dist/index.d.mts and @better-auth/core/dist/types/]

- `BetterAuthOptions` is exported from `'better-auth'` as a `type` — importable directly. Its `plugins` field is typed as `([] | BetterAuthPlugin[]) | undefined`.
- `BetterAuthPlugin` is exported from `'better-auth'` as a `type`.
- `BetterAuthOptions['hooks']` gives the correct type for the hooks param: `{ before?: AuthMiddleware; after?: AuthMiddleware } | undefined`.
- `BetterAuthOptions['plugins']` gives `([] | BetterAuthPlugin[]) | undefined` — use `NonNullable<BetterAuthOptions['plugins']>` or just `BetterAuthPlugin[]` for the factory's `plugins` param.
- `ReturnType<typeof betterAuth>` gives the return type — use as `AuthInstance` alias.
- For `db`, the CONTEXT.md decision is to use `any` to avoid peer dep complexity. The actual type is a Drizzle client instance, but typing it precisely requires importing from `drizzle-orm` which adds a mandatory peer dep at type level.

**Pattern for `CreateAuthParams` signature:**
```typescript
import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth';

export interface CreateAuthParams {
  db: any;
  schema?: Record<string, unknown>;
  secret: string;
  baseURL: string;
  trustedOrigins?: string[];
  google?: { clientId: string; clientSecret: string };
  plugins?: BetterAuthPlugin[];
  hooks?: BetterAuthOptions['hooks'];
}
```

### Q2: Correct peerDependency setup for @minion-stack/auth

**Answer:** [VERIFIED: inspected existing packages, npm registry, hub/site package.json]

```jsonc
// packages/auth/package.json
{
  "peerDependencies": {
    "better-auth": "1.4.19",
    "drizzle-orm": ">=0.45.0"
  },
  "devDependencies": {
    "@minion-stack/db": "workspace:*",
    "@minion-stack/tsconfig": "workspace:*",
    "better-auth": "1.4.19",
    "drizzle-orm": "^0.45.1",
    "typescript": "^5.0.0"
  }
}
```

**Rationale for `"better-auth": "1.4.19"` exact pin (not range):** The project is pinned at 1.4.19 in both hub and site. Using `>=1.4.19` would allow accidental upgrades to 1.5.x or 1.6.x (which have breaking session changes). An exact pin forces consumers to explicitly update when ready. This mirrors the project's intentional pinning.

`@minion-stack/db` is NOT a peerDependency of `@minion-stack/auth` — the factory imports the schema directly in its source (`import * as schema from '@minion-stack/db/schema'`). This means `@minion-stack/db` is a regular `devDependency` for the build and will be bundled into the type output. The consuming app already has `@minion-stack/db` installed independently.

Wait — if `@minion-stack/db` is imported inside `factory.ts`, consumers need `@minion-stack/db` too to satisfy the type resolution. But since schema can be passed by the caller (the `schema?: Record<string, unknown>` param), the factory doesn't necessarily need to bundle `@minion-stack/db`. The design decision: **factory does NOT import schema internally**. The caller always passes `schema`. This keeps `@minion-stack/auth` decoupled from `@minion-stack/db`'s internal structure.

**Revised peerDeps (no `@minion-stack/db`):**
```jsonc
{
  "peerDependencies": {
    "better-auth": "1.4.19",
    "drizzle-orm": ">=0.45.0"
  }
}
```

### Q3: JWT plugin JWKS key storage between restarts and cross-app distribution

**Answer:** [VERIFIED: better-auth/dist/plugins/jwt/schema.d.mts and index.d.mts]

The JWT plugin stores JWKS keypairs in a DB table `jwks` with fields `publicKey`, `privateKey`, `createdAt`, `expiresAt`. This table already exists in `@minion-stack/db/schema/auth/index.ts`.

**Key facts:**
- Keys are persistent in the DB, not ephemeral in memory. They survive process restarts.
- Both hub and site point to the same Turso DB → they already share the same `jwks` rows.
- A JWT minted by hub (using its JWKS key) can be verified by site via the same JWKS endpoint, because the `publicKey` field is shared in the same DB row.
- The `/.well-known/jwks.json` endpoint (or `/api/auth/jwks`) will return the same public keys from both apps since they read the same DB.
- The EdDSA `keyPairConfig` (`alg: 'EdDSA'`) is correct and used by hub today.
- **No keystore migration needed** — the table is already shared.

**Gotcha with distributing jwt plugin across two apps sharing a DB:** Both apps will attempt to generate a keypair on first init if the `jwks` table is empty. If both apps start simultaneously against an empty table, there may be a race — both insert a key. Better Auth handles this gracefully (multiple valid keys in `jwks` are normal for key rotation support). Once keys exist, subsequent inits read the existing key. No special config needed.

**Private key encryption:** The JWT plugin defaults to encrypting private keys at rest in the DB using the `BETTER_AUTH_SECRET`. Both apps using the same secret can decrypt each other's private keys — this is by design for shared-secret deployments.

### Q4: Session cookie domain/SameSite issues between hub and site on different Vercel domains

**Answer:** [VERIFIED: @better-auth/core/dist/types/init-options.d.mts lines 169-194]

Better Auth exposes `advanced.crossSubDomainCookies`:
```typescript
crossSubDomainCookies?: {
  enabled: boolean;
  additionalCookies?: string[];
  domain?: string; // defaults to root domain from baseURL if not set
}
```

**Scenarios:**

1. **Hub and site on different Vercel preview URLs** (e.g., `hub-xxx.vercel.app` + `site-xxx.vercel.app`): These are different domains entirely — cross-subdomain cookie sharing CANNOT work. The `better-auth.session_token` cookie set by hub will not be sent to site's domain. AUTH-04 would require either a token-handoff mechanism or testing under a custom shared domain.

2. **Hub and site on the same apex domain** (e.g., `hub.minion.pe` + `site.minion.pe`): This is the expected production topology. Configure `crossSubDomainCookies: { enabled: true, domain: 'minion.pe' }` in both apps. The session cookie will be scoped to `.minion.pe` and shared between subdomains.

3. **Hub and site at same URL with path prefixes** (same host): Would work without any cookie config changes, but this is not the Vercel topology.

**Factory design:** The `CreateAuthParams` does NOT include a `crossSubDomainCookies` param (per D-04 and the CONTEXT.md deferred list: "cross-subdomain cookie configuration for AUTH-04 staging is a deployment concern, not a package-shape concern"). Consumers can extend the return by wrapping, or the factory could accept an `advanced` passthrough. Since CONTEXT.md defers this, the AUTH-04 staging plan must address it manually.

**For AUTH-04:** The staging test must be run under a custom domain with shared apex (not Vercel preview URLs). The plan should include `crossSubDomainCookies` config as a staging-environment env var or explicit factory param, OR clarify that the test is done via API (curl with cookie jar) not browser.

### Q5: "Shared session continuity" — operational meaning

**Answer:** [VERIFIED: source inspection of Better Auth session model]

Better Auth stores sessions as rows in the `session` table (id, token, userId, expiresAt, ipAddress, userAgent, activeOrganizationId). The `session_token` cookie contains the session token (a random string), which is used to look up the row.

**What "shared session continuity" means:**

- When a user logs into hub, Better Auth creates a `session` row in the shared Turso DB and sets a `better-auth.session_token` cookie with the token value.
- If that same cookie (with the same token value) is sent to site's `/api/auth/*`, Better Auth on site will look up the same row in the same DB and find it valid.
- This means: a user with a hub session cookie visiting site will be **automatically authenticated** on site — no re-login required — IF the browser sends the cookie to site's domain.

**This is NOT OIDC-based SSO.** It is simpler: both apps share the same session table. The session cookie is the only artifact needed.

**Preconditions for this to work:**
1. Same `BETTER_AUTH_SECRET` (for cookie HMAC signing) — [VERIFIED: both pull from Infisical `minion-hub`]
2. Same DB (for session row lookup) — [VERIFIED: shared Turso DB]
3. Browser sends the cookie to site's domain — requires either same-origin or configured cross-subdomain cookies

**Re-authenticating on site:** If the cookie is NOT shared (different domain), the user must sign in on site. But they won't have to provide a new password — they can reuse their existing credentials. Better Auth will create a NEW session row for site (linked to the same `user` row). This is separate sessions, not shared sessions.

### Q6: oidcProvider plugin and the factory design — does it need to be the SAME instance?

**Answer:** [VERIFIED: OIDC plugin schema inspection + hub hooks.server.ts]

The `oidcProvider` plugin manages state in three DB tables: `oauth_application`, `oauth_access_token`, `oauth_consent`. All three exist in `@minion-stack/db/schema/auth/index.ts`.

**Key finding:** The OIDC provider is currently hub-only. Site has never included `oidcProvider`. This means:
- OIDC flows (authorization code, token exchange) only go through hub's `/api/auth/oauth2/*` endpoints.
- Site does not participate in OIDC.
- If a third-party service (e.g., paperclip) uses the gateway's OIDC flow, it connects to hub, not site.
- Token validation (via JWKS) works cross-app because the JWKS keys are in the shared DB.

**For the factory design:** The D-02 revised decision (callers pass `oidcProvider()` via `plugins` param) is correct. Site does not pass it, hub does. There is no "SAME instance" requirement — the OIDC state lives in DB tables, not in-process memory. Multiple hub replicas could run simultaneously (e.g., Vercel edge functions) and share OIDC state via the shared DB.

**The hub OIDC proxy in hooks.server.ts:** Hub's `hooks.server.ts` proxies `/.well-known/openid-configuration` to `/api/auth/.well-known/openid-configuration`. This is hub-local and must be preserved. It does NOT change during Phase 6.

### Q7: Build tooling — tsc vs tsdown, exports map

**Answer:** [VERIFIED: packages/db/package.json, packages/db/tsconfig.json, packages/db/dist/]

The packages/db package uses plain `tsc` (not tsdown) with `"scripts": { "build": "tsc", "prepublishOnly": "tsc" }`. The tsconfig extends `@minion-stack/tsconfig/library.json` which sets `declaration: true`, `declarationMap: true`, `sourceMap: true`, `composite: true`.

**For @minion-stack/auth:** Use the same approach. The package has a single entry point (`src/index.ts`), so a simple exports map suffices:

```jsonc
{
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

No need for sub-path exports (unlike packages/db which exports `./schema`, `./auth`, `./relations`). The auth package has exactly one export: `createAuth` and its types.

**Why not tsdown?** packages/db used plain tsc successfully. The auth factory is simpler (no sub-schemas). tsdown adds build complexity without benefit for a simple ESM package. [VERIFIED: consistent with project pattern]

---

## Common Pitfalls

### Pitfall 1: Lazy-eval singleton lost in refactor
**What goes wrong:** Developer "simplifies" hub's lazy `let _auth = null; if (!_auth) _auth = createAuth(...)` into `export const auth = createAuth({...})` at module scope.
**Why it happens:** Factory pattern suggests eager instantiation is fine. It's not.
**How to avoid:** `@minion-stack/auth` exports a factory (pure function). Each consumer must keep its lazy memoization. SvelteKit's `$env/dynamic/private` throws at build time if evaluated at module load.
**Warning signs:** Build fails with `Cannot find module '$env/dynamic/private'` during `vite build`, or `env.BETTER_AUTH_SECRET is undefined`.

### Pitfall 2: JWT audience drift breaks gateway auth
**What goes wrong:** Site's current `jwt()` call has no custom audience; hub's has `audience: 'openclaw-gateway'`. A JWT minted from a site session would not validate for gateway calls.
**Why it happens:** Existing site config is simpler — developer might carry the simplification forward.
**How to avoid:** Factory hardcodes `audience: 'openclaw-gateway'` — this is the fix. Both consumers call the same factory, getting the same JWT config. No per-consumer drift possible.
**Warning signs:** Gateway rejects JWTs with "invalid audience" for site-authenticated users.

### Pitfall 3: organization() duplicate registration
**What goes wrong:** If factory calls `organization()` internally AND the caller also passes `organization({...})` via `plugins`, Better Auth may register the plugin twice (behavior: last one wins or error).
**Why it happens:** Early design (D-02 original) included `organization` in the factory's always-on plugins set.
**How to avoid:** D-02 revised resolves this — factory does NOT call `organization()`. Callers always pass it. Factory only hardcodes `jwt(fullConfig)`.
**Warning signs:** Organization-related API routes return 404 (plugin not found), or organization callbacks fire twice.

### Pitfall 4: Cross-subdomain cookies not configured for AUTH-04
**What goes wrong:** Hub at `hub.minion.pe` logs a user in. User navigates to `site.minion.pe`. Site has no session — cookie scoped to `hub.minion.pe`.
**Why it happens:** Better Auth default cookie domain is host-only. Cross-subdomain requires explicit `advanced.crossSubDomainCookies`.
**How to avoid:** AUTH-04 staging plan must either (a) configure `crossSubDomainCookies` in both apps, or (b) test session sharing via API (curl with manual cookie forwarding, not browser). If staging uses Vercel preview URLs (different domains), (b) is the only option.
**Warning signs:** AUTH-04 staging test fails — hub login, site shows "not logged in".

### Pitfall 5: Hub schema import not updated
**What goes wrong:** Hub auth.ts still imports `schema` from `$server/db/schema` (local barrel) instead of `@minion-stack/db/schema`. After Phase 6, this is a missed fix.
**Why it happens:** Phase 5 (05-03) updated 56 import sites but auth.ts's schema import goes to `drizzleAdapter`, not to drizzle query API. The SUMMARY explicitly notes it was missed.
**How to avoid:** Phase 6 hub consumer plan must include this schema import fix. It's a 1-line change: `import * as schema from '$server/db/schema'` → `import * as schema from '@minion-stack/db/schema'`.
**Warning signs:** Hub auth.ts still shows `$server/db/schema` after Phase 6 execution — grep check required.

### Pitfall 6: OIDC discovery 404s after extraction
**What goes wrong:** Hub's `hooks.server.ts` proxies `/.well-known/openid-configuration` to `/api/auth/.well-known/openid-configuration`. After extraction, if developer assumes the plugin handles the well-known URL directly, removing or bypassing this proxy would break OIDC discovery.
**Why it happens:** The `oidcProvider` plugin mounts at `/api/auth/*`, not at `/.well-known/*`. Hub manually proxies.
**How to avoid:** Do not touch hub's `hooks.server.ts` OIDC proxy logic during extraction. Only change the `auth.ts` file.
**Warning signs:** `GET /.well-known/openid-configuration` returns 404.

### Pitfall 7: `@minion-stack/auth` accidentally imports `@minion-stack/db` schema
**What goes wrong:** If factory imports `* as schema from '@minion-stack/db/schema'` internally, then `@minion-stack/auth`'s types reference `@minion-stack/db` internals. Consumer apps must have `@minion-stack/db` installed to satisfy types, AND schema changes in `@minion-stack/db` may break type-level compatibility with `@minion-stack/auth`.
**How to avoid:** Per D-02, the `schema` param is passed by callers. Factory receives `schema?: Record<string, unknown>`. This decouples the two packages. If a default schema is provided, use `@minion-stack/db` in devDependencies only — but to avoid the type coupling, it's cleaner to always require callers to pass the schema.

---

## Code Examples

### Example 1: package.json template for @minion-stack/auth

```jsonc
// Source: packages/db/package.json pattern [VERIFIED]
{
  "name": "@minion-stack/auth",
  "version": "0.1.0",
  "description": "Better Auth createAuth() factory for the Minion platform — shared between hub and site.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/NikolasP98/minion-meta.git",
    "directory": "packages/auth"
  },
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "publishConfig": { "access": "public" },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "tsc"
  },
  "peerDependencies": {
    "better-auth": "1.4.19",
    "drizzle-orm": ">=0.45.0"
  },
  "devDependencies": {
    "@minion-stack/tsconfig": "workspace:*",
    "better-auth": "1.4.19",
    "drizzle-orm": "^0.45.1",
    "typescript": "^5.0.0"
  }
}
```

### Example 2: BetterAuthOptions type imports (verified from source)

```typescript
// Source: better-auth/dist/index.d.mts + @better-auth/core/dist/types/plugin.d.mts [VERIFIED]
import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
// hooks type: BetterAuthOptions['hooks'] = { before?: AuthMiddleware; after?: AuthMiddleware } | undefined
// plugins type: BetterAuthOptions['plugins'] = ([] | BetterAuthPlugin[]) | undefined
// For factory params: use BetterAuthPlugin[] (the non-nullable extracted form)
```

### Example 3: JWKS table — already in @minion-stack/db

```typescript
// Source: packages/db/src/schema/auth/index.ts [VERIFIED]
export const jwks = sqliteTable('jwks', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  // expiresAt is optional in the Better Auth plugin schema — not in our table
  // Keys persist in DB, are shared across both apps via shared Turso DB
});
```

### Example 4: Cross-subdomain cookie configuration (for AUTH-04)

```typescript
// Source: @better-auth/core/dist/types/init-options.d.mts lines 169-187 [VERIFIED]
// Note: this is NOT in the factory (D-04, deferred), but AUTH-04 staging plan needs it
betterAuth({
  // ...
  advanced: {
    useSecureCookies: true,
    crossSubDomainCookies: {
      enabled: true,
      domain: 'minion.pe', // narrowest shared apex — NOT '.com'
    },
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-app inlined `betterAuth({...})` config | Shared `createAuth()` factory | This phase | JWT audience drift bug fixed; config drift eliminated |
| Hub schema from `$server/db/schema` (local) | `@minion-stack/db/schema` | Phase 5 (missed in auth.ts) — **fix in Phase 6** | Single source of truth for schema in all files |
| `@minion/auth` (ROADMAP.md reference) | `@minion-stack/auth` | Phase 2 scope pivot | Package name corrected |
| `better-auth@1.4.x` (current) | `better-auth@1.5.x` / `1.6.x` | Deferred | Post-extraction upgrade; `1.6.0` has `freshAge` breaking change |
| Site `jwt()` with no config | `jwt({ issuer, audience, expirationTime })` | This phase (via factory normalization) | JWT audience parity achieved — site users can use gateway |

**Deprecated/outdated:**
- ROADMAP.md reference to `@minion/auth` — treat as `@minion-stack/auth`
- Site auth.ts's `jwt()` call with no config — factory replaces with normalized config

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `BETTER_AUTH_SECRET` is identical between hub and site in production (both Infisical `minion-hub`) | Runtime State | **HIGH** — if different secrets, sessions are not cross-valid and AUTH-04 cannot pass without a secret-sync step |
| A2 | Staging AUTH-04 test will be performed under a shared-apex custom domain (not Vercel preview URLs) | Common Pitfalls / Q4 | **HIGH** — if Vercel preview URLs, browser-based cross-domain session sharing is impossible; switch to curl-based API test |
| A3 | Hub and site are deployed at subdomains of a shared apex (e.g., hub.minion.pe + site.minion.pe) in production | Architecture | MEDIUM — if fully different domains (different registrars), AUTH-04 requires a token-handoff mechanism |
| A4 | `@minion-stack/auth` does NOT ship a browser `createAuthClient` helper | Architecture | LOW — easy to add post-extraction if needed |
| A5 | Hub's desktop-mode session-persistence (`src/server/auth/desktop-session.ts`) stays in hub | Deferred | LOW — it's clearly hub-specific (Electrobun/CEF workaround) |
| A6 | The hub's manual JWT-minting in `gateway-jwt.service.ts` stays in hub | Deferred | LOW — uses `jose` directly against shared `jwks` table; no change needed |
| A7 | Factory does NOT need an `advanced` passthrough param (crossSubDomainCookies deferred per CONTEXT.md) | Q4 | LOW — can add later; AUTH-04 can use API-based session test if needed |
| A8 | Phase 5 PRs #17 (hub) and #18 (migration removal) will merge before hub consumer work begins | D-09 | MEDIUM — if PRs stall, Wave 2 hub consumer work blocks; plan should note this gate |

---

## Open Questions (RESOLVED)

1. **Will AUTH-04 staging test be browser-based or API-based?** (RESOLVED)
   - What we know: Cross-subdomain cookie sharing requires a shared apex domain; Vercel preview URLs are different domains entirely
   - What's unclear: Whether staging infra for this phase will use a custom domain or Vercel preview URLs
   - Recommendation: AUTH-04 plan should include both options with explicit branch: (a) custom domain — configure `crossSubDomainCookies`; (b) Vercel preview — test via curl with cookie jar
   - **Resolution:** Plan 06-04 Task 2 documents both paths; defaults to curl-based cookie jar test for Vercel preview URL environments.

2. **Is `BETTER_AUTH_SECRET` confirmed to be shared between hub and site in production?** (RESOLVED)
   - What we know: Both apps pull from Infisical `minion-hub` project
   - What's unclear: Whether the secret is in `minion-hub` or `minion-core` (earlier in env hierarchy)
   - Recommendation: AUTH-04 pre-flight gate: `infisical secrets list --projectId minion-core | grep BETTER_AUTH_SECRET` + same for `minion-hub`
   - **Resolution:** Plan 06-04 Task 1 includes Infisical verification as a blocking pre-flight gate before staging deploy.

3. **Does hub's organization invitation email callback need to be type-safe in the factory?** (RESOLVED)
   - What we know: Hub passes `sendInvitationEmail` callback with specific arg shape (`data.email`, `data.inviter.user.name`, `data.organization.name`, `data.role`, `data.id`)
   - What's unclear: Whether to export the `InvitationEmailPayload` type or let callers use the organization plugin's own type
   - Recommendation: Export nothing extra — hub can import `OrganizationOptions` from `better-auth/plugins` directly for the callback type
   - **Resolution:** Plan 06-02 implements hub consumer without extra exported types; hub imports organization callback type from `better-auth/plugins` directly.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build / tsc | ✓ | 22+ | — |
| pnpm | Meta-repo workspace (`packages/auth`) | ✓ | 10.x | — |
| bun | Hub + site runtime (consumer apps) | ✓ | installed | — |
| TypeScript | `tsc` build | ✓ | 5.x | — |
| Changesets CLI | Publishing | ✓ | configured at root | — |
| `better-auth@1.4.19` | Factory runtime | ✓ | 1.4.19 in hub+site node_modules | — |
| npm registry 2FA | Publishing `@minion-stack/auth@0.1.0` | human-in-loop | — | Wave 1 checkpoint (same as db@0.1.0 publish) |
| Turso DB (staging) | AUTH-04 dry-run | ? | — | Use local SQLite; mirror Phase 5's staging pattern |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (already in packages/cli, packages/env) |
| Config file | none in packages/db; packages/auth will also need none (vitest detects `test` files automatically with `vitest run`) |
| Quick run command | `cd packages/auth && pnpm test` |
| Full suite command | `pnpm -w test` or sequential: `packages/auth test` + `hub check` + `site check` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `createAuth()` returns an object with `.handler` and `.api.getSession` | unit | `pnpm -F @minion-stack/auth test` | ❌ Wave 0 |
| AUTH-01 | Factory always includes jwt plugin with correct issuer/audience | unit | `pnpm -F @minion-stack/auth test` | ❌ Wave 0 |
| AUTH-01 | Factory includes only plugins passed in `plugins` param (not `organization` by default) | unit | `pnpm -F @minion-stack/auth test` | ❌ Wave 0 |
| AUTH-02 | Package builds cleanly with `tsc` | build | `cd packages/auth && pnpm build` | — (Wave 1) |
| AUTH-02 | `@minion-stack/auth@0.1.0` visible on npm | manual | `npm view @minion-stack/auth version` | N/A human |
| AUTH-03 | `bun run check` passes in hub after migration | smoke | `cd minion_hub && bun run check` | ✅ |
| AUTH-03 | `bun run check` passes in site after migration | smoke | `cd minion_site && bun run check` | ✅ |
| AUTH-03 | Hub `getAuth()` returns instance with handler (runtime smoke) | integration | `cd minion_hub && bun run test` | ❌ Wave 0 |
| AUTH-04 | Login on hub → session row in DB | manual/staging | staging smoke test | N/A |
| AUTH-04 | Hub session cookie accepted by site (curl test) | manual/staging | `curl -b hub-cookies.txt $SITE_URL/api/auth/session` | N/A |

### Sampling Rate
- **Per task commit:** `pnpm -F @minion-stack/auth build` (after scaffold); `bun run check` in hub/site (after consumer update)
- **Per wave merge:** full suite above
- **Phase gate:** AUTH-04 staging manual smoke passing before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/auth/src/index.test.ts` — factory smoke: returns handler, jwt plugin present in returned config
- [ ] `packages/auth/package.json` — `"test": "vitest run"` + `"vitest": "^2.1.9"` in devDependencies
- [ ] No site vitest needed — `bun run check` is sufficient for type-level verification

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Better Auth built-in (scrypt passwords, session management, Google OAuth via `socialProviders`) |
| V3 Session Management | yes | Better Auth session cookies + DB row; `BETTER_AUTH_SECRET` for signing; `useSecureCookies` auto from baseURL |
| V4 Access Control | yes | `organization` plugin for multi-tenant member/invitation model |
| V5 Input Validation | yes | Better Auth validates email/password inputs; callers should not parse auth bodies themselves |
| V6 Cryptography | yes | Better Auth JWKS (EdDSA keypair stored in DB); private key encrypted with `BETTER_AUTH_SECRET`; hub's token-at-rest AES-256-GCM stays in hub |
| V14 Configuration | yes | `BETTER_AUTH_SECRET` managed via Infisical `minion-core`; `@minion-stack/auth` never reads process.env |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret mismatch → forced logout at scale | DoS | Secret from Infisical `minion-core`, identical for hub + site; verify pre-cutover |
| JWT audience mismatch → gateway rejects site users | Spoofing / DoS | Factory hardcodes `audience: 'openclaw-gateway'` — both apps get same audience |
| Cookie scope too broad → cross-app session bleed | Elevation of Privilege | `crossSubDomainCookies.domain` set to narrowest shared root when configured |
| CSRF on `/api/auth/*` | Tampering | `trustedOrigins` enforced by Better Auth; factory builds trusted origins list correctly |
| Session hijacking via non-HTTPS cookie in prod | Information Disclosure | `useSecureCookies: baseURL.startsWith('https://')` — automatic in factory (D-04) |
| OIDC discovery spoof | Spoofing | `oidcProvider` hub-only; site has no OIDC endpoints to attack |
| Leaked `BETTER_AUTH_SECRET` in logs | Information Disclosure | `@minion-stack/auth` never logs opts; secret passed as param, not read from env |

### Pre-Cutover Security Gates (AUTH-04)

1. **Secret parity:** confirm `BETTER_AUTH_SECRET` is the SAME value in both hub and site via Infisical dashboard or `infisical secrets list`
2. **Google OAuth redirect parity:** Google Cloud Console must include `https://<hub>/api/auth/callback/google` AND `https://<site>/api/auth/callback/google`
3. **Cookie scope:** if using `crossSubDomainCookies`, verify `domain` matches the deployed apex and does not include untrusted subdomains
4. **JWKS cross-validation smoke:** after deploy, mint a token via hub's `/api/auth/token` and validate it via site's `/api/auth/jwks` endpoint (or via direct jose verification)

---

## Project Constraints (from CLAUDE.md)

**Root CLAUDE.md:**
- Package scope is `@minion-stack/*` — locked, applies to this phase
- Subprojects use their own package managers: hub + site use `bun`; meta-repo packages use `pnpm`
- Cross-project auth changes affect both hub and site — both are Phase 6 targets
- Never commit directly to main/master; use feature branches → dev

**minion_hub/CLAUDE.md:**
- Better Auth uses **scrypt** for passwords (not argon2). Factory must not override hash algorithm.
- Dev auth bypass (`AUTH_DISABLED=true`) stays in hub `hooks.server.ts`, NOT in the factory.
- Drizzle relations referencing non-existent columns fail silently at compile time — use `import * as schema` (not column picks) in factory. [VERIFIED: hub CLAUDE.md auth section]
- Feature branch → `dev` → `master` workflow

**minion_site/CLAUDE.md:**
- Svelte 5 runes + snippets + `onclick={}` syntax only (applies to any .svelte file edits)
- `@minion-stack/db` already consumed — prerequisite satisfied
- Server-side auth in `lib/auth/`; client in `lib/auth/auth-client.ts`

---

## Sources

### Primary (HIGH confidence)
- `/home/nikolas/Documents/CODE/AI/minion_hub/src/lib/auth/auth.ts` — hub auth config (102 lines inventoried)
- `/home/nikolas/Documents/CODE/AI/minion_site/src/lib/auth/auth.ts` — site auth config (36 lines inventoried)
- `/home/nikolas/Documents/CODE/AI/minion_hub/node_modules/better-auth/dist/index.d.mts` — verified exported types
- `/home/nikolas/Documents/CODE/AI/minion_hub/node_modules/@better-auth/core/dist/types/init-options.d.mts` — BetterAuthOptions type definition (1270+ lines inspected)
- `/home/nikolas/Documents/CODE/AI/minion_hub/node_modules/@better-auth/core/dist/types/plugin.d.mts` — BetterAuthPlugin type definition
- `/home/nikolas/Documents/CODE/AI/minion_hub/node_modules/better-auth/dist/plugins/jwt/schema.d.mts` — jwks DB table schema
- `/home/nikolas/Documents/CODE/AI/minion_hub/node_modules/better-auth/dist/plugins/jwt/index.d.mts` — jwt plugin return type
- `/home/nikolas/Documents/CODE/AI/minion_hub/node_modules/better-auth/dist/plugins/jwt/types.d.mts` — JwtOptions type
- `/home/nikolas/Documents/CODE/AI/minion_hub/node_modules/better-auth/dist/plugins/oidc-provider/schema.d.mts` — OIDC DB tables
- `/home/nikolas/Documents/CODE/AI/minion_hub/node_modules/better-auth/dist/plugins/organization/types.d.mts` — OrganizationOptions.sendInvitationEmail type
- `/home/nikolas/Documents/CODE/AI/packages/db/src/schema/auth/index.ts` — confirmed jwks + OIDC tables exist in shared schema
- `/home/nikolas/Documents/CODE/AI/packages/db/package.json` — package.json template
- `/home/nikolas/Documents/CODE/AI/packages/db/tsconfig.json` — tsconfig template
- `/home/nikolas/Documents/CODE/AI/.planning/phases/06-auth-extraction/06-CONTEXT.md` — locked decisions D-01 through D-10
- `npm view better-auth dist-tags` — confirmed 1.4.19 is `release-1.4` tag, 1.6.6 is `latest` [VERIFIED 2026-04-21]
- `npm view @minion-stack/db version` — confirmed 0.2.0 published [VERIFIED 2026-04-21]

### Secondary (MEDIUM confidence)
- `@better-auth/core/dist/types/init-options.d.mts` lines 169-187 — `crossSubDomainCookies` config shape [VERIFIED directly from node_modules]
- Hub CLAUDE.md — scrypt password note; no argon2 override in factory [CITED]
- Phase 5 05-03-SUMMARY.md — hub schema import fix context; PRs #17/#18 status [CITED]

### Tertiary (LOW confidence)
- Session sharing behavior across two Better Auth instances on a shared DB — inferred from session model (token lookup in DB), not from explicit Better Auth documentation. Behavior is logically sound but not officially documented as a use case.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified from node_modules and npm registry
- Architecture: HIGH — D-02 revised factory API is locked; examples based on real auth.ts files
- Pitfalls: HIGH for pitfalls 1-6 (grounded in codebase inspection); MEDIUM for pitfall 7 (peer dep coupling — design choice)
- Runtime state: HIGH — JWKS table confirmed in @minion-stack/db; all auth tables confirmed
- Security: HIGH for schema-level controls; MEDIUM for deploy-time controls (AUTH-04 topology unconfirmed)
- Q1-Q7 answers: HIGH for TypeScript types and JWKS (inspected source); MEDIUM for cross-domain cookie behavior in AUTH-04 (depends on actual deploy topology)

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable ecosystem; invalidated by Better Auth upgrade or hub/site auth config changes)
