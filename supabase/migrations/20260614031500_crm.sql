-- Hub-native CRM (spec specs/2026-06-13-crm-plugin-recon-and-plan.md).
-- Contacts = people who text the org's registered channels; the customer
-- journey is DERIVED live from the `messages` ledger (never copied). These
-- tables hold only a stable contact identity + CRM-only attributes.
--
-- Tenancy: org_id text (matches messages.org_id), enforced by the existing
-- app_ledger role + app.current_org_id GUC (created in 20260603074413_messages_rls).
-- Every hub query routes through withOrgCore(); RLS is the hard backstop.
--
-- Idempotent: CREATE ... IF NOT EXISTS throughout (surgical-apply convention;
-- never drizzle-kit push for the core DB).

-- ── Contacts ────────────────────────────────────────────────────────────────
create table if not exists public.crm_contacts (
  id                 uuid primary key default gen_random_uuid(),
  org_id             text not null,
  display_name       text,
  profile_id         uuid,                 -- bridge to profiles.id once claimed (no FK)
  owner_id           uuid,                 -- assigned hub user (not yet RLS-enforced)
  lifecycle_override text,                 -- pins stage over the derived one
  source             text not null default 'harvested',  -- 'harvested' | 'manual'
  custom_fields      jsonb not null default '{}'::jsonb,
  deleted_at         timestamptz,          -- soft-delete (right-to-erasure)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists crm_contacts_org_recent_idx on public.crm_contacts (org_id, updated_at);
--> statement-breakpoint
create index if not exists crm_contacts_profile_idx on public.crm_contacts (profile_id);
--> statement-breakpoint

-- ── Contact identities (the harvest upsert target + timeline join key) ───────
create table if not exists public.crm_contact_identities (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  contact_id  uuid not null references public.crm_contacts(id) on delete cascade,
  channel     text not null,              -- == messages.channel
  external_id text not null,              -- == messages.sender_id
  handle      text,
  created_at  timestamptz not null default now()
);
--> statement-breakpoint
create unique index if not exists crm_contact_identity_uniq
  on public.crm_contact_identities (org_id, channel, external_id);
--> statement-breakpoint
create index if not exists crm_contact_identities_lookup_idx
  on public.crm_contact_identities (org_id, channel, external_id);
--> statement-breakpoint
create index if not exists crm_contact_identities_contact_idx
  on public.crm_contact_identities (contact_id);
--> statement-breakpoint

-- ── Non-message activities (notes / tag / score / stage / manual) ────────────
create table if not exists public.crm_activities (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  contact_id  uuid not null references public.crm_contacts(id) on delete cascade,
  kind        text not null,
  body        text,
  actor_id    uuid,
  data        jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists crm_activities_contact_idx on public.crm_activities (contact_id, occurred_at);
--> statement-breakpoint
create index if not exists crm_activities_org_idx on public.crm_activities (org_id, occurred_at);
--> statement-breakpoint

-- ── Tags ─────────────────────────────────────────────────────────────────────
create table if not exists public.crm_tags (
  id         uuid primary key default gen_random_uuid(),
  org_id     text not null,
  name       text not null,
  color      text,
  kind       text not null default 'manual',  -- 'manual' | 'auto'
  rule       jsonb,                            -- only for kind='auto'
  position   double precision not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);
--> statement-breakpoint
create unique index if not exists crm_tags_org_name_uniq on public.crm_tags (org_id, name);
--> statement-breakpoint
create index if not exists crm_tags_org_idx on public.crm_tags (org_id);
--> statement-breakpoint

create table if not exists public.crm_contact_tags (
  org_id     text not null,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  tag_id     uuid not null references public.crm_tags(id) on delete cascade,
  applied_by uuid,
  applied_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);
--> statement-breakpoint
create index if not exists crm_contact_tags_tag_idx on public.crm_contact_tags (tag_id);
--> statement-breakpoint

-- ── Ledger join index (the only change to messages — makes harvest + RFM cheap)
create index if not exists messages_org_channel_sender_idx
  on public.messages (org_id, channel, sender_id);
--> statement-breakpoint

-- ── RLS: org isolation via the app_ledger role + GUC (same as messages) ──────
grant select, insert, update, delete on public.crm_contacts          to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.crm_contact_identities to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.crm_activities         to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.crm_tags               to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.crm_contact_tags       to app_ledger;
--> statement-breakpoint

alter table public.crm_contacts           enable row level security;
--> statement-breakpoint
alter table public.crm_contacts           force  row level security;
--> statement-breakpoint
alter table public.crm_contact_identities enable row level security;
--> statement-breakpoint
alter table public.crm_contact_identities force  row level security;
--> statement-breakpoint
alter table public.crm_activities         enable row level security;
--> statement-breakpoint
alter table public.crm_activities         force  row level security;
--> statement-breakpoint
alter table public.crm_tags               enable row level security;
--> statement-breakpoint
alter table public.crm_tags               force  row level security;
--> statement-breakpoint
alter table public.crm_contact_tags       enable row level security;
--> statement-breakpoint
alter table public.crm_contact_tags       force  row level security;
--> statement-breakpoint

create policy crm_contacts_org_guc on public.crm_contacts
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy crm_contact_identities_org_guc on public.crm_contact_identities
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy crm_activities_org_guc on public.crm_activities
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy crm_tags_org_guc on public.crm_tags
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy crm_contact_tags_org_guc on public.crm_contact_tags
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint

-- ── Views (security_invoker=true so base-table RLS + the GUC apply; without it
--    a view runs as its owner `postgres` which has rolbypassrls → cross-org leak)

-- Derived rollups: idempotent (COUNT/MIN/MAX), never incremented.
create or replace view public.crm_contact_stats with (security_invoker = true) as
  select ci.contact_id,
         ci.org_id,
         count(*)                                          as message_count,
         count(*) filter (where m.direction = 'inbound')   as inbound_count,
         count(distinct m.channel)                         as channels_used,
         min(coalesce(m.occurred_at, m.created_at))        as first_contact_at,
         max(coalesce(m.occurred_at, m.created_at))        as last_contact_at
  from public.crm_contact_identities ci
  join public.messages m
    on m.org_id = ci.org_id and m.channel = ci.channel and m.sender_id = ci.external_id
  where m.is_bot is not true
  group by ci.contact_id, ci.org_id;
--> statement-breakpoint

-- End-to-end journey: live message interactions + non-message CRM events.
create or replace view public.crm_contact_timeline with (security_invoker = true) as
  select ci.contact_id,
         m.org_id,
         'message'::text                            as kind,
         m.direction                                as direction,
         m.channel                                  as channel,
         m.content                                  as body,
         m.agent_id                                 as agent_id,
         m.metadata                                 as data,
         coalesce(m.occurred_at, m.created_at)      as occurred_at,
         m.id                                       as source_id
  from public.messages m
  join public.crm_contact_identities ci
    on ci.org_id = m.org_id and ci.channel = m.channel and ci.external_id = m.sender_id
  union all
  select a.contact_id,
         a.org_id,
         a.kind                                     as kind,
         null::text                                 as direction,
         null::text                                 as channel,
         a.body                                     as body,
         null::text                                 as agent_id,
         a.data                                     as data,
         a.occurred_at                              as occurred_at,
         a.id                                       as source_id
  from public.crm_activities a;
--> statement-breakpoint

grant select on public.crm_contact_stats    to app_ledger;
--> statement-breakpoint
grant select on public.crm_contact_timeline to app_ledger;
