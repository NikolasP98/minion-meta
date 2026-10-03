\set ON_ERROR_STOP on

begin;

create temporary table pg_temp.s5_event_graph_before on commit preserve rows as
select target.rolname as target,member.rolname as member,grantor.rolname as grantor,
  membership.admin_option,membership.inherit_option,membership.set_option
from pg_auth_members membership
join pg_roles target on target.oid=membership.roleid
join pg_roles member on member.oid=membership.member
join pg_roles grantor on grantor.oid=membership.grantor
where target.rolname='notification_event_trigger' or member.rolname='notification_event_trigger';

create temporary table pg_temp.s5_enqueue_before on commit preserve rows as
select pg_get_userbyid(proowner) as owner_name,prosecdef,proconfig,
  proacl::text as proacl,pg_get_functiondef(oid) as definition
from pg_proc where oid='public.notification_event_enqueue()'::regprocedure;

create temporary table pg_temp.s5_schema_before on commit preserve rows as
select nspacl::text as nspacl from pg_namespace where nspname='public';

do $$
declare major integer:=current_setting('server_version_num')::integer/10000;
begin
  if major not in (17,18) then raise exception 'unsupported PostgreSQL major'; end if;
  if to_regrole('notification_projection_owner_bridge') is not null then
    raise exception 'event owner bridge already exists';
  end if;
  if (select count(*) from pg_temp.s5_enqueue_before)<>1
    or (select owner_name from pg_temp.s5_enqueue_before)<>'notification_event_trigger'
    or not (select prosecdef from pg_temp.s5_enqueue_before)
    or (select proconfig from pg_temp.s5_enqueue_before) is distinct from array['search_path=""']
    or has_schema_privilege('notification_event_trigger','public','CREATE') then
    raise exception 'event trigger owner precondition changed';
  end if;
  if major=17 and not exists(
    select 1 from pg_temp.s5_event_graph_before where
      target='notification_event_trigger' and member=current_user and grantor='supabase_admin'
      and admin_option and not inherit_option and not set_option
  ) then raise exception 'PG17 event owner platform edge changed'; end if;
  if major=17 and (select count(*) from pg_temp.s5_event_graph_before)<>1 then
    raise exception 'PG17 event owner graph changed';
  end if;
  if major=18 and exists(select 1 from pg_temp.s5_event_graph_before) then
    raise exception 'PG18 event owner graph changed';
  end if;
  execute format(
    'create role notification_projection_owner_bridge '
    'nologin nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication '
    'in role notification_event_trigger role %I',current_user
  );
end $$;

do $$
declare major integer:=current_setting('server_version_num')::integer/10000;
begin
  create temporary table s5_event_graph_expected(
    target text,member text,grantor text,admin_option boolean,inherit_option boolean,set_option boolean
  ) on commit drop;
  insert into s5_event_graph_expected select * from pg_temp.s5_event_graph_before;
  insert into s5_event_graph_expected values
    ('notification_event_trigger','notification_projection_owner_bridge',current_user,false,false,true),
    ('notification_projection_owner_bridge',current_user,current_user,false,true,true);
  if major=17 then
    insert into s5_event_graph_expected values
      ('notification_projection_owner_bridge',current_user,'supabase_admin',true,false,false);
  end if;
  if exists(
    (select target.rolname,member.rolname,grantor.rolname,membership.admin_option,
        membership.inherit_option,membership.set_option
      from pg_auth_members membership
      join pg_roles target on target.oid=membership.roleid
      join pg_roles member on member.oid=membership.member
      join pg_roles grantor on grantor.oid=membership.grantor
      where target.rolname in ('notification_event_trigger','notification_projection_owner_bridge')
         or member.rolname in ('notification_event_trigger','notification_projection_owner_bridge'))
    except select * from s5_event_graph_expected
  ) or exists(
    (select * from s5_event_graph_expected)
    except
    (select target.rolname,member.rolname,grantor.rolname,membership.admin_option,
        membership.inherit_option,membership.set_option
      from pg_auth_members membership
      join pg_roles target on target.oid=membership.roleid
      join pg_roles member on member.oid=membership.member
      join pg_roles grantor on grantor.oid=membership.grantor
      where target.rolname in ('notification_event_trigger','notification_projection_owner_bridge')
         or member.rolname in ('notification_event_trigger','notification_projection_owner_bridge'))
  ) then raise exception 'event owner temporary graph changed'; end if;
end $$;

grant create on schema public to notification_event_trigger;
set local role notification_event_trigger;
create or replace function public.notification_event_enqueue() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_relid<>'public.notification_events'::regclass or tg_table_schema<>'public'
    or tg_table_name<>'notification_events' or tg_op<>'INSERT' or tg_when<>'AFTER' then
    raise exception 'Notification enqueue trigger source is invalid';
  end if;
  insert into public.notification_outbox(event_id,organization_id,catalog_revision,kind,schema_version)
    values(new.id,new.organization_id,new.catalog_revision,new.kind,new.schema_version);
  return new;
end $$;
reset role;
revoke create on schema public from notification_event_trigger;
drop role notification_projection_owner_bridge;

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
    raise exception 'event owner temporary authority remained';
  end if;
  if exists(
    (select target.rolname,member.rolname,grantor.rolname,membership.admin_option,
        membership.inherit_option,membership.set_option
      from pg_auth_members membership
      join pg_roles target on target.oid=membership.roleid
      join pg_roles member on member.oid=membership.member
      join pg_roles grantor on grantor.oid=membership.grantor
      where target.rolname='notification_event_trigger' or member.rolname='notification_event_trigger')
    except select * from pg_temp.s5_event_graph_before
  ) or exists(
    (select * from pg_temp.s5_event_graph_before)
    except
    (select target.rolname,member.rolname,grantor.rolname,membership.admin_option,
        membership.inherit_option,membership.set_option
      from pg_auth_members membership
      join pg_roles target on target.oid=membership.roleid
      join pg_roles member on member.oid=membership.member
      join pg_roles grantor on grantor.oid=membership.grantor
      where target.rolname='notification_event_trigger' or member.rolname='notification_event_trigger')
  ) then raise exception 'event owner persistent graph changed'; end if;
  if not exists(
    select 1 from pg_proc p,pg_temp.s5_enqueue_before b
    where p.oid='public.notification_event_enqueue()'::regprocedure
      and pg_get_userbyid(p.proowner)=b.owner_name and p.prosecdef=b.prosecdef
      and p.proconfig is not distinct from b.proconfig
      and p.proacl::text is not distinct from b.proacl
      and pg_get_functiondef(p.oid) like '%catalog_revision,kind,schema_version%'
  ) then raise exception 'event owner function contract changed'; end if;
  if (select nspacl::text from pg_namespace where nspname='public')
    is distinct from (select nspacl from pg_temp.s5_schema_before) then
    raise exception 'event owner schema ACL changed';
  end if;
end $$;

commit;

do $$
declare major integer:=current_setting('server_version_num')::integer/10000;
begin
  if to_regrole('notification_projection_owner_bridge') is not null
    or has_schema_privilege('notification_event_trigger','public','CREATE')
    or (major=17 and (pg_has_role(current_user,'notification_event_trigger','SET')
      or pg_has_role(current_user,'notification_event_trigger','USAGE')))
    or (major=18 and (to_regrole('anon') is null
      or pg_has_role('anon','notification_event_trigger','SET')
      or pg_has_role('anon','notification_event_trigger','USAGE')))
    or not exists(
      select 1 from pg_proc p,pg_temp.s5_enqueue_before b
      where p.oid='public.notification_event_enqueue()'::regprocedure
        and pg_get_userbyid(p.proowner)=b.owner_name and p.prosecdef=b.prosecdef
        and p.proconfig is not distinct from b.proconfig
        and p.proacl::text is not distinct from b.proacl
        and pg_get_functiondef(p.oid) like '%catalog_revision,kind,schema_version%'
    ) then raise exception 'event owner committed state changed'; end if;
end $$;

select json_build_object(
  'server',current_setting('server_version_num'),
  'actor',current_user,
  'owner',(select pg_get_userbyid(proowner) from pg_proc where oid='public.notification_event_enqueue()'::regprocedure),
  'securityDefiner',(select prosecdef from pg_proc where oid='public.notification_event_enqueue()'::regprocedure),
  'searchPath',(select proconfig from pg_proc where oid='public.notification_event_enqueue()'::regprocedure),
  'aclPreserved',(select p.proacl::text is not distinct from b.proacl from pg_proc p,pg_temp.s5_enqueue_before b where p.oid='public.notification_event_enqueue()'::regprocedure),
  'bridgeAbsent',to_regrole('notification_projection_owner_bridge') is null,
  'setDenied',case when current_setting('server_version_num')::integer/10000=17
    then not pg_has_role(current_user,'notification_event_trigger','SET')
    else not pg_has_role('anon','notification_event_trigger','SET') end,
  'usageDenied',case when current_setting('server_version_num')::integer/10000=17
    then not pg_has_role(current_user,'notification_event_trigger','USAGE')
    else not pg_has_role('anon','notification_event_trigger','USAGE') end
);
