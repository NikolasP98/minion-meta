-- CRM per-org settings: control over which linked channels feed the CRM.
-- A single jsonb row per org holds CRM-level preferences. v1 key:
--   disabled_channels: text[]  — channels skipped by the harvest.
--
-- Graceful default: a missing table OR missing row means "all channels enabled",
-- so the harvest gate and channel manager are safe even before this migration
-- reaches an environment (the service swallows a missing-relation error).
--
-- Tenancy: org_id text (matches messages.org_id), enforced by the app_ledger
-- role + app.current_org_id GUC, identical to the other crm_* tables.

create table if not exists public.crm_settings (
  org_id     text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
grant select, insert, update, delete on public.crm_settings to app_ledger;
--> statement-breakpoint
alter table public.crm_settings enable row level security;
--> statement-breakpoint
alter table public.crm_settings force  row level security;
--> statement-breakpoint
create policy crm_settings_org_guc on public.crm_settings
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
