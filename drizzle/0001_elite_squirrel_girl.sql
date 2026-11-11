ALTER TABLE "orders" ADD COLUMN "user_id" text;--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");