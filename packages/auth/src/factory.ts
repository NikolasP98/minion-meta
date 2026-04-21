import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt } from 'better-auth/plugins';
import type { CreateAuthParams, AuthInstance } from './types.js';

const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
] as const;

/**
 * Creates a Better Auth instance shared between minion_hub and minion_site.
 *
 * ALWAYS includes:
 *   - jwt plugin (EdDSA keypair, 1h expiry, audience='openclaw-gateway', issuer=baseURL)
 *   - emailAndPassword enabled
 *   - accountLinking enabled with google trusted provider
 *   - localhost dev origins trusted
 *
 * Callers supply app-specific plugins via the `plugins` param:
 *   - minion_hub: [organization({ sendInvitationEmail }), oidcProvider({ loginPage: '/login' })]
 *   - minion_site: [organization()]
 *
 * DOES NOT call organization() internally — avoids duplicate plugin registration
 * when hub passes organization({ sendInvitationEmail }) (CONTEXT D-02 revised).
 *
 * CRITICAL for session continuity: hub + site MUST use identical `secret` values.
 * Never log params; callers own secrets.
 */
export function createAuth(params: CreateAuthParams): AuthInstance {
  const { db, schema, secret, baseURL, trustedOrigins, google, plugins, hooks } = params;

  const allOrigins: string[] = [
    ...DEFAULT_LOCAL_ORIGINS,
    // Add baseURL if it isn't already one of the defaults
    ...(!DEFAULT_LOCAL_ORIGINS.includes(baseURL as (typeof DEFAULT_LOCAL_ORIGINS)[number])
      ? [baseURL]
      : []),
    ...(trustedOrigins ?? []),
  ];

  return betterAuth({
    database: drizzleAdapter(db as never, { provider: 'sqlite', schema }),
    secret,
    baseURL,
    advanced: {
      useSecureCookies: baseURL.startsWith('https://'),
    },
    trustedOrigins: allOrigins,
    emailAndPassword: { enabled: true },
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
    socialProviders: google ? { google } : {},
    plugins: [
      jwt({
        jwt: {
          issuer: baseURL,
          audience: 'openclaw-gateway',
          expirationTime: '1h',
        },
        jwks: {
          keyPairConfig: { alg: 'EdDSA' },
        },
      }),
      ...(plugins ?? []),
    ],
    ...(hooks ? { hooks } : {}),
  });
}
