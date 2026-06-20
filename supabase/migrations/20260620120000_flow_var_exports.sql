-- Per-org toggle state for flow exported variables (declaration is code-side).
create table if not exists public.flow_var_exports (
  id         uuid primary key default gen_random_uuid(),
  org_id     text not null,
  flow_id    text not null,
  var_key    text not null,
  enabled    boolean not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists flow_var_exports_org_flow_key_uniq on public.flow_var_exports (org_id, flow_id, var_key);

grant select, insert, update, delete on public.flow_var_exports to app_ledger;

alter table public.flow_var_exports enable row level security;
alter table public.flow_var_exports force row level security;

create policy flow_var_exports_org_guc on public.flow_var_exports
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
