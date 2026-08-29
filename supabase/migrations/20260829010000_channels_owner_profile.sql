-- User-scoped channel ownership. The canonical Drizzle schema already exposes
-- this relation; keep deployed Supabase shape in lockstep.
alter table public.channels
  add column if not exists owner_profile_id uuid
  references public.profiles(id) on delete set null;

create index if not exists channels_owner_profile_idx
  on public.channels(owner_profile_id);
