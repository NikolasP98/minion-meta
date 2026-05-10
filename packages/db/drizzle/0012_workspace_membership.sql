-- Add workspace_membership table: bridge between hub identity and Paperclip company tenancy
CREATE TABLE `workspace_membership` (
	`user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
	`paperclip_company_id` text NOT NULL,
	`role` text NOT NULL DEFAULT 'admin',
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `paperclip_company_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_membership_user` ON `workspace_membership` (`user_id`);
