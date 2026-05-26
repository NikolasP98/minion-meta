CREATE TABLE "gateway" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legacy_server_id" text,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"token_ciphertext" text DEFAULT '' NOT NULL,
	"token_iv" text DEFAULT '' NOT NULL,
	"auth_mode" text DEFAULT 'token' NOT NULL,
	"last_connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_gateway" (
	"profile_id" uuid NOT NULL,
	"gateway_id" uuid NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_gateway_profile_id_gateway_id_pk" PRIMARY KEY("profile_id","gateway_id")
);
--> statement-breakpoint
ALTER TABLE "user_gateway" ADD CONSTRAINT "user_gateway_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_gateway" ADD CONSTRAINT "user_gateway_gateway_id_gateway_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateway"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gateway_uniq_url" ON "gateway" USING btree ("url");--> statement-breakpoint
CREATE INDEX "idx_gateway_legacy" ON "gateway" USING btree ("legacy_server_id");--> statement-breakpoint
CREATE INDEX "idx_user_gateway_gateway" ON "user_gateway" USING btree ("gateway_id");