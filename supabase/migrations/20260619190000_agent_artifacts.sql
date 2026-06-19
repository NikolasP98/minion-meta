-- Hub-native dynamic artifacts: per-org, per-agent self-contained HTML bundles.
-- Manual admin create now; LLM-generated (5b) later. Org isolation via the
-- existing app_ledger role + app.current_org_id GUC (same pattern as sched_*/fin_*).

create table if not exists public.agent_artifacts (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  agent_id    text not null,
  title       text not null,
  description text not null default '',
  icon        text not null default 'LayoutDashboard',
  html        text not null,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists agent_artifacts_org_agent_idx on public.agent_artifacts (org_id, agent_id);

grant select, insert, update, delete on public.agent_artifacts to app_ledger;

alter table public.agent_artifacts enable row level security;
alter table public.agent_artifacts force  row level security;

create policy agent_artifacts_org_guc on public.agent_artifacts
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
