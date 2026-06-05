import { pgTable, uuid, text, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';

/**
 * workspace_membership — bridge between hub identity and Paperclip company tenancy.
 * Mirrors Turso `workspace_membership`. FK remap: user_id → profiles.id (via legacy_user_id).
 * Each row means "user X holds role Y in Paperclip company Z".
 */
export const workspaceMembership = pgTable(
  'workspace_membership',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    paperclipCompanyId: text('paperclip_company_id').notNull(),
    role: text('role').notNull().default('admin'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.paperclipCompanyId] }),
    index('idx_workspace_membership_user').on(t.userId),
  ],
);

export type WorkspaceMembership = typeof workspaceMembership.$inferSelect;
export type NewWorkspaceMembership = typeof workspaceMembership.$inferInsert;
