-- Server-side org isolation for the builder cluster via the app_ledger role +
-- app.current_org_id GUC (withOrgCore). Parent tables (built_skills,
-- built_agents, built_tools, agent_built_skills) carry tenant_id directly; the
-- child tables (built_chapters, built_chapter_edges, built_chapter_tools,
-- built_skill_tools, built_agent_skills) have no tenant_id and are scoped via a
-- parent join — mirroring the existing *_access client policies. Coexists with
-- those auth.uid() policies (permissive OR).
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
grant select on public.profiles, public.organization_members to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.built_skills to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.built_agents to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.built_tools to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.agent_built_skills to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.built_chapters to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.built_chapter_edges to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.built_chapter_tools to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.built_skill_tools to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.built_agent_skills to app_ledger;
--> statement-breakpoint
-- enable + force on every cluster table
alter table public.built_skills enable row level security;
--> statement-breakpoint
alter table public.built_skills force row level security;
--> statement-breakpoint
alter table public.built_agents enable row level security;
--> statement-breakpoint
alter table public.built_agents force row level security;
--> statement-breakpoint
alter table public.built_tools enable row level security;
--> statement-breakpoint
alter table public.built_tools force row level security;
--> statement-breakpoint
alter table public.agent_built_skills enable row level security;
--> statement-breakpoint
alter table public.agent_built_skills force row level security;
--> statement-breakpoint
alter table public.built_chapters enable row level security;
--> statement-breakpoint
alter table public.built_chapters force row level security;
--> statement-breakpoint
alter table public.built_chapter_edges enable row level security;
--> statement-breakpoint
alter table public.built_chapter_edges force row level security;
--> statement-breakpoint
alter table public.built_chapter_tools enable row level security;
--> statement-breakpoint
alter table public.built_chapter_tools force row level security;
--> statement-breakpoint
alter table public.built_skill_tools enable row level security;
--> statement-breakpoint
alter table public.built_skill_tools force row level security;
--> statement-breakpoint
alter table public.built_agent_skills enable row level security;
--> statement-breakpoint
alter table public.built_agent_skills force row level security;
--> statement-breakpoint
-- direct tenant_id policies
drop policy if exists built_skills_org_guc on public.built_skills;
--> statement-breakpoint
create policy built_skills_org_guc on public.built_skills for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
--> statement-breakpoint
drop policy if exists built_agents_org_guc on public.built_agents;
--> statement-breakpoint
create policy built_agents_org_guc on public.built_agents for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
--> statement-breakpoint
drop policy if exists built_tools_org_guc on public.built_tools;
--> statement-breakpoint
create policy built_tools_org_guc on public.built_tools for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
--> statement-breakpoint
drop policy if exists agent_built_skills_org_guc on public.agent_built_skills;
--> statement-breakpoint
create policy agent_built_skills_org_guc on public.agent_built_skills for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
--> statement-breakpoint
-- child tables: parent-join (mirror existing *_access joins)
drop policy if exists built_chapters_org_guc on public.built_chapters;
--> statement-breakpoint
create policy built_chapters_org_guc on public.built_chapters for all
  using (exists (select 1 from public.built_skills s where s.id = built_chapters.skill_id
                 and s.tenant_id::text = current_setting('app.current_org_id', true)))
  with check (exists (select 1 from public.built_skills s where s.id = built_chapters.skill_id
                 and s.tenant_id::text = current_setting('app.current_org_id', true)));
--> statement-breakpoint
drop policy if exists built_chapter_edges_org_guc on public.built_chapter_edges;
--> statement-breakpoint
create policy built_chapter_edges_org_guc on public.built_chapter_edges for all
  using (exists (select 1 from public.built_skills s where s.id = built_chapter_edges.skill_id
                 and s.tenant_id::text = current_setting('app.current_org_id', true)))
  with check (exists (select 1 from public.built_skills s where s.id = built_chapter_edges.skill_id
                 and s.tenant_id::text = current_setting('app.current_org_id', true)));
--> statement-breakpoint
drop policy if exists built_chapter_tools_org_guc on public.built_chapter_tools;
--> statement-breakpoint
create policy built_chapter_tools_org_guc on public.built_chapter_tools for all
  using (exists (select 1 from public.built_chapters c join public.built_skills s on s.id = c.skill_id
                 where c.id = built_chapter_tools.chapter_id
                 and s.tenant_id::text = current_setting('app.current_org_id', true)))
  with check (exists (select 1 from public.built_chapters c join public.built_skills s on s.id = c.skill_id
                 where c.id = built_chapter_tools.chapter_id
                 and s.tenant_id::text = current_setting('app.current_org_id', true)));
--> statement-breakpoint
drop policy if exists built_skill_tools_org_guc on public.built_skill_tools;
--> statement-breakpoint
create policy built_skill_tools_org_guc on public.built_skill_tools for all
  using (exists (select 1 from public.built_skills s where s.id = built_skill_tools.skill_id
                 and s.tenant_id::text = current_setting('app.current_org_id', true)))
  with check (exists (select 1 from public.built_skills s where s.id = built_skill_tools.skill_id
                 and s.tenant_id::text = current_setting('app.current_org_id', true)));
--> statement-breakpoint
drop policy if exists built_agent_skills_org_guc on public.built_agent_skills;
--> statement-breakpoint
create policy built_agent_skills_org_guc on public.built_agent_skills for all
  using (exists (select 1 from public.built_agents a where a.id = built_agent_skills.agent_id
                 and a.tenant_id::text = current_setting('app.current_org_id', true)))
  with check (exists (select 1 from public.built_agents a where a.id = built_agent_skills.agent_id
                 and a.tenant_id::text = current_setting('app.current_org_id', true)));
