import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { gateway } from './gateway.js';

/** Per-gateway config settings. Mirrors Turso `settings`. tenant_id → organizations.id. */
export const settings = pgTable(
  'settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    section: text('section').notNull(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_settings_gateway_section').on(t.gatewayId, t.section),
    index('idx_settings_tenant').on(t.tenantId),
  ],
);
