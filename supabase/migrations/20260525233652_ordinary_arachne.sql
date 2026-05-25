CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"personal_agent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"kind" text NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text,
	"scope" text,
	"secret_ciphertext" text,
	"secret_iv" text,
	"expires_at" bigint,
	"verified_at" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_identity_unique" ON "user_identities" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "idx_user_identity_user" ON "user_identities" USING btree ("user_id");