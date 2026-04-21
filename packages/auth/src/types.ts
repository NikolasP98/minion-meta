import type { BetterAuthOptions, betterAuth } from 'better-auth';

export interface CreateAuthParams {
  /** Drizzle client instance — caller owns creation (hub/site call `getDb()`). */
  db: unknown;
  /** Schema object — pass `import * as schema from '@minion-stack/db/schema'`. */
  schema: Record<string, unknown>;
  /** BETTER_AUTH_SECRET — MUST be identical between hub and site for session continuity. */
  secret: string;
  /** BETTER_AUTH_URL — used as JWT issuer and to derive `useSecureCookies`. */
  baseURL: string;
  /** Additional trusted origins (factory already includes localhost:5173/5174/4173 and baseURL). */
  trustedOrigins?: string[];
  /** Google OAuth credentials — omit to disable Google sign-in. */
  google?: { clientId: string; clientSecret: string };
  /**
   * Additional plugins. Hub passes `[organization({ sendInvitationEmail }), oidcProvider()]`.
   * Site passes `[organization()]`. Factory does NOT call organization() internally.
   */
  plugins?: NonNullable<BetterAuthOptions['plugins']>;
  /** Optional hooks — hub uses this for personal-agent onSignUp provisioning. */
  hooks?: BetterAuthOptions['hooks'];
}

export type AuthInstance = ReturnType<typeof betterAuth>;
