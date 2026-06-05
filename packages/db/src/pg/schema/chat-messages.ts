import { pgTable, uuid, text, bigserial, timestamp, index } from 'drizzle-orm/pg-core';
import { gateway } from './gateway.js';

/**
 * Persisted chat transcript. Mirrors Turso `chat_messages`.
 * FK remap: server_id → gateway_id, tenant_id → organizations.id (soft-ref).
 * id: SQLite autoincrement integer → Postgres bigserial.
 * timestamp / created_at: integer epoch (ms) → timestamptz.
 */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    agentId: text('agent_id').notNull(),
    sessionKey: text('session_key').notNull(),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    runId: text('run_id'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_chat_tenant').on(t.tenantId),
    index('idx_chat_by_agent').on(t.agentId, t.sessionKey, t.timestamp),
  ],
);
