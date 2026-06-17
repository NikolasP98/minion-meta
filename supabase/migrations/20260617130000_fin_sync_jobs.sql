-- Durable background sync jobs for hub-native Finances (spec: finances bg-sync).
-- One row per sync run; progress/cursor/cancel all persisted so a sync survives
-- navigation, hub redeploys, and a worker dying mid-run (resumed by the cron tick).
--
-- Tenancy: org_id text, enforced by app_ledger role + app.current_org_id GUC.
-- Idempotent: CREATE ... IF NOT EXISTS throughout (never drizzle-kit push core DB).

create table if not exists public.fin_sync_jobs (
  id               uuid primary key default gen_random_uuid(),
  org_id           text not null,
  provider         text not null,
  status           text not null default 'queued',
  total            integer,
  processed        integer not null default 0,
  page_cursor      text,
  error            text,
  cancel_requested boolean not null default false,
  started_at       timestamptz,
  finished_at      timestamptz,
  heartbeat_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
--> statement-breakpoint
create unique index if not exists fin_sync_jobs_active_uq
  on public.fin_sync_jobs (org_id, provider) where status in ('queued','running');
--> statement-breakpoint
create index if not exists fin_sync_jobs_org_provider_created_idx
  on public.fin_sync_jobs (org_id, provider, created_at);
--> statement-breakpoint
create index if not exists fin_sync_jobs_status_heartbeat_idx
  on public.fin_sync_jobs (status, heartbeat_at);
--> statement-breakpoint
grant select, insert, update, delete on public.fin_sync_jobs to app_ledger;
--> statement-breakpoint
alter table public.fin_sync_jobs enable row level security;
--> statement-breakpoint
alter table public.fin_sync_jobs force  row level security;
--> statement-breakpoint
create policy fin_sync_jobs_org_guc on public.fin_sync_jobs
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
