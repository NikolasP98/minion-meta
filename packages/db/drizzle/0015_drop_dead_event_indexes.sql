-- Drop write-tax indexes on fully-dead tables (DROP INDEX only — no table or data
-- is touched; safe). reliability_events and connection_events have zero readers and
-- zero writers anywhere in the hub (the reliability dashboard streams live data over
-- WS from the gateway). The tenant index on each is KEPT so the organization
-- onDelete: cascade stays cheap.

DROP INDEX IF EXISTS `idx_rel_events_server_cat_time`;
--> statement-breakpoint
DROP INDEX IF EXISTS `idx_rel_events_server_time`;
--> statement-breakpoint
DROP INDEX IF EXISTS `idx_rel_events_server_sev_time`;
--> statement-breakpoint
DROP INDEX IF EXISTS `idx_conn_events_server`;
