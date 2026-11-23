# Data model: Record lock policy

All tables live in `public`, carry `org_id text not null`, and use the same RLS shape as `org_api_keys` (`supabase/migrations/20261116100000_org_api_keys.sql`): `enable` + `force row level security`, one policy on `org_id = current_setting('app.current_org_id', true)` for `using` and `with check`, `revoke all … from public, anon, authenticated`, grants to `app_ledger`. Every statement is idempotent (`create table if not exists`, `create index if not exists`, policies inside `do $$ … if not exists`). Migrations run in the production build.

Drizzle mirrors go in `src/server/db/pg-org-integrations-schema.ts` beside `orgApiKeys`.

## Migration 1 — `20261124100000_record_lock_policy.sql` (S1)

### `org_lock_policy` (one row per org; no row = default)

| Column | Type | Notes |
|---|---|---|
| `org_id` | `text` primary key | |
| `month_enabled` | `boolean not null default true` | "Al cerrar el mes" |
| `days_enabled` | `boolean not null default false` | "Después de X días" |
| `days` | `integer` | required when `days_enabled`; check `days between 1 and 3650` |
| `sunat_enabled` | `boolean not null default false` | stored from S1; shown and enforced in S5 |
| `webhook_enabled` | `boolean not null default false` | "Por webhook" (S4) |
| `updated_by` | `uuid` | plain uuid, no FK (outlives the person) |
| `updated_at` | `timestamptz not null default now()` | |

Constraint `org_lock_policy_days_chk`: `not days_enabled or days is not null`.

Grants: `select, insert, update` to `app_ledger`. No delete.

The default policy in code (`DEFAULT_LOCK_POLICY`): `{ month: true, days: null, sunat: false, webhook: false }`.

### `org_record_locks` (external locks)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` primary key default `gen_random_uuid()` | |
| `org_id` | `text not null` | |
| `source` | `text not null default 'webhook'` | check `source in ('webhook')`; room for later sources |
| `label` | `text not null` | 1–60 characters after trim ("Contabilidad") |
| `record_type` | `text` | null = every record type that uses the policy; else check `in ('stock_receipt')` (S5/S6 widen it) |
| `up_to` | `date` | inclusive, org finance timezone |
| `record_id` | `uuid` | one row per locked record |
| `api_key_id` | `uuid` | the key that set it; no FK (keys are never deleted) |
| `actor_name` | `text` | the key's name at the time |
| `created_at` | `timestamptz not null default now()` | |
| `lifted_at` | `timestamptz` | null = active |
| `lifted_by_kind` | `text` | `'person'` or `'api_key'` |
| `lifted_by` | `uuid` | profile id or key id |
| `lift_reason` | `text` | required when a person lifts |

Constraints and indexes:

- `org_record_locks_target_chk`: exactly one of `up_to`, `record_id` is set; `record_id` requires `record_type`.
- `org_record_locks_active_upto_uniq`: unique `(org_id, coalesce(record_type, ''), label, up_to)` where `up_to is not null and lifted_at is null`.
- `org_record_locks_active_record_uniq`: unique `(org_id, record_type, record_id)` where `record_id is not null and lifted_at is null`.
- `org_record_locks_active_idx`: `(org_id)` where `lifted_at is null`.

Grants: `select, insert, update` to `app_ledger` (update only sets the `lifted_*` columns; enforced in the service). No delete.

### `org_lock_events` (audit, append-only)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` primary key default `gen_random_uuid()` | |
| `org_id` | `text not null` | |
| `action` | `text not null` | check `in ('lock', 'lift', 'unlock', 'unlock_used', 'refused', 'policy_changed')` |
| `record_type` | `text` | null for `policy_changed` and "up to date" locks without a type |
| `record_id` | `uuid` | null for "up to date" locks and `policy_changed` |
| `rules` | `jsonb not null default '[]'` | the hits at the time (`LockHit[]`) or the rule concerned |
| `actor_kind` | `text not null` | check `in ('person', 'api_key', 'system')` |
| `actor_id` | `uuid` | profile id or key id; null for system |
| `actor_name` | `text` | name snapshot (person display name or key name) |
| `reason` | `text` | required for `unlock` and a person's `lift`; check length ≤ 1000 |
| `detail` | `jsonb not null default '{}'` | `policy_changed`: `{ before, after }`; `lock`/`lift`: `{ lockId, label, upTo }`; `unlock_used`: `{ correctionId }` |
| `ref_event_id` | `uuid` | `unlock_used` → the `unlock` event it consumed |
| `expires_at` | `timestamptz` | `unlock` only: `occurred_at + 24 h` |
| `occurred_at` | `timestamptz not null default now()` | |

Constraints and indexes:

- `org_lock_events_unlock_chk`: `action <> 'unlock' or (record_id is not null and reason is not null and expires_at is not null)`.
- `org_lock_events_used_uniq`: unique `(org_id, ref_event_id)` where `action = 'unlock_used'` (an unlock is consumed at most once, at the database level).
- `org_lock_events_org_time_idx`: `(org_id, occurred_at desc)` for the list.
- `org_lock_events_record_idx`: `(org_id, record_type, record_id, occurred_at desc)` for the unlock lookup.

Grants: `select, insert` to `app_ledger`. **No update, no delete.**

### Active unlock (query, no table)

```sql
select e.id, e.expires_at, e.actor_name
from org_lock_events e
where e.org_id = $org and e.action = 'unlock'
  and e.record_type = $type and e.record_id = any($chainIds)
  and e.expires_at > now()
  and not exists (
    select 1 from org_lock_events u
    where u.org_id = e.org_id and u.action = 'unlock_used' and u.ref_event_id = e.id)
order by e.occurred_at desc limit 1
```

### Seed (S1, `migration-seed-pairing`)

- `scripts/qa/seed/db.ts`: add the three tables to the reset list.
- One explicit default `org_lock_policy` row for the main QA org and one `refused` event, so the settings page is not empty on a fresh stack.
- `scripts/qa/seed/matrix.ts`: entries for both fixtures with their reason.

## Migration 2 — `20261124110000_api_key_scope_locks.sql` (S4)

```sql
alter table public.org_api_keys drop constraint if exists org_api_keys_scopes_known;
alter table public.org_api_keys
  add constraint org_api_keys_scopes_known check (scopes <@ array['sandbox', 'locks']::text[]);
```

Both statements in one migration file (one transaction), so no window without the check. Existing keys keep their scopes; none gains `locks`.

Seed: a revoked key with scope `{locks}` in `scripts/qa/seed/doors.ts` (pattern at `:179-188`) and one lifted `org_record_locks` row.

## Types (`src/lib/types/record-locks.ts`)

```ts
export type LockRule = 'month' | 'days' | 'sunat' | 'webhook';
export type LockHitKind = 'month' | 'month_current' | 'days' | 'sunat' | 'webhook_date' | 'webhook_record';
export interface LockHit {
  rule: LockRule;
  kind: LockHitKind;
  unlockable: boolean;          // false only for month_current
  period?: string;              // month hits: 'YYYY-MM'
  days?: number;                // days hit: the org's X
  label?: string;               // webhook hits
  upTo?: string;                // webhook_date: 'YYYY-MM-DD'
  lockedAt?: string;            // webhook hits: when the lock was set
  lockId?: string;
}
export interface LockPolicy { month: boolean; days: number | null; sunat: boolean; webhook: boolean }
export type LockableRecord = { type: 'stock_receipt'; id: string; postedAt: Date };
export interface RecordLockResult {
  locked: boolean;              // hits remain after an active unlock is applied
  rules: LockHit[];             // every rule that applies, unlock or not
  unlock: { eventId: string; expiresAt: string; grantedByName: string | null } | null;
}
```

## Rule evaluation in data terms

| Rule | Locked when | Date used |
|---|---|---|
| `month` | the record's month, or the current month, has a `pos_period_locks` row (exactly `evaluateReceiptPeriod`) | the receipt's own `posted_at` |
| `days` | `dateKey(now) − dateKey(first.posted_at) > days` in the finance timezone | first receipt of the chain |
| `webhook` | an active `org_record_locks` row with `up_to >= dateKey(first.posted_at)` (type null or matching), or with `record_id` in the chain | first receipt of the chain |
| `sunat` | S5 | — |

`locked = hits.some(h => !h.unlockable) || (hits.length > 0 && !activeUnlock)`.

## Invariants

- No `org_lock_policy` row ⇒ only the month rule runs, and the answer equals `receipt_period_v1`.
- `org_lock_events` rows never change.
- An `unlock` event has at most one `unlock_used` event (unique index).
- External locks are lifted, never deleted.
- Nothing here touches `stk_ledger`, `stk_entries`, tickets or payments.
