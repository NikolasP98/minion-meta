-- Link profiles.id to GoTrue-managed auth.users (added here, not in Drizzle,
-- because Drizzle must not manage the auth schema).
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users (id) on delete cascade;
--> statement-breakpoint
-- Enable RLS.
alter table public.profiles enable row level security;
--> statement-breakpoint
alter table public.user_identities enable row level security;
--> statement-breakpoint
-- A user can read/update only their own profile.
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
--> statement-breakpoint
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);
--> statement-breakpoint
-- A user can read only their own identities. Writes go through the service
-- role (identity-sync), which bypasses RLS, so no insert/update policy here.
create policy "identities_self_select" on public.user_identities
  for select using (auth.uid() = user_id);
