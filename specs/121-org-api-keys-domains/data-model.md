# Data model

Both tables follow the hub's organization-table pattern (`supabase/migrations/20261025100000_crm_doors.sql:76-89`): `org_id text`, row level security enabled and forced, policy `<table>_org_guc` on `current_setting('app.current_org_id', true)`, `revoke all … from public, anon, authenticated`, `grant select, insert, update … to app_ledger` (no delete). Drizzle mirrors go in `src/server/db/pg-org-integrations-schema.ts` (new file).

## `org_api_keys`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk, `gen_random_uuid()` | |
| `org_id` | text not null | |
| `name` | text not null | 1–60 characters, trimmed |
| `prefix` | text not null, unique | 8 hex characters; shown in the list as `mk_<prefix>_…` |
| `key_hash` | text not null | SHA-256 hex of the whole key |
| `scopes` | jsonb not null default `["doors:submit"]` | stored for later; not a choice in the base |
| `created_by` | uuid | profile id; kept when the person leaves |
| `created_at` | timestamptz not null default `now()` | |
| `last_used_at` | timestamptz | at most one minute stale |
| `revoked_by` / `revoked_at` | uuid / timestamptz | revoked = `revoked_at is not null`; never cleared |

Rules: at most 10 rows per organization with `revoked_at is null` (count then insert; a race may exceed by one, accepted). Lookup by `prefix` happens before the organization is known, on the bypass connection (new entry in `rls-bypass-inventory.json`).

## `org_domains`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `org_id` | text not null | |
| `host` | text not null | lower case ASCII host name, at least three labels |
| `target_label` | text not null, unique | 16 base32 characters; the record value is `<target_label>.<suffix>` |
| `status` | text not null default `pending`, check in (`pending`, `active`) | |
| `check_state` | jsonb | last check: `{ at, dns: 'missing'|'mismatch'|'ok', found?, hosting?: 'challenge'|'issuing'|'ready'|'error', records?: [{type,name,value}] }` |
| `created_by` / `created_at` | uuid / timestamptz | |
| `activated_at` | timestamptz | |
| `removed_by` / `removed_at` | uuid / timestamptz | soft delete |

Indexes: unique `(org_id, host) where removed_at is null`; unique `(host) where status = 'active' and removed_at is null` (a name is active for one organization; the second activation fails and is reported as `taken`).

State: `pending` → `active` on a successful check; any → removed. No way back from `active` to `pending` in the base.

Rules: at most 5 live rows per organization. `host` is refused when it is an IP address, has fewer than three labels, contains characters outside `[a-z0-9.-]`, is longer than 253 characters, or ends with the hub's own domains (the host of `hubBaseUrl()`'s registrable part, the suffix itself, `vercel.app`). Lookup by `host` happens before the organization is known, on the bypass connection.

## Seed

`scripts/qa/seed/` gains one revoked key and one pending domain for the QA organization (migration/seed pairing check), with matrix entries and `SEEDED_TABLES` rows.
