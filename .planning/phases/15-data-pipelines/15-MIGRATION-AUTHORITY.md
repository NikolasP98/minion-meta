# Migration authority inventory

Generated 2026-09-10T05:43:44.605Z. Read-only filesystem inventory; never connects to a database or network. This document is a source-of-truth candidate map, not a deployment or applied-migration certificate.

## Applied-migration catalog

Not verified: read-only inventory tool; never opens a network or database connection. Env hints present: none. This is an explicit evidence gap, not a pass.

## Migration trees

|Tree|Schema group|Directory|Status|Files|Consumer|
|---|---|---|---|---|---|
|hub-legacy-drizzle|legacy-libsql|minion_hub/drizzle|present|17|minion_hub/src/server/run-migrations.ts reads ./drizzle against TURSO_DB_URL|
|packages-db-legacy-drizzle|legacy-libsql|packages/db/drizzle|present|18|@minion-stack/db/schema, imported by minion_hub AND minion_site (both drizzle(client,{schema}) over TURSO_DB_URL)|
|hub-supabase|hub-postgres|minion_hub/supabase/migrations|present|67|minion_hub SUPABASE_DB_URL; no minion_hub/supabase/config.toml project link found on disk|
|meta-root-supabase|hub-postgres|supabase/migrations|present|89|packages/db/drizzle.pg.config.ts generates here (out: ../../supabase/migrations); supabase/config.toml links project_id|
|gateway-sqlite|gateway-sqlite|minion/src/db/migrations|present|5|minion gateway local/embedded sqlite state|
|paperclip-postgres|paperclip-postgres|paperclip-minion/packages/db/src/migrations|present|113|paperclip-minion packages/db (own drizzle-kit sequence)|

## Duplicate-authority conflicts

- **legacy-libsql** two independent writers share numeric prefix `0012`: hub-legacy-drizzle:0012_user_alias_role.sql vs packages-db-legacy-drizzle:0012_drop_personal_agents_display_name.sql vs packages-db-legacy-drizzle:0012_workspace_membership.sql
- **legacy-libsql** two independent writers share numeric prefix `0013`: hub-legacy-drizzle:0013_roles.sql vs packages-db-legacy-drizzle:0013_drop_personal_agents_personality.sql vs packages-db-legacy-drizzle:0013_join_requests.sql
- **legacy-libsql** two independent writers share numeric prefix `0014`: hub-legacy-drizzle:0014_user_identities.sql vs packages-db-legacy-drizzle:0014_perf_indexes_events_bugs.sql
- **legacy-libsql** two independent writers share numeric prefix `0015`: hub-legacy-drizzle:0015_flows_trigger_columns.sql vs packages-db-legacy-drizzle:0015_drop_dead_event_indexes.sql
- **hub-postgres** divergent hash for `20260610180600_pending_channel_claims.sql`: hub-supabase=125370a0a244 vs meta-root-supabase=e3552d4eed9c
- **hub-postgres** divergent hash for `20260611003100_org_areas.sql`: hub-supabase=d71149becda7 vs meta-root-supabase=e264f4e1b4e1
- **hub-postgres** divergent hash for `20260611005800_org_areas_integrations.sql`: hub-supabase=28caaca7a6ae vs meta-root-supabase=527e46a5f2d7

## Schema gaps (declared table, no CREATE found in any inventoried tree)

- `organizations` (hub-postgres): verified-absent-in-inventoried-migrations
- `flows` (hub-postgres): verified-absent-in-inventoried-migrations
- `organization_members` (hub-postgres): verified-absent-in-inventoried-migrations

## Recommendation

One owning tree per schema group: `hub-postgres` should be authored from a single migration directory with an explicit `config.toml` project link; `legacy-libsql` should retire one of `minion_hub/drizzle` or `packages/db/drizzle` rather than both generating against the same consumed schema. See `15-MIGRATION-GAPS.md` for the exact per-conflict child-plan proposal. This inventory does not itself resolve a conflict or apply a migration.
