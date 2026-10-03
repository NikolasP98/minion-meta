\set ON_ERROR_STOP on

create temporary table pg_temp.s5_failure_event_graph_before on commit preserve rows as
select target.rolname as target,member.rolname as member,grantor.rolname as grantor,
  membership.admin_option,membership.inherit_option,membership.set_option
from pg_auth_members membership
join pg_roles target on target.oid=membership.roleid
join pg_roles member on member.oid=membership.member
join pg_roles grantor on grantor.oid=membership.grantor
where target.rolname='notification_event_trigger' or member.rolname='notification_event_trigger';

create temporary table pg_temp.s5_failure_enqueue_before on commit preserve rows as
select pg_get_userbyid(proowner) as owner_name,prosecdef,proconfig::text as proconfig,
  proacl::text as proacl,pg_get_functiondef(oid) as definition
from pg_proc where oid='public.notification_event_enqueue()'::regprocedure;

create temporary table pg_temp.s5_failure_schema_before on commit preserve rows as
select nspacl::text as nspacl from pg_namespace where nspname='public';

\set ON_ERROR_STOP off
begin;
do $$ begin
  execute format(
    'create role notification_projection_owner_bridge '
    'nologin nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication '
    'in role notification_event_trigger role %I',current_user
  );
end $$;
grant create on schema public to notification_event_trigger;
set local role notification_event_trigger;
create or replace function public.notification_event_enqueue() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  raise exception 'mutation must roll back';
end $$;
reset role;
revoke create on schema public from notification_event_trigger;
do $$ begin raise exception 'notification_projection_injected_after_event_owner_replacement'; end $$;
commit;
rollback;
\set ON_ERROR_STOP on

do $$
declare major integer:=current_setting('server_version_num')::integer/10000;
begin
  if to_regrole('notification_projection_owner_bridge') is not null
    or has_schema_privilege('notification_event_trigger','public','CREATE')
    or (major=17 and (pg_has_role(current_user,'notification_event_trigger','SET')
      or pg_has_role(current_user,'notification_event_trigger','USAGE')))
    or (major=18 and (to_regrole('anon') is null
      or pg_has_role('anon','notification_event_trigger','SET')
      or pg_has_role('anon','notification_event_trigger','USAGE'))) then
    raise exception 'event owner rollback retained authority';
  end if;
  if exists(
    (select target.rolname,member.rolname,grantor.rolname,membership.admin_option,
        membership.inherit_option,membership.set_option
      from pg_auth_members membership
      join pg_roles target on target.oid=membership.roleid
      join pg_roles member on member.oid=membership.member
      join pg_roles grantor on grantor.oid=membership.grantor
      where target.rolname='notification_event_trigger' or member.rolname='notification_event_trigger')
    except select * from pg_temp.s5_failure_event_graph_before
  ) or exists(
    (select * from pg_temp.s5_failure_event_graph_before)
    except
    (select target.rolname,member.rolname,grantor.rolname,membership.admin_option,
        membership.inherit_option,membership.set_option
      from pg_auth_members membership
      join pg_roles target on target.oid=membership.roleid
      join pg_roles member on member.oid=membership.member
      join pg_roles grantor on grantor.oid=membership.grantor
      where target.rolname='notification_event_trigger' or member.rolname='notification_event_trigger')
  ) then raise exception 'event owner rollback graph changed'; end if;
  if not exists(
    select 1 from pg_proc p,pg_temp.s5_failure_enqueue_before b
    where p.oid='public.notification_event_enqueue()'::regprocedure
      and pg_get_userbyid(p.proowner)=b.owner_name and p.prosecdef=b.prosecdef
      and p.proconfig::text is not distinct from b.proconfig
      and p.proacl::text is not distinct from b.proacl
      and pg_get_functiondef(p.oid)=b.definition
  ) then raise exception 'event owner rollback function changed'; end if;
  if (select nspacl::text from pg_namespace where nspname='public')
    is distinct from (select nspacl from pg_temp.s5_failure_schema_before) then
    raise exception 'event owner rollback schema ACL changed';
  end if;
end $$;

select json_build_object(
  'server',current_setting('server_version_num'),
  'actor',current_user,
  'injectedFailure','notification_projection_injected_after_event_owner_replacement',
  'bridgeAbsent',to_regrole('notification_projection_owner_bridge') is null,
  'functionRestored',(
    select pg_get_functiondef(p.oid)=b.definition
    from pg_proc p,pg_temp.s5_failure_enqueue_before b
    where p.oid='public.notification_event_enqueue()'::regprocedure
  ),
  'graphRestored',true,
  'schemaAclRestored',(
    select n.nspacl::text is not distinct from b.nspacl
    from pg_namespace n,pg_temp.s5_failure_schema_before b where n.nspname='public'
  )
);
