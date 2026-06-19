import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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
    // Observed coarse status (kept for existing consumers / hub badge).
    status: text('status', { enum: ['active', 'inactive', 'pairing'] })
      .notNull()
      .default('inactive'),

    // --- Intent (user-configured rules; one concern per column). See
    //     specs/2026-06-19-linked-channels-config-restructure.md ---
    // Should the gateway hold a live session (runtime enable/disable).
    enabled: boolean('enabled').notNull().default(true),
    // Reply behavior. 'none' = noAgent (never reply, even owner/self); 'bound' =
    // reply only where a channel_bindings row matches. No 'auto' on purpose.
    replies: text('replies', { enum: ['none', 'bound'] }).notNull().default('none'),
    // DM sender access gate (consulted only when replies='bound'). [] = nobody,
    // ['*'] = anyone. Replaces the old dm_policy enum (derivable from this).
    allowFrom: text('allow_from').array().notNull().default(sql`'{}'`),
    groupAllowFrom: text('group_allow_from').array().notNull().default(sql`'{}'`),
    // Groups reply only when @-mentioned.
    requireMention: boolean('require_mention').notNull().default(true),

    // --- Observed (gateway-reported, read-only) ---
    reconnectCount: integer('reconnect_count').notNull().default(0),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    lastError: text('last_error'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_channels_tenant_gateway').on(t.tenantId, t.gatewayId),
    uniqueIndex('channels_uniq_type_label').on(t.tenantId, t.gatewayId, t.type, t.label),
  ],
);

/**
 * Agent routing for a channel. A channel with NO rows here resolves to no agent
 * (receive-only). agent_id NULL on a row is an explicit noAgent binding. Match
 * specificity orders resolution: dm_peer > group > catchall (no priority column).
 */
export const channelBindings = pgTable(
  'channel_bindings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    matchKind: text('match_kind', { enum: ['catchall', 'dm_peer', 'group'] }).notNull(),
    matchPeer: text('match_peer'),
    agentId: text('agent_id'), // null = explicit noAgent
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_channel_bindings_channel').on(t.channelId),
    uniqueIndex('channel_bindings_uniq').on(t.channelId, t.matchKind, t.matchPeer),
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
