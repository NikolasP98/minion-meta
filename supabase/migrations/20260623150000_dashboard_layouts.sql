-- Per-org DEFAULT dashboard layouts (admin-pinned arrangement for all users
-- who haven't customized their own). One row per (org, dashboard id); the
-- `layout` jsonb is the GridLayout blob { order, span }. See pg-dashboard-schema.ts.
--
-- Tenancy: org_id text, enforced by the app_ledger role + app.current_org_id
-- GUC. Idempotent (CREATE ... IF NOT EXISTS); never drizzle-kit push.

create table if not exists public.dashboard_layouts (
  org_id       text not null,
  dashboard_id text not null,
  layout       jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  primary key (org_id, dashboard_id)
);
--> statement-breakpoint
grant select, insert, update, delete on public.dashboard_layouts to app_ledger;
--> statement-breakpoint
alter table public.dashboard_layouts enable row level security;
--> statement-breakpoint
alter table public.dashboard_layouts force  row level security;
--> statement-breakpoint
create policy dashboard_layouts_org_guc on public.dashboard_layouts
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
