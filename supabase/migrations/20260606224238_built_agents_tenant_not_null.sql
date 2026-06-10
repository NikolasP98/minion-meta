-- Phase 4: built_agents are org-owned (no global drafts). Make tenant_id
-- required. 0 rows on prod, so the constraint applies cleanly;
-- builder.service.createBuiltAgent always supplies tenant_id.
alter table public.built_agents alter column tenant_id set not null;
