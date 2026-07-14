-- Link a Hub authoring draft to the external runtime agent created at publish time.
-- The identifier is intentionally nullable and has no database FK because the
-- runtime agent is owned by the connected Minion gateway, not this database.

alter table public.built_agents
  add column if not exists runtime_agent_id text;

create index if not exists idx_built_agents_runtime_agent
  on public.built_agents (runtime_agent_id)
  where runtime_agent_id is not null;

comment on column public.built_agents.runtime_agent_id is
  'External Minion gateway agent ID synchronized when an authoring draft is published.';
