import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  real,
  timestamp,
  jsonb,
  vector,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Org-scoped agent memory corpus with pgvector embeddings. This is the
 * system-of-record home for agent memories (migrated off the gateway-local
 * LanceDB store): semantic memory, session-memory summaries, and captured
 * facts/preferences/decisions/entities. Both the hub (visualization) and the
 * flow runner (RAG retrieval) read from here.
 *
 * Embedding dimension matches OpenAI `text-embedding-3-small` (1536). If the
 * embedding model changes, add a new column / table rather than mixing
 * dimensions in one column.
 *
 * RLS (org isolation) is added in the hand-written companion migration
 * `<ts>_agent_memories_rls.sql` (role app_ledger + app.current_org_id GUC),
 * mirroring `messages`. Drizzle does not manage roles/policies, the `vector`
 * extension, or the HNSW index — those live in the companion SQL.
 */
export const agentMemories = pgTable(
  'agent_memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // RLS pivot. Better Auth org id (text), matches messages.org_id convention.
    orgId: text('org_id').notNull(),
    // Producing gateway/server id (hub servers.id; text — not a PG uuid).
    gatewayId: text('gateway_id'),
    // Memory is agent-scoped; agentId is the gateway agent id (text).
    agentId: text('agent_id').notNull(),
    // Optional owner for personal memories (profiles.id); null = agent-global.
    profileId: uuid('profile_id'),
    // The memory content (what gets embedded + shown).
    content: text('content').notNull(),
    // OpenAI text-embedding-3-small dimension. Nullable so a row can be inserted
    // before its embedding is computed (async backfill).
    embedding: vector('embedding', { dimensions: 1536 }),
    category: text('category', {
      enum: ['preference', 'fact', 'decision', 'entity', 'other'],
    })
      .notNull()
      .default('other'),
    // 0..1 salience used for ranking + decay.
    importance: real('importance').notNull().default(0.5),
    // Which subsystem produced this row: lancedb | session | manual | kg | ledger.
    source: text('source').notNull().default('manual'),
    // Original id in the source system (e.g. LanceDB MemoryEntry.id) — enables
    // idempotent migration + dedupe.
    sourceId: text('source_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (t) => ({
    // Idempotent migration / cross-source dedupe.
    sourceUnique: uniqueIndex('agent_memories_source_uniq')
      .on(t.orgId, t.source, t.sourceId)
      .where(sql`source_id is not null`),
    orgAgentIdx: index('agent_memories_org_agent_idx').on(t.orgId, t.agentId),
    orgCategoryIdx: index('agent_memories_org_category_idx').on(t.orgId, t.category),
    orgTimeIdx: index('agent_memories_org_time_idx').on(t.orgId, t.createdAt),
  }),
);
