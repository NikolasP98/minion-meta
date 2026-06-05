import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/** Workshop canvas saves. Mirrors Turso `workshop_saves`. profile_id/tenant_id nullable (pre-migration shared). */
export const workshopSaves = pgTable('workshop_saves', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  state: text('state').notNull(),
  thumbnail: text('thumbnail'),
  profileId: uuid('profile_id'),
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
