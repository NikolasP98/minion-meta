import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { gateway } from './gateway.js';

/**
 * Server/gateway provisioning + backup operations.
 * Mirrors Turso `server_backups` / `server_provision_configs` / `backup_configs` / `config_snapshots`.
 * FK remap: server_id → gateway_id (gateway.id via legacy_server_id),
 * tenant_id → organizations.id (plain uuid soft-ref, RLS-enforced).
 * Type remap: integer epoch → timestamptz, integer boolean-flags → boolean,
 * size_bytes integer → bigint.
 */

export const serverBackups = pgTable(
  'server_backups',
  {
    id: text('id').primaryKey(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    snapshotPath: text('snapshot_path').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    status: text('status', { enum: ['running', 'complete', 'failed'] })
      .notNull()
      .default('running'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_server_backups_gateway').on(t.gatewayId),
    index('idx_server_backups_tenant').on(t.tenantId),
  ],
);

export const serverProvisionConfigs = pgTable(
  'server_provision_configs',
  {
    id: text('id').primaryKey(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    // SSH connection
    sshHost: text('ssh_host'),
    sshUser: text('ssh_user').default('root'),
    sshPort: integer('ssh_port').default(22),

    // Credentials (encrypted)
    apiKey: text('api_key'),
    apiKeyIv: text('api_key_iv'),

    // Agent config
    agentName: text('agent_name'),
    sandboxMode: text('sandbox_mode', { enum: ['non-main', 'always', 'never'] }).default('non-main'),
    dmPolicy: text('dm_policy', { enum: ['pairing', 'solo', 'disabled'] }).default('pairing'),

    // Install config
    installMethod: text('install_method', { enum: ['package', 'source'] }).default('package'),
    pkgManager: text('pkg_manager', { enum: ['npm', 'bun'] }).default('npm'),

    // Gateway config
    gatewayPort: integer('gateway_port').default(18789),
    gatewayBind: text('gateway_bind', { enum: ['loopback', 'all'] }).default('loopback'),

    // Channel toggles
    enableWhatsapp: boolean('enable_whatsapp').default(false),
    enableTelegram: boolean('enable_telegram').default(false),
    enableDiscord: boolean('enable_discord').default(false),

    // Provision state
    phaseStatuses: text('phase_statuses').default('{}'),
    lastProvisionAt: timestamp('last_provision_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('provision_configs_uniq_gateway').on(t.gatewayId),
    index('idx_provision_configs_tenant').on(t.tenantId),
  ],
);

export const backupConfigs = pgTable(
  'backup_configs',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    backupHost: text('backup_host'),
    backupUser: text('backup_user').default('root'),
    backupPort: integer('backup_port').default(22),
    backupBasePath: text('backup_base_path').default('/mnt/agent-data/backups'),
    schedule: text('schedule'),
    retentionCount: integer('retention_count').default(7),
    enabled: boolean('enabled').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_backup_configs_tenant').on(t.tenantId)],
);

export const configSnapshots = pgTable(
  'config_snapshots',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    gatewayId: uuid('gateway_id')
      .notNull()
      .references(() => gateway.id, { onDelete: 'cascade' }),
    configJson: text('config_json').notNull(),
    configHash: text('config_hash').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('idx_config_snapshots_gateway').on(t.gatewayId)],
);
