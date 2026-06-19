-- Performance indexes (additive, non-destructive — CREATE INDEX IF NOT EXISTS only).
-- No table/column drops; safe to run against populated tables.
--
-- 1. sched_bookings: the conflict / busy-interval probe (loadBusyInTx in
--    scheduling-bookings.service.ts) filters by resource_id + status and ranges
--    on start_time. Existing indexes lead with org_id or with (resource_id,
--    start_time) — neither carries status, so the probe scans extra rows.
-- 2. flows: the org-scoped list (api/flows/+server.ts) is
--    `where tenant_id = ? order by updated_at desc` and the flows table had no
--    index beyond its PK.

create index if not exists sched_bookings_resource_status_start_idx
  on public.sched_bookings (resource_id, status, start_time);
--> statement-breakpoint
create index if not exists flows_tenant_updated_idx
  on public.flows (tenant_id, updated_at);
