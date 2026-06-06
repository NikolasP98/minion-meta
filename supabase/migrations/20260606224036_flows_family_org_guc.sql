-- Org-shared server-side isolation for flows / flow_groups / flow_runs via the
-- app_ledger role + app.current_org_id GUC (withOrgCore). tenant_id is TEXT here
-- (holds organizations.id as text), so the GUC compare needs no cast. No user
-- gating — any org member shares the org's flows (Phase 4: pure org-shared).
do $$ begin
  if not exists (select 1 from pg_roles where rolname='app_ledger') then
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
grant select, insert, update, delete on public.flows to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.flow_groups to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.flow_runs to app_ledger;
--> statement-breakpoint
alter table public.flows enable row level security;
--> statement-breakpoint
alter table public.flows force row level security;
--> statement-breakpoint
alter table public.flow_groups enable row level security;
--> statement-breakpoint
alter table public.flow_groups force row level security;
--> statement-breakpoint
alter table public.flow_runs enable row level security;
--> statement-breakpoint
alter table public.flow_runs force row level security;
--> statement-breakpoint
drop policy if exists flows_org_guc on public.flows;
--> statement-breakpoint
create policy flows_org_guc on public.flows for all
  using (tenant_id = current_setting('app.current_org_id', true))
  with check (tenant_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
drop policy if exists flow_groups_org_guc on public.flow_groups;
--> statement-breakpoint
create policy flow_groups_org_guc on public.flow_groups for all
  using (tenant_id = current_setting('app.current_org_id', true))
  with check (tenant_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
drop policy if exists flow_runs_org_guc on public.flow_runs;
--> statement-breakpoint
create policy flow_runs_org_guc on public.flow_runs for all
  using (tenant_id = current_setting('app.current_org_id', true))
  with check (tenant_id = current_setting('app.current_org_id', true));
