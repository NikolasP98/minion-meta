---
"@minion-stack/db": minor
---

Add Postgres schema variants for the full Turso→Supabase split. Ports ~35 application tables from the SQLite/Turso schema to Drizzle pg-core under `@minion-stack/db/pg`: personal_agents, user_preferences, settings, workshop_saves, device_identities, files, agent_groups, marketplace, the builder set (built_skills/built_agents/built_tools + chapters/edges/junctions), channels/channel_assignments/channel_identities, sessions/session_tasks/missions/tasks, chat_messages, user_agents, skills/skill_execution_stats, and server ops (server_backups/server_provision_configs/backup_configs/config_snapshots) + workspace_membership.

FK remap: server_id → gateway_id, tenant_id → organizations.id (soft uuid ref, RLS-enforced), user_id → profiles.id. Type remap: integer epoch → timestamptz, integer-boolean → boolean, autoincrement id → bigserial, size_bytes → bigint. Additive only — the existing SQLite exports are unchanged.
