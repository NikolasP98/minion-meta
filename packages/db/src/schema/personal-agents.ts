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
    avatarUrl: text('avatar_url'),
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
