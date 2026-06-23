-- plugin_org_disabled — DB-authoritative per-org plugin disable state.
--
-- Org-scope settings belong in the DB; the gateway's `plugins.orgDisabled` map
-- is now a derived cache the hub pushes via reconcileOrgConfig(). A row with
-- disabled=true means that org turned the plugin off (absent = enabled,
-- mirroring the gateway's fail-open semantics). Keyed (org, gateway, plugin):
-- plugins install globally on the shared gateway, each org toggles its own.
--
-- Access: per-org writes go through withOrgCore (app_ledger role + org GUC, RLS
-- enforced); the cross-org reconcile read uses getCoreDb() as postgres
-- (rolbypassrls) filtered strictly by gateway_id (admin/infra path only).
create table if not exists public.plugin_org_disabled (
  org_id     uuid not null,
  gateway_id uuid not null references public.gateway (id) on delete cascade,
  plugin_id  text not null,
  disabled   boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (org_id, gateway_id, plugin_id)
);
--> statement-breakpoint
create index if not exists plugin_org_disabled_gateway_idx
  on public.plugin_org_disabled (gateway_id);
--> statement-breakpoint
-- Server-side org isolation via the app_ledger role + app.current_org_id GUC
-- (withOrgCore), mirroring config_snapshots_org_guc.
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
grant select, insert, update, delete on public.plugin_org_disabled to app_ledger;
--> statement-breakpoint
alter table public.plugin_org_disabled enable row level security;
--> statement-breakpoint
alter table public.plugin_org_disabled force row level security;
--> statement-breakpoint
drop policy if exists plugin_org_disabled_org_guc on public.plugin_org_disabled;
--> statement-breakpoint
create policy plugin_org_disabled_org_guc on public.plugin_org_disabled for all
  using (org_id::text = current_setting('app.current_org_id', true))
  with check (org_id::text = current_setting('app.current_org_id', true));
--> statement-breakpoint
comment on table public.plugin_org_disabled is
  'DB-authoritative per-org plugin disable state. Hub pushes the derived plugins.orgDisabled map to the gateway via reconcileOrgConfig. org_guc RLS for withOrgCore writes; gateway-filtered service-role reads for reconcile.';
