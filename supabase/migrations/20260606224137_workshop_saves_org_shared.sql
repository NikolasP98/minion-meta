-- Phase 4: make workshop_saves pure ORG-SHARED. Backfill the legacy null-tenant
-- row to its owner's org (fallback: the single data org), replace the
-- creator-private `member_sel` policy (profile_id OR tenant_id IS NULL OR member)
-- with org-membership-only, and add the app_ledger org_guc policy for the
-- withOrgCore server path.

-- 1) backfill null tenant_id from the owner's org membership
update public.workshop_saves ws
set tenant_id = om.organization_id
from public.organization_members om
where ws.tenant_id is null and om.profile_id = ws.profile_id;
--> statement-breakpoint
-- any still-null (no membership) → the single data org (FACES)
update public.workshop_saves
set tenant_id = '21e0601b-f632-43fd-8414-d644af4271f4'
where tenant_id is null;
--> statement-breakpoint
-- 2) client policy: pure org membership (drop creator-private + null-shared)
drop policy if exists member_sel on public.workshop_saves;
--> statement-breakpoint
create policy workshop_saves_member_sel on public.workshop_saves for select
  using (exists (select 1 from public.organization_members m
                 where m.organization_id = workshop_saves.tenant_id
                   and m.profile_id = auth.uid()));
--> statement-breakpoint
-- 3) server path: app_ledger org_guc
grant app_ledger to postgres;
--> statement-breakpoint
grant usage on schema public to app_ledger;
--> statement-breakpoint
grant select on public.profiles, public.organization_members to app_ledger;
--> statement-breakpoint
grant select, insert, update, delete on public.workshop_saves to app_ledger;
--> statement-breakpoint
alter table public.workshop_saves enable row level security;
--> statement-breakpoint
alter table public.workshop_saves force row level security;
--> statement-breakpoint
drop policy if exists workshop_saves_org_guc on public.workshop_saves;
--> statement-breakpoint
create policy workshop_saves_org_guc on public.workshop_saves for all
  using (tenant_id::text = current_setting('app.current_org_id', true))
  with check (tenant_id::text = current_setting('app.current_org_id', true));
