-- Server-side org isolation for channels + channel_assignments via the
-- app_ledger role + app.current_org_id GUC (withOrgCore). Both carry tenant_id
-- directly. Coexists with the existing auth.uid() client policies.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_ledger') then
    create role app_ledger nologin nobypassrls;
  end if;
end $$;
--> statement-breakpoint
grant app_ledger to postgres;
--> statement-breakpoint
grant usage on schema public to app_ledger;
--> statement-breakpoint
grant select on public.profiles, public.organization_members to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.channels to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.channel_assignments to app_ledger;
--> statement-breakpoint
alter table public.channels enable row level security;
--> statement-breakpoint
alter table public.channels force row level security;
--> statement-breakpoint
alter table public.channel_assignments enable row level security;
--> statement-breakpoint
alter table public.channel_assignments force row level security;
--> statement-breakpoint
drop policy if exists channels_org_guc on public.channels;
--> statement-breakpoint
create policy channels_org_guc on public.channels for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
--> statement-breakpoint
drop policy if exists channel_assignments_org_guc on public.channel_assignments;
--> statement-breakpoint
create policy channel_assignments_org_guc on public.channel_assignments for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
