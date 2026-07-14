-- org_areas — first-class organizational areas (departments) per org.
--
-- Membership arrays bridge gateway agent/skill identifiers and local profile
-- UUIDs while organization_id remains the security boundary.

create table if not exists public.org_areas (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  slug            text not null,
  icon            text not null default 'Building2',
  color           text not null default '#6366f1',
  sort_order      integer not null default 0,
  agent_ids       text[] not null default '{}',
  user_ids        uuid[] not null default '{}',
  skill_keys      text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists org_areas_org_slug_uniq
  on public.org_areas (organization_id, slug);

create index if not exists org_areas_org_idx
  on public.org_areas (organization_id, sort_order);

alter table public.org_areas enable row level security;
alter table public.org_areas force row level security;

drop policy if exists org_areas_member_read on public.org_areas;
create policy org_areas_member_read on public.org_areas
  for select
  using (
    organization_id in (
      select organization_id
      from public.organization_members
      where profile_id = auth.uid()
    )
  );

comment on table public.org_areas is
  'Org areas (departments). Groups agents/users/skills per organization for the OVERVIEW graph. Member-read RLS; hub service-role writes.';
