import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { gateway } from './gateway.js';
import { sessions } from './sessions.js';

/**
 * Missions (per-session goals) + their tasks.
 * Mirrors Turso `missions` / `tasks`.
 * FK remap: server_id → gateway_id, tenant_id → organizations.id (soft-ref),
 * session_id → sessions.id, integer epoch timestamps → timestamptz.
 */

export const missions = pgTable(
  'missions',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: ['active', 'completed', 'cancelled'] })
      .notNull()
      .default('active'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_missions_tenant').on(t.tenantId),
    index('idx_missions_session').on(t.sessionId),
    index('idx_missions_gateway').on(t.gatewayId),
  ],
);

export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    missionId: text('mission_id')
      .notNull()
      .references(() => missions.id, { onDelete: 'cascade' }),
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
  (t) => [index('idx_tasks_tenant').on(t.tenantId), index('idx_tasks_mission').on(t.missionId)],
);
