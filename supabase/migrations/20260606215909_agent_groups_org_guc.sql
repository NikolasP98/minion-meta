-- Server-side org enforcement for agent_groups (+ members) via the app_ledger
-- role + app.current_org_id GUC (withOrgCore). Mirrors messages/agent_memories.
--
-- These tables already carry client-facing auth.uid() policies (admin_all,
-- member_sel). Those evaluate FALSE under `SET LOCAL ROLE app_ledger` (no JWT →
-- auth.uid() is null), so the hub server would see zero rows. We ADD a
-- permissive GUC policy that the app_ledger path satisfies; permissive policies
-- are OR'd, so the existing client policies are untouched (the browser surface
-- keeps working) and the server path gains real DB-enforced isolation.
--
-- agent_group_members has no tenant_id; it is isolated transitively through its
-- parent group's tenant_id.

-- app_ledger already exists (messages_rls); create idempotently for safety.
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
-- Cross-cutting read grant: every table's INHERITED client policies (admin_all /
-- member_sel / *_access) reference profiles + organization_members. RLS policy
-- expressions run as the querying role, so app_ledger MUST be able to read those
-- tables or the inherited policy errors (42501) instead of evaluating false.
-- Both tables keep their own auth.uid() RLS, so app_ledger sees 0 rows there —
-- the inherited admin/member checks harmlessly evaluate false and the *_org_guc
-- policy is what actually grants access. Granted once here; reused by all later
-- org_guc migrations.
grant select on public.profiles, public.organization_members to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.agent_groups to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.agent_group_members to app_ledger;
--> statement-breakpoint
-- Force so the policies bind even for the table owner; the real enforcement is
-- the non-bypass app_ledger role used by withOrgCore. (postgres keeps bypassing,
-- so un-converted getCoreDb() callers are unaffected during rollout.)
alter table public.agent_groups enable row level security;
--> statement-breakpoint
alter table public.agent_groups force row level security;
--> statement-breakpoint
alter table public.agent_group_members enable row level security;
--> statement-breakpoint
alter table public.agent_group_members force row level security;
--> statement-breakpoint
-- Org isolation for the app_ledger (withOrgCore) path. Unset/empty GUC → text
-- compare against '' / null → false → zero rows (fail-closed).
drop policy if exists agent_groups_org_guc on public.agent_groups;
--> statement-breakpoint
create policy agent_groups_org_guc on public.agent_groups
  for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
--> statement-breakpoint
drop policy if exists agent_group_members_org_guc on public.agent_group_members;
--> statement-breakpoint
create policy agent_group_members_org_guc on public.agent_group_members
  for all
  using (
    exists (
      select 1 from public.agent_groups g
      where g.id = agent_group_members.group_id
        and g.tenant_id::text = current_setting('app.current_org_id', true)
    )
  )
  with check (
    exists (
      select 1 from public.agent_groups g
      where g.id = agent_group_members.group_id
        and g.tenant_id::text = current_setting('app.current_org_id', true)
    )
  );
