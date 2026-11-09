# Data model: one migration, owned by S0

File: `supabase/migrations/20261025100000_crm_doors.sql` (S0). All door schema lands in this one
migration so that S1–S6 carry **no** migration and the CI seed-pairing rule fires only once
(hub `AGENTS.md:77-85`). Reserved timestamps if a slice discovers it needs schema:
S1 `20261025100100`, S2 `…100200`, S3 `…100300`, S4 `…100400`, S5 `…100500`, S6 `…100600`. A slice
using its reserved timestamp must also add seed rows (its own seed module, see plan §Shared files)
and say so in its PR body.

Mirror every table in a new Drizzle file `src/server/db/pg-doors-schema.ts` (S0). Drizzle does not
manage RLS. Follow the RLS convention of `20260717170000_meta_lead_attribution.sql:43-52`, with the
`do $$ … if not exists (select 1 from pg_policies …)` guard.

```sql
-- 1. Doors (form | faq | offer). Booking links stay in sched_links.
create table if not exists public.crm_doors (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  kind        text not null check (kind in ('form','faq','offer')),
  slug        text not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  title       text not null check (length(title) between 1 and 200),
  description text check (description is null or length(description) <= 2000),
  active      boolean not null default false,
  config      jsonb not null default '{}'::jsonb,
  follow_up   jsonb,                      -- S4: {enabled, delayMinutes, accountId, template}
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Global namespace for /d/<slug> (avoids the per-org ambiguity of /book, R11).
create unique index if not exists crm_doors_slug_uniq on public.crm_doors (slug);
create index if not exists crm_doors_org_idx on public.crm_doors (org_id, kind);

-- 2. Form submissions (personal, possibly clinical data).
create table if not exists public.crm_door_submissions (
  id           uuid primary key default gen_random_uuid(),
  org_id       text not null,
  door_id      uuid not null references public.crm_doors(id) on delete restrict,
  contact_id   uuid,                      -- soft ref crm_contacts.id (null if no phone/email)
  payload      jsonb not null,            -- {fieldKey: value} after server validation
  consent      boolean not null default false,
  consent_text text,                      -- snapshot of the text the visitor agreed to
  attribution  jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists crm_door_submissions_door_idx on public.crm_door_submissions (org_id, door_id, created_at desc);
create index if not exists crm_door_submissions_contact_idx on public.crm_door_submissions (org_id, contact_id);

-- 3. Follow-up claims (one per door+contact, ever).
create table if not exists public.crm_door_followups (
  id            uuid primary key default gen_random_uuid(),
  org_id        text not null,
  door_id       uuid not null references public.crm_doors(id) on delete restrict,
  contact_id    uuid not null,
  submission_id uuid not null references public.crm_door_submissions(id) on delete restrict,
  status        text not null check (status in ('sending','sent','failed','skipped')),
  reason        text,                     -- skipped: opted_out|bought|replied|no_consent|no_identity
  recipient     text,                     -- E.164, for audit
  content       text,
  message_id    text,
  error         text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  unique (org_id, door_id, contact_id)
);

-- 4. Anonymous daily counters. door_key = 'book:<sched_links.id>' | 'door:<crm_doors.id>'.
create table if not exists public.crm_door_stats_daily (
  org_id      text not null,
  door_key    text not null,
  day         date not null,
  views       integer not null default 0,
  submissions integer not null default 0,
  primary key (org_id, door_key, day)
);

-- 5. First touch on the contact (set once, by the door that created it).
alter table public.crm_contacts add column if not exists first_touch jsonb;
create index if not exists crm_contacts_first_touch_door_idx
  on public.crm_contacts (org_id, (first_touch->>'door')) where first_touch is not null;

-- RLS for 1–4: enable + force + <table>_org_guc policy + grant to app_ledger (convention above).
```

## JSON shapes (zod lives in code, these are the contracts)

```ts
// src/lib/doors/attribution.ts (S0) — pure, isomorphic
type Attribution = {
  door: `book:${string}` | `door:${string}`;
  utm_source?: string; utm_medium?: string; utm_campaign?: string; // trimmed, ≤100 chars
  referrer_host?: string;                                          // host only, never path/query
  at: string;                                                      // ISO, server time of capture
};
function parseAttribution(url: URL, referer: string | null, ownHost: string, door: Attribution['door']): Attribution;
const attributionSchema: z.ZodType<Attribution>; // re-validation at submit/book endpoints (.strict())

// crm_contacts.first_touch === Attribution (written only on contact INSERT)
```

```ts
// Form config (S2 owns src/lib/doors/kinds/form.ts)
type FormField = { key: string /* ^[a-z][a-z0-9_]{0,39}$ */; label: string; type:
  'text'|'textarea'|'phone'|'email'|'select'|'date'|'checkbox'; required: boolean; options?: string[] /* select, ≤20 */ };
type FormConfig = { fields: FormField[] /* 1..20, must include ≥1 phone or email field */;
  consentText: string /* 1..1000 */; consentRequired: boolean /* default true */; successMessage?: string };

// Follow-up (S4 owns; stored in crm_doors.follow_up, form doors only)
type FollowUp = { enabled: boolean; delayMinutes: number /* 15..10080 */; accountId: string; template: string /* 1..1000, {nombre} */ };

// FAQ config (S5 owns src/lib/doors/kinds/faq.ts)
type FaqConfig = { entries: { id: string; q: string /* ≤300 */; a: string /* ≤2000 */; status: 'draft'|'approved' }[] /* ≤50 */;
  whatsappNumber?: string /* E.164 */ };

// Offer config (S6 owns src/lib/doors/kinds/offer.ts)
type OfferConfig = { productIds: string[] /* uuid, 1..30 */; whatsappNumber?: string; bookingLinkId?: string; note?: string /* ≤1000 */ };
```

## Funnel query (S0, `doors.service.ts` `listDoorsWithFunnel(ctx, from, to)`)

```sql
-- per door_key in range
views, submissions  := sum(...) from crm_door_stats_daily where org_id=$org and day between $from and $to
contacts            := count(*) from crm_contacts c
                       where c.org_id=$org and c.deleted_at is null and c.first_touch->>'door' = $key
                         and c.created_at::date between $from and $to
customers           := count(*) of those contacts where exists (
                         select 1 from pos_tickets t where t.org_id=c.org_id and t.crm_contact_id=c.id and t.status='submitted'
                         union all
                         select 1 from sched_bookings b where b.org_id=c.org_id and b.crm_contact_id=c.id and b.status='completed')
```
One grouped query per metric (not one per door). `pos_tickets` has no `crm_contact_id` index
(`pg-pos-schema.ts:115-119`). It is acceptable at the current volume; if SC-005 fails, S0 adds
`create index … on pos_tickets (org_id, crm_contact_id)` in the **same** S0 migration before merge.
