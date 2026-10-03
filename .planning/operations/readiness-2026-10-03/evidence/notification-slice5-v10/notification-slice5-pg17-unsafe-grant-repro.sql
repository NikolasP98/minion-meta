begin;
create role notification_projection_grant_probe
  nologin nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication;
select target.rolname as target,member.rolname as member,grantor.rolname as grantor,
  membership.admin_option,membership.inherit_option,membership.set_option
from pg_auth_members membership
join pg_roles target on target.oid=membership.roleid
join pg_roles member on member.oid=membership.member
join pg_roles grantor on grantor.oid=membership.grantor
where target.rolname='notification_projection_grant_probe';
grant notification_projection_grant_probe to current_user
  with admin false, inherit false, set true
  granted by current_user;
rollback;
