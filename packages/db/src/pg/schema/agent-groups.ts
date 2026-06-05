import { pgTable, uuid, text, integer, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';

/** User-defined agent groupings. Mirrors Turso `agent_groups`. user_id → profile_id, tenant_id → organizations.id. */
export const agentGroups = pgTable(
  'agent_groups',
  {
    id: text('id').primaryKey(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_agent_groups_profile').on(t.profileId, t.tenantId)],
);

export const agentGroupMembers = pgTable(
  'agent_group_members',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => agentGroups.id, { onDelete: 'cascade' }),
    agentId: text('agent_id').notNull(),
    sortOrder: integer('sort_order').default(0),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.agentId] })],
);
