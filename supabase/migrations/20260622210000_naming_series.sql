-- Naming series — human-readable document IDs (ERPNext tabSeries port).
-- Per-(org, evaluated-prefix) counter, bumped atomically by naming-series.ts.
-- human_id columns are additive + nullable (backfill-friendly), org-unique.

create table if not exists public.naming_series_counters (
  org_id     text   not null,
  prefix     text   not null,   -- evaluated prefix, e.g. 'SO-2026-'
  n          bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (org_id, prefix)
);
--> statement-breakpoint
grant select, insert, update on public.naming_series_counters to app_ledger;
--> statement-breakpoint
alter table public.naming_series_counters enable row level security;
--> statement-breakpoint
alter table public.naming_series_counters force  row level security;
--> statement-breakpoint
create policy naming_series_counters_org_guc on public.naming_series_counters
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint

-- human_id columns (nullable; stamped at create time going forward).
alter table public.sales_orders   add column if not exists human_id text;
--> statement-breakpoint
alter table public.support_issues add column if not exists human_id text;
--> statement-breakpoint
alter table public.crm_contacts   add column if not exists human_id text;
--> statement-breakpoint
create unique index if not exists sales_orders_human_id_uniq
  on public.sales_orders (org_id, human_id) where human_id is not null;
--> statement-breakpoint
create unique index if not exists support_issues_human_id_uniq
  on public.support_issues (org_id, human_id) where human_id is not null;
--> statement-breakpoint
create unique index if not exists crm_contacts_human_id_uniq
  on public.crm_contacts (org_id, human_id) where human_id is not null;
--> statement-breakpoint
