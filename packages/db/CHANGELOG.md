# @minion-stack/db

## 0.6.0

### Minor Changes

- b5bb115: Add Postgres schema variants for the full Turso→Supabase split. Ports ~35 application tables from the SQLite/Turso schema to Drizzle pg-core under `@minion-stack/db/pg`: personal_agents, user_preferences, settings, workshop_saves, device_identities, files, agent_groups, marketplace, the builder set (built_skills/built_agents/built_tools + chapters/edges/junctions), channels/channel_assignments/channel_identities, sessions/session_tasks/missions/tasks, chat_messages, user_agents, skills/skill_execution_stats, and server ops (server_backups/server_provision_configs/backup_configs/config_snapshots) + workspace_membership.

  FK remap: server_id → gateway_id, tenant_id → organizations.id (soft uuid ref, RLS-enforced), user_id → profiles.id. Type remap: integer epoch → timestamptz, integer-boolean → boolean, autoincrement id → bigserial, size_bytes → bigint. Additive only — the existing SQLite exports are unchanged.

## 0.5.0

### Minor Changes

- 7e44bd0: Add the universal, org-scoped `messages` ledger table (Postgres) with database-enforced row-level security: a non-bypass `app_ledger` role plus an `app.current_org_id` GUC org-isolation policy (fail-closed). This is the canonical store every comms channel writes to via the gateway outbox → hub ingest path; channel-specific fields live in a `metadata` jsonb column.

## 0.4.0

### Minor Changes

- Add a dedicated `@minion-stack/db/crypto` export with the canonical app-level
  AES-256-GCM secret helpers (`sealSecret`/`openSecret` plus
  `encrypt`/`decrypt`/`encryptToken`/`decryptToken` aliases). The PG identity
  path (`./pg` crypto) now re-exports this single implementation, and
  `minion_hub`'s `crypto.ts` can become a thin re-export — eliminating the
  byte-matched duplicate implementations. No change to the ciphertext layout or
  key derivation, so existing encrypted data remains readable.

## 0.3.0

### Minor Changes

- fb4ad05: Add `./pg` export: Postgres-dialect identity schema (`profiles`, `user_identities`) plus identity helpers (`mapGoogleIdentity`, `sealSecret`/`openSecret`) for the Supabase auth migration (Phase 1a). The crypto helper's byte layout matches `minion_hub`'s AES-256-GCM scheme so hub and the site decrypt identity secrets interchangeably.

## 0.2.0

### Minor Changes

- a247371: Initial release: Drizzle ORM schema for the Minion shared database (LibSQL/Turso). Exports schema types, relations, and utilities extracted from minion_hub.
