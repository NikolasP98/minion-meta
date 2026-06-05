import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { gateway } from './gateway.js';
import { profiles } from './profiles.js';

/**
 * Channel connections + assignments + identity mappings.
 * Mirrors Turso `channels` / `channel_assignments` / `channel_identities`.
 * FK remap: server_id → gateway_id (gateway.id via legacy_server_id),
 * tenant_id → organizations.id (plain uuid soft-ref, RLS-enforced),
 * user_id → profiles.id (matched via profiles.legacy_user_id).
 */

export const channels = pgTable(
  'channels',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['discord', 'whatsapp', 'telegram'] }).notNull(),
    label: text('label').notNull(),
    credentials: text('credentials').notNull().default(''),
    credentialsIv: text('credentials_iv').notNull().default(''),
    credentialsMeta: text('credentials_meta').notNull().default('{}'),
    status: text('status', { enum: ['active', 'inactive', 'pairing'] })
      .notNull()
      .default('inactive'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_channels_tenant_gateway').on(t.tenantId, t.gatewayId),
    uniqueIndex('channels_uniq_type_label').on(t.tenantId, t.gatewayId, t.type, t.label),
  ],
);

export const channelAssignments = pgTable(
  'channel_assignments',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    targetType: text('target_type', { enum: ['user', 'session'] }).notNull(),
    targetId: text('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_channel_assign_channel').on(t.channelId),
    uniqueIndex('channel_assign_uniq').on(t.channelId, t.targetType, t.targetId),
  ],
);

/**
 * Maps channel sender IDs (e.g. telegram:12345) to hub users.
 * Used by the gateway to resolve user identity from channel messages.
 */
export const channelIdentities = pgTable(
  'channel_identities',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    channel: text('channel').notNull(),
    channelUserId: text('channel_user_id').notNull(),
    displayName: text('display_name'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_channel_identity_unique').on(t.channel, t.channelUserId),
    index('idx_channel_identity_user').on(t.userId),
  ],
);
