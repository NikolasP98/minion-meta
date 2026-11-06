-- Disposable Slice5 PG17 fixture: reproduce the Supabase creator hierarchy
-- without reusing the active QA database. The cluster bootstrap superuser is
-- supabase_admin; postgres is the production migration actor.
create role postgres login nosuperuser inherit createrole nocreatedb noreplication bypassrls password 'postgres';
create role anon nologin nosuperuser inherit nocreaterole nocreatedb noreplication nobypassrls;
create role authenticated nologin nosuperuser inherit nocreaterole nocreatedb noreplication nobypassrls;
create role service_role nologin nosuperuser inherit nocreaterole nocreatedb noreplication bypassrls;
create role authenticator login nosuperuser noinherit nocreaterole nocreatedb noreplication nobypassrls password 'postgres';
create role supabase_auth_admin login nosuperuser noinherit nocreaterole nocreatedb noreplication nobypassrls password 'postgres';

alter database postgres owner to postgres;

grant anon, authenticated, service_role, authenticator to postgres with admin option;
grant anon, authenticated, service_role to authenticator with inherit false, set true;

create schema auth authorization supabase_admin;
grant usage on schema auth to postgres, anon, authenticated, service_role;
grant all on schema auth to supabase_auth_admin;

create table auth.users (
  id uuid primary key
);
alter table auth.users owner to supabase_auth_admin;
grant all on table auth.users to supabase_auth_admin;
grant select, references on table auth.users to postgres with grant option;

create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
alter function auth.uid() owner to supabase_auth_admin;
