alter table public.agent_artifacts add column if not exists version int not null default 1;
alter table public.agent_artifacts add column if not exists prompt text;

create table if not exists public.agent_artifact_revisions (
  id          uuid primary key default gen_random_uuid(),
  org_id      text not null,
  artifact_id uuid not null references public.agent_artifacts(id) on delete cascade,
  version     int not null,
  prompt      text,
  html        text not null,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists agent_artifact_revisions_org_artifact_idx on public.agent_artifact_revisions (org_id, artifact_id, version);
grant select, insert, update, delete on public.agent_artifact_revisions to app_ledger;
alter table public.agent_artifact_revisions enable row level security;
alter table public.agent_artifact_revisions force row level security;
create policy agent_artifact_revisions_org_guc on public.agent_artifact_revisions
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
