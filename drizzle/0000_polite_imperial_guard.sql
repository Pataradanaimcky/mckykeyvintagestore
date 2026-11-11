CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"product_slug" text NOT NULL,
	"product_name" text NOT NULL,
	"amount_satang" integer NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text NOT NULL,
	"qr_payload" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "orders_provider_ref_idx" ON "orders" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "orders" USING btree ("email");