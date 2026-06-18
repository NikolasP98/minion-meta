-- CRM per-message sentiment (C2 groundwork). One row per scored inbound message;
-- the monthly sentiment trend aggregates these. Tenancy: org_id text + app_ledger
-- role + app.current_org_id GUC (same as crm_/fin_ tables). Idempotent.

create table if not exists public.crm_message_sentiment (
  org_id      text not null,
  message_id  uuid not null,
  score       double precision not null,
  label       text not null,
  model       text,
  analyzed_at timestamptz not null default now(),
  primary key (org_id, message_id)
);
--> statement-breakpoint
create index if not exists crm_message_sentiment_org_time_idx
  on public.crm_message_sentiment (org_id, analyzed_at);
--> statement-breakpoint
grant select, insert, update, delete on public.crm_message_sentiment to app_ledger;
--> statement-breakpoint
alter table public.crm_message_sentiment enable row level security;
--> statement-breakpoint
alter table public.crm_message_sentiment force  row level security;
--> statement-breakpoint
create policy crm_message_sentiment_org_guc on public.crm_message_sentiment
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
