# Data model

Both new tables follow the hub's organization-table pattern (`supabase/migrations/20261025100000_crm_doors.sql:76-89`): `org_id text`, row level security enabled and forced, policy `<table>_org_guc` on `current_setting('app.current_org_id', true)`, `revoke all … from public, anon, authenticated`. Unlike that migration they grant `select, insert, update` to `app_ledger` and no `delete`. Person columns are plain `uuid` without a foreign key, so a key or domain survives its creator. Drizzle mirrors go in `src/server/db/pg-org-integrations-schema.ts` (new file).

## `org_api_keys` (S1)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk, `gen_random_uuid()` | |
| `org_id` | text not null | |
| `name` | text not null | check `char_length(btrim(name)) between 1 and 60` |
| `prefix` | text not null, unique | check `prefix ~ '^[0-9a-f]{8}$'` |
| `key_hash` | text not null | SHA-256 hex of the whole key |
| `created_by` | uuid | |
| `created_at` | timestamptz not null default `now()` | |
| `last_used_at` | timestamptz | at most one minute stale |
| `revoked_by` / `revoked_at` | uuid / timestamptz | revoked = `revoked_at is not null`; never cleared |

Index `(org_id) where revoked_at is null`. At most 10 rows per organization with `revoked_at is null` (count then insert; a race may reach 11, accepted in FR-004). Lookup by `prefix` happens before the organization is known, on the bypass connection (new entry in `rls-bypass-inventory.json`).

## `crm_door_submissions` (S1, changed)

New nullable column `api_key_id uuid` (no foreign key; keys are never deleted). Null for submissions without a key.

## `org_domains` (S2)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `org_id` | text not null | |
| `host` | text not null | normalised (below) |
| `target_label` | text not null, unique | 16 base32 characters; the record value is `<target_label>.<suffix>` |
| `status` | text not null default `pending`, check in (`pending`, `active`) | |
| `check_state` | jsonb | last check: `{ at, dns: 'missing'|'mismatch'|'ok', found?, hosting?: 'challenge'|'issuing'|'ready', records?: [{type,name,value}] }` |
| `provider_added_at` | timestamptz | set when THIS row registered the host at the provider |
| `created_by` / `created_at` | uuid / timestamptz | |
| `activated_at` | timestamptz | |
| `removed_by` / `removed_at` | uuid / timestamptz | soft delete; a "live" row has `removed_at is null` |

Indexes: unique `(org_id, host) where removed_at is null`; unique `(host) where status = 'active' and removed_at is null`.

**Host normalisation** (`normaliseHost`): trim, lower-case, strip one trailing dot. Refuse with `invalid_host` unless: length ≤ 253; every label matches `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`; the last label is letters only; no label starts with `xn--`. Refuse with `too_short` when there are fewer than three labels. Refuse with `reserved` when the host equals or ends with `.` + any hub host, the suffix, or `vercel.app`. The same label pattern is asserted again in the hosting client.

**Statuses (the one mapping)**:

| Stored `status` | `check_state` | API `status` | Admin sees (en) | Set when |
|---|---|---|---|---|
| `pending` | none, or `dns: missing` | `waiting_dns` | Waiting for DNS — no record found | added; check finds no CNAME |
| `pending` | `dns: mismatch`, `found` | `waiting_dns` | Waiting for DNS — points to `<found>` | check finds another target |
| `pending` | `dns: ok`, `hosting: challenge`, `records` | `needs_record` | Needs one more record | provider asks for an ownership record |
| `pending` | `dns: ok`, `hosting: issuing` | `issuing` | Issuing certificate | registered, provider not ready |
| `active` | `dns: ok`, `hosting: ready` | `active` | Active | provider ready and activation committed |

A check of an `active` domain returns it unchanged. A row with `removed_at` set is never returned. `taken` no longer exists: when activation hits the active-host index, the other organization's row for that host is set back to `pending` (its `provider_added_at` moves to the winner) in the same transaction, because DNS now carries the winner's label.

Limits: 5 live rows per organization; 10 additions per organization and day (shared limiter, key `domain-add:<orgId>`, window 24 h); 200 active rows in total (activation answers `capacity` beyond it).

## Seed

`scripts/qa/seed/`: one revoked key (S1); one pending and one active domain for the QA organization (S2); matrix entries and `SEEDED_TABLES` rows.
