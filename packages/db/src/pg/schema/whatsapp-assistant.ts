import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  integer,
  uniqueIndex,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { channels } from './channels.js';

const time = (name: string) => timestamp(name, { withTimezone: true });

/** Server-only tables. RLS policies and fencing triggers are installed by the Hub migration. */
export const whatsappAccountLeases = pgTable('whatsapp_account_leases', {
  channelId: text('channel_id')
    .primaryKey()
    .references(() => channels.id),
  orgId: uuid('org_id').notNull(),
  ownerId: text('owner_id').notNull(),
  generation: bigint('generation', { mode: 'bigint' }).notNull().default(1n),
  leaseUntil: time('lease_until').notNull(),
  heartbeatAt: time('heartbeat_at').notNull().defaultNow(),
  state: text('state', {
    enum: ['starting', 'connecting', 'ready', 'reconnecting', 'needs_relink', 'stopped', 'stale'],
  })
    .notNull()
    .default('starting'),
});

export const whatsappAssistantTurns = pgTable(
  'whatsapp_assistant_turns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id),
    providerMessageId: text('provider_message_id').notNull(),
    orgId: uuid('org_id').notNull(),
    profileId: uuid('profile_id').notNull(),
    identityId: uuid('identity_id').notNull(),
    claimRevision: bigint('claim_revision', { mode: 'bigint' }).notNull(),
    senderPhone: text('sender_phone').notNull(),
    senderJid: text('sender_jid').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    gatewayId: uuid('gateway_id').notNull(),
    agentId: text('agent_id').notNull(),
    sessionKey: text('session_key').notNull(),
    runId: uuid('run_id').notNull().defaultRandom(),
    leaseGeneration: bigint('lease_generation', { mode: 'bigint' }).notNull(),
    ownerId: text('owner_id').notNull(),
    state: text('state', {
      enum: ['admitted', 'running', 'completed', 'cancelled', 'failed', 'reconcile_required'],
    })
      .notNull()
      .default('admitted'),
    createdAt: time('created_at').notNull().defaultNow(),
    updatedAt: time('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('whatsapp_assistant_turns_channel_id_provider_message_id_key').on(
      t.channelId,
      t.providerMessageId,
    ),
    uniqueIndex('whatsapp_one_running_conversation')
      .on(t.sessionKey)
      .where(sql`${t.state} = 'running'`),
  ],
);

export const whatsappAssistantReplies = pgTable(
  'whatsapp_assistant_replies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    turnId: uuid('turn_id')
      .notNull()
      .references(() => whatsappAssistantTurns.id),
    orgId: uuid('org_id').notNull(),
    replyPart: integer('reply_part').notNull(),
    body: text('body').notNull(),
    contentHash: text('content_hash').notNull(),
    state: text('state', { enum: ['pending', 'sending', 'confirmed', 'unknown', 'cancelled'] })
      .notNull()
      .default('pending'),
    providerMessageId: text('provider_message_id'),
    createdAt: time('created_at').notNull().defaultNow(),
    updatedAt: time('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('whatsapp_assistant_replies_turn_id_reply_part_key').on(t.turnId, t.replyPart),
    check('whatsapp_assistant_replies_reply_part_check', sql`${t.replyPart} between 0 and 99`),
    check('whatsapp_assistant_replies_body_check', sql`length(${t.body}) <= 16000`),
  ],
);

export const assistantActionReceipts = pgTable(
  'assistant_action_receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    principalId: uuid('principal_id').notNull(),
    orgId: uuid('org_id').notNull(),
    turnId: uuid('turn_id').notNull(),
    actionId: text('action_id').notNull(),
    argsHash: text('args_hash').notNull(),
    state: text('state', { enum: ['prepared', 'committed', 'unknown'] })
      .notNull()
      .default('prepared'),
    createdAt: time('created_at').notNull().defaultNow(),
    updatedAt: time('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('assistant_action_receipts_principal_id_org_id_turn_id_action_id_key').on(
      t.principalId,
      t.orgId,
      t.turnId,
      t.actionId,
    ),
  ],
);

export const whatsappAssistantConfirmations = pgTable(
  'whatsapp_assistant_confirmations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    profileId: uuid('profile_id').notNull(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channels.id),
    identityId: uuid('identity_id').notNull(),
    claimRevision: bigint('claim_revision', { mode: 'bigint' }).notNull(),
    sessionKey: text('session_key').notNull(),
    previewTurnId: uuid('preview_turn_id')
      .notNull()
      .references(() => whatsappAssistantTurns.id),
    actionName: text('action_name').notNull(),
    argsHash: text('args_hash').notNull(),
    expiresAt: time('expires_at')
      .notNull()
      .default(sql`now() + interval '10 minutes'`),
    consumedAt: time('consumed_at'),
  },
  (t) => [
    uniqueIndex('whatsapp_one_pending_confirmation')
      .on(t.sessionKey)
      .where(sql`${t.consumedAt} IS NULL`),
  ],
);

/** Canonical delete receipts prevent delayed gateway mirrors from resurrecting forgotten facts. */
export const agentMemoryTombstones = pgTable(
  'agent_memory_tombstones',
  {
    orgId: text('org_id').notNull(),
    agentId: text('agent_id').notNull(),
    source: text('source').notNull(),
    sourceId: text('source_id').notNull(),
    profileId: uuid('profile_id'),
    deletedAt: time('deleted_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.agentId, t.source, t.sourceId] })],
);
