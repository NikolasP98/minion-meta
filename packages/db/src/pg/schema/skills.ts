import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  bigserial,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { gateway } from './gateway.js';

/**
 * Gateway skill registry + execution telemetry.
 * Mirrors Turso `skills` / `skill_execution_stats`.
 * FK remap: server_id → gateway_id, tenant_id → organizations.id (soft-ref).
 * boolean cols stay boolean; integer epoch → timestamptz; autoincrement id → bigserial.
 */

export const skills = pgTable(
  'skills',
  {
    skillKey: text('skill_key').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    emoji: text('emoji'),
    bundled: boolean('bundled').notNull().default(false),
    disabled: boolean('disabled').notNull().default(false),
    eligible: boolean('eligible').notNull().default(false),
    rawJson: text('raw_json').notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.skillKey, t.gatewayId] }),
    index('idx_skills_tenant').on(t.tenantId),
  ],
);

export const skillExecutionStats = pgTable(
  'skill_execution_stats',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    agentId: text('agent_id'),
    skillName: text('skill_name').notNull(),
    sessionKey: text('session_key'),
    status: text('status', { enum: ['ok', 'auth_error', 'timeout', 'error'] }).notNull(),
    durationMs: integer('duration_ms'),
    errorMessage: text('error_message'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_skill_stats_gateway_skill_time').on(t.gatewayId, t.skillName, t.occurredAt),
    index('idx_skill_stats_tenant').on(t.tenantId),
  ],
);
