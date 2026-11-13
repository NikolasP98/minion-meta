# Data model: Doors site SDK

## org_allowed_sites (new, hub migration)
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| org_id | text not null | RLS: `current_setting('app.current_org_id', true)`; force RLS; grants to `app_ledger`; revoke `anon`, `authenticated` |
| origin | text not null | normalised: lower case, `https://host[:port]`; `http` only for `localhost`/`127.0.0.1` |
| created_by | text | profile id |
| created_at | timestamptz default now() | |
| removed_by | text null | |
| removed_at | timestamptz null | soft delete (FR-005) |

Unique `(org_id, origin) where removed_at is null`. At most 20 live rows per org (service check). Index on `(origin) where removed_at is null` for the preflight lookup.

## org_api_keys (new, hub migration)
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| org_id | text not null | same RLS pattern |
| name | text not null | 1–80 chars |
| prefix | text not null unique | 8 chars, shown in the list |
| key_hash | text not null | hex SHA-256 of the full key |
| scopes | jsonb not null | array of strings; allowed: `doors:submit` |
| created_by | text | |
| created_at | timestamptz default now() | |
| last_used_at | timestamptz null | updated at most once a minute |
| revoked_by | text null | |
| revoked_at | timestamptz null | |

At most 20 non-revoked keys per org.

State: `active → revoked` (terminal). A key never becomes active again.

Both tables need a Drizzle mirror (`src/server/db/pg-org-integrations-schema.ts`) and a QA seed change (`scripts/qa/check-migration-seed-pairing.ts`).

## Form door config (jsonb `crm_doors.config`, kind `form`) — additions, all optional
```ts
config: {
  // existing: fields, consentText, consentRequired, successMessage?, tagIds?
  sections?: { id: string /* FORM_KEY_RE */; title: string; help?: string }[]   // ≤ 12
  defaultCountry?: string                // ISO 3166 alpha-2 from countries.ts, default 'PE'
  locales?: ('es' | 'en' | 'pt')[]       // languages with translations; the door's own text is the fallback
  translations?: Record<locale, {
    title?: string; description?: string; consentText?: string; successMessage?: string
    sections?: Record<sectionId, { title?: string; help?: string }>
    fields?: Record<fieldKey, { label?: string; help?: string; options?: Record<canonicalOption, string> }>
  }>
}
field: {
  // existing: key, label, type, required, options?, accept?, maxFiles?
  type: … | 'document'
  section?: string            // must name a section id
  help?: string               // ≤ 300
  showIf?: { field: string; in: string[] }   // field must be an earlier select/multiselect/checkbox; values ⊆ its options ('true' for checkbox)
  country?: boolean           // phone only: show the country picker
  guide?: 'front' | 'profile-left' | 'profile-right' | 'three-quarter-left' | 'three-quarter-right'   // file + accept:'image' + maxFiles 1 only
}
```
Validation rules (isomorphic, `form.ts`):
- A field whose `showIf` is not satisfied is not required and its value is dropped before storage.
- `phone` with `country`: `^\+[0-9]{1,3} [0-9]{6,14}$`. Without it: today's rule.
- `document`: default country with a known rule (PE: `^[0-9]{8}$`) stores the bare value; any other country stores `CC value` matching `^[A-Z]{2} [0-9A-Z]{5,15}$`.
- Config errors added to `superRefine`: `unknown_section`, `bad_show_if`, `guide_needs_single_image`, `unknown_translation_key`.

## Public form definition (response of the public read) — see `contracts/public-api.md`
Projection of the config without `tagIds`, follow-up, statistics or notification settings, plus `id` (needed for attribution, `doors-form.service.ts:70-73`) and upload limits.
