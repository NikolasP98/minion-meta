\set ON_ERROR_STOP on
begin;
create role notification_projection_failure_runtime
  nologin nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication;
create role notification_projection_failure_bridge
  nologin nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication
  role :migration_actor;
create role notification_projection_failure_final
  nologin nosuperuser nobypassrls noinherit nocreatedb nocreaterole noreplication
  role notification_projection_failure_bridge;
create function public.notification_projection_failure_fn() returns integer
language sql immutable as 'select 1';
grant create on schema public to notification_projection_failure_final;
alter function public.notification_projection_failure_fn() owner to notification_projection_failure_final;
revoke create on schema public from notification_projection_failure_final;
\set ON_ERROR_STOP off
do $$ begin raise exception 'notification_projection_injected_failure'; end $$;
\set ON_ERROR_STOP on
rollback;
select
  to_regrole('notification_projection_failure_runtime') is null as runtime_clean,
  to_regrole('notification_projection_failure_bridge') is null as bridge_clean,
  to_regrole('notification_projection_failure_final') is null as final_clean,
  to_regprocedure('public.notification_projection_failure_fn()') is null as function_clean;
