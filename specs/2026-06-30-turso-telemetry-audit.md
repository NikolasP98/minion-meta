# Turso → "telemetry only" audit + `/api/jobs/tick` cron handoff

**Date:** 2026-06-30
**Context:** Directive — *"we should be using supabase where possible (turso is telemetry only)."* This audits what actually lives on prod Turso and what (if anything) still needs to move.

## TL;DR

Turso is **already ~99.99% telemetry by row count.** Of 54 tables, only two hold real volume and both are telemetry. Almost everything else is empty (superseded by Supabase PG) or a tiny config/identity remnant. **No urgent data migration is required** — the philosophy is effectively realized at the data layer. The remaining items are small cleanups, each needing per-table code-path verification.

## Row-count snapshot (prod Turso, 2026-06-30)

| Bucket | Tables (rows) | Verdict |
|---|---|---|
| **Telemetry — correct home, keep** | `unified_events` (144,857), `gateway_heartbeats` (33,003), `reliability_events` (0), `connection_events` (0), `credential_health_snapshots` (0), `skill_execution_stats` (0), `config_snapshots` (0), `agent_activity_bins` (0) | ✅ Event/metric streams — Turso is right. |
| **Tiny live remnants (feature/auth/identity)** | `marketplace_agents` (7), `user_preferences` (7), `personal_agents` (3), `workspace_membership` (3), `workshop_saves` (2), `channel_identities` (1), `device_identities` (1), `user_identities` (1), `organization` (1), `member` (1), `servers` (1), `jwks` (1) | ⚠️ Candidates to move to Supabase for purity. Low volume, but each has `getDb()` read/write paths to port. Not urgent. |
| **Dead / superseded** | `flows` (3), `flow_groups` (2) | 🗑️ Superseded by Supabase PG (`pg-schema/flows.ts`); rows are stale leftovers. Drop after confirming no writer. |
| **Empty (0 rows)** | ~35 tables: `agents`, `sessions`, `chat_messages`, `missions`, `tasks`, `session_tasks`, `skills`, `channels`, `channel_assignments`, `built_*` (agent builder), `marketplace_installs`, `files`, `settings`, `roles`, `role_permissions`, `backup_configs`, `server_backups`, `server_provision_configs`, `bugs`, `agent_groups`, `agent_group_members`, `user_agents`, `user_servers`, … | ❓ Either already served from Supabase or unused. No data to migrate; safe to drop after a code-path check (cleanup, not migration). |

## Recommendation

1. **Do nothing forced.** The big rows are telemetry; the philosophy holds today.
2. **Opportunistic purity (low priority):** when next touching any "tiny live remnant" table's feature code, port it to a Supabase `pg-schema/*` table (the `notes.ts`/`workshop-experiments.ts` pattern) and drop the Turso copy. `user_preferences` and `personal_agents` are the most user-facing.
3. **Cleanup (separate PR, needs verification):** drop the dead `flows`/`flow_groups` Turso copies and the empty legacy tables once a grep confirms no `getDb()` writer remains. This is reversible-with-care but should be its own reviewed change, not bundled.
4. **New tables:** always Supabase PG from now on (workshop + bg_jobs already follow this).

Data migration of any *non-empty* table is out of scope here — it needs a per-table plan (dual-write or backfill + cutover) and sign-off.

## `/api/jobs/tick` cron handoff

The global bg-runtime advances jobs server-side via `GET /api/jobs/tick` (Bearer `CRON_SECRET`). It's already in the `hooks.server.ts` unauth allowlist. Group chat also advances while a page is open (the client nudges `/advance`), so the cron is only needed for **closed-page durability**.

Wiring is the same external-scheduler pattern as the other ticks (Vercel per-minute crons aren't on the current plan — `vercel.json` `crons` is empty; the live driver is the netcup crontab). Add on the netcup VPS crontab:

```cron
* * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://hub.minion-ai.org/api/jobs/tick >/dev/null 2>&1
```

`CRON_SECRET` is already set in the hub's prod env (the other ticks use it). **Not applied automatically** — this adds a recurring job that can incur LLM cost (advancing background group chats), so it's left for explicit application on the prod box.
