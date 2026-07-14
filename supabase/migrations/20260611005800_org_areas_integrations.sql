-- org_areas v2 — integrations layer + provisioned (virtual) agents.

alter table public.org_areas
  add column if not exists integration_keys text[] not null default '{}',
  add column if not exists virtual_agents   jsonb  not null default '[]';

comment on column public.org_areas.integration_keys is
  'Keys into the hub INTEGRATIONS registry (branded third-party platforms used by this area).';
comment on column public.org_areas.virtual_agents is
  'Provisioned single-function agents: [{id,name,role,skillKeys,integrationKeys}].';
