# @minion-stack/auth

Better Auth `createAuth()` factory shared between `minion_hub` and `minion_site`.

## Overview

This package provides a single `createAuth()` factory function that creates a fully-configured Better Auth instance with consistent defaults across the Minion platform. It ensures JWT audience, cookie security, and account linking behave identically in both apps.

**Always included by the factory:**
- JWT plugin (EdDSA keypair, 1h expiry, `audience: 'openclaw-gateway'`, `issuer: baseURL`)
- Email + password authentication
- Account linking with Google as a trusted provider
- Localhost dev origins (`:5173`, `:5174`, `:4173`)
- `useSecureCookies` derived from `baseURL` (automatic in production)

**Passed by callers** (factory never calls these internally):
- `organization()` — hub passes `organization({ sendInvitationEmail })`, site passes `organization()`
- `oidcProvider()` — hub only

## Install

This package is already included in the Minion meta-repo workspace. For external consumers:

```bash
npm install @minion-stack/auth better-auth@1.4.19
```

## Usage

### Hub call-site (`minion_hub/src/lib/auth/auth.ts`)

```typescript
import { createAuth, type AuthInstance } from '@minion-stack/auth';
import { organization, oidcProvider } from 'better-auth/plugins';
import { createAuthMiddleware } from 'better-auth/api';
import { getDb } from '$server/db/client';
import * as schema from '@minion-stack/db/schema';
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
                await provisionPersonalAgent(
                  { db: getDb(), tenantId: 'default' },
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

### Site call-site (`minion_site/src/lib/auth/auth.ts`)

```typescript
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

## Environment Contract

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | Auth signing secret. **Must be identical between hub and site for session continuity.** |
| `BETTER_AUTH_URL` | Yes | Full URL of the auth app (e.g. `https://hub.minion.pe`). Used as JWT issuer. |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID. Omit to disable Google sign-in. |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret. Omit to disable Google sign-in. |

Both `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are managed via Infisical `minion-hub` project — both apps pull from the same Infisical project to guarantee secret parity.

## Version Pinning

**Stay on `better-auth@1.4.19`.** Do NOT upgrade without a coordinated hub + site deploy:

- `better-auth@1.5.x` introduced session-cookie shape changes
- `better-auth@1.6.x` introduced a `freshAge` breaking change

See Phase 6 research notes (`.planning/phases/06-auth-extraction/06-RESEARCH.md`, Pitfall 5) for full context.

The peer dependency is pinned to the exact version `"better-auth": "1.4.19"` to prevent accidental silent upgrades via `npm update`.
