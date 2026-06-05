import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { gateway } from './gateway.js';

/**
 * Agent sessions + per-session task boards.
 * Mirrors Turso `sessions` / `session_tasks`.
 * FK remap: server_id → gateway_id, tenant_id → organizations.id (soft-ref),
 * integer epoch timestamps → timestamptz.
 */

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    agentId: text('agent_id').notNull(),
    sessionKey: text('session_key').notNull(),
    status: text('status', { enum: ['running', 'thinking', 'idle', 'aborted', 'completed'] })
      .notNull()
      .default('idle'),
    metadata: text('metadata'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_sessions_tenant').on(t.tenantId),
    index('idx_sessions_gateway').on(t.gatewayId),
    uniqueIndex('sessions_uniq_key').on(t.tenantId, t.gatewayId, t.sessionKey),
  ],
);

export const sessionTasks = pgTable(
  'session_tasks',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    sessionKey: text('session_key').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: ['backlog', 'todo', 'in_progress', 'done'] })
      .notNull()
      .default('backlog'),
    sortOrder: integer('sort_order').notNull().default(0),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_session_tasks_tenant').on(t.tenantId),
    index('idx_session_tasks_gateway_session').on(t.gatewayId, t.sessionKey),
  ],
);
