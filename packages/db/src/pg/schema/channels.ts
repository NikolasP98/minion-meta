import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
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
    // Gateway account key (phone/handle, e.g. '+51906090526') — the join to the
    // gateway's per-account config. Nullable for legacy rows; the natural upsert
    // key for a linked account is (tenant_id, gateway_id, type, account_id).
    accountId: text('account_id'),
    // Scope classifier (specs/2026-07-19-channel-scoping-fix-plan.md P0).
    // Set  => account is USER-scoped: it belongs to this person and follows them
    //         across every org they're a member of (their own WhatsApp/Telegram/
    //         Discord), so the same real account is never duplicated per org.
    //         tenant_id remains the "home" org (it is NOT NULL) but stops gating
    //         visibility.
    // Null => account is ORG-scoped via tenant_id (shared business accounts).
    ownerProfileId: uuid('owner_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
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

    // --- Phase 0, gateway.json → DB migration (specs/2026-06-26-...) ---
    // Explicit pointer to this account's creds (e.g. 'whatsapp/51906090526');
    // never the creds. Replaces the authDir-by-convention guess.
    authRef: text('auth_ref'),
    // Transport knobs not worth typed columns (debounceMs/streamMode/
    // sendReadReceipts/selfChatMode/mediaMaxMb), validated by zod at the write path.
    settings: jsonb('settings').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_channels_tenant_gateway').on(t.tenantId, t.gatewayId),
    index('channels_owner_profile_idx').on(t.ownerProfileId),
    uniqueIndex('channels_uniq_type_label').on(t.tenantId, t.gatewayId, t.type, t.label),
    // Upsert key for gateway-account sync (account_id is the gateway account key).
    uniqueIndex('channels_uniq_type_account').on(t.tenantId, t.gatewayId, t.type, t.accountId),
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

/**
 * Pending channel pairing requests — DB-backed replacement for the gateway's
 * `~/.minion/credentials/<channel>-pairing.json` files (removed in favor of this table,
 * 2026-06-29). A request is created when an unknown sender DMs a channel whose access
 * policy is `pairing` (opt-in). The operator approves a code → the sender is added to
 * `channels.allow_from` and the request is deleted. Never stores the plaintext code —
 * only its SHA-256 hash (`code_hash`), matching the json store's `hashToken`.
 *
 * Ephemeral: rows older than the pairing TTL (1h) are pruned on read/write; the gateway
 * reaches this table via the hub's `/api/internal/channels/pairing/*` endpoints
 * (thin-gateway HTTP — the gateway holds no DB creds).
 */
export const channelPairingRequests = pgTable(
  'channel_pairing_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    // Channel type + gateway account key (e.g. 'whatsapp' + '+51906090526'). Plain text
    // (not the channels.type enum) so non-migrated channels can pair too.
    channelType: text('channel_type').notNull(),
    accountId: text('account_id').notNull(),
    // The requesting sender (phone/handle), as the gateway normalizes it.
    senderId: text('sender_id').notNull(),
    // SHA-256 of the pairing code — never the plaintext code.
    codeHash: text('code_hash').notNull(),
    // Free-form metadata (e.g. { name }).
    meta: jsonb('meta').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_channel_pairing_lookup').on(t.tenantId, t.gatewayId, t.channelType, t.accountId),
    // One pending request per (account, sender): re-request refreshes the code.
    uniqueIndex('channel_pairing_uniq_sender').on(
      t.tenantId,
      t.gatewayId,
      t.channelType,
      t.accountId,
      t.senderId,
    ),
  ],
);
