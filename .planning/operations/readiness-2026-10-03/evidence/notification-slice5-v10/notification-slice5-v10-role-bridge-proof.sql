\set ON_ERROR_STOP on
begin;

create temporary table notification_projection_persistent_graph_receipt (
  target text not null,
  member text not null,
  grantor text not null,
  admin_option boolean not null,
  inherit_option boolean not null,
  set_option boolean not null,
  primary key (target, member, grantor)
) on commit preserve rows;

create role notification_projection_runtime_receipt
  nologin nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication;
create role notification_projection_bridge_receipt_v10
  nologin nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication
  role :migration_actor;
create role notification_projection_final_receipt_v10
  nologin nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication
  role notification_projection_bridge_receipt_v10;

select 'temporary' phase,target.rolname target,member.rolname member,grantor.rolname grantor,
  membership.admin_option,membership.inherit_option,membership.set_option
from pg_auth_members membership
join pg_roles target on target.oid=membership.roleid
join pg_roles member on member.oid=membership.member
join pg_roles grantor on grantor.oid=membership.grantor
where target.rolname in ('notification_projection_bridge_receipt_v10','notification_projection_final_receipt_v10')
   or member.rolname in ('notification_projection_bridge_receipt_v10','notification_projection_final_receipt_v10')
order by target.rolname,member.rolname,grantor.rolname;

do $temporary_graph$
declare
  graph_count integer;
  server_major integer := current_setting('server_version_num')::integer / 10000;
begin
  select count(*) into graph_count
  from pg_auth_members membership
  join pg_roles target on target.oid=membership.roleid
  join pg_roles member on member.oid=membership.member
  where target.rolname in ('notification_projection_bridge_receipt_v10','notification_projection_final_receipt_v10')
     or member.rolname in ('notification_projection_bridge_receipt_v10','notification_projection_final_receipt_v10');

  if server_major = 17 then
    if current_user <> 'postgres' or graph_count <> 4
       or not exists (
         select 1 from pg_auth_members m
         join pg_roles t on t.oid=m.roleid join pg_roles u on u.oid=m.member join pg_roles g on g.oid=m.grantor
         where t.rolname='notification_projection_bridge_receipt_v10' and u.rolname='postgres'
           and g.rolname='postgres' and not m.admin_option and m.inherit_option and m.set_option)
       or not exists (
         select 1 from pg_auth_members m
         join pg_roles t on t.oid=m.roleid join pg_roles u on u.oid=m.member join pg_roles g on g.oid=m.grantor
         where t.rolname='notification_projection_bridge_receipt_v10' and u.rolname='postgres'
           and g.rolname='supabase_admin' and m.admin_option and not m.inherit_option and not m.set_option)
       or not exists (
         select 1 from pg_auth_members m
         join pg_roles t on t.oid=m.roleid join pg_roles u on u.oid=m.member join pg_roles g on g.oid=m.grantor
         where t.rolname='notification_projection_final_receipt_v10'
           and u.rolname='notification_projection_bridge_receipt_v10'
           and g.rolname='postgres' and not m.admin_option and not m.inherit_option and m.set_option)
       or not exists (
         select 1 from pg_auth_members m
         join pg_roles t on t.oid=m.roleid join pg_roles u on u.oid=m.member join pg_roles g on g.oid=m.grantor
         where t.rolname='notification_projection_final_receipt_v10' and u.rolname='postgres'
           and g.rolname='supabase_admin' and m.admin_option and not m.inherit_option and not m.set_option) then
      raise exception 'unexpected_pg17_temporary_graph';
    end if;
  elsif server_major = 18 then
    if graph_count <> 2
       or not exists (
         select 1 from pg_auth_members m
         join pg_roles t on t.oid=m.roleid join pg_roles u on u.oid=m.member join pg_roles g on g.oid=m.grantor
         where t.rolname='notification_projection_bridge_receipt_v10' and u.rolname=current_user
           and g.rolname=current_user and not m.admin_option and m.inherit_option and m.set_option)
       or not exists (
         select 1 from pg_auth_members m
         join pg_roles t on t.oid=m.roleid join pg_roles u on u.oid=m.member join pg_roles g on g.oid=m.grantor
         where t.rolname='notification_projection_final_receipt_v10'
           and u.rolname='notification_projection_bridge_receipt_v10'
           and g.rolname=current_user and not m.admin_option and not m.inherit_option and m.set_option) then
      raise exception 'unexpected_pg18_temporary_graph';
    end if;
  else
    raise exception 'unsupported_proof_server_major %',server_major;
  end if;
end
$temporary_graph$;

insert into notification_projection_persistent_graph_receipt
select target.rolname,member.rolname,grantor.rolname,
  membership.admin_option,membership.inherit_option,membership.set_option
from pg_auth_members membership
join pg_roles target on target.oid=membership.roleid
join pg_roles member on member.oid=membership.member
join pg_roles grantor on grantor.oid=membership.grantor
where (target.rolname='notification_projection_final_receipt_v10'
    or member.rolname='notification_projection_final_receipt_v10')
  and target.rolname<>'notification_projection_bridge_receipt_v10'
  and member.rolname<>'notification_projection_bridge_receipt_v10';

create function public.notification_projection_bridge_receipt_v10_fn() returns integer
language sql immutable as 'select 1';
grant create on schema public to notification_projection_final_receipt_v10;
alter function public.notification_projection_bridge_receipt_v10_fn()
  owner to notification_projection_final_receipt_v10;
revoke create on schema public from notification_projection_final_receipt_v10;
drop role notification_projection_bridge_receipt_v10;

do $proof$
declare
  actual_graph jsonb;
  expected_graph jsonb;
begin
  if to_regrole('notification_projection_bridge_receipt_v10') is not null then
    raise exception 'bridge_not_dropped';
  end if;
  if pg_get_userbyid((select proowner from pg_proc
      where oid='public.notification_projection_bridge_receipt_v10_fn()'::regprocedure))
      <> 'notification_projection_final_receipt_v10' then
    raise exception 'function_owner_not_finalizer';
  end if;
  if has_schema_privilege('notification_projection_final_receipt_v10','public','CREATE') then
    raise exception 'finalizer_retains_schema_create';
  end if;
  if pg_has_role('notification_projection_runtime_receipt','notification_projection_final_receipt_v10','SET')
     or pg_has_role('notification_projection_runtime_receipt','notification_projection_final_receipt_v10','USAGE') then
    raise exception 'restricted_runtime_reaches_finalizer';
  end if;
  if not (select rolsuper from pg_roles where rolname=current_user)
     and (pg_has_role(current_user,'notification_projection_final_receipt_v10','SET')
       or pg_has_role(current_user,'notification_projection_final_receipt_v10','USAGE')) then
    raise exception 'restricted_migration_actor_reaches_finalizer';
  end if;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.target,rows.member,rows.grantor),'[]'::jsonb)
  into expected_graph
  from notification_projection_persistent_graph_receipt rows;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.target,rows.member,rows.grantor),'[]'::jsonb)
  into actual_graph
  from (
    select target.rolname target,member.rolname member,grantor.rolname grantor,
      membership.admin_option,membership.inherit_option,membership.set_option
    from pg_auth_members membership
    join pg_roles target on target.oid=membership.roleid
    join pg_roles member on member.oid=membership.member
    join pg_roles grantor on grantor.oid=membership.grantor
    where target.rolname='notification_projection_final_receipt_v10'
       or member.rolname='notification_projection_final_receipt_v10'
  ) rows;

  if actual_graph <> expected_graph then
    raise exception 'persistent_graph_changed expected=% actual=%',expected_graph,actual_graph;
  end if;
end
$proof$;

commit;

select 'committed' phase,
  to_regrole('notification_projection_bridge_receipt_v10') is null as bridge_absent,
  pg_get_userbyid(proowner)='notification_projection_final_receipt_v10' as owner_exact,
  not has_schema_privilege('notification_projection_final_receipt_v10','public','CREATE') as schema_create_absent,
  not pg_has_role('notification_projection_runtime_receipt','notification_projection_final_receipt_v10','SET') as runtime_set_denied,
  not pg_has_role('notification_projection_runtime_receipt','notification_projection_final_receipt_v10','USAGE') as runtime_usage_denied
from pg_proc where oid='public.notification_projection_bridge_receipt_v10_fn()'::regprocedure;

select 'committed_graph' phase,target.rolname target,member.rolname member,grantor.rolname grantor,
  membership.admin_option,membership.inherit_option,membership.set_option
from pg_auth_members membership
join pg_roles target on target.oid=membership.roleid
join pg_roles member on member.oid=membership.member
join pg_roles grantor on grantor.oid=membership.grantor
where target.rolname='notification_projection_final_receipt_v10'
   or member.rolname='notification_projection_final_receipt_v10'
order by target.rolname,member.rolname,grantor.rolname;

begin;
drop function public.notification_projection_bridge_receipt_v10_fn();
drop role notification_projection_final_receipt_v10;
drop role notification_projection_runtime_receipt;
commit;

select
  to_regrole('notification_projection_runtime_receipt') is null as runtime_probe_clean,
  to_regrole('notification_projection_bridge_receipt_v10') is null as bridge_clean,
  to_regrole('notification_projection_final_receipt_v10') is null as final_clean,
  to_regprocedure('public.notification_projection_bridge_receipt_v10_fn()') is null as function_clean;
