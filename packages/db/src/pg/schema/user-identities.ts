import { pgTable, uuid, text, timestamp, bigint, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles.js';

/**
 * Canonical per-user identity row linking a user to BOTH OAuth providers
 * (kind='oauth', e.g. google) AND channel identities (kind='channel',
 * e.g. whatsapp/telegram/discord/signal/slack). This is the single link
 * table replacing the SQLite channel_identities + the oauth side of account.
 * Secret material (OAuth refresh-token ADC blob) is app-level AES-256-GCM
 * sealed into secretCiphertext/secretIv; null for channel identities.
 */
export const userIdentities = pgTable(
  'user_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'google'|'whatsapp'|'telegram'|'discord'|'signal'|'slack'
    kind: text('kind', { enum: ['oauth', 'channel'] }).notNull(),
    externalId: text('external_id').notNull(),
    displayName: text('display_name'),
    scope: text('scope'),
    secretCiphertext: text('secret_ciphertext'),
    secretIv: text('secret_iv'),
    expiresAt: bigint('expires_at', { mode: 'number' }),
    verifiedAt: bigint('verified_at', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_user_identity_unique').on(t.provider, t.externalId),
    index('idx_user_identity_user').on(t.userId),
  ],
);
