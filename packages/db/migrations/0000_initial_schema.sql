CREATE TYPE "public"."user_role" AS ENUM('guest', 'owner', 'admin', 'ops');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('manual', 'stripe');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('draft', 'pending', 'active', 'paused', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('hostel', 'hotel', 'guesthouse', 'apartment', 'resort');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text,
	"email_verified_at" timestamp with time zone,
	"full_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_mock" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"property_type" "property_type" NOT NULL,
	"region" text NOT NULL,
	"city" text NOT NULL,
	"address_line" text,
	"latitude" double precision,
	"longitude" double precision,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"payment_mode" "payment_mode" DEFAULT 'manual' NOT NULL,
	"manual_payment_methods" jsonb,
	"status" "property_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_mock" boolean DEFAULT false NOT NULL,
	CONSTRAINT "properties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "properties_tenant_idx" ON "properties" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "properties_owner_idx" ON "properties" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "properties_region_idx" ON "properties" USING btree ("region");--> statement-breakpoint
CREATE INDEX "properties_status_idx" ON "properties" USING btree ("status");--> statement-breakpoint
CREATE INDEX "properties_region_status_idx" ON "properties" USING btree ("region","status");