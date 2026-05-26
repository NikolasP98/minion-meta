-- Widen profiles.role to include super_admin (column is a text check, not a PG enum type).
alter table public.profiles drop constraint if exists profiles_role_check;
--> statement-breakpoint
alter table public.profiles
  add constraint profiles_role_check check (role in ('user','admin','super_admin'));
--> statement-breakpoint

-- Partial unique index: one open request per (user, org).
create unique index if not exists uq_join_request_pending
  on public.join_request (user_id, organization_id)
  where status = 'pending';
--> statement-breakpoint

-- Enable RLS (defense-in-depth; the hub server uses the service-role key and
-- bypasses these policies — the can() layer enforces visibility server-side).
alter table public.join_request enable row level security;
--> statement-breakpoint
alter table public.join_link enable row level security;
--> statement-breakpoint

-- Requester can read/insert their own requests.
create policy "join_request_self_select" on public.join_request
  for select using (auth.uid() = supabase_id);
--> statement-breakpoint
create policy "join_request_self_insert" on public.join_request
  for insert with check (auth.uid() = supabase_id);
--> statement-breakpoint

-- Admin / super-admin can read + update all requests.
create policy "join_request_admin_all" on public.join_request
  for all using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );
--> statement-breakpoint

-- Join links: admin / super-admin only, all ops.
create policy "join_link_admin_all" on public.join_link
  for all using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );
