-- Server-side org isolation for server_provision_configs via the app_ledger role + app.current_org_id
-- GUC (withOrgCore). Coexists with the existing auth.uid() client policies
-- (permissive OR), so the browser/PostgREST surface is unaffected.
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
-- inherited client policies reference these; app_ledger must read them to evaluate (returns false under app_ledger)
grant select on public.profiles, public.organization_members to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.server_provision_configs to app_ledger;
--> statement-breakpoint
alter table public.server_provision_configs enable row level security;
--> statement-breakpoint
alter table public.server_provision_configs force row level security;
--> statement-breakpoint
drop policy if exists server_provision_configs_org_guc on public.server_provision_configs;
--> statement-breakpoint
create policy server_provision_configs_org_guc on public.server_provision_configs for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
