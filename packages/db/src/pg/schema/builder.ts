import { pgTable, uuid, text, integer, real, timestamp, index } from 'drizzle-orm/pg-core';
import { gateway } from './gateway.js';

/**
 * Visual builder (Workshop) tables. Mirrors Turso `built_*` / `agent_built_skills`.
 * FK remap on migration:
 *   server_id  → gateway_id (gateway.id, matched via gateway.legacy_server_id)
 *   tenant_id  → organizations.id (plain uuid, soft ref — enforced via RLS)
 *   created_by → kept as text (loose audit field, may be a legacy user id)
 *   created_at / updated_at / published_at (integer epoch) → timestamptz
 */

// ── Built Skills ──────────────────────────────────────────────────────
export const builtSkills = pgTable(
  'built_skills',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').default(''),
    emoji: text('emoji').default('📖'),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    maxCycles: integer('max_cycles').notNull().default(3),
    gatewayId: uuid('gateway_id').references(() => gateway.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id'),
    createdBy: text('created_by'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_built_skills_gateway').on(t.gatewayId),
    index('idx_built_skills_tenant').on(t.tenantId),
  ],
);

// ── Skill Tool Pool (junction: skill → gateway tool IDs) ─────────────
export const builtSkillTools = pgTable(
  'built_skill_tools',
  {
    id: text('id').primaryKey(),
    skillId: text('skill_id')
      .notNull()
      .references(() => builtSkills.id, { onDelete: 'cascade' }),
    toolId: text('tool_id').notNull(),
  },
  (t) => [index('idx_built_skill_tools_skill').on(t.skillId)],
);

// ── Chapters (subprocess nodes in the DAG) ───────────────────────────
export const builtChapters = pgTable(
  'built_chapters',
  {
    id: text('id').primaryKey(),
    skillId: text('skill_id')
      .notNull()
      .references(() => builtSkills.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['chapter', 'condition'] })
      .notNull()
      .default('chapter'),
    name: text('name').notNull(),
    description: text('description').default(''),
    guide: text('guide').default(''),
    context: text('context').default(''),
    outputDef: text('output_def').default(''),
    conditionText: text('condition_text').default(''),
    positionX: real('position_x').notNull().default(0),
    positionY: real('position_y').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_built_chapters_skill').on(t.skillId)],
);

// ── Chapter Edges (DAG connections between chapters) ─────────────────
export const builtChapterEdges = pgTable(
  'built_chapter_edges',
  {
    id: text('id').primaryKey(),
    skillId: text('skill_id')
      .notNull()
      .references(() => builtSkills.id, { onDelete: 'cascade' }),
    sourceChapterId: text('source_chapter_id')
      .notNull()
      .references(() => builtChapters.id, { onDelete: 'cascade' }),
    targetChapterId: text('target_chapter_id')
      .notNull()
      .references(() => builtChapters.id, { onDelete: 'cascade' }),
    label: text('label'),
  },
  (t) => [index('idx_built_chapter_edges_skill').on(t.skillId)],
);

// ── Chapter Tools (junction: chapter → subset of skill's tool pool) ──
export const builtChapterTools = pgTable(
  'built_chapter_tools',
  {
    id: text('id').primaryKey(),
    chapterId: text('chapter_id')
      .notNull()
      .references(() => builtChapters.id, { onDelete: 'cascade' }),
    toolId: text('tool_id').notNull(),
  },
  (t) => [index('idx_built_chapter_tools_chapter').on(t.chapterId)],
);

// ── Built Agents ─────────────────────────────────────────────────────
export const builtAgents = pgTable(
  'built_agents',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    emoji: text('emoji').default('🤖'),
    description: text('description').default(''),
    model: text('model'),
    systemPrompt: text('system_prompt').default(''),
    temperature: real('temperature').default(0.7),
    maxTokens: integer('max_tokens').default(4096),
    retryPolicy: text('retry_policy').default('{}'),
    fallbackAgentId: text('fallback_agent_id'),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    gatewayId: uuid('gateway_id').references(() => gateway.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id'),
    createdBy: text('created_by'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_built_agents_gateway').on(t.gatewayId),
    index('idx_built_agents_tenant').on(t.tenantId),
  ],
);

// ── Agent Skill Slots (junction: agent → skill with order) ───────────
export const builtAgentSkills = pgTable(
  'built_agent_skills',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => builtAgents.id, { onDelete: 'cascade' }),
    skillId: text('skill_id')
      .notNull()
      .references(() => builtSkills.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    configOverrides: text('config_overrides').default('{}'),
  },
  (t) => [index('idx_built_agent_skills_agent').on(t.agentId)],
);

// ── Agent Built Skills (junction: gateway agent → built skill) ────────
export const agentBuiltSkills = pgTable(
  'agent_built_skills',
  {
    id: text('id').primaryKey(),
    gatewayAgentId: text('gateway_agent_id').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    skillId: text('skill_id')
      .notNull()
      .references(() => builtSkills.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_agent_built_skills_gateway_agent').on(t.gatewayAgentId),
    index('idx_agent_built_skills_tenant').on(t.tenantId),
  ],
);

// ── Built Tools (admin-only playground) ──────────────────────────────
export const builtTools = pgTable(
  'built_tools',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').default(''),
    scriptCode: text('script_code').default(''),
    scriptLang: text('script_lang', { enum: ['javascript', 'python', 'bash'] })
      .notNull()
      .default('javascript'),
    envVars: text('env_vars').default('{}'),
    validationRules: text('validation_rules').default('{}'),
    executionConfig: text('execution_config').default('{}'),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    gatewayId: uuid('gateway_id').references(() => gateway.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id'),
    createdBy: text('created_by'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_built_tools_gateway').on(t.gatewayId),
    index('idx_built_tools_tenant').on(t.tenantId),
  ],
);
