import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { user } from './auth/index.js';
import { organization } from './auth/index.js';

/**
 * join_requests — users requesting to join an organization.
 *
 * When a user not-yet-in-an-org wants access, they submit a join request.
 * Org admins review (approve/deny). On approval the user is added as a member.
 *
 * Used by:
 *   - /join page (submission)
 *   - /api/join-requests/* (listing, counting, review)
 *   - notifications panel
 */
export const joinRequests = sqliteTable(
  'join_requests',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    message: text('message'),
    status: text('status', { enum: ['pending', 'approved', 'denied'] })
      .notNull()
      .default('pending'),
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('idx_join_requests_user').on(t.userId),
    index('idx_join_requests_org_status').on(t.orgId, t.status),
  ],
);

export type JoinRequest = typeof joinRequests.$inferSelect;
export type NewJoinRequest = typeof joinRequests.$inferInsert;
