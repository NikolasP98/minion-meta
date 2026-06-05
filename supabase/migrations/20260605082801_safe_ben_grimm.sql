CREATE TABLE "personal_agents" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"agent_id" text NOT NULL,
	"gateway_id" uuid,
	"display_name" text NOT NULL,
	"conversation_name" text,
	"avatar_url" text,
	"personality_preset" text,
	"personality_text" text,
	"personality_configured" boolean DEFAULT false NOT NULL,
	"provisioning_status" text DEFAULT 'pending' NOT NULL,
	"provisioning_error" text,
	"last_retry_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_agents_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"section" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_agents" ADD CONSTRAINT "personal_agents_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_agents" ADD CONSTRAINT "personal_agents_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_personal_agents_profile" ON "personal_agents" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_personal_agents_agent" ON "personal_agents" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_personal_agents_status" ON "personal_agents" USING btree ("provisioning_status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_prefs_profile_section" ON "user_preferences" USING btree ("profile_id","section");--> statement-breakpoint
CREATE INDEX "idx_user_prefs_profile" ON "user_preferences" USING btree ("profile_id");