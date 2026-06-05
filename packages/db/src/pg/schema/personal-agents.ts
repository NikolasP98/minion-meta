import { pgTable, uuid, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';
import { gateway } from './gateway.js';

/**
 * Per-user personal agent. Mirrors Turso `personal_agents`.
 * FK remap on migration: user_id → profile_id (profiles.id),
 * server_id → gateway_id (gateway.id, matched via gateway.legacy_server_id).
 */
export const personalAgents = pgTable(
  'personal_agents',
  {
    id: text('id').primaryKey(),
    profileId: uuid('profile_id')
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    agentId: text('agent_id').notNull(),
    gatewayId: uuid('gateway_id').references(() => gateway.id, { onDelete: 'set null' }),
    displayName: text('display_name').notNull(),
    conversationName: text('conversation_name'),
    avatarUrl: text('avatar_url'),
    personalityPreset: text('personality_preset', {
      enum: ['professional', 'casual', 'creative', 'technical'],
    }),
    personalityText: text('personality_text'),
    personalityConfigured: boolean('personality_configured').notNull().default(false),
    provisioningStatus: text('provisioning_status', {
      enum: ['pending', 'provisioning', 'active', 'error'],
    })
      .notNull()
      .default('pending'),
    provisioningError: text('provisioning_error'),
    lastRetryAt: timestamp('last_retry_at', { withTimezone: true }),
    retryCount: integer('retry_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_personal_agents_profile').on(t.profileId),
    index('idx_personal_agents_agent').on(t.agentId),
    index('idx_personal_agents_status').on(t.provisioningStatus),
  ],
);
