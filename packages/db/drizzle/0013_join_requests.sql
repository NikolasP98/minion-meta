-- Add join_requests table: user-submitted requests to join an organization
CREATE TABLE `join_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
	`org_id` text NOT NULL REFERENCES `organization`(`id`) ON DELETE CASCADE,
	`email` text NOT NULL,
	`message` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_join_requests_user` ON `join_requests` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_join_requests_org_status` ON `join_requests` (`org_id`, `status`);
