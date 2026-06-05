import { pgTable, uuid, text, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';
import { gateway } from './gateway.js';
import { profiles } from './profiles.js';

/**
 * User ↔ agent access grants. Mirrors Turso `user_agents`.
 * FK remap: user_id → profiles.id (via legacy_user_id), server_id → gateway_id.
 */
export const userAgents = pgTable(
  'user_agents',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    agentId: text('agent_id').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.agentId, t.gatewayId] }),
    index('idx_user_agents_gateway').on(t.gatewayId),
  ],
);
