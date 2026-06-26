-- ERPNext-inspired RBAC foundation (phase 1: role catalog + multi-role assignment
-- + per-org capability overrides). Global default capabilities live in code
-- (minion_hub/src/server/services/permissions.service.ts DEFAULT_MATRIX,
-- version-controlled & readable); this table stores only per-org OVERRIDES written
-- by the future Role Permission Manager UI. Enforcement reuses what's already here:
-- org isolation = app.current_org_id RLS GUC; read data tier = app_assistant_ro.
-- A member's effective caps = OR over all their roles of (org override ?? code
-- default), per (module, action).
--
-- Applied to prod (gxv) via mcp apply_migration on 2026-06-25.

create table if not exists public.permission_roles (
  key         text primary key,
  name        text not null,
  rank        int  not null,
  description text,
  is_system   boolean not null default true,
  created_at  timestamptz not null default now()
);
--> statement-breakpoint
insert into public.permission_roles (key, name, rank, description) values
  ('owner',   'Owner',   100, 'Full control of the organization, including billing and ownership.'),
  ('admin',   'Admin',    80, 'Full data + configuration access; manages members and settings.'),
  ('manager', 'Manager',  60, 'Full access to business data (CRM, finance, sales, scheduling, support, projects); no destructive or admin actions.'),
  ('staff',   'Staff',    40, 'Day-to-day operational access: CRM, scheduling, support, comms; read-only finance/sales.'),
  ('viewer',  'Viewer',   20, 'Read-only access to business data.')
on conflict (key) do nothing;
--> statement-breakpoint
alter table public.permission_roles enable row level security;
--> statement-breakpoint
drop policy if exists permission_roles_read_all on public.permission_roles;
--> statement-breakpoint
create policy permission_roles_read_all on public.permission_roles for select using (true);
--> statement-breakpoint
grant select on public.permission_roles to authenticated, app_ledger;
--> statement-breakpoint

create table if not exists public.member_roles (
  org_id     uuid not null,
  profile_id uuid not null,
  role_key   text not null references public.permission_roles(key),
  granted_by uuid,
  granted_at timestamptz not null default now(),
  primary key (org_id, profile_id, role_key)
);
--> statement-breakpoint
create index if not exists member_roles_profile_idx on public.member_roles (org_id, profile_id);
--> statement-breakpoint
alter table public.member_roles enable row level security;
--> statement-breakpoint
alter table public.member_roles force row level security;
--> statement-breakpoint
drop policy if exists member_roles_org_guc on public.member_roles;
--> statement-breakpoint
create policy member_roles_org_guc on public.member_roles for all
  using (org_id::text = current_setting('app.current_org_id', true))
  with check (org_id::text = current_setting('app.current_org_id', true));
--> statement-breakpoint
grant usage on schema public to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.member_roles to app_ledger;
--> statement-breakpoint

create table if not exists public.permission_rules (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null,
  role_key   text not null references public.permission_roles(key),
  module     text not null,
  can_view   boolean not null default false,
  can_create boolean not null default false,
  can_edit   boolean not null default false,
  can_delete boolean not null default false,
  can_export boolean not null default false,
  can_manage boolean not null default false,
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create unique index if not exists permission_rules_scope_uniq
  on public.permission_rules (org_id, role_key, module);
--> statement-breakpoint
alter table public.permission_rules enable row level security;
--> statement-breakpoint
alter table public.permission_rules force row level security;
--> statement-breakpoint
drop policy if exists permission_rules_org_guc on public.permission_rules;
--> statement-breakpoint
create policy permission_rules_org_guc on public.permission_rules for all
  using (org_id::text = current_setting('app.current_org_id', true))
  with check (org_id::text = current_setting('app.current_org_id', true));
--> statement-breakpoint
grant select, insert, update, delete on public.permission_rules to app_ledger;
--> statement-breakpoint

-- Backfill: preserve every current user's access. Existing 'member' → 'manager'
-- (full business access, no destructive/admin) so enforcement locks nobody out.
insert into public.member_roles (org_id, profile_id, role_key)
select om.organization_id, om.profile_id,
       case om.role when 'owner' then 'owner'
                    when 'admin' then 'admin'
                    else 'manager' end
from public.organization_members om
on conflict do nothing;
