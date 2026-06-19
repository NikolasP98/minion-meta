-- Additive performance indexes (non-destructive — CREATE INDEX IF NOT EXISTS only).
-- No table/column drops; safe against populated tables.
--
-- unified_events: severity-filtered list (events.service.ts listEvents) filters
--   server_id + severity, orders by occurred_at desc. Existing indexes lead with
--   (server_id, category, ...) or (server_id, occurred_at) — neither carries severity.
-- bugs: tenant-scoped list (bug.service.ts listBugs) is `tenant_id` ordered by
--   created_at desc; only bare (tenant_id)/(server_id) indexes existed.

CREATE INDEX IF NOT EXISTS `idx_unified_events_server_sev_time` ON `unified_events` (`server_id`,`severity`,`occurred_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_bugs_tenant_created` ON `bugs` (`tenant_id`,`created_at`);
