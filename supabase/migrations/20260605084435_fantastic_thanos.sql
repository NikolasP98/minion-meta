CREATE TABLE "channel_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"channel_user_id" text NOT NULL,
	"display_name" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"gateway_id" uuid NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"credentials" text DEFAULT '' NOT NULL,
	"credentials_iv" text DEFAULT '' NOT NULL,
	"credentials_meta" text DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"gateway_id" uuid NOT NULL,
	"agent_id" text NOT NULL,
	"session_key" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"run_id" text,
	"timestamp" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"gateway_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"gateway_id" uuid NOT NULL,
	"session_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'backlog' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"gateway_id" uuid NOT NULL,
	"agent_id" text NOT NULL,
	"session_key" text NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"metadata" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_execution_stats" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"gateway_id" uuid NOT NULL,
	"agent_id" text,
	"skill_name" text NOT NULL,
	"session_key" text,
	"status" text NOT NULL,
	"duration_ms" integer,
	"error_message" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"skill_key" text NOT NULL,
	"gateway_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"emoji" text,
	"bundled" boolean DEFAULT false NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"eligible" boolean DEFAULT false NOT NULL,
	"raw_json" text NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	CONSTRAINT "skills_skill_key_gateway_id_pk" PRIMARY KEY("skill_key","gateway_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"mission_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'backlog' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_agents" (
	"user_id" uuid NOT NULL,
	"agent_id" text NOT NULL,
	"gateway_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_agents_user_id_agent_id_gateway_id_pk" PRIMARY KEY("user_id","agent_id","gateway_id")
);
--> statement-breakpoint
ALTER TABLE "channel_assignments" ADD CONSTRAINT "channel_assignments_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_identities" ADD CONSTRAINT "channel_identities_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_tasks" ADD CONSTRAINT "session_tasks_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_execution_stats" ADD CONSTRAINT "skill_execution_stats_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agents_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agents_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_channel_assign_channel" ON "channel_assignments" USING btree ("channel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_assign_uniq" ON "channel_assignments" USING btree ("channel_id","target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_channel_identity_unique" ON "channel_identities" USING btree ("channel","channel_user_id");--> statement-breakpoint
CREATE INDEX "idx_channel_identity_user" ON "channel_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_channels_tenant_gateway" ON "channels" USING btree ("tenant_id","gateway_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channels_uniq_type_label" ON "channels" USING btree ("tenant_id","gateway_id","type","label");--> statement-breakpoint
CREATE INDEX "idx_chat_tenant" ON "chat_messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_chat_by_agent" ON "chat_messages" USING btree ("agent_id","session_key","timestamp");--> statement-breakpoint
CREATE INDEX "idx_missions_tenant" ON "missions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_missions_session" ON "missions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_missions_gateway" ON "missions" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_session_tasks_tenant" ON "session_tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_session_tasks_gateway_session" ON "session_tasks" USING btree ("gateway_id","session_key");--> statement-breakpoint
CREATE INDEX "idx_sessions_tenant" ON "sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_gateway" ON "sessions" USING btree ("gateway_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_uniq_key" ON "sessions" USING btree ("tenant_id","gateway_id","session_key");--> statement-breakpoint
CREATE INDEX "idx_skill_stats_gateway_skill_time" ON "skill_execution_stats" USING btree ("gateway_id","skill_name","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_skill_stats_tenant" ON "skill_execution_stats" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_skills_tenant" ON "skills" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_tenant" ON "tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_mission" ON "tasks" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "idx_user_agents_gateway" ON "user_agents" USING btree ("gateway_id");