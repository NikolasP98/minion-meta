CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"org_id" text NOT NULL,
	"gateway_id" text,
	"direction" text NOT NULL,
	"channel" text NOT NULL,
	"account_id" text,
	"chat_id" text,
	"is_group" boolean,
	"sender_id" text,
	"sender_name" text,
	"sender_handle" text,
	"is_bot" boolean,
	"content" text,
	"message_id" text,
	"agent_id" text,
	"session_key" text,
	"success" boolean,
	"error" text,
	"occurred_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "messages_client_id_uniq" ON "messages" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "messages_org_chat_idx" ON "messages" USING btree ("org_id","channel","chat_id","occurred_at");--> statement-breakpoint
CREATE INDEX "messages_org_time_idx" ON "messages" USING btree ("org_id","occurred_at");--> statement-breakpoint
CREATE INDEX "messages_org_agent_idx" ON "messages" USING btree ("org_id","agent_id");--> statement-breakpoint
CREATE INDEX "messages_message_id_idx" ON "messages" USING btree ("message_id");