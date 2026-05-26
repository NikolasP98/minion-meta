import { pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// Partial unique index (one open request per user/org) is created in the
// hand-written migration (Task 5), since the WHERE-predicate form isn't
// expressed cleanly here. Keep this table definition free of an index callback.
export const joinRequest = pgTable('join_request', {
  id: uuid('id').primaryKey().defaultRandom(),
  // GoTrue auth.users.id (== profiles.id). The requester's Supabase identity.
  supabaseId: uuid('supabase_id').notNull(),
  // Bridged hub id (profiles.legacy_user_id ?? supabaseId) — the value used as the
  // Turso `member.user_id` key when the request is approved. Distinct from supabase_id.
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  message: text('message'),
  status: text('status', { enum: ['pending', 'approved', 'denied'] }).notNull().default('pending'),
  // Turso organization id (cross-DB reference; orgs live in Turso, so no PG FK).
  organizationId: text('organization_id').notNull(),
  requestedRole: text('requested_role', { enum: ['user', 'admin', 'super_admin'] }).notNull().default('user'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const joinLink = pgTable('join_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  // Turso organization id (cross-DB reference; orgs live in Turso, so no PG FK).
  organizationId: text('organization_id').notNull(),
  role: text('role', { enum: ['user', 'admin', 'super_admin'] }).notNull(),
  createdBy: text('created_by').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  maxUses: integer('max_uses'),
  usesCount: integer('uses_count').notNull().default(0),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
