import { pgTable, uuid, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';

/**
 * Per-user UI/feature preferences. Mirrors Turso `user_preferences`.
 * userId (Turso text) is remapped to profile_id (uuid → profiles.id) on migration.
 */
export const userPreferences = pgTable(
  'user_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    section: text('section').notNull(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_user_prefs_profile_section').on(t.profileId, t.section),
    index('idx_user_prefs_profile').on(t.profileId),
  ],
);
