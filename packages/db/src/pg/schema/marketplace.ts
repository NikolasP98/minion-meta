import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { gateway } from './gateway.js';

/** Marketplace agent catalog. Mirrors Turso `marketplace_agents`. */
export const marketplaceAgents = pgTable('marketplace_agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  category: text('category').notNull(),
  tags: text('tags').notNull(),
  description: text('description').notNull(),
  catchphrase: text('catchphrase'),
  version: text('version').notNull(),
  model: text('model'),
  // 'autonomous' | 'copilot' — drives the catalog avatar style. Nullable: legacy
  // rows + agents whose agent.json omits it fall back to the copilot baseline.
  archetype: text('archetype'),
  avatarSeed: text('avatar_seed').notNull(),
  githubPath: text('github_path').notNull(),
  soulMd: text('soul_md'),
  identityMd: text('identity_md'),
  userMd: text('user_md'),
  contextMd: text('context_md'),
  skillsMd: text('skills_md'),
  installCount: integer('install_count').default(0),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
  filesLoadedAt: timestamp('files_loaded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Per-tenant marketplace installs. tenant_id → organizations.id, server_id → gateway.id. */
export const marketplaceInstalls = pgTable(
  'marketplace_installs',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    agentId: text('agent_id')
      .notNull()
      .references(() => marketplaceAgents.id, { onDelete: 'cascade' }),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_marketplace_installs_tenant').on(t.tenantId),
    index('idx_marketplace_installs_agent').on(t.agentId),
  ],
);
