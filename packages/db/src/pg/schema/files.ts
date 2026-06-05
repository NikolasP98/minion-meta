import { pgTable, uuid, text, bigint, timestamp, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';

/** B2-backed file records. Mirrors Turso `files`. tenant_id → organizations.id, uploaded_by → profiles.id. */
export const files = pgTable(
  'files',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    uploadedBy: uuid('uploaded_by').references(() => profiles.id, { onDelete: 'set null' }),
    b2FileKey: text('b2_file_key').notNull(),
    fileName: text('file_name').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    category: text('category').notNull().default('general'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_files_tenant').on(t.tenantId)],
);
