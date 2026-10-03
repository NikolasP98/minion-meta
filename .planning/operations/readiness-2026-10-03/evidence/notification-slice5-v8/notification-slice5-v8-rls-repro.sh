#!/usr/bin/env bash
set -euo pipefail

parent_url="${MINION_QC_DATABASE_URL:-postgres://minion_qc:disposable-ci-only@127.0.0.1:55461/minion_qc_corpus}"
server_url="${parent_url%/*}/postgres"
database_name="minion_s5_v8_policy_repro"
worker_role="s5_v8_worker"
finalizer_role="s5_v8_finalizer"
artifact_dir="$(cd "$(dirname "$0")" && pwd)"
recursive_log="$artifact_dir/notification-slice5-v8-rls-recursive.log"
result_json="$artifact_dir/notification-slice5-v8-rls-repro.json"

cleanup() {
  psql "$server_url" -X -v ON_ERROR_STOP=1 -v database_name="$database_name" -v worker_role="$worker_role" -v finalizer_role="$finalizer_role" <<'SQL' >/dev/null
select pg_terminate_backend(pid) from pg_stat_activity
where datname=:'database_name' and pid<>pg_backend_pid();
select format('drop database if exists %I', :'database_name') \gexec
select format('drop role if exists %I', :'worker_role') \gexec
select format('drop role if exists %I', :'finalizer_role') \gexec
SQL
}
trap cleanup EXIT
cleanup

psql "$server_url" -X -v ON_ERROR_STOP=1 -v database_name="$database_name" -v worker_role="$worker_role" -v finalizer_role="$finalizer_role" <<'SQL' >/dev/null
select format('create role %I nologin nosuperuser nobypassrls noinherit', :'worker_role') \gexec
select format('create role %I nologin nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication', :'finalizer_role') \gexec
select format('create database %I', :'database_name') \gexec
SQL

# A plain superuser-owned PostgreSQL 18 installation creates no membership edge.
# A Supabase PostgreSQL 17 installation is separately bound to the frozen
# postgres<-supabase_admin ADMIN-only edge receipt. Every application/runtime
# edge is forbidden in both modes.
finalizer_catalog="$(psql "$server_url" -X -v ON_ERROR_STOP=1 -At -v finalizer_role="$finalizer_role" <<'SQL'
with edges as (
  select member_role.rolname member_name,grantor_role.rolname grantor_name,
    membership.admin_option,membership.inherit_option,membership.set_option
  from pg_auth_members membership
  join pg_roles target_role on target_role.oid=membership.roleid
  join pg_roles member_role on member_role.oid=membership.member
  join pg_roles grantor_role on grantor_role.oid=membership.grantor
  where target_role.rolname=:'finalizer_role'
)
select current_setting('server_version_num')||':'||count(*)||':'||
  coalesce(bool_and(admin_option and not inherit_option and not set_option),true)
from edges;
SQL
)"
if [[ "$finalizer_catalog" != 18*:0:true ]]; then
  echo "Unexpected PostgreSQL 18 finalizer creator catalog: $finalizer_catalog" >&2
  exit 1
fi

child_url="${parent_url%/*}/$database_name"
psql "$child_url" -X -v ON_ERROR_STOP=1 -v worker_role="$worker_role" <<'SQL' >/dev/null
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;

create table public.profiles(id uuid primary key, role text not null);
create table public.organization_members(
  organization_id uuid not null,
  profile_id uuid not null references public.profiles(id),
  role text not null,
  primary key(organization_id,profile_id)
);
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.organization_members enable row level security;
alter table public.organization_members force row level security;

insert into public.profiles values
  ('10000000-0000-4000-8000-000000000001','admin'),
  ('10000000-0000-4000-8000-000000000002','user');
insert into public.organization_members values
  ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','admin'),
  ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','member');

create policy profiles_self_select on public.profiles for select
  using (auth.uid()=id);
create policy organization_members_admin_all on public.organization_members
  using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy organization_members_self_select on public.organization_members for select
  using (profile_id=auth.uid());

create policy organization_members_projection_permissive on public.organization_members
  as permissive for select to s5_v8_worker
  using (organization_id=current_setting('app.current_org_id')::uuid);
create policy organization_members_projection_restrictive on public.organization_members
  as restrictive for select to s5_v8_worker
  using (organization_id=current_setting('app.current_org_id')::uuid);
create policy profiles_projection_permissive on public.profiles
  as permissive for select to s5_v8_worker
  using (exists(select 1 from public.organization_members m
    where m.organization_id=current_setting('app.current_org_id')::uuid and m.profile_id=profiles.id));
create policy profiles_projection_restrictive on public.profiles
  as restrictive for select to s5_v8_worker
  using (exists(select 1 from public.organization_members m
    where m.organization_id=current_setting('app.current_org_id')::uuid and m.profile_id=profiles.id));

grant usage on schema public,auth to s5_v8_worker;
grant execute on function auth.uid() to s5_v8_worker;
grant select on public.profiles,public.organization_members to s5_v8_worker;
SQL

set +e
psql "$child_url" -X -v ON_ERROR_STOP=1 -v worker_role="$worker_role" >"$recursive_log" 2>&1 <<'SQL'
set role s5_v8_worker;
select set_config('request.jwt.claim.sub','',false),
       set_config('app.current_org_id','20000000-0000-4000-8000-000000000001',false);
select count(*) from public.organization_members;
SQL
recursive_status=$?
set -e
if [[ "$recursive_status" -eq 0 ]] || ! rg -q 'infinite recursion detected in policy for relation "(organization_members|profiles)"' "$recursive_log"; then
  echo "Expected exact RLS recursion was not reproduced" >&2
  cat "$recursive_log" >&2
  exit 1
fi

# Exclude the projection role from the pre-existing browser/application policy union while
# retaining every role that currently has the corresponding relation privilege plus the exact
# relation owner. The v7 worker keeps one complete policy per source relation.
psql "$child_url" -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
select format('alter policy profiles_self_select on public.profiles to anon,authenticated,service_role,app_ledger,%I',current_user) \gexec
select format('alter policy organization_members_admin_all on public.organization_members to anon,authenticated,service_role,app_ledger,%I',current_user) \gexec
select format('alter policy organization_members_self_select on public.organization_members to anon,authenticated,service_role,app_ledger,%I',current_user) \gexec
drop policy organization_members_projection_restrictive on public.organization_members;
drop policy profiles_projection_restrictive on public.profiles;
SQL

policy_catalog="$(psql "$child_url" -X -v ON_ERROR_STOP=1 -At <<'SQL'
with expected(role_name) as (values ('anon'),('authenticated'),('service_role'),('app_ledger'),(current_user)),
legacy as (
  select policyname,roles from pg_policies
  where schemaname='public' and policyname in
    ('profiles_self_select','organization_members_admin_all','organization_members_self_select')
), worker as (
  select policyname,roles,permissive,cmd from pg_policies
  where schemaname='public' and policyname in
    ('organization_members_projection_permissive','profiles_projection_permissive')
)
select
  (select count(*)=3 and bool_and(
    cardinality(roles)=5
    and not exists(select unnest(roles)::text except select role_name from expected)
    and not exists(select role_name from expected except select unnest(roles)::text)
  ) from legacy)::text || ':' ||
  (select count(*)=2 and bool_and(
    roles=array['s5_v8_worker']::name[] and permissive='PERMISSIVE' and cmd='SELECT'
  ) from worker)::text;
SQL
)"
if [[ "$policy_catalog" != "true:true" ]]; then
  echo "Retargeted policy catalog is not exact: $policy_catalog" >&2
  exit 1
fi

safe_rows="$(psql "$child_url" -X -v ON_ERROR_STOP=1 -At <<'SQL'
set role s5_v8_worker;
select set_config('request.jwt.claim.sub','',false),
       set_config('app.current_org_id','20000000-0000-4000-8000-000000000001',false);
select (select count(*) from public.organization_members)::text || ':' ||
       (select count(*) from public.profiles)::text;
SQL
)"
safe_rows="$(printf '%s\n' "$safe_rows" | tail -n 1)"
if [[ "$safe_rows" != "2:2" ]]; then
  echo "Retargeted policy proof returned $safe_rows, expected 2:2" >&2
  exit 1
fi

cat >"$result_json" <<JSON
{
  "database": "disposable child, removed",
  "existingPublicPolicyResult": "infinite_recursion",
  "recursiveExitCode": $recursive_status,
  "retargetedPolicyResult": "pass",
  "plainPostgresFinalizerCreatorCatalog": "$finalizer_catalog",
  "supabasePostgres17CreatorReceipt": "hub-bootstrap-pg17-postconditions.log sha256 b707d6d9ca01c14e41ac5f424697fe30d321da3ce12b773ec6ef174f32afd377",
  "supabasePostgres17CreatorEdge": "member=postgres,target=notification_event_trigger,grantor=supabase_admin,admin=true,inherit=false,set=false,usage=false",
  "postAdoptionPolicyCatalog": "exact legacy role sets and one worker SELECT policy per source relation",
  "workerVisibleRows": {"organizationMembers": 2, "profiles": 2},
  "cleanup": "trap-owned database and role removal"
}
JSON
printf '%s\n' "$result_json"
