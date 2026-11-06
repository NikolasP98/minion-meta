-- Slice5 v8 source-policy command-role inventory.
-- Run against the frozen pre-Slice5 baseline and again after adoption.
-- The result is data only; it never mutates roles, grants, policies, or rows.

with target(policy_name, relation_name, command_name, expected_base_roles) as (
  values
    ('organizations_admin_all', 'organizations', 'ALL', array['anon','authenticated','service_role']::text[]),
    ('organizations_member_select', 'organizations', 'SELECT', array['anon','authenticated','service_role']::text[]),
    ('organization_members_admin_all', 'organization_members', 'ALL', array['anon','authenticated','service_role','app_ledger']::text[]),
    ('organization_members_self_select', 'organization_members', 'SELECT', array['anon','authenticated','service_role','app_ledger']::text[]),
    ('profiles_self_select', 'profiles', 'SELECT', array['anon','authenticated','service_role','app_ledger']::text[]),
    ('profiles_self_update', 'profiles', 'UPDATE', array['anon','authenticated','service_role']::text[]),
    ('permission_rules_org_guc', 'permission_rules', 'ALL', array['anon','authenticated','service_role','app_ledger']::text[]),
    ('join_request_admin_all', 'join_request', 'ALL', array['anon','authenticated','service_role']::text[]),
    ('join_request_self_insert', 'join_request', 'INSERT', array['anon','authenticated','service_role']::text[]),
    ('join_request_self_select', 'join_request', 'SELECT', array['anon','authenticated','service_role']::text[])
), owners as (
  select distinct t.relation_name, pg_get_userbyid(c.relowner)::text as owner_name
  from target t
  join pg_class c on c.oid=format('public.%I',t.relation_name)::regclass
), table_acl as (
  select t.relation_name,
    case when acl.grantee=0 then 'PUBLIC' else pg_get_userbyid(acl.grantee)::text end role_name,
    acl.privilege_type
  from (select distinct relation_name from target) t
  join pg_class c on c.oid=format('public.%I',t.relation_name)::regclass
  cross join lateral aclexplode(c.relacl) acl
), column_acl as (
  select t.relation_name,
    case when acl.grantee=0 then 'PUBLIC' else pg_get_userbyid(acl.grantee)::text end role_name,
    acl.privilege_type
  from (select distinct relation_name from target) t
  join pg_class c on c.oid=format('public.%I',t.relation_name)::regclass
  join pg_attribute attribute on attribute.attrelid=c.oid and attribute.attnum>0 and not attribute.attisdropped
  cross join lateral aclexplode(attribute.attacl) acl
), direct_command_grantee as (
  select relation_name,role_name,privilege_type from table_acl
  union
  select relation_name,role_name,privilege_type from column_acl
), actual as (
  -- This is deliberately driven by every direct table/column ACL grantee, not
  -- a role allowlist. Unknown grantees and PUBLIC therefore change the set. The
  -- separate admission fingerprint rejects every unknown transitive SET/USAGE
  -- membership into these grantees, including PostgreSQL built-in data roles.
  select distinct t.policy_name,t.relation_name,t.command_name,grantee.role_name
  from target t
  join direct_command_grantee grantee using(relation_name)
  where t.command_name='ALL' and grantee.privilege_type in ('SELECT','INSERT','UPDATE','DELETE')
     or t.command_name=grantee.privilege_type
), rows as (
  select t.policy_name,t.relation_name,t.command_name,o.owner_name,
    array(select distinct x from unnest(t.expected_base_roles||o.owner_name) x order by x) expected_roles,
    array(select distinct x from (
      select a.role_name x from actual a where a.policy_name=t.policy_name
      union all select o.owner_name
    ) q order by x) actual_command_roles
  from target t join owners o using(relation_name)
)
select jsonb_pretty(jsonb_agg(jsonb_build_object(
  'policy',policy_name,
  'relation',relation_name,
  'command',command_name,
  'owner',owner_name,
  'expectedRoles',expected_roles,
  'actualCommandRoles',actual_command_roles,
  'matches',expected_roles=actual_command_roles
) order by relation_name,policy_name))
from rows;

-- The runtime admission fingerprint consumes these catalog rows in addition to
-- the exact relation, ACL, column-ACL, policy-expression, function and trigger
-- manifest. The only permitted finalizer membership variants are no edge, or
-- the exact Supabase platform-creator ADMIN-only edge named below.
select jsonb_pretty(jsonb_build_object(
  'serverVersionNum',current_setting('server_version_num')::integer,
  'finalizerRole',(
    select jsonb_build_object(
      'login',rolcanlogin,'superuser',rolsuper,'bypassRls',rolbypassrls,
      'inherit',rolinherit,'createRole',rolcreaterole,'createDb',rolcreatedb,
      'replication',rolreplication
    ) from pg_roles where rolname='notification_projection_finalizer'
  ),
  'finalizerMembershipEdges',coalesce((
    select jsonb_agg(jsonb_build_object(
      'member',member_role.rolname,'grantor',grantor_role.rolname,
      'admin',membership.admin_option,'inherit',membership.inherit_option,
      'set',membership.set_option
    ) order by member_role.rolname,grantor_role.rolname)
    from pg_auth_members membership
    join pg_roles target_role on target_role.oid=membership.roleid
    join pg_roles member_role on member_role.oid=membership.member
    join pg_roles grantor_role on grantor_role.oid=membership.grantor
    where target_role.rolname='notification_projection_finalizer'
  ),'[]'::jsonb),
  'runtimeReachability',(
    select coalesce(jsonb_agg(jsonb_build_object(
      'role',runtime_role.role_name,
      'usage',pg_has_role(runtime_role.role_name,'notification_projection_finalizer','USAGE'),
      'set',pg_has_role(runtime_role.role_name,'notification_projection_finalizer','SET'),
      'adminEdge',exists(
        select 1 from pg_auth_members membership
        where membership.roleid='notification_projection_finalizer'::regrole
          and membership.member=to_regrole(runtime_role.role_name)
          and membership.admin_option
      )
    ) order by runtime_role.role_name),'[]'::jsonb)
    from (values
      ('app_notification_worker'),('app_ledger'),('notification_worker'),
      ('notification_coordinator'),('notification_health_reader'),('anon'),
      ('authenticated'),('service_role'),('app_assistant_ro'),('brain_vector_worker')
    ) runtime_role(role_name)
    where to_regrole(runtime_role.role_name) is not null
  )
));
