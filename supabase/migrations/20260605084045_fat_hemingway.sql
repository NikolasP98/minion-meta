CREATE TABLE "agent_built_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"gateway_agent_id" text NOT NULL,
	"gateway_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "built_agent_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"config_overrides" text DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "built_agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '🤖',
	"description" text DEFAULT '',
	"model" text,
	"system_prompt" text DEFAULT '',
	"temperature" real DEFAULT 0.7,
	"max_tokens" integer DEFAULT 4096,
	"retry_policy" text DEFAULT '{}',
	"fallback_agent_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"gateway_id" uuid,
	"tenant_id" uuid,
	"created_by" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "built_chapter_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"source_chapter_id" text NOT NULL,
	"target_chapter_id" text NOT NULL,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "built_chapter_tools" (
	"id" text PRIMARY KEY NOT NULL,
	"chapter_id" text NOT NULL,
	"tool_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "built_chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"type" text DEFAULT 'chapter' NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"guide" text DEFAULT '',
	"context" text DEFAULT '',
	"output_def" text DEFAULT '',
	"condition_text" text DEFAULT '',
	"position_x" real DEFAULT 0 NOT NULL,
	"position_y" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "built_skill_tools" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"tool_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "built_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"emoji" text DEFAULT '📖',
	"status" text DEFAULT 'draft' NOT NULL,
	"max_cycles" integer DEFAULT 3 NOT NULL,
	"gateway_id" uuid,
	"tenant_id" uuid,
	"created_by" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "built_tools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"script_code" text DEFAULT '',
	"script_lang" text DEFAULT 'javascript' NOT NULL,
	"env_vars" text DEFAULT '{}',
	"validation_rules" text DEFAULT '{}',
	"execution_config" text DEFAULT '{}',
	"status" text DEFAULT 'draft' NOT NULL,
	"gateway_id" uuid,
	"tenant_id" uuid,
	"created_by" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_built_skills" ADD CONSTRAINT "agent_built_skills_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_built_skills" ADD CONSTRAINT "agent_built_skills_skill_id_built_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."built_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "built_agent_skills" ADD CONSTRAINT "built_agent_skills_agent_id_built_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."built_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "built_agent_skills" ADD CONSTRAINT "built_agent_skills_skill_id_built_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."built_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "built_agents" ADD CONSTRAINT "built_agents_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "built_chapter_edges" ADD CONSTRAINT "built_chapter_edges_skill_id_built_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."built_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "built_chapter_edges" ADD CONSTRAINT "built_chapter_edges_source_chapter_id_built_chapters_id_fk" FOREIGN KEY ("source_chapter_id") REFERENCES "public"."built_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "built_chapter_edges" ADD CONSTRAINT "built_chapter_edges_target_chapter_id_built_chapters_id_fk" FOREIGN KEY ("target_chapter_id") REFERENCES "public"."built_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "built_chapter_tools" ADD CONSTRAINT "built_chapter_tools_chapter_id_built_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."built_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "built_chapters" ADD CONSTRAINT "built_chapters_skill_id_built_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."built_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "built_skill_tools" ADD CONSTRAINT "built_skill_tools_skill_id_built_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."built_skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "built_skills" ADD CONSTRAINT "built_skills_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "built_tools" ADD CONSTRAINT "built_tools_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_built_skills_gateway_agent" ON "agent_built_skills" USING btree ("gateway_agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_built_skills_tenant" ON "agent_built_skills" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_built_agent_skills_agent" ON "built_agent_skills" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_built_agents_gateway" ON "built_agents" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_built_agents_tenant" ON "built_agents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_built_chapter_edges_skill" ON "built_chapter_edges" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "idx_built_chapter_tools_chapter" ON "built_chapter_tools" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_built_chapters_skill" ON "built_chapters" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "idx_built_skill_tools_skill" ON "built_skill_tools" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "idx_built_skills_gateway" ON "built_skills" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_built_skills_tenant" ON "built_skills" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_built_tools_gateway" ON "built_tools" USING btree ("gateway_id");--> statement-breakpoint
CREATE INDEX "idx_built_tools_tenant" ON "built_tools" USING btree ("tenant_id");