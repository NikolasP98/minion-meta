---
"@minion-stack/db": minor
---

Remove Drizzle schema definitions for Turso tables that were already dropped in prod and are now owned by their PG replacements (see `./pg/schema/`). No runtime behavior change for consumers — hub/site were verified to not import any of the removed exports.

Removed schema files (`packages/db/src/schema/`): `missions.ts`, `tasks.ts`, `session-tasks.ts`, `skills.ts`, `channels.ts`, `channel-assignments.ts`, `builder.ts`, `marketplace-installs.ts`, `files.ts`, `settings.ts`, `backup-configs.ts`, `server-backups.ts`, `server-provision-configs.ts`, `agent-groups.ts`.

Removed exports from `@minion-stack/db` (both `.` and `./schema` entry points): `missions`, `tasks`, `sessionTasks`, `skills`, `channels`, `channelAssignments`, `marketplaceInstalls`, `files`, `settings`, `backupConfigs`, `serverBackups`, `serverProvisionConfigs`, `agentGroups`, `agentGroupMembers`, `builtSkills`, `builtSkillTools`, `builtChapters`, `builtChapterEdges`, `builtChapterTools`, `builtAgents`, `builtAgentSkills`, `builtTools`, `agentBuiltSkills`.

`./relations` trimmed to match: dropped the relation blocks for the tables above, and removed now-dangling references to them from the relation blocks of tables that stay (`user` no longer relates to `files`; `organization` no longer relates to `files`; `servers` no longer relates to `skills`/`settings`/`serverBackups`/`agentGroups`; `sessions` no longer relates to `missions`).
