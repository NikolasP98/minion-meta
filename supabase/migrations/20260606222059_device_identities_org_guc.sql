-- Server-side org isolation for device_identities via the app_ledger role + app.current_org_id
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
grant select, insert, update, delete on public.device_identities to app_ledger;
--> statement-breakpoint
alter table public.device_identities enable row level security;
--> statement-breakpoint
alter table public.device_identities force row level security;
--> statement-breakpoint
drop policy if exists device_identities_org_guc on public.device_identities;
--> statement-breakpoint
create policy device_identities_org_guc on public.device_identities for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
