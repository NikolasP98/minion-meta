/**
 * Better Auth schema tables — Postgres variant.
 *
 * Faithful 1:1 port of `../../schema/auth/index.ts` (sqlite) for the Turso→Supabase
 * Better Auth cutover (Stage 5 / Track B). Export NAMES must match Better Auth's
 * model names (`user`, `session`, …) because the auth factory passes this module
 * straight to the drizzle adapter. Ids stay `text` (Better Auth generates string
 * ids — keeping them text preserves existing ids across the store migration, so
 * `profiles.legacy_user_id` keeps mapping). sqlite `integer{mode:timestamp}` →
 * `timestamptz`; `integer{mode:boolean}` → `boolean`.
 *
 * Provider: pg, plugins: emailAndPassword, google OAuth, jwt, organization, oidc.
 */
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

// ── Core: user ──────────────────────────────────────────────────────────────
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  role: text('role', { enum: ['user', 'admin'] })
    .notNull()
    .default('user'),
  personalAgentId: text('personal_agent_id'),
});

// ── Core: session ────────────────────────────────────────────────────────────
export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Added by organization plugin
    activeOrganizationId: text('active_organization_id'),
  },
  (t) => [index('idx_session_user').on(t.userId)],
);

// ── Core: account ────────────────────────────────────────────────────────────
export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('idx_account_user').on(t.userId)],
);

// ── Core: verification ────────────────────────────────────────────────────────
export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('idx_verification_identifier').on(t.identifier)],
);

// ── JWT plugin: jwks ─────────────────────────────────────────────────────────
export const jwks = pgTable('jwks', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

// ── Organization plugin: organization ────────────────────────────────────────
export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  logo: text('logo'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  metadata: text('metadata'),
});

// ── Organization plugin: member ───────────────────────────────────────────────
export const member = pgTable(
  'member',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('idx_member_org').on(t.organizationId), index('idx_member_user').on(t.userId)],
);

// ── Organization plugin: invitation ──────────────────────────────────────────
export const invitation = pgTable(
  'invitation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),
    status: text('status').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('idx_invitation_org').on(t.organizationId)],
);

// ── OIDC provider plugin: oauthApplication ──────────────────────────────────
export const oauthApplication = pgTable('oauth_application', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  metadata: text('metadata'),
  clientId: text('client_id').notNull().unique(),
  clientSecret: text('client_secret'),
  redirectUrls: text('redirect_urls').notNull(),
  type: text('type').notNull(),
  disabled: boolean('disabled').default(false),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

// ── OIDC provider plugin: oauthAccessToken ──────────────────────────────────
export const oauthAccessToken = pgTable(
  'oauth_access_token',
  {
    id: text('id').primaryKey(),
    accessToken: text('access_token').notNull().unique(),
    refreshToken: text('refresh_token').notNull().unique(),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }).notNull(),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }).notNull(),
    clientId: text('client_id').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    scopes: text('scopes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('idx_oauth_access_token_client').on(t.clientId),
    index('idx_oauth_access_token_user').on(t.userId),
  ],
);

// ── OIDC provider plugin: oauthConsent ──────────────────────────────────────
export const oauthConsent = pgTable(
  'oauth_consent',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    scopes: text('scopes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    consentGiven: boolean('consent_given').notNull(),
  },
  (t) => [
    index('idx_oauth_consent_client').on(t.clientId),
    index('idx_oauth_consent_user').on(t.userId),
  ],
);
