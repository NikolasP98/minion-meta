-- Stage 5 prep: move the user-admin surface (listUsers/deleteUser/role+alias
-- management) off the legacy Turso `user` table onto Supabase `profiles`.
-- `profiles` lacked the two columns the admin UI manages; add them nullable.
-- Zero backfill needed: every legacy Turso `user` row has alias = role_id = null.
alter table public.profiles add column if not exists alias text;
alter table public.profiles add column if not exists role_id text;

-- Alias is a per-user handle; keep it unique where present (matches the Turso
-- isAliasTaken check). Partial unique index ignores nulls.
create unique index if not exists profiles_alias_key
  on public.profiles (alias) where alias is not null;
