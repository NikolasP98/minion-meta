-- Per-service schedule (T2): a service can carry its own weekly windows that are
-- intersected with the assigned team's availability. Applied to gxv 2026-06-21.
alter table sched_event_types
  add column if not exists use_custom_schedule boolean not null default false,
  add column if not exists schedule_rules jsonb not null default '[]'::jsonb;
