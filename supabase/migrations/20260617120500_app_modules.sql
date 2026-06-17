-- Per-org enable/disable state for hub-native modules ('crm', 'finances').
-- Absent row means the module is considered enabled (default-on).
--
-- Tenancy: org_id text, enforced by app_ledger role + app.current_org_id GUC.
-- Idempotent: CREATE ... IF NOT EXISTS throughout.

create table if not exists public.app_modules (
  org_id     text not null,
  module_id  text not null,
  enabled    boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (org_id, module_id)
);
--> statement-breakpoint
grant select, insert, update, delete on public.app_modules to app_ledger;
--> statement-breakpoint
alter table public.app_modules enable row level security;
--> statement-breakpoint
alter table public.app_modules force  row level security;
--> statement-breakpoint
create policy app_modules_org_guc on public.app_modules
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
