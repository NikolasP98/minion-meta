import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/** Per-tenant device keypair. Mirrors Turso `device_identities`. tenant_id → organizations.id. */
export const deviceIdentities = pgTable('device_identities', {
  id: text('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().unique(),
  deviceId: text('device_id').notNull(),
  publicKeyPem: text('public_key_pem').notNull(),
  privateKeyPem: text('private_key_pem').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
