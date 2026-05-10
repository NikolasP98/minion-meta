import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { user } from './auth/index.js';

/**
 * workspace_membership — bridge between hub identity and Paperclip company tenancy.
 *
 * Each row means "user X holds role Y in Paperclip company Z".
 * Composite PK: a user may belong to many Paperclip companies.
 *
 * Used by:
 *   - CompanySwitcher (Task 10): lists rows for the current user
 *   - JWT mint (Task 8): uses the selected row's paperclipCompanyId as the JWT companyId claim
 */
export const workspaceMembership = sqliteTable(
  'workspace_membership',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    paperclipCompanyId: text('paperclip_company_id').notNull(),
    role: text('role').notNull().default('admin'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.paperclipCompanyId] }),
    index('idx_workspace_membership_user').on(t.userId),
  ],
);

export type WorkspaceMembership = typeof workspaceMembership.$inferSelect;
export type NewWorkspaceMembership = typeof workspaceMembership.$inferInsert;
