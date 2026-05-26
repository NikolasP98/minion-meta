import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Canonical app-level user. 1:1 with GoTrue `auth.users` (id is the same uuid).
 * GoTrue owns auth.users; this row is created post-signup by identity-sync.
 * We intentionally do NOT add a Drizzle FK to auth.users (auth schema is
 * GoTrue-managed); the FK is declared in the hand-written RLS/constraints
 * migration instead.
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // == auth.users.id
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role', { enum: ['user', 'admin'] })
    .notNull()
    .default('user'),
  personalAgentId: text('personal_agent_id'),
  // Better Auth `user.id` (text) this profile was migrated from. Null for
  // users created natively in Supabase. Lets Phase 2 remap legacy FKs.
  legacyUserId: text('legacy_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
