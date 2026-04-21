# Phase 6: Auth Extraction - Research

**Researched:** 2026-04-21
**Domain:** Better Auth factory extraction, Drizzle adapter wiring, shared session continuity across two SvelteKit apps with a shared DB
**Confidence:** HIGH

---

## User Constraints (from CONTEXT.md)

> CONTEXT.md for phase 6 does **not yet exist**. The constraints below are derived from project-wide
> decisions in `.planning/STATE.md`, ROADMAP.md, the roadmap pre-sketched outline, and the
> precedent set by Phase 5 (which locked the `@minion-stack/*` scope). The planner or
> `/gsd-discuss-phase` should confirm these before execution.

### Locked Decisions (derived from project-level decisions)

- **Package scope:** `@minion-stack/auth` — NOT `@minion/auth`. ROADMAP.md Phase 6 and AUTH-02 both say "@minion/auth" but every shipped package uses `@minion-stack/*` (env, cli, tsconfig, lint-config, shared, db). Phase 5 RESEARCH.md explicitly called this a "scope correction" and the same correction applies here. [VERIFIED: codebase grep — 0 `@minion/*` packages exist in `packages/`; 6 `@minion-stack/*` packages exist]
- **Build toolchain:** `tsc` only, mirroring `packages/db` and `packages/shared` (tsconfig extends `@minion-stack/tsconfig/library.json`). [VERIFIED: `/home/nikolas/Documents/CODE/AI/packages/db/tsconfig.json`, `/home/nikolas/Documents/CODE/AI/packages/shared/tsconfig.json`]
- **Publish via Changesets:** initial release `0.1.0`, `publishConfig: { access: "public" }`. [VERIFIED: pattern in every existing `packages/*/package.json`]
- **Consumers:** `minion_hub` (SvelteKit dashboard) and `minion_site` (SvelteKit marketing+members). Both use `bun` and Better Auth 1.4.19 today. [VERIFIED: package.json files]
- **Shared DB:** hub + site already share the same Turso DB via `@minion-stack/db@0.2.0`, which includes the Better Auth schema at `./schema/auth` (user, session, account, verification, oauth*, jwks, organization, member, invitation, team). Session continuity at the row level is already guaranteed by DB sharing. [VERIFIED: `/home/nikolas/Documents/CODE/AI/packages/db/src/schema/auth/index.ts`]
- **Target version:** stay on `better-auth@1.4.19` for this phase. Upgrading to 1.6.x is a separate concern (changelog flags a session `freshAge` breaking change) and should not be bundled with the extraction refactor. [VERIFIED: `npm view better-auth time` — 1.4.19 published 2026-02-23; 1.6.5 published 2026-04-16]

### Claude's Discretion

- Exact factory signature for `createAuth()` — what params are required vs optional, whether the JWT hook (`provisionPersonalAgent`) is passed as a callback or kept hub-local
- Whether `@minion-stack/auth` also exports a `createAuthClient()` helper for the browser, or only the server factory
- Whether the factory takes a drizzle-client instance OR creates one internally from a connection URL (Phase 5 left clients up to consumers — follow that pattern)
- Plugin set strategy: superset-with-feature-flags vs per-consumer-plugins-array
- Whether to write a `README.md` or keep docs to code-level JSDoc (Phase 5 shipped README — follow precedent)

### Deferred Ideas (OUT OF SCOPE)

- Upgrading Better Auth to 1.5.x or 1.6.x — breaking-change-bearing minor bumps; do as a separate phase post-extraction
- Migrating off password-based auth / adding passkeys / adding 2FA — not in AUTH-01..04
- Consolidating the gateway-jwt.service.ts custom JWT signer (uses `jose` directly, not the Better Auth `jwt` plugin's `sign` API) — hub-local, not part of the extraction
- Desktop-mode cookie persistence (`src/server/auth/desktop-session.ts`) — hub-only Electrobun workaround; stays in hub
- Cross-subdomain cookie configuration for `hub.example.com` + `site.example.com` — deployment concern for AUTH-04 staging, not a package-shape concern
- WS client consolidation — Phase 7

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Better Auth config extracted from hub and site into `packages/auth` as `createAuth()` factory | Hub auth.ts (3.3 KB, 8 config keys, 3 plugins) + site auth.ts (1.3 KB, 5 config keys, 2 plugins) inventoried below; factory contract designed |
| AUTH-02 | `@minion-stack/auth` publishes first release | Mirrors `@minion-stack/db@0.1.0` and `@minion-stack/shared@0.1.0` release pattern; Changesets already configured at meta-repo root |
| AUTH-03 | `minion_hub` and `minion_site` consume the factory with identical secret/provider config | 6 files in hub + 4 files in site reference `getAuth()` or `authClient`; known `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` + `GOOGLE_CLIENT_*` contract |
| AUTH-04 | Staging deploy with shared session continuity (login to hub → session on site) | Shared DB already in place; critical gates identified below (identical secret, identical JWT issuer/audience, cookie domain for cross-subdomain) |

---

## Summary

Both `minion_hub` and `minion_site` already ship Better Auth 1.4.19 against the same shared Turso database. The auth schema lives in `@minion-stack/db` at the `./auth` export path (published in Phase 5). Hub runs a **superset** config (jwt + oidcProvider + organization plugins + email+Google providers + a `createAuthMiddleware` hook that provisions a personal agent on signup). Site runs a **subset** of that config (jwt + organization, email+Google, no OIDC, no signup hook). Both point to identical envs (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `VITE_BETTER_AUTH_URL`).

The extraction needs to collapse hub.auth.ts + site.auth.ts into one `createAuth()` factory that accepts the drizzle client, the env, and — critically — a set of feature flags or callback hooks so that hub can opt into the OIDC plugin and the signup-time `provisionPersonalAgent` hook while site opts out. A naive "same plugins for both" approach would (a) force site to ship OIDC routes it doesn't need, and (b) force `@minion-stack/auth` to import hub-specific services like `$server/services/personal-agent.service`, which would turn `@minion-stack/auth` into a fat runtime dependency with a reverse import into hub — unacceptable.

Session continuity (AUTH-04) is the hard constraint. Better Auth's session cookies are signed with `BETTER_AUTH_SECRET`. Two apps sharing the same DB + same secret will **produce mutually-recognizable session rows** — but the browser will only send the cookie to each app if (i) the apps are served from the same domain (same-origin), or (ii) cross-subdomain cookie sharing is explicitly configured via `advanced.crossSubDomainCookies.{enabled,domain}`. This is a production-deployment concern, not a package-shape concern, but the factory must expose the `advanced` knob so the staging deploy can turn it on. The JWT plugin's `issuer`, `audience`, and JWKS-key storage must also be identical — JWKS is stored in the DB and is already shared.

**Primary recommendation:** Ship `@minion-stack/auth@0.1.0` exporting a single `createAuth({ db, env, features })` factory where `features` is an object with booleans/callbacks for the hub-specific opt-ins (`oidc: boolean`, `onSignUp?: (session) => Promise<void>`, `invitationEmail?: (data) => Promise<void>`). Keep the client-side `createAuthClient` wiring in the consuming app (it's trivial — 4 lines — and depends on plugin selection, which is naturally app-scoped). Replicate the Phase 5 cutover pattern: parallel-subagent migration PRs on hub and site, staging dry-run, then production deploy.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | `1.4.19` | Auth server (sessions, providers, plugins, OIDC) | Already installed in both hub and site; do NOT bump during extraction [VERIFIED: hub + site package.json] |
| `better-auth/adapters/drizzle` | (bundled) | Drizzle adapter wiring to SQLite/LibSQL | Same adapter both apps already use [VERIFIED: hub + site auth.ts] |
| `better-auth/plugins` | (bundled) | `jwt`, `oidcProvider`, `organization` | Existing plugin selection in hub + site [VERIFIED: codebase grep] |
| `better-auth/api` | (bundled) | `createAuthMiddleware` for signup hook | Used by hub for `provisionPersonalAgent` hook [VERIFIED: hub auth.ts L6] |
| `@minion-stack/db` | `^0.2.0` | Schema + Drizzle client types | Peer dep; do not bundle schema [VERIFIED: already consumed by hub + site] |
| `@minion-stack/tsconfig` | `workspace:*` | Shared TS build config | Extended by every existing package [VERIFIED: packages/*/tsconfig.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tsc` build | `tsup` / `tsdown` | Existing packages use plain `tsc` for consistency — don't introduce a new builder mid-phase |
| Superset factory with `features` flags | Two exported factories (`createHubAuth`, `createSiteAuth`) | Worse: pushes hub-specific plugin imports into the site bundle and vice versa; duplicates the baseline config |
| Factory takes connection URL | Factory takes drizzle client | Consumers already own `getDb()`; reusing it avoids duplicate client instantiation and lets each app pick libsql vs Turso flavour without changes to `@minion-stack/auth` |
| Upgrade to `better-auth@1.6.5` during extraction | Stay on 1.4.19 | 1.6 has a `freshAge` breaking change; bundling an upgrade with a refactor makes rollback harder — defer |

**Installation:**
```bash
# In packages/auth/
pnpm add -D @minion-stack/tsconfig typescript
pnpm add better-auth@1.4.19
pnpm add -D @minion-stack/db drizzle-orm # peer deps for types
```

**Version verification (2026-04-21):**
```bash
npm view better-auth version        # => 1.6.5 (latest)
npm view better-auth@1.4.19 version # => 1.4.19 (published 2026-02-23)
```
[VERIFIED: `npm view better-auth time --json` returned 1.4.19: "2026-02-23T15:43:49.316Z"]

---

## Current State Inventory (VERIFIED: codebase read)

### Hub auth config (`minion_hub/src/lib/auth/auth.ts` — 102 lines)

**Imports:**
- `betterAuth`, `drizzleAdapter`, `jwt`, `oidcProvider`, `organization`, `createAuthMiddleware`
- `getDb()` from `$server/db/client`
- `schema` from `$server/db/schema` (still a local barrel — per ADOPT-02 hub imports DB from `@minion-stack/db` but keeps re-export stubs)
- `env` from `$env/dynamic/private`
- `sendInvitationEmail` from `$server/services/email.service` — **hub-specific**
- `provisionPersonalAgent` from `$server/services/personal-agent.service` — **hub-specific**

**Config keys:**
- `database: drizzleAdapter(getDb(), { provider: 'sqlite', schema })`
- `secret: env.BETTER_AUTH_SECRET`
- `baseURL: env.BETTER_AUTH_URL ?? 'http://localhost:5173'`
- `advanced.useSecureCookies: hubUrl.startsWith('https://')` — desktop-mode CEF-incognito workaround
- `trustedOrigins: [localhost:5173, localhost:5174, localhost:4173, BETTER_AUTH_URL, VERCEL_URL]`
- `emailAndPassword.enabled: true`
- `accountLinking.enabled: true, trustedProviders: ['google']`
- `socialProviders.google: { clientId, clientSecret }` when envs present
- Plugins: `jwt({ jwt: { issuer: hubUrl, audience: 'openclaw-gateway', expirationTime: '1h' }, jwks: { keyPairConfig: { alg: 'EdDSA' } } })`, `oidcProvider({ loginPage: '/login' })`, `organization({ sendInvitationEmail })`
- `hooks.after: createAuthMiddleware` — on `/sign-up`, calls `provisionPersonalAgent(tenantCtx, { userId, email, serverId: '' })`

**Singleton pattern:** lazy `let _auth: ReturnType<typeof betterAuth> | null = null; export function getAuth() { if (!_auth) _auth = betterAuth({...}); return _auth; }` — avoids evaluating `env` at module load, which is critical for SvelteKit SSR/build.

### Site auth config (`minion_site/src/lib/auth/auth.ts` — 36 lines)

**Imports:**
- `betterAuth`, `drizzleAdapter`, `jwt`, `organization` (no `oidcProvider`, no `createAuthMiddleware`)
- `getDb()` from `$server/db/client`
- `schema` from `@minion-stack/db/schema` — already migrated to the shared package
- `env` from `$env/dynamic/private`
- No service-layer imports

**Config keys:**
- `database: drizzleAdapter(getDb(), { provider: 'sqlite', schema })`
- `secret: env.BETTER_AUTH_SECRET`
- `baseURL: env.BETTER_AUTH_URL ?? 'http://localhost:5173'`
- `trustedOrigins: [...same list as hub...]`
- `emailAndPassword.enabled: true`
- `socialProviders.google: { clientId, clientSecret }` when envs present
- Plugins: `jwt()` (no custom issuer/audience — **drift from hub, will break JWT-based session continuity**), `organization()` (no invitation-email callback)
- No `hooks`, no `advanced`, no `accountLinking`

### Auth-client configs

Hub `auth-client.ts` (8 lines) and site `auth-client.ts` (8 lines) are **identical**:
```typescript
import { createAuthClient } from 'better-auth/svelte';
import { jwtClient, organizationClient } from 'better-auth/client/plugins';
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
  plugins: [jwtClient(), organizationClient()],
});
```

### Consumers (files that will need updating in hub + site)

**Hub (6 files consume auth):**
1. `src/hooks.server.ts` — `import { getAuth } from '$lib/auth/auth'`; three call sites (`handler(request)`, `handler(new Request(oidcUrl, request))`, `api.getSession`)
2. `src/lib/auth/auth-client.ts` — `authClient` browser instance
3. `src/routes/login/+page.svelte` — `authClient.signIn.email`, `authClient.signIn.social`, `authClient.organization.list/setActive`
4. `src/routes/auth/google-callback/+page.svelte` — `authClient.organization.list/setActive`
5. `src/routes/invite/accept/+page.svelte` — `authClient.getSession`, `organization.acceptInvitation`, `signUp.email`
6. `src/lib/components/users/TeamTab.svelte` — `authClient.organization.*`
7. `src/lib/state/features/user.svelte.ts` — `authClient` session state
8. `src/server/services/user.service.ts` — server-side auth usage
9. `src/server/services/gateway-jwt.service.ts` — uses `jwks` table directly (not via `getAuth()`); signs with `jose` manually. No change needed for this phase.

**Site (4 files consume auth):**
1. `src/hooks.server.ts` — `import { getAuth } from '$lib/auth/auth'`
2. `src/lib/auth/auth-client.ts` — `authClient` browser instance
3. `src/routes/(app)/login/+page.svelte` — `authClient.signIn.email`, `authClient.signIn.social`
4. `src/routes/(app)/register/+page.svelte` — `authClient.signUp.email`, `authClient.signIn.social`
5. `src/lib/components/members/AppBar.svelte` — `authClient` session state

### Env contract (consistent across both apps)

Both `.env.example` files define:
- `BETTER_AUTH_SECRET` (Infisical `minion-core` — **must be identical** between hub + site)
- `BETTER_AUTH_URL` (per-app: hub e.g. `https://hub.minion.example.com`, site e.g. `https://site.minion.example.com`)
- `VITE_BETTER_AUTH_URL` (client-side mirror of BETTER_AUTH_URL)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Infisical `minion-core` — shared OAuth app)
- `AUTH_DISABLED` (hub only — dev-time bypass)
- `VERCEL_URL` (auto-injected by Vercel)

[VERIFIED: `/home/nikolas/Documents/CODE/AI/minion_hub/.env.example` L24-35 and `/home/nikolas/Documents/CODE/AI/minion_site/.env.example` L20-27]

---

## Architecture Patterns

### Recommended Project Structure

Mirror `packages/db/` and `packages/shared/` exactly.

```
packages/auth/
├── package.json            # name: @minion-stack/auth, version: 0.1.0
├── tsconfig.json           # extends @minion-stack/tsconfig/library.json
├── README.md               # factory usage, env contract, session-continuity gates
├── src/
│   ├── index.ts            # re-export createAuth + types
│   ├── factory.ts          # createAuth({ db, env, features })
│   └── types.ts            # CreateAuthOptions, AuthFeatures, AuthInstance type alias
└── dist/                   # tsc output (gitignored)
```

### Pattern 1: Factory with feature flags + callbacks

**What:** A single `createAuth()` exported from the package. Consumers pass their drizzle client, their env bag, and an optional `features` object describing which hub-only plugins and hooks to enable.

**When to use:** Both consumers (hub + site) share ~80% of config. Feature flags keep the package surface minimal while letting hub opt into OIDC + signup hooks without dragging hub-specific services into the package.

**Example:**
```typescript
// packages/auth/src/factory.ts
// Source: adapted from hub/site auth.ts + Better Auth 1.4.19 docs
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt, oidcProvider, organization } from 'better-auth/plugins';
import { createAuthMiddleware } from 'better-auth/api';
import * as schema from '@minion-stack/db/schema';

export interface AuthFeatures {
  /** Enable OIDC provider plugin (exposes /.well-known/openid-configuration). Hub-only. */
  oidc?: boolean;
  /** Gateway JWT audience — if absent, `jwt` plugin uses Better Auth defaults. */
  jwtAudience?: string;
  /** Called after a successful /sign-up. Hub uses this to provision a personal agent. */
  onSignUp?: (newSession: { user: { id: string; email: string } }) => Promise<void>;
  /** Called when the organization plugin wants to email an invitation. */
  sendInvitationEmail?: (data: InvitationEmailPayload) => Promise<void>;
  /** Whether to opt into browser-Secure cookies. Hub sets false for CEF/desktop mode. */
  useSecureCookies?: boolean;
}

export interface CreateAuthOptions {
  db: Parameters<typeof drizzleAdapter>[0]; // a Drizzle client instance
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  googleOAuth?: { clientId: string; clientSecret: string };
  features?: AuthFeatures;
}

export function createAuth(opts: CreateAuthOptions) {
  const plugins: any[] = [
    jwt({
      jwt: {
        issuer: opts.baseURL,
        audience: opts.features?.jwtAudience ?? opts.baseURL,
        expirationTime: '1h',
      },
      jwks: { keyPairConfig: { alg: 'EdDSA' } },
    }),
    organization(
      opts.features?.sendInvitationEmail
        ? { sendInvitationEmail: opts.features.sendInvitationEmail }
        : {},
    ),
  ];

  if (opts.features?.oidc) {
    plugins.push(oidcProvider({ loginPage: '/login' }));
  }

  return betterAuth({
    database: drizzleAdapter(opts.db, { provider: 'sqlite', schema }),
    secret: opts.secret,
    baseURL: opts.baseURL,
    trustedOrigins: opts.trustedOrigins,
    advanced: {
      useSecureCookies: opts.features?.useSecureCookies ?? opts.baseURL.startsWith('https://'),
    },
    emailAndPassword: { enabled: true },
    accountLinking: { enabled: true, trustedProviders: ['google'] },
    socialProviders: opts.googleOAuth ? { google: opts.googleOAuth } : {},
    plugins,
    hooks: opts.features?.onSignUp
      ? {
          after: createAuthMiddleware(async (ctx) => {
            if (ctx.path.startsWith('/sign-up') && ctx.context.newSession) {
              await opts.features!.onSignUp!(ctx.context.newSession);
            }
          }),
        }
      : undefined,
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
```

### Pattern 2: Consumer keeps a local `getAuth()` singleton

**What:** Each consumer keeps a thin `src/lib/auth/auth.ts` that calls `createAuth(...)` lazily and memoizes. This preserves the existing lazy-eval pattern (critical for SvelteKit `$env/dynamic/private` which only evaluates at request time).

**When to use:** Always. Better Auth's `betterAuth({...})` is expensive to call (opens DB adapter, generates JWKS), and `$env/dynamic/private` throws if evaluated at module load in build contexts.

**Example:**
```typescript
// minion_hub/src/lib/auth/auth.ts (after extraction)
import { createAuth, type AuthInstance } from '@minion-stack/auth';
import { getDb } from '$server/db/client';
import { env } from '$env/dynamic/private';
import { sendInvitationEmail } from '$server/services/email.service';
import { provisionPersonalAgent } from '$server/services/personal-agent.service';

let _auth: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (!_auth) {
    const hubUrl = env.BETTER_AUTH_URL ?? 'http://localhost:5173';
    _auth = createAuth({
      db: getDb(),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: hubUrl,
      trustedOrigins: [
        'http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173',
        ...(env.BETTER_AUTH_URL && env.BETTER_AUTH_URL !== 'http://localhost:5173' ? [env.BETTER_AUTH_URL] : []),
        ...(env.VERCEL_URL ? [`https://${env.VERCEL_URL}`] : []),
      ],
      googleOAuth: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
        : undefined,
      features: {
        oidc: true,
        jwtAudience: 'openclaw-gateway',
        onSignUp: async ({ user }) => {
          try {
            const db = getDb();
            await provisionPersonalAgent({ db, tenantId: 'default' }, { userId: user.id, email: user.email, serverId: '' });
          } catch (err) { console.error('[personal-agent] Failed to provision on signup:', err); }
        },
        sendInvitationEmail: async (data) => {
          const baseUrl = env.BETTER_AUTH_URL ?? 'http://localhost:5173';
          await sendInvitationEmail({
            to: data.email,
            inviterName: data.inviter.user.name ?? data.inviter.user.email,
            organizationName: data.organization.name,
            role: data.role ?? 'member',
            inviteUrl: `${baseUrl}/invite/accept?id=${data.id}`,
          });
        },
      },
    });
  }
  return _auth;
}
```

```typescript
// minion_site/src/lib/auth/auth.ts (after extraction)
import { createAuth, type AuthInstance } from '@minion-stack/auth';
import { getDb } from '$server/db/client';
import { env } from '$env/dynamic/private';

let _auth: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (!_auth) {
    _auth = createAuth({
      db: getDb(),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL ?? 'http://localhost:5173',
      trustedOrigins: [
        'http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173',
        ...(env.BETTER_AUTH_URL && env.BETTER_AUTH_URL !== 'http://localhost:5173' ? [env.BETTER_AUTH_URL] : []),
        ...(env.VERCEL_URL ? [`https://${env.VERCEL_URL}`] : []),
      ],
      googleOAuth: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
        : undefined,
      features: {
        jwtAudience: 'openclaw-gateway', // CRITICAL — must match hub for session continuity
      },
    });
  }
  return _auth;
}
```

### Anti-Patterns to Avoid

- **Shipping hub service imports from `@minion-stack/auth`:** If the package imports `$server/services/personal-agent.service`, circular dependency + impossible-to-install-in-site. Always accept as callback.
- **Evaluating `env` at module load inside `@minion-stack/auth`:** Breaks SvelteKit build. The package must never touch `process.env`. All env reading stays in consumers.
- **Bundling the browser `createAuthClient` into the factory package:** It's 4 lines, it's app-scoped (plugin selection is app-specific), and mixing server+client exports makes the package harder to consume. Leave `auth-client.ts` in each app.
- **Drifting JWT issuer/audience between hub and site:** Today site omits `{ issuer, audience }` while hub sets them. A JWT minted by hub won't validate in site and vice versa. The factory should set these based on `baseURL` by default, and both apps should pass the same `jwtAudience`. [CITED: better-auth.com/docs/plugins/jwt — "Both apps must use identical issuer and audience values to share sessions"]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie signing + verification | Custom HMAC/AES wrapper | Better Auth's built-in | Timing attacks, cookie-same-site misconfigs, session replay |
| JWKS key rotation | Custom `jose` helpers | Better Auth `jwt` plugin's JWKS storage | Key rotation + multi-key serving is already solved; hub's `gateway-jwt.service.ts` reads JWKS rows written by the plugin |
| OIDC discovery endpoints | Hand-rolled `/.well-known/openid-configuration` | `oidcProvider` plugin | Full spec compliance (claims, PKCE, RP-initiated logout) |
| Cross-subdomain cookie logic | Manual `Set-Cookie` header munging | `advanced.crossSubDomainCookies.{enabled,domain}` | Domain-attribute rules are subtle (leading-dot, path defaults) |
| Organization / invitation tables | Custom multi-tenant schema | `organization` plugin | Already populated schema in `@minion-stack/db/schema/auth`: `organization`, `member`, `invitation`, `team` |

**Key insight:** Better Auth's value proposition is the plugin ecosystem + DB-first session model. The extraction should preserve every opinion the framework already makes — the package only **composes**, it doesn't replace.

---

## Runtime State Inventory

> This is a refactor phase. Rename/string-replacement is minor — the main mutation is moving code and adding a new package. Still, every category below must be answered.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **Session rows** in shared Turso DB (table: `session`, see `@minion-stack/db/schema/auth/index.ts` L24-41). **JWKS keypairs** in the shared `jwks` table. **User/account/organization/member/invitation/team** rows in shared DB. None of these need migration — schema already shared in Phase 5, rows unchanged. | None — data stays put |
| Live service config | **Vercel env vars** for hub and site deployments: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `VITE_BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`. **Must already be identical for `BETTER_AUTH_SECRET` + `GOOGLE_CLIENT_*` (they live in Infisical `minion-core` shared project). AUTH-04 gate: confirm this pre-cutover via `minion doctor` and `infisical secrets list --projectId minion-core`. | Verify secret-sharing pre-cutover; no config change needed if already shared |
| OS-registered state | None — this is a web auth stack, not a daemon. No systemd units, no launchd plists, no Windows Task Scheduler entries reference the Better Auth config. [VERIFIED: no matches for `BETTER_AUTH` in `/etc/systemd` via project-local search; production is Vercel-hosted]. | None |
| Secrets and env vars | `BETTER_AUTH_SECRET` — **code edit only**, no secret rotation needed. Rotating the secret would invalidate every live session (forced global logout). The migration keeps the same secret, moves the code that reads it. Same for `GOOGLE_CLIENT_*`. | None (preserve secrets) |
| Build artifacts / installed packages | Hub + site both have `better-auth` in their `node_modules`. After extraction, they continue to have `better-auth` (peer dep of `@minion-stack/auth`, also direct dep). **No stale .egg-info-style leftover.** The new `packages/auth/dist/` will be a fresh build artifact. | Run `bun install` in hub + site after their `package.json` picks up `@minion-stack/auth@^0.1.0` |

**The canonical question:** After hub + site swap to `createAuth()` from the shared package, what runtime systems still reference Better Auth in a way that could drift? Answer: **only the Vercel deployment envs**, and they must stay in sync. `minion doctor` will surface drift.

---

## Common Pitfalls

### Pitfall 1: Lazy-eval singleton is lost in the refactor
**What goes wrong:** Developer sees hub's `let _auth: ReturnType<typeof betterAuth> | null = null` and "simplifies" it into `export const auth = createAuth({...})` at module scope.
**Why it happens:** The factory pattern suggests eager instantiation is fine. It is not.
**How to avoid:** `@minion-stack/auth` exports a factory (pure function), but each consumer must keep its lazy memoization. SvelteKit's `$env/dynamic/private` throws at build time if you try to read it at module load.
**Warning signs:** Build fails with `Cannot find module '$env/dynamic/private'` during `vite build`, or `env.BETTER_AUTH_SECRET is undefined` warnings in server logs.

### Pitfall 2: Silent JWT-audience drift breaks gateway auth
**What goes wrong:** Site's current `jwt()` call has no custom audience; hub's has `audience: 'openclaw-gateway'`. A JWT minted from a site-login session would not validate for gateway calls.
**Why it happens:** Existing site config is simpler — developer might forget to add `jwtAudience: 'openclaw-gateway'` on the site side after extraction.
**How to avoid:** Factory default: `audience: opts.baseURL`. Both consumers must explicitly set `features.jwtAudience: 'openclaw-gateway'` — document this as an AUTH-04 gate. Add a staging smoke test that mints a JWT from hub, validates it via site's `jwt` plugin.
**Warning signs:** Gateway rejects JWTs with "invalid audience" after site users try to connect.

### Pitfall 3: `createAuthMiddleware` hook fires during tests / seeds
**What goes wrong:** Hub seed script or test runner triggers sign-up paths; the `provisionPersonalAgent` hook runs against a partial tenant context and errors.
**Why it happens:** Hooks are registered per-instance and always fire. Hub already swallows errors (`try { ... } catch (err) { console.error(...) }`), but an overly-strict hook could block signup.
**How to avoid:** Factory must keep the hook wrapped in try/catch; never let an `onSignUp` callback throw. Document this contract in the factory JSDoc.
**Warning signs:** Signup returns 500, or test runs emit `[personal-agent] Failed to provision on signup` log noise.

### Pitfall 4: Cross-subdomain cookies not configured in production
**What goes wrong:** Hub at `hub.example.com` logs a user in. User navigates to `site.example.com`. Site has no session because the browser scoped the cookie to `hub.example.com`.
**Why it happens:** Better Auth default cookie domain is host-only. Cross-subdomain requires explicit `advanced.crossSubDomainCookies.{enabled: true, domain: 'example.com'}`.
**How to avoid:** Factory must accept an `advanced` override (or a `crossSubDomainCookies` convenience option). AUTH-04 staging verification **must** exercise the cross-host flow, not just same-host. If apps are served as path-prefixes under the same domain (e.g. `app.com/hub` + `app.com/site`), this is moot — but that's not the Vercel-deployed topology.
**Warning signs:** AUTH-04 staging test fails: hub login → site shows "not logged in" despite shared DB + identical secret.
**[CITED: better-auth.com/docs/concepts/cookies — "crossSubDomainCookies: { enabled: true, domain: 'example.com' }"]**

### Pitfall 5: Better Auth version drift between hub and site
**What goes wrong:** After extraction, hub upgrades to 1.5.x for a feature; site stays on 1.4.19. Session-cookie format or JWKS format changes; sessions mint by one app don't validate in the other.
**Why it happens:** Each consumer has its own `package.json better-auth` entry. `@minion-stack/auth` declares it as a peer dep.
**How to avoid:** Declare `"better-auth": "1.4.19"` as a peer dep AND add a runtime sanity check in `createAuth()` that reads `better-auth/package.json` and warns if the two don't match. Or — pin exact versions in hub + site and document the coupling.
**Warning signs:** Intermittent "invalid session" after a subset of users log in; logs show JWKS parse errors.

### Pitfall 6: OIDC discovery 404s after extraction
**What goes wrong:** Hub's `hooks.server.ts` proxies `/.well-known/openid-configuration` to `/api/auth/.well-known/openid-configuration` (lines 57-66). After extraction, developer removes this hook thinking the plugin handles it.
**Why it happens:** The `oidcProvider` plugin mounts on `/api/auth/*`, but the standard OIDC discovery path is `/.well-known/openid-configuration` — the hub manually proxies. This is hub-local and must be preserved.
**How to avoid:** Do not touch `hooks.server.ts` OIDC proxy logic during extraction. It stays unchanged.
**Warning signs:** OIDC clients (e.g. Better Auth's own oidc-provider consumers) can't discover the IdP.

---

## Code Examples

### Example 1: Minimal Better Auth drizzleAdapter + plugins call (reference)

```typescript
// Source: Better Auth 1.4.19 internal reference + hub/site auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt, organization } from 'better-auth/plugins';
import * as schema from '@minion-stack/db/schema';

const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: { enabled: true },
  plugins: [jwt(), organization()],
});
```

### Example 2: Lazy singleton pattern (preserved in both consumers)

```typescript
// Source: current minion_hub/src/lib/auth/auth.ts L13-17 pattern
let _auth: AuthInstance | null = null;
export function getAuth(): AuthInstance {
  if (!_auth) _auth = createAuth({ /* opts */ });
  return _auth;
}
```

### Example 3: Cross-subdomain cookie opt-in for AUTH-04 staging

```typescript
// Source: better-auth.com/docs/concepts/cookies (VERIFIED via WebFetch 2026-04-21)
betterAuth({
  // ...
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: 'example.com', // or '.minion.example.com' — root domain for subdomain sharing
    },
  },
});
```

### Example 4: Consumer package.json shape

```jsonc
// packages/auth/package.json
{
  "name": "@minion-stack/auth",
  "version": "0.1.0",
  "description": "Better Auth factory for the Minion platform — shared between hub and site.",
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
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "publishConfig": { "access": "public" },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "tsc"
  },
  "peerDependencies": {
    "better-auth": "1.4.19",
    "@minion-stack/db": ">=0.2.0",
    "drizzle-orm": ">=0.45.0"
  },
  "devDependencies": {
    "@minion-stack/tsconfig": "workspace:*",
    "@minion-stack/db": "workspace:*",
    "better-auth": "1.4.19",
    "drizzle-orm": "^0.45.1",
    "typescript": "^5.0.0"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-app inlined `betterAuth({...})` config | Shared `createAuth()` factory | This phase | Config drift eliminated; JWT audience gate automatic |
| Hub schema re-exported locally | `@minion-stack/db/schema` shared | Phase 5 (complete) | Auth tables already centralized — prerequisite satisfied |
| Old `minion-shared` npm scope | `@minion-stack/*` scope | Phase 4 (complete) | Package name = `@minion-stack/auth` (NOT `@minion/auth`) |
| `better-auth@1.4.x` (current) | `better-auth@1.5.x` / `1.6.x` | Deferred — separate phase | 1.6 has `freshAge` breaking change; bundling with extraction increases rollback complexity |

**Deprecated/outdated:**
- ROADMAP.md reference to `@minion/auth` — outdated since Phase 2 scope pivot; treat as `@minion-stack/auth`
- Any training-knowledge assumption that Better Auth `jwt` plugin signs session cookies — it does NOT. Session cookies are signed with `secret`; the `jwt` plugin is for minting gateway/API JWTs that are separate from session state. [VERIFIED: hub `gateway-jwt.service.ts` reads `jwks` rows directly and signs with `jose`]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@minion-stack/auth` is the correct scope (roadmap says `@minion/auth`) | User Constraints, Standard Stack | LOW — Phase 2/5 precedent is unambiguous; `/gsd-discuss-phase` should confirm |
| A2 | Hub + site will stay on `better-auth@1.4.19` during extraction | User Constraints | MEDIUM — user may want to bundle an upgrade; clarify in discuss |
| A3 | Feature-flag factory is preferred over two separate factories | Architecture | MEDIUM — could also ship two `createAuth` variants; confirm with user |
| A4 | Cross-subdomain cookie config is a deploy-time concern, not package-shape | Pitfalls | LOW — but factory must expose `advanced` passthrough |
| A5 | Hub's desktop-mode session-persistence (`src/server/auth/desktop-session.ts`) stays in hub | Deferred | LOW — it's clearly hub-specific (Electrobun/CEF workaround) |
| A6 | The hub's manual JWT-minting in `gateway-jwt.service.ts` stays in hub | Deferred | LOW — it uses `jose` directly against the shared `jwks` table; shared table is already in `@minion-stack/db` |
| A7 | `@minion-stack/auth` does NOT ship a browser `createAuthClient` helper | Architecture | MEDIUM — if discuss wants one, it's a 4-line addition (export `createAuthClient` from `better-auth/svelte`) |
| A8 | Lazy singleton `getAuth()` pattern is kept per-consumer | Patterns | LOW — refactor-safe, matches today's pattern |
| A9 | `BETTER_AUTH_SECRET` is already shared between hub + site in production via Infisical `minion-core` | Runtime State | **HIGH if wrong** — if hub + site have different secrets today, AUTH-04 cannot pass without a secret-sync step. Must verify pre-execution via `minion doctor` or Infisical dashboard. |
| A10 | Hub and site will be served from domains that can share cookies (either same-origin path-prefix or cross-subdomain under a shared root) in AUTH-04 staging | Pitfalls, Runtime State | HIGH — if they're completely different domains (e.g. `hub.com` + `site.io`), cookies cannot be shared via any config; AUTH-04 needs a token-handoff mechanism instead |

**If this table is empty:** N/A — assumptions exist; user should review A2, A9, A10 before plan execution.

---

## Open Questions

1. **Should we upgrade Better Auth to 1.5.x or 1.6.x during this phase?**
   - What we know: 1.4.19 is stable (2026-02-23), 1.6.5 is current (2026-04-16), 1.6 has a `freshAge` breaking change
   - What's unclear: User's risk appetite for bundling an upgrade with a refactor
   - Recommendation: Defer to separate post-extraction phase; document in deferred list

2. **Is there a plan for AUTH-04 cross-host cookie topology in staging?**
   - What we know: Hub + site share DB + secret; that's necessary but not sufficient
   - What's unclear: Staging DNS layout — are hub and site under a common root (`*.minion.example.com`) or fully independent?
   - Recommendation: Discuss with user during CONTEXT phase; may need an explicit "AUTH-04 cannot pass without cross-subdomain cookie config" entry

3. **Does site need the OIDC plugin?**
   - What we know: Site currently does NOT include `oidcProvider` in its plugin list
   - What's unclear: Any roadmap for site to act as an OIDC client or provider
   - Recommendation: Start with site opting OUT; it's easy to flip `features.oidc: true` later

4. **Does the factory need an `advanced` passthrough for cross-subdomain cookies, OR a dedicated `crossSubDomainCookies` convenience option?**
   - What we know: Hub already uses `advanced.useSecureCookies`; the config shape exists
   - What's unclear: Developer ergonomics preference
   - Recommendation: Add a narrow `features.crossSubDomainCookies?: { enabled: boolean; domain: string }` that writes into `advanced` — keeps the API explicit

5. **Should hub's `provisionPersonalAgent` hook stay in hub, or is the `onSignUp` callback sufficient?**
   - What we know: Today's implementation lives in `src/lib/auth/auth.ts`; it calls a hub-local service
   - What's unclear: Whether user wants this logic promoted/shared
   - Recommendation: Keep in hub via `features.onSignUp` callback (called from factory). Do NOT move service-layer code into `@minion-stack/auth`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build / tests | ✓ | 22+ (meta-repo engine requirement) | — |
| pnpm | Meta-repo workspace | ✓ | 10.x | — |
| bun | Hub + site runtime | ✓ | (installed per CLAUDE.md) | — |
| TypeScript | `tsc` build | ✓ | 5.x | — |
| Changesets CLI | Publishing | ✓ | (existing) | — |
| `better-auth@1.4.19` | Factory runtime | ✓ | 1.4.19 installed in hub + site | — |
| `@minion-stack/db@>=0.2.0` | Schema imports | ✓ | 0.2.0 published | — |
| `@minion-stack/tsconfig@workspace:*` | Build config | ✓ | workspace | — |
| LibSQL/Turso (staging) | AUTH-04 dry-run | ? | — | Use local SQLite clone, mirror Phase 5's staging pattern |
| npm registry 2FA | Publishing | human-in-loop | — | Checkpoint in plan — same as `@minion-stack/db@0.1.0` publish |

**Missing dependencies with no fallback:** none

**Missing dependencies with fallback:** Staging Turso — use SQLite clone for dry-run, same as Phase 5.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (hub) — no existing test framework in site yet |
| Config file | `minion_hub/vitest.config.ts` (auto-detected via `bun run vitest`); no site config |
| Quick run command | `cd minion_hub && bun run test` / `cd packages/auth && pnpm test` (to be created) |
| Full suite command | `cd minion_hub && bun run test && cd ../minion_site && bun run check && cd ../packages/auth && pnpm build && pnpm test` |
| Package-level test | `packages/auth/` will add minimal vitest setup + a single smoke test that `createAuth()` returns an object with `.handler`, `.api.getSession` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `createAuth()` returns a Better Auth instance with the same public shape as `betterAuth()` | unit | `cd packages/auth && pnpm test` | ❌ Wave 0 |
| AUTH-01 | Factory composes organization + jwt plugins with correct defaults | unit (type-level + runtime) | `cd packages/auth && pnpm test -- factory.test.ts` | ❌ Wave 0 |
| AUTH-01 | Factory emits `oidcProvider` only when `features.oidc: true` | unit | `cd packages/auth && pnpm test -- features.test.ts` | ❌ Wave 0 |
| AUTH-01 | Factory emits `hooks.after` only when `features.onSignUp` provided | unit | `cd packages/auth && pnpm test -- features.test.ts` | ❌ Wave 0 |
| AUTH-02 | Package builds cleanly, tsconfig extends library preset, exports resolve via types + import maps | build | `cd packages/auth && pnpm build` | (implicit via `tsc`) |
| AUTH-02 | `@minion-stack/auth@0.1.0` published to npm public registry | manual-only | human 2FA + `npm view @minion-stack/auth version` | N/A (human action) |
| AUTH-03 | Hub `getAuth()` returns an instance that handles `/api/auth/sign-up` end-to-end against test DB | integration | `cd minion_hub && bun run test -- auth.test.ts` (to be written) | ❌ Wave 0 |
| AUTH-03 | Site `getAuth()` returns an instance that handles `/api/auth/sign-in` end-to-end against test DB | integration | `cd minion_site && bun run vitest auth.test.ts` (and install vitest if absent) | ❌ Wave 0 |
| AUTH-03 | `bun run check` passes in hub after migration (no TS errors) | smoke | `cd minion_hub && bun run check` | ✅ |
| AUTH-03 | `bun run check` passes in site after migration | smoke | `cd minion_site && bun run check` | ✅ |
| AUTH-04 | User signs up via hub staging URL → DB session row created | manual-only | staging smoke test | N/A (human) |
| AUTH-04 | User's session cookie from hub is accepted by site (curl with cookie jar) | manual-only / automatable | `curl -b cookies.txt https://site-staging/api/auth/session` | N/A (staging) |
| AUTH-04 | JWT minted by hub validates against JWKS served by site | integration | scripted against staging `/api/auth/jwks` endpoints | ❌ Wave 0 optional |
| AUTH-04 | Coordinated production cutover: no forced logouts observed in 24h post-deploy | manual-only | PostHog session_started events + user reports | N/A (production) |

### Sampling Rate
- **Per task commit:** `cd packages/auth && pnpm test && pnpm build` (after AUTH-01)
- **Per wave merge:** full suite above
- **Phase gate:** full suite green + AUTH-04 staging manual smoke passing before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/auth/vitest.config.ts` — new, mirrors `packages/db/` approach (or use bundled vitest from workspace)
- [ ] `packages/auth/src/factory.test.ts` — factory smoke tests (no plugins, with oidc, with onSignUp)
- [ ] `packages/auth/src/features.test.ts` — feature-flag behaviour tests
- [ ] `minion_hub/src/lib/auth/auth.test.ts` — integration test against test DB; may already be blocked by existing patterns — inspect during Wave 0
- [ ] `minion_site/vitest.config.ts` — site has no vitest today; install if integration test is desired. Otherwise, rely on `bun run check` + staging smoke for site
- [ ] A shared `tests/shared-session.test.ts` or staging-only script for AUTH-04 cross-host verification

---

## Security Domain

> `security_enforcement` is not explicitly disabled in `.planning/config.json`, so include this section.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Better Auth built-in (scrypt passwords, session management, Google OAuth via `socialProviders`) |
| V3 Session Management | yes | Better Auth session cookies + DB row; `BETTER_AUTH_SECRET` for signing; `advanced.useSecureCookies` for HTTPS |
| V4 Access Control | yes | `organization` plugin for multi-tenant member/invitation model; hub's `hooks.server.ts` enforces route protection |
| V5 Input Validation | yes | Better Auth validates email/password inputs; consumers should not parse auth bodies themselves |
| V6 Cryptography | yes | Better Auth JWKS (EdDSA keypair via `jwt` plugin `keyPairConfig`); hub's token-at-rest encryption (`src/server/auth/crypto.ts`) uses AES-256-GCM — **stays in hub** |
| V7 Error Handling | yes | `authHandle` catches and logs; `onSignUp` callback must not throw |
| V9 Communication | yes | `useSecureCookies` + HTTPS-only in production; `trustedOrigins` prevents CSRF |
| V14 Configuration | yes | `BETTER_AUTH_SECRET` must be managed via Infisical `minion-core`, NOT committed; `@minion-stack/auth` never reads process.env directly |

### Known Threat Patterns for Better Auth + SvelteKit

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret mismatch → forced logout at scale | Denial of Service | Secret lives in Infisical `minion-core`, loaded into both hub + site env at boot; `minion doctor` flags drift |
| JWT audience mismatch → gateway rejects | Spoofing / DoS | Factory defaults `audience: baseURL`; both consumers explicitly set `features.jwtAudience: 'openclaw-gateway'` |
| Cookie-scope too broad → cross-app session bleed | Elevation of Privilege | `crossSubDomainCookies.domain` set to narrowest-possible shared root, not `.com` |
| CSRF on `/api/auth/*` | Tampering | `trustedOrigins` enforced by Better Auth; CORS respected by SvelteKit |
| Session hijacking via non-HTTPS cookie in prod | Information Disclosure | `useSecureCookies: true` automatic when `baseURL.startsWith('https://')` |
| OIDC discovery spoof | Spoofing | `oidcProvider` mounted only on hub; site has no OIDC endpoints to attack |
| Leaked `BETTER_AUTH_SECRET` in logs during extraction | Information Disclosure | `@minion-stack/auth` never logs opts; `minion sync-env` writes to `.env.local` (gitignored), not git-tracked files |

### Pre-Cutover Security Gates (AUTH-04)

1. **Secret parity:** `infisical secrets list --projectId minion-core | grep BETTER_AUTH_SECRET` — confirm exactly one value, no per-app override
2. **OAuth redirect parity:** Google Cloud Console OAuth app's authorized redirect URIs must include `https://<hub>/api/auth/callback/google` AND `https://<site>/api/auth/callback/google`
3. **Cookie scope:** verify `advanced.crossSubDomainCookies.domain` matches the deployed apex and does not include untrusted subdomains
4. **Rate limits:** Better Auth 1.4.19 default rate limits applied on both apps

---

## Project Constraints (from CLAUDE.md)

**Root `/home/nikolas/Documents/CODE/AI/CLAUDE.md`:**
- Package scope is `@minion-stack/*` (user instruction: scope established Phase 2; all packages follow) — **applies: `@minion-stack/auth` not `@minion/auth`**
- Subprojects use their own package managers: hub + site use `bun`; meta-repo packages use `pnpm`
- Cross-project auth changes affect both hub and site — called out explicitly in "Cross-Project Impact Zones"
- Never commit directly to main/master; use feature branches
- Svelte 5 runes + snippets syntax only (no legacy Svelte 4) — applies to any `.svelte` edits
- TypeScript strict mode everywhere — `@minion-stack/auth` must pass strict + `noUncheckedIndexedAccess` where the base tsconfig allows

**`minion_hub/CLAUDE.md`:**
- Better Auth uses **scrypt** for passwords (not argon2). Password reset via `import { hashPassword } from 'better-auth/crypto'`. — **applies: factory must not override the hash algorithm**
- Dev auth bypass needs BOTH `AUTH_DISABLED=true` (server) AND `PUBLIC_AUTH_DISABLED=true` (client) in `.env` — **bypass logic stays in hub `hooks.server.ts`, NOT in the factory**
- Drizzle relations referencing non-existent columns fail silently at compile time — only crash at runtime. — **applies: factory uses `import * as schema` NOT explicit column picks; schema comes from `@minion-stack/db`**
- Feature branch workflow: `feature/* → dev → main`

**`minion_site/CLAUDE.md`:**
- Svelte 5 runes + snippets + `onclick={}` syntax only
- Better Auth 1.4.19 (confirmed)
- `@minion-stack/db` already consumed — prerequisite for auth extraction satisfied
- Server-side auth in `lib/auth/`; client in `lib/auth/auth-client.ts`
- i18n via Paraglide; no auth strings touch translation layer currently

---

## Sources

### Primary (HIGH confidence)
- `/home/nikolas/Documents/CODE/AI/minion_hub/src/lib/auth/auth.ts` — source truth for hub config (102 lines inventoried)
- `/home/nikolas/Documents/CODE/AI/minion_site/src/lib/auth/auth.ts` — source truth for site config (36 lines inventoried)
- `/home/nikolas/Documents/CODE/AI/minion_hub/src/hooks.server.ts` — OIDC proxy + session-extract logic
- `/home/nikolas/Documents/CODE/AI/minion_site/src/hooks.server.ts` — session-extract logic
- `/home/nikolas/Documents/CODE/AI/packages/db/src/schema/auth/index.ts` — auth table definitions
- `/home/nikolas/Documents/CODE/AI/packages/db/package.json` — pattern reference
- `/home/nikolas/Documents/CODE/AI/packages/shared/package.json` — pattern reference
- `/home/nikolas/Documents/CODE/AI/.planning/phases/05-db-extraction/05-RESEARCH.md` — extraction-pattern precedent
- `/home/nikolas/Documents/CODE/AI/minion_hub/.env.example` + `/home/nikolas/Documents/CODE/AI/minion_site/.env.example` — env contract
- `npm view better-auth time --json` — version publish dates verified 2026-04-21
- `npm view better-auth@1.6.5 dependencies` — dependency tree verified

### Secondary (MEDIUM confidence)
- https://www.better-auth.com/docs/plugins/jwt (WebFetch 2026-04-21) — confirmed JWT issuer/audience parity requirement + JWKS DB storage
- https://www.better-auth.com/docs/concepts/cookies (WebFetch 2026-04-21) — confirmed `advanced.crossSubDomainCookies` config shape
- https://github.com/better-auth/better-auth/releases/tag/v1.6.0 (WebFetch 2026-04-21) — confirmed breaking changes between 1.4.19 and 1.6.x

### Tertiary (LOW confidence — flagged for validation)
- https://www.better-auth.com/docs/concepts/session-management — did not explicitly cover cross-instance session sharing; combined with JWT plugin doc + codebase to infer behaviour
- https://www.better-auth.com/docs/concepts/typescript — did not document factory pattern; factory design is derived from hub/site existing patterns + Better Auth's public type surface

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm; packages already installed in consumers
- Architecture: HIGH — factory pattern is the only sensible shape given hub/site drift; precedent exists in Phase 5
- Pitfalls: HIGH for 1-6 (grounded in codebase inspection + official docs); MEDIUM for anything requiring deploy-topology assumptions (A10)
- Runtime State: HIGH — code and DB state inventoried directly
- Security: HIGH for schema-level controls; MEDIUM for deploy-time controls (pending AUTH-04 staging topology confirmation)

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — stable ecosystem, Better Auth is mature; only invalidated by a major Better Auth release or a change in hub/site auth config before the phase starts)
