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

Unique `(org_id, origin) where removed_at is null` (also serves the lookup, which is always by organization). At most 20 live rows per org (service check; a race can exceed it by one, accepted). Grants to `app_ledger`: select, insert, update — no delete (rows are soft-deleted to keep the trail).

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

At most 20 non-revoked keys per org. Grants: select, insert, update — no delete.

State: `active → revoked` (terminal). A key never becomes active again.

Both tables need a Drizzle mirror (`src/server/db/pg-org-integrations-schema.ts`) and a QA seed change (`scripts/qa/check-migration-seed-pairing.ts`).

## Form door config (jsonb `crm_doors.config`, kind `form`) — additions, all optional
```ts
config: {
  // existing: fields, consentText, consentRequired, successMessage?, tagIds?
  embed?: boolean                        // default false: the door may be embedded on the org's allowed sites
  baseLocale?: 'es' | 'en' | 'pt'        // language of the door's own text, default 'es'
  sections?: { id: string /* FORM_KEY_RE */; title: string; help?: string }[]   // ≤ 12; rendered in this order
  defaultCountry?: string                // ISO 3166 alpha-2 from countries.ts, default 'PE'
  translations?: Record<locale, {
    title?: string; description?: string; consentText?: string; successMessage?: string
    sections?: Record<sectionId, { title?: string; help?: string }>
    fields?: Record<fieldKey, { label?: string; help?: string; options?: Record<canonicalOption, string>; optionHelp?: Record<canonicalOption, string> }>
  }>
}
field: {
  // existing: key, label, type, required, options?, accept?, maxFiles?
  type: … | 'document' | 'number'
  min?: number; max?: number  // number only; integers
  optionHelp?: Record<option, string>   // select/multiselect: short description under the option, ≤ 200
  width?: 'half'              // two half fields share a row on wide screens
  section?: string            // must name a section id; fields render in config order inside their section, unsectioned fields first
  help?: string               // ≤ 300
  showIf?: { field: string; in: string[] }   // controller: an earlier select (equals), multiselect (includes any) or checkbox (in: ['true']); values ⊆ its options
  country?: boolean           // phone only: show the country picker
  guide?: 'front' | 'profile-left' | 'profile-right' | 'three-quarter-left' | 'three-quarter-right'   // file + accept:'image' + maxFiles 1 only
}
```
Validation rules (isomorphic, `form.ts`):
- A field whose `showIf` is not satisfied is not required and its value is dropped before storage; visibility is evaluated on the validated values. Files already uploaded for a field that ends hidden are simply not claimed (the existing sweeper removes them).
- `number`: integer, within `min`/`max` when set; stored as a string of digits.
- The available languages of a door are `baseLocale` plus the keys of `translations`. A requested language is reduced to its primary tag (`es-PE` → `es`); unsupported → `baseLocale`.
- `phone` with `country`: `^\+[0-9]{1,3} [0-9]{6,14}$`. Without it: today's rule.
- `document`: the picked country must be in `countries.ts`. A country with a known rule applies it (PE: `^[0-9]{8}$`); otherwise `^[0-9A-Z]{5,15}$`. Stored bare when the country is the door's `defaultCountry`, else as `CC value`; the `CC` form with the default country is rejected. Only a bare (default-country) document feeds the contact's document and may match an existing contact; a `CC value` document is kept in the submission only.
- Contact matching (`crm-contact-ensure.ts`): a phone whose dialling code is not the default country's matches only on the full number, never on the last nine digits.
- Config errors added to `superRefine`: `unknown_section`, `bad_show_if` (unknown or later controller, controller has its own `showIf`, values not among its options), `show_if_on_contact_field` (a phone or email field that satisfies `needs_contact_field` cannot be conditional), `guide_needs_single_image`, `bad_number_range`, `unknown_translation_key`.
- Reading: every public path uses `readFormConfig` (`safeParse`); a config that does not parse is treated as a missing door (S0).

## Public form definition (response of the public read) — see `contracts/public-api.md`
Projection of the config without `tagIds`, follow-up, statistics or notification settings, plus `id` (needed for attribution, `doors-form.service.ts:70-73`) and upload limits.
