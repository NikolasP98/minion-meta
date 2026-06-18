-- Hub-native Scheduling module (spec:
-- minion_hub/docs/superpowers/specs/2026-06-17-scheduling-module-cal-diy-design.md).
-- A faithful port of cal.diy's scheduling primitives — resources, availability
-- schedules, event types, bookings, and shareable links.
--
-- Tenancy: org_id text (matches messages.org_id / crm_* / fin_*), enforced by
-- the existing app_ledger role + app.current_org_id GUC (created in
-- 20260603074413_messages_rls). Every hub query routes through withOrgCore();
-- RLS is the hard backstop. The public /book/[slug] path resolves the org from
-- the slug server-side, then runs under withOrgCore for that org — so the
-- per-table policies still force isolation even without a user session.
--
-- Cross-module bridges are SOFT references (no FK): event_types.product_id →
-- fin_products.id, bookings.crm_contact_id → crm_contacts.id, resources.profile_id
-- → profiles.id. Keeping them soft avoids cross-concern cascade coupling and
-- lets the module load even if CRM/finance rows are absent.
--
-- Idempotent: CREATE ... IF NOT EXISTS throughout (surgical-apply convention;
-- never drizzle-kit push for the core DB).

-- ── sched_resources ──────────────────────────────────────────────────────────
create table if not exists public.sched_resources (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  kind        text not null default 'staff',
  profile_id  uuid,
  name        text not null,
  email       text,
  timezone    text not null default 'America/Lima',
  color       text,
  active      boolean not null default true,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists sched_resources_org_idx on public.sched_resources (org_id);
--> statement-breakpoint
create unique index if not exists sched_resources_org_profile_uniq
  on public.sched_resources (org_id, profile_id) where profile_id is not null;
--> statement-breakpoint

-- ── sched_schedules ──────────────────────────────────────────────────────────
create table if not exists public.sched_schedules (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  resource_id uuid not null references public.sched_resources(id) on delete cascade,
  name        text not null default 'Working hours',
  timezone    text not null default 'America/Lima',
  is_default  boolean not null default true,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists sched_schedules_resource_idx on public.sched_schedules (resource_id);
--> statement-breakpoint
create index if not exists sched_schedules_org_idx on public.sched_schedules (org_id);
--> statement-breakpoint

-- ── sched_availability ───────────────────────────────────────────────────────
create table if not exists public.sched_availability (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  schedule_id uuid not null references public.sched_schedules(id) on delete cascade,
  days        integer[] not null default '{}',
  start_time  text not null,
  end_time    text not null,
  date        text,
  metadata    jsonb not null default '{}'::jsonb
);
--> statement-breakpoint
create index if not exists sched_availability_schedule_idx on public.sched_availability (schedule_id);
--> statement-breakpoint
create index if not exists sched_availability_schedule_date_idx on public.sched_availability (schedule_id, date);
--> statement-breakpoint

-- ── sched_event_types ────────────────────────────────────────────────────────
create table if not exists public.sched_event_types (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 text not null,
  slug                   text not null,
  title                  text not null,
  description            text,
  length                 integer not null,
  slot_interval          integer,
  before_buffer          integer not null default 0,
  after_buffer           integer not null default 0,
  minimum_booking_notice integer not null default 120,
  period_type            text not null default 'rolling',
  period_days            integer,
  scheduling_type        text,
  requires_confirmation  boolean not null default false,
  public                 boolean not null default true,
  color                  text,
  product_id             uuid,
  active                 boolean not null default true,
  metadata               jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
--> statement-breakpoint
create unique index if not exists sched_event_types_org_slug_uniq on public.sched_event_types (org_id, slug);
--> statement-breakpoint
create index if not exists sched_event_types_org_idx on public.sched_event_types (org_id);
--> statement-breakpoint

-- ── sched_event_type_resources (M:N) ─────────────────────────────────────────
create table if not exists public.sched_event_type_resources (
  org_id        text not null,
  event_type_id uuid not null references public.sched_event_types(id) on delete cascade,
  resource_id   uuid not null references public.sched_resources(id) on delete cascade,
  primary key (event_type_id, resource_id)
);
--> statement-breakpoint
create index if not exists sched_etr_resource_idx on public.sched_event_type_resources (resource_id);
--> statement-breakpoint

-- ── sched_bookings ───────────────────────────────────────────────────────────
create table if not exists public.sched_bookings (
  id                  uuid primary key default gen_random_uuid(),
  org_id              text not null,
  uid                 text not null,
  event_type_id       uuid not null references public.sched_event_types(id) on delete restrict,
  resource_id         uuid not null references public.sched_resources(id) on delete restrict,
  start_time          timestamptz not null,
  end_time            timestamptz not null,
  status              text not null default 'accepted',
  title               text,
  notes               text,
  attendee_name       text,
  attendee_email      text,
  attendee_phone      text,
  crm_contact_id      uuid,
  product_id          uuid,
  source              text not null default 'internal',
  rescheduled_from_id uuid,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
--> statement-breakpoint
create unique index if not exists sched_bookings_org_uid_uniq on public.sched_bookings (org_id, uid);
--> statement-breakpoint
create index if not exists sched_bookings_org_start_idx on public.sched_bookings (org_id, start_time);
--> statement-breakpoint
create index if not exists sched_bookings_resource_start_idx on public.sched_bookings (resource_id, start_time);
--> statement-breakpoint
create index if not exists sched_bookings_org_status_idx on public.sched_bookings (org_id, status);
--> statement-breakpoint
create index if not exists sched_bookings_crm_idx on public.sched_bookings (crm_contact_id);
--> statement-breakpoint

-- ── sched_links ──────────────────────────────────────────────────────────────
create table if not exists public.sched_links (
  id             uuid primary key default gen_random_uuid(),
  org_id         text not null,
  slug           text not null,
  title          text not null,
  description    text,
  event_type_ids uuid[] not null default '{}',
  resource_id    uuid,
  active         boolean not null default true,
  expires_at     timestamptz,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
--> statement-breakpoint
create unique index if not exists sched_links_org_slug_uniq on public.sched_links (org_id, slug);
--> statement-breakpoint
create index if not exists sched_links_org_idx on public.sched_links (org_id);
--> statement-breakpoint

-- ── RLS: org isolation via the app_ledger role + GUC ─────────────────────────
grant select, insert, update, delete on public.sched_resources            to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.sched_schedules            to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.sched_availability         to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.sched_event_types          to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.sched_event_type_resources to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.sched_bookings             to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.sched_links                to app_ledger;
--> statement-breakpoint

alter table public.sched_resources            enable row level security;
--> statement-breakpoint
alter table public.sched_resources            force  row level security;
--> statement-breakpoint
alter table public.sched_schedules            enable row level security;
--> statement-breakpoint
alter table public.sched_schedules            force  row level security;
--> statement-breakpoint
alter table public.sched_availability         enable row level security;
--> statement-breakpoint
alter table public.sched_availability         force  row level security;
--> statement-breakpoint
alter table public.sched_event_types          enable row level security;
--> statement-breakpoint
alter table public.sched_event_types          force  row level security;
--> statement-breakpoint
alter table public.sched_event_type_resources enable row level security;
--> statement-breakpoint
alter table public.sched_event_type_resources force  row level security;
--> statement-breakpoint
alter table public.sched_bookings             enable row level security;
--> statement-breakpoint
alter table public.sched_bookings             force  row level security;
--> statement-breakpoint
alter table public.sched_links                enable row level security;
--> statement-breakpoint
alter table public.sched_links                force  row level security;
--> statement-breakpoint

create policy sched_resources_org_guc on public.sched_resources
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy sched_schedules_org_guc on public.sched_schedules
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy sched_availability_org_guc on public.sched_availability
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy sched_event_types_org_guc on public.sched_event_types
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy sched_etr_org_guc on public.sched_event_type_resources
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy sched_bookings_org_guc on public.sched_bookings
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
create policy sched_links_org_guc on public.sched_links
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
