-- pgvector for agent memory embeddings. Must exist before the vector column.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "agent_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"gateway_id" text,
	"agent_id" text NOT NULL,
	"profile_id" uuid,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"category" text DEFAULT 'other' NOT NULL,
	"importance" real DEFAULT 0.5 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_id" text,
	"occurred_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "agent_memories_source_uniq" ON "agent_memories" USING btree ("org_id","source","source_id") WHERE source_id is not null;--> statement-breakpoint
CREATE INDEX "agent_memories_org_agent_idx" ON "agent_memories" USING btree ("org_id","agent_id");--> statement-breakpoint
CREATE INDEX "agent_memories_org_category_idx" ON "agent_memories" USING btree ("org_id","category");--> statement-breakpoint
CREATE INDEX "agent_memories_org_time_idx" ON "agent_memories" USING btree ("org_id","created_at");