-- Dedicated, non-bypass role that ledger queries run AS (via SET LOCAL ROLE).
-- nologin: it is assumed via SET ROLE, never connected to directly.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_ledger') then
    create role app_ledger nologin nobypassrls;
  end if;
end $$;
--> statement-breakpoint
-- Allow the connecting role (Supabase 'postgres') to SET ROLE app_ledger.
grant app_ledger to postgres;
--> statement-breakpoint
grant usage on schema public to app_ledger;
--> statement-breakpoint
grant select, insert, update on public.messages to app_ledger;
--> statement-breakpoint
-- Partial unique dedupe index for migration + cross-source idempotency.
create unique index if not exists messages_org_channel_account_msg_uniq
  on public.messages (org_id, channel, account_id, message_id)
  where message_id is not null;
--> statement-breakpoint
-- Enable + FORCE so even the table owner is subject to policies.
alter table public.messages enable row level security;
--> statement-breakpoint
alter table public.messages force row level security;
--> statement-breakpoint
-- Org isolation: a session may only see/write rows whose org_id matches the
-- GUC set by withOrg(). The `true` (missing_ok) means an unset GUC yields NULL
-- → predicate false → zero rows (fail-closed).
create policy messages_org_isolation on public.messages
  for all
  using (org_id = current_setting('app.current_org_id', true))
  with check (org_id = current_setting('app.current_org_id', true));
