import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { user } from './auth/index.js';
import { servers } from './servers.js';

export const personalAgents = sqliteTable(
  'personal_agents',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    agentId: text('agent_id').notNull(),
    serverId: text('server_id').references(() => servers.id, { onDelete: 'set null' }),
    /**
     * @deprecated Slated for removal in @minion-stack/db v0.3.0 (Phase 2b
     * consolidation). Display name now lives in the gateway config at
     * `agents.list[].identity.name`. The 0012 migration drops this column —
     * apply it together with the v0.3.0 release. Until then, callers may
     * write an empty string as a placeholder; readers should ignore it.
     */
    displayName: text('display_name').notNull(),
    /**
     * @deprecated Slated for removal in @minion-stack/db v0.3.0 (Phase 3c).
     * Conversation name now lives in gateway config at
     * `agents.list[].personality.conversationName`. The 0013 migration drops
     * this column — apply it together with the v0.3.0 release.
     */
    conversationName: text('conversation_name'),
    avatarUrl: text('avatar_url'),
    /**
     * @deprecated Slated for removal in @minion-stack/db v0.3.0 (Phase 3c).
     * Personality preset now lives in gateway config at
     * `agents.list[].personality.preset`. Dropped by the 0013 migration.
     */
    personalityPreset: text('personality_preset', {
      enum: ['professional', 'casual', 'creative', 'technical'],
    }),
    /**
     * @deprecated Slated for removal in @minion-stack/db v0.3.0 (Phase 3c).
     * Personality text now lives in gateway config at
     * `agents.list[].personality.text`. Dropped by the 0013 migration.
     */
    personalityText: text('personality_text'),
    /**
     * @deprecated Slated for removal in @minion-stack/db v0.3.0 (Phase 3c).
     * Personality configured flag now lives in gateway config at
     * `agents.list[].personality.configured`. Dropped by the 0013 migration.
     */
    personalityConfigured: integer('personality_configured', { mode: 'boolean' })
      .notNull()
      .default(false),
    provisioningStatus: text('provisioning_status', {
      enum: ['pending', 'provisioning', 'active', 'error'],
    })
      .notNull()
      .default('pending'),
    provisioningError: text('provisioning_error'),
    lastRetryAt: integer('last_retry_at'),
    retryCount: integer('retry_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('idx_personal_agents_user').on(t.userId),
    index('idx_personal_agents_agent').on(t.agentId),
    index('idx_personal_agents_status').on(t.provisioningStatus),
  ],
);
