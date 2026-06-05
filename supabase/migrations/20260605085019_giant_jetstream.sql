CREATE TABLE "backup_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"backup_host" text,
	"backup_user" text DEFAULT 'root',
	"backup_port" integer DEFAULT 22,
	"backup_base_path" text DEFAULT '/mnt/agent-data/backups',
	"schedule" text,
	"retention_count" integer DEFAULT 7,
	"enabled" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"gateway_id" uuid NOT NULL,
	"config_json" text NOT NULL,
	"config_hash" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_backups" (
	"id" text PRIMARY KEY NOT NULL,
	"gateway_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"snapshot_path" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"size_bytes" bigint,
	"status" text DEFAULT 'running' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_provision_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"gateway_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ssh_host" text,
	"ssh_user" text DEFAULT 'root',
	"ssh_port" integer DEFAULT 22,
	"api_key" text,
	"api_key_iv" text,
	"agent_name" text,
	"sandbox_mode" text DEFAULT 'non-main',
	"dm_policy" text DEFAULT 'pairing',
	"install_method" text DEFAULT 'package',
	"pkg_manager" text DEFAULT 'npm',
	"gateway_port" integer DEFAULT 18789,
	"gateway_bind" text DEFAULT 'loopback',
	"enable_whatsapp" boolean DEFAULT false,
	"enable_telegram" boolean DEFAULT false,
	"enable_discord" boolean DEFAULT false,
	"phase_statuses" text DEFAULT '{}',
	"last_provision_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_membership" (
	"user_id" uuid NOT NULL,
	"paperclip_company_id" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_membership_user_id_paperclip_company_id_pk" PRIMARY KEY("user_id","paperclip_company_id")
);
--> statement-breakpoint
ALTER TABLE "config_snapshots" ADD CONSTRAINT "config_snapshots_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_backups" ADD CONSTRAINT "server_backups_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_provision_configs" ADD CONSTRAINT "server_provision_configs_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_membership" ADD CONSTRAINT "workspace_membership_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_backup_configs_tenant" ON "backup_configs" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_config_snapshots_gateway" ON "config_snapshots" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_server_backups_gateway" ON "server_backups" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_server_backups_tenant" ON "server_backups" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provision_configs_uniq_gateway" ON "server_provision_configs" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_provision_configs_tenant" ON "server_provision_configs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_membership_user" ON "workspace_membership" USING btree ("user_id");