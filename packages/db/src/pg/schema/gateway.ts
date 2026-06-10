import { pgTable, uuid, text, boolean, timestamp, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';

/**
 * Supabase-backed registry of Minion gateway servers.
 * Mirrors Turso `servers`. legacy_server_id preserves the old Turso text PK
 * so Turso log/event rows (which still carry the old id) can join here.
 */
export const gateway = pgTable('gateway', {
  id: uuid('id').primaryKey().defaultRandom(),
  legacyServerId: text('legacy_server_id'),
  // Owning org (soft ref to organizations.id). Used by server-token ingest auth
  // (resolveServerTokenAuth) to resolve the tenant — the Turso `servers.tenant_id`
  // equivalent. Nullable during the Turso→Supabase gateway-token cutover bake.
  orgId: uuid('org_id'),
  name: text('name').notNull(),
  url: text('url').notNull(),
  tokenCiphertext: text('token_ciphertext').notNull().default(''),
  tokenIv: text('token_iv').notNull().default(''),
  authMode: text('auth_mode', { enum: ['token', 'none'] }).notNull().default('token'),
  lastConnectedAt: timestamp('last_connected_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('gateway_uniq_url').on(t.url),
  index('idx_gateway_legacy').on(t.legacyServerId),
]);

/**
 * Per-user gateway link. Mirrors Turso `user_servers`.
 * profile_id references profiles.id (== auth.users.id).
 */
export const userGateway = pgTable('user_gateway', {
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  gatewayId: uuid('gateway_id').notNull().references(() => gateway.id, { onDelete: 'cascade' }),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.profileId, t.gatewayId] }),
  index('idx_user_gateway_gateway').on(t.gatewayId),
]);
